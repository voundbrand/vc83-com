import { ConvexError, v } from "convex/values";
import { query, type QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import {
  checkPermission,
  getUserContext,
  requireAuthenticatedUser,
} from "../rbacHelpers";
import {
  AGENT_STORE_COMPATIBILITY_FLAG_ALIASES,
  deriveDefaultIntentTags as deriveCatalogDefaultIntentTags,
  deriveDefaultKeywordAliases as deriveCatalogDefaultKeywordAliases,
  normalizeDefaultRecommendationMetadata,
  normalizeRecommendationToken,
  resolveCompatibilityFlagDecision,
  type AgentRecommendationMetadata,
  type CompatibilityFlagDecision,
} from "./agentRecommendationResolver";
import {
  loadMidwifeSeededProfileCandidatesFromDb,
  type MidwifeSeededProfileCandidate,
} from "./midwifeCatalogComposer";
import { resolveTemplateClonePolicy } from "./workerPool";

const DEFAULT_DATASET_VERSION = "agp_v1";
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const MANAGED_USE_CASE_CLONE_LIFECYCLE = "managed_use_case_clone_v1";
const ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION =
  "aoh_action_completion_template_contract_v1";

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

const accessModeValidator = v.union(
  v.literal("invisible"),
  v.literal("direct"),
  v.literal("meeting"),
);

const sortValidator = v.union(
  v.literal("recommended"),
  v.literal("name"),
  v.literal("tier"),
  v.literal("newest"),
);

type CatalogEntryRow = {
  _id: Id<"agentCatalogEntries">;
  datasetVersion: string;
  catalogAgentNumber: number;
  name: string;
  category: string;
  tier: string;
  subtype: string;
  toolProfile: string;
  requiredIntegrations: string[];
  channelAffinity: string[];
  specialistAccessModes: string[];
  autonomyDefault: string;
  intentTags?: string[];
  keywordAliases?: string[];
  recommendationMetadata?: AgentRecommendationMetadata;
  runtimeStatus: string;
  catalogStatus?: string;
  published?: boolean;
  seedStatus: string;
  updatedAt: number;
};

type ToolRequirementRow = {
  _id: Id<"agentCatalogToolRequirements">;
  datasetVersion: string;
  catalogAgentNumber: number;
  toolName: string;
  requirementLevel: "required" | "recommended" | "optional";
  integrationDependency?: string;
  source: "registry" | "interview_tools" | "proposed_new";
  implementationStatus: "implemented" | "missing";
};

type SeedRegistryRow = {
  _id: Id<"agentCatalogSeedRegistry">;
  datasetVersion: string;
  catalogAgentNumber: number;
  seedCoverage: "full" | "skeleton" | "missing";
  requiresSoulBuild: boolean;
  systemTemplateAgentId?: Id<"objects">;
};

type OAuthConnectionRow = {
  _id: Id<"oauthConnections">;
  organizationId: Id<"organizations">;
  provider: string;
  status: string;
};

type OrganizationRow = {
  _id: Id<"organizations">;
  paymentProviders?: Array<{
    providerCode?: string;
    status?: string;
  }>;
};

type ObjectRow = {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  type: string;
  name: string;
  status: string;
  customProperties?: unknown;
  updatedAt: number;
};

type OrganizationMemberRow = {
  _id: Id<"organizationMembers">;
  userId: Id<"users">;
  organizationId: Id<"organizations">;
  isActive: boolean;
};

type StoreCardToolTag = {
  key: string;
  status: "available_now" | "planned";
  requirementLevel: "required" | "recommended" | "optional";
};

type StoreCardIntegrationTag = {
  key: string;
  status: "available_now" | "blocked";
};

type CapabilityAvailability = {
  capabilityId: string;
  label: string;
};

type CapabilityBlocked = {
  capabilityId: string;
  label: string;
  blockerType:
    | "integration_missing"
    | "tool_not_enabled"
    | "channel_unavailable"
    | "access_mode_restricted"
    | "runtime_planned";
  blockerKey?: string;
};

type CapabilitySnapshot = {
  availableNow: CapabilityAvailability[];
  blocked: CapabilityBlocked[];
};

type StoreCard = {
  cardId: string;
  agentId: string;
  catalogAgentNumber: number;
  published: boolean;
  displayName: string;
  verticalCategory: string;
  tier: string;
  abilityTags: string[];
  toolTags: StoreCardToolTag[];
  frameworkTags: string[];
  integrationTags: StoreCardIntegrationTag[];
  strengthTags: string[];
  weaknessTags: string[];
  supportedAccessModes: string[];
  channelAffinity: string[];
  autonomyDefault: string;
  runtimeAvailability: "available_now" | "planned";
  avatarSlot: {
    slotId: string;
    fallbackAssetKey: string;
    artStyle: "portrait" | "isometric" | "badge" | "minimal";
    theme:
      | "core"
      | "legal"
      | "finance"
      | "health"
      | "coaching"
      | "agency"
      | "trades"
      | "ecommerce";
  };
  capabilitySnapshotPreview: {
    availableNowCount: number;
    blockedCount: number;
  };
  recommendationMetadata: AgentRecommendationMetadata;
  templateAvailability: {
    hasTemplate: boolean;
    templateAgentId?: Id<"objects">;
    seedCoverage: "full" | "skeleton" | "missing";
    requiresSoulBuild: boolean;
  };
};

const CATEGORY_STRENGTH_TAGS: Record<string, string[]> = {
  core: ["cross_functional_strategy", "operator_alignment", "delegation_clarity"],
  legal: ["compliance_rigor", "case_intake_precision", "risk_escalation"],
  finance: ["unit_economics_modeling", "portfolio_signal_detection", "scenario_planning"],
  health: ["care_followup_consistency", "patient_communication", "triage_structure"],
  coaching: ["program_tracking", "accountability_sequences", "session_readiness"],
  agency: ["capacity_planning", "client_delivery_orchestration", "proposal_rigor"],
  trades: ["quote_scope_speed", "job_cost_estimation", "schedule_coordination"],
  ecommerce: ["conversion_recovery", "inventory_alerting", "channel_execution"],
};

const CATEGORY_WEAKNESS_TAGS: Record<string, string[]> = {
  core: ["requires_context_specific_prompts"],
  legal: ["requires_human_legal_approval_for_mutations"],
  finance: ["sensitive_to_data_quality"],
  health: ["requires_clinical_handoff_for_critical_decisions"],
  coaching: ["depends_on_consistent_client_signal_capture"],
  agency: ["sensitive_to_scope_change_noise"],
  trades: ["sensitive_to_real_time_field_updates"],
  ecommerce: ["depends_on_connected_channel_integrations"],
};

const CATEGORY_AVATAR_THEME: Record<
  string,
  | "core"
  | "legal"
  | "finance"
  | "health"
  | "coaching"
  | "agency"
  | "trades"
  | "ecommerce"
> = {
  core: "core",
  legal: "legal",
  finance: "finance",
  health: "health",
  coaching: "coaching",
  agency: "agency",
  trades: "trades",
  ecommerce: "ecommerce",
};

const TIER_SORT_WEIGHT: Record<string, number> = {
  foundation: 0,
  "dream_team": 1,
  sovereign: 2,
};

export const NO_FIT_CONCIERGE_TERMS = {
  minimum: "€5,000 minimum",
  deposit: "€2,500 deposit",
  onboarding: "includes 90-minute onboarding with engineer",
};

function resolveStoreCompatibilityDecision(): CompatibilityFlagDecision {
  return resolveCompatibilityFlagDecision({
    aliases: AGENT_STORE_COMPATIBILITY_FLAG_ALIASES,
  });
}

function buildStoreCompatibilityPayload(decision: CompatibilityFlagDecision) {
  return {
    enabled: decision.enabled,
    flagKey: decision.flagKey,
    matchedAlias: decision.matchedAlias,
    defaultState: decision.defaultState,
    reason: decision.enabled ? "enabled" : "compatibility_flag_disabled",
  } as const;
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

function normalizeDatasetVersion(datasetVersion?: string): string {
  const normalized = (datasetVersion || "").trim();
  return normalized.length > 0 ? normalized : DEFAULT_DATASET_VERSION;
}

function normalizeToken(value: string): string {
  return normalizeRecommendationToken(value);
}

function normalizeTokenArray(values: Iterable<string>): string[] {
  const deduped = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeToken(value);
    if (!normalized || deduped.has(normalized)) {
      continue;
    }
    deduped.add(normalized);
    result.push(normalized);
  }
  return result;
}

function resolveActionCompletionContractSummary(
  value: unknown,
): {
  contractVersion: string;
  mode: "off" | "observe" | "enforce";
  outcomeKeys: string[];
  requiredToolCount: number;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.contractVersion !== ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION) {
    return null;
  }

  const modeValue = normalizeOptionalString(record.mode);
  const mode = modeValue === "off" || modeValue === "observe" || modeValue === "enforce"
    ? modeValue
    : "observe";
  const outcomes = Array.isArray(record.outcomes) ? record.outcomes : [];
  const outcomeKeys: string[] = [];
  let requiredToolCount = 0;
  for (const rawOutcome of outcomes) {
    if (!rawOutcome || typeof rawOutcome !== "object" || Array.isArray(rawOutcome)) {
      continue;
    }
    const outcomeRecord = rawOutcome as Record<string, unknown>;
    const outcome = normalizeOptionalString(outcomeRecord.outcome);
    if (!outcome) {
      continue;
    }
    outcomeKeys.push(outcome);
    const requiredTools = Array.isArray(outcomeRecord.requiredTools)
      ? outcomeRecord.requiredTools
      : [];
    for (const toolName of requiredTools) {
      if (normalizeOptionalString(toolName)) {
        requiredToolCount += 1;
      }
    }
  }
  return {
    contractVersion: ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION,
    mode,
    outcomeKeys: Array.from(new Set(outcomeKeys)).sort((a, b) => a.localeCompare(b)),
    requiredToolCount,
  };
}

