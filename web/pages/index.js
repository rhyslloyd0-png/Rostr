import { useRouter } from "next/router";
import { loginUrl } from "../lib/api";

export default function Home() {
  const router = useRouter();
  const { error } = router.query;

  return (
    <div className="container">
      <div className="card" style={{ textAlign: "center", marginTop: 60 }}>
        <h1>RostR</h1>
        <p className="muted">Roster management for Discord servers — set up entirely from your browser, no developer required.</p>
        {error && <p className="error">Something went wrong signing in ({error}). Try again.</p>}
        <a className="btn" href={loginUrl()} style={{ marginTop: 16 }}>
          Add RostR to Discord
        </a>
      </div>
    </div>
  );
}
