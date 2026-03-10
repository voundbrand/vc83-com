import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  resolveInboundVoiceRuntimeRequest,
  resolveInboundVoiceTurnVisionFrameAttachmentInput,
} from "../../../convex/ai/agentExecution";
import { buildOpenRouterMessages } from "../../../convex/ai/chatRuntimeOrchestration";
import type { WebChatVisionFrameCandidate } from "../../../convex/ai/mediaRetention";
import { resolveWebChatVisionFrameDecision } from "../../../convex/ai/mediaRetention";

function buildFrameCandidate(
  overrides: Partial<WebChatVisionFrameCandidate> = {},
): WebChatVisionFrameCandidate {
  return {
    retentionId: "retention_vision_turn_attach_1" as Id<"operatorMediaRetention">,
    capturedAt: 18_000,
    mediaType: "video_frame",
    mimeType: "image/jpeg",
    sizeBytes: 64,
    storageId: "storage_vision_turn_attach_1" as Id<"_storage">,
    liveSessionId: "live_vision_turn_attach_1",
    videoSessionId: "video_vision_turn_attach_1",
    sourceSequence: 7,
    ...overrides,
  };
}

describe("web chat vision turn attachment integration", () => {
  it("auto-materializes attached frame and preserves voice request parsing when frame is fresh", () => {
    const resolution = resolveWebChatVisionFrameDecision({
      retentionMode: "full",
      nowMs: 20_000,
      maxFrameAgeMs: 12_000,
      candidates: [buildFrameCandidate()],
    });
    expect(resolution.status).toBe("attached");
    if (resolution.status !== "attached") {
      return;
    }

    const metadata: Record<string, unknown> = {
      voiceRuntime: {
        requestedProviderId: "elevenlabs",
        voiceSessionId: "voice_turn_attach_1",
        requestedVoiceId: "voice_demo_1",
        audioBase64: "dGVzdA==",
        mimeType: "audio/webm",
        language: "en",
        visionFrameResolution: {
          ...resolution,
          frame: {
            ...resolution.frame,
            storageUrl: "https://cdn.example.test/vision/frame-1.jpg",
          },
        },
      },
    };

    expect(resolveInboundVoiceRuntimeRequest(metadata)).toEqual({
      requestedProviderId: "elevenlabs",
      voiceSessionId: "voice_turn_attach_1",
      requestedVoiceId: "voice_demo_1",
      audioBase64: "dGVzdA==",
      mimeType: "audio/webm",
      language: "en",
      synthesizeResponse: false,
    });

    const attachment = resolveInboundVoiceTurnVisionFrameAttachmentInput(metadata);
    expect(attachment).toEqual({
      type: "image",
      name: "voice-turn-frame-18000",
      mimeType: "image/jpeg",
      sizeBytes: 64,
      url: "https://cdn.example.test/vision/frame-1.jpg",
      sourceId: "retention_vision_turn_attach_1",
    });

    const messages = buildOpenRouterMessages({
      systemPrompt: "You are a vision assistant.",
      conversationMessages: [
        {
          role: "user",
          content: "What is on my desk?",
          attachments: [
            { kind: "image", url: "https://cdn.example.test/vision/frame-1.jpg" },
            { kind: "image", url: " https://cdn.example.test/vision/frame-1.jpg " },
          ],
        },
      ],
    });

    expect(messages).toHaveLength(2);
    expect(messages[1]?.role).toBe("user");
    expect(messages[1]?.content).toEqual([
      { type: "text", text: "What is on my desk?" },
      {
        type: "image_url",
        image_url: { url: "https://cdn.example.test/vision/frame-1.jpg" },
      },
    ]);
  });

  it("keeps voice-only path when freshest frame resolution is missing", () => {
    const resolution = resolveWebChatVisionFrameDecision({
      retentionMode: "full",
      nowMs: 20_000,
      maxFrameAgeMs: 12_000,
      candidates: [],
    });
    expect(resolution).toMatchObject({
      status: "degraded",
      reason: "vision_frame_missing",
    });

    const metadata: Record<string, unknown> = {
      voiceRuntime: {
        requestedProviderId: "elevenlabs",
        voiceSessionId: "voice_turn_attach_2",
        requestedVoiceId: "voice_demo_2",
        audioBase64: "dGVzdA==",
        mimeType: "audio/webm",
        language: "en",
        visionFrameResolution: resolution,
      },
    };

    expect(resolveInboundVoiceRuntimeRequest(metadata)).toEqual({
      requestedProviderId: "elevenlabs",
      voiceSessionId: "voice_turn_attach_2",
      requestedVoiceId: "voice_demo_2",
      audioBase64: "dGVzdA==",
      mimeType: "audio/webm",
      language: "en",
      synthesizeResponse: false,
    });
    expect(resolveInboundVoiceTurnVisionFrameAttachmentInput(metadata)).toBeNull();

    const messages = buildOpenRouterMessages({
      systemPrompt: "You are a voice assistant.",
      conversationMessages: [
        {
          role: "user",
          content: "Continue voice-only if no frame is attached.",
          attachments: [],
        },
      ],
    });
    expect(messages[1]?.content).toBe("Continue voice-only if no frame is attached.");
  });

  it("keeps voice-only path when freshest frame is stale", () => {
    const resolution = resolveWebChatVisionFrameDecision({
      retentionMode: "full",
      nowMs: 20_000,
      maxFrameAgeMs: 12_000,
      candidates: [buildFrameCandidate({ capturedAt: 7_000 })],
    });
    expect(resolution).toEqual({
      status: "degraded",
      reason: "vision_frame_stale",
      maxFrameAgeMs: 12_000,
      freshestCandidateCapturedAt: 7_000,
      freshestCandidateAgeMs: 13_000,
    });

    const metadata: Record<string, unknown> = {
      voiceRuntime: {
        requestedProviderId: "elevenlabs",
        voiceSessionId: "voice_turn_attach_3",
        requestedVoiceId: "voice_demo_3",
        audioBase64: "dGVzdA==",
        mimeType: "audio/webm",
        language: "en",
        visionFrameResolution: resolution,
      },
    };

    expect(resolveInboundVoiceRuntimeRequest(metadata)).toEqual({
      requestedProviderId: "elevenlabs",
      voiceSessionId: "voice_turn_attach_3",
      requestedVoiceId: "voice_demo_3",
      audioBase64: "dGVzdA==",
      mimeType: "audio/webm",
      language: "en",
      synthesizeResponse: false,
    });
    expect(resolveInboundVoiceTurnVisionFrameAttachmentInput(metadata)).toBeNull();
  });
});
