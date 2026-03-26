import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
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
import {
  AGENT_RUNTIME_TOPOLOGY_CONTRACT_VERSION,
  isAgentRuntimeTopologyProfile,
  resolveAgentRuntimeTopologyAdapter,
  type AgentRuntimeTopologyAdapter,
  type AgentRuntimeTopologyProfile,
} from "../schemas/aiSchemas";
import {
  buildTemplateCertificationSlackStrictCredentialGovernancePolicy,
  dispatchTemplateCertificationSlackAlert,
  evaluateTemplateCertificationSlackCredentialState,
  isTemplateCertificationSlackCredentialGovernanceStrict,
} from "../channels/providers/slackProvider";
import {
  buildTemplateCertificationPagerDutyStrictCredentialGovernancePolicy,
  dispatchTemplateCertificationPagerDutyAlert,
  evaluateTemplateCertificationPagerDutyCredentialState,
  isTemplateCertificationPagerDutyCredentialGovernanceStrict,
} from "../channels/providers/templateCertificationPagerDutyAdapter";
import {
  buildTemplateCertificationEmailStrictCredentialGovernancePolicy,
  dispatchTemplateCertificationEmailAlert,
  evaluateTemplateCertificationEmailCredentialState,
  isTemplateCertificationEmailCredentialGovernanceStrict,
} from "../channels/providers/templateCertificationEmailAdapter";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../_generated/api");

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
export const TEMPLATE_CERTIFICATION_REQUIREMENT_AUTHORING_STANDARDS_CONTRACT_VERSION =
  "template_certification_requirement_authoring_standards_v1" as const;
export const TEMPLATE_CERTIFICATION_RISK_POLICY_SETTINGS_CONTRACT_VERSION =
  "template_certification_risk_policy_settings_v1" as const;
export const TEMPLATE_CERTIFICATION_AUTOMATION_POLICY_CONTRACT_VERSION =
  "template_certification_automation_policy_v1" as const;
export const TEMPLATE_CERTIFICATION_AUTOMATION_POLICY_SETTINGS_CONTRACT_VERSION =
  "template_certification_automation_policy_settings_v1" as const;
export const TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTRACT_VERSION =
  "template_certification_alert_dispatch_v1" as const;
export const TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL_CONTRACT_VERSION =
  "template_certification_alert_dispatch_control_v1" as const;
export const TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL_SETTINGS_CONTRACT_VERSION =
  "template_certification_alert_dispatch_control_settings_v1" as const;
const TEMPLATE_CERTIFICATION_RISK_POLICY_SETTING_KEY =
  "templateCertificationRiskPolicyV1";
const TEMPLATE_CERTIFICATION_RISK_POLICY_SETTING_DESCRIPTION =
  "Template certification risk policy defaults plus optional per-template-family overlays for field-tier mapping, verification requirements, and auto-certification eligibility.";
const TEMPLATE_CERTIFICATION_AUTOMATION_POLICY_SETTING_KEY =
  "templateCertificationAutomationPolicyV1";
const TEMPLATE_CERTIFICATION_AUTOMATION_POLICY_SETTING_DESCRIPTION =
  "Template certification automation ownership and alert routing defaults plus optional per-template-family overlays.";
const TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL_SETTING_KEY =
  "templateCertificationAlertDispatchControlV1";
const TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL_SETTING_DESCRIPTION =
  "Template certification alert worker transport enablement, retry policy, acknowledgement, noise-throttle controls, and strict credential-governance rollout settings.";
const TEMPLATE_CERTIFICATION_ALERT_CREDENTIAL_RUNBOOK_PATH =
  "docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/TRANSPORT_CREDENTIAL_RUNBOOK.md";
const TEMPLATE_CERTIFICATION_ALERT_DISPATCH_ACTION_TYPE =
  "template_certification.alert_dispatch" as const;

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
export type TemplateCertificationAutomationAdoptionMode =
  | "manual"
  | "shadow"
  | "enforced";
export type TemplateCertificationAlertStrictModeRolloutMode =
  | "manual"
  | "auto_promote_ready_channels";
export type TemplateCertificationAlertStrictModeGuardrailMode = "advisory" | "enforced";
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

export interface TemplateCertificationRequirementAuthoringStandards {
  contractVersion: typeof TEMPLATE_CERTIFICATION_REQUIREMENT_AUTHORING_STANDARDS_CONTRACT_VERSION;
  foundationalRequirements: TemplateCertificationRequirement[];
  operationalEvidenceRequirementByTier: {
    low: TemplateCertificationRequirement[];
    medium: TemplateCertificationRequirement[];
    high: TemplateCertificationRequirement[];
  };
}

export interface TemplateCertificationRequirementAuthoringCoverage {
  standards: TemplateCertificationRequirementAuthoringStandards;
  byTier: Record<
    TemplateCertificationRiskTier,
    {
      requirements: TemplateCertificationRequirement[];
      foundationalSatisfied: boolean;
      operationalEvidenceSatisfied: boolean;
    }
  >;
}

interface TemplateCertificationRiskPolicySettings {
  contractVersion: typeof TEMPLATE_CERTIFICATION_RISK_POLICY_SETTINGS_CONTRACT_VERSION;
  globalPolicy: TemplateCertificationRiskPolicy;
  familyPolicies: Record<string, TemplateCertificationRiskPolicy>;
}

export interface TemplateCertificationAutomationPolicy {
  contractVersion: typeof TEMPLATE_CERTIFICATION_AUTOMATION_POLICY_CONTRACT_VERSION;
  adoptionMode: TemplateCertificationAutomationAdoptionMode;
  ownerUserIds: string[];
  ownerTeamIds: string[];
  alertChannels: string[];
  alertOnCertificationBlocked: boolean;
  alertOnMissingDefaultEvidence: boolean;
}

interface TemplateCertificationAutomationPolicySettings {
  contractVersion: typeof TEMPLATE_CERTIFICATION_AUTOMATION_POLICY_SETTINGS_CONTRACT_VERSION;
  globalPolicy: TemplateCertificationAutomationPolicy;
  familyPolicies: Record<string, TemplateCertificationAutomationPolicy>;
}

export type TemplateCertificationAlertRecommendationCode =
  | "certification_blocked"
  | "default_evidence_missing"
  | "policy_drift_detected";
export type TemplateCertificationAlertQueueChannel = "slack" | "pagerduty" | "email";

export interface TemplateCertificationAlertRecommendation {
  code: TemplateCertificationAlertRecommendationCode;
  severity: "critical" | "warning";
  summary: string;
  ownerUserIds: string[];
  ownerTeamIds: string[];
  alertChannels: string[];
}

export type TemplateCertificationAlertDeliveryStatus =
  | "delivered_in_app"
  | "queued"
  | "suppressed_duplicate"
  | "unsupported_channel"
  | "dispatched"
  | "dispatch_failed"
  | "throttled"
  | "acknowledged";

export type TemplateCertificationAlertWorkerStatus =
  | "pending"
  | "dispatched"
  | "retry_scheduled"
  | "failed_terminal"
  | "throttled"
  | "acknowledged";

export interface TemplateCertificationAlertDispatchRecord {
  contractVersion: typeof TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTRACT_VERSION;
  templateId: string;
  templateVersionId: string;
  templateVersionTag: string;
  dependencyDigest: string;
  recommendationCode: TemplateCertificationAlertRecommendationCode;
  recommendationSeverity: "critical" | "warning";
  recommendationSummary: string;
  channel: string;
  deliveryStatus: TemplateCertificationAlertDeliveryStatus;
  dedupeKey: string;
  ownerUserIds: string[];
  ownerTeamIds: string[];
  recordedAt: number;
  recordedByUserId: string;
  workerStatus?: TemplateCertificationAlertWorkerStatus;
  attemptCount?: number;
  maxAttempts?: number;
  nextAttemptAt?: number;
  lastAttemptAt?: number;
  dispatchedAt?: number;
  acknowledgedAt?: number;
  acknowledgedByUserId?: string;
  acknowledgementNote?: string;
  throttleUntil?: number;
  throttleReason?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
}

export interface TemplateCertificationAlertChannelTransportPolicy {
  enabled: boolean;
  target: string | null;
}

export interface TemplateCertificationAlertChannelThrottlePolicy {
  windowMs: number;
  maxDispatches: number;
}

export interface TemplateCertificationAlertCredentialGovernancePolicy {
  requireDedicatedCredentials: boolean;
  allowInlineTargetCredentials: boolean;
  runbookUrl: string | null;
}

export interface TemplateCertificationAlertCredentialHealthStatus {
  ready: boolean;
  policyCompliant: boolean;
  credentialSource: string;
  reasonCode?: string;
  message: string;
  runbookUrl?: string;
}

export interface TemplateCertificationAlertStrictModePolicy {
  enabled: boolean;
  rolloutMode: TemplateCertificationAlertStrictModeRolloutMode;
  guardrailMode: TemplateCertificationAlertStrictModeGuardrailMode;
  notifyOnPolicyDrift: boolean;
}

export interface TemplateCertificationAlertPolicyDriftIssue {
  code: string;
  scope: "credential_governance" | "requirement_authoring";
  channel?: TemplateCertificationAlertQueueChannel;
  tier?: TemplateCertificationRiskTier;
  message: string;
}

export interface TemplateCertificationAlertPolicyDriftStatus {
  strictModeEnabled: boolean;
  detected: boolean;
  issueCount: number;
  issues: TemplateCertificationAlertPolicyDriftIssue[];
}

export interface TemplateCertificationAlertStrictModeRolloutStatus {
  enabled: boolean;
  rolloutMode: TemplateCertificationAlertStrictModeRolloutMode;
  guardrailMode: TemplateCertificationAlertStrictModeGuardrailMode;
  promotedChannels: TemplateCertificationAlertQueueChannel[];
  blockedChannels: Array<{
    channel: TemplateCertificationAlertQueueChannel;
    reasonCode?: string;
    message: string;
  }>;
}

export interface TemplateCertificationAlertDispatchControl {
  contractVersion: typeof TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL_CONTRACT_VERSION;
  maxAttempts: number;
  retryDelayMs: number;
  channels: Record<TemplateCertificationAlertQueueChannel, TemplateCertificationAlertChannelTransportPolicy>;
  throttle: Record<TemplateCertificationAlertQueueChannel, TemplateCertificationAlertChannelThrottlePolicy>;
  credentialGovernance: Record<
    TemplateCertificationAlertQueueChannel,
    TemplateCertificationAlertCredentialGovernancePolicy
  >;
  strictMode: TemplateCertificationAlertStrictModePolicy;
}

