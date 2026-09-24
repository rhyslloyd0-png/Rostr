import Head from "next/head";
import DocsLayout from "../../components/DocsLayout";

export default function LoaDoc() {
  return (
    <DocsLayout>
      <Head><title>Leave of Absence — RostR Docs</title></Head>
      <h1>Leave of Absence</h1>
      <p>Staff can request time off, and the leave role activates and deactivates automatically once you approve it — no one has to remember to apply or remove it.</p>

      <h2>Requesting leave</h2>
      <p>
        Staff sign in at <code>/loa/&lt;your-server&gt;/&lt;department&gt;</code> and submit a start date, end date, and
        an optional reason.
      </p>

      <h2>Approving leave</h2>
      <p>
        From a department's Leave of Absence panel, approve or deny each request. Once approved, RostR checks every few
        minutes whether the request's date window has opened yet — if so, it applies the department's leave role
        automatically, and removes it again once the window closes (or the request is later denied).
      </p>

      <h2>Requirements</h2>
      <p>A department needs a leave role set (in its settings) for this to do anything — without one, approved requests are tracked but no Discord role changes.</p>
    </DocsLayout>
  );
}
