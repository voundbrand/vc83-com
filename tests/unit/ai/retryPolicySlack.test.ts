import { afterEach, describe, expect, it, vi } from "vitest";
import { withRetry } from "../../../convex/ai/retryPolicy";

describe("withRetry Slack rate-limit behavior", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("honors retryAfterMs when policy requests it", async () => {
    vi.useFakeTimers();

    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(
        Object.assign(new Error("ratelimited"), {
          status: 429,
          retryAfterMs: 250,
        })
      )
      .mockResolvedValueOnce("ok");

    const promise = withRetry(fn, {
      maxAttempts: 2,
      baseDelayMs: 10,
      maxDelayMs: 10,
      backoffMultiplier: 1,
      jitter: 0,
      retryableStatuses: [429],
      honorRetryAfter: true,
    });

    await vi.advanceTimersByTimeAsync(249);
    expect(fn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    const result = await promise;

    expect(result.result).toBe("ok");
    expect(result.attempts).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
