# Legal Front Office Agent Architecture Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legal-front-office-agent-architecture`

Read before execution:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legal-front-office-agent-architecture/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legal-front-office-agent-architecture/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legal-front-office-agent-architecture/INDEX.md`

---

## Lane gating and concurrency

1. At most one row may be `IN_PROGRESS`.
2. Complete lane `A` before lane `B` or lane `C` starts.
3. Lane `D` starts only after `LFA-004` and `LFA-006` are `DONE`.
4. Lane `E` starts only after lane `B/C` P0 rows are `DONE`.
5. Run row `Verify` commands exactly before marking `DONE`.
6. Keep fail-closed compliance, authority, and org-isolation semantics intact.

---

## Deterministic execution contract

1. Pick `P0` before `P1`.
2. Pick lowest lexical ID among dependency-satisfied rows.
3. Move selected row to `IN_PROGRESS`.
4. Implement scoped changes.
5. Run listed verify commands exactly.
6. Mark `DONE` on pass, or `BLOCKED` with evidence, mitigation, and dependency impact.
7. Synchronize `TASK_QUEUE.md`, `INDEX.md`, `MASTER_PLAN.md`, and `SESSION_PROMPTS.md` on every state transition.

---

## Current execution snapshot

1. Active row: `none` (queue complete).
2. Deterministic next row: `none` (all rows `DONE`).
3. Queue status: deterministic execution complete.

Progress log:

1. 2026-03-26: `LFA-001` completed; verify `npm run docs:guard` passed.
2. Dependency promotions: `LFA-005` `PENDING -> READY`.
3. Active execution advanced to `LFA-002`.
4. 2026-03-26: `LFA-002` completed; verify `npm run typecheck`, `npm run test:unit -- tests/unit/ai/orgActionRuntimeTopologyContract.test.ts`, and `npm run docs:guard` passed.
5. Dependency promotions: `LFA-003` `PENDING -> READY`.
6. Active execution advanced to `LFA-003`.
7. 2026-03-26: `LFA-003` completed; verify `npm run typecheck`, `npm run test:unit -- tests/unit/ai/runtimeModuleRegistry.test.ts tests/unit/ai/agentExecutionHotspotCharacterization.test.ts`, and `npm run docs:guard` passed.
8. Dependency promotions: `LFA-004` `PENDING -> READY`.
9. Active execution advanced to `LFA-004`.
10. 2026-03-26: `LFA-004` completed; verify `npm run typecheck`, `npm run test:unit -- tests/unit/ai/runtimeModuleRegistry.test.ts tests/unit/ai/agentSpecRegistry.contract.test.ts`, and `npm run docs:guard` passed.
11. Dependency promotions: none.
12. Active execution advanced to `LFA-005`.
13. 2026-03-26: `LFA-005` completed; verify `npm run typecheck`, `npm run test:unit -- tests/unit/ai/agentExecutionVoiceRuntime.test.ts tests/unit/ai/telephonyWebhookCompatibilityBridge.test.ts`, and `npm run docs:guard` passed.
14. Dependency promotions: `LFA-006` `PENDING -> READY`.
15. Active execution advanced to `LFA-006`.
16. 2026-03-26: `LFA-006` completed; verify `npm run typecheck`, `npm run test:unit -- tests/unit/compliance/complianceShadowModeEvaluator.test.ts tests/unit/ai/agentExecutionVoiceRuntime.test.ts`, and `npm run docs:guard` passed.
17. Dependency promotions: `LFA-007` `PENDING -> READY`, `LFA-009` `PENDING -> READY`.
18. Active execution advanced to `LFA-009` (`READY -> IN_PROGRESS`, deterministic `P0` lexical order).
19. 2026-03-26: `LFA-009` completed; verify `npm run typecheck`, `npm run test:unit -- tests/unit/ai/agentExecutionVoiceRuntime.test.ts tests/unit/compliance/complianceShadowModeEvaluator.test.ts`, and `npm run docs:guard` passed.
20. Dependency promotions: `LFA-010` `PENDING -> READY`.
21. Active execution advanced to `LFA-010` (`READY -> IN_PROGRESS`, deterministic `P0` lexical order).
22. 2026-03-26: `LFA-010` completed; verify `npm run typecheck`, `npm run test:unit`, and `npm run docs:guard` passed.
23. Dependency promotions: none.
24. Active execution advanced to `LFA-007` (`READY -> IN_PROGRESS`, deterministic `P1` lexical order after `P0` completion).
25. 2026-03-26: `LFA-007` completed; verify `npm run typecheck`, `npm run test:unit -- tests/unit/telephony/telephonyIntegration.test.ts`, and `npm run docs:guard` passed.
26. Dependency promotions: `LFA-008` `PENDING -> READY`.
27. Active execution advanced to `LFA-008` (`READY -> IN_PROGRESS`, deterministic lexical order).
28. 2026-03-26: `LFA-008` completed; verify `npm run docs:guard` and `npm run typecheck` passed.
29. Dependency promotions: none.
30. Queue execution completed with all rows in `DONE` status.

---

## Prompt A (Architecture contracts and docs)

You are executing lane `A`.

1. Lock canonical architecture docs to explicit role separation (`Clara`, `Helena`, `Compliance Evaluator`, `Quinn onboarding`).
2. Keep edits focused on architecture source-of-truth docs.
3. Ensure no ambiguous topology wording remains.
4. Run `npm run docs:guard`.

---

## Prompt B (Runtime modules and topology declarations)

You are executing lane `B`.

1. Add explicit topology declaration contracts for seeded templates.
2. Extract Quinn onboarding runtime module with no behavior change.
3. Add Helena runtime module scaffold with deterministic manifest boundaries.
4. Register modules and keep runtime selection deterministic.
5. Run row verify commands exactly (`typecheck`, targeted unit tests, `docs:guard`).

---

## Prompt C (Legal runtime flow)

You are executing lane `C`.

1. Implement strict structured handoff packet from Clara to Helena.
2. Enforce compliance evaluator gate before outward commitments.
3. Preserve fail-closed behavior when compliance posture blocks.
4. Keep auditability and org isolation explicit.
5. Run row verify commands exactly.

---

## Prompt D (ElevenLabs roster governance)

You are executing lane `D`.

1. Add lifecycle governance (`active`/`inactive`) for roster control.
2. Preserve inactive specialist assets, do not delete them.
3. Keep Veronica boundary explicit and non-ambiguous.
4. Run row verify commands exactly.

---

## Prompt E (Synthetic data and validation)

You are executing lane `E`.

1. Build synthetic legal-org fixture package for repeatable tests.
2. Add legal-path regression matrix for Clara -> Helena -> Compliance critical flow.
3. Keep verification evidence in workstream docs.
4. Run row verify commands exactly.

---

## Prompt F (Autonomous full-queue mode)

Use this workstream when running full deterministic execution:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/legal-front-office-agent-architecture/TASK_QUEUE.md`
