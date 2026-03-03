export const VOICE_RUNTIME_TELEMETRY_CONTRACT_VERSION = 'voice_runtime_telemetry_v1' as const;

export const VOICE_RUNTIME_TELEMETRY_EVENT_TYPE_VALUES = [
  'latency_checkpoint',
  'interruption',
  'reconnect',
  'fallback_transition',
  'provider_failure',
] as const;

export type VoiceRuntimeTelemetryEventType =
  (typeof VOICE_RUNTIME_TELEMETRY_EVENT_TYPE_VALUES)[number];

export type VoiceRuntimeTelemetryCorrelation = {
  liveSessionId: string;
  voiceSessionId: string;
  interviewSessionId?: string;
};

export type VoiceRuntimeLatencyCheckpointEvent = {
  eventType: 'latency_checkpoint';
  stage:
    | 'session_open'
    | 'transcription_roundtrip'
    | 'stream_frame_roundtrip'
    | 'synthesis_roundtrip'
    | 'reconnect_roundtrip';
  latencyMs: number;
  targetMs?: number;
  breached?: boolean;
  transportMode?: string;
  providerId?: string;
};

export type VoiceRuntimeInterruptionEvent = {
  eventType: 'interruption';
  source: 'local_playback_stop' | 'remote_barge_in';
  reasonCode: string;
  transportMode?: string;
};

export type VoiceRuntimeReconnectEvent = {
  eventType: 'reconnect';
  phase: 'attempt' | 'succeeded' | 'failed';
  attempt: number;
  latencyMs?: number;
  reasonCode?: string;
  transportMode?: string;
};

export type VoiceRuntimeFallbackTransitionEvent = {
  eventType: 'fallback_transition';
  fromTransport: string;
  toTransport: string;
  reasonCode: string;
};

export type VoiceRuntimeProviderFailureEvent = {
  eventType: 'provider_failure';
  providerId?: string;
  fallbackProviderId?: string;
  reasonCode: string;
  recoverable?: boolean;
};

export type VoiceRuntimeTelemetryEventInput =
  | VoiceRuntimeLatencyCheckpointEvent
  | VoiceRuntimeInterruptionEvent
  | VoiceRuntimeReconnectEvent
  | VoiceRuntimeFallbackTransitionEvent
  | VoiceRuntimeProviderFailureEvent;

export type VoiceRuntimeTelemetryEvent = {
  eventId: string;
  eventType: VoiceRuntimeTelemetryEventType;
  occurredAtMs: number;
  liveSessionId: string;
  voiceSessionId: string;
  interviewSessionId?: string;
  payload: Record<string, unknown>;
};

export type VoiceRuntimeTelemetryCoverage = Record<VoiceRuntimeTelemetryEventType, boolean>;

export type VoiceRuntimeTelemetryContract = {
  contractVersion: typeof VOICE_RUNTIME_TELEMETRY_CONTRACT_VERSION;
  liveSessionId: string;
  voiceSessionId: string;
  interviewSessionId?: string;
  correlationKey: string;
  eventCount: number;
  coverage: VoiceRuntimeTelemetryCoverage;
  events: VoiceRuntimeTelemetryEvent[];
};

export type VoiceRuntimeTelemetryCollector = {
  record: (event: VoiceRuntimeTelemetryEventInput, occurredAtMs?: number) => void;
  snapshot: (maxEvents?: number) => VoiceRuntimeTelemetryContract;
  clear: () => void;
};

function normalizeRequiredToken(value: string | undefined, fieldName: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    throw new Error(`Voice runtime telemetry requires ${fieldName}.`);
  }
  return normalized;
}

function normalizeOptionalToken(value: string | undefined): string | undefined {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || undefined;
}

function normalizeTimestamp(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return Date.now();
  }
  return Math.floor(value);
}

function normalizeNonNegativeNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  if (value < 0) {
    return 0;
  }
  return Math.floor(value);
}

function buildCorrelationKey(correlation: VoiceRuntimeTelemetryCorrelation): string {
  return `${correlation.liveSessionId}::${correlation.voiceSessionId}`;
}

