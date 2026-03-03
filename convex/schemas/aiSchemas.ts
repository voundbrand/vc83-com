import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  trustEventActorTypeValidator,
  trustEventModeValidator,
  trustEventNameValidator,
  trustEventSchemaValidationStatusValidator,
} from "../ai/trustEvents";
import {
  aiBillingSourceValidator,
  aiCapabilityMatrixValidator,
  aiCredentialSourceValidator,
  aiProviderIdValidator,
} from "./coreSchemas";

// ============================================================================
// COORDINATION KERNEL ENUMS (Plans 14-15)
// ============================================================================

export const AGENT_TURN_STATE_VALUES = [
  "queued",
  "running",
  "suspended",
  "completed",
  "failed",
  "cancelled",
] as const;
export type AgentTurnState = (typeof AGENT_TURN_STATE_VALUES)[number];

export const AGENT_TURN_TRANSITION_VALUES = [
  "inbound_received",
  "turn_enqueued",
  "lease_acquired",
  "lease_heartbeat",
  "lease_released",
  "lease_failed",
  "turn_resumed",
  "turn_suspended",
  "turn_completed",
  "turn_failed",
  "handoff_initiated",
  "handoff_completed",
  "escalation_started",
  "escalation_resolved",
  "stale_recovered",
  "duplicate_dropped",
  "terminal_deliverable_recorded",
] as const;
export type AgentTurnTransition = (typeof AGENT_TURN_TRANSITION_VALUES)[number];

export const AGENT_TURN_TRANSITION_POLICY_VERSION = 1 as const;

export const AGENT_TURN_REPLAY_INVARIANT_VALUES = [
  "validated",
  "legacy_compatible",
] as const;
export type AgentTurnReplayInvariantStatus =
  (typeof AGENT_TURN_REPLAY_INVARIANT_VALUES)[number];

type AgentTurnStateConstraint = AgentTurnState | "*" | null;

interface AgentTurnTransitionPolicyRule {
  ruleId: string;
  transition: AgentTurnTransition;
  fromState: AgentTurnStateConstraint;
  toState: AgentTurnStateConstraint;
  stateRelation?: "same" | "different";
  notes: string;
}

export const AGENT_TURN_TRANSITION_POLICY_RULES:
readonly AgentTurnTransitionPolicyRule[] = [
  {
    ruleId: "TCG-TP-01",
    transition: "inbound_received",
    fromState: null,
    toState: "queued",
    notes: "Ingress creates a queued turn before lease acquisition.",
  },
  {
    ruleId: "TCG-TP-02",
    transition: "turn_enqueued",
    fromState: null,
    toState: "queued",
    notes: "Queue placement may occur immediately after turn creation.",
  },
  {
    ruleId: "TCG-TP-03",
    transition: "turn_enqueued",
    fromState: "queued",
    toState: "queued",
    stateRelation: "same",
    notes: "Compatibility path for queue replay edges with explicit fromState.",
  },
  {
    ruleId: "TCG-TP-04",
    transition: "lease_acquired",
    fromState: "queued",
    toState: "running",
    notes: "Primary lease acquisition from queue.",
  },
  {
    ruleId: "TCG-TP-05",
    transition: "lease_acquired",
    fromState: "suspended",
    toState: "running",
    notes: "Lease reacquisition resumes suspended work.",
  },
  {
    ruleId: "TCG-TP-06",
    transition: "lease_acquired",
    fromState: "running",
    toState: "running",
    stateRelation: "same",
    notes: "Idempotent reacquire for the same owner keeps running state.",
  },
  {
    ruleId: "TCG-TP-07",
    transition: "lease_heartbeat",
    fromState: "running",
    toState: "running",
    stateRelation: "same",
    notes: "Heartbeat extends lease without state mutation.",
  },
  {
    ruleId: "TCG-TP-08",
    transition: "lease_released",
    fromState: "running",
    toState: "cancelled",
    notes: "Lease release without completion maps to cancelled.",
  },
  {
    ruleId: "TCG-TP-09",
    transition: "lease_failed",
    fromState: "*",
    toState: "failed",
    notes: "Lease orchestration failure escalates turn into failed.",
  },
  {
    ruleId: "TCG-TP-10",
    transition: "turn_resumed",
    fromState: "suspended",
    toState: "running",
    notes: "Suspended turn resumes to running.",
  },
  {
    ruleId: "TCG-TP-11",
    transition: "turn_suspended",
    fromState: "running",
    toState: "suspended",
    notes: "Runtime checkpoint suspension.",
  },
  {
    ruleId: "TCG-TP-12",
    transition: "turn_completed",
    fromState: "running",
    toState: "completed",
    notes: "Successful completion.",
  },
  {
    ruleId: "TCG-TP-13",
    transition: "turn_failed",
    fromState: "queued",
    toState: "failed",
    notes: "Fail-closed before execution starts.",
  },
  {
    ruleId: "TCG-TP-14",
    transition: "turn_failed",
    fromState: "running",
    toState: "failed",
    notes: "Runtime failure from active execution.",
  },
  {
    ruleId: "TCG-TP-15",
    transition: "turn_failed",
    fromState: "suspended",
    toState: "failed",
    notes: "Suspended turns can be terminated as failed.",
  },
  {
    ruleId: "TCG-TP-16",
    transition: "turn_failed",
    fromState: "failed",
    toState: "failed",
    stateRelation: "same",
    notes: "Compatibility path for repeated failure marking.",
  },
  {
    ruleId: "TCG-TP-17",
    transition: "handoff_initiated",
    fromState: "*",
    toState: "*",
    stateRelation: "same",
    notes: "Handoff checkpoints are non-state-changing replay edges.",
  },
  {
    ruleId: "TCG-TP-18",
    transition: "handoff_completed",
    fromState: "*",
    toState: "*",
    stateRelation: "same",
    notes: "Handoff completion is append-only metadata on same state.",
  },
  {
    ruleId: "TCG-TP-19",
    transition: "escalation_started",
    fromState: "*",
    toState: "*",
    stateRelation: "same",
    notes: "Escalation start is checkpoint metadata.",
  },
  {
    ruleId: "TCG-TP-20",
    transition: "escalation_resolved",
    fromState: "*",
    toState: "*",
    stateRelation: "same",
    notes: "Escalation resolution is checkpoint metadata.",
  },
  {
    ruleId: "TCG-TP-21",
    transition: "stale_recovered",
    fromState: "running",
    toState: "suspended",
    notes: "Expired leases are recovered into suspended state.",
  },
  {
    ruleId: "TCG-TP-22",
    transition: "stale_recovered",
    fromState: "*",
    toState: "*",
    stateRelation: "same",
    notes: "Legacy compatibility for stale recovery checkpoint edges.",
  },
  {
    ruleId: "TCG-TP-23",
    transition: "duplicate_dropped",
    fromState: "*",
    toState: "*",
    stateRelation: "same",
    notes: "Duplicate ingress does not mutate turn state.",
  },
  {
    ruleId: "TCG-TP-24",
    transition: "terminal_deliverable_recorded",
    fromState: "*",
    toState: "*",
    stateRelation: "same",
    notes: "Terminal deliverable pointer write is non-state transition.",
  },
] as const;

export function isAgentTurnState(value: string): value is AgentTurnState {
  return (AGENT_TURN_STATE_VALUES as readonly string[]).includes(value);
}

function matchesAgentTurnStateConstraint(
  constraint: AgentTurnStateConstraint,
  observed: AgentTurnState | undefined
): boolean {
  if (constraint === null) {
    return typeof observed === "undefined";
  }
  if (constraint === "*") {
    return typeof observed !== "undefined";
  }
  return observed === constraint;
}

function matchesStateRelation(
  relation: AgentTurnTransitionPolicyRule["stateRelation"],
  fromState: AgentTurnState | undefined,
  toState: AgentTurnState | undefined
): boolean {
  if (!relation) {
    return true;
  }
  if (typeof fromState === "undefined" || typeof toState === "undefined") {
    return false;
  }
  if (relation === "same") {
    return fromState === toState;
  }
  return fromState !== toState;
}

export function isAllowedAgentTurnTransitionEdge(args: {
  transition: AgentTurnTransition;
  fromState?: AgentTurnState;
  toState?: AgentTurnState;
}): boolean {
  return AGENT_TURN_TRANSITION_POLICY_RULES.some((rule) => {
    if (rule.transition !== args.transition) {
      return false;
    }
    if (!matchesAgentTurnStateConstraint(rule.fromState, args.fromState)) {
      return false;
    }
    if (!matchesAgentTurnStateConstraint(rule.toState, args.toState)) {
      return false;
    }
    return matchesStateRelation(rule.stateRelation, args.fromState, args.toState);
  });
}

export function assertAgentTurnTransitionEdge(args: {
  transition: AgentTurnTransition;
  fromState?: AgentTurnState;
  toState?: AgentTurnState;
}) {
  if (!isAllowedAgentTurnTransitionEdge(args)) {
    throw new Error(
      `Invalid agent turn transition edge ${args.transition} ` +
      `(from=${args.fromState ?? "undefined"}, to=${args.toState ?? "undefined"})`
    );
  }
}

export const agentTurnStateValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("suspended"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled"),
);

export const agentTurnTransitionValidator = v.union(
  v.literal("inbound_received"),
  v.literal("turn_enqueued"),
  v.literal("lease_acquired"),
  v.literal("lease_heartbeat"),
  v.literal("lease_released"),
  v.literal("lease_failed"),
  v.literal("turn_resumed"),
  v.literal("turn_suspended"),
  v.literal("turn_completed"),
  v.literal("turn_failed"),
  v.literal("handoff_initiated"),
  v.literal("handoff_completed"),
  v.literal("escalation_started"),
  v.literal("escalation_resolved"),
  v.literal("stale_recovered"),
  v.literal("duplicate_dropped"),
  v.literal("terminal_deliverable_recorded"),
);

// ============================================================================
// EXECUTION RUNTIME CONTRACTS (TCG-005..TCG-008, TCG-015)
// ============================================================================

export const TURN_QUEUE_CONTRACT_VERSION = "tcg_turn_queue_v1" as const;

export const TURN_QUEUE_CONFLICT_LABEL_VALUES = [
  "conflict_turn_in_progress",
  "conflict_commit_in_progress",
  "conflict_queue_ordering",
  "replay_duplicate_ingress",
  "replay_duplicate_proposal",
  "replay_duplicate_commit",
] as const;
export type TurnQueueConflictLabel =
  (typeof TURN_QUEUE_CONFLICT_LABEL_VALUES)[number];

export const turnQueueConflictLabelValidator = v.union(
  v.literal("conflict_turn_in_progress"),
  v.literal("conflict_commit_in_progress"),
  v.literal("conflict_queue_ordering"),
  v.literal("replay_duplicate_ingress"),
  v.literal("replay_duplicate_proposal"),
  v.literal("replay_duplicate_commit"),
);

export interface TurnQueueContract {
  contractVersion: typeof TURN_QUEUE_CONTRACT_VERSION;
  tenantId: string;
  routeKey: string;
  workflowKey: string;
  lineageId?: string;
  threadId?: string;
  concurrencyKey: string;
  orderingKey: string;
  conflictLabel: TurnQueueConflictLabel;
}

export const turnQueueContractValidator = v.object({
  contractVersion: v.literal(TURN_QUEUE_CONTRACT_VERSION),
  tenantId: v.string(),
  routeKey: v.string(),
  workflowKey: v.string(),
  lineageId: v.optional(v.string()),
  threadId: v.optional(v.string()),
  concurrencyKey: v.string(),
  orderingKey: v.string(),
  conflictLabel: turnQueueConflictLabelValidator,
});

export const IDEMPOTENCY_CONTRACT_VERSION = "tcg_idempotency_v1" as const;

export const IDEMPOTENCY_SCOPE_KIND_VALUES = [
  "org",
  "route_workflow",
  "collaboration",
] as const;
export type IdempotencyScopeKind = (typeof IDEMPOTENCY_SCOPE_KIND_VALUES)[number];

export const idempotencyScopeKindValidator = v.union(
  v.literal("org"),
  v.literal("route_workflow"),
  v.literal("collaboration"),
);

export const IDEMPOTENCY_INTENT_VALUES = [
  "ingress",
  "orchestration",
  "proposal",
  "commit",
] as const;
export type IdempotencyIntentType = (typeof IDEMPOTENCY_INTENT_VALUES)[number];

export const idempotencyIntentTypeValidator = v.union(
  v.literal("ingress"),
  v.literal("orchestration"),
  v.literal("proposal"),
  v.literal("commit"),
);

