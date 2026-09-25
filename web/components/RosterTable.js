import { useState } from "react";

function Section({ section }) {
  const [open, setOpen] = useState(true);
  const ranks = section.ranks || [];

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
        <span style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", display: "inline-block", transition: "transform 0.15s" }}>▾</span>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: section.color || "#5fb4ff", display: "inline-block" }} />
        <h3 style={{ margin: 0 }}>{section.name}</h3>
      </div>
      {section.description && <p className="muted" style={{ margin: "4px 0 12px 24px" }}>{section.description}</p>}

      {open && ranks.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#6b7180", fontSize: 12, textTransform: "uppercase" }}>
              <th style={{ padding: "4px 8px" }}>Rank</th>
              <th style={{ padding: "4px 8px" }}>Callsign</th>
              <th style={{ padding: "4px 8px" }}>Name</th>
              <th style={{ padding: "4px 8px" }}>Discord</th>
              <th style={{ padding: "4px 8px" }}>Driver Level</th>
              <th style={{ padding: "4px 8px" }}>Certifications</th>
              <th style={{ padding: "4px 8px" }}>Since</th>
            </tr>
          </thead>
          <tbody>
            {ranks.map(r => (
              <tr key={r.id} style={{ borderTop: "1px solid #262b36" }}>
                <td style={{ padding: "8px" }}>{r.rank}</td>
                <td style={{ padding: "8px", color: "#5fb4ff" }}>{r.callsign || "—"}</td>
                <td style={{ padding: "8px" }}>{r.userId ? (r.name || "—") : <span className="muted">Vacant</span>}</td>
                <td style={{ padding: "8px" }} className="muted">{r.userId ? (r.discordUsername ? `@${r.discordUsername}` : r.userId) : "—"}</td>
                <td style={{ padding: "8px" }} className="muted">{r.driverLevel || "—"}</td>
                <td style={{ padding: "8px" }}>
                  {(r.certifications || []).length
                    ? r.certifications.map(c => (
                        <span key={c} className="tag" style={{ marginRight: 4 }}>{c}</span>
                      ))
                    : <span className="muted">—</span>}
                </td>
                <td style={{ padding: "8px" }} className="muted">{r.since || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function RosterTable({ sections }) {
  const allRanks = sections.flatMap(s => s.ranks || []);
  const filled = allRanks.filter(r => r.userId).length;
  const total = allRanks.length;

  return (
    <div>
      <div className="card" style={{ display: "flex", gap: 20 }}>
        <div><strong>{filled}</strong> <span className="muted">filled</span></div>
        <div><strong>{total - filled}</strong> <span className="muted">vacant</span></div>
        <div><strong>{total}</strong> <span className="muted">total</span></div>
      </div>

      {sections.length === 0 && <p className="muted">No roster structure set up yet.</p>}
      {sections.map(s => <Section key={s.id} section={s} />)}
    </div>
  );
}
