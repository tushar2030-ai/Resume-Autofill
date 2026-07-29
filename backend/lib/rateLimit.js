// lib/rateLimit.js
//
// Limits requests per IP address per day. Uses Upstash Redis (free tier) if
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set in the
// environment - this is STRONGLY recommended for a public deployment,
// since Vercel serverless functions are stateless and an in-memory
// counter resets on every cold start (i.e. it does NOT reliably stop
// abuse on its own). Set those two env vars from a free Upstash database
// (https://upstash.com) to get real, persistent rate limiting.
//
// Without Upstash configured, this falls back to a best-effort in-memory
// counter that only works within a single warm function instance - fine
// for light personal testing, NOT sufficient protection for a public launch.

const DAILY_LIMIT = parseInt(process.env.DAILY_LIMIT_PER_IP || "30", 10);

const memoryStore = new Map(); // key -> { count, resetAt }

function todayKey(ip) {
  const day = new Date().toISOString().slice(0, 10);
  return `ratelimit:${ip}:${day}`;
}

async function checkRateLimitUpstash(ip) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const key = todayKey(ip);

  const incrResp = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const incrData = await incrResp.json();
  const count = incrData.result;

  if (count === 1) {
    // first request today for this IP - set expiry to 24h
    await fetch(`${url}/expire/${encodeURIComponent(key)}/86400`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
  return count <= DAILY_LIMIT;
}

function checkRateLimitMemory(ip) {
  const key = todayKey(ip);
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= DAILY_LIMIT;
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

async function checkRateLimit(req) {
  const ip = getClientIp(req);
  const hasUpstash = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
  const allowed = hasUpstash ? await checkRateLimitUpstash(ip) : checkRateLimitMemory(ip);
  return { allowed, ip, persistent: !!hasUpstash };
}

module.exports = { checkRateLimit, DAILY_LIMIT };
