import Head from "next/head";
import DocsLayout from "../../components/DocsLayout";
import { loginUrl } from "../../lib/api";

export default function GettingStarted() {
  return (
    <DocsLayout>
      <Head><title>Getting Started — RostR Docs</title></Head>
      <h1>Getting Started</h1>
      <p>RostR is a self-service roster manager for Discord servers — built for FiveM RP communities running EMS, gangs, or any other department structure. Everything below happens from your browser; there's no code to write and nothing to configure outside the dashboard.</p>

      <h2>1. Add the bot and sign in</h2>
      <p>
        Click <a href={loginUrl()}>Add ROSTR to Discord</a> from the home page. This does two things in one step: it installs
        the bot into whichever server you pick on Discord's own consent screen, and it logs you in as that server's owner.
        You'll land straight in the setup wizard for your first department.
      </p>

      <h2>2. Create your first department</h2>
      <p>
        A department is a self-contained roster — EMS, a gang, PD, whatever your server needs. Pick a name and, optionally,
        an access role (who can see the roster) and a staff role (applied to anyone on the roster). Both are pulled live
        from your server's own Discord roles — see <a href="/docs/departments">Departments</a>.
      </p>

      <h2>3. Build the roster</h2>
      <p>
        Add slots, assign real Discord members by searching for them, and hit "Sync Discord roles" to apply the
        department's staff role to everyone on the roster. See <a href="/docs/roster">Roster &amp; Role Sync</a>.
      </p>

      <h2>4. Turn on what you need</h2>
      <p>
        Applications, Leave of Absence, and the SOP document library are available depending on your plan — see{" "}
        <a href="/docs/billing">Billing &amp; Plans</a>. Each one is documented on its own page in the sidebar.
      </p>

      <h2>Who can manage a department?</h2>
      <p>
        The Discord server owner always has full access. The owner can also designate specific Discord roles as guild
        admins from the dashboard, without touching Discord's own server settings.
      </p>
    </DocsLayout>
  );
}
