// Authorizes a logged-in user against a specific guild: the Discord owner
// always has access, otherwise they need one of the roles the owner
// designated in guild_admins (fetched live from Discord so a role grant/
// revoke in Discord takes effect immediately, no separate sync step).
const pool = require("../db/pool");
const { getGuildMember } = require("../discord/api");

async function requireGuildAccess(req, res, next) {
  const { guildId } = req.params;
  const { rows } = await pool.query("SELECT * FROM guilds WHERE id = $1", [guildId]);
  if (!rows.length) return res.status(404).json({ error: "Guild not found" });
  const guild = rows[0];

  if (guild.owner_discord_id === req.user.id) {
    req.guild = guild;
    req.isGuildOwner = true;
    return next();
  }

  const { rows: adminRoles } = await pool.query(
    "SELECT discord_role_id FROM guild_admins WHERE guild_id = $1",
    [guildId]
  );
  if (!adminRoles.length) return res.status(403).json({ error: "Not authorized for this guild" });

  const member = await getGuildMember(guildId, req.user.id);
  const memberRoleIds = new Set(member?.roles || []);
  const isAdmin = adminRoles.some(r => memberRoleIds.has(r.discord_role_id));
  if (!isAdmin) return res.status(403).json({ error: "Not authorized for this guild" });

  req.guild = guild;
  req.isGuildOwner = false;
  next();
}

module.exports = { requireGuildAccess };