function humanizeToken(token: string): string {
  return token
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function deriveIntentTags(entry: CatalogEntryRow): string[] {
  const stored = normalizeTokenArray(entry.intentTags ?? []);
  if (stored.length > 0) {
    return stored;
  }
  return deriveCatalogDefaultIntentTags({
    category: entry.category,
    subtype: entry.subtype,
    toolProfile: entry.toolProfile,
  });
}

function deriveKeywordAliases(entry: CatalogEntryRow, intentTags: string[]): string[] {
  const stored = normalizeTokenArray(entry.keywordAliases ?? []);
  if (stored.length > 0) {
    return stored;
  }
  return deriveCatalogDefaultKeywordAliases({
    name: entry.name,
    category: entry.category,
    subtype: entry.subtype,
    toolProfile: entry.toolProfile,
    tier: entry.tier,
    intentTags,
  });
}

function deriveRecommendationMetadata(entry: CatalogEntryRow): AgentRecommendationMetadata {
  return normalizeDefaultRecommendationMetadata({
    metadata: entry.recommendationMetadata,
    fallbackActivationState: entry.runtimeStatus === "live" ? "suggest_activation" : "planned_only",
    fallbackRankHint:
      normalizeToken(entry.tier) === "sovereign"
        ? 0.08
        : normalizeToken(entry.tier) === "dream_team"
          ? 0.05
          : 0.02,
    fallbackGapPenaltyMultiplier:
      entry.runtimeStatus === "live"
        ? entry.seedStatus === "full"
          ? 1
          : 1.1
        : 1.25,
  });
}

function normalizeIntegrationKey(value: string): string {
  const normalized = normalizeToken(value);
  if (!normalized) {
    return normalized;
  }

  const aliasMap: Record<string, string> = {
    stripe_connect: "stripe",
    stripeconnect: "stripe",
    microsoft_graph: "microsoft",
    office365: "microsoft",
    active_campaign: "activecampaign",
  };

  return aliasMap[normalized] ?? normalized;
}

function resolveRuntimeAvailability(runtimeStatus: string): "available_now" | "planned" {
  return normalizeToken(runtimeStatus) === "live" ? "available_now" : "planned";
}

function inferLegacyPublishedState(entry: CatalogEntryRow): boolean {
  const runtimeStatus = normalizeOptionalString(entry.runtimeStatus) || "";
  const catalogStatus = normalizeOptionalString(entry.catalogStatus) || "done";
  return normalizeToken(runtimeStatus) === "live"
    && normalizeToken(catalogStatus) === "done";
}

function isPublishedCatalogEntry(entry: CatalogEntryRow): boolean {
  if (typeof entry.published === "boolean") {
    return entry.published;
  }
  // Rollout compatibility: honor legacy rows before explicit published backfill completes.
  return inferLegacyPublishedState(entry);
}

function resolveTierWeight(tier: string): number {
  const normalized = normalizeToken(tier);
  return TIER_SORT_WEIGHT[normalized] ?? 0;
}

function resolveAvatarTheme(category: string) {
  return CATEGORY_AVATAR_THEME[normalizeToken(category)] ?? "core";
}

function isToolAvailableNow(row: ToolRequirementRow): boolean {
  return row.implementationStatus === "implemented" && row.source !== "proposed_new";
}

function resolveStoreCardToolTags(rows: ToolRequirementRow[]): StoreCardToolTag[] {
  const requirementRank: Record<string, number> = {
    required: 0,
    recommended: 1,
    optional: 2,
  };

  return [...rows]
    .sort((a, b) => {
      const levelDiff =
        (requirementRank[a.requirementLevel] ?? 9) -
        (requirementRank[b.requirementLevel] ?? 9);
      if (levelDiff !== 0) {
        return levelDiff;
      }
      return a.toolName.localeCompare(b.toolName);
    })
    .map((row) => ({
      key: normalizeToken(row.toolName),
      status: isToolAvailableNow(row) ? "available_now" : "planned",
      requirementLevel: row.requirementLevel,
    }));
}

function resolveAbilityTags(entry: CatalogEntryRow, intentTags: string[]): string[] {
  return normalizeTokenArray([
    ...intentTags,
    normalizeToken(entry.subtype),
    normalizeToken(entry.toolProfile),
    normalizeToken(entry.category),
  ]);
}

function resolveFrameworkTags(args: {
  entry: CatalogEntryRow;
  candidate?: MidwifeSeededProfileCandidate;
}): string[] {
  const tags = normalizeTokenArray([
    `profile_${normalizeToken(args.entry.toolProfile)}`,
    `autonomy_${normalizeToken(args.entry.autonomyDefault)}`,
    ...args.entry.specialistAccessModes.map((mode) => `access_${normalizeToken(mode)}`),
    args.candidate?.protectedTemplate ? "protected_template" : "standard_template",
  ]);
  return tags;
}

function resolveStrengthTags(args: {
  entry: CatalogEntryRow;
  connectedIntegrations: Set<string>;
  requiredIntegrations: string[];
}): string[] {
  const categoryStrengths =
    CATEGORY_STRENGTH_TAGS[normalizeToken(args.entry.category)] ??
    CATEGORY_STRENGTH_TAGS.core;

  const strengthTags = [...categoryStrengths];
  const integrationsReady = args.requiredIntegrations.filter((integration) =>
    args.connectedIntegrations.has(normalizeIntegrationKey(integration)),
  );
  if (integrationsReady.length > 0) {
    strengthTags.push("integration_ready");
  }
  if (resolveRuntimeAvailability(args.entry.runtimeStatus) === "available_now") {
    strengthTags.push("activation_ready");
  }

  return normalizeTokenArray(strengthTags);
}

function resolveWeaknessTags(args: {
  entry: CatalogEntryRow;
  requiredIntegrations: string[];
  connectedIntegrations: Set<string>;
  requiredTools: ToolRequirementRow[];
}): string[] {
  const categoryWeaknesses =
    CATEGORY_WEAKNESS_TAGS[normalizeToken(args.entry.category)] ??
    CATEGORY_WEAKNESS_TAGS.core;
  const weaknessTags = [...categoryWeaknesses];

  if (resolveRuntimeAvailability(args.entry.runtimeStatus) !== "available_now") {
    weaknessTags.push("activation_pending");
  }
  if (args.entry.seedStatus !== "full") {
    weaknessTags.push("persona_depth_limited");
  }
  if (
    args.requiredIntegrations.some(
      (integration) => !args.connectedIntegrations.has(normalizeIntegrationKey(integration)),
    )
  ) {
    weaknessTags.push("integration_dependency_gap");
  }
  if (args.requiredTools.some((tool) => !isToolAvailableNow(tool))) {
    weaknessTags.push("tool_readiness_gap");
  }

  return normalizeTokenArray(weaknessTags);
}

function normalizeChannel(value: string): string {
  return normalizeToken(value).replace(/_/g, "-");
}

function deriveCapabilitySnapshot(args: {
  entry: CatalogEntryRow;
  intentTags: string[];
  requiredTools: ToolRequirementRow[];
  connectedIntegrationKeys: Set<string>;
  requestedAccessMode?: "invisible" | "direct" | "meeting";
  requestedChannel?: string;
  includeQuotaBlock?: boolean;
  quotaBlockReason?: string;
}): CapabilitySnapshot {
  const availableNow: CapabilityAvailability[] = [];
  const blocked: CapabilityBlocked[] = [];
  const blockedKeys = new Set<string>();

  const pushBlocked = (row: CapabilityBlocked) => {
    const key = `${row.capabilityId}:${row.blockerType}:${row.blockerKey || ""}`;
    if (blockedKeys.has(key)) {
      return;
    }
    blockedKeys.add(key);
    blocked.push(row);
  };

  const supportedAccessModes = new Set(
    normalizeTokenArray(args.entry.specialistAccessModes ?? []).filter(
      (mode) => mode === "invisible" || mode === "direct" || mode === "meeting",
    ),
  );

  if (
    args.requestedAccessMode &&
    !supportedAccessModes.has(args.requestedAccessMode)
  ) {
    pushBlocked({
      capabilityId: "access_mode",
      label: humanizeToken(args.requestedAccessMode),
      blockerType: "access_mode_restricted",
      blockerKey: args.requestedAccessMode,
    });
  }

  if (args.requestedChannel) {
    const requestedChannel = normalizeChannel(args.requestedChannel);
    const availableChannels = new Set(
      (args.entry.channelAffinity ?? []).map((channel) => normalizeChannel(channel)),
    );
    if (!availableChannels.has(requestedChannel)) {
      pushBlocked({
        capabilityId: "channel",
        label: humanizeToken(requestedChannel),
        blockerType: "channel_unavailable",
        blockerKey: requestedChannel,
      });
    }
  }

  const runtimeReady = resolveRuntimeAvailability(args.entry.runtimeStatus) === "available_now";
  if (!runtimeReady) {
    pushBlocked({
      capabilityId: "runtime",
      label: "Runtime activation",
      blockerType: "runtime_planned",
      blockerKey: normalizeToken(args.entry.runtimeStatus),
    });
  }

  for (const integration of args.entry.requiredIntegrations ?? []) {
    const integrationKey = normalizeIntegrationKey(integration);
    if (args.connectedIntegrationKeys.has(integrationKey)) {
      continue;
    }
    pushBlocked({
      capabilityId: `integration:${integrationKey}`,
      label: humanizeToken(integrationKey),
      blockerType: "integration_missing",
      blockerKey: integrationKey,
    });
  }

  for (const tool of args.requiredTools) {
    if (tool.requirementLevel !== "required") {
      continue;
    }
    const toolKey = normalizeToken(tool.toolName);
    if (!isToolAvailableNow(tool)) {
      pushBlocked({
        capabilityId: `tool:${toolKey}`,
        label: humanizeToken(toolKey),
        blockerType: "tool_not_enabled",
        blockerKey: toolKey,
      });
      continue;
    }

    const integrationDependency = normalizeOptionalString(tool.integrationDependency);
    if (integrationDependency) {
      const dependencyKey = normalizeIntegrationKey(integrationDependency);
      if (!args.connectedIntegrationKeys.has(dependencyKey)) {
        pushBlocked({
          capabilityId: `tool:${toolKey}`,
          label: humanizeToken(toolKey),
          blockerType: "integration_missing",
          blockerKey: dependencyKey,
        });
        continue;
      }
    }

    if (runtimeReady) {
      availableNow.push({
        capabilityId: `tool:${toolKey}`,
        label: humanizeToken(toolKey),
      });
    }
  }

  if (runtimeReady && availableNow.length === 0) {
    for (const intent of args.intentTags.slice(0, 6)) {
      availableNow.push({
        capabilityId: `intent:${intent}`,
        label: humanizeToken(intent),
      });
    }
  }

  if (args.includeQuotaBlock) {
    pushBlocked({
      capabilityId: "clone_quota",
      label: "Clone quota",
      blockerType: "runtime_planned",
      blockerKey: args.quotaBlockReason || "clone_quota_exceeded",
    });
  }

  return { availableNow, blocked };
}

function deriveRequiredSpecialistScopeContract(args: {
  entry: CatalogEntryRow;
  requiredTools: ToolRequirementRow[];
}): {
  requiredTools: string[];
  requiredCapabilities: string[];
} {
  const requiredTools = normalizeTokenArray(
    args.requiredTools
      .filter((tool) => tool.requirementLevel === "required")
      .map((tool) => tool.toolName),
  ).sort((left, right) => left.localeCompare(right));
  const requiredCapabilities = normalizeTokenArray([
    ...requiredTools.map((toolName) => `tool:${toolName}`),
    ...(args.entry.requiredIntegrations ?? []).map(
      (integration) => `integration:${normalizeIntegrationKey(integration)}`,
    ),
  ]).sort((left, right) => left.localeCompare(right));

  return {
    requiredTools,
    requiredCapabilities,
  };
}

function getTemplateAvailability(args: {
  seedRow: SeedRegistryRow | null;
  candidate?: MidwifeSeededProfileCandidate;
}): {
  hasTemplate: boolean;
  templateAgentId?: Id<"objects">;
  seedCoverage: "full" | "skeleton" | "missing";
  requiresSoulBuild: boolean;
} {
  const templateAgentId =
    args.seedRow?.systemTemplateAgentId ??
    (args.candidate?.templateAgentId as Id<"objects"> | undefined);
  const seedCoverage = args.seedRow?.seedCoverage ?? args.candidate?.seedCoverage ?? "missing";
  const requiresSoulBuild =
    args.seedRow?.requiresSoulBuild ?? args.candidate?.requiresSoulBuild ?? true;

  return {
    hasTemplate: Boolean(templateAgentId),
    templateAgentId,
    seedCoverage,
    requiresSoulBuild,
  };
}

function resolveStoreCard(args: {
  entry: CatalogEntryRow;
  toolRows: ToolRequirementRow[];
  seedRow: SeedRegistryRow | null;
  candidate?: MidwifeSeededProfileCandidate;
  connectedIntegrationKeys: Set<string>;
}): StoreCard {
  const intentTags = deriveIntentTags(args.entry);
  const recommendationMetadata = deriveRecommendationMetadata(args.entry);
  const requiredTools = args.toolRows.filter((row) => row.requirementLevel === "required");
  const abilityTags = resolveAbilityTags(args.entry, intentTags);
  const frameworkTags = resolveFrameworkTags({
    entry: args.entry,
    candidate: args.candidate,
  });
  const toolTags = resolveStoreCardToolTags(args.toolRows);
  const integrationTags = normalizeTokenArray(args.entry.requiredIntegrations ?? []).map(
    (integrationKey) => ({
      key: integrationKey,
      status: args.connectedIntegrationKeys.has(integrationKey)
        ? ("available_now" as const)
        : ("blocked" as const),
    }),
  );
  const strengthTags = resolveStrengthTags({
    entry: args.entry,
    requiredIntegrations: args.entry.requiredIntegrations ?? [],
    connectedIntegrations: args.connectedIntegrationKeys,
  });
  const weaknessTags = resolveWeaknessTags({
    entry: args.entry,
    requiredIntegrations: args.entry.requiredIntegrations ?? [],
    connectedIntegrations: args.connectedIntegrationKeys,
    requiredTools,
  });
  const capabilitySnapshot = deriveCapabilitySnapshot({
    entry: args.entry,
    intentTags,
    requiredTools,
    connectedIntegrationKeys: args.connectedIntegrationKeys,
  });
  const availability = getTemplateAvailability({
    seedRow: args.seedRow,
    candidate: args.candidate,
  });
  const theme = resolveAvatarTheme(args.entry.category);

  return {
    cardId: `agent:${args.entry.catalogAgentNumber}`,
    agentId: String(args.entry.catalogAgentNumber),
    catalogAgentNumber: args.entry.catalogAgentNumber,
    published: isPublishedCatalogEntry(args.entry),
    displayName: args.entry.name,
    verticalCategory: normalizeToken(args.entry.category),
    tier: args.entry.tier,
    abilityTags,
    toolTags,
    frameworkTags,
    integrationTags,
    strengthTags,
    weaknessTags,
    supportedAccessModes: normalizeTokenArray(args.entry.specialistAccessModes ?? []),
    channelAffinity: normalizeTokenArray(args.entry.channelAffinity ?? []),
    autonomyDefault: normalizeToken(args.entry.autonomyDefault),
    runtimeAvailability: resolveRuntimeAvailability(args.entry.runtimeStatus),
    avatarSlot: {
      slotId: `agent-${args.entry.catalogAgentNumber}-primary`,
      fallbackAssetKey: `agent-${args.entry.catalogAgentNumber}-${normalizeToken(args.entry.tier)}-fallback`,
      artStyle: theme === "core" ? "badge" : "portrait",
      theme,
    },
    capabilitySnapshotPreview: {
      availableNowCount: capabilitySnapshot.availableNow.length,
      blockedCount: capabilitySnapshot.blocked.length,
    },
    recommendationMetadata,
    templateAvailability: availability,
  };
}

function buildAskAiCatalogContextPayload(args: {
  card: StoreCard;
  entry: CatalogEntryRow;
  requiredTools: string[];
  requiredCapabilities: string[];
  capabilitySnapshot: CapabilitySnapshot;
}): Record<string, unknown> {
  return {
    catalogAgentNumber: args.card.catalogAgentNumber,
    displayName: args.card.displayName,
    category: args.card.verticalCategory,
    tier: args.card.tier,
    runtimeAvailability: args.card.runtimeAvailability,
    autonomyDefault: args.card.autonomyDefault,
    published: args.card.published,
    supportedAccessModes: args.card.supportedAccessModes,
    channelAffinity: args.card.channelAffinity,
    abilityTags: args.card.abilityTags,
    toolTags: args.card.toolTags.map(
      (tag) => `${tag.key}:${tag.status}:${tag.requirementLevel}`,
    ),
    frameworkTags: args.card.frameworkTags,
    integrationTags: args.card.integrationTags.map((tag) => `${tag.key}:${tag.status}`),
    requiredIntegrations: normalizeTokenArray(args.entry.requiredIntegrations ?? []),
    requiredTools: args.requiredTools,
    requiredCapabilities: args.requiredCapabilities,
    capabilitySnapshotAvailableNow: args.capabilitySnapshot.availableNow.map(
      (row) => `${row.capabilityId}:${normalizeToken(row.label)}`,
    ),
    capabilitySnapshotBlocked: args.capabilitySnapshot.blocked.map(
      (row) =>
        `${row.capabilityId}:${row.blockerType}:${normalizeToken(row.blockerKey || "")}:${normalizeToken(row.label)}`,
    ),
    templateReady: args.card.templateAvailability.hasTemplate,
    seedCoverage: args.card.templateAvailability.seedCoverage,
  };
}

function buildStoreSearchHaystack(card: StoreCard): string {
  return [
    card.displayName,
    card.verticalCategory,
    card.tier,
    card.abilityTags.join(" "),
    card.toolTags.map((tag) => tag.key).join(" "),
    card.frameworkTags.join(" "),
    card.strengthTags.join(" "),
    card.weaknessTags.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function parseSearchTokens(value: string): string[] {
  return normalizeTokenArray(
    value
      .toLowerCase()
      .split(/[^a-z0-9_]+/g)
      .filter(Boolean),
  );
}

function sortStoreCards(cards: StoreCard[], sort: "recommended" | "name" | "tier" | "newest"): StoreCard[] {
  const scored = [...cards];
  scored.sort((a, b) => {
    if (sort === "name") {
      return a.displayName.localeCompare(b.displayName);
    }

    if (sort === "tier") {
      const tierDiff = resolveTierWeight(a.tier) - resolveTierWeight(b.tier);
      if (tierDiff !== 0) {
        return tierDiff;
      }
      return a.displayName.localeCompare(b.displayName);
    }

    if (sort === "newest") {
      return b.catalogAgentNumber - a.catalogAgentNumber;
    }

    // recommended
    const aScore =
      a.recommendationMetadata.rankHint
      + (a.runtimeAvailability === "available_now" ? 0.3 : 0)
      + a.capabilitySnapshotPreview.availableNowCount * 0.02
      - a.capabilitySnapshotPreview.blockedCount * 0.03;
    const bScore =
      b.recommendationMetadata.rankHint
      + (b.runtimeAvailability === "available_now" ? 0.3 : 0)
      + b.capabilitySnapshotPreview.availableNowCount * 0.02
      - b.capabilitySnapshotPreview.blockedCount * 0.03;

    if (aScore !== bScore) {
      return bScore - aScore;
    }
    return a.catalogAgentNumber - b.catalogAgentNumber;
  });
  return scored;
}

async function requireStoreAccess(
  ctx: QueryCtx,
  args: {
    sessionId: string;
    organizationId?: Id<"organizations">;
  },
): Promise<{
  userId: Id<"users">;
  organizationId: Id<"organizations">;
  isSuperAdmin: boolean;
}> {
  const auth = await requireAuthenticatedUser(ctx, args.sessionId);
  const organizationId = args.organizationId ?? auth.organizationId;
  const userContext = await getUserContext(ctx, auth.userId, organizationId);
  const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";
  if (!isSuperAdmin) {
    const canManageOrganization = await checkPermission(
      ctx,
      auth.userId,
      "manage_organization",
      organizationId,
    );
    if (!canManageOrganization) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Agent Store requires manage_organization permission.",
      });
    }
  }

  return {
    userId: auth.userId,
    organizationId,
    isSuperAdmin,
  };
}

