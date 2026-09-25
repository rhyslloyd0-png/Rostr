const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
const { encryptToken, decryptToken } = require("./tokenCrypto");

test("round-trips a token and never stores it in the clear", () => {
  const stored = encryptToken("secret-access-token");
  assert.ok(stored.startsWith("v1:"));
  assert.ok(!stored.includes("secret-access-token"));
  assert.equal(decryptToken(stored), "secret-access-token");
});

test("rejects plaintext, tampered, and empty values", () => {
  assert.equal(decryptToken("secret-access-token"), null);
  const stored = encryptToken("secret-access-token");
  const tampered = stored.slice(0, -4) + (stored.endsWith("AAAA") ? "BBBB" : "AAAA");
  assert.equal(decryptToken(tampered), null);
  assert.equal(encryptToken(null), null);
  assert.equal(decryptToken(null), null);
});
