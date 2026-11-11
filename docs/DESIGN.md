# Design: DRP Operational UI

Product type: internal operations dashboard for a small agency team. Palette and type come from UI UX Pro Max (rows "B2B Service" colors, "Minimal Swiss" typography), checked in Phase 0.

## Tokens (`src/app.css`)

| Token | Light | Dark |
|---|---|---|
| background | `#F8FAFC` | `#020617` |
| foreground | `#020617` | `#F8FAFC` |
| card | `#FFFFFF` | `#0F172A` |
| primary / on primary | `#0F172A` / `#FFFFFF` | `#F8FAFC` / `#0F172A` |
| secondary | `#334155` | `#CBD5E1` |
| accent (links, focus, CTAs) | `#0369A1` | `#38BDF8` |
| muted / muted foreground | `#E8ECF1` / `#475569` | `#1E293B` / `#94A3B8` |
| border | `#E2E8F0` | `#1E293B` |
| destructive | `#DC2626` | `#F87171` |

Font: Inter (variable, self-hosted via `@fontsource-variable/inter`), one family for everything; tabular numbers in tables. Status and phase colors are added in Phase 3 and 5, each paired with its text label.

## Principles

- **Dense and scannable**: tables and lists over cards; key fields visible without clicking.
- **Status is always visible**: one color per `pipeline_status` and per `phase`, used identically on every screen, always paired with a text label.
- **Source next to AI**: anywhere AI content appears, its cited source is one click away.
- Light and dark mode; WCAG 2.2 AA contrast; full keyboard navigation.

## Building blocks

shadcn-svelte components on Tailwind CSS. Extend these before creating new components. Design tokens (colors, radius, spacing) in one place: `src/app.css`.

## Key screens

| Screen | Layout |
|---|---|
| Intake | List of new requests with sender, date, request type, urgency, deadline, status, suggested project; "merge into request" action; "secret shared in email" warning |
| Review | Two panes: source messages with role badges (internal note / DRP to client / external) and attachment list (left), editable summary with citation chips (right); request type and project link above the summary; sticky Approve bar |
| Open questions | Grouped by technical / business and blocking; inline answer field |
| Registry | Sortable table with client, partner, platform, phase; project detail page with tabs (overview, requests and tasks, deployments, secrets, documents, audit) |
| Secrets tab | Table per environment: KEY, masked value, source, updated by/at; Reveal and Copy per row; "Download .env" and "Add secret" buttons; Infisical CLI command shown for developers. Admin and dev only |
| Secrets inbox | List of flagged emails and detected secrets; open one to see its text, select a value, name it, pick project and environment, Save; "Mark done" removes the stored copy |
| Kanban | Columns per phase (lead and proposal first, lost beside closed); cards show client, partner, title, account manager, days in phase |
| Templates | List + Markdown editor with field placeholders and preview |
| Feedback | Feedback grouped by tag with links to each draft/approved diff; lessons list (draft / active / retired) with eval result and activate button |
