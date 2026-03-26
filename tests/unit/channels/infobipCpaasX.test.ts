import { afterEach, describe, expect, it, vi } from "vitest";
import {
  executeInfobipRequestWithRetry,
  normalizeInfobipRequestMaxAttempts,
  normalizeInfobipRequestTimeoutMs,
} from "../../../convex/channels/infobipCpaasX";

describe("infobip CPaaS X bounded request helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("normalizes timeout and attempts into bounded values", () => {
    expect(normalizeInfobipRequestTimeoutMs(undefined)).toBe(15_000);
    expect(normalizeInfobipRequestTimeoutMs(1)).toBe(250);
    expect(normalizeInfobipRequestTimeoutMs(500_000)).toBe(120_000);

    expect(normalizeInfobipRequestMaxAttempts(undefined)).toBe(2);
    expect(normalizeInfobipRequestMaxAttempts(0)).toBe(1);
    expect(normalizeInfobipRequestMaxAttempts(99)).toBe(4);
  });

  it("retries timeout failures and succeeds on a subsequent attempt", async () => {
    const request = vi
      .fn<(signal: AbortSignal) => Promise<Response>>()
      .mockImplementationOnce(() => new Promise<never>(() => {}))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const promise = executeInfobipRequestWithRetry({
      operation: "provision_org_entity",
      timeoutMs: 40,
      maxAttempts: 2,
      request,
    });

    const response = await promise;

    expect(response.status).toBe(200);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("retries retryable HTTP responses before returning success", async () => {
    const request = vi
      .fn<(signal: AbortSignal) => Promise<Response>>()
      .mockResolvedValueOnce(new Response("server down", { status: 503 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const response = await executeInfobipRequestWithRetry({
      operation: "ensure_platform_application",
      timeoutMs: 1_000,
      maxAttempts: 2,
      request,
    });

    expect(response.status).toBe(200);
    expect(request).toHaveBeenCalledTimes(2);
  });
});
