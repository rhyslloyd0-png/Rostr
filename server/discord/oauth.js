// Discord OAuth2 for the combined "add bot + log in" flow: the consent
// screen requests `bot identify guilds` in one grant. When `bot` is in the
// scope, Discord adds the bot to whichever guild the user picks on that
// screen *and* the token exchange response includes a `guild` object for
// it — so login and bot-install happen in a single redirect round trip,
// no separate "select your server" step needed.

const API_BASE = "https://discord.com/api/v10";

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

const PERMISSION_BITS = {
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  EMBED_LINKS: 1n << 14n,
  MANAGE_NICKNAMES: 1n << 27n,
  MANAGE_ROLES: 1n << 28n,
};
const BOT_PERMISSIONS = Object.values(PERMISSION_BITS).reduce((a, b) => a | b, 0n).toString();

// mode "bot" (default) is the guild-owner flow described above — always
// shows Discord's "Add to server" picker, which is right for actually
// installing the bot but wrong for a plain re-login. mode "identify" is
// for applicants/staff who just need to prove who they are on Discord.
// mode "login" is for an already-onboarded person signing back into the
// dashboard: same `identify guilds` grant as "bot" (so the dashboard's
// server list still works) but without the `bot` scope, so Discord never
// shows the add-to-server step.
function buildAuthorizeUrl(state, mode = "bot") {
  const scope = mode === "identify" ? "identify" : mode === "login" ? "identify guilds" : "bot identify guilds";
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope,
    state,
  });
  if (mode === "bot") params.set("permissions", BOT_PERMISSIONS);
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

async function exchangeCode(code) {
  const resp = await fetch(`${API_BASE}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Discord token exchange failed (${resp.status}): ${text}`);
  }
  return resp.json(); // { access_token, guild: {id, name, icon, ...}, ... }
}

async function getUser(accessToken) {
  const resp = await fetch(`${API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) throw new Error(`Failed to fetch Discord user (${resp.status})`);
  return resp.json();
}

// Guilds the logged-in user belongs to, so the dashboard's guild switcher
// can be limited to servers they're actually in (cross-checked against
// `guilds` rows the bot already has RostR set up on).
async function getUserGuilds(accessToken) {
  const resp = await fetch(`${API_BASE}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) throw new Error(`Failed to fetch user guilds (${resp.status})`);
  return resp.json();
}

module.exports = { buildAuthorizeUrl, exchangeCode, getUser, getUserGuilds };
