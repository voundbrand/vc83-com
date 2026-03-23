import { action, internalQuery, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";
import { ONBOARDING_DEFAULT_MODEL_ID } from "../ai/modelDefaults";
import {
  type AiProviderBindingSource,
  getAiBillingSourceContract,
  resolveOrganizationProviderBindings,
} from "../ai/providerRegistry";
import { resolveDeterministicOrgDefaultVoiceId } from "../ai/voiceDefaults";
import type { Id } from "../_generated/dataModel";
import type { AiBillingSource } from "../channels/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../_generated/api");

const ELEVENLABS_PROFILE_ID = "voice_runtime_default";
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";
const INTEGRATION_ACCESS_POLICY_OBJECT_TYPE = "integration_access_policy";
const INTEGRATION_ACCESS_POLICY_OBJECT_NAME =
  "Organization Integration Access Policy";
const INTEGRATION_ACCESS_POLICY_CONTRACT_VERSION =
  "org_integration_access_v1";
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

type ElevenLabsCommercializationContract = {
  billingSource: AiBillingSource;
  credentialOwner: "platform" | "organization";
  usageAttribution: "platform" | "organization" | "private_contract";
  platformCredentialFallbackAllowed: boolean;
  organizationCredentialRequired: boolean;
  requiresSuperAdminConfiguration: boolean;
  executionPolicy:
    | "platform_managed"
    | "organization_managed"
    | "private_controlled";
  allowedBindingSources: readonly AiProviderBindingSource[];
  bindingRequirementReason:
    | "platform_managed_requires_platform_binding"
    | "organization_managed_requires_org_binding"
    | "private_contract_requires_org_binding";
};

type ElevenLabsBindingLike = {
  profileId: string;
  source: AiProviderBindingSource;
  credentialSource?: ElevenLabsProviderProfile["credentialSource"] | null;
  billingSource: "platform" | "byok" | "private";
  apiKey?: string;
  baseUrl?: string;
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

function getElevenLabsCommercializationContract(
  billingSource: AiBillingSource
): ElevenLabsCommercializationContract {
  const base = getAiBillingSourceContract(billingSource);
  if (billingSource === "platform") {
    return {
      ...base,
      allowedBindingSources: ["platform_env"],
      bindingRequirementReason: "platform_managed_requires_platform_binding",
    };
  }
  if (billingSource === "byok") {
    return {
      ...base,
      allowedBindingSources: ["organization_auth_profile"],
      bindingRequirementReason: "organization_managed_requires_org_binding",
    };
  }
  return {
    ...base,
    allowedBindingSources: ["organization_auth_profile"],
    bindingRequirementReason: "private_contract_requires_org_binding",
  };
}

function getPlatformElevenLabsApiKey(): string | null {
  return normalizeString(process.env.ELEVENLABS_API_KEY);
}

async function getIntegrationAccessPolicyDoc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  organizationId: Id<"organizations">,
): Promise<{
  _id: Id<"objects">;
  customProperties?: Record<string, unknown>;
} | null> {
  return (await db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", organizationId).eq("type", INTEGRATION_ACCESS_POLICY_OBJECT_TYPE),
    )
    .first()) as {
    _id: Id<"objects">;
    customProperties?: Record<string, unknown>;
  } | null;
}

function readElevenLabsPlatformAccessGrant(
  customProperties: Record<string, unknown> | undefined,
): boolean {
  const value = customProperties?.elevenlabs;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return (value as Record<string, unknown>).usePlatformCredentials === true;
}

