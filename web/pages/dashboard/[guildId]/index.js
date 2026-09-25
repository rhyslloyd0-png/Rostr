import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { apiFetch } from "../../../lib/api";

export default function GuildDashboard() {
  const router = useRouter();
  const { guildId } = router.query;

  const [info, setInfo] = useState(null);
  const [departments, setDepartments] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
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

  // Straight to the Stripe Payment Link — client_reference_id carries the
  // guild ID through checkout so the webhook (routes/billing.js) knows
  // which guild to upgrade once payment completes.
  function upgradeUrl(paymentLink) {
    return `${paymentLink}?client_reference_id=${guildId}`;
  }

  if (error) return <div className="container"><div className="card error">{error.message}</div></div>;
  if (!info || !departments) return <div className="container"><p className="muted">Loading...</p></div>;

  const atLimit = info.plan.max_departments !== -1 && info.departmentCount >= info.plan.max_departments;

  return (
    <div className="container">
      <h1>{info.guild.name}</h1>
      <div className="card">
        <strong>Plan: {info.plan.key}</strong>
        <div className="muted">
          {info.departmentCount} / {info.plan.max_departments === -1 ? "unlimited" : info.plan.max_departments} departments used
        </div>
        {info.isOwner && info.plan.key !== "enterprise" && (
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            {info.plan.key === "free" && (
              <a className="btn" href={upgradeUrl(process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO)}>Upgrade to Pro</a>
            )}
            <a className="btn secondary" href={upgradeUrl(process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_ENTERPRISE)}>Upgrade to Enterprise</a>
          </div>
        )}
      </div>

      <h2>Departments</h2>
      {departments.map(d => (
        <Link key={d.id} href={`/dashboard/${guildId}/departments/${d.slug}`} className="card" style={{ display: "block" }}>
          {d.name}
        </Link>
      ))}

      {atLimit ? (
        <div className="card">
          <p>You've reached your plan's department limit.</p>
          {info.isOwner && info.plan.key !== "enterprise" && (
            <a
              className="btn"
              href={upgradeUrl(info.plan.key === "free" ? process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO : process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_ENTERPRISE)}
            >
              Upgrade to add more
            </a>
          )}
        </div>
      ) : (
        <Link className="btn" href={`/dashboard/${guildId}/setup`}>+ Add department</Link>
      )}
    </div>
  );
}
