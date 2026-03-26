import {
  SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
  resolveAgentRuntimeModuleMetadataFromConfig,
} from "../../agentSpecRegistry";
import type { AgentToolResult } from "../../agentToolOrchestration";
import type { SessionContactMemoryRecord } from "../../memoryComposer";
import {
  AUDIT_DELIVERABLE_OUTCOME_KEY,
  AUDIT_DELIVERABLE_TOOL_NAME,
  type SamanthaAuditAutoDispatchPlan,
  type SamanthaAuditAutoDispatchToolArgs,
  type SamanthaAuditDispatchDecision,
  type SamanthaAuditRequiredField,
  type SamanthaAuditRoutingAuditChannel,
  type SamanthaAuditSourceContext,
  type SamanthaAutoDispatchInvocationStatus,
  type SamanthaClaimRecoveryDecision,
} from "../../samanthaAuditContract";
import {
  buildSamanthaAuditDeliverableGracefulDegradationMessage,
  countTrailingSamanthaFailClosedAssistantMessages,
  countTrailingSamanthaMissingFieldRecoveryMessages,
  sanitizeSamanthaEmailOnlyAssistantContent,
} from "./prompt";
import {
  isSamanthaLeadCaptureRuntime,
  resolveSamanthaAuditSourceContext,
  resolveSamanthaAuditLookupTarget,
} from "./policy";
import {
  isLikelyAuditDeliverableInvocationRequest,
  resolveSamanthaAuditAutoDispatchPlan,
  resolveSamanthaAuditDispatchDecision,
  resolveSamanthaAuditLeadData,
  resolveSamanthaAutoDispatchInvocationStatus,
  resolveSamanthaClaimRecoveryDecision,
  resolveSamanthaDispatchTerminalReasonCode,
} from "./tools";
import type {
  SamanthaRuntimeDispatchTraceEvent,
  SamanthaRuntimeRouterSelectionStage,
  SamanthaRuntimeRoutingAgentSnapshot,
} from "./trace";

export const SAMANTHA_RUNTIME_CONTRACT_VERSION =
  "aoh_samantha_runtime_contract_v1" as const;

export interface SamanthaRuntimeContract {
  contractVersion: typeof SAMANTHA_RUNTIME_CONTRACT_VERSION;
  moduleKey: typeof SAMANTHA_AGENT_RUNTIME_MODULE_KEY;
  toolManifest: {
    requiredTools: string[];
    optionalTools: string[];
    deniedTools: string[];
  };
}

export interface SamanthaCapabilityGapFallbackEmailDelivery {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  messageId?: string;
}

export interface SamanthaCapabilityGapFallbackDelivery {
  leadEmailDelivery?: SamanthaCapabilityGapFallbackEmailDelivery;
  salesEmailDelivery?: SamanthaCapabilityGapFallbackEmailDelivery;
}

export interface SamanthaCapabilityGapLinearIssue {
  issueId: string;
  issueNumber: string;
  issueUrl: string;
}

export interface SamanthaClaimToolUnavailableIncidentResult {
  success?: boolean;
  emitted?: boolean;
  deduped?: boolean;
  threadDeepLink?: string;
}

export type SamanthaCapabilityGapLookupTarget =
  | {
      ok: true;
      channel: SamanthaAuditRoutingAuditChannel;
      sessionToken: string;
    }
  | {
      ok: false;
    };

function normalizeSamanthaRuntimeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function extractSamanthaRuntimeFirstEmailAddress(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const matched = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (!matched || matched.length === 0) {
    return undefined;
  }
  return normalizeSamanthaRuntimeString(matched[0])?.toLowerCase();
}

interface SamanthaAutoDispatchRuntimeDispatchEvent {
  stage: string;
  status: "pass" | "skip" | "fail";
  reasonCode: string;
  detail?: Record<string, unknown>;
}

interface SamanthaAutoDispatchRuntimeAuditSession {
  capturedEmail?: string;
  capturedName?: string;
  workflowRecommendation?: string;
}

export interface SamanthaRuntimeDispatchRouteSelectors {
  channel?: string;
  providerId?: string;
  account?: string;
  team?: string;
  peer?: string;
  channelRef?: string;
}

export interface SamanthaPostDispatchTelemetryFinalizationArgs {
  inboundMessage: string;
  actionCompletionClaimedOutcomes: string[];
  runtimeCapabilityGapBlocked: boolean;
  preflightAuditLookupTarget: ReturnType<typeof resolveSamanthaAuditLookupTarget>;
  preflightAuditSessionFound: boolean | undefined;
  authorityAgentRoutingSnapshot: SamanthaRuntimeRoutingAgentSnapshot;
  speakerAgentRoutingSnapshot: SamanthaRuntimeRoutingAgentSnapshot;
  inboundDispatchRouteSelectors: SamanthaRuntimeDispatchRouteSelectors;
  samanthaDispatchRouterSelectionPath: SamanthaRuntimeRouterSelectionStage[];
  samanthaDispatchTraceCorrelationId?: string | null;
  samanthaDispatchTraceEvents: SamanthaRuntimeDispatchTraceEvent[];
  samanthaAuditAutoDispatchPlan: SamanthaAuditAutoDispatchPlan | null;
  samanthaAuditAutoDispatchAttempted: boolean;
  samanthaAuditAutoDispatchExecuted: boolean;
  samanthaAuditRecoveryAttempted: boolean;
  samanthaAuditAutoDispatchToolResults: AgentToolResult[];
  samanthaAuditDispatchDecision: SamanthaAuditDispatchDecision | undefined;
  samanthaAutoDispatchInvocationStatus: SamanthaAutoDispatchInvocationStatus;
  samanthaClaimRecoveryDecision: SamanthaClaimRecoveryDecision;
  samanthaDispatchTerminalReasonCode: string;
  recordSamanthaDispatchEvent: (event: SamanthaAutoDispatchRuntimeDispatchEvent) => void;
}

export interface SamanthaPostDispatchTelemetryFinalizationResult {
  samanthaDispatchIntentObserved: boolean;
  shouldEmitSamanthaAutoDispatchTelemetry: boolean;
  samanthaPlanForTelemetry: SamanthaAuditAutoDispatchPlan;
  samanthaAutoDispatchInvocationStatus: SamanthaAutoDispatchInvocationStatus;
  samanthaDispatchTerminalReasonCode: string;
  samanthaAutoDispatchTelemetry: {
    traceContractVersion: "samantha_dispatch_trace_v1";
    correlationId: string | null;
    terminalReasonCode: string;
    invocationStatus: SamanthaAutoDispatchInvocationStatus;
    preflightLookupTarget: {
      ok: boolean;
      errorCode: string | null;
    };
    preflightAuditSessionFound: boolean | null;
    router: {
      selectedAuthorityAgent: SamanthaRuntimeRoutingAgentSnapshot;
      selectedSpeakerAgent: SamanthaRuntimeRoutingAgentSnapshot;
      routeSelectors: SamanthaRuntimeDispatchRouteSelectors;
      selectionPath: SamanthaRuntimeRouterSelectionStage[];
    };
    eligible: boolean;
    requestDetected: boolean;
    toolAvailable: boolean;
    alreadyAttempted: boolean;
    preexistingInvocationStatus: SamanthaAutoDispatchInvocationStatus;
    retryEligibleAfterFailure: boolean;
    skipReasonCodes: SamanthaAuditAutoDispatchPlan["skipReasonCodes"];
    attempted: boolean;
    executed: boolean;
    recoveryAttempted: boolean;
    recoveryDecisionReasonCode: string;
    missingRequiredFields: SamanthaAuditRequiredField[];
    toolStatuses: AgentToolResult["status"][];
    dispatchDecision: SamanthaAuditDispatchDecision | undefined;
    traceEvents: SamanthaRuntimeDispatchTraceEvent[];
  } | undefined;
}

export interface SamanthaAutoDispatchRuntimeEnforcementPayloadLike {
  reasonCode?: string;
  preflightReasonCode?: string;
  preflightMissingRequiredFields?: SamanthaAuditRequiredField[];
  outcome?: string;
  requiredTools: string[];
  availableTools: string[];
  enforcementMode: string;
}

export interface SamanthaAutoDispatchRuntimeEnforcementDecision<
  Payload extends SamanthaAutoDispatchRuntimeEnforcementPayloadLike,
