import type { Id } from "../_generated/dataModel";

export const SUPER_ADMIN_AGENT_QA_MODE_VERSION = "super_admin_agent_qa_v1" as const;
export const SUPER_ADMIN_AGENT_QA_TURN_EVENT = "super_admin_agent_qa_turn" as const;

export interface SuperAdminAgentQaModeRequest {
  enabled: boolean;
  sessionId?: string;
  targetAgentId?: string;
  targetTemplateRole?: string;
  label?: string;
  runId?: string;
}

export interface SuperAdminAgentQaModeAuditContext {
  modeVersion: typeof SUPER_ADMIN_AGENT_QA_MODE_VERSION;
  enabled: boolean;
  actorUserId?: Id<"users">;
  actorEmail?: string;
  targetAgentId?: string;
  targetTemplateRole?: string;
  label?: string;
  runId?: string;
}

export interface ActionCompletionQaDiagnostics {
  reasonCode?: string;
  preflightReasonCode?: string;
  requiredTools: string[];
  availableTools: string[];
  observedTools: string[];
  missingRequiredFields: string[];
  enforcementMode?: "off" | "observe" | "enforce";
  rewriteApplied?: boolean;
  templateRole?: string;
  dispatchDecision?:
    | "auto_dispatch_executed_email"
    | "recovery_attempted_missing_required_fields"
    | "blocked_ambiguous_name"
    | "blocked_ambiguous_founder_contact"
    | "blocked_missing_required_fields"
    | "blocked_missing_audit_session_context"
    | "blocked_audit_session_not_found"
    | "blocked_tool_unavailable"
    | "blocked_tool_not_observed";
  blockedReason?:
    | "tool_unavailable"
    | "missing_required_fields"
    | "missing_audit_session_context"
    | "audit_session_not_found"
    | "tool_not_observed"
    | "ambiguous_name"
    | "ambiguous_founder_contact";
  blockedDetail?: string;
}

