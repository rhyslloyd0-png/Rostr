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

const DEFAULT_DRIVER_LEVELS = ["1", "2", "3", "4", "5"];

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
          {canManage && <a className="action-pill manager-badge" href="#manager-panel">Manager Panel</a>}
          {canAdmin && <a className="action-pill admin-badge" href="#admin-panel">Admin Panel</a>}
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

            <RosterEditor guildId={guildId} sections={sections} onChangeSections={setSections} roles={roles} certCatalog={certCatalog} driverLevels={driverLevels} />

            <div style={{ display: "flex", gap: 10, margin: "12px 0 24px" }}>
              <button className="btn" disabled={saving} onClick={saveRoster}>{saving ? "Saving..." : "Save roster"}</button>
              <button className="btn secondary" disabled={syncing} onClick={sync}>
                {syncing ? "Syncing..." : "Sync Discord roles"}
              </button>
            </div>

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

        {canAdmin && (
          <>
            <h2 id="admin-panel" style={{ marginTop: 32, scrollMarginTop: 80 }}>Admin Panel</h2>
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
          </>
        )}
      </div>
    </>
  );
}
