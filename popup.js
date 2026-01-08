// Popup script that shows extension status and provides quick access to settings

// Check API key status when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  const result = await chrome.storage.local.get(['geminiApiKey', 'scannedJobs']);
  const statusText = document.getElementById('statusText');
  
  if (result.geminiApiKey) {
    const jobCount = result.scannedJobs ? Object.keys(result.scannedJobs).length : 0;
    statusText.textContent = `Ready (${jobCount} jobs cached)`;
    statusText.style.color = '#28a745';
  } else {
    statusText.textContent = 'No API key configured';
    statusText.style.color = '#dc3545';
  }
});

// Open settings page when button is clicked
document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});