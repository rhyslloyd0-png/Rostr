import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "../../../lib/api";

export default function SetupDepartment() {
  const router = useRouter();
  const { guildId } = router.query;

  const [roles, setRoles] = useState(null);
  const [name, setName] = useState("");
  const [accessRoleId, setAccessRoleId] = useState("");
  const [staffRoleId, setStaffRoleId] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    apiFetch(`/guilds/${guildId}/roles`)
      .then(data => setRoles(data.roles))
      .catch(setError);
  }, [guildId]);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { department } = await apiFetch(`/guilds/${guildId}/departments`, {
        method: "POST",
        body: { name, accessRoleId: accessRoleId || null, staffRoleId: staffRoleId || null },
      });
      router.push(`/dashboard/${guildId}/departments/${department.id}`);
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <div className="container">
      <h1>Set up a department</h1>
      <p className="muted">Every field below is picked from your server's own roles — nothing to configure outside this page.</p>

      {error && <div className="card error">{error.body?.message || error.message}</div>}
      {!roles && !error && <p className="muted">Loading roles from Discord...</p>}

      {roles && (
        <form className="card" onSubmit={submit}>
          <div className="field">
            <label>Department name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Fire Department" required />
          </div>
          <div className="field">
            <label>Access role (who can view this roster)</label>
            <select value={accessRoleId} onChange={e => setAccessRoleId(e.target.value)}>
              <option value="">— none —</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Staff role (applied to roster members)</label>
            <select value={staffRoleId} onChange={e => setStaffRoleId(e.target.value)}>
              <option value="">— none —</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <button className="btn" type="submit" disabled={submitting || !name}>
            {submitting ? "Creating..." : "Create department"}
          </button>
        </form>
      )}
    </div>
  );
}
