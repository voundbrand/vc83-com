import { describe, expect, it } from "vitest";
import { normalizeClaimTokenForResponse } from "../../../convex/onboarding/claimTokenResponse";

describe("normalizeClaimTokenForResponse", () => {
  it("returns null for missing or non-string claim token values", () => {
    expect(normalizeClaimTokenForResponse(undefined)).toBeNull();
    expect(normalizeClaimTokenForResponse(null)).toBeNull();
    expect(normalizeClaimTokenForResponse(123)).toBeNull();
  });

  it("returns null for empty claim token strings", () => {
    expect(normalizeClaimTokenForResponse("")).toBeNull();
    expect(normalizeClaimTokenForResponse("   ")).toBeNull();
  });

  it("returns normalized claim tokens for non-empty strings", () => {
    expect(normalizeClaimTokenForResponse("abc.def.ghi")).toBe("abc.def.ghi");
    expect(normalizeClaimTokenForResponse("  token-value  ")).toBe("token-value");
  });
});