async function loadConnectedIntegrationKeys(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
): Promise<Set<string>> {
  const dbAny = ctx.db as any;
  const connected = new Set<string>();

  const oauthRows = (await dbAny
    .query("oauthConnections")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", organizationId))
    .collect()) as OAuthConnectionRow[];

  for (const row of oauthRows) {
    if (normalizeToken(row.status) !== "active") {
      continue;
    }
    const key = normalizeIntegrationKey(row.provider);
    if (key) {
      connected.add(key);
    }
  }

  const org = (await dbAny.get(organizationId)) as OrganizationRow | null;
  for (const provider of org?.paymentProviders ?? []) {
    if (normalizeToken(provider.status ?? "") !== "active") {
      continue;
    }
    const key = normalizeIntegrationKey(provider.providerCode ?? "");
    if (key) {
      connected.add(key);
    }
  }

  return connected;
}

async function loadCatalogRows(ctx: QueryCtx, datasetVersion: string) {
  const dbAny = ctx.db as any;
  const [entries, toolRows, seedRows, candidates] = await Promise.all([
    (dbAny
      .query("agentCatalogEntries")
      .withIndex("by_dataset_agent", (q: any) => q.eq("datasetVersion", datasetVersion))
      .collect()) as Promise<CatalogEntryRow[]>,
    (dbAny
      .query("agentCatalogToolRequirements")
      .withIndex("by_dataset_agent", (q: any) => q.eq("datasetVersion", datasetVersion))
      .collect()) as Promise<ToolRequirementRow[]>,
    (dbAny
      .query("agentCatalogSeedRegistry")
      .withIndex("by_dataset_agent", (q: any) => q.eq("datasetVersion", datasetVersion))
      .collect()) as Promise<SeedRegistryRow[]>,
    loadMidwifeSeededProfileCandidatesFromDb({ db: dbAny, datasetVersion }),
  ]);

  const entryByAgentNumber = new Map<number, CatalogEntryRow>();
  const toolsByAgentNumber = new Map<number, ToolRequirementRow[]>();
  const seedByAgentNumber = new Map<number, SeedRegistryRow>();
  const candidateByAgentNumber = new Map<number, MidwifeSeededProfileCandidate>();

  for (const entry of entries) {
    entryByAgentNumber.set(entry.catalogAgentNumber, entry);
  }

  for (const toolRow of toolRows) {
    const bucket = toolsByAgentNumber.get(toolRow.catalogAgentNumber) ?? [];
    bucket.push(toolRow);
    toolsByAgentNumber.set(toolRow.catalogAgentNumber, bucket);
  }

  for (const seedRow of seedRows) {
    seedByAgentNumber.set(seedRow.catalogAgentNumber, seedRow);
  }

  for (const candidate of candidates) {
    candidateByAgentNumber.set(candidate.catalogAgentNumber, candidate);
  }

  return {
    entries,
    entryByAgentNumber,
    toolsByAgentNumber,
    seedByAgentNumber,
    candidateByAgentNumber,
  };
}

