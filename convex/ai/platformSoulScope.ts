/**
 * Platform soul scope resolver.
 *
 * Centralized classification for privileged soul operations.
 * Fail-closed by default: missing/invalid metadata is treated as denied.
 */

export const PLATFORM_SOUL_SCOPE_CAPABILITY = "platform_soul_admin" as const;
export const PLATFORM_SOUL_SCOPE_CLASSIFICATION = "platform_l2" as const;

export type PlatformSoulAction = "view" | "propose" | "approve_apply" | "rollback";

export interface PlatformSoulScopeResolution {
  scopePresent: boolean;
  layer: string | null;
  domain: string | null;
  classification: string | null;
  allowPlatformSoulAdmin: boolean;
  isPlatformL2: boolean;
  isExplicitL3: boolean;
  denialReason: string | null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLayer(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized ? normalized.toUpperCase() : null;
}

function normalizeDomain(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeClassification(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function readSoulScopeRecord(
  customProperties: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  const rawScope = customProperties?.soulScope;
  if (!rawScope || typeof rawScope !== "object" || Array.isArray(rawScope)) {
    return null;
  }
  return rawScope as Record<string, unknown>;
}

export function resolvePlatformSoulScope(
  customProperties: Record<string, unknown> | undefined,
): PlatformSoulScopeResolution {
  const scope = readSoulScopeRecord(customProperties);

  if (!scope) {
    return {
      scopePresent: false,
      layer: null,
      domain: null,
      classification: null,
      allowPlatformSoulAdmin: false,
      isPlatformL2: false,
      isExplicitL3: false,
      denialReason:
        "Target agent is missing `soulScope` metadata. Platform soul access is fail-closed.",
    };
  }

  const layer = normalizeLayer(scope.layer);
  const domain = normalizeDomain(scope.domain);
  const classification = normalizeClassification(scope.classification);
  const allowPlatformSoulAdmin = scope.allowPlatformSoulAdmin === true;

  if (!layer || !domain || !classification) {
    return {
      scopePresent: true,
      layer,
      domain,
      classification,
      allowPlatformSoulAdmin,
      isPlatformL2: false,
      isExplicitL3: layer === "L3" || domain === "user",
      denialReason:
        "Target agent has incomplete `soulScope` metadata (layer/domain/classification required).",
    };
  }

  const isExplicitL3 = layer === "L3" || domain === "user";
  const isPlatformL2 =
    layer === "L2"
    && domain === "platform"
    && classification === PLATFORM_SOUL_SCOPE_CLASSIFICATION
    && allowPlatformSoulAdmin;

  if (isPlatformL2) {
    return {
      scopePresent: true,
      layer,
      domain,
      classification,
      allowPlatformSoulAdmin,
      isPlatformL2: true,
      isExplicitL3,
      denialReason: null,
    };
  }

  if (isExplicitL3) {
    return {
      scopePresent: true,
      layer,
      domain,
      classification,
      allowPlatformSoulAdmin,
      isPlatformL2: false,
      isExplicitL3: true,
      denialReason:
        "platform_soul_admin is restricted to L2 platform-agent souls. L3 user-agent souls are denied.",
    };
  }

  return {
    scopePresent: true,
    layer,
    domain,
    classification,
    allowPlatformSoulAdmin,
    isPlatformL2: false,
    isExplicitL3,
    denialReason:
      "Target agent soul scope is not eligible for platform_soul_admin (requires L2/platform/platform_l2 + allowPlatformSoulAdmin=true).",
  };
}

export function getPlatformSoulActionMatrix(allowed: boolean): Array<{
  action: PlatformSoulAction;
  allowed: boolean;
}> {
  return [
    { action: "view", allowed },
    { action: "propose", allowed },
    { action: "approve_apply", allowed },
    { action: "rollback", allowed },
  ];
}
