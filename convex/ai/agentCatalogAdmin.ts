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
import { normalizeDeterministicToolNames } from "./toolScoping";
import {
  normalizeWaeRunRecord,
  normalizeWaeScenarioRecords,
  scoreWaeEvalBundle,
  type WaeEvalRunRecordInput,
  type WaeEvalScenarioRecordInput,
  type WaeEvalScorePacket,
} from "./tools/evalAnalystTool";
import {
  normalizeAgentTelephonyConfig,
  toDeployableTelephonyConfig,
} from "../../src/lib/telephony/agent-telephony";

const DEFAULT_DATASET_VERSION = "agp_v1";
const EXPECTED_AGENT_COUNT = 104;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;
const SEED_TEMPLATE_BRIDGE_CONTRACT_VERSION = "ath_seed_template_bridge_v1";
const TEMPLATE_CLONE_LINKAGE_CONTRACT_VERSION = "ath_template_clone_linkage_v1";
const TEMPLATE_CLONE_PRECEDENCE_ORDER = [
  "platform_policy",
  "template_baseline",
  "org_clone_overrides",
  "runtime_session_restrictions",
] as const;
const PERSONAL_OPERATOR_TEMPLATE_ROLE = "personal_life_operator_template";
export const WAE_ROLLOUT_GATE_DECISION_CONTRACT_VERSION =
  "wae_rollout_gate_decision_v1" as const;
export const WAE_ROLLOUT_GATE_ACTION_TYPE = "wae_rollout_gate.recorded" as const;
export const WAE_ROLLOUT_GATE_ROLLOUT_CONTRACT_VERSION =
  "wae_rollout_promotion_contract_v1" as const;
export const WAE_ROLLOUT_GATE_MAX_AGE_MS = 72 * 60 * 60 * 1000;
export const TEMPLATE_CERTIFICATION_DECISION_CONTRACT_VERSION =
  "template_certification_decision_v1" as const;
export const TEMPLATE_CERTIFICATION_DEPENDENCY_MANIFEST_CONTRACT_VERSION =
  "template_certification_dependency_manifest_v1" as const;
export const TEMPLATE_CERTIFICATION_RISK_ASSESSMENT_CONTRACT_VERSION =
  "template_certification_risk_assessment_v1" as const;
export const TEMPLATE_CERTIFICATION_ACTION_TYPE =
  "template_certification.recorded" as const;
export const TEMPLATE_CERTIFICATION_PROMOTION_CONTRACT_VERSION =
  "template_certification_promotion_contract_v1" as const;
export const TEMPLATE_CERTIFICATION_RISK_POLICY_CONTRACT_VERSION =
  "template_certification_risk_policy_v1" as const;
export const TEMPLATE_CERTIFICATION_RISK_POLICY_SETTINGS_CONTRACT_VERSION =
  "template_certification_risk_policy_settings_v1" as const;
const TEMPLATE_CERTIFICATION_RISK_POLICY_SETTING_KEY =
  "templateCertificationRiskPolicyV1";
const TEMPLATE_CERTIFICATION_RISK_POLICY_SETTING_DESCRIPTION =
  "Template certification risk policy defaults plus optional per-template-family overlays for field-tier mapping, verification requirements, and auto-certification eligibility.";

const WAE_ROLLOUT_GATE_CRITICAL_REASON_PREFIXES = [
  "expected_skipped_verdict",
  "forbidden_tool_used",
  "missing_required_any_tool",
  "missing_required_outcome",
  "missing_required_tool",
  "missing_skip_reason",
  "negative_path_outcome_missing",
  "unexpected_failed_verdict",
  "unexpected_skip_reason",
  "unexpected_skipped_verdict",
] as const;

export type WaeRolloutGateBlockReasonCode =
  | "wae_evidence_missing"
  | "wae_evidence_stale"
  | "wae_gate_failed"
  | "wae_evidence_mismatch";

export type TemplateCertificationRiskTier = "low" | "medium" | "high";
export type TemplateCertificationRequirement =
  | "manifest_integrity"
  | "risk_assessment"
  | "wae_eval"
  | "behavioral_eval"
  | "tool_contract_eval"
  | "policy_compliance_eval";
export type TemplateCertificationEvidenceSourceType =
  | "manifest_integrity"
  | "risk_assessment"
  | "wae_eval"
  | "legacy_wae_bridge"
  | "runtime_smoke_eval"
  | "tool_contract_eval"
  | "policy_compliance_eval";
export type TemplateCertificationBlockReasonCode =
  | "certification_missing"
  | "certification_invalid"
  | "certification_mismatch";

export interface TemplateCertificationDependencyManifest {
  contractVersion: typeof TEMPLATE_CERTIFICATION_DEPENDENCY_MANIFEST_CONTRACT_VERSION;
  templateId: string;
  templateVersionId: string;
  templateVersionTag: string;
  baselineDigest: string;
  toolingDigest: string;
  telephonyDigest: string;
  runtimeDigest: string;
  dependencyDigest: string;
  selectedTools: Array<{
    name: string;
    readOnly: boolean;
  }>;
  telephony: {
    provider: string;
    managedToolKeys: string[];
    transferDestinationCount: number;
    phoneChannelEnabled: boolean;
  };
  runtime: {
    modelProvider: string | null;
    modelId: string | null;
    autonomyLevel: string | null;
  };
}

export interface TemplateCertificationRiskAssessment {
  contractVersion: typeof TEMPLATE_CERTIFICATION_RISK_ASSESSMENT_CONTRACT_VERSION;
  tier: TemplateCertificationRiskTier;
  changedFields: string[];
  lowRiskReasons: string[];
  mediumRiskReasons: string[];
  highRiskReasons: string[];
  requiredVerification: TemplateCertificationRequirement[];
  autoCertificationEligible: boolean;
  referenceVersionId?: string;
  referenceVersionTag?: string;
}

export interface TemplateCertificationRiskPolicy {
  contractVersion: typeof TEMPLATE_CERTIFICATION_RISK_POLICY_CONTRACT_VERSION;
  explicitLowRiskFields: string[];
  explicitMediumRiskFields: string[];
  explicitHighRiskFields: string[];
  highRiskFieldKeywords: string[];
  requiredVerificationByTier: {
    low: TemplateCertificationRequirement[];
    medium: TemplateCertificationRequirement[];
    high: TemplateCertificationRequirement[];
  };
  autoCertificationEligibleTiers: TemplateCertificationRiskTier[];
}

interface TemplateCertificationRiskPolicySettings {
  contractVersion: typeof TEMPLATE_CERTIFICATION_RISK_POLICY_SETTINGS_CONTRACT_VERSION;
  globalPolicy: TemplateCertificationRiskPolicy;
  familyPolicies: Record<string, TemplateCertificationRiskPolicy>;
}

export interface TemplateCertificationEvidenceSource {
  sourceType: TemplateCertificationEvidenceSourceType;
  status: "pass" | "fail";
  summary: string;
  runId?: string;
}

export type TemplateCertificationEvaluationOutputOutcome =
  | "pass"
  | "fail"
  | "missing"
  | "skipped";

export interface TemplateCertificationEvaluationOutput {
  sourceType: TemplateCertificationEvidenceSourceType;
  outcome: TemplateCertificationEvaluationOutputOutcome;
  summary?: string;
  runId?: string;
}

export interface TemplateCertificationEvidenceRecordingSummary {
  riskTier: TemplateCertificationRiskTier;
  requiredVerification: TemplateCertificationRequirement[];
  defaultEvidenceSources: TemplateCertificationEvidenceSourceType[];
  ingestedEvaluationOutputs: Array<
    TemplateCertificationEvaluationOutput & {
      usedForEvidence: boolean;
    }
  >;
  recordedEvidenceSources: TemplateCertificationEvidenceSource[];
  missingRequiredVerification: TemplateCertificationRequirement[];
  failedRequiredVerification: TemplateCertificationRequirement[];
  missingDefaultEvidenceSources: TemplateCertificationEvidenceSourceType[];
  blocked: boolean;
  blockedReason: TemplateCertificationDecisionArtifact["reasonCode"] | null;
}

export interface TemplateCertificationDecisionArtifact {
  contractVersion: typeof TEMPLATE_CERTIFICATION_DECISION_CONTRACT_VERSION;
  promotionContractVersion: typeof TEMPLATE_CERTIFICATION_PROMOTION_CONTRACT_VERSION;
  status: "certified" | "rejected";
  reasonCode: "certified" | "verification_failed" | "missing_required_verification";
  templateId: string;
  templateVersionId: string;
  templateVersionTag: string;
  riskAssessment: TemplateCertificationRiskAssessment;
  dependencyManifest: TemplateCertificationDependencyManifest;
  requiredVerification: TemplateCertificationRequirement[];
  evidenceSources: TemplateCertificationEvidenceSource[];
  recordedAt: number;
  recordedByUserId: string;
  notes: string[];
}

export interface TemplateCertificationEvaluationResult {
  allowed: boolean;
  reasonCode?: TemplateCertificationBlockReasonCode;
  message?: string;
  certification: TemplateCertificationDecisionArtifact | null;
  dependencyManifest: TemplateCertificationDependencyManifest | null;
  riskAssessment: TemplateCertificationRiskAssessment | null;
  autoCertificationEligible: boolean;
  legacyWaeGate: WaeRolloutGateDecisionArtifact | null;
}

export interface WaeRolloutGateDecisionArtifact {
  contractVersion: typeof WAE_ROLLOUT_GATE_DECISION_CONTRACT_VERSION;
  rolloutContractVersion: typeof WAE_ROLLOUT_GATE_ROLLOUT_CONTRACT_VERSION;
  status: "pass" | "fail";
  reasonCode: "pass" | WaeRolloutGateBlockReasonCode;
  templateId: string;
  templateVersionId: string;
  templateVersionTag: string;
  runId: string;
  suiteKeyHash: string;
  scenarioMatrixContractVersion: string;
  completedAt: number;
  recordedAt: number;
  recordedByUserId: string;
  freshnessWindowMs: number;
  score: Pick<
    WaeEvalScorePacket,
    | "verdict"
    | "decision"
    | "resultLabel"
    | "weightedScore"
    | "thresholds"
    | "failedMetrics"
    | "warnings"
    | "blockedReasons"
  >;
  scenarioCoverage: {
    totalScenarios: number;
    runnableScenarios: number;
    skippedScenarios: number;
    passedScenarios: number;
    failedScenarios: number;
    evaluatedScenarioIds: string[];
    failedScenarioIds: string[];
    skippedScenarioIds: string[];
  };
  criticalReasonCodeBudget: {
    allowedCount: number;
    observedCount: number;
    observedReasonCodes: string[];
  };
  failureSnapshot: {
    unresolvedCriticalFailures: number;
    failedMetrics: string[];
    blockedReasons: string[];
  };
}

export interface WaeRolloutGateEvaluationResult {
  allowed: boolean;
  reasonCode?: WaeRolloutGateBlockReasonCode;
  message?: string;
  ageMs?: number;
  gate: WaeRolloutGateDecisionArtifact | null;
}

type CurrentDefaultTemplateWaeGateContext = {
  templateId: Id<"objects">;
  templateName: string;
  templateOrganizationId: Id<"organizations">;
  templateVersionId: Id<"objects">;
  templateVersionTag: string;
  templateLifecycleStatus: string;
  templateVersionLifecycleStatus: string;
};

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
const templateCertificationRiskTierValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);
const templateCertificationRequirementValidator = v.union(
  v.literal("manifest_integrity"),
  v.literal("risk_assessment"),
  v.literal("wae_eval"),
  v.literal("behavioral_eval"),
  v.literal("tool_contract_eval"),
  v.literal("policy_compliance_eval"),
);
const templateCertificationEvidenceSourceTypeValidator = v.union(
  v.literal("wae_eval"),
  v.literal("legacy_wae_bridge"),
  v.literal("runtime_smoke_eval"),
  v.literal("tool_contract_eval"),
  v.literal("policy_compliance_eval"),
);
const templateCertificationEvaluationOutputOutcomeValidator = v.union(
  v.literal("pass"),
  v.literal("fail"),
  v.literal("missing"),
  v.literal("skipped"),
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
  published?: boolean;
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
  templateCloneBridge?: {
    contractVersion: typeof SEED_TEMPLATE_BRIDGE_CONTRACT_VERSION;
    precedenceOrder: Array<(typeof TEMPLATE_CLONE_PRECEDENCE_ORDER)[number]>;
    roleBoundary: "super_admin_global_templates";
    legacyCompatibilityMode: "managed_seed" | "legacy_unmanaged";
    templateCloneLinkageContractVersion?: typeof TEMPLATE_CLONE_LINKAGE_CONTRACT_VERSION;
    systemTemplateAgentId?: string;
    protectedTemplate: boolean;
    immutableOriginContractMapped: boolean;
  };
  sourcePath: string;
  createdAt: number;
  updatedAt: number;
};

type SeedTemplateBridgeContract = {
  contractVersion: typeof SEED_TEMPLATE_BRIDGE_CONTRACT_VERSION;
  precedenceOrder: Array<(typeof TEMPLATE_CLONE_PRECEDENCE_ORDER)[number]>;
  roleBoundary: "super_admin_global_templates";
  legacyCompatibilityMode: "managed_seed" | "legacy_unmanaged";
  templateCloneLinkageContractVersion?: typeof TEMPLATE_CLONE_LINKAGE_CONTRACT_VERSION;
  systemTemplateAgentId?: string;
  protectedTemplate: boolean;
  immutableOriginContractMapped: boolean;
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
    published?: number;
    blockedAgents?: number;
    recommendationTagged?: number;
    recommendationMetadataStored?: number;
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

function normalizeFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeLexicalStrings(values: Iterable<unknown>): string[] {
  return Array.from(
    new Set(
      Array.from(values)
        .map((value) => normalizeOptionalString(value))
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function normalizeUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function isCriticalWaeReasonCode(reasonCode: string): boolean {
  if (reasonCode.startsWith("pending_feature:")) {
    return false;
  }
  return WAE_ROLLOUT_GATE_CRITICAL_REASON_PREFIXES.some(
    (prefix) => reasonCode === prefix || reasonCode.startsWith(`${prefix}:`),
  );
}

function collectCriticalWaeReasonCodes(args: {
  score: WaeEvalScorePacket;
  scenarioRecords: WaeEvalScenarioRecordInput[];
}): string[] {
  const observed = new Set<string>();

  for (const blockedReason of args.score.blockedReasons) {
    const normalized = normalizeOptionalString(blockedReason);
    if (normalized) {
      observed.add(normalized);
    }
  }

  for (const scenario of args.scenarioRecords) {
    for (const reasonCode of scenario.reasonCodes) {
      if (!isCriticalWaeReasonCode(reasonCode)) {
        continue;
      }
      observed.add(`scenario:${scenario.scenarioId}:${reasonCode}`);
    }
  }

  return [...observed].sort((left, right) => left.localeCompare(right));
}

export function buildWaeRolloutGateDecisionArtifact(args: {
  templateId: string;
  templateVersionId: string;
  templateVersionTag: string;
  runRecord: WaeEvalRunRecordInput;
  scenarioRecords: WaeEvalScenarioRecordInput[];
  score: WaeEvalScorePacket;
  recordedAt: number;
  completedAt: number;
  recordedByUserId: string;
}): WaeRolloutGateDecisionArtifact {
  const failedScenarioIds = normalizeLexicalStrings(
    args.score.scenarioBreakdown
      .filter((scenario) => scenario.failedMetrics.length > 0)
      .map((scenario) => scenario.scenarioId),
  );
  const skippedScenarioIds = normalizeLexicalStrings(
    args.scenarioRecords
      .filter((scenario) => scenario.actualVerdict === "SKIPPED")
      .map((scenario) => scenario.scenarioId),
  );
  const criticalReasonCodes = collectCriticalWaeReasonCodes({
    score: args.score,
    scenarioRecords: args.scenarioRecords,
  });
  const passed =
    args.runRecord.lifecycleStatus === "passed"
    && args.score.verdict === "passed"
    && args.score.decision === "proceed"
    && criticalReasonCodes.length === 0;

  return {
    contractVersion: WAE_ROLLOUT_GATE_DECISION_CONTRACT_VERSION,
    rolloutContractVersion: WAE_ROLLOUT_GATE_ROLLOUT_CONTRACT_VERSION,
    status: passed ? "pass" : "fail",
    reasonCode: passed ? "pass" : "wae_gate_failed",
    templateId: args.templateId,
    templateVersionId: args.templateVersionId,
    templateVersionTag: args.templateVersionTag,
    runId: args.runRecord.runId,
    suiteKeyHash: args.runRecord.suiteKeyHash,
    scenarioMatrixContractVersion: args.runRecord.scenarioMatrixContractVersion,
    completedAt: args.completedAt,
    recordedAt: args.recordedAt,
    recordedByUserId: args.recordedByUserId,
    freshnessWindowMs: WAE_ROLLOUT_GATE_MAX_AGE_MS,
    score: {
      verdict: args.score.verdict,
      decision: args.score.decision,
      resultLabel: args.score.resultLabel,
      weightedScore: args.score.weightedScore,
      thresholds: args.score.thresholds,
      failedMetrics: [...args.score.failedMetrics],
      warnings: [...args.score.warnings],
      blockedReasons: [...args.score.blockedReasons],
    },
    scenarioCoverage: {
      totalScenarios: args.runRecord.counts.scenarios,
      runnableScenarios: args.score.counts.runnable,
      skippedScenarios: args.score.counts.skipped,
      passedScenarios: args.score.counts.passed,
      failedScenarios: args.score.counts.failed,
      evaluatedScenarioIds: normalizeLexicalStrings(
        args.scenarioRecords.map((scenario) => scenario.scenarioId),
      ),
      failedScenarioIds,
      skippedScenarioIds,
    },
    criticalReasonCodeBudget: {
      allowedCount: 0,
      observedCount: criticalReasonCodes.length,
      observedReasonCodes: criticalReasonCodes,
    },
    failureSnapshot: {
      unresolvedCriticalFailures: failedScenarioIds.length + args.score.blockedReasons.length,
      failedMetrics: [...args.score.failedMetrics],
      blockedReasons: [...args.score.blockedReasons],
    },
  };
}

function parseWaeRolloutGateDecisionArtifact(
  value: unknown,
): WaeRolloutGateDecisionArtifact | null {
  const record = asRecord(value);
  const contractVersion = normalizeOptionalString(record.contractVersion);
  const rolloutContractVersion = normalizeOptionalString(record.rolloutContractVersion);
  const status = normalizeOptionalString(record.status);
  const reasonCode = normalizeOptionalString(record.reasonCode);
  const templateId = normalizeOptionalString(record.templateId);
  const templateVersionId = normalizeOptionalString(record.templateVersionId);
  const templateVersionTag = normalizeOptionalString(record.templateVersionTag);
  const runId = normalizeOptionalString(record.runId);
  const suiteKeyHash = normalizeOptionalString(record.suiteKeyHash);
  const scenarioMatrixContractVersion = normalizeOptionalString(
    record.scenarioMatrixContractVersion,
  );
  const completedAt = normalizeFiniteNumber(record.completedAt);
  const recordedAt = normalizeFiniteNumber(record.recordedAt);
  const recordedByUserId = normalizeOptionalString(record.recordedByUserId);
  const freshnessWindowMs = normalizeFiniteNumber(record.freshnessWindowMs);
  const score = asRecord(record.score);
  const thresholds = asRecord(score.thresholds);
  const scenarioCoverage = asRecord(record.scenarioCoverage);
  const criticalReasonCodeBudget = asRecord(record.criticalReasonCodeBudget);
  const failureSnapshot = asRecord(record.failureSnapshot);

  if (
    contractVersion !== WAE_ROLLOUT_GATE_DECISION_CONTRACT_VERSION
    || rolloutContractVersion !== WAE_ROLLOUT_GATE_ROLLOUT_CONTRACT_VERSION
    || (status !== "pass" && status !== "fail")
    || (reasonCode !== "pass"
      && reasonCode !== "wae_evidence_missing"
      && reasonCode !== "wae_evidence_stale"
      && reasonCode !== "wae_gate_failed"
      && reasonCode !== "wae_evidence_mismatch")
    || !templateId
    || !templateVersionId
    || !templateVersionTag
    || !runId
    || !suiteKeyHash
    || !scenarioMatrixContractVersion
    || completedAt === null
    || recordedAt === null
    || !recordedByUserId
    || freshnessWindowMs === null
  ) {
    return null;
  }

  const scoreVerdict = normalizeOptionalString(score.verdict);
  const scoreDecision = normalizeOptionalString(score.decision);
  const scoreResultLabel = normalizeOptionalString(score.resultLabel);
  if (
    (scoreVerdict !== "passed" && scoreVerdict !== "failed" && scoreVerdict !== "blocked")
    || (scoreDecision !== "proceed" && scoreDecision !== "hold")
    || (scoreResultLabel !== "PASS" && scoreResultLabel !== "FAIL")
  ) {
    return null;
  }

  return {
    contractVersion: WAE_ROLLOUT_GATE_DECISION_CONTRACT_VERSION,
    rolloutContractVersion: WAE_ROLLOUT_GATE_ROLLOUT_CONTRACT_VERSION,
    status,
    reasonCode: reasonCode as WaeRolloutGateDecisionArtifact["reasonCode"],
    templateId,
    templateVersionId,
    templateVersionTag,
    runId,
    suiteKeyHash,
    scenarioMatrixContractVersion,
    completedAt,
    recordedAt,
    recordedByUserId,
    freshnessWindowMs,
    score: {
      verdict: scoreVerdict as WaeEvalScorePacket["verdict"],
      decision: scoreDecision as WaeEvalScorePacket["decision"],
      resultLabel: scoreResultLabel as WaeEvalScorePacket["resultLabel"],
      weightedScore: normalizeFiniteNumber(score.weightedScore) ?? 0,
      thresholds: {
        pass: normalizeFiniteNumber(thresholds.pass) ?? 0,
        hold: normalizeFiniteNumber(thresholds.hold) ?? 0,
      },
      failedMetrics: normalizeLexicalStrings(normalizeUnknownArray(score.failedMetrics)),
      warnings: normalizeLexicalStrings(normalizeUnknownArray(score.warnings)),
      blockedReasons: normalizeLexicalStrings(normalizeUnknownArray(score.blockedReasons)),
    },
    scenarioCoverage: {
      totalScenarios: normalizeFiniteNumber(scenarioCoverage.totalScenarios) ?? 0,
      runnableScenarios: normalizeFiniteNumber(scenarioCoverage.runnableScenarios) ?? 0,
      skippedScenarios: normalizeFiniteNumber(scenarioCoverage.skippedScenarios) ?? 0,
      passedScenarios: normalizeFiniteNumber(scenarioCoverage.passedScenarios) ?? 0,
      failedScenarios: normalizeFiniteNumber(scenarioCoverage.failedScenarios) ?? 0,
      evaluatedScenarioIds: normalizeLexicalStrings(
        normalizeUnknownArray(scenarioCoverage.evaluatedScenarioIds),
      ),
      failedScenarioIds: normalizeLexicalStrings(
        normalizeUnknownArray(scenarioCoverage.failedScenarioIds),
      ),
      skippedScenarioIds: normalizeLexicalStrings(
        normalizeUnknownArray(scenarioCoverage.skippedScenarioIds),
      ),
    },
    criticalReasonCodeBudget: {
      allowedCount: normalizeFiniteNumber(criticalReasonCodeBudget.allowedCount) ?? 0,
      observedCount: normalizeFiniteNumber(criticalReasonCodeBudget.observedCount) ?? 0,
      observedReasonCodes: normalizeLexicalStrings(
        normalizeUnknownArray(criticalReasonCodeBudget.observedReasonCodes),
      ),
    },
    failureSnapshot: {
      unresolvedCriticalFailures:
        normalizeFiniteNumber(failureSnapshot.unresolvedCriticalFailures) ?? 0,
      failedMetrics: normalizeLexicalStrings(normalizeUnknownArray(failureSnapshot.failedMetrics)),
      blockedReasons: normalizeLexicalStrings(normalizeUnknownArray(failureSnapshot.blockedReasons)),
    },
  };
}

function toStableComparableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => toStableComparableValue(entry));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => [key, toStableComparableValue(record[key])]),
  );
}

function stableJsonStringify(value: unknown): string {
  return JSON.stringify(toStableComparableValue(value));
}

function normalizeStringArray(value: unknown): string[] {
  return normalizeLexicalStrings(normalizeUnknownArray(value));
}

function isToolReadOnly(toolName: string): boolean {
  return TOOL_REGISTRY[toolName]?.readOnly === true;
}

function resolveManagedToolKeys(value: unknown): string[] {
  return Object.keys(asRecord(value)).sort((left, right) => left.localeCompare(right));
}

function normalizeTransferDestinations(
  value: unknown,
): Array<Record<string, unknown>> {
  return normalizeAgentTelephonyConfig({
    selectedProvider: "elevenlabs",
    elevenlabs: {
      transferDestinations: Array.isArray(value) ? value : [],
    },
  }).elevenlabs.transferDestinations.map((destination) =>
    toStableComparableValue(destination) as Record<string, unknown>,
  );
}

function normalizeTemplateCertificationBaselineSnapshot(
  customProperties: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!customProperties) {
    return {};
  }
  const snapshot = { ...customProperties };
  if (Object.prototype.hasOwnProperty.call(snapshot, "telephonyConfig")) {
    snapshot.telephonyConfig = toDeployableTelephonyConfig(snapshot.telephonyConfig);
  }
  delete snapshot.totalMessages;
  delete snapshot.totalCostUsd;
  delete snapshot.templateLifecycleContractVersion;
  delete snapshot.templateLifecycleStatus;
  delete snapshot.templateLifecycleUpdatedAt;
  delete snapshot.templateLifecycleUpdatedBy;
  delete snapshot.templatePublishedVersion;
  delete snapshot.templatePublishedVersionId;
  delete snapshot.templateCurrentVersion;
  delete snapshot.templateLastVersionSnapshotId;
  return snapshot;
}

function resolveTemplateVersionBaselineSnapshot(
  versionCustomProperties: Record<string, unknown>,
): Record<string, unknown> {
  const snapshotRecord = asRecord(versionCustomProperties.snapshot);
  const baseline = asRecord(snapshotRecord.baselineCustomProperties);
  return Object.keys(baseline).length > 0
    ? normalizeTemplateCertificationBaselineSnapshot(baseline)
    : normalizeTemplateCertificationBaselineSnapshot(versionCustomProperties);
}

function deriveTemplateCertificationChangedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return Array.from(keys)
    .filter((key) => stableJsonStringify(before[key]) !== stableJsonStringify(after[key]))
    .sort((left, right) => left.localeCompare(right));
}

function buildTemplateCertificationDependencyManifest(args: {
  templateId: string;
  templateVersionId: string;
  templateVersionTag: string;
  baselineSnapshot: Record<string, unknown>;
}): TemplateCertificationDependencyManifest {
  const enabledTools = normalizeDeterministicToolNames(
    normalizeUnknownArray(args.baselineSnapshot.enabledTools).filter(
      (entry): entry is string => typeof entry === "string",
    ),
  );
  const disabledTools = normalizeDeterministicToolNames(
    normalizeUnknownArray(args.baselineSnapshot.disabledTools).filter(
      (entry): entry is string => typeof entry === "string",
    ),
  );
  const selectedToolNames = normalizeDeterministicToolNames([
    ...enabledTools,
    ...disabledTools,
  ]);
  const selectedTools = selectedToolNames.map((name) => ({
    name,
    readOnly: isToolReadOnly(name),
  }));
  const telephonyConfig = normalizeAgentTelephonyConfig(
    args.baselineSnapshot.telephonyConfig,
  );
  const deployableTelephonyConfig = toDeployableTelephonyConfig(
    args.baselineSnapshot.telephonyConfig,
  );
  const toolingDigest = simpleHash(
    stableJsonStringify({
      enabledTools,
      disabledTools,
      selectedTools,
    }),
  );
  const telephonyDigest = simpleHash(
    stableJsonStringify({
      deployableTelephonyConfig,
      managedToolKeys: resolveManagedToolKeys(telephonyConfig.elevenlabs.managedTools),
      transferDestinations: normalizeTransferDestinations(
        telephonyConfig.elevenlabs.transferDestinations,
      ),
    }),
  );
  const runtimeDigest = simpleHash(
    stableJsonStringify({
      modelProvider: normalizeOptionalString(args.baselineSnapshot.modelProvider),
      modelId: normalizeOptionalString(args.baselineSnapshot.modelId),
      autonomyLevel: normalizeOptionalString(args.baselineSnapshot.autonomyLevel),
      channelBindings: toStableComparableValue(args.baselineSnapshot.channelBindings ?? []),
    }),
  );
  const baselineDigest = simpleHash(stableJsonStringify(args.baselineSnapshot));

  const manifestBase = {
    contractVersion: TEMPLATE_CERTIFICATION_DEPENDENCY_MANIFEST_CONTRACT_VERSION,
    templateId: args.templateId,
    templateVersionId: args.templateVersionId,
    templateVersionTag: args.templateVersionTag,
    baselineDigest,
    toolingDigest,
    telephonyDigest,
    runtimeDigest,
    selectedTools,
    telephony: {
      provider: telephonyConfig.selectedProvider,
      managedToolKeys: resolveManagedToolKeys(telephonyConfig.elevenlabs.managedTools),
      transferDestinationCount: telephonyConfig.elevenlabs.transferDestinations.length,
      phoneChannelEnabled: Array.isArray(args.baselineSnapshot.channelBindings)
        && args.baselineSnapshot.channelBindings.some((binding) => {
          if (!binding || typeof binding !== "object") {
            return false;
          }
          const record = binding as Record<string, unknown>;
          return record.channel === "phone_call" && record.enabled === true;
        }),
    },
    runtime: {
      modelProvider: normalizeOptionalString(args.baselineSnapshot.modelProvider),
      modelId: normalizeOptionalString(args.baselineSnapshot.modelId),
      autonomyLevel: normalizeOptionalString(args.baselineSnapshot.autonomyLevel),
    },
  } satisfies Omit<TemplateCertificationDependencyManifest, "dependencyDigest">;

  return {
    ...manifestBase,
    dependencyDigest: simpleHash(stableJsonStringify(manifestBase)),
  };
}

function isTemplateCertificationRequirement(
  value: string,
): value is TemplateCertificationRequirement {
  return value === "manifest_integrity"
    || value === "risk_assessment"
    || value === "wae_eval"
    || value === "behavioral_eval"
    || value === "tool_contract_eval"
    || value === "policy_compliance_eval";
}

function normalizeTemplateCertificationRequirementList(
  value: unknown,
  fallback: TemplateCertificationRequirement[],
): TemplateCertificationRequirement[] {
  const normalized = normalizeStringArray(value).filter(isTemplateCertificationRequirement);
  return normalized.length > 0 ? normalized : [...fallback];
}

