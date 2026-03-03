import { describe, expect, it } from "vitest";

import { buildVoicePlaybackPlan } from "../../../apps/operator-mobile/src/lib/voice/playback";

describe("mobile voice playback plan", () => {
  it("prefers URL chunks over data URI fallback when native bridge chunk URLs are present", () => {
    const plan = buildVoicePlaybackPlan({
      mimeType: "audio/mpeg",
      audioBase64: "ROOT_BASE64",
      nativeBridge: {
        ttsChunks: [
          {
            sequence: 1,
            mimeType: "audio/mpeg",
            audioUrl: "https://cdn.example.com/chunk-1.mp3",
          },
          {
            sequence: 0,
            mimeType: "audio/mpeg",
            audioUrl: "https://cdn.example.com/chunk-0.mp3",
          },
        ],
      },
    });

    expect(plan.segments).toHaveLength(2);
    expect(plan.segments[0]?.sequence).toBe(0);
    expect(plan.segments[0]?.source).toBe("url");
    expect(plan.segments[1]?.source).toBe("url");
    expect(plan.usedDataUriFallback).toBe(false);
  });

  it("uses data URI only as fallback when no URL chunk source exists", () => {
    const plan = buildVoicePlaybackPlan({
      mimeType: "audio/mpeg",
      audioBase64: "AAAABBBB",
    });

    expect(plan.segments).toHaveLength(1);
    expect(plan.segments[0]?.source).toBe("data_uri");
    expect(plan.usedDataUriFallback).toBe(true);
    expect(plan.segments[0]?.uri.startsWith("data:audio/mpeg;base64,")).toBe(true);
  });

  it("drops unsupported codec chunks and keeps supported segments", () => {
    const plan = buildVoicePlaybackPlan({
      mimeType: "audio/mpeg",
      nativeBridge: {
        audioChunks: [
          {
            sequence: 0,
            mimeType: "audio/webm",
            audioBase64: "WEBM",
          },
          {
            sequence: 1,
            mimeType: "audio/mpeg",
            audioBase64: "MP3",
          },
        ],
      },
    });

    expect(plan.segments).toHaveLength(1);
    expect(plan.segments[0]?.sequence).toBe(1);
    expect(plan.droppedUnsupportedMimeTypes).toContain("audio/webm");
  });
});
