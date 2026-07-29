# Resume AutoFill — Backend Proxy

Holds your Gemini API key server-side so it's never shipped inside the
published extension. The extension calls these two endpoints; your key
never leaves this server.

```
POST /api/parse-resume   { mode: "pdf"|"text", base64?, text? } -> { profile }
POST /api/fill-form      { profile, fields }                   -> { mapping }
```

## 1. Deploy to Vercel

```bash
npm install -g vercel   # if you don't have it
cd resume-autofill-backend
vercel login
vercel
```

Follow the prompts (link/create a project). Note the deployment URL it
gives you, e.g. `https://resume-autofill-api.vercel.app`.

## 2. Set your API key (server-side, secret)

```bash
vercel env add GEMINI_API_KEY
```
Paste your Gemini key when prompted, choose "Production" (and
"Preview"/"Development" if you want local testing too).

**Get a fresh key** at https://aistudio.google.com/apikey — don't reuse a
key that's ever been pasted anywhere public.

## 3. (Strongly recommended) Add real rate limiting

Without this, rate limiting only works in-memory per warm serverless
instance — not reliable protection for a public launch.

1. Create a free database at https://upstash.com (Redis, free tier)
2. Copy its REST URL and token
3. `vercel env add UPSTASH_REDIS_REST_URL`
4. `vercel env add UPSTASH_REDIS_REST_TOKEN`
5. Optionally set your own daily cap: `vercel env add DAILY_LIMIT_PER_IP` (default: 30/day per IP)

## 4. Redeploy after adding env vars

```bash
vercel --prod
```

## 5. Lock down CORS (do this before a real public launch)

By default any website could call your API from a browser. Once you've
published the extension and know its ID (from the Chrome Web Store
listing, or `chrome://extensions` in dev mode), set:

```bash
vercel env add ALLOWED_EXTENSION_ORIGIN
# value: chrome-extension://<your-extension-id>
```

## 6. Point the extension at your deployed URL

In the extension's `background.js`, set:
```js
const PROXY_URL = "https://your-deployment.vercel.app";
```
(See the extension's own README for the exact line to change.)

## Cost awareness

Every user's requests now bill to your Gemini account. The free tier has
daily limits across your *whole* project, not per-user — so the
`DAILY_LIMIT_PER_IP` cap here is what stands between "a few active users"
and "your shared free-tier quota gets exhausted by 10am." Monitor usage
in Google AI Studio and tighten the cap if needed. If you outgrow the
free tier, Gemini's paid tier is inexpensive per-request but not free.
