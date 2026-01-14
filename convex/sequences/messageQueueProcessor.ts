/**
 * MESSAGE QUEUE PROCESSOR
 *
 * Cron job that processes scheduled sequence messages.
 * Runs every 5 minutes to send due messages.
 *
 * Processing Flow:
 * 1. Find messages with status="scheduled" and scheduledFor <= now
 * 2. Mark as "sending" to prevent duplicate processing
 * 3. Route to appropriate channel sender
 * 4. Update status based on result (sent/failed)
 * 5. Handle retries for failed messages
 */

import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

// ============================================================================
// CONSTANTS
// ============================================================================

const BATCH_SIZE = 50; // Process up to 50 messages per run
const MAX_RETRIES = 3;
const RETRY_DELAYS = [5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000]; // 5min, 15min, 1hr

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * Get messages due for processing
 */
export const getDueMessages = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = args.limit || BATCH_SIZE;

    // Get scheduled messages that are due
    const messages = await ctx.db
      .query("sequenceMessageQueue")
      .withIndex("by_status_scheduled", (q) =>
        q.eq("status", "scheduled").lte("scheduledFor", now)
      )
      .take(limit);

    return messages;
  },
});

/**
 * Get failed messages eligible for retry
 */
export const getRetryableMessages = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get failed messages
    const failedMessages = await ctx.db
      .query("sequenceMessageQueue")
      .filter((q) => q.eq(q.field("status"), "failed"))
      .collect();

    // Filter to those eligible for retry
    return failedMessages.filter((msg) => {
      if (msg.retryCount >= MAX_RETRIES) return false;

      // Check if enough time has passed for retry
      const retryDelay = RETRY_DELAYS[msg.retryCount] || RETRY_DELAYS[MAX_RETRIES - 1];
      const retryAfter = msg.updatedAt + retryDelay;

      return now >= retryAfter;
    });
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * Main processor - called by cron job
 */
export const processScheduledMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let processed = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    // Get due messages
    const dueMessages = await ctx.runQuery(internal.sequences.messageQueueProcessor.getDueMessages, {
      limit: BATCH_SIZE,
    });

    console.log(`[MessageQueueProcessor] Found ${dueMessages.length} due messages`);

    for (const message of dueMessages) {
      processed++;

      // Check if enrollment is still active
      if (message.enrollmentId) {
        const enrollment = await ctx.db.get(message.enrollmentId);
        if (!enrollment || (enrollment as { status?: string }).status !== "active") {
          // Skip - enrollment no longer active
          await ctx.db.patch(message._id, {
            status: "cancelled",
            lastError: "Enrollment no longer active",
            updatedAt: now,
          });
          skipped++;
          continue;
        }
      }

      // Mark as sending
      await ctx.db.patch(message._id, {
        status: "sending",
        updatedAt: now,
      });

      try {
        // Send via appropriate channel
        const result = await ctx.runMutation(internal.sequences.messageSender.sendMessage, {
          messageId: message._id,
        });

        if (result.success) {
          await ctx.db.patch(message._id, {
            status: "sent",
            sentAt: now,
            externalId: result.externalId,
            updatedAt: now,
          });
          sent++;

          // Update enrollment progress
          if (message.enrollmentId && message.sequenceStepIndex !== undefined) {
            await updateEnrollmentProgress(ctx, message.enrollmentId, message.sequenceStepIndex);
          }
        } else {
          await ctx.db.patch(message._id, {
            status: "failed",
            lastError: result.error || "Unknown error",
            retryCount: message.retryCount + 1,
            updatedAt: now,
          });
          failed++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await ctx.db.patch(message._id, {
          status: "failed",
          lastError: errorMessage,
          retryCount: message.retryCount + 1,
          updatedAt: now,
        });
        failed++;
        console.error(`[MessageQueueProcessor] Error sending message ${message._id}:`, error);
      }
    }

    // Process retries
    const retryMessages = await ctx.runQuery(internal.sequences.messageQueueProcessor.getRetryableMessages, {});
    let retried = 0;

    for (const message of retryMessages) {
      if (processed >= BATCH_SIZE) break;

      // Re-queue for processing
      await ctx.db.patch(message._id, {
        status: "scheduled",
        scheduledFor: now, // Process immediately
        updatedAt: now,
      });
      retried++;
    }

    console.log(`[MessageQueueProcessor] Processed: ${processed}, Sent: ${sent}, Failed: ${failed}, Skipped: ${skipped}, Retried: ${retried}`);

    return { processed, sent, failed, skipped, retried };
  },
});

