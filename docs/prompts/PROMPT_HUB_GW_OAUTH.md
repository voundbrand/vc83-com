# Stream 1: Hub-GW OAuth Reality Check + Implementation Brief

## Decision

Do not treat this as a one-shot implementation prompt.

The current repository state does not support a clean one-pass delivery yet. Use the queue-first workstream in:

- `apps/hub-gw/docs/workstreams/hub-gw-oauth/TASK_QUEUE.md`
- `apps/hub-gw/docs/workstreams/hub-gw-oauth/SESSION_PROMPTS.md`
- `apps/hub-gw/docs/workstreams/hub-gw-oauth/INDEX.md`
- `apps/hub-gw/docs/workstreams/hub-gw-oauth/MASTER_PLAN.md`

This prompt is the repo-grounded brief for that workstream.

Final target:

1. Hub-GW gets real member login and seller authorization.
2. The finished architecture becomes a reusable org-level OIDC integration available to all orgs, not a Hub-GW-only special case.

---

## Current Repo Reality

### Frontend (`apps/hub-gw`)

- Auth.js is now wired in `apps/hub-gw` with typed session auth context and sign-in flow, while mock mode remains supported for no-credential local development.
- `apps/hub-gw/lib/user-context.tsx` now separates session identity from optional profile enrichment (`/api/auth/enrichment`) instead of forcing business metadata into the session contract.
- `apps/hub-gw/components/navigation.tsx` reads real auth state from `useUser`; seller route access is middleware-gated.
- `apps/hub-gw/app/layout.tsx` is a server component and now routes through `app/providers.tsx`, which is the correct client boundary for Auth.js session wiring.
- Auth.js dependency placement is now root-managed in `/Users/foundbrand_001/Development/vc83-com/package.json` (`next-auth@^4.24.13`), while `apps/hub-gw/package.json` remains a thin app manifest.
- `apps/hub-gw/tsconfig.json` now includes `types/**/*.d.ts`, so `apps/hub-gw/types/next-auth.d.ts` can carry the Hub-GW session augmentation contract.
- `apps/hub-gw/.env.local.example` now exists and documents the `HUB_GW_AUTH_MODE=auto|mock|platform|oidc` fallback contract.

### Existing seller and mutation surface

- `apps/hub-gw/app/api/benefits/route.ts`
- `apps/hub-gw/app/api/leistungen/route.ts`
- `apps/hub-gw/app/api/provisionen/route.ts`

All three route handlers now require seller auth server-side via `requireSellerAuth`, and delete operations patch existing objects (`patchObjectInternal`) with org-scope checks. Adding login alone would not have been sufficient; route hardening is now part of the landed stream.

### Current data assumptions

- `apps/hub-gw/lib/data-context.tsx` now uses `session.auth.frontendUserId` in non-mock mode and routes non-mock create/delete through protected Hub-GW API routes.
- `apps/hub-gw/app/profile/page.tsx` now tolerates missing business enrichment data.
- OAuth still gives identity first; seller/business details remain a separate enrichment step keyed off CRM links and seller/sub-org context.

### Backend (`convex/`)

- `convex/api/v1/auth.ts` exists, but it is not production-ready for Hub-GW:
  - it only accepts `google` or `microsoft`,
  - it uses `getDefaultOrganization()` instead of `GW_ORG_ID`,
  - it is not registered in `convex/http.ts`,
  - it is not the active Hub-GW browser auth boundary,
  - its `validate-token` path validates a `frontend_user` object ID, not a Hub-GW browser session.
- `convex/auth.ts::syncFrontendUser` is now largely Hub-GW-ready:
  - provider IDs are no longer limited to Google/Microsoft,
  - parent-org scoping and seller-context return fields are implemented,
  - CRM traversal now resolves via `works_at` with compatibility fallback.
- Reusable org-level OIDC model is already implemented in `convex/frontendOidc.ts` and `convex/frontendOidcInternal.ts`:
  - per-org settings CRUD,
  - encrypted client secret storage,
  - issuer-or-explicit-endpoint validation,
  - claim field configuration (`subClaim`, `emailClaim`, `nameClaim`),
  - host/domain-to-org runtime binding resolution.
