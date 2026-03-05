import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { resolveDeterministicOrgDefaultVoiceId } from "../ai/voiceDefaults";

function normalizeBatchSize(value?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 50;
  }
  return Math.max(1, Math.min(200, Math.floor(value)));
}

function hasVoiceIdInMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }
  const value = (metadata as Record<string, unknown>).defaultVoiceId;
  return typeof value === "string" && value.trim().length > 0;
}

type OrgAiSettingsRecord = {
  _id: Id<"organizationAiSettings">;
  organizationId: Id<"organizations">;
  llm?: {
    providerAuthProfiles?: unknown[];
    providerId?: string;
  } | null;
  updatedAt?: number;
};

export const backfillElevenLabsDefaultVoiceIdBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    numItems: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const deterministicDefaultVoiceId = resolveDeterministicOrgDefaultVoiceId();
    const page = await ctx.db.query("organizationAiSettings").paginate({
      cursor: args.cursor ?? null,
      numItems: normalizeBatchSize(args.numItems),
    });

    let scanned = 0;
    let patched = 0;
    const patchedOrganizationIds: Id<"organizations">[] = [];

    for (const settings of page.page as OrgAiSettingsRecord[]) {
      scanned += 1;
      const profiles = settings.llm?.providerAuthProfiles;
      if (!Array.isArray(profiles) || profiles.length === 0) {
        continue;
      }

      let touched = false;
      const nextProfiles = profiles.map((profile) => {
        if (!profile || typeof profile !== "object") {
          return profile;
        }
        const typed = profile as Record<string, unknown>;
        if (typed.providerId !== "elevenlabs" || typed.enabled !== true) {
          return profile;
        }
        if (hasVoiceIdInMetadata(typed.metadata)) {
          return profile;
        }
        const metadata =
          typed.metadata && typeof typed.metadata === "object"
            ? { ...(typed.metadata as Record<string, unknown>) }
            : {};
        metadata.defaultVoiceId = deterministicDefaultVoiceId;
        touched = true;
        return {
          ...typed,
          metadata,
        };
      });

      if (!touched) {
        continue;
      }

      await ctx.db.patch(settings._id, {
        llm: {
          ...(settings.llm ?? {}),
          providerAuthProfiles: nextProfiles,
        } as any,
        updatedAt: Date.now(),
      });
      patched += 1;
      patchedOrganizationIds.push(settings.organizationId);
    }

    return {
      scanned,
      patched,
      deterministicDefaultVoiceId,
      patchedOrganizationIds,
      hasNextPage: !page.isDone,
      nextCursor: page.continueCursor ?? null,
    };
  },
});
