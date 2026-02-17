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

describe("deliverAssistantResponseWithFallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("skips outbound when metadata skip flag is enabled", async () => {
    const ctx = makeContext();

    const result = await deliverAssistantResponseWithFallback(ctx, refs, {
      organizationId: "org_123" as never,
      channel: "whatsapp",
      recipientIdentifier: "customer-42",
      assistantContent: "hello",
      sessionId: "session-1",
      metadata: { skipOutbound: true, providerConversationId: "conv-1" },
    });

    expect(result).toEqual({ skipped: true, delivered: false, queuedToDeadLetter: false });
    expect(ctx.runAction).not.toHaveBeenCalled();
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });

  it("delivers through provider when outbound is allowed", async () => {
    const ctx = makeContext();
    ctx.runAction.mockResolvedValue(undefined);

    const result = await deliverAssistantResponseWithFallback(ctx, refs, {
      organizationId: "org_123" as never,
      channel: "email",
      recipientIdentifier: "customer-99",
      assistantContent: "Message body",
      sessionId: "session-2",
      metadata: { providerConversationId: "provider-conv-abc" },
    });

    expect(result).toEqual({ skipped: false, delivered: true, queuedToDeadLetter: false });
    expect(ctx.runAction).toHaveBeenCalledTimes(1);
    expect(ctx.runAction).toHaveBeenCalledWith("sendMessageRef", {
      organizationId: "org_123",
      channel: "email",
      recipientIdentifier: "customer-99",
      content: "Message body",
      providerConversationId: "provider-conv-abc",
    });
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });

  it("queues a dead letter entry when provider delivery fails", async () => {
    const ctx = makeContext();
    ctx.runAction.mockRejectedValue(new Error("provider timeout"));
    ctx.runMutation.mockResolvedValue(undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await deliverAssistantResponseWithFallback(ctx, refs, {
      organizationId: "org_456" as never,
      channel: "sms",
      recipientIdentifier: "+15551234567",
      assistantContent: "Fallback test",
      sessionId: "session-3",
      metadata: { providerConversationId: "conv-sms-1" },
    });

    expect(result).toEqual({ skipped: false, delivered: false, queuedToDeadLetter: true });
    expect(ctx.runMutation).toHaveBeenCalledTimes(1);
    expect(ctx.runMutation).toHaveBeenCalledWith("addToDeadLetterQueueRef", {
      organizationId: "org_456",
      channel: "sms",
      recipientIdentifier: "+15551234567",
      content: "Fallback test",
      error: "provider timeout",
      sessionId: "session-3",
      providerConversationId: "conv-sms-1",
    });
    expect(errorSpy).toHaveBeenCalled();
  });
});
