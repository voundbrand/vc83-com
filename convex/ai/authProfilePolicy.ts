import type { AiBillingSource, AiProviderId } from "../channels/types";

const CANONICAL_PROVIDER_ALIAS: Record<string, AiProviderId> = {
  openrouter: "openrouter",
  openai: "openai",
  anthropic: "anthropic",
  gemini: "gemini",
  google: "gemini",
  grok: "grok",
  xai: "grok",
  mistral: "mistral",
  kimi: "kimi",
  elevenlabs: "elevenlabs",
  openai_compatible: "openai_compatible",
  "openai-compatible": "openai_compatible",
};

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

export interface ProviderAuthProfileLike {
  profileId: string;
  providerId?: AiProviderId | string;
  billingSource?: AiBillingSource | string;
  apiKey?: string;
  enabled: boolean;
  priority?: number;
  cooldownUntil?: number;
  failureCount?: number;
  lastFailureAt?: number;
  lastFailureReason?: string;
}

interface LlmSettingsLike {
  providerId?: AiProviderId | string;
  openrouterApiKey?: string;
  authProfiles?: OpenRouterAuthProfile[];
  providerAuthProfiles?: ProviderAuthProfileLike[];
}

export interface ResolvedAuthProfile {
  profileId: string;
  providerId: AiProviderId;
  billingSource: AiBillingSource;
  apiKey: string;
  priority: number;
  source: "profile" | "legacy" | "env";
}

export interface ResolveAuthProfilesArgs {
  providerId?: AiProviderId | string | null;
  llmSettings?: LlmSettingsLike | null;
  defaultBillingSource?: AiBillingSource | string | null;
  envApiKeysByProvider?: Partial<Record<AiProviderId, string | undefined>>;
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

function normalizeProviderId(value: unknown): AiProviderId | null {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  return CANONICAL_PROVIDER_ALIAS[normalized] ?? null;
}

function normalizeBillingSource(value: unknown): AiBillingSource | null {
  if (value === "platform" || value === "byok" || value === "private") {
    return value;
  }
  return null;
}

function normalizePriority(value: unknown, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(0, Math.floor(value));
}

function getResolvedProviderId(
  args: ResolveAuthProfilesArgs
): AiProviderId {
  return normalizeProviderId(args.providerId) ?? "openrouter";
}

function getDefaultBillingSource(args: ResolveAuthProfilesArgs): AiBillingSource {
  return normalizeBillingSource(args.defaultBillingSource) ?? "platform";
}

function resolveProviderProfiles(
  args: ResolveAuthProfilesArgs,
  providerId: AiProviderId,
  defaultBillingSource: AiBillingSource,
  now: number
): ResolvedAuthProfile[] {
  const rawProfiles = args.llmSettings?.providerAuthProfiles ?? [];
  const fallbackProviderId =
    normalizeProviderId(args.llmSettings?.providerId) ?? "openrouter";
  const resolved: ResolvedAuthProfile[] = [];

  for (let index = 0; index < rawProfiles.length; index += 1) {
    const profile = rawProfiles[index];
    if (!profile || profile.enabled === false) {
      continue;
    }

    const profileProviderId =
      normalizeProviderId(profile.providerId) ?? fallbackProviderId;
    if (profileProviderId !== providerId) {
      continue;
    }

    if (
      typeof profile.cooldownUntil === "number" &&
      profile.cooldownUntil > now
    ) {
      continue;
    }

    const profileId = normalizeString(profile.profileId);
    const apiKey = normalizeString(profile.apiKey);
    if (!profileId || !apiKey) {
      continue;
    }

    resolved.push({
      profileId,
      providerId,
      billingSource:
        normalizeBillingSource(profile.billingSource) ?? defaultBillingSource,
      apiKey,
      priority: normalizePriority(profile.priority, index),
      source: "profile",
    });
  }

  return resolved;
}

function resolveOpenRouterLegacyProfiles(
  args: ResolveAuthProfilesArgs,
  providerId: AiProviderId,
  defaultBillingSource: AiBillingSource,
  now: number
): ResolvedAuthProfile[] {
  if (providerId !== "openrouter") {
    return [];
  }

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
      providerId,
      billingSource: defaultBillingSource,
      apiKey,
      priority: normalizePriority(profile.priority, index),
      source: "profile",
    });
  }

  const legacyKey = normalizeString(args.llmSettings?.openrouterApiKey);
  if (legacyKey) {
    resolved.push({
      profileId: "legacy_openrouter_key",
      providerId,
      billingSource: defaultBillingSource,
      apiKey: legacyKey,
      priority: 10_000,
      source: "legacy",
    });
  }

  return resolved;
}

