# Personal Life Operator Agent Session Prompts

Use these prompts to execute this workstream lane-by-lane with deterministic queue behavior.

Workstream root:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent`

Queue:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md`

Lane milestone log:
1. 2026-02-24: Lane `A` complete (`PLO-001`, `PLO-002`) with `V-DOCS` pass.
2. 2026-02-24: Lane `B` complete (`PLO-003`, `PLO-004`) with `V-TYPE`, `V-LINT`, and `V-UNIT` pass.
3. 2026-02-24: Lane `C` partial progress: `PLO-005` `DONE`; `PLO-006` was previously `BLOCKED` while shared `V-LINT`/`V-UNIT` baseline issues were investigated.
4. 2026-02-24: Lane `C` complete: `PLO-006` moved to `DONE` after shared lint fixes (`convex/agentOntology.ts`, `src/components/window-content/org-owner-manage-window/ai-settings-tab.tsx`) and deterministic `V-UNIT` baseline unblocking by gating cloud-dependent RBAC/VAT suites behind `RUN_CONVEX_CLOUD_TESTS=1` (`117` files passed, `4` skipped; `544` tests passed, `80` skipped).
5. 2026-02-24: Supplemental cloud-only RBAC/VAT verify attempt with `RUN_CONVEX_CLOUD_TESTS=1` (targeted suites) did not complete in this environment due repeated Convex websocket reconnect failures (`Received network error or non-101 status code`).
6. 2026-02-25: Lane `D` confirmed complete (`PLO-007`, `PLO-008`, `PLO-009` all `DONE`) and lane `E` `P0` completed (`PLO-010` `DONE`) via protected-template personal-operator seed contract wiring.
7. 2026-02-25: `PLO-010` verify stack passed: `V-TYPE` (`npm run typecheck`), `V-LINT` (`0` errors, baseline warnings), `V-UNIT` (`121` files passed, `4` skipped; `561` tests passed, `80` skipped).
8. 2026-02-25: Lane `E` `P1` (`PLO-011`) and lane `F` `P0` (`PLO-012`) are both `DONE` after re-verification; prior `soulEvolution` typecheck blocker was no longer reproducible.
9. 2026-02-25: Lane `G` `P0` (`PLO-014`) completed with deterministic pilot checklist evidence for hair + dermatologist scenarios, plus generalized scenario guard and approval-boundary negative control (`tests/unit/ai/personalLifeOperatorPilotChecklist.test.ts`).
10. 2026-02-25: Lane `F` `P1` (`PLO-013`) completed: sessions UI now renders outreach/call attempt timeline cards backed by mission-linked API aggregation with transcript snippets redacted by default and explicit failure-reason badges. Verify stack passed (`npm run typecheck`; `npm run lint` with `0` errors and `3246` warnings; `npm run test:unit` with `130` files passed, `4` skipped; `628` tests passed, `80` skipped).
11. 2026-02-25: Lane `G` closeout row (`PLO-015`) completed with synchronized docs (`INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, `SESSION_PROMPTS.md`), limited-rollout recommendation, unresolved blocker log (`PLO-016` + cloud-only RBAC/VAT environment gap), and rollback plan. `V-DOCS` passed (`npm run docs:guard`).
12. 2026-02-25: Lane `G` final row (`PLO-016`) completed with deterministic personal/business cross-org validation controls in `tests/unit/ai/personalLifeOperatorPilotChecklist.test.ts` (no personal-data leakage, context-switch clarity, and org-aware booking behavior gates). Verify stack passed in row order: `npm run typecheck`; `npm run test:unit` (`133` files passed, `4` skipped; `645` tests passed, `80` skipped); `npm run docs:guard`. Closeout ownership note recorded: AGP lane `J` owns global 104+ recommender index/matrix scaling; PLO remains owner of personal-operator template/runtime behavior.
13. 2026-02-25: Lane `G` follow-up row (`PLO-017`) completed to re-run cloud-only RBAC/VAT verification in this environment. Verify stack passed in row order: `npm run typecheck`; `RUN_CONVEX_CLOUD_TESTS=1 npm run test:unit -- tests/unit/permissions/basic-checks.test.ts tests/unit/permissions/organization-scoped.test.ts tests/unit/permissions/wildcards.test.ts tests/unit/roles/role-assignment.test.ts tests/unit/vat-calculation.test.ts` (`138` files passed; `732` tests passed); `npm run docs:guard`. Prior websocket reconnect failure signature was not reproduced. Ownership note reaffirmed: AGP lane `J` owns global 104+ recommender index/matrix scaling; PLO remains owner of personal-operator template/runtime behavior.
14. 2026-03-11: Lane `H` weekend-mode extension (`PLO-018`..`PLO-020`) completed: weekend schedule activation/deactivation, weekend prompt overlay, weekend caller auto-CRM + dedicated pipeline stages, post-summary task extraction, Monday report generation/delivery, and setup toggle persistence are now shipped. Verify stack passed in row order: `npm run typecheck`; `npx vitest run tests/unit/ai/weekendMode.test.ts`; `npx convex codegen`; `npm run docs:guard`.

---

## Global execution rules

1. Run only tasks in this queue.
2. Before each task, list top 3 regression risks and reference impacted contracts.
3. Keep BYOA security boundaries unchanged unless the queue row explicitly authorizes contract updates.
4. Consume shared one-agent/runtime contracts from `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/`; do not fork core contract definitions here.
5. Enforce layered behavior language for all implementation choices: `prompt + memory + policy + tools + eval + trust`.
6. Treat `soul` updates as full behavioral-system updates, not prompt-only persona edits.
7. Run row `Verify` commands exactly.
8. Keep statuses limited to `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
9. Sync `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and this file at each lane milestone.
10. Do not absorb global 104+ recommender index/matrix scaling or catalog/tool-matrix/seed-library rows from `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/` (AGP lane `J` ownership); consume those outputs as upstream contracts.
11. Enforce dependency token semantics from queue rules (`ID`, `ID@READY`, `ID@DONE_GATE`) before any status transitions.

---

## Session A (Lane A: capability reality lock)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `A` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md`

Rules:
1. Every capability claim must be backed by current code/file anchors.
2. Separate "available now" from "future required" with no ambiguity.
3. Define measurable success contract before moving to any implementation lane.
4. Include `appointment_booking` autonomy default and work/private mode expectations.
5. Run `V-DOCS` exactly.
6. Stop when lane `A` has no promotable rows.

---

## Session B (Lane B: setup + discovery screens)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `B` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md`

Rules:
1. Build screens for setup, deployment choice, and agent coverage discovery.
2. Keep welcome/setup copy aligned to real first-run behavior and timing promises.
3. Keep UI changes scoped to integrations/onboarding/agent discovery surfaces.
4. Run row `Verify` commands exactly.
5. Stop when lane `B` has no promotable rows.

---

## Session C (Lane C: integration runtime parity)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `C` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md`

Rules:
1. Keep OAuth scope and token handling within existing contracts.
2. Add runtime parity for Google readiness checks before planner actions.
3. Ensure schema changes are migration-safe and backward compatible.
4. Run row `Verify` commands exactly.
5. Stop when lane `C` has no promotable rows.

---

## Session D (Lane D: outbound appointment execution)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `D` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md`

Rules:
1. Preserve channel provider conformance contracts and idempotent delivery semantics.
2. Telephony additions must include transcript + outcome artifacts for auditability.
3. Enforce bounded retries and business-hour controls.
4. Keep default autonomy at `sandbox` for appointment-booking workflows unless explicit promotion criteria are met.
5. Run row `Verify` commands exactly.
6. Stop when lane `D` has no promotable rows.

---

## Session E (Lane E: planner template + recommendations)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `E` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md`

Rules:
1. Reuse protected template and clone-policy mechanics from existing seed flows.
2. Recommend agents using explicit gap explanations (tools/integrations/approvals).
3. Do not introduce hidden autonomy escalation.
4. Consume `YAI-003` and `YAI-008` contract readiness before promoting `PLO-010`.
5. Run row `Verify` commands exactly.
6. Stop when lane `E` has no promotable rows.

---

## Session F (Lane F: trust + compliance)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `F` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md`

Rules:
1. Outbound calls require explicit approval and consent disclosure contracts.
2. Keep medical/PII handling policy explicit and enforceable in runtime + UI.
3. Add timeline evidence without exposing unnecessary sensitive detail.
4. Align sensitive-private guardrails with core archetype contract (`YAI-006`).
5. Run row `Verify` commands exactly.
6. Stop when lane `F` has no promotable rows.

---

## Session G (Lane G: pilot + closeout)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `G` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md`

Rules:
1. Run end-to-end pilot evidence for both target appointment scenarios.
2. Publish pass/fail outcomes with blockers and rollback path.
3. Validate personal-vs-business org behavior once `YAI-007` is at least `READY`.
4. Close only when queue/docs/prompts are synchronized and verify logs are recorded.
5. Run row `Verify` commands exactly.
6. Stop when lane `G` has no promotable rows.

---

## Session H (Lane H: weekend mode operations extension)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `H` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/TASK_QUEUE.md`

Rules:
1. Implement weekend mode as an additive overlay on the existing personal operator; do not fork core runtime contracts.
2. Keep timezone-aware schedule transitions deterministic (Friday evening activate, Monday morning deactivate) and log state changes via existing object-action patterns.
3. Ensure weekend call capture includes contact resolution/creation, dedicated pipeline routing, and session metadata needed for Monday handoff.
4. Monday report flow must persist an in-app artifact even when external delivery (email/telegram) fails.
5. Run row `Verify` commands exactly, including `npx convex codegen`.
6. Stop when lane `H` has no promotable rows.
