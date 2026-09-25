const express = require("express");
const multer = require("multer");
const pool = require("../db/pool");
const { attachSession, requireAuth } = require("../middleware/session");
const { requireGuildAccess } = require("../middleware/guildAccess");
const { requireDepartmentMember, requireDepartmentManage, requireDepartmentAdmin, computeTier } = require("../middleware/departmentAccess");
const { canCreateDepartment, requireFeature } = require("../config/plans");
const { addMemberRole, removeMemberRole, getAllGuildMembers, getGuildMember, sendChannelMessage } = require("../discord/api");
const { uniqueDepartmentSlug } = require("../db/slug");

const router = express.Router({ mergeParams: true });
router.use(attachSession, requireAuth);

// SOP documents are read into memory then written to Postgres as bytea —
// fine at the size SOPs actually are (policy PDFs/docs, not video), and
// keeps them durable without a separate object-storage bucket to manage.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Strips characters that would break out of the quoted filename in a
// Content-Disposition header (control chars, quotes) — display_name and
// filename both ultimately come from user input (an admin's rename, or the
// uploader's own filename).
function sanitizeFilename(name) {
  return String(name).replace(/[\x00-\x1f"]/g, "_");
}

// Department rows carry the banner image as bytea — strip it before a row
// goes into a JSON response (it's served separately via /:deptId/banner)
// so responses don't balloon with an embedded image every time.
function stripBanner(dept) {
  if (!dept) return dept;
  const { banner_data, ...rest } = dept;
  return { ...rest, has_banner: !!banner_data };
}

// ---- Guild-wide (creating/listing/removing departments): guild owner or a
// guild-admin role only, not a department's own admin/manager role — see
// middleware/departmentAccess.js for the per-department tiers below.

router.get("/", requireGuildAccess, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM departments WHERE guild_id = $1 ORDER BY position, created_at",
    [req.guild.id]
  );
  res.json({ departments: rows.map(stripBanner) });
});

