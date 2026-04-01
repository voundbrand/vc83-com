import { internalMutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import {
  COMPLIANCE_ACTION_POLICY_MAP_CONTRACT_VERSION,
  ORG_ACTION_POLICY_SNAPSHOT_CONTRACT_VERSION,
  orgActionPolicyRiskLevelValidator,
  orgActionPolicyDecisionValidator,
  orgActionTargetSystemClassValidator,
  type ComplianceActionPolicyMapEntryV1,
  type OrgActionPolicyDecision,
  type OrgActionPolicyRiskLevel,
  type OrgActionTargetSystemClass,
  type OrgActionPolicySnapshotV1,
} from "../schemas/orgAgentActionRuntimeSchemas";

export const ORG_ACTION_POLICY_RESOLVER_CONTRACT_VERSION =
  "org_action_policy_resolver_v1" as const;
export const COMPLIANCE_ACTION_RUNTIME_CONTRACT_VERSION =
  "compliance_action_runtime_v1" as const;
export const LEGAL_FRONT_OFFICE_OUTWARD_COMMITMENT_CONTRACT_VERSION =
  "legal_front_office_outward_commitment_v1" as const;
export const COMPLIANCE_ACTION_LIFECYCLE_STAGE_VALUES = [
  "plan",
  "gate",
  "execute",
  "verify",
  "audit",
] as const;
export const COMPLIANCE_ACTION_APPROVAL_CHECKPOINT_VALUES = [
  "none",
  "org_owner_review",
  "org_owner_outbound_confirmation",
  "org_owner_gate_decision",
] as const;
const LEGAL_FRONT_OFFICE_COMMITMENT_TOOL_NAMES = new Set([
  "manage_bookings",
  "send_email_from_template",
  "escalate_to_human",
]);
const LEGAL_FRONT_OFFICE_COMMITMENT_CONTENT_PATTERN =
  /\b(termin (ist )?(gebucht|best[äa]tigt)|appointment (is )?(booked|confirmed)|callback (is )?confirmed|r(?:u|ue)ckruf (ist )?best[äa]tigt)\b/i;

export interface OrgActionPolicyScopeConfig {
  ownerOnlyActionFamilies?: string[];
  approvalRequiredActionFamilies?: string[];
  autoAllowedActionFamilies?: string[];
  blockedChannels?: string[];
  autoAllowedChannels?: string[];
}

export interface OrgActionPolicyDecisionResult {
  contractVersion: typeof ORG_ACTION_POLICY_RESOLVER_CONTRACT_VERSION;
  decision: OrgActionPolicyDecision;
  reasonCode: string;
  actionFamily: string;
  riskLevel: OrgActionPolicyRiskLevel;
  channel: string;
  targetSystemClass: OrgActionTargetSystemClass;
}

export type ComplianceActionLifecycleStage =
  (typeof COMPLIANCE_ACTION_LIFECYCLE_STAGE_VALUES)[number];
export type ComplianceActionApprovalCheckpoint =
  (typeof COMPLIANCE_ACTION_APPROVAL_CHECKPOINT_VALUES)[number];

export interface ComplianceActionRuntimeGateResult {
  contractVersion: typeof COMPLIANCE_ACTION_RUNTIME_CONTRACT_VERSION;
  stageOrder: readonly ComplianceActionLifecycleStage[];
  actionFamily: string;
  riskLevel: OrgActionPolicyRiskLevel;
  channel: string;
  targetSystemClass: OrgActionTargetSystemClass;
  policyDecision: OrgActionPolicyDecision;
  policyReasonCode: string;
  approval: {
    required: boolean;
    checkpoint: ComplianceActionApprovalCheckpoint;
    satisfied: boolean;
  };
  gate: {
    status: "passed" | "blocked";
    reasonCode: string;
    failClosed: boolean;
  };
}

export interface ComplianceActionLifecycleAuditSnapshot {
  contractVersion: typeof COMPLIANCE_ACTION_RUNTIME_CONTRACT_VERSION;
  stageOrder: readonly ComplianceActionLifecycleStage[];
  actionFamily: string;
  policyDecision: OrgActionPolicyDecision;
  policyReasonCode: string;
  approvalCheckpoint: ComplianceActionApprovalCheckpoint;
  stages: {
    plan: { status: "completed"; at: number };
    gate: {
      status: "passed" | "blocked";
      at: number;
      reasonCode: string;
      failClosed: boolean;
    };
    execute: {
      status: "completed" | "skipped";
      at: number | null;
      reasonCode: string | null;
    };
    verify: {
      status: "passed" | "failed" | "skipped";
      at: number | null;
      reasonCode: string | null;
    };
    audit: {
      status: "recorded" | "missing";
      at: number | null;
      auditRef: string | null;
    };
  };
  failClosed: boolean;
}

export interface LegalFrontOfficeOutwardCommitmentIntent {
  contractVersion: typeof LEGAL_FRONT_OFFICE_OUTWARD_COMMITMENT_CONTRACT_VERSION;
  pathDetected: boolean;
  commitmentDetected: boolean;
  requiresComplianceEvaluator: boolean;
  reasonCodes: string[];
}

const COMPLIANCE_ACTION_POLICY_MAP_ENTRIES: ReadonlyArray<ComplianceActionPolicyMapEntryV1> = [
  {
    contractVersion: COMPLIANCE_ACTION_POLICY_MAP_CONTRACT_VERSION,
    actionFamily: "compliance_queue_avv_outreach_email",
    surface: "inbox",
    decision: "owner_only",
    reasonCode: "compliance_surface_inbox_owner_only",
    riskLevel: "high",
  },
  {
    contractVersion: COMPLIANCE_ACTION_POLICY_MAP_CONTRACT_VERSION,
    actionFamily: "compliance_capture_avv_outreach_response",
    surface: "inbox",
    decision: "approval_required",
    reasonCode: "compliance_surface_inbox_approval_required",
    riskLevel: "medium",
  },
  {
    contractVersion: COMPLIANCE_ACTION_POLICY_MAP_CONTRACT_VERSION,
    actionFamily: "compliance_add_risk_evidence",
    surface: "vault",
    decision: "approval_required",
    reasonCode: "compliance_surface_vault_approval_required",
    riskLevel: "medium",
  },
  {
    contractVersion: COMPLIANCE_ACTION_POLICY_MAP_CONTRACT_VERSION,
    actionFamily: "compliance_link_avv_outreach_evidence",
    surface: "vault",
    decision: "approval_required",
    reasonCode: "compliance_surface_vault_approval_required",
    riskLevel: "medium",
  },
  {
    contractVersion: COMPLIANCE_ACTION_POLICY_MAP_CONTRACT_VERSION,
    actionFamily: "compliance_save_risk_assessment",
    surface: "governance",
    decision: "owner_only",
    reasonCode: "compliance_surface_governance_owner_only",
    riskLevel: "high",
  },
  {
    contractVersion: COMPLIANCE_ACTION_POLICY_MAP_CONTRACT_VERSION,
    actionFamily: "compliance_set_owner_gate_decision",
    surface: "governance",
    decision: "owner_only",
    reasonCode: "compliance_surface_governance_owner_only",
    riskLevel: "critical",
  },
] as const;
const COMPLIANCE_ACTION_POLICY_MAP_BY_FAMILY = new Map(
  COMPLIANCE_ACTION_POLICY_MAP_ENTRIES.map((entry) => [entry.actionFamily, entry]),
);

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLowercaseToken(value: unknown): string | null {
  const normalized = normalizeNonEmptyString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .map((entry) => normalizeNonEmptyString(entry))
        .filter((entry): entry is string => Boolean(entry))
        .map((entry) => entry.toLowerCase()),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

export function resolveLegalFrontOfficeOutwardCommitmentIntent(args: {
  structuredHandoffPacket?: {
    sourceAgent?: string;
    targetAgent?: string;
  } | null;
  plannedToolNames?: string[];
  assistantContent?: string | null;
}): LegalFrontOfficeOutwardCommitmentIntent {
  const sourceAgent = normalizeLowercaseToken(args.structuredHandoffPacket?.sourceAgent);
  const targetAgent = normalizeLowercaseToken(args.structuredHandoffPacket?.targetAgent);
  const pathDetected =
    Boolean(sourceAgent?.includes("clara"))
    && Boolean(targetAgent?.includes("helena"));

  const plannedToolNames = normalizeStringList(args.plannedToolNames).map((toolName) =>
    toolName.toLowerCase(),
  );
  const toolCommitmentSignal = plannedToolNames.some((toolName) =>
    LEGAL_FRONT_OFFICE_COMMITMENT_TOOL_NAMES.has(toolName),
  );
  const assistantContent =
    normalizeNonEmptyString(args.assistantContent ?? null) ?? "";
  const contentCommitmentSignal =
    assistantContent.length > 0
      && LEGAL_FRONT_OFFICE_COMMITMENT_CONTENT_PATTERN.test(assistantContent);
  const commitmentDetected = toolCommitmentSignal || contentCommitmentSignal;
  const reasonCodes: string[] = [];
  if (pathDetected) {
    reasonCodes.push("clara_to_helena_path_detected");
  }
  if (toolCommitmentSignal) {
    reasonCodes.push("tool_commitment_signal");
  }
  if (contentCommitmentSignal) {
    reasonCodes.push("content_commitment_signal");
  }
  if (reasonCodes.length === 0) {
    reasonCodes.push("no_legal_commitment_signal");
  }

  return {
    contractVersion: LEGAL_FRONT_OFFICE_OUTWARD_COMMITMENT_CONTRACT_VERSION,
    pathDetected,
    commitmentDetected,
    requiresComplianceEvaluator: pathDetected && commitmentDetected,
    reasonCodes: reasonCodes.sort((left, right) => left.localeCompare(right)),
  };
}

function normalizeRiskLevel(value: unknown): OrgActionPolicyRiskLevel {
  if (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "critical"
  ) {
    return value;
  }
  return "high";
}

function normalizeTargetSystemClass(
  value: unknown,
): OrgActionTargetSystemClass {
  return value === "external_connector"
    ? "external_connector"
    : "platform_internal";
}

function normalizeFiniteTimestamp(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function normalizeScopeConfig(value: unknown): OrgActionPolicyScopeConfig {
  if (!value || typeof value !== "object") {
    return {};
  }
  const record = value as Record<string, unknown>;
  return {
    ownerOnlyActionFamilies: normalizeStringList(record.ownerOnlyActionFamilies),
    approvalRequiredActionFamilies: normalizeStringList(
      record.approvalRequiredActionFamilies,
    ),
    autoAllowedActionFamilies: normalizeStringList(record.autoAllowedActionFamilies),
    blockedChannels: normalizeStringList(record.blockedChannels),
    autoAllowedChannels: normalizeStringList(record.autoAllowedChannels),
  };
}

function mergeScopeConfig(
  orgScope: OrgActionPolicyScopeConfig,
  agentScope: OrgActionPolicyScopeConfig,
): OrgActionPolicyScopeConfig {
  return {
    ownerOnlyActionFamilies: Array.from(
      new Set([
        ...(orgScope.ownerOnlyActionFamilies || []),
        ...(agentScope.ownerOnlyActionFamilies || []),
      ]),
    ),
    approvalRequiredActionFamilies: Array.from(
      new Set([
        ...(orgScope.approvalRequiredActionFamilies || []),
        ...(agentScope.approvalRequiredActionFamilies || []),
      ]),
    ),
    autoAllowedActionFamilies: Array.from(
      new Set([
        ...(orgScope.autoAllowedActionFamilies || []),
        ...(agentScope.autoAllowedActionFamilies || []),
      ]),
    ),
    blockedChannels: Array.from(
      new Set([
        ...(orgScope.blockedChannels || []),
        ...(agentScope.blockedChannels || []),
      ]),
    ),
    autoAllowedChannels: Array.from(
      new Set([
        ...(orgScope.autoAllowedChannels || []),
        ...(agentScope.autoAllowedChannels || []),
      ]),
    ),
  };
}

export function resolveComplianceActionPolicyMapEntry(
  actionFamily: string | null | undefined,
): ComplianceActionPolicyMapEntryV1 | null {
  const normalizedActionFamily = normalizeNonEmptyString(actionFamily)?.toLowerCase();
  if (!normalizedActionFamily) {
    return null;
  }
  const entry = COMPLIANCE_ACTION_POLICY_MAP_BY_FAMILY.get(normalizedActionFamily);
  if (!entry) {
    return null;
  }
  return { ...entry };
}

export function resolveOrgActionPolicyDecision(args: {
  actionFamily?: string | null;
  riskLevel?: OrgActionPolicyRiskLevel | null;
  channel?: string | null;
  targetSystemClass?: OrgActionTargetSystemClass | null;
  orgScope?: OrgActionPolicyScopeConfig | null;
  agentScope?: OrgActionPolicyScopeConfig | null;
}): OrgActionPolicyDecisionResult {
  const actionFamily =
    normalizeNonEmptyString(args.actionFamily)?.toLowerCase() || "unknown_action";
  const channel = normalizeNonEmptyString(args.channel)?.toLowerCase() || "unknown";
  const riskLevel = normalizeRiskLevel(args.riskLevel);
  const targetSystemClass = normalizeTargetSystemClass(args.targetSystemClass);

  if (actionFamily === "unknown_action") {
    return {
      contractVersion: ORG_ACTION_POLICY_RESOLVER_CONTRACT_VERSION,
      decision: "owner_only",
      reasonCode: "missing_action_family",
      actionFamily,
      riskLevel,
      channel,
      targetSystemClass,
    };
  }

  const mappedCompliancePolicy = resolveComplianceActionPolicyMapEntry(actionFamily);
  if (
    mappedCompliancePolicy
    && (
      targetSystemClass !== "external_connector"
      || mappedCompliancePolicy.decision === "owner_only"
    )
  ) {
    return {
      contractVersion: ORG_ACTION_POLICY_RESOLVER_CONTRACT_VERSION,
      decision: mappedCompliancePolicy.decision,
      reasonCode: mappedCompliancePolicy.reasonCode,
      actionFamily,
      riskLevel: mappedCompliancePolicy.riskLevel,
      channel,
      targetSystemClass,
    };
  }

  if (targetSystemClass === "external_connector") {
    return {
      contractVersion: ORG_ACTION_POLICY_RESOLVER_CONTRACT_VERSION,
      decision: "owner_only",
      reasonCode: "external_connector_fail_closed",
      actionFamily,
      riskLevel,
      channel,
      targetSystemClass,
    };
  }

  const mergedScope = mergeScopeConfig(
    normalizeScopeConfig(args.orgScope),
    normalizeScopeConfig(args.agentScope),
  );

  if ((mergedScope.blockedChannels || []).includes(channel)) {
    return {
      contractVersion: ORG_ACTION_POLICY_RESOLVER_CONTRACT_VERSION,
      decision: "owner_only",
      reasonCode: "channel_blocked",
      actionFamily,
      riskLevel,
      channel,
      targetSystemClass,
    };
  }

  if (
    riskLevel === "critical" ||
    riskLevel === "high" ||
    (mergedScope.ownerOnlyActionFamilies || []).includes(actionFamily)
  ) {
    return {
      contractVersion: ORG_ACTION_POLICY_RESOLVER_CONTRACT_VERSION,
      decision: "owner_only",
      reasonCode:
        riskLevel === "critical" || riskLevel === "high"
          ? `risk_${riskLevel}`
          : "owner_only_scope_override",
      actionFamily,
      riskLevel,
      channel,
      targetSystemClass,
    };
  }

  if ((mergedScope.approvalRequiredActionFamilies || []).includes(actionFamily)) {
    return {
      contractVersion: ORG_ACTION_POLICY_RESOLVER_CONTRACT_VERSION,
      decision: "approval_required",
      reasonCode: "approval_scope_override",
      actionFamily,
      riskLevel,
      channel,
      targetSystemClass,
    };
  }

  if ((mergedScope.autoAllowedActionFamilies || []).includes(actionFamily)) {
    const autoAllowedChannels = mergedScope.autoAllowedChannels || [];
    const channelAllowed =
      autoAllowedChannels.length === 0 || autoAllowedChannels.includes(channel);
    if (riskLevel === "low" && channelAllowed) {
      return {
        contractVersion: ORG_ACTION_POLICY_RESOLVER_CONTRACT_VERSION,
        decision: "agent_auto_allowed",
        reasonCode: "auto_scope_override",
        actionFamily,
        riskLevel,
        channel,
        targetSystemClass,
      };
    }
    return {
      contractVersion: ORG_ACTION_POLICY_RESOLVER_CONTRACT_VERSION,
      decision: "approval_required",
      reasonCode: "auto_scope_blocked_by_channel_or_risk",
      actionFamily,
      riskLevel,
      channel,
      targetSystemClass,
    };
  }

  return {
    contractVersion: ORG_ACTION_POLICY_RESOLVER_CONTRACT_VERSION,
    decision: riskLevel === "low" ? "approval_required" : "owner_only",
    reasonCode: riskLevel === "low" ? "default_low_risk_requires_approval" : "default_high_risk_owner_only",
    actionFamily,
    riskLevel,
    channel,
    targetSystemClass,
  };
}

export function buildOrgActionPolicySnapshot(args: {
  decisionResult: OrgActionPolicyDecisionResult;
  resolvedAt: number;
  resolverRef?: string;
}): OrgActionPolicySnapshotV1 {
  return {
    contractVersion: ORG_ACTION_POLICY_SNAPSHOT_CONTRACT_VERSION,
    decision: args.decisionResult.decision,
    actionFamily: args.decisionResult.actionFamily,
    riskLevel: args.decisionResult.riskLevel,
    channel: args.decisionResult.channel,
    targetSystemClass: args.decisionResult.targetSystemClass,
    decisionReason: args.decisionResult.reasonCode,
    resolvedAt: args.resolvedAt,
    resolverRef: normalizeNonEmptyString(args.resolverRef) || undefined,
  };
}

function resolveComplianceApprovalCheckpoint(args: {
  policyDecision: OrgActionPolicyDecision;
  requiresExplicitOutboundConfirmation: boolean;
  requiresOwnerGoDecision: boolean;
}): ComplianceActionApprovalCheckpoint {
  if (args.requiresOwnerGoDecision) {
    return "org_owner_gate_decision";
  }
  if (args.requiresExplicitOutboundConfirmation) {
    return "org_owner_outbound_confirmation";
  }
  if (
    args.policyDecision === "owner_only"
    || args.policyDecision === "approval_required"
  ) {
    return "org_owner_review";
  }
  return "none";
}

export function resolveComplianceActionRuntimeGate(args: {
  actionFamily?: string | null;
  riskLevel?: OrgActionPolicyRiskLevel | null;
  channel?: string | null;
  targetSystemClass?: OrgActionTargetSystemClass | null;
  orgScope?: OrgActionPolicyScopeConfig | null;
  agentScope?: OrgActionPolicyScopeConfig | null;
  requiresExplicitOutboundConfirmation?: boolean;
  requiresOwnerGoDecision?: boolean;
  humanApprovalGranted?: boolean;
}): ComplianceActionRuntimeGateResult {
  const policy = resolveOrgActionPolicyDecision({
    actionFamily: args.actionFamily,
    riskLevel: args.riskLevel,
    channel: args.channel,
    targetSystemClass: args.targetSystemClass,
    orgScope: args.orgScope,
    agentScope: args.agentScope,
  });
  const approvalCheckpoint = resolveComplianceApprovalCheckpoint({
    policyDecision: policy.decision,
    requiresExplicitOutboundConfirmation:
      args.requiresExplicitOutboundConfirmation === true,
    requiresOwnerGoDecision: args.requiresOwnerGoDecision === true,
  });
  const approvalRequired = approvalCheckpoint !== "none";
  const approvalSatisfied =
    !approvalRequired || args.humanApprovalGranted === true;

  const gateStatus = approvalSatisfied ? "passed" : "blocked";
  const gateReasonCode = approvalSatisfied
    ? policy.decision === "agent_auto_allowed"
      ? "policy_auto_allowed"
      : `approval_checkpoint_satisfied:${approvalCheckpoint}`
    : `approval_checkpoint_pending:${approvalCheckpoint}`;

  return {
    contractVersion: COMPLIANCE_ACTION_RUNTIME_CONTRACT_VERSION,
    stageOrder: COMPLIANCE_ACTION_LIFECYCLE_STAGE_VALUES,
    actionFamily: policy.actionFamily,
    riskLevel: policy.riskLevel,
    channel: policy.channel,
    targetSystemClass: policy.targetSystemClass,
    policyDecision: policy.decision,
    policyReasonCode: policy.reasonCode,
    approval: {
      required: approvalRequired,
      checkpoint: approvalCheckpoint,
      satisfied: approvalSatisfied,
    },
    gate: {
      status: gateStatus,
      reasonCode: gateReasonCode,
      failClosed: gateStatus === "blocked",
    },
  };
}

export function buildComplianceActionLifecycleAuditSnapshot(args: {
  gateResult: ComplianceActionRuntimeGateResult;
  plannedAt: number;
  executeAt?: number | null;
  executionSkippedReason?: string | null;
  verifyAt?: number | null;
  verifyPassed?: boolean | null;
  verifyReasonCode?: string | null;
  auditAt?: number | null;
  auditRef?: string | null;
}): ComplianceActionLifecycleAuditSnapshot {
  const plannedAt = normalizeFiniteTimestamp(args.plannedAt);
  if (plannedAt === null) {
    throw new Error("plannedAt must be a finite timestamp.");
  }
  const executeAt = normalizeFiniteTimestamp(args.executeAt ?? null);
  const verifyAt = normalizeFiniteTimestamp(args.verifyAt ?? null);
  const auditAt = normalizeFiniteTimestamp(args.auditAt ?? null);
  const auditRef = normalizeNonEmptyString(args.auditRef ?? null);
  const executionSkippedReason =
    normalizeNonEmptyString(args.executionSkippedReason ?? null) ?? null;
  const verifyReasonCode =
    normalizeNonEmptyString(args.verifyReasonCode ?? null) ?? null;

  const executeStageStatus = args.gateResult.gate.status === "blocked"
    ? "skipped"
    : executeAt !== null
      ? "completed"
      : "skipped";
  const executeStageReasonCode = executeStageStatus === "completed"
    ? null
    : args.gateResult.gate.status === "blocked"
      ? "gate_blocked"
      : executionSkippedReason ?? "execute_not_recorded";

  let verifyStageStatus: "passed" | "failed" | "skipped" = "skipped";
  let verifyStageReasonCode: string | null = "verify_not_recorded";
  if (args.gateResult.gate.status === "blocked") {
    verifyStageStatus = "skipped";
    verifyStageReasonCode = "gate_blocked";
  } else if (executeStageStatus !== "completed") {
    verifyStageStatus = "skipped";
    verifyStageReasonCode = "execute_not_completed";
  } else if (args.verifyPassed === false) {
    verifyStageStatus = "failed";
    verifyStageReasonCode = verifyReasonCode ?? "verify_failed";
  } else if (verifyAt !== null) {
    verifyStageStatus = "passed";
    verifyStageReasonCode = null;
  } else {
    verifyStageStatus = "skipped";
    verifyStageReasonCode = "verify_not_recorded";
  }

  const auditStageStatus = auditAt !== null && auditRef
    ? "recorded"
    : "missing";
  const failClosed =
    args.gateResult.gate.status !== "passed"
    || verifyStageStatus !== "passed"
    || auditStageStatus !== "recorded";

  return {
    contractVersion: COMPLIANCE_ACTION_RUNTIME_CONTRACT_VERSION,
    stageOrder: args.gateResult.stageOrder,
    actionFamily: args.gateResult.actionFamily,
    policyDecision: args.gateResult.policyDecision,
    policyReasonCode: args.gateResult.policyReasonCode,
    approvalCheckpoint: args.gateResult.approval.checkpoint,
    stages: {
      plan: {
        status: "completed",
        at: plannedAt,
      },
      gate: {
        status: args.gateResult.gate.status,
        at: plannedAt,
        reasonCode: args.gateResult.gate.reasonCode,
        failClosed: args.gateResult.gate.failClosed,
      },
      execute: {
        status: executeStageStatus,
        at: executeAt,
        reasonCode: executeStageReasonCode,
      },
      verify: {
        status: verifyStageStatus,
        at: verifyAt,
        reasonCode: verifyStageReasonCode,
      },
      audit: {
        status: auditStageStatus,
        at: auditAt,
        auditRef,
      },
    },
    failClosed,
  };
}

export const resolveAndRecordOrgActionPolicySnapshot = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    actionItemObjectId: v.id("objects"),
    sourceActivityObjectId: v.optional(v.id("objects")),
    sessionId: v.optional(v.id("agentSessions")),
    actionFamily: v.string(),
    riskLevel: orgActionPolicyRiskLevelValidator,
    channel: v.string(),
    targetSystemClass: orgActionTargetSystemClassValidator,
    orgScope: v.optional(v.any()),
    agentScope: v.optional(v.any()),
    resolverRef: v.optional(v.string()),
    createdBy: v.optional(v.union(v.id("users"), v.id("objects"))),
  },
  handler: async (ctx, args) => {
    const resolvedAt = Date.now();
    const decisionResult = resolveOrgActionPolicyDecision({
      actionFamily: args.actionFamily,
      riskLevel: args.riskLevel,
      channel: args.channel,
      targetSystemClass: args.targetSystemClass,
      orgScope: normalizeScopeConfig(args.orgScope),
      agentScope: normalizeScopeConfig(args.agentScope),
    });
    const snapshot = buildOrgActionPolicySnapshot({
      decisionResult,
      resolvedAt,
      resolverRef: args.resolverRef,
    });

    const policySnapshotId = await ctx.db.insert("orgActionPolicySnapshots", {
      organizationId: args.organizationId,
      actionItemObjectId: args.actionItemObjectId,
      sourceActivityObjectId: args.sourceActivityObjectId,
      sessionId: args.sessionId,
      snapshot,
      decision: snapshot.decision,
      actionFamily: snapshot.actionFamily,
      riskLevel: snapshot.riskLevel,
      channel: snapshot.channel,
      targetSystemClass: snapshot.targetSystemClass,
      resolvedAt,
      createdBy: args.createdBy,
      createdAt: resolvedAt,
    });

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.actionItemObjectId,
      actionType: "org_action_policy_snapshot_recorded",
      actionData: {
        policySnapshotId: String(policySnapshotId),
        sourceActivityObjectId: args.sourceActivityObjectId
          ? String(args.sourceActivityObjectId)
          : undefined,
        sessionId: args.sessionId ? String(args.sessionId) : undefined,
        decision: snapshot.decision,
        reasonCode: decisionResult.reasonCode,
      },
      performedBy: args.createdBy,
      performedAt: resolvedAt,
    });

    return {
      policySnapshotId,
      decision: snapshot.decision,
      reasonCode: decisionResult.reasonCode,
      snapshot,
    };
  },
});

export const orgActionPolicyDecisionLiteralValidator = orgActionPolicyDecisionValidator;
