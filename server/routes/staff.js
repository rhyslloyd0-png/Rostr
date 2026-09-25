// Personalized per-department landing page for anyone with department
// access (not just admins/managers) — their current roster post, leave
// status, and quick links to the roster/SOP/leave pages. Reuses the same
// member-tier gate as the dashboard's roster view.
const express = require("express");
const pool = require("../db/pool");
const { attachSession, requireAuth } = require("../middleware/session");
const { requireDepartmentMember, computeTier } = require("../middleware/departmentAccess");
const { getPlan } = require("../config/plans");

const router = express.Router();
router.use(attachSession, requireAuth);

// Department names/colors for the nav switcher — not sensitive, so listed
// for any logged-in user regardless of which departments they personally
// have access to (matching each one still enforces its own tier).
router.get("/:guildId/departments", async (req, res) => {
  const { rows: guildRows } = await pool.query("SELECT id FROM guilds WHERE id = $1 OR slug = $1", [req.params.guildId]);
  if (!guildRows.length) return res.status(404).json({ error: "Server not found" });
  const { rows } = await pool.query(
    "SELECT slug, name, color FROM departments WHERE guild_id = $1 ORDER BY position, created_at",
    [guildRows[0].id]
  );
  res.json({ departments: rows });
});

router.get("/:guildId/:deptId", requireDepartmentMember, async (req, res) => {
  const tier = await computeTier(req);
  const plan = await getPlan(req.guild.plan);

  const { rows: rosterRows } = await pool.query(
    "SELECT value FROM department_data WHERE department_id = $1 AND data_key = 'roster'",
    [req.department.id]
  );
  const sections = rosterRows.length ? (rosterRows[0].value.sections || []) : [];

  let currentPost = null;
  for (const section of sections) {
    const rank = (section.ranks || []).find(r => r.userId === req.user.id);
    if (rank) {
      currentPost = { rank: rank.rank, section: section.name, callsign: rank.callsign || null };
      break;
    }
  }

  let loa = null;
  if (plan.features.loa) {
    const { rows } = await pool.query(
      `SELECT status, start_date, end_date, active FROM loa_requests
       WHERE department_id = $1 AND user_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [req.department.id, req.user.id]
    );
    if (rows.length) loa = rows[0];
  }

  res.json({
    user: req.user,
    guild: { id: req.guild.id, name: req.guild.name, icon: req.guild.icon },
    department: {
      id: req.department.id, slug: req.department.slug, name: req.department.name,
      color: req.department.color, hasBanner: !!req.department.banner_data,
    },
    tier,
    features: plan.features,
    currentPost,
    loa,
  });
});

module.exports = router;
