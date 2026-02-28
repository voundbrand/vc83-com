import { describe, expect, it } from "vitest";
import { evaluateSupportMessageSafety } from "../../../convex/api/v1/support";

describe("support abuse filter contract", () => {
  it("rejects empty and oversized payloads", () => {
    expect(evaluateSupportMessageSafety("   ")).toMatchObject({
      allowed: false,
      reason: "empty",
      status: 400,
    });

    expect(evaluateSupportMessageSafety("a".repeat(2401))).toMatchObject({
      allowed: false,
      reason: "too_long",
      status: 413,
    });
  });

  it("rejects URL spam and repeated-character spam", () => {
    expect(
      evaluateSupportMessageSafety(
        "https://a.example https://b.example https://c.example https://d.example https://e.example",
      ),
    ).toMatchObject({
      allowed: false,
      reason: "url_spam",
      status: 429,
    });

    expect(evaluateSupportMessageSafety("Helloooooooooooooooooooooooooooo")).toMatchObject({
      allowed: false,
      reason: "repeated_character_spam",
      status: 429,
    });
  });

  it("allows normal support messages", () => {
    expect(
      evaluateSupportMessageSafety("I cannot access billing receipts after upgrading my plan."),
    ).toMatchObject({
      allowed: true,
      reason: "ok",
      status: 200,
    });
  });
});
