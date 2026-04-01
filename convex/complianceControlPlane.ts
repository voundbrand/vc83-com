import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { Id, type Doc } from "./_generated/dataModel";
import {
  getUserContext,
  getOrganizationAuthorityContext,
  requireAuthenticatedUser,
} from "./rbacHelpers";
import {
  COMPLIANCE_EVIDENCE_OBJECT_TYPE,
  COMPLIANCE_PLATFORM_TRUST_PACKAGE_CONTRACT_VERSION,
  type ComplianceEvidenceVaultRow,
  mapEvidenceObjectToRow,
  isPlatformSharedEvidenceVisibleForOrganization,
  isPlatformTrustPackageEvidenceRowVisible,
  resolveEffectiveEvidenceRows,
  type ResolvedComplianceEvidenceRow,
} from "./complianceEvidenceVault";
import {
  COMPLIANCE_AVV_OUTREACH_OBJECT_SUBTYPE,
  COMPLIANCE_AVV_OUTREACH_OBJECT_TYPE,
  mapAvvOutreachObjectToRow,
  summarizeAvvOutreachRows,
  type ComplianceAvvOutreachRow,
} from "./complianceOutreachAgent";
import {
  COMPLIANCE_TRANSFER_WORKFLOW_OBJECT_SUBTYPE,
  COMPLIANCE_TRANSFER_WORKFLOW_OBJECT_TYPE,
  computeTransferWorkflowCompleteness,
} from "./complianceTransferWorkflow";
import {
  COMPLIANCE_SECURITY_WORKFLOW_OBJECT_SUBTYPE,
  COMPLIANCE_SECURITY_WORKFLOW_OBJECT_TYPE,
  computeSecurityWorkflowCompleteness,
} from "./complianceSecurityWorkflow";
import { insertComplianceGateGuardrailAuditEvent } from "./compliance";
import {
  buildComplianceActionLifecycleAuditSnapshot,
  resolveComplianceActionRuntimeGate,
} from "./ai/orgActionPolicy";
import {
  COMPLIANCE_SHADOW_MODE_EVALUATOR_CONTRACT_VERSION,
  complianceShadowModeEvaluationStatusValidator,
  complianceShadowModeSurfaceValidator,
  type ComplianceShadowModeEvaluationStatus,
  type ComplianceShadowModeSurface,
} from "./schemas/orgAgentActionRuntimeSchemas";
import { resolvePlatformOrgIdFromEnv } from "./lib/platformOrg";

const COMPLIANCE_RELEASE_GATE_TYPE = "compliance_release_gate";
const COMPLIANCE_RELEASE_GATE_RISK_SUBTYPE = "risk";
const COMPLIANCE_RELEASE_GATE_OWNER_SUBTYPE = "owner_gate";
const COMPLIANCE_OWNER_GATE_OBJECT_NAME = "owner_release_gate";
const COMPLIANCE_INBOX_WIZARD_DRAFT_OBJECT_TYPE = "compliance_inbox_wizard_draft";
const COMPLIANCE_INBOX_WIZARD_DRAFT_OBJECT_SUBTYPE = "org_owner_session";
const COMPLIANCE_INBOX_WIZARD_DRAFT_OBJECT_NAME = "compliance_inbox_wizard_checkpoint";
const COMPLIANCE_ROLLOUT_FLAG_OBJECT_TYPE = "compliance_rollout_flag_bundle";
const COMPLIANCE_ROLLOUT_FLAG_OBJECT_SUBTYPE = "migration_controls";
const COMPLIANCE_ROLLOUT_FLAG_OBJECT_NAME = "compliance_migration_rollout_flags";
export const COMPLIANCE_OPERATIONAL_TELEMETRY_CONTRACT_VERSION =
  "compliance_operational_telemetry_v1";
export const COMPLIANCE_MIGRATION_ROLLOUT_CONTRACT_VERSION =
  "compliance_migration_rollout_v1";
export const LEGAL_FRONT_OFFICE_COMPLIANCE_EVALUATOR_GATE_CONTRACT_VERSION =
  "legal_front_office_compliance_evaluator_gate_v1";

const RISK_ID_VALUES = ["R-002", "R-003", "R-004", "R-005"] as const;
const PLATFORM_SHARE_SCOPE_VALUES = ["fleet_all_orgs", "org_allowlist", "org_denylist"] as const;
const COMPLIANCE_OUTREACH_STALL_THRESHOLD_MS = 72 * 60 * 60 * 1000;
const COMPLIANCE_EVIDENCE_ALERT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const COMPLIANCE_ROLLOUT_RUNBOOKS = [
  {
    runbookId: "knowledge_compliance_master_plan",
    title: "Knowledge + Compliance Master Plan",
    path: "/Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/MASTER_PLAN.md",
  },
  {
    runbookId: "knowledge_compliance_task_queue",
    title: "Knowledge + Compliance Task Queue",
    path: "/Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/TASK_QUEUE.md",
  },
  {
    runbookId: "knowledge_compliance_session_prompts",
    title: "Knowledge + Compliance Session Prompts",
    path: "/Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/SESSION_PROMPTS.md",
  },
] as const;

type RiskId = (typeof RISK_ID_VALUES)[number];
type RiskStatus = "open" | "in_review" | "closed";
type RiskDecisionStatus = "open" | "partial" | "freigegeben" | "abgelehnt";
type OwnerGateDecision = "GO" | "NO_GO";

type RiskTemplate = {
  riskId: RiskId;
  title: string;
  severity: "medium" | "medium_high" | "high";
  owner: string;
  description: string;
};

type RiskEvidence = {
  id: string;
  label: string;
  url?: string;
  notes?: string;
  addedAt: number;
  addedBy: string;
};

type OrgAccessContext = {
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  isSuperAdmin: boolean;
  isOrgOwner: boolean;
  isPlatformOrg: boolean;
};

const ORG_OWNER_DECISION_AUTHORITY_ERROR =
  "Only organization owners can mutate org-level compliance decisions, except super-admin when operating on the configured platform org.";

const RISK_TEMPLATES: RiskTemplate[] = [
  {
    riskId: "R-002",
    title: "Provider AVV approvals",
    severity: "high",
    owner: "Legal/Ops",
    description:
      "Provider processing agreements must be reviewed and explicitly approved before production data paths are allowed.",
  },
  {
    riskId: "R-003",
    title: "Transfer impact evidence",
    severity: "high",
    owner: "Data Protection",
    description:
      "Cross-border transfer safeguards and evidence must be documented and mapped to active processing paths.",
  },
  {
    riskId: "R-004",
    title: "Security evidence completeness",
    severity: "medium_high",
    owner: "Engineering + Security",
    description:
      "RBAC/MFA, encryption, and tenant-isolation controls need complete and current evidence linkage.",
  },
  {
    riskId: "R-005",
    title: "Incident tabletop evidence",
    severity: "medium",
    owner: "Security",
    description:
      "Incident runbook execution must be exercised and logged with a recent tabletop validation record.",
  },
];

const RISK_TEMPLATE_BY_ID = new Map<RiskId, RiskTemplate>(
  RISK_TEMPLATES.map((template) => [template.riskId, template]),
);

type ComplianceEvidenceSubtype =
  | "avv_provider"
  | "transfer_impact"
  | "security_control"
  | "incident_response"
  | "governance_record";
type ComplianceInboxActionType =
  | "invalid_evidence_metadata"
  | "missing_evidence"
  | "evidence_review_due"
  | "evidence_retention_expired"
  | "avv_outreach_follow_up"
  | "workflow_revalidation_warning"
  | "risk_blocker";
type ComplianceInboxActionPriority = "critical" | "high" | "medium";
type ComplianceInboxRequiredArtifact = {
  artifactId: string;
  label: string;
  requiredSubtype: ComplianceEvidenceSubtype;
  controlId?: string;
};
type ComplianceInboxRiskRowInput = {
  riskId: RiskId;
  title: string;
  severity: RiskTemplate["severity"];
  status: RiskStatus;
  decisionStatus: RiskDecisionStatus;
  blocker: boolean;
  lastUpdatedAt: number | null;
  workflowSignalSource?: "workflow_object" | "missing_workflow_object";
  workflowCompletenessScore?: number;
  workflowIsComplete?: boolean;
  workflowBlockers?: string[];
  workflowWarnings?: string[];
  workflowMissingArtifactIds?: string[];
};

type WorkflowSignalRiskId = Extract<RiskId, "R-003" | "R-004">;
type WorkflowSignalSource = "workflow_object" | "missing_workflow_object";
export type ComplianceInboxWizardDraftWorkflow = "avv" | "transfer" | "security";

export type ComplianceInboxWizardAvvDraft = {
  providerName: string | null;
  providerEmail: string | null;
  outreachState: string | null;
  avvEvidenceRef: string | null;
  nextReviewAt: string | null;
  notes: string | null;
};

export type ComplianceInboxWizardTransferDraft = {
  exporterRegion: string | null;
  importerRegion: string | null;
  transferMapRef: string | null;
  sccReference: string | null;
  tiaReference: string | null;
  supplementaryControls: string | null;
  notes: string | null;
};

export type ComplianceInboxWizardSecurityDraft = {
  rbacEvidenceRef: string | null;
  mfaEvidenceRef: string | null;
  encryptionEvidenceRef: string | null;
  tenantIsolationEvidenceRef: string | null;
  keyRotationEvidenceRef: string | null;
  notes: string | null;
};

export type ComplianceInboxWizardDraftSnapshot = {
  draftObjectId: Id<"objects">;
  organizationId: Id<"organizations">;
  sessionId: string;
  userId: string;
  actionId: string | null;
  riskId: RiskId | null;
  workflow: ComplianceInboxWizardDraftWorkflow | null;
  stepIndex: number;
  stepLabel: string | null;
  checkpointUpdatedAt: number;
  avvDraft: ComplianceInboxWizardAvvDraft;
  transferDraft: ComplianceInboxWizardTransferDraft;
  securityDraft: ComplianceInboxWizardSecurityDraft;
  updatedAt: number;
  createdAt: number;
};

type ComplianceWorkflowCompletenessSignal = {
  riskId: WorkflowSignalRiskId;
  source: WorkflowSignalSource;
  isComplete: boolean;
  completenessScore: number;
  blockers: string[];
  warnings: string[];
  missingArtifactIds: string[];
  updatedAt: number | null;
};

export type ComplianceGateBlockerReason = {
  riskId: RiskId;
  code: string;
  message: string;
  source: "risk_assessment" | "workflow";
};

type ComplianceGateStatus = "GO" | "NO_GO";

export type ComplianceOperationalAlertCode =
  | "gate_transition"
  | "outreach_stalled"
  | "evidence_review_due_soon"
  | "evidence_review_overdue"
  | "evidence_retention_expiring_soon"
  | "evidence_retention_expired"
  | "invalid_evidence_metadata";

export type ComplianceOperationalAlertSeverity = "info" | "warning" | "critical";

export type ComplianceGateTransitionTelemetry = {
  occurredAt: number;
  fromEffectiveGateStatus: ComplianceGateStatus;
  toEffectiveGateStatus: ComplianceGateStatus;
  fromOwnerGateDecision: OwnerGateDecision;
  toOwnerGateDecision: OwnerGateDecision;
};

export type ComplianceOperationalAlert = {
  code: ComplianceOperationalAlertCode;
  severity: ComplianceOperationalAlertSeverity;
  message: string;
  riskIds: RiskId[];
  count: number;
  references: string[];
};

export type ComplianceOperationalTelemetry = {
  contractVersion: typeof COMPLIANCE_OPERATIONAL_TELEMETRY_CONTRACT_VERSION;
  generatedAt: number;
  failClosed: boolean;
  gate: {
    effectiveGateStatus: ComplianceGateStatus;
    ownerGateDecision: OwnerGateDecision;
    blockerCount: number;
    blockerIds: RiskId[];
    lastTransition: ComplianceGateTransitionTelemetry | null;
  };
  outreach: {
    total: number;
    openCount: number;
    overdueCount: number;
    invalidCount: number;
    stalledCount: number;
    stalledDossierObjectIds: string[];
    nextDueAt: number | null;
  };
  evidence: {
    activeCount: number;
    invalidCount: number;
    reviewDueSoonCount: number;
    reviewOverdueCount: number;
    retentionExpiringSoonCount: number;
    retentionExpiredCount: number;
  };
  alerts: ComplianceOperationalAlert[];
  summary: {
    totalAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    infoAlerts: number;
  };
};

export interface ComplianceMigrationRolloutFlags {
  telemetryDashboardsEnabled: boolean;
  runbooksEnabled: boolean;
  contextLabelEnforcementEnabled: boolean;
  shadowModeEvaluatorEnabled: boolean;
  strictEnforcementEnabled: boolean;
  shadowModeSurfaceFlags: ComplianceShadowModeSurfaceFlags;
}

export interface ComplianceShadowModeSurfaceFlags {
  finder: boolean;
  layers: boolean;
  aiChat: boolean;
  complianceCenter: boolean;
}

export interface ComplianceShadowModeEvaluationResult {
  contractVersion: typeof COMPLIANCE_SHADOW_MODE_EVALUATOR_CONTRACT_VERSION;
  evaluatedAt: number;
  surface: ComplianceShadowModeSurface;
  nonComplianceSurface: boolean;
  evaluatorEnabled: boolean;
  surfaceEnabled: boolean;
  strictEnforcementEnabled: boolean;
  evaluationStatus: ComplianceShadowModeEvaluationStatus;
  wouldBlock: boolean;
  effectiveGateStatus: ComplianceGateStatus;
  blockerCount: number;
  blockerIds: RiskId[];
  reasonCode: string;
}

export interface LegalFrontOfficeComplianceEvaluatorGateDecision {
  contractVersion: typeof LEGAL_FRONT_OFFICE_COMPLIANCE_EVALUATOR_GATE_CONTRACT_VERSION;
  status: "passed" | "blocked";
  failClosed: boolean;
  reasonCode: string;
  evaluatedAt: number;
  effectiveGateStatus: ComplianceGateStatus | "unknown";
  evaluationStatus: ComplianceShadowModeEvaluationStatus | "unknown";
}

export function resolveLegalFrontOfficeComplianceEvaluatorGate(args: {
  evaluation: ComplianceShadowModeEvaluationResult | null;
  evaluatorRequired: boolean;
  evaluatedAt?: number;
}): LegalFrontOfficeComplianceEvaluatorGateDecision {
  const evaluatedAt =
    typeof args.evaluatedAt === "number" && Number.isFinite(args.evaluatedAt)
      ? args.evaluatedAt
      : Date.now();
  if (!args.evaluatorRequired) {
    return {
      contractVersion: LEGAL_FRONT_OFFICE_COMPLIANCE_EVALUATOR_GATE_CONTRACT_VERSION,
      status: "passed",
      failClosed: false,
      reasonCode: "no_gate_required",
      evaluatedAt,
      effectiveGateStatus: args.evaluation?.effectiveGateStatus ?? "unknown",
      evaluationStatus: args.evaluation?.evaluationStatus ?? "unknown",
    };
  }
  if (!args.evaluation) {
    return {
      contractVersion: LEGAL_FRONT_OFFICE_COMPLIANCE_EVALUATOR_GATE_CONTRACT_VERSION,
      status: "blocked",
      failClosed: true,
      reasonCode: "compliance_evaluator_unavailable",
      evaluatedAt,
      effectiveGateStatus: "unknown",
      evaluationStatus: "unknown",
    };
  }
  if (args.evaluation.evaluationStatus !== "evaluated") {
    return {
      contractVersion: LEGAL_FRONT_OFFICE_COMPLIANCE_EVALUATOR_GATE_CONTRACT_VERSION,
      status: "blocked",
      failClosed: true,
      reasonCode: "compliance_evaluator_not_evaluated",
      evaluatedAt,
      effectiveGateStatus: args.evaluation.effectiveGateStatus,
      evaluationStatus: args.evaluation.evaluationStatus,
    };
  }
  if (
    args.evaluation.effectiveGateStatus !== "GO"
    || args.evaluation.wouldBlock
  ) {
    return {
      contractVersion: LEGAL_FRONT_OFFICE_COMPLIANCE_EVALUATOR_GATE_CONTRACT_VERSION,
      status: "blocked",
      failClosed: true,
      reasonCode: args.evaluation.reasonCode || "compliance_gate_blocked",
      evaluatedAt,
      effectiveGateStatus: args.evaluation.effectiveGateStatus,
      evaluationStatus: args.evaluation.evaluationStatus,
    };
  }
  return {
    contractVersion: LEGAL_FRONT_OFFICE_COMPLIANCE_EVALUATOR_GATE_CONTRACT_VERSION,
    status: "passed",
    failClosed: false,
    reasonCode: "compliance_gate_passed",
    evaluatedAt,
    effectiveGateStatus: args.evaluation.effectiveGateStatus,
    evaluationStatus: args.evaluation.evaluationStatus,
  };
}

export interface ComplianceMigrationRolloutPackage {
  contractVersion: typeof COMPLIANCE_MIGRATION_ROLLOUT_CONTRACT_VERSION;
  generatedAt: number;
  organizationId: Id<"organizations">;
  organizationName: string;
  isOrgOwner: boolean;
  isSuperAdmin: boolean;
  canEdit: boolean;
  rolloutFlags: ComplianceMigrationRolloutFlags;
  runbooks: Array<{
    runbookId: string;
    title: string;
    path: string;
  }>;
  telemetryDashboard: {
    operationalTelemetryContractVersion: typeof COMPLIANCE_OPERATIONAL_TELEMETRY_CONTRACT_VERSION;
    effectiveGateStatus: ComplianceGateStatus;
    blockerCount: number;
    criticalAlertCount: number;
    warningAlertCount: number;
    infoAlertCount: number;
    outreachStalledCount: number;
    invalidEvidenceCount: number;
    reviewOverdueCount: number;
    retentionExpiredCount: number;
    lastGateTransitionAt: number | null;
  };
  readiness: {
    telemetryReady: boolean;
    runbooksReady: boolean;
    contextLabelsReady: boolean;
    shadowModeReady: boolean;
    strictEnforcementReady: boolean;
  };
  verificationCommands: string[];
}

type CompliancePlatformTrustPackageDownloadStatus =
  | "ready"
  | "missing_integrity_media"
  | "media_record_missing"
  | "storage_unavailable"
  | "url_generation_failed";

