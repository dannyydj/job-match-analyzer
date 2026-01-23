// This script runs on LinkedIn and Stepstone job pages
// It extracts job description, checks cache, and displays job match badges

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
          displayBadges(cachedData.result);
          return;
        }
      }

      // If not in cache or expired, scan the job
      scanJob();
    } catch (error) {
      console.error('Error checking cache:', error);
      displayBadges({
        language: { status: 'unclear', level: null },
        skillsMatch: 0,
        interestMatch: 0
      });
    }
  }

  async function scanJob() {
    const jobUrl = currentUrl;

    // Extract job description text from the page
    const jobText = extractJobDescription();

    // Log job url
    console.log("[Job Match Analyzer] Scanning job:", jobUrl);
    // Log job text
    console.log("[Job Match Analyzer] Scanning text:", jobText);

    if (!jobText) {
      console.error('Could not extract job description');
      displayBadges({
        language: { status: 'unclear', level: null },
        skillsMatch: 0,
        interestMatch: 0
      });
      return;
    }

    // Show a loading badge while waiting for AI response
    displayBadges({ status: 'loading' });

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
          displayBadges({
            language: { status: 'unclear', level: null },
            skillsMatch: 0,
            interestMatch: 0
          });
          return;
        }

        if (response && response.success) {
          displayBadges(response.result);
          // Cache the result with jobUrl
          cacheResult(response.result, jobUrl);
        } else {
          displayBadges({
            language: { status: 'unclear', level: null },
            skillsMatch: 0,
            interestMatch: 0
          });
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
      );
      if (descriptionElement) {
        jobText = descriptionElement.innerText;
      }
    }

    return jobText.trim();
  }

  function displayBadges(result) {
    // Remove existing badges if any
    const existingBadges = document.querySelectorAll('.lang-checker-badge');
    existingBadges.forEach(badge => badge.remove());

    // Handle loading state - show single badge
    if (result.status === 'loading') {
      const badge = document.createElement('div');
      badge.className = 'lang-checker-badge loading';
      badge.textContent = 'Analyzing job...';
      document.body.appendChild(badge);
      return;
    }

    // Display badges: up to 3 badges stacked vertically
    const badges = [];

    // 1. Language Badge (always shown)
    const languageBadge = createLanguageBadge(result.language);
    badges.push(languageBadge);

    // 2. Skills Match Badge (only if user has profile - skillsMatch > 0 or explicitly set)
    if (result.skillsMatch !== undefined && result.skillsMatch >= 0) {
      const skillsBadge = createPercentageBadge('💼 Skills Match', result.skillsMatch);
      if (skillsBadge) badges.push(skillsBadge);
    }

    // 3. Interest Match Badge (only if user has profile)
    if (result.interestMatch !== undefined && result.interestMatch >= 0) {
      const interestBadge = createPercentageBadge('❤️ Interest Match', result.interestMatch);
      if (interestBadge) badges.push(interestBadge);
    }

    // Position badges vertically with 10px gap
    badges.forEach((badge, index) => {
      badge.style.bottom = `${20 + (index * 70)}px`; // 70px spacing = 60px badge height + 10px gap
      document.body.appendChild(badge);
    });
  }

  function createLanguageBadge(language) {
    const badge = document.createElement('div');
    badge.className = 'lang-checker-badge';

    let badgeClass = '';
    let badgeText = '';

    if (language.status === 'required') {
      badgeClass = 'required';
      badgeText = language.level ? `🔴 German Required (${language.level})` : '🔴 German Required';
    } else if (language.status === 'preferred') {
      badgeClass = 'preferred';
      badgeText = language.level ? `🟡 German Preferred (${language.level})` : '🟡 German Preferred';
    } else if (language.status === 'not_required') {
      badgeClass = 'not-required';
      badgeText = '🟢 No German Required';
    } else {
      badgeClass = 'unclear';
      badgeText = '⚪ Unclear';
    }

    badge.className += ' ' + badgeClass;
    badge.textContent = badgeText;
    return badge;
  }

  function createPercentageBadge(label, percentage) {
    // Don't show badge if percentage is 0 (user hasn't filled profile)
    if (percentage === 0) {
      return null;
    }

    const badge = document.createElement('div');
    badge.className = 'lang-checker-badge';

    // Determine color class based on percentage
    let colorClass = '';
    if (percentage <= 33) {
      colorClass = 'match-low';  // Red
    } else if (percentage <= 66) {
      colorClass = 'match-medium';  // Yellow
    } else {
      colorClass = 'match-high';  // Green
    }

    badge.className += ' ' + colorClass;
    badge.textContent = `${label}: ${percentage}%`;
    return badge;
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