# Hub-GW OAuth Workstream Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth`  
**Last updated:** 2026-03-24  
**Source request:** Read through `PROMPT_HUB_GW_OAUTH.md`, check whether it matches the repo, and convert it into a realistic implementation plan whose final outcome is reusable org-level OIDC, not a Hub-GW one-off.

---

## Purpose

This workstream replaces an optimistic OAuth prompt with a repo-grounded execution plan for `apps/hub-gw` that ends in a reusable org-level OIDC integration.

The key correction is that Hub-GW auth is not just "add NextAuth":

1. the frontend is still mock-auth and mock-ownership based,
2. the existing Convex auth HTTP file is incomplete and not routed,
3. seller write routes already bypass auth entirely through the deploy key,
4. current UI types conflate login identity with enriched business profile data,
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
6. `HGO-004` implementation is in place, but the row is currently `BLOCKED` on a pre-existing typecheck failure in `/Users/foundbrand_001/Development/vc83-com/convex/onboarding/universalOnboardingPolicy.ts:180`.
7. `crm_organization.customProperties.platformSubOrgId` is now the explicit stage-1 mapping contract for deterministic Hub-GW seller-context resolution.
8. The workstream is intentionally choosing a phased implementation instead of a one-shot.
9. Hub-GW is the proving ground, not the permanent special-case architecture.
10. Workstream artifacts are now consolidated under `apps/hub-gw/docs/workstreams/hub-gw-oauth`.
11. `HGO-006` is now `IN_PROGRESS` with first-pass Auth.js route and custom GW OIDC wiring landed.

---

## Core repo facts captured by this plan

1. `apps/hub-gw/lib/user-context.tsx` is mock auth and starts logged in.
2. `apps/hub-gw/app/api/*` seller mutation routes currently write through `CONVEX_DEPLOY_KEY` without session checks.
3. `convex/api/v1/auth.ts` exists but is not routed in `convex/http.ts` and is not Hub-GW ready.
4. `convex/auth.ts` has a partial `syncFrontendUser`, but its CRM link logic and seller-context return shape are incomplete.
5. `apps/hub-gw/lib/data-context.tsx` still uses `CURRENT_USER_ID` mock ownership semantics.

---

## Lane board

- [x] Lane `A` planning kickoff: `HGO-001`
- [x] Lane `A` auth foundation: `HGO-002`
- [~] Lane `B` backend sync and seller context: `HGO-003` done, `HGO-004` implemented but blocked on verification, `HGO-005` pending
- [~] Lane `C` frontend OAuth/session integration: `HGO-006` in progress, `HGO-007` pending
- [ ] Lane `D` seller hardening and ownership cleanup: `HGO-008`..`HGO-009`
- [ ] Lane `E` reusable org-level OIDC generalization: `HGO-010`..`HGO-013`
- [ ] Lane `F` endpoint fate, rollout docs, and smoke matrix: `HGO-014`..`HGO-015`

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
