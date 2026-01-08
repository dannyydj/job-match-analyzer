// This script runs on LinkedIn and Stepstone job pages
// It extracts job description, checks cache, and displays language requirement badge

(function () {
  'use strict';

  // Track current URL to detect changes
  let currentUrl = window.location.href;

  // Initial scan when page loads
  checkCacheAndScan();

  // Watch for URL changes on click (for LinkedIn's partial page reload)
  document.addEventListener('click', () => {
    setTimeout(() => {
      const newUrl = window.location.href;
      if (newUrl !== currentUrl) {
        currentUrl = newUrl;
        checkCacheAndScan();
      }
    }, 500); // Wait 500ms for URL to update after click
  });

  async function checkCacheAndScan() {
    // Safety check: If the URL is invalid or from the extension itself, re-read it from the browser
    if (!currentUrl || currentUrl.includes('invalid') || currentUrl.startsWith('chrome-extension')) {
      currentUrl = window.location.href;
    }

    const jobUrl = currentUrl;

    try {
      // Retrieve cached scans from Chrome storage
      const result = await chrome.storage.local.get(['scannedJobs']);
      const scannedJobs = result.scannedJobs || {};

      // Check if this URL exists in cache
      if (scannedJobs[jobUrl]) {
        const cachedData = scannedJobs[jobUrl];
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

        // If cached data is less than 30 days old, use it
        if (cachedData.timestamp > thirtyDaysAgo) {
          displayBadge(cachedData.result);
          return;
        }
      }

      // If not in cache or expired, scan the job
      scanJob();
    } catch (error) {
      console.error('Error checking cache:', error);
      displayBadge({ status: 'unclear', level: null });
    }
  }

  async function scanJob() {
    const jobUrl = currentUrl;

    // Extract job description text from the page
    const jobText = extractJobDescription();

    // log job url
    console.log("scanning job: " + jobUrl);
    // log job text
    console.log("scanning text: " + jobText);

    if (!jobText) {
      console.error('Could not extract job description');
      displayBadge({ status: 'unclear', level: null });
      return;
    }

    // Show a loading badge while waiting for AI response
    displayBadge({ status: 'loading', level: null });

    // Truncate text before sending to prevent message channel size limits
    const truncatedText = jobText.length > 5000 ? jobText.substring(0, 5000) + "..." : jobText;

    // Send job text to background script for AI analysis
    chrome.runtime.sendMessage(
      {
        action: 'analyzeJob',
        jobText: truncatedText,
        jobUrl: jobUrl
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          displayBadge({ status: 'unclear', level: null });
          return;
        }

        if (response && response.success) {
          displayBadge(response.result);
          // Cache the result with jobUrl
          cacheResult(response.result, jobUrl);
        } else {
          displayBadge({ status: 'unclear', level: null });
        }
      }
    );
  }

  function extractJobDescription() {
    // Extract job description based on the website
    let jobText = '';

    if (window.location.hostname.includes('linkedin.com')) {
      // LinkedIn job description selector
      const descriptionElement = document.querySelector('.jobs-description__content, .jobs-box__html-content, .description__text');
      if (descriptionElement) {
        jobText = descriptionElement.innerText;
      }
    } else if (window.location.hostname.includes('stepstone.')) {
      // Stepstone job description selectors (covering several versions of their site)
      const descriptionElement = document.querySelector(
        '[data-at="job-ad-content"]'
        //, [data-testid="job-description"], [data-at="jobad-description"], [data-at="job-description-text"], .js-app-ld-ContentBlock, .listing-content, article
      );
      if (descriptionElement) {
        jobText = descriptionElement.innerText;
      }
    }

    return jobText.trim();
  }

  function displayBadge(result) {
    // Remove existing badge if any
    const existingBadge = document.getElementById('lang-checker-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    // Create badge element
    const badge = document.createElement('div');
    badge.id = 'lang-checker-badge';
    badge.className = 'lang-checker-badge';

    // Set badge content and style based on result
    let badgeClass = '';
    let badgeText = '';

    if (result.status === 'loading') {
      badgeClass = 'loading';
      badgeText = 'Scanning...';
    } else if (result.status === 'required') {
      badgeClass = 'required';
      badgeText = result.level ? `German Required (${result.level})` : 'German Required';
    } else if (result.status === 'preferred') {
      badgeClass = 'preferred';
      badgeText = result.level ? `German Preferred (${result.level})` : 'German Preferred';
    } else if (result.status === 'not_required') {
      badgeClass = 'not-required';
      badgeText = 'No German Required';
    } else {
      badgeClass = 'unclear';
      badgeText = 'Unclear';
    }

    badge.className += ' ' + badgeClass;
    badge.textContent = badgeText;

    // Add badge to page
    document.body.appendChild(badge);
  }

  async function cacheResult(result, jobUrl) {
    // Save the scan result to local storage with timestamp
    try {
      const storageResult = await chrome.storage.local.get(['scannedJobs']);
      const scannedJobs = storageResult.scannedJobs || {};

      // Add current job to cache
      scannedJobs[jobUrl] = {
        result: result,
        timestamp: Date.now()
      };

      // Clean up old entries (older than 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      for (const url in scannedJobs) {
        if (scannedJobs[url].timestamp < thirtyDaysAgo) {
          delete scannedJobs[url];
        }
      }

      // Save back to storage
      await chrome.storage.local.set({ scannedJobs: scannedJobs });
    } catch (error) {
      console.error('Error caching result:', error);
    }
  }

})();