/**
 * AI Settings Management
 *
 * Queries and mutations for managing organization AI configuration
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import {
  aiBillingSourceValidator,
  aiCapabilityMatrixValidator,
  aiCredentialSourceValidator,
  aiProviderIdValidator,
} from "../schemas/coreSchemas";

const PROVIDER_AGNOSTIC_SETTINGS_MIGRATION_KEY =
  "provider_agnostic_auth_profiles_v1" as const;

type LegacyAuthProfile = {
  profileId: string;
  label?: string;
  openrouterApiKey?: string;
  enabled: boolean;
  priority?: number;
  cooldownUntil?: number;
  failureCount?: number;
  lastFailureAt?: number;
  lastFailureReason?: string;
};

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

function normalizeAuthProfileId(value: string): string {
  return value.trim();
}

function normalizeProviderId(
  value?: string | null
): ProviderAuthProfile["providerId"] | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const providerAliasMap: Record<string, ProviderAuthProfile["providerId"]> = {
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

  return providerAliasMap[normalized] ?? null;
}

function resolveLlmProviderId(llm: {
  providerId?: ProviderAuthProfile["providerId"];
  provider?: string;
  providerAuthProfiles?: ProviderAuthProfile[];
}): ProviderAuthProfile["providerId"] {
  const explicitProviderId =
    normalizeProviderId(llm.providerId) ?? normalizeProviderId(llm.provider);
  if (explicitProviderId) {
    return explicitProviderId;
  }

  for (const profile of llm.providerAuthProfiles ?? []) {
    const normalizedProfileProviderId = normalizeProviderId(profile.providerId);
    if (normalizedProfileProviderId) {
      return normalizedProfileProviderId;
    }
  }

  return "openrouter";
}

function mapBillingModeToBillingSource(
  billingMode: "platform" | "byok" | undefined
): "platform" | "byok" {
  return billingMode === "byok" ? "byok" : "platform";
}

function normalizeProviderAuthProfile(
  profile: ProviderAuthProfile
): ProviderAuthProfile {
  const normalizedProfileId = normalizeAuthProfileId(profile.profileId);
  const normalizedProviderId =
    normalizeProviderId(profile.providerId) ?? "openrouter";

  return {
    ...profile,
    profileId: normalizedProfileId,
    providerId: normalizedProviderId,
  };
}

function buildProviderAuthProfilesFromLegacy(
  llm: {
    provider?: string;
    openrouterApiKey?: string;
    authProfiles?: LegacyAuthProfile[];
  },
  billingSource: "platform" | "byok"
): ProviderAuthProfile[] {
  const providerId = normalizeProviderId(llm.provider) ?? "openrouter";
  const legacyProfiles = llm.authProfiles ?? [];

  if (legacyProfiles.length > 0) {
    return legacyProfiles.map((profile) => ({
      profileId: normalizeAuthProfileId(profile.profileId),
      providerId,
      label: profile.label,
      credentialSource: profile.openrouterApiKey
        ? "organization_auth_profile"
        : "platform_env",
      billingSource,
      apiKey: profile.openrouterApiKey,
      enabled: profile.enabled,
      priority: profile.priority,
      cooldownUntil: profile.cooldownUntil,
      failureCount: profile.failureCount,
      lastFailureAt: profile.lastFailureAt,
      lastFailureReason: profile.lastFailureReason,
    }));
  }

  const legacyKey = llm.openrouterApiKey?.trim();
  if (!legacyKey) {
    return [];
  }

  return [
    {
      profileId: "openrouter_default",
      providerId: "openrouter",
      label: "OpenRouter default (migrated)",
      credentialSource: "organization_setting",
      billingSource,
      apiKey: legacyKey,
      enabled: true,
      priority: 0,
    },
  ];
}

function ensureProviderAgnosticLlmContract<
  T extends {
    providerId?: ProviderAuthProfile["providerId"];
    provider?: string;
    openrouterApiKey?: string;
    authProfiles?: LegacyAuthProfile[];
    providerAuthProfiles?: ProviderAuthProfile[];
  },
>(
  llm: T,
  billingMode: "platform" | "byok" | undefined
): T {
  const normalizedProviderId = resolveLlmProviderId(llm);

  const normalizedProviderProfiles = (llm.providerAuthProfiles ?? [])
    .map(normalizeProviderAuthProfile)
    .filter((profile) => profile.profileId.length > 0);

  const providerAuthProfiles =
    normalizedProviderProfiles.length > 0
      ? normalizedProviderProfiles
      : buildProviderAuthProfilesFromLegacy(
          llm,
          mapBillingModeToBillingSource(billingMode)
        );

  return {
    ...llm,
    providerId: normalizedProviderId,
    providerAuthProfiles:
      providerAuthProfiles.length > 0 ? providerAuthProfiles : undefined,
  } as T;
}

function getMigrationSource(settings: {
  llm?: {
    openrouterApiKey?: string;
    authProfiles?: LegacyAuthProfile[];
    providerAuthProfiles?: ProviderAuthProfile[];
  } | null;
}): "legacy_openrouter" | "provider_agnostic" | "mixed" {
  const hasLegacy =
    Boolean(settings.llm?.openrouterApiKey) ||
    Boolean(settings.llm?.authProfiles?.length);
  const hasProviderAgnostic = Boolean(settings.llm?.providerAuthProfiles?.length);

  if (hasLegacy && hasProviderAgnostic) {
    return "mixed";
  }

  if (hasProviderAgnostic) {
    return "provider_agnostic";
  }

  return "legacy_openrouter";
}

function hydrateSettingsForRead<T extends {
  billingMode?: "platform" | "byok";
  billingSource?: "platform" | "byok" | "private";
  settingsContractVersion?: "openrouter_v1" | "provider_agnostic_v1";
  llm?: {
    providerId?: ProviderAuthProfile["providerId"];
    provider?: string;
    openrouterApiKey?: string;
    authProfiles?: LegacyAuthProfile[];
    providerAuthProfiles?: ProviderAuthProfile[];
  };
}>(settings: T): T {
  if (!settings.llm) {
    return settings;
  }

  const llmWithContract = ensureProviderAgnosticLlmContract(
    settings.llm,
    settings.billingMode
  );

  return {
    ...settings,
    billingSource:
      settings.billingSource ??
      mapBillingModeToBillingSource(settings.billingMode),
    settingsContractVersion:
      settings.settingsContractVersion ?? "provider_agnostic_v1",
    llm: llmWithContract,
  };
}

export function findRetiredModelIds(
  selectedModels: Array<{ modelId: string }>,
  modelRecords: Array<{ modelId: string; lifecycleStatus?: string }>
): string[] {
  const retired = new Set(
    modelRecords
      .filter((model) => model.lifecycleStatus === "retired")
      .map((model) => model.modelId)
  );

  return selectedModels
    .map((model) => model.modelId)
    .filter((modelId) => retired.has(modelId));
}

/**
 * Get AI settings for an organization
 */