export const IDEMPOTENCY_REPLAY_OUTCOME_VALUES = [
  "accepted",
  "duplicate_acknowledged",
  "replay_previous_result",
  "conflict_commit_in_progress",
] as const;
export type IdempotencyReplayOutcome =
  (typeof IDEMPOTENCY_REPLAY_OUTCOME_VALUES)[number];

export const idempotencyReplayOutcomeValidator = v.union(
  v.literal("accepted"),
  v.literal("duplicate_acknowledged"),
  v.literal("replay_previous_result"),
  v.literal("conflict_commit_in_progress"),
);

export interface RuntimeIdempotencyContract {
  contractVersion: typeof IDEMPOTENCY_CONTRACT_VERSION;
  scopeKind: IdempotencyScopeKind;
  scopeKey: string;
  intentType: IdempotencyIntentType;
  payloadHash: string;
  ttlMs: number;
  issuedAt: number;
  expiresAt: number;
  replayOutcome: IdempotencyReplayOutcome;
}

export const runtimeIdempotencyContractValidator = v.object({
  contractVersion: v.literal(IDEMPOTENCY_CONTRACT_VERSION),
  scopeKind: idempotencyScopeKindValidator,
  scopeKey: v.string(),
  intentType: idempotencyIntentTypeValidator,
  payloadHash: v.string(),
  ttlMs: v.number(),
  issuedAt: v.number(),
  expiresAt: v.number(),
  replayOutcome: idempotencyReplayOutcomeValidator,
});

export const RUN_ATTEMPT_CONTRACT_VERSION = "tcg_run_attempt_v1" as const;

export const RUN_ATTEMPT_DELAY_REASON_VALUES = [
  "none",
  "retry_backoff",
  "provider_failover",
  "auth_profile_rotation",
] as const;
export type RunAttemptDelayReason =
  (typeof RUN_ATTEMPT_DELAY_REASON_VALUES)[number];

export const runAttemptDelayReasonValidator = v.union(
  v.literal("none"),
  v.literal("retry_backoff"),
  v.literal("provider_failover"),
  v.literal("auth_profile_rotation"),
);

export const RUN_ATTEMPT_TERMINAL_OUTCOME_VALUES = [
  "success",
  "failed",
  "blocked_sync_checkpoint",
] as const;
export type RunAttemptTerminalOutcome =
  (typeof RUN_ATTEMPT_TERMINAL_OUTCOME_VALUES)[number];

export const runAttemptTerminalOutcomeValidator = v.union(
  v.literal("success"),
  v.literal("failed"),
  v.literal("blocked_sync_checkpoint"),
);

export interface AgentTurnRunAttemptContract {
  contractVersion: typeof RUN_ATTEMPT_CONTRACT_VERSION;
  attempts: number;
  maxAttempts: number;
  delayReason: RunAttemptDelayReason;
  delayMs: number;
  terminalOutcome: RunAttemptTerminalOutcome;
  updatedAt: number;
}

export const agentTurnRunAttemptContractValidator = v.object({
  contractVersion: v.literal(RUN_ATTEMPT_CONTRACT_VERSION),
  attempts: v.number(),
  maxAttempts: v.number(),
  delayReason: runAttemptDelayReasonValidator,
  delayMs: v.number(),
  terminalOutcome: runAttemptTerminalOutcomeValidator,
  updatedAt: v.number(),
});

export const EXECUTION_BUNDLE_CONTRACT_VERSION = "tcg_execution_bundle_v1" as const;

export interface AgentExecutionBundleContract {
  contractVersion: typeof EXECUTION_BUNDLE_CONTRACT_VERSION;
  modelId: string;
  providerId: string;
  authProfileId?: string;
  systemPromptHash: string;
  toolCatalogHash: string;
  runtimePolicyVersion: string;
  pinnedAt: number;
}

export const agentExecutionBundleContractValidator = v.object({
  contractVersion: v.literal(EXECUTION_BUNDLE_CONTRACT_VERSION),
  modelId: v.string(),
  providerId: v.string(),
  authProfileId: v.optional(v.string()),
  systemPromptHash: v.string(),
  toolCatalogHash: v.string(),
  runtimePolicyVersion: v.string(),
  pinnedAt: v.number(),
});

// ============================================================================
// LOC-020 AI AGENT MEMORY CONTRACT DECISION
// ============================================================================

export const AI_AGENT_MEMORY_RUNTIME_CONTRACT_VERSION =
  "occ_ai_agent_memory_runtime_v1" as const;
export const AI_AGENT_MEMORY_RUNTIME_DECISION = "deprecate" as const;
export type AiAgentMemoryRuntimeDecision =
  typeof AI_AGENT_MEMORY_RUNTIME_DECISION;
export const aiAgentMemoryRuntimeDecisionValidator = v.literal(
  AI_AGENT_MEMORY_RUNTIME_DECISION
);

// ============================================================================
// AV MEDIA SESSION INGRESS CONTRACT (AVR-002)
// ============================================================================

export const MEDIA_SESSION_INGRESS_CONTRACT_VERSION =
  "avr_media_session_ingress_v1" as const;

export const MEDIA_SESSION_SOURCE_CLASS_VALUES = [
  "desktop_screenshot",
  "desktop_record",
  "webcam",
  "digital_video_input",
  "mobile_stream_ios",
  "mobile_stream_android",
  "glasses_stream_meta",
  "usb_capture",
  "hdmi_capture",
  "ndi_capture",
] as const;
export type MediaSessionSourceClass =
  (typeof MEDIA_SESSION_SOURCE_CLASS_VALUES)[number];

export const mediaSessionSourceClassValidator = v.union(
  v.literal("desktop_screenshot"),
  v.literal("desktop_record"),
  v.literal("webcam"),
  v.literal("digital_video_input"),
  v.literal("mobile_stream_ios"),
  v.literal("mobile_stream_android"),
  v.literal("glasses_stream_meta"),
  v.literal("usb_capture"),
  v.literal("hdmi_capture"),
  v.literal("ndi_capture"),
);

export const MEDIA_SESSION_CAPTURE_MODE_VALUES = [
  "screenshot",
  "record",
  "stream",
] as const;
export type MediaSessionCaptureMode =
  (typeof MEDIA_SESSION_CAPTURE_MODE_VALUES)[number];

export const mediaSessionCaptureModeValidator = v.union(
  v.literal("screenshot"),
  v.literal("record"),
  v.literal("stream"),
);

export const MEDIA_SESSION_TRANSPORT_MODE_VALUES = [
  "realtime",
  "buffered",
  "batch_replay",
] as const;
export type MediaSessionTransportMode =
  (typeof MEDIA_SESSION_TRANSPORT_MODE_VALUES)[number];

export const mediaSessionTransportModeValidator = v.union(
  v.literal("realtime"),
  v.literal("buffered"),
  v.literal("batch_replay"),
);

export const MEDIA_SESSION_TRANSPORT_FALLBACK_REASON_VALUES = [
  "none",
  "network_degraded",
  "capture_backpressure",
  "device_unavailable",
  "provider_failover",
  "policy_restricted",
] as const;
export type MediaSessionTransportFallbackReason =
  (typeof MEDIA_SESSION_TRANSPORT_FALLBACK_REASON_VALUES)[number];

export const mediaSessionTransportFallbackReasonValidator = v.union(
  v.literal("none"),
  v.literal("network_degraded"),
  v.literal("capture_backpressure"),
  v.literal("device_unavailable"),
  v.literal("provider_failover"),
  v.literal("policy_restricted"),
);

export const mediaSessionFrameResolutionValidator = v.object({
  width: v.number(),
  height: v.number(),
});

export interface MediaSessionCaptureDiagnostics {
  captureToIngressLatencyMs?: number;
  droppedFrameCount?: number;
  lateFrameCount?: number;
  captureErrorCode?: string;
}

export const mediaSessionCaptureDiagnosticsValidator = v.object({
  captureToIngressLatencyMs: v.optional(v.number()),
  droppedFrameCount: v.optional(v.number()),
  lateFrameCount: v.optional(v.number()),
  captureErrorCode: v.optional(v.string()),
});

export interface MediaSessionTransportDiagnostics {
  latencyMsP50?: number;
  latencyMsP95?: number;
  jitterMsP50?: number;
  jitterMsP95?: number;
  packetLossPct?: number;
  bitrateKbps?: number;
  reconnectCount?: number;
  fallbackTransitionCount?: number;
}

export const mediaSessionTransportDiagnosticsValidator = v.object({
  latencyMsP50: v.optional(v.number()),
  latencyMsP95: v.optional(v.number()),
  jitterMsP50: v.optional(v.number()),
  jitterMsP95: v.optional(v.number()),
  packetLossPct: v.optional(v.number()),
  bitrateKbps: v.optional(v.number()),
  reconnectCount: v.optional(v.number()),
  fallbackTransitionCount: v.optional(v.number()),
});

export interface MediaSessionCameraRuntime {
  provider: string;
  sourceClass: MediaSessionSourceClass;
  sourceId: string;
  deviceId?: string;
  deviceProfile?: string;
  frameTimestampMs: number;
  sequence: number;
  transport?: string;
  frameRate?: number;
  resolution?: {
    width: number;
    height: number;
  };
}

export const mediaSessionCameraRuntimeValidator = v.object({
  provider: v.string(),
  sourceClass: mediaSessionSourceClassValidator,
  sourceId: v.string(),
  deviceId: v.optional(v.string()),
  deviceProfile: v.optional(v.string()),
  frameTimestampMs: v.number(),
  sequence: v.number(),
  transport: v.optional(v.string()),
  frameRate: v.optional(v.number()),
  resolution: v.optional(mediaSessionFrameResolutionValidator),
});

export interface MediaSessionVoiceRuntime {
  voiceSessionId: string;
  requestedProviderId?: string;
  providerId: string;
  mimeType: string;
  language?: string;
  sampleRateHz?: number;
  packetSequence?: number;
  packetTimestampMs?: number;
  audioPayloadBase64?: string;
}

export const mediaSessionVoiceRuntimeValidator = v.object({
  voiceSessionId: v.string(),
  requestedProviderId: v.optional(v.string()),
  providerId: v.string(),
  mimeType: v.string(),
  language: v.optional(v.string()),
  sampleRateHz: v.optional(v.number()),
  packetSequence: v.optional(v.number()),
  packetTimestampMs: v.optional(v.number()),
  audioPayloadBase64: v.optional(v.string()),
});

export interface MediaSessionVideoRuntime {
  videoSessionId: string;
  requestedProviderId?: string;
  providerId: string;
  mimeType?: string;
  codec?: string;
  frameRate?: number;
  width?: number;
  height?: number;
  packetSequence?: number;
  packetTimestampMs?: number;
  framePayloadBase64?: string;
}

export const mediaSessionVideoRuntimeValidator = v.object({
  videoSessionId: v.string(),
  requestedProviderId: v.optional(v.string()),
  providerId: v.string(),
  mimeType: v.optional(v.string()),
  codec: v.optional(v.string()),
  frameRate: v.optional(v.number()),
  width: v.optional(v.number()),
  height: v.optional(v.number()),
  packetSequence: v.optional(v.number()),
  packetTimestampMs: v.optional(v.number()),
  framePayloadBase64: v.optional(v.string()),
});

export interface MediaSessionCaptureRuntime {
  sourceClass: MediaSessionSourceClass;
  sourceId: string;
  captureMode: MediaSessionCaptureMode;
  captureTimestampMs: number;
  frameTimestampMs?: number;
  sequence?: number;
  frameRate?: number;
  resolution?: {
    width: number;
    height: number;
  };
  withSystemAudio?: boolean;
  withMicAudio?: boolean;
  diagnostics?: MediaSessionCaptureDiagnostics;
}

export const mediaSessionCaptureRuntimeValidator = v.object({
  sourceClass: mediaSessionSourceClassValidator,
  sourceId: v.string(),
  captureMode: mediaSessionCaptureModeValidator,
  captureTimestampMs: v.number(),
  frameTimestampMs: v.optional(v.number()),
  sequence: v.optional(v.number()),
  frameRate: v.optional(v.number()),
  resolution: v.optional(mediaSessionFrameResolutionValidator),
  withSystemAudio: v.optional(v.boolean()),
  withMicAudio: v.optional(v.boolean()),
  diagnostics: v.optional(mediaSessionCaptureDiagnosticsValidator),
});

export interface MediaSessionTransportRuntime {
  mode: MediaSessionTransportMode;
  fallbackReason: MediaSessionTransportFallbackReason;
  ingressTimestampMs: number;
  transportId?: string;
  protocol?: string;
  diagnostics?: MediaSessionTransportDiagnostics;
}

