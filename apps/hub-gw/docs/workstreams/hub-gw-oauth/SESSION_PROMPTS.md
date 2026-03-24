# Hub-GW OAuth Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/apps/hub-gw/docs/workstreams/hub-gw-oauth`

---

## Lane gating and concurrency

1. Run at most one `IN_PROGRESS` row globally unless temporary parallelism is explicitly approved.
2. Do not start lane `B` before lane `A` `P0` rows (`HGO-001`, `HGO-002`) are `DONE`.
3. Do not start lane `C` before `HGO-003` and `HGO-004` are `DONE`.
4. Do not start lane `D` before `HGO-006` and `HGO-007` are `DONE`.
5. Do not start lane `E` before `HGO-008` and `HGO-009` are `DONE`.
6. Do not start lane `F` before `HGO-012` and `HGO-013` are `DONE`.
7. `HGO-014` may close as either a full wiring row or a deprecation or cleanup row, but one of those outcomes must be explicit.
8. After each `DONE` row that changes plan authority, sync `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, `MASTER_PLAN.md`, and `../PROMPT_HUB_GW_OAUTH.md`.

Status snapshot (2026-03-24):

1. `HGO-001` is `DONE`.
2. `HGO-002` is `DONE`.
3. `HGO-003` is `DONE`.
4. `HGO-004` is `BLOCKED` pending row verification because the repo currently fails typecheck in `/Users/foundbrand_001/Development/vc83-com/convex/onboarding/universalOnboardingPolicy.ts:180`.
5. `HGO-005` is `PENDING`.
6. `HGO-006` is `IN_PROGRESS`.
7. `HGO-007` through `HGO-015` are `PENDING`.
8. Active row count is `1`.

---

## Prompt A (Lane A: contract + foundation)

You are executing lane `A` for Hub-GW OAuth foundation work.

Tasks:

1. Complete `HGO-002`: dependency placement decision, client providers wrapper, TS include coverage, env example, mock-mode contract.

Requirements:

1. Do not assume `apps/hub-gw/types/next-auth.d.ts` is auto-included; prove the include path works.
2. Do not place `SessionProvider` directly into the current async layout without a client wrapper.
3. Keep mock-mode development usable when GW credentials are absent.
4. Run row `Verify` commands exactly.

---

## Prompt B (Lane B: backend identity sync)

You are executing lane `B` for backend identity sync and seller-context resolution.

Tasks:

1. Complete `HGO-003`: select and wire the real sync entrypoint.
2. Complete `HGO-004`: fix Hub-GW-aware identity sync return shape.
3. Complete `HGO-005`: codify deterministic seller/sub-org resolution.

Requirements:

1. Prefer the simplest path that matches current Hub-GW server-side architecture.
2. Do not rely on `getDefaultOrganization()` for Hub-GW.
3. Treat `works_at` as the repo-default CRM org link unless compatibility handling is deliberately added.
4. Keep seller-context fields additive and typed.
5. Run row `Verify` commands exactly.

---

## Prompt C (Lane C: frontend OAuth/session integration)

You are executing lane `C` for Hub-GW browser auth integration.

Tasks:

1. Complete `HGO-006`: Auth.js route, sign-in, and session flow with mock fallback.
2. Complete `HGO-007`: replace mock auth context with session identity plus separate enrichment path.

Requirements:

1. Session stores identity and authorization context only.
2. Business/legal profile data must not be faked into the session to satisfy old UI types.
3. Navigation and profile UI must degrade safely when enrichment data is absent.
4. Run row `Verify` commands exactly.

---

## Prompt D (Lane D: seller authorization hardening)

You are executing lane `D` for seller security and ownership cleanup.

Tasks:

1. Complete `HGO-008`: require server-side auth and seller checks on all Hub-GW mutation routes and protected pages.
2. Complete `HGO-009`: remove mock ownership assumptions from the data layer.

Requirements:

1. Route handlers must fail closed without a valid session.
2. Middleware may support UX flow, but it does not replace route-handler checks.
3. "Meine Angebote" must reflect real backend ownership or seller-org scope, not `CURRENT_USER_ID`.
4. Run row `Verify` commands exactly.

---

## Prompt E (Lane E: reusable platform OIDC)

You are executing lane `E` for reusable org-level OIDC generalization.

Tasks:

1. Complete `HGO-010`: define the reusable per-org OIDC provider model.
2. Complete `HGO-011`: implement reusable OIDC start/callback/state handling.
3. Complete `HGO-012`: migrate Hub-GW to consume the reusable layer.
4. Complete `HGO-013`: publish the admin/onboarding contract for future orgs.

Requirements:

1. The final abstraction must not be Hub-GW-specific.
2. Do not reuse the existing platform OAuth application system for frontend member login.
3. Require discovery URL or explicit endpoints, claim mapping, and secret handling to be explicit.
4. Run row `Verify` commands exactly.

---

## Prompt F (Lane F: endpoint fate + rollout)

You are executing lane `F` for old-endpoint cleanup and rollout proof.

Tasks:

1. Complete `HGO-014`: wire or explicitly deprecate the old public Convex auth endpoints.
2. Complete `HGO-015`: publish the final smoke-test and rollout matrix.

Requirements:

1. Do not leave old docs claiming "backend ready" if the code path remains unused or incomplete.
2. Final docs must cover mock mode, browser-only users, sellers, configured GW-OAuth mode, and at least one reusable non-GW org integration path.
3. Stream closeout requires both code verification and docs verification.
4. Run row `Verify` commands exactly.
