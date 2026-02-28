import { action, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { requireAuthenticatedUser } from "../rbacHelpers";
import { resolveOrganizationProviderBindingForProvider } from "./providerRegistry";
import { convertUsdToCredits } from "./modelPricing";
import {
  assertVoiceTransportEnvelope,
  type VoiceTransportEnvelopeContract,
  voiceTransportEnvelopeValidator,
  VOICE_TRANSPORT_ENVELOPE_CONTRACT_VERSION,
} from "../schemas/aiSchemas";
import {
  TRUST_EVENT_TAXONOMY_VERSION,
  trustEventNameValidator,
  type TrustEventPayload,
  validateTrustEventPayload,
} from "./trustEvents";
import {
  normalizeVoiceRuntimeProviderId,
  resolvePcmTranscriptionMimeType,
  resolveVoiceRuntimeAdapter,
  type VoiceProviderHealth,
  type VoiceRuntimeProviderId,
  type VoiceUsageTelemetry,
} from "./voiceRuntimeAdapter";

// Dynamic require keeps action contexts ergonomic for internal runQuery/runMutation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../_generated/api");

const VOICE_CHANNEL = "voice_runtime";
export const VOICE_EDGE_BRIDGE_CONTRACT_VERSION =
  "tcg_voice_edge_bridge_v1" as const;
export const VOICE_EDGE_RUNTIME_AUTHORITY_PRECEDENCE =
  "vc83_runtime_policy" as const;

type VoiceTrustEventName =
  | "trust.voice.session_transition.v1"
  | "trust.voice.adaptive_flow_decision.v1"
  | "trust.voice.runtime_failover_triggered.v1";

type VoiceRuntimeContext = {
  organizationId: Id<"organizations">;
  actorId: string;
  interviewSessionId: Id<"agentSessions">;
  elevenLabsBinding: {
    apiKey: string;
    baseUrl?: string;
    defaultVoiceId?: string;
    profileId: string;
    billingSource: "platform" | "byok" | "private";
  } | null;
};

export const VOICE_RUNTIME_SESSION_FSM_STATE_VALUES = [
  "opening",
  "open",
  "degraded",
  "closing",
  "closed",
  "error",
] as const;
export type VoiceRuntimeSessionFsmState =
  (typeof VOICE_RUNTIME_SESSION_FSM_STATE_VALUES)[number];

const VOICE_RUNTIME_SESSION_STALE_TIMEOUT_MS = 5 * 60 * 1000;

interface VoiceRuntimeSessionSnapshot {
  voiceSessionId: string;
  state: VoiceRuntimeSessionFsmState;
  fromState?: VoiceRuntimeSessionFsmState;
  providerId?: VoiceRuntimeProviderId;
  requestedProviderId?: VoiceRuntimeProviderId;
  reason?: string;
  occurredAt: number;
}

function normalizeVoiceRuntimeSessionFsmState(
  value: unknown
): VoiceRuntimeSessionFsmState | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return (VOICE_RUNTIME_SESSION_FSM_STATE_VALUES as readonly string[]).includes(
    normalized
  )
    ? (normalized as VoiceRuntimeSessionFsmState)
    : undefined;
}

export function isAllowedVoiceRuntimeSessionTransition(args: {
  fromState?: VoiceRuntimeSessionFsmState;
  toState: VoiceRuntimeSessionFsmState;
}): boolean {
  if (!args.fromState) {
    return args.toState === "opening" || args.toState === "closed";
  }
  if (args.fromState === args.toState) {
    return true;
  }
  const transitions: Record<
    VoiceRuntimeSessionFsmState,
    ReadonlyArray<VoiceRuntimeSessionFsmState>
  > = {
    opening: ["open", "degraded", "closing", "error"],
    open: ["degraded", "closing", "error"],
    degraded: ["open", "closing", "error"],
    closing: ["closed", "error"],
    closed: ["opening"],
    error: ["opening", "closing", "closed"],
  };
  return transitions[args.fromState].includes(args.toState);
}

function assertAllowedVoiceRuntimeSessionTransition(args: {
  fromState?: VoiceRuntimeSessionFsmState;
  toState: VoiceRuntimeSessionFsmState;
}) {
  if (!isAllowedVoiceRuntimeSessionTransition(args)) {
    throw new Error(
      `Invalid voice runtime session transition from ${args.fromState ?? "none"} to ${args.toState}.`
    );
  }
}

export function isVoiceRuntimeSessionStale(args: {
  snapshot?: VoiceRuntimeSessionSnapshot | null;
  nowMs: number;
  staleTimeoutMs?: number;
}): boolean {
  if (!args.snapshot) {
    return false;
  }
  if (args.snapshot.state === "closed") {
    return false;
  }
  const staleTimeoutMs = args.staleTimeoutMs ?? VOICE_RUNTIME_SESSION_STALE_TIMEOUT_MS;
  return args.nowMs - args.snapshot.occurredAt > staleTimeoutMs;
}

interface VoiceRuntimeNativeBridgeMetadata {
  contractVersion: typeof VOICE_EDGE_BRIDGE_CONTRACT_VERSION;
  runtimeAuthorityPrecedence: typeof VOICE_EDGE_RUNTIME_AUTHORITY_PRECEDENCE;
  routeTarget: "vc83_voice_runtime";
  providerPattern: "gemini_live_reference" | "generic_voice_runtime";
  voiceSessionId: string;
  sessionState: "open" | "closed" | "stt" | "tts" | "probe";
  requestedProviderId: VoiceRuntimeProviderId;
  providerId: VoiceRuntimeProviderId;
  fallbackProviderId: VoiceRuntimeProviderId | null;
  fallbackReason?: string | null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function decodeBase64Audio(payload: string): Uint8Array {
  const base64Payload = payload.includes(",")
    ? payload.split(",", 2)[1] ?? ""
    : payload;
  return new Uint8Array(Buffer.from(base64Payload, "base64"));
}

export const VOICE_TRANSPORT_WEBSOCKET_INGEST_PHASE_ID =
  "voice_transport_websocket_ingest_v1" as const;

type VoiceTransportSequenceDecision =
  | "accepted"
  | "duplicate_replay"
  | "gap_detected";

interface VoiceTransportAcceptedReplaySnapshot {
  relayEvents: VoiceTransportEnvelopeContract[];
}

interface VoiceTransportIngestCheckpointState {
  acceptedSequences: Set<number>;
  acceptedReplaysBySequence: Map<number, VoiceTransportAcceptedReplaySnapshot>;
  lastAcceptedSequence: number | null;
}

interface VoiceTransportIngestCheckpointSnapshot {
  acceptedSequences: number[];
  acceptedReplayEventsBySequence: Record<string, VoiceTransportEnvelopeContract[]>;
  lastAcceptedSequence: number | null;
}

const VOICE_TRANSPORT_SEQUENCE_WINDOW_LIMIT = 256;

interface ResolveVoiceTransportSequenceDecisionArgs {
  sequence: number;
  acceptedSequences: ReadonlySet<number>;
  lastAcceptedSequence: number | null;
}

interface ResolveVoiceTransportSequenceDecisionResult {
  decision: VoiceTransportSequenceDecision;
  expectedSequence: number;
}

export function resolveVoiceTransportSequenceDecision(
  args: ResolveVoiceTransportSequenceDecisionArgs,
): ResolveVoiceTransportSequenceDecisionResult {
  const expectedSequence =
    typeof args.lastAcceptedSequence === "number"
      ? args.lastAcceptedSequence + 1
      : 0;
  if (args.acceptedSequences.has(args.sequence)) {
    return {
      decision: "duplicate_replay",
      expectedSequence,
    };
  }
  if (args.sequence < expectedSequence) {
    return {
      decision: "duplicate_replay",
      expectedSequence,
    };
  }
  if (args.sequence > expectedSequence) {
    return {
      decision: "gap_detected",
      expectedSequence,
    };
  }
  return {
    decision: "accepted",
    expectedSequence,
  };
}

function asVoiceTransportEnvelopeArray(
  value: unknown,
): VoiceTransportEnvelopeContract[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const envelopes: VoiceTransportEnvelopeContract[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    try {
      assertVoiceTransportEnvelope(entry as VoiceTransportEnvelopeContract);
      envelopes.push(entry as VoiceTransportEnvelopeContract);
    } catch {
      continue;
    }
  }
  return envelopes;
}

function extractVoiceTransportIngestCheckpointStateFromEvents(args: {
  events: Array<{ payload?: Record<string, unknown> }>;
  organizationId: Id<"organizations">;
  interviewSessionId: Id<"agentSessions">;
  voiceSessionId: string;
}): VoiceTransportIngestCheckpointState {
  const acceptedSequences = new Set<number>();
  const acceptedReplaysBySequence = new Map<
    number,
    VoiceTransportAcceptedReplaySnapshot
  >();
  let lastAcceptedSequence: number | null = null;

  for (const event of args.events) {
    const payload =
      event && typeof event.payload === "object" && event.payload !== null
        ? (event.payload as Record<string, unknown>)
        : null;
    if (!payload) {
      continue;
    }
    if (normalizeString(payload.org_id) !== String(args.organizationId)) {
      continue;
    }
    if (normalizeString(payload.session_id) !== String(args.interviewSessionId)) {
      continue;
    }
    if (
      normalizeString(payload.voice_session_id) !==
      normalizeString(args.voiceSessionId)
    ) {
      continue;
    }
    if (
      normalizeString(payload.adaptive_phase_id) !==
      VOICE_TRANSPORT_WEBSOCKET_INGEST_PHASE_ID
    ) {
      continue;
    }
    const sequence = Number(
      (payload as Record<string, unknown>).voice_transport_sequence,
    );
    if (!Number.isInteger(sequence) || sequence < 0) {
      continue;
    }
    const orderingDecision = normalizeString(
      (payload as Record<string, unknown>).voice_transport_ordering_decision,
    );
    if (orderingDecision !== "accepted") {
      continue;
    }
    acceptedSequences.add(sequence);
    if (lastAcceptedSequence === null || sequence > lastAcceptedSequence) {
      lastAcceptedSequence = sequence;
    }
    if (!acceptedReplaysBySequence.has(sequence)) {
      acceptedReplaysBySequence.set(sequence, {
        relayEvents: asVoiceTransportEnvelopeArray(
          (payload as Record<string, unknown>).voice_transport_relay_events,
        ),
      });
    }
  }

  return {
    acceptedSequences,
    acceptedReplaysBySequence,
    lastAcceptedSequence,
  };
}

function serializeVoiceTransportIngestCheckpointState(
  state: VoiceTransportIngestCheckpointState,
): VoiceTransportIngestCheckpointSnapshot {
  const acceptedReplayEventsBySequence: Record<
    string,
    VoiceTransportEnvelopeContract[]
  > = {};
  for (const [sequence, snapshot] of state.acceptedReplaysBySequence.entries()) {
    acceptedReplayEventsBySequence[String(sequence)] = snapshot.relayEvents;
  }
  return {
    acceptedSequences: Array.from(state.acceptedSequences.values()).sort(
      (left, right) => left - right,
    ),
    acceptedReplayEventsBySequence,
    lastAcceptedSequence: state.lastAcceptedSequence,
  };
}

function mergeVoiceTransportAcceptedSequenceWindow(args: {
  previous: number[];
  nextAcceptedSequence: number;
  windowLimit?: number;
}): number[] {
  const next = new Set<number>();
  for (const sequence of args.previous) {
    if (Number.isInteger(sequence) && sequence >= 0) {
      next.add(sequence);
    }
  }
  next.add(args.nextAcceptedSequence);
  const ordered = Array.from(next.values()).sort((left, right) => left - right);
  const windowLimit = args.windowLimit ?? VOICE_TRANSPORT_SEQUENCE_WINDOW_LIMIT;
  return ordered.slice(Math.max(0, ordered.length - windowLimit));
}

function trimVoiceTransportRelayEventsBySequence(args: {
  relayEventsBySequence: Record<string, VoiceTransportEnvelopeContract[]>;
  acceptedSequenceWindow: number[];
}): Record<string, VoiceTransportEnvelopeContract[]> {
  const allowedSequenceSet = new Set(
    args.acceptedSequenceWindow.map((sequence) => String(sequence)),
  );
  const trimmed: Record<string, VoiceTransportEnvelopeContract[]> = {};
  for (const [sequence, relayEvents] of Object.entries(args.relayEventsBySequence)) {
    if (!allowedSequenceSet.has(sequence)) {
      continue;
    }
    trimmed[sequence] = relayEvents;
  }
  return trimmed;
}

export function resolveBrowserFallbackTranscriptText(args: {
  eventType: VoiceTransportEnvelopeContract["eventType"];
  transcriptText?: string;
}): string | null {
  if (args.eventType !== "audio_chunk") {
    return null;
  }
  return normalizeString(args.transcriptText);
}

export interface VoiceAssistantStreamRelayState {
  activeAssistantMessageId: string | null;
  finalizedAssistantMessageIds: string[];
  cancelledAssistantMessageIds: string[];
}

function toSortedSequenceKeys(
  relayEventsBySequence: Record<string, VoiceTransportEnvelopeContract[]>,
): number[] {
  return Object.keys(relayEventsBySequence)
    .map((key) => Number(key))
    .filter((sequence) => Number.isInteger(sequence) && sequence >= 0)
    .sort((left, right) => left - right);
}

export function resolveVoiceAssistantStreamRelayState(args: {
  relayEventsBySequence: Record<string, VoiceTransportEnvelopeContract[]>;
}): VoiceAssistantStreamRelayState {
  const finalized = new Set<string>();
  const cancelled = new Set<string>();
  let activeAssistantMessageId: string | null = null;

  for (const sequence of toSortedSequenceKeys(args.relayEventsBySequence)) {
    const relayEvents = args.relayEventsBySequence[String(sequence)] ?? [];
    for (const relayEvent of relayEvents) {
      if (relayEvent.eventType === "assistant_audio_chunk") {
        const assistantMessageId = normalizeString(relayEvent.assistantMessageId);
        if (!assistantMessageId) {
          continue;
        }
        if (finalized.has(assistantMessageId) || cancelled.has(assistantMessageId)) {
          continue;
        }
        activeAssistantMessageId = assistantMessageId;
        continue;
      }
      if (relayEvent.eventType === "assistant_audio_final") {
        const assistantMessageId = normalizeString(relayEvent.assistantMessageId);
        if (!assistantMessageId) {
          continue;
        }
        finalized.add(assistantMessageId);
        if (activeAssistantMessageId === assistantMessageId) {
          activeAssistantMessageId = null;
        }
        continue;
      }
      if (relayEvent.eventType === "barge_in" && activeAssistantMessageId) {
        cancelled.add(activeAssistantMessageId);
        finalized.add(activeAssistantMessageId);
        activeAssistantMessageId = null;
      }
    }
  }

  return {
    activeAssistantMessageId,
    finalizedAssistantMessageIds: Array.from(finalized.values()).sort(),
    cancelledAssistantMessageIds: Array.from(cancelled.values()).sort(),
  };
}

function buildVoiceTransportAssistantAudioFinalEnvelope(args: {
  sourceEnvelope: VoiceTransportEnvelopeContract;
  assistantMessageId: string;
}): VoiceTransportEnvelopeContract {
  return {
    contractVersion: VOICE_TRANSPORT_ENVELOPE_CONTRACT_VERSION,
    transportMode: args.sourceEnvelope.transportMode,
    eventType: "assistant_audio_final",
    liveSessionId: args.sourceEnvelope.liveSessionId,
    voiceSessionId: args.sourceEnvelope.voiceSessionId,
    interviewSessionId: args.sourceEnvelope.interviewSessionId,
    sequence: args.sourceEnvelope.sequence,
    previousSequence: args.sourceEnvelope.previousSequence,
    timestampMs: Date.now(),
    assistantMessageId: args.assistantMessageId,
  };
}

interface ResolveVoiceAssistantRelayArgs {
  sourceEnvelope: VoiceTransportEnvelopeContract;
  relayEventsBySequence: Record<string, VoiceTransportEnvelopeContract[]>;
}

interface ResolveVoiceAssistantRelayResult {
  relayEvents: VoiceTransportEnvelopeContract[];
  relayErrorMessage: string | null;
  cancellationAssistantMessageId: string | null;
}

export function resolveVoiceAssistantRelay(args: ResolveVoiceAssistantRelayArgs): ResolveVoiceAssistantRelayResult {
  const sourceEnvelope = args.sourceEnvelope;
  const streamState = resolveVoiceAssistantStreamRelayState({
    relayEventsBySequence: args.relayEventsBySequence,
  });
  const finalizedIds = new Set(streamState.finalizedAssistantMessageIds);
  const cancelledIds = new Set(streamState.cancelledAssistantMessageIds);

  if (sourceEnvelope.eventType === "assistant_audio_chunk") {
    const assistantMessageId = normalizeString(sourceEnvelope.assistantMessageId);
    if (!assistantMessageId) {
      return {
        relayEvents: [
          buildVoiceTransportErrorEnvelope({
            sourceEnvelope,
            code: "vt_upstream_provider_error",
            message:
              "Assistant audio chunk relay requires assistantMessageId.",
            retryable: false,
          }),
        ],
        relayErrorMessage: "assistant_audio_chunk_missing_message_id",
        cancellationAssistantMessageId: null,
      };
    }
    if (finalizedIds.has(assistantMessageId) || cancelledIds.has(assistantMessageId)) {
      return {
        relayEvents: [],
        relayErrorMessage: null,
        cancellationAssistantMessageId: null,
      };
    }
    if (
      streamState.activeAssistantMessageId &&
      streamState.activeAssistantMessageId !== assistantMessageId
    ) {
      return {
        relayEvents: [
          buildVoiceTransportAssistantAudioFinalEnvelope({
            sourceEnvelope,
            assistantMessageId: streamState.activeAssistantMessageId,
          }),
          sourceEnvelope,
        ],
        relayErrorMessage: null,
        cancellationAssistantMessageId: streamState.activeAssistantMessageId,
      };
    }
    return {
      relayEvents: [sourceEnvelope],
      relayErrorMessage: null,
      cancellationAssistantMessageId: null,
    };
  }

  if (sourceEnvelope.eventType === "assistant_audio_final") {
    const assistantMessageId = normalizeString(sourceEnvelope.assistantMessageId);
    if (!assistantMessageId) {
      return {
        relayEvents: [
          buildVoiceTransportErrorEnvelope({
            sourceEnvelope,
            code: "vt_upstream_provider_error",
            message:
              "Assistant audio final relay requires assistantMessageId.",
            retryable: false,
          }),
        ],
        relayErrorMessage: "assistant_audio_final_missing_message_id",
        cancellationAssistantMessageId: null,
      };
    }
    if (finalizedIds.has(assistantMessageId) || cancelledIds.has(assistantMessageId)) {
      return {
        relayEvents: [],
        relayErrorMessage: null,
        cancellationAssistantMessageId: null,
      };
    }
    if (
      streamState.activeAssistantMessageId &&
      streamState.activeAssistantMessageId !== assistantMessageId
    ) {
      return {
        relayEvents: [
          buildVoiceTransportAssistantAudioFinalEnvelope({
            sourceEnvelope,
            assistantMessageId: streamState.activeAssistantMessageId,
          }),
          sourceEnvelope,
        ],
        relayErrorMessage: null,
        cancellationAssistantMessageId: streamState.activeAssistantMessageId,
      };
    }
    return {
      relayEvents: [sourceEnvelope],
      relayErrorMessage: null,
      cancellationAssistantMessageId: null,
    };
  }

  if (sourceEnvelope.eventType === "barge_in") {
    if (!streamState.activeAssistantMessageId) {
      return {
        relayEvents: [sourceEnvelope],
        relayErrorMessage: null,
        cancellationAssistantMessageId: null,
      };
    }
    return {
      relayEvents: [
        sourceEnvelope,
        buildVoiceTransportAssistantAudioFinalEnvelope({
          sourceEnvelope,
          assistantMessageId: streamState.activeAssistantMessageId,
        }),
      ],
      relayErrorMessage: null,
      cancellationAssistantMessageId: streamState.activeAssistantMessageId,
    };
  }

  return {
    relayEvents: [sourceEnvelope],
    relayErrorMessage: null,
    cancellationAssistantMessageId: null,
  };
}

function buildVoiceTransportErrorEnvelope(args: {
  sourceEnvelope: VoiceTransportEnvelopeContract;
  code:
    | "vt_sequence_gap_detected"
    | "vt_sequence_replay_detected"
    | "vt_upstream_provider_error";
  message: string;
  retryable: boolean;
}): VoiceTransportEnvelopeContract {
  return {
    contractVersion: VOICE_TRANSPORT_ENVELOPE_CONTRACT_VERSION,
    transportMode: args.sourceEnvelope.transportMode,
    eventType: "error",
    liveSessionId: args.sourceEnvelope.liveSessionId,
    voiceSessionId: args.sourceEnvelope.voiceSessionId,
    interviewSessionId: args.sourceEnvelope.interviewSessionId,
    sequence: args.sourceEnvelope.sequence,
    previousSequence: args.sourceEnvelope.previousSequence,
    timestampMs: Date.now(),
    error: {
      code: args.code,
      message: args.message,
      retryable: args.retryable,
    },
  };
}

function buildVoiceRuntimeNativeBridgeMetadata(args: {
  voiceSessionId: string;
  sessionState: "open" | "closed" | "stt" | "tts" | "probe";
  requestedProviderId: VoiceRuntimeProviderId;
  providerId: VoiceRuntimeProviderId;
  fallbackProviderId?: VoiceRuntimeProviderId | null;
  fallbackReason?: string | null;
}): VoiceRuntimeNativeBridgeMetadata {
  return {
    contractVersion: VOICE_EDGE_BRIDGE_CONTRACT_VERSION,
    runtimeAuthorityPrecedence: VOICE_EDGE_RUNTIME_AUTHORITY_PRECEDENCE,
    routeTarget: "vc83_voice_runtime",
    providerPattern:
      args.providerId === "elevenlabs"
        ? "gemini_live_reference"
        : "generic_voice_runtime",
    voiceSessionId: args.voiceSessionId,
    sessionState: args.sessionState,
    requestedProviderId: args.requestedProviderId,
    providerId: args.providerId,
    fallbackProviderId: args.fallbackProviderId ?? null,
    fallbackReason: normalizeString(args.fallbackReason) ?? null,
  };
}

function resolveVoiceBillingSource(args: {
  providerId: VoiceRuntimeProviderId;
  elevenLabsBinding: VoiceRuntimeContext["elevenLabsBinding"];
}): "platform" | "byok" | "private" {
  if (args.providerId === "elevenlabs") {
    return args.elevenLabsBinding?.billingSource ?? "platform";
  }
  return "private";
}

function resolveVoiceUsageModelId(args: {
  providerId: VoiceRuntimeProviderId;
  usage?: VoiceUsageTelemetry | null;
}): string {
  const metadata = args.usage?.metadata;
  if (metadata && typeof metadata === "object") {
    const modelId = normalizeString((metadata as Record<string, unknown>).modelId);
    if (modelId) {
      return modelId;
    }
  }
  return args.providerId === "elevenlabs"
    ? "elevenlabs_voice_runtime"
    : "browser_voice_runtime";
}

async function recordVoiceUsage(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  runtimeContext: VoiceRuntimeContext;
  voiceSessionId: string;
  requestType: "voice_session" | "voice_stt" | "voice_tts";
  action: string;
  creditLedgerAction: string;
  providerId: VoiceRuntimeProviderId;
  success: boolean;
  errorMessage?: string;
  usage?: VoiceUsageTelemetry | null;
  metadata?: Record<string, unknown>;
}) {
  const billingSource = resolveVoiceBillingSource({
    providerId: args.providerId,
    elevenLabsBinding: args.runtimeContext.elevenLabsBinding,
  });
  const nativeCostInCents =
    typeof args.usage?.nativeCostInCents === "number" &&
    Number.isFinite(args.usage.nativeCostInCents) &&
    args.usage.nativeCostInCents > 0
      ? Math.floor(args.usage.nativeCostInCents)
      : 0;
  const creditsToCharge =
    nativeCostInCents > 0 ? convertUsdToCredits(nativeCostInCents / 100) : 0;
  let creditsCharged = 0;
  let creditChargeStatus:
    | "charged"
    | "skipped_unmetered"
    | "skipped_insufficient_credits"
    | "skipped_not_required"
    | "failed" =
    billingSource === "platform" ? "skipped_unmetered" : "skipped_not_required";

  if (args.success && billingSource === "platform" && creditsToCharge > 0) {
    try {
      const deduction = await args.ctx.runMutation(
        generatedApi.internal.credits.index.deductCreditsInternalMutation,
        {
          organizationId: args.runtimeContext.organizationId,
          amount: creditsToCharge,
          action: args.creditLedgerAction,
          relatedEntityType: "agent_session",
          relatedEntityId: args.runtimeContext.interviewSessionId,
          billingSource,
          requestSource: "llm",
          softFailOnExhausted: true,
        }
      );

      if (deduction.success && !deduction.skipped) {
        creditsCharged = creditsToCharge;
        creditChargeStatus = "charged";
      } else if (deduction.success && deduction.skipped) {
        creditChargeStatus = "skipped_not_required";
      } else {
        creditChargeStatus = "skipped_insufficient_credits";
      }
    } catch (error) {
      creditChargeStatus = "failed";
      console.error("[VoiceRuntime] Voice credit deduction failed:", error);
    }
  }

  await args.ctx.runMutation(generatedApi.api.ai.billing.recordUsage, {
    organizationId: args.runtimeContext.organizationId,
    requestType: args.requestType,
    provider: args.providerId,
    model: resolveVoiceUsageModelId({
      providerId: args.providerId,
      usage: args.usage ?? null,
    }),
    action: args.action,
    requestCount: 1,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    costInCents: nativeCostInCents,
    nativeUsageUnit: args.usage?.nativeUsageUnit,
    nativeUsageQuantity: args.usage?.nativeUsageQuantity,
    nativeInputUnits: args.usage?.nativeInputUnits,
    nativeOutputUnits: args.usage?.nativeOutputUnits,
    nativeTotalUnits: args.usage?.nativeTotalUnits,
    nativeCostInCents: nativeCostInCents > 0 ? nativeCostInCents : undefined,
    nativeCostCurrency: args.usage?.nativeCostCurrency,
    nativeCostSource: args.usage?.nativeCostSource ?? "not_available",
    providerRequestId: args.usage?.providerRequestId,
    usageMetadata: {
      voiceSessionId: args.voiceSessionId,
      interviewSessionId: args.runtimeContext.interviewSessionId,
      ...(args.metadata ?? {}),
      ...(args.usage?.metadata && typeof args.usage.metadata === "object"
        ? { providerUsage: args.usage.metadata }
        : {}),
    },
    creditsCharged,
    creditChargeStatus,
    success: args.success,
    errorMessage: args.errorMessage,
    billingSource,
    requestSource: "llm",
    ledgerMode: "credits_ledger",
    creditLedgerAction: args.creditLedgerAction,
  });
}

