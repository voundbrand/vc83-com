# RFC: Scalable Agent Runtime Architecture (Post-Incident Hardening)

## 1. RFC Title

Deterministic Agent Runtime Contracts for Scalable Agent Delivery (`define -> warm up -> release`)

## 2. Status, Authors, Reviewers, Date

- Status: `Proposed`
- Authors: Runtime Platform Engineering
- Reviewers: AI Runtime, Onboarding/One-of-One, SRE/Observability, Release Engineering
- Date: 2026-03-02
- RFC ID: `ARH-RFC-001`

## 3. Abstract

Recent `native_guest` reliability hardening fixed immediate production pain but introduced a patch-heavy runtime where execution eligibility depends on many implicit gates (routing, session context, layered tools, autonomy, idempotency, completion contracts, and fail-closed rewrites). This RFC defines a deterministic architecture for agent shipping at scale in the existing Convex stack by introducing:

1. A versioned declarative Agent Spec.
2. A Policy Compiler that emits a deterministic Runtime Capability Manifest.
3. Runtime Admission Control with structured denial contracts.
4. An explicit Action Completion model with tool-evidence contracts.
5. Canonical idempotency semantics and replay handling.
6. A build/warmup/release pipeline with objective promotion gates.
7. A phased migration for Samantha/`native_guest` first, without big-bang rewrite.

The target operating model is: define what we need, warm it up with deterministic evals, and release with confidence.

## 4. Problem & Incident Evidence

### 4.1 Symptoms observed

- `POST /api/v1/native-guest/message` frequently returned `400` for context/session failures.
- Duplicate ingress replay loops surfaced as `"Duplicate inbound event acknowledged."`.
- Fail-closed action completion rewrites blocked outcomes with:
  - `reasonCode=claim_tool_unavailable`
  - `outcome=audit_workflow_deliverable_pdf`
  - required tool `generate_audit_workflow_deliverable`

### 4.2 Evidence in current code

- Ingress 400 context failure path and context-failure logging:
  - `convex/http.ts` (`/api/v1/native-guest/message`)
  - `convex/api/v1/webchatApi.ts` (`resolvePublicMessageContext`, `recordPublicMessageContextFailure`)
- Duplicate ingress acknowledgment path:
  - `convex/ai/agentExecution.ts` (`ingestInboundReceipt` + duplicate response `"Duplicate inbound event acknowledged."`)
- Fail-closed action completion enforcement:
  - `convex/ai/agentExecution.ts` (`resolveAuditDeliverableInvocationGuardrail`, reason codes `claim_tool_unavailable`, `claim_tool_not_observed`, `claim_payload_invalid`)
  - `tests/unit/ai/auditDeliverableGuardrail.test.ts`
- Native guest bootstrap fallback and retry behavior:
  - `apps/one-of-one-landing/app/api/native-guest/config/route.ts`
  - `apps/one-of-one-landing/lib/audit-chat-client.ts`
- Layered tool scope + required contract checks:
  - `convex/ai/toolScoping.ts`
  - `convex/ai/agentExecution.ts` (`requiredScopeManifest`, fallback delegation)
- Current user-facing Linear links are intentionally removed from response copy:
  - `convex/ai/agentExecution.ts` (`formatCapabilityGapLinearIssueLine`)

### 4.3 Root cause class

The runtime currently composes policy via implicit, distributed logic across multiple stages. This creates non-obvious denial behavior, channel-specific drift, and expensive incident triage.

## 5. Non-Goals

1. Replacing Convex runtime primitives (`action`, `mutation`, `query`) or rewriting orchestration end-to-end.
2. Replacing current tool registry with a new external platform.
3. Introducing user-visible operational internals as a debugging mechanism.
4. Disabling fail-closed posture for high-stakes outcomes.
5. Big-bang migration.

## 6. Requirements

### 6.1 Functional requirements

1. Agent behavior must be derived from a versioned declarative Agent Spec.
2. Runtime must execute against a compiled, hashed Runtime Capability Manifest.
3. Admission denial responses must be structured and machine-readable.
4. Outcome completion claims must require deterministic tool evidence.
5. Idempotency must distinguish safe retries from true duplicates.
6. Release must be gated by deterministic warmup and canary criteria.

### 6.2 Operational requirements

