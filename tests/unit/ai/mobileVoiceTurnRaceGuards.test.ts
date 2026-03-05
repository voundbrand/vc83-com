import { describe, expect, it } from "vitest";

import {
  claimAssistantAutospeakTurn,
  evaluateFinalFrameFinalizeGuard,
  normalizeRecorderAutoStartDebounceMs,
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
