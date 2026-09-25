import Head from "next/head";
import DocsLayout from "../../components/DocsLayout";

const SUPPORT_URL = "https://discord.gg/y829Xsn5n";

export default function PrivacyDoc() {
  const contact = <a href={SUPPORT_URL}>our support Discord</a>;
  return (
    <DocsLayout>
      <Head><title>Privacy Policy — RostR Docs</title></Head>
      <h1>Privacy Policy</h1>
      <p className="updated">
        Last updated: 25 September 2026. This is a starting template, not legal advice — have it reviewed before
        relying on it (especially if you have users in the EU/UK, California, or other jurisdictions with specific
        data-protection requirements).
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>From Discord:</strong> your Discord user ID, username, and avatar (via Discord's OAuth login), and, for a server owner, the guild's ID, name, and icon.</li>
        <li><strong>Your server list:</strong> when you sign in to the dashboard, the list of Discord servers you're in and your permissions there, so we can show which servers you can manage. We don't store this list — it's fetched when you open the dashboard.</li>
        <li><strong>A Discord access token:</strong> issued by Discord when you sign in, used only to fetch that server list. It's encrypted before being stored and is discarded when your session ends (after 24 hours or when you sign out).</li>
        <li><strong>Roster and department data:</strong> whatever a server's admins enter — ranks, callsigns, assigned member IDs and names, certifications, department role IDs, question text, application answers, leave-of-absence dates and reasons.</li>
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
        <li><strong>Discord</strong> — to authenticate you and to read/write roles, nicknames, and member data your server's admins configure RostR to manage. Being placed on a roster can change your Discord nickname in that server (to your callsign and last name) and the roles you hold there.</li>
        <li><strong>Stripe</strong> — to process payments for paid plans.</li>
        <li><strong>Render</strong> — our hosting provider, which runs the application and database.</li>
      </ul>

      <h2>Data retention</h2>
      <p>
        Roster, application, leave, and document data is kept for as long as your server uses RostR. A server owner
        can delete a department (and everything in it) from the dashboard at any time. To request deletion of all of
        your server's data, contact {contact}.
      </p>

      <h2>Your choices</h2>
      <p>
        You can remove the RostR bot from your Discord server at any time via Discord's own server settings. A server
        owner can also request account/data deletion through {contact}.
      </p>

      <h2>Contact</h2>
      <p>Questions about this policy: {contact}.</p>
    </DocsLayout>
  );
}
