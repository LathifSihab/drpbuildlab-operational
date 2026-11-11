# Plan

Each phase ends on its **done when** line, checked on staging (except Phase 0).

## Phase 0: Validate by hand (no code)

- Pick 5-10 past project email threads covering different request types (the first five are in `email/`). Prepare the sources by hand as in AI_PIPELINE.md section 1, run the system prompt manually, and save the outputs in `phase0/`.
- A developer rates each summary: usable as-is, small edits, or rewrite (`phase0/RATINGS.md`).
- Run UI UX Pro Max on 2-3 of those projects' product types and judge the design output.
- Note how long each past project took from first email to agreed scope (baseline for metrics).

**Done when**: most summaries are usable with small edits, the schema needs no new fields, and the baseline is written in PROJECT.md.

## Phase 1: Skeleton on staging

- SvelteKit + TypeScript + Drizzle + Neon; `adapter-cloudflare`; Hyperdrive binding.
- Cloudflare Access with Entra ID in front of `staging`; JWT verification hook; `users` table and roles.
- Trigger.dev project with a staging environment; one hello-world task that writes to the DB.
- CI: typecheck, lint, tests; deploy `main` to staging.

**Done when**: a team member signs in with Microsoft at the staging URL, sees an empty project list, and a manually triggered task writes a row visible in the UI.

## Phase 2: Intake

- Entra app registration and the staging intake mailbox `projects-staging@drpbuildlab.com` (SETUP.md).
- Answer OPEN_QUESTIONS #13 (`uniqueBody` on forwards) with a test forward first.
- `poll-intake` scheduled task: Graph delta query, body as text, source preparation (thread splitting, role labels, secret redaction, attachments to R2, link extraction), store `requests`, `source_messages`, `attachments`, `redactions`; create/attach requests by `conversation_id`.
- Unit tests for the thread splitter and secret scanner on Dutch and English Outlook, Gmail, and Apple Mail formats.
- Infisical project and machine identity; `[SECRET]` emails and detected secrets parked in Infisical; Secrets inbox page that files them into a project's secrets.
- Intake list page with "merge into request" and the suggested client project.

**Done when**: an email forwarded to the staging intake mailbox appears as a request in `received` within 5 minutes with its quoted thread split into separate messages and a planted test key redacted, and a reply in the same thread attaches to it; an email forwarded with `[SECRET]` in the subject appears only in the Secrets inbox and can be filed as a named key on a project.

## Phase 3: Summary and review (staging demo for the team)

- `summarize-request` task with validation and R2 logs; eval script with fixtures.
- Review page: sources and attachments left, editable summary right, citation highlighting, request type and project link, approve.
- Open questions list with technical/business tags and answers.
- Feedback on approval ("what did the AI get wrong?"), Feedback page, and lessons with draft -> eval -> active (AI_PIPELINE.md section 7). Seed the first lessons from Phase 0 ratings.

Use anonymized samples until OPEN_QUESTIONS #1 is answered.

**Done when**: forward -> AI draft -> edit -> approve works end to end on staging, both versions are stored, feedback given on approval turns into a lesson that changes the next draft, and the eval script passes on all fixtures. **Show the team at this point.**

## Phase 4: Project pack and task brief

- Decide OPEN_QUESTIONS #12 (GitHub organization) first.
- SvelteKit template repo with base `CLAUDE.md` and `.mcp.json`.
- `generate-pack` task: MD files, repo from template, single commit.
- `generate-brief` task: task brief on the linked project; task list with `work_status` on the project page.

**Done when**: approving a new build on staging produces a repo a developer can open in Claude Code and start Milestone 1 of its PLAN.md without asking for more context, and approving a small job (e.g. a Shopify fix) produces a task brief on the client's project that a developer can do without reading the original emails.

## Phase 5: Registry and kanban

- Registry table and project detail page (end client, partner, account manager, platform, deployments, domains, tools, requests and tasks).
- Secrets tab per project: keys per environment, reveal, add, "Download .env", all audited.
- Kanban by `phase` with drag-and-drop; audit log on every move.

**Done when**: every active project is in the registry and the business team updates phases there instead of anywhere else.

## Phase 6: Documents

- Template management (Markdown with project fields).
- Generate NDA (lawyer-approved template, fields only), user guide (AI-drafted from project data), and project proposal; export to Word/PDF; store in R2.

**Done when**: an NDA and a user guide for a real project are generated, reviewed, and sent without manual reformatting.

## Phase 7 (optional): WhatsApp

- WhatsApp Business Platform (Cloud API) webhook route, excluded from Access by a bypass policy and verified by Meta's signature.
- Messages to the business number attach to projects like emails.

**Done when**: a message to the business number appears in the right project's sources.
