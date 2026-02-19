import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireAuthenticatedUser } from "../rbacHelpers";
import { getLicenseInternal } from "../licensing/helpers";
import { resolveByokCommercialPolicyForTier } from "../stripe/byokCommercialPolicy";
import { aiBillingSourceValidator, aiProviderIdValidator } from "../schemas/coreSchemas";
import { getAllAiProviders, getAiProvider } from "../ai/providerRegistry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../_generated/api");

const DEFAULT_REQUIRED_TIER = "Starter (€199/month)";
const VERIFICATION_ACTIONS = [
  "test_auth",
  "list_models",
  "test_text",
  "test_voice",
] as const;

const verificationActionValidator = v.union(
  v.literal("test_auth"),
  v.literal("list_models"),
  v.literal("test_text"),
  v.literal("test_voice")
);

const providerProbeStatusValidator = v.union(
  v.literal("healthy"),
  v.literal("degraded"),
  v.literal("offline")
);

type AiConnectionVerificationAction = (typeof VERIFICATION_ACTIONS)[number];
type ProviderProbeStatus = "healthy" | "degraded" | "offline";

type ProviderAuthProfile = {
  profileId: string;
  providerId:
    | "openrouter"
    | "openai"
    | "anthropic"
    | "gemini"
    | "grok"
    | "mistral"
    | "kimi"
    | "elevenlabs"
    | "openai_compatible";
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

type ProviderConnectionHealthMetadata = {
  success: boolean;
  status: ProviderProbeStatus;
  checkedAt: number;
  verificationAction: AiConnectionVerificationAction;
  reason?: string;
  latencyMs?: number;
  modelCount?: number;
  sampleModelIds?: string[];
  voiceCount?: number;
  supportedActions: AiConnectionVerificationAction[];
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeBaseUrl(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized ? normalized.replace(/\/+$/, "") : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function sanitizeProfileId(providerId: string, profileId?: string | null): string {
  const normalized = normalizeString(profileId)
    ?.toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) {
    return `${providerId}_default`;
  }

  return normalized;
}

function maskApiKey(apiKey: string | null): string | null {
  if (!apiKey) {
    return null;
  }

  if (apiKey.length <= 8) {
    return `${apiKey.slice(0, 2)}••••`;
  }

  return `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`;
}

function normalizeVerificationAction(
  value: unknown
): AiConnectionVerificationAction | null {
  if (typeof value !== "string") {
    return null;
  }

  return VERIFICATION_ACTIONS.includes(value as AiConnectionVerificationAction)
    ? (value as AiConnectionVerificationAction)
    : null;
}

function normalizeProbeStatus(value: unknown): ProviderProbeStatus | null {
  if (value === "healthy" || value === "degraded" || value === "offline") {
    return value;
  }
  return null;
}

function normalizeProbeNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }
  return Math.max(0, Math.floor(value));
}

function sanitizeModelSample(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const deduped = new Set<string>();
  for (const candidate of value) {
    const normalized = normalizeString(candidate);
    if (!normalized) {
      continue;
    }
    deduped.add(normalized.slice(0, 120));
    if (deduped.size >= 10) {
      break;
    }
  }

  return deduped.size > 0 ? Array.from(deduped) : undefined;
}

function getDefaultCapabilities(providerId: ProviderAuthProfile["providerId"]) {
  if (providerId === "elevenlabs") {
    return {
      text: false,
      vision: false,
      audio_in: true,
      audio_out: true,
      tools: false,
      json: false,
    };
  }

  return {
    text: true,
    vision: providerId !== "mistral" && providerId !== "kimi",
    audio_in: false,
    audio_out: false,
    tools: true,
    json: true,
  };
}

function resolveProviderCapabilities(
  profile: ProviderAuthProfile | null,
  providerId: ProviderAuthProfile["providerId"]
) {
  return profile?.capabilities ?? getDefaultCapabilities(providerId);
}

