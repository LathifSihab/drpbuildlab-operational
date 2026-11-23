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
- Cloudflare Access in front of staging (`https://drp-operational-staging.goosebumpsevents.workers.dev`); JWT verification hook; `users` table and roles.
- CI: typecheck, lint, tests; deploy `main` to staging.

Trigger.dev moved to Phase 2 (decided 2026-11-19). The hello-world wiring already in `trigger/` stays, but Phase 1 does not depend on it.

**Done when**: a team member signs in at the staging URL and sees the project list.

## Phase 1a: Manual project management

The team can manage projects by hand before intake exists (and fix anything intake gets wrong later).

- Project list with search; create, view, edit, and delete (soft delete: hidden and restorable by an admin).
- Fields: title, client and partner (pick or type a new one), account manager, PIC (person in charge), phase, platform, product type, site/staging/production/repo URLs (http/https only), domain registrar, tools (several per project, picked from a shared list; only an admin adds a new tool, with +), notes.
- Roles: admin, dev, and business create and edit; only admin deletes and restores.
- Every create, change (with the changed fields), delete, and restore writes `audit_log`; the project page shows its history.

**Done when**: on staging, a team member creates a project, edits its phase, and an admin deletes and restores it, and the project page shows all four changes in its history.

## Phase 1b: Clients and partners

- Client list with search; create, view, and edit. Delete only by admin, and only when no project uses the client.
- Fields: name, partner (yes/no), contacts (name, email, phone, role), email domains (intake uses them in Phase 2), notes.
- Client page lists its projects, both as end client and as partner.
- Contacts and notes are personal data: admin and dev see them; business sees the name and projects only (ARCHITECTURE.md, data model).
- Every create, change, and delete writes `audit_log`; the client page shows its history.

**Done when**: on staging, a team member adds a client with a contact, links a project to it, and the client page shows that project and both changes in its history, while a business user does not see the contact.

## Phase 1c: Kanban

- Board with one column per phase (lead to lost); drag a card to change its phase; filter by account manager and platform.
- A move is the same change as editing the phase on the project page: it writes `audit_log`.
- Phase colors, each paired with its text label (DESIGN.md).

**Done when**: on staging, a business team member moves a project on the board and the move shows in the project's history, every active project is on the board, and the business team updates phases there instead of anywhere else.

## Phase 1d: Tasks on a project

- New `tasks` table: project, title, type (enhancement, revision, bug fix, integration, platform config, maintenance, other), description, status (`todo` / `in_progress` / `done`), assignee, due date, and request (empty for now; Phase 4 fills it from approved requests). ARCHITECTURE.md updated: tasks replace `requests.work_status`.
- Task list on the project page: add, edit, change status (Start / Mark done / Reopen), delete. A "My tasks" page across projects, with an "Everyone" view.
- Every change writes `audit_log`.

**Done when**: on staging, a developer adds a task to a project, assigns it, and moves it to done, and it shows in "My tasks" and in the project's history.

## Phase 1e: Team and roles

- Admin page: list users (created on first sign-in), change a user's role. Every role change writes `audit_log`.

**Done when**: on staging, an admin changes a user's role and that user's access changes on their next page load.

## Phase 1f: One login for all internal apps

DRP Operational first; the CMS and client zone follow once Operational is in daily use. Details and rollout order in INTERNAL_GATEWAY.md.

- DRP Operational (now): Access on staging; Microsoft Entra ID login in Cloudflare Zero Trust.
- DRP Operational (production): separate internal domain `drpbuildlab.dev` on Cloudflare (`drpbuildlab.com` website and email untouched); `operational.drpbuildlab.dev`; portal at `internal.drpbuildlab.dev`.
- Later: CMS and client zone staff pages move to `.dev` and verify the gateway token; their own staff logins are removed. Client/partner links and webhooks stay on `clientzone.drpbuildlab.com`, outside the gateway.

**Done when**: the done-when line in INTERNAL_GATEWAY.md is true.

## Phase 2: Intake

- Trigger.dev first (moved from Phase 1): project and environments set up (SETUP.md step 3), and the hello-world task in `trigger/` writes a row visible in the UI on staging.
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
- `generate-brief` task: task brief on the linked project, added to its task list (Phase 1d) and linked to the request.

**Done when**: approving a new build on staging produces a repo a developer can open in Claude Code and start Milestone 1 of its PLAN.md without asking for more context, and approving a small job (e.g. a Shopify fix) produces a task brief on the client's project that a developer can do without reading the original emails.

## Phase 5: Project secrets

The registry and kanban moved to Phase 1 (1a-1c). The project page gains the project's requests here.

- Secrets tab per project: keys per environment, reveal, add, "Download .env", all audited.

**Done when**: on staging, a developer adds a project's keys for two environments and downloads a working `.env`, and every reveal and download shows in the audit log.

## Phase 6: Documents

- Template management (Markdown with project fields).
- Generate NDA (lawyer-approved template, fields only), user guide (AI-drafted from project data), and project proposal; export to Word/PDF; store in R2.

**Done when**: an NDA and a user guide for a real project are generated, reviewed, and sent without manual reformatting.

## Phase 7 (optional): WhatsApp

- WhatsApp Business Platform (Cloud API) webhook route, excluded from Access by a bypass policy and verified by Meta's signature.
- Messages to the business number attach to projects like emails.

**Done when**: a message to the business number appears in the right project's sources.
