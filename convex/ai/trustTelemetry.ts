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

export const VOICE_RUNTIME_TELEMETRY_CONTRACT_VERSION =
  "voice_runtime_telemetry_v1" as const;

export const VOICE_RUNTIME_TELEMETRY_EVENT_TYPE_VALUES = [
  "latency_checkpoint",
  "interruption",
  "reconnect",
  "fallback_transition",
  "provider_failure",
] as const;

export type VoiceRuntimeTelemetryEventType =
  (typeof VOICE_RUNTIME_TELEMETRY_EVENT_TYPE_VALUES)[number];

export interface VoiceRuntimeTelemetryEvent {
  eventId: string;
  eventType: VoiceRuntimeTelemetryEventType;
  occurredAtMs: number;
  liveSessionId: string;
  voiceSessionId: string;
  interviewSessionId?: string;
  payload: Record<string, unknown>;
}

export type VoiceRuntimeTelemetryCoverage = Record<
  VoiceRuntimeTelemetryEventType,
  boolean
>;

export interface VoiceRuntimeTelemetryContract {
  contractVersion: typeof VOICE_RUNTIME_TELEMETRY_CONTRACT_VERSION;
  liveSessionId: string;
  voiceSessionId: string;
  interviewSessionId?: string;
  correlationKey: string;
  eventCount: number;
  coverage: VoiceRuntimeTelemetryCoverage;
  events: VoiceRuntimeTelemetryEvent[];
}

export const WEB_CHAT_VISION_ATTACH_REASON_VALUES = [
  "attached",
  "vision_frame_missing",
  "vision_frame_stale",
  "vision_policy_blocked",
  "vision_frame_dropped_storage_url_missing",
  "vision_frame_dropped_auth_isolation",
] as const;

export type WebChatVisionAttachReason =
  (typeof WEB_CHAT_VISION_ATTACH_REASON_VALUES)[number];

export const WEB_CHAT_VISION_FRESHNESS_BUCKET_VALUES = [
  "age_0_2s",
  "age_2_5s",
  "age_5_12s",
  "age_12s_plus",
  "unknown",
] as const;

export type WebChatVisionFreshnessBucket =
  (typeof WEB_CHAT_VISION_FRESHNESS_BUCKET_VALUES)[number];

export interface WebChatVisionAttachmentTelemetrySnapshot {
  contractVersion: "web_chat_vision_attachment_telemetry_v1";
  reason: WebChatVisionAttachReason;
  source: "auth_gate" | "buffer" | "retention";
  maxFrameAgeMs: number;
  frameAgeMs: number | null;
  freshnessBucket: WebChatVisionFreshnessBucket;
  counters: Record<string, number>;
}

export type VoiceRuntimeCanaryDecision = "PROMOTE" | "HOLD" | "ROLLBACK";

export const VOICE_RUNTIME_CANARY_BUDGET_VERSION =
  "voice_runtime_canary_budget_v1" as const;

export interface VoiceRuntimeCanaryBudgetThresholds {
  maxLatencyBreaches: number;
  maxFallbackTransitions: number;
  maxProviderFailures: number;
  maxReconnectEvents: number;
  maxInterruptionEvents: number;
  requiredCoverage: readonly VoiceRuntimeTelemetryEventType[];
}

export interface VoiceRuntimeCanaryBudgetSnapshot {
  contractVersion: typeof VOICE_RUNTIME_CANARY_BUDGET_VERSION;
  decision: VoiceRuntimeCanaryDecision;
  liveSessionId: string;
  voiceSessionId: string;
  correlationKey: string;
  windowStartedAtMs: number;
  windowEndedAtMs: number;
  thresholds: VoiceRuntimeCanaryBudgetThresholds;
  observed: {
    latencyBreaches: number;
    fallbackTransitions: number;
    providerFailures: number;
    reconnectEvents: number;
    interruptionEvents: number;
    missingCoverage: VoiceRuntimeTelemetryEventType[];
  };
  reasons: string[];
}

