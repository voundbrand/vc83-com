import { describe, expect, it } from "vitest";
import {
  GEMINI_LIVE_ACTIVITY_HANDLING_CONTRACT,
  GEMINI_LIVE_TURN_COVERAGE_CONTRACT,
  resolveGeminiLiveRealtimeInputSetupContract,
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

  it("locks Gemini Live setup contract parity with VisionClaw realtime activity handling", () => {
    const setup = resolveGeminiLiveRealtimeInputSetupContract();
    expect(setup.activityHandling).toBe(
      GEMINI_LIVE_ACTIVITY_HANDLING_CONTRACT
    );
    expect(setup.turnCoverage).toBe(
      GEMINI_LIVE_TURN_COVERAGE_CONTRACT
    );
    expect(setup.automaticActivityDetection).toEqual({
      disabled: false,
      startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
      endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
      silenceDurationMs: 500,
      prefixPaddingMs: 40,
    });
    expect(setup.inputAudioTranscriptionEnabled).toBe(true);
    expect(setup.outputAudioTranscriptionEnabled).toBe(true);
  });
});