function extractDefaultVoiceId(
  providerAuthProfiles: unknown,
  profileId: string,
): string | undefined {
  if (!Array.isArray(providerAuthProfiles)) {
    return undefined;
  }

  for (const profile of providerAuthProfiles) {
    if (typeof profile !== "object" || profile === null) {
      continue;
    }
    const typedProfile = profile as Record<string, unknown>;
    if (typedProfile.providerId !== "elevenlabs") {
      continue;
    }
    if (normalizeString(typedProfile.profileId) !== profileId) {
      continue;
    }
    const metadata = typedProfile.metadata;
    if (typeof metadata !== "object" || metadata === null) {
      continue;
    }
    const defaultVoiceId = normalizeString(
      (metadata as Record<string, unknown>).defaultVoiceId,
    );
    if (defaultVoiceId) {
      return defaultVoiceId;
    }
  }

  return undefined;
}

async function emitVoiceTrustEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    eventName: VoiceTrustEventName;
    organizationId: Id<"organizations">;
    interviewSessionId: Id<"agentSessions">;
    actorId: string;
    mode: "lifecycle" | "runtime";
    additionalPayload: Record<string, unknown>;
  },
) {
  const occurredAt = Date.now();
  const basePayload: TrustEventPayload = {
    event_id: `${args.eventName}:${args.interviewSessionId}:${occurredAt}`,
    event_version: TRUST_EVENT_TAXONOMY_VERSION,
    occurred_at: occurredAt,
    org_id: args.organizationId,
    mode: args.mode,
    channel: VOICE_CHANNEL,
    session_id: String(args.interviewSessionId),
    actor_type: "system",
    actor_id: args.actorId,
  };
  const payload = Object.assign({}, basePayload, args.additionalPayload) as TrustEventPayload;

  await ctx.runMutation(generatedApi.internal.ai.voiceRuntime.recordVoiceTrustEvent, {
    eventName: args.eventName,
    payload,
  });
}