function normalizeTemplateCertificationRiskTierList(
  value: unknown,
  fallback: TemplateCertificationRiskTier[],
): TemplateCertificationRiskTier[] {
  const normalized = normalizeStringArray(value).filter(
    (entry): entry is TemplateCertificationRiskTier =>
      entry === "low" || entry === "medium" || entry === "high",
  );
  return normalized.length > 0 ? normalized : [...fallback];
}

function normalizeTemplateCertificationFamilyKey(value: unknown): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  const key = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return key.length > 0 ? key : null;
}

const DEFAULT_TEMPLATE_CERTIFICATION_RISK_POLICY: TemplateCertificationRiskPolicy = {
  contractVersion: TEMPLATE_CERTIFICATION_RISK_POLICY_CONTRACT_VERSION,
  explicitLowRiskFields: [
    "displayName",
    "faqEntries",
    "knowledgeBaseTags",
  ],
  explicitMediumRiskFields: [
    "systemPrompt",
    "toolProfile",
  ],
  explicitHighRiskFields: [
    "autonomyLevel",
    "channelBindings",
    "escalationPolicy",
    "modeChannelBindings",
    "modelId",
    "modelProvider",
    "operatorCollaborationDefaults",
    "teamAccessMode",
    "templateRole",
    "templateScope",
  ],
  highRiskFieldKeywords: [
    "binding",
    "policy",
    "provider",
    "route",
    "runtime",
  ],
  requiredVerificationByTier: {
    low: ["manifest_integrity", "risk_assessment"],
    medium: ["manifest_integrity", "risk_assessment", "wae_eval"],
    high: ["manifest_integrity", "risk_assessment", "wae_eval"],
  },
  autoCertificationEligibleTiers: ["low"],
};

function normalizeTemplateCertificationRiskPolicy(
  value: unknown,
): TemplateCertificationRiskPolicy {
  const record = asRecord(value);
  const requiredVerificationByTier = asRecord(record.requiredVerificationByTier);
  return {
    contractVersion: TEMPLATE_CERTIFICATION_RISK_POLICY_CONTRACT_VERSION,
    explicitLowRiskFields: normalizeStringArray(record.explicitLowRiskFields),
    explicitMediumRiskFields: normalizeStringArray(record.explicitMediumRiskFields),
    explicitHighRiskFields: normalizeStringArray(record.explicitHighRiskFields),
    highRiskFieldKeywords: normalizeStringArray(record.highRiskFieldKeywords),
    requiredVerificationByTier: {
      low: normalizeTemplateCertificationRequirementList(
        requiredVerificationByTier.low,
        DEFAULT_TEMPLATE_CERTIFICATION_RISK_POLICY.requiredVerificationByTier.low,
      ),
      medium: normalizeTemplateCertificationRequirementList(
        requiredVerificationByTier.medium,
        DEFAULT_TEMPLATE_CERTIFICATION_RISK_POLICY.requiredVerificationByTier.medium,
      ),
      high: normalizeTemplateCertificationRequirementList(
        requiredVerificationByTier.high,
        DEFAULT_TEMPLATE_CERTIFICATION_RISK_POLICY.requiredVerificationByTier.high,
      ),
    },
    autoCertificationEligibleTiers: normalizeTemplateCertificationRiskTierList(
      record.autoCertificationEligibleTiers,
      DEFAULT_TEMPLATE_CERTIFICATION_RISK_POLICY.autoCertificationEligibleTiers,
    ),
  };
}

function mergeTemplateCertificationRiskPolicy(
  current: TemplateCertificationRiskPolicy,
  overrides: unknown,
): TemplateCertificationRiskPolicy {
  const record = asRecord(overrides);
  const requiredVerificationByTier = asRecord(record.requiredVerificationByTier);
  return normalizeTemplateCertificationRiskPolicy({
    ...current,
    ...(Object.prototype.hasOwnProperty.call(record, "explicitLowRiskFields")
      ? { explicitLowRiskFields: record.explicitLowRiskFields }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(record, "explicitMediumRiskFields")
      ? { explicitMediumRiskFields: record.explicitMediumRiskFields }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(record, "explicitHighRiskFields")
      ? { explicitHighRiskFields: record.explicitHighRiskFields }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(record, "highRiskFieldKeywords")
      ? { highRiskFieldKeywords: record.highRiskFieldKeywords }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(record, "requiredVerificationByTier")
      ? {
          requiredVerificationByTier: {
            ...current.requiredVerificationByTier,
            ...(Object.prototype.hasOwnProperty.call(requiredVerificationByTier, "low")
              ? { low: requiredVerificationByTier.low }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(requiredVerificationByTier, "medium")
              ? { medium: requiredVerificationByTier.medium }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(requiredVerificationByTier, "high")
              ? { high: requiredVerificationByTier.high }
              : {}),
          },
        }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(record, "autoCertificationEligibleTiers")
      ? { autoCertificationEligibleTiers: record.autoCertificationEligibleTiers }
      : {}),
  });
}

function normalizeTemplateCertificationRiskPolicySettings(
  value: unknown,
): TemplateCertificationRiskPolicySettings {
  const record = asRecord(value);
  const hasExplicitSettingsShape =
    Object.prototype.hasOwnProperty.call(record, "globalPolicy")
    || Object.prototype.hasOwnProperty.call(record, "familyPolicies");

  const globalPolicy = normalizeTemplateCertificationRiskPolicy(
    hasExplicitSettingsShape ? record.globalPolicy : value,
  );
  const familyPoliciesRecord = hasExplicitSettingsShape ? asRecord(record.familyPolicies) : {};
  const familyPolicies: Record<string, TemplateCertificationRiskPolicy> = {};
  for (const [rawKey, rawPolicy] of Object.entries(familyPoliciesRecord)) {
    const key = normalizeTemplateCertificationFamilyKey(rawKey);
    if (!key) {
      continue;
    }
    familyPolicies[key] = normalizeTemplateCertificationRiskPolicy(rawPolicy);
  }

  return {
    contractVersion: TEMPLATE_CERTIFICATION_RISK_POLICY_SETTINGS_CONTRACT_VERSION,
    globalPolicy,
    familyPolicies,
  };
}

async function readTemplateCertificationRiskPolicy(
  ctx: QueryCtx | MutationCtx,
  args?: {
    templateFamily?: string | null;
  },
): Promise<{
  policy: TemplateCertificationRiskPolicy;
  globalPolicy: TemplateCertificationRiskPolicy;
  familyPolicies: Record<string, TemplateCertificationRiskPolicy>;
  scope: "global" | "family";
  templateFamily?: string;
  overlayPolicy?: TemplateCertificationRiskPolicy;
  source: "default" | "platform_setting";
  updatedAt?: number;
}> {
  const requestedFamily = normalizeTemplateCertificationFamilyKey(args?.templateFamily);
  const dbAny = ctx.db as any;
  const settingRows = await dbAny
    .query("platformSettings")
    .withIndex("by_key", (q: any) => q.eq("key", TEMPLATE_CERTIFICATION_RISK_POLICY_SETTING_KEY))
    .collect();
  const setting = settingRows[0] ?? null;
  const settings = setting
    ? normalizeTemplateCertificationRiskPolicySettings(setting.value)
    : {
        contractVersion: TEMPLATE_CERTIFICATION_RISK_POLICY_SETTINGS_CONTRACT_VERSION,
        globalPolicy: DEFAULT_TEMPLATE_CERTIFICATION_RISK_POLICY,
        familyPolicies: {},
      } satisfies TemplateCertificationRiskPolicySettings;
  const overlayPolicy = requestedFamily ? settings.familyPolicies[requestedFamily] : undefined;
  const scope: "global" | "family" = overlayPolicy ? "family" : "global";

  if (!setting) {
    return {
      policy: overlayPolicy ?? settings.globalPolicy,
      globalPolicy: settings.globalPolicy,
      familyPolicies: settings.familyPolicies,
      scope,
      ...(requestedFamily ? { templateFamily: requestedFamily } : {}),
      ...(overlayPolicy ? { overlayPolicy } : {}),
      source: "default",
    };
  }
  return {
    policy: overlayPolicy ?? settings.globalPolicy,
    globalPolicy: settings.globalPolicy,
    familyPolicies: settings.familyPolicies,
    scope,
    ...(requestedFamily ? { templateFamily: requestedFamily } : {}),
    ...(overlayPolicy ? { overlayPolicy } : {}),
    source: "platform_setting",
    ...(typeof setting.updatedAt === "number" && Number.isFinite(setting.updatedAt)
      ? { updatedAt: setting.updatedAt }
      : {}),
  };
}

function resolveRequiredVerificationForRiskTier(
  tier: TemplateCertificationRiskTier,
  policy: TemplateCertificationRiskPolicy,
): TemplateCertificationRequirement[] {
  return [...policy.requiredVerificationByTier[tier]];
}

function buildTemplateCertificationRiskAssessment(args: {
  currentBaseline: Record<string, unknown>;
  referenceBaseline?: Record<string, unknown> | null;
  referenceVersionId?: string | null;
  referenceVersionTag?: string | null;
  riskPolicy: TemplateCertificationRiskPolicy;
}): TemplateCertificationRiskAssessment {
  const before = args.referenceBaseline ?? {};
  const after = args.currentBaseline;
  const changedFields = deriveTemplateCertificationChangedFields(before, after);
  const lowRiskReasons: string[] = [];
  const mediumRiskReasons: string[] = [];
  const highRiskReasons: string[] = [];

  const beforeEnabledTools = normalizeDeterministicToolNames(
    normalizeUnknownArray(before.enabledTools).filter(
      (entry): entry is string => typeof entry === "string",
    ),
  );
  const afterEnabledTools = normalizeDeterministicToolNames(
    normalizeUnknownArray(after.enabledTools).filter(
      (entry): entry is string => typeof entry === "string",
    ),
  );
  const beforeDisabledTools = normalizeDeterministicToolNames(
    normalizeUnknownArray(before.disabledTools).filter(
      (entry): entry is string => typeof entry === "string",
    ),
  );
  const afterDisabledTools = normalizeDeterministicToolNames(
    normalizeUnknownArray(after.disabledTools).filter(
      (entry): entry is string => typeof entry === "string",
    ),
  );
  const toolDelta = normalizeDeterministicToolNames([
    ...beforeEnabledTools.filter((tool) => !afterEnabledTools.includes(tool)),
    ...afterEnabledTools.filter((tool) => !beforeEnabledTools.includes(tool)),
    ...beforeDisabledTools.filter((tool) => !afterDisabledTools.includes(tool)),
    ...afterDisabledTools.filter((tool) => !beforeDisabledTools.includes(tool)),
  ]);
  const mutatingToolDelta = toolDelta.filter((tool) => !isToolReadOnly(tool));
  if (mutatingToolDelta.length > 0) {
    highRiskReasons.push(
      `Mutating tool contract changed: ${mutatingToolDelta.join(", ")}.`,
    );
  } else if (toolDelta.length > 0) {
    mediumRiskReasons.push(
      `Non-mutating tool contract changed: ${toolDelta.join(", ")}.`,
    );
  }

  const beforeTelephony = normalizeAgentTelephonyConfig(before.telephonyConfig);
  const afterTelephony = normalizeAgentTelephonyConfig(after.telephonyConfig);
  if (beforeTelephony.selectedProvider !== afterTelephony.selectedProvider) {
    highRiskReasons.push("Telephony provider routing changed.");
  }
  if (
    stableJsonStringify(beforeTelephony.elevenlabs.managedTools)
    !== stableJsonStringify(afterTelephony.elevenlabs.managedTools)
  ) {
    highRiskReasons.push("Telephony managed tool behavior changed.");
  }
  if (
    stableJsonStringify(beforeTelephony.elevenlabs.workflow)
    !== stableJsonStringify(afterTelephony.elevenlabs.workflow)
  ) {
    mediumRiskReasons.push("Telephony workflow changed.");
  }
  if (beforeTelephony.elevenlabs.systemPrompt !== afterTelephony.elevenlabs.systemPrompt) {
    mediumRiskReasons.push("Telephony system prompt changed.");
  }
  if (
    beforeTelephony.elevenlabs.firstMessage !== afterTelephony.elevenlabs.firstMessage
    || beforeTelephony.elevenlabs.knowledgeBase !== afterTelephony.elevenlabs.knowledgeBase
    || beforeTelephony.elevenlabs.knowledgeBaseName
      !== afterTelephony.elevenlabs.knowledgeBaseName
    || stableJsonStringify(beforeTelephony.elevenlabs.transferDestinations)
      !== stableJsonStringify(afterTelephony.elevenlabs.transferDestinations)
  ) {
    lowRiskReasons.push("Telephony copy, knowledge base, or transfer targets changed.");
  }

  const explicitLowRiskFields = new Set(args.riskPolicy.explicitLowRiskFields);
  const explicitMediumRiskFields = new Set(args.riskPolicy.explicitMediumRiskFields);
  const explicitHighRiskFields = new Set(args.riskPolicy.explicitHighRiskFields);
  const highRiskFieldKeywords = args.riskPolicy.highRiskFieldKeywords.map((entry) =>
    entry.toLowerCase(),
  );

  for (const field of changedFields) {
    if (field === "enabledTools" || field === "disabledTools" || field === "telephonyConfig") {
      continue;
    }
    if (explicitHighRiskFields.has(field)) {
      highRiskReasons.push(`${field} changed.`);
      continue;
    }
    if (explicitMediumRiskFields.has(field)) {
      mediumRiskReasons.push(`${field} changed.`);
      continue;
    }
    if (explicitLowRiskFields.has(field)) {
      lowRiskReasons.push(`${field} changed.`);
      continue;
    }
    if (highRiskFieldKeywords.some((keyword) => field.toLowerCase().includes(keyword))) {
      highRiskReasons.push(`${field} changed.`);
      continue;
    }
    mediumRiskReasons.push(`${field} changed.`);
  }

  const tier: TemplateCertificationRiskTier =
    highRiskReasons.length > 0
      ? "high"
      : mediumRiskReasons.length > 0
        ? "medium"
        : "low";

  return {
    contractVersion: TEMPLATE_CERTIFICATION_RISK_ASSESSMENT_CONTRACT_VERSION,
    tier,
    changedFields,
    lowRiskReasons: normalizeStringArray(lowRiskReasons),
    mediumRiskReasons: normalizeStringArray(mediumRiskReasons),
    highRiskReasons: normalizeStringArray(highRiskReasons),
    requiredVerification: resolveRequiredVerificationForRiskTier(tier, args.riskPolicy),
    autoCertificationEligible: args.riskPolicy.autoCertificationEligibleTiers.includes(tier),
    ...(normalizeOptionalString(args.referenceVersionId)
      ? { referenceVersionId: normalizeOptionalString(args.referenceVersionId)! }
      : {}),
    ...(normalizeOptionalString(args.referenceVersionTag)
      ? { referenceVersionTag: normalizeOptionalString(args.referenceVersionTag)! }
      : {}),
  };
}

function requirementMatchesSourceType(
  requirement: TemplateCertificationRequirement,
  sourceType: TemplateCertificationEvidenceSourceType,
): boolean {
  if (requirement === "wae_eval") {
    return sourceType === "wae_eval" || sourceType === "legacy_wae_bridge";
  }
  if (requirement === "behavioral_eval") {
    return sourceType === "wae_eval"
      || sourceType === "legacy_wae_bridge"
      || sourceType === "runtime_smoke_eval";
  }
  if (requirement === "tool_contract_eval") {
    return sourceType === "tool_contract_eval";
  }
  if (requirement === "policy_compliance_eval") {
    return sourceType === "policy_compliance_eval";
  }
  return sourceType === requirement;
}

