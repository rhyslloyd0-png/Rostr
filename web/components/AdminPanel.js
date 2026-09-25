import { useEffect, useState, useRef } from "react";
import { apiFetch } from "../lib/api";
import RolePicker from "./RolePicker";
import ApplicationsPanel, { QuestionEditor } from "./ApplicationsPanel";
import SopPanel from "./SopPanel";

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

const TABS = [
  { key: "settings", label: "Department settings" },
  { key: "roles", label: "Discord role mapping" },
  { key: "certifications", label: "Certifications" },
  { key: "driverLevels", label: "Driver levels" },
  { key: "questions", label: "Application questions" },
  { key: "applications", label: "Applications" },
  { key: "placement", label: "Application approval placement" },
  { key: "announce", label: "Send a message to Discord" },
  { key: "sop", label: "SOP documents" },
];

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

function DepartmentSettingsTab({ guildId, deptId, department, onSaved }) {
  const [name, setName] = useState(department.name);
  const [color, setColor] = useState(department.color || "#5fb4ff");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await apiFetch(`/guilds/${guildId}/departments/${deptId}`, { method: "PATCH", body: { name, color } });
      setSaved(true);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="field">
        <label>Department name</label>
        <input value={name} onChange={e => { setName(e.target.value); setSaved(false); }} />
      </div>
      <div className="field">
        <label>Accent color</label>
        <input type="color" value={color} onChange={e => { setColor(e.target.value); setSaved(false); }} style={{ width: 60 }} />
      </div>
      <BannerUpload guildId={guildId} deptId={deptId} hasBanner={department.has_banner} onSaved={onSaved} />
      <button className="btn" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save settings"}</button>
      {saved && <span className="muted" style={{ marginLeft: 10 }}>Saved.</span>}
    </div>
  );
}

function RoleMappingTab({ guildId, deptId, department, roles, onSaved }) {
  const [form, setForm] = useState({
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
      <button className="btn" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save roles"}</button>
      {saved && <span className="muted" style={{ marginLeft: 10 }}>Saved.</span>}
    </div>
  );
}

function CertificationsTab({ certCatalog, onChange }) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim().toUpperCase();
    if (value && !certCatalog.includes(value)) onChange([...certCatalog, value]);
    setDraft("");
  }

  return (
    <div className="card">
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
      <p className="muted">Certifications save automatically along with the roster — hit "Save roster" in the Manager Panel to persist changes.</p>
    </div>
  );
}

function DriverLevelsTab({ guildId, deptId, driverLevels, onChange }) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function add() {
    const value = draft.trim();
    if (value && !driverLevels.includes(value)) onChange([...driverLevels, value]);
    setDraft("");
    setSaved(false);
  }

  function remove(level) {
    onChange(driverLevels.filter(l => l !== level));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      await apiFetch(`/guilds/${guildId}/departments/${deptId}/data/driverLevels`, { method: "PUT", body: { value: { levels: driverLevels } } });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="field">
        <label>Driver levels (shown as options in the roster's Driver Level column)</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {driverLevels.map(l => (
            <span key={l} className="tag" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {l}
              <a href="#" onClick={e => { e.preventDefault(); remove(l); }} style={{ color: "#f28b82" }}>✕</a>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="e.g. 6" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())} />
          <button className="btn secondary" onClick={add}>Add</button>
        </div>
      </div>
      <button className="btn" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save driver levels"}</button>
      {saved && <span className="muted" style={{ marginLeft: 10 }}>Saved.</span>}
    </div>
  );
}

