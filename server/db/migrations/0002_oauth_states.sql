-- OAuth `state` values, persisted instead of held in process memory — an
-- in-memory Map doesn't survive a restart/redeploy, and a login started
-- right before one lands would otherwise fail with "invalid_state" the
-- moment the new process comes up (or on any multi-instance deployment,
-- where the callback could land on a different instance than /login did).
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  return_to TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS oauth_states_expires_idx ON oauth_states (expires_at);