function requirementSatisfiedBySource(
  requirement: TemplateCertificationRequirement,
  source: TemplateCertificationEvidenceSource,
): boolean {
  return source.status === "pass"
    && requirementMatchesSourceType(requirement, source.sourceType);
}

const TEMPLATE_CERTIFICATION_AUTOMATION_TIER_DEFAULT_EVIDENCE_SOURCES: Record<
  TemplateCertificationRiskTier,
  TemplateCertificationEvidenceSourceType[]
> = {
  low: ["runtime_smoke_eval"],
  medium: ["runtime_smoke_eval", "tool_contract_eval", "policy_compliance_eval"],
  high: [],
};

function normalizeTemplateCertificationEvidenceSourceType(
  value: unknown,
): TemplateCertificationEvidenceSourceType | null {
  const sourceType = normalizeOptionalString(value);
  if (
    sourceType !== "manifest_integrity"
    && sourceType !== "risk_assessment"
    && sourceType !== "wae_eval"
    && sourceType !== "legacy_wae_bridge"
    && sourceType !== "runtime_smoke_eval"
    && sourceType !== "tool_contract_eval"
    && sourceType !== "policy_compliance_eval"
  ) {
    return null;
  }
  return sourceType;
}

function isTemplateCertificationEvaluationOutputOutcome(
  value: unknown,
): value is TemplateCertificationEvaluationOutputOutcome {
  return value === "pass" || value === "fail" || value === "missing" || value === "skipped";
}

function isTemplateCertificationEvidenceStatusFromOutput(
  value: TemplateCertificationEvaluationOutputOutcome,
): value is "pass" | "fail" {
  return value === "pass" || value === "fail";
}

function normalizeTemplateCertificationEvaluationOutput(
  output: TemplateCertificationEvaluationOutput,
): TemplateCertificationEvaluationOutput | null {
  const sourceType = normalizeTemplateCertificationEvidenceSourceType(output.sourceType);
  if (
    !sourceType
    || sourceType === "manifest_integrity"
    || sourceType === "risk_assessment"
    || sourceType === "legacy_wae_bridge"
  ) {
    return null;
  }
  if (!isTemplateCertificationEvaluationOutputOutcome(output.outcome)) {
    return null;
  }
  const summary = normalizeOptionalString(output.summary);
  const runId = normalizeOptionalString(output.runId);
  return {
    sourceType,
    outcome: output.outcome,
    ...(summary ? { summary } : {}),
    ...(runId ? { runId } : {}),
  };
}

function resolveTemplateCertificationEvaluationOutputRank(
  output: TemplateCertificationEvaluationOutput,
): number {
  if (output.outcome === "fail") {
    return 3;
  }
  if (output.outcome === "pass") {
    return 2;
  }
  if (output.outcome === "missing") {
    return 1;
  }
  return 0;
}

function dedupeTemplateCertificationEvaluationOutputs(
  outputs: TemplateCertificationEvaluationOutput[],
): TemplateCertificationEvaluationOutput[] {
  const bySourceType = new Map<TemplateCertificationEvidenceSourceType, TemplateCertificationEvaluationOutput>();
  for (const output of outputs) {
    const current = bySourceType.get(output.sourceType);
    if (!current) {
      bySourceType.set(output.sourceType, output);
      continue;
    }
    const currentRank = resolveTemplateCertificationEvaluationOutputRank(current);
    const nextRank = resolveTemplateCertificationEvaluationOutputRank(output);
    if (nextRank > currentRank) {
      bySourceType.set(output.sourceType, output);
      continue;
    }
    if (nextRank < currentRank) {
      continue;
    }
    const currentTieBreaker = `${current.runId ?? ""}:${current.summary ?? ""}`;
    const nextTieBreaker = `${output.runId ?? ""}:${output.summary ?? ""}`;
    if (nextTieBreaker.localeCompare(currentTieBreaker) > 0) {
      bySourceType.set(output.sourceType, output);
    }
  }
  return Array.from(bySourceType.values()).sort((left, right) =>
    left.sourceType.localeCompare(right.sourceType)
  );
}

function resolveTemplateCertificationDefaultAutomationEvidenceSources(
  riskAssessment: TemplateCertificationRiskAssessment,
): TemplateCertificationEvidenceSourceType[] {
  const defaults = new Set<TemplateCertificationEvidenceSourceType>(
    TEMPLATE_CERTIFICATION_AUTOMATION_TIER_DEFAULT_EVIDENCE_SOURCES[riskAssessment.tier],
  );
  for (const requirement of riskAssessment.requiredVerification) {
    if (requirement === "behavioral_eval") {
      defaults.add("runtime_smoke_eval");
      continue;
    }
    if (requirement === "tool_contract_eval") {
      defaults.add("tool_contract_eval");
      continue;
    }
    if (requirement === "policy_compliance_eval") {
      defaults.add("policy_compliance_eval");
      continue;
    }
  }
  return Array.from(defaults).sort((left, right) => left.localeCompare(right));
}

function buildTemplateCertificationEvaluationOutputSummary(
  output: TemplateCertificationEvaluationOutput,
): string {
  const explicitSummary = normalizeOptionalString(output.summary);
  if (explicitSummary) {
    return explicitSummary;
  }
  return `Automation output ${output.sourceType} reported ${output.outcome}.`;
}

function buildTemplateCertificationCoverageSummary(args: {
  artifact: TemplateCertificationDecisionArtifact;
  defaultEvidenceSources: TemplateCertificationEvidenceSourceType[];
  ingestedEvaluationOutputs: TemplateCertificationEvaluationOutput[];
  usedOutputSourceTypes: TemplateCertificationEvidenceSourceType[];
}): TemplateCertificationEvidenceRecordingSummary {
  const missingRequiredVerification = args.artifact.requiredVerification.filter(
    (requirement) =>
      !args.artifact.evidenceSources.some((source) =>
        requirementSatisfiedBySource(requirement, source)
      ),
  );
  const failedRequiredVerification = args.artifact.requiredVerification.filter(
    (requirement) =>
      args.artifact.evidenceSources.some(
        (source) =>
          source.status === "fail"
          && requirementMatchesSourceType(requirement, source.sourceType),
      ),
  );
  const missingDefaultEvidenceSources = args.defaultEvidenceSources.filter(
    (sourceType) =>
      !args.ingestedEvaluationOutputs.some(
        (output) =>
          output.sourceType === sourceType
          && (output.outcome === "pass" || output.outcome === "fail"),
      )
      && !args.artifact.evidenceSources.some((source) => source.sourceType === sourceType),
  );

  return {
    riskTier: args.artifact.riskAssessment.tier,
    requiredVerification: [...args.artifact.requiredVerification],
    defaultEvidenceSources: [...args.defaultEvidenceSources],
    ingestedEvaluationOutputs: args.ingestedEvaluationOutputs.map((output) => ({
      ...output,
      usedForEvidence:
        (output.outcome === "pass" || output.outcome === "fail")
        && args.usedOutputSourceTypes.includes(output.sourceType),
    })),
    recordedEvidenceSources: args.artifact.evidenceSources.filter(
      (source) =>
        source.sourceType !== "manifest_integrity" && source.sourceType !== "risk_assessment",
    ),
    missingRequiredVerification,
    failedRequiredVerification,
    missingDefaultEvidenceSources,
    blocked: args.artifact.status !== "certified",
    blockedReason: args.artifact.status === "certified" ? null : args.artifact.reasonCode,
  };
}

function normalizeTemplateCertificationEvidenceSource(
  source: TemplateCertificationEvidenceSource,
): TemplateCertificationEvidenceSource | null {
  const summary = normalizeOptionalString(source.summary);
  if (!summary) {
    return null;
  }
  if (
    source.sourceType !== "manifest_integrity"
    && source.sourceType !== "risk_assessment"
    && source.sourceType !== "wae_eval"
    && source.sourceType !== "legacy_wae_bridge"
    && source.sourceType !== "runtime_smoke_eval"
    && source.sourceType !== "tool_contract_eval"
    && source.sourceType !== "policy_compliance_eval"
  ) {
    return null;
  }
  if (source.status !== "pass" && source.status !== "fail") {
    return null;
  }
  return {
    sourceType: source.sourceType,
    status: source.status,
    summary,
    ...(normalizeOptionalString(source.runId)
      ? { runId: normalizeOptionalString(source.runId)! }
      : {}),
  };
}

function buildTemplateCertificationArtifact(args: {
  templateId: string;
  templateVersionId: string;
  templateVersionTag: string;
  recordedAt: number;
  recordedByUserId: string;
  dependencyManifest: TemplateCertificationDependencyManifest;
  riskAssessment: TemplateCertificationRiskAssessment;
  waeArtifact?: WaeRolloutGateDecisionArtifact | null;
  waeSourceType?: "wae_eval" | "legacy_wae_bridge";
  additionalEvidenceSources?: TemplateCertificationEvidenceSource[];
}): TemplateCertificationDecisionArtifact {
  const evidenceSources: TemplateCertificationEvidenceSource[] = [
    {
      sourceType: "manifest_integrity",
      status: "pass",
      summary: `Pinned dependency digest ${args.dependencyManifest.dependencyDigest}.`,
    },
    {
      sourceType: "risk_assessment",
      status: "pass",
      summary: `Risk tier ${args.riskAssessment.tier} across ${args.riskAssessment.changedFields.length} changed fields.`,
    },
  ];

  if (args.waeArtifact) {
    const passed =
      args.waeArtifact.status === "pass"
      && args.waeArtifact.reasonCode === "pass"
      && args.waeArtifact.score.verdict === "passed"
      && args.waeArtifact.score.decision === "proceed"
      && args.waeArtifact.criticalReasonCodeBudget.observedCount
        <= args.waeArtifact.criticalReasonCodeBudget.allowedCount
      && args.waeArtifact.failureSnapshot.unresolvedCriticalFailures === 0;
    evidenceSources.push({
      sourceType: args.waeSourceType ?? "wae_eval",
      status: passed ? "pass" : "fail",
      summary: passed
        ? `WAE bundle ${args.waeArtifact.runId} passed for ${args.templateVersionTag}.`
        : `WAE bundle ${args.waeArtifact.runId} failed for ${args.templateVersionTag}.`,
      runId: args.waeArtifact.runId,
    });
  }

  if (Array.isArray(args.additionalEvidenceSources)) {
    for (const source of args.additionalEvidenceSources) {
      const normalized = normalizeTemplateCertificationEvidenceSource(source);
      if (!normalized) {
        continue;
      }
      if (normalized.sourceType === "manifest_integrity" || normalized.sourceType === "risk_assessment") {
        continue;
      }
      evidenceSources.push(normalized);
    }
  }

  const dedupedEvidenceByKey = new Map<string, TemplateCertificationEvidenceSource>();
  for (const source of evidenceSources) {
    const key = `${source.sourceType}:${source.runId ?? ""}:${source.summary}`;
    if (!dedupedEvidenceByKey.has(key)) {
      dedupedEvidenceByKey.set(key, source);
    }
  }
  const dedupedEvidenceSources = Array.from(dedupedEvidenceByKey.values());

  const requiredVerification = [...args.riskAssessment.requiredVerification];
  const missingRequiredVerification = requiredVerification.filter(
    (requirement) =>
      !dedupedEvidenceSources.some((source) => requirementSatisfiedBySource(requirement, source)),
  );
  const failedRequiredVerification = requiredVerification.filter((requirement) =>
    dedupedEvidenceSources.some(
      (source) =>
        source.status === "fail"
        && requirementMatchesSourceType(requirement, source.sourceType),
    ),
  );
  const rejected =
    missingRequiredVerification.length > 0 || failedRequiredVerification.length > 0;
  const notes = [
    ...missingRequiredVerification.map(
      (requirement) => `Missing required verification: ${requirement}.`,
    ),
    ...failedRequiredVerification.map(
      (requirement) => `Required verification failed: ${requirement}.`,
    ),
  ];

  return {
    contractVersion: TEMPLATE_CERTIFICATION_DECISION_CONTRACT_VERSION,
    promotionContractVersion: TEMPLATE_CERTIFICATION_PROMOTION_CONTRACT_VERSION,
    status: rejected ? "rejected" : "certified",
    reasonCode:
      missingRequiredVerification.length > 0
        ? "missing_required_verification"
        : failedRequiredVerification.length > 0
          ? "verification_failed"
          : "certified",
    templateId: args.templateId,
    templateVersionId: args.templateVersionId,
    templateVersionTag: args.templateVersionTag,
    riskAssessment: args.riskAssessment,
    dependencyManifest: args.dependencyManifest,
    requiredVerification,
    evidenceSources: dedupedEvidenceSources,
    recordedAt: args.recordedAt,
    recordedByUserId: args.recordedByUserId,
    notes,
  };
}

function parseTemplateCertificationDependencyManifest(
  value: unknown,
): TemplateCertificationDependencyManifest | null {
  const record = asRecord(value);
  if (
    normalizeOptionalString(record.contractVersion)
    !== TEMPLATE_CERTIFICATION_DEPENDENCY_MANIFEST_CONTRACT_VERSION
  ) {
    return null;
  }
  const templateId = normalizeOptionalString(record.templateId);
  const templateVersionId = normalizeOptionalString(record.templateVersionId);
  const templateVersionTag = normalizeOptionalString(record.templateVersionTag);
  const baselineDigest = normalizeOptionalString(record.baselineDigest);
  const toolingDigest = normalizeOptionalString(record.toolingDigest);
  const telephonyDigest = normalizeOptionalString(record.telephonyDigest);
  const runtimeDigest = normalizeOptionalString(record.runtimeDigest);
  const dependencyDigest = normalizeOptionalString(record.dependencyDigest);
  if (
    !templateId
    || !templateVersionId
    || !templateVersionTag
    || !baselineDigest
    || !toolingDigest
    || !telephonyDigest
    || !runtimeDigest
    || !dependencyDigest
  ) {
    return null;
  }

  const selectedTools = normalizeUnknownArray(record.selectedTools)
    .map((entry) => {
      const selectedTool = asRecord(entry);
      const name = normalizeOptionalString(selectedTool.name);
      return name
        ? {
            name,
            readOnly: selectedTool.readOnly === true,
          }
        : null;
    })
    .filter(
      (
        entry,
      ): entry is {
        name: string;
        readOnly: boolean;
      } => entry !== null,
    );
  const telephony = asRecord(record.telephony);
  const runtime = asRecord(record.runtime);

  return {
    contractVersion: TEMPLATE_CERTIFICATION_DEPENDENCY_MANIFEST_CONTRACT_VERSION,
    templateId,
    templateVersionId,
    templateVersionTag,
    baselineDigest,
    toolingDigest,
    telephonyDigest,
    runtimeDigest,
    dependencyDigest,
    selectedTools,
    telephony: {
      provider: normalizeOptionalString(telephony.provider) || "elevenlabs",
      managedToolKeys: normalizeStringArray(telephony.managedToolKeys),
      transferDestinationCount:
        normalizeFiniteNumber(telephony.transferDestinationCount) ?? 0,
      phoneChannelEnabled: telephony.phoneChannelEnabled === true,
    },
    runtime: {
      modelProvider: normalizeOptionalString(runtime.modelProvider),
      modelId: normalizeOptionalString(runtime.modelId),
      autonomyLevel: normalizeOptionalString(runtime.autonomyLevel),
    },
  };
}