function buildCoverage(events: VoiceRuntimeTelemetryEvent[]): VoiceRuntimeTelemetryCoverage {
  const coverage: VoiceRuntimeTelemetryCoverage = {
    latency_checkpoint: false,
    interruption: false,
    reconnect: false,
    fallback_transition: false,
    provider_failure: false,
  };
  for (const event of events) {
    coverage[event.eventType] = true;
  }
  return coverage;
}

function normalizeEventPayload(event: VoiceRuntimeTelemetryEventInput): Record<string, unknown> {
  switch (event.eventType) {
    case 'latency_checkpoint':
      return {
        stage: event.stage,
        latencyMs: normalizeNonNegativeNumber(event.latencyMs) ?? 0,
        targetMs: normalizeNonNegativeNumber(event.targetMs),
        breached:
          typeof event.breached === 'boolean'
            ? event.breached
            : normalizeNonNegativeNumber(event.targetMs) !== undefined
              ? (normalizeNonNegativeNumber(event.latencyMs) ?? 0)
                > (normalizeNonNegativeNumber(event.targetMs) ?? 0)
              : undefined,
        transportMode: normalizeOptionalToken(event.transportMode),
        providerId: normalizeOptionalToken(event.providerId),
      };
    case 'interruption':
      return {
        source: event.source,
        reasonCode: normalizeRequiredToken(event.reasonCode, 'reasonCode'),
        transportMode: normalizeOptionalToken(event.transportMode),
      };
    case 'reconnect':
      return {
        phase: event.phase,
        attempt: normalizeNonNegativeNumber(event.attempt) ?? 0,
        latencyMs: normalizeNonNegativeNumber(event.latencyMs),
        reasonCode: normalizeOptionalToken(event.reasonCode),
        transportMode: normalizeOptionalToken(event.transportMode),
      };
    case 'fallback_transition':
      return {
        fromTransport: normalizeRequiredToken(event.fromTransport, 'fromTransport'),
        toTransport: normalizeRequiredToken(event.toTransport, 'toTransport'),
        reasonCode: normalizeRequiredToken(event.reasonCode, 'reasonCode'),
      };
    case 'provider_failure':
      return {
        providerId: normalizeOptionalToken(event.providerId),
        fallbackProviderId: normalizeOptionalToken(event.fallbackProviderId),
        reasonCode: normalizeRequiredToken(event.reasonCode, 'reasonCode'),
        recoverable: event.recoverable === true,
      };
    default:
      return {};
  }
}

export function createVoiceRuntimeTelemetryCollector(
  correlationInput: VoiceRuntimeTelemetryCorrelation
): VoiceRuntimeTelemetryCollector {
  const correlation: VoiceRuntimeTelemetryCorrelation = {
    liveSessionId: normalizeRequiredToken(correlationInput.liveSessionId, 'liveSessionId'),
    voiceSessionId: normalizeRequiredToken(correlationInput.voiceSessionId, 'voiceSessionId'),
    interviewSessionId: normalizeOptionalToken(correlationInput.interviewSessionId),
  };
  const events: VoiceRuntimeTelemetryEvent[] = [];
  let sequence = 0;

  return {
    record(event, occurredAtMs) {
      const timestamp = normalizeTimestamp(occurredAtMs);
      events.push({
        eventId: `${event.eventType}:${sequence}:${timestamp}`,
        eventType: event.eventType,
        occurredAtMs: timestamp,
        liveSessionId: correlation.liveSessionId,
        voiceSessionId: correlation.voiceSessionId,
        interviewSessionId: correlation.interviewSessionId,
        payload: normalizeEventPayload(event),
      });
      sequence += 1;
    },
    snapshot(maxEvents = 64) {
      const boundedMax = Math.max(1, Math.floor(maxEvents));
      const boundedEvents = events.slice(-boundedMax);
      return {
        contractVersion: VOICE_RUNTIME_TELEMETRY_CONTRACT_VERSION,
        liveSessionId: correlation.liveSessionId,
        voiceSessionId: correlation.voiceSessionId,
        interviewSessionId: correlation.interviewSessionId,
        correlationKey: buildCorrelationKey(correlation),
        eventCount: events.length,
        coverage: buildCoverage(events),
        events: boundedEvents,
      };
    },
    clear() {
      events.length = 0;
      sequence = 0;
    },
  };
}
