import { ConvexError, v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import {
  DEFAULT_OPERATOR_CONTEXT_ID,
  DEFAULT_ORG_AGENT_TEMPLATE_ROLE,
  PLATFORM_MOTHER_POLICY_FAMILY_CONTRACT_VERSION,
  PLATFORM_MOTHER_ROLLOUT_GATE_REQUIREMENTS_CONTRACT_VERSION,
  buildPlatformMotherRolloutGateRequirements,
  pickTemplateBaselineSnapshot,
  resolvePlatformMotherPolicyFamilyScope,
  resolveTemplateCloneDriftContract,
  resolveTemplateCloneRiskLevel,
  runAgentTemplateVersionPublishLifecycle,
  runPrimaryAgentContextRepairLifecycle,
  runTemplateDistributionLifecycle,
  type PlatformMotherPolicyFamilyScope,
  type PlatformMotherRolloutGateRequirements,
  type TemplateCloneRiskLevel,
} from "../agentOntology";
import {
  PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_MOTHER_ONLY,
  PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_QUINN_REQUIRED,
  PLATFORM_MOTHER_CANONICAL_NAME,
  PLATFORM_MOTHER_LEGACY_NAME,
  PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
  PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
  PLATFORM_MOTHER_SUPPORT_RELEASE_CONTRACT_VERSION,
  PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY,
  PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_GENERAL_AVAILABILITY,
  PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_CONTRACT_VERSION,
  PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE,
  isPlatformMotherAuthorityRecord,
  readPlatformMotherSupportReleaseStatus,
  readPlatformMotherSupportRouteFlagsStatus,
  readPlatformMotherRuntimeMode,
} from "../platformMother";
import {
  readTemplateCloneLinkageContract,
  resolveTemplateSourceId,
} from "./templateCloneLinkage";

export const PLATFORM_MOTHER_REVIEW_ARTIFACT_CONTRACT_VERSION =
  "platform_mother_review_artifact_v1" as const;
export const PLATFORM_MOTHER_APPROVAL_ENVELOPE_CONTRACT_VERSION =
  "platform_mother_review_approval_v1" as const;
export const PLATFORM_MOTHER_REJECTION_ENVELOPE_CONTRACT_VERSION =
  "platform_mother_review_rejection_v1" as const;
export const PLATFORM_MOTHER_EXECUTION_CORRELATION_CONTRACT_VERSION =
  "platform_mother_execution_correlation_v1" as const;
export const PLATFORM_MOTHER_ALIAS_MIGRATION_EVIDENCE_CONTRACT_VERSION =
  "platform_mother_alias_migration_evidence_v1" as const;
export const PLATFORM_MOTHER_REVIEW_AUDIT_ENVELOPE_CONTRACT_VERSION =
  "platform_mother_review_audit_envelope_v1" as const;

export const PLATFORM_MOTHER_REVIEW_OBJECT_TYPE = "platform_mother_review_artifact";
export const PLATFORM_MOTHER_REVIEW_OBJECT_SUBTYPE = "governance_review";
export const PLATFORM_MOTHER_REVIEW_ACTION_RECORDED =
  "platform_mother_review_artifact.recorded";
export const PLATFORM_MOTHER_REVIEW_ACTION_APPROVED =
  "platform_mother.proposal_approved";
export const PLATFORM_MOTHER_REVIEW_ACTION_REJECTED =
  "platform_mother.proposal_rejected";
export const PLATFORM_MOTHER_REVIEW_ACTION_EXECUTION_COMPLETED =
  "platform_mother.execution_completed";
export const PLATFORM_MOTHER_SUPPORT_RELEASE_ACTION_UPDATED =
  "platform_mother.support_release_updated";
export const PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_ACTION_UPDATED =
  "platform_mother.support_route_flags_updated";

const PLATFORM_MOTHER_REVIEW_ARTIFACT_KIND = "proposal_review";
const PLATFORM_MOTHER_REVIEW_ARTIFACT_KIND_VALUES = [
  "proposal_review",
  "drift_audit",
  "migration_plan",
  "org_intervention_review",
] as const;
export type PlatformMotherReviewArtifactKind =
  (typeof PLATFORM_MOTHER_REVIEW_ARTIFACT_KIND_VALUES)[number];
export const PLATFORM_MOTHER_REVIEW_CONTEXT_CONTRACT_VERSION =
  "platform_mother_review_context_v1" as const;

const PLATFORM_MOTHER_REVIEW_PACKET_STATE_VALUES = [
  "missing_clone",
  "in_sync",
  "overridden",
  "stale",
  "blocked",
] as const;
type PlatformMotherReviewPacketState =
  (typeof PLATFORM_MOTHER_REVIEW_PACKET_STATE_VALUES)[number];

const PLATFORM_MOTHER_REVIEW_PACKET_REASON_VALUES = [
  "missing_managed_clone",
  "legacy_unmanaged_clone",
  "blocked_locked_fields",
  "warn_confirmation_required",
  "stale_template_version",
  "partial_rollout_deferred",
] as const;
type PlatformMotherReviewPacketReason =
  (typeof PLATFORM_MOTHER_REVIEW_PACKET_REASON_VALUES)[number];

const PLATFORM_MOTHER_REVIEW_APPROVAL_STATUS_VALUES = [
  "pending",
  "approved",
  "rejected",
] as const;
export type PlatformMotherReviewApprovalStatus =
  (typeof PLATFORM_MOTHER_REVIEW_APPROVAL_STATUS_VALUES)[number];

const PLATFORM_MOTHER_REVIEW_EXECUTION_STATUS_VALUES = [
  "not_requested",
  "dry_run_pending",
  "approved_no_execution",
  "executed_via_existing_lifecycle",
] as const;
export type PlatformMotherReviewExecutionStatus =
  (typeof PLATFORM_MOTHER_REVIEW_EXECUTION_STATUS_VALUES)[number];

const PLATFORM_MOTHER_ALIAS_EVIDENCE_KIND_VALUES = [
  "identity_alias",
  "template_role_alias",
  "lookup_fallback",
] as const;
export type PlatformMotherAliasEvidenceKind =
  (typeof PLATFORM_MOTHER_ALIAS_EVIDENCE_KIND_VALUES)[number];

export interface PlatformMotherApprovalEnvelope {
  contractVersion: typeof PLATFORM_MOTHER_APPROVAL_ENVELOPE_CONTRACT_VERSION;
  status: "approved";
  approverUserId: string;
  approverRole?: string;
  reason: string;
  ticketId?: string;
  notes?: string;
  decidedAt: number;
}

export interface PlatformMotherRejectionEnvelope {
  contractVersion: typeof PLATFORM_MOTHER_REJECTION_ENVELOPE_CONTRACT_VERSION;
  status: "rejected";
  reviewerUserId: string;
  reasonCode: string;
  reason: string;
  ticketId?: string;
  notes?: string;
  decidedAt: number;
}

export interface PlatformMotherExecutionCorrelation {
  contractVersion: typeof PLATFORM_MOTHER_EXECUTION_CORRELATION_CONTRACT_VERSION;
  status: PlatformMotherReviewExecutionStatus;
  dryRunCorrelationId?: string;
  downstreamObjectActionIds: string[];
  downstreamAuditLogIds: string[];
  templateDistributionJobId?: string;
  executionSummary?: string;
  recordedAt?: number;
}

export interface PlatformMotherAliasMigrationEvidence {
  contractVersion: typeof PLATFORM_MOTHER_ALIAS_MIGRATION_EVIDENCE_CONTRACT_VERSION;
  evidenceKind: PlatformMotherAliasEvidenceKind;
  canonicalIdentityName: string;
  legacyIdentityAlias: string;
  evidenceSummary: string;
  matchedFields: string[];
  sourceTemplateId?: string;
  sourceTemplateVersionId?: string;
  sourceTemplateVersionTag?: string;
  recordedAt: number;
}

export interface PlatformMotherReviewPacket {
  organizationId: string;
  organizationName?: string;
  reviewState: PlatformMotherReviewPacketState;
  riskLevel: TemplateCloneRiskLevel;
  reviewReasons: PlatformMotherReviewPacketReason[];
  cloneAgentId?: string;
  cloneLifecycleState?: string;
  sourceTemplateVersion?: string;
  targetTemplateVersion?: string;
  changedFields: string[];
  blockedFields: string[];
  overriddenFields: string[];
}

export interface PlatformMotherReviewContext {
  contractVersion: typeof PLATFORM_MOTHER_REVIEW_CONTEXT_CONTRACT_VERSION;
  requestedTargetOrganizationIds: string[];
  stagedTargetOrganizationIds: string[];
  recentDistributionJobIds: string[];
  rolloutWindow: {
    stageStartIndex: number;
    stageSize: number;
    requestedTargetCount: number;
    stagedTargetCount: number;
    partialRolloutDetected: boolean;
    historicalPartialRolloutDetected: boolean;
  };
  driftSummary: {
    totalOrganizations: number;
    missingCloneCount: number;
    interventionCount: number;
    reviewStateCounts: {
      missingClone: number;
      inSync: number;
      overridden: number;
      stale: number;
      blocked: number;
    };
    riskLevelCounts: {
      low: number;
      medium: number;
      high: number;
    };
  };
  interventionPackets: PlatformMotherReviewPacket[];
}

export interface PlatformMotherReviewArtifact {
  contractVersion: typeof PLATFORM_MOTHER_REVIEW_ARTIFACT_CONTRACT_VERSION;
  artifactKind: PlatformMotherReviewArtifactKind;
  targetTemplateRole: string;
  targetTemplateId?: string;
  targetTemplateVersionId?: string;
  targetTemplateVersionTag?: string;
  requestingOrganizationId?: string;
  sourceConversationId?: string;
  sourceMotherRuntimeId?: string;
  sourceMessageId?: string;
  proposalSummary: string;
  proposalDetails?: string;
  approvalStatus: PlatformMotherReviewApprovalStatus;
  executionStatus: PlatformMotherReviewExecutionStatus;
  approval: PlatformMotherApprovalEnvelope | null;
  rejection: PlatformMotherRejectionEnvelope | null;
  execution: PlatformMotherExecutionCorrelation;
  aliasMigrationEvidence: PlatformMotherAliasMigrationEvidence | null;
  reviewContext: PlatformMotherReviewContext | null;
  policyFamilyScope: PlatformMotherPolicyFamilyScope;
  rolloutGateRequirements: PlatformMotherRolloutGateRequirements;
  createdAt: number;
  createdByUserId?: string;
}

export interface PlatformMotherReviewArtifactRecord
  extends PlatformMotherReviewArtifact {
  artifactId: string;
  platformOrganizationId: string;
  objectStatus: string;
  objectName: string;
}

export interface PlatformMotherReviewArtifactAuditEnvelope {
  contractVersion: typeof PLATFORM_MOTHER_REVIEW_AUDIT_ENVELOPE_CONTRACT_VERSION;
  artifactContractVersion: typeof PLATFORM_MOTHER_REVIEW_ARTIFACT_CONTRACT_VERSION;
  readOnly: true;
  action: typeof PLATFORM_MOTHER_REVIEW_ACTION_RECORDED;
  artifactId: string;
  artifactKind: PlatformMotherReviewArtifactKind;
  platformOrganizationId: string;
  motherIdentity: {
    canonicalName: typeof PLATFORM_MOTHER_CANONICAL_NAME;
    legacyAlias: typeof PLATFORM_MOTHER_LEGACY_NAME;
  };
  actor: {
    userId?: string;
  };
  target: {
    templateRole: string;
    templateId?: string;
    templateVersionId?: string;
    templateVersionTag?: string;
  };
  source: {
    requestingOrganizationId?: string;
    conversationId?: string;
    motherRuntimeId?: string;
    messageId?: string;
  };
  proposal: {
    summary: string;
    details?: string;
    approvalStatus: PlatformMotherReviewApprovalStatus;
    executionStatus: PlatformMotherReviewExecutionStatus;
    dryRunCorrelationId?: string;
  };
  approval: PlatformMotherApprovalEnvelope | null;
  rejection: PlatformMotherRejectionEnvelope | null;
  execution: PlatformMotherExecutionCorrelation;
  aliasMigrationEvidence: PlatformMotherAliasMigrationEvidence | null;
  reviewContext: PlatformMotherReviewContext | null;
  policyFamilyScope: PlatformMotherPolicyFamilyScope;
  rolloutGateRequirements: PlatformMotherRolloutGateRequirements;
  createdAt: number;
  createdByUserId?: string;
}

type ReviewArtifactObjectRecord = {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  type: string;
  subtype?: string;
  name: string;
  status: string;
  customProperties?: Record<string, unknown>;
};

type PlatformMotherRuntimeMode =
  | typeof PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT
  | typeof PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE;

type PlatformMotherRuntimeRecord = {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  type: string;
  name: string;
  status: string;
  customProperties?: Record<string, unknown>;
};

type PlatformMotherSupportConversationRecord = {
  _id: Id<"aiConversations">;
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  targetAgentId?: Id<"objects">;
};

type ProtectedTemplateRecord = {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  type: string;
  name: string;
  status: string;
  updatedAt?: number;
  customProperties?: Record<string, unknown>;
};

type OrganizationRecord = {
  _id: Id<"organizations">;
  name?: string;
  onboardingLifecycleState?: string | null;
};

type TemplateDistributionTelemetryRow = {
  _id: Id<"objectActions">;
  actionType: string;
  performedAt?: number;
  actionData?: Record<string, unknown>;
};

type ObjectActionRow = {
  _id: Id<"objectActions">;
  organizationId: Id<"organizations">;
  objectId: Id<"objects">;
  actionType: string;
  actionData?: Record<string, unknown>;
  performedAt?: number;
};

type AuditLogRow = {
  _id: Id<"auditLogs">;
  organizationId: Id<"organizations">;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: number;
};

type PlatformMotherDryRunEvidence = {
  actionId: string;
  distributionJobId: string;
  templateId: string;
  templateVersionId?: string;
  templateVersionTag?: string;
  requestedTargetOrganizationIds: string[];
  stagedTargetOrganizationIds: string[];
  rolloutWindow: {
    stageStartIndex: number;
    stageSize: number;
    requestedTargetCount: number;
    stagedTargetCount: number;
  };
};

type PlatformMotherDryRunResult = Awaited<
  ReturnType<typeof runTemplateDistributionLifecycle>
>;

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const entry of value) {
    const resolved = normalizeOptionalString(entry);
    if (!resolved || seen.has(resolved)) {
      continue;
    }
    seen.add(resolved);
    normalized.push(resolved);
  }
  return normalized.sort((left, right) => left.localeCompare(right));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isApprovalStatus(value: string): value is PlatformMotherReviewApprovalStatus {
  return (
    PLATFORM_MOTHER_REVIEW_APPROVAL_STATUS_VALUES as readonly string[]
  ).includes(value);
}

function isExecutionStatus(value: string): value is PlatformMotherReviewExecutionStatus {
  return (
    PLATFORM_MOTHER_REVIEW_EXECUTION_STATUS_VALUES as readonly string[]
  ).includes(value);
}

function isAliasEvidenceKind(value: string): value is PlatformMotherAliasEvidenceKind {
  return (
    PLATFORM_MOTHER_ALIAS_EVIDENCE_KIND_VALUES as readonly string[]
  ).includes(value);
}

function isReviewArtifactKind(value: string): value is PlatformMotherReviewArtifactKind {
  return (
    PLATFORM_MOTHER_REVIEW_ARTIFACT_KIND_VALUES as readonly string[]
  ).includes(value);
}

function isReviewPacketState(value: string): value is PlatformMotherReviewPacketState {
  return (
    PLATFORM_MOTHER_REVIEW_PACKET_STATE_VALUES as readonly string[]
  ).includes(value);
}

function isReviewPacketReason(value: string): value is PlatformMotherReviewPacketReason {
  return (
    PLATFORM_MOTHER_REVIEW_PACKET_REASON_VALUES as readonly string[]
  ).includes(value);
}

function normalizeNonNegativeInteger(value: unknown): number | null {
  if (!Number.isInteger(value) || typeof value !== "number" || value < 0) {
    return null;
  }
  return value;
}

export function normalizePlatformMotherApprovalEnvelope(
  value: unknown,
): PlatformMotherApprovalEnvelope | null {
  if (!isRecord(value)) {
    return null;
  }

  const contractVersion = normalizeOptionalString(value.contractVersion);
  if (
    contractVersion
    && contractVersion !== PLATFORM_MOTHER_APPROVAL_ENVELOPE_CONTRACT_VERSION
  ) {
    return null;
  }

  const status = normalizeOptionalString(value.status);
  if (status && status !== "approved") {
    return null;
  }

  const approverUserId = normalizeOptionalString(value.approverUserId);
  const reason = normalizeOptionalString(value.reason);
  const decidedAt = normalizeOptionalFiniteNumber(value.decidedAt);
  if (!approverUserId || !reason || decidedAt === null) {
    return null;
  }

  const approverRole = normalizeOptionalString(value.approverRole);
  const ticketId = normalizeOptionalString(value.ticketId);
  const notes = normalizeOptionalString(value.notes);

  return {
    contractVersion: PLATFORM_MOTHER_APPROVAL_ENVELOPE_CONTRACT_VERSION,
    status: "approved",
    approverUserId,
    ...(approverRole ? { approverRole } : {}),
    reason,
    ...(ticketId ? { ticketId } : {}),
    ...(notes ? { notes } : {}),
    decidedAt,
  };
}

