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

// Express middleware factory — expects req.guild to already be set (i.e.
// mounted after requireGuildAccess). 402 (Payment Required) rather than 403
// so the frontend can tell "wrong plan" apart from "not authorized" and
// show an upgrade prompt instead of an access-denied message.
function requireFeature(feature) {
  return async (req, res, next) => {
    if (await hasFeature(req.guild, feature)) return next();
    res.status(402).json({ error: "plan_feature_unavailable", message: `Upgrade your plan to use ${feature}` });
  };
}

module.exports = { getPlan, canCreateDepartment, hasFeature, requireFeature };
