const pool = require("../db/pool");

async function getPlan(planKey) {
  const { rows } = await pool.query("SELECT * FROM plans WHERE key = $1", [planKey]);
  if (!rows.length) throw new Error(`Unknown plan: ${planKey}`);
  return rows[0];
}

async function canCreateDepartment(guild) {
  const plan = await getPlan(guild.plan);
  if (plan.max_departments === -1) return true;
  const { rows } = await pool.query("SELECT COUNT(*) FROM departments WHERE guild_id = $1", [guild.id]);
  return Number(rows[0].count) < plan.max_departments;
}

async function hasFeature(guild, feature) {
  const plan = await getPlan(guild.plan);
  return !!plan.features[feature];
}

module.exports = { getPlan, canCreateDepartment, hasFeature };
