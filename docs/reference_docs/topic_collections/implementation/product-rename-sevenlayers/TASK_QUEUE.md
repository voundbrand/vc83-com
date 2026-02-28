# Product Rename to sevenlayers Task Queue

**Last updated:** 2026-02-25  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers`  
**Source request:** Clean implementation plan for `docs/PRODUCT_RENAME_PLAN.md`, grounded in current codebase, with queue/session docs and a manual-change `.docx` runbook.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one row may be `IN_PROGRESS` globally unless explicitly unlocked by lane policy.
3. Promotion order is deterministic: `P0` before `P1`, then lowest ID.
4. Dependency tokens must be satisfied before status moves from `PENDING` to `READY`.
5. Every row must run listed `Verify` commands before moving to `DONE`.
6. Compatibility-critical identifiers are protected unless explicitly listed for migration.
7. Keep all queue artifacts synchronized: `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, `MASTER_PLAN.md`.
8. External dashboard/manual updates are tracked in `MANUAL_CHANGES_CHECKLIST.docx` and must be completed before production cutover.
9. For domain/auth/payment changes, verify both code defaults and third-party dashboard configuration.
10. Dependency token rules:
    - `ID`: dependency must be `DONE`.
    - `ID@READY`: dependency must be `READY` or `DONE`.
    - `ID@DONE_GATE`: row may start, but cannot move to `DONE` until dependency is `DONE`.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |
| `V-BUILD` | `npm run build` |
| `V-GREP` | `rg -n -i '(l4yercak3|vc83)' src convex public package.json .env*` |
| `V-MOBILE` | `npm run mobile:typecheck` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Reality lock + contract freeze | Plan/workstream docs | No code lanes start until lane `A` `P0` rows are `DONE` |
| `B` | Metadata + routing foundations | Next metadata, manifest, middleware | Touch shared metadata/routing only |
| `C` | Web UI/UX rename sweep | `src/app`, `src/components`, templates | Keep changes user-facing and compatibility-safe |
| `D` | Backend domain + email default sweep | `convex/*` domain/email defaults | Defaults first, then broad content/sample updates |
| `E` | Auth/callback/payment URL contracts | OAuth + Stripe/CLI URL surfaces | External callback registration checklist required |
| `F` | Translation + seed data updates | `convex/translations`, seed scripts | Keep reseed instructions deterministic |
| `G` | Validation + cutover + rollback | verification + rollout docs | No production switch until lane `G` `P0` rows are `DONE` |
| `H` | Optional mobile product rename | `apps/operator-mobile/*` | Blocked pending explicit product/release decision |

---

## Dependency-based status flow

