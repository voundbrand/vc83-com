import { describe, expect, it } from "vitest";
import {
  isLikelyAmbientTranscript,
  sanitizeTranscriptForVoiceTurn,
} from "../../../apps/operator-mobile/src/lib/voice/transcriptGuard";

describe("mobile voice transcript guard", () => {
  it("filters bracketed ambient descriptors", () => {
    const transcript = "(car passing by) (traffic noise in background)";
    expect(isLikelyAmbientTranscript(transcript)).toBe(true);
    expect(sanitizeTranscriptForVoiceTurn(transcript)).toBeNull();
  });

  it("preserves likely speech transcripts", () => {
    const transcript = "hello operator can you open my inbox";
    expect(isLikelyAmbientTranscript(transcript)).toBe(false);
    expect(sanitizeTranscriptForVoiceTurn(transcript)).toBe(transcript);
  });

  it("does not treat bracketed speech as ambient", () => {
    const transcript = "(hello operator)";
    expect(isLikelyAmbientTranscript(transcript)).toBe(false);
    expect(sanitizeTranscriptForVoiceTurn(transcript)).toBe("(hello operator)");
  });
});
