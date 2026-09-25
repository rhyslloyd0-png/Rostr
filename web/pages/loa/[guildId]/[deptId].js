import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { apiFetch, loginUrl } from "../../../lib/api";
import AppHeader from "../../../components/AppHeader";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Use UTC getters — the date arrives as midnight UTC, so local getters would
// show the previous day in any timezone behind UTC.
function formatDate(d) {
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTH_NAMES[d.getUTCMonth()].slice(0, 4)} ${d.getUTCFullYear()}`;
}

// DATE columns come back from the API as full ISO timestamps (Postgres
// returns JS Date objects, which JSON.stringify serializes with a "Z"
// suffix) — parse directly rather than appending a time part onto them.
function formatRange(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return `${formatDate(start)} → ${formatDate(end)}`;
}

// Monday-first month grid: leading blanks for days before the 1st, one cell
// per day of the month, no trailing-week padding (matches the reference —
// short final rows are fine, no need to bleed into next month's dates).
function buildMonthCells(year, month) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7; // 0=Mon
  const cells = Array(leading).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function LeaveCard({ request, canCancel, onCancel }) {
  const cancelled = request.status === "cancelled";
  return (
    <div className="card leave-card">
      <div className="leave-card-head">
        <strong>{request.display_name}</strong>
        <span className="pill leave-range-pill">{formatRange(request.start_date, request.end_date)}</span>
        {cancelled && <span className="pill pill-amber">Cancelled</span>}
        {!cancelled && request.status !== "approved" && <span className="pill pill-amber">{request.status}</span>}
        {canCancel && !cancelled && (
          <button className="btn secondary" style={{ marginLeft: "auto" }} onClick={() => onCancel(request.id)}>Cancel</button>
        )}
      </div>
      {request.reason && <p className="muted" style={{ margin: "10px 0 0" }}>{request.reason}</p>}
      {cancelled && request.cancelled_by && (
        <p className="muted" style={{ margin: "10px 0 0", fontSize: 12, textTransform: "uppercase" }}>
          Cancelled by {request.cancelled_by}
        </p>
      )}
    </div>
  );
}

export default function RequestLoa() {
  const router = useRouter();
  const { guildId, deptId } = router.query;

  const [department, setDepartment] = useState(null);
  const [requests, setRequests] = useState(null);
  const [deptRequests, setDeptRequests] = useState(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const load = useCallback(() => {
    if (!guildId || !deptId) return;
    Promise.all([
      apiFetch(`/loa/${guildId}/${deptId}`),
      apiFetch(`/loa/${guildId}/${deptId}/status`),
      apiFetch(`/loa/${guildId}/${deptId}/department`),
    ])
      .then(([deptData, statusData, deptLeave]) => {
        setDepartment(deptData.department);
        setRequests(statusData.requests);
        setDeptRequests(deptLeave.requests);
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
      setShowBookModal(false);
      load();
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRequest(id) {
    await apiFetch(`/loa/${guildId}/${deptId}/${id}/cancel`, { method: "POST" }).catch(() => {});
    load();
  }

  if (needsLogin) {
    return (
      <>
        <AppHeader guildId={guildId} activeDeptSlug={deptId} />
        <div className="container">
          <div className="card">
            <p>Sign in with Discord to request leave.</p>
            <a className="btn" href={loginUrl({ mode: "identify", returnTo: `/loa/${guildId}/${deptId}` })}>Sign in with Discord</a>
          </div>
        </div>
      </>
    );
  }

  if (error) return <><AppHeader guildId={guildId} activeDeptSlug={deptId} /><div className="container"><div className="card error">{error.body?.message || error.message}</div></div></>;
  if (!department || !requests || !deptRequests) return <><AppHeader guildId={guildId} activeDeptSlug={deptId} /><div className="container"><p className="muted">Loading...</p></div></>;

  const cells = buildMonthCells(viewYear, viewMonth);
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  return (
    <>
    <AppHeader guildId={guildId} activeDeptSlug={deptId} />
    <div className="container wide">
      <div className="loa-cal-header">
        <div className="loa-cal-nav">
          <button className="btn secondary icon-btn" onClick={prevMonth}>&#9664;</button>
          <h1 style={{ margin: 0 }}>{MONTH_NAMES[viewMonth]} {viewYear}</h1>
          <button className="btn secondary icon-btn" onClick={nextMonth}>&#9654;</button>
        </div>
        <button className="btn loa-book-btn" onClick={() => setShowBookModal(true)}>Book leave</button>
      </div>

      <div className="loa-cal-grid">
        {WEEKDAYS.map(w => <div key={w} className="loa-cal-weekday">{w}</div>)}
        {cells.map((day, i) => {
          const isToday = isCurrentMonth && day === today.getDate();
          return (
            <div key={i} className={`loa-cal-cell${day ? "" : " loa-cal-cell-empty"}${isToday ? " loa-cal-cell-today" : ""}`}>
              {day && <span className="loa-cal-daynum">{day}</span>}
            </div>
          );
        })}
      </div>

      {showBookModal && (
        <div className="modal-backdrop" onClick={() => setShowBookModal(false)}>
          <div className="card modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Book leave</h2>
            <form onSubmit={submit}>
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
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn" type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit request"}</button>
                <button className="btn secondary" type="button" onClick={() => setShowBookModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <h2 className="loa-section-title">Your leave</h2>
      {requests.length === 0 && <p className="muted">No requests yet.</p>}
      {requests.map(r => <LeaveCard key={r.id} request={r} canCancel onCancel={cancelRequest} />)}

      <h2 className="loa-section-title">Department leave</h2>
      {deptRequests.length === 0 && <p className="muted">No one else has leave on record.</p>}
      {deptRequests.map(r => <LeaveCard key={r.id} request={r} />)}
    </div>
    </>
  );
}
