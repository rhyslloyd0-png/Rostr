import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch, loginUrl } from "../../lib/api";
import AppHeader from "../../components/AppHeader";

function guildIconUrl(id, icon) {
  return icon ? `https://cdn.discordapp.com/icons/${id}/${icon}.png` : null;
}

function RosterCard({ r }) {
  return (
    <Link href={`/staff/${r.guildSlug}/${r.departmentSlug}`} className="card server-card">
      <div className="server-card-head">
        {guildIconUrl(r.guildId, r.guildIcon) ? (
          <img src={guildIconUrl(r.guildId, r.guildIcon)} alt="" className="server-card-icon" />
        ) : (
          <div className="server-card-icon server-card-icon-fallback">{r.guildName?.[0] || "?"}</div>
        )}
        <div>
          <strong>{r.departmentName}</strong>
          <div className="muted" style={{ fontSize: 13 }}>{r.guildName}</div>
        </div>
      </div>
      <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
        {r.rank}{r.callsign ? ` · ${r.callsign}` : ""}
      </div>
    </Link>
  );
}

function ServerCard({ s }) {
  return (
    <div className="card server-card">
      <div className="server-card-head">
        {guildIconUrl(s.id, s.icon) ? (
          <img src={guildIconUrl(s.id, s.icon)} alt="" className="server-card-icon" />
        ) : (
          <div className="server-card-icon server-card-icon-fallback">{s.name?.[0] || "?"}</div>
        )}
        <div>
          <strong>{s.name}</strong>
          <div><span className={`pill ${s.owner ? "pill-green" : "pill-amber"}`}>{s.owner ? "Owner" : "Admin"}</span></div>
        </div>
      </div>
      <p className="muted" style={{ margin: "10px 0 12px", fontSize: 13 }}>You have permission for this server.</p>
      {s.installed ? (
        <Link href={`/dashboard/${s.slug}`} className="btn secondary" style={{ display: "block", textAlign: "center" }}>
          Manage
        </Link>
      ) : (
        <a href={loginUrl()} className="btn" style={{ display: "block", textAlign: "center" }}>
          + Install RostR
        </a>
      )}
    </div>
  );
}

export default function DashboardHome() {
  const [rosters, setRosters] = useState(null);
  const [servers, setServers] = useState(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    Promise.all([
      apiFetch("/guilds/my-rosters"),
      apiFetch("/guilds/discoverable"),
    ])
      .then(([rosterData, serverData]) => {
        setRosters(rosterData.rosters);
        setServers(serverData.servers);
        setNeedsReauth(serverData.needsReauth || false);
      })
      .catch(err => setError(err));
  }, []);

  useEffect(load, [load]);

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
      <div className="container wide">
        <h1>Your Rosters</h1>
        {!rosters && <p className="muted">Loading...</p>}
        {rosters && rosters.length === 0 && <p className="muted">You don't hold a post on any roster yet.</p>}
        {rosters && rosters.length > 0 && (
          <div className="server-grid">
            {rosters.map((r, i) => <RosterCard key={i} r={r} />)}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 40 }}>
          <h1 style={{ margin: 0 }}>Your Servers</h1>
          <div style={{ display: "flex", gap: 10 }}>
            <a className="btn" href={loginUrl()}>+ Install RostR</a>
            <button className="btn secondary" onClick={load}>Refresh Servers</button>
          </div>
        </div>

        {needsReauth && (
          <div className="card" style={{ marginTop: 16 }}>
            <p>Sign in again to see every server you can administer — this session was started without that permission.</p>
            <a className="btn" href={loginUrl()}>Sign in with Discord</a>
          </div>
        )}

        {!needsReauth && servers && (
          <div className="card" style={{ marginTop: 16, borderColor: "#3a3220", background: "rgba(234,179,8,0.06)" }}>
            <strong>Can't see your server?</strong>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              You'll only see servers where you're the owner or have Administrator permission. If you just added RostR
              to a server, click Refresh Servers above.
            </p>
          </div>
        )}

        {!servers && !needsReauth && <p className="muted" style={{ marginTop: 16 }}>Loading...</p>}
        {servers && servers.length === 0 && !needsReauth && (
          <p className="muted" style={{ marginTop: 16 }}>No servers found where you're the owner or an administrator.</p>
        )}
        {servers && servers.length > 0 && (
          <div className="server-grid" style={{ marginTop: 16 }}>
            {servers.map(s => <ServerCard key={s.id} s={s} />)}
          </div>
        )}
      </div>
    </>
  );
}
