/**
 * DEAD LETTER QUEUE
 *
 * Stores outbound messages that failed all retry attempts.
 * A scheduled cron retries them periodically, and abandons after max attempts.
 *
 * Uses the `objects` table with type="dead_letter" for storage.
 *
 * Lifecycle:
 * 1. Channel send fails all retries → addToDeadLetterQueue()
 * 2. Cron runs every 5 min → retryDeadLetters()
 * 3. Retry succeeds → entry deleted
 * 4. Retry fails → attempts incremented, nextRetryAt pushed back
 * 5. Max attempts (10) reached → entry marked abandoned, owner notified
 */

import { internalMutation, internalAction, internalQuery } from "../_generated/server";
import { v } from "convex/values";

// Lazy-load to avoid deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_internalCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _internalCache = require("../_generated/api").internal;
  }
  return _internalCache;
}

const MAX_ATTEMPTS = 10;
const BASE_RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Add a failed outbound message to the dead letter queue.
 */
export const addToDeadLetterQueue = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    channel: v.string(),
    recipientIdentifier: v.string(),
    content: v.string(),
    error: v.string(),
    sessionId: v.optional(v.string()),
    providerConversationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("objects", {
      type: "dead_letter",
      name: `DLQ — ${args.channel} → ${args.recipientIdentifier.slice(0, 10)}...`,
      organizationId: args.organizationId,
      status: "active",
      customProperties: {
        channel: args.channel,
        recipientIdentifier: args.recipientIdentifier,
        content: args.content,
        providerConversationId: args.providerConversationId,
        sessionId: args.sessionId,
        error: args.error,
        attempts: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
        nextRetryAt: now + BASE_RETRY_DELAY_MS,
      },
      createdAt: now,
      updatedAt: now,
    });

    console.warn(
      `[DeadLetterQueue] Message queued for retry: ${args.channel} → ${args.recipientIdentifier.slice(0, 10)}...`
    );
  },
});

/**
 * Mark a dead letter entry attempt as failed (increment attempts, push back retry).
 */
export const markRetryFailed = internalMutation({
  args: {
    entryId: v.id("objects"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) return;

    const props = entry.customProperties as Record<string, unknown>;
    const attempts = ((props?.attempts as number) || 0) + 1;
    const now = Date.now();

    if (attempts >= MAX_ATTEMPTS) {
      // Abandon — mark as failed and notify owner
      await ctx.db.patch(args.entryId, {
        status: "archived",
        customProperties: {
          ...props,
          attempts,
          lastAttemptAt: now,
          abandonedAt: now,
          lastError: args.error,
        },
        updatedAt: now,
      });
      console.error(
        `[DeadLetterQueue] Message abandoned after ${MAX_ATTEMPTS} attempts: ${entry.name}`
      );

      // Notify org owner that a message was permanently undeliverable
      (ctx.scheduler as any).runAfter(0, getInternal().credits.notifications.notifyDeadLetterAbandoned, {
        organizationId: entry.organizationId,
        channel: (props?.channel as string) || "unknown",
        recipient: (props?.recipientIdentifier as string) || "unknown",
        attempts,
      });
    } else {
      // Push back retry with increasing delay
      const nextDelay = BASE_RETRY_DELAY_MS * Math.pow(2, Math.min(attempts - 1, 5));
      await ctx.db.patch(args.entryId, {
        customProperties: {
          ...props,
          attempts,
          lastAttemptAt: now,
          nextRetryAt: now + nextDelay,
          lastError: args.error,
        },
        updatedAt: now,
      });
    }
  },
});

/**
 * Delete a dead letter entry after successful retry.
 */
export const removeDeadLetter = internalMutation({
  args: {
    entryId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.entryId);
  },
});

// ============================================================================
// CRON HANDLER
// ============================================================================

/**
 * Retry dead letter entries that are due.
 * Called every 5 minutes by the cron scheduler.
 */
export const retryDeadLetters = internalAction({
  handler: async (ctx) => {
    const now = Date.now();

    // Get entries due for retry
    const entries = await (ctx as any).runQuery(getInternal().ai.deadLetterQueue.getRetryableEntries, {
      now,
    });

    if (entries.length === 0) return;

    let retried = 0;
    let succeeded = 0;

    for (const entry of entries) {
      const props = entry.customProperties as Record<string, unknown>;
      retried++;

      try {
        // Retry sending through the channel router
        const result = await (ctx as any).runAction(getInternal().channels.router.sendMessage, {
          organizationId: entry.organizationId,
          channel: props.channel as string,
          recipientIdentifier: props.recipientIdentifier as string,
          content: props.content as string,
          providerConversationId: props.providerConversationId as string | undefined,
        }) as { success: boolean; error?: string };

        if (result.success) {
          // Remove from DLQ
          await (ctx as any).runMutation(getInternal().ai.deadLetterQueue.removeDeadLetter, {
            entryId: entry._id,
          });
          succeeded++;
        } else {
          // Mark retry as failed
          await (ctx as any).runMutation(getInternal().ai.deadLetterQueue.markRetryFailed, {
            entryId: entry._id,
            error: result.error || "Send returned failure",
          });
        }
      } catch (e) {
        await (ctx as any).runMutation(getInternal().ai.deadLetterQueue.markRetryFailed, {
          entryId: entry._id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    if (retried > 0) {
      console.log(
        `[DeadLetterQueue] Retried ${retried} entries: ${succeeded} succeeded, ${retried - succeeded} failed`
      );
    }
  },
});

// ============================================================================
// SUPPORTING QUERIES
// ============================================================================

/**
 * Get dead letter entries that are due for retry.
 */
export const getRetryableEntries = internalQuery({
  args: {
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "dead_letter"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .take(50);

    // Filter by nextRetryAt (can't use index for customProperties)
    return entries.filter((e) => {
      const props = e.customProperties as Record<string, unknown>;
      const nextRetryAt = props?.nextRetryAt as number;
      return nextRetryAt && nextRetryAt <= args.now;
    });
  },
});
