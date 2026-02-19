import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  TRUST_ADMIN_REQUIRED_ADDITIONAL_FIELDS,
  TRUST_EVENT_NAME_VALUES,
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
    expect(TRUST_EVENT_NAME_VALUES).toHaveLength(33);
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
      isModeAllowedForTrustEvent("trust.admin.training_session_started.v1", "admin"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.context.layer_violation_blocked.v1", "runtime"),
    ).toBe(true);
    expect(
      isModeAllowedForTrustEvent("trust.lifecycle.operator_reply_in_stream.v1", "lifecycle"),
    ).toBe(true);

    expect(
      isModeAllowedForTrustEvent("trust.setup.artifact_generated.v1", "brain"),
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
});