function getSupportedVerificationActions(args: {
  providerId: ProviderAuthProfile["providerId"];
  capabilities: ReturnType<typeof getDefaultCapabilities>;
}): AiConnectionVerificationAction[] {
  const actions: AiConnectionVerificationAction[] = ["test_auth", "list_models"];
  if (args.capabilities.text) {
    actions.push("test_text");
  }
  if (
    args.providerId === "elevenlabs" ||
    args.capabilities.audio_in ||
    args.capabilities.audio_out
  ) {
    actions.push("test_voice");
  }
  return actions;
}

function getProfileMetadataObject(profile: ProviderAuthProfile | null): Record<string, unknown> {
  const metadata = asRecord(profile?.metadata);
  return metadata ? { ...metadata } : {};
}

function getStoredHealthMetadata(
  profile: ProviderAuthProfile | null
): ProviderConnectionHealthMetadata | null {
  const metadata = asRecord(profile?.metadata);
  const health = asRecord(metadata?.connectionHealth);
  if (!health) {
    return null;
  }

  const status = normalizeProbeStatus(health.status);
  const verificationAction = normalizeVerificationAction(health.verificationAction);
  const checkedAt = normalizeProbeNumber(health.checkedAt);
  const success = health.success === true;

  if (!status || !verificationAction || checkedAt === undefined) {
    return null;
  }

  const supportedActions = Array.isArray(health.supportedActions)
    ? health.supportedActions
        .map((action) => normalizeVerificationAction(action))
        .filter((action): action is AiConnectionVerificationAction => Boolean(action))
    : [];

  return {
    success,
    status,
    checkedAt,
    verificationAction,
    reason: normalizeString(health.reason) ?? undefined,
    latencyMs: normalizeProbeNumber(health.latencyMs),
    modelCount: normalizeProbeNumber(health.modelCount),
    sampleModelIds: sanitizeModelSample(health.sampleModelIds),
    voiceCount: normalizeProbeNumber(health.voiceCount),
    supportedActions,
  };
}

function resolveByokFeatureFlags(license: {
  features?: Record<string, unknown>;
  planTier?: string;
}) {
  const aiEnabled = license.features?.aiEnabled === true;
  const aiByokRaw = license.features?.aiByokEnabled;
  const aiByokEnabled =
    typeof aiByokRaw === "boolean" ? aiByokRaw : aiEnabled;
  const byokPolicy = resolveByokCommercialPolicyForTier(license.planTier ?? "free");
  const byokEligible = aiEnabled && aiByokEnabled && byokPolicy.byokEligible;

  return {
    aiEnabled,
    aiByokEnabled,
    byokEligible,
  };
}

function sortProfilesByPriority(profiles: ProviderAuthProfile[]): ProviderAuthProfile[] {
  return [...profiles].sort(
    (left, right) => (left.priority ?? 10_000) - (right.priority ?? 10_000)
  );
}

function findProviderProfile(
  profiles: ProviderAuthProfile[],
  providerId: ProviderAuthProfile["providerId"],
  profileId?: string | null
): ProviderAuthProfile | null {
  const normalizedProfileId = profileId ? sanitizeProfileId(providerId, profileId) : null;
  const matchesProvider = profiles.filter((profile) => profile.providerId === providerId);
  if (matchesProvider.length === 0) {
    return null;
  }

  if (!normalizedProfileId) {
    return sortProfilesByPriority(matchesProvider)[0] ?? null;
  }

  return (
    matchesProvider.find(
      (profile) => sanitizeProfileId(providerId, profile.profileId) === normalizedProfileId
    ) ?? null
  );
}