interface TemplateCertificationAlertDispatchControlSettings {
  contractVersion: typeof TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL_SETTINGS_CONTRACT_VERSION;
  policy: TemplateCertificationAlertDispatchControl;
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
  requirementAuthoring: TemplateCertificationRequirementAuthoringCoverage;
  defaultEvidenceSources: TemplateCertificationEvidenceSourceType[];
  templateFamily?: string;
  automationPolicyScope: "global" | "family";
  automationAdoptionMode: TemplateCertificationAutomationAdoptionMode;
  automationOwnerUserIds: string[];
  automationOwnerTeamIds: string[];
  automationAlertChannels: string[];
  ingestedEvaluationOutputs: Array<
    TemplateCertificationEvaluationOutput & {
      usedForEvidence: boolean;
    }
  >;
  recordedEvidenceSources: TemplateCertificationEvidenceSource[];
  missingRequiredVerification: TemplateCertificationRequirement[];
  failedRequiredVerification: TemplateCertificationRequirement[];
  missingDefaultEvidenceSources: TemplateCertificationEvidenceSourceType[];
  alertRecommendations: TemplateCertificationAlertRecommendation[];
  alertDispatches: TemplateCertificationAlertDispatchRecord[];
  policyDrift: TemplateCertificationAlertPolicyDriftStatus;
  strictModeRollout: TemplateCertificationAlertStrictModeRolloutStatus;
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

export const EXISTING_AGENT_TOPOLOGY_COMPATIBILITY_CONTRACT_VERSION =
  "oar_existing_agent_topology_compatibility_v1" as const;

type ExistingAgentTopologyCompatibilityStatus = "compatible" | "blocked";
type ExistingAgentTopologyCompatibilityReasonCode =
  | "topology_declaration_enforced"
  | "topology_declaration_missing"
  | "topology_profile_invalid"
  | "topology_adapter_mismatch"
  | "topology_runtime_module_mismatch";

type ExistingAgentTopologyCompatibility = {
  contractVersion: typeof EXISTING_AGENT_TOPOLOGY_COMPATIBILITY_CONTRACT_VERSION;
  status: ExistingAgentTopologyCompatibilityStatus;
  reasonCode: ExistingAgentTopologyCompatibilityReasonCode;
  profile?: AgentRuntimeTopologyProfile;
  adapter?: AgentRuntimeTopologyAdapter;
  runtimeModuleKey?: string;
  checkedAt: number;
};

type CurrentDefaultTemplateWaeGateContext = {
  templateId: Id<"objects">;
  templateName: string;
  templateOrganizationId: Id<"organizations">;
  templateVersionId: Id<"objects">;
  templateVersionTag: string;
  templateLifecycleStatus: string;
  templateVersionLifecycleStatus: string;
  topologyCompatibility: ExistingAgentTopologyCompatibility;
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
const templateCertificationAutomationAdoptionModeValidator = v.union(
  v.literal("manual"),
  v.literal("shadow"),
  v.literal("enforced"),
);
const templateCertificationAlertStrictModeRolloutModeValidator = v.union(
  v.literal("manual"),
  v.literal("auto_promote_ready_channels"),
);
const templateCertificationAlertStrictModeGuardrailModeValidator = v.union(
  v.literal("advisory"),
  v.literal("enforced"),
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

function normalizeBoundedInteger(args: {
  value: unknown;
  fallback: number;
  min: number;
  max: number;
}): number {
  const candidate = normalizeFiniteNumber(args.value);
  if (candidate === null) {
    return args.fallback;
  }
  return Math.max(args.min, Math.min(args.max, Math.floor(candidate)));
}

function normalizeOptionalBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
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

const TEMPLATE_CERTIFICATION_REQUIREMENT_ORDER: TemplateCertificationRequirement[] = [
  "manifest_integrity",
  "risk_assessment",
  "wae_eval",
  "behavioral_eval",
  "tool_contract_eval",
  "policy_compliance_eval",
];
const TEMPLATE_CERTIFICATION_FOUNDATIONAL_REQUIREMENTS: TemplateCertificationRequirement[] = [
  "manifest_integrity",
  "risk_assessment",
];
const TEMPLATE_CERTIFICATION_OPERATIONAL_REQUIREMENT_BY_TIER: Record<
  TemplateCertificationRiskTier,
  TemplateCertificationRequirement[]
> = {
  low: [],
  medium: [
    "wae_eval",
    "behavioral_eval",
    "tool_contract_eval",
    "policy_compliance_eval",
  ],
  high: [
    "wae_eval",
    "behavioral_eval",
    "tool_contract_eval",
    "policy_compliance_eval",
  ],
};
export const TEMPLATE_CERTIFICATION_REQUIREMENT_AUTHORING_STANDARDS:
TemplateCertificationRequirementAuthoringStandards = {
  contractVersion: TEMPLATE_CERTIFICATION_REQUIREMENT_AUTHORING_STANDARDS_CONTRACT_VERSION,
  foundationalRequirements: [...TEMPLATE_CERTIFICATION_FOUNDATIONAL_REQUIREMENTS],
  operationalEvidenceRequirementByTier: {
    low: [...TEMPLATE_CERTIFICATION_OPERATIONAL_REQUIREMENT_BY_TIER.low],
    medium: [...TEMPLATE_CERTIFICATION_OPERATIONAL_REQUIREMENT_BY_TIER.medium],
    high: [...TEMPLATE_CERTIFICATION_OPERATIONAL_REQUIREMENT_BY_TIER.high],
  },
};

function orderTemplateCertificationRequirements(
  values: Iterable<TemplateCertificationRequirement>,
): TemplateCertificationRequirement[] {
  const input = new Set(values);
  return TEMPLATE_CERTIFICATION_REQUIREMENT_ORDER.filter((entry) => input.has(entry));
}

function normalizeTemplateCertificationRequirementList(
  value: unknown,
  fallback: TemplateCertificationRequirement[],
  args?: {
    tier?: TemplateCertificationRiskTier;
  },
): TemplateCertificationRequirement[] {
  const normalized = normalizeStringArray(value).filter(isTemplateCertificationRequirement);
  const merged = new Set<TemplateCertificationRequirement>(
    normalized.length > 0 ? normalized : [...fallback],
  );
  for (const foundationalRequirement of TEMPLATE_CERTIFICATION_FOUNDATIONAL_REQUIREMENTS) {
    merged.add(foundationalRequirement);
  }
  const tier = args?.tier;
  if (tier) {
    const operationalRequirements = TEMPLATE_CERTIFICATION_OPERATIONAL_REQUIREMENT_BY_TIER[tier];
    if (operationalRequirements.length > 0) {
      const hasOperationalRequirement = operationalRequirements.some((entry) => merged.has(entry));
      if (!hasOperationalRequirement) {
        const fallbackOperational = fallback.find((entry) =>
          operationalRequirements.includes(entry),
        );
        merged.add(fallbackOperational ?? operationalRequirements[0]);
      }
    }
  }
  return orderTemplateCertificationRequirements(merged);
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

function normalizeTemplateCertificationAutomationAdoptionMode(
  value: unknown,
  fallback: TemplateCertificationAutomationAdoptionMode,
): TemplateCertificationAutomationAdoptionMode {
  const normalized = normalizeOptionalString(value);
  if (normalized === "manual" || normalized === "shadow" || normalized === "enforced") {
    return normalized;
  }
  return fallback;
}

function normalizeTemplateCertificationAlertStrictModeRolloutMode(
  value: unknown,
  fallback: TemplateCertificationAlertStrictModeRolloutMode,
): TemplateCertificationAlertStrictModeRolloutMode {
  const normalized = normalizeOptionalString(value);
  if (normalized === "manual" || normalized === "auto_promote_ready_channels") {
    return normalized;
  }
  return fallback;
}

function normalizeTemplateCertificationAlertStrictModeGuardrailMode(
  value: unknown,
  fallback: TemplateCertificationAlertStrictModeGuardrailMode,
): TemplateCertificationAlertStrictModeGuardrailMode {
  const normalized = normalizeOptionalString(value);
  if (normalized === "advisory" || normalized === "enforced") {
    return normalized;
  }
  return fallback;
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

const DEFAULT_TEMPLATE_CERTIFICATION_AUTOMATION_POLICY: TemplateCertificationAutomationPolicy = {
  contractVersion: TEMPLATE_CERTIFICATION_AUTOMATION_POLICY_CONTRACT_VERSION,
  adoptionMode: "shadow",
  ownerUserIds: [],
  ownerTeamIds: [],
  alertChannels: ["slack"],
  alertOnCertificationBlocked: true,
  alertOnMissingDefaultEvidence: true,
};

const TEMPLATE_CERTIFICATION_ALERT_QUEUE_CHANNEL_LIST: TemplateCertificationAlertQueueChannel[] = [
  "slack",
  "pagerduty",
  "email",
];
const TEMPLATE_CERTIFICATION_ALERT_IMMEDIATE_CHANNELS = new Set<string>(["in_app"]);
const TEMPLATE_CERTIFICATION_ALERT_QUEUE_CHANNELS = new Set<string>(
  TEMPLATE_CERTIFICATION_ALERT_QUEUE_CHANNEL_LIST,
);

const DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL:
TemplateCertificationAlertDispatchControl = {
  contractVersion: TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL_CONTRACT_VERSION,
  maxAttempts: 3,
  retryDelayMs: 5 * 60 * 1000,
  channels: {
    slack: {
      enabled: true,
      target: "certification-alerts",
    },
    pagerduty: {
      enabled: true,
      target: "template-certification",
    },
    email: {
      enabled: true,
      target: "certification-alerts@ops.local",
    },
  },
  throttle: {
    slack: {
      windowMs: 15 * 60 * 1000,
      maxDispatches: 8,
    },
    pagerduty: {
      windowMs: 10 * 60 * 1000,
      maxDispatches: 6,
    },
    email: {
      windowMs: 30 * 60 * 1000,
      maxDispatches: 12,
    },
  },
  credentialGovernance: {
    slack: {
      requireDedicatedCredentials: false,
      allowInlineTargetCredentials: true,
      runbookUrl: `${TEMPLATE_CERTIFICATION_ALERT_CREDENTIAL_RUNBOOK_PATH}#slack`,
    },
    pagerduty: {
      requireDedicatedCredentials: false,
      allowInlineTargetCredentials: true,
      runbookUrl: `${TEMPLATE_CERTIFICATION_ALERT_CREDENTIAL_RUNBOOK_PATH}#pagerduty`,
    },
    email: {
      requireDedicatedCredentials: false,
      allowInlineTargetCredentials: true,
      runbookUrl: `${TEMPLATE_CERTIFICATION_ALERT_CREDENTIAL_RUNBOOK_PATH}#email`,
    },
  },
  strictMode: {
    enabled: false,
    rolloutMode: "auto_promote_ready_channels",
    guardrailMode: "advisory",
    notifyOnPolicyDrift: true,
  },
};

function buildTemplateCertificationRequirementAuthoringCoverage(
  policy: TemplateCertificationRiskPolicy,
): TemplateCertificationRequirementAuthoringCoverage {
  const byTier = (["low", "medium", "high"] as const).reduce(
    (accumulator, tier) => {
      const requirements = [...policy.requiredVerificationByTier[tier]];
      const foundationalSatisfied =
        TEMPLATE_CERTIFICATION_FOUNDATIONAL_REQUIREMENTS.every((requirement) =>
          requirements.includes(requirement),
        );
      const operationalRequirements = TEMPLATE_CERTIFICATION_OPERATIONAL_REQUIREMENT_BY_TIER[tier];
      const operationalEvidenceSatisfied =
        operationalRequirements.length === 0
        || operationalRequirements.some((requirement) => requirements.includes(requirement));
      accumulator[tier] = {
        requirements,
        foundationalSatisfied,
        operationalEvidenceSatisfied,
      };
      return accumulator;
    },
    {} as Record<
      TemplateCertificationRiskTier,
      {
        requirements: TemplateCertificationRequirement[];
        foundationalSatisfied: boolean;
        operationalEvidenceSatisfied: boolean;
      }
    >,
  );
  return {
    standards: TEMPLATE_CERTIFICATION_REQUIREMENT_AUTHORING_STANDARDS,
    byTier,
  };
}

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
        { tier: "low" },
      ),
      medium: normalizeTemplateCertificationRequirementList(
        requiredVerificationByTier.medium,
        DEFAULT_TEMPLATE_CERTIFICATION_RISK_POLICY.requiredVerificationByTier.medium,
        { tier: "medium" },
      ),
      high: normalizeTemplateCertificationRequirementList(
        requiredVerificationByTier.high,
        DEFAULT_TEMPLATE_CERTIFICATION_RISK_POLICY.requiredVerificationByTier.high,
        { tier: "high" },
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
  requirementAuthoring: TemplateCertificationRequirementAuthoringCoverage;
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
  const activePolicy = overlayPolicy ?? settings.globalPolicy;
  const scope: "global" | "family" = overlayPolicy ? "family" : "global";

  if (!setting) {
    return {
      policy: activePolicy,
      globalPolicy: settings.globalPolicy,
      familyPolicies: settings.familyPolicies,
      requirementAuthoring: buildTemplateCertificationRequirementAuthoringCoverage(activePolicy),
      scope,
      ...(requestedFamily ? { templateFamily: requestedFamily } : {}),
      ...(overlayPolicy ? { overlayPolicy } : {}),
      source: "default",
    };
  }
  return {
    policy: activePolicy,
    globalPolicy: settings.globalPolicy,
    familyPolicies: settings.familyPolicies,
    requirementAuthoring: buildTemplateCertificationRequirementAuthoringCoverage(activePolicy),
    scope,
    ...(requestedFamily ? { templateFamily: requestedFamily } : {}),
    ...(overlayPolicy ? { overlayPolicy } : {}),
    source: "platform_setting",
    ...(typeof setting.updatedAt === "number" && Number.isFinite(setting.updatedAt)
      ? { updatedAt: setting.updatedAt }
      : {}),
  };
}

function normalizeTemplateCertificationAutomationPolicy(
  value: unknown,
): TemplateCertificationAutomationPolicy {
  const record = asRecord(value);
  return {
    contractVersion: TEMPLATE_CERTIFICATION_AUTOMATION_POLICY_CONTRACT_VERSION,
    adoptionMode: normalizeTemplateCertificationAutomationAdoptionMode(
      record.adoptionMode,
      DEFAULT_TEMPLATE_CERTIFICATION_AUTOMATION_POLICY.adoptionMode,
    ),
    ownerUserIds: Object.prototype.hasOwnProperty.call(record, "ownerUserIds")
      ? normalizeStringArray(record.ownerUserIds)
      : [...DEFAULT_TEMPLATE_CERTIFICATION_AUTOMATION_POLICY.ownerUserIds],
    ownerTeamIds: Object.prototype.hasOwnProperty.call(record, "ownerTeamIds")
      ? normalizeStringArray(record.ownerTeamIds)
      : [...DEFAULT_TEMPLATE_CERTIFICATION_AUTOMATION_POLICY.ownerTeamIds],
    alertChannels: Object.prototype.hasOwnProperty.call(record, "alertChannels")
      ? normalizeStringArray(record.alertChannels)
      : [...DEFAULT_TEMPLATE_CERTIFICATION_AUTOMATION_POLICY.alertChannels],
    alertOnCertificationBlocked:
      typeof record.alertOnCertificationBlocked === "boolean"
        ? record.alertOnCertificationBlocked
        : DEFAULT_TEMPLATE_CERTIFICATION_AUTOMATION_POLICY.alertOnCertificationBlocked,
    alertOnMissingDefaultEvidence:
      typeof record.alertOnMissingDefaultEvidence === "boolean"
        ? record.alertOnMissingDefaultEvidence
        : DEFAULT_TEMPLATE_CERTIFICATION_AUTOMATION_POLICY.alertOnMissingDefaultEvidence,
  };
}

function mergeTemplateCertificationAutomationPolicy(
  current: TemplateCertificationAutomationPolicy,
  overrides: unknown,
): TemplateCertificationAutomationPolicy {
  const record = asRecord(overrides);
  return normalizeTemplateCertificationAutomationPolicy({
    ...current,
    ...(Object.prototype.hasOwnProperty.call(record, "adoptionMode")
      ? { adoptionMode: record.adoptionMode }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(record, "ownerUserIds")
      ? { ownerUserIds: record.ownerUserIds }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(record, "ownerTeamIds")
      ? { ownerTeamIds: record.ownerTeamIds }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(record, "alertChannels")
      ? { alertChannels: record.alertChannels }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(record, "alertOnCertificationBlocked")
      ? { alertOnCertificationBlocked: record.alertOnCertificationBlocked }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(record, "alertOnMissingDefaultEvidence")
      ? { alertOnMissingDefaultEvidence: record.alertOnMissingDefaultEvidence }
      : {}),
  });
}

function normalizeTemplateCertificationAutomationPolicySettings(
  value: unknown,
): TemplateCertificationAutomationPolicySettings {
  const record = asRecord(value);
  const hasExplicitSettingsShape =
    Object.prototype.hasOwnProperty.call(record, "globalPolicy")
    || Object.prototype.hasOwnProperty.call(record, "familyPolicies");
  const globalPolicy = normalizeTemplateCertificationAutomationPolicy(
    hasExplicitSettingsShape ? record.globalPolicy : value,
  );
  const familyPoliciesRecord = hasExplicitSettingsShape ? asRecord(record.familyPolicies) : {};
  const familyPolicies: Record<string, TemplateCertificationAutomationPolicy> = {};
  for (const [rawKey, rawPolicy] of Object.entries(familyPoliciesRecord)) {
    const key = normalizeTemplateCertificationFamilyKey(rawKey);
    if (!key) {
      continue;
    }
    familyPolicies[key] = normalizeTemplateCertificationAutomationPolicy(rawPolicy);
  }
  return {
    contractVersion: TEMPLATE_CERTIFICATION_AUTOMATION_POLICY_SETTINGS_CONTRACT_VERSION,
    globalPolicy,
    familyPolicies,
  };
}

async function readTemplateCertificationAutomationPolicy(
  ctx: QueryCtx | MutationCtx,
  args?: {
    templateFamily?: string | null;
  },
): Promise<{
  policy: TemplateCertificationAutomationPolicy;
  globalPolicy: TemplateCertificationAutomationPolicy;
  familyPolicies: Record<string, TemplateCertificationAutomationPolicy>;
  scope: "global" | "family";
  templateFamily?: string;
  overlayPolicy?: TemplateCertificationAutomationPolicy;
  source: "default" | "platform_setting";
  updatedAt?: number;
}> {
  const requestedFamily = normalizeTemplateCertificationFamilyKey(args?.templateFamily);
  const dbAny = ctx.db as any;
  const settingRows = await dbAny
    .query("platformSettings")
    .withIndex("by_key", (q: any) => q.eq("key", TEMPLATE_CERTIFICATION_AUTOMATION_POLICY_SETTING_KEY))
    .collect();
  const setting = settingRows[0] ?? null;
  const settings = setting
    ? normalizeTemplateCertificationAutomationPolicySettings(setting.value)
    : {
        contractVersion: TEMPLATE_CERTIFICATION_AUTOMATION_POLICY_SETTINGS_CONTRACT_VERSION,
        globalPolicy: DEFAULT_TEMPLATE_CERTIFICATION_AUTOMATION_POLICY,
        familyPolicies: {},
      } satisfies TemplateCertificationAutomationPolicySettings;
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

function normalizeTemplateCertificationAlertQueueChannel(
  value: unknown,
): TemplateCertificationAlertQueueChannel | null {
  const normalized = normalizeTemplateCertificationAlertChannel(value);
  if (normalized === "slack" || normalized === "pagerduty" || normalized === "email") {
    return normalized;
  }
  return null;
}

function normalizeTemplateCertificationAlertDispatchControl(
  value: unknown,
): TemplateCertificationAlertDispatchControl {
  const record = asRecord(value);
  const channelsRecord = asRecord(record.channels);
  const throttleRecord = asRecord(record.throttle);
  const credentialGovernanceRecord = asRecord(record.credentialGovernance);
  const strictModeRecord = asRecord(record.strictMode);
  const channels: Record<
    TemplateCertificationAlertQueueChannel,
    TemplateCertificationAlertChannelTransportPolicy
  > = {
    slack: { ...DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.channels.slack },
    pagerduty: { ...DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.channels.pagerduty },
    email: { ...DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.channels.email },
  };
  const throttle: Record<
    TemplateCertificationAlertQueueChannel,
    TemplateCertificationAlertChannelThrottlePolicy
  > = {
    slack: { ...DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.throttle.slack },
    pagerduty: { ...DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.throttle.pagerduty },
    email: { ...DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.throttle.email },
  };
  const credentialGovernance: Record<
    TemplateCertificationAlertQueueChannel,
    TemplateCertificationAlertCredentialGovernancePolicy
  > = {
    slack: { ...DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.credentialGovernance.slack },
    pagerduty: {
      ...DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.credentialGovernance.pagerduty,
    },
    email: { ...DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.credentialGovernance.email },
  };
  const strictMode: TemplateCertificationAlertStrictModePolicy = {
    enabled: normalizeOptionalBoolean(
      strictModeRecord.enabled,
      DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.strictMode.enabled,
    ),
    rolloutMode: normalizeTemplateCertificationAlertStrictModeRolloutMode(
      strictModeRecord.rolloutMode,
      DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.strictMode.rolloutMode,
    ),
    guardrailMode: normalizeTemplateCertificationAlertStrictModeGuardrailMode(
      strictModeRecord.guardrailMode,
      DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.strictMode.guardrailMode,
    ),
    notifyOnPolicyDrift: normalizeOptionalBoolean(
      strictModeRecord.notifyOnPolicyDrift,
      DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.strictMode.notifyOnPolicyDrift,
    ),
  };

  for (const channel of TEMPLATE_CERTIFICATION_ALERT_QUEUE_CHANNEL_LIST) {
    const channelRecord = asRecord(channelsRecord[channel]);
    channels[channel] = {
      enabled: normalizeOptionalBoolean(
        channelRecord.enabled,
        DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.channels[channel].enabled,
      ),
      target: Object.prototype.hasOwnProperty.call(channelRecord, "target")
        ? normalizeOptionalString(channelRecord.target)
        : DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.channels[channel].target,
    };

    const throttlePolicyRecord = asRecord(throttleRecord[channel]);
    throttle[channel] = {
      windowMs: normalizeBoundedInteger({
        value: throttlePolicyRecord.windowMs,
        fallback: DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.throttle[channel].windowMs,
        min: 60_000,
        max: 24 * 60 * 60 * 1000,
      }),
      maxDispatches: normalizeBoundedInteger({
        value: throttlePolicyRecord.maxDispatches,
        fallback:
          DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.throttle[channel].maxDispatches,
        min: 1,
        max: 1000,
      }),
    };

    const credentialGovernancePolicy = asRecord(credentialGovernanceRecord[channel]);
    credentialGovernance[channel] = {
      requireDedicatedCredentials: normalizeOptionalBoolean(
        credentialGovernancePolicy.requireDedicatedCredentials,
        DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.credentialGovernance[channel]
          .requireDedicatedCredentials,
      ),
      allowInlineTargetCredentials: normalizeOptionalBoolean(
        credentialGovernancePolicy.allowInlineTargetCredentials,
        DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.credentialGovernance[channel]
          .allowInlineTargetCredentials,
      ),
      runbookUrl: Object.prototype.hasOwnProperty.call(credentialGovernancePolicy, "runbookUrl")
        ? normalizeOptionalString(credentialGovernancePolicy.runbookUrl)
        : DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.credentialGovernance[channel]
          .runbookUrl,
    };
  }

  return {
    contractVersion: TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL_CONTRACT_VERSION,
    maxAttempts: normalizeBoundedInteger({
      value: record.maxAttempts,
      fallback: DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.maxAttempts,
      min: 1,
      max: 10,
    }),
    retryDelayMs: normalizeBoundedInteger({
      value: record.retryDelayMs,
      fallback: DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.retryDelayMs,
      min: 1_000,
      max: 24 * 60 * 60 * 1000,
    }),
    channels,
    throttle,
    credentialGovernance,
    strictMode,
  };
}

function mergeTemplateCertificationAlertDispatchControl(
  current: TemplateCertificationAlertDispatchControl,
  overrides: unknown,
): TemplateCertificationAlertDispatchControl {
  const record = asRecord(overrides);
  const channelsRecord = asRecord(record.channels);
  const throttleRecord = asRecord(record.throttle);
  const credentialGovernanceRecord = asRecord(record.credentialGovernance);
  const strictModeRecord = asRecord(record.strictMode);
  const mergedChannels: Record<
    TemplateCertificationAlertQueueChannel,
    Record<string, unknown>
  > = {
    slack: {
      ...current.channels.slack,
      ...asRecord(channelsRecord.slack),
    },
    pagerduty: {
      ...current.channels.pagerduty,
      ...asRecord(channelsRecord.pagerduty),
    },
    email: {
      ...current.channels.email,
      ...asRecord(channelsRecord.email),
    },
  };
  const mergedThrottle: Record<
    TemplateCertificationAlertQueueChannel,
    Record<string, unknown>
  > = {
    slack: {
      ...current.throttle.slack,
      ...asRecord(throttleRecord.slack),
    },
    pagerduty: {
      ...current.throttle.pagerduty,
      ...asRecord(throttleRecord.pagerduty),
    },
    email: {
      ...current.throttle.email,
      ...asRecord(throttleRecord.email),
    },
  };
  const mergedCredentialGovernance: Record<
    TemplateCertificationAlertQueueChannel,
    Record<string, unknown>
  > = {
    slack: {
      ...current.credentialGovernance.slack,
      ...asRecord(credentialGovernanceRecord.slack),
    },
    pagerduty: {
      ...current.credentialGovernance.pagerduty,
      ...asRecord(credentialGovernanceRecord.pagerduty),
    },
    email: {
      ...current.credentialGovernance.email,
      ...asRecord(credentialGovernanceRecord.email),
    },
  };
  const mergedStrictMode: Record<string, unknown> = {
    ...current.strictMode,
    ...strictModeRecord,
  };
  return normalizeTemplateCertificationAlertDispatchControl({
    ...current,
    ...(Object.prototype.hasOwnProperty.call(record, "maxAttempts")
      ? { maxAttempts: record.maxAttempts }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(record, "retryDelayMs")
      ? { retryDelayMs: record.retryDelayMs }
      : {}),
    channels: mergedChannels,
    throttle: mergedThrottle,
    credentialGovernance: mergedCredentialGovernance,
    strictMode: mergedStrictMode,
  });
}

function normalizeTemplateCertificationAlertDispatchControlSettings(
  value: unknown,
): TemplateCertificationAlertDispatchControlSettings {
  const record = asRecord(value);
  const hasPolicyShape = Object.prototype.hasOwnProperty.call(record, "policy");
  const policy = normalizeTemplateCertificationAlertDispatchControl(
    hasPolicyShape ? record.policy : value,
  );
  return {
    contractVersion: TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL_SETTINGS_CONTRACT_VERSION,
    policy,
  };
}

async function readTemplateCertificationAlertDispatchControl(
  ctx: QueryCtx | MutationCtx,
): Promise<{
  policy: TemplateCertificationAlertDispatchControl;
  source: "default" | "platform_setting";
  updatedAt?: number;
}> {
  const dbAny = ctx.db as any;
  const settingRows = await dbAny
    .query("platformSettings")
    .withIndex("by_key", (q: any) =>
      q.eq("key", TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL_SETTING_KEY))
    .collect();
  const setting = settingRows[0] ?? null;
  if (!setting) {
    return {
      policy: DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL,
      source: "default",
    };
  }
  const settings = normalizeTemplateCertificationAlertDispatchControlSettings(setting.value);
  return {
    policy: settings.policy,
    source: "platform_setting",
    ...(typeof setting.updatedAt === "number" && Number.isFinite(setting.updatedAt)
      ? { updatedAt: setting.updatedAt }
      : {}),
  };
}

function buildTemplateCertificationAlertCredentialHealth(args: {
  control: TemplateCertificationAlertDispatchControl;
}): Record<TemplateCertificationAlertQueueChannel, TemplateCertificationAlertCredentialHealthStatus> {
  const slackState = evaluateTemplateCertificationSlackCredentialState({
    target: args.control.channels.slack.target ?? undefined,
    policy: {
      requireDedicatedCredentials:
        args.control.credentialGovernance.slack.requireDedicatedCredentials,
      allowInlineTargetCredentials:
        args.control.credentialGovernance.slack.allowInlineTargetCredentials,
      runbookUrl: args.control.credentialGovernance.slack.runbookUrl,
    },
  });
  const pagerDutyState = evaluateTemplateCertificationPagerDutyCredentialState({
    target: args.control.channels.pagerduty.target ?? undefined,
    policy: {
      allowInlineTargetCredentials:
        args.control.credentialGovernance.pagerduty.allowInlineTargetCredentials,
      runbookUrl: args.control.credentialGovernance.pagerduty.runbookUrl,
    },
  });
  const emailState = evaluateTemplateCertificationEmailCredentialState({
    target: args.control.channels.email.target ?? undefined,
    policy: {
      requireDedicatedCredentials:
        args.control.credentialGovernance.email.requireDedicatedCredentials,
      runbookUrl: args.control.credentialGovernance.email.runbookUrl,
    },
  });
  return {
    slack: {
      ready: slackState.ready,
      policyCompliant: slackState.policyCompliant,
      credentialSource: slackState.credentialSource,
      ...(slackState.reasonCode ? { reasonCode: slackState.reasonCode } : {}),
      message: slackState.message,
      ...(slackState.runbookUrl ? { runbookUrl: slackState.runbookUrl } : {}),
    },
    pagerduty: {
      ready: pagerDutyState.ready,
      policyCompliant: pagerDutyState.policyCompliant,
      credentialSource: pagerDutyState.credentialSource,
      ...(pagerDutyState.reasonCode ? { reasonCode: pagerDutyState.reasonCode } : {}),
      message: pagerDutyState.message,
      ...(pagerDutyState.runbookUrl ? { runbookUrl: pagerDutyState.runbookUrl } : {}),
    },
    email: {
      ready: emailState.ready,
      policyCompliant: emailState.policyCompliant,
      credentialSource: emailState.credentialSource,
      ...(emailState.reasonCode ? { reasonCode: emailState.reasonCode } : {}),
      message: emailState.message,
      ...(emailState.runbookUrl ? { runbookUrl: emailState.runbookUrl } : {}),
    },
  };
}

function buildTemplateCertificationAlertStrictCredentialGovernance(args: {
  channel: TemplateCertificationAlertQueueChannel;
  policy: TemplateCertificationAlertCredentialGovernancePolicy;
}): TemplateCertificationAlertCredentialGovernancePolicy {
  if (args.channel === "slack") {
    const strict = buildTemplateCertificationSlackStrictCredentialGovernancePolicy({
      requireDedicatedCredentials: args.policy.requireDedicatedCredentials,
      allowInlineTargetCredentials: args.policy.allowInlineTargetCredentials,
      runbookUrl: args.policy.runbookUrl,
    });
    return {
      requireDedicatedCredentials: strict.requireDedicatedCredentials === true,
      allowInlineTargetCredentials:
        strict.allowInlineTargetCredentials !== false ? false : strict.allowInlineTargetCredentials,
      runbookUrl: strict.runbookUrl ?? args.policy.runbookUrl,
    };
  }
  if (args.channel === "pagerduty") {
    const strict = buildTemplateCertificationPagerDutyStrictCredentialGovernancePolicy({
      allowInlineTargetCredentials: args.policy.allowInlineTargetCredentials,
      runbookUrl: args.policy.runbookUrl,
    });
    return {
      requireDedicatedCredentials: args.policy.requireDedicatedCredentials,
      allowInlineTargetCredentials: false,
      runbookUrl: strict.runbookUrl ?? args.policy.runbookUrl,
    };
  }
  const strict = buildTemplateCertificationEmailStrictCredentialGovernancePolicy({
    requireDedicatedCredentials: args.policy.requireDedicatedCredentials,
    runbookUrl: args.policy.runbookUrl,
  });
  return {
    requireDedicatedCredentials: strict.requireDedicatedCredentials === true,
    allowInlineTargetCredentials: false,
    runbookUrl: strict.runbookUrl ?? args.policy.runbookUrl,
  };
}

function isTemplateCertificationAlertCredentialGovernanceStrict(args: {
  channel: TemplateCertificationAlertQueueChannel;
  policy: TemplateCertificationAlertCredentialGovernancePolicy;
}): boolean {
  if (args.channel === "slack") {
    return isTemplateCertificationSlackCredentialGovernanceStrict({
      requireDedicatedCredentials: args.policy.requireDedicatedCredentials,
      allowInlineTargetCredentials: args.policy.allowInlineTargetCredentials,
      runbookUrl: args.policy.runbookUrl,
    });
  }
  if (args.channel === "pagerduty") {
    return isTemplateCertificationPagerDutyCredentialGovernanceStrict({
      allowInlineTargetCredentials: args.policy.allowInlineTargetCredentials,
      runbookUrl: args.policy.runbookUrl,
    });
  }
  return isTemplateCertificationEmailCredentialGovernanceStrict({
    requireDedicatedCredentials: args.policy.requireDedicatedCredentials,
    runbookUrl: args.policy.runbookUrl,
  });
}

function evaluateTemplateCertificationStrictChannelCredentialState(args: {
  channel: TemplateCertificationAlertQueueChannel;
  target: string | null;
  policy: TemplateCertificationAlertCredentialGovernancePolicy;
}): {
  ready: boolean;
  reasonCode?: string;
  message: string;
} {
  if (args.channel === "slack") {
    const state = evaluateTemplateCertificationSlackCredentialState({
      target: args.target ?? undefined,
      policy: {
        requireDedicatedCredentials: args.policy.requireDedicatedCredentials,
        allowInlineTargetCredentials: args.policy.allowInlineTargetCredentials,
        runbookUrl: args.policy.runbookUrl,
      },
    });
    return {
      ready: state.ready,
      ...(state.reasonCode ? { reasonCode: state.reasonCode } : {}),
      message: state.message,
    };
  }
  if (args.channel === "pagerduty") {
    const state = evaluateTemplateCertificationPagerDutyCredentialState({
      target: args.target ?? undefined,
      policy: {
        allowInlineTargetCredentials: args.policy.allowInlineTargetCredentials,
        runbookUrl: args.policy.runbookUrl,
      },
    });
    return {
      ready: state.ready,
      ...(state.reasonCode ? { reasonCode: state.reasonCode } : {}),
      message: state.message,
    };
  }
  const state = evaluateTemplateCertificationEmailCredentialState({
    target: args.target ?? undefined,
    policy: {
      requireDedicatedCredentials: args.policy.requireDedicatedCredentials,
      runbookUrl: args.policy.runbookUrl,
    },
  });
  return {
    ready: state.ready,
    ...(state.reasonCode ? { reasonCode: state.reasonCode } : {}),
    message: state.message,
  };
}

function buildTemplateCertificationAlertPolicyState(args: {
  control: TemplateCertificationAlertDispatchControl;
  requirementAuthoring: TemplateCertificationRequirementAuthoringCoverage;
}): {
  effectiveControl: TemplateCertificationAlertDispatchControl;
  credentialHealth: Record<
    TemplateCertificationAlertQueueChannel,
    TemplateCertificationAlertCredentialHealthStatus
  >;
  policyDrift: TemplateCertificationAlertPolicyDriftStatus;
  strictModeRollout: TemplateCertificationAlertStrictModeRolloutStatus;
} {
  const control = normalizeTemplateCertificationAlertDispatchControl(args.control);
  const effectiveControl = normalizeTemplateCertificationAlertDispatchControl(control);
  const promotedChannels: TemplateCertificationAlertQueueChannel[] = [];
  const blockedChannels: Array<{
    channel: TemplateCertificationAlertQueueChannel;
    reasonCode?: string;
    message: string;
  }> = [];
  const policyDriftIssues: TemplateCertificationAlertPolicyDriftIssue[] = [];

  if (control.strictMode.enabled) {
    for (const channel of TEMPLATE_CERTIFICATION_ALERT_QUEUE_CHANNEL_LIST) {
      const channelConfig = effectiveControl.channels[channel];
      const target = normalizeOptionalString(channelConfig.target);
      const channelActive = channelConfig.enabled && !!target;
      const strictGovernance = buildTemplateCertificationAlertStrictCredentialGovernance({
        channel,
        policy: effectiveControl.credentialGovernance[channel],
      });
      const currentlyStrict = isTemplateCertificationAlertCredentialGovernanceStrict({
        channel,
        policy: effectiveControl.credentialGovernance[channel],
      });
      if (!channelActive) {
        continue;
      }

      if (control.strictMode.guardrailMode === "enforced") {
        if (!currentlyStrict) {
          promotedChannels.push(channel);
        }
        effectiveControl.credentialGovernance[channel] = strictGovernance;
        continue;
      }

      if (!currentlyStrict && control.strictMode.rolloutMode === "auto_promote_ready_channels") {
        const strictState = evaluateTemplateCertificationStrictChannelCredentialState({
          channel,
          target,
          policy: strictGovernance,
        });
        if (strictState.ready) {
          effectiveControl.credentialGovernance[channel] = strictGovernance;
          promotedChannels.push(channel);
        } else {
          blockedChannels.push({
            channel,
            ...(strictState.reasonCode ? { reasonCode: strictState.reasonCode } : {}),
            message: strictState.message,
          });
        }
      }

      if (
        !currentlyStrict
        && control.strictMode.rolloutMode === "manual"
      ) {
        blockedChannels.push({
          channel,
          reasonCode: "strict_mode_manual_pending",
          message:
            `Strict credential-governance policy is pending for ${channel}. `
            + "Enable dedicated credentials and block inline target credentials.",
        });
      }
    }
  }

  if (control.strictMode.enabled) {
    for (const channel of TEMPLATE_CERTIFICATION_ALERT_QUEUE_CHANNEL_LIST) {
      const channelConfig = effectiveControl.channels[channel];
      const target = normalizeOptionalString(channelConfig.target);
      const channelActive = channelConfig.enabled && !!target;
      if (!channelActive) {
        continue;
      }
      const strict = isTemplateCertificationAlertCredentialGovernanceStrict({
        channel,
        policy: effectiveControl.credentialGovernance[channel],
      });
      if (!strict) {
        policyDriftIssues.push({
          code: `${channel}_credential_governance_drift`,
          scope: "credential_governance",
          channel,
          message:
            `Strict credential governance drift detected for ${channel}. `
            + "Dedicated credentials and inline-target guardrails are not fully enforced.",
        });
      }
    }
  }

  for (const tier of ["low", "medium", "high"] as const) {
    const coverage = args.requirementAuthoring.byTier[tier];
    if (!coverage.foundationalSatisfied) {
      policyDriftIssues.push({
        code: `${tier}_foundational_requirement_drift`,
        scope: "requirement_authoring",
        tier,
        message:
          `${tier} tier requirement authoring drift: `
          + "manifest integrity and risk assessment must be present.",
      });
    }
    if (!coverage.operationalEvidenceSatisfied) {
      policyDriftIssues.push({
        code: `${tier}_operational_requirement_drift`,
        scope: "requirement_authoring",
        tier,
        message:
          `${tier} tier requirement authoring drift: `
          + "at least one operational evidence requirement is required.",
      });
    }
  }

  const policyDrift = {
    strictModeEnabled: control.strictMode.enabled,
    detected: policyDriftIssues.length > 0,
    issueCount: policyDriftIssues.length,
    issues: [...policyDriftIssues].sort((left, right) => left.code.localeCompare(right.code)),
  } satisfies TemplateCertificationAlertPolicyDriftStatus;

  const strictModeRollout = {
    enabled: control.strictMode.enabled,
    rolloutMode: control.strictMode.rolloutMode,
    guardrailMode: control.strictMode.guardrailMode,
    promotedChannels: [...new Set(promotedChannels)].sort((left, right) =>
      left.localeCompare(right)
    ),
    blockedChannels: [...blockedChannels].sort((left, right) =>
      left.channel === right.channel
        ? (left.reasonCode ?? "").localeCompare(right.reasonCode ?? "")
        : left.channel.localeCompare(right.channel)
    ),
  } satisfies TemplateCertificationAlertStrictModeRolloutStatus;

  return {
    effectiveControl,
    credentialHealth: buildTemplateCertificationAlertCredentialHealth({
      control: effectiveControl,
    }),
    policyDrift,
    strictModeRollout,
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

function buildTemplateCertificationAlertRecommendations(args: {
  artifact: TemplateCertificationDecisionArtifact;
  missingDefaultEvidenceSources: TemplateCertificationEvidenceSourceType[];
  policy: TemplateCertificationAutomationPolicy;
  strictMode: TemplateCertificationAlertStrictModePolicy;
  policyDrift: TemplateCertificationAlertPolicyDriftStatus;
}): TemplateCertificationAlertRecommendation[] {
  const recommendations: TemplateCertificationAlertRecommendation[] = [];
  if (args.policy.alertOnCertificationBlocked && args.artifact.status !== "certified") {
    recommendations.push({
      code: "certification_blocked",
      severity: "critical",
      summary:
        `Template certification blocked for ${args.artifact.templateId}@${args.artifact.templateVersionTag} `
        + `(${args.artifact.reasonCode}).`,
      ownerUserIds: [...args.policy.ownerUserIds],
      ownerTeamIds: [...args.policy.ownerTeamIds],
      alertChannels: [...args.policy.alertChannels],
    });
  }
  if (
    args.policy.alertOnMissingDefaultEvidence
    && args.missingDefaultEvidenceSources.length > 0
  ) {
    recommendations.push({
      code: "default_evidence_missing",
      severity: "warning",
      summary:
        `Default automation evidence missing for ${args.artifact.templateId}@${args.artifact.templateVersionTag}: `
        + `${args.missingDefaultEvidenceSources.join(", ")}.`,
      ownerUserIds: [...args.policy.ownerUserIds],
      ownerTeamIds: [...args.policy.ownerTeamIds],
      alertChannels: [...args.policy.alertChannels],
    });
  }
  if (
    args.strictMode.notifyOnPolicyDrift
    && args.policyDrift.detected
    && args.policyDrift.issueCount > 0
  ) {
    const issueCodes = args.policyDrift.issues
      .map((issue) => issue.code)
      .sort((left, right) => left.localeCompare(right));
    const visibleCodes = issueCodes.slice(0, 4);
    const overflow = issueCodes.length - visibleCodes.length;
    const issueCodeSummary =
      overflow > 0
        ? `${visibleCodes.join(", ")} (+${overflow} more)`
        : visibleCodes.join(", ");
    recommendations.push({
      code: "policy_drift_detected",
      severity: "warning",
      summary:
        `Policy drift detected for ${args.artifact.templateId}@${args.artifact.templateVersionTag}: `
        + `${issueCodeSummary}.`,
      ownerUserIds: [...args.policy.ownerUserIds],
      ownerTeamIds: [...args.policy.ownerTeamIds],
      alertChannels: [...args.policy.alertChannels],
    });
  }
  return recommendations;
}

function buildTemplateCertificationCoverageSummary(args: {
  artifact: TemplateCertificationDecisionArtifact;
  requirementAuthoring: TemplateCertificationRequirementAuthoringCoverage;
  templateFamily?: string;
  automationPolicyScope: "global" | "family";
  automationPolicy: TemplateCertificationAutomationPolicy;
  dispatchStrictMode: TemplateCertificationAlertStrictModePolicy;
  alertPolicyDrift: TemplateCertificationAlertPolicyDriftStatus;
  strictModeRollout: TemplateCertificationAlertStrictModeRolloutStatus;
  defaultEvidenceSources: TemplateCertificationEvidenceSourceType[];
  ingestedEvaluationOutputs: TemplateCertificationEvaluationOutput[];
  usedOutputSourceTypes: TemplateCertificationEvidenceSourceType[];
  alertDispatches?: TemplateCertificationAlertDispatchRecord[];
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
  const alertRecommendations = buildTemplateCertificationAlertRecommendations({
    artifact: args.artifact,
    missingDefaultEvidenceSources,
    policy: args.automationPolicy,
    strictMode: args.dispatchStrictMode,
    policyDrift: args.alertPolicyDrift,
  });

  return {
    riskTier: args.artifact.riskAssessment.tier,
    requiredVerification: [...args.artifact.requiredVerification],
    requirementAuthoring: args.requirementAuthoring,
    defaultEvidenceSources: [...args.defaultEvidenceSources],
    ...(args.templateFamily ? { templateFamily: args.templateFamily } : {}),
    automationPolicyScope: args.automationPolicyScope,
    automationAdoptionMode: args.automationPolicy.adoptionMode,
    automationOwnerUserIds: [...args.automationPolicy.ownerUserIds],
    automationOwnerTeamIds: [...args.automationPolicy.ownerTeamIds],
    automationAlertChannels: [...args.automationPolicy.alertChannels],
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
    alertRecommendations,
    alertDispatches: args.alertDispatches ? [...args.alertDispatches] : [],
    policyDrift: args.alertPolicyDrift,
    strictModeRollout: args.strictModeRollout,
    blocked: args.artifact.status !== "certified",
    blockedReason: args.artifact.status === "certified" ? null : args.artifact.reasonCode,
  };
}

function normalizeTemplateCertificationAlertChannel(value: unknown): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  const channel = normalized
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return channel.length > 0 ? channel : null;
}

function normalizeTemplateCertificationAlertDeliveryStatus(
  value: unknown,
): TemplateCertificationAlertDeliveryStatus | null {
  const normalized = normalizeOptionalString(value);
  if (
    normalized === "delivered_in_app"
    || normalized === "queued"
    || normalized === "suppressed_duplicate"
    || normalized === "unsupported_channel"
    || normalized === "dispatched"
    || normalized === "dispatch_failed"
    || normalized === "throttled"
    || normalized === "acknowledged"
  ) {
    return normalized;
  }
  return null;
}

function normalizeTemplateCertificationAlertWorkerStatus(
  value: unknown,
): TemplateCertificationAlertWorkerStatus | null {
  const normalized = normalizeOptionalString(value);
  if (
    normalized === "pending"
    || normalized === "dispatched"
    || normalized === "retry_scheduled"
    || normalized === "failed_terminal"
    || normalized === "throttled"
    || normalized === "acknowledged"
  ) {
    return normalized;
  }
  return null;
}

type TemplateCertificationAlertDispatchEntry = {
  actionId: string;
  performedAt: number;
  record: TemplateCertificationAlertDispatchRecord;
  organizationId: Id<"organizations"> | undefined;
};

function sortTemplateCertificationAlertDispatchEntriesDesc(
  left: TemplateCertificationAlertDispatchEntry,
  right: TemplateCertificationAlertDispatchEntry,
): number {
  if (left.record.recordedAt !== right.record.recordedAt) {
    return right.record.recordedAt - left.record.recordedAt;
  }
  if (left.performedAt !== right.performedAt) {
    return right.performedAt - left.performedAt;
  }
  return right.actionId.localeCompare(left.actionId);
}

function sortTemplateCertificationAlertDispatchEntriesAsc(
  left: TemplateCertificationAlertDispatchEntry,
  right: TemplateCertificationAlertDispatchEntry,
): number {
  if (left.record.recordedAt !== right.record.recordedAt) {
    return left.record.recordedAt - right.record.recordedAt;
  }
  if (left.performedAt !== right.performedAt) {
    return left.performedAt - right.performedAt;
  }
  return left.actionId.localeCompare(right.actionId);
}

function buildTemplateCertificationAlertDispatchDedupeKey(args: {
  templateVersionId: string;
  dependencyDigest: string;
  recommendationCode: TemplateCertificationAlertRecommendationCode;
  channel: string;
}): string {
  return simpleHash(
    stableJsonStringify({
      templateVersionId: args.templateVersionId,
      dependencyDigest: args.dependencyDigest,
      recommendationCode: args.recommendationCode,
      channel: args.channel,
    }),
  );
}

function parseTemplateCertificationAlertDispatchRecord(
  value: unknown,
): TemplateCertificationAlertDispatchRecord | null {
  const record = asRecord(value);
  const contractVersion = normalizeOptionalString(record.contractVersion);
  const templateId = normalizeOptionalString(record.templateId);
  const templateVersionId = normalizeOptionalString(record.templateVersionId);
  const templateVersionTag = normalizeOptionalString(record.templateVersionTag);
  const dependencyDigest = normalizeOptionalString(record.dependencyDigest);
  const recommendationCode = normalizeOptionalString(record.recommendationCode);
  const recommendationSeverity = normalizeOptionalString(record.recommendationSeverity);
  const recommendationSummary = normalizeOptionalString(record.recommendationSummary);
  const channel = normalizeTemplateCertificationAlertChannel(record.channel);
  const deliveryStatus = normalizeTemplateCertificationAlertDeliveryStatus(record.deliveryStatus);
  const dedupeKey = normalizeOptionalString(record.dedupeKey);
  const recordedAt = normalizeFiniteNumber(record.recordedAt);
  const recordedByUserId = normalizeOptionalString(record.recordedByUserId);
  const queueChannel = normalizeTemplateCertificationAlertQueueChannel(channel);
  const workerStatus =
    normalizeTemplateCertificationAlertWorkerStatus(record.workerStatus)
    ?? (deliveryStatus === "queued"
      ? "pending"
      : deliveryStatus === "dispatched"
        ? "dispatched"
        : deliveryStatus === "dispatch_failed"
          ? "failed_terminal"
          : deliveryStatus === "throttled"
            ? "throttled"
            : deliveryStatus === "acknowledged"
              ? "acknowledged"
              : null);
  const attemptCount =
    queueChannel
      ? normalizeBoundedInteger({
        value: record.attemptCount,
        fallback: 0,
        min: 0,
        max: 1000,
      })
      : undefined;
  const maxAttempts =
    queueChannel
      ? normalizeBoundedInteger({
        value: record.maxAttempts,
        fallback: DEFAULT_TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL.maxAttempts,
        min: 1,
        max: 10,
      })
      : undefined;
  const nextAttemptAtValue = normalizeFiniteNumber(record.nextAttemptAt);
  const nextAttemptAt =
    queueChannel && (
      deliveryStatus === "queued"
      || deliveryStatus === "dispatch_failed"
      || deliveryStatus === "throttled"
    )
      ? (nextAttemptAtValue ?? recordedAt ?? Date.now())
      : undefined;
  const lastAttemptAt = normalizeFiniteNumber(record.lastAttemptAt);
  const dispatchedAt = normalizeFiniteNumber(record.dispatchedAt);
  const acknowledgedAt = normalizeFiniteNumber(record.acknowledgedAt);
  const acknowledgedByUserId = normalizeOptionalString(record.acknowledgedByUserId);
  const acknowledgementNote = normalizeOptionalString(record.acknowledgementNote);
  const throttleUntil = normalizeFiniteNumber(record.throttleUntil);
  const throttleReason = normalizeOptionalString(record.throttleReason);
  const lastErrorCode = normalizeOptionalString(record.lastErrorCode);
  const lastErrorMessage = normalizeOptionalString(record.lastErrorMessage);
  if (
    contractVersion !== TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTRACT_VERSION
    || !templateId
    || !templateVersionId
    || !templateVersionTag
    || !dependencyDigest
    || (recommendationCode !== "certification_blocked"
      && recommendationCode !== "default_evidence_missing"
      && recommendationCode !== "policy_drift_detected")
    || (recommendationSeverity !== "critical" && recommendationSeverity !== "warning")
    || !recommendationSummary
    || !channel
    || !deliveryStatus
    || !dedupeKey
    || recordedAt === null
    || !recordedByUserId
  ) {
    return null;
  }
  return {
    contractVersion: TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTRACT_VERSION,
    templateId,
    templateVersionId,
    templateVersionTag,
    dependencyDigest,
    recommendationCode,
    recommendationSeverity,
    recommendationSummary,
    channel,
    deliveryStatus,
    dedupeKey,
    ownerUserIds: normalizeStringArray(record.ownerUserIds),
    ownerTeamIds: normalizeStringArray(record.ownerTeamIds),
    recordedAt,
    recordedByUserId,
    ...(workerStatus ? { workerStatus } : {}),
    ...(typeof attemptCount === "number" ? { attemptCount } : {}),
    ...(typeof maxAttempts === "number" ? { maxAttempts } : {}),
    ...(typeof nextAttemptAt === "number" ? { nextAttemptAt } : {}),
    ...(typeof lastAttemptAt === "number" ? { lastAttemptAt } : {}),
    ...(typeof dispatchedAt === "number" ? { dispatchedAt } : {}),
    ...(typeof acknowledgedAt === "number" ? { acknowledgedAt } : {}),
    ...(acknowledgedByUserId ? { acknowledgedByUserId } : {}),
    ...(acknowledgementNote ? { acknowledgementNote } : {}),
    ...(typeof throttleUntil === "number" ? { throttleUntil } : {}),
    ...(throttleReason ? { throttleReason } : {}),
    ...(lastErrorCode ? { lastErrorCode } : {}),
    ...(lastErrorMessage ? { lastErrorMessage } : {}),
  };
}

async function getTemplateCertificationAlertDispatchEntries(
  ctx: QueryCtx | MutationCtx,
  templateVersionId: Id<"objects">,
): Promise<TemplateCertificationAlertDispatchEntry[]> {
  const dbAny = ctx.db as any;
  const actions = (await dbAny
    .query("objectActions")
    .withIndex("by_object_action_type", (q: any) =>
      q.eq("objectId", templateVersionId).eq("actionType", TEMPLATE_CERTIFICATION_ALERT_DISPATCH_ACTION_TYPE))
    .collect()) as Array<{
    _id: string;
    actionData?: unknown;
    performedAt?: unknown;
    organizationId?: Id<"organizations">;
  }>;
  return actions
    .map((row) => ({
      actionId: row._id,
      performedAt: normalizeFiniteNumber(row.performedAt) ?? 0,
      ...(row.organizationId ? { organizationId: row.organizationId } : {}),
      record: parseTemplateCertificationAlertDispatchRecord(row.actionData),
    }))
    .filter(
      (row): row is TemplateCertificationAlertDispatchEntry =>
        row.record !== null,
    );
}

async function getTemplateCertificationAlertDispatchHistory(
  ctx: QueryCtx | MutationCtx,
  templateVersionId: Id<"objects">,
  limit: number,
): Promise<TemplateCertificationAlertDispatchRecord[]> {
  const entries = await getTemplateCertificationAlertDispatchEntries(ctx, templateVersionId);
  return entries
    .sort(sortTemplateCertificationAlertDispatchEntriesDesc)
    .slice(0, Math.max(0, Math.floor(limit)))
    .map((row) => row.record);
}

async function scheduleTemplateCertificationAlertDispatchWorker(args: {
  ctx: MutationCtx;
  templateVersionId: Id<"objects">;
  delayMs?: number;
  limit?: number;
}): Promise<void> {
  const scheduler = (args.ctx as any).scheduler;
  if (!scheduler || typeof scheduler.runAfter !== "function") {
    return;
  }
  await scheduler.runAfter(
    Math.max(0, Math.floor(args.delayMs ?? 0)),
    generatedApi.internal.ai.agentCatalogAdmin.processTemplateCertificationAlertDispatchQueueInternal,
    {
      templateVersionId: args.templateVersionId,
      limit: Math.max(1, Math.min(100, Math.floor(args.limit ?? 25))),
    },
  );
}

async function recordTemplateCertificationAlertDispatches(args: {
  ctx: MutationCtx;
  organizationId: Id<"organizations">;
  templateVersionId: Id<"objects">;
  performedBy: Id<"users">;
  artifact: TemplateCertificationDecisionArtifact;
  recommendations: TemplateCertificationAlertRecommendation[];
}): Promise<TemplateCertificationAlertDispatchRecord[]> {
  if (args.recommendations.length === 0) {
    return [];
  }
  const existing = await getTemplateCertificationAlertDispatchHistory(
    args.ctx,
    args.templateVersionId,
    1000,
  );
  const dispatchControl = await readTemplateCertificationAlertDispatchControl(args.ctx);
  const existingDedupeKeys = new Set(existing.map((row) => row.dedupeKey));
  const dispatches: TemplateCertificationAlertDispatchRecord[] = [];
  const now = Date.now();
  let queuedDispatchRecorded = false;

  const sortedRecommendations = [...args.recommendations].sort((left, right) => {
    if (left.code !== right.code) {
      return left.code.localeCompare(right.code);
    }
    if (left.severity !== right.severity) {
      return left.severity.localeCompare(right.severity);
    }
    return left.summary.localeCompare(right.summary);
  });

  for (const recommendation of sortedRecommendations) {
    const channels = normalizeStringArray(recommendation.alertChannels)
      .map((channel) => normalizeTemplateCertificationAlertChannel(channel))
      .filter((channel): channel is string => channel !== null);
    for (const channel of channels) {
      const dedupeKey = buildTemplateCertificationAlertDispatchDedupeKey({
        templateVersionId: String(args.templateVersionId),
        dependencyDigest: args.artifact.dependencyManifest.dependencyDigest,
        recommendationCode: recommendation.code,
        channel,
      });
      if (existingDedupeKeys.has(dedupeKey)) {
        dispatches.push({
          contractVersion: TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTRACT_VERSION,
          templateId: args.artifact.templateId,
          templateVersionId: args.artifact.templateVersionId,
          templateVersionTag: args.artifact.templateVersionTag,
          dependencyDigest: args.artifact.dependencyManifest.dependencyDigest,
          recommendationCode: recommendation.code,
          recommendationSeverity: recommendation.severity,
          recommendationSummary: recommendation.summary,
          channel,
          deliveryStatus: "suppressed_duplicate",
          dedupeKey,
          ownerUserIds: [...recommendation.ownerUserIds],
          ownerTeamIds: [...recommendation.ownerTeamIds],
          recordedAt: now,
          recordedByUserId: String(args.performedBy),
        });
        continue;
      }

      let deliveryStatus: TemplateCertificationAlertDeliveryStatus;
      if (TEMPLATE_CERTIFICATION_ALERT_IMMEDIATE_CHANNELS.has(channel)) {
        deliveryStatus = "delivered_in_app";
      } else if (TEMPLATE_CERTIFICATION_ALERT_QUEUE_CHANNELS.has(channel)) {
        deliveryStatus = "queued";
      } else {
        deliveryStatus = "unsupported_channel";
      }

      const dispatch: TemplateCertificationAlertDispatchRecord = {
        contractVersion: TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTRACT_VERSION,
        templateId: args.artifact.templateId,
        templateVersionId: args.artifact.templateVersionId,
        templateVersionTag: args.artifact.templateVersionTag,
        dependencyDigest: args.artifact.dependencyManifest.dependencyDigest,
        recommendationCode: recommendation.code,
        recommendationSeverity: recommendation.severity,
        recommendationSummary: recommendation.summary,
        channel,
        deliveryStatus,
        dedupeKey,
        ownerUserIds: [...recommendation.ownerUserIds],
        ownerTeamIds: [...recommendation.ownerTeamIds],
        recordedAt: now,
        recordedByUserId: String(args.performedBy),
        ...(deliveryStatus === "queued"
          ? {
              workerStatus: "pending" as const,
              attemptCount: 0,
              maxAttempts: dispatchControl.policy.maxAttempts,
              nextAttemptAt: now,
            }
          : {}),
      };

      await args.ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: args.templateVersionId,
        actionType: TEMPLATE_CERTIFICATION_ALERT_DISPATCH_ACTION_TYPE,
        actionData: dispatch as unknown as Record<string, unknown>,
        performedBy: args.performedBy,
        performedAt: now,
      });
      await args.ctx.db.insert("auditLogs", {
        organizationId: args.organizationId,
        userId: args.performedBy,
        action: `template_certification.alert.${channel}`,
        resource: "template_version",
        resourceId: String(args.templateVersionId),
        success: deliveryStatus !== "unsupported_channel",
        metadata: dispatch as unknown as Record<string, unknown>,
        createdAt: now,
      });

      if (deliveryStatus === "queued") {
        queuedDispatchRecorded = true;
      }
      existingDedupeKeys.add(dedupeKey);
      dispatches.push(dispatch);
    }
  }

  if (queuedDispatchRecorded) {
    await scheduleTemplateCertificationAlertDispatchWorker({
      ctx: args.ctx,
      templateVersionId: args.templateVersionId,
      delayMs: 0,
      limit: 25,
    });
  }

  return dispatches;
}

function shouldTemplateCertificationAlertDispatchBeProcessed(
  record: TemplateCertificationAlertDispatchRecord,
): boolean {
  const queueChannel = normalizeTemplateCertificationAlertQueueChannel(record.channel);
  if (!queueChannel) {
    return false;
  }
  if (
    record.deliveryStatus !== "queued"
    && record.deliveryStatus !== "dispatch_failed"
    && record.deliveryStatus !== "throttled"
  ) {
    return false;
  }
  if (record.workerStatus === "failed_terminal" || record.workerStatus === "acknowledged") {
    return false;
  }
  if (typeof record.acknowledgedAt === "number") {
    return false;
  }
  return true;
}

function resolveTemplateCertificationAlertDispatchNextAttemptAt(
  record: TemplateCertificationAlertDispatchRecord,
): number {
  if (typeof record.nextAttemptAt === "number" && Number.isFinite(record.nextAttemptAt)) {
    return record.nextAttemptAt;
  }
  return record.recordedAt;
}

function resolveTemplateCertificationAlertDispatchAttemptCount(
  record: TemplateCertificationAlertDispatchRecord,
): number {
  if (typeof record.attemptCount === "number" && Number.isFinite(record.attemptCount)) {
    return Math.max(0, Math.floor(record.attemptCount));
  }
  return 0;
}

function resolveTemplateCertificationAlertDispatchMaxAttempts(args: {
  record: TemplateCertificationAlertDispatchRecord;
  control: TemplateCertificationAlertDispatchControl;
}): number {
  return normalizeBoundedInteger({
    value: args.record.maxAttempts,
    fallback: args.control.maxAttempts,
    min: 1,
    max: 10,
  });
}

type TemplateCertificationAlertDispatchTransportResult =
  | {
      ok: true;
      channel: TemplateCertificationAlertQueueChannel;
      target: string;
      providerMessageId?: string;
    }
  | {
      ok: false;
      retryable: boolean;
      errorCode: string;
      errorMessage: string;
      channel?: TemplateCertificationAlertQueueChannel;
      target?: string;
    };

function evaluateTemplateCertificationAlertDispatchTransport(args: {
  record: TemplateCertificationAlertDispatchRecord;
  control: TemplateCertificationAlertDispatchControl;
}): TemplateCertificationAlertDispatchTransportResult {
  const queueChannel = normalizeTemplateCertificationAlertQueueChannel(args.record.channel);
  if (!queueChannel) {
    return {
      ok: false,
      retryable: false,
      errorCode: "unsupported_channel",
      errorMessage: `Unsupported queue channel ${args.record.channel}.`,
    };
  }
  const channelControl = args.control.channels[queueChannel];
  const credentialGovernance = args.control.credentialGovernance[queueChannel];
  const runbookUrl = normalizeOptionalString(credentialGovernance.runbookUrl);
  const target = normalizeOptionalString(channelControl.target);
  if (!channelControl.enabled || !target) {
    return {
      ok: false,
      retryable: false,
      errorCode: "channel_transport_not_configured",
      errorMessage: runbookUrl
        ? `Channel transport for ${queueChannel} is disabled or missing target. Runbook: ${runbookUrl}`
        : `Channel transport for ${queueChannel} is disabled or missing target.`,
      channel: queueChannel,
      ...(target ? { target } : {}),
    };
  }
  if (target === "simulate_retryable_failure") {
    return {
      ok: false,
      retryable: true,
      errorCode: "simulated_retryable_failure",
      errorMessage: `Simulated retryable dispatch failure for ${queueChannel}.`,
      channel: queueChannel,
      target,
    };
  }
  if (target === "simulate_terminal_failure") {
    return {
      ok: false,
      retryable: false,
      errorCode: "simulated_terminal_failure",
      errorMessage: `Simulated terminal dispatch failure for ${queueChannel}.`,
      channel: queueChannel,
      target,
    };
  }
  return {
    ok: true,
    channel: queueChannel,
    target,
  };
}

function buildTemplateCertificationAlertDispatchText(
  record: TemplateCertificationAlertDispatchRecord,
): string {
  return [
    `[Template Certification][${record.recommendationSeverity.toUpperCase()}] ${record.recommendationCode}`,
    record.recommendationSummary,
    `Template: ${record.templateId}@${record.templateVersionTag}`,
    `Version ID: ${record.templateVersionId}`,
    `Dependency digest: ${record.dependencyDigest}`,
    `Dedupe key: ${record.dedupeKey}`,
  ].join("\n");
}

function buildTemplateCertificationAlertDispatchEmailSubject(
  record: TemplateCertificationAlertDispatchRecord,
): string {
  return `[Template Certification][${record.recommendationSeverity.toUpperCase()}] ${record.recommendationCode} ${record.templateVersionTag}`;
}

async function executeTemplateCertificationAlertDispatchTransport(args: {
  channel: TemplateCertificationAlertQueueChannel;
  target: string;
  record: TemplateCertificationAlertDispatchRecord;
  control: TemplateCertificationAlertDispatchControl;
}): Promise<TemplateCertificationAlertDispatchTransportResult> {
  const messageText = buildTemplateCertificationAlertDispatchText(args.record);

  if (args.channel === "slack") {
    const result = await dispatchTemplateCertificationSlackAlert({
      target: args.target,
      text: messageText,
      dedupeKey: args.record.dedupeKey,
      credentialGovernance: {
        requireDedicatedCredentials:
          args.control.credentialGovernance.slack.requireDedicatedCredentials,
        allowInlineTargetCredentials:
          args.control.credentialGovernance.slack.allowInlineTargetCredentials,
        runbookUrl: args.control.credentialGovernance.slack.runbookUrl,
      },
    });
    if (!result.success) {
      return {
        ok: false,
        retryable: result.retryable === true,
        errorCode:
          normalizeOptionalString(result.errorCode)
          || (
            typeof result.statusCode === "number"
              ? `slack_http_${result.statusCode}`
              : "slack_dispatch_failed"
          ),
        errorMessage:
          normalizeOptionalString(result.error)
          || `Slack dispatch failed for ${args.record.dedupeKey}.`,
        channel: args.channel,
        target: args.target,
      };
    }
    return {
      ok: true,
      channel: args.channel,
      target: args.target,
      ...(normalizeOptionalString(result.providerMessageId)
        ? { providerMessageId: normalizeOptionalString(result.providerMessageId)! }
        : {}),
    };
  }

  if (args.channel === "pagerduty") {
    const result = await dispatchTemplateCertificationPagerDutyAlert({
      target: args.target,
      dedupeKey: args.record.dedupeKey,
      summary: args.record.recommendationSummary,
      severity: args.record.recommendationSeverity,
      details: {
        templateId: args.record.templateId,
        templateVersionId: args.record.templateVersionId,
        templateVersionTag: args.record.templateVersionTag,
        dependencyDigest: args.record.dependencyDigest,
        recommendationCode: args.record.recommendationCode,
        recommendationSeverity: args.record.recommendationSeverity,
      },
      credentialGovernance: {
        allowInlineTargetCredentials:
          args.control.credentialGovernance.pagerduty.allowInlineTargetCredentials,
        runbookUrl: args.control.credentialGovernance.pagerduty.runbookUrl,
      },
    });
    if (!result.success) {
      return {
        ok: false,
        retryable: result.retryable === true,
        errorCode: result.errorCode ?? "pagerduty_dispatch_failed",
        errorMessage:
          normalizeOptionalString(result.errorMessage)
          || `PagerDuty dispatch failed for ${args.record.dedupeKey}.`,
        channel: args.channel,
        target: args.target,
      };
    }
    return {
      ok: true,
      channel: args.channel,
      target: args.target,
      ...(normalizeOptionalString(result.providerMessageId)
        ? { providerMessageId: normalizeOptionalString(result.providerMessageId)! }
        : {}),
    };
  }

  const result = await dispatchTemplateCertificationEmailAlert({
    target: args.target,
    dedupeKey: args.record.dedupeKey,
    subject: buildTemplateCertificationAlertDispatchEmailSubject(args.record),
    text: messageText,
    credentialGovernance: {
      requireDedicatedCredentials:
        args.control.credentialGovernance.email.requireDedicatedCredentials,
      runbookUrl: args.control.credentialGovernance.email.runbookUrl,
    },
  });
  if (!result.success) {
    return {
      ok: false,
      retryable: result.retryable === true,
      errorCode: result.errorCode ?? "email_dispatch_failed",
      errorMessage:
        normalizeOptionalString(result.errorMessage)
        || `Email dispatch failed for ${args.record.dedupeKey}.`,
      channel: args.channel,
      target: args.target,
    };
  }
  return {
    ok: true,
    channel: args.channel,
    target: args.target,
    ...(normalizeOptionalString(result.providerMessageId)
      ? { providerMessageId: normalizeOptionalString(result.providerMessageId)! }
      : {}),
  };
}

function countTemplateCertificationAlertRecentDispatches(args: {
  entries: TemplateCertificationAlertDispatchEntry[];
  channel: TemplateCertificationAlertQueueChannel;
  now: number;
  windowMs: number;
  ignoreActionId?: string;
}): number {
  const cutoff = args.now - args.windowMs;
  let count = 0;
  for (const entry of args.entries) {
    if (args.ignoreActionId && entry.actionId === args.ignoreActionId) {
      continue;
    }
    const entryChannel = normalizeTemplateCertificationAlertQueueChannel(entry.record.channel);
    if (entryChannel !== args.channel) {
      continue;
    }
    if (entry.record.deliveryStatus !== "dispatched") {
      continue;
    }
    const dispatchedAt =
      typeof entry.record.dispatchedAt === "number"
        ? entry.record.dispatchedAt
        : entry.record.recordedAt;
    if (dispatchedAt >= cutoff) {
      count += 1;
    }
  }
  return count;
}

async function processTemplateCertificationAlertDispatchQueue(args: {
  ctx: MutationCtx;
  templateVersionId: Id<"objects">;
  limit: number;
  now: number;
}): Promise<{
  templateVersionId: string;
  processed: number;
  dispatched: number;
  retryScheduled: number;
  failedTerminal: number;
  throttled: number;
  pending: number;
  nextAttemptAt: number | null;
}> {
  const entries = await getTemplateCertificationAlertDispatchEntries(args.ctx, args.templateVersionId);
  const dispatchControlResolution = await readTemplateCertificationAlertDispatchControl(args.ctx);
  const riskPolicyResolution = await readTemplateCertificationRiskPolicy(args.ctx);
  const dispatchPolicyState = buildTemplateCertificationAlertPolicyState({
    control: dispatchControlResolution.policy,
    requirementAuthoring: riskPolicyResolution.requirementAuthoring,
  });
  const dispatchControl = dispatchPolicyState.effectiveControl;
  const ordered = entries
    .filter((entry) => shouldTemplateCertificationAlertDispatchBeProcessed(entry.record))
    .sort(sortTemplateCertificationAlertDispatchEntriesAsc);
  let processed = 0;
  let dispatched = 0;
  let retryScheduled = 0;
  let failedTerminal = 0;
  let throttled = 0;

  for (const entry of ordered) {
    if (processed >= args.limit) {
      break;
    }
    const queueChannel = normalizeTemplateCertificationAlertQueueChannel(entry.record.channel);
    if (!queueChannel) {
      continue;
    }
    const nextAttemptAt = resolveTemplateCertificationAlertDispatchNextAttemptAt(entry.record);
    if (nextAttemptAt > args.now) {
      continue;
    }
    if (typeof entry.record.throttleUntil === "number" && entry.record.throttleUntil > args.now) {
      continue;
    }

    const maxAttempts = resolveTemplateCertificationAlertDispatchMaxAttempts({
      record: entry.record,
      control: dispatchControl,
    });
    const attemptCount = resolveTemplateCertificationAlertDispatchAttemptCount(entry.record);
    if (attemptCount >= maxAttempts) {
      const terminalRecord: TemplateCertificationAlertDispatchRecord = {
        ...entry.record,
        deliveryStatus: "dispatch_failed",
        workerStatus: "failed_terminal",
        maxAttempts,
        lastErrorCode: entry.record.lastErrorCode ?? "max_attempts_exhausted",
        lastErrorMessage:
          entry.record.lastErrorMessage
          ?? `Dispatch exhausted ${maxAttempts} attempts for ${queueChannel}.`,
      };
      await args.ctx.db.patch(entry.actionId as any, {
        actionData: terminalRecord as unknown as Record<string, unknown>,
      });
      failedTerminal += 1;
      processed += 1;
      continue;
    }

    const throttlePolicy = dispatchControl.throttle[queueChannel];
    const recentDispatchCount = countTemplateCertificationAlertRecentDispatches({
      entries,
      channel: queueChannel,
      now: args.now,
      windowMs: throttlePolicy.windowMs,
      ignoreActionId: entry.actionId,
    });
    if (recentDispatchCount >= throttlePolicy.maxDispatches) {
      const throttleUntil = args.now + throttlePolicy.windowMs;
      const throttledRecord: TemplateCertificationAlertDispatchRecord = {
        ...entry.record,
        deliveryStatus: "throttled",
        workerStatus: "throttled",
        maxAttempts,
        nextAttemptAt: throttleUntil,
        throttleUntil,
        throttleReason: "channel_window_limit_reached",
        lastErrorCode: "throttle_window_limit_reached",
        lastErrorMessage:
          `Throttle active for ${queueChannel}: ${recentDispatchCount}/${throttlePolicy.maxDispatches} dispatched in ${throttlePolicy.windowMs}ms window.`,
      };
      await args.ctx.db.patch(entry.actionId as any, {
        actionData: throttledRecord as unknown as Record<string, unknown>,
      });
      throttled += 1;
      processed += 1;
      continue;
    }

    const transportResolution = evaluateTemplateCertificationAlertDispatchTransport({
      record: entry.record,
      control: dispatchControl,
    });
    const transportResult = transportResolution.ok
      ? await executeTemplateCertificationAlertDispatchTransport({
          channel: transportResolution.channel,
          target: transportResolution.target,
          record: entry.record,
          control: dispatchControl,
        })
      : transportResolution;
    const nextAttemptCount = attemptCount + 1;
    if (transportResult.ok) {
      const dispatchedRecord: TemplateCertificationAlertDispatchRecord = {
        ...entry.record,
        deliveryStatus: "dispatched",
        workerStatus: "dispatched",
        attemptCount: nextAttemptCount,
        maxAttempts,
        lastAttemptAt: args.now,
        dispatchedAt: args.now,
        lastErrorCode: undefined,
        lastErrorMessage: undefined,
      };
      await args.ctx.db.patch(entry.actionId as any, {
        actionData: dispatchedRecord as unknown as Record<string, unknown>,
      });
      if (entry.organizationId) {
        await args.ctx.db.insert("auditLogs", {
          organizationId: entry.organizationId,
          userId: entry.record.recordedByUserId as Id<"users">,
          action: `template_certification.alert.${transportResult.channel}.worker_dispatched`,
          resource: "template_version",
          resourceId: String(args.templateVersionId),
          success: true,
          metadata: {
            dedupeKey: entry.record.dedupeKey,
            recommendationCode: entry.record.recommendationCode,
            target: transportResult.target,
            providerMessageId: transportResult.providerMessageId ?? null,
            dispatchedAt: args.now,
          },
          createdAt: args.now,
        });
      }
      dispatched += 1;
      processed += 1;
      continue;
    }

    const hasRetryRemaining = nextAttemptCount < maxAttempts;
    const shouldRetry = transportResult.retryable && hasRetryRemaining;
    const nextRetryAt = args.now + dispatchControl.retryDelayMs;
    const failedRecord: TemplateCertificationAlertDispatchRecord = {
      ...entry.record,
      deliveryStatus: "dispatch_failed",
      workerStatus: shouldRetry ? "retry_scheduled" : "failed_terminal",
      attemptCount: nextAttemptCount,
      maxAttempts,
      lastAttemptAt: args.now,
      nextAttemptAt: shouldRetry ? nextRetryAt : entry.record.nextAttemptAt,
      lastErrorCode: transportResult.errorCode,
      lastErrorMessage: transportResult.errorMessage,
    };
    await args.ctx.db.patch(entry.actionId as any, {
      actionData: failedRecord as unknown as Record<string, unknown>,
    });
    if (entry.organizationId) {
      await args.ctx.db.insert("auditLogs", {
        organizationId: entry.organizationId,
        userId: entry.record.recordedByUserId as Id<"users">,
        action: `template_certification.alert.${queueChannel}.worker_failed`,
        resource: "template_version",
        resourceId: String(args.templateVersionId),
        success: false,
        metadata: {
          dedupeKey: entry.record.dedupeKey,
          recommendationCode: entry.record.recommendationCode,
          retryScheduled: shouldRetry,
          nextAttemptAt: shouldRetry ? nextRetryAt : null,
          errorCode: transportResult.errorCode,
          errorMessage: transportResult.errorMessage,
          target:
            transportResult.target
            || (transportResolution.ok ? transportResolution.target : null),
        },
        createdAt: args.now,
      });
    }
    if (shouldRetry) {
      retryScheduled += 1;
    } else {
      failedTerminal += 1;
    }
    processed += 1;
  }

  const refreshedEntries = await getTemplateCertificationAlertDispatchEntries(
    args.ctx,
    args.templateVersionId,
  );
  const pendingEntries = refreshedEntries
    .filter((entry) => shouldTemplateCertificationAlertDispatchBeProcessed(entry.record))
    .map((entry) => ({
      ...entry,
      nextAttemptAt: resolveTemplateCertificationAlertDispatchNextAttemptAt(entry.record),
    }))
    .sort((left, right) => left.nextAttemptAt - right.nextAttemptAt);
  const nextAttemptAt = pendingEntries.length > 0 ? pendingEntries[0].nextAttemptAt : null;

  if (pendingEntries.length > 0 && nextAttemptAt !== null) {
    await scheduleTemplateCertificationAlertDispatchWorker({
      ctx: args.ctx,
      templateVersionId: args.templateVersionId,
      delayMs: Math.max(0, nextAttemptAt - args.now),
      limit: args.limit,
    });
  }

  return {
    templateVersionId: String(args.templateVersionId),
    processed,
    dispatched,
    retryScheduled,
    failedTerminal,
    throttled,
    pending: pendingEntries.length,
    nextAttemptAt,
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
  const topologyCompatibility = resolveExistingAgentTopologyCompatibility({
    templateProps,
    versionProps,
    now: Date.now(),
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
    topologyCompatibility,
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

const EXISTING_AGENT_RUNTIME_MODULE_TOPOLOGY_PROFILE_BY_KEY: Record<
  string,
  AgentRuntimeTopologyProfile
> = {
  one_of_one_samantha_runtime_module_v1: "evaluator_loop",
  der_terminmacher_runtime_module_v1: "pipeline_router",
  david_ogilvy_runtime_module_v1: "single_agent_loop",
};

function resolveExistingAgentTopologyCompatibility(args: {
  templateProps: Record<string, unknown>;
  versionProps: Record<string, unknown>;
  now: number;
}): ExistingAgentTopologyCompatibility {
  const profileToken = normalizeOptionalString(
    args.templateProps.runtimeTopologyProfile,
  ) || normalizeOptionalString(args.versionProps.runtimeTopologyProfile);
  const adapterToken = normalizeOptionalString(
    args.templateProps.runtimeTopologyAdapter,
  ) || normalizeOptionalString(args.versionProps.runtimeTopologyAdapter);
  const runtimeModuleKey = normalizeOptionalString(
    args.templateProps.runtimeModuleKey,
  ) || normalizeOptionalString(args.versionProps.runtimeModuleKey);

  if (!profileToken) {
    return {
      contractVersion: EXISTING_AGENT_TOPOLOGY_COMPATIBILITY_CONTRACT_VERSION,
      status: "blocked",
      reasonCode: "topology_declaration_missing",
      ...(runtimeModuleKey ? { runtimeModuleKey } : {}),
      checkedAt: args.now,
    };
  }

  if (!isAgentRuntimeTopologyProfile(profileToken)) {
    return {
      contractVersion: EXISTING_AGENT_TOPOLOGY_COMPATIBILITY_CONTRACT_VERSION,
      status: "blocked",
      reasonCode: "topology_profile_invalid",
      ...(runtimeModuleKey ? { runtimeModuleKey } : {}),
      checkedAt: args.now,
    };
  }

  const expectedAdapter = resolveAgentRuntimeTopologyAdapter(profileToken);
  if (adapterToken && adapterToken !== expectedAdapter) {
    return {
      contractVersion: EXISTING_AGENT_TOPOLOGY_COMPATIBILITY_CONTRACT_VERSION,
      status: "blocked",
      reasonCode: "topology_adapter_mismatch",
      profile: profileToken,
      adapter: expectedAdapter,
      ...(runtimeModuleKey ? { runtimeModuleKey } : {}),
      checkedAt: args.now,
    };
  }

  const expectedRuntimeModuleProfile = runtimeModuleKey
    ? EXISTING_AGENT_RUNTIME_MODULE_TOPOLOGY_PROFILE_BY_KEY[runtimeModuleKey] ?? null
    : null;
  if (
    expectedRuntimeModuleProfile
    && expectedRuntimeModuleProfile !== profileToken
  ) {
    return {
      contractVersion: EXISTING_AGENT_TOPOLOGY_COMPATIBILITY_CONTRACT_VERSION,
      status: "blocked",
      reasonCode: "topology_runtime_module_mismatch",
      profile: profileToken,
      adapter: expectedAdapter,
      ...(runtimeModuleKey ? { runtimeModuleKey } : {}),
      checkedAt: args.now,
    };
  }

  return {
    contractVersion: EXISTING_AGENT_TOPOLOGY_COMPATIBILITY_CONTRACT_VERSION,
    status: "compatible",
    reasonCode: "topology_declaration_enforced",
    profile: profileToken,
    adapter: expectedAdapter,
    ...(runtimeModuleKey ? { runtimeModuleKey } : {}),
    checkedAt: args.now,
  };
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

  const topologyCompatibility = resolveExistingAgentTopologyCompatibility({
    templateProps,
    versionProps,
    now: Date.now(),
  });

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
    topologyCompatibility,
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
    const certificationContext = await resolveTemplateVersionCertificationContext(ctx, {
      templateId: template.templateId,
      templateVersionId: template.templateVersionId,
      templateVersionTag: template.templateVersionTag,
    });
    const automationPolicyResolution = await readTemplateCertificationAutomationPolicy(ctx, {
      templateFamily: certificationContext.templateFamily ?? null,
    });
    const dispatchControlResolution = await readTemplateCertificationAlertDispatchControl(ctx);
    const dispatchPolicyState = buildTemplateCertificationAlertPolicyState({
      control: dispatchControlResolution.policy,
      requirementAuthoring: riskPolicy.requirementAuthoring,
    });
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
    const defaultEvidenceSources = certificationEvaluation.riskAssessment
      ? resolveTemplateCertificationDefaultAutomationEvidenceSources(
        certificationEvaluation.riskAssessment,
      )
      : [];
    const missingDefaultEvidenceSources =
      certificationEvaluation.certification && defaultEvidenceSources.length > 0
        ? defaultEvidenceSources.filter(
          (sourceType) =>
            !certificationEvaluation.certification?.evidenceSources.some(
              (source) => source.sourceType === sourceType,
            ),
        )
        : [];
    const alertRecommendations =
      certificationEvaluation.certification
        ? buildTemplateCertificationAlertRecommendations({
          artifact: certificationEvaluation.certification,
          missingDefaultEvidenceSources,
          policy: automationPolicyResolution.policy,
          strictMode: dispatchControlResolution.policy.strictMode,
          policyDrift: dispatchPolicyState.policyDrift,
        })
        : [];
    const recentAlertDispatches = await getTemplateCertificationAlertDispatchHistory(
      ctx,
      template.templateVersionId,
      20,
    );
    const rolloutAllowed =
      evaluation.allowed && template.topologyCompatibility.status === "compatible";

    return {
      generatedAt: Date.now(),
      template,
      topologyCompatibility: template.topologyCompatibility,
      certification,
      certificationEvaluation,
      riskAssessment: certificationEvaluation.riskAssessment,
      dependencyManifest: certificationEvaluation.dependencyManifest,
      autoCertificationEligible: certificationEvaluation.autoCertificationEligible,
      riskPolicy,
      requirementAuthoring: riskPolicy.requirementAuthoring,
      alertOperations: {
        ...(certificationContext.templateFamily
          ? { templateFamily: certificationContext.templateFamily }
          : {}),
        automationPolicyScope: automationPolicyResolution.scope,
        automationPolicy: automationPolicyResolution.policy,
        dispatchControl: dispatchPolicyState.effectiveControl,
        dispatchControlSource: dispatchControlResolution.source,
        credentialHealth: dispatchPolicyState.credentialHealth,
        policyDrift: dispatchPolicyState.policyDrift,
        strictModeRollout: dispatchPolicyState.strictModeRollout,
        defaultEvidenceSources,
        missingDefaultEvidenceSources,
        alertRecommendations,
        recentDispatches: recentAlertDispatches,
      },
      gate,
      evaluation,
      rolloutAllowed,
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
      requirementAuthoring: buildTemplateCertificationRequirementAuthoringCoverage(nextPolicy),
    };
  },
});

export const getTemplateCertificationAutomationPolicy = query({
  args: {
    sessionId: v.string(),
    templateFamily: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    return await readTemplateCertificationAutomationPolicy(ctx, {
      templateFamily: args.templateFamily,
    });
  },
});

export const setTemplateCertificationAutomationPolicy = mutation({
  args: {
    sessionId: v.string(),
    templateFamily: v.optional(v.string()),
    policy: v.object({
      adoptionMode: v.optional(templateCertificationAutomationAdoptionModeValidator),
      ownerUserIds: v.optional(v.array(v.string())),
      ownerTeamIds: v.optional(v.array(v.string())),
      alertChannels: v.optional(v.array(v.string())),
      alertOnCertificationBlocked: v.optional(v.boolean()),
      alertOnMissingDefaultEvidence: v.optional(v.boolean()),
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
    const current = await readTemplateCertificationAutomationPolicy(ctx, {
      templateFamily,
    });
    const nextPolicy = mergeTemplateCertificationAutomationPolicy(current.policy, args.policy);
    const nextGlobalPolicy = templateFamily ? current.globalPolicy : nextPolicy;
    const nextFamilyPolicies =
      templateFamily
        ? {
            ...current.familyPolicies,
            [templateFamily]: nextPolicy,
          }
        : current.familyPolicies;
    const now = Date.now();
    const settingsValue = {
      contractVersion: TEMPLATE_CERTIFICATION_AUTOMATION_POLICY_SETTINGS_CONTRACT_VERSION,
      globalPolicy: nextGlobalPolicy,
      familyPolicies: nextFamilyPolicies,
    } satisfies TemplateCertificationAutomationPolicySettings;
    const dbAny = ctx.db as any;
    const settingRows = await dbAny
      .query("platformSettings")
      .withIndex(
        "by_key",
        (q: any) => q.eq("key", TEMPLATE_CERTIFICATION_AUTOMATION_POLICY_SETTING_KEY),
      )
      .collect();
    const setting = settingRows[0] ?? null;
    if (setting) {
      await dbAny.patch(setting._id, {
        value: settingsValue,
        description: TEMPLATE_CERTIFICATION_AUTOMATION_POLICY_SETTING_DESCRIPTION,
        updatedBy: userId,
        updatedAt: now,
      });
    } else {
      await dbAny.insert("platformSettings", {
        key: TEMPLATE_CERTIFICATION_AUTOMATION_POLICY_SETTING_KEY,
        value: settingsValue,
        description: TEMPLATE_CERTIFICATION_AUTOMATION_POLICY_SETTING_DESCRIPTION,
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

export const getTemplateCertificationAlertDispatchControl = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    const control = await readTemplateCertificationAlertDispatchControl(ctx);
    const riskPolicy = await readTemplateCertificationRiskPolicy(ctx);
    const policyState = buildTemplateCertificationAlertPolicyState({
      control: control.policy,
      requirementAuthoring: riskPolicy.requirementAuthoring,
    });
    return {
      ...control,
      effectivePolicy: policyState.effectiveControl,
      credentialHealth: policyState.credentialHealth,
      policyDrift: policyState.policyDrift,
      strictModeRollout: policyState.strictModeRollout,
    };
  },
});

export const setTemplateCertificationAlertDispatchControl = mutation({
  args: {
    sessionId: v.string(),
    policy: v.object({
      maxAttempts: v.optional(v.number()),
      retryDelayMs: v.optional(v.number()),
      channels: v.optional(
        v.object({
          slack: v.optional(v.object({
            enabled: v.optional(v.boolean()),
            target: v.optional(v.string()),
          })),
          pagerduty: v.optional(v.object({
            enabled: v.optional(v.boolean()),
            target: v.optional(v.string()),
          })),
          email: v.optional(v.object({
            enabled: v.optional(v.boolean()),
            target: v.optional(v.string()),
          })),
        }),
      ),
      throttle: v.optional(
        v.object({
          slack: v.optional(v.object({
            windowMs: v.optional(v.number()),
            maxDispatches: v.optional(v.number()),
          })),
          pagerduty: v.optional(v.object({
            windowMs: v.optional(v.number()),
            maxDispatches: v.optional(v.number()),
          })),
          email: v.optional(v.object({
            windowMs: v.optional(v.number()),
            maxDispatches: v.optional(v.number()),
          })),
        }),
      ),
      credentialGovernance: v.optional(
        v.object({
          slack: v.optional(v.object({
            requireDedicatedCredentials: v.optional(v.boolean()),
            allowInlineTargetCredentials: v.optional(v.boolean()),
            runbookUrl: v.optional(v.string()),
          })),
          pagerduty: v.optional(v.object({
            requireDedicatedCredentials: v.optional(v.boolean()),
            allowInlineTargetCredentials: v.optional(v.boolean()),
            runbookUrl: v.optional(v.string()),
          })),
          email: v.optional(v.object({
            requireDedicatedCredentials: v.optional(v.boolean()),
            allowInlineTargetCredentials: v.optional(v.boolean()),
            runbookUrl: v.optional(v.string()),
          })),
        }),
      ),
      strictMode: v.optional(
        v.object({
          enabled: v.optional(v.boolean()),
          rolloutMode: v.optional(templateCertificationAlertStrictModeRolloutModeValidator),
          guardrailMode: v.optional(templateCertificationAlertStrictModeGuardrailModeValidator),
          notifyOnPolicyDrift: v.optional(v.boolean()),
        }),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdminSession(ctx, args.sessionId);
    const current = await readTemplateCertificationAlertDispatchControl(ctx);
    const nextPolicy = mergeTemplateCertificationAlertDispatchControl(
      current.policy,
      args.policy,
    );
    const riskPolicy = await readTemplateCertificationRiskPolicy(ctx);
    const policyState = buildTemplateCertificationAlertPolicyState({
      control: nextPolicy,
      requirementAuthoring: riskPolicy.requirementAuthoring,
    });
    const persistedPolicy = policyState.effectiveControl;
    const now = Date.now();
    const settingsValue = {
      contractVersion: TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL_SETTINGS_CONTRACT_VERSION,
      policy: persistedPolicy,
    } satisfies TemplateCertificationAlertDispatchControlSettings;
    const dbAny = ctx.db as any;
    const settingRows = await dbAny
      .query("platformSettings")
      .withIndex(
        "by_key",
        (q: any) => q.eq("key", TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL_SETTING_KEY),
      )
      .collect();
    const setting = settingRows[0] ?? null;
    if (setting) {
      await dbAny.patch(setting._id, {
        value: settingsValue,
        description: TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL_SETTING_DESCRIPTION,
        updatedBy: userId,
        updatedAt: now,
      });
    } else {
      await dbAny.insert("platformSettings", {
        key: TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL_SETTING_KEY,
        value: settingsValue,
        description: TEMPLATE_CERTIFICATION_ALERT_DISPATCH_CONTROL_SETTING_DESCRIPTION,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    }
    return {
      success: true,
      source: "platform_setting" as const,
      updatedAt: now,
      policy: persistedPolicy,
      effectivePolicy: policyState.effectiveControl,
      credentialHealth: policyState.credentialHealth,
      policyDrift: policyState.policyDrift,
      strictModeRollout: policyState.strictModeRollout,
    };
  },
});

export const processTemplateCertificationAlertDispatchQueueInternal = internalMutation({
  args: {
    templateVersionId: v.id("objects"),
    limit: v.optional(v.number()),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await processTemplateCertificationAlertDispatchQueue({
      ctx,
      templateVersionId: args.templateVersionId,
      limit: normalizeBoundedInteger({
        value: args.limit,
        fallback: 25,
        min: 1,
        max: 100,
      }),
      now: normalizeFiniteNumber(args.now) ?? Date.now(),
    });
  },
});

export const processTemplateCertificationAlertDispatchQueueSweep = internalMutation({
  args: {
    limit: v.optional(v.number()),
    perTemplateLimit: v.optional(v.number()),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = normalizeFiniteNumber(args.now) ?? Date.now();
    const templateLimit = normalizeBoundedInteger({
      value: args.limit,
      fallback: 10,
      min: 1,
      max: 100,
    });
    const perTemplateLimit = normalizeBoundedInteger({
      value: args.perTemplateLimit,
      fallback: 25,
      min: 1,
      max: 100,
    });
    const dbAny = ctx.db as any;
    const actions = (await dbAny
      .query("objectActions")
      .collect()) as Array<{
      objectId?: Id<"objects">;
      actionType?: unknown;
      actionData?: unknown;
    }>;
    const pendingTemplateVersionIds = Array.from(
      new Set(
        actions
          .filter((row) =>
            normalizeOptionalString(row.actionType) === TEMPLATE_CERTIFICATION_ALERT_DISPATCH_ACTION_TYPE)
          .map((row) => ({
            templateVersionId: row.objectId,
            record: parseTemplateCertificationAlertDispatchRecord(row.actionData),
          }))
          .filter(
            (row): row is { templateVersionId: Id<"objects">; record: TemplateCertificationAlertDispatchRecord } =>
              !!row.templateVersionId
              && row.record !== null
              && shouldTemplateCertificationAlertDispatchBeProcessed(row.record)
              && resolveTemplateCertificationAlertDispatchNextAttemptAt(row.record) <= now,
          )
          .map((row) => String(row.templateVersionId)),
      ),
    )
      .sort((left, right) => left.localeCompare(right))
      .slice(0, templateLimit)
      .map((id) => id as Id<"objects">);

    const runs: Array<Awaited<ReturnType<typeof processTemplateCertificationAlertDispatchQueue>>> = [];
    for (const templateVersionId of pendingTemplateVersionIds) {
      const run = await processTemplateCertificationAlertDispatchQueue({
        ctx,
        templateVersionId,
        limit: perTemplateLimit,
        now,
      });
      runs.push(run);
    }

    return {
      processedTemplateVersions: runs.length,
      runs,
    };
  },
});

export const processTemplateCertificationAlertDispatchQueueNow = mutation({
  args: {
    sessionId: v.string(),
    templateVersionId: v.id("objects"),
    limit: v.optional(v.number()),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);
    return await processTemplateCertificationAlertDispatchQueue({
      ctx,
      templateVersionId: args.templateVersionId,
      limit: normalizeBoundedInteger({
        value: args.limit,
        fallback: 25,
        min: 1,
        max: 100,
      }),
      now: normalizeFiniteNumber(args.now) ?? Date.now(),
    });
  },
});

export const acknowledgeTemplateCertificationAlertDispatch = mutation({
  args: {
    sessionId: v.string(),
    templateVersionId: v.id("objects"),
    dedupeKey: v.string(),
    acknowledgementNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdminSession(ctx, args.sessionId);
    const dedupeKey = normalizeOptionalString(args.dedupeKey);
    if (!dedupeKey) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "dedupeKey is required.",
      });
    }
    const entries = await getTemplateCertificationAlertDispatchEntries(ctx, args.templateVersionId);
    const match = entries
      .filter((entry) => entry.record.dedupeKey === dedupeKey)
      .sort(sortTemplateCertificationAlertDispatchEntriesDesc)[0];
    if (!match) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No dispatch record found for dedupeKey on this template version.",
      });
    }
    const now = Date.now();
    const note = normalizeOptionalString(args.acknowledgementNote);
    const acknowledgedRecord: TemplateCertificationAlertDispatchRecord = {
      ...match.record,
      deliveryStatus: "acknowledged",
      workerStatus: "acknowledged",
      acknowledgedAt: now,
      acknowledgedByUserId: String(userId),
      ...(note ? { acknowledgementNote: note } : {}),
    };
    await ctx.db.patch(match.actionId as any, {
      actionData: acknowledgedRecord as unknown as Record<string, unknown>,
    });
    if (match.organizationId) {
      await ctx.db.insert("auditLogs", {
        organizationId: match.organizationId,
        userId,
        action: `template_certification.alert.${match.record.channel}.acknowledged`,
        resource: "template_version",
        resourceId: String(args.templateVersionId),
        success: true,
        metadata: {
          dedupeKey,
          acknowledgedAt: now,
          acknowledgementNote: note ?? null,
        },
        createdAt: now,
      });
    }
    return acknowledgedRecord;
  },
});

export const throttleTemplateCertificationAlertDispatch = mutation({
  args: {
    sessionId: v.string(),
    templateVersionId: v.id("objects"),
    dedupeKey: v.string(),
    throttleMinutes: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdminSession(ctx, args.sessionId);
    const dedupeKey = normalizeOptionalString(args.dedupeKey);
    if (!dedupeKey) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "dedupeKey is required.",
      });
    }
    const throttleMinutes = normalizeBoundedInteger({
      value: args.throttleMinutes,
      fallback: 30,
      min: 1,
      max: 24 * 60,
    });
    const reason = normalizeOptionalString(args.reason) ?? "manual_throttle";
    const now = Date.now();
    const throttleUntil = now + throttleMinutes * 60 * 1000;
    const entries = await getTemplateCertificationAlertDispatchEntries(ctx, args.templateVersionId);
    const match = entries
      .filter((entry) => entry.record.dedupeKey === dedupeKey)
      .sort(sortTemplateCertificationAlertDispatchEntriesDesc)[0];
    if (!match) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No dispatch record found for dedupeKey on this template version.",
      });
    }
    const throttledRecord: TemplateCertificationAlertDispatchRecord = {
      ...match.record,
      deliveryStatus: "throttled",
      workerStatus: "throttled",
      throttleUntil,
      throttleReason: reason,
      nextAttemptAt: throttleUntil,
      lastErrorCode: "manual_throttle",
      lastErrorMessage: `Dispatch manually throttled until ${throttleUntil}.`,
    };
    await ctx.db.patch(match.actionId as any, {
      actionData: throttledRecord as unknown as Record<string, unknown>,
    });
    if (match.organizationId) {
      await ctx.db.insert("auditLogs", {
        organizationId: match.organizationId,
        userId,
        action: `template_certification.alert.${match.record.channel}.throttled`,
        resource: "template_version",
        resourceId: String(args.templateVersionId),
        success: true,
        metadata: {
          dedupeKey,
          reason,
          throttleUntil,
        },
        createdAt: now,
      });
    }
    await scheduleTemplateCertificationAlertDispatchWorker({
      ctx,
      templateVersionId: args.templateVersionId,
      delayMs: Math.max(0, throttleUntil - now),
      limit: 25,
    });
    return throttledRecord;
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
    const topologyCompatibility = template.topologyCompatibility;
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
      topologyCompatibility,
      artifact,
      certification,
      canRecord:
        certification.status === "certified"
        && topologyCompatibility.status === "compatible",
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
    const automationPolicyResolution = await readTemplateCertificationAutomationPolicy(ctx, {
      templateFamily: context.templateFamily ?? null,
    });
    const riskPolicyResolution = await readTemplateCertificationRiskPolicy(ctx, {
      templateFamily: context.templateFamily ?? null,
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
    const dispatchControlResolution = await readTemplateCertificationAlertDispatchControl(ctx);
    const dispatchPolicyState = buildTemplateCertificationAlertPolicyState({
      control: dispatchControlResolution.policy,
      requirementAuthoring: riskPolicyResolution.requirementAuthoring,
    });
    const summaryBase = buildTemplateCertificationCoverageSummary({
      artifact,
      requirementAuthoring: riskPolicyResolution.requirementAuthoring,
      templateFamily: context.templateFamily,
      automationPolicyScope: automationPolicyResolution.scope,
      automationPolicy: automationPolicyResolution.policy,
      dispatchStrictMode: dispatchPolicyState.effectiveControl.strictMode,
      alertPolicyDrift: dispatchPolicyState.policyDrift,
      strictModeRollout: dispatchPolicyState.strictModeRollout,
      defaultEvidenceSources,
      ingestedEvaluationOutputs,
      usedOutputSourceTypes: usedAutomationOutputSourceTypes,
    });
    const alertDispatches = await recordTemplateCertificationAlertDispatches({
      ctx,
      organizationId: template.organizationId,
      templateVersionId: args.templateVersionId,
      performedBy: userId,
      artifact,
      recommendations: summaryBase.alertRecommendations,
    });
    const summary = {
      ...summaryBase,
      alertDispatches,
    } satisfies TemplateCertificationEvidenceRecordingSummary;
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
    if (template.topologyCompatibility.status !== "compatible") {
      throw new ConvexError({
        code: "INVALID_STATE",
        message:
          "Current protected operator template is blocked for rollout because topology declaration is missing or incompatible.",
        reasonCode: template.topologyCompatibility.reasonCode,
      });
    }
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
      topologyCompatibility: template.topologyCompatibility,
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
