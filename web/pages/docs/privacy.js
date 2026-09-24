import Head from "next/head";
import DocsLayout from "../../components/DocsLayout";

export default function PrivacyDoc() {
  return (
    <DocsLayout>
      <Head><title>Privacy Policy — RostR Docs</title></Head>
      <h1>Privacy Policy</h1>
      <p className="updated">
        Last updated: [date]. This is a starting template, not legal advice — have it reviewed before relying on it
        (especially if you have users in the EU/UK, California, or other jurisdictions with specific data-protection
        requirements), and fill in the bracketed placeholders with your real details.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>From Discord:</strong> your Discord user ID, username, and avatar (via Discord's OAuth login), and, for a server owner, the guild's ID, name, and icon.</li>
        <li><strong>Roster and department data:</strong> whatever a server's admins enter — slot titles, assigned member IDs, department role IDs, question text, application answers, leave-of-absence dates and reasons.</li>
        <li><strong>Uploaded files:</strong> SOP documents uploaded to a department, stored as-is.</li>
        <li><strong>Billing data:</strong> handled directly by Stripe. We store a Stripe customer/subscription ID, not your card details.</li>
        <li><strong>A session cookie:</strong> to keep you signed in. It contains a random token, not your Discord credentials.</li>
      </ul>

      <h2>How we use it</h2>
      <p>
        To run the service: authenticate you, apply Discord role changes you or your server's admins request, show
        rosters/applications/leave requests to the right people, and process payments. We don't sell your data.
      </p>

      <h2>Who we share it with</h2>
      <ul>
        <li><strong>Discord</strong> — to authenticate you and to read/write roles, nicknames, and member data your server's admins configure RostR to manage.</li>
        <li><strong>Stripe</strong> — to process payments for paid plans.</li>
        <li><strong>[Your hosting provider]</strong> — to run the application and database.</li>
      </ul>

      <h2>Data retention</h2>
      <p>
        Roster, application, leave, and document data is kept for as long as your server uses RostR. To request
        deletion of your server's data, contact [contact email].
      </p>

      <h2>Your choices</h2>
      <p>
        You can remove the RostR bot from your Discord server at any time via Discord's own server settings. A server
        owner can also request account/data deletion by contacting [contact email].
      </p>

      <h2>Contact</h2>
      <p>Questions about this policy: [contact email].</p>
    </DocsLayout>
  );
}
