import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export const ORG_ACTION_RUNTIME_MIGRATION_CONTRACT_VERSION =
  "org_action_runtime_migration_v1" as const;

export const ORG_ACTION_RUNTIME_BACKFILL_OBJECT_TYPES = [
  "org_agent_activity",
  "org_agent_action_item",
  "org_crm_sync_candidate",
] as const;

export type OrgActionRuntimeBackfillObjectType =
  (typeof ORG_ACTION_RUNTIME_BACKFILL_OBJECT_TYPES)[number];

export interface OrgActionRuntimeRolloutFlags {
  captureEnabled: boolean;
  ownerWorkflowEnabled: boolean;
  connectorSyncEnabled: boolean;
  externalExecutionEnabled: boolean;
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

function normalizeBatchSize(numItems?: number): number {
  if (typeof numItems !== "number" || !Number.isFinite(numItems)) {
    return 50;
  }
  return Math.max(1, Math.min(250, Math.floor(numItems)));
}

function normalizeBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function resolveOrgActionRuntimeRolloutFlags(
  input?: Partial<OrgActionRuntimeRolloutFlags>,
): OrgActionRuntimeRolloutFlags {
  const captureEnabled = input?.captureEnabled !== false;
  const ownerWorkflowEnabled = input?.ownerWorkflowEnabled !== false;
  const connectorSyncEnabled = input?.connectorSyncEnabled === true;
  const externalExecutionEnabled =
    input?.externalExecutionEnabled === true && connectorSyncEnabled;

  return {
    captureEnabled,
    ownerWorkflowEnabled,
    connectorSyncEnabled,
    externalExecutionEnabled,
  };
}

export function buildOrgActionRuntimeMigrationPatch(args: {
  objectType: OrgActionRuntimeBackfillObjectType;
  customProperties: unknown;
  migratedAt: number;
}): Record<string, unknown> {
  const existingProps = asRecord(args.customProperties);
  const existingRollout = asRecord(existingProps.oarRolloutFlags);
  const syncDispatch = asRecord(existingProps.syncDispatch);

  const sourceSessionId =
    normalizeOptionalString(existingProps.sourceSessionId)
    || normalizeOptionalString(existingProps.sessionId);
  const correlationId =
    normalizeOptionalString(existingProps.correlationId)
    || normalizeOptionalString(syncDispatch.correlationId);

  const rolloutFlags = resolveOrgActionRuntimeRolloutFlags({
    captureEnabled: normalizeBoolean(existingRollout.captureEnabled) ?? true,
    ownerWorkflowEnabled:
      normalizeBoolean(existingRollout.ownerWorkflowEnabled)
      ?? args.objectType !== "org_crm_sync_candidate",
    connectorSyncEnabled:
      normalizeBoolean(existingRollout.connectorSyncEnabled)
      ?? args.objectType === "org_crm_sync_candidate",
    externalExecutionEnabled: normalizeBoolean(existingRollout.externalExecutionEnabled) ?? false,
  });

  const patch: Record<string, unknown> = {
    ...existingProps,
    oarRolloutFlags: rolloutFlags,
    oarMigration: {
      contractVersion: ORG_ACTION_RUNTIME_MIGRATION_CONTRACT_VERSION,
      objectType: args.objectType,
      migratedAt: args.migratedAt,
      sourceSessionId,
      correlationId,
    },
  };

  if (args.objectType === "org_agent_action_item" && sourceSessionId) {
    patch.sourceSessionId = sourceSessionId;
  }
  if (
    args.objectType === "org_crm_sync_candidate"
    && !normalizeOptionalString(existingProps.correlationId)
    && correlationId
  ) {
    patch.correlationId = correlationId;
  }

  return patch;
}

export const backfillOrgAgentActionRuntimeBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    numItems: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
    objectType: v.optional(
      v.union(
        v.literal("org_agent_activity"),
        v.literal("org_agent_action_item"),
        v.literal("org_crm_sync_candidate"),
      ),
    ),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const objectType =
      args.objectType || ("org_agent_action_item" as OrgActionRuntimeBackfillObjectType);
    const dryRun = args.dryRun ?? true;
    const now = Date.now();

    const page = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", objectType))
      .paginate({
        cursor: args.cursor ?? null,
        numItems: normalizeBatchSize(args.numItems),
      });

    const rows = args.organizationId
      ? page.page.filter((row) => row.organizationId === args.organizationId)
      : page.page;

    let scanned = 0;
    let patched = 0;
    let skippedUnchanged = 0;

    for (const row of rows) {
      scanned += 1;
      const nextCustomProperties = buildOrgActionRuntimeMigrationPatch({
        objectType,
        customProperties: row.customProperties,
        migratedAt: now,
      });

      const previousSerialized = JSON.stringify(row.customProperties ?? {});
      const nextSerialized = JSON.stringify(nextCustomProperties);
      if (previousSerialized === nextSerialized) {
        skippedUnchanged += 1;
        continue;
      }

      if (!dryRun) {
        await ctx.db.patch(row._id, {
          customProperties: nextCustomProperties,
          updatedAt: now,
        });
      }
      patched += 1;
    }

    return {
      contractVersion: ORG_ACTION_RUNTIME_MIGRATION_CONTRACT_VERSION,
      objectType,
      dryRun,
      organizationId: args.organizationId as Id<"organizations"> | undefined,
      scanned,
      patched,
      skippedUnchanged,
      nextCursor: page.continueCursor,
      hasNextPage: !page.isDone,
    };
  },
});
