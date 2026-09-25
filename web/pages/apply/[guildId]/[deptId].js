import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch, loginUrl } from "../../../lib/api";
import AppHeader from "../../../components/AppHeader";

export default function ApplyDepartment() {
  const router = useRouter();
  const { guildId, deptId } = router.query;

  const [department, setDepartment] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [myApplications, setMyApplications] = useState(null);
  const [answers, setAnswers] = useState({});
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!guildId || !deptId) return;
    Promise.all([
      apiFetch(`/apply/${guildId}/${deptId}`),
      apiFetch(`/apply/${guildId}/${deptId}/status`),
    ])
      .then(([deptData, statusData]) => {
        setDepartment(deptData.department);
        setQuestions(deptData.questions);
        setMyApplications(statusData.applications);
      })
      .catch(err => {
        if (err.status === 401) setNeedsLogin(true);
        else setError(err);
      });
  }, [guildId, deptId]);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/apply/${guildId}/${deptId}`, { method: "POST", body: { answers } });
      setSubmitted(true);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (needsLogin) {
    return (
      <>
        <AppHeader guildId={guildId} activeDeptSlug={deptId} />
        <div className="container">
          <div className="card">
            <p>Sign in with Discord to apply.</p>
            <a className="btn" href={loginUrl({ mode: "identify", returnTo: `/apply/${guildId}/${deptId}` })}>Sign in with Discord</a>
          </div>
        </div>
      </>
    );
  }

  if (error) return <><AppHeader guildId={guildId} activeDeptSlug={deptId} /><div className="container"><div className="card error">{error.body?.message || error.message}</div></div></>;
  if (!department || !questions || !myApplications) return <><AppHeader guildId={guildId} activeDeptSlug={deptId} /><div className="container"><div className="page-loading"><span className="spinner" /> Loading…</div></div></>;

  const pending = myApplications.find(a => a.status === "pending");

  return (
    <>
    <AppHeader guildId={guildId} activeDeptSlug={deptId} />
    <div className="container">
      <h1>Apply — {department.name}</h1>

      {myApplications.length > 0 && (
        <div className="card">
          <h3>Your applications</h3>
          {myApplications.map(a => (
            <div key={a.id} style={{ marginBottom: 8 }}>
              <strong>{a.status}</strong> — submitted {new Date(a.submitted_at).toLocaleDateString()}
              {a.feedback && <div className="muted">Feedback: {a.feedback}</div>}
            </div>
          ))}
        </div>
      )}

      {submitted && <div className="card">Application submitted.</div>}

      {!submitted && !pending && (
        <form className="card" onSubmit={submit}>
          {questions.length === 0 && <p className="muted">This department hasn't set up any questions yet — submit to apply anyway.</p>}
          {questions.map(q => (
            <div className="field" key={q.id}>
              <label>{q.label}</label>
              {q.type === "textarea" ? (
                <textarea
                  rows={4}
                  style={{ width: "100%", background: "#0f1115", color: "#e8e9ec", border: "1px solid #333947", borderRadius: 6, padding: 8 }}
                  value={answers[q.label] || ""}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.label]: e.target.value }))}
                />
              ) : (
                <input
                  value={answers[q.label] || ""}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.label]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <button className="btn" type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit application"}</button>
        </form>
      )}

      {pending && !submitted && <div className="card">You already have a pending application for this department.</div>}
    </div>
    </>
  );
}
