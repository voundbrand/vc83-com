import { describe, expect, it } from "vitest";
import { classifyVoiceProviderFailureReason } from "../../../convex/ai/trustTelemetry";

describe("voice provider failure taxonomy", () => {
  it("maps connectivity/websocket failures to transport taxonomy", () => {
    const classification = classifyVoiceProviderFailureReason("websocket_connect_failed");
    expect(classification).toEqual({
      reasonCode: "transport_connectivity_failure",
      healthStatus: "degraded",
    });
  });

  it("maps degraded health failures", () => {
    const classification = classifyVoiceProviderFailureReason("provider_health_degraded");
    expect(classification).toEqual({
      reasonCode: "provider_health_degraded",
      healthStatus: "degraded",
    });
  });

  it("maps synthesis and transcription failures", () => {
    expect(classifyVoiceProviderFailureReason("synthesis_failed")).toEqual({
      reasonCode: "synthesis_failure",
      healthStatus: "degraded",
    });
    expect(classifyVoiceProviderFailureReason("stream_frame_transcription_failed")).toEqual({
      reasonCode: "transcription_failure",
      healthStatus: "degraded",
    });
  });

  it("falls back to unknown taxonomy for unrecognized reason codes", () => {
    const classification = classifyVoiceProviderFailureReason("mystery_error");
    expect(classification).toEqual({
      reasonCode: "runtime_unknown_failure",
      healthStatus: "unknown",
    });
  });
});
