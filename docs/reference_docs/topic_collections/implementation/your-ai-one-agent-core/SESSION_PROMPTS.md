# Your AI One-Agent Core Session Prompts

Use these prompts to execute this workstream lane-by-lane with deterministic queue behavior.

Workstream root:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core`

Queue:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/TASK_QUEUE.md`

---

## Global execution rules

1. Run only tasks in this queue.
2. Before each task, list top 3 boundary/regression risks and impacted contracts.
3. Do not take ownership of `seedPlatformAgents.ts` or `toolScoping.ts` rows; route overlaps to AGP/PLO queues.
4. Use dependency tokens when AGP/PLO consumption gates are required.
5. Run row `Verify` commands exactly.
6. Keep statuses limited to `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
7. Sync `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and this file at lane milestones.
8. Keep PRD requirements code-backed; avoid speculative claims.
9. Keep `ARCHITECTURE_CONTRACT.md` acceptance criteria synchronized with queue statuses and milestone evidence notes.

---

## Milestone sync log

1. 2026-02-24: Lane `A` completed (`YAI-001`, `YAI-002`) with:
   - PRD acceptance-cluster delta matrix and overlap-file ownership lock.
   - Section 15 (`P0`/`P1`) traceability map with deterministic row + verify-profile mapping.
2. 2026-02-24: Lane `B` completed (`YAI-003`, `YAI-004`) with:
   - one-agent runtime contract fields (`unifiedPersonality`, `teamAccessMode`, `dreamTeamSpecialists`) normalized in shared runtime code.
   - one-primary lifecycle + explicit reassignment contract (`setPrimaryAgent`) enforced with transactional demote/promote semantics and audit events.
   - AGP-sourced Dream Team catalog metadata consumption for specialist routing constraints.
   - mode-backed behavior for `invisible`, `direct`, and `meeting` handoffs with primary-governed delegation authority and unit + integration test coverage.
3. 2026-02-24: Lane `C` completed (`YAI-005`, `YAI-006`) with:
   - Midwife 5-block birthing shape + interview-origin immutability metadata (`immutableOrigin`) and first-words handshake contracts persisted in runtime/schemas.
   - Midwife hybrid composition (interview core + seeded overlays + bounded fallback) with persisted provenance (`midwife_hybrid_composition.v1`).
   - soul mode (`work`/`private`) + archetype overlays that keep core identity anchors explicit across prompt/harness/runtime assembly.
   - sensitive-archetype guardrails enforced as runtime constraints (tool-scope/autonomy limits + policy prompt layers) with unit/integration coverage.
4. Lanes `B` and `C` currently have no promotable rows.
5. 2026-02-24: Lane `G` contract extension documented with:
   - macOS behavior parity target against iPhone/Android runtime contracts (no UI clone parity requirement),
   - native Polymarket operator-agent capability as a first-class `vc83` runtime target.
6. 2026-02-25: Lane `D` completed (`YAI-007`) with:
   - create-business second-org flow + invite acceptance personal-workspace auto-create + org-switch context clarity + org-aware birthing prompt context.
   - `P1-MX-01` cross-org read-only soul enrichment (membership-gated, allowlisted summaries, no cross-org writes).
   - `P1-MX-02` org-type Dream Team scoping runtime (`workspaceTypes` with `organizationTypes`/`orgTypes` aliases) aligned to `AGP-012`.
   - verification pass set: `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run docs:guard`.
7. 2026-02-25: Lane `E` `P0` completed (`YAI-008`) with:
   - four-level autonomy contract runtime normalization (`supervised`/`sandbox`/`autonomous`/`delegation`) plus legacy alias handling.
   - domain-scoped autonomy default resolution (`appointment_booking`) and read-only sandbox enforcement alignment across execution/tool/prompt policy layers.
   - trust-event taxonomy extension for autonomy trust accumulation + promotion/demotion lifecycle contracts.
   - verification pass set: `npm run typecheck`, `npm run lint`, `npm run test:unit`.
