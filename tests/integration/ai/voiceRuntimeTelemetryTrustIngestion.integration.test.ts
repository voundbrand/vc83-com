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

  it("persists turn-time vision attach/degrade telemetry into trust.voice adaptive payloads", () => {
    const events = buildVoiceRuntimeTelemetryTrustEventPayloads({
      organizationId: "org_voice_ingest_2" as Id<"organizations">,
      userId: "user_voice_ingest_2" as Id<"users">,
      sessionId: "session_voice_ingest_2" as Id<"agentSessions">,
      channel: "desktop",
      voiceRuntime: {
        providerId: "elevenlabs",
        voiceSessionId: "voice_ingest_vision_2",
        visionFrameResolution: {
          status: "attached",
          maxFrameAgeMs: 12_000,
          frame: {
            mimeType: "image/jpeg",
            sizeBytes: 1024,
          },
          telemetry: {
            contractVersion: "web_chat_vision_attachment_telemetry_v1",
            reason: "attached",
            source: "retention",
            freshnessBucket: "age_0_2s",
            frameAgeMs: 850,
            maxFrameAgeMs: 12_000,
          },
        },
      },
    });

    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event?.eventName).toBe("trust.voice.adaptive_flow_decision.v1");
    expect(event?.payload.adaptive_phase_id).toBe("vision_turn_attachment");
    expect(event?.payload.adaptive_decision).toBe(
      "vision_frame_dropped_storage_url_missing",
    );
    expect(event?.payload.vision_frame_status).toBe("degraded");
    expect(event?.payload.vision_frame_reason).toBe(
      "vision_frame_dropped_storage_url_missing",
    );
    expect(event?.payload.vision_frame_attached).toBe(false);
    expect(event?.payload.vision_frame_source).toBe("retention");

    const validation = validateTrustEventPayload(event!.eventName, event!.payload);
    expect(validation.ok).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("persists attached turn-time vision telemetry when an attachable frame URL is present", () => {
    const events = buildVoiceRuntimeTelemetryTrustEventPayloads({
      organizationId: "org_voice_ingest_3" as Id<"organizations">,
      userId: "user_voice_ingest_3" as Id<"users">,
      sessionId: "session_voice_ingest_3" as Id<"agentSessions">,
      channel: "desktop",
      voiceRuntime: {
        providerId: "elevenlabs",
        voiceSessionId: "voice_ingest_vision_3",
        visionFrameResolution: {
          status: "attached",
          maxFrameAgeMs: 12_000,
          frame: {
            storageUrl: "https://cdn.example.com/frame.jpg",
            mimeType: "image/jpeg",
            sizeBytes: 1024,
          },
          telemetry: {
            contractVersion: "web_chat_vision_attachment_telemetry_v1",
            reason: "attached",
            source: "retention",
            freshnessBucket: "age_0_2s",
            frameAgeMs: 450,
            maxFrameAgeMs: 12_000,
          },
        },
      },
    });

    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event?.eventName).toBe("trust.voice.adaptive_flow_decision.v1");
    expect(event?.payload.adaptive_phase_id).toBe("vision_turn_attachment");
    expect(event?.payload.adaptive_decision).toBe("vision_frame_attached");
    expect(event?.payload.vision_frame_status).toBe("attached");
    expect(event?.payload.vision_frame_reason).toBe("attached");
    expect(event?.payload.vision_frame_attached).toBe(true);
    expect(event?.payload.vision_frame_source).toBe("retention");
    expect(event?.payload.vision_frame_age_ms).toBe(450);
    expect(event?.payload.vision_frame_max_age_ms).toBe(12_000);

    const validation = validateTrustEventPayload(event!.eventName, event!.payload);
    expect(validation.ok).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("recovers voice session id from telemetry correlation key when upstream omits voiceSessionId", () => {
    const events = buildVoiceRuntimeTelemetryTrustEventPayloads({
      organizationId: "org_voice_ingest_4" as Id<"organizations">,
      userId: "user_voice_ingest_4" as Id<"users">,
      sessionId: "session_voice_ingest_4" as Id<"agentSessions">,
      channel: "mobile",
      liveSessionId: "mobile_live_ingest_4",
      voiceRuntime: {
        providerId: "browser",
        visionFrameResolution: {
          status: "degraded",
          reason: "vision_frame_missing",
          telemetry: {
            contractVersion: "web_chat_vision_attachment_telemetry_v1",
            reason: "vision_frame_missing",
            source: "buffer",
            freshnessBucket: "missing",
          },
        },
      },
      transportRuntime: {
        voiceTransportRuntime: {
          telemetry: {
            contractVersion: "voice_runtime_telemetry_v1",
            liveSessionId: "mobile_live_ingest_4",
            correlationKey: "mobile_live_ingest_4::voice_corr_ingest_4",
            eventCount: 0,
            events: [],
          },
        },
      },
    });

    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event?.eventName).toBe("trust.voice.adaptive_flow_decision.v1");
    expect(event?.payload.voice_session_id).toBe("voice_corr_ingest_4");

    const validation = validateTrustEventPayload(event!.eventName, event!.payload);
    expect(validation.ok).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("derives a deterministic voice session id from live session when no voice session fields are provided", () => {
    const events = buildVoiceRuntimeTelemetryTrustEventPayloads({
      organizationId: "org_voice_ingest_5" as Id<"organizations">,
      userId: "user_voice_ingest_5" as Id<"users">,
      sessionId: "session_voice_ingest_5" as Id<"agentSessions">,
      channel: "mobile",
      liveSessionId: "mobile_live_ingest_5",
      voiceRuntime: {
        providerId: "browser",
        visionFrameResolution: {
          status: "degraded",
          reason: "vision_frame_missing",
          telemetry: {
            contractVersion: "web_chat_vision_attachment_telemetry_v1",
            reason: "vision_frame_missing",
            source: "buffer",
            freshnessBucket: "missing",
          },
        },
      },
    });

    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event?.eventName).toBe("trust.voice.adaptive_flow_decision.v1");
    expect(event?.payload.voice_session_id).toBe(
      "derived_from_live:mobile_live_ingest_5",
    );
    expect(event?.payload.adaptive_phase_id).toBe("vision_turn_attachment");

    const validation = validateTrustEventPayload(event!.eventName, event!.payload);
    expect(validation.ok).toBe(true);
    expect(validation.errors).toEqual([]);
  });
});
