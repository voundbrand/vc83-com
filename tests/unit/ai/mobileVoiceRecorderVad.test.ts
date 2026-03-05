import { describe, expect, it } from "vitest";

import {
  MOBILE_VOICE_VAD_ENDPOINT_SILENCE_MS,
  MOBILE_VOICE_VAD_SPEECH_RMS_THRESHOLD,
  hasSilenceEndpointElapsed,
  isSpeechFrameEnergy,
  normalizeFrameEnergyRms,
} from "../../../apps/operator-mobile/src/lib/voice/lifecycle";

describe("mobile voice recorder vad", () => {
  it("normalizes invalid frame energy values to zero", () => {
    expect(normalizeFrameEnergyRms(undefined)).toBe(0);
    expect(normalizeFrameEnergyRms(null)).toBe(0);
    expect(normalizeFrameEnergyRms(Number.NaN)).toBe(0);
    expect(normalizeFrameEnergyRms(-0.5)).toBe(0);
  });

  it("detects speech when frame RMS meets or exceeds the 0.015 gate", () => {
    expect(
      isSpeechFrameEnergy({
        energyRms: MOBILE_VOICE_VAD_SPEECH_RMS_THRESHOLD,
      })
    ).toBe(true);
    expect(
      isSpeechFrameEnergy({
        energyRms: MOBILE_VOICE_VAD_SPEECH_RMS_THRESHOLD + 0.002,
      })
    ).toBe(true);
    expect(
      isSpeechFrameEnergy({
        energyRms: MOBILE_VOICE_VAD_SPEECH_RMS_THRESHOLD - 0.0001,
      })
    ).toBe(false);
  });

  it("marks silence endpoint only after 320ms from the last speech sample", () => {
    const lastSpeechDetectedAtMs = 1_000;
    expect(
      hasSilenceEndpointElapsed({
        lastSpeechDetectedAtMs,
        nowMs: lastSpeechDetectedAtMs + MOBILE_VOICE_VAD_ENDPOINT_SILENCE_MS - 1,
      })
    ).toBe(false);
    expect(
      hasSilenceEndpointElapsed({
        lastSpeechDetectedAtMs,
        nowMs: lastSpeechDetectedAtMs + MOBILE_VOICE_VAD_ENDPOINT_SILENCE_MS,
      })
    ).toBe(true);
  });
});
