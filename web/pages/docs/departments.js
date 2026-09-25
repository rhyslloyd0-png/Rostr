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

      <h2>Admin Panel vs. Manager Panel</h2>
      <p>Each department has two access tiers below the server owner, set from a department's Admin Panel:</p>
      <ul>
        <li><strong>Admin roles</strong> — full structural control: department settings, role mapping, application questions, and the SOP library.</li>
        <li><strong>Manager roles</strong> — day-to-day operations: assigning/vacating roster posts, syncing roles, and reviewing applications and leave requests — but not the department's structure.</li>
      </ul>
      <p>Anyone without either role, but holding the department's access or staff role, can still view the roster and SOP library — just not edit anything.</p>
    </DocsLayout>
  );
}