1. Same inputs must yield same allow/deny results for a fixed manifest hash.
2. Every denial must include a normalized reason code and stage.
3. Every turn must carry manifest and policy trace identifiers.
4. Incident alerts must dedupe by deterministic keys and throttle windows.

### 6.3 Compatibility requirements

1. Must run in current Convex runtime and reuse existing surfaces:
   - `convex/http.ts`
   - `convex/api/v1/webchatApi.ts`
   - `convex/ai/agentExecution.ts`
2. Must preserve existing public channel contracts during migration.
3. Must support shadow and dual-eval before cutover.

## 7. Proposed Architecture

### 7.1 Architecture overview

Adopt a 3-layer control plane:

1. **Define layer**: Agent Spec + org policy + channel policy.
2. **Compile layer**: deterministic Policy Compiler emits Runtime Capability Manifest.
3. **Run layer**: Admission Control -> Turn Execution -> Action Completion Verification.

Runtime logic must consume only compiled artifacts, not recompute policy ad hoc.

### 7.2 New control-plane components

1. `AgentSpecRegistry` (Convex table + schema validator)
2. `PolicyCompiler` (internal action)
3. `RuntimeCapabilityManifestStore` (hash-addressed manifests)
4. `AdmissionController` (internal action used by inbound entrypoints)
5. `OutcomeVerifier` (turn-finalization contract checks)
6. `IdempotencyCoordinator` (canonical key/hash evaluation)

### 7.3 Policy Compiler (deterministic)

Input:

- Agent Spec (`agent_spec_v1`)
- Org policy profile (tool/org constraints)
- Channel policy profile (channel transport constraints)
- Runtime defaults profile (global fail-closed and safety policy)

Output:

- `runtime_capability_manifest_v1`
- allow/deny decision ledger (per tool/capability/channel/outcome)
- normalized denial reason catalog
- stable `manifestHash`

Compiler guarantees:

1. Deterministic sort/normalization of all arrays and maps.
2. Stable hashing across identical logical inputs.
3. Explicit source trace for each decision (`sourceLayer`: platform/org/agent/session/channel).
4. Compile-time failure on unknown tools/outcomes/policy refs.

### 7.4 Runtime Admission Control

Admission runs before `processInboundMessage` execution.

Checks:

1. Context validity:
   - session/agent/channel compatibility
   - organization/agent authority compatibility
2. Idempotency intent classification:
   - ingress/orchestration/proposal/commit
   - duplicate vs retry classification
3. Capability/tool availability:
   - manifest allow list
   - required contract dependencies for requested outcome
4. Policy compatibility:
   - autonomy/mode/channel alignment
5. Required field readiness:
   - outcome preconditions (e.g., for audit PDF: required lead fields)

If denied: return `admission_denial_v1` (never ad-hoc strings).

### 7.5 Action Completion Model

Replace phrase-dependent checks with explicit outcome contracts:

1. Outcome declaration: `outcomeKey`, `requiredTools`, `preconditions`.
2. Model claim format: `action_completion_claim_v2`.
3. Evidence format: observed tool invocation records bound to turn and outcome.
4. Completion decision:
   - success only if preconditions and tool evidence both pass.
5. Standardized failure taxonomy:
   - `tool_unavailable`
   - `tool_not_observed`
   - `contract_invalid`
   - `precondition_missing`
   - `replay_duplicate`

Compatibility mapping to current reason codes:

- `claim_tool_unavailable` -> `tool_unavailable`
- `claim_tool_not_observed` -> `tool_not_observed`
- `claim_payload_invalid` -> `contract_invalid`
- `required_scope_contract_missing` -> `precondition_missing`
- `replay_duplicate_ingress` -> `replay_duplicate`

User-safe fallback behavior (mandatory):

1. Never claim completion on failed contract.
2. Return concise user-safe message.
3. Optionally create internal incident/ticket references without exposing operational URLs.
4. Emit telemetry with contract payload and reason code.

### 7.6 Idempotency Model (canonical)

Canonical tuple:

- `ingressKey`: transport-level event identity (providerEventId/request UUID/session key fallback)
- `scopeKey`: workflow/collaboration scope partition
- `payloadHash`: canonical normalized payload digest

Evaluation policy:

1. Match on `(scopeKey, payloadHash)` within TTL -> duplicate/replay behavior by intent type.
2. Same `scopeKey` with different `payloadHash` -> new turn (retry with changed payload).
3. Commit conflict with in-flight commit in same concurrency key -> `conflict_commit_in_progress`.