async function ensureAiSettingsRecord(
  ctx: {
    db: {
      query: Function;
      insert: Function;
      get: Function;
    };
  },
  organizationId: Id<"organizations">
) {
  const existing = await ctx.db
    .query("organizationAiSettings")
    .withIndex("by_organization", (q: { eq: (field: string, value: Id<"organizations">) => unknown }) =>
      q.eq("organizationId", organizationId)
    )
    .first();

  if (existing) {
    return existing;
  }

  const now = Date.now();
  const insertedId = await ctx.db.insert("organizationAiSettings", {
    organizationId,
    enabled: true,
    billingMode: "platform",
    billingSource: "platform",
    settingsContractVersion: "provider_agnostic_v1",
    llm: {
      providerId: "openrouter",
      temperature: 0.7,
      maxTokens: 4000,
      providerAuthProfiles: [],
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

  const created = await ctx.db.get(insertedId);
  if (!created) {
    throw new Error("Failed to create AI settings record.");
  }

  return created;
}

export const getAIConnectionCatalog = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
    if (authenticated.organizationId !== args.organizationId) {
      throw new Error("Organization mismatch while loading AI connections.");
    }

    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();
    const providerProfiles =
      (settings?.llm?.providerAuthProfiles as ProviderAuthProfile[] | undefined) ?? [];

    const license = await getLicenseInternal(ctx, args.organizationId);
    const flags = resolveByokFeatureFlags({
      features: license.features as Record<string, unknown>,
      planTier: license.planTier,
    });

    const providers = getAllAiProviders().map((provider) => {
      const profile = findProviderProfile(providerProfiles, provider.id);
      const apiKey = normalizeString(profile?.apiKey);
      const capabilities = resolveProviderCapabilities(profile, provider.id);
      const supportedVerificationActions = getSupportedVerificationActions({
        providerId: provider.id,
        capabilities,
      });
      const health = getStoredHealthMetadata(profile);
      const canConfigure = flags.aiEnabled && flags.byokEligible;
      return {
        providerId: provider.id,
        providerLabel: provider.label,
        profileId: sanitizeProfileId(provider.id, profile?.profileId),
        supportsCustomBaseUrl: provider.supportsCustomBaseUrl,
        defaultBaseUrl: provider.defaultBaseUrl,
        baseUrl: normalizeBaseUrl(profile?.baseUrl) ?? provider.defaultBaseUrl,
        enabled: Boolean(profile?.enabled),
        hasApiKey: Boolean(apiKey),
        maskedKey: maskApiKey(apiKey),
        billingSource: profile?.billingSource ?? null,
        cooldownUntil: profile?.cooldownUntil ?? null,
        lastFailureReason: normalizeString(profile?.lastFailureReason),
        isConnected: Boolean(profile?.enabled && apiKey),
        supportedVerificationActions,
        healthStatus: health?.status ?? null,
        healthReason:
          health?.reason ?? normalizeString(profile?.lastFailureReason),
        healthCheckedAt: health?.checkedAt ?? null,
        healthLastAction: health?.verificationAction ?? null,
        healthLatencyMs: health?.latencyMs ?? null,
        healthModelCount: health?.modelCount ?? null,
        healthVoiceCount: health?.voiceCount ?? null,
        canConfigure,
        lockedReason: canConfigure
          ? null
          : flags.aiEnabled
            ? `BYOK connections require ${DEFAULT_REQUIRED_TIER} or higher.`
            : `AI features require ${DEFAULT_REQUIRED_TIER} or higher.`,
      };
    });

    return {
      currentTier: license.planTier,
      aiEnabled: flags.aiEnabled,
      byokFeatureEnabled: flags.aiByokEnabled,
      byokEnabled: flags.byokEligible,
      requiredTierForByok: DEFAULT_REQUIRED_TIER,
      providers,
    };
  },
});

export const getAuthorizedAIConnection = internalQuery({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    providerId: aiProviderIdValidator,
    profileId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
    if (authenticated.organizationId !== args.organizationId) {
      throw new Error("Organization mismatch while resolving AI connection.");
    }

    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();
    const providerProfiles =
      (settings?.llm?.providerAuthProfiles as ProviderAuthProfile[] | undefined) ?? [];
    const profile = findProviderProfile(providerProfiles, args.providerId, args.profileId);
    const provider = getAiProvider(args.providerId);
    const capabilities = resolveProviderCapabilities(profile, args.providerId);
    const supportedVerificationActions = getSupportedVerificationActions({
      providerId: args.providerId,
      capabilities,
    });

    return {
      apiKey: normalizeString(profile?.apiKey) ?? null,
      baseUrl: normalizeBaseUrl(profile?.baseUrl) ?? provider.defaultBaseUrl,
      profileId: sanitizeProfileId(args.providerId, profile?.profileId),
      enabled: Boolean(profile?.enabled),
      supportedVerificationActions,
    };
  },
});

