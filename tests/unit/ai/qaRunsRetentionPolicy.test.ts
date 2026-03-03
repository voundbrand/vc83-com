import { describe, expect, it } from "vitest";

import { resolveQaRunRetentionPolicyDecision } from "../../../convex/ai/qaRuns";

describe("qaRuns retention policy", () => {
  const now = Date.UTC(2026, 2, 3);
  const dayMs = 24 * 60 * 60 * 1000;

  it("deletes completed/failed runs after terminal retention window", () => {
    expect(
      resolveQaRunRetentionPolicyDecision({
        now,
        status: "completed",
        startedAt: now - 40 * dayMs,
        endedAt: now - 31 * dayMs,
        lastActivityAt: now - 31 * dayMs,
      }),
    ).toBe("delete_terminal_expired");

    expect(
      resolveQaRunRetentionPolicyDecision({
        now,
        status: "failed",
        startedAt: now - 35 * dayMs,
        endedAt: now - 31 * dayMs,
        lastActivityAt: now - 31 * dayMs,
      }),
    ).toBe("delete_terminal_expired");
  });

  it("deletes active runs idle beyond active idle window", () => {
    expect(
      resolveQaRunRetentionPolicyDecision({
        now,
        status: "active",
        startedAt: now - 20 * dayMs,
        lastActivityAt: now - 8 * dayMs,
      }),
    ).toBe("delete_active_idle");
  });

  it("retains recent terminal and active runs", () => {
    expect(
      resolveQaRunRetentionPolicyDecision({
        now,
        status: "completed",
        startedAt: now - 10 * dayMs,
        endedAt: now - 3 * dayMs,
        lastActivityAt: now - 3 * dayMs,
      }),
    ).toBe("retain");

    expect(
      resolveQaRunRetentionPolicyDecision({
        now,
        status: "active",
        startedAt: now - 2 * dayMs,
        lastActivityAt: now - 2 * dayMs,
      }),
    ).toBe("retain");
  });
});
