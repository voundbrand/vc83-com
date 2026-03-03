import { describe, expect, it } from "vitest";
import {
  createVoiceRuntimeTelemetryCollector,
  VOICE_RUNTIME_TELEMETRY_CONTRACT_VERSION as MOBILE_CONTRACT_VERSION,
} from "../../../apps/operator-mobile/src/lib/av/voiceTelemetry";
import {
  buildVoiceRuntimeTelemetryCorrelationKey,
  evaluateVoiceRuntimeCanaryBudget,
  listMissingVoiceRuntimeTelemetryCoverage,
  normalizeVoiceRuntimeTelemetryContract,
  VOICE_RUNTIME_CANARY_BUDGET_VERSION,
  VOICE_RUNTIME_TELEMETRY_CONTRACT_VERSION as TRUST_CONTRACT_VERSION,
} from "../../../convex/ai/trustTelemetry";

describe("realtime voice telemetry contract integration", () => {
  it("captures latency/interruption/reconnect/fallback/provider failure with session correlation IDs", () => {
    const collector = createVoiceRuntimeTelemetryCollector({
      liveSessionId: "mobile_live_orv_011",
      voiceSessionId: "voice_orv_011",
      interviewSessionId: "interview_orv_011",
    });

    collector.record({
      eventType: "latency_checkpoint",
      stage: "session_open",
      latencyMs: 182,
      targetMs: 1000,
      transportMode: "websocket",
      providerId: "browser",
    }, 1_710_000_100_000);
    collector.record({
      eventType: "interruption",
      source: "remote_barge_in",
      reasonCode: "barge_in",
      transportMode: "websocket",
    }, 1_710_000_100_050);
    collector.record({
      eventType: "reconnect",
      phase: "succeeded",
      attempt: 1,
      latencyMs: 640,
      reasonCode: "continuity_reconnect_requested",
      transportMode: "websocket",
    }, 1_710_000_100_100);
    collector.record({
      eventType: "fallback_transition",
      fromTransport: "webrtc",
      toTransport: "websocket",
      reasonCode: "webrtc_not_implemented",
    }, 1_710_000_100_120);
    collector.record({
      eventType: "provider_failure",
      providerId: "elevenlabs",
      fallbackProviderId: "browser",
      reasonCode: "provider_health_degraded",
      recoverable: true,
    }, 1_710_000_100_160);

    const mobileContract = collector.snapshot();
    expect(mobileContract.contractVersion).toBe(MOBILE_CONTRACT_VERSION);
    expect(mobileContract.contractVersion).toBe(TRUST_CONTRACT_VERSION);
    expect(mobileContract.correlationKey).toBe("mobile_live_orv_011::voice_orv_011");
    expect(mobileContract.coverage).toEqual({
      latency_checkpoint: true,
      interruption: true,
      reconnect: true,
      fallback_transition: true,
      provider_failure: true,
    });

    const normalized = normalizeVoiceRuntimeTelemetryContract(mobileContract);
    expect(normalized).not.toBeNull();
    expect(normalized?.events).toHaveLength(5);
    expect(normalized?.liveSessionId).toBe("mobile_live_orv_011");
    expect(normalized?.voiceSessionId).toBe("voice_orv_011");
    expect(normalized?.correlationKey).toBe(
      buildVoiceRuntimeTelemetryCorrelationKey({
        liveSessionId: "mobile_live_orv_011",
        voiceSessionId: "voice_orv_011",
      }),
    );
    expect(listMissingVoiceRuntimeTelemetryCoverage(normalized!)).toEqual([]);
  });

  it("rejects malformed telemetry and mismatched event-level correlation IDs", () => {
    expect(normalizeVoiceRuntimeTelemetryContract(null)).toBeNull();
    expect(
      normalizeVoiceRuntimeTelemetryContract({
        contractVersion: TRUST_CONTRACT_VERSION,
        liveSessionId: "live_a",
        voiceSessionId: "",
        events: [],
      }),
    ).toBeNull();

    const normalized = normalizeVoiceRuntimeTelemetryContract({
      contractVersion: TRUST_CONTRACT_VERSION,
      liveSessionId: "live_a",
      voiceSessionId: "voice_a",
      eventCount: 2,
      events: [
        {
          eventId: "latency:0",
          eventType: "latency_checkpoint",
          occurredAtMs: 1_710_000_200_000,
          liveSessionId: "live_other",
          voiceSessionId: "voice_a",
          payload: { latencyMs: 240 },
        },
        {
          eventId: "fallback:1",
          eventType: "fallback_transition",
          occurredAtMs: 1_710_000_200_010,
          liveSessionId: "live_a",
          voiceSessionId: "voice_a",
          payload: {
            fromTransport: "websocket",
            toTransport: "chunked_fallback",
            reasonCode: "websocket_closed",
          },
        },
      ],
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.events).toHaveLength(1);
    expect(normalized?.events[0]?.eventType).toBe("fallback_transition");
    expect(listMissingVoiceRuntimeTelemetryCoverage(normalized!)).toEqual([
      "latency_checkpoint",
      "interruption",
      "reconnect",
      "provider_failure",
    ]);
  });

  it("produces deterministic PROMOTE/HOLD/ROLLBACK canary decisions from telemetry budgets", () => {
    const promoteCollector = createVoiceRuntimeTelemetryCollector({
      liveSessionId: "mobile_live_orv_019_promote",
      voiceSessionId: "voice_orv_019_promote",
    });
    promoteCollector.record(
      {
        eventType: "latency_checkpoint",
        stage: "session_open",
        latencyMs: 180,
        targetMs: 1000,
      },
      1_710_000_300_000,
    );
    promoteCollector.record(
      {
        eventType: "interruption",
        source: "local_barge_in",
        reasonCode: "barge_in",
      },
      1_710_000_300_020,
    );
    promoteCollector.record(
      {
        eventType: "reconnect",
        phase: "succeeded",
        attempt: 1,
        latencyMs: 320,
      },
      1_710_000_300_040,
    );
    promoteCollector.record(
      {
        eventType: "fallback_transition",
        fromTransport: "webrtc",
        toTransport: "websocket",
        reasonCode: "webrtc_not_implemented",
      },
      1_710_000_300_060,
    );
    promoteCollector.record(
      {
        eventType: "provider_failure",
        providerId: "elevenlabs",
        fallbackProviderId: "browser",
        reasonCode: "provider_health_degraded",
        recoverable: true,
      },
      1_710_000_300_080,
    );
    const promoteContract = normalizeVoiceRuntimeTelemetryContract(promoteCollector.snapshot());
    expect(promoteContract).not.toBeNull();
    const promoteDecision = evaluateVoiceRuntimeCanaryBudget({
      contract: promoteContract!,
      windowStartedAtMs: 1_710_000_300_000,
      windowEndedAtMs: 1_710_000_300_200,
      thresholds: {
        maxLatencyBreaches: 1,
        maxFallbackTransitions: 1,
        maxProviderFailures: 1,
        maxReconnectEvents: 2,
        maxInterruptionEvents: 2,
      },
    });
    expect(promoteDecision.contractVersion).toBe(VOICE_RUNTIME_CANARY_BUDGET_VERSION);
    expect(promoteDecision.decision).toBe("PROMOTE");
    expect(promoteDecision.reasons).toEqual([]);

    const holdDecision = evaluateVoiceRuntimeCanaryBudget({
      contract: promoteContract!,
      windowStartedAtMs: 1_710_000_300_000,
      windowEndedAtMs: 1_710_000_300_200,
      thresholds: {
        maxLatencyBreaches: 1,
        maxFallbackTransitions: 1,
        maxProviderFailures: 1,
        maxReconnectEvents: 0,
        maxInterruptionEvents: 0,
      },
    });
    expect(holdDecision.decision).toBe("HOLD");
    expect(holdDecision.reasons).toEqual(
      expect.arrayContaining([
        "reconnect_limit_exceeded",
        "interruption_limit_exceeded",
      ]),
    );

    const rollbackCollector = createVoiceRuntimeTelemetryCollector({
      liveSessionId: "mobile_live_orv_019_rollback",
      voiceSessionId: "voice_orv_019_rollback",
    });
    rollbackCollector.record(
      {
        eventType: "latency_checkpoint",
        stage: "tts",
        latencyMs: 2100,
        targetMs: 1000,
      },
      1_710_000_301_000,
    );
    rollbackCollector.record(
      {
        eventType: "fallback_transition",
        fromTransport: "websocket",
        toTransport: "chunked_fallback",
        reasonCode: "websocket_closed",
      },
      1_710_000_301_020,
    );
    rollbackCollector.record(
      {
        eventType: "provider_failure",
        providerId: "elevenlabs",
        fallbackProviderId: "browser",
        reasonCode: "provider_timeout",
        recoverable: false,
      },
      1_710_000_301_040,
    );
    const rollbackContract = normalizeVoiceRuntimeTelemetryContract(rollbackCollector.snapshot());
    expect(rollbackContract).not.toBeNull();
    const rollbackDecision = evaluateVoiceRuntimeCanaryBudget({
      contract: rollbackContract!,
      windowStartedAtMs: 1_710_000_301_000,
      windowEndedAtMs: 1_710_000_301_200,
      thresholds: {
        maxLatencyBreaches: 0,
        maxFallbackTransitions: 0,
        maxProviderFailures: 0,
        maxReconnectEvents: 2,
        maxInterruptionEvents: 2,
        requiredCoverage: [
          "latency_checkpoint",
          "fallback_transition",
          "provider_failure",
        ],
      },
    });
    expect(rollbackDecision.decision).toBe("ROLLBACK");
    expect(rollbackDecision.reasons).toEqual(
      expect.arrayContaining([
        "latency_breach_limit_exceeded",
        "fallback_transition_limit_exceeded",
        "provider_failure_limit_exceeded",
      ]),
    );
  });
});
