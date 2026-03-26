import { describe, expect, it, vi } from "vitest";

import { SAMANTHA_AGENT_RUNTIME_MODULE_KEY } from "../../../convex/ai/agentSpecRegistry";
import {
  executeSamanthaAutoDispatchRuntimeFlow,
  type SamanthaAutoDispatchRuntimeEnforcementPayloadLike,
  type SamanthaAutoDispatchRuntimeFlowArgs,
} from "../../../convex/ai/agents/samantha/runtimeModule";
import {
  AUDIT_DELIVERABLE_OUTCOME_KEY,
  AUDIT_DELIVERABLE_TOOL_NAME,
} from "../../../convex/ai/samanthaAuditContract";

interface TestEnforcementPayload extends SamanthaAutoDispatchRuntimeEnforcementPayloadLike {
  contractVersion: string;
  status: "pass" | "enforced";
  observedViolation: boolean;
}

function buildPayload(
  overrides: Partial<TestEnforcementPayload> = {},
): TestEnforcementPayload {
  return {
    contractVersion: "test_contract",
    status: "pass",
    observedViolation: false,
    reasonCode: undefined,
    preflightReasonCode: undefined,
    preflightMissingRequiredFields: undefined,
    outcome: undefined,
    requiredTools: [],
    availableTools: [AUDIT_DELIVERABLE_TOOL_NAME],
    enforcementMode: "enforce",
    ...overrides,
  };
}

function buildBaseArgs(
  overrides: Partial<SamanthaAutoDispatchRuntimeFlowArgs<TestEnforcementPayload>> = {},
): SamanthaAutoDispatchRuntimeFlowArgs<TestEnforcementPayload> {
  return {
    runtimeCapabilityGapBlocked: false,
    organizationId: "org_1",
    authorityAgentId: "agent_1",
    sessionId: "session_1",
    turnId: "turn_1",
    authorityConfig: {
      runtimeModuleKey: SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
    },
    inboundMessage: [
      "first_name: Ava",
      "last_name: Rivers",
      "email: ava@example.com",
      "phone: +1 415 555 1212",
      "founder contact preference: yes",
      "Generate PDF now.",
    ].join("\n"),
    assistantContent: "Generating your report.",
    actionCompletionRawAssistantContent: "Generating your report.",
    actionCompletionResponseLanguage: "en",
    toolCalls: [],
    availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
    toolResults: [],
    sessionHistorySnapshot: [
      {
        role: "user",
        content: "Please send the report.",
      },
    ],
    contactMemory: [],
    samanthaAuditSourceContext: {
      ingressChannel: "webchat",
      sourceAuditChannel: "webchat",
      sourceSessionToken: "source_session_1",
      originSurface: "native_guest_webchat",
    },
    samanthaDispatchTraceCorrelationId: "corr_1",
    errorStateDirty: false,
    recordSamanthaDispatchEvent: vi.fn(),
    resolveAuditSessionForDeliverableInternal: vi.fn(async () => ({
      capturedEmail: "ava@example.com",
      capturedName: "Ava Rivers",
      workflowRecommendation: "Automate lead routing.",
    })),
    ensureAuditModeSessionForDeliverable: vi.fn(async () => {}),
    executeAutoDispatchToolCall: vi.fn(async () => ({
      toolResults: [
        {
          tool: AUDIT_DELIVERABLE_TOOL_NAME,
          status: "success",
        },
      ],
      errorStateDirty: false,
    })),
    resolveAuditDeliverableInvocationGuardrail: vi.fn(() => ({
      enforced: false,
      payload: buildPayload(),
    })),
    resolveActionCompletionResponseLanguage: vi.fn(() => "en"),
    extractActionCompletionClaimsFromAssistantContent: vi.fn((content: string) => ({
      sanitizedContent: content,
    })),
    onError: vi.fn(),
    onWarn: vi.fn(),
    ...overrides,
  };
}