async function getElevenLabsPlatformAccessGrant(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  organizationId: Id<"organizations">,
): Promise<{
  policyObjectId: Id<"objects"> | null;
  usePlatformCredentials: boolean;
}> {
  const policyDoc = await getIntegrationAccessPolicyDoc(db, organizationId);
  return {
    policyObjectId: policyDoc?._id ?? null,
    usePlatformCredentials: readElevenLabsPlatformAccessGrant(
      policyDoc?.customProperties,
    ),
  };
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
  const candidateApiKey =
    normalizeString(args.apiKey) ??
    normalizeString(args.existingProfile?.apiKey) ??
    undefined;
  const nextApiKey =
    args.billingSource === "platform" ? undefined : candidateApiKey;
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

function summarizeProfileHealth(
  profile: ElevenLabsProviderProfile | null,
  billingSourceOverride?: "platform" | "byok" | "private",
): {
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
  const billingSource =
    billingSourceOverride ??
    normalizeBillingSource(profile.billingSource) ??
    "platform";
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
  ,
  options?: {
    forcePlatformCredentials?: boolean;
    profile?: ElevenLabsProviderProfile | null;
  },
) {
  const profile =
    options?.profile ??
    findElevenLabsProfile(settings?.llm?.providerAuthProfiles);
  if (options?.forcePlatformCredentials) {
    if (profile?.enabled === false) {
      return null;
    }
    return {
      profileId: profile?.profileId ?? ELEVENLABS_PROFILE_ID,
      source: "platform_env",
      credentialSource: "platform_env",
      billingSource: "platform",
      apiKey: getPlatformElevenLabsApiKey() ?? undefined,
      baseUrl: normalizeBaseUrl(profile?.baseUrl) ?? ELEVENLABS_BASE_URL,
    } satisfies ElevenLabsBindingLike;
  }

  const billingSource =
    normalizeBillingSource(profile?.billingSource) ??
    resolveBillingSource(settings);
  const commercialization =
    getElevenLabsCommercializationContract(billingSource);
  const bindings = resolveOrganizationProviderBindings({
    providerId: "elevenlabs",
    llmSettings: (settings?.llm ?? null) as {
      providerId?: string;
      openrouterApiKey?: string;
      providerAuthProfiles?: Array<Record<string, unknown>>;
    } | null,
    defaultBillingSource: billingSource,
    now: Date.now(),
  });

  return (
    bindings.find(
      (binding) =>
        commercialization.allowedBindingSources.includes(binding.source) &&
        binding.billingSource === commercialization.billingSource
    ) ?? null
  );
}

async function resolveOrganizationElevenLabsState(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  organizationId: Id<"organizations">,
): Promise<{
  settings:
    | {
        billingMode?: "platform" | "byok";
        billingSource?: "platform" | "byok" | "private";
        llm?: Record<string, unknown>;
      }
    | null;
  profile: ElevenLabsProviderProfile | null;
  binding: ElevenLabsBindingLike | null;
  billingSource: "platform" | "byok" | "private";
  effectiveApiKey: string | null;
  baseUrl: string;
  defaultVoiceId: string | null;
  usePlatformCredentials: boolean;
}> {
  const settings = await db
    .query("organizationAiSettings")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", organizationId))
    .first();
  const profile = findElevenLabsProfile(settings?.llm?.providerAuthProfiles);
  const platformGrant = await getElevenLabsPlatformAccessGrant(db, organizationId);
  const binding = (resolveElevenLabsBindingFromSettings(settings, {
    forcePlatformCredentials: platformGrant.usePlatformCredentials,
    profile,
  }) ?? null) as ElevenLabsBindingLike | null;
  const billingSource = platformGrant.usePlatformCredentials
    ? "platform"
    : normalizeBillingSource(binding?.billingSource) ??
      normalizeBillingSource(profile?.billingSource) ??
      resolveBillingSource(settings);
  const effectiveApiKey =
    normalizeString(binding?.apiKey) ??
    (billingSource === "platform"
      ? getPlatformElevenLabsApiKey()
      : normalizeString(profile?.apiKey));

  return {
    settings,
    profile,
    binding,
    billingSource,
    effectiveApiKey,
    baseUrl:
      normalizeBaseUrl(binding?.baseUrl) ??
      normalizeBaseUrl(profile?.baseUrl) ??
      ELEVENLABS_BASE_URL,
    defaultVoiceId: getDefaultVoiceId(profile) ?? null,
    usePlatformCredentials: platformGrant.usePlatformCredentials,
  };
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

    const resolved = await resolveOrganizationElevenLabsState(
      ctx.db,
      args.organizationId,
    );
    const canUsePlatformManaged = await isUserSuperAdminByUserId(
      ctx,
      authenticated.userId,
    );
    const health = summarizeProfileHealth(
      resolved.profile,
      resolved.billingSource,
    );
    const commercialization =
      getElevenLabsCommercializationContract(resolved.billingSource);
    const platformApiKey = getPlatformElevenLabsApiKey();
    const profileApiKey = normalizeString(resolved.profile?.apiKey);
    const hasEffectiveApiKey = Boolean(resolved.effectiveApiKey);

    return {
      enabled: Boolean(resolved.binding),
      hasApiKey: Boolean(profileApiKey),
      hasPlatformApiKey: Boolean(platformApiKey),
      hasEffectiveApiKey,
      canUsePlatformManaged,
      platformAccessGranted: resolved.usePlatformCredentials,
      billingSource: resolved.billingSource,
      profileId: resolved.profile?.profileId ?? ELEVENLABS_PROFILE_ID,
      baseUrl: resolved.baseUrl,
      defaultVoiceId: resolved.defaultVoiceId,
      lastFailureReason: resolved.profile?.lastFailureReason ?? null,
      healthStatus: health.status,
      healthReason: health.reason ?? null,
      commercialization,
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

    const resolved = await resolveOrganizationElevenLabsState(
      ctx.db,
      args.organizationId,
    );
    const commercialization =
      getElevenLabsCommercializationContract(resolved.billingSource);

    return {
      apiKey: resolved.effectiveApiKey ?? null,
      baseUrl: resolved.baseUrl,
      defaultVoiceId: resolved.defaultVoiceId,
      enabled: Boolean(resolved.binding),
      billingSource: resolved.billingSource,
      commercialization,
      credentialSource: resolved.binding?.credentialSource ?? null,
    };
  },
});

