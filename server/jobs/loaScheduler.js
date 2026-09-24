// Sweeps approved leave requests every few minutes and applies/removes each
// department's LOA Discord role as a request's date window opens or closes
// — nobody has to visit the site for a leave to actually start or end.
// Ported from Midnight Roster's activate/deactivate split (readLoaToActivate
// / readLoaToDeactivate in its db-store.js), rejoined here against
// `departments` for guild_id/loa_role_id instead of a single hardcoded guild.
const pool = require("../db/pool");
const { addMemberRole, removeMemberRole } = require("../discord/api");

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

async function activateDueLoa() {
  const { rows } = await pool.query(`
    SELECT l.*, d.guild_id, d.loa_role_id
    FROM loa_requests l
    JOIN departments d ON d.id = l.department_id
    WHERE l.status = 'approved' AND l.active = FALSE
      AND l.start_date <= CURRENT_DATE AND l.end_date >= CURRENT_DATE
      AND d.loa_role_id IS NOT NULL
  `);
  for (const loa of rows) {
    const ok = await addMemberRole(loa.guild_id, loa.user_id, loa.loa_role_id);
    if (ok) await pool.query("UPDATE loa_requests SET active = TRUE WHERE id = $1", [loa.id]);
  }
}

async function deactivateEndedLoa() {
  const { rows } = await pool.query(`
    SELECT l.*, d.guild_id, d.loa_role_id
    FROM loa_requests l
    JOIN departments d ON d.id = l.department_id
    WHERE l.active = TRUE
      AND (l.status <> 'approved' OR l.end_date < CURRENT_DATE OR l.start_date > CURRENT_DATE)
  `);
  for (const loa of rows) {
    if (loa.loa_role_id) await removeMemberRole(loa.guild_id, loa.user_id, loa.loa_role_id);
    await pool.query("UPDATE loa_requests SET active = FALSE WHERE id = $1", [loa.id]);
  }
}

async function sweep() {
  try {
    await activateDueLoa();
    await deactivateEndedLoa();
  } catch (err) {
    console.error("LOA scheduler sweep failed:", err);
  }
}

function startLoaScheduler() {
  sweep();
  const timer = setInterval(sweep, SWEEP_INTERVAL_MS);
  timer.unref();
  return timer;
}

module.exports = { startLoaScheduler };
