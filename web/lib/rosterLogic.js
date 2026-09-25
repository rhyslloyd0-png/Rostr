// Pure roster-state logic shared by the editor and the department page.
// No React or network here, so it's directly testable (rosterLogic.test.js).

export function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

export function lastNameOf(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/);
  return parts[parts.length - 1] || "";
}

export function findPost(sections, sectionId, groupId, rankId) {
  const section = sections.find(s => s.id === sectionId);
  const group = section?.groups.find(g => g.id === groupId);
  return group?.ranks.find(r => r.id === rankId) || null;
}

function vacatePost(post) {
  post.userId = "";
  post.discordUsername = "";
  post.name = "";
  post.since = "";
  post.driverLevel = "";
  post.certifications = [];
  post.nicknameOverride = "";
}

// Assigns `member` (or vacates, if null) into the post at the given
// location. Enforces "nobody holds two posts at once": sweeps every other
// post in the whole roster for the same userId and vacates it, carrying
// over their driver level / certifications to the new seat first — matches
// Midnight Roster's assignMemberToPost/vacateOtherPostsFor.
export function applyAssignment(sections, { sectionId, groupId, rankId }, member) {
  const next = sections.map(s => ({
    ...s,
    groups: s.groups.map(g => ({ ...g, ranks: g.ranks.map(r => ({ ...r })) })),
  }));
  const target = findPost(next, sectionId, groupId, rankId);
  if (!target) return sections;

  if (!member) {
    vacatePost(target);
    return next;
  }

  // Re-picking the person already in this seat shouldn't reset their tenure.
  const sameOccupant = target.userId === member.userId;
  const previousSince = target.since;
  const previousOverride = target.nicknameOverride;

  let carried = null;
  for (const s of next) {
    for (const g of s.groups) {
      for (const r of g.ranks) {
        if (r.userId === member.userId) {
          carried = { driverLevel: r.driverLevel, certifications: r.certifications };
          vacatePost(r);
        }
      }
    }
  }

  target.userId = member.userId;
  target.discordUsername = member.username;
  target.name = member.displayName;
  target.since = sameOccupant && previousSince ? previousSince : todayDateStr();
  target.nicknameOverride = sameOccupant ? (previousOverride || "") : "";
  if (carried) {
    target.driverLevel = carried.driverLevel || "";
    target.certifications = carried.certifications || [];
  }
  return next;
}

// Finds a vacant post at `rank` within `sectionId`, preferring an existing
// vacant slot; if every post at that rank is filled, says which group to
// grow — matches Midnight Roster's findOrCreatePostAt used by the promote
// tool.
export function findOrCreatePlacement(sections, sectionId, rank) {
  const section = sections.find(s => s.id === sectionId);
  if (!section) return null;
  for (const g of section.groups) {
    const vacant = g.ranks.find(r => r.rank === rank && !r.userId);
    if (vacant) return { groupId: g.id, rankId: vacant.id, created: false };
  }
  const hostGroup = section.groups.find(g => g.ranks.some(r => r.rank === rank)) || section.groups[0];
  return { groupId: hostGroup?.id, rankId: null, created: true, rank };
}

// Migrates older roster shapes into the current three-level
// section (category) -> group (sub-category) -> rank (post) shape, so
// roster data saved under either of the two earlier shapes still loads.
export function normalizeRoster(value) {
  const certCatalog = value?.certCatalog || [];

  if (value?.sections?.length && value.sections[0].groups) {
    return { sections: value.sections, certCatalog };
  }

  // Previous shape: sections with a flat `ranks` array, no group layer.
  if (value?.sections) {
    return {
      certCatalog,
      sections: value.sections.map(({ ranks, ...s }) => ({
        ...s,
        groups: [{ id: `${s.id}-group`, name: "", ranks: ranks || [] }],
      })),
    };
  }

  // Oldest shape: a single flat `{ slots: [...] }` list.
  if (value?.slots?.length) {
    return {
      certCatalog,
      sections: [{
        id: "migrated-staff",
        name: "Staff",
        groups: [{
          id: "migrated-staff-group",
          name: "",
          ranks: value.slots.map(s => ({
            id: s.id,
            rank: s.title || "",
            userId: s.userId || "",
            discordUsername: "",
            name: s.displayName || "",
            certifications: [],
            roleIds: [],
          })),
        }],
      }],
    };
  }

  return { sections: [], certCatalog };
}
