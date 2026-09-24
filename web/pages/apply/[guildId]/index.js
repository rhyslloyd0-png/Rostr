import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { apiFetch, loginUrl } from "../../../lib/api";

export default function ApplyGuildHome() {
  const router = useRouter();
  const { guildId } = router.query;

  const [data, setData] = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!guildId) return;
    apiFetch(`/apply/${guildId}`)
      .then(setData)
      .catch(err => {
        if (err.status === 401) setNeedsLogin(true);
        else setError(err);
      });
  }, [guildId]);

  if (needsLogin) {
    return (
      <div className="container">
        <div className="card">
          <p>Sign in with Discord to see and submit applications.</p>
          <a className="btn" href={loginUrl({ mode: "identify", returnTo: `/apply/${guildId}` })}>Sign in with Discord</a>
        </div>
      </div>
    );
  }

  if (error) return <div className="container"><div className="card error">{error.message}</div></div>;
  if (!data) return <div className="container"><p className="muted">Loading...</p></div>;

  return (
    <div className="container">
      <h1>{data.guildName} — Applications</h1>
      {data.departments.length === 0 && <p className="muted">No departments are accepting applications right now.</p>}
      {data.departments.map(d => (
        <Link key={d.id} href={`/apply/${guildId}/${d.id}`} className="card" style={{ display: "block" }}>
          {d.name}
        </Link>
      ))}
    </div>
  );
}