- Reusable OIDC start/callback flow is now implemented in `convex/frontendOidc.ts`, `convex/frontendOidcInternal.ts`, and `convex/api/v1/frontendOidc.ts`, and routed in `convex/http.ts` (`/api/v1/frontend-oidc/start`, `/api/v1/frontend-oidc/callback`) with PKCE, one-time state consume, nonce validation, token exchange, userinfo fetch, and normalized bridge output.
- Hub-GW now consumes that reusable bridge in Auth.js: OIDC sign-in starts through `/api/v1/frontend-oidc/start`, callback completion is delegated to `/api/v1/frontend-oidc/callback`, and frontend identity sync input comes from `bridge.frontendSyncInput` / `bridge.hubGwSyncInput`.
- Reusable lifecycle cleanup now exists for one-time frontend OIDC state rows (`cleanupExpiredFrontendOidcStateInternal` in `convex/frontendOidc.ts`) and is scheduled hourly in `convex/crons.ts`.
- `frontendSessions` exists in schema and customer-auth code, but the current Hub-GW flow does not use it. The older docs claiming "backend ready" overstate the current state.

### Existing docs that need skepticism

These files are still useful context, but they should not be treated as authoritative implementation status:

- `apps/hub-gw/docs/project-notes/OAUTH_ARCHITECTURE_CLARIFICATION.md`
- `apps/hub-gw/docs/project-notes/OAUTH_SYNC_FLOW.md`
- `apps/hub-gw/docs/project-notes/FRONTEND_OAUTH_SETUP.md`
- `apps/hub-gw/docs/project-notes/OAUTH_last_status.md`

They assume the backend auth endpoints are already wired and usable from the frontend. They are not.

---

## Recommended Architecture

### 1. Phase it: Hub-GW first, reusable OIDC second

Use a two-stage architecture:

1. Stage 1: make Hub-GW real with the thinnest safe path.
2. Stage 2: generalize that path into a reusable org-level OIDC integration layer for all frontend portals.

### 2. Browser auth stays in `hub-gw` for the first delivery step

Use Auth.js / NextAuth on the Next.js side for the Gründungswerft login redirect and callback flow.

### 3. Prefer server-to-server user sync from Hub-GW in stage 1

Because `hub-gw` already has a server-side admin Convex client, the simplest path is:

1. OAuth callback completes in `apps/hub-gw`
2. server-side auth callback calls a dedicated internal sync path in Convex
3. session stores the returned backend identity context

This stage-1 boundary is now wired through `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/lib/server-convex.ts::syncHubGwFrontendIdentity`, which calls `internal.auth.syncFrontendUser` through the existing admin Convex client.

Do not assume the existing public `convex/api/v1/auth.ts` endpoints are the best path. They can be wired later if another consumer truly needs them, but they should not drive the first Hub-GW implementation.

### 4. Separate identity from profile enrichment

The session should carry identity and authorization context only:

- `frontendUserId`
- `crmContactId`
- `crmOrganizationId`
- `subOrgId`
- `isSeller`

The current `UserProfile` business fields should move behind a separate enrichment query or remain mock-only fallback data until a real CRM-backed profile endpoint exists.

### 5. Seller access is enforced server-side

Primary enforcement belongs in:

- Next.js route handlers under `apps/hub-gw/app/api/*`
- page-level server redirects / guards for seller pages

Middleware can help with navigation flow, but it is not enough on its own.

### 6. Sub-org lookup must prefer explicit mapping

Preferred resolution order:

1. explicit CRM organization field such as `crm_organization.customProperties.platformSubOrgId`
2. deterministic linked record
3. temporary name/slug fallback only if documented as migration behavior

Do not build seller authorization on fuzzy organization-name matching alone.

### 7. Platform end-state: reusable org-level OIDC provider integration

Once Hub-GW is working, the generalized platform capability should provide:

1. per-organization OIDC provider configuration,
2. encrypted client-secret storage,
3. issuer discovery or explicit endpoint configuration,
4. claim mapping for `sub`, `email`, and display name,
5. reusable start/callback/state/PKCE handling,
6. normalized identity sync into `frontend_user`,
7. seller/sub-org resolution as a separate backend step after identity proof.

Do not reuse the existing platform OAuth application system for this. That code is for our platform acting as an OAuth provider to external apps, not for frontend members authenticating against an external IdP.

---

## Reusable Onboarding + Identity Policy Contract (`HGO-013`)

This is the org-reusable policy for frontend OIDC, independent of Hub-GW specifics.

1. Stable subject (`sub`) requirement:
- `subClaim` must resolve from ID token claims; callback fails with `subject_claim_missing` otherwise.
- If userinfo also includes the mapped `subClaim`, it must match the ID token value; callback fails with `subject_claim_mismatch` on mismatch.
- Canonical synced subject is the ID token-mapped value to avoid merged-claim drift.

2. Verified email requirement and policy:
- Default policy is strict: `requireVerifiedEmail=true`, `emailVerifiedClaim=email_verified`.
- When strict mode is enabled, callback fails with `email_claim_missing` if mapped email is absent.
- Callback fails with `email_not_verified` if mapped email verification claim is not `true`.
- Policy fields are reusable org settings (`requireVerifiedEmail`, `emailVerifiedClaim`) for future consumers that need different rules.

3. Deterministic claim-mapping failure handling:
- Required identity policy failures return deterministic callback codes, not best-effort sync.
- Existing deterministic callback errors remain contract-stable (`invalid_state`, `state_not_found`, `missing_code`, `missing_id_token`, etc.).
- Bridge sync input (`frontendSyncInput` / `hubGwSyncInput`) is emitted only after identity policy checks pass.

---

## Rollout Smoke Matrix (`HGO-015`)

| scenario | mode | seller/non-seller | org | result | evidence/blocker |
|---|---|---|---|---|---|
| Local mock contract compile | `mock` | non-seller | Hub-GW | `PASS` | `npm run hub-gw:typecheck`; env contract in `apps/hub-gw/.env.local.example` |
| Platform auth compile path | `platform` | non-seller | Hub-GW | `PASS` | `npm run hub-gw:typecheck`; `npm run typecheck` |
| Hub-GW org OIDC start live probe | `oidc` | seller+non-seller pre-auth | `kn7ec6jb5dpxyf3bt3y3g20x61816466` | `BLOCKED` | `curl` returned `No active frontend OIDC integration is configured for the resolved organization` |
| Callback deterministic state errors live probe | `oidc` | seller+non-seller pre-auth | reusable callback contract | `PASS` | `curl` callback with invalid state returned `{ code: "invalid_state" }`; fake org-scoped state returned `{ code: "state_not_found" }` |
| Auto mode fallback wiring compile | `auto` | non-seller | Hub-GW | `PASS` | `npm run hub-gw:typecheck` and mode-resolution code path in `apps/hub-gw/lib/auth.ts` |
| Seller route hardening retained | `auto|platform|oidc` | seller | Hub-GW | `PASS` | `rg -n "401|403|getServerSession|auth\\(|redirect\\(" apps/hub-gw/app/api apps/hub-gw/app` |
| Non-seller gating retained | `auto|platform|oidc` | non-seller | Hub-GW | `PASS` | same route/middleware guard evidence as above |
| Second org host-based OIDC start probe | `oidc|auto` | seller+non-seller pre-auth | `segelschule-altwarp.de` | `BLOCKED` | `curl` returned `Unable to resolve organization for frontend OIDC start flow` |

---

## External Prerequisites

Need from Gründungswerft IT:

- OIDC discovery URL or explicit auth/token/userinfo endpoints
- client ID / client secret
- example user payload
- confirmation of the stable provider user ID field

Need from platform/product side:

- source of truth for CRM-organization-to-sub-org mapping
- confirmation that the final product requirement is reusable OIDC for all orgs, not a permanent Hub-GW-only implementation

