import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { apiFetch, loginUrl } from "../../../lib/api";

export default function RequestLoa() {
  const router = useRouter();
  const { guildId, deptId } = router.query;

  const [department, setDepartment] = useState(null);
  const [requests, setRequests] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    if (!guildId || !deptId) return;
    Promise.all([
      apiFetch(`/loa/${guildId}/${deptId}`),
      apiFetch(`/loa/${guildId}/${deptId}/status`),
    ])
      .then(([deptData, statusData]) => {
        setDepartment(deptData.department);
        setRequests(statusData.requests);
      })
      .catch(err => {
        if (err.status === 401) setNeedsLogin(true);
        else setError(err);
      });
  }, [guildId, deptId]);

  useEffect(load, [load]);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/loa/${guildId}/${deptId}`, { method: "POST", body: { startDate, endDate, reason } });
      setStartDate("");
      setEndDate("");
      setReason("");
      load();
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (needsLogin) {
    return (
      <div className="container">
        <div className="card">
          <p>Sign in with Discord to request leave.</p>
          <a className="btn" href={loginUrl({ mode: "identify", returnTo: `/loa/${guildId}/${deptId}` })}>Sign in with Discord</a>
        </div>
      </div>
    );
  }

  if (error) return <div className="container"><div className="card error">{error.body?.message || error.message}</div></div>;
  if (!department || !requests) return <div className="container"><p className="muted">Loading...</p></div>;

  return (
    <div className="container">
      <h1>Request leave — {department.name}</h1>

      <form className="card" onSubmit={submit}>
        <div className="field">
          <label>Start date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
        </div>
        <div className="field">
          <label>End date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
        </div>
        <div className="field">
          <label>Reason (optional)</label>
          <input value={reason} onChange={e => setReason(e.target.value)} />
        </div>
        <button className="btn" type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit request"}</button>
      </form>

      <h2>Your leave requests</h2>
      {requests.length === 0 && <p className="muted">No requests yet.</p>}
      {requests.map(r => (
        <div key={r.id} className="card">
          <strong>{r.start_date} to {r.end_date}</strong> <span className="muted">— {r.status}{r.active ? " — active now" : ""}</span>
          {r.reason && <div className="muted">{r.reason}</div>}
        </div>
      ))}
    </div>
  );
}
