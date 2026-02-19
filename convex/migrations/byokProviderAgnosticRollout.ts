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
    page.page.map((settings: { organizationId: Id<"organizations"> }) => settings.organizationId)
  );

  return {
    organizationIds,
    source: "paginated",
    nextCursor: page.continueCursor ?? null,
    hasNextPage: !page.isDone,
  };
}

/**
 * Audit migration readiness for provider-agnostic AI settings backfill.
 * Use explicit organizationIds for canary cohorts, or paginate entire org set.
 *
 * Run with:
 * npx convex run migrations/byokProviderAgnosticRollout:auditProviderAgnosticSettingsBackfill
 */
export const auditProviderAgnosticSettingsBackfill = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    numItems: v.optional(v.number()),
    organizationIds: v.optional(v.array(v.id("organizations"))),
  },
  handler: async (ctx, args) => {
    const targets = await listTargetOrganizationIds(ctx, args);
    const results: Array<{
      organizationId: Id<"organizations">;
      status: "needs_backfill" | "already_backfilled" | "settings_not_found";
      settingsContractVersion?: string;
      billingSource?: string;
      providerAuthProfileCount?: number;
    }> = [];

    let needsBackfill = 0;
    let alreadyBackfilled = 0;
    let settingsNotFound = 0;

    for (const organizationId of targets.organizationIds) {
      const settings = await ctx.db
        .query("organizationAiSettings")
        .withIndex("by_organization", (q: any) => q.eq("organizationId", organizationId))
        .first();

      if (!settings) {
        settingsNotFound += 1;
        results.push({
          organizationId,
          status: "settings_not_found",
        });
        continue;
      }

      const requiresBackfill =
        settings.settingsContractVersion !== "provider_agnostic_v1" ||
        settings.billingSource === undefined ||
        settings.llm.providerId === undefined ||
        settings.llm.providerAuthProfiles === undefined;

      if (requiresBackfill) {
        needsBackfill += 1;
        results.push({
          organizationId,
          status: "needs_backfill",
          settingsContractVersion: settings.settingsContractVersion,
          billingSource: settings.billingSource,
          providerAuthProfileCount: settings.llm.providerAuthProfiles?.length ?? 0,
        });
      } else {
        alreadyBackfilled += 1;
        results.push({
          organizationId,
          status: "already_backfilled",
          settingsContractVersion: settings.settingsContractVersion,
          billingSource: settings.billingSource,
          providerAuthProfileCount: settings.llm.providerAuthProfiles?.length ?? 0,
        });
      }
    }

    return {
      source: targets.source,
      processed: targets.organizationIds.length,
      needsBackfill,
      alreadyBackfilled,
      settingsNotFound,
      nextCursor: targets.nextCursor,
      hasNextPage: targets.hasNextPage,
      results,
    };
  },
});

/**
 * Execute provider-agnostic settings backfill in batches.
 * Safe to run repeatedly; pass dryRun=true for canary preview mode.
 *
 * Run with:
 * npx convex run migrations/byokProviderAgnosticRollout:runProviderAgnosticSettingsBackfillBatch
 */
export const runProviderAgnosticSettingsBackfillBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    numItems: v.optional(v.number()),
    organizationIds: v.optional(v.array(v.id("organizations"))),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const targets = await listTargetOrganizationIds(ctx, args);
    const dryRun = Boolean(args.dryRun);

    const results: Array<{
      organizationId: Id<"organizations">;
      updated: boolean;
      source?: string;
      providerAuthProfileCount?: number;
      reason?: string;
      error?: string;
    }> = [];

    let updated = 0;
    let unchanged = 0;
    let failed = 0;

    for (const organizationId of targets.organizationIds) {
      try {
        const migrationResult = await (ctx as any).runMutation(
          generatedApi.internal.ai.settings.backfillProviderAgnosticSettings,
          {
            organizationId,
            dryRun,
          }
        );

        const didUpdate = migrationResult?.updated === true;
        if (didUpdate) {
          updated += 1;
        } else {
          unchanged += 1;
        }

        results.push({
          organizationId,
          updated: didUpdate,
          source: migrationResult?.source,
          providerAuthProfileCount: migrationResult?.providerAuthProfileCount,
          reason: migrationResult?.reason,
        });
      } catch (error) {
        failed += 1;
        results.push({
          organizationId,
          updated: false,
          error:
            error instanceof Error
              ? error.message.slice(0, 240)
              : "backfill_failed",
        });
      }
    }

    return {
      source: targets.source,
      dryRun,
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

/**
 * Emergency rollback for provider-agnostic settings contract fields.
 * Use explicit organizationIds for canary rollback, or paginate to rollback cohorts.
 *
 * Run with:
 * npx convex run migrations/byokProviderAgnosticRollout:rollbackProviderAgnosticSettingsBatch
 */
export const rollbackProviderAgnosticSettingsBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    numItems: v.optional(v.number()),
    organizationIds: v.optional(v.array(v.id("organizations"))),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const targets = await listTargetOrganizationIds(ctx, args);
    const dryRun = Boolean(args.dryRun);

    const results: Array<{
      organizationId: Id<"organizations">;
      rolledBack: boolean;
      reason?: string;
      error?: string;
    }> = [];

    let rolledBack = 0;
    let unchanged = 0;
    let failed = 0;

    for (const organizationId of targets.organizationIds) {
      try {
        const rollbackResult = await (ctx as any).runMutation(
          generatedApi.internal.ai.settings.rollbackProviderAgnosticSettings,
          {
            organizationId,
            dryRun,
          }
        );

        const didRollback = rollbackResult?.rolledBack === true;
        if (didRollback) {
          rolledBack += 1;
        } else {
          unchanged += 1;
        }

        results.push({
          organizationId,
          rolledBack: didRollback,
          reason: rollbackResult?.reason,
        });
      } catch (error) {
        failed += 1;
        results.push({
          organizationId,
          rolledBack: false,
          error:
            error instanceof Error
              ? error.message.slice(0, 240)
              : "rollback_failed",
        });
      }
    }

    return {
      source: targets.source,
      dryRun,
      processed: targets.organizationIds.length,
      rolledBack,
      unchanged,
      failed,
      nextCursor: targets.nextCursor,
      hasNextPage: targets.hasNextPage,
      results,
    };
  },
});