export interface CompliancePlatformTrustPackageEntry {
  evidenceObjectId: string;
  title: string;
  sourceOrganizationId: string;
  subtype: string | null;
  sourceType: string | null;
  inheritanceScope: string | null;
  lifecycleStatus: string | null;
  updatedAt: number;
  nextReviewAt: number | null;
  retentionDeleteAt: number | null;
  riskIds: RiskId[];
  checksumSha256: string | null;
  downloadUrl: string | null;
  downloadStatus: CompliancePlatformTrustPackageDownloadStatus;
}

export interface CompliancePlatformTrustPackage {
  contractVersion: typeof COMPLIANCE_PLATFORM_TRUST_PACKAGE_CONTRACT_VERSION;
  generatedAt: number;
  organizationId: Id<"organizations">;
  packageVersion: string;
  advisoryOnly: true;
  totalEntries: number;
  sourceOrganizationCount: number;
  latestUpdatedAt: number | null;
  entries: CompliancePlatformTrustPackageEntry[];
}

const TRANSFER_WORKFLOW_RECORD_MISSING_BLOCKER = "transfer_workflow_record_missing";
const SECURITY_WORKFLOW_RECORD_MISSING_BLOCKER = "security_workflow_record_missing";

export type ComplianceInboxPlannerAction = {
  actionId: string;
  order: number;
  type: ComplianceInboxActionType;
  priority: ComplianceInboxActionPriority;
  priorityRank: number;
  riskId: RiskId | null;
  title: string;
  reason: string;
  dueAt: number | null;
  requiredArtifactId?: string;
  requiredArtifactLabel?: string;
  evidenceObjectId?: string;
  evidenceTitle?: string;
  evidenceSource?: ResolvedComplianceEvidenceRow["sourceMarker"];
};

type ComplianceInboxPlannerRiskCoverage = {
  riskId: RiskId;
  requiredArtifactCount: number;
  satisfiedArtifactCount: number;
  missingArtifactIds: string[];
  platformSharedSupportingCount: number;
  orgInheritedSupportingCount: number;
  inheritedSupportingCount: number;
  inheritedSupportingTitles: string[];
};

export type ComplianceInboxPlannerResult = {
  generatedAt: number;
  actions: ComplianceInboxPlannerAction[];
  nextAction: ComplianceInboxPlannerAction | null;
  summary: {
    totalActions: number;
    criticalActions: number;
    highActions: number;
    mediumActions: number;
    blockerRiskIds: RiskId[];
    dueReviewCount: number;
    overdueRetentionCount: number;
    invalidEvidenceCount: number;
    missingArtifactCount: number;
  };
  riskCoverage: ComplianceInboxPlannerRiskCoverage[];
};

const COMPLIANCE_INBOX_REQUIRED_ARTIFACTS: Record<RiskId, ComplianceInboxRequiredArtifact[]> = {
  "R-002": [
    {
      artifactId: "provider_avv",
      label: "Signed provider AVV",
      requiredSubtype: "avv_provider",
      controlId: "provider_avv",
    },
  ],
  "R-003": [
    {
      artifactId: "transfer_map",
      label: "Transfer map",
      requiredSubtype: "transfer_impact",
      controlId: "transfer_map",
    },
    {
      artifactId: "scc_tia",
      label: "SCC/TIA package",
      requiredSubtype: "transfer_impact",
      controlId: "scc_tia",
    },
    {
      artifactId: "supplementary_controls",
      label: "Supplementary controls record",
      requiredSubtype: "transfer_impact",
      controlId: "supplementary_controls",
    },
  ],
  "R-004": [
    {
      artifactId: "rbac",
      label: "RBAC evidence",
      requiredSubtype: "security_control",
      controlId: "rbac",
    },
    {
      artifactId: "mfa",
      label: "MFA evidence",
      requiredSubtype: "security_control",
      controlId: "mfa",
    },
    {
      artifactId: "encryption",
      label: "Encryption evidence",
      requiredSubtype: "security_control",
      controlId: "encryption",
    },
    {
      artifactId: "tenant_isolation",
      label: "Tenant isolation evidence",
      requiredSubtype: "security_control",
      controlId: "tenant_isolation",
    },
    {
      artifactId: "key_rotation",
      label: "Key rotation evidence",
      requiredSubtype: "security_control",
      controlId: "key_rotation",
    },
  ],
  "R-005": [
    {
      artifactId: "incident_tabletop",
      label: "Recent incident tabletop evidence",
      requiredSubtype: "incident_response",
      controlId: "incident_tabletop",
    },
  ],
};

function riskOrderRank(riskId: RiskId | null): number {
  if (!riskId) {
    return Number.MAX_SAFE_INTEGER;
  }
  const index = RISK_ID_VALUES.indexOf(riskId);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

function severityRankForRisk(riskId: RiskId): number {
  const template = RISK_TEMPLATE_BY_ID.get(riskId);
  if (!template) {
    return 3;
  }
  if (template.severity === "high") {
    return 0;
  }
  if (template.severity === "medium_high") {
    return 1;
  }
  return 2;
}

const riskIdValidator = v.union(
  v.literal("R-002"),
  v.literal("R-003"),
  v.literal("R-004"),
  v.literal("R-005"),
);
const riskStatusValidator = v.union(v.literal("open"), v.literal("in_review"), v.literal("closed"));
const decisionStatusValidator = v.union(
  v.literal("open"),
  v.literal("partial"),
  v.literal("freigegeben"),
  v.literal("abgelehnt"),
);
const ownerGateDecisionValidator = v.union(v.literal("GO"), v.literal("NO_GO"));
const complianceInboxWizardDraftWorkflowValidator = v.union(
  v.literal("avv"),
  v.literal("transfer"),
  v.literal("security"),
);
const complianceInboxWizardAvvDraftValidator = v.object({
  providerName: v.optional(v.string()),
  providerEmail: v.optional(v.string()),
  outreachState: v.optional(v.string()),
  avvEvidenceRef: v.optional(v.string()),
  nextReviewAt: v.optional(v.string()),
  notes: v.optional(v.string()),
});
const complianceInboxWizardTransferDraftValidator = v.object({
  exporterRegion: v.optional(v.string()),
  importerRegion: v.optional(v.string()),
  transferMapRef: v.optional(v.string()),
  sccReference: v.optional(v.string()),
  tiaReference: v.optional(v.string()),
  supplementaryControls: v.optional(v.string()),
  notes: v.optional(v.string()),
});
const complianceInboxWizardSecurityDraftValidator = v.object({
  rbacEvidenceRef: v.optional(v.string()),
  mfaEvidenceRef: v.optional(v.string()),
  encryptionEvidenceRef: v.optional(v.string()),
  tenantIsolationEvidenceRef: v.optional(v.string()),
  keyRotationEvidenceRef: v.optional(v.string()),
  notes: v.optional(v.string()),
});

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeNullableString(value: unknown): string | null {
  return normalizeString(value) ?? null;
}

function normalizeWizardDraftWorkflow(
  value: unknown,
): ComplianceInboxWizardDraftWorkflow | null {
  if (value === "avv" || value === "transfer" || value === "security") {
    return value;
  }
  return null;
}

function normalizeRiskIdNullable(value: unknown): RiskId | null {
  return value && RISK_ID_VALUES.includes(value as RiskId) ? (value as RiskId) : null;
}

function normalizeNonNegativeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function normalizeBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function compactRecord(record: Record<string, unknown>): Record<string, unknown> {
  const compacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== "undefined") {
      compacted[key] = value;
    }
  }
  return compacted;
}

export function resolveComplianceMigrationRolloutFlags(
  input?: ComplianceMigrationRolloutFlagsInput,
): ComplianceMigrationRolloutFlags {
  const telemetryDashboardsEnabled = input?.telemetryDashboardsEnabled !== false;
  const runbooksEnabled = input?.runbooksEnabled !== false;
  const contextLabelEnforcementEnabled = input?.contextLabelEnforcementEnabled !== false;
  const shadowModeEvaluatorEnabled = input?.shadowModeEvaluatorEnabled === true;
  const strictEnforcementEnabled =
    input?.strictEnforcementEnabled === true && shadowModeEvaluatorEnabled;
  const shadowModeSurfaceFlags = resolveComplianceShadowModeSurfaceFlags(
    input?.shadowModeSurfaceFlags,
    shadowModeEvaluatorEnabled,
  );

  return {
    telemetryDashboardsEnabled,
    runbooksEnabled,
    contextLabelEnforcementEnabled,
    shadowModeEvaluatorEnabled,
    strictEnforcementEnabled,
    shadowModeSurfaceFlags,
  };
}

type ComplianceMigrationRolloutFlagsInput = Partial<
  Omit<ComplianceMigrationRolloutFlags, "shadowModeSurfaceFlags">
> & {
  shadowModeSurfaceFlags?: Partial<ComplianceShadowModeSurfaceFlags> | null;
};

function resolveComplianceShadowModeSurfaceFlags(
  input: Partial<ComplianceShadowModeSurfaceFlags> | null | undefined,
  shadowModeEvaluatorEnabled: boolean,
): ComplianceShadowModeSurfaceFlags {
  const defaultEnabled = shadowModeEvaluatorEnabled;
  const defaultComplianceCenterEnabled = false;
  if (!shadowModeEvaluatorEnabled) {
    return {
      finder: false,
      layers: false,
      aiChat: false,
      complianceCenter: false,
    };
  }
  return {
    finder: input?.finder ?? defaultEnabled,
    layers: input?.layers ?? defaultEnabled,
    aiChat: input?.aiChat ?? defaultEnabled,
    complianceCenter: input?.complianceCenter ?? defaultComplianceCenterEnabled,
  };
}

function normalizeComplianceShadowModeSurface(
  value: unknown,
): ComplianceShadowModeSurface {
  if (
    value === "finder"
    || value === "layers"
    || value === "ai_chat"
    || value === "compliance_center"
    || value === "unknown"
  ) {
    return value;
  }
  return "unknown";
}

function isNonComplianceShadowModeSurface(
  surface: ComplianceShadowModeSurface,
): boolean {
  return surface !== "compliance_center";
}

function resolveComplianceShadowModeSurfaceEnabled(
  surface: ComplianceShadowModeSurface,
  flags: ComplianceShadowModeSurfaceFlags,
): boolean {
  if (surface === "finder") {
    return flags.finder;
  }
  if (surface === "layers") {
    return flags.layers;
  }
  if (surface === "ai_chat") {
    return flags.aiChat;
  }
  if (surface === "compliance_center") {
    return flags.complianceCenter;
  }
  return false;
}

export function resolveComplianceShadowModeEvaluation(args: {
  surface: ComplianceShadowModeSurface;
  rolloutFlags: ComplianceMigrationRolloutFlags;
  effectiveGateStatus: ComplianceGateStatus;
  blockerCount: number;
  blockerIds: RiskId[];
  evaluatedAt?: number;
}): ComplianceShadowModeEvaluationResult {
  const evaluatedAt =
    typeof args.evaluatedAt === "number" && Number.isFinite(args.evaluatedAt)
      ? args.evaluatedAt
      : Date.now();
  const nonComplianceSurface = isNonComplianceShadowModeSurface(args.surface);
  const evaluatorEnabled = args.rolloutFlags.shadowModeEvaluatorEnabled;
  const surfaceEnabled = nonComplianceSurface
    && evaluatorEnabled
    && resolveComplianceShadowModeSurfaceEnabled(
      args.surface,
      args.rolloutFlags.shadowModeSurfaceFlags,
    );

  let evaluationStatus: ComplianceShadowModeEvaluationStatus = "evaluated";
  let wouldBlock = false;
  let reasonCode = "shadow_mode_pass";

  if (!nonComplianceSurface) {
    evaluationStatus = "skipped";
    reasonCode = "compliance_surface_exempt";
  } else if (!evaluatorEnabled) {
    evaluationStatus = "disabled";
    reasonCode = "shadow_mode_disabled";
  } else if (!surfaceEnabled) {
    evaluationStatus = "skipped";
    reasonCode = "shadow_mode_surface_disabled";
  } else if (args.effectiveGateStatus !== "GO") {
    wouldBlock = true;
    reasonCode = "would_block_non_compliance_surface";
  }

  return {
    contractVersion: COMPLIANCE_SHADOW_MODE_EVALUATOR_CONTRACT_VERSION,
    evaluatedAt,
    surface: args.surface,
    nonComplianceSurface,
    evaluatorEnabled,
    surfaceEnabled,
    strictEnforcementEnabled: args.rolloutFlags.strictEnforcementEnabled,
    evaluationStatus,
    wouldBlock,
    effectiveGateStatus: args.effectiveGateStatus,
    blockerCount: Math.max(0, Math.floor(args.blockerCount)),
    blockerIds: Array.from(new Set(args.blockerIds)),
    reasonCode,
  };
}

function resolveComplianceMigrationRolloutFlagsFromCustomProperties(
  customProperties: unknown,
): ComplianceMigrationRolloutFlags {
  const props = asRecord(customProperties);
  const rolloutRecord = asRecord(props.complianceRolloutFlags);
  const shadowSurfaceRecord = asRecord(rolloutRecord.shadowModeSurfaceFlags);
  return resolveComplianceMigrationRolloutFlags({
    telemetryDashboardsEnabled:
      normalizeBoolean(rolloutRecord.telemetryDashboardsEnabled),
    runbooksEnabled:
      normalizeBoolean(rolloutRecord.runbooksEnabled),
    contextLabelEnforcementEnabled:
      normalizeBoolean(rolloutRecord.contextLabelEnforcementEnabled),
    shadowModeEvaluatorEnabled:
      normalizeBoolean(rolloutRecord.shadowModeEvaluatorEnabled),
    strictEnforcementEnabled:
      normalizeBoolean(rolloutRecord.strictEnforcementEnabled),
    shadowModeSurfaceFlags: {
      finder: normalizeBoolean(shadowSurfaceRecord.finder),
      layers: normalizeBoolean(shadowSurfaceRecord.layers),
      aiChat: normalizeBoolean(shadowSurfaceRecord.aiChat),
      complianceCenter:
        normalizeBoolean(shadowSurfaceRecord.complianceCenter),
    },
  });
}

function normalizeRiskStatus(value: unknown): RiskStatus {
  if (value === "open" || value === "in_review" || value === "closed") {
    return value;
  }
  return "open";
}

function normalizeDecisionStatus(value: unknown): RiskDecisionStatus {
  if (
    value === "open"
    || value === "partial"
    || value === "freigegeben"
    || value === "abgelehnt"
  ) {
    return value;
  }
  return "open";
}

function normalizeOwnerGateDecision(value: unknown): OwnerGateDecision {
  if (value === "GO" || value === "NO_GO") {
    return value;
  }
  return "NO_GO";
}

function normalizeGateStatus(value: unknown): ComplianceGateStatus | null {
  if (value === "GO" || value === "NO_GO") {
    return value;
  }
  return null;
}

function normalizePlatformShareScope(value: unknown): (typeof PLATFORM_SHARE_SCOPE_VALUES)[number] {
  if (
    value === "fleet_all_orgs"
    || value === "org_allowlist"
    || value === "org_denylist"
  ) {
    return value;
  }
  return "fleet_all_orgs";
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const normalized = new Set<string>();
  for (const entry of value) {
    const next = normalizeString(entry);
    if (!next) {
      continue;
    }
    normalized.add(next);
  }
  return Array.from(normalized).sort((left, right) => left.localeCompare(right));
}

function normalizeRiskIdList(value: unknown): RiskId[] {
  return normalizeStringList(value).filter(
    (entry): entry is RiskId => RISK_ID_VALUES.includes(entry as RiskId),
  );
}

function normalizeControlId(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  return normalized.toLowerCase();
}

function uniqueOrderedStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const next = normalizeString(value);
    if (!next || seen.has(next)) {
      continue;
    }
    seen.add(next);
    normalized.push(next);
  }
  return normalized;
}

function pickLatestObjectByUpdatedAt<T extends { _id: Id<"objects">; updatedAt: number }>(
  objects: T[],
): T | null {
  const sorted = [...objects].sort((left, right) => {
    if (left.updatedAt !== right.updatedAt) {
      return right.updatedAt - left.updatedAt;
    }
    return String(right._id).localeCompare(String(left._id));
  });
  return sorted[0] ?? null;
}

function mapComplianceInboxWizardAvvDraft(value: unknown): ComplianceInboxWizardAvvDraft {
  const record = asRecord(value);
  return {
    providerName: normalizeNullableString(record.providerName),
    providerEmail: normalizeNullableString(record.providerEmail),
    outreachState: normalizeNullableString(record.outreachState),
    avvEvidenceRef: normalizeNullableString(record.avvEvidenceRef),
    nextReviewAt: normalizeNullableString(record.nextReviewAt),
    notes: normalizeNullableString(record.notes),
  };
}

function mapComplianceInboxWizardTransferDraft(
  value: unknown,
): ComplianceInboxWizardTransferDraft {
  const record = asRecord(value);
  return {
    exporterRegion: normalizeNullableString(record.exporterRegion),
    importerRegion: normalizeNullableString(record.importerRegion),
    transferMapRef: normalizeNullableString(record.transferMapRef),
    sccReference: normalizeNullableString(record.sccReference),
    tiaReference: normalizeNullableString(record.tiaReference),
    supplementaryControls: normalizeNullableString(record.supplementaryControls),
    notes: normalizeNullableString(record.notes),
  };
}

function mapComplianceInboxWizardSecurityDraft(
  value: unknown,
): ComplianceInboxWizardSecurityDraft {
  const record = asRecord(value);
  return {
    rbacEvidenceRef: normalizeNullableString(record.rbacEvidenceRef),
    mfaEvidenceRef: normalizeNullableString(record.mfaEvidenceRef),
    encryptionEvidenceRef: normalizeNullableString(record.encryptionEvidenceRef),
    tenantIsolationEvidenceRef: normalizeNullableString(record.tenantIsolationEvidenceRef),
    keyRotationEvidenceRef: normalizeNullableString(record.keyRotationEvidenceRef),
    notes: normalizeNullableString(record.notes),
  };
}

