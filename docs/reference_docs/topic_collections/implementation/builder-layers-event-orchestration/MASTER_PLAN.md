# Builder/Layers Orchestration Core + Event Playbook Master Plan

**Date:** 2026-02-19  
**Scope:** Replace legacy event templates and manual form-injection setup with a reusable orchestration core that can launch complete experiences from one conversation. Event is playbook #1.

---

## Mission

Ship a deterministic flow where a user can state a goal once and the platform can:

1. gather missing intent in one guided conversation,
2. run a reusable orchestration core with a selected playbook,
3. generate and link canonical artifacts (domain objects, checkout, web app, publishing),
4. gate publishing and payment-impacting changes behind explicit checkpoints,
5. leave behind reusable user/org-specialized agents that can improve safely over time.

---

## Feasibility verdict

**Verdict: YES (high confidence).**  
Core primitives already exist; the main missing pieces are orchestration glue, contract cleanup, and registry/scoping enablement.

| Area | Existing capability | Gap to close |
|---|---|---|
| Domain object creation | `create_event`, `create_form`, `create_product`, `create_checkout_page` already map to ontology objects | Need a shared orchestration-core contract and playbook adapter interface |
| Builder generation + deploy | `create_webapp`, `deploy_webapp`, and connection tools exist | Not currently exposed in `TOOL_REGISTRY`/profiles |
| Layers automation | `create_layers_workflow` + `link_objects` tools exist | Not currently wired into main tool registry |
| Platform agent seeding | `seedPlatformAgents` supports protected template agents + worker spawning | Only Quinn/system onboarding template is seeded today |
| Clone pattern | Template-agent + `templateAgentId` worker model and worker pool are implemented | Not generalized for customer use-case clones |
| Learning loop | Soul generator/evolution + approval-gated proposals are implemented | No explicit Soul v2 overlay for role-based orchestration performance |

---

## Baseline findings (OCO-001)

1. Builder/connection/layers tools exist (`convex/ai/tools/builderTools.ts`, `convex/ai/tools/connectionTools.ts`, `convex/ai/tools/layersWorkflowTool.ts`) but are not registered in `convex/ai/tools/registry.ts`.
2. `internalPublishCheckout` validates `checkout.type === "checkout"` even though current checkout objects are `checkout_instance` (`convex/ai/tools/internalToolMutations.ts`).
3. Legacy internal event paths still use `status: "active"` while core event ontology uses `draft/published/in_progress/completed/cancelled`; this creates drift risk.
4. Builder auto-connection currently cannot auto-create `checkout`, `ticket`, and `booking` records (`convex/ai/tools/connectionToolActions.ts`).
5. Legacy `create_page/publish_page` remains in primary orchestration despite richer builder + published-page architecture.
6. Current topology is optimized for event-like tasks, but the system can support reusable orchestration if core runtime and playbook layers are separated.

---

## OCO-002 contract lock (completed)

1. Added canonical orchestration contract module at `convex/orchestrationContract.ts`.
2. Locked shared vocabulary for:
   - experience contract (`ORCHESTRATION_EXPERIENCE_CONTRACT`),
   - playbook interface (`OrchestrationPlaybookContract`),
   - artifact graph (`OrchestrationArtifactGraph`),
   - primary lifecycle statuses (`draft`/`published`) with centralized legacy alias handling.
3. Applied centralized status normalization in:
   - `convex/eventOntology.ts`,
   - `convex/checkoutOntology.ts`,
   - `convex/publishingOntology.ts`,
   - `convex/ai/tools/internalToolMutations.ts`.

---

## OCO-003 registry + scoping alignment (completed)

1. Registered orchestration tools in the primary AI tool registry:
   - `create_webapp`, `deploy_webapp`, `check_deploy_status`,
   - `detect_webapp_connections`, `connect_webapp_data`,
   - `create_layers_workflow`, `link_objects`.
2. Updated scoping profiles and guardrails in `convex/ai/toolScoping.ts`:
   - added orchestration tools to the `general` profile,
   - added read-only entries for `check_deploy_status` and `detect_webapp_connections`,
   - added SMS channel restrictions for write-heavy builder/layers orchestration tools.
3. Updated harness guidance in `convex/ai/harness.ts` for layers + object-link orchestration sequencing.

---

## OCO-005 legacy publish/status contract cleanup (completed)

1. Fixed legacy checkout publish type guard in `convex/ai/tools/internalToolMutations.ts` to require `checkout_instance`.
2. Normalized legacy event status handling to canonical lifecycle values (`published` instead of legacy `active`) in:
   - `convex/ai/tools/internalToolMutations.ts`,
   - `convex/eventOntology.ts`.
3. Aligned checkout publish stamping semantics in `convex/checkoutOntology.ts` so status-only publish transitions consistently stamp `customProperties.publishedAt`.
4. Updated `publish_all` event batch semantics in `convex/ai/tools/registry.ts` to publish events via canonical status.
5. Added regression coverage in `tests/unit/ai/publishFlowStatusTransitions.test.ts` for:
   - checkout publish type-guard behavior,
   - event status normalization,
   - batch publish status payloads.