export function normalizePlatformMotherRejectionEnvelope(
  value: unknown,
): PlatformMotherRejectionEnvelope | null {
  if (!isRecord(value)) {
    return null;
  }

  const contractVersion = normalizeOptionalString(value.contractVersion);
  if (
    contractVersion
    && contractVersion !== PLATFORM_MOTHER_REJECTION_ENVELOPE_CONTRACT_VERSION
  ) {
    return null;
  }

  const status = normalizeOptionalString(value.status);
  if (status && status !== "rejected") {
    return null;
  }

  const reviewerUserId = normalizeOptionalString(value.reviewerUserId);
  const reasonCode = normalizeOptionalString(value.reasonCode);
  const reason = normalizeOptionalString(value.reason);
  const decidedAt = normalizeOptionalFiniteNumber(value.decidedAt);
  if (!reviewerUserId || !reasonCode || !reason || decidedAt === null) {
    return null;
  }

  const ticketId = normalizeOptionalString(value.ticketId);
  const notes = normalizeOptionalString(value.notes);

  return {
    contractVersion: PLATFORM_MOTHER_REJECTION_ENVELOPE_CONTRACT_VERSION,
    status: "rejected",
    reviewerUserId,
    reasonCode,
    reason,
    ...(ticketId ? { ticketId } : {}),
    ...(notes ? { notes } : {}),
    decidedAt,
  };
}

export function normalizePlatformMotherExecutionCorrelation(
  value: unknown,
  options?: {
    defaultStatus?: PlatformMotherReviewExecutionStatus;
  },
): PlatformMotherExecutionCorrelation | null {
  const record = isRecord(value) ? value : {};
  const contractVersion = normalizeOptionalString(record.contractVersion);
  if (
    contractVersion
    && contractVersion !== PLATFORM_MOTHER_EXECUTION_CORRELATION_CONTRACT_VERSION
  ) {
    return null;
  }

  const dryRunCorrelationId =
    normalizeOptionalString(record.dryRunCorrelationId)
    || normalizeOptionalString(record.dryRunId)
    || undefined;
  const downstreamObjectActionIds = normalizeStringArray(
    record.downstreamObjectActionIds ?? record.objectActionIds,
  );
  const downstreamAuditLogIds = normalizeStringArray(
    record.downstreamAuditLogIds ?? record.auditLogIds,
  );
  const templateDistributionJobId = normalizeOptionalString(
    record.templateDistributionJobId,
  );
  const executionSummary = normalizeOptionalString(record.executionSummary);
  const recordedAt = normalizeOptionalFiniteNumber(record.recordedAt) ?? undefined;

  const rawStatus = normalizeOptionalString(record.status);
  let status: PlatformMotherReviewExecutionStatus;
  if (rawStatus) {
    if (!isExecutionStatus(rawStatus)) {
      return null;
    }
    status = rawStatus;
  } else if (
    downstreamObjectActionIds.length > 0
    || downstreamAuditLogIds.length > 0
    || templateDistributionJobId
  ) {
    status = "executed_via_existing_lifecycle";
  } else if (dryRunCorrelationId) {
    status = "dry_run_pending";
  } else {
    status = options?.defaultStatus ?? "not_requested";
  }

  if (
    status === "executed_via_existing_lifecycle"
    && downstreamObjectActionIds.length === 0
    && downstreamAuditLogIds.length === 0
    && !templateDistributionJobId
  ) {
    return null;
  }

  return {
    contractVersion: PLATFORM_MOTHER_EXECUTION_CORRELATION_CONTRACT_VERSION,
    status,
    ...(dryRunCorrelationId ? { dryRunCorrelationId } : {}),
    downstreamObjectActionIds,
    downstreamAuditLogIds,
    ...(templateDistributionJobId ? { templateDistributionJobId } : {}),
    ...(executionSummary ? { executionSummary } : {}),
    ...(recordedAt !== undefined ? { recordedAt } : {}),
  };
}

export function normalizePlatformMotherAliasMigrationEvidence(
  value: unknown,
): PlatformMotherAliasMigrationEvidence | null {
  if (!isRecord(value)) {
    return null;
  }

  const contractVersion = normalizeOptionalString(value.contractVersion);
  if (
    contractVersion
    && contractVersion !== PLATFORM_MOTHER_ALIAS_MIGRATION_EVIDENCE_CONTRACT_VERSION
  ) {
    return null;
  }

  const rawEvidenceKind = normalizeOptionalString(value.evidenceKind);
  const evidenceKind = rawEvidenceKind
    ? (isAliasEvidenceKind(rawEvidenceKind) ? rawEvidenceKind : null)
    : "identity_alias";
  if (!evidenceKind) {
    return null;
  }

  const canonicalIdentityName =
    normalizeOptionalString(value.canonicalIdentityName)
    || PLATFORM_MOTHER_CANONICAL_NAME;
  const legacyIdentityAlias =
    normalizeOptionalString(value.legacyIdentityAlias)
    || normalizeOptionalString(value.legacyIdentityName)
    || PLATFORM_MOTHER_LEGACY_NAME;
  const evidenceSummary = normalizeOptionalString(value.evidenceSummary);
  const recordedAt = normalizeOptionalFiniteNumber(value.recordedAt);
  if (!evidenceSummary || recordedAt === null) {
    return null;
  }

  const matchedFields = normalizeStringArray(value.matchedFields);
  const sourceTemplateId = normalizeOptionalString(value.sourceTemplateId);
  const sourceTemplateVersionId = normalizeOptionalString(
    value.sourceTemplateVersionId,
  );
  const sourceTemplateVersionTag = normalizeOptionalString(
    value.sourceTemplateVersionTag,
  );

  return {
    contractVersion: PLATFORM_MOTHER_ALIAS_MIGRATION_EVIDENCE_CONTRACT_VERSION,
    evidenceKind,
    canonicalIdentityName,
    legacyIdentityAlias,
    evidenceSummary,
    matchedFields,
    ...(sourceTemplateId ? { sourceTemplateId } : {}),
    ...(sourceTemplateVersionId ? { sourceTemplateVersionId } : {}),
    ...(sourceTemplateVersionTag ? { sourceTemplateVersionTag } : {}),
    recordedAt,
  };
}

function normalizePlatformMotherReviewPacket(
  value: unknown,
): PlatformMotherReviewPacket | null {
  if (!isRecord(value)) {
    return null;
  }

  const organizationId = normalizeOptionalString(value.organizationId);
  const rawReviewState = normalizeOptionalString(value.reviewState);
  const riskLevel = normalizeOptionalString(value.riskLevel);
  if (
    !organizationId
    || !rawReviewState
    || !isReviewPacketState(rawReviewState)
    || (riskLevel !== "low" && riskLevel !== "medium" && riskLevel !== "high")
  ) {
    return null;
  }

  const organizationName = normalizeOptionalString(value.organizationName);
  const cloneAgentId = normalizeOptionalString(value.cloneAgentId);
  const cloneLifecycleState = normalizeOptionalString(value.cloneLifecycleState);
  const sourceTemplateVersion = normalizeOptionalString(value.sourceTemplateVersion);
  const targetTemplateVersion = normalizeOptionalString(value.targetTemplateVersion);
  const changedFields = normalizeStringArray(value.changedFields);
  const blockedFields = normalizeStringArray(value.blockedFields);
  const overriddenFields = normalizeStringArray(value.overriddenFields);
  const reviewReasons = normalizeStringArray(value.reviewReasons)
    .filter((entry): entry is PlatformMotherReviewPacketReason => isReviewPacketReason(entry));

  return {
    organizationId,
    ...(organizationName ? { organizationName } : {}),
    reviewState: rawReviewState,
    riskLevel,
    reviewReasons,
    ...(cloneAgentId ? { cloneAgentId } : {}),
    ...(cloneLifecycleState ? { cloneLifecycleState } : {}),
    ...(sourceTemplateVersion ? { sourceTemplateVersion } : {}),
    ...(targetTemplateVersion ? { targetTemplateVersion } : {}),
    changedFields,
    blockedFields,
    overriddenFields,
  };
}

export function normalizePlatformMotherReviewContext(
  value: unknown,
): PlatformMotherReviewContext | null {
  if (!isRecord(value)) {
    return null;
  }

  const contractVersion = normalizeOptionalString(value.contractVersion);
  if (
    contractVersion
    && contractVersion !== PLATFORM_MOTHER_REVIEW_CONTEXT_CONTRACT_VERSION
  ) {
    return null;
  }

  const requestedTargetOrganizationIds = normalizeStringArray(
    value.requestedTargetOrganizationIds,
  );
  if (requestedTargetOrganizationIds.length === 0) {
    return null;
  }
  const stagedTargetOrganizationIds = normalizeStringArray(
    value.stagedTargetOrganizationIds,
  );
  const recentDistributionJobIds = normalizeStringArray(
    value.recentDistributionJobIds,
  );

  const rolloutWindowRecord = isRecord(value.rolloutWindow) ? value.rolloutWindow : null;
  const stageStartIndex =
    normalizeNonNegativeInteger(rolloutWindowRecord?.stageStartIndex) ?? 0;
  const requestedTargetCount =
    normalizeNonNegativeInteger(rolloutWindowRecord?.requestedTargetCount)
    ?? requestedTargetOrganizationIds.length;
  const stagedTargetCount =
    normalizeNonNegativeInteger(rolloutWindowRecord?.stagedTargetCount)
    ?? stagedTargetOrganizationIds.length;
  const stageSize =
    normalizeNonNegativeInteger(rolloutWindowRecord?.stageSize)
    ?? stagedTargetCount;
  const partialRolloutDetected =
    typeof rolloutWindowRecord?.partialRolloutDetected === "boolean"
      ? rolloutWindowRecord.partialRolloutDetected
      : requestedTargetCount > stagedTargetCount;
  const historicalPartialRolloutDetected =
    rolloutWindowRecord?.historicalPartialRolloutDetected === true;

  const driftSummaryRecord = isRecord(value.driftSummary) ? value.driftSummary : null;
  const reviewStateCountsRecord = isRecord(driftSummaryRecord?.reviewStateCounts)
    ? driftSummaryRecord.reviewStateCounts
    : {};
  const riskLevelCountsRecord = isRecord(driftSummaryRecord?.riskLevelCounts)
    ? driftSummaryRecord.riskLevelCounts
    : {};
  const interventionPackets = Array.isArray(value.interventionPackets)
    ? value.interventionPackets
      .map((entry) => normalizePlatformMotherReviewPacket(entry))
      .filter((entry): entry is PlatformMotherReviewPacket => Boolean(entry))
    : [];

  return {
    contractVersion: PLATFORM_MOTHER_REVIEW_CONTEXT_CONTRACT_VERSION,
    requestedTargetOrganizationIds,
    stagedTargetOrganizationIds,
    recentDistributionJobIds,
    rolloutWindow: {
      stageStartIndex,
      stageSize,
      requestedTargetCount,
      stagedTargetCount,
      partialRolloutDetected,
      historicalPartialRolloutDetected,
    },
    driftSummary: {
      totalOrganizations:
        normalizeNonNegativeInteger(driftSummaryRecord?.totalOrganizations)
        ?? requestedTargetOrganizationIds.length,
      missingCloneCount:
        normalizeNonNegativeInteger(driftSummaryRecord?.missingCloneCount) ?? 0,
      interventionCount:
        normalizeNonNegativeInteger(driftSummaryRecord?.interventionCount)
        ?? interventionPackets.length,
      reviewStateCounts: {
        missingClone:
          normalizeNonNegativeInteger(reviewStateCountsRecord.missingClone) ?? 0,
        inSync:
          normalizeNonNegativeInteger(reviewStateCountsRecord.inSync) ?? 0,
        overridden:
          normalizeNonNegativeInteger(reviewStateCountsRecord.overridden) ?? 0,
        stale:
          normalizeNonNegativeInteger(reviewStateCountsRecord.stale) ?? 0,
        blocked:
          normalizeNonNegativeInteger(reviewStateCountsRecord.blocked) ?? 0,
      },
      riskLevelCounts: {
        low: normalizeNonNegativeInteger(riskLevelCountsRecord.low) ?? 0,
        medium: normalizeNonNegativeInteger(riskLevelCountsRecord.medium) ?? 0,
        high: normalizeNonNegativeInteger(riskLevelCountsRecord.high) ?? 0,
      },
    },
    interventionPackets,
  };
}

export function normalizePlatformMotherPolicyFamilyScope(
  value: unknown,
): PlatformMotherPolicyFamilyScope | null {
  if (!isRecord(value)) {
    return null;
  }

  const contractVersion = normalizeOptionalString(value.contractVersion);
  if (
    contractVersion
    && contractVersion !== PLATFORM_MOTHER_POLICY_FAMILY_CONTRACT_VERSION
  ) {
    return null;
  }

  const evaluatedFields = normalizeStringArray(value.evaluatedFields);
  const motherOwnedLockedFields = normalizeStringArray(value.motherOwnedLockedFields);
  const motherOwnedWarnFields = normalizeStringArray(value.motherOwnedWarnFields);
  const customerOwnedContextFields = normalizeStringArray(
    value.customerOwnedContextFields,
  );
  const outOfScopeFields = normalizeStringArray(value.outOfScopeFields);
  const eligible =
    typeof value.eligible === "boolean"
      ? value.eligible
      : outOfScopeFields.length === 0;

  return {
    contractVersion: PLATFORM_MOTHER_POLICY_FAMILY_CONTRACT_VERSION,
    evaluatedFields,
    motherOwnedLockedFields,
    motherOwnedWarnFields,
    customerOwnedContextFields,
    outOfScopeFields,
    eligible,
  };
}

export function normalizePlatformMotherRolloutGateRequirements(
  value: unknown,
): PlatformMotherRolloutGateRequirements | null {
  if (!isRecord(value)) {
    return null;
  }

  const contractVersion = normalizeOptionalString(value.contractVersion);
  if (
    contractVersion
    && contractVersion !== PLATFORM_MOTHER_ROLLOUT_GATE_REQUIREMENTS_CONTRACT_VERSION
  ) {
    return null;
  }

  const targetTemplateRole = normalizeOptionalString(value.targetTemplateRole);
  if (!targetTemplateRole) {
    return null;
  }

  const targetTemplateVersionId = normalizeOptionalString(value.targetTemplateVersionId);
  const targetTemplateVersionTag = normalizeOptionalString(
    value.targetTemplateVersionTag,
  );
  const requiredEvidence = normalizeStringArray(value.requiredEvidence);
  const satisfiedEvidence = normalizeStringArray(value.satisfiedEvidence);
  const dryRunCorrelationId = normalizeOptionalString(value.dryRunCorrelationId);
  const rawStatus = normalizeOptionalString(value.status);
  const status =
    rawStatus === "satisfied_for_review"
    || rawStatus === "required_before_execution"
      ? rawStatus
      : dryRunCorrelationId
        ? "satisfied_for_review"
        : "required_before_execution";

  return {
    contractVersion: PLATFORM_MOTHER_ROLLOUT_GATE_REQUIREMENTS_CONTRACT_VERSION,
    targetTemplateRole,
    ...(targetTemplateVersionId ? { targetTemplateVersionId } : {}),
    ...(targetTemplateVersionTag ? { targetTemplateVersionTag } : {}),
    requiredEvidence,
    satisfiedEvidence,
    status,
    ...(dryRunCorrelationId ? { dryRunCorrelationId } : {}),
  };
}