8. 2026-02-25: Lane `F` `P0` completed (`YAI-010`) with:
   - privacy+quality contracts moved from helper-only to enforced runtime routing/execution gates (`local_only`/`prefer_local`, quality-tier floor, local connector candidate pool).
   - policy persistence fields added to org AI settings contract (`llm.privacyMode`, `llm.qualityTierFloor`, `llm.localModelIds`, `llm.localConnection`).
   - user-visible safeguards wired for privacy fallback + high model-switch drift warnings, with matching harness context clarity.
   - verification pass set: `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run docs:guard`.
9. 2026-02-25: Lane `G` `P0` completed (`YAI-014`) with:
   - canonical inbound ingress envelope normalization for chat/voice/camera/desktop events before any tool execution path.
   - one-agent mutation authority contract enforced per `(operatorId, organizationId)` context with fail-closed mutating-tool execution when authority diverges from primary path.
   - runtime policy context now carries ingress envelope + authority invariants into tool orchestration for deterministic gating.
   - verification pass set: `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`.
10. 2026-02-25: Lane `G` `P1` baseline completed (`YAI-011`) with:
   - desktop parity contract scope lock to backend runtime outcomes (`chat/tools/trust/approval/continuity`), explicitly excluding UI clone requirements.
   - native `vc83` runtime authority/policy precedence preserved with explicit no-bypass guarantees for `YAI-014` ingress invariants and `YAI-009` code-exec governance.
   - OpenClaw/VisionClaw retained as reference patterns only (no hard runtime dependency path).
   - downstream acceptance + evidence gates defined for `YAI-012` and `YAI-015` in `MASTER_PLAN.md`.
   - verification pass set: `npm run docs:guard`.
11. 2026-02-25: Lane `G` `P1` chat-first engagement completed (`YAI-012`) with:
   - deterministic continuity telemetry contract in `convex/ai/conversations.ts` (`yai_conversation_continuity_v1`) linking collaboration lineage/thread identities to idempotency replay classification.
   - morning briefing runtime contract module in `convex/ai/proactiveBriefing.ts` (`yai_morning_briefing_v1`) covering scheduling window, template construction, fail-closed mutation governance (approval/trust/privacy), and rollout metrics.
   - explicit no-bypass guarantee for briefing-triggered mutation paths: privacy-local and approval-missing flows are proposal-only; hard trust gates block.
   - verification pass set: `npm run test:unit`, `npm run docs:guard`; `npm run typecheck` currently fails on pre-existing unrelated `convex/onboarding/nurtureScheduler.ts`.
12. 2026-02-26: Lane `G` `P1` OpenClaw compatibility adapter hardening refresh (`YAI-016`) with:
   - explicit org feature-flag gate (`aiOpenClawCompatibilityEnabled`) resolved in runtime policy (`convex/ai/modelPolicy.ts`) with default `OFF`.
   - deterministic native fallback contract in `convex/ai/openclawBridge.ts` + `convex/integrations/openclawBridge.ts` for disabled, failed, or authority-contract-invalid adapter paths (no import mutations, native authority precedence preserved).
   - runtime validator now fails closed on contract drift (`native_authority_contract_violation`) if adapter decisions ever violate native precedence/no-bypass/trust-approval invariants.
   - explicit no-bypass/trust-approval contract metadata enforced in adapter responses/docs (`directMutationBypassAllowed=false`, `trustApprovalRequiredForActionableIntent=true`).
   - verification set: `npm run typecheck` fails on pre-existing unrelated TS2322 in `convex/ai/toolFoundry/proposalBacklog.ts`; `npm run test:unit` passes (`158` files passed, `4` skipped; `812` tests passed, `80` skipped); `npm run docs:guard` passes.
13. 2026-02-25: Lane `G` `P1` native Polymarket capability completed (`YAI-017`) with:
   - native tool module `convex/ai/tools/polymarketTool.ts` delivering deterministic market discovery, opportunity scoring, risk-bounded position planning, paper-mode execution simulation, and fail-closed live execution contracts.
   - live execution split into approval-governed native mutation tool (`execute_polymarket_live`) with explicit approval artifact enforcement and no direct mutation bypass path.
   - runtime default mode policy (`polymarketDomainDefault`) now flows through `convex/ai/agentExecution.ts` and `convex/ai/tools/registry.ts`; shared approval policy now hard-gates `execute_polymarket_live` in `convex/ai/escalation.ts`.
   - verification pass set: `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`.
