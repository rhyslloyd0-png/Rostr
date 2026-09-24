import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../lib/api";

function LoaRow({ request, onDecide }) {
  const [busy, setBusy] = useState(false);

  async function decide(status) {
    setBusy(true);
    try {
      await onDecide(request.id, status);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <strong>{request.display_name}</strong> <span className="muted">({request.user_id})</span>
      <div className="muted">{request.start_date} to {request.end_date} — {request.status}{request.active ? " — active now" : ""}</div>
      {request.reason && <div style={{ marginTop: 4 }}>{request.reason}</div>}
      {request.status === "pending" && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn" disabled={busy} onClick={() => decide("approved")}>Approve</button>
          <button className="btn secondary" disabled={busy} onClick={() => decide("denied")}>Deny</button>
        </div>
      )}
    </div>
  );
}

export default function LoaPanel({ guildId, deptId }) {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    apiFetch(`/guilds/${guildId}/departments/${deptId}/loa`)
      .then(data => setRequests(data.requests))
      .catch(setError);
  }, [guildId, deptId]);

  useEffect(load, [load]);

  async function decide(id, status) {
    await apiFetch(`/guilds/${guildId}/departments/${deptId}/loa/${id}`, { method: "PATCH", body: { status } });
    load();
  }

  return (
    <div>
      <h2>Leave of absence</h2>
      {error && <div className="card error">{error.body?.message || error.message}</div>}
      {!requests && !error && <p className="muted">Loading requests...</p>}
      {requests && requests.length === 0 && <p className="muted">No leave requests yet.</p>}
      {requests && requests.map(r => <LoaRow key={r.id} request={r} onDecide={decide} />)}
    </div>
  );
}
