export const CALCOM_DEFAULT_API_BASE_URL = "https://api.cal.com/v2";
export const CALCOM_DEFAULT_API_VERSION = "2024-08-13";
export const CALCOM_SLOTS_API_VERSION = "2024-09-04";

export type CalcomCredentialMode = "platform" | "byok";

export function normalizeTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeUrl(value: unknown): string | null {
  const trimmed = normalizeTrimmedString(value);
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function normalizeCalcomApiBaseUrl(value: unknown): string | null {
  const normalized = normalizeUrl(value);
  if (!normalized) {
    return null;
  }
  return normalized.replace(/\/+$/, "");
}

export function normalizePositiveInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

export function resolvePlatformOrgIdFromEnv(): string | null {
  return (
    normalizeTrimmedString(process.env.PLATFORM_ORG_ID) ||
    normalizeTrimmedString(process.env.TEST_ORG_ID) ||
    null
  );
}
