import Head from "next/head";
import DocsLayout from "../../components/DocsLayout";

const PLANS = [
  { name: "Free", features: ["1 department", "Roster + Discord role sync"] },
  { name: "Pro", features: ["Up to 10 departments", "Everything in Free", "Applications", "Leave of absence"] },
  { name: "Enterprise", features: ["Unlimited departments", "Everything in Pro", "SOP document library"] },
];

export default function BillingDoc() {
  return (
    <DocsLayout>
      <Head><title>Billing & Plans — RostR Docs</title></Head>
      <h1>Billing &amp; Plans</h1>
      <p>Every server starts on the Free plan. Upgrading unlocks more departments and additional features — see the current breakdown on the <a href="/#pricing">pricing section</a> of the home page.</p>

      {PLANS.map(p => (
        <div key={p.name}>
          <h2>{p.name}</h2>
          <ul>{p.features.map(f => <li key={f}>{f}</li>)}</ul>
        </div>
      ))}

      <h2>Upgrading</h2>
      <p>
        Only the server owner can change billing. From your guild dashboard, click Upgrade — this takes you to a secure
        Stripe checkout page. Once payment completes, your plan updates automatically, usually within a few seconds.
      </p>

      <h2>Managing your subscription</h2>
      <p>Cancel, change payment method, or view invoices through the billing portal link on your guild dashboard.</p>

      <p className="updated">Pricing is still being finalized — feature availability per plan may change before launch.</p>
    </DocsLayout>
  );
}
