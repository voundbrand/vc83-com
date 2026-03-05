import { action, internalQuery, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";
import { ONBOARDING_DEFAULT_MODEL_ID } from "../ai/modelDefaults";
import { resolveOrganizationProviderBindingForProvider } from "../ai/providerRegistry";
import { resolveDeterministicOrgDefaultVoiceId } from "../ai/voiceDefaults";
import type { Id } from "../_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../_generated/api");

const ELEVENLABS_PROFILE_ID = "voice_runtime_default";
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";
const elevenLabsBillingSourceValidator = v.union(
  v.literal("platform"),
  v.literal("byok"),
  v.literal("private"),
);

type ElevenLabsProviderProfile = {
  profileId: string;
  providerId: "elevenlabs";
  label?: string;
  baseUrl?: string;
  credentialSource?:
    | "platform_env"
    | "platform_vault"
    | "organization_setting"
    | "organization_auth_profile"
    | "integration_connection";
  billingSource?: "platform" | "byok" | "private";
  apiKey?: string;
  encryptedFields?: string[];
  capabilities?: {
    text: boolean;
    vision: boolean;
    audio_in: boolean;
    audio_out: boolean;
    tools: boolean;
    json: boolean;
  };
  enabled: boolean;
  priority?: number;
  cooldownUntil?: number;
  failureCount?: number;
  lastFailureAt?: number;
  lastFailureReason?: string;
  metadata?: unknown;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeBaseUrl(value: unknown): string | undefined {
  const normalized = normalizeString(value);
  return normalized ? normalized.replace(/\/+$/, "") : undefined;
}

function normalizeBillingSource(value: unknown): "platform" | "byok" | "private" | null {
  return value === "platform" || value === "byok" || value === "private"
    ? value
    : null;
}

function getPlatformElevenLabsApiKey(): string | null {
  return normalizeString(process.env.ELEVENLABS_API_KEY);
}

async function isUserSuperAdminByUserId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  userId: Id<"users">,
): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (!user?.global_role_id) {
    return false;
  }
  const role = await ctx.db.get(user.global_role_id);
  return Boolean(role && role.name === "super_admin");
}

function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const typed = payload as Record<string, unknown>;
  const directMessage = normalizeString(typed.message);
  if (directMessage) {
    return directMessage;
  }
  const nestedError = typed.error;
  if (typeof nestedError === "object" && nestedError !== null) {
    return normalizeString(
      (nestedError as Record<string, unknown>).message,
    );
  }
  return null;
}

function parseJsonSafely(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function encodeArrayBufferToBase64(buffer: ArrayBuffer): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes = new Uint8Array(buffer);
  let output = "";

  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    const chunk = (b0 << 16) | (b1 << 8) | b2;

    output += alphabet[(chunk >> 18) & 63];
    output += alphabet[(chunk >> 12) & 63];
    output += i + 1 < bytes.length ? alphabet[(chunk >> 6) & 63] : "=";
    output += i + 2 < bytes.length ? alphabet[chunk & 63] : "=";
  }

  return output;
}

type ElevenLabsVoiceCatalogEntry = {
  voiceId: string;
  name: string;
  category?: string;
  previewUrl?: string;
  language?: string;
  languages?: string[];
  labels: Record<string, string>;
};

function normalizeVoiceLabels(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const labels: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    const key = normalizeString(rawKey);
    const normalizedValue = normalizeString(rawValue);
    if (!key || !normalizedValue) {
      continue;
    }
    labels[key] = normalizedValue;
  }
  return labels;
}

function appendNormalizedVoiceLanguage(
  target: string[],
  seen: Set<string>,
  value: unknown,
): void {
  const normalized = normalizeString(value);
  if (!normalized) {
    return;
  }
  const key = normalized.toLowerCase();
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  target.push(normalized);
}

function collectVoiceLanguages(
  record: Record<string, unknown>,
  labels: Record<string, string>,
): string[] {
  const languages: string[] = [];
  const seen = new Set<string>();

  appendNormalizedVoiceLanguage(languages, seen, labels.language);
  appendNormalizedVoiceLanguage(languages, seen, labels.locale);
  appendNormalizedVoiceLanguage(languages, seen, labels.accent);
  appendNormalizedVoiceLanguage(languages, seen, labels.lang);
  appendNormalizedVoiceLanguage(languages, seen, record.language);
  appendNormalizedVoiceLanguage(languages, seen, record.locale);
  appendNormalizedVoiceLanguage(languages, seen, record.accent);

  const appendFromMetadataArray = (value: unknown) => {
    if (!Array.isArray(value)) {
      return;
    }
    for (const item of value) {
      if (typeof item === "string") {
        appendNormalizedVoiceLanguage(languages, seen, item);
        continue;
      }
      if (!item || typeof item !== "object") {
        continue;
      }
      const metadata = item as Record<string, unknown>;
      appendNormalizedVoiceLanguage(languages, seen, metadata.language);
      appendNormalizedVoiceLanguage(languages, seen, metadata.locale);
      appendNormalizedVoiceLanguage(languages, seen, metadata.accent);
      appendNormalizedVoiceLanguage(languages, seen, metadata.language_code);
      appendNormalizedVoiceLanguage(languages, seen, metadata.languageCode);
      appendNormalizedVoiceLanguage(languages, seen, metadata.name);
      appendNormalizedVoiceLanguage(languages, seen, metadata.code);
    }
  };

  appendFromMetadataArray(record.languages);
  appendFromMetadataArray(record.verified_languages);
  appendFromMetadataArray(record.verifiedLanguages);

  return languages;
}

function normalizeElevenLabsVoiceCatalogEntry(
  value: unknown,
): ElevenLabsVoiceCatalogEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const voiceId =
    normalizeString(record.voice_id) ??
    normalizeString(record.voiceId);
  if (!voiceId) {
    return null;
  }

  const labels = normalizeVoiceLabels(record.labels);
  const languages = collectVoiceLanguages(record, labels);
  const primaryLanguage = languages[0];

  return {
    voiceId,
    name: normalizeString(record.name) ?? voiceId,
    category: normalizeString(record.category) ?? undefined,
    previewUrl:
      normalizeString(record.preview_url) ??
      normalizeString(record.previewUrl) ??
      undefined,
    ...(primaryLanguage ? { language: primaryLanguage } : {}),
    ...(languages.length > 0 ? { languages } : {}),
    labels,
  };
}

