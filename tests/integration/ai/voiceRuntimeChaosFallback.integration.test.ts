import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { buildVoiceRuntimeTelemetryTrustEventPayloads } from "../../../convex/ai/chat";
import {
  buildVoiceRuntimeTelemetryCorrelationKey,
  normalizeVoiceRuntimeTelemetryContract,
} from "../../../convex/ai/trustTelemetry";
import { resolveVoiceTransportSequenceDecision } from "../../../convex/ai/voiceRuntime";
import {
  createVoiceRuntimeTelemetryCollector,
} from "../../../apps/operator-mobile/src/lib/av/voiceTelemetry";
import {
  downgradeVoiceTransportSelection,
  resolveVoiceTransportSelection,
} from "../../../apps/operator-mobile/src/lib/voice/transport";
import { createVoiceRuntimeChaosHarness } from "../../../apps/operator-mobile/src/lib/voice/chaosHarness";

describe("voice runtime chaos fallback matrix", () => {
  it("validates drop/reorder/jitter/timeout chaos paths while preserving session correlation invariants", () => {
    const liveSessionId = "mobile_live_orv_012_chaos";
    const voiceSessionId = "voice_orv_012_chaos";
    const interviewSessionId = "interview_orv_012_chaos";

    const collector = createVoiceRuntimeTelemetryCollector({
      liveSessionId,
      voiceSessionId,
      interviewSessionId,
    });

    const baseSelection = resolveVoiceTransportSelection({
      configuredMode: "websocket",
      websocketUrl: "wss://voice.example.test/ws",
      isWebRtcAvailable: false,
    });
    expect(baseSelection.effectiveMode).toBe("websocket");

    const droppedTransportSelection = downgradeVoiceTransportSelection({
      current: baseSelection,
      websocketUrl: "wss://voice.example.test/ws",
      reason: "websocket_closed",
    });
    expect(droppedTransportSelection.effectiveMode).toBe("chunked_fallback");
    expect(droppedTransportSelection.fallbackReason).toBe("websocket_closed");
    collector.record({
      eventType: "fallback_transition",
      fromTransport: "websocket",
      toTransport: "chunked_fallback",
      reasonCode: "websocket_closed",
    }, 1_710_010_000_000);
    collector.record({
      eventType: "fallback_transition",
      fromTransport: "chunked_fallback",
      toTransport: "chunked_fallback",
      reasonCode: "relay_server_heartbeat_sequence_gap",
    }, 1_710_010_000_020);

    const acceptedSequences = new Set<number>([0, 1, 2]);
    expect(
      resolveVoiceTransportSequenceDecision({
        sequence: 1,
        acceptedSequences,
        lastAcceptedSequence: 2,
      }).decision,
    ).toBe("duplicate_replay");
    expect(
      resolveVoiceTransportSequenceDecision({
        sequence: 5,
        acceptedSequences,
        lastAcceptedSequence: 2,
      }),
    ).toEqual({
      decision: "gap_detected",
      expectedSequence: 3,
    });

    const chaosHarness = createVoiceRuntimeChaosHarness<{ sequence: number }>({
      enabled: true,
      dropEveryN: 3,
      reorderWindowSize: 2,
      jitterMs: 45,
      forceProviderTimeout: true,
    });
    expect(chaosHarness.planOutbound({ sequence: 0, payload: { sequence: 0 } })).toEqual([]);
    expect(chaosHarness.planOutbound({ sequence: 1, payload: { sequence: 1 } })).toEqual([
      { payload: { sequence: 1 }, delayMs: 45 },
      { payload: { sequence: 0 }, delayMs: 45 },
    ]);
    expect(chaosHarness.planOutbound({ sequence: 2, payload: { sequence: 2 } })).toEqual([]);
    expect(chaosHarness.shouldForceProviderTimeout()).toBe(true);

    collector.record({
      eventType: "latency_checkpoint",
      stage: "stream_frame_roundtrip",
      latencyMs: 1_200,
      targetMs: 600,
      breached: true,
      transportMode: "chunked_fallback",
      providerId: "elevenlabs",
    }, 1_710_010_000_100);

    collector.record({
      eventType: "provider_failure",
      providerId: "elevenlabs",
      fallbackProviderId: "browser",
      reasonCode: "provider_timeout",
      recoverable: true,
    }, 1_710_010_000_200);

    const telemetryContract = collector.snapshot();
    expect(telemetryContract.correlationKey).toBe(
      buildVoiceRuntimeTelemetryCorrelationKey({
        liveSessionId,
        voiceSessionId,
      }),
    );
    expect(telemetryContract.events).toHaveLength(4);
    expect(telemetryContract.coverage.fallback_transition).toBe(true);
    expect(telemetryContract.coverage.latency_checkpoint).toBe(true);
    expect(telemetryContract.coverage.provider_failure).toBe(true);

    const normalized = normalizeVoiceRuntimeTelemetryContract(telemetryContract);
    expect(normalized).not.toBeNull();
    expect(normalized?.events.every((event) =>
      event.liveSessionId === liveSessionId && event.voiceSessionId === voiceSessionId
    )).toBe(true);

    const trustEvents = buildVoiceRuntimeTelemetryTrustEventPayloads({
      organizationId: "org_orv_012" as Id<"organizations">,
      userId: "user_orv_012" as Id<"users">,
      sessionId: "session_orv_012" as Id<"agentSessions">,
      channel: "mobile",
      liveSessionId,
      voiceRuntime: {
        providerId: "elevenlabs",
      },
      transportRuntime: {
        voiceTransportRuntime: {
          telemetry: telemetryContract,
        },
      },
    });

    expect(trustEvents).toHaveLength(4);
    expect(trustEvents.map((event) => event.eventName)).toEqual([
      "trust.voice.adaptive_flow_decision.v1",
      "trust.voice.adaptive_flow_decision.v1",
      "trust.voice.adaptive_flow_decision.v1",
      "trust.voice.runtime_failover_triggered.v1",
    ]);

    const fallbackDecision = trustEvents.find((event) =>
      event.payload.adaptive_phase_id === "fallback:websocket->chunked_fallback"
    );
    expect(fallbackDecision?.payload.adaptive_decision).toBe("fallback:websocket_closed");

    const jitterBreachDecision = trustEvents.find((event) =>
      event.payload.adaptive_phase_id === "latency:stream_frame_roundtrip"
    );
    expect(jitterBreachDecision?.payload.adaptive_decision).toBe("latency_budget_breached");

    const heartbeatGapDecision = trustEvents.find((event) =>
      event.payload.adaptive_phase_id === "fallback:chunked_fallback->chunked_fallback"
    );
    expect(heartbeatGapDecision?.payload.adaptive_decision).toBe(
      "fallback:relay_server_heartbeat_sequence_gap"
    );

    const timeoutFailover = trustEvents.find(
      (event) => event.eventName === "trust.voice.runtime_failover_triggered.v1",
    );
    expect(timeoutFailover?.payload.voice_failover_reason).toBe("provider_timeout");
    expect(timeoutFailover?.payload.voice_provider_health_status).toBe("degraded");
    expect(timeoutFailover?.payload.voice_session_id).toBe(voiceSessionId);
  });
});
