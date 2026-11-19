# Design: DRP Operational UI

Product type: internal operations dashboard for a small agency team. Look and feel follow the live drpbuildlab.com (its `site.css`, November 2026): ink, fog, and electric blue; condensed uppercase headlines; pill buttons and chips; rounded fields.

## Tokens (`src/app.css`)

| Token | Light | Dark | Website name |
|---|---|---|---|
| background | `#F1F2F6` | `#0B0B0C` | fog / ink |
| foreground | `#0B0B0C` | `#F4F5F8` | ink |
| card | `#FFFFFF` | `#16171B` | paper / ink-2 |
| primary / hover / on primary (actions) | `#1F5EFF` / `#1749D6` / `#FFFFFF` | `#1F5EFF` / `#3A72FF` / `#FFFFFF` | electric |
| accent (links, focus) | `#1F5EFF` | `#7C9DFF` | electric / electric-hi |
| muted / muted foreground | `#ECEEF3` / `#5A5D67` | `#212228` / `#A5A7B0` | mute-l / mute-d |
| border / input | `#E2E4EA` / `#C9CCD6` | `#2A2B31` / `#45474F` | line-l |
| destructive | `#D92D20` | `#FF6B6B` | |
| ink / on ink (header bar, both themes) | `#0B0B0C` / `#FFFFFF`, links `#D4D5DC` | `#000000` | ink |
| chip on (picked chip) | `#0B0B0C` on `#FFFFFF` text | `#F4F5F8` with `#0B0B0C` text | |

Fonts, self-hosted (`@fontsource-variable/*`): **Archivo** for display (800, condensed to 80%, uppercase: page titles; 900 italic for the "DRP" wordmark), **Geist** for text (15px base), **Geist Mono** for codes, slugs, and section numbers. Tabular numbers in tables. Phase colors are added in Phase 1c and status colors in Phase 3, each paired with its text label.

## Principles

- **Dense and scannable**: tables and lists over cards; key fields visible without clicking.
- **Status is always visible**: one color per `pipeline_status` and per `phase`, used identically on every screen, always paired with a text label.
- **Source next to AI**: anywhere AI content appears, its cited source is one click away.
- Light and dark mode; WCAG 2.2 AA contrast; full keyboard navigation.

## Building blocks

Tailwind CSS with our own components; extend these before creating new ones. Design tokens (colors, fonts) and the shared classes (`.btn`, `.input`, `.chip`, `.card`, `.badge`, `.display`, `.data-table`) live in one place: `src/app.css`.

Shapes, as on the website: actions are pills (`rounded-full`), fields are rounded 12px, cards 16px.

Form components in `src/lib/components/`:

| Component | Use |
|---|---|
| `FormSection` | Numbered card ("01 Basics") with a one-line explanation |
| `ChoiceChips` | Radio group as pills, for short fixed lists (phase, platform, client type) |
| `EntityPicker` | Search an existing client/partner or create a new one by typing (ARIA combobox) |
| `TagInput` | Short free-typed lists (email domains): Enter or comma adds, Backspace removes |
| `ToolPicker` | Project tools: dropdown of the shared tool list, pick several; the + button (or Enter) adds a new tool, which joins the list on save |
| `ErrorSummary` | "N fields need attention", each item jumps to its field |
| `FormFooter` | Floating save bar: Save, Cancel, "Unsaved changes", Ctrl/⌘+Enter hint |
| `PageHeader`, `HistoryList` | Page title block; audit history timeline |

Form behavior: Ctrl/⌘+Enter saves; leaving with unsaved changes asks first (`unsaved-changes.ts`); URLs typed without `https://` get it on blur (`url.ts`); after a failed save the form keeps the sent values and focuses the first invalid field.

## Key screens

| Screen | Layout |
|---|---|
| Intake | List of new requests with sender, date, request type, urgency, deadline, status, suggested project; "merge into request" action; "secret shared in email" warning |
| Review | Two panes: source messages with role badges (internal note / DRP to client / external) and attachment list (left), editable summary with citation chips (right); request type and project link above the summary; sticky Approve bar |
| Open questions | Grouped by technical / business and blocking; inline answer field |
| Registry | Sortable table with client, partner, platform, phase; project detail page with tabs (overview, requests and tasks, deployments, secrets, documents, audit) |
| Secrets tab | Table per environment: KEY, masked value, source, updated by/at; Reveal and Copy per row; "Download .env" and "Add secret" buttons; Infisical CLI command shown for developers. Admin and dev only |
| Secrets inbox | List of flagged emails and detected secrets; open one to see its text, select a value, name it, pick project and environment, Save; "Mark done" removes the stored copy |
| Tasks | On the project page: open tasks first (in progress, then to do by due date), done tasks folded away; each row shows status, title, type, assignee, due date (overdue in red with the word "Overdue"), and Start / Mark done / Reopen. "My tasks" (`/tasks`) lists the same rows across projects with the project name, plus an "Everyone" view |
| Kanban | Columns per phase (lead and proposal first, lost beside closed); cards show client, partner, title, account manager, days in phase |
| Templates | List + Markdown editor with field placeholders and preview |
| Feedback | Feedback grouped by tag with links to each draft/approved diff; lessons list (draft / active / retired) with eval result and activate button |
