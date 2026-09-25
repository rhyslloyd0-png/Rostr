const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  nicknameFor, desiredRoles, computeRoleChanges, mergeDesired, computeNicknameChanges,
} = require("./rosterSync");

const roster = posts => [{ id: "s", groups: [{ id: "g", ranks: posts }] }];
const member = (id, roles = [], nick = null) => ({ user: { id }, roles, nick });

test("nickname is callsign | last name, overridable, capped at 32 chars", () => {
  assert.equal(nicknameFor({ userId: "1", callsign: "AP-301", name: "Rhys Jones" }), "AP-301 | Jones");
  assert.equal(nicknameFor({ userId: "1", callsign: "AP-301", name: "Rhys Jones", nicknameOverride: "Rhys" }), "AP-301 | Rhys");
  assert.equal(nicknameFor({ userId: "1", callsign: "", name: "Rhys Jones" }), null);
  assert.equal(nicknameFor({ userId: "", callsign: "AP-301", name: "Rhys" }), null);
  assert.equal(nicknameFor({ userId: "1", callsign: "X", name: "A".repeat(50) }).length, 32);
});

test("desired roles include the department staff role and per-rank roles", () => {
  const desired = desiredRoles({ staff_role_id: "staff" }, roster([
    { userId: "u1", roleIds: ["medic"] },
    { userId: "", roleIds: ["medic"] },
  ]));
  assert.deepEqual([...desired.get("staff")], ["u1"]);
  assert.deepEqual([...desired.get("medic")], ["u1"]);
});

test("grants missing roles and revokes roles from people no longer on the roster", () => {
  const own = desiredRoles({ staff_role_id: "staff" }, roster([{ userId: "u1" }]));
  const changes = computeRoleChanges(own, own, [member("u1"), member("u2", ["staff"])]);
  assert.deepEqual(changes, [
    { userId: "u1", roleId: "staff", action: "add" },
    { userId: "u2", roleId: "staff", action: "remove" },
  ]);
});

test("a role shared with another department isn't stripped from that department's members", () => {
  const emsDesired = desiredRoles({ staff_role_id: "emergency" }, roster([{ userId: "medic" }]));
  const fireDesired = desiredRoles({ staff_role_id: "emergency" }, roster([{ userId: "firefighter" }]));
  const guild = mergeDesired([emsDesired, fireDesired]);

  const changes = computeRoleChanges(emsDesired, guild, [
    member("medic", ["emergency"]),
    member("firefighter", ["emergency"]),
    member("leaver", ["emergency"]),
  ]);
  assert.deepEqual(changes, [{ userId: "leaver", roleId: "emergency", action: "remove" }]);
});

test("nickname changes skip people already correct and the server owner", () => {
  const sections = roster([
    { userId: "a", callsign: "AP-1", name: "Ann Smith" },
    { userId: "b", callsign: "AP-2", name: "Bob Brown" },
    { userId: "owner", callsign: "AP-3", name: "Olly Owner" },
  ]);
  const changes = computeNicknameChanges(sections, [
    member("a", [], "AP-1 | Smith"),
    member("b", [], "Bob"),
    member("owner"),
  ], "owner");
  assert.deepEqual(changes, [{ userId: "b", nickname: "AP-2 | Brown" }]);
});
