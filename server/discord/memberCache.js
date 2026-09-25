// Short-lived per-guild cache of the full member list. Every roster
// assignment triggers a sync, and each sync used to page through the whole
// member list from Discord — fine for a small server, slow for a large one.
// Role/nickname changes RostR makes itself are written back into the cache
// so it stays accurate between fetches; the TTL only has to cover changes
// made directly in Discord.
const { getAllGuildMembers } = require("./api");

const TTL_MS = 60 * 1000;
const cache = new Map(); // guildId -> { members, fetchedAt, pending }

async function getMembers(guildId) {
  const entry = cache.get(guildId);
  if (entry?.members && Date.now() - entry.fetchedAt < TTL_MS) return entry.members;
  // Collapse concurrent callers (e.g. rapid assign clicks) onto one fetch.
  if (entry?.pending) return entry.pending;

  const pending = getAllGuildMembers(guildId)
    .then(members => {
      cache.set(guildId, { members, fetchedAt: Date.now() });
      return members;
    })
    .catch(err => {
      cache.delete(guildId);
      throw err;
    });
  cache.set(guildId, { ...entry, pending });
  return pending;
}

function recordRoleChange(guildId, userId, roleId, action) {
  const member = cache.get(guildId)?.members?.find(m => m.user.id === userId);
  if (!member) return;
  member.roles = member.roles || [];
  if (action === "add" && !member.roles.includes(roleId)) member.roles.push(roleId);
  if (action === "remove") member.roles = member.roles.filter(r => r !== roleId);
}

function recordNickname(guildId, userId, nickname) {
  const member = cache.get(guildId)?.members?.find(m => m.user.id === userId);
  if (member) member.nick = nickname;
}

module.exports = { getMembers, recordRoleChange, recordNickname };
