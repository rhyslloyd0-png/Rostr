// Applicant-facing routes — any logged-in Discord user, not just guild
// admins, reachable at /apply/:guildId/... (e.g. linked from the guild's
// own Discord server via an announcement/channel topic pointing here).
const express = require("express");
const pool = require("../db/pool");
const { attachSession, requireAuth } = require("../middleware/session");
const { hasFeature } = require("../config/plans");
const { addMemberRole, getGuildMember } = require("../discord/api");

const router = express.Router();
router.use(attachSession, requireAuth);

async function loadGuildAndDept(guildIdOrSlug, deptIdOrSlug) {
  const { rows: guildRows } = await pool.query("SELECT * FROM guilds WHERE id = $1 OR slug = $1", [guildIdOrSlug]);
  if (!guildRows.length) return {};
  const guild = guildRows[0];
  if (!(await hasFeature(guild, "applications"))) return { guild };

  const { rows: deptRows } = await pool.query(
    "SELECT * FROM departments WHERE (id::text = $1 OR slug = $1) AND guild_id = $2",
    [deptIdOrSlug, guild.id]
  );
  return { guild, department: deptRows[0] };
}

// Departments in this guild currently accepting applications.
router.get("/:guildId", async (req, res) => {
  const { rows: guildRows } = await pool.query("SELECT * FROM guilds WHERE id = $1 OR slug = $1", [req.params.guildId]);
  if (!guildRows.length) return res.status(404).json({ error: "Server not found" });
  const guild = guildRows[0];
  if (!(await hasFeature(guild, "applications"))) {
    return res.json({ guildName: guild.name, departments: [] });
  }
  const { rows } = await pool.query(
    "SELECT id, slug, name FROM departments WHERE guild_id = $1 ORDER BY position, created_at",
    [guild.id]
  );
  res.json({ guildName: guild.name, departments: rows });
});

router.get("/:guildId/:deptId", async (req, res) => {
  const { guild, department } = await loadGuildAndDept(req.params.guildId, req.params.deptId);
  if (!guild) return res.status(404).json({ error: "Server not found" });
  if (!department) return res.status(404).json({ error: "Department not found or not accepting applications" });

  const { rows } = await pool.query(
    "SELECT value FROM department_data WHERE department_id = $1 AND data_key = 'questions'",
    [department.id]
  );
  const questions = rows.length ? (rows[0].value.fields || []) : [];
  res.json({ department: { id: department.id, slug: department.slug, name: department.name }, questions });
});

router.post("/:guildId/:deptId", async (req, res) => {
  const { guild, department } = await loadGuildAndDept(req.params.guildId, req.params.deptId);
  if (!guild) return res.status(404).json({ error: "Server not found" });
  if (!department) return res.status(404).json({ error: "Department not found or not accepting applications" });

  const { answers } = req.body;
  if (!answers || typeof answers !== "object") return res.status(400).json({ error: "answers is required" });

  const { rows: existing } = await pool.query(
    "SELECT id FROM applications WHERE department_id = $1 AND user_id = $2 AND status = 'pending'",
    [department.id, req.user.id]
  );
  if (existing.length) return res.status(409).json({ error: "You already have a pending application for this department" });

  const member = await getGuildMember(guild.id, req.user.id);
  const displayName = member?.nick || req.user.username;

  const { rows } = await pool.query(
    `INSERT INTO applications (department_id, user_id, display_name, answers)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [department.id, req.user.id, displayName, JSON.stringify(answers)]
  );

  if (department.applicant_role_id) {
    await addMemberRole(guild.id, req.user.id, department.applicant_role_id);
  }

  res.status(201).json({ application: rows[0] });
});

// This user's own application history for a department — lets an applicant
// check where they stand without needing admin access.
router.get("/:guildId/:deptId/status", async (req, res) => {
  const { guild, department } = await loadGuildAndDept(req.params.guildId, req.params.deptId);
  if (!guild) return res.status(404).json({ error: "Server not found" });
  if (!department) return res.status(404).json({ error: "Department not found or not accepting applications" });

  const { rows } = await pool.query(
    "SELECT * FROM applications WHERE department_id = $1 AND user_id = $2 ORDER BY submitted_at DESC",
    [department.id, req.user.id]
  );
  res.json({ applications: rows });
});

module.exports = router;