function resolveStoreCards(args: {
  entries: CatalogEntryRow[];
  toolsByAgentNumber: Map<number, ToolRequirementRow[]>;
  seedByAgentNumber: Map<number, SeedRegistryRow>;
  candidateByAgentNumber: Map<number, MidwifeSeededProfileCandidate>;
  connectedIntegrationKeys: Set<string>;
}): StoreCard[] {
  return args.entries.map((entry) =>
    resolveStoreCard({
      entry,
      toolRows: args.toolsByAgentNumber.get(entry.catalogAgentNumber) ?? [],
      seedRow: args.seedByAgentNumber.get(entry.catalogAgentNumber) ?? null,
      candidate: args.candidateByAgentNumber.get(entry.catalogAgentNumber),
      connectedIntegrationKeys: args.connectedIntegrationKeys,
    }),
  );
}

function buildCompatibilityDisabledCapabilitySnapshot(flagKey: string): CapabilitySnapshot {
  return {
    availableNow: [],
    blocked: [
      {
        capabilityId: "agent_store_compatibility_disabled",
        label: "Legacy Agent Store compatibility endpoints are disabled by default.",
        blockerType: "runtime_planned",
        blockerKey: flagKey,
      },
    ],
  };
}

function buildCompatibilityDisabledCard(catalogAgentNumber: number): StoreCard {
  return {
    cardId: `agent:${catalogAgentNumber}`,
    agentId: String(catalogAgentNumber),
    catalogAgentNumber,
    published: false,
    displayName: "Agent Catalog compatibility is disabled",
    verticalCategory: "core",
    tier: "foundation",
    abilityTags: [],
    toolTags: [],
    frameworkTags: [],
    integrationTags: [],
    strengthTags: [],
    weaknessTags: ["compatibility_flag_disabled"],
    supportedAccessModes: ["invisible"],
    channelAffinity: ["webchat"],
    autonomyDefault: "supervised",
    runtimeAvailability: "planned",
    avatarSlot: {
      slotId: `agent:${catalogAgentNumber}`,
      fallbackAssetKey: "agent-placeholder",
      artStyle: "badge",
      theme: "core",
    },
    capabilitySnapshotPreview: {
      availableNowCount: 0,
      blockedCount: 1,
    },
    recommendationMetadata: normalizeDefaultRecommendationMetadata({
      metadata: undefined,
      fallbackActivationState: "blocked",
      fallbackRankHint: 0,
      fallbackGapPenaltyMultiplier: 1,
    }),
    templateAvailability: {
      hasTemplate: false,
      seedCoverage: "missing",
      requiresSoulBuild: true,
    },
  };
}

