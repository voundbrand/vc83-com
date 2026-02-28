import { describe, expect, it } from "vitest";
import { buildConversationContinuityTelemetry } from "../../../convex/ai/conversations";

describe("conversation continuity telemetry contract", () => {
  it("builds a deterministic continuity key from collaboration lineage and thread identity", () => {
    const telemetry = buildConversationContinuityTelemetry({
      conversationId: "conv_1",
      organizationId: "org_1",
      userId: "user_1",
      ingressSurface: "desktop",
      previousIngressSurface: "iphone",
      collaboration: {
        threadType: "group_thread",
        threadId: "group:123",
        groupThreadId: "group:123",
        lineageId: "lineage:abc",
        correlationId: "corr:xyz",
        workflowKey: "message_ingress",
        authorityIntentType: "commit",
      },
      idempotencyKey: "idem-123",
      idempotencyContract: {
        scopeKey: "scope:explicit",
        payloadHash: "hash:1",
        intentType: "commit",
        replayOutcome: "accepted",
      },
      occurredAt: 1700000000000,
    });

    expect(telemetry.continuityKey).toBe("org_1:lineage:abc:group:123");
    expect(telemetry.crossChannelContinuation).toBe(true);
    expect(telemetry.idempotency.intentType).toBe("commit");
    expect(telemetry.idempotency.scopeKey).toBe("scope:explicit");
    expect(telemetry.idempotency.isReplay).toBe(false);
  });

  it("falls back to conversation scope and marks duplicate replays as replay traffic", () => {
    const telemetry = buildConversationContinuityTelemetry({
      conversationId: "conv_2",
      organizationId: "org_2",
      userId: "user_2",
      ingressSurface: "iphone",
      idempotencyKey: "idem-duplicate",
      idempotencyContract: {
        replayOutcome: "replay_previous_result",
      },
    });

    expect(telemetry.groupThreadId).toBe("conv_2");
    expect(telemetry.sessionThreadId).toBe("conv_2");
    expect(telemetry.continuityKey).toBe("org_2:conv_2:conv_2");
    expect(telemetry.idempotency.scopeKey).toBe("org_2:conv_2:ingress");
    expect(telemetry.idempotency.isReplay).toBe(true);
  });

  it("fails closed for missing identity primitives", () => {
    expect(() =>
      buildConversationContinuityTelemetry({
        conversationId: "",
        organizationId: "org_3",
        userId: "user_3",
        ingressSurface: "chat",
        idempotencyKey: "idem-3",
      })
    ).toThrow(/requires non-empty conversationId, organizationId, userId, and idempotencyKey/);
  });
});
