# Project: DRP Operational

## Problem

Project briefs reach us as unstructured Outlook emails and forwarded threads, mostly in Dutch, while our developers work in English. Developers spend a lot of time reading them and going back and forth with the business team and the client to clarify scope. Context ends up scattered across inboxes, chats, and personal AI sessions, and project facts (where it's deployed, which platform, which domain registrar, which database) live in people's heads.

Not every email is a new project. Incoming work ranges from new builds and rebuilds, through free demos to win a deal, to small jobs on a client's existing site: a new feature, a tracking pixel or API integration, configuring a store on Shopify or a site on Wix/WordPress, a bug fix, or maintenance. Some work arrives through partner agencies that resell websites to their own clients.

## Users

- **Business team**: forwards client emails to the intake mailbox; answers business questions; tracks client phase.
- **Developers**: review and approve AI summaries; answer technical questions; start projects from the generated pack.
- **Admin** (owner, also the Microsoft 365 tenant admin): manages users, roles, templates, and secret references.

## What it does

1. **Intake**: reads emails forwarded to the intake mailbox (`projects@...`). Each conversation becomes a **request**. Code splits forwarded threads into messages, marks which are DRP's internal notes, removes any secrets pasted into emails, and lists attachments and shared-file links.
2. **Summary**: AI drafts an English summary of the request, translating Dutch: request type, end client and partner agency, existing site and platform, DRP's internal direction, objective, scope now and deferred scope, requirements, brand guidelines and the client's required wording, tech stack (the client's platform for small jobs; SvelteKit + TypeScript + Postgres for builds, deviations only with a reason), access needed, deadline, urgency, engagement type (free demo, quote, signed, maintenance contract), account manager, assumptions, and open questions. Every point cites its source message or attachment. Prices are not extracted.
3. **Review**: a developer edits and approves the summary and confirms which project it belongs to. The AI draft and the approved version are both kept.
4. **Open questions**: each is tagged `technical` (developer answers) or `business` (goes back to the business team / client). All answers are recorded in the platform.
5. **Output on approval**: new builds, rebuilds, and demos get a project pack (`CLAUDE.md`, `docs/PROJECT.md`, `docs/DESIGN.md`, `docs/PLAN.md`, `docs/OPEN_QUESTIONS.md`) and a repo from our SvelteKit template. Small jobs on an existing site get a task brief on that client's project, with no new repo.
6. **Registry**: every project with end client, partner, account manager, platform, deployment URLs, tech stack, tools, domain registrar, secret references, and its requests.
7. **Kanban**: client phase per project (lead, proposal, discovery, design, build, UAT, deployed, maintenance, closed, lost).
8. **Project secrets**: a ".env" per project. Emails the business team flags with `[SECRET]` in the subject skip the AI and land in a Secrets inbox, where a developer names each value (`KEY=value`) and files it under the project and environment. Values are kept in Infisical; developers download a project's `.env` or pull it with the Infisical CLI.
9. **Documents**: templates (NDA, user guide, project proposal first) filled from project data and exported to Word/PDF.

## Out of scope (v1)

- Sending emails or messages to clients from the platform.
- WhatsApp (planned later via the official WhatsApp Business Platform; see ARCHITECTURE.md decisions).
- A rich document editor. Templates are Markdown; exports are generated.
- AI-drafted legal terms. NDAs use a lawyer-approved template; AI fills names, dates, and project fields only.
- Client-facing access. Internal team only.
- Reading attachment contents with AI. Attachments are stored and listed; developers open them.
- Prices, quotes, and invoicing. Quoting and Peppol invoicing stay in the existing tools.
- Changing third-party platforms (Shopify, Wix, ...) from the platform. Developers do that work by hand from the task brief.

## Success metrics

- **Time to approved summary**: from email received to developer approval. Baseline it in Phase 0 from past projects.
- **Approval edit rate**: share of summaries approved with only small edits (measured by diffing AI draft vs approved).
- **Clarification rounds**: number of back-and-forth rounds with the client before build starts, compared with before.

### Baseline (Phase 0, before DRP Operational)

Estimated from the email dates and the first commit in each project's repo. From Phase 3 on, the platform measures this itself.

| Request | Type | Email -> work started | Notes |
|---|---|---|---|
| TÈRRO Vastgoed | new build (via partner) | 6 days (brief 17 Sep, go-ahead 21 Sep, first code 23 Sep 2026) | Brief assets (logos, copy, photos) never arrived in the thread |
| Start to Business | integration | same day (1 Oct 2026) | |
| The Human Link | demo (via partner) | 1 day (6 -> 7 Oct 2026) | |
| Art platform | demo | 3 days, 1 working day (internal brief 9 Oct, first code 12 Oct 2026) | Two reminders needed to get the client's material |
| Hermosa Antwerp | bug fix (Shopify) | 3 days (signed 9 Aug, access working 12 Aug 2026) | About 10 emails just to get the right Shopify access; the main bug was still open 18 days after signing |

What the baseline shows: developers already start fast once a brief is clear. The time goes into missing material, access, and back-and-forth, which is what the AI's blocking open questions should catch on day one. The metric that matters most is **clarification rounds**.