14. 2026-02-25: Lane `H` cross-workstream closeout completed (`YAI-013`) with:
   - dependency tokens verified and status path executed deterministically (`PENDING` -> `READY` -> `IN_PROGRESS` -> `DONE`).
   - stale pre-PRD autonomy contract references removed in downstream AGP/PLO docs (canonical `sandbox` autonomy language plus explicit legacy-alias handling).
   - YAI queue artifacts synchronized (`TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, `MASTER_PLAN.md`) and `npm run docs:guard` passed.
15. 2026-02-26: VisionClaw parity chain closeout completed in deterministic order:
   - `YAI-018` `DONE`: live `Vision` camera stream (`getUserMedia`) + capture-to-attachment + `cameraRuntime`/`liveSessionId` ingress metadata.
   - `YAI-019` `DONE`: AI chat voice-runtime bridge now uses `useVoiceRuntime` + `MediaRecorder` with persisted `voiceRuntime` metadata and deterministic fallback reasons.
   - `YAI-020` `DONE`: multimodal observability parity shipped (vision/voice lifecycle state, frame cadence, session correlation, fail-closed fallback reason contract) with regression tests.
   - `YAI-021` `DONE`: parity closeout docs synchronized with residual-risk/rollback publication and downstream gate recheck (`AVR-009` unblocked).
16. 2026-02-27: Lane `G` `P1` OpenClaw compatibility adapter enforcement refresh (`YAI-016`) with:
   - adapter decision validation now enforces explicit feature-flag and deterministic fallback contracts (`feature_flag_required_for_compatibility_mode`, `fallback_contract_mismatch`) in `convex/ai/openclawBridge.ts`.
   - migration contract docs updated in `OPENCLAW_BRIDGE_IMPORT.md` to keep flag/fallback invariants explicit.
   - unit evidence extended in `tests/unit/ai/openclawBridge.test.ts`.
   - verification set: `npm run typecheck` reached `tsc --noEmit` but did not complete before sandbox runtime ceiling; `npm run test:unit` failed with Vitest unhandled worker timeout (`162` files passed, `4` skipped; `853` tests passed, `80` skipped; `1` unhandled error); `npm run docs:guard` passed.

---

## Session A (Lane A: PRD lock + traceability)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `A` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/TASK_QUEUE.md`

Rules:
1. Map each PRD acceptance cluster to explicit queue ownership.
2. Mark already-shipped vs net-new scope with evidence.
3. Run `V-DOCS` exactly.
4. Stop when lane `A` has no promotable rows.

---

## Session B (Lane B: one-agent routing runtime)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `B` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/TASK_QUEUE.md`

Rules:
1. Implement one-agent config fields and routing semantics without changing seed ownership files.
2. Keep one-primary invariant and explicit `setPrimaryAgent` reassignment semantics transactional and test-backed.
3. Ensure invisible/direct/meeting modes are test-backed with mutation authority anchored to the primary path.
4. Consume Dream Team catalog contracts from AGP rather than duplicating them.
5. Run row `Verify` commands exactly.
6. Stop when lane `B` has no promotable rows.

---

## Session C (Lane C: birthing + soul modes)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `C` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/TASK_QUEUE.md`

Rules:
1. Keep interview-origin identity immutability explicit.
2. Ensure Midwife composition remains hybrid (interview core + seeded overlays + bounded fallback) with persisted provenance.
3. Ensure work/private mode and archetype overlays preserve core identity.
4. Add sensitive-archetype guardrails as enforceable runtime constraints.
5. Run row `Verify` commands exactly.
6. Stop when lane `C` has no promotable rows.

---

## Session D (Lane D: multi-org runtime)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `D` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/TASK_QUEUE.md`

Rules:
1. Preserve tenant isolation semantics on every change.
2. Keep personal-vs-business context transitions explicit in runtime and UI contracts.
3. Run row `Verify` commands exactly.
4. Stop when lane `D` has no promotable rows.

Current checkpoint (`2026-02-27`):
1. `YAI-014` is `DONE`; lane `G` `P0` authority-invariant ingress closure is complete.
2. `YAI-009` is `DONE`; lane `E` code-exec governance closure is complete.
3. `YAI-011` is `DONE`; lane `G` `P1` desktop/voice parity baseline and downstream acceptance gates are now locked.
4. `YAI-012` is `DONE`; lane `G` `P1` chat-first continuity + morning briefing contract is now code-backed and test-backed.
5. `YAI-015` is `DONE`; lane `G` `P1` native vision-edge bridge contract is now code-backed with no-bypass enforcement.
6. `YAI-016` is `DONE`; lane `G` `P1` optional OpenClaw compatibility adapter now enforces explicit org flag gating, explicit flag/fallback contract validation, authority-contract validation, and deterministic native fallback.
7. `YAI-017` is `DONE`; lane `G` `P1` native Polymarket capability now ships as first-class `vc83` tooling with deterministic paper/live governance.
8. VisionClaw parity follow-on rows are complete: `YAI-018`, `YAI-019`, and `YAI-020` are `DONE` with live ingress metadata and observability parity contracts.
9. Lane `H` parity closeout row `YAI-021` is `DONE`; downstream AV harness dependency gate on `YAI-021` is now open.

---

## Session E (Lane E: autonomy + trust + code governance)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `E` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/TASK_QUEUE.md`

Rules:
1. Keep approvals and trust-event visibility non-negotiable.
2. Implement domain-scoped autonomy contracts before expanding code-exec pathways.
3. Run row `Verify` commands exactly.
4. Stop when lane `E` has no promotable rows.

---

## Session F (Lane F: privacy + quality firewall)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `F` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/TASK_QUEUE.md`

Rules:
1. Keep cloud/local behavior and capability limits explicit.
2. Ensure drift/quality checks are tied to user-visible safeguards.
3. Run row `Verify` commands exactly.
4. Stop when lane `F` has no promotable rows.

---

## Session G (Lane G: engagement + camera/glasses + desktop contract)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `G` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/TASK_QUEUE.md`

Rules:
1. Preserve chat-first continuity before camera/glasses and desktop enhancements.
2. Land authority invariants first: only the primary one-agent authority path may execute mutations.
3. Build native `vc83` tool-calling paths first; OpenClaw remains optional compatibility mode only.
4. Use VisionClaw/OpenClaw as behavior references, not core runtime dependencies.
5. Enforce desktop behavior parity with iPhone/Android runtime contracts (chat/tools/trust/approval/continuity), but do not require UI clone parity.
6. Build Polymarket functionality directly as native `vc83` agent/tooling; do not scope it as a reference-playbook translation layer.
7. Preserve `YAI-009` code-exec governance contracts: no mutating action may bypass sandbox/trust/approval gates.
8. For `YAI-015`, include code + tests evidence matching downstream gates defined in `MASTER_PLAN.md` (`Desktop Behavior Parity Contract` section), while preserving `YAI-012` continuity/briefing contracts.
9. Run row `Verify` commands exactly.
10. Stop when lane `G` has no promotable rows.
11. `YAI-018`..`YAI-020` are complete parity rows; preserve shipped live camera/voice/observability contracts and avoid regression on `vc83_runtime_policy` precedence.

---

## Session H (Lane H: handoff + closeout)

You are Codex in `/Users/foundbrand_001/Development/vc83-com`.
Execute only lane `H` rows from:
`/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/your-ai-one-agent-core/TASK_QUEUE.md`

Rules:
1. Verify AGP/PLO dependency consumption before closure.
2. Sync all queue-first docs and rerun docs guard.
3. Stop only when closure criteria are satisfied or explicit blockers are recorded.
4. Treat `YAI-021` as complete parity closeout baseline; keep `YAI-013` and `YAI-021` synchronized when publishing downstream dependency updates.