/**
 * Process a single message (for manual retry)
 */
export const processSingleMessage = internalMutation({
  args: {
    messageId: v.id("sequenceMessageQueue"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string; externalId?: string }> => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      return { success: false, error: "Message not found" };
    }

    if (message.status === "sent") {
      return { success: false, error: "Message already sent" };
    }

    if (message.status === "cancelled") {
      return { success: false, error: "Message was cancelled" };
    }

    const now = Date.now();

    // Mark as sending
    await ctx.db.patch(args.messageId, {
      status: "sending",
      updatedAt: now,
    });

    try {
      const result = await ctx.runMutation(internal.sequences.messageSender.sendMessage, {
        messageId: args.messageId,
      });

      if (result.success) {
        await ctx.db.patch(args.messageId, {
          status: "sent",
          sentAt: now,
          externalId: result.externalId,
          updatedAt: now,
        });

        // Update enrollment progress
        if (message.enrollmentId && message.sequenceStepIndex !== undefined) {
          await updateEnrollmentProgress(ctx, message.enrollmentId, message.sequenceStepIndex);
        }

        return { success: true, externalId: result.externalId };
      } else {
        await ctx.db.patch(args.messageId, {
          status: "failed",
          lastError: result.error || "Unknown error",
          retryCount: message.retryCount + 1,
          updatedAt: now,
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await ctx.db.patch(args.messageId, {
        status: "failed",
        lastError: errorMessage,
        retryCount: message.retryCount + 1,
        updatedAt: now,
      });
      return { success: false, error: errorMessage };
    }
  },
});

/**
 * Cleanup old messages
 * Removes sent/cancelled messages older than 30 days
 */
export const cleanupOldMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let deleted = 0;

    // Get old sent messages
    const oldSentMessages = await ctx.db
      .query("sequenceMessageQueue")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "sent"),
          q.lt(q.field("sentAt"), thirtyDaysAgo)
        )
      )
      .take(100);

    for (const message of oldSentMessages) {
      await ctx.db.delete(message._id);
      deleted++;
    }

    // Get old cancelled messages
    const oldCancelledMessages = await ctx.db
      .query("sequenceMessageQueue")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "cancelled"),
          q.lt(q.field("updatedAt"), thirtyDaysAgo)
        )
      )
      .take(100);

    for (const message of oldCancelledMessages) {
      await ctx.db.delete(message._id);
      deleted++;
    }

    console.log(`[MessageQueueProcessor] Cleaned up ${deleted} old messages`);
    return { deleted };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Update enrollment progress after successful message send
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateEnrollmentProgress(
  ctx: any,
  enrollmentId: Id<"objects">,
  stepIndex: number
): Promise<void> {
  const enrollment = await ctx.db.get(enrollmentId);
  if (!enrollment) return;

  const props = enrollment.customProperties as Record<string, unknown>;
  const completedSteps = (props.completedSteps as number[]) || [];

  if (!completedSteps.includes(stepIndex)) {
    completedSteps.push(stepIndex);
    completedSteps.sort((a: number, b: number) => a - b);

    // Check if this was the last step
    const sequence = await ctx.db.get(props.sequenceId as Id<"objects">);
    const sequenceProps = sequence?.customProperties as Record<string, unknown>;
    const steps = (sequenceProps?.steps as { order: number; enabled: boolean }[]) || [];
    const enabledSteps = steps.filter((s) => s.enabled).map((s) => s.order);

    const allCompleted = enabledSteps.every((order) => completedSteps.includes(order));

    if (allCompleted) {
      // Mark enrollment as completed
      await ctx.db.patch(enrollmentId, {
        status: "completed",
        customProperties: {
          ...props,
          completedSteps,
          completedAt: Date.now(),
        },
        updatedAt: Date.now(),
      });

      // Update sequence active enrollment count
      if (sequence) {
        const seqProps = sequence.customProperties as Record<string, unknown>;
        await ctx.db.patch(sequence._id, {
          customProperties: {
            ...seqProps,
            activeEnrollments: Math.max(0, ((seqProps.activeEnrollments as number) || 1) - 1),
          },
          updatedAt: Date.now(),
        });
      }
    } else {
      // Update progress
      await ctx.db.patch(enrollmentId, {
        customProperties: {
          ...props,
          completedSteps,
          currentStepIndex: Math.max(...completedSteps) + 1,
        },
        updatedAt: Date.now(),
      });
    }
  }
}