export const saveAIConnection = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    providerId: aiProviderIdValidator,
    profileId: v.optional(v.string()),
    label: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    apiKey: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    billingSource: v.optional(aiBillingSourceValidator),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
    if (authenticated.organizationId !== args.organizationId) {
      throw new Error("Organization mismatch while saving AI connection.");
    }

    const license = await getLicenseInternal(ctx, args.organizationId);
    const flags = resolveByokFeatureFlags({
      features: license.features as Record<string, unknown>,
      planTier: license.planTier,
    });
    if (!flags.aiEnabled) {
      throw new Error(`AI features require ${DEFAULT_REQUIRED_TIER} or higher.`);
    }
    if (!flags.byokEligible) {
      throw new Error(`BYOK connections require ${DEFAULT_REQUIRED_TIER} or higher.`);
    }

    const settings = await ensureAiSettingsRecord(ctx, args.organizationId);
    const existingProfiles =
      (settings.llm.providerAuthProfiles as ProviderAuthProfile[] | undefined) ?? [];
    const targetProfileId = sanitizeProfileId(args.providerId, args.profileId);
    const provider = getAiProvider(args.providerId);

    const profileIndex = existingProfiles.findIndex((profile) => {
      return (
        profile.providerId === args.providerId &&
        sanitizeProfileId(args.providerId, profile.profileId) === targetProfileId
      );
    });

    const existingProfile = profileIndex >= 0 ? existingProfiles[profileIndex] : null;
    const normalizedApiKey = normalizeString(args.apiKey);
    const existingApiKey = normalizeString(existingProfile?.apiKey);
    const nextApiKey =
      args.apiKey === undefined
        ? existingApiKey
        : normalizedApiKey;
    const didRotateApiKey =
      args.apiKey !== undefined && normalizedApiKey !== existingApiKey;
    const nextMetadata = getProfileMetadataObject(existingProfile);
    if (didRotateApiKey) {
      delete nextMetadata.connectionHealth;
      delete nextMetadata.connectionHealthByAction;
    }
    const nextEnabled =
      args.enabled !== undefined
        ? args.enabled
        : existingProfile?.enabled ?? Boolean(nextApiKey);

    if (nextEnabled && !nextApiKey) {
      throw new Error(
        "An API key is required before enabling this provider connection."
      );
    }

    const nextBaseUrl =
      provider.supportsCustomBaseUrl
        ? normalizeBaseUrl(args.baseUrl) ??
          normalizeBaseUrl(existingProfile?.baseUrl) ??
          provider.defaultBaseUrl
        : provider.defaultBaseUrl;

    const fallbackPriority = existingProfiles.length;
    const nextProfile: ProviderAuthProfile = {
      profileId: targetProfileId,
      providerId: args.providerId,
      label:
        normalizeString(args.label) ??
        normalizeString(existingProfile?.label) ??
        `${provider.label} Connection`,
      baseUrl: nextBaseUrl,
      credentialSource: nextApiKey ? "organization_auth_profile" : "platform_env",
      billingSource: args.billingSource ?? existingProfile?.billingSource ?? "byok",
      apiKey: nextApiKey ?? undefined,
      encryptedFields: nextApiKey ? ["apiKey"] : undefined,
      capabilities:
        existingProfile?.capabilities ?? getDefaultCapabilities(args.providerId),
      enabled: nextEnabled,
      priority: existingProfile?.priority ?? fallbackPriority,
      cooldownUntil: didRotateApiKey ? undefined : existingProfile?.cooldownUntil,
      failureCount: didRotateApiKey ? 0 : existingProfile?.failureCount,
      lastFailureAt: didRotateApiKey ? undefined : existingProfile?.lastFailureAt,
      lastFailureReason: didRotateApiKey
        ? undefined
        : existingProfile?.lastFailureReason,
      metadata: Object.keys(nextMetadata).length > 0 ? nextMetadata : undefined,
    };

    const providerAuthProfiles = [...existingProfiles];
    if (profileIndex >= 0) {
      providerAuthProfiles[profileIndex] = nextProfile;
    } else {
      providerAuthProfiles.push(nextProfile);
    }

    await ctx.db.patch(settings._id, {
      llm: {
        ...settings.llm,
        providerId: settings.llm.providerId ?? args.providerId,
        providerAuthProfiles,
      },
      updatedAt: Date.now(),
    });

    return {
      success: true,
      providerId: args.providerId,
      profileId: targetProfileId,
      enabled: nextEnabled,
      hasApiKey: Boolean(nextApiKey),
      maskedKey: maskApiKey(nextApiKey),
      baseUrl: nextBaseUrl,
      billingSource: nextProfile.billingSource ?? null,
    };
  },
});

