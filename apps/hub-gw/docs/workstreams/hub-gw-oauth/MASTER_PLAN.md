# Hub-GW OAuth Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth`  
**Last updated:** 2026-03-28

---

## Objective

Deliver real Hub-GW member authentication and seller authorization in a way that matches the current repo:

1. browser login happens in `apps/hub-gw`,
2. backend sync returns typed identity and seller context,
3. seller-only mutations become fail-closed,
4. mock mode still works for local development without GW credentials,
5. the completed architecture becomes a reusable org-level OIDC integration for future frontend portals.

---

## Why this stream exists

The previous OAuth prompt was not reality-based.

Initial repo state (now mostly remediated by `HGO-006` through `HGO-009`):

1. Hub-GW auth was mocked and started signed in.
2. Seller write routes mutated data with the deploy key and no auth checks.
3. The Convex auth HTTP file is incomplete for Hub-GW and not registered in `convex/http.ts`.
4. UI types expected a rich business profile that OAuth does not provide.
5. The desired product end-state is broader than Hub-GW alone.

Because of those facts, "just install NextAuth and wire a provider" would leave the app partially authenticated, still insecure, and stranded as a one-off.

---

## Working architecture

### Preferred path

1. Stage 1: use Auth.js / NextAuth in `apps/hub-gw` for the browser redirect/callback/session flow.
2. Stage 1: use a server-side sync call from Hub-GW into Convex as the primary backend identity bridge.
3. Stage 2: generalize that bridge into a reusable org-level OIDC provider layer with config, claim mapping, secret storage, and callback/state handling.
4. Store only identity and authorization context in the Auth.js session or JWT.
5. Load seller/business profile data separately from CRM-linked backend records.
6. Require seller authorization in Next.js route handlers before any deploy-key-backed mutation.

### Why this path

1. It matches the current `hub-gw` pattern of server-side Convex access via `lib/server-convex.ts`.
2. It avoids pretending the unused public auth HTTP file is already the production boundary.
3. It closes the real security gap in `apps/hub-gw/app/api/*`, not just the login gap.
4. It lets Hub-GW prove the path without locking the final abstraction to Hub-GW.

---

## Key repo realities that shape implementation

### Frontend

1. Auth.js dependency placement is now frozen at the repo root so `apps/hub-gw` can keep using the shared install and lockfile.
2. `apps/hub-gw/app/layout.tsx` now routes through `app/providers.tsx`, which is the client boundary for future Auth.js session wiring.
3. `apps/hub-gw/tsconfig.json` now includes `types/**/*.d.ts`, and `apps/hub-gw/types/next-auth.d.ts` defines the stage-1 session contract.
4. `apps/hub-gw/.env.local.example` now documents the `HUB_GW_AUTH_MODE=auto|mock|platform|oidc` contract that preserves mock mode when OAuth variables are absent.
5. `apps/hub-gw/lib/user-context.tsx` and `apps/hub-gw/lib/data-context.tsx` now use session identity in non-mock mode, split enrichment from session identity, and route non-mock create/delete through protected Hub-GW APIs.

### Backend

1. `convex/api/v1/auth.ts` only allows `google` or `microsoft`, uses `getDefaultOrganization()`, and is not registered in `convex/http.ts`.
2. The reusable per-org OIDC model now exists in `convex/frontendOidc.ts` and `convex/frontendOidcInternal.ts` (settings CRUD, encrypted secret storage, host-to-org resolution, runtime binding).
3. Reusable OIDC start/callback/state handling now exists in `convex/frontendOidc.ts`, `convex/frontendOidcInternal.ts`, `convex/api/v1/frontendOidc.ts`, and `convex/http.ts` with PKCE + nonce/state validation, one-time expiry-aware state consume, claim mapping, and normalized bridge output.
4. Hub-GW OIDC now consumes the reusable Convex bridge contracts: start redirect goes through `/api/v1/frontend-oidc/start`, callback completion goes through `/api/v1/frontend-oidc/callback`, and sync input is sourced from `bridge.frontendSyncInput` / `bridge.hubGwSyncInput`.
5. The Hub-GW sync boundary remains `apps/hub-gw/lib/server-convex.ts::syncHubGwFrontendIdentity`, which calls `internal.auth.syncFrontendUser` through the existing admin Convex client.
6. `convex/frontendOidc.ts` now includes lifecycle cleanup for one-time state rows (`cleanupExpiredFrontendOidcStateInternal`) and `convex/crons.ts` schedules hourly cleanup.
7. `convex/auth.ts::syncFrontendUser` implementation now returns `crmContactId`, `crmOrganizationId`, `subOrgId`, and `isSeller`; verification for `HGO-004` is complete.
8. CRM traversal resolves via `works_at` with a logged `belongs_to_organization` compatibility fallback, and seller/sub-org mapping is deterministic: primary `crm_organization.customProperties.platformSubOrgId`, followed by explicit legacy ID/slug fallback keys constrained to parent-org scope.
9. Reusable frontend OIDC callback now attempts token client auth with deterministic fallback (`client_secret_post` then `client_secret_basic` on client-auth failure), callback missing-state errors preserve provider error context, and admin preflight (`runFrontendOidcIntegrationPreflight`) validates openid scope presence, PKCE S256 wiring, and authorize redirect state/scope signals.
9. `frontendSessions` exists, but Hub-GW is not currently built around it.

