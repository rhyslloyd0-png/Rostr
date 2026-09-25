// Three access tiers for a single department, each a superset of the next,
// checked live against Discord so a role grant/revoke takes effect
// immediately with no separate sync step:
//
//   requireDepartmentMember — read access: owner, guild admin, or anyone
//     holding the department's admin/manager/access/staff role. Used for
//     viewing the roster and the SOP library.
//
//   requireDepartmentManage — operational access: owner, guild admin, or
//     the department's own admin/manager role. Can assign/vacate roster
//     posts, sync roles, and review applications/leave — but not touch the
//     department's structure.
//
//   requireDepartmentAdmin — structural access: owner, guild admin, or the
//     department's own admin role (not manager). Can rename the department,
//     change its role mapping, edit application questions, and manage SOP
//     uploads.
//
// Mirrors Midnight Roster's admin/manager split (see its server.js comments
// on requireDeptManage) but per-department instead of hardcoded per env var.
const pool = require("../db/pool");
const { getGuildMember } = require("../discord/api");

async function loadGuildAndDepartment(req, res) {
  const { guildId, deptId } = req.params;
  const { rows: guildRows } = await pool.query("SELECT * FROM guilds WHERE id = $1 OR slug = $1", [guildId]);
  if (!guildRows.length) {
    res.status(404).json({ error: "Server not found" });
    return null;
  }
  const guild = guildRows[0];
  const { rows: deptRows } = await pool.query(
    "SELECT * FROM departments WHERE (id::text = $1 OR slug = $1) AND guild_id = $2",
    [deptId, guild.id]
  );
  if (!deptRows.length) {
    res.status(404).json({ error: "Department not found" });
    return null;
  }
  return { guild, department: deptRows[0] };
}

function makeGuard(pickAllowedRoleIds) {
  return async function guard(req, res, next) {
    const loaded = await loadGuildAndDepartment(req, res);
    if (!loaded) return;
    const { guild, department } = loaded;

    if (guild.owner_discord_id === req.user.id) {
      req.guild = guild;
      req.department = department;
      req.isGuildOwner = true;
      return next();
    }

    const { rows: adminRoles } = await pool.query(
      "SELECT discord_role_id FROM guild_admins WHERE guild_id = $1",
      [guild.id]
    );
    const member = await getGuildMember(guild.id, req.user.id);
    const memberRoleIds = new Set(member?.roles || []);

    const isGuildAdmin = adminRoles.some(r => memberRoleIds.has(r.discord_role_id));
    const allowedRoleIds = pickAllowedRoleIds(department).filter(Boolean);
    const isDeptRole = allowedRoleIds.some(id => memberRoleIds.has(id));

    if (!isGuildAdmin && !isDeptRole) {
      return res.status(403).json({ error: "Not authorized for this department" });
    }

    req.guild = guild;
    req.department = department;
    req.isGuildOwner = false;
    next();
  };
}

const requireDepartmentMember = makeGuard(d => [
  d.access_role_id, d.staff_role_id, ...(d.admin_role_ids || []), ...(d.manager_role_ids || []),
]);

const requireDepartmentManage = makeGuard(d => [
  ...(d.admin_role_ids || []), ...(d.manager_role_ids || []),
]);

const requireDepartmentAdmin = makeGuard(d => [
  ...(d.admin_role_ids || []),
]);

// For the frontend to know which panels to show — call after
// requireDepartmentMember has already set req.guild/req.department.
async function computeTier(req) {
  if (req.isGuildOwner) return "admin";

  const { rows: adminRoles } = await pool.query(
    "SELECT discord_role_id FROM guild_admins WHERE guild_id = $1",
    [req.guild.id]
  );
  const member = await getGuildMember(req.guild.id, req.user.id);
  const memberRoleIds = new Set(member?.roles || []);

  if (adminRoles.some(r => memberRoleIds.has(r.discord_role_id))) return "admin";
  if ((req.department.admin_role_ids || []).some(id => memberRoleIds.has(id))) return "admin";
  if ((req.department.manager_role_ids || []).some(id => memberRoleIds.has(id))) return "manage";
  return "member";
}

module.exports = { requireDepartmentMember, requireDepartmentManage, requireDepartmentAdmin, computeTier };
