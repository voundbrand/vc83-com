import { describe, expect, it } from "vitest";
import { resolveInboundVoiceRuntimeRequest } from "../../../convex/ai/agentExecution";

describe("agentExecution voice runtime request parsing", () => {
  it("returns null when voice runtime metadata is absent", () => {
    const result = resolveInboundVoiceRuntimeRequest({});
    expect(result).toBeNull();
  });

  it("parses inbound audio metadata and normalizes provider id", () => {
    const result = resolveInboundVoiceRuntimeRequest({
      voiceRuntime: {
        requestedProviderId: "elevenlabs",
        voiceSessionId: "voice-session-1",
        requestedVoiceId: "voice_abc",
        audioBase64: "dGVzdA==",
        mimeType: "audio/webm",
        language: "en",
      },
    });

    expect(result).toEqual({
      requestedProviderId: "elevenlabs",
      voiceSessionId: "voice-session-1",
      requestedVoiceId: "voice_abc",
      audioBase64: "dGVzdA==",
      mimeType: "audio/webm",
      language: "en",
      synthesizeResponse: false,
    });
  });

  it("supports synthesis-only requests without inbound audio", () => {
    const result = resolveInboundVoiceRuntimeRequest({
      voiceRuntime: {
        providerId: "elevenlabs",
        synthesizeResponse: true,
      },
    });

    expect(result?.requestedProviderId).toBe("elevenlabs");
    expect(result?.synthesizeResponse).toBe(true);
    expect(result?.audioBase64).toBeUndefined();
  });

  it("falls back to browser provider for unknown provider ids", () => {
    const result = resolveInboundVoiceRuntimeRequest({
      voiceRuntime: {
        requestedProviderId: "unknown-provider",
        synthesizeResponse: true,
      },
    });

    expect(result?.requestedProviderId).toBe("browser");
  });
});
