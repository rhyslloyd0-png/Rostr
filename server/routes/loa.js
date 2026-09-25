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

async function loadGuildAndDept(guildIdOrSlug, deptIdOrSlug) {
  const { rows: guildRows } = await pool.query("SELECT * FROM guilds WHERE id = $1 OR slug = $1", [guildIdOrSlug]);
  if (!guildRows.length) return {};
  const guild = guildRows[0];
  if (!(await hasFeature(guild, "loa"))) return { guild };

  const { rows: deptRows } = await pool.query(
    "SELECT * FROM departments WHERE (id::text = $1 OR slug = $1) AND guild_id = $2",
    [deptIdOrSlug, guild.id]
  );
  return { guild, department: deptRows[0] };
}

router.get("/:guildId/:deptId", async (req, res) => {
  const { guild, department } = await loadGuildAndDept(req.params.guildId, req.params.deptId);
  if (!guild) return res.status(404).json({ error: "Server not found" });
  if (!department) return res.status(404).json({ error: "Department not found or leave requests aren't enabled" });
  res.json({ department: { id: department.id, slug: department.slug, name: department.name } });
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

// Everyone else's leave in the department — lets staff see who's off without
// exposing the full admin review queue (pending/denied requests some other
// member never acted on aren't anyone else's business).
router.get("/:guildId/:deptId/department", async (req, res) => {
  const { guild, department } = await loadGuildAndDept(req.params.guildId, req.params.deptId);
  if (!guild) return res.status(404).json({ error: "Server not found" });
  if (!department) return res.status(404).json({ error: "Department not found or leave requests aren't enabled" });

  const { rows } = await pool.query(
    `SELECT * FROM loa_requests WHERE department_id = $1 AND user_id != $2 AND status IN ('approved', 'cancelled')
     ORDER BY start_date DESC LIMIT 50`,
    [department.id, req.user.id]
  );
  res.json({ requests: rows });
});

router.post("/:guildId/:deptId/:requestId/cancel", async (req, res) => {
  const { guild, department } = await loadGuildAndDept(req.params.guildId, req.params.deptId);
  if (!guild) return res.status(404).json({ error: "Server not found" });
  if (!department) return res.status(404).json({ error: "Department not found or leave requests aren't enabled" });

  const member = await getGuildMember(guild.id, req.user.id);
  const displayName = member?.nick || req.user.username;

  const { rows } = await pool.query(
    `UPDATE loa_requests SET status = 'cancelled', cancelled_by = $1
     WHERE id = $2 AND department_id = $3 AND user_id = $4 AND status != 'cancelled' RETURNING *`,
    [displayName, req.params.requestId, department.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Request not found" });
  res.json({ request: rows[0] });
});

module.exports = router;
