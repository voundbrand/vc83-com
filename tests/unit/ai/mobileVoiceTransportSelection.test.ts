import { describe, expect, it } from "vitest";

import {
  buildVoiceTransportRuntime,
  downgradeVoiceTransportSelection,
  resolveVoiceTransportSelection,
} from "../../../apps/operator-mobile/src/lib/voice/transport";
import { createVoiceRuntimeTelemetryCollector } from "../../../apps/operator-mobile/src/lib/av/voiceTelemetry";

describe("mobile voice transport fallback selection", () => {
  it("uses webrtc when requested and available", () => {
    const selection = resolveVoiceTransportSelection({
      configuredMode: "webrtc",
      websocketUrl: "wss://voice.example/ws",
      isWebRtcAvailable: true,
    });

    expect(selection.requestedMode).toBe("webrtc");
    expect(selection.effectiveMode).toBe("webrtc");
    expect(selection.fallbackReason).toBeUndefined();
  });

  it("falls back from webrtc to websocket when webrtc is unavailable", () => {
    const selection = resolveVoiceTransportSelection({
      configuredMode: "webrtc",
      websocketUrl: "wss://voice.example/ws",
      isWebRtcAvailable: false,
    });

    expect(selection.effectiveMode).toBe("websocket");
    expect(selection.fallbackReason).toBe("webrtc_unavailable");
  });

  it("falls back from websocket to chunked when websocket endpoint is missing", () => {
    const selection = resolveVoiceTransportSelection({
      configuredMode: "websocket",
      websocketUrl: "",
      isWebRtcAvailable: false,
    });

    expect(selection.effectiveMode).toBe("chunked_fallback");
    expect(selection.fallbackReason).toBe("websocket_unavailable");
  });

  it("correlates live/video and voice sessions in transport runtime metadata", () => {
    const selection = resolveVoiceTransportSelection({
      configuredMode: "websocket",
      websocketUrl: "wss://voice.example/ws",
      isWebRtcAvailable: false,
    });

    const runtime = buildVoiceTransportRuntime({
      selection,
      liveSessionId: "mobile_live_corr_1",
      activeSession: {
        interviewSessionId: "interview_corr_1",
        voiceSessionId: "voice_corr_1",
      },
      isRealtimeConnected: true,
      partialTranscript: "hello world",
      telemetry: createVoiceRuntimeTelemetryCollector({
        liveSessionId: "mobile_live_corr_1",
        voiceSessionId: "voice_corr_1",
        interviewSessionId: "interview_corr_1",
      }).snapshot(),
    }) as {
      liveSessionId?: string;
      interviewSessionId?: string;
      voiceSessionId?: string;
      sessionState?: string;
      partialTranscript?: string;
      telemetry?: Record<string, unknown>;
    };

    expect(runtime.liveSessionId).toBe("mobile_live_corr_1");
    expect(runtime.interviewSessionId).toBe("interview_corr_1");
    expect(runtime.voiceSessionId).toBe("voice_corr_1");
    expect(runtime.sessionState).toBe("open");
    expect(runtime.partialTranscript).toBe("hello world");
    expect(runtime.fallbackReason).toBe("none");
    expect((runtime.telemetry?.correlationKey as string) || "").toBe(
      "mobile_live_corr_1::voice_corr_1"
    );
  });

  it("downgrades webrtc mode deterministically when adapter is not implemented", () => {
    const base = resolveVoiceTransportSelection({
      configuredMode: "webrtc",
      websocketUrl: "wss://voice.example/ws",
      isWebRtcAvailable: true,
    });

    const downgraded = downgradeVoiceTransportSelection({
      current: base,
      websocketUrl: "wss://voice.example/ws",
      reason: "webrtc_not_implemented",
    });

    expect(downgraded.requestedMode).toBe("webrtc");
    expect(downgraded.effectiveMode).toBe("websocket");
    expect(downgraded.fallbackReason).toBe("webrtc_not_implemented");
  });

  it("downgrades websocket mode to chunked fallback on runtime websocket errors", () => {
    const base = resolveVoiceTransportSelection({
      configuredMode: "websocket",
      websocketUrl: "wss://voice.example/ws",
      isWebRtcAvailable: false,
    });

    const downgraded = downgradeVoiceTransportSelection({
      current: base,
      websocketUrl: "wss://voice.example/ws",
      reason: "websocket_runtime_error",
    });

    expect(downgraded.requestedMode).toBe("websocket");
    expect(downgraded.effectiveMode).toBe("chunked_fallback");
    expect(downgraded.fallbackReason).toBe("websocket_runtime_error");
  });
});
