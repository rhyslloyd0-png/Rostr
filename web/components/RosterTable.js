import { useState } from "react";

function PostRow({ post }) {
  const filled = !!post.userId;
  return (
    <tr>
      <td className="rank-cell">{post.rank}</td>
      <td className="callsign-cell">{post.callsign || "—"}</td>
      <td className={filled ? "name-cell" : "name-cell vacant"}>{filled ? (post.name || "—") : "Vacant"}</td>
      <td className="discord-cell">{filled ? (post.discordUsername ? `@${post.discordUsername}` : post.userId) : "—"}</td>
      <td className="muted">{post.driverLevel || "—"}</td>
      <td>
        {(post.certifications || []).length
          ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {post.certifications.map(c => <span key={c} className="tag">{c}</span>)}
            </div>
          )
          : <span className="muted">—</span>}
      </td>
      <td className="since-cell">{post.since || "—"}</td>
    </tr>
  );
}

function Group({ group }) {
  const ranks = group.ranks || [];
  if (!ranks.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      {group.name && <div className="roster-group-label" style={{ paddingLeft: 24 }}>{group.name}</div>}
      <div className="roster-table-wrap">
        <table className="roster-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Callsign</th>
              <th>Name</th>
              <th>Discord</th>
              <th>Driver Level</th>
              <th>Certifications</th>
              <th>Since</th>
            </tr>
          </thead>
          <tbody>
            {ranks.map(r => <PostRow key={r.id} post={r} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Section({ section }) {
  const [open, setOpen] = useState(true);
  const groups = section.groups || [];

  return (
    <div id={`section-${section.id}`} style={{ marginBottom: 28, scrollMarginTop: 80 }}>
      <div className="roster-section-head" style={{ cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
        <span style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", display: "inline-block", transition: "transform 0.15s", color: "#6b7180" }}>▾</span>
        <span className="roster-section-mark" style={{ background: section.color || "#5fb4ff" }} />
        <h3 className="roster-section-title">{section.name}</h3>
      </div>
      {section.description && <p className="muted" style={{ margin: "4px 0 14px 28px" }}>{section.description}</p>}

      {open && <div style={{ marginTop: 12 }}>{groups.map(g => <Group key={g.id} group={g} />)}</div>}
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