export const getAISettings = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!settings) {
      return null;
    }

    return hydrateSettingsForRead(settings);
  },
});

/**
 * Update human-in-the-loop and auto-recovery settings
 */
export const updateToolExecutionSettings = mutation({
  args: {
    organizationId: v.id("organizations"),
    humanInLoopEnabled: v.optional(v.boolean()),
    toolApprovalMode: v.optional(v.union(
      v.literal("all"),
      v.literal("dangerous"),
      v.literal("none")
    )),
    autoRecovery: v.optional(v.object({
      enabled: v.boolean(),
      maxRetries: v.number(),
      retryDelay: v.optional(v.number()),
      requireApprovalPerRetry: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!settings) {
      throw new Error("AI settings not found for this organization");
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.humanInLoopEnabled !== undefined) {
      updates.humanInLoopEnabled = args.humanInLoopEnabled;
    }

    if (args.toolApprovalMode !== undefined) {
      updates.toolApprovalMode = args.toolApprovalMode;
    }

    if (args.autoRecovery !== undefined) {
      updates.autoRecovery = args.autoRecovery;
    }

    await ctx.db.patch(settings._id, updates);

    return { success: true };
  },
});

/**
 * Create or update AI settings for an organization
 *
 * Supports both legacy (single model) and new (multi-select) formats
 */
export const upsertAISettings = mutation({
  args: {
    organizationId: v.id("organizations"),
    enabled: v.boolean(),
    billingMode: v.union(
      v.literal("platform"),
      v.literal("byok"),
    ),
    billingSource: v.optional(aiBillingSourceValidator),
    settingsContractVersion: v.optional(v.union(
      v.literal("openrouter_v1"),
      v.literal("provider_agnostic_v1")
    )),
    tier: v.optional(v.union(
      v.literal("standard"),
      v.literal("privacy-enhanced"),
      v.literal("private-llm")
    )),
    llm: v.object({
      // NEW: Multi-select model configuration
      enabledModels: v.optional(v.array(v.object({
        modelId: v.string(),
        isDefault: v.boolean(),
        customLabel: v.optional(v.string()),
        enabledAt: v.number(),
      }))),
      defaultModelId: v.optional(v.string()),
      providerId: v.optional(aiProviderIdValidator),

      // OLD: Legacy fields (for backward compatibility)
      provider: v.optional(v.string()),
      model: v.optional(v.string()),

      // Shared settings
      temperature: v.number(),
      maxTokens: v.number(),
      openrouterApiKey: v.optional(v.string()),
      authProfiles: v.optional(v.array(v.object({
        profileId: v.string(),
        label: v.optional(v.string()),
        openrouterApiKey: v.optional(v.string()),
        enabled: v.boolean(),
        priority: v.optional(v.number()),
        cooldownUntil: v.optional(v.number()),
        failureCount: v.optional(v.number()),
        lastFailureAt: v.optional(v.number()),
        lastFailureReason: v.optional(v.string()),
      }))),
      providerAuthProfiles: v.optional(v.array(v.object({
        profileId: v.string(),
        providerId: aiProviderIdValidator,
        label: v.optional(v.string()),
        baseUrl: v.optional(v.string()),
        credentialSource: v.optional(aiCredentialSourceValidator),
        billingSource: v.optional(aiBillingSourceValidator),
        apiKey: v.optional(v.string()),
        encryptedFields: v.optional(v.array(v.string())),
        capabilities: v.optional(aiCapabilityMatrixValidator),
        enabled: v.boolean(),
        priority: v.optional(v.number()),
        cooldownUntil: v.optional(v.number()),
        failureCount: v.optional(v.number()),
        lastFailureAt: v.optional(v.number()),
        lastFailureReason: v.optional(v.string()),
        metadata: v.optional(v.any()),
      }))),
    }),
    embedding: v.object({
      provider: v.union(
        v.literal("openai"),
        v.literal("voyage"),
        v.literal("cohere"),
        v.literal("none"),
      ),
      model: v.string(),
      dimensions: v.number(),
      apiKey: v.optional(v.string()),
    }),
    monthlyBudgetUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Auto-populate system defaults if no models provided
    let llmConfig = args.llm;
    if (!llmConfig.enabledModels || llmConfig.enabledModels.length === 0) {
      // Get system default models (models marked by super admin as recommended)
      const systemDefaultsRaw = await ctx.db
        .query("aiModels")
        .withIndex("by_system_default", (q) => q.eq("isSystemDefault", true))
        .collect();
      const systemDefaults = systemDefaultsRaw.filter(
        (model) => model.lifecycleStatus !== "retired"
      );

      // Auto-enable system defaults
      if (systemDefaults.length > 0) {
        const now = Date.now();
        llmConfig = {
          ...llmConfig,
          enabledModels: systemDefaults.map((model, index) => ({
            modelId: model.modelId,
            isDefault: index === 0, // First system default is the default
            enabledAt: now,
          })),
          defaultModelId: systemDefaults[0].modelId,
        };
      }
    }

    // Validate multi-select configuration if provided
    if (llmConfig.enabledModels) {
      // Ensure at least one model is enabled
      if (llmConfig.enabledModels.length === 0) {
        throw new Error("At least one model must be enabled");
      }

      // Ensure exactly one model is marked as default
      const defaultModels = llmConfig.enabledModels.filter(m => m.isDefault);
      if (defaultModels.length !== 1) {
        throw new Error("Exactly one model must be set as default");
      }

      // Ensure defaultModelId matches the default model
      const defaultModel = defaultModels[0];
      if (llmConfig.defaultModelId && llmConfig.defaultModelId !== defaultModel.modelId) {
        throw new Error("defaultModelId must match the model marked as default");
      }

      // If defaultModelId not provided, set it
      if (!llmConfig.defaultModelId) {
        llmConfig.defaultModelId = defaultModel.modelId;
      }

      // Ensure selected models are not retired.
      const modelRecords = (
        await Promise.all(
          llmConfig.enabledModels.map((model) =>
            ctx.db
              .query("aiModels")
              .withIndex("by_model_id", (q) => q.eq("modelId", model.modelId))
              .first()
          )
        )
      )
        .filter((model): model is NonNullable<typeof model> => model !== null)
        .map((model) => ({
          modelId: model.modelId,
          lifecycleStatus: model.lifecycleStatus,
        }));
      const retiredModelIds = findRetiredModelIds(llmConfig.enabledModels, modelRecords);
      if (retiredModelIds.length > 0) {
        throw new Error(
          `Retired models cannot be enabled: ${retiredModelIds.join(", ")}`
        );
      }
    }

    if (llmConfig.authProfiles && llmConfig.authProfiles.length > 0) {
      const seenProfileIds = new Set<string>();
      for (const profile of llmConfig.authProfiles) {
        const profileId = normalizeAuthProfileId(profile.profileId);
        if (!profileId) {
          throw new Error("authProfiles.profileId cannot be empty");
        }
        if (seenProfileIds.has(profileId)) {
          throw new Error(`Duplicate auth profile id: ${profileId}`);
        }
        seenProfileIds.add(profileId);
      }
    }

    if (llmConfig.providerAuthProfiles && llmConfig.providerAuthProfiles.length > 0) {
      const seenProviderProfileKeys = new Set<string>();
      for (const profile of llmConfig.providerAuthProfiles) {
        const profileId = normalizeAuthProfileId(profile.profileId);
        if (!profileId) {
          throw new Error("providerAuthProfiles.profileId cannot be empty");
        }

        const providerId = normalizeProviderId(profile.providerId);
        if (!providerId) {
          throw new Error(
            `providerAuthProfiles.providerId is invalid for profile ${profileId}`
          );
        }

        const uniqueKey = `${providerId}:${profileId}`;
        if (seenProviderProfileKeys.has(uniqueKey)) {
          throw new Error(`Duplicate provider auth profile id: ${uniqueKey}`);
        }
        seenProviderProfileKeys.add(uniqueKey);
      }
    }

    llmConfig = ensureProviderAgnosticLlmContract(llmConfig, args.billingMode);

    const billingSource =
      args.billingSource ?? mapBillingModeToBillingSource(args.billingMode);
    const settingsContractVersion =
      args.settingsContractVersion ?? "provider_agnostic_v1";
    const migrationSource = getMigrationSource({ llm: llmConfig });

    const existing = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        billingMode: args.billingMode,
        billingSource,
        settingsContractVersion,
        tier: args.tier,
        llm: llmConfig,
        embedding: args.embedding,
        monthlyBudgetUsd: args.monthlyBudgetUsd,
        migrationState: {
          providerContractBackfilledAt: now,
          source: migrationSource,
          lastMigratedBy: "upsertAISettings",
        },
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("organizationAiSettings", {
      organizationId: args.organizationId,
      enabled: args.enabled,
      billingMode: args.billingMode,
      billingSource,
      settingsContractVersion,
      tier: args.tier,
      llm: llmConfig,
      embedding: args.embedding,
      monthlyBudgetUsd: args.monthlyBudgetUsd,
      currentMonthSpend: 0,
      migrationState: {
        providerContractBackfilledAt: now,
        source: migrationSource,
        lastMigratedBy: "upsertAISettings",
      },
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Backfill provider-agnostic AI settings contract for legacy OpenRouter-only orgs.
 * Internal-only migration scaffold for lane A/B rollouts.
 */
export const backfillProviderAgnosticSettings = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!settings) {
      return { updated: false, reason: "settings_not_found" as const };
    }

    const now = Date.now();
    const llmWithContract = ensureProviderAgnosticLlmContract(
      settings.llm,
      settings.billingMode
    );
    const billingSource =
      settings.billingSource ?? mapBillingModeToBillingSource(settings.billingMode);
    const migrationSource = getMigrationSource({ llm: llmWithContract });

    const needsBackfill =
      settings.settingsContractVersion !== "provider_agnostic_v1" ||
      settings.billingSource === undefined ||
      settings.llm.providerId === undefined ||
      settings.llm.providerAuthProfiles === undefined;

    if (needsBackfill && !args.dryRun) {
      await ctx.db.patch(settings._id, {
        llm: llmWithContract,
        billingSource,
        settingsContractVersion: "provider_agnostic_v1",
        migrationState: {
          providerContractBackfilledAt: now,
          source: migrationSource,
          lastMigratedBy: "backfillProviderAgnosticSettings",
        },
        updatedAt: now,
      });
    }

    const existingMigration = await ctx.db
      .query("aiSettingsMigrations")
      .withIndex("by_org_migration_key", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("migrationKey", PROVIDER_AGNOSTIC_SETTINGS_MIGRATION_KEY)
      )
      .first();

    const migrationStatus =
      args.dryRun || !needsBackfill ? "pending" : "completed";
    const migrationPayload = {
      status: migrationStatus,
      source: migrationSource,
      lastAttemptAt: now,
      completedAt: migrationStatus === "completed" ? now : undefined,
      error: undefined,
      details: {
        dryRun: Boolean(args.dryRun),
        neededBackfill: needsBackfill,
        providerAuthProfileCount:
          llmWithContract.providerAuthProfiles?.length ?? 0,
      },
      updatedAt: now,
    } as const;

    if (existingMigration) {
      await ctx.db.patch(existingMigration._id, migrationPayload);
    } else {
      await ctx.db.insert("aiSettingsMigrations", {
        organizationId: args.organizationId,
        migrationKey: PROVIDER_AGNOSTIC_SETTINGS_MIGRATION_KEY,
        createdAt: now,
        ...migrationPayload,
      });
    }

    return {
      updated: needsBackfill && !args.dryRun,
      dryRun: Boolean(args.dryRun),
      source: migrationSource,
      providerAuthProfileCount: llmWithContract.providerAuthProfiles?.length ?? 0,
    };
  },
});

/**
 * Roll back provider-agnostic AI settings fields to the legacy OpenRouter contract.
 * Internal-only emergency fallback for staged rollout reversions.
 */
export const rollbackProviderAgnosticSettings = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!settings) {
      return {
        rolledBack: false,
        dryRun: Boolean(args.dryRun),
        reason: "settings_not_found" as const,
      };
    }

    const now = Date.now();
    const hasProviderContractFields =
      settings.settingsContractVersion === "provider_agnostic_v1" ||
      settings.billingSource !== undefined ||
      settings.llm.providerId !== undefined ||
      settings.llm.providerAuthProfiles !== undefined;

    if (!hasProviderContractFields) {
      return {
        rolledBack: false,
        dryRun: Boolean(args.dryRun),
        reason: "already_legacy" as const,
      };
    }

    if (!args.dryRun) {
      await ctx.db.patch(settings._id, {
        billingSource: undefined,
        settingsContractVersion: "openrouter_v1",
        llm: {
          ...settings.llm,
          providerId: undefined,
          providerAuthProfiles: undefined,
        },
        migrationState: {
          providerContractBackfilledAt: now,
          source: "legacy_openrouter",
          lastMigratedBy: "rollbackProviderAgnosticSettings",
        },
        updatedAt: now,
      });
    }

    const existingMigration = await ctx.db
      .query("aiSettingsMigrations")
      .withIndex("by_org_migration_key", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("migrationKey", PROVIDER_AGNOSTIC_SETTINGS_MIGRATION_KEY)
      )
      .first();

    const migrationStatus = args.dryRun ? "pending" : "failed";
    const migrationPayload = {
      status: migrationStatus,
      source: "legacy_openrouter" as const,
      lastAttemptAt: now,
      completedAt: undefined,
      error: args.dryRun ? undefined : "rolled_back_to_openrouter_v1",
      details: {
        dryRun: Boolean(args.dryRun),
        rollback: true,
        hadProviderContractFields: hasProviderContractFields,
      },
      updatedAt: now,
    } as const;

    if (existingMigration) {
      await ctx.db.patch(existingMigration._id, migrationPayload);
    } else {
      await ctx.db.insert("aiSettingsMigrations", {
        organizationId: args.organizationId,
        migrationKey: PROVIDER_AGNOSTIC_SETTINGS_MIGRATION_KEY,
        createdAt: now,
        ...migrationPayload,
      });
    }

    return {
      rolledBack: !args.dryRun,
      dryRun: Boolean(args.dryRun),
      reason: "provider_contract_removed" as const,
    };
  },
});

