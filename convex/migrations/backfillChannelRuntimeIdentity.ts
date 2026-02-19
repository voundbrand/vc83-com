import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

type JsonRecord = Record<string, unknown>;
type ProviderProfileType = "platform" | "organization";
type SupportedProvider = "slack" | "telegram" | "whatsapp";
type RolloutStage = "off" | "canary" | "on";
type RollbackMode = "legacy_provider_only" | "installation_identity";

type ChannelRuntimeGlobalFlag = {
  enabled: boolean;
  allowLegacyProviderFallback: boolean;
  progressiveRollout: boolean;
  rollbackMode: RollbackMode;
  updatedAt: number;
  updatedBy?: string;
};

type ChannelRuntimeProviderFlag = {
  enabled: boolean;
  stage: RolloutStage;
  canaryOrganizationIds: string[];
  rollbackEnabled: boolean;
  securityMatrixGreen?: boolean;
  securityMatrixCheckedAt?: number;
  securityMatrixReference?: string;
  lastRollbackAt?: number;
  rollbackReason?: string;
  updatedAt: number;
  updatedBy?: string;
};

const SUPPORTED_PROVIDER_SET = new Set<SupportedProvider>([
  "slack",
  "telegram",
  "whatsapp",
]);
const ROLLOUT_STAGES = new Set<RolloutStage>(["off", "canary", "on"]);
const ROLLBACK_MODES = new Set<RollbackMode>([
  "legacy_provider_only",
  "installation_identity",
]);

const DEFAULT_BATCH_SIZE = 100;
const CHANNEL_RUNTIME_IDENTITY_GLOBAL_KEY = "byoa_channel_runtime.identity.global";
const CHANNEL_RUNTIME_IDENTITY_PROVIDER_KEYS: Record<SupportedProvider, string> = {
  slack: "byoa_channel_runtime.identity.slack",
  telegram: "byoa_channel_runtime.identity.telegram",
  whatsapp: "byoa_channel_runtime.identity.whatsapp",
};

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return {};
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function asProviderProfileType(value: unknown): ProviderProfileType | undefined {
  return value === "platform" || value === "organization" ? value : undefined;
}

function asRolloutStage(value: unknown): RolloutStage | undefined {
  return typeof value === "string" && ROLLOUT_STAGES.has(value as RolloutStage)
    ? (value as RolloutStage)
    : undefined;
}

function asRollbackMode(value: unknown): RollbackMode | undefined {
  return typeof value === "string" && ROLLBACK_MODES.has(value as RollbackMode)
    ? (value as RollbackMode)
    : undefined;
}

function asSupportedProvider(value: unknown): SupportedProvider | null {
  if (value === "slack" || value === "telegram" || value === "whatsapp") {
    return value;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => asString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function uniqueStringArray(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function firstDefined(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value) {
      return value;
    }
  }
  return undefined;
}

function deriveDefaultProviderProfileId(
  provider: SupportedProvider,
  metadata: JsonRecord
): string {
  if (provider === "slack") {
    const appId = asString(metadata.appId) || asString(metadata.metaAppId);
    return appId ? `slack_app:${appId}` : "slack_app:organization_default";
  }

  if (provider === "whatsapp") {
    const metaAppId =
      asString(metadata.metaAppId) ||
      asString(metadata.appId) ||
      asString(process.env.META_APP_ID);
    if (metaAppId) {
      return `meta_app:${metaAppId}`;
    }
    const businessId = asString(metadata.businessId) || asString(metadata.wabaId);
    return businessId
      ? `meta_business:${businessId}`
      : "meta_business:organization_default";
  }

  const username = asString(metadata.telegramBotUsername);
  return username
    ? `telegram_bot:${username}`
    : "telegram_bot:organization_default";
}

function hasCanonicalBindingIdentity(props: JsonRecord): boolean {
  return Boolean(
    asString(props.providerInstallationId) &&
      asString(props.providerProfileId) &&
      asProviderProfileType(props.providerProfileType) &&
      asString(props.routeKey)
  );
}

function hasCanonicalOAuthIdentity(record: JsonRecord, metadata: JsonRecord): boolean {
  return Boolean(
    asString(record.providerInstallationId) &&
      asString(record.providerProfileId) &&
      asProviderProfileType(record.providerProfileType) &&
      asString(record.providerRouteKey) &&
      asString(metadata.installationId) &&
      asString(metadata.appProfileId) &&
      asProviderProfileType(metadata.profileType) &&
      asString(metadata.routeKey)
  );
}

function buildDefaultGlobalFlag(now: number): ChannelRuntimeGlobalFlag {
  return {
    enabled: false,
    allowLegacyProviderFallback: true,
    progressiveRollout: true,
    rollbackMode: "legacy_provider_only",
    updatedAt: now,
  };
}

function buildDefaultProviderFlag(now: number): ChannelRuntimeProviderFlag {
  return {
    enabled: false,
    stage: "off",
    canaryOrganizationIds: [],
    rollbackEnabled: true,
    securityMatrixGreen: false,
    updatedAt: now,
  };
}

function normalizeGlobalFlag(
  value: unknown,
  fallbackNow: number
): ChannelRuntimeGlobalFlag {
  const base = buildDefaultGlobalFlag(fallbackNow);
  const record = asRecord(value);
  return {
    enabled: asBoolean(record.enabled) ?? base.enabled,
    allowLegacyProviderFallback:
      asBoolean(record.allowLegacyProviderFallback) ??
      base.allowLegacyProviderFallback,
    progressiveRollout:
      asBoolean(record.progressiveRollout) ?? base.progressiveRollout,
    rollbackMode: asRollbackMode(record.rollbackMode) ?? base.rollbackMode,
    updatedAt:
      typeof record.updatedAt === "number" ? record.updatedAt : base.updatedAt,
    updatedBy: asString(record.updatedBy),
  };
}

function normalizeProviderFlag(
  value: unknown,
  fallbackNow: number
): ChannelRuntimeProviderFlag {
  const base = buildDefaultProviderFlag(fallbackNow);
  const record = asRecord(value);
  return {
    enabled: asBoolean(record.enabled) ?? base.enabled,
    stage: asRolloutStage(record.stage) ?? base.stage,
    canaryOrganizationIds: uniqueStringArray(
      asStringArray(record.canaryOrganizationIds)
    ),
    rollbackEnabled: asBoolean(record.rollbackEnabled) ?? base.rollbackEnabled,
    securityMatrixGreen: asBoolean(record.securityMatrixGreen),
    securityMatrixCheckedAt:
      typeof record.securityMatrixCheckedAt === "number"
        ? record.securityMatrixCheckedAt
        : undefined,
    securityMatrixReference: asString(record.securityMatrixReference),
    lastRollbackAt:
      typeof record.lastRollbackAt === "number" ? record.lastRollbackAt : undefined,
    rollbackReason: asString(record.rollbackReason),
    updatedAt:
      typeof record.updatedAt === "number" ? record.updatedAt : base.updatedAt,
    updatedBy: asString(record.updatedBy),
  };
}

function getDefaultRolloutFlagEntries(
  now: number
): Array<{ key: string; value: unknown; description: string }> {
  return [
    {
      key: CHANNEL_RUNTIME_IDENTITY_GLOBAL_KEY,
      value: buildDefaultGlobalFlag(now),
      description:
        "Global rollout controls for installation-aware channel routing identity.",
    },
    {
      key: CHANNEL_RUNTIME_IDENTITY_PROVIDER_KEYS.slack,
      value: buildDefaultProviderFlag(now),
      description:
        "Slack installation-aware routing rollout gate (off/canary/on).",
    },
    {
      key: CHANNEL_RUNTIME_IDENTITY_PROVIDER_KEYS.telegram,
      value: buildDefaultProviderFlag(now),
      description:
        "Telegram installation-aware routing rollout gate (off/canary/on).",
    },
    {
      key: CHANNEL_RUNTIME_IDENTITY_PROVIDER_KEYS.whatsapp,
      value: buildDefaultProviderFlag(now),
      description:
        "WhatsApp installation-aware routing rollout gate (off/canary/on).",
    },
  ];
}

export const backfillChannelProviderBindingIdentity = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    processed: number;
    migratedBindings: number;
    skippedAlreadyMigrated: number;
    skippedUnsupportedProvider: number;
    skippedMissingIdentity: number;
    nextCursor: string | null;
    hasNextPage: boolean;
  }> => {
    const numItems =
      args.batchSize && args.batchSize > 0
        ? Math.min(args.batchSize, 250)
        : DEFAULT_BATCH_SIZE;
    const dryRun = args.dryRun === true;

    const page = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "channel_provider_binding"))
      .paginate({ cursor: args.cursor ?? null, numItems });

    const connectionCache = new Map<string, Array<Record<string, unknown>>>();
    const telegramSettingsCache = new Map<string, Record<string, unknown> | null>();

    async function getActiveProviderConnections(
      organizationId: Id<"organizations">,
      provider: "slack" | "whatsapp"
    ) {
      const key = `${organizationId}:${provider}`;
      const cached = connectionCache.get(key);
      if (cached) {
        return cached;
      }

      const connections = await ctx.db
        .query("oauthConnections")
        .withIndex("by_org_and_provider", (q) =>
          q.eq("organizationId", organizationId).eq("provider", provider)
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
      const normalized = connections.map(
        (connection) => connection as Record<string, unknown>
      );
      connectionCache.set(key, normalized);
      return normalized;
    }

    async function getTelegramSettings(
      organizationId: Id<"organizations">
    ): Promise<Record<string, unknown> | null> {
      const key = String(organizationId);
      if (telegramSettingsCache.has(key)) {
        return telegramSettingsCache.get(key) || null;
      }
      const settings = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", organizationId).eq("type", "telegram_settings")
        )
        .first();
      const normalized = settings ? (settings as Record<string, unknown>) : null;
      telegramSettingsCache.set(key, normalized);
      return normalized;
    }

    let migratedBindings = 0;
    let skippedAlreadyMigrated = 0;
    let skippedUnsupportedProvider = 0;
    let skippedMissingIdentity = 0;

    for (const binding of page.page) {
      const props = asRecord(binding.customProperties);
      const provider = asSupportedProvider(props.providerId);
      if (!provider || !SUPPORTED_PROVIDER_SET.has(provider)) {
        skippedUnsupportedProvider += 1;
        continue;
      }

      const currentConnectionId = firstDefined(
        asString(props.providerConnectionId),
        asString(props.oauthConnectionId)
      );
      const currentAccountId = asString(props.providerAccountId);
      const currentInstallationId = firstDefined(
        asString(props.providerInstallationId),
        asString(props.installationId)
      );
      const currentProfileId = firstDefined(
        asString(props.providerProfileId),
        asString(props.appProfileId)
      );
      const currentProfileType =
        asProviderProfileType(props.providerProfileType) ||
        asProviderProfileType(props.profileType);
      const currentRouteKey = firstDefined(
        asString(props.routeKey),
        asString(props.bindingRouteKey)
      );

      let providerConnectionId = currentConnectionId;
      let providerAccountId = currentAccountId;
      let providerInstallationId = currentInstallationId;
      let providerProfileId = currentProfileId;
      let providerProfileType = currentProfileType;
      let routeKey = currentRouteKey;

      if (provider === "slack" || provider === "whatsapp") {
        const activeConnections = await getActiveProviderConnections(
          binding.organizationId,
          provider
        );

        const resolvedConnection =
          activeConnections.find(
            (connection) => String(connection._id) === currentConnectionId
          ) ||
          activeConnections.find(
            (connection) =>
              asString(connection.providerAccountId) === currentAccountId
          ) ||
          activeConnections.find((connection) => {
            const metadata = asRecord(connection.customProperties);
            return (
              asString(connection.providerInstallationId) ===
                currentInstallationId ||
              asString(metadata.providerInstallationId) === currentInstallationId ||
              asString(metadata.installationId) === currentInstallationId
            );
          }) ||
          activeConnections[0];

        if (resolvedConnection) {
          const metadata = asRecord(resolvedConnection.customProperties);
          providerConnectionId = firstDefined(
            providerConnectionId,
            asString(resolvedConnection._id)
          );
          providerAccountId = firstDefined(
            providerAccountId,
            asString(resolvedConnection.providerAccountId)
          );
          providerInstallationId = firstDefined(
            providerInstallationId,
            asString(resolvedConnection.providerInstallationId),
            asString(metadata.providerInstallationId),
            asString(metadata.installationId),
            providerAccountId,
            providerConnectionId
          );
          providerProfileId = firstDefined(
            providerProfileId,
            asString(resolvedConnection.providerProfileId),
            asString(metadata.providerProfileId),
            asString(metadata.appProfileId),
            deriveDefaultProviderProfileId(provider, metadata)
          );
          providerProfileType =
            providerProfileType ||
            asProviderProfileType(resolvedConnection.providerProfileType) ||
            asProviderProfileType(metadata.providerProfileType) ||
            asProviderProfileType(metadata.profileType) ||
            "organization";
          routeKey = firstDefined(
            routeKey,
            asString(resolvedConnection.providerRouteKey),
            asString(metadata.providerRouteKey),
            asString(metadata.routeKey),
            providerInstallationId ? `${provider}:${providerInstallationId}` : undefined
          );
        }
      } else {
        const settings = await getTelegramSettings(binding.organizationId);
        const settingsProps = asRecord(settings?.customProperties);
        const telegramUsername = asString(settingsProps.telegramBotUsername);
        providerAccountId = firstDefined(
          providerAccountId,
          telegramUsername
        );
        providerInstallationId = firstDefined(
          providerInstallationId,
          providerAccountId,
          settings ? asString(settings._id) : undefined
        );
        providerProfileId = firstDefined(
          providerProfileId,
          deriveDefaultProviderProfileId("telegram", settingsProps)
        );
        providerProfileType = providerProfileType || "organization";
        routeKey = firstDefined(
          routeKey,
          providerInstallationId ? `telegram:${providerInstallationId}` : undefined
        );
      }

      if (
        !providerInstallationId ||
        !providerProfileId ||
        !providerProfileType ||
        !routeKey
      ) {
        skippedMissingIdentity += 1;
        continue;
      }

      const nextProps: JsonRecord = {
        ...props,
        providerConnectionId,
        providerAccountId,
        providerInstallationId,
        providerProfileId,
        providerProfileType,
        routeKey,
        oauthConnectionId: providerConnectionId,
        installationId: providerInstallationId,
        appProfileId: providerProfileId,
        profileType: providerProfileType,
        bindingRouteKey: routeKey,
      };

      const changed =
        asString(props.providerConnectionId) !== providerConnectionId ||
        asString(props.providerAccountId) !== providerAccountId ||
        asString(props.providerInstallationId) !== providerInstallationId ||
        asString(props.providerProfileId) !== providerProfileId ||
        asProviderProfileType(props.providerProfileType) !== providerProfileType ||
        asString(props.routeKey) !== routeKey ||
        !hasCanonicalBindingIdentity(props);

      if (!changed) {
        skippedAlreadyMigrated += 1;
        continue;
      }

      if (!dryRun) {
        await ctx.db.patch(binding._id, {
          customProperties: nextProps,
          updatedAt: Date.now(),
        } as never);
      }
      migratedBindings += 1;
    }

    return {
      processed: page.page.length,
      migratedBindings,
      skippedAlreadyMigrated,
      skippedUnsupportedProvider,
      skippedMissingIdentity,
      nextCursor: page.continueCursor ?? null,
      hasNextPage: !page.isDone,
    };
  },
});

