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
  const [upgrading, setUpgrading] = useState(false);

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

  async function upgrade(priceEnvKey) {
    setUpgrading(true);
    try {
      const { url } = await apiFetch(`/billing/${guildId}/checkout`, {
        method: "POST",
        body: { priceId: priceEnvKey },
      });
      window.location.href = url;
    } catch (err) {
      setError(err);
      setUpgrading(false);
    }
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
        {info.isOwner && info.plan.key === "free" && (
          <button className="btn" style={{ marginTop: 12 }} disabled={upgrading} onClick={() => upgrade(process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO)}>
            Upgrade to Pro
          </button>
        )}
      </div>

      <h2>Departments</h2>
      {departments.map(d => (
        <Link key={d.id} href={`/dashboard/${guildId}/departments/${d.id}`} className="card" style={{ display: "block" }}>
          {d.name}
        </Link>
      ))}

      {atLimit ? (
        <div className="card">
          <p>You've reached your plan's department limit.</p>
          {info.isOwner && (
            <button className="btn" disabled={upgrading} onClick={() => upgrade(process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO)}>
              Upgrade to add more
            </button>
          )}
        </div>
      ) : (
        <Link className="btn" href={`/dashboard/${guildId}/setup`}>+ Add department</Link>
      )}
    </div>
  );
}
