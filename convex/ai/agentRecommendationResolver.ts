export const DEFAULT_RECOMMENDER_SCHEMA_VERSION = "agp_recommender_v1" as const;
export const AGENT_MARKETPLACE_COMPATIBILITY_FLAG =
  "AGENT_MARKETPLACE_COMPATIBILITY_ENABLED" as const;
export const AGENT_STORE_COMPATIBILITY_FLAG =
  "AGENT_STORE_COMPATIBILITY_ENABLED" as const;
export const AGENT_RECOMMENDER_COMPATIBILITY_FLAG =
  "AGENT_RECOMMENDER_COMPATIBILITY_ENABLED" as const;

export const AGENT_STORE_COMPATIBILITY_FLAG_ALIASES = [
  AGENT_STORE_COMPATIBILITY_FLAG,
  AGENT_MARKETPLACE_COMPATIBILITY_FLAG,
] as const;

export const AGENT_RECOMMENDER_COMPATIBILITY_FLAG_ALIASES = [
  AGENT_RECOMMENDER_COMPATIBILITY_FLAG,
  AGENT_MARKETPLACE_COMPATIBILITY_FLAG,
] as const;

export interface CompatibilityFlagDecision {
  enabled: boolean;
  flagKey: string;
  matchedAlias: string | null;
  defaultState: "off";
}

const SCORE_WEIGHTS = {
  intentMatchCoverage: 0.32,
  keywordAliasCoverage: 0.18,
  toolCoverageReadiness: 0.20,
  integrationReadiness: 0.15,
  accessModeCompatibility: 0.10,
  runtimeAvailability: 0.05,
} as const;

const PENALTIES = {
  missingIntegrationEach: -0.08,
  missingToolEach: -0.06,
  accessModeMismatch: -0.12,
  runtimePlanned: -0.15,
  unresolvedComplianceHold: -0.20,
} as const;

const MAX_PENALIZED_INTEGRATIONS = 3;
const MAX_PENALIZED_TOOLS = 4;

export const RECOMMENDATION_STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "please",
  "help",
  "need",
  "my",
  "for",
  "to",
  "with",
]);

const UNKNOWN_PREREQUISITE_TOKENS = new Set([
  "unknown",
  "tbd",
  "todo",
  "pending",
  "unset",
  "na",
  "n_a",
  "n",
  "none",
  "null",
  "undefined",
]);

export const CATEGORY_INTENT_TAG_DEFAULTS: Record<string, string[]> = {
  core: ["platform_operations"],
  legal: ["case_or_account_brief", "compliance_hold"],
  finance: ["financial_modeling"],
  health: ["care_follow_up"],
  coaching: ["program_or_session_tracking"],
  agency: ["resource_capacity_planning"],
  trades: ["job_material_estimation"],
  ecommerce: ["cart_recovery_or_growth", "inventory_restock_or_fulfillment"],
};

export const SUBTYPE_INTENT_TAG_DEFAULTS: Record<string, string[]> = {
  sales_assistant: ["provider_or_client_outreach"],
  customer_support: ["retention_and_reviews"],
  booking_agent: ["book_appointment", "reschedule_conflict"],
};

export const TOOL_PROFILE_INTENT_TAG_DEFAULTS: Record<string, string[]> = {
  legal: ["case_or_account_brief", "compliance_hold"],
  finance: ["financial_modeling"],
  health: ["care_follow_up", "book_appointment"],
  coaching: ["program_or_session_tracking"],
  agency: ["resource_capacity_planning"],
  trades: ["job_material_estimation", "document_or_quote_packet"],
  ecommerce: ["cart_recovery_or_growth", "inventory_restock_or_fulfillment"],
};

export const INTENT_KEYWORD_ALIAS_DEFAULTS: Record<string, string[]> = {
  book_appointment: ["book", "booking", "appointment", "schedule", "slot"],
  reschedule_conflict: ["reschedule", "conflict", "move", "postpone"],
  provider_or_client_outreach: ["followup", "outreach", "callback", "reminder"],
  compliance_hold: ["compliance", "policy", "privacy", "consent", "risk_hold"],
  case_or_account_brief: ["brief", "summary", "recap", "case_notes", "account_notes"],
  document_or_quote_packet: ["quote", "estimate", "proposal", "scope", "packet", "pdf"],
  financial_modeling: ["margin", "unit_economics", "payback", "scenario", "forecast"],
  care_follow_up: ["care_plan", "medical_followup", "treatment_followup"],
  program_or_session_tracking: ["program", "session", "milestone", "homework", "coaching_tracker"],
  resource_capacity_planning: ["capacity", "allocation", "bandwidth", "staffing"],
  job_material_estimation: ["materials", "takeoff", "job_cost", "estimate_sheet"],
  cart_recovery_or_growth: ["cart", "abandon", "upsell", "cross_sell", "conversion"],
  inventory_restock_or_fulfillment: ["inventory", "restock", "stockout", "reorder", "fulfillment"],
  marketplace_channel_sync: ["marketplace", "listing", "channel", "sync"],
  retention_and_reviews: ["retention", "renewal", "loyalty", "reviews", "reputation"],
  platform_operations: ["operations", "operator", "strategist", "planning"],
};

function isTruthyFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function resolveCompatibilityFlagDecision(args: {
  aliases: readonly string[];
  env?: Record<string, string | undefined>;
}): CompatibilityFlagDecision {
  const env =
    args.env
    ?? ((typeof process !== "undefined" && typeof process.env === "object")
      ? process.env
      : undefined);
  const flagKey = args.aliases[0] ?? "UNSPECIFIED_COMPATIBILITY_FLAG";

  if (!env) {
    return {
      enabled: false,
      flagKey,
      matchedAlias: null,
      defaultState: "off",
    };
  }

  for (const alias of args.aliases) {
    if (isTruthyFlag(env[alias])) {
      return {
        enabled: true,
        flagKey,
        matchedAlias: alias,
        defaultState: "off",
      };
    }
  }

  return {
    enabled: false,
    flagKey,
    matchedAlias: null,
    defaultState: "off",
  };
}

const CANONICAL_INTENTS = new Set<string>(Object.keys(INTENT_KEYWORD_ALIAS_DEFAULTS));

const ALIAS_TO_INTENT = new Map<string, string>();
for (const [intent, aliases] of Object.entries(INTENT_KEYWORD_ALIAS_DEFAULTS)) {
  ALIAS_TO_INTENT.set(intent, intent);
  for (const alias of aliases) {
    ALIAS_TO_INTENT.set(alias, intent);
  }
}

const ACCESS_MODE_VALUES = ["invisible", "direct", "meeting"] as const;
const ACTIVATION_STATE_SEVERITY: Record<AgentRecommendationActivationState, number> = {
  suggest_activation: 0,
  needs_setup: 1,
  planned_only: 2,
  blocked: 3,
};

export type AgentRecommendationRequestedAccessMode =
  | "invisible"
  | "direct"
  | "meeting";

export type AgentRecommendationActivationState =
  | "suggest_activation"
  | "needs_setup"
  | "planned_only"
  | "blocked";

export type AgentRecommendationMetadata = {
  schemaVersion: typeof DEFAULT_RECOMMENDER_SCHEMA_VERSION;
  source: "derived" | "manual";
  rankHint: number;
  gapPenaltyMultiplier: number;
  defaultActivationState: AgentRecommendationActivationState;
};

export type AgentRecommendationRuntimeStatus =
  | "live"
  | "template_only"
  | "not_deployed"
  | string;

export type AgentRecommendationRuntimeAvailability = "available_now" | "planned";
export type AgentRecommendationCapabilityStatus = "available_now" | "blocked";

export interface AgentRecommendationCatalogEntryInput {
  catalogAgentNumber: number;
  name: string;
  category?: string;
  subtype?: string;
  toolProfile?: string;
  tier?: string;
  intentTags: string[];
  keywordAliases: string[];
  recommendationMetadata: AgentRecommendationMetadata;
  requiredIntegrations: string[];
  specialistAccessModes: string[];
  runtimeStatus: AgentRecommendationRuntimeStatus;
  blockers?: string[];
}

export interface AgentRecommendationToolRequirementInput {
  catalogAgentNumber: number;
  toolName: string;
  requirementLevel: "required" | "recommended" | "optional" | string;
  implementationStatus: "implemented" | "missing" | string;
  source?: "registry" | "interview_tools" | "proposed_new" | string;
}

export interface AgentRecommendationIntentEvidence {
  matchedIntents: string[];
  matchedKeywords: string[];
  intentCoverage: number;
  keywordCoverage: number;
  coverageRatio: number;
}

export interface AgentRecommendationScoreBreakdown {
  signalScores: {
    intentMatchCoverage: number;
    keywordAliasCoverage: number;
    toolCoverageReadiness: number;
    integrationReadiness: number;
    accessModeCompatibility: number;
    runtimeAvailability: number;
  };
  weights: typeof SCORE_WEIGHTS;
  penalties: {
    missingIntegrationPenalty: number;
    missingToolPenalty: number;
    accessModePenalty: number;
    runtimePenalty: number;
    compliancePenalty: number;
    multiplier: number;
    total: number;
  };
  metadataAdjustments: {
    rankHint: number;
    defaultActivationState: AgentRecommendationActivationState;
  };
}

export interface AgentRecommendationGapPayload {
  runtime: string[];
  integrations: string[];
  tools: string[];
  accessMode: string[];
  prerequisites: string[];
}

export interface AgentRecommendationRationale {
  gapSummary: string[];
  positiveSignals: string[];
  activationSuggestion: string;
}

export interface AgentRecommendationCandidate {
  agentId: string;
  catalogAgentNumber: number;
  agentName: string;
  rank: number;
  baseScore: number;
  finalScore: number;
  capabilityStatus: AgentRecommendationCapabilityStatus;
  activationState: AgentRecommendationActivationState;
  requestedAccessMode: AgentRecommendationRequestedAccessMode;
  supportedAccessModes: AgentRecommendationRequestedAccessMode[];
  runtimeAvailability: AgentRecommendationRuntimeAvailability;
  intentEvidence: AgentRecommendationIntentEvidence;
  scoreBreakdown: AgentRecommendationScoreBreakdown;
  gaps: AgentRecommendationGapPayload;
  rationale: AgentRecommendationRationale;
  nextActions: string[];
}

export interface AgentRecommendationResolution {
  query: {
    queryText: string;
    normalizedTokens: string[];
    normalizedIntents: string[];
    requestedAccessMode: AgentRecommendationRequestedAccessMode;
    availableIntegrations: string[];
    unresolvedComplianceHold: boolean;
  };
  recommendations: AgentRecommendationCandidate[];
}

export interface ResolveAgentRecommendationsArgs {
  entries: AgentRecommendationCatalogEntryInput[];
  toolRequirements: AgentRecommendationToolRequirementInput[];
  queryText?: string;
  intentTags?: string[];
  requestedAccessMode?: AgentRecommendationRequestedAccessMode | string;
  availableIntegrations?: string[];
  unresolvedComplianceHold?: boolean;
  limit?: number;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function normalizeToAscii(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeRecommendationToken(value: string): string {
  return normalizeToAscii(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeAndDedupeRecommendationTokens(values: Iterable<string>): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const value of values) {
    const normalized = normalizeRecommendationToken(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    deduped.push(normalized);
  }
  return deduped;
}

export function tokenizeRecommendationSearchInput(value: string): string[] {
  const normalizedInput = normalizeToAscii(value).trim().toLowerCase();
  if (!normalizedInput) {
    return [];
  }
  const tokens = normalizedInput.split(/[^a-z0-9_]+/g).filter(Boolean);
  return normalizeAndDedupeRecommendationTokens(
    tokens.filter((token) => token.length > 1 && !RECOMMENDATION_STOP_WORDS.has(token)),
  );
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo4(value: number): number {
  return Number(value.toFixed(4));
}

function normalizeCoverageRatio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return clamp(numerator / denominator, 0, 1);
}

function normalizeAccessMode(
  value: string | undefined,
): AgentRecommendationRequestedAccessMode {
  const normalized = normalizeRecommendationToken(value || "");
  if (normalized === "direct" || normalized === "meeting" || normalized === "invisible") {
    return normalized;
  }
  return "invisible";
}

function normalizeSupportedAccessModes(values: string[]): AgentRecommendationRequestedAccessMode[] {
  return normalizeAndDedupeRecommendationTokens(values)
    .filter((value): value is AgentRecommendationRequestedAccessMode =>
      value === "invisible" || value === "direct" || value === "meeting",
    );
}

function normalizeRuntimeAvailability(
  runtimeStatus: AgentRecommendationRuntimeStatus,
): AgentRecommendationRuntimeAvailability {
  return normalizeRecommendationToken(runtimeStatus) === "live" ? "available_now" : "planned";
}

function isUnknownPrerequisiteToken(value: string): boolean {
  const normalized = normalizeRecommendationToken(value);
  return !normalized || UNKNOWN_PREREQUISITE_TOKENS.has(normalized);
}

function resolveQueryIntents(args: {
  queryText: string;
  explicitIntents: string[];
}): string[] {
  const explicit = normalizeAndDedupeRecommendationTokens(args.explicitIntents).filter(
    (intent) => CANONICAL_INTENTS.has(intent),
  );
  const queryTokens = tokenizeRecommendationSearchInput(args.queryText);
  const inferred: string[] = [];

  for (const token of queryTokens) {
    if (CANONICAL_INTENTS.has(token)) {
      inferred.push(token);
      continue;
    }
    const mapped = ALIAS_TO_INTENT.get(token);
    if (mapped) {
      inferred.push(mapped);
    }
  }

  return normalizeAndDedupeRecommendationTokens([...explicit, ...inferred]);
}

function applyActivationStateFloor(
  derivedState: AgentRecommendationActivationState,
  metadataDefault: AgentRecommendationActivationState,
): AgentRecommendationActivationState {
  return ACTIVATION_STATE_SEVERITY[metadataDefault] > ACTIVATION_STATE_SEVERITY[derivedState]
    ? metadataDefault
    : derivedState;
}

function buildGapSummary(gaps: AgentRecommendationGapPayload): string[] {
  const summary: string[] = [];

  if (gaps.runtime.length > 0) {
    summary.push(`Runtime gaps: ${gaps.runtime.join(" ")}`);
  }
  if (gaps.integrations.length > 0) {
    summary.push(`Integration gaps: ${gaps.integrations.join(", ")}.`);
  }
  if (gaps.tools.length > 0) {
    summary.push(`Tool gaps: ${gaps.tools.join(", ")}.`);
  }
  if (gaps.accessMode.length > 0) {
    summary.push(`Access-mode gaps: ${gaps.accessMode.join(" ")}`);
  }
  if (gaps.prerequisites.length > 0) {
    summary.push(`Unknown prerequisites: ${gaps.prerequisites.join(" ")}`);
  }

  if (summary.length === 0) {
    summary.push("No blocking gaps detected for requested mode.");
  }

  return summary;
}

function buildNextActions(args: {
  gaps: AgentRecommendationGapPayload;
  requestedAccessMode: AgentRecommendationRequestedAccessMode;
  supportedAccessModes: AgentRecommendationRequestedAccessMode[];
}): string[] {
  const actions: string[] = [];

  if (args.gaps.runtime.length > 0) {
    actions.push(
      "Complete runtime deployment and set runtime status to live before allowing activation.",
    );
  }
  if (args.gaps.integrations.length > 0) {
    actions.push(`Connect required integrations in Integrations settings: ${args.gaps.integrations.join(", ")}.`);
  }
  if (args.gaps.tools.length > 0) {
    actions.push(`Implement and mark required tools as implemented: ${args.gaps.tools.join(", ")}.`);
  }
  if (args.gaps.accessMode.length > 0) {
    actions.push(
      `Switch to a supported access mode (${args.supportedAccessModes.join(", ")}) or route through hidden specialist delegation from ${args.requestedAccessMode}.`,
    );
  }
  if (args.gaps.prerequisites.length > 0) {
    actions.push(
      "Resolve unknown prerequisites by replacing placeholder values with concrete runtime, tool, access-mode, and integration requirements.",
    );
  }

  if (actions.length === 0) {
    actions.push("No unblocking actions required. Capability can run now under primary-agent authority.");
  }

  return actions;
}

function buildActivationSuggestion(args: {
  activationState: AgentRecommendationActivationState;
  requestedAccessMode: AgentRecommendationRequestedAccessMode;
}): string {
  if (args.activationState === "suggest_activation") {
    return `Activation suggestion: delegate through the primary agent in ${args.requestedAccessMode} mode.`;
  }
  if (args.activationState === "needs_setup") {
    return "Activation suggestion: complete setup gaps before enabling specialist activation.";
  }
  if (args.activationState === "planned_only") {
    return "Activation suggestion: keep this candidate in planned-only mode until runtime is available.";
  }
  return "Activation suggestion: blocked for now; keep execution on the primary-agent path.";
}

function buildPositiveSignals(args: {
  intentEvidence: AgentRecommendationIntentEvidence;
  toolCoverageReadiness: number;
  integrationReadiness: number;
  runtimeAvailability: AgentRecommendationRuntimeAvailability;
  metadata: AgentRecommendationMetadata;
}): string[] {
  const lines = [
    args.intentEvidence.matchedIntents.length > 0
      ? `Matched intents: ${args.intentEvidence.matchedIntents.join(", ")}.`
      : "Matched intents: none.",
    args.intentEvidence.matchedKeywords.length > 0
      ? `Matched keywords: ${args.intentEvidence.matchedKeywords.join(", ")}.`
      : "Matched keywords: none.",
    `Tool coverage readiness: ${(args.toolCoverageReadiness * 100).toFixed(0)}%.`,
    `Integration readiness: ${(args.integrationReadiness * 100).toFixed(0)}%.`,
    `Runtime availability: ${args.runtimeAvailability}.`,
  ];

  if (args.metadata.rankHint !== 0) {
    lines.push(`Metadata rank hint applied: ${roundTo4(args.metadata.rankHint)}.`);
  }
  if (args.metadata.gapPenaltyMultiplier !== 1) {
    lines.push(
      `Metadata gap-penalty multiplier applied: ${roundTo4(args.metadata.gapPenaltyMultiplier)}x.`,
    );
  }

  return lines;
}

function groupToolRequirementsByAgent(
  toolRequirements: AgentRecommendationToolRequirementInput[],
): Map<number, AgentRecommendationToolRequirementInput[]> {
  const grouped = new Map<number, AgentRecommendationToolRequirementInput[]>();

  for (const row of toolRequirements) {
    if (row.requirementLevel !== "required") {
      continue;
    }
    const bucket = grouped.get(row.catalogAgentNumber) || [];
    bucket.push(row);
    grouped.set(row.catalogAgentNumber, bucket);
  }

  return grouped;
}

function normalizeMetadata(
  metadata: AgentRecommendationMetadata,
): AgentRecommendationMetadata {
  const schemaVersion =
    metadata.schemaVersion === DEFAULT_RECOMMENDER_SCHEMA_VERSION
      ? metadata.schemaVersion
      : DEFAULT_RECOMMENDER_SCHEMA_VERSION;

  const source = metadata.source === "manual" ? "manual" : "derived";
  const rankHint = toFiniteNumber(metadata.rankHint, 0);
  const gapPenaltyMultiplier = clamp(toFiniteNumber(metadata.gapPenaltyMultiplier, 1), 0.25, 3);
  const defaultActivationState: AgentRecommendationActivationState =
    metadata.defaultActivationState === "blocked"
    || metadata.defaultActivationState === "planned_only"
    || metadata.defaultActivationState === "needs_setup"
      ? metadata.defaultActivationState
      : "suggest_activation";

  return {
    schemaVersion,
    source,
    rankHint,
    gapPenaltyMultiplier,
    defaultActivationState,
  };
}

export function resolveAgentRecommendations(
  args: ResolveAgentRecommendationsArgs,
): AgentRecommendationResolution {
  const requestedAccessMode = normalizeAccessMode(args.requestedAccessMode);
  const queryText = (args.queryText || "").trim();
  const normalizedTokens = tokenizeRecommendationSearchInput(queryText);
  const normalizedIntents = resolveQueryIntents({
    queryText,
    explicitIntents: args.intentTags || [],
  });
  const availableIntegrations = normalizeAndDedupeRecommendationTokens(args.availableIntegrations || []);
  const availableIntegrationsSet = new Set(availableIntegrations);
  const complianceHoldTriggered = Boolean(args.unresolvedComplianceHold)
    && normalizedIntents.includes("compliance_hold");

  const requiredToolsByAgent = groupToolRequirementsByAgent(args.toolRequirements);

  const ranked = args.entries.map((entry) => {
    const normalizedEntryIntents = normalizeAndDedupeRecommendationTokens(entry.intentTags);
    const normalizedEntryAliases = normalizeAndDedupeRecommendationTokens(entry.keywordAliases);

    const matchedIntents = normalizedIntents.filter((intent) =>
      normalizedEntryIntents.includes(intent),
    );
    const matchedKeywords = normalizedTokens.filter((token) =>
      normalizedEntryAliases.includes(token),
    );

    const intentCoverage = normalizeCoverageRatio(matchedIntents.length, normalizedIntents.length);
    const keywordCoverage = normalizeCoverageRatio(matchedKeywords.length, normalizedTokens.length);

    const requiredTools = requiredToolsByAgent.get(entry.catalogAgentNumber) || [];
    const unknownPrerequisites: string[] = [];
    const missingToolNames: string[] = [];
    let implementedRequiredToolCount = 0;

    for (const tool of requiredTools) {
      const normalizedToolName = normalizeRecommendationToken(tool.toolName || "");
      const normalizedToolStatus = normalizeRecommendationToken(tool.implementationStatus || "");

      if (!normalizedToolName || isUnknownPrerequisiteToken(tool.toolName || "")) {
        unknownPrerequisites.push(
          `required tool name is unknown for catalog agent ${entry.catalogAgentNumber}`,
        );
        continue;
      }

      if (normalizeRecommendationToken(tool.source || "") === "proposed_new") {
        missingToolNames.push(normalizedToolName);
        continue;
      }

      if (normalizedToolStatus === "implemented") {
        implementedRequiredToolCount += 1;
        continue;
      }

      if (normalizedToolStatus === "missing") {
        missingToolNames.push(normalizedToolName);
        continue;
      }

      unknownPrerequisites.push(
        `tool '${normalizedToolName}' has unknown implementation status '${tool.implementationStatus || "unset"}'`,
      );
    }

    const missingTools = normalizeAndDedupeRecommendationTokens(missingToolNames);
    const requiredToolCount = requiredTools.length;
    const availableToolCount = Math.max(0, implementedRequiredToolCount);
    const toolCoverageReadiness = requiredToolCount === 0
      ? 1
      : clamp(availableToolCount / requiredToolCount);

    const requiredIntegrations = normalizeAndDedupeRecommendationTokens(entry.requiredIntegrations);
    const unknownIntegrationRequirements = normalizeAndDedupeRecommendationTokens(
      entry.requiredIntegrations.filter((integration) =>
        isUnknownPrerequisiteToken(integration),
      ),
    );
    if (unknownIntegrationRequirements.length > 0) {
      unknownPrerequisites.push(
        `integration requirements are unknown: ${unknownIntegrationRequirements.join(", ")}`,
      );
    }
    const unknownIntegrationSet = new Set(unknownIntegrationRequirements);
    const missingIntegrations = requiredIntegrations.filter(
      (integration) => !unknownIntegrationSet.has(integration) && !availableIntegrationsSet.has(integration),
    );
    const availableIntegrationCount = Math.max(
      0,
      requiredIntegrations.length - missingIntegrations.length - unknownIntegrationRequirements.length,
    );
    const integrationReadiness = requiredIntegrations.length === 0
      ? 1
      : clamp(availableIntegrationCount / requiredIntegrations.length);

    const rawSpecialistAccessModes = entry.specialistAccessModes || [];
    const normalizedSupportedAccessModes = normalizeSupportedAccessModes(rawSpecialistAccessModes);
    const hasUnknownAccessModePrerequisites =
      rawSpecialistAccessModes.length === 0
      || normalizedSupportedAccessModes.length === 0;
    if (hasUnknownAccessModePrerequisites) {
      unknownPrerequisites.push("specialist access mode prerequisites are unknown");
    }
    const supportedAccessModes: AgentRecommendationRequestedAccessMode[] =
      normalizedSupportedAccessModes.length > 0
        ? normalizedSupportedAccessModes
        : ["invisible"];
    const accessModeSupported = normalizedSupportedAccessModes.length > 0
      && normalizedSupportedAccessModes.includes(requestedAccessMode);
    const runtimeAvailability = normalizeRuntimeAvailability(entry.runtimeStatus);
    if (isUnknownPrerequisiteToken(entry.runtimeStatus || "")) {
      unknownPrerequisites.push("runtime status prerequisite is unknown");
    }

    const signalScores = {
      intentMatchCoverage: intentCoverage,
      keywordAliasCoverage: keywordCoverage,
      toolCoverageReadiness,
      integrationReadiness,
      accessModeCompatibility: accessModeSupported ? 1 : 0,
      runtimeAvailability: runtimeAvailability === "available_now" ? 1 : 0,
    };

    const baseScore = roundTo4(
      clamp(
        signalScores.intentMatchCoverage * SCORE_WEIGHTS.intentMatchCoverage
          + signalScores.keywordAliasCoverage * SCORE_WEIGHTS.keywordAliasCoverage
          + signalScores.toolCoverageReadiness * SCORE_WEIGHTS.toolCoverageReadiness
          + signalScores.integrationReadiness * SCORE_WEIGHTS.integrationReadiness
          + signalScores.accessModeCompatibility * SCORE_WEIGHTS.accessModeCompatibility
          + signalScores.runtimeAvailability * SCORE_WEIGHTS.runtimeAvailability,
      ),
    );

    const resolvedUnknownPrerequisites = Array.from(new Set(unknownPrerequisites));

    const missingIntegrationPenalty =
      Math.min(MAX_PENALIZED_INTEGRATIONS, missingIntegrations.length)
      * PENALTIES.missingIntegrationEach;
    const missingToolPenalty =
      Math.min(MAX_PENALIZED_TOOLS, missingTools.length)
      * PENALTIES.missingToolEach;
    const accessModePenalty = accessModeSupported ? 0 : PENALTIES.accessModeMismatch;
    const runtimePenalty = runtimeAvailability === "available_now" ? 0 : PENALTIES.runtimePlanned;
    const compliancePenalty = complianceHoldTriggered ? PENALTIES.unresolvedComplianceHold : 0;

    const metadata = normalizeMetadata(entry.recommendationMetadata);
    const penaltyTotal = roundTo4(
      (missingIntegrationPenalty
        + missingToolPenalty
        + accessModePenalty
        + runtimePenalty
        + compliancePenalty)
      * metadata.gapPenaltyMultiplier,
    );

    const finalScore = roundTo4(
      clamp(baseScore + penaltyTotal + metadata.rankHint),
    );

    const runtimeGaps: string[] = [];
    if (runtimeAvailability !== "available_now") {
      if (isUnknownPrerequisiteToken(entry.runtimeStatus || "")) {
        runtimeGaps.push("runtime status is unknown; fail-closed until runtime status is declared and verified live.");
      } else {
        runtimeGaps.push(`runtime status '${entry.runtimeStatus}' is not live.`);
      }
    }

    const blockers = normalizeAndDedupeRecommendationTokens(entry.blockers || []);
    if (blockers.length > 0) {
      runtimeGaps.push(`catalog blockers present: ${blockers.join(", ")}`);
    }

    const accessModeGaps: string[] = [];
    if (!accessModeSupported) {
      accessModeGaps.push(
        `requested '${requestedAccessMode}' is unsupported; supported modes: ${supportedAccessModes.join(", ")}.`,
      );
    }
    if (complianceHoldTriggered) {
      accessModeGaps.push("compliance hold is unresolved; keep recommendation blocked under primary-agent authority.");
    }

    let derivedActivationState: AgentRecommendationActivationState;
    const hasBlockingCondition =
      accessModeGaps.length > 0
      || blockers.length > 0
      || resolvedUnknownPrerequisites.length > 0;

    if (hasBlockingCondition) {
      derivedActivationState = "blocked";
    } else if (runtimeAvailability !== "available_now") {
      derivedActivationState = "planned_only";
    } else if (missingIntegrations.length > 0 || missingTools.length > 0) {
      derivedActivationState = "needs_setup";
    } else {
      derivedActivationState = "suggest_activation";
    }

    const activationState = applyActivationStateFloor(
      derivedActivationState,
      metadata.defaultActivationState,
    );

    let capabilityStatus: AgentRecommendationCapabilityStatus = (
      runtimeAvailability === "available_now"
      && missingIntegrations.length === 0
      && missingTools.length === 0
      && accessModeGaps.length === 0
      && blockers.length === 0
      && resolvedUnknownPrerequisites.length === 0
    )
      ? "available_now"
      : "blocked";

    if (activationState === "blocked") {
      capabilityStatus = "blocked";
    }

    if (activationState === "blocked" && accessModeGaps.length === 0) {
      accessModeGaps.push("metadata default activation state is blocked for this candidate.");
      capabilityStatus = "blocked";
    }

    const gaps: AgentRecommendationGapPayload = {
      runtime: runtimeGaps,
      integrations: missingIntegrations,
      tools: missingTools,
      accessMode: accessModeGaps,
      prerequisites: resolvedUnknownPrerequisites,
    };

    const intentEvidence: AgentRecommendationIntentEvidence = {
      matchedIntents,
      matchedKeywords,
      intentCoverage: roundTo4(intentCoverage),
      keywordCoverage: roundTo4(keywordCoverage),
      coverageRatio: roundTo4((intentCoverage + keywordCoverage) / 2),
    };

    const nextActions = buildNextActions({
      gaps,
      requestedAccessMode,
      supportedAccessModes,
    });

    const rationale: AgentRecommendationRationale = {
      gapSummary: buildGapSummary(gaps),
      positiveSignals: buildPositiveSignals({
        intentEvidence,
        toolCoverageReadiness,
        integrationReadiness,
        runtimeAvailability,
        metadata,
      }),
      activationSuggestion: buildActivationSuggestion({
        activationState,
        requestedAccessMode,
      }),
    };

    return {
      agentId: String(entry.catalogAgentNumber),
      catalogAgentNumber: entry.catalogAgentNumber,
      agentName: entry.name,
      rank: 0,
      baseScore,
      finalScore,
      capabilityStatus,
      activationState,
      requestedAccessMode,
      supportedAccessModes,
      runtimeAvailability,
      intentEvidence,
      scoreBreakdown: {
        signalScores,
        weights: SCORE_WEIGHTS,
        penalties: {
          missingIntegrationPenalty: roundTo4(missingIntegrationPenalty),
          missingToolPenalty: roundTo4(missingToolPenalty),
          accessModePenalty: roundTo4(accessModePenalty),
          runtimePenalty: roundTo4(runtimePenalty),
          compliancePenalty: roundTo4(compliancePenalty),
          multiplier: roundTo4(metadata.gapPenaltyMultiplier),
          total: penaltyTotal,
        },
        metadataAdjustments: {
          rankHint: roundTo4(metadata.rankHint),
          defaultActivationState: metadata.defaultActivationState,
        },
      },
      gaps,
      rationale,
      nextActions,
    } satisfies AgentRecommendationCandidate;
  });

  ranked.sort((left, right) => {
    if (right.finalScore !== left.finalScore) {
      return right.finalScore - left.finalScore;
    }
    if (left.catalogAgentNumber !== right.catalogAgentNumber) {
      return left.catalogAgentNumber - right.catalogAgentNumber;
    }
    return left.agentName.localeCompare(right.agentName);
  });

  const limit = Number.isFinite(args.limit)
    ? Math.max(1, Math.floor(args.limit as number))
    : ranked.length;

  return {
    query: {
      queryText,
      normalizedTokens,
      normalizedIntents,
      requestedAccessMode,
      availableIntegrations,
      unresolvedComplianceHold: complianceHoldTriggered,
    },
    recommendations: ranked.slice(0, limit).map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    })),
  };
}

export function deriveDefaultIntentTags(args: {
  category?: string;
  subtype?: string;
  toolProfile?: string;
}): string[] {
  const category = normalizeRecommendationToken(args.category || "");
  const subtype = normalizeRecommendationToken(args.subtype || "");
  const toolProfile = normalizeRecommendationToken(args.toolProfile || "");

  const categoryIntents = CATEGORY_INTENT_TAG_DEFAULTS[category] ?? [];
  const subtypeIntents = SUBTYPE_INTENT_TAG_DEFAULTS[subtype] ?? [];
  const toolProfileIntents = TOOL_PROFILE_INTENT_TAG_DEFAULTS[toolProfile] ?? [];

  const merged = normalizeAndDedupeRecommendationTokens([
    ...categoryIntents,
    ...subtypeIntents,
    ...toolProfileIntents,
  ]);

  return merged.length > 0 ? merged : ["platform_operations"];
}

export function deriveDefaultKeywordAliases(args: {
  name?: string;
  category?: string;
  subtype?: string;
  toolProfile?: string;
  tier?: string;
  intentTags: string[];
}): string[] {
  const aliases: string[] = [
    ...tokenizeRecommendationSearchInput(args.name || ""),
    ...tokenizeRecommendationSearchInput(args.category || ""),
    ...tokenizeRecommendationSearchInput(args.subtype || ""),
    ...tokenizeRecommendationSearchInput(args.toolProfile || ""),
    ...tokenizeRecommendationSearchInput(args.tier || ""),
  ];

  const normalizedIntents = normalizeAndDedupeRecommendationTokens(args.intentTags);
  for (const intent of normalizedIntents) {
    const intentAliases = INTENT_KEYWORD_ALIAS_DEFAULTS[intent] ?? [intent];
    aliases.push(...intentAliases);
  }

  return normalizeAndDedupeRecommendationTokens(aliases);
}

export function isRecommendationActivationState(
  value: string,
): value is AgentRecommendationActivationState {
  return (
    value === "suggest_activation"
    || value === "needs_setup"
    || value === "planned_only"
    || value === "blocked"
  );
}

export function normalizeDefaultRecommendationMetadata(args: {
  metadata?: AgentRecommendationMetadata;
  fallbackActivationState: AgentRecommendationActivationState;
  fallbackRankHint?: number;
  fallbackGapPenaltyMultiplier?: number;
}): AgentRecommendationMetadata {
  if (!args.metadata) {
    return {
      schemaVersion: DEFAULT_RECOMMENDER_SCHEMA_VERSION,
      source: "derived",
      rankHint: toFiniteNumber(args.fallbackRankHint, 0),
      gapPenaltyMultiplier: toFiniteNumber(args.fallbackGapPenaltyMultiplier, 1),
      defaultActivationState: args.fallbackActivationState,
    };
  }

  const normalized = normalizeMetadata(args.metadata);

  return {
    ...normalized,
    defaultActivationState: isRecommendationActivationState(normalized.defaultActivationState)
      ? normalized.defaultActivationState
      : args.fallbackActivationState,
  };
}

export const AGENT_RECOMMENDATION_CONTRACT = {
  schemaVersion: DEFAULT_RECOMMENDER_SCHEMA_VERSION,
  scoreWeights: SCORE_WEIGHTS,
  penalties: PENALTIES,
  accessModes: ACCESS_MODE_VALUES,
  capabilityStatuses: ["available_now", "blocked"] as const,
} as const;
