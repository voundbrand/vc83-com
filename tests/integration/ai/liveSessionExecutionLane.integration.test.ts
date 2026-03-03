import { describe, expect, it } from "vitest";
import { resolveLiveSessionExecutionLaneMetadata } from "../../../convex/ai/chat";

describe("live-session execution lane integration", () => {
  it("normalizes multimodal tool/MCP execution metadata with non-bypassable approval invariant", () => {
    const metadata = resolveLiveSessionExecutionLaneMetadata({
      liveSessionId: "live_orv_038_1",
      conversationRuntime: {
        contractVersion: "conversation_interaction_v1",
        mode: "voice_with_eyes",
        state: "live",
        sourceMode: "meta_glasses",
        mcpOrchestration: {
          required: true,
        },
        handoff: {
          fromAgent: "agent_primary",
          toAgentId: "agent_specialist",
          id: "handoff_001",
          reason: "specialist_required",
        },
      },
      commandPolicy: {
        attemptedCommands: ["preview_meeting_concierge", "mcp.route.specialist"],
      },
    });

    expect(metadata).toEqual({
      contractVersion: "live_session_execution_lane_v1",
      liveSessionId: "live_orv_038_1",
      mode: "voice_with_eyes",
      state: "live",
      sourceMode: "meta_glasses",
      approvalInvariant: "non_bypassable",
      mcpOrchestration: {
        enabled: true,
        route: "session_scoped_mcp",
      },
      handoff: {
        fromAgentId: "agent_primary",
        toAgentId: "agent_specialist",
        handoffId: "handoff_001",
        reason: "specialist_required",
      },
    });
  });

  it("fails closed on unknown mode/state while preserving approval invariants", () => {
    const metadata = resolveLiveSessionExecutionLaneMetadata({
      liveSessionId: "live_orv_038_2",
      conversationRuntime: {
        mode: "unknown_mode",
        state: "unknown_state",
        requestedEyesSource: "webcam",
      },
      commandPolicy: {
        attemptedCommands: ["assemble_payload"],
      },
    });

    expect(metadata).toEqual({
      contractVersion: "live_session_execution_lane_v1",
      liveSessionId: "live_orv_038_2",
      mode: undefined,
      state: undefined,
      sourceMode: "webcam",
      approvalInvariant: "non_bypassable",
      mcpOrchestration: {
        enabled: false,
        route: "session_scoped_mcp",
      },
      handoff: undefined,
    });
  });

  it("returns undefined when no live execution lane signals are present", () => {
    const metadata = resolveLiveSessionExecutionLaneMetadata({
      liveSessionId: undefined,
      conversationRuntime: undefined,
      commandPolicy: undefined,
    });

    expect(metadata).toBeUndefined();
  });
});
