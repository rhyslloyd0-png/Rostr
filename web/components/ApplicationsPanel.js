import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../lib/api";

export function QuestionEditor({ guildId, deptId }) {
  const [fields, setFields] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    apiFetch(`/guilds/${guildId}/departments/${deptId}/data/questions`)
      .then(data => setFields(data.value.fields || []));
  }, [guildId, deptId]);

  function updateField(id, patch) {
    setFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  }

  async function save() {
    setSaving(true);
    try {
      await apiFetch(`/guilds/${guildId}/departments/${deptId}/data/questions`, {
        method: "PUT",
        body: { value: { fields } },
      });
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  if (!fields) return <p className="muted">Loading questions...</p>;

  return (
    <div className="card">
      <h3>Application questions</h3>
      {fields.map(f => (
        <div key={f.id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <input
            style={{ flex: 1 }}
            placeholder="Question label"
            value={f.label}
            onChange={e => updateField(f.id, { label: e.target.value })}
          />
          <select style={{ flex: "0 0 140px" }} value={f.type} onChange={e => updateField(f.id, { type: e.target.value })}>
            <option value="text">Short text</option>
            <option value="textarea">Long text</option>
          </select>
          <button className="btn secondary" onClick={() => setFields(prev => prev.filter(x => x.id !== f.id))}>Remove</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          className="btn secondary"
          onClick={() => setFields(prev => [...prev, { id: `q${Date.now()}`, label: "", type: "text" }])}
        >
          + Add question
        </button>
        <button className="btn" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save questions"}</button>
      </div>
      {savedAt && <p className="muted">Saved.</p>}
    </div>
  );
}

function ApplicationRow({ app, onDecide }) {
  const [feedback, setFeedback] = useState(app.feedback || "");
  const [busy, setBusy] = useState(false);

  async function decide(status) {
    setBusy(true);
    try {
      await onDecide(app.id, status, feedback);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <strong>{app.display_name}</strong> <span className="muted">({app.user_id}) — {app.status}</span>
      <div style={{ margin: "8px 0" }}>
        {Object.entries(app.answers || {}).map(([q, a]) => (
          <div key={q} style={{ marginBottom: 4 }}>
            <div className="muted">{q}</div>
            <div>{a}</div>
          </div>
        ))}
      </div>
      {app.status === "pending" && (
        <>
          <input placeholder="Feedback (optional)" value={feedback} onChange={e => setFeedback(e.target.value)} style={{ marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" disabled={busy} onClick={() => decide("approved")}>Approve</button>
            <button className="btn secondary" disabled={busy} onClick={() => decide("denied")}>Deny</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ApplicationsPanel({ guildId, deptId, showQuestionEditor = true }) {
  const [applications, setApplications] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    apiFetch(`/guilds/${guildId}/departments/${deptId}/applications`)
      .then(data => setApplications(data.applications))
      .catch(setError);
  }, [guildId, deptId]);

  useEffect(load, [load]);

  async function decide(appId, status, feedback) {
    await apiFetch(`/guilds/${guildId}/departments/${deptId}/applications/${appId}`, {
      method: "PATCH",
      body: { status, feedback },
    });
    load();
  }

  return (
    <div>
      <h2>Applications</h2>
      {showQuestionEditor && <QuestionEditor guildId={guildId} deptId={deptId} />}

      {error && <div className="card error">{error.body?.message || error.message}</div>}
      {!applications && !error && <p className="muted">Loading applications...</p>}
      {applications && applications.length === 0 && <p className="muted">No applications yet.</p>}
      {applications && applications.map(app => <ApplicationRow key={app.id} app={app} onDecide={decide} />)}
    </div>
  );
}
