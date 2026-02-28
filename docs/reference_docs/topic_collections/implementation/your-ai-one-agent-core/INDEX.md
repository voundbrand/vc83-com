# Your AI One-Agent Core Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core`  
**Last updated:** 2026-02-27  
**Source request:** Integrate PRD v1.3 (`/Users/foundbrand_001/Development/vc83-com/docs/prd/YOUR_AI_PRD.md`) core one-agent scope without breaking existing AGP/PLO ownership boundaries.

---

## Purpose

This workstream owns core scope not covered by:

1. `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/book-agent-productization/`
2. `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/personal-life-operator-agent/`

Primary outcomes:

1. convert PRD v1.3 one-agent architecture into deterministic implementation rows,
2. keep specialist/seed ownership boundaries intact,
3. expose reusable contract gates (`YAI-*`) that AGP/PLO consume via dependency tokens,
4. codify desktop behavior parity and native Polymarket agent capability under one-agent authority.

---

## Core files

- Queue:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/TASK_QUEUE.md`
- Session prompts:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/SESSION_PROMPTS.md`
- Master plan:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/MASTER_PLAN.md`
- Architecture contract:
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/ARCHITECTURE_CONTRACT.md`
- Index (this file):
  `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/INDEX.md`

---

## Scope boundary

Owned here:

1. one-agent runtime contracts (`unifiedPersonality`, `teamAccessMode`, specialist routing behavior),
2. birthing process/runtime identity immutability,
3. soul modes/archetypes,
4. multi-org core behavior,
5. autonomy/trust scaffolding,
6. privacy mode + quality firewall,
7. chat-first continuity + camera/glasses + desktop integration planning,
8. native Polymarket agent/tool capability (market discovery, paper mode, and approval-gated live execution contracts).

Not owned here:

1. global 104-agent catalog/matrix/seed deliverables (AGP),
2. personal-operator template-specific runtime behavior and pilot execution (PLO),
3. direct ownership of `seedPlatformAgents.ts` and `toolScoping.ts` row semantics.

---

## Status snapshot

1. Lane `A` is complete (`YAI-001`, `YAI-002`) with PRD delta matrix + section 15 (`P0`/`P1`) traceability locked in `MASTER_PLAN.md`.
2. Lane `B` is complete (`YAI-003`, `YAI-004`) with one-agent contract fields (`unifiedPersonality`, `teamAccessMode`, `dreamTeamSpecialists`), one-primary lifecycle enforcement, and explicit primary reassignment (`setPrimaryAgent`) semantics landed in runtime + tests.
3. Lane `B` delegation behavior is primary-governed across `invisible`/`direct`/`meeting`: specialist speaker routing can vary, but mutating authority remains on the primary path.
4. Lane `C` is complete (`YAI-005`, `YAI-006`) with interview-origin identity immutability, first-words handshake persistence, Midwife hybrid composition provenance, work/private overlays, and enforceable sensitive-archetype guardrails.
5. `AGP` and `PLO` dependency contracts are explicitly mapped from section 15 acceptance criteria to `YAI` row gates, with AGP remaining source-of-truth for Dream Team catalog metadata.
6. Native tool-calling remains the canonical runtime path; OpenClaw remains optional compatibility mode only.
7. Lane `G` desktop scope is explicitly behavior parity with iPhone/Android runtime contracts (not UI clone parity), while preserving desktop-native affordances.
8. Lane `D` is complete (`YAI-007` `DONE`): shipped create-business second-org flow, invite acceptance personal-workspace auto-create, org-switcher workspace distinction, org-aware birthing prompt context, cross-org read-only soul enrichment, and org-type Dream Team scoping alignment with `AGP-012`.
9. Lane `E` `P0` is complete (`YAI-008` `DONE`): autonomy runtime now supports the four-level contract (`supervised`/`sandbox`/`autonomous`/`delegation`) with legacy alias normalization, domain-scoped default enforcement, and trust-accumulation promotion/demotion event contracts.
10. Lane `F` `P0` is complete (`YAI-010` `DONE`): privacy + quality firewall contracts are now runtime-enforced in model routing and execution (`local_only`/`prefer_local` policy gates, quality-tier floor checks, local connector candidate routing, and user-visible privacy/drift safeguards with harness context clarity).
11. Lane `G` `P0` is complete (`YAI-014` `DONE`): canonical ingress envelope contracts now normalize chat/voice/camera/desktop events before tool execution, and mutating tool calls fail closed unless one-agent primary authority invariants hold for `(operatorId, organizationId)` context.
12. Lane `E` `P1` is complete (`YAI-009` `DONE`): native `execute_code` tool governance is now fail-closed with bounded non-networked sandbox defaults, autonomy/approval gating, and deterministic trust telemetry for request/allow/block/outcome lifecycle events.
13. Lane `G` `P1` baseline is complete (`YAI-011` `DONE`): chat-first + desktop/voice parity contract scope is now locked to backend runtime outcomes (`chat/tools/trust/approval/continuity`) with explicit no-UI-clone scope, native `vc83` authority/policy precedence, and downstream acceptance/evidence gates for `YAI-012` and `YAI-015`.
14. Lane `G` `P1` chat-first engagement is complete (`YAI-012` `DONE`): continuity telemetry is now runtime-contracted in `convex/ai/conversations.ts` and morning briefing contracts (scheduling/template/governance/rollout metrics) are implemented in `convex/ai/proactiveBriefing.ts` with unit evidence for cross-channel continuity, idempotent replay handling, and no-bypass mutation gating.
15. Lane `G` `P1` native vision-edge bridge row is complete (`YAI-015` `DONE`): camera/voice/live ingress now normalizes into native bridge contracts before tool execution, actionable edge intents route through native `vc83` registry/trust gates, and direct device-side mutation hints fail closed under one-agent authority invariants.
16. Lane `G` `P1` OpenClaw compatibility adapter row is complete (`YAI-016` `DONE`): compatibility mode is default `OFF` and enabled only by explicit org feature flag (`aiOpenClawCompatibilityEnabled`); runtime now validates adapter decisions against explicit flag/fallback contracts (`feature_flag_required_for_compatibility_mode`, `fallback_contract_mismatch`) plus native precedence/no-bypass/trust-approval invariants, and deterministically fails closed to native fallback on disabled/failed/contract-invalid paths.
17. Lane `G` `P1` native Polymarket capability row is complete (`YAI-017` `DONE`): native `vc83` tooling now supports market discovery/opportunity scoring/position planning, deterministic paper-mode simulation, and approval-gated live execution via native tool paths only.
18. Lane `G` parity remediation is complete (`YAI-018`, `YAI-019`, `YAI-020` `DONE`): AI chat now ships live `Vision` camera streaming (`getUserMedia`), capture-to-attachment flow, runtime voice-session bridge via `useVoiceRuntime`, and deterministic ingress metadata (`cameraRuntime`, `voiceRuntime`, `liveSessionId`).
19. Lane `G` observability parity is complete (`YAI-020` `DONE`): ingress envelope now carries voice/camera lifecycle states, frame cadence, live/voice correlation IDs, and deterministic fallback reason sets while preserving `vc83_runtime_policy` precedence and fail-closed direct-mutation blocking.
20. Lane `H` parity closeout is complete (`YAI-021` `DONE`): queue artifacts are synchronized and live camera/voice residual-risk + rollback guidance is published in YAI docs.
21. Deterministic queue state: no promotable rows remain in YAI; downstream consumer gate `AVR-009` is now unblocked by `YAI-021`.

