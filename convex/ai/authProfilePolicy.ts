export interface OpenRouterAuthProfile {
  profileId: string;
  label?: string;
  openrouterApiKey?: string;
  enabled: boolean;
  priority?: number;
  cooldownUntil?: number;
  failureCount?: number;
  lastFailureAt?: number;
  lastFailureReason?: string;
}

interface LlmSettingsLike {
  openrouterApiKey?: string;
  authProfiles?: OpenRouterAuthProfile[];
}

export interface ResolvedAuthProfile {
  profileId: string;
  apiKey: string;
  priority: number;
  source: "profile" | "legacy" | "env";
}

export interface ResolveAuthProfilesArgs {
  llmSettings?: LlmSettingsLike | null;
  envOpenRouterApiKey?: string;
  now?: number;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePriority(value: unknown, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(0, Math.floor(value));
}

export function resolveOpenRouterAuthProfiles(
  args: ResolveAuthProfilesArgs
): ResolvedAuthProfile[] {
  const now = args.now ?? Date.now();
  const rawProfiles = args.llmSettings?.authProfiles ?? [];
  const resolved: ResolvedAuthProfile[] = [];

  for (let index = 0; index < rawProfiles.length; index += 1) {
    const profile = rawProfiles[index];
    if (!profile || profile.enabled === false) {
      continue;
    }

    if (
      typeof profile.cooldownUntil === "number" &&
      profile.cooldownUntil > now
    ) {
      continue;
    }

    const profileId = normalizeString(profile.profileId);
    const apiKey = normalizeString(profile.openrouterApiKey);
    if (!profileId || !apiKey) {
      continue;
    }

    resolved.push({
      profileId,
      apiKey,
      priority: normalizePriority(profile.priority, index),
      source: "profile",
    });
  }

  const legacyKey = normalizeString(args.llmSettings?.openrouterApiKey);
  if (legacyKey) {
    resolved.push({
      profileId: "legacy_openrouter_key",
      apiKey: legacyKey,
      priority: 10_000,
      source: "legacy",
    });
  }

  const envKey = normalizeString(args.envOpenRouterApiKey);
  if (envKey) {
    resolved.push({
      profileId: "env_openrouter_key",
      apiKey: envKey,
      priority: 20_000,
      source: "env",
    });
  }

  const deduped = new Map<string, ResolvedAuthProfile>();
  for (const profile of resolved) {
    const existing = deduped.get(profile.profileId);
    if (!existing || profile.priority < existing.priority) {
      deduped.set(profile.profileId, profile);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => a.priority - b.priority);
}

export function orderAuthProfilesForSession(
  profiles: ResolvedAuthProfile[],
  pinnedProfileId?: string | null
): ResolvedAuthProfile[] {
  const normalizedPinned = normalizeString(pinnedProfileId);
  if (!normalizedPinned) {
    return profiles;
  }

  const pinned = profiles.find((profile) => profile.profileId === normalizedPinned);
  if (!pinned) {
    return profiles;
  }

  return [pinned, ...profiles.filter((profile) => profile.profileId !== normalizedPinned)];
}

export function isAuthProfileRotatableError(error: unknown): boolean {
  const record = (error ?? {}) as Record<string, unknown>;
  const status =
    record.status ??
    record.statusCode ??
    (record.response as Record<string, unknown> | undefined)?.status;

  if (typeof status === "number") {
    return [401, 402, 403, 429, 500, 502, 503, 504].includes(status);
  }

  const message = String(record.message ?? "").toLowerCase();
  const rotatableSignals = [
    "rate limit",
    "quota",
    "insufficient credits",
    "billing",
    "api key",
    "unauthorized",
    "forbidden",
    "fetch failed",
    "timeout",
    "overloaded",
    "network",
  ];
  return rotatableSignals.some((signal) => message.includes(signal));
}

export function getAuthProfileCooldownMs(failureCount: number): number {
  const normalizedFailures = Math.max(1, Math.floor(failureCount));
  const baseMs = 5 * 60 * 1000;
  const maxMs = 60 * 60 * 1000;
  return Math.min(baseMs * Math.pow(2, normalizedFailures - 1), maxMs);
}
