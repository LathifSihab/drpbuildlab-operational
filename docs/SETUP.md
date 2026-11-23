# Setup

## Phase 1 checklist (what only an account owner can do)

The code for Phase 1 is in the repo. These steps connect it to real accounts. Do them in order; each says what to copy where.

1. **Neon**: create a **new** project `drp-operational` (EU region). Don't reuse the existing "DRP Buildlab" project; its `production` branch holds another app's data. Create branches `staging` and `dev` from `main`. Copy each branch's connection string.
2. **Local**: copy `.env.example` to `.env`; set `DATABASE_URL` (dev branch), `DEV_USER_EMAIL` and `BOOTSTRAP_ADMIN_EMAIL` (your email). Run `npm run db:migrate`, then `npm run dev`. You should see the empty project list.
3. **Trigger.dev** (Phase 2; skip for Phase 1): create project `drp-operational`. Put its ref in `.env` as `TRIGGER_PROJECT_REF`. In the dev and staging environments set `DATABASE_URL` (dev / staging branch). Copy each environment's secret key: dev key to `.env` as `TRIGGER_SECRET_KEY`. Locally, run `npm run trigger:dev` next to `npm run dev` and press "Run hello-world task".
4. **Cloudflare**:
   - R2 bucket `drp-ops-staging`.
   - Hyperdrive config pointing at the Neon **staging** branch; paste its id into `wrangler.jsonc` (`REPLACE_WITH_STAGING_HYPERDRIVE_ID`).
   - Zero Trust: add Microsoft Entra ID as identity provider; create a self-hosted Access application for `staging.<domain>` allowing your team's emails. Copy the team domain and the application's AUD tag.
   - Worker secrets for staging: `npx wrangler secret put CF_ACCESS_TEAM_DOMAIN --env staging`, and the same for `CF_ACCESS_AUD`, `BOOTSTRAP_ADMIN_EMAIL`, and in Phase 2 `TRIGGER_SECRET_KEY` (staging key).
   - Add the custom domain `staging.<domain>` to the `drp-operational-staging` Worker.
   - Create an API token with "Edit Cloudflare Workers" for CI.
5. **GitHub**: create the repo, push, and add environment `staging` with secrets `STAGING_DATABASE_URL`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `TRIGGER_ACCESS_TOKEN` (Trigger.dev personal access token) and variable `TRIGGER_PROJECT_REF`. A push to `main` then checks, migrates, and deploys both the app and the tasks.
6. **Check Phase 1 "done when"**: sign in at `https://staging.<domain>` with Microsoft and see the empty project list. (The hello-world task check moved to Phase 2.)

### Token renewal

| Token | Where it's stored | Renew by |
|---|---|---|
| Cloudflare API token "drp-operational GitHub deploy" | GitHub secret `CLOUDFLARE_API_TOKEN` (env `staging`) | its expiry date (created 2026-11-12; 1 year if chosen) |
| Cloudflare API token "ops" (user token on the `Info@drpbuildlab.com` account: Workers Scripts, R2 and KV Edit, Account Settings Read, Workers Routes Write; also `CLOUDFLARE_API_TOKEN` in local `.env`) | GitHub secret `CLOUDFLARE_API_TOKEN` (env `production`, set 2026-11-23) | no expiry; when revoked or the owner changes. A production deploy without Workers Scripts Edit fails with "No access to the specified service" |
| Trigger.dev personal access token | GitHub secret `TRIGGER_ACCESS_TOKEN` (env `staging`) | when revoked or the owner changes |

To renew: create the new token, run `gh secret set <NAME> --env staging --repo LathifSihab/drpbuildlab-operational`, then delete the old token.

## Environments

| | Local | Staging | Production |
|---|---|---|---|
| App | `vite dev` | https://drp-operational-staging.goosebumpsevents.workers.dev (no custom domain yet), behind Access | https://drp-operational.goosebumpsevents.workers.dev (free address until `drpbuildlab.dev` is bought, INTERNAL_GATEWAY.md), behind Access |
| Database | Neon dev branch, `ep-withered-mode` (`DATABASE_URL` in `.env`) | Same dev branch as local (staging Hyperdrive and `STAGING_DATABASE_URL` point at it) | Neon `production` branch, the project's main branch, `ep-patient-dream` (`DATABASE_URL_PRODUCTION` in `.env`; real data, never test against it) |
| Deploy | | CI, on every push to `main` | CI, only from Actions -> CI -> **Run workflow** on `main`, after the owner approves the `production` environment. Secrets: `PRODUCTION_DATABASE_URL`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| Trigger.dev | Development environment (`npm run trigger:dev`) | For now also the Development environment: tasks run only while a developer runs `npm run trigger:dev` (our plan has no Staging environment; not deployed by CI) | Production environment, deployed by CI |
| Intake mailbox | Fixtures only | `projects-staging@drpbuildlab.com` with anonymized samples | `projects@drpbuildlab.com` |
| Secrets | `.dev.vars` / `.env` (git-ignored) | Cloudflare + Trigger.dev env vars | Cloudflare + Trigger.dev env vars |

