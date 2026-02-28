import { v } from "convex/values";
import { internalAction, internalMutation } from "../_generated/server";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

const DEFAULT_DATASET_VERSION = "agp_v1";
const FALLBACK_SYNC_RUN_SUMMARY = {
  totalAgents: 0,
  catalogDone: 0,
  seedsFull: 0,
  runtimeLive: 0,
  toolsMissing: 0,
};
const FALLBACK_HASH_PREFIX = "automation_error";

const syncModeValidator = v.union(v.literal("read_only_audit"), v.literal("sync_apply"));
const syncRunStatusValidator = v.union(v.literal("success"), v.literal("failed"));
const syncRunSummaryValidator = v.object({
  totalAgents: v.number(),
  catalogDone: v.number(),
  seedsFull: v.number(),
  runtimeLive: v.number(),
  toolsMissing: v.number(),
});
const syncRunDriftValidator = v.object({
  docsOutOfSync: v.boolean(),
  registryOutOfSync: v.boolean(),
  codeOutOfSync: v.boolean(),
  reasons: v.array(v.string()),
});
const syncRunHashesValidator = v.object({
  catalogDocHash: v.string(),
  matrixDocHash: v.string(),
  seedDocHash: v.string(),
  roadmapDocHash: v.string(),
  overviewDocHash: v.string(),
  toolRegistryHash: v.string(),
  toolProfileHash: v.string(),
  recommendationMetadataHash: v.optional(v.string()),
});

type SyncMode = "read_only_audit" | "sync_apply";

function normalizeDatasetVersion(datasetVersion?: string): string {
  const normalized = (datasetVersion || "").trim();
  return normalized.length > 0 ? normalized : DEFAULT_DATASET_VERSION;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim();
  }
  return "Unknown automation failure.";
}

function resolveAuditStatus(drift: {
  docsOutOfSync: boolean;
  registryOutOfSync: boolean;
  codeOutOfSync: boolean;
}): "drift_detected" | "in_sync" {
  return drift.docsOutOfSync || drift.registryOutOfSync || drift.codeOutOfSync
    ? "drift_detected"
    : "in_sync";
}

function isTruthyFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function buildFallbackHashes(datasetVersion: string) {
  return {
    catalogDocHash: `catalog:${FALLBACK_HASH_PREFIX}:${datasetVersion}`,
    matrixDocHash: `matrix:${FALLBACK_HASH_PREFIX}:${datasetVersion}`,
    seedDocHash: `seed:${FALLBACK_HASH_PREFIX}:${datasetVersion}`,
    roadmapDocHash: `roadmap:${FALLBACK_HASH_PREFIX}:${datasetVersion}`,
    overviewDocHash: `overview:${FALLBACK_HASH_PREFIX}:${datasetVersion}`,
    toolRegistryHash: `registry:${FALLBACK_HASH_PREFIX}:${datasetVersion}`,
    toolProfileHash: `profiles:${FALLBACK_HASH_PREFIX}:${datasetVersion}`,
    recommendationMetadataHash: `recommendation:${FALLBACK_HASH_PREFIX}:${datasetVersion}`,
  };
}

function buildFallbackDrift(errorMessage: string) {
  return {
    docsOutOfSync: true,
    registryOutOfSync: true,
    codeOutOfSync: true,
    reasons: [`Agent catalog automation failed: ${errorMessage}`],
  };
}

