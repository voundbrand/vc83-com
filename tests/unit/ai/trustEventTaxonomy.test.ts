import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  TRUST_ADMIN_REQUIRED_ADDITIONAL_FIELDS,
  TRUST_APPOINTMENT_CALL_REQUIRED_ADDITIONAL_FIELDS,
  TRUST_AUTONOMY_REQUIRED_ADDITIONAL_FIELDS,
  TRUST_CODE_EXECUTION_REQUIRED_ADDITIONAL_FIELDS,
  TRUST_EVENT_NAME_VALUES,
  TRUST_MACOS_COMPANION_DELIVERY_REQUIRED_ADDITIONAL_FIELDS,
  TRUST_MACOS_COMPANION_INGRESS_REQUIRED_ADDITIONAL_FIELDS,
  getTrustEventSpecification,
  isDeterministicTrustEventName,
  isModeAllowedForTrustEvent,
  validateTrustEventPayload,
} from "../../../convex/ai/trustEvents";

const BASE_PAYLOAD = {
  event_id: "evt_001",
  event_version: "v1",
  occurred_at: 1_739_800_000_000,
  org_id: "org_001" as Id<"organizations">,
  mode: "lifecycle" as const,
  channel: "webchat",
  session_id: "sess_001",
  actor_type: "system" as const,
  actor_id: "system",
};

