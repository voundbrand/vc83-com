import { describe, expect, it } from "vitest";
import { aggregateAgentToolSuccessFailure } from "../../../convex/ai/agentSessions";
import { aggregateToolSuccessFailure } from "../../../convex/ai/workItems";

describe("agent tool success/failure aggregation", () => {
  it("normalizes statuses and computes success/failure rates", () => {
    const summary = aggregateAgentToolSuccessFailure(
      [
        { status: "success" },
        { status: "error" },
        { status: "disabled" },
        { status: "pending_approval" },
        { status: "unknown_status" },
        {},
      ],
      { windowHours: 24, since: 0 }
    );

    expect(summary.toolResultsScanned).toBe(6);
    expect(summary.successCount).toBe(1);
    expect(summary.failureCount).toBe(2);
    expect(summary.pendingCount).toBe(1);
    expect(summary.ignoredCount).toBe(2);
    expect(summary.successRate).toBe(0.3333);
    expect(summary.failureRate).toBe(0.6667);
  });
});

describe("tool/work-item success-failure aggregation", () => {
  it("returns per-source and combined ratios", () => {
    const summary = aggregateToolSuccessFailure(
      ["success", "failed", "proposed", "cancelled"],
      ["completed", "failed", "executing", undefined],
      { windowHours: 24, since: 0 }
    );

    expect(summary.toolExecutions.successCount).toBe(1);
    expect(summary.toolExecutions.failureCount).toBe(1);
    expect(summary.toolExecutions.pendingCount).toBe(1);
    expect(summary.toolExecutions.ignoredCount).toBe(1);
    expect(summary.toolExecutions.successRate).toBe(0.5);

    expect(summary.workItems.successCount).toBe(1);
    expect(summary.workItems.failureCount).toBe(1);
    expect(summary.workItems.pendingCount).toBe(1);
    expect(summary.workItems.ignoredCount).toBe(1);
    expect(summary.workItems.successRate).toBe(0.5);

    expect(summary.combined.successCount).toBe(2);
    expect(summary.combined.failureCount).toBe(2);
    expect(summary.combined.pendingCount).toBe(2);
    expect(summary.combined.ignoredCount).toBe(2);
    expect(summary.combined.successRate).toBe(0.5);
    expect(summary.combined.failureRate).toBe(0.5);
  });
});
