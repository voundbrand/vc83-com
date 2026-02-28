import { describe, expect, it } from "vitest";
import {
  normalizeDmSummarySyncPayload,
  normalizeTeamHandoffPayload,
} from "../../../convex/ai/tools/teamTools";

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

describe("normalizeDmSummarySyncPayload", () => {
  it("accepts explicit summary bridge payload", () => {
    const normalized = normalizeDmSummarySyncPayload({
      summary: "Specialist validated invoice corrections and refund timeline.",
      dmThreadId: "dm:billing:42",
      syncCheckpointToken: "sync-token-123",
      syncAttemptId: "sync-attempt-1",
    });

    expect(normalized.error).toBeUndefined();
    expect(normalized.payload).toEqual({
      summary: "Specialist validated invoice corrections and refund timeline.",
      dmThreadId: "dm:billing:42",
      syncCheckpointToken: "sync-token-123",
      syncAttemptId: "sync-attempt-1",
    });
  });

  it("falls back to legacy aliases for token and thread fields", () => {
    const normalized = normalizeDmSummarySyncPayload({
      dmSummary: "Specialist proposed approved contract terms.",
      proposalThreadId: "dm:legal:7",
      collaborationSyncToken: "legacy-token",
      eventId: "legacy-event-id",
    });

    expect(normalized.error).toBeUndefined();
    expect(normalized.payload).toEqual({
      summary: "Specialist proposed approved contract terms.",
      dmThreadId: "dm:legal:7",
      syncCheckpointToken: "legacy-token",
      syncAttemptId: "legacy-event-id",
    });
  });

  it("returns an error when dmThreadId is missing", () => {
    const normalized = normalizeDmSummarySyncPayload({
      summary: "Ready to sync summary",
      syncCheckpointToken: "sync-token",
    });

    expect(normalized.payload).toBeUndefined();
    expect(normalized.error).toBe("sync_dm_summary_to_group requires dmThreadId.");
  });
});
