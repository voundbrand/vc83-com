# Tool Foundry Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry`  
**Last updated:** 2026-03-01

---

## Mission

Deliver a world-class Tool Foundry that enables agent-created tools without sacrificing security, trust, or deterministic operator control.

The runtime contract is:

1. unsupported requests must fail closed with explicit unblocking paths,
2. new tools must enter through deterministic staged promotion,
3. mutating authority remains approval-bound and auditable.

---

## Why this exists

Direct open-ended tool creation can maximize capability but also maximizes prompt-injection, privilege escalation, and data exfiltration risk. This workstream is the control plane that keeps self-created tooling usable in production.

---

## Canonical stage model

Stage progression is linear and irreversible per version without a rollback event:

1. `draft`
2. `staged`
3. `canary`
4. `trusted`

Guardrails:

1. No stage skipping.
2. Every stage promotion requires explicit evidence checks.
3. Capability/scope decisions are deny-by-default.

Initial machine-enforced contract lives in:

- `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolFoundry/contracts.ts`
- `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/toolFoundryContracts.test.ts`

---

## Capability and execution policy

Each tool execution request is evaluated on:

1. requested stage,
2. capability allowlist status,
3. scoped token presence,
4. sandbox enforcement,
5. human approval requirement and resolution,
6. requested operation class (`read`, `mutate`, `external_network`, `secret_access`).

Deterministic outcome classes:

1. `allow`
2. `require_approval`
3. `deny`

No ambiguous runtime states are allowed.

---

## Capability-gap path (target)

When operator intent cannot be satisfied by current internal concepts/tooling/backend contracts:

1. runtime returns deterministic `blocked` + reason + explicit unblocking steps,
2. runtime emits proposal artifact (`ToolSpec` skeleton) with provenance,
3. proposal enters foundry queue and staged promotion flow,
4. no hidden backend behavior is invented in production.

Owned by queue rows:

- `TFD-005`
- `TFD-006`

---

## CI and release gate policy

Foundry-specific changes must remain coupled to docs + tests evidence:

1. diff-aware guard script: `/Users/foundbrand_001/Development/vc83-com/scripts/ci/check-tool-foundry-guard.sh`
2. CI workflow: `/Users/foundbrand_001/Development/vc83-com/.github/workflows/tool-foundry-guard.yml`
3. required test path: `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/toolFoundryContracts.test.ts`
4. required docs workspace: `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/*`

---

## Risks and mitigations

1. Risk: stage promotion bypass via direct status writes.
   Mitigation: enforce transition logic in shared contract helpers and unit tests; log promotion trust events.
2. Risk: capability escalation through hidden argument variants.
   Mitigation: capability and token checks are explicit contract inputs with deny-by-default output.
3. Risk: runtime improvises nonexistent backend behavior.
   Mitigation: enforce `blocked + unblocking steps + proposal artifact` path before execution.
4. Risk: foundry code drifts without doc/test updates.
   Mitigation: CI guard requires companion docs/tests in same change surface.

---

## Acceptance gates

Before `TFD-010` closeout:

1. `TFD-005` `DONE` with tested capability-gap runtime behavior.
2. `TFD-007` `DONE` with trust taxonomy coverage for foundry lifecycle.
3. Pilot evidence (`TFD-009`) proves no approval bypass for mutating flows.
4. Queue/docs/prompts are synchronized and `npm run docs:guard` passes.

---

## Current quality confirmation (2026-02-27)

Validated in repo state on 2026-02-27:

1. Frontline intake kickoff helper is centralized in `/Users/foundbrand_001/Development/vc83-com/src/lib/ai/frontline-feature-intake.ts` and encodes interview-first language plus explicit-confirmation-before-`request_feature` instruction.
2. Desktop/web wiring exists across:
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/single-pane/chat-input.tsx`
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/slick-pane/slick-chat-input.tsx`
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/four-pane/chat-input-redesign.tsx`
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/three-pane/tool-execution-panel.tsx`
   - `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/four-pane/tool-execution-panel-redesign.tsx`
