import { describe, expect, it } from "vitest";
import { buildAgentSystemPrompt } from "../../../convex/ai/agentExecution";
import {
  buildModelResolutionPayload,
  resolveChatToolApprovalPolicy,
} from "../../../convex/ai/chat";

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
    expect(payload.selectedModel).toBe("openai/gpt-4o-mini");
  });

  it("treats dangerous approval mode as no-op when human loop is disabled", () => {
    const policy = resolveChatToolApprovalPolicy({
      humanInLoopEnabled: false,
      toolApprovalMode: "dangerous",
    });

    expect(policy.autonomyLevel).toBe("autonomous");
    expect(policy.requireApprovalFor).toEqual([]);
  });
});
