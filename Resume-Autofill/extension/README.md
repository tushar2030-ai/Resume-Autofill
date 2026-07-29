# Resume AutoFill (AI)

A Chrome extension that extracts your resume into a structured profile and
fills job application forms on any site with one click — powered by a
backend proxy so users never need their own API key.

## Architecture

This extension does NOT call Google's Gemini API directly. It calls your
own backend server (see the companion `resume-autofill-backend` project),
which holds the Gemini API key server-side and proxies requests. This
means:
- Users of your published extension need zero setup — no API key to get.
- Your key is never shipped inside the extension or visible to users.
- You are responsible for the backend's hosting and API costs. See the
  backend's README for rate-limiting setup before you publish this widely.

## Setup

### 1. Deploy the backend first
Follow `resume-autofill-backend/README.md` to deploy it to Vercel with
your Gemini key as a server-side env var, and set up rate limiting.

### 2. Point the extension at your backend
In `background.js`, change:
```js
const PROXY_URL = "https://YOUR-DEPLOYMENT.vercel.app";
```
to your actual deployed URL. Also update `host_permissions` in
`manifest.json` to match that domain.

### 3. Load the extension in Chrome
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked", select this folder

### 4. Use it
1. Open the popup, upload a resume PDF, click "Extract profile"
2. On any job application page, click the floating "Fill with Resume" button
3. Review filled fields before submitting

## Current limitations

- **PDF only** for auto-extraction right now (paste-as-text is the fallback for other formats)
- Multi-step application forms need the button clicked again on each step
- File upload fields are not auto-filled — attach your resume file yourself
- Some heavily custom-built forms may not fill perfectly
- Backend rate limits (set by whoever runs the proxy) may cap daily usage

## Files

```
manifest.json     - extension config (Manifest V3)
background.js     - talks to YOUR backend proxy (not Google directly)
content.js/.css   - injects the "Fill with Resume" button + does the filling
popup.html/.js/.css   - upload & manage resume, trigger fill
options.html/.js/.css - editable resume profile (no API key needed)
icons/            - extension icons
```
