# Org Agent Action Runtime Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/org-agent-action-runtime`  
**Last updated:** 2026-03-25

---

## Objective

Deliver a full org-owned agent activity/action runtime that:

1. captures structured outcomes from telephony, webchat, and follow-up execution,
2. writes canonical CRM data into the platform before any outbound sync,
3. creates immutable activity records and separate actionable work items,
4. supports owner approval, assignment, completion, takeover, and retry,
5. allows low-risk agent auto-execution under explicit org policy,
6. exposes a Kanban pipeline control board in Action Center with agent-based filters,
7. preserves auditability, receipts, retries, idempotency, and telemetry end to end,
8. inventories existing agents and migrates each one to an explicit topology profile with stable package contracts.

Progress snapshot (2026-03-25):

1. `OAR-003` is complete: canonical OAR schema module landed with policy snapshots, execution receipts, sync bindings, and taxonomy contracts wired into `convex/schema.ts`.
2. `OAR-004` is complete: structured `org_agent_outcome_envelope_v1` extraction contract landed with deterministic normalization/heuristics and session/conversation wrapper entry points.
3. `OAR-005` is complete (hardening pass): immutable timeline persistence now includes deterministic artifact-ref builders for session/contact/org/action correlation plus activity-protocol detail-ref contract coverage.
4. `OAR-006` is complete: canonical platform-first CRM projection now writes `crm_activity` records, patches CRM contact/org metadata, emits object-action evidence, and enqueues downstream sync-candidate artifacts without connector mutation.
5. `OAR-007` is complete: telephony route-identity resolution now fail-closes on missing/ambiguous bindings and routes phone-call ingress into shared operator-runtime identity fields.
6. `OAR-008` is complete: telephony transcript/outcome checkpoint + transfer/takeover evidence rails are now validated on shared runtime timeline artifacts.
7. `OAR-009` is complete: webchat/conversation routing, parity checks, and integration contracts now validate against the shared session outcome/HITL model.
8. `OAR-011` is complete: fail-closed org-action decisioning and durable policy snapshot persistence contracts are now implemented.
9. `OAR-012` is complete: reusable approval packet envelopes and fail-closed transition contracts now align action-item approval semantics with existing HITL lifecycle patterns.
10. `OAR-013` is complete: preview-to-receipt execution helpers now include deterministic idempotency/correlation receipt contracts and policy/observability coverage.
11. `OAR-014` is complete: internal low-risk auto-execution allowlist and fail-closed external execution gate are now codified.
12. `OAR-033` is complete: existing-agent topology + tool-calling behavior inventory is now codified with explicit profile selection and migration risk notes.
13. `OAR-027` is complete: topology profile contract and “platform-finished” definition are now explicit in the OAR workstream docs.
14. `OAR-017` is complete: immutable activity timeline backend/query + UI now correlates canonical activity, approval/takeover state checkpoints, policy snapshots, execution receipts, and sync markers with explicit mutable-vs-immutable distinction in owner surfaces.
15. `OAR-019` is complete: sync outbox dispatch receipts now persist canonical status transitions, upsert/conflict-check external identity bindings, emit action-item sync markers, and log sync telemetry with deterministic idempotency/correlation keys.
16. `OAR-020` is complete: narrow outward CRM sync V1 now dispatches pending candidates through a fail-closed batch action/API trigger, records receipt/binding evidence per attempt, and exposes integration coverage plus pipeline status summary rails.
17. `OAR-022` is complete: reliability contracts now carry deterministic approval/execution/sync idempotency+correlation metadata into Action Center transitions, session receipt diagnostics/timeline, and activity-protocol telemetry.
18. `OAR-024` is complete: migration/backfill contracts now include dry-run-first OAR artifact patching, transaction-history rollout gating, and explicit internal-only feature-flag phase documentation.
19. `OAR-025` is complete: full verification matrix now passes (`V-TYPE`, `V-UNIT-CONTRACT`, `V-UNIT-INGRESS`, `V-UNIT-POLICY`, `V-UNIT-UI`, `V-UNIT-SYNC`, `V-UNIT-OBS`, `V-INTEG-RUNTIME`, `V-E2E-TRUST`, `V-E2E-DESKTOP`, `V-DOCS`) with evidence captured at `tmp/reports/org-agent-action-runtime/OAR-025-verification-2026-03-25.md`; root `playwright.config.ts` now re-exports ATX config so raw trust e2e command resolves baseURL/auth context deterministically.
20. `OAR-028` is complete: topology-profile runtime contract (`oar_runtime_topology_v1`) now enforces fail-closed profile resolution with explicit adapter selection across `aiSchemas`, `agentExecution`, and `agentTurnOrchestration`, with focused test coverage in `orgActionRuntimeTopologyContract.test.ts`.
21. `OAR-029` is complete: inbound runtime kernel contract is now versioned/frozen (`oar_inbound_runtime_kernel_v1`) with canonical stage-order + terminal-phase assertions and explicit topology-adapter compatibility checks, plus persisted turn-level kernel-contract evidence.
22. `OAR-030` is complete: bounded timeout/retry contracts now cover outbound delivery + DLQ fallback, Infobip provisioning/application requests, and narrow CRM sync dispatch, with terminalization assertions added for receipt finalization helpers; evidence is captured at `tmp/reports/org-agent-action-runtime/OAR-030-verification-2026-03-25.md`.
23. `OAR-034` is complete: agent package contracts now require explicit runtime topology declarations with fail-closed adapter/profile + runtime-module compatibility checks, registry topology evidence persistence, and rollout-gate blocking when current protected template topology declaration is missing/incompatible; evidence is captured at `tmp/reports/org-agent-action-runtime/OAR-034-verification-2026-03-25.md`.
24. `OAR-010` is complete: follow-up execution runtime re-entry now lands via fail-closed context/policy gates (`org_action_follow_up_runtime_v1`), deterministic correlation/idempotency identity reuse/builders, and explicit kernel follow-up re-entry metadata contract (`org_action_follow_up_reentry_v1`), with evidence at `tmp/reports/org-agent-action-runtime/OAR-010-verification-2026-03-25.md`.
25. `OAR-018` is complete: CRM contact/organization detail panes and super-admin control-center surfaces now embed canonical org-action context and correlated timeline hooks using existing OAR query contracts, with evidence at `tmp/reports/org-agent-action-runtime/OAR-018-verification-2026-03-25.md`.
26. `OAR-021` is complete: external execution contracts now add approval-aware org gate + connector-allowlist checks, deterministic external dispatch identity keys, and fail-closed rollback/compensation semantics with approval-time dispatch attempt evidence writes in `crmAiTools`.
27. `OAR-023` is complete: runtime retry-guidance contract now annotates receipt diagnostics with retry-safe/blocking/unblock semantics, replay requests fail closed for blocked/terminal receipts, and Trust Cockpit + debug-event surfaces expose operator-facing blocked/retry-safe evidence.
28. `OAR-026` is complete: canary rollout documentation now includes named owners, rollback trigger matrix, fail-closed connector execution proofs, and explicit expansion gate criteria requiring `OAR-032` + `OAR-035`.
29. `OAR-031` is complete: `agent_spec_v1` now normalizes reusable package contracts (explicit or deterministic fallback), fails closed on package threshold/policy/tool conflicts, persists package rollout/eval summary fields in `agentSpecRegistry`, and includes focused unit coverage in `orgAgentPackageContract.test.ts`.
30. `OAR-032` is complete: production-gate contracts now combine eval thresholds, latency/cost budgets, and runtime SLO observations into fail-closed rollout decisions, with Trust Cockpit surfacing decision status + blocked reasons from runtime telemetry.
31. `OAR-035` is complete: runtime module registry now publishes deterministic existing-agent migration evidence (`oar_existing_agent_topology_migration_v1`) with compatibility pass/fail status and blocked-agent remediation queue output.
32. Deterministic next row is none (queue complete).