export type VoiceProviderFailureTaxonomyReason =
  | "transport_connectivity_failure"
  | "provider_health_degraded"
  | "provider_timeout"
  | "transcription_failure"
  | "synthesis_failure"
  | "provider_unavailable"
  | "runtime_unknown_failure";

export type VoiceProviderHealthStatus =
  | "healthy"
  | "degraded"
  | "unavailable"
  | "unknown";

export const ACTION_COMPLETION_MISMATCH_REASON_CODE_VALUES = [
  "claim_tool_not_observed",
  "claim_tool_unavailable",
  "claim_payload_invalid",
] as const;

export type ActionCompletionMismatchReasonCode =
  (typeof ACTION_COMPLETION_MISMATCH_REASON_CODE_VALUES)[number];

export interface VoiceProviderFailureClassification {
  reasonCode: VoiceProviderFailureTaxonomyReason;
  healthStatus: VoiceProviderHealthStatus;
}

function toNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.floor(value));
}

export function resolveWebChatVisionFreshnessBucket(
  frameAgeMs: unknown,
): WebChatVisionFreshnessBucket {
  const ageMs = toNonNegativeInteger(frameAgeMs);
  if (ageMs === null) {
    return "unknown";
  }
  if (ageMs <= 2_000) {
    return "age_0_2s";
  }
  if (ageMs <= 5_000) {
    return "age_2_5s";
  }
  if (ageMs <= 12_000) {
    return "age_5_12s";
  }
  return "age_12s_plus";
}

export function buildWebChatVisionAttachmentCounters(args: {
  reason: WebChatVisionAttachReason;
  freshnessBucket: WebChatVisionFreshnessBucket;
}): Record<string, number> {
  const counters: Record<string, number> = {
    vision_frame_attempt_total: 1,
  };
  if (args.reason === "attached") {
    counters.vision_frame_attached_total = 1;
  }
  if (
    args.reason === "vision_frame_missing"
    || args.reason === "vision_frame_stale"
    || args.reason === "vision_policy_blocked"
  ) {
    counters.vision_frame_miss_total = 1;
    counters[`vision_frame_miss_reason:${args.reason}`] = 1;
  }
  if (
    args.reason === "vision_frame_dropped_storage_url_missing"
    || args.reason === "vision_frame_dropped_auth_isolation"
  ) {
    counters.vision_frame_drop_total = 1;
    counters[`vision_frame_drop_reason:${args.reason}`] = 1;
  }
  counters[`vision_frame_freshness_bucket:${args.freshnessBucket}`] = 1;
  return counters;
}

export function buildWebChatVisionAttachmentTelemetrySnapshot(args: {
  reason: WebChatVisionAttachReason;
  source: "auth_gate" | "buffer" | "retention";
  maxFrameAgeMs: number;
  frameAgeMs?: unknown;
}): WebChatVisionAttachmentTelemetrySnapshot {
  const freshnessBucket = resolveWebChatVisionFreshnessBucket(args.frameAgeMs);
  return {
    contractVersion: "web_chat_vision_attachment_telemetry_v1",
    reason: args.reason,
    source: args.source,
    maxFrameAgeMs: Math.max(0, Math.floor(args.maxFrameAgeMs)),
    frameAgeMs: toNonNegativeInteger(args.frameAgeMs),
    freshnessBucket,
    counters: buildWebChatVisionAttachmentCounters({
      reason: args.reason,
      freshnessBucket,
    }),
  };
}

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

export const RUNTIME_TURN_TELEMETRY_DIMENSIONS_CONTRACT_VERSION =
  "aoh_runtime_turn_telemetry_dimensions_v1" as const;

export interface RuntimeTurnTelemetryDimensions {
  contractVersion: typeof RUNTIME_TURN_TELEMETRY_DIMENSIONS_CONTRACT_VERSION;
  manifestHash: string;
  idempotencyKey: string;
  idempotencyScopeKey: string;
  payloadHash: string;
  admissionReasonCode: string;
}