---

## Contract acceptance sync

Aligned to `ARCHITECTURE_CONTRACT.md` acceptance criteria:

1. One-primary invariant enforcement is shipped in `convex/agentOntology.ts` with coverage in `tests/unit/ai/primaryAgentInvariants.test.ts`.
2. Explicit reassignment semantics (`setPrimaryAgent`) are shipped as transactional demote/promote with audit emission in `convex/agentOntology.ts`, plus UI guard coverage in `tests/unit/agents/primaryAgentUi.test.ts`.
3. Midwife hybrid composition (interview core + seeded overlays + bounded fallback) with provenance is shipped in `convex/ai/interviewRunner.ts` + `convex/ai/midwifeCatalogComposer.ts`, with coverage in `tests/unit/ai/midwifeCatalogComposer.test.ts`.
4. Default single-voice UX with primary-governed specialist delegation is shipped in `convex/ai/teamHarness.ts` + `convex/ai/agentExecution.ts`, with coverage in `tests/unit/ai/delegationAuthorityRuntime.test.ts` and `tests/unit/ai/teamAccessModeRouting.test.ts`.

---

## Lane board

- [x] Lane A: PRD reality lock + traceability (`YAI-001`..`YAI-002`)
- [x] Lane B: one-agent config + specialist routing (`YAI-003`..`YAI-004`)
- [x] Lane C: birthing + soul modes/archetypes (`YAI-005`..`YAI-006`)
- [x] Lane D: multi-org runtime (`YAI-007`)
- [x] Lane E: autonomy/trust/code governance (`YAI-008`..`YAI-009`)
- [x] Lane F: privacy + quality firewall (`YAI-010`)
- [x] Lane G: chat-first + camera/glasses + desktop integration (`YAI-011`..`YAI-020` `DONE`)
- [x] Lane H: cross-workstream closeout (`YAI-013`, `YAI-021` `DONE`)

---

## Operating commands

- Docs guard: `npm run docs:guard`
- Runtime baseline checks for implementation rows:
  `npm run typecheck && npm run lint && npm run test:unit`
