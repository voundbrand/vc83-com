export const AV_RUNTIME_AUTHORITY_PRECEDENCE = "vc83_runtime_policy" as const;
export const AV_APPROVAL_INVARIANT = "non_bypassable" as const;

export const AV_CAPTURE_SESSION_STATUS_VALUES = [
  "idle",
  "running",
  "paused",
  "stopped",
] as const;
export type AvCaptureSessionStatus = (typeof AV_CAPTURE_SESSION_STATUS_VALUES)[number];

export const AV_FALLBACK_REASON_VALUES = [
  "none",
  "policy_restricted",
  "approval_required",
  "session_not_running",
  "session_paused",
  "device_unavailable",
  "capture_provider_error",
  "retry_exhausted",
  "invalid_request",
] as const;
export type AvFallbackReason = (typeof AV_FALLBACK_REASON_VALUES)[number];

export interface AvRetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_AV_RETRY_POLICY: AvRetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 50,
  maxDelayMs: 400,
  backoffMultiplier: 2,
};

export interface AvFallbackPolicyInput {
  sessionStatus: AvCaptureSessionStatus;
  runtimeAuthorityPrecedence?: string;
  policyRestricted?: boolean;
  approvalRequired?: boolean;
  approvalGranted?: boolean;
  error?: unknown;
  attempt?: number;
  maxAttempts?: number;
}

export interface AvFallbackPolicyResolution {
  fallbackReason: AvFallbackReason;
  retryAllowed: boolean;
  blockedByPolicy: boolean;
  nativePolicyPrecedence: typeof AV_RUNTIME_AUTHORITY_PRECEDENCE;
  approvalInvariant: typeof AV_APPROVAL_INVARIANT;
}

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

function normalizeRetryMaxAttempts(maxAttempts: number | undefined): number {
  return normalizePositiveInteger(
    maxAttempts,
    DEFAULT_AV_RETRY_POLICY.maxAttempts
  );
}

function normalizeAttempt(attempt: number | undefined): number {
  return normalizePositiveInteger(attempt, 1);
}

function normalizeRuntimeAuthorityPrecedence(value: string | undefined): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || AV_RUNTIME_AUTHORITY_PRECEDENCE;
}

function normalizeSessionFallbackReason(
  sessionStatus: AvCaptureSessionStatus
): AvFallbackReason {
  if (sessionStatus === "paused") {
    return "session_paused";
  }
  if (sessionStatus !== "running") {
    return "session_not_running";
  }
  return "none";
}

function normalizeErrorToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
}

function isDeviceUnavailableError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  const errorName =
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
      ? normalizeErrorToken(error.name)
      : "";
  if (
    errorName === "notfounderror" ||
    errorName === "notreadableerror" ||
    errorName === "overconstrainederror"
  ) {
    return true;
  }

  const errorCode =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? normalizeErrorToken(error.code)
      : "";
  if (
    errorCode === "device_unavailable" ||
    errorCode === "no_capture_device" ||
    errorCode === "capture_device_unavailable"
  ) {
    return true;
  }

  const errorMessage =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? normalizeErrorToken(error.message)
      : typeof error === "string"
        ? normalizeErrorToken(error)
        : "";
  return errorMessage.includes("device_unavailable");
}

function resolveErrorFallbackReason(args: {
  error: unknown;
  attempt: number;
  maxAttempts: number;
}): AvFallbackReason {
  if (!args.error) {
    return "none";
  }
  if (isDeviceUnavailableError(args.error)) {
    return "device_unavailable";
  }
  if (args.attempt >= args.maxAttempts) {
    return "retry_exhausted";
  }
  return "capture_provider_error";
}