async function emitVoiceFailoverEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    organizationId: Id<"organizations">;
    interviewSessionId: Id<"agentSessions">;
    actorId: string;
    voiceSessionId: string;
    requestedProviderId: VoiceRuntimeProviderId;
    fallbackProviderId: VoiceRuntimeProviderId;
    health: VoiceProviderHealth;
    reason: string;
  },
) {
  await emitVoiceTrustEvent(ctx, {
    eventName: "trust.voice.runtime_failover_triggered.v1",
    organizationId: args.organizationId,
    interviewSessionId: args.interviewSessionId,
    actorId: args.actorId,
    mode: "runtime",
    additionalPayload: {
      voice_session_id: args.voiceSessionId,
      voice_runtime_provider: args.requestedProviderId,
      voice_failover_provider: args.fallbackProviderId,
      voice_failover_reason: args.reason,
      voice_provider_health_status: args.health.status,
    },
  });
}

function toVoiceRuntimeSessionSnapshot(args: {
  event: {
    payload?: Record<string, unknown>;
  };
  voiceSessionId: string;
}): VoiceRuntimeSessionSnapshot | null {
  const payload = args.event.payload;
  if (!payload) {
    return null;
  }
  const state =
    normalizeVoiceRuntimeSessionFsmState(payload.voice_runtime_fsm_state) ??
    normalizeVoiceRuntimeSessionFsmState(payload.voice_state_to);
  if (!state) {
    return null;
  }
  const occurredAt =
    typeof payload.occurred_at === "number" && Number.isFinite(payload.occurred_at)
      ? Math.floor(payload.occurred_at)
      : Date.now();

  return {
    voiceSessionId: args.voiceSessionId,
    state,
    fromState:
      normalizeVoiceRuntimeSessionFsmState(payload.voice_runtime_fsm_state_from) ??
      normalizeVoiceRuntimeSessionFsmState(payload.voice_state_from),
    providerId: normalizeVoiceRuntimeProviderId(
      payload.voice_runtime_provider as any
    ),
    requestedProviderId: normalizeVoiceRuntimeProviderId(
      payload.voice_requested_provider as any,
    ),
    reason: normalizeString(payload.voice_transition_reason) ?? undefined,
    occurredAt,
  };
}

async function resolveLatestVoiceRuntimeSessionSnapshot(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    organizationId: Id<"organizations">;
    interviewSessionId: Id<"agentSessions">;
    voiceSessionId?: string | null;
  },
): Promise<VoiceRuntimeSessionSnapshot | null> {
  const targetVoiceSessionId = normalizeString(args.voiceSessionId ?? undefined);
  const events = await ctx.db
    .query("aiTrustEvents")
    .withIndex("by_event_name_occurred_at", (q: any) =>
      q.eq("event_name", "trust.voice.session_transition.v1")
    )
    .order("desc")
    .take(256);

  for (const event of events) {
    const payload =
      event && typeof event.payload === "object" && event.payload !== null
        ? (event.payload as Record<string, unknown>)
        : null;
    if (!payload) {
      continue;
    }
    const orgId = normalizeString(payload.org_id);
    const sessionId = normalizeString(payload.session_id);
    if (orgId !== String(args.organizationId)) {
      continue;
    }
    if (sessionId !== String(args.interviewSessionId)) {
      continue;
    }
    const voiceSessionId = normalizeString(payload.voice_session_id);
    if (!voiceSessionId) {
      continue;
    }
    if (targetVoiceSessionId && voiceSessionId !== targetVoiceSessionId) {
      continue;
    }
    return toVoiceRuntimeSessionSnapshot({ event, voiceSessionId });
  }

  return null;
}

async function emitVoiceSessionTransitionEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    runtimeContext: VoiceRuntimeContext;
    voiceSessionId: string;
    fromState?: VoiceRuntimeSessionFsmState;
    toState: VoiceRuntimeSessionFsmState;
    reason: string;
    providerId?: VoiceRuntimeProviderId;
    requestedProviderId?: VoiceRuntimeProviderId;
    fallbackProviderId?: VoiceRuntimeProviderId | null;
  },
) {
  assertAllowedVoiceRuntimeSessionTransition({
    fromState: args.fromState,
    toState: args.toState,
  });
  await emitVoiceTrustEvent(ctx, {
    eventName: "trust.voice.session_transition.v1",
    organizationId: args.runtimeContext.organizationId,
    interviewSessionId: args.runtimeContext.interviewSessionId,
    actorId: args.runtimeContext.actorId,
    mode: "lifecycle",
    additionalPayload: {
      voice_session_id: args.voiceSessionId,
      voice_state_from: args.fromState ?? "created",
      voice_state_to: args.toState,
      voice_runtime_fsm_state_from: args.fromState ?? "created",
      voice_runtime_fsm_state: args.toState,
      voice_transition_reason: args.reason,
      voice_runtime_provider: args.providerId ?? "browser",
      voice_requested_provider: args.requestedProviderId ?? "browser",
      voice_failover_provider: args.fallbackProviderId ?? null,
    },
  });
}

function resolveOpenSessionTargetState(args: {
  health: VoiceProviderHealth;
}): VoiceRuntimeSessionFsmState {
  return args.health.status === "healthy" ? "open" : "degraded";
}

async function applyStaleSessionCleanupIfNeeded(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    runtimeContext: VoiceRuntimeContext;
    snapshot: VoiceRuntimeSessionSnapshot | null;
    nowMs: number;
  },
): Promise<VoiceRuntimeSessionSnapshot | null> {
  if (
    !isVoiceRuntimeSessionStale({
      snapshot: args.snapshot,
      nowMs: args.nowMs,
    })
  ) {
    return args.snapshot;
  }
  if (!args.snapshot) {
    return null;
  }
  await emitVoiceSessionTransitionEvent(ctx, {
    runtimeContext: args.runtimeContext,
    voiceSessionId: args.snapshot.voiceSessionId,
    fromState: args.snapshot.state,
    toState: "closed",
    reason: "voice_session_stale_timeout_cleanup",
    providerId: args.snapshot.providerId,
    requestedProviderId: args.snapshot.requestedProviderId,
    fallbackProviderId: null,
  });
  return {
    ...args.snapshot,
    fromState: args.snapshot.state,
    state: "closed",
    reason: "voice_session_stale_timeout_cleanup",
    occurredAt: args.nowMs,
  };
}

function isAlreadyClosedRemoteError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("not found") ||
    message.includes("already closed") ||
    message.includes("unknown session")
  );
}

export const resolveVoiceRuntimeContext = internalQuery({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args): Promise<VoiceRuntimeContext> => {
    const { userId, organizationId } = await requireAuthenticatedUser(
      ctx,
      args.sessionId,
    );
    const interviewSession = await ctx.db.get(args.interviewSessionId);

    if (!interviewSession) {
      throw new Error("Interview session not found.");
    }
    if (interviewSession.organizationId !== organizationId) {
      throw new Error("Interview session does not belong to your organization.");
    }

    const aiSettings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .first();

    const binding = aiSettings?.llm
      ? resolveOrganizationProviderBindingForProvider({
          providerId: "elevenlabs",
          llmSettings: aiSettings.llm,
          defaultBillingSource:
            aiSettings.billingSource ??
            (aiSettings.billingMode === "byok" ? "byok" : "platform"),
          now: Date.now(),
        })
      : null;

    const defaultVoiceId = binding?.profileId
      ? extractDefaultVoiceId(
          aiSettings?.llm?.providerAuthProfiles,
          binding.profileId,
        )
      : undefined;

    return {
      organizationId,
      actorId: String(userId),
      interviewSessionId: args.interviewSessionId,
      elevenLabsBinding: binding
        ? {
            apiKey: binding.apiKey,
            baseUrl: binding.baseUrl,
            defaultVoiceId,
            profileId: binding.profileId,
            billingSource: binding.billingSource,
          }
        : null,
    };
  },
});

export const recordVoiceTrustEvent = internalMutation({
  args: {
    eventName: trustEventNameValidator,
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const payload = args.payload as TrustEventPayload;
    const validation = validateTrustEventPayload(args.eventName, payload);
    await ctx.db.insert("aiTrustEvents", {
      event_name: args.eventName,
      payload,
      schema_validation_status: validation.ok ? "passed" : "failed",
      schema_errors: validation.ok ? undefined : validation.errors,
      created_at: Date.now(),
    });
  },
});

