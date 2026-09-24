import Head from "next/head";
import DocsLayout from "../../components/DocsLayout";

export default function DepartmentsDoc() {
  return (
    <DocsLayout>
      <Head><title>Departments — RostR Docs</title></Head>
      <h1>Departments</h1>
      <p>A department is RostR's core unit — a roster, its own set of Discord roles, and (depending on your plan) its own applications, leave requests, and SOP library.</p>

      <h2>Creating a department</h2>
      <p>From your guild dashboard, click "+ Add department." You'll pick:</p>
      <ul>
        <li><strong>Name</strong> — shown throughout the dashboard and to applicants/staff.</li>
        <li><strong>Access role</strong> — the Discord role that can view the roster and, once enabled, its SOP library.</li>
        <li><strong>Staff role</strong> — applied to anyone on the roster when you sync roles.</li>
      </ul>
      <p>Every role picker is populated live from your Discord server's actual roles — nothing is typed in by hand or hardcoded.</p>

      <h2>Additional roles</h2>
      <p>From a department's settings you can also set an applicant role (applied automatically when someone applies) and a leave-of-absence role (applied automatically while an approved leave request is active).</p>

      <h2>How many departments can I have?</h2>
      <p>This depends on your plan — see <a href="/docs/billing">Billing &amp; Plans</a>.</p>

      <h2>Who can edit a department?</h2>
      <p>The server owner, plus any Discord role the owner designates as a guild admin from the dashboard's settings.</p>
    </DocsLayout>
  );
}
