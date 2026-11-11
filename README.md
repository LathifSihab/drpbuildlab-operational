# DRP Operational

Internal platform for the DRP team. Client project emails arrive in Outlook, AI turns them into a structured project summary, a developer reviews and approves it, and approval generates a ready-to-code project pack (repo + MD guide files). The platform also holds the project registry, a kanban of client phases, and document templates.

## What's in this folder

| File | For | What it covers |
|---|---|---|
| `CLAUDE.md` | AI agents | Short project context, rules, and pointers to the docs below |
| `docs/PROJECT.md` | Everyone | Why we're building this, users, scope, out of scope, success metrics |
| `docs/ARCHITECTURE.md` | Devs | Flow, data model, statuses, auth, security, key decisions |
| `docs/AI_PIPELINE.md` | Devs | Summary schema, prompts, validation, project-pack generation |
| `docs/PLAN.md` | Everyone | Phases with "done when" criteria, up to staging and beyond |
| `docs/SETUP.md` | Devs | Environments and external services (Microsoft, Cloudflare, Neon, Trigger.dev, GitHub) |
| `docs/DESIGN.md` | Devs + AI | UI rules for DRP Operational itself |
| `docs/OPEN_QUESTIONS.md` | Everyone | Decisions still open, each with a suggested answer |
| `.env.example` | Devs | Every environment variable the app and tasks need |
| `src/`, `trigger/`, `drizzle/` | Devs | The app (SvelteKit on Workers), background tasks (Trigger.dev), and database migrations |
| `phase0/` | Devs | Phase 0 scripts (`prepare_threads.py`, `validate.py`) and `RATINGS.md`; inputs and outputs hold client data and are git-ignored |
| `email/` | Devs | Real client threads (`.msg`) used in Phase 0; git-ignored, never commit |

## Status

- Phase 0: done (`phase0/RATINGS.md`).
- Phase 1: code done and passing `npm run check`, `npm run lint`, `npm test`, `npm run build`. Waiting on account setup: follow the "Phase 1 checklist" at the top of `docs/SETUP.md`.

## Run locally

```bash
npm install
cp .env.example .env      # set DATABASE_URL, DEV_USER_EMAIL, BOOTSTRAP_ADMIN_EMAIL
npm run db:migrate
npm run dev               # app at http://localhost:5173
npm run trigger:dev       # in a second terminal, to run tasks locally
```