export function mapComplianceInboxWizardDraftObjectToSnapshot(
  draftObject: Doc<"objects">,
): ComplianceInboxWizardDraftSnapshot {
  const props = asRecord(draftObject.customProperties);
  return {
    draftObjectId: draftObject._id,
    organizationId: draftObject.organizationId,
    sessionId: normalizeString(props.sessionId) ?? "",
    userId: normalizeString(props.userId) ?? "",
    actionId: normalizeNullableString(props.actionId),
    riskId: normalizeRiskIdNullable(props.riskId),
    workflow: normalizeWizardDraftWorkflow(props.workflow),
    stepIndex: normalizeNonNegativeInteger(props.stepIndex),
    stepLabel: normalizeNullableString(props.stepLabel),
    checkpointUpdatedAt: normalizeTimestamp(props.checkpointUpdatedAt, draftObject.updatedAt),
    avvDraft: mapComplianceInboxWizardAvvDraft(props.avvDraft),
    transferDraft: mapComplianceInboxWizardTransferDraft(props.transferDraft),
    securityDraft: mapComplianceInboxWizardSecurityDraft(props.securityDraft),
    updatedAt: draftObject.updatedAt,
    createdAt: draftObject.createdAt,
  };
}

async function findComplianceInboxWizardDraftObject(args: {
  ctx: QueryCtx | MutationCtx;
  organizationId: Id<"organizations">;
  sessionId: string;
  userId: Id<"users">;
}): Promise<Doc<"objects"> | null> {
  const candidates = await args.ctx.db
    .query("objects")
    .withIndex("by_org_type_subtype", (q) =>
      q.eq("organizationId", args.organizationId)
        .eq("type", COMPLIANCE_INBOX_WIZARD_DRAFT_OBJECT_TYPE)
        .eq("subtype", COMPLIANCE_INBOX_WIZARD_DRAFT_OBJECT_SUBTYPE),
    )
    .collect();
  const sessionId = normalizeString(args.sessionId) ?? "";
  const userId = String(args.userId);
  if (!sessionId) {
    return null;
  }
  return (
    candidates
      .filter((candidate) => {
        const props = asRecord(candidate.customProperties);
        return (
          normalizeString(props.sessionId) === sessionId
          && normalizeString(props.userId) === userId
        );
      })
      .sort((left, right) => {
        if (left.updatedAt !== right.updatedAt) {
          return right.updatedAt - left.updatedAt;
        }
        return String(right._id).localeCompare(String(left._id));
      })[0] ?? null
  );
}

type WorkflowSignalObject = Pick<Doc<"objects">, "_id" | "updatedAt" | "customProperties"> | null;

export function deriveWorkflowCompletenessSignals(args: {
  transferWorkflowObject: WorkflowSignalObject;
  securityWorkflowObject: WorkflowSignalObject;
}): Record<WorkflowSignalRiskId, ComplianceWorkflowCompletenessSignal> {
  const transferProps = asRecord(args.transferWorkflowObject?.customProperties);
  const transferBlockingWarnings = normalizeStringList(transferProps.revalidationBlockingWarnings);
  const transferAdvisoryWarnings = normalizeStringList(transferProps.revalidationAdvisoryWarnings);
  const transferCompleteness = computeTransferWorkflowCompleteness({
    exporterRegion: normalizeString(transferProps.exporterRegion) ?? null,
    importerRegion: normalizeString(transferProps.importerRegion) ?? null,
    transferMapRef: normalizeString(transferProps.transferMapRef) ?? null,
    sccReference: normalizeString(transferProps.sccReference) ?? null,
    tiaReference: normalizeString(transferProps.tiaReference) ?? null,
    supplementaryControls: normalizeString(transferProps.supplementaryControls) ?? null,
  });
  const transferSignal: ComplianceWorkflowCompletenessSignal = {
    riskId: "R-003",
    source: args.transferWorkflowObject ? "workflow_object" : "missing_workflow_object",
    isComplete: args.transferWorkflowObject
      ? transferCompleteness.isComplete && transferBlockingWarnings.length === 0
      : false,
    completenessScore: transferCompleteness.completenessScore,
    blockers: uniqueOrderedStrings([
      args.transferWorkflowObject ? null : TRANSFER_WORKFLOW_RECORD_MISSING_BLOCKER,
      ...transferCompleteness.blockers,
      ...transferBlockingWarnings,
    ]),
    warnings: uniqueOrderedStrings(transferAdvisoryWarnings),
    missingArtifactIds: [...transferCompleteness.missingArtifactIds],
    updatedAt: args.transferWorkflowObject?.updatedAt ?? null,
  };

  const securityProps = asRecord(args.securityWorkflowObject?.customProperties);
  const securityBlockingWarnings = normalizeStringList(securityProps.revalidationBlockingWarnings);
  const securityAdvisoryWarnings = normalizeStringList(securityProps.revalidationAdvisoryWarnings);
  const securityCompleteness = computeSecurityWorkflowCompleteness({
    rbacEvidenceRef: normalizeString(securityProps.rbacEvidenceRef) ?? null,
    mfaEvidenceRef: normalizeString(securityProps.mfaEvidenceRef) ?? null,
    encryptionEvidenceRef: normalizeString(securityProps.encryptionEvidenceRef) ?? null,
    tenantIsolationEvidenceRef: normalizeString(securityProps.tenantIsolationEvidenceRef) ?? null,
    keyRotationEvidenceRef: normalizeString(securityProps.keyRotationEvidenceRef) ?? null,
  });
  const securitySignal: ComplianceWorkflowCompletenessSignal = {
    riskId: "R-004",
    source: args.securityWorkflowObject ? "workflow_object" : "missing_workflow_object",
    isComplete: args.securityWorkflowObject
      ? securityCompleteness.isComplete && securityBlockingWarnings.length === 0
      : false,
    completenessScore: securityCompleteness.completenessScore,
    blockers: uniqueOrderedStrings([
      args.securityWorkflowObject ? null : SECURITY_WORKFLOW_RECORD_MISSING_BLOCKER,
      ...securityCompleteness.blockers,
      ...securityBlockingWarnings,
    ]),
    warnings: uniqueOrderedStrings(securityAdvisoryWarnings),
    missingArtifactIds: [...securityCompleteness.missingArtifactIds],
    updatedAt: args.securityWorkflowObject?.updatedAt ?? null,
  };

  return {
    "R-003": transferSignal,
    "R-004": securitySignal,
  };
}

export function applyWorkflowSignalsToRiskRows<T extends ComplianceInboxRiskRowInput>(args: {
  riskRows: T[];
  workflowSignals: Partial<Record<WorkflowSignalRiskId, ComplianceWorkflowCompletenessSignal>>;
}): Array<T & ComplianceInboxRiskRowInput> {
  return args.riskRows.map((riskRow) => {
    if (riskRow.riskId !== "R-003" && riskRow.riskId !== "R-004") {
      return riskRow as T & ComplianceInboxRiskRowInput;
    }
    const signal = args.workflowSignals[riskRow.riskId];
    if (!signal) {
      return riskRow as T & ComplianceInboxRiskRowInput;
    }

    const lastUpdatedAtCandidates = [riskRow.lastUpdatedAt, signal.updatedAt].filter(
      (entry): entry is number => typeof entry === "number" && Number.isFinite(entry),
    );
    const lastUpdatedAt =
      lastUpdatedAtCandidates.length > 0 ? Math.max(...lastUpdatedAtCandidates) : null;

    return {
      ...riskRow,
      blocker: riskRow.blocker || !signal.isComplete,
      lastUpdatedAt,
      workflowSignalSource: signal.source,
      workflowCompletenessScore: signal.completenessScore,
      workflowIsComplete: signal.isComplete,
      workflowBlockers: [...signal.blockers],
      workflowWarnings: [...signal.warnings],
      workflowMissingArtifactIds: [...signal.missingArtifactIds],
    };
  });
}

function buildEvidenceResolutionContextForOrganization(args: {
  organizationId: Id<"organizations">;
  evidenceObjects: Doc<"objects">[];
}) {
  const organizationKey = String(args.organizationId);
  const mappedRows = args.evidenceObjects.map(mapEvidenceObjectToRow);
  const organizationRows = mappedRows.filter(
    (row) => String(row.organizationId) === organizationKey,
  );
  const platformSharedRows = mappedRows.filter(
    (row) =>
      String(row.organizationId) !== organizationKey
      && isPlatformSharedEvidenceVisibleForOrganization(row, args.organizationId),
  );
  const resolved = resolveEffectiveEvidenceRows({
    organizationRows,
    platformSharedRows,
  });

  return {
    organizationRows,
    platformSharedRows,
    resolvedRows: resolved.rows,
    hiddenRows: resolved.hiddenRows,
  };
}

function riskArtifactSatisfied(args: {
  riskId: RiskId;
  requirement: ComplianceInboxRequiredArtifact;
  rows: ResolvedComplianceEvidenceRow[];
}): boolean {
  const requiredControlId = normalizeControlId(args.requirement.controlId);
  return args.rows.some((row) => {
    if (!row.contractValid || row.lifecycleStatus !== "active") {
      return false;
    }
    if (row.subtype !== args.requirement.requiredSubtype) {
      return false;
    }
    const matchingRiskRefs = row.riskReferences.filter((reference) => reference.riskId === args.riskId);
    if (matchingRiskRefs.length === 0) {
      return false;
    }
    if (!requiredControlId) {
      return true;
    }
    return matchingRiskRefs.some(
      (reference) => normalizeControlId(reference.controlId) === requiredControlId,
    );
  });
}

function buildActionPriority(args: {
  type: ComplianceInboxActionType;
  riskId: RiskId | null;
}): { priority: ComplianceInboxActionPriority; priorityRank: number } {
  const baseRank =
    args.type === "invalid_evidence_metadata"
      ? 0
      : args.type === "evidence_retention_expired"
        ? 10
        : args.type === "missing_evidence"
          ? 20
          : args.type === "avv_outreach_follow_up"
            ? 25
          : args.type === "evidence_review_due"
            ? 30
            : args.type === "workflow_revalidation_warning"
              ? 35
              : 40;
  const severityOffset = args.riskId ? severityRankForRisk(args.riskId) : 3;
  const priority: ComplianceInboxActionPriority =
    args.type === "invalid_evidence_metadata" || args.type === "evidence_retention_expired"
      ? "critical"
      : args.type === "missing_evidence"
        || args.type === "evidence_review_due"
        || args.type === "avv_outreach_follow_up"
        ? "high"
        : args.type === "workflow_revalidation_warning"
          ? "medium"
          : "medium";
  return {
    priority,
    priorityRank: baseRank + severityOffset,
  };
}

