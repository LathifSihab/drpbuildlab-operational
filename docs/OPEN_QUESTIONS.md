# Open questions

Each has a suggested answer. Confirm or correct, then move it to "Answered" with who decided.

## Blocking

| # | Type | Question | Suggested answer | Blocks |
|---|---|---|---|---|
| 1 | business | The AI only reads emails and never replies to clients. But to read them, the email text is sent to the AI provider (SumoPod for now, see #28, which passes it on to the model's maker). Do our client agreements and NDAs allow client email content to be processed by a third-party AI service? | Check each active agreement; add an AI-processing clause to new contracts; use anonymized samples until confirmed | Phase 3 with real client emails |

## Non-blocking

| # | Type | Question | Suggested answer |
|---|---|---|---|
| 13 | technical (developer check, no owner decision needed) | Microsoft gives two versions of an email's text: the full text, or "only the new part" (`uniqueBody`, without the quoted earlier emails). For a forward, the client's brief *is* the quoted part. Does "only the new part" keep it or drop it? | Always read the full text for the first email of a conversation and "only the new part" for replies. Confirm with one test forward in Phase 2 |
| 25 | technical | Which client zone paths are for clients, partners, and webhooks (Access Bypass) and which are staff-only? | Read from the client zone code before go-live: `/admin*` staff; quote/payment links, partner pages, `/webhooks/*` bypass |
| 26 | business | Partners: keep signed links, or give them their own login? | Keep signed links for now; revisit when partners need to see history across many quotes |

## Answered

| # | Question | Answer | Decided by | Date |
|---|---|---|---|---|
| 2 | Microsoft 365 tenant admin | The owner (Lathif) | Owner | 2026-11-12 |
| 3 | UI UX Pro Max license | MIT, confirmed in the repo's LICENSE file; OK for commercial use | Owner | 2026-11-12 |
| 4 | Where project repos live | GitHub, currently a personal account; one organization later (see #12) | Owner | 2026-11-12 |
| 5 | Who sees client info and secret references | Admin and developers | Owner | 2026-11-12 |
| 6 | Raw email retention | 12 months after a project closes, then delete `source_messages`; keep the approved summary | Owner | 2026-11-12 |
| 7 | Database | Neon now; moving to Postgres on a VPS later, so database code stays portable | Owner | 2026-11-12 |
| 8 | Secrets manager | Infisical | Owner | 2026-11-12 |
| 9 | Real client emails in staging | No: anonymized samples only | Owner | 2026-11-12 |
| 10 | First document templates | NDA, user guide, project proposal | Owner | 2026-11-12 |
| 14 | What does approving a small job on an existing site (feature, integration, Shopify/Wix config, fix) produce? | A task brief on the client's existing project; only new builds, rebuilds, and demos get a project pack and repo | Owner | 2026-11-12 |
| 15 | Work that comes through a partner agency: who is the client? | Record both the partner and the end client | Owner | 2026-11-12 |
| 16 | DRP's internal notes on a forward vs the client's wishes | Internal notes win for the current request's scope, priority, and deadline; the client's wider wishes go to deferred scope | Owner | 2026-11-12 |
| 17 | Attachments and shared-file links | Store in R2 and list as citable sources; the AI does not read their contents in v1 | Owner | 2026-11-12 |
| 18 | Summary and generated docs language | English for everything; client-required site wording kept in the original with an English translation | Owner | 2026-11-12 |
| 19 | Tech stack when the client is on a third-party platform | Keep the platform unless the request is a rebuild or new build | Owner | 2026-11-12 |
| 20 | Commercial info to extract | Deadline and urgency, engagement type, account manager. Not prices or payment terms | Owner | 2026-11-12 |
| 21 | Pre-sale work on the kanban | Add `lead` and `proposal` phases before discovery, and `lost` beside closed | Owner | 2026-11-12 |
| 22 | Emails with secret information | Business team flags them with `[SECRET]` at the start of the subject; they skip the AI and are filed as named keys in the project's ".env" (Infisical) | Owner | 2026-11-12 |
| 27 | Domain for internal apps: move `drpbuildlab.com` DNS to Cloudflare, or a separate domain? | Separate domain (`drpbuildlab.dev`, confirm at purchase) on Cloudflare; `drpbuildlab.com` website and email untouched | Owner | 2026-11-14 |
| 11 | Which mailbox for staging tests? | The owner's own mailbox. Condition: the app reads only one folder (`DRP Intake`), which the owner fills by hand or by an Outlook rule; nothing else in the mailbox is read. Staging still gets anonymized or own test emails only (#9) | Owner | 2026-11-16 |
| 12 | GitHub organization for DRP? | No: project repos stay on the personal GitHub account | Owner | 2026-11-16 |
| 23 | Let the app delete `[SECRET]` emails once filed? | Yes: `Mail.ReadWrite`, used only to delete a `[SECRET]` email when it is marked done | Owner | 2026-11-16 |
| 24 | Gateway token for staff: URL or cookie/header? | Cookie/header from Cloudflare Access, checked by every app; no token in URLs for staff | Owner | 2026-11-16 |
| 28 | Which AI provider? | SumoPod first (OpenAI-compatible API at `ai.sumopod.com/v1`); the model is picked from its list in Phase 3. The pipeline's checks (Zod, citations, secret scan) stay the same | Owner | 2026-11-16 |
| 29 | How do the CMS and client zone (Netlify, `drpbuildlab.com`) join the one Microsoft login without buying `drpbuildlab.dev`? | Cloudflare Access as their OIDC login provider ("Access for SaaS"); 8-hour app session; every Log out ends the shared Access session; portal `drp-portal` on workers.dev; all `@drpbuildlab.com` staff open all apps; old CMS password and client zone admin link kept until the new login is proven on production (INTERNAL_GATEWAY.md) | Owner | 2026-11-21 |
