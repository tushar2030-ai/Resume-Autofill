// background.js - service worker
// Calls YOUR backend proxy (not Google directly). The proxy holds the
// Gemini API key server-side so it's never shipped inside this extension.

// TODO: set this to your deployed backend URL before publishing, e.g.
// "https://resume-autofill-api.vercel.app"
const PROXY_URL = "https://YOUR-DEPLOYMENT.vercel.app";

async function callProxy(path, body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  let resp;
  try {
    resp = await fetch(PROXY_URL + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out after 25s. Try again in a moment.");
    }
    throw new Error("Network error reaching the server: " + err.message);
  } finally {
    clearTimeout(timeoutId);
  }
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data?.error || `Server error (${resp.status})`);
  }
  return data;
}

async function handleParseResume(msg) {
  const body =
    msg.mode === "pdf"
      ? { mode: "pdf", base64: msg.base64 }
      : { mode: "text", text: msg.text };
  const { profile } = await callProxy("/api/parse-resume", body);
  await chrome.storage.local.set({ resumeProfile: profile });
  return profile;
}

async function handleFillForm(msg) {
  const { resumeProfile } = await chrome.storage.local.get("resumeProfile");
  if (!resumeProfile) throw new Error("No resume uploaded yet. Open the extension popup and upload your resume first.");
  const { mapping } = await callProxy("/api/fill-form", { profile: resumeProfile, fields: msg.fields });
  return mapping;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "PARSE_RESUME") {
        const profile = await handleParseResume(msg);
        sendResponse({ ok: true, profile });
      } else if (msg.type === "FILL_FORM") {
        const mapping = await handleFillForm(msg);
        sendResponse({ ok: true, mapping });
      } else {
        sendResponse({ ok: false, error: "Unknown message type" });
      }
    } catch (err) {
      sendResponse({ ok: false, error: err.message || String(err) });
    }
  })();
  return true;
});
