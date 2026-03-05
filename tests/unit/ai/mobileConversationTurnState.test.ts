import { describe, expect, it } from "vitest";

import {
  reduceConversationTurnState,
  resolveConversationTurnState,
} from "../../../apps/operator-mobile/src/lib/voice/lifecycle";

describe("mobile conversation turn state", () => {
  it("resolves idle when conversation is not started", () => {
    expect(
      resolveConversationTurnState({
        conversationStarted: false,
        isRecording: true,
        isThinking: true,
        isAssistantSpeaking: true,
      })
    ).toBe("idle");
  });

  it("prioritizes listening over other active flags", () => {
    expect(
      resolveConversationTurnState({
        conversationStarted: true,
        isRecording: true,
        isThinking: true,
        isAssistantSpeaking: true,
      })
    ).toBe("listening");
  });

  it("resolves agent speaking before thinking", () => {
    expect(
      resolveConversationTurnState({
        conversationStarted: true,
        isRecording: false,
        isThinking: true,
        isAssistantSpeaking: true,
      })
    ).toBe("agent_speaking");
  });

  it("resolves thinking when capture and assistant playback are inactive", () => {
    expect(
      resolveConversationTurnState({
        conversationStarted: true,
        isRecording: false,
        isThinking: true,
        isAssistantSpeaking: false,
      })
    ).toBe("thinking");
  });

  it("reduces sync and reset events deterministically", () => {
    let state = reduceConversationTurnState({
      state: "idle",
      event: {
        type: "sync",
        activity: {
          conversationStarted: true,
          isRecording: true,
          isThinking: false,
          isAssistantSpeaking: false,
        },
      },
    });
    expect(state).toBe("listening");

    state = reduceConversationTurnState({
      state,
      event: {
        type: "sync",
        activity: {
          conversationStarted: true,
          isRecording: false,
          isThinking: true,
          isAssistantSpeaking: false,
        },
      },
    });
    expect(state).toBe("thinking");

    state = reduceConversationTurnState({
      state,
      event: { type: "reset" },
    });
    expect(state).toBe("idle");
  });
});
