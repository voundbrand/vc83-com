import { describe, expect, it } from "vitest";
import { shouldRequireToolApproval } from "../../../convex/ai/escalation";
import { resolveChatToolApprovalPolicy } from "../../../convex/ai/chat";

describe("polymarket approval policy integration", () => {
  it("requires approval for native live execution regardless autonomy mode", () => {
    expect(
      shouldRequireToolApproval({
        autonomyLevel: "autonomous",
        toolName: "execute_polymarket_live",
        requireApprovalFor: [],
        toolArgs: {
          action: "execute_live_order",
          executionMode: "live",
        },
      }),
    ).toBe(true);

    expect(
      shouldRequireToolApproval({
        autonomyLevel: "draft_only",
        toolName: "execute_polymarket_live",
        requireApprovalFor: [],
        toolArgs: {
          action: "execute_live_order",
          executionMode: "live",
        },
      }),
    ).toBe(true);
  });

  it("keeps chat no-approval policy aligned with agent runtime for live polymarket actions", () => {
    const chatPolicy = resolveChatToolApprovalPolicy({
      humanInLoopEnabled: false,
      toolApprovalMode: "none",
    });

    const chatDecision = shouldRequireToolApproval({
      autonomyLevel: chatPolicy.autonomyLevel,
      toolName: "execute_polymarket_live",
      requireApprovalFor: chatPolicy.requireApprovalFor,
      toolArgs: {
        action: "execute_live_order",
        executionMode: "live",
      },
    });
    const agentDecision = shouldRequireToolApproval({
      autonomyLevel: "autonomous",
      toolName: "execute_polymarket_live",
      requireApprovalFor: [],
      toolArgs: {
        action: "execute_live_order",
        executionMode: "live",
      },
    });

    expect(chatDecision).toBe(true);
    expect(chatDecision).toBe(agentDecision);
  });

  it("does not force approval for polymarket research/paper tool in autonomous mode", () => {
    expect(
      shouldRequireToolApproval({
        autonomyLevel: "autonomous",
        toolName: "manage_polymarket",
        requireApprovalFor: [],
        toolArgs: {
          action: "discover_markets",
        },
      }),
    ).toBe(false);
  });
});