3. `request_feature` tool contract still carries explicit confirmation guidance in `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/registry.ts`.

Current gaps to close with low risk (status update 2026-03-01):

1. Operator-mobile parity intake entrypoint is now wired through `TFD-014` in `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/app/(tabs)/index.tsx` and `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/lib/chat/frontlineFeatureIntake.ts`.
2. Dedicated regression coverage for kickoff prompt composition and boundary CTA launch gating is now in place through `TFD-015` at `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/mobileFrontlineFeatureIntake.test.ts`.
3. `TFD-007` lifecycle trust evidence remains machine-verifiable; explicit confirmation behavior remains enforced in kickoff contract copy.

---

## Low-risk path from current state to `TFD-010`

### Phase 1: Trust lifecycle hardening (`TFD-007`, highest impact, completed 2026-02-27)

1. Implemented foundry lifecycle trust events for `proposal_created`, `promotion_requested`, `promotion_granted`, `promotion_denied`, and `execution_blocked`.
2. Included frontline boundary-intake transitions in emitted event metadata (`correlation_id`, `lineage_id`, `thread_id`, `workflow_key`, `frontline_intake_trigger`, `boundary_reason`) so lifecycle evidence is auditable.
3. Verified with `V-TYPE`, `V-UNIT-TF`, and `V-DOCS` before moving `TFD-007` to `DONE`.

### Phase 2: Evidence surface + parity gate (`TFD-008`, second highest impact, completed 2026-02-27)

1. Added operator-facing read-only evidence contract (policy checks, approval chain, test evidence, canary metrics, rollback readiness).
2. Kept operator-mobile parity behind explicit feature-flag metadata in the evidence contract (`NEXT_PUBLIC_OPERATOR_MOBILE_TOOL_FOUNDRY_EVIDENCE_VIEW_ENABLED`) with full rollout disabled.
3. Verified with `V-TYPE`, `V-LINT`, and `V-UNIT-TF`; also re-ran docs synchronization guard.

### Phase 3: Pilot then close (`TFD-009` and `TFD-010` completed 2026-02-27, third highest impact)

1. Completed two deterministic pilots (read-only gap + mutating gap) with negative controls for approval bypass and capability escalation.
2. Completed parity validation when mobile flag is enabled to confirm no contract drift across surfaces.
3. Published closeout recommendation, residual risks, parity go/no-go decision, and rollback plan in synchronized queue artifacts.

---

## Execution notes (current run)

### `TFD-001` risk check

1. Regression risk: queue schema drift from deterministic contract causes non-reproducible lane execution.
2. Regression risk: foundry scope overlaps existing core ownership boundaries and creates conflicting authority.
3. Regression risk: docs-only setup without verify profiles weakens CI discipline.

### `TFD-002` / `TFD-003` risk check

1. Regression risk: permissive stage transitions allow direct draft -> trusted promotion.
2. Regression risk: execution authorization returns implicit allow in missing-evidence conditions.
3. Regression risk: policy helpers depend on side effects, making tests flaky.

### `TFD-004` risk check

1. Regression risk: foundry code can merge without tests or docs evidence.
2. Regression risk: guard script breaks local mode (no base SHA) and blocks normal iteration.
3. Regression risk: workflow scope is too broad or too narrow, producing false positives/negatives.

### `TFD-005` risk check

1. Regression risk: unknown tool requests silently degrade into generic errors, hiding capability gaps.
2. Regression risk: runtime invents unsupported backend behavior instead of failing closed.
3. Regression risk: mutating authority and approval gates are bypassed by ad-hoc fallback logic.

Execution outcomes recorded in this run:

1. `npm run typecheck` passed.
2. `npm run test:unit:tool-foundry` passed (`13` tests).
3. `npx vitest run tests/unit/ai/executionRuntimeContracts.test.ts` passed (`7` tests).
4. `npm run tool-foundry:guard` passed.
5. `npm run docs:guard` passed.