1. Lane `A` closes contract and scope (`PRN-001`, `PRN-002`).
2. Lanes `B`, `D`, and `E` can begin after lane `A` `P0` completion.
3. Lane `C` depends on lane `B` metadata/routing updates.
4. Lane `F` depends on lane `D` defaults and lane `C` user-facing copy updates.
5. Lane `G` starts only after `B`/`C`/`D`/`E`/`F` `P0` rows are `DONE`.
6. Lane `H` remains `BLOCKED` until explicit go/no-go decision for mobile package/bundle/scheme changes.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `PRN-001` | `A` | 1 | `P0` | `DONE` | - | Produce real-codebase rename inventory and risk map (web/backend/mobile split) | `/Users/foundbrand_001/Development/vc83-com/docs/PRODUCT_RENAME_PLAN.md`; impact scan outputs | `V-DOCS` | Done 2026-02-25 during plan preparation (`1144` web/backend hits, `137` mobile hits). |
| `PRN-002` | `A` | 1 | `P0` | `BLOCKED` | `PRN-001` | Freeze rename contract (domains/emails/compatibility exclusions) and route strategy (`app.sevenlayers.io` first) | `/Users/foundbrand_001/Development/vc83-com/docs/PRODUCT_RENAME_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/MASTER_PLAN.md` | `V-DOCS` | Must explicitly preserve compatibility keys (localStorage/internal enums) unless separately migrated. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `PRN-010` | `B` | 2 | `P0` | `BLOCKED` | `PRN-002` | Update package/manifest/site metadata and middleware primary domains/redirect defaults | `/Users/foundbrand_001/Development/vc83-com/package.json`; `/Users/foundbrand_001/Development/vc83-com/public/site.webmanifest`; `/Users/foundbrand_001/Development/vc83-com/src/app/layout.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/middleware.ts` | `V-TYPE`; `V-BUILD` | Foundation row for route/domain identity. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `PRN-011` | `C` | 3 | `P0` | `BLOCKED` | `PRN-010` | Rename core shell branding (start menu, welcome/about/tutorial, desktop/store labels, window titles) | `/Users/foundbrand_001/Development/vc83-com/src/app/page.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/start-menu.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/*` | `V-TYPE`; `V-GREP` | Keep localStorage keys unchanged where intentionally compatibility-bound. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `PRN-012` | `C` | 3 | `P1` | `BLOCKED` | `PRN-011` | Complete builder/chat-widget/template user-facing references and external links | `/Users/foundbrand_001/Development/vc83-com/src/components/builder/*`; `/Users/foundbrand_001/Development/vc83-com/src/components/chat-widget/*`; `/Users/foundbrand_001/Development/vc83-com/src/app/project/[slug]/templates/*` | `V-TYPE`; `V-GREP` | Includes package import text in deployment snippets and "Powered by" copy. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `PRN-020` | `D` | 4 | `P0` | `BLOCKED` | `PRN-002` | Replace backend domain/email default anchors (system domain, support routing, fallback site URLs) | `/Users/foundbrand_001/Development/vc83-com/convex/seedSystemDomainConfig.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/emailTemplateRenderer.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/lib/supportRouting.ts` | `V-TYPE`; `V-GREP` | Critical for platform-generated email and links. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `PRN-021` | `D` | 4 | `P0` | `BLOCKED` | `PRN-020` | Sweep Convex email senders/reply-to/support/sales defaults across actions/services | `/Users/foundbrand_001/Development/vc83-com/convex/emailService.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/actions/*`; `/Users/foundbrand_001/Development/vc83-com/convex/ticketEmailService.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/invoiceEmailService.ts` | `V-TYPE`; `V-GREP` | Align with `mail.sevenlayers.io`, `support@sevenlayers.io`, `sales@sevenlayers.io`. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `PRN-022` | `D` | 4 | `P1` | `BLOCKED` | `PRN-021` | Replace seed/sample URLs and CDN references (`vc83.com`, `cdn.vc83.com`, `cdn.l4yercak3.com`) | `/Users/foundbrand_001/Development/vc83-com/convex/pdfTemplateRegistry.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/seedInvoiceEmailTemplate*.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/seedTemplates.ts` | `V-GREP`; `V-TYPE` | Low runtime risk, high consistency impact. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `PRN-030` | `E` | 5 | `P0` | `BLOCKED` | `PRN-010`, `PRN-020` | Update OAuth/CLI/callback URL construction and fallback app URLs | `/Users/foundbrand_001/Development/vc83-com/convex/oauth/*.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/cliAuth*.ts`; `/Users/foundbrand_001/Development/vc83-com/src/app/api/auth/*`; `/Users/foundbrand_001/Development/vc83-com/src/app/api/oauth/*` | `V-TYPE`; `V-GREP` | Must be mirrored in third-party OAuth app settings before cutover. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `PRN-031` | `E` | 5 | `P0` | `BLOCKED` | `PRN-030` | Update payment/checkout/webhook URL defaults and upgrade URLs | `/Users/foundbrand_001/Development/vc83-com/convex/stripe/*`; `/Users/foundbrand_001/Development/vc83-com/convex/paymentProviders/stripe.ts`; `/Users/foundbrand_001/Development/vc83-com/src/app/api/stripe/*` | `V-TYPE`; `V-GREP` | Coordinate with Stripe dashboard webhook + redirect URL updates. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `PRN-040` | `F` | 6 | `P0` | `BLOCKED` | `PRN-011`, `PRN-021`, `PRN-022` | Update translation seeds and onboarding/tutorial seed text; define deterministic reseed commands | `/Users/foundbrand_001/Development/vc83-com/convex/translations/*`; `/Users/foundbrand_001/Development/vc83-com/convex/tutorialOntology.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/seedOntologyData.ts` | `V-TYPE`; `V-GREP` | Record reseed order in manual runbook; avoid destructive data reset paths. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `PRN-050` | `G` | 7 | `P0` | `BLOCKED` | `PRN-010`, `PRN-011`, `PRN-020`, `PRN-030`, `PRN-040` | Run full verification, produce residual exception list, and confirm intentional legacy tokens only | verification outputs + queue docs | `V-GREP`; `V-TYPE`; `V-BUILD`; `V-DOCS` | Residual `l4yercak3`/`vc83` hits must be explicitly justified. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `PRN-051` | `G` | 7 | `P0` | `BLOCKED` | `PRN-050` | Execute staged production cutover checklist and rollback readiness validation | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/product-rename-sevenlayers/MANUAL_CHANGES_CHECKLIST.docx` | `V-DOCS` | Includes DNS, Vercel, Resend, OAuth, Stripe, smoke checks, and rollback toggles. Paused 2026-02-25 by one-of-one pivot lock (`LOC-003`): non-core stream is deferred. Unfreeze only via cutover queue override after `LOC-009` is `DONE`. |
| `PRN-090` | `H` | 8 | `P1` | `BLOCKED` | `PRN-002` | Mobile product rename (`scheme`, package IDs, bundle IDs, app display names) | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/*` | `V-MOBILE` | Blocked pending explicit release decision due app-store and deep-link migration impact. |

---

## Current kickoff

- Active task: none.
- Next promotable task: none (rows `PRN-002`..`PRN-051` are `BLOCKED` by `LOC-003`).
- Immediate objective: hold this stream until a cutover queue override is published after `LOC-009` reaches `DONE`.