export function normalizePlatformMotherReviewArtifact(
  value: unknown,
  options?: {
    defaultCreatedAt?: number;
    defaultCreatedByUserId?: string | null;
  },
): PlatformMotherReviewArtifact | null {
  if (!isRecord(value)) {
    return null;
  }

  const contractVersion = normalizeOptionalString(value.contractVersion);
  if (
    contractVersion
    && contractVersion !== PLATFORM_MOTHER_REVIEW_ARTIFACT_CONTRACT_VERSION
  ) {
    return null;
  }

  const rawArtifactKind = normalizeOptionalString(value.artifactKind);
  const artifactKind = rawArtifactKind
    ? (isReviewArtifactKind(rawArtifactKind) ? rawArtifactKind : null)
    : PLATFORM_MOTHER_REVIEW_ARTIFACT_KIND;
  if (!artifactKind) {
    return null;
  }

  const targetTemplateRole = normalizeOptionalString(value.targetTemplateRole);
  const proposalSummary = normalizeOptionalString(value.proposalSummary);
  if (!targetTemplateRole || !proposalSummary) {
    return null;
  }

  const approval = normalizePlatformMotherApprovalEnvelope(value.approval);
  const rejection = normalizePlatformMotherRejectionEnvelope(value.rejection);

  const rawApprovalStatus = normalizeOptionalString(value.approvalStatus);
  const approvalStatus = rawApprovalStatus
    ? (isApprovalStatus(rawApprovalStatus) ? rawApprovalStatus : null)
    : approval
      ? "approved"
      : rejection
        ? "rejected"
        : "pending";
  if (!approvalStatus) {
    return null;
  }

  if (approvalStatus === "approved" && !approval) {
    return null;
  }
  if (approvalStatus === "rejected" && !rejection) {
    return null;
  }
  if (approval && approvalStatus !== "approved") {
    return null;
  }
  if (rejection && approvalStatus !== "rejected") {
    return null;
  }

  const defaultExecutionStatus: PlatformMotherReviewExecutionStatus =
    approvalStatus === "approved"
      ? "approved_no_execution"
      : normalizeOptionalString(value.dryRunCorrelationId)
        ? "dry_run_pending"
        : "not_requested";

  const execution = normalizePlatformMotherExecutionCorrelation(
    isRecord(value.execution)
      ? value.execution
      : { dryRunCorrelationId: value.dryRunCorrelationId },
    {
      defaultStatus: defaultExecutionStatus,
    },
  );
  if (!execution) {
    return null;
  }

  const rawExecutionStatus = normalizeOptionalString(value.executionStatus);
  if (rawExecutionStatus && rawExecutionStatus !== execution.status) {
    return null;
  }

  const aliasMigrationEvidence = normalizePlatformMotherAliasMigrationEvidence(
    value.aliasMigrationEvidence,
  );
  if (value.aliasMigrationEvidence && !aliasMigrationEvidence) {
    return null;
  }
  const reviewContext = normalizePlatformMotherReviewContext(value.reviewContext);
  if (value.reviewContext && !reviewContext) {
    return null;
  }
  const targetTemplateId = normalizeOptionalString(value.targetTemplateId);
  const targetTemplateVersionId = normalizeOptionalString(
    value.targetTemplateVersionId,
  );
  const targetTemplateVersionTag = normalizeOptionalString(
    value.targetTemplateVersionTag,
  );
  const requestingOrganizationId = normalizeOptionalString(
    value.requestingOrganizationId,
  );
  const sourceConversationId = normalizeOptionalString(value.sourceConversationId);
  const sourceMotherRuntimeId = normalizeOptionalString(value.sourceMotherRuntimeId);
  const sourceMessageId = normalizeOptionalString(value.sourceMessageId);
  const proposalDetails = normalizeOptionalString(value.proposalDetails);
  const createdByUserId =
    normalizeOptionalString(value.createdByUserId)
    || normalizeOptionalString(options?.defaultCreatedByUserId ?? undefined)
    || undefined;
  const createdAt =
    normalizeOptionalFiniteNumber(value.createdAt)
    ?? normalizeOptionalFiniteNumber(options?.defaultCreatedAt)
    ?? null;
  if (createdAt === null) {
    return null;
  }

  const normalizedPolicyFamilyScope = normalizePlatformMotherPolicyFamilyScope(
    value.policyFamilyScope,
  );
  if (value.policyFamilyScope && !normalizedPolicyFamilyScope) {
    return null;
  }
  const normalizedRolloutGateRequirements = normalizePlatformMotherRolloutGateRequirements(
    value.rolloutGateRequirements,
  );
  if (value.rolloutGateRequirements && !normalizedRolloutGateRequirements) {
    return null;
  }
  const policyFamilyScope =
    normalizedPolicyFamilyScope || resolvePlatformMotherPolicyFamilyScope([]);
  const rolloutGateRequirements =
    normalizedRolloutGateRequirements || buildPlatformMotherRolloutGateRequirements({
      targetTemplateRole,
      targetTemplateVersionId,
      targetTemplateVersionTag,
      dryRunCorrelationId: execution.dryRunCorrelationId,
    });

  if (artifactKind !== PLATFORM_MOTHER_REVIEW_ARTIFACT_KIND) {
    if (!aliasMigrationEvidence || !reviewContext) {
      return null;
    }
    if (
      !execution.dryRunCorrelationId
      || execution.downstreamObjectActionIds.length === 0
      || reviewContext.requestedTargetOrganizationIds.length === 0
    ) {
      return null;
    }
    if (
      artifactKind === "org_intervention_review"
      && reviewContext.interventionPackets.length === 0
    ) {
      return null;
    }
  }

  return {
    contractVersion: PLATFORM_MOTHER_REVIEW_ARTIFACT_CONTRACT_VERSION,
    artifactKind,
    targetTemplateRole,
    ...(targetTemplateId ? { targetTemplateId } : {}),
    ...(targetTemplateVersionId ? { targetTemplateVersionId } : {}),
    ...(targetTemplateVersionTag ? { targetTemplateVersionTag } : {}),
    ...(requestingOrganizationId ? { requestingOrganizationId } : {}),
    ...(sourceConversationId ? { sourceConversationId } : {}),
    ...(sourceMotherRuntimeId ? { sourceMotherRuntimeId } : {}),
    ...(sourceMessageId ? { sourceMessageId } : {}),
    proposalSummary,
    ...(proposalDetails ? { proposalDetails } : {}),
    approvalStatus,
    executionStatus: execution.status,
    approval,
    rejection,
    execution,
    aliasMigrationEvidence,
    reviewContext: reviewContext ?? null,
    policyFamilyScope,
    rolloutGateRequirements,
    createdAt,
    ...(createdByUserId ? { createdByUserId } : {}),
  };
}

export function buildPlatformMotherReviewArtifactAuditEnvelope(args: {
  artifactId: string;
  platformOrganizationId: string;
  artifact: PlatformMotherReviewArtifact;
  actorUserId?: string | null;
}): PlatformMotherReviewArtifactAuditEnvelope {
  return {
    contractVersion: PLATFORM_MOTHER_REVIEW_AUDIT_ENVELOPE_CONTRACT_VERSION,
    artifactContractVersion: PLATFORM_MOTHER_REVIEW_ARTIFACT_CONTRACT_VERSION,
    readOnly: true,
    action: PLATFORM_MOTHER_REVIEW_ACTION_RECORDED,
    artifactId: args.artifactId,
    artifactKind: args.artifact.artifactKind,
    platformOrganizationId: args.platformOrganizationId,
    motherIdentity: {
      canonicalName: PLATFORM_MOTHER_CANONICAL_NAME,
      legacyAlias: PLATFORM_MOTHER_LEGACY_NAME,
    },
    actor: {
      ...(args.actorUserId ? { userId: args.actorUserId } : {}),
    },
    target: {
      templateRole: args.artifact.targetTemplateRole,
      ...(args.artifact.targetTemplateId
        ? { templateId: args.artifact.targetTemplateId }
        : {}),
      ...(args.artifact.targetTemplateVersionId
        ? { templateVersionId: args.artifact.targetTemplateVersionId }
        : {}),
      ...(args.artifact.targetTemplateVersionTag
        ? { templateVersionTag: args.artifact.targetTemplateVersionTag }
        : {}),
    },
    source: {
      ...(args.artifact.requestingOrganizationId
        ? { requestingOrganizationId: args.artifact.requestingOrganizationId }
        : {}),
      ...(args.artifact.sourceConversationId
        ? { conversationId: args.artifact.sourceConversationId }
        : {}),
      ...(args.artifact.sourceMotherRuntimeId
        ? { motherRuntimeId: args.artifact.sourceMotherRuntimeId }
        : {}),
      ...(args.artifact.sourceMessageId
        ? { messageId: args.artifact.sourceMessageId }
        : {}),
    },
    proposal: {
      summary: args.artifact.proposalSummary,
      ...(args.artifact.proposalDetails
        ? { details: args.artifact.proposalDetails }
        : {}),
      approvalStatus: args.artifact.approvalStatus,
      executionStatus: args.artifact.executionStatus,
      ...(args.artifact.execution.dryRunCorrelationId
        ? { dryRunCorrelationId: args.artifact.execution.dryRunCorrelationId }
        : {}),
    },
    approval: args.artifact.approval,
    rejection: args.artifact.rejection,
    execution: args.artifact.execution,
    aliasMigrationEvidence: args.artifact.aliasMigrationEvidence,
    reviewContext: args.artifact.reviewContext,
    policyFamilyScope: args.artifact.policyFamilyScope,
    rolloutGateRequirements: args.artifact.rolloutGateRequirements,
    createdAt: args.artifact.createdAt,
    ...(args.artifact.createdByUserId
      ? { createdByUserId: args.artifact.createdByUserId }
      : {}),
  };
}

function buildPlatformMotherReviewArtifactName(
  artifact: PlatformMotherReviewArtifact,
): string {
  return [
    "Mother Review",
    artifact.artifactKind,
    artifact.targetTemplateRole,
    `${artifact.createdAt}`,
  ].join(" | ");
}

function resolvePlatformOrgIdFromEnv(): Id<"organizations"> {
  const platformOrgId = normalizeOptionalString(process.env.PLATFORM_ORG_ID);
  if (platformOrgId) {
    return platformOrgId as Id<"organizations">;
  }
  const testOrgId = normalizeOptionalString(process.env.TEST_ORG_ID);
  if (testOrgId) {
    return testOrgId as Id<"organizations">;
  }
  throw new Error(
    "PLATFORM_ORG_ID or TEST_ORG_ID must be set for Platform Mother review artifacts.",
  );
}

function resolveTemplateLifecycleVersionContext(
  customProperties: Record<string, unknown> | undefined,
): {
  templateVersionId?: string;
  templateVersionTag?: string;
} {
  const templateVersionId = normalizeOptionalString(
    customProperties?.templatePublishedVersionId,
  );
  const templateVersionTag =
    normalizeOptionalString(customProperties?.templatePublishedVersion)
    || normalizeOptionalString(customProperties?.templateVersion);

  return {
    ...(templateVersionId ? { templateVersionId } : {}),
    ...(templateVersionTag ? { templateVersionTag } : {}),
  };
}

function buildPlatformMotherProposalDryRunId(args: {
  targetTemplateRole: string;
  requestingOrganizationId?: Id<"organizations">;
  sourceConversationId?: Id<"aiConversations">;
  runtimeMode: PlatformMotherRuntimeMode;
  timestamp: number;
}): string {
  const conversationPart =
    normalizeOptionalString(args.sourceConversationId)
    || normalizeOptionalString(args.requestingOrganizationId)
    || "platform";
  return [
    "platform_mother",
    args.runtimeMode,
    args.targetTemplateRole,
    conversationPart,
    `${args.timestamp}`,
  ].join(":");
}

function dedupeAndSortOrganizationIds(
  values: Id<"organizations">[],
): Id<"organizations">[] {
  return Array.from(new Set(values.map((value) => String(value))))
    .sort((left, right) => left.localeCompare(right))
    .map((value) => value as Id<"organizations">);
}

async function resolvePlatformMotherRuntimeContext(
  ctx: MutationCtx,
  args: {
    runtimeMode: PlatformMotherRuntimeMode;
    sourceConversationId?: Id<"aiConversations">;
    sourceMotherRuntimeId?: Id<"objects">;
    requestingOrganizationId?: Id<"organizations">;
  },
): Promise<{
  requestingOrganizationId?: Id<"organizations">;
  sourceConversationId?: Id<"aiConversations">;
  sourceMotherRuntimeId: Id<"objects">;
  sourceMotherRuntime: PlatformMotherRuntimeRecord;
}> {
  if (
    args.runtimeMode === PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT
    && !args.sourceConversationId
  ) {
    throw new ConvexError({
      code: "INVALID_PLATFORM_MOTHER_PROPOSAL_CONTEXT",
      message: "Mother support proposal capture requires an explicit support conversation.",
    });
  }

  const conversation = args.sourceConversationId
    ? (await ctx.db.get(args.sourceConversationId)) as PlatformMotherSupportConversationRecord | null
    : null;
  if (args.sourceConversationId && !conversation) {
    throw new ConvexError({
      code: "INVALID_PLATFORM_MOTHER_PROPOSAL_CONTEXT",
      message: "Source conversation for Mother proposal capture was not found.",
      conversationId: String(args.sourceConversationId),
    });
  }

  if (
    conversation
    && args.requestingOrganizationId
    && String(conversation.organizationId) !== String(args.requestingOrganizationId)
  ) {
    throw new ConvexError({
      code: "INVALID_PLATFORM_MOTHER_PROPOSAL_CONTEXT",
      message: "Mother proposal requesting organization must match the source conversation organization.",
      conversationId: String(conversation._id),
    });
  }

  const resolvedRuntimeId =
    args.sourceMotherRuntimeId ?? conversation?.targetAgentId ?? null;
  if (!resolvedRuntimeId) {
    throw new ConvexError({
      code: "INVALID_PLATFORM_MOTHER_PROPOSAL_CONTEXT",
      message: "Mother proposal capture requires a source Mother runtime.",
    });
  }

  if (
    conversation?.targetAgentId
    && String(conversation.targetAgentId) !== String(resolvedRuntimeId)
  ) {
    throw new ConvexError({
      code: "INVALID_PLATFORM_MOTHER_PROPOSAL_CONTEXT",
      message: "Source conversation target must match the Mother runtime used for proposal capture.",
      conversationId: String(conversation._id),
      sourceMotherRuntimeId: String(resolvedRuntimeId),
    });
  }

  const runtime = await ctx.db.get(resolvedRuntimeId) as PlatformMotherRuntimeRecord | null;
  if (
    !runtime
    || runtime.type !== "org_agent"
    || runtime.status !== "active"
    || !isPlatformMotherAuthorityRecord(
      runtime.name,
      runtime.customProperties ?? undefined,
    )
    || readPlatformMotherRuntimeMode(runtime.customProperties ?? undefined) !== args.runtimeMode
  ) {
    throw new ConvexError({
      code: "INVALID_PLATFORM_MOTHER_PROPOSAL_CONTEXT",
      message: "Source runtime is not an active Mother runtime for the requested proposal mode.",
      sourceMotherRuntimeId: String(resolvedRuntimeId),
      runtimeMode: args.runtimeMode,
    });
  }

  return {
    ...(conversation ? { sourceConversationId: conversation._id } : {}),
    ...(args.requestingOrganizationId || conversation?.organizationId
      ? {
          requestingOrganizationId:
            args.requestingOrganizationId ?? conversation?.organizationId,
        }
      : {}),
    sourceMotherRuntimeId: runtime._id,
    sourceMotherRuntime: runtime,
  };
}

async function resolveProtectedTemplateByRole(
  ctx: MutationCtx,
  args: {
    platformOrganizationId: Id<"organizations">;
    templateRole: string;
  },
): Promise<ProtectedTemplateRecord> {
  const candidates = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", args.platformOrganizationId).eq("type", "org_agent")
    )
    .collect();

  const template = candidates
    .filter((candidate) => candidate.status === "template")
    .filter((candidate) => {
      const customProperties =
        (candidate.customProperties as Record<string, unknown> | undefined) ?? {};
      return (
        customProperties.protected === true
        && normalizeOptionalString(customProperties.templateRole) === args.templateRole
      );
    })
    .sort((left, right) => String(left._id).localeCompare(String(right._id)))[0];

  if (!template) {
    throw new ConvexError({
      code: "PLATFORM_MOTHER_TEMPLATE_TARGET_NOT_FOUND",
      message: "Canonical protected template for Mother proposal capture was not found.",
      targetTemplateRole: args.templateRole,
    });
  }

  return template as ProtectedTemplateRecord;
}

async function resolveProtectedTemplateBaselineContext(
  ctx: MutationCtx,
  template: ProtectedTemplateRecord,
): Promise<{
  templateVersionId?: string;
  templateVersionTag?: string;
  templateBaseline: Record<string, unknown>;
}> {
  const templateProps =
    (template.customProperties as Record<string, unknown> | undefined) ?? {};
  const versionContext = resolveTemplateLifecycleVersionContext(templateProps);
  let templateBaseline = pickTemplateBaselineSnapshot(templateProps);
  let templateVersionTag = versionContext.templateVersionTag;

  if (versionContext.templateVersionId) {
    const versionRecord = await ctx.db.get(
      versionContext.templateVersionId as Id<"objects">,
    );
    if (!versionRecord || versionRecord.type !== "org_agent_template_version") {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_TEMPLATE_VERSION_NOT_FOUND",
        message: "Protected template version for Mother governance review was not found.",
        targetTemplateId: String(template._id),
        targetTemplateVersionId: versionContext.templateVersionId,
      });
    }
    const versionProps =
      (versionRecord.customProperties as Record<string, unknown> | undefined) ?? {};
    const sourceTemplateId = normalizeOptionalString(versionProps.sourceTemplateId);
    if (sourceTemplateId && sourceTemplateId !== String(template._id)) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_TEMPLATE_VERSION_MISMATCH",
        message: "Protected template version does not belong to the requested Mother review template.",
        targetTemplateId: String(template._id),
        targetTemplateVersionId: versionContext.templateVersionId,
      });
    }
    const snapshot =
      (isRecord(versionProps.snapshot)
        ? versionProps.snapshot.baselineCustomProperties
        : null) as Record<string, unknown> | null;
    if (snapshot && isRecord(snapshot)) {
      templateBaseline = snapshot;
    }
    templateVersionTag =
      normalizeOptionalString(versionProps.versionTag)
      || normalizeOptionalString(versionProps.templateVersionTag)
      || templateVersionTag;
  }

  return {
    ...(versionContext.templateVersionId
      ? { templateVersionId: versionContext.templateVersionId }
      : {}),
    ...(templateVersionTag ? { templateVersionTag } : {}),
    templateBaseline,
  };
}

function buildPlatformMotherAliasEvidence(args: {
  sourceMotherRuntime: PlatformMotherRuntimeRecord;
  targetTemplate: ProtectedTemplateRecord;
  targetTemplateVersionId?: string;
  targetTemplateVersionTag?: string;
  recordedAt: number;
  artifactKind: PlatformMotherReviewArtifactKind;
}): PlatformMotherAliasMigrationEvidence | null {
  const runtimeProps =
    (args.sourceMotherRuntime.customProperties as Record<string, unknown> | undefined) ?? {};
  const matchedFields: string[] = [];
  const canonicalIdentityName = normalizeOptionalString(runtimeProps.canonicalIdentityName);
  const runtimeName = normalizeOptionalString(args.sourceMotherRuntime.name);
  if (
    canonicalIdentityName?.toLowerCase() === PLATFORM_MOTHER_CANONICAL_NAME.toLowerCase()
  ) {
    matchedFields.push("canonicalIdentityName");
  } else if (runtimeName?.toLowerCase() === PLATFORM_MOTHER_CANONICAL_NAME.toLowerCase()) {
    matchedFields.push("name");
  }
  if (
    normalizeStringArray(runtimeProps.legacyIdentityAliases)
      .some((entry) => entry.toLowerCase() === PLATFORM_MOTHER_LEGACY_NAME.toLowerCase())
  ) {
    matchedFields.push("legacyIdentityAliases");
  }

  if (
    !matchedFields.includes("legacyIdentityAliases")
    || !(matchedFields.includes("canonicalIdentityName") || matchedFields.includes("name"))
  ) {
    return null;
  }

  return {
    contractVersion: PLATFORM_MOTHER_ALIAS_MIGRATION_EVIDENCE_CONTRACT_VERSION,
    evidenceKind: "lookup_fallback",
    canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
    legacyIdentityAlias: PLATFORM_MOTHER_LEGACY_NAME,
    evidenceSummary:
      `Mother ${args.artifactKind} preserved Quinn alias-safe runtime resolution for governance review.`,
    matchedFields: normalizeStringArray(matchedFields),
    sourceTemplateId: String(args.targetTemplate._id),
    ...(args.targetTemplateVersionId ? { sourceTemplateVersionId: args.targetTemplateVersionId } : {}),
    ...(args.targetTemplateVersionTag
      ? { sourceTemplateVersionTag: args.targetTemplateVersionTag }
      : {}),
    recordedAt: args.recordedAt,
  };
}