## Microsoft 365 (owner is the tenant admin)

1. Create shared mailboxes `projects@drpbuildlab.com` and `projects-staging@drpbuildlab.com`. Shared mailboxes need no extra license.
2. In Microsoft Entra ID, register a single-tenant app "DRP Operational". Use a certificate credential (preferred) or client secret.
3. Give the app read access to **only** the intake mailboxes using Exchange Online's Role Based Access Control for Applications (Microsoft's guide: "RBAC for Applications in Exchange Online"). Tenant-wide `Mail.Read` granted in Entra adds to that scope, so leave it out. Use the guide's test command to confirm the app can read the intake mailbox and is denied on any other mailbox.
4. Teach the business team to forward client emails to `projects@drpbuildlab.com`, ideally with "Forward as attachment".

## Cloudflare

1. Workers project with `@sveltejs/adapter-cloudflare`; bindings in `wrangler.toml` for Hyperdrive and R2.
2. Zero Trust -> add Microsoft Entra ID as an identity provider -> create Access applications for staging and production with a policy for your team's emails or group. Copy the team domain and the application audience (AUD) tag into env.
3. Hyperdrive config pointing at the Neon connection string per environment.
4. R2 bucket per environment (`drp-ops-staging`, `drp-ops-prod`).

## Database

### Now: Neon

One project with branches `main`, `staging`, `dev`. Run Drizzle migrations from CI per environment.

### Client zone import

`npm run import:clientzone` copies the client zone's partners and quotes into Ops (`scripts/import-clientzone.ts`, rules in `scripts/clientzone/map.ts`). It reads the client zone in a read-only transaction and never changes it.

- Set `CLIENTZONE_DATABASE_URL` in `.env` (the client zone's Neon `production` branch, project `plain-mouse-54371797`). It is not a Worker variable, so it is not in `.env.example`.
- Without `--apply` it is a dry run: every write runs in a transaction that is rolled back, and it prints what would be created. Add `--target production` to use `DATABASE_URL_PRODUCTION` instead of `DATABASE_URL`; `--skip Q-2026-XXXXXX,...` leaves quotes out.
- Active partners become partner clients. Each quote becomes a project (paid or accepted -> `build`, open -> `proposal`, ended -> `closed`, expired -> `lost`) on a client made from the quote's name, email, lead contact and business email domain. Cancelled, draft, `outdated`-labelled and "test" quotes are skipped, and so are leads without a quote.
- Safe to run again. Each imported row's `client.created` / `project.created` audit entry (actor `system:clientzone-import`) carries `importedFrom` (`clientzone:partner:<id>`, `clientzone:quote:<reference>`); a source row already imported is skipped, even when it was edited or deleted in Ops since, so Ops edits are never overwritten. A client or partner with the same name as an existing one is reused, and an email domain another client already has is left off.

### Later: Postgres on a VPS

1. Separate databases per environment (`drp_ops_prod`, `drp_ops_staging`).
2. Reachable by Cloudflare Hyperdrive and by Trigger.dev: either TLS-only with an IP allowlist, or Cloudflare Tunnel (Hyperdrive supports private databases through Tunnel; Trigger.dev cloud still needs a reachable endpoint, or self-host Trigger.dev on the VPS).
3. Migrate with `pg_dump` / `pg_restore`, update the Hyperdrive config and `DATABASE_URL`. Because the code uses plain Postgres, nothing else changes.

## Trigger.dev

Create the project, link it in `trigger.config.ts`, and set the env vars from `.env.example` in the staging and production environments. Tasks connect to Neon directly with the branch's connection string.

## AI provider (SumoPod for now)

API key per environment in Trigger.dev env vars (OPEN_QUESTIONS #28). Before sending real client emails, resolve the data-handling question in OPEN_QUESTIONS.md.

## GitHub

1. Template repo `drp-sveltekit-template` with base `CLAUDE.md`, `docs/`, and `.mcp.json` (Svelte, Playwright, Context7 MCP servers).
2. Now (personal account): a token limited to creating repositories and writing contents on that account, stored only in Trigger.dev env vars (`GITHUB_TOKEN`).
3. Repos stay on the personal account (OPEN_QUESTIONS #12). Only if DRP later creates an organization: move the template there, switch to a GitHub App installed on the org (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`), set `GITHUB_OWNER` to the org, and revoke the personal token.

## Secrets manager

Infisical: an open-source secrets manager, used as a hosted service now and self-hostable on the VPS later. One folder per client project. `secret_refs.reference` stores the path, never the value.