export const getOrganizationElevenLabsRuntimeBinding = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveOrganizationElevenLabsState(
      ctx.db,
      args.organizationId,
    );
    return {
      apiKey: resolved.effectiveApiKey ?? null,
      baseUrl: resolved.baseUrl,
      defaultVoiceId: resolved.defaultVoiceId,
      enabled: Boolean(resolved.binding),
      billingSource: resolved.billingSource,
      credentialSource: resolved.binding?.credentialSource ?? null,
    };
  },
});

export const getOrganizationElevenLabsAdminState = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
    const isSuperAdmin = await isUserSuperAdminByUserId(
      ctx,
      authenticated.userId,
    );
    if (!isSuperAdmin) {
      throw new Error(
        "Permission denied: super_admin required to manage organization ElevenLabs access.",
      );
    }

    const resolved = await resolveOrganizationElevenLabsState(
      ctx.db,
      args.organizationId,
    );
    const health = summarizeProfileHealth(
      resolved.profile,
      resolved.billingSource,
    );

    return {
      enabled: resolved.profile?.enabled ?? Boolean(resolved.binding),
      usePlatformCredentials: resolved.usePlatformCredentials,
      billingSource: resolved.billingSource,
      baseUrl: resolved.baseUrl,
      defaultVoiceId: resolved.defaultVoiceId,
      hasOrgApiKey: Boolean(normalizeString(resolved.profile?.apiKey)),
      hasPlatformApiKey: Boolean(getPlatformElevenLabsApiKey()),
      hasEffectiveApiKey: Boolean(resolved.effectiveApiKey),
      runtimeSource: resolved.binding
        ? resolved.billingSource === "platform"
          ? "platform"
          : "org"
        : null,
      credentialSource:
        resolved.binding?.credentialSource ??
        resolved.profile?.credentialSource ??
        null,
      healthStatus: health.status,
      healthReason: health.reason ?? null,
    };
  },
});

