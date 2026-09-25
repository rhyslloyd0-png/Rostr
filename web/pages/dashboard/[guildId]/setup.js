import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "../../../lib/api";
import AppHeader from "../../../components/AppHeader";
import { ROSTER_TEMPLATES } from "../../../lib/rosterTemplates";

export default function SetupDepartment() {
  const router = useRouter();
  const { guildId } = router.query;

  const [roles, setRoles] = useState(null);
  const [name, setName] = useState("");
  const [accessRoleId, setAccessRoleId] = useState("");
  const [staffRoleId, setStaffRoleId] = useState("");
  const [templateKey, setTemplateKey] = useState("blank");
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

      const template = ROSTER_TEMPLATES.find(t => t.key === templateKey);
      if (template && template.key !== "blank") {
        await Promise.all([
          apiFetch(`/guilds/${guildId}/departments/${department.slug}/data/roster`, {
            method: "PUT",
            body: { value: { sections: template.sections, certCatalog: template.certCatalog } },
          }),
          apiFetch(`/guilds/${guildId}/departments/${department.slug}/data/driverLevels`, {
            method: "PUT",
            body: { value: { levels: template.driverLevels } },
          }),
        ]);
      }

      router.push(`/dashboard/${guildId}/departments/${department.slug}`);
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <>
    <AppHeader guildId={guildId} />
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

          <div className="field">
            <label>Starting roster template</label>
            <div className="template-grid">
              {ROSTER_TEMPLATES.map(t => (
                <button
                  type="button"
                  key={t.key}
                  className={`template-card${templateKey === t.key ? " template-card-active" : ""}`}
                  onClick={() => setTemplateKey(t.key)}
                >
                  <strong>{t.label}</strong>
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          <button className="btn" type="submit" disabled={submitting || !name}>
            {submitting ? "Creating..." : "Create department"}
          </button>
        </form>
      )}
    </div>
    </>
  );
}