---

## Topology profile model

OAR uses one reusable runtime kernel with explicit topology profiles:

| Profile | Plain-English model | Primary fit |
|---|---|---|
| `single_agent_loop` | one authority agent + tools + memory in a single turn loop | current OAR default for telephony/webchat/follow-up |
| `pipeline_router` | staged ingress/process/storage routing with deterministic stage contracts | high-volume event normalization and deterministic fan-in/out |
| `multi_agent_dag` | specialized agent graph with bounded handoffs and explicit ownership | composition flows (writer/editor/reviewer/publisher style) |
| `evaluator_loop` | generate-score-retry/select loop against a measurable objective | optimization and hill-climb style runtimes |

Kernel reuse rule:

1. topology profile changes orchestration behavior only,
2. the same kernel contract still owns ingress, routing, tool dispatch, delivery, settlement, receipt finalization, and telemetry.

---

## Existing-agent topology inventory (OAR-033)

Inventory method:

1. runtime-module coverage from `convex/ai/agents/runtimeModuleRegistry.ts` and `convex/ai/agentExecution.ts`,
2. package/tool contract coverage from `convex/ai/agentSpecRegistry.ts`,
3. seeded active template/runtime coverage from `convex/onboarding/seedPlatformAgents.ts`.

Per-agent topology mapping:

