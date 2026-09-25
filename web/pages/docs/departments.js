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
        <li><strong>Starting template</strong> — a blank roster, or a pre-built EMS, Police, Fire, Gang/Crew, or Server Staff structure with sensible ranks and certifications.</li>
      </ul>
      <p>Every role picker is populated live from your Discord server's actual roles — nothing is typed in by hand or hardcoded.</p>

      <h2>Deleting a department</h2>
      <p>
        The server owner can delete a department from the guild dashboard. This permanently removes its roster,
        applications, leave requests, and SOP documents — it can't be undone.
      </p>

      <h2>Additional roles</h2>
      <p>From a department's settings you can also set an applicant role (applied automatically when someone applies) and a leave-of-absence role (applied automatically while an approved leave request is active).</p>

      <h2>How many departments can I have?</h2>
      <p>This depends on your plan — see <a href="/docs/billing">Billing &amp; Plans</a>.</p>

      <h2>Admin Panel vs. Manager Panel</h2>
      <p>
        Each department has two access tiers below the server owner, set under Discord role mapping in the Admin
        Panel. They're separate views — open them from the gold <strong>Manager Panel</strong> and teal
        <strong> Admin Panel</strong> buttons at the top of a department page.
      </p>
      <ul>
        <li>
          <strong>Manager Panel</strong> (manager and admin roles) — day-to-day operations: assigning and vacating
          posts, changing ranks, setting certifications and driver levels, editing nicknames, and reviewing
          applications and leave requests. Every change saves immediately.
        </li>
        <li>
          <strong>Admin Panel</strong> (admin roles only) — everything above, plus the roster's structure (categories,
          sub-categories, positions, rank names, callsigns) and the toolbar: department settings, Discord role mapping,
          certifications, driver levels, application questions, approval placement, sending a message through the
          bot, SOP documents, and PDF export.
        </li>
      </ul>
      <p>Anyone without either role, but holding the department's access or staff role, can still view the roster and SOP library — just not edit anything.</p>
    </DocsLayout>
  );
}
