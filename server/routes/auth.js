const express = require("express");
const crypto = require("crypto");
const pool = require("../db/pool");
const oauth = require("../discord/oauth");
const { createSession, setSessionCookie, clearSessionCookie, attachSession, requireAuth } = require("../middleware/session");
const { uniqueGuildSlug } = require("../db/slug");

const router = express.Router();
const WEB_BASE_URL = process.env.WEB_BASE_URL;

// OAuth state, persisted in Postgres — see migrations/0002_oauth_states.sql
// for why this isn't just an in-memory Map.
async function issueState(returnTo) {
  const state = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await pool.query(
    "INSERT INTO oauth_states (state, return_to, expires_at) VALUES ($1, $2, $3)",
    [state, returnTo, expiresAt]
  );
  return state;
}
async function consumeState(state) {
  const { rows } = await pool.query(
    "DELETE FROM oauth_states WHERE state = $1 AND expires_at > now() RETURNING return_to",
    [state]
  );
  return rows.length ? { returnTo: rows[0].return_to } : null;
}

// Only ever redirect back to a path on our own site — a returnTo taken
// straight from the query string would otherwise be an open redirect.
function safeReturnTo(returnTo, fallback) {
  if (typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//")) return returnTo;
  return fallback;
}

// GET /auth/discord/login — kicks off the combined "add bot + log in" flow
// (default), or a plain identify-only login for applicants when
// ?mode=identify&returnTo=/some/path is given (see discord/oauth.js).
router.get("/discord/login", async (req, res) => {
  const mode = req.query.mode === "identify" ? "identify" : "bot";
  const returnTo = safeReturnTo(req.query.returnTo, "/dashboard");
  const state = await issueState(returnTo);
  res.redirect(oauth.buildAuthorizeUrl(state, mode));
});

// GET /auth/discord/callback
router.get("/discord/callback", async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect(`${WEB_BASE_URL}/?error=${encodeURIComponent(error)}`);
  const stateEntry = state && await consumeState(state);
  if (!code || !stateEntry) {
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
      // Only a brand-new guild gets a freshly generated slug — ON CONFLICT
      // leaves the existing slug alone so a later server rename doesn't
      // change (and break) an already-bookmarked URL.
      const { rows: existing } = await pool.query("SELECT slug FROM guilds WHERE id = $1", [g.id]);
      const slug = existing.length ? existing[0].slug : await uniqueGuildSlug(pool, g.name);

      await pool.query(
        `INSERT INTO guilds (id, name, icon, owner_discord_id, slug)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon`,
        [g.id, g.name, g.icon, discordUser.id, slug]
      );
      return res.redirect(`${WEB_BASE_URL}/dashboard/${slug}/setup`);
    }

    return res.redirect(`${WEB_BASE_URL}${stateEntry.returnTo}`);
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
