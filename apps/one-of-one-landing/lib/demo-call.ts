export const LANDING_DEMO_CALL_INTENT_OBJECT_TYPE = "landing_demo_call_intent";
export const LANDING_DEMO_CALL_INTENT_TTL_MS = 20 * 60 * 1000;

export type LandingDemoCallIntentStatus = "pending" | "matched" | "expired";

export interface LandingDemoCallIntentRecord {
  objectId: string;
  name: string;
  status: LandingDemoCallIntentStatus;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  phoneNormalized: string;
  phoneDigits: string;
  requestedAgentKey: string;
  requestedAgentName: string;
  requestedPersonaName: string;
  language: string;
  landingPath?: string;
  matchedAt?: number;
  matchedProviderCallId?: string;
}

type DemoIntentObjectRecord = {
  _id: string;
  type?: string;
  name?: string;
  status?: string;
  createdAt?: number;
  updatedAt?: number;
  customProperties?: Record<string, unknown>;
};

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeTimestamp(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

export function normalizePhoneDigits(value: unknown): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 16) {
    return null;
  }
  return digits;
}

export function normalizePhoneForLookup(value: unknown): string | null {
  const digits = normalizePhoneDigits(value);
  if (!digits) {
    return null;
  }
  const normalized = normalizeOptionalString(value);
  return normalized?.startsWith("+") ? `+${digits}` : digits;
}

export function formatPhoneForTel(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }
  return trimmed.replace(/\D/g, "");
}

export function readLandingDemoCallIntentRecord(
  record: DemoIntentObjectRecord
): LandingDemoCallIntentRecord | null {
  if (record.type !== LANDING_DEMO_CALL_INTENT_OBJECT_TYPE) {
    return null;
  }

  const customProperties = record.customProperties || {};
  const phoneNormalized =
    normalizePhoneForLookup(customProperties.phoneNormalized) ||
    normalizePhoneForLookup(customProperties.phoneDigits);
  const phoneDigits =
    normalizePhoneDigits(customProperties.phoneDigits) ||
    normalizePhoneDigits(customProperties.phoneNormalized);
  const requestedAgentKey = normalizeOptionalString(customProperties.requestedAgentKey);
  const requestedAgentName = normalizeOptionalString(customProperties.requestedAgentName);
  const requestedPersonaName =
    normalizeOptionalString(customProperties.requestedPersonaName) ||
    requestedAgentName;
  const createdAt = normalizeTimestamp(record.createdAt) || normalizeTimestamp(customProperties.createdAt);
  const updatedAt =
    normalizeTimestamp(record.updatedAt) ||
    normalizeTimestamp(customProperties.updatedAt) ||
    createdAt;
  const expiresAt =
    normalizeTimestamp(customProperties.expiresAt) ||
    (updatedAt ? updatedAt + LANDING_DEMO_CALL_INTENT_TTL_MS : null);
  const language = normalizeOptionalString(customProperties.language) || "en";
  const landingPath = normalizeOptionalString(customProperties.landingPath) || undefined;
  const status =
    record.status === "matched" || record.status === "expired"
      ? record.status
      : "pending";

  if (
    !record._id ||
    !record.name ||
    !phoneNormalized ||
    !phoneDigits ||
    !requestedAgentKey ||
    !requestedAgentName ||
    !requestedPersonaName ||
    !createdAt ||
    !updatedAt ||
    !expiresAt
  ) {
    return null;
  }

  return {
    objectId: record._id,
    name: record.name,
    status,
    createdAt,
    updatedAt,
    expiresAt,
    phoneNormalized,
    phoneDigits,
    requestedAgentKey,
    requestedAgentName,
    requestedPersonaName,
    language,
    landingPath,
    matchedAt: normalizeTimestamp(customProperties.matchedAt) || undefined,
    matchedProviderCallId:
      normalizeOptionalString(customProperties.matchedProviderCallId) || undefined,
  };
}

export function isLandingDemoCallIntentActive(
  record: LandingDemoCallIntentRecord,
  now: number
): boolean {
  return record.expiresAt > now && record.status !== "expired";
}

export function selectLandingDemoCallIntentForCaller(args: {
  records: LandingDemoCallIntentRecord[];
  callerPhone: string;
  now?: number;
  providerCallId?: string;
}): LandingDemoCallIntentRecord | null {
  const phoneDigits = normalizePhoneDigits(args.callerPhone);
  if (!phoneDigits) {
    return null;
  }

  const now = args.now || Date.now();
  const matching = args.records
    .filter((record) => record.phoneDigits === phoneDigits)
    .filter((record) => {
      if (record.status === "matched" && args.providerCallId) {
        return record.matchedProviderCallId === args.providerCallId;
      }
      return isLandingDemoCallIntentActive(record, now);
    })
    .sort((left, right) => right.updatedAt - left.updatedAt);

  return matching[0] || null;
}
