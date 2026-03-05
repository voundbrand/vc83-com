import { describe, expect, it } from "vitest";

import {
  claimAssistantAutospeakTurn,
  evaluateFinalFrameFinalizeGuard,
  evaluatePendingFinalFrameRelease,
  normalizeRecorderAutoStartDebounceMs,
  queuePendingFinalFrameFinalize,
} from "../../../apps/operator-mobile/src/lib/voice/lifecycle";

describe("mobile voice turn race guards", () => {
  it("allows final-frame finalize only when mutex is free and sequence is monotonic", () => {
    expect(
      evaluateFinalFrameFinalizeGuard({
        isFinalFrame: false,
        frameSequence: 3,
        isAssistantSpeaking: false,
        finalizeInFlight: false,
        lastFinalizedSequence: null,
      })
    ).toEqual({
      allowFinalize: false,
      reason: "not_final_frame",
    });

    expect(
      evaluateFinalFrameFinalizeGuard({
        isFinalFrame: true,
        frameSequence: 4,
        isAssistantSpeaking: false,
        finalizeInFlight: false,
        lastFinalizedSequence: 3,
      })
    ).toEqual({
      allowFinalize: true,
      reason: "ready",
    });
  });

  it("fails closed when a duplicate final sequence arrives while finalize is still in flight", () => {
    expect(
      evaluateFinalFrameFinalizeGuard({
        isFinalFrame: true,
        frameSequence: 11,
        isAssistantSpeaking: false,
        finalizeInFlight: true,
        lastFinalizedSequence: 10,
      })
    ).toEqual({
      allowFinalize: false,
      reason: "finalize_mutex_locked",
    });

    expect(
      evaluateFinalFrameFinalizeGuard({
        isFinalFrame: true,
        frameSequence: 11,
        isAssistantSpeaking: false,
        finalizeInFlight: false,
        lastFinalizedSequence: 11,
      })
    ).toEqual({
      allowFinalize: false,
      reason: "duplicate_sequence",
    });
  });

  it("buffers a final frame during assistant speech and releases finalize when speech clears", () => {
    const pendingFinalFrame = queuePendingFinalFrameFinalize({
      sequence: 21,
      nowMs: 10_000,
      timeoutMs: 400,
    });
    expect(
      evaluateFinalFrameFinalizeGuard({
        isFinalFrame: true,
        frameSequence: 21,
        isAssistantSpeaking: true,
        finalizeInFlight: false,
        lastFinalizedSequence: 20,
      })
    ).toEqual({
      allowFinalize: false,
      reason: "assistant_speaking",
    });
    expect(
      evaluatePendingFinalFrameRelease({
        pendingFinalFrame,
        nowMs: 10_120,
        isAssistantSpeaking: true,
        turnState: "agent_speaking",
      })
    ).toEqual({
      allowFinalize: false,
      reason: "assistant_still_speaking",
    });
    expect(
      evaluatePendingFinalFrameRelease({
        pendingFinalFrame,
        nowMs: 10_150,
        isAssistantSpeaking: false,
        turnState: "thinking",
      })
    ).toEqual({
      allowFinalize: true,
      reason: "assistant_cleared",
    });
    expect(
      evaluateFinalFrameFinalizeGuard({
        isFinalFrame: true,
        frameSequence: 21,
        isAssistantSpeaking: false,
        finalizeInFlight: false,
        lastFinalizedSequence: 20,
      })
    ).toEqual({
      allowFinalize: true,
      reason: "ready",
    });
  });

  it("prevents duplicate finalize after pending-frame timeout release for the same sequence", () => {
    const pendingFinalFrame = queuePendingFinalFrameFinalize({
      sequence: 33,
      nowMs: 20_000,
      timeoutMs: 300,
    });
    expect(
      evaluatePendingFinalFrameRelease({
        pendingFinalFrame,
        nowMs: 20_350,
        isAssistantSpeaking: true,
        turnState: "agent_speaking",
      })
    ).toEqual({
      allowFinalize: true,
      reason: "timeout",
    });
    expect(
      evaluateFinalFrameFinalizeGuard({
        isFinalFrame: true,
        frameSequence: 33,
        isAssistantSpeaking: false,
        finalizeInFlight: false,
        lastFinalizedSequence: 32,
      })
    ).toEqual({
      allowFinalize: true,
      reason: "ready",
    });
    expect(
      evaluateFinalFrameFinalizeGuard({
        isFinalFrame: true,
        frameSequence: 33,
        isAssistantSpeaking: false,
        finalizeInFlight: false,
        lastFinalizedSequence: 33,
      })
    ).toEqual({
      allowFinalize: false,
      reason: "duplicate_sequence",
    });
  });

  it("prevents dual autospeak orchestration by allowing only one claim per active turn token", () => {
    const inlineClaim = claimAssistantAutospeakTurn({
      activeTurnToken: 19,
      candidateTurnToken: 19,
      consumedTurnToken: null,
    });
    expect(inlineClaim.claimed).toBe(true);

    const refreshClaim = claimAssistantAutospeakTurn({
      activeTurnToken: 19,
      candidateTurnToken: 19,
      consumedTurnToken: inlineClaim.nextConsumedTurnToken,
    });
    expect(refreshClaim.claimed).toBe(false);

    const staleMessagesClaim = claimAssistantAutospeakTurn({
      activeTurnToken: 20,
      candidateTurnToken: 19,
      consumedTurnToken: inlineClaim.nextConsumedTurnToken,
    });
    expect(staleMessagesClaim.claimed).toBe(false);
  });

  it("keeps recorder auto-start debounce within the required 200-500ms window", () => {
    expect(normalizeRecorderAutoStartDebounceMs(250)).toBe(250);
    expect(normalizeRecorderAutoStartDebounceMs(0)).toBe(200);
    expect(normalizeRecorderAutoStartDebounceMs(1_200)).toBe(500);
  });
});