export const saveOrganizationElevenLabsAdminState = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    enabled: v.boolean(),
    usePlatformCredentials: v.boolean(),
    baseUrl: v.optional(v.string()),
    defaultVoiceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
    const isSuperAdmin = await isUserSuperAdminByUserId(
      ctx,
      authenticated.userId,
    );
    if (!isSuperAdmin) {
      throw new Error(
        "Permission denied: super_admin required to manage organization ElevenLabs access.",
      );
    }

    const now = Date.now();
    const existingSettings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();
    const existingProfiles =
      existingSettings?.llm?.providerAuthProfiles ?? [];
    const existingProfile = findElevenLabsProfile(existingProfiles);
    const existingApiKey = normalizeString(existingProfile?.apiKey) ?? undefined;
    const preservedBillingSource = existingApiKey
      ? normalizeBillingSource(existingProfile?.billingSource) ?? "byok"
      : "platform";
    const nextProfile = buildElevenLabsProfile({
      existingProfile,
      enabled: args.enabled,
      apiKey: existingApiKey,
      baseUrl: args.baseUrl,
      defaultVoiceId: args.defaultVoiceId,
      billingSource: preservedBillingSource,
    });
    const remainingProfiles = existingProfiles.filter((profile) => {
      if (typeof profile !== "object" || profile === null) {
        return true;
      }
      return (profile as Record<string, unknown>).providerId !== "elevenlabs";
    });
    const providerAuthProfiles = [...remainingProfiles, nextProfile];

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        llm: {
          ...existingSettings.llm,
          providerAuthProfiles,
          providerId: existingSettings.llm?.providerId ?? "openrouter",
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

    const policyState = await getElevenLabsPlatformAccessGrant(
      ctx.db,
      args.organizationId,
    );
    let policyObjectId = policyState.policyObjectId;
    if (policyObjectId) {
      const policyDoc = await ctx.db.get(policyObjectId);
      await ctx.db.patch(policyObjectId, {
        customProperties: {
          ...(typeof policyDoc?.customProperties === "object" &&
          policyDoc?.customProperties !== null
            ? policyDoc.customProperties
            : {}),
          contractVersion: INTEGRATION_ACCESS_POLICY_CONTRACT_VERSION,
          elevenlabs: {
            usePlatformCredentials: args.usePlatformCredentials,
            updatedAt: now,
            updatedByUserId: authenticated.userId,
          },
        },
        updatedAt: now,
      });
    } else if (args.usePlatformCredentials) {
      policyObjectId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: INTEGRATION_ACCESS_POLICY_OBJECT_TYPE,
        name: INTEGRATION_ACCESS_POLICY_OBJECT_NAME,
        status: "active",
        customProperties: {
          contractVersion: INTEGRATION_ACCESS_POLICY_CONTRACT_VERSION,
          elevenlabs: {
            usePlatformCredentials: true,
            updatedAt: now,
            updatedByUserId: authenticated.userId,
          },
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    if (policyObjectId) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: policyObjectId,
        actionType: "integration_access_policy_saved",
        actionData: {
          providerId: "elevenlabs",
          usePlatformCredentials: args.usePlatformCredentials,
          enabled: args.enabled,
          baseUrl:
            normalizeBaseUrl(args.baseUrl) ??
            normalizeBaseUrl(nextProfile.baseUrl) ??
            ELEVENLABS_BASE_URL,
          defaultVoiceId: getDefaultVoiceId(nextProfile) ?? null,
        },
        performedBy: authenticated.userId,
        performedAt: now,
      });
    }

    const resolved = await resolveOrganizationElevenLabsState(
      ctx.db,
      args.organizationId,
    );
    const health = summarizeProfileHealth(
      resolved.profile,
      resolved.billingSource,
    );

    return {
      success: true,
      enabled: resolved.profile?.enabled ?? Boolean(resolved.binding),
      usePlatformCredentials: resolved.usePlatformCredentials,
      billingSource: resolved.billingSource,
      baseUrl: resolved.baseUrl,
      defaultVoiceId: resolved.defaultVoiceId,
      hasOrgApiKey: Boolean(normalizeString(resolved.profile?.apiKey)),
      hasPlatformApiKey: Boolean(getPlatformElevenLabsApiKey()),
      hasEffectiveApiKey: Boolean(resolved.effectiveApiKey),
      runtimeSource: resolved.binding
        ? resolved.billingSource === "platform"
          ? "platform"
          : "org"
        : null,
      healthStatus: health.status,
      healthReason: health.reason ?? null,
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
    const commercialization =
      getElevenLabsCommercializationContract(billingSource);
    const touchesPlatformManagedMode =
      billingSource === "platform" || existingBillingSource === "platform";
    if (touchesPlatformManagedMode && commercialization.requiresSuperAdminConfiguration && !isSuperAdmin) {
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
      commercialization,
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

/**
 * Resolve ElevenLabs credentials for an org (no session required).
 * Used by server-side callers like landing page API routes.
 * Falls back to platform env var when no org settings exist.
 */
export const resolveCredentials = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const resolved = await resolveOrganizationElevenLabsState(
      ctx.db,
      args.organizationId,
    );

    if (!resolved.effectiveApiKey) return null;

    return {
      apiKey: resolved.effectiveApiKey,
      baseUrl: resolved.baseUrl,
      defaultVoiceId: resolved.defaultVoiceId,
      source: resolved.billingSource === "platform" ? ("platform" as const) : ("org" as const),
    };
  },
});