Channel default TTLs:

- `native_guest`/`webchat`: `30m` default (`1m` min, `24h` max)
- webhook/provider channels with provider IDs: `24h`
- proposal/commit intents: `2h` default with replay result semantics

Eviction policy:

1. Soft expiry by `expiresAt`.
2. Hard cleanup job removes expired idempotency receipts and old replay rows.
3. Keep compact replay audit summary for 7 days.

### 7.7 Build-Warmup-Release operating model

`define -> warm up -> release` is the normative path:

1. Define: Agent Spec and policy references.
2. Warm up: compiler + contract tests + synthetic conversations.
3. Release: canary + promotion gates.

No direct runtime patches without spec/compiler artifacts.

### 7.8 Convex integration points

No big rewrite; add wrappers around existing runtime:

1. `convex/api/v1/webchatApi.ts` / `convex/http.ts`:
   - call `AdmissionController` before runtime handoff.
2. `convex/ai/agentExecution.ts`:
   - consume `manifestHash` and denial/action contracts.
3. `convex/ai/toolScoping.ts`:
   - become compiler/runtime manifest source, not ad-hoc injector path.
4. `convex/ai/runtimeIncidentAlerts.ts`:
   - keep existing dedupe model; add manifest-aware incident dimensions.

### 7.9 Stop Doing Now

1. Ad-hoc tool force injection without compiler trace.
2. User-facing operational internals (ticket URLs, incident routing details).
3. Ambiguous runtime denial strings without normalized reason codes.
4. Channel-specific patches without Agent Spec + compiler contract update.
5. Runtime behavior changes merged without warmup/eval artifacts.

## 8. Data/Contract Schemas

### 8.1 Agent Spec (`agent_spec_v1`) - declarative source of truth

```yaml
contractVersion: agent_spec_v1
agent:
  key: one_of_one_samantha_warm
  identity:
    displayName: Samantha Warm
    role: lead_capture_consultant
    templateRole: one_of_one_warm_lead_capture_consultant_template
  channels:
    allowed:
      - native_guest
      - webchat
    defaults:
      primary: native_guest
      deploymentMode: direct_agent_entry
  capabilities:
    - key: audit_delivery
      outcomes:
        - outcomeKey: audit_workflow_deliverable_pdf
          requiredTools:
            - generate_audit_workflow_deliverable
          preconditions:
            requiredFields:
              - firstName
              - lastName
              - email
              - phone
              - founderContactPreference
  policyProfiles:
    orgPolicyRef: org_policy_default_v3
    channelPolicyRef: native_guest_policy_v2
    runtimePolicyRef: runtime_fail_closed_v5
  autonomy:
    level: autonomous
    modeConstraints:
      disallowPlanModeToolExecution: true
      requireApprovalForMutations: false
  release:
    owner: onboarding_runtime_team
    version: 2026.03.02-rc1
    environmentStatus:
      dev: approved
      staging: approved
      prod: canary
```

JSON equivalent (compact):

```json
{
  "contractVersion": "agent_spec_v1",
  "agent": {
    "key": "one_of_one_samantha_warm",
    "identity": {
      "displayName": "Samantha Warm",
      "role": "lead_capture_consultant",
      "templateRole": "one_of_one_warm_lead_capture_consultant_template"
    }
  }
}
```

### 8.2 Runtime Capability Manifest (`runtime_capability_manifest_v1`)

```json
{
  "contractVersion": "runtime_capability_manifest_v1",
  "manifestHash": "f7b88e94c0f7c8f3",
  "compiledAt": 1772448000000,
  "inputs": {
    "agentSpecVersion": "agent_spec_v1",
    "agentSpecHash": "c71f0a2d",
    "orgPolicyHash": "95ab8d71",
    "channelPolicyHash": "ad53a770"
  },
  "channelDecisions": {
    "native_guest": {
      "allowed": true,
      "reasonCode": "allow_channel_bound"
    }
  },
  "toolDecisions": {
    "generate_audit_workflow_deliverable": {
      "allowed": true,
      "sourceLayer": "agent",
      "denials": []
    }
  },
  "outcomeContracts": {
    "audit_workflow_deliverable_pdf": {
      "requiredTools": ["generate_audit_workflow_deliverable"],
      "requiredFields": [
        "firstName",
        "lastName",
        "email",
        "phone",
        "founderContactPreference"
      ],
      "enforcementMode": "enforce"
    }
  },
  "denyCatalog": [
    "context_invalid",
    "channel_not_allowed",
    "tool_unavailable",
    "precondition_missing",
    "replay_duplicate"
  ]
}
```