export const mediaSessionTransportRuntimeValidator = v.object({
  mode: mediaSessionTransportModeValidator,
  fallbackReason: mediaSessionTransportFallbackReasonValidator,
  ingressTimestampMs: v.number(),
  transportId: v.optional(v.string()),
  protocol: v.optional(v.string()),
  diagnostics: v.optional(mediaSessionTransportDiagnosticsValidator),
});

export const VOICE_TRANSPORT_ENVELOPE_CONTRACT_VERSION =
  "voice_transport_v1" as const;

export const VOICE_TRANSPORT_MODE_VALUES = [
  "webrtc",
  "websocket",
] as const;
export type VoiceTransportMode = (typeof VOICE_TRANSPORT_MODE_VALUES)[number];

export const voiceTransportModeValidator = v.union(
  v.literal("webrtc"),
  v.literal("websocket"),
);

export const VOICE_TRANSPORT_EVENT_TYPE_VALUES = [
  "session_open",
  "audio_chunk",
  "partial_transcript",
  "final_transcript",
  "assistant_audio_chunk",
  "assistant_audio_final",
  "barge_in",
  "session_close",
  "heartbeat",
  "error",
] as const;
export type VoiceTransportEventType = (typeof VOICE_TRANSPORT_EVENT_TYPE_VALUES)[number];

export const voiceTransportEventTypeValidator = v.union(
  v.literal("session_open"),
  v.literal("audio_chunk"),
  v.literal("partial_transcript"),
  v.literal("final_transcript"),
  v.literal("assistant_audio_chunk"),
  v.literal("assistant_audio_final"),
  v.literal("barge_in"),
  v.literal("session_close"),
  v.literal("heartbeat"),
  v.literal("error"),
);

export const VOICE_TRANSPORT_PCM_ENCODING_VALUES = [
  "pcm_s16le",
  "pcm_f32le",
] as const;
export type VoiceTransportPcmEncoding =
  (typeof VOICE_TRANSPORT_PCM_ENCODING_VALUES)[number];

export const voiceTransportPcmEncodingValidator = v.union(
  v.literal("pcm_s16le"),
  v.literal("pcm_f32le"),
);

export interface VoiceTransportPcmContract {
  encoding: VoiceTransportPcmEncoding;
  sampleRateHz: number;
  channels: number;
  frameDurationMs: number;
}

export const voiceTransportPcmContractValidator = v.object({
  encoding: voiceTransportPcmEncodingValidator,
  sampleRateHz: v.number(),
  channels: v.number(),
  frameDurationMs: v.number(),
});

export const VOICE_TRANSPORT_RETRY_REASON_VALUES = [
  "network_recovery",
  "provider_retry",
  "backpressure_replay",
] as const;
export type VoiceTransportRetryReason =
  (typeof VOICE_TRANSPORT_RETRY_REASON_VALUES)[number];

export const voiceTransportRetryReasonValidator = v.union(
  v.literal("network_recovery"),
  v.literal("provider_retry"),
  v.literal("backpressure_replay"),
);

export interface VoiceTransportRetryMetadata {
  attempt: number;
  maxAttempts: number;
  reason: VoiceTransportRetryReason;
}

export const voiceTransportRetryMetadataValidator = v.object({
  attempt: v.number(),
  maxAttempts: v.number(),
  reason: voiceTransportRetryReasonValidator,
});

export interface VoiceTransportHeartbeatMetadata {
  intervalMs: number;
  timeoutMs: number;
  ackSequence?: number;
}

export const voiceTransportHeartbeatMetadataValidator = v.object({
  intervalMs: v.number(),
  timeoutMs: v.number(),
  ackSequence: v.optional(v.number()),
});

export const VOICE_TRANSPORT_ERROR_CODE_VALUES = [
  "vt_invalid_contract_version",
  "vt_unauthorized_session",
  "vt_unsupported_transport_mode",
  "vt_unsupported_audio_format",
  "vt_sequence_gap_detected",
  "vt_sequence_replay_detected",
  "vt_heartbeat_timeout",
  "vt_retry_budget_exhausted",
  "vt_upstream_provider_error",
  "vt_internal_runtime_error",
] as const;
export type VoiceTransportErrorCode =
  (typeof VOICE_TRANSPORT_ERROR_CODE_VALUES)[number];

export const voiceTransportErrorCodeValidator = v.union(
  v.literal("vt_invalid_contract_version"),
  v.literal("vt_unauthorized_session"),
  v.literal("vt_unsupported_transport_mode"),
  v.literal("vt_unsupported_audio_format"),
  v.literal("vt_sequence_gap_detected"),
  v.literal("vt_sequence_replay_detected"),
  v.literal("vt_heartbeat_timeout"),
  v.literal("vt_retry_budget_exhausted"),
  v.literal("vt_upstream_provider_error"),
  v.literal("vt_internal_runtime_error"),
);

export interface VoiceTransportErrorMetadata {
  code: VoiceTransportErrorCode;
  message: string;
  retryable: boolean;
}

export const voiceTransportErrorMetadataValidator = v.object({
  code: voiceTransportErrorCodeValidator,
  message: v.string(),
  retryable: v.boolean(),
});

export interface VoiceTransportEnvelope {
  contractVersion: typeof VOICE_TRANSPORT_ENVELOPE_CONTRACT_VERSION;
  transportMode: VoiceTransportMode;
  liveSessionId: string;
  voiceSessionId: string;
  interviewSessionId: string;
  sequence: number;
  timestampMs: number;
  previousSequence?: number;
  retry?: VoiceTransportRetryMetadata;
  heartbeat?: VoiceTransportHeartbeatMetadata;
  error?: VoiceTransportErrorMetadata;
  pcm?: VoiceTransportPcmContract;
  transcriptionMimeType?: string;
  transcriptText?: string;
  audioChunkBase64?: string;
  assistantMessageId?: string;
}

export interface VoiceTransportSessionOpenEnvelope extends VoiceTransportEnvelope {
  eventType: "session_open";
}

export interface VoiceTransportAudioChunkEnvelope extends VoiceTransportEnvelope {
  eventType: "audio_chunk";
  pcm: VoiceTransportPcmContract;
  audioChunkBase64: string;
}

export interface VoiceTransportPartialTranscriptEnvelope extends VoiceTransportEnvelope {
  eventType: "partial_transcript";
  transcriptText: string;
}

export interface VoiceTransportFinalTranscriptEnvelope extends VoiceTransportEnvelope {
  eventType: "final_transcript";
  transcriptText: string;
}

export interface VoiceTransportAssistantAudioChunkEnvelope extends VoiceTransportEnvelope {
  eventType: "assistant_audio_chunk";
  pcm: VoiceTransportPcmContract;
  audioChunkBase64: string;
  assistantMessageId: string;
}

export interface VoiceTransportAssistantAudioFinalEnvelope extends VoiceTransportEnvelope {
  eventType: "assistant_audio_final";
  assistantMessageId: string;
}

export interface VoiceTransportBargeInEnvelope extends VoiceTransportEnvelope {
  eventType: "barge_in";
}

export interface VoiceTransportSessionCloseEnvelope extends VoiceTransportEnvelope {
  eventType: "session_close";
}

export interface VoiceTransportHeartbeatEnvelope extends VoiceTransportEnvelope {
  eventType: "heartbeat";
  heartbeat: VoiceTransportHeartbeatMetadata;
}

export interface VoiceTransportErrorEnvelope extends VoiceTransportEnvelope {
  eventType: "error";
  error: VoiceTransportErrorMetadata;
}

export type VoiceTransportEnvelopeContract =
  | VoiceTransportSessionOpenEnvelope
  | VoiceTransportAudioChunkEnvelope
  | VoiceTransportPartialTranscriptEnvelope
  | VoiceTransportFinalTranscriptEnvelope
  | VoiceTransportAssistantAudioChunkEnvelope
  | VoiceTransportAssistantAudioFinalEnvelope
  | VoiceTransportBargeInEnvelope
  | VoiceTransportSessionCloseEnvelope
  | VoiceTransportHeartbeatEnvelope
  | VoiceTransportErrorEnvelope;

const voiceTransportEnvelopeBaseFields = {
  contractVersion: v.literal(VOICE_TRANSPORT_ENVELOPE_CONTRACT_VERSION),
  transportMode: voiceTransportModeValidator,
  liveSessionId: v.string(),
  voiceSessionId: v.string(),
  interviewSessionId: v.string(),
  sequence: v.number(),
  timestampMs: v.number(),
  previousSequence: v.optional(v.number()),
  retry: v.optional(voiceTransportRetryMetadataValidator),
  heartbeat: v.optional(voiceTransportHeartbeatMetadataValidator),
  error: v.optional(voiceTransportErrorMetadataValidator),
  pcm: v.optional(voiceTransportPcmContractValidator),
  transcriptionMimeType: v.optional(v.string()),
  transcriptText: v.optional(v.string()),
  audioChunkBase64: v.optional(v.string()),
  assistantMessageId: v.optional(v.string()),
} as const;

const voiceTransportSessionOpenEnvelopeValidator = v.object({
  ...voiceTransportEnvelopeBaseFields,
  eventType: v.literal("session_open"),
});

const voiceTransportAudioChunkEnvelopeValidator = v.object({
  ...voiceTransportEnvelopeBaseFields,
  eventType: v.literal("audio_chunk"),
  pcm: voiceTransportPcmContractValidator,
  audioChunkBase64: v.string(),
});

const voiceTransportPartialTranscriptEnvelopeValidator = v.object({
  ...voiceTransportEnvelopeBaseFields,
  eventType: v.literal("partial_transcript"),
  transcriptText: v.string(),
});

const voiceTransportFinalTranscriptEnvelopeValidator = v.object({
  ...voiceTransportEnvelopeBaseFields,
  eventType: v.literal("final_transcript"),
  transcriptText: v.string(),
});

const voiceTransportAssistantAudioChunkEnvelopeValidator = v.object({
  ...voiceTransportEnvelopeBaseFields,
  eventType: v.literal("assistant_audio_chunk"),
  pcm: voiceTransportPcmContractValidator,
  audioChunkBase64: v.string(),
  assistantMessageId: v.string(),
});

const voiceTransportAssistantAudioFinalEnvelopeValidator = v.object({
  ...voiceTransportEnvelopeBaseFields,
  eventType: v.literal("assistant_audio_final"),
  assistantMessageId: v.string(),
});

const voiceTransportBargeInEnvelopeValidator = v.object({
  ...voiceTransportEnvelopeBaseFields,
  eventType: v.literal("barge_in"),
});

const voiceTransportSessionCloseEnvelopeValidator = v.object({
  ...voiceTransportEnvelopeBaseFields,
  eventType: v.literal("session_close"),
});

const voiceTransportHeartbeatEnvelopeValidator = v.object({
  ...voiceTransportEnvelopeBaseFields,
  eventType: v.literal("heartbeat"),
  heartbeat: voiceTransportHeartbeatMetadataValidator,
});

const voiceTransportErrorEnvelopeValidator = v.object({
  ...voiceTransportEnvelopeBaseFields,
  eventType: v.literal("error"),
  error: voiceTransportErrorMetadataValidator,
});

export const voiceTransportEnvelopeValidator = v.union(
  voiceTransportSessionOpenEnvelopeValidator,
  voiceTransportAudioChunkEnvelopeValidator,
  voiceTransportPartialTranscriptEnvelopeValidator,
  voiceTransportFinalTranscriptEnvelopeValidator,
  voiceTransportAssistantAudioChunkEnvelopeValidator,
  voiceTransportAssistantAudioFinalEnvelopeValidator,
  voiceTransportBargeInEnvelopeValidator,
  voiceTransportSessionCloseEnvelopeValidator,
  voiceTransportHeartbeatEnvelopeValidator,
  voiceTransportErrorEnvelopeValidator,
);

export interface MediaSessionAuthorityInvariant {
  nativePolicyPrecedence: "vc83_runtime_policy";
  mutatingIntentGate: "native_tool_registry";
  approvalInvariant: "non_bypassable";
  directDeviceMutation: "fail_closed";
}

export const mediaSessionAuthorityInvariantValidator = v.object({
  nativePolicyPrecedence: v.literal("vc83_runtime_policy"),
  mutatingIntentGate: v.literal("native_tool_registry"),
  approvalInvariant: v.literal("non_bypassable"),
  directDeviceMutation: v.literal("fail_closed"),
});

export interface MediaSessionIngressContract {
  contractVersion: typeof MEDIA_SESSION_INGRESS_CONTRACT_VERSION;
  liveSessionId: string;
  ingressTimestampMs: number;
  cameraRuntime?: MediaSessionCameraRuntime;
  voiceRuntime?: MediaSessionVoiceRuntime;
  videoRuntime?: MediaSessionVideoRuntime;
  captureRuntime?: MediaSessionCaptureRuntime;
  transportRuntime?: MediaSessionTransportRuntime;
  authority: MediaSessionAuthorityInvariant;
}