describe("Samantha auto-dispatch runtime flow", () => {
  it("bootstraps missing audit session and executes auto-dispatch", async () => {
    const resolveAuditSessionForDeliverableInternal = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        capturedEmail: "ava@example.com",
        capturedName: "Ava Rivers",
        workflowRecommendation: "Automate lead routing.",
      });
    const ensureAuditModeSessionForDeliverable = vi.fn(async () => {});
    const executeAutoDispatchToolCall = vi.fn(async () => ({
      toolResults: [
        {
          tool: AUDIT_DELIVERABLE_TOOL_NAME,
          status: "success" as const,
        },
      ],
      errorStateDirty: false,
    }));
    const guardrail = vi.fn(() => ({
      enforced: false,
      payload: buildPayload(),
    }));
    const args = buildBaseArgs({
      resolveAuditSessionForDeliverableInternal,
      ensureAuditModeSessionForDeliverable,
      executeAutoDispatchToolCall,
      resolveAuditDeliverableInvocationGuardrail: guardrail,
      toolCalls: [
        {
          function: {
            name: AUDIT_DELIVERABLE_TOOL_NAME,
          },
        },
      ],
    });

    const result = await executeSamanthaAutoDispatchRuntimeFlow(args);

    expect(resolveAuditSessionForDeliverableInternal).toHaveBeenCalledTimes(2);
    expect(ensureAuditModeSessionForDeliverable).toHaveBeenCalledTimes(1);
    expect(executeAutoDispatchToolCall).toHaveBeenCalledTimes(1);
    expect(result.preflightAuditSessionFound).toBe(true);
    expect(result.samanthaAuditAutoDispatchPlan?.shouldDispatch).toBe(true);
    expect(result.samanthaAuditAutoDispatchExecuted).toBe(true);
    expect(result.samanthaAuditDispatchDecision).toBe("auto_dispatch_executed_email");
    expect(result.samanthaDispatchTerminalReasonCode).toBe("auto_dispatch_executed_email");
    expect(result.samanthaAutoDispatchInvocationStatus).toBe("executed_success");
    expect(executeAutoDispatchToolCall.mock.calls[0]?.[0]).toMatchObject({
      toolArgs: {
        sourceSessionToken: "source_session_1",
        sourceAuditChannel: "webchat",
        language: "en",
      },
    });
  });

  it("runs claim-recovery auto-dispatch when enforcement reports claim_tool_not_observed", async () => {
    const executeAutoDispatchToolCall = vi.fn(async () => ({
      toolResults: [
        {
          tool: AUDIT_DELIVERABLE_TOOL_NAME,
          status: "success" as const,
        },
      ],
      errorStateDirty: false,
    }));
    const guardrail = vi.fn()
      .mockImplementationOnce(() => ({
        enforced: true,
        assistantContent: "Retrying with verified dispatch.",
        payload: buildPayload({
          status: "enforced",
          observedViolation: true,
          reasonCode: "claim_tool_not_observed",
          outcome: AUDIT_DELIVERABLE_OUTCOME_KEY,
          requiredTools: [AUDIT_DELIVERABLE_TOOL_NAME],
        }),
      }))
      .mockImplementationOnce(() => ({
        enforced: false,
        payload: buildPayload(),
      }));
    const args = buildBaseArgs({
      inboundMessage: [
        "first_name: Ava",
        "last_name: Rivers",
        "email: ava@example.com",
        "phone: +1 415 555 1212",
        "founder contact preference: yes",
      ].join("\n"),
      resolveAuditDeliverableInvocationGuardrail: guardrail,
      executeAutoDispatchToolCall,
    });

    const result = await executeSamanthaAutoDispatchRuntimeFlow(args);

    expect(result.samanthaAuditAutoDispatchPlan?.requestDetected).toBe(false);
    expect(result.samanthaAuditAutoDispatchPlan?.shouldDispatch).toBe(false);
    expect(result.samanthaClaimRecoveryDecision).toMatchObject({
      shouldAttempt: true,
      reasonCode: "eligible_for_recovery",
    });
    expect(result.samanthaAuditRecoveryAttempted).toBe(true);
    expect(executeAutoDispatchToolCall).toHaveBeenCalledTimes(1);
    expect(guardrail).toHaveBeenCalledTimes(2);
    expect(result.samanthaAuditDispatchDecision).toBe("auto_dispatch_executed_email");
    expect(result.samanthaAutoDispatchInvocationStatus).toBe("executed_success");
  });

  it("skips auto-dispatch execution when runtime capability gap already blocked the turn", async () => {
    const executeAutoDispatchToolCall = vi.fn(async () => ({
      toolResults: [],
      errorStateDirty: false,
    }));
    const guardrail = vi.fn(() => ({
      enforced: false,
      payload: buildPayload(),
    }));
    const args = buildBaseArgs({
      runtimeCapabilityGapBlocked: true,
      executeAutoDispatchToolCall,
      resolveAuditDeliverableInvocationGuardrail: guardrail,
    });

    const result = await executeSamanthaAutoDispatchRuntimeFlow(args);

    expect(executeAutoDispatchToolCall).not.toHaveBeenCalled();
    expect(guardrail).not.toHaveBeenCalled();
    expect(result.samanthaAuditAutoDispatchPlan).toBeNull();
    expect(result.samanthaAutoDispatchInvocationStatus).toBe("not_attempted");
    expect(result.samanthaDispatchTerminalReasonCode).toBe("runtime_capability_gap_blocked");
  });
});
