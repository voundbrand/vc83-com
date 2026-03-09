/**
 * Backfill managed template clone linkage for legacy template-linked org agents.
 *
 * Why:
 * - Legacy clones may only have `templateAgentId` and appear as `legacy_unmanaged`.
 * - Inventory/drift treats those as blocked/high-risk until managed linkage is restored.
 *
 * Usage (dev):
 * npx convex run migrations/backfillTemplateCloneLinkage:backfillTemplateCloneLinkageBatch '{"dryRun":true,"numItems":50}'
 * npx convex run migrations/backfillTemplateCloneLinkage:backfillTemplateCloneLinkageBatch '{"dryRun":false,"numItems":50}'
 *
 * Usage (prod):
 * npx convex run migrations/backfillTemplateCloneLinkage:backfillTemplateCloneLinkageBatch '{"dryRun":true,"numItems":50}' --prod
 * npx convex run migrations/backfillTemplateCloneLinkage:backfillTemplateCloneLinkageBatch '{"dryRun":false,"numItems":50}' --prod
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  buildManagedTemplateCloneLinkage,
  MANAGED_USE_CASE_CLONE_LIFECYCLE,
  readTemplateCloneLinkageContract,
  resolveCloneLifecycleState,
  resolveTemplateSourceId,
  resolveTemplateSourceVersion,
} from "../ai/templateCloneLinkage";

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 250;

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

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function dedupeOrganizationIds(
  organizationIds?: Id<"organizations">[]
): Id<"organizations">[] {
  if (!organizationIds || organizationIds.length === 0) {
    return [];
  }
  return Array.from(new Set(organizationIds));
}

export const backfillTemplateCloneLinkageBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    numItems: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
    organizationIds: v.optional(v.array(v.id("organizations"))),
    templateId: v.optional(v.id("objects")),
    includeTemplateOwnerOrg: v.optional(v.boolean()),
    forceResyncExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const includeTemplateOwnerOrg = args.includeTemplateOwnerOrg ?? true;
    const forceResyncExisting = args.forceResyncExisting ?? false;
    const explicitOrgIds = dedupeOrganizationIds(args.organizationIds);

    const page = explicitOrgIds.length > 0
      ? null
      : await ctx.db.query("objects").withIndex("by_type", (q) => q.eq("type", "org_agent")).paginate({
          cursor: args.cursor ?? null,
          numItems: normalizeBatchSize(args.numItems),
        });

    const candidateAgents = explicitOrgIds.length > 0
      ? (
          await Promise.all(
            explicitOrgIds.map((organizationId) =>
              ctx.db
                .query("objects")
                .withIndex("by_org_type", (q) =>
                  q.eq("organizationId", organizationId).eq("type", "org_agent")
                )
                .collect()
            )
          )
        ).flat()
      : page?.page ?? [];

    const templateCache = new Map<string, Doc<"objects"> | null>();
    const now = Date.now();

    let scanned = 0;
    let patched = 0;
    let alreadyManaged = 0;
    let skippedNoSourceTemplate = 0;
    let skippedTemplateMissing = 0;
    let skippedTemplateSelf = 0;
    let skippedTemplateStatus = 0;
    let skippedTemplateOwnerOrg = 0;
    let skippedTemplateFilter = 0;

    const patchedRows: Array<{
      organizationId: Id<"organizations">;
      agentId: Id<"objects">;
      agentName: string;
      templateId: string;
      templateVersion: string;
      beforeLifecycleState: string;
      afterLifecycleState: string;
    }> = [];

    for (const agent of candidateAgents) {
      scanned += 1;
      if (agent.status === "template") {
        skippedTemplateStatus += 1;
        continue;
      }

      const customProperties = asRecord(agent.customProperties);
      const sourceTemplateId = resolveTemplateSourceId(customProperties);
      if (!sourceTemplateId) {
        skippedNoSourceTemplate += 1;
        continue;
      }
      if (args.templateId && sourceTemplateId !== String(args.templateId)) {
        skippedTemplateFilter += 1;
        continue;
      }
      if (sourceTemplateId === String(agent._id)) {
        skippedTemplateSelf += 1;
        continue;
      }

      let template = templateCache.get(sourceTemplateId);
      if (template === undefined) {
        const resolved = await ctx.db.get(sourceTemplateId as Id<"objects">);
        template = resolved ?? null;
        templateCache.set(sourceTemplateId, template);
      }
      if (!template || template.type !== "org_agent" || template.status !== "template") {
        skippedTemplateMissing += 1;
        continue;
      }
      if (!includeTemplateOwnerOrg && template.organizationId === agent.organizationId) {
        skippedTemplateOwnerOrg += 1;
        continue;
      }

      const beforeLinkage = readTemplateCloneLinkageContract(customProperties);
      const beforeLifecycleState = resolveCloneLifecycleState(customProperties);
      const isLegacyUnmanaged = beforeLifecycleState === "legacy_unmanaged";
      if (!isLegacyUnmanaged && beforeLinkage && !forceResyncExisting) {
        alreadyManaged += 1;
        continue;
      }

      const templateProps = asRecord(template.customProperties);
      const sourceTemplateVersion = resolveTemplateSourceVersion(
        template._id,
        templateProps,
        template.updatedAt,
      );
      const syncJobId = `ath_mig_template_linkage_${now}_${String(agent._id)}`;
      const templateCloneLinkage = buildManagedTemplateCloneLinkage({
        sourceTemplateId,
        sourceTemplateVersion,
        overridePolicy: beforeLinkage?.overridePolicy ?? customProperties.overridePolicy,
        lastTemplateSyncAt: now,
        lastTemplateSyncJobId: syncJobId,
        cloneLifecycleState: beforeLinkage?.cloneLifecycleState,
      });
      const nextCustomProperties = {
        ...customProperties,
        templateAgentId: sourceTemplateId as Id<"objects">,
        templateVersion: normalizeOptionalString(customProperties.templateVersion) || sourceTemplateVersion,
        cloneLifecycle: MANAGED_USE_CASE_CLONE_LIFECYCLE,
        templateCloneLinkage,
        lastTemplateSyncAt: now,
        lastTemplateJobId: syncJobId,
      };

      if (!dryRun) {
        await ctx.db.patch(agent._id, {
          customProperties: nextCustomProperties,
          updatedAt: now,
        });
      }

      patched += 1;
      patchedRows.push({
        organizationId: agent.organizationId,
        agentId: agent._id,
        agentName: agent.name,
        templateId: sourceTemplateId,
        templateVersion: sourceTemplateVersion,
        beforeLifecycleState,
        afterLifecycleState: templateCloneLinkage.cloneLifecycleState,
      });
    }

    return {
      dryRun,
      includeTemplateOwnerOrg,
      forceResyncExisting,
      source: explicitOrgIds.length > 0 ? "explicit_org_ids" : "cursor_page",
      scanned,
      patched,
      alreadyManaged,
      skippedNoSourceTemplate,
      skippedTemplateMissing,
      skippedTemplateSelf,
      skippedTemplateStatus,
      skippedTemplateOwnerOrg,
      skippedTemplateFilter,
      nextCursor: page?.continueCursor ?? null,
      hasNextPage: page ? !page.isDone : false,
      rows: patchedRows,
    };
  },
});

