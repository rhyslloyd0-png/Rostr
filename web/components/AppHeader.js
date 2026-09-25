import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { apiFetch } from "../lib/api";

// Sticky top bar shown across staff/dashboard department pages: brand,
// a colored pill per department in the guild (so switching departments
// doesn't mean going back to a list), and account controls on the right.
export default function AppHeader({ guildId, activeDeptSlug, homeHref }) {
  const router = useRouter();
  const [departments, setDepartments] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!guildId) return;
    apiFetch(`/staff/${guildId}/departments`).then(d => setDepartments(d.departments)).catch(() => setDepartments([]));
    apiFetch("/auth/me").then(d => setUser(d.user)).catch(() => setUser(null));
  }, [guildId]);

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/");
  }

  const avatarUrl = user
    ? (user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : "https://cdn.discordapp.com/embed/avatars/0.png")
    : null;

  return (
    <div className="app-header">
      <div className="app-header-inner">
        <div className="app-header-brand">
          <img src="/brand/app-icon.png" alt="" width={26} height={26} style={{ borderRadius: 6 }} />
          ROSTR
        </div>

        <div className="app-header-depts">
          {(departments || []).map(d => (
            <Link
              key={d.slug}
              href={`/staff/${guildId}/${d.slug}`}
              className="dept-pill"
              style={{ borderColor: d.color || "#333947", color: d.slug === activeDeptSlug ? "#0b0d11" : (d.color || "#c4c8d4"), background: d.slug === activeDeptSlug ? (d.color || "#5fb4ff") : "transparent" }}
            >
              {d.name}
            </Link>
          ))}
        </div>

        <div className="app-header-account">
          {user && <span className="muted" style={{ fontSize: 13 }}>Logged in as {user.username}</span>}
          {avatarUrl && <img src={avatarUrl} alt="" className="app-header-avatar" />}
          <Link href={homeHref || "/dashboard"} title="Home" className="icon-btn">⌂</Link>
          <button title="Refresh" className="icon-btn" onClick={() => router.reload()}>⟳</button>
          <button title="Log out" className="icon-btn" onClick={logout}>⎋</button>
        </div>
      </div>
    </div>
  );
}
