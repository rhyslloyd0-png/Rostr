import Head from "next/head";
import DocsLayout from "../../components/DocsLayout";

export default function RosterDoc() {
  return (
    <DocsLayout>
      <Head><title>Roster & Role Sync — RostR Docs</title></Head>
      <h1>Roster &amp; Role Sync</h1>
      <p>Every department has a roster: a list of slots, each optionally assigned to a real Discord member.</p>

      <h2>Building a roster</h2>
      <ul>
        <li>Click "+ Add slot" and give it a title (a post, rank, or callsign).</li>
        <li>Search for a Discord member by name to assign them — results come straight from your server's member list.</li>
        <li>Click "Save roster" once you're happy with it.</li>
      </ul>

      <h2>Syncing Discord roles</h2>
      <p>
        "Sync Discord roles" applies the department's staff role to every member currently assigned to a slot. It's safe
        to run repeatedly — applying a role someone already has does nothing.
      </p>
      <p>
        Role sync is currently one-directional: it grants the staff role to rostered members, but doesn't remove it from
        someone taken off the roster. Remove that role by hand in Discord if needed, or edit the roster and re-sync.
      </p>

      <h2>Requirements</h2>
      <p>
        RostR's bot needs the <strong>Manage Roles</strong> permission in your server, and its own role must sit above
        any role it's assigned to manage. If a sync fails for a member, this is the most common cause.
      </p>
    </DocsLayout>
  );
}