---

## Non-negotiable invariants

1. No anonymous Hub-GW browser request may trigger a deploy-key-backed mutation.
2. Auth identity and business profile enrichment remain separate contracts.
3. Seller access must be based on deterministic backend context (`subOrgId`, `isSeller`), not just UI visibility.
4. Mock mode remains available when GW OAuth env vars are not configured.
5. CRM-organization-to-sub-org mapping should prefer an explicit stored mapping field.
6. The final OIDC abstraction must be reusable by any org-operated frontend portal.
7. Do not reuse the existing platform OAuth application system for frontend member login.

---

## Reusable OIDC Policy Contract (`HGO-013`)

This policy applies to reusable frontend OIDC flows, not Hub-GW-only behavior.

1. Stable subject requirement:
1. `subClaim` must resolve in ID token claims; callback fails with `subject_claim_missing` when absent.
2. If userinfo also contains mapped `subClaim`, it must match ID token value; callback fails with `subject_claim_mismatch` on divergence.
3. The canonical synced subject is always the ID token mapped subject (stable source), not a merged override.

2. Verified-email policy:
1. Defaults are `requireVerifiedEmail=true` and `emailVerifiedClaim=email_verified`.
2. When `requireVerifiedEmail=true`, mapped `emailClaim` is required (`email_claim_missing`) and mapped `emailVerifiedClaim` must be `true` (`email_not_verified`).
3. Policy is org-configurable through frontend OIDC settings (`requireVerifiedEmail`, `emailVerifiedClaim`) for future non-email-linking consumers.

3. Deterministic claim-mapping failure handling:
1. Callback returns deterministic contract errors, not partial/implicit fallbacks, for required identity claims.
2. Existing state/token failures remain deterministic (`invalid_state`, `state_not_found`, `missing_code`, `missing_id_token`, etc.).
3. Success payload remains additive and reusable (`bridge.frontendSyncInput`, `bridge.hubGwSyncInput`) only when policy checks pass.

---

## Cleanup Scalability Contract (Post-`HGO-012`)

`cleanupExpiredFrontendOidcStateInternal` now scales safely for growth:

1. Uses paginated batches (`batchSize`, `maxBatches`, `cursor`) instead of a single `take(limit)` pass.
2. Keeps hourly cron bounded (`limit:1000`, `batchSize:250`, `maxBatches:8`).
3. Emits telemetry for operations and observability:
1. totals: `scanned`, `markedExpired`, `deleted`, `errorCount`
2. batch progress: `batchProgress[]` with per-batch counts and remaining limit
3. continuation: `hasMore`, `nextCursor`, `reachedScanLimit`
4. error details: per-object operation errors with deterministic message capture.

---

## Rollout Smoke Matrix (`HGO-015`)

| Scenario | Mode | Seller / Non-seller | Org | Result | Evidence / blocker |
|---|---|---|---|---|---|
| Local dev no credentials path compiles | `mock` | non-seller | Hub-GW | `PASS` | `npm run hub-gw:typecheck`; `.env.local.example` keeps `HUB_GW_AUTH_MODE=auto|mock|platform|oidc` and mock fallback contract. |
| Platform auth path compiles | `platform` | non-seller | Hub-GW | `PASS` | `npm run hub-gw:typecheck`; `npm run typecheck`; `apps/hub-gw/lib/auth.ts` includes `platform` mode branch with typed callbacks. |
| OIDC start by explicit Hub-GW org | `oidc` | seller + non-seller path pre-auth | Hub-GW org `kn7ec6jb5dpxyf3bt3y3g20x61816466` | `BLOCKED` | Live `curl` to `/api/v1/frontend-oidc/start` returned 400: `No active frontend OIDC integration is configured for the resolved organization`. |
| OIDC callback deterministic invalid state | `oidc` | seller + non-seller path pre-auth | reusable callback contract | `PASS` | Live `curl` to `/api/v1/frontend-oidc/callback` with `state=badstate` returned `{ code: "invalid_state" }`; with org-scoped fake state returned `{ code: "state_not_found" }`. |
| Auto mode compile and fallback wiring | `auto` | non-seller | Hub-GW | `PASS` | `npm run hub-gw:typecheck`; mode resolver in `apps/hub-gw/lib/auth.ts` keeps `auto -> oidc or platform` behavior without removing mock fallback contract. |
| Seller gate enforcement in app routes | `auto|platform|oidc` | seller | Hub-GW | `PASS` | Prior hardening still present; verified via seller gate grep and typecheck (`rg -n "401|403|getServerSession|auth\\(|redirect\\(" apps/hub-gw/app/api apps/hub-gw/app`). |
| Non-seller blocked from seller-only areas | `auto|platform|oidc` | non-seller | Hub-GW | `PASS` | Middleware + route guard contracts still active in `apps/hub-gw/middleware.ts` and `apps/hub-gw/lib/route-auth.ts`; verification command above unchanged. |
| Second org OIDC integration path by host | `oidc|auto` | seller + non-seller path pre-auth | Segelschule (`segelschule-altwarp.de`) | `BLOCKED` | Live `curl` to `/api/v1/frontend-oidc/start?requestHost=segelschule-altwarp.de` returned 400: `Unable to resolve organization for frontend OIDC start flow`. |

