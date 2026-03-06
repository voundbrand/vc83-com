export const SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE =
  "one_of_one_lead_capture_consultant_template" as const;

export const SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE =
  "one_of_one_warm_lead_capture_consultant_template" as const;

export const ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION =
  "aoh_action_completion_template_contract_v1" as const;

export const ACTION_COMPLETION_CLAIM_CONTRACT_VERSION =
  "aoh_action_completion_claim_v1" as const;

export const AUDIT_DELIVERABLE_TOOL_NAME =
  "generate_audit_workflow_deliverable" as const;

export const AUDIT_DELIVERABLE_EMAIL_REQUEST_TOOL_NAME =
  "request_audit_deliverable_email" as const;

export const AUDIT_DELIVERABLE_OUTCOME_KEY =
  "audit_workflow_deliverable_email" as const;

export const SAMANTHA_AUDIT_REQUIRED_FIELDS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "founder_contact_preference",
] as const;

export const SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_MISSING =
  "missing_audit_session_context" as const;
export const SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_NOT_FOUND =
  "audit_session_not_found" as const;

export type SamanthaAuditRoutingAuditChannel = "webchat" | "native_guest";

export interface SamanthaAuditSourceContext {
  ingressChannel: string;
  originSurface?: string;
  sourceSessionToken?: string;
  sourceAuditChannel?: SamanthaAuditRoutingAuditChannel;
}

export type SamanthaAuditRequiredField =
  (typeof SAMANTHA_AUDIT_REQUIRED_FIELDS)[number];

export type SamanthaPreflightReasonCode =
  | "tool_unavailable"
  | "missing_required_fields"
  | "tool_not_observed"
  | "missing_audit_session_context"
  | "audit_session_not_found";

export type SamanthaAutoDispatchInvocationStatus =
  | "not_attempted"
  | "attempted_without_result"
  | "queued_pending_approval"
  | "executed_success"
  | "executed_error"
  | "executed_blocked"
  | "executed_disabled";

export type SamanthaAutoDispatchSkipReasonCode =
  | "not_samantha_runtime"
  | "request_not_detected"
  | "tool_unavailable_in_scope"
  | "tool_already_attempted"
  | "ambiguous_name"
  | "ambiguous_founder_contact"
  | "missing_required_fields";

export interface SamanthaAuditAutoDispatchToolArgs {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  founderContactRequested: boolean;
  sales_call?: boolean;
  clientName?: string;
  workflowRecommendation?: string;
  ingressChannel?: string;
  originSurface?: string;
  sourceSessionToken?: string;
  sourceAuditChannel?: SamanthaAuditRoutingAuditChannel;
}

export interface SamanthaAuditAutoDispatchPlan {
  eligible: boolean;
  requestDetected: boolean;
  toolAvailable: boolean;
  alreadyAttempted: boolean;
  preexistingInvocationStatus: SamanthaAutoDispatchInvocationStatus;
  retryEligibleAfterFailure: boolean;
  ambiguousName: boolean;
  ambiguousFounderContact: boolean;
  missingRequiredFields: SamanthaAuditRequiredField[];
  skipReasonCodes: SamanthaAutoDispatchSkipReasonCode[];
  shouldDispatch: boolean;
  toolArgs?: SamanthaAuditAutoDispatchToolArgs;
}

export type SamanthaAuditDispatchDecision =
  | "auto_dispatch_executed_email"
  | "recovery_attempted_missing_required_fields"
  | "blocked_ambiguous_name"
  | "blocked_ambiguous_founder_contact"
  | "blocked_missing_required_fields"
  | "blocked_missing_audit_session_context"
  | "blocked_audit_session_not_found"
  | "blocked_tool_unavailable"
  | "blocked_tool_not_observed";

