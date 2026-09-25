// Staff-facing SOP document library — list/download only, reachable by
// anyone holding the department's access/staff/admin/manager role (see
// middleware/departmentAccess.js), not just guild admins. Uploading and
// managing files is admin-only, in routes/departments.js.
const express = require("express");
const pool = require("../db/pool");
const { attachSession, requireAuth } = require("../middleware/session");
const { requireDepartmentMember } = require("../middleware/departmentAccess");
const { requireFeature } = require("../config/plans");

const router = express.Router();
router.use(attachSession, requireAuth, requireDepartmentMember, requireFeature("sop"));

function sanitizeFilename(name) {
  return String(name).replace(/[\x00-\x1f"]/g, "_");
}

router.get("/:guildId/:deptId", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, filename, display_name, content_type, size, uploaded_at, is_default
     FROM sop_files WHERE department_id = $1 ORDER BY is_default DESC, uploaded_at DESC`,
    [req.department.id]
  );
  res.json({ department: { id: req.department.id, name: req.department.name }, files: rows });
});

router.get("/:guildId/:deptId/:fileId/download", async (req, res) => {
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

// Inline render for the document viewer pane — unlike /download this isn't
// forced as an attachment, so HTML docs display directly in an iframe.
// The frontend loads this in a sandboxed iframe with no allow-same-origin,
// so an uploaded HTML file gets an opaque origin and can't read the
// session cookie or reach the rest of the app even if it runs a script.
router.get("/:guildId/:deptId/:fileId/view", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM sop_files WHERE id = $1 AND department_id = $2",
    [req.params.fileId, req.department.id]
  );
  if (!rows.length) return res.status(404).json({ error: "File not found" });
  const file = rows[0];
  res.set("Content-Type", file.content_type);
  res.set("Content-Disposition", `inline; filename="${sanitizeFilename(file.display_name || file.filename)}"`);
  res.set("X-Content-Type-Options", "nosniff");
  // Same isolation as the viewer iframe's sandbox attribute, but enforced by
  // the response itself — so opening this URL directly in a tab (outside
  // the iframe) still gives the document an opaque origin with no access
  // to the session cookie.
  res.set("Content-Security-Policy", "sandbox allow-scripts allow-popups");
  res.send(file.data);
});

module.exports = router;