export const backfillOAuthConnectionIdentity = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    processed: number;
    migratedConnections: number;
    skippedAlreadyMigrated: number;
    skippedUnsupportedProvider: number;
    skippedMissingIdentity: number;
    nextCursor: string | null;
    hasNextPage: boolean;
  }> => {
    const numItems =
      args.batchSize && args.batchSize > 0
        ? Math.min(args.batchSize, 250)
        : DEFAULT_BATCH_SIZE;
    const dryRun = args.dryRun === true;

    const page = await ctx.db
      .query("oauthConnections")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .paginate({ cursor: args.cursor ?? null, numItems });

    let migratedConnections = 0;
    let skippedAlreadyMigrated = 0;
    let skippedUnsupportedProvider = 0;
    let skippedMissingIdentity = 0;

    for (const connection of page.page) {
      const provider = asSupportedProvider(connection.provider);
      if (!provider || (provider !== "slack" && provider !== "whatsapp")) {
        skippedUnsupportedProvider += 1;
        continue;
      }

      const record = connection as Record<string, unknown>;
      const metadata = asRecord(connection.customProperties);

      const providerInstallationId = firstDefined(
        asString(record.providerInstallationId),
        asString(metadata.providerInstallationId),
        asString(metadata.installationId),
        asString(connection.providerAccountId),
        asString(connection._id)
      );
      const providerProfileId = firstDefined(
        asString(record.providerProfileId),
        asString(metadata.providerProfileId),
        asString(metadata.appProfileId),
        deriveDefaultProviderProfileId(provider, metadata)
      );
      const providerProfileType =
        asProviderProfileType(record.providerProfileType) ||
        asProviderProfileType(metadata.providerProfileType) ||
        asProviderProfileType(metadata.profileType) ||
        "organization";
      const providerRouteKey = firstDefined(
        asString(record.providerRouteKey),
        asString(metadata.providerRouteKey),
        asString(metadata.routeKey),
        providerInstallationId ? `${provider}:${providerInstallationId}` : undefined
      );

      if (
        !providerInstallationId ||
        !providerProfileId ||
        !providerProfileType ||
        !providerRouteKey
      ) {
        skippedMissingIdentity += 1;
        continue;
      }

      const nextMetadata: JsonRecord = {
        ...metadata,
        providerInstallationId,
        providerProfileId,
        providerProfileType,
        providerRouteKey,
        installationId: providerInstallationId,
        appProfileId: providerProfileId,
        profileType: providerProfileType,
        routeKey: providerRouteKey,
      };

      const changed =
        asString(record.providerInstallationId) !== providerInstallationId ||
        asString(record.providerProfileId) !== providerProfileId ||
        asProviderProfileType(record.providerProfileType) !== providerProfileType ||
        asString(record.providerRouteKey) !== providerRouteKey ||
        asString(metadata.installationId) !== providerInstallationId ||
        asString(metadata.appProfileId) !== providerProfileId ||
        asProviderProfileType(metadata.profileType) !== providerProfileType ||
        asString(metadata.routeKey) !== providerRouteKey ||
        !hasCanonicalOAuthIdentity(record, metadata);

      if (!changed) {
        skippedAlreadyMigrated += 1;
        continue;
      }

      if (!dryRun) {
        await ctx.db.patch(connection._id, {
          providerInstallationId,
          providerProfileId,
          providerProfileType,
          providerRouteKey,
          customProperties: nextMetadata,
          updatedAt: Date.now(),
        } as never);
      }
      migratedConnections += 1;
    }

    return {
      processed: page.page.length,
      migratedConnections,
      skippedAlreadyMigrated,
      skippedUnsupportedProvider,
      skippedMissingIdentity,
      nextCursor: page.continueCursor ?? null,
      hasNextPage: !page.isDone,
    };
  },
});

