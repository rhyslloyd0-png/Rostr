// Bot-token REST calls, all funneled through the shared rate limiter.
const { discordFetch } = require("./rateLimiter");

const API_BASE = "https://discord.com/api/v10";
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

function botHeaders() {
  return { Authorization: `Bot ${BOT_TOKEN}` };
}

async function getGuild(guildId) {
  const resp = await discordFetch(`${API_BASE}/guilds/${guildId}`, { headers: botHeaders() });
  if (!resp.ok) return null;
  return resp.json();
}

async function getGuildRoles(guildId) {
  const resp = await discordFetch(`${API_BASE}/guilds/${guildId}/roles`, { headers: botHeaders() });
  if (!resp.ok) throw new Error(`Failed to fetch roles for guild ${guildId}: ${resp.status}`);
  return resp.json();
}

async function getGuildChannels(guildId) {
  const resp = await discordFetch(`${API_BASE}/guilds/${guildId}/channels`, { headers: botHeaders() });
  if (!resp.ok) throw new Error(`Failed to fetch channels for guild ${guildId}: ${resp.status}`);
  return resp.json();
}

async function getGuildMember(guildId, userId) {
  const resp = await discordFetch(`${API_BASE}/guilds/${guildId}/members/${userId}`, { headers: botHeaders() });
  if (!resp.ok) return null;
  return resp.json();
}

// Backs the roster editor's member picker so an admin assigns a real
// Discord member instead of typing a raw user ID. Requires the "Server
// Members Intent" toggle to be enabled on the bot in the Discord developer
// portal — the REST endpoint 403s without it, same as the gateway event.
async function searchGuildMembers(guildId, query, limit = 10) {
  const params = new URLSearchParams({ query, limit: String(limit) });
  const resp = await discordFetch(`${API_BASE}/guilds/${guildId}/members/search?${params}`, { headers: botHeaders() });
  if (!resp.ok) return [];
  return resp.json();
}

async function addMemberRole(guildId, userId, roleId) {
  const resp = await discordFetch(`${API_BASE}/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: "PUT",
    headers: botHeaders(),
  });
  return resp.ok || resp.status === 204;
}

async function removeMemberRole(guildId, userId, roleId) {
  const resp = await discordFetch(`${API_BASE}/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: "DELETE",
    headers: botHeaders(),
  });
  return resp.ok || resp.status === 204;
}

// Every member in the guild, paginated 1000 at a time (Discord's max per
// page) — needed for a real two-way role sync: to know a role should come
// *off* someone, you have to know who currently holds it, and there's no
// "list members with this role" endpoint, only "list all members." Same
// Server Members Intent requirement as searchGuildMembers.
async function getAllGuildMembers(guildId) {
  const members = [];
  let after = "0";
  for (;;) {
    const params = new URLSearchParams({ limit: "1000", after });
    const resp = await discordFetch(`${API_BASE}/guilds/${guildId}/members?${params}`, { headers: botHeaders() });
    if (!resp.ok) break;
    const page = await resp.json();
    members.push(...page);
    if (page.length < 1000) break;
    after = page[page.length - 1].user.id;
  }
  return members;
}

async function setMemberNickname(guildId, userId, nickname) {
  const resp = await discordFetch(`${API_BASE}/guilds/${guildId}/members/${userId}`, {
    method: "PATCH",
    headers: { ...botHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ nick: nickname }),
  });
  return resp.ok;
}

async function sendChannelMessage(channelId, payload) {
  const resp = await discordFetch(`${API_BASE}/channels/${channelId}/messages`, {
    method: "POST",
    headers: { ...botHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.message || `Failed to send message: ${resp.status}`);
  }
  return resp.json();
}

module.exports = {
  getGuild, getGuildRoles, getGuildChannels, getGuildMember, searchGuildMembers, getAllGuildMembers,
  addMemberRole, removeMemberRole, setMemberNickname, sendChannelMessage,
};
