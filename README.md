# RostR

Multi-tenant Discord roster management. Any server owner adds the bot and configures everything themselves from the web dashboard — no per-server backend setup.

Built so far: Discord OAuth + bot install in one flow, guild/department data model, Stripe-backed plan tiers (Free/Pro/Enterprise), a roster editor with Discord role sync, and an Applications flow (custom questions, review queue, applicant status page). LOA and SOP documents are the remaining phases.

## Structure

- `server/` — Express API: Discord OAuth (guild-owner and applicant-identify modes), session cookies, guild/department CRUD, roster + role-sync, member search, applications, Stripe billing + webhook. Talks to Postgres directly (`server/db`).
- `web/` — Next.js dashboard: login, guild switcher, setup wizard, department pages with a roster editor and applications review; a separate `/apply/[guildId]/...` public flow for applicants.

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
6. Applicants use a separate, lighter login at `/apply/<guildId>` — it only requests `identify` (no bot prompt, no server picker) since they're not installing anything, just proving who they are on Discord to submit an application.

## Stripe webhook (local testing)

Use the Stripe CLI to forward events to the running API:
```
stripe listen --forward-to localhost:3001/billing/webhook
```
Copy the signing secret it prints into `STRIPE_WEBHOOK_SECRET`.
