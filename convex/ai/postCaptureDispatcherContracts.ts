import type { Id } from "../_generated/dataModel";

export const SAMANTHA_POST_CAPTURE_DISPATCH_INPUT_VERSION =
  "samantha_post_capture_dispatch_input_v2" as const;
export const SAMANTHA_POST_CAPTURE_DISPATCH_RESULT_VERSION =
  "samantha_post_capture_dispatch_result_v2" as const;

export const SAMANTHA_POST_CAPTURE_DISPATCH_STEP_KEYS = [
  "lead_email_send",
  "sales_notification_send",
  "founder_call_orchestration",
  "slack_hot_lead_notify",
] as const;

export type SamanthaPostCaptureDispatchStepKey =
  (typeof SAMANTHA_POST_CAPTURE_DISPATCH_STEP_KEYS)[number];

export const SAMANTHA_POST_CAPTURE_DISPATCH_STEP_STATUS_VALUES = [
  "pending",
  "in_progress",
  "succeeded",
  "failed_retryable",
  "failed_terminal",
  "skipped_policy",
] as const;

export type SamanthaPostCaptureDispatchStepStatus =
  (typeof SAMANTHA_POST_CAPTURE_DISPATCH_STEP_STATUS_VALUES)[number];

export const SAMANTHA_POST_CAPTURE_DISPATCH_RUN_STATUS_VALUES = [
  "queued",
  "running",
  "retry_scheduled",
  "succeeded",
  "failed_terminal",
  "dead_lettered",
  "replay_requested",
] as const;

export type SamanthaPostCaptureDispatchRunStatus =
  (typeof SAMANTHA_POST_CAPTURE_DISPATCH_RUN_STATUS_VALUES)[number];

export const SAMANTHA_POST_CAPTURE_DEAD_LETTER_STATUS_VALUES = [
  "open",
  "triaging",
  "replay_queued",
  "replayed",
  "resolved",
] as const;

export type SamanthaPostCaptureDeadLetterStatus =
  (typeof SAMANTHA_POST_CAPTURE_DEAD_LETTER_STATUS_VALUES)[number];

export const SAMANTHA_POST_CAPTURE_DISPATCH_REASON_CODES = [
  "dispatch_input_invalid",
  "dispatch_org_scope_mismatch",
  "dispatch_idempotent_replay",
  "dispatch_lease_conflict",
  "dispatch_retry_scheduled",
  "dispatch_retry_exhausted",
  "dispatch_unexpected_error",
  "lead_email_send_failed",
  "sales_email_send_failed",
  "founder_call_orchestration_failed",
  "slack_routing_missing_channel",
  "slack_routing_missing_workspace_identity",
  "slack_routing_ambiguous_workspace_identity",
  "slack_routing_workspace_not_found",
  "slack_routing_connection_scope_mismatch",
  "slack_routing_send_failed",
  "slack_policy_not_hot_lead",
  "slack_policy_disabled",
] as const;

export type SamanthaPostCaptureDispatchReasonCode =
  (typeof SAMANTHA_POST_CAPTURE_DISPATCH_REASON_CODES)[number];

export interface SamanthaPostCaptureSlackRoutingInput {
  providerConnectionId?: string;
  providerAccountId?: string;
  routeKey?: string;
  channelId?: string;
  failClosed?: boolean;
}

export interface SamanthaPostCaptureDispatchInput {
  contractVersion: typeof SAMANTHA_POST_CAPTURE_DISPATCH_INPUT_VERSION;
  organizationId: Id<"organizations">;
  auditSessionKey: string;
  idempotencyKey: string;
  correlationId: string;
  source: {
    toolName: "generate_audit_workflow_deliverable";
    sessionToken?: string;
    channel: "webchat" | "native_guest";
  };
  lead: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    founderContactRequested: boolean;
    salesCallRequested: boolean;
    qualificationLevel: string;
    qualificationReasons: string[];
  };
  commercialContext?: Record<string, unknown>;
  sideEffects: {
    leadEmail: {
      to: string;
      subject: string;
      html: string;
      text: string;
      domainConfigId?: string;
      useDefaultSenderFallback: boolean;
    };
    salesEmail: {
      to: string;
      subject: string;
      html: string;
      text: string;
      domainConfigId?: string;
      useDefaultSenderFallback: boolean;
    };
    founderCall?: {
      enabled: boolean;
      leadPhone: string;
      leadName: string;
      founderName: string;
      notes: string;
      context: Record<string, unknown>;
    };
    slackHotLead?: {
      enabled: boolean;
      message: string;
      routing: SamanthaPostCaptureSlackRoutingInput;
      requireHotLeadQualificationAtLeast?: "Hot" | "High";
    };
  };
  policy?: {
    allowSlackHotLead?: boolean;
  };
  maxAttempts?: number;
}

