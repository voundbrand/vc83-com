import { defineTable } from "convex/server";
import { v } from "convex/values";

export const ORG_AGENT_ACTION_RUNTIME_CONTRACT_VERSION =
  "org_agent_action_runtime_v1" as const;

// Canonical ontology object taxonomy for OAR artifacts.
export const ORG_AGENT_ACTIVITY_OBJECT_TYPE = "org_agent_activity" as const;
export const ORG_AGENT_ACTION_ITEM_OBJECT_TYPE = "org_agent_action_item" as const;

export const ORG_AGENT_ACTIVITY_KIND_VALUES = [
  "session_outcome_captured",
  "crm_projection_applied",
  "action_item_created",
  "approval_requested",
  "approval_resolved",
  "action_assigned",
  "execution_started",
  "execution_succeeded",
  "execution_failed",
  "human_takeover_started",
  "human_takeover_resumed",
  "external_sync_dispatched",
  "external_sync_succeeded",
  "external_sync_failed",
] as const;
export type OrgAgentActivityKind = (typeof ORG_AGENT_ACTIVITY_KIND_VALUES)[number];

export const ORG_AGENT_ACTION_ITEM_STATUS_VALUES = [
  "pending_review",
  "assigned",
  "approved",
  "executing",
  "completed",
  "failed",
  "cancelled",
] as const;
export type OrgAgentActionItemStatus =
  (typeof ORG_AGENT_ACTION_ITEM_STATUS_VALUES)[number];

export const ORG_ACTION_POLICY_DECISION_VALUES = [
  "owner_only",
  "approval_required",
  "agent_auto_allowed",
] as const;
export type OrgActionPolicyDecision =
  (typeof ORG_ACTION_POLICY_DECISION_VALUES)[number];
export const COMPLIANCE_ACTION_POLICY_MAP_CONTRACT_VERSION =
  "compliance_action_policy_map_v1" as const;
export const COMPLIANCE_ACTION_POLICY_SURFACE_VALUES = [
  "inbox",
  "vault",
  "governance",
] as const;
export type ComplianceActionPolicySurface =
  (typeof COMPLIANCE_ACTION_POLICY_SURFACE_VALUES)[number];

export const COMPLIANCE_SHADOW_MODE_EVALUATOR_CONTRACT_VERSION =
  "compliance_shadow_mode_evaluator_v1" as const;
export const COMPLIANCE_SHADOW_MODE_SURFACE_VALUES = [
  "finder",
  "layers",
  "ai_chat",
  "compliance_center",
  "unknown",
] as const;
export type ComplianceShadowModeSurface =
  (typeof COMPLIANCE_SHADOW_MODE_SURFACE_VALUES)[number];

export const COMPLIANCE_SHADOW_MODE_EVALUATION_STATUS_VALUES = [
  "disabled",
  "skipped",
  "evaluated",
] as const;
export type ComplianceShadowModeEvaluationStatus =
  (typeof COMPLIANCE_SHADOW_MODE_EVALUATION_STATUS_VALUES)[number];

export const ORG_ACTION_POLICY_RISK_LEVEL_VALUES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type OrgActionPolicyRiskLevel =
  (typeof ORG_ACTION_POLICY_RISK_LEVEL_VALUES)[number];

export const ORG_ACTION_TARGET_SYSTEM_CLASS_VALUES = [
  "platform_internal",
  "external_connector",
] as const;
export type OrgActionTargetSystemClass =
  (typeof ORG_ACTION_TARGET_SYSTEM_CLASS_VALUES)[number];

export const ORG_ACTION_EXECUTION_STATUS_VALUES = [
  "queued",
  "started",
  "succeeded",
  "failed",
  "compensated",
  "cancelled",
] as const;
export type OrgActionExecutionStatus =
  (typeof ORG_ACTION_EXECUTION_STATUS_VALUES)[number];

export const ORG_ACTION_SYNC_BINDING_STATUS_VALUES = [
  "active",
  "stale",
  "conflict",
  "deleted",
] as const;
export type OrgActionSyncBindingStatus =
  (typeof ORG_ACTION_SYNC_BINDING_STATUS_VALUES)[number];

// Canonical objectLinks.linkType catalog for OAR graph relationships.
export const ORG_AGENT_LINK_TYPE_VALUES = [
  "org_agent_activity_source_session",
  "org_agent_activity_subject_contact",
  "org_agent_activity_subject_organization",
  "org_agent_activity_policy_snapshot",
  "org_agent_activity_action_item",
  "org_agent_action_item_source_activity",
  "org_agent_action_item_assignee",
  "org_agent_action_item_execution_receipt",
  "org_agent_action_item_sync_binding",
] as const;
export type OrgAgentLinkType = (typeof ORG_AGENT_LINK_TYPE_VALUES)[number];

