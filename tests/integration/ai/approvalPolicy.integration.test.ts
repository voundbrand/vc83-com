import { describe, expect, it } from "vitest";
import { shouldRequireToolApproval } from "../../../convex/ai/escalation";
import { resolveChatToolApprovalPolicy } from "../../../convex/ai/chat";

describe("chat/agent approval policy consistency", () => {
  it("keeps chat 'all' mode aligned with supervised tool approval semantics", () => {
    const chatPolicy = resolveChatToolApprovalPolicy({
      humanInLoopEnabled: true,
      toolApprovalMode: "all",
    });

    const chatDecision = shouldRequireToolApproval({
      autonomyLevel: chatPolicy.autonomyLevel,
      toolName: "list_forms",
      requireApprovalFor: chatPolicy.requireApprovalFor,
    });
    const agentDecision = shouldRequireToolApproval({
      autonomyLevel: "supervised",
      toolName: "list_forms",
    });

    expect(chatDecision).toBe(true);
    expect(chatDecision).toBe(agentDecision);
  });

  it("keeps chat 'dangerous' mode aligned with autonomous requireApprovalFor semantics", () => {
    const chatPolicy = resolveChatToolApprovalPolicy({
      humanInLoopEnabled: true,
      toolApprovalMode: "dangerous",
    });

    const tools = ["process_payment", "list_forms"];
    for (const toolName of tools) {
      const chatDecision = shouldRequireToolApproval({
        autonomyLevel: chatPolicy.autonomyLevel,
        toolName,
        requireApprovalFor: chatPolicy.requireApprovalFor,
      });
      const agentDecision = shouldRequireToolApproval({
        autonomyLevel: "autonomous",
        toolName,
        requireApprovalFor: chatPolicy.requireApprovalFor,
      });

      expect(chatDecision).toBe(agentDecision);
    }
  });

  it("keeps chat no-approval settings aligned with non-supervised escalation path", () => {
    const chatPolicy = resolveChatToolApprovalPolicy({
      humanInLoopEnabled: false,
      toolApprovalMode: "none",
    });

    const chatDecision = shouldRequireToolApproval({
      autonomyLevel: chatPolicy.autonomyLevel,
      toolName: "process_payment",
      requireApprovalFor: chatPolicy.requireApprovalFor,
    });
    const agentDecision = shouldRequireToolApproval({
      autonomyLevel: "autonomous",
      toolName: "process_payment",
      requireApprovalFor: [],
    });

    expect(chatDecision).toBe(false);
    expect(chatDecision).toBe(agentDecision);
  });
});
