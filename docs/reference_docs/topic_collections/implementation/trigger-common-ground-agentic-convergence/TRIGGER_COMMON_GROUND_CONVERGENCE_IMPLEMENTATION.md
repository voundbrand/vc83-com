# Trigger + Common Ground Convergence Implementation Spec

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence`

---

## Objective

Define implementation-ready contracts that combine:

1. Common Ground kernel invariants, and
2. Trigger-style execution lifecycle patterns,

while staying native to LayerCake runtime architecture.

This spec includes collaboration runtime convergence for operator group chat + specialist DM workflows under deterministic orchestrator-governed authority.

---

## Source concept anchors

### Common Ground anchors

1. protocol-first layering and kernel constraints:
   `/Users/foundbrand_001/Development/vc83-com/docs/reference_projects/CommonGround/docs/EN/01_getting_started/architecture_intro.md`
2. immutable lineage and state/doorbell split operating model:
   `/Users/foundbrand_001/Development/vc83-com/docs/reference_projects/CommonGround/README.md`
3. repository operating principle:
   `/Users/foundbrand_001/Development/vc83-com/docs/reference_projects/CommonGround/AGENTS.md`

### Trigger anchors

1. runtime lifecycle and task trigger flow:
   `/Users/foundbrand_001/Development/vc83-com/docs/reference_projects/trigger.dev/docs/how-it-works.mdx`
2. queue and concurrency semantics:
   `/Users/foundbrand_001/Development/vc83-com/docs/reference_projects/trigger.dev/docs/queue-concurrency.mdx`
3. idempotency and retry semantics:
   `/Users/foundbrand_001/Development/vc83-com/docs/reference_projects/trigger.dev/docs/idempotency.mdx`
4. run engine concerns:
   `/Users/foundbrand_001/Development/vc83-com/docs/reference_projects/trigger.dev/apps/webapp/app/runEngine/concerns/queues.server.ts`
   `/Users/foundbrand_001/Development/vc83-com/docs/reference_projects/trigger.dev/apps/webapp/app/runEngine/concerns/idempotencyKeys.server.ts`

---

## TCG-001 boundary freeze (`kernel` vs `execution`)

### Top 3 contract-regression risks before `TCG-001`

1. unbounded ownership between kernel and execution could cause lifecycle writes that bypass typed transition contracts,
2. route identity logic could diverge across webhook, router, and session layers and break tenant isolation guarantees,
3. collaboration runtime could introduce thread/authority fields without fail-closed validation semantics.

### Frozen boundary contract

| Boundary ID | Frozen contract | Concrete runtime evidence |
|---|---|---|
| `TCG-BR-01` | Lifecycle state + transition authority is kernel-owned and type-gated. | `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts` (`agentTurnStateValidator`, `agentTurnTransitionValidator`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` (`recordTurnTransition`) |
| `TCG-BR-02` | Tenant + route resolution is fail-closed before execution admission. | `/Users/foundbrand_001/Development/vc83-com/convex/integrations/tenantResolver.ts` (`resolveSingleTenantContext`); `/Users/foundbrand_001/Development/vc83-com/convex/channels/router.ts` (`validateCredentialBoundary`) |
| `TCG-BR-03` | Execution pipeline owns ingress idempotency receipts and turn lease progression only. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` (`ingestInboundReceipt`, `markReceiptProcessing`, `completeInboundReceipt`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` (`acquireTurnLease`, `heartbeatTurnLease`, `releaseTurnLease`, `failTurnLease`) |
| `TCG-BR-04` | Operator timelines are read models over trusted lifecycle evidence. | `/Users/foundbrand_001/Development/vc83-com/convex/terminal/terminalFeed.ts` (`getTerminalFeed`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` (`getControlCenterThreadRows`, `getControlCenterThreadDrillDown`) |
| `TCG-BR-05` | Collaboration remains handoff-only until typed group/DM authority contract tasks are complete. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/teamHarness.ts` (`executeTeamHandoff`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/teamTools.ts` (`tagInSpecialistTool`) |

---

## TCG-002 deterministic code-anchored mapping matrix

### Top 3 contract-regression risks before `TCG-002`

1. mapping concepts to incorrect runtime files could produce implementation work against non-authoritative surfaces,
2. mapping without typed anchor symbols could reintroduce free-form schema drift during runtime tasks,
3. missing gap labels could make dependency closure nondeterministic across lanes `B`..`D`.

| Pattern ID | Adopted concept | Concrete runtime files + typed anchors (existing evidence) | Gap label | Closure task |
|---|---|---|---|---|
| `TCG-P01` | Common Ground kernel constraints for lifecycle governance | `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts` (`AGENT_TURN_STATE_VALUES`, `AGENT_TURN_TRANSITION_VALUES`, `AGENT_TURN_TRANSITION_POLICY_RULES`, `assertAgentTurnTransitionEdge`); `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts` (`agentTurns`, `executionEdges.transitionPolicyVersion`, `executionEdges.replayInvariantStatus`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` (`appendExecutionEdge`, `recordTurnTransition`) | `TCG-G01` closed 2026-02-21: replay edge invariants are now enforced by typed transition-policy hooks and persisted policy markers. | `TCG-003` |
| `TCG-P02` | Common Ground human-as-agent async checkpoints | `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts` (`escalationState.hitlWaitpoint`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` (`enforceHitlWaitpointContract`, `issueHitlWaitpointContract`, fail-closed `blocked_sync_checkpoint` path) | `TCG-G02` closed 2026-02-21: waitpoint token contract (`issue`, `expiry`, `resume`, `abort`) is typed and fail-closed on mismatch/expiry. | `TCG-004` |
| `TCG-P03` | Trigger queue/concurrency semantics | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` (`buildSessionRoutingKey`, `selectActiveSessionForRoute`, `acquireTurnLease`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` (turn lease acquire/heartbeat/release/fail orchestration) | `TCG-G03` closed 2026-02-21: first-class typed queue contract now persists `tenant + route + workflow` keys and deterministic conflict labels across receipt and lease paths. | `TCG-005` |
| `TCG-P04` | Trigger idempotency semantics | `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts` (`agentInboxReceipts`, `by_org_idempotency_key` index); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` (`ingestInboundReceipt`, `markReceiptProcessing`, `completeInboundReceipt`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` (`getReplaySafeReceiptDebug`, `requestReplaySafeReceipt`) | `TCG-G04` closed 2026-02-21: typed idempotency scope + TTL contract now governs ingress/orchestration replay behavior with org-key compatibility fallback. | `TCG-006` |
| `TCG-P05` | Trigger run lifecycle and retries | `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts` (`agentTurns.transitionVersion`, lifecycle timing fields); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` (`withRetry`, `LLM_RETRY_POLICY`) | `TCG-G05` closed 2026-02-21: run-attempt envelope contract fields (`attempts`, `delayReason`, `terminalOutcome`) are now typed and persisted on turns. | `TCG-007` |
| `TCG-P06` | Trigger version-pinned execution bundles | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` (`logAgentAction` call includes `modelResolution`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` (`upsertSessionRoutingPin`) | `TCG-G06` closed 2026-02-21: canonical execution bundle snapshot contract (model/provider/auth + prompt/tool hashes) is pinned per turn/run. | `TCG-008` |
| `TCG-P07` | Trigger operator lifecycle traces | `/Users/foundbrand_001/Development/vc83-com/convex/terminal/terminalFeed.ts` (`getTerminalFeed`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` (`ControlCenterTimelineEvent`, `getControlCenterThreadRows`, `getControlCenterThreadDrillDown`); `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-trust-cockpit.tsx` (operator timeline surface) | `TCG-G07` closed 2026-02-21: timeline evidence now unifies ingress/routing/execution/delivery checkpoints with deterministic ordinals and shared trace context. | `TCG-009` |
| `TCG-P08` | Common Ground lineage graph in collaboration threads | `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts` (`collaborationKernelContractValidator`, `assertCollaborationKernelContract`); `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts` (`agentSessions.collaboration.kernel`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` (`upsertSessionCollaborationContract`, fail-closed `assertPersistedSessionCollaborationContract`) | `TCG-G08` closed 2026-02-21: typed `group_thread`/`dm_thread` + shared lineage IDs are enforced and orphan DM contracts are rejected. | `TCG-014` |
| `TCG-P09` | Common Ground kernel authority constraints | `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts` (`collaborationAuthorityContractValidator`, `assertCollaborationAuthorityContract`, `assertCollaborationRuntimeContract`); `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts` (`agentSessions.collaboration.authority`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` (`upsertSessionCollaborationContract`) | `TCG-G09` closed 2026-02-21: explicit `proposal` vs `commit` authority is typed and mutating commits fail closed unless authority role is orchestrator. | `TCG-014` |
| `TCG-P10` | Trigger concurrency + idempotency applied to multi-thread collaboration | `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts` (`agentInboxReceipts` org idempotency scope); `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts` (`agentTurns.by_org_idempotency_key`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` (`buildSessionRoutingKey`) | `TCG-G10` closed 2026-02-21: collaboration runtime now derives lineage-aware `tenant + lineage + thread + workflow` keys with deterministic proposal/commit replay and commit-in-progress labels. | `TCG-015` |
| `TCG-P11` | Trigger-style correlated traces + Common Ground lineage identity | `/Users/foundbrand_001/Development/vc83-com/convex/ai/trustEvents.ts` (`TRUST_EVENT_TAXONOMY_VERSION`, `TRUST_LIFECYCLE_EVENT_NAMES`, `trustEventNameValidator`); `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentSessions.ts` (`ControlCenterTimelineEvent` includes `threadId`, `trustEventId`, `metadata`); `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/agent-trust-cockpit.tsx` | `TCG-G11` closed 2026-02-21: collaboration timeline entries now require shared `lineageId` + `correlationId` metadata and stable event ordinals across group/DM/handoff/proposal/commit traces. | `TCG-016` |
| `TCG-P12` | Common Ground async checkpoint semantics for DM-to-group sync | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` (escalation wait/resume flow and checkpoint writes); `/Users/foundbrand_001/Development/vc83-com/convex/schemas/agentSessionSchemas.ts` (`lifecycleCheckpoint`, `escalationState`) | `TCG-G12` closed 2026-02-21: typed DM-to-group sync checkpoint token contract now enforces deterministic `blocked_sync_checkpoint` outcomes on missing/expired/mismatched tokens. | `TCG-017` |

---

## TCG-011 migration/backfill + rollback contract

### Top 3 rollout/rollback regression risks before `TCG-011`

1. enabling broad rollout before contract-version audits complete could create replay divergence across pre/post-contract turns,
2. backfill jobs that overwrite explicit contract versions could erase forensic evidence needed for deterministic incident analysis,
3. rollback without release-gate evidence alignment could disable controls while critical runtime metrics are still unresolved.

### Migration/backfill contract

1. Rollout progression is strictly flag-gated: `off -> canary -> on`.
2. Backfill is additive-only and patches only missing contract metadata (`tcg_turn_queue_v1`, `tcg_idempotency_v1`, `tcg_run_attempt_v1`, `tcg_execution_bundle_v1`, `tcg_collaboration_v1`).
3. Every backfill batch records operator, timestamp, org scope, and affected lineage/thread identifiers.
4. Broad rollout is blocked unless release-gate evidence contract remains `tcg_release_gate_evidence_v1` with no critical metrics.

### Deterministic rollback triggers

1. Trigger rollback immediately when release-gate decision is `rollback`.
2. Trigger rollback when required metrics are missing for two consecutive windows (`hold` persistence breach).
3. Trigger rollback when contract metadata drift is detected in canary samples after additive backfill attempts.

### Rollback sequence

1. Disable collaboration rollout flag first, then runtime rollout flag.
2. Freeze backfill jobs and preserve incident evidence snapshots before any replay/remediation.
3. Validate checkpoint/queue conflict outcomes remain deterministic before re-entering canary.

---

## TCG-012 closeout contract

### Top 3 rollout/rollback regression risks before `TCG-012`

1. unsynchronized queue/docs artifacts could leave stale dependencies that break deterministic task promotion,
2. missing `V-DOCS` rerun evidence could allow broken references in runbooks and prompts,
3. no post-closeout cadence could delay rollback response when release metrics regress after rollout expansion.

### Closeout outputs

1. synchronized queue artifacts: `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, `SESSION_PROMPTS.md`,
2. published migration/backfill and rollback playbooks with ownership matrix and deterministic triggers,
3. attached docs verification evidence (`npm run docs:guard`) to lane `E` queue notes and milestone summary.

---

## Implementation constraints

1. no free-form string-templated contracts where typed payloads are required,
2. no default-open behavior for tenant or role resolution,
3. no schema-breaking removal of existing turn/receipt fields in first rollout,
4. no bypass of existing privileged gate controls,
5. collaboration runtime paths must fail closed when lineage/thread/correlation/authority metadata is missing.

---

## Verification baseline

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:unit`
4. `npm run test:integration`
5. `npm run docs:guard`

---

## Deliverables

1. deterministic runtime contract updates,
2. collaboration runtime implementation plan:
   `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/trigger-common-ground-agentic-convergence/COLLABORATION_TEAM_RUNTIME_IMPLEMENTATION_PLAN.md`,
3. migration/backfill and rollback guide,
4. operator evidence checklist for rollout approval.
