-- Tokens stored before encryption-at-rest (lib/tokenCrypto.js) existed are
-- plaintext. Drop them; affected sessions are just asked to sign in again.
UPDATE sessions SET access_token = NULL, refresh_token = NULL
WHERE access_token IS NOT NULL AND access_token NOT LIKE 'v1:%';
