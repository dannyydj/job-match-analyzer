// Background service worker handles API calls to Gemini AI
// It receives job text from content script and returns language analysis

// Rate limiter to limit requests to 10 per minute
const rateLimiter = {
  requests: [],
  maxRequests: 10,
  timeWindow: 60000, // 1 minute in milliseconds

  canMakeRequest() {
    const now = Date.now();
    // Remove requests older than 1 minute
    this.requests = this.requests.filter(time => now - time < this.timeWindow);

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    return false;
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeJob') {
    // Robust URL detection: if the passed URL is invalid, use the real URL from the sending tab
    let jobUrl = request.jobUrl;
    if (!jobUrl || jobUrl.includes('invalid') || jobUrl.startsWith('chrome-extension')) {
      jobUrl = (sender.tab && sender.tab.url) ? sender.tab.url : jobUrl;
    }

    // Check rate limit before processing
    if (!rateLimiter.canMakeRequest()) {
      sendResponse({
        success: false,
        error: 'Rate limit exceeded. Please wait a minute.'
      });
      // Corrected: Return false here because we already sent the response synchronously
      return false;
    }

    analyzeJobWithGemini(request.jobText, jobUrl)
      .then(result => {
        // Only send response if the channel is still open
        try {
          sendResponse({ success: true, result: result });
        } catch (e) {
          console.warn('Failed to send response (channel probably closed):', e);
        }
      })
      .catch(error => {
        console.error('Analysis error:', error);
        try {
          sendResponse({ success: false, error: error.message });
        } catch (e) {
          console.warn('Failed to send error response:', e);
        }
      });

    // Return true to indicate we will send the response asynchronously in the .then()
    return true;
  }
  return false;
});

async function analyzeJobWithGemini(jobText, jobUrl) {
  try {
    // Get API key from storage
    const result = await chrome.storage.local.get(['geminiApiKey']);
    const apiKey = result.geminiApiKey;

    if (!apiKey) {
      console.error('No API key found');
      return { status: 'unclear', level: null };
    }

    // Truncate job text to ~5000 chars to avoid token limit errors
    const truncatedText = jobText.length > 5000 ? jobText.substring(0, 5000) + "..." : jobText;

    // Prepare the prompt for Gemini
    const prompt = `Analyze this job posting and determine German language requirements.

Job Posting:
${truncatedText}

Instructions:
1. Determine if German language skills are:
   - REQUIRED (must have, mandatory, essential)
   - PREFERRED (nice to have, desirable, advantage)
   - NOT_REQUIRED (not mentioned, or only English required)

2. If German is required or preferred, identify the proficiency level if mentioned (A1, A2, B1, B2, C1, C2, or descriptors like "fluent", "native", "basic", "business level").

3. Respond ONLY with a JSON object in this exact format:
{"status": "required" | "preferred" | "not_required","level": "B2" | "C1" | "fluent" | null}

Do not include any other text, explanation, or markdown formatting.`;

    console.log('Sending request to Gemini API with prompt:', prompt);

    // Use stable v1 endpoint and sanitize API key
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 100,
        }
      })
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        console.error('Gemini API error:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error('Gemini API error (non-JSON):', response.status, response.statusText);
      }
      return { status: 'unclear', level: null };
    }

    const data = await response.json();
    // Log the full API response
    console.log('Full Gemini API response:', JSON.stringify(data, null, 2));

    // Extract the text response from Gemini
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const responseText = data.candidates[0].content.parts[0].text;

      // Log the raw response to see what we got
      console.log('Raw Gemini response:', responseText);
      console.log('Response length:', responseText.length);

      // Parse the JSON response
      try {
        // Remove markdown, extra whitespace, and newlines
        let cleanedText = responseText
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();

        console.log('Cleaned text:', cleanedText);

        // Try to find JSON object in the response
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedText = jsonMatch[0];
          console.log('Extracted JSON:', cleanedText);
        }

        const result = JSON.parse(cleanedText);

        // Validate the response format
        if (result.status && ['required', 'preferred', 'not_required'].includes(result.status)) {
          return {
            status: result.status,
            level: result.level || null
          };
        }
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
      }
    }

    // If we couldn't parse a valid response, return unclear
    return { status: 'unclear', level: null };

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return { status: 'unclear', level: null };
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open settings page on first install
    chrome.runtime.openOptionsPage();
  }
});