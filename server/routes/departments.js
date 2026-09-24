const express = require("express");
const pool = require("../db/pool");
const { attachSession, requireAuth } = require("../middleware/session");
const { requireGuildAccess } = require("../middleware/guildAccess");
const { canCreateDepartment, requireFeature } = require("../config/plans");
const { addMemberRole, removeMemberRole } = require("../discord/api");

const router = express.Router({ mergeParams: true });
router.use(attachSession, requireAuth, requireGuildAccess);

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM departments WHERE guild_id = $1 ORDER BY position, created_at",
    [req.guild.id]
  );
  res.json({ departments: rows });
});

router.post("/", async (req, res) => {
  const allowed = await canCreateDepartment(req.guild);
  if (!allowed) {
    return res.status(402).json({ error: "plan_limit_reached", message: "Upgrade your plan to add another department" });
  }

  const { name, accessRoleId, staffRoleId } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const { rows } = await pool.query(
    `INSERT INTO departments (guild_id, name, access_role_id, staff_role_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.guild.id, name, accessRoleId || null, staffRoleId || null]
  );
  res.status(201).json({ department: rows[0] });
});

router.get("/:deptId", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM departments WHERE id = $1 AND guild_id = $2",
    [req.params.deptId, req.guild.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Department not found" });
  res.json({ department: rows[0] });
});

const EDITABLE_FIELDS = [
  "name", "access_role_id", "admin_role_ids", "manager_role_ids",
  "staff_role_id", "applicant_role_id", "loa_role_id", "applications_channel_id", "position",
];

router.patch("/:deptId", async (req, res) => {
  const updates = Object.keys(req.body).filter(k => EDITABLE_FIELDS.includes(k));
  if (!updates.length) return res.status(400).json({ error: "No editable fields provided" });

  const setClause = updates.map((field, i) => `${field} = $${i + 3}`).join(", ");
  const values = updates.map(f => req.body[f]);
  const { rows } = await pool.query(
    `UPDATE departments SET ${setClause} WHERE id = $1 AND guild_id = $2 RETURNING *`,
    [req.params.deptId, req.guild.id, ...values]
  );
  if (!rows.length) return res.status(404).json({ error: "Department not found" });
  res.json({ department: rows[0] });
});

router.delete("/:deptId", async (req, res) => {
  const { rowCount } = await pool.query(
    "DELETE FROM departments WHERE id = $1 AND guild_id = $2",
    [req.params.deptId, req.guild.id]
  );
  if (!rowCount) return res.status(404).json({ error: "Department not found" });
  res.status(204).end();
});

// Roster/questions/role-map JSON blobs — GET returns {} if unset yet.
router.get("/:deptId/data/:key", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT dd.value FROM department_data dd
     JOIN departments d ON d.id = dd.department_id
     WHERE dd.department_id = $1 AND d.guild_id = $2 AND dd.data_key = $3`,
    [req.params.deptId, req.guild.id, req.params.key]
  );
  res.json({ value: rows.length ? rows[0].value : {} });
});

router.put("/:deptId/data/:key", async (req, res) => {
  const { rows: deptRows } = await pool.query(
    "SELECT id FROM departments WHERE id = $1 AND guild_id = $2",
    [req.params.deptId, req.guild.id]
  );
  if (!deptRows.length) return res.status(404).json({ error: "Department not found" });

  await pool.query(
    `INSERT INTO department_data (department_id, data_key, value)
     VALUES ($1, $2, $3)
     ON CONFLICT (department_id, data_key) DO UPDATE SET value = EXCLUDED.value`,
    [req.params.deptId, req.params.key, JSON.stringify(req.body.value ?? {})]
  );
  res.json({ ok: true });
});

// Applies this department's staff role to every roster slot's assigned
// member — one-way (grant only, no removal yet) since detecting who *lost*
// a roster slot would mean diffing against Discord's full member/role list,
// not just the roster JSON; safe to run repeatedly (PUT-style role add is
// idempotent).
router.post("/:deptId/roster/sync", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM departments WHERE id = $1 AND guild_id = $2",
    [req.params.deptId, req.guild.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Department not found" });
  const department = rows[0];
  if (!department.staff_role_id) {
    return res.status(400).json({ error: "This department has no staff role configured yet" });
  }

  const { rows: dataRows } = await pool.query(
    "SELECT value FROM department_data WHERE department_id = $1 AND data_key = 'roster'",
    [department.id]
  );
  const slots = dataRows.length ? (dataRows[0].value.slots || []) : [];
  const assignedUserIds = [...new Set(slots.filter(s => s.userId).map(s => s.userId))];

  const results = await Promise.all(
    assignedUserIds.map(async userId => ({
      userId,
      ok: await addMemberRole(req.guild.id, userId, department.staff_role_id),
    }))
  );

  res.json({
    synced: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).map(r => r.userId),
  });
});

// ---- Applications (admin side: review queue) ----
// The applicant-facing submit/status endpoints live in routes/apply.js,
// reachable by any logged-in Discord user, not just guild admins.

router.get("/:deptId/applications", requireFeature("applications"), async (req, res) => {
  const { rows: deptRows } = await pool.query(
    "SELECT id FROM departments WHERE id = $1 AND guild_id = $2",
    [req.params.deptId, req.guild.id]
  );
  if (!deptRows.length) return res.status(404).json({ error: "Department not found" });

  const status = req.query.status;
  const { rows } = await pool.query(
    status
      ? "SELECT * FROM applications WHERE department_id = $1 AND status = $2 ORDER BY submitted_at DESC"
      : "SELECT * FROM applications WHERE department_id = $1 ORDER BY submitted_at DESC",
    status ? [req.params.deptId, status] : [req.params.deptId]
  );
  res.json({ applications: rows });
});

router.patch("/:deptId/applications/:appId", requireFeature("applications"), async (req, res) => {
  const { status, feedback } = req.body;
  if (!["approved", "denied", "pending"].includes(status)) {
    return res.status(400).json({ error: "status must be approved, denied, or pending" });
  }

  const { rows: deptRows } = await pool.query(
    "SELECT * FROM departments WHERE id = $1 AND guild_id = $2",
    [req.params.deptId, req.guild.id]
  );
  if (!deptRows.length) return res.status(404).json({ error: "Department not found" });
  const department = deptRows[0];

  const { rows } = await pool.query(
    `UPDATE applications SET status = $1, feedback = $2
     WHERE id = $3 AND department_id = $4 RETURNING *`,
    [status, feedback || null, req.params.appId, req.params.deptId]
  );
  if (!rows.length) return res.status(404).json({ error: "Application not found" });
  const application = rows[0];

  // Best-effort role swap — a failed Discord call (member left, missing
  // permission) shouldn't roll back the decision itself, just the role move.
  if (status === "approved") {
    if (department.staff_role_id) await addMemberRole(req.guild.id, application.user_id, department.staff_role_id);
    if (department.applicant_role_id) await removeMemberRole(req.guild.id, application.user_id, department.applicant_role_id);
  } else if (status === "denied" && department.applicant_role_id) {
    await removeMemberRole(req.guild.id, application.user_id, department.applicant_role_id);
  }

  res.json({ application });
});

module.exports = router;