export const revokeAIConnection = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    providerId: aiProviderIdValidator,
    profileId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
    if (authenticated.organizationId !== args.organizationId) {
      throw new Error("Organization mismatch while revoking AI connection.");
    }

    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!settings) {
      return {
        success: true,
        removed: 0,
      };
    }

    const existingProfiles =
      (settings.llm.providerAuthProfiles as ProviderAuthProfile[] | undefined) ?? [];
    const targetProfileId = args.profileId
      ? sanitizeProfileId(args.providerId, args.profileId)
      : null;

    const providerAuthProfiles = existingProfiles.filter((profile) => {
      if (profile.providerId !== args.providerId) {
        return true;
      }
      if (!targetProfileId) {
        return false;
      }
      return (
        sanitizeProfileId(args.providerId, profile.profileId) !== targetProfileId
      );
    });

    const removed = existingProfiles.length - providerAuthProfiles.length;
    if (removed > 0) {
      await ctx.db.patch(settings._id, {
        llm: {
          ...settings.llm,
          providerAuthProfiles:
            providerAuthProfiles.length > 0 ? providerAuthProfiles : undefined,
        },
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      removed,
    };
  },
});

export const recordAIConnectionHealthMetadata = internalMutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    providerId: aiProviderIdValidator,
    profileId: v.optional(v.string()),
    verificationAction: verificationActionValidator,
    success: v.boolean(),
    status: providerProbeStatusValidator,
    checkedAt: v.number(),
    reason: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    modelCount: v.optional(v.number()),
    sampleModelIds: v.optional(v.array(v.string())),
    voiceCount: v.optional(v.number()),
    supportedActions: v.array(verificationActionValidator),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
    if (authenticated.organizationId !== args.organizationId) {
      throw new Error("Organization mismatch while recording AI connection health.");
    }

    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();
    if (!settings) {
      return {
        updated: false,
        reason: "missing_ai_settings",
      };
    }

    const existingProfiles =
      (settings.llm.providerAuthProfiles as ProviderAuthProfile[] | undefined) ?? [];
    const targetProfileId = sanitizeProfileId(args.providerId, args.profileId);
    const profileIndex = existingProfiles.findIndex((profile) => {
      return (
        profile.providerId === args.providerId &&
        sanitizeProfileId(args.providerId, profile.profileId) === targetProfileId
      );
    });
    if (profileIndex < 0) {
      return {
        updated: false,
        reason: "missing_provider_profile",
      };
    }

    const existingProfile = existingProfiles[profileIndex];
    const capabilities = resolveProviderCapabilities(existingProfile, args.providerId);
    const fallbackSupportedActions = getSupportedVerificationActions({
      providerId: args.providerId,
      capabilities,
    });
    const metadata = getProfileMetadataObject(existingProfile);

    const supportedActions = args.supportedActions
      .map((action) => normalizeVerificationAction(action))
      .filter((action): action is AiConnectionVerificationAction => Boolean(action));
    const sampleModelIds = sanitizeModelSample(args.sampleModelIds);
    const nextHealth: ProviderConnectionHealthMetadata = {
      success: args.success,
      status: args.status,
      checkedAt: Math.max(0, Math.floor(args.checkedAt)),
      verificationAction: args.verificationAction,
      reason: normalizeString(args.reason) ?? undefined,
      latencyMs: normalizeProbeNumber(args.latencyMs),
      modelCount: normalizeProbeNumber(args.modelCount),
      sampleModelIds,
      voiceCount: normalizeProbeNumber(args.voiceCount),
      supportedActions:
        supportedActions.length > 0 ? supportedActions : fallbackSupportedActions,
    };

    const previousByAction = asRecord(metadata.connectionHealthByAction) ?? {};
    const nextByAction: Record<string, unknown> = {
      ...previousByAction,
      [args.verificationAction]: {
        success: nextHealth.success,
        status: nextHealth.status,
        checkedAt: nextHealth.checkedAt,
        reason: nextHealth.reason ?? null,
        latencyMs: nextHealth.latencyMs ?? null,
        modelCount: nextHealth.modelCount ?? null,
        voiceCount: nextHealth.voiceCount ?? null,
      },
    };

    metadata.connectionHealth = nextHealth;
    metadata.connectionHealthByAction = nextByAction;

    const providerAuthProfiles = [...existingProfiles];
    providerAuthProfiles[profileIndex] = {
      ...existingProfile,
      metadata,
    };

    await ctx.db.patch(settings._id, {
      llm: {
        ...settings.llm,
        providerAuthProfiles,
      },
      updatedAt: Date.now(),
    });

    return {
      updated: true,
      profileId: targetProfileId,
    };
  },
});

