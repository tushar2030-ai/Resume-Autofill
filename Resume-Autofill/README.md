# Resume Autofill

Two parts:
- `backend/` — Vercel serverless proxy that holds the Gemini API key and does the actual AI calls
- `extension/` — the Chrome extension (loaded unpacked), which calls the backend instead of Google directly

See `backend/README.md` for deployment steps and `extension/README.md` for loading it into Chrome.