export interface SuperAdminAgentQaTurnTelemetryEnvelope {
  event: typeof SUPER_ADMIN_AGENT_QA_TURN_EVENT;
  modeVersion: typeof SUPER_ADMIN_AGENT_QA_MODE_VERSION;
  qaRunId?: string;
  sessionId: string;
  turnId: string;
  agentId: string;
  preflightReasonCode?: string;
  reasonCode?: string;
  requiredTools: string[];
  availableTools: string[];
  preflightMissingRequiredFields: string[];
  actionCompletionEnforcementMode?: "off" | "observe" | "enforce";
  dispatchDecision?: ActionCompletionQaDiagnostics["dispatchDecision"];
  blockedReason?: ActionCompletionQaDiagnostics["blockedReason"];
  blockedDetail?: string;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .map((entry) => normalizeString(entry))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

export function resolveSuperAdminAgentQaModeRequest(args: {
  payloadQa: unknown;
  queryQa: unknown;
}): SuperAdminAgentQaModeRequest {
  const qaRecord =
    args.payloadQa && typeof args.payloadQa === "object" && !Array.isArray(args.payloadQa)
      ? (args.payloadQa as Record<string, unknown>)
      : null;
  const queryEnabled =
    args.queryQa === "1"
    || args.queryQa === "true"
    || args.queryQa === "qa"
    || args.queryQa === "on";

  const payloadEnabled = qaRecord?.enabled === true || qaRecord?.mode === "super_admin_agent_qa";
  const enabled = payloadEnabled || queryEnabled;

  return {
    enabled,
    sessionId: normalizeString(qaRecord?.sessionId),
    targetAgentId: normalizeString(qaRecord?.targetAgentId),
    targetTemplateRole: normalizeString(qaRecord?.targetTemplateRole),
    label: normalizeString(qaRecord?.label),
    runId: normalizeString(qaRecord?.runId),
  };
}

export function buildActionCompletionQaDiagnostics(value: unknown): ActionCompletionQaDiagnostics {
  const telemetry =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const payload =
    telemetry.payload && typeof telemetry.payload === "object" && !Array.isArray(telemetry.payload)
      ? (telemetry.payload as Record<string, unknown>)
      : {};

  const reasonCode = normalizeString(payload.reasonCode);
  const preflightReasonCode = normalizeString(payload.preflightReasonCode);
  const requiredTools = normalizeStringArray(payload.requiredTools);
  const availableTools = normalizeStringArray(payload.availableTools);
  const observedTools = normalizeStringArray(payload.observedTools);
  const missingRequiredFields = normalizeStringArray(payload.preflightMissingRequiredFields);
  const enforcementMode =
    telemetry.enforcementMode === "off"
    || telemetry.enforcementMode === "observe"
    || telemetry.enforcementMode === "enforce"
      ? telemetry.enforcementMode
      : undefined;
  const rewriteApplied = telemetry.rewriteApplied === true;
  const templateRole = normalizeString(telemetry.templateRole);
  const autoDispatchRecord =
    telemetry.samanthaAutoDispatch
    && typeof telemetry.samanthaAutoDispatch === "object"
    && !Array.isArray(telemetry.samanthaAutoDispatch)
      ? (telemetry.samanthaAutoDispatch as Record<string, unknown>)
      : null;
  const autoDispatchDecisionRaw = normalizeString(autoDispatchRecord?.dispatchDecision);
  let dispatchDecision: ActionCompletionQaDiagnostics["dispatchDecision"];
  if (autoDispatchDecisionRaw === "blocked_missing_required_fields") {
    dispatchDecision = "blocked_missing_required_fields";
  } else if (autoDispatchDecisionRaw === "recovery_attempted_missing_required_fields") {
    dispatchDecision = "recovery_attempted_missing_required_fields";
  } else if (autoDispatchDecisionRaw === "blocked_missing_audit_session_context") {
    dispatchDecision = "blocked_missing_audit_session_context";
  } else if (autoDispatchDecisionRaw === "blocked_audit_session_not_found") {
    dispatchDecision = "blocked_audit_session_not_found";
  } else if (autoDispatchDecisionRaw === "blocked_tool_unavailable") {
    dispatchDecision = "blocked_tool_unavailable";
  } else if (autoDispatchDecisionRaw === "blocked_tool_not_observed") {
    dispatchDecision = "blocked_tool_not_observed";
  } else if (autoDispatchDecisionRaw === "blocked_ambiguous_name") {
    dispatchDecision = "blocked_ambiguous_name";
  } else if (autoDispatchDecisionRaw === "blocked_ambiguous_founder_contact") {
    dispatchDecision = "blocked_ambiguous_founder_contact";
  } else if (autoDispatchDecisionRaw === "auto_dispatch_executed_email") {
    dispatchDecision = "auto_dispatch_executed_email";
  }

  let blockedReason: ActionCompletionQaDiagnostics["blockedReason"];
  if (preflightReasonCode === "missing_required_fields") {
    blockedReason = "missing_required_fields";
  } else if (preflightReasonCode === "missing_audit_session_context") {
    blockedReason = "missing_audit_session_context";
  } else if (preflightReasonCode === "audit_session_not_found") {
    blockedReason = "audit_session_not_found";
  } else if (preflightReasonCode === "tool_not_observed") {
    blockedReason = "tool_not_observed";
  } else if (reasonCode === "claim_tool_unavailable") {
    blockedReason = "tool_unavailable";
  }
  if (!dispatchDecision) {
    if (blockedReason === "missing_required_fields") {
      dispatchDecision = "blocked_missing_required_fields";
    } else if (blockedReason === "missing_audit_session_context") {
      dispatchDecision = "blocked_missing_audit_session_context";
    } else if (blockedReason === "audit_session_not_found") {
      dispatchDecision = "blocked_audit_session_not_found";
    } else if (blockedReason === "tool_not_observed") {
      dispatchDecision = "blocked_tool_not_observed";
    } else if (blockedReason === "tool_unavailable") {
      dispatchDecision = "blocked_tool_unavailable";
    }
  }
  if (blockedReason === "missing_audit_session_context") {
    dispatchDecision = "blocked_missing_audit_session_context";
  } else if (blockedReason === "audit_session_not_found") {
    dispatchDecision = "blocked_audit_session_not_found";
  }
  if (dispatchDecision === "blocked_ambiguous_name") {
    blockedReason = "ambiguous_name";
  } else if (dispatchDecision === "blocked_ambiguous_founder_contact") {
    blockedReason = "ambiguous_founder_contact";
  }

  let blockedDetail: string | undefined;
  if (blockedReason === "missing_required_fields") {
    blockedDetail = missingRequiredFields.length > 0
      ? `missing_required_fields: ${missingRequiredFields.join(", ")}`
      : "missing_required_fields";
  } else if (blockedReason === "tool_not_observed") {
    blockedDetail = `tool_not_observed: required=[${requiredTools.join(", ")}], observed=[${observedTools.join(", ")}]`;
  } else if (blockedReason === "missing_audit_session_context") {
    blockedDetail =
      "missing_audit_session_context: source session token/channel required for deterministic audit session routing";
  } else if (blockedReason === "audit_session_not_found") {
    blockedDetail = "audit_session_not_found: no audit session matched source channel/session token";
  } else if (blockedReason === "tool_unavailable") {
    blockedDetail = `tool_unavailable: required=[${requiredTools.join(", ")}], available=[${availableTools.join(", ")}]`;
  } else if (blockedReason === "ambiguous_name") {
    blockedDetail = "ambiguous_name: unable to safely resolve first/last name from provided name payload";
  } else if (blockedReason === "ambiguous_founder_contact") {
    blockedDetail =
      "ambiguous_founder_contact: conflicting founder-contact yes/no signals detected";
  }

  return {
    reasonCode,
    preflightReasonCode,
    requiredTools,
    availableTools,
    observedTools,
    missingRequiredFields,
    enforcementMode,
    rewriteApplied,
    templateRole,
    dispatchDecision,
    blockedReason,
    blockedDetail,
  };
}

export function resolveSuperAdminAgentQaDeniedReason(args: {
  hasSessionId: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
}): string {
  if (!args.hasSessionId) {
    return "qa_session_missing";
  }
  if (!args.isAuthenticated) {
    return "qa_session_invalid";
  }
  if (!args.isSuperAdmin) {
    return "qa_super_admin_required";
  }
  return "qa_denied";
}

export function buildSuperAdminAgentQaTurnTelemetryEnvelope(args: {
  qaRunId?: string;
  sessionId: string;
  turnId: string;
  agentId: string;
  qaDiagnostics: ActionCompletionQaDiagnostics;
}): SuperAdminAgentQaTurnTelemetryEnvelope {
  return {
    event: SUPER_ADMIN_AGENT_QA_TURN_EVENT,
    modeVersion: SUPER_ADMIN_AGENT_QA_MODE_VERSION,
    qaRunId: normalizeString(args.qaRunId),
    sessionId: args.sessionId,
    turnId: args.turnId,
    agentId: args.agentId,
    preflightReasonCode: args.qaDiagnostics.preflightReasonCode,
    reasonCode: args.qaDiagnostics.reasonCode,
    requiredTools: normalizeStringArray(args.qaDiagnostics.requiredTools),
    availableTools: normalizeStringArray(args.qaDiagnostics.availableTools),
    preflightMissingRequiredFields: normalizeStringArray(args.qaDiagnostics.missingRequiredFields),
    actionCompletionEnforcementMode: args.qaDiagnostics.enforcementMode,
    ...(args.qaDiagnostics.dispatchDecision
      ? { dispatchDecision: args.qaDiagnostics.dispatchDecision }
      : {}),
    blockedReason: args.qaDiagnostics.blockedReason,
    blockedDetail: normalizeString(args.qaDiagnostics.blockedDetail),
  };
}
