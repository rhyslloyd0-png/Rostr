import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAssignment, findOrCreatePlacement, normalizeRoster, todayDateStr } from "./rosterLogic.js";

function roster() {
  return [
    {
      id: "cmd", name: "Command",
      groups: [{ id: "cmd-g", name: "", ranks: [
        { id: "chief", rank: "Chief", userId: "", certifications: [] },
      ] }],
    },
    {
      id: "field", name: "Field",
      groups: [{ id: "field-g", name: "", ranks: [
        { id: "p1", rank: "Paramedic", userId: "u1", name: "Ann Smith", since: "2026-01-01", driverLevel: "3", certifications: ["ALS"] },
        { id: "p2", rank: "Paramedic", userId: "", certifications: [] },
      ] }],
    },
  ];
}
const post = (sections, sId, rId) => sections.find(s => s.id === sId).groups[0].ranks.find(r => r.id === rId);
const ann = { userId: "u1", username: "ann", displayName: "Ann Smith" };

test("assigning someone moves them: old post vacated, personal fields carried over", () => {
  const next = applyAssignment(roster(), { sectionId: "cmd", groupId: "cmd-g", rankId: "chief" }, ann);
  const chief = post(next, "cmd", "chief");
  assert.equal(chief.userId, "u1");
  assert.equal(chief.driverLevel, "3");
  assert.deepEqual(chief.certifications, ["ALS"]);
  assert.equal(chief.since, todayDateStr());
  assert.equal(post(next, "field", "p1").userId, "");
});

test("re-picking the current occupant keeps their original since date", () => {
  const next = applyAssignment(roster(), { sectionId: "field", groupId: "field-g", rankId: "p1" }, ann);
  assert.equal(post(next, "field", "p1").since, "2026-01-01");
});

test("vacating clears the post and leaves the input untouched", () => {
  const original = roster();
  const next = applyAssignment(original, { sectionId: "field", groupId: "field-g", rankId: "p1" }, null);
  assert.equal(post(next, "field", "p1").userId, "");
  assert.deepEqual(post(next, "field", "p1").certifications, []);
  assert.equal(post(original, "field", "p1").userId, "u1");
});

test("promotion placement prefers a vacant post, otherwise grows the rank's group", () => {
  assert.deepEqual(findOrCreatePlacement(roster(), "field", "Paramedic"), { groupId: "field-g", rankId: "p2", created: false });

  const full = roster();
  post(full, "field", "p2").userId = "u2";
  assert.deepEqual(findOrCreatePlacement(full, "field", "Paramedic"), { groupId: "field-g", rankId: null, created: true, rank: "Paramedic" });
  assert.equal(findOrCreatePlacement(full, "missing", "Paramedic"), null);
});

test("normalizeRoster migrates both older shapes into section -> group -> rank", () => {
  const flat = normalizeRoster({ sections: [{ id: "s1", name: "Staff", ranks: [{ id: "r1", rank: "Owner" }] }] });
  assert.equal(flat.sections[0].groups[0].ranks[0].rank, "Owner");
  assert.equal("ranks" in flat.sections[0], false);

  const slots = normalizeRoster({ slots: [{ id: "x", title: "Chief", userId: "u1", displayName: "Ann" }] });
  assert.equal(slots.sections[0].groups[0].ranks[0].name, "Ann");

  const current = roster();
  assert.equal(normalizeRoster({ sections: current }).sections, current);
  assert.deepEqual(normalizeRoster({}), { sections: [], certCatalog: [] });
});
