import { defineTable } from "convex/server";
import { v } from "convex/values";

const agentCategoryValidator = v.union(
  v.literal("core"),
  v.literal("legal"),
  v.literal("finance"),
  v.literal("health"),
  v.literal("coaching"),
  v.literal("agency"),
  v.literal("trades"),
  v.literal("ecommerce"),
);

const specialistAccessModeValidator = v.union(
  v.literal("invisible"),
  v.literal("direct"),
  v.literal("meeting"),
);

const autonomyDefaultValidator = v.union(
  v.literal("draft_only"),
  v.literal("supervised"),
  v.literal("sandbox"),
  v.literal("autonomous"),
  v.literal("delegation"),
);

const recommendationActivationStateValidator = v.union(
  v.literal("suggest_activation"),
  v.literal("needs_setup"),
  v.literal("planned_only"),
  v.literal("blocked"),
);

const recommendationMetadataValidator = v.object({
  schemaVersion: v.literal("agp_recommender_v1"),
  source: v.union(v.literal("derived"), v.literal("manual")),
  rankHint: v.number(),
  gapPenaltyMultiplier: v.number(),
  defaultActivationState: recommendationActivationStateValidator,
});

export const agentCatalogEntries = defineTable({
  catalogAgentNumber: v.number(),
  datasetVersion: v.string(),
  name: v.string(),
  category: agentCategoryValidator,
  tier: v.string(),
  soulBlend: v.string(),
  soulStatus: v.union(
    v.literal("ready"),
    v.literal("needs_build"),
    v.literal("pending"),
  ),
  subtype: v.string(),
  toolProfile: v.string(),
  requiredIntegrations: v.array(v.string()),
  channelAffinity: v.array(v.string()),
  specialistAccessModes: v.array(specialistAccessModeValidator),
  autonomyDefault: autonomyDefaultValidator,
  intentTags: v.optional(v.array(v.string())),
  keywordAliases: v.optional(v.array(v.string())),
  recommendationMetadata: v.optional(recommendationMetadataValidator),
  implementationPhase: v.number(),
  catalogStatus: v.union(v.literal("done"), v.literal("pending")),
  toolCoverageStatus: v.union(
    v.literal("complete"),
    v.literal("partial"),
    v.literal("missing"),
  ),
  seedStatus: v.union(
    v.literal("full"),
    v.literal("skeleton"),
    v.literal("missing"),
  ),
  runtimeStatus: v.union(
    v.literal("live"),
    v.literal("template_only"),
    v.literal("not_deployed"),
  ),
  // Explicit release control for catalog visibility. Optional during rollout to support
  // existing rows until a backfill migration populates this field.
  published: v.optional(v.boolean()),
  seedStatusOverride: v.optional(
    v.object({
      seedStatus: v.union(
        v.literal("full"),
        v.literal("skeleton"),
        v.literal("missing"),
      ),
      reason: v.string(),
      actorUserId: v.id("users"),
      actorLabel: v.string(),
      updatedAt: v.number(),
    }),
  ),
  blockers: v.array(v.string()),
  sourceRefs: v.object({
    catalogDocPath: v.string(),
    matrixDocPath: v.string(),
    seedDocPath: v.string(),
    roadmapDocPath: v.string(),
  }),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_dataset_agent", ["datasetVersion", "catalogAgentNumber"])
  .index("by_dataset_category", ["datasetVersion", "category"])
  .index("by_dataset_runtime_status", ["datasetVersion", "runtimeStatus"])
  .index("by_dataset_published", ["datasetVersion", "published"])
  .index("by_dataset_seed_status", ["datasetVersion", "seedStatus"]);

export const agentCatalogToolRequirements = defineTable({
  datasetVersion: v.string(),
  catalogAgentNumber: v.number(),
  toolName: v.string(),
  requirementLevel: v.union(
    v.literal("required"),
    v.literal("recommended"),
    v.literal("optional"),
  ),
  modeScope: v.object({
    work: v.union(
      v.literal("allow"),
      v.literal("approval_required"),
      v.literal("deny"),
    ),
    private: v.union(
      v.literal("allow"),
      v.literal("approval_required"),
      v.literal("deny"),
    ),
  }),
  mutability: v.union(v.literal("read_only"), v.literal("mutating")),
  integrationDependency: v.optional(v.string()),
  source: v.union(
    v.literal("registry"),
    v.literal("interview_tools"),
    v.literal("proposed_new"),
  ),
  implementationStatus: v.union(v.literal("implemented"), v.literal("missing")),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_dataset_agent", ["datasetVersion", "catalogAgentNumber"])
  .index("by_dataset_tool", ["datasetVersion", "toolName"])
  .index("by_dataset_impl_status", ["datasetVersion", "implementationStatus"]);

export const agentCatalogSeedRegistry = defineTable({
  datasetVersion: v.string(),
  catalogAgentNumber: v.number(),
  seedCoverage: v.union(
    v.literal("full"),
    v.literal("skeleton"),
    v.literal("missing"),
  ),
  requiresSoulBuild: v.boolean(),
  requiresSoulBuildReason: v.optional(v.string()),
  systemTemplateAgentId: v.optional(v.id("objects")),
  templateRole: v.optional(v.string()),
  protectedTemplate: v.optional(v.boolean()),
  immutableOriginContractMapped: v.boolean(),
  sourcePath: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_dataset_agent", ["datasetVersion", "catalogAgentNumber"])
  .index("by_dataset_seed_coverage", ["datasetVersion", "seedCoverage"]);

export const agentCatalogSyncRuns = defineTable({
  datasetVersion: v.string(),
  triggeredByUserId: v.optional(v.id("users")),
  mode: v.union(v.literal("read_only_audit"), v.literal("sync_apply")),
  status: v.union(v.literal("success"), v.literal("failed")),
  summary: v.object({
    totalAgents: v.number(),
    catalogDone: v.number(),
    seedsFull: v.number(),
    runtimeLive: v.number(),
    toolsMissing: v.number(),
  }),
  drift: v.object({
    docsOutOfSync: v.boolean(),
    registryOutOfSync: v.boolean(),
    codeOutOfSync: v.boolean(),
    reasons: v.array(v.string()),
  }),
  hashes: v.object({
    catalogDocHash: v.string(),
    matrixDocHash: v.string(),
    seedDocHash: v.string(),
    roadmapDocHash: v.string(),
    overviewDocHash: v.string(),
    toolRegistryHash: v.string(),
    toolProfileHash: v.string(),
    recommendationMetadataHash: v.optional(v.string()),
  }),
  error: v.optional(v.string()),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_dataset_started", ["datasetVersion", "startedAt"]);
