// Wraps every outgoing call to Discord's API behind a token-bucket limiter
// hard-capped at 40 requests/second — Discord's own global limit for a bot
// token is 50/sec, so 40 leaves a safety buffer — and retries automatically
// on a 429 by waiting exactly as long as Discord's own `retry_after` says
// to, instead of failing outright. Ported from Midnight Roster's
// discord-api.js — RostR is REST-only (OAuth exchange, guild/role/member
// lookups, role/nickname writes), it doesn't hold a gateway connection.

const MAX_REQUESTS_PER_SECOND = 40;
const REFILL_INTERVAL_MS = 1000 / MAX_REQUESTS_PER_SECOND;

let tokens = MAX_REQUESTS_PER_SECOND;
let lastRefillAt = Date.now();
const waiters = [];

function refill() {
  const now = Date.now();
  const earned = Math.floor((now - lastRefillAt) / REFILL_INTERVAL_MS);
  if (earned <= 0) return;
  tokens = Math.min(MAX_REQUESTS_PER_SECOND, tokens + earned);
  lastRefillAt += earned * REFILL_INTERVAL_MS;
  while (tokens > 0 && waiters.length) {
    tokens -= 1;
    waiters.shift()();
  }
}
setInterval(refill, REFILL_INTERVAL_MS).unref();

function acquireToken() {
  refill();
  if (tokens > 0) {
    tokens -= 1;
    return Promise.resolve();
  }
  return new Promise(resolve => waiters.push(resolve));
}

async function discordFetch(url, options = {}, retriesLeft = 3) {
  await acquireToken();
  const resp = await fetch(url, options);
  if (resp.status === 429 && retriesLeft > 0) {
    let retryAfterMs = 1000;
    try {
      const body = await resp.clone().json();
      if (typeof body.retry_after === "number") retryAfterMs = Math.ceil(body.retry_after * 1000);
    } catch {
      const header = resp.headers.get("retry-after");
      if (header) retryAfterMs = Math.ceil(Number(header) * 1000);
    }
    await new Promise(r => setTimeout(r, retryAfterMs));
    return discordFetch(url, options, retriesLeft - 1);
  }
  return resp;
}

module.exports = { discordFetch };
