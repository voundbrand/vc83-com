import { describe, expect, it } from "vitest";

import { __test } from "../../../convex/ai/postCaptureDispatcher";

describe("postCaptureDispatcher retry scheduling", () => {
  it("schedules retries only for retryable reason codes within attempt budget", () => {
    const matrix = [
      {
        reasonCode: "lead_email_send_failed" as const,
        attemptCount: 1,
        maxAttempts: 4,
        expected: true,
      },
      {
        reasonCode: "sales_email_send_failed" as const,
        attemptCount: 2,
        maxAttempts: 4,
        expected: true,
      },
      {
        reasonCode: "slack_routing_send_failed" as const,
        attemptCount: 3,
        maxAttempts: 4,
        expected: true,
      },
      {
        reasonCode: "dispatch_unexpected_error" as const,
        attemptCount: 4,
        maxAttempts: 4,
        expected: false,
      },
      {
        reasonCode: "slack_routing_workspace_not_found" as const,
        attemptCount: 1,
        maxAttempts: 4,
        expected: false,
      },
      {
        reasonCode: "slack_routing_missing_workspace_identity" as const,
        attemptCount: 1,
        maxAttempts: 4,
        expected: false,
      },
    ];

    const results = matrix.map((entry) =>
      __test.shouldScheduleRetry({
        reasonCode: entry.reasonCode,
        attemptCount: entry.attemptCount,
        maxAttempts: entry.maxAttempts,
      })
    );

    expect(results).toEqual(matrix.map((entry) => entry.expected));
  });
});