function matchesVoiceSearch(
  voice: ElevenLabsVoiceCatalogEntry,
  searchToken: string,
): boolean {
  const haystack = [
    voice.voiceId,
    voice.name,
    voice.language ?? "",
    voice.category ?? "",
    ...Object.values(voice.labels),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(searchToken);
}

function getDefaultVoiceId(profile: ElevenLabsProviderProfile | null): string | undefined {
  if (!profile) {
    return undefined;
  }
  if (typeof profile.metadata !== "object" || profile.metadata === null) {
    return undefined;
  }
  return (
    normalizeString(
      (profile.metadata as Record<string, unknown>).defaultVoiceId,
    ) ?? undefined
  );
}

function findElevenLabsProfile(
  providerAuthProfiles: unknown,
): ElevenLabsProviderProfile | null {
  if (!Array.isArray(providerAuthProfiles)) {
    return null;
  }

  const profiles = providerAuthProfiles
    .filter((profile): profile is ElevenLabsProviderProfile => {
      if (typeof profile !== "object" || profile === null) {
        return false;
      }
      const typed = profile as Record<string, unknown>;
      return typed.providerId === "elevenlabs";
    })
    .sort((left, right) => (left.priority ?? 10_000) - (right.priority ?? 10_000));

  return profiles[0] ?? null;
}

function resolveBillingSource(settings: {
  billingSource?: "platform" | "byok" | "private";
  billingMode?: "platform" | "byok";
} | null): "platform" | "byok" | "private" {
  if (settings?.billingSource) {
    return settings.billingSource;
  }
  return settings?.billingMode === "byok" ? "byok" : "platform";
}

function buildElevenLabsProfile(args: {
  existingProfile: ElevenLabsProviderProfile | null;
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  defaultVoiceId?: string;
  billingSource: "platform" | "byok" | "private";
}): ElevenLabsProviderProfile {
  const nextApiKey =
    normalizeString(args.apiKey) ??
    normalizeString(args.existingProfile?.apiKey) ??
    undefined;
  const nextBaseUrl =
    normalizeBaseUrl(args.baseUrl) ??
    normalizeBaseUrl(args.existingProfile?.baseUrl) ??
    ELEVENLABS_BASE_URL;
  const nextDefaultVoiceId =
    normalizeString(args.defaultVoiceId) ??
    getDefaultVoiceId(args.existingProfile);
  const seededDefaultVoiceId =
    args.enabled && !nextDefaultVoiceId
      ? resolveDeterministicOrgDefaultVoiceId()
      : nextDefaultVoiceId;
  const existingMetadata =
    typeof args.existingProfile?.metadata === "object" &&
    args.existingProfile?.metadata !== null
      ? (args.existingProfile.metadata as Record<string, unknown>)
      : {};

  if (args.enabled && args.billingSource !== "platform" && !nextApiKey) {
    throw new Error(
      "ElevenLabs API key is required before enabling the provider.",
    );
  }

  return {
    profileId: args.existingProfile?.profileId ?? ELEVENLABS_PROFILE_ID,
    providerId: "elevenlabs",
    label:
      normalizeString(args.existingProfile?.label) ??
      "ElevenLabs Voice Runtime",
    baseUrl: nextBaseUrl,
    credentialSource:
      args.billingSource === "platform"
        ? "platform_env"
        : args.existingProfile?.credentialSource ?? "organization_auth_profile",
    billingSource: args.billingSource,
    apiKey: nextApiKey,
    encryptedFields:
      args.existingProfile?.encryptedFields ??
      (nextApiKey ? ["apiKey"] : undefined),
    capabilities: {
      text: false,
      vision: false,
      audio_in: true,
      audio_out: true,
      tools: false,
      json: false,
    },
    enabled: args.enabled,
    priority: args.existingProfile?.priority ?? 0,
    cooldownUntil: args.existingProfile?.cooldownUntil,
    failureCount: args.existingProfile?.failureCount,
    lastFailureAt: args.existingProfile?.lastFailureAt,
    lastFailureReason: args.existingProfile?.lastFailureReason,
    metadata: {
      ...existingMetadata,
      ...(seededDefaultVoiceId ? { defaultVoiceId: seededDefaultVoiceId } : {}),
    },
  };
}

function summarizeProfileHealth(profile: ElevenLabsProviderProfile | null): {
  status: "healthy" | "degraded" | "offline";
  reason?: string;
} {
  const platformApiKey = getPlatformElevenLabsApiKey();

  if (!profile) {
    return {
      status: "degraded",
      reason: "no_elevenlabs_profile_configured",
    };
  }
  if (!profile.enabled) {
    return {
      status: "degraded",
      reason: "provider_disabled",
    };
  }
  const billingSource = normalizeBillingSource(profile.billingSource) ?? "platform";
  const hasActiveApiKey =
    billingSource === "platform"
      ? Boolean(platformApiKey)
      : Boolean(normalizeString(profile.apiKey));
  if (!hasActiveApiKey) {
    return {
      status: "degraded",
      reason:
        billingSource === "platform"
          ? "missing_platform_elevenlabs_api_key"
          : "missing_elevenlabs_api_key",
    };
  }
  if (
    typeof profile.cooldownUntil === "number" &&
    profile.cooldownUntil > Date.now()
  ) {
    return {
      status: "degraded",
      reason: "provider_in_cooldown",
    };
  }
  if (
    typeof profile.lastFailureReason === "string" &&
    profile.lastFailureReason.trim().length > 0
  ) {
    return {
      status: "degraded",
      reason: profile.lastFailureReason.trim(),
    };
  }
  return {
    status: "healthy",
  };
}

function resolveElevenLabsBindingFromSettings(
  settings:
    | {
        billingMode?: "platform" | "byok";
        billingSource?: "platform" | "byok" | "private";
        llm?: Record<string, unknown>;
      }
    | null
) {
  return resolveOrganizationProviderBindingForProvider({
    providerId: "elevenlabs",
    llmSettings: (settings?.llm ?? null) as {
      providerId?: string;
      openrouterApiKey?: string;
      providerAuthProfiles?: Array<Record<string, unknown>>;
    } | null,
    defaultBillingSource: resolveBillingSource(settings),
    now: Date.now(),
  });
}

export const getElevenLabsSettings = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
    if (authenticated.organizationId !== args.organizationId) {
      throw new Error(
        "Organization mismatch while fetching ElevenLabs settings.",
      );
    }

    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();
    const canUsePlatformManaged = await isUserSuperAdminByUserId(
      ctx,
      authenticated.userId,
    );
    const profile = findElevenLabsProfile(settings?.llm?.providerAuthProfiles);
    const binding = resolveElevenLabsBindingFromSettings(settings);
    const profileBillingSource = normalizeBillingSource(profile?.billingSource);
    const resolvedBillingSource =
      normalizeBillingSource(binding?.billingSource) ??
      profileBillingSource ??
      resolveBillingSource(settings);
    const billingSource = resolvedBillingSource;
    const platformApiKey = getPlatformElevenLabsApiKey();
    const profileApiKey = normalizeString(profile?.apiKey);
    const hasEffectiveApiKey = Boolean(normalizeString(binding?.apiKey));
    const health =
      binding && hasEffectiveApiKey
        ? { status: "healthy" as const }
        : summarizeProfileHealth(profile);

    return {
      enabled: Boolean(binding),
      hasApiKey: Boolean(profileApiKey),
      hasPlatformApiKey: Boolean(platformApiKey),
      hasEffectiveApiKey,
      canUsePlatformManaged,
      billingSource,
      profileId: profile?.profileId ?? ELEVENLABS_PROFILE_ID,
      baseUrl:
        normalizeBaseUrl(profile?.baseUrl) ?? ELEVENLABS_BASE_URL,
      defaultVoiceId: getDefaultVoiceId(profile) ?? null,
      lastFailureReason: profile?.lastFailureReason ?? null,
      healthStatus: health.status,
      healthReason: health.reason ?? null,
    };
  },
});

