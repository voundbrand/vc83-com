# Hub-GW OAuth Task Queue

**Last updated:** 2026-03-24  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth`  
**Source request:** Turn the Hub-GW OAuth prompt into a repo-grounded plan whose final state is reusable org-level OIDC, not a Hub-GW-only implementation.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one row may be `IN_PROGRESS` globally unless lane gating explicitly allows concurrency.
3. Promote `PENDING` to `READY` only when all dependency tokens are satisfied.
4. Deterministic selection order is `P0` before `P1`, then lowest task ID.
5. Do not ship OAuth without also hardening Hub-GW seller write routes.
6. Treat auth identity and enriched business profile as separate contracts.
7. Prefer explicit CRM-org to sub-org mapping over fuzzy name matching.
8. Do not leave the implementation stranded as a Hub-GW-only special case; the end-state must be reusable for other org portals.
9. Sync `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, `MASTER_PLAN.md`, and `../PROMPT_HUB_GW_OAUTH.md` after each `DONE` row that changes plan authority.
10. Keep each row scoped to a 1-2 hour implementation slice with verification commands listed directly in the row.

---

## Dependency token semantics

1. `ID`: dependency row must be `DONE` before this row can move to `READY`.
2. `ID@READY`: dependency row must be `READY` or `DONE` before this row can move to `READY`.
3. `ID@DONE_GATE`: row can move to `READY` or `IN_PROGRESS`, but cannot move to `DONE` until the dependency row is `DONE`.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-HUB-GW-TYPE` | `npm run hub-gw:typecheck` |
| `V-TYPE` | `npm run typecheck` |
| `V-CONVEX-TYPE` | `npx tsc -p convex/tsconfig.json --noEmit` |
| `V-AUTH-ROUTES` | `rg -n "/api/v1/auth/sync-user|/api/v1/auth/validate-token" convex/http.ts convex/api/v1/auth.ts` |
| `V-HUB-GW-AUTH` | `rg -n "next-auth|SessionProvider|useSession|getServerSession|auth\\(" apps/hub-gw` |
| `V-SELLER-GATES` | `rg -n "401|403|getServerSession|auth\\(|redirect\\(" apps/hub-gw/app/api apps/hub-gw/app` |
| `V-OIDC-PLATFORM` | `rg -n "frontendOidc|oidcProvider|PKCE|claim mapping|issuer" convex docs/prompts apps/hub-gw` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Contract freeze and auth foundation | Workstream docs, `apps/hub-gw` package/config foundation | No backend auth changes before lane `A` `P0` rows are `DONE` |
| `B` | Backend identity sync and seller context | `convex/auth.ts`, related Convex auth/query files | Keep seller-context return shape additive and typed |
| `C` | Frontend OAuth/session integration | `apps/hub-gw/app`, `apps/hub-gw/lib`, navigation/session files | Do not touch seller write routes in this lane |
| `D` | Seller authorization hardening and ownership cleanup | `apps/hub-gw/app/api/*`, seller pages, data ownership assumptions | Route handlers must become fail-closed before row closeout |
| `E` | Reusable platform OIDC generalization | reusable provider config, callback broker, migration bridge | Do not hardcode Hub-GW assumptions into the final abstraction |
| `F` | Endpoint fate, smoke testing, and rollout docs | old Convex auth HTTP file, env docs, final verification | Do not declare stream complete without Hub-GW and reusable-org checklists |

---

## Dependency-based status flow

1. Start with lane `A` (`HGO-001`, `HGO-002`).
2. Start lane `B` only after lane `A` `P0` rows are `DONE`.
3. Start lane `C` only after `HGO-003` and `HGO-004` are `DONE`.
4. Start lane `D` only after `HGO-006` and `HGO-007` are `DONE`.
5. Start lane `E` only after `HGO-008` and `HGO-009` are `DONE`.
6. Start lane `F` only after `HGO-012` and `HGO-013` are `DONE`.
7. `HGO-014` may remain a deprecation/documentation row if the public auth endpoints are intentionally not used by Hub-GW.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `HGO-001` | `A` | 1 | `P0` | `DONE` | - | Rewrite the Hub-GW OAuth prompt and publish queue-first workstream artifacts grounded in actual repo state | `/Users/foundbrand_001/Development/vc83-com/docs/prompts/PROMPT_HUB_GW_OAUTH.md`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth/SESSION_PROMPTS.md`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth/MASTER_PLAN.md` | `V-DOCS` | Completed 2026-03-23 after repo audit. The prompt no longer claims backend readiness or one-shot feasibility, and the final target is reusable org-level OIDC. Verification passed: `npm run docs:guard`. |
| `HGO-002` | `A` | 1 | `P0` | `DONE` | `HGO-001` | Build the Hub-GW auth foundation scaffold: decide dependency placement, add client providers wrapper, update TS include coverage for auth type augmentation, and create `.env.local.example` with mock-mode contract | `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/package.json`; `/Users/foundbrand_001/Development/vc83-com/package.json`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/tsconfig.json`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/app/layout.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/app/providers.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/.env.local.example` | `V-HUB-GW-TYPE`; `V-DOCS` | Completed 2026-03-23. Auth.js dependency placement is now root-managed in `/Users/foundbrand_001/Development/vc83-com/package.json` (`next-auth@^4.24.13`), `app/providers.tsx` wraps the async layout through a client boundary, `types/**/*.d.ts` is included for NextAuth augmentation, and `.env.local.example` documents `HUB_GW_AUTH_MODE=auto|mock|oidc`. Verification passed: `npm run hub-gw:typecheck`; `npm run docs:guard`. |
| `HGO-003` | `B` | 2 | `P0` | `DONE` | `HGO-002` | Choose and wire the real backend sync entrypoint for Hub-GW: either server-side internal mutation via admin Convex client or routed public auth endpoint; remove the current dead-path ambiguity | `/Users/foundbrand_001/Development/vc83-com/convex/auth.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/auth.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/http.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/lib/server-convex.ts` | `V-CONVEX-TYPE`; `V-AUTH-ROUTES`; `V-TYPE` | Completed 2026-03-23. Hub-GW now has a typed server-side bridge in `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/lib/server-convex.ts` that calls `internal.auth.syncFrontendUser` through the existing admin Convex client, and the legacy HTTP auth file is explicitly marked as unwired in both `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/auth.ts` and `/Users/foundbrand_001/Development/vc83-com/convex/http.ts`. Verification passed: `npx tsc -p convex/tsconfig.json --noEmit`; `rg -n "/api/v1/auth/sync-user|/api/v1/auth/validate-token" convex/http.ts convex/api/v1/auth.ts`; `npm run typecheck`. |
| `HGO-004` | `B` | 2 | `P0` | `BLOCKED` | `HGO-003` | Make `syncFrontendUser` Hub-GW-aware: support custom provider IDs, use Hub-GW parent-org scoping, fix CRM org link traversal, and return `crmContactId`, `crmOrganizationId`, `subOrgId`, `isSeller` | `/Users/foundbrand_001/Development/vc83-com/convex/auth.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/frontendUserQueries.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/customerAuthInternal.ts` | `V-CONVEX-TYPE`; `V-TYPE` | Implementation landed on 2026-03-23: `syncFrontendUser` now returns an explicit auth payload, resolves CRM orgs through `works_at` with `belongs_to_organization` as a logged compatibility fallback, validates `crm_organization.customProperties.platformSubOrgId` under the passed parent org, and the Hub-GW bridge now returns `subOrgId` plus `isSeller`. Row closeout is blocked by pre-existing repo typecheck failures in `/Users/foundbrand_001/Development/vc83-com/convex/onboarding/universalOnboardingPolicy.ts:180` (`Argument of type '"one_of_one_landing_native_guest_audit"' is not assignable to parameter of type 'never'`). Additional signal: `npm run hub-gw:typecheck` passed. |
| `HGO-005` | `B` | 2 | `P1` | `PENDING` | `HGO-004` | Define deterministic seller/sub-org resolution: explicit CRM-org mapping field first, migration fallback second, and no seller authorization based purely on organization-name heuristics | `/Users/foundbrand_001/Development/vc83-com/convex/auth.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/subOrganizationsInternal.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth/MASTER_PLAN.md` | `V-CONVEX-TYPE`; `V-DOCS` | The primary explicit field contract now exists in HGO-004 as `crm_organization.customProperties.platformSubOrgId`. This row still owns any migration fallback beyond that contract plus the reusable documentation pass. |
| `HGO-006` | `C` | 3 | `P0` | `IN_PROGRESS` | `HGO-003`, `HGO-004` | Implement Hub-GW OAuth/session flow with Auth.js, configurable GW provider, sign-in page, callback sync, JWT/session typing, and mock fallback when env vars are absent | `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/app/api/auth/[...nextauth]/route.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/app/auth/signin/page.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/app/providers.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/lib/auth.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/lib/server-convex.ts` | `V-HUB-GW-TYPE`; `V-HUB-GW-AUTH` | 2026-03-24 implementation pass landed route handler, env-driven auth-mode resolution (`auto|mock|oidc`), custom GW OIDC provider, callback sync via `syncHubGwFrontendIdentity`, and `/auth/signin`. Awaiting live OIDC credential validation plus dependency-unblock alignment with `HGO-004` closeout policy. |
| `HGO-007` | `C` | 3 | `P0` | `PENDING` | `HGO-006` | Replace mock `useUser` semantics with session-backed identity and introduce a separate enrichment path for profile/business data used by navigation and profile UI | `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/lib/user-context.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/components/navigation.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/app/profile/page.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/lib/types.ts` | `V-HUB-GW-TYPE`; `V-HUB-GW-AUTH` | Avoid forcing legal/business profile fields into the session object. |
| `HGO-008` | `D` | 4 | `P0` | `PENDING` | `HGO-006`, `HGO-007` | Harden all Hub-GW seller mutations and protected pages with server-side session checks and seller-role gating; remove anonymous admin-write behavior | `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/app/api/benefits/route.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/app/api/leistungen/route.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/app/api/provisionen/route.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/app/meine-angebote/page.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/app/profile/page.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/app/my-requests/page.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/middleware.ts` | `V-HUB-GW-TYPE`; `V-SELLER-GATES` | Middleware is optional support only; route handlers are the real security boundary. |
| `HGO-009` | `D` | 4 | `P0` | `PENDING` | `HGO-008` | Remove `CURRENT_USER_ID` and mock ownership assumptions from Hub-GW data flow and align "Meine Angebote" to actual backend ownership or seller-org scope | `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/lib/data-context.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/lib/mock-data.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/lib/data-server.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/app/meine-angebote/page.tsx` | `V-HUB-GW-TYPE`; `V-TYPE` | This row closes the gap between mock "my offers" and real seller scoping. |
| `HGO-010` | `E` | 5 | `P0` | `PENDING` | `HGO-008`, `HGO-009` | Define the reusable org-level OIDC provider model: per-org config, encrypted secret storage, discovery or explicit endpoints, and claim mapping for normalized frontend identity | `/Users/foundbrand_001/Development/vc83-com/convex/frontendOidc.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/frontendOidcInternal.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth/MASTER_PLAN.md` | `V-CONVEX-TYPE`; `V-DOCS`; `V-OIDC-PLATFORM` | Do not reuse the existing platform OAuth application system for this purpose. |
| `HGO-011` | `E` | 5 | `P0` | `PENDING` | `HGO-010` | Implement the reusable OIDC start/callback/state flow with PKCE, nonce/state validation, normalized claims output, and a Hub-GW-compatible bridge | `/Users/foundbrand_001/Development/vc83-com/convex/frontendOidc.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/frontendOidcInternal.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/frontendOidc.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/http.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/lib/auth.ts` | `V-CONVEX-TYPE`; `V-TYPE`; `V-OIDC-PLATFORM` | Final abstraction must work for future org portals, not only GW. |
| `HGO-012` | `E` | 5 | `P0` | `PENDING` | `HGO-011` | Migrate Hub-GW from the stage-1 app-specific bridge to the reusable org-level OIDC layer or make the existing bridge a thin wrapper over it | `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/app/api/auth/[...nextauth]/route.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/lib/auth.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/frontendOidc.ts` | `V-HUB-GW-TYPE`; `V-TYPE`; `V-HUB-GW-AUTH`; `V-OIDC-PLATFORM` | End-state should leave Hub-GW as a consumer, not the definition, of the OIDC integration. |
| `HGO-013` | `E` | 5 | `P1` | `PENDING` | `HGO-010` | Publish the org-onboarding contract for reusable OIDC: required admin inputs, claim-mapping rules, verified-email policy, and failure modes | `/Users/foundbrand_001/Development/vc83-com/docs/prompts/PROMPT_HUB_GW_OAUTH.md`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth/INDEX.md` | `V-DOCS`; `V-OIDC-PLATFORM` | Must explicitly require stable subject and verified email if email remains the CRM linking key. |
| `HGO-014` | `F` | 6 | `P1` | `PENDING` | `HGO-012`, `HGO-013` | Decide the fate of `convex/api/v1/auth.ts`: wire it fully for real consumers or mark it legacy/deprecated and remove misleading docs references | `/Users/foundbrand_001/Development/vc83-com/convex/api/v1/auth.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/http.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/project-notes/OAUTH_ARCHITECTURE_CLARIFICATION.md`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/project-notes/FRONTEND_OAUTH_SETUP.md` | `V-CONVEX-TYPE`; `V-AUTH-ROUTES`; `V-DOCS` | Do not keep "backend ready" docs if the code path stays unused or incomplete. |
| `HGO-015` | `F` | 6 | `P0` | `PENDING` | `HGO-012`, `HGO-013` | Publish the rollout and smoke-test matrix for five states: mock mode, browser-only member, seller with sub-org, configured GW OAuth, and a second reusable-org OIDC integration path | `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/.env.local.example`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/prompts/PROMPT_HUB_GW_OAUTH.md` | `V-HUB-GW-TYPE`; `V-TYPE`; `V-DOCS`; `V-OIDC-PLATFORM` | Stream closeout requires both a no-credentials dev path and a reusable-org OIDC checklist. |

---

## Current kickoff

1. Active task count: `1` row in `IN_PROGRESS` (`HGO-006`).
2. Next deterministic promotable row: `HGO-007` once `HGO-006` is marked `DONE`.
3. Immediate objective: validate live OIDC credentials end-to-end for `HGO-006`, then close row status and continue with `HGO-007`.
