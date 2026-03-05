/**
 * Sync Organization AI Model Defaults
 *
 * Backfill that ensures every organization's AI settings include
 * the current platform-enabled models and a valid default.
 *
 * Triggered by:
 * 1. Super admin enabling/disabling/defaulting a model (reactive)
 * 2. Daily cron at 4:30 AM UTC (safety net, runs after model discovery)
 *
 * Run manually:
 * npx convex run migrations/syncOrgModelDefaults:auditOrgModelDefaultsSync
 * npx convex run migrations/syncOrgModelDefaults:syncOrgModelDefaultsBatch
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../_generated/api");

const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;

function normalizeBatchSize(numItems?: number): number {
  if (typeof numItems !== "number" || !Number.isFinite(numItems)) {
    return DEFAULT_BATCH_SIZE;
  }
  return Math.min(MAX_BATCH_SIZE, Math.max(1, Math.floor(numItems)));
}

function dedupeOrganizationIds(
  organizationIds?: Id<"organizations">[]
): Id<"organizations">[] {
  if (!organizationIds || organizationIds.length === 0) {
    return [];
  }
  return Array.from(new Set(organizationIds));
}

async function listTargetOrganizationIds(
  ctx: any,
  args: {
    cursor?: string;
    numItems?: number;
    organizationIds?: Id<"organizations">[];
  }
): Promise<{
  organizationIds: Id<"organizations">[];
  source: "explicit" | "paginated";
  nextCursor: string | null;
  hasNextPage: boolean;
}> {
  const explicitIds = dedupeOrganizationIds(args.organizationIds);
  if (explicitIds.length > 0) {
    return {
      organizationIds: explicitIds,
      source: "explicit",
      nextCursor: null,
      hasNextPage: false,
    };
  }

  const page = await ctx.db.query("organizationAiSettings").paginate({
    cursor: args.cursor ?? null,
    numItems: normalizeBatchSize(args.numItems),
  });

  const organizationIds = dedupeOrganizationIds(
    page.page.map(
      (settings: { organizationId: Id<"organizations"> }) =>
        settings.organizationId
    )
  );

  return {
    organizationIds,
    source: "paginated",
    nextCursor: page.continueCursor ?? null,
    hasNextPage: !page.isDone,
  };
}

/**
 * Audit which organizations need model defaults synced.
 *
 * Run with:
 * npx convex run migrations/syncOrgModelDefaults:auditOrgModelDefaultsSync
 */
export const auditOrgModelDefaultsSync = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    numItems: v.optional(v.number()),
    organizationIds: v.optional(v.array(v.id("organizations"))),
  },
  handler: async (ctx, args) => {
    const targets = await listTargetOrganizationIds(ctx, args);

    const platformEnabledModels = await ctx.db
      .query("aiModels")
      .withIndex("by_platform_enabled", (q: any) =>
        q.eq("isPlatformEnabled", true)
      )
      .collect();
    const platformModelIds = new Set(
      platformEnabledModels.map((m: { modelId: string }) => m.modelId)
    );

    const results: Array<{
      organizationId: Id<"organizations">;
      status:
        | "needs_sync"
        | "already_synced"
        | "settings_not_found"
        | "no_settings_record";
      enabledModelCount?: number;
      matchingPlatformCount?: number;
      defaultModelId?: string;
      defaultOnPlatform?: boolean;
    }> = [];

    let needsSync = 0;
    let alreadySynced = 0;
    let settingsNotFound = 0;

    for (const organizationId of targets.organizationIds) {
      const settings = await ctx.db
        .query("organizationAiSettings")
        .withIndex("by_organization", (q: any) =>
          q.eq("organizationId", organizationId)
        )
        .first();

      if (!settings) {
        settingsNotFound += 1;
        results.push({
          organizationId,
          status: "no_settings_record",
        });
        continue;
      }

      const enabledModels: Array<{ modelId: string }> =
        (settings.llm as any)?.enabledModels ?? [];
      const defaultModelId =
        typeof (settings.llm as any)?.defaultModelId === "string"
          ? (settings.llm as any).defaultModelId
          : undefined;

      const matchingPlatformCount = enabledModels.filter((m) =>
        platformModelIds.has(m.modelId)
      ).length;
      const defaultOnPlatform = defaultModelId
        ? platformModelIds.has(defaultModelId)
        : false;

      const isSynced =
        enabledModels.length > 0 &&
        matchingPlatformCount > 0 &&
        (defaultOnPlatform || !defaultModelId);

      if (isSynced) {
        alreadySynced += 1;
        results.push({
          organizationId,
          status: "already_synced",
          enabledModelCount: enabledModels.length,
          matchingPlatformCount,
          defaultModelId,
          defaultOnPlatform,
        });
      } else {
        needsSync += 1;
        results.push({
          organizationId,
          status: "needs_sync",
          enabledModelCount: enabledModels.length,
          matchingPlatformCount,
          defaultModelId,
          defaultOnPlatform,
        });
      }
    }

    return {
      source: targets.source,
      processed: targets.organizationIds.length,
      needsSync,
      alreadySynced,
      settingsNotFound,
      platformEnabledModelCount: platformModelIds.size,
      nextCursor: targets.nextCursor,
      hasNextPage: targets.hasNextPage,
      results,
    };
  },
});

/**
 * Sync organization AI model defaults in batches.
 *
 * Calls ensureOrganizationModelDefaultsInternal for each org.
 * Self-schedules the next batch if more pages remain.
 *
 * Run with:
 * npx convex run migrations/syncOrgModelDefaults:syncOrgModelDefaultsBatch
 */
export const syncOrgModelDefaultsBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    numItems: v.optional(v.number()),
    organizationIds: v.optional(v.array(v.id("organizations"))),
  },
  handler: async (ctx, args) => {
    const targets = await listTargetOrganizationIds(ctx, args);

    const results: Array<{
      organizationId: Id<"organizations">;
      updated: boolean;
      modelCount?: number;
      defaultModelId?: string;
      error?: string;
    }> = [];

    let updated = 0;
    let unchanged = 0;
    let failed = 0;

    for (const organizationId of targets.organizationIds) {
      try {
        const syncResult = await (ctx as any).runMutation(
          generatedApi.internal.ai.settings
            .ensureOrganizationModelDefaultsInternal,
          { organizationId }
        );

        const didUpdate = syncResult?.updated === true;
        if (didUpdate) {
          updated += 1;
        } else {
          unchanged += 1;
        }

        results.push({
          organizationId,
          updated: didUpdate,
          modelCount: syncResult?.modelCount,
          defaultModelId: syncResult?.defaultModelId,
        });
      } catch (error) {
        failed += 1;
        results.push({
          organizationId,
          updated: false,
          error:
            error instanceof Error
              ? error.message.slice(0, 240)
              : "sync_failed",
        });
      }
    }

    // Self-schedule next batch if more pages remain
    if (targets.hasNextPage && targets.nextCursor) {
      await ctx.scheduler.runAfter(
        0,
        generatedApi.internal.migrations.syncOrgModelDefaults
          .syncOrgModelDefaultsBatch,
        {
          cursor: targets.nextCursor,
          numItems: args.numItems,
        }
      );
    }

    console.log(
      `✅ syncOrgModelDefaults batch: ${updated} updated, ${unchanged} unchanged, ${failed} failed` +
        (targets.hasNextPage ? " (next batch scheduled)" : " (complete)")
    );

    return {
      source: targets.source,
      processed: targets.organizationIds.length,
      updated,
      unchanged,
      failed,
      nextCursor: targets.nextCursor,
      hasNextPage: targets.hasNextPage,
      results,
    };
  },
});
