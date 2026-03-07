import { describe, expect, it } from "vitest";

import {
  buildSamanthaPostCaptureDispatchCorrelationId,
  buildSamanthaPostCaptureDispatchIdempotencyKey,
  isRetryableDispatchReasonCode,
  resolveSamanthaPostCaptureBackoffMs,
} from "../../../convex/ai/postCaptureDispatcherContracts";

describe("postCaptureDispatcher contracts", () => {
  it("builds deterministic idempotency keys from stable inputs", () => {
    const base = buildSamanthaPostCaptureDispatchIdempotencyKey({
      organizationId: "org_1",
      auditSessionKey: "audit_1",
      leadEmail: "Lead@example.com",
      workflowRecommendation: "Automate intake triage",
    });
    const same = buildSamanthaPostCaptureDispatchIdempotencyKey({
      organizationId: "org_1",
      auditSessionKey: "audit_1",
      leadEmail: " lead@example.com ",
      workflowRecommendation: "Automate intake triage",
    });
    const changed = buildSamanthaPostCaptureDispatchIdempotencyKey({
      organizationId: "org_1",
      auditSessionKey: "audit_1",
      leadEmail: "lead@example.com",
      workflowRecommendation: "Different recommendation",
    });

    expect(base).toEqual(same);
    expect(changed).not.toEqual(base);
  });

  it("builds correlation IDs with org/session and timestamp", () => {
    const correlationId = buildSamanthaPostCaptureDispatchCorrelationId({
      organizationId: "org_2",
      auditSessionKey: "audit_2",
      now: 1_700_000_000_000,
    });

    expect(correlationId).toBe("sam_dispatch:org_2:audit_2:1700000000000");
  });

  it("resolves exponential retry backoff with max cap", () => {
    const delays = [1, 2, 3, 4, 5].map((attemptNumber) =>
      resolveSamanthaPostCaptureBackoffMs({
        attemptNumber,
        baseDelayMs: 1_000,
        maxDelayMs: 8_000,
      })
    );

    expect(delays).toEqual([1_000, 2_000, 4_000, 8_000, 8_000]);
  });

  it("keeps retryable reason codes scoped to transient failures", () => {
    expect(isRetryableDispatchReasonCode("lead_email_send_failed")).toBe(true);
    expect(isRetryableDispatchReasonCode("sales_email_send_failed")).toBe(true);
    expect(isRetryableDispatchReasonCode("slack_routing_send_failed")).toBe(true);

    expect(isRetryableDispatchReasonCode("slack_routing_workspace_not_found")).toBe(false);
    expect(isRetryableDispatchReasonCode("slack_routing_missing_workspace_identity")).toBe(false);
    expect(isRetryableDispatchReasonCode("slack_routing_ambiguous_workspace_identity")).toBe(false);
  });
});
