// Self-service leave-of-absence requests — any logged-in Discord user
// (same identify-only login as routes/apply.js), reachable at
// /loa/:guildId/:deptId. Approving/denying is admin-only, in
// routes/departments.js; the LOA Discord role itself is granted/revoked by
// jobs/loaScheduler.js once a request's date window actually opens/closes.
const express = require("express");
const pool = require("../db/pool");
const { attachSession, requireAuth } = require("../middleware/session");
const { hasFeature } = require("../config/plans");
const { getGuildMember } = require("../discord/api");

const router = express.Router();
router.use(attachSession, requireAuth);

async function loadGuildAndDept(guildId, deptId) {
  const { rows: guildRows } = await pool.query("SELECT * FROM guilds WHERE id = $1", [guildId]);
  if (!guildRows.length) return {};
  const guild = guildRows[0];
  if (!(await hasFeature(guild, "loa"))) return { guild };

  const { rows: deptRows } = await pool.query(
    "SELECT * FROM departments WHERE id = $1 AND guild_id = $2",
    [deptId, guildId]
  );
  return { guild, department: deptRows[0] };
}

router.get("/:guildId/:deptId", async (req, res) => {
  const { guild, department } = await loadGuildAndDept(req.params.guildId, req.params.deptId);
  if (!guild) return res.status(404).json({ error: "Server not found" });
  if (!department) return res.status(404).json({ error: "Department not found or leave requests aren't enabled" });
  res.json({ department: { id: department.id, name: department.name } });
});

router.post("/:guildId/:deptId", async (req, res) => {
  const { guild, department } = await loadGuildAndDept(req.params.guildId, req.params.deptId);
  if (!guild) return res.status(404).json({ error: "Server not found" });
  if (!department) return res.status(404).json({ error: "Department not found or leave requests aren't enabled" });

  const { startDate, endDate, reason } = req.body;
  if (!startDate || !endDate) return res.status(400).json({ error: "startDate and endDate are required" });
  if (new Date(endDate) < new Date(startDate)) return res.status(400).json({ error: "endDate must be on or after startDate" });

  const member = await getGuildMember(guild.id, req.user.id);
  const displayName = member?.nick || req.user.username;

  const { rows } = await pool.query(
    `INSERT INTO loa_requests (department_id, user_id, display_name, start_date, end_date, reason)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [department.id, req.user.id, displayName, startDate, endDate, reason || ""]
  );
  res.status(201).json({ request: rows[0] });
});

router.get("/:guildId/:deptId/status", async (req, res) => {
  const { guild, department } = await loadGuildAndDept(req.params.guildId, req.params.deptId);
  if (!guild) return res.status(404).json({ error: "Server not found" });
  if (!department) return res.status(404).json({ error: "Department not found or leave requests aren't enabled" });

  const { rows } = await pool.query(
    "SELECT * FROM loa_requests WHERE department_id = $1 AND user_id = $2 ORDER BY start_date DESC",
    [department.id, req.user.id]
  );
  res.json({ requests: rows });
});

module.exports = router;
