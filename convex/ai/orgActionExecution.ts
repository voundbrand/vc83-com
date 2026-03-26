import type {
  OrgActionPolicyDecision,
  OrgActionTargetSystemClass,
} from "../schemas/orgAgentActionRuntimeSchemas";

export const ORG_ACTION_EXECUTION_CONTRACT_VERSION =
  "org_action_execution_v1" as const;

export type OrgActionAutoExecutionDecision =
  | "allow"
  | "deny_policy"
  | "deny_target_system"
  | "deny_risk"
  | "deny_missing_allowlist";

function normalizePositiveOrdinal(value: number): number {
  return Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 1;
}

function normalizeConnectorKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : "unknown_connector";
}

export function resolveOrgActionAutoExecutionDecision(args: {
  policyDecision: OrgActionPolicyDecision;
  targetSystemClass: OrgActionTargetSystemClass;
  riskLevel: "low" | "medium" | "high" | "critical";
  actionFamily: string;
  autoExecutionAllowlist: string[];
}): OrgActionAutoExecutionDecision {
  if (args.policyDecision !== "agent_auto_allowed") {
    return "deny_policy";
  }
  if (args.targetSystemClass !== "platform_internal") {
    return "deny_target_system";
  }
  if (args.riskLevel !== "low") {
    return "deny_risk";
  }
  if (!args.autoExecutionAllowlist.includes(args.actionFamily)) {
    return "deny_missing_allowlist";
  }
  return "allow";
}

export function buildOrgActionExecutionReceiptIdempotencyKey(args: {
  organizationId: string;
  actionItemObjectId: string;
  actionFamily: string;
  attemptNumber: number;
}): string {
  const attempt = normalizePositiveOrdinal(args.attemptNumber);
  return [
    "org_action_receipt",
    args.organizationId,
    args.actionItemObjectId,
    args.actionFamily,
    String(attempt),
  ].join(":");
}

export function buildOrgActionReceiptCorrelationId(args: {
  sessionId: string;
  actionItemObjectId: string;
  attemptNumber: number;
}): string {
  const attempt = normalizePositiveOrdinal(args.attemptNumber);
  return [
    "org_action_correlation",
    args.sessionId,
    args.actionItemObjectId,
    String(attempt),
  ].join(":");
}

export function buildOrgActionExternalDispatchIdempotencyKey(args: {
  organizationId: string;
  actionItemObjectId: string;
  connectorKey: string;
  attemptNumber: number;
}): string {
  const attempt = normalizePositiveOrdinal(args.attemptNumber);
  const connectorKey = normalizeConnectorKey(args.connectorKey);
  return [
    "org_action_external_dispatch",
    args.organizationId,
    args.actionItemObjectId,
    connectorKey,
    String(attempt),
  ].join(":");
}

export function buildOrgActionExternalDispatchCorrelationId(args: {
  sessionId: string;
  actionItemObjectId: string;
  connectorKey: string;
  attemptNumber: number;
}): string {
  const attempt = normalizePositiveOrdinal(args.attemptNumber);
  const connectorKey = normalizeConnectorKey(args.connectorKey);
  return [
    "org_action_external_dispatch_correlation",
    args.sessionId,
    args.actionItemObjectId,
    connectorKey,
    String(attempt),
  ].join(":");
}

export function buildOrgActionApprovalIdempotencyKey(args: {
  organizationId: string;
  actionItemObjectId: string;
  transition: string;
  transitionNumber: number;
}): string {
  const transitionNumber = normalizePositiveOrdinal(args.transitionNumber);
  return [
    "org_action_approval",
    args.organizationId,
    args.actionItemObjectId,
    args.transition,
    String(transitionNumber),
  ].join(":");
}

export function buildOrgActionApprovalCorrelationId(args: {
  sessionId: string;
  actionItemObjectId: string;
  transition: string;
  transitionNumber: number;
}): string {
  const transitionNumber = normalizePositiveOrdinal(args.transitionNumber);
  return [
    "org_action_approval_correlation",
    args.sessionId,
    args.actionItemObjectId,
    args.transition,
    String(transitionNumber),
  ].join(":");
}
