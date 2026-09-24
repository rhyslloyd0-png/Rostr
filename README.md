# RostR

Multi-tenant Discord roster management. Any server owner adds the bot and configures everything themselves from the web dashboard — no per-server backend setup.

All planned Phase 1–5 features are built: Discord OAuth + bot install in one flow, guild/department data model, Stripe-backed plan tiers (Free/Pro/Enterprise), a roster editor with Discord role sync, an Applications flow (custom questions, review queue, applicant status page), Leave of Absence (self-service request, admin approval, automatic role activation/deactivation on a schedule), and an SOP document library (upload/rename/delete for admins, list/download for anyone holding the department's access/staff role).

## Structure

- `server/` — Express API: Discord OAuth (guild-owner and applicant-identify modes), session cookies, guild/department CRUD, roster + role-sync, member search, applications, leave of absence + its scheduler (`jobs/loaScheduler.js`), SOP document storage (in Postgres, via `multer`), Stripe billing + webhook. Talks to Postgres directly (`server/db`).
- `web/` — Next.js dashboard: login, guild switcher, setup wizard, department pages with a roster editor, applications review, LOA review, and SOP document management; separate public flows at `/apply/[guildId]/...`, `/loa/[guildId]/...`, and `/sop/[guildId]/...` for applicants and staff.

## Local setup

1. Create a Discord application at https://discord.com/developers/applications. Add a redirect URI matching `DISCORD_REDIRECT_URI` (e.g. `http://localhost:3001/auth/discord/callback`). Under Bot, copy the token, and enable the **Server Members Intent** toggle (Bot page) — the roster editor's member search and role sync both need it.
2. Copy `.env.example` to `server/.env` and fill in `DISCORD_CLIENT_ID/SECRET`, `DISCORD_BOT_TOKEN`, `DATABASE_URL` (a local or hosted Postgres), `SESSION_SECRET` (any random string), and Stripe test keys.
3. Copy `web/.env.local.example` to `web/.env.local`.
4. Install and run both:
   ```
   cd server && npm install && npm run dev
   cd web && npm install && npm run dev
   ```
5. Visit `http://localhost:3000`, click "Add RostR to Discord" — this both installs the bot to a server you own/manage and logs you in, then drops you into the setup wizard.
6. Applicants and staff (applying, requesting leave, or browsing SOP documents) use a separate, lighter login at `/apply/<guildId>`, `/loa/<guildId>/<deptId>`, and `/sop/<guildId>/<deptId>` — it only requests `identify` (no bot prompt, no server picker) since they're not installing anything, just proving who they are on Discord.

## Plan gating

Every feature beyond core roster management (applications, LOA, SOP) is gated by the `plans` table's `features` column, checked with `requireFeature()` in `server/config/plans.js`. A guild on the Free plan sees an upgrade prompt on the dashboard instead of the panel, and the equivalent API routes 402. Adjust the seeded plan limits/features in `server/db/migrations/0001_init.sql` before launch — the current Free/Pro/Enterprise split (1/10/unlimited departments) is a placeholder.

## Stripe webhook (local testing)

Use the Stripe CLI to forward events to the running API:
```
stripe listen --forward-to localhost:3001/billing/webhook
```
Copy the signing secret it prints into `STRIPE_WEBHOOK_SECRET`.
