import { ConvexError, v } from "convex/values";
import { internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { getUserContext, requireAuthenticatedUser } from "../rbacHelpers";
import {
  AGENT_RECOMMENDER_COMPATIBILITY_FLAG_ALIASES,
  deriveDefaultIntentTags as deriveCatalogDefaultIntentTags,
  deriveDefaultKeywordAliases as deriveCatalogDefaultKeywordAliases,
  normalizeAndDedupeRecommendationTokens,
  normalizeDefaultRecommendationMetadata,
  normalizeRecommendationToken,
  resolveCompatibilityFlagDecision,
  resolveAgentRecommendations,
  tokenizeRecommendationSearchInput,
  type AgentRecommendationActivationState,
  type AgentRecommendationCatalogEntryInput,
  type CompatibilityFlagDecision,
  type AgentRecommendationMetadata,
  type AgentRecommendationToolRequirementInput,
} from "./agentRecommendationResolver";
import { TOOL_REGISTRY } from "./tools/registry";
import { INTERVIEW_TOOLS } from "./tools/interviewTools";

const DEFAULT_DATASET_VERSION = "agp_v1";
const EXPECTED_AGENT_COUNT = 104;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

const categoryValidator = v.union(
  v.literal("core"),
  v.literal("legal"),
  v.literal("finance"),
  v.literal("health"),
  v.literal("coaching"),
  v.literal("agency"),
  v.literal("trades"),
  v.literal("ecommerce"),
);

const runtimeStatusValidator = v.union(
  v.literal("live"),
  v.literal("template_only"),
  v.literal("not_deployed"),
);

const seedStatusValidator = v.union(
  v.literal("full"),
  v.literal("skeleton"),
  v.literal("missing"),
);

const toolCoverageStatusValidator = v.union(
  v.literal("complete"),
  v.literal("partial"),
  v.literal("missing"),
);

const syncModeValidator = v.union(v.literal("read_only_audit"), v.literal("sync_apply"));
const accessModeValidator = v.union(
  v.literal("invisible"),
  v.literal("direct"),
  v.literal("meeting"),
);

const recommendationActivationStateValidator = v.union(
  v.literal("suggest_activation"),
  v.literal("needs_setup"),
  v.literal("planned_only"),
  v.literal("blocked"),
);
type RecommendationActivationState = AgentRecommendationActivationState;
type RecommendationMetadata = AgentRecommendationMetadata;

type CatalogEntryRow = {
  _id: string;
  catalogAgentNumber: number;
  datasetVersion: string;
  name: string;
  category: string;
  tier: string;
  soulBlend: string;
  soulStatus: string;
  subtype: string;
  toolProfile: string;
  requiredIntegrations: string[];
  channelAffinity: string[];
  specialistAccessModes: string[];
  autonomyDefault: string;
  intentTags?: string[];
  keywordAliases?: string[];
  recommendationMetadata?: RecommendationMetadata;
  implementationPhase: number;
  catalogStatus: string;
  toolCoverageStatus: string;
  seedStatus: string;
  runtimeStatus: string;
  seedStatusOverride?: {
    seedStatus: "full" | "skeleton" | "missing";
    reason: string;
    actorUserId: string;
    actorLabel: string;
    updatedAt: number;
  };
  blockers: string[];
  sourceRefs: {
    catalogDocPath: string;
    matrixDocPath: string;
    seedDocPath: string;
    roadmapDocPath: string;
  };
  createdAt: number;
  updatedAt: number;
};

type ResolvedCatalogEntryRow = CatalogEntryRow & {
  intentTags: string[];
  keywordAliases: string[];
  recommendationMetadata: RecommendationMetadata;
};

type ToolRequirementRow = {
  _id: string;
  datasetVersion: string;
  catalogAgentNumber: number;
  toolName: string;
  requirementLevel: "required" | "recommended" | "optional";
  modeScope: {
    work: "allow" | "approval_required" | "deny";
    private: "allow" | "approval_required" | "deny";
  };
  mutability: "read_only" | "mutating";
  integrationDependency?: string;
  source: "registry" | "interview_tools" | "proposed_new";
  implementationStatus: "implemented" | "missing";
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

type SeedRegistryRow = {
  _id: string;
  datasetVersion: string;
  catalogAgentNumber: number;
  seedCoverage: "full" | "skeleton" | "missing";
  requiresSoulBuild: boolean;
  requiresSoulBuildReason?: string;
  systemTemplateAgentId?: string;
  templateRole?: string;
  protectedTemplate?: boolean;
  immutableOriginContractMapped: boolean;
  sourcePath: string;
  createdAt: number;
  updatedAt: number;
};

type SyncRunRow = {
  _id: string;
  datasetVersion: string;
  triggeredByUserId?: string;
  mode: "read_only_audit" | "sync_apply";
  status: "success" | "failed";
  summary: {
    totalAgents: number;
    catalogDone: number;
    seedsFull: number;
    runtimeLive: number;
    toolsMissing: number;
  };
  drift: {
    docsOutOfSync: boolean;
    registryOutOfSync: boolean;
    codeOutOfSync: boolean;
    reasons: string[];
  };
  hashes: {
    catalogDocHash: string;
    matrixDocHash: string;
    seedDocHash: string;
    roadmapDocHash: string;
    overviewDocHash: string;
    toolRegistryHash: string;
    toolProfileHash: string;
    recommendationMetadataHash?: string;
  };
  error?: string;
  startedAt: number;
  completedAt?: number;
};

type CoverageCount = {
  required: number;
  implemented: number;
  missing: number;
};

function normalizeDatasetVersion(datasetVersion?: string): string {
  const normalized = (datasetVersion || "").trim();
  return normalized.length > 0 ? normalized : DEFAULT_DATASET_VERSION;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeBlockerNote(blocker: string): string {
  return blocker.trim().replace(/\s+/g, " ");
}

function dedupeBlockers(blockers: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const blocker of blockers) {
    const normalized = normalizeBlockerNote(blocker);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    deduped.push(normalized);
  }
  return deduped;
}

function normalizeToken(value: string): string {
  return normalizeRecommendationToken(value);
}

function normalizeAndDedupeTokens(values: Iterable<string>): string[] {
  return normalizeAndDedupeRecommendationTokens(values);
}

function tokenizeSearchInput(value: string): string[] {
  return tokenizeRecommendationSearchInput(value);
}

function deriveDefaultActivationState(entry: CatalogEntryRow): RecommendationActivationState {
  if (entry.runtimeStatus !== "live") {
    return "planned_only";
  }
  if (entry.blockers.length > 0) {
    return "blocked";
  }
  if (entry.toolCoverageStatus !== "complete" || entry.seedStatus !== "full") {
    return "needs_setup";
  }
  return "suggest_activation";
}

function deriveDefaultRankHint(entry: CatalogEntryRow): number {
  const tier = entry.tier.toLowerCase();
  if (tier.includes("sovereign")) {
    return 0.08;
  }
  if (tier.includes("dream team")) {
    return 0.05;
  }
  if (tier.includes("foundation")) {
    return 0.02;
  }
  return 0;
}

function deriveDefaultGapPenaltyMultiplier(entry: CatalogEntryRow): number {
  let multiplier = 1;
  if (entry.runtimeStatus !== "live") {
    multiplier += 0.15;
  }
  if (entry.toolCoverageStatus !== "complete") {
    multiplier += 0.1;
  }
  if (entry.blockers.length > 0) {
    multiplier += 0.2;
  }
  return Number(multiplier.toFixed(2));
}

function deriveDefaultIntentTags(entry: CatalogEntryRow): string[] {
  return deriveCatalogDefaultIntentTags({
    category: entry.category,
    subtype: entry.subtype,
    toolProfile: entry.toolProfile,
  });
}

function resolveIntentTags(entry: CatalogEntryRow): string[] {
  const stored = normalizeAndDedupeTokens(entry.intentTags ?? []);
  if (stored.length > 0) {
    return stored;
  }
  return deriveDefaultIntentTags(entry);
}

function deriveDefaultKeywordAliases(entry: CatalogEntryRow, intentTags: string[]): string[] {
  return deriveCatalogDefaultKeywordAliases({
    name: entry.name,
    category: entry.category,
    subtype: entry.subtype,
    toolProfile: entry.toolProfile,
    tier: entry.tier,
    intentTags,
  });
}

function resolveKeywordAliases(entry: CatalogEntryRow, intentTags: string[]): string[] {
  const stored = normalizeAndDedupeTokens(entry.keywordAliases ?? []);
  if (stored.length > 0) {
    return stored;
  }
  return deriveDefaultKeywordAliases(entry, intentTags);
}

function resolveRecommendationMetadata(entry: CatalogEntryRow): RecommendationMetadata {
  return normalizeDefaultRecommendationMetadata({
    metadata: entry.recommendationMetadata,
    fallbackActivationState: deriveDefaultActivationState(entry),
    fallbackRankHint: deriveDefaultRankHint(entry),
    fallbackGapPenaltyMultiplier: deriveDefaultGapPenaltyMultiplier(entry),
  });
}

function resolveCatalogEntryRecommendationFields(entry: CatalogEntryRow): ResolvedCatalogEntryRow {
  const intentTags = resolveIntentTags(entry);
  const keywordAliases = resolveKeywordAliases(entry, intentTags);
  const recommendationMetadata = resolveRecommendationMetadata(entry);
  return {
    ...entry,
    intentTags,
    keywordAliases,
    recommendationMetadata,
  };
}

function buildSearchHaystack(entry: ResolvedCatalogEntryRow): string {
  return [
    String(entry.catalogAgentNumber),
    entry.name,
    entry.toolProfile,
    entry.category,
    entry.intentTags.join(" "),
    entry.keywordAliases.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function toRecommendationResolverEntry(
  entry: ResolvedCatalogEntryRow,
): AgentRecommendationCatalogEntryInput {
  return {
    catalogAgentNumber: entry.catalogAgentNumber,
    name: entry.name,
    category: entry.category,
    subtype: entry.subtype,
    toolProfile: entry.toolProfile,
    tier: entry.tier,
    intentTags: entry.intentTags,
    keywordAliases: entry.keywordAliases,
    recommendationMetadata: entry.recommendationMetadata,
    requiredIntegrations: entry.requiredIntegrations,
    specialistAccessModes: entry.specialistAccessModes,
    runtimeStatus: entry.runtimeStatus,
    blockers: entry.blockers,
  };
}

function toRecommendationResolverToolRequirement(
  row: ToolRequirementRow,
): AgentRecommendationToolRequirementInput {
  return {
    catalogAgentNumber: row.catalogAgentNumber,
    toolName: row.toolName,
    requirementLevel: row.requirementLevel,
    implementationStatus: row.implementationStatus,
    source: row.source,
  };
}

function simpleHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function toCoverageMap(toolRequirements: ToolRequirementRow[]): Map<number, CoverageCount> {
  const coverage = new Map<number, CoverageCount>();
  for (const row of toolRequirements) {
    const current = coverage.get(row.catalogAgentNumber) ?? {
      required: 0,
      implemented: 0,
      missing: 0,
    };

    if (row.requirementLevel === "required") {
      current.required += 1;
      if (row.implementationStatus === "implemented") {
        current.implemented += 1;
      } else {
        current.missing += 1;
      }
    }

    coverage.set(row.catalogAgentNumber, current);
  }
  return coverage;
}

function deriveDriftStatus(drift: {
  docsOutOfSync: boolean;
  registryOutOfSync: boolean;
  codeOutOfSync: boolean;
}): "in_sync" | "docs_drift" | "code_drift" | "registry_drift" {
  if (drift.docsOutOfSync) {
    return "docs_drift";
  }
  if (drift.codeOutOfSync) {
    return "code_drift";
  }
  if (drift.registryOutOfSync) {
    return "registry_drift";
  }
  return "in_sync";
}

function resolveRecommenderCompatibilityDecision(): CompatibilityFlagDecision {
  return resolveCompatibilityFlagDecision({
    aliases: AGENT_RECOMMENDER_COMPATIBILITY_FLAG_ALIASES,
  });
}

function buildRecommenderCompatibilityPayload(decision: CompatibilityFlagDecision) {
  return {
    enabled: decision.enabled,
    flagKey: decision.flagKey,
    matchedAlias: decision.matchedAlias,
    defaultState: decision.defaultState,
    reason: decision.enabled ? "enabled" : "compatibility_flag_disabled",
  } as const;
}

async function requireSuperAdminSession(
  ctx: QueryCtx | MutationCtx,
  sessionId: string,
): Promise<{ userId: Id<"users">; organizationId: Id<"organizations"> }> {
  const { userId, organizationId } = await requireAuthenticatedUser(ctx, sessionId);
  const userContext = await getUserContext(ctx, userId);
  if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Only super admins can access Agent Control Center.",
    });
  }
  return { userId, organizationId };
}

async function loadDatasetEntries(
  ctx: QueryCtx | MutationCtx,
  datasetVersion: string,
): Promise<CatalogEntryRow[]> {
  const dbAny = ctx.db as any;
  return (await dbAny
    .query("agentCatalogEntries")
    .withIndex("by_dataset_agent", (q: any) => q.eq("datasetVersion", datasetVersion))
    .collect()) as CatalogEntryRow[];
}

async function loadToolRequirements(
  ctx: QueryCtx | MutationCtx,
  datasetVersion: string,
): Promise<ToolRequirementRow[]> {
  const dbAny = ctx.db as any;
  return (await dbAny
    .query("agentCatalogToolRequirements")
    .withIndex("by_dataset_agent", (q: any) => q.eq("datasetVersion", datasetVersion))
    .collect()) as ToolRequirementRow[];
}

async function loadSyncRuns(
  ctx: QueryCtx | MutationCtx,
  datasetVersion: string,
  limit: number,
): Promise<SyncRunRow[]> {
  const dbAny = ctx.db as any;
  return (await dbAny
    .query("agentCatalogSyncRuns")
    .withIndex("by_dataset_started", (q: any) => q.eq("datasetVersion", datasetVersion))
    .order("desc")
    .take(limit)) as SyncRunRow[];
}

async function loadCatalogEntryByNumber(
  ctx: QueryCtx | MutationCtx,
  datasetVersion: string,
  catalogAgentNumber: number,
): Promise<CatalogEntryRow | null> {
  const dbAny = ctx.db as any;
  return (await dbAny
    .query("agentCatalogEntries")
    .withIndex("by_dataset_agent", (q: any) =>
      q.eq("datasetVersion", datasetVersion).eq("catalogAgentNumber", catalogAgentNumber),
    )
    .first()) as CatalogEntryRow | null;
}

async function resolveUserLabel(ctx: QueryCtx | MutationCtx, userId: Id<"users">): Promise<string> {
  const dbAny = ctx.db as any;
  const user = (await dbAny.get(userId)) as
    | {
        firstName?: string;
        lastName?: string;
        email?: string;
      }
    | null;
  const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  if (fullName.length > 0) {
    return fullName;
  }
  if (typeof user?.email === "string" && user.email.trim().length > 0) {
    return user.email.trim();
  }
  return String(userId);
}

async function writeAgentCatalogAuditAction(args: {
  ctx: MutationCtx;
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  actionType: `agent_catalog.${string}`;
  datasetVersion: string;
  catalogAgentNumber?: number;
  actionData: Record<string, unknown>;
  objectType: string;
}) {
  const now = Date.now();
  const dbAny = args.ctx.db as any;
  const auditObjectId = (await dbAny.insert("objects", {
    organizationId: args.organizationId,
    type: args.objectType,
    subtype: args.actionType,
    name:
      typeof args.catalogAgentNumber === "number"
        ? `Agent #${args.catalogAgentNumber} ${args.actionType}`
        : `Agent Catalog ${args.actionType}`,
    status: "completed",
    customProperties: {
      datasetVersion: args.datasetVersion,
      catalogAgentNumber: args.catalogAgentNumber,
      ...args.actionData,
    },
    createdBy: args.userId,
    createdAt: now,
    updatedAt: now,
  })) as string;

  await dbAny.insert("objectActions", {
    organizationId: args.organizationId,
    objectId: auditObjectId,
    actionType: args.actionType,
    actionData: {
      datasetVersion: args.datasetVersion,
      catalogAgentNumber: args.catalogAgentNumber,
      ...args.actionData,
    },
    performedBy: args.userId,
    performedAt: now,
  });
}

function buildSummary(entries: CatalogEntryRow[], toolRequirements: ToolRequirementRow[]) {
  const resolvedEntries = entries.map(resolveCatalogEntryRecommendationFields);
  const toolsMissing = toolRequirements.filter(
    (row) => row.requirementLevel === "required" && row.implementationStatus === "missing",
  ).length;

  return {
    totalAgents: resolvedEntries.length,
    catalogDone: resolvedEntries.filter((row) => row.catalogStatus === "done").length,
    seedsFull: resolvedEntries.filter((row) => row.seedStatus === "full").length,
    runtimeLive: resolvedEntries.filter((row) => row.runtimeStatus === "live").length,
    toolsMissing,
    blockedAgents: resolvedEntries.filter((row) => row.blockers.length > 0).length,
    recommendationTagged: resolvedEntries.filter((row) => row.intentTags.length > 0).length,
    recommendationMetadataStored: entries.filter((row) => Boolean(row.recommendationMetadata)).length,
  };
}

function buildDrift(args: {
  datasetVersion: string;
  entries: CatalogEntryRow[];
  summary: {
    totalAgents: number;
    catalogDone: number;
    seedsFull: number;
    runtimeLive: number;
    toolsMissing: number;
    blockedAgents: number;
  };
}) {
  const reasons: string[] = [];

  if (args.entries.length === 0) {
    reasons.push(`No catalog entries found for dataset '${args.datasetVersion}'.`);
  }
  if (args.summary.totalAgents > 0 && args.summary.totalAgents < EXPECTED_AGENT_COUNT) {
    reasons.push(
      `Dataset '${args.datasetVersion}' has ${args.summary.totalAgents}/${EXPECTED_AGENT_COUNT} agents loaded.`,
    );
  }
  if (args.summary.toolsMissing > 0) {
    reasons.push(`${args.summary.toolsMissing} required tools are marked missing.`);
  }

  return {
    docsOutOfSync: args.entries.length === 0,
    registryOutOfSync:
      args.summary.totalAgents > 0 && args.summary.totalAgents < EXPECTED_AGENT_COUNT,
    codeOutOfSync: false,
    reasons,
  };
}

function buildHashes(args: {
  datasetVersion: string;
  entries: CatalogEntryRow[];
  toolRequirements: ToolRequirementRow[];
}) {
  const resolvedEntries = args.entries.map(resolveCatalogEntryRecommendationFields);

  const entryShapeHash = simpleHash(
    JSON.stringify(
      resolvedEntries
        .map((row) => ({
          n: row.catalogAgentNumber,
          c: row.catalogStatus,
          t: row.toolCoverageStatus,
          s: row.seedStatus,
          r: row.runtimeStatus,
          b: row.blockers.length,
        }))
        .sort((a, b) => a.n - b.n),
    ),
  );

  const toolShapeHash = simpleHash(
    JSON.stringify(
      args.toolRequirements
        .map((row) => ({
          n: row.catalogAgentNumber,
          tool: row.toolName,
          level: row.requirementLevel,
          status: row.implementationStatus,
        }))
        .sort((a, b) => (a.n === b.n ? a.tool.localeCompare(b.tool) : a.n - b.n)),
    ),
  );

  const toolRegistryHash = simpleHash(Object.keys(TOOL_REGISTRY).sort().join("|"));
  const toolProfileHash = simpleHash(Object.keys(INTERVIEW_TOOLS).sort().join("|"));
  const recommendationMetadataHash = simpleHash(
    JSON.stringify(
      resolvedEntries
        .map((row) => ({
          n: row.catalogAgentNumber,
          intents: row.intentTags,
          aliases: row.keywordAliases,
          metadata: row.recommendationMetadata,
        }))
        .sort((a, b) => a.n - b.n),
    ),
  );

  return {
    catalogDocHash: `catalog:${entryShapeHash}`,
    matrixDocHash: `matrix:${toolShapeHash}`,
    seedDocHash: `seed:${entryShapeHash}`,
    roadmapDocHash: `roadmap:${simpleHash(`${args.datasetVersion}:${resolvedEntries.length}`)}`,
    overviewDocHash: `overview:${simpleHash(`${entryShapeHash}:${toolShapeHash}`)}`,
    toolRegistryHash: `registry:${toolRegistryHash}`,
    toolProfileHash: `profiles:${toolProfileHash}`,
    recommendationMetadataHash: `recommendation:${recommendationMetadataHash}`,
  };
}

export const getOverview = query({
  args: {
    sessionId: v.string(),
    datasetVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const entries = await loadDatasetEntries(ctx, datasetVersion);
    const resolvedEntries = entries.map(resolveCatalogEntryRecommendationFields);
    const toolRequirements = await loadToolRequirements(ctx, datasetVersion);
    const summary = buildSummary(entries, toolRequirements);

    const runs = await loadSyncRuns(ctx, datasetVersion, 1);
    const latestRun = runs[0] ?? null;
    const fallbackDrift = buildDrift({ datasetVersion, entries, summary });
    const drift = latestRun?.drift ?? fallbackDrift;

    const dbAny = ctx.db as any;
    const allEntryRows = (await dbAny.query("agentCatalogEntries").collect()) as CatalogEntryRow[];
    const allRunRows = (await dbAny.query("agentCatalogSyncRuns").collect()) as SyncRunRow[];
    const versionSet = new Set<string>([DEFAULT_DATASET_VERSION]);
    for (const row of allEntryRows) {
      versionSet.add(row.datasetVersion);
    }
    for (const row of allRunRows) {
      versionSet.add(row.datasetVersion);
    }

    return {
      datasetVersion,
      datasetVersions: Array.from(versionSet).sort((a, b) => a.localeCompare(b)),
      expectedAgentCount: EXPECTED_AGENT_COUNT,
      summary,
      drift: {
        ...drift,
        status: deriveDriftStatus(drift),
      },
      latestSyncRun: latestRun,
      filterMetadata: {
        implementationPhases: Array.from(
          new Set(
            resolvedEntries
              .map((entry) => entry.implementationPhase)
              .filter((phase) => Number.isFinite(phase)),
          ),
        ).sort((a, b) => a - b),
        intentTags: Array.from(
          new Set(resolvedEntries.flatMap((entry) => entry.intentTags)),
        ).sort((a, b) => a.localeCompare(b)),
      },
    };
  },
});

export const listAgents = query({
  args: {
    sessionId: v.string(),
    datasetVersion: v.optional(v.string()),
    filters: v.optional(
      v.object({
        category: v.optional(categoryValidator),
        runtimeStatus: v.optional(runtimeStatusValidator),
        seedStatus: v.optional(seedStatusValidator),
        toolCoverageStatus: v.optional(toolCoverageStatusValidator),
        implementationPhase: v.optional(v.number()),
        onlyWithBlockers: v.optional(v.boolean()),
        intentTag: v.optional(v.string()),
        keywordAlias: v.optional(v.string()),
        defaultActivationState: v.optional(recommendationActivationStateValidator),
        search: v.optional(v.string()),
      }),
    ),
    pagination: v.optional(
      v.object({
        cursor: v.optional(v.string()),
        limit: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);

    const entries = await loadDatasetEntries(ctx, datasetVersion);
    const resolvedEntries = entries.map(resolveCatalogEntryRecommendationFields);
    const toolRequirements = await loadToolRequirements(ctx, datasetVersion);
    const coverageMap = toCoverageMap(toolRequirements);

    const searchTokens = tokenizeSearchInput(args.filters?.search || "");
    const intentTagFilter = normalizeToken(args.filters?.intentTag || "");
    const keywordAliasFilter = normalizeToken(args.filters?.keywordAlias || "");
    const filtered = resolvedEntries
      .filter((entry) => {
        if (args.filters?.category && entry.category !== args.filters.category) {
          return false;
        }
        if (args.filters?.runtimeStatus && entry.runtimeStatus !== args.filters.runtimeStatus) {
          return false;
        }
        if (args.filters?.seedStatus && entry.seedStatus !== args.filters.seedStatus) {
          return false;
        }
        if (
          args.filters?.toolCoverageStatus
          && entry.toolCoverageStatus !== args.filters.toolCoverageStatus
        ) {
          return false;
        }
        if (
          typeof args.filters?.implementationPhase === "number"
          && entry.implementationPhase !== args.filters.implementationPhase
        ) {
          return false;
        }
        if (args.filters?.onlyWithBlockers && entry.blockers.length === 0) {
          return false;
        }
        if (intentTagFilter.length > 0 && !entry.intentTags.includes(intentTagFilter)) {
          return false;
        }
        if (keywordAliasFilter.length > 0 && !entry.keywordAliases.includes(keywordAliasFilter)) {
          return false;
        }
        if (
          args.filters?.defaultActivationState
          && entry.recommendationMetadata.defaultActivationState !== args.filters.defaultActivationState
        ) {
          return false;
        }
        if (searchTokens.length > 0) {
          const haystack = buildSearchHaystack(entry);
          if (!searchTokens.every((token) => haystack.includes(token))) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => a.catalogAgentNumber - b.catalogAgentNumber);

    const requestedLimit = args.pagination?.limit ?? DEFAULT_PAGE_SIZE;
    const limit = Math.max(1, Math.min(MAX_PAGE_SIZE, requestedLimit));
    const cursorValue = Number.parseInt(args.pagination?.cursor || "0", 10);
    const offset = Number.isFinite(cursorValue) && cursorValue >= 0 ? cursorValue : 0;

    const page = filtered.slice(offset, offset + limit);
    const nextOffset = offset + limit;

    return {
      datasetVersion,
      total: filtered.length,
      cursor: String(offset),
      nextCursor: nextOffset < filtered.length ? String(nextOffset) : null,
      agents: page.map((entry) => {
        const coverage = coverageMap.get(entry.catalogAgentNumber) ?? {
          required: 0,
          implemented: 0,
          missing: 0,
        };
        return {
          ...entry,
          blockersCount: entry.blockers.length,
          toolCoverageCounts: coverage,
        };
      }),
    };
  },
});

export const resolveRecommendations = query({
  args: {
    sessionId: v.string(),
    datasetVersion: v.optional(v.string()),
    queryText: v.optional(v.string()),
    intentTags: v.optional(v.array(v.string())),
    requestedAccessMode: v.optional(accessModeValidator),
    availableIntegrations: v.optional(v.array(v.string())),
    unresolvedComplianceHold: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const compatibilityDecision = resolveRecommenderCompatibilityDecision();
    const compatibility = buildRecommenderCompatibilityPayload(compatibilityDecision);
    const limit = Number.isFinite(args.limit)
      ? Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(args.limit as number)))
      : 10;

    if (!compatibilityDecision.enabled) {
      const resolution = resolveAgentRecommendations({
        queryText: args.queryText,
        intentTags: args.intentTags,
        requestedAccessMode: args.requestedAccessMode,
        availableIntegrations: args.availableIntegrations,
        unresolvedComplianceHold: args.unresolvedComplianceHold,
        limit,
        entries: [],
        toolRequirements: [],
      });
      return {
        datasetVersion,
        ...resolution,
        compatibility,
      };
    }

    const entries = await loadDatasetEntries(ctx, datasetVersion);
    const resolvedEntries = entries.map(resolveCatalogEntryRecommendationFields);
    const toolRequirements = await loadToolRequirements(ctx, datasetVersion);

    const resolution = resolveAgentRecommendations({
      queryText: args.queryText,
      intentTags: args.intentTags,
      requestedAccessMode: args.requestedAccessMode,
      availableIntegrations: args.availableIntegrations,
      unresolvedComplianceHold: args.unresolvedComplianceHold,
      limit,
      entries: resolvedEntries.map(toRecommendationResolverEntry),
      toolRequirements: toolRequirements.map(toRecommendationResolverToolRequirement),
    });

    return {
      datasetVersion,
      ...resolution,
      compatibility,
    };
  },
});

export const getAgentDetails = query({
  args: {
    sessionId: v.string(),
    datasetVersion: v.optional(v.string()),
    catalogAgentNumber: v.number(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const dbAny = ctx.db as any;

    const entry = (await dbAny
      .query("agentCatalogEntries")
      .withIndex("by_dataset_agent", (q: any) =>
        q.eq("datasetVersion", datasetVersion).eq("catalogAgentNumber", args.catalogAgentNumber),
      )
      .first()) as CatalogEntryRow | null;

    if (!entry) {
      return null;
    }

    const tools = (await dbAny
      .query("agentCatalogToolRequirements")
      .withIndex("by_dataset_agent", (q: any) =>
        q.eq("datasetVersion", datasetVersion).eq("catalogAgentNumber", args.catalogAgentNumber),
      )
      .collect()) as ToolRequirementRow[];

    const seed = (await dbAny
      .query("agentCatalogSeedRegistry")
      .withIndex("by_dataset_agent", (q: any) =>
        q.eq("datasetVersion", datasetVersion).eq("catalogAgentNumber", args.catalogAgentNumber),
      )
      .first()) as SeedRegistryRow | null;

    const recentSyncRuns = await loadSyncRuns(ctx, datasetVersion, 10);

    return {
      datasetVersion,
      agent: resolveCatalogEntryRecommendationFields(entry),
      tools: tools.sort((a, b) => {
        if (a.requirementLevel !== b.requirementLevel) {
          const rank: Record<string, number> = { required: 0, recommended: 1, optional: 2 };
          return (rank[a.requirementLevel] ?? 9) - (rank[b.requirementLevel] ?? 9);
        }
        return a.toolName.localeCompare(b.toolName);
      }),
      seed,
      recentSyncRuns,
    };
  },
});

export const listSyncRuns = query({
  args: {
    sessionId: v.string(),
    datasetVersion: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const limit = Math.max(1, Math.min(100, args.limit ?? 20));
    const runs = await loadSyncRuns(ctx, datasetVersion, limit);

    return {
      datasetVersion,
      runs,
    };
  },
});

export const getDriftSummary = query({
  args: {
    sessionId: v.string(),
    datasetVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const runs = await loadSyncRuns(ctx, datasetVersion, 1);
    const latestRun = runs[0] ?? null;

    if (!latestRun) {
      return {
        datasetVersion,
        status: "registry_drift" as const,
        drift: {
          docsOutOfSync: true,
          registryOutOfSync: true,
          codeOutOfSync: false,
          reasons: ["No audit run available yet. Run Audit to establish baseline."],
        },
        latestRun: null,
      };
    }

    return {
      datasetVersion,
      status: deriveDriftStatus(latestRun.drift),
      drift: latestRun.drift,
      latestRun,
    };
  },
});

export const triggerCatalogSync = mutation({
  args: {
    sessionId: v.string(),
    datasetVersion: v.optional(v.string()),
    mode: syncModeValidator,
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireSuperAdminSession(ctx, args.sessionId);
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);

    const entries = await loadDatasetEntries(ctx, datasetVersion);
    const toolRequirements = await loadToolRequirements(ctx, datasetVersion);

    const summary = buildSummary(entries, toolRequirements);
    const drift = buildDrift({ datasetVersion, entries, summary });
    const hashes = buildHashes({ datasetVersion, entries, toolRequirements });

    const now = Date.now();
    const dbAny = ctx.db as any;
    const syncRunId = (await dbAny.insert("agentCatalogSyncRuns", {
      datasetVersion,
      triggeredByUserId: userId,
      mode: args.mode,
      status: "success",
      summary: {
        totalAgents: summary.totalAgents,
        catalogDone: summary.catalogDone,
        seedsFull: summary.seedsFull,
        runtimeLive: summary.runtimeLive,
        toolsMissing: summary.toolsMissing,
      },
      drift,
      hashes,
      startedAt: now,
      completedAt: now,
    })) as string;

    const auditObjectId = (await dbAny.insert("objects", {
      organizationId,
      type: "agent_catalog_sync_run",
      subtype: args.mode,
      name: `Agent Catalog ${args.mode} ${new Date(now).toISOString()}`,
      status: "completed",
      customProperties: {
        datasetVersion,
        syncRunId,
        summary,
        drift,
        hashes,
      },
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })) as string;

    await dbAny.insert("objectActions", {
      organizationId,
      objectId: auditObjectId,
      actionType: args.mode === "read_only_audit" ? "agent_catalog.audit" : "agent_catalog.sync_apply",
      actionData: {
        datasetVersion,
        syncRunId,
        summary,
        driftStatus: deriveDriftStatus(drift),
      },
      performedBy: userId,
      performedAt: now,
    });

    return {
      success: true,
      datasetVersion,
      syncRunId,
      mode: args.mode,
      status: deriveDriftStatus(drift),
      summary,
      drift,
      message:
        args.mode === "read_only_audit"
          ? "Audit run completed."
          : "Sync-apply run completed (Phase 1 operates in read-only contracts).",
    };
  },
});

export const setAgentBlocker = mutation({
  args: {
    sessionId: v.string(),
    datasetVersion: v.optional(v.string()),
    catalogAgentNumber: v.number(),
    blocker: v.string(),
    action: v.union(v.literal("add"), v.literal("remove")),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireSuperAdminSession(ctx, args.sessionId);
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const blocker = normalizeBlockerNote(args.blocker);

    if (!blocker) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "Blocker note is required.",
      });
    }

    const entry = await loadCatalogEntryByNumber(ctx, datasetVersion, args.catalogAgentNumber);
    if (!entry) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: `Catalog agent ${args.catalogAgentNumber} was not found in dataset '${datasetVersion}'.`,
      });
    }

    const dedupedCurrent = dedupeBlockers(entry.blockers);
    const nextBlockers =
      args.action === "add"
        ? dedupeBlockers([...dedupedCurrent, blocker])
        : dedupedCurrent.filter((item) => item !== blocker);

    const changed =
      nextBlockers.length !== entry.blockers.length
      || nextBlockers.some((value, index) => value !== entry.blockers[index]);

    const now = Date.now();
    if (changed) {
      const dbAny = ctx.db as any;
      await dbAny.patch(entry._id, {
        blockers: nextBlockers,
        updatedAt: now,
      });
    }

    await writeAgentCatalogAuditAction({
      ctx,
      organizationId,
      userId,
      actionType:
        args.action === "add" ? "agent_catalog.blocker_add" : "agent_catalog.blocker_remove",
      datasetVersion,
      catalogAgentNumber: args.catalogAgentNumber,
      actionData: {
        blocker,
        changed,
        blockers: nextBlockers,
      },
      objectType: "agent_catalog_blocker_update",
    });

    return {
      success: true,
      datasetVersion,
      catalogAgentNumber: args.catalogAgentNumber,
      action: args.action,
      blocker,
      changed,
      blockers: nextBlockers,
    };
  },
});

