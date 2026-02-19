import { describe, expect, it, vi } from "vitest";
import {
  createElevenLabsVoiceRuntimeAdapter,
  resolveVoiceRuntimeAdapter,
} from "../../../convex/ai/voiceRuntimeAdapter";

describe("voiceRuntimeAdapter", () => {
  it("defaults to browser runtime when no provider is requested", async () => {
    const resolved = await resolveVoiceRuntimeAdapter({});

    expect(resolved.requestedProviderId).toBe("browser");
    expect(resolved.adapter.providerId).toBe("browser");
    expect(resolved.health.status).toBe("healthy");
    expect(resolved.fallbackFromProviderId).toBeUndefined();
  });

  it("falls back to browser when ElevenLabs key is missing", async () => {
    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId: "elevenlabs",
    });

    expect(resolved.requestedProviderId).toBe("elevenlabs");
    expect(resolved.adapter.providerId).toBe("browser");
    expect(resolved.fallbackFromProviderId).toBe("elevenlabs");
    expect(resolved.health.status).toBe("degraded");
    expect(resolved.health.reason).toBe("missing_elevenlabs_api_key");
    expect(resolved.health.fallbackProviderId).toBe("browser");
  });

  it("falls back to browser when ElevenLabs health probe is degraded", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "upstream unavailable" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
    );

    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId: "elevenlabs",
      elevenLabsBinding: { apiKey: "secret-key" },
      fetchFn,
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(resolved.adapter.providerId).toBe("browser");
    expect(resolved.fallbackFromProviderId).toBe("elevenlabs");
    expect(resolved.health.providerId).toBe("elevenlabs");
    expect(resolved.health.status).toBe("degraded");
    expect(resolved.health.fallbackProviderId).toBe("browser");
  });

  it("keeps ElevenLabs provider when health probe passes", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ voices: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const resolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId: "elevenlabs",
      elevenLabsBinding: { apiKey: "secret-key" },
      fetchFn,
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(resolved.adapter.providerId).toBe("elevenlabs");
    expect(resolved.health.status).toBe("healthy");
    expect(resolved.fallbackFromProviderId).toBeUndefined();
  });

  it("returns provider tagged synthesis payloads from ElevenLabs adapter", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ voices: [{ voice_id: "voice_123" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(Uint8Array.from([1, 2, 3]), {
          status: 200,
          headers: { "content-type": "audio/mpeg" },
        }),
      );

    const adapter = createElevenLabsVoiceRuntimeAdapter({
      apiKey: "secret-key",
      defaultVoiceId: "voice_123",
      fetchFn,
    });

    const health = await adapter.probeHealth();
    expect(health.status).toBe("healthy");

    const synthesis = await adapter.synthesize({
      voiceSessionId: "voice-session-1",
      text: "Preview voice output",
    });

    expect(synthesis.providerId).toBe("elevenlabs");
    expect(synthesis.mimeType).toBe("audio/mpeg");
    expect(synthesis.audioBase64).toBeDefined();
  });
});
