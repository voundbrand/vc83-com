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
  | "voice_session_start_rate"
  | "voice_session_completion_rate"
  | "voice_cancel_without_save_rate"
  | "voice_memory_consent_accept_rate"
  | "voice_runtime_failure_rate"
  | "agent_creation_handoff_success_rate";

export const TRUST_VOICE_SESSION_TELEMETRY_SOURCE_EVENTS = [
  "trust.voice.session_transition.v1",
  "trust.voice.adaptive_flow_decision.v1",
  "trust.voice.runtime_failover_triggered.v1",
] as const satisfies readonly TrustEventName[];

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

export const VOICE_TRUST_PRE_ROLLOUT_BASELINES: Record<TrustKpiMetricKey, number> = {
  voice_session_start_rate: 0.33,
  voice_session_completion_rate: 0.68,
  voice_cancel_without_save_rate: 0.27,
  voice_memory_consent_accept_rate: 0.62,
  voice_runtime_failure_rate: 0.04,
  agent_creation_handoff_success_rate: 0.78,
};

export const TRUST_KPI_DEFINITIONS: Record<TrustKpiMetricKey, TrustKpiDefinition> = {
  voice_session_start_rate: {
    displayName: "Voice session start rate",
    description:
      "Share of voice co-creation intents that successfully transition from created to capturing.",
    unit: "ratio",
    direction: "min",
    baseline: VOICE_TRUST_PRE_ROLLOUT_BASELINES.voice_session_start_rate,
    target: 0.35,
    warningThreshold: 0.25,
    criticalThreshold: 0.15,
    windowHours: 24,
    sourceEvents: ["trust.voice.session_transition.v1"],
  },
  voice_session_completion_rate: {
    displayName: "Voice session completion rate",
    description:
      "Share of active voice sessions that reach explicit close/save transitions after capture begins.",
    unit: "ratio",
    direction: "min",
    baseline: VOICE_TRUST_PRE_ROLLOUT_BASELINES.voice_session_completion_rate,
    target: 0.7,
    warningThreshold: 0.55,
    criticalThreshold: 0.45,
    windowHours: 24,
    sourceEvents: [
      "trust.voice.session_transition.v1",
      "trust.memory.consent_decided.v1",
    ],
  },
  voice_cancel_without_save_rate: {
    displayName: "Voice cancel without save rate",
    description:
      "Share of voice sessions that exit via discard/cancel before an explicit consented save boundary.",
    unit: "ratio",
    direction: "max",
    baseline: VOICE_TRUST_PRE_ROLLOUT_BASELINES.voice_cancel_without_save_rate,
    target: 0.3,
    warningThreshold: 0.4,
    criticalThreshold: 0.55,
    windowHours: 24,
    sourceEvents: [
      "trust.voice.session_transition.v1",
      "trust.memory.write_blocked_no_consent.v1",
    ],
  },
  voice_memory_consent_accept_rate: {
    displayName: "Voice memory consent acceptance rate",
    description:
      "Share of voice consent checkpoints where the operator explicitly accepts durable memory writes.",
    unit: "ratio",
    direction: "min",
    baseline: VOICE_TRUST_PRE_ROLLOUT_BASELINES.voice_memory_consent_accept_rate,
    target: 0.65,
    warningThreshold: 0.5,
    criticalThreshold: 0.4,
    windowHours: 24,
    sourceEvents: [
      "trust.voice.adaptive_flow_decision.v1",
      "trust.memory.consent_prompted.v1",
      "trust.memory.consent_decided.v1",
    ],
  },
  voice_runtime_failure_rate: {
    displayName: "Voice runtime failure rate",
    description:
      "Share of voice runtime requests that trigger provider failover or degraded runtime handling.",
    unit: "ratio",
    direction: "max",
    baseline: VOICE_TRUST_PRE_ROLLOUT_BASELINES.voice_runtime_failure_rate,
    target: 0.03,
    warningThreshold: 0.06,
    criticalThreshold: 0.1,
    windowHours: 1,
    sourceEvents: [
      "trust.voice.runtime_failover_triggered.v1",
      "trust.voice.session_transition.v1",
    ],
  },
  agent_creation_handoff_success_rate: {
    displayName: "Agent creation handoff success rate",
    description:
      "Share of voice-originated `agent for this` handoffs that reach review-ready completion.",
    unit: "ratio",
    direction: "min",
    baseline: VOICE_TRUST_PRE_ROLLOUT_BASELINES.agent_creation_handoff_success_rate,
    target: 0.8,
    warningThreshold: 0.65,
    criticalThreshold: 0.5,
    windowHours: 24,
    sourceEvents: [
      "trust.voice.adaptive_flow_decision.v1",
      "trust.team.handoff_started.v1",
      "trust.team.handoff_completed.v1",
      "trust.team.handoff_dropped_context.v1",
    ],
  },
};

export type TrustTelemetryDashboardId =
  | "voice_session_funnel_dashboard"
  | "voice_runtime_guardrails_dashboard"
  | "voice_agent_handoff_dashboard";

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
  voice_session_funnel_dashboard: {
    title: "Voice Session Funnel Health",
    description:
      "Tracks voice session start/completion, cancel friction, and consent quality before rollout expansion.",
    modes: ["lifecycle", "runtime"],
    kpis: [
      "voice_session_start_rate",
      "voice_session_completion_rate",
      "voice_cancel_without_save_rate",
      "voice_memory_consent_accept_rate",
    ],
  },
  voice_runtime_guardrails_dashboard: {
    title: "Voice Runtime Guardrails",
    description:
      "Tracks provider failover/degradation pressure and surfaces rollback signals for runtime safety.",
    modes: ["runtime"],
    kpis: ["voice_runtime_failure_rate"],
  },
  voice_agent_handoff_dashboard: {
    title: "Voice Agent Handoff Reliability",
    description:
      "Tracks whether voice-originated `agent for this` handoffs reliably reach review-ready completion.",
    modes: ["agents", "runtime"],
    kpis: ["agent_creation_handoff_success_rate"],
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
  "voice_session_start_rate",
  "voice_session_completion_rate",
  "voice_cancel_without_save_rate",
  "voice_memory_consent_accept_rate",
  "voice_runtime_failure_rate",
  "agent_creation_handoff_success_rate",
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