> {
  enforced: boolean;
  assistantContent?: string;
  payload: Payload;
}

export interface SamanthaAutoDispatchRuntimeFlowArgs<
  Payload extends SamanthaAutoDispatchRuntimeEnforcementPayloadLike,
> {
  runtimeCapabilityGapBlocked: boolean;
  organizationId: string;
  authorityAgentId: string;
  sessionId: string;
  turnId: string;
  authorityConfig: Record<string, unknown> | null | undefined;
  inboundMessage: string;
  assistantContent: string;
  actionCompletionRawAssistantContent: string;
  actionCompletionResponseLanguage: "en" | "de";
  toolCalls: Array<{ function?: { name?: unknown } }>;
  availableToolNames: string[];
  toolResults: AgentToolResult[];
  sessionHistorySnapshot: Array<{ role: string; content: string }>;
  contactMemory?: SessionContactMemoryRecord[];
  samanthaAuditSourceContext: SamanthaAuditSourceContext;
  samanthaDispatchTraceCorrelationId?: string | null;
  errorStateDirty: boolean;
  recordSamanthaDispatchEvent: (event: SamanthaAutoDispatchRuntimeDispatchEvent) => void;
  resolveAuditSessionForDeliverableInternal: (args: {
    organizationId: string;
    channel: SamanthaAuditRoutingAuditChannel;
    sessionToken: string;
  }) => Promise<SamanthaAutoDispatchRuntimeAuditSession | null>;
  ensureAuditModeSessionForDeliverable: (args: {
    organizationId: string;
    agentId: string;
    channel: SamanthaAuditRoutingAuditChannel;
    sessionToken: string;
    workflowRecommendation?: string;
    capturedEmail?: string;
    capturedName?: string;
    metadata: {
      source: string;
      bootstrapReason: string;
      correlationId: string | null;
    };
  }) => Promise<void>;
  executeAutoDispatchToolCall: (args: {
    toolArgs: SamanthaAuditAutoDispatchToolArgs;
  }) => Promise<{
    toolResults: AgentToolResult[];
    errorStateDirty: boolean;
  }>;
  resolveAuditDeliverableInvocationGuardrail: (args: {
    authorityConfig: Record<string, unknown> | null | undefined;
    inboundMessage: string;
    assistantContent: string;
    toolResults: AgentToolResult[];
    availableToolNames: string[];
    recentUserMessages?: string[];
    capturedEmail?: string | null;
    capturedName?: string | null;
    contactMemory?: SessionContactMemoryRecord[];
    auditSessionWorkflowRecommendation?: string | null;
    recoveryAttemptCount?: number;
    turnId?: string;
  }) => SamanthaAutoDispatchRuntimeEnforcementDecision<Payload>;
  resolveActionCompletionResponseLanguage: (args: {
    authorityConfig: Record<string, unknown> | null | undefined;
    inboundMessage?: string | null;
    assistantContent?: string | null;
  }) => "en" | "de";
  extractActionCompletionClaimsFromAssistantContent: (content: string) => {
    sanitizedContent: string;
  };
  onError?: (message: string, meta: Record<string, unknown>) => void;
  onWarn?: (message: string, meta: Record<string, unknown>) => void;
}

export interface SamanthaAutoDispatchRuntimeFlowResult<
  Payload extends SamanthaAutoDispatchRuntimeEnforcementPayloadLike,
> {
  assistantContent: string;
  errorStateDirty: boolean;
  preflightAuditLookupTarget: ReturnType<typeof resolveSamanthaAuditLookupTarget>;
  preflightAuditSession: SamanthaAutoDispatchRuntimeAuditSession | null;
  preflightAuditSessionFound: boolean | undefined;
  recentUserMessagesForPreflight: string[];
  actionCompletionEnforcement:
    | SamanthaAutoDispatchRuntimeEnforcementDecision<Payload>
    | null;
  actionCompletionEnforcementPayload: Payload | null;
  actionCompletionRewriteApplied: boolean;
  samanthaAuditAutoDispatchPlan: SamanthaAuditAutoDispatchPlan | null;
  samanthaAuditAutoDispatchAttempted: boolean;
  samanthaAuditAutoDispatchExecuted: boolean;
  samanthaAuditRecoveryAttempted: boolean;
  samanthaAuditAutoDispatchToolResults: AgentToolResult[];
  samanthaAuditDispatchDecision: SamanthaAuditDispatchDecision | undefined;
  samanthaAutoDispatchInvocationStatus: SamanthaAutoDispatchInvocationStatus;
  samanthaClaimRecoveryDecision: SamanthaClaimRecoveryDecision;
  samanthaDispatchTerminalReasonCode: string;
}

export interface SamanthaSourceContextRuntimeInitializationArgs {
  ingressChannel: string;
  externalContactIdentifier: string;
  metadata: Record<string, unknown>;
  recordSamanthaDispatchEvent: (event: SamanthaAutoDispatchRuntimeDispatchEvent) => void;
}

export interface SamanthaSourceContextRuntimeInitializationResult {
  samanthaAuditSourceContext: SamanthaAuditSourceContext;
}

export interface SamanthaPostOutputGuardrailsArgs {
  assistantContent: string;
  toolResults: AgentToolResult[];
  actionCompletionResponseLanguage: "en" | "de";
  authorityConfig: Record<string, unknown> | null | undefined;
  resolveActionCompletionSanitizationFallbackMessage: () => string;
  recordSamanthaDispatchEvent: (event: SamanthaAutoDispatchRuntimeDispatchEvent) => void;
}

export interface SamanthaPostOutputGuardrailsResult {
  assistantContent: string;
  actionCompletionSanitizationFallbackApplied: boolean;
}

export interface SamanthaCapabilityGapUnavailableHandlingArgs<
  Payload extends SamanthaAutoDispatchRuntimeEnforcementPayloadLike,
  LinearIssue extends SamanthaCapabilityGapLinearIssue,
> {
  organizationId: string;
  organizationName: string;
  sessionId: string;
  turnId: string;
  inboundMessage: string;
  assistantContent: string;
  actionCompletionTicketRequestIntent: boolean;
  actionCompletionResponseLanguage: "en" | "de";
  actionCompletionEnforcement:
    | SamanthaAutoDispatchRuntimeEnforcementDecision<Payload>
    | null;
  actionCompletionEnforcementPayload: Payload | null;
  actionCompletionLinearIssue: LinearIssue | null;
  samanthaCapabilityGapFallbackDelivery: SamanthaCapabilityGapFallbackDelivery | null;
  recentUserMessagesForPreflight: string[];
  preflightAuditSession?: {
    capturedEmail?: string;
    capturedName?: string;
  } | null;
  preflightAuditLookupTarget: SamanthaCapabilityGapLookupTarget;
  sourceAuditContext?: unknown;
  runtimeIncident: {
    proposalKey: string;
    manifestHash?: string;
    idempotencyKey: string;
    idempotencyScopeKey: string;
    payloadHash: string;
  };
  formatCapabilityGapLinearIssueLine: (args: {
    language: "en" | "de";
    linearIssue: LinearIssue;
  }) => string;
  createFeatureRequestIssue: (args: {
    userName: string;
    userEmail: string;
    organizationName: string;
    toolName: string;
    featureDescription: string;
    userMessage: string;
    userElaboration?: string;
    category:
      | "samantha_audit_deliverable_capability_gap"
      | "action_completion_capability_gap";
    conversationId: string;
    occurredAt: number;
  }) => Promise<LinearIssue>;
  notifyRuntimeIncident: (args: {
    incidentType: "claim_tool_unavailable";
    organizationId: string;
    sessionId: string;
    turnId: string;
    proposalKey: string;
    manifestHash?: string;
    tool: string;
    reasonCode: string;
    reason: string;
    idempotencyKey: string;
    idempotencyScopeKey: string;
    payloadHash: string;
    admissionReasonCode: string;
    linearIssueId?: string;
    linearIssueUrl?: string;
    metadata?: unknown;
  }) => Promise<SamanthaClaimToolUnavailableIncidentResult | null>;
  scheduleRuntimeIncidentAlert: (args: {
    incidentType: "claim_tool_unavailable";
    proposalKey: string;
    tool: string;
    reasonCode: string;
    reason: string;
    linearIssueId?: string;
    linearIssueUrl?: string;
    metadata?: unknown;
  }) => Promise<void>;
  buildRuntimeIncidentThreadDeepLink: (args: {
    sessionId: string;
    proposalKey: string;
  }) => string;
  resolveAuditSessionForLookupTarget: (args: {
    channel: SamanthaAuditRoutingAuditChannel;
    sessionToken: string;
  }) => Promise<{ capturedEmail?: string; capturedName?: string } | null>;
  resolveDomainConfigIdForOrg: () => Promise<string | undefined>;
  sendEmail: (args: {
    domainConfigId: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  }) => Promise<{ success?: boolean; messageId?: string; error?: string } | null>;
  onError?: (message: string, meta: Record<string, unknown>) => void;
}

