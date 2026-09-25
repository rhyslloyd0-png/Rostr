import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "../../../../lib/api";
import AppHeader from "../../../../components/AppHeader";
import DeptBanner from "../../../../components/DeptBanner";
import RosterTable, { rosterStats } from "../../../../components/RosterTable";
import RosterEditor from "../../../../components/RosterEditor";
import AdminPanel from "../../../../components/AdminPanel";
import ApplicationsPanel from "../../../../components/ApplicationsPanel";
import LoaPanel from "../../../../components/LoaPanel";
import { normalizeRoster } from "../../../../lib/rosterLogic";

const DEFAULT_DRIVER_LEVELS = ["1", "2", "3", "4", "5"];

// Turns a /roster/sync response into a status banner, naming each failure
// so it's actually fixable — almost always the bot's role sitting below
// the role it's trying to grant, or a missing Manage Roles/Nicknames.
function describeSync(result, prefix) {
  const parts = [`Added ${result.added} role${result.added === 1 ? "" : "s"}`, `removed ${result.removed}`];
  if (result.nicknamesSet) parts.push(`updated ${result.nicknamesSet} nickname${result.nicknamesSet === 1 ? "" : "s"}`);
  const details = (result.failed || []).map(f => (f.kind === "nickname"
    ? `Couldn't set ${f.user}'s nickname to "${f.nickname}"`
    : `Couldn't ${f.action === "add" ? "give" : "remove"} ${f.role} ${f.action === "add" ? "to" : "from"} ${f.user}`));
  return {
    type: details.length ? "error" : "ok",
    message: `${prefix}${parts.join(", ")}.`,
    details,
    hint: details.length
      ? "Check the bot has Manage Roles and Manage Nicknames, and that its role sits above these roles and members in Server Settings → Roles."
      : null,
  };
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
  const [driverLevels, setDriverLevels] = useState(DEFAULT_DRIVER_LEVELS);
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
      apiFetch(`/guilds/${guildId}/departments/${deptId}/data/driverLevels`),
    ])
      .then(([deptData, rosterData, guildData, roleData, driverLevelData]) => {
        setDepartment(deptData.department);
        setTier(deptData.tier);
        const normalized = normalizeRoster(rosterData.value);
        setSections(normalized.sections);
        setCertCatalog(normalized.certCatalog);
        setPlan(guildData.plan);
        setRoles(roleData.roles);
        setDriverLevels(driverLevelData.value.levels || DEFAULT_DRIVER_LEVELS);
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
      setStatus(describeSync(result, ""));
    } catch (err) {
      setStatus({ type: "error", message: err.body?.message || err.message });
    } finally {
      setSyncing(false);
    }
  }

  // Assign/vacate/promote save and sync immediately, matching Midnight
  // Roster's "pick a name — it saves automatically" behavior, rather than
  // waiting for a manual Save. Structural edits (renames, positions, cert
  // ticks) stay batched behind the explicit Save button below.
  async function saveAndSyncNow(nextSections) {
    setSections(nextSections);
    setStatus(null);
    try {
      await apiFetch(`/guilds/${guildId}/departments/${deptId}/data/roster`, {
        method: "PUT",
        body: { value: { sections: nextSections, certCatalog } },
      });
    } catch (err) {
      setStatus({ type: "error", message: `Couldn't save: ${err.body?.message || err.message}` });
      return;
    }
    try {
      const result = await apiFetch(`/guilds/${guildId}/departments/${deptId}/roster/sync`, { method: "POST" });
      setStatus(describeSync(result, "Saved. "));
    } catch (err) {
      // A 400 here means there's nothing to sync yet (no roles or
      // callsigns configured) — the save itself still went through.
      setStatus(err.status === 400
        ? { type: "ok", message: `Saved. ${err.body?.error || ""}` }
        : { type: "error", message: `Saved, but Discord sync failed: ${err.body?.message || err.message}` });
    }
  }

  if (error) {
    return (
      <>
        <AppHeader guildId={guildId} activeDeptSlug={deptId} />
        <div className="container"><div className="card error">{error.body?.message || error.message}</div></div>
      </>
    );
  }
  if (!department || !sections || !roles) {
    return (
      <>
        <AppHeader guildId={guildId} activeDeptSlug={deptId} />
        <div className="container"><div className="page-loading"><span className="spinner" /> Loading roster…</div></div>
      </>
    );
  }

  const canManage = tier === "manage" || tier === "admin";
  const canAdmin = tier === "admin";
  const { filled, total } = rosterStats(sections);

  // Manager Panel and Admin Panel are separate views (matching Midnight
  // Roster's roster.html?panel=manager / ?panel=admin — each its own page,
  // not both stacked under the read-only roster), picked by the `panel`
  // query param and clamped to what this person's tier actually allows.
  const requestedPanel = router.query.panel;
  const mode = requestedPanel === "admin" && canAdmin ? "admin"
    : requestedPanel === "manager" && canManage ? "manager"
    : "view";
  const canEditStructure = mode === "admin";
  const basePath = `/dashboard/${guildId}/departments/${deptId}`;

  // In Manager mode there's no structural Save button (managers can't make
  // structural edits at all), so every change — including cert ticks and
  // driver-level picks — saves and syncs immediately, same as assignment.
  const handleChangeSections = canEditStructure ? setSections : saveAndSyncNow;

  return (
    <>
      <AppHeader guildId={guildId} activeDeptSlug={deptId} homeHref={`/staff/${guildId}/${deptId}`} />
      <div className="container wide">
        <DeptBanner guildId={guildId} department={department} filled={filled} total={total} />

        <div className="action-pills">
          <a className={`action-pill${mode === "view" ? " primary" : ""}`} href={basePath}>View Roster</a>
          {plan?.features?.sop && <a className="action-pill" href={`/sop/${guildId}/${deptId}`}>SOP Library</a>}
          {plan?.features?.loa && <a className="action-pill" href={`/loa/${guildId}/${deptId}`}>Leave Calendar</a>}
          {canManage && <a className={`action-pill manager-badge${mode === "manager" ? " active" : ""}`} href={`${basePath}?panel=manager`}>Manager Panel</a>}
          {canAdmin && <a className={`action-pill admin-badge${mode === "admin" ? " active" : ""}`} href={`${basePath}?panel=admin`}>Admin Panel</a>}
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

        {mode === "admin" && (
          <AdminPanel
            guildId={guildId}
            deptId={deptId}
            department={department}
            roles={roles}
            sections={sections}
            plan={plan}
            certCatalog={certCatalog}
            onCertCatalogChange={setCertCatalog}
            driverLevels={driverLevels}
            onDriverLevelsChange={setDriverLevels}
            onSaved={load}
          />
        )}

        {status && (
          <div className="card" style={{ borderColor: status.type === "error" ? "#f28b82" : undefined }}>
            {status.message}
            {status.details?.length > 0 && (
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13 }}>
                {status.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            )}
            {status.hint && <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>{status.hint}</p>}
          </div>
        )}

        <h2 id="roster">Roster</h2>
        {mode === "view" ? (
          <RosterTable sections={sections} />
        ) : (
          <>
            <RosterEditor
              guildId={guildId}
              deptId={deptId}
              sections={sections}
              onChangeSections={handleChangeSections}
              onAssign={saveAndSyncNow}
              canEditStructure={canEditStructure}
              roles={roles}
              certCatalog={certCatalog}
              driverLevels={driverLevels}
            />

            {canEditStructure && (
              <div style={{ display: "flex", gap: 10, margin: "12px 0 24px" }}>
                <button className="btn" disabled={saving} onClick={saveRoster}>{saving ? "Saving..." : "Save roster"}</button>
                <button className="btn secondary" disabled={syncing} onClick={sync}>
                  {syncing ? "Syncing..." : "Sync Discord roles"}
                </button>
              </div>
            )}

            {plan?.features?.applications ? (
              <ApplicationsPanel guildId={guildId} deptId={deptId} showQuestionEditor={false} />
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
      </div>
    </>
  );
}
