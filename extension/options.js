const profileJson = document.getElementById("profileJson");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profileStatus = document.getElementById("profileStatus");

async function init() {
  const { resumeProfile } = await chrome.storage.local.get(["resumeProfile"]);
  if (resumeProfile) profileJson.value = JSON.stringify(resumeProfile, null, 2);
}
init();

saveProfileBtn.addEventListener("click", async () => {
  try {
    const parsed = JSON.parse(profileJson.value);
    await chrome.storage.local.set({ resumeProfile: parsed });
    profileStatus.textContent = "Saved.";
    profileStatus.style.color = "#16a34a";
  } catch (err) {
    profileStatus.textContent = "Invalid JSON: " + err.message;
    profileStatus.style.color = "#b91c1c";
  }
  setTimeout(() => (profileStatus.textContent = ""), 3000);
});
