import { Id } from "../_generated/dataModel";

function normalizeTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolvePlatformOrgIdFromEnv(): Id<"organizations"> | null {
  const raw =
    normalizeTrimmedString(process.env.PLATFORM_ORG_ID)
    || normalizeTrimmedString(process.env.TEST_ORG_ID);
  return raw ? (raw as Id<"organizations">) : null;
}

export function isPlatformOrganizationId(
  organizationId: Id<"organizations">,
): boolean {
  const platformOrgId = resolvePlatformOrgIdFromEnv();
  return Boolean(
    platformOrgId
    && String(platformOrgId) === String(organizationId),
  );
}
