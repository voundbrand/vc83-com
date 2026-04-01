# Convex AI Codebase Organization Session Prompts

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization`

Read before execution:

- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/TASK_QUEUE.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/MASTER_PLAN.md`
- `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/convex-ai-codebase-organization/INDEX.md`

---

## Lane gating and concurrency

1. At most one row may be `IN_PROGRESS`.
2. Complete lane `A` before lane `B` or lane `C` implementation rows.
3. Complete lane `B` move map before lane `C` extraction rows.
4. Run row `Verify` commands exactly before marking `DONE`.
5. Keep behavior compatibility and fail-closed compliance semantics intact during all moves.

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

1. Active row: none.
2. Deterministic next row after active completion: none (queue complete).
3. Queue status: all rows through `AIORG-013` are complete.

Progress log:

1. 2026-03-26: `AIORG-001` completed (repo-wide inventory baseline captured).
2. Dependency promotions: `AIORG-002` `PENDING -> READY`.
3. Active execution advanced to `AIORG-002`.
4. 2026-03-26: `AIORG-002` completed (canonical placement + hard-cutover no-wrapper contract finalized).
5. Dependency promotions: `AIORG-003` `PENDING -> READY`.
6. Active execution advanced to `AIORG-003`.
7. 2026-03-26: `AIORG-003` completed (deterministic move map and rewrite matrix frozen).
8. Dependency promotions: `AIORG-004` `PENDING -> READY`.
9. Active execution advanced to `AIORG-004`.
10. 2026-03-26: `AIORG-004` completed (app-local ElevenLabs scripts removed; `scripts/ai/elevenlabs` is now the executable surface).
11. Dependency promotions: `AIORG-005`, `AIORG-006`, `AIORG-007` `PENDING -> READY`.
12. Next deterministic row: `AIORG-005`.
13. 2026-03-27: `AIORG-005` moved `READY -> IN_PROGRESS`.
14. Dependency promotions: none.
15. Next deterministic row after active completion: `AIORG-006`.
16. 2026-03-27: `AIORG-005` completed (kernel extraction with compatibility exports).
17. Verify results: `npm run typecheck` passed; `npm run test:unit -- tests/unit/ai/runtimeModuleRegistry.test.ts tests/unit/ai/agentExecutionHotspotCharacterization.test.ts` passed; `npm run docs:guard` passed.
18. Dependency promotions: none.
19. Next deterministic row: `AIORG-006`.
20. 2026-03-27: `AIORG-006` moved `READY -> IN_PROGRESS`.
21. Dependency promotions: `AIORG-008` promoted `PENDING -> READY`.
22. Next deterministic row after active completion: `AIORG-009` (`P0`).
23. 2026-03-27: `AIORG-006` completed (model plane extraction with compatibility exports).
24. Verify results: `npm run typecheck` passed; `npm run test:unit -- tests/unit/ai/modelPolicy.test.ts tests/unit/ai/modelFailoverPolicy.test.ts` passed; `npm run docs:guard` passed.
25. Dependency promotions: `AIORG-009` promoted `PENDING -> READY`.
26. Next deterministic row: `AIORG-009`.
27. 2026-03-27: `AIORG-009` moved `READY -> IN_PROGRESS`.
28. Dependency promotions: none.
29. Next deterministic row after active completion: `AIORG-010`.
30. 2026-03-27: `AIORG-009` completed (compatibility export removal + boundary enforcement + drift guard).
31. Verify results: `npm run typecheck` passed; `npm run test:unit` passed; `npm run docs:guard` passed.
32. Dependency promotions: `AIORG-010` promoted `PENDING -> READY`.
33. Next deterministic row: `AIORG-010`.
34. 2026-03-27: `AIORG-010` moved `READY -> IN_PROGRESS`.
35. Dependency promotions: none.
36. Next deterministic row after active completion: `AIORG-007`.
37. 2026-03-27: `AIORG-010` completed (final cutover validation + docs synchronization).
38. Verify results: `npm run typecheck` passed; `npm run test:unit` passed; `npm run docs:guard` passed.
39. Dependency promotions: none.
40. Next deterministic row: `AIORG-007`.
41. 2026-03-27: `AIORG-007` moved `READY -> IN_PROGRESS`.
42. Dependency promotions: none.
43. Next deterministic row after active completion: `AIORG-008`.
44. 2026-03-27: `AIORG-007` completed (AI script-surface consolidation finished with canonical root entrypoints and stable legacy/app aliases).
45. Verify results: `npm run typecheck` passed; `npm run docs:guard` passed.
46. Dependency promotions: none.
47. Next deterministic row: `AIORG-008`.
48. 2026-03-27: `AIORG-008` moved `READY -> IN_PROGRESS`.
49. Dependency promotions: none (queue terminal after completion).
50. Next deterministic row after active completion: none.
51. 2026-03-27: `AIORG-008` completed (prioritized non-`convex/ai` backlog and sequencing policy captured in planning docs).
52. Verify results: `npm run docs:guard` passed.
53. Dependency promotions: none.
54. Next deterministic row: none (queue complete).
55. 2026-03-27: `AIORG-011` moved `READY -> IN_PROGRESS` for Clara V3 intake-only hardening and managed-tool pruning.
56. Dependency promotions: none.
57. Next deterministic row after active completion: none.
58. 2026-03-27: `AIORG-011` completed (Clara V3 intake-only behavior enforced with managed-tool pruning and simulator transfer-call assertions).
59. Verify results: `npm run typecheck` passed; `npm run ai:elevenlabs:sync -- --agent clara_v3 --write` passed; `npm run ai:elevenlabs:simulate -- --suite clara-v3-demo-proof --idle-ms 1800 --turn-timeout-ms 25000` passed; `npm run docs:guard` passed.
60. Dependency promotions: none.
61. Next deterministic row: none (queue complete).
62. 2026-03-27: `AIORG-012` moved `READY -> IN_PROGRESS` for reproducible Schmitt & Partner demo-office bootstrap.
63. Dependency promotions: none.
64. Next deterministic row after active completion: none.
65. 2026-03-27: `AIORG-012` completed (reproducible Schmitt & Partner demo-office bootstrap shipped with org provisioning, roster deployment, and idempotent synthetic CRM seeding).
66. Verify results: `npm run typecheck` passed; `npx tsx scripts/seed-schmitt-partner-demo-office.ts --help` passed; `npm run docs:guard` passed.
67. Dependency promotions: none. Next deterministic row: none (queue complete).
68. 2026-03-27: `AIORG-013` moved `READY -> IN_PROGRESS` for telephony-preflight hardening and live Schmitt demo-office bootstrap proof.
69. Dependency promotions: none.
70. Next deterministic row after active completion: none.
71. 2026-03-27: `AIORG-013` completed (telephony preflight hardening + rerun-safe signup recovery + live bootstrap command proof).
72. Verify results: `npm run typecheck` passed; `npx tsx scripts/seed-schmitt-partner-demo-office.ts --help` passed; `npx tsx scripts/seed-schmitt-partner-demo-office.ts --mode signup --suffix aiorg013-live --deploy-kanzlei-mvp` passed with deterministic summary output and explicit core-wedge warning capture; `npm run docs:guard` passed.
73. Dependency promotions: none. Next deterministic row: none (queue complete).

