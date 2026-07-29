// lib/cors.js
//
// For a real launch, replace "*" with your published extension's exact
// origin, e.g. "chrome-extension://abcdefghijklmnopabcdefghijklmnop"
// (you get this ID after publishing to the Chrome Web Store, or from
// chrome://extensions in developer mode). Restricting this is a real
// (if modest) layer of protection - it stops random websites from
// calling your API from a browser, though it does NOT stop someone
// scripting requests outside a browser context. Rate limiting is your
// main defense either way.
const ALLOWED_ORIGIN = process.env.ALLOWED_EXTENSION_ORIGIN || "*";

function applyCors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true; // caller should stop handling this request
  }
  return false;
}

module.exports = { applyCors };
