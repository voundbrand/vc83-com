import {
  TRUST_EVENT_NAMESPACE,
  TRUST_EVENT_TAXONOMY_VERSION,
  type TrustEventActorType,
  type TrustEventMode,
  type TrustEventName,
  type TrustEventPayload,
  type TrustEventSchemaValidationStatus,
} from "./trustEvents";
import type { Id } from "../_generated/dataModel";

export type TrustKpiMetricKey =
  | "trust_interview_completion_rate"
  | "trust_memory_consent_accept_rate"
  | "trust_setup_connect_success_rate"
  | "trust_time_to_first_trusted_agent_minutes"
  | "trust_soul_post_approval_rollback_rate"
  | "trust_team_handoff_context_loss_rate"
  | "trust_admin_training_completion_rate";

export type TrustKpiUnit = "ratio" | "minutes";
export type TrustKpiDirection = "min" | "max";
export type TrustKpiSeverity = "ok" | "warning" | "critical";

export interface TrustKpiDefinition {
  displayName: string;
  description: string;
  unit: TrustKpiUnit;
  direction: TrustKpiDirection;
  baseline: number;
  target: number;
  warningThreshold: number;
  criticalThreshold: number;
  windowHours: number;
  sourceEvents: readonly TrustEventName[];
}

export const TRUST_KPI_DEFINITIONS: Record<TrustKpiMetricKey, TrustKpiDefinition> = {
  trust_interview_completion_rate: {
    displayName: "Interview completion rate",
    description:
      "Share of guided trust interviews that reach persisted trust artifacts and completion milestones.",
    unit: "ratio",
    direction: "min",
    baseline: 0.78,
    target: 0.85,
    warningThreshold: 0.72,
    criticalThreshold: 0.65,
    windowHours: 24,
    sourceEvents: [
      "trust.memory.consent_prompted.v1",
      "trust.memory.consent_decided.v1",
      "trust.brain.content_dna.composed.v1",
    ],
  },
  trust_memory_consent_accept_rate: {
    displayName: "Memory consent acceptance rate",
    description:
      "Share of memory consent checkpoints where the operator explicitly accepts durable memory writes.",
    unit: "ratio",
    direction: "min",
    baseline: 0.67,
    target: 0.74,
    warningThreshold: 0.58,
    criticalThreshold: 0.5,
    windowHours: 24,
    sourceEvents: [
      "trust.memory.consent_prompted.v1",
      "trust.memory.consent_decided.v1",
      "trust.memory.write_blocked_no_consent.v1",
    ],
  },
  trust_setup_connect_success_rate: {
    displayName: "Setup connect success rate",
    description:
      "Share of setup sessions that pass validation and persist agent plus knowledge artifacts.",
    unit: "ratio",
    direction: "min",
    baseline: 0.88,
    target: 0.94,
    warningThreshold: 0.8,
    criticalThreshold: 0.72,
    windowHours: 24,
    sourceEvents: [
      "trust.setup.connect_validation_passed.v1",
      "trust.setup.connect_validation_failed.v1",
      "trust.setup.connect_persisted.v1",
    ],
  },
  trust_time_to_first_trusted_agent_minutes: {
    displayName: "Time to first trusted agent",
    description:
      "Median minutes from setup artifact generation start to successful connect persistence.",
    unit: "minutes",
    direction: "max",
    baseline: 45,
    target: 30,
    warningThreshold: 65,
    criticalThreshold: 90,
    windowHours: 24,
    sourceEvents: [
      "trust.setup.artifact_generation_started.v1",
      "trust.setup.connect_persisted.v1",
    ],
  },
  trust_soul_post_approval_rollback_rate: {
    displayName: "Soul rollback rate",
    description:
      "Share of approved soul proposals that require rollback due to trust degradation.",
    unit: "ratio",
    direction: "max",
    baseline: 0.05,
    target: 0.03,
    warningThreshold: 0.07,
    criticalThreshold: 0.1,
    windowHours: 24,
    sourceEvents: [
      "trust.soul.proposal_reviewed.v1",
      "trust.soul.rollback_executed.v1",
    ],
  },
  trust_team_handoff_context_loss_rate: {
    displayName: "Team handoff context-loss rate",
    description:
      "Share of team handoffs that emit dropped-context signals rather than a clean completion.",
    unit: "ratio",
    direction: "max",
    baseline: 0.03,
    target: 0.02,
    warningThreshold: 0.05,
    criticalThreshold: 0.08,
    windowHours: 24,
    sourceEvents: [
      "trust.team.handoff_started.v1",
      "trust.team.handoff_completed.v1",
      "trust.team.handoff_dropped_context.v1",
    ],
  },
  trust_admin_training_completion_rate: {
    displayName: "Admin training completion rate",
    description:
      "Share of platform trust-training sessions that reach artifact publish and completion.",
    unit: "ratio",
    direction: "min",
    baseline: 0.7,
    target: 0.82,
    warningThreshold: 0.62,
    criticalThreshold: 0.55,
    windowHours: 24,
    sourceEvents: [
      "trust.admin.training_session_started.v1",
      "trust.admin.training_artifact_published.v1",
      "trust.admin.training_session_completed.v1",
    ],
  },
};

