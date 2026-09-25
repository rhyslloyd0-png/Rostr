// AES-256-GCM for Discord OAuth tokens stored in the sessions table, so a
// database leak alone doesn't hand out live access to users' Discord
// accounts. Key is 32 bytes, base64, from TOKEN_ENCRYPTION_KEY.
const crypto = require("crypto");

function getKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  return key;
}

// Without a key configured, refuse to store the token at all rather than
// fall back to plaintext — the dashboard then just asks for a re-login.
function encryptToken(plaintext) {
  const key = getKey();
  if (!plaintext || !key) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

// Returns null for anything that isn't a valid v1 ciphertext under the
// current key, including tokens stored in plaintext before encryption
// existed — those sessions are treated as needing a fresh sign-in.
function decryptToken(stored) {
  const key = getKey();
  if (!stored || !key || !stored.startsWith("v1:")) return null;
  try {
    const [, iv, tag, ciphertext] = stored.split(":");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

module.exports = { encryptToken, decryptToken };
