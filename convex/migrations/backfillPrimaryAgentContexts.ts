/**
 * Backfill primary agent context assignments for existing organizations.
 *
 * Why:
 * - Legacy orgs may have inconsistent/missing `isPrimary` flags per operator context.
 * - Mobile/Web strict primary routing now expects an active primary agent context.
 *
 * Usage:
 * npx convex run migrations/backfillPrimaryAgentContexts:backfillPrimaryAgentContextsBatch '{"dryRun":true,"numItems":25}'
 * npx convex run migrations/backfillPrimaryAgentContexts:backfillPrimaryAgentContextsBatch '{"dryRun":false,"numItems":25}'
 *
 * Production:
 * npx convex run migrations/backfillPrimaryAgentContexts:backfillPrimaryAgentContextsBatch '{"dryRun":true,"numItems":25}' --prod
 * npx convex run migrations/backfillPrimaryAgentContexts:backfillPrimaryAgentContextsBatch '{"dryRun":false,"numItems":25}' --prod
 */

import { internalMutation, mutation, type MutationCtx } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { planPrimaryAgentRepairs } from "../agentOntology";
import { getUserContext, requireAuthenticatedUser } from "../rbacHelpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../_generated/api");

const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;

function normalizeBatchSize(numItems?: number): number {
  if (typeof numItems !== "number" || !Number.isFinite(numItems)) {
    return DEFAULT_BATCH_SIZE;
  }
  return Math.max(1, Math.min(MAX_BATCH_SIZE, Math.floor(numItems)));
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const page = await ctx.db.query("organizations").paginate({
    cursor: args.cursor ?? null,
    numItems: normalizeBatchSize(args.numItems),
  });

  return {
    organizationIds: page.page.map(
      (org: { _id: Id<"organizations"> }) => org._id
    ),
    source: "paginated",
    nextCursor: page.continueCursor ?? null,
    hasNextPage: !page.isDone,
  };
}

type RepairResult = {
  organizationId: Id<"organizations">;
  repairedContexts: number;
  patchedAgentCount: number;
};

async function requireSuperAdminSession(
  ctx: MutationCtx,
  sessionId: string
): Promise<void> {
  const { userId } = await requireAuthenticatedUser(ctx, sessionId);
  const userContext = await getUserContext(ctx, userId);
  if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Only super admins can run primary-agent backfill.",
    });
  }
}

export const backfillPrimaryAgentContextsBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    numItems: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
    organizationIds: v.optional(v.array(v.id("organizations"))),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const targets = await listTargetOrganizationIds(ctx, args);

    const results: Array<{
      organizationId: Id<"organizations">;
      status:
        | "no_agents"
        | "already_consistent"
        | "needs_repair"
        | "repaired";
      agentCount: number;
      contextsNeedingPatch: number;
      patchesNeeded: number;
      recoveryAction?: string | null;
      patchedAgentCount?: number;
    }> = [];

    let orgsWithNoAgents = 0;
    let orgsNeedingRepair = 0;
    let contextsNeedingPatch = 0;
    let patchesNeeded = 0;
    let orgsRepaired = 0;
    let patchedAgents = 0;

    for (const organizationId of targets.organizationIds) {
      const agents = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q: any) =>
          q.eq("organizationId", organizationId).eq("type", "org_agent")
        )
        .collect();

      const plans = planPrimaryAgentRepairs(agents as any[]);
      const plansNeedingPatch = plans.filter((plan) => plan.patches.length > 0);
      const orgContextsNeedingPatch = plansNeedingPatch.length;
      const orgPatchesNeeded = plansNeedingPatch.reduce(
        (sum, plan) => sum + plan.patches.length,
        0
      );

      if (agents.length === 0) {
        orgsWithNoAgents += 1;
      }
      if (orgContextsNeedingPatch > 0) {
        orgsNeedingRepair += 1;
        contextsNeedingPatch += orgContextsNeedingPatch;
        patchesNeeded += orgPatchesNeeded;
      }

      if (dryRun) {
        results.push({
          organizationId,
          status:
            agents.length === 0
              ? "no_agents"
              : orgContextsNeedingPatch > 0
              ? "needs_repair"
              : "already_consistent",
          agentCount: agents.length,
          contextsNeedingPatch: orgContextsNeedingPatch,
          patchesNeeded: orgPatchesNeeded,
        });
        continue;
      }

      const ensureResult = await (ctx as any).runMutation(
        generatedApi.internal.agentOntology.ensureActiveAgentForOrgInternal,
        {
          organizationId,
          channel: "desktop",
        }
      ) as { recoveryAction?: string } | null;

      const repairResult = await (ctx as any).runMutation(
        generatedApi.internal.agentOntology.repairPrimaryAgentContextsForOrgInternal,
        {
          organizationId,
        }
      ) as RepairResult;

      const repaired =
        repairResult.patchedAgentCount > 0
        || ensureResult?.recoveryAction === "created"
        || ensureResult?.recoveryAction === "reactivated";
      if (repaired) {
        orgsRepaired += 1;
      }
      patchedAgents += repairResult.patchedAgentCount;

      results.push({
        organizationId,
        status: repaired ? "repaired" : "already_consistent",
        agentCount: agents.length,
        contextsNeedingPatch: orgContextsNeedingPatch,
        patchesNeeded: orgPatchesNeeded,
        recoveryAction: ensureResult?.recoveryAction ?? null,
        patchedAgentCount: repairResult.patchedAgentCount,
      });
    }

    return {
      dryRun,
      source: targets.source,
      processed: targets.organizationIds.length,
      orgsWithNoAgents,
      orgsNeedingRepair,
      contextsNeedingPatch,
      patchesNeeded,
      orgsRepaired,
      patchedAgents,
      nextCursor: targets.nextCursor,
      hasNextPage: targets.hasNextPage,
      results,
    };
  },
});

/**
 * Super-admin callable wrapper for a single organization.
 * Intended for UI-triggered repairs from Manage Org.
 */
export const backfillPrimaryAgentContextsForOrganization = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);

    const result = await (ctx as any).runMutation(
      generatedApi.internal.migrations.backfillPrimaryAgentContexts
        .backfillPrimaryAgentContextsBatch,
      {
        dryRun: args.dryRun ?? false,
        organizationIds: [args.organizationId],
      }
    );

    const orgResult =
      Array.isArray(result?.results) && result.results.length > 0
        ? result.results[0]
        : null;

    return {
      dryRun: Boolean(result?.dryRun),
      organizationId: args.organizationId,
      processed: typeof result?.processed === "number" ? result.processed : 0,
      status: orgResult?.status ?? "already_consistent",
      agentCount: typeof orgResult?.agentCount === "number" ? orgResult.agentCount : 0,
      contextsNeedingPatch:
        typeof orgResult?.contextsNeedingPatch === "number"
          ? orgResult.contextsNeedingPatch
          : 0,
      patchesNeeded: typeof orgResult?.patchesNeeded === "number" ? orgResult.patchesNeeded : 0,
      recoveryAction:
        typeof orgResult?.recoveryAction === "string" ? orgResult.recoveryAction : null,
      patchedAgents:
        typeof orgResult?.patchedAgentCount === "number" ? orgResult.patchedAgentCount : 0,
    };
  },
});
