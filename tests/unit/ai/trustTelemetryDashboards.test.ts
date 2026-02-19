import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { validateTrustEventPayload } from "../../../convex/ai/trustEvents";
import {
  TRUST_KPI_DEFINITIONS,
  TRUST_TELEMETRY_DASHBOARDS,
  VOICE_TRUST_PRE_ROLLOUT_BASELINES,
  buildTrustKpiCheckpointPayload,
  buildTrustTelemetryDashboardSnapshots,
  evaluateTrustKpiMetric,
  evaluateTrustRolloutGuardrails,
} from "../../../convex/ai/trustTelemetry";

describe("trust telemetry dashboards and rollout guardrails", () => {
  it("keeps KPI threshold contracts deterministic", () => {
    for (const definition of Object.values(TRUST_KPI_DEFINITIONS)) {
      expect(definition.windowHours).toBeGreaterThan(0);
      expect(definition.sourceEvents.length).toBeGreaterThan(0);

      if (definition.direction === "min") {
        expect(definition.criticalThreshold).toBeLessThan(definition.warningThreshold);
        expect(definition.warningThreshold).toBeLessThanOrEqual(definition.target);
      } else {
        expect(definition.target).toBeLessThanOrEqual(definition.warningThreshold);
        expect(definition.warningThreshold).toBeLessThan(definition.criticalThreshold);
      }
    }
  });

  it("pins voice KPI baseline values from pre-rollout observations", () => {
    expect(VOICE_TRUST_PRE_ROLLOUT_BASELINES).toEqual({
      voice_session_start_rate: 0.33,
      voice_session_completion_rate: 0.68,
      voice_cancel_without_save_rate: 0.27,
      voice_memory_consent_accept_rate: 0.62,
      voice_runtime_failure_rate: 0.04,
      agent_creation_handoff_success_rate: 0.78,
    });

    expect(TRUST_KPI_DEFINITIONS.voice_runtime_failure_rate.windowHours).toBe(1);
    expect(TRUST_KPI_DEFINITIONS.voice_session_completion_rate.target).toBe(0.7);
    expect(TRUST_KPI_DEFINITIONS.voice_memory_consent_accept_rate.warningThreshold).toBe(0.5);
  });

  it("maps each dashboard to known KPIs with severity rollups", () => {
    const snapshots = buildTrustTelemetryDashboardSnapshots({
      voice_session_start_rate: 0.34,
      voice_session_completion_rate: 0.69,
      voice_cancel_without_save_rate: 0.28,
      voice_memory_consent_accept_rate: 0.63,
      voice_runtime_failure_rate: 0.11,
      agent_creation_handoff_success_rate: 0.79,
    });

    expect(snapshots).toHaveLength(Object.keys(TRUST_TELEMETRY_DASHBOARDS).length);
    const runtimeSnapshot = snapshots.find(
      (snapshot) => snapshot.dashboardId === "voice_runtime_guardrails_dashboard",
    );
    expect(runtimeSnapshot?.severity).toBe("critical");
    expect(
      runtimeSnapshot?.kpis.some(
        (kpi) =>
          kpi.metric === "voice_runtime_failure_rate"
          && kpi.severity === "critical",
      ),
    ).toBe(true);
  });

  it("evaluates rollout guardrails with deterministic hold and rollback outcomes", () => {
    const rollbackDecision = evaluateTrustRolloutGuardrails({
      voice_session_start_rate: 0.36,
      voice_session_completion_rate: 0.71,
      voice_cancel_without_save_rate: 0.24,
      voice_memory_consent_accept_rate: 0.66,
      voice_runtime_failure_rate: 0.12,
      agent_creation_handoff_success_rate: 0.82,
    });
    expect(rollbackDecision.status).toBe("rollback");
    expect(rollbackDecision.criticalMetrics).toContain("voice_runtime_failure_rate");

    const holdDecision = evaluateTrustRolloutGuardrails({
      voice_session_start_rate: 0.34,
      voice_session_completion_rate: 0.68,
      voice_cancel_without_save_rate: 0.27,
      voice_memory_consent_accept_rate: 0.49,
      voice_runtime_failure_rate: 0.04,
    });
    expect(holdDecision.status).toBe("hold");
    expect(holdDecision.warningMetrics).toContain("voice_memory_consent_accept_rate");
    expect(holdDecision.missingMetrics).toContain("agent_creation_handoff_success_rate");

    const proceedDecision = evaluateTrustRolloutGuardrails({
      voice_session_start_rate: 0.37,
      voice_session_completion_rate: 0.72,
      voice_cancel_without_save_rate: 0.26,
      voice_memory_consent_accept_rate: 0.68,
      voice_runtime_failure_rate: 0.02,
      agent_creation_handoff_success_rate: 0.82,
    });
    expect(proceedDecision.status).toBe("proceed");
    expect(proceedDecision.warningMetrics).toHaveLength(0);
    expect(proceedDecision.criticalMetrics).toHaveLength(0);
    expect(proceedDecision.missingMetrics).toHaveLength(0);
  });

  it("treats voice runtime failure breaches as deterministic rollback triggers", () => {
    const warningDecision = evaluateTrustRolloutGuardrails({
      voice_session_start_rate: 0.37,
      voice_session_completion_rate: 0.72,
      voice_cancel_without_save_rate: 0.26,
      voice_memory_consent_accept_rate: 0.68,
      voice_runtime_failure_rate: 0.1,
      agent_creation_handoff_success_rate: 0.82,
    });

    expect(warningDecision.status).toBe("hold");
    expect(warningDecision.warningMetrics).toContain("voice_runtime_failure_rate");

    const escalatedDecision = evaluateTrustRolloutGuardrails({
      voice_session_start_rate: 0.37,
      voice_session_completion_rate: 0.72,
      voice_cancel_without_save_rate: 0.26,
      voice_memory_consent_accept_rate: 0.68,
      voice_runtime_failure_rate: 0.101,
      agent_creation_handoff_success_rate: 0.82,
    });

    expect(escalatedDecision.status).toBe("rollback");
    expect(escalatedDecision.criticalMetrics).toContain("voice_runtime_failure_rate");
  });

  it("holds rollout when cancel-without-save and consent KPIs drift to warning", () => {
    const decision = evaluateTrustRolloutGuardrails({
      voice_session_start_rate: 0.36,
      voice_session_completion_rate: 0.71,
      voice_cancel_without_save_rate: 0.45,
      voice_memory_consent_accept_rate: 0.49,
      voice_runtime_failure_rate: 0.05,
      agent_creation_handoff_success_rate: 0.81,
    });

    expect(decision.status).toBe("hold");
    expect(decision.criticalMetrics).toHaveLength(0);
    expect(decision.warningMetrics).toEqual(
      expect.arrayContaining([
        "voice_cancel_without_save_rate",
        "voice_memory_consent_accept_rate",
      ]),
    );
  });

  it("produces valid trust.telemetry.kpi_checkpoint payloads", () => {
    const payload = buildTrustKpiCheckpointPayload({
      orgId: "org_001" as Id<"organizations">,
      mode: "runtime",
      channel: "webchat",
      sessionId: "sess_001",
      actorType: "system",
      actorId: "system",
      metric: "voice_session_completion_rate",
      metricValue: 0.91,
      occurredAt: 1_739_900_000_000,
    });
    const validation = validateTrustEventPayload("trust.telemetry.kpi_checkpoint.v1", payload);
    expect(validation.ok).toBe(true);
  });

  it("flags invalid metric values as critical regression signals", () => {
    const evaluation = evaluateTrustKpiMetric(
      "voice_runtime_failure_rate",
      Number.NaN,
    );
    expect(evaluation.severity).toBe("critical");
    expect(evaluation.thresholdValue).toBeNull();
  });
});
