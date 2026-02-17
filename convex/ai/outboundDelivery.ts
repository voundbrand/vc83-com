import type { Id } from "../_generated/dataModel";

export interface OutboundDeliveryContext {
  runAction: (reference: any, args: Record<string, unknown>) => Promise<unknown>;
  runMutation: (reference: any, args: Record<string, unknown>) => Promise<unknown>;
}

export interface OutboundDeliveryRefs {
  sendMessage: unknown;
  addToDeadLetterQueue: unknown;
}

export interface DeliverAssistantResponseArgs {
  organizationId: Id<"organizations">;
  channel: string;
  recipientIdentifier: string;
  assistantContent: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
}

export interface DeliverAssistantResponseResult {
  skipped: boolean;
  delivered: boolean;
  queuedToDeadLetter: boolean;
}

export async function deliverAssistantResponseWithFallback(
  ctx: OutboundDeliveryContext,
  refs: OutboundDeliveryRefs,
  args: DeliverAssistantResponseArgs,
): Promise<DeliverAssistantResponseResult> {
  const metadata = args.metadata ?? {};

  // Keep outbound gating in one place so provider adapters stay isolated from the main runtime flow.
  if (!args.assistantContent || metadata.skipOutbound || args.channel === "api_test") {
    return { skipped: true, delivered: false, queuedToDeadLetter: false };
  }

  const providerConversationId =
    typeof metadata.providerConversationId === "string" ? metadata.providerConversationId : undefined;

  try {
    await ctx.runAction(refs.sendMessage, {
      organizationId: args.organizationId,
      channel: args.channel,
      recipientIdentifier: args.recipientIdentifier,
      content: args.assistantContent,
      providerConversationId,
    });

    return { skipped: false, delivered: true, queuedToDeadLetter: false };
  } catch (error) {
    const errorStr = error instanceof Error ? error.message : String(error);
    console.error("[AgentExecution] Outbound delivery failed, adding to DLQ:", errorStr);

    try {
      await ctx.runMutation(refs.addToDeadLetterQueue, {
        organizationId: args.organizationId,
        channel: args.channel,
        recipientIdentifier: args.recipientIdentifier,
        content: args.assistantContent,
        error: errorStr,
        sessionId: args.sessionId,
        providerConversationId,
      });

      return { skipped: false, delivered: false, queuedToDeadLetter: true };
    } catch (dlqError) {
      // Preserve historical behavior: log and continue so session state is not rolled back by adapter failures.
      console.error("[AgentExecution] Failed to add to dead letter queue:", dlqError);
      return { skipped: false, delivered: false, queuedToDeadLetter: false };
    }
  }
}