const TRUST_SEVERITY_RANK: Record<TrustKpiSeverity, number> = {
  ok: 0,
  warning: 1,
  critical: 2,
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeTelemetryToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeTelemetryDimensionToken(
  value: unknown,
  fallback: string,
): string {
  return normalizeTelemetryToken(value) ?? fallback;
}

export function buildRuntimeTurnTelemetryDimensions(args: {
  manifestHash?: unknown;
  idempotencyKey?: unknown;
  idempotencyScopeKey?: unknown;
  payloadHash?: unknown;
  admissionReasonCode?: unknown;
}): RuntimeTurnTelemetryDimensions {
  return {
    contractVersion: RUNTIME_TURN_TELEMETRY_DIMENSIONS_CONTRACT_VERSION,
    manifestHash: normalizeTelemetryDimensionToken(args.manifestHash, "manifest:unknown"),
    idempotencyKey: normalizeTelemetryDimensionToken(args.idempotencyKey, "idempotency:unknown"),
    idempotencyScopeKey: normalizeTelemetryDimensionToken(
      args.idempotencyScopeKey,
      "idempotency_scope:unknown",
    ),
    payloadHash: normalizeTelemetryDimensionToken(args.payloadHash, "payload:unknown"),
    admissionReasonCode: normalizeTelemetryDimensionToken(
      args.admissionReasonCode,
      "admission_reason:unspecified",
    ).toLowerCase(),
  };
}

export function normalizeActionCompletionMismatchReasonCode(
  reasonCodeInput: unknown
): ActionCompletionMismatchReasonCode | "unknown" {
  const normalized = normalizeTelemetryToken(reasonCodeInput)?.toLowerCase() ?? "";
  if (
    normalized === "claim_tool_not_observed"
    || normalized === "claim_tool_unavailable"
    || normalized === "claim_payload_invalid"
  ) {
    return normalized;
  }
  return "unknown";
}

export function normalizeActionCompletionTemplateIdentifier(
  templateIdentifierInput: unknown
): string | undefined {
  return normalizeTelemetryToken(templateIdentifierInput) ?? undefined;
}

function normalizeTelemetryTimestamp(value: unknown): number | null {
  if (!isFiniteNumber(value)) {
    return null;
  }
  return Math.floor(value);
}

export function buildVoiceRuntimeTelemetryCorrelationKey(args: {
  liveSessionId: string;
  voiceSessionId: string;
}): string {
  const liveSessionId = normalizeTelemetryToken(args.liveSessionId) ?? "live:none";
  const voiceSessionId = normalizeTelemetryToken(args.voiceSessionId) ?? "voice:none";
  return `${liveSessionId}::${voiceSessionId}`;
}

function createEmptyVoiceRuntimeCoverage(): VoiceRuntimeTelemetryCoverage {
  return {
    latency_checkpoint: false,
    interruption: false,
    reconnect: false,
    fallback_transition: false,
    provider_failure: false,
  };
}

function isVoiceRuntimeTelemetryEventType(value: unknown): value is VoiceRuntimeTelemetryEventType {
  return (
    value === "latency_checkpoint"
    || value === "interruption"
    || value === "reconnect"
    || value === "fallback_transition"
    || value === "provider_failure"
  );
}

export function normalizeVoiceRuntimeTelemetryContract(
  input: unknown,
): VoiceRuntimeTelemetryContract | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const candidate = input as Record<string, unknown>;
  if (candidate.contractVersion !== VOICE_RUNTIME_TELEMETRY_CONTRACT_VERSION) {
    return null;
  }

  const liveSessionId = normalizeTelemetryToken(candidate.liveSessionId);
  const voiceSessionId = normalizeTelemetryToken(candidate.voiceSessionId);
  if (!liveSessionId || !voiceSessionId) {
    return null;
  }
  const interviewSessionId = normalizeTelemetryToken(candidate.interviewSessionId) ?? undefined;
  const correlationKey = buildVoiceRuntimeTelemetryCorrelationKey({
    liveSessionId,
    voiceSessionId,
  });

  const rawEvents = Array.isArray(candidate.events) ? candidate.events : [];
  const events: VoiceRuntimeTelemetryEvent[] = [];
  const coverage = createEmptyVoiceRuntimeCoverage();
  for (const rawEvent of rawEvents) {
    if (typeof rawEvent !== "object" || rawEvent === null) {
      continue;
    }
    const event = rawEvent as Record<string, unknown>;
    if (!isVoiceRuntimeTelemetryEventType(event.eventType)) {
      continue;
    }
    const eventId = normalizeTelemetryToken(event.eventId);
    const occurredAtMs = normalizeTelemetryTimestamp(event.occurredAtMs);
    const eventLiveSessionId = normalizeTelemetryToken(event.liveSessionId);
    const eventVoiceSessionId = normalizeTelemetryToken(event.voiceSessionId);
    const eventPayload =
      typeof event.payload === "object" && event.payload !== null
        ? (event.payload as Record<string, unknown>)
        : {};
    if (!eventId || occurredAtMs === null || !eventLiveSessionId || !eventVoiceSessionId) {
      continue;
    }
    if (eventLiveSessionId !== liveSessionId || eventVoiceSessionId !== voiceSessionId) {
      continue;
    }
    coverage[event.eventType] = true;
    events.push({
      eventId,
      eventType: event.eventType,
      occurredAtMs,
      liveSessionId: eventLiveSessionId,
      voiceSessionId: eventVoiceSessionId,
      interviewSessionId: normalizeTelemetryToken(event.interviewSessionId) ?? undefined,
      payload: eventPayload,
    });
  }

  const reportedCount = isFiniteNumber(candidate.eventCount)
    ? Math.max(0, Math.floor(candidate.eventCount))
    : events.length;
  return {
    contractVersion: VOICE_RUNTIME_TELEMETRY_CONTRACT_VERSION,
    liveSessionId,
    voiceSessionId,
    interviewSessionId,
    correlationKey,
    eventCount: reportedCount,
    coverage,
    events,
  };
}