export const mediaSessionIngressContractValidator = v.object({
  contractVersion: v.literal(MEDIA_SESSION_INGRESS_CONTRACT_VERSION),
  liveSessionId: v.string(),
  ingressTimestampMs: v.number(),
  cameraRuntime: v.optional(mediaSessionCameraRuntimeValidator),
  voiceRuntime: v.optional(mediaSessionVoiceRuntimeValidator),
  videoRuntime: v.optional(mediaSessionVideoRuntimeValidator),
  captureRuntime: v.optional(mediaSessionCaptureRuntimeValidator),
  transportRuntime: v.optional(mediaSessionTransportRuntimeValidator),
  authority: mediaSessionAuthorityInvariantValidator,
});

function normalizeRuntimeContractString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function assertVoiceTransportEnvelope(contract: VoiceTransportEnvelopeContract) {
  const liveSessionId = normalizeRuntimeContractString(contract.liveSessionId);
  const voiceSessionId = normalizeRuntimeContractString(contract.voiceSessionId);
  const interviewSessionId = normalizeRuntimeContractString(contract.interviewSessionId);
  if (!liveSessionId || !voiceSessionId || !interviewSessionId) {
    throw new Error(
      "Voice transport envelope requires non-empty liveSessionId, voiceSessionId, and interviewSessionId."
    );
  }
  if (!Number.isInteger(contract.sequence) || contract.sequence < 0) {
    throw new Error("Voice transport envelope sequence must be a non-negative integer.");
  }
  if (!Number.isFinite(contract.timestampMs) || contract.timestampMs <= 0) {
    throw new Error("Voice transport envelope timestampMs must be a positive number.");
  }
  if (typeof contract.previousSequence !== "undefined") {
    if (
      !Number.isInteger(contract.previousSequence) ||
      contract.previousSequence < 0 ||
      contract.previousSequence >= contract.sequence
    ) {
      throw new Error(
        "Voice transport envelope previousSequence must be a non-negative integer less than sequence."
      );
    }
  }
  if (contract.retry) {
    if (
      !Number.isInteger(contract.retry.attempt) ||
      !Number.isInteger(contract.retry.maxAttempts) ||
      contract.retry.attempt < 1 ||
      contract.retry.maxAttempts < contract.retry.attempt
    ) {
      throw new Error(
        "Voice transport envelope retry metadata requires integer attempt/maxAttempts with attempt <= maxAttempts."
      );
    }
  }
  if (contract.heartbeat) {
    if (
      !Number.isFinite(contract.heartbeat.intervalMs) ||
      contract.heartbeat.intervalMs <= 0 ||
      !Number.isFinite(contract.heartbeat.timeoutMs) ||
      contract.heartbeat.timeoutMs <= 0
    ) {
      throw new Error(
        "Voice transport envelope heartbeat requires positive intervalMs and timeoutMs."
      );
    }
  }
  if (contract.pcm) {
    if (
      !Number.isFinite(contract.pcm.sampleRateHz) ||
      contract.pcm.sampleRateHz <= 0 ||
      !Number.isFinite(contract.pcm.channels) ||
      contract.pcm.channels <= 0 ||
      !Number.isFinite(contract.pcm.frameDurationMs) ||
      contract.pcm.frameDurationMs <= 0
    ) {
      throw new Error(
        "Voice transport envelope pcm requires positive sampleRateHz, channels, and frameDurationMs."
      );
    }
  }
  if (
    typeof contract.transcriptionMimeType !== "undefined" &&
    !contract.transcriptionMimeType.trim()
  ) {
    throw new Error(
      "Voice transport envelope transcriptionMimeType must be a non-empty string when provided."
    );
  }

  switch (contract.eventType) {
    case "audio_chunk":
    case "assistant_audio_chunk":
      if (!contract.audioChunkBase64.trim()) {
        throw new Error("Voice transport envelope audio chunk events require audioChunkBase64.");
      }
      if (!contract.assistantMessageId?.trim() && contract.eventType === "assistant_audio_chunk") {
        throw new Error(
          "Voice transport envelope assistant_audio_chunk requires assistantMessageId."
        );
      }
      break;
    case "partial_transcript":
    case "final_transcript":
      if (!contract.transcriptText?.trim()) {
        throw new Error(
          "Voice transport envelope transcript events require non-empty transcriptText."
        );
      }
      break;
    case "assistant_audio_final":
      if (!contract.assistantMessageId?.trim()) {
        throw new Error(
          "Voice transport envelope assistant_audio_final requires assistantMessageId."
        );
      }
      break;
    default:
      break;
  }
}

export function assertMediaSessionIngressContract(contract: MediaSessionIngressContract) {
  const liveSessionId = normalizeRuntimeContractString(contract.liveSessionId);
  if (!liveSessionId) {
    throw new Error("Media session ingress contract requires liveSessionId.");
  }

  if (
    !contract.cameraRuntime &&
    !contract.voiceRuntime &&
    !contract.videoRuntime &&
    !contract.captureRuntime
  ) {
    throw new Error(
      "Media session ingress contract requires cameraRuntime, voiceRuntime, videoRuntime, or captureRuntime."
    );
  }

  if (contract.videoRuntime && contract.transportRuntime?.mode === "realtime") {
    if (!normalizeRuntimeContractString(contract.videoRuntime.framePayloadBase64)) {
      throw new Error(
        "Media session realtime video ingress requires videoRuntime.framePayloadBase64."
      );
    }
  }
}

export function assertTurnQueueContract(contract: TurnQueueContract) {
  const tenantId = normalizeRuntimeContractString(contract.tenantId);
  const routeKey = normalizeRuntimeContractString(contract.routeKey);
  const workflowKey = normalizeRuntimeContractString(contract.workflowKey);
  const concurrencyKey = normalizeRuntimeContractString(contract.concurrencyKey);
  const orderingKey = normalizeRuntimeContractString(contract.orderingKey);
  if (!tenantId || !routeKey || !workflowKey || !concurrencyKey || !orderingKey) {
    throw new Error(
      "Turn queue contract requires non-empty tenantId, routeKey, workflowKey, concurrencyKey, and orderingKey."
    );
  }
}

export function assertRuntimeIdempotencyContract(contract: RuntimeIdempotencyContract) {
  const scopeKey = normalizeRuntimeContractString(contract.scopeKey);
  const payloadHash = normalizeRuntimeContractString(contract.payloadHash);
  if (!scopeKey || !payloadHash) {
    throw new Error("Idempotency contract requires non-empty scopeKey and payloadHash.");
  }
  if (!Number.isFinite(contract.ttlMs) || contract.ttlMs <= 0) {
    throw new Error("Idempotency contract ttlMs must be positive.");
  }
  if (!Number.isFinite(contract.issuedAt) || !Number.isFinite(contract.expiresAt)) {
    throw new Error("Idempotency contract requires numeric issuedAt/expiresAt.");
  }
  if (contract.expiresAt <= contract.issuedAt) {
    throw new Error("Idempotency contract expiresAt must be greater than issuedAt.");
  }
}

export function assertAgentExecutionBundleContract(contract: AgentExecutionBundleContract) {
  if (!normalizeRuntimeContractString(contract.modelId)) {
    throw new Error("Execution bundle contract requires modelId.");
  }
  if (!normalizeRuntimeContractString(contract.providerId)) {
    throw new Error("Execution bundle contract requires providerId.");
  }
  if (!normalizeRuntimeContractString(contract.systemPromptHash)) {
    throw new Error("Execution bundle contract requires systemPromptHash.");
  }
  if (!normalizeRuntimeContractString(contract.toolCatalogHash)) {
    throw new Error("Execution bundle contract requires toolCatalogHash.");
  }
  if (!normalizeRuntimeContractString(contract.runtimePolicyVersion)) {
    throw new Error("Execution bundle contract requires runtimePolicyVersion.");
  }
}

// ============================================================================
// COLLABORATION KERNEL + AUTHORITY CONTRACTS (TCG-014)
// ============================================================================

export const COLLABORATION_CONTRACT_VERSION = "tcg_collaboration_v1" as const;

export const COLLABORATION_THREAD_TYPE_VALUES = [
  "group_thread",
  "dm_thread",
] as const;
export type CollaborationThreadType = (typeof COLLABORATION_THREAD_TYPE_VALUES)[number];

export const collaborationThreadTypeValidator = v.union(
  v.literal("group_thread"),
  v.literal("dm_thread"),
);

export const COLLABORATION_VISIBILITY_SCOPE_VALUES = [
  "group",
  "dm",
  "operator_only",
  "system",
] as const;
export type CollaborationVisibilityScope =
  (typeof COLLABORATION_VISIBILITY_SCOPE_VALUES)[number];

export const collaborationVisibilityScopeValidator = v.union(
  v.literal("group"),
  v.literal("dm"),
  v.literal("operator_only"),
  v.literal("system"),
);

export const COLLABORATION_AUTHORITY_ROLE_VALUES = [
  "orchestrator",
  "specialist",
  "operator",
] as const;
export type CollaborationAuthorityRole =
  (typeof COLLABORATION_AUTHORITY_ROLE_VALUES)[number];

export const collaborationAuthorityRoleValidator = v.union(
  v.literal("orchestrator"),
  v.literal("specialist"),
  v.literal("operator"),
);

export const COLLABORATION_INTENT_TYPE_VALUES = [
  "proposal",
  "commit",
  "read_only",
] as const;
export type CollaborationIntentType = (typeof COLLABORATION_INTENT_TYPE_VALUES)[number];

export const collaborationIntentTypeValidator = v.union(
  v.literal("proposal"),
  v.literal("commit"),
  v.literal("read_only"),
);

export interface CollaborationKernelContract {
  threadType: CollaborationThreadType;
  threadId: string;
  groupThreadId: string;
  dmThreadId?: string;
  parentThreadId?: string;
  lineageId: string;
  visibilityScope: CollaborationVisibilityScope;
  correlationId?: string;
}

export const collaborationKernelContractValidator = v.object({
  threadType: collaborationThreadTypeValidator,
  threadId: v.string(),
  groupThreadId: v.string(),
  dmThreadId: v.optional(v.string()),
  parentThreadId: v.optional(v.string()),
  lineageId: v.string(),
  visibilityScope: collaborationVisibilityScopeValidator,
  correlationId: v.optional(v.string()),
});

export interface CollaborationAuthorityContract {
  authorityRole: CollaborationAuthorityRole;
  intentType: CollaborationIntentType;
  mutatesState: boolean;
  commitSourceThreadId?: string;
  proposalRefs?: string[];
}

export const collaborationAuthorityContractValidator = v.object({
  authorityRole: collaborationAuthorityRoleValidator,
  intentType: collaborationIntentTypeValidator,
  mutatesState: v.boolean(),
  commitSourceThreadId: v.optional(v.string()),
  proposalRefs: v.optional(v.array(v.string())),
});

function normalizeCollaborationString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasProposalReferences(value?: string[]): boolean {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }
  return value.some((entry) => normalizeCollaborationString(entry).length > 0);
}

export function assertCollaborationKernelContract(contract: CollaborationKernelContract) {
  const threadId = normalizeCollaborationString(contract.threadId);
  const groupThreadId = normalizeCollaborationString(contract.groupThreadId);
  const dmThreadId = normalizeCollaborationString(contract.dmThreadId);
  const parentThreadId = normalizeCollaborationString(contract.parentThreadId);
  const lineageId = normalizeCollaborationString(contract.lineageId);

  if (!threadId || !groupThreadId || !lineageId) {
    throw new Error("Collaboration kernel requires non-empty threadId, groupThreadId, and lineageId.");
  }

  if (contract.threadType === "group_thread") {
    if (threadId !== groupThreadId) {
      throw new Error("group_thread kernel contract requires threadId to equal groupThreadId.");
    }
    if (dmThreadId) {
      throw new Error("group_thread kernel contract must not set dmThreadId.");
    }
    if (parentThreadId) {
      throw new Error("group_thread kernel contract must not set parentThreadId.");
    }
    if (contract.visibilityScope === "dm") {
      throw new Error("group_thread kernel contract cannot use dm visibility scope.");
    }
    return;
  }

  if (!dmThreadId) {
    throw new Error("dm_thread kernel contract requires dmThreadId.");
  }
  if (threadId !== dmThreadId) {
    throw new Error("dm_thread kernel contract requires threadId to equal dmThreadId.");
  }
  if (!parentThreadId || parentThreadId !== groupThreadId) {
    throw new Error("dm_thread kernel contract requires parentThreadId to equal groupThreadId.");
  }
  if (contract.visibilityScope === "group") {
    throw new Error("dm_thread kernel contract cannot use group visibility scope.");
  }
}