async function resolveGovernanceReviewOrganizations(
  ctx: MutationCtx,
  args: {
    platformOrganizationId: Id<"organizations">;
    targetOrganizationIds?: Id<"organizations">[];
    requestingOrganizationId?: Id<"organizations">;
  },
): Promise<OrganizationRecord[]> {
  const explicitTargetIds = dedupeAndSortOrganizationIds([
    ...(args.targetOrganizationIds ?? []),
    ...(args.requestingOrganizationId ? [args.requestingOrganizationId] : []),
  ]);

  if (explicitTargetIds.length > 0) {
    const organizations = await Promise.all(
      explicitTargetIds.map(async (organizationId) => {
        const org = await ctx.db.get(organizationId);
        if (!org) {
          throw new ConvexError({
            code: "PLATFORM_MOTHER_REVIEW_TARGET_NOT_FOUND",
            message: "Mother governance review target organization was not found.",
            organizationId: String(organizationId),
          });
        }
        if (String(org._id) === String(args.platformOrganizationId)) {
          throw new ConvexError({
            code: "PLATFORM_MOTHER_REVIEW_TARGET_INVALID",
            message: "Mother governance review cannot target the platform organization.",
            organizationId: String(organizationId),
          });
        }
        if (normalizeOptionalString(org.onboardingLifecycleState) === "provisional_onboarding") {
          throw new ConvexError({
            code: "PLATFORM_MOTHER_REVIEW_TARGET_INVALID",
            message: "Mother governance review requires bootstrapped or claimed organizations only.",
            organizationId: String(organizationId),
          });
        }
        return org as OrganizationRecord;
      }),
    );
    return organizations.sort((left, right) =>
      String(left._id).localeCompare(String(right._id))
    );
  }

  const organizations = (
    await ctx.db.query("organizations").collect()
  ) as OrganizationRecord[];
  return organizations
    .filter((organization) => String(organization._id) !== String(args.platformOrganizationId))
    .filter((organization) =>
      normalizeOptionalString(organization.onboardingLifecycleState) !== "provisional_onboarding"
    )
    .sort((left, right) => String(left._id).localeCompare(String(right._id)));
}

async function loadRecentTemplateDistributionTelemetry(
  ctx: MutationCtx,
  templateId: Id<"objects">,
): Promise<{
  recentDistributionJobIds: string[];
  historicalPartialRolloutDetected: boolean;
}> {
  const telemetryRows = (
    await ctx.db
      .query("objectActions")
      .withIndex("by_object", (q) => q.eq("objectId", templateId))
      .collect()
  ) as TemplateDistributionTelemetryRow[];

  const normalizedRows = telemetryRows
    .filter((row) =>
      row.actionType === "template_distribution_plan_generated"
      || row.actionType === "template_distribution_applied"
    )
    .map((row) => {
      const actionData = isRecord(row.actionData) ? row.actionData : {};
      const distributionJobId = normalizeOptionalString(actionData.distributionJobId);
      if (!distributionJobId) {
        return null;
      }
      const rolloutWindow = isRecord(actionData.rolloutWindow) ? actionData.rolloutWindow : {};
      const requestedTargetCount =
        normalizeNonNegativeInteger(rolloutWindow.requestedTargetCount) ?? 0;
      const stagedTargetCount =
        normalizeNonNegativeInteger(rolloutWindow.stagedTargetCount) ?? requestedTargetCount;
      return {
        distributionJobId,
        performedAt: typeof row.performedAt === "number" ? row.performedAt : 0,
        partialRolloutDetected: requestedTargetCount > stagedTargetCount,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((left, right) => {
      if (left.performedAt !== right.performedAt) {
        return right.performedAt - left.performedAt;
      }
      return left.distributionJobId.localeCompare(right.distributionJobId);
    });

  return {
    recentDistributionJobIds: normalizedRows
      .slice(0, 5)
      .map((row) => row.distributionJobId),
    historicalPartialRolloutDetected: normalizedRows
      .some((row) => row.partialRolloutDetected),
  };
}

function resolvePlatformMotherPolicyScopeFromDryRun(
  dryRunResult: PlatformMotherDryRunResult,
): PlatformMotherPolicyFamilyScope {
  return resolvePlatformMotherPolicyFamilyScope(
    (dryRunResult.plan ?? []).flatMap((row) => [
      ...(row.changedFields ?? []),
      ...(row.writableTemplateFields ?? []),
      ...(row.policyGate?.evaluatedFields ?? []),
      ...(row.policyGate?.changedFields ?? []),
      ...(row.policyGate?.lockedFields ?? []),
      ...(row.policyGate?.warnFields ?? []),
      ...(row.policyGate?.freeFields ?? []),
    ]),
  );
}

function buildPlatformMotherExecutionFromDryRun(args: {
  dryRunResult: PlatformMotherDryRunResult;
  executionSummary: string;
}): PlatformMotherExecutionCorrelation {
  return {
    contractVersion: PLATFORM_MOTHER_EXECUTION_CORRELATION_CONTRACT_VERSION,
    status: "dry_run_pending",
    dryRunCorrelationId: args.dryRunResult.distributionJobId,
    downstreamObjectActionIds: [String(args.dryRunResult.lifecycleActionId)],
    downstreamAuditLogIds: [],
    templateDistributionJobId: args.dryRunResult.distributionJobId,
    executionSummary: args.executionSummary,
    recordedAt: args.dryRunResult.recordedAt,
  };
}

function serializePlatformMotherDryRunResult(
  dryRunResult: PlatformMotherDryRunResult,
) {
  return {
    distributionJobId: dryRunResult.distributionJobId,
    templateId: String(dryRunResult.templateId),
    templateVersionId: dryRunResult.templateVersionId
      ? String(dryRunResult.templateVersionId)
      : undefined,
    templateVersion: dryRunResult.templateVersion,
    targetOrganizationIds: dryRunResult.targetOrganizationIds.map((value) =>
      String(value),
    ),
    requestedTargetOrganizationIds: dryRunResult.requestedTargetOrganizationIds.map((value) =>
      String(value),
    ),
    rolloutWindow: dryRunResult.rolloutWindow,
    summary: dryRunResult.summary,
    policyGates: dryRunResult.policyGates,
    reasonCounts: dryRunResult.reasonCounts,
    plan: dryRunResult.plan,
    lifecycleActionId: String(dryRunResult.lifecycleActionId),
    recordedAt: dryRunResult.recordedAt,
  };
}

async function loadPlatformMotherDryRunEvidence(
  ctx: MutationCtx,
  args: {
    artifact: PlatformMotherReviewArtifactRecord;
    platformOrganizationId: Id<"organizations">;
  },
): Promise<PlatformMotherDryRunEvidence> {
  const dryRunCorrelationId = normalizeOptionalString(
    args.artifact.execution.dryRunCorrelationId,
  );
  if (!dryRunCorrelationId) {
    throw new ConvexError({
      code: "PLATFORM_MOTHER_DRY_RUN_CORRELATION_REQUIRED",
      message: "Mother approved execution requires a persisted dry-run correlation ID.",
      artifactId: args.artifact.artifactId,
    });
  }

  const candidateActions = (
    await Promise.all(
      args.artifact.execution.downstreamObjectActionIds.map(async (id) =>
        ctx.db.get(id as Id<"objectActions">)
      ),
    )
  ).filter((row) => Boolean(row)) as ObjectActionRow[];

  const dryRunAction = candidateActions.find((row) => {
    if (row.actionType !== "template_distribution_plan_generated") {
      return false;
    }
    const actionData = isRecord(row.actionData) ? row.actionData : {};
    return normalizeOptionalString(actionData.distributionJobId) === dryRunCorrelationId;
  });

  if (!dryRunAction) {
    throw new ConvexError({
      code: "PLATFORM_MOTHER_DRY_RUN_EVIDENCE_MISSING",
      message: "Mother approved execution requires persisted dry-run lifecycle evidence.",
      artifactId: args.artifact.artifactId,
      dryRunCorrelationId,
    });
  }

  const actionData = isRecord(dryRunAction.actionData) ? dryRunAction.actionData : {};
  const templateId = normalizeOptionalString(actionData.templateId);
  const templateVersionId = normalizeOptionalString(actionData.templateVersionId);
  const templateVersionTag = normalizeOptionalString(actionData.templateVersion);
  const requestedTargetOrganizationIds = normalizeStringArray(
    actionData.requestedTargetOrganizationIds,
  );
  const stagedTargetOrganizationIds = normalizeStringArray(
    actionData.targetOrganizationIds,
  );
  const rolloutWindow = isRecord(actionData.rolloutWindow) ? actionData.rolloutWindow : {};
  const stageStartIndex =
    normalizeNonNegativeInteger(rolloutWindow.stageStartIndex) ?? 0;
  const stageSize =
    normalizeNonNegativeInteger(rolloutWindow.stageSize)
    ?? stagedTargetOrganizationIds.length;
  const requestedTargetCount =
    normalizeNonNegativeInteger(rolloutWindow.requestedTargetCount)
    ?? requestedTargetOrganizationIds.length;
  const stagedTargetCount =
    normalizeNonNegativeInteger(rolloutWindow.stagedTargetCount)
    ?? stagedTargetOrganizationIds.length;

  if (
    !templateId
    || requestedTargetOrganizationIds.length === 0
    || stagedTargetOrganizationIds.length === 0
  ) {
    throw new ConvexError({
      code: "PLATFORM_MOTHER_DRY_RUN_EVIDENCE_MISSING",
      message: "Mother approved execution requires complete dry-run target evidence.",
      artifactId: args.artifact.artifactId,
      dryRunCorrelationId,
    });
  }

  if (
    args.artifact.targetTemplateId
    && args.artifact.targetTemplateId !== templateId
  ) {
    throw new ConvexError({
      code: "PLATFORM_MOTHER_EXECUTION_CONTEXT_MISMATCH",
      message: "Mother approved execution dry-run target does not match the review artifact template.",
      artifactId: args.artifact.artifactId,
      dryRunCorrelationId,
    });
  }
  if (
    args.artifact.targetTemplateVersionId
    && args.artifact.targetTemplateVersionId !== templateVersionId
  ) {
    throw new ConvexError({
      code: "PLATFORM_MOTHER_EXECUTION_CONTEXT_MISMATCH",
      message: "Mother approved execution dry-run template version does not match the review artifact.",
      artifactId: args.artifact.artifactId,
      dryRunCorrelationId,
    });
  }
  if (
    args.artifact.targetTemplateVersionTag
    && args.artifact.targetTemplateVersionTag !== templateVersionTag
  ) {
    throw new ConvexError({
      code: "PLATFORM_MOTHER_EXECUTION_CONTEXT_MISMATCH",
      message: "Mother approved execution dry-run template version tag does not match the review artifact.",
      artifactId: args.artifact.artifactId,
      dryRunCorrelationId,
    });
  }

  const reviewContext = args.artifact.reviewContext;
  if (
    reviewContext
    && (
      JSON.stringify(reviewContext.requestedTargetOrganizationIds)
        !== JSON.stringify(requestedTargetOrganizationIds)
      || JSON.stringify(reviewContext.stagedTargetOrganizationIds)
        !== JSON.stringify(stagedTargetOrganizationIds)
      || reviewContext.rolloutWindow.stageStartIndex !== stageStartIndex
      || reviewContext.rolloutWindow.stageSize !== stageSize
      || reviewContext.rolloutWindow.requestedTargetCount !== requestedTargetCount
      || reviewContext.rolloutWindow.stagedTargetCount !== stagedTargetCount
    )
  ) {
    throw new ConvexError({
      code: "PLATFORM_MOTHER_EXECUTION_CONTEXT_MISMATCH",
      message: "Mother approved execution dry-run evidence no longer matches the persisted review context.",
      artifactId: args.artifact.artifactId,
      dryRunCorrelationId,
    });
  }

  return {
    actionId: String(dryRunAction._id),
    distributionJobId: dryRunCorrelationId,
    templateId,
    ...(templateVersionId ? { templateVersionId } : {}),
    ...(templateVersionTag ? { templateVersionTag } : {}),
    requestedTargetOrganizationIds,
    stagedTargetOrganizationIds,
    rolloutWindow: {
      stageStartIndex,
      stageSize,
      requestedTargetCount,
      stagedTargetCount,
    },
  };
}

async function collectTemplateDistributionEvidenceByJobId(
  ctx: MutationCtx,
  distributionJobId: string,
) {
  const objectActions = (
    await ctx.db.query("objectActions").collect()
  ) as ObjectActionRow[];
  const auditLogs = (
    await ctx.db.query("auditLogs").collect()
  ) as AuditLogRow[];

  const relatedObjectActionIds = objectActions
    .filter((row) => {
      const actionData = isRecord(row.actionData) ? row.actionData : {};
      return normalizeOptionalString(actionData.distributionJobId) === distributionJobId;
    })
    .map((row) => String(row._id))
    .sort((left, right) => left.localeCompare(right));

  const relatedAuditLogIds = auditLogs
    .filter((row) => {
      const metadata = isRecord(row.metadata) ? row.metadata : {};
      return normalizeOptionalString(metadata.distributionJobId) === distributionJobId;
    })
    .map((row) => String(row._id))
    .sort((left, right) => left.localeCompare(right));

  return {
    relatedObjectActionIds,
    relatedAuditLogIds,
  };
}

async function resolvePlatformMotherExecutionTarget(
  ctx: MutationCtx,
  args: {
    artifact: PlatformMotherReviewArtifactRecord;
    platformOrganizationId: Id<"organizations">;
  },
): Promise<{
    template: ProtectedTemplateRecord;
    templateVersionId?: Id<"objects">;
    templateVersionTag?: string;
    publishedTemplateVersionId?: string;
    publishedTemplateVersionTag?: string;
  }> {
  const template = await resolveProtectedTemplateByRole(ctx, {
    platformOrganizationId: args.platformOrganizationId,
    templateRole: args.artifact.targetTemplateRole,
  });
  if (
    args.artifact.targetTemplateId
    && args.artifact.targetTemplateId !== String(template._id)
  ) {
    throw new ConvexError({
      code: "PLATFORM_MOTHER_ALIAS_RESOLUTION_REQUIRED",
      message: "Mother approved execution target template no longer matches the persisted review artifact.",
      artifactId: args.artifact.artifactId,
    });
  }

  const aliasEvidence = args.artifact.aliasMigrationEvidence;
  if (!aliasEvidence) {
    throw new ConvexError({
      code: "PLATFORM_MOTHER_ALIAS_RESOLUTION_REQUIRED",
      message: "Mother approved execution requires alias-safe Mother-to-Quinn target evidence.",
      artifactId: args.artifact.artifactId,
    });
  }
  if (aliasEvidence.sourceTemplateId !== String(template._id)) {
    throw new ConvexError({
      code: "PLATFORM_MOTHER_ALIAS_RESOLUTION_REQUIRED",
      message: "Mother approved execution alias evidence no longer resolves to the canonical protected template.",
      artifactId: args.artifact.artifactId,
    });
  }

  const templateProps =
    (template.customProperties as Record<string, unknown> | undefined) ?? {};
  const publishedVersionContext = resolveTemplateLifecycleVersionContext(templateProps);
  let templateVersionId = args.artifact.targetTemplateVersionId as Id<"objects"> | undefined;
  let templateVersionTag = args.artifact.targetTemplateVersionTag;

  if (templateVersionId) {
    const versionRecord = await ctx.db.get(templateVersionId);
    if (!versionRecord || versionRecord.type !== "org_agent_template_version") {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_TEMPLATE_VERSION_NOT_FOUND",
        message: "Mother approved execution target template version was not found.",
        artifactId: args.artifact.artifactId,
        targetTemplateVersionId: String(templateVersionId),
      });
    }
    const versionProps =
      (versionRecord.customProperties as Record<string, unknown> | undefined) ?? {};
    const sourceTemplateId = normalizeOptionalString(versionProps.sourceTemplateId);
    if (sourceTemplateId !== String(template._id)) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_TEMPLATE_VERSION_MISMATCH",
        message: "Mother approved execution target version does not belong to the canonical protected template.",
        artifactId: args.artifact.artifactId,
        targetTemplateVersionId: String(templateVersionId),
      });
    }
    const resolvedVersionTag =
      normalizeOptionalString(versionProps.versionTag)
      || normalizeOptionalString(versionProps.templateVersionTag);
    if (templateVersionTag && resolvedVersionTag && templateVersionTag !== resolvedVersionTag) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_EXECUTION_CONTEXT_MISMATCH",
        message: "Mother approved execution target version tag no longer matches the persisted review artifact.",
        artifactId: args.artifact.artifactId,
        targetTemplateVersionId: String(templateVersionId),
      });
    }
    templateVersionTag = resolvedVersionTag || templateVersionTag;
  }

  if (
    args.artifact.targetTemplateVersionId
    && aliasEvidence.sourceTemplateVersionId !== args.artifact.targetTemplateVersionId
  ) {
    throw new ConvexError({
      code: "PLATFORM_MOTHER_ALIAS_RESOLUTION_REQUIRED",
      message: "Mother approved execution alias evidence is missing the reviewed template version resolution.",
      artifactId: args.artifact.artifactId,
    });
  }
  if (
    args.artifact.targetTemplateVersionTag
    && aliasEvidence.sourceTemplateVersionTag !== args.artifact.targetTemplateVersionTag
  ) {
    throw new ConvexError({
      code: "PLATFORM_MOTHER_ALIAS_RESOLUTION_REQUIRED",
      message: "Mother approved execution alias evidence is missing the reviewed template version tag resolution.",
      artifactId: args.artifact.artifactId,
    });
  }

  return {
    template,
    ...(templateVersionId ? { templateVersionId } : {}),
    ...(templateVersionTag ? { templateVersionTag } : {}),
    ...(publishedVersionContext.templateVersionId
      ? { publishedTemplateVersionId: publishedVersionContext.templateVersionId }
      : {}),
    ...(publishedVersionContext.templateVersionTag
      ? { publishedTemplateVersionTag: publishedVersionContext.templateVersionTag }
      : {}),
  };
}

