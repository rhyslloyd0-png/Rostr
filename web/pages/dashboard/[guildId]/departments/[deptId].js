import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { apiFetch } from "../../../../lib/api";

// Raw fetch for multipart uploads — apiFetch always JSON-stringifies the
// body and forces Content-Type: application/json, which breaks FormData
// (needs the browser to set its own multipart boundary header).
async function apiFetchRaw(path, options = {}) {
  const resp = await fetch(`/api${path}`, { ...options, credentials: "include" });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    const err = new Error(data.message || data.error || `Request failed (${resp.status})`);
    err.status = resp.status;
    throw err;
  }
  return resp.status === 204 ? null : resp.json();
}
import AppHeader from "../../../../components/AppHeader";
import DeptBanner from "../../../../components/DeptBanner";
import RosterTable, { rosterStats } from "../../../../components/RosterTable";
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
  const certCatalog = value.certCatalog || [];
  if (value.sections) return { sections: value.sections, certCatalog };
  if (value.slots?.length) {
    return {
      certCatalog,
      sections: [{
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
      }],
    };
  }
  return { sections: [], certCatalog };
}

function CertCatalogEditor({ certCatalog, onChange }) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim().toUpperCase();
    if (value && !certCatalog.includes(value)) onChange([...certCatalog, value]);
    setDraft("");
  }

  return (
    <div className="field">
      <label>Certification catalog (the pills managers can toggle per rank)</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {certCatalog.map(c => (
          <span key={c} className="tag" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {c}
            <a href="#" onClick={e => { e.preventDefault(); onChange(certCatalog.filter(x => x !== c)); }} style={{ color: "#f28b82" }}>✕</a>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="e.g. SORT" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())} />
        <button className="btn secondary" onClick={add}>Add</button>
      </div>
    </div>
  );
}

function BannerUpload({ guildId, deptId, hasBanner, onSaved }) {
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);

  async function upload(e) {
    e.preventDefault();
    const file = fileInput.current.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await apiFetchRaw(`/guilds/${guildId}/departments/${deptId}/banner`, { method: "POST", body: form });
      fileInput.current.value = "";
      onSaved();
    } finally {
      setUploading(false);
    }
  }

  async function remove() {
    await apiFetchRaw(`/guilds/${guildId}/departments/${deptId}/banner`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="field">
      <label>Banner image</label>
      <form onSubmit={upload} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="file" accept="image/*" ref={fileInput} />
        <button className="btn secondary" type="submit" disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</button>
        {hasBanner && <button className="btn secondary" type="button" onClick={remove}>Remove</button>}
      </form>
    </div>
  );
}

function AdminSettings({ guildId, deptId, department, roles, certCatalog, onCertCatalogChange, onSaved }) {
  const [form, setForm] = useState({
    name: department.name,
    color: department.color || "#5fb4ff",
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
      <div className="field">
        <label>Accent color</label>
        <input type="color" value={form.color} onChange={e => set("color", e.target.value)} style={{ width: 60 }} />
      </div>
      <BannerUpload guildId={guildId} deptId={deptId} hasBanner={department.has_banner} onSaved={onSaved} />
      <CertCatalogEditor certCatalog={certCatalog} onChange={onCertCatalogChange} />

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
  const [certCatalog, setCertCatalog] = useState([]);
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
        const normalized = normalizeRoster(rosterData.value);
        setSections(normalized.sections);
        setCertCatalog(normalized.certCatalog);
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
        body: { value: { sections, certCatalog } },
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
  const { filled, total } = rosterStats(sections);

  return (
    <>
      <AppHeader guildId={guildId} activeDeptSlug={deptId} homeHref={`/staff/${guildId}/${deptId}`} />
      <div className="container">
        <DeptBanner guildId={guildId} department={department} filled={filled} total={total} />

        <div className="action-pills">
          <a className="action-pill" href="#roster">View Roster</a>
          {plan?.features?.sop && <a className="action-pill" href={`/sop/${guildId}/${deptId}`}>SOP Library</a>}
          {plan?.features?.loa && <a className="action-pill" href={`/loa/${guildId}/${deptId}`}>Leave Calendar</a>}
          {canManage && <a className="action-pill primary" href="#manager-panel">Manager Panel</a>}
          {canAdmin && <a className="action-pill primary" href="#admin-panel">Admin Panel</a>}
        </div>

        {sections.length > 0 && (
          <div className="section-jump">
            {sections.map(s => (
              <a key={s.id} className="dept-pill" style={{ borderColor: s.color || "#333947", color: s.color || "#c4c8d4" }} href={`#section-${s.id}`}>
                {s.name}
              </a>
            ))}
          </div>
        )}

        <h2 id="roster">Roster</h2>
        <RosterTable sections={sections} />

        {canManage && (
          <>
            <h2 id="manager-panel" style={{ marginTop: 32, scrollMarginTop: 80 }}>Manager Panel</h2>
            {status && <div className="card" style={{ borderColor: status.type === "error" ? "#f28b82" : undefined }}>{status.message}</div>}

            <RosterEditor guildId={guildId} sections={sections} onChangeSections={setSections} roles={roles} certCatalog={certCatalog} />

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
            <h2 id="admin-panel" style={{ marginTop: 32, scrollMarginTop: 80 }}>Admin Panel</h2>
            <AdminSettings
              guildId={guildId}
              deptId={deptId}
              department={department}
              roles={roles}
              certCatalog={certCatalog}
              onCertCatalogChange={setCertCatalog}
              onSaved={load}
            />

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
    </>
  );
}
