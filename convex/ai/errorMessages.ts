/**
 * USER-FACING ERROR MESSAGES
 *
 * Templates for error messages sent to end users when the agent pipeline fails.
 * These should be friendly, non-technical, and never expose internal details.
 *
 * Rule: Users should NEVER see a silent failure. Every error produces a response.
 */

// ============================================================================
// ERROR CODE → USER MESSAGE MAP
// ============================================================================

export const USER_ERROR_MESSAGES: Record<string, string> = {
  CREDITS_EXHAUSTED:
    "I've used up my thinking budget for today. Please try again tomorrow, or contact our team directly if this is urgent.",

  ALL_MODELS_FAILED:
    "I'm having some technical difficulties right now. Our team has been notified. Please try again in a few minutes.",

  AGENT_OFFLINE:
    "I'm currently offline for maintenance. Our team has been notified and I should be back shortly.",

  TOOL_FAILED:
    "I ran into an issue trying to do that. Let me try a different approach, or you can contact our team for help.",

  STUCK:
    "I seem to be having trouble with this request. Let me connect you with our team for assistance.",

  APPROVAL_EXPIRED:
    "I was waiting for authorization to complete that action, but the request has expired. Could you please try again?",

  RATE_LIMITED:
    "I'm getting a lot of messages right now. Give me a moment and try again shortly.",

  SESSION_BUDGET_EXCEEDED:
    "I'm approaching my thinking limit for this conversation. I can still answer questions but won't be able to take actions. Start a new conversation for full capabilities.",

  CHANNEL_SEND_FAILED:
    "I had trouble sending my response. Our team has been notified. Please try again in a moment.",
};

// ============================================================================
// TEMPLATE HELPERS
// ============================================================================

/**
 * Get a user-facing error message for a given error code.
 * Supports template variable substitution: {varName} → value.
 */
export function getUserErrorMessage(
  code: string,
  vars?: Record<string, string | number>
): string {
  let message = USER_ERROR_MESSAGES[code] || USER_ERROR_MESSAGES.ALL_MODELS_FAILED;

  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      message = message.replace(`{${key}}`, String(value));
    }
  }

  return message;
}

// ============================================================================
// ERROR SEVERITY CLASSIFICATION
// ============================================================================

/**
 * Error severity categories:
 * - transient: Temporary issue, retry will likely succeed (network glitch, 429, 5xx)
 * - degraded:  Partially functional — some capabilities lost (tool disabled, fallback model)
 * - fatal:     Permanent failure, no retry will help (auth failed, credits exhausted, 4xx)
 * - loop:      System is stuck in a cycle (tool calling itself, infinite retry, stuck approval)
 */
export type ErrorSeverity = "transient" | "degraded" | "fatal" | "loop";

export interface ClassifiedError {
  /** Error code for user messaging (maps to USER_ERROR_MESSAGES) */
  code: string;
  /** Severity category for pipeline decision-making */
  severity: ErrorSeverity;
  /** Whether the pipeline should retry this error */
  retryable: boolean;
}

/**
 * Classify an error into a severity category and error code.
 * Used by the pipeline to decide: retry, degrade, fail, or break loop.
 */
export function classifyError(error: unknown): ClassifiedError {
  const err = error as Record<string, unknown>;
  const data = err?.data as Record<string, unknown> | undefined;
  const code = err?.code ?? data?.code;
  const message = String(err?.message || "");
  const status = (err?.status ?? err?.statusCode) as number | undefined;

  // --- Fatal: permanent failures, no retry ---
  if (code === "CREDITS_EXHAUSTED" || code === "CHILD_CREDIT_CAP_REACHED" || code === "SHARED_POOL_EXHAUSTED") {
    return { code: "CREDITS_EXHAUSTED", severity: "fatal", retryable: false };
  }
  if (code === "CREDIT_SHARING_DISABLED") {
    return { code: "CREDITS_EXHAUSTED", severity: "fatal", retryable: false };
  }
  if (status === 401 || status === 403) {
    return { code: "AGENT_OFFLINE", severity: "fatal", retryable: false };
  }
  if (status === 404 || status === 400 || status === 422) {
    return { code: "ALL_MODELS_FAILED", severity: "fatal", retryable: false };
  }

  // --- Transient: temporary, retry should work ---
  if (status === 429) {
    return { code: "RATE_LIMITED", severity: "transient", retryable: true };
  }
  if (message.includes("rate limit") || message.includes("Rate limit")) {
    return { code: "RATE_LIMITED", severity: "transient", retryable: true };
  }
  if (status && status >= 500) {
    return { code: "ALL_MODELS_FAILED", severity: "transient", retryable: true };
  }
  if (message.includes("ECONNREFUSED") || message.includes("ETIMEDOUT") || message.includes("fetch failed")) {
    return { code: "ALL_MODELS_FAILED", severity: "transient", retryable: true };
  }
  if (message.includes("socket hang up") || message.includes("ENOTFOUND")) {
    return { code: "ALL_MODELS_FAILED", severity: "transient", retryable: true };
  }

  // --- Loop: system stuck in a cycle ---
  if (message.includes("too many retries") || message.includes("maximum call stack")) {
    return { code: "STUCK", severity: "loop", retryable: false };
  }
  if (message.includes("infinite") || message.includes("recursion")) {
    return { code: "STUCK", severity: "loop", retryable: false };
  }

  // --- Degraded: tool-level failures (pipeline can continue without the tool) ---
  if (message.includes("tool") && message.includes("fail")) {
    return { code: "TOOL_FAILED", severity: "degraded", retryable: false };
  }

  // --- Fallback: treat unknown errors as transient ---
  return { code: "ALL_MODELS_FAILED", severity: "transient", retryable: true };
}