async function buildPlatformMotherReviewContextFromDryRun(
  ctx: MutationCtx,
  args: {
    organizations: OrganizationRecord[];
    targetTemplate: ProtectedTemplateRecord;
    targetTemplateVersionTag: string;
    templateBaseline: Record<string, unknown>;
    dryRunResult: PlatformMotherDryRunResult;
    recentDistributionJobIds: string[];
    historicalPartialRolloutDetected: boolean;
  },
): Promise<PlatformMotherReviewContext> {
  const requestedTargetOrganizationIds = args.organizations.map((organization) =>
    String(organization._id),
  );
  const stagedTargetOrganizationIds = args.dryRunResult.targetOrganizationIds.map((value) =>
    String(value),
  );
  const stagedTargetIdSet = new Set(stagedTargetOrganizationIds);
  const planByOrganizationId = new Map(
    args.dryRunResult.plan.map((row) => [String(row.organizationId), row] as const),
  );

  const cloneCandidates = (
    await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "org_agent"))
      .collect()
  ).filter((row) => {
    if (row.status === "template") {
      return false;
    }
    const customProperties =
      (row.customProperties as Record<string, unknown> | undefined) ?? {};
    return resolveTemplateSourceId(customProperties) === String(args.targetTemplate._id);
  });

  const cloneByOrganizationId = new Map<string, typeof cloneCandidates[number]>();
  for (const clone of cloneCandidates
    .slice()
    .sort((left, right) => String(left._id).localeCompare(String(right._id)))) {
    const key = String(clone.organizationId);
    if (!cloneByOrganizationId.has(key)) {
      cloneByOrganizationId.set(key, clone);
    }
  }

  const reviewStateCounts = {
    missingClone: 0,
    inSync: 0,
    overridden: 0,
    stale: 0,
    blocked: 0,
  };
  const riskLevelCounts = {
    low: 0,
    medium: 0,
    high: 0,
  };
  const interventionPackets: PlatformMotherReviewPacket[] = [];

  for (const organization of args.organizations) {
    const organizationId = String(organization._id);
    const planRow = planByOrganizationId.get(organizationId);
    const clone = cloneByOrganizationId.get(organizationId);
    const reviewReasons = new Set<PlatformMotherReviewPacketReason>();

    let reviewState: PlatformMotherReviewPacketState;
    let riskLevel: TemplateCloneRiskLevel;
    let cloneAgentId: string | undefined;
    let cloneLifecycleState: string | undefined;
    let sourceTemplateVersion: string | undefined;
    let changedFields: string[] = [];
    let blockedFields: string[] = [];
    let overriddenFields: string[] = [];

    if (!clone) {
      reviewState = "missing_clone";
      riskLevel = "high";
      reviewReasons.add("missing_managed_clone");
      changedFields = normalizeStringArray(
        planRow?.changedFields ?? [
          "templateAgentId",
          "templateVersion",
          "templateCloneLinkage",
        ],
      );
    } else {
      const cloneProps =
        (clone.customProperties as Record<string, unknown> | undefined) ?? {};
      const linkage = readTemplateCloneLinkageContract(cloneProps);
      const drift = resolveTemplateCloneDriftContract({
        templateBaseline: args.templateBaseline,
        cloneCustomProperties: cloneProps,
        baselineTemplateVersion: args.targetTemplateVersionTag,
        linkage,
      });

      reviewState =
        drift.policyState === "in_sync"
          ? "in_sync"
          : drift.policyState === "overridden"
            ? "overridden"
            : drift.policyState === "stale"
              ? "stale"
              : "blocked";
      riskLevel = resolveTemplateCloneRiskLevel(drift.policyState);
      cloneAgentId = String(clone._id);
      cloneLifecycleState = linkage?.cloneLifecycleState;
      sourceTemplateVersion =
        linkage?.sourceTemplateVersion
        || normalizeOptionalString(cloneProps.templateVersion)
        || undefined;
      changedFields = Array.from(
        new Set([
          ...(planRow?.changedFields ?? []),
          ...drift.diff.map((entry) => entry.field),
        ]),
      ).sort((left, right) => left.localeCompare(right));
      blockedFields = normalizeStringArray(drift.blockedFields);
      overriddenFields = normalizeStringArray(drift.overriddenFields);

      if (cloneLifecycleState === "legacy_unmanaged") {
        reviewReasons.add("legacy_unmanaged_clone");
      }
      if (drift.stale) {
        reviewReasons.add("stale_template_version");
      }
      if (planRow?.reason === "locked_override_fields") {
        reviewReasons.add("blocked_locked_fields");
      }
      if (planRow?.reason === "warn_override_confirmation_required") {
        reviewReasons.add("warn_confirmation_required");
      }
    }

    if (!stagedTargetIdSet.has(organizationId)) {
      reviewReasons.add("partial_rollout_deferred");
    }

    switch (reviewState) {
      case "missing_clone":
        reviewStateCounts.missingClone += 1;
        break;
      case "in_sync":
        reviewStateCounts.inSync += 1;
        break;
      case "overridden":
        reviewStateCounts.overridden += 1;
        break;
      case "stale":
        reviewStateCounts.stale += 1;
        break;
      case "blocked":
        reviewStateCounts.blocked += 1;
        break;
    }
    riskLevelCounts[riskLevel] += 1;

    if (reviewReasons.size > 0 || reviewState !== "in_sync") {
      const organizationName = normalizeOptionalString(organization.name) || undefined;
      interventionPackets.push({
        organizationId,
        ...(organizationName ? { organizationName } : {}),
        reviewState,
        riskLevel,
        reviewReasons: Array.from(reviewReasons).sort((left, right) =>
          left.localeCompare(right),
        ),
        ...(cloneAgentId ? { cloneAgentId } : {}),
        ...(cloneLifecycleState ? { cloneLifecycleState } : {}),
        ...(sourceTemplateVersion ? { sourceTemplateVersion } : {}),
        targetTemplateVersion: args.targetTemplateVersionTag,
        changedFields,
        blockedFields,
        overriddenFields,
      });
    }
  }

  return {
    contractVersion: PLATFORM_MOTHER_REVIEW_CONTEXT_CONTRACT_VERSION,
    requestedTargetOrganizationIds,
    stagedTargetOrganizationIds,
    recentDistributionJobIds: args.recentDistributionJobIds,
    rolloutWindow: {
      stageStartIndex: args.dryRunResult.rolloutWindow.stageStartIndex,
      stageSize: args.dryRunResult.rolloutWindow.stageSize,
      requestedTargetCount: args.dryRunResult.rolloutWindow.requestedTargetCount,
      stagedTargetCount: args.dryRunResult.rolloutWindow.stagedTargetCount,
      partialRolloutDetected:
        args.dryRunResult.rolloutWindow.requestedTargetCount
        > args.dryRunResult.rolloutWindow.stagedTargetCount,
      historicalPartialRolloutDetected: args.historicalPartialRolloutDetected,
    },
    driftSummary: {
      totalOrganizations: requestedTargetOrganizationIds.length,
      missingCloneCount: reviewStateCounts.missingClone,
      interventionCount: interventionPackets.length,
      reviewStateCounts,
      riskLevelCounts,
    },
    interventionPackets,
  };
}

function buildPlatformMotherGovernanceReviewSummary(args: {
  artifactKind: Exclude<PlatformMotherReviewArtifactKind, "proposal_review">;
  reviewContext: PlatformMotherReviewContext;
}): string {
  switch (args.artifactKind) {
    case "drift_audit":
      return `Audit managed clone drift across ${args.reviewContext.driftSummary.totalOrganizations} organization(s).`;
    case "migration_plan":
      return `Plan read-only operator migration rollout for ${args.reviewContext.rolloutWindow.stagedTargetCount} staged organization(s).`;
    case "org_intervention_review":
      return `Review intervention packets for ${args.reviewContext.driftSummary.interventionCount} organization(s) before any rollout action.`;
  }
}

function buildPlatformMotherGovernanceReviewDetails(args: {
  artifactKind: Exclude<PlatformMotherReviewArtifactKind, "proposal_review">;
  reviewContext: PlatformMotherReviewContext;
}): string {
  const partialRollout = args.reviewContext.rolloutWindow.partialRolloutDetected
    ? "partial rollout window detected"
    : "full review window";
  return [
    `${args.artifactKind} stays read-only and reuses the existing template lifecycle dry-run planner.`,
    `${args.reviewContext.driftSummary.interventionCount} organization(s) need review packets; ${args.reviewContext.driftSummary.missingCloneCount} are missing the managed default operator clone.`,
    `${partialRollout}; recent lifecycle job evidence: ${args.reviewContext.recentDistributionJobIds.join(", ") || "none"}.`,
  ].join(" ");
}

function requirePlatformMotherReviewArtifact(
  record: ReviewArtifactObjectRecord | null,
): PlatformMotherReviewArtifactRecord | null {
  if (!record) {
    return null;
  }

  if (
    record.type !== PLATFORM_MOTHER_REVIEW_OBJECT_TYPE
    || record.subtype !== PLATFORM_MOTHER_REVIEW_OBJECT_SUBTYPE
  ) {
    return null;
  }

  const artifact = normalizePlatformMotherReviewArtifact(record.customProperties);
  if (!artifact) {
    throw new ConvexError({
      code: "INVALID_PLATFORM_MOTHER_REVIEW_ARTIFACT_STATE",
      message: "Stored Platform Mother review artifact contract is invalid.",
      artifactId: String(record._id),
    });
  }

  return {
    artifactId: String(record._id),
    platformOrganizationId: String(record.organizationId),
    objectStatus: record.status,
    objectName: record.name,
    ...artifact,
  };
}

async function persistPlatformMotherReviewArtifact(
  ctx: MutationCtx,
  args: {
    artifact: unknown;
    actorUserId?: Id<"users">;
    platformOrganizationId?: Id<"organizations">;
  },
) {
  const platformOrganizationId =
    args.platformOrganizationId ?? resolvePlatformOrgIdFromEnv();
  const now = Date.now();
  const normalizedArtifact = normalizePlatformMotherReviewArtifact(args.artifact, {
    defaultCreatedAt: now,
    defaultCreatedByUserId: args.actorUserId ? String(args.actorUserId) : undefined,
  });
  if (!normalizedArtifact) {
    throw new ConvexError({
      code: "INVALID_PLATFORM_MOTHER_REVIEW_ARTIFACT",
      message:
        "Platform Mother review artifact is missing required fields or has inconsistent approval state.",
    });
  }

  const artifactId = await ctx.db.insert("objects", {
    organizationId: platformOrganizationId,
    type: PLATFORM_MOTHER_REVIEW_OBJECT_TYPE,
    subtype: PLATFORM_MOTHER_REVIEW_OBJECT_SUBTYPE,
    name: buildPlatformMotherReviewArtifactName(normalizedArtifact),
    description: normalizedArtifact.proposalSummary,
    status: normalizedArtifact.approvalStatus,
    customProperties: normalizedArtifact,
    createdBy: args.actorUserId,
    createdAt: normalizedArtifact.createdAt,
    updatedAt: normalizedArtifact.createdAt,
  });

  const auditEnvelope = buildPlatformMotherReviewArtifactAuditEnvelope({
    artifactId: String(artifactId),
    platformOrganizationId: String(platformOrganizationId),
    artifact: normalizedArtifact,
    actorUserId: args.actorUserId ? String(args.actorUserId) : undefined,
  });

  const objectActionId = await ctx.db.insert("objectActions", {
    organizationId: platformOrganizationId,
    objectId: artifactId,
    actionType: PLATFORM_MOTHER_REVIEW_ACTION_RECORDED,
    actionData: auditEnvelope,
    performedBy: args.actorUserId,
    performedAt: normalizedArtifact.createdAt,
  });

  const auditLogId = await ctx.db.insert("auditLogs", {
    organizationId: platformOrganizationId,
    userId: args.actorUserId,
    action: PLATFORM_MOTHER_REVIEW_ACTION_RECORDED,
    resource: PLATFORM_MOTHER_REVIEW_OBJECT_TYPE,
    resourceId: String(artifactId),
    success: true,
    metadata: auditEnvelope,
    createdAt: normalizedArtifact.createdAt,
  });

  return {
    artifactId,
    objectActionId,
    auditLogId,
    artifact: {
      artifactId: String(artifactId),
      platformOrganizationId: String(platformOrganizationId),
      objectStatus: normalizedArtifact.approvalStatus,
      objectName: buildPlatformMotherReviewArtifactName(normalizedArtifact),
      ...normalizedArtifact,
    } satisfies PlatformMotherReviewArtifactRecord,
    auditEnvelope,
  };
}

async function patchPlatformMotherReviewArtifactState(
  ctx: MutationCtx,
  args: {
    artifactId: Id<"objects">;
    artifact: unknown;
    performedBy?: Id<"users"> | Id<"objects">;
    auditUserId?: Id<"users">;
    actionType?: string;
    actionData?: Record<string, unknown>;
    platformOrganizationId: Id<"organizations">;
  },
) {
  const normalizedArtifact = normalizePlatformMotherReviewArtifact(args.artifact);
  if (!normalizedArtifact) {
    throw new ConvexError({
      code: "INVALID_PLATFORM_MOTHER_REVIEW_ARTIFACT",
      message:
        "Platform Mother review artifact is missing required fields or has inconsistent approval state.",
    });
  }

  const updatedAt = Date.now();
  await ctx.db.patch(args.artifactId, {
    name: buildPlatformMotherReviewArtifactName(normalizedArtifact),
    description: normalizedArtifact.proposalSummary,
    status: normalizedArtifact.approvalStatus,
    customProperties: normalizedArtifact,
    updatedAt,
  });

  let objectActionId: Id<"objectActions"> | undefined;
  let auditLogId: Id<"auditLogs"> | undefined;
  if (args.actionType) {
    objectActionId = await ctx.db.insert("objectActions", {
      organizationId: args.platformOrganizationId,
      objectId: args.artifactId,
      actionType: args.actionType,
      actionData: args.actionData,
      performedBy: args.performedBy,
      performedAt: updatedAt,
    });

    auditLogId = await ctx.db.insert("auditLogs", {
      organizationId: args.platformOrganizationId,
      userId: args.auditUserId,
      action: args.actionType,
      resource: PLATFORM_MOTHER_REVIEW_OBJECT_TYPE,
      resourceId: String(args.artifactId),
      success: true,
      metadata: args.actionData,
      createdAt: updatedAt,
    });
  }

  return {
    artifact: {
      artifactId: String(args.artifactId),
      platformOrganizationId: String(args.platformOrganizationId),
      objectStatus: normalizedArtifact.approvalStatus,
      objectName: buildPlatformMotherReviewArtifactName(normalizedArtifact),
      ...normalizedArtifact,
    } satisfies PlatformMotherReviewArtifactRecord,
    ...(objectActionId ? { objectActionId } : {}),
    ...(auditLogId ? { auditLogId } : {}),
  };
}

export const createPlatformMotherReviewArtifactInternal = internalMutation({
  args: {
    artifact: v.any(),
    actorUserId: v.optional(v.id("users")),
    platformOrganizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) =>
    await persistPlatformMotherReviewArtifact(ctx, args),
});

