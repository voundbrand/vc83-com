import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { buildVoiceRuntimeTelemetryTrustEventPayloads } from "../../../convex/ai/chat";
import { validateTrustEventPayload } from "../../../convex/ai/trustEvents";

describe("voice runtime telemetry trust ingestion integration", () => {
  it("maps telemetry contract events to persisted trust.voice event payloads", () => {
    const events = buildVoiceRuntimeTelemetryTrustEventPayloads({
      organizationId: "org_voice_ingest_1" as Id<"organizations">,
      userId: "user_voice_ingest_1" as Id<"users">,
      sessionId: "session_voice_ingest_1" as Id<"agentSessions">,
      channel: "desktop",
      liveSessionId: "mobile_live_ingest_1",
      voiceRuntime: {
        providerId: "elevenlabs",
      },
      transportRuntime: {
        voiceTransportRuntime: {
          telemetry: {
            contractVersion: "voice_runtime_telemetry_v1",
            liveSessionId: "mobile_live_ingest_1",
            voiceSessionId: "voice_ingest_1",
            interviewSessionId: "interview_ingest_1",
            eventCount: 3,
            events: [
              {
                eventId: "evt_latency_1",
                eventType: "latency_checkpoint",
                occurredAtMs: 1_710_001_000_000,
                liveSessionId: "mobile_live_ingest_1",
                voiceSessionId: "voice_ingest_1",
                payload: {
                  stage: "transcription_roundtrip",
                  latencyMs: 520,
                  targetMs: 900,
                  breached: false,
                },
              },
              {
                eventId: "evt_fallback_2",
                eventType: "fallback_transition",
                occurredAtMs: 1_710_001_000_100,
                liveSessionId: "mobile_live_ingest_1",
                voiceSessionId: "voice_ingest_1",
                payload: {
                  fromTransport: "websocket",
                  toTransport: "chunked_fallback",
                  reasonCode: "websocket_closed",
                },
              },
              {
                eventId: "evt_provider_3",
                eventType: "provider_failure",
                occurredAtMs: 1_710_001_000_200,
                liveSessionId: "mobile_live_ingest_1",
                voiceSessionId: "voice_ingest_1",
                payload: {
                  providerId: "elevenlabs",
                  fallbackProviderId: "browser",
                  reasonCode: "provider_health_degraded",
                },
              },
            ],
          },
        },
      },
    });

    expect(events).toHaveLength(3);
    expect(events.map((event) => event.eventName)).toEqual([
      "trust.voice.adaptive_flow_decision.v1",
      "trust.voice.adaptive_flow_decision.v1",
      "trust.voice.runtime_failover_triggered.v1",
    ]);

    for (const event of events) {
      const validation = validateTrustEventPayload(event.eventName, event.payload);
      expect(validation.ok).toBe(true);
      expect(validation.errors).toEqual([]);
    }
  });
});