### 8.3 Admission Denial Contract (`admission_denial_v1`)

```json
{
  "contractVersion": "admission_denial_v1",
  "denied": true,
  "stage": "admission",
  "reasonCode": "context_invalid",
  "reason": "session_token_channel_mismatch",
  "httpStatusHint": 400,
  "manifestHash": "f7b88e94c0f7c8f3",
  "idempotency": {
    "scopeKey": "org_123:route:native_guest:message_ingress",
    "payloadHash": "d87af0b2",
    "classification": "ingress"
  },
  "userSafeMessage": "We could not process your message right now. Please try again.",
  "metadata": {
    "channel": "native_guest",
    "requestId": "ng_a1b2c3"
  }
}
```

### 8.4 Action Completion Evidence (`action_completion_evidence_v1`)

```json
{
  "contractVersion": "action_completion_evidence_v1",
  "outcomeKey": "audit_workflow_deliverable_pdf",
  "requiredTools": ["generate_audit_workflow_deliverable"],
  "requiredFields": [
    "firstName",
    "lastName",
    "email",
    "phone",
    "founderContactPreference"
  ],
  "observedToolCalls": [
    {
      "toolName": "generate_audit_workflow_deliverable",
      "callId": "toolcall_01",
      "turnId": "turn_987",
      "status": "success",
      "outputRef": "object:deliverable_123"
    }
  ],
  "preconditionCheck": {
    "passed": true,
    "missingFields": []
  },
  "decision": {
    "status": "pass",
    "failureCode": null
  }
}
```

### 8.5 Canonical Idempotency Contract (`tcg_idempotency_v2`)

```json
{
  "contractVersion": "tcg_idempotency_v2",
  "scopeKind": "collaboration",
  "scopeKey": "org_123:lineage_44:thread_91:ingress",
  "ingressKey": "provider:slack:event_abc",
  "intentType": "ingress",
  "payloadHash": "4c2df8a0",
  "ttlMs": 1800000,
  "issuedAt": 1772448000000,
  "expiresAt": 1772449800000,
  "replayOutcome": "duplicate_acknowledged"
}
```

Replay matrix:

| Condition | Classification | Runtime outcome | User outcome |
|---|---|---|---|
| Same `scopeKey` + same `payloadHash` + ingress | duplicate | `duplicate_acknowledged` | idempotent ack |
| Same `scopeKey` + same `payloadHash` + proposal/commit | replay | `replay_previous_result` | prior result reused |
| Same `scopeKey` + different `payloadHash` | retry/new intent | `accepted` | new processing |
| Commit in-flight same concurrency key | conflict | `conflict_commit_in_progress` | retry later |
| TTL expired | new | `accepted` | new processing |

## 9. Runtime Flow (sequence-level)

1. Inbound request (`/api/v1/native-guest/message`) enters Convex HTTP action.
2. `ContextResolver` resolves `{organizationId, agentId, channel, session}`.
3. `PolicyCompilerResolver` loads latest approved manifest hash for agent+channel.
4. `AdmissionController` evaluates:
   - context validity
   - idempotency classification
   - manifest capability/tool checks
   - policy compatibility
   - required-field readiness
5. If denied:
   - write denial event with `manifestHash` + reason code
   - return `admission_denial_v1`
   - skip turn execution
6. If admitted:
   - `IdempotencyCoordinator` ingests receipt
   - duplicate/replay short-circuit or create inbound turn
7. Runtime executes turn with manifest-scoped tools.
8. Outcome verifier checks action completion claims/evidence.
9. If mismatch:
   - apply fail-closed rewrite only in enforce mode
   - emit mismatch telemetry + incident threshold checks
10. Persist terminal artifacts and return user-safe response.

## 10. Validation and Release Pipeline

### 10.1 Pipeline stages and gates

