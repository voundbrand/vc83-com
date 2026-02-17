import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deliverAssistantResponseWithFallback,
  type OutboundDeliveryContext,
  type OutboundDeliveryRefs,
} from "../../../convex/ai/outboundDelivery";

const refs: OutboundDeliveryRefs = {
  sendMessage: "sendMessageRef",
  addToDeadLetterQueue: "addToDeadLetterQueueRef",
};

function makeContext(): OutboundDeliveryContext & {
  runAction: ReturnType<typeof vi.fn>;
  runMutation: ReturnType<typeof vi.fn>;
} {
  return {
    runAction: vi.fn(),
    runMutation: vi.fn(),
  };
}

describe("outbound delivery boundary integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not call provider adapters for api_test traffic", async () => {
    const ctx = makeContext();

    const result = await deliverAssistantResponseWithFallback(ctx, refs, {
      organizationId: "org_1" as never,
      channel: "api_test",
      recipientIdentifier: "contact-x",
      assistantContent: "Synthetic test message",
      sessionId: "session-api-test",
    });

    expect(result).toEqual({ skipped: true, delivered: false, queuedToDeadLetter: false });
    expect(ctx.runAction).not.toHaveBeenCalled();
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });

  it("preserves session flow when provider and DLQ both fail", async () => {
    const ctx = makeContext();
    ctx.runAction.mockRejectedValue(new Error("provider unavailable"));
    ctx.runMutation.mockRejectedValue(new Error("dlq unavailable"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await deliverAssistantResponseWithFallback(ctx, refs, {
      organizationId: "org_2" as never,
      channel: "whatsapp",
      recipientIdentifier: "contact-y",
      assistantContent: "customer reply",
      sessionId: "session-dlq-failure",
      metadata: { providerConversationId: "whatsapp-thread-9" },
    });

    expect(result).toEqual({ skipped: false, delivered: false, queuedToDeadLetter: false });
    expect(ctx.runAction).toHaveBeenCalledTimes(1);
    expect(ctx.runMutation).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(2);
  });
});
