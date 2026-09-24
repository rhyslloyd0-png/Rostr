// Staff-facing SOP document library — list/download only, reachable by
// anyone holding the department's access/staff/admin/manager role (see
// middleware/departmentAccess.js), not just guild admins. Uploading and
// managing files is admin-only, in routes/departments.js.
const express = require("express");
const pool = require("../db/pool");
const { attachSession, requireAuth } = require("../middleware/session");
const { requireDepartmentMember } = require("../middleware/departmentAccess");

const router = express.Router();
router.use(attachSession, requireAuth);

function sanitizeFilename(name) {
  return String(name).replace(/[\x00-\x1f"]/g, "_");
}

router.get("/:guildId/:deptId", requireDepartmentMember, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, filename, display_name, content_type, size, uploaded_at
     FROM sop_files WHERE department_id = $1 ORDER BY uploaded_at DESC`,
    [req.department.id]
  );
  res.json({ department: { id: req.department.id, name: req.department.name }, files: rows });
});

router.get("/:guildId/:deptId/:fileId/download", requireDepartmentMember, async (req, res) => {
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

module.exports = router;