| Stage | Goal | Commands (current stack) | Required artifacts | Fail criteria |
|---|---|---|---|---|
| 1. Spec lint | Validate Agent Spec structure and refs | `npm run typecheck`; `npm run docs:guard` | `artifacts/spec-lint/*.json` | unknown tool/policy refs, invalid schema/version |
| 2. Capability compile | Build deterministic manifest | `npx tsc -p convex/tsconfig.json --noEmit`; compile action in CI | `artifacts/manifest/*.json` including `manifestHash` | nondeterministic hash across repeated compile, unresolved deny reason |
| 3. Contract tests | Validate admission/action/idempotency behavior | `npm run test:unit -- tests/unit/ai/auditDeliverableGuardrail.test.ts tests/unit/ai/actionCompletionMismatchTelemetry.test.ts tests/unit/ai/runtimeIncidentAlerts.test.ts tests/unit/ai/toolScopingPolicyAudit.test.ts` | `artifacts/tests/contracts/*.xml` | any contract regression |
| 4. Synthetic convo warmup/evals | Validate real flow invariants | `npm run test:unit -- tests/unit/shell/webchat-deployment-flow.smoke.test.ts`; `npm run test:integration -- tests/integration/onboarding/universalOnboardingIngress.phase5.integration.test.ts` | `artifacts/warmup/*.json` with outcome checklist | 400 context failures above threshold, duplicate false replay, completion mismatch drift |
| 5. Canary | Validate production behavior at low traffic | deploy to dev/staging canary | canary metrics snapshot (30m/24h) | SLO breach or incident threshold breach |
| 6. Promotion | Promote dev -> staging -> prod | release workflow with manual approval + automated checks | promotion record with manifest hash + signoff | missing artifacts/signoff, unresolved canary alarms |

### 10.2 Stage pass/fail criteria

1. No unknown denial reason codes.
2. Manifest hash stable across reruns with same inputs.
3. `tool_unavailable` and `tool_not_observed` behavior deterministic for same replayed turn.
4. Duplicate ingress false-positive rate below threshold.
5. No user-facing operational internals in responses.

## 11. Observability and SLOs

### 11.1 Trace/span model (per turn)

Each turn emits one trace with ordered spans:

1. `ingress.context_resolution`
2. `policy.manifest_resolution`
3. `admission.evaluate`
4. `idempotency.classify`
5. `turn.execute`
6. `action_completion.verify`
7. `delivery.finalize`

Required dimensions on every span:

- `organizationId`
- `sessionId`
- `turnId`
- `channel`
- `manifestHash`
- `idempotency.scopeKey`
- `idempotency.payloadHash`
- `admission.reasonCode` (if denied)

### 11.2 Required metrics

1. `runtime_admission_denied_total{reasonCode,channel,manifestHash}`
2. `runtime_policy_decision_total{decision,sourceLayer}`
3. `runtime_replay_total{replayOutcome,intentType,channel}`
4. `runtime_action_completion_mismatch_total{failureCode,outcomeKey,templateIdentifier}`
5. `runtime_context_failure_total{reason,channel}`
6. `runtime_duplicate_ingress_total{scopeKey,channel}`

### 11.3 Incident thresholds and dedupe behavior

Use deterministic dedupe key pattern:

`{organizationId}|{proposalOrSessionPartition}|{reasonCode}`

Default throttle window: `30m` (bounded `15m` to `60m`).

Alert thresholds:

1. `duplicate_ingress_replay`: >= 3 duplicates per scope in 10m.
2. `tool_unavailable`: >= 5 enforce-mode denials per template in 60m.
3. `context_invalid`: > 1.0% of inbound requests per channel in 15m.
4. `replay_duplicate` false-positive indicator: > 0.2% of changed-payload retries in 60m.

### 11.4 SLI/SLO proposals

1. **Ingress reliability SLI**: successful admitted turns / total inbound requests.
   - SLO: `>= 99.5%` over 7 days.
2. **Admission determinism SLI**: identical inputs producing identical decision + manifest hash.
   - SLO: `>= 99.99%`.
3. **Idempotency correctness SLI**: duplicate classification accuracy vs replay audit truth set.
   - SLO: `>= 99.9%`.
4. **Action completion truthfulness SLI**: false completion claims blocked.
   - SLO: `100%` for enforce-mode outcomes.

## 12. Security/Risk Model

### 12.1 Threats

1. Cross-tenant context resolution drift.
2. Capability bypass via ad-hoc tool injection.
3. Replay abuse through weak payload hashing.
4. Incorrect success claims without real side effects.
5. Operational leakage through user-facing internals.

### 12.2 Controls

