const express = require("express");
const crypto = require("crypto");
const pool = require("../db/pool");
const oauth = require("../discord/oauth");
const { createSession, setSessionCookie, clearSessionCookie, attachSession, requireAuth } = require("../middleware/session");

const router = express.Router();
const WEB_BASE_URL = process.env.WEB_BASE_URL;

// In-memory OAuth state store — short-lived (a few minutes at most, for the
// length of the redirect round trip), so no need for a database table.
const pendingStates = new Map(); // state -> expiresAt
function issueState() {
  const state = crypto.randomBytes(16).toString("hex");
  pendingStates.set(state, Date.now() + 5 * 60 * 1000);
  return state;
}
function consumeState(state) {
  const expiresAt = pendingStates.get(state);
  pendingStates.delete(state);
  return !!expiresAt && expiresAt > Date.now();
}

// GET /auth/discord/login — kicks off the combined "add bot + log in" flow.
router.get("/discord/login", (req, res) => {
  const state = issueState();
  res.redirect(oauth.buildAuthorizeUrl(state));
});

// GET /auth/discord/callback
router.get("/discord/callback", async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect(`${WEB_BASE_URL}/?error=${encodeURIComponent(error)}`);
  if (!code || !state || !consumeState(state)) {
    return res.redirect(`${WEB_BASE_URL}/?error=invalid_state`);
  }

  try {
    const token = await oauth.exchangeCode(code);
    const discordUser = await oauth.getUser(token.access_token);

    const session = await createSession(discordUser);
    setSessionCookie(res, session.token, session.expiresAt);

    // `token.guild` is present because the authorize URL requested the
    // `bot` scope — Discord adds the bot to the guild the user picked on
    // the consent screen and hands its info back right here.
    if (token.guild) {
      const g = token.guild;
      await pool.query(
        `INSERT INTO guilds (id, name, icon, owner_discord_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon`,
        [g.id, g.name, g.icon, discordUser.id]
      );
      return res.redirect(`${WEB_BASE_URL}/dashboard/${g.id}/setup`);
    }

    return res.redirect(`${WEB_BASE_URL}/dashboard`);
  } catch (err) {
    console.error("OAuth callback failed:", err);
    return res.redirect(`${WEB_BASE_URL}/?error=oauth_failed`);
  }
});

router.get("/me", attachSession, requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post("/logout", attachSession, (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

module.exports = router;
