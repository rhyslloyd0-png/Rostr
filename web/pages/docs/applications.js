import Head from "next/head";
import DocsLayout from "../../components/DocsLayout";

export default function ApplicationsDoc() {
  return (
    <DocsLayout>
      <Head><title>Applications — RostR Docs</title></Head>
      <h1>Applications</h1>
      <p>Let people apply to a department with a custom form, and review submissions from your dashboard.</p>

      <h2>Setting up questions</h2>
      <p>
        On a department's page, use the question editor to add short-text or long-text fields — anything you want an
        applicant to answer. Save, and the form updates immediately for anyone applying.
      </p>

      <h2>The applicant side</h2>
      <p>
        Applicants use a separate, lighter sign-in at <code>/apply/&lt;your-server&gt;</code> — it only asks Discord to
        confirm who they are, without the bot-install prompt owners see. They can see their own application status and
        any feedback you leave, without needing dashboard access.
      </p>

      <h2>Reviewing applications</h2>
      <p>
        Approve or deny from the department's Applications panel, optionally with feedback the applicant will see.
        Approving swaps roles automatically: the applicant role comes off, the department's staff role goes on.
      </p>
    </DocsLayout>
  );
}