/**
 * Record an auth profile failure and apply cooldown.
 * Internal-only: called by runtime failover flow.
 */
export const recordAuthProfileFailure = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    profileId: v.string(),
    providerId: v.optional(aiProviderIdValidator),
    reason: v.string(),
    cooldownUntil: v.number(),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!settings) {
      return { updated: false };
    }

    const hasProviderProfiles = Boolean(
      settings?.llm?.providerAuthProfiles?.length
    );
    const targetProviderId =
      normalizeProviderId(args.providerId) ?? resolveLlmProviderId(settings.llm);
    const hasLegacyProfiles =
      targetProviderId === "openrouter" &&
      Boolean(settings?.llm?.authProfiles?.length);

    if (!hasLegacyProfiles && !hasProviderProfiles) {
      return { updated: false };
    }

    const normalizedProfileId = normalizeAuthProfileId(args.profileId);
    const now = Date.now();
    let didUpdate = false;

    const updatedLegacyProfiles = (settings.llm.authProfiles ?? []).map((profile) => {
      if (
        !hasLegacyProfiles ||
        normalizeAuthProfileId(profile.profileId) !== normalizedProfileId
      ) {
        return profile;
      }

      const nextFailureCount = (profile.failureCount ?? 0) + 1;
      didUpdate = true;
      return {
        ...profile,
        failureCount: nextFailureCount,
        cooldownUntil: args.cooldownUntil,
        lastFailureAt: now,
        lastFailureReason: args.reason,
      };
    });
    const updatedProviderProfiles = (
      settings.llm.providerAuthProfiles ?? []
    ).map((profile) => {
      const profileProviderId =
        normalizeProviderId(profile.providerId) ?? "openrouter";

      if (
        profileProviderId !== targetProviderId ||
        normalizeAuthProfileId(profile.profileId) !== normalizedProfileId
      ) {
        return profile;
      }

      const nextFailureCount = (profile.failureCount ?? 0) + 1;
      didUpdate = true;
      return {
        ...profile,
        failureCount: nextFailureCount,
        cooldownUntil: args.cooldownUntil,
        lastFailureAt: now,
        lastFailureReason: args.reason,
      };
    });

    if (!didUpdate) {
      return { updated: false };
    }

    await ctx.db.patch(settings._id, {
      llm: {
        ...settings.llm,
        authProfiles: settings.llm.authProfiles?.length
          ? hasLegacyProfiles
            ? updatedLegacyProfiles
            : settings.llm.authProfiles
          : undefined,
        providerAuthProfiles: hasProviderProfiles
          ? updatedProviderProfiles
          : undefined,
      },
      updatedAt: now,
    });

    return { updated: true };
  },
});

