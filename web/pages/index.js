import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { loginUrl } from "../lib/api";

const FEATURES = [
  { icon: "/brand/icon-ems.png", title: "EMS rosters", body: "Track all emergency services ranks with live Discord role sync — no manual role juggling." },
  { icon: "/brand/icon-gang.png", title: "Gang rosters", body: "Run as many crews or departments as your plan allows, each with its own roles and structure." },
  { icon: "/brand/icon-staff.png", title: "Staff roster", body: "Keep a single view of every staff member across departments, ranks, and posts." },
  { icon: "/brand/icon-settings.png", title: "Fully configurable", body: "Every role, channel, and application question is set from the dashboard — no code, no redeploys." },
  { icon: "/brand/icon-fast.png", title: "Instant setup", body: "Add the bot, pick your roles, and you're running — the whole thing takes minutes, not a support ticket." },
];

const PLANS = [
  {
    key: "free",
    name: "Free",
    tagline: "Try it on one department",
    features: ["1 department", "Roster + Discord role sync"],
  },
  {
    key: "pro",
    name: "Pro",
    tagline: "For growing communities",
    featured: true,
    features: ["Up to 10 departments", "Everything in Free", "Applications", "Leave of absence"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    tagline: "For large multi-department servers",
    features: ["Unlimited departments", "Everything in Pro", "SOP document library"],
  },
];

export default function Home() {
  const router = useRouter();
  const { error } = router.query;

  return (
    <>
      <Head>
        <title>RostR — EMS &amp; Gang Roster Manager</title>
      </Head>

      <nav className="nav">
        <div className="nav-brand">
          <img src="/brand/app-icon.png" alt="" width={32} height={32} style={{ borderRadius: 8 }} />
          ROSTR
        </div>
        <div className="nav-links">
          <a href="#features" className="muted">Features</a>
          <a href="#pricing" className="muted">Pricing</a>
          <Link href="/docs" className="muted">Docs</Link>
          <Link href="/dashboard" className="muted">Dashboard</Link>
        </div>
        <a className="btn" href={loginUrl()}>Add to Discord</a>
      </nav>

      <div className="hero">
        <div className="hero-float hero-float-left">
          <span className="dot dot-green" /> Role sync active
        </div>
        <div className="hero-float hero-float-right">
          <span className="dot dot-blue" /> 3 departments online
        </div>

        <img src="/brand/logo-main.png" alt="RostR" style={{ width: 120, height: "auto" }} />
        <h1>
          Roster management,<br />
          <span className="gradient-text">run entirely by your team</span>
        </h1>
        <p className="lead">
          RostR is a self-service EMS &amp; Gang roster manager for Discord. Departments, applications, leave, and SOPs —
          all set up and run by your own team, straight from the dashboard. No developer required.
        </p>
        {error && <p className="error">Something went wrong signing in ({error}). Try again.</p>}
        <div className="hero-actions">
          <a className="btn large" href={loginUrl()}>Add ROSTR to Discord</a>
          <Link className="btn secondary large" href="/dashboard">View dashboard</Link>
        </div>
        <div className="badge-row">
          <span className="badge">Self-service setup</span>
          <span className="badge">Live Discord role sync</span>
          <span className="badge">Free to start</span>
        </div>
      </div>

      <img className="banner-img" src="/brand/banner-horizontal.png" alt="" />

      <div className="section" id="features">
        <h2>Everything a roster needs</h2>
        <p className="section-lead">Built for FiveM RP servers running EMS, gangs, PD, or anything else you structure as a department.</p>
        <div className="feature-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="card feature-card">
              <img src={f.icon} alt="" />
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>

        <div className="roster-preview card">
          <div className="roster-preview-header">Fire Department roster <span className="muted">— synced to Discord</span></div>
          <div className="roster-preview-row"><span className="tag">Captain</span> J. Reyes <span className="pill pill-green">Synced</span></div>
          <div className="roster-preview-row"><span className="tag">Medic</span> A. Chen <span className="pill pill-green">Synced</span></div>
          <div className="roster-preview-row"><span className="tag">Applicant</span> T. Brooks <span className="pill pill-amber">Pending review</span></div>
        </div>
      </div>

      <div className="section" style={{ background: "#12141a" }}>
        <div className="container">
          <h2 style={{ textAlign: "left" }}>Simplify your rosters</h2>
          <ul className="checklist">
            <li>EMS rosters with live role sync</li>
            <li>Gang / crew rosters, unlimited posts</li>
            <li>Per-department permissions — owner or roles you choose</li>
            <li>Deep Discord integration: roles, nicknames, applications, leave</li>
          </ul>
        </div>
      </div>

      <div className="section" id="pricing">
        <h2>Plans</h2>
        <p className="section-lead">Pricing is being finalized — this is the feature breakdown per tier.</p>
        <div className="pricing-grid">
          {PLANS.map(p => (
            <div key={p.key} className={`card pricing-card${p.featured ? " featured" : ""}`}>
              <h3>{p.name}</h3>
              <p className="muted">{p.tagline}</p>
              <ul>
                {p.features.map(f => <li key={f}>{f}</li>)}
              </ul>
              <a className="btn" href={loginUrl()}>Get started</a>
            </div>
          ))}
        </div>
      </div>

      <footer className="footer">
        RostR — EMS &amp; Gang Roster Manager for FiveM Discord servers
        <div className="links">
          <Link href="/docs">Docs</Link>
          <Link href="/docs/terms">Terms of Service</Link>
          <Link href="/docs/privacy">Privacy Policy</Link>
        </div>
      </footer>
    </>
  );
}
