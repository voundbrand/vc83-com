export const AUTONOMY_LEVEL_VALUES = [
  "supervised",
  "sandbox",
  "autonomous",
  "delegation",
] as const;

export type AutonomyLevel = (typeof AUTONOMY_LEVEL_VALUES)[number];

export const LEGACY_AUTONOMY_LEVEL_VALUES = ["draft_only"] as const;
export type LegacyAutonomyLevel = (typeof LEGACY_AUTONOMY_LEVEL_VALUES)[number];

export type AutonomyLevelInput = AutonomyLevel | LegacyAutonomyLevel;

export type DomainAutonomyLevel = "sandbox" | "live";
export type AutonomyModeToolScope = "full" | "read_only" | "none";

export const AUTONOMY_TRUST_PROMOTION_MIN_SCORE = 0.8;
export const AUTONOMY_TRUST_PROMOTION_MIN_SIGNALS = 20;
export const AUTONOMY_TRUST_DEMOTION_MAX_SCORE = 0.35;
export const AUTONOMY_TRUST_DEMOTION_MAX_FAILURES = 3;

const AUTONOMY_LEVEL_ORDER: readonly AutonomyLevel[] = [
  "supervised",
  "sandbox",
  "autonomous",
  "delegation",
];

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function readDomainAutonomyRecord(
  domainAutonomy: unknown,
  domain: string,
): Record<string, unknown> | null {
  const root = readRecord(domainAutonomy);
  if (!root) {
    return null;
  }
  const domainRecord = readRecord(root[domain]);
  if (domainRecord) {
    return domainRecord;
  }
  return readRecord(root.default) ?? null;
}

function resolveNextAutonomyLevel(args: {
  current: AutonomyLevel;
  direction: "up" | "down";
}): AutonomyLevel {
  const index = AUTONOMY_LEVEL_ORDER.indexOf(args.current);
  if (index < 0) {
    return args.current;
  }
  if (args.direction === "up") {
    return AUTONOMY_LEVEL_ORDER[Math.min(index + 1, AUTONOMY_LEVEL_ORDER.length - 1)];
  }
  return AUTONOMY_LEVEL_ORDER[Math.max(index - 1, 0)];
}

export function normalizeAutonomyLevel(
  value: unknown,
  fallback: AutonomyLevel = "supervised",
): AutonomyLevel {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (
    normalized === "supervised"
    || normalized === "sandbox"
    || normalized === "autonomous"
    || normalized === "delegation"
  ) {
    return normalized;
  }
  if (normalized === "draft_only") {
    return "sandbox";
  }
  return fallback;
}

export function shouldRestrictToolsToReadOnly(value: unknown): boolean {
  return normalizeAutonomyLevel(value) === "sandbox";
}

export function resolveModeScopedAutonomyLevel(args: {
  autonomyLevel: AutonomyLevelInput;
  modeToolScope: AutonomyModeToolScope;
}): AutonomyLevel {
  const normalized = normalizeAutonomyLevel(args.autonomyLevel);
  if (args.modeToolScope === "full") {
    return normalized;
  }
  return "sandbox";
}

export interface DomainAutonomyResolution {
  domain: string;
  baseAutonomyLevel: AutonomyLevel;
  requestedLevel: DomainAutonomyLevel;
  effectiveLevel: DomainAutonomyLevel;
  source:
    | "domain_override"
    | "base_default"
    | "missing_promotion_evidence"
    | "autonomy_cap";
  hasPromotionEvidence: boolean;
  trustScore?: number;
  trustSignalCount?: number;
}

export function resolveDomainAutonomyLevel(args: {
  domain: string;
  autonomyLevel: AutonomyLevelInput;
  domainAutonomy?: unknown;
  platformCap?: DomainAutonomyLevel;
}): DomainAutonomyResolution {
  const baseAutonomyLevel = normalizeAutonomyLevel(args.autonomyLevel);
  const domainRecord = readDomainAutonomyRecord(args.domainAutonomy, args.domain);
  const configuredLevelRaw = normalizeOptionalString(domainRecord?.level)?.toLowerCase();
  const requestedLevel: DomainAutonomyLevel =
    configuredLevelRaw === "live" ? "live" : "sandbox";
  const promotedAt = toFiniteNumber(domainRecord?.promotedAt);
  const promotedBy = normalizeOptionalString(domainRecord?.promotedBy);
  const hasPromotionEvidence = promotedAt !== null && Boolean(promotedBy);

  let source: DomainAutonomyResolution["source"] = domainRecord
    ? "domain_override"
    : "base_default";
  let effectiveLevel: DomainAutonomyLevel = requestedLevel;

  if (baseAutonomyLevel === "supervised" || baseAutonomyLevel === "sandbox") {
    effectiveLevel = "sandbox";
    source = "autonomy_cap";
  } else if (requestedLevel === "live" && !hasPromotionEvidence) {
    effectiveLevel = "sandbox";
    source = "missing_promotion_evidence";
  }

  if (args.platformCap === "sandbox" && effectiveLevel === "live") {
    effectiveLevel = "sandbox";
    source = "autonomy_cap";
  }

  const trustScore = toFiniteNumber(
    domainRecord?.trustScore ?? domainRecord?.score,
  );
  const trustSignalCount = toFiniteNumber(
    domainRecord?.trustSignalCount ?? domainRecord?.signalCount,
  );

  return {
    domain: args.domain,
    baseAutonomyLevel,
    requestedLevel,
    effectiveLevel,
    source,
    hasPromotionEvidence,
    trustScore: trustScore ?? undefined,
    trustSignalCount: trustSignalCount ?? undefined,
  };
}