function parseTemplateCertificationRiskAssessment(
  value: unknown,
): TemplateCertificationRiskAssessment | null {
  const record = asRecord(value);
  if (
    normalizeOptionalString(record.contractVersion)
    !== TEMPLATE_CERTIFICATION_RISK_ASSESSMENT_CONTRACT_VERSION
  ) {
    return null;
  }
  const tier = normalizeOptionalString(record.tier);
  if (tier !== "low" && tier !== "medium" && tier !== "high") {
    return null;
  }

  const requiredVerification = normalizeStringArray(record.requiredVerification).filter(
    isTemplateCertificationRequirement,
  );

  return {
    contractVersion: TEMPLATE_CERTIFICATION_RISK_ASSESSMENT_CONTRACT_VERSION,
    tier,
    changedFields: normalizeStringArray(record.changedFields),
    lowRiskReasons: normalizeStringArray(record.lowRiskReasons),
    mediumRiskReasons: normalizeStringArray(record.mediumRiskReasons),
    highRiskReasons: normalizeStringArray(record.highRiskReasons),
    requiredVerification,
    autoCertificationEligible: record.autoCertificationEligible === true,
    ...(normalizeOptionalString(record.referenceVersionId)
      ? { referenceVersionId: normalizeOptionalString(record.referenceVersionId)! }
      : {}),
    ...(normalizeOptionalString(record.referenceVersionTag)
      ? { referenceVersionTag: normalizeOptionalString(record.referenceVersionTag)! }
      : {}),
  };
}

function parseTemplateCertificationDecisionArtifact(
  value: unknown,
): TemplateCertificationDecisionArtifact | null {
  const record = asRecord(value);
  if (
    normalizeOptionalString(record.contractVersion)
    !== TEMPLATE_CERTIFICATION_DECISION_CONTRACT_VERSION
    || normalizeOptionalString(record.promotionContractVersion)
      !== TEMPLATE_CERTIFICATION_PROMOTION_CONTRACT_VERSION
  ) {
    return null;
  }
  const status = normalizeOptionalString(record.status);
  const reasonCode = normalizeOptionalString(record.reasonCode);
  const templateId = normalizeOptionalString(record.templateId);
  const templateVersionId = normalizeOptionalString(record.templateVersionId);
  const templateVersionTag = normalizeOptionalString(record.templateVersionTag);
  const recordedAt = normalizeFiniteNumber(record.recordedAt);
  const recordedByUserId = normalizeOptionalString(record.recordedByUserId);
  if (
    (status !== "certified" && status !== "rejected")
    || (reasonCode !== "certified"
      && reasonCode !== "verification_failed"
      && reasonCode !== "missing_required_verification")
    || !templateId
    || !templateVersionId
    || !templateVersionTag
    || recordedAt === null
    || !recordedByUserId
  ) {
    return null;
  }

  const riskAssessment = parseTemplateCertificationRiskAssessment(record.riskAssessment);
  const dependencyManifest = parseTemplateCertificationDependencyManifest(
    record.dependencyManifest,
  );
  if (!riskAssessment || !dependencyManifest) {
    return null;
  }

  const requiredVerification = normalizeStringArray(record.requiredVerification).filter(
    isTemplateCertificationRequirement,
  );
  const evidenceSources = normalizeUnknownArray(record.evidenceSources)
    .map((entry) => {
      const source = asRecord(entry);
      const sourceType = normalizeOptionalString(source.sourceType);
      const sourceStatus = normalizeOptionalString(source.status);
      const summary = normalizeOptionalString(source.summary);
      if (
        (sourceType !== "manifest_integrity"
          && sourceType !== "risk_assessment"
          && sourceType !== "wae_eval"
          && sourceType !== "legacy_wae_bridge"
          && sourceType !== "runtime_smoke_eval"
          && sourceType !== "tool_contract_eval"
          && sourceType !== "policy_compliance_eval")
        || (sourceStatus !== "pass" && sourceStatus !== "fail")
        || !summary
      ) {
        return null;
      }
      return {
        sourceType,
        status: sourceStatus,
        summary,
        ...(normalizeOptionalString(source.runId)
          ? { runId: normalizeOptionalString(source.runId)! }
          : {}),
      } satisfies TemplateCertificationEvidenceSource;
    })
    .filter(
      (
        entry,
      ): entry is TemplateCertificationEvidenceSource => entry !== null,
    );

  return {
    contractVersion: TEMPLATE_CERTIFICATION_DECISION_CONTRACT_VERSION,
    promotionContractVersion: TEMPLATE_CERTIFICATION_PROMOTION_CONTRACT_VERSION,
    status,
    reasonCode,
    templateId,
    templateVersionId,
    templateVersionTag,
    riskAssessment,
    dependencyManifest,
    requiredVerification,
    evidenceSources,
    recordedAt,
    recordedByUserId,
    notes: normalizeStringArray(record.notes),
  };
}

function buildSeedTemplateBridgeContract(args: {
  systemTemplateAgentId?: string;
  protectedTemplate: boolean;
  immutableOriginContractMapped: boolean;
}): SeedTemplateBridgeContract {
  return {
    contractVersion: SEED_TEMPLATE_BRIDGE_CONTRACT_VERSION,
    precedenceOrder: [...TEMPLATE_CLONE_PRECEDENCE_ORDER],
    roleBoundary: "super_admin_global_templates",
    legacyCompatibilityMode: args.systemTemplateAgentId
      ? "managed_seed"
      : "legacy_unmanaged",
    templateCloneLinkageContractVersion: TEMPLATE_CLONE_LINKAGE_CONTRACT_VERSION,
    systemTemplateAgentId: args.systemTemplateAgentId,
    protectedTemplate: args.protectedTemplate,
    immutableOriginContractMapped: args.immutableOriginContractMapped,
  };
}

function resolveSeedTemplateBridgeContract(seed: SeedRegistryRow | null): SeedTemplateBridgeContract | null {
  if (!seed) {
    return null;
  }
  const bridgedTemplateAgentId = seed.systemTemplateAgentId
    ? String(seed.systemTemplateAgentId)
    : undefined;
  const fallbackBridge = buildSeedTemplateBridgeContract({
    systemTemplateAgentId: bridgedTemplateAgentId,
    protectedTemplate: seed.protectedTemplate === true,
    immutableOriginContractMapped: seed.immutableOriginContractMapped === true,
  });
  if (!seed.templateCloneBridge) {
    return fallbackBridge;
  }
  return {
    ...fallbackBridge,
    ...seed.templateCloneBridge,
    precedenceOrder: [...TEMPLATE_CLONE_PRECEDENCE_ORDER],
    roleBoundary: "super_admin_global_templates",
    templateCloneLinkageContractVersion: TEMPLATE_CLONE_LINKAGE_CONTRACT_VERSION,
  };
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

function inferLegacyPublishedState(entry: CatalogEntryRow): boolean {
  return entry.runtimeStatus === "live" && entry.catalogStatus === "done";
}

function resolveEntryPublished(entry: CatalogEntryRow): boolean {
  if (typeof entry.published === "boolean") {
    return entry.published;
  }
  return inferLegacyPublishedState(entry);
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

export async function getLatestWaeRolloutGateDecisionArtifact(
  ctx: QueryCtx | MutationCtx,
  templateVersionId: Id<"objects">,
): Promise<WaeRolloutGateDecisionArtifact | null> {
  const dbAny = ctx.db as any;
  const actions = (await dbAny
    .query("objectActions")
    .withIndex("by_object", (q: any) => q.eq("objectId", templateVersionId))
    .collect()) as Array<{
    _id: string;
    actionType?: unknown;
    actionData?: unknown;
    performedAt?: unknown;
  }>;

  const candidates = actions
    .filter((row) => row.actionType === WAE_ROLLOUT_GATE_ACTION_TYPE)
    .map((row) => ({
      actionId: row._id,
      performedAt: normalizeFiniteNumber(row.performedAt) ?? 0,
      artifact: parseWaeRolloutGateDecisionArtifact(row.actionData),
    }))
    .filter(
      (row): row is {
        actionId: string;
        performedAt: number;
        artifact: WaeRolloutGateDecisionArtifact;
      } => row.artifact !== null,
    )
    .sort((left, right) => {
      if (left.performedAt !== right.performedAt) {
        return right.performedAt - left.performedAt;
      }
      return right.actionId.localeCompare(left.actionId);
    });

  return candidates[0]?.artifact ?? null;
}

export async function getLatestTemplateCertificationDecisionArtifact(
  ctx: QueryCtx | MutationCtx,
  templateVersionId: Id<"objects">,
): Promise<TemplateCertificationDecisionArtifact | null> {
  const dbAny = ctx.db as any;
  const actions = (await dbAny
    .query("objectActions")
    .withIndex("by_object", (q: any) => q.eq("objectId", templateVersionId))
    .collect()) as Array<{
    _id: string;
    actionType?: unknown;
    actionData?: unknown;
    performedAt?: unknown;
  }>;

  const candidates = actions
    .filter((row) => row.actionType === TEMPLATE_CERTIFICATION_ACTION_TYPE)
    .map((row) => ({
      actionId: row._id,
      performedAt: normalizeFiniteNumber(row.performedAt) ?? 0,
      artifact: parseTemplateCertificationDecisionArtifact(row.actionData),
    }))
    .filter(
      (row): row is {
        actionId: string;
        performedAt: number;
        artifact: TemplateCertificationDecisionArtifact;
      } => row.artifact !== null,
    )
    .sort((left, right) => {
      if (left.performedAt !== right.performedAt) {
        return right.performedAt - left.performedAt;
      }
      return right.actionId.localeCompare(left.actionId);
    });

  return candidates[0]?.artifact ?? null;
}

type ResolvedTemplateCertificationContext = CurrentDefaultTemplateWaeGateContext & {
  templateFamily?: string;
  riskPolicyScope: "global" | "family";
  globalRiskPolicy: TemplateCertificationRiskPolicy;
  overlayRiskPolicy?: TemplateCertificationRiskPolicy;
  baselineSnapshot: Record<string, unknown>;
  dependencyManifest: TemplateCertificationDependencyManifest;
  riskAssessment: TemplateCertificationRiskAssessment;
  riskPolicy: TemplateCertificationRiskPolicy;
};

async function resolveReferenceTemplateVersionForCertification(
  ctx: QueryCtx | MutationCtx,
  args: {
    templateId: Id<"objects">;
    templateVersionId: Id<"objects">;
  },
): Promise<{
  templateVersionId: string;
  templateVersionTag: string;
  baselineSnapshot: Record<string, unknown>;
} | null> {
  const dbAny = ctx.db as any;
  const versions = (await dbAny
    .query("objects")
    .withIndex("by_type", (q: any) => q.eq("type", "org_agent_template_version"))
    .collect()) as Array<{
    _id: Id<"objects">;
    updatedAt: number;
    customProperties?: unknown;
  }>;

  const candidates = versions
    .filter((version) => version._id !== args.templateVersionId)
    .map((version) => {
      const props = asRecord(version.customProperties);
      if (normalizeOptionalString(props.sourceTemplateId) !== String(args.templateId)) {
        return null;
      }
      return {
        templateVersionId: String(version._id),
        templateVersionTag:
          normalizeOptionalString(props.versionTag) || String(version._id),
        lifecycleStatus: normalizeOptionalString(props.lifecycleStatus) || "draft",
        updatedAt: normalizeFiniteNumber(version.updatedAt) ?? 0,
        baselineSnapshot: resolveTemplateVersionBaselineSnapshot(props),
      };
    })
    .filter(
      (
        row,
      ): row is {
        templateVersionId: string;
        templateVersionTag: string;
        lifecycleStatus: string;
        updatedAt: number;
        baselineSnapshot: Record<string, unknown>;
      } => row !== null,
    )
    .sort((left, right) => {
      const lifecycleRank = (status: string) => (status === "published" ? 0 : 1);
      const lifecycleSort =
        lifecycleRank(left.lifecycleStatus) - lifecycleRank(right.lifecycleStatus);
      if (lifecycleSort !== 0) {
        return lifecycleSort;
      }
      if (left.updatedAt !== right.updatedAt) {
        return right.updatedAt - left.updatedAt;
      }
      return left.templateVersionId.localeCompare(right.templateVersionId);
    });

  return candidates[0] ?? null;
}

async function resolveTemplateVersionCertificationContext(
  ctx: QueryCtx | MutationCtx,
  args: {
    templateId: Id<"objects">;
    templateVersionId: Id<"objects">;
    templateVersionTag?: string | null;
  },
): Promise<ResolvedTemplateCertificationContext> {
  const template = await ctx.db.get(args.templateId);
  if (!template || template.type !== "org_agent" || template.status !== "template") {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Template agent not found.",
    });
  }
  const templateVersion = await ctx.db.get(args.templateVersionId);
  if (!templateVersion || templateVersion.type !== "org_agent_template_version") {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Template version snapshot not found.",
    });
  }

  const templateProps = asRecord(template.customProperties);
  const versionProps = asRecord(templateVersion.customProperties);
  if (normalizeOptionalString(versionProps.sourceTemplateId) !== String(args.templateId)) {
    throw new ConvexError({
      code: "INVALID_ARGUMENT",
      message: "Template version does not belong to template.",
    });
  }

  const templateVersionTag =
    normalizeOptionalString(args.templateVersionTag)
    || normalizeOptionalString(versionProps.versionTag)
    || String(args.templateVersionId);
  const baselineSnapshot = resolveTemplateVersionBaselineSnapshot(versionProps);
  const templateFamily =
    normalizeTemplateCertificationFamilyKey(templateProps.templateRole)
    || normalizeTemplateCertificationFamilyKey(baselineSnapshot.templateRole)
    || normalizeTemplateCertificationFamilyKey(versionProps.templateRole)
    || normalizeTemplateCertificationFamilyKey(template.subtype);
  const dependencyManifest = buildTemplateCertificationDependencyManifest({
    templateId: String(args.templateId),
    templateVersionId: String(args.templateVersionId),
    templateVersionTag,
    baselineSnapshot,
  });
  const referenceVersion = await resolveReferenceTemplateVersionForCertification(ctx, {
    templateId: args.templateId,
    templateVersionId: args.templateVersionId,
  });
  const riskPolicyResolution = await readTemplateCertificationRiskPolicy(ctx, {
    templateFamily,
  });
  const riskPolicy = riskPolicyResolution.policy;
  const riskAssessment = buildTemplateCertificationRiskAssessment({
    currentBaseline: baselineSnapshot,
    referenceBaseline: referenceVersion?.baselineSnapshot,
    referenceVersionId: referenceVersion?.templateVersionId ?? null,
    referenceVersionTag: referenceVersion?.templateVersionTag ?? null,
    riskPolicy,
  });

  return {
    templateId: args.templateId,
    templateName: normalizeOptionalString(template.name) || "One-of-One Operator Template",
    templateOrganizationId: template.organizationId,
    templateVersionId: args.templateVersionId,
    templateVersionTag,
    templateLifecycleStatus:
      normalizeOptionalString(templateProps.templateLifecycleStatus) || "unknown",
    templateVersionLifecycleStatus:
      normalizeOptionalString(versionProps.lifecycleStatus) || "unknown",
    ...(templateFamily ? { templateFamily } : {}),
    riskPolicyScope: riskPolicyResolution.scope,
    globalRiskPolicy: riskPolicyResolution.globalPolicy,
    ...(riskPolicyResolution.overlayPolicy
      ? { overlayRiskPolicy: riskPolicyResolution.overlayPolicy }
      : {}),
    baselineSnapshot,
    dependencyManifest,
    riskAssessment,
    riskPolicy,
  };
}