export const initializeChannelRuntimeIdentityFlags = internalMutation({
  args: {
    overwriteExisting: v.optional(v.boolean()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    seeded: number;
    updated: number;
    skippedExisting: number;
    keys: string[];
  }> => {
    const now = Date.now();
    const overwriteExisting = args.overwriteExisting === true;
    const dryRun = args.dryRun === true;

    const defaultFlags = getDefaultRolloutFlagEntries(now);

    let seeded = 0;
    let updated = 0;
    let skippedExisting = 0;

    for (const entry of defaultFlags) {
      const existing = await ctx.db
        .query("platformSettings")
        .withIndex("by_key", (q) => q.eq("key", entry.key))
        .first();

      if (!existing) {
        if (!dryRun) {
          await ctx.db.insert("platformSettings", {
            key: entry.key,
            value: entry.value,
            description: entry.description,
            createdAt: now,
            updatedAt: now,
          });
        }
        seeded += 1;
        continue;
      }

      if (!overwriteExisting) {
        skippedExisting += 1;
        continue;
      }

      if (!dryRun) {
        await ctx.db.patch(existing._id, {
          value: entry.value,
          description: entry.description,
          updatedAt: now,
        });
      }
      updated += 1;
    }

    return {
      seeded,
      updated,
      skippedExisting,
      keys: defaultFlags.map((entry) => entry.key),
    };
  },
});

export const getChannelRuntimeIdentityFlagState = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const globalSetting = await ctx.db
      .query("platformSettings")
      .withIndex("by_key", (q) => q.eq("key", CHANNEL_RUNTIME_IDENTITY_GLOBAL_KEY))
      .first();

    const providerSettings = await Promise.all(
      (["slack", "telegram", "whatsapp"] as const).map(async (provider) => {
        const key = CHANNEL_RUNTIME_IDENTITY_PROVIDER_KEYS[provider];
        const setting = await ctx.db
          .query("platformSettings")
          .withIndex("by_key", (q) => q.eq("key", key))
          .first();
        return {
          provider,
          key,
          exists: Boolean(setting),
          value: normalizeProviderFlag(setting?.value, now),
        };
      })
    );

    return {
      key: CHANNEL_RUNTIME_IDENTITY_GLOBAL_KEY,
      exists: Boolean(globalSetting),
      global: normalizeGlobalFlag(globalSetting?.value, now),
      providers: Object.fromEntries(
        providerSettings.map((entry) => [entry.provider, entry.value])
      ) as Record<SupportedProvider, ChannelRuntimeProviderFlag>,
      providerKeys: Object.fromEntries(
        providerSettings.map((entry) => [entry.provider, entry.key])
      ) as Record<SupportedProvider, string>,
      generatedAt: now,
    };
  },
});

