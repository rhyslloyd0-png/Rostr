import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "../../../../lib/api";
import RosterTable from "../../../../components/RosterTable";
import RosterEditor from "../../../../components/RosterEditor";
import RolePicker from "../../../../components/RolePicker";
import ApplicationsPanel from "../../../../components/ApplicationsPanel";
import LoaPanel from "../../../../components/LoaPanel";
import SopPanel from "../../../../components/SopPanel";

// Migrates the old flat `{ slots: [...] }` roster shape (title/userId/
// displayName) into one default "Staff" section under the current
// `{ sections: [{ ranks: [...] }] }` shape, so roster data saved before this
// redesign doesn't just disappear.
function normalizeRoster(value) {
  if (value.sections) return value.sections;
  if (value.slots?.length) {
    return [{
      id: "migrated-staff",
      name: "Staff",
      ranks: value.slots.map(s => ({
        id: s.id,
        rank: s.title || "",
        userId: s.userId || "",
        discordUsername: "",
        name: s.displayName || "",
        certifications: [],
        roleIds: [],
      })),
    }];
  }
  return [];
}

function AdminSettings({ guildId, deptId, department, roles, onSaved }) {
  const [form, setForm] = useState({
    name: department.name,
    access_role_id: department.access_role_id || "",
    staff_role_id: department.staff_role_id || "",
    applicant_role_id: department.applicant_role_id || "",
    loa_role_id: department.loa_role_id || "",
    admin_role_ids: department.admin_role_ids || [],
    manager_role_ids: department.manager_role_ids || [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      await apiFetch(`/guilds/${guildId}/departments/${deptId}`, { method: "PATCH", body: form });
      setSaved(true);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const roleSelect = (label, field) => (
    <div className="field">
      <label>{label}</label>
      <select value={form[field]} onChange={e => set(field, e.target.value)}>
        <option value="">— none —</option>
        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
    </div>
  );

  return (
    <div className="card">
      <div className="field">
        <label>Department name</label>
        <input value={form.name} onChange={e => set("name", e.target.value)} />
      </div>
      {roleSelect("Access role", "access_role_id")}
      {roleSelect("Staff role", "staff_role_id")}
      {roleSelect("Applicant role", "applicant_role_id")}
      {roleSelect("Leave of absence role", "loa_role_id")}

      <div className="field">
        <label>Admin roles (full structural access to this department)</label>
        <RolePicker roles={roles} selected={form.admin_role_ids} onChange={v => set("admin_role_ids", v)} />
      </div>
      <div className="field">
        <label>Manager roles (roster + applications + leave, no settings access)</label>
        <RolePicker roles={roles} selected={form.manager_role_ids} onChange={v => set("manager_role_ids", v)} />
      </div>

      <button className="btn" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save settings"}</button>
      {saved && <span className="muted" style={{ marginLeft: 10 }}>Saved.</span>}
    </div>
  );
}

export default function DepartmentPage() {
  const router = useRouter();
  const { guildId, deptId } = router.query;

  const [department, setDepartment] = useState(null);
  const [tier, setTier] = useState(null);
  const [plan, setPlan] = useState(null);
  const [roles, setRoles] = useState(null);
  const [sections, setSections] = useState(null);
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
      apiFetch(`/guilds/${guildId}/roles`),
    ])
      .then(([deptData, rosterData, guildData, roleData]) => {
        setDepartment(deptData.department);
        setTier(deptData.tier);
        setSections(normalizeRoster(rosterData.value));
        setPlan(guildData.plan);
        setRoles(roleData.roles);
      })
      .catch(setError);
  }, [guildId, deptId]);

  useEffect(load, [load]);

  async function saveRoster() {
    setSaving(true);
    setStatus(null);
    try {
      await apiFetch(`/guilds/${guildId}/departments/${deptId}/data/roster`, {
        method: "PUT",
        body: { value: { sections } },
      });
      setStatus({ type: "ok", message: "Roster saved." });
    } catch (err) {
      setStatus({ type: "error", message: err.body?.message || err.message });
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
        message: `Added ${result.added} role${result.added === 1 ? "" : "s"}, removed ${result.removed}.` +
          (result.failed.length ? ` Failed for ${result.failed.length}.` : ""),
      });
    } catch (err) {
      setStatus({ type: "error", message: err.body?.message || err.message });
    } finally {
      setSyncing(false);
    }
  }

  if (error) return <div className="container"><div className="card error">{error.body?.message || error.message}</div></div>;
  if (!department || !sections || !roles) return <div className="container"><p className="muted">Loading...</p></div>;

  const canManage = tier === "manage" || tier === "admin";
  const canAdmin = tier === "admin";

  return (
    <div className="container">
      <h1>{department.name}</h1>

      <h2>Roster</h2>
      <RosterTable sections={sections} />

      {canManage && (
        <>
          <h2 style={{ marginTop: 32 }}>Manager Panel</h2>
          {status && <div className="card" style={{ borderColor: status.type === "error" ? "#f28b82" : undefined }}>{status.message}</div>}

          <RosterEditor guildId={guildId} sections={sections} onChangeSections={setSections} roles={roles} />

          <div style={{ display: "flex", gap: 10, margin: "12px 0 24px" }}>
            <button className="btn" disabled={saving} onClick={saveRoster}>{saving ? "Saving..." : "Save roster"}</button>
            <button className="btn secondary" disabled={syncing} onClick={sync}>
              {syncing ? "Syncing..." : "Sync Discord roles"}
            </button>
          </div>

          {plan?.features?.applications ? (
            <ApplicationsPanel guildId={guildId} deptId={deptId} showQuestionEditor={canAdmin} />
          ) : (
            <div className="card"><p className="muted">Applications aren't available on the {plan?.key} plan.</p></div>
          )}

          <div style={{ marginTop: 24 }}>
            {plan?.features?.loa ? (
              <LoaPanel guildId={guildId} deptId={deptId} />
            ) : (
              <div className="card"><p className="muted">Leave of absence isn't available on the {plan?.key} plan.</p></div>
            )}
          </div>
        </>
      )}

      {canAdmin && (
        <>
          <h2 style={{ marginTop: 32 }}>Admin Panel</h2>
          <AdminSettings guildId={guildId} deptId={deptId} department={department} roles={roles} onSaved={load} />

          <div style={{ marginTop: 24 }}>
            {plan?.features?.sop ? (
              <SopPanel guildId={guildId} deptId={deptId} />
            ) : (
              <div className="card"><p className="muted">The SOP library isn't available on the {plan?.key} plan.</p></div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
