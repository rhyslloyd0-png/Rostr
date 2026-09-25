-- Stores the user's own Discord OAuth token alongside the session so the
-- dashboard can list every server they administer (GET /users/@me/guilds),
-- not just the ones RostR already knows about — needed for the
-- "Your Servers" discovery list.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS access_token TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