/**
 * Clear auth profile cooldown/failure counters after successful usage.
 * Internal-only: called by runtime failover flow.
 */
export const recordAuthProfileSuccess = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    profileId: v.string(),
    providerId: v.optional(aiProviderIdValidator),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!settings) {
      return { updated: false };
    }

    const hasProviderProfiles = Boolean(
      settings?.llm?.providerAuthProfiles?.length
    );
    const targetProviderId =
      normalizeProviderId(args.providerId) ?? resolveLlmProviderId(settings.llm);
    const hasLegacyProfiles =
      targetProviderId === "openrouter" &&
      Boolean(settings?.llm?.authProfiles?.length);

    if (!hasLegacyProfiles && !hasProviderProfiles) {
      return { updated: false };
    }

    const normalizedProfileId = normalizeAuthProfileId(args.profileId);
    const now = Date.now();
    let didUpdate = false;

    const updatedLegacyProfiles = (settings.llm.authProfiles ?? []).map((profile) => {
      if (
        !hasLegacyProfiles ||
        normalizeAuthProfileId(profile.profileId) !== normalizedProfileId
      ) {
        return profile;
      }

      didUpdate = true;
      return {
        ...profile,
        cooldownUntil: undefined,
        failureCount: 0,
        lastFailureAt: undefined,
        lastFailureReason: undefined,
      };
    });
    const updatedProviderProfiles = (
      settings.llm.providerAuthProfiles ?? []
    ).map((profile) => {
      const profileProviderId =
        normalizeProviderId(profile.providerId) ?? "openrouter";

      if (
        profileProviderId !== targetProviderId ||
        normalizeAuthProfileId(profile.profileId) !== normalizedProfileId
      ) {
        return profile;
      }

      didUpdate = true;
      return {
        ...profile,
        cooldownUntil: undefined,
        failureCount: 0,
        lastFailureAt: undefined,
        lastFailureReason: undefined,
      };
    });

    if (!didUpdate) {
      return { updated: false };
    }

    await ctx.db.patch(settings._id, {
      llm: {
        ...settings.llm,
        authProfiles: settings.llm.authProfiles?.length
          ? hasLegacyProfiles
            ? updatedLegacyProfiles
            : settings.llm.authProfiles
          : undefined,
        providerAuthProfiles: hasProviderProfiles
          ? updatedProviderProfiles
          : undefined,
      },
      updatedAt: now,
    });

    return { updated: true };
  },
});