router.post("/", requireGuildAccess, async (req, res) => {
  const allowed = await canCreateDepartment(req.guild);
  if (!allowed) {
    return res.status(402).json({ error: "plan_limit_reached", message: "Upgrade your plan to add another department" });
  }

  const { name, accessRoleId, staffRoleId } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const slug = await uniqueDepartmentSlug(pool, req.guild.id, name);
  const { rows } = await pool.query(
    `INSERT INTO departments (guild_id, name, slug, access_role_id, staff_role_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.guild.id, name, slug, accessRoleId || null, staffRoleId || null]
  );
  res.status(201).json({ department: stripBanner(rows[0]) });
});

router.delete("/:deptId", requireGuildAccess, async (req, res) => {
  const { rowCount } = await pool.query(
    "DELETE FROM departments WHERE (id::text = $1 OR slug = $1) AND guild_id = $2",
    [req.params.deptId, req.guild.id]
  );
  if (!rowCount) return res.status(404).json({ error: "Department not found" });
  res.status(204).end();
});

// ---- Per-department (see middleware/departmentAccess.js for the three
// tiers: member = view, manage = operate, admin = structural) ----

router.get("/:deptId", requireDepartmentMember, async (req, res) => {
  const tier = await computeTier(req);
  res.json({ department: stripBanner(req.department), tier });
});

const EDITABLE_FIELDS = [
  "name", "color", "access_role_id", "admin_role_ids", "manager_role_ids",
  "staff_role_id", "applicant_role_id", "loa_role_id", "applications_channel_id", "position",
];

router.patch("/:deptId", requireDepartmentAdmin, async (req, res) => {
  const updates = Object.keys(req.body).filter(k => EDITABLE_FIELDS.includes(k));
  if (!updates.length) return res.status(400).json({ error: "No editable fields provided" });

  const setClause = updates.map((field, i) => `${field} = $${i + 3}`).join(", ");
  const values = updates.map(f => req.body[f]);
  const { rows } = await pool.query(
    `UPDATE departments SET ${setClause} WHERE (id::text = $1 OR slug = $1) AND guild_id = $2 RETURNING *`,
    [req.params.deptId, req.guild.id, ...values]
  );
  res.json({ department: stripBanner(rows[0]) });
});

// Banner image — admin uploads/removes it, any department member can view
// it (served separately from the department JSON so a normal page load
// doesn't have to pull the image bytes every time).
router.post("/:deptId/banner", requireDepartmentAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file is required" });
  await pool.query(
    "UPDATE departments SET banner_data = $1, banner_content_type = $2 WHERE id = $3",
    [req.file.buffer, req.file.mimetype, req.department.id]
  );
  res.status(201).json({ ok: true });
});

router.delete("/:deptId/banner", requireDepartmentAdmin, async (req, res) => {
  await pool.query(
    "UPDATE departments SET banner_data = NULL, banner_content_type = NULL WHERE id = $1",
    [req.department.id]
  );
  res.status(204).end();
});

router.get("/:deptId/banner", requireDepartmentMember, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT banner_data, banner_content_type FROM departments WHERE id = $1",
    [req.department.id]
  );
  if (!rows.length || !rows[0].banner_data) return res.status(404).json({ error: "No banner set" });
  res.set("Content-Type", rows[0].banner_content_type);
  res.set("Cache-Control", "private, max-age=300");
  res.send(rows[0].banner_data);
});

// Roster/questions/role-map JSON blobs — GET returns {} if unset yet.
// Viewing is member-level for all keys; writing the roster is manage-level
// (day-to-day operations) but writing anything else (questions, role map)
// is structural, admin-level only.
router.get("/:deptId/data/:key", requireDepartmentMember, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT value FROM department_data WHERE department_id = $1 AND data_key = $2",
    [req.department.id, req.params.key]
  );
  res.json({ value: rows.length ? rows[0].value : {} });
});

async function requireDataWriteAccess(req, res, next) {
  const guard = req.params.key === "roster" ? requireDepartmentManage : requireDepartmentAdmin;
  return guard(req, res, next);
}

router.put("/:deptId/data/:key", requireDataWriteAccess, async (req, res) => {
  await pool.query(
    `INSERT INTO department_data (department_id, data_key, value)
     VALUES ($1, $2, $3)
     ON CONFLICT (department_id, data_key) DO UPDATE SET value = EXCLUDED.value`,
    [req.department.id, req.params.key, JSON.stringify(req.body.value ?? {})]
  );
  res.json({ ok: true });
});

// Two-way sync: for every role this department's roster controls (its
// staff_role_id, plus whatever roleIds are set on individual ranks), works
// out who *should* hold it from the roster JSON, compares that against who
// *currently* holds it in Discord (getAllGuildMembers — there's no "list
// members with this role" endpoint, so a full member list is the only way
// to find people who need a role taken away), and grants/revokes only the
// difference. This is what makes removing someone from the roster actually
// remove their roles instead of just leaving them assigned forever.
router.post("/:deptId/roster/sync", requireDepartmentManage, async (req, res) => {
  const { rows: dataRows } = await pool.query(
    "SELECT value FROM department_data WHERE department_id = $1 AND data_key = 'roster'",
    [req.department.id]
  );
  const sections = dataRows.length ? (dataRows[0].value.sections || []) : [];
  const allRanks = sections.flatMap(s => (s.groups || []).flatMap(g => g.ranks || []));

  // roleId -> Set of userIds who should hold it
  const desired = new Map();
  function want(roleId, userId) {
    if (!roleId || !userId) return;
    if (!desired.has(roleId)) desired.set(roleId, new Set());
    desired.get(roleId).add(userId);
  }
  for (const rank of allRanks) {
    if (!rank.userId) continue;
    want(req.department.staff_role_id, rank.userId);
    for (const roleId of rank.roleIds || []) want(roleId, rank.userId);
  }

  if (desired.size === 0) {
    return res.status(400).json({ error: "This department has no staff role or rank roles configured yet" });
  }

  const members = await getAllGuildMembers(req.guild.id);
  const changes = [];
  for (const [roleId, desiredUserIds] of desired) {
    const currentHolders = new Set(members.filter(m => m.roles?.includes(roleId)).map(m => m.user.id));
    for (const userId of desiredUserIds) {
      if (!currentHolders.has(userId)) changes.push({ userId, roleId, action: "add" });
    }
    for (const userId of currentHolders) {
      if (!desiredUserIds.has(userId)) changes.push({ userId, roleId, action: "remove" });
    }
  }

  const results = await Promise.all(
    changes.map(async c => ({
      ...c,
      ok: c.action === "add"
        ? await addMemberRole(req.guild.id, c.userId, c.roleId)
        : await removeMemberRole(req.guild.id, c.userId, c.roleId),
    }))
  );

  res.json({
    added: results.filter(r => r.ok && r.action === "add").length,
    removed: results.filter(r => r.ok && r.action === "remove").length,
    failed: results.filter(r => !r.ok).map(r => ({ userId: r.userId, roleId: r.roleId, action: r.action })),
  });
});

// ---- Applications (manage-tier: admin or manager review queue) ----
// The applicant-facing submit/status endpoints live in routes/apply.js,
// reachable by any logged-in Discord user, not just department staff.

router.get("/:deptId/applications", requireDepartmentManage, requireFeature("applications"), async (req, res) => {
  const status = req.query.status;
  const { rows } = await pool.query(
    status
      ? "SELECT * FROM applications WHERE department_id = $1 AND status = $2 ORDER BY submitted_at DESC"
      : "SELECT * FROM applications WHERE department_id = $1 ORDER BY submitted_at DESC",
    status ? [req.department.id, status] : [req.department.id]
  );
  res.json({ applications: rows });
});

router.patch("/:deptId/applications/:appId", requireDepartmentManage, requireFeature("applications"), async (req, res) => {
  const { status, feedback } = req.body;
  if (!["approved", "denied", "pending"].includes(status)) {
    return res.status(400).json({ error: "status must be approved, denied, or pending" });
  }

  const { rows } = await pool.query(
    `UPDATE applications SET status = $1, feedback = $2
     WHERE id = $3 AND department_id = $4 RETURNING *`,
    [status, feedback || null, req.params.appId, req.department.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Application not found" });
  const application = rows[0];

  // Best-effort role swap — a failed Discord call (member left, missing
  // permission) shouldn't roll back the decision itself, just the role move.
  if (status === "approved") {
    if (req.department.staff_role_id) await addMemberRole(req.guild.id, application.user_id, req.department.staff_role_id);
    if (req.department.applicant_role_id) await removeMemberRole(req.guild.id, application.user_id, req.department.applicant_role_id);
    await placeApprovedApplicant(req.department.id, application);
  } else if (status === "denied" && req.department.applicant_role_id) {
    await removeMemberRole(req.guild.id, application.user_id, req.department.applicant_role_id);
  }

  res.json({ application });
});

// Drops an approved applicant into the admin-configured placement
// {sectionId, rank} (see PUT /:deptId/data/placement) — mirrors Midnight
// Roster's "Approval Placement" tool. Fills the first vacant post at that
// rank; if every post at that rank is already filled, grows the section by
// adding a new one rather than silently doing nothing, so approving people
// never blocks on the roster having "enough" empty slots pre-made. Does
// nothing if no placement is configured or the target section/rank no
// longer exists (e.g. the section was deleted since).
async function placeApprovedApplicant(departmentId, application) {
  const { rows: placementRows } = await pool.query(
    "SELECT value FROM department_data WHERE department_id = $1 AND data_key = 'placement'",
    [departmentId]
  );
  const { sectionId, rank } = placementRows[0]?.value || {};
  if (!sectionId || !rank) return;

  const { rows: rosterRows } = await pool.query(
    "SELECT value FROM department_data WHERE department_id = $1 AND data_key = 'roster'",
    [departmentId]
  );
  if (!rosterRows.length) return;
  const roster = rosterRows[0].value;
  const section = (roster.sections || []).find(s => s.id === sectionId);
  if (!section) return;
  section.groups = section.groups || [];

  let target = null;
  for (const g of section.groups) {
    target = (g.ranks || []).find(r => r.rank === rank && !r.userId);
    if (target) break;
  }
  if (!target) {
    const hostGroup = section.groups.find(g => (g.ranks || []).some(r => r.rank === rank)) || section.groups[0];
    if (!hostGroup) return;
    target = { id: `rank-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, rank, certifications: [], roleIds: [] };
    hostGroup.ranks = hostGroup.ranks || [];
    hostGroup.ranks.push(target);
  }

  // Nobody holds two posts — vacate anywhere else in the roster they were
  // already assigned before seating them in the new spot.
  for (const s of roster.sections || []) {
    for (const g of s.groups || []) {
      for (const r of g.ranks || []) {
        if (r.userId === application.user_id && r !== target) {
          r.userId = ""; r.name = ""; r.discordUsername = "";
        }
      }
    }
  }

  target.userId = application.user_id;
  target.name = application.display_name;
  target.since = new Date().toISOString().slice(0, 10);

  await pool.query(
    "UPDATE department_data SET value = $1 WHERE department_id = $2 AND data_key = 'roster'",
    [JSON.stringify(roster), departmentId]
  );
}