export const resolveVoiceTransportIngestCheckpoint = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    interviewSessionId: v.id("agentSessions"),
    voiceSessionId: v.string(),
  },
  handler: async (ctx, args): Promise<VoiceTransportIngestCheckpointSnapshot> => {
    const persisted = await ctx.db
      .query("voiceTransportSessionState")
      .withIndex("by_org_session_voice", (q: any) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("interviewSessionId", args.interviewSessionId)
          .eq("voiceSessionId", args.voiceSessionId),
      )
      .first();

    if (persisted) {
      const acceptedSequenceWindow = Array.isArray(persisted.acceptedSequenceWindow)
        ? persisted.acceptedSequenceWindow
        : [];
      const relayEventsBySequence =
        persisted.relayEventsBySequence &&
        typeof persisted.relayEventsBySequence === "object"
          ? (persisted.relayEventsBySequence as Record<
              string,
              VoiceTransportEnvelopeContract[]
            >)
          : {};
      return {
        acceptedSequences: acceptedSequenceWindow,
        acceptedReplayEventsBySequence: relayEventsBySequence,
        lastAcceptedSequence:
          typeof persisted.lastAcceptedSequence === "number"
            ? persisted.lastAcceptedSequence
            : null,
      };
    }

    // Backward-compatible bootstrap path for sessions created before keyed checkpoint persistence.
    const recentIngestEvents = await ctx.db
      .query("aiTrustEvents")
      .withIndex("by_event_name_occurred_at", (q: any) =>
        q.eq("event_name", "trust.voice.adaptive_flow_decision.v1"),
      )
      .order("desc")
      .take(512);
    const fallbackIngestCheckpoint = extractVoiceTransportIngestCheckpointStateFromEvents({
      events: recentIngestEvents,
      organizationId: args.organizationId,
      interviewSessionId: args.interviewSessionId,
      voiceSessionId: args.voiceSessionId,
    });
    return serializeVoiceTransportIngestCheckpointState(fallbackIngestCheckpoint);
  },
});

export const commitVoiceTransportIngestCheckpoint = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    interviewSessionId: v.id("agentSessions"),
    voiceSessionId: v.string(),
    acceptedSequence: v.number(),
    relayEvents: v.array(voiceTransportEnvelopeValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("voiceTransportSessionState")
      .withIndex("by_org_session_voice", (q: any) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("interviewSessionId", args.interviewSessionId)
          .eq("voiceSessionId", args.voiceSessionId),
      )
      .first();

    const previousWindow = Array.isArray(existing?.acceptedSequenceWindow)
      ? existing.acceptedSequenceWindow
      : [];
    const acceptedSequenceWindow = mergeVoiceTransportAcceptedSequenceWindow({
      previous: previousWindow,
      nextAcceptedSequence: args.acceptedSequence,
      windowLimit: VOICE_TRANSPORT_SEQUENCE_WINDOW_LIMIT,
    });

    const previousRelayEventsBySequence =
      existing?.relayEventsBySequence &&
      typeof existing.relayEventsBySequence === "object"
        ? (existing.relayEventsBySequence as Record<
            string,
            VoiceTransportEnvelopeContract[]
          >)
        : {};
    const existingRelayEventsForSequence =
      previousRelayEventsBySequence[String(args.acceptedSequence)];
    if (existing && Array.isArray(existingRelayEventsForSequence)) {
      return {
        stateId: existing._id,
        created: false,
        alreadyAccepted: true,
        relayEvents: existingRelayEventsForSequence,
      };
    }
    const relayEventsBySequence = trimVoiceTransportRelayEventsBySequence({
      relayEventsBySequence: {
        ...previousRelayEventsBySequence,
        [String(args.acceptedSequence)]: args.relayEvents,
      },
      acceptedSequenceWindow,
    });

    const lastAcceptedSequence =
      typeof existing?.lastAcceptedSequence === "number"
        ? Math.max(existing.lastAcceptedSequence, args.acceptedSequence)
        : args.acceptedSequence;

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastAcceptedSequence,
        acceptedSequenceWindow,
        relayEventsBySequence,
        updatedAt: now,
      });
      return {
        stateId: existing._id,
        created: false,
        alreadyAccepted: false,
        relayEvents: args.relayEvents,
      };
    }

    const stateId = await ctx.db.insert("voiceTransportSessionState", {
      organizationId: args.organizationId,
      interviewSessionId: args.interviewSessionId,
      voiceSessionId: args.voiceSessionId,
      lastAcceptedSequence,
      acceptedSequenceWindow,
      relayEventsBySequence,
      createdAt: now,
      updatedAt: now,
    });
    return {
      stateId,
      created: true,
      alreadyAccepted: false,
      relayEvents: args.relayEvents,
    };
  },
});

export const resolveVoiceSessionState = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    voiceSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const normalizedVoiceSessionId = normalizeString(args.voiceSessionId) ?? null;
    const nowMs = Date.now();
    const latestSession = await resolveLatestVoiceRuntimeSessionSnapshot(ctx, {
      organizationId: runtimeContext.organizationId,
      interviewSessionId: runtimeContext.interviewSessionId,
      voiceSessionId: normalizedVoiceSessionId,
    });
    const cleanedSession = await applyStaleSessionCleanupIfNeeded(ctx, {
      runtimeContext,
      snapshot: latestSession,
      nowMs,
    });

    return {
      success: true,
      voiceSession: cleanedSession
        ? {
          voiceSessionId: cleanedSession.voiceSessionId,
          state: cleanedSession.state,
          fromState: cleanedSession.fromState ?? null,
          providerId: cleanedSession.providerId ?? null,
          requestedProviderId: cleanedSession.requestedProviderId ?? null,
          reason: cleanedSession.reason ?? null,
          occurredAt: cleanedSession.occurredAt,
          stale: isVoiceRuntimeSessionStale({
            snapshot: cleanedSession,
            nowMs,
          }),
        }
        : null,
    };
  },
});

export const openVoiceSession = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    requestedProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
    requestedVoiceId: v.optional(v.string()),
    voiceSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const requestedProviderId = normalizeVoiceRuntimeProviderId(
      args.requestedProviderId,
    );
    const voiceId =
      normalizeString(args.requestedVoiceId) ??
      runtimeContext.elevenLabsBinding?.defaultVoiceId;
    const voiceSessionId =
      normalizeString(args.voiceSessionId) ??
      `voice:${args.interviewSessionId}:${Date.now()}`;
    const nowMs = Date.now();
    const latestSession = await resolveLatestVoiceRuntimeSessionSnapshot(ctx, {
      organizationId: runtimeContext.organizationId,
      interviewSessionId: runtimeContext.interviewSessionId,
      voiceSessionId,
    });
    const cleanedSession = await applyStaleSessionCleanupIfNeeded(ctx, {
      runtimeContext,
      snapshot: latestSession,
      nowMs,
    });
    if (
      cleanedSession &&
      (cleanedSession.state === "opening" ||
        cleanedSession.state === "open" ||
        cleanedSession.state === "degraded")
    ) {
      return {
        success: true,
        voiceSessionId,
        providerId: cleanedSession.providerId ?? requestedProviderId,
        requestedProviderId,
        fallbackProviderId: null,
        health: {
          providerId: cleanedSession.providerId ?? requestedProviderId,
          status: cleanedSession.state === "degraded" ? "degraded" : "healthy",
          checkedAt: nowMs,
          reason:
            cleanedSession.reason ??
            "voice_session_already_active",
        },
        nativeBridge: buildVoiceRuntimeNativeBridgeMetadata({
          voiceSessionId,
          sessionState: "open",
          requestedProviderId,
          providerId: cleanedSession.providerId ?? requestedProviderId,
          fallbackProviderId: null,
          fallbackReason: cleanedSession.reason ?? "voice_session_already_active",
        }),
        fsmState: cleanedSession.state,
        idempotent: true,
      };
    }

    await emitVoiceSessionTransitionEvent(ctx, {
      runtimeContext,
      voiceSessionId,
      fromState: cleanedSession?.state,
      toState: "opening",
      reason: "voice_session_open_requested",
      providerId: cleanedSession?.providerId ?? requestedProviderId,
      requestedProviderId,
      fallbackProviderId: null,
    });

    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId,
      elevenLabsBinding: runtimeContext.elevenLabsBinding,
      fetchFn: fetch,
    });
    let session;
    try {
      session = await resolved.adapter.openSession({
        voiceSessionId,
        organizationId: String(runtimeContext.organizationId),
        interviewSessionId: String(runtimeContext.interviewSessionId),
        voiceId: voiceId ?? undefined,
      });
    } catch (error) {
      await emitVoiceSessionTransitionEvent(ctx, {
        runtimeContext,
        voiceSessionId,
        fromState: "opening",
        toState: "error",
        reason:
          normalizeString(error instanceof Error ? error.message : undefined) ??
          "voice_session_open_failed",
        providerId: resolved.adapter.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      });
      throw error;
    }
    const targetState = resolveOpenSessionTargetState({ health: resolved.health });
    await emitVoiceSessionTransitionEvent(ctx, {
      runtimeContext,
      voiceSessionId,
      fromState: "opening",
      toState: targetState,
      reason: "voice_session_open",
      providerId: session.providerId,
      requestedProviderId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
    });
    const nativeBridge = buildVoiceRuntimeNativeBridgeMetadata({
      voiceSessionId,
      sessionState: "open",
      requestedProviderId,
      providerId: session.providerId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      fallbackReason: resolved.health.reason ?? null,
    });

    if (resolved.fallbackFromProviderId) {
      await emitVoiceFailoverEvent(ctx, {
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        actorId: runtimeContext.actorId,
        voiceSessionId,
        requestedProviderId,
        fallbackProviderId: resolved.adapter.providerId,
        health: resolved.health,
        reason: resolved.health.reason ?? "provider_health_degraded",
      });
    }

    try {
      await recordVoiceUsage({
        ctx,
        runtimeContext,
        voiceSessionId,
        requestType: "voice_session",
        action: "voice_session_open",
        creditLedgerAction: "voice_session_open",
        providerId: session.providerId,
        success: true,
        usage: {
          nativeUsageUnit: "sessions",
          nativeUsageQuantity: 1,
          nativeTotalUnits: 1,
          nativeCostSource: "not_available",
        },
        metadata: {
          requestedProviderId,
          fallbackProviderId: resolved.fallbackFromProviderId ?? null,
          healthStatus: resolved.health.status,
          nativeBridge,
        },
      });
    } catch (error) {
      console.error("[VoiceRuntime] Failed to record voice session open usage:", error);
    }

    return {
      success: true,
      voiceSessionId,
      providerId: session.providerId,
      requestedProviderId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      health: resolved.health,
      nativeBridge,
      fsmState: targetState,
      idempotent: false,
    };
  },
});

