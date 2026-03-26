import { describe, expect, it, vi } from "vitest";
import {
  buildAgentSystemPrompt,
  resolveAuditDeliverableInvocationGuardrail,
} from "../../../convex/ai/agentExecution";
import { persistRuntimeTurnArtifacts } from "../../../convex/ai/agentTurnOrchestration";
import {
  buildModelResolutionPayload,
  resolveChatToolApprovalPolicy,
} from "../../../convex/ai/chat";
import {
  ACTION_COMPLETION_CLAIM_CONTRACT_VERSION,
  ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION,
  AUDIT_DELIVERABLE_OUTCOME_KEY,
  AUDIT_DELIVERABLE_TOOL_NAME,
  SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
} from "../../../convex/ai/samanthaAuditContract";

describe("runtime hotspot characterization", () => {
  it("uses legacy handoff contextSummary when summary is absent", () => {
    const prompt = buildAgentSystemPrompt(
      {
        displayName: "Specialist",
        autonomyLevel: "autonomous",
      },
      [],
      undefined,
      undefined,
      undefined,
      {
        lastHandoff: {
          fromAgent: "PM",
          reason: "Need domain specialist follow-up",
          contextSummary: "Legacy context summary is still present",
        },
      }
    );

    expect(prompt).toContain("Summary: Legacy context summary is still present");
  });

  it("keeps retry-chain fallback precedence when multiple fallback signals overlap", () => {
    const payload = buildModelResolutionPayload({
      selectedModel: "anthropic/claude-sonnet-4.5",
      usedModel: "openai/gpt-4o-mini",
      selectionSource: "org_default",
      selectedAuthProfileId: "primary",
      usedAuthProfileId: "secondary",
    });

    expect(payload.fallbackUsed).toBe(true);
    expect(payload.fallbackReason).toBe("retry_chain");
    expect(payload.selectedModel).toBe("anthropic/claude-sonnet-4.5");
    expect(payload.usedModel).toBe("openai/gpt-4o-mini");
  });

  it("treats dangerous approval mode as no-op when human loop is disabled", () => {
    const policy = resolveChatToolApprovalPolicy({
      humanInLoopEnabled: false,
      toolApprovalMode: "dangerous",
    });

    expect(policy.autonomyLevel).toBe("autonomous");
    expect(policy.requireApprovalFor).toEqual([]);
  });

  it("keeps Samantha fail-closed rewrite characterization matrix stable after adapter extraction", () => {
    const enforcementContract = {
      contractVersion: ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION,
      mode: "enforce" as const,
      outcomes: [
        {
          outcome: AUDIT_DELIVERABLE_OUTCOME_KEY,
          requiredTools: [AUDIT_DELIVERABLE_TOOL_NAME],
          unavailableMessage: "tool unavailable",
          notObservedMessage: "tool not observed",
        },
      ],
    };
    const completionClaim = [
      "```action_completion_claim",
      JSON.stringify({
        contractVersion: ACTION_COMPLETION_CLAIM_CONTRACT_VERSION,
        outcome: AUDIT_DELIVERABLE_OUTCOME_KEY,
        status: "completed",
      }),
      "```",
    ].join("\n");

    const matrix = [
      {
        label: "tool_unavailable",
        result: resolveAuditDeliverableInvocationGuardrail({
          authorityConfig: {
            templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
            actionCompletionContract: enforcementContract,
          },
          inboundMessage: "Generate the workflow report now.",
          assistantContent: `Running now.\n\n${completionClaim}`,
          toolResults: [],
          availableToolNames: [],
        }),
      },
      {
        label: "tool_not_observed",
        result: resolveAuditDeliverableInvocationGuardrail({
          authorityConfig: {
            templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
            actionCompletionContract: enforcementContract,
          },
          inboundMessage: [
            "first_name: Ava",
            "last_name: Rivers",
            "email: ava@example.com",
            "phone: +1 415 555 1212",
            "founder contact preference: yes",
            "Generate the workflow report now.",
          ].join("\n"),
          assistantContent: `Running now.\n\n${completionClaim}`,
          toolResults: [],
          availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
          recentUserMessages: [
            "first_name: Ava",
            "last_name: Rivers",
            "email: ava@example.com",
            "phone: +1 415 555 1212",
            "founder contact preference: yes",
          ],
          capturedEmail: null,
          capturedName: null,
          contactMemory: [],
        }),
      },
      {
        label: "missing_required_fields",
        result: resolveAuditDeliverableInvocationGuardrail({
          authorityConfig: {
            templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
            actionCompletionContract: enforcementContract,
          },
          inboundMessage: "Generate the workflow report now.",
          assistantContent: `Running now.\n\n${completionClaim}`,
          toolResults: [],
          availableToolNames: [AUDIT_DELIVERABLE_TOOL_NAME],
          recentUserMessages: ["Need this today."],
          capturedEmail: null,
          capturedName: null,
        }),
      },
    ].map((entry) => ({
      label: entry.label,
      enforced: entry.result.enforced,
      reason: entry.result.reason,
      reasonCode: entry.result.payload.reasonCode,
      preflightReasonCode: entry.result.payload.preflightReasonCode || null,
      rewriteSnippet:
        entry.label === "tool_unavailable"
          ? (
              entry.result.assistantContent?.includes(
                "not available yet in runtime scope"
              )
              || entry.result.assistantContent?.includes(
                "not available yet in the current runtime scope"
              )
            )
            || false
          : entry.label === "tool_not_observed"
            ? entry.result.assistantContent?.includes("retry delivery") || false
            : entry.result.assistantContent?.includes("I captured these details so far:") || false,
    }));

    expect(matrix).toEqual([
      {
        label: "tool_unavailable",
        enforced: true,
        reason: "tool_unavailable",
        reasonCode: "claim_tool_unavailable",
        preflightReasonCode: "tool_unavailable",
        rewriteSnippet: true,
      },
      {
        label: "tool_not_observed",
        enforced: true,
        reason: "tool_not_invoked",
        reasonCode: "claim_tool_not_observed",
        preflightReasonCode: "tool_not_observed",
        rewriteSnippet: true,
      },
      {
        label: "missing_required_fields",
        enforced: true,
        reason: "missing_required_fields",
        reasonCode: "claim_tool_not_observed",
        preflightReasonCode: "missing_required_fields",
        rewriteSnippet: true,
      },
    ]);
  });

  it("finalizes receipt as completed when runtime exits without fatal error", async () => {
    const recordTurnTerminalDeliverable = vi
      .fn()
      .mockResolvedValue({ success: true });
    const completeInboundReceipt = vi.fn().mockResolvedValue({ success: true });

    const terminalDeliverable = await persistRuntimeTurnArtifacts({
      receiptId: "agentInboxReceipts_1" as never,
      turnId: "agentTurns_1" as never,
      runtimeError: null,
      recordTurnTerminalDeliverable,
      completeInboundReceipt,
    });

    expect(terminalDeliverable.status).toBe("success");
    expect(recordTurnTerminalDeliverable).toHaveBeenCalledTimes(1);
    expect(recordTurnTerminalDeliverable).toHaveBeenCalledWith(
      expect.objectContaining({
        turnId: "agentTurns_1",
        status: "success",
      }),
    );
    expect(completeInboundReceipt).toHaveBeenCalledTimes(1);
    expect(completeInboundReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        receiptId: "agentInboxReceipts_1",
        turnId: "agentTurns_1",
        status: "completed",
      }),
    );
  });

  it("finalizes receipt as failed under runtime error and preserves terminal pointer evidence", async () => {
    const recordTurnTerminalDeliverable = vi
      .fn()
      .mockResolvedValue({ success: true });
    const completeInboundReceipt = vi.fn().mockResolvedValue({ success: true });

    const terminalDeliverable = await persistRuntimeTurnArtifacts({
      receiptId: "agentInboxReceipts_2" as never,
      turnId: "agentTurns_2" as never,
      runtimeError: "outbound_delivery_timeout",
      terminalDeliverable: {
        pointerType: "dead_letter_queue",
        pointerId: "dlq-entry-1",
        status: "failed",
        recordedAt: 123,
      },
      recordTurnTerminalDeliverable,
      completeInboundReceipt,
    });

    expect(terminalDeliverable).toEqual({
      pointerType: "dead_letter_queue",
      pointerId: "dlq-entry-1",
      status: "failed",
      recordedAt: 123,
    });
    expect(recordTurnTerminalDeliverable).toHaveBeenCalledTimes(1);
    expect(recordTurnTerminalDeliverable).toHaveBeenCalledWith(
      expect.objectContaining({
        turnId: "agentTurns_2",
        pointerType: "dead_letter_queue",
        pointerId: "dlq-entry-1",
        status: "failed",
      }),
    );
    expect(completeInboundReceipt).toHaveBeenCalledTimes(1);
    expect(completeInboundReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        receiptId: "agentInboxReceipts_2",
        turnId: "agentTurns_2",
        status: "failed",
        failureReason: "outbound_delivery_timeout",
        terminalDeliverable: {
          pointerType: "dead_letter_queue",
          pointerId: "dlq-entry-1",
          status: "failed",
          recordedAt: 123,
        },
      }),
    );
  });
});