export function listMissingVoiceRuntimeTelemetryCoverage(
  contract: VoiceRuntimeTelemetryContract,
): VoiceRuntimeTelemetryEventType[] {
  return VOICE_RUNTIME_TELEMETRY_EVENT_TYPE_VALUES.filter(
    (eventType) => contract.coverage[eventType] !== true,
  );
}

function normalizeCanaryBudgetCount(value: unknown, fallback: number): number {
  if (!isFiniteNumber(value)) {
    return fallback;
  }
  return Math.max(0, Math.floor(value));
}

function normalizeCanaryThresholds(
  input?: Partial<VoiceRuntimeCanaryBudgetThresholds>,
): VoiceRuntimeCanaryBudgetThresholds {
  const requiredCoverageInput = Array.isArray(input?.requiredCoverage)
    ? input?.requiredCoverage
    : VOICE_RUNTIME_TELEMETRY_EVENT_TYPE_VALUES;
  const requiredCoverage = requiredCoverageInput.filter((eventType) =>
    VOICE_RUNTIME_TELEMETRY_EVENT_TYPE_VALUES.includes(eventType),
  );

  return {
    maxLatencyBreaches: normalizeCanaryBudgetCount(input?.maxLatencyBreaches, 1),
    maxFallbackTransitions: normalizeCanaryBudgetCount(input?.maxFallbackTransitions, 1),
    maxProviderFailures: normalizeCanaryBudgetCount(input?.maxProviderFailures, 1),
    maxReconnectEvents: normalizeCanaryBudgetCount(input?.maxReconnectEvents, 2),
    maxInterruptionEvents: normalizeCanaryBudgetCount(input?.maxInterruptionEvents, 3),
    requiredCoverage:
      requiredCoverage.length > 0
        ? requiredCoverage
        : [...VOICE_RUNTIME_TELEMETRY_EVENT_TYPE_VALUES],
  };
}

