import { describe, expect, it } from "vitest";
import {
  buildControlCenterSortScore,
  sortControlCenterThreadRows,
  type ControlCenterThreadRow,
} from "../../../convex/ai/agentSessions";
import { resolveThreadDeliveryState } from "../../../convex/ai/agentExecution";

const baseRow: ControlCenterThreadRow = {
  threadId: "thread-a",
  sessionId: "session-a",
  organizationId: "org-1",
  templateAgentId: "agent-template",
  templateAgentName: "Agent",
  lifecycleState: "active",
  deliveryState: "queued",
  escalationCountOpen: 0,
  escalationUrgency: null,
  waitingOnHuman: false,
  activeInstanceCount: 1,
  channel: "webchat",
  externalContactIdentifier: "customer@example.com",
  lastMessagePreview: "Preview",
  unreadCount: 0,
  pinned: false,
  updatedAt: 1000,
  sortScore: 1000,
};

describe("control center thread sort scoring", () => {
  it("prioritizes waiting-on-human threads over newer non-waiting threads", () => {
    const waitingThread = {
      ...baseRow,
      threadId: "thread-waiting",
      waitingOnHuman: true,
      lifecycleState: "escalated" as const,
      escalationCountOpen: 1,
      escalationUrgency: "high" as const,
      sortScore: buildControlCenterSortScore({
        waitingOnHuman: true,
        escalationUrgency: "high",
        escalationCountOpen: 1,
        updatedAt: 100,
      }),
    };
    const newerThread = {
      ...baseRow,
      threadId: "thread-newer",
      updatedAt: 999_999,
      sortScore: buildControlCenterSortScore({
        waitingOnHuman: false,
        escalationUrgency: null,
        escalationCountOpen: 0,
        updatedAt: 999_999,
      }),
    };

    const sorted = sortControlCenterThreadRows([newerThread, waitingThread]);
    expect(sorted[0].threadId).toBe("thread-waiting");
  });

  it("weights urgency tiers deterministically", () => {
    const high = buildControlCenterSortScore({
      waitingOnHuman: true,
      escalationUrgency: "high",
      escalationCountOpen: 1,
      updatedAt: 100,
    });
    const normal = buildControlCenterSortScore({
      waitingOnHuman: true,
      escalationUrgency: "normal",
      escalationCountOpen: 1,
      updatedAt: 100,
    });
    const low = buildControlCenterSortScore({
      waitingOnHuman: true,
      escalationUrgency: "low",
      escalationCountOpen: 1,
      updatedAt: 100,
    });

    expect(high).toBeGreaterThan(normal);
    expect(normal).toBeGreaterThan(low);
  });
});

describe("thread delivery state resolver", () => {
  it("keeps delivery/work status separate from lifecycle and maps escalation hold states to blocked", () => {
    expect(
      resolveThreadDeliveryState({
        sessionStatus: "active",
        escalationStatus: "pending",
        latestTurnState: "queued",
      })
    ).toBe("blocked");
    expect(
      resolveThreadDeliveryState({
        sessionStatus: "handed_off",
        escalationStatus: "taken_over",
        latestTurnState: "running",
      })
    ).toBe("blocked");
  });

  it("maps runtime turn outcomes to delivery states", () => {
    expect(resolveThreadDeliveryState({ latestTurnState: "running" })).toBe("running");
    expect(resolveThreadDeliveryState({ latestTurnState: "failed" })).toBe("failed");
    expect(resolveThreadDeliveryState({ latestTurnState: "completed" })).toBe("done");
  });
});
