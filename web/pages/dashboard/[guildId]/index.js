import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { apiFetch } from "../../../lib/api";
import AppHeader from "../../../components/AppHeader";

export default function GuildDashboard() {
  const router = useRouter();
  const { guildId } = router.query;

  const [info, setInfo] = useState(null);
  const [departments, setDepartments] = useState(null);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(() => {
    if (!guildId) return;
    Promise.all([
      apiFetch(`/guilds/${guildId}`),
      apiFetch(`/guilds/${guildId}/departments`),
    ])
      .then(([guildData, deptData]) => {
        setInfo(guildData);
        setDepartments(deptData.departments);
      })
      .catch(setError);
  }, [guildId]);

  useEffect(load, [load]);

  async function deleteDepartment(d) {
    if (!confirm(`Delete "${d.name}"? This permanently removes its roster, applications, leave requests, and SOP documents. This can't be undone.`)) return;
    setDeletingId(d.id);
    try {
      await apiFetch(`/guilds/${guildId}/departments/${d.slug}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err.body?.message || err.message);
    } finally {
      setDeletingId(null);
    }
  }

  // Straight to the Stripe Payment Link — client_reference_id carries the
  // guild ID through checkout so the webhook (routes/billing.js) knows
  // which guild to upgrade once payment completes.
  function upgradeUrl(paymentLink) {
    return `${paymentLink}?client_reference_id=${guildId}`;
  }

  // Existing subscribers change plan / cancel / update their card in
  // Stripe's billing portal — never a second Payment Link, which would
  // start a second subscription and bill them twice.
  async function openBillingPortal() {
    try {
      const { url } = await apiFetch(`/billing/${guildId}/portal`, { method: "POST" });
      window.location.href = url;
    } catch (err) {
      alert(err.body?.error || err.message);
    }
  }

  if (error) return <><AppHeader guildId={guildId} /><div className="container"><div className="card error">{error.message}</div></div></>;
  if (!info || !departments) return <><AppHeader guildId={guildId} /><div className="container"><div className="page-loading"><span className="spinner" /> Loading…</div></div></>;

  const atLimit = info.plan.max_departments !== -1 && info.departmentCount >= info.plan.max_departments;
  const onFree = info.plan.key === "free";
  const hasBillingAccount = !!info.guild.stripe_customer_id;

  return (
    <>
    <AppHeader guildId={guildId} />
    <div className="container">
      <h1>{info.guild.name}</h1>
      <div className="card">
        <strong>Plan: {info.plan.key}</strong>
        <div className="muted">
          {info.departmentCount} / {info.plan.max_departments === -1 ? "unlimited" : info.plan.max_departments} departments used
        </div>
        {info.isOwner && (onFree || hasBillingAccount) && (
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            {onFree ? (
              <>
                <a className="btn" href={upgradeUrl(process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO)}>Upgrade to Pro</a>
                <a className="btn secondary" href={upgradeUrl(process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_ENTERPRISE)}>Upgrade to Enterprise</a>
              </>
            ) : null}
            {hasBillingAccount && (
              <button className={onFree ? "btn secondary" : "btn"} onClick={openBillingPortal}>
                {onFree ? "Billing history" : "Manage billing"}
              </button>
            )}
          </div>
        )}
        {info.isOwner && !onFree && hasBillingAccount && (
          <p className="muted" style={{ fontSize: 13, margin: "8px 0 0" }}>Change plan, update your card, or cancel from Manage billing.</p>
        )}
      </div>

      <h2>Departments</h2>
      {departments.map(d => (
        <div key={d.id} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href={`/dashboard/${guildId}/departments/${d.slug}`} style={{ flex: 1 }}>{d.name}</Link>
          {info.isOwner && (
            <button
              className="btn secondary"
              disabled={deletingId === d.id}
              onClick={() => deleteDepartment(d)}
            >
              {deletingId === d.id ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      ))}

      {atLimit ? (
        <div className="card">
          <p>You've reached your plan's department limit.</p>
          {info.isOwner && onFree && (
            <a className="btn" href={upgradeUrl(process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO)}>Upgrade to add more</a>
          )}
          {info.isOwner && !onFree && hasBillingAccount && info.plan.key !== "enterprise" && (
            <button className="btn" onClick={openBillingPortal}>Change plan to add more</button>
          )}
        </div>
      ) : (
        <Link className="btn" href={`/dashboard/${guildId}/setup`}>+ Add department</Link>
      )}
    </div>
    </>
  );
}