export const capturePlatformMotherProposalInternal = internalMutation({
  args: {
    runtimeMode: v.union(
      v.literal(PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT),
      v.literal(PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE),
    ),
    proposalSummary: v.string(),
    proposalDetails: v.optional(v.string()),
    actorUserId: v.optional(v.id("users")),
    platformOrganizationId: v.optional(v.id("organizations")),
    requestingOrganizationId: v.optional(v.id("organizations")),
    sourceConversationId: v.optional(v.id("aiConversations")),
    sourceMotherRuntimeId: v.optional(v.id("objects")),
    sourceMessageId: v.optional(v.id("aiMessages")),
    targetTemplateRole: v.optional(v.string()),
    dryRunTargetOrganizationIds: v.optional(v.array(v.id("organizations"))),
    createDryRunPlan: v.optional(v.boolean()),
    distributionJobId: v.optional(v.string()),
    distributionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const platformOrganizationId =
      args.platformOrganizationId ?? resolvePlatformOrgIdFromEnv();
    const targetTemplateRole =
      normalizeOptionalString(args.targetTemplateRole)
      || DEFAULT_ORG_AGENT_TEMPLATE_ROLE;
    if (targetTemplateRole !== DEFAULT_ORG_AGENT_TEMPLATE_ROLE) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_UNSUPPORTED_TEMPLATE_ROLE",
        message:
          "Platform Mother proposal capture is currently scoped to personal_life_operator_template only.",
        targetTemplateRole,
      });
    }

    const runtimeContext = await resolvePlatformMotherRuntimeContext(ctx, {
      runtimeMode: args.runtimeMode,
      sourceConversationId: args.sourceConversationId,
      sourceMotherRuntimeId: args.sourceMotherRuntimeId,
      requestingOrganizationId: args.requestingOrganizationId,
    });
    const template = await resolveProtectedTemplateByRole(ctx, {
      platformOrganizationId,
      templateRole: targetTemplateRole,
    });
    const templateVersionContext = resolveTemplateLifecycleVersionContext(
      template.customProperties,
    );

    const requestedDryRunTargets = dedupeAndSortOrganizationIds([
      ...(args.dryRunTargetOrganizationIds ?? []),
      ...(args.createDryRunPlan === false || !runtimeContext.requestingOrganizationId
        ? []
        : [runtimeContext.requestingOrganizationId]),
    ]);
    const shouldCreateDryRunPlan =
      args.createDryRunPlan !== false && requestedDryRunTargets.length > 0;

    const dryRunResult = shouldCreateDryRunPlan
      ? await runTemplateDistributionLifecycle(ctx, {
          actor: {
            performedBy: runtimeContext.sourceMotherRuntimeId,
            auditUserId: args.actorUserId,
            roleName: `platform_mother_${args.runtimeMode}`,
          },
          templateId: template._id,
          targetOrganizationIds: requestedDryRunTargets,
          dryRun: true,
          distributionJobId:
            normalizeOptionalString(args.distributionJobId)
            || buildPlatformMotherProposalDryRunId({
              targetTemplateRole,
              requestingOrganizationId: runtimeContext.requestingOrganizationId,
              sourceConversationId: runtimeContext.sourceConversationId,
              runtimeMode: args.runtimeMode,
              timestamp: Date.now(),
            }),
          reason:
            normalizeOptionalString(args.distributionReason)
            || `platform_mother_${args.runtimeMode}_proposal_dry_run`,
        })
      : null;
    const policyFamilyScope = dryRunResult
      ? resolvePlatformMotherPolicyScopeFromDryRun(dryRunResult)
      : resolvePlatformMotherPolicyFamilyScope([]);
    if (!policyFamilyScope.eligible) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_POLICY_SCOPE_VIOLATION",
        message:
          "Platform Mother governance cannot claim org-local or customer-owned operator fields.",
        outOfScopeFields: policyFamilyScope.outOfScopeFields,
      });
    }
    const rolloutGateRequirements = buildPlatformMotherRolloutGateRequirements({
      targetTemplateRole,
      targetTemplateVersionId:
        dryRunResult?.templateVersionId
        ? String(dryRunResult.templateVersionId)
        : templateVersionContext.templateVersionId,
      targetTemplateVersionTag:
        dryRunResult?.templateVersion || templateVersionContext.templateVersionTag,
      dryRunCorrelationId: dryRunResult?.distributionJobId,
    });

    const persisted = await persistPlatformMotherReviewArtifact(ctx, {
      actorUserId: args.actorUserId,
      platformOrganizationId,
      artifact: {
        targetTemplateRole,
        targetTemplateId: String(template._id),
        targetTemplateVersionId:
          dryRunResult?.templateVersionId
          ? String(dryRunResult.templateVersionId)
          : templateVersionContext.templateVersionId,
        targetTemplateVersionTag:
          dryRunResult?.templateVersion || templateVersionContext.templateVersionTag,
        requestingOrganizationId: runtimeContext.requestingOrganizationId
          ? String(runtimeContext.requestingOrganizationId)
          : undefined,
        sourceConversationId: runtimeContext.sourceConversationId
          ? String(runtimeContext.sourceConversationId)
          : undefined,
        sourceMotherRuntimeId: String(runtimeContext.sourceMotherRuntimeId),
        sourceMessageId: args.sourceMessageId ? String(args.sourceMessageId) : undefined,
        proposalSummary: args.proposalSummary,
        proposalDetails: args.proposalDetails,
        execution: dryRunResult
          ? buildPlatformMotherExecutionFromDryRun({
              dryRunResult,
              executionSummary:
                `Read-only managed-clone dry run planned for ${dryRunResult.targetOrganizationIds.length} organization(s).`,
            })
          : {
              status: "not_requested",
              downstreamObjectActionIds: [],
              downstreamAuditLogIds: [],
            },
        policyFamilyScope,
        rolloutGateRequirements,
      },
    });

    return {
      ...persisted,
      dryRun: dryRunResult ? serializePlatformMotherDryRunResult(dryRunResult) : null,
    };
  },
});

export const capturePlatformMotherGovernanceReviewInternal = internalMutation({
  args: {
    artifactKind: v.union(
      v.literal("drift_audit"),
      v.literal("migration_plan"),
      v.literal("org_intervention_review"),
    ),
    actorUserId: v.optional(v.id("users")),
    platformOrganizationId: v.optional(v.id("organizations")),
    requestingOrganizationId: v.optional(v.id("organizations")),
    sourceMotherRuntimeId: v.id("objects"),
    targetTemplateRole: v.optional(v.string()),
    targetOrganizationIds: v.optional(v.array(v.id("organizations"))),
    stagedRollout: v.optional(v.object({
      stageSize: v.number(),
      stageStartIndex: v.optional(v.number()),
    })),
    proposalSummary: v.optional(v.string()),
    proposalDetails: v.optional(v.string()),
    distributionJobId: v.optional(v.string()),
    distributionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const platformOrganizationId =
      args.platformOrganizationId ?? resolvePlatformOrgIdFromEnv();
    const targetTemplateRole =
      normalizeOptionalString(args.targetTemplateRole)
      || DEFAULT_ORG_AGENT_TEMPLATE_ROLE;
    if (targetTemplateRole !== DEFAULT_ORG_AGENT_TEMPLATE_ROLE) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_UNSUPPORTED_TEMPLATE_ROLE",
        message:
          "Platform Mother governance reviews are currently scoped to personal_life_operator_template only.",
        targetTemplateRole,
      });
    }

    const runtimeContext = await resolvePlatformMotherRuntimeContext(ctx, {
      runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
      sourceMotherRuntimeId: args.sourceMotherRuntimeId,
      requestingOrganizationId: args.requestingOrganizationId,
    });
    const targetTemplate = await resolveProtectedTemplateByRole(ctx, {
      platformOrganizationId,
      templateRole: targetTemplateRole,
    });
    const templateBaselineContext = await resolveProtectedTemplateBaselineContext(
      ctx,
      targetTemplate,
    );
    const organizations = await resolveGovernanceReviewOrganizations(ctx, {
      platformOrganizationId,
      targetOrganizationIds: args.targetOrganizationIds,
      requestingOrganizationId: args.requestingOrganizationId,
    });
    if (organizations.length === 0) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_REVIEW_CONTEXT_MISSING",
        message: "Mother governance review requires at least one bootstrapped target organization.",
        targetTemplateRole,
      });
    }

    const dryRunResult = await runTemplateDistributionLifecycle(ctx, {
      actor: {
        performedBy: runtimeContext.sourceMotherRuntimeId,
        auditUserId: args.actorUserId,
        roleName: "platform_mother_governance",
      },
      templateId: targetTemplate._id,
      targetOrganizationIds: organizations.map((organization) => organization._id),
      stagedRollout: args.stagedRollout,
      dryRun: true,
      distributionJobId:
        normalizeOptionalString(args.distributionJobId)
        || buildPlatformMotherProposalDryRunId({
          targetTemplateRole,
          requestingOrganizationId: runtimeContext.requestingOrganizationId,
          runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
          timestamp: Date.now(),
        }),
      reason:
        normalizeOptionalString(args.distributionReason)
        || `platform_mother_governance_${args.artifactKind}_dry_run`,
    });

    if (
      !dryRunResult.distributionJobId
      || !dryRunResult.lifecycleActionId
      || dryRunResult.targetOrganizationIds.length === 0
    ) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_DRY_RUN_EVIDENCE_MISSING",
        message: "Mother governance review requires dry-run lifecycle evidence before review artifacts can be recorded.",
        targetTemplateRole,
      });
    }

    const policyFamilyScope = resolvePlatformMotherPolicyScopeFromDryRun(dryRunResult);
    if (!policyFamilyScope.eligible) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_POLICY_SCOPE_VIOLATION",
        message:
          "Platform Mother governance cannot claim org-local or customer-owned operator fields.",
        outOfScopeFields: policyFamilyScope.outOfScopeFields,
      });
    }

    const telemetry = await loadRecentTemplateDistributionTelemetry(ctx, targetTemplate._id);
    const reviewContext = await buildPlatformMotherReviewContextFromDryRun(ctx, {
      organizations,
      targetTemplate,
      targetTemplateVersionTag:
        dryRunResult.templateVersion
        || templateBaselineContext.templateVersionTag
        || `${String(targetTemplate._id)}@${targetTemplate.updatedAt}`,
      templateBaseline: templateBaselineContext.templateBaseline,
      dryRunResult,
      recentDistributionJobIds: telemetry.recentDistributionJobIds,
      historicalPartialRolloutDetected: telemetry.historicalPartialRolloutDetected,
    });
    if (reviewContext.requestedTargetOrganizationIds.length === 0) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_REVIEW_CONTEXT_MISSING",
        message: "Mother governance review context is missing target organization evidence.",
        targetTemplateRole,
      });
    }

    const aliasMigrationEvidence = buildPlatformMotherAliasEvidence({
      sourceMotherRuntime: runtimeContext.sourceMotherRuntime,
      targetTemplate,
      targetTemplateVersionId:
        dryRunResult.templateVersionId
        ? String(dryRunResult.templateVersionId)
        : templateBaselineContext.templateVersionId,
      targetTemplateVersionTag:
        dryRunResult.templateVersion || templateBaselineContext.templateVersionTag,
      recordedAt: dryRunResult.recordedAt,
      artifactKind: args.artifactKind,
    });
    if (!aliasMigrationEvidence) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_ALIAS_RESOLUTION_REQUIRED",
        message: "Mother governance review requires alias-safe Mother-to-Quinn resolution evidence.",
        sourceMotherRuntimeId: String(runtimeContext.sourceMotherRuntimeId),
      });
    }

    if (
      args.artifactKind === "org_intervention_review"
      && reviewContext.interventionPackets.length === 0
    ) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_REVIEW_CONTEXT_MISSING",
        message: "Mother org-intervention reviews require at least one intervention packet.",
        targetTemplateRole,
      });
    }

    const rolloutGateRequirements = buildPlatformMotherRolloutGateRequirements({
      targetTemplateRole,
      targetTemplateVersionId:
        dryRunResult.templateVersionId
        ? String(dryRunResult.templateVersionId)
        : templateBaselineContext.templateVersionId,
      targetTemplateVersionTag:
        dryRunResult.templateVersion || templateBaselineContext.templateVersionTag,
      dryRunCorrelationId: dryRunResult.distributionJobId,
    });

    const persisted = await persistPlatformMotherReviewArtifact(ctx, {
      actorUserId: args.actorUserId,
      platformOrganizationId,
      artifact: {
        artifactKind: args.artifactKind,
        targetTemplateRole,
        targetTemplateId: String(targetTemplate._id),
        targetTemplateVersionId:
          dryRunResult.templateVersionId
          ? String(dryRunResult.templateVersionId)
          : templateBaselineContext.templateVersionId,
        targetTemplateVersionTag:
          dryRunResult.templateVersion || templateBaselineContext.templateVersionTag,
        requestingOrganizationId: runtimeContext.requestingOrganizationId
          ? String(runtimeContext.requestingOrganizationId)
          : undefined,
        sourceMotherRuntimeId: String(runtimeContext.sourceMotherRuntimeId),
        proposalSummary:
          normalizeOptionalString(args.proposalSummary)
          || buildPlatformMotherGovernanceReviewSummary({
            artifactKind: args.artifactKind,
            reviewContext,
          }),
        proposalDetails:
          normalizeOptionalString(args.proposalDetails)
          || buildPlatformMotherGovernanceReviewDetails({
            artifactKind: args.artifactKind,
            reviewContext,
          }),
        execution: buildPlatformMotherExecutionFromDryRun({
          dryRunResult,
          executionSummary:
            `Read-only ${args.artifactKind} prepared for ${reviewContext.rolloutWindow.stagedTargetCount} staged organization(s).`,
        }),
        aliasMigrationEvidence,
        reviewContext,
        policyFamilyScope,
        rolloutGateRequirements,
      },
    });

    return {
      ...persisted,
      reviewContext,
      dryRun: serializePlatformMotherDryRunResult(dryRunResult),
    };
  },
});

