# AI Endurance Autonomous Task Queue

**Last updated:** 2026-02-17  
**Purpose:** Deterministic execution queue for the next AI-endurance wave: close unfinished runtime seams and implement selected CommonGround protocol borrows.

---

## Queue rules

1. Only one task may be `IN_PROGRESS` at any time across the full queue.
2. A `PENDING` task becomes `READY` when all dependencies are `DONE`.
3. Execute highest-priority `READY` tasks first (`P0` -> `P1` -> `P2`), then lane order (`H` -> `I` -> `J` -> `K` -> `L`).
4. If a task becomes `BLOCKED`, record it in `docs/ai-endurance/BLOCKERS.md` and continue with the next `READY` task.
5. Keep this queue current after every task completion or block.

Status set: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT-AI` | `npx vitest run tests/unit/ai` |
| `V-INTEG-AI` | `npx vitest run tests/integration/ai` |
| `V-MODEL` | `npm run test:model` |
| `V-DOCS` | `npm run docs:guard` |

---

## Execution lanes

- `Lane H` (`WSH-*`): CommonGround borrow foundation (Plan 14 + Plan 15).
- `Lane I` (`WSI-*`): Harness/team semantics + soul-loop unification (Plan 16 + Plan 19).
- `Lane J` (`WSJ-*`): Core memory model + semantic retrieval pipeline (Plan 17 + Plan 18).
- `Lane K` (`WSK-*`): Operability playbooks + unfinished closure from Plans 01/02/03/04/13 + Plan 20.
- `Lane L` (`WSL-*`): Runtime hotspot extraction/refactor wave (Plan 21).

Concurrency rules:

1. Run only `Lane H` until `WSH-03` is `DONE`.
2. After `WSH-03` is `DONE`, run `Lane I`, `Lane J`, and `Lane K` in parallel (max one active task per lane, still one global `IN_PROGRESS`).
3. Run `Lane L` only after `WSH-07`, `WSI-06`, and `WSJ-06` are `DONE`.
4. Do not start lower-priority `READY` tasks while a higher-priority `READY` task exists.

---

## Queue history snapshot

Completed previous wave:
- `WS1-*`, `WS2-*`, `WS3-*`, `WS4-*`, `WS5-*`, `WS6-*`, `WSF-*`, `WSG-*` are `DONE` as of 2026-02-17.
- Detailed completion evidence remains in git history and prior queue revisions.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `WSH-01` | `H` | 14 | `P0` | `READY` | - | Add `agentTurns` + `executionEdges` schema and transition enums | `convex/schemas/agentSessionSchemas.ts`, `convex/schemas/aiSchemas.ts` | `V-TYPE`, `V-UNIT-AI` | CommonGround borrow: explicit turn state machine foundation. |
| `WSH-02` | `H` | 14 | `P0` | `PENDING` | `WSH-01` | Implement lease helpers (`acquire`, `heartbeat`, `release`, `fail`) with optimistic concurrency checks | `convex/ai/agentSessions.ts`, `convex/ai/agentExecution.ts` | `V-TYPE`, `V-UNIT-AI` | Must reject dual-active turn attempts for same session/agent. |
| `WSH-03` | `H` | 14 | `P0` | `PENDING` | `WSH-02` | Create turn-first inbound runtime path and propagate `turnId` across execution + audit logs | `convex/ai/agentExecution.ts`, `convex/ai/agentSessions.ts` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI` | This gate unlocks all downstream lanes. |
| `WSH-04` | `H` | 14 | `P0` | `PENDING` | `WSH-03` | Convert escalation/handoff checkpoints into explicit turn transitions and stale-turn recovery | `convex/ai/agentExecution.ts`, `convex/ai/teamHarness.ts`, `convex/ai/escalation.ts` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI` | Preserve existing behavior while formalizing transitions. |
| `WSH-05` | `H` | 15 | `P0` | `PENDING` | `WSH-03` | Add `agentInboxReceipts` schema and receipt-first ingress helper | `convex/schemas/aiSchemas.ts`, `convex/ai/agentExecution.ts` | `V-TYPE`, `V-UNIT-AI` | CommonGround borrow: durable inbox receipt as source of truth. |
| `WSH-06` | `H` | 15 | `P0` | `PENDING` | `WSH-05` | Enforce idempotency keys + dedupe ack semantics and persist one terminal deliverable pointer per turn | `convex/ai/agentExecution.ts`, `convex/ai/deadLetterQueue.ts`, `convex/ai/agentSessions.ts` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI` | Duplicate inbound events must not duplicate side effects. |
| `WSH-07` | `H` | 15 | `P0` | `PENDING` | `WSH-06` | Add receipt operations queries (aging, duplicates, stuck receipts) and replay-safe debug endpoints | `convex/ai/agentSessions.ts`, `convex/ai/workItems.ts` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI` | Required for support and incident triage. |
| `WSI-01` | `I` | 16 | `P1` | `PENDING` | `WSH-03` | Integrate `buildHarnessContext` + layer resolution into runtime prompt assembly | `convex/ai/harness.ts`, `convex/ai/agentExecution.ts` | `V-TYPE`, `V-UNIT-AI` | Close known gap: harness exists but is not wired into runtime. |
| `WSI-02` | `I` | 16 | `P1` | `PENDING` | `WSI-01` | Standardize handoff payload contract (`reason`, `summary`, `goal`) with schema validation | `convex/ai/teamHarness.ts`, `convex/ai/tools/teamTools.ts`, `convex/schemas/agentSessionSchemas.ts` | `V-TYPE`, `V-UNIT-AI` | Avoid free-form handoff payload drift. |
| `WSI-03` | `I` | 16 | `P1` | `PENDING` | `WSI-02` | Add PM->specialist continuity tests and reconcile team coordination docs | `tests/integration/ai`, `docs/platform/codebase_atlas/flows/F4-team-harness.md` | `V-INTEG-AI`, `V-DOCS` | Behavior and docs must match exactly. |
| `WSI-04` | `I` | 19 | `P1` | `PENDING` | `WSI-03`, `WSJ-03` | Consolidate reflection orchestration into one runtime/scheduler path | `convex/ai/selfImprovement.ts`, `convex/ai/soulEvolution.ts` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI` | Removes dual reflection engines. |
| `WSI-05` | `I` | 19 | `P1` | `PENDING` | `WSI-04` | Enforce all soul-policy guard fields and add 4-dimension drift scoring persistence | `convex/ai/soulEvolution.ts`, `convex/schemas/aiSchemas.ts` | `V-TYPE`, `V-UNIT-AI` | Enforce `maxProposalsPerWeek`, cooldown, min conversation/session gates. |
| `WSI-06` | `I` | 19 | `P1` | `PENDING` | `WSI-05` | Add alignment-proposal mode + operator drift queries and regression coverage | `convex/ai/soulEvolution.ts`, `convex/ai/agentSessions.ts`, `tests/integration/ai` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI` | Drift remediation must be visible and reviewable. |
| `WSJ-01` | `J` | 17 | `P1` | `PENDING` | `WSH-03` | Extend soul schema/model with typed `coreMemories` and metadata policy | `convex/ai/soulEvolution.ts`, `convex/schemas/aiSchemas.ts` | `V-TYPE`, `V-UNIT-AI` | Memory taxonomy: identity/boundary/empathy/pride/caution. |
| `WSJ-02` | `J` | 17 | `P1` | `PENDING` | `WSJ-01` | Add onboarding memory elicitation phase and interview distillation step | `convex/onboarding/seedPlatformAgents.ts`, `convex/ai/interviewRunner.ts` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI` | New-agent onboarding must create memory anchors. |
| `WSJ-03` | `J` | 17 | `P1` | `PENDING` | `WSJ-02` | Add operator review payloads and immutable-by-default memory enforcement | `convex/ai/soulEvolution.ts`, `convex/ai/tools/soulEvolutionTools.ts`, `tests/unit/ai` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI` | Prevent silent anchor mutation across proposals. |
| `WSJ-04` | `J` | 18 | `P1` | `PENDING` | `WSJ-03` | Add chunk/index schema and ingest pipeline for semantic memory retrieval | `convex/organizationMedia.ts`, `convex/schemas/coreSchemas.ts`, `convex/schemas/aiSchemas.ts` | `V-TYPE`, `V-UNIT-AI` | Fallback path to current retrieval remains mandatory. |
| `WSJ-05` | `J` | 18 | `P1` | `PENDING` | `WSJ-04` | Implement ranked semantic retrieval API with tenant-safe filters + confidence metadata | `convex/organizationMedia.ts`, `convex/ai/memoryComposer.ts` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI` | Include latency/quality assertions where feasible. |
| `WSJ-06` | `J` | 18 | `P1` | `PENDING` | `WSJ-05` | Integrate semantic retrieval in runtime with citation telemetry and fallback behavior | `convex/ai/agentExecution.ts`, `convex/ai/agentSessions.ts`, `tests/integration/ai` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI`, `V-MODEL` | Citation metadata required in audit payloads. |
| `WSK-01` | `K` | 20 | `P1` | `PENDING` | `WSH-03` | Author canonical playbooks for model outage, tool degradation, and cost spikes | `docs/ai-endurance/implementation-plans/20-ai-failure-playbooks-and-operability.md`, `docs/reference_docs/api/ai-model-validation-strategy.md` | `V-DOCS` | Playbooks must map to actual alert/query identifiers. |
| `WSK-02` | `K` | 20 | `P1` | `PENDING` | `WSK-01` | Add operability checklist, ownership map, and tabletop drill evidence links | `docs/ai-endurance/MASTER_PLAN.md`, `docs/ai-endurance/INDEX.md`, `docs/ai-endurance/BLOCKERS.md` | `V-DOCS` | Closes remaining Phase-4 operability gap. |
| `WSK-03` | `K` | 01 | `P1` | `PENDING` | `WSH-03` | Implement unified typed knowledge composition contract + load telemetry | `convex/ai/systemKnowledge/index.ts`, `convex/ai/agentExecution.ts`, `convex/ai/chat.ts` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI` | Existing Plan 01 residual closure. |
| `WSK-04` | `K` | 02 | `P1` | `PENDING` | `WSK-03` | Unify tool parsing/normalization adapters across chat and agent runtime | `convex/ai/toolBroker.ts`, `convex/ai/chat.ts`, `convex/ai/agentExecution.ts` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI` | Existing Plan 02 residual closure. |
| `WSK-05` | `K` | 03 | `P1` | `PENDING` | `WSK-04` | Add org-level allow/deny matrix and policy-audit coverage for layered scoping | `convex/ai/toolScoping.ts`, `convex/ai/agentSessions.ts`, `tests/unit/ai` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI` | Existing Plan 03 residual closure. |
| `WSK-06` | `K` | 04 | `P1` | `PENDING` | `WSK-05` | Implement model lifecycle retirement/deprecation workflow + safety checks | `convex/ai/modelDiscovery.ts`, `convex/ai/platformModelManagement.ts`, `convex/ai/settings.ts` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI`, `V-MODEL` | Existing Plan 04 residual closure. |
| `WSK-07` | `K` | 13 | `P2` | `PENDING` | `WSK-06` | Expand adapter conformance tests and tighten control-plane/plugin credential boundaries | `convex/channels/registry.ts`, `convex/channels/router.ts`, `tests/integration/ai` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI` | Existing Plan 13 residual closure. |
| `WSL-01` | `L` | 21 | `P2` | `PENDING` | `WSH-07`, `WSI-06`, `WSJ-06` | Capture characterization tests for current hotspot behavior before extraction | `tests/unit/ai`, `tests/integration/ai` | `V-UNIT-AI`, `V-INTEG-AI` | Gate for safe behavior-preserving refactor. |
| `WSL-02` | `L` | 21 | `P2` | `PENDING` | `WSL-01` | Extract prompt/context assembly module from `agentExecution.ts` | `convex/ai/agentExecution.ts`, `convex/ai/memoryComposer.ts` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI` | Keep existing runtime outputs unchanged. |
| `WSL-03` | `L` | 21 | `P2` | `PENDING` | `WSL-02` | Extract turn orchestration/transition decision helpers | `convex/ai/agentExecution.ts`, `convex/ai/agentSessions.ts` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI` | Align seam with Plan 14/15 kernel adapters. |
| `WSL-04` | `L` | 21 | `P2` | `PENDING` | `WSL-03` | Extract tool execution + approval orchestration module | `convex/ai/agentExecution.ts`, `convex/ai/toolBroker.ts`, `convex/ai/escalation.ts` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI` | Preserve approval policy behavior. |
| `WSL-05` | `L` | 21 | `P2` | `PENDING` | `WSL-04` | Extract escalation decision + dispatch orchestration module | `convex/ai/agentExecution.ts`, `convex/ai/escalation.ts`, `convex/ai/teamHarness.ts` | `V-TYPE`, `V-UNIT-AI`, `V-INTEG-AI` | Ensure parity with existing escalation logs/events. |
| `WSL-06` | `L` | 21 | `P2` | `PENDING` | `WSL-05` | Reduce `chat.ts` orchestration hotspots and finalize characterization parity sign-off | `convex/ai/chat.ts`, `tests/unit/ai`, `tests/integration/ai` | `V-TYPE`, `V-LINT`, `V-UNIT-AI`, `V-INTEG-AI`, `V-MODEL` | Completion closes Plan 21 exit criteria. |

---

## Completion map

- Plan 14 complete when `WSH-01` through `WSH-04` are `DONE`.
- Plan 15 complete when `WSH-05` through `WSH-07` are `DONE`.
- Plan 16 complete when `WSI-01` through `WSI-03` are `DONE`.
- Plan 17 complete when `WSJ-01` through `WSJ-03` are `DONE`.
- Plan 18 complete when `WSJ-04` through `WSJ-06` are `DONE`.
- Plan 19 complete when `WSI-04` through `WSI-06` are `DONE`.
- Plan 20 complete when `WSK-01` and `WSK-02` are `DONE`.
- Plan 21 complete when `WSL-01` through `WSL-06` are `DONE`.
- Residual closure complete when `WSK-03` through `WSK-07` are `DONE`.