// ---- Leave of absence (manage-tier: admin or manager review queue) ----
// Self-service submit/status for staff lives in routes/loa.js. Activating/
// deactivating the LOA Discord role once a request is approved happens on
// its own schedule (see jobs/loaScheduler.js) rather than here, since a
// request's window can open or close with nobody touching the site.

router.get("/:deptId/loa", requireDepartmentManage, requireFeature("loa"), async (req, res) => {
  const status = req.query.status;
  const { rows } = await pool.query(
    status
      ? "SELECT * FROM loa_requests WHERE department_id = $1 AND status = $2 ORDER BY start_date DESC"
      : "SELECT * FROM loa_requests WHERE department_id = $1 ORDER BY start_date DESC",
    status ? [req.department.id, status] : [req.department.id]
  );
  res.json({ requests: rows });
});

router.patch("/:deptId/loa/:loaId", requireDepartmentManage, requireFeature("loa"), async (req, res) => {
  const { status } = req.body;
  if (!["approved", "denied"].includes(status)) {
    return res.status(400).json({ error: "status must be approved or denied" });
  }

  const { rows } = await pool.query(
    `UPDATE loa_requests SET status = $1, decided_by = $2
     WHERE id = $3 AND department_id = $4 RETURNING *`,
    [status, req.user.id, req.params.loaId, req.department.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Leave request not found" });
  res.json({ request: rows[0] });
});

// ---- SOP documents (admin-tier: structural, since it's managing what the
// department publishes) ----
// Staff-facing list/download lives in routes/sop.js, reachable by anyone
// holding the department's access/staff/admin/manager role.

router.get("/:deptId/sop", requireDepartmentAdmin, requireFeature("sop"), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, filename, display_name, content_type, size, uploaded_by, uploaded_at, is_default
     FROM sop_files WHERE department_id = $1 ORDER BY is_default DESC, uploaded_at DESC`,
    [req.department.id]
  );
  res.json({ files: rows });
});

router.post("/:deptId/sop", requireDepartmentAdmin, requireFeature("sop"), upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file is required" });

  const { rows } = await pool.query(
    `INSERT INTO sop_files (department_id, filename, display_name, content_type, size, data, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, filename, display_name, content_type, size, uploaded_by, uploaded_at, is_default`,
    [req.department.id, req.file.originalname, req.body.displayName || null, req.file.mimetype, req.file.size, req.file.buffer, req.user.id]
  );
  // First document in a department becomes the default automatically so the
  // staff viewer always has something to show.
  const { rows: countRows } = await pool.query("SELECT COUNT(*) FROM sop_files WHERE department_id = $1", [req.department.id]);
  if (Number(countRows[0].count) === 1) {
    await pool.query("UPDATE sop_files SET is_default = TRUE WHERE id = $1", [rows[0].id]);
    rows[0].is_default = true;
  }
  res.status(201).json({ file: rows[0] });
});

router.patch("/:deptId/sop/:fileId", requireDepartmentAdmin, requireFeature("sop"), async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE sop_files SET display_name = $1
     WHERE id = $2 AND department_id = $3
     RETURNING id, filename, display_name, content_type, size, uploaded_by, uploaded_at, is_default`,
    [req.body.displayName || null, req.params.fileId, req.department.id]
  );
  if (!rows.length) return res.status(404).json({ error: "File not found" });
  res.json({ file: rows[0] });
});

router.post("/:deptId/sop/:fileId/default", requireDepartmentAdmin, requireFeature("sop"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE sop_files SET is_default = FALSE WHERE department_id = $1", [req.department.id]);
    const { rows } = await client.query(
      `UPDATE sop_files SET is_default = TRUE WHERE id = $1 AND department_id = $2
       RETURNING id, filename, display_name, content_type, size, uploaded_by, uploaded_at, is_default`,
      [req.params.fileId, req.department.id]
    );
    if (!rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ error: "File not found" }); }
    await client.query("COMMIT");
    res.json({ file: rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

router.delete("/:deptId/sop/:fileId", requireDepartmentAdmin, requireFeature("sop"), async (req, res) => {
  const { rows } = await pool.query(
    "DELETE FROM sop_files WHERE id = $1 AND department_id = $2 RETURNING is_default",
    [req.params.fileId, req.department.id]
  );
  if (!rows.length) return res.status(404).json({ error: "File not found" });
  // Deleting the default doc leaves the viewer empty otherwise — hand the
  // default to whatever's newest among what's left.
  if (rows[0].is_default) {
    await pool.query(
      `UPDATE sop_files SET is_default = TRUE WHERE id = (
         SELECT id FROM sop_files WHERE department_id = $1 ORDER BY uploaded_at DESC LIMIT 1
       )`,
      [req.department.id]
    );
  }
  res.status(204).end();
});

router.get("/:deptId/sop/:fileId/download", requireDepartmentAdmin, requireFeature("sop"), async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM sop_files WHERE id = $1 AND department_id = $2",
    [req.params.fileId, req.department.id]
  );
  if (!rows.length) return res.status(404).json({ error: "File not found" });
  const file = rows[0];
  res.set("Content-Type", file.content_type);
  res.set("Content-Disposition", `attachment; filename="${sanitizeFilename(file.display_name || file.filename)}"`);
  res.send(file.data);
});

// Lets an admin post a message to a Discord channel through the bot without
// leaving the dashboard — e.g. announcing a roster update. Mirrors Midnight
// Roster's send-message tool: plain text, or a single embed with a footer
// stamping who actually sent it (so "the bot said X" is traceable to an
// admin without needing a message log of its own).
router.post("/:deptId/announce", requireDepartmentAdmin, async (req, res) => {
  const { channelId, message, title, asEmbed } = req.body;
  if (!channelId || !message || !message.trim()) {
    return res.status(400).json({ error: "channelId and message are required" });
  }
  const content = message.trim().slice(0, 2000);

  if (asEmbed) {
    const member = await getGuildMember(req.guild.id, req.user.id);
    const displayName = member?.nick || member?.user?.global_name || req.user.username;
    await sendChannelMessage(channelId, {
      embeds: [{
        title: title ? title.trim().slice(0, 256) : undefined,
        description: content,
        color: 0xa855f7,
        footer: { text: `${req.department.name} • sent by ${displayName}` },
        timestamp: new Date().toISOString(),
      }],
    });
  } else {
    await sendChannelMessage(channelId, { content });
  }
  res.json({ ok: true });
});

module.exports = router;
