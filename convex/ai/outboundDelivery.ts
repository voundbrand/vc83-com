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
  turnId?: Id<"agentTurns">;
  receiptId?: Id<"agentInboxReceipts">;
  metadata?: Record<string, unknown>;
}

export interface DeliverAssistantResponseResult {
  skipped: boolean;
  delivered: boolean;
  queuedToDeadLetter: boolean;
  deadLetterEntryId?: string;
}

const DEFAULT_OUTBOUND_SEND_TIMEOUT_MS = 20_000;
const DEFAULT_OUTBOUND_DLQ_TIMEOUT_MS = 10_000;
const DEFAULT_OUTBOUND_SEND_MAX_ATTEMPTS = 2;
const MIN_OUTBOUND_TIMEOUT_MS = 100;
const MAX_OUTBOUND_TIMEOUT_MS = 120_000;
const MIN_OUTBOUND_ATTEMPTS = 1;
const MAX_OUTBOUND_ATTEMPTS = 4;

function normalizePositiveInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  const normalized = Math.round(value);
  if (normalized < min) {
    return min;
  }
  if (normalized > max) {
    return max;
  }
  return normalized;
}

function resolveOutboundSendTimeoutMs(
  metadata: Record<string, unknown>,
): number {
  return normalizePositiveInteger(
    metadata.deliveryTimeoutMs,
    DEFAULT_OUTBOUND_SEND_TIMEOUT_MS,
    MIN_OUTBOUND_TIMEOUT_MS,
    MAX_OUTBOUND_TIMEOUT_MS,
  );
}

function resolveOutboundDeadLetterTimeoutMs(
  metadata: Record<string, unknown>,
): number {
  return normalizePositiveInteger(
    metadata.deadLetterTimeoutMs,
    DEFAULT_OUTBOUND_DLQ_TIMEOUT_MS,
    MIN_OUTBOUND_TIMEOUT_MS,
    MAX_OUTBOUND_TIMEOUT_MS,
  );
}

function resolveOutboundSendMaxAttempts(
  metadata: Record<string, unknown>,
): number {
  return normalizePositiveInteger(
    metadata.deliveryMaxAttempts,
    DEFAULT_OUTBOUND_SEND_MAX_ATTEMPTS,
    MIN_OUTBOUND_ATTEMPTS,
    MAX_OUTBOUND_ATTEMPTS,
  );
}

function buildOutboundTimeoutError(args: {
  operation: "send" | "dead_letter";
  timeoutMs: number;
}): Error {
  return new Error(
    `outbound_${args.operation}_timeout:${args.timeoutMs}ms`,
  );
}

async function withOperationTimeout<T>(args: {
  operation: "send" | "dead_letter";
  timeoutMs: number;
  execute: () => Promise<T>;
}): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      args.execute(),
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(
            buildOutboundTimeoutError({
              operation: args.operation,
              timeoutMs: args.timeoutMs,
            }),
          );
        }, args.timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
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
  const sendTimeoutMs = resolveOutboundSendTimeoutMs(metadata);
  const deadLetterTimeoutMs = resolveOutboundDeadLetterTimeoutMs(metadata);
  const sendMaxAttempts = resolveOutboundSendMaxAttempts(metadata);

  let sendError: unknown;
  for (let attempt = 1; attempt <= sendMaxAttempts; attempt += 1) {
    try {
      await withOperationTimeout({
        operation: "send",
        timeoutMs: sendTimeoutMs,
        execute: () =>
          ctx.runAction(refs.sendMessage, {
            organizationId: args.organizationId,
            channel: args.channel,
            recipientIdentifier: args.recipientIdentifier,
            content: args.assistantContent,
            providerConversationId,
          }),
      });

      return { skipped: false, delivered: true, queuedToDeadLetter: false };
    } catch (error) {
      sendError = error;
      if (attempt < sendMaxAttempts) {
        continue;
      }
    }
  }

  const errorStr =
    sendError instanceof Error ? sendError.message : String(sendError);
  console.error("[AgentExecution] Outbound delivery failed, adding to DLQ:", errorStr);

  try {
    const deadLetterResult = await withOperationTimeout({
      operation: "dead_letter",
      timeoutMs: deadLetterTimeoutMs,
      execute: async () =>
        await ctx.runMutation(refs.addToDeadLetterQueue, {
          organizationId: args.organizationId,
          channel: args.channel,
          recipientIdentifier: args.recipientIdentifier,
          content: args.assistantContent,
          error: errorStr,
          sessionId: args.sessionId,
          providerConversationId,
          turnId: args.turnId,
          receiptId: args.receiptId,
        }) as { entryId?: string } | null,
    });

    const deadLetterEntryId =
      typeof deadLetterResult?.entryId === "string"
        ? deadLetterResult.entryId
        : undefined;
    return deadLetterEntryId
      ? {
          skipped: false,
          delivered: false,
          queuedToDeadLetter: true,
          deadLetterEntryId,
        }
      : { skipped: false, delivered: false, queuedToDeadLetter: true };
  } catch (dlqError) {
    // Preserve historical behavior: log and continue so session state is not rolled back by adapter failures.
    console.error("[AgentExecution] Failed to add to dead letter queue:", dlqError);
    return { skipped: false, delivered: false, queuedToDeadLetter: false };
  }
}
