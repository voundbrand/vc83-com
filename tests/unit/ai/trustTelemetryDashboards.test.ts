import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { validateTrustEventPayload } from "../../../convex/ai/trustEvents";
import {
  TRUST_KPI_DEFINITIONS,
  TRUST_TELEMETRY_DASHBOARDS,
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

  it("maps each dashboard to known KPIs with severity rollups", () => {
    const snapshots = buildTrustTelemetryDashboardSnapshots({
      trust_interview_completion_rate: 0.86,
      trust_memory_consent_accept_rate: 0.75,
      trust_setup_connect_success_rate: 0.95,
      trust_time_to_first_trusted_agent_minutes: 34,
      trust_soul_post_approval_rollback_rate: 0.04,
      trust_team_handoff_context_loss_rate: 0.09,
      trust_admin_training_completion_rate: 0.81,
    });

    expect(snapshots).toHaveLength(Object.keys(TRUST_TELEMETRY_DASHBOARDS).length);
    const operationsSnapshot = snapshots.find(
      (snapshot) => snapshot.dashboardId === "trust_agent_operations_dashboard",
    );
    expect(operationsSnapshot?.severity).toBe("critical");
    expect(
      operationsSnapshot?.kpis.some(
        (kpi) =>
          kpi.metric === "trust_team_handoff_context_loss_rate"
          && kpi.severity === "critical",
      ),
    ).toBe(true);
  });

  it("evaluates rollout guardrails with deterministic hold and rollback outcomes", () => {
    const rollbackDecision = evaluateTrustRolloutGuardrails({
      trust_interview_completion_rate: 0.84,
      trust_memory_consent_accept_rate: 0.71,
      trust_setup_connect_success_rate: 0.91,
      trust_soul_post_approval_rollback_rate: 0.11,
      trust_team_handoff_context_loss_rate: 0.03,
      trust_admin_training_completion_rate: 0.8,
    });
    expect(rollbackDecision.status).toBe("rollback");
    expect(rollbackDecision.criticalMetrics).toContain(
      "trust_soul_post_approval_rollback_rate",
    );

    const holdDecision = evaluateTrustRolloutGuardrails({
      trust_interview_completion_rate: 0.84,
      trust_memory_consent_accept_rate: 0.57,
      trust_setup_connect_success_rate: 0.91,
      trust_soul_post_approval_rollback_rate: 0.04,
      trust_team_handoff_context_loss_rate: 0.03,
    });
    expect(holdDecision.status).toBe("hold");
    expect(holdDecision.warningMetrics).toContain("trust_memory_consent_accept_rate");
    expect(holdDecision.missingMetrics).toContain("trust_admin_training_completion_rate");

    const proceedDecision = evaluateTrustRolloutGuardrails({
      trust_interview_completion_rate: 0.87,
      trust_memory_consent_accept_rate: 0.76,
      trust_setup_connect_success_rate: 0.95,
      trust_soul_post_approval_rollback_rate: 0.03,
      trust_team_handoff_context_loss_rate: 0.02,
      trust_admin_training_completion_rate: 0.84,
    });
    expect(proceedDecision.status).toBe("proceed");
    expect(proceedDecision.warningMetrics).toHaveLength(0);
    expect(proceedDecision.criticalMetrics).toHaveLength(0);
    expect(proceedDecision.missingMetrics).toHaveLength(0);
  });

  it("treats HITL handoff context-loss breaches as immediate rollback triggers", () => {
    const decision = evaluateTrustRolloutGuardrails({
      trust_interview_completion_rate: 0.87,
      trust_memory_consent_accept_rate: 0.76,
      trust_setup_connect_success_rate: 0.95,
      trust_soul_post_approval_rollback_rate: 0.03,
      trust_team_handoff_context_loss_rate: 0.09,
      trust_admin_training_completion_rate: 0.84,
    });

    expect(decision.status).toBe("rollback");
    expect(decision.criticalMetrics).toContain("trust_team_handoff_context_loss_rate");
  });

  it("holds rollout when HITL rollback/context-loss signals are warning-only", () => {
    const decision = evaluateTrustRolloutGuardrails({
      trust_interview_completion_rate: 0.87,
      trust_memory_consent_accept_rate: 0.76,
      trust_setup_connect_success_rate: 0.95,
      trust_soul_post_approval_rollback_rate: 0.08,
      trust_team_handoff_context_loss_rate: 0.06,
      trust_admin_training_completion_rate: 0.84,
    });

    expect(decision.status).toBe("hold");
    expect(decision.criticalMetrics).toHaveLength(0);
    expect(decision.warningMetrics).toEqual(
      expect.arrayContaining([
        "trust_soul_post_approval_rollback_rate",
        "trust_team_handoff_context_loss_rate",
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
      metric: "trust_setup_connect_success_rate",
      metricValue: 0.91,
      occurredAt: 1_739_900_000_000,
    });
    const validation = validateTrustEventPayload("trust.telemetry.kpi_checkpoint.v1", payload);
    expect(validation.ok).toBe(true);
  });

  it("flags invalid metric values as critical regression signals", () => {
    const evaluation = evaluateTrustKpiMetric(
      "trust_team_handoff_context_loss_rate",
      Number.NaN,
    );
    expect(evaluation.severity).toBe("critical");
    expect(evaluation.thresholdValue).toBeNull();
  });
});
