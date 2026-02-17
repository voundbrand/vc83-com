import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import {
  isAppearanceMode,
  resolveAppearanceMode,
} from "../userPreferences";

/**
 * Backfill appearanceMode for legacy userPreferences records.
 * Idempotent: records with a valid appearanceMode are left unchanged.
 *
 * Usage:
 * npx convex run migrations/backfillUserAppearanceMode:backfillUserAppearanceMode
 */
export const backfillUserAppearanceMode = internalMutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    processed: number;
    migrated: number;
    skippedAlreadyMigrated: number;
    nextCursor: string | null;
    hasNextPage: boolean;
  }> => {
    const batchSize = 100;
    const page = await ctx.db
      .query("userPreferences")
      .paginate({ cursor: args.cursor ?? null, numItems: batchSize });

    let migrated = 0;
    let skippedAlreadyMigrated = 0;

    for (const prefs of page.page) {
      const existingMode = (prefs as { appearanceMode?: unknown }).appearanceMode;
      if (isAppearanceMode(existingMode)) {
        skippedAlreadyMigrated += 1;
        continue;
      }

      const resolvedMode = resolveAppearanceMode({
        appearanceMode: existingMode,
        themeId: prefs.themeId,
        windowStyle: prefs.windowStyle,
      });

      await ctx.db.patch(prefs._id, {
        appearanceMode: resolvedMode,
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