function resolveEnvProfile(
  args: ResolveAuthProfilesArgs,
  providerId: AiProviderId
): ResolvedAuthProfile[] {
  const envApiKey = normalizeString(
    args.envApiKeysByProvider?.[providerId] ??
      (providerId === "openrouter" ? args.envOpenRouterApiKey : undefined)
  );

  if (!envApiKey) {
    return [];
  }

  const envProfileId =
    providerId === "openrouter"
      ? "env_openrouter_key"
      : `env_${providerId}_key`;

  return [
    {
      profileId: envProfileId,
      providerId,
      billingSource: "platform",
      apiKey: envApiKey,
      priority: 20_000,
      source: "env",
    },
  ];
}

export function resolveAuthProfilesForProvider(
  args: ResolveAuthProfilesArgs
): ResolvedAuthProfile[] {
  const now = args.now ?? Date.now();
  const providerId = getResolvedProviderId(args);
  const defaultBillingSource = getDefaultBillingSource(args);
  const resolved: ResolvedAuthProfile[] = [
    ...resolveProviderProfiles(args, providerId, defaultBillingSource, now),
    ...resolveOpenRouterLegacyProfiles(
      args,
      providerId,
      defaultBillingSource,
      now
    ),
    ...resolveEnvProfile(args, providerId),
  ];

  const deduped = new Map<string, ResolvedAuthProfile>();
  for (const profile of resolved) {
    const key = `${profile.providerId}:${profile.profileId}`;
    const existing = deduped.get(key);
    if (!existing || profile.priority < existing.priority) {
      deduped.set(key, profile);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => a.priority - b.priority);
}

export function resolveOpenRouterAuthProfiles(
  args: Omit<ResolveAuthProfilesArgs, "providerId">
): ResolvedAuthProfile[] {
  return resolveAuthProfilesForProvider({
    ...args,
    providerId: "openrouter",
  });
}

export function buildAuthProfileFailureCountMap(args: {
  providerId?: AiProviderId | string | null;
  llmSettings?: LlmSettingsLike | null;
}): Map<string, number> {
  const targetProviderId = normalizeProviderId(args.providerId) ?? "openrouter";
  const fallbackProviderId =
    normalizeProviderId(args.llmSettings?.providerId) ?? "openrouter";
  const counts = new Map<string, number>();

  for (const profile of args.llmSettings?.providerAuthProfiles ?? []) {
    if (!profile) {
      continue;
    }

    const profileProviderId =
      normalizeProviderId(profile.providerId) ?? fallbackProviderId;
    if (profileProviderId !== targetProviderId) {
      continue;
    }

    const profileId = normalizeString(profile.profileId);
    if (!profileId) {
      continue;
    }

    const failureCount =
      typeof profile.failureCount === "number" && profile.failureCount >= 0
        ? profile.failureCount
        : 0;
    counts.set(profileId, failureCount);
  }

  if (targetProviderId === "openrouter") {
    for (const profile of args.llmSettings?.authProfiles ?? []) {
      if (!profile) {
        continue;
      }

      const profileId = normalizeString(profile.profileId);
      if (!profileId || counts.has(profileId)) {
        continue;
      }

      const failureCount =
        typeof profile.failureCount === "number" && profile.failureCount >= 0
          ? profile.failureCount
          : 0;
      counts.set(profileId, failureCount);
    }
  }

  return counts;
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
