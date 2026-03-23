import { ConvexError, v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import {
  DEFAULT_ORG_AGENT_TEMPLATE_ROLE,
  PLATFORM_MOTHER_POLICY_FAMILY_CONTRACT_VERSION,
  PLATFORM_MOTHER_ROLLOUT_GATE_REQUIREMENTS_CONTRACT_VERSION,
  buildPlatformMotherRolloutGateRequirements,
  resolvePlatformMotherPolicyFamilyScope,
  runTemplateDistributionLifecycle,
  type PlatformMotherPolicyFamilyScope,
  type PlatformMotherRolloutGateRequirements,
} from "../agentOntology";
import {
  PLATFORM_MOTHER_CANONICAL_NAME,
  PLATFORM_MOTHER_LEGACY_NAME,
  PLATFORM_MOTHER_RUNTIME_MODE_GOVERNANCE,
  PLATFORM_MOTHER_RUNTIME_MODE_SUPPORT,
  isPlatformMotherAuthorityRecord,
  readPlatformMotherRuntimeMode,
} from "../platformMother";

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

const PLATFORM_MOTHER_REVIEW_ARTIFACT_KIND = "proposal_review";

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

export interface PlatformMotherReviewArtifact {
  contractVersion: typeof PLATFORM_MOTHER_REVIEW_ARTIFACT_CONTRACT_VERSION;
  artifactKind: typeof PLATFORM_MOTHER_REVIEW_ARTIFACT_KIND;
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
  customProperties?: Record<string, unknown>;
};

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

  const artifactKind = normalizeOptionalString(value.artifactKind);
  if (artifactKind && artifactKind !== PLATFORM_MOTHER_REVIEW_ARTIFACT_KIND) {
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

  return {
    contractVersion: PLATFORM_MOTHER_REVIEW_ARTIFACT_CONTRACT_VERSION,
    artifactKind: PLATFORM_MOTHER_REVIEW_ARTIFACT_KIND,
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
    const policyFamilyScope = resolvePlatformMotherPolicyFamilyScope(
      (dryRunResult?.plan ?? []).flatMap((row) => [
        ...(row.changedFields ?? []),
        ...(row.writableTemplateFields ?? []),
        ...(row.policyGate?.evaluatedFields ?? []),
        ...(row.policyGate?.changedFields ?? []),
        ...(row.policyGate?.lockedFields ?? []),
        ...(row.policyGate?.warnFields ?? []),
        ...(row.policyGate?.freeFields ?? []),
      ]),
    );
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
          ? {
              status: "dry_run_pending",
              dryRunCorrelationId: dryRunResult.distributionJobId,
              downstreamObjectActionIds: [String(dryRunResult.lifecycleActionId)],
              downstreamAuditLogIds: [],
              templateDistributionJobId: dryRunResult.distributionJobId,
              executionSummary:
                `Read-only managed-clone dry run planned for ${dryRunResult.targetOrganizationIds.length} organization(s).`,
              recordedAt: dryRunResult.recordedAt,
            }
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
      dryRun: dryRunResult
        ? {
            distributionJobId: dryRunResult.distributionJobId,
            templateId: String(dryRunResult.templateId),
            templateVersionId: dryRunResult.templateVersionId
              ? String(dryRunResult.templateVersionId)
              : undefined,
            templateVersion: dryRunResult.templateVersion,
            targetOrganizationIds: dryRunResult.targetOrganizationIds.map((value) =>
              String(value),
            ),
            summary: dryRunResult.summary,
            policyGates: dryRunResult.policyGates,
            reasonCounts: dryRunResult.reasonCounts,
            plan: dryRunResult.plan,
            lifecycleActionId: String(dryRunResult.lifecycleActionId),
            recordedAt: dryRunResult.recordedAt,
          }
        : null,
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

    return {
      artifact,
      evidence: {
        objectActions,
        auditLogs,
      },
    };
  },
});