export const getAuthorizedElevenLabsBinding = internalQuery({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
    if (authenticated.organizationId !== args.organizationId) {
      throw new Error(
        "Organization mismatch while resolving ElevenLabs binding.",
      );
    }

    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();
    const profile = findElevenLabsProfile(settings?.llm?.providerAuthProfiles);
    const binding = resolveElevenLabsBindingFromSettings(settings);
    const billingSource =
      normalizeBillingSource(binding?.billingSource) ??
      normalizeBillingSource(profile?.billingSource) ??
      resolveBillingSource(settings);
    const effectiveApiKey =
      normalizeString(binding?.apiKey) ??
      (billingSource === "platform"
        ? getPlatformElevenLabsApiKey()
        : normalizeString(profile?.apiKey));

    return {
      apiKey: effectiveApiKey ?? null,
      baseUrl: normalizeBaseUrl(binding?.baseUrl) ??
        normalizeBaseUrl(profile?.baseUrl) ??
        ELEVENLABS_BASE_URL,
      defaultVoiceId: getDefaultVoiceId(profile) ?? null,
      enabled: Boolean(binding),
      billingSource,
    };
  },
});

export const saveElevenLabsSettings = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    enabled: v.boolean(),
    billingSource: v.optional(elevenLabsBillingSourceValidator),
    apiKey: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    defaultVoiceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
    if (authenticated.organizationId !== args.organizationId) {
      throw new Error(
        "Organization mismatch while saving ElevenLabs settings.",
      );
    }

    const now = Date.now();
    const isSuperAdmin = await isUserSuperAdminByUserId(
      ctx,
      authenticated.userId,
    );
    const existingSettings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();

    const existingProfiles =
      existingSettings?.llm?.providerAuthProfiles ?? [];
    const existingProfile = findElevenLabsProfile(existingProfiles);
    const existingBillingSource =
      normalizeBillingSource(existingProfile?.billingSource) ??
      resolveBillingSource(existingSettings);
    const fallbackBillingSource = resolveBillingSource(existingSettings);
    const fallbackForNonSuper =
      fallbackBillingSource === "private" ? "private" : "byok";
    const billingSource =
      normalizeBillingSource(args.billingSource) ??
      normalizeBillingSource(existingProfile?.billingSource) ??
      (isSuperAdmin ? fallbackBillingSource : fallbackForNonSuper);
    const touchesPlatformManagedMode =
      billingSource === "platform" || existingBillingSource === "platform";
    if (touchesPlatformManagedMode && !isSuperAdmin) {
      throw new Error(
        "Permission denied: super_admin required to configure platform-managed ElevenLabs mode.",
      );
    }
    const nextProfile = buildElevenLabsProfile({
      existingProfile,
      enabled: args.enabled,
      apiKey: args.apiKey,
      baseUrl: args.baseUrl,
      defaultVoiceId: args.defaultVoiceId,
      billingSource,
    });

    const remainingProfiles = existingProfiles.filter((profile) => {
      if (typeof profile !== "object" || profile === null) {
        return true;
      }
      const typed = profile as Record<string, unknown>;
      return typed.providerId !== "elevenlabs";
    });
    const providerAuthProfiles = [...remainingProfiles, nextProfile];

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        llm: {
          ...existingSettings.llm,
          providerAuthProfiles,
          providerId: existingSettings.llm.providerId ?? "openrouter",
        },
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("organizationAiSettings", {
        organizationId: args.organizationId,
        enabled: true,
        billingMode: "platform",
        billingSource: "platform",
        settingsContractVersion: "provider_agnostic_v1",
        llm: {
          providerId: "openrouter",
          enabledModels: [
            {
              modelId: ONBOARDING_DEFAULT_MODEL_ID,
              isDefault: true,
              enabledAt: now,
            },
          ],
          defaultModelId: ONBOARDING_DEFAULT_MODEL_ID,
          temperature: 0.7,
          maxTokens: 4000,
          providerAuthProfiles,
        },
        embedding: {
          provider: "none",
          model: "",
          dimensions: 0,
        },
        currentMonthSpend: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      success: true,
      enabled: nextProfile.enabled,
      hasApiKey: Boolean(normalizeString(nextProfile.apiKey)),
      hasPlatformApiKey: Boolean(getPlatformElevenLabsApiKey()),
      hasEffectiveApiKey:
        billingSource === "platform"
          ? Boolean(getPlatformElevenLabsApiKey())
          : Boolean(normalizeString(nextProfile.apiKey)),
      billingSource,
      baseUrl:
        normalizeBaseUrl(nextProfile.baseUrl) ?? ELEVENLABS_BASE_URL,
      defaultVoiceId: getDefaultVoiceId(nextProfile) ?? null,
    };
  },
});

