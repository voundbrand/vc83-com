import { describe, expect, it } from "vitest";

import {
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
});
