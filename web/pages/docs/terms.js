import Head from "next/head";
import DocsLayout from "../../components/DocsLayout";

export default function TermsDoc() {
  return (
    <DocsLayout>
      <Head><title>Terms of Service — RostR Docs</title></Head>
      <h1>Terms of Service</h1>
      <p className="updated">
        Last updated: [date]. This is a starting template, not legal advice — have it reviewed before relying on it, and
        fill in the bracketed placeholders ([operator name], [contact email], [jurisdiction]) with your real details.
      </p>

      <h2>1. Who this covers</h2>
      <p>
        These terms are between you (a Discord server owner or a member of a server using RostR) and [operator name]
        ("RostR", "we", "us"). By adding the RostR bot to a Discord server or using the RostR dashboard, you agree to
        these terms.
      </p>

      <h2>2. What RostR does</h2>
      <p>
        RostR is a roster management tool for Discord servers: departments, rosters, Discord role synchronization,
        applications, leave-of-absence tracking, and document storage, configured and operated by the server's own
        owner and any staff they designate.
      </p>

      <h2>3. Accounts and access</h2>
      <p>
        You sign in with Discord OAuth. A server's owner has full control over that server's RostR configuration and can
        grant additional Discord roles admin access. You're responsible for who you grant that access to.
      </p>

      <h2>4. Plans and billing</h2>
      <p>
        RostR offers a Free plan and paid plans with additional department limits and features, billed through Stripe.
        See <a href="/docs/billing">Billing &amp; Plans</a>. Subscriptions renew automatically until cancelled; you can
        cancel at any time through the billing portal linked from your dashboard.
      </p>

      <h2>5. Acceptable use</h2>
      <p>
        Don't use RostR to violate Discord's Terms of Service or Community Guidelines, to store unlawful content, or to
        attempt to disrupt or gain unauthorized access to the service.
      </p>

      <h2>6. Your content</h2>
      <p>
        Roster data, application answers, leave requests, and uploaded documents remain yours. You're responsible for
        having the right to store any content (including uploaded files) you put into RostR.
      </p>

      <h2>7. Availability</h2>
      <p>
        RostR is provided "as is," without guaranteed uptime. We may change or discontinue features with notice where
        practical.
      </p>

      <h2>8. Liability</h2>
      <p>
        To the extent permitted by law, [operator name] isn't liable for indirect or consequential damages arising from
        your use of RostR. [Add a liability cap and any required consumer-protection carve-outs for your jurisdiction.]
      </p>

      <h2>9. Changes to these terms</h2>
      <p>We may update these terms; continued use after a change means you accept the updated terms.</p>

      <h2>10. Contact</h2>
      <p>Questions about these terms: [contact email].</p>
    </DocsLayout>
  );
}
