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

async function setMemberNickname(guildId, userId, nickname) {
  const resp = await discordFetch(`${API_BASE}/guilds/${guildId}/members/${userId}`, {
    method: "PATCH",
    headers: { ...botHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ nick: nickname }),
  });
  return resp.ok;
}

module.exports = {
  getGuild, getGuildRoles, getGuildChannels, getGuildMember, searchGuildMembers,
  addMemberRole, removeMemberRole, setMemberNickname,
};
