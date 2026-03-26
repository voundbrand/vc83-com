export const ORG_EXTERNAL_ACTION_DISPATCH_CONTRACT_VERSION =
  "org_external_action_dispatch_v1" as const;
export const ORG_EXTERNAL_ACTION_DISPATCH_COMPENSATION_CONTRACT_VERSION =
  "org_external_action_compensation_v1" as const;

export type OrgExternalActionDispatchGate =
  | "blocked_missing_org_gate"
  | "blocked_policy"
  | "blocked_target_system"
  | "blocked_unapproved_work_item"
  | "blocked_missing_connector_key"
  | "blocked_connector_not_allowlisted"
  | "allowed";

export type OrgExternalActionDispatchStatus =
  | "succeeded"
  | "failed"
  | "skipped";

export type OrgExternalActionCompensationMode =
  | "log_only"
  | "reverse_canonical_mutation";

export type OrgExternalActionRollbackDecision =
  | "commit"
  | "rollback_fail_closed"
  | "compensate";

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeConnectorAllowlist(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .map((entry) => normalizeOptionalString(entry))
        .filter((entry): entry is string => Boolean(entry))
        .map((entry) => entry.toLowerCase()),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

export function resolveOrgExternalActionDispatchGate(args: {
  orgExternalExecutionEnabled: boolean;
  policyDecision?: string | null;
  targetSystemClass?: string | null;
  approvalState?: string | null;
  connectorKey?: string | null;
  connectorAllowlist?: string[] | null;
}): OrgExternalActionDispatchGate {
  if (args.orgExternalExecutionEnabled !== true) {
    return "blocked_missing_org_gate";
  }
  if (args.targetSystemClass !== "external_connector") {
    return "blocked_target_system";
  }
  if (
    args.policyDecision !== "agent_auto_allowed"
    && args.policyDecision !== "approval_required"
  ) {
    return "blocked_policy";
  }
  if (
    args.policyDecision === "approval_required"
    && args.approvalState !== "approved"
  ) {
    return "blocked_unapproved_work_item";
  }
  const connectorKey = normalizeOptionalString(args.connectorKey)?.toLowerCase();
  if (!connectorKey) {
    return "blocked_missing_connector_key";
  }
  const connectorAllowlist = normalizeConnectorAllowlist(args.connectorAllowlist);
  if (
    connectorAllowlist.length === 0
    || !connectorAllowlist.includes(connectorKey)
  ) {
    return "blocked_connector_not_allowlisted";
  }
  return "allowed";
}

export function buildOrgExternalActionDispatchIdentity(args: {
  organizationId: string;
  sessionId: string;
  actionItemObjectId: string;
  connectorKey: string;
  attemptNumber: number;
}): {
  connectorKey: string;
  attemptNumber: number;
  correlationId: string;
  idempotencyKey: string;
} {
  const connectorKey =
    normalizeOptionalString(args.connectorKey)?.toLowerCase()
    || "unknown_connector";
  const attemptNumber =
    Number.isFinite(args.attemptNumber) && args.attemptNumber > 0
      ? Math.floor(args.attemptNumber)
      : 1;
  return {
    connectorKey,
    attemptNumber,
    correlationId: [
      "org_action_external_dispatch_correlation",
      args.sessionId,
      args.actionItemObjectId,
      connectorKey,
      String(attemptNumber),
    ].join(":"),
    idempotencyKey: [
      "org_action_external_dispatch",
      args.organizationId,
      args.actionItemObjectId,
      connectorKey,
      String(attemptNumber),
    ].join(":"),
  };
}

export function resolveOrgExternalActionCompensationPlan(args: {
  dispatchStatus: OrgExternalActionDispatchStatus;
  canonicalMutationApplied: boolean;
  compensationMode?: OrgExternalActionCompensationMode | null;
}): {
  required: boolean;
  mode: OrgExternalActionCompensationMode | null;
  reasonCode: string;
} {
  if (args.dispatchStatus === "succeeded") {
    return {
      required: false,
      mode: null,
      reasonCode: "dispatch_succeeded",
    };
  }
  if (args.canonicalMutationApplied !== true) {
    return {
      required: false,
      mode: null,
      reasonCode: "no_canonical_mutation_to_compensate",
    };
  }
  const mode = args.compensationMode === "reverse_canonical_mutation"
    ? "reverse_canonical_mutation"
    : "log_only";
  return {
    required: true,
    mode,
    reasonCode:
      mode === "reverse_canonical_mutation"
        ? "reverse_canonical_mutation_required"
        : "log_only_compensation_required",
  };
}

export function resolveOrgExternalActionRollbackDecision(args: {
  dispatchGate: OrgExternalActionDispatchGate;
  dispatchStatus: OrgExternalActionDispatchStatus;
  canonicalMutationApplied: boolean;
  compensationMode?: OrgExternalActionCompensationMode | null;
}): {
  contractVersion: typeof ORG_EXTERNAL_ACTION_DISPATCH_COMPENSATION_CONTRACT_VERSION;
  decision: OrgExternalActionRollbackDecision;
  reasonCode: string;
  compensation: {
    required: boolean;
    mode: OrgExternalActionCompensationMode | null;
    reasonCode: string;
  };
} {
  if (args.dispatchGate !== "allowed") {
    return {
      contractVersion: ORG_EXTERNAL_ACTION_DISPATCH_COMPENSATION_CONTRACT_VERSION,
      decision: "rollback_fail_closed",
      reasonCode: `dispatch_gate_blocked:${args.dispatchGate}`,
      compensation: {
        required: false,
        mode: null,
        reasonCode: "dispatch_gate_blocked",
      },
    };
  }

  const compensation = resolveOrgExternalActionCompensationPlan({
    dispatchStatus: args.dispatchStatus,
    canonicalMutationApplied: args.canonicalMutationApplied,
    compensationMode: args.compensationMode,
  });
  if (args.dispatchStatus === "succeeded") {
    return {
      contractVersion: ORG_EXTERNAL_ACTION_DISPATCH_COMPENSATION_CONTRACT_VERSION,
      decision: "commit",
      reasonCode: "dispatch_succeeded",
      compensation,
    };
  }
  if (compensation.required) {
    return {
      contractVersion: ORG_EXTERNAL_ACTION_DISPATCH_COMPENSATION_CONTRACT_VERSION,
      decision: "compensate",
      reasonCode: "dispatch_failed_compensation_required",
      compensation,
    };
  }
  return {
    contractVersion: ORG_EXTERNAL_ACTION_DISPATCH_COMPENSATION_CONTRACT_VERSION,
    decision: "rollback_fail_closed",
    reasonCode: "dispatch_failed_without_compensation_path",
    compensation,
  };
}
