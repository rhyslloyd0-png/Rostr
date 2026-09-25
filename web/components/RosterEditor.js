import { useState } from "react";
import MemberPicker from "./MemberPicker";
import RolePicker from "./RolePicker";

let idCounter = 0;
function newId(prefix) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

const DRIVER_LEVELS = ["1", "2", "3", "4", "5"];

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

function RankRow({ rank, roles, certCatalog, guildId, onChange, onRemove }) {
  const [showRoles, setShowRoles] = useState(false);

  function patch(fields) {
    onChange({ ...rank, ...fields });
  }

  function toggleCert(c) {
    const current = rank.certifications || [];
    patch({ certifications: current.includes(c) ? current.filter(x => x !== c) : [...current, c] });
  }

  return (
    <>
      <tr style={{ borderTop: "1px solid #262b36" }}>
        <td style={{ padding: 6 }}>
          <input style={{ minWidth: 140 }} value={rank.rank} onChange={e => patch({ rank: e.target.value })} placeholder="Rank title" />
        </td>
        <td style={{ padding: 6 }}>
          <input style={{ width: 90 }} value={rank.callsign || ""} onChange={e => patch({ callsign: e.target.value })} placeholder="—" />
        </td>
        <td style={{ padding: 6, minWidth: 160 }}>
          {rank.userId ? (
            <div className="muted" style={{ fontSize: 13 }}>
              {rank.name || rank.discordUsername}{" "}
              <a href="#" onClick={e => { e.preventDefault(); patch({ userId: "", name: "", discordUsername: "" }); }}>change</a>
            </div>
          ) : (
            <MemberPicker guildId={guildId} onPick={m => patch({ userId: m.userId, discordUsername: m.username, name: rank.name || m.displayName })} />
          )}
        </td>
        <td style={{ padding: 6 }} className="muted">{rank.userId ? (rank.discordUsername ? `@${rank.discordUsername}` : rank.userId) : "—"}</td>
        <td style={{ padding: 6 }}>
          <select style={{ width: 70 }} value={rank.driverLevel || ""} onChange={e => patch({ driverLevel: e.target.value })}>
            <option value="">—</option>
            {DRIVER_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </td>
        <td style={{ padding: 6, minWidth: 180 }}>
          <CertPills catalog={certCatalog} selected={rank.certifications || []} onToggle={toggleCert} />
        </td>
        <td style={{ padding: 6 }}>
          <input style={{ width: 130 }} type="date" value={rank.since || ""} onChange={e => patch({ since: e.target.value })} />
        </td>
        <td style={{ padding: 6 }}>
          <button className="btn secondary" onClick={onRemove} title="Remove rank" style={{ padding: "4px 10px" }}>✕</button>
        </td>
      </tr>
      <tr>
        <td colSpan={8} style={{ padding: "0 6px 8px" }}>
          <a href="#" onClick={e => { e.preventDefault(); setShowRoles(s => !s); }} style={{ fontSize: 12 }}>
            {showRoles ? "Hide" : "Extra roles"} ({(rank.roleIds || []).length})
          </a>
          {showRoles && <div style={{ marginTop: 6 }}><RolePicker roles={roles} selected={rank.roleIds || []} onChange={roleIds => patch({ roleIds })} /></div>}
        </td>
      </tr>
    </>
  );
}

function SectionEditor({ section, roles, certCatalog, guildId, onChange, onRemove, onMoveUp, onMoveDown }) {
  const [editing, setEditing] = useState(false);
  const [positionsInput, setPositionsInput] = useState(String((section.ranks || []).length));

  function patch(fields) {
    onChange({ ...section, ...fields });
  }

  function addRank() {
    patch({ ranks: [...(section.ranks || []), { id: newId("rank"), rank: "", certifications: [], roleIds: [] }] });
  }

  function applyPositions() {
    const target = Math.max(0, parseInt(positionsInput, 10) || 0);
    const current = section.ranks || [];
    if (target > current.length) {
      const additions = Array.from({ length: target - current.length }, () => ({ id: newId("rank"), rank: "", certifications: [], roleIds: [] }));
      patch({ ranks: [...current, ...additions] });
    } else if (target < current.length) {
      // Only trims trailing vacant ranks, so this never silently deletes someone's assignment.
      let ranks = [...current];
      while (ranks.length > target && !ranks[ranks.length - 1].userId) ranks.pop();
      patch({ ranks });
    }
  }

  function autoCallsigns() {
    const prefix = (section.name || "SEC").slice(0, 3).toUpperCase();
    patch({ ranks: (section.ranks || []).map((r, i) => ({ ...r, callsign: `${prefix}-${String(i + 1).padStart(2, "0")}` })) });
  }

  function updateRank(id, updated) {
    patch({ ranks: section.ranks.map(r => (r.id === id ? updated : r)) });
  }

  function removeRank(id) {
    patch({ ranks: section.ranks.filter(r => r.id !== id) });
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: section.color || "#5fb4ff", flexShrink: 0 }} />
        {editing ? (
          <input style={{ flex: "1 1 200px" }} value={section.name} onChange={e => patch({ name: e.target.value })} placeholder="Section name" />
        ) : (
          <h3 style={{ margin: 0, flex: "1 1 200px" }}>{section.name || "Untitled section"}</h3>
        )}
        <button className="btn secondary" onClick={() => setEditing(e => !e)}>{editing ? "Done" : "Edit"}</button>
        <input type="color" value={section.color || "#5fb4ff"} onChange={e => patch({ color: e.target.value })} style={{ width: 36, padding: 2 }} />
        <button className="btn secondary" onClick={onMoveUp} title="Move up">▲</button>
        <button className="btn secondary" onClick={onMoveDown} title="Move down">▼</button>
        <button className="btn secondary" onClick={onRemove} title="Remove section">✕</button>
      </div>

      {editing && (
        <input
          style={{ marginBottom: 10 }}
          placeholder="Description (optional)"
          value={section.description || ""}
          onChange={e => patch({ description: e.target.value })}
        />
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <span className="muted" style={{ fontSize: 13 }}>Positions:</span>
        <input style={{ width: 60 }} value={positionsInput} onChange={e => setPositionsInput(e.target.value)} onBlur={applyPositions} />
        <button className="btn secondary" onClick={autoCallsigns}>Auto callsigns</button>
      </div>

      {(section.ranks || []).length > 0 && (
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
            {(section.ranks || []).map(r => (
              <RankRow
                key={r.id}
                rank={r}
                roles={roles}
                certCatalog={certCatalog}
                guildId={guildId}
                onChange={u => updateRank(r.id, u)}
                onRemove={() => removeRank(r.id)}
              />
            ))}
          </tbody>
        </table>
      )}
      <button className="btn secondary" onClick={addRank} style={{ marginTop: 8 }}>+ Add rank</button>
    </div>
  );
}

export default function RosterEditor({ guildId, sections, onChangeSections, roles, certCatalog = [] }) {
  function addSection() {
    onChangeSections([...sections, { id: newId("section"), name: "", ranks: [] }]);
  }

  function updateSection(id, updated) {
    onChangeSections(sections.map(s => (s.id === id ? updated : s)));
  }

  function removeSection(id) {
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

  return (
    <div>
      {sections.map(s => (
        <SectionEditor
          key={s.id}
          section={s}
          roles={roles}
          certCatalog={certCatalog}
          guildId={guildId}
          onChange={u => updateSection(s.id, u)}
          onRemove={() => removeSection(s.id)}
          onMoveUp={() => moveSection(s.id, -1)}
          onMoveDown={() => moveSection(s.id, 1)}
        />
      ))}
      <button className="btn secondary" onClick={addSection}>+ Add section</button>
    </div>
  );
}
