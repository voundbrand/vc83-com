import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  SAMANTHA_POST_CAPTURE_DISPATCH_INPUT_VERSION,
  SAMANTHA_POST_CAPTURE_DISPATCH_RESULT_VERSION,
  SAMANTHA_POST_CAPTURE_DISPATCH_STEP_KEYS,
  SAMANTHA_POST_CAPTURE_DEAD_LETTER_STATUS_VALUES,
  type SamanthaPostCaptureDeadLetterStatus,
  type SamanthaPostCaptureDispatchInput,
  type SamanthaPostCaptureDispatchReasonCode,
  type SamanthaPostCaptureDispatchResult,
  type SamanthaPostCaptureDispatchRunStatus,
  type SamanthaPostCaptureDispatchStepKey,
  type SamanthaPostCaptureDispatchStepState,
  resolveSamanthaPostCaptureBackoffMs,
} from "./postCaptureDispatcherContracts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_internalCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _internalCache = require("../_generated/api").internal;
  }
  return _internalCache;
}

type DispatchRunDoc = Doc<"onboardingPostCaptureDispatchRuns">;
type DispatchDeadLetterDoc = Doc<"onboardingPostCaptureDispatchDeadLetters">;

type DispatchAttemptOutcome = "succeeded" | "failed_retryable" | "failed_terminal";

const DEFAULT_MAX_ATTEMPTS = 4;
const DEFAULT_LEASE_DURATION_MS = 120_000;
const MIN_RETRY_DELAY_MS = 15_000;
const MAX_RETRY_DELAY_MS = 15 * 60 * 1000;

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function toErrorString(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function nowMs(): number {
  return Date.now();
}

function isProductionRuntime(): boolean {
  const nodeEnv = normalizeOptionalString(process.env.NODE_ENV)?.toLowerCase();
  const appEnv = normalizeOptionalString(process.env.APP_ENV)?.toLowerCase();
  const vercelEnv = normalizeOptionalString(process.env.VERCEL_ENV)?.toLowerCase();
  return nodeEnv === "production" || appEnv === "production" || vercelEnv === "production";
}

function resolveSlackConnectionProfileType(connection: Record<string, unknown>):
  | "platform"
  | "organization" {
  const metadata = readRecord(connection.customProperties);
  const fromConnection = normalizeOptionalString(connection.providerProfileType);
  const fromMetadata =
    normalizeOptionalString(metadata.providerProfileType) ||
    normalizeOptionalString(metadata.profileType);
  const value = fromConnection || fromMetadata;
  return value === "platform" ? "platform" : "organization";
}

function readSlackConnectionRouteKey(connection: Record<string, unknown>): string | undefined {
  const metadata = readRecord(connection.customProperties);
  return (
    normalizeOptionalString(connection.providerRouteKey) ||
    normalizeOptionalString(metadata.providerRouteKey) ||
    normalizeOptionalString(metadata.routeKey) ||
    (() => {
      const providerAccountId = normalizeOptionalString(connection.providerAccountId);
      return providerAccountId ? `slack:${providerAccountId}` : undefined;
    })()
  );
}

function buildDefaultStepState(): SamanthaPostCaptureDispatchStepState[] {
  return SAMANTHA_POST_CAPTURE_DISPATCH_STEP_KEYS.map((stepKey) => ({
    stepKey,
    status: "pending",
    attemptCount: 0,
  }));
}

function normalizeStepState(value: unknown): SamanthaPostCaptureDispatchStepState[] {
  if (!Array.isArray(value)) {
    return buildDefaultStepState();
  }

  const byKey = new Map<SamanthaPostCaptureDispatchStepKey, SamanthaPostCaptureDispatchStepState>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const stepKey = normalizeOptionalString(record.stepKey) as
      | SamanthaPostCaptureDispatchStepKey
      | undefined;
    if (!stepKey || !SAMANTHA_POST_CAPTURE_DISPATCH_STEP_KEYS.includes(stepKey)) {
      continue;
    }
    const status = normalizeOptionalString(record.status) as
      | SamanthaPostCaptureDispatchStepState["status"]
      | undefined;
    const attemptCountRaw = record.attemptCount;
    const attemptCount =
      typeof attemptCountRaw === "number" && Number.isFinite(attemptCountRaw)
        ? Math.max(0, Math.floor(attemptCountRaw))
        : 0;
    byKey.set(stepKey, {
      stepKey,
      status:
        status === "pending" ||
        status === "in_progress" ||
        status === "succeeded" ||
        status === "failed_retryable" ||
        status === "failed_terminal" ||
        status === "skipped_policy"
          ? status
          : "pending",
      attemptCount,
      lastAttemptAt:
        typeof record.lastAttemptAt === "number" && Number.isFinite(record.lastAttemptAt)
          ? record.lastAttemptAt
          : undefined,
      completedAt:
        typeof record.completedAt === "number" && Number.isFinite(record.completedAt)
          ? record.completedAt
          : undefined,
      lastReasonCode: normalizeOptionalString(record.lastReasonCode) as
        | SamanthaPostCaptureDispatchReasonCode
        | undefined,
      lastError: normalizeOptionalString(record.lastError),
      outputRef: normalizeOptionalString(record.outputRef),
      externalSideEffectId: normalizeOptionalString(record.externalSideEffectId),
    });
  }

  return SAMANTHA_POST_CAPTURE_DISPATCH_STEP_KEYS.map(
    (stepKey) =>
      byKey.get(stepKey) || {
        stepKey,
        status: "pending",
        attemptCount: 0,
      }
  );
}

function getStepState(
  stepState: SamanthaPostCaptureDispatchStepState[],
  stepKey: SamanthaPostCaptureDispatchStepKey
): SamanthaPostCaptureDispatchStepState {
  const existing = stepState.find((entry) => entry.stepKey === stepKey);
  if (existing) {
    return existing;
  }
  const fallback: SamanthaPostCaptureDispatchStepState = {
    stepKey,
    status: "pending",
    attemptCount: 0,
  };
  stepState.push(fallback);
  return fallback;
}

