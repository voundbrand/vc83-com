import { describe, expect, it } from "vitest";
import {
  resolveVoicePcmCaptureContract,
  resolveVoiceRealtimeSttRoutePrecedence,
  resolveVoiceRealtimeTransportRoutePrecedence,
} from "../../../src/lib/voice-assistant/runtime-policy";

describe("web voice runtime policy", () => {
  it("locks fixed PCM capture contract for ORV-041", () => {
    const contract = resolveVoicePcmCaptureContract("elevenlabs");
    expect(contract.encoding).toBe("pcm_s16le");
    expect(contract.sampleRateHz).toBe(24_000);
    expect(contract.channels).toBe(1);
    expect(contract.frameDurationMs).toBe(20);
    expect(contract.samplesPerFrame).toBe(480);
    expect(contract.frameBytes).toBe(960);
  });

  it("locks realtime transport precedence to websocket primary then webrtc fallback", () => {
    expect(resolveVoiceRealtimeTransportRoutePrecedence()).toEqual([
      "websocket_primary",
      "webrtc_fallback",
    ]);
  });

  it("locks realtime STT precedence to scribe primary then gemini failover", () => {
    expect(resolveVoiceRealtimeSttRoutePrecedence()).toEqual([
      "scribe_v2_realtime_primary",
      "gemini_native_audio_failover",
    ]);
  });
});