export const listCatalogCards = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    datasetVersion: v.optional(v.string()),
    filters: v.optional(
      v.object({
        category: v.optional(categoryValidator),
        tier: v.optional(v.string()),
        toolProfile: v.optional(v.string()),
        accessMode: v.optional(accessModeValidator),
        onlyReadyNow: v.optional(v.boolean()),
        search: v.optional(v.string()),
      }),
    ),
    sort: v.optional(sortValidator),
    pagination: v.optional(
      v.object({
        cursor: v.optional(v.string()),
        limit: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const access = await requireStoreAccess(ctx, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
    });
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const compatibilityDecision = resolveStoreCompatibilityDecision();
    const compatibility = buildStoreCompatibilityPayload(compatibilityDecision);
    if (!compatibilityDecision.enabled) {
      return {
        datasetVersion,
        organizationId: access.organizationId,
        total: 0,
        cursor: "0",
        nextCursor: null,
        cards: [],
        noFitEscalation: NO_FIT_CONCIERGE_TERMS,
        compatibility,
      };
    }

    const connectedIntegrations = await loadConnectedIntegrationKeys(ctx, access.organizationId);
    const { entries, toolsByAgentNumber, seedByAgentNumber, candidateByAgentNumber } =
      await loadCatalogRows(ctx, datasetVersion);
    const publishedEntries = entries.filter((entry) => isPublishedCatalogEntry(entry));

    const cards = resolveStoreCards({
      entries: publishedEntries,
      toolsByAgentNumber,
      seedByAgentNumber,
      candidateByAgentNumber,
      connectedIntegrationKeys: connectedIntegrations,
    });

    const searchTokens = parseSearchTokens(args.filters?.search || "");
    const filtered = cards.filter((card) => {
      if (
        args.filters?.category &&
        normalizeToken(card.verticalCategory) !== normalizeToken(args.filters.category)
      ) {
        return false;
      }

      if (
        args.filters?.tier &&
        normalizeToken(card.tier) !== normalizeToken(args.filters.tier)
      ) {
        return false;
      }

      if (args.filters?.toolProfile) {
        const normalizedProfileTag = `profile_${normalizeToken(args.filters.toolProfile)}`;
        if (!card.frameworkTags.includes(normalizedProfileTag)) {
          return false;
        }
      }

      if (
        args.filters?.accessMode &&
        !card.supportedAccessModes.includes(normalizeToken(args.filters.accessMode))
      ) {
        return false;
      }

      if (args.filters?.onlyReadyNow) {
        if (
          card.runtimeAvailability !== "available_now" ||
          card.capabilitySnapshotPreview.blockedCount > 0
        ) {
          return false;
        }
      }

      if (searchTokens.length > 0) {
        const haystack = buildStoreSearchHaystack(card);
        if (!searchTokens.every((token) => haystack.includes(token))) {
          return false;
        }
      }

      return true;
    });

    const sorted = sortStoreCards(filtered, args.sort ?? "recommended");
    const requestedLimit = args.pagination?.limit ?? DEFAULT_PAGE_SIZE;
    const limit = Math.max(1, Math.min(MAX_PAGE_SIZE, requestedLimit));
    const offsetRaw = Number.parseInt(args.pagination?.cursor || "0", 10);
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;
    const page = sorted.slice(offset, offset + limit);
    const nextOffset = offset + limit;

    return {
      datasetVersion,
      organizationId: access.organizationId,
      total: sorted.length,
      cursor: String(offset),
      nextCursor: nextOffset < sorted.length ? String(nextOffset) : null,
      cards: page,
      noFitEscalation: NO_FIT_CONCIERGE_TERMS,
      compatibility,
    };
  },
});

