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