export const setSeedStatusOverride = mutation({
  args: {
    sessionId: v.string(),
    datasetVersion: v.optional(v.string()),
    catalogAgentNumber: v.number(),
    override: v.object({
      seedStatus: seedStatusValidator,
      reason: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireSuperAdminSession(ctx, args.sessionId);
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const reason = args.override.reason.trim();
    if (reason.length === 0) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "Seed override reason is required.",
      });
    }

    const entry = await loadCatalogEntryByNumber(ctx, datasetVersion, args.catalogAgentNumber);
    if (!entry) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: `Catalog agent ${args.catalogAgentNumber} was not found in dataset '${datasetVersion}'.`,
      });
    }

    const actorLabel = await resolveUserLabel(ctx, userId);
    const now = Date.now();
    const overrideState = {
      seedStatus: args.override.seedStatus,
      reason,
      actorUserId: userId,
      actorLabel,
      updatedAt: now,
    };

    const dbAny = ctx.db as any;
    await dbAny.patch(entry._id, {
      seedStatusOverride: overrideState,
      updatedAt: now,
    });

    await writeAgentCatalogAuditAction({
      ctx,
      organizationId,
      userId,
      actionType: "agent_catalog.seed_override_set",
      datasetVersion,
      catalogAgentNumber: args.catalogAgentNumber,
      actionData: {
        computedSeedStatus: entry.seedStatus,
        overrideState,
      },
      objectType: "agent_catalog_seed_override",
    });

    return {
      success: true,
      datasetVersion,
      catalogAgentNumber: args.catalogAgentNumber,
      computedSeedStatus: entry.seedStatus,
      seedStatusOverride: overrideState,
    };
  },
});

