const PLATFORM_MOTHER_TEMPLATE_ROLE_ALIASES = [
  "platform_mother_template",
  "platform_system_bot_template",
] as const;

const PLATFORM_MOTHER_AUTHORITY_ROLE_ALIASES = [
  "mother",
] as const;

const PLATFORM_MOTHER_IDENTITY_ROLE_ALIASES = [
  "platform_mothership",
] as const;

const PLATFORM_MOTHER_RUNTIME_MODE_ALIASES = [
  "onboarding",
  "support",
  "governance",
] as const;

const PLATFORM_MOTHER_IDENTITY_NAME_ALIASES = [
  "mother",
  "quinn",
] as const;

const PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_VALUES = [
  "internal_only",
  "canary",
  "general_availability",
] as const;

const PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_VALUES = [
  "quinn_alias_required",
  "mother_only",
] as const;

export const PLATFORM_MOTHER_TEMPLATE_ROLE = "platform_mother_template";
export const LEGACY_PLATFORM_SYSTEM_BOT_TEMPLATE_ROLE = "platform_system_bot_template";
export const PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE = "platform_mother_support_runtime";
export const PLATFORM_MOTHER_GOVERNANCE_RUNTIME_ROLE = "platform_mother_governance_runtime";
export const PLATFORM_MOTHER_IDENTITY_ROLE = "platform_mothership";
export const PLATFORM_MOTHER_AUTHORITY_ROLE = "mother";
export const PLATFORM_MOTHER_CANONICAL_NAME = "Mother";
export const PLATFORM_MOTHER_LEGACY_NAME = "Quinn";
export const PLATFORM_MOTHER_RUNTIME_MODE_ONBOARDING = "onboarding";
export const PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT = "support";
export const PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE = "governance";
export const PLATFORM_MOTHER_SUPPORT_RELEASE_CONTRACT_VERSION =
  "platform_mother_support_release_v1" as const;
export const PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_CONTRACT_VERSION =
  "platform_mother_support_route_flags_v1" as const;
export const PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_INTERNAL_ONLY =
  "internal_only" as const;
export const PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY =
  "canary" as const;
export const PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_GENERAL_AVAILABILITY =
  "general_availability" as const;
export const PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_QUINN_REQUIRED =
  "quinn_alias_required" as const;
export const PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_MOTHER_ONLY =
  "mother_only" as const;

export type PlatformMotherSupportReleaseStage =
  (typeof PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_VALUES)[number];
export type PlatformMotherAliasCompatibilityMode =
  (typeof PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_VALUES)[number];

export interface PlatformMotherSupportReleaseStatus {
  contractVersion: typeof PLATFORM_MOTHER_SUPPORT_RELEASE_CONTRACT_VERSION;
  stage: PlatformMotherSupportReleaseStage;
  canaryOrganizationIds: string[];
  aliasCompatibilityMode: PlatformMotherAliasCompatibilityMode;
  renameCleanupReady: boolean;
  reviewArtifactId?: string;
  approvedByUserId?: string;
  reviewedAt?: number;
  renameSafetyReviewedAt?: number;
}

export interface PlatformMotherSupportRouteFlagsStatus {
  contractVersion: typeof PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_CONTRACT_VERSION;
  identityEnabled: boolean;
  supportRouteEnabled: boolean;
  reviewArtifactId?: string;
  updatedByUserId?: string;
  updatedAt?: number;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeOptionalString(entry)?.toLowerCase() ?? null)
    .filter((entry): entry is string => Boolean(entry));
}

