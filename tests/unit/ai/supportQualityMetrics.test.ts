import { describe, expect, it } from "vitest";
import {
  aggregateSupportQualityMetrics,
  classifySupportSentiment,
  type SupportQualitySessionRecord,
} from "../../../convex/ai/workItems";

describe("support sentiment classifier", () => {
  it("classifies positive, neutral, and negative support messages", () => {
    expect(classifySupportSentiment("Thanks, this is fixed now.")).toBe("positive");
    expect(classifySupportSentiment("I need help with my account")).toBe("neutral");
    expect(classifySupportSentiment("This is still broken and I am frustrated")).toBe("negative");
  });
});

describe("support quality aggregation", () => {
  it("separates AI-resolved vs human-escalated outcomes", () => {
    const records: SupportQualitySessionRecord[] = [
      {
        sessionId: "session_1",
        messageCount: 6,
        startedAt: Date.UTC(2026, 1, 20, 10, 0, 0),
        lastMessageAt: Date.UTC(2026, 1, 20, 10, 12, 0),
        finalUserSentiment: "positive",
        hasEscalation: false,
      },
      {
        sessionId: "session_2",
        messageCount: 9,
        startedAt: Date.UTC(2026, 1, 20, 11, 0, 0),
        lastMessageAt: Date.UTC(2026, 1, 20, 11, 22, 0),
        finalUserSentiment: "negative",
        hasEscalation: true,
        escalationStatus: "resolved",
      },
      {
        sessionId: "session_3",
        messageCount: 5,
        startedAt: Date.UTC(2026, 1, 21, 9, 30, 0),
        lastMessageAt: Date.UTC(2026, 1, 21, 9, 40, 0),
        finalUserSentiment: "neutral",
        hasEscalation: true,
        escalationStatus: "dismissed",
      },
      {
        sessionId: "session_4",
        messageCount: 11,
        startedAt: Date.UTC(2026, 1, 21, 12, 0, 0),
        lastMessageAt: Date.UTC(2026, 1, 21, 12, 45, 0),
        finalUserSentiment: "negative",
        hasEscalation: true,
        escalationStatus: "pending",
      },
    ];

    const summary = aggregateSupportQualityMetrics(records, {
      windowHours: 24,
      since: Date.UTC(2026, 1, 20, 0, 0, 0),
    });

    expect(summary.totalSessions).toBe(4);
    expect(summary.aiResolvedSessions).toBe(2);
    expect(summary.humanEscalatedSessions).toBe(2);
    expect(summary.unresolvedSessions).toBe(0);
    expect(summary.resolutionRate).toBe(0.5);
    expect(summary.escalationRate).toBe(0.5);

    expect(summary.sentimentOutcomes).toEqual({
      positive: 1,
      neutral: 1,
      negative: 2,
    });

    expect(summary.escalationOutcomes).toEqual({
      pending: 1,
      taken_over: 0,
      resolved: 1,
      dismissed: 1,
      timed_out: 0,
    });

    expect(summary.sentimentTrend).toEqual([
      {
        date: "2026-02-20",
        positive: 1,
        neutral: 0,
        negative: 1,
        total: 2,
      },
      {
        date: "2026-02-21",
        positive: 0,
        neutral: 1,
        negative: 1,
        total: 2,
      },
    ]);
  });
});
