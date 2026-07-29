// lib/gemini.js
// Server-side only. GEMINI_API_KEY is read from the environment (Vercel
// project settings) and never sent to or exposed to the client.

const MODEL = "gemini-flash-latest";
const API_URL = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

const PROFILE_SCHEMA_PROMPT = `You are extracting structured data from a resume.
Return a single JSON object matching exactly this shape:

{
  "fullName": "", "firstName": "", "lastName": "",
  "email": "", "phone": "",
  "address": "", "city": "", "state": "", "zip": "", "country": "",
  "linkedin": "", "website": "", "github": "",
  "summary": "",
  "yearsOfExperience": "",
  "workExperience": [
    {"company": "", "title": "", "location": "", "startDate": "", "endDate": "", "description": ""}
  ],
  "education": [
    {"school": "", "degree": "", "field": "", "startDate": "", "endDate": ""}
  ],
  "skills": [""],
  "certifications": [""]
}

Rules:
- If a field isn't present in the resume, use "" (or [] for lists). Never invent data.
- Dates as written in the resume (e.g. "Jan 2022").
- workExperience ordered most recent first.`;

async function callGemini(parts, { timeoutMs = 25000 } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Server misconfigured: GEMINI_API_KEY is not set.");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let resp;
  try {
    resp = await fetch(API_URL(apiKey), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: "application/json" }
      }),
      signal: controller.signal
    });
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Upstream AI request timed out.");
    throw new Error("Error reaching Gemini API: " + err.message);
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data?.error?.message || `Gemini API error (${resp.status})`);
  }
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  if (!text) throw new Error("No text response from Gemini.");
  return text;
}

function extractJson(text) {
  let t = text.trim();
  t = t.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const isArray = t.trimStart()[0] === "[";
  const start = t.indexOf(isArray ? "[" : "{");
  const end = isArray ? t.lastIndexOf("]") : t.lastIndexOf("}");
  if (start !== -1 && end !== -1) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

async function parseResume({ mode, base64, text }) {
  let parts;
  if (mode === "pdf") {
    parts = [
      { inline_data: { mime_type: "application/pdf", data: base64 } },
      { text: PROFILE_SCHEMA_PROMPT }
    ];
  } else {
    parts = [{ text: PROFILE_SCHEMA_PROMPT + "\n\nResume text:\n" + text }];
  }
  const raw = await callGemini(parts);
  return extractJson(raw);
}

async function matchFormFields({ profile, fields }) {
  const prompt = `You are matching a job application form's fields to a candidate's resume profile.

Candidate profile (JSON):
${JSON.stringify(profile)}

Form fields on the page (JSON array, each has an "index"):
${JSON.stringify(fields)}

For each field, decide the best value to fill in from the candidate profile. Rules:
- Return a JSON array like [{"index": 0, "value": "..."}, ...].
- Only include entries where you have a confident, appropriate value. Skip fields you're unsure about (don't guess wildly, don't invent data not in the profile).
- For "select" type fields, "value" must exactly match one of the provided options.
- For checkboxes/radio type fields, use "true" or "false" as the value string.
- For yes/no eligibility-type questions with no data in the profile (e.g. visa sponsorship), skip them.
- Keep text fields concise and appropriately formatted for the field.`;

  const raw = await callGemini([{ text: prompt }]);
  return extractJson(raw);
}

module.exports = { parseResume, matchFormFields };