function resolveDocsSnapshotHookState(args: {
  datasetVersion: string;
  mode: SyncMode;
  includeDocsSnapshotExport: boolean;
}) {
  const hookEnabled = isTruthyFlag(process.env.AGENT_CATALOG_DOCS_SNAPSHOT_EXPORT_ENABLED);

  if (!args.includeDocsSnapshotExport) {
    return {
      datasetVersion: args.datasetVersion,
      mode: args.mode,
      requested: false,
      enabled: hookEnabled,
      status: "not_requested" as const,
      message: "Docs snapshot export hook was not requested for this run.",
    };
  }

  if (!hookEnabled) {
    return {
      datasetVersion: args.datasetVersion,
      mode: args.mode,
      requested: true,
      enabled: false,
      status: "gated_off" as const,
      message:
        "Docs snapshot export hook is intentionally gated off. Set AGENT_CATALOG_DOCS_SNAPSHOT_EXPORT_ENABLED=true to enable future wiring.",
    };
  }

  return {
    datasetVersion: args.datasetVersion,
    mode: args.mode,
    requested: true,
    enabled: true,
    status: "pending_wiring" as const,
    message:
      "Docs snapshot export hook is enabled but no writer is wired yet. This is intentionally non-breaking during rollout.",
  };
}

/**
 * Internal mutation used by scheduled automation and CI drift runs.
 * Keeps persisted run history aligned with UI drift telemetry.
 */
export const internalRecordSyncRun = internalMutation({
  args: {
    datasetVersion: v.string(),
    mode: syncModeValidator,
    status: syncRunStatusValidator,
    summary: syncRunSummaryValidator,
    drift: syncRunDriftValidator,
    hashes: syncRunHashesValidator,
    error: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const dbAny = ctx.db as any;
    return (await dbAny.insert("agentCatalogSyncRuns", {
      datasetVersion: args.datasetVersion,
      mode: args.mode,
      status: args.status,
      summary: args.summary,
      drift: args.drift,
      hashes: args.hashes,
      error: args.error,
      startedAt: args.startedAt,
      completedAt: args.completedAt ?? Date.now(),
    })) as string;
  },
});

async function runAutomationAndRecord(
  ctx: any,
  args: {
    datasetVersion: string;
    mode: SyncMode;
    trigger: "manual_or_ci" | "scheduled_audit" | "scheduled_sync_apply";
    includeDocsSnapshotExport: boolean;
  },
) {
  const startedAt = Date.now();
  const docsSnapshot = resolveDocsSnapshotHookState({
    datasetVersion: args.datasetVersion,
    mode: args.mode,
    includeDocsSnapshotExport: args.includeDocsSnapshotExport,
  });

  try {
    const snapshot = await ctx.runQuery(
      generatedApi.internal.ai.agentCatalogAdmin.internalReadDatasetSnapshot,
      { datasetVersion: args.datasetVersion },
    );
    const completedAt = Date.now();
    const syncRunId = await ctx.runMutation(
      generatedApi.internal.ai.agentCatalogSync.internalRecordSyncRun,
      {
        datasetVersion: args.datasetVersion,
        mode: args.mode,
        status: "success",
        summary: snapshot.summary,
        drift: snapshot.drift,
        hashes: snapshot.hashes,
        startedAt,
        completedAt,
      },
    );

    return {
      datasetVersion: args.datasetVersion,
      mode: args.mode,
      trigger: args.trigger,
      runStatus: "success" as const,
      status: resolveAuditStatus(snapshot.drift),
      syncRunId,
      summary: snapshot.summary,
      drift: snapshot.drift,
      hashes: snapshot.hashes,
      docsSnapshot,
    };
  } catch (error) {
    const completedAt = Date.now();
    const errorMessage = toErrorMessage(error);
    const fallbackDrift = buildFallbackDrift(errorMessage);
    const fallbackHashes = buildFallbackHashes(args.datasetVersion);
    let syncRunId: string | null = null;
    let recordingError: string | null = null;

    try {
      syncRunId = await ctx.runMutation(
        generatedApi.internal.ai.agentCatalogSync.internalRecordSyncRun,
        {
          datasetVersion: args.datasetVersion,
          mode: args.mode,
          status: "failed",
          summary: FALLBACK_SYNC_RUN_SUMMARY,
          drift: fallbackDrift,
          hashes: fallbackHashes,
          error: errorMessage,
          startedAt,
          completedAt,
        },
      );
    } catch (recordError) {
      recordingError = toErrorMessage(recordError);
    }

    return {
      datasetVersion: args.datasetVersion,
      mode: args.mode,
      trigger: args.trigger,
      runStatus: "failed" as const,
      status: "drift_detected" as const,
      syncRunId,
      summary: FALLBACK_SYNC_RUN_SUMMARY,
      drift: fallbackDrift,
      hashes: fallbackHashes,
      error: errorMessage,
      recordingError,
      docsSnapshot,
    };
  }
}

