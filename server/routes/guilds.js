const express = require("express");
const pool = require("../db/pool");
const { attachSession, requireAuth } = require("../middleware/session");
const { requireGuildAccess } = require("../middleware/guildAccess");
const { getPlan } = require("../config/plans");
const { getGuildRoles, getGuildChannels, searchGuildMembers } = require("../discord/api");

const router = express.Router();
router.use(attachSession, requireAuth);

// Guilds this user owns. (Guilds they administer via a designated role but
// don't own aren't listed here yet — they can still open one directly by
// URL, since requireGuildAccess checks role membership independently. A
// full "all guilds I can access" list needs a live role check per guild,
// deferred until that becomes a real usability problem.)
router.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM guilds WHERE owner_discord_id = $1 ORDER BY name", [req.user.id]);
  res.json({ guilds: rows });
});

router.get("/:guildId", requireGuildAccess, async (req, res) => {
  const plan = await getPlan(req.guild.plan);
  const { rows: deptRows } = await pool.query("SELECT COUNT(*) FROM departments WHERE guild_id = $1", [req.guild.id]);
  res.json({
    guild: req.guild,
    isOwner: req.isGuildOwner,
    plan,
    departmentCount: Number(deptRows[0].count),
  });
});

// Live role list from Discord, used by the setup wizard / department admin
// screen's role pickers — never cached locally so a role rename/delete in
// Discord shows up immediately.
router.get("/:guildId/roles", requireGuildAccess, async (req, res) => {
  const roles = await getGuildRoles(req.guild.id);
  res.json({ roles: roles.filter(r => r.name !== "@everyone").sort((a, b) => b.position - a.position) });
});

router.get("/:guildId/channels", requireGuildAccess, async (req, res) => {
  const channels = await getGuildChannels(req.guild.id);
  res.json({ channels: channels.filter(c => c.type === 0) }); // text channels only
});

router.get("/:guildId/members/search", requireGuildAccess, async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ members: [] });
  const members = await searchGuildMembers(req.guild.id, q);
  res.json({
    members: members.map(m => ({
      userId: m.user.id,
      username: m.user.username,
      displayName: m.nick || m.user.global_name || m.user.username,
      avatar: m.user.avatar,
    })),
  });
});

router.get("/:guildId/admins", requireGuildAccess, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT discord_role_id, discord_role_name FROM guild_admins WHERE guild_id = $1",
    [req.guild.id]
  );
  res.json({ admins: rows });
});

// Only the owner can grant other roles guild-management access.
router.put("/:guildId/admins", requireGuildAccess, async (req, res) => {
  if (!req.isGuildOwner) return res.status(403).json({ error: "Only the server owner can change this" });
  const { roles } = req.body; // [{ discordRoleId, discordRoleName }]
  if (!Array.isArray(roles)) return res.status(400).json({ error: "roles must be an array" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM guild_admins WHERE guild_id = $1", [req.guild.id]);
    for (const r of roles) {
      await client.query(
        "INSERT INTO guild_admins (guild_id, discord_role_id, discord_role_name) VALUES ($1, $2, $3)",
        [req.guild.id, r.discordRoleId, r.discordRoleName]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  res.json({ ok: true });
});

module.exports = router;
