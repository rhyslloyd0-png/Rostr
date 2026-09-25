-- Human-readable slugs for guilds and departments, so the dashboard can show
-- URLs like /dashboard/midnight-rp/departments/fire-department instead of a
-- raw Discord snowflake and a UUID. App code sets these explicitly on every
-- new insert going forward (see db/slug.js); this migration only backfills
-- rows created before slugs existed.
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS slug TEXT;

DO $$
DECLARE
  g RECORD;
  d RECORD;
  base TEXT;
  candidate TEXT;
  n INT;
BEGIN
  FOR g IN SELECT id, name FROM guilds WHERE slug IS NULL LOOP
    base := trim(both '-' from regexp_replace(lower(g.name), '[^a-z0-9]+', '-', 'g'));
    IF base = '' THEN base := 'server'; END IF;
    candidate := base; n := 1;
    WHILE EXISTS (SELECT 1 FROM guilds WHERE slug = candidate) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    UPDATE guilds SET slug = candidate WHERE id = g.id;
  END LOOP;

  FOR d IN SELECT id, guild_id, name FROM departments WHERE slug IS NULL LOOP
    base := trim(both '-' from regexp_replace(lower(d.name), '[^a-z0-9]+', '-', 'g'));
    IF base = '' THEN base := 'department'; END IF;
    candidate := base; n := 1;
    WHILE EXISTS (SELECT 1 FROM departments WHERE guild_id = d.guild_id AND slug = candidate) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    UPDATE departments SET slug = candidate WHERE id = d.id;
  END LOOP;
END $$;

ALTER TABLE guilds ADD CONSTRAINT guilds_slug_unique UNIQUE (slug);
CREATE UNIQUE INDEX IF NOT EXISTS departments_guild_slug_idx ON departments (guild_id, slug);
