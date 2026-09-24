import Link from "next/link";
import { useRouter } from "next/router";

const NAV = [
  {
    heading: "Start here",
    links: [{ href: "/docs", label: "Getting Started" }],
  },
  {
    heading: "Build your server",
    links: [
      { href: "/docs/departments", label: "Departments" },
      { href: "/docs/roster", label: "Roster & Role Sync" },
    ],
  },
  {
    heading: "Run operations",
    links: [
      { href: "/docs/applications", label: "Applications" },
      { href: "/docs/loa", label: "Leave of Absence" },
      { href: "/docs/sop", label: "SOP Documents" },
    ],
  },
  {
    heading: "Account",
    links: [{ href: "/docs/billing", label: "Billing & Plans" }],
  },
  {
    heading: "Legal",
    links: [
      { href: "/docs/terms", label: "Terms of Service" },
      { href: "/docs/privacy", label: "Privacy Policy" },
    ],
  },
];

export default function DocsLayout({ children }) {
  const router = useRouter();

  return (
    <div>
      <nav className="nav">
        <Link href="/" className="nav-brand">
          <img src="/brand/app-icon.png" alt="" width={32} height={32} style={{ borderRadius: 8 }} />
          ROSTR DOCS
        </Link>
        <Link href="/dashboard" className="muted">Dashboard</Link>
      </nav>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          {NAV.map(section => (
            <div key={section.heading}>
              <h4>{section.heading}</h4>
              {section.links.map(link => (
                <Link key={link.href} href={link.href} className={router.pathname === link.href ? "active" : ""}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </aside>
        <main className="docs-content">{children}</main>
      </div>
    </div>
  );
}
