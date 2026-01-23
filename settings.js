// Settings page logic for API key and profile management

// Load saved data when page opens
document.addEventListener('DOMContentLoaded', async () => {
  const result = await chrome.storage.local.get(['geminiApiKey', 'userSkillsExperience', 'userInterests']);

  if (result.geminiApiKey) {
    document.getElementById('apiKey').value = result.geminiApiKey;
  }

  if (result.userSkillsExperience) {
    document.getElementById('skillsExperience').value = result.userSkillsExperience;
  }

  if (result.userInterests) {
    document.getElementById('interests').value = result.userInterests;
  }

  // Update character counters
  updateCharCounter('skillsExperience', 'skillsCounter');
  updateCharCounter('interests', 'interestsCounter');

  // Add event listeners for live character counting
  document.getElementById('skillsExperience').addEventListener('input', () => {
    updateCharCounter('skillsExperience', 'skillsCounter');
  });

  document.getElementById('interests').addEventListener('input', () => {
    updateCharCounter('interests', 'interestsCounter');
  });
});

// Save settings button handler
document.getElementById('saveBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  const skillsExperience = document.getElementById('skillsExperience').value.trim();
  const interests = document.getElementById('interests').value.trim();

  if (!apiKey) {
    showMessage('Please enter an API key', 'error');
    return;
  }

  try {
    // Save all settings to Chrome storage
    await chrome.storage.local.set({
      geminiApiKey: apiKey,
      userSkillsExperience: skillsExperience,
      userInterests: interests
    });

    // Clear cache since profile changed - ensures fresh analysis with new profile
    await chrome.storage.local.remove(['scannedJobs']);

    showMessage('Settings saved successfully! Cache cleared for fresh analysis.', 'success');
  } catch (error) {
    showMessage('Error saving settings: ' + error.message, 'error');
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

// Helper function to update character counter
function updateCharCounter(textareaId, counterId) {
  const textarea = document.getElementById(textareaId);
  const counter = document.getElementById(counterId);
  const currentLength = textarea.value.length;
  const maxLength = textarea.maxLength;
  counter.textContent = `${currentLength} / ${maxLength} characters`;
}