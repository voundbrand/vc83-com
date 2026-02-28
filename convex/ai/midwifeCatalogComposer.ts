/**
 * MIDWIFE CATALOG COMPOSER
 *
 * Hybrid composition for birthing:
 * - Interview anchors remain source of truth for immutable identity.
 * - Seeded catalog/tool/soul profiles can contribute bounded overlays.
 * - Every selected/generated input is provenance-stamped.
 */

import {
  deriveDefaultIntentTags as deriveCatalogDefaultIntentTags,
  deriveDefaultKeywordAliases as deriveCatalogDefaultKeywordAliases,
  normalizeDefaultRecommendationMetadata,
  resolveAgentRecommendations,
  type AgentRecommendationActivationState,
  type AgentRecommendationCandidate,
  type AgentRecommendationMetadata,
} from "./agentRecommendationResolver";

export const MIDWIFE_HYBRID_COMPOSITION_CONTRACT_VERSION =
  "midwife_hybrid_composition.v1" as const;

const DEFAULT_AGP_DATASET_VERSION = "agp_v1";
const DEFAULT_MAX_SELECTED_PROFILES = 3;
const MAX_ARRAY_OVERLAY_ITEMS = 12;

const MIDWIFE_MUTABLE_OVERLAY_ARRAY_KEYS = new Set([
  "alwaysDo",
  "enabledTools",
  "knowledgeBaseTags",
]);

const MIDWIFE_MUTABLE_OVERLAY_STRING_KEYS = new Set([
  "communicationStyle",
  "toneGuidelines",
  "greetingStyle",
  "closingStyle",
  "emojiUsage",
]);

const MIDWIFE_IMMUTABLE_IDENTITY_KEYS = new Set([
  "name",
  "tagline",
  "traits",
  "coreValues",
  "neverDo",
  "escalationTriggers",
  "coreMemories",
]);

const MIDWIFE_INTERVIEW_FALLBACK_ALWAYS_DO_CAP = 6;

export type MidwifeSeedCoverage = "full" | "skeleton" | "missing";

export type MidwifeCompositionInputType =
  | "interview_identity_anchor"
  | "catalog_profile"
  | "tool_profile"
  | "soul_profile"
  | "generated_fallback_overlay";

export interface MidwifeCatalogEntryRecord {
  _id: string;
  datasetVersion: string;
  catalogAgentNumber: number;
  name: string;
  category?: string;
  subtype?: string;
  tier?: string;
  soulBlend?: string;
  toolProfile?: string;
  seedStatus?: MidwifeSeedCoverage;
  requiredIntegrations?: string[];
  specialistAccessModes?: string[];
  runtimeStatus?: string;
  intentTags?: string[];
  keywordAliases?: string[];
  recommendationMetadata?: AgentRecommendationMetadata;
}

export interface MidwifeSeedRegistryRecord {
  _id: string;
  datasetVersion: string;
  catalogAgentNumber: number;
  seedCoverage: MidwifeSeedCoverage;
  requiresSoulBuild: boolean;
  requiresSoulBuildReason?: string;
  systemTemplateAgentId?: string;
  templateRole?: string;
  protectedTemplate?: boolean;
}

export interface MidwifeToolRequirementRecord {
  _id: string;
  datasetVersion: string;
  catalogAgentNumber: number;
  toolName: string;
  requirementLevel: "required" | "recommended" | "optional";
  source?: "registry" | "interview_tools" | "proposed_new";
  implementationStatus?: "implemented" | "missing";
}

type MidwifeRequiredToolContract = {
  toolName: string;
  implementationStatus: "implemented" | "missing";
  source: "registry" | "interview_tools" | "proposed_new";
};

export interface MidwifeTemplateAgentRecord {
  _id: string;
  customProperties?: Record<string, unknown>;
}

export interface MidwifeSeededProfileCandidate {
  datasetVersion: string;
  catalogAgentNumber: number;
  name: string;
  category?: string;
  subtype?: string;
  tier?: string;
  toolProfile?: string;
  soulBlend?: string;
  seedCoverage: MidwifeSeedCoverage;
  requiresSoulBuild: boolean;
  requiresSoulBuildReason?: string;
  templateRole?: string;
  templateAgentId?: string;
  protectedTemplate: boolean;
  requiredTools: string[];
  requiredToolContracts?: MidwifeRequiredToolContract[];
  requiredIntegrations?: string[];
  specialistAccessModes?: string[];
  runtimeStatus?: string;
  intentTags?: string[];
  keywordAliases?: string[];
  recommendationMetadata?: AgentRecommendationMetadata;
  soulProfile?: Record<string, unknown>;
  executionOverlay?: Record<string, unknown>;
}

export interface MidwifeRankedSeededProfileCandidate
  extends MidwifeSeededProfileCandidate {
  rank: number;
  rankScore: number;
  rankSignals: string[];
}

export interface MidwifeHybridCompositionInputProvenance {
  inputType: MidwifeCompositionInputType;
  sourceId: string;
  sourceLabel: string;
  selected: boolean;
  rank?: number;
  rankScore?: number;
  seedCoverage?: MidwifeSeedCoverage;
  signals: string[];
}

export interface MidwifeHybridCompositionProvenanceContract {
  contractVersion: typeof MIDWIFE_HYBRID_COMPOSITION_CONTRACT_VERSION;
  strategy: "interview_core_seed_overlay";
  composedAt: number;
  fallbackApplied: boolean;
  immutableAnchorFieldIds: string[];
  selectedCatalogAgentNumbers: number[];
  missingCoverageAreas: string[];
  inputCount: number;
  selectedInputCount: number;
  inputs: MidwifeHybridCompositionInputProvenance[];
}

export interface MidwifeHybridCompositionResult {
  boundedOverlay: Record<string, unknown>;
  rankedCandidates: MidwifeRankedSeededProfileCandidate[];
  selectedCandidates: MidwifeRankedSeededProfileCandidate[];
  provenance: MidwifeHybridCompositionProvenanceContract;
}

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((entry) => toNonEmptyString(entry))
    .filter((entry): entry is string => Boolean(entry));
  if (normalized.length === 0) {
    return undefined;
  }
  return Array.from(new Set(normalized));
}

function uniqueBoundedStringArray(
  values: string[],
  maxItems = MAX_ARRAY_OVERLAY_ITEMS,
): string[] {
  const unique = Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
  return unique.slice(0, maxItems);
}

function toPlainRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function buildInterviewQueryText(extractedData: Record<string, unknown>): string {
  const fragments: string[] = [];
  for (const [key, value] of Object.entries(extractedData)) {
    fragments.push(key);
    if (typeof value === "string") {
      fragments.push(value);
    } else if (Array.isArray(value)) {
      fragments.push(...value.map((entry) => String(entry)));
    } else if (value && typeof value === "object") {
      fragments.push(JSON.stringify(value));
    } else if (value !== undefined && value !== null) {
      fragments.push(String(value));
    }
  }
  return fragments.join(" ");
}

function deriveExecutionOverlayFromTemplate(
  templateAgent: MidwifeTemplateAgentRecord | undefined,
): Record<string, unknown> | undefined {
  if (!templateAgent) {
    return undefined;
  }

  const props = toPlainRecord(templateAgent.customProperties);
  if (!props) {
    return undefined;
  }

  const soul = toPlainRecord(props.soul);
  const overlay: Record<string, unknown> = {};

  const alwaysDo =
    normalizeStringArray(soul?.alwaysDo)
    ?? normalizeStringArray(props.alwaysDo);
  if (alwaysDo?.length) overlay.alwaysDo = alwaysDo;

  const enabledTools = normalizeStringArray(props.enabledTools);
  if (enabledTools?.length) overlay.enabledTools = enabledTools;

  const knowledgeBaseTags = normalizeStringArray(props.knowledgeBaseTags);
  if (knowledgeBaseTags?.length) overlay.knowledgeBaseTags = knowledgeBaseTags;

  const communicationStyle =
    toNonEmptyString(soul?.communicationStyle)
    ?? toNonEmptyString(props.personality);
  if (communicationStyle) overlay.communicationStyle = communicationStyle;

  const toneGuidelines =
    toNonEmptyString(soul?.toneGuidelines)
    ?? toNonEmptyString(props.brandVoiceInstructions);
  if (toneGuidelines) overlay.toneGuidelines = toneGuidelines;

  const greetingStyle = toNonEmptyString(soul?.greetingStyle);
  if (greetingStyle) overlay.greetingStyle = greetingStyle;

  const closingStyle = toNonEmptyString(soul?.closingStyle);
  if (closingStyle) overlay.closingStyle = closingStyle;

  const emojiUsage = toNonEmptyString(soul?.emojiUsage);
  if (emojiUsage) overlay.emojiUsage = emojiUsage;

  return Object.keys(overlay).length > 0 ? overlay : undefined;
}

function coverageWeight(seedCoverage: MidwifeSeedCoverage): number {
  if (seedCoverage === "full") return 45;
  if (seedCoverage === "skeleton") return 24;
  return -28;
}

function deriveMidwifeRankHint(candidate: MidwifeSeededProfileCandidate): number {
  const tier = (candidate.tier || "").toLowerCase();
  if (tier.includes("sovereign")) return 0.08;
  if (tier.includes("dream team")) return 0.05;
  if (tier.includes("foundation")) return 0.02;
  return 0;
}

function deriveMidwifeGapPenaltyMultiplier(candidate: MidwifeSeededProfileCandidate): number {
  let multiplier = 1;
  if (resolveCandidateRuntimeStatus(candidate) !== "live") {
    multiplier += 0.15;
  }
  if (candidate.seedCoverage !== "full") {
    multiplier += 0.1;
  }
  if (candidate.requiresSoulBuild) {
    multiplier += 0.2;
  }
  return Number(multiplier.toFixed(2));
}

function deriveMidwifeFallbackActivationState(
  candidate: MidwifeSeededProfileCandidate,
): AgentRecommendationActivationState {
  if (resolveCandidateRuntimeStatus(candidate) !== "live") {
    return "planned_only";
  }
  if (candidate.requiresSoulBuild || candidate.seedCoverage !== "full") {
    return "needs_setup";
  }
  return "suggest_activation";
}

function resolveCandidateRuntimeStatus(candidate: MidwifeSeededProfileCandidate): string {
  const explicit = toNonEmptyString(candidate.runtimeStatus);
  if (explicit) {
    return explicit;
  }
  return candidate.seedCoverage === "full" && !candidate.requiresSoulBuild
    ? "live"
    : "template_only";
}

function resolveCandidateIntentTags(candidate: MidwifeSeededProfileCandidate): string[] {
  const stored = normalizeStringArray(candidate.intentTags);
  if (stored && stored.length > 0) {
    return stored;
  }
  return deriveCatalogDefaultIntentTags({
    category: candidate.category,
    subtype: candidate.subtype,
    toolProfile: candidate.toolProfile,
  });
}

function resolveCandidateKeywordAliases(
  candidate: MidwifeSeededProfileCandidate,
  intentTags: string[],
): string[] {
  const stored = normalizeStringArray(candidate.keywordAliases);
  if (stored && stored.length > 0) {
    return stored;
  }
  return deriveCatalogDefaultKeywordAliases({
    name: candidate.name,
    category: candidate.category,
    subtype: candidate.subtype,
    toolProfile: candidate.toolProfile,
    tier: candidate.tier,
    intentTags,
  });
}

function resolveCandidateMetadata(
  candidate: MidwifeSeededProfileCandidate,
): AgentRecommendationMetadata {
  return normalizeDefaultRecommendationMetadata({
    metadata: candidate.recommendationMetadata,
    fallbackActivationState: deriveMidwifeFallbackActivationState(candidate),
    fallbackRankHint: deriveMidwifeRankHint(candidate),
    fallbackGapPenaltyMultiplier: deriveMidwifeGapPenaltyMultiplier(candidate),
  });
}

function resolveCandidateToolContracts(
  candidate: MidwifeSeededProfileCandidate,
): MidwifeRequiredToolContract[] {
  if (candidate.requiredToolContracts && candidate.requiredToolContracts.length > 0) {
    return candidate.requiredToolContracts;
  }
  return candidate.requiredTools.map((toolName) => ({
    toolName,
    implementationStatus: "implemented",
    source: "registry",
  }));
}

function scoreCandidate(args: {
  candidate: MidwifeSeededProfileCandidate;
  recommendation?: AgentRecommendationCandidate;
}): { score: number; signals: string[] } {
  const recommendationScore = args.recommendation?.finalScore ?? 0;
  let score = coverageWeight(args.candidate.seedCoverage) + recommendationScore * 100;
  const signals: string[] = [
    `seed_coverage:${args.candidate.seedCoverage}`,
    `resolver_final_score:${recommendationScore.toFixed(4)}`,
  ];

  if (args.recommendation?.intentEvidence.matchedIntents.length) {
    signals.push(`resolver_intents:${args.recommendation.intentEvidence.matchedIntents.join(",")}`);
  }
  if (args.recommendation?.intentEvidence.matchedKeywords.length) {
    signals.push(`resolver_keywords:${args.recommendation.intentEvidence.matchedKeywords.join(",")}`);
  }
  if (args.recommendation?.gaps.runtime.length) {
    signals.push(`resolver_runtime_gaps:${args.recommendation.gaps.runtime.length}`);
  }
  if (args.recommendation?.gaps.integrations.length) {
    signals.push(`resolver_integration_gaps:${args.recommendation.gaps.integrations.length}`);
  }
  if (args.recommendation?.gaps.tools.length) {
    signals.push(`resolver_tool_gaps:${args.recommendation.gaps.tools.length}`);
  }
  if (args.recommendation?.gaps.accessMode.length) {
    signals.push(`resolver_access_gaps:${args.recommendation.gaps.accessMode.length}`);
  }

  if (!args.candidate.requiresSoulBuild) {
    score += 8;
    signals.push("seed_ready_for_use");
  } else {
    score -= 8;
    signals.push("seed_requires_soul_build");
  }

  if (args.candidate.requiredTools.length > 0) {
    score += Math.min(10, args.candidate.requiredTools.length * 2);
    signals.push(`required_tools:${args.candidate.requiredTools.length}`);
  } else {
    score -= 4;
    signals.push("required_tools:missing");
  }

  if (args.candidate.executionOverlay && Object.keys(args.candidate.executionOverlay).length > 0) {
    score += 7;
    signals.push("execution_overlay:available");
  } else {
    score -= 5;
    signals.push("execution_overlay:missing");
  }

  if (args.candidate.soulProfile) {
    score += 5;
    signals.push("soul_profile:available");
  } else {
    score -= 4;
    signals.push("soul_profile:missing");
  }

  if (args.candidate.protectedTemplate) {
    score += 2;
    signals.push("template:protected");
  }

  return { score, signals };
}

function buildFallbackOverlayFromInterview(
  extractedData: Record<string, unknown>,
): Record<string, unknown> {
  const pickString = (fieldIds: string[]): string | undefined => {
    for (const fieldId of fieldIds) {
      const value = toNonEmptyString(extractedData[fieldId]);
      if (value) {
        return value;
      }
    }
    return undefined;
  };

  const pickStringList = (fieldIds: string[]): string[] => {
    const values: string[] = [];
    for (const fieldId of fieldIds) {
      const value = extractedData[fieldId];
      if (typeof value === "string") {
        const normalized = toNonEmptyString(value);
        if (normalized) values.push(normalized);
      } else if (Array.isArray(value)) {
        for (const entry of value) {
          const normalized = toNonEmptyString(entry);
          if (normalized) values.push(normalized);
        }
      }
    }
    return uniqueBoundedStringArray(values, MIDWIFE_INTERVIEW_FALLBACK_ALWAYS_DO_CAP);
  };

  const fallback: Record<string, unknown> = {};

  const communicationStyle = pickString([
    "voiceSignature",
    "communicationStyle",
    "operatorPersona",
  ]);
  if (communicationStyle) fallback.communicationStyle = communicationStyle;

  const toneGuidelines = pickString([
    "brandVoice",
    "identityNorthStar",
    "teamNorthStar",
  ]);
  if (toneGuidelines) fallback.toneGuidelines = toneGuidelines;

  const alwaysDo = pickStringList([
    "nonNegotiableGuardrails",
    "approvalRequiredActions",
    "handoffSignals",
    "platformHandoffBoundaries",
  ]);
  if (alwaysDo.length > 0) fallback.alwaysDo = alwaysDo;

  return fallback;
}

function mergeBoundedOverlay(
  base: Record<string, unknown>,
  nextOverlay: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };

  for (const key of MIDWIFE_MUTABLE_OVERLAY_ARRAY_KEYS) {
    const nextValues = normalizeStringArray(nextOverlay[key]);
    if (!nextValues?.length) continue;
    const existingValues = normalizeStringArray(merged[key]) || [];
    merged[key] = uniqueBoundedStringArray([
      ...existingValues,
      ...nextValues,
    ]);
  }

  for (const key of MIDWIFE_MUTABLE_OVERLAY_STRING_KEYS) {
    const nextValue = toNonEmptyString(nextOverlay[key]);
    if (!nextValue) continue;
    if (!toNonEmptyString(merged[key])) {
      merged[key] = nextValue;
    }
  }

  return merged;
}

function normalizeSeedCoverage(value: unknown): MidwifeSeedCoverage {
  if (value === "full" || value === "skeleton" || value === "missing") {
    return value;
  }
  return "missing";
}

function buildExecutionOverlayFromCandidate(
  candidate: MidwifeSeededProfileCandidate,
): Record<string, unknown> {
  const overlay = toPlainRecord(candidate.executionOverlay) || {};
  const filtered: Record<string, unknown> = {};

  for (const key of MIDWIFE_MUTABLE_OVERLAY_ARRAY_KEYS) {
    const values = normalizeStringArray(overlay[key]);
    if (values?.length) {
      filtered[key] = uniqueBoundedStringArray(values);
    }
  }

  for (const key of MIDWIFE_MUTABLE_OVERLAY_STRING_KEYS) {
    const value = toNonEmptyString(overlay[key]);
    if (value) {
      filtered[key] = value;
    }
  }

  return filtered;
}

export function buildMidwifeSeededProfileCandidates(args: {
  catalogEntries: MidwifeCatalogEntryRecord[];
  seedRegistryRows: MidwifeSeedRegistryRecord[];
  toolRequirementRows: MidwifeToolRequirementRecord[];
  templateAgentsById: Record<string, MidwifeTemplateAgentRecord | undefined>;
}): MidwifeSeededProfileCandidate[] {
  const seedByAgentNumber = new Map<number, MidwifeSeedRegistryRecord>();
  for (const seedRow of args.seedRegistryRows) {
    seedByAgentNumber.set(seedRow.catalogAgentNumber, seedRow);
  }

  const requiredToolsByAgentNumber = new Map<number, string[]>();
  const requiredToolContractsByAgentNumber = new Map<number, MidwifeRequiredToolContract[]>();
  for (const row of args.toolRequirementRows) {
    if (row.requirementLevel !== "required") {
      continue;
    }
    const bucket = requiredToolsByAgentNumber.get(row.catalogAgentNumber) || [];
    bucket.push(row.toolName);
    requiredToolsByAgentNumber.set(
      row.catalogAgentNumber,
      uniqueBoundedStringArray(bucket, MAX_ARRAY_OVERLAY_ITEMS),
    );

    const contractBucket = requiredToolContractsByAgentNumber.get(row.catalogAgentNumber) || [];
    contractBucket.push({
      toolName: row.toolName,
      implementationStatus:
        row.implementationStatus === "implemented" ? "implemented" : "missing",
      source: row.source === "interview_tools" || row.source === "proposed_new"
        ? row.source
        : "registry",
    });

    const dedupedContracts = Array.from(
      new Map(contractBucket.map((contract) => [contract.toolName, contract])).values(),
    ).slice(0, MAX_ARRAY_OVERLAY_ITEMS);
    requiredToolContractsByAgentNumber.set(row.catalogAgentNumber, dedupedContracts);
  }

  return args.catalogEntries
    .map((entry) => {
      const seedRow = seedByAgentNumber.get(entry.catalogAgentNumber);
      const templateAgentId = toNonEmptyString(seedRow?.systemTemplateAgentId);
      const templateAgent = templateAgentId
        ? args.templateAgentsById[templateAgentId]
        : undefined;
      const templateCustomProps = toPlainRecord(templateAgent?.customProperties);
      const templateSoul = toPlainRecord(templateCustomProps?.soul);

      return {
        datasetVersion: entry.datasetVersion || seedRow?.datasetVersion || DEFAULT_AGP_DATASET_VERSION,
        catalogAgentNumber: entry.catalogAgentNumber,
        name: entry.name,
        category: toNonEmptyString(entry.category),
        subtype: toNonEmptyString(entry.subtype),
        tier: toNonEmptyString(entry.tier),
        toolProfile: toNonEmptyString(entry.toolProfile),
        soulBlend: toNonEmptyString(entry.soulBlend),
        seedCoverage: normalizeSeedCoverage(seedRow?.seedCoverage || entry.seedStatus),
        requiresSoulBuild:
          typeof seedRow?.requiresSoulBuild === "boolean"
            ? seedRow.requiresSoulBuild
            : false,
        requiresSoulBuildReason: toNonEmptyString(seedRow?.requiresSoulBuildReason),
        templateRole:
          toNonEmptyString(seedRow?.templateRole)
          || toNonEmptyString(templateCustomProps?.templateRole),
        templateAgentId,
        protectedTemplate:
          seedRow?.protectedTemplate === true
          || templateCustomProps?.protected === true,
        requiredTools:
          requiredToolsByAgentNumber.get(entry.catalogAgentNumber) || [],
        requiredToolContracts:
          requiredToolContractsByAgentNumber.get(entry.catalogAgentNumber) || [],
        requiredIntegrations: normalizeStringArray(entry.requiredIntegrations) || [],
        specialistAccessModes: normalizeStringArray(entry.specialistAccessModes) || ["invisible"],
        runtimeStatus:
          toNonEmptyString(entry.runtimeStatus)
          || (normalizeSeedCoverage(seedRow?.seedCoverage || entry.seedStatus) === "full"
            ? "live"
            : "template_only"),
        intentTags: normalizeStringArray(entry.intentTags),
        keywordAliases: normalizeStringArray(entry.keywordAliases),
        recommendationMetadata: entry.recommendationMetadata,
        soulProfile: templateSoul,
        executionOverlay: deriveExecutionOverlayFromTemplate(templateAgent),
      } satisfies MidwifeSeededProfileCandidate;
    })
    .sort((a, b) => a.catalogAgentNumber - b.catalogAgentNumber);
}

export function rankMidwifeSeededProfiles(args: {
  interviewExtractedData: Record<string, unknown>;
  candidates: MidwifeSeededProfileCandidate[];
}): MidwifeRankedSeededProfileCandidate[] {
  const resolverEntries = args.candidates.map((candidate) => {
    const runtimeStatus = resolveCandidateRuntimeStatus(candidate);
    const intentTags = resolveCandidateIntentTags(candidate);
    const keywordAliases = resolveCandidateKeywordAliases(candidate, intentTags);
    return {
      catalogAgentNumber: candidate.catalogAgentNumber,
      name: candidate.name,
      category: candidate.category,
      subtype: candidate.subtype,
      toolProfile: candidate.toolProfile,
      tier: candidate.tier,
      intentTags,
      keywordAliases,
      recommendationMetadata: resolveCandidateMetadata(candidate),
      requiredIntegrations: candidate.requiredIntegrations || [],
      specialistAccessModes: candidate.specialistAccessModes || ["invisible"],
      runtimeStatus,
      blockers: candidate.requiresSoulBuild && candidate.requiresSoulBuildReason
        ? [candidate.requiresSoulBuildReason]
        : [],
    };
  });

  const resolverToolRequirements = args.candidates.flatMap((candidate) =>
    resolveCandidateToolContracts(candidate).map((tool) => ({
      catalogAgentNumber: candidate.catalogAgentNumber,
      toolName: tool.toolName,
      requirementLevel: "required" as const,
      implementationStatus: tool.implementationStatus,
      source: tool.source,
    })),
  );

  const recommendationResolution = resolveAgentRecommendations({
    queryText: buildInterviewQueryText(args.interviewExtractedData),
    requestedAccessMode: "invisible",
    entries: resolverEntries,
    toolRequirements: resolverToolRequirements,
  });
  const recommendationByAgentNumber = new Map<number, AgentRecommendationCandidate>(
    recommendationResolution.recommendations.map((recommendation) => [
      recommendation.catalogAgentNumber,
      recommendation,
    ]),
  );

  const scored = args.candidates.map((candidate) => {
    const recommendation = recommendationByAgentNumber.get(candidate.catalogAgentNumber);
    const { score, signals } = scoreCandidate({ candidate, recommendation });
    return {
      ...candidate,
      rankScore: score,
      rankSignals: signals,
      rank: 0,
    };
  });

  scored.sort((left, right) => {
    if (right.rankScore !== left.rankScore) {
      return right.rankScore - left.rankScore;
    }
    if (left.seedCoverage !== right.seedCoverage) {
      const weight = { full: 0, skeleton: 1, missing: 2 } as const;
      return weight[left.seedCoverage] - weight[right.seedCoverage];
    }
    return left.catalogAgentNumber - right.catalogAgentNumber;
  });

  return scored.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
  }));
}

export function composeMidwifeHybridProfile(args: {
  interviewExtractedData: Record<string, unknown>;
  immutableAnchorFieldIds: string[];
  candidates: MidwifeSeededProfileCandidate[];
  composedAt: number;
  maxSelectedProfiles?: number;
}): MidwifeHybridCompositionResult {
  const rankedCandidates = rankMidwifeSeededProfiles({
    interviewExtractedData: args.interviewExtractedData,
    candidates: args.candidates,
  });

  const maxSelected = Math.max(
    1,
    Math.min(DEFAULT_MAX_SELECTED_PROFILES, args.maxSelectedProfiles || DEFAULT_MAX_SELECTED_PROFILES),
  );

  const selectedCandidates = rankedCandidates
    .filter((candidate) => candidate.seedCoverage !== "missing" && candidate.rankScore > 0)
    .slice(0, maxSelected);

  let boundedOverlay: Record<string, unknown> = {};
  for (const candidate of selectedCandidates) {
    boundedOverlay = mergeBoundedOverlay(
      boundedOverlay,
      buildExecutionOverlayFromCandidate(candidate),
    );
  }

  const hasIncompleteSeedCoverage = selectedCandidates.some(
    (candidate) => candidate.seedCoverage !== "full",
  );
  const fallbackApplied =
    selectedCandidates.length === 0
    || hasIncompleteSeedCoverage
    || Object.keys(boundedOverlay).length === 0;

  if (fallbackApplied) {
    boundedOverlay = mergeBoundedOverlay(
      boundedOverlay,
      buildFallbackOverlayFromInterview(args.interviewExtractedData),
    );
  }

  const selectedCatalogAgentNumbers = selectedCandidates.map(
    (candidate) => candidate.catalogAgentNumber,
  );

  const missingCoverageAreas: string[] = [];
  if (args.candidates.length === 0) {
    missingCoverageAreas.push("seed_catalog_unavailable");
  }
  if (selectedCandidates.length === 0 && args.candidates.length > 0) {
    missingCoverageAreas.push("no_ranked_seed_selected");
  }
  if (hasIncompleteSeedCoverage) {
    missingCoverageAreas.push("agp_seed_coverage_incomplete");
  }
  if (
    selectedCandidates.some((candidate) => candidate.requiredTools.length === 0)
  ) {
    missingCoverageAreas.push("tool_profile_incomplete");
  }
  if (
    selectedCandidates.some(
      (candidate) =>
        !candidate.soulProfile
        || !candidate.executionOverlay
        || Object.keys(candidate.executionOverlay).length === 0,
    )
  ) {
    missingCoverageAreas.push("soul_profile_incomplete");
  }

  const selectedSet = new Set(selectedCatalogAgentNumbers);
  const provenanceInputs: MidwifeHybridCompositionInputProvenance[] = [
    {
      inputType: "interview_identity_anchor",
      sourceId: "interview",
      sourceLabel: "Interview-born identity anchors",
      selected: true,
      signals:
        args.immutableAnchorFieldIds.length > 0
          ? [`immutable_anchor_fields:${args.immutableAnchorFieldIds.join(",")}`]
          : ["immutable_anchor_fields:none_captured"],
    },
  ];

  for (const candidate of rankedCandidates) {
    const selected = selectedSet.has(candidate.catalogAgentNumber);
    provenanceInputs.push({
      inputType: "catalog_profile",
      sourceId: `${candidate.datasetVersion}:${candidate.catalogAgentNumber}`,
      sourceLabel: `${candidate.name} (#${candidate.catalogAgentNumber})`,
      selected,
      rank: candidate.rank,
      rankScore: candidate.rankScore,
      seedCoverage: candidate.seedCoverage,
      signals: candidate.rankSignals,
    });

    if (selected && candidate.requiredTools.length > 0) {
      provenanceInputs.push({
        inputType: "tool_profile",
        sourceId: `${candidate.datasetVersion}:${candidate.catalogAgentNumber}:tools`,
        sourceLabel: `Tool profile for ${candidate.name}`,
        selected: true,
        rank: candidate.rank,
        rankScore: candidate.rankScore,
        seedCoverage: candidate.seedCoverage,
        signals: [`required_tools:${candidate.requiredTools.join(",")}`],
      });
    }

    if (selected && candidate.soulProfile) {
      provenanceInputs.push({
        inputType: "soul_profile",
        sourceId: `${candidate.datasetVersion}:${candidate.catalogAgentNumber}:soul`,
        sourceLabel: `Soul profile for ${candidate.name}`,
        selected: true,
        rank: candidate.rank,
        rankScore: candidate.rankScore,
        seedCoverage: candidate.seedCoverage,
        signals: ["template_soul_profile_attached"],
      });
    }
  }

  if (fallbackApplied) {
    provenanceInputs.push({
      inputType: "generated_fallback_overlay",
      sourceId: "midwife:fallback",
      sourceLabel: "Interview-derived fallback overlay",
      selected: true,
      signals: ["fallback_generated_from_interview_signals"],
    });
  }

  const provenance: MidwifeHybridCompositionProvenanceContract = {
    contractVersion: MIDWIFE_HYBRID_COMPOSITION_CONTRACT_VERSION,
    strategy: "interview_core_seed_overlay",
    composedAt: args.composedAt,
    fallbackApplied,
    immutableAnchorFieldIds: uniqueBoundedStringArray(
      args.immutableAnchorFieldIds,
      MAX_ARRAY_OVERLAY_ITEMS,
    ),
    selectedCatalogAgentNumbers,
    missingCoverageAreas: uniqueBoundedStringArray(missingCoverageAreas),
    inputCount: provenanceInputs.length,
    selectedInputCount: provenanceInputs.filter((input) => input.selected).length,
    inputs: provenanceInputs,
  };

  return {
    boundedOverlay,
    rankedCandidates,
    selectedCandidates,
    provenance,
  };
}

export function applyBoundedMidwifeOverlay(args: {
  soul: Record<string, unknown>;
  overlay?: Record<string, unknown>;
  preserveIdentityAnchors: boolean;
}): Record<string, unknown> {
  const overlay = toPlainRecord(args.overlay);
  if (!overlay) {
    return { ...args.soul };
  }

  const merged = { ...args.soul };

  for (const [key, value] of Object.entries(overlay)) {
    if (
      args.preserveIdentityAnchors
      && MIDWIFE_IMMUTABLE_IDENTITY_KEYS.has(key)
    ) {
      continue;
    }

    if (MIDWIFE_MUTABLE_OVERLAY_ARRAY_KEYS.has(key)) {
      const nextValues = normalizeStringArray(value);
      if (!nextValues?.length) continue;
      const currentValues = normalizeStringArray(merged[key]) || [];
      merged[key] = uniqueBoundedStringArray([
        ...currentValues,
        ...nextValues,
      ]);
      continue;
    }

    if (MIDWIFE_MUTABLE_OVERLAY_STRING_KEYS.has(key)) {
      const nextValue = toNonEmptyString(value);
      if (!nextValue) continue;
      if (!toNonEmptyString(merged[key])) {
        merged[key] = nextValue;
      }
    }
  }

  return merged;
}

export async function loadMidwifeSeededProfileCandidatesFromDb(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  datasetVersion?: string;
}): Promise<MidwifeSeededProfileCandidate[]> {
  const datasetVersion = toNonEmptyString(args.datasetVersion) || DEFAULT_AGP_DATASET_VERSION;

  try {
    const [catalogEntries, seedRows, toolRows] = await Promise.all([
      args.db
        .query("agentCatalogEntries")
        .withIndex("by_dataset_agent", (q: any) =>
          q.eq("datasetVersion", datasetVersion),
        )
        .collect(),
      args.db
        .query("agentCatalogSeedRegistry")
        .withIndex("by_dataset_agent", (q: any) =>
          q.eq("datasetVersion", datasetVersion),
        )
        .collect(),
      args.db
        .query("agentCatalogToolRequirements")
        .withIndex("by_dataset_agent", (q: any) =>
          q.eq("datasetVersion", datasetVersion),
        )
        .collect(),
    ]);

    const templateIds: string[] = Array.from(
      new Set(
        seedRows
          .map((row: any) => toNonEmptyString(row.systemTemplateAgentId))
          .filter((id: string | undefined): id is string => Boolean(id)),
      ),
    );

    const templateAgents: Array<
      readonly [string, MidwifeTemplateAgentRecord | undefined]
    > = await Promise.all(
      templateIds.map(async (templateId) => [
        templateId,
        (await args.db.get(templateId)) as MidwifeTemplateAgentRecord | undefined,
      ] as const),
    );

    const templateAgentsById: Record<string, MidwifeTemplateAgentRecord | undefined> = {};
    for (const [templateId, templateAgent] of templateAgents) {
      templateAgentsById[templateId] = templateAgent as MidwifeTemplateAgentRecord | undefined;
    }

    return buildMidwifeSeededProfileCandidates({
      catalogEntries: catalogEntries as MidwifeCatalogEntryRecord[],
      seedRegistryRows: seedRows as MidwifeSeedRegistryRecord[],
      toolRequirementRows: toolRows as MidwifeToolRequirementRecord[],
      templateAgentsById,
    });
  } catch (error) {
    console.warn(
      "[MidwifeCatalogComposer] Failed to load seeded candidates, continuing with interview-only fallback.",
      error,
    );
    return [];
  }
}