| Agent/runtime family | Evidence | Observed tool-calling pattern | Selected topology profile | Adapter/no-kernel-edit path | Risk note |
|---|---|---|---|---|---|
| Samantha lead capture (`cold`/`warm`) | `seedPlatformAgents.ts` (`runtimeModuleKey` on Samantha seed); `agentSpecRegistry.ts` (required `audit_deliverable` manifest); `agentExecution.ts` (auto-dispatch + recovery flow) | Generate recommendation, evaluate required fields/tool outcomes, then dispatch/retry/fallback | `evaluator_loop` | Keep shared kernel; bind Samantha evaluator adapter and thresholds in package contract | Delivery-claim drift when required tool is unavailable |
| Der Terminmacher concierge | `agents/der_terminmacher/runtimeModule.ts` (intent router + module key); `agents/der_terminmacher/tools.ts` (preview-first enforcement); `tools/bookingTool.ts` + `tools/crmTool.ts` (preview/execute manifests) | Ingress classification then staged booking/CRM preview/execute actions | `pipeline_router` | Force explicit module declaration for concierge agents; preserve stage contracts as adapter behavior | Implicit routing ambiguity when module key is absent |
| David Ogilvy copywriter | `agents/david_ogilvy/runtimeModule.ts` (style/output policy); `seedPlatformAgents.ts` (`toolProfile: "readonly"`, no enabled tools) | Read-only generation with deterministic style constraints | `single_agent_loop` | No kernel changes; keep as deterministic single-agent package | Low risk; main risk is policy drift in prompt package |
| Quinn onboarding template + workers | `seedPlatformAgents.ts` (`QUINN_CUSTOM_PROPERTIES`, broad enabled tools, no runtime module key) | Multi-step onboarding/handoff/checkout calls in one authority loop | `pipeline_router` | Add onboarding stage adapter (`intake -> qualify -> handoff/checkout -> finalize`) without kernel edits | Broad mutating tool surface currently implicit |
| Mother Support runtime | `seedPlatformAgents.ts` (`MOTHER_SUPPORT_RUNTIME_SEED`, support profile, empty enabled tools) | Policy/support responses with minimal tool execution | `single_agent_loop` | Keep single-agent package with strict fail-closed tool manifest | Medium risk if support runtime gains mutating tools without profile update |
| Mother Governance runtime | `seedPlatformAgents.ts` (`MOTHER_GOVERNANCE_RUNTIME_SEED`, readonly/empty enabled tools) | Proposal/review decisioning with governance gating | `evaluator_loop` | Add governance evaluator contract (score/gate) as package adapter | Governance decisions can become opaque without explicit evaluator telemetry |
| One-of-One Operator template | `seedPlatformAgents.ts` (`PERSONAL_OPERATOR_TEMPLATE_AGENT_SEED`, broad cross-domain tool profile) | Orchestrator-style routing across booking, onboarding, CRM, and escalation actions | `multi_agent_dag` | Declare bounded specialist handoff graph in package metadata, keep kernel unchanged | Highest rework risk if kept implicit single loop |
| Agency Child Org PM template | `seedPlatformAgents.ts` (`AGENCY_CHILD_ORG_PM_TEMPLATE_AGENT_SEED`) | Internal PM coordination with mutating ops tools | `single_agent_loop` | Keep single-agent package; rely on policy snapshots/approvals | Moderate risk if authority scope expands without gating |
| Agency Child Org Customer Service template | `seedPlatformAgents.ts` (`AGENCY_CHILD_ORG_CUSTOMER_SERVICE_TEMPLATE_AGENT_SEED`) | Customer support with booking + escalation actions | `single_agent_loop` | Keep single-agent package; optional later pipeline split if routing complexity rises | Medium risk from mixed support+booking tool set |
| Clara telephony template | `seedPlatformAgents.ts` (`CLARA_TEMPLATE_AGENT_SEED`, booking-profile telephony tools) | Intake/reception flow with CRM mutations and escalation | `pipeline_router` | Bind telephony intake stages in adapter; keep tool manifests unchanged | Routing consistency risk across channels without explicit profile |
| Jonas telephony template | `seedPlatformAgents.ts` (`JONAS_TEMPLATE_AGENT_SEED`) | Qualification/triage flow with CRM mutations and escalation | `pipeline_router` | Bind qualification stages as adapter behavior | Qualification-to-handoff drift if profile stays implicit |
| Maren telephony template | `seedPlatformAgents.ts` (`MAREN_TEMPLATE_AGENT_SEED`, includes `manage_bookings`) | Booking-heavy staged flow with preview/execute requirements | `pipeline_router` | Reuse concierge stage adapter; no kernel edits | Booking execution safety depends on explicit stage enforcement |
| Anne Becker telephony template | `seedPlatformAgents.ts` (`ANNE_BECKER_TEMPLATE_AGENT_SEED`) | Real-estate intake + booking coordination flow | `pipeline_router` | Reuse telephony intake + booking stage adapters | Domain-specific policy drift if treated as generic loop |
| Kanzlei MVP telephony template | `seedPlatformAgents.ts` (`KANZLEI_MVP_TEMPLATE_AGENT_SEED`, `single_agent_mvp` tags) | Single-agent legal intake with urgency capture + booking coordination | `single_agent_loop` | Keep explicit single-agent profile; enforce fail-closed policy package | Compliance risk if migrated without strict policy contracts |

Coverage gaps identified:

1. Known runtime-module registry currently lists three modules (`der_terminmacher`, `samantha`, `david_ogilvy`), while multiple active seeded templates still run without explicit runtime-module declaration.
2. `single_agent_loop` remains the implicit fallback path for most seeded agents; `OAR-034` must enforce explicit profile declaration.
3. `multi_agent_dag` is selected for One-of-One Operator but not yet represented by an explicit package contract in current seeds.

