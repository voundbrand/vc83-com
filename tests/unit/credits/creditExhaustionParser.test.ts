import { describe, expect, it } from "vitest";
import { parseCreditExhaustionError } from "../../../convex/credits/index";

describe("parseCreditExhaustionError", () => {
  it("parses ConvexError payloads provided on error.data", () => {
    const parsed = parseCreditExhaustionError({
      data: {
        code: "CREDITS_EXHAUSTED",
        message: "Not enough credits",
        creditsRequired: 5,
        creditsAvailable: 0,
      },
    });

    expect(parsed).toEqual({
      success: false,
      errorCode: "CREDITS_EXHAUSTED",
      message: "Not enough credits",
      creditsRequired: 5,
      creditsAvailable: 0,
    });
  });

  it("parses message-embedded ConvexError JSON", () => {
    const parsed = parseCreditExhaustionError(
      new Error(
        'Uncaught ConvexError: {"code":"CREDITS_EXHAUSTED","message":"Need 5, have 0","creditsRequired":5,"creditsAvailable":0}'
      )
    );

    expect(parsed).toEqual({
      success: false,
      errorCode: "CREDITS_EXHAUSTED",
      message: "Need 5, have 0",
      creditsRequired: 5,
      creditsAvailable: 0,
    });
  });

  it("returns null for non-credit errors", () => {
    const parsed = parseCreditExhaustionError(new Error("network timeout"));
    expect(parsed).toBeNull();
  });
});
