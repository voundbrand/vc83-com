import { describe, expect, it } from "vitest";
import { normalizeTeamHandoffPayload } from "../../../convex/ai/tools/teamTools";

describe("normalizeTeamHandoffPayload", () => {
  it("accepts explicit reason, summary, and goal", () => {
    const normalized = normalizeTeamHandoffPayload({
      reason: "Needs billing specialist",
      summary: "Customer asked about invoice mismatch",
      goal: "Confirm invoice state and explain next steps",
    });

    expect(normalized.error).toBeUndefined();
    expect(normalized.payload).toEqual({
      reason: "Needs billing specialist",
      summary: "Customer asked about invoice mismatch",
      goal: "Confirm invoice state and explain next steps",
    });
  });

  it("falls back to contextNote for summary", () => {
    const normalized = normalizeTeamHandoffPayload({
      reason: "Need CRM expertise",
      contextNote: "Customer needs contact merge across duplicate records",
      goal: "Resolve duplicate and confirm canonical contact",
    });

    expect(normalized.error).toBeUndefined();
    expect(normalized.payload?.summary).toBe(
      "Customer needs contact merge across duplicate records"
    );
  });

  it("returns an error when goal is missing", () => {
    const normalized = normalizeTeamHandoffPayload({
      reason: "Need specialist support",
      summary: "Customer request is outside PM scope",
    });

    expect(normalized.payload).toBeUndefined();
    expect(normalized.error).toBe("tag_in_specialist requires handoff.goal.");
  });
});