function normalizeStringArrayPreserveCase(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .map((entry) => normalizeOptionalString(entry))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function normalizeOptionalFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseBooleanEnvFlag(value: string | undefined): boolean {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  return (
    normalized === "1"
    || normalized === "true"
    || normalized === "yes"
    || normalized === "on"
  );
}

function isPlatformMotherSupportReleaseStage(
  value: unknown,
): value is PlatformMotherSupportReleaseStage {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  return Boolean(
    normalized
    && PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_VALUES.includes(
      normalized as PlatformMotherSupportReleaseStage,
    ),
  );
}

function isPlatformMotherAliasCompatibilityMode(
  value: unknown,
): value is PlatformMotherAliasCompatibilityMode {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  return Boolean(
    normalized
    && PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_VALUES.includes(
      normalized as PlatformMotherAliasCompatibilityMode,
    ),
  );
}

function buildDefaultPlatformMotherSupportReleaseStatus(): PlatformMotherSupportReleaseStatus {
  return {
    contractVersion: PLATFORM_MOTHER_SUPPORT_RELEASE_CONTRACT_VERSION,
    stage: PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_INTERNAL_ONLY,
    canaryOrganizationIds: [],
    aliasCompatibilityMode: PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_QUINN_REQUIRED,
    renameCleanupReady: false,
  };
}

function buildDefaultPlatformMotherSupportRouteFlagsStatus(): PlatformMotherSupportRouteFlagsStatus {
  return {
    contractVersion: PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_CONTRACT_VERSION,
    identityEnabled: false,
    supportRouteEnabled: false,
  };
}

function hasPlatformMotherCanonicalIdentity(
  name: unknown,
  customProperties?: Record<string, unknown> | null,
): boolean {
  const canonicalIdentityName = normalizeOptionalString(customProperties?.canonicalIdentityName);
  const runtimeName = normalizeOptionalString(name);
  return (
    canonicalIdentityName?.toLowerCase() === PLATFORM_MOTHER_CANONICAL_NAME.toLowerCase()
    || runtimeName?.toLowerCase() === PLATFORM_MOTHER_CANONICAL_NAME.toLowerCase()
  );
}

function hasPlatformMotherLegacyIdentityAlias(
  customProperties?: Record<string, unknown> | null,
): boolean {
  return normalizeStringArray(customProperties?.legacyIdentityAliases)
    .some((entry) => entry === PLATFORM_MOTHER_LEGACY_NAME.toLowerCase());
}

export function isPlatformMotherIdentityEnabled(): boolean {
  return parseBooleanEnvFlag(process.env.PLATFORM_MOTHER_IDENTITY_ENABLED);
}

export function isPlatformMotherSupportRouteEnabled(): boolean {
  return parseBooleanEnvFlag(process.env.PLATFORM_MOTHER_SUPPORT_ROUTE_ENABLED);
}

export function isPlatformMotherRenameQuinnEnabled(): boolean {
  return parseBooleanEnvFlag(process.env.PLATFORM_MOTHER_RENAME_QUINN_ENABLED);
}

export function readPlatformMotherSupportReleaseStatus(
  customProperties: Record<string, unknown> | null | undefined,
): PlatformMotherSupportReleaseStatus {
  const defaultStatus = buildDefaultPlatformMotherSupportReleaseStatus();
  const rawValue = customProperties?.platformMotherSupportRelease;
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
    return defaultStatus;
  }

  const record = rawValue as Record<string, unknown>;
  const contractVersion = normalizeOptionalString(record.contractVersion);
  if (
    contractVersion
    && contractVersion !== PLATFORM_MOTHER_SUPPORT_RELEASE_CONTRACT_VERSION
  ) {
    return defaultStatus;
  }

  const rawStage = normalizeOptionalString(record.stage)?.toLowerCase();
  if (!rawStage || !isPlatformMotherSupportReleaseStage(rawStage)) {
    return defaultStatus;
  }

  const rawAliasCompatibilityMode =
    normalizeOptionalString(record.aliasCompatibilityMode)?.toLowerCase();
  const aliasCompatibilityMode = rawAliasCompatibilityMode
    && isPlatformMotherAliasCompatibilityMode(rawAliasCompatibilityMode)
      ? rawAliasCompatibilityMode
      : PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_QUINN_REQUIRED;
  const canaryOrganizationIds = normalizeStringArrayPreserveCase(
    record.canaryOrganizationIds,
  );
  const renameCleanupReady = record.renameCleanupReady === true;
  const reviewArtifactId = normalizeOptionalString(record.reviewArtifactId);
  const approvedByUserId = normalizeOptionalString(record.approvedByUserId);
  const reviewedAt = normalizeOptionalFiniteNumber(record.reviewedAt);
  const renameSafetyReviewedAt = normalizeOptionalFiniteNumber(
    record.renameSafetyReviewedAt,
  );

  if (
    rawStage === PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY
    && canaryOrganizationIds.length === 0
  ) {
    return defaultStatus;
  }
  if (
    rawStage !== PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_INTERNAL_ONLY
    && (!reviewArtifactId || !approvedByUserId || reviewedAt === null)
  ) {
    return defaultStatus;
  }
  if (
    aliasCompatibilityMode === PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_MOTHER_ONLY
    && (!renameCleanupReady || renameSafetyReviewedAt === null)
  ) {
    return defaultStatus;
  }

  return {
    contractVersion: PLATFORM_MOTHER_SUPPORT_RELEASE_CONTRACT_VERSION,
    stage: rawStage,
    canaryOrganizationIds,
    aliasCompatibilityMode,
    renameCleanupReady,
    ...(reviewArtifactId ? { reviewArtifactId } : {}),
    ...(approvedByUserId ? { approvedByUserId } : {}),
    ...(reviewedAt !== null ? { reviewedAt } : {}),
    ...(renameSafetyReviewedAt !== null ? { renameSafetyReviewedAt } : {}),
  };
}