Topology distribution selected in this pass:

1. `single_agent_loop`: David Ogilvy, Mother Support, Agency Child Org PM, Agency Child Org Customer Service, Kanzlei MVP.
2. `pipeline_router`: Der Terminmacher, Quinn, Clara, Jonas, Maren, Anne Becker.
3. `multi_agent_dag`: One-of-One Operator.
4. `evaluator_loop`: Samantha, Mother Governance.

Existing-agent migration evidence contract (`OAR-035`):

1. Contract: `oar_existing_agent_topology_migration_v1` in `convex/ai/agents/runtimeModuleRegistry.ts`.
2. Evidence fields: declared profile/adapter, expected profile/adapter, compatibility status (`compatible`/`blocked`), reason code, remediation.
3. Blocked queue output is deterministic and sorted by `agentKey` for reproducible remediation handoff.
4. Unit coverage: `tests/unit/ai/runtimeModuleRegistry.test.ts` validates pass/fail evaluation and remediation queue output.

---

## Platform-finished criteria

OAR treats the platform as “finished” when all of the following are true:

1. topology is explicit and enforced per runtime profile,
2. kernel contract is versioned/stable with rare breaking changes,
3. all external awaits are bounded and every turn reaches a terminal state exactly once,
4. agent package contract is standardized (prompt/tools/policy/memory/evals/rollout),
5. promotion to production is eval-gated by objective thresholds,
6. operations run on SLOs with dashboard + alert + runbook ownership,
7. new-agent launch is mostly configuration, not kernel edits,
8. existing agents are topology-classified with migration evidence and compatibility checks.

---

## Finish criteria mapped to implementation rows

| Finish criterion | Primary queue rows | Notes |
|---|---|---|
| Explicit topology profile contract | `OAR-027`, `OAR-028` | Add topology declaration and enforcement hooks in runtime contracts |
| Stable kernel contract | `OAR-029` | Introduce versioned kernel/profile adapter surface |
| Bounded execution and terminalization guarantees | `OAR-022`, `OAR-030` | Close remaining unbounded await paths and prove terminalization |
| Standardized reusable agent package | `OAR-031` | Add package contract for goals/tools/policy/memory/eval/rollout |
| Eval-gated promotion | `OAR-025`, `OAR-032` | Tie canary/rollout to objective eval thresholds |
| SLO-backed operations | `OAR-023`, `OAR-032` | Publish stuck-turn and delivery/error SLO contracts |
| Config-first new-agent launch | `OAR-031`, `OAR-032` | “No kernel edit” onboarding gate before expansion |
| Existing-agent topology fit and migration evidence | `OAR-033`, `OAR-034`, `OAR-035` | Inventory current agents/tool-calling patterns, enforce profile declaration, and block rollout for unmigrated agents |

---

## Why this stream exists

Current repository state:

1. `convex/crmOntology.ts` and `convex/crmIntegrations.ts` already manage canonical CRM objects and write `objectActions`.
2. `convex/ai/agentSessions.ts`, `convex/ai/conversations.ts`, and `convex/api/v1/conversations.ts` already own session routing, conversation lifecycle, and human message injection.
3. `convex/ai/agentApprovals.ts` already provides approval artifacts and human-in-the-loop gating.
4. `convex/integrations/telephony.ts` and `src/lib/telephony/agent-telephony.ts` already manage org telephony routing and provider/template configuration.
5. `convex/activityProtocol.ts` and `convex/ai/trustTelemetry.ts` already provide event tracing and trust telemetry.
6. Existing operator surfaces already expose approval and control-center patterns in `src/components/window-content/agents/*` and `src/components/window-content/super-admin-organizations-window/agent-control-center-tab.tsx`.

Strategic gap:

1. There is no first-class runtime artifact for immutable org-agent business activity.
2. There is no separate mutable work-item contract for owner review, assignment, or completion.
3. Telephony, webchat, and follow-up execution do not yet converge on one structured outcome model.
4. External CRM sync is not yet modeled as a strict downstream outbox from canonical platform state.
5. Org policy for owner-only versus approval-required versus auto-allowed action execution is not yet centralized.

This stream closes those gaps without replacing existing platform primitives.

---

## Scope

Internal-only V1 in scope:

1. Structured outcome capture for telephony, webchat, and follow-up execution.
2. Canonical platform CRM projection before outbound sync.
3. Immutable activity objects and mutable action-item objects with linked `objectActions`.
4. Org policy resolution, approval reuse, owner Action Center, and activity timeline UI.
5. Low-risk auto-execution for narrow internal actions only.
6. Action Center list and Kanban parity with catalog-driven agent filters (`all` plus active agent identities).
7. Narrow external CRM sync breadth: contact/org upsert plus note/activity append.
8. Receipts, retries, idempotency, telemetry, migration, and rollout gates.

Out of scope for internal-only V1:

1. Broad external CRM task/action execution.
2. Replacing conversations, approvals, or human takeover with a parallel subsystem.
3. Keeping Veronica telephony on a standalone receptionist prompt path.
4. UI-local mutation logic that bypasses canonical backend action contracts.

