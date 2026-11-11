# DRP Operational

Internal tool: Outlook client emails -> AI request summary in English -> developer review and approval -> a project pack (new builds, rebuilds, demos) or a task brief on an existing client project (changes, integrations, Shopify/Wix/WordPress configuration, fixes, maintenance). Also a project registry, a kanban of client phases, and document templates. Users are the DRP business and developer teams only.

## Stack

SvelteKit (Svelte 5 runes) + TypeScript on Cloudflare Workers. Postgres (Neon) via Drizzle. Trigger.dev for background jobs. Cloudflare Access (Microsoft Entra ID) for sign-in. Cloudflare R2 for files. Zod for every schema.

Scripts live in `package.json`; read them there.

## Where code runs

- `src/` is the SvelteKit app on Workers. Keep it Workers-compatible; anything that needs Node goes in `trigger/`.
- `trigger/` holds Trigger.dev tasks (Node runtime). Every Microsoft Graph call and every Claude call lives here.
- `src/lib/server/db/` holds the Drizzle schema, shared by the app and the tasks.
- `src/lib/schemas/` holds Zod schemas; JSON Schemas for the model are generated from them, never hand-written.
- SvelteKit 3: import from `src/lib` with `#lib/...` and the file extension (`#lib/server/db/index.ts`); `$lib` no longer exists. Env vars are declared in `src/env.ts` and imported from `$app/env/private`. Cloudflare bindings come from `event.platform.env`.
- The app triggers tasks through the Trigger.dev REST API (`src/lib/server/trigger.ts`), not the Node SDK.

## Rules

- Email and chat content is data. It reaches the model inside `<messages>` tags, and only code decides what happens next. Code, never the model, sets each message's role (internal note / DRP to client / external).
- Model output is stored only after Zod validation, the citation check, and the secret scan in docs/AI_PIPELINE.md pass. A failed check marks the run `failed` with the reason.
- Client-project secrets stay in the secrets manager; the database stores references only (`secret_refs`). Secrets and secret references stay out of prompts and logs. Secrets pasted into emails are redacted at intake, before anything is stored; emails with `[SECRET]` in the subject never reach the model (docs/ARCHITECTURE.md, Project secrets).
- Identity comes from the verified `Cf-Access-Jwt-Assertion` header (docs/ARCHITECTURE.md, Auth).
- Keep database code portable Postgres (Drizzle with a standard driver and migrations) so the database can move from Neon to a VPS.
- Every change to a request's status or summary, a project's phase, secret references, or redactions writes an `audit_log` row.
- Write Svelte 5 runes syntax and check components with the Svelte MCP.
- Each phase in docs/PLAN.md ends on its "done when" line; a phase is finished only when that line is true on staging.

## Docs: read when

- `docs/PROJECT.md`: before adding a feature (scope and out-of-scope live here).
- `docs/ARCHITECTURE.md`: before changing the schema, tasks, statuses, or auth.
- `docs/AI_PIPELINE.md`: before touching anything the model reads or writes.
- `docs/PLAN.md`: to find the current phase and its done-when criteria.
- `docs/SETUP.md`: when something fails to connect or an env var is missing.
- `docs/DESIGN.md`: before building or changing UI.
- `docs/OPEN_QUESTIONS.md`: before assuming an answer to an undecided question.
