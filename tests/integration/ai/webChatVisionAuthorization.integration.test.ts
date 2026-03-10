import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  resolveEffectiveOperatorMediaRetentionMode,
  resolveWebChatVisionAttachmentAuthIsolationDecision,
  resolveWebChatVisionFrameDecision,
  type OperatorMediaRetentionConfig,
  type WebChatVisionFrameCandidate,
} from "../../../convex/ai/mediaRetention";

function buildFrameCandidate(
  overrides: Partial<WebChatVisionFrameCandidate> = {},
): WebChatVisionFrameCandidate {
  return {
    retentionId: "retention_vision_auth_1" as Id<"operatorMediaRetention">,
    capturedAt: 10_000,
    mediaType: "video_frame",
    mimeType: "image/jpeg",
    sizeBytes: 128,
    storageId: "storage_vision_auth_1" as Id<"_storage">,
    liveSessionId: "live_vision_auth_1",
    videoSessionId: "video_vision_auth_1",
    sourceSequence: 1,
    ...overrides,
  };
}

function buildIsolationArgs(
  overrides: Partial<
    Parameters<typeof resolveWebChatVisionAttachmentAuthIsolationDecision>[0]
  > = {},
): Parameters<typeof resolveWebChatVisionAttachmentAuthIsolationDecision>[0] {
  return {
    authenticatedOrganizationId: "org_vision_auth_1" as Id<"organizations">,
    authenticatedUserId: "user_vision_auth_1" as Id<"users">,
    requestedInterviewSessionId: "session_vision_auth_1" as Id<"agentSessions">,
    resolvedInterviewSessionId: "session_vision_auth_1" as Id<"agentSessions">,
    conversationOrganizationId: "org_vision_auth_1" as Id<"organizations">,
    conversationUserId: "user_vision_auth_1" as Id<"users">,
    ...overrides,
  };
}

describe("web chat vision authorization integration", () => {
  it("fails closed to off mode when retention is disabled even if mode is full", () => {
    const config = {
      enabled: false,
      mode: "full",
    } as Pick<OperatorMediaRetentionConfig, "enabled" | "mode">;
    const effectiveMode = resolveEffectiveOperatorMediaRetentionMode(config);

    expect(effectiveMode).toBe("off");

    const decision = resolveWebChatVisionFrameDecision({
      retentionMode: effectiveMode,
      nowMs: 11_000,
      maxFrameAgeMs: 12_000,
      candidates: [buildFrameCandidate()],
    });
    expect(decision).toEqual({
      status: "degraded",
      reason: "vision_policy_blocked",
      maxFrameAgeMs: 12_000,
    });
  });

  it("covers retention policy outcomes for off, metadata_only, and full", () => {
    const nowMs = 11_000;
    const maxFrameAgeMs = 12_000;
    const candidates = [buildFrameCandidate()];

    const offDecision = resolveWebChatVisionFrameDecision({
      retentionMode: "off",
      nowMs,
      maxFrameAgeMs,
      candidates,
    });
    expect(offDecision).toEqual({
      status: "degraded",
      reason: "vision_policy_blocked",
      maxFrameAgeMs,
    });

    const metadataOnlyDecision = resolveWebChatVisionFrameDecision({
      retentionMode: "metadata_only",
      nowMs,
      maxFrameAgeMs,
      candidates,
    });
    expect(metadataOnlyDecision).toEqual({
      status: "degraded",
      reason: "vision_policy_blocked",
      maxFrameAgeMs,
    });

    const fullDecision = resolveWebChatVisionFrameDecision({
      retentionMode: "full",
      nowMs,
      maxFrameAgeMs,
      candidates,
    });
    expect(fullDecision.status).toBe("attached");
    if (fullDecision.status !== "attached") {
      return;
    }
    expect(fullDecision.frame.retentionId).toBe("retention_vision_auth_1");
    expect(fullDecision.frame.ageMs).toBe(1_000);
  });

  it("fails closed on interview session mismatch", () => {
    const isolation = resolveWebChatVisionAttachmentAuthIsolationDecision(
      buildIsolationArgs({
        requestedInterviewSessionId: "session_vision_auth_request" as Id<"agentSessions">,
        resolvedInterviewSessionId: "session_vision_auth_resolved" as Id<"agentSessions">,
      }),
    );

    expect(isolation).toEqual({
      allowed: false,
      reason: "interview_session_mismatch",
    });
  });

  it("fails closed when conversation is missing", () => {
    const isolation = resolveWebChatVisionAttachmentAuthIsolationDecision(
      buildIsolationArgs({
        conversationOrganizationId: null,
        conversationUserId: null,
      }),
    );

    expect(isolation).toEqual({
      allowed: false,
      reason: "conversation_not_found",
    });
  });

  it("fails closed on organization mismatch", () => {
    const isolation = resolveWebChatVisionAttachmentAuthIsolationDecision(
      buildIsolationArgs({
        conversationOrganizationId: "org_vision_auth_2" as Id<"organizations">,
      }),
    );

    expect(isolation).toEqual({
      allowed: false,
      reason: "organization_mismatch",
    });
  });

  it("fails closed on conversation ownership mismatch", () => {
    const isolation = resolveWebChatVisionAttachmentAuthIsolationDecision(
      buildIsolationArgs({
        conversationUserId: "user_vision_auth_2" as Id<"users">,
      }),
    );

    expect(isolation).toEqual({
      allowed: false,
      reason: "conversation_user_mismatch",
    });
  });

  it("allows attachment selection only when org, user, and interview session all match", () => {
    const isolation = resolveWebChatVisionAttachmentAuthIsolationDecision(
      buildIsolationArgs(),
    );

    expect(isolation).toEqual({
      allowed: true,
    });
  });
});
