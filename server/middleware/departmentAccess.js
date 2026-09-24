// Authorizes a logged-in Discord user against a single department for
// staff-facing (not guild-admin) views — the SOP library, currently. Access
// is granted to the guild owner, anyone holding one of the department's
// admin/manager roles, or anyone holding its access/staff role — checked
// live against Discord so a role grant/revoke takes effect immediately.
const pool = require("../db/pool");
const { hasFeature } = require("../config/plans");
const { getGuildMember } = require("../discord/api");

async function requireDepartmentMember(req, res, next) {
  const { guildId, deptId } = req.params;

  const { rows: guildRows } = await pool.query("SELECT * FROM guilds WHERE id = $1", [guildId]);
  if (!guildRows.length) return res.status(404).json({ error: "Server not found" });
  const guild = guildRows[0];

  if (!(await hasFeature(guild, "sop"))) {
    return res.status(404).json({ error: "Department not found or this feature isn't enabled" });
  }

  const { rows: deptRows } = await pool.query(
    "SELECT * FROM departments WHERE id = $1 AND guild_id = $2",
    [deptId, guildId]
  );
  if (!deptRows.length) return res.status(404).json({ error: "Department not found" });
  const department = deptRows[0];

  if (guild.owner_discord_id === req.user.id) {
    req.guild = guild;
    req.department = department;
    return next();
  }

  const member = await getGuildMember(guildId, req.user.id);
  const memberRoleIds = new Set(member?.roles || []);
  const allowedRoleIds = [
    department.access_role_id,
    department.staff_role_id,
    ...(department.admin_role_ids || []),
    ...(department.manager_role_ids || []),
  ].filter(Boolean);

  if (!allowedRoleIds.some(id => memberRoleIds.has(id))) {
    return res.status(403).json({ error: "Not authorized for this department" });
  }

  req.guild = guild;
  req.department = department;
  next();
}

module.exports = { requireDepartmentMember };
