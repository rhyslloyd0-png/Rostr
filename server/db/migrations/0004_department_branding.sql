-- Lets a guild owner/admin brand each department: an accent color (used for
-- its nav pill and name styling) and an uploaded banner image, matching the
-- customization Midnight Roster's admin panel offered per department.
ALTER TABLE departments ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS banner_data BYTEA;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS banner_content_type TEXT;
