import { describe, expect, it, vi } from "vitest";
import {
  createElevenLabsVoiceRuntimeAdapter,
  resolvePcmTranscriptionMimeType,
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
    expect(synthesis.usage?.nativeUsageUnit).toBe("characters");
    expect(synthesis.usage?.nativeUsageQuantity).toBeGreaterThan(0);
    expect(synthesis.usage?.nativeCostSource).toBe("estimated_unit_pricing");
  });

  it("returns deterministic cancellation semantics for browser and elevenlabs adapters", async () => {
    const browserResolved = await resolveVoiceRuntimeAdapter({});
    const browserCancel = await browserResolved.adapter.cancelSynthesis({
      voiceSessionId: "voice-session-cancel-1",
      assistantMessageId: "assistant-message-cancel-1",
    });
    expect(browserCancel.providerId).toBe("browser");
    expect(browserCancel.cancelled).toBe(true);
    expect(browserCancel.idempotent).toBe(true);

    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ voices: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    const elevenResolved = await resolveVoiceRuntimeAdapter({
      requestedProviderId: "elevenlabs",
      elevenLabsBinding: { apiKey: "secret-key" },
      fetchFn,
    });
    const elevenCancel = await elevenResolved.adapter.cancelSynthesis({
      voiceSessionId: "voice-session-cancel-2",
      assistantMessageId: "assistant-message-cancel-2",
    });
    expect(elevenCancel.providerId).toBe("elevenlabs");
    expect(elevenCancel.cancelled).toBe(true);
    expect(elevenCancel.idempotent).toBe(true);
    expect(elevenCancel.reason).toBe("best_effort_provider_cancel_not_supported");
  });

  it("includes transcription usage telemetry and provider request id", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ voices: [{ voice_id: "voice_123" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ text: "hello", duration_seconds: 2 }), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-request-id": "req_voice_123",
          },
        }),
      );

    const adapter = createElevenLabsVoiceRuntimeAdapter({
      apiKey: "secret-key",
      fetchFn,
    });

    const health = await adapter.probeHealth();
    expect(health.status).toBe("healthy");

    const transcription = await adapter.transcribe({
      voiceSessionId: "voice-session-2",
      audioBytes: Uint8Array.from([1, 2, 3, 4]),
      mimeType: "audio/webm",
      language: "en",
    });

    expect(transcription.text).toBe("hello");
    expect(transcription.providerId).toBe("elevenlabs");
    expect(transcription.usage?.nativeUsageUnit).toBe("audio_seconds");
    expect(transcription.usage?.nativeUsageQuantity).toBe(2);
    expect(transcription.usage?.providerRequestId).toBe("req_voice_123");
  });

  it("retries transcription as mp4 when webm hint is rejected as invalid_audio", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: {
              code: "invalid_audio",
              message: "File 'voice-input.webm' is corrupted.",
            },
          }),
          {
            status: 400,
            headers: { "content-type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ text: "retry success", duration_seconds: 1.5 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    const adapter = createElevenLabsVoiceRuntimeAdapter({
      apiKey: "secret-key",
      fetchFn,
    });

    const transcription = await adapter.transcribe({
      voiceSessionId: "voice-session-retry-1",
      audioBytes: Uint8Array.from([1, 2, 3, 4, 5, 6]),
      mimeType: "audio/webm;codecs=opus",
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(transcription.text).toBe("retry success");
    expect(transcription.providerId).toBe("elevenlabs");
    expect(transcription.usage?.metadata?.mimeType).toBe("audio/mp4");
  });

  it("derives deterministic PCM websocket mime type for transcription relay", () => {
    expect(
      resolvePcmTranscriptionMimeType({
        encoding: "pcm_s16le",
        sampleRateHz: 16000,
        channels: 1,
        frameDurationMs: 20,
      })
    ).toBe("audio/L16;rate=16000;channels=1");
    expect(
      resolvePcmTranscriptionMimeType({
        encoding: "pcm_f32le",
        sampleRateHz: 48000,
        channels: 2,
        frameDurationMs: 10,
      })
    ).toBe("audio/L32;rate=48000;channels=2");
  });
});
