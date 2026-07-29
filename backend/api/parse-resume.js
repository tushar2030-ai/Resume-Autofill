// api/parse-resume.js
const { parseResume } = require("../lib/gemini");
const { checkRateLimit, DAILY_LIMIT } = require("../lib/rateLimit");
const { applyCors } = require("../lib/cors");

const MAX_BASE64_LEN = 15_000_000; // ~11MB PDF ceiling, keeps costs/time bounded
const MAX_TEXT_LEN = 50_000;

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { allowed, persistent } = await checkRateLimit(req);
    if (!allowed) {
      res.status(429).json({
        error: `Daily limit reached (${DAILY_LIMIT} requests/day per user). Try again tomorrow.`
      });
      return;
    }
    if (!persistent) {
      console.warn("Rate limiting is running in-memory (not persistent) - set UPSTASH_REDIS_REST_URL/TOKEN for real protection.");
    }

    const { mode, base64, text } = req.body || {};
    if (mode === "pdf") {
      if (!base64 || base64.length > MAX_BASE64_LEN) {
        res.status(400).json({ error: "Missing or oversized PDF data." });
        return;
      }
    } else if (mode === "text") {
      if (!text || text.length > MAX_TEXT_LEN) {
        res.status(400).json({ error: "Missing or oversized resume text." });
        return;
      }
    } else {
      res.status(400).json({ error: "mode must be 'pdf' or 'text'." });
      return;
    }

    const profile = await parseResume({ mode, base64, text });
    res.status(200).json({ profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
};