export function readPlatformMotherSupportRouteFlagsStatus(
  customProperties: Record<string, unknown> | null | undefined,
): PlatformMotherSupportRouteFlagsStatus {
  const defaultStatus = buildDefaultPlatformMotherSupportRouteFlagsStatus();
  const rawValue = customProperties?.platformMotherSupportRouteFlags;
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
    return defaultStatus;
  }

  const record = rawValue as Record<string, unknown>;
  const contractVersion = normalizeOptionalString(record.contractVersion);
  if (
    contractVersion
    && contractVersion !== PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_CONTRACT_VERSION
  ) {
    return defaultStatus;
  }

  const identityEnabled = record.identityEnabled === true;
  const supportRouteEnabled = record.supportRouteEnabled === true;
  const reviewArtifactId = normalizeOptionalString(record.reviewArtifactId);
  const updatedByUserId = normalizeOptionalString(record.updatedByUserId);
  const updatedAt = normalizeOptionalFiniteNumber(record.updatedAt);

  if (
    (identityEnabled || supportRouteEnabled)
    && (!reviewArtifactId || !updatedByUserId || updatedAt === null)
  ) {
    return defaultStatus;
  }

  return {
    contractVersion: PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_CONTRACT_VERSION,
    identityEnabled,
    supportRouteEnabled,
    ...(reviewArtifactId ? { reviewArtifactId } : {}),
    ...(updatedByUserId ? { updatedByUserId } : {}),
    ...(updatedAt !== null ? { updatedAt } : {}),
  };
}

export function resolvePlatformMotherSupportRouteAvailability(args: {
  requestingOrganizationId?: string;
  name?: unknown;
  status?: unknown;
  customProperties?: Record<string, unknown> | null;
}): {
  enabled: boolean;
  identityEnabled: boolean;
  supportRouteEnabled: boolean;
  customerFacingRuntime: boolean;
  renameSafetySatisfied: boolean;
  releaseStage: PlatformMotherSupportReleaseStage;
  aliasCompatibilityMode: PlatformMotherAliasCompatibilityMode;
  canaryAllowlisted: boolean;
  reviewArtifactId?: string;
} {
  const releaseStatus = readPlatformMotherSupportReleaseStatus(args.customProperties);
  const routeFlagsStatus = readPlatformMotherSupportRouteFlagsStatus(
    args.customProperties,
  );
  const customerFacingRuntime = isPlatformMotherCustomerFacingRuntime({
    name: args.name,
    status: args.status,
    customProperties: args.customProperties,
  });
  const identityEnabled =
    isPlatformMotherIdentityEnabled() || routeFlagsStatus.identityEnabled;
  const supportRouteEnabled =
    isPlatformMotherSupportRouteEnabled() || routeFlagsStatus.supportRouteEnabled;
  const canonicalIdentityMatched = hasPlatformMotherCanonicalIdentity(
    args.name,
    args.customProperties,
  );
  const renameSafetySatisfied =
    releaseStatus.aliasCompatibilityMode === PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_MOTHER_ONLY
      ? canonicalIdentityMatched
        && releaseStatus.renameCleanupReady
        && Boolean(releaseStatus.renameSafetyReviewedAt)
        && isPlatformMotherRenameQuinnEnabled()
      : canonicalIdentityMatched
        && hasPlatformMotherLegacyIdentityAlias(args.customProperties);
  const canaryAllowlisted =
    releaseStatus.stage !== PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY
    || (
      Boolean(args.requestingOrganizationId)
      && releaseStatus.canaryOrganizationIds.includes(String(args.requestingOrganizationId))
    );
  const enabled = Boolean(
    customerFacingRuntime
    && identityEnabled
    && supportRouteEnabled
    && renameSafetySatisfied
    && releaseStatus.stage !== PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_INTERNAL_ONLY
    && canaryAllowlisted
  );

  return {
    enabled,
    identityEnabled,
    supportRouteEnabled,
    customerFacingRuntime,
    renameSafetySatisfied,
    releaseStage: releaseStatus.stage,
    aliasCompatibilityMode: releaseStatus.aliasCompatibilityMode,
    canaryAllowlisted,
    ...(releaseStatus.reviewArtifactId
      ? { reviewArtifactId: releaseStatus.reviewArtifactId }
      : {}),
  };
}

export function canUsePlatformMotherCustomerFacingSupport(args: {
  requestingOrganizationId?: string;
  name?: unknown;
  status?: unknown;
  customProperties?: Record<string, unknown> | null;
}): boolean {
  return resolvePlatformMotherSupportRouteAvailability(args).enabled;
}