export interface SamanthaPostCaptureDispatchStepState {
  stepKey: SamanthaPostCaptureDispatchStepKey;
  status: SamanthaPostCaptureDispatchStepStatus;
  attemptCount: number;
  lastAttemptAt?: number;
  completedAt?: number;
  lastReasonCode?: SamanthaPostCaptureDispatchReasonCode;
  lastError?: string;
  outputRef?: string;
  externalSideEffectId?: string;
}

export interface SamanthaPostCaptureDispatchAttemptSnapshot {
  attemptNumber: number;
  leaseOwner: string;
  leaseToken: string;
  leaseExpiresAt: number;
  startedAt: number;
  completedAt?: number;
  outcome: "succeeded" | "failed_retryable" | "failed_terminal";
  reasonCode?: SamanthaPostCaptureDispatchReasonCode;
  error?: string;
  backoffMs?: number;
}

export interface SamanthaPostCaptureDispatchResult {
  contractVersion: typeof SAMANTHA_POST_CAPTURE_DISPATCH_RESULT_VERSION;
  runId: string;
  organizationId: Id<"organizations">;
  idempotencyKey: string;
  correlationId: string;
  status: SamanthaPostCaptureDispatchRunStatus;
  replayed: boolean;
  reasonCode?: SamanthaPostCaptureDispatchReasonCode;
  error?: string;
  nextRetryAt?: number;
  attemptCount: number;
  maxAttempts: number;
  stepStates: SamanthaPostCaptureDispatchStepState[];
  outputs: {
    leadEmailDelivery?: {
      success: boolean;
      messageId?: string;
      reason?: string;
      error?: string;
      skipped?: boolean;
    };
    salesEmailDelivery?: {
      success: boolean;
      messageId?: string;
      reason?: string;
      error?: string;
      skipped?: boolean;
    };
    founderCallOrchestration?: {
      success: boolean;
      skipped?: boolean;
      reason?: string;
      error?: string;
      provider?: string;
      requestAccepted?: boolean;
      callId?: string;
      conferenceId?: string;
    };
    slackHotLeadDelivery?: {
      success: boolean;
      skipped?: boolean;
      reason?: string;
      error?: string;
      providerMessageId?: string;
    };
  };
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeEmailForHash(value: string): string {
  return value.trim().toLowerCase();
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort((left, right) => left.localeCompare(right));
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function fnv1aHashBase36(seed: string): string {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

export function buildSamanthaPostCaptureDispatchIdempotencyKey(args: {
  organizationId: Id<"organizations"> | string;
  auditSessionKey: string;
  leadEmail: string;
  workflowRecommendation: string;
}): string {
  const payloadFingerprint = fnv1aHashBase36(
    stableStringify({
      workflowRecommendation: normalizeString(args.workflowRecommendation) || "",
    })
  );
  const org = normalizeString(String(args.organizationId)) || "org_unknown";
  const session = normalizeString(args.auditSessionKey) || "audit_unknown";
  const email = normalizeEmailForHash(args.leadEmail);
  return `post_capture_dispatch:${org}:${session}:${email}:${payloadFingerprint}`;
}

export function buildSamanthaPostCaptureDispatchCorrelationId(args: {
  organizationId: Id<"organizations"> | string;
  auditSessionKey: string;
  now: number;
}): string {
  const org = normalizeString(String(args.organizationId)) || "org_unknown";
  const session = normalizeString(args.auditSessionKey) || "audit_unknown";
  return `sam_dispatch:${org}:${session}:${args.now}`;
}

export function resolveSamanthaPostCaptureBackoffMs(args: {
  attemptNumber: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}): number {
  const attempt = Math.max(1, Math.floor(args.attemptNumber));
  const baseDelayMs = Math.max(250, Math.floor(args.baseDelayMs ?? 15_000));
  const maxDelayMs = Math.max(baseDelayMs, Math.floor(args.maxDelayMs ?? 15 * 60 * 1000));
  const exponential = baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(exponential, maxDelayMs);
}

const RETRYABLE_REASON_CODES = new Set<SamanthaPostCaptureDispatchReasonCode>([
  "lead_email_send_failed",
  "sales_email_send_failed",
  "founder_call_orchestration_failed",
  "slack_routing_send_failed",
  "dispatch_unexpected_error",
]);

export function isRetryableDispatchReasonCode(
  reasonCode: SamanthaPostCaptureDispatchReasonCode
): boolean {
  return RETRYABLE_REASON_CODES.has(reasonCode);
}