---

## Phase map

| Phase | Rows | Outcome |
|---|---|---|
| `1` | `HGO-001`, `HGO-002` | Plan authority fixed and Hub-GW auth foundation scaffolded |
| `2` | `HGO-003`, `HGO-004`, `HGO-005` | Backend identity sync and seller-context contract made real |
| `3` | `HGO-006`, `HGO-007` | Browser OAuth/session flow integrated into Hub-GW |
| `4` | `HGO-008`, `HGO-009` | Seller route/page authorization and ownership cleanup complete |
| `5` | `HGO-010`, `HGO-011`, `HGO-012`, `HGO-013` | Reusable org-level OIDC provider model and Hub-GW migration bridge complete |
| `6` | `HGO-014`, `HGO-015` | Public endpoint fate resolved and rollout or smoke docs published |

---

## Acceptance criteria mapped to queue rows

| Acceptance criterion | Queue rows | Verification profiles |
|---|---|---|
| Workstream docs reflect actual repo state | `HGO-001` | `V-DOCS` |
| Hub-GW auth foundation is scaffolded safely | `HGO-002` | `V-HUB-GW-TYPE`; `V-DOCS` |
| Real backend sync path is chosen and wired | `HGO-003` | `V-CONVEX-TYPE`; `V-AUTH-ROUTES`; `V-TYPE` |
| Sync returns seller context and uses correct CRM traversal | `HGO-004`, `HGO-005` | `V-CONVEX-TYPE`; `V-TYPE`; `V-DOCS` |
| Auth.js login/session flow works with mock fallback | `HGO-006` | `V-HUB-GW-TYPE`; `V-HUB-GW-AUTH` |
| Mock user context is replaced by session identity plus enrichment | `HGO-007` | `V-HUB-GW-TYPE`; `V-HUB-GW-AUTH` |
| Seller routes and pages fail closed without auth | `HGO-008` | `V-HUB-GW-TYPE`; `V-SELLER-GATES` |
| Ownership views no longer depend on `CURRENT_USER_ID` | `HGO-009` | `V-HUB-GW-TYPE`; `V-TYPE` |
| Reusable org-level OIDC model exists and is not Hub-GW-specific | `HGO-010`, `HGO-011`, `HGO-012`, `HGO-013` | `V-CONVEX-TYPE`; `V-TYPE`; `V-DOCS`; `V-OIDC-PLATFORM` |
| Old public auth docs/code are either wired or explicitly deprecated | `HGO-014` | `V-CONVEX-TYPE`; `V-AUTH-ROUTES`; `V-DOCS` |
| Rollout plan covers mock mode, Hub-GW, and reusable-org OIDC modes | `HGO-015` | `V-HUB-GW-TYPE`; `V-TYPE`; `V-DOCS`; `V-OIDC-PLATFORM` |

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Seller mutation routes regress to deploy-key-open behavior | high | Keep `requireSellerAuth` and route-level checks as non-negotiable in code review |
| Session shape is overloaded with business data | medium | Keep identity vs enrichment split from `HGO-007` and reject session-bloat changes |
| CRM org traversal uses the wrong link type and seller lookup silently fails | high | Correct traversal in `HGO-004` and prefer explicit mapping in `HGO-005` |
| Auth.js types do not load due to current TS include config | medium | Resolve include coverage in `HGO-002` before auth implementation |
| Dead public auth endpoints keep misleading docs alive | medium | Resolve endpoint fate explicitly in `HGO-014` |
| Missing GW credentials blocks local development | medium | Keep mock mode as a first-class path and document it in `HGO-015` |
| Hub-GW-specific shortcuts leak into the final OIDC abstraction | high | Use `HGO-010` through `HGO-013` to isolate reusable provider config and callback/state handling |
| Reusable OIDC ships without strong identity normalization rules | high | Require stable subject, claim mapping, and verified-email policy in `HGO-010` and `HGO-013` |

---

## Exit criteria

1. All `P0` rows are `DONE`.
2. Hub-GW seller writes are server-side protected.
3. Session identity and seller context are real and typed.
4. Mock mode remains usable without GW credentials.
5. Reusable org-level OIDC exists as a platform capability for future frontend portals.
6. `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, `MASTER_PLAN.md`, and `../PROMPT_HUB_GW_OAUTH.md` are synchronized and `npm run docs:guard` passes.