export const closeVoiceSession = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    voiceSessionId: v.string(),
    activeProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const nowMs = Date.now();
    const latestSession = await resolveLatestVoiceRuntimeSessionSnapshot(ctx, {
      organizationId: runtimeContext.organizationId,
      interviewSessionId: runtimeContext.interviewSessionId,
      voiceSessionId: args.voiceSessionId,
    });
    const cleanedSession = await applyStaleSessionCleanupIfNeeded(ctx, {
      runtimeContext,
      snapshot: latestSession,
      nowMs,
    });
    if (cleanedSession?.state === "closed") {
      return {
        success: true,
        providerId: cleanedSession.providerId ?? "browser",
        health: {
          providerId: cleanedSession.providerId ?? "browser",
          status: "healthy",
          checkedAt: nowMs,
          reason:
            cleanedSession.reason ??
            "voice_session_already_closed",
        },
        nativeBridge: buildVoiceRuntimeNativeBridgeMetadata({
          voiceSessionId: args.voiceSessionId,
          sessionState: "closed",
          requestedProviderId:
            cleanedSession.requestedProviderId ?? "browser",
          providerId: cleanedSession.providerId ?? "browser",
          fallbackProviderId: null,
          fallbackReason: cleanedSession.reason ?? "voice_session_already_closed",
        }),
        fsmState: "closed" as const,
        idempotent: true,
      };
    }
    if (!cleanedSession) {
      const requestedProviderId = normalizeVoiceRuntimeProviderId(
        args.activeProviderId,
      );
      return {
        success: true,
        providerId: requestedProviderId,
        health: {
          providerId: requestedProviderId,
          status: "healthy",
          checkedAt: nowMs,
          reason: "voice_session_not_found_already_closed",
        },
        nativeBridge: buildVoiceRuntimeNativeBridgeMetadata({
          voiceSessionId: args.voiceSessionId,
          sessionState: "closed",
          requestedProviderId,
          providerId: requestedProviderId,
          fallbackProviderId: null,
          fallbackReason: "voice_session_not_found_already_closed",
        }),
        fsmState: "closed" as const,
        idempotent: true,
      };
    }

    const requestedProviderId = normalizeVoiceRuntimeProviderId(
      args.activeProviderId ??
        cleanedSession?.requestedProviderId ??
        cleanedSession?.providerId,
    );
    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId,
      elevenLabsBinding: runtimeContext.elevenLabsBinding,
      fetchFn: fetch,
    });
    const nativeBridge = buildVoiceRuntimeNativeBridgeMetadata({
      voiceSessionId: args.voiceSessionId,
      sessionState: "closed",
      requestedProviderId,
      providerId: resolved.adapter.providerId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      fallbackReason: normalizeString(args.reason) ?? resolved.health.reason ?? null,
    });
    await emitVoiceSessionTransitionEvent(ctx, {
      runtimeContext,
      voiceSessionId: args.voiceSessionId,
      fromState: cleanedSession?.state,
      toState: "closing",
      reason: normalizeString(args.reason) ?? "voice_session_close_requested",
      providerId: resolved.adapter.providerId,
      requestedProviderId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
    });
    try {
      await resolved.adapter.closeSession({
        voiceSessionId: args.voiceSessionId,
        reason: normalizeString(args.reason) ?? "voice_session_close",
      });
    } catch (error) {
      if (isAlreadyClosedRemoteError(error)) {
        await emitVoiceSessionTransitionEvent(ctx, {
          runtimeContext,
          voiceSessionId: args.voiceSessionId,
          fromState: "closing",
          toState: "closed",
          reason: "voice_session_close_remote_already_closed",
          providerId: resolved.adapter.providerId,
          requestedProviderId,
          fallbackProviderId: resolved.fallbackFromProviderId ?? null,
        });
        return {
          success: true,
          providerId: resolved.adapter.providerId,
          health: resolved.health,
          nativeBridge,
          fsmState: "closed" as const,
          idempotent: true,
        };
      }
      await emitVoiceSessionTransitionEvent(ctx, {
        runtimeContext,
        voiceSessionId: args.voiceSessionId,
        fromState: "closing",
        toState: "error",
        reason:
          normalizeString(error instanceof Error ? error.message : undefined) ??
          "voice_session_close_failed",
        providerId: resolved.adapter.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      });
      throw error;
    }
    await emitVoiceSessionTransitionEvent(ctx, {
      runtimeContext,
      voiceSessionId: args.voiceSessionId,
      fromState: "closing",
      toState: "closed",
      reason: normalizeString(args.reason) ?? "voice_session_close",
      providerId: resolved.adapter.providerId,
      requestedProviderId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
    });

    try {
      await recordVoiceUsage({
        ctx,
        runtimeContext,
        voiceSessionId: args.voiceSessionId,
        requestType: "voice_session",
        action: "voice_session_close",
        creditLedgerAction: "voice_session_close",
        providerId: resolved.adapter.providerId,
        success: true,
        usage: {
          nativeUsageUnit: "sessions",
          nativeUsageQuantity: 1,
          nativeTotalUnits: 1,
          nativeCostSource: "not_available",
        },
        metadata: {
          requestedProviderId,
          healthStatus: resolved.health.status,
          reason: normalizeString(args.reason) ?? "voice_session_close",
          nativeBridge,
        },
      });
    } catch (error) {
      console.error("[VoiceRuntime] Failed to record voice session close usage:", error);
    }

    return {
      success: true,
      providerId: resolved.adapter.providerId,
      health: resolved.health,
      nativeBridge,
      fsmState: "closed" as const,
      idempotent: false,
    };
  },
});