export const compareCatalogCards = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    datasetVersion: v.optional(v.string()),
    catalogAgentNumbers: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const access = await requireStoreAccess(ctx, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
    });
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const compatibilityDecision = resolveStoreCompatibilityDecision();
    const compatibility = buildStoreCompatibilityPayload(compatibilityDecision);
    if (!compatibilityDecision.enabled) {
      const requested = Array.from(
        new Set(args.catalogAgentNumbers.map((value) => Math.floor(value))),
      ).sort((a, b) => a - b);
      if (requested.length < 2) {
        throw new ConvexError({
          code: "INVALID_ARGUMENT",
          message: "Provide at least two valid catalog agent numbers for comparison.",
        });
      }

      const cards = requested.map((catalogAgentNumber) =>
        buildCompatibilityDisabledCard(catalogAgentNumber),
      );

      return {
        datasetVersion,
        cards,
        comparison: {
          sharedAbilityTags: [],
          sharedToolTags: [],
          sharedFrameworkTags: [],
          missingIntegrationsByCard: cards.map((card) => ({
            catalogAgentNumber: card.catalogAgentNumber,
            missingIntegrations: [],
          })),
        },
        noFitEscalation: NO_FIT_CONCIERGE_TERMS,
        compatibility,
      };
    }

    const connectedIntegrations = await loadConnectedIntegrationKeys(ctx, access.organizationId);
    const { entries, toolsByAgentNumber, seedByAgentNumber, candidateByAgentNumber } =
      await loadCatalogRows(ctx, datasetVersion);
    const publishedEntries = entries.filter((entry) => isPublishedCatalogEntry(entry));
    const cards = resolveStoreCards({
      entries: publishedEntries,
      toolsByAgentNumber,
      seedByAgentNumber,
      candidateByAgentNumber,
      connectedIntegrationKeys: connectedIntegrations,
    });

    const requested = new Set(args.catalogAgentNumbers.map((n) => Math.floor(n)));
    const selectedCards = cards
      .filter((card) => requested.has(card.catalogAgentNumber))
      .sort((a, b) => a.catalogAgentNumber - b.catalogAgentNumber);

    if (selectedCards.length < 2) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "Provide at least two valid catalog agent numbers for comparison.",
      });
    }

    const sharedAbilityTags = selectedCards
      .map((card) => new Set(card.abilityTags))
      .reduce((acc, set) => new Set([...acc].filter((tag) => set.has(tag))));
    const sharedToolTags = selectedCards
      .map((card) => new Set(card.toolTags.map((tag) => tag.key)))
      .reduce((acc, set) => new Set([...acc].filter((tag) => set.has(tag))));
    const sharedFrameworkTags = selectedCards
      .map((card) => new Set(card.frameworkTags))
      .reduce((acc, set) => new Set([...acc].filter((tag) => set.has(tag))));

    const missingIntegrationsByCard = selectedCards.map((card) => ({
      catalogAgentNumber: card.catalogAgentNumber,
      missingIntegrations: card.integrationTags
        .filter((integration) => integration.status === "blocked")
        .map((integration) => integration.key),
    }));

    return {
      datasetVersion,
      cards: selectedCards,
      comparison: {
        sharedAbilityTags: Array.from(sharedAbilityTags).sort((a, b) => a.localeCompare(b)),
        sharedToolTags: Array.from(sharedToolTags).sort((a, b) => a.localeCompare(b)),
        sharedFrameworkTags: Array.from(sharedFrameworkTags).sort((a, b) => a.localeCompare(b)),
        missingIntegrationsByCard,
      },
      noFitEscalation: NO_FIT_CONCIERGE_TERMS,
      compatibility,
    };
  },
});

