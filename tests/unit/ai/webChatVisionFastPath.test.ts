import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  resolveWebChatVisionFrameDecision,
  resolveWebChatVisionFrameMaxAgeMs,
  type WebChatVisionFrameCandidate,
} from "../../../convex/ai/mediaRetention";

function buildCandidate(
  overrides: Partial<WebChatVisionFrameCandidate> = {},
): WebChatVisionFrameCandidate {
  return {
    retentionId: "retention_vision_fast_path_1" as Id<"operatorMediaRetention">,
    capturedAt: 1_000,
    mediaType: "video_frame",
    mimeType: "image/jpeg",
    sizeBytes: 128,
    storageId: "storage_vision_fast_path_1" as Id<"_storage">,
    liveSessionId: "live_vision_fast_path_1",
    videoSessionId: "video_vision_fast_path_1",
    sourceSequence: 1,
    ...overrides,
  };
}

describe("web chat vision fast path resolver", () => {
  it("returns vision_policy_blocked when retention mode is not full", () => {
    const decision = resolveWebChatVisionFrameDecision({
      retentionMode: "metadata_only",
      nowMs: 2_000,
      maxFrameAgeMs: 12_000,
      candidates: [buildCandidate()],
    });

    expect(decision).toEqual({
      status: "degraded",
      reason: "vision_policy_blocked",
      maxFrameAgeMs: 12_000,
    });
  });

  it("returns vision_frame_missing when no scoped candidates exist", () => {
    const decision = resolveWebChatVisionFrameDecision({
      retentionMode: "full",
      nowMs: 2_000,
      maxFrameAgeMs: 12_000,
      candidates: [],
    });

    expect(decision).toEqual({
      status: "degraded",
      reason: "vision_frame_missing",
      maxFrameAgeMs: 12_000,
    });
  });

  it("returns vision_frame_stale when freshest candidate exceeds freshness window", () => {
    const decision = resolveWebChatVisionFrameDecision({
      retentionMode: "full",
      nowMs: 30_000,
      maxFrameAgeMs: 5_000,
      candidates: [buildCandidate({ capturedAt: 10_000 })],
    });

    expect(decision.status).toBe("degraded");
    if (decision.status !== "degraded") {
      return;
    }
    expect(decision.reason).toBe("vision_frame_stale");
    expect(decision.freshestCandidateCapturedAt).toBe(10_000);
    expect(decision.freshestCandidateAgeMs).toBe(20_000);
  });

  it("returns attached using freshest deterministic candidate ordering", () => {
    const decision = resolveWebChatVisionFrameDecision({
      retentionMode: "full",
      nowMs: 20_000,
      maxFrameAgeMs: 12_000,
      candidates: [
        buildCandidate({
          retentionId: "retention_vision_fast_path_1" as Id<"operatorMediaRetention">,
          capturedAt: 18_000,
          sourceSequence: 7,
        }),
        buildCandidate({
          retentionId: "retention_vision_fast_path_2" as Id<"operatorMediaRetention">,
          capturedAt: 18_000,
          sourceSequence: 9,
        }),
        buildCandidate({
          retentionId: "retention_vision_fast_path_3" as Id<"operatorMediaRetention">,
          capturedAt: 17_500,
          sourceSequence: 11,
        }),
      ],
    });

    expect(decision.status).toBe("attached");
    if (decision.status !== "attached") {
      return;
    }
    expect(decision.frame.retentionId).toBe("retention_vision_fast_path_2");
    expect(decision.frame.sourceSequence).toBe(9);
    expect(decision.frame.ageMs).toBe(2_000);
  });

  it("uses retention id as deterministic tie-breaker when capturedAt and sequence match", () => {
    const decision = resolveWebChatVisionFrameDecision({
      retentionMode: "full",
      nowMs: 20_000,
      maxFrameAgeMs: 12_000,
      candidates: [
        buildCandidate({
          retentionId: "retention_vision_fast_path_2" as Id<"operatorMediaRetention">,
          capturedAt: 18_000,
          sourceSequence: 9,
        }),
        buildCandidate({
          retentionId: "retention_vision_fast_path_1" as Id<"operatorMediaRetention">,
          capturedAt: 18_000,
          sourceSequence: 9,
        }),
      ],
    });

    expect(decision.status).toBe("attached");
    if (decision.status !== "attached") {
      return;
    }
    expect(decision.frame.retentionId).toBe("retention_vision_fast_path_2");
  });

  it("normalizes max frame age to supported bounds", () => {
    expect(resolveWebChatVisionFrameMaxAgeMs(undefined)).toBe(12_000);
    expect(resolveWebChatVisionFrameMaxAgeMs(500)).toBe(1_000);
    expect(resolveWebChatVisionFrameMaxAgeMs(300_000)).toBe(120_000);
  });
});
