import { useState } from "react";
import MemberPicker from "./MemberPicker";
import RolePicker from "./RolePicker";

let idCounter = 0;
function newId(prefix) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function RankRow({ rank, roles, onChange, onRemove }) {
  const [showRoles, setShowRoles] = useState(false);

  function patch(fields) {
    onChange({ ...rank, ...fields });
  }

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <input style={{ flex: "1 1 160px" }} placeholder="Rank title" value={rank.rank} onChange={e => patch({ rank: e.target.value })} />
        <input style={{ flex: "0 1 100px" }} placeholder="Callsign" value={rank.callsign || ""} onChange={e => patch({ callsign: e.target.value })} />
        <input style={{ flex: "0 1 120px" }} placeholder="Driver level" value={rank.driverLevel || ""} onChange={e => patch({ driverLevel: e.target.value })} />
        <input
          style={{ flex: "0 1 130px" }}
          type="date"
          value={rank.since || ""}
          onChange={e => patch({ since: e.target.value })}
        />
        <button className="btn secondary" onClick={onRemove}>Remove</button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        {rank.userId ? (
          <div className="muted">
            {rank.name || rank.discordUsername} <span style={{ opacity: 0.6 }}>({rank.userId})</span>{" "}
            <a href="#" onClick={e => { e.preventDefault(); patch({ userId: "", displayName: "", discordUsername: "" }); }}>change</a>
          </div>
        ) : (
          <MemberPicker
            guildId={rank._guildId}
            onPick={m => patch({ userId: m.userId, discordUsername: m.username, name: rank.name || m.displayName })}
          />
        )}
        {rank.userId && (
          <input
            style={{ flex: "0 1 180px" }}
            placeholder="In-character name"
            value={rank.name || ""}
            onChange={e => patch({ name: e.target.value })}
          />
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <input
          style={{ flex: "1 1 200px" }}
          placeholder="Certifications, comma separated"
          value={(rank.certifications || []).join(", ")}
          onChange={e => patch({ certifications: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
        />
      </div>

      <div>
        <a href="#" onClick={e => { e.preventDefault(); setShowRoles(s => !s); }}>
          {showRoles ? "Hide" : "Set"} extra Discord roles for this rank ({(rank.roleIds || []).length})
        </a>
        {showRoles && (
          <div style={{ marginTop: 8 }}>
            <RolePicker roles={roles} selected={rank.roleIds || []} onChange={roleIds => patch({ roleIds })} />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionEditor({ section, roles, guildId, onChange, onRemove }) {
  function patch(fields) {
    onChange({ ...section, ...fields });
  }

  function addRank() {
    patch({ ranks: [...(section.ranks || []), { id: newId("rank"), rank: "", certifications: [], roleIds: [] }] });
  }

  function updateRank(id, updated) {
    patch({ ranks: section.ranks.map(r => (r.id === id ? updated : r)) });
  }

  function removeRank(id) {
    patch({ ranks: section.ranks.filter(r => r.id !== id) });
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input style={{ flex: 1 }} placeholder="Section name (e.g. Gold Command)" value={section.name} onChange={e => patch({ name: e.target.value })} />
        <input type="color" value={section.color || "#5fb4ff"} onChange={e => patch({ color: e.target.value })} style={{ width: 44 }} />
        <button className="btn secondary" onClick={onRemove}>Remove section</button>
      </div>
      <input
        style={{ marginBottom: 10 }}
        placeholder="Description (optional)"
        value={section.description || ""}
        onChange={e => patch({ description: e.target.value })}
      />

      {(section.ranks || []).map(r => (
        <RankRow key={r.id} rank={{ ...r, _guildId: guildId }} roles={roles} onChange={u => updateRank(r.id, u)} onRemove={() => removeRank(r.id)} />
      ))}
      <button className="btn secondary" onClick={addRank}>+ Add rank</button>
    </div>
  );
}

export default function RosterEditor({ guildId, sections, onChangeSections, roles }) {
  function addSection() {
    onChangeSections([...sections, { id: newId("section"), name: "", ranks: [] }]);
  }

  function updateSection(id, updated) {
    onChangeSections(sections.map(s => (s.id === id ? updated : s)));
  }

  function removeSection(id) {
    onChangeSections(sections.filter(s => s.id !== id));
  }

  return (
    <div>
      {sections.map(s => (
        <SectionEditor
          key={s.id}
          section={s}
          roles={roles}
          guildId={guildId}
          onChange={u => updateSection(s.id, u)}
          onRemove={() => removeSection(s.id)}
        />
      ))}
      <button className="btn secondary" onClick={addSection}>+ Add section</button>
    </div>
  );
}