async function recordTemplateCertificationDecisionArtifact(args: {
  ctx: MutationCtx;
  organizationId: Id<"organizations">;
  templateVersionId: Id<"objects">;
  performedBy: Id<"users">;
  artifact: TemplateCertificationDecisionArtifact;
}) {
  await args.ctx.db.insert("objectActions", {
    organizationId: args.organizationId,
    objectId: args.templateVersionId,
    actionType: TEMPLATE_CERTIFICATION_ACTION_TYPE,
    actionData: args.artifact as unknown as Record<string, unknown>,
    performedBy: args.performedBy,
    performedAt: args.artifact.recordedAt,
  });

  await args.ctx.db.insert("auditLogs", {
    organizationId: args.organizationId,
    userId: args.performedBy,
    action: TEMPLATE_CERTIFICATION_ACTION_TYPE,
    resource: "template_version",
    resourceId: String(args.templateVersionId),
    success: args.artifact.status === "certified",
    metadata: args.artifact as unknown as Record<string, unknown>,
    createdAt: args.artifact.recordedAt,
  });
}

export async function ensureTemplateVersionCertificationForLifecycle(
  ctx: MutationCtx,
  args: {
    templateId: Id<"objects">;
    templateVersionId: Id<"objects">;
    templateVersionTag?: string | null;
    recordedByUserId: Id<"users">;
  },
): Promise<TemplateCertificationEvaluationResult> {
  const context = await resolveTemplateVersionCertificationContext(ctx, {
    templateId: args.templateId,
    templateVersionId: args.templateVersionId,
    templateVersionTag: args.templateVersionTag,
  });
  const existingCertification = await getLatestTemplateCertificationDecisionArtifact(
    ctx,
    args.templateVersionId,
  );
  const legacyWaeGate = await getLatestWaeRolloutGateDecisionArtifact(
    ctx,
    args.templateVersionId,
  );

  const shouldBridgeLegacyWae =
    existingCertification === null
    && legacyWaeGate !== null
    && context.riskAssessment.requiredVerification.includes("wae_eval");
  const shouldAutoCertifyLowRisk =
    (!existingCertification
      || existingCertification.dependencyManifest.dependencyDigest
        !== context.dependencyManifest.dependencyDigest)
    && context.riskAssessment.autoCertificationEligible;

  if (shouldBridgeLegacyWae || shouldAutoCertifyLowRisk) {
    const artifact = buildTemplateCertificationArtifact({
      templateId: String(args.templateId),
      templateVersionId: String(args.templateVersionId),
      templateVersionTag: context.templateVersionTag,
      recordedAt: Date.now(),
      recordedByUserId: String(args.recordedByUserId),
      dependencyManifest: context.dependencyManifest,
      riskAssessment: context.riskAssessment,
      ...(shouldBridgeLegacyWae
        ? {
            waeArtifact: legacyWaeGate,
            waeSourceType: "legacy_wae_bridge" as const,
          }
        : {}),
    });
    await recordTemplateCertificationDecisionArtifact({
      ctx,
      organizationId: context.templateOrganizationId,
      templateVersionId: args.templateVersionId,
      performedBy: args.recordedByUserId,
      artifact,
    });
  }

  return await evaluateTemplateCertificationForTemplateVersion(ctx, {
    templateId: args.templateId,
    templateVersionId: args.templateVersionId,
    templateVersionTag: context.templateVersionTag,
  });
}

async function resolveCurrentDefaultTemplateWaeGateContext(
  ctx: QueryCtx | MutationCtx,
): Promise<CurrentDefaultTemplateWaeGateContext> {
  const platformOrgId =
    normalizeOptionalString(process.env.PLATFORM_ORG_ID)
    || normalizeOptionalString(process.env.TEST_ORG_ID);
  const dbAny = ctx.db as any;
  const objects = (await dbAny.query("objects").collect()) as Array<{
    _id: Id<"objects">;
    organizationId: Id<"organizations">;
    type?: string;
    status?: string;
    name?: string;
    customProperties?: unknown;
  }>;

  const template = objects
    .filter((row) => row.type === "org_agent" && row.status === "template")
    .filter((row) => {
      const props = asRecord(row.customProperties);
      return (
        props.protected === true
        && normalizeOptionalString(props.templateRole) === PERSONAL_OPERATOR_TEMPLATE_ROLE
      );
    })
    .sort((left, right) => {
      const leftPlatform = platformOrgId && String(left.organizationId) === platformOrgId ? 0 : 1;
      const rightPlatform = platformOrgId && String(right.organizationId) === platformOrgId ? 0 : 1;
      if (leftPlatform !== rightPlatform) {
        return leftPlatform - rightPlatform;
      }
      const orgSort = String(left.organizationId).localeCompare(String(right.organizationId));
      if (orgSort !== 0) {
        return orgSort;
      }
      return String(left._id).localeCompare(String(right._id));
    })[0];

  if (!template) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Current protected operator template was not found.",
      templateRole: PERSONAL_OPERATOR_TEMPLATE_ROLE,
    });
  }

  const templateProps = asRecord(template.customProperties);
  const templateVersionId = normalizeOptionalString(
    templateProps.templatePublishedVersionId,
  ) as Id<"objects"> | null;
  const templateVersionTag =
    normalizeOptionalString(templateProps.templatePublishedVersion)
    || normalizeOptionalString(templateProps.templateVersion);
  if (!templateVersionId || !templateVersionTag) {
    throw new ConvexError({
      code: "INVALID_STATE",
      message: "Current protected operator template is missing a published version.",
      templateId: String(template._id),
    });
  }

  const templateVersion = await ctx.db.get(templateVersionId);
  if (!templateVersion || templateVersion.type !== "org_agent_template_version") {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Current protected operator template version was not found.",
      templateId: String(template._id),
      templateVersionId: String(templateVersionId),
    });
  }

  const versionProps = asRecord(templateVersion.customProperties);
  if (normalizeOptionalString(versionProps.sourceTemplateId) !== String(template._id)) {
    throw new ConvexError({
      code: "INVALID_STATE",
      message: "Published operator template version does not belong to the current protected template.",
      templateId: String(template._id),
      templateVersionId: String(templateVersionId),
    });
  }

  return {
    templateId: template._id,
    templateName: normalizeOptionalString(template.name) || "One-of-One Operator Template",
    templateOrganizationId: template.organizationId,
    templateVersionId,
    templateVersionTag,
    templateLifecycleStatus:
      normalizeOptionalString(templateProps.templateLifecycleStatus) || "unknown",
    templateVersionLifecycleStatus:
      normalizeOptionalString(versionProps.lifecycleStatus) || "unknown",
  };
}

export async function evaluateWaeRolloutGateForTemplateVersion(
  ctx: QueryCtx | MutationCtx,
  args: {
    templateId: Id<"objects">;
    templateVersionId?: Id<"objects"> | null;
    templateVersionTag?: string | null;
    now?: number;
  },
): Promise<WaeRolloutGateEvaluationResult> {
  const evaluation = await evaluateTemplateCertificationForTemplateVersion(ctx, args);
  const legacyReasonCode: WaeRolloutGateBlockReasonCode | undefined =
    evaluation.reasonCode === "certification_missing"
      ? "wae_evidence_missing"
      : evaluation.reasonCode === "certification_mismatch"
        ? "wae_evidence_mismatch"
        : evaluation.reasonCode === "certification_invalid"
          ? "wae_gate_failed"
          : undefined;

  return {
    allowed: evaluation.allowed,
    reasonCode: legacyReasonCode,
    message: evaluation.message,
    ageMs:
      args.now && evaluation.certification
        ? Math.max(0, args.now - evaluation.certification.recordedAt)
        : undefined,
    gate: evaluation.legacyWaeGate,
  };
}

export async function evaluateTemplateCertificationForTemplateVersion(
  ctx: QueryCtx | MutationCtx,
  args: {
    templateId: Id<"objects">;
    templateVersionId?: Id<"objects"> | null;
    templateVersionTag?: string | null;
    now?: number;
  },
): Promise<TemplateCertificationEvaluationResult> {
  const templateVersionId = args.templateVersionId ?? null;
  const templateVersionTag = normalizeOptionalString(args.templateVersionTag);
  if (!templateVersionId || !templateVersionTag) {
    return {
      allowed: false,
      reasonCode: "certification_missing",
      message: "Template certification is missing for this template version.",
      certification: null,
      dependencyManifest: null,
      riskAssessment: null,
      autoCertificationEligible: false,
      legacyWaeGate: null,
    };
  }

  const context = await resolveTemplateVersionCertificationContext(ctx, {
    templateId: args.templateId,
    templateVersionId,
    templateVersionTag,
  });
  const storedCertification = await getLatestTemplateCertificationDecisionArtifact(
    ctx,
    templateVersionId,
  );
  const legacyWaeGate = await getLatestWaeRolloutGateDecisionArtifact(ctx, templateVersionId);
  const certification =
    storedCertification
    ?? (
      legacyWaeGate
        ? buildTemplateCertificationArtifact({
            templateId: String(args.templateId),
            templateVersionId: String(templateVersionId),
            templateVersionTag: context.templateVersionTag,
            recordedAt: legacyWaeGate.recordedAt,
            recordedByUserId: legacyWaeGate.recordedByUserId,
            dependencyManifest: context.dependencyManifest,
            riskAssessment: context.riskAssessment,
            waeArtifact: legacyWaeGate,
            waeSourceType: "legacy_wae_bridge",
          })
        : null
    );

  if (!certification) {
    const lowRiskEligible = context.riskAssessment.autoCertificationEligible;
    return {
      allowed: false,
      reasonCode: "certification_missing",
      message: lowRiskEligible
        ? "Template certification has not been recorded yet. This low-risk version can be auto-certified on the next lifecycle write."
        : `No certification artifact was recorded for template version ${templateVersionTag}.`,
      certification: null,
      dependencyManifest: context.dependencyManifest,
      riskAssessment: context.riskAssessment,
      autoCertificationEligible: lowRiskEligible,
      legacyWaeGate,
    };
  }

  if (
    certification.templateId !== String(args.templateId)
    || certification.templateVersionId !== String(templateVersionId)
    || certification.templateVersionTag !== context.templateVersionTag
    || certification.promotionContractVersion
      !== TEMPLATE_CERTIFICATION_PROMOTION_CONTRACT_VERSION
  ) {
    return {
      allowed: false,
      reasonCode: "certification_mismatch",
      message: "Template certification does not match the requested template/version contract.",
      certification,
      dependencyManifest: context.dependencyManifest,
      riskAssessment: context.riskAssessment,
      autoCertificationEligible: context.riskAssessment.autoCertificationEligible,
      legacyWaeGate,
    };
  }

  if (
    certification.dependencyManifest.dependencyDigest
    !== context.dependencyManifest.dependencyDigest
  ) {
    return {
      allowed: false,
      reasonCode: "certification_invalid",
      message:
        "Template certification is invalid because the dependency digest no longer matches this version manifest.",
      certification,
      dependencyManifest: context.dependencyManifest,
      riskAssessment: context.riskAssessment,
      autoCertificationEligible: context.riskAssessment.autoCertificationEligible,
      legacyWaeGate,
    };
  }

  const missingRequiredVerification = certification.requiredVerification.filter(
    (requirement) =>
      !certification.evidenceSources.some((source) =>
        requirementSatisfiedBySource(requirement, source),
      ),
  );
  if (
    certification.status !== "certified"
    || certification.reasonCode !== "certified"
    || missingRequiredVerification.length > 0
  ) {
    return {
      allowed: false,
      reasonCode: "certification_invalid",
      message:
        certification.notes[0]
        || "Template certification did not satisfy the required verification bundle.",
      certification,
      dependencyManifest: context.dependencyManifest,
      riskAssessment: context.riskAssessment,
      autoCertificationEligible: context.riskAssessment.autoCertificationEligible,
      legacyWaeGate,
    };
  }

  return {
    allowed: true,
    certification,
    dependencyManifest: context.dependencyManifest,
    riskAssessment: context.riskAssessment,
    autoCertificationEligible: context.riskAssessment.autoCertificationEligible,
    legacyWaeGate,
  };
}

export const getCurrentDefaultTemplateWaeRolloutGateStatus = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    const riskPolicy = await readTemplateCertificationRiskPolicy(ctx);
    const template = await resolveCurrentDefaultTemplateWaeGateContext(ctx);
    const certification = await getLatestTemplateCertificationDecisionArtifact(
      ctx,
      template.templateVersionId,
    );
    const gate = await getLatestWaeRolloutGateDecisionArtifact(ctx, template.templateVersionId);
    const certificationEvaluation = await evaluateTemplateCertificationForTemplateVersion(ctx, {
      templateId: template.templateId,
      templateVersionId: template.templateVersionId,
      templateVersionTag: template.templateVersionTag,
    });
    const evaluation = await evaluateWaeRolloutGateForTemplateVersion(ctx, {
      templateId: template.templateId,
      templateVersionId: template.templateVersionId,
      templateVersionTag: template.templateVersionTag,
      now: Date.now(),
    });

    return {
      generatedAt: Date.now(),
      template,
      certification,
      certificationEvaluation,
      riskAssessment: certificationEvaluation.riskAssessment,
      dependencyManifest: certificationEvaluation.dependencyManifest,
      autoCertificationEligible: certificationEvaluation.autoCertificationEligible,
      riskPolicy,
      gate,
      evaluation,
      evalCommands: [
        "npm run wae:eval:contracts",
        "npm run wae:eval:regression",
      ],
      bundlePaths: {
        runRecord: "tmp/reports/wae/<runId>/bundle/run-records.jsonl",
        scenarioRecords: "tmp/reports/wae/<runId>/bundle/scenario-records.jsonl",
      },
    };
  },
});

export const getTemplateCertificationRiskPolicy = query({
  args: {
    sessionId: v.string(),
    templateFamily: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    return await readTemplateCertificationRiskPolicy(ctx, {
      templateFamily: args.templateFamily,
    });
  },
});

