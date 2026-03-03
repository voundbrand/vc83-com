import { describe, expect, it } from "vitest";

import {
  inferConversationReasonCode,
  reduceVoiceBargeInState,
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
        isAssistantSpeaking: true,
        isUserCaptureStarting: true,
      })
    ).toBe(true);
  });

  it("does not interrupt when assistant is not speaking", () => {
    expect(
      shouldBargeInInterruptPlayback({
        isAssistantSpeaking: false,
        isUserCaptureStarting: true,
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
