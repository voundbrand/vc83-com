import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { validateTrustEventPayload } from "../../../convex/ai/trustEvents";
import {
  EVAL_RUN_FAIL_CLOSED_REASON_CODE_VALUES,
  EVAL_RUN_LIFECYCLE_SNAPSHOT_CONTRACT_VERSION,
  EVAL_RUN_LIFECYCLE_TRUST_EVENT_NAME,
  TRUST_KPI_DEFINITIONS,
  TRUST_TELEMETRY_DASHBOARDS,
  VOICE_TRUST_PRE_ROLLOUT_BASELINES,
  OAR_RUNTIME_SLO_DEFINITIONS,
  WAE_EVAL_BUDGET_DEFINITIONS,
  WAE_EVAL_SCORING_WEIGHTS,
  buildOarProductionGateEvidence,
  buildEvalRunLifecycleTrustPayload,
  buildRuntimeReceiptRetryGuidance,
  buildRuntimeTurnTelemetryDimensions,
  buildTrustKpiCheckpointPayload,
  buildTrustTelemetryDashboardSnapshots,
  evaluateOarRuntimeSloGate,
  evaluateWaeEvalBudget,
  evaluateTrustKpiMetric,
  evaluateTrustRolloutGuardrails,
  normalizeEvalRunLifecycleReasonCodes,
  resolveEvalRunLifecycleTransitionReasonCode,
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

  it("builds deterministic runtime turn telemetry dimensions with required fields", () => {
    const dimensionsA = buildRuntimeTurnTelemetryDimensions({
      manifestHash: "manifest:abc123",
      idempotencyKey: "idem:1",
      idempotencyScopeKey: "org_1:route:webchat:message_ingress",
      payloadHash: "payload:hash:1",
      admissionReasonCode: "Replay_Duplicate",
    });
    const dimensionsB = buildRuntimeTurnTelemetryDimensions({
      manifestHash: "  manifest:abc123  ",
      idempotencyKey: "idem:1",
      idempotencyScopeKey: "org_1:route:webchat:message_ingress",
      payloadHash: "payload:hash:1",
      admissionReasonCode: "replay_duplicate",
    });

    expect(dimensionsA).toEqual({
      contractVersion: "aoh_runtime_turn_telemetry_dimensions_v1",
      manifestHash: "manifest:abc123",
      idempotencyKey: "idem:1",
      idempotencyScopeKey: "org_1:route:webchat:message_ingress",
      payloadHash: "payload:hash:1",
      admissionReasonCode: "replay_duplicate",
    });
    expect(dimensionsB).toEqual(dimensionsA);
  });

  it("builds deterministic receipt retry guidance for blocked and safe paths", () => {
    expect(
      buildRuntimeReceiptRetryGuidance({
        status: "processing",
        duplicateCount: 0,
      }),
    ).toMatchObject({
      retryDisposition: "blocked_processing",
      retrySafe: false,
      blockReasonCode: "runtime_processing_lock",
      unblockActor: "runtime_worker",
    });

    expect(
      buildRuntimeReceiptRetryGuidance({
        status: "completed",
        duplicateCount: 0,
      }),
    ).toMatchObject({
      retryDisposition: "terminal_completed",
      retrySafe: false,
      blockReasonCode: "terminal_receipt",
      unblockActor: "org_operator",
    });

    expect(
      buildRuntimeReceiptRetryGuidance({
        status: "duplicate",
        duplicateCount: 2,
      }),
    ).toMatchObject({
      retryDisposition: "safe_retry",
      retrySafe: true,
      blockReasonCode: "none",
      unblockActor: "none",
    });
  });

  it("normalizes eval lifecycle reason codes with deterministic lexical ordering", () => {
    const normalized = normalizeEvalRunLifecycleReasonCodes([
      " Missing Lifecycle Evidence ",
      "seed_drift_runtime",
      "SCENARIO-MISMATCH",
      "execution started",
      "execution_started",
      "unknown custom reason",
    ]);

    expect(normalized).toEqual([
      "execution_started",
      "missing_lifecycle_evidence",
      "scenario_id_mismatch",
      "seed_contract_drift_runtime",
      "unknown_reason",
    ]);
    expect(EVAL_RUN_FAIL_CLOSED_REASON_CODE_VALUES).toContain(
      "seed_contract_drift_runtime",
    );
    expect(resolveEvalRunLifecycleTransitionReasonCode("blocked")).toBe(
      "execution_blocked",
    );
  });

  it("builds valid eval lifecycle trust payloads for CI-gated run transitions", () => {
    const payload = buildEvalRunLifecycleTrustPayload({
      orgId: "org_001" as Id<"organizations">,
      sessionId: "session_eval_1",
      channel: "desktop",
      actorType: "system",
      actorId: "system",
      runId: "run_123",
      scenarioId: "scenario_abc",
      agentId: "agent_xyz",
      fromState: "queued",
      toState: "running",
      reasonCodes: ["execution_started"],
      envelopeContractVersion: "wae_eval_run_envelope_v1",
      lifecycleContractVersion: "wae_eval_org_lifecycle_v1",
      transitionSource: "test",
      traceStatus: "ready",
      occurredAt: 1_739_900_000_123,
    });

    expect(payload.event_id).toContain(EVAL_RUN_LIFECYCLE_TRUST_EVENT_NAME);
    const validation = validateTrustEventPayload(
      EVAL_RUN_LIFECYCLE_TRUST_EVENT_NAME,
      payload,
    );
    expect(validation.ok).toBe(true);
  });

  it("keeps eval lifecycle reason-code normalization deterministic for blocked replay failures", () => {
    const normalized = normalizeEvalRunLifecycleReasonCodes([
      "lifecycle_paths_missing",
      "lifecycle_evidence_mismatch",
      "Missing Artifact Pointer",
      "missing_artifact_pointer",
      "seed_drift",
      "seed_drift_runtime",
      "lifecycle_evidence_missing",
    ]);

    expect(normalized).toEqual([
      "lifecycle_evidence_mismatch",
      "missing_artifact_pointer",
      "missing_lifecycle_evidence",
      "missing_lifecycle_evidence_paths",
      "seed_contract_drift",
      "seed_contract_drift_runtime",
    ]);
  });

  it("keeps lifecycle snapshot contract version + blocked reason-code parity explicit", () => {
    expect(EVAL_RUN_LIFECYCLE_SNAPSHOT_CONTRACT_VERSION).toBe(
      "wae_eval_run_lifecycle_snapshot_v1"
    );
    expect(resolveEvalRunLifecycleTransitionReasonCode("queued")).toBe(
      "queued_for_execution"
    );
    expect(resolveEvalRunLifecycleTransitionReasonCode("running")).toBe(
      "execution_started"
    );
    expect(resolveEvalRunLifecycleTransitionReasonCode("passed")).toBe(
      "execution_succeeded"
    );
    expect(resolveEvalRunLifecycleTransitionReasonCode("failed")).toBe(
      "execution_failed"
    );
    expect(resolveEvalRunLifecycleTransitionReasonCode("blocked")).toBe(
      "execution_blocked"
    );
  });

  it("pins deterministic WAE scorer weights and performance budgets", () => {
    expect(WAE_EVAL_SCORING_WEIGHTS).toEqual({
      tool_correctness: 0.35,
      completion_quality: 0.3,
      safety: 0.2,
      latency: 0.1,
      cost: 0.05,
    });
    expect(WAE_EVAL_BUDGET_DEFINITIONS.latency).toEqual({
      displayName: "Scenario latency budget",
      unit: "ms",
      target: 4000,
      warningThreshold: 8000,
      criticalThreshold: 15000,
    });
    expect(WAE_EVAL_BUDGET_DEFINITIONS.cost).toEqual({
      displayName: "Scenario cost budget",
      unit: "usd",
      target: 0.01,
      warningThreshold: 0.025,
      criticalThreshold: 0.05,
    });
  });

  it("evaluates WAE latency and cost budgets with deterministic severity and score ratios", () => {
    expect(evaluateWaeEvalBudget("latency", 3200)).toEqual({
      metric: "latency",
      observedValue: 3200,
      severity: "ok",
      thresholdValue: 4000,
      scoreRatio: 1,
    });
    expect(evaluateWaeEvalBudget("latency", 6000)).toEqual({
      metric: "latency",
      observedValue: 6000,
      severity: "warning",
      thresholdValue: 8000,
      scoreRatio: 0.75,
    });
    expect(evaluateWaeEvalBudget("cost", 0.04)).toEqual({
      metric: "cost",
      observedValue: 0.04,
      severity: "critical",
      thresholdValue: 0.05,
      scoreRatio: 0.2,
    });
    expect(evaluateWaeEvalBudget("cost", Number.NaN)).toEqual({
      metric: "cost",
      observedValue: Number.NaN,
      severity: "critical",
      thresholdValue: null,
      scoreRatio: 0,
    });
  });

  it("keeps runtime SLO threshold contracts deterministic for rollout gating", () => {
    expect(OAR_RUNTIME_SLO_DEFINITIONS).toEqual({
      stuck_turn_rate: {
        displayName: "Stuck turn rate",
        unit: "ratio",
        direction: "max",
        warningThreshold: 0.03,
        criticalThreshold: 0.08,
      },
      delivery_terminalization_rate: {
        displayName: "Delivery terminalization rate",
        unit: "ratio",
        direction: "min",
        warningThreshold: 0.97,
        criticalThreshold: 0.9,
      },
      runtime_error_rate: {
        displayName: "Runtime error rate",
        unit: "ratio",
        direction: "max",
        warningThreshold: 0.04,
        criticalThreshold: 0.09,
      },
      p95_turn_latency_ms: {
        displayName: "P95 turn latency",
        unit: "ms",
        direction: "max",
        warningThreshold: 20000,
        criticalThreshold: 45000,
      },
      avg_cost_usd_per_turn: {
        displayName: "Average cost per turn",
        unit: "usd",
        direction: "max",
        warningThreshold: 0.03,
        criticalThreshold: 0.06,
      },
    });
  });

  it("evaluates runtime SLO gate with proceed, hold, and rollback decisions", () => {
    expect(
      evaluateOarRuntimeSloGate({
        stuck_turn_rate: 0.01,
        delivery_terminalization_rate: 0.99,
        runtime_error_rate: 0.02,
        p95_turn_latency_ms: 9000,
        avg_cost_usd_per_turn: 0.012,
      }).status,
    ).toBe("proceed");

    const hold = evaluateOarRuntimeSloGate({
      stuck_turn_rate: 0.04,
      delivery_terminalization_rate: 0.98,
      runtime_error_rate: 0.02,
      p95_turn_latency_ms: 9000,
      avg_cost_usd_per_turn: 0.012,
    });
    expect(hold.status).toBe("hold");
    expect(hold.warningMetrics).toContain("stuck_turn_rate");

    const rollback = evaluateOarRuntimeSloGate({
      stuck_turn_rate: 0.09,
      delivery_terminalization_rate: 0.88,
      runtime_error_rate: 0.02,
      p95_turn_latency_ms: 9000,
      avg_cost_usd_per_turn: 0.012,
    });
    expect(rollback.status).toBe("rollback");
    expect(rollback.criticalMetrics).toEqual(
      expect.arrayContaining([
        "stuck_turn_rate",
        "delivery_terminalization_rate",
      ]),
    );
  });

  it("builds fail-closed OAR production gate evidence with eval + runtime budget decisions", () => {
    const holdEvidence = buildOarProductionGateEvidence({
      runtimeObservations: {
        stuck_turn_rate: 0.01,
        delivery_terminalization_rate: 0.99,
        runtime_error_rate: 0.02,
        p95_turn_latency_ms: 9000,
        avg_cost_usd_per_turn: 0.012,
      },
      evalScore: 0.82,
      evalPassThreshold: 0.85,
      evalHoldThreshold: 0.7,
      evalLatencyMs: 3500,
      evalCostUsd: 0.009,
      generatedAt: 1_739_900_000_321,
    });

    expect(holdEvidence.contractVersion).toBe("oar_production_gate_v1");
    expect(holdEvidence.generatedAt).toBe(1_739_900_000_321);
    expect(holdEvidence.decision).toBe("hold");
    expect(holdEvidence.eval.scoreStatus).toBe("hold");
    expect(holdEvidence.blockedReasonCodes).toContain(
      "eval_score_below_pass_threshold",
    );

    const rollbackEvidence = buildOarProductionGateEvidence({
      runtimeObservations: {
        stuck_turn_rate: 0.01,
        delivery_terminalization_rate: 0.99,
        runtime_error_rate: 0.02,
        p95_turn_latency_ms: 9000,
        avg_cost_usd_per_turn: 0.012,
      },
      evalScore: 0.9,
      evalPassThreshold: 0.85,
      evalHoldThreshold: 0.7,
      evalLatencyMs: 20000,
      evalCostUsd: 0.08,
    });
    expect(rollbackEvidence.decision).toBe("rollback");
    expect(rollbackEvidence.blockedReasonCodes).toEqual(
      expect.arrayContaining([
        "eval_latency_budget_critical",
        "eval_cost_budget_critical",
      ]),
    );
  });
});
