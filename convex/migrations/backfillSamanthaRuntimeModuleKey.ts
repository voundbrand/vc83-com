/**
 * Backfill Samantha runtime module key on existing org agents.
 *
 * Default behavior is conservative:
 * - only patches Samantha candidates that do not already have a runtimeModuleKey
 * - skips candidates with a different non-empty runtimeModuleKey unless overwriteMismatched=true
 *
 * Usage:
 * npx convex run migrations/backfillSamanthaRuntimeModuleKey:backfillSamanthaRuntimeModuleKeyBatch '{"dryRun":true}'
 * npx convex run migrations/backfillSamanthaRuntimeModuleKey:backfillSamanthaRuntimeModuleKeyBatch
 * npx convex run migrations/backfillSamanthaRuntimeModuleKey:backfillSamanthaRuntimeModuleKeyBatch '{"overwriteMismatched":true}'
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { SAMANTHA_AGENT_RUNTIME_MODULE_KEY } from "../ai/agentSpecRegistry";
import {
  AUDIT_DELIVERABLE_TOOL_NAME,
  SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
  SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE,
} from "../ai/samanthaAuditContract";

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 250;

type SamanthaCandidateReason =
  | "template_role"
  | "legacy_display_name_with_audit_tool";

function normalizeBatchSize(numItems?: number): number {
  if (typeof numItems !== "number" || !Number.isFinite(numItems)) {
    return DEFAULT_BATCH_SIZE;
  }
  return Math.max(1, Math.min(MAX_BATCH_SIZE, Math.floor(numItems)));
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLowercase(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeLowercase(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function resolveSamanthaCandidateReason(
  customProperties: Record<string, unknown>
): SamanthaCandidateReason | null {
  const templateRole = normalizeString(customProperties.templateRole);
  if (
    templateRole === SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE
    || templateRole === SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE
  ) {
    return "template_role";
  }

  const displayName = normalizeLowercase(customProperties.displayName);
  if (!displayName?.includes("samantha")) {
    return null;
  }

  const enabledTools = new Set(normalizeStringArray(customProperties.enabledTools));
  return enabledTools.has(AUDIT_DELIVERABLE_TOOL_NAME.toLowerCase())
    ? "legacy_display_name_with_audit_tool"
    : null;
}

export const backfillSamanthaRuntimeModuleKeyBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    numItems: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
    overwriteMismatched: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    processed: number;
    candidates: number;
    migrated: number;
    skippedNonCandidate: number;
    skippedAlreadySet: number;
    skippedMismatched: number;
    dryRun: boolean;
    overwriteMismatched: boolean;
    nextCursor: string | null;
    hasNextPage: boolean;
  }> => {
    const dryRun = args.dryRun ?? false;
    const overwriteMismatched = args.overwriteMismatched ?? false;
    const now = Date.now();

    const page = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "org_agent"))
      .paginate({
        cursor: args.cursor ?? null,
        numItems: normalizeBatchSize(args.numItems),
      });

    let candidates = 0;
    let migrated = 0;
    let skippedNonCandidate = 0;
    let skippedAlreadySet = 0;
    let skippedMismatched = 0;

    for (const agent of page.page) {
      const customProperties = asRecord(agent.customProperties);
      const candidateReason = resolveSamanthaCandidateReason(customProperties);

      if (!candidateReason) {
        skippedNonCandidate += 1;
        continue;
      }

      candidates += 1;

      const runtimeModuleKey = normalizeString(customProperties.runtimeModuleKey);
      if (runtimeModuleKey === SAMANTHA_AGENT_RUNTIME_MODULE_KEY) {
        skippedAlreadySet += 1;
        continue;
      }

      if (
        runtimeModuleKey
        && runtimeModuleKey !== SAMANTHA_AGENT_RUNTIME_MODULE_KEY
        && !overwriteMismatched
      ) {
        skippedMismatched += 1;
        continue;
      }

      if (!dryRun) {
        await ctx.db.patch(agent._id, {
          customProperties: {
            ...customProperties,
            runtimeModuleKey: SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
            runtimeModuleBackfillReason: candidateReason,
            runtimeModuleBackfilledAt: now,
          },
          updatedAt: now,
        } as never);
      }
      migrated += 1;
    }

    return {
      processed: page.page.length,
      candidates,
      migrated,
      skippedNonCandidate,
      skippedAlreadySet,
      skippedMismatched,
      dryRun,
      overwriteMismatched,
      nextCursor: page.continueCursor ?? null,
      hasNextPage: !page.isDone,
    };
  },
});
