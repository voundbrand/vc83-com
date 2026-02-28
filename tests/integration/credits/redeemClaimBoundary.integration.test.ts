import { describe, expect, it } from "vitest";
import {
  hasAmbiguousRedeemClaim,
  normalizeRateLimitSegment,
  parseCreditsRedeemPayload,
} from "../../../convex/api/credits";

describe("credits redeem boundary integration", () => {
  it("parses minimal payload with code only", () => {
    const parsed = parseCreditsRedeemPayload({ code: "  VC83-ABCD-EFGH  " });
    expect(parsed).toEqual({
      code: "VC83-ABCD-EFGH",
      idempotencyKey: undefined,
      userId: undefined,
      organizationId: undefined,
    });
  });

  it("rejects payloads without a redeem code", () => {
    expect(() => parseCreditsRedeemPayload({})).toThrow(
      "Missing required field: code"
    );
  });

  it("flags ambiguous user and organization claims", () => {
    const payload = parseCreditsRedeemPayload({
      code: "VC83-ABCD-EFGH",
      userId: "user_other",
      organizationId: "org_other",
    });

    expect(
      hasAmbiguousRedeemClaim({
        payload,
        authUserId: "user_auth",
        authOrganizationId: "org_auth",
      })
    ).toBe(true);
  });

  it("accepts claim payloads that match authenticated identity", () => {
    const payload = parseCreditsRedeemPayload({
      code: "VC83-ABCD-EFGH",
      userId: "user_auth",
      organizationId: "org_auth",
    });

    expect(
      hasAmbiguousRedeemClaim({
        payload,
        authUserId: "user_auth",
        authOrganizationId: "org_auth",
      })
    ).toBe(false);
  });

  it("normalizes rate-limit key segments for throttling guards", () => {
    expect(normalizeRateLimitSegment("  VC83-ABCD-EFGH  ")).toBe("vc83-abcd-efgh");
    expect(normalizeRateLimitSegment("Org:primary/branch")).toBe("org:primarybranch");
    expect(normalizeRateLimitSegment("   ")).toBe("unknown");
    expect(normalizeRateLimitSegment("UPPER_case-123")).toBe("upper_case-123");
  });
});