---

## Prompt A (Governance + contracts)

You are executing lane `A`.

1. Define final `convex/ai` ownership boundaries and placement rules.
2. Keep contract language deterministic and import-safe.
3. Avoid code moves in this lane.
4. Run `npm run docs:guard`.

---

## Prompt B (Move map + ElevenLabs relocation)

You are executing lane `B`.

1. Produce exact old-path -> new-path move matrix.
2. Relocate ElevenLabs ops implementation into `scripts/ai/elevenlabs`.
3. Remove app-local wrapper scripts; update command entrypoints to call `scripts/ai/elevenlabs/*` directly.
4. For Clara V3 hardening rows, enforce intake-only/no-live-transfer policy and managed-tool pruning.
5. Run row verify commands exactly.

---

## Prompt C (Core extraction)

You are executing lane `C`.

1. Extract runtime kernel and model planes into domain folders.
2. Use compatibility exports before cleanup.
3. Prevent circular imports and preserve behavior.
4. Run row verify commands exactly.

---

## Prompt D (Script cleanup)

You are executing lane `D`.

1. Consolidate AI/agent scripts into stable command surfaces.
2. Keep existing operator command UX stable.
3. For demo bootstrap rows, seed deterministic synthetic demo data and summarize resulting org/agent topology.
4. Run row verify commands exactly.

---

## Prompt E (Repo-wide backlog)

You are executing lane `E`.

1. Capture non-`convex/ai` reorganization opportunities with scope and sequencing.
2. Keep this lane planning-only.
3. Run `npm run docs:guard`.

---

## Prompt F (Cutover + hardening)

You are executing lane `F`.

1. Remove compatibility shims only after full cutover readiness.
2. Enforce import boundaries and drift checks.
3. Run full verify gates before closing queue.