export interface SamanthaCapabilityGapUnavailableHandlingResult<
  LinearIssue extends SamanthaCapabilityGapLinearIssue,
> {
  assistantContent: string;
  actionCompletionLinearIssue: LinearIssue | null;
  samanthaCapabilityGapFallbackDelivery: SamanthaCapabilityGapFallbackDelivery | null;
}

function normalizeSamanthaRuntimeDeterministicToolNames(toolNames: string[]): string[] {
  return Array.from(
    new Set(
      toolNames
        .map((toolName) => normalizeSamanthaRuntimeString(toolName))
        .filter((toolName): toolName is string => Boolean(toolName)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function isSamanthaAuditDeliverableOutcomeLike(args: {
  outcome?: string;
  requiredTools: string[];
}): boolean {
  return (
    args.outcome === AUDIT_DELIVERABLE_OUTCOME_KEY
    && args.requiredTools.includes(AUDIT_DELIVERABLE_TOOL_NAME)
  );
}

export function executeSamanthaSourceContextRuntimeInitialization(
  args: SamanthaSourceContextRuntimeInitializationArgs,
): SamanthaSourceContextRuntimeInitializationResult {
  const samanthaAuditSourceContext = resolveSamanthaAuditSourceContext({
    ingressChannel: args.ingressChannel,
    externalContactIdentifier: args.externalContactIdentifier,
    metadata: args.metadata,
  });
  args.recordSamanthaDispatchEvent({
    stage: "samantha_source_context",
    status: "pass",
    reasonCode: "source_context_resolved",
    detail: {
      ingressChannel: samanthaAuditSourceContext.ingressChannel,
      sourceAuditChannel: samanthaAuditSourceContext.sourceAuditChannel || null,
      hasSourceSessionToken: Boolean(
        normalizeSamanthaRuntimeString(samanthaAuditSourceContext.sourceSessionToken),
      ),
    },
  });
  return {
    samanthaAuditSourceContext,
  };
}

export function executeSamanthaPostOutputGuardrails(
  args: SamanthaPostOutputGuardrailsArgs,
): SamanthaPostOutputGuardrailsResult {
  let assistantContent = args.assistantContent;
  let actionCompletionSanitizationFallbackApplied = false;

  if (assistantContent.trim().length === 0) {
    const successfulAuditDeliverableResult = [...args.toolResults]
      .reverse()
      .find(
        (result) =>
          normalizeSamanthaRuntimeString(result.tool) === AUDIT_DELIVERABLE_TOOL_NAME
          && result.status === "success",
      );
    const successfulAuditDeliverablePayload =
      successfulAuditDeliverableResult?.result
      && typeof successfulAuditDeliverableResult.result === "object"
      && !Array.isArray(successfulAuditDeliverableResult.result)
        ? (successfulAuditDeliverableResult.result as Record<string, unknown>)
        : null;

    if (successfulAuditDeliverablePayload) {
      const leadDelivery =
        successfulAuditDeliverablePayload.leadEmailDelivery
        && typeof successfulAuditDeliverablePayload.leadEmailDelivery === "object"
        && !Array.isArray(successfulAuditDeliverablePayload.leadEmailDelivery)
          ? (successfulAuditDeliverablePayload.leadEmailDelivery as Record<string, unknown>)
          : null;
      const salesDelivery =
        successfulAuditDeliverablePayload.salesEmailDelivery
        && typeof successfulAuditDeliverablePayload.salesEmailDelivery === "object"
        && !Array.isArray(successfulAuditDeliverablePayload.salesEmailDelivery)
          ? (successfulAuditDeliverablePayload.salesEmailDelivery as Record<string, unknown>)
          : null;
      const leadEmailSent = leadDelivery?.success === true;
      const salesEmailSent = salesDelivery?.success === true;

      if (args.actionCompletionResponseLanguage === "de") {
        assistantContent = "Ihre Audit-Ergebnisse werden per E-Mail zugestellt.";
        if (leadEmailSent || salesEmailSent) {
          assistantContent += "\nDie Zustell-E-Mails wurden angestoßen.";
        }
      } else {
        assistantContent = "Your audit results are being delivered by email.";
        if (leadEmailSent || salesEmailSent) {
          assistantContent += "\nDelivery emails have been triggered.";
        }
      }
    } else {
      assistantContent = args.resolveActionCompletionSanitizationFallbackMessage();
    }
    actionCompletionSanitizationFallbackApplied = true;
  }

  if (isSamanthaLeadCaptureRuntime(args.authorityConfig)) {
    const emailOnlyGuard = sanitizeSamanthaEmailOnlyAssistantContent({
      assistantContent,
      language: args.actionCompletionResponseLanguage,
    });
    if (emailOnlyGuard.rewritten) {
      assistantContent = emailOnlyGuard.assistantContent;
      args.recordSamanthaDispatchEvent({
        stage: "samantha_email_only_output_guard",
        status: emailOnlyGuard.blocked ? "skip" : "pass",
        reasonCode: emailOnlyGuard.blocked
          ? "samantha_email_only_guard_blocked"
          : "samantha_email_only_guard_rewritten",
      });
    }
  }

  return {
    assistantContent,
    actionCompletionSanitizationFallbackApplied,
  };
}

export function executeSamanthaPostDispatchTelemetryFinalization(
  args: SamanthaPostDispatchTelemetryFinalizationArgs,
): SamanthaPostDispatchTelemetryFinalizationResult {
  const samanthaDispatchIntentObserved =
    isLikelyAuditDeliverableInvocationRequest(args.inboundMessage)
    || args.actionCompletionClaimedOutcomes.includes(AUDIT_DELIVERABLE_OUTCOME_KEY)
    || Boolean(args.samanthaAuditAutoDispatchPlan?.requestDetected);

  const shouldEmitSamanthaAutoDispatchTelemetry =
    args.authorityAgentRoutingSnapshot.isSamanthaRuntime
    || args.speakerAgentRoutingSnapshot.isSamanthaRuntime
    || samanthaDispatchIntentObserved
    || args.runtimeCapabilityGapBlocked;

  const samanthaPlanForTelemetry: SamanthaAuditAutoDispatchPlan =
    args.samanthaAuditAutoDispatchPlan ?? {
      eligible: false,
      requestDetected: false,
      toolAvailable: false,
      alreadyAttempted: false,
      preexistingInvocationStatus: "not_attempted",
      retryEligibleAfterFailure: false,
      ambiguousName: false,
      ambiguousFounderContact: false,
      missingRequiredFields: [],
      skipReasonCodes: [],
      shouldDispatch: false,
    };

  const samanthaAutoDispatchInvocationStatus = resolveSamanthaAutoDispatchInvocationStatus({
    attempted: args.samanthaAuditAutoDispatchAttempted,
    toolResults: args.samanthaAuditAutoDispatchToolResults,
  });

  let samanthaDispatchTerminalReasonCode = args.samanthaDispatchTerminalReasonCode;
  if (samanthaDispatchTerminalReasonCode === "auto_dispatch_pending") {
    samanthaDispatchTerminalReasonCode = resolveSamanthaDispatchTerminalReasonCode({
      runtimeCapabilityGapBlocked: args.runtimeCapabilityGapBlocked,
      plan: args.samanthaAuditAutoDispatchPlan,
      dispatchDecision: args.samanthaAuditDispatchDecision,
      invocationStatus: samanthaAutoDispatchInvocationStatus,
      preflightLookupTargetOk: args.preflightAuditLookupTarget.ok,
      preflightAuditSessionFound: args.preflightAuditSessionFound,
    });
  }

  args.recordSamanthaDispatchEvent({
    stage: "samantha_auto_dispatch_complete",
    status: samanthaDispatchTerminalReasonCode.startsWith("auto_dispatch_executed")
      ? "pass"
      : "skip",
    reasonCode: samanthaDispatchTerminalReasonCode,
    detail: {
      dispatchDecision: args.samanthaAuditDispatchDecision || null,
      invocationStatus: samanthaAutoDispatchInvocationStatus,
    },
  });

  return {
    samanthaDispatchIntentObserved,
    shouldEmitSamanthaAutoDispatchTelemetry,
    samanthaPlanForTelemetry,
    samanthaAutoDispatchInvocationStatus,
    samanthaDispatchTerminalReasonCode,
    samanthaAutoDispatchTelemetry: shouldEmitSamanthaAutoDispatchTelemetry
      ? {
          traceContractVersion: "samantha_dispatch_trace_v1",
          correlationId: args.samanthaDispatchTraceCorrelationId ?? null,
          terminalReasonCode: samanthaDispatchTerminalReasonCode,
          invocationStatus: samanthaAutoDispatchInvocationStatus,
          preflightLookupTarget: {
            ok: args.preflightAuditLookupTarget.ok,
            errorCode: args.preflightAuditLookupTarget.ok
              ? null
              : args.preflightAuditLookupTarget.errorCode,
          },
          preflightAuditSessionFound:
            typeof args.preflightAuditSessionFound === "boolean"
              ? args.preflightAuditSessionFound
              : null,
          router: {
            selectedAuthorityAgent: args.authorityAgentRoutingSnapshot,
            selectedSpeakerAgent: args.speakerAgentRoutingSnapshot,
            routeSelectors: args.inboundDispatchRouteSelectors,
            selectionPath: args.samanthaDispatchRouterSelectionPath,
          },
          eligible: samanthaPlanForTelemetry.eligible,
          requestDetected: samanthaPlanForTelemetry.requestDetected,
          toolAvailable: samanthaPlanForTelemetry.toolAvailable,
          alreadyAttempted: samanthaPlanForTelemetry.alreadyAttempted,
          preexistingInvocationStatus:
            samanthaPlanForTelemetry.preexistingInvocationStatus,
          retryEligibleAfterFailure:
            samanthaPlanForTelemetry.retryEligibleAfterFailure,
          skipReasonCodes: samanthaPlanForTelemetry.skipReasonCodes,
          attempted: args.samanthaAuditAutoDispatchAttempted,
          executed: args.samanthaAuditAutoDispatchExecuted,
          recoveryAttempted: args.samanthaAuditRecoveryAttempted,
          recoveryDecisionReasonCode: args.samanthaClaimRecoveryDecision.reasonCode,
          missingRequiredFields: samanthaPlanForTelemetry.missingRequiredFields,
          toolStatuses: args.samanthaAuditAutoDispatchToolResults.map(
            (result) => result.status,
          ),
          dispatchDecision: args.samanthaAuditDispatchDecision,
          traceEvents: args.samanthaDispatchTraceEvents,
        }
      : undefined,
  };
}

export async function executeSamanthaAutoDispatchRuntimeFlow<
  Payload extends SamanthaAutoDispatchRuntimeEnforcementPayloadLike,
>(
  args: SamanthaAutoDispatchRuntimeFlowArgs<Payload>,
): Promise<SamanthaAutoDispatchRuntimeFlowResult<Payload>> {
  const logError = args.onError ?? ((message: string, meta: Record<string, unknown>) => {
    console.error(message, meta);
  });
  const logWarn = args.onWarn ?? ((message: string, meta: Record<string, unknown>) => {
    console.warn(message, meta);
  });

  const requestedToolNames = normalizeSamanthaRuntimeDeterministicToolNames(
    args.toolCalls
      .map((toolCall) => normalizeSamanthaRuntimeString(toolCall?.function?.name))
      .filter((toolName): toolName is string => Boolean(toolName)),
  );
  const preflightDispatchRequestDetected = isLikelyAuditDeliverableInvocationRequest(
    args.inboundMessage,
  ) || requestedToolNames.includes(AUDIT_DELIVERABLE_TOOL_NAME);
  const recentUserMessagesForPreflight = args.sessionHistorySnapshot
    .filter((message) => message.role === "user")
    .slice(-120)
    .map((message) => message.content);
  const priorMissingFieldRecoveryCount = countTrailingSamanthaMissingFieldRecoveryMessages(
    args.sessionHistorySnapshot,
  );
  const samanthaMissingFieldRecoveryAttemptCount = priorMissingFieldRecoveryCount + 1;
  let samanthaMissingFieldRecoveryLogged = false;

  const preflightAuditLookupTarget = resolveSamanthaAuditLookupTarget(
    args.samanthaAuditSourceContext,
  );
  args.recordSamanthaDispatchEvent({
    stage: "samantha_preflight_lookup_target",
    status: preflightAuditLookupTarget.ok ? "pass" : "skip",
    reasonCode: preflightAuditLookupTarget.ok
      ? "audit_lookup_target_resolved"
      : preflightAuditLookupTarget.errorCode,
    detail: preflightAuditLookupTarget.ok
      ? {
          sourceAuditChannel: preflightAuditLookupTarget.channel,
          hasSessionToken: true,
        }
      : {
          message: preflightAuditLookupTarget.message,
        },
  });

  let preflightAuditSession: SamanthaAutoDispatchRuntimeAuditSession | null = null;
  let preflightAuditSessionFound: boolean | undefined;
  if (preflightAuditLookupTarget.ok) {
    try {
      preflightAuditSession = await args.resolveAuditSessionForDeliverableInternal({
        organizationId: args.organizationId,
        channel: preflightAuditLookupTarget.channel,
        sessionToken: preflightAuditLookupTarget.sessionToken,
      });
      preflightAuditSessionFound = Boolean(preflightAuditSession);
      args.recordSamanthaDispatchEvent({
        stage: "samantha_preflight_audit_session",
        status: preflightAuditSession ? "pass" : "skip",
        reasonCode: preflightAuditSession
          ? "audit_session_found"
          : "audit_session_not_found",
      });
      if (
        !preflightAuditSession
        && preflightDispatchRequestDetected
        && isSamanthaLeadCaptureRuntime(args.authorityConfig)
      ) {
        const bootstrapLeadData = resolveSamanthaAuditLeadData({
          inboundMessage: args.inboundMessage,
          recentUserMessages: recentUserMessagesForPreflight,
          capturedEmail: null,
          capturedName: null,
          contactMemory: args.contactMemory,
          auditSessionWorkflowRecommendation: null,
        });
        const bootstrapName = [
          bootstrapLeadData.firstName,
          bootstrapLeadData.lastName,
        ].filter((token): token is string => Boolean(token)).join(" ");
        const bootstrapWorkflowRecommendation = normalizeSamanthaRuntimeString(
          args.extractActionCompletionClaimsFromAssistantContent(
            args.actionCompletionRawAssistantContent,
          ).sanitizedContent,
        );
        try {
          await args.ensureAuditModeSessionForDeliverable({
            organizationId: args.organizationId,
            agentId: args.authorityAgentId,
            channel: preflightAuditLookupTarget.channel,
            sessionToken: preflightAuditLookupTarget.sessionToken,
            workflowRecommendation: bootstrapWorkflowRecommendation,
            capturedEmail: bootstrapLeadData.email,
            capturedName: bootstrapName || undefined,
            metadata: {
              source: "ai.agentExecution.samantha_preflight",
              bootstrapReason: "audit_session_not_found",
              correlationId: args.samanthaDispatchTraceCorrelationId || null,
            },
          });
          preflightAuditSession = await args.resolveAuditSessionForDeliverableInternal({
            organizationId: args.organizationId,
            channel: preflightAuditLookupTarget.channel,
            sessionToken: preflightAuditLookupTarget.sessionToken,
          });
          preflightAuditSessionFound = Boolean(preflightAuditSession);
          args.recordSamanthaDispatchEvent({
            stage: "samantha_preflight_audit_session_bootstrap",
            status: preflightAuditSession ? "pass" : "fail",
            reasonCode: preflightAuditSession
              ? "audit_session_bootstrapped"
              : "audit_session_bootstrap_not_resolved",
          });
        } catch (bootstrapError) {
          logError("[AgentExecution] Failed to bootstrap Samantha audit session during preflight", {
            sessionId: args.sessionId,
            sourceAuditContext: args.samanthaAuditSourceContext,
            bootstrapError,
          });
          args.recordSamanthaDispatchEvent({
            stage: "samantha_preflight_audit_session_bootstrap",
            status: "fail",
            reasonCode: "audit_session_bootstrap_error",
          });
        }
      }
    } catch (auditSessionResolveError) {
      logError("[AgentExecution] Failed to resolve audit session for Samantha preflight guardrail", {
        sessionId: args.sessionId,
        sourceAuditContext: args.samanthaAuditSourceContext,
        auditSessionResolveError,
      });
      args.recordSamanthaDispatchEvent({
        stage: "samantha_preflight_audit_session",
        status: "fail",
        reasonCode: "audit_session_lookup_error",
      });
    }
  } else {
    preflightAuditSessionFound = false;
  }

  let assistantContent = args.assistantContent;
  let actionCompletionEnforcement:
    | SamanthaAutoDispatchRuntimeEnforcementDecision<Payload>
    | null = null;
  let actionCompletionEnforcementPayload: Payload | null = null;
  let actionCompletionRewriteApplied = false;
  let samanthaAuditAutoDispatchPlan: SamanthaAuditAutoDispatchPlan | null = null;
  let samanthaAuditAutoDispatchAttempted = false;
  let samanthaAuditAutoDispatchExecuted = false;
  let samanthaAuditRecoveryAttempted = false;
  const samanthaAuditAutoDispatchToolResults: AgentToolResult[] = [];
  let samanthaAuditDispatchDecision: SamanthaAuditDispatchDecision | undefined;
  let samanthaAutoDispatchInvocationStatus: SamanthaAutoDispatchInvocationStatus = "not_attempted";
  let samanthaClaimRecoveryDecision: SamanthaClaimRecoveryDecision = {
    shouldAttempt: false,
    reasonCode: "plan_missing",
  };
  let samanthaDispatchTerminalReasonCode = args.runtimeCapabilityGapBlocked
    ? "runtime_capability_gap_blocked"
    : "auto_dispatch_pending";
  let errorStateDirty = args.errorStateDirty;

  if (!args.runtimeCapabilityGapBlocked) {
    samanthaAuditAutoDispatchPlan = resolveSamanthaAuditAutoDispatchPlan({
      authorityConfig: args.authorityConfig,
      inboundMessage: args.inboundMessage,
      availableToolNames: args.availableToolNames,
      toolResults: args.toolResults,
      requestedToolNames,
      recentUserMessages: recentUserMessagesForPreflight,
      capturedEmail: preflightAuditSession?.capturedEmail,
      capturedName: preflightAuditSession?.capturedName,
      contactMemory: args.contactMemory,
      auditSessionWorkflowRecommendation: preflightAuditSession?.workflowRecommendation,
    });
    args.recordSamanthaDispatchEvent({
      stage: "samantha_auto_dispatch_plan",
      status: samanthaAuditAutoDispatchPlan.shouldDispatch ? "pass" : "skip",
      reasonCode: samanthaAuditAutoDispatchPlan.shouldDispatch
        ? "auto_dispatch_ready"
        : (samanthaAuditAutoDispatchPlan.skipReasonCodes[0] || "auto_dispatch_preconditions_not_met"),
      detail: {
        eligible: samanthaAuditAutoDispatchPlan.eligible,
        requestDetected: samanthaAuditAutoDispatchPlan.requestDetected,
        toolAvailable: samanthaAuditAutoDispatchPlan.toolAvailable,
        alreadyAttempted: samanthaAuditAutoDispatchPlan.alreadyAttempted,
        preexistingInvocationStatus:
          samanthaAuditAutoDispatchPlan.preexistingInvocationStatus,
        retryEligibleAfterFailure:
          samanthaAuditAutoDispatchPlan.retryEligibleAfterFailure,
        skipReasonCodes: samanthaAuditAutoDispatchPlan.skipReasonCodes,
        missingRequiredFields: samanthaAuditAutoDispatchPlan.missingRequiredFields,
        ambiguousName: samanthaAuditAutoDispatchPlan.ambiguousName,
        ambiguousFounderContact: samanthaAuditAutoDispatchPlan.ambiguousFounderContact,
      },
    });
    if (samanthaAuditAutoDispatchPlan.retryEligibleAfterFailure) {
      args.recordSamanthaDispatchEvent({
        stage: "samantha_retry_eligibility",
        status: "pass",
        reasonCode: "retry_eligible_after_failure",
        detail: {
          preexistingInvocationStatus:
            samanthaAuditAutoDispatchPlan.preexistingInvocationStatus,
        },
      });
    }

    const runSamanthaAutoDispatchAttempt = async () => {
      if (!samanthaAuditAutoDispatchPlan?.toolArgs) {
        args.recordSamanthaDispatchEvent({
          stage: "samantha_auto_dispatch_attempt",
          status: "skip",
          reasonCode: "auto_dispatch_tool_args_missing",
        });
        return;
      }
      samanthaAuditAutoDispatchAttempted = true;
      args.recordSamanthaDispatchEvent({
        stage: "samantha_auto_dispatch_attempt",
        status: "pass",
        reasonCode: "auto_dispatch_attempt_started",
      });
      const sourceAwareToolArgs: SamanthaAuditAutoDispatchToolArgs = {
        ...samanthaAuditAutoDispatchPlan.toolArgs,
        language: args.actionCompletionResponseLanguage,
        ingressChannel: args.samanthaAuditSourceContext.ingressChannel,
        originSurface: args.samanthaAuditSourceContext.originSurface,
        sourceSessionToken: preflightAuditLookupTarget.ok
          ? preflightAuditLookupTarget.sessionToken
          : args.samanthaAuditSourceContext.sourceSessionToken,
        sourceAuditChannel: preflightAuditLookupTarget.ok
          ? preflightAuditLookupTarget.channel
          : args.samanthaAuditSourceContext.sourceAuditChannel,
      };
      const autoDispatchExecution = await args.executeAutoDispatchToolCall({
        toolArgs: sourceAwareToolArgs,
      });
      if (autoDispatchExecution.errorStateDirty) {
        errorStateDirty = true;
      }
      if (autoDispatchExecution.toolResults.length > 0) {
        samanthaAuditAutoDispatchToolResults.push(...autoDispatchExecution.toolResults);
      }
      if (autoDispatchExecution.toolResults.length > 0) {
        args.toolResults.push(...autoDispatchExecution.toolResults);
      }
      if (
        autoDispatchExecution.toolResults.some(
          (result) =>
            result.tool === AUDIT_DELIVERABLE_TOOL_NAME && result.status === "success",
        )
      ) {
        samanthaAuditAutoDispatchExecuted = true;
      }
      samanthaAutoDispatchInvocationStatus = resolveSamanthaAutoDispatchInvocationStatus({
        attempted: samanthaAuditAutoDispatchAttempted,
        toolResults: samanthaAuditAutoDispatchToolResults,
      });
      args.recordSamanthaDispatchEvent({
        stage: "samantha_auto_dispatch_attempt_result",
        status:
          samanthaAutoDispatchInvocationStatus === "executed_success"
            ? "pass"
            : samanthaAutoDispatchInvocationStatus === "queued_pending_approval"
              ? "skip"
              : "fail",
        reasonCode: samanthaAutoDispatchInvocationStatus,
        detail: {
          toolStatuses: autoDispatchExecution.toolResults
            .filter((result) => result.tool === AUDIT_DELIVERABLE_TOOL_NAME)
            .map((result) => result.status),
          toolErrors: autoDispatchExecution.toolResults
            .filter((result) => result.tool === AUDIT_DELIVERABLE_TOOL_NAME)
            .map((result) => result.error || null),
        },
      });
    };

    if (samanthaAuditAutoDispatchPlan.shouldDispatch && samanthaAuditAutoDispatchPlan.toolArgs) {
      await runSamanthaAutoDispatchAttempt();
    } else {
      args.recordSamanthaDispatchEvent({
        stage: "samantha_auto_dispatch_attempt",
        status: "skip",
        reasonCode:
          samanthaAuditAutoDispatchPlan.skipReasonCodes[0]
          || "auto_dispatch_preconditions_not_met",
        detail: {
          skipReasonCodes: samanthaAuditAutoDispatchPlan.skipReasonCodes,
        },
      });
    }

    const recordMissingFieldRecoveryAttempt = (
      enforcementPayload: Payload | null | undefined,
    ) => {
      if (
        samanthaMissingFieldRecoveryLogged
        || !samanthaAuditAutoDispatchPlan?.eligible
        || enforcementPayload?.reasonCode !== "claim_tool_not_observed"
        || enforcementPayload?.preflightReasonCode !== "missing_required_fields"
      ) {
        return;
      }
      const invocationStatus = resolveSamanthaAutoDispatchInvocationStatus({
        attempted: samanthaAuditAutoDispatchAttempted,
        toolResults: samanthaAuditAutoDispatchToolResults,
      });
      const recoveryAttempted = invocationStatus !== "not_attempted";
      samanthaMissingFieldRecoveryLogged = true;
      args.recordSamanthaDispatchEvent({
        stage: "samantha_missing_fields_recovery",
        status: recoveryAttempted ? "pass" : "skip",
        reasonCode: recoveryAttempted
          ? "recovery_attempted_missing_required_fields"
          : "blocked_missing_required_fields",
        detail: {
          recoveryAttemptCount: samanthaMissingFieldRecoveryAttemptCount,
          missingRequiredFields: enforcementPayload.preflightMissingRequiredFields || [],
          invocationStatus,
        },
      });
    };

    actionCompletionEnforcement = args.resolveAuditDeliverableInvocationGuardrail({
      authorityConfig: args.authorityConfig,
      inboundMessage: args.inboundMessage,
      assistantContent: args.actionCompletionRawAssistantContent,
      toolResults: args.toolResults,
      availableToolNames: args.availableToolNames,
      recentUserMessages: recentUserMessagesForPreflight,
      capturedEmail: preflightAuditSession?.capturedEmail,
      capturedName: preflightAuditSession?.capturedName,
      contactMemory: args.contactMemory,
      auditSessionWorkflowRecommendation: preflightAuditSession?.workflowRecommendation,
      recoveryAttemptCount: samanthaMissingFieldRecoveryAttemptCount,
      turnId: args.turnId,
    });
    actionCompletionEnforcementPayload = actionCompletionEnforcement.payload;
    recordMissingFieldRecoveryAttempt(actionCompletionEnforcementPayload);

    samanthaClaimRecoveryDecision = resolveSamanthaClaimRecoveryDecision({
      plan: samanthaAuditAutoDispatchPlan,
      alreadyAttempted: samanthaAuditAutoDispatchAttempted,
      enforcementPayload: actionCompletionEnforcementPayload,
    });
    const shouldAttemptSamanthaClaimRecovery = samanthaClaimRecoveryDecision.shouldAttempt;
    args.recordSamanthaDispatchEvent({
      stage: "samantha_claim_recovery_decision",
      status: shouldAttemptSamanthaClaimRecovery ? "pass" : "skip",
      reasonCode: samanthaClaimRecoveryDecision.reasonCode,
    });
    if (shouldAttemptSamanthaClaimRecovery) {
      samanthaAuditRecoveryAttempted = true;
      await runSamanthaAutoDispatchAttempt();
      actionCompletionEnforcement = args.resolveAuditDeliverableInvocationGuardrail({
        authorityConfig: args.authorityConfig,
        inboundMessage: args.inboundMessage,
        assistantContent: args.actionCompletionRawAssistantContent,
        toolResults: args.toolResults,
        availableToolNames: args.availableToolNames,
        recentUserMessages: recentUserMessagesForPreflight,
        capturedEmail: preflightAuditSession?.capturedEmail,
        capturedName: preflightAuditSession?.capturedName,
        contactMemory: args.contactMemory,
        auditSessionWorkflowRecommendation: preflightAuditSession?.workflowRecommendation,
        recoveryAttemptCount: samanthaMissingFieldRecoveryAttemptCount,
        turnId: args.turnId,
      });
      actionCompletionEnforcementPayload = actionCompletionEnforcement.payload;
      recordMissingFieldRecoveryAttempt(actionCompletionEnforcementPayload);
    }

    samanthaAutoDispatchInvocationStatus = resolveSamanthaAutoDispatchInvocationStatus({
      attempted: samanthaAuditAutoDispatchAttempted,
      toolResults: samanthaAuditAutoDispatchToolResults,
    });
    samanthaAuditDispatchDecision = resolveSamanthaAuditDispatchDecision({
      plan: samanthaAuditAutoDispatchPlan,
      autoDispatchToolResults: samanthaAuditAutoDispatchToolResults,
      allToolResults: args.toolResults,
      enforcementPayload: actionCompletionEnforcementPayload,
      invocationStatus: samanthaAutoDispatchInvocationStatus,
    });
    samanthaDispatchTerminalReasonCode = resolveSamanthaDispatchTerminalReasonCode({
      runtimeCapabilityGapBlocked: args.runtimeCapabilityGapBlocked,
      plan: samanthaAuditAutoDispatchPlan,
      dispatchDecision: samanthaAuditDispatchDecision,
      invocationStatus: samanthaAutoDispatchInvocationStatus,
      preflightLookupTargetOk: preflightAuditLookupTarget.ok,
      preflightAuditSessionFound,
    });
    args.recordSamanthaDispatchEvent({
      stage: "samantha_dispatch_decision",
      status: samanthaAuditDispatchDecision?.startsWith("auto_dispatch_executed")
        ? "pass"
        : "skip",
      reasonCode: samanthaDispatchTerminalReasonCode,
      detail: {
        dispatchDecision: samanthaAuditDispatchDecision || null,
        invocationStatus: samanthaAutoDispatchInvocationStatus,
      },
    });

    if (actionCompletionEnforcement.enforced && actionCompletionEnforcement.assistantContent) {
      assistantContent = actionCompletionEnforcement.assistantContent;
      actionCompletionRewriteApplied = true;
    }
    if (
      actionCompletionRewriteApplied
      && actionCompletionEnforcement.payload.reasonCode === "claim_tool_not_observed"
      && actionCompletionEnforcement.payload.preflightReasonCode === "tool_not_observed"
      && samanthaAuditAutoDispatchPlan?.eligible
    ) {
      const priorFailClosedCount = countTrailingSamanthaFailClosedAssistantMessages(
        args.sessionHistorySnapshot,
      );
      if (priorFailClosedCount >= 1) {
        const responseLanguage = args.resolveActionCompletionResponseLanguage({
          authorityConfig: args.authorityConfig,
          inboundMessage: args.inboundMessage,
          assistantContent: args.actionCompletionRawAssistantContent,
        });
        const sanitizedRaw = args.extractActionCompletionClaimsFromAssistantContent(
          args.actionCompletionRawAssistantContent,
        ).sanitizedContent;
        const gracefulFallback = buildSamanthaAuditDeliverableGracefulDegradationMessage(
          responseLanguage,
        );
        assistantContent = sanitizedRaw
          ? `${sanitizedRaw}\n\n${gracefulFallback}`
          : gracefulFallback;
        args.recordSamanthaDispatchEvent({
          stage: "samantha_fail_closed_fallback",
          status: "pass",
          reasonCode: "graceful_degradation_fallback",
          detail: {
            priorFailClosedCount,
          },
        });
      }
    }
    if (
      actionCompletionRewriteApplied
      && actionCompletionEnforcement.payload.reasonCode === "claim_tool_not_observed"
      && actionCompletionEnforcement.payload.preflightReasonCode === "tool_not_observed"
      && samanthaAuditAutoDispatchPlan?.eligible
    ) {
      logWarn("[AgentExecution] Samantha fail-closed rewrite diagnostics", {
        sessionId: args.sessionId,
        turnId: args.turnId,
        preflightReasonCode: actionCompletionEnforcement.payload.preflightReasonCode || null,
        missingRequiredFields:
          actionCompletionEnforcement.payload.preflightMissingRequiredFields
          || samanthaAuditAutoDispatchPlan.missingRequiredFields,
        dispatchDecision: samanthaAuditDispatchDecision || null,
        recoveryAttempted: samanthaAuditRecoveryAttempted,
      });
    }
  }

  return {
    assistantContent,
    errorStateDirty,
    preflightAuditLookupTarget,
    preflightAuditSession,
    preflightAuditSessionFound,
    recentUserMessagesForPreflight,
    actionCompletionEnforcement,
    actionCompletionEnforcementPayload,
    actionCompletionRewriteApplied,
    samanthaAuditAutoDispatchPlan,
    samanthaAuditAutoDispatchAttempted,
    samanthaAuditAutoDispatchExecuted,
    samanthaAuditRecoveryAttempted,
    samanthaAuditAutoDispatchToolResults,
    samanthaAuditDispatchDecision,
    samanthaAutoDispatchInvocationStatus,
    samanthaClaimRecoveryDecision,
    samanthaDispatchTerminalReasonCode,
  };
}

export async function executeSamanthaCapabilityGapUnavailableHandling<
  Payload extends SamanthaAutoDispatchRuntimeEnforcementPayloadLike,
  LinearIssue extends SamanthaCapabilityGapLinearIssue,
>(
  args: SamanthaCapabilityGapUnavailableHandlingArgs<Payload, LinearIssue>,
): Promise<SamanthaCapabilityGapUnavailableHandlingResult<LinearIssue>> {
  const logError = args.onError ?? ((message: string, meta: Record<string, unknown>) => {
    console.error(message, meta);
  });

  let assistantContent = args.assistantContent;
  let actionCompletionLinearIssue = args.actionCompletionLinearIssue;
  let samanthaCapabilityGapFallbackDelivery = args.samanthaCapabilityGapFallbackDelivery;

  if (args.actionCompletionEnforcement) {
    const unavailableReason =
      args.actionCompletionEnforcement.payload.reasonCode === "claim_tool_unavailable";
    const samanthaAuditDeliverableUnavailable = unavailableReason
      && isSamanthaAuditDeliverableOutcomeLike({
        outcome: args.actionCompletionEnforcement.payload.outcome || "",
        requiredTools: args.actionCompletionEnforcement.payload.requiredTools,
      });
    if (
      unavailableReason
      && (args.actionCompletionTicketRequestIntent || samanthaAuditDeliverableUnavailable)
    ) {
      try {
        const preferredToolName = args.actionCompletionEnforcement.payload.requiredTools[0]
          || args.actionCompletionEnforcement.payload.outcome
          || "runtime_capability_gap";
        actionCompletionLinearIssue = await args.createFeatureRequestIssue({
          userName: "Anonymous Native Guest",
          userEmail: "native-guest@unknown.local",
          organizationName: args.organizationName,
          toolName: preferredToolName,
          featureDescription:
            args.actionCompletionEnforcement.payload.outcome
            || "Runtime capability unavailable in current scope",
          userMessage: args.inboundMessage,
          userElaboration: undefined,
          category: samanthaAuditDeliverableUnavailable
            ? "samantha_audit_deliverable_capability_gap"
            : "action_completion_capability_gap",
          conversationId: args.sessionId,
          occurredAt: Date.now(),
        });
      } catch (linearError) {
        logError(
          "[AgentExecution] Failed to create Linear issue for action-completion capability gap",
          {
            sessionId: args.sessionId,
            reasonCode: args.actionCompletionEnforcement.payload.reasonCode,
            linearError,
          },
        );
      }
    }
    if (
      args.actionCompletionEnforcement.enforced
      && actionCompletionLinearIssue
      && !assistantContent.includes(actionCompletionLinearIssue.issueNumber)
    ) {
      assistantContent = [
        assistantContent.trim(),
        args.formatCapabilityGapLinearIssueLine({
          language: args.actionCompletionResponseLanguage,
          linearIssue: actionCompletionLinearIssue,
        }),
      ].filter((line) => line.length > 0).join("\n");
    }
  }

  if (args.actionCompletionEnforcementPayload?.reasonCode === "claim_tool_unavailable") {
    const unavailableToolName =
      args.actionCompletionEnforcementPayload.requiredTools[0]
      || args.actionCompletionEnforcementPayload.outcome
      || "runtime_capability_gap";
    const claimUnavailableMetadata = {
      requiredTools: args.actionCompletionEnforcementPayload.requiredTools,
      availableTools: args.actionCompletionEnforcementPayload.availableTools,
      enforcementMode: args.actionCompletionEnforcementPayload.enforcementMode,
    };
    const samanthaAuditDeliverableUnavailable =
      isSamanthaAuditDeliverableOutcomeLike({
        outcome: args.actionCompletionEnforcementPayload.outcome || "",
        requiredTools: args.actionCompletionEnforcementPayload.requiredTools,
      });
    let claimUnavailableIncidentResult: SamanthaClaimToolUnavailableIncidentResult | null = null;
    if (samanthaAuditDeliverableUnavailable) {
      claimUnavailableIncidentResult = await args.notifyRuntimeIncident({
        incidentType: "claim_tool_unavailable",
        organizationId: args.organizationId,
        sessionId: args.sessionId,
        turnId: args.turnId,
        proposalKey: args.runtimeIncident.proposalKey,
        manifestHash: args.runtimeIncident.manifestHash,
        tool: unavailableToolName,
        reasonCode: args.actionCompletionEnforcementPayload.reasonCode,
        reason:
          args.actionCompletionEnforcementPayload.outcome
          || "Action completion claim blocked because required tool is unavailable.",
        idempotencyKey: args.runtimeIncident.idempotencyKey,
        idempotencyScopeKey: args.runtimeIncident.idempotencyScopeKey,
        payloadHash: args.runtimeIncident.payloadHash,
        admissionReasonCode: args.actionCompletionEnforcementPayload.reasonCode,
        linearIssueId: actionCompletionLinearIssue?.issueId,
        linearIssueUrl: actionCompletionLinearIssue?.issueUrl,
        metadata: claimUnavailableMetadata,
      });
    } else {
      await args.scheduleRuntimeIncidentAlert({
        incidentType: "claim_tool_unavailable",
        proposalKey: args.runtimeIncident.proposalKey,
        tool: unavailableToolName,
        reasonCode: args.actionCompletionEnforcementPayload.reasonCode,
        reason:
          args.actionCompletionEnforcementPayload.outcome
          || "Action completion claim blocked because required tool is unavailable.",
        linearIssueId: actionCompletionLinearIssue?.issueId,
        linearIssueUrl: actionCompletionLinearIssue?.issueUrl,
        metadata: claimUnavailableMetadata,
      });
    }
    if (
      samanthaAuditDeliverableUnavailable
      && claimUnavailableIncidentResult?.deduped !== true
    ) {
      const threadDeepLink =
        claimUnavailableIncidentResult?.threadDeepLink
        || args.buildRuntimeIncidentThreadDeepLink({
          sessionId: args.sessionId,
          proposalKey: args.runtimeIncident.proposalKey,
        });
      samanthaCapabilityGapFallbackDelivery =
        await executeSamanthaCapabilityGapFallbackDeliveries({
          organizationId: args.organizationId,
          sessionId: args.sessionId,
          turnId: args.turnId,
          proposalKey: args.runtimeIncident.proposalKey,
          unavailableToolName,
          reasonCode:
            args.actionCompletionEnforcementPayload.reasonCode
            || "claim_tool_unavailable",
          inboundMessage: args.inboundMessage,
          responseLanguage: args.actionCompletionResponseLanguage,
          recentUserMessages: args.recentUserMessagesForPreflight,
          preflightAuditSession: args.preflightAuditSession,
          preflightAuditLookupTarget: args.preflightAuditLookupTarget,
          actionCompletionLinearIssue,
          threadDeepLink,
          sourceAuditContext: args.sourceAuditContext,
          resolveAuditSessionForLookupTarget: args.resolveAuditSessionForLookupTarget,
          resolveDomainConfigIdForOrg: args.resolveDomainConfigIdForOrg,
          sendEmail: args.sendEmail,
          onError: (message, meta) => {
            logError(message, meta);
          },
        });
      if (
        !samanthaCapabilityGapFallbackDelivery?.leadEmailDelivery?.success
        || !samanthaCapabilityGapFallbackDelivery?.salesEmailDelivery?.success
      ) {
        logError("[AgentExecution] Samantha capability-gap fallback deliveries incomplete", {
          sessionId: args.sessionId,
          turnId: args.turnId,
          leadEmailDelivery: samanthaCapabilityGapFallbackDelivery?.leadEmailDelivery,
          salesEmailDelivery: samanthaCapabilityGapFallbackDelivery?.salesEmailDelivery,
        });
      }
    }
  }

  return {
    assistantContent,
    actionCompletionLinearIssue,
    samanthaCapabilityGapFallbackDelivery,
  };
}

export async function executeSamanthaCapabilityGapFallbackDeliveries(args: {
  organizationId: string;
  sessionId: string;
  turnId: string;
  proposalKey: string;
  unavailableToolName: string;
  reasonCode: string;
  inboundMessage: string;
  responseLanguage: "en" | "de";
  recentUserMessages: string[];
  preflightAuditSession?: {
    capturedEmail?: string;
    capturedName?: string;
  } | null;
  preflightAuditLookupTarget: SamanthaCapabilityGapLookupTarget;
  actionCompletionLinearIssue?: {
    issueNumber?: string;
    issueUrl?: string;
  } | null;
  threadDeepLink: string;
  sourceAuditContext?: unknown;
  resolveAuditSessionForLookupTarget: (args: {
    channel: SamanthaAuditRoutingAuditChannel;
    sessionToken: string;
  }) => Promise<{ capturedEmail?: string; capturedName?: string } | null>;
  resolveDomainConfigIdForOrg: () => Promise<string | undefined>;
  sendEmail: (args: {
    domainConfigId: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  }) => Promise<{ success?: boolean; messageId?: string; error?: string } | null>;
  salesInbox?: string;
  onError?: (message: string, meta: Record<string, unknown>) => void;
}): Promise<SamanthaCapabilityGapFallbackDelivery> {
  const logError = args.onError ?? ((message: string, meta: Record<string, unknown>) => {
    console.error(message, meta);
  });

  let fallbackAuditSession = args.preflightAuditSession;
  if (!fallbackAuditSession && args.preflightAuditLookupTarget.ok) {
    try {
      fallbackAuditSession = await args.resolveAuditSessionForLookupTarget({
        channel: args.preflightAuditLookupTarget.channel,
        sessionToken: args.preflightAuditLookupTarget.sessionToken,
      });
    } catch (auditSessionResolveError) {
      logError(
        "[AgentExecution] Failed to resolve audit session for Samantha fallback handling",
        {
          sessionId: args.sessionId,
          sourceAuditContext: args.sourceAuditContext,
          auditSessionResolveError,
        },
      );
    }
  }

  const fallbackLeadEmail =
    extractSamanthaRuntimeFirstEmailAddress(fallbackAuditSession?.capturedEmail)
    || extractSamanthaRuntimeFirstEmailAddress(args.inboundMessage)
    || args.recentUserMessages
      .map((text) => extractSamanthaRuntimeFirstEmailAddress(text))
      .find((candidate): candidate is string => Boolean(candidate));
  const domainConfigId = await args.resolveDomainConfigIdForOrg();
  const linearIssueReference = args.actionCompletionLinearIssue?.issueNumber
    && args.actionCompletionLinearIssue?.issueUrl
    ? `${args.actionCompletionLinearIssue.issueNumber} (${args.actionCompletionLinearIssue.issueUrl})`
    : "Not created";
  const fallbackLeadName = normalizeSamanthaRuntimeString(
    fallbackAuditSession?.capturedName,
  ) || "there";
  const fallbackSubject = args.responseLanguage === "de"
    ? "Update: Ihre One of One Workflow-Anfrage"
    : "Update: your One of One workflow report email request";
  const fallbackGreeting = args.responseLanguage === "de"
    ? `Hallo ${fallbackLeadName},`
    : `Hi ${fallbackLeadName},`;
  const fallbackMessage = args.responseLanguage === "de"
    ? "Samantha konnte die Workflow-Ergebnis-E-Mail nicht senden, weil das Runtime-Delivery-Tool in diesem Scope derzeit nicht verfuegbar ist."
    : "Samantha could not send the workflow results email because the runtime delivery tool is not available in this scope yet.";
  const fallbackFollowUp = args.responseLanguage === "de"
    ? "Wir haben das intern als Feature-Luecke erfasst und unser Team meldet sich mit dem naechstbesten Deliverable-Pfad direkt bei Ihnen."
    : "We logged this as a tracked feature gap and our team will follow up directly with your next-best deliverable path.";

  const leadEmailDelivery: SamanthaCapabilityGapFallbackEmailDelivery = !domainConfigId
    ? {
        success: false,
        skipped: true,
        reason: "missing_domain_config",
      }
    : !fallbackLeadEmail
      ? {
          success: false,
          skipped: true,
          reason: "missing_lead_email",
        }
      : await (async () => {
          try {
            const leadResult = await args.sendEmail({
              domainConfigId,
              to: fallbackLeadEmail,
              subject: fallbackSubject,
              html: [
                `<p>${fallbackGreeting}</p>`,
                `<p>${fallbackMessage}</p>`,
                `<p>${fallbackFollowUp}</p>`,
              ].join(""),
              text: [
                fallbackGreeting,
                "",
                fallbackMessage,
                fallbackFollowUp,
              ].join("\n"),
            });
            return {
              success: Boolean(leadResult?.success),
              messageId: normalizeSamanthaRuntimeString(leadResult?.messageId),
              error: normalizeSamanthaRuntimeString(leadResult?.error),
            };
          } catch (leadEmailError) {
            return {
              success: false,
              error:
                leadEmailError instanceof Error
                  ? leadEmailError.message
                  : "lead_email_send_failed",
            };
          }
        })();

  const salesEmailDelivery: SamanthaCapabilityGapFallbackEmailDelivery = !domainConfigId
    ? {
        success: false,
        skipped: true,
        reason: "missing_domain_config",
      }
    : await (async () => {
        try {
          const salesInbox = args.salesInbox || process.env.SALES_EMAIL || "sales@l4yercak3.com";
          const salesResult = await args.sendEmail({
            domainConfigId,
            to: salesInbox,
            subject: "Samantha capability-gap fallback triggered",
            html: [
              "<h2>Samantha audit email capability gap fallback triggered</h2>",
              `<p><strong>Org:</strong> ${args.organizationId}</p>`,
              `<p><strong>Session:</strong> ${args.sessionId}</p>`,
              `<p><strong>Turn:</strong> ${args.turnId}</p>`,
              `<p><strong>Proposal Key:</strong> ${args.proposalKey}</p>`,
              `<p><strong>Tool:</strong> ${args.unavailableToolName}</p>`,
              `<p><strong>Reason Code:</strong> ${args.reasonCode}</p>`,
              `<p><strong>Lead Email:</strong> ${fallbackLeadEmail || "Not resolved"}</p>`,
              `<p><strong>Linear:</strong> ${linearIssueReference}</p>`,
              `<p><strong>Thread:</strong> <a href="${args.threadDeepLink}">${args.threadDeepLink}</a></p>`,
            ].join(""),
            text: [
              "Samantha audit email capability gap fallback triggered",
              `Org: ${args.organizationId}`,
              `Session: ${args.sessionId}`,
              `Turn: ${args.turnId}`,
              `Proposal Key: ${args.proposalKey}`,
              `Tool: ${args.unavailableToolName}`,
              `Reason Code: ${args.reasonCode}`,
              `Lead Email: ${fallbackLeadEmail || "Not resolved"}`,
              `Linear: ${linearIssueReference}`,
              `Thread: ${args.threadDeepLink}`,
            ].join("\n"),
          });
          return {
            success: Boolean(salesResult?.success),
            messageId: normalizeSamanthaRuntimeString(salesResult?.messageId),
            error: normalizeSamanthaRuntimeString(salesResult?.error),
          };
        } catch (salesEmailError) {
          return {
            success: false,
            error:
              salesEmailError instanceof Error
                ? salesEmailError.message
                : "sales_email_send_failed",
          };
        }
      })();

  return {
    leadEmailDelivery,
    salesEmailDelivery,
  };
}

export function resolveSamanthaRuntimeContract(
  config: Record<string, unknown> | null | undefined
): SamanthaRuntimeContract | null {
  const runtimeModule = resolveAgentRuntimeModuleMetadataFromConfig(config);
  if (runtimeModule?.key !== SAMANTHA_AGENT_RUNTIME_MODULE_KEY) {
    return null;
  }

  return {
    contractVersion: SAMANTHA_RUNTIME_CONTRACT_VERSION,
    moduleKey: SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
    toolManifest: {
      requiredTools: [...runtimeModule.toolManifest.requiredTools],
      optionalTools: [...runtimeModule.toolManifest.optionalTools],
      deniedTools: [...runtimeModule.toolManifest.deniedTools],
    },
  };
}