export const probeElevenLabsHealth = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    apiKey: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const checkedAt = Date.now();
    const authorizedBinding = (await ctx.runQuery(
      generatedApi.internal.integrations.elevenlabs.getAuthorizedElevenLabsBinding,
      {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
      },
    )) as {
      apiKey: string | null;
      baseUrl: string;
      defaultVoiceId: string | null;
      enabled: boolean;
    };

    const apiKey =
      normalizeString(args.apiKey) ??
      normalizeString(authorizedBinding.apiKey);
    const baseUrl =
      normalizeBaseUrl(args.baseUrl) ??
      normalizeBaseUrl(authorizedBinding.baseUrl) ??
      ELEVENLABS_BASE_URL;

    if (!apiKey) {
      return {
        success: false,
        status: "degraded" as const,
        checkedAt,
        reason: "missing_elevenlabs_api_key",
        baseUrl,
      };
    }

    try {
      const response = await fetch(`${baseUrl}/voices?page_size=5`, {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
          accept: "application/json",
        },
      });

      if (!response.ok) {
        const payload = parseJsonSafely(await response.text());
        const status = response.status >= 500 ? "degraded" : "offline";
        return {
          success: false,
          status,
          checkedAt,
          reason:
            extractErrorMessage(payload) ??
            `elevenlabs_probe_http_${response.status}`,
          baseUrl,
        };
      }

      const payload = (await response.json()) as Record<string, unknown>;
      const voiceCount = Array.isArray(payload.voices)
        ? payload.voices.length
        : 0;

      return {
        success: true,
        status: "healthy" as const,
        checkedAt,
        baseUrl,
        voiceCount,
      };
    } catch (error) {
      return {
        success: false,
        status: "degraded" as const,
        checkedAt,
        reason:
          error instanceof Error
            ? error.message
            : "elevenlabs_probe_failed",
        baseUrl,
      };
    }
  },
});

