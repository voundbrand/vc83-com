# LayerCake Platform Agent Stack

**Workstream:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/agent-creation-experience-convergence`  
**Date:** 2026-02-19

---

## Purpose

Define the platform agents that must exist before broad rollout so users can:

1. create useful agents quickly,
2. connect workflows and channels safely,
3. improve productivity after activation,
4. run eval-backed releases with clear operator decisions.

---

## Layer definitions

1. `L0 Runtime` - model routing, tool runtime, channel/session infrastructure.
2. `L1 Orchestrator` - routes each request to the right platform agent and enforces stop conditions.
3. `L2 Platform Agents` - specialist agents for creation, deployment, trust, productivity, and eval operations.
4. `L3 User Agents` - customer-created agents and workflows generated through L2-guided flows.

---

## Canonical L2 platform agents

| Agent | Primary responsibility | Required outputs | Stop conditions (must return to orchestrator) |
|---|---|---|---|
| `platform_orchestrator` | Own request intake, deterministic routing, and cross-agent lifecycle state | `routing_decision.v1`, `handoff_payload.v1` | `resolved_intent`, `needs_user_input`, `blocked_missing_context`, `blocked_policy` |
| `agent_creation_architect` | Convert goal into a concrete agent mission, scope, constraints, and acceptance criteria | `creation_brief.v1` | `brief_approved`, `brief_rejected`, `needs_constraints`, `blocked_policy` |
| `workflow_builder` | Convert approved brief into runnable workflow graph and tool plan | `workflow_spec.v1` | `workflow_ready`, `workflow_rejected`, `needs_tool_mapping`, `blocked_runtime_dependency` |
| `integration_deployment_guide` | Produce channel setup and deployment run path for supported channels | `deployment_packet.v1` | `deployment_ready`, `deployment_blocked`, `needs_credentials`, `blocked_policy` |
| `soul_binding_coach` | Run optional advanced trust interview flow with explicit consent checkpoints | `soul_proposal.v1`, `consent_checkpoint.v1` | `consent_declined`, `proposal_ready`, `safety_hold`, `blocked_policy` |
| `productivity_coach` | Optimize post-activation operating loop and remove throughput bottlenecks | `productivity_plan.v1` | `plan_accepted`, `plan_rejected`, `needs_usage_signal`, `blocked_policy` |
| `eval_analyst` | Run and summarize model/workflow/live/telemetry evidence and release recommendation | `eval_decision_packet.v1` | `decision_proceed`, `decision_hold`, `decision_rollback`, `needs_more_evidence` |

### Canonical responsibility boundaries

1. `platform_orchestrator` is the only agent that may assign a new owner agent.
2. Specialist agents may emit one of their documented stop conditions only.
3. Specialists may not directly re-route to another specialist; every transfer returns to orchestrator.
4. `soul_binding_coach` is optional and post-activation; orchestrator cannot require it to complete initial create/deploy flow.
5. `eval_analyst` owns release decision output labels and must emit only `proceed`, `hold`, or `rollback`.

---

## Handoff contract (required for every transfer)

All orchestrator-to-specialist and specialist-to-orchestrator transitions must use `handoff_payload.v1`.

### `handoff_payload.v1` schema

| Field | Type | Required | Contract |
|---|---|---|---|
| `handoff_id` | string | yes | Globally unique for session. |
| `session_id` | string | yes | Stable session identifier. |
| `source_agent` | enum | yes | One of canonical agent IDs in this doc. |
| `target_agent` | enum | yes | One of canonical agent IDs in this doc. |
| `objective` | string | yes | Single testable objective statement. |
| `priority` | enum | yes | `p0`, `p1`, `p2`. |
| `inputs` | object | yes | Payload that conforms to target `input_schema`. |
| `required_artifacts` | string[] | yes | Artifact IDs that must exist before execution. |
| `evidence_refs` | string[] | yes | Prior outputs used to justify route. |
| `allowed_stop_conditions` | string[] | yes | Subset of documented stop conditions for target. |
| `failure_policy` | enum | yes | `return_with_blocker`, `request_user_input`, `rollback_to_previous_state`. |
| `created_at` | string | yes | ISO-8601 UTC timestamp. |

### Deterministic contract checks

1. `target_agent` and `objective` must map to one route in orchestrator policy.
2. `inputs` must validate against the target `input_schema` before execution.
3. Target output must validate against the declared `output_schema` before returning control.
4. If target returns a stop reason not in `allowed_stop_conditions`, route is marked `blocked_policy`.
5. `failure_policy` must execute without specialist-defined branching.

---

## Routing policy for creation and productivity workflows

`platform_orchestrator` must route by first-match on this ordered table. If multiple predicates match at the same priority, emit `blocked_policy` and request operator correction.

| Route ID | Priority | Predicate (all required) | Target agent | Expected output |
|---|---|---|---|---|
| `R-001-CREATION-BRIEF` | `p0` | `intent in {create_agent, revise_scope}` and `creation_brief.v1` absent | `agent_creation_architect` | `creation_brief.v1` |
| `R-002-WORKFLOW-SPEC` | `p0` | `intent in {build_workflow, create_agent}` and `creation_brief.v1` present and `workflow_spec.v1` absent | `workflow_builder` | `workflow_spec.v1` |
| `R-003-DEPLOYMENT` | `p0` | `intent in {deploy_agent, setup_channel}` and `workflow_spec.v1` present | `integration_deployment_guide` | `deployment_packet.v1` |
| `R-004-PRODUCTIVITY` | `p1` | `intent in {optimize_productivity, refine_workflow}` and `agent_status=active` | `productivity_coach` | `productivity_plan.v1` |
| `R-005-SOUL-BINDING` | `p1` | `intent=advanced_reflection` and `consent_state=granted` and `agent_status=active` | `soul_binding_coach` | `soul_proposal.v1` |
| `R-006-EVAL` | `p0` | `intent in {run_eval, gate_release}` and `workflow_spec.v1` present | `eval_analyst` | `eval_decision_packet.v1` |

### Routing invariants

1. `R-001` -> `R-003` is the only valid sequence for initial creation/deployment.
2. `R-005` may not run unless `consent_state=granted`; otherwise route to `blocked_policy`.
3. `R-006` may return only `proceed`, `hold`, or `rollback` release labels.
4. Any missing required artifact in route predicate must return `blocked_missing_context`, never inferred defaults.

---

## Prompt and interface contracts

Every L2 agent must publish a deterministic prompt/interface contract with explicit schemas and stop conditions.

### `agent_prompt_contract.v1` (required per agent)

| Field | Type | Required | Contract |
|---|---|---|---|
| `agent_id` | enum | yes | Canonical ID from this doc. |
| `system_goal` | string | yes | One immutable role statement. |
| `allowed_actions` | string[] | yes | Closed action set for the agent. |
| `disallowed_actions` | string[] | yes | Explicit deny list enforced in review. |
| `input_schema` | string | yes | Schema name with version, e.g. `creation_architect.input.v1`. |
| `output_schema` | string | yes | Schema name with version, e.g. `creation_architect.output.v1`. |
| `stop_conditions` | string[] | yes | Closed set; output must pick exactly one when returning. |
| `determinism_rules` | string[] | yes | Required response constraints and no-guessing rules. |

### `agent_result.v1` output envelope

| Field | Type | Required | Contract |
|---|---|---|---|
| `handoff_id` | string | yes | Must equal incoming handoff ID. |
| `agent_id` | enum | yes | Executing agent ID. |
| `status` | enum | yes | `completed`, `needs_user_input`, `blocked`, `rejected`. |
| `stop_condition` | string | yes | Must be one value from route `allowed_stop_conditions`. |
| `produced_artifacts` | string[] | yes | Artifact IDs written by this step. |
| `missing_inputs` | string[] | no | Required only when `status=needs_user_input` or `blocked`. |
| `blocker_code` | string | no | Required when `status=blocked`. |
| `next_action` | string | yes | Deterministic operator-visible next step. |

### Per-agent schema contracts

| Agent | Input schema (`*.input.v1`) required keys | Output schema (`*.output.v1`) required keys | Stop conditions |
|---|---|---|---|
| `agent_creation_architect` | `user_goal`, `business_constraints`, `target_channels`, `success_metric` | `agent_role`, `scope_in`, `scope_out`, `acceptance_checks`, `open_questions` | `brief_approved`, `brief_rejected`, `needs_constraints`, `blocked_policy` |
| `workflow_builder` | `creation_brief_ref`, `tool_catalog_refs`, `policy_constraints` | `workflow_steps`, `tool_bindings`, `failure_fallbacks`, `verification_plan` | `workflow_ready`, `workflow_rejected`, `needs_tool_mapping`, `blocked_runtime_dependency` |
| `integration_deployment_guide` | `workflow_spec_ref`, `channel_targets`, `integration_state` | `deployment_steps`, `env_requirements`, `rollback_steps`, `post_deploy_checks` | `deployment_ready`, `deployment_blocked`, `needs_credentials`, `blocked_policy` |
| `productivity_coach` | `usage_summary`, `error_clusters`, `goal_delta` | `bottleneck_rank`, `optimization_plan`, `owner_actions`, `success_review_window` | `plan_accepted`, `plan_rejected`, `needs_usage_signal`, `blocked_policy` |
| `soul_binding_coach` | `consent_token`, `trust_artifact_refs`, `reflection_goal` | `consent_checkpoint`, `proposed_updates`, `risk_assessment`, `rollback_plan` | `consent_declined`, `proposal_ready`, `safety_hold`, `blocked_policy` |
| `eval_analyst` | `model_eval_refs`, `workflow_eval_refs`, `live_eval_refs`, `telemetry_refs` | `decision`, `failed_metrics`, `severity`, `required_remediation` | `decision_proceed`, `decision_hold`, `decision_rollback`, `needs_more_evidence` |

### Prompt determinism requirements

1. Agents must not infer missing required keys; they must return `needs_user_input` with exact missing fields.
2. Agents must emit schema-conformant JSON outputs before any narrative explanation.
3. `eval_analyst` decision labels are closed set: `proceed`, `hold`, `rollback`.
4. `soul_binding_coach` must reject execution without a valid `consent_token`.
5. `platform_orchestrator` must reject any specialist result whose `stop_condition` is not declared for that route.

---

## Bootstrap order (required)

1. Implement `Platform Orchestrator` + `Agent Creation Architect`.
2. Add `Workflow Builder` and `Integration and Deployment Guide`.
3. Add `Productivity Coach` and `Soul Binding Coach`.
4. Add `Eval Analyst` and wire release-gate outputs.

---

## Guardrails

1. Do not mutate `trust-artifacts.v1` schema in this stream.
2. Do not bypass consent checkpoints for soul-binding outputs.
3. Do not expose soul-binding as a required day-one onboarding step.
4. Do not release if Eval Analyst reports failed `P0` gates.

---

## Super-admin privileged mode

Use one constrained capability only:

1. Capability: `platform_soul_admin`.
2. Scope: platform-agent souls only (`L2`); user-agent souls (`L3`) are excluded.
3. Actions: `view`, `propose`, `approve_apply`, `rollback`.
4. Controls: step-up auth, time-limited elevation, dual-approval for production apply.
5. Audit: reason code + ticket id required; every action emits auditable trust events.