export type TrustTelemetryDashboardId =
  | "trust_funnel_dashboard"
  | "trust_setup_dashboard"
  | "trust_agent_operations_dashboard"
  | "trust_admin_parity_dashboard";

export interface TrustTelemetryDashboardDefinition {
  title: string;
  description: string;
  modes: readonly TrustEventMode[];
  kpis: readonly TrustKpiMetricKey[];
}

export const TRUST_TELEMETRY_DASHBOARDS: Record<
  TrustTelemetryDashboardId,
  TrustTelemetryDashboardDefinition
> = {
  trust_funnel_dashboard: {
    title: "Trust Funnel Health",
    description:
      "Tracks interview and consent completion quality before downstream runtime autonomy.",
    modes: ["lifecycle"],
    kpis: [
      "trust_interview_completion_rate",
      "trust_memory_consent_accept_rate",
    ],
  },
  trust_setup_dashboard: {
    title: "Trust Setup Runtime",
    description:
      "Tracks setup/connect quality and time to first trusted agent readiness.",
    modes: ["setup"],
    kpis: [
      "trust_setup_connect_success_rate",
      "trust_time_to_first_trusted_agent_minutes",
    ],
  },
  trust_agent_operations_dashboard: {
    title: "Trust Agent Operations",
    description:
      "Tracks drift and team handoff regressions that can erode operator trust in runtime behavior.",
    modes: ["agents", "runtime"],
    kpis: [
      "trust_soul_post_approval_rollback_rate",
      "trust_team_handoff_context_loss_rate",
    ],
  },
  trust_admin_parity_dashboard: {
    title: "Trust Admin Parity",
    description:
      "Tracks whether platform-agent trust training keeps parity with customer-facing trust workflows.",
    modes: ["admin"],
    kpis: ["trust_admin_training_completion_rate"],
  },
};

export interface TrustKpiEvaluation {
  metric: TrustKpiMetricKey;
  observedValue: number;
  severity: TrustKpiSeverity;
  thresholdValue: number | null;
}