export const listElevenLabsVoices = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    apiKey: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    search: v.optional(v.string()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const checkedAt = Date.now();
    const authorizedBinding = (await ctx.runQuery(
      generatedApi.internal.integrations.elevenlabs.getAuthorizedElevenLabsBinding,
      {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
      },
    )) as {
      apiKey: string | null;
      baseUrl: string;
      defaultVoiceId: string | null;
      enabled: boolean;
    };

    const apiKey =
      normalizeString(args.apiKey) ??
      normalizeString(authorizedBinding.apiKey);
    const baseUrl =
      normalizeBaseUrl(args.baseUrl) ??
      normalizeBaseUrl(authorizedBinding.baseUrl) ??
      ELEVENLABS_BASE_URL;
    const searchToken = normalizeString(args.search)?.toLowerCase();
    const requestedPageSize =
      typeof args.pageSize === "number" && Number.isFinite(args.pageSize)
        ? Math.floor(args.pageSize)
        : 100;
    const pageSize = Math.min(Math.max(requestedPageSize, 1), 100);

    if (!apiKey) {
      return {
        success: false,
        status: "degraded" as const,
        checkedAt,
        reason: "missing_elevenlabs_api_key",
        baseUrl,
        voices: [] as ElevenLabsVoiceCatalogEntry[],
        defaultVoiceId: authorizedBinding.defaultVoiceId ?? null,
        providerEnabled: authorizedBinding.enabled,
      };
    }

    try {
      const response = await fetch(`${baseUrl}/voices?page_size=${pageSize}`, {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
          accept: "application/json",
        },
      });

      if (!response.ok) {
        const payload = parseJsonSafely(await response.text());
        const status = response.status >= 500 ? "degraded" : "offline";
        return {
          success: false,
          status,
          checkedAt,
          reason:
            extractErrorMessage(payload) ??
            `elevenlabs_voice_list_http_${response.status}`,
          baseUrl,
          voices: [] as ElevenLabsVoiceCatalogEntry[],
          defaultVoiceId: authorizedBinding.defaultVoiceId ?? null,
          providerEnabled: authorizedBinding.enabled,
        };
      }

      const payload = (await response.json()) as Record<string, unknown>;
      const rawVoices = Array.isArray(payload.voices) ? payload.voices : [];
      let voices = rawVoices
        .map(normalizeElevenLabsVoiceCatalogEntry)
        .filter((voice): voice is ElevenLabsVoiceCatalogEntry => Boolean(voice));

      if (searchToken) {
        voices = voices.filter((voice) => matchesVoiceSearch(voice, searchToken));
      }

      voices.sort((left, right) => left.name.localeCompare(right.name));

      return {
        success: true,
        status: "healthy" as const,
        checkedAt,
        baseUrl,
        voices,
        totalVoices: voices.length,
        defaultVoiceId: authorizedBinding.defaultVoiceId ?? null,
        providerEnabled: authorizedBinding.enabled,
      };
    } catch (error) {
      return {
        success: false,
        status: "degraded" as const,
        checkedAt,
        reason:
          error instanceof Error
            ? error.message
            : "elevenlabs_voice_list_failed",
        baseUrl,
        voices: [] as ElevenLabsVoiceCatalogEntry[],
        defaultVoiceId: authorizedBinding.defaultVoiceId ?? null,
        providerEnabled: authorizedBinding.enabled,
      };
    }
  },
});

export const synthesizeElevenLabsVoiceSample = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    voiceId: v.string(),
    text: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const checkedAt = Date.now();
    const authorizedBinding = (await ctx.runQuery(
      generatedApi.internal.integrations.elevenlabs.getAuthorizedElevenLabsBinding,
      {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
      },
    )) as {
      apiKey: string | null;
      baseUrl: string;
      enabled: boolean;
    };

    const apiKey =
      normalizeString(args.apiKey) ??
      normalizeString(authorizedBinding.apiKey);
    const baseUrl =
      normalizeBaseUrl(args.baseUrl) ??
      normalizeBaseUrl(authorizedBinding.baseUrl) ??
      ELEVENLABS_BASE_URL;
    const voiceId = normalizeString(args.voiceId);
    const text =
      normalizeString(args.text)?.slice(0, 200) ??
      "hello this is voice preview";

    if (!voiceId) {
      return {
        success: false,
        status: "offline" as const,
        checkedAt,
        reason: "missing_voice_id",
      };
    }

    if (!apiKey) {
      return {
        success: false,
        status: "degraded" as const,
        checkedAt,
        reason: "missing_elevenlabs_api_key",
      };
    }

    try {
      const response = await fetch(`${baseUrl}/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
        }),
      });

      if (!response.ok) {
        const payload = parseJsonSafely(await response.text());
        const status = response.status >= 500 ? "degraded" : "offline";
        return {
          success: false,
          status,
          checkedAt,
          reason:
            extractErrorMessage(payload) ??
            `elevenlabs_voice_sample_http_${response.status}`,
        };
      }

      const audioBuffer = await response.arrayBuffer();
      return {
        success: true,
        status: "healthy" as const,
        checkedAt,
        mimeType: "audio/mpeg",
        audioBase64: encodeArrayBufferToBase64(audioBuffer),
      };
    } catch (error) {
      return {
        success: false,
        status: "degraded" as const,
        checkedAt,
        reason:
          error instanceof Error
            ? error.message
            : "elevenlabs_voice_sample_failed",
      };
    }
  },
});