---

## Migration and Feature-Flag Rollout (OAR-024)

Migration/backfill contract:

1. `convex/migrations/backfillOrgAgentActionRuntime.ts` backfills OAR migration metadata + rollout flags on canonical runtime artifacts (`org_agent_activity`, `org_agent_action_item`, `org_crm_sync_candidate`) in dry-run-first batches.
2. `convex/migrations/backfillTransactions.ts` now emits rollout-flag readiness derived from canonicalized transaction history so CRM-sync enablement is evidence-based.
3. Rollout flags remain fail-closed by default for external execution (`externalExecutionEnabled: false`) until explicit post-`OAR-021` expansion.

Rollout phases:

1. `capture_enabled` + `owner_workflow_enabled`: on by default once migration patch is present.
2. `connector_sync_enabled`: enabled only after canonical history backfill confirms readiness.
3. `external_execution_enabled`: remains off in internal-only V1, independent of sync readiness.

Operator commands (dry-run first):

1. `npx convex run migrations/backfillOrgAgentActionRuntime:backfillOrgAgentActionRuntimeBatch '{"dryRun":true,"objectType":"org_agent_action_item","numItems":50}'`
2. `npx convex run migrations/backfillOrgAgentActionRuntime:backfillOrgAgentActionRuntimeBatch '{"dryRun":false,"objectType":"org_agent_action_item","numItems":50}'`
3. `npx convex run migrations/backfillTransactions:backfillTransactions '{"cursor":null}'`

---

## Canary Rollout and Rollback Gate (OAR-026)

Named owner:

1. Primary owner: `runtime_oncall` (Agent Runtime On-Call owner for OAR canary decisions).
2. Secondary owner: `ops_owner` (Operator QA escalation + runbook execution owner).

Canary scope:

1. Keep `external_execution_enabled` fail-closed (`false`) for all orgs during canary.
2. Canary validates capture/owner-workflow/narrow-sync reliability only; no broad connector-side action execution.
3. Canary window: minimum 7 days of continuous evidence collection after `OAR-025` matrix completion.

Rollback trigger matrix:

| Trigger signal | Rollback threshold | Immediate action | Owner | Evidence source |
|---|---|---|---|---|
| Runtime integration regression | Any `V-INTEG-RUNTIME` failure | Halt rollout, set canary status `HOLD`, open incident | `runtime_oncall` | `npx vitest run tests/integration/ai/sessionRouting.integration.test.ts tests/integration/ai/approvalPolicy.integration.test.ts tests/integration/ai/orgActionRuntime.integration.test.ts tests/integration/ai/orgCrmSync.integration.test.ts tests/integration/ai/orgActionMigration.integration.test.ts` |
| Trust UX regression | Any `V-E2E-TRUST` failure | Block promotion, publish QA defect + mitigation ticket | `ops_owner` | `npx playwright test tests/e2e/agent-trust-experience.spec.ts` |
| Receipt reliability degradation | Stuck/processing receipts exceed configured warning baseline for two consecutive checks | Keep canary fail-closed and run replay-safe diagnostics only | `runtime_oncall` | Trust Cockpit receipt reliability panel + `agentSessions.getStuckReceipts` |
| Connector execution drift | Any evidence of connector-side broad action execution without explicit gate | Immediate rollback and connector gate freeze | `runtime_oncall` | `resolveOrgExternalActionDispatchGate` audit trails + `external_connector_dispatch_attempt` object actions |
| Docs/runbook drift | `docs:guard` failure on rollout docs | Freeze rollout communications until docs are corrected | `ops_owner` | `npm run docs:guard` |

Fail-closed proof for connector execution defaults:

1. `crmAiTools.readExternalExecutionConfig` defaults to `enabled: false` + empty `connectorAllowlist`.
2. `resolveOrgExternalActionDispatchGate` blocks unless org gate is enabled, target is external connector, work item is approved, and connector is allowlisted.
3. `dispatchCrmSyncOutbox` remains fail-closed unless request sets `externalWritesEnabled: true`.
4. `requestReplaySafeReceipt` now rejects replay intent for `blocked_processing` and `terminal_completed` dispositions.

Runbook actions when rollback triggers fire:

1. Record trigger + timestamp in OAR incident notes with associated command output links.
2. Set rollout state to `HOLD` and disable any pending canary expansion toggles.
3. Re-run `V-INTEG-RUNTIME`, `V-E2E-TRUST`, and `V-DOCS` after mitigations; only resume when all pass.

Expansion gate beyond internal-only V1:

1. Require `OAR-032` (`eval + SLO gates`) and `OAR-035` (`existing-agent topology migration evidence`) as `DONE`.
2. Require explicit owner signoff from both `runtime_oncall` and `ops_owner` in this plan section.
3. Keep connector-side broad execution disabled by default until gate evidence is appended with a dated approval record.

---

## Architecture decisions

### 1. Canonical state first

