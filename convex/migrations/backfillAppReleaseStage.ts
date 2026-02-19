import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

type ReleaseStage = "none" | "new" | "beta" | "wip";

const RELEASE_STAGE_BY_CODE: Record<string, ReleaseStage> = {
  "agents-browser": "beta",
  "webchat-deployment": "wip",
  crm: "new",
  projects: "new",
  events: "new",
  payments: "new",
  benefits: "new",
};

function isReleaseStage(value: unknown): value is ReleaseStage {
  return value === "none" || value === "new" || value === "beta" || value === "wip";
}

/**
 * Backfill apps.releaseStage with Product OS defaults.
 * Idempotent by default: existing valid releaseStage values are preserved.
 *
 * Usage:
 * npx convex run migrations/backfillAppReleaseStage:backfillAppReleaseStage
 *
 * Optional full reset to defaults:
 * npx convex run migrations/backfillAppReleaseStage:backfillAppReleaseStage '{"overwriteExisting":true}'
 */
export const backfillAppReleaseStage = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    overwriteExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    processed: number;
    migrated: number;
    skippedAlreadyMigrated: number;
    nextCursor: string | null;
    hasNextPage: boolean;
  }> => {
    const batchSize = 100;
    const overwriteExisting = args.overwriteExisting ?? false;
    const page = await ctx.db
      .query("apps")
      .paginate({ cursor: args.cursor ?? null, numItems: batchSize });

    let migrated = 0;
    let skippedAlreadyMigrated = 0;

    for (const app of page.page) {
      const existing = (app as { releaseStage?: unknown }).releaseStage;
      const existingStage = isReleaseStage(existing) ? existing : undefined;
      const targetStage = RELEASE_STAGE_BY_CODE[app.code] ?? "none";

      if (!overwriteExisting && existingStage) {
        skippedAlreadyMigrated += 1;
        continue;
      }

      if (existingStage === targetStage) {
        skippedAlreadyMigrated += 1;
        continue;
      }

      await ctx.db.patch(app._id, {
        releaseStage: targetStage,
        updatedAt: Date.now(),
      } as never);
      migrated += 1;
    }

    return {
      processed: page.page.length,
      migrated,
      skippedAlreadyMigrated,
      nextCursor: page.continueCursor ?? null,
      hasNextPage: !page.isDone,
    };
  },
});

