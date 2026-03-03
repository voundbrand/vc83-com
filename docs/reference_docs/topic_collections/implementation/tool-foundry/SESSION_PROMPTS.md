# Tool Foundry Session Prompts

Use these prompts to execute this workstream lane-by-lane with deterministic queue behavior.

Workstream root:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry`

Queue:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/TASK_QUEUE.md`

Lane milestone log:
1. 2026-02-26: Lane `A` `P0` rows completed (`TFD-001`, `TFD-002`) with queue-first scaffold and initial machine-testable foundry contracts.
2. 2026-02-26: Lane `B` `P0` row completed (`TFD-003`) by adding capability-limited execution decision helpers.
3. 2026-02-26: Lane `D` `P0` row completed (`TFD-004`) by adding foundry-specific CI guard script and workflow.
4. 2026-02-26: Lane `C` `P0` row completed (`TFD-005`) by adding deterministic runtime capability-gap `blocked` responses with unblocking steps and ToolSpec draft artifact metadata.
5. 2026-02-26: Lane `C` `P1` row `TFD-006` moved to `IN_PROGRESS`; deterministic ToolSpec proposal backlog persistence (provenance/trace + rollback metadata) implemented and unit-verified.
6. 2026-02-26: Lane `C` row `TFD-006` completed (`DONE`) after `npm run typecheck`, `npm run test:unit:tool-foundry`, targeted persistence tests, and `npm run docs:guard` all passed.
7. 2026-02-27: Readiness review completed; `TFD-007` promoted to `READY`, frontline intake desktop/web wiring confirmed, and operator-mobile parity set as a gated step after trust telemetry.
8. 2026-02-27: Lane `E` row `TFD-007` completed (`DONE`) after adding deterministic foundry lifecycle trust telemetry correlation/boundary fields and passing `npm run typecheck`, `npm run test:unit:tool-foundry`, `npx vitest run tests/unit/ai/trustEventTaxonomy.test.ts`, and `npm run docs:guard`.
9. 2026-02-27: Lane `E` row `TFD-008` completed (`DONE`) after adding read-only Tool Foundry evidence-view contract coverage (policy checks, test evidence, approval chain, canary metrics, rollback readiness) with mobile parity behind explicit feature flag, and passing `npm run typecheck`, `npm run lint` (0 errors; existing warnings only), `npm run test:unit:tool-foundry` (`19` tests), and `npm run docs:guard`.
10. 2026-02-27: Lane `F` row `TFD-009` completed (`DONE`) after adding deterministic pilot coverage for read-only + mutating capability-gap paths, negative controls for approval bypass/capability escalation, and mobile-flag parity checks, with `npm run typecheck`, `npm run test:unit:tool-foundry` (`22` tests), and `npm run docs:guard` passing.
11. 2026-02-27: Lane `F` row `TFD-010` completed (`DONE`) after publishing final rollout recommendation, residual risks, rollback path, and explicit operator-mobile parity go/no-go decision in synchronized queue artifacts; verification `npm run docs:guard` passed.
12. 2026-03-01: Follow-on residual-risk rows `TFD-011`..`TFD-013` completed (`DONE`) by adding session-based promotion decision wiring, requiring `actorUserId` on internal promotion decision contract, and adding immutable-core allowlist drift guard coverage; verification included `npx tsc -p convex/tsconfig.json --noEmit`, `npx vitest run tests/unit/ai/toolFoundryContracts.test.ts tests/unit/ai/toolFoundryIntegrityContract.test.ts tests/unit/ai/toolFoundryGovernance.test.ts`, and `npm run docs:guard`.
13. 2026-03-01: Operator-mobile parity residual rows `TFD-014` and `TFD-015` completed (`DONE`) by wiring runtime boundary CTA -> frontline Tool Foundry intake kickoff in mobile chat and adding dedicated kickoff/CTA regression tests; verification included root/mobile typecheck, targeted vitest suites, and docs guard.

---

## Global execution rules

1. Run only rows in this queue.
2. Before each row, list top 3 regression risks and impacted contracts.
3. Keep one-agent trust/approval boundaries authoritative for mutating actions.
4. Unknown backend/tooling requests must fail closed to deterministic `blocked` states.
5. No hidden capability escalation: all promotion decisions must be evidence-backed.
6. Run row `Verify` commands exactly.
7. Keep statuses limited to `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
8. Sync `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and this file at each lane milestone.
9. Enforce dependency token semantics before any status transition.

---

## Session A (Lane A: charter + contracts)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `A` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/TASK_QUEUE.md`

Rules:
1. Freeze stage, promotion, and authority contracts before runtime integration.
2. Keep contracts machine-testable and deterministic.
3. Record explicit risk checks in `MASTER_PLAN.md`.
4. Run row `Verify` commands exactly.

---

## Session B (Lane B: policy engine)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `B` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/TASK_QUEUE.md`

Rules:
1. Keep evaluation logic pure and side-effect free.
2. Default any incomplete evidence path to `deny` or `require_approval`.
3. Add unit tests for every stage/capability edge case.
4. Run row `Verify` commands exactly.

---

## Session C (Lane C: runtime gap-path integration)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `C` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/TASK_QUEUE.md`

Rules:
1. Unsupported requests must emit deterministic `blocked` payloads with unblocking steps.
2. Do not invent backend behavior.
3. Persist proposal artifacts with provenance and rollback metadata.
4. Run row `Verify` commands exactly.

---

## Session D (Lane D: CI guardrails)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `D` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/TASK_QUEUE.md`

Rules:
1. Foundry code changes must require docs and tests updates.
2. Guard scripts must work in both local and CI diff modes.
3. Keep workflow scopes narrow to foundry-owned surfaces.
4. Run row `Verify` commands exactly.

---

## Session E (Lane E: trust telemetry)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `E` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/TASK_QUEUE.md`

Rules:
1. Promotion and denial flows must emit trust events with correlation IDs.
2. Evidence artifacts must stay machine-readable and privacy-safe.
3. Keep UI evidence surfaces read-only.
4. Do not add full operator-mobile parity until `TFD-007` lifecycle events are in place; if parity work starts in this lane, keep it behind a feature flag with shared event contract fields.
5. Run row `Verify` commands exactly.

---

## Session F (Lane F: pilot + closeout)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `F` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/TASK_QUEUE.md`

Rules:
1. Pilot must include mutating and non-mutating gap scenarios.
2. Include negative controls for approval bypass and capability escalation.
3. Include one parity validation scenario to confirm desktop/mobile intake contract alignment when mobile flag is enabled.
4. Publish rollout recommendation with rollback plan and explicit mobile parity go/no-go decision.
5. Run row `Verify` commands exactly.