1. The platform remains the mutation authority for CRM objects, activities, action items, approvals, and receipts.
2. External CRM writes are downstream projections only.
3. Connector failures may delay downstream sync, but must not roll back canonical platform history.

### 2. Activity is immutable, work is mutable

1. `org_agent_activity` is append-only and models facts: outcome captured, approval requested, execution failed, sync succeeded, takeover started, and similar events.
2. `org_agent_action_item` is mutable and models owner workflow state: pending review, assigned, approved, executing, completed, failed, canceled.
3. Every action-item state change emits a new immutable activity row.

### 3. Telephony is an operator-runtime ingress, not a separate product

1. Veronica-style telephony agents must enter via the existing One-of-One Operator runtime.
2. Telephony transcripts, call outcomes, transfer events, and takeover markers must resolve to `agentSessions` and conversations.
3. The telephony provider remains an ingress transport, not a second canonical state machine.

### 4. Existing primitives are reused before new subsystems

1. User-visible business artifacts should live in `objects`, `objectLinks`, and `objectActions`.
2. Existing approval and HITL patterns stay authoritative.
3. Dedicated system tables are reserved for queue-heavy concerns such as retryable outbox jobs or execution attempts.

---

## Canonical entity model

| Entity | Storage strategy | Purpose | Key invariants |
|---|---|---|---|
| `org_agent_activity` | ontology object + `objectLinks` + `objectActions` | immutable business/event history | append-only; one row per event; never re-opened |
| `org_agent_action_item` | ontology object + `objectLinks` + `objectActions` | owner/agent actionable work | stateful; linked to source activity and target CRM objects |
| policy snapshot | embedded on activity/action-item payloads plus policy resolver module | explains why a decision was `owner_only`, `approval_required`, or `agent_auto_allowed` | snapshot stored on write so later policy edits do not rewrite history |
| execution receipt | dedicated table plus linked activity | replay-safe execution attempt details | idempotency key required; attempts correlated to action item and session |
| sync outbox job | dedicated table plus linked activity | downstream CRM projection queue | retries are safe and connector-agnostic |
| external identity binding | dedicated table or link set | maps canonical platform object IDs to external CRM record IDs | canonical platform object always wins on conflict |

Recommended activity kinds:

1. `session_outcome_captured`
2. `crm_projection_applied`
3. `action_item_created`
4. `approval_requested`
5. `approval_resolved`
6. `action_assigned`
7. `execution_started`
8. `execution_succeeded`
9. `execution_failed`
10. `human_takeover_started`
11. `human_takeover_resumed`
12. `external_sync_dispatched`
13. `external_sync_succeeded`
14. `external_sync_failed`

---

## Runtime flow

1. Ingress arrives from telephony, webchat, or follow-up runtime.
2. `agentSessions` and conversations resolve the canonical session and message history.
3. Structured outcome extraction produces a channel-agnostic outcome envelope.
4. Canonical CRM projection writes platform CRM state first.
5. Immutable activity is written for the outcome and CRM projection.
6. Action-item generation creates mutable owner work only when unresolved work remains.
7. Policy engine resolves `owner_only`, `approval_required`, or `agent_auto_allowed`.
8. Owner Action Center list/Kanban workflows or low-risk auto-runner execute through the shared preview-to-receipt contract.
9. Downstream CRM sync outbox projects allowed changes outward.
10. Every stage emits immutable activity plus operational telemetry and receipts.

---

## Channel and owner workflow model

| Path | Entry surface | Canonical runtime | Owner touchpoint | Notes |
|---|---|---|---|---|
| Telephony | `convex/integrations/telephony.ts` | One-of-One Operator runtime via `agentSessions` | Action Center + takeover flows | Veronica-style calls must not bypass session routing |
| Webchat | `/api/v1/webchat/*` and conversations | `agentSessions` + conversations | Action Center + in-thread takeover | Must emit same outcome contract as telephony |
| Follow-up execution | internal action runner | `orgAgentFollowUpRuntime` + action items | Action Center retry/review | Used after original conversation ends |

Owner actions that must be supported:

1. approve
2. reject
3. assign
4. complete
5. retry
6. take over
7. resume agent

Kanban control requirements:

1. Board columns map directly to canonical action-item states (no UI-only pseudo-states).
2. Column movement must execute the same policy checks and receipt emission as list/detail actions.
3. Filter rail must include default `all` and per-agent filters sourced from active catalog metadata.
4. Agent filter taxonomy must stay in sync with catalog/ontology updates without requiring manual UI relabeling.

---

## Policy and approval model

Policy families:

1. `owner_only`: agent may propose, but only owner/human execution is allowed.
2. `approval_required`: agent may preview and queue for approval, but cannot execute until approved.
3. `agent_auto_allowed`: agent may execute only when the action is inside the low-risk allowlist and all contract checks pass.

Required dimensions for the resolver:

1. action family
2. risk level
3. channel source
4. org-level policy
5. agent-level overrides
6. target system class (`platform_internal` versus `external_connector`)

Approval posture:

1. Reuse `agentApprovals` and approval-style patterns.
2. Persist approval state as linked artifacts in the same timeline.
3. Missing approval evidence, missing policy snapshot, or missing idempotency key must fail closed.

---

## API and UI surfaces

Backend surfaces:

1. Extend `convex/ai/agentSessions.ts` and `convex/ai/conversations.ts` with outcome checkpoints and action-runtime hooks.
2. Extend `convex/api/v1/conversations.ts` for session/action context and takeover parity.
3. Extend `convex/api/v1/crm.ts` only for narrow downstream sync breadth and canonical CRM projections.
4. Add new internal modules for activities, action items, policy resolution, execution receipts, and sync outbox.

UI surfaces:

1. Action Center list, Kanban board, and detail workflow under `src/components/window-content/agents/*`.
2. Immutable activity timeline under agents and CRM detail surfaces.
3. Control-center and trust-cockpit extensions for policy basis, receipts, blocked retry reasons, and agent filter diagnostics.
4. CRM detail embeds for contact and organization context.

---

## External CRM sync architecture

1. Canonical platform CRM writes finish first.
2. A connector-agnostic outbox job is created from canonical state deltas.
3. External identity bindings map platform object IDs to downstream record IDs.
4. Narrow V1 outward sync covers contact/org upsert and note/activity append only.
5. Broader connector-side action execution is a separate gated phase after internal-only V1.

Failure handling:

1. Outbound failures create activity plus receipts and remain retryable.
2. Connector retries must be idempotent.
3. External conflicts do not rewrite canonical platform history.

---

## Observability, receipts, retries, and idempotency

Required reliability contract:

1. one correlation chain from session to activity to action item to receipt to sync job,
2. explicit idempotency key on every execution and sync attempt,
3. replay-safe receipts for action execution and outbound sync,
4. activity protocol events for operational visibility,
5. trust telemetry for policy, approval, and failure-path diagnostics.

This gives three distinct layers:

1. `org_agent_activity` for user-visible immutable business history,
2. `objectActions` for audit trail on mutations,
3. `activityProtocol` and trust telemetry for operational diagnostics.

---

## Acceptance criteria mapped to queue rows

| Acceptance criterion | Queue rows | Verification profiles |
|---|---|---|
| Canonical architecture, lanes, and internal-only V1 gates are frozen | `OAR-001`, `OAR-002` | `V-DOCS` |
| Architecture-preflight inventory is complete before remaining runtime implementation | `OAR-033` | `V-DOCS` |
| Immutable activity and mutable action-item schema contract exists | `OAR-003`, `OAR-005` | `V-TYPE`; `V-UNIT-CONTRACT`; `V-DOCS` |
| Structured outcomes are captured for telephony, webchat, and follow-up | `OAR-004`, `OAR-008`, `OAR-009`, `OAR-010` | `V-TYPE`; `V-UNIT-INGRESS`; `V-INTEG-RUNTIME`; `V-DOCS` |
| Canonical CRM writes happen before any outbound sync | `OAR-006`, `OAR-019` | `V-TYPE`; `V-UNIT-SYNC`; `V-DOCS` |
| Org policy, approval, and auto-execution contracts are enforced | `OAR-011`, `OAR-012`, `OAR-013`, `OAR-014` | `V-TYPE`; `V-UNIT-POLICY`; `V-UNIT-OBS`; `V-DOCS` |
| Owner Action Center list/Kanban workflows, agent filters, and immutable timeline are usable | `OAR-015`, `OAR-016`, `OAR-017`, `OAR-018` | `V-TYPE`; `V-UNIT-UI`; `V-E2E-TRUST`; `V-DOCS` |
| Narrow external CRM sync V1 is stable and auditable | `OAR-020` | `V-TYPE`; `V-UNIT-SYNC`; `V-INTEG-RUNTIME`; `V-DOCS` |
| Receipts, retries, idempotency, and telemetry are complete | `OAR-022`, `OAR-023` | `V-TYPE`; `V-UNIT-OBS`; `V-DOCS` |
| Migration, test matrix, and rollout evidence are complete | `OAR-024`, `OAR-025`, `OAR-026` | `V-INTEG-RUNTIME`; `V-E2E-TRUST`; `V-E2E-DESKTOP`; `V-DOCS` |
| Topology/finish gates for reusable harness are enforced | `OAR-027`, `OAR-028`, `OAR-029`, `OAR-030`, `OAR-031`, `OAR-032` | `V-TYPE`; `V-UNIT-KERNEL`; `V-UNIT-OBS`; `V-INTEG-RUNTIME`; `V-DOCS` |
| Existing agents are topology-mapped and migrated with fail-closed gates | `OAR-033`, `OAR-034`, `OAR-035` | `V-TYPE`; `V-UNIT-TOPOLOGY`; `V-DOCS` |

---

## Lane execution map