export const executePlatformMotherApprovedReviewInternal = internalMutation({
  args: {
    artifactId: v.id("objects"),
    sourceMotherRuntimeId: v.id("objects"),
    platformOrganizationId: v.optional(v.id("organizations")),
    approval: v.optional(v.object({
      approverUserId: v.id("users"),
      approverRole: v.optional(v.string()),
      reason: v.string(),
      ticketId: v.optional(v.string()),
      notes: v.optional(v.string()),
      decidedAt: v.optional(v.number()),
    })),
    publishTemplateVersion: v.optional(v.boolean()),
    applyDistribution: v.optional(v.boolean()),
    repairPrimaryAgentContexts: v.optional(v.boolean()),
    overridePolicyGate: v.optional(v.object({
      confirmWarnOverride: v.optional(v.boolean()),
      reason: v.optional(v.string()),
    })),
    executionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const platformOrganizationId =
      args.platformOrganizationId ?? resolvePlatformOrgIdFromEnv();
    const record = (await ctx.db.get(args.artifactId)) as ReviewArtifactObjectRecord | null;
    const artifact = requirePlatformMotherReviewArtifact(record);
    if (!artifact) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_REVIEW_ARTIFACT_NOT_FOUND",
        message: "Platform Mother approved execution requires a persisted governance review artifact.",
        artifactId: String(args.artifactId),
      });
    }
    if (artifact.platformOrganizationId !== String(platformOrganizationId)) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_REVIEW_ARTIFACT_ORG_MISMATCH",
        message: "Platform Mother review artifacts must remain on the platform org.",
        artifactId: artifact.artifactId,
      });
    }
    if (artifact.artifactKind === "proposal_review") {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_EXECUTION_UNSUPPORTED_ARTIFACT",
        message:
          "Mother approved execution currently requires governance review artifacts with persisted dry-run context and alias-safe evidence.",
        artifactId: artifact.artifactId,
        artifactKind: artifact.artifactKind,
      });
    }
    if (!artifact.reviewContext || !artifact.aliasMigrationEvidence) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_EXECUTION_CONTEXT_MISSING",
        message:
          "Mother approved execution requires persisted review context and alias-safe target evidence.",
        artifactId: artifact.artifactId,
      });
    }
    if (!artifact.sourceMotherRuntimeId) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_EXECUTION_CONTEXT_MISSING",
        message: "Mother approved execution requires a recorded governance runtime.",
        artifactId: artifact.artifactId,
      });
    }
    if (artifact.sourceMotherRuntimeId !== String(args.sourceMotherRuntimeId)) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_EXECUTION_CONTEXT_MISMATCH",
        message:
          "Mother approved execution must run from the same governance runtime that recorded the review artifact.",
        artifactId: artifact.artifactId,
      });
    }
    if (artifact.approvalStatus === "rejected") {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_APPROVAL_REQUIRED",
        message: "Rejected Mother review artifacts cannot dispatch execution.",
        artifactId: artifact.artifactId,
      });
    }
    if (artifact.executionStatus === "executed_via_existing_lifecycle") {
      return {
        artifact,
        alreadyExecuted: true,
      };
    }

    const executionPlan = {
      publishTemplateVersion: args.publishTemplateVersion === true,
      applyDistribution: args.applyDistribution === true,
      repairPrimaryAgentContexts: args.repairPrimaryAgentContexts === true,
    };
    if (
      !executionPlan.publishTemplateVersion
      && !executionPlan.applyDistribution
      && !executionPlan.repairPrimaryAgentContexts
    ) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_EXECUTION_PLAN_REQUIRED",
        message:
          "Mother approved execution requires an explicit publish, distribute, or repair plan.",
        artifactId: artifact.artifactId,
      });
    }

    const approval = artifact.approval
      ?? (
        args.approval
          ? normalizePlatformMotherApprovalEnvelope({
              contractVersion: PLATFORM_MOTHER_APPROVAL_ENVELOPE_CONTRACT_VERSION,
              status: "approved",
              approverUserId: String(args.approval.approverUserId),
              approverRole: args.approval.approverRole,
              reason: args.approval.reason,
              ticketId: args.approval.ticketId,
              notes: args.approval.notes,
              decidedAt: args.approval.decidedAt ?? Date.now(),
            })
          : null
      );
    if (!approval) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_APPROVAL_REQUIRED",
        message:
          "Mother approved execution requires a persisted approval envelope with approver identity.",
        artifactId: artifact.artifactId,
      });
    }
    if (
      artifact.approval
      && args.approval
      && artifact.approval.approverUserId !== String(args.approval.approverUserId)
    ) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_APPROVAL_REQUIRED",
        message:
          "Mother approved execution cannot replace the persisted approver identity on an approved artifact.",
        artifactId: artifact.artifactId,
      });
    }

    const runtimeContext = await resolvePlatformMotherRuntimeContext(ctx, {
      runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
      sourceMotherRuntimeId: args.sourceMotherRuntimeId,
    });
    const dryRunEvidence = await loadPlatformMotherDryRunEvidence(ctx, {
      artifact,
      platformOrganizationId,
    });
    if (
      normalizeOptionalString(artifact.rolloutGateRequirements.dryRunCorrelationId)
      !== dryRunEvidence.distributionJobId
      || artifact.rolloutGateRequirements.status !== "satisfied_for_review"
    ) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_DRY_RUN_CORRELATION_REQUIRED",
        message:
          "Mother approved execution requires rollout-gate evidence that matches the persisted dry-run correlation.",
        artifactId: artifact.artifactId,
      });
    }
    const targetContext = await resolvePlatformMotherExecutionTarget(ctx, {
      artifact,
      platformOrganizationId,
    });

    if (
      executionPlan.publishTemplateVersion
      && !targetContext.templateVersionId
    ) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_EXECUTION_CONTEXT_MISSING",
        message:
          "Mother approved template publication requires a resolved template version snapshot.",
        artifactId: artifact.artifactId,
      });
    }
    if (
      (executionPlan.applyDistribution || executionPlan.repairPrimaryAgentContexts)
      && dryRunEvidence.stagedTargetOrganizationIds.length === 0
    ) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_EXECUTION_CONTEXT_MISSING",
        message:
          "Mother approved rollout execution requires staged target organizations from persisted dry-run evidence.",
        artifactId: artifact.artifactId,
      });
    }

    const actor = {
      performedBy: runtimeContext.sourceMotherRuntimeId,
      auditUserId: approval.approverUserId as Id<"users">,
      roleName: "platform_mother_governance_approved_execution",
    } as const;

    let publishResult:
      | Awaited<ReturnType<typeof runAgentTemplateVersionPublishLifecycle>>
      | null = null;
    if (executionPlan.publishTemplateVersion && targetContext.templateVersionId) {
      const alreadyPublished =
        targetContext.publishedTemplateVersionId === String(targetContext.templateVersionId)
        || (
          targetContext.publishedTemplateVersionTag
          && targetContext.templateVersionTag
          && targetContext.publishedTemplateVersionTag
            === targetContext.templateVersionTag
        );
      if (!alreadyPublished) {
        publishResult = await runAgentTemplateVersionPublishLifecycle(ctx, {
          actor,
          templateId: targetContext.template._id,
          templateVersionId: targetContext.templateVersionId,
          publishReason:
            normalizeOptionalString(args.executionReason)
            || `platform_mother_${artifact.artifactKind}_approved_publish`,
        });
      }
    }

    let distributionResult:
      | Awaited<ReturnType<typeof runTemplateDistributionLifecycle>>
      | null = null;
    if (executionPlan.applyDistribution) {
      distributionResult = await runTemplateDistributionLifecycle(ctx, {
        actor,
        templateId: targetContext.template._id,
        templateVersionId: targetContext.templateVersionId,
        targetOrganizationIds: dryRunEvidence.requestedTargetOrganizationIds.map(
          (value) => value as Id<"organizations">,
        ),
        stagedRollout: {
          stageSize: dryRunEvidence.rolloutWindow.stageSize,
          stageStartIndex: dryRunEvidence.rolloutWindow.stageStartIndex,
        },
        dryRun: false,
        reason:
          normalizeOptionalString(args.executionReason)
          || `platform_mother_${artifact.artifactKind}_approved_execution`,
        distributionJobId: dryRunEvidence.distributionJobId,
        overridePolicyGate: args.overridePolicyGate,
      });
    }

    const repairOrganizationIds = (
      distributionResult?.targetOrganizationIds.map((value) => String(value))
      ?? dryRunEvidence.stagedTargetOrganizationIds
    ).map((value) => value as Id<"organizations">);
    const repairResults: Array<
      Awaited<ReturnType<typeof runPrimaryAgentContextRepairLifecycle>>
    > = [];
    if (executionPlan.repairPrimaryAgentContexts) {
      for (const organizationId of repairOrganizationIds) {
        repairResults.push(
          await runPrimaryAgentContextRepairLifecycle(ctx, {
            actor,
            organizationId,
            operatorId: DEFAULT_OPERATOR_CONTEXT_ID,
            reason:
              normalizeOptionalString(args.executionReason)
              || `platform_mother_${artifact.artifactKind}_approved_execution`,
            reviewArtifactId: artifact.artifactId,
          }),
        );
      }
    }

    const distributionEvidence = await collectTemplateDistributionEvidenceByJobId(
      ctx,
      dryRunEvidence.distributionJobId,
    );
    const downstreamObjectActionIds = new Set<string>([
      ...artifact.execution.downstreamObjectActionIds,
      ...distributionEvidence.relatedObjectActionIds,
      ...(publishResult
        ? [String(publishResult.lifecycleObjectActionId)]
        : []),
      ...repairResults.flatMap((result) =>
        result.objectActionIds.map((id) => String(id)),
      ),
    ]);
    const downstreamAuditLogIds = new Set<string>([
      ...artifact.execution.downstreamAuditLogIds,
      ...distributionEvidence.relatedAuditLogIds,
      ...(publishResult
        ? [String(publishResult.lifecycleAuditLogId)]
        : []),
      ...repairResults.flatMap((result) =>
        result.auditLogIds.map((id) => String(id)),
      ),
    ]);

    const newObjectActionCount =
      downstreamObjectActionIds.size
      - artifact.execution.downstreamObjectActionIds.length;
    const newAuditLogCount =
      downstreamAuditLogIds.size
      - artifact.execution.downstreamAuditLogIds.length;
    if (newObjectActionCount < 1 && newAuditLogCount < 1) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_EXECUTION_CONTEXT_MISSING",
        message:
          "Mother approved execution did not produce any new lifecycle evidence and remains fail-closed.",
        artifactId: artifact.artifactId,
      });
    }

    const executionSummaryParts: string[] = [];
    if (publishResult) {
      executionSummaryParts.push(
        `published ${publishResult.publishedVersion}`,
      );
    }
    if (distributionResult) {
      executionSummaryParts.push(
        `applied rollout to ${distributionResult.targetOrganizationIds.length} organization(s)`,
      );
    }
    if (executionPlan.repairPrimaryAgentContexts) {
      executionSummaryParts.push(
        `repaired primary-agent contexts for ${repairResults.length} organization(s)`,
      );
    }

    const approvedExecutionArtifact: PlatformMotherReviewArtifact = {
      ...artifact,
      approvalStatus: "approved",
      approval,
      rejection: null,
      executionStatus: "executed_via_existing_lifecycle",
      execution: {
        contractVersion: PLATFORM_MOTHER_EXECUTION_CORRELATION_CONTRACT_VERSION,
        status: "executed_via_existing_lifecycle",
        dryRunCorrelationId: dryRunEvidence.distributionJobId,
        downstreamObjectActionIds: Array.from(downstreamObjectActionIds).sort(
          (left, right) => left.localeCompare(right),
        ),
        downstreamAuditLogIds: Array.from(downstreamAuditLogIds).sort(
          (left, right) => left.localeCompare(right),
        ),
        templateDistributionJobId: dryRunEvidence.distributionJobId,
        executionSummary:
          executionSummaryParts.join("; ")
          || "Approved Mother execution dispatched via existing lifecycle flows.",
        recordedAt: Date.now(),
      },
    };

    const approvalActionData = {
      artifactId: artifact.artifactId,
      artifactKind: artifact.artifactKind,
      approval,
      dryRunCorrelationId: dryRunEvidence.distributionJobId,
      sourceMotherRuntimeId: String(runtimeContext.sourceMotherRuntimeId),
      executionPlan,
      targetTemplateId: String(targetContext.template._id),
      targetTemplateVersionId: targetContext.templateVersionId
        ? String(targetContext.templateVersionId)
        : null,
      targetTemplateVersionTag: targetContext.templateVersionTag || null,
    };
    if (artifact.approvalStatus !== "approved") {
      await ctx.db.insert("objectActions", {
        organizationId: platformOrganizationId,
        objectId: args.artifactId,
        actionType: PLATFORM_MOTHER_REVIEW_ACTION_APPROVED,
        actionData: approvalActionData,
        performedBy: runtimeContext.sourceMotherRuntimeId,
        performedAt: approval.decidedAt,
      });
      await ctx.db.insert("auditLogs", {
        organizationId: platformOrganizationId,
        userId: approval.approverUserId as Id<"users">,
        action: PLATFORM_MOTHER_REVIEW_ACTION_APPROVED,
        resource: PLATFORM_MOTHER_REVIEW_OBJECT_TYPE,
        resourceId: artifact.artifactId,
        success: true,
        metadata: approvalActionData,
        createdAt: approval.decidedAt,
      });
    }

    const executionActionData = {
      artifactId: artifact.artifactId,
      artifactKind: artifact.artifactKind,
      approval,
      dryRunCorrelationId: dryRunEvidence.distributionJobId,
      sourceMotherRuntimeId: String(runtimeContext.sourceMotherRuntimeId),
      executionPlan,
      publishResult,
      distributionResult: distributionResult
        ? serializePlatformMotherDryRunResult(distributionResult)
        : null,
      repairResults: repairResults.map((result) => ({
        organizationId: String(result.organizationId),
        repairedContexts: result.repairedContexts,
        patchedAgentCount: result.patchedAgentCount,
        repairs: result.repairs,
      })),
      execution: approvedExecutionArtifact.execution,
    };

    const patched = await patchPlatformMotherReviewArtifactState(ctx, {
      artifactId: args.artifactId,
      artifact: approvedExecutionArtifact,
      performedBy: runtimeContext.sourceMotherRuntimeId,
      auditUserId: approval.approverUserId as Id<"users">,
      actionType: PLATFORM_MOTHER_REVIEW_ACTION_EXECUTION_COMPLETED,
      actionData: executionActionData,
      platformOrganizationId,
    });

    return {
      artifact: patched.artifact,
      publishResult,
      distributionResult: distributionResult
        ? serializePlatformMotherDryRunResult(distributionResult)
        : null,
      repairResults,
      executionPlan,
    };
  },
});

export const reviewPlatformMotherArtifactInternal = internalMutation({
  args: {
    artifactId: v.id("objects"),
    sourceMotherRuntimeId: v.id("objects"),
    platformOrganizationId: v.optional(v.id("organizations")),
    decision: v.union(v.literal("approve"), v.literal("reject")),
    approval: v.optional(v.object({
      approverUserId: v.id("users"),
      approverRole: v.optional(v.string()),
      reason: v.string(),
      ticketId: v.optional(v.string()),
      notes: v.optional(v.string()),
      decidedAt: v.optional(v.number()),
    })),
    rejection: v.optional(v.object({
      reviewerUserId: v.id("users"),
      reasonCode: v.string(),
      reason: v.string(),
      ticketId: v.optional(v.string()),
      notes: v.optional(v.string()),
      decidedAt: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const platformOrganizationId =
      args.platformOrganizationId ?? resolvePlatformOrgIdFromEnv();
    const record = (await ctx.db.get(args.artifactId)) as ReviewArtifactObjectRecord | null;
    const artifact = requirePlatformMotherReviewArtifact(record);
    if (!artifact) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_REVIEW_ARTIFACT_NOT_FOUND",
        message: "Platform Mother review decision requires a persisted review artifact.",
        artifactId: String(args.artifactId),
      });
    }
    if (artifact.platformOrganizationId !== String(platformOrganizationId)) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_REVIEW_ARTIFACT_ORG_MISMATCH",
        message: "Platform Mother review artifacts must remain on the platform org.",
        artifactId: artifact.artifactId,
      });
    }

    const runtimeContext = await resolvePlatformMotherRuntimeContext(ctx, {
      runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
      sourceMotherRuntimeId: args.sourceMotherRuntimeId,
    });

    if (args.decision === "approve") {
      const approval = args.approval
        ? normalizePlatformMotherApprovalEnvelope({
            contractVersion: PLATFORM_MOTHER_APPROVAL_ENVELOPE_CONTRACT_VERSION,
            status: "approved",
            approverUserId: String(args.approval.approverUserId),
            approverRole: args.approval.approverRole,
            reason: args.approval.reason,
            ticketId: args.approval.ticketId,
            notes: args.approval.notes,
            decidedAt: args.approval.decidedAt ?? Date.now(),
          })
        : null;
      if (!approval) {
        throw new ConvexError({
          code: "PLATFORM_MOTHER_APPROVAL_REQUIRED",
          message: "Platform Mother approval requires approver identity and reason.",
          artifactId: artifact.artifactId,
        });
      }
      if (artifact.approvalStatus === "rejected") {
        throw new ConvexError({
          code: "PLATFORM_MOTHER_REVIEW_DECISION_CONFLICT",
          message: "Rejected Mother review artifacts cannot be approved programmatically.",
          artifactId: artifact.artifactId,
        });
      }
      if (artifact.approvalStatus === "approved") {
        if (artifact.approval?.approverUserId === approval.approverUserId) {
          return {
            artifact,
            alreadyReviewed: true,
            decision: "approve" as const,
          };
        }
        throw new ConvexError({
          code: "PLATFORM_MOTHER_REVIEW_DECISION_CONFLICT",
          message: "Platform Mother approval cannot replace the persisted approver identity.",
          artifactId: artifact.artifactId,
        });
      }

      const reviewedArtifact: PlatformMotherReviewArtifact = {
        ...artifact,
        approvalStatus: "approved",
        approval,
        rejection: null,
        executionStatus:
          artifact.executionStatus === "executed_via_existing_lifecycle"
            ? "executed_via_existing_lifecycle"
            : "approved_no_execution",
        execution: {
          ...artifact.execution,
          status:
            artifact.executionStatus === "executed_via_existing_lifecycle"
              ? "executed_via_existing_lifecycle"
              : "approved_no_execution",
        },
      };

      const patched = await patchPlatformMotherReviewArtifactState(ctx, {
        artifactId: args.artifactId,
        artifact: reviewedArtifact,
        performedBy: runtimeContext.sourceMotherRuntimeId,
        auditUserId: approval.approverUserId as Id<"users">,
        actionType: PLATFORM_MOTHER_REVIEW_ACTION_APPROVED,
        actionData: {
          artifactId: artifact.artifactId,
          artifactKind: artifact.artifactKind,
          decision: "approve",
          approval,
          sourceMotherRuntimeId: String(runtimeContext.sourceMotherRuntimeId),
        },
        platformOrganizationId,
      });

      return {
        artifact: patched.artifact,
        ...(patched.objectActionId ? { objectActionId: patched.objectActionId } : {}),
        ...(patched.auditLogId ? { auditLogId: patched.auditLogId } : {}),
        decision: "approve" as const,
      };
    }

    const rejection = args.rejection
      ? normalizePlatformMotherRejectionEnvelope({
          contractVersion: PLATFORM_MOTHER_REJECTION_ENVELOPE_CONTRACT_VERSION,
          status: "rejected",
          reviewerUserId: String(args.rejection.reviewerUserId),
          reasonCode: args.rejection.reasonCode,
          reason: args.rejection.reason,
          ticketId: args.rejection.ticketId,
          notes: args.rejection.notes,
          decidedAt: args.rejection.decidedAt ?? Date.now(),
        })
      : null;
    if (!rejection) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_REJECTION_REQUIRED",
        message: "Platform Mother rejection requires reviewer identity, code, and reason.",
        artifactId: artifact.artifactId,
      });
    }
    if (artifact.approvalStatus === "approved") {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_REVIEW_DECISION_CONFLICT",
        message: "Approved Mother review artifacts cannot be rejected programmatically.",
        artifactId: artifact.artifactId,
      });
    }
    if (artifact.approvalStatus === "rejected") {
      if (artifact.rejection?.reviewerUserId === rejection.reviewerUserId) {
        return {
          artifact,
          alreadyReviewed: true,
          decision: "reject" as const,
        };
      }
      throw new ConvexError({
        code: "PLATFORM_MOTHER_REVIEW_DECISION_CONFLICT",
        message: "Platform Mother rejection cannot replace the persisted reviewer identity.",
        artifactId: artifact.artifactId,
      });
    }

    const reviewedArtifact: PlatformMotherReviewArtifact = {
      ...artifact,
      approvalStatus: "rejected",
      approval: null,
      rejection,
      executionStatus: "not_requested",
      execution: {
        ...artifact.execution,
        status: "not_requested",
      },
    };

    const patched = await patchPlatformMotherReviewArtifactState(ctx, {
      artifactId: args.artifactId,
      artifact: reviewedArtifact,
      performedBy: runtimeContext.sourceMotherRuntimeId,
      auditUserId: rejection.reviewerUserId as Id<"users">,
      actionType: PLATFORM_MOTHER_REVIEW_ACTION_REJECTED,
      actionData: {
        artifactId: artifact.artifactId,
        artifactKind: artifact.artifactKind,
        decision: "reject",
        rejection,
        sourceMotherRuntimeId: String(runtimeContext.sourceMotherRuntimeId),
      },
      platformOrganizationId,
    });

    return {
      artifact: patched.artifact,
      ...(patched.objectActionId ? { objectActionId: patched.objectActionId } : {}),
      ...(patched.auditLogId ? { auditLogId: patched.auditLogId } : {}),
      decision: "reject" as const,
    };
  },
});