export const setTemplateCertificationRiskPolicy = mutation({
  args: {
    sessionId: v.string(),
    templateFamily: v.optional(v.string()),
    policy: v.object({
      explicitLowRiskFields: v.optional(v.array(v.string())),
      explicitMediumRiskFields: v.optional(v.array(v.string())),
      explicitHighRiskFields: v.optional(v.array(v.string())),
      highRiskFieldKeywords: v.optional(v.array(v.string())),
      requiredVerificationByTier: v.optional(
        v.object({
          low: v.optional(v.array(templateCertificationRequirementValidator)),
          medium: v.optional(v.array(templateCertificationRequirementValidator)),
          high: v.optional(v.array(templateCertificationRequirementValidator)),
        }),
      ),
      autoCertificationEligibleTiers: v.optional(v.array(templateCertificationRiskTierValidator)),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdminSession(ctx, args.sessionId);
    const templateFamily = normalizeTemplateCertificationFamilyKey(args.templateFamily);
    if (args.templateFamily && !templateFamily) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "templateFamily must contain at least one alphanumeric character.",
      });
    }
    const current = await readTemplateCertificationRiskPolicy(ctx, {
      templateFamily,
    });
    const nextPolicy = mergeTemplateCertificationRiskPolicy(current.policy, args.policy);
    const nextGlobalPolicy =
      templateFamily ? current.globalPolicy : nextPolicy;
    const nextFamilyPolicies =
      templateFamily
        ? {
            ...current.familyPolicies,
            [templateFamily]: nextPolicy,
          }
        : current.familyPolicies;
    const now = Date.now();
    const dbAny = ctx.db as any;
    const settingsValue = {
      contractVersion: TEMPLATE_CERTIFICATION_RISK_POLICY_SETTINGS_CONTRACT_VERSION,
      globalPolicy: nextGlobalPolicy,
      familyPolicies: nextFamilyPolicies,
    } satisfies TemplateCertificationRiskPolicySettings;
    const settingRows = await dbAny
      .query("platformSettings")
      .withIndex("by_key", (q: any) => q.eq("key", TEMPLATE_CERTIFICATION_RISK_POLICY_SETTING_KEY))
      .collect();
    const setting = settingRows[0] ?? null;
    if (setting) {
      await dbAny.patch(setting._id, {
        value: settingsValue,
        description: TEMPLATE_CERTIFICATION_RISK_POLICY_SETTING_DESCRIPTION,
        updatedBy: userId,
        updatedAt: now,
      });
    } else {
      await dbAny.insert("platformSettings", {
        key: TEMPLATE_CERTIFICATION_RISK_POLICY_SETTING_KEY,
        value: settingsValue,
        description: TEMPLATE_CERTIFICATION_RISK_POLICY_SETTING_DESCRIPTION,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    }
    return {
      success: true,
      source: "platform_setting" as const,
      scope: templateFamily ? ("family" as const) : ("global" as const),
      updatedAt: now,
      ...(templateFamily ? { templateFamily } : {}),
      policy: nextPolicy,
      globalPolicy: nextGlobalPolicy,
      familyPolicies: nextFamilyPolicies,
    };
  },
});

export const previewCurrentDefaultTemplateWaeRolloutGate = mutation({
  args: {
    sessionId: v.string(),
    waeRunRecord: v.any(),
    waeScenarioRecords: v.any(),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdminSession(ctx, args.sessionId);
    const template = await resolveCurrentDefaultTemplateWaeGateContext(ctx);
    const runRecord = normalizeWaeRunRecord(args.waeRunRecord);
    const scenarioRecords = normalizeWaeScenarioRecords(args.waeScenarioRecords);
    if (!runRecord) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "waeRunRecord is missing or invalid.",
      });
    }
    if (scenarioRecords.length === 0) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "waeScenarioRecords must contain at least one valid scenario record.",
      });
    }
    if (runRecord.templateVersionTag !== template.templateVersionTag) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "WAE bundle does not match the current protected operator template version tag.",
        expectedTemplateVersionTag: template.templateVersionTag,
        receivedTemplateVersionTag: runRecord.templateVersionTag,
      });
    }

    const score = scoreWaeEvalBundle({
      runRecord,
      scenarioRecords,
    });
    const recordedAt = Date.now();
    const completedAt = args.completedAt ?? recordedAt;
    const artifact = buildWaeRolloutGateDecisionArtifact({
      templateId: String(template.templateId),
      templateVersionId: String(template.templateVersionId),
      templateVersionTag: template.templateVersionTag,
      runRecord,
      scenarioRecords,
      score,
      recordedAt,
      completedAt,
      recordedByUserId: String(userId),
    });
    const certificationContext = await resolveTemplateVersionCertificationContext(ctx, {
      templateId: template.templateId,
      templateVersionId: template.templateVersionId,
      templateVersionTag: template.templateVersionTag,
    });
    const certification = buildTemplateCertificationArtifact({
      templateId: String(template.templateId),
      templateVersionId: String(template.templateVersionId),
      templateVersionTag: template.templateVersionTag,
      recordedAt,
      recordedByUserId: String(userId),
      dependencyManifest: certificationContext.dependencyManifest,
      riskAssessment: certificationContext.riskAssessment,
      waeArtifact: artifact,
      waeSourceType: "wae_eval",
    });

    return {
      template,
      artifact,
      certification,
      canRecord: certification.status === "certified",
    };
  },
});

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
    published: resolvedEntries.filter((row) => resolveEntryPublished(row)).length,
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
          p: resolveEntryPublished(row) ? 1 : 0,
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
        published: v.optional(v.boolean()),
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
    const dbAny = ctx.db as any;

    const entries = await loadDatasetEntries(ctx, datasetVersion);
    const resolvedEntries = entries.map(resolveCatalogEntryRecommendationFields);
    const toolRequirements = await loadToolRequirements(ctx, datasetVersion);
    const coverageMap = toCoverageMap(toolRequirements);
    const seedRows = (await dbAny
      .query("agentCatalogSeedRegistry")
      .withIndex("by_dataset_seed_coverage", (q: any) =>
        q.eq("datasetVersion", datasetVersion),
      )
      .collect()) as SeedRegistryRow[];
    const seedByAgentNumber = new Map<number, SeedRegistryRow>(
      seedRows.map((row) => [row.catalogAgentNumber, row]),
    );

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
        if (
          typeof args.filters?.published === "boolean"
          && resolveEntryPublished(entry) !== args.filters.published
        ) {
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
        const seed = seedByAgentNumber.get(entry.catalogAgentNumber);
        const seedBridge = resolveSeedTemplateBridgeContract(seed ?? null);
        return {
          ...entry,
          published: resolveEntryPublished(entry),
          blockersCount: entry.blockers.length,
          toolCoverageCounts: coverage,
          seedTemplateRole: seed?.templateRole ?? null,
          seedTemplateAgentId: seed?.systemTemplateAgentId
            ? String(seed.systemTemplateAgentId)
            : null,
          seedProtectedTemplate: seed?.protectedTemplate === true,
          seedImmutableOriginContractMapped: seed?.immutableOriginContractMapped === true,
          seedTemplateBridge: seedBridge,
        };
      }),
    };
  },
});

export const listPlatformAgents = query({
  args: {
    sessionId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    const dbAny = ctx.db as any;
    const requestedLimit = typeof args.limit === "number" && Number.isFinite(args.limit)
      ? Math.floor(args.limit)
      : 500;
    const limit = Math.max(1, Math.min(2000, requestedLimit));

    const platformOrgIdEnv = (process.env.PLATFORM_ORG_ID || "").trim();
    if (!platformOrgIdEnv) {
      throw new Error("PLATFORM_ORG_ID is not configured.");
    }

    const systemOrg = await dbAny.get(platformOrgIdEnv);
    if (!systemOrg || systemOrg._id !== platformOrgIdEnv) {
      throw new Error(`PLATFORM_ORG_ID does not resolve to an organization: ${platformOrgIdEnv}`);
    }

    const rows = (await dbAny
      .query("objects")
      .withIndex("by_org_type", (q: any) =>
        q.eq("organizationId", platformOrgIdEnv).eq("type", "org_agent"),
      )
      .collect()) as Array<{
      _id: string;
      name?: string;
      status?: string;
      customProperties?: Record<string, unknown>;
      }>;

    const seedRows = (await dbAny
      .query("agentCatalogSeedRegistry")
      .withIndex("by_dataset_agent", (q: any) =>
        q.eq("datasetVersion", DEFAULT_DATASET_VERSION),
      )
      .collect()) as SeedRegistryRow[];
    const seedRowsByTemplateId = new Map<string, SeedRegistryRow[]>();
    for (const seedRow of seedRows) {
      const templateId = seedRow.systemTemplateAgentId
        ? String(seedRow.systemTemplateAgentId)
        : null;
      if (!templateId) {
        continue;
      }
      const existingRows = seedRowsByTemplateId.get(templateId);
      if (existingRows) {
        existingRows.push(seedRow);
      } else {
        seedRowsByTemplateId.set(templateId, [seedRow]);
      }
    }

    const normalized = rows
      .map((row) => {
        const props = asRecord(row.customProperties);
        const templateRole = normalizeOptionalString(props.templateRole);
        const templateLayer = normalizeOptionalString(props.templateLayer);
        const templatePlaybook = normalizeOptionalString(props.templatePlaybook);
        const operatorId = normalizeOptionalString(props.operatorId);
        const protectedTemplate = props.protected === true;
        const primary = props.isPrimary === true;
        const linkedSeedRows = seedRowsByTemplateId.get(String(row._id)) ?? [];
        const linkedCatalogAgentNumbers = linkedSeedRows
          .map((seedRow) => seedRow.catalogAgentNumber)
          .sort((a, b) => a - b);
        const bridgeStates = linkedSeedRows
          .map((seedRow) => resolveSeedTemplateBridgeContract(seedRow))
          .filter((value): value is SeedTemplateBridgeContract => value !== null);
        return {
          _id: String(row._id),
          name: normalizeOptionalString(row.name) || "Unnamed Platform Agent",
          status: normalizeOptionalString(row.status) || "unknown",
          protectedTemplate,
          templateRole,
          templateLayer,
          templatePlaybook,
          primary,
          operatorId,
          linkedCatalogAgentNumbers,
          seedTemplateBridge: bridgeStates[0] ?? null,
        };
      })
      .sort((left, right) => {
        const leftRole = left.templateRole || "";
        const rightRole = right.templateRole || "";
        if (leftRole !== rightRole) {
          return leftRole.localeCompare(rightRole);
        }
        return left.name.localeCompare(right.name);
      });

    return {
      systemOrganizationId: platformOrgIdEnv,
      total: normalized.length,
      agents: normalized.slice(0, limit),
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
    const seedTemplateBridge = resolveSeedTemplateBridgeContract(seed);

    return {
      datasetVersion,
      agent: {
        ...resolveCatalogEntryRecommendationFields(entry),
        published: resolveEntryPublished(entry),
      },
      tools: tools.sort((a, b) => {
        if (a.requirementLevel !== b.requirementLevel) {
          const rank: Record<string, number> = { required: 0, recommended: 1, optional: 2 };
          return (rank[a.requirementLevel] ?? 9) - (rank[b.requirementLevel] ?? 9);
        }
        return a.toolName.localeCompare(b.toolName);
      }),
      seed,
      seedTemplateBridge,
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
        published: summary.published,
        blockedAgents: summary.blockedAgents,
        recommendationTagged: summary.recommendationTagged,
        recommendationMetadataStored: summary.recommendationMetadataStored,
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

export const setCatalogPublishedStatus = mutation({
  args: {
    sessionId: v.string(),
    datasetVersion: v.optional(v.string()),
    catalogAgentNumber: v.number(),
    published: v.boolean(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireSuperAdminSession(ctx, args.sessionId);
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const reason = args.reason.trim();
    if (reason.length === 0) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "Publish/unpublish reason is required.",
      });
    }

    const entry = await loadCatalogEntryByNumber(ctx, datasetVersion, args.catalogAgentNumber);
    if (!entry) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: `Catalog agent ${args.catalogAgentNumber} was not found in dataset '${datasetVersion}'.`,
      });
    }

    const previousPublished = resolveEntryPublished(entry);
    const nextPublished = args.published;
    const changed =
      previousPublished !== nextPublished
      || typeof entry.published !== "boolean";
    const now = Date.now();

    if (changed) {
      const dbAny = ctx.db as any;
      await dbAny.patch(entry._id, {
        published: nextPublished,
        updatedAt: now,
      });
    }

    await writeAgentCatalogAuditAction({
      ctx,
      organizationId,
      userId,
      actionType: "agent_catalog.published_set",
      datasetVersion,
      catalogAgentNumber: args.catalogAgentNumber,
      actionData: {
        reason,
        changed,
        previousPublished,
        nextPublished,
        explicitFieldPresentBefore: typeof entry.published === "boolean",
      },
      objectType: "agent_catalog_publish_update",
    });

    return {
      success: true,
      datasetVersion,
      catalogAgentNumber: args.catalogAgentNumber,
      changed,
      previousPublished,
      published: nextPublished,
    };
  },
});

export const backfillCatalogPublishedFlags = mutation({
  args: {
    sessionId: v.string(),
    datasetVersion: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireSuperAdminSession(ctx, args.sessionId);
    const datasetVersion = normalizeDatasetVersion(args.datasetVersion);
    const dryRun = args.dryRun === true;
    const entries = await loadDatasetEntries(ctx, datasetVersion);
    const dbAny = ctx.db as any;
    const now = Date.now();

    const updates: Array<{
      catalogAgentNumber: number;
      published: boolean;
      reason: "legacy_inference";
    }> = [];

    for (const entry of entries) {
      if (typeof entry.published === "boolean") {
        continue;
      }
      const inferredPublished = inferLegacyPublishedState(entry);
      updates.push({
        catalogAgentNumber: entry.catalogAgentNumber,
        published: inferredPublished,
        reason: "legacy_inference",
      });
      if (!dryRun) {
        await dbAny.patch(entry._id, {
          published: inferredPublished,
          updatedAt: now,
        });
      }
    }

    await writeAgentCatalogAuditAction({
      ctx,
      organizationId,
      userId,
      actionType: "agent_catalog.published_backfill",
      datasetVersion,
      actionData: {
        dryRun,
        scannedCount: entries.length,
        updatedCount: updates.length,
        legacyInferenceRule: "runtimeStatus=live && catalogStatus=done",
      },
      objectType: "agent_catalog_publish_backfill",
    });

    return {
      success: true,
      datasetVersion,
      dryRun,
      scannedCount: entries.length,
      updatedCount: updates.length,
      unchangedCount: entries.length - updates.length,
      updates,
    };
  },
});

export const recordTemplateCertificationEvidenceBundle = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    templateVersionId: v.id("objects"),
    templateVersionTag: v.optional(v.string()),
    evidenceSources: v.optional(
      v.array(
        v.object({
          sourceType: templateCertificationEvidenceSourceTypeValidator,
          status: v.union(v.literal("pass"), v.literal("fail")),
          summary: v.string(),
          runId: v.optional(v.string()),
        }),
      ),
    ),
    evaluationOutputs: v.optional(
      v.array(
        v.object({
          sourceType: templateCertificationEvidenceSourceTypeValidator,
          outcome: templateCertificationEvaluationOutputOutcomeValidator,
          summary: v.optional(v.string()),
          runId: v.optional(v.string()),
        }),
      ),
    ),
    applyRiskTierDefaults: v.optional(v.boolean()),
    notes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdminSession(ctx, args.sessionId);
    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "org_agent" || template.status !== "template") {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Template agent not found.",
      });
    }
    const templateVersion = await ctx.db.get(args.templateVersionId);
    if (!templateVersion || templateVersion.type !== "org_agent_template_version") {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Template version snapshot not found.",
      });
    }
    const context = await resolveTemplateVersionCertificationContext(ctx, {
      templateId: args.templateId,
      templateVersionId: args.templateVersionId,
      templateVersionTag: args.templateVersionTag ?? null,
    });
    const providedEvidenceSources = (args.evidenceSources ?? [])
      .map((source) =>
        normalizeTemplateCertificationEvidenceSource({
          sourceType: source.sourceType,
          status: source.status,
          summary: source.summary,
          runId: source.runId,
        }),
      )
      .filter(
        (source): source is TemplateCertificationEvidenceSource =>
          source !== null,
      );
    const ingestedEvaluationOutputs = dedupeTemplateCertificationEvaluationOutputs(
      (args.evaluationOutputs ?? [])
        .map((output) =>
          normalizeTemplateCertificationEvaluationOutput({
            sourceType: output.sourceType,
            outcome: output.outcome,
            summary: output.summary,
            runId: output.runId,
          }),
        )
        .filter(
          (output): output is TemplateCertificationEvaluationOutput =>
            output !== null,
        ),
    );
    const applyRiskTierDefaults = args.applyRiskTierDefaults !== false;
    const defaultEvidenceSources = applyRiskTierDefaults
      ? resolveTemplateCertificationDefaultAutomationEvidenceSources(context.riskAssessment)
      : [];
    const automationSourceAllowlist = applyRiskTierDefaults
      ? new Set<TemplateCertificationEvidenceSourceType>(defaultEvidenceSources)
      : new Set<TemplateCertificationEvidenceSourceType>(
        ingestedEvaluationOutputs.map((output) => output.sourceType),
      );
    automationSourceAllowlist.add("wae_eval");
    const automationEvidenceSources = ingestedEvaluationOutputs
      .filter(
        (
          output,
        ): output is TemplateCertificationEvaluationOutput & { outcome: "pass" | "fail" } =>
          isTemplateCertificationEvidenceStatusFromOutput(output.outcome)
          && automationSourceAllowlist.has(output.sourceType),
      )
      .map((output) =>
        normalizeTemplateCertificationEvidenceSource({
          sourceType: output.sourceType,
          status: output.outcome,
          summary: buildTemplateCertificationEvaluationOutputSummary(output),
          runId: output.runId,
        }),
      )
      .filter(
        (source): source is TemplateCertificationEvidenceSource =>
          source !== null,
      );
    const usedAutomationOutputSourceTypes = Array.from(
      new Set(automationEvidenceSources.map((source) => source.sourceType)),
    ).sort((left, right) => left.localeCompare(right));
    const additionalEvidenceSources = [
      ...providedEvidenceSources,
      ...automationEvidenceSources,
    ];
    const hasWaeFamilyEvidence = additionalEvidenceSources.some(
      (source) => source.sourceType === "wae_eval" || source.sourceType === "legacy_wae_bridge",
    );
    const legacyWaeGate = hasWaeFamilyEvidence
      ? null
      : await getLatestWaeRolloutGateDecisionArtifact(ctx, args.templateVersionId);
    const baseArtifact = buildTemplateCertificationArtifact({
      templateId: String(args.templateId),
      templateVersionId: String(args.templateVersionId),
      templateVersionTag: context.templateVersionTag,
      recordedAt: Date.now(),
      recordedByUserId: String(userId),
      dependencyManifest: context.dependencyManifest,
      riskAssessment: context.riskAssessment,
      ...(legacyWaeGate
        ? {
            waeArtifact: legacyWaeGate,
            waeSourceType: "legacy_wae_bridge" as const,
          }
        : {}),
      additionalEvidenceSources,
    });
    const notePayload = normalizeStringArray(args.notes ?? []);
    const artifact =
      notePayload.length === 0
        ? baseArtifact
        : {
            ...baseArtifact,
            notes: normalizeStringArray([...baseArtifact.notes, ...notePayload]),
          };
    await recordTemplateCertificationDecisionArtifact({
      ctx,
      organizationId: template.organizationId,
      templateVersionId: args.templateVersionId,
      performedBy: userId,
      artifact,
    });
    const evaluation = await evaluateTemplateCertificationForTemplateVersion(ctx, {
      templateId: args.templateId,
      templateVersionId: args.templateVersionId,
      templateVersionTag: context.templateVersionTag,
    });
    const summary = buildTemplateCertificationCoverageSummary({
      artifact,
      defaultEvidenceSources,
      ingestedEvaluationOutputs,
      usedOutputSourceTypes: usedAutomationOutputSourceTypes,
    });
    return {
      artifact,
      evaluation,
      summary,
    };
  },
});

