import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "../../../../lib/api";
import ApplicationsPanel from "../../../../components/ApplicationsPanel";

let slotIdCounter = 0;
function newSlot() {
  slotIdCounter += 1;
  return { id: `new-${Date.now()}-${slotIdCounter}`, title: "", userId: "", displayName: "" };
}

function MemberPicker({ guildId, onPick }) {
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

export default function DepartmentPage() {
  const router = useRouter();
  const { guildId, deptId } = router.query;

  const [department, setDepartment] = useState(null);
  const [plan, setPlan] = useState(null);
  const [slots, setSlots] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(() => {
    if (!guildId || !deptId) return;
    Promise.all([
      apiFetch(`/guilds/${guildId}/departments/${deptId}`),
      apiFetch(`/guilds/${guildId}/departments/${deptId}/data/roster`),
      apiFetch(`/guilds/${guildId}`),
    ])
      .then(([deptData, rosterData, guildData]) => {
        setDepartment(deptData.department);
        setSlots(rosterData.value.slots || []);
        setPlan(guildData.plan);
      })
      .catch(setError);
  }, [guildId, deptId]);

  useEffect(load, [load]);

  function updateSlot(id, patch) {
    setSlots(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeSlot(id) {
    setSlots(prev => prev.filter(s => s.id !== id));
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      await apiFetch(`/guilds/${guildId}/departments/${deptId}/data/roster`, {
        method: "PUT",
        body: { value: { slots } },
      });
      setStatus({ type: "ok", message: "Roster saved." });
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function sync() {
    setSyncing(true);
    setStatus(null);
    try {
      const result = await apiFetch(`/guilds/${guildId}/departments/${deptId}/roster/sync`, { method: "POST" });
      setStatus({
        type: result.failed.length ? "error" : "ok",
        message: `Synced ${result.synced} member${result.synced === 1 ? "" : "s"}.` +
          (result.failed.length ? ` Failed for ${result.failed.length}.` : ""),
      });
    } catch (err) {
      setStatus({ type: "error", message: err.body?.message || err.message });
    } finally {
      setSyncing(false);
    }
  }

  if (error) return <div className="container"><div className="card error">{error.body?.message || error.message}</div></div>;
  if (!department || !slots) return <div className="container"><p className="muted">Loading...</p></div>;

  return (
    <div className="container">
      <h1>{department.name}</h1>
      <div className="card">
        <p className="muted">Access role: {department.access_role_id || "none set"}</p>
        <p className="muted">Staff role: {department.staff_role_id || "none set — set one to enable role sync"}</p>
      </div>

      <h2>Roster</h2>
      {status && <div className="card" style={{ borderColor: status.type === "error" ? "#f28b82" : undefined }}>{status.message}</div>}

      <div className="card">
        {slots.map(slot => (
          <div key={slot.id} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
            <input
              style={{ flex: "0 0 160px" }}
              placeholder="Post / rank"
              value={slot.title}
              onChange={e => updateSlot(slot.id, { title: e.target.value })}
            />
            <div style={{ flex: 1 }}>
              {slot.userId ? (
                <div className="muted">
                  {slot.displayName} <span style={{ opacity: 0.6 }}>({slot.userId})</span>{" "}
                  <a href="#" onClick={e => { e.preventDefault(); updateSlot(slot.id, { userId: "", displayName: "" }); }}>change</a>
                </div>
              ) : (
                <MemberPicker guildId={guildId} onPick={m => updateSlot(slot.id, { userId: m.userId, displayName: m.displayName })} />
              )}
            </div>
            <button className="btn secondary" onClick={() => removeSlot(slot.id)}>Remove</button>
          </div>
        ))}

        <button className="btn secondary" onClick={() => setSlots(prev => [...prev, newSlot()])}>+ Add slot</button>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save roster"}</button>
        <button className="btn secondary" disabled={syncing || !department.staff_role_id} onClick={sync}>
          {syncing ? "Syncing..." : "Sync Discord roles"}
        </button>
      </div>

      <div style={{ marginTop: 32 }}>
        {plan?.features?.applications ? (
          <ApplicationsPanel guildId={guildId} deptId={deptId} />
        ) : (
          <div className="card">
            <p className="muted">Applications aren't available on the {plan?.key} plan. Upgrade from the guild dashboard to enable them.</p>
          </div>
        )}
      </div>
    </div>
  );
}