---

## OCO-006 orchestration runtime core (completed)

1. Added reusable runtime action `createExperience` in `convex/ai/tools/orchestrationRuntimeActions.ts`.
2. Exposed runtime entry tool `create_experience` in `convex/ai/tools/orchestrationTools.ts` and registered it in `convex/ai/tools/registry.ts`.
3. Added idempotent artifact replay helpers in `convex/ai/tools/internalToolMutations.ts`:
   - `internalFindOrchestrationArtifact` (signature/name lookup),
   - `internalStampOrchestrationMetadata` (append-only signature metadata stamping).
4. Locked deterministic runtime step semantics:
   - each step emits `status`, `attempts`, `retryable`, `retryStrategy`, and duplicate-resolution mode,
   - same idempotency key safely replays without duplicating artifacts,
   - name collisions can reuse existing artifacts or fail explicitly via duplicate strategy.

---

## OCO-007 event playbook adapter v1 (completed)

1. Added event playbook input adapter `deriveEventPlaybookInput` in `convex/ai/tools/orchestrationPlaybooks.ts`.
2. Added playbook-scoped convenience tool `create_event_experience` in `convex/ai/tools/orchestrationTools.ts`.
3. Added shared unsupported-type safety module `convex/ai/tools/connectionTypeSupport.ts` and wired it into `convex/ai/tools/connectionToolActions.ts`.
4. Preserved safe failure behavior for unsupported detected types:
   - unsupported items are recorded as explicit skipped/manual-follow-up steps,
   - runtime does not crash the full orchestration because of unsupported auxiliary detections.
5. Extended event signal detection in:
   - `src/lib/builder/v0-file-analyzer.ts`,
   - `convex/lib/connectionDetector.ts`,
   so event playbook inputs can be inferred from builder artifacts when present.

---

## OCO-008 platform specialist template seeding (completed)

1. Extended `convex/onboarding/seedPlatformAgents.ts` to seed five protected specialist templates in addition to Quinn:
   - runtime planner,
   - data-link specialist,
   - publishing operator,
   - event architect,
   - event form/checkout specialist.
2. Added template metadata (`templateRole`, `templateLayer`, `templatePlaybook`, `templateScope`) and default clone policy contracts so specialist templates are deterministic clone sources.
3. Kept Quinn as explicit onboarding template (`templateRole=platform_system_bot_template`) and preserved protected template semantics.
4. Updated template selection surfaces so onboarding runtime remains deterministic after adding more protected templates:
   - `convex/agentOntology.ts` now resolves onboarding template explicitly,
   - `convex/ai/workerPool.ts` onboarding worker lookup is tied to the onboarding template identity.

---

## OCO-009 managed use-case clone factory (completed)

1. Added managed clone factory mutation `convex/ai/workerPool.ts`:
   - `spawnUseCaseAgent` creates/reuses template clones with enforced lifecycle marker (`managed_use_case_clone_v1`).
2. Added public action `spawn_use_case_agent` in `convex/ai/agentExecution.ts`:
   - enforces RBAC (`manage_organization`) before spawn,
   - passes owner/requester attribution into clone factory.
3. Enforced clone controls in the worker pool mutation:
   - ownership checks (owner/requester must be active org member or super admin),
   - quotas (`maxClonesPerOrg`, `maxClonesPerTemplatePerOrg`, `maxClonesPerOwner`),
   - protected-template inheritance controls (cross-org spawning only for `templateScope=platform`),
   - audit traces via `objectActions` and `auditLogs`.
4. Added focused lane-D unit coverage:
   - `tests/unit/ai/templateAgentSelection.test.ts`,
   - `tests/unit/ai/useCaseClonePolicy.test.ts`.

---

## OCO-010 Soul v2 overlay contract (completed)

1. Introduced Soul v2 overlay projection in `convex/ai/soulEvolution.ts`:
   - `soulV2.identityAnchors` for immutable identity anchors,
   - `soulV2.executionPreferences` for mutable execution preferences.
2. Preserved backward compatibility by continuously projecting overlay fields back onto legacy `customProperties.soul` keys (`name`, `traits`, `alwaysDo`, tone fields, and core-memory fields).
3. Added Soul v2-aware proposal guards:
   - immutable identity-anchor fields are blocked from proposal mutation paths,
   - execution-preference fields remain mutable under approval-gated proposal flow.
4. Updated soul generation bootstrap in `convex/ai/soulGenerator.ts` to emit Soul v2 overlay metadata while keeping legacy shape readable.
5. Extended soul evolution schemas for forward-compatible proposal/version metadata needed by v2 approval and rollback tracking.

---

## OCO-011 controlled learning loop + approval checkpoints (completed)

1. Wired outcome telemetry into proposal generation:
   - `runSelfReflection` now consumes 7-day `agentConversationMetrics` summaries and injects telemetry context into reflection prompts.
2. Hardened explicit owner approval gating:
   - proposal apply path now requires owner-reviewed approval checkpoints before mutation application.
