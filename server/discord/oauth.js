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

// Manage Roles + Manage Nicknames (role/nickname sync) + View Channels +
// Send Messages (posting to an applications channel later).
const BOT_PERMISSIONS = "268435488";

function buildAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "bot identify guilds",
    permissions: BOT_PERMISSIONS,
    state,
  });
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
