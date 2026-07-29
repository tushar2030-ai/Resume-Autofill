// content.js - runs on every page

(function () {
  if (window.__resumeAutofillInjected) return;
  window.__resumeAutofillInjected = true;

  const btn = document.createElement("button");
  btn.id = "resume-autofill-btn";
  btn.textContent = "\u2728 Fill with Resume";
  document.documentElement.appendChild(btn);

  const toast = document.createElement("div");
  toast.id = "resume-autofill-toast";
  document.documentElement.appendChild(toast);

  function showToast(text, isError) {
    toast.textContent = text;
    toast.className = isError ? "error show" : "show";
    setTimeout(() => toast.classList.remove("show"), 4000);
  }

  function labelFor(el) {
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) return lbl.innerText.trim();
    }
    const parentLabel = el.closest("label");
    if (parentLabel) return parentLabel.innerText.trim();
    if (el.getAttribute("aria-label")) return el.getAttribute("aria-label");
    // look at preceding sibling text as a fallback
    let prev = el.previousElementSibling;
    if (prev && prev.innerText) return prev.innerText.trim().slice(0, 120);
    return "";
  }

  function isFillable(el) {
    if (el.disabled || el.readOnly) return false;
    if (el.type === "hidden" || el.type === "submit" || el.type === "button" || el.type === "file" || el.type === "image" || el.type === "reset") return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return true;
  }

  function scanFields() {
    const nodes = Array.from(document.querySelectorAll("input, select, textarea")).filter(isFillable);
    return nodes.map((el, index) => {
      el.setAttribute("data-raf-index", String(index));
      const base = {
        index,
        tag: el.tagName.toLowerCase(),
        type: el.type || "text",
        name: el.name || "",
        id: el.id || "",
        placeholder: el.placeholder || "",
        label: labelFor(el)
      };
      if (el.tagName.toLowerCase() === "select") {
        base.options = Array.from(el.options).map(o => o.textContent.trim());
      }
      return base;
    });
  }

  function setNativeValue(el, value) {
    const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function applyMapping(mapping) {
    let filled = 0;
    for (const item of mapping) {
      const el = document.querySelector(`[data-raf-index="${item.index}"]`);
      if (!el) continue;
      const tag = el.tagName.toLowerCase();
      if (tag === "select") {
        const opt = Array.from(el.options).find(o => o.textContent.trim() === item.value);
        if (opt) {
          el.value = opt.value;
          el.dispatchEvent(new Event("change", { bubbles: true }));
          filled++;
        }
      } else if (el.type === "checkbox" || el.type === "radio") {
        const wanted = String(item.value).toLowerCase() === "true";
        if (el.checked !== wanted) el.click();
        filled++;
      } else {
        setNativeValue(el, item.value);
        filled++;
      }
    }
    return filled;
  }

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Scanning form...";
    try {
      const fields = scanFields();
      if (fields.length === 0) {
        showToast("No fillable form fields found on this page.", true);
        return;
      }
      btn.textContent = "Asking AI to match fields...";
      const resp = await chrome.runtime.sendMessage({ type: "FILL_FORM", fields });
      if (!resp.ok) throw new Error(resp.error);
      const filled = applyMapping(resp.mapping);
      showToast(`Filled ${filled} field${filled === 1 ? "" : "s"}. Please review before submitting!`);
    } catch (err) {
      showToast(err.message || String(err), true);
    } finally {
      btn.disabled = false;
      btn.textContent = "\u2728 Fill with Resume";
    }
  });
})();