export const setChannelRuntimeIdentityGlobalFlag = internalMutation({
  args: {
    enabled: v.optional(v.boolean()),
    allowLegacyProviderFallback: v.optional(v.boolean()),
    progressiveRollout: v.optional(v.boolean()),
    rollbackMode: v.optional(
      v.union(v.literal("legacy_provider_only"), v.literal("installation_identity"))
    ),
    updatedBy: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dryRun = args.dryRun === true;
    const defaultDescription =
      "Global rollout controls for installation-aware channel routing identity.";

    const existing = await ctx.db
      .query("platformSettings")
      .withIndex("by_key", (q) => q.eq("key", CHANNEL_RUNTIME_IDENTITY_GLOBAL_KEY))
      .first();

    const previous = normalizeGlobalFlag(existing?.value, now);
    const next: ChannelRuntimeGlobalFlag = {
      ...previous,
      enabled: args.enabled ?? previous.enabled,
      allowLegacyProviderFallback:
        args.allowLegacyProviderFallback ?? previous.allowLegacyProviderFallback,
      progressiveRollout: args.progressiveRollout ?? previous.progressiveRollout,
      rollbackMode: args.rollbackMode ?? previous.rollbackMode,
      updatedAt: now,
      updatedBy: asString(args.updatedBy) ?? previous.updatedBy,
    };
    const changed = JSON.stringify(previous) !== JSON.stringify(next);

    if (!dryRun && changed) {
      if (existing) {
        await ctx.db.patch(existing._id, {
          value: next,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("platformSettings", {
          key: CHANNEL_RUNTIME_IDENTITY_GLOBAL_KEY,
          value: next,
          description: defaultDescription,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return {
      key: CHANNEL_RUNTIME_IDENTITY_GLOBAL_KEY,
      changed,
      dryRun,
      previous,
      next,
    };
  },
});

export const setChannelRuntimeIdentityProviderFlag = internalMutation({
  args: {
    provider: v.union(
      v.literal("slack"),
      v.literal("telegram"),
      v.literal("whatsapp")
    ),
    stage: v.optional(v.union(v.literal("off"), v.literal("canary"), v.literal("on"))),
    enabled: v.optional(v.boolean()),
    canaryOrganizationIds: v.optional(v.array(v.string())),
    addCanaryOrganizationIds: v.optional(v.array(v.string())),
    removeCanaryOrganizationIds: v.optional(v.array(v.string())),
    rollbackEnabled: v.optional(v.boolean()),
    securityMatrixGreen: v.optional(v.boolean()),
    securityMatrixReference: v.optional(v.string()),
    force: v.optional(v.boolean()),
    updatedBy: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dryRun = args.dryRun === true;
    const force = args.force === true;
    const provider = args.provider as SupportedProvider;
    const key = CHANNEL_RUNTIME_IDENTITY_PROVIDER_KEYS[provider];
    const defaultDescription = `${provider[0].toUpperCase()}${provider.slice(
      1
    )} installation-aware routing rollout gate (off/canary/on).`;

    const existing = await ctx.db
      .query("platformSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    const previous = normalizeProviderFlag(existing?.value, now);

    let canaryOrganizationIds = previous.canaryOrganizationIds;
    if (args.canaryOrganizationIds) {
      canaryOrganizationIds = uniqueStringArray(args.canaryOrganizationIds);
    }
    if (args.addCanaryOrganizationIds && args.addCanaryOrganizationIds.length > 0) {
      canaryOrganizationIds = uniqueStringArray([
        ...canaryOrganizationIds,
        ...args.addCanaryOrganizationIds,
      ]);
    }
    if (
      args.removeCanaryOrganizationIds &&
      args.removeCanaryOrganizationIds.length > 0
    ) {
      const removals = new Set(args.removeCanaryOrganizationIds.map((value) => value.trim()));
      canaryOrganizationIds = canaryOrganizationIds.filter(
        (organizationId) => !removals.has(organizationId.trim())
      );
    }

    const requestedStage = args.stage ?? previous.stage;
    const transitioningToCanary =
      requestedStage === "canary" && previous.stage !== "canary";
    const transitioningToOn = requestedStage === "on" && previous.stage !== "on";

    if (transitioningToCanary && canaryOrganizationIds.length === 0) {
      throw new Error(
        `Cannot move ${provider} rollout to canary without canaryOrganizationIds`
      );
    }

    if (transitioningToOn) {
      if (previous.stage !== "canary" && !force) {
        throw new Error(
          `Cannot promote ${provider} rollout directly to on; move through canary first or pass force=true`
        );
      }
      if (args.securityMatrixGreen !== true && previous.securityMatrixGreen !== true) {
        throw new Error(
          `Cannot promote ${provider} rollout to on while security failure-path matrix is not green`
        );
      }
    }

    const matrixWasChecked = args.securityMatrixGreen !== undefined;
    const next: ChannelRuntimeProviderFlag = {
      ...previous,
      stage: requestedStage,
      enabled:
        args.enabled ?? (requestedStage === "off" ? false : true),
      canaryOrganizationIds,
      rollbackEnabled: args.rollbackEnabled ?? previous.rollbackEnabled,
      securityMatrixGreen:
        args.securityMatrixGreen ?? previous.securityMatrixGreen,
      securityMatrixCheckedAt: matrixWasChecked
        ? now
        : previous.securityMatrixCheckedAt,
      securityMatrixReference:
        asString(args.securityMatrixReference) ?? previous.securityMatrixReference,
      updatedAt: now,
      updatedBy: asString(args.updatedBy) ?? previous.updatedBy,
    };
    const changed = JSON.stringify(previous) !== JSON.stringify(next);

    if (!dryRun && changed) {
      if (existing) {
        await ctx.db.patch(existing._id, {
          value: next,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("platformSettings", {
          key,
          value: next,
          description: defaultDescription,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return {
      provider,
      key,
      changed,
      dryRun,
      previous,
      next,
    };
  },
});

export const rollbackChannelRuntimeIdentityProviderFlag = internalMutation({
  args: {
    provider: v.union(
      v.literal("slack"),
      v.literal("telegram"),
      v.literal("whatsapp")
    ),
    reason: v.optional(v.string()),
    updatedBy: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dryRun = args.dryRun === true;
    const provider = args.provider as SupportedProvider;
    const key = CHANNEL_RUNTIME_IDENTITY_PROVIDER_KEYS[provider];
    const defaultDescription = `${provider[0].toUpperCase()}${provider.slice(
      1
    )} installation-aware routing rollout gate (off/canary/on).`;

    const existing = await ctx.db
      .query("platformSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    const previous = normalizeProviderFlag(existing?.value, now);
    const next: ChannelRuntimeProviderFlag = {
      ...previous,
      enabled: false,
      stage: "off",
      lastRollbackAt: now,
      rollbackReason: asString(args.reason) || "operator_requested",
      updatedAt: now,
      updatedBy: asString(args.updatedBy) ?? previous.updatedBy,
    };
    const changed = JSON.stringify(previous) !== JSON.stringify(next);

    if (!dryRun && changed) {
      if (existing) {
        await ctx.db.patch(existing._id, {
          value: next,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("platformSettings", {
          key,
          value: next,
          description: defaultDescription,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return {
      provider,
      key,
      changed,
      dryRun,
      previous,
      next,
    };
  },
});