export function deriveGateBlockersFromRiskRows(args: {
  riskRows: Array<{
    riskId: RiskId;
    status: RiskStatus;
    decisionStatus: RiskDecisionStatus;
    blocker: boolean;
    workflowBlockers?: string[];
  }>;
}): ComplianceGateBlockerReason[] {
  const blockers: ComplianceGateBlockerReason[] = [];
  const seen = new Set<string>();
  const orderedRows = [...args.riskRows].sort(
    (left, right) => riskOrderRank(left.riskId) - riskOrderRank(right.riskId),
  );

  const addBlocker = (blocker: ComplianceGateBlockerReason) => {
    const key = `${blocker.riskId}:${blocker.source}:${blocker.code}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    blockers.push(blocker);
  };

  for (const riskRow of orderedRows) {
    if (!riskRow.blocker) {
      continue;
    }

    const workflowCodes = uniqueOrderedStrings(riskRow.workflowBlockers ?? []);
    if ((riskRow.riskId === "R-003" || riskRow.riskId === "R-004") && workflowCodes.length > 0) {
      for (const workflowCode of workflowCodes) {
        addBlocker({
          riskId: riskRow.riskId,
          code: workflowCode,
          message: `Workflow blocker '${workflowCode}' is unresolved for ${riskRow.riskId}.`,
          source: "workflow",
        });
      }
    }

    if (riskRow.status !== "closed") {
      addBlocker({
        riskId: riskRow.riskId,
        code: `risk_status_${riskRow.status}`,
        message: `Risk status is '${riskRow.status}' and must be 'closed'.`,
        source: "risk_assessment",
      });
    }
    if (riskRow.decisionStatus !== "freigegeben") {
      addBlocker({
        riskId: riskRow.riskId,
        code: `risk_decision_${riskRow.decisionStatus}`,
        message: `Risk decision status is '${riskRow.decisionStatus}' and must be 'freigegeben'.`,
        source: "risk_assessment",
      });
    }

    const hasReasonForRisk = blockers.some((blocker) => blocker.riskId === riskRow.riskId);
    if (!hasReasonForRisk) {
      addBlocker({
        riskId: riskRow.riskId,
        code: "fail_closed_guardrail",
        message: "Risk remains blocked by fail-closed guardrails.",
        source: "risk_assessment",
      });
    }
  }

  return blockers;
}

export function isMissingEvidenceGuardrailCode(code: string): boolean {
  const normalized = code.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return normalized.includes("missing") || normalized.includes("_due") || normalized.includes("_expired");
}

export function extractMissingEvidenceGuardrailBlockers(
  blockers: ComplianceGateBlockerReason[],
): ComplianceGateBlockerReason[] {
  return blockers.filter((blocker) => isMissingEvidenceGuardrailCode(blocker.code));
}

function describeRiskBlockerReason(riskRow: ComplianceInboxRiskRowInput): string {
  if (
    (riskRow.riskId === "R-003" || riskRow.riskId === "R-004")
    && Array.isArray(riskRow.workflowBlockers)
    && riskRow.workflowBlockers.length > 0
  ) {
    const completenessScore =
      typeof riskRow.workflowCompletenessScore === "number"
      && Number.isFinite(riskRow.workflowCompletenessScore)
        ? riskRow.workflowCompletenessScore
        : 0;
    return `Workflow completeness is ${completenessScore}% and remains blocked (${riskRow.workflowBlockers.join(", ")}).`;
  }
  if (riskRow.status !== "closed") {
    return `Risk status is '${riskRow.status}' and must be 'closed'.`;
  }
  if (riskRow.decisionStatus !== "freigegeben") {
    return `Risk decision status is '${riskRow.decisionStatus}' and must be 'freigegeben'.`;
  }
  return "Risk remains blocked by fail-closed guardrails.";
}

function describeWorkflowRevalidationWarning(args: {
  riskId: RiskId;
  warningCode: string;
}): string {
  const domainLabel = args.riskId === "R-003" ? "transfer" : "security";
  if (args.warningCode.includes("review_due_soon")) {
    return `Upcoming ${domainLabel} evidence review deadlines are approaching and require revalidation planning.`;
  }
  if (args.warningCode.includes("retention_expiring_soon")) {
    return `Upcoming ${domainLabel} evidence retention deadlines are approaching and replacement evidence should be prepared.`;
  }
  return `Workflow revalidation warning '${args.warningCode}' requires operator attention.`;
}

function describeAvvOutreachPlannerReason(row: ComplianceAvvOutreachRow): string {
  if (!row.contractValid) {
    return `AVV dossier metadata is invalid (${row.validationErrors.join(", ")}).`;
  }
  if (row.state === "draft") {
    return "Provider dossier is still in draft and requires confirmation staging.";
  }
  if (row.state === "pending_confirmation") {
    return "Provider dossier requires explicit operator confirmation before queueing outreach.";
  }
  if (row.state === "queued") {
    return "Outreach email is queued and pending delivery confirmation.";
  }
  if (row.state === "sent" || row.state === "awaiting_response") {
    return "Outreach is in-flight and waiting for provider response/evidence intake.";
  }
  if (row.state === "response_received") {
    return "Provider response is captured and must be finalized to approved/rejected.";
  }
  if (row.state === "rejected") {
    return "Provider AVV response was rejected and requires remediation or escalation.";
  }
  if (row.state === "escalated") {
    return "Provider AVV workflow is escalated and requires immediate follow-up.";
  }
  if (row.state === "closed_blocked") {
    return "Provider AVV workflow is closed blocked and requires explicit unblock decision.";
  }
  return "Provider AVV workflow is complete.";
}

function shouldTrackAvvOutreachPlannerAction(row: ComplianceAvvOutreachRow): boolean {
  if (!row.contractValid) {
    return true;
  }
  return row.state !== "approved";
}

export function buildComplianceInboxPlanner(args: {
  now: number;
  riskRows: ComplianceInboxRiskRowInput[];
  resolvedEvidenceRows: ResolvedComplianceEvidenceRow[];
  invalidEvidenceRows: ComplianceEvidenceVaultRow[];
  avvOutreachRows?: ComplianceAvvOutreachRow[];
}): ComplianceInboxPlannerResult {
  const actions: ComplianceInboxPlannerAction[] = [];
  const seenActionIds = new Set<string>();
  const riskCoverage: ComplianceInboxPlannerRiskCoverage[] = [];
  const riskRowsById = new Map<RiskId, ComplianceInboxRiskRowInput>(
    args.riskRows.map((row) => [row.riskId, row]),
  );
  const evidenceByRisk = new Map<RiskId, ResolvedComplianceEvidenceRow[]>();

  for (const riskId of RISK_ID_VALUES) {
    evidenceByRisk.set(riskId, []);
  }

  for (const evidenceRow of args.resolvedEvidenceRows) {
    for (const riskReference of evidenceRow.riskReferences) {
      const riskId = riskReference.riskId;
      if (!RISK_ID_VALUES.includes(riskId)) {
        continue;
      }
      const existing = evidenceByRisk.get(riskId) ?? [];
      if (!existing.some((row) => String(row.evidenceObjectId) === String(evidenceRow.evidenceObjectId))) {
        existing.push(evidenceRow);
        evidenceByRisk.set(riskId, existing);
      }
    }
  }

  const addAction = (action: Omit<ComplianceInboxPlannerAction, "order">) => {
    if (seenActionIds.has(action.actionId)) {
      return;
    }
    seenActionIds.add(action.actionId);
    actions.push({
      ...action,
      order: 0,
    });
  };

  const sortedInvalidRows = [...args.invalidEvidenceRows].sort((left, right) => {
    if (left.updatedAt !== right.updatedAt) {
      return right.updatedAt - left.updatedAt;
    }
    return String(left.evidenceObjectId).localeCompare(String(right.evidenceObjectId));
  });

  for (const invalidRow of sortedInvalidRows) {
    const linkedRiskIds = invalidRow.riskReferences
      .map((reference) => reference.riskId)
      .filter((riskId, index, values) => values.indexOf(riskId) === index);
    const targets: Array<RiskId | null> = linkedRiskIds.length > 0 ? linkedRiskIds : [null];

    for (const riskId of targets) {
      const priority = buildActionPriority({
        type: "invalid_evidence_metadata",
        riskId,
      });
      addAction({
        actionId: `invalid:${String(invalidRow.evidenceObjectId)}:${riskId ?? "none"}`,
        type: "invalid_evidence_metadata",
        priority: priority.priority,
        priorityRank: priority.priorityRank,
        riskId,
        title: "Repair invalid evidence metadata",
        reason: `Evidence '${invalidRow.title}' failed contract validation (${invalidRow.validationErrors.join(", ")}).`,
        dueAt: invalidRow.nextReviewAt,
        evidenceObjectId: String(invalidRow.evidenceObjectId),
        evidenceTitle: invalidRow.title,
      });
    }
  }

  const avvRows = [...(args.avvOutreachRows ?? [])].sort((left, right) => {
    const leftDueAt = left.slaFirstDueAt ?? Number.MAX_SAFE_INTEGER;
    const rightDueAt = right.slaFirstDueAt ?? Number.MAX_SAFE_INTEGER;
    if (leftDueAt !== rightDueAt) {
      return leftDueAt - rightDueAt;
    }
    return String(left.dossierObjectId).localeCompare(String(right.dossierObjectId));
  });
  for (const avvRow of avvRows) {
    if (!shouldTrackAvvOutreachPlannerAction(avvRow)) {
      continue;
    }
    const priority = buildActionPriority({
      type: "avv_outreach_follow_up",
      riskId: "R-002",
    });
    addAction({
      actionId: `avv:${String(avvRow.dossierObjectId)}:${avvRow.state}`,
      type: "avv_outreach_follow_up",
      priority: priority.priority,
      priorityRank:
        avvRow.state === "escalated" || avvRow.state === "closed_blocked"
          ? Math.min(priority.priorityRank, 6)
          : priority.priorityRank,
      riskId: "R-002",
      title: "Advance AVV outreach workflow",
      reason: describeAvvOutreachPlannerReason(avvRow),
      dueAt:
        avvRow.nextReminderAlertAt
        ?? avvRow.slaReminderAt
        ?? avvRow.slaFirstDueAt,
    });
  }

  for (const riskId of RISK_ID_VALUES) {
    const riskRows = evidenceByRisk.get(riskId) ?? [];
    const requirements = COMPLIANCE_INBOX_REQUIRED_ARTIFACTS[riskId] ?? [];
    const missingArtifactIds: string[] = [];
    let satisfiedArtifactCount = 0;

    for (const requirement of requirements) {
      const satisfied = riskArtifactSatisfied({
        riskId,
        requirement,
        rows: riskRows,
      });
      if (satisfied) {
        satisfiedArtifactCount += 1;
      } else {
        missingArtifactIds.push(requirement.artifactId);
        const priority = buildActionPriority({
          type: "missing_evidence",
          riskId,
        });
        addAction({
          actionId: `missing:${riskId}:${requirement.artifactId}`,
          type: "missing_evidence",
          priority: priority.priority,
          priorityRank: priority.priorityRank,
          riskId,
          title: `Collect ${requirement.label}`,
          reason: `Required evidence artifact '${requirement.label}' is missing for ${riskId}.`,
          dueAt: null,
          requiredArtifactId: requirement.artifactId,
          requiredArtifactLabel: requirement.label,
        });
      }
    }

    const now = args.now;
    const byEvidenceId = new Map<string, ResolvedComplianceEvidenceRow>();
    for (const row of riskRows) {
      byEvidenceId.set(String(row.evidenceObjectId), row);
    }
    const uniqueRiskEvidenceRows = Array.from(byEvidenceId.values());
    const inheritedSupportingRows = uniqueRiskEvidenceRows
      .filter(
        (row) =>
          row.contractValid
          && row.lifecycleStatus === "active"
          && (row.sourceMarker === "platform_shared" || row.sourceMarker === "org_inherited"),
      )
      .sort((left, right) => {
        if (left.updatedAt !== right.updatedAt) {
          return right.updatedAt - left.updatedAt;
        }
        return String(left.evidenceObjectId).localeCompare(String(right.evidenceObjectId));
      });
    const platformSharedSupportingCount = inheritedSupportingRows.filter(
      (row) => row.sourceMarker === "platform_shared",
    ).length;
    const orgInheritedSupportingCount = inheritedSupportingRows.filter(
      (row) => row.sourceMarker === "org_inherited",
    ).length;
    const inheritedSupportingTitles = inheritedSupportingRows
      .map((row) => row.title.trim())
      .filter((title) => title.length > 0)
      .filter((title, index, values) => values.indexOf(title) === index)
      .slice(0, 3);

    for (const row of uniqueRiskEvidenceRows) {
      if (!row.contractValid || row.lifecycleStatus !== "active") {
        continue;
      }

      if (typeof row.retentionDeleteAt === "number" && row.retentionDeleteAt <= now) {
        const priority = buildActionPriority({
          type: "evidence_retention_expired",
          riskId,
        });
        addAction({
          actionId: `retention:${riskId}:${String(row.evidenceObjectId)}`,
          type: "evidence_retention_expired",
          priority: priority.priority,
          priorityRank: priority.priorityRank,
          riskId,
          title: "Replace expired evidence",
          reason: `Evidence '${row.title}' reached its retention deletion date and cannot satisfy ${riskId}.`,
          dueAt: row.retentionDeleteAt,
          evidenceObjectId: String(row.evidenceObjectId),
          evidenceTitle: row.title,
          evidenceSource: row.sourceMarker,
        });
        continue;
      }

      if (typeof row.nextReviewAt === "number" && row.nextReviewAt <= now) {
        const priority = buildActionPriority({
          type: "evidence_review_due",
          riskId,
        });
        addAction({
          actionId: `review:${riskId}:${String(row.evidenceObjectId)}`,
          type: "evidence_review_due",
          priority: priority.priority,
          priorityRank: priority.priorityRank,
          riskId,
          title: "Review overdue evidence",
          reason: `Evidence '${row.title}' is past next review date and requires revalidation.`,
          dueAt: row.nextReviewAt,
          evidenceObjectId: String(row.evidenceObjectId),
          evidenceTitle: row.title,
          evidenceSource: row.sourceMarker,
        });
      }
    }

    const riskRow = riskRowsById.get(riskId);
    const workflowWarningCodes = uniqueOrderedStrings(riskRow?.workflowWarnings ?? []);
    for (const warningCode of workflowWarningCodes) {
      const priority = buildActionPriority({
        type: "workflow_revalidation_warning",
        riskId,
      });
      addAction({
        actionId: `workflow-warning:${riskId}:${warningCode}`,
        type: "workflow_revalidation_warning",
        priority: priority.priority,
        priorityRank: priority.priorityRank,
        riskId,
        title: "Review workflow revalidation warning",
        reason: describeWorkflowRevalidationWarning({
          riskId,
          warningCode,
        }),
        dueAt: riskRow?.lastUpdatedAt ?? null,
      });
    }

    riskCoverage.push({
      riskId,
      requiredArtifactCount: requirements.length,
      satisfiedArtifactCount,
      missingArtifactIds,
      platformSharedSupportingCount,
      orgInheritedSupportingCount,
      inheritedSupportingCount: inheritedSupportingRows.length,
      inheritedSupportingTitles,
    });
  }

  const riskIdsWithActions = new Set<RiskId>(
    actions
      .map((action) => action.riskId)
      .filter((riskId): riskId is RiskId => Boolean(riskId)),
  );

  for (const riskId of RISK_ID_VALUES) {
    const riskRow = riskRowsById.get(riskId);
    if (!riskRow || !riskRow.blocker) {
      continue;
    }
    if (riskIdsWithActions.has(riskId)) {
      continue;
    }

    const priority = buildActionPriority({
      type: "risk_blocker",
      riskId,
    });
    addAction({
      actionId: `risk:${riskId}`,
      type: "risk_blocker",
      priority: priority.priority,
      priorityRank: priority.priorityRank,
      riskId,
      title: `Resolve blocker for ${riskId}`,
      reason: describeRiskBlockerReason(riskRow),
      dueAt: riskRow.lastUpdatedAt,
    });
  }

  const orderedActions = actions
    .sort((left, right) => {
      if (left.priorityRank !== right.priorityRank) {
        return left.priorityRank - right.priorityRank;
      }
      const riskOrder = riskOrderRank(left.riskId) - riskOrderRank(right.riskId);
      if (riskOrder !== 0) {
        return riskOrder;
      }
      const leftDueAt = left.dueAt ?? Number.MAX_SAFE_INTEGER;
      const rightDueAt = right.dueAt ?? Number.MAX_SAFE_INTEGER;
      if (leftDueAt !== rightDueAt) {
        return leftDueAt - rightDueAt;
      }
      return left.actionId.localeCompare(right.actionId);
    })
    .map((action, index) => ({
      ...action,
      order: index + 1,
    }));

  const blockerRiskIds = RISK_ID_VALUES.filter((riskId) => riskRowsById.get(riskId)?.blocker === true);
  const summary = {
    totalActions: orderedActions.length,
    criticalActions: orderedActions.filter((action) => action.priority === "critical").length,
    highActions: orderedActions.filter((action) => action.priority === "high").length,
    mediumActions: orderedActions.filter((action) => action.priority === "medium").length,
    blockerRiskIds,
    dueReviewCount: orderedActions.filter((action) => action.type === "evidence_review_due").length,
    overdueRetentionCount: orderedActions.filter((action) => action.type === "evidence_retention_expired").length,
    invalidEvidenceCount: orderedActions.filter((action) => action.type === "invalid_evidence_metadata").length,
    missingArtifactCount: orderedActions.filter((action) => action.type === "missing_evidence").length,
  };

  return {
    generatedAt: args.now,
    actions: orderedActions,
    nextAction: orderedActions[0] ?? null,
    summary,
    riskCoverage: riskCoverage.sort(
      (left, right) => riskOrderRank(left.riskId) - riskOrderRank(right.riskId),
    ),
  };
}

function computePlatformSharedEvidenceSummaryForOrganization(args: {
  organizationId: Id<"organizations">;
  evidenceObjects: Array<{
    organizationId: Id<"organizations">;
    status: string;
    customProperties?: Record<string, unknown>;
    updatedAt: number;
  }>;
}) {
  const organizationKey = String(args.organizationId);
  let availableCount = 0;
  let latestUpdatedAt: number | null = null;
  const sourceOrganizationIds = new Set<string>();

  for (const evidenceObject of args.evidenceObjects) {
    const props = asRecord(evidenceObject.customProperties);
    if (normalizeString(props.inheritanceScope) !== "platform_shared") {
      continue;
    }
    if (props.inheritanceEligible !== true) {
      continue;
    }
    if (normalizeString(evidenceObject.status) !== "active") {
      continue;
    }

    const scope = normalizePlatformShareScope(props.platformShareScope);
    const scopeOrgIds = new Set(normalizeStringList(props.platformShareOrganizationIds));
    const visible =
      scope === "fleet_all_orgs"
        ? true
        : scope === "org_allowlist"
          ? scopeOrgIds.has(organizationKey)
          : !scopeOrgIds.has(organizationKey);

    if (!visible) {
      continue;
    }

    availableCount += 1;
    sourceOrganizationIds.add(String(evidenceObject.organizationId));
    if (latestUpdatedAt === null || evidenceObject.updatedAt > latestUpdatedAt) {
      latestUpdatedAt = evidenceObject.updatedAt;
    }
  }

  return {
    availableCount,
    latestUpdatedAt,
    sourceOrganizationCount: sourceOrganizationIds.size,
  };
}

function buildPlatformTrustPackageVersion(args: {
  latestUpdatedAt: number | null;
  totalEntries: number;
  sourceOrganizationCount: number;
}): string {
  const updatedToken =
    typeof args.latestUpdatedAt === "number" && Number.isFinite(args.latestUpdatedAt)
      ? String(args.latestUpdatedAt)
      : "none";
  return `ptp-v1-${updatedToken}-${args.totalEntries}-${args.sourceOrganizationCount}`;
}

async function resolvePlatformTrustPackageEntries(args: {
  ctx: QueryCtx;
  organizationId: Id<"organizations">;
  evidenceObjects: Doc<"objects">[];
}): Promise<CompliancePlatformTrustPackageEntry[]> {
  const rows = args.evidenceObjects
    .map(mapEvidenceObjectToRow)
    .filter((row) =>
      isPlatformTrustPackageEvidenceRowVisible({
        row,
        organizationId: args.organizationId,
      }),
    )
    .sort((left, right) => {
      if (left.updatedAt !== right.updatedAt) {
        return right.updatedAt - left.updatedAt;
      }
      return left.title.localeCompare(right.title);
    });

  const entries = await Promise.all(
    rows.map(async (row): Promise<CompliancePlatformTrustPackageEntry> => {
      const riskIds = Array.from(
        new Set(row.riskReferences.map((reference) => reference.riskId)),
      ).sort((left, right) => left.localeCompare(right));
      const mediaId = row.integrity?.mediaId;
      let downloadUrl: string | null = null;
      let downloadStatus: CompliancePlatformTrustPackageDownloadStatus =
        "missing_integrity_media";

      if (mediaId) {
        const media = await args.ctx.db.get(mediaId as Id<"organizationMedia">);
        if (!media) {
          downloadStatus = "media_record_missing";
        } else if (!media.storageId) {
          downloadStatus = "storage_unavailable";
        } else {
          const resolvedUrl = await args.ctx.storage.getUrl(media.storageId);
          if (resolvedUrl) {
            downloadUrl = resolvedUrl;
            downloadStatus = "ready";
          } else {
            downloadStatus = "url_generation_failed";
          }
        }
      }

      return {
        evidenceObjectId: String(row.evidenceObjectId),
        title: row.title,
        sourceOrganizationId: String(row.organizationId),
        subtype: row.subtype,
        sourceType: row.sourceType,
        inheritanceScope: row.inheritanceScope,
        lifecycleStatus: row.lifecycleStatus,
        updatedAt: row.updatedAt,
        nextReviewAt: row.nextReviewAt,
        retentionDeleteAt: row.retentionDeleteAt,
        riskIds,
        checksumSha256: row.integrity?.checksumSha256 ?? null,
        downloadUrl,
        downloadStatus,
      };
    }),
  );

  return entries;
}

function buildEvidenceResolutionKey(args: {
  objectId: Id<"objects">;
  subtype: string | null;
  providerName: string | null;
  riskReferences: string[];
  inheritedFromEvidenceObjectId: string | null;
  inheritanceScope: string | null;
  supersedesEvidenceObjectId: string | null;
}): string {
  if (args.inheritedFromEvidenceObjectId) {
    return `origin:${args.inheritedFromEvidenceObjectId}`;
  }
  if (args.inheritanceScope === "platform_shared") {
    return `origin:${String(args.objectId)}`;
  }
  if (args.supersedesEvidenceObjectId) {
    return `origin:${args.supersedesEvidenceObjectId}`;
  }

  const subtype = args.subtype ?? "unknown_subtype";
  const provider = args.providerName ?? "";
  const riskSignature = args.riskReferences.join("|");
  return `local:${subtype}:${riskSignature}:${provider}`;
}

function computeEvidenceResolutionSummaryForOrganization(args: {
  organizationId: Id<"organizations">;
  evidenceObjects: Array<{
    _id: Id<"objects">;
    organizationId: Id<"organizations">;
    subtype?: string;
    status: string;
    customProperties?: Record<string, unknown>;
    updatedAt: number;
  }>;
}) {
  const organizationKey = String(args.organizationId);
  const resolved = new Map<
    string,
    { marker: "platform_shared" | "org_inherited" | "org_local"; precedence: 1 | 2 | 3; updatedAt: number }
  >();
  let hidden = 0;

  for (const evidenceObject of args.evidenceObjects) {
    const props = asRecord(evidenceObject.customProperties);
    const lifecycleStatus = normalizeString(evidenceObject.status);
    if (
      lifecycleStatus === "superseded"
      || lifecycleStatus === "deprecated"
      || normalizeString(props.supersededByEvidenceObjectId)
    ) {
      continue;
    }

    const inheritanceScope = normalizeString(props.inheritanceScope);
    const sourceType = normalizeString(props.sourceType);
    const scope = normalizePlatformShareScope(props.platformShareScope);
    const scopeOrgIds = new Set(normalizeStringList(props.platformShareOrganizationIds));
    const isPlatformSharedVisible =
      inheritanceScope === "platform_shared"
      && props.inheritanceEligible === true
      && lifecycleStatus === "active"
      && (
        scope === "fleet_all_orgs"
          ? true
          : scope === "org_allowlist"
            ? scopeOrgIds.has(organizationKey)
            : !scopeOrgIds.has(organizationKey)
      );
    const isOrgScoped = String(evidenceObject.organizationId) === organizationKey;

    if (!isOrgScoped && !isPlatformSharedVisible) {
      continue;
    }

    const marker: "platform_shared" | "org_inherited" | "org_local" =
      !isOrgScoped
        ? "platform_shared"
        : sourceType === "platform_inherited" || inheritanceScope === "org_inherited"
          ? "org_inherited"
          : "org_local";
    const precedence: 1 | 2 | 3 =
      marker === "platform_shared" ? 1 : marker === "org_inherited" ? 2 : 3;
    const riskReferences = Array.isArray(props.riskReferences)
      ? props.riskReferences
          .map((entry) => asRecord(entry))
          .map((entry) => `${normalizeString(entry.riskId) ?? "unknown"}:${normalizeString(entry.controlId) ?? ""}`)
          .sort((left, right) => left.localeCompare(right))
      : [];
    const key = buildEvidenceResolutionKey({
      objectId: evidenceObject._id,
      subtype: normalizeString(evidenceObject.subtype) ?? null,
      providerName: normalizeString(props.providerName) ?? null,
      riskReferences,
      inheritedFromEvidenceObjectId: normalizeString(props.inheritedFromEvidenceObjectId) ?? null,
      inheritanceScope: inheritanceScope ?? null,
      supersedesEvidenceObjectId: normalizeString(props.supersedesEvidenceObjectId) ?? null,
    });

    const current = resolved.get(key);
    if (!current) {
      resolved.set(key, {
        marker,
        precedence,
        updatedAt: evidenceObject.updatedAt,
      });
      continue;
    }

    const shouldReplace =
      precedence > current.precedence
      || (precedence === current.precedence && evidenceObject.updatedAt > current.updatedAt);
    if (shouldReplace) {
      resolved.set(key, {
        marker,
        precedence,
        updatedAt: evidenceObject.updatedAt,
      });
      hidden += 1;
    } else {
      hidden += 1;
    }
  }

  let orgLocal = 0;
  let orgInherited = 0;
  let platformShared = 0;
  for (const row of resolved.values()) {
    if (row.marker === "org_local") {
      orgLocal += 1;
    } else if (row.marker === "org_inherited") {
      orgInherited += 1;
    } else {
      platformShared += 1;
    }
  }

  return {
    resolvedCount: resolved.size,
    hiddenCount: hidden,
    orgLocalCount: orgLocal,
    orgInheritedCount: orgInherited,
    platformSharedCount: platformShared,
  };
}

function normalizeEvidence(value: unknown): RiskEvidence[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: RiskEvidence[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    const label = normalizeString(record.label);
    const id = normalizeString(record.id) ?? `evidence_${normalized.length + 1}`;
    const addedBy = normalizeString(record.addedBy) ?? "unknown";
    const rawAddedAt = record.addedAt;
    const addedAt = typeof rawAddedAt === "number" && Number.isFinite(rawAddedAt) ? rawAddedAt : 0;

    if (!label) {
      continue;
    }

    normalized.push({
      id,
      label,
      url: normalizeString(record.url),
      notes: normalizeString(record.notes),
      addedAt,
      addedBy,
    });
  }

  return normalized.sort((left, right) => left.addedAt - right.addedAt);
}

export function hasOrgOwnerDecisionAuthority(args: {
  isOrgOwner: boolean;
  isSuperAdmin: boolean;
  isPlatformOrg: boolean;
}): boolean {
  if (args.isSuperAdmin) {
    return args.isPlatformOrg === true;
  }
  return args.isOrgOwner;
}

async function resolveOrgAccessContext(
  ctx: QueryCtx | MutationCtx,
  args: {
    sessionId: string;
    organizationId?: Id<"organizations">;
  },
): Promise<OrgAccessContext> {
  const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
  const organizationId = args.organizationId ?? authenticated.organizationId;
  const authority = await getOrganizationAuthorityContext(
    ctx,
    authenticated.userId,
    organizationId,
  );
  const isSuperAdmin = authority.isSuperAdmin;
  const platformOrgId = resolvePlatformOrgIdFromEnv();
  const isPlatformOrg = Boolean(
    platformOrgId
    && String(platformOrgId) === String(organizationId),
  );

  // Super-admin may inspect any org; mutation authority is evaluated separately.
  if (!isSuperAdmin && authenticated.organizationId !== organizationId) {
    throw new Error("Cross-organization access is not allowed for this session.");
  }

  return {
    organizationId,
    userId: authenticated.userId,
    isSuperAdmin,
    isOrgOwner: authority.isOrgOwner,
    isPlatformOrg,
  };
}

function buildRiskRow(
  template: RiskTemplate,
  existing: {
    _id: Id<"objects">;
    status: string;
    customProperties?: Record<string, unknown>;
    updatedAt: number;
    createdAt: number;
  } | null,
) {
  const existingProps = asRecord(existing?.customProperties);
  const evidence = normalizeEvidence(existingProps.evidence);
  const status = normalizeRiskStatus(existing?.status);
  const decisionStatus = normalizeDecisionStatus(existingProps.decisionStatus);
  const notes = normalizeString(existingProps.notes) ?? "";
  const blocker = !(status === "closed" && decisionStatus === "freigegeben");
  const lastUpdatedAt = typeof existing?.updatedAt === "number" ? existing.updatedAt : null;

  return {
    riskId: template.riskId,
    title: template.title,
    severity: template.severity,
    owner: template.owner,
    description: template.description,
    status,
    decisionStatus,
    notes,
    blocker,
    evidence,
    evidenceCount: evidence.length,
    objectId: existing?._id ?? null,
    lastUpdatedAt,
    createdAt: typeof existing?.createdAt === "number" ? existing.createdAt : null,
  };
}

async function readRiskRowsForOrganization(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
) {
  const riskObjects = await ctx.db
    .query("objects")
    .withIndex("by_org_type_subtype", (q) =>
      q.eq("organizationId", organizationId)
        .eq("type", COMPLIANCE_RELEASE_GATE_TYPE)
        .eq("subtype", COMPLIANCE_RELEASE_GATE_RISK_SUBTYPE),
    )
    .collect();

  const byRiskId = new Map<RiskId, (typeof riskObjects)[number]>();
  for (const riskObject of riskObjects) {
    const riskId = (normalizeString(riskObject.name) ?? "") as RiskId;
    if (RISK_ID_VALUES.includes(riskId)) {
      byRiskId.set(riskId, riskObject);
    }
  }

  const baseRows = RISK_TEMPLATES.map((template) =>
    buildRiskRow(
      template,
      byRiskId.get(template.riskId)
        ? {
            _id: byRiskId.get(template.riskId)!._id,
            status: byRiskId.get(template.riskId)!.status,
            customProperties: asRecord(byRiskId.get(template.riskId)!.customProperties),
            updatedAt: byRiskId.get(template.riskId)!.updatedAt,
            createdAt: byRiskId.get(template.riskId)!.createdAt,
          }
        : null,
    ),
  );

  const [transferWorkflowObjects, securityWorkflowObjects] = await Promise.all([
    ctx.db
      .query("objects")
      .withIndex("by_org_type_subtype", (q) =>
        q.eq("organizationId", organizationId)
          .eq("type", COMPLIANCE_TRANSFER_WORKFLOW_OBJECT_TYPE)
          .eq("subtype", COMPLIANCE_TRANSFER_WORKFLOW_OBJECT_SUBTYPE),
      )
      .collect(),
    ctx.db
      .query("objects")
      .withIndex("by_org_type_subtype", (q) =>
        q.eq("organizationId", organizationId)
          .eq("type", COMPLIANCE_SECURITY_WORKFLOW_OBJECT_TYPE)
          .eq("subtype", COMPLIANCE_SECURITY_WORKFLOW_OBJECT_SUBTYPE),
      )
      .collect(),
  ]);

  const workflowSignals = deriveWorkflowCompletenessSignals({
    transferWorkflowObject: pickLatestObjectByUpdatedAt(transferWorkflowObjects),
    securityWorkflowObject: pickLatestObjectByUpdatedAt(securityWorkflowObjects),
  });

  return applyWorkflowSignalsToRiskRows({
    riskRows: baseRows,
    workflowSignals,
  });
}

async function readAvvOutreachRowsForOrganization(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
): Promise<ComplianceAvvOutreachRow[]> {
  const dossierObjects = await ctx.db
    .query("objects")
    .withIndex("by_org_type_subtype", (q) =>
      q.eq("organizationId", organizationId)
        .eq("type", COMPLIANCE_AVV_OUTREACH_OBJECT_TYPE)
        .eq("subtype", COMPLIANCE_AVV_OUTREACH_OBJECT_SUBTYPE),
    )
    .collect();

  return dossierObjects
    .map(mapAvvOutreachObjectToRow)
    .sort((left, right) => {
      const leftDueAt = left.slaFirstDueAt ?? Number.MAX_SAFE_INTEGER;
      const rightDueAt = right.slaFirstDueAt ?? Number.MAX_SAFE_INTEGER;
      if (leftDueAt !== rightDueAt) {
        return leftDueAt - rightDueAt;
      }
      return (left.providerName ?? "").localeCompare(right.providerName ?? "");
    });
}

async function getOwnerGateObject(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
) {
  const ownerGateObjects = await ctx.db
    .query("objects")
    .withIndex("by_org_type_subtype", (q) =>
      q.eq("organizationId", organizationId)
        .eq("type", COMPLIANCE_RELEASE_GATE_TYPE)
        .eq("subtype", COMPLIANCE_RELEASE_GATE_OWNER_SUBTYPE),
    )
    .collect();

  return (
    ownerGateObjects.find((entry) => entry.name === COMPLIANCE_OWNER_GATE_OBJECT_NAME)
    ?? null
  );
}

async function getComplianceRolloutFlagObject(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
) {
  const rolloutFlagObjects = await ctx.db
    .query("objects")
    .withIndex("by_org_type_subtype", (q) =>
      q.eq("organizationId", organizationId)
        .eq("type", COMPLIANCE_ROLLOUT_FLAG_OBJECT_TYPE)
        .eq("subtype", COMPLIANCE_ROLLOUT_FLAG_OBJECT_SUBTYPE),
    )
    .collect();

  const namedRolloutObjects = rolloutFlagObjects.filter(
    (entry) => entry.name === COMPLIANCE_ROLLOUT_FLAG_OBJECT_NAME,
  );
  return pickLatestObjectByUpdatedAt(namedRolloutObjects);
}

function computeGateSnapshot(args: {
  riskRows: Array<{
    riskId: RiskId;
    status: RiskStatus;
    decisionStatus: RiskDecisionStatus;
    blocker: boolean;
    workflowBlockers?: string[];
    lastUpdatedAt: number | null;
  }>;
  ownerGateObject: {
    status: string;
    customProperties?: Record<string, unknown>;
    updatedAt: number;
  } | null;
}): {
  effectiveGateStatus: ComplianceGateStatus;
  blockerIds: RiskId[];
  blockerCount: number;
  blockers: ComplianceGateBlockerReason[];
  ownerGateDecision: OwnerGateDecision;
  ownerGateNotes: string;
  ownerGateDecidedAt: number | null;
  ownerGateDecidedBy: string | null;
  updatedAt: number | null;
} {
  const blockers = deriveGateBlockersFromRiskRows({
    riskRows: args.riskRows,
  });
  const blockerIds = Array.from(
    new Set(
      blockers
        .map((blocker) => blocker.riskId)
        .sort((left, right) => riskOrderRank(left) - riskOrderRank(right)),
    ),
  );
  const ownerGateDecision = normalizeOwnerGateDecision(args.ownerGateObject?.status);
  const ownerGateProps = asRecord(args.ownerGateObject?.customProperties);
  const ownerGateNotes = normalizeString(ownerGateProps.notes) ?? "";
  const ownerGateDecidedAt =
    typeof ownerGateProps.decidedAt === "number" && Number.isFinite(ownerGateProps.decidedAt)
      ? ownerGateProps.decidedAt
      : null;
  const ownerGateDecidedBy = normalizeString(ownerGateProps.decidedBy) ?? null;
  const effectiveGateStatus: ComplianceGateStatus =
    blockerIds.length === 0 && ownerGateDecision === "GO" ? "GO" : "NO_GO";

  const latestRiskUpdate = args.riskRows.reduce<number | null>((latest, row) => {
    if (typeof row.lastUpdatedAt !== "number") {
      return latest;
    }
    if (latest === null || row.lastUpdatedAt > latest) {
      return row.lastUpdatedAt;
    }
    return latest;
  }, null);

  return {
    effectiveGateStatus,
    blockerIds,
    blockerCount: blockerIds.length,
    blockers,
    ownerGateDecision,
    ownerGateNotes,
    ownerGateDecidedAt,
    ownerGateDecidedBy,
    updatedAt:
      args.ownerGateObject?.updatedAt && latestRiskUpdate
        ? Math.max(args.ownerGateObject.updatedAt, latestRiskUpdate)
        : args.ownerGateObject?.updatedAt ?? latestRiskUpdate,
  };
}

function readGateTransitionTelemetry(args: {
  ownerGateObject: {
    customProperties?: Record<string, unknown>;
  } | null;
}): ComplianceGateTransitionTelemetry | null {
  const props = asRecord(args.ownerGateObject?.customProperties);
  const occurredAtRaw = props.lastGateTransitionAt;
  const occurredAt =
    typeof occurredAtRaw === "number" && Number.isFinite(occurredAtRaw) ? occurredAtRaw : null;
  const fromEffectiveGateStatus = normalizeGateStatus(props.lastGateTransitionFromEffectiveStatus);
  const toEffectiveGateStatus = normalizeGateStatus(props.lastGateTransitionToEffectiveStatus);
  const fromOwnerGateDecision = normalizeOwnerGateDecision(props.lastGateTransitionFromDecision);
  const toOwnerGateDecision = normalizeOwnerGateDecision(props.lastGateTransitionToDecision);

  if (!occurredAt || !fromEffectiveGateStatus || !toEffectiveGateStatus) {
    return null;
  }

  return {
    occurredAt,
    fromEffectiveGateStatus,
    toEffectiveGateStatus,
    fromOwnerGateDecision,
    toOwnerGateDecision,
  };
}

function riskIdsFromEvidenceRows(rows: ResolvedComplianceEvidenceRow[]): RiskId[] {
  const ids = new Set<RiskId>();
  for (const row of rows) {
    for (const reference of row.riskReferences) {
      if (RISK_ID_VALUES.includes(reference.riskId)) {
        ids.add(reference.riskId);
      }
    }
  }
  return Array.from(ids).sort((left, right) => riskOrderRank(left) - riskOrderRank(right));
}

function isOutreachTerminalState(state: ComplianceAvvOutreachRow["state"]): boolean {
  return state === "approved" || state === "rejected" || state === "closed_blocked";
}

function alertSeverityRank(severity: ComplianceOperationalAlertSeverity): number {
  if (severity === "critical") {
    return 0;
  }
  if (severity === "warning") {
    return 1;
  }
  return 2;
}

export function buildComplianceOperationalTelemetry(args: {
  now: number;
  gate: {
    effectiveGateStatus: ComplianceGateStatus;
    ownerGateDecision: OwnerGateDecision;
    blockerCount: number;
    blockerIds: RiskId[];
  };
  gateTransition?: ComplianceGateTransitionTelemetry | null;
  avvOutreachRows: ComplianceAvvOutreachRow[];
  resolvedEvidenceRows: ResolvedComplianceEvidenceRow[];
  outreachStallThresholdMs?: number;
  evidenceAlertWindowMs?: number;
}): ComplianceOperationalTelemetry {
  const now = args.now;
  const outreachStallThresholdMs =
    typeof args.outreachStallThresholdMs === "number" && Number.isFinite(args.outreachStallThresholdMs)
      ? args.outreachStallThresholdMs
      : COMPLIANCE_OUTREACH_STALL_THRESHOLD_MS;
  const evidenceAlertWindowMs =
    typeof args.evidenceAlertWindowMs === "number" && Number.isFinite(args.evidenceAlertWindowMs)
      ? args.evidenceAlertWindowMs
      : COMPLIANCE_EVIDENCE_ALERT_WINDOW_MS;

  const outreachSummary = summarizeAvvOutreachRows({
    rows: args.avvOutreachRows,
    now,
  });
  const stalledOutreachRows = args.avvOutreachRows.filter((row) => {
    if (!row.contractValid || isOutreachTerminalState(row.state)) {
      return false;
    }
    const lastActivityCandidates = [
      row.lastContactedAt,
      row.slaReminderAt,
      row.slaFirstDueAt,
      row.createdAt,
    ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (lastActivityCandidates.length === 0) {
      return true;
    }
    const lastActivityAt = Math.max(...lastActivityCandidates);
    return now - lastActivityAt >= outreachStallThresholdMs;
  });
  const stalledDossierObjectIds = stalledOutreachRows
    .map((row) => String(row.dossierObjectId))
    .sort((left, right) => left.localeCompare(right));

  const activeEvidenceRows = args.resolvedEvidenceRows.filter(
    (row) => row.lifecycleStatus === "active",
  );
  const invalidEvidenceRows: ResolvedComplianceEvidenceRow[] = [];
  const reviewDueSoonRows: ResolvedComplianceEvidenceRow[] = [];
  const reviewOverdueRows: ResolvedComplianceEvidenceRow[] = [];
  const retentionExpiringSoonRows: ResolvedComplianceEvidenceRow[] = [];
  const retentionExpiredRows: ResolvedComplianceEvidenceRow[] = [];

  for (const row of activeEvidenceRows) {
    if (!row.contractValid) {
      invalidEvidenceRows.push(row);
      continue;
    }

    const nextReviewAt =
      typeof row.nextReviewAt === "number" && Number.isFinite(row.nextReviewAt)
        ? row.nextReviewAt
        : null;
    const retentionDeleteAt =
      typeof row.retentionDeleteAt === "number" && Number.isFinite(row.retentionDeleteAt)
        ? row.retentionDeleteAt
        : null;

    if (nextReviewAt === null || retentionDeleteAt === null) {
      invalidEvidenceRows.push(row);
      continue;
    }

    if (nextReviewAt <= now) {
      reviewOverdueRows.push(row);
    } else if (nextReviewAt <= now + evidenceAlertWindowMs) {
      reviewDueSoonRows.push(row);
    }

    if (retentionDeleteAt <= now) {
      retentionExpiredRows.push(row);
    } else if (retentionDeleteAt <= now + evidenceAlertWindowMs) {
      retentionExpiringSoonRows.push(row);
    }
  }

  const alerts: ComplianceOperationalAlert[] = [];
  const addAlert = (alert: ComplianceOperationalAlert) => {
    if (alert.count <= 0) {
      return;
    }
    alerts.push({
      ...alert,
      riskIds: [...alert.riskIds].sort((left, right) => riskOrderRank(left) - riskOrderRank(right)),
      references: [...alert.references].sort((left, right) => left.localeCompare(right)),
    });
  };

  if (args.gateTransition) {
    addAlert({
      code: "gate_transition",
      severity: args.gateTransition.toEffectiveGateStatus === "NO_GO" ? "critical" : "info",
      message: `Gate transitioned ${args.gateTransition.fromEffectiveGateStatus} -> ${args.gateTransition.toEffectiveGateStatus}.`,
      riskIds: [...args.gate.blockerIds],
      count: 1,
      references: [String(args.gateTransition.occurredAt)],
    });
  }

  addAlert({
    code: "outreach_stalled",
    severity: outreachSummary.overdueCount > 0 ? "critical" : "warning",
    message:
      stalledOutreachRows.length > 0
        ? `Detected ${stalledOutreachRows.length} stalled AVV outreach dossier(s).`
        : "",
    riskIds: stalledOutreachRows.length > 0 ? ["R-002"] : [],
    count: stalledOutreachRows.length,
    references: stalledDossierObjectIds,
  });

  addAlert({
    code: "evidence_review_due_soon",
    severity: "warning",
    message:
      reviewDueSoonRows.length > 0
        ? `Detected ${reviewDueSoonRows.length} evidence review deadline(s) within alert window.`
        : "",
    riskIds: riskIdsFromEvidenceRows(reviewDueSoonRows),
    count: reviewDueSoonRows.length,
    references: reviewDueSoonRows.map((row) => String(row.evidenceObjectId)),
  });
  addAlert({
    code: "evidence_review_overdue",
    severity: "critical",
    message:
      reviewOverdueRows.length > 0
        ? `Detected ${reviewOverdueRows.length} overdue evidence review deadline(s).`
        : "",
    riskIds: riskIdsFromEvidenceRows(reviewOverdueRows),
    count: reviewOverdueRows.length,
    references: reviewOverdueRows.map((row) => String(row.evidenceObjectId)),
  });
  addAlert({
    code: "evidence_retention_expiring_soon",
    severity: "warning",
    message:
      retentionExpiringSoonRows.length > 0
        ? `Detected ${retentionExpiringSoonRows.length} evidence retention deadline(s) within alert window.`
        : "",
    riskIds: riskIdsFromEvidenceRows(retentionExpiringSoonRows),
    count: retentionExpiringSoonRows.length,
    references: retentionExpiringSoonRows.map((row) => String(row.evidenceObjectId)),
  });
  addAlert({
    code: "evidence_retention_expired",
    severity: "critical",
    message:
      retentionExpiredRows.length > 0
        ? `Detected ${retentionExpiredRows.length} evidence record(s) past retention deletion date.`
        : "",
    riskIds: riskIdsFromEvidenceRows(retentionExpiredRows),
    count: retentionExpiredRows.length,
    references: retentionExpiredRows.map((row) => String(row.evidenceObjectId)),
  });
  addAlert({
    code: "invalid_evidence_metadata",
    severity: "critical",
    message:
      invalidEvidenceRows.length > 0
        ? `Detected ${invalidEvidenceRows.length} active evidence item(s) with invalid metadata contract.`
        : "",
    riskIds: riskIdsFromEvidenceRows(invalidEvidenceRows),
    count: invalidEvidenceRows.length,
    references: invalidEvidenceRows.map((row) => String(row.evidenceObjectId)),
  });

  const orderedAlerts = [...alerts].sort((left, right) => {
    const severityDelta = alertSeverityRank(left.severity) - alertSeverityRank(right.severity);
    if (severityDelta !== 0) {
      return severityDelta;
    }
    return left.code.localeCompare(right.code);
  });

  const summary = {
    totalAlerts: orderedAlerts.length,
    criticalAlerts: orderedAlerts.filter((alert) => alert.severity === "critical").length,
    warningAlerts: orderedAlerts.filter((alert) => alert.severity === "warning").length,
    infoAlerts: orderedAlerts.filter((alert) => alert.severity === "info").length,
  };

  return {
    contractVersion: COMPLIANCE_OPERATIONAL_TELEMETRY_CONTRACT_VERSION,
    generatedAt: now,
    failClosed: args.gate.effectiveGateStatus !== "GO" || summary.criticalAlerts > 0,
    gate: {
      effectiveGateStatus: args.gate.effectiveGateStatus,
      ownerGateDecision: args.gate.ownerGateDecision,
      blockerCount: args.gate.blockerCount,
      blockerIds: [...args.gate.blockerIds],
      lastTransition: args.gateTransition ?? null,
    },
    outreach: {
      total: outreachSummary.total,
      openCount: outreachSummary.openCount,
      overdueCount: outreachSummary.overdueCount,
      invalidCount: outreachSummary.invalidCount,
      stalledCount: stalledOutreachRows.length,
      stalledDossierObjectIds,
      nextDueAt: outreachSummary.nextDueAt,
    },
    evidence: {
      activeCount: activeEvidenceRows.length,
      invalidCount: invalidEvidenceRows.length,
      reviewDueSoonCount: reviewDueSoonRows.length,
      reviewOverdueCount: reviewOverdueRows.length,
      retentionExpiringSoonCount: retentionExpiringSoonRows.length,
      retentionExpiredCount: retentionExpiredRows.length,
    },
    alerts: orderedAlerts,
    summary,
  };
}

async function ensureRiskObject(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    userId: Id<"users">;
    riskId: RiskId;
  },
) {
  const existingRows = await ctx.db
    .query("objects")
    .withIndex("by_org_type_subtype", (q) =>
      q.eq("organizationId", args.organizationId)
        .eq("type", COMPLIANCE_RELEASE_GATE_TYPE)
        .eq("subtype", COMPLIANCE_RELEASE_GATE_RISK_SUBTYPE),
    )
    .collect();

  const existing = existingRows.find((entry) => entry.name === args.riskId);
  if (existing) {
    return existing;
  }

  const template = RISK_TEMPLATES.find((entry) => entry.riskId === args.riskId);
  if (!template) {
    throw new Error(`Unknown risk id: ${args.riskId}`);
  }

  const now = Date.now();
  const riskObjectId = await ctx.db.insert("objects", {
    organizationId: args.organizationId,
    type: COMPLIANCE_RELEASE_GATE_TYPE,
    subtype: COMPLIANCE_RELEASE_GATE_RISK_SUBTYPE,
    name: template.riskId,
    description: template.description,
    status: "open",
    customProperties: compactRecord({
      riskId: template.riskId,
      title: template.title,
      severity: template.severity,
      owner: template.owner,
      decisionStatus: "open",
      notes: "",
      evidence: [],
      lastUpdatedBy: String(args.userId),
      lastUpdatedAt: now,
    }),
    createdBy: args.userId,
    createdAt: now,
    updatedAt: now,
  });

  return (await ctx.db.get(riskObjectId))!;
}

async function ensureOwnerGateObject(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    userId: Id<"users">;
  },
) {
  const existing = await getOwnerGateObject(ctx, args.organizationId);
  if (existing) {
    return existing;
  }

  const now = Date.now();
  const objectId = await ctx.db.insert("objects", {
    organizationId: args.organizationId,
    type: COMPLIANCE_RELEASE_GATE_TYPE,
    subtype: COMPLIANCE_RELEASE_GATE_OWNER_SUBTYPE,
    name: COMPLIANCE_OWNER_GATE_OBJECT_NAME,
    description: "Owner-managed release gate decision",
    status: "NO_GO",
    customProperties: compactRecord({
      decidedBy: String(args.userId),
      decidedAt: now,
      notes: "Fail-closed default",
    }),
    createdBy: args.userId,
    createdAt: now,
    updatedAt: now,
  });

  return (await ctx.db.get(objectId))!;
}

export const getComplianceScopeContext = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
    const organization = await ctx.db.get(authenticated.organizationId);
    const userContext = await getUserContext(
      ctx,
      authenticated.userId,
      authenticated.organizationId,
    );
    const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";

    const platformOrganizationId = resolvePlatformOrgIdFromEnv();
    const platformOrganization = platformOrganizationId
      ? await ctx.db.get(platformOrganizationId)
      : null;

    const platformModeAvailabilityReason =
      !isSuperAdmin
        ? "not_super_admin"
        : !platformOrganizationId
          ? "platform_org_not_configured"
          : !platformOrganization || platformOrganization.isActive === false
            ? "platform_org_unavailable"
            : "available";
    const platformModeAvailable =
      platformModeAvailabilityReason === "available";
    const platformModeActive = Boolean(
      platformModeAvailable
      && platformOrganization
      && String(platformOrganization._id) === String(authenticated.organizationId),
    );

    return {
      currentOrganizationId: authenticated.organizationId,
      currentOrganizationName: organization?.name ?? null,
      isSuperAdmin,
      platformOrganizationId: platformOrganization?._id ?? null,
      platformOrganizationName: platformOrganization?.name ?? null,
      platformModeAvailable,
      platformModeAvailabilityReason,
      platformModeActive,
    };
  },
});

export const getOrgComplianceGate = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    if (!accessContext.isOrgOwner && !accessContext.isSuperAdmin) {
      throw new Error("Only organization owners or super admins can access release workflow optics.");
    }

    const organization = await ctx.db.get(accessContext.organizationId);
    if (!organization) {
      throw new Error("Organization not found.");
    }

    const riskRows = await readRiskRowsForOrganization(ctx, accessContext.organizationId);
    const ownerGateObject = await getOwnerGateObject(ctx, accessContext.organizationId);
    const gateSnapshot = computeGateSnapshot({ riskRows, ownerGateObject });
    const now = Date.now();
    const avvOutreachRows = await readAvvOutreachRowsForOrganization(ctx, accessContext.organizationId);
    const avvOutreachSummary = summarizeAvvOutreachRows({
      rows: avvOutreachRows,
      now,
    });
    const evidenceObjects = (await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", COMPLIANCE_EVIDENCE_OBJECT_TYPE))
      .collect()) as Doc<"objects">[];
    const evidenceContext = buildEvidenceResolutionContextForOrganization({
      organizationId: accessContext.organizationId,
      evidenceObjects,
    });
    const platformSharedEvidence = computePlatformSharedEvidenceSummaryForOrganization({
      organizationId: accessContext.organizationId,
      evidenceObjects,
    });
    const evidenceResolution = computeEvidenceResolutionSummaryForOrganization({
      organizationId: accessContext.organizationId,
      evidenceObjects,
    });
    const operationalTelemetry = buildComplianceOperationalTelemetry({
      now,
      gate: {
        effectiveGateStatus: gateSnapshot.effectiveGateStatus,
        ownerGateDecision: gateSnapshot.ownerGateDecision,
        blockerCount: gateSnapshot.blockerCount,
        blockerIds: gateSnapshot.blockerIds,
      },
      gateTransition: readGateTransitionTelemetry({
        ownerGateObject,
      }),
      avvOutreachRows,
      resolvedEvidenceRows: evidenceContext.resolvedRows,
    });

    return {
      organizationId: accessContext.organizationId,
      organizationName: organization.name,
      isOrgOwner: accessContext.isOrgOwner,
      isSuperAdmin: accessContext.isSuperAdmin,
      canEdit: hasOrgOwnerDecisionAuthority(accessContext),
      risks: riskRows,
      gate: gateSnapshot,
      avvOutreach: {
        rows: avvOutreachRows,
        summary: avvOutreachSummary,
      },
      platformSharedEvidence,
      evidenceResolution,
      operationalTelemetry,
    };
  },
});

export const getComplianceMigrationRolloutPackage = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args): Promise<ComplianceMigrationRolloutPackage> => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    if (!accessContext.isOrgOwner && !accessContext.isSuperAdmin) {
      throw new Error(
        "Only organization owners or super admins can access compliance migration rollout package.",
      );
    }

    const organization = await ctx.db.get(accessContext.organizationId);
    if (!organization) {
      throw new Error("Organization not found.");
    }

    const now = Date.now();
    const riskRows = await readRiskRowsForOrganization(ctx, accessContext.organizationId);
    const ownerGateObject = await getOwnerGateObject(ctx, accessContext.organizationId);
    const gateSnapshot = computeGateSnapshot({ riskRows, ownerGateObject });
    const avvOutreachRows = await readAvvOutreachRowsForOrganization(
      ctx,
      accessContext.organizationId,
    );
    const evidenceObjects = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", COMPLIANCE_EVIDENCE_OBJECT_TYPE))
      .collect();
    const evidenceContext = buildEvidenceResolutionContextForOrganization({
      organizationId: accessContext.organizationId,
      evidenceObjects,
    });
    const operationalTelemetry = buildComplianceOperationalTelemetry({
      now,
      gate: {
        effectiveGateStatus: gateSnapshot.effectiveGateStatus,
        ownerGateDecision: gateSnapshot.ownerGateDecision,
        blockerCount: gateSnapshot.blockerCount,
        blockerIds: gateSnapshot.blockerIds,
      },
      gateTransition: readGateTransitionTelemetry({
        ownerGateObject,
      }),
      avvOutreachRows,
      resolvedEvidenceRows: evidenceContext.resolvedRows,
    });
    const rolloutFlagObject = await getComplianceRolloutFlagObject(
      ctx,
      accessContext.organizationId,
    );
    const rolloutFlags = resolveComplianceMigrationRolloutFlagsFromCustomProperties(
      rolloutFlagObject?.customProperties,
    );

    return {
      contractVersion: COMPLIANCE_MIGRATION_ROLLOUT_CONTRACT_VERSION,
      generatedAt: now,
      organizationId: accessContext.organizationId,
      organizationName: organization.name,
      isOrgOwner: accessContext.isOrgOwner,
      isSuperAdmin: accessContext.isSuperAdmin,
      canEdit: hasOrgOwnerDecisionAuthority(accessContext),
      rolloutFlags,
      runbooks: COMPLIANCE_ROLLOUT_RUNBOOKS.map((runbook) => ({
        runbookId: runbook.runbookId,
        title: runbook.title,
        path: runbook.path,
      })),
      telemetryDashboard: {
        operationalTelemetryContractVersion:
          COMPLIANCE_OPERATIONAL_TELEMETRY_CONTRACT_VERSION,
        effectiveGateStatus: operationalTelemetry.gate.effectiveGateStatus,
        blockerCount: operationalTelemetry.gate.blockerCount,
        criticalAlertCount: operationalTelemetry.summary.criticalAlerts,
        warningAlertCount: operationalTelemetry.summary.warningAlerts,
        infoAlertCount: operationalTelemetry.summary.infoAlerts,
        outreachStalledCount: operationalTelemetry.outreach.stalledCount,
        invalidEvidenceCount: operationalTelemetry.evidence.invalidCount,
        reviewOverdueCount: operationalTelemetry.evidence.reviewOverdueCount,
        retentionExpiredCount: operationalTelemetry.evidence.retentionExpiredCount,
        lastGateTransitionAt: operationalTelemetry.gate.lastTransition?.occurredAt ?? null,
      },
      readiness: {
        telemetryReady: rolloutFlags.telemetryDashboardsEnabled,
        runbooksReady: rolloutFlags.runbooksEnabled,
        contextLabelsReady: rolloutFlags.contextLabelEnforcementEnabled,
        shadowModeReady: rolloutFlags.shadowModeEvaluatorEnabled,
        strictEnforcementReady:
          rolloutFlags.strictEnforcementEnabled
          && operationalTelemetry.summary.criticalAlerts === 0
          && operationalTelemetry.gate.effectiveGateStatus === "GO",
      },
      verificationCommands: [
        "npm run docs:guard",
        "npm run typecheck",
      ],
    };
  },
});

export const getCompliancePlatformTrustPackage = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args): Promise<CompliancePlatformTrustPackage> => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    if (!accessContext.isOrgOwner && !accessContext.isSuperAdmin) {
      throw new Error(
        "Only organization owners or super admins can access the platform trust package.",
      );
    }

    const evidenceObjects = (await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", COMPLIANCE_EVIDENCE_OBJECT_TYPE))
      .collect()) as Doc<"objects">[];
    const entries = await resolvePlatformTrustPackageEntries({
      ctx,
      organizationId: accessContext.organizationId,
      evidenceObjects,
    });
    const latestUpdatedAt = entries.reduce<number | null>((current, entry) => {
      if (current === null) {
        return entry.updatedAt;
      }
      return entry.updatedAt > current ? entry.updatedAt : current;
    }, null);
    const sourceOrganizationCount = new Set(
      entries.map((entry) => entry.sourceOrganizationId),
    ).size;
    const packageVersion = buildPlatformTrustPackageVersion({
      latestUpdatedAt,
      totalEntries: entries.length,
      sourceOrganizationCount,
    });

    return {
      contractVersion: COMPLIANCE_PLATFORM_TRUST_PACKAGE_CONTRACT_VERSION,
      generatedAt: Date.now(),
      organizationId: accessContext.organizationId,
      packageVersion,
      advisoryOnly: true,
      totalEntries: entries.length,
      sourceOrganizationCount,
      latestUpdatedAt,
      entries,
    };
  },
});

export const evaluateNonComplianceSurfaceShadowModeInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    surface: complianceShadowModeSurfaceValidator,
  },
  handler: async (ctx, args): Promise<ComplianceShadowModeEvaluationResult> => {
    const now = Date.now();
    const riskRows = await readRiskRowsForOrganization(ctx, args.organizationId);
    const ownerGateObject = await getOwnerGateObject(ctx, args.organizationId);
    const gateSnapshot = computeGateSnapshot({ riskRows, ownerGateObject });
    const rolloutFlagObject = await getComplianceRolloutFlagObject(
      ctx,
      args.organizationId,
    );
    const rolloutFlags = resolveComplianceMigrationRolloutFlagsFromCustomProperties(
      rolloutFlagObject?.customProperties,
    );

    return resolveComplianceShadowModeEvaluation({
      surface: normalizeComplianceShadowModeSurface(args.surface),
      rolloutFlags,
      effectiveGateStatus: gateSnapshot.effectiveGateStatus,
      blockerCount: gateSnapshot.blockerCount,
      blockerIds: gateSnapshot.blockerIds,
      evaluatedAt: now,
    });
  },
});

export const recordNonComplianceShadowModeTelemetryInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.optional(v.id("agentSessions")),
    turnId: v.optional(v.id("agentTurns")),
    channel: v.string(),
    surface: complianceShadowModeSurfaceValidator,
    evaluationStatus: complianceShadowModeEvaluationStatusValidator,
    wouldBlock: v.boolean(),
    reasonCode: v.string(),
    blockerCount: v.number(),
    blockerIds: v.array(v.string()),
    evaluatorEnabled: v.boolean(),
    surfaceEnabled: v.boolean(),
    strictEnforcementEnabled: v.boolean(),
    metadata: v.optional(v.any()),
    occurredAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const occurredAt =
      typeof args.occurredAt === "number" && Number.isFinite(args.occurredAt)
        ? args.occurredAt
        : Date.now();
    const metadataPayload = args.metadata && typeof args.metadata === "object"
      ? (args.metadata as Record<string, unknown>)
      : {};
    const action = args.wouldBlock
      ? "compliance_shadow_mode_would_block"
      : "compliance_shadow_mode_evaluated";

    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      action,
      resource: "compliance_shadow_mode_evaluator",
      resourceId: args.sessionId ? String(args.sessionId) : undefined,
      success: true,
      metadata: {
        contractVersion: COMPLIANCE_SHADOW_MODE_EVALUATOR_CONTRACT_VERSION,
        surface: args.surface,
        channel: args.channel,
        evaluationStatus: args.evaluationStatus,
        wouldBlock: args.wouldBlock,
        reasonCode: args.reasonCode,
        blockerCount: Math.max(0, Math.floor(args.blockerCount)),
        blockerIds: args.blockerIds,
        evaluatorEnabled: args.evaluatorEnabled,
        surfaceEnabled: args.surfaceEnabled,
        strictEnforcementEnabled: args.strictEnforcementEnabled,
        sessionId: args.sessionId ? String(args.sessionId) : undefined,
        turnId: args.turnId ? String(args.turnId) : undefined,
        ...metadataPayload,
      },
      createdAt: occurredAt,
    });

    return {
      recorded: true,
      action,
      occurredAt,
    };
  },
});

export const evaluateOrgComplianceGate = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    if (!accessContext.isOrgOwner && !accessContext.isSuperAdmin) {
      throw new Error("Only organization owners or super admins can evaluate compliance gate posture.");
    }

    const riskRows = await readRiskRowsForOrganization(ctx, accessContext.organizationId);
    const ownerGateObject = await getOwnerGateObject(ctx, accessContext.organizationId);
    const gateSnapshot = computeGateSnapshot({ riskRows, ownerGateObject });
    const now = Date.now();
    const avvOutreachRows = await readAvvOutreachRowsForOrganization(ctx, accessContext.organizationId);
    const evidenceObjects = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", COMPLIANCE_EVIDENCE_OBJECT_TYPE))
      .collect();
    const evidenceContext = buildEvidenceResolutionContextForOrganization({
      organizationId: accessContext.organizationId,
      evidenceObjects,
    });
    const operationalTelemetry = buildComplianceOperationalTelemetry({
      now,
      gate: {
        effectiveGateStatus: gateSnapshot.effectiveGateStatus,
        ownerGateDecision: gateSnapshot.ownerGateDecision,
        blockerCount: gateSnapshot.blockerCount,
        blockerIds: gateSnapshot.blockerIds,
      },
      gateTransition: readGateTransitionTelemetry({
        ownerGateObject,
      }),
      avvOutreachRows,
      resolvedEvidenceRows: evidenceContext.resolvedRows,
    });

    return {
      organizationId: accessContext.organizationId,
      riskRows,
      gate: gateSnapshot,
      evaluatedAt: now,
      failClosed: gateSnapshot.effectiveGateStatus !== "GO",
      operationalTelemetry,
    };
  },
});

export const getComplianceInboxPlanner = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    if (!accessContext.isOrgOwner && !accessContext.isSuperAdmin) {
      throw new Error("Only organization owners or super admins can access the compliance inbox planner.");
    }

    const organization = await ctx.db.get(accessContext.organizationId);
    if (!organization) {
      throw new Error("Organization not found.");
    }

    const now = Date.now();
    const riskRows = await readRiskRowsForOrganization(ctx, accessContext.organizationId);
    const ownerGateObject = await getOwnerGateObject(ctx, accessContext.organizationId);
    const gateSnapshot = computeGateSnapshot({ riskRows, ownerGateObject });
    const avvOutreachRows = await readAvvOutreachRowsForOrganization(ctx, accessContext.organizationId);
    const avvOutreachSummary = summarizeAvvOutreachRows({
      rows: avvOutreachRows,
      now,
    });

    const evidenceObjects = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", COMPLIANCE_EVIDENCE_OBJECT_TYPE))
      .collect();
    const evidenceContext = buildEvidenceResolutionContextForOrganization({
      organizationId: accessContext.organizationId,
      evidenceObjects,
    });
    const planner = buildComplianceInboxPlanner({
      now,
      riskRows,
      resolvedEvidenceRows: evidenceContext.resolvedRows,
      invalidEvidenceRows: evidenceContext.organizationRows.filter((row) => !row.contractValid),
      avvOutreachRows,
    });
    const platformSharedEvidence = computePlatformSharedEvidenceSummaryForOrganization({
      organizationId: accessContext.organizationId,
      evidenceObjects,
    });
    const evidenceResolution = computeEvidenceResolutionSummaryForOrganization({
      organizationId: accessContext.organizationId,
      evidenceObjects,
    });
    const operationalTelemetry = buildComplianceOperationalTelemetry({
      now,
      gate: {
        effectiveGateStatus: gateSnapshot.effectiveGateStatus,
        ownerGateDecision: gateSnapshot.ownerGateDecision,
        blockerCount: gateSnapshot.blockerCount,
        blockerIds: gateSnapshot.blockerIds,
      },
      gateTransition: readGateTransitionTelemetry({
        ownerGateObject,
      }),
      avvOutreachRows,
      resolvedEvidenceRows: evidenceContext.resolvedRows,
    });

    return {
      organizationId: accessContext.organizationId,
      organizationName: organization.name,
      isOrgOwner: accessContext.isOrgOwner,
      isSuperAdmin: accessContext.isSuperAdmin,
      canEdit: hasOrgOwnerDecisionAuthority(accessContext),
      risks: riskRows,
      gate: gateSnapshot,
      avvOutreach: {
        rows: avvOutreachRows,
        summary: avvOutreachSummary,
      },
      planner,
      platformSharedEvidence,
      evidenceResolution: {
        ...evidenceResolution,
        invalidOrganizationEvidenceCount: evidenceContext.organizationRows.filter(
          (row) => !row.contractValid,
        ).length,
      },
      operationalTelemetry,
    };
  },
});

export const getComplianceInboxWizardDraft = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    if (!hasOrgOwnerDecisionAuthority(accessContext)) {
      return null;
    }

    const draftObject = await findComplianceInboxWizardDraftObject({
      ctx,
      organizationId: accessContext.organizationId,
      sessionId: args.sessionId,
      userId: accessContext.userId,
    });
    if (!draftObject) {
      return null;
    }
    const snapshot = mapComplianceInboxWizardDraftObjectToSnapshot(draftObject);
    if (!snapshot.sessionId || !snapshot.userId) {
      return null;
    }
    return snapshot;
  },
});

export const saveComplianceInboxWizardDraft = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    actionId: v.optional(v.string()),
    riskId: v.optional(riskIdValidator),
    workflow: v.optional(complianceInboxWizardDraftWorkflowValidator),
    stepIndex: v.optional(v.number()),
    stepLabel: v.optional(v.string()),
    avvDraft: v.optional(complianceInboxWizardAvvDraftValidator),
    transferDraft: v.optional(complianceInboxWizardTransferDraftValidator),
    securityDraft: v.optional(complianceInboxWizardSecurityDraftValidator),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    if (!hasOrgOwnerDecisionAuthority(accessContext)) {
      throw new Error(
        "Only organization owners, or super-admin on the configured platform org, can save compliance inbox wizard drafts.",
      );
    }

    const sessionId = normalizeString(args.sessionId);
    if (!sessionId) {
      throw new Error("Session ID is required.");
    }

    const now = Date.now();
    const existing = await findComplianceInboxWizardDraftObject({
      ctx,
      organizationId: accessContext.organizationId,
      sessionId,
      userId: accessContext.userId,
    });
    const existingSnapshot = existing
      ? mapComplianceInboxWizardDraftObjectToSnapshot(existing)
      : null;
    const workflow = normalizeWizardDraftWorkflow(args.workflow);
    const stepIndex = normalizeNonNegativeInteger(args.stepIndex);
    const stepLabel = normalizeNullableString(args.stepLabel);
    const avvDraft = args.avvDraft
      ? mapComplianceInboxWizardAvvDraft(args.avvDraft)
      : (existingSnapshot?.avvDraft ?? mapComplianceInboxWizardAvvDraft({}));
    const transferDraft = args.transferDraft
      ? mapComplianceInboxWizardTransferDraft(args.transferDraft)
      : (existingSnapshot?.transferDraft ?? mapComplianceInboxWizardTransferDraft({}));
    const securityDraft = args.securityDraft
      ? mapComplianceInboxWizardSecurityDraft(args.securityDraft)
      : (existingSnapshot?.securityDraft ?? mapComplianceInboxWizardSecurityDraft({}));

    const customProperties = compactRecord({
      sessionId,
      userId: String(accessContext.userId),
      actionId: normalizeString(args.actionId) ?? undefined,
      riskId: args.riskId ?? undefined,
      workflow: workflow ?? undefined,
      stepIndex,
      stepLabel: stepLabel ?? undefined,
      checkpointUpdatedAt: now,
      avvDraft,
      transferDraft,
      securityDraft,
      updatedBy: String(accessContext.userId),
      updatedAt: now,
    });

    let draftObjectId: Id<"objects">;
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "draft",
        customProperties: compactRecord({
          ...asRecord(existing.customProperties),
          ...customProperties,
        }),
        updatedAt: now,
      });
      draftObjectId = existing._id;
    } else {
      draftObjectId = await ctx.db.insert("objects", {
        organizationId: accessContext.organizationId,
        type: COMPLIANCE_INBOX_WIZARD_DRAFT_OBJECT_TYPE,
        subtype: COMPLIANCE_INBOX_WIZARD_DRAFT_OBJECT_SUBTYPE,
        name: COMPLIANCE_INBOX_WIZARD_DRAFT_OBJECT_NAME,
        description: "Per-session compliance inbox wizard checkpoint",
        status: "draft",
        customProperties: compactRecord({
          ...customProperties,
          createdBy: String(accessContext.userId),
          createdAt: now,
        }),
        createdBy: accessContext.userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("objectActions", {
      organizationId: accessContext.organizationId,
      objectId: draftObjectId,
      actionType: "compliance_inbox_wizard_draft_saved",
      actionData: compactRecord({
        actionId: normalizeString(args.actionId) ?? undefined,
        riskId: args.riskId ?? undefined,
        workflow: workflow ?? undefined,
        stepIndex,
      }),
      performedBy: accessContext.userId,
      performedAt: now,
    });

    const draftObject = await ctx.db.get(draftObjectId);
    if (!draftObject) {
      throw new Error("Failed to persist compliance inbox wizard draft.");
    }
    return mapComplianceInboxWizardDraftObjectToSnapshot(draftObject);
  },
});

export const getComplianceEvidenceRiskTimeline = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    evidenceObjectId: v.optional(v.id("objects")),
    riskId: v.optional(riskIdValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    if (!accessContext.isOrgOwner && !accessContext.isSuperAdmin) {
      throw new Error("Only organization owners or super admins can access evidence risk timeline.");
    }

    const evidenceObjects = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", accessContext.organizationId).eq("type", COMPLIANCE_EVIDENCE_OBJECT_TYPE),
      )
      .collect();

    const selectedRows = evidenceObjects
      .map(mapEvidenceObjectToRow)
      .filter((row) => {
        if (args.evidenceObjectId && String(row.evidenceObjectId) !== String(args.evidenceObjectId)) {
          return false;
        }
        if (args.riskId && !row.riskReferences.some((reference) => reference.riskId === args.riskId)) {
          return false;
        }
        return true;
      });

    const entries = await Promise.all(
      selectedRows.map(async (row) => {
        const actions = await ctx.db
          .query("objectActions")
          .withIndex("by_object", (q) => q.eq("objectId", row.evidenceObjectId))
          .collect();
        const timeline = actions
          .filter((action) => action.actionType.startsWith("compliance_evidence_"))
          .sort((left, right) => {
            if (left.performedAt !== right.performedAt) {
              return right.performedAt - left.performedAt;
            }
            return String(right._id).localeCompare(String(left._id));
          })
          .map((action) => {
            const actionData = asRecord(action.actionData);
            return {
              actionId: String(action._id),
              actionType: action.actionType,
              eventType: normalizeString(actionData.eventType) ?? null,
              performedAt: action.performedAt,
              performedById: action.performedBy ? String(action.performedBy) : null,
              auditRef: `objectActions:${String(action._id)}`,
              riskIds: normalizeRiskIdList(actionData.riskIds),
              controlId: normalizeString(actionData.controlId) ?? null,
            };
          });
        const sourceMarker: "org_local" | "org_inherited" =
          row.sourceType === "platform_inherited" || row.inheritanceScope === "org_inherited"
            ? "org_inherited"
            : "org_local";

        return {
          evidenceObjectId: String(row.evidenceObjectId),
          title: row.title,
          riskReferences: row.riskReferences,
          provenance: {
            sourceType: row.sourceType,
            sourceMarker,
            inheritanceScope: row.inheritanceScope,
            inheritedFromOrganizationId: row.inheritedFromOrganizationId ?? null,
            inheritedFromEvidenceObjectId: row.inheritedFromEvidenceObjectId ?? null,
            platformShareScope: row.platformShareScope ?? null,
          },
          timeline,
          latestEventAt: timeline[0]?.performedAt ?? row.updatedAt,
        };
      }),
    );

    const limit = Math.max(1, Math.floor(args.limit ?? 50));
    return {
      organizationId: accessContext.organizationId,
      entries: entries
        .sort((left, right) => {
          if (left.latestEventAt !== right.latestEventAt) {
            return right.latestEventAt - left.latestEventAt;
          }
          return left.title.localeCompare(right.title);
        })
        .slice(0, limit),
    };
  },
});

export const listComplianceFleetGateStatus = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const authenticated = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, authenticated.userId, authenticated.organizationId);
    const isSuperAdmin = userContext.isGlobal && userContext.roleName === "super_admin";
    if (!isSuperAdmin) {
      throw new Error("Super admin access required.");
    }

    const organizations = (await ctx.db.query("organizations").collect()).filter(
      (organization) => organization.isActive,
    );
    const now = Date.now();

    const releaseGateObjects = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", COMPLIANCE_RELEASE_GATE_TYPE))
      .collect();
    const avvOutreachObjects = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", COMPLIANCE_AVV_OUTREACH_OBJECT_TYPE))
      .collect();
    const transferWorkflowObjects = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", COMPLIANCE_TRANSFER_WORKFLOW_OBJECT_TYPE))
      .collect();
    const securityWorkflowObjects = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", COMPLIANCE_SECURITY_WORKFLOW_OBJECT_TYPE))
      .collect();
    const evidenceObjects = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", COMPLIANCE_EVIDENCE_OBJECT_TYPE))
      .collect();

    const riskObjectsByOrg = new Map<string, typeof releaseGateObjects>();
    const ownerGateByOrg = new Map<string, (typeof releaseGateObjects)[number]>();
    const latestTransferWorkflowByOrg = new Map<string, (typeof transferWorkflowObjects)[number]>();
    const latestSecurityWorkflowByOrg = new Map<string, (typeof securityWorkflowObjects)[number]>();

    for (const releaseGateObject of releaseGateObjects) {
      if (releaseGateObject.subtype === COMPLIANCE_RELEASE_GATE_RISK_SUBTYPE) {
        const key = String(releaseGateObject.organizationId);
        const existing = riskObjectsByOrg.get(key) ?? [];
        existing.push(releaseGateObject);
        riskObjectsByOrg.set(key, existing);
        continue;
      }

      if (
        releaseGateObject.subtype === COMPLIANCE_RELEASE_GATE_OWNER_SUBTYPE
        && releaseGateObject.name === COMPLIANCE_OWNER_GATE_OBJECT_NAME
      ) {
        ownerGateByOrg.set(String(releaseGateObject.organizationId), releaseGateObject);
      }
    }

    for (const transferWorkflowObject of transferWorkflowObjects) {
      if (transferWorkflowObject.subtype !== COMPLIANCE_TRANSFER_WORKFLOW_OBJECT_SUBTYPE) {
        continue;
      }
      const orgKey = String(transferWorkflowObject.organizationId);
      const existing = latestTransferWorkflowByOrg.get(orgKey);
      if (
        !existing
        || transferWorkflowObject.updatedAt > existing.updatedAt
        || (
          transferWorkflowObject.updatedAt === existing.updatedAt
          && String(transferWorkflowObject._id).localeCompare(String(existing._id)) > 0
        )
      ) {
        latestTransferWorkflowByOrg.set(orgKey, transferWorkflowObject);
      }
    }

    for (const securityWorkflowObject of securityWorkflowObjects) {
      if (securityWorkflowObject.subtype !== COMPLIANCE_SECURITY_WORKFLOW_OBJECT_SUBTYPE) {
        continue;
      }
      const orgKey = String(securityWorkflowObject.organizationId);
      const existing = latestSecurityWorkflowByOrg.get(orgKey);
      if (
        !existing
        || securityWorkflowObject.updatedAt > existing.updatedAt
        || (
          securityWorkflowObject.updatedAt === existing.updatedAt
          && String(securityWorkflowObject._id).localeCompare(String(existing._id)) > 0
        )
      ) {
        latestSecurityWorkflowByOrg.set(orgKey, securityWorkflowObject);
      }
    }

    return organizations
      .map((organization) => {
        const orgKey = String(organization._id);
        const riskObjects = riskObjectsByOrg.get(orgKey) ?? [];
        const riskById = new Map<RiskId, (typeof riskObjects)[number]>();
        for (const riskObject of riskObjects) {
          const riskId = normalizeString(riskObject.name) as RiskId | undefined;
          if (riskId && RISK_ID_VALUES.includes(riskId)) {
            riskById.set(riskId, riskObject);
          }
        }

        const baseRiskRows = RISK_TEMPLATES.map((template) =>
          buildRiskRow(
            template,
            riskById.get(template.riskId)
              ? {
                  _id: riskById.get(template.riskId)!._id,
                  status: riskById.get(template.riskId)!.status,
                  customProperties: asRecord(riskById.get(template.riskId)!.customProperties),
                  updatedAt: riskById.get(template.riskId)!.updatedAt,
                  createdAt: riskById.get(template.riskId)!.createdAt,
                }
              : null,
          ),
        );
        const workflowSignals = deriveWorkflowCompletenessSignals({
          transferWorkflowObject: latestTransferWorkflowByOrg.get(orgKey) ?? null,
          securityWorkflowObject: latestSecurityWorkflowByOrg.get(orgKey) ?? null,
        });
        const riskRows = applyWorkflowSignalsToRiskRows({
          riskRows: baseRiskRows,
          workflowSignals,
        });

        const ownerGateObject = ownerGateByOrg.get(orgKey)
          ? {
              status: ownerGateByOrg.get(orgKey)!.status,
              customProperties: asRecord(ownerGateByOrg.get(orgKey)!.customProperties),
              updatedAt: ownerGateByOrg.get(orgKey)!.updatedAt,
            }
          : null;

        const gateSnapshot = computeGateSnapshot({ riskRows, ownerGateObject });
        const avvOutreachRows = avvOutreachObjects
          .filter((object) =>
            String(object.organizationId) === String(organization._id)
            && object.subtype === COMPLIANCE_AVV_OUTREACH_OBJECT_SUBTYPE,
          )
          .map(mapAvvOutreachObjectToRow);
        const avvOutreachSummary = summarizeAvvOutreachRows({
          rows: avvOutreachRows,
          now,
        });
        const evidenceContext = buildEvidenceResolutionContextForOrganization({
          organizationId: organization._id,
          evidenceObjects,
        });
        const platformSharedEvidence = computePlatformSharedEvidenceSummaryForOrganization({
          organizationId: organization._id,
          evidenceObjects,
        });
        const evidenceResolution = computeEvidenceResolutionSummaryForOrganization({
          organizationId: organization._id,
          evidenceObjects,
        });
        const operationalTelemetry = buildComplianceOperationalTelemetry({
          now,
          gate: {
            effectiveGateStatus: gateSnapshot.effectiveGateStatus,
            ownerGateDecision: gateSnapshot.ownerGateDecision,
            blockerCount: gateSnapshot.blockerCount,
            blockerIds: gateSnapshot.blockerIds,
          },
          gateTransition: readGateTransitionTelemetry({
            ownerGateObject,
          }),
          avvOutreachRows,
          resolvedEvidenceRows: evidenceContext.resolvedRows,
        });
        const evidenceExpiryAlertCount =
          operationalTelemetry.evidence.reviewDueSoonCount
          + operationalTelemetry.evidence.reviewOverdueCount
          + operationalTelemetry.evidence.retentionExpiringSoonCount
          + operationalTelemetry.evidence.retentionExpiredCount;

        return {
          organizationId: organization._id,
          organizationName: organization.name,
          effectiveGateStatus: gateSnapshot.effectiveGateStatus,
          ownerGateDecision: gateSnapshot.ownerGateDecision,
          blockerIds: gateSnapshot.blockerIds,
          blockerCount: gateSnapshot.blockerCount,
          platformSharedEvidenceAvailableCount: platformSharedEvidence.availableCount,
          platformSharedEvidenceSourceOrganizationCount: platformSharedEvidence.sourceOrganizationCount,
          avvOutreachOpenCount: avvOutreachSummary.openCount,
          avvOutreachOverdueCount: avvOutreachSummary.overdueCount,
          avvOutreachInvalidCount: avvOutreachSummary.invalidCount,
          effectiveEvidenceResolvedCount: evidenceResolution.resolvedCount,
          effectiveEvidenceHiddenCount: evidenceResolution.hiddenCount,
          operationalAlertCount: operationalTelemetry.summary.totalAlerts,
          operationalCriticalAlertCount: operationalTelemetry.summary.criticalAlerts,
          outreachStalledCount: operationalTelemetry.outreach.stalledCount,
          evidenceExpiryAlertCount,
          lastGateTransitionAt: operationalTelemetry.gate.lastTransition?.occurredAt ?? null,
          updatedAt: gateSnapshot.updatedAt ?? organization.updatedAt,
        };
      })
      .sort((left, right) => left.organizationName.localeCompare(right.organizationName));
  },
});

export const saveRiskAssessment = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    riskId: riskIdValidator,
    status: riskStatusValidator,
    decisionStatus: decisionStatusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    if (!hasOrgOwnerDecisionAuthority(accessContext)) {
      if (accessContext.isSuperAdmin) {
        await insertComplianceGateGuardrailAuditEvent(ctx, {
          organizationId: accessContext.organizationId,
          userId: accessContext.userId,
          eventType: "inheritance_misuse_attempt",
          metadata: {
            operation: "saveRiskAssessment",
            riskId: args.riskId,
            reasonCode: "super_admin_org_decision_write_blocked",
          },
        });
      }
      throw new Error(ORG_OWNER_DECISION_AUTHORITY_ERROR);
    }

    if (args.status === "closed" && args.decisionStatus !== "freigegeben") {
      throw new Error("A risk can only be closed when decision status is 'freigegeben'.");
    }

    const riskObject = await ensureRiskObject(ctx, {
      organizationId: accessContext.organizationId,
      userId: accessContext.userId,
      riskId: args.riskId,
    });

    const existingProps = asRecord(riskObject.customProperties);
    const evidence = normalizeEvidence(existingProps.evidence);
    const now = Date.now();
    const runtimeGate = resolveComplianceActionRuntimeGate({
      actionFamily: "compliance_save_risk_assessment",
      riskLevel: args.status === "closed" ? "high" : "medium",
      channel: "compliance_center",
      targetSystemClass: "platform_internal",
      humanApprovalGranted: hasOrgOwnerDecisionAuthority(accessContext),
    });
    if (runtimeGate.gate.status !== "passed") {
      throw new Error(`Compliance runtime gate blocked (${runtimeGate.gate.reasonCode}).`);
    }

    await ctx.db.patch(riskObject._id, {
      status: args.status,
      customProperties: compactRecord({
        ...existingProps,
        decisionStatus: args.decisionStatus,
        notes: normalizeString(args.notes) ?? "",
        evidence,
        lastUpdatedBy: String(accessContext.userId),
        lastUpdatedAt: now,
      }),
      updatedAt: now,
    });

    const auditActionId = await ctx.db.insert("objectActions", {
      organizationId: accessContext.organizationId,
      objectId: riskObject._id,
      actionType: "compliance_risk_assessed",
      actionData: compactRecord({
        riskId: args.riskId,
        status: args.status,
        decisionStatus: args.decisionStatus,
        notes: normalizeString(args.notes) ?? "",
        runtimeContractVersion: runtimeGate.contractVersion,
        runtimeStageOrder: [...runtimeGate.stageOrder],
        runtimeGateStatus: runtimeGate.gate.status,
        runtimeGateReasonCode: runtimeGate.gate.reasonCode,
        runtimePolicyDecision: runtimeGate.policyDecision,
        runtimePolicyReasonCode: runtimeGate.policyReasonCode,
        runtimeApprovalCheckpoint: runtimeGate.approval.checkpoint,
        runtimeApprovalRequired: runtimeGate.approval.required,
        runtimeApprovalSatisfied: runtimeGate.approval.satisfied,
      }),
      performedBy: accessContext.userId,
      performedAt: now,
    });
    const runtimeLifecycle = buildComplianceActionLifecycleAuditSnapshot({
      gateResult: runtimeGate,
      plannedAt: now,
      executeAt: now,
      verifyAt: now,
      verifyPassed: true,
      auditAt: now,
      auditRef: `objectActions:${String(auditActionId)}`,
    });

    return {
      success: true,
      riskId: args.riskId,
      status: args.status,
      decisionStatus: args.decisionStatus,
      updatedAt: now,
      runtimeLifecycle,
    };
  },
});

export const addRiskEvidence = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    riskId: riskIdValidator,
    label: v.string(),
    url: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    if (!hasOrgOwnerDecisionAuthority(accessContext)) {
      if (accessContext.isSuperAdmin) {
        await insertComplianceGateGuardrailAuditEvent(ctx, {
          organizationId: accessContext.organizationId,
          userId: accessContext.userId,
          eventType: "inheritance_misuse_attempt",
          metadata: {
            operation: "addRiskEvidence",
            riskId: args.riskId,
            reasonCode: "super_admin_org_decision_write_blocked",
          },
        });
      }
      throw new Error(ORG_OWNER_DECISION_AUTHORITY_ERROR);
    }

    const evidenceLabel = normalizeString(args.label);
    if (!evidenceLabel) {
      throw new Error("Evidence label is required.");
    }

    const riskObject = await ensureRiskObject(ctx, {
      organizationId: accessContext.organizationId,
      userId: accessContext.userId,
      riskId: args.riskId,
    });

    const existingProps = asRecord(riskObject.customProperties);
    const existingEvidence = normalizeEvidence(existingProps.evidence);
    const now = Date.now();
    const runtimeGate = resolveComplianceActionRuntimeGate({
      actionFamily: "compliance_add_risk_evidence",
      riskLevel: "medium",
      channel: "compliance_center",
      targetSystemClass: "platform_internal",
      humanApprovalGranted: hasOrgOwnerDecisionAuthority(accessContext),
    });
    if (runtimeGate.gate.status !== "passed") {
      throw new Error(`Compliance runtime gate blocked (${runtimeGate.gate.reasonCode}).`);
    }
    const evidenceEntry: RiskEvidence = {
      id: `evidence_${now}_${Math.random().toString(36).slice(2, 8)}`,
      label: evidenceLabel,
      url: normalizeString(args.url),
      notes: normalizeString(args.notes),
      addedAt: now,
      addedBy: String(accessContext.userId),
    };
    const nextEvidence = [...existingEvidence, evidenceEntry].slice(-50);

    await ctx.db.patch(riskObject._id, {
      customProperties: compactRecord({
        ...existingProps,
        evidence: nextEvidence.map((entry) =>
          compactRecord({
            id: entry.id,
            label: entry.label,
            url: entry.url,
            notes: entry.notes,
            addedAt: entry.addedAt,
            addedBy: entry.addedBy,
          }),
        ),
        lastUpdatedBy: String(accessContext.userId),
        lastUpdatedAt: now,
      }),
      updatedAt: now,
    });

    const auditActionId = await ctx.db.insert("objectActions", {
      organizationId: accessContext.organizationId,
      objectId: riskObject._id,
      actionType: "compliance_risk_evidence_added",
      actionData: compactRecord({
        riskId: args.riskId,
        evidenceId: evidenceEntry.id,
        label: evidenceEntry.label,
        url: evidenceEntry.url,
        runtimeContractVersion: runtimeGate.contractVersion,
        runtimeStageOrder: [...runtimeGate.stageOrder],
        runtimeGateStatus: runtimeGate.gate.status,
        runtimeGateReasonCode: runtimeGate.gate.reasonCode,
        runtimePolicyDecision: runtimeGate.policyDecision,
        runtimePolicyReasonCode: runtimeGate.policyReasonCode,
        runtimeApprovalCheckpoint: runtimeGate.approval.checkpoint,
        runtimeApprovalRequired: runtimeGate.approval.required,
        runtimeApprovalSatisfied: runtimeGate.approval.satisfied,
      }),
      performedBy: accessContext.userId,
      performedAt: now,
    });
    const runtimeLifecycle = buildComplianceActionLifecycleAuditSnapshot({
      gateResult: runtimeGate,
      plannedAt: now,
      executeAt: now,
      verifyAt: now,
      verifyPassed: true,
      auditAt: now,
      auditRef: `objectActions:${String(auditActionId)}`,
    });

    return {
      success: true,
      riskId: args.riskId,
      evidenceId: evidenceEntry.id,
      evidenceCount: nextEvidence.length,
      updatedAt: now,
      runtimeLifecycle,
    };
  },
});

export const setOwnerGateDecision = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    decision: ownerGateDecisionValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const accessContext = await resolveOrgAccessContext(ctx, args);
    if (!hasOrgOwnerDecisionAuthority(accessContext)) {
      if (accessContext.isSuperAdmin) {
        await insertComplianceGateGuardrailAuditEvent(ctx, {
          organizationId: accessContext.organizationId,
          userId: accessContext.userId,
          eventType: "inheritance_misuse_attempt",
          metadata: {
            operation: "setOwnerGateDecision",
            requestedDecision: args.decision,
            reasonCode: "super_admin_org_decision_write_blocked",
          },
        });
      }
      throw new Error(ORG_OWNER_DECISION_AUTHORITY_ERROR);
    }
    const runtimeGate = resolveComplianceActionRuntimeGate({
      actionFamily: "compliance_set_owner_gate_decision",
      riskLevel: args.decision === "GO" ? "critical" : "high",
      channel: "compliance_governance",
      targetSystemClass: "platform_internal",
      requiresOwnerGoDecision: args.decision === "GO",
      humanApprovalGranted: hasOrgOwnerDecisionAuthority(accessContext),
    });
    if (runtimeGate.gate.status !== "passed") {
      throw new Error(`Compliance runtime gate blocked (${runtimeGate.gate.reasonCode}).`);
    }

    const riskRows = await readRiskRowsForOrganization(ctx, accessContext.organizationId);
    const ownerGateObject = await ensureOwnerGateObject(ctx, {
      organizationId: accessContext.organizationId,
      userId: accessContext.userId,
    });
    const ownerGateProps = asRecord(ownerGateObject.customProperties);
    const previousOwnerGateDecision = normalizeOwnerGateDecision(ownerGateObject.status);
    const previousGateSnapshot = computeGateSnapshot({
      riskRows,
      ownerGateObject: {
        status: ownerGateObject.status,
        customProperties: ownerGateProps,
        updatedAt: ownerGateObject.updatedAt,
      },
    });
    const blockerSnapshot = computeGateSnapshot({
      riskRows,
      ownerGateObject: null,
    });
    const blockerIds = blockerSnapshot.blockerIds;
    const blockerMessages = blockerSnapshot.blockers.map(
      (blocker) => `${blocker.riskId}:${blocker.code}`,
    );
    if (args.decision === "GO" && blockerIds.length > 0) {
      await insertComplianceGateGuardrailAuditEvent(ctx, {
        organizationId: accessContext.organizationId,
        userId: accessContext.userId,
        eventType: "blocked_go_attempt",
        metadata: {
          requestedDecision: args.decision,
          blockerIds,
          blockerCodes: blockerMessages,
        },
      });
      const missingEvidenceBlockers = extractMissingEvidenceGuardrailBlockers(blockerSnapshot.blockers);
      if (missingEvidenceBlockers.length > 0) {
        await insertComplianceGateGuardrailAuditEvent(ctx, {
          organizationId: accessContext.organizationId,
          userId: accessContext.userId,
          eventType: "missing_evidence_state",
          metadata: {
            requestedDecision: args.decision,
            missingBlockerCodes: missingEvidenceBlockers.map(
              (blocker) => `${blocker.riskId}:${blocker.code}`,
            ),
          },
        });
      }
      throw new Error(
        `Cannot set GO while blockers remain: ${blockerMessages.join("; ")}.`,
      );
    }

    const now = Date.now();
    const effectiveGateStatus =
      args.decision === "GO" && blockerIds.length === 0 ? "GO" : "NO_GO";
    const transitionOccurred =
      previousGateSnapshot.effectiveGateStatus !== effectiveGateStatus
      || previousOwnerGateDecision !== args.decision;
    await ctx.db.patch(ownerGateObject._id, {
      status: args.decision,
      customProperties: compactRecord({
        ...ownerGateProps,
        decidedBy: String(accessContext.userId),
        decidedAt: now,
        notes: normalizeString(args.notes) ?? "",
        blockerSnapshot: blockerIds,
        blockerReasonSnapshot: blockerMessages,
        lastEffectiveGateStatus: effectiveGateStatus,
        lastOwnerGateDecision: args.decision,
        lastGateTransitionAt: transitionOccurred ? now : ownerGateProps.lastGateTransitionAt,
        lastGateTransitionFromEffectiveStatus: transitionOccurred
          ? previousGateSnapshot.effectiveGateStatus
          : ownerGateProps.lastGateTransitionFromEffectiveStatus,
        lastGateTransitionToEffectiveStatus: transitionOccurred
          ? effectiveGateStatus
          : ownerGateProps.lastGateTransitionToEffectiveStatus,
        lastGateTransitionFromDecision: transitionOccurred
          ? previousOwnerGateDecision
          : ownerGateProps.lastGateTransitionFromDecision,
        lastGateTransitionToDecision: transitionOccurred
          ? args.decision
          : ownerGateProps.lastGateTransitionToDecision,
      }),
      updatedAt: now,
    });

    const ownerGateDecisionActionId = await ctx.db.insert("objectActions", {
      organizationId: accessContext.organizationId,
      objectId: ownerGateObject._id,
      actionType: "compliance_owner_gate_decision",
      actionData: compactRecord({
        decision: args.decision,
        blockerIds,
        blockers: blockerSnapshot.blockers,
        notes: normalizeString(args.notes) ?? "",
        runtimeContractVersion: runtimeGate.contractVersion,
        runtimeStageOrder: [...runtimeGate.stageOrder],
        runtimeGateStatus: runtimeGate.gate.status,
        runtimeGateReasonCode: runtimeGate.gate.reasonCode,
        runtimePolicyDecision: runtimeGate.policyDecision,
        runtimePolicyReasonCode: runtimeGate.policyReasonCode,
        runtimeApprovalCheckpoint: runtimeGate.approval.checkpoint,
        runtimeApprovalRequired: runtimeGate.approval.required,
        runtimeApprovalSatisfied: runtimeGate.approval.satisfied,
      }),
      performedBy: accessContext.userId,
      performedAt: now,
    });
    if (transitionOccurred) {
      await ctx.db.insert("objectActions", {
        organizationId: accessContext.organizationId,
        objectId: ownerGateObject._id,
        actionType: "compliance_gate_transition_telemetry",
        actionData: compactRecord({
          contractVersion: COMPLIANCE_OPERATIONAL_TELEMETRY_CONTRACT_VERSION,
          fromEffectiveGateStatus: previousGateSnapshot.effectiveGateStatus,
          toEffectiveGateStatus: effectiveGateStatus,
          fromOwnerGateDecision: previousOwnerGateDecision,
          toOwnerGateDecision: args.decision,
          blockerIds,
          blockerCodes: blockerMessages,
        }),
        performedBy: accessContext.userId,
        performedAt: now,
      });
    }
    const expectedEffectiveGateStatus = args.decision === "GO" ? "GO" : "NO_GO";
    const runtimeLifecycle = buildComplianceActionLifecycleAuditSnapshot({
      gateResult: runtimeGate,
      plannedAt: now,
      executeAt: now,
      verifyAt: now,
      verifyPassed: effectiveGateStatus === expectedEffectiveGateStatus,
      verifyReasonCode:
        effectiveGateStatus === expectedEffectiveGateStatus
          ? undefined
          : "effective_gate_status_mismatch",
      auditAt: now,
      auditRef: `objectActions:${String(ownerGateDecisionActionId)}`,
    });

    return {
      success: true,
      decision: args.decision,
      blockerIds,
      blockers: blockerSnapshot.blockers,
      effectiveGateStatus,
      decidedAt: now,
      transitionOccurred,
      runtimeLifecycle,
    };
  },
});