export const transcribeVoiceAudio = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    voiceSessionId: v.string(),
    audioBase64: v.string(),
    mimeType: v.optional(v.string()),
    requestedProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
    requestedVoiceId: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const requestedProviderId = normalizeVoiceRuntimeProviderId(
      args.requestedProviderId,
    );
    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId,
      elevenLabsBinding: runtimeContext.elevenLabsBinding,
      fetchFn: fetch,
    });
    const nativeBridge = buildVoiceRuntimeNativeBridgeMetadata({
      voiceSessionId: args.voiceSessionId,
      sessionState: "stt",
      requestedProviderId,
      providerId: resolved.adapter.providerId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      fallbackReason: resolved.health.reason ?? null,
    });
    if (resolved.fallbackFromProviderId) {
      await emitVoiceFailoverEvent(ctx, {
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        actorId: runtimeContext.actorId,
        voiceSessionId: args.voiceSessionId,
        requestedProviderId,
        fallbackProviderId: resolved.adapter.providerId,
        health: resolved.health,
        reason: resolved.health.reason ?? "provider_health_degraded",
      });
    }

    if (resolved.adapter.providerId === "browser") {
      try {
        await recordVoiceUsage({
          ctx,
          runtimeContext,
          voiceSessionId: args.voiceSessionId,
          requestType: "voice_stt",
          action: "voice_transcription",
          creditLedgerAction: "voice_transcription",
          providerId: resolved.adapter.providerId,
          success: false,
          errorMessage: "browser_runtime_requires_client_side_voice_processing",
          usage: null,
          metadata: {
            requestedProviderId,
            fallbackProviderId: resolved.fallbackFromProviderId ?? "browser",
            nativeBridge,
          },
        });
      } catch (error) {
        console.error("[VoiceRuntime] Failed to record browser STT usage:", error);
      }
      return {
        success: false,
        providerId: resolved.adapter.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? "browser",
        health: resolved.health,
        error: "browser_runtime_requires_client_side_voice_processing",
        nativeBridge,
      };
    }

    try {
      const transcript = await resolved.adapter.transcribe({
        voiceSessionId: args.voiceSessionId,
        audioBytes: decodeBase64Audio(args.audioBase64),
        mimeType: normalizeString(args.mimeType) ?? "audio/webm",
        language: normalizeString(args.language) ?? undefined,
      });

      await emitVoiceTrustEvent(ctx, {
        eventName: "trust.voice.adaptive_flow_decision.v1",
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        actorId: runtimeContext.actorId,
        mode: "runtime",
        additionalPayload: {
          voice_session_id: args.voiceSessionId,
          adaptive_phase_id: "stt_transport",
          adaptive_decision: "provider_transcription",
          adaptive_confidence: 1,
          consent_checkpoint_id: "cp0_capture_notice",
        },
      });

      try {
        const transcriptBridge = buildVoiceRuntimeNativeBridgeMetadata({
          voiceSessionId: args.voiceSessionId,
          sessionState: "stt",
          requestedProviderId,
          providerId: transcript.providerId,
          fallbackProviderId: resolved.fallbackFromProviderId ?? null,
          fallbackReason: resolved.health.reason ?? null,
        });
        await recordVoiceUsage({
          ctx,
          runtimeContext,
          voiceSessionId: args.voiceSessionId,
          requestType: "voice_stt",
          action: "voice_transcription",
          creditLedgerAction: "voice_transcription",
          providerId: transcript.providerId,
          success: true,
          usage: transcript.usage ?? null,
          metadata: {
            requestedProviderId,
            fallbackProviderId: resolved.fallbackFromProviderId ?? null,
            healthStatus: resolved.health.status,
            nativeBridge: transcriptBridge,
          },
        });
      } catch (recordError) {
        console.error("[VoiceRuntime] Failed to record successful STT usage:", recordError);
      }

      return {
        success: true,
        text: transcript.text,
        providerId: transcript.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? null,
        health: resolved.health,
        nativeBridge: buildVoiceRuntimeNativeBridgeMetadata({
          voiceSessionId: args.voiceSessionId,
          sessionState: "stt",
          requestedProviderId,
          providerId: transcript.providerId,
          fallbackProviderId: resolved.fallbackFromProviderId ?? null,
          fallbackReason: resolved.health.reason ?? null,
        }),
      };
    } catch (error) {
      const transcriptionError =
        error instanceof Error
          ? error.message
          : "Voice transcription failed.";
      try {
        await recordVoiceUsage({
          ctx,
          runtimeContext,
          voiceSessionId: args.voiceSessionId,
          requestType: "voice_stt",
          action: "voice_transcription",
          creditLedgerAction: "voice_transcription",
          providerId: resolved.adapter.providerId,
          success: false,
          errorMessage: transcriptionError,
          usage: null,
          metadata: {
            requestedProviderId,
            fallbackProviderId: resolved.fallbackFromProviderId ?? null,
            healthStatus: resolved.health.status,
            nativeBridge,
          },
        });
      } catch (recordError) {
        console.error("[VoiceRuntime] Failed to record failed STT usage:", recordError);
      }
      return {
        success: false,
        providerId: resolved.adapter.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? null,
        health: resolved.health,
        error: transcriptionError,
        nativeBridge,
      };
    }
  },
});

export const ingestVoiceTransportEnvelope = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    requestedProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
    envelope: voiceTransportEnvelopeValidator,
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const envelope = args.envelope as VoiceTransportEnvelopeContract;
    assertVoiceTransportEnvelope(envelope);

    if (
      normalizeString(envelope.interviewSessionId) !==
      String(runtimeContext.interviewSessionId)
    ) {
      throw new Error("Voice transport envelope interviewSessionId mismatch.");
    }

    const ingestCheckpointSnapshot = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceTransportIngestCheckpoint,
      {
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        voiceSessionId: envelope.voiceSessionId,
      },
    )) as VoiceTransportIngestCheckpointSnapshot;
    const acceptedReplaysBySequence = new Map<
      number,
      VoiceTransportAcceptedReplaySnapshot
    >();
    for (const [sequenceKey, replayEvents] of Object.entries(
      ingestCheckpointSnapshot.acceptedReplayEventsBySequence ?? {},
    )) {
      const sequence = Number(sequenceKey);
      if (!Number.isInteger(sequence) || sequence < 0) {
        continue;
      }
      acceptedReplaysBySequence.set(sequence, { relayEvents: replayEvents });
    }
    const ingestCheckpoint: VoiceTransportIngestCheckpointState = {
      acceptedSequences: new Set(ingestCheckpointSnapshot.acceptedSequences),
      acceptedReplaysBySequence,
      lastAcceptedSequence: ingestCheckpointSnapshot.lastAcceptedSequence,
    };
    const sequenceDecision = resolveVoiceTransportSequenceDecision({
      sequence: envelope.sequence,
      acceptedSequences: ingestCheckpoint.acceptedSequences,
      lastAcceptedSequence: ingestCheckpoint.lastAcceptedSequence,
    });
    const requestedProviderId = normalizeVoiceRuntimeProviderId(
      args.requestedProviderId,
    );

    let relayEvents: VoiceTransportEnvelopeContract[] = [];
    let persistedFinalTranscript = false;
    let relayErrorMessage: string | null = null;
    let cancellationAssistantMessageId: string | null = null;

    if (sequenceDecision.decision === "duplicate_replay") {
      relayEvents =
        ingestCheckpoint.acceptedReplaysBySequence.get(envelope.sequence)?.relayEvents ??
        [
          buildVoiceTransportErrorEnvelope({
            sourceEnvelope: envelope,
            code: "vt_sequence_replay_detected",
            message:
              "Voice transport envelope sequence replay detected; idempotent replay skipped.",
            retryable: true,
          }),
        ];
    } else if (sequenceDecision.decision === "gap_detected") {
      relayEvents = [
        buildVoiceTransportErrorEnvelope({
          sourceEnvelope: envelope,
          code: "vt_sequence_gap_detected",
          message: `Voice transport sequence gap detected (expected ${sequenceDecision.expectedSequence}, received ${envelope.sequence}).`,
          retryable: true,
        }),
      ];
    } else {
      if (envelope.eventType === "audio_chunk") {
        const resolved = await resolveVoiceRuntimeAdapter({
          requestedProviderId,
          elevenLabsBinding: runtimeContext.elevenLabsBinding,
          fetchFn: fetch,
        });
        if (resolved.adapter.providerId === "browser") {
          const browserTranscriptHint = resolveBrowserFallbackTranscriptText({
            eventType: envelope.eventType,
            transcriptText: envelope.transcriptText,
          });
          if (browserTranscriptHint) {
            relayEvents = [
              {
                contractVersion: VOICE_TRANSPORT_ENVELOPE_CONTRACT_VERSION,
                transportMode: envelope.transportMode,
                eventType: "partial_transcript",
                liveSessionId: envelope.liveSessionId,
                voiceSessionId: envelope.voiceSessionId,
                interviewSessionId: envelope.interviewSessionId,
                sequence: envelope.sequence,
                previousSequence: envelope.previousSequence,
                timestampMs: Date.now(),
                transcriptText: browserTranscriptHint,
              },
            ];
          } else {
            relayEvents = [
              buildVoiceTransportErrorEnvelope({
                sourceEnvelope: envelope,
                code: "vt_upstream_provider_error",
                message:
                  "Realtime PCM ingest relay cannot transcribe without a provider-backed runtime or client transcript hint.",
                retryable: true,
              }),
            ];
          }
        } else {
          try {
            const transcript = await resolved.adapter.transcribe({
              voiceSessionId: envelope.voiceSessionId,
              audioBytes: decodeBase64Audio(envelope.audioChunkBase64),
              mimeType: resolvePcmTranscriptionMimeType(envelope.pcm),
            });
            const transcriptText = normalizeString(transcript.text);
            if (transcriptText) {
              const partialEnvelope: VoiceTransportEnvelopeContract = {
                contractVersion: VOICE_TRANSPORT_ENVELOPE_CONTRACT_VERSION,
                transportMode: envelope.transportMode,
                eventType: "partial_transcript",
                liveSessionId: envelope.liveSessionId,
                voiceSessionId: envelope.voiceSessionId,
                interviewSessionId: envelope.interviewSessionId,
                sequence: envelope.sequence,
                previousSequence: envelope.previousSequence,
                timestampMs: Date.now(),
                transcriptText,
              };
              assertVoiceTransportEnvelope(partialEnvelope);
              relayEvents.push(partialEnvelope);
            }
          } catch (error) {
            relayErrorMessage =
              error instanceof Error
                ? error.message
                : "Voice realtime PCM transcription failed.";
            relayEvents.push(
              buildVoiceTransportErrorEnvelope({
                sourceEnvelope: envelope,
                code: "vt_upstream_provider_error",
                message: relayErrorMessage,
                retryable: true,
              }),
            );
          }
        }
      } else if (envelope.eventType === "partial_transcript") {
        relayEvents = [envelope];
      } else if (envelope.eventType === "final_transcript") {
        relayEvents = [envelope];
        const finalTranscriptText = normalizeString(envelope.transcriptText);
        if (finalTranscriptText) {
          await ctx.runMutation(
            generatedApi.internal.ai.agentSessions.addSessionMessage,
            {
              sessionId: runtimeContext.interviewSessionId,
              role: "user",
              content: finalTranscriptText,
            },
          );
          persistedFinalTranscript = true;
        }
      } else if (
        envelope.eventType === "assistant_audio_chunk" ||
        envelope.eventType === "assistant_audio_final" ||
        envelope.eventType === "barge_in"
      ) {
        const assistantRelayResult = resolveVoiceAssistantRelay({
          sourceEnvelope: envelope,
          relayEventsBySequence:
            ingestCheckpointSnapshot.acceptedReplayEventsBySequence ?? {},
        });
        relayEvents = assistantRelayResult.relayEvents;
        relayErrorMessage = assistantRelayResult.relayErrorMessage;
        cancellationAssistantMessageId =
          assistantRelayResult.cancellationAssistantMessageId;
      }
    }

    await emitVoiceTrustEvent(ctx, {
      eventName: "trust.voice.adaptive_flow_decision.v1",
      organizationId: runtimeContext.organizationId,
      interviewSessionId: runtimeContext.interviewSessionId,
      actorId: runtimeContext.actorId,
      mode: "runtime",
      additionalPayload: {
        voice_session_id: envelope.voiceSessionId,
        adaptive_phase_id: VOICE_TRANSPORT_WEBSOCKET_INGEST_PHASE_ID,
        adaptive_decision:
          sequenceDecision.decision === "accepted"
            ? "relay_accepted"
            : sequenceDecision.decision === "gap_detected"
              ? "relay_gap_detected"
              : "relay_duplicate_replay",
        adaptive_confidence: 1,
        consent_checkpoint_id: "cp0_capture_notice",
        decision_reason:
          relayErrorMessage ??
          (sequenceDecision.decision === "gap_detected"
            ? `expected_sequence_${sequenceDecision.expectedSequence}`
            : sequenceDecision.decision),
        voice_transport_sequence: envelope.sequence,
        voice_transport_event_type: envelope.eventType,
        voice_transport_ordering_decision: sequenceDecision.decision,
        voice_transport_expected_sequence: sequenceDecision.expectedSequence,
        voice_transport_relay_events: relayEvents,
        voice_transport_final_persisted: persistedFinalTranscript,
      },
    });

    let writeIdempotentReplay = sequenceDecision.decision === "duplicate_replay";
    if (sequenceDecision.decision === "accepted") {
      const checkpointCommit = await ctx.runMutation(
        generatedApi.internal.ai.voiceRuntime.commitVoiceTransportIngestCheckpoint,
        {
          organizationId: runtimeContext.organizationId,
          interviewSessionId: runtimeContext.interviewSessionId,
          voiceSessionId: envelope.voiceSessionId,
          acceptedSequence: envelope.sequence,
          relayEvents,
        },
      );
      const commitResult = checkpointCommit as {
        alreadyAccepted?: boolean;
        relayEvents?: VoiceTransportEnvelopeContract[];
      };
      if (commitResult.alreadyAccepted) {
        writeIdempotentReplay = true;
        relayEvents = Array.isArray(commitResult.relayEvents)
          ? commitResult.relayEvents
          : relayEvents;
      } else if (cancellationAssistantMessageId) {
        try {
          const resolved = await resolveVoiceRuntimeAdapter({
            requestedProviderId,
            elevenLabsBinding: runtimeContext.elevenLabsBinding,
            fetchFn: fetch,
          });
          await resolved.adapter.cancelSynthesis({
            voiceSessionId: envelope.voiceSessionId,
            assistantMessageId: cancellationAssistantMessageId,
          });
        } catch (error) {
          console.error("[VoiceRuntime] Voice synthesis cancel failed:", error);
        }
      }
    }

    return {
      success: sequenceDecision.decision !== "gap_detected",
      ordering: {
        decision: sequenceDecision.decision,
        expectedSequence: sequenceDecision.expectedSequence,
        lastAcceptedSequence: ingestCheckpoint.lastAcceptedSequence,
      },
      idempotent: writeIdempotentReplay,
      persistedFinalTranscript,
      relayEvents,
      nativeBridge: buildVoiceRuntimeNativeBridgeMetadata({
        voiceSessionId: envelope.voiceSessionId,
        sessionState: "stt",
        requestedProviderId,
        providerId: requestedProviderId,
      }),
    };
  },
});