const TRUST_SEVERITY_RANK: Record<TrustKpiSeverity, number> = {
  ok: 0,
  warning: 1,
  critical: 2,
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function evaluateTrustKpiMetric(
  metric: TrustKpiMetricKey,
  observedValue: number,
): TrustKpiEvaluation {
  const definition = TRUST_KPI_DEFINITIONS[metric];
  if (!Number.isFinite(observedValue)) {
    return {
      metric,
      observedValue: Number.NaN,
      severity: "critical",
      thresholdValue: null,
    };
  }

  if (definition.direction === "min") {
    if (observedValue < definition.criticalThreshold) {
      return {
        metric,
        observedValue,
        severity: "critical",
        thresholdValue: definition.criticalThreshold,
      };
    }
    if (observedValue < definition.warningThreshold) {
      return {
        metric,
        observedValue,
        severity: "warning",
        thresholdValue: definition.warningThreshold,
      };
    }
    return {
      metric,
      observedValue,
      severity: "ok",
      thresholdValue: null,
    };
  }

  if (observedValue > definition.criticalThreshold) {
    return {
      metric,
      observedValue,
      severity: "critical",
      thresholdValue: definition.criticalThreshold,
    };
  }
  if (observedValue > definition.warningThreshold) {
    return {
      metric,
      observedValue,
      severity: "warning",
      thresholdValue: definition.warningThreshold,
    };
  }
  return {
    metric,
    observedValue,
    severity: "ok",
    thresholdValue: null,
  };
}

export interface TrustTelemetryDashboardSnapshot {
  dashboardId: TrustTelemetryDashboardId;
  severity: TrustKpiSeverity;
  kpis: TrustKpiEvaluation[];
}

export function buildTrustTelemetryDashboardSnapshots(
  observations: Partial<Record<TrustKpiMetricKey, number>>,
): TrustTelemetryDashboardSnapshot[] {
  return (Object.keys(TRUST_TELEMETRY_DASHBOARDS) as TrustTelemetryDashboardId[]).map(
    (dashboardId) => {
      const definition = TRUST_TELEMETRY_DASHBOARDS[dashboardId];
      const kpis = definition.kpis.map((metric) =>
        evaluateTrustKpiMetric(metric, observations[metric] ?? Number.NaN),
      );

      const severity = kpis.reduce<TrustKpiSeverity>(
        (worst, current) =>
          TRUST_SEVERITY_RANK[current.severity] > TRUST_SEVERITY_RANK[worst]
            ? current.severity
            : worst,
        "ok",
      );

      return {
        dashboardId,
        severity,
        kpis,
      };
    },
  );
}

export const TRUST_ROLLOUT_REQUIRED_METRICS = [
  "trust_interview_completion_rate",
  "trust_memory_consent_accept_rate",
  "trust_setup_connect_success_rate",
  "trust_soul_post_approval_rollback_rate",
  "trust_team_handoff_context_loss_rate",
  "trust_admin_training_completion_rate",
] as const satisfies readonly TrustKpiMetricKey[];

export interface TrustRolloutGuardrailDecision {
  status: "proceed" | "hold" | "rollback";
  missingMetrics: TrustKpiMetricKey[];
  warningMetrics: TrustKpiMetricKey[];
  criticalMetrics: TrustKpiMetricKey[];
}

export function evaluateTrustRolloutGuardrails(
  observations: Partial<Record<TrustKpiMetricKey, number>>,
  requiredMetrics: readonly TrustKpiMetricKey[] = TRUST_ROLLOUT_REQUIRED_METRICS,
): TrustRolloutGuardrailDecision {
  const missingMetrics = requiredMetrics.filter(
    (metric) => !isFiniteNumber(observations[metric]),
  );

  const evaluations = requiredMetrics
    .filter((metric) => isFiniteNumber(observations[metric]))
    .map((metric) => evaluateTrustKpiMetric(metric, observations[metric] as number));

  const warningMetrics = evaluations
    .filter((evaluation) => evaluation.severity === "warning")
    .map((evaluation) => evaluation.metric);
  const criticalMetrics = evaluations
    .filter((evaluation) => evaluation.severity === "critical")
    .map((evaluation) => evaluation.metric);

  if (criticalMetrics.length > 0) {
    return {
      status: "rollback",
      missingMetrics,
      warningMetrics,
      criticalMetrics,
    };
  }

  if (missingMetrics.length > 0 || warningMetrics.length > 0) {
    return {
      status: "hold",
      missingMetrics,
      warningMetrics,
      criticalMetrics,
    };
  }

  return {
    status: "proceed",
    missingMetrics,
    warningMetrics,
    criticalMetrics,
  };
}

export interface BuildTrustKpiCheckpointPayloadArgs {
  orgId: Id<"organizations">;
  mode: TrustEventMode;
  channel: string;
  sessionId: string;
  actorType: TrustEventActorType;
  actorId: string;
  metric: TrustKpiMetricKey;
  metricValue: number;
  occurredAt?: number;
  schemaValidationStatus?: TrustEventSchemaValidationStatus;
}

export function buildTrustKpiCheckpointPayload(
  args: BuildTrustKpiCheckpointPayloadArgs,
): TrustEventPayload {
  const occurredAt = args.occurredAt ?? Date.now();
  const eventName = "trust.telemetry.kpi_checkpoint.v1";
  return {
    event_id: `${eventName}:${args.metric}:${occurredAt}`,
    event_version: "v1",
    occurred_at: occurredAt,
    org_id: args.orgId as Id<"organizations">,
    mode: args.mode,
    channel: args.channel,
    session_id: args.sessionId,
    actor_type: args.actorType,
    actor_id: args.actorId,
    taxonomy_version: TRUST_EVENT_TAXONOMY_VERSION,
    event_namespace: `${TRUST_EVENT_NAMESPACE}.telemetry`,
    schema_validation_status: args.schemaValidationStatus ?? "passed",
    metric_name: args.metric,
    metric_value: args.metricValue,
  };
}
