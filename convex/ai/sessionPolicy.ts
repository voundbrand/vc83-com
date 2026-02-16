/**
 * SESSION POLICY
 *
 * Defines session TTL, max duration, per-channel overrides,
 * close behavior, and reopen behavior for agent sessions.
 *
 * Used by:
 * - resolveSession() to check if a session has expired
 * - expireStaleSessions cron to batch-close idle sessions
 * - agentExecution pipeline for session budget checks
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SessionPolicy {
  /** Idle timeout — session closes after this period of no messages. e.g. "24h" */
  defaultTTL: string;
  /** Maximum session duration regardless of activity. e.g. "7d" */
  maxDuration: string;
  /** Per-channel overrides for TTL and maxDuration */
  perChannel?: Record<string, { ttl?: string; maxDuration?: string }>;
  /** What happens when a session closes */
  onClose: "archive" | "summarize_and_archive";
  /** What happens when a user returns after session closure */
  onReopen: "new_session" | "resume";
  /** Per-session credit budget (hard cap per session) */
  maxCreditsPerSession?: number;
}

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_SESSION_POLICY: SessionPolicy = {
  defaultTTL: "24h",
  maxDuration: "7d",
  perChannel: {
    webchat: { ttl: "30m", maxDuration: "2h" },
    sms: { ttl: "1h", maxDuration: "1d" },
    email: { ttl: "72h", maxDuration: "14d" },
  },
  onClose: "archive",
  onReopen: "new_session",
  maxCreditsPerSession: 50,
};

// ============================================================================
// DURATION PARSING
// ============================================================================

const DURATION_UNITS: Record<string, number> = {
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/**
 * Parse a duration string like "24h", "30m", "7d" into milliseconds.
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid duration format: "${duration}". Expected format: "30m", "24h", or "7d".`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  return value * DURATION_UNITS[unit];
}

// ============================================================================
// TTL RESOLUTION
// ============================================================================

/**
 * Resolve effective TTL and maxDuration for a given session policy and channel.
 * Channel overrides take precedence over defaults.
 */
export function resolveSessionTTL(
  policy: SessionPolicy,
  channel: string
): { ttl: number; maxDuration: number } {
  const channelOverride = policy.perChannel?.[channel];

  const ttlStr = channelOverride?.ttl ?? policy.defaultTTL;
  const maxDurationStr = channelOverride?.maxDuration ?? policy.maxDuration;

  return {
    ttl: parseDuration(ttlStr),
    maxDuration: parseDuration(maxDurationStr),
  };
}

/**
 * Extract session policy from an agent config's customProperties.
 * Falls back to DEFAULT_SESSION_POLICY if not configured.
 */
export function getSessionPolicyFromConfig(
  customProperties: Record<string, unknown> | undefined
): SessionPolicy {
  const configured = customProperties?.sessionPolicy as Partial<SessionPolicy> | undefined;
  if (!configured) return DEFAULT_SESSION_POLICY;

  return {
    defaultTTL: configured.defaultTTL ?? DEFAULT_SESSION_POLICY.defaultTTL,
    maxDuration: configured.maxDuration ?? DEFAULT_SESSION_POLICY.maxDuration,
    perChannel: configured.perChannel ?? DEFAULT_SESSION_POLICY.perChannel,
    onClose: configured.onClose ?? DEFAULT_SESSION_POLICY.onClose,
    onReopen: configured.onReopen ?? DEFAULT_SESSION_POLICY.onReopen,
    maxCreditsPerSession: configured.maxCreditsPerSession ?? DEFAULT_SESSION_POLICY.maxCreditsPerSession,
  };
}
