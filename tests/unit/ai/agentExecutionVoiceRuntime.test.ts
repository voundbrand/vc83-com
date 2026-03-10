import { describe, expect, it } from "vitest";
import {
  buildInboundLanguageLockRuntimeContext,
  resolveInboundConversationLanguageLock,
  resolveInboundVoiceRuntimeRequest,
  resolveVoiceRuntimeLanguage,
  resolveVoiceRuntimeVoiceId,
} from "../../../convex/ai/agentExecution";

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

  it("uses agent-level voice language when inbound metadata omits language", () => {
    const request = resolveInboundVoiceRuntimeRequest({
      voiceRuntime: {
        requestedProviderId: "elevenlabs",
        synthesizeResponse: true,
      },
    });

    expect(request).not.toBeNull();
    expect(
      resolveVoiceRuntimeLanguage({
        inboundVoiceRequest: request!,
        agentConfig: {
          voiceLanguage: "fr",
          language: "en",
        },
      }),
    ).toBe("fr");
  });

  it("uses language fallback order inbound -> voiceLanguage -> language", () => {
    const request = resolveInboundVoiceRuntimeRequest({
      voiceRuntime: {
        requestedProviderId: "elevenlabs",
        synthesizeResponse: true,
        language: "de",
      },
    });

    expect(request).not.toBeNull();
    expect(
      resolveVoiceRuntimeLanguage({
        inboundVoiceRequest: request!,
        agentConfig: {
          voiceLanguage: "fr",
          language: "en",
        },
      }),
    ).toBe("de");
  });

  it("uses voice id fallback order inbound -> agent override -> org default", () => {
    const request = resolveInboundVoiceRuntimeRequest({
      voiceRuntime: {
        requestedProviderId: "elevenlabs",
        synthesizeResponse: true,
      },
    });

    expect(request).not.toBeNull();
    expect(
      resolveVoiceRuntimeVoiceId({
        inboundVoiceRequest: request!,
        agentConfig: {
          elevenLabsVoiceId: "voice_agent",
        },
        orgDefaultVoiceId: "voice_org",
      }),
    ).toBe("voice_agent");

    expect(
      resolveVoiceRuntimeVoiceId({
        inboundVoiceRequest: {
          ...request!,
          requestedVoiceId: "voice_inbound",
        },
        agentConfig: {
          elevenLabsVoiceId: "voice_agent",
        },
        orgDefaultVoiceId: "voice_org",
      }),
    ).toBe("voice_inbound");

    expect(
      resolveVoiceRuntimeVoiceId({
        inboundVoiceRequest: request!,
        agentConfig: {},
        orgDefaultVoiceId: "voice_org",
      }),
    ).toBe("voice_org");
  });

  it("locks response language from inbound voice runtime metadata when present", () => {
    const inboundVoiceRequest = resolveInboundVoiceRuntimeRequest({
      voiceRuntime: {
        requestedProviderId: "elevenlabs",
        synthesizeResponse: true,
        language: "en-US",
      },
    });
    expect(inboundVoiceRequest).not.toBeNull();
    expect(
      resolveInboundConversationLanguageLock({
        metadata: {
          voiceRuntime: {
            language: "de",
          },
        },
        inboundVoiceRequest,
      }),
    ).toBe("en-us");
  });

  it("prefers explicit conversation runtime language lock over inbound voice hints", () => {
    const inboundVoiceRequest = resolveInboundVoiceRuntimeRequest({
      voiceRuntime: {
        requestedProviderId: "elevenlabs",
        synthesizeResponse: true,
        language: "hi",
      },
    });
    expect(inboundVoiceRequest).not.toBeNull();
    expect(
      resolveInboundConversationLanguageLock({
        metadata: {
          conversationRuntime: {
            languageLock: "en-US",
          },
          voiceRuntime: {
            language: "de",
          },
        },
        inboundVoiceRequest,
      }),
    ).toBe("en-us");
  });

  it("falls back to metadata language hints for lock selection", () => {
    expect(
      resolveInboundConversationLanguageLock({
        metadata: {
          conversationRuntime: {
            languageLock: "de-DE",
          },
        },
      }),
    ).toBe("de-de");
    expect(
      resolveInboundConversationLanguageLock({
        metadata: {
          language: "hindi",
        },
      }),
    ).toBe("hi");
  });

  it("builds deterministic runtime context for language lock enforcement", () => {
    const context = buildInboundLanguageLockRuntimeContext("en-US");
    expect(context).toContain("LANGUAGE LOCK");
    expect(context).toContain("en-us");
    expect(context).toContain("explicitly requests");
  });
});
