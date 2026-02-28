import { describe, expect, it } from "vitest";
import {
  CREDITS_API_SCHEMA_VERSION,
  CREDIT_CONSUMPTION_ORDER,
  buildCreditsBucketBreakdown,
  sortCreditHistoryDeterministically,
  toCreditsHistoryEntry,
} from "../../convex/credits/index";

describe("credits api contract integration", () => {
  it("produces canonical three-bucket breakdown with legacy gifted compatibility", () => {
    const buckets = buildCreditsBucketBreakdown({
      giftedCredits: 4,
      dailyCredits: 3,
      monthlyCredits: 2,
      purchasedCredits: 1,
    });

    expect(buckets).toEqual({
      gifted: 7,
      monthly: 2,
      purchased: 1,
      total: 10,
    });
  });

  it("keeps deterministic ordering for history rows with tied timestamps", () => {
    const sorted = sortCreditHistoryDeterministically([
      { _id: "a01", createdAt: 2000, payload: "second" },
      { _id: "b99", createdAt: 2000, payload: "first" },
      { _id: "c10", createdAt: 1999, payload: "third" },
    ]);

    expect(sorted.map((row) => row._id)).toEqual(["b99", "a01", "c10"]);
  });

  it("maps history entries to deterministic envelope rows with all buckets", () => {
    const row = toCreditsHistoryEntry({
      organizationId: "org_abc",
      _id: "txn_001",
      createdAt: 1700000000000,
      type: "monthly_grant",
      creditSource: "monthly",
      amount: 25,
      balanceAfter: {
        daily: 0,
        monthly: 25,
        purchased: 0,
      },
      reason: "monthly_plan_allocation",
      scopeType: "organization",
      scopeOrganizationId: "org_abc",
    });

    expect(CREDITS_API_SCHEMA_VERSION).toBe("2026-02-20");
    expect(CREDIT_CONSUMPTION_ORDER).toEqual(["gifted", "monthly", "purchased"]);
    expect(row.bucketsAfter).toEqual({
      gifted: 0,
      monthly: 25,
      purchased: 0,
      total: 25,
    });
    expect(row.reason).toBe("monthly_plan_allocation");
    expect(row.scopeType).toBe("organization");
    expect(row.scopeOrganizationId).toBe("org_abc");
  });
});
