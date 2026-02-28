import { expect, type Page, type TestInfo } from "@playwright/test";

const ABORTED_NAVIGATION_ERROR_PATTERNS = ["net::ERR_ABORTED", "frame was detached"] as const;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_ABORT_RETRY_BUDGET = 2;

export interface ShellNavigationRetryTracker {
  abortedRetries: number;
  totalAttempts: number;
  abortRetryBudget: number;
  abortedPaths: string[];
}

function isAbortedNavigationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return ABORTED_NAVIGATION_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

export function createShellNavigationRetryTracker(
  options: { abortRetryBudget?: number } = {}
): ShellNavigationRetryTracker {
  return {
    abortedRetries: 0,
    totalAttempts: 0,
    abortRetryBudget: options.abortRetryBudget ?? DEFAULT_ABORT_RETRY_BUDGET,
    abortedPaths: [],
  };
}

export async function gotoShellWithRetry(
  page: Page,
  path: string,
  tracker: ShellNavigationRetryTracker,
  maxAttempts = DEFAULT_MAX_ATTEMPTS
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    tracker.totalAttempts += 1;
    try {
      await page.goto(path, { waitUntil: "commit" });
      return;
    } catch (error) {
      const isAborted = isAbortedNavigationError(error);
      const hasRemainingAttempts = attempt < maxAttempts - 1;
      if (!isAborted || !hasRemainingAttempts) {
        throw error;
      }

      tracker.abortedRetries += 1;
      tracker.abortedPaths.push(path);
      if (tracker.abortedRetries > tracker.abortRetryBudget) {
        throw new Error(
          `Exceeded shell navigation abort retry budget (${tracker.abortRetryBudget}). ` +
            `Current retries: ${tracker.abortedRetries}. Last path: ${path}`
        );
      }

      await page.waitForTimeout(300 * (attempt + 1));
    }
  }
}

export function finalizeShellNavigationRetries(
  tracker: ShellNavigationRetryTracker,
  testInfo: TestInfo
) {
  if (tracker.abortedRetries > 0) {
    testInfo.annotations.push({
      type: "shell-abort-retries",
      description: `retries=${tracker.abortedRetries}/${tracker.abortRetryBudget}; paths=${tracker.abortedPaths.join(",")}`,
    });
  }

  expect(
    tracker.abortedRetries,
    `Aborted navigation retry budget exceeded. retries=${tracker.abortedRetries}, budget=${tracker.abortRetryBudget}`
  ).toBeLessThanOrEqual(tracker.abortRetryBudget);
}
