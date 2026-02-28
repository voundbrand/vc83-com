# Personal Life Operator Agent Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent`  
**Source request:** Evaluate current viability for a life-organizer agent (calendar-aware appointment scheduling including outbound calls) and create a queue-first implementation plan.

---

## Purpose

This workstream converts the user outcome into an execution-ready plan with docs-first CI discipline:

1. establish current capability reality,
2. define exact gaps to reach autonomous appointment scheduling,
3. sequence implementation in deterministic lanes,
4. keep BYOA/trust boundaries intact.

PRD v1.3 alignment scope:

1. bind appointment workflows to one-agent runtime contracts (work/private mode expectations, domain-scoped autonomy defaults),
2. keep personal-operator template behavior authoritative in overlapping seed/tool-scoping files,
3. consume multi-org core behavior from `YAI` without forking isolation logic.

---

## Core files

- Queue:  
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md`
- Session prompts:  
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/SESSION_PROMPTS.md`
- Master plan:  
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/MASTER_PLAN.md`
- Index (this file):  
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/INDEX.md`

---

## Status snapshot

1. Queue-first scaffold is established with deterministic schema and lane gating.
2. Lane `A` (`PLO-001`, `PLO-002`) is complete with code-anchored `AVAILABLE_NOW` vs `FUTURE_REQUIRED` reality lock and measurable personal-operator acceptance contract.
3. `V-DOCS` (`npm run docs:guard`) passed for both lane `A` rows.
4. Lane `B` (`PLO-003`, `PLO-004`) is complete with setup/discovery surfaces shipped: personal-operator setup panel in integrations and subtype-based coverage discovery with one-click specialist launch in agents/chat surfaces.
5. Lane `B` verify stack passed (`V-TYPE`, `V-LINT`, `V-UNIT`), with lint retaining baseline workspace warnings but no errors.
6. Lane `C` is now complete: `PLO-005` and `PLO-006` are both `DONE`.
7. Latest `PLO-006` re-verify (2026-02-24): `npm run typecheck` pass, `npm run lint` pass with baseline warnings (`3214`, `0` errors), and `npm run test:unit` pass (`117` files passed, `4` skipped; `544` tests passed, `80` skipped). Cloud-dependent RBAC/VAT suites were made opt-in behind `RUN_CONVEX_CLOUD_TESTS=1` to keep default unit baseline deterministic.
8. Supplemental cloud-only RBAC/VAT check on 2026-02-24 (`RUN_CONVEX_CLOUD_TESTS=1` against targeted suites) did not complete: Convex websocket retries (`Received network error or non-101 status code`) persisted and no final `Test Files`/`Tests` summary was emitted before termination.
9. Lane `D` runtime work is complete (`PLO-007`, `PLO-008`, `PLO-009` all `DONE`).
10. Lane `E` is complete (`PLO-010`, `PLO-011` are `DONE`): protected `Personal Life Operator` template and gap-first recommender flow are both in place.
11. Lane `F` is complete (`PLO-012`, `PLO-013` are `DONE`): outbound appointment calls remain approval-gated and sessions now show operator timeline cards for outreach/call attempts with redacted transcript snippets and failure reasons.
12. Latest `PLO-013` verify stack (2026-02-25) passed in row order: `npm run typecheck`; `npm run lint` (`0` errors, `3246` warnings); `npm run test:unit` (`130` files passed, `4` skipped; `628` tests passed, `80` skipped).
13. Lane `G` closeout recommendation (`PLO-015`) is published: limited rollout is recommended with `sandbox` default autonomy + explicit call approvals, and rollback paths are documented.
14. Lane `G` `P0` pilot validation is complete (`PLO-014` `DONE`): deterministic checklist evidence shipped for hair + dermatologist scenarios with a generalized scenario guard.
15. Lane `G` cross-org validation is complete (`PLO-016` `DONE`): personal/business context checks now include explicit pass/fail controls for mission/booking leakage, context-switch labeling clarity, and org-scoped booking mutation evidence.
16. Lane `G` cloud-only RBAC/VAT follow-up (`PLO-017`) is complete (2026-02-25): exact verify stack passed in row order: `npm run typecheck`; `RUN_CONVEX_CLOUD_TESTS=1 npm run test:unit -- tests/unit/permissions/basic-checks.test.ts tests/unit/permissions/organization-scoped.test.ts tests/unit/permissions/wildcards.test.ts tests/unit/roles/role-assignment.test.ts tests/unit/vat-calculation.test.ts`; `npm run docs:guard`. Final summary: `138` files passed, `732` tests passed; prior websocket reconnect failure signature was not reproduced.
17. Current reality outcome: pilot and cloud-only RBAC/VAT verification evidence are both green in this environment, and lane `G` is fully complete.

Cross-workstream ownership boundaries:

1. Keep this workstream focused on personal-operator runtime and pilot execution behavior.
2. AGP lane `J` owns global 104+ recommender index/matrix scaling (alongside catalog/tool-matrix/seed-library authority) in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/`.
3. Keep core one-agent runtime architecture authority in `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/`.
4. For overlapping files (`seedPlatformAgents.ts`, `toolScoping.ts`), this queue remains owner of personal-operator template/runtime specifics; global/core queues consume those specifics and must not duplicate or redefine them.

---

## Lane board

- [x] Lane A: capability reality lock + success contract (`PLO-001`..`PLO-002`)
- [x] Lane B: setup + discovery screens (`PLO-003`..`PLO-004`)
- [x] Lane C: integration runtime parity (`PLO-005`..`PLO-006`)
- [x] Lane D: outbound appointment execution + telephony (`PLO-007`..`PLO-009`)
- [x] Lane E: planner template + recommendations (`PLO-010`..`PLO-011`)
- [x] Lane F: trust/compliance hardening (`PLO-012`..`PLO-013`)
- [x] Lane G: pilot + closeout (`PLO-014`..`PLO-017`)

---

## Operating commands

- Docs guard: `npm run docs:guard`
- Code baseline checks for implementation rows: `npm run typecheck && npm run lint && npm run test:unit`