| Lane | Rows | Outcome |
|---|---|---|
| `A` | `OAR-001`, `OAR-002`, `OAR-027` | Docs baseline, queue contract, and explicit platform-finished architecture definition |
| `B` | `OAR-003`, `OAR-004`, `OAR-005`, `OAR-006` | Canonical contracts, outcomes, activities, and platform-first CRM projection |
| `C` | `OAR-007`, `OAR-008`, `OAR-009`, `OAR-010` | Telephony/webchat/follow-up runtime convergence |
| `D` | `OAR-011`, `OAR-012`, `OAR-013`, `OAR-014` | Policy, approvals, execution, and low-risk auto-runner |
| `E` | `OAR-015`, `OAR-016`, `OAR-017`, `OAR-018` | Owner Action Center list/Kanban workflows, timeline, and embedded surfaces |
| `F` | `OAR-019`, `OAR-020`, `OAR-021` | Downstream CRM sync and gated external execution |
| `G` | `OAR-022`, `OAR-023` | Reliability, retries, and diagnostics |
| `H` | `OAR-024`, `OAR-025`, `OAR-026` | Migration, verification, rollout, and expansion gate |
| `I` | `OAR-033`, `OAR-028`, `OAR-029`, `OAR-030`, `OAR-031`, `OAR-032`, `OAR-034`, `OAR-035` | Reusable harness finish gates: architecture preflight, topology, kernel stability, bounded execution, package contract, eval/SLO promotion gates, and existing-agent migration |

---

## Dependency map

Internal lane gates:

1. Lane `B` starts only after lane `A` `P0` rows are `DONE`.
2. Architecture-preflight row `OAR-033` starts after `OAR-027` is `DONE`.
3. Remaining lane `B` implementation rows (`OAR-005` onward) start only after `OAR-033` is `DONE`.
4. Lane `C` starts only after `OAR-003` is `DONE`.
5. Lane `D` starts only after `OAR-005` and `OAR-009` are `DONE`.
6. Lane `E` starts only after `OAR-005` and `OAR-012` are `DONE`.
7. Lane `F` starts only after `OAR-006` and `OAR-013` are `DONE`.
8. Lane `G` starts only after `OAR-013` and `OAR-019` are `DONE`.
9. Lane `H` starts only after all prior `P0` rows are `DONE` or explicitly `BLOCKED`.
10. Lane `I` enforcement rows (`OAR-028`, `OAR-029`, `OAR-030`, `OAR-031`, `OAR-032`, `OAR-034`, `OAR-035`) start only after `OAR-013` and `OAR-022` are `DONE`.

Release gates:

1. Internal-only V1 completes at `OAR-025`.
2. Expansion beyond narrow external sync is considered only after `OAR-026`.
3. Platform-finished promotion gate requires `OAR-032`.
4. Existing-agent topology migration gate requires `OAR-035` before broad profile enforcement.

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Telephony remains on a parallel prompt-only path | high | Gate telephony work on `OAR-007` and fail closed on unresolved route identity |
| Activity and action-item semantics get conflated | high | Freeze entity split in `OAR-003` and require timeline rendering to respect it in `OAR-017` |
| External CRM becomes a hidden source of truth | high | Make `OAR-006` and `OAR-019` platform-first; external sync is outbox only |
| Approval and policy logic drift across UI and backend | high | Centralize policy in `OAR-011`; all UI consumes backend snapshots only |
| Missing idempotency leads to duplicate execution or sync | high | Require receipt/idempotency layer in `OAR-013` and `OAR-022` before rollout |
| Internal-only V1 scope expands too early | medium | Keep `OAR-014`, `OAR-020`, and `OAR-026` explicitly gate-driven and fail closed |
| Owner UX becomes another generic chat surface | medium | Keep Action Center operational and queue-first in `OAR-015` and `OAR-016` |
| Agent filter taxonomy drifts from active catalog roles | medium | Bind Kanban filters to catalog metadata contract in `OAR-015`; validate parity in `V-UNIT-UI` |
| Unbounded external awaits create stuck-turn perception and delayed finalization | high | Enforce bounded-await and terminalization contracts in `OAR-030` with `V-UNIT-KERNEL` and runtime integration evidence |
| Existing agents continue with implicit topology/tool-calling behavior | high | Require inventory + profile mapping in `OAR-033`, contract enforcement in `OAR-034`, and migration gate evidence in `OAR-035` |

---

## Exit criteria

1. All `P0` rows are `DONE`.
2. Telephony, webchat, and follow-up execution share one structured outcome contract.
3. Canonical platform CRM projection is stable before outbound sync.
4. Action Center list/Kanban workflows and immutable timeline are operational for org owners.
5. Receipts, retries, idempotency, telemetry, and takeover evidence are complete.
6. Internal-only V1 passes the full test matrix and canary rollout gate.
7. Topology profile is explicit and runtime-enforced for this workstream (`single_agent_loop` baseline + profile adapter path).
8. Kernel contract and profile adapter surface are versioned and stable.
9. All external await paths are bounded with timeout/retry/fallback and turn terminalization evidence.
10. Agent package and eval-gate contracts are in place for config-first onboarding.
11. Existing agents are mapped to declared topology profiles and pass compatibility checks.
12. `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md` are synchronized and pass docs guard.
