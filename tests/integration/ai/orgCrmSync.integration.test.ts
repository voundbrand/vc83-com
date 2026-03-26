import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ORG_CRM_NARROW_SYNC_V1_CONTRACT_VERSION,
  buildOrgCrmSyncActivitySummary,
  executeOrgCrmSyncDispatchWithRetry,
  normalizeOrgCrmSyncOutboxBatchLimit,
  normalizeOrgCrmSyncDispatchMaxAttempts,
  normalizeOrgCrmSyncDispatchTimeoutMs,
  resolveNarrowCrmSyncOperationPlan,
} from "../../../convex/api/v1/crmInternal";

describe("org CRM narrow sync integration", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("publishes a stable contract version", () => {
    expect(ORG_CRM_NARROW_SYNC_V1_CONTRACT_VERSION).toBe(
      "org_crm_narrow_sync_v1",
    );
  });

  it("normalizes outbox batch limits into bounded values", () => {
    expect(normalizeOrgCrmSyncOutboxBatchLimit(undefined)).toBe(25);
    expect(normalizeOrgCrmSyncOutboxBatchLimit(0)).toBe(1);
    expect(normalizeOrgCrmSyncOutboxBatchLimit(7.9)).toBe(7);
    expect(normalizeOrgCrmSyncOutboxBatchLimit(1000)).toBe(100);
  });

  it("normalizes dispatch timeout/attempt controls into bounded values", () => {
    expect(normalizeOrgCrmSyncDispatchTimeoutMs(undefined)).toBe(20_000);
    expect(normalizeOrgCrmSyncDispatchTimeoutMs(1)).toBe(100);
    expect(normalizeOrgCrmSyncDispatchTimeoutMs(400_000)).toBe(120_000);

    expect(normalizeOrgCrmSyncDispatchMaxAttempts(undefined)).toBe(2);
    expect(normalizeOrgCrmSyncDispatchMaxAttempts(0)).toBe(1);
    expect(normalizeOrgCrmSyncDispatchMaxAttempts(99)).toBe(4);
  });

  it("builds bounded activity summaries with session correlation context", () => {
    expect(
      buildOrgCrmSyncActivitySummary({
        summary: "Follow-up promised with pricing recap.",
        sessionId: "session_1",
        turnId: "turn_2",
        correlationId: "corr_3",
      }),
    ).toContain("session=session_1");

    const oversized = buildOrgCrmSyncActivitySummary({
      summary: "x".repeat(4000),
    });
    expect(oversized).toHaveLength(1200);
  });

  it("keeps org/activity dispatch fail-closed while contact upsert is allowed", () => {
    expect(
      resolveNarrowCrmSyncOperationPlan({
        hasContactEmail: true,
        hasOrganizationPayload: true,
        hasActivitySummary: true,
        supportsOrganizationUpsert: false,
        supportsActivityAppend: false,
      }),
    ).toEqual({
      contact: "applied",
      organization: "skipped_unsupported",
      activity: "skipped_unsupported",
    });

    expect(
      resolveNarrowCrmSyncOperationPlan({
        hasContactEmail: false,
        hasOrganizationPayload: false,
        hasActivitySummary: false,
        supportsOrganizationUpsert: false,
        supportsActivityAppend: false,
      }),
    ).toEqual({
      contact: "skipped_missing_data",
      organization: "skipped_missing_data",
      activity: "skipped_missing_data",
    });
  });

  it("retries time-bounded CRM dispatch operations and succeeds on a later attempt", async () => {
    const operation = vi
      .fn<() => Promise<{ id: string }>>()
      .mockImplementationOnce(() => new Promise<never>(() => {}))
      .mockResolvedValueOnce({ id: "ac_123" });

    const promise = executeOrgCrmSyncDispatchWithRetry({
      timeoutMs: 50,
      maxAttempts: 2,
      operation,
    });

    const result = await promise;

    expect(result).toEqual({ id: "ac_123" });
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("fails closed when all bounded CRM dispatch attempts time out", async () => {
    const operation = vi.fn<() => Promise<{ id: string }>>()
      .mockImplementation(() => new Promise<never>(() => {}));

    const promise = executeOrgCrmSyncDispatchWithRetry({
      timeoutMs: 40,
      maxAttempts: 2,
      operation,
    });

    await expect(promise).rejects.toThrow(/org_crm_sync_dispatch_timeout:40ms/);
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