/**
 * Update monthly spend for an organization
 */
export const updateMonthlySpend = mutation({
  args: {
    organizationId: v.id("organizations"),
    costUsd: v.number(),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!settings) return;

    // Check if we're in a new month
    const now = new Date();
    const lastUpdate = new Date(settings.updatedAt);
    const isNewMonth =
      now.getMonth() !== lastUpdate.getMonth() ||
      now.getFullYear() !== lastUpdate.getFullYear();

    if (isNewMonth) {
      // Reset monthly spend
      await ctx.db.patch(settings._id, {
        currentMonthSpend: args.costUsd,
        updatedAt: Date.now(),
      });
    } else {
      // Add to current month
      await ctx.db.patch(settings._id, {
        currentMonthSpend: settings.currentMonthSpend + args.costUsd,
        updatedAt: Date.now(),
      });
    }

    // Check if over budget
    if (settings.monthlyBudgetUsd) {
      const newSpend = isNewMonth
        ? args.costUsd
        : settings.currentMonthSpend + args.costUsd;

      if (newSpend > settings.monthlyBudgetUsd) {
        // TODO: Send alert or disable AI
        console.warn(
          `Organization ${args.organizationId} exceeded monthly AI budget: $${newSpend} > $${settings.monthlyBudgetUsd}`
        );
      }
    }
  },
});

/**
 * Check rate limit for an organization
 */
export const checkRateLimit = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentExecutions = await ctx.db
      .query("aiToolExecutions")
      .withIndex("by_org_time", (q) =>
        q.eq("organizationId", args.organizationId).gte("executedAt", oneHourAgo)
      )
      .collect();

    const limit = 100; // 100 requests per hour
    return {
      remaining: Math.max(0, limit - recentExecutions.length),
      limit,
      exceeded: recentExecutions.length >= limit,
    };
  },
});
