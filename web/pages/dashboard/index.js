import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, loginUrl } from "../../lib/api";
import AppHeader from "../../components/AppHeader";

export default function DashboardHome() {
  const [guilds, setGuilds] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/guilds")
      .then(data => setGuilds(data.guilds))
      .catch(err => setError(err));
  }, []);

  if (error) {
    return (
      <>
        <AppHeader />
        <div className="container">
          <div className="card">
            <p>You need to sign in first.</p>
            <a className="btn" href={loginUrl()}>Sign in with Discord</a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <div className="container">
        <h1>Your servers</h1>
        {!guilds && <p className="muted">Loading...</p>}
        {guilds && guilds.length === 0 && (
          <div className="card">
            <p>No servers yet.</p>
            <a className="btn" href={loginUrl()}>Add RostR to another server</a>
          </div>
        )}
        {guilds && guilds.map(g => (
          <Link key={g.id} href={`/dashboard/${g.slug}`} className="card" style={{ display: "block" }}>
            <strong>{g.name}</strong>
            <div className="muted">Plan: {g.plan}</div>
          </Link>
        ))}
        {guilds && guilds.length > 0 && (
          <a className="btn secondary" href={loginUrl()}>Add RostR to another server</a>
        )}
      </div>
    </>
  );
}
