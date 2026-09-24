const crypto = require("crypto");
const pool = require("../db/pool");

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const COOKIE_NAME = "rostr_session";

async function createSession(discordUser) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await pool.query(
    `INSERT INTO sessions (token, discord_user_id, discord_username, discord_avatar, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [token, discordUser.id, discordUser.username, discordUser.avatar, expiresAt]
  );
  return { token, expiresAt };
}

// Populates req.user when a valid session cookie is present; leaves it
// undefined otherwise. Routes that require login check req.user themselves
// (see requireAuth) so public routes can still read it optimistically.
async function attachSession(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();
  const { rows } = await pool.query(
    "SELECT * FROM sessions WHERE token = $1 AND expires_at > now()",
    [token]
  );
  if (rows.length) {
    req.user = {
      id: rows[0].discord_user_id,
      username: rows[0].discord_username,
      avatar: rows[0].discord_avatar,
    };
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Not logged in" });
  next();
}

// The web app proxies /api/* through to this API (see web/next.config.js),
// so every request the browser makes lands on the web app's own origin —
// this cookie is first-party from the browser's perspective even though a
// different service issues it. Plain Lax is correct and works everywhere,
// including browsers (Brave, Safari, Firefox) that block third-party
// cookies outright regardless of SameSite=None; Secure — which is what an
// earlier, direct-to-API-domain version of this cookie ran into.
const isSecureContext = (process.env.WEB_BASE_URL || "").startsWith("https");

function setSessionCookie(res, token, expiresAt) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecureContext,
    sameSite: "lax",
    expires: expiresAt,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    secure: isSecureContext,
    sameSite: "lax",
  });
}

module.exports = { createSession, attachSession, requireAuth, setSessionCookie, clearSessionCookie, COOKIE_NAME };
