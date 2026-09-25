import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function MemberPicker({ guildId, onPick }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(() => {
      apiFetch(`/guilds/${guildId}/members/search?q=${encodeURIComponent(query)}`)
        .then(data => setResults(data.members))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, guildId]);

  return (
    <div style={{ position: "relative" }}>
      <input
        placeholder="Search Discord members..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {results.length > 0 && (
        <div className="card" style={{ position: "absolute", zIndex: 10, width: "100%", padding: 4, marginTop: 2 }}>
          {results.map(m => (
            <div
              key={m.userId}
              style={{ padding: "6px 8px", cursor: "pointer" }}
              onClick={() => { onPick(m); setQuery(""); setResults([]); }}
            >
              {m.displayName} <span className="muted">@{m.username}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
