import { describe, expect, it, vi } from "vitest";

import { SAMANTHA_AGENT_RUNTIME_MODULE_KEY } from "../../../convex/ai/agentSpecRegistry";
import {
  executeSamanthaPostOutputGuardrails,
  executeSamanthaSourceContextRuntimeInitialization,
} from "../../../convex/ai/agents/samantha/runtimeModule";
import { AUDIT_DELIVERABLE_TOOL_NAME } from "../../../convex/ai/samanthaAuditContract";

describe("Samantha runtime module helpers", () => {
  it("resolves source context and emits source-context trace stage", () => {
    const recordSamanthaDispatchEvent = vi.fn();

    const result = executeSamanthaSourceContextRuntimeInitialization({
      ingressChannel: "webchat",
      externalContactIdentifier: "source_session_123",
      metadata: {},
      recordSamanthaDispatchEvent,
    });

    expect(result.samanthaAuditSourceContext).toMatchObject({
      ingressChannel: "webchat",
      sourceAuditChannel: "webchat",
      sourceSessionToken: "source_session_123",
    });
    expect(recordSamanthaDispatchEvent).toHaveBeenCalledTimes(1);
    expect(recordSamanthaDispatchEvent).toHaveBeenCalledWith({
      stage: "samantha_source_context",
      status: "pass",
      reasonCode: "source_context_resolved",
      detail: {
        ingressChannel: "webchat",
        sourceAuditChannel: "webchat",
        hasSourceSessionToken: true,
      },
    });
  });

  it("uses successful audit-deliverable payload fallback copy when assistant content is empty", () => {
    const resolveActionCompletionSanitizationFallbackMessage = vi.fn(() => "fallback");

    const result = executeSamanthaPostOutputGuardrails({
      assistantContent: "",
      toolResults: [
        {
          tool: AUDIT_DELIVERABLE_TOOL_NAME,
          status: "success",
          result: {
            leadEmailDelivery: {
              success: true,
            },
            salesEmailDelivery: {
              success: false,
            },
          },
        },
      ],
      actionCompletionResponseLanguage: "en",
      authorityConfig: {
        runtimeModuleKey: "other_runtime_module",
      },
      resolveActionCompletionSanitizationFallbackMessage,
      recordSamanthaDispatchEvent: vi.fn(),
    });

    expect(result.actionCompletionSanitizationFallbackApplied).toBe(true);
    expect(result.assistantContent).toBe(
      "Your audit results are being delivered by email.\nDelivery emails have been triggered.",
    );
    expect(resolveActionCompletionSanitizationFallbackMessage).not.toHaveBeenCalled();
  });

  it("applies Samantha email-only guardrail on fallback content and emits trace event", () => {
    const recordSamanthaDispatchEvent = vi.fn();

    const result = executeSamanthaPostOutputGuardrails({
      assistantContent: "",
      toolResults: [],
      actionCompletionResponseLanguage: "en",
      authorityConfig: {
        runtimeModuleKey: SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
      },
      resolveActionCompletionSanitizationFallbackMessage: () => "I will send the PDF now.",
      recordSamanthaDispatchEvent,
    });

    expect(result.actionCompletionSanitizationFallbackApplied).toBe(true);
    expect(result.assistantContent).toBe("I will send the email delivery now.");
    expect(recordSamanthaDispatchEvent).toHaveBeenCalledTimes(1);
    expect(recordSamanthaDispatchEvent).toHaveBeenCalledWith({
      stage: "samantha_email_only_output_guard",
      status: "pass",
      reasonCode: "samantha_email_only_guard_rewritten",
    });
  });
});
