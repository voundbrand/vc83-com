import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import {
  deriveVirtualFileMetadata,
  hasNonEmptyString,
} from "../projectFileSystemHelpers";

/**
 * Backfill virtual files that are missing mime/language metadata.
 * Idempotent: only patches records where one or both metadata fields are blank.
 */
export const backfillVirtualFileMetadata = internalMutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    processed: number;
    migrated: number;
    skippedAlreadyMigrated: number;
    skippedNonVirtual: number;
    nextCursor: string | null;
    hasNextPage: boolean;
  }> => {
    const batchSize = 100;
    const page = await ctx.db
      .query("projectFiles")
      .paginate({ cursor: args.cursor ?? null, numItems: batchSize });

    let migrated = 0;
    let skippedAlreadyMigrated = 0;
    let skippedNonVirtual = 0;

    for (const file of page.page) {
      if (file.fileKind !== "virtual") {
        skippedNonVirtual += 1;
        continue;
      }

      const hasMimeType = hasNonEmptyString(file.mimeType);
      const hasLanguage = hasNonEmptyString(file.language);
      if (hasMimeType && hasLanguage) {
        skippedAlreadyMigrated += 1;
        continue;
      }

      const resolvedMetadata = deriveVirtualFileMetadata(
        {
          name: file.name,
          mimeType: hasMimeType ? file.mimeType : undefined,
          language: hasLanguage ? file.language : undefined,
        },
        { preferLegacyMarkdownDefault: true }
      );

      const patch: {
        mimeType?: string;
        language?: string;
        updatedAt?: number;
      } = {};
      if (!hasMimeType) patch.mimeType = resolvedMetadata.mimeType;
      if (!hasLanguage) patch.language = resolvedMetadata.language;

      if (patch.mimeType || patch.language) {
        patch.updatedAt = Date.now();
        await ctx.db.patch(file._id, patch as never);
        migrated += 1;
      } else {
        skippedAlreadyMigrated += 1;
      }
    }

    return {
      processed: page.page.length,
      migrated,
      skippedAlreadyMigrated,
      skippedNonVirtual,
      nextCursor: page.continueCursor ?? null,
      hasNextPage: !page.isDone,
    };
  },
});
