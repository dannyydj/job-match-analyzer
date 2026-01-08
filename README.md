# German Language Requirement Checker

Automatically detects German language requirements in job postings to help you navigate your job search more efficiently.

## 🚀 What this extension does
This Chrome extension analyzes job postings on popular platforms to identify whether German language skills are required, preferred, or not mentioned. It currently supports:
- **LinkedIn Jobs**
- **StepStone.de**

The extension uses the Gemini AI API to accurately parse job descriptions and provide a quick visual indicator via color-coded badges.

## 🔑 How to get your Gemini API Key
To use this extension, you need a Gemini API key. Follow these steps:

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click "Get API Key" or "Create API Key".
4. Copy the generated key.
5. Paste it into the extension's **Settings** page.

**Note:** Your API key is stored locally on your machine and is only used to send job descriptions to Gemini for analysis.

## 🎨 Badge Colors Meaning
The extension adds a status badge to job postings with the following color meanings:

- 🔴 **Red:** German language is **required**.
- 🟡 **Yellow:** German language is **preferred**.
- 🟢 **Green:** **No German required** (English only).
- ⚪ **Gray:** Language requirements are **unclear**.

---
*Helping you find the right job, language-wise!*
