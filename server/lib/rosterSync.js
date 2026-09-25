// Pure roster -> Discord diff logic, kept free of I/O so it can be tested
// directly (see lib/rosterSync.test.js).

function postsOf(sections) {
  return (sections || []).flatMap(s => (s.groups || []).flatMap(g => g.ranks || []));
}

function lastNameOf(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/);
  return parts[parts.length - 1] || "";
}

// Discord nickname convention (matches Midnight Roster): "<callsign> | <last name>".
function nicknameFor(post) {
  if (!post.userId || !post.callsign) return null;
  const suffix = post.nicknameOverride || lastNameOf(post.name);
  return `${post.callsign} | ${suffix}`.slice(0, 32);
}

// roleId -> Set(userId) that one department's roster says should hold it.
function desiredRoles(department, sections) {
  const desired = new Map();
  const want = (roleId, userId) => {
    if (!roleId || !userId) return;
    if (!desired.has(roleId)) desired.set(roleId, new Set());
    desired.get(roleId).add(userId);
  };
  for (const post of postsOf(sections)) {
    if (!post.userId) continue;
    want(department.staff_role_id, post.userId);
    for (const roleId of post.roleIds || []) want(roleId, post.userId);
  }
  return desired;
}

// Grants what this department wants, and revokes a role only from people
// no department in the guild wants holding it. Without the guild-wide
// check, two departments sharing a role (e.g. a common "Emergency
// Services" role) would strip each other's members on every sync.
//
// `ownDesired` is this department's desiredRoles(); `guildDesired` is the
// union across every department in the guild (including this one).
function computeRoleChanges(ownDesired, guildDesired, members) {
  const changes = [];
  for (const [roleId, wanted] of ownDesired) {
    const allowed = guildDesired.get(roleId) || wanted;
    const holders = members.filter(m => m.roles?.includes(roleId)).map(m => m.user.id);
    const holderSet = new Set(holders);
    for (const userId of wanted) {
      if (!holderSet.has(userId)) changes.push({ userId, roleId, action: "add" });
    }
    for (const userId of holders) {
      if (!allowed.has(userId)) changes.push({ userId, roleId, action: "remove" });
    }
  }
  return changes;
}

function mergeDesired(maps) {
  const merged = new Map();
  for (const map of maps) {
    for (const [roleId, users] of map) {
      if (!merged.has(roleId)) merged.set(roleId, new Set());
      for (const u of users) merged.get(roleId).add(u);
    }
  }
  return merged;
}

// Nicknames that actually need changing — skips members already on the
// right nickname (saves an API call per person per sync) and the server
// owner, whose nickname Discord never lets a bot change.
function computeNicknameChanges(sections, members, guildOwnerId) {
  const byId = new Map(members.map(m => [m.user.id, m]));
  const changes = [];
  for (const post of postsOf(sections)) {
    const nickname = nicknameFor(post);
    if (!nickname || post.userId === guildOwnerId) continue;
    const member = byId.get(post.userId);
    if (!member || member.nick === nickname) continue;
    changes.push({ userId: post.userId, nickname });
  }
  return changes;
}

module.exports = { postsOf, lastNameOf, nicknameFor, desiredRoles, computeRoleChanges, mergeDesired, computeNicknameChanges };
