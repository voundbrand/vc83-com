# Credits System & User Support Interface Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface`  
**Source request:** Build a unified credits + support surface from the top-right shell nav, including gifted/monthly/purchased credit breakdowns, code redemption, reusable platform referrals, structured feedback capture, and AI-assisted support escalation.

---

## Purpose

Queue-first execution surface for implementing the credits growth loop and support journey as one coherent product system rather than separate disconnected windows.

---

## Files

- Queue: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/TASK_QUEUE.md`
- Session prompts: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/SESSION_PROMPTS.md`
- Master plan: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/MASTER_PLAN.md`
- Index (this file): `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/INDEX.md`

---

## Status

1. `CSI-001` is `DONE` with canonical gifted/monthly/purchased contract and compatibility bridge.
2. `CSI-002` is `DONE` with idempotent gifted/monthly/purchased write primitives and immutable reason semantics.
3. `CSI-003` is `DONE` with deterministic credits balance/history envelopes and authenticated `/api/credits/*` routes.
4. Lane `B` (`CSI-004`..`CSI-006`) is `DONE` with redemption schema/services, `POST /api/credits/redeem`, and super-admin code management + analytics UX.
5. Lane `C` (`CSI-007`..`CSI-009`) is `DONE` with a top-right credits counter next to avatar, dropdown action wiring (`Redeem Code`, `Buy Credits`, `Refer`), redeem/purchase continuity updates, and a credits activity history panel with backend-aligned labels.
6. Lane `D` (`CSI-010`..`CSI-012`) is `DONE` with platform-configured referral routing, signup/subscription reward lifecycle (`$5/$20` each side), payment-confirmed subscription gating, `$200/month` cap enforcement, and referral modal UX (`/ref/{code}`, copy flow, progress meter, rules, calculator).
7. Lane `E` (`CSI-013`..`CSI-015`) is `DONE` with tri-state feedback sentiment capture, runtime-context-aware support routing, and support intake UX with product/account selectors plus clear support/community/sales channel split.
8. Lane `F` (`CSI-016`..`CSI-018`) is `DONE` with support-runtime knowledge seeding, deterministic escalation criteria + ticket path, and super-admin support quality analytics (resolution/escalation rate, conversation length, sentiment outcomes).
9. Lane `G` (`CSI-019`..`CSI-021`) is `DONE` with:
   - six-locale parity wiring for credits/referrals/feedback/support shell surfaces and seeded translation coverage,
   - fraud/safety hardening for redeem/referral/support abuse paths with role-gated force escalation,
   - published migration/backfill, rollback, and rollout ownership playbooks in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/credits-system-user-support-interface/MASTER_PLAN.md`.
10. Residual verification risk remains outside this workstream scope:
   - `npm run i18n:audit` still reports branch-wide unrelated new findings,
   - standalone `npm run test:roles` and `npm run test:permissions` are currently flaky due websocket reconnect instability; equivalent suites passed inside `npm run test:unit`.

---

## Lane progress board

- [x] Lane A: credit ledger contract and personal-scope extension (`CSI-001`..`CSI-003`)
- [x] Lane B: code redemption and super-admin controls (`CSI-004`..`CSI-006`)
- [x] Lane C: top-right credits UX and entry modals (`CSI-007`..`CSI-009`)
- [x] Lane D: platform referral architecture and payouts (`CSI-010`..`CSI-012`)
- [x] Lane E: feedback + support intake surfaces (`CSI-013`..`CSI-015`)
- [x] Lane F: AI support runtime + escalation (`CSI-016`..`CSI-018`)
- [x] Lane G: i18n/security/analytics/migration closeout (`CSI-019`..`CSI-021`)

---

## Operating commands

- Validate docs policy: `npm run docs:guard`
- Run type checks: `npm run typecheck`
- Run lint: `npm run lint`
- Run unit tests: `npm run test:unit`
- Run integration tests: `npm run test:integration`
- Run model validation: `npm run test:model`
- Run E2E desktop: `npm run test:e2e:desktop`
- Run E2E mobile: `npm run test:e2e:mobile`
- Run i18n audit: `npm run i18n:audit`