function generateLeaseToken(leaseOwner: string, now: number): string {
  return `${leaseOwner}:${now}:${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeDispatchInput(value: unknown): SamanthaPostCaptureDispatchInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const candidate = value as SamanthaPostCaptureDispatchInput;
  if (candidate.contractVersion !== SAMANTHA_POST_CAPTURE_DISPATCH_INPUT_VERSION) {
    return null;
  }
  if (!normalizeOptionalString(candidate.idempotencyKey)) {
    return null;
  }
  if (!normalizeOptionalString(candidate.auditSessionKey)) {
    return null;
  }
  if (!normalizeOptionalString(candidate.correlationId)) {
    return null;
  }
  if (!candidate.organizationId) {
    return null;
  }
  if (!candidate.sideEffects || !candidate.sideEffects.leadEmail || !candidate.sideEffects.salesEmail) {
    return null;
  }
  return candidate;
}

function normalizeRunStatus(value: unknown): SamanthaPostCaptureDispatchRunStatus {
  const status = normalizeOptionalString(value);
  if (
    status === "queued" ||
    status === "running" ||
    status === "retry_scheduled" ||
    status === "succeeded" ||
    status === "failed_terminal" ||
    status === "dead_lettered" ||
    status === "replay_requested"
  ) {
    return status;
  }
  return "queued";
}

function parseRunOutputs(value: unknown): SamanthaPostCaptureDispatchResult["outputs"] {
  const record = readRecord(value);
  return {
    leadEmailDelivery: record.leadEmailDelivery as SamanthaPostCaptureDispatchResult["outputs"]["leadEmailDelivery"],
    salesEmailDelivery:
      record.salesEmailDelivery as SamanthaPostCaptureDispatchResult["outputs"]["salesEmailDelivery"],
    founderCallOrchestration:
      record.founderCallOrchestration as SamanthaPostCaptureDispatchResult["outputs"]["founderCallOrchestration"],
    slackHotLeadDelivery:
      record.slackHotLeadDelivery as SamanthaPostCaptureDispatchResult["outputs"]["slackHotLeadDelivery"],
  };
}

function parseReasonCode(value: unknown): SamanthaPostCaptureDispatchReasonCode | undefined {
  const normalized = normalizeOptionalString(value) as
    | SamanthaPostCaptureDispatchReasonCode
    | undefined;
  return normalized;
}

function mapRouterSlackErrorToReasonCode(
  error: string | undefined
): SamanthaPostCaptureDispatchReasonCode {
  const normalized = (error || "").toLowerCase();
  if (normalized.includes("no credentials") || normalized.includes("workspace")) {
    return "slack_routing_workspace_not_found";
  }
  if (normalized.includes("credential boundary")) {
    return "slack_routing_connection_scope_mismatch";
  }
  if (normalized.includes("unresolved channel binding identity")) {
    return "slack_routing_missing_workspace_identity";
  }
  return "slack_routing_send_failed";
}

function resolveLeadQualificationRank(level: string | undefined): number {
  if (!level) {
    return 0;
  }
  const normalized = level.trim().toLowerCase();
  if (normalized === "hot") {
    return 3;
  }
  if (normalized === "high") {
    return 2;
  }
  if (normalized === "medium") {
    return 1;
  }
  return 0;
}

function buildDispatchResult(args: {
  run: DispatchRunDoc;
  replayed: boolean;
}): SamanthaPostCaptureDispatchResult {
  const run = args.run;
  return {
    contractVersion: SAMANTHA_POST_CAPTURE_DISPATCH_RESULT_VERSION,
    runId: String(run._id),
    organizationId: run.organizationId,
    idempotencyKey: run.idempotencyKey,
    correlationId: run.correlationId,
    status: normalizeRunStatus(run.status),
    replayed: args.replayed,
    reasonCode: parseReasonCode(run.reasonCode),
    error: normalizeOptionalString(run.error),
    nextRetryAt:
      typeof run.nextRetryAt === "number" && Number.isFinite(run.nextRetryAt)
        ? run.nextRetryAt
        : undefined,
    attemptCount:
      typeof run.attemptCount === "number" && Number.isFinite(run.attemptCount)
        ? Math.max(0, Math.floor(run.attemptCount))
        : 0,
    maxAttempts:
      typeof run.maxAttempts === "number" && Number.isFinite(run.maxAttempts)
        ? Math.max(1, Math.floor(run.maxAttempts))
        : DEFAULT_MAX_ATTEMPTS,
    stepStates: normalizeStepState(run.stepState),
    outputs: parseRunOutputs(run.outputs),
  };
}

function shouldScheduleRetry(args: {
  attemptCount: number;
  maxAttempts: number;
  reasonCode: SamanthaPostCaptureDispatchReasonCode;
}): boolean {
  if (args.attemptCount >= args.maxAttempts) {
    return false;
  }
  return (
    args.reasonCode === "lead_email_send_failed" ||
    args.reasonCode === "sales_email_send_failed" ||
    args.reasonCode === "slack_routing_send_failed" ||
    args.reasonCode === "dispatch_unexpected_error"
  );
}

async function resolveSlackRoutingIdentityForDispatch(ctx: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runQuery: any;
}, args: {
  organizationId: Id<"organizations">;
  routingInput: {
    providerConnectionId?: string;
    providerAccountId?: string;
    routeKey?: string;
    channelId?: string;
  };
}): Promise<
  | {
      ok: true;
      providerConnectionId: string;
      providerAccountId: string;
      routeKey: string;
      channelId: string;
    }
  | {
      ok: false;
      reasonCode: SamanthaPostCaptureDispatchReasonCode;
      error: string;
    }
> {
  const activeConnections = (await (ctx.runQuery as Function)(
    getInternal().ai.postCaptureDispatcher.listActiveSlackOAuthConnectionsForOrg,
    {
      organizationId: args.organizationId,
    }
  )) as Array<Record<string, unknown>> | null;

  return resolveSlackRoutingIdentityFromActiveConnections({
    routingInput: args.routingInput,
    activeConnections: Array.isArray(activeConnections) ? activeConnections : [],
    requireExplicitWorkspaceIdentity: isProductionRuntime(),
  });
}

function resolveSlackRoutingIdentityFromActiveConnections(args: {
  routingInput: {
    providerConnectionId?: string;
    providerAccountId?: string;
    routeKey?: string;
    channelId?: string;
  };
  activeConnections: Array<Record<string, unknown>>;
  requireExplicitWorkspaceIdentity: boolean;
}):
  | {
      ok: true;
      providerConnectionId: string;
      providerAccountId: string;
      routeKey: string;
      channelId: string;
    }
  | {
      ok: false;
      reasonCode: SamanthaPostCaptureDispatchReasonCode;
      error: string;
    } {
  const channelId = normalizeOptionalString(args.routingInput.channelId);
  if (!channelId) {
    return {
      ok: false,
      reasonCode: "slack_routing_missing_channel",
      error: "Slack routing channelId is required",
    };
  }

  const organizationConnections = args.activeConnections.filter((connection) =>
    resolveSlackConnectionProfileType(connection as Record<string, unknown>) === "organization"
  );

  if (organizationConnections.length === 0) {
    return {
      ok: false,
      reasonCode: "slack_routing_workspace_not_found",
      error: "No active organization-scoped Slack OAuth connection found",
    };
  }

  const connectionIdHint = normalizeOptionalString(args.routingInput.providerConnectionId);
  const accountIdHint = normalizeOptionalString(args.routingInput.providerAccountId);
  const routeKeyHint = normalizeOptionalString(args.routingInput.routeKey);

  let candidates = organizationConnections;
  if (connectionIdHint) {
    candidates = candidates.filter((connection) => String(connection._id) === connectionIdHint);
  }
  if (accountIdHint) {
    candidates = candidates.filter(
      (connection) => normalizeOptionalString(connection.providerAccountId) === accountIdHint
    );
  }
  if (routeKeyHint) {
    candidates = candidates.filter((connection) => {
      const routeKey = readSlackConnectionRouteKey(connection as Record<string, unknown>);
      return routeKey === routeKeyHint;
    });
  }

  const hasExplicitIdentityHints = Boolean(connectionIdHint || accountIdHint || routeKeyHint);
  if (!hasExplicitIdentityHints) {
    if (args.requireExplicitWorkspaceIdentity) {
      return {
        ok: false,
        reasonCode: "slack_routing_missing_workspace_identity",
        error:
          "Slack routing requires explicit workspace identity (providerConnectionId/providerAccountId/routeKey) in production",
      };
    }
    if (candidates.length !== 1) {
      return {
        ok: false,
        reasonCode: "slack_routing_ambiguous_workspace_identity",
        error: "Slack routing is ambiguous without explicit workspace identity",
      };
    }
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      reasonCode: "slack_routing_workspace_not_found",
      error: "Slack routing identity did not match an active organization-scoped OAuth connection",
    };
  }
  if (candidates.length > 1) {
    return {
      ok: false,
      reasonCode: "slack_routing_ambiguous_workspace_identity",
      error: "Slack routing identity matched multiple organization-scoped OAuth connections",
    };
  }

  const selected = candidates[0] as Record<string, unknown>;
  const providerConnectionId = normalizeOptionalString(selected._id);
  const providerAccountId = normalizeOptionalString(selected.providerAccountId);
  const routeKey = readSlackConnectionRouteKey(selected);

  if (!providerConnectionId || !providerAccountId || !routeKey) {
    return {
      ok: false,
      reasonCode: "slack_routing_connection_scope_mismatch",
      error: "Slack OAuth connection missing deterministic route identity fields",
    };
  }

  if (resolveSlackConnectionProfileType(selected) !== "organization") {
    return {
      ok: false,
      reasonCode: "slack_routing_connection_scope_mismatch",
      error: "Resolved Slack OAuth connection is not organization-scoped",
    };
  }

  return {
    ok: true,
    providerConnectionId,
    providerAccountId,
    routeKey,
    channelId,
  };
}

type StepExecutionResult = {
  status: "succeeded" | "skipped_policy" | "failed";
  reasonCode?: SamanthaPostCaptureDispatchReasonCode;
  error?: string;
  retryable?: boolean;
  output?: Record<string, unknown>;
  outputRef?: string;
  externalSideEffectId?: string;
};

async function executeLeadEmailStep(ctx: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runAction: any;
}, input: SamanthaPostCaptureDispatchInput): Promise<StepExecutionResult> {
  const leadEmail = input.sideEffects.leadEmail;
  const sendEmailAction = leadEmail.useDefaultSenderFallback
    ? getInternal().emailDelivery.sendEmailWithDefaultSender
    : getInternal().emailDelivery.sendEmail;

  const actionArgs = leadEmail.useDefaultSenderFallback
    ? {
        to: leadEmail.to,
        subject: leadEmail.subject,
        html: leadEmail.html,
        text: leadEmail.text,
      }
    : {
        to: leadEmail.to,
        subject: leadEmail.subject,
        html: leadEmail.html,
        text: leadEmail.text,
        domainConfigId: leadEmail.domainConfigId,
      };

  try {
    const sendResult = (await (ctx.runAction as Function)(sendEmailAction, actionArgs)) as
      | { success?: boolean; messageId?: string; error?: string }
      | undefined;
    if (sendResult?.success !== true) {
      return {
        status: "failed",
        reasonCode: "lead_email_send_failed",
        error: normalizeOptionalString(sendResult?.error) || "Lead email send returned unsuccessful response",
        retryable: true,
      };
    }
    const messageId = normalizeOptionalString(sendResult.messageId);
    return {
      status: "succeeded",
      outputRef: messageId,
      externalSideEffectId: messageId,
      output: {
        leadEmailDelivery: {
          success: true,
          messageId,
        },
      },
    };
  } catch (error) {
    return {
      status: "failed",
      reasonCode: "lead_email_send_failed",
      error: toErrorString(error),
      retryable: true,
    };
  }
}

async function executeSalesEmailStep(ctx: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runAction: any;
}, input: SamanthaPostCaptureDispatchInput): Promise<StepExecutionResult> {
  const salesEmail = input.sideEffects.salesEmail;
  const sendEmailAction = salesEmail.useDefaultSenderFallback
    ? getInternal().emailDelivery.sendEmailWithDefaultSender
    : getInternal().emailDelivery.sendEmail;

  const actionArgs = salesEmail.useDefaultSenderFallback
    ? {
        to: salesEmail.to,
        subject: salesEmail.subject,
        html: salesEmail.html,
        text: salesEmail.text,
      }
    : {
        to: salesEmail.to,
        subject: salesEmail.subject,
        html: salesEmail.html,
        text: salesEmail.text,
        domainConfigId: salesEmail.domainConfigId,
      };

  try {
    const sendResult = (await (ctx.runAction as Function)(sendEmailAction, actionArgs)) as
      | { success?: boolean; messageId?: string; error?: string }
      | undefined;
    if (sendResult?.success !== true) {
      return {
        status: "failed",
        reasonCode: "sales_email_send_failed",
        error:
          normalizeOptionalString(sendResult?.error) ||
          "Sales notification email send returned unsuccessful response",
        retryable: true,
      };
    }
    const messageId = normalizeOptionalString(sendResult.messageId);
    return {
      status: "succeeded",
      outputRef: messageId,
      externalSideEffectId: messageId,
      output: {
        salesEmailDelivery: {
          success: true,
          messageId,
        },
      },
    };
  } catch (error) {
    return {
      status: "failed",
      reasonCode: "sales_email_send_failed",
      error: toErrorString(error),
      retryable: true,
    };
  }
}

async function executeFounderCallStep(ctx: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runAction: any;
}, input: SamanthaPostCaptureDispatchInput): Promise<StepExecutionResult> {
  const founderCall = input.sideEffects.founderCall;
  if (!founderCall || founderCall.enabled !== true) {
    return {
      status: "skipped_policy",
      reasonCode: "slack_policy_disabled",
      output: {
        founderCallOrchestration: {
          success: false,
          skipped: true,
          reason: "founder_contact_not_requested",
        },
      },
    };
  }

  try {
    const callResult = (await (ctx.runAction as Function)(
      getInternal().integrations.infobip.startFounderThreeWayCall,
      {
        organizationId: input.organizationId,
        leadPhone: founderCall.leadPhone,
        leadName: founderCall.leadName,
        founderName: founderCall.founderName,
        notes: founderCall.notes,
        context: founderCall.context,
      }
    )) as
      | {
          success?: boolean;
          skipped?: boolean;
          reason?: string;
          error?: string;
          provider?: string;
          requestAccepted?: boolean;
          callId?: string;
          conferenceId?: string;
        }
      | undefined;

    if (callResult?.success === true) {
      return {
        status: "succeeded",
        outputRef: normalizeOptionalString(callResult.callId),
        externalSideEffectId: normalizeOptionalString(callResult.callId),
        output: {
          founderCallOrchestration: {
            success: true,
            skipped: callResult.skipped === true,
            reason: normalizeOptionalString(callResult.reason),
            error: normalizeOptionalString(callResult.error),
            provider: normalizeOptionalString(callResult.provider),
            requestAccepted: callResult.requestAccepted === true,
            callId: normalizeOptionalString(callResult.callId),
            conferenceId: normalizeOptionalString(callResult.conferenceId),
          },
        },
      };
    }

    if (callResult?.skipped === true) {
      return {
        status: "skipped_policy",
        output: {
          founderCallOrchestration: {
            success: false,
            skipped: true,
            reason: normalizeOptionalString(callResult.reason) || "founder_call_skipped",
            error: normalizeOptionalString(callResult.error),
            provider: normalizeOptionalString(callResult.provider),
            requestAccepted: callResult.requestAccepted === true,
            callId: normalizeOptionalString(callResult.callId),
            conferenceId: normalizeOptionalString(callResult.conferenceId),
          },
        },
      };
    }

    return {
      status: "failed",
      reasonCode: "founder_call_orchestration_failed",
      error:
        normalizeOptionalString(callResult?.error) ||
        "Founder call orchestration returned unsuccessful response",
      retryable: false,
      output: {
        founderCallOrchestration: {
          success: false,
          error:
            normalizeOptionalString(callResult?.error) ||
            "Founder call orchestration returned unsuccessful response",
        },
      },
    };
  } catch (error) {
    return {
      status: "failed",
      reasonCode: "founder_call_orchestration_failed",
      error: toErrorString(error),
      retryable: false,
      output: {
        founderCallOrchestration: {
          success: false,
          error: toErrorString(error),
        },
      },
    };
  }
}

async function executeSlackHotLeadStep(ctx: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runQuery: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runAction: any;
}, args: {
  input: SamanthaPostCaptureDispatchInput;
  dispatchKey: string;
}): Promise<StepExecutionResult> {
  const slackHotLead = args.input.sideEffects.slackHotLead;
  if (!slackHotLead || slackHotLead.enabled !== true) {
    return {
      status: "skipped_policy",
      reasonCode: "slack_policy_disabled",
      output: {
        slackHotLeadDelivery: {
          success: false,
          skipped: true,
          reason: "slack_hot_lead_disabled",
        },
      },
    };
  }

  if (args.input.policy?.allowSlackHotLead === false) {
    return {
      status: "skipped_policy",
      reasonCode: "slack_policy_disabled",
      output: {
        slackHotLeadDelivery: {
          success: false,
          skipped: true,
          reason: "slack_hot_lead_policy_blocked",
        },
      },
    };
  }

  const requiredQualification =
    slackHotLead.requireHotLeadQualificationAtLeast === "Hot" ? "Hot" : "High";
  const leadRank = resolveLeadQualificationRank(args.input.lead.qualificationLevel);
  const requiredRank = resolveLeadQualificationRank(requiredQualification);
  if (leadRank < requiredRank) {
    return {
      status: "skipped_policy",
      reasonCode: "slack_policy_not_hot_lead",
      output: {
        slackHotLeadDelivery: {
          success: false,
          skipped: true,
          reason: "lead_not_hot_enough_for_slack",
        },
      },
    };
  }

  const routing = await resolveSlackRoutingIdentityForDispatch(
    {
      runQuery: ctx.runQuery,
    },
    {
      organizationId: args.input.organizationId,
      routingInput: {
        providerConnectionId: slackHotLead.routing.providerConnectionId,
        providerAccountId: slackHotLead.routing.providerAccountId,
        routeKey: slackHotLead.routing.routeKey,
        channelId: slackHotLead.routing.channelId,
      },
    }
  );

  if (!routing.ok) {
    return {
      status: "failed",
      reasonCode: routing.reasonCode,
      error: routing.error,
      retryable: false,
      output: {
        slackHotLeadDelivery: {
          success: false,
          error: routing.error,
        },
      },
    };
  }

  try {
    const sendResult = (await (ctx.runAction as Function)(
      getInternal().channels.router.sendMessage,
      {
        organizationId: args.input.organizationId,
        channel: "slack",
        recipientIdentifier: routing.channelId,
        content: slackHotLead.message,
        idempotencyKey: `samantha_post_capture_slack:${args.dispatchKey}`,
        providerId: "slack",
        providerConnectionId: routing.providerConnectionId,
        providerAccountId: routing.providerAccountId,
        routeKey: routing.routeKey,
        providerProfileType: "organization",
        failClosedRouting: true,
      }
    )) as
      | {
          success?: boolean;
          providerMessageId?: string;
          error?: string;
          retryable?: boolean;
        }
      | undefined;

    if (sendResult?.success !== true) {
      const mappedReason = mapRouterSlackErrorToReasonCode(
        normalizeOptionalString(sendResult?.error)
      );
      return {
        status: "failed",
        reasonCode: mappedReason,
        error:
          normalizeOptionalString(sendResult?.error) ||
          "Slack hot lead notification send returned unsuccessful response",
        retryable: sendResult?.retryable === true,
        output: {
          slackHotLeadDelivery: {
            success: false,
            error:
              normalizeOptionalString(sendResult?.error) ||
              "Slack hot lead notification send returned unsuccessful response",
          },
        },
      };
    }

    const providerMessageId = normalizeOptionalString(sendResult.providerMessageId);
    return {
      status: "succeeded",
      outputRef: providerMessageId,
      externalSideEffectId: providerMessageId,
      output: {
        slackHotLeadDelivery: {
          success: true,
          providerMessageId,
        },
      },
    };
  } catch (error) {
    return {
      status: "failed",
      reasonCode: "slack_routing_send_failed",
      error: toErrorString(error),
      retryable: true,
      output: {
        slackHotLeadDelivery: {
          success: false,
          error: toErrorString(error),
        },
      },
    };
  }
}

export const getDispatchRunByIdempotencyKey = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("onboardingPostCaptureDispatchRuns")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("organizationId", args.organizationId).eq("idempotencyKey", args.idempotencyKey)
      )
      .first();
  },
});

export const getDispatchRunById = internalQuery({
  args: {
    runId: v.id("onboardingPostCaptureDispatchRuns"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.runId);
  },
});

export const listActiveSlackOAuthConnectionsForOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const activeConnections = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", args.organizationId).eq("provider", "slack")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return activeConnections
      .filter(
        (connection) =>
          resolveSlackConnectionProfileType(connection as Record<string, unknown>) === "organization"
      )
      .map((connection) => ({
        _id: connection._id,
        providerAccountId: connection.providerAccountId,
        providerRouteKey: (connection as Record<string, unknown>).providerRouteKey,
        providerProfileType: connection.providerProfileType,
        customProperties: connection.customProperties,
      }));
  },
});

export const createDispatchRun = internalMutation({
  args: {
    input: v.any(),
  },
  handler: async (ctx, args) => {
    const input = normalizeDispatchInput(args.input);
    if (!input) {
      return {
        success: false,
        reasonCode: "dispatch_input_invalid" as const,
      };
    }

    const existing = await ctx.db
      .query("onboardingPostCaptureDispatchRuns")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("organizationId", input.organizationId).eq("idempotencyKey", input.idempotencyKey)
      )
      .first();

    if (existing) {
      return {
        success: true,
        created: false,
        runId: existing._id,
      };
    }

    const now = nowMs();
    const maxAttemptsRaw =
      typeof input.maxAttempts === "number" && Number.isFinite(input.maxAttempts)
        ? Math.floor(input.maxAttempts)
        : DEFAULT_MAX_ATTEMPTS;
    const maxAttempts = Math.max(1, Math.min(10, maxAttemptsRaw));

    const runId = await ctx.db.insert("onboardingPostCaptureDispatchRuns", {
      dispatchKey: input.idempotencyKey,
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId,
      organizationId: input.organizationId,
      auditSessionKey: input.auditSessionKey,
      channel: input.source.channel,
      status: "queued",
      attemptCount: 0,
      maxAttempts,
      nextRetryAt: now,
      stepState: buildDefaultStepState(),
      payloadSnapshotRef: `audit_session:${input.auditSessionKey}`,
      payloadSnapshot: input,
      outputs: {},
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      organizationId: input.organizationId,
      action: "samantha.post_capture_dispatch.queued",
      resource: "onboardingPostCaptureDispatchRuns",
      resourceId: String(runId),
      metadata: {
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
        auditSessionKey: input.auditSessionKey,
      },
      success: true,
      createdAt: now,
    });

    return {
      success: true,
      created: true,
      runId,
    };
  },
});

export const acquireDispatchLease = internalMutation({
  args: {
    runId: v.id("onboardingPostCaptureDispatchRuns"),
    leaseOwner: v.string(),
    leaseDurationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) {
      return { success: false as const, reason: "run_not_found" as const };
    }

    const runStatus = normalizeRunStatus(run.status);
    const now = nowMs();
    const leaseDurationMsRaw =
      typeof args.leaseDurationMs === "number" && Number.isFinite(args.leaseDurationMs)
        ? Math.floor(args.leaseDurationMs)
        : DEFAULT_LEASE_DURATION_MS;
    const leaseDurationMs = Math.max(5_000, Math.min(10 * 60 * 1000, leaseDurationMsRaw));

    if (runStatus === "succeeded" || runStatus === "dead_lettered" || runStatus === "failed_terminal") {
      return {
        success: false as const,
        reason: "run_terminal" as const,
      };
    }

    if (
      runStatus === "retry_scheduled" &&
      typeof run.nextRetryAt === "number" &&
      Number.isFinite(run.nextRetryAt) &&
      run.nextRetryAt > now
    ) {
      return {
        success: false as const,
        reason: "run_retry_not_due" as const,
      };
    }

    const activeLeaseOwner = normalizeOptionalString(run.leaseOwner);
    const activeLeaseToken = normalizeOptionalString(run.leaseToken);
    const activeLeaseExpiresAt =
      typeof run.leaseExpiresAt === "number" && Number.isFinite(run.leaseExpiresAt)
        ? run.leaseExpiresAt
        : undefined;

    const leaseStillActive =
      runStatus === "running" &&
      Boolean(activeLeaseToken) &&
      typeof activeLeaseExpiresAt === "number" &&
      activeLeaseExpiresAt > now;

    if (leaseStillActive) {
      return {
        success: false as const,
        reason: "lease_conflict" as const,
      };
    }

    const nextAttemptNumber = Math.max(1, Math.floor((run.attemptCount || 0) + 1));
    const leaseToken = generateLeaseToken(args.leaseOwner, now);
    const leaseExpiresAt = now + leaseDurationMs;

    await ctx.db.patch(args.runId, {
      status: "running",
      leaseOwner: args.leaseOwner,
      leaseToken,
      leaseExpiresAt,
      updatedAt: now,
    });

    const attemptId = await ctx.db.insert("onboardingPostCaptureDispatchAttempts", {
      runId: args.runId,
      organizationId: run.organizationId,
      dispatchKey: run.dispatchKey,
      attemptNumber: nextAttemptNumber,
      status: "running",
      leaseOwner: args.leaseOwner,
      leaseToken,
      leaseExpiresAt,
      createdAt: now,
      updatedAt: now,
      startedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      organizationId: run.organizationId,
      action: "samantha.post_capture_dispatch.lease_acquired",
      resource: "onboardingPostCaptureDispatchRuns",
      resourceId: String(args.runId),
      metadata: {
        attemptId,
        attemptNumber: nextAttemptNumber,
        leaseOwner: args.leaseOwner,
        previousLeaseOwner: activeLeaseOwner,
      },
      success: true,
      createdAt: now,
    });

    return {
      success: true as const,
      attemptId,
      attemptNumber: nextAttemptNumber,
      leaseToken,
      leaseExpiresAt,
    };
  },
});

export const commitDispatchAttemptOutcome = internalMutation({
  args: {
    runId: v.id("onboardingPostCaptureDispatchRuns"),
    attemptId: v.id("onboardingPostCaptureDispatchAttempts"),
    leaseToken: v.string(),
    attemptOutcome: v.union(
      v.literal("succeeded"),
      v.literal("failed_retryable"),
      v.literal("failed_terminal")
    ),
    stepState: v.array(
      v.object({
        stepKey: v.string(),
        status: v.string(),
        attemptCount: v.number(),
        lastAttemptAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),
        lastReasonCode: v.optional(v.string()),
        lastError: v.optional(v.string()),
        outputRef: v.optional(v.string()),
        externalSideEffectId: v.optional(v.string()),
      })
    ),
    outputs: v.optional(v.any()),
    reasonCode: v.optional(v.string()),
    error: v.optional(v.string()),
    nextRetryAt: v.optional(v.number()),
    backoffMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) {
      return { success: false as const, reason: "run_not_found" as const };
    }

    if (normalizeOptionalString(run.leaseToken) !== args.leaseToken) {
      return { success: false as const, reason: "lease_token_mismatch" as const };
    }

    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) {
      return { success: false as const, reason: "attempt_not_found" as const };
    }

    const now = nowMs();
    const normalizedReasonCode = parseReasonCode(args.reasonCode);
    const normalizedError = normalizeOptionalString(args.error);

    const runPatch: Partial<DispatchRunDoc> & Record<string, unknown> = {
      stepState: normalizeStepState(args.stepState),
      outputs: readRecord(args.outputs),
      reasonCode: normalizedReasonCode,
      error: normalizedError,
      attemptCount: Math.max(1, Math.floor(attempt.attemptNumber || 1)),
      leaseOwner: undefined,
      leaseToken: undefined,
      leaseExpiresAt: undefined,
      updatedAt: now,
    };

    if (args.attemptOutcome === "succeeded") {
      runPatch.status = "succeeded";
      runPatch.nextRetryAt = undefined;
      runPatch.completedAt = now;
    } else if (args.attemptOutcome === "failed_retryable") {
      runPatch.status = "retry_scheduled";
      runPatch.nextRetryAt = args.nextRetryAt;
      runPatch.completedAt = undefined;
    } else {
      runPatch.status = "failed_terminal";
      runPatch.nextRetryAt = undefined;
      runPatch.completedAt = now;
    }

    await ctx.db.patch(args.runId, runPatch);

    await ctx.db.patch(args.attemptId, {
      status: args.attemptOutcome,
      reasonCode: normalizedReasonCode,
      error: normalizedError,
      backoffMs:
        typeof args.backoffMs === "number" && Number.isFinite(args.backoffMs)
          ? args.backoffMs
          : undefined,
      stepStateSnapshot: normalizeStepState(args.stepState),
      updatedAt: now,
      completedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      organizationId: run.organizationId,
      action: `samantha.post_capture_dispatch.attempt.${args.attemptOutcome}`,
      resource: "onboardingPostCaptureDispatchRuns",
      resourceId: String(args.runId),
      metadata: {
        attemptId: args.attemptId,
        attemptNumber: attempt.attemptNumber,
        reasonCode: normalizedReasonCode,
        error: normalizedError,
        nextRetryAt: runPatch.nextRetryAt,
      },
      success: args.attemptOutcome === "succeeded",
      errorMessage: args.attemptOutcome === "succeeded" ? undefined : normalizedError,
      createdAt: now,
    });

    return { success: true as const, status: runPatch.status as SamanthaPostCaptureDispatchRunStatus };
  },
});

export const moveRunToDeadLetter = internalMutation({
  args: {
    runId: v.id("onboardingPostCaptureDispatchRuns"),
    reasonCode: v.string(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) {
      return { success: false as const, reason: "run_not_found" as const };
    }

    if (run.deadLetterId) {
      return {
        success: true as const,
        deadLetterId: run.deadLetterId,
      };
    }

    const now = nowMs();
    const deadLetterId = await ctx.db.insert("onboardingPostCaptureDispatchDeadLetters", {
      runId: args.runId,
      organizationId: run.organizationId,
      dispatchKey: run.dispatchKey,
      status: "open",
      reasonCode: args.reasonCode,
      error: normalizeOptionalString(args.error),
      payloadSnapshotRef: normalizeOptionalString(run.payloadSnapshotRef),
      payloadSnapshot: run.payloadSnapshot,
      stepStateSnapshot: normalizeStepState(run.stepState),
      latestAttemptNumber:
        typeof run.attemptCount === "number" && Number.isFinite(run.attemptCount)
          ? Math.max(0, Math.floor(run.attemptCount))
          : 0,
      replayCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.runId, {
      status: "dead_lettered",
      deadLetterId,
      reasonCode: parseReasonCode(args.reasonCode),
      error: normalizeOptionalString(args.error),
      updatedAt: now,
      completedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      organizationId: run.organizationId,
      action: "samantha.post_capture_dispatch.dead_lettered",
      resource: "onboardingPostCaptureDispatchRuns",
      resourceId: String(args.runId),
      metadata: {
        deadLetterId,
        reasonCode: args.reasonCode,
      },
      success: false,
      errorMessage: normalizeOptionalString(args.error),
      createdAt: now,
    });

    return {
      success: true as const,
      deadLetterId,
    };
  },
});

export const requestDeadLetterReplay = internalMutation({
  args: {
    runId: v.id("onboardingPostCaptureDispatchRuns"),
    triageNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) {
      return {
        success: false as const,
        reason: "run_not_found" as const,
      };
    }
    if (normalizeRunStatus(run.status) !== "dead_lettered" || !run.deadLetterId) {
      return {
        success: false as const,
        reason: "run_not_dead_lettered" as const,
      };
    }

    const deadLetter = await ctx.db.get(run.deadLetterId);
    if (!deadLetter) {
      return {
        success: false as const,
        reason: "dead_letter_not_found" as const,
      };
    }

    const now = nowMs();
    const stepState = normalizeStepState(run.stepState).map((step) => {
      if (step.status === "succeeded" || step.status === "skipped_policy") {
        return step;
      }
      return {
        ...step,
        status: "pending" as const,
        completedAt: undefined,
        lastReasonCode: undefined,
        lastError: undefined,
      };
    });

    await ctx.db.patch(args.runId, {
      status: "replay_requested",
      stepState,
      reasonCode: undefined,
      error: undefined,
      attemptCount: 0,
      nextRetryAt: now,
      leaseOwner: undefined,
      leaseToken: undefined,
      leaseExpiresAt: undefined,
      updatedAt: now,
      completedAt: undefined,
    });

    await ctx.db.patch(run.deadLetterId, {
      status: "replay_queued",
      replayCount:
        typeof deadLetter.replayCount === "number" && Number.isFinite(deadLetter.replayCount)
          ? deadLetter.replayCount + 1
          : 1,
      lastReplayedAt: now,
      triageNotes:
        normalizeOptionalString(args.triageNotes) || normalizeOptionalString(deadLetter.triageNotes),
      updatedAt: now,
      resolvedAt: undefined,
    });

    await ctx.db.insert("auditLogs", {
      organizationId: run.organizationId,
      action: "samantha.post_capture_dispatch.replay_requested",
      resource: "onboardingPostCaptureDispatchRuns",
      resourceId: String(args.runId),
      metadata: {
        deadLetterId: run.deadLetterId,
        triageNotes: normalizeOptionalString(args.triageNotes),
      },
      success: true,
      createdAt: now,
    });

    return {
      success: true as const,
      runId: args.runId,
    };
  },
});

export const updateDeadLetterStatus = internalMutation({
  args: {
    deadLetterId: v.id("onboardingPostCaptureDispatchDeadLetters"),
    status: v.union(
      v.literal("open"),
      v.literal("triaging"),
      v.literal("replay_queued"),
      v.literal("replayed"),
      v.literal("resolved")
    ),
    triageNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const deadLetter = await ctx.db.get(args.deadLetterId);
    if (!deadLetter) {
      return { success: false as const, reason: "dead_letter_not_found" as const };
    }

    const now = nowMs();
    await ctx.db.patch(args.deadLetterId, {
      status: args.status,
      triageNotes: normalizeOptionalString(args.triageNotes) || normalizeOptionalString(deadLetter.triageNotes),
      updatedAt: now,
      resolvedAt: args.status === "resolved" ? now : undefined,
    });

    await ctx.db.insert("auditLogs", {
      organizationId: deadLetter.organizationId,
      action: "samantha.post_capture_dispatch.dead_letter_status_updated",
      resource: "onboardingPostCaptureDispatchDeadLetters",
      resourceId: String(args.deadLetterId),
      metadata: {
        status: args.status,
        triageNotes: normalizeOptionalString(args.triageNotes),
      },
      success: args.status === "resolved",
      createdAt: now,
    });

    return { success: true as const };
  },
});

export const listDeadLettersForTriage = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("triaging"),
        v.literal("replay_queued"),
        v.literal("replayed"),
        v.literal("resolved")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit =
      typeof args.limit === "number" && Number.isFinite(args.limit)
        ? Math.max(1, Math.min(200, Math.floor(args.limit)))
        : 50;

    let rows: DispatchDeadLetterDoc[];
    const status = args.status;
    if (status) {
      rows = await ctx.db
        .query("onboardingPostCaptureDispatchDeadLetters")
        .withIndex("by_org_status_updated", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .take(limit);
    } else {
      rows = await ctx.db
        .query("onboardingPostCaptureDispatchDeadLetters")
        .withIndex("by_org_status_updated", (q) => q.eq("organizationId", args.organizationId))
        .take(limit);
    }

    return rows.map((row) => ({
      deadLetterId: row._id,
      runId: row.runId,
      organizationId: row.organizationId,
      dispatchKey: row.dispatchKey,
      status: row.status,
      reasonCode: row.reasonCode,
      error: row.error,
      latestAttemptNumber: row.latestAttemptNumber,
      replayCount: row.replayCount,
      lastReplayedAt: row.lastReplayedAt,
      triageNotes: row.triageNotes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      resolvedAt: row.resolvedAt,
    }));
  },
});

async function executeDispatchAttempt(ctx: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runQuery: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runAction: any;
}, args: {
  run: DispatchRunDoc;
}): Promise<{
  attemptOutcome: DispatchAttemptOutcome;
  stepState: SamanthaPostCaptureDispatchStepState[];
  outputs: SamanthaPostCaptureDispatchResult["outputs"];
  reasonCode?: SamanthaPostCaptureDispatchReasonCode;
  error?: string;
}> {
  const input = normalizeDispatchInput(args.run.payloadSnapshot);
  const stepState = normalizeStepState(args.run.stepState);
  const outputs = parseRunOutputs(args.run.outputs);

  if (!input) {
    return {
      attemptOutcome: "failed_terminal",
      stepState,
      outputs,
      reasonCode: "dispatch_input_invalid",
      error: "Dispatch payload snapshot does not match input contract",
    };
  }

  if (String(input.organizationId) !== String(args.run.organizationId)) {
    return {
      attemptOutcome: "failed_terminal",
      stepState,
      outputs,
      reasonCode: "dispatch_org_scope_mismatch",
      error: "Dispatch payload organization does not match run organization",
    };
  }

  const runAttemptStep = async (stepKey: SamanthaPostCaptureDispatchStepKey) => {
    const state = getStepState(stepState, stepKey);
    if (state.status === "succeeded" || state.status === "skipped_policy") {
      return {
        done: true,
        failed: false,
      };
    }

    state.status = "in_progress";
    state.attemptCount = Math.max(0, state.attemptCount) + 1;
    state.lastAttemptAt = nowMs();

    let result: StepExecutionResult;
    if (stepKey === "lead_email_send") {
      result = await executeLeadEmailStep(ctx, input);
    } else if (stepKey === "sales_notification_send") {
      result = await executeSalesEmailStep(ctx, input);
    } else if (stepKey === "founder_call_orchestration") {
      result = await executeFounderCallStep(ctx, input);
    } else {
      result = await executeSlackHotLeadStep(ctx, {
        input,
        dispatchKey: args.run.dispatchKey,
      });
    }

    if (result.output) {
      Object.assign(outputs, result.output);
    }

    if (result.status === "succeeded" || result.status === "skipped_policy") {
      state.status = result.status;
      state.completedAt = nowMs();
      state.lastReasonCode = result.reasonCode;
      state.lastError = result.error;
      state.outputRef = result.outputRef;
      state.externalSideEffectId = result.externalSideEffectId;
      return {
        done: true,
        failed: false,
      };
    }

    state.status = result.retryable ? "failed_retryable" : "failed_terminal";
    state.completedAt = nowMs();
    state.lastReasonCode = result.reasonCode;
    state.lastError = result.error;
    state.outputRef = result.outputRef;
    state.externalSideEffectId = result.externalSideEffectId;

    return {
      done: true,
      failed: true,
      reasonCode: result.reasonCode,
      error: result.error,
      retryable: result.retryable === true,
    };
  };

  for (const stepKey of SAMANTHA_POST_CAPTURE_DISPATCH_STEP_KEYS) {
    const stepOutcome = await runAttemptStep(stepKey);
    if (stepOutcome.failed) {
      return {
        attemptOutcome: stepOutcome.retryable ? "failed_retryable" : "failed_terminal",
        stepState,
        outputs,
        reasonCode: stepOutcome.reasonCode || "dispatch_unexpected_error",
        error: stepOutcome.error || "Unknown dispatcher step failure",
      };
    }
  }

  return {
    attemptOutcome: "succeeded",
    stepState,
    outputs,
  };
}

export const processDispatchRun = internalAction({
  args: {
    runId: v.id("onboardingPostCaptureDispatchRuns"),
    trigger: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = (await (ctx.runQuery as Function)(getInternal().ai.postCaptureDispatcher.getDispatchRunById, {
      runId: args.runId,
    })) as DispatchRunDoc | null;

    if (!run) {
      return {
        success: false,
        reasonCode: "dispatch_input_invalid",
        error: "Dispatch run not found",
      };
    }

    const currentStatus = normalizeRunStatus(run.status);
    if (currentStatus === "succeeded" || currentStatus === "dead_lettered") {
      return {
        success: true,
        result: buildDispatchResult({ run, replayed: false }),
      };
    }

    const leaseOwner = `samantha_post_capture_dispatcher:${normalizeOptionalString(args.trigger) || "worker"}`;
    const leaseResult = (await (ctx.runMutation as Function)(
      getInternal().ai.postCaptureDispatcher.acquireDispatchLease,
      {
        runId: args.runId,
        leaseOwner,
        leaseDurationMs: DEFAULT_LEASE_DURATION_MS,
      }
    )) as
      | {
          success: true;
          attemptId: Id<"onboardingPostCaptureDispatchAttempts">;
          attemptNumber: number;
          leaseToken: string;
          leaseExpiresAt: number;
        }
      | { success: false; reason: string };

    if (!leaseResult.success) {
      const latest = (await (ctx.runQuery as Function)(
        getInternal().ai.postCaptureDispatcher.getDispatchRunById,
        {
          runId: args.runId,
        }
      )) as DispatchRunDoc | null;
      if (!latest) {
        return {
          success: false,
          reasonCode: "dispatch_input_invalid",
          error: "Dispatch run not found after lease conflict",
        };
      }
      return {
        success: false,
        reasonCode: "dispatch_lease_conflict",
        error: leaseResult.reason,
        result: buildDispatchResult({ run: latest, replayed: false }),
      };
    }

    const refreshedRun = (await (ctx.runQuery as Function)(
      getInternal().ai.postCaptureDispatcher.getDispatchRunById,
      {
        runId: args.runId,
      }
    )) as DispatchRunDoc | null;

    if (!refreshedRun) {
      return {
        success: false,
        reasonCode: "dispatch_input_invalid",
        error: "Dispatch run disappeared before attempt execution",
      };
    }

    const attemptExecution = await executeDispatchAttempt(
      {
        runQuery: ctx.runQuery,
        runAction: ctx.runAction,
      },
      {
        run: refreshedRun,
      }
    );

    const maxAttempts =
      typeof refreshedRun.maxAttempts === "number" && Number.isFinite(refreshedRun.maxAttempts)
        ? Math.max(1, Math.floor(refreshedRun.maxAttempts))
        : DEFAULT_MAX_ATTEMPTS;

    let commitOutcome: DispatchAttemptOutcome = attemptExecution.attemptOutcome;
    let nextRetryAt: number | undefined;
    let backoffMs: number | undefined;

    if (
      attemptExecution.attemptOutcome === "failed_retryable" &&
      shouldScheduleRetry({
        attemptCount: leaseResult.attemptNumber,
        maxAttempts,
        reasonCode: attemptExecution.reasonCode || "dispatch_unexpected_error",
      })
    ) {
      backoffMs = Math.max(
        MIN_RETRY_DELAY_MS,
        resolveSamanthaPostCaptureBackoffMs({
          attemptNumber: leaseResult.attemptNumber,
          baseDelayMs: MIN_RETRY_DELAY_MS,
          maxDelayMs: MAX_RETRY_DELAY_MS,
        })
      );
      nextRetryAt = nowMs() + backoffMs;
      commitOutcome = "failed_retryable";
    } else if (attemptExecution.attemptOutcome !== "succeeded") {
      commitOutcome = "failed_terminal";
    }

    await (ctx.runMutation as Function)(
      getInternal().ai.postCaptureDispatcher.commitDispatchAttemptOutcome,
      {
        runId: args.runId,
        attemptId: leaseResult.attemptId,
        leaseToken: leaseResult.leaseToken,
        attemptOutcome: commitOutcome,
        stepState: attemptExecution.stepState,
        outputs: attemptExecution.outputs,
        reasonCode: attemptExecution.reasonCode,
        error: attemptExecution.error,
        nextRetryAt,
        backoffMs,
      }
    );

    if (commitOutcome === "failed_retryable" && typeof backoffMs === "number") {
      await (ctx.scheduler as any).runAfter(
        backoffMs,
        getInternal().ai.postCaptureDispatcher.processDispatchRun,
        {
          runId: args.runId,
          trigger: "scheduled_retry",
        }
      );
    }

    if (commitOutcome === "failed_terminal") {
      await (ctx.runMutation as Function)(
        getInternal().ai.postCaptureDispatcher.moveRunToDeadLetter,
        {
          runId: args.runId,
          reasonCode: attemptExecution.reasonCode || "dispatch_retry_exhausted",
          error: attemptExecution.error,
        }
      );
    }

    const latestRun = (await (ctx.runQuery as Function)(
      getInternal().ai.postCaptureDispatcher.getDispatchRunById,
      {
        runId: args.runId,
      }
    )) as DispatchRunDoc | null;

    if (!latestRun) {
      return {
        success: false,
        reasonCode: "dispatch_input_invalid",
        error: "Dispatch run not found after attempt commit",
      };
    }

    return {
      success: latestRun.status === "succeeded",
      result: buildDispatchResult({ run: latestRun, replayed: false }),
    };
  },
});

export const dispatchSamanthaPostCapture = internalAction({
  args: {
    input: v.any(),
    processInline: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<SamanthaPostCaptureDispatchResult> => {
    const input = normalizeDispatchInput(args.input);
    if (!input) {
      return {
        contractVersion: SAMANTHA_POST_CAPTURE_DISPATCH_RESULT_VERSION,
        runId: "",
        organizationId: ("org_invalid" as unknown) as Id<"organizations">,
        idempotencyKey: "",
        correlationId: "",
        status: "failed_terminal",
        replayed: false,
        reasonCode: "dispatch_input_invalid",
        error: "Dispatcher input failed contract validation",
        attemptCount: 0,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        stepStates: buildDefaultStepState(),
        outputs: {},
      };
    }

    const createResult = (await (ctx.runMutation as Function)(
      getInternal().ai.postCaptureDispatcher.createDispatchRun,
      {
        input,
      }
    )) as
      | {
          success: true;
          created: boolean;
          runId: Id<"onboardingPostCaptureDispatchRuns">;
        }
      | {
          success: false;
          reasonCode: SamanthaPostCaptureDispatchReasonCode;
        };

    if (!createResult.success) {
      return {
        contractVersion: SAMANTHA_POST_CAPTURE_DISPATCH_RESULT_VERSION,
        runId: "",
        organizationId: input.organizationId,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
        status: "failed_terminal",
        replayed: false,
        reasonCode: createResult.reasonCode,
        error: "Unable to create dispatcher run",
        attemptCount: 0,
        maxAttempts: input.maxAttempts || DEFAULT_MAX_ATTEMPTS,
        stepStates: buildDefaultStepState(),
        outputs: {},
      };
    }

    const runId = createResult.runId;

    const shouldProcessInline = args.processInline !== false;
    if (shouldProcessInline) {
      try {
        await (ctx.runAction as Function)(getInternal().ai.postCaptureDispatcher.processDispatchRun, {
          runId,
          trigger: createResult.created ? "inline_new_run" : "inline_replay_lookup",
        });
      } catch (error) {
        await (ctx.scheduler as any).runAfter(
          0,
          getInternal().ai.postCaptureDispatcher.processDispatchRun,
          {
            runId,
            trigger: "inline_error_fallback",
          }
        );
        console.error("[postCaptureDispatcher] inline processing failed, scheduled fallback:", error);
      }
    } else {
      await (ctx.scheduler as any).runAfter(
        0,
        getInternal().ai.postCaptureDispatcher.processDispatchRun,
        {
          runId,
          trigger: "queued_only",
        }
      );
    }

    const run = (await (ctx.runQuery as Function)(
      getInternal().ai.postCaptureDispatcher.getDispatchRunById,
      {
        runId,
      }
    )) as DispatchRunDoc | null;

    if (!run) {
      return {
        contractVersion: SAMANTHA_POST_CAPTURE_DISPATCH_RESULT_VERSION,
        runId: String(runId),
        organizationId: input.organizationId,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
        status: "failed_terminal",
        replayed: false,
        reasonCode: "dispatch_unexpected_error",
        error: "Dispatch run not found after enqueue",
        attemptCount: 0,
        maxAttempts: input.maxAttempts || DEFAULT_MAX_ATTEMPTS,
        stepStates: buildDefaultStepState(),
        outputs: {},
      };
    }

    return buildDispatchResult({
      run,
      replayed: createResult.created === false,
    });
  },
});

export const replayDeadLetterDispatch = internalAction({
  args: {
    runId: v.id("onboardingPostCaptureDispatchRuns"),
    triageNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const replayRequest = (await (ctx.runMutation as Function)(
      getInternal().ai.postCaptureDispatcher.requestDeadLetterReplay,
      {
        runId: args.runId,
        triageNotes: args.triageNotes,
      }
    )) as
      | { success: true; runId: Id<"onboardingPostCaptureDispatchRuns"> }
      | { success: false; reason: string };

    if (!replayRequest.success) {
      return {
        success: false,
        reason: replayRequest.reason,
      };
    }

    await (ctx.scheduler as any).runAfter(
      0,
      getInternal().ai.postCaptureDispatcher.processDispatchRun,
      {
        runId: args.runId,
        trigger: "dead_letter_replay",
      }
    );

    return {
      success: true,
      runId: args.runId,
    };
  },
});

export const getDispatchRunResult = internalQuery({
  args: {
    runId: v.id("onboardingPostCaptureDispatchRuns"),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) {
      return null;
    }
    return buildDispatchResult({
      run,
      replayed: false,
    });
  },
});

export const getDeadLetterStatusOptions = internalQuery({
  args: {},
  handler: async () => {
    return [...SAMANTHA_POST_CAPTURE_DEAD_LETTER_STATUS_VALUES] as SamanthaPostCaptureDeadLetterStatus[];
  },
});

export const __test = {
  resolveSlackRoutingIdentityFromActiveConnections,
  shouldScheduleRetry,
};
