import { useState } from "react";

function PostRow({ post }) {
  const filled = !!post.userId;
  return (
    <tr style={{ borderTop: "1px solid #262b36" }}>
      <td style={{ padding: "8px" }}>{post.rank}</td>
      <td style={{ padding: "8px", color: "#e0a640", fontFamily: "monospace" }}>{post.callsign || "—"}</td>
      <td style={{ padding: "8px" }}>{filled ? (post.name || "—") : <span className="muted" style={{ fontStyle: "italic" }}>Vacant</span>}</td>
      <td style={{ padding: "8px" }} className="muted">{filled ? (post.discordUsername ? `@${post.discordUsername}` : post.userId) : "—"}</td>
      <td style={{ padding: "8px" }} className="muted">{post.driverLevel || "—"}</td>
      <td style={{ padding: "8px" }}>
        {(post.certifications || []).length
          ? post.certifications.map(c => (
              <span key={c} className="tag" style={{ marginRight: 4 }}>{c}</span>
            ))
          : <span className="muted">—</span>}
      </td>
      <td style={{ padding: "8px" }} className="muted">{post.since || "—"}</td>
    </tr>
  );
}

function Group({ group }) {
  const ranks = group.ranks || [];
  if (!ranks.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      {group.name && <div className="muted" style={{ fontSize: 13, fontWeight: 600, margin: "8px 0 4px 24px" }}>{group.name}</div>}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 4 }}>
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
          {ranks.map(r => <PostRow key={r.id} post={r} />)}
        </tbody>
      </table>
    </div>
  );
}

function Section({ section }) {
  const [open, setOpen] = useState(true);
  const groups = section.groups || [];

  return (
    <div id={`section-${section.id}`} style={{ marginBottom: 24, scrollMarginTop: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
        <span style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", display: "inline-block", transition: "transform 0.15s" }}>▾</span>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: section.color || "#5fb4ff", display: "inline-block" }} />
        <h3 style={{ margin: 0 }}>{section.name}</h3>
      </div>
      {section.description && <p className="muted" style={{ margin: "4px 0 12px 24px" }}>{section.description}</p>}

      {open && groups.map(g => <Group key={g.id} group={g} />)}
    </div>
  );
}

export function rosterStats(sections) {
  const allRanks = sections.flatMap(s => (s.groups || []).flatMap(g => g.ranks || []));
  return { filled: allRanks.filter(r => r.userId).length, total: allRanks.length };
}

export default function RosterTable({ sections }) {
  return (
    <div>
      {sections.length === 0 && <p className="muted">No roster structure set up yet.</p>}
      {sections.map(s => <Section key={s.id} section={s} />)}
    </div>
  );
}