export const setSeedTemplateBinding = mutation({
  args: {
    sessionId: v.string(),
    datasetVersion: v.optional(v.string()),
    catalogAgentNumber: v.number(),
    templateAgentId: v.optional(v.id("objects")),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireSuperAdminSession(ctx, args.sessionId);
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const reason = args.reason.trim();
    if (reason.length === 0) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "Binding reason is required.",
      });
    }

    const entry = await loadCatalogEntryByNumber(ctx, datasetVersion, args.catalogAgentNumber);
    if (!entry) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: `Catalog agent ${args.catalogAgentNumber} was not found in dataset '${datasetVersion}'.`,
      });
    }

    const dbAny = ctx.db as any;
    const existingSeed = (await dbAny
      .query("agentCatalogSeedRegistry")
      .withIndex("by_dataset_agent", (q: any) =>
        q.eq("datasetVersion", datasetVersion).eq("catalogAgentNumber", args.catalogAgentNumber),
      )
      .first()) as SeedRegistryRow | null;

    const nextTemplateAgentId = args.templateAgentId ?? undefined;
    let templateRole: string | undefined;
    let templateName: string | null = null;
    let templateScope: string | null = null;

    if (nextTemplateAgentId) {
      const templateAgent = (await dbAny.get(nextTemplateAgentId)) as
        | {
            _id: Id<"objects">;
            type: string;
            status: string;
            name?: string;
            customProperties?: unknown;
          }
        | null;
      if (!templateAgent || templateAgent.type !== "org_agent") {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Template agent was not found.",
        });
      }
      const templateProps = asRecord(templateAgent.customProperties);
      if (templateAgent.status !== "template") {
        throw new ConvexError({
          code: "INVALID_ARGUMENT",
          message: "Template binding requires an agent with status='template'.",
        });
      }
      if (templateProps.protected !== true) {
        throw new ConvexError({
          code: "INVALID_ARGUMENT",
          message: "Template binding requires a protected template agent.",
        });
      }
      const resolvedTemplateRole = normalizeOptionalString(templateProps.templateRole);
      if (!resolvedTemplateRole) {
        throw new ConvexError({
          code: "INVALID_ARGUMENT",
          message: "Template binding requires templateRole on the target template.",
        });
      }
      templateRole = resolvedTemplateRole;
      templateName = normalizeOptionalString(templateAgent.name);
      templateScope = normalizeOptionalString(templateProps.templateScope);
    }

    const now = Date.now();
    const nextSeedCoverage =
      nextTemplateAgentId
        ? existingSeed?.seedCoverage && existingSeed.seedCoverage !== "missing"
          ? existingSeed.seedCoverage
          : "full"
        : existingSeed?.seedCoverage ?? "missing";
    const nextRequiresSoulBuild = nextTemplateAgentId
      ? false
      : existingSeed?.requiresSoulBuild ?? true;
    const nextRequiresSoulBuildReason = nextTemplateAgentId
      ? undefined
      : existingSeed?.requiresSoulBuildReason ?? "Template binding removed.";
    const nextImmutableOriginContractMapped = nextTemplateAgentId
      ? true
      : existingSeed?.immutableOriginContractMapped ?? false;
    const nextSourcePath = nextTemplateAgentId
      ? "manual://agentCatalogAdmin.setSeedTemplateBinding"
      : existingSeed?.sourcePath ?? "manual://agentCatalogAdmin.setSeedTemplateBinding";

    const prevTemplateAgentId = existingSeed?.systemTemplateAgentId
      ? String(existingSeed.systemTemplateAgentId)
      : null;
    const nextTemplateAgentIdString = nextTemplateAgentId ? String(nextTemplateAgentId) : null;
    const prevTemplateRole = existingSeed?.templateRole ?? null;
    const nextTemplateRole = nextTemplateAgentId ? templateRole ?? null : null;

    const changed =
      !existingSeed
      || prevTemplateAgentId !== nextTemplateAgentIdString
      || prevTemplateRole !== nextTemplateRole
      || (existingSeed?.protectedTemplate ?? false) !== Boolean(nextTemplateAgentId)
      || existingSeed.seedCoverage !== nextSeedCoverage
      || existingSeed.requiresSoulBuild !== nextRequiresSoulBuild
      || (existingSeed.requiresSoulBuildReason ?? null) !== (nextRequiresSoulBuildReason ?? null)
      || existingSeed.immutableOriginContractMapped !== nextImmutableOriginContractMapped
      || existingSeed.sourcePath !== nextSourcePath;

    let seedRegistryId: string;
    if (existingSeed) {
      await dbAny.patch(existingSeed._id, {
        seedCoverage: nextSeedCoverage,
        requiresSoulBuild: nextRequiresSoulBuild,
        requiresSoulBuildReason: nextRequiresSoulBuildReason,
        systemTemplateAgentId: nextTemplateAgentId,
        templateRole: nextTemplateRole ?? undefined,
        protectedTemplate: Boolean(nextTemplateAgentId),
        immutableOriginContractMapped: nextImmutableOriginContractMapped,
        sourcePath: nextSourcePath,
        updatedAt: now,
      });
      seedRegistryId = String(existingSeed._id);
    } else {
      seedRegistryId = String(
        await dbAny.insert("agentCatalogSeedRegistry", {
          datasetVersion,
          catalogAgentNumber: args.catalogAgentNumber,
          seedCoverage: nextSeedCoverage,
          requiresSoulBuild: nextRequiresSoulBuild,
          requiresSoulBuildReason: nextRequiresSoulBuildReason,
          systemTemplateAgentId: nextTemplateAgentId,
          templateRole: nextTemplateRole ?? undefined,
          protectedTemplate: Boolean(nextTemplateAgentId),
          immutableOriginContractMapped: nextImmutableOriginContractMapped,
          sourcePath: nextSourcePath,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }

    await writeAgentCatalogAuditAction({
      ctx,
      organizationId,
      userId,
      actionType: "agent_catalog.seed_template_binding_set",
      datasetVersion,
      catalogAgentNumber: args.catalogAgentNumber,
      actionData: {
        reason,
        changed,
        seedRegistryId,
        previousTemplateAgentId: prevTemplateAgentId,
        nextTemplateAgentId: nextTemplateAgentIdString,
        templateRole: nextTemplateRole,
        templateName,
        templateScope,
        protectedTemplate: Boolean(nextTemplateAgentId),
        seedCoverage: nextSeedCoverage,
        requiresSoulBuild: nextRequiresSoulBuild,
      },
      objectType: "agent_catalog_seed_template_binding",
    });

    return {
      success: true,
      datasetVersion,
      catalogAgentNumber: args.catalogAgentNumber,
      changed,
      seedRegistryId,
      binding: {
        templateAgentId: nextTemplateAgentIdString,
        templateRole: nextTemplateRole,
        templateName,
        templateScope,
        protectedTemplate: Boolean(nextTemplateAgentId),
      },
    };
  },
});

