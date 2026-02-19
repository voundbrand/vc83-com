import { describe, expect, it } from "vitest";
import {
  buildByokCommercialPolicyMetadata,
  getByokCommercialPolicyRuleTable,
  resolveByokCommercialPolicyForTier,
  resolveByokCommercialPolicyFromMetadata,
} from "../../../convex/stripe/byokCommercialPolicy";

describe("byok commercial policy", () => {
  it("maps legacy paid tiers to the pro policy lane", () => {
    const starterPolicy = resolveByokCommercialPolicyForTier("starter");
    const proPolicy = resolveByokCommercialPolicyForTier("pro");

    expect(starterPolicy.normalizedTier).toBe("pro");
    expect(starterPolicy.mode).toBe(proPolicy.mode);
    expect(starterPolicy.byokEligible).toBe(proPolicy.byokEligible);
  });

  it("keeps free tier non-eligible by default", () => {
    const policy = resolveByokCommercialPolicyForTier("free");

    expect(policy.byokEligible).toBe(false);
    expect(policy.mode).toBe("flat_platform_fee");
    expect(policy.flatPlatformFeeCents).toBe(0);
  });

  it("hydrates policy from metadata with safe fallback", () => {
    const enterpriseSeed = resolveByokCommercialPolicyForTier("enterprise");
    const metadata = buildByokCommercialPolicyMetadata(enterpriseSeed);

    const parsed = resolveByokCommercialPolicyFromMetadata({
      metadata: {
        ...metadata,
        byokCommercialModel: "optional_surcharge",
        byokOptionalSurchargeBps: "225",
      },
      fallbackTier: "enterprise",
    });

    expect(parsed.mode).toBe("optional_surcharge");
    expect(parsed.optionalSurchargeBps).toBe(225);
    expect(parsed.byokEligible).toBe(true);
  });

  it("returns an explicit rule table for store visibility", () => {
    const rows = getByokCommercialPolicyRuleTable();

    expect(rows.map((row) => row.tier)).toEqual([
      "free",
      "pro",
      "agency",
      "enterprise",
    ]);
    expect(rows.every((row) => typeof row.summary === "string")).toBe(true);
  });
});