---

## Realistic Delivery Sequence

### Phase 1: Foundation and contract freeze

- Keep Auth.js root-managed at the repo root and leave `apps/hub-gw` on the shared install and lockfile.
- Add a client providers wrapper and update TypeScript include paths.
- Create `apps/hub-gw/.env.local.example`.
- Freeze the session shape and mock-mode fallback contract.

### Phase 2: Backend identity sync

- Stop relying on `getDefaultOrganization()`.
- Generalize provider handling for `gruendungswerft`.
- Fix CRM organization link resolution (`works_at` vs `belongs_to_organization`).
- Return seller context from the sync path.

### Phase 3: Frontend auth integration

- Add Auth.js route handler and sign-in page.
- Sync backend identity in auth callbacks.
- Store only auth context in JWT/session.
- Keep mock mode when OAuth env vars are missing.

### Phase 4: Authorization hardening

- Require session auth on all seller write routes.
- Gate seller pages on `isSeller`.
- Remove anonymous admin-write behavior from Hub-GW API routes.

### Phase 5: Generalize to reusable org-level OIDC

- Use the already-landed reusable org-level OIDC provider config model.
- Keep secure secret storage and discovery-or-explicit-endpoint validation as baseline invariants.
- Keep claim mapping and normalized external-identity handling in the reusable contract.
- Build reusable start/callback/state handling that any org-specific frontend can adopt.
- Keep seller/sub-org resolution downstream from identity proof.

### Phase 6: Migration, cleanup, and rollout

- Hub-GW migration from stage-1 direct OIDC ownership to the reusable Convex bridge is complete (`HGO-012`); keep Hub-GW as a consumer-only layer.
- Replace `CURRENT_USER_ID` filtering with real backend ownership/seller scope.
- Split profile enrichment from session identity.
- Decide whether the old public auth endpoint file should be wired or deprecated.
- Run mock-mode, Hub-GW credentialed-mode, and reusable-org OIDC smoke checks.

---

## Acceptance Criteria

- No Hub-GW write route can mutate data without a valid session.
- Mock mode still works when GW OAuth credentials are absent.
- Auth session stores identity and seller context, not fake business profile fields.
- Seller navigation and seller pages use real authorization state.
- Backend sync uses Hub-GW parent-org scoping and correct CRM org links.
- Sub-org lookup is deterministic and documented.
- The completed architecture exposes a reusable org-level OIDC integration path for future portals.
- The workstream docs in `apps/hub-gw/docs/workstreams/hub-gw-oauth/*` remain the source of truth for execution order.

---

## Source Files For Implementation

Primary frontend files:

- `apps/hub-gw/lib/user-context.tsx`
- `apps/hub-gw/components/navigation.tsx`
- `apps/hub-gw/app/layout.tsx`
- `apps/hub-gw/app/profile/page.tsx`
- `apps/hub-gw/app/meine-angebote/page.tsx`
- `apps/hub-gw/app/my-requests/page.tsx`
- `apps/hub-gw/app/api/benefits/route.ts`
- `apps/hub-gw/app/api/leistungen/route.ts`
- `apps/hub-gw/app/api/provisionen/route.ts`
- `apps/hub-gw/lib/data-context.tsx`
- `apps/hub-gw/lib/server-convex.ts`

Primary backend files:

- `convex/auth.ts`
- `convex/api/v1/auth.ts`
- `convex/http.ts`
- `convex/api/v1/customerAuth.ts`
- `convex/api/v1/customerAuthInternal.ts`
- `convex/frontendUserQueries.ts`
- `convex/api/v1/subOrganizationsInternal.ts`

Likely reusable platform OIDC files:

- `convex/frontendOidc.ts`
- `convex/frontendOidcInternal.ts`
- `convex/api/v1/frontendOidc.ts`
- `convex/http.ts`

---

## Execution Note

If you resume this stream later, start from `apps/hub-gw/docs/workstreams/hub-gw-oauth/TASK_QUEUE.md`, not from older `apps/hub-gw/docs/project-notes/*` status claims.