export function normalizeAvRetryPolicy(
  policy?: Partial<AvRetryPolicy>
): AvRetryPolicy {
  const maxAttempts = normalizePositiveInteger(
    policy?.maxAttempts,
    DEFAULT_AV_RETRY_POLICY.maxAttempts
  );
  const baseDelayMs = normalizePositiveInteger(
    policy?.baseDelayMs,
    DEFAULT_AV_RETRY_POLICY.baseDelayMs
  );
  const maxDelayMs = normalizePositiveInteger(
    policy?.maxDelayMs,
    DEFAULT_AV_RETRY_POLICY.maxDelayMs
  );
  const backoffMultiplier = normalizePositiveInteger(
    policy?.backoffMultiplier,
    DEFAULT_AV_RETRY_POLICY.backoffMultiplier
  );

  return {
    maxAttempts,
    baseDelayMs,
    maxDelayMs: Math.max(maxDelayMs, baseDelayMs),
    backoffMultiplier: Math.max(1, backoffMultiplier),
  };
}

export function resolveRetryDelayMs(
  attempt: number,
  retryPolicy: AvRetryPolicy
): number {
  const normalizedPolicy = normalizeAvRetryPolicy(retryPolicy);
  const normalizedAttempt = normalizeAttempt(attempt);
  const exponentialFactor = Math.pow(
    normalizedPolicy.backoffMultiplier,
    Math.max(0, normalizedAttempt - 1)
  );
  const delayMs = Math.floor(normalizedPolicy.baseDelayMs * exponentialFactor);
  return Math.max(1, Math.min(normalizedPolicy.maxDelayMs, delayMs));
}

export function evaluateAvFallbackPolicy(
  input: AvFallbackPolicyInput
): AvFallbackPolicyResolution {
  const runtimeAuthorityPrecedence = normalizeRuntimeAuthorityPrecedence(
    input.runtimeAuthorityPrecedence
  );
  const approvalRequired = input.approvalRequired === true;
  const approvalGranted =
    approvalRequired ? input.approvalGranted === true : true;
  const maxAttempts = normalizeRetryMaxAttempts(input.maxAttempts);
  const attempt = normalizeAttempt(input.attempt);

  if (
    runtimeAuthorityPrecedence !== AV_RUNTIME_AUTHORITY_PRECEDENCE ||
    input.policyRestricted === true
  ) {
    return {
      fallbackReason: "policy_restricted",
      retryAllowed: false,
      blockedByPolicy: true,
      nativePolicyPrecedence: AV_RUNTIME_AUTHORITY_PRECEDENCE,
      approvalInvariant: AV_APPROVAL_INVARIANT,
    };
  }

  if (approvalRequired && !approvalGranted) {
    return {
      fallbackReason: "approval_required",
      retryAllowed: false,
      blockedByPolicy: true,
      nativePolicyPrecedence: AV_RUNTIME_AUTHORITY_PRECEDENCE,
      approvalInvariant: AV_APPROVAL_INVARIANT,
    };
  }

  const sessionFallbackReason = normalizeSessionFallbackReason(input.sessionStatus);
  if (sessionFallbackReason !== "none") {
    return {
      fallbackReason: sessionFallbackReason,
      retryAllowed: false,
      blockedByPolicy: false,
      nativePolicyPrecedence: AV_RUNTIME_AUTHORITY_PRECEDENCE,
      approvalInvariant: AV_APPROVAL_INVARIANT,
    };
  }

  const errorFallbackReason = resolveErrorFallbackReason({
    error: input.error,
    attempt,
    maxAttempts,
  });
  if (errorFallbackReason !== "none") {
    return {
      fallbackReason: errorFallbackReason,
      retryAllowed: errorFallbackReason === "capture_provider_error",
      blockedByPolicy: false,
      nativePolicyPrecedence: AV_RUNTIME_AUTHORITY_PRECEDENCE,
      approvalInvariant: AV_APPROVAL_INVARIANT,
    };
  }

  return {
    fallbackReason: "none",
    retryAllowed: false,
    blockedByPolicy: false,
    nativePolicyPrecedence: AV_RUNTIME_AUTHORITY_PRECEDENCE,
    approvalInvariant: AV_APPROVAL_INVARIANT,
  };
}
