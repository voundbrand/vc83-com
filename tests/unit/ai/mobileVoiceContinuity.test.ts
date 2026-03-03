import { describe, expect, it } from "vitest";

import {
  shouldCloseVoiceSessionForConversationSwitch,
  shouldReconnectRealtimeSession,
} from "../../../apps/operator-mobile/src/lib/voice/continuity";

describe("mobile voice continuity helpers", () => {
  it("reconnects realtime only when websocket transport is active and socket is not open", () => {
    expect(
      shouldReconnectRealtimeSession({
        transportMode: "websocket",
        websocketReadyState: 0,
      })
    ).toBe(true);
    expect(
      shouldReconnectRealtimeSession({
        transportMode: "websocket",
        websocketReadyState: 1,
      })
    ).toBe(false);
    expect(
      shouldReconnectRealtimeSession({
        transportMode: "chunked_fallback",
        websocketReadyState: 0,
      })
    ).toBe(false);
  });

  it("closes active voice session only when conversation context actually switches", () => {
    expect(
      shouldCloseVoiceSessionForConversationSwitch({
        activeConversationId: "conv_a",
        currentConversationId: "conv_b",
      })
    ).toBe(true);
    expect(
      shouldCloseVoiceSessionForConversationSwitch({
        activeConversationId: "conv_a",
        currentConversationId: "conv_a",
      })
    ).toBe(false);
    expect(
      shouldCloseVoiceSessionForConversationSwitch({
        activeConversationId: "conv_a",
        currentConversationId: undefined,
      })
    ).toBe(false);
  });
});
