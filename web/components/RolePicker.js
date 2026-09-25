// Multi-select checkbox list of a guild's live Discord roles — used
// wherever a rank needs more than one role attached to it (e.g. a staff
// role plus a command-tier badge role).
export default function RolePicker({ roles, selected, onChange }) {
  function toggle(roleId) {
    onChange(selected.includes(roleId) ? selected.filter(id => id !== roleId) : [...selected, roleId]);
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxWidth: 280 }}>
      {roles.map(r => (
        <label
          key={r.id}
          style={{
            display: "flex", alignItems: "center", gap: 4, fontSize: 12,
            background: selected.includes(r.id) ? "#26304a" : "#171a21",
            border: "1px solid #333947", borderRadius: 999, padding: "2px 8px", cursor: "pointer",
          }}
        >
          <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} style={{ width: "auto" }} />
          {r.name}
        </label>
      ))}
    </div>
  );
}
