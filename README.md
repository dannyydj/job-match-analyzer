# Job Match Analyzer

Automatically analyzes job postings to help you find your perfect match! This Chrome extension checks:
- **German language requirements** (required, preferred, or not needed)
- **Skills & experience match** (% compatibility with your profile)
- **Interest alignment** (% match with your career interests)

## 🚀 What this extension does

This Chrome extension analyzes job postings on popular platforms to provide comprehensive job matching. It currently supports:
- **LinkedIn Jobs**
- **StepStone.de**
- **Indeed.com** (US & Germany)

The extension uses the Gemini AI API to accurately parse job descriptions and provides quick visual indicators via color-coded badges.


## 📦 Installation

Since this extension is in development, you can install it manually in Google Chrome:

1. Download or clone this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. In the top right corner, enable **Developer mode**.
4. Click the **Load unpacked** button.
5. Select the folder containing this extension's files.
6. The extension should now appear in your list of extensions and be active!

## 🔑 How to get your Gemini API Key

To use this extension, you need a Gemini API key. Follow these steps:

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click "Get API Key" or "Create API Key".
4. Copy the generated key.
5. Paste it into the extension's **Settings** page.

**Note:** Your API key is stored locally on your machine and is only used to send job descriptions to Gemini for analysis.

## ⚙️ Setting Up Your Profile

To get skills and interest matching, fill in your profile in the Settings page:

### Skills & Experience (500 characters max)
Add your key skills, technologies, and experience. Examples:
- `Python 5 years, React, Team leadership, Agile, AWS, SQL, Docker`
- `Product management, Data analysis, A/B testing, User research`

### Interests (500 characters max)
Add your career interests, industry preferences, company culture, and work style. Examples:
- `FinTech, startups, remote work, building developer tools, small teams`
- `HealthTech, AI/ML, large companies, work-life balance`

**Tip:** Both fields have a 500-character limit with live counters to help you stay concise.

## 🎨 Badge Colors & Meanings

The extension displays up to **3 color-coded badges** on each job posting:

### 1. Language Badge (always shown)
- 🔴 **Red:** German language is **required**
- 🟡 **Yellow:** German language is **preferred**
- 🟢 **Green:** **No German required** (English only)
- ⚪ **Gray:** Language requirements are **unclear**

### 2. Skills Match Badge
- 🔴 **Red (0-33%):** Low match - you're missing many required skills
- 🟡 **Yellow (34-66%):** Medium match - you have some skills but gaps exist
- 🟢 **Green (67-100%):** High match - strong alignment with job requirements

### 3. Interest Match Badge
- 🔴 **Red (0-33%):** Low alignment with your interests
- 🟡 **Yellow (34-66%):** Moderate fit with your interests
- 🟢 **Green (67-100%):** Great match - aligns well with your interests

## 📊 How Matching Works

The extension analyzes:
- **Language:** Detects German language requirements and proficiency levels
- **Skills:** Compares your skills with job requirements
- **Interests:** Matches your interests against industry, company size, technologies, work style, and company values mentioned in the job description

All analysis is powered by Google's Gemini AI for accurate semantic understanding.

## 🔄 Cache & Performance

- Job analyses are **cached for 30 days** to save API calls and speed up browsing
- Cache is **automatically cleared** when you update your profile
- You can manually clear cache anytime in Settings

## 🆕 What's New in v2.0

- ✅ **Skills matching:** See how well your skills match the job
- ✅ **Interest alignment:** Find jobs that match your career interests
- ✅ **Percentage scores:** Quick visual indicators for each dimension
- ✅ **Profile management:** Easy-to-use settings page with character counters
- ✅ **Smart caching:** Automatic cache clearing when profile updates

---

**Find the right job, faster!** 🎯
