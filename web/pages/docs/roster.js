import Head from "next/head";
import DocsLayout from "../../components/DocsLayout";

export default function RosterDoc() {
  return (
    <DocsLayout>
      <Head><title>Roster & Role Sync — RostR Docs</title></Head>
      <h1>Roster &amp; Role Sync</h1>
      <p>Every department has a roster: a list of slots, each optionally assigned to a real Discord member.</p>

      <h2>Building a roster</h2>
      <p>A roster is organized into sections (e.g. "Gold Command," "Ambulance Staff"), each holding any number of ranks.</p>
      <ul>
        <li>Add a section, give it a name and an optional description/color.</li>
        <li>Add ranks within it — a title, callsign, driver level, certifications, and the date someone was appointed.</li>
        <li>Search for a Discord member by name to assign them to a rank — results come straight from your server's member list.</li>
        <li>Each rank can also have its own extra Discord roles beyond the department's general staff role (e.g. a "Command Staff" badge role for senior ranks only).</li>
        <li>Click "Save roster" once you're happy with it.</li>
      </ul>

      <h2>Syncing Discord roles</h2>
      <p>
        "Sync Discord roles" is two-directional: it works out who <em>should</em> hold each role your roster controls
        (the department's staff role, plus any rank-specific roles) from the roster itself, compares that against who
        currently holds each role in Discord, and grants or revokes only the difference. Removing someone from the
        roster and re-syncing takes their roles away automatically.
      </p>
      <p>
        Because of that, don't reuse a role that RostR manages for anything else — if a role is set as a department's
        staff role or attached to a rank, sync treats holding that role as meaning "should be on this roster" and will
        remove it from anyone it doesn't expect to have it.
      </p>

      <h2>Requirements</h2>
      <p>
        RostR's bot needs the <strong>Manage Roles</strong> permission in your server, and its own role must sit above
        any role it's assigned to manage. If a sync fails for a member, this is the most common cause.
      </p>
    </DocsLayout>
  );
}
