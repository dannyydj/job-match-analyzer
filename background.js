// Background service worker handles API calls to Gemini AI
// It receives job text from content script and returns comprehensive job analysis

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
    // Get API key and user profile from storage
    const result = await chrome.storage.local.get(['geminiApiKey', 'userSkillsExperience', 'userInterests']);
    const apiKey = result.geminiApiKey;
    const userSkills = result.userSkillsExperience || '';
    const userInterests = result.userInterests || '';

    if (!apiKey) {
      console.error('No API key found');
      return {
        language: { status: 'unclear', level: null },
        skillsMatch: 0,
        interestMatch: 0
      };
    }

    // Truncate job text to ~5000 chars to avoid token limit errors
    const truncatedText = jobText.length > 5000 ? jobText.substring(0, 5000) + "..." : jobText;

    // Log request details
    console.log('[Job Match Analyzer] Analysis request:', {
      jobUrl,
      hasProfile: !!(userSkills || userInterests),
      profileLengths: {
        skills: userSkills.length,
        interests: userInterests.length
      },
      jobTextLength: truncatedText.length,
      timestamp: new Date().toISOString()
    });

    // Prepare the enhanced prompt for Gemini
    const prompt = `Analyze this job posting against the candidate's profile.

JOB POSTING:
${truncatedText}

CANDIDATE PROFILE:
Skills & Experience: ${userSkills || 'Not provided'}
Interests: ${userInterests || 'Not provided'}

INSTRUCTIONS:
1. LANGUAGE REQUIREMENTS:
   - Determine if German language skills are:
     * REQUIRED (must have, mandatory, essential)
     * PREFERRED (nice to have, desirable, advantage)
     * NOT_REQUIRED (not mentioned, or only English required)
   - Identify proficiency level if mentioned (A1, A2, B1, B2, C1, C2, "fluent", "native", "basic", "business level")

2. SKILLS & EXPERIENCE MATCH:
   - Compare the candidate's skills and experience with the job requirements
   - Calculate percentage: (matched requirements / total requirements mentioned in job) × 100
   - If candidate profile is not provided, return 0

3. INTEREST MATCH:
   - Compare the candidate's interests with the job description and company culture
   - Calculate percentage: (aligned interests / total relevant aspects in job) × 100
   - Consider: industry, technologies, work style, company values, company size, projects
   - If candidate profile is not provided, return 0

4. RESPOND with ONLY this JSON (no markdown, no explanation):
{
  "language": {
    "status": "required" | "preferred" | "not_required",
    "level": "B2" | "C1" | "fluent" | null
  },
  "skillsMatch": 75,
  "interestMatch": 80
}

IMPORTANT: 
- Percentages must be 0-100
- If profile section is empty, set that match to 0
- Be realistic with matching - require actual overlap, not just similarity`;

    console.log('[Job Match Analyzer] Sending prompt to Gemini:', prompt);

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
          maxOutputTokens: 150,
        }
      })
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        console.error('[Job Match Analyzer] Gemini API error:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error('[Job Match Analyzer] Gemini API error (non-JSON):', response.status, response.statusText);
      }
      return {
        language: { status: 'unclear', level: null },
        skillsMatch: 0,
        interestMatch: 0
      };
    }

    const data = await response.json();
    // Log the full API response
    console.log('[Job Match Analyzer] Full Gemini API response:', JSON.stringify(data, null, 2));

    // Extract the text response from Gemini
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const responseText = data.candidates[0].content.parts[0].text;

      // Log the raw response to see what we got
      console.log('[Job Match Analyzer] Raw Gemini response:', responseText);

      // Parse the JSON response
      try {
        // Remove markdown, extra whitespace, and newlines
        let cleanedText = responseText
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();

        console.log('[Job Match Analyzer] Cleaned text:', cleanedText);

        // Try to find JSON object in the response
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedText = jsonMatch[0];
          console.log('[Job Match Analyzer] Extracted JSON:', cleanedText);
        }

        const parsedResult = JSON.parse(cleanedText);

        // Validate and apply defaults
        const validatedResult = {
          language: {
            status: parsedResult.language?.status || 'unclear',
            level: parsedResult.language?.level || null
          },
          skillsMatch: typeof parsedResult.skillsMatch === 'number' ? parsedResult.skillsMatch : 0,
          interestMatch: typeof parsedResult.interestMatch === 'number' ? parsedResult.interestMatch : 0
        };

        console.log('[Job Match Analyzer] Validated result:', validatedResult);

        // Final validation - ensure language status is valid
        if (!['required', 'preferred', 'not_required'].includes(validatedResult.language.status)) {
          validatedResult.language.status = 'unclear';
        }

        return validatedResult;

      } catch (parseError) {
        console.error('[Job Match Analyzer] Error parsing Gemini response:', parseError);
        return {
          language: { status: 'unclear', level: null },
          skillsMatch: 0,
          interestMatch: 0
        };
      }
    }

    // If we couldn't parse a valid response, return defaults
    return {
      language: { status: 'unclear', level: null },
      skillsMatch: 0,
      interestMatch: 0
    };

  } catch (error) {
    console.error('[Job Match Analyzer] Error calling Gemini API:', error);
    return {
      language: { status: 'unclear', level: null },
      skillsMatch: 0,
      interestMatch: 0
    };
  }
}

// Handle extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open settings page on first install
    chrome.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    // Clear cache on update to v2.0 to avoid format conflicts
    chrome.storage.local.remove(['scannedJobs']);
    console.log('[Job Match Analyzer] Cache cleared after extension update to v2.0');
  }
});