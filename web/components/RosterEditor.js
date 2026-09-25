import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../lib/api";
import RolePicker from "./RolePicker";

let idCounter = 0;
function newId(prefix) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

const DEFAULT_DRIVER_LEVELS = ["1", "2", "3", "4", "5"];

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

// Loads the guild's full member list once and hands back a filter function
// — mirrors Midnight Roster's "load the whole list, filter client-side"
// picker instead of hitting Discord's search endpoint on every keystroke.
function useGuildMembers(guildId) {
  const [members, setMembers] = useState(null);
  useEffect(() => {
    if (!guildId) return;
    apiFetch(`/guilds/${guildId}/members/all`).then(d => setMembers(d.members)).catch(() => setMembers([]));
  }, [guildId]);
  return members;
}

// ---- Roster-wide assignment logic ------------------------------------

function findPost(sections, sectionId, groupId, rankId) {
  const section = sections.find(s => s.id === sectionId);
  const group = section?.groups.find(g => g.id === groupId);
  const rank = group?.ranks.find(r => r.id === rankId);
  return rank || null;
}

function vacatePost(post) {
  post.userId = "";
  post.discordUsername = "";
  post.name = "";
  post.since = "";
  post.driverLevel = "";
  post.certifications = [];
}

// Assigns `member` (or vacates, if null) into the post at the given
// location. Enforces "nobody holds two posts at once": sweeps every other
// post in the whole roster for the same userId and vacates it, carrying
// over their driver level / certifications to the new seat first — matches
// Midnight Roster's assignMemberToPost/vacateOtherPostsFor.
function applyAssignment(sections, { sectionId, groupId, rankId }, member) {
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

  // Carry over personal attributes from wherever this member currently is,
  // then vacate every post they hold (including this one, harmlessly).
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
  target.since = todayDateStr();
  if (carried) {
    target.driverLevel = carried.driverLevel || "";
    target.certifications = carried.certifications || [];
  }
  return next;
}

// Finds a vacant post at `rank` within `sectionId`, preferring an existing
// vacant slot; if every post at that rank is filled, grows the group that
// already contains that rank by adding a new one — matches
// Midnight Roster's findOrCreatePostAt used by the promote tool.
function findOrCreatePlacement(sections, sectionId, rank) {
  const section = sections.find(s => s.id === sectionId);
  if (!section) return null;
  for (const g of section.groups) {
    const vacant = g.ranks.find(r => r.rank === rank && !r.userId);
    if (vacant) return { groupId: g.id, rankId: vacant.id, created: false };
  }
  const hostGroup = section.groups.find(g => g.ranks.some(r => r.rank === rank)) || section.groups[0];
  return { groupId: hostGroup?.id, rankId: null, created: true, rank };
}

// ---- Assign search dropdown -------------------------------------------

function AssignSearch({ post, members, onAssign }) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const closeTimer = useRef(null);

  const filled = !!post.userId;
  const displayValue = open ? query : (filled ? post.name : "");

  function openAt() {
    clearTimeout(closeTimer.current);
    setRect(inputRef.current.getBoundingClientRect());
    setOpen(true);
    setQuery("");
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  const list = (members || [])
    .filter(m => !query || m.displayName.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 50);

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        value={displayValue}
        placeholder="— Vacant —"
        onFocus={openAt}
        onChange={e => { setQuery(e.target.value); if (!open) openAt(); }}
        onBlur={scheduleClose}
        style={{ borderColor: filled ? "var(--brand-blue-bright)" : "#333947" }}
      />
      {open && rect && (
        <div
          className="card assign-dropdown"
          style={{ position: "fixed", left: rect.left, top: rect.bottom + 2, width: Math.max(rect.width, 220), zIndex: 100, maxHeight: 260, overflowY: "auto", padding: 4 }}
        >
          <div
            style={{ padding: "6px 8px", cursor: "pointer", fontStyle: "italic", color: "#6b7180" }}
            onMouseDown={() => { onAssign(null); setOpen(false); }}
          >
            — Vacant —
          </div>
          {members === null && <div style={{ padding: "6px 8px" }} className="muted">Loading members...</div>}
          {members !== null && list.length === 0 && query && <div style={{ padding: "6px 8px" }} className="muted">No matches</div>}
          {list.map(m => (
            <div
              key={m.userId}
              style={{ padding: "6px 8px", cursor: "pointer" }}
              onMouseDown={() => { onAssign(m); setOpen(false); }}
            >
              {m.displayName} <span className="muted">@{m.username}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Promotion / rank-change modal -------------------------------------

function PromoteModal({ sections, post, onConfirm, onClose }) {
  const options = [];
  for (const s of sections) {
    const ranksInSection = [...new Set(s.groups.flatMap(g => g.ranks.map(r => r.rank)).filter(Boolean))];
    for (const rank of ranksInSection) options.push({ sectionId: s.id, sectionName: s.name, rank });
  }
  const currentKey = `${post.sectionId}::${post.rank}`;
  const [choice, setChoice] = useState(currentKey);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal-content" onClick={e => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Change rank</h2>
        <p className="muted">
          {post.name} is {post.rank} in {sections.find(s => s.id === post.sectionId)?.name}. Pick the rank they move to
          — their current post is vacated automatically, since nobody holds two at once.
        </p>
        <div className="field">
          <select value={choice} onChange={e => setChoice(e.target.value)}>
            {options.map(o => {
              const key = `${o.sectionId}::${o.rank}`;
              return (
                <option key={key} value={key}>
                  {o.sectionName} — {o.rank}{key === currentKey ? " (current)" : ""}
                </option>
              );
            })}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn"
            onClick={() => {
              if (choice === currentKey) return onClose();
              const [sectionId, rank] = choice.split("::");
              onConfirm(sectionId, rank);
            }}
          >
            Confirm
          </button>
          <button className="btn secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ---- Rank (post) row ----------------------------------------------------

function CertPills({ catalog, selected, onToggle }) {
  if (!catalog.length) return <span className="muted">—</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {catalog.map(c => {
        const active = selected.includes(c);
        return (
          <button
            key={c}
            type="button"
            onClick={() => onToggle(c)}
            className="tag"
            style={{
              cursor: "pointer",
              borderColor: active ? "var(--brand-blue-bright)" : "#333947",
              background: active ? "rgba(95,180,255,0.15)" : "transparent",
              color: active ? "var(--brand-blue-bright)" : "#6b7180",
              fontWeight: active ? 700 : 400,
            }}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

function RankRow({ post, sectionId, groupId, roles, certCatalog, driverLevels, members, onChange, onRemove, onAssign, onPromote }) {
  const [showRoles, setShowRoles] = useState(false);

  function patch(fields) {
    onChange({ ...post, ...fields });
  }

  function toggleCert(c) {
    const current = post.certifications || [];
    patch({ certifications: current.includes(c) ? current.filter(x => x !== c) : [...current, c] });
  }

  return (
    <>
      <tr style={{ borderTop: "1px solid #262b36" }}>
        <td style={{ padding: 6 }}>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input style={{ minWidth: 120 }} value={post.rank} onChange={e => patch({ rank: e.target.value })} placeholder="Rank title" />
            {post.userId && (
              <button className="btn secondary" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => onPromote({ ...post, sectionId })}>
                Change rank
              </button>
            )}
          </div>
        </td>
        <td style={{ padding: 6 }}>
          <input style={{ width: 90 }} value={post.callsign || ""} onChange={e => patch({ callsign: e.target.value })} placeholder="—" />
        </td>
        <td style={{ padding: 6, minWidth: 170 }}>
          <AssignSearch post={post} members={members} onAssign={m => onAssign(sectionId, groupId, post.id, m)} />
        </td>
        <td style={{ padding: 6 }} className="muted">{post.userId ? (post.discordUsername ? `@${post.discordUsername}` : post.userId) : "—"}</td>
        <td style={{ padding: 6 }}>
          <select style={{ width: 70 }} value={post.driverLevel || ""} onChange={e => patch({ driverLevel: e.target.value })}>
            <option value="">—</option>
            {driverLevels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </td>
        <td style={{ padding: 6, minWidth: 180 }}>
          <CertPills catalog={certCatalog} selected={post.certifications || []} onToggle={toggleCert} />
        </td>
        <td style={{ padding: 6 }}>
          <input style={{ width: 130 }} type="date" value={post.since || ""} onChange={e => patch({ since: e.target.value })} />
        </td>
        <td style={{ padding: 6 }}>
          <button className="btn secondary" onClick={onRemove} title="Remove rank" style={{ padding: "4px 10px" }}>✕</button>
        </td>
      </tr>
      <tr>
        <td colSpan={8} style={{ padding: "0 6px 8px" }}>
          <a href="#" onClick={e => { e.preventDefault(); setShowRoles(s => !s); }} style={{ fontSize: 12 }}>
            {showRoles ? "Hide" : "Extra roles"} ({(post.roleIds || []).length})
          </a>
          {showRoles && <div style={{ marginTop: 6 }}><RolePicker roles={roles} selected={post.roleIds || []} onChange={roleIds => patch({ roleIds })} /></div>}
        </td>
      </tr>
    </>
  );
}

// ---- Group (sub-category) ------------------------------------------------

function GroupEditor({ section, group, roles, certCatalog, driverLevels, members, onChange, onRemove, onAssign, onPromote }) {
  const [editingName, setEditingName] = useState(false);
  const [positionsInput, setPositionsInput] = useState(String((group.ranks || []).length));

  function patch(fields) {
    onChange({ ...group, ...fields });
  }

  function addRank() {
    patch({ ranks: [...(group.ranks || []), { id: newId("rank"), rank: "", certifications: [], roleIds: [] }] });
  }

  function applyPositions() {
    const target = Math.max(0, parseInt(positionsInput, 10) || 0);
    const current = group.ranks || [];
    if (target > current.length) {
      const templateRank = current.length ? current[current.length - 1].rank : "";
      const additions = Array.from({ length: target - current.length }, () => ({ id: newId("rank"), rank: templateRank, certifications: [], roleIds: [] }));
      patch({ ranks: [...current, ...additions] });
    } else if (target < current.length) {
      const toDrop = current.slice(target);
      if (toDrop.some(r => r.userId)) {
        alert("Can't shrink below a filled position — vacate it first.");
        setPositionsInput(String(current.length));
        return;
      }
      patch({ ranks: current.slice(0, target) });
    }
  }

  function autoCallsigns() {
    const ranks = group.ranks || [];
    if (!ranks.length) return;
    const match = (ranks[0].callsign || "").match(/^(.*?)(\d+)$/);
    if (!match) { alert("The first post's callsign needs to end in a number, e.g. \"AP-301\"."); return; }
    if (!confirm(`Number ${ranks.length} callsign(s) up from ${ranks[0].callsign}? This overwrites the ones below it.`)) return;
    const [, prefix, digits] = match;
    const width = digits.length;
    const start = parseInt(digits, 10);
    patch({ ranks: ranks.map((r, i) => ({ ...r, callsign: `${prefix}${String(start + i).padStart(width, "0")}` })) });
  }

  function updateRank(id, updated) {
    patch({ ranks: group.ranks.map(r => (r.id === id ? updated : r)) });
  }

  function removeRank(id) {
    patch({ ranks: group.ranks.filter(r => r.id !== id) });
  }

  return (
    <div style={{ marginBottom: 20, paddingLeft: 4, borderLeft: "2px solid #262b36" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, paddingLeft: 12 }}>
        {editingName ? (
          <input style={{ flex: "1 1 160px" }} value={group.name} onChange={e => patch({ name: e.target.value })} placeholder="Sub-category label (optional)" />
        ) : (
          <strong style={{ flex: "1 1 160px" }}>{group.name || "(unlabeled group)"}</strong>
        )}
        <button className="btn secondary" onClick={() => setEditingName(e => !e)}>{editingName ? "Done" : "Edit label"}</button>
        <span className="muted" style={{ fontSize: 13 }}>Positions:</span>
        <input style={{ width: 60 }} value={positionsInput} onChange={e => setPositionsInput(e.target.value)} onBlur={applyPositions} />
        <button className="btn secondary" onClick={autoCallsigns}>Auto callsigns</button>
        <button className="btn secondary" onClick={onRemove} title="Remove sub-category">✕</button>
      </div>

      {(group.ranks || []).length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#6b7180", fontSize: 12, textTransform: "uppercase" }}>
              <th style={{ padding: "4px 6px" }}>Rank</th>
              <th style={{ padding: "4px 6px" }}>Callsign</th>
              <th style={{ padding: "4px 6px" }}>Name</th>
              <th style={{ padding: "4px 6px" }}>Discord</th>
              <th style={{ padding: "4px 6px" }}>Driver Level</th>
              <th style={{ padding: "4px 6px" }}>Certifications</th>
              <th style={{ padding: "4px 6px" }}>Since</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(group.ranks || []).map(r => (
              <RankRow
                key={r.id}
                post={r}
                sectionId={section.id}
                groupId={group.id}
                roles={roles}
                certCatalog={certCatalog}
                driverLevels={driverLevels}
                members={members}
                onChange={u => updateRank(r.id, u)}
                onRemove={() => removeRank(r.id)}
                onAssign={onAssign}
                onPromote={onPromote}
              />
            ))}
          </tbody>
        </table>
      )}
      <button className="btn secondary" onClick={addRank} style={{ marginTop: 8 }}>+ Add rank</button>
    </div>
  );
}

// ---- Section (category) --------------------------------------------------

function SectionEditor({ section, roles, certCatalog, driverLevels, members, onChange, onRemove, onMoveUp, onMoveDown, onAssign, onPromote }) {
  const [editing, setEditing] = useState(false);

  function patch(fields) {
    onChange({ ...section, ...fields });
  }

  function addGroup() {
    patch({ groups: [...(section.groups || []), { id: newId("group"), name: "", ranks: [] }] });
  }

  function updateGroup(id, updated) {
    patch({ groups: section.groups.map(g => (g.id === id ? updated : g)) });
  }

  function removeGroup(id) {
    const group = section.groups.find(g => g.id === id);
    if (group?.ranks.some(r => r.userId)) {
      alert("This sub-category has filled positions — vacate them first.");
      return;
    }
    if (!confirm(`Delete "${group?.name || "this sub-category"}"? This can't be undone.`)) return;
    patch({ groups: section.groups.filter(g => g.id !== id) });
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: section.color || "#5fb4ff", flexShrink: 0 }} />
        {editing ? (
          <input style={{ flex: "1 1 200px" }} value={section.name} onChange={e => patch({ name: e.target.value })} placeholder="Category name" />
        ) : (
          <h3 style={{ margin: 0, flex: "1 1 200px" }}>{section.name || "Untitled category"}</h3>
        )}
        <button className="btn secondary" onClick={() => setEditing(e => !e)}>{editing ? "Done" : "Edit"}</button>
        <input type="color" value={section.color || "#5fb4ff"} onChange={e => patch({ color: e.target.value })} style={{ width: 36, padding: 2 }} />
        <button className="btn secondary" onClick={onMoveUp} title="Move up">▲</button>
        <button className="btn secondary" onClick={onMoveDown} title="Move down">▼</button>
        <button className="btn secondary" onClick={onRemove} title="Remove category">✕</button>
      </div>

      {editing && (
        <input
          style={{ marginBottom: 10 }}
          placeholder="Description (optional)"
          value={section.description || ""}
          onChange={e => patch({ description: e.target.value })}
        />
      )}

      {(section.groups || []).map(g => (
        <GroupEditor
          key={g.id}
          section={section}
          group={g}
          roles={roles}
          certCatalog={certCatalog}
          driverLevels={driverLevels}
          members={members}
          onChange={u => updateGroup(g.id, u)}
          onRemove={() => removeGroup(g.id)}
          onAssign={onAssign}
          onPromote={onPromote}
        />
      ))}
      <button className="btn secondary" onClick={addGroup}>+ Add sub-category</button>
    </div>
  );
}

// ---- Top level -------------------------------------------------------

export default function RosterEditor({ guildId, sections, onChangeSections, onAssign, roles, certCatalog = [], driverLevels = DEFAULT_DRIVER_LEVELS }) {
  const members = useGuildMembers(guildId);
  const [promoting, setPromoting] = useState(null);

  function addSection() {
    onChangeSections([...sections, { id: newId("section"), name: "", groups: [{ id: newId("group"), name: "", ranks: [] }] }]);
  }

  function updateSection(id, updated) {
    onChangeSections(sections.map(s => (s.id === id ? updated : s)));
  }

  function removeSection(id) {
    const section = sections.find(s => s.id === id);
    const hasFilled = section?.groups.some(g => g.ranks.some(r => r.userId));
    if (hasFilled) { alert("This category has filled positions — vacate them first."); return; }
    if (!confirm(`Delete "${section?.name || "this category"}"? This can't be undone.`)) return;
    onChangeSections(sections.filter(s => s.id !== id));
  }

  function moveSection(id, dir) {
    const i = sections.findIndex(s => s.id === id);
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    onChangeSections(next);
  }

  // Assignment and promotion save+sync immediately (matches "it saves
  // automatically") rather than waiting on the manual Save button.
  const handleAssign = useCallback((sectionId, groupId, rankId, member) => {
    onAssign(applyAssignment(sections, { sectionId, groupId, rankId }, member));
  }, [sections, onAssign]);

  function handlePromoteConfirm(targetSectionId, rank) {
    const placement = findOrCreatePlacement(sections, targetSectionId, rank);
    if (!placement?.groupId) { setPromoting(null); return; }

    let working = sections;
    let rankId = placement.rankId;
    if (placement.created) {
      working = sections.map(s => (
        s.id === targetSectionId
          ? { ...s, groups: s.groups.map(g => (g.id === placement.groupId ? { ...g, ranks: [...g.ranks, { id: newId("rank"), rank, certifications: [], roleIds: [] }] } : g)) }
          : s
      ));
      const newGroup = working.find(s => s.id === targetSectionId).groups.find(g => g.id === placement.groupId);
      rankId = newGroup.ranks[newGroup.ranks.length - 1].id;
    }

    const member = { userId: promoting.userId, username: promoting.discordUsername, displayName: promoting.name };
    onAssign(applyAssignment(working, { sectionId: targetSectionId, groupId: placement.groupId, rankId }, member));
    setPromoting(null);
  }

  return (
    <div>
      {sections.map(s => (
        <SectionEditor
          key={s.id}
          section={s}
          roles={roles}
          certCatalog={certCatalog}
          driverLevels={driverLevels}
          members={members}
          onChange={u => updateSection(s.id, u)}
          onRemove={() => removeSection(s.id)}
          onMoveUp={() => moveSection(s.id, -1)}
          onMoveDown={() => moveSection(s.id, 1)}
          onAssign={handleAssign}
          onPromote={setPromoting}
        />
      ))}
      <button className="btn secondary" onClick={addSection}>+ Add category</button>

      {promoting && (
        <PromoteModal
          sections={sections}
          post={promoting}
          onConfirm={handlePromoteConfirm}
          onClose={() => setPromoting(null)}
        />
      )}
    </div>
  );
}
