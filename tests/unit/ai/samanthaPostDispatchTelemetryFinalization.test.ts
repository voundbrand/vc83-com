import { describe, expect, it, vi } from "vitest";

import {
  executeSamanthaPostDispatchTelemetryFinalization,
  type SamanthaPostDispatchTelemetryFinalizationArgs,
} from "../../../convex/ai/agents/samantha/runtimeModule";
import {
  AUDIT_DELIVERABLE_OUTCOME_KEY,
  AUDIT_DELIVERABLE_TOOL_NAME,
  SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_MISSING,
  type SamanthaAuditAutoDispatchPlan,
} from "../../../convex/ai/samanthaAuditContract";

function buildPlan(
  overrides: Partial<SamanthaAuditAutoDispatchPlan> = {},
): SamanthaAuditAutoDispatchPlan {
  return {
    eligible: true,
    requestDetected: true,
    toolAvailable: true,
    alreadyAttempted: true,
    preexistingInvocationStatus: "executed_success",
    retryEligibleAfterFailure: false,
    ambiguousName: false,
    ambiguousFounderContact: false,
    missingRequiredFields: [],
    skipReasonCodes: [],
    shouldDispatch: true,
    ...overrides,
  };
}

function buildArgs(
  overrides: Partial<SamanthaPostDispatchTelemetryFinalizationArgs> = {},
): SamanthaPostDispatchTelemetryFinalizationArgs {
  return {
    inboundMessage: "Please send the workflow report email now.",
    actionCompletionClaimedOutcomes: [],
    runtimeCapabilityGapBlocked: false,
    preflightAuditLookupTarget: {
      ok: false,
      errorCode: SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_MISSING,
      message: "missing",
    },
    preflightAuditSessionFound: undefined,
    authorityAgentRoutingSnapshot: {
      agentId: "agent_authority",
      displayName: "Authority",
      templateRole: "authority_template",
      subtype: "org_agent",
      runtimeModuleKey: null,
      isSamanthaRuntime: false,
    },
    speakerAgentRoutingSnapshot: {
      agentId: "agent_speaker",
      displayName: "Speaker",
      templateRole: "speaker_template",
      subtype: "org_agent",
      runtimeModuleKey: null,
      isSamanthaRuntime: false,
    },
    inboundDispatchRouteSelectors: {
      channel: "webchat",
      peer: "peer_1",
    },
    samanthaDispatchRouterSelectionPath: [
      {
        stage: "router_lookup",
        source: "active_agent_lookup",
        agentId: "agent_authority",
        displayName: "Authority",
        templateRole: "authority_template",
        subtype: "org_agent",
        runtimeModuleKey: null,
        isSamanthaRuntime: false,
      },
    ],
    samanthaDispatchTraceCorrelationId: "corr_1",
    samanthaDispatchTraceEvents: [
      {
        stage: "router_entry",
        status: "pass",
        reasonCode: "router_reached",
        atMs: 1,
      },
    ],
    samanthaAuditAutoDispatchPlan: buildPlan(),
    samanthaAuditAutoDispatchAttempted: true,
    samanthaAuditAutoDispatchExecuted: true,
    samanthaAuditRecoveryAttempted: false,
    samanthaAuditAutoDispatchToolResults: [
      {
        tool: AUDIT_DELIVERABLE_TOOL_NAME,
        status: "success",
      },
    ],
    samanthaAuditDispatchDecision: "auto_dispatch_executed_email",
    samanthaAutoDispatchInvocationStatus: "not_attempted",
    samanthaClaimRecoveryDecision: {
      shouldAttempt: false,
      reasonCode: "already_attempted",
    },
    samanthaDispatchTerminalReasonCode: "auto_dispatch_pending",
    recordSamanthaDispatchEvent: vi.fn(),
    ...overrides,
  };
}

describe("Samantha post-dispatch telemetry finalization", () => {
  it("recomputes pending invocation/terminal state and emits nested telemetry payload", () => {
    const recordSamanthaDispatchEvent = vi.fn();
    const result = executeSamanthaPostDispatchTelemetryFinalization(
      buildArgs({
        actionCompletionClaimedOutcomes: [AUDIT_DELIVERABLE_OUTCOME_KEY],
        recordSamanthaDispatchEvent,
      }),
    );

    expect(result.samanthaDispatchIntentObserved).toBe(true);
    expect(result.shouldEmitSamanthaAutoDispatchTelemetry).toBe(true);
    expect(result.samanthaAutoDispatchInvocationStatus).toBe("executed_success");
    expect(result.samanthaDispatchTerminalReasonCode).toBe("auto_dispatch_executed_email");
    expect(result.samanthaAutoDispatchTelemetry).toMatchObject({
      traceContractVersion: "samantha_dispatch_trace_v1",
      correlationId: "corr_1",
      terminalReasonCode: "auto_dispatch_executed_email",
      invocationStatus: "executed_success",
      preflightLookupTarget: {
        ok: false,
        errorCode: SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_MISSING,
      },
      attempted: true,
      executed: true,
      dispatchDecision: "auto_dispatch_executed_email",
      toolStatuses: ["success"],
    });
    expect(recordSamanthaDispatchEvent).toHaveBeenCalledTimes(1);
    expect(recordSamanthaDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "samantha_auto_dispatch_complete",
        status: "pass",
        reasonCode: "auto_dispatch_executed_email",
      }),
    );
  });

  it("suppresses nested telemetry when no Samantha runtime or intent signal is present", () => {
    const recordSamanthaDispatchEvent = vi.fn();
    const result = executeSamanthaPostDispatchTelemetryFinalization(
      buildArgs({
        inboundMessage: "hello",
        actionCompletionClaimedOutcomes: [],
        runtimeCapabilityGapBlocked: false,
        samanthaAuditAutoDispatchPlan: buildPlan({
          requestDetected: false,
          shouldDispatch: false,
          alreadyAttempted: false,
        }),
        samanthaAuditAutoDispatchAttempted: false,
        samanthaAuditAutoDispatchExecuted: false,
        samanthaAuditAutoDispatchToolResults: [],
        samanthaAutoDispatchInvocationStatus: "queued_pending_approval",
        samanthaDispatchTerminalReasonCode: "blocked_missing_required_fields",
        recordSamanthaDispatchEvent,
      }),
    );

    expect(result.samanthaDispatchIntentObserved).toBe(false);
    expect(result.shouldEmitSamanthaAutoDispatchTelemetry).toBe(false);
    expect(result.samanthaAutoDispatchTelemetry).toBeUndefined();
    expect(result.samanthaAutoDispatchInvocationStatus).toBe("not_attempted");
    expect(result.samanthaDispatchTerminalReasonCode).toBe("blocked_missing_required_fields");
    expect(recordSamanthaDispatchEvent).toHaveBeenCalledTimes(1);
    expect(recordSamanthaDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "samantha_auto_dispatch_complete",
        status: "skip",
        reasonCode: "blocked_missing_required_fields",
      }),
    );
  });
});