/**
 * Internal hash computation contract for Agent Catalog drift tooling.
 * Phase 1 computes deterministic hashes from persisted registry snapshot + tool registries.
 */
export const computeHashes = internalAction({
  args: {
    datasetVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const snapshot = await ctx.runQuery(
      generatedApi.internal.ai.agentCatalogAdmin.internalReadDatasetSnapshot,
      { datasetVersion },
    );

    return {
      datasetVersion,
      hashes: snapshot.hashes,
      toolRegistryCount: snapshot.toolRegistryCount,
      interviewToolCount: snapshot.interviewToolCount,
    };
  },
});

/**
 * Internal audit contract used by scheduled drift checks and CI entrypoints.
 */
export const auditCodeAndDocs = internalAction({
  args: {
    datasetVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const snapshot = await ctx.runQuery(
      generatedApi.internal.ai.agentCatalogAdmin.internalReadDatasetSnapshot,
      { datasetVersion },
    );

    return {
      datasetVersion,
      status: resolveAuditStatus(snapshot.drift),
      summary: snapshot.summary,
      drift: snapshot.drift,
      hashes: snapshot.hashes,
    };
  },
});

/**
 * Internal sync-apply contract. In Phase 1 this is intentionally read-only.
 */
export const applyRegistrySync = internalAction({
  args: {
    datasetVersion: v.optional(v.string()),
    includeDocsSnapshotExport: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const snapshot = await ctx.runQuery(
      generatedApi.internal.ai.agentCatalogAdmin.internalReadDatasetSnapshot,
      { datasetVersion },
    );
    const docsSnapshot = resolveDocsSnapshotHookState({
      datasetVersion,
      mode: "sync_apply",
      includeDocsSnapshotExport: args.includeDocsSnapshotExport === true,
    });

    return {
      datasetVersion,
      applied: false,
      phase: 1,
      message: "Phase 1 keeps sync-apply read-only. Controlled writes begin in Phase 2.",
      summary: snapshot.summary,
      drift: snapshot.drift,
      hashes: snapshot.hashes,
      docsSnapshot,
    };
  },
});

/**
 * Phase 3 drift automation for manual and CI audit runs.
 * Persists audit rows to keep history aligned with control-center drift telemetry.
 */
export const runDriftAudit = internalAction({
  args: {
    datasetVersion: v.optional(v.string()),
    includeDocsSnapshotExport: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    return runAutomationAndRecord(ctx, {
      datasetVersion,
      mode: "read_only_audit",
      trigger: "manual_or_ci",
      includeDocsSnapshotExport: args.includeDocsSnapshotExport === true,
    });
  },
});

/**
 * Daily scheduled read-only audit job entrypoint.
 */
export const runScheduledDriftAudit = internalAction({
  args: {
    datasetVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    return runAutomationAndRecord(ctx, {
      datasetVersion,
      mode: "read_only_audit",
      trigger: "scheduled_audit",
      includeDocsSnapshotExport: false,
    });
  },
});

/**
 * Daily scheduled sync-apply automation entrypoint.
 * Current rollout keeps behavior non-breaking while sync-apply remains read-only safe.
 */
export const runScheduledSyncApply = internalAction({
  args: {
    datasetVersion: v.optional(v.string()),
    includeDocsSnapshotExport: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    return runAutomationAndRecord(ctx, {
      datasetVersion,
      mode: "sync_apply",
      trigger: "scheduled_sync_apply",
      includeDocsSnapshotExport: args.includeDocsSnapshotExport !== false,
    });
  },
});