export function assertCollaborationAuthorityContract(contract: CollaborationAuthorityContract) {
  const commitSourceThreadId = normalizeCollaborationString(contract.commitSourceThreadId);
  const mutates = contract.mutatesState === true;

  if ((contract.intentType === "proposal" || contract.intentType === "read_only") && mutates) {
    throw new Error(`${contract.intentType} authority contract cannot mutate state.`);
  }

  if (contract.authorityRole === "specialist" && mutates) {
    throw new Error("specialist authority cannot mutate state directly.");
  }

  if (contract.intentType !== "commit") {
    return;
  }

  if (contract.authorityRole !== "orchestrator") {
    throw new Error("commit intent requires orchestrator authority role.");
  }
  if (!mutates) {
    throw new Error("commit intent must set mutatesState=true.");
  }
  if (!commitSourceThreadId) {
    throw new Error("commit intent requires commitSourceThreadId.");
  }
  if (!hasProposalReferences(contract.proposalRefs)) {
    throw new Error("commit intent requires non-empty proposalRefs.");
  }
}

export function assertCollaborationRuntimeContract(args: {
  kernel: CollaborationKernelContract;
  authority: CollaborationAuthorityContract;
}) {
  assertCollaborationKernelContract(args.kernel);
  assertCollaborationAuthorityContract(args.authority);

  if (args.authority.intentType === "commit") {
    if (args.kernel.threadType !== "group_thread") {
      throw new Error("commit intent must execute on group_thread.");
    }
    if (
      normalizeCollaborationString(args.authority.commitSourceThreadId) !==
      normalizeCollaborationString(args.kernel.groupThreadId)
    ) {
      throw new Error("commitSourceThreadId must match groupThreadId for commit intents.");
    }
  }
}

// ============================================================================
// CORE MEMORY MODEL ENUMS (Plan 17)
// ============================================================================

export const CORE_MEMORY_TYPE_VALUES = [
  "identity",
  "boundary",
  "empathy",
  "pride",
  "caution",
] as const;

export const CORE_MEMORY_SOURCE_VALUES = [
  "onboarding_story",
  "onboarding_roleplay",
  "operator_curated",
  "reflection_promoted",
  "unknown",
] as const;

export const coreMemoryTypeValidator = v.union(
  v.literal("identity"),
  v.literal("boundary"),
  v.literal("empathy"),
  v.literal("pride"),
  v.literal("caution"),
);

export const coreMemorySourceValidator = v.union(
  v.literal("onboarding_story"),
  v.literal("onboarding_roleplay"),
  v.literal("operator_curated"),
  v.literal("reflection_promoted"),
  v.literal("unknown"),
);

export const coreMemoryValidator = v.object({
  memoryId: v.string(),
  type: coreMemoryTypeValidator,
  title: v.string(),
  narrative: v.string(),
  source: coreMemorySourceValidator,
  immutable: v.boolean(),
  immutableReason: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  confidence: v.optional(v.number()),
  createdAt: v.number(),
  createdBy: v.optional(v.string()),
  approvedAt: v.optional(v.number()),
  approvedBy: v.optional(v.string()),
  lastReferencedAt: v.optional(v.number()),
  archivedAt: v.optional(v.number()),
});

export const coreMemoryPolicyValidator = v.object({
  immutableByDefault: v.boolean(),
  requireOwnerApprovalForMutations: v.boolean(),
  allowOwnerEdits: v.boolean(),
  minCoreMemories: v.number(),
  maxCoreMemories: v.number(),
  requiredMemoryTypes: v.array(coreMemoryTypeValidator),
});

export const soulDriftScoresValidator = v.object({
  identity: v.number(),
  scope: v.number(),
  boundary: v.number(),
  performance: v.number(),
  overall: v.number(),
});

// ============================================================================
// TRUST EVENT TAXONOMY (ATX-003)
// ============================================================================

export const trustEventPayloadValidator = v.object({
  // Base payload fields (ATX-002 contract)
  event_id: v.string(),
  event_version: v.string(),
  occurred_at: v.number(),
  org_id: v.id("organizations"),
  mode: trustEventModeValidator,
  channel: v.string(),
  session_id: v.string(),
  actor_type: trustEventActorTypeValidator,
  actor_id: v.string(),

  // Business layer context fields
  source_layer: v.optional(v.string()),
  resolved_layer: v.optional(v.string()),
  enforcement_action: v.optional(v.string()),
  request_origin: v.optional(v.string()),

  // Lifecycle transition fields
  lifecycle_state_from: v.optional(v.string()),
  lifecycle_state_to: v.optional(v.string()),
  lifecycle_checkpoint: v.optional(v.string()),
  lifecycle_transition_actor: v.optional(v.string()),
  lifecycle_transition_reason: v.optional(v.string()),

  // Voice runtime/session telemetry fields
  voice_session_id: v.optional(v.string()),
  voice_state_from: v.optional(v.string()),
  voice_state_to: v.optional(v.string()),
  voice_runtime_fsm_state_from: v.optional(v.string()),
  voice_runtime_fsm_state: v.optional(v.string()),
  voice_transition_reason: v.optional(v.string()),
  voice_runtime_provider: v.optional(v.string()),
  voice_requested_provider: v.optional(v.string()),
  voice_failover_provider: v.optional(v.union(v.string(), v.null())),
  voice_failover_reason: v.optional(v.string()),
  voice_provider_health_status: v.optional(v.string()),
  voice_transport_event_type: v.optional(v.string()),
  voice_transport_expected_sequence: v.optional(v.float64()),
  voice_transport_final_persisted: v.optional(v.boolean()),
  voice_transport_ordering_decision: v.optional(v.string()),
  voice_transport_relay_events: v.optional(v.array(v.any())),
  voice_transport_sequence: v.optional(v.float64()),
  adaptive_phase_id: v.optional(v.string()),
  adaptive_decision: v.optional(v.string()),
  adaptive_confidence: v.optional(v.number()),
  consent_checkpoint_id: v.optional(v.string()),

  // Content DNA fields
  content_profile_id: v.optional(v.string()),
  content_profile_version: v.optional(v.string()),
  source_object_ids: v.optional(v.array(v.string())),
  artifact_types: v.optional(v.array(v.string())),

  // Memory consent fields
  consent_scope: v.optional(v.string()),
  consent_decision: v.optional(v.string()),
  memory_candidate_ids: v.optional(v.array(v.string())),
  consent_prompt_version: v.optional(v.string()),

  // Knowledge ingestion fields
  knowledge_item_id: v.optional(v.string()),
  knowledge_kind: v.optional(v.string()),
  ingest_status: v.optional(v.string()),
  processor_stage: v.optional(v.string()),
  failure_reason: v.optional(v.string()),

  // Setup artifact generation fields
  setup_session_id: v.optional(v.string()),
  artifact_kind: v.optional(v.string()),
  artifact_path: v.optional(v.string()),
  artifact_checksum: v.optional(v.string()),
  generator_model: v.optional(v.string()),

  // Setup connect handoff fields
  detected_artifacts: v.optional(v.array(v.string())),
  validation_status: v.optional(v.string()),
  validation_errors: v.optional(v.array(v.string())),
  persisted_object_ids: v.optional(v.array(v.string())),

  // Soul evolution governance fields
  proposal_id: v.optional(v.string()),
  proposal_version: v.optional(v.string()),
  risk_level: v.optional(v.string()),
  review_decision: v.optional(v.string()),
  rollback_target: v.optional(v.string()),

  // Guardrail enforcement fields
  policy_type: v.optional(v.string()),
  policy_id: v.optional(v.string()),
  tool_name: v.optional(v.string()),
  enforcement_decision: v.optional(v.string()),
  override_source: v.optional(v.string()),
  recording_disclosure_status: v.optional(v.string()),
  medical_data_policy: v.optional(v.string()),
  phi_handling_mode: v.optional(v.string()),
  approval_id: v.optional(v.string()),
  autonomy_domain: v.optional(v.string()),
  autonomy_level_from: v.optional(v.string()),
  autonomy_level_to: v.optional(v.string()),
  trust_score: v.optional(v.number()),
  trust_signal_count: v.optional(v.number()),
  decision_reason: v.optional(v.string()),
  correlation_id: v.optional(v.string()),
  lineage_id: v.optional(v.string()),
  thread_id: v.optional(v.string()),
  workflow_key: v.optional(v.string()),
  frontline_intake_trigger: v.optional(v.string()),
  boundary_reason: v.optional(v.string()),
  execution_request_id: v.optional(v.string()),
  sandbox_profile: v.optional(v.string()),
  network_egress: v.optional(v.string()),
  execution_outcome: v.optional(v.string()),
  execution_duration_ms: v.optional(v.number()),
  execution_timeout_ms: v.optional(v.number()),
  execution_source_hash: v.optional(v.string()),
  execution_source_bytes: v.optional(v.number()),
  approval_required: v.optional(v.string()),
  approval_status: v.optional(v.string()),

  // Team handoff fields
  team_session_id: v.optional(v.string()),
  handoff_id: v.optional(v.string()),
  from_agent_id: v.optional(v.string()),
  to_agent_id: v.optional(v.string()),
  context_digest: v.optional(v.string()),

  // Trust telemetry fields
  taxonomy_version: v.optional(v.string()),
  event_namespace: v.optional(v.string()),
  schema_validation_status: v.optional(trustEventSchemaValidationStatusValidator),
  metric_name: v.optional(v.string()),
  metric_value: v.optional(v.number()),

  // Super-admin parity fields
  platform_agent_id: v.optional(v.string()),
  training_template_id: v.optional(v.string()),
  parity_mode: v.optional(v.string()),
  customer_agent_template_link: v.optional(v.string()),
  privileged_action: v.optional(v.string()),
  privileged_reason_code: v.optional(v.string()),
  privileged_ticket_id: v.optional(v.string()),
  privileged_elevation_id: v.optional(v.string()),
  privileged_step_up_verified_at: v.optional(v.number()),
  privileged_elevation_expires_at: v.optional(v.number()),
  privileged_dual_approver_ids: v.optional(v.array(v.string())),
  privileged_decision: v.optional(v.string()),
});

export const aiTrustEvents = defineTable({
  event_name: trustEventNameValidator,
  payload: trustEventPayloadValidator,
  schema_validation_status: trustEventSchemaValidationStatusValidator,
  schema_errors: v.optional(v.array(v.string())),
  created_at: v.number(),
})
  .index("by_org_occurred_at", ["payload.org_id", "payload.occurred_at"])
  .index("by_event_name_occurred_at", ["event_name", "payload.occurred_at"])
  .index("by_mode_occurred_at", ["payload.mode", "payload.occurred_at"])
  .index("by_schema_status_occurred_at", [
    "schema_validation_status",
    "payload.occurred_at",
  ]);

