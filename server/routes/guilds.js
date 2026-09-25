const express = require("express");
const pool = require("../db/pool");
const { attachSession, requireAuth } = require("../middleware/session");
const { requireGuildAccess } = require("../middleware/guildAccess");
const { getPlan } = require("../config/plans");
const { getGuildRoles, getGuildChannels, searchGuildMembers } = require("../discord/api");
const { getMembers } = require("../discord/memberCache");
const { getUserGuilds } = require("../discord/oauth");

const ADMINISTRATOR = 0x8;

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

// Every Discord server this person owns or administers — live from
// Discord's users/@me/guilds, not just the ones already in our `guilds`
// table, so the dashboard can offer "Install RostR" on a server that
// hasn't got it yet instead of only ever showing servers we already know
// about. Requires the `guilds` OAuth scope, which the bot-install login
// mode requests but the identify-only mode doesn't — a session from that
// lighter flow just gets an empty list back with needsReauth so the
// frontend can prompt a real sign-in instead of silently showing nothing.
router.get("/discoverable", async (req, res) => {
  if (!req.discordAccessToken) {
    return res.json({ servers: [], needsReauth: true });
  }

  let discordGuilds;
  try {
    discordGuilds = await getUserGuilds(req.discordAccessToken);
  } catch (err) {
    return res.json({ servers: [], needsReauth: true });
  }

  const administered = discordGuilds.filter(g => g.owner || (BigInt(g.permissions) & BigInt(ADMINISTRATOR)) === BigInt(ADMINISTRATOR));
  const ids = administered.map(g => g.id);
  const { rows: installed } = ids.length
    ? await pool.query("SELECT id, slug, plan FROM guilds WHERE id = ANY($1)", [ids])
    : { rows: [] };
  const installedById = new Map(installed.map(g => [g.id, g]));

  res.json({
    servers: administered
      .map(g => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        owner: g.owner,
        installed: installedById.has(g.id),
        slug: installedById.get(g.id)?.slug || null,
        plan: installedById.get(g.id)?.plan || null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
});

// Every roster post this person currently holds, across every department
// in every guild RostR knows about — not just guilds they own. Scans
// department_data in application code rather than a JSONB path query
// since roster is a nested, evolving shape (section -> group -> post) that
// isn't worth hand-writing SQL against at RostR's current scale.
router.get("/my-rosters", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.id AS guild_id, g.name AS guild_name, g.slug AS guild_slug, g.icon AS guild_icon,
            d.name AS department_name, d.slug AS department_slug, dd.value AS roster
     FROM department_data dd
     JOIN departments d ON d.id = dd.department_id
     JOIN guilds g ON g.id = d.guild_id
     WHERE dd.data_key = 'roster'`
  );

  const rosters = [];
  for (const row of rows) {
    for (const section of row.roster?.sections || []) {
      for (const group of section.groups || []) {
        for (const post of group.ranks || []) {
          if (post.userId === req.user.id) {
            rosters.push({
              guildId: row.guild_id,
              guildName: row.guild_name,
              guildSlug: row.guild_slug,
              guildIcon: row.guild_icon,
              departmentName: row.department_name,
              departmentSlug: row.department_slug,
              rank: post.rank,
              callsign: post.callsign || null,
            });
          }
        }
      }
    }
  }
  res.json({ rosters });
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

// Full member list, loaded once by the roster editor's assign dropdown
// rather than searched per keystroke — mirrors Midnight Roster's picker,
// which filters a preloaded list client-side instead of hitting Discord's
// search endpoint on every character typed.
router.get("/:guildId/members/all", requireGuildAccess, async (req, res) => {
  const members = await getMembers(req.guild.id);
  res.json({
    members: members.filter(m => !m.user.bot).map(m => ({
      userId: m.user.id,
      username: m.user.username,
      displayName: m.nick || m.user.global_name || m.user.username,
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
