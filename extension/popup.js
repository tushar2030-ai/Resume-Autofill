const fileInput = document.getElementById("fileInput");
const fileLabelText = document.getElementById("fileLabelText");
const parseBtn = document.getElementById("parseBtn");
const parsePasteBtn = document.getElementById("parsePasteBtn");
const pasteText = document.getElementById("pasteText");
const statusEl = document.getElementById("status");
const uploadSection = document.getElementById("uploadSection");
const profileSection = document.getElementById("profileSection");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const fillBtn = document.getElementById("fillBtn");

let selectedFile = null;

async function init() {
  const { resumeProfile } = await chrome.storage.local.get(["resumeProfile"]);
  if (resumeProfile) showProfile(resumeProfile);
}
init();

function showProfile(profile) {
  uploadSection.classList.add("hidden");
  profileSection.classList.remove("hidden");
  profileName.textContent = profile.fullName || "(name not detected)";
  profileEmail.textContent = profile.email || "";
}

fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files[0] || null;
  fileLabelText.textContent = selectedFile ? selectedFile.name : "Choose resume PDF";
  parseBtn.disabled = !selectedFile;
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function runParse(msg) {
  statusEl.textContent = "Extracting profile with Claude...";
  parseBtn.disabled = true;
  parsePasteBtn.disabled = true;
  try {
    const resp = await chrome.runtime.sendMessage(msg);
    if (!resp.ok) throw new Error(resp.error);
    statusEl.textContent = "Done!";
    showProfile(resp.profile);
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
  } finally {
    parseBtn.disabled = false;
    parsePasteBtn.disabled = false;
  }
}

parseBtn.addEventListener("click", async () => {
  if (!selectedFile) return;
  const base64 = await fileToBase64(selectedFile);
  runParse({ type: "PARSE_RESUME", mode: "pdf", base64 });
});

parsePasteBtn.addEventListener("click", () => {
  const text = pasteText.value.trim();
  if (!text) return;
  runParse({ type: "PARSE_RESUME", mode: "text", text });
});

fillBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  fillBtn.disabled = true;
  fillBtn.textContent = "Filling...";
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.getElementById("resume-autofill-btn")?.click()
    });
    window.close();
  } catch (err) {
    fillBtn.textContent = "Fill current page";
    fillBtn.disabled = false;
  }
});

document.getElementById("optionsLink").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
document.getElementById("editProfileLink").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
document.getElementById("reuploadLink").addEventListener("click", (e) => {
  e.preventDefault();
  profileSection.classList.add("hidden");
  uploadSection.classList.remove("hidden");
});
