// api/fill-form.js
const { matchFormFields } = require("../lib/gemini");
const { checkRateLimit, DAILY_LIMIT } = require("../lib/rateLimit");
const { applyCors } = require("../lib/cors");

const MAX_FIELDS = 80;

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

    const { profile, fields } = req.body || {};
    if (!profile || typeof profile !== "object") {
      res.status(400).json({ error: "Missing resume profile." });
      return;
    }
    if (!Array.isArray(fields) || fields.length === 0) {
      res.status(400).json({ error: "Missing form fields." });
      return;
    }
    if (fields.length > MAX_FIELDS) {
      res.status(400).json({ error: `Too many fields (max ${MAX_FIELDS}).` });
      return;
    }

    const mapping = await matchFormFields({ profile, fields });
    res.status(200).json({ mapping });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
};
