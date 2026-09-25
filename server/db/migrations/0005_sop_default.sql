ALTER TABLE sop_files ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Only one default document per department, enforced at the DB level so a
-- race between two admins clicking "star" at once can't leave two defaults.
CREATE UNIQUE INDEX IF NOT EXISTS sop_files_one_default_per_department
  ON sop_files (department_id) WHERE is_default;