export const getCatalogAgentProductContext = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    datasetVersion: v.optional(v.string()),
    catalogAgentNumber: v.number(),
    requestedAccessMode: v.optional(accessModeValidator),
    requestedChannel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await requireStoreAccess(ctx, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
    });
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const compatibilityDecision = resolveStoreCompatibilityDecision();
    const compatibility = buildStoreCompatibilityPayload(compatibilityDecision);
    if (!compatibilityDecision.enabled) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Agent catalog compatibility endpoints are disabled.",
      });
    }

    const connectedIntegrations = await loadConnectedIntegrationKeys(ctx, access.organizationId);
    const {
      entryByAgentNumber,
      toolsByAgentNumber,
      seedByAgentNumber,
      candidateByAgentNumber,
    } = await loadCatalogRows(ctx, datasetVersion);
    const catalogAgentNumber = Math.floor(args.catalogAgentNumber);
    const entry = entryByAgentNumber.get(catalogAgentNumber);

    if (!entry || !isPublishedCatalogEntry(entry)) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: `Published catalog entry ${catalogAgentNumber} not found for dataset '${datasetVersion}'.`,
      });
    }

    const toolRows = toolsByAgentNumber.get(catalogAgentNumber) ?? [];
    const requiredTools = toolRows.filter((row) => row.requirementLevel === "required");
    const requiredScope = deriveRequiredSpecialistScopeContract({
      entry,
      requiredTools,
    });
    const seedRow = seedByAgentNumber.get(catalogAgentNumber) ?? null;
    const candidate = candidateByAgentNumber.get(catalogAgentNumber);
    const card = resolveStoreCard({
      entry,
      toolRows,
      seedRow,
      candidate,
      connectedIntegrationKeys: connectedIntegrations,
    });
    const capabilitySnapshot = deriveCapabilitySnapshot({
      entry,
      intentTags: deriveIntentTags(entry),
      requiredTools,
      connectedIntegrationKeys: connectedIntegrations,
      requestedAccessMode: args.requestedAccessMode,
      requestedChannel: args.requestedChannel,
    });

    return {
      datasetVersion,
      organizationId: access.organizationId,
      catalogAgentNumber,
      published: card.published,
      card,
      productPage: {
        entry: {
          name: entry.name,
          category: normalizeToken(entry.category),
          tier: entry.tier,
          subtype: normalizeToken(entry.subtype),
          toolProfile: normalizeToken(entry.toolProfile),
          runtimeStatus: normalizeToken(entry.runtimeStatus),
          catalogStatus: normalizeToken(entry.catalogStatus || "done"),
          published: card.published,
          autonomyDefault: normalizeToken(entry.autonomyDefault),
        },
        requirements: {
          requiredIntegrations: normalizeTokenArray(entry.requiredIntegrations ?? []),
          requiredTools: requiredScope.requiredTools,
          requiredCapabilities: requiredScope.requiredCapabilities,
          supportedAccessModes: card.supportedAccessModes,
          channelAffinity: card.channelAffinity,
        },
        capabilitySnapshot,
        tools: [...toolRows]
          .sort((a, b) => {
            const rank: Record<string, number> = {
              required: 0,
              recommended: 1,
              optional: 2,
            };
            const levelDiff = (rank[a.requirementLevel] ?? 9) - (rank[b.requirementLevel] ?? 9);
            if (levelDiff !== 0) {
              return levelDiff;
            }
            return a.toolName.localeCompare(b.toolName);
          })
          .map((row) => ({
            toolName: normalizeToken(row.toolName),
            requirementLevel: row.requirementLevel,
            implementationStatus: row.implementationStatus,
            source: row.source,
            integrationDependency: normalizeOptionalString(row.integrationDependency),
          })),
        template: card.templateAvailability,
      },
      askAiContextPayload: buildAskAiCatalogContextPayload({
        card,
        entry,
        requiredTools: requiredScope.requiredTools,
        requiredCapabilities: requiredScope.requiredCapabilities,
        capabilitySnapshot,
      }),
      noFitEscalation: NO_FIT_CONCIERGE_TERMS,
      compatibility,
    };
  },
});

