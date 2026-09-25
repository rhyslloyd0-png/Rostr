import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { apiFetch, loginUrl } from "../../../lib/api";
import AppHeader from "../../../components/AppHeader";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function StaffHome() {
  const router = useRouter();
  const { guildId, deptId } = router.query;

  const [data, setData] = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!guildId || !deptId) return;
    apiFetch(`/staff/${guildId}/${deptId}`)
      .then(setData)
      .catch(err => {
        if (err.status === 401) setNeedsLogin(true);
        else setError(err);
      });
  }, [guildId, deptId]);

  if (needsLogin) {
    return (
      <>
        <AppHeader guildId={guildId} activeDeptSlug={deptId} />
        <div className="container">
          <div className="card">
            <p>Sign in with Discord to see your record.</p>
            <a className="btn" href={loginUrl({ mode: "identify", returnTo: `/staff/${guildId}/${deptId}` })}>Sign in with Discord</a>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <AppHeader guildId={guildId} activeDeptSlug={deptId} />
        <div className="container"><div className="card error">{error.body?.message || error.message}</div></div>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <AppHeader guildId={guildId} activeDeptSlug={deptId} />
        <div className="container"><p className="muted">Loading...</p></div>
      </>
    );
  }

  const { user, guild, department, tier, features, currentPost, loa } = data;
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : "https://cdn.discordapp.com/embed/avatars/0.png";
  const guildIconUrl = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
    : "/brand/app-icon.png";

  return (
    <>
      <AppHeader guildId={guildId} activeDeptSlug={deptId} />
      <div className="container">
      <div className="staff-header">
        <div className="staff-header-title">
          <img src={guildIconUrl} alt="" />
          <div>
            <h1 style={{ color: department.color || undefined }}>{department.name}</h1>
            <p className="muted">{guild.name}</p>
          </div>
        </div>
        {(tier === "admin" || tier === "manage") && (
          <div style={{ display: "flex", gap: 10 }}>
            {tier === "admin" && (
              <Link className="btn secondary" href={`/dashboard/${guildId}/departments/${department.slug}`}>Admin Panel</Link>
            )}
            <Link className="btn secondary" href={`/dashboard/${guildId}/departments/${department.slug}`}>Manager Panel</Link>
          </div>
        )}
      </div>

      <div className="staff-banner">
        <img className="staff-avatar" src={avatarUrl} alt="" />
        <div>
          <div className="eyebrow">{greeting()},</div>
          <h2>{user.username}</h2>
          <div className="status">
            {currentPost ? `On the roster — ${currentPost.rank}${currentPost.section ? ` (${currentPost.section})` : ""}` : "Not on the roster yet"}
          </div>
        </div>
      </div>

      <div className="section-label">Your record</div>
      <div className="card record-card" style={{ marginBottom: 28 }}>
        <div>
          <div className="eyebrow">Current rank</div>
          <h3>{currentPost ? currentPost.rank : "No post assigned"}</h3>
          <p className="muted" style={{ margin: 0 }}>
            {currentPost
              ? `Callsign ${currentPost.callsign || "—"}, ${currentPost.section}`
              : "A manager assigns you a post from the roster — it'll show up here once they do."}
          </p>
        </div>
      </div>

      {features.loa && (
        <>
          <div className="section-label">
            Leave of absence
            <Link href={`/loa/${guildId}/${department.slug}`}>Open the calendar ›</Link>
          </div>
          <div className="card record-card" style={{ marginBottom: 28 }}>
            <div>
              <h3 style={{ margin: 0 }}>{loa ? `${loa.status} — ${loa.start_date} to ${loa.end_date}` : "No leave booked."}</h3>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                {loa?.active ? "Active now." : "Need time off? Book it from the leave calendar."}
              </p>
            </div>
            <Link className="btn" href={`/loa/${guildId}/${department.slug}`}>Request leave</Link>
          </div>
        </>
      )}

      <div className="section-label">Browse</div>
      <div className="browse-grid">
        <Link className="card browse-tile" href={`/dashboard/${guildId}/departments/${department.slug}`}>
          <h3>Roster</h3>
          <p className="muted" style={{ margin: 0 }}>Every post and who holds it.</p>
        </Link>
        {features.sop && (
          <Link className="card browse-tile" href={`/sop/${guildId}/${department.slug}`}>
            <h3>SOP Library</h3>
            <p className="muted" style={{ margin: 0 }}>Standard operating procedures.</p>
          </Link>
        )}
        {features.loa && (
          <Link className="card browse-tile" href={`/loa/${guildId}/${department.slug}`}>
            <h3>Leave Calendar</h3>
            <p className="muted" style={{ margin: 0 }}>Request or review time off.</p>
          </Link>
        )}
      </div>
      </div>
    </>
  );
}