export const recordCurrentDefaultTemplateCertificationEvidenceBundle = mutation({
  args: {
    sessionId: v.string(),
    evidenceSources: v.optional(
      v.array(
        v.object({
          sourceType: templateCertificationEvidenceSourceTypeValidator,
          status: v.union(v.literal("pass"), v.literal("fail")),
          summary: v.string(),
          runId: v.optional(v.string()),
        }),
      ),
    ),
    evaluationOutputs: v.optional(
      v.array(
        v.object({
          sourceType: templateCertificationEvidenceSourceTypeValidator,
          outcome: templateCertificationEvaluationOutputOutcomeValidator,
          summary: v.optional(v.string()),
          runId: v.optional(v.string()),
        }),
      ),
    ),
    applyRiskTierDefaults: v.optional(v.boolean()),
    notes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    const template = await resolveCurrentDefaultTemplateWaeGateContext(ctx);
    const result = await (recordTemplateCertificationEvidenceBundle as any)._handler(ctx, {
      sessionId: args.sessionId,
      templateId: template.templateId,
      templateVersionId: template.templateVersionId,
      templateVersionTag: template.templateVersionTag,
      evidenceSources: args.evidenceSources,
      evaluationOutputs: args.evaluationOutputs,
      applyRiskTierDefaults: args.applyRiskTierDefaults,
      notes: args.notes,
    }) as {
      artifact: TemplateCertificationDecisionArtifact;
      evaluation: TemplateCertificationEvaluationResult;
      summary: TemplateCertificationEvidenceRecordingSummary;
    };
    return {
      template,
      artifact: result.artifact,
      evaluation: result.evaluation,
      summary: result.summary,
    };
  },
});

export const recordWaeRolloutGateDecision = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    templateVersionId: v.id("objects"),
    waeRunRecord: v.any(),
    waeScenarioRecords: v.any(),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdminSession(ctx, args.sessionId);
    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "org_agent" || template.status !== "template") {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Template agent not found.",
      });
    }

    const templateVersion = await ctx.db.get(args.templateVersionId);
    if (!templateVersion || templateVersion.type !== "org_agent_template_version") {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Template version snapshot not found.",
      });
    }

    const versionProps = asRecord(templateVersion.customProperties);
    if (normalizeOptionalString(versionProps.sourceTemplateId) !== String(args.templateId)) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "Template version does not belong to template.",
      });
    }

    const runRecord = normalizeWaeRunRecord(args.waeRunRecord);
    const scenarioRecords = normalizeWaeScenarioRecords(args.waeScenarioRecords);
    if (!runRecord) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "waeRunRecord is missing or invalid.",
      });
    }
    if (scenarioRecords.length === 0) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "waeScenarioRecords must contain at least one valid scenario record.",
      });
    }

    const templateVersionTag = normalizeOptionalString(versionProps.versionTag);
    if (!templateVersionTag || runRecord.templateVersionTag !== templateVersionTag) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "WAE run evidence does not match the template version tag.",
      });
    }

    const score = scoreWaeEvalBundle({
      runRecord,
      scenarioRecords,
    });
    const recordedAt = Date.now();
    const completedAt = args.completedAt ?? recordedAt;
    const artifact = buildWaeRolloutGateDecisionArtifact({
      templateId: String(args.templateId),
      templateVersionId: String(args.templateVersionId),
      templateVersionTag,
      runRecord,
      scenarioRecords,
      score,
      recordedAt,
      completedAt,
      recordedByUserId: String(userId),
    });
    const certificationContext = await resolveTemplateVersionCertificationContext(ctx, {
      templateId: args.templateId,
      templateVersionId: args.templateVersionId,
      templateVersionTag,
    });
    const certificationArtifact = buildTemplateCertificationArtifact({
      templateId: String(args.templateId),
      templateVersionId: String(args.templateVersionId),
      templateVersionTag,
      recordedAt,
      recordedByUserId: String(userId),
      dependencyManifest: certificationContext.dependencyManifest,
      riskAssessment: certificationContext.riskAssessment,
      waeArtifact: artifact,
      waeSourceType: "wae_eval",
    });

    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateVersionId,
      actionType: WAE_ROLLOUT_GATE_ACTION_TYPE,
      actionData: artifact as unknown as Record<string, unknown>,
      performedBy: userId,
      performedAt: recordedAt,
    });

    await ctx.db.insert("auditLogs", {
      organizationId: template.organizationId,
      userId,
      action: WAE_ROLLOUT_GATE_ACTION_TYPE,
      resource: "template_version",
      resourceId: String(args.templateVersionId),
      success: artifact.status === "pass",
      metadata: artifact as unknown as Record<string, unknown>,
      createdAt: recordedAt,
    });

    await recordTemplateCertificationDecisionArtifact({
      ctx,
      organizationId: template.organizationId,
      templateVersionId: args.templateVersionId,
      performedBy: userId,
      artifact: certificationArtifact,
    });

    return {
      waeArtifact: artifact,
      certificationArtifact,
    };
  },
});

export const recordCurrentDefaultTemplateWaeRolloutGate = mutation({
  args: {
    sessionId: v.string(),
    waeRunRecord: v.any(),
    waeScenarioRecords: v.any(),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    const template = await resolveCurrentDefaultTemplateWaeGateContext(ctx);
    const result = await (recordWaeRolloutGateDecision as any)._handler(ctx, {
      sessionId: args.sessionId,
      templateId: template.templateId,
      templateVersionId: template.templateVersionId,
      waeRunRecord: args.waeRunRecord,
      waeScenarioRecords: args.waeScenarioRecords,
      completedAt: args.completedAt,
    }) as {
      waeArtifact: WaeRolloutGateDecisionArtifact;
      certificationArtifact: TemplateCertificationDecisionArtifact;
    };
    const certificationEvaluation = await evaluateTemplateCertificationForTemplateVersion(ctx, {
      templateId: template.templateId,
      templateVersionId: template.templateVersionId,
      templateVersionTag: template.templateVersionTag,
    });
    const evaluation = await evaluateWaeRolloutGateForTemplateVersion(ctx, {
      templateId: template.templateId,
      templateVersionId: template.templateVersionId,
      templateVersionTag: template.templateVersionTag,
      now: Date.now(),
    });

    return {
      template,
      artifact: result.waeArtifact,
      certificationArtifact: result.certificationArtifact,
      certificationEvaluation,
      evaluation,
    };
  },
});

export const getLatestWaeRolloutGateDecision = query({
  args: {
    sessionId: v.string(),
    templateVersionId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    return await getLatestWaeRolloutGateDecisionArtifact(ctx, args.templateVersionId);
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
    return await applySeedTemplateBinding(ctx, {
      userId,
      organizationId,
      datasetVersion: normalizeDatasetVersion(args.datasetVersion),
      catalogAgentNumber: args.catalogAgentNumber,
      templateAgentId: args.templateAgentId,
      reason: args.reason,
      allowImmutableRebind: false,
      actionType: "agent_catalog.seed_template_binding_set",
      sourcePathPrefix: "manual://agentCatalogAdmin.setSeedTemplateBinding",
      objectType: "agent_catalog_seed_template_binding",
    });
  },
});

async function applySeedTemplateBinding(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    organizationId: Id<"organizations">;
    datasetVersion: string;
    catalogAgentNumber: number;
    templateAgentId?: Id<"objects">;
    reason: string;
    allowImmutableRebind: boolean;
    actionType: `agent_catalog.${string}`;
    sourcePathPrefix: string;
    objectType: string;
  },
) {
  const reason = args.reason.trim();
  if (reason.length === 0) {
    throw new ConvexError({
      code: "INVALID_ARGUMENT",
      message: "Binding reason is required.",
    });
  }

  const entry = await loadCatalogEntryByNumber(
    ctx,
    args.datasetVersion,
    args.catalogAgentNumber,
  );
  if (!entry) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: `Catalog agent ${args.catalogAgentNumber} was not found in dataset '${args.datasetVersion}'.`,
    });
  }

  const dbAny = ctx.db as any;
  const existingSeed = (await dbAny
    .query("agentCatalogSeedRegistry")
    .withIndex("by_dataset_agent", (q: any) =>
      q.eq("datasetVersion", args.datasetVersion).eq("catalogAgentNumber", args.catalogAgentNumber),
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

  const prevTemplateAgentId = existingSeed?.systemTemplateAgentId
    ? String(existingSeed.systemTemplateAgentId)
    : null;
  const nextTemplateAgentIdString = nextTemplateAgentId ? String(nextTemplateAgentId) : null;
  if (
    existingSeed?.immutableOriginContractMapped === true
    && prevTemplateAgentId
    && prevTemplateAgentId !== nextTemplateAgentIdString
    && !args.allowImmutableRebind
  ) {
    throw new ConvexError({
      code: "INVALID_ARGUMENT",
      message:
        "Immutable seeded origin contract already mapped. Rebinding or clearing requires a migration override path.",
    });
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
  const nextImmutableOriginContractMapped =
    existingSeed?.immutableOriginContractMapped === true
      ? true
      : Boolean(nextTemplateAgentId);
  const nextSourcePath = nextTemplateAgentId
    ? args.sourcePathPrefix
    : existingSeed?.sourcePath ?? args.sourcePathPrefix;

  const prevTemplateRole = existingSeed?.templateRole ?? null;
  const nextTemplateRole = nextTemplateAgentId ? templateRole ?? null : null;
  const nextSeedBridgeContract = buildSeedTemplateBridgeContract({
    systemTemplateAgentId: nextTemplateAgentIdString ?? undefined,
    protectedTemplate: Boolean(nextTemplateAgentId),
    immutableOriginContractMapped: nextImmutableOriginContractMapped,
  });

  const changed =
    !existingSeed
    || prevTemplateAgentId !== nextTemplateAgentIdString
    || prevTemplateRole !== nextTemplateRole
    || (existingSeed?.protectedTemplate ?? false) !== Boolean(nextTemplateAgentId)
    || existingSeed.seedCoverage !== nextSeedCoverage
    || existingSeed.requiresSoulBuild !== nextRequiresSoulBuild
    || (existingSeed.requiresSoulBuildReason ?? null) !== (nextRequiresSoulBuildReason ?? null)
    || existingSeed.immutableOriginContractMapped !== nextImmutableOriginContractMapped
    || JSON.stringify(existingSeed.templateCloneBridge ?? null) !== JSON.stringify(nextSeedBridgeContract)
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
      templateCloneBridge: nextSeedBridgeContract,
      sourcePath: nextSourcePath,
      updatedAt: now,
    });
    seedRegistryId = String(existingSeed._id);
  } else {
    seedRegistryId = String(
      await dbAny.insert("agentCatalogSeedRegistry", {
        datasetVersion: args.datasetVersion,
        catalogAgentNumber: args.catalogAgentNumber,
        seedCoverage: nextSeedCoverage,
        requiresSoulBuild: nextRequiresSoulBuild,
        requiresSoulBuildReason: nextRequiresSoulBuildReason,
        systemTemplateAgentId: nextTemplateAgentId,
        templateRole: nextTemplateRole ?? undefined,
        protectedTemplate: Boolean(nextTemplateAgentId),
        immutableOriginContractMapped: nextImmutableOriginContractMapped,
        templateCloneBridge: nextSeedBridgeContract,
        sourcePath: nextSourcePath,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  await writeAgentCatalogAuditAction({
    ctx,
    organizationId: args.organizationId,
    userId: args.userId,
    actionType: args.actionType,
    datasetVersion: args.datasetVersion,
    catalogAgentNumber: args.catalogAgentNumber,
    actionData: {
      reason,
      changed,
      immutableRebindOverrideApplied: args.allowImmutableRebind,
      seedRegistryId,
      previousTemplateAgentId: prevTemplateAgentId,
      nextTemplateAgentId: nextTemplateAgentIdString,
      templateRole: nextTemplateRole,
      templateName,
      templateScope,
      protectedTemplate: Boolean(nextTemplateAgentId),
      seedCoverage: nextSeedCoverage,
      requiresSoulBuild: nextRequiresSoulBuild,
      seedTemplateBridge: nextSeedBridgeContract,
    },
    objectType: args.objectType,
  });

  return {
    success: true,
    datasetVersion: args.datasetVersion,
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
    seedTemplateBridge: nextSeedBridgeContract,
  };
}

export const overrideSeedTemplateBindingMigration = mutation({
  args: {
    sessionId: v.string(),
    datasetVersion: v.optional(v.string()),
    catalogAgentNumber: v.number(),
    templateAgentId: v.optional(v.id("objects")),
    migrationReason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireSuperAdminSession(ctx, args.sessionId);
    return await applySeedTemplateBinding(ctx, {
      userId,
      organizationId,
      datasetVersion: normalizeDatasetVersion(args.datasetVersion),
      catalogAgentNumber: args.catalogAgentNumber,
      templateAgentId: args.templateAgentId,
      reason: args.migrationReason,
      allowImmutableRebind: true,
      actionType: "agent_catalog.seed_template_binding_migration_override",
      sourcePathPrefix: "migration://agentCatalogAdmin.overrideSeedTemplateBindingMigration",
      objectType: "agent_catalog_seed_template_binding_migration_override",
    });
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