export interface SamanthaClaimRecoveryDecision {
  shouldAttempt: boolean;
  reasonCode:
    | "plan_missing"
    | "already_attempted"
    | "not_samantha_runtime"
    | "tool_unavailable_in_scope"
    | "tool_already_attempted"
    | "lead_data_incomplete"
    | "enforcement_reason_not_tool_not_observed"
    | "enforcement_not_audit_deliverable"
    | "retry_eligible_after_failure"
    | "eligible_for_recovery";
}

export interface SamanthaDispatchToolResult {
  tool?: unknown;
  status?: unknown;
}

export interface SamanthaRuntimeDispatchDecisionArgs {
  plan: SamanthaAuditAutoDispatchPlan | null;
  executionSucceeded: boolean;
  sessionContextFailure:
    | typeof SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_MISSING
    | typeof SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_NOT_FOUND
    | null;
  enforcementReasonCode?: string;
}

export interface SamanthaRuntimeClaimRecoveryDecisionArgs {
  plan: SamanthaAuditAutoDispatchPlan | null;
  alreadyAttempted: boolean;
  enforcementReasonCode?: string;
  enforcementTargetsAuditDeliverable: boolean;
}

export interface SamanthaRuntimeDispatchTerminalReasonArgs {
  runtimeCapabilityGapBlocked: boolean;
  plan: SamanthaAuditAutoDispatchPlan | null;
  dispatchDecision?: SamanthaAuditDispatchDecision;
  invocationStatus: SamanthaAutoDispatchInvocationStatus;
  preflightLookupTargetOk: boolean;
  preflightAuditSessionFound?: boolean;
}

export interface SamanthaRuntimeModuleAdapter {
  resolveAutoDispatchInvocationStatus(args: {
    attempted: boolean;
    toolResults: SamanthaDispatchToolResult[];
  }): SamanthaAutoDispatchInvocationStatus;
  resolveDispatchDecision(
    args: SamanthaRuntimeDispatchDecisionArgs
  ): SamanthaAuditDispatchDecision | undefined;
  resolveClaimRecoveryDecision(
    args: SamanthaRuntimeClaimRecoveryDecisionArgs
  ): SamanthaClaimRecoveryDecision;
  shouldAttemptClaimRecoveryAutoDispatch(
    args: SamanthaRuntimeClaimRecoveryDecisionArgs
  ): boolean;
  resolveDispatchTerminalReasonCode(
    args: SamanthaRuntimeDispatchTerminalReasonArgs
  ): string;
}

function normalizeSamanthaDispatchString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveAutoDispatchInvocationStatus(args: {
  attempted: boolean;
  toolResults: SamanthaDispatchToolResult[];
}): SamanthaAutoDispatchInvocationStatus {
  const dispatchResults = args.toolResults.filter(
    (result) => normalizeSamanthaDispatchString(result.tool) === AUDIT_DELIVERABLE_TOOL_NAME
  );
  if (!args.attempted) {
    return "not_attempted";
  }
  if (dispatchResults.length === 0) {
    return "attempted_without_result";
  }
  if (dispatchResults.some((result) => result.status === "success")) {
    return "executed_success";
  }
  if (dispatchResults.some((result) => result.status === "pending_approval")) {
    return "queued_pending_approval";
  }
  if (dispatchResults.some((result) => result.status === "blocked")) {
    return "executed_blocked";
  }
  if (dispatchResults.some((result) => result.status === "disabled")) {
    return "executed_disabled";
  }
  return "executed_error";
}

