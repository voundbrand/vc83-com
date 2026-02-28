/**
 * Frontend helper for detecting platform-managed L2 soul scope.
 * Mirrors the server-side platform soul scope contract checks.
 */
export function isPlatformManagedL2Soul(
  customProperties: Record<string, unknown> | null | undefined,
): boolean {
  if (!customProperties || typeof customProperties !== "object" || Array.isArray(customProperties)) {
    return false;
  }

  const rawScope = customProperties.soulScope;
  if (!rawScope || typeof rawScope !== "object" || Array.isArray(rawScope)) {
    return false;
  }

  const scope = rawScope as Record<string, unknown>;
  const layer = typeof scope.layer === "string" ? scope.layer.trim().toUpperCase() : null;
  const domain = typeof scope.domain === "string" ? scope.domain.trim().toLowerCase() : null;
  const classification =
    typeof scope.classification === "string" ? scope.classification.trim().toLowerCase() : null;
  const allowPlatformSoulAdmin = scope.allowPlatformSoulAdmin === true;

  return (
    layer === "L2"
    && domain === "platform"
    && classification === "platform_l2"
    && allowPlatformSoulAdmin
  );
}