function isVoiceRuntimeLatencyBreach(
  event: VoiceRuntimeTelemetryEvent,
  latencyBreachThresholdMs: number,
): boolean {
  if (event.eventType !== "latency_checkpoint") {
    return false;
  }
  const latencyMs = event.payload.latencyMs;
  const targetMs = event.payload.targetMs;
  if (isFiniteNumber(targetMs) && isFiniteNumber(latencyMs)) {
    return latencyMs > targetMs;
  }
  if (isFiniteNumber(latencyMs)) {
    return latencyMs > latencyBreachThresholdMs;
  }
  return false;
}

export function evaluateVoiceRuntimeCanaryBudget(args: {
  contract: VoiceRuntimeTelemetryContract;
  windowStartedAtMs: number;
  windowEndedAtMs: number;
  thresholds?: Partial<VoiceRuntimeCanaryBudgetThresholds>;
  latencyBreachThresholdMs?: number;
}): VoiceRuntimeCanaryBudgetSnapshot {
  const thresholds = normalizeCanaryThresholds(args.thresholds);
  const latencyBreachThresholdMs = normalizeCanaryBudgetCount(
    args.latencyBreachThresholdMs,
    1000,
  );
  const coverageSet = new Set(thresholds.requiredCoverage);
  const missingCoverage = [...coverageSet].filter(
    (eventType) => args.contract.coverage[eventType] !== true,
  );

  const observed = {
    latencyBreaches: 0,
    fallbackTransitions: 0,
    providerFailures: 0,
    reconnectEvents: 0,
    interruptionEvents: 0,
    missingCoverage,
  };

  for (const event of args.contract.events) {
    if (!coverageSet.has(event.eventType)) {
      continue;
    }
    if (event.eventType === "fallback_transition") {
      observed.fallbackTransitions += 1;
    } else if (event.eventType === "provider_failure") {
      observed.providerFailures += 1;
    } else if (event.eventType === "reconnect") {
      observed.reconnectEvents += 1;
    } else if (event.eventType === "interruption") {
      observed.interruptionEvents += 1;
    }
    if (isVoiceRuntimeLatencyBreach(event, latencyBreachThresholdMs)) {
      observed.latencyBreaches += 1;
    }
  }

  const reasons: string[] = [];
  if (observed.missingCoverage.length > 0) {
    reasons.push("coverage_missing");
  }
  if (observed.latencyBreaches > thresholds.maxLatencyBreaches) {
    reasons.push("latency_breach_limit_exceeded");
  }
  if (observed.fallbackTransitions > thresholds.maxFallbackTransitions) {
    reasons.push("fallback_transition_limit_exceeded");
  }
  if (observed.providerFailures > thresholds.maxProviderFailures) {
    reasons.push("provider_failure_limit_exceeded");
  }
  if (observed.reconnectEvents > thresholds.maxReconnectEvents) {
    reasons.push("reconnect_limit_exceeded");
  }
  if (observed.interruptionEvents > thresholds.maxInterruptionEvents) {
    reasons.push("interruption_limit_exceeded");
  }

  const rollbackTriggered =
    reasons.includes("latency_breach_limit_exceeded")
    || reasons.includes("fallback_transition_limit_exceeded")
    || reasons.includes("provider_failure_limit_exceeded");
  const holdTriggered =
    reasons.includes("coverage_missing")
    || reasons.includes("reconnect_limit_exceeded")
    || reasons.includes("interruption_limit_exceeded");

  const decision: VoiceRuntimeCanaryDecision = rollbackTriggered
    ? "ROLLBACK"
    : holdTriggered
      ? "HOLD"
      : "PROMOTE";

  return {
    contractVersion: VOICE_RUNTIME_CANARY_BUDGET_VERSION,
    decision,
    liveSessionId: args.contract.liveSessionId,
    voiceSessionId: args.contract.voiceSessionId,
    correlationKey: args.contract.correlationKey,
    windowStartedAtMs: Math.floor(args.windowStartedAtMs),
    windowEndedAtMs: Math.floor(args.windowEndedAtMs),
    thresholds,
    observed,
    reasons,
  };
}