1. Admission fail-closed with structured denial contracts.
2. Manifest hash pinning per turn and policy traceability.
3. Idempotency tuple with bounded TTL and replay classification.
4. Outcome verifier requiring tool-call evidence.
5. Sanitized user-safe fallback messages.
6. Deterministic incident dedupe and throttle to reduce alert storms.

### 12.3 Residual risks

1. Migration-phase dual paths can drift.
2. Legacy clients may depend on old HTTP semantics.
3. Compile latency under high manifest churn.

Mitigation: shadow mode, dual-eval parity checks, feature flags, and rapid rollback controls.

## 13. Migration Plan (phased)

### 13.1 Migration principles

1. Samantha/`native_guest` first.
2. Convex-compatible incremental layering.
3. No big-bang switch.
4. Dual-eval before enforcement.

### 13.2 Phase 0 - Prep (1 week)

Scope:

1. Add Agent Spec schema + registry.
2. Add Policy Compiler and manifest store.
3. Add admission and denial contract types without routing cutover.

Rollback:

- Disable compiler/admission feature flags; keep existing runtime path.

### 13.3 Phase 1 - Shadow mode (`native_guest` Samantha)

Scope:

1. Run compiler + admission in shadow (non-blocking).
2. Compare shadow decision vs current runtime outcome.
3. Emit parity telemetry and mismatch reports.

Success criteria:

1. >= 99% decision parity for 7 days.
2. No increase in context failure/duplicate replay incidents.

Rollback:

- Stop shadow invocation; no user behavior change.

### 13.4 Phase 2 - Dual-write / dual-eval

Scope:

1. Persist both legacy and new contracts:
   - legacy idempotency fields + `tcg_idempotency_v2`
   - legacy completion payload + `action_completion_evidence_v1`
2. Start serving denial contracts while preserving legacy error fields.

Success criteria:

1. All inbound failures include structured denial contract.
2. No client breakage on existing `error` handling.

Rollback:

- Disable new contract writes; keep old write path.

### 13.5 Phase 3 - Cutover

Scope:

1. Admission decisions become authoritative.
2. Outcome verification uses canonical failure taxonomy.
3. Remove ad-hoc Samantha-specific mandatory injection path from hot path; enforce through manifest.

Success criteria:

1. SLOs met for 14 days.
2. Incident thresholds stable or improved.

Rollback:

- Re-enable legacy evaluator as authoritative via feature flag.

### 13.6 Phase 4 - Legacy removal

Scope:

1. Remove legacy denial strings as control-plane source.
2. Remove non-compiled tool force-injection branches.
3. Collapse compatibility mapping once downstream consumers are updated.

Success criteria:

1. No dependency on legacy compatibility fields.
2. Docs/runbooks updated to manifest-first operations.

Rollback:

- Revert to Phase 3 compatibility mode for one release cycle.

### 13.7 30/60/90 execution plan

#### 0-30 days

Owners:

1. Runtime Platform: Agent Spec + Compiler + Manifest store.
2. Onboarding Runtime: Samantha spec authoring + native_guest mapping.
3. Observability/SRE: trace/metric schema and dashboards.

Success metrics:

1. `agent_spec_v1` and `runtime_capability_manifest_v1` live in dev.
2. Shadow mode enabled for Samantha/native_guest.
3. Parity dashboard online.

Dependencies:

1. Tool registry normalization.
2. Channel policy profile definitions.

#### 31-60 days

Owners:

1. Runtime Platform: Admission authority + idempotency v2 evaluator.
2. Release Engineering: canary automation and promotion gates.
3. QA/Tooling: synthetic warmup harness.

Success metrics:

1. Dual-write/dual-eval running in staging + limited prod canary.
2. Structured denial coverage >= 99%.
3. Duplicate false-replay rate < 0.2%.

Dependencies:

1. Client compatibility for denial contract fields.
2. Canary alerting thresholds tuned.

#### 61-90 days

Owners:

1. Runtime Platform: authoritative cutover + legacy removal PRs.
2. Onboarding Runtime: expand to next high-volume agent/channel pairs.
3. SRE: SLO enforcement and incident runbooks.

Success metrics:

1. Samantha/native_guest fully on compiled admission path.
2. No Sev1/Sev2 incidents from context/idempotency/action-completion drift for 30 days.
3. Time-to-debug runtime denial reduced by >= 50%.

Dependencies:

1. Feature-flag rollback tested.
2. Post-cutover incident drill completed.

### 13.8 Dependency graph