// Canonical objectActions.actionType catalog for OAR mutations/audit.
export const ORG_AGENT_OBJECT_ACTION_TYPE_VALUES = [
  "org_action_policy_snapshot_recorded",
  "org_action_item_created",
  "org_action_item_state_changed",
  "org_action_execution_receipt_recorded",
  "org_action_sync_binding_recorded",
] as const;
export type OrgAgentObjectActionType =
  (typeof ORG_AGENT_OBJECT_ACTION_TYPE_VALUES)[number];

export const ORG_ACTION_POLICY_SNAPSHOT_CONTRACT_VERSION =
  "org_action_policy_snapshot_v1" as const;

export interface OrgActionPolicySnapshotV1 {
  contractVersion: typeof ORG_ACTION_POLICY_SNAPSHOT_CONTRACT_VERSION;
  decision: OrgActionPolicyDecision;
  actionFamily: string;
  riskLevel: OrgActionPolicyRiskLevel;
  channel: string;
  targetSystemClass: OrgActionTargetSystemClass;
  decisionReason?: string;
  resolvedAt: number;
  resolverRef?: string;
}

export interface ComplianceActionPolicyMapEntryV1 {
  contractVersion: typeof COMPLIANCE_ACTION_POLICY_MAP_CONTRACT_VERSION;
  actionFamily: string;
  surface: ComplianceActionPolicySurface;
  decision: OrgActionPolicyDecision;
  reasonCode: string;
  riskLevel: OrgActionPolicyRiskLevel;
}

export function isOrgActionPolicyDecision(
  value: string,
): value is OrgActionPolicyDecision {
  return (ORG_ACTION_POLICY_DECISION_VALUES as readonly string[]).includes(value);
}

export function isComplianceActionPolicySurface(
  value: string,
): value is ComplianceActionPolicySurface {
  return (COMPLIANCE_ACTION_POLICY_SURFACE_VALUES as readonly string[]).includes(value);
}

export function isComplianceShadowModeSurface(
  value: string,
): value is ComplianceShadowModeSurface {
  return (COMPLIANCE_SHADOW_MODE_SURFACE_VALUES as readonly string[]).includes(value);
}

export function isOrgAgentActionItemStatus(
  value: string,
): value is OrgAgentActionItemStatus {
  return (ORG_AGENT_ACTION_ITEM_STATUS_VALUES as readonly string[]).includes(value);
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeActionPolicyDecision(
  value: unknown,
): OrgActionPolicyDecision | null {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized || !isOrgActionPolicyDecision(normalized)) {
    return null;
  }
  return normalized;
}

function normalizeRiskLevel(value: unknown): OrgActionPolicyRiskLevel | null {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized) {
    return null;
  }
  return (ORG_ACTION_POLICY_RISK_LEVEL_VALUES as readonly string[]).includes(
    normalized,
  )
    ? (normalized as OrgActionPolicyRiskLevel)
    : null;
}

function normalizeTargetSystemClass(
  value: unknown,
): OrgActionTargetSystemClass | null {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized) {
    return null;
  }
  return (ORG_ACTION_TARGET_SYSTEM_CLASS_VALUES as readonly string[]).includes(
    normalized,
  )
    ? (normalized as OrgActionTargetSystemClass)
    : null;
}

export function normalizeOrgActionPolicySnapshot(
  value: unknown,
): OrgActionPolicySnapshotV1 | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const contractVersion = normalizeNonEmptyString(record.contractVersion);
  const decision = normalizeActionPolicyDecision(record.decision);
  const actionFamily = normalizeNonEmptyString(record.actionFamily);
  const riskLevel = normalizeRiskLevel(record.riskLevel);
  const channel = normalizeNonEmptyString(record.channel);
  const targetSystemClass = normalizeTargetSystemClass(record.targetSystemClass);
  const resolvedAt = typeof record.resolvedAt === "number" ? record.resolvedAt : NaN;

  if (
    contractVersion !== ORG_ACTION_POLICY_SNAPSHOT_CONTRACT_VERSION
    || !decision
    || !actionFamily
    || !riskLevel
    || !channel
    || !targetSystemClass
    || !Number.isFinite(resolvedAt)
    || resolvedAt <= 0
  ) {
    return null;
  }

  const decisionReason = normalizeNonEmptyString(record.decisionReason) ?? undefined;
  const resolverRef = normalizeNonEmptyString(record.resolverRef) ?? undefined;

  return {
    contractVersion: ORG_ACTION_POLICY_SNAPSHOT_CONTRACT_VERSION,
    decision,
    actionFamily,
    riskLevel,
    channel,
    targetSystemClass,
    decisionReason,
    resolvedAt,
    resolverRef,
  };
}

export const orgActionPolicyDecisionValidator = v.union(
  v.literal("owner_only"),
  v.literal("approval_required"),
  v.literal("agent_auto_allowed"),
);
export const complianceActionPolicySurfaceValidator = v.union(
  v.literal("inbox"),
  v.literal("vault"),
  v.literal("governance"),
);
export const complianceShadowModeSurfaceValidator = v.union(
  v.literal("finder"),
  v.literal("layers"),
  v.literal("ai_chat"),
  v.literal("compliance_center"),
  v.literal("unknown"),
);
export const complianceShadowModeEvaluationStatusValidator = v.union(
  v.literal("disabled"),
  v.literal("skipped"),
  v.literal("evaluated"),
);

export const orgActionPolicyRiskLevelValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

export const orgActionTargetSystemClassValidator = v.union(
  v.literal("platform_internal"),
  v.literal("external_connector"),
);

export const orgActionExecutionStatusValidator = v.union(
  v.literal("queued"),
  v.literal("started"),
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("compensated"),
  v.literal("cancelled"),
);

export const orgActionSyncBindingStatusValidator = v.union(
  v.literal("active"),
  v.literal("stale"),
  v.literal("conflict"),
  v.literal("deleted"),
);

export const orgActionPolicySnapshotValidator = v.object({
  contractVersion: v.literal(ORG_ACTION_POLICY_SNAPSHOT_CONTRACT_VERSION),
  decision: orgActionPolicyDecisionValidator,
  actionFamily: v.string(),
  riskLevel: orgActionPolicyRiskLevelValidator,
  channel: v.string(),
  targetSystemClass: orgActionTargetSystemClassValidator,
  decisionReason: v.optional(v.string()),
  resolvedAt: v.number(),
  resolverRef: v.optional(v.string()),
});
export const complianceActionPolicyMapEntryValidator = v.object({
  contractVersion: v.literal(COMPLIANCE_ACTION_POLICY_MAP_CONTRACT_VERSION),
  actionFamily: v.string(),
  surface: complianceActionPolicySurfaceValidator,
  decision: orgActionPolicyDecisionValidator,
  reasonCode: v.string(),
  riskLevel: orgActionPolicyRiskLevelValidator,
});

// Dedicated receipt table for replay-safe, idempotent execution attempts.
export const orgActionExecutionReceipts = defineTable({
  organizationId: v.id("organizations"),
  actionItemObjectId: v.id("objects"),
  sourceActivityObjectId: v.optional(v.id("objects")),
  sessionId: v.optional(v.id("agentSessions")),
  policySnapshotId: v.optional(v.id("orgActionPolicySnapshots")),
  executionStatus: orgActionExecutionStatusValidator,
  idempotencyKey: v.string(),
  correlationId: v.string(),
  attemptNumber: v.number(),
  actionFamily: v.string(),
  targetSystemClass: orgActionTargetSystemClassValidator,
  policyDecision: orgActionPolicyDecisionValidator,
  providerKey: v.optional(v.string()),
  providerAttemptId: v.optional(v.string()),
  receiptPayload: v.optional(v.record(v.string(), v.any())),
  errorCode: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_action_item", ["actionItemObjectId"])
  .index("by_org_action_item", ["organizationId", "actionItemObjectId"])
  .index("by_org_status", ["organizationId", "executionStatus"])
  .index("by_org_idempotency_key", ["organizationId", "idempotencyKey"])
  .index("by_org_correlation_id", ["organizationId", "correlationId"]);

// Policy snapshots are durable records so historical action decisions stay auditable.
export const orgActionPolicySnapshots = defineTable({
  organizationId: v.id("organizations"),
  actionItemObjectId: v.id("objects"),
  sourceActivityObjectId: v.optional(v.id("objects")),
  sessionId: v.optional(v.id("agentSessions")),
  snapshot: orgActionPolicySnapshotValidator,
  decision: orgActionPolicyDecisionValidator,
  actionFamily: v.string(),
  riskLevel: orgActionPolicyRiskLevelValidator,
  channel: v.string(),
  targetSystemClass: orgActionTargetSystemClassValidator,
  resolvedAt: v.number(),
  createdBy: v.optional(v.union(v.id("users"), v.id("objects"))),
  createdAt: v.number(),
})
  .index("by_action_item", ["actionItemObjectId"])
  .index("by_org_action_item", ["organizationId", "actionItemObjectId"])
  .index("by_org_decision", ["organizationId", "decision"])
  .index("by_org_resolved_at", ["organizationId", "resolvedAt"]);

// Canonical ↔ connector identity mapping for downstream CRM projections.
export const orgActionSyncBindings = defineTable({
  organizationId: v.id("organizations"),
  canonicalObjectId: v.id("objects"),
  canonicalObjectType: v.string(),
  connectorKey: v.string(),
  externalRecordId: v.string(),
  externalRecordType: v.string(),
  bindingStatus: orgActionSyncBindingStatusValidator,
  lastSyncedAt: v.optional(v.number()),
  syncCursor: v.optional(v.string()),
  metadata: v.optional(v.record(v.string(), v.any())),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org_canonical_object", ["organizationId", "canonicalObjectId"])
  .index("by_org_connector_external", [
    "organizationId",
    "connectorKey",
    "externalRecordId",
  ])
  .index("by_org_connector_status", [
    "organizationId",
    "connectorKey",
    "bindingStatus",
  ]);
