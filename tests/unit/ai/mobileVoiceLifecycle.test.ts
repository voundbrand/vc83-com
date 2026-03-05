import { describe, expect, it } from "vitest";

import {
  MOBILE_VOICE_RECORDER_AUTOSTART_DEBOUNCE_DEFAULT_MS,
  MOBILE_VOICE_RECORDER_AUTOSTART_DEBOUNCE_MAX_MS,
  MOBILE_VOICE_RECORDER_AUTOSTART_DEBOUNCE_MIN_MS,
  claimAssistantAutospeakTurn,
  evaluateFinalFrameFinalizeGuard,
  inferConversationReasonCode,
  normalizeRecorderAutoStartDebounceMs,
  reduceConversationTurnState,
  reduceVoiceBargeInState,
  resolveAssistantPlaybackBargeInTransition,
  resolveCaptureStartBargeInTransition,
  shouldBargeInInterruptPlayback,
  transitionVoiceSessionLifecycle,
} from "../../../apps/operator-mobile/src/lib/voice/lifecycle";

describe("mobile voice lifecycle", () => {
  it("transitions session lifecycle through open and close events", () => {
    let state = transitionVoiceSessionLifecycle("idle", "open_request");
    expect(state).toBe("opening");

    state = transitionVoiceSessionLifecycle(state, "open_success");
    expect(state).toBe("open");

    state = transitionVoiceSessionLifecycle(state, "close_request");
    expect(state).toBe("closing");

    state = transitionVoiceSessionLifecycle(state, "close_success");
    expect(state).toBe("closed");
  });

  it("interrupts assistant playback when user barge-in capture starts", () => {
    expect(
      shouldBargeInInterruptPlayback({
        turnState: "agent_speaking",
        isUserCaptureStarting: true,
      })
    ).toBe(true);
  });

  it("does not interrupt when assistant is not speaking", () => {
    expect(
      shouldBargeInInterruptPlayback({
        turnState: "idle",
        isUserCaptureStarting: true,
      })
    ).toBe(false);
  });

  it("interrupts on listening+assistant overlap to cover turn-state race windows", () => {
    expect(
      shouldBargeInInterruptPlayback({
        turnState: "listening",
        isUserCaptureStarting: true,
        isAssistantSpeaking: true,
      })
    ).toBe(true);
  });

  it("does not interrupt on listening when assistant overlap signal is absent", () => {
    expect(
      shouldBargeInInterruptPlayback({
        turnState: "listening",
        isUserCaptureStarting: true,
        isAssistantSpeaking: false,
      })
    ).toBe(false);
  });

  it("emits a single local+remote interrupt command and queue reset for barge-in", () => {
    let state = "assistant_playing" as const;
    let transition = reduceVoiceBargeInState({
      state,
      event: "user_capture_started",
    });
    expect(transition.state).toBe("interrupting");
    expect(transition.command).toEqual({
      interruptLocalPlayback: true,
      sendRemoteCancel: true,
      resetPlaybackQueue: true,
    });

    state = transition.state;
    transition = reduceVoiceBargeInState({
      state,
      event: "user_capture_started",
    });
    expect(transition.state).toBe("interrupting");
    expect(transition.command).toEqual({
      interruptLocalPlayback: false,
      sendRemoteCancel: false,
      resetPlaybackQueue: false,
    });
  });

  it("maps proactive tap/vad capture start into a single interrupt command from idle/recovering", () => {
    const first = resolveCaptureStartBargeInTransition({
      state: "idle",
      turnState: "agent_speaking",
      isAssistantSpeaking: true,
    });
    expect(first.state).toBe("interrupting");
    expect(first.command).toEqual({
      interruptLocalPlayback: true,
      sendRemoteCancel: true,
      resetPlaybackQueue: true,
    });

    const second = resolveCaptureStartBargeInTransition({
      state: first.state,
      turnState: "agent_speaking",
      isAssistantSpeaking: true,
    });
    expect(second.state).toBe("interrupting");
    expect(second.command).toEqual({
      interruptLocalPlayback: false,
      sendRemoteCancel: false,
      resetPlaybackQueue: false,
    });
  });

  it("syncs barge-in state from assistant playback signals", () => {
    const started = resolveAssistantPlaybackBargeInTransition({
      state: "idle",
      isAssistantSpeaking: true,
    });
    expect(started.state).toBe("assistant_playing");
    expect(started.command.interruptLocalPlayback).toBe(false);

    const stopped = resolveAssistantPlaybackBargeInTransition({
      state: started.state,
      isAssistantSpeaking: false,
    });
    expect(stopped.state).toBe("recovering");
    expect(stopped.command.sendRemoteCancel).toBe(false);
  });

  it("moves from interrupting to capturing only after remote cancel ack", () => {
    let transition = reduceVoiceBargeInState({
      state: "interrupting",
      event: "remote_cancel_ack",
    });
    expect(transition.state).toBe("capturing_user");
    expect(transition.command.sendRemoteCancel).toBe(false);
    expect(transition.command.resetPlaybackQueue).toBe(false);

    transition = reduceVoiceBargeInState({
      state: transition.state,
      event: "user_capture_stopped",
    });
    expect(transition.state).toBe("recovering");

    transition = reduceVoiceBargeInState({
      state: transition.state,
      event: "reset",
    });
    expect(transition.state).toBe("idle");
  });

  it("prevents assistant playback restart while user is actively capturing", () => {
    const transition = reduceVoiceBargeInState({
      state: "capturing_user",
      event: "assistant_playback_started",
    });
    expect(transition.state).toBe("capturing_user");
    expect(transition.command.interruptLocalPlayback).toBe(false);
    expect(transition.command.sendRemoteCancel).toBe(false);
  });

  it("normalizes recorder auto-start debounce into the lane-M guard range", () => {
    expect(normalizeRecorderAutoStartDebounceMs(undefined)).toBe(
      MOBILE_VOICE_RECORDER_AUTOSTART_DEBOUNCE_DEFAULT_MS
    );
    expect(normalizeRecorderAutoStartDebounceMs(50)).toBe(
      MOBILE_VOICE_RECORDER_AUTOSTART_DEBOUNCE_MIN_MS
    );
    expect(normalizeRecorderAutoStartDebounceMs(900)).toBe(
      MOBILE_VOICE_RECORDER_AUTOSTART_DEBOUNCE_MAX_MS
    );
  });

  it("guards final-frame finalize on assistant overlap, mutex lock, and duplicate sequence", () => {
    expect(
      evaluateFinalFrameFinalizeGuard({
        isFinalFrame: true,
        frameSequence: 8,
        isAssistantSpeaking: true,
        finalizeInFlight: false,
        lastFinalizedSequence: 7,
      })
    ).toEqual({
      allowFinalize: false,
      reason: "assistant_speaking",
    });
    expect(
      evaluateFinalFrameFinalizeGuard({
        isFinalFrame: true,
        frameSequence: 8,
        isAssistantSpeaking: false,
        finalizeInFlight: true,
        lastFinalizedSequence: 7,
      })
    ).toEqual({
      allowFinalize: false,
      reason: "finalize_mutex_locked",
    });
    expect(
      evaluateFinalFrameFinalizeGuard({
        isFinalFrame: true,
        frameSequence: 8,
        isAssistantSpeaking: false,
        finalizeInFlight: false,
        lastFinalizedSequence: 8,
      })
    ).toEqual({
      allowFinalize: false,
      reason: "duplicate_sequence",
    });
  });

  it("claims assistant autospeak turn exactly once per active turn token", () => {
    const firstClaim = claimAssistantAutospeakTurn({
      activeTurnToken: 42,
      candidateTurnToken: 42,
      consumedTurnToken: null,
    });
    expect(firstClaim).toEqual({
      claimed: true,
      nextConsumedTurnToken: 42,
    });

    const secondClaim = claimAssistantAutospeakTurn({
      activeTurnToken: 42,
      candidateTurnToken: 42,
      consumedTurnToken: firstClaim.nextConsumedTurnToken,
    });
    expect(secondClaim).toEqual({
      claimed: false,
      nextConsumedTurnToken: 42,
    });
  });

  it("rejects stale autospeak turn candidates after active token advances", () => {
    const staleClaim = claimAssistantAutospeakTurn({
      activeTurnToken: 9,
      candidateTurnToken: 8,
      consumedTurnToken: null,
    });
    expect(staleClaim).toEqual({
      claimed: false,
      nextConsumedTurnToken: null,
    });
  });

  it("forces turn state back to idle when conversation is no longer active", () => {
    const nextState = reduceConversationTurnState({
      state: "agent_speaking",
      event: {
        type: "sync",
        activity: {
          conversationStarted: false,
          isRecording: true,
          isThinking: true,
          isAssistantSpeaking: true,
        },
      },
    });
    expect(nextState).toBe("idle");
  });

  it("maps runtime failures into deterministic conversation reason codes", () => {
    expect(inferConversationReasonCode("NotAllowedError: user denied microphone")).toBe("permission_denied_mic");
    expect(inferConversationReasonCode("camera permission denied")).toBe("permission_denied_camera");
    expect(inferConversationReasonCode("dat_sdk_unavailable")).toBe("dat_sdk_unavailable");
    expect(inferConversationReasonCode("websocket runtime failed")).toBe("transport_failed");
    expect(inferConversationReasonCode("auth token expired")).toBe("session_auth_failed");
    expect(inferConversationReasonCode("provider offline")).toBe("provider_unavailable");
    expect(inferConversationReasonCode("device unavailable")).toBe("device_unavailable");
    expect(inferConversationReasonCode("")).toBe("session_open_failed");
  });
});
