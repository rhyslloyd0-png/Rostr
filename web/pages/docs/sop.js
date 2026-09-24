import Head from "next/head";
import DocsLayout from "../../components/DocsLayout";

export default function SopDoc() {
  return (
    <DocsLayout>
      <Head><title>SOP Documents — RostR Docs</title></Head>
      <h1>SOP Documents</h1>
      <p>Keep standard operating procedures and other documents attached to a department, viewable by anyone with access to it.</p>

      <h2>Uploading</h2>
      <p>From a department's SOP panel, upload a file (up to 20MB). You can rename how it's displayed without changing the underlying filename, and delete documents you no longer need.</p>

      <h2>Who can see them</h2>
      <p>
        Anyone holding the department's access, staff, admin, or manager role — checked live against Discord — plus the
        server owner. Staff browse and download documents at <code>/sop/&lt;your-server&gt;/&lt;department&gt;</code> with
        the same lightweight sign-in used for applications and leave requests.
      </p>
    </DocsLayout>
  );
}