export const exportDocsSnapshot = mutation({
  args: {
    sessionId: v.string(),
    datasetVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    throw new ConvexError({
      code: "NOT_IMPLEMENTED",
      message: `Phase 3 feature not enabled yet: exportDocsSnapshot (${normalizeDatasetVersion(args.datasetVersion)}).`,
    });
  },
});

export const internalReadDatasetSnapshot = internalQuery({
  args: {
    datasetVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const entries = await loadDatasetEntries(ctx, datasetVersion);
    const resolvedEntries = entries.map(resolveCatalogEntryRecommendationFields);
    const toolRequirements = await loadToolRequirements(ctx, datasetVersion);
    const summary = buildSummary(entries, toolRequirements);
    const drift = buildDrift({ datasetVersion, entries, summary });
    const hashes = buildHashes({ datasetVersion, entries, toolRequirements });

    return {
      datasetVersion,
      summary,
      drift,
      hashes,
      toolRegistryCount: Object.keys(TOOL_REGISTRY).length,
      interviewToolCount: Object.keys(INTERVIEW_TOOLS).length,
      entries: resolvedEntries,
      toolRequirements,
    };
  },
});

export const internalGetDatasetVersionList = internalQuery({
  args: {},
  handler: async (ctx) => {
    const dbAny = ctx.db as any;
    const versions = new Set<string>([DEFAULT_DATASET_VERSION]);

    const entries = (await dbAny.query("agentCatalogEntries").collect()) as CatalogEntryRow[];
    for (const entry of entries) {
      versions.add(entry.datasetVersion);
    }

    const runs = (await dbAny.query("agentCatalogSyncRuns").collect()) as SyncRunRow[];
    for (const run of runs) {
      versions.add(run.datasetVersion);
    }

    return Array.from(versions).sort((a, b) => a.localeCompare(b));
  },
});

export const internalGetCoverageByAgent = internalQuery({
  args: {
    datasetVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const toolRequirements = await loadToolRequirements(ctx, datasetVersion);
    const coverage = toCoverageMap(toolRequirements);

    return Array.from(coverage.entries())
      .map(([catalogAgentNumber, counts]) => ({
        catalogAgentNumber,
        ...counts,
      }))
      .sort((a, b) => a.catalogAgentNumber - b.catalogAgentNumber);
  },
});