describe("trust event taxonomy contract", () => {
  it("registers deterministic trust event names without duplicates", () => {
    expect(TRUST_EVENT_NAME_VALUES).toHaveLength(63);
    expect(new Set(TRUST_EVENT_NAME_VALUES).size).toBe(TRUST_EVENT_NAME_VALUES.length);
    expect(
      TRUST_EVENT_NAME_VALUES.every((eventName) => isDeterministicTrustEventName(eventName)),
    ).toBe(true);
  });

  it("keeps mode-aware routing for lifecycle/setup/agents/admin/runtime contracts", () => {
    expect(
      isModeAllowedForTrustEvent("trust.brain.content_dna.composed.v1", "lifecycle"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.brain.content_dna.composed.v1", "brain"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.setup.artifact_generated.v1", "setup"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.soul.proposal_created.v1", "agents"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.tool_foundry.proposal_created.v1", "runtime"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.tool_foundry.promotion_requested.v1", "agents"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.tool_foundry.promotion_granted.v1", "agents"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.tool_foundry.promotion_denied.v1", "agents"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.tool_foundry.execution_blocked.v1", "runtime"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.admin.training_session_started.v1", "admin"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.admin.platform_soul_action_audited.v1", "admin"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.guardrail.appointment_call_approval_requested.v1", "runtime"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.guardrail.code_execution_requested.v1", "runtime"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.guardrail.code_execution_outcome.v1", "runtime"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.runtime.macos_companion_ingress_observed.v1", "runtime"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.guardrail.vacation_policy_evaluated.v1", "runtime"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.context.layer_violation_blocked.v1", "runtime"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.lifecycle.operator_reply_in_stream.v1", "lifecycle"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.voice.session_transition.v1", "lifecycle"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.voice.adaptive_flow_decision.v1", "runtime"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.autonomy.promotion_proposed.v1", "runtime"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.autonomy.demotion_triggered.v1", "agents"),
    ).toBe(true);

    expect(
      isModeAllowedForTrustEvent("trust.setup.artifact_generated.v1", "brain"),
    ).toBe(false);
    expect(
      isModeAllowedForTrustEvent("trust.tool_foundry.execution_blocked.v1", "admin"),
    ).toBe(false);
    expect(
      isModeAllowedForTrustEvent("trust.voice.session_transition.v1", "runtime"),
    ).toBe(false);
    expect(
      isModeAllowedForTrustEvent("trust.guardrail.appointment_call_approval_requested.v1", "agents"),
    ).toBe(false);
    expect(
      isModeAllowedForTrustEvent("trust.guardrail.code_execution_requested.v1", "admin"),
    ).toBe(false);
    expect(
      isModeAllowedForTrustEvent("trust.runtime.macos_companion_delivery_failed.v1", "setup"),
    ).toBe(false);
    expect(
      isModeAllowedForTrustEvent("trust.guardrail.vacation_decision_recorded.v1", "agents"),
    ).toBe(false);
    expect(
      isModeAllowedForTrustEvent("trust.autonomy.promotion_resolved.v1", "setup"),
    ).toBe(false);
  });

  it("requires super-admin parity fields for admin trust events", () => {
    const result = validateTrustEventPayload(
      "trust.admin.training_session_started.v1",
      {
        ...BASE_PAYLOAD,
        mode: "admin",
      },
    );

    expect(result.ok).toBe(false);
    expect(result.missing_additional_fields).toEqual(
      expect.arrayContaining([...TRUST_ADMIN_REQUIRED_ADDITIONAL_FIELDS]),
    );
  });

  it("requires privileged platform-soul fields for privileged admin trust events", () => {
    const result = validateTrustEventPayload(
      "trust.admin.platform_soul_action_audited.v1",
      {
        ...BASE_PAYLOAD,
        mode: "admin",
      },
    );

    expect(result.ok).toBe(false);
    expect(result.missing_additional_fields).toEqual(
      expect.arrayContaining([
        "platform_agent_id",
        "privileged_action",
        "privileged_reason_code",
        "privileged_ticket_id",
        "privileged_elevation_id",
        "privileged_step_up_verified_at",
        "privileged_elevation_expires_at",
        "privileged_decision",
      ]),
    );
  });

  it("requires appointment-call compliance fields for appointment guardrail trust events", () => {
    const result = validateTrustEventPayload(
      "trust.guardrail.appointment_call_approval_requested.v1",
      {
        ...BASE_PAYLOAD,
        mode: "runtime",
      },
    );

    expect(result.ok).toBe(false);
    expect(result.missing_additional_fields).toEqual(
      expect.arrayContaining([
        ...TRUST_APPOINTMENT_CALL_REQUIRED_ADDITIONAL_FIELDS,
      ]),
    );
  });

  it("requires trust-accumulation fields for autonomy promotion/demotion trust events", () => {
    const result = validateTrustEventPayload(
      "trust.autonomy.promotion_proposed.v1",
      {
        ...BASE_PAYLOAD,
        mode: "runtime",
      },
    );

    expect(result.ok).toBe(false);
    expect(result.missing_additional_fields).toEqual(
      expect.arrayContaining([
        ...TRUST_AUTONOMY_REQUIRED_ADDITIONAL_FIELDS,
      ]),
    );
  });

  it("requires sandbox-governance fields for code execution trust events", () => {
    const result = validateTrustEventPayload(
      "trust.guardrail.code_execution_requested.v1",
      {
        ...BASE_PAYLOAD,
        mode: "runtime",
      },
    );

    expect(result.ok).toBe(false);
    expect(result.missing_additional_fields).toEqual(
      expect.arrayContaining([
        ...TRUST_CODE_EXECUTION_REQUIRED_ADDITIONAL_FIELDS,
      ]),
    );
  });

  it("requires mac companion observability fields for ingress and delivery trust events", () => {
    const invalidIngress = validateTrustEventPayload(
      "trust.runtime.macos_companion_ingress_observed.v1",
      {
        ...BASE_PAYLOAD,
        mode: "runtime",
      },
    );
    expect(invalidIngress.ok).toBe(false);
    expect(invalidIngress.missing_additional_fields).toEqual(
      expect.arrayContaining([
        ...TRUST_MACOS_COMPANION_INGRESS_REQUIRED_ADDITIONAL_FIELDS,
      ]),
    );

    const invalidDelivery = validateTrustEventPayload(
      "trust.runtime.macos_companion_delivery_failed.v1",
      {
        ...BASE_PAYLOAD,
        mode: "runtime",
      },
    );
    expect(invalidDelivery.ok).toBe(false);
    expect(invalidDelivery.missing_additional_fields).toEqual(
      expect.arrayContaining([
        ...TRUST_MACOS_COMPANION_DELIVERY_REQUIRED_ADDITIONAL_FIELDS,
      ]),
    );
  });

  it("requires telemetry payload fields for trust telemetry events", () => {
    const invalid = validateTrustEventPayload("trust.telemetry.kpi_checkpoint.v1", {
      ...BASE_PAYLOAD,
      mode: "runtime",
    });
    expect(invalid.ok).toBe(false);
    expect(invalid.missing_additional_fields).toEqual(
      expect.arrayContaining([
        "taxonomy_version",
        "event_namespace",
        "schema_validation_status",
        "metric_name",
        "metric_value",
      ]),
    );

    const valid = validateTrustEventPayload("trust.telemetry.kpi_checkpoint.v1", {
      ...BASE_PAYLOAD,
      mode: "runtime",
      taxonomy_version: "2026-02-17.v1",
      event_namespace: "trust.telemetry",
      schema_validation_status: "passed",
      metric_name: "trust_completion_rate",
      metric_value: 0.97,
    });
    expect(valid.ok).toBe(true);
  });

  it("surfaces mode violations in validation output", () => {
    const result = validateTrustEventPayload("trust.setup.artifact_generated.v1", {
      ...BASE_PAYLOAD,
      mode: "brain",
      setup_session_id: "setup_sess_1",
      artifact_kind: "agent-config",
      artifact_path: "/workspace/agent-config.json",
      artifact_checksum: "abc123",
      generator_model: "anthropic/claude-sonnet-4.5",
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("not allowed");
  });

  it("tracks required fields per event from the canonical specification map", () => {
    const spec = getTrustEventSpecification("trust.guardrail.policy_blocked.v1");
    expect(spec.allowed_modes).toEqual(["agents", "runtime"]);
    expect(spec.required_additional_fields).toEqual([
      "policy_type",
      "policy_id",
      "tool_name",
      "enforcement_decision",
      "override_source",
    ]);
  });

  it("requires lifecycle checkpoint fields for lifecycle transition events", () => {
    const invalid = validateTrustEventPayload(
      "trust.lifecycle.transition_checkpoint.v1",
      {
        ...BASE_PAYLOAD,
      },
    );
    expect(invalid.ok).toBe(false);
    expect(invalid.missing_additional_fields).toEqual(
      expect.arrayContaining([
        "lifecycle_state_from",
        "lifecycle_state_to",
        "lifecycle_checkpoint",
        "lifecycle_transition_actor",
        "lifecycle_transition_reason",
      ]),
    );
  });

  it("requires voice session transition fields for voice lifecycle events", () => {
    const invalid = validateTrustEventPayload(
      "trust.voice.session_transition.v1",
      {
        ...BASE_PAYLOAD,
      },
    );
    expect(invalid.ok).toBe(false);
    expect(invalid.missing_additional_fields).toEqual(
      expect.arrayContaining([
        "voice_session_id",
        "voice_state_from",
        "voice_state_to",
        "voice_transition_reason",
        "voice_runtime_provider",
      ]),
    );
  });

  it("accepts adaptive-flow payloads when required voice fields are present", () => {
    const valid = validateTrustEventPayload("trust.voice.adaptive_flow_decision.v1", {
      ...BASE_PAYLOAD,
      mode: "runtime",
      voice_session_id: "voice_sess_1",
      adaptive_phase_id: "phase_intro",
      adaptive_decision: "route_to_checkpoint_review",
      adaptive_confidence: 0.91,
      consent_checkpoint_id: "cp1_summary_review",
    });
    expect(valid.ok).toBe(true);
  });

  it("requires soul proposal payload fields for soul trust events", () => {
    const invalid = validateTrustEventPayload("trust.soul.proposal_created.v1", {
      ...BASE_PAYLOAD,
      mode: "agents",
    });
    expect(invalid.ok).toBe(false);
    expect(invalid.missing_additional_fields).toEqual(
      expect.arrayContaining([
        "proposal_id",
        "proposal_version",
        "risk_level",
        "review_decision",
        "rollback_target",
      ]),
    );

    const valid = validateTrustEventPayload("trust.soul.proposal_created.v1", {
      ...BASE_PAYLOAD,
      mode: "agents",
      proposal_id: "proposal_1",
      proposal_version: "overlay-v2",
      risk_level: "high",
      review_decision: "pending",
      rollback_target: "none",
    });
    expect(valid.ok).toBe(true);
  });

  it("requires tool foundry lifecycle payload fields for tool-foundry trust events", () => {
    const invalid = validateTrustEventPayload("trust.tool_foundry.execution_blocked.v1", {
      ...BASE_PAYLOAD,
      mode: "runtime",
    });
    expect(invalid.ok).toBe(false);
    expect(invalid.missing_additional_fields).toEqual(
      expect.arrayContaining([
        "proposal_id",
        "proposal_version",
        "tool_name",
        "risk_level",
        "review_decision",
        "rollback_target",
        "decision_reason",
        "correlation_id",
        "lineage_id",
        "thread_id",
        "workflow_key",
        "frontline_intake_trigger",
        "boundary_reason",
      ]),
    );

    const valid = validateTrustEventPayload("trust.tool_foundry.promotion_granted.v1", {
      ...BASE_PAYLOAD,
      mode: "agents",
      proposal_id: "toolspec:manage_quantum_invoices:org_1:session_1",
      proposal_version: "tool_spec_proposal_draft_v1",
      tool_name: "manage_quantum_invoices",
      risk_level: "high",
      review_decision: "approved",
      rollback_target: "rollback:toolspec:manage_quantum_invoices:org_1:session_1",
      decision_reason: "contract_tests_and_canary_metrics_passed",
      correlation_id:
        "lineage:tool_foundry:org_1|thread:tool_foundry:toolspec:manage_quantum_invoices:org_1:session_1|corr:trace_key",
      lineage_id: "lineage:tool_foundry:org_1",
      thread_id: "thread:tool_foundry:toolspec:manage_quantum_invoices:org_1:session_1",
      workflow_key: "tool_foundry_review",
      frontline_intake_trigger: "tool_failure",
      boundary_reason: "runtime_capability_gap_detected",
    });
    expect(valid.ok).toBe(true);
  });
});