export const testAIConnection = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    providerId: aiProviderIdValidator,
    profileId: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    verificationAction: v.optional(verificationActionValidator),
  },
  handler: async (ctx, args) => {
    const verificationAction = args.verificationAction ?? "test_auth";
    const provider = getAiProvider(args.providerId);
    const authorized = (await ctx.runQuery(
      generatedApi.internal.integrations.aiConnections.getAuthorizedAIConnection,
      {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
        providerId: args.providerId,
        profileId: args.profileId,
      }
    )) as {
      apiKey: string | null;
      baseUrl: string;
      profileId: string;
      supportedVerificationActions?: AiConnectionVerificationAction[];
    };

    const supportedActionsRaw = Array.isArray(authorized.supportedVerificationActions)
      ? authorized.supportedVerificationActions
      : [];
    const supportedActions = supportedActionsRaw
      .map((action) => normalizeVerificationAction(action))
      .filter((action): action is AiConnectionVerificationAction => Boolean(action));
    if (supportedActions.length === 0) {
      supportedActions.push("test_auth", "list_models");
    }

    const persistHealthMetadata = async (probe: {
      success: boolean;
      status: ProviderProbeStatus;
      checkedAt: number;
      reason?: string;
      latencyMs?: number;
      modelCount?: number;
      sampleModelIds?: string[];
      voiceCount?: number;
    }) => {
      await ctx.runMutation(
        generatedApi.internal.integrations.aiConnections.recordAIConnectionHealthMetadata,
        {
          sessionId: args.sessionId,
          organizationId: args.organizationId,
          providerId: args.providerId,
          profileId: args.profileId ?? authorized.profileId,
          verificationAction,
          success: probe.success,
          status: probe.status,
          checkedAt: probe.checkedAt,
          reason: probe.reason,
          latencyMs: probe.latencyMs,
          modelCount: probe.modelCount,
          sampleModelIds: probe.sampleModelIds,
          voiceCount: probe.voiceCount,
          supportedActions,
        }
      );

      return {
        ...probe,
        verificationAction,
        supportedActions,
      };
    };

    if (!supportedActions.includes(verificationAction)) {
      return await persistHealthMetadata({
        success: false,
        status: "offline",
        checkedAt: Date.now(),
        reason: `verification_action_not_supported:${verificationAction}`,
      });
    }

    const apiKey =
      normalizeString(args.apiKey) ?? normalizeString(authorized.apiKey);
    const baseUrl =
      normalizeBaseUrl(args.baseUrl) ??
      normalizeBaseUrl(authorized.baseUrl) ??
      provider.defaultBaseUrl;

    if (!apiKey) {
      return await persistHealthMetadata({
        success: false,
        status: "degraded",
        checkedAt: Date.now(),
        reason: "missing_api_key",
      });
    }

    if (args.providerId === "elevenlabs") {
      if (verificationAction === "test_text") {
        return await persistHealthMetadata({
          success: false,
          status: "offline",
          checkedAt: Date.now(),
          reason: "provider_does_not_support_text_generation",
        });
      }

      const startedAt = Date.now();
      const elevenLabsResult = (await ctx.runAction(
        generatedApi.api.integrations.elevenlabs.probeElevenLabsHealth,
        {
          sessionId: args.sessionId,
          organizationId: args.organizationId,
          apiKey: normalizeString(args.apiKey) ?? undefined,
          baseUrl,
        }
      )) as {
        success?: boolean;
        status?: ProviderProbeStatus;
        checkedAt?: number;
        reason?: string;
        voiceCount?: number;
      };

      const voiceCount = normalizeProbeNumber(elevenLabsResult?.voiceCount);
      return await persistHealthMetadata({
        success: Boolean(elevenLabsResult?.success),
        status: normalizeProbeStatus(elevenLabsResult?.status) ?? "offline",
        checkedAt: normalizeProbeNumber(elevenLabsResult?.checkedAt) ?? Date.now(),
        reason: normalizeString(elevenLabsResult?.reason) ?? undefined,
        latencyMs: Date.now() - startedAt,
        modelCount:
          verificationAction === "list_models" ? voiceCount : undefined,
        voiceCount:
          verificationAction === "test_voice" || verificationAction === "list_models"
            ? voiceCount
            : undefined,
      });
    }

    if (verificationAction === "test_voice") {
      return await persistHealthMetadata({
        success: false,
        status: "offline",
        checkedAt: Date.now(),
        reason: "voice_probe_not_supported_for_provider",
      });
    }

    if (verificationAction === "test_auth" || verificationAction === "list_models") {
      const modelProbe = (await ctx.runAction(
        generatedApi.internal.ai.modelDiscovery.probeProviderModelCatalog,
        {
          providerId: args.providerId,
          baseUrl,
          apiKey,
          sampleLimit: verificationAction === "test_auth" ? 1 : 8,
        }
      )) as {
        success?: boolean;
        status?: ProviderProbeStatus;
        checkedAt?: number;
        reason?: string;
        modelCount?: number;
        modelIds?: string[];
        latencyMs?: number;
      };

      return await persistHealthMetadata({
        success: Boolean(modelProbe?.success),
        status: normalizeProbeStatus(modelProbe?.status) ?? "offline",
        checkedAt: normalizeProbeNumber(modelProbe?.checkedAt) ?? Date.now(),
        reason: normalizeString(modelProbe?.reason) ?? undefined,
        latencyMs: normalizeProbeNumber(modelProbe?.latencyMs),
        modelCount: normalizeProbeNumber(modelProbe?.modelCount),
        sampleModelIds:
          verificationAction === "list_models"
            ? sanitizeModelSample(modelProbe?.modelIds)
            : undefined,
      });
    }

    const textProbe = (await ctx.runAction(
      generatedApi.internal.ai.modelDiscovery.probeProviderTextGeneration,
      {
        providerId: args.providerId,
        baseUrl,
        apiKey,
      }
    )) as {
      success?: boolean;
      status?: ProviderProbeStatus;
      checkedAt?: number;
      reason?: string;
      latencyMs?: number;
      modelCount?: number;
      modelIds?: string[];
    };

    return await persistHealthMetadata({
      success: Boolean(textProbe?.success),
      status: normalizeProbeStatus(textProbe?.status) ?? "offline",
      checkedAt: normalizeProbeNumber(textProbe?.checkedAt) ?? Date.now(),
      reason: normalizeString(textProbe?.reason) ?? undefined,
      latencyMs: normalizeProbeNumber(textProbe?.latencyMs),
      modelCount: normalizeProbeNumber(textProbe?.modelCount),
      sampleModelIds: sanitizeModelSample(textProbe?.modelIds),
    });
  },
});