3. Added trust-event telemetry emission for soul lifecycle checkpoints:
   - proposal created (`trust.soul.proposal_created.v1`),
   - proposal reviewed (`trust.soul.proposal_reviewed.v1`),
   - rollback executed (`trust.soul.rollback_executed.v1`).
4. Improved tool behavior for blocked proposals:
   - `propose_soul_update` now returns explicit blocked responses instead of assuming insert success.
5. Added/updated coverage:
   - Soul v2 model/guard tests in `tests/unit/ai/soulCoreMemoryModel.test.ts`,
   - operator payload overlay assertions in `tests/unit/ai/soulProposalReviewPayload.test.ts`,
   - soul trust-event payload validation in `tests/unit/ai/trustEventTaxonomy.test.ts`.

---

## Target architecture

### 1) Orchestration core runtime (reusable)

Introduce one top-level runtime/tool (`create_experience`) that orchestrates domain-agnostic step execution:

1. resolve playbook,
2. collect/validate required intent,
3. execute idempotent artifact steps,
4. emit a deterministic artifact bundle + step log,
5. hand off to explicit publish/payment checkpoints.

### 2) Playbook interface + event playbook v1

Define a typed playbook contract with:

- intent schema,
- artifact recipe,
- dependency graph,
- publish guardrails,
- retry/idempotency behavior.

Implement `event` as playbook v1 and expose convenience alias `create_event_experience` that delegates to core runtime.

### 3) Platform agent pack (core + domain specialists)

Seed protected template agents in two layers:

- core orchestration specialists (runtime planner, data-link specialist, publishing operator),
- event playbook specialists (event architect, form/checkout specialist).

Use current template-agent semantics (`status: "template"`, `protected: true`) and clone inheritance via `templateAgentId`.

### 4) Use-case clone factory

Add spawn flow for user/org-specific clones:

- source: protected template agent,
- destination: org-scoped active clone,
- metadata: `templateAgentId`, `playbook`, `useCase`, `ownerUserId`, `spawnReason`,
- controls: ownership checks, quotas, trust-event audit trail.

### 5) Soul v2 overlay (backward-compatible)

Keep existing `customProperties.soul` baseline and add overlay semantics:

- immutable identity anchors,
- mutable execution preferences,
- outcome-linked suggestion proposals,
- explicit owner approval for applied updates.

---

## Trust and guardrails

1. No self-modifying clones outside explicit approval model.
2. Publishing and payment-impacting actions require explicit checkpoint confirmations.
3. Clone creation must be quota-limited and auditable.
4. Tool profile scoping remains layered (platform -> org -> agent -> session).
5. Playbook adapters cannot silently elevate tool permissions.
6. Keep deterministic status model and avoid cross-object enum drift.

---

## Phase-to-lane mapping

| Phase | Objective | Lane | Queue tasks |
|---|---|---|---|
| Phase 1 | Baseline + architecture lock | `A` | `OCO-001` |
| Phase 2 | Core contract + toolchain alignment | `B` | `OCO-002`..`OCO-005` |
| Phase 3 | Reusable orchestration core + event playbook | `C` | `OCO-006`..`OCO-007` |
| Phase 4 | Seeded platform specialists + clone factory | `D` | `OCO-008`..`OCO-009` |
| Phase 5 | Soul v2 learning loop | `E` | `OCO-010`..`OCO-011` |
| Phase 6 | UX integration across builder/layers/publishing | `F` | `OCO-012` |
| Phase 7 | Tests + closeout | `G` | `OCO-013`..`OCO-014` |

---

## Acceptance criteria

1. User can complete launch in one conversation with deterministic artifact outputs.
2. Core runtime is reusable through a typed playbook interface.
3. Event playbook v1 produces correctly linked event/product/ticket/form/checkout/web artifacts.
4. Builder/layers/orchestration tools are available in production tool registry and scoped profiles.
5. Legacy contract mismatches (`checkout` type check, status drift) are eliminated.
6. Platform specialist templates are seedable and can spawn user/org clones safely.
7. Soul updates remain approval-gated with immutable/mutable boundaries.
8. End-to-end smoke coverage validates conversation -> checkout -> publish flow for event playbook.
9. `npm run docs:guard` passes at closeout.

---

## Risks and mitigations

1. **Risk:** runtime becomes overfit to event shape.
Mitigation: enforce playbook interface boundaries and keep domain-specific logic in adapters.

2. **Risk:** orchestration complexity increases failure surface.
Mitigation: idempotent steps + explicit step-state tracking + deterministic retry policies.

3. **Risk:** clone sprawl creates governance issues.
Mitigation: quota limits, owner-bound spawn permissions, auto-archive strategy.

4. **Risk:** implicit publish/payment actions erode trust.
Mitigation: hard HITL checkpoints before state-changing actions.

5. **Risk:** old and new tool paths diverge.
Mitigation: make core orchestration path canonical; keep legacy paths compatibility-only.

---

## Immediate next step

Execute `OCO-012` (lane `F`) to wire one-conversation launch UX across builder/layers/web publishing now that lane `E` Soul v2 controls are complete.