export const configurePlatformMotherSupportReleaseInternal = internalMutation({
  args: {
    artifactId: v.id("objects"),
    sourceMotherRuntimeId: v.id("objects"),
    supportRuntimeId: v.id("objects"),
    platformOrganizationId: v.optional(v.id("organizations")),
    releaseStage: v.union(
      v.literal(PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY),
      v.literal(PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_GENERAL_AVAILABILITY),
    ),
    canaryOrganizationIds: v.optional(v.array(v.id("organizations"))),
    aliasCompatibilityMode: v.optional(v.union(
      v.literal(PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_QUINN_REQUIRED),
      v.literal(PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_MOTHER_ONLY),
    )),
    renameCleanupReady: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const platformOrganizationId =
      args.platformOrganizationId ?? resolvePlatformOrgIdFromEnv();
    const record = (await ctx.db.get(args.artifactId)) as ReviewArtifactObjectRecord | null;
    const artifact = requirePlatformMotherReviewArtifact(record);
    if (!artifact) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_REVIEW_ARTIFACT_NOT_FOUND",
        message: "Platform Mother support release requires a persisted governance review artifact.",
        artifactId: String(args.artifactId),
      });
    }
    if (artifact.platformOrganizationId !== String(platformOrganizationId)) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_REVIEW_ARTIFACT_ORG_MISMATCH",
        message: "Platform Mother support release review artifacts must remain on the platform org.",
        artifactId: artifact.artifactId,
      });
    }
    if (artifact.artifactKind === PLATFORM_MOTHER_REVIEW_ARTIFACT_KIND) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_SUPPORT_RELEASE_REVIEW_REQUIRED",
        message:
          "Platform Mother support release requires an approved governance review artifact with rollout evidence.",
        artifactId: artifact.artifactId,
      });
    }
    if (artifact.approvalStatus !== "approved" || !artifact.approval?.approverUserId) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_APPROVAL_REQUIRED",
        message:
          "Platform Mother support release requires approved review artifacts with approver identity.",
        artifactId: artifact.artifactId,
      });
    }
    if (!artifact.reviewContext || !artifact.aliasMigrationEvidence) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_SUPPORT_RELEASE_REVIEW_REQUIRED",
        message:
          "Platform Mother support release requires persisted rollout context and Quinn alias migration evidence.",
        artifactId: artifact.artifactId,
      });
    }

    const runtimeContext = await resolvePlatformMotherRuntimeContext(ctx, {
      runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
      sourceMotherRuntimeId: args.sourceMotherRuntimeId,
    });
    const supportRuntime = await ctx.db.get(args.supportRuntimeId) as PlatformMotherRuntimeRecord | null;
    if (
      !supportRuntime
      || supportRuntime.type !== "org_agent"
      || supportRuntime.status !== "active"
      || String(supportRuntime.organizationId) !== String(platformOrganizationId)
      || !isPlatformMotherAuthorityRecord(
        supportRuntime.name,
        supportRuntime.customProperties ?? undefined,
      )
      || readPlatformMotherRuntimeMode(supportRuntime.customProperties ?? undefined)
        !== PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT
      || normalizeOptionalString(supportRuntime.customProperties?.runtimeRole)
        !== PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE
    ) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_SUPPORT_RELEASE_TARGET_INVALID",
        message: "Platform Mother support release requires an active platform-owned support runtime.",
        supportRuntimeId: String(args.supportRuntimeId),
      });
    }

    const aliasCompatibilityMode =
      args.aliasCompatibilityMode
      || PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_QUINN_REQUIRED;
    const renameCleanupReady = args.renameCleanupReady === true;
    if (
      aliasCompatibilityMode === PLATFORM_MOTHER_ALIAS_COMPATIBILITY_MODE_MOTHER_ONLY
      && !renameCleanupReady
    ) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_ALIAS_RESOLUTION_REQUIRED",
        message:
          "Platform Mother rename cleanup cannot be scheduled without explicit rename safety review.",
        artifactId: artifact.artifactId,
      });
    }

    const reviewContext = artifact.reviewContext;
    const reviewedTargetIds = new Set(reviewContext.stagedTargetOrganizationIds);
    const canaryOrganizationIds =
      args.releaseStage === PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY
        ? dedupeAndSortOrganizationIds(args.canaryOrganizationIds ?? [])
        : [];
    if (
      args.releaseStage === PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_CANARY
      && canaryOrganizationIds.length === 0
    ) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_SUPPORT_RELEASE_TARGET_INVALID",
        message:
          "Platform Mother canary release requires at least one reviewed target organization.",
        artifactId: artifact.artifactId,
      });
    }
    if (
      canaryOrganizationIds.some((organizationId) => !reviewedTargetIds.has(String(organizationId)))
    ) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_SUPPORT_RELEASE_TARGET_INVALID",
        message:
          "Platform Mother canary release can only target organizations present in the approved review artifact.",
        artifactId: artifact.artifactId,
      });
    }
    if (
      args.releaseStage === PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_GENERAL_AVAILABILITY
      && reviewContext.rolloutWindow.partialRolloutDetected
    ) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_SUPPORT_RELEASE_REVIEW_REQUIRED",
        message:
          "Platform Mother general-availability release requires a review artifact without a partial rollout window.",
        artifactId: artifact.artifactId,
      });
    }
    if (
      artifact.aliasMigrationEvidence.canonicalIdentityName !== PLATFORM_MOTHER_CANONICAL_NAME
      || artifact.aliasMigrationEvidence.legacyIdentityAlias !== PLATFORM_MOTHER_LEGACY_NAME
    ) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_ALIAS_RESOLUTION_REQUIRED",
        message:
          "Platform Mother support release requires reviewed Quinn-to-Mother alias safety evidence.",
        artifactId: artifact.artifactId,
      });
    }

    const reviewedAt = Date.now();
    const nextReleaseStatus = readPlatformMotherSupportReleaseStatus({
      platformMotherSupportRelease: {
        contractVersion: PLATFORM_MOTHER_SUPPORT_RELEASE_CONTRACT_VERSION,
        stage: args.releaseStage,
        canaryOrganizationIds: canaryOrganizationIds.map((value) => String(value)),
        aliasCompatibilityMode,
        renameCleanupReady,
        reviewArtifactId: artifact.artifactId,
        approvedByUserId: artifact.approval.approverUserId,
        reviewedAt,
        ...(renameCleanupReady ? { renameSafetyReviewedAt: reviewedAt } : {}),
      },
    });
    const nextCustomProperties = {
      ...(supportRuntime.customProperties ?? {}),
      platformMotherSupportRelease: nextReleaseStatus,
    };

    await ctx.db.patch(args.supportRuntimeId, {
      customProperties: nextCustomProperties,
      updatedAt: reviewedAt,
    });

    const objectActionId = await ctx.db.insert("objectActions", {
      organizationId: platformOrganizationId,
      objectId: args.supportRuntimeId,
      actionType: PLATFORM_MOTHER_SUPPORT_RELEASE_ACTION_UPDATED,
      actionData: {
        contractVersion: PLATFORM_MOTHER_SUPPORT_RELEASE_CONTRACT_VERSION,
        supportRuntimeId: String(args.supportRuntimeId),
        reviewArtifactId: artifact.artifactId,
        artifactKind: artifact.artifactKind,
        releaseStage: nextReleaseStatus.stage,
        canaryOrganizationIds: nextReleaseStatus.canaryOrganizationIds,
        aliasCompatibilityMode: nextReleaseStatus.aliasCompatibilityMode,
        renameCleanupReady: nextReleaseStatus.renameCleanupReady,
        sourceMotherRuntimeId: String(runtimeContext.sourceMotherRuntimeId),
      },
      performedBy: runtimeContext.sourceMotherRuntimeId,
      performedAt: reviewedAt,
    });
    const auditLogId = await ctx.db.insert("auditLogs", {
      organizationId: platformOrganizationId,
      userId: artifact.approval.approverUserId as Id<"users">,
      action: PLATFORM_MOTHER_SUPPORT_RELEASE_ACTION_UPDATED,
      resource: "platform_mother_support_runtime",
      resourceId: String(args.supportRuntimeId),
      success: true,
      metadata: {
        reviewArtifactId: artifact.artifactId,
        artifactKind: artifact.artifactKind,
        releaseStage: nextReleaseStatus.stage,
        canaryOrganizationIds: nextReleaseStatus.canaryOrganizationIds,
        aliasCompatibilityMode: nextReleaseStatus.aliasCompatibilityMode,
        renameCleanupReady: nextReleaseStatus.renameCleanupReady,
      },
      createdAt: reviewedAt,
    });

    return {
      supportRuntimeId: String(args.supportRuntimeId),
      reviewArtifactId: artifact.artifactId,
      releaseStatus: nextReleaseStatus,
      objectActionId: String(objectActionId),
      auditLogId: String(auditLogId),
    };
  },
});

export const setPlatformMotherSupportRouteFlagsInternal = internalMutation({
  args: {
    artifactId: v.id("objects"),
    sourceMotherRuntimeId: v.id("objects"),
    supportRuntimeId: v.id("objects"),
    actorUserId: v.id("users"),
    platformOrganizationId: v.optional(v.id("organizations")),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const platformOrganizationId =
      args.platformOrganizationId ?? resolvePlatformOrgIdFromEnv();
    const record = (await ctx.db.get(args.artifactId)) as ReviewArtifactObjectRecord | null;
    const artifact = requirePlatformMotherReviewArtifact(record);
    if (!artifact) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_REVIEW_ARTIFACT_NOT_FOUND",
        message: "Platform Mother route flags require a persisted governance review artifact.",
        artifactId: String(args.artifactId),
      });
    }
    if (artifact.platformOrganizationId !== String(platformOrganizationId)) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_REVIEW_ARTIFACT_ORG_MISMATCH",
        message: "Platform Mother route flags review artifacts must remain on the platform org.",
        artifactId: artifact.artifactId,
      });
    }
    if (artifact.approvalStatus !== "approved" || !artifact.approval?.approverUserId) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_APPROVAL_REQUIRED",
        message:
          "Platform Mother route flags require an approved review artifact with approver identity.",
        artifactId: artifact.artifactId,
      });
    }

    const runtimeContext = await resolvePlatformMotherRuntimeContext(ctx, {
      runtimeMode: PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
      sourceMotherRuntimeId: args.sourceMotherRuntimeId,
    });
    const supportRuntime = await ctx.db.get(args.supportRuntimeId) as PlatformMotherRuntimeRecord | null;
    if (
      !supportRuntime
      || supportRuntime.type !== "org_agent"
      || supportRuntime.status !== "active"
      || String(supportRuntime.organizationId) !== String(platformOrganizationId)
      || !isPlatformMotherAuthorityRecord(
        supportRuntime.name,
        supportRuntime.customProperties ?? undefined,
      )
      || readPlatformMotherRuntimeMode(supportRuntime.customProperties ?? undefined)
        !== PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT
      || normalizeOptionalString(supportRuntime.customProperties?.runtimeRole)
        !== PLATFORM_MOTHER_SUPPORT_RUNTIME_ROLE
    ) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_SUPPORT_RELEASE_TARGET_INVALID",
        message: "Platform Mother route flags require an active platform-owned support runtime.",
        supportRuntimeId: String(args.supportRuntimeId),
      });
    }

    const currentReleaseStatus = readPlatformMotherSupportReleaseStatus(
      supportRuntime.customProperties ?? undefined,
    );
    if (
      args.enabled
      && (
        currentReleaseStatus.stage === "internal_only"
        || currentReleaseStatus.reviewArtifactId !== artifact.artifactId
        || !currentReleaseStatus.approvedByUserId
        || currentReleaseStatus.reviewedAt === undefined
      )
    ) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_SUPPORT_RELEASE_REVIEW_REQUIRED",
        message:
          "Platform Mother route flags can only go live after a persisted approved support release contract is stored on the support runtime.",
        artifactId: artifact.artifactId,
        supportRuntimeId: String(args.supportRuntimeId),
      });
    }

    const updatedAt = Date.now();
    const nextRouteFlags = readPlatformMotherSupportRouteFlagsStatus({
      ...(supportRuntime.customProperties ?? {}),
      platformMotherSupportRouteFlags: {
        contractVersion: PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_CONTRACT_VERSION,
        identityEnabled: args.enabled,
        supportRouteEnabled: args.enabled,
        reviewArtifactId: artifact.artifactId,
        updatedByUserId: String(args.actorUserId),
        updatedAt,
      },
    });
    const nextCustomProperties = {
      ...(supportRuntime.customProperties ?? {}),
      platformMotherSupportRouteFlags: nextRouteFlags,
    };

    await ctx.db.patch(args.supportRuntimeId, {
      customProperties: nextCustomProperties,
      updatedAt,
    });

    const objectActionId = await ctx.db.insert("objectActions", {
      organizationId: platformOrganizationId,
      objectId: args.supportRuntimeId,
      actionType: PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_ACTION_UPDATED,
      actionData: {
        contractVersion: PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_CONTRACT_VERSION,
        supportRuntimeId: String(args.supportRuntimeId),
        reviewArtifactId: artifact.artifactId,
        artifactKind: artifact.artifactKind,
        identityEnabled: nextRouteFlags.identityEnabled,
        supportRouteEnabled: nextRouteFlags.supportRouteEnabled,
        actorUserId: String(args.actorUserId),
        sourceMotherRuntimeId: String(runtimeContext.sourceMotherRuntimeId),
      },
      performedBy: runtimeContext.sourceMotherRuntimeId,
      performedAt: updatedAt,
    });
    const auditLogId = await ctx.db.insert("auditLogs", {
      organizationId: platformOrganizationId,
      userId: args.actorUserId,
      action: PLATFORM_MOTHER_SUPPORT_ROUTE_FLAGS_ACTION_UPDATED,
      resource: "platform_mother_support_runtime",
      resourceId: String(args.supportRuntimeId),
      success: true,
      metadata: {
        reviewArtifactId: artifact.artifactId,
        artifactKind: artifact.artifactKind,
        identityEnabled: nextRouteFlags.identityEnabled,
        supportRouteEnabled: nextRouteFlags.supportRouteEnabled,
      },
      createdAt: updatedAt,
    });

    return {
      supportRuntimeId: String(args.supportRuntimeId),
      reviewArtifactId: artifact.artifactId,
      routeFlags: nextRouteFlags,
      objectActionId: String(objectActionId),
      auditLogId: String(auditLogId),
    };
  },
});

export const getPlatformMotherSupportReleaseStatusInternal = internalQuery({
  args: {
    supportRuntimeId: v.id("objects"),
    platformOrganizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const platformOrganizationId =
      args.platformOrganizationId ?? resolvePlatformOrgIdFromEnv();
    const supportRuntime = await ctx.db.get(args.supportRuntimeId) as PlatformMotherRuntimeRecord | null;
    if (
      !supportRuntime
      || supportRuntime.type !== "org_agent"
      || supportRuntime.status !== "active"
      || String(supportRuntime.organizationId) !== String(platformOrganizationId)
      || !isPlatformMotherAuthorityRecord(
        supportRuntime.name,
        supportRuntime.customProperties ?? undefined,
      )
      || readPlatformMotherRuntimeMode(supportRuntime.customProperties ?? undefined)
        !== PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT
    ) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_SUPPORT_RELEASE_TARGET_INVALID",
        message: "Platform Mother support release status requires an active support runtime.",
        supportRuntimeId: String(args.supportRuntimeId),
      });
    }

    return {
      supportRuntimeId: String(supportRuntime._id),
      platformOrganizationId: String(platformOrganizationId),
      releaseStatus: readPlatformMotherSupportReleaseStatus(
        supportRuntime.customProperties ?? undefined,
      ),
    };
  },
});

export const listPlatformMotherReviewArtifactsInternal = internalQuery({
  args: {
    platformOrganizationId: v.optional(v.id("organizations")),
    artifactKind: v.optional(v.union(
      v.literal("proposal_review"),
      v.literal("drift_audit"),
      v.literal("migration_plan"),
      v.literal("org_intervention_review"),
    )),
    approvalStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    )),
    requestingOrganizationId: v.optional(v.id("organizations")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const platformOrganizationId =
      args.platformOrganizationId ?? resolvePlatformOrgIdFromEnv();
    const limit = Math.max(1, Math.min(args.limit ?? 50, 250));
    const records = (
      await ctx.db
        .query("objects")
        .withIndex("by_type", (q) => q.eq("type", PLATFORM_MOTHER_REVIEW_OBJECT_TYPE))
        .collect()
    )
      .filter((row) =>
        String(row.organizationId) === String(platformOrganizationId)
        && row.subtype === PLATFORM_MOTHER_REVIEW_OBJECT_SUBTYPE
      )
      .sort((left, right) => {
        const updatedAtDelta = (right.updatedAt ?? 0) - (left.updatedAt ?? 0);
        if (updatedAtDelta !== 0) {
          return updatedAtDelta;
        }
        return String(left._id).localeCompare(String(right._id));
      });

    const artifacts = records
      .map((record) => requirePlatformMotherReviewArtifact(record))
      .filter((artifact): artifact is PlatformMotherReviewArtifactRecord => Boolean(artifact))
      .filter((artifact) =>
        !args.artifactKind || artifact.artifactKind === args.artifactKind
      )
      .filter((artifact) =>
        !args.approvalStatus || artifact.approvalStatus === args.approvalStatus
      )
      .filter((artifact) =>
        !args.requestingOrganizationId
        || artifact.requestingOrganizationId === String(args.requestingOrganizationId)
      );

    const statusCounts = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const artifact of artifacts) {
      statusCounts[artifact.approvalStatus] += 1;
    }

    return {
      artifacts: artifacts.slice(0, limit),
      statusCounts,
      totalCount: artifacts.length,
    };
  },
});

export const getPlatformMotherReviewArtifactInternal = internalQuery({
  args: {
    artifactId: v.id("objects"),
    platformOrganizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const platformOrganizationId =
      args.platformOrganizationId ?? resolvePlatformOrgIdFromEnv();
    const record = (await ctx.db.get(args.artifactId)) as ReviewArtifactObjectRecord | null;
    if (!record) {
      return null;
    }
    if (String(record.organizationId) !== String(platformOrganizationId)) {
      throw new ConvexError({
        code: "PLATFORM_MOTHER_REVIEW_ARTIFACT_ORG_MISMATCH",
        message: "Platform Mother review artifacts must remain on the platform org.",
        artifactId: String(args.artifactId),
      });
    }

    const artifact = requirePlatformMotherReviewArtifact(record);
    if (!artifact) {
      return null;
    }

    const objectActions = await ctx.db
      .query("objectActions")
      .withIndex("by_object", (q) => q.eq("objectId", args.artifactId))
      .collect();
    const auditLogs = (
      await ctx.db
        .query("auditLogs")
        .withIndex("by_org_and_resource", (q) =>
          q
            .eq("organizationId", platformOrganizationId)
            .eq("resource", PLATFORM_MOTHER_REVIEW_OBJECT_TYPE),
        )
        .collect()
    )
      .filter((row) => String(row.resourceId ?? "") === String(args.artifactId))
      .sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0));
    const relatedObjectActions = (
      await Promise.all(
        artifact.execution.downstreamObjectActionIds.map(async (id) =>
          ctx.db.get(id as Id<"objectActions">)
        ),
      )
    ).filter((row): row is NonNullable<typeof row> => Boolean(row));
    const relatedAuditLogs = (
      await Promise.all(
        artifact.execution.downstreamAuditLogIds.map(async (id) =>
          ctx.db.get(id as Id<"auditLogs">)
        ),
      )
    ).filter((row): row is NonNullable<typeof row> => Boolean(row));

    return {
      artifact,
      evidence: {
        objectActions,
        auditLogs,
        relatedObjectActions,
        relatedAuditLogs,
      },
    };
  },
});