export const getClonePreflight = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    datasetVersion: v.optional(v.string()),
    catalogAgentNumber: v.number(),
    ownerUserId: v.optional(v.id("users")),
    requestedAccessMode: v.optional(accessModeValidator),
    requestedChannel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await requireStoreAccess(ctx, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
    });
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const ownerUserId = args.ownerUserId ?? access.userId;
    const compatibilityDecision = resolveStoreCompatibilityDecision();
    const compatibility = buildStoreCompatibilityPayload(compatibilityDecision);
    const catalogAgentNumber = Math.floor(args.catalogAgentNumber);
    if (!compatibilityDecision.enabled) {
      return {
        datasetVersion,
        organizationId: access.organizationId,
        ownerUserId,
        catalogAgentNumber,
        card: buildCompatibilityDisabledCard(catalogAgentNumber),
        template: {
          templateAgentId: undefined,
          hasTemplate: false,
          protectedTemplate: false,
          templateName: null,
          templateRole: null,
        },
        capabilitySnapshot: buildCompatibilityDisabledCapabilitySnapshot(compatibility.flagKey),
        requiredTools: [],
        requiredCapabilities: [],
        quota: {
          orgUsed: 0,
          templateUsed: 0,
          ownerUsed: 0,
          limits: {
            spawnEnabled: false,
            maxClonesPerOrg: 0,
            maxClonesPerTemplatePerOrg: 0,
            maxClonesPerOwner: 0,
            allowedPlaybooks: null,
          },
          exceeded: {
            orgLimit: false,
            templateLimit: false,
            ownerLimit: false,
          },
        },
        allowClone: false,
        directCreateAllowed: false,
        noFitEscalation: NO_FIT_CONCIERGE_TERMS,
        compatibility,
      };
    }

    const dbAny = ctx.db as any;

    const ownerMembershipRows = (await dbAny
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q: any) =>
        q.eq("userId", ownerUserId).eq("organizationId", access.organizationId),
      )
      .collect()) as OrganizationMemberRow[];
    const ownerIsActive = ownerMembershipRows.some((row) => row.isActive);
    if (!ownerIsActive && !access.isSuperAdmin) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "Clone owner must be an active organization member.",
      });
    }

    const connectedIntegrations = await loadConnectedIntegrationKeys(ctx, access.organizationId);
    const {
      entryByAgentNumber,
      toolsByAgentNumber,
      seedByAgentNumber,
      candidateByAgentNumber,
    } = await loadCatalogRows(ctx, datasetVersion);

    const entry = entryByAgentNumber.get(catalogAgentNumber);
    if (!entry || !isPublishedCatalogEntry(entry)) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: `Published catalog entry ${catalogAgentNumber} not found for dataset '${datasetVersion}'.`,
      });
    }

    const toolRows = toolsByAgentNumber.get(catalogAgentNumber) ?? [];
    const requiredTools = toolRows.filter((row) => row.requirementLevel === "required");
    const requiredScopeContract = deriveRequiredSpecialistScopeContract({
      entry,
      requiredTools,
    });
    const seedRow = seedByAgentNumber.get(catalogAgentNumber) ?? null;
    const candidate = candidateByAgentNumber.get(catalogAgentNumber);
    const intentTags = deriveIntentTags(entry);

    const templateAvailability = getTemplateAvailability({
      seedRow,
      candidate,
    });

    let templateAgent: ObjectRow | null = null;
    if (templateAvailability.templateAgentId) {
      templateAgent = (await dbAny.get(templateAvailability.templateAgentId)) as ObjectRow | null;
    }

    const templateIsProtected =
      templateAgent?.type === "org_agent" &&
      templateAgent?.status === "template" &&
      asRecord(templateAgent.customProperties).protected === true;

    let includeQuotaBlock = false;
    let quotaBlockReason: string | undefined;
    let quota = {
      orgUsed: 0,
      templateUsed: 0,
      ownerUsed: 0,
      limits: {
        spawnEnabled: false,
        maxClonesPerOrg: 0,
        maxClonesPerTemplatePerOrg: 0,
        maxClonesPerOwner: 0,
        allowedPlaybooks: null as string[] | null,
      },
      exceeded: {
        orgLimit: false,
        templateLimit: false,
        ownerLimit: false,
      },
    };

    if (!templateIsProtected) {
      includeQuotaBlock = true;
      quotaBlockReason = "template_unavailable";
    } else if (templateAgent) {
      const clonePolicy = resolveTemplateClonePolicy(
        asRecord(templateAgent.customProperties),
      );
      const orgAgents = (await dbAny
        .query("objects")
        .withIndex("by_org_type", (q: any) =>
          q.eq("organizationId", access.organizationId).eq("type", "org_agent"),
        )
        .collect()) as ObjectRow[];

      const managedClones = orgAgents.filter((agent) => {
        const props = asRecord(agent.customProperties);
        return (
          (agent.status === "active" || agent.status === "draft") &&
          normalizeOptionalString(props.templateAgentId) !== null &&
          normalizeOptionalString(props.cloneLifecycle) === MANAGED_USE_CASE_CLONE_LIFECYCLE
        );
      });
      const templateClones = managedClones.filter((agent) => {
        const props = asRecord(agent.customProperties);
        return normalizeOptionalString(props.templateAgentId) === String(templateAgent?._id);
      });
      const ownerClones = managedClones.filter((agent) => {
        const props = asRecord(agent.customProperties);
        return normalizeOptionalString(props.ownerUserId) === String(ownerUserId);
      });

      const orgLimitExceeded =
        clonePolicy.maxClonesPerOrg !== -1 && managedClones.length >= clonePolicy.maxClonesPerOrg;
      const templateLimitExceeded =
        clonePolicy.maxClonesPerTemplatePerOrg !== -1 &&
        templateClones.length >= clonePolicy.maxClonesPerTemplatePerOrg;
      const ownerLimitExceeded =
        clonePolicy.maxClonesPerOwner !== -1 &&
        ownerClones.length >= clonePolicy.maxClonesPerOwner;

      quota = {
        orgUsed: managedClones.length,
        templateUsed: templateClones.length,
        ownerUsed: ownerClones.length,
        limits: clonePolicy,
        exceeded: {
          orgLimit: orgLimitExceeded,
          templateLimit: templateLimitExceeded,
          ownerLimit: ownerLimitExceeded,
        },
      };

      if (
        !clonePolicy.spawnEnabled ||
        orgLimitExceeded ||
        templateLimitExceeded ||
        ownerLimitExceeded
      ) {
        includeQuotaBlock = true;
        quotaBlockReason = !clonePolicy.spawnEnabled
          ? "clone_policy_disabled"
          : "clone_quota_exceeded";
      }
    }

    const capabilitySnapshot = deriveCapabilitySnapshot({
      entry,
      intentTags,
      requiredTools,
      connectedIntegrationKeys: connectedIntegrations,
      requestedAccessMode: args.requestedAccessMode,
      requestedChannel: args.requestedChannel,
      includeQuotaBlock,
      quotaBlockReason,
    });

    return {
      datasetVersion,
      organizationId: access.organizationId,
      ownerUserId,
      catalogAgentNumber,
      card: resolveStoreCard({
        entry,
        toolRows,
        seedRow,
        candidate,
        connectedIntegrationKeys: connectedIntegrations,
      }),
      template: {
        templateAgentId: templateAvailability.templateAgentId,
        hasTemplate: templateAvailability.hasTemplate,
        protectedTemplate: templateIsProtected,
        templateName: templateAgent?.name ?? null,
        templateRole: normalizeOptionalString(
          asRecord(templateAgent?.customProperties).templateRole,
        ),
        actionCompletionContract: resolveActionCompletionContractSummary(
          asRecord(templateAgent?.customProperties).actionCompletionContract
        ),
      },
      capabilitySnapshot,
      requiredTools: requiredScopeContract.requiredTools,
      requiredCapabilities: requiredScopeContract.requiredCapabilities,
      quota,
      allowClone: capabilitySnapshot.blocked.length === 0,
      directCreateAllowed: false,
      noFitEscalation: NO_FIT_CONCIERGE_TERMS,
      compatibility,
    };
  },
});
