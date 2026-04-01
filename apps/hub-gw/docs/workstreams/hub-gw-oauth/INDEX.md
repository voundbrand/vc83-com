# Hub-GW OAuth Workstream Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth`  
**Last updated:** 2026-03-28  
**Source request:** Read through `PROMPT_HUB_GW_OAUTH.md`, check whether it matches the repo, and convert it into a realistic implementation plan whose final outcome is reusable org-level OIDC, not a Hub-GW one-off.

---

## Purpose

This workstream replaces an optimistic OAuth prompt with a repo-grounded execution plan for `apps/hub-gw` that ends in a reusable org-level OIDC integration.

The key correction is that Hub-GW auth was not just "add NextAuth":

1. the frontend started mock-auth and mock-ownership based,
2. the existing Convex auth HTTP file is incomplete and not routed,
3. seller write routes started deploy-key-open without browser auth,
4. UI types originally conflated login identity with enriched business profile data,
5. the final product goal is broader than Hub-GW and should become reusable for future org portals.

---

## Core files

1. Prompt / brief:
   `/Users/foundbrand_001/Development/vc83-com/docs/prompts/PROMPT_HUB_GW_OAUTH.md`
2. Queue:
   `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth/TASK_QUEUE.md`
3. Session prompts:
   `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth/SESSION_PROMPTS.md`
4. Master plan:
   `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth/MASTER_PLAN.md`
5. Index (this file):
   `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth/INDEX.md`

---

## Status snapshot

1. The old OAuth prompt has been rewritten to match the actual repo.
2. Queue rows `HGO-001` through `HGO-015` are defined.
3. `HGO-001` is `DONE`.
4. `HGO-002` is `DONE`.
5. `HGO-003` is `DONE`.
6. `HGO-004` is `DONE`; backend sync payload and CRM traversal contracts are verification-complete.
7. `HGO-005` is `DONE`; seller/sub-org mapping now uses deterministic ordered fallback keys (`platformSubOrgId` primary, explicit legacy ID/slug keys second) with strict parent-org scope checks and no name heuristics.
8. The workstream is intentionally choosing a phased implementation instead of a one-shot.
9. Hub-GW is the proving ground, not the permanent special-case architecture.
10. Workstream artifacts are now consolidated under `apps/hub-gw/docs/workstreams/hub-gw-oauth`.
11. `HGO-006` through `HGO-013` are now `DONE`; reusable onboarding and identity-policy contract is codified in docs and Convex guardrails.
12. `HGO-015` is now `DONE`; rollout smoke matrix is published with deterministic `PASS/FAIL/BLOCKED` outcomes and live endpoint evidence.
13. Next deterministic row is `HGO-014` (`PENDING`) for legacy endpoint fate and docs alignment.
14. Frontend OIDC state cleanup now uses bounded paginated batches with telemetry to keep hourly cron runs safe under growth.
15. Frontend OIDC now includes deterministic preflight and token-client-auth fallback hardening for live provider diagnostics.

---

## Core repo facts captured by this plan

1. `apps/hub-gw/lib/user-context.tsx` now derives identity from session and uses a separate enrichment endpoint for optional business/profile data.
2. `apps/hub-gw/app/api/*` seller mutation routes now enforce seller auth and org scope server-side.
3. `convex/api/v1/auth.ts` still exists but is not routed in `convex/http.ts` and remains out-of-band for Hub-GW.
4. `convex/auth.ts` seller-context work from `HGO-004` is implemented but row closeout remains blocked by cross-repo typecheck policy coupling.
5. `apps/hub-gw/lib/data-context.tsx` now uses session owner context in non-mock mode and routes non-mock create/delete through protected Hub-GW APIs.

---

## Lane board

- [x] Lane `A` planning kickoff: `HGO-001`
- [x] Lane `A` auth foundation: `HGO-002`
- [x] Lane `B` backend sync and seller context: `HGO-003`, `HGO-004`, `HGO-005` done
- [x] Lane `C` frontend OAuth/session integration: `HGO-006`, `HGO-007` done
- [x] Lane `D` seller hardening and ownership cleanup: `HGO-008`, `HGO-009` done
- [x] Lane `E` reusable org-level OIDC generalization: `HGO-010` through `HGO-013` done
- [~] Lane `F` endpoint fate, rollout docs, and smoke matrix: `HGO-015` done, `HGO-014` pending

---

## Scope boundary

Owned in this workstream:

1. Hub-GW browser auth integration.
2. Backend identity sync and seller-context resolution needed by Hub-GW.
3. Seller route authorization and protected-page hardening.
4. Reusable org-level OIDC provider architecture for future frontend portals.
5. Queue-first documentation for safe execution.

Not owned in this workstream:

1. Seller onboarding / Stripe Connect implementation itself.
2. Shared CMS extraction stream.
3. General platform OAuth work where our platform acts as the OAuth provider for external apps.

---

## Operating commands

1. Docs guard: `npm run docs:guard`
2. Hub-GW typecheck: `npm run hub-gw:typecheck`
3. Repo typecheck: `npm run typecheck`
4. Convex typecheck: `npx tsc -p convex/tsconfig.json --noEmit`
