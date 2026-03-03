import { describe, expect, it } from "vitest";
import {
  resolveVideoTransportFrameRateDecision,
  resolveVoiceTransportSequenceDecision,
} from "../../../convex/ai/voiceRuntime";

describe("video transport bridge sequencing", () => {
  it("accepts exact next sequence", () => {
    const result = resolveVoiceTransportSequenceDecision({
      sequence: 4,
      acceptedSequences: new Set([0, 1, 2, 3]),
      lastAcceptedSequence: 3,
    });

    expect(result).toEqual({
      decision: "accepted",
      expectedSequence: 4,
    });
  });

  it("marks higher-than-expected sequence as gap_detected", () => {
    const result = resolveVoiceTransportSequenceDecision({
      sequence: 7,
      acceptedSequences: new Set([0, 1, 2, 3]),
      lastAcceptedSequence: 3,
    });

    expect(result).toEqual({
      decision: "gap_detected",
      expectedSequence: 4,
    });
  });
});

describe("video transport bridge frame rate control", () => {
  it("allows ingress while below window max", () => {
    const result = resolveVideoTransportFrameRateDecision({
      nowMs: 10_000,
      windowMs: 60_000,
      maxFramesPerWindow: 3,
      state: {
        windowStartMs: 0,
        frameCountInWindow: 2,
      },
    });

    expect(result).toEqual({
      allowed: true,
      retryAfterMs: 0,
      windowStartMs: 0,
      nextFrameCount: 3,
    });
  });

  it("blocks ingress when window max is reached", () => {
    const result = resolveVideoTransportFrameRateDecision({
      nowMs: 30_000,
      windowMs: 60_000,
      maxFramesPerWindow: 3,
      state: {
        windowStartMs: 0,
        frameCountInWindow: 3,
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBe(30_000);
    expect(result.windowStartMs).toBe(0);
    expect(result.nextFrameCount).toBe(3);
  });
});