### `TFD-006` risk check

1. Regression risk: runtime emits proposal metadata but does not persist deterministic backlog rows (trace/audit blind spot).
2. Regression risk: repeated capability-gap events create duplicate rows instead of deterministic upserts.
3. Regression risk: rollback semantics are omitted or overwritten, weakening revert readiness guarantees.

Execution outcomes recorded for `TFD-006` in this run:

1. Added deterministic Tool Foundry backlog upsert mutation in `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolFoundry/proposalBacklog.ts` and wired runtime persistence from `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`.
2. Added schema table `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts` and registered it in `/Users/foundbrand_001/Development/vc83-com/convex/schema.ts`.
3. `npm run test:unit:tool-foundry` passed (`16` tests).
4. `npx vitest run tests/unit/ai/toolFoundryContracts.test.ts -t "tool foundry proposal backlog persistence contracts"` passed (`3` tests, `13` skipped).
5. `npm run docs:guard` passed.
6. `npm run typecheck` passed.
7. `TFD-006` moved to `DONE` after verify gates passed.

### `TFD-007` risk check

1. Regression risk: foundry lifecycle events remain loosely correlated, making proposal/promotion traces hard to audit.
2. Regression risk: frontline boundary-intake transitions are not machine-visible in trust telemetry.
3. Regression risk: execution-blocked and proposal lifecycle events drift in required payload contract fields.

Execution outcomes recorded for `TFD-007` in this run:

1. Tightened Tool Foundry trust-event taxonomy contract in `/Users/foundbrand_001/Development/vc83-com/convex/ai/trustEvents.ts` and `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts` with required fields: `correlation_id`, `lineage_id`, `thread_id`, `workflow_key`, `frontline_intake_trigger`, `boundary_reason`.
2. Wired deterministic payload emissions in `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` and `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolFoundry/proposalBacklog.ts` so `execution_blocked` and proposal/promotion lifecycle events share the same trace and boundary evidence contract.
3. Updated taxonomy coverage in `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/trustEventTaxonomy.test.ts`.
4. `npm run typecheck` passed.
5. `npm run test:unit:tool-foundry` passed (`16` tests).
6. `npx vitest run tests/unit/ai/trustEventTaxonomy.test.ts` passed (`16` tests).
7. `npm run docs:guard` passed.
8. `TFD-007` moved to `DONE`.

### `TFD-008` risk check

1. Regression risk: evidence view marks promotion-ready when policy or lifecycle trace data is incomplete.
2. Regression risk: approval/canary/rollback sections drift from deterministic promotion requirements.
3. Regression risk: operator-mobile parity escapes feature-flag gate and creates cross-surface contract drift.

Execution outcomes recorded for `TFD-008` in this run:

1. Added read-only Tool Foundry evidence contract in `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/tool-foundry-evidence-contract.ts` with deterministic sections for policy checks, test evidence, approval chain, canary metrics, and rollback readiness.
2. Added coverage in `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/toolFoundryContracts.test.ts` for fail-closed behavior, complete-pass behavior, and explicit operator-mobile feature-flag gating.
3. `npm run typecheck` passed.
4. `npm run lint` passed (0 errors; existing repo warnings only).
5. `npm run test:unit:tool-foundry` passed (`19` tests).
6. `npm run docs:guard` passed.
7. `TFD-008` moved to `DONE`.

### `TFD-009` risk check

1. Regression risk: read-only pilot path fails to prove deterministic blocked-to-promotion flow.
2. Regression risk: mutating pilot path misses approval-bypass or capability-escalation negative controls.
3. Regression risk: desktop/mobile evidence contracts diverge when mobile parity flag is enabled.

Execution outcomes recorded for `TFD-009` in this run:

1. Added pilot coverage in `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/toolFoundryContracts.test.ts` for one read-only capability-gap scenario and one mutating capability-gap scenario, validating deterministic `blocked`/proposal/promotion behavior.
2. Added explicit negative controls in the mutating pilot for capability escalation (`capability_not_allowlisted`) and approval bypass (`mutation_approval_required_before_trusted`).
3. Added parity validation to assert desktop and feature-flag-enabled mobile evidence contracts remain aligned on stage transition, section checks, and overall status.
4. `npm run typecheck` passed.
5. `npm run test:unit:tool-foundry` passed (`22` tests).
6. `npm run docs:guard` passed.
7. `TFD-009` moved to `DONE`.

### `TFD-010` risk check

1. Regression risk: closeout recommendation overstates readiness and ignores known mobile/intake test gaps.
2. Regression risk: parity decision is ambiguous, allowing accidental full mobile rollout.
3. Regression risk: rollback procedure lacks deterministic triggers and ordered execution steps.

Execution outcomes recorded for `TFD-010` in this run:

1. Published rollout recommendation: proceed with controlled desktop/web Tool Foundry rollout under existing trust gates (`blocked` capability-gap enforcement, stage promotion evidence, approval-bound mutating execution).
2. Published residual risk register: operator-mobile intake entrypoint is still absent and dedicated frontline kickoff parity regression coverage is still missing.
3. Published explicit parity decision: full operator-mobile Tool Foundry rollout is `NO-GO`; feature-flagged contract parity validation remains `GO` only.

### Residual risk follow-up (2026-03-01)

1. Caller adoption path risk addressed:
   - Added canonical session-authenticated mutation for promotion decisions: `submitProposalPromotionDecision` in `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolFoundry/proposalBacklog.ts`.
   - This gives UI/integration callers an immediate hardened entrypoint without internal mutation coupling.
2. `actorUserId` omission risk addressed:
   - Internal mutation `resolveProposalPromotionDecision` now requires `actorUserId` in args contract.
   - Fail-closed super-admin enforcement remains mandatory.
3. Immutable-core governance drift risk addressed:
   - Added deterministic guard test in `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/toolFoundryGovernance.test.ts` ensuring `CRITICAL_TOOL_NAMES` stay covered by immutable `CORE_TOOL_CLASS_ALLOWLIST`.
4. Published rollback path: freeze promotions into `canary` and `trusted`; force mutating execution routes to `require_approval`; set `NEXT_PUBLIC_OPERATOR_MOBILE_TOOL_FOUNDRY_EVIDENCE_VIEW_ENABLED=false`; apply proposal rollback plans using backlog trace keys and rollback keys.
5. `npm run docs:guard` passed.
6. `TFD-010` moved to `DONE`.

### Operator-mobile parity residual closeout (2026-03-01)

1. Boundary-intake entrypoint risk addressed (`TFD-014`):
   - Added operator-mobile boundary CTA launch path in `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/app/(tabs)/index.tsx`.
   - CTA emits interview-first Tool Foundry kickoff payloads from `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/lib/chat/frontlineFeatureIntake.ts`.
   - Added scoped send-path bypass for command-gate checks only for this intake CTA so policy-blocked runtime states can still collect requirements.
2. Kickoff/CTA regression risk addressed (`TFD-015`):
   - Added deterministic unit coverage in `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/mobileFrontlineFeatureIntake.test.ts`.
   - Coverage verifies kickoff contract strings, explicit-confirmation requirement before `request_feature`, CTA visibility gating, and tool-failure launch payload derivation.
3. Verification for this closeout:
   - `npm run typecheck` passed.
   - `cd apps/operator-mobile && npm run typecheck` passed.
   - `npx vitest run tests/unit/ai/mobileFrontlineFeatureIntake.test.ts tests/unit/ai/toolFoundryGovernance.test.ts tests/unit/ai/toolFoundryContracts.test.ts` passed.
   - `npm run docs:guard` passed.
