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
  "audit_workflow_deliverable_pdf" as const;

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