1. `Agent Spec schema` -> `Policy Compiler`
2. `Policy Compiler` -> `Manifest store/hash`
3. `Manifest store` -> `Admission control cutover`
4. `Admission control` + `Outcome verifier` -> `Canary`
5. `Canary` -> `Promotion` -> `Legacy removal`

### 13.9 Risk register

| Risk | Probability | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Shadow/authoritative decision drift | Medium | High | dual-eval parity gate, block cutover if drift > 1% | Runtime Platform |
| Client incompatibility with new denial payload | Medium | Medium | preserve legacy `error` field during Phase 2-3 | Onboarding Runtime |
| Hash instability from non-normalized inputs | Low | High | deterministic normalization + compile reproducibility tests | Runtime Platform |
| Alert fatigue from new metrics | Medium | Medium | dedupe + throttle windows + tuned thresholds | SRE |

## 14. Rollout Strategy

### 14.1 Environment promotion

1. Dev: full feature flags on, shadow + authoritative toggles tested daily.
2. Staging: dual-write + authoritative admission for Samantha/native_guest.
3. Prod:
   - Canary 5%
   - Canary 25%
   - Canary 50%
   - 100% with 7-day stability gate

### 14.2 Rollback strategy (per phase)

1. Phase 1 rollback: disable shadow evaluator.
2. Phase 2 rollback: disable new writes, keep legacy contract only.
3. Phase 3 rollback: switch admission authority to legacy path.
4. Phase 4 rollback: restore compatibility adapter from tagged release branch.

Rollback must preserve idempotency data integrity and not delete receipts.

## 15. Open Questions

1. Should duplicate acknowledgment become HTTP `200/202` for `native_guest`, or remain `400` with structured denial during compatibility window?
2. Should `payloadHash` include attachment metadata by default for all channels?
3. Which team owns policy-profile governance lifecycle after initial rollout?
4. Should manifest compilation be pull-on-demand at runtime or precomputed on publish only?
5. Should outcome precondition schemas be shared with frontend form validators?

## 16. Decision Log

1. **Adopt manifest-first runtime control plane**: Accepted.
2. **Keep Convex runtime, avoid rewrite**: Accepted.
3. **Canonical action completion taxonomy with compatibility map**: Accepted.
4. **Samantha/native_guest as first migration slice**: Accepted.
5. **No ad-hoc runtime patches without spec/compiler artifacts**: Accepted.
6. **Preserve user-safe responses without operational links**: Accepted.

## 17. Appendix (examples)

### Appendix A: Minimal Agent Spec JSON

```json
{
  "contractVersion": "agent_spec_v1",
  "agent": {
    "key": "one_of_one_samantha",
    "identity": {
      "displayName": "Samantha",
      "role": "lead_capture_consultant"
    },
    "channels": {
      "allowed": ["native_guest", "webchat"]
    },
    "capabilities": [
      {
        "key": "audit_delivery",
        "outcomes": [
          {
            "outcomeKey": "audit_workflow_deliverable_pdf",
            "requiredTools": ["generate_audit_workflow_deliverable"]
          }
        ]
      }
    ]
  }
}
```

### Appendix B: Structured denial payload (duplicate replay)

```json
{
  "contractVersion": "admission_denial_v1",
  "denied": true,
  "stage": "idempotency",
  "reasonCode": "replay_duplicate",
  "reason": "duplicate_ingress",
  "httpStatusHint": 409,
  "idempotency": {
    "scopeKey": "org_123:route:native_guest:message_ingress",
    "payloadHash": "7d2fbc01",
    "classification": "ingress"
  },
  "userSafeMessage": "Message received. Continuing from your latest step."
}
```

### Appendix C: Action completion failure payload

```json
{
  "contractVersion": "action_completion_evidence_v1",
  "outcomeKey": "audit_workflow_deliverable_pdf",
  "decision": {
    "status": "fail",
    "failureCode": "tool_unavailable",
    "failureDetail": "generate_audit_workflow_deliverable not allowed by manifest"
  }
}
```

### Appendix D: Required implementation checklist

1. Add `agent_spec_v1` schema and validation.
2. Implement Policy Compiler and manifest hash store.
3. Add `admission_denial_v1` response contract.
4. Add `action_completion_evidence_v1` recorder and verifier.
5. Upgrade idempotency evaluator to canonical tuple semantics.
6. Wire pipeline artifacts into CI/CD promotion gates.