export const synthesizeVoicePreview = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    voiceSessionId: v.string(),
    text: v.string(),
    requestedProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
    requestedVoiceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const requestedProviderId = normalizeVoiceRuntimeProviderId(
      args.requestedProviderId,
    );
    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId,
      elevenLabsBinding: runtimeContext.elevenLabsBinding,
      fetchFn: fetch,
    });
    const nativeBridge = buildVoiceRuntimeNativeBridgeMetadata({
      voiceSessionId: args.voiceSessionId,
      sessionState: "tts",
      requestedProviderId,
      providerId: resolved.adapter.providerId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      fallbackReason: resolved.health.reason ?? null,
    });
    if (resolved.fallbackFromProviderId) {
      await emitVoiceFailoverEvent(ctx, {
        organizationId: runtimeContext.organizationId,
        interviewSessionId: runtimeContext.interviewSessionId,
        actorId: runtimeContext.actorId,
        voiceSessionId: args.voiceSessionId,
        requestedProviderId,
        fallbackProviderId: resolved.adapter.providerId,
        health: resolved.health,
        reason: resolved.health.reason ?? "provider_health_degraded",
      });
    }

    try {
      const synthesis = await resolved.adapter.synthesize({
        voiceSessionId: args.voiceSessionId,
        text: args.text,
        voiceId:
          normalizeString(args.requestedVoiceId) ??
          runtimeContext.elevenLabsBinding?.defaultVoiceId,
      });

      try {
        const synthesisBridge = buildVoiceRuntimeNativeBridgeMetadata({
          voiceSessionId: args.voiceSessionId,
          sessionState: "tts",
          requestedProviderId,
          providerId: synthesis.providerId,
          fallbackProviderId: resolved.fallbackFromProviderId ?? null,
          fallbackReason: resolved.health.reason ?? null,
        });
        await recordVoiceUsage({
          ctx,
          runtimeContext,
          voiceSessionId: args.voiceSessionId,
          requestType: "voice_tts",
          action: "voice_synthesis",
          creditLedgerAction: "voice_synthesis",
          providerId: synthesis.providerId,
          success: true,
          usage: synthesis.usage ?? null,
          metadata: {
            requestedProviderId,
            fallbackProviderId: resolved.fallbackFromProviderId ?? null,
            healthStatus: resolved.health.status,
            nativeBridge: synthesisBridge,
          },
        });
      } catch (recordError) {
        console.error("[VoiceRuntime] Failed to record successful TTS usage:", recordError);
      }

      return {
        success: true,
        providerId: synthesis.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? null,
        health: resolved.health,
        mimeType: synthesis.mimeType,
        audioBase64: synthesis.audioBase64 ?? null,
        fallbackText: synthesis.fallbackText ?? null,
        nativeBridge: buildVoiceRuntimeNativeBridgeMetadata({
          voiceSessionId: args.voiceSessionId,
          sessionState: "tts",
          requestedProviderId,
          providerId: synthesis.providerId,
          fallbackProviderId: resolved.fallbackFromProviderId ?? null,
          fallbackReason: resolved.health.reason ?? null,
        }),
      };
    } catch (error) {
      const synthesisError =
        error instanceof Error
          ? error.message
          : "Voice synthesis failed.";
      try {
        await recordVoiceUsage({
          ctx,
          runtimeContext,
          voiceSessionId: args.voiceSessionId,
          requestType: "voice_tts",
          action: "voice_synthesis",
          creditLedgerAction: "voice_synthesis",
          providerId: resolved.adapter.providerId,
          success: false,
          errorMessage: synthesisError,
          usage: null,
          metadata: {
            requestedProviderId,
            fallbackProviderId: resolved.fallbackFromProviderId ?? null,
            healthStatus: resolved.health.status,
            nativeBridge,
          },
        });
      } catch (recordError) {
        console.error("[VoiceRuntime] Failed to record failed TTS usage:", recordError);
      }
      return {
        success: false,
        providerId: resolved.adapter.providerId,
        requestedProviderId,
        fallbackProviderId: resolved.fallbackFromProviderId ?? null,
        health: resolved.health,
        error: synthesisError,
        nativeBridge,
      };
    }
  },
});

export const probeVoiceProviderHealth = action({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
    requestedProviderId: v.optional(
      v.union(v.literal("browser"), v.literal("elevenlabs")),
    ),
  },
  handler: async (ctx, args) => {
    const runtimeContext = (await ctx.runQuery(
      generatedApi.internal.ai.voiceRuntime.resolveVoiceRuntimeContext,
      {
        sessionId: args.sessionId,
        interviewSessionId: args.interviewSessionId,
      },
    )) as VoiceRuntimeContext;
    const requestedProviderId = normalizeVoiceRuntimeProviderId(
      args.requestedProviderId,
    );
    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId,
      elevenLabsBinding: runtimeContext.elevenLabsBinding,
      fetchFn: fetch,
    });
    const nativeBridge = buildVoiceRuntimeNativeBridgeMetadata({
      voiceSessionId: `probe:${args.interviewSessionId}`,
      sessionState: "probe",
      requestedProviderId,
      providerId: resolved.adapter.providerId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      fallbackReason: resolved.health.reason ?? null,
    });

    return {
      requestedProviderId,
      providerId: resolved.adapter.providerId,
      fallbackProviderId: resolved.fallbackFromProviderId ?? null,
      health: resolved.health,
      nativeBridge,
    };
  },
});
