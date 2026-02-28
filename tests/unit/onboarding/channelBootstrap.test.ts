import { describe, expect, it } from "vitest";
import {
  calculateChannelFirstMessageLatencyMs,
  extractBetaCodeCandidateFromMessage,
} from "../../../convex/onboarding/channelBootstrap";

describe("channel beta-code bootstrap extraction", () => {
  it("extracts an explicit beta code mention", () => {
    const candidate = extractBetaCodeCandidateFromMessage(
      "Hey, my beta code is fog2-1234 for access."
    );
    expect(candidate).toBe("FOG2-1234");
  });

  it("extracts invite/access code format with mixed casing", () => {
    const candidate = extractBetaCodeCandidateFromMessage(
      "Invite code: aBc123-xy9"
    );
    expect(candidate).toBe("ABC123-XY9");
  });

  it("falls back to token scan when no explicit phrase exists", () => {
    const candidate = extractBetaCodeCandidateFromMessage(
      "Please use code FOG2-9876 when I sign up."
    );
    expect(candidate).toBe("FOG2-9876");
  });

  it("returns null for normal text without code-like tokens", () => {
    const candidate = extractBetaCodeCandidateFromMessage(
      "hello team, can you help me with onboarding today?"
    );
    expect(candidate).toBeNull();
  });

  it("rejects short noisy tokens that are likely not beta codes", () => {
    const candidate = extractBetaCodeCandidateFromMessage(
      "code A1B2C should not pass"
    );
    expect(candidate).toBeNull();
  });
});

describe("channel first-message latency helper", () => {
  it("returns null when connected timestamp is missing", () => {
    expect(
      calculateChannelFirstMessageLatencyMs({
        connectedAt: undefined,
        occurredAt: Date.now(),
      })
    ).toBeNull();
  });

  it("returns the positive millisecond delta", () => {
    expect(
      calculateChannelFirstMessageLatencyMs({
        connectedAt: 1_700_000_000_000,
        occurredAt: 1_700_000_030_500,
      })
    ).toBe(30_500);
  });

  it("clamps negative deltas to zero", () => {
    expect(
      calculateChannelFirstMessageLatencyMs({
        connectedAt: 1_700_000_090_000,
        occurredAt: 1_700_000_030_000,
      })
    ).toBe(0);
  });
});
