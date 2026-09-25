import Head from "next/head";
import DocsLayout from "../../components/DocsLayout";

export default function RosterDoc() {
  return (
    <DocsLayout>
      <Head><title>Roster & Role Sync — RostR Docs</title></Head>
      <h1>Roster &amp; Role Sync</h1>
      <p>Every department has a roster: a structure of posts, each optionally held by a real Discord member.</p>

      <h2>How a roster is organized</h2>
      <ul>
        <li><strong>Categories</strong> — the top level, e.g. "Gold Command" or "Field Staff", each with its own color and optional description.</li>
        <li><strong>Sub-categories</strong> — optional groups inside a category, e.g. "Sergeants" within "Supervisors".</li>
        <li><strong>Posts</strong> — individual seats: a rank, callsign, the member holding it, driver level, certifications, and the date they took it.</li>
      </ul>
      <p>
        New departments can start from a template (EMS, Police, Fire, Gang/Crew, Server Staff) instead of a blank
        roster — pick one on the setup page. Everything a template creates can be edited afterward.
      </p>

      <h2>Building the structure (Admin Panel)</h2>
      <ul>
        <li>Add, rename, recolor, reorder, and delete categories and sub-categories.</li>
        <li>Set <strong>Positions</strong> on a sub-category to add or remove posts in bulk. RostR won't remove a post someone's still holding — vacate it first.</li>
        <li><strong>Auto callsigns</strong> numbers every post in a sub-category up from the first one's callsign (e.g. AP-301, AP-302, …).</li>
        <li>Rank names, callsigns, and extra Discord roles per post are edited inline. Structural changes are saved with the <strong>Save roster</strong> button.</li>
      </ul>

      <h2>Assigning people (Manager or Admin Panel)</h2>
      <ul>
        <li>Click the Name field on any post and start typing — pick a member from your server, or "— Vacant —" to clear the post. It saves and syncs to Discord immediately.</li>
        <li>Nobody holds two posts at once: assigning someone who's already elsewhere on the roster moves them, carrying their driver level and certifications with them.</li>
        <li><strong>Change rank</strong> on a filled post promotes or demotes them to any rank in any category. If every post at that rank is taken, a new one is added.</li>
        <li>Certifications and driver level are set per person, straight from the roster row.</li>
      </ul>

      <h2>Discord nicknames</h2>
      <p>
        Anyone on a post with a callsign gets their Discord nickname set to <code>callsign | last name</code> — for
        example <code>AP-301 | Jones</code>. Use <strong>Edit name</strong> next to someone's Discord handle to change
        the part after the callsign. Discord never lets a bot change the server owner's nickname, so the owner is skipped.
      </p>

      <h2>Syncing Discord roles</h2>
      <p>
        Role sync is two-directional: RostR works out who <em>should</em> hold each role the roster controls (the
        department's staff role, plus any per-post extra roles), compares that with who holds it in Discord, and grants
        or revokes only the difference. Removing someone from the roster takes their roles away.
      </p>
      <p>
        A role can safely be shared between departments — for example one "Emergency Services" role used by both EMS
        and Fire. RostR only removes a shared role from someone who isn't on <em>any</em> department's roster that uses
        it. Don't reuse a RostR-managed role for anything outside RostR, though: anyone holding it who isn't on a roster
        will have it removed.
      </p>

      <h2>Exporting</h2>
      <p>The ⬇ button in the Admin Panel downloads the current roster as a PDF, one table per sub-category.</p>

      <h2>Requirements and troubleshooting</h2>
      <p>
        The bot needs <strong>Manage Roles</strong> and <strong>Manage Nicknames</strong>, and its own role must sit
        above every role it manages and above the members it renames (Server Settings → Roles). If something can't be
        applied, the roster page lists exactly which member and role failed.
      </p>
    </DocsLayout>
  );
}
