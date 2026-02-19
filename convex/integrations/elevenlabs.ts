import { action, internalQuery, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../_generated/api");

const ELEVENLABS_PROFILE_ID = "voice_runtime_default";
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

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
  const existingMetadata =
    typeof args.existingProfile?.metadata === "object" &&
    args.existingProfile?.metadata !== null
      ? (args.existingProfile.metadata as Record<string, unknown>)
      : {};

  if (args.enabled && !nextApiKey) {
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
      args.existingProfile?.credentialSource ?? "organization_auth_profile",
    billingSource: args.existingProfile?.billingSource ?? args.billingSource,
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
      ...(nextDefaultVoiceId ? { defaultVoiceId: nextDefaultVoiceId } : {}),
    },
  };
}

function summarizeProfileHealth(profile: ElevenLabsProviderProfile | null): {
  status: "healthy" | "degraded" | "offline";
  reason?: string;
} {
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
  if (!normalizeString(profile.apiKey)) {
    return {
      status: "degraded",
      reason: "missing_elevenlabs_api_key",
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
    const profile = findElevenLabsProfile(settings?.llm?.providerAuthProfiles);
    const health = summarizeProfileHealth(profile);

    return {
      enabled: profile?.enabled ?? false,
      hasApiKey: Boolean(normalizeString(profile?.apiKey)),
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

    return {
      apiKey: normalizeString(profile?.apiKey) ?? null,
      baseUrl:
        normalizeBaseUrl(profile?.baseUrl) ?? ELEVENLABS_BASE_URL,
      defaultVoiceId: getDefaultVoiceId(profile) ?? null,
      enabled: profile?.enabled ?? false,
    };
  },
});

export const saveElevenLabsSettings = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    enabled: v.boolean(),
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
    const existingSettings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();

    const existingProfiles =
      existingSettings?.llm?.providerAuthProfiles ?? [];
    const existingProfile = findElevenLabsProfile(existingProfiles);
    const billingSource = resolveBillingSource(existingSettings);
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