function PlacementTab({ guildId, deptId, sections }) {
  const [sectionId, setSectionId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch(`/guilds/${guildId}/departments/${deptId}/data/placement`)
      .then(data => { setSectionId(data.value.sectionId || ""); setLoaded(true); });
  }, [guildId, deptId]);

  async function save() {
    setSaving(true);
    try {
      await apiFetch(`/guilds/${guildId}/departments/${deptId}/data/placement`, { method: "PUT", body: { value: { sectionId: sectionId || null } } });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <p className="muted">Loading...</p>;

  return (
    <div className="card">
      <p className="muted">When an application is approved, RostR fills the first vacant rank slot in this section with the applicant automatically.</p>
      <div className="field">
        <label>Placement section</label>
        <select value={sectionId} onChange={e => { setSectionId(e.target.value); setSaved(false); }}>
          <option value="">— don't auto-place, just swap roles —</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.name || "(unnamed section)"}</option>)}
        </select>
      </div>
      <button className="btn" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button>
      {saved && <span className="muted" style={{ marginLeft: 10 }}>Saved.</span>}
    </div>
  );
}

function AnnounceTab({ guildId, deptId }) {
  const [channels, setChannels] = useState(null);
  const [channelId, setChannelId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    apiFetch(`/guilds/${guildId}/channels`)
      .then(data => {
        const textChannels = data.channels.filter(c => c.type === 0);
        setChannels(textChannels);
        if (textChannels.length) setChannelId(textChannels[0].id);
      })
      .catch(() => setChannels([]));
  }, [guildId]);

  async function send() {
    setSending(true);
    setStatus(null);
    try {
      await apiFetch(`/guilds/${guildId}/departments/${deptId}/announce`, { method: "POST", body: { channelId, message } });
      setStatus({ type: "ok", message: "Message sent." });
      setMessage("");
    } catch (err) {
      setStatus({ type: "error", message: err.body?.message || err.message });
    } finally {
      setSending(false);
    }
  }

  if (!channels) return <p className="muted">Loading channels...</p>;

  return (
    <div className="card">
      {channels.length === 0 ? (
        <p className="muted">No text channels found — make sure the bot can see at least one channel in this server.</p>
      ) : (
        <>
          <div className="field">
            <label>Channel</label>
            <select value={channelId} onChange={e => setChannelId(e.target.value)}>
              {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Message</label>
            <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Message to post in Discord..." />
          </div>
          <button className="btn" disabled={sending || !message.trim()} onClick={send}>{sending ? "Sending..." : "Send message"}</button>
          {status && <p className={status.type === "error" ? "error" : "muted"} style={{ marginTop: 8 }}>{status.message}</p>}
        </>
      )}
    </div>
  );
}

export default function AdminPanel({
  guildId, deptId, department, roles, sections, plan,
  certCatalog, onCertCatalogChange, driverLevels, onDriverLevelsChange, onSaved,
}) {
  const [activeTab, setActiveTab] = useState("settings");

  return (
    <div>
      <div className="admin-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`admin-tab${activeTab === t.key ? " admin-tab-active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-tab-content">
        {activeTab === "settings" && (
          <DepartmentSettingsTab guildId={guildId} deptId={deptId} department={department} onSaved={onSaved} />
        )}
        {activeTab === "roles" && (
          <RoleMappingTab guildId={guildId} deptId={deptId} department={department} roles={roles} onSaved={onSaved} />
        )}
        {activeTab === "certifications" && (
          <CertificationsTab certCatalog={certCatalog} onChange={onCertCatalogChange} />
        )}
        {activeTab === "driverLevels" && (
          <DriverLevelsTab guildId={guildId} deptId={deptId} driverLevels={driverLevels} onChange={onDriverLevelsChange} />
        )}
        {activeTab === "questions" && (
          plan?.features?.applications
            ? <QuestionEditor guildId={guildId} deptId={deptId} />
            : <div className="card"><p className="muted">Applications aren't available on the {plan?.key} plan.</p></div>
        )}
        {activeTab === "applications" && (
          plan?.features?.applications
            ? <ApplicationsPanel guildId={guildId} deptId={deptId} showQuestionEditor={false} />
            : <div className="card"><p className="muted">Applications aren't available on the {plan?.key} plan.</p></div>
        )}
        {activeTab === "placement" && (
          plan?.features?.applications
            ? <PlacementTab guildId={guildId} deptId={deptId} sections={sections} />
            : <div className="card"><p className="muted">Applications aren't available on the {plan?.key} plan.</p></div>
        )}
        {activeTab === "announce" && <AnnounceTab guildId={guildId} deptId={deptId} />}
        {activeTab === "sop" && (
          plan?.features?.sop
            ? <SopPanel guildId={guildId} deptId={deptId} />
            : <div className="card"><p className="muted">The SOP library isn't available on the {plan?.key} plan.</p></div>
        )}
      </div>
    </div>
  );
}