function resolveDispatchDecision(
  args: SamanthaRuntimeDispatchDecisionArgs
): SamanthaAuditDispatchDecision | undefined {
  if (!args.plan || !args.plan.eligible) {
    return undefined;
  }
  if (args.executionSucceeded) {
    return "auto_dispatch_executed_email";
  }
  if (!args.plan.requestDetected) {
    return undefined;
  }
  if (args.sessionContextFailure === SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_MISSING) {
    return "blocked_missing_audit_session_context";
  }
  if (args.sessionContextFailure === SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_NOT_FOUND) {
    return "blocked_audit_session_not_found";
  }
  if (!args.plan.toolAvailable) {
    return "blocked_tool_unavailable";
  }
  if (args.plan.ambiguousName) {
    return "blocked_ambiguous_name";
  }
  if (args.plan.ambiguousFounderContact) {
    return "blocked_ambiguous_founder_contact";
  }
  if (args.plan.missingRequiredFields.length > 0) {
    return "recovery_attempted_missing_required_fields";
  }
  if (args.enforcementReasonCode === "claim_tool_not_observed") {
    return "blocked_tool_not_observed";
  }
  return undefined;
}

function resolveClaimRecoveryDecision(
  args: SamanthaRuntimeClaimRecoveryDecisionArgs
): SamanthaClaimRecoveryDecision {
  if (!args.plan) {
    return { shouldAttempt: false, reasonCode: "plan_missing" };
  }
  if (args.alreadyAttempted) {
    return { shouldAttempt: false, reasonCode: "already_attempted" };
  }
  if (!args.plan.eligible) {
    return { shouldAttempt: false, reasonCode: "not_samantha_runtime" };
  }
  if (!args.plan.toolAvailable) {
    return { shouldAttempt: false, reasonCode: "tool_unavailable_in_scope" };
  }
  const retryEligibleAfterFailure = args.plan.retryEligibleAfterFailure === true;
  if (args.plan.alreadyAttempted && !retryEligibleAfterFailure) {
    return { shouldAttempt: false, reasonCode: "tool_already_attempted" };
  }
  if (
    args.plan.ambiguousName
    || args.plan.ambiguousFounderContact
    || args.plan.missingRequiredFields.length > 0
    || !args.plan.toolArgs
  ) {
    return { shouldAttempt: false, reasonCode: "lead_data_incomplete" };
  }
  if (args.enforcementReasonCode !== "claim_tool_not_observed") {
    return {
      shouldAttempt: false,
      reasonCode: "enforcement_reason_not_tool_not_observed",
    };
  }
  if (!args.enforcementTargetsAuditDeliverable) {
    return {
      shouldAttempt: false,
      reasonCode: "enforcement_not_audit_deliverable",
    };
  }
  if (retryEligibleAfterFailure) {
    return { shouldAttempt: true, reasonCode: "retry_eligible_after_failure" };
  }
  return { shouldAttempt: true, reasonCode: "eligible_for_recovery" };
}

function resolveDispatchTerminalReasonCode(
  args: SamanthaRuntimeDispatchTerminalReasonArgs
): string {
  if (args.dispatchDecision) {
    return args.dispatchDecision;
  }
  if (args.runtimeCapabilityGapBlocked) {
    return "runtime_capability_gap_blocked";
  }
  if (!args.plan) {
    return "auto_dispatch_plan_not_resolved";
  }
  if (!args.plan.eligible) {
    return "not_samantha_runtime";
  }
  if (!args.preflightLookupTargetOk) {
    return "missing_audit_session_context";
  }
  if (args.preflightAuditSessionFound === false && args.plan.requestDetected) {
    return "audit_session_not_found";
  }
  if (args.plan.skipReasonCodes.length > 0) {
    return args.plan.skipReasonCodes[0];
  }
  if (args.invocationStatus !== "not_attempted") {
    return args.invocationStatus;
  }
  if (!args.plan.requestDetected) {
    return "request_not_detected";
  }
  return "no_dispatch_reason_resolved";
}

export const SAMANTHA_RUNTIME_MODULE_ADAPTER: SamanthaRuntimeModuleAdapter = {
  resolveAutoDispatchInvocationStatus,
  resolveDispatchDecision,
  resolveClaimRecoveryDecision,
  shouldAttemptClaimRecoveryAutoDispatch: (args) =>
    resolveClaimRecoveryDecision(args).shouldAttempt,
  resolveDispatchTerminalReasonCode,
};
