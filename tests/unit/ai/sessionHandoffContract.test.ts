import { describe, expect, it } from "vitest";
import { isValidSessionHandoffTarget } from "../../../convex/ai/agentSessions";
import { buildSessionHandoffPayload } from "@/components/window-content/agents/session-handoff";
import type { Id } from "../../../convex/_generated/dataModel";

const mockAgentSessionId = "agent_session_1" as Id<"agentSessions">;

describe("session handoff contract", () => {
  it("builds a valid handoff payload only when a target user is selected", () => {
    const valid = buildSessionHandoffPayload({
      sessionId: "session_123",
      agentSessionId: mockAgentSessionId,
      handOffToUserId: "user_123",
    });
    const missingUser = buildSessionHandoffPayload({
      sessionId: "session_123",
      agentSessionId: mockAgentSessionId,
      handOffToUserId: "   ",
    });

    expect(valid).toEqual({
      sessionId: "session_123",
      agentSessionId: mockAgentSessionId,
      handOffToUserId: "user_123",
    });
    expect(missingUser).toBeNull();
  });

  it("accepts handoff targets only for active org members", () => {
    expect(isValidSessionHandoffTarget("user_123", ["user_123", "user_456"])).toBe(
      true
    );
    expect(isValidSessionHandoffTarget("user_999", ["user_123", "user_456"])).toBe(
      false
    );
    expect(isValidSessionHandoffTarget("   ", ["user_123"])).toBe(false);
  });
});