export function isPlatformMotherTemplateRole(value: unknown): boolean {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  return normalized != null
    && PLATFORM_MOTHER_TEMPLATE_ROLE_ALIASES.includes(
      normalized as typeof PLATFORM_MOTHER_TEMPLATE_ROLE_ALIASES[number],
    );
}

export function hasPlatformMotherTemplateRole(
  customProperties: Record<string, unknown> | null | undefined,
): boolean {
  if (!customProperties) {
    return false;
  }
  if (isPlatformMotherTemplateRole(customProperties.templateRole)) {
    return true;
  }
  if (isPlatformMotherTemplateRole(customProperties.canonicalTemplateRole)) {
    return true;
  }
  return normalizeStringArray(customProperties.templateRoleAliases)
    .some((entry) => isPlatformMotherTemplateRole(entry));
}

export function matchesPlatformMotherIdentityName(
  name: unknown,
  customProperties?: Record<string, unknown> | null,
): boolean {
  const normalizedName = normalizeOptionalString(name)?.toLowerCase();
  if (
    normalizedName != null
    && PLATFORM_MOTHER_IDENTITY_NAME_ALIASES.includes(
      normalizedName as typeof PLATFORM_MOTHER_IDENTITY_NAME_ALIASES[number],
    )
  ) {
    return true;
  }

  if (!customProperties) {
    return false;
  }

  const canonicalIdentityName = normalizeOptionalString(customProperties.canonicalIdentityName)
    ?.toLowerCase();
  if (
    canonicalIdentityName != null
    && PLATFORM_MOTHER_IDENTITY_NAME_ALIASES.includes(
      canonicalIdentityName as typeof PLATFORM_MOTHER_IDENTITY_NAME_ALIASES[number],
    )
  ) {
    return true;
  }

  return normalizeStringArray(customProperties.legacyIdentityAliases)
    .some((entry) =>
      PLATFORM_MOTHER_IDENTITY_NAME_ALIASES.includes(
        entry as typeof PLATFORM_MOTHER_IDENTITY_NAME_ALIASES[number],
      ));
}

function isPlatformMotherAuthorityRole(value: unknown): boolean {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  return normalized != null
    && PLATFORM_MOTHER_AUTHORITY_ROLE_ALIASES.includes(
      normalized as typeof PLATFORM_MOTHER_AUTHORITY_ROLE_ALIASES[number],
    );
}

function isPlatformMotherIdentityRole(value: unknown): boolean {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  return normalized != null
    && PLATFORM_MOTHER_IDENTITY_ROLE_ALIASES.includes(
      normalized as typeof PLATFORM_MOTHER_IDENTITY_ROLE_ALIASES[number],
    );
}

function isPlatformMotherRuntimeMode(value: unknown): boolean {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  return normalized != null
    && PLATFORM_MOTHER_RUNTIME_MODE_ALIASES.includes(
      normalized as typeof PLATFORM_MOTHER_RUNTIME_MODE_ALIASES[number],
    );
}

export function readPlatformMotherRuntimeMode(
  customProperties: Record<string, unknown> | null | undefined,
): "onboarding" | "support" | "governance" | null {
  if (!customProperties) {
    return null;
  }
  const normalized = normalizeOptionalString(customProperties.runtimeMode)?.toLowerCase();
  if (!normalized || !isPlatformMotherRuntimeMode(normalized)) {
    return null;
  }
  switch (normalized) {
    case PLATFORM_MOTHER_RUNTIME_MODE_ONBOARDING:
      return PLATFORM_MOTHER_RUNTIME_MODE_ONBOARDING;
    case PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT:
      return PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT;
    case PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE:
      return PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE;
    default:
      return null;
  }
}

export function isPlatformMotherAuthorityRecord(
  name: unknown,
  customProperties?: Record<string, unknown> | null,
): boolean {
  if (matchesPlatformMotherIdentityName(name, customProperties)) {
    return true;
  }

  if (!customProperties) {
    return false;
  }

  if (isPlatformMotherAuthorityRole(customProperties.authorityRole)) {
    return true;
  }
  if (isPlatformMotherIdentityRole(customProperties.identityRole)) {
    return true;
  }
  if (hasPlatformMotherTemplateRole(customProperties)) {
    return true;
  }

  return false;
}

export function isPlatformMotherCustomerFacingRuntime(
  args: {
    name?: unknown;
    status?: unknown;
    customProperties?: Record<string, unknown> | null;
  },
): boolean {
  const normalizedStatus = normalizeOptionalString(args.status)?.toLowerCase();
  if (normalizedStatus !== "active") {
    return false;
  }
  if (!isPlatformMotherAuthorityRecord(args.name, args.customProperties)) {
    return false;
  }
  return (
    readPlatformMotherRuntimeMode(args.customProperties)
    === PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT
  );
}
