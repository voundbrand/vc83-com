import { describe, expect, it } from "vitest";
import {
  evaluateCreditRedemptionTargeting,
  normalizeCreditRedemptionCode,
  normalizeCreditTierName,
  resolveCreditRedemptionCodeLifecycle,
} from "../../../convex/credits/index";

describe("credit redemption code primitives", () => {
  it("normalizes redemption code input deterministically", () => {
    expect(normalizeCreditRedemptionCode("  vc83-abcd-efgh  ")).toBe("VC83-ABCD-EFGH");
    expect(normalizeCreditRedemptionCode("a b c d")).toBe("ABCD");
    expect(normalizeCreditRedemptionCode("")).toBe("");
  });

  it("resolves lifecycle status with revoked precedence", () => {
    const now = Date.UTC(2026, 1, 20);
    expect(
      resolveCreditRedemptionCodeLifecycle({
        status: "revoked",
        expiresAt: now - 1000,
        redemptionCount: 20,
        maxRedemptions: 1,
        now,
      })
    ).toBe("revoked");
  });

  it("resolves lifecycle to expired when timestamp is in the past", () => {
    const now = Date.UTC(2026, 1, 20);
    expect(
      resolveCreditRedemptionCodeLifecycle({
        status: "active",
        expiresAt: now - 1000,
        redemptionCount: 0,
        maxRedemptions: 3,
        now,
      })
    ).toBe("expired");
  });

  it("resolves lifecycle to exhausted when usage cap is reached", () => {
    expect(
      resolveCreditRedemptionCodeLifecycle({
        status: "active",
        redemptionCount: 3,
        maxRedemptions: 3,
        now: Date.UTC(2026, 1, 20),
      })
    ).toBe("exhausted");
  });

  it("normalizes known tier aliases", () => {
    expect(normalizeCreditTierName("business")).toBe("agency");
    expect(normalizeCreditTierName("personal")).toBe("starter");
    expect(normalizeCreditTierName("professional")).toBe("professional");
    expect(normalizeCreditTierName("unknown-tier")).toBeNull();
  });

  it("fails closed when targeting policy payload is ambiguous", () => {
    const decision = evaluateCreditRedemptionTargeting({
      organizationTier: "starter",
      organizationId: "org_1",
      userId: "user_1",
      allowedTierNames: ["invalid_tier_name"],
    });

    expect(decision).toEqual({
      eligible: false,
      reason: "invalid_policy",
    });
  });

  it("rejects redeem attempts outside allowed org and user targeting", () => {
    const decision = evaluateCreditRedemptionTargeting({
      organizationTier: "starter",
      organizationId: "org_2",
      userId: "user_2",
      allowedTierNames: ["starter"],
      allowedOrganizationIds: ["org_1"],
      allowedUserIds: ["user_1"],
    });

    expect(decision.eligible).toBe(false);
    expect(decision.reason).toBe("organization_restricted");
  });

  it("accepts redeem attempts when all targeting restrictions match", () => {
    const decision = evaluateCreditRedemptionTargeting({
      organizationTier: "agency",
      organizationId: "org_1",
      userId: "user_1",
      allowedTierNames: ["agency", "enterprise"],
      allowedOrganizationIds: ["org_1"],
      allowedUserIds: ["user_1"],
    });

    expect(decision).toEqual({
      eligible: true,
      reason: "eligible",
    });
  });
});
