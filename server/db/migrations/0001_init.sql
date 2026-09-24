-- RostR multi-tenant schema. Every table below is scoped by guild_id (the
-- Discord server's snowflake) instead of the single hardcoded deployment
-- Midnight Roster used — this is what lets one running instance of RostR
-- serve any number of Discord servers without a redeploy.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS plans (
  key TEXT PRIMARY KEY,               -- 'free' | 'pro' | 'enterprise'
  max_departments INTEGER NOT NULL,
  features JSONB NOT NULL DEFAULT '{}'::jsonb  -- {"applications":true,"loa":true,"sop":true}
);

INSERT INTO plans (key, max_departments, features) VALUES
  ('free', 1, '{"applications":false,"loa":false,"sop":false}'),
  ('pro', 10, '{"applications":true,"loa":true,"sop":false}'),
  ('enterprise', -1, '{"applications":true,"loa":true,"sop":true}')
ON CONFLICT (key) DO NOTHING;
-- max_departments = -1 means unlimited.

CREATE TABLE IF NOT EXISTS guilds (
  id TEXT PRIMARY KEY,                -- Discord guild snowflake
  name TEXT NOT NULL,
  icon TEXT,
  owner_discord_id TEXT NOT NULL,
  plan TEXT NOT NULL REFERENCES plans(key) DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Roles (beyond the owner, who always has access) that RostR treats as
-- allowed to manage guild-level settings (create departments, billing,
-- designate further admin roles) — set by the owner from the dashboard,
-- replacing Midnight Roster's SUPER_ADMIN_ROLE_ID env var.
CREATE TABLE IF NOT EXISTS guild_admins (
  guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  discord_role_id TEXT NOT NULL,
  discord_role_name TEXT NOT NULL,
  PRIMARY KEY (guild_id, discord_role_id)
);

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  access_role_id TEXT,
  admin_role_ids TEXT[] NOT NULL DEFAULT '{}',
  manager_role_ids TEXT[] NOT NULL DEFAULT '{}',
  staff_role_id TEXT,
  applicant_role_id TEXT,
  loa_role_id TEXT,
  applications_channel_id TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS departments_guild_idx ON departments (guild_id);

-- Generic per-department JSON blobs: roster structure, application
-- questions, discord-role mapping. Replaces Midnight Roster's kv_store rows
-- keyed by string like "roster-mhs" with a real foreign key.
CREATE TABLE IF NOT EXISTS department_data (
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  data_key TEXT NOT NULL,             -- 'roster' | 'questions' | 'role_map'
  value JSONB NOT NULL,
  PRIMARY KEY (department_id, data_key)
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  discord_avatar TEXT,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  answers JSONB NOT NULL,
  feedback TEXT
);
CREATE INDEX IF NOT EXISTS applications_department_idx ON applications (department_id);
CREATE INDEX IF NOT EXISTS applications_user_idx ON applications (user_id);

CREATE TABLE IF NOT EXISTS loa_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  decided_by TEXT,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loa_department_idx ON loa_requests (department_id);
CREATE INDEX IF NOT EXISTS loa_user_idx ON loa_requests (user_id);

CREATE TABLE IF NOT EXISTS sop_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  display_name TEXT,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  data BYTEA NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sop_files_department_idx ON sop_files (department_id);
