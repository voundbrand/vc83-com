/**
 * RETRY POLICY
 *
 * Generic retry wrapper with exponential backoff and jitter.
 * Used by the agent execution pipeline for LLM calls and channel sends.
 *
 * Features:
 * - Configurable max attempts, base delay, backoff multiplier
 * - Random jitter to prevent thundering herd
 * - Retryable status code filtering
 * - Predefined policies for LLM and channel providers
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RetryPolicy {
  /** Maximum number of attempts (including the first) */
  maxAttempts: number;
  /** Base delay in milliseconds before first retry */
  baseDelayMs: number;
  /** Maximum delay cap in milliseconds */
  maxDelayMs: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Jitter factor (0.0-1.0) — randomizes delay by this fraction */
  jitter: number;
  /** HTTP status codes that are retryable */
  retryableStatuses?: number[];
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
}

// ============================================================================
// PREDEFINED POLICIES
// ============================================================================

export const LLM_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 4,
  jitter: 0.1,
  retryableStatuses: [429, 500, 502, 503, 504],
};

export const CHANNEL_RETRY_POLICIES: Record<string, RetryPolicy> = {
  telegram: {
    maxAttempts: 3,
    baseDelayMs: 400,
    maxDelayMs: 10000,
    backoffMultiplier: 3,
    jitter: 0.15,
    retryableStatuses: [429, 500, 502, 503],
  },
  whatsapp: {
    maxAttempts: 3,
    baseDelayMs: 500,
    maxDelayMs: 15000,
    backoffMultiplier: 3,
    jitter: 0.1,
    retryableStatuses: [429, 500, 502, 503],
  },
  sms: {
    maxAttempts: 2,
    baseDelayMs: 1000,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    jitter: 0.1,
    retryableStatuses: [429, 500, 502, 503],
  },
  email: {
    maxAttempts: 3,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 3,
    jitter: 0.1,
    retryableStatuses: [429, 500, 502, 503],
  },
};

/** Fallback model chain for LLM failover */
export const MODEL_FALLBACK_CHAIN: Record<string, string[]> = {
  "anthropic/claude-sonnet-4-20250514": ["openai/gpt-4o", "openai/gpt-4o-mini"],
  "anthropic/claude-3-5-sonnet": ["openai/gpt-4o", "openai/gpt-4o-mini"],
  "openai/gpt-4o": ["anthropic/claude-sonnet-4-20250514", "openai/gpt-4o-mini"],
  "openai/gpt-4o-mini": ["anthropic/claude-sonnet-4-20250514"],
  "google/gemini-pro-1.5": ["anthropic/claude-sonnet-4-20250514", "openai/gpt-4o"],
};

// ============================================================================
// RETRY WRAPPER
// ============================================================================

/**
 * Calculate delay for a retry attempt with exponential backoff and jitter.
 */
function calculateDelay(policy: RetryPolicy, attempt: number): number {
  const exponentialDelay = policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempt);
  const clampedDelay = Math.min(exponentialDelay, policy.maxDelayMs);
  const jitterAmount = clampedDelay * policy.jitter * Math.random();
  return clampedDelay + jitterAmount;
}

/**
 * Check if an error is retryable based on the retry policy.
 */
export function isRetryableError(error: unknown, policy: RetryPolicy): boolean {
  if (!policy.retryableStatuses || policy.retryableStatuses.length === 0) {
    return true; // Retry all errors if no status filter
  }

  // Check for HTTP-like status codes in error
  const err = error as Record<string, unknown>;
  const status = err?.status ?? err?.statusCode ?? (err?.response as Record<string, unknown>)?.status;

  if (typeof status === "number") {
    return policy.retryableStatuses.includes(status);
  }

  // Retry network errors (no status code)
  const message = String(err?.message || "");
  const networkErrors = ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "fetch failed", "network"];
  return networkErrors.some((keyword) => message.toLowerCase().includes(keyword.toLowerCase()));
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry and exponential backoff.
 *
 * @param fn - The async function to execute
 * @param policy - Retry policy configuration
 * @returns The result on success, or throws the last error on exhaustion
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy
): Promise<RetryResult<T>> {
  let lastError: unknown;

  for (let attempt = 0; attempt < policy.maxAttempts; attempt++) {
    try {
      const result = await fn();
      return { result, attempts: attempt + 1 };
    } catch (error) {
      lastError = error;

      // Don't retry if error is not retryable
      if (!isRetryableError(error, policy)) {
        throw error;
      }

      // Don't wait after the last attempt
      if (attempt < policy.maxAttempts - 1) {
        const delay = calculateDelay(policy, attempt);
        console.warn(
          `[Retry] Attempt ${attempt + 1}/${policy.maxAttempts} failed, retrying in ${Math.round(delay)}ms:`,
          error instanceof Error ? error.message : String(error)
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