export interface AutonomyTrustSnapshot {
  trustScore: number;
  signalCount: number;
  successfulActionCount: number;
  policyViolationCount: number;
  recentFailureCount: number;
  delegationOptIn: boolean;
}

export function normalizeAutonomyTrustSnapshot(
  value: unknown,
): AutonomyTrustSnapshot | null {
  const record = readRecord(value);
  if (!record) {
    return null;
  }

  const trustScore = toFiniteNumber(record.trustScore ?? record.score);
  if (trustScore === null) {
    return null;
  }

  return {
    trustScore,
    signalCount:
      toFiniteNumber(record.signalCount ?? record.trustSignalCount) ?? 0,
    successfulActionCount:
      toFiniteNumber(record.successfulActionCount ?? record.successCount) ?? 0,
    policyViolationCount:
      toFiniteNumber(record.policyViolationCount ?? record.violationCount) ?? 0,
    recentFailureCount:
      toFiniteNumber(record.recentFailureCount ?? record.failureCount) ?? 0,
    delegationOptIn:
      record.delegationOptIn === true || record.explicitDelegationOptIn === true,
  };
}

export interface AutonomyTrustRecommendation {
  action: "promote" | "demote" | "hold";
  fromLevel: AutonomyLevel;
  toLevel: AutonomyLevel;
  trustScore: number;
  signalCount: number;
  reason: string;
}

export function resolveAutonomyTrustRecommendation(args: {
  currentLevel: AutonomyLevelInput;
  snapshot?: unknown;
}): AutonomyTrustRecommendation | null {
  const snapshot = normalizeAutonomyTrustSnapshot(args.snapshot);
  if (!snapshot) {
    return null;
  }

  const fromLevel = normalizeAutonomyLevel(args.currentLevel);
  const demotionTriggered =
    snapshot.policyViolationCount > 0
    || snapshot.recentFailureCount >= AUTONOMY_TRUST_DEMOTION_MAX_FAILURES
    || snapshot.trustScore <= AUTONOMY_TRUST_DEMOTION_MAX_SCORE;

  if (demotionTriggered) {
    const toLevel = resolveNextAutonomyLevel({
      current: fromLevel,
      direction: "down",
    });
    return {
      action: toLevel === fromLevel ? "hold" : "demote",
      fromLevel,
      toLevel,
      trustScore: snapshot.trustScore,
      signalCount: snapshot.signalCount,
      reason:
        toLevel === fromLevel
          ? "Trust regression detected but autonomy is already at minimum level."
          : "Trust regression detected; demotion contract triggered.",
    };
  }

  const promotionEligible =
    snapshot.trustScore >= AUTONOMY_TRUST_PROMOTION_MIN_SCORE
    && snapshot.signalCount >= AUTONOMY_TRUST_PROMOTION_MIN_SIGNALS
    && snapshot.policyViolationCount === 0
    && snapshot.recentFailureCount === 0;

  if (promotionEligible) {
    const toLevel = resolveNextAutonomyLevel({
      current: fromLevel,
      direction: "up",
    });
    if (toLevel === fromLevel) {
      return {
        action: "hold",
        fromLevel,
        toLevel,
        trustScore: snapshot.trustScore,
        signalCount: snapshot.signalCount,
        reason: "Promotion threshold met, but autonomy is already at maximum level.",
      };
    }
    if (toLevel === "delegation" && !snapshot.delegationOptIn) {
      return {
        action: "hold",
        fromLevel,
        toLevel: fromLevel,
        trustScore: snapshot.trustScore,
        signalCount: snapshot.signalCount,
        reason: "Delegation promotion requires explicit delegation opt-in.",
      };
    }
    return {
      action: "promote",
      fromLevel,
      toLevel,
      trustScore: snapshot.trustScore,
      signalCount: snapshot.signalCount,
      reason: "Trust accumulation threshold met; promotion is recommended.",
    };
  }

  return {
    action: "hold",
    fromLevel,
    toLevel: fromLevel,
    trustScore: snapshot.trustScore,
    signalCount: snapshot.signalCount,
    reason: "Trust accumulation is below promotion threshold and above demotion threshold.",
  };
}