export const qaRuns = defineTable({
  runId: v.string(),
  modeVersion: v.string(),
  organizationId: v.id("organizations"),
  ownerUserId: v.id("users"),
  ownerEmail: v.optional(v.string()),
  label: v.optional(v.string()),
  targetAgentId: v.optional(v.string()),
  targetTemplateRole: v.optional(v.string()),
  status: v.union(
    v.literal("active"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
  lastActivityAt: v.number(),
  lastSessionId: v.optional(v.string()),
  lastTurnId: v.optional(v.string()),
  turnCount: v.number(),
  successCount: v.number(),
  blockedCount: v.number(),
  errorCount: v.number(),
  blockedReasonCounts: v.object({
    tool_unavailable: v.number(),
    missing_required_fields: v.number(),
    missing_audit_session_context: v.optional(v.number()),
    audit_session_not_found: v.optional(v.number()),
    tool_not_observed: v.number(),
    ambiguous_name: v.optional(v.number()),
    ambiguous_founder_contact: v.optional(v.number()),
    unknown: v.number(),
  }),
  dispatchDecisionCounts: v.optional(v.object({
    auto_dispatch_executed_pdf: v.number(),
    auto_dispatch_executed_docx: v.number(),
    blocked_missing_required_fields: v.number(),
    blocked_missing_audit_session_context: v.optional(v.number()),
    blocked_audit_session_not_found: v.optional(v.number()),
    blocked_ambiguous_name: v.number(),
    blocked_ambiguous_founder_contact: v.number(),
    blocked_tool_unavailable: v.number(),
    blocked_tool_not_observed: v.number(),
    unknown: v.number(),
  })),
  reasonCodeCounts: v.optional(v.record(v.string(), v.number())),
  preflightReasonCodeCounts: v.optional(v.record(v.string(), v.number())),
  recentIncidents: v.array(v.object({
    occurredAt: v.number(),
    sessionId: v.optional(v.string()),
    turnId: v.optional(v.string()),
    agentId: v.optional(v.string()),
    status: v.string(),
    reasonCode: v.optional(v.string()),
    preflightReasonCode: v.optional(v.string()),
    dispatchDecision: v.optional(v.string()),
    blockedReason: v.optional(v.string()),
    blockedDetail: v.optional(v.string()),
    requiredTools: v.array(v.string()),
    availableTools: v.array(v.string()),
    missingRequiredFields: v.array(v.string()),
    actionDecision: v.optional(v.string()),
  })),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_run_id", ["runId"])
  .index("by_org_run_id", ["organizationId", "runId"])
  .index("by_status_last_activity", ["status", "lastActivityAt"])
  .index("by_org_last_activity", ["organizationId", "lastActivityAt"])
  .index("by_owner_last_activity", ["ownerUserId", "lastActivityAt"])
  .index("by_last_activity", ["lastActivityAt"]);

export const voiceTransportSessionState = defineTable({
  organizationId: v.id("organizations"),
  interviewSessionId: v.id("agentSessions"),
  voiceSessionId: v.string(),
  lastAcceptedSequence: v.optional(v.number()),
  acceptedSequenceWindow: v.array(v.number()),
  relayEventsBySequence: v.optional(
    v.record(v.string(), v.array(voiceTransportEnvelopeValidator)),
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org_session_voice", [
    "organizationId",
    "interviewSessionId",
    "voiceSessionId",
  ])
  .index("by_updated_at", ["updatedAt"]);

export const voiceRuntimeSessionOpenRateState = defineTable({
  organizationId: v.id("organizations"),
  interviewSessionId: v.id("agentSessions"),
  liveSessionId: v.string(),
  windowStartMs: v.number(),
  openCount: v.number(),
  blockedCount: v.optional(v.number()),
  lastOpenAt: v.optional(v.number()),
  lastBlockedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org_session_live", [
    "organizationId",
    "interviewSessionId",
    "liveSessionId",
  ])
  .index("by_updated_at", ["updatedAt"]);

export const videoTransportSessionState = defineTable({
  organizationId: v.id("organizations"),
  interviewSessionId: v.id("agentSessions"),
  liveSessionId: v.string(),
  videoSessionId: v.string(),
  lastAcceptedSequence: v.optional(v.number()),
  acceptedSequenceWindow: v.array(v.number()),
  windowStartMs: v.number(),
  frameCountInWindow: v.number(),
  blockedCount: v.optional(v.number()),
  lastAcceptedAt: v.optional(v.number()),
  lastBlockedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org_session_live_video", [
    "organizationId",
    "interviewSessionId",
    "liveSessionId",
    "videoSessionId",
  ])
  .index("by_updated_at", ["updatedAt"]);

/**
 * AI Integration Schemas - General AI Assistant + Email AI Specialist
 *
 * This file contains tables for two integrated AI systems:
 * 1. General AI Assistant (Provider Control Plane + Tools) - For forms, events, CRM automation
 * 2. Email AI Specialist - For email generation with human-in-the-loop approval
 */

// ============================================================================
// GENERAL AI SYSTEM (Provider Control Plane + Tools)
// ============================================================================

/**
 * AI Conversations
 *
 * Chat history for general AI assistant
 */
export const aiConversations = defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"),

  // Conversation metadata
  title: v.optional(v.string()),
  slug: v.optional(v.string()),  // URL-friendly identifier (legacy field)
  status: v.union(v.literal("active"), v.literal("archived")),

  // Track which model is being used for this conversation
  modelId: v.optional(v.string()),              // "anthropic/claude-3-5-sonnet"
  modelName: v.optional(v.string()),            // "Claude 3.5 Sonnet" (for display)
  // Session-level routing pin for deterministic model/auth continuity in desktop chat.
  routingPin: v.optional(v.object({
    modelId: v.optional(v.string()),
    authProfileId: v.optional(v.string()),
    pinReason: v.string(),
    pinnedAt: v.number(),
    updatedAt: v.number(),
    unlockReason: v.optional(v.string()),
    unlockedAt: v.optional(v.number()),
  })),

  // Message count (cached for performance)
  messageCount: v.optional(v.number()),         // Total number of messages in this conversation

  // V0 Integration metadata (for v0.dev Platform API conversations)
  aiProvider: v.optional(v.union(v.literal("built-in"), v.literal("v0"))),
  v0ChatId: v.optional(v.string()),             // v0 platform chat ID (for follow-up messages)
  v0DemoUrl: v.optional(v.string()),            // iframe preview URL
  v0WebUrl: v.optional(v.string()),             // link to edit on v0.dev

  // Messages stored in separate table (see aiMessages)

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_user", ["userId"])
  .index("by_slug", ["slug"]);

/**
 * AI Messages
 *
 * Individual messages in conversations
 */
export const aiMessages = defineTable({
  conversationId: v.id("aiConversations"),

  role: v.union(
    v.literal("system"),
    v.literal("user"),
    v.literal("assistant"),
    v.literal("tool"),
  ),
  content: v.string(),

  // Track which model generated this message (for assistant messages only)
  modelId: v.optional(v.string()),              // "anthropic/claude-3-5-sonnet"
  modelResolution: v.optional(v.object({
    requestedModel: v.optional(v.string()),
    selectedModel: v.string(),
    usedModel: v.optional(v.string()),
    selectedAuthProfileId: v.optional(v.string()),
    usedAuthProfileId: v.optional(v.string()),
    selectionSource: v.string(),
    fallbackUsed: v.boolean(),
    fallbackReason: v.optional(v.string()),
  })),

  // Tool calls (if assistant used tools)
  toolCalls: v.optional(v.array(v.object({
    id: v.string(),
    name: v.string(),
    arguments: v.any(),
    result: v.optional(v.any()),
    status: v.union(v.literal("success"), v.literal("failed")),
    error: v.optional(v.string()),
  }))),

  collaboration: v.optional(v.object({
    surface: v.union(v.literal("group"), v.literal("dm")),
    threadType: v.union(v.literal("group_thread"), v.literal("dm_thread")),
    threadId: v.string(),
    groupThreadId: v.string(),
    dmThreadId: v.optional(v.string()),
    lineageId: v.optional(v.string()),
    correlationId: v.optional(v.string()),
    workflowKey: v.optional(v.string()),
    authorityIntentType: v.optional(v.string()),
    visibilityScope: v.union(
      v.literal("group"),
      v.literal("dm"),
      v.literal("operator_only"),
      v.literal("system"),
    ),
    specialistAgentId: v.optional(v.string()),
    specialistLabel: v.optional(v.string()),
  })),
  mediaSessionEnvelope: v.optional(mediaSessionIngressContractValidator),

  timestamp: v.number(),
}).index("by_conversation", ["conversationId"]);

/**
 * AI Message Attachments
 *
 * Binary attachment metadata linked to chat messages.
 * Files are stored in Convex `_storage`; rows keep metadata + relational links.
 */
export const aiMessageAttachments = defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"),
  conversationId: v.optional(v.id("aiConversations")),
  messageId: v.optional(v.id("aiMessages")),

  kind: v.union(v.literal("image")),
  storageId: v.id("_storage"),
  fileName: v.string(),
  mimeType: v.string(),
  sizeBytes: v.number(),
  width: v.optional(v.number()),
  height: v.optional(v.number()),

  status: v.union(
    v.literal("uploaded"),
    v.literal("linked"),
    v.literal("orphaned"),
  ),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_message", ["messageId"])
  .index("by_conversation", ["conversationId"])
  .index("by_status_updated_at", ["status", "updatedAt"])
  .index("by_organization_created", ["organizationId", "createdAt"])
  .index("by_user_created", ["userId", "createdAt"]);

/**
 * AI Tool Executions
 *
 * Audit trail of all tool executions with human-in-the-loop approval
 */
export const aiToolExecutions = defineTable({
  conversationId: v.id("aiConversations"),
  organizationId: v.id("organizations"),
  userId: v.id("users"),

  // Tool info
  toolName: v.string(),
  parameters: v.any(),
  result: v.optional(v.any()),
  error: v.optional(v.string()),

  // Execution state (expanded for approval workflow)
  status: v.union(
    v.literal("proposed"),    // AI wants to execute, waiting for approval
    v.literal("approved"),    // User approved, ready to execute
    v.literal("executing"),   // Currently running
    v.literal("success"),     // Successfully completed
    v.literal("failed"),      // Execution failed
    v.literal("rejected"),    // User rejected the proposal
    v.literal("cancelled")    // User dismissed/cancelled the proposal (no feedback to AI)
  ),

  // Human-in-the-loop approval fields
  proposalMessage: v.optional(v.string()),  // AI's explanation of what it wants to do
  userResponse: v.optional(v.union(
    v.literal("approve"),
    v.literal("approve_always"),  // User said "don't ask again"
    v.literal("reject"),
    v.literal("custom"),
    v.literal("cancel")  // User dismissed without feedback to AI
  )),
  customInstruction: v.optional(v.string()),  // If user provided custom instruction

  // Collaboration runtime authority metadata (TCG-014)
  collaborationContractVersion: v.optional(v.literal(COLLABORATION_CONTRACT_VERSION)),
  collaborationKernel: v.optional(collaborationKernelContractValidator),
  collaborationAuthority: v.optional(collaborationAuthorityContractValidator),

  // New fields for getToolExecutions query compatibility
  input: v.optional(v.any()),  // Alias for parameters
  output: v.optional(v.any()), // Alias for result
  success: v.optional(v.boolean()), // Derived from status
  completedAt: v.optional(v.number()), // When execution finished

  // UI state (minimization)
  isMinimized: v.optional(v.boolean()),  // Whether this item is minimized in the UI

  // Usage tracking
  tokensUsed: v.number(),
  costUsd: v.number(),
  executedAt: v.number(),
  durationMs: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_org_time", ["organizationId", "executedAt"])
  .index("by_conversation", ["conversationId"])
  .index("by_status", ["status"])
  .index("by_conversation_status", ["conversationId", "status"]);

const toolFoundryInputTypeValidator = v.union(
  v.literal("string"),
  v.literal("number"),
  v.literal("boolean"),
  v.literal("object"),
  v.literal("array"),
  v.literal("null"),
  v.literal("unknown"),
);

const toolFoundryMissingKindValidator = v.union(
  v.literal("internal_concept"),
  v.literal("tool_contract"),
  v.literal("backend_contract"),
);

const toolFoundryBacklogStatusValidator = v.union(
  v.literal("pending_review"),
  v.literal("in_review"),
  v.literal("promoted"),
  v.literal("rejected"),
  v.literal("rolled_back"),
);

const toolFoundryRollbackStatusValidator = v.union(
  v.literal("rollback_ready"),
  v.literal("rollback_applied"),
);

const toolFoundryLinearIssueValidator = v.object({
  issueId: v.string(),
  issueNumber: v.string(),
  issueUrl: v.string(),
  linkedAt: v.number(),
  lastSyncedAt: v.number(),
});

/**
 * Tool Foundry Proposal Backlog
 *
 * Deterministic backlog records for runtime capability-gap ToolSpec proposals.
 * Source traces and rollback metadata are persisted for trust/audit follow-up.
 */
export const toolFoundryProposalBacklog = defineTable({
  contractVersion: v.literal("tool_foundry_proposal_backlog_v1"),
  artifactType: v.literal("tool_spec_proposal"),
  artifactContractVersion: v.literal("tool_spec_proposal_draft_v1"),

  organizationId: v.id("organizations"),
  proposalKey: v.string(),
  stage: v.literal("draft"),
  status: toolFoundryBacklogStatusValidator,
  source: v.literal("runtime_capability_gap"),
  requestedToolName: v.string(),

  draft: v.object({
    suggestedToolName: v.string(),
    intentSummary: v.string(),
    inputFields: v.array(v.object({
      name: v.string(),
      inferredType: toolFoundryInputTypeValidator,
      required: v.boolean(),
    })),
    outputContract: v.string(),
    requiredCapabilities: v.array(v.string()),
    riskLabels: v.array(v.string()),
    verificationIntent: v.array(v.string()),
  }),

  trace: v.object({
    reasonCode: v.string(),
    reason: v.string(),
    missingKinds: v.array(toolFoundryMissingKindValidator),
    missingSummary: v.string(),
    unblockingSteps: v.array(v.string()),
  }),

  provenance: v.object({
    organizationId: v.string(),
    agentId: v.string(),
    sessionId: v.string(),
    requestedToolName: v.string(),
    sourceRequestTraceKey: v.string(),
    turnId: v.optional(v.string()),
    receiptId: v.optional(v.string()),
    channel: v.optional(v.string()),
    externalContactIdentifier: v.optional(v.string()),
    idempotencyScopeKey: v.optional(v.string()),
    payloadHash: v.optional(v.string()),
    queueConcurrencyKey: v.optional(v.string()),
    workflowKey: v.optional(v.string()),
  }),

  rollback: v.object({
    rollbackKey: v.string(),
    policy: v.literal("disable_runtime_binding_and_reopen_gap"),
    status: toolFoundryRollbackStatusValidator,
    reasonCode: v.string(),
    appliedAt: v.optional(v.number()),
    appliedBy: v.optional(v.string()),
  }),
  linearIssue: v.optional(toolFoundryLinearIssueValidator),

  firstObservedAt: v.number(),
  lastObservedAt: v.number(),
  observationCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org_proposal_key", ["organizationId", "proposalKey"])
  .index("by_org_status", ["organizationId", "status"])
  .index("by_org_last_observed", ["organizationId", "lastObservedAt"]);

/**
 * Organization AI Settings v3.0
 *
 * AI configuration per organization (LLM + embeddings)
 * Aligned with three-tier privacy model (see aiBillingSchemas.ts)
 */
export const organizationAiSettings = defineTable({
  organizationId: v.id("organizations"),

  // General settings
  enabled: v.boolean(),

  // Privacy tier (v3.1) - Links to aiSubscriptions.tier
  // This field is denormalized here for quick access
  tier: v.optional(v.union(
    v.literal("standard"),         // Standard tier (€49/month incl. VAT)
    v.literal("privacy-enhanced"), // Privacy-Enhanced tier (€49/month incl. VAT)
    v.literal("private-llm")       // Private LLM tier (€2,500-€12,000/month incl. VAT)
  )),

  // LEGACY: Old billing mode field (deprecated, kept for backward compatibility)
  billingMode: v.optional(v.union(
    v.literal("platform"),    // Legacy platform-managed provider key path (historically OpenRouter usage billing)
    v.literal("byok"),         // Use organization's own API key (free tier)
  )),
  // Canonical billing source taxonomy (BMF-003)
  billingSource: v.optional(aiBillingSourceValidator),
  // Settings migration marker (BMF-003)
  settingsContractVersion: v.optional(v.union(
    v.literal("openrouter_v1"),
    v.literal("provider_agnostic_v1"),
  )),

  // LLM Settings (legacy + provider-agnostic contract)
  llm: v.object({
    // NEW: Multi-select model configuration
    enabledModels: v.optional(v.array(v.object({
      modelId: v.string(),                    // "anthropic/claude-3-5-sonnet"
      isDefault: v.boolean(),                 // true for default model
      customLabel: v.optional(v.string()),    // Optional nickname for model
      enabledAt: v.number(),                  // When this model was enabled
    }))),
    defaultModelId: v.optional(v.string()),   // ID of default model
    providerId: v.optional(aiProviderIdValidator), // Canonical default provider

    // OLD: Legacy single-model fields (kept for backward compatibility during migration)
    provider: v.optional(v.string()),         // "openai", "anthropic", "google", etc.
    model: v.optional(v.string()),            // "gpt-4o", "claude-3-5-sonnet", etc.

    // Shared settings (apply to all models)
    temperature: v.number(),
    maxTokens: v.number(),
    privacyMode: v.optional(v.union(
      v.literal("off"),
      v.literal("prefer_local"),
      v.literal("local_only"),
    )),
    qualityTierFloor: v.optional(v.union(
      v.literal("gold"),
      v.literal("silver"),
      v.literal("bronze"),
      v.literal("unrated"),
    )),
    localModelIds: v.optional(v.array(v.string())),
    localConnection: v.optional(v.object({
      connectorId: v.union(
        v.literal("ollama"),
        v.literal("lm_studio"),
        v.literal("llama_cpp"),
      ),
      baseUrl: v.string(),
      status: v.union(
        v.literal("connected"),
        v.literal("degraded"),
        v.literal("disconnected"),
      ),
      modelIds: v.array(v.string()),
      defaultModelId: v.optional(v.string()),
      capabilityLimits: v.object({
        tools: v.boolean(),
        vision: v.boolean(),
        audio_in: v.boolean(),
        audio_out: v.boolean(),
        json: v.boolean(),
        networkEgress: v.literal("blocked"),
      }),
      detectedAt: v.optional(v.number()),
    })),
    openrouterApiKey: v.optional(v.string()), // Legacy OpenRouter-specific BYOK key (migration compatibility)
    authProfiles: v.optional(v.array(v.object({
      profileId: v.string(),
      label: v.optional(v.string()),
      openrouterApiKey: v.optional(v.string()), // Legacy OpenRouter-specific profile key (migration compatibility)
      enabled: v.boolean(),
      priority: v.optional(v.number()),
      cooldownUntil: v.optional(v.number()),
      failureCount: v.optional(v.number()),
      lastFailureAt: v.optional(v.number()),
      lastFailureReason: v.optional(v.string()),
    }))),
    // NEW: Provider-agnostic auth profiles (keeps cooldown/priority behavior)
    providerAuthProfiles: v.optional(v.array(v.object({
      profileId: v.string(),
      providerId: aiProviderIdValidator,
      label: v.optional(v.string()),
      baseUrl: v.optional(v.string()),
      credentialSource: v.optional(aiCredentialSourceValidator),
      billingSource: v.optional(aiBillingSourceValidator),
      apiKey: v.optional(v.string()),
      encryptedFields: v.optional(v.array(v.string())),
      capabilities: v.optional(aiCapabilityMatrixValidator),
      enabled: v.boolean(),
      priority: v.optional(v.number()),
      cooldownUntil: v.optional(v.number()),
      failureCount: v.optional(v.number()),
      lastFailureAt: v.optional(v.number()),
      lastFailureReason: v.optional(v.string()),
      metadata: v.optional(v.any()),
    }))),
  }),

  // Embedding Settings (for email AI)
  embedding: v.object({
    provider: v.union(
      v.literal("openai"),
      v.literal("voyage"),
      v.literal("cohere"),
      v.literal("none"),
    ),
    model: v.string(),
    dimensions: v.number(),
    apiKey: v.optional(v.string()), // Encrypted, org's own key
  }),

  // Budget Controls
  monthlyBudgetUsd: v.optional(v.number()),
  currentMonthSpend: v.number(),

  // Data Sovereignty (for email AI)
  dataSovereignty: v.optional(v.object({
    region: v.string(),
    allowCloudAI: v.boolean(),
    requireOnPremise: v.boolean(),
    complianceRequirements: v.optional(v.array(v.string())),
  })),

  // Human-in-the-Loop Settings
  humanInLoopEnabled: v.optional(v.boolean()),  // Require approval for all tool executions

  // Auto-Recovery Settings (for tool execution failures)
  autoRecovery: v.optional(v.object({
    enabled: v.boolean(),              // Enable/disable auto-recovery
    maxRetries: v.number(),            // Max retry attempts before giving up (1-5)
    retryDelay: v.optional(v.number()), // Delay between retries (ms) - future use
    requireApprovalPerRetry: v.boolean(), // User must approve each retry
  })),

  // Tool Approval Mode
  toolApprovalMode: v.optional(v.union(
    v.literal("all"),         // Require approval for all tools (safest)
    v.literal("dangerous"),   // Require approval only for dangerous tools (future)
    v.literal("none")         // No approval required (future)
  )),

  // Migration bookkeeping for legacy OpenRouter-only org settings
  migrationState: v.optional(v.object({
    providerContractBackfilledAt: v.optional(v.number()),
    source: v.optional(v.union(
      v.literal("legacy_openrouter"),
      v.literal("provider_agnostic"),
      v.literal("mixed"),
    )),
    lastMigratedBy: v.optional(v.string()),
  })),

  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_organization", ["organizationId"]);

/**
 * AI Settings Migration Receipts
 *
 * Tracks rollout status for additive settings migrations.
 */
export const aiSettingsMigrations = defineTable({
  organizationId: v.id("organizations"),
  migrationKey: v.literal("provider_agnostic_auth_profiles_v1"),
  status: v.union(
    v.literal("pending"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  source: v.union(
    v.literal("legacy_openrouter"),
    v.literal("provider_agnostic"),
    v.literal("mixed"),
  ),
  lastAttemptAt: v.number(),
  completedAt: v.optional(v.number()),
  error: v.optional(v.string()),
  details: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org_migration_key", ["organizationId", "migrationKey"])
  .index("by_status", ["status"]);

// ============================================================================
// EMAIL AI SYSTEM (Specialized Workflows)
// ============================================================================

/**
 * AI Agent Tasks
 *
 * Email-specific tasks with human-in-the-loop approval
 */
export const aiAgentTasks = defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"),

  agentType: v.union(
    v.literal("email_writer"),
    v.literal("email_organizer"),
    v.literal("survey_generator"),
    v.literal("list_manager"),
  ),
  taskType: v.string(),

  input: v.object({
    prompt: v.string(),
    context: v.optional(v.any()),
    contactListId: v.optional(v.id("objects")),
  }),

  output: v.optional(v.object({
    emails: v.optional(v.array(v.object({
      to: v.string(),
      toContactId: v.optional(v.id("objects")),
      subject: v.string(),
      body: v.string(),
      personalization: v.any(),
    }))),
  })),

  status: v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("awaiting_approval"),
    v.literal("approved"),
    v.literal("rejected"),
    v.literal("executing"),
    v.literal("completed"),
    v.literal("failed"),
  ),

  approvedBy: v.optional(v.id("users")),
  approvedAt: v.optional(v.number()),

  executionResults: v.optional(v.object({
    sentEmails: v.number(),
    failedEmails: v.number(),
    errors: v.optional(v.array(v.string())),
  })),

  createdAt: v.number(),
  updatedAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_organization", ["organizationId"])
  .index("by_user", ["userId"])
  .index("by_status", ["status"]);

/**
 * Legacy AI Agent Memory (deprecated runtime contract)
 *
 * Retained for backward-compatible storage only. Runtime contract is explicit
 * deprecation (`LOC-020`) and must remain fail-closed.
 */
export const aiAgentMemory = defineTable({
  organizationId: v.id("organizations"),
  memoryKey: v.string(),

  content: v.optional(v.string()),
  memoryData: v.any(),

  // Embedding metadata
  embeddingProvider: v.optional(v.string()),
  embeddingModel: v.optional(v.string()),
  embeddingDimensions: v.optional(v.number()),

  // Multiple embedding fields (per-org provider choice)
  embedding_openai_1536: v.optional(v.array(v.float64())),
  embedding_voyage_1024: v.optional(v.array(v.float64())),
  embedding_cohere_1024: v.optional(v.array(v.float64())),

  tags: v.optional(v.array(v.string())),
  expiresAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization_key", ["organizationId", "memoryKey"])
  .vectorIndex("by_embedding_openai_1536", {
    vectorField: "embedding_openai_1536",
    dimensions: 1536,
    filterFields: ["organizationId"],
  })
  .vectorIndex("by_embedding_voyage_1024", {
    vectorField: "embedding_voyage_1024",
    dimensions: 1024,
    filterFields: ["organizationId"],
  })
  .vectorIndex("by_embedding_cohere_1024", {
    vectorField: "embedding_cohere_1024",
    dimensions: 1024,
    filterFields: ["organizationId"],
  });

/**
 * Operator Pinned Notes (L3 Memory Layer)
 *
 * Durable operator-authored memory anchors scoped to a single tenant.
 */
export const operatorPinnedNotes = defineTable({
  organizationId: v.id("organizations"),
  title: v.optional(v.string()),
  note: v.string(),
  sortOrder: v.number(),
  pinnedAt: v.number(),
  createdBy: v.id("users"),
  updatedBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization_sort_order", ["organizationId", "sortOrder"])
  .index("by_organization_pinned_at", ["organizationId", "pinnedAt"])
  .index("by_organization_updated_at", ["organizationId", "updatedAt"]);

/**
 * Organization Knowledge Chunks
 *
 * Chunk/index storage for semantic retrieval across organization media docs.
 */
export const organizationKnowledgeChunks = defineTable({
  organizationId: v.id("organizations"),
  mediaId: v.id("organizationMedia"),
  chunkId: v.string(),
  chunkOrdinal: v.number(),
  chunkText: v.string(),
  chunkCharCount: v.number(),
  tokenEstimate: v.number(),
  startOffset: v.number(),
  endOffset: v.number(),
  sourceFilename: v.string(),
  sourceDescription: v.optional(v.string()),
  sourceTags: v.optional(v.array(v.string())),
  sourceUpdatedAt: v.number(),
  indexVersion: v.number(),
  indexedAt: v.number(),

  // Multiple embedding fields (per-org provider choice)
  embeddingProvider: v.optional(v.string()),
  embeddingModel: v.optional(v.string()),
  embeddingDimensions: v.optional(v.number()),
  embedding_openai_1536: v.optional(v.array(v.float64())),
  embedding_voyage_1024: v.optional(v.array(v.float64())),
  embedding_cohere_1024: v.optional(v.array(v.float64())),
})
  .index("by_organization", ["organizationId"])
  .index("by_media", ["mediaId"])
  .index("by_org_media", ["organizationId", "mediaId"])
  .index("by_org_indexed_at", ["organizationId", "indexedAt"])
  .index("by_org_chunk_id", ["organizationId", "chunkId"])
  .vectorIndex("by_embedding_openai_1536", {
    vectorField: "embedding_openai_1536",
    dimensions: 1536,
    filterFields: ["organizationId"],
  })
  .vectorIndex("by_embedding_voyage_1024", {
    vectorField: "embedding_voyage_1024",
    dimensions: 1024,
    filterFields: ["organizationId"],
  })
  .vectorIndex("by_embedding_cohere_1024", {
    vectorField: "embedding_cohere_1024",
    dimensions: 1024,
    filterFields: ["organizationId"],
  });

// ============================================================================
// AI MODEL DISCOVERY (Auto-Discovery System)
// ============================================================================

/**
 * AI Models Cache
 *
 * Cached model information from provider discovery ingestion
 * (OpenRouter detailed catalog plus provider-native feeds).
 * Refreshed daily via cron job to keep model list up-to-date.
 */
export const aiModels = defineTable({
  // Model identification
  modelId: v.string(),                       // "anthropic/claude-3-5-sonnet"
  name: v.string(),                          // "Claude 3.5 Sonnet"
  provider: v.string(),                      // "anthropic"

  // Pricing (dollars per million tokens)
  pricing: v.object({
    promptPerMToken: v.number(),             // Input cost
    completionPerMToken: v.number(),         // Output cost
  }),

  // Model capabilities
  contextLength: v.number(),                 // 200000
  capabilities: v.object({
    toolCalling: v.boolean(),                // Supports function calling
    multimodal: v.boolean(),                 // Supports images/video
    vision: v.boolean(),                     // Supports vision
    nativeReasoning: v.optional(v.boolean()), // Supports provider-native reasoning params
  }),

  // Discovery tracking
  discoveredAt: v.number(),                  // When first discovered
  lastSeenAt: v.number(),                    // Last seen in provider discovery ingestion
  isNew: v.boolean(),                        // New in last 7 days

  // Platform availability (super admin controlled)
  isPlatformEnabled: v.optional(v.boolean()), // Whether this model is available platform-wide
  isSystemDefault: v.optional(v.boolean()),   // Whether this model is a system default (recommended)
  isFreeTierLocked: v.optional(v.boolean()),  // Whether this model is pinned for free-tier runtime
  lifecycleStatus: v.optional(v.union(
    v.literal("discovered"),
    v.literal("enabled"),
    v.literal("default"),
    v.literal("deprecated"),
    v.literal("retired")
  )),
  deprecatedAt: v.optional(v.number()),
  retiredAt: v.optional(v.number()),
  replacementModelId: v.optional(v.string()),
  retirementReason: v.optional(v.string()),

  // Validation tracking (for testing tool calling before enabling)
  validationStatus: v.optional(v.union(
    v.literal("not_tested"),
    v.literal("validated"),
    v.literal("failed")
  )),
  testResults: v.optional(v.object({
    basicChat: v.boolean(),
    toolCalling: v.boolean(),
    complexParams: v.boolean(),
    multiTurn: v.boolean(),
    edgeCases: v.boolean(),
    contractChecks: v.boolean(),
    conformance: v.optional(v.object({
      sampleCount: v.number(),
      toolCallParsing: v.object({
        passed: v.number(),
        total: v.number(),
        rate: v.number(),
      }),
      schemaFidelity: v.object({
        passed: v.number(),
        total: v.number(),
        rate: v.number(),
      }),
      refusalHandling: v.object({
        passed: v.number(),
        total: v.number(),
        rate: v.number(),
      }),
      latencyP95Ms: v.union(v.number(), v.null()),
      costPer1kTokensUsd: v.union(v.number(), v.null()),
      thresholds: v.object({
        minToolCallParseRate: v.number(),
        minSchemaFidelityRate: v.number(),
        minRefusalHandlingRate: v.number(),
        maxLatencyP95Ms: v.number(),
        maxCostPer1kTokensUsd: v.number(),
      }),
      passed: v.boolean(),
      failedMetrics: v.array(v.string()),
    })),
    timestamp: v.number(),
  })),
  testedBy: v.optional(v.id("users")),
  testedAt: v.optional(v.number()),
  notes: v.optional(v.string()),
  validationRunStatus: v.optional(v.union(
    v.literal("idle"),
    v.literal("running"),
    v.literal("passed"),
    v.literal("failed")
  )),
  validationRunStartedAt: v.optional(v.number()),
  validationRunFinishedAt: v.optional(v.number()),
  validationRunMessage: v.optional(v.string()),
  operationalReviewAcknowledgedAt: v.optional(v.number()),
  operationalReviewAcknowledgedBy: v.optional(v.id("users")),
})
  .index("by_model_id", ["modelId"])
  .index("by_provider", ["provider"])
  .index("by_new", ["isNew"])
  .index("by_platform_enabled", ["isPlatformEnabled"])
  .index("by_system_default", ["isSystemDefault"])
  .index("by_free_tier_locked", ["isFreeTierLocked"])
  .index("by_validation_status", ["validationStatus"])
  .index("by_lifecycle_status", ["lifecycleStatus"]);

/**
 * AI Work Items
 *
 * Tracking records for AI operations that need human-in-the-loop approval.
 * Powers the work items UI pane for preview/approve workflow.
 */
export const aiWorkItems = defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"),
  conversationId: v.id("aiConversations"),

  // Work item identity
  type: v.string(),                      // "crm_create_organization" | "project_create" | etc.
  name: v.string(),                      // User-friendly name
  status: v.union(
    v.literal("preview"),                // Waiting for approval
    v.literal("approved"),               // User approved
    v.literal("executing"),              // Currently running
    v.literal("completed"),              // Done
    v.literal("failed"),                 // Error occurred
    v.literal("cancelled")               // User cancelled
  ),

  // Preview data (what will happen)
  previewData: v.optional(v.array(v.any())),

  // Execution results (what actually happened)
  results: v.optional(v.any()),

  // Progress tracking
  progress: v.optional(v.object({
    total: v.number(),
    completed: v.number(),
    failed: v.number(),
  })),

  // Metadata
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_organization", ["organizationId"])
  .index("by_conversation", ["conversationId"])
  .index("by_status", ["status"])
  .index("by_org_status", ["organizationId", "status"]);

/**
 * Agent Inbox Receipts
 *
 * Durable ingress receipts for inbound agent runtime processing.
 * Receipt lifecycle: accepted -> processing -> completed|failed|duplicate
 */
export const agentInboxReceipts = defineTable({
  organizationId: v.id("organizations"),
  sessionId: v.id("agentSessions"),
  agentId: v.id("objects"),
  channel: v.string(),
  externalContactIdentifier: v.string(),
  idempotencyKey: v.string(),
  idempotencyScopeKey: v.optional(v.string()),
  idempotencyExpiresAt: v.optional(v.number()),
  idempotencyContract: v.optional(runtimeIdempotencyContractValidator),
  queueContract: v.optional(turnQueueContractValidator),
  queueConcurrencyKey: v.optional(v.string()),
  queueOrderingKey: v.optional(v.string()),
  payloadHash: v.optional(v.string()),

  status: v.union(
    v.literal("accepted"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("duplicate")
  ),

  turnId: v.optional(v.id("agentTurns")),
  duplicateCount: v.number(),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
  processingStartedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  failedAt: v.optional(v.number()),
  failureReason: v.optional(v.string()),

  terminalDeliverable: v.optional(v.object({
    pointerType: v.string(),
    pointerId: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    recordedAt: v.number(),
  })),

  mediaSessionEnvelope: v.optional(mediaSessionIngressContractValidator),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org_idempotency_key", ["organizationId", "idempotencyKey"])
  .index("by_org_idempotency_scope_key", ["organizationId", "idempotencyScopeKey"])
  .index("by_session", ["sessionId"])
  .index("by_status", ["status"])
  .index("by_org_status", ["organizationId", "status"])
  .index("by_org_queue_concurrency_status", ["organizationId", "queueConcurrencyKey", "status"])
  .index("by_turn", ["turnId"])
  .index("by_org_time", ["organizationId", "createdAt"]);

/**
 * Agent Spec Registry (ARH-RFC-001)
 *
 * Deterministic registry for `agent_spec_v1` contracts.
 * Stores normalized spec artifacts keyed by scope + agent key.
 */
export const agentSpecRegistry = defineTable({
  scopeKey: v.string(), // "global" or org:<organizationId>
  organizationId: v.optional(v.id("organizations")),
  agentKey: v.string(),
  contractVersion: v.literal("agent_spec_v1"),
  status: v.union(v.literal("active"), v.literal("draft")),
  specHash: v.string(),
  specNormalized: v.any(),
  policyRefs: v.object({
    orgPolicyRef: v.string(),
    channelPolicyRef: v.string(),
    runtimePolicyRef: v.string(),
  }),
  channelAllowList: v.array(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  updatedBy: v.optional(v.string()),
})
  .index("by_scope_agent_key", ["scopeKey", "agentKey"])
  .index("by_spec_hash", ["specHash"])
  .index("by_updated_at", ["updatedAt"]);

// ============================================================================
// AI TRAINING DATA COLLECTION (Custom Model Training)
// ============================================================================

/**
 * AI Training Examples
 *
 * Collects page builder AI interactions for fine-tuning custom models.
 * Each example captures input, output, and user feedback to build
 * a domain-specific training dataset.
 */
export const aiTrainingExamples = defineTable({
  // Source tracking
  conversationId: v.id("aiConversations"),
  messageId: v.optional(v.id("aiMessages")),
  organizationId: v.id("organizations"),

  // Training example type
  exampleType: v.union(
    v.literal("page_generation"),      // Full page JSON generation
    v.literal("section_edit"),         // Single section modification
    v.literal("design_choice"),        // Color/font/style decision
    v.literal("tool_invocation")       // Backend tool usage
  ),

  // Input (user message + context)
  input: v.object({
    userMessage: v.string(),
    previousContext: v.optional(v.string()),     // Last N messages summarized
    ragPatterns: v.optional(v.array(v.string())), // Pattern IDs that were retrieved
    currentPageState: v.optional(v.any()),       // Existing page if editing
  }),

  // Output (AI response)
  output: v.object({
    response: v.string(),                        // Raw AI response text
    generatedJson: v.optional(v.any()),          // Parsed page JSON (if valid)
    toolCalls: v.optional(v.array(v.any())),     // Tool invocations
  }),

  // User feedback (critical for learning)
  feedback: v.object({
    outcome: v.union(
      v.literal("accepted"),             // User saved page as-is
      v.literal("accepted_with_edits"),  // User made minor changes (<20%)
      v.literal("rejected"),             // User made major changes (>50%) or discarded
      v.literal("no_feedback")           // Session ended without action
    ),
    userEdits: v.optional(v.any()),      // Final page state after edits
    editPercentage: v.optional(v.number()), // Calculated diff percentage
    feedbackScore: v.optional(v.number()), // Explicit thumbs up (1) / down (-1)
    feedbackTimestamp: v.optional(v.number()),
  }),

  // Quality flags (for filtering training data)
  quality: v.object({
    isHighQuality: v.boolean(),          // Algorithm-determined
    validJson: v.boolean(),              // Output is valid page JSON
    followedInstructions: v.boolean(),   // Met user requirements
  }),

  // Anonymization status
  anonymized: v.boolean(),
  anonymizedAt: v.optional(v.number()),

  // Export tracking
  exportBatchId: v.optional(v.string()),
  exportedAt: v.optional(v.number()),

  // Metadata
  modelUsed: v.optional(v.string()),     // "anthropic/claude-3-5-sonnet"
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_conversation", ["conversationId"])
  .index("by_organization", ["organizationId"])
  .index("by_type", ["exampleType"])
  .index("by_feedback_outcome", ["feedback.outcome"])
  .index("by_quality", ["quality.isHighQuality"])
  .index("by_export", ["exportedAt"])
  .index("by_created", ["createdAt"]);