export function classifyVoiceProviderFailureReason(
  reasonCodeInput: unknown,
): VoiceProviderFailureClassification {
  const normalized = normalizeTelemetryToken(reasonCodeInput)?.toLowerCase() ?? "";
  if (!normalized) {
    return {
      reasonCode: "runtime_unknown_failure",
      healthStatus: "unknown",
    };
  }
  if (
    normalized.includes("websocket")
    || normalized.includes("network")
    || normalized.includes("connect")
    || normalized.includes("closed")
    || normalized.includes("transport")
  ) {
    return {
      reasonCode: "transport_connectivity_failure",
      healthStatus: "degraded",
    };
  }
  if (normalized.includes("timeout")) {
    return {
      reasonCode: "provider_timeout",
      healthStatus: "degraded",
    };
  }
  if (normalized.includes("degraded") || normalized.includes("health")) {
    return {
      reasonCode: "provider_health_degraded",
      healthStatus: "degraded",
    };
  }
  if (
    normalized.includes("unavailable")
    || normalized.includes("unsupported")
    || normalized.includes("not_implemented")
  ) {
    return {
      reasonCode: "provider_unavailable",
      healthStatus: "unavailable",
    };
  }
  if (normalized.includes("transcription")) {
    return {
      reasonCode: "transcription_failure",
      healthStatus: "degraded",
    };
  }
  if (normalized.includes("synthesis") || normalized.includes("tts")) {
    return {
      reasonCode: "synthesis_failure",
      healthStatus: "degraded",
    };
  }
  return {
    reasonCode: "runtime_unknown_failure",
    healthStatus: "unknown",
  };
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

export const TRUST_RELEASE_GATE_EVIDENCE_VERSION =
  "tcg_release_gate_evidence_v1";

export type TrustReleaseGateMetricStatus = "observed" | "missing";
export type TrustReleaseGateOwner = "runtime_oncall" | "ops_owner" | "platform_admin";

export interface TrustReleaseGateMetricEvidence {
  metric: TrustKpiMetricKey;
  status: TrustReleaseGateMetricStatus;
  observedValue: number | null;
  severity: TrustKpiSeverity;
  thresholdValue: number | null;
}

export interface TrustReleaseGateIncidentAction {
  metric: TrustKpiMetricKey;
  severity: TrustKpiSeverity;
  owner: TrustReleaseGateOwner;
  action: string;
}

export interface TrustReleaseGateEvidence {
  contractVersion: typeof TRUST_RELEASE_GATE_EVIDENCE_VERSION;
  generatedAt: number;
  decision: TrustRolloutGuardrailDecision["status"];
  requiredMetrics: TrustKpiMetricKey[];
  metrics: TrustReleaseGateMetricEvidence[];
  missingMetrics: TrustKpiMetricKey[];
  warningMetrics: TrustKpiMetricKey[];
  criticalMetrics: TrustKpiMetricKey[];
  incidentActions: TrustReleaseGateIncidentAction[];
}

const TRUST_RELEASE_GATE_ACTIONS: Record<
  TrustKpiMetricKey,
  {
    owner: TrustReleaseGateOwner;
    warningAction: string;
    criticalAction: string;
    missingAction: string;
  }
> = {
  voice_session_start_rate: {
    owner: "runtime_oncall",
    warningAction:
      "Review ingress-to-capture transition logs and validate queue/routing latency before enabling broader rollout.",
    criticalAction:
      "Pause rollout and investigate capture bootstrap failures across ingress and runtime transition checkpoints.",
    missingAction:
      "Hold rollout and backfill start-rate telemetry for the current gate window before reassessing.",
  },
  voice_session_completion_rate: {
    owner: "runtime_oncall",
    warningAction:
      "Inspect lifecycle transitions for stalled sessions and verify completion checkpoint integrity.",
    criticalAction:
      "Trigger rollback path and investigate completion/drop-off regressions in live runtime flows.",
    missingAction:
      "Hold rollout and recover completion-rate telemetry snapshots for the full gate window.",
  },
  voice_cancel_without_save_rate: {
    owner: "ops_owner",
    warningAction:
      "Audit cancellation checkpoints and operator interventions to reduce pre-save abandonment.",
    criticalAction:
      "Pause rollout and execute cancellation incident playbook before any expansion.",
    missingAction:
      "Hold rollout and capture cancel-without-save metrics before approving any gate transition.",
  },
  voice_memory_consent_accept_rate: {
    owner: "ops_owner",
    warningAction:
      "Review memory consent prompts and operator guidance to improve consent acceptance quality.",
    criticalAction:
      "Freeze rollout and remediate consent experience regressions prior to further exposure.",
    missingAction:
      "Hold rollout and backfill consent acceptance telemetry for deterministic gate evidence.",
  },
  voice_runtime_failure_rate: {
    owner: "runtime_oncall",
    warningAction:
      "Increase runtime watch, review provider failover traces, and prepare rollback if failure pressure rises.",
    criticalAction:
      "Execute rollback immediately and open runtime incident response with provider health diagnostics.",
    missingAction:
      "Hold rollout and restore runtime failure-rate telemetry before making release decisions.",
  },
  agent_creation_handoff_success_rate: {
    owner: "platform_admin",
    warningAction:
      "Inspect handoff lifecycle traces for context loss and proposal-to-commit continuity gaps.",
    criticalAction:
      "Pause rollout and remediate handoff reliability before accepting new traffic.",
    missingAction:
      "Hold rollout and restore handoff success telemetry for the required audit window.",
  },
};

function buildTrustReleaseGateIncidentActions(args: {
  requiredMetrics: readonly TrustKpiMetricKey[];
  missingMetrics: readonly TrustKpiMetricKey[];
  warningMetrics: readonly TrustKpiMetricKey[];
  criticalMetrics: readonly TrustKpiMetricKey[];
}): TrustReleaseGateIncidentAction[] {
  const missingSet = new Set(args.missingMetrics);
  const warningSet = new Set(args.warningMetrics);
  const criticalSet = new Set(args.criticalMetrics);
  return args.requiredMetrics
    .filter(
      (metric) =>
        missingSet.has(metric) || warningSet.has(metric) || criticalSet.has(metric)
    )
    .map((metric) => {
      const actionConfig = TRUST_RELEASE_GATE_ACTIONS[metric];
      if (criticalSet.has(metric)) {
        return {
          metric,
          severity: "critical" as const,
          owner: actionConfig.owner,
          action: actionConfig.criticalAction,
        };
      }
      if (warningSet.has(metric)) {
        return {
          metric,
          severity: "warning" as const,
          owner: actionConfig.owner,
          action: actionConfig.warningAction,
        };
      }
      return {
        metric,
        severity: "critical" as const,
        owner: actionConfig.owner,
        action: actionConfig.missingAction,
      };
    });
}

export function buildTrustReleaseGateEvidence(args: {
  observations: Partial<Record<TrustKpiMetricKey, number>>;
  requiredMetrics?: readonly TrustKpiMetricKey[];
  generatedAt?: number;
}): TrustReleaseGateEvidence {
  const requiredMetrics = [...(args.requiredMetrics ?? TRUST_ROLLOUT_REQUIRED_METRICS)];
  const guardrail = evaluateTrustRolloutGuardrails(args.observations, requiredMetrics);

  const metrics: TrustReleaseGateMetricEvidence[] = requiredMetrics.map((metric) => {
    const observedValue = args.observations[metric];
    if (!isFiniteNumber(observedValue)) {
      return {
        metric,
        status: "missing",
        observedValue: null,
        severity: "critical",
        thresholdValue: null,
      };
    }
    const evaluation = evaluateTrustKpiMetric(metric, observedValue);
    return {
      metric,
      status: "observed",
      observedValue,
      severity: evaluation.severity,
      thresholdValue: evaluation.thresholdValue,
    };
  });

  return {
    contractVersion: TRUST_RELEASE_GATE_EVIDENCE_VERSION,
    generatedAt: args.generatedAt ?? Date.now(),
    decision: guardrail.status,
    requiredMetrics,
    metrics,
    missingMetrics: [...guardrail.missingMetrics],
    warningMetrics: [...guardrail.warningMetrics],
    criticalMetrics: [...guardrail.criticalMetrics],
    incidentActions: buildTrustReleaseGateIncidentActions({
      requiredMetrics,
      missingMetrics: guardrail.missingMetrics,
      warningMetrics: guardrail.warningMetrics,
      criticalMetrics: guardrail.criticalMetrics,
    }),
  };
}

export type AgentOpsAlertMetricKey =
  | "fallback_spike"
  | "tool_failure_spike"
  | "ingress_failure_spike";

export type AgentOpsAlertSeverity = "ok" | "warning" | "critical";

export interface AgentOpsAlertThresholdDefinition {
  ruleId: string;
  displayName: string;
  description: string;
  warningThreshold: number;
  criticalThreshold: number;
  windowHours: number;
  rollbackCriteria: string;
  escalationOwner: TrustReleaseGateOwner;
}

export interface AgentOpsAlertEvaluation {
  metric: AgentOpsAlertMetricKey;
  observedValue: number;
  severity: AgentOpsAlertSeverity;
  thresholdValue: number | null;
}

export const AGENT_OPS_ALERT_THRESHOLD_DEFINITIONS: Record<
  AgentOpsAlertMetricKey,
  AgentOpsAlertThresholdDefinition
> = {
  fallback_spike: {
    ruleId: "agent_ops.fallback_spike.v1",
    displayName: "Fallback spike",
    description:
      "Share of message_processed actions that required model fallback in the scoped window.",
    warningThreshold: 0.25,
    criticalThreshold: 0.4,
    windowHours: 24,
    rollbackCriteria:
      "Rollback if fallback rate stays above critical threshold for two consecutive evaluations.",
    escalationOwner: "runtime_oncall",
  },
  tool_failure_spike: {
    ruleId: "agent_ops.tool_failure_spike.v1",
    displayName: "Tool failure spike",
    description:
      "Share of tool outcomes marked failed/error/disabled in the scoped window.",
    warningThreshold: 0.18,
    criticalThreshold: 0.3,
    windowHours: 24,
    rollbackCriteria:
      "Rollback if tool failure rate exceeds the critical threshold after mitigation replay checks.",
    escalationOwner: "runtime_oncall",
  },
  ingress_failure_spike: {
    ruleId: "agent_ops.ingress_failure_spike.v1",
    displayName: "Ingress failure spike",
    description:
      "Share of webhook ingress events marked error in the scoped window.",
    warningThreshold: 0.03,
    criticalThreshold: 0.08,
    windowHours: 24,
    rollbackCriteria:
      "Rollback ingress rollout if error-rate critical threshold is hit with unresolved provider incident.",
    escalationOwner: "ops_owner",
  },
};

export function evaluateAgentOpsAlertThreshold(
  metric: AgentOpsAlertMetricKey,
  observedValue: number
): AgentOpsAlertEvaluation {
  const definition = AGENT_OPS_ALERT_THRESHOLD_DEFINITIONS[metric];
  if (!Number.isFinite(observedValue)) {
    return {
      metric,
      observedValue: Number.NaN,
      severity: "critical",
      thresholdValue: null,
    };
  }

  if (observedValue >= definition.criticalThreshold) {
    return {
      metric,
      observedValue,
      severity: "critical",
      thresholdValue: definition.criticalThreshold,
    };
  }

  if (observedValue >= definition.warningThreshold) {
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
