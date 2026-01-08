// Settings page logic for API key management

// Load saved API key when page opens
document.addEventListener('DOMContentLoaded', async () => {
  const result = await chrome.storage.local.get(['geminiApiKey']);
  if (result.geminiApiKey) {
    document.getElementById('apiKey').value = result.geminiApiKey;
  }
});

// Save API key button handler
document.getElementById('saveBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  
  if (!apiKey) {
    showMessage('Please enter an API key', 'error');
    return;
  }
  
  try {
    // Save API key to Chrome storage
    await chrome.storage.local.set({ geminiApiKey: apiKey });
    showMessage('API key saved successfully!', 'success');
  } catch (error) {
    showMessage('Error saving API key: ' + error.message, 'error');
  }
});

// Clear cache button handler
document.getElementById('clearBtn').addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all cached job scans? This will require re-scanning jobs you visit.')) {
    try {
      // Remove all cached scans from storage
      await chrome.storage.local.remove(['scannedJobs']);
      showMessage('Cache cleared successfully!', 'success');
    } catch (error) {
      showMessage('Error clearing cache: ' + error.message, 'error');
    }
  }
});

// Helper function to display messages to user
function showMessage(text, type) {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = text;
  messageDiv.className = 'message ' + type;
  messageDiv.style.display = 'block';
  
  // Hide message after 3 seconds
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 3000);
}