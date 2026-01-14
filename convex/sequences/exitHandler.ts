/**
 * EXIT HANDLER
 *
 * Handles enrollment exits and cancels pending messages.
 * Called when:
 * - Booking is cancelled
 * - Contact unsubscribes
 * - Manual removal
 * - Sequence is paused/archived
 *
 * Exit Conditions:
 * - booking_cancelled: All enrollments for that booking exit
 * - contact_unsubscribed: All enrollments for that contact exit
 * - manual_removal: Specific enrollment exits
 * - sequence_paused: All enrollments pause (not exit)
 * - sequence_archived: All enrollments exit
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

// ============================================================================
// EXIT REASONS
// ============================================================================

export type ExitReason =
  | "booking_cancelled"
  | "contact_unsubscribed"
  | "manual_removal"
  | "sequence_completed"
  | "sequence_paused"
  | "sequence_archived"
  | "condition_not_met"
  | "error";

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * Exit all enrollments for a booking
 * Called when a booking is cancelled
 */
export const exitEnrollmentsForBooking = internalMutation({
  args: {
    bookingId: v.id("objects"),
    reason: v.union(
      v.literal("booking_cancelled"),
      v.literal("manual_removal")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find all active enrollments for this booking
    const enrollments = await ctx.db
      .query("sequenceMessageQueue")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    // Get unique enrollment IDs
    const enrollmentIds = [...new Set(enrollments.map((m) => m.enrollmentId).filter(Boolean))];

    let exitedCount = 0;
    let cancelledMessagesCount = 0;

    for (const enrollmentId of enrollmentIds) {
      if (!enrollmentId) continue;

      const enrollment = await ctx.db.get(enrollmentId);
      if (!enrollment || enrollment.status !== "active") continue;

      // Exit the enrollment
      const props = enrollment.customProperties as Record<string, unknown>;
      await ctx.db.patch(enrollmentId, {
        status: "exited",
        customProperties: {
          ...props,
          exitedAt: now,
          exitReason: args.reason,
        },
        updatedAt: now,
      });

      // Update sequence active enrollment count
      const sequenceId = props.sequenceId as Id<"objects">;
      const sequence = await ctx.db.get(sequenceId);
      if (sequence) {
        const seqProps = sequence.customProperties as Record<string, unknown>;
        await ctx.db.patch(sequenceId, {
          customProperties: {
            ...seqProps,
            activeEnrollments: Math.max(0, ((seqProps.activeEnrollments as number) || 1) - 1),
          },
          updatedAt: now,
        });
      }

      exitedCount++;
    }

    // Cancel all pending messages for this booking
    const pendingMessages = await ctx.db
      .query("sequenceMessageQueue")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "scheduled"),
          q.eq(q.field("status"), "sending")
        )
      )
      .collect();

    for (const message of pendingMessages) {
      await ctx.db.patch(message._id, {
        status: "cancelled",
        lastError: `Cancelled: ${args.reason}`,
        updatedAt: now,
      });
      cancelledMessagesCount++;
    }

    console.log(`[ExitHandler] Booking ${args.bookingId}: Exited ${exitedCount} enrollments, cancelled ${cancelledMessagesCount} messages`);

    return { exitedCount, cancelledMessagesCount };
  },
});

/**
 * Exit all enrollments for a contact
 * Called when a contact unsubscribes
 */
export const exitEnrollmentsForContact = internalMutation({
  args: {
    contactId: v.id("objects"),
    organizationId: v.id("organizations"),
    reason: v.union(
      v.literal("contact_unsubscribed"),
      v.literal("manual_removal")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find all active enrollments for this contact
    const enrollments = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "sequence_enrollment")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    let exitedCount = 0;
    let cancelledMessagesCount = 0;

    for (const enrollment of enrollments) {
      const props = enrollment.customProperties as Record<string, unknown>;

      if (props.contactId !== args.contactId) continue;

      // Exit the enrollment
      await ctx.db.patch(enrollment._id, {
        status: "exited",
        customProperties: {
          ...props,
          exitedAt: now,
          exitReason: args.reason,
        },
        updatedAt: now,
      });

      // Update sequence active enrollment count
      const sequenceId = props.sequenceId as Id<"objects">;
      const sequence = await ctx.db.get(sequenceId);
      if (sequence) {
        const seqProps = sequence.customProperties as Record<string, unknown>;
        await ctx.db.patch(sequenceId, {
          customProperties: {
            ...seqProps,
            activeEnrollments: Math.max(0, ((seqProps.activeEnrollments as number) || 1) - 1),
          },
          updatedAt: now,
        });
      }

      // Cancel pending messages for this enrollment
      const pendingMessages = await ctx.db
        .query("sequenceMessageQueue")
        .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "scheduled"),
            q.eq(q.field("status"), "sending")
          )
        )
        .collect();

      for (const message of pendingMessages) {
        await ctx.db.patch(message._id, {
          status: "cancelled",
          lastError: `Cancelled: ${args.reason}`,
          updatedAt: now,
        });
        cancelledMessagesCount++;
      }

      exitedCount++;
    }

    console.log(`[ExitHandler] Contact ${args.contactId}: Exited ${exitedCount} enrollments, cancelled ${cancelledMessagesCount} messages`);

    return { exitedCount, cancelledMessagesCount };
  },
});

/**
 * Exit a single enrollment
 * Called for manual removal or condition failures
 */
export const exitEnrollment = internalMutation({
  args: {
    enrollmentId: v.id("objects"),
    reason: v.union(
      v.literal("booking_cancelled"),
      v.literal("contact_unsubscribed"),
      v.literal("manual_removal"),
      v.literal("sequence_completed"),
      v.literal("sequence_paused"),
      v.literal("sequence_archived"),
      v.literal("condition_not_met"),
      v.literal("error")
    ),
  },
  handler: async (ctx, args) => {
    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment || enrollment.type !== "sequence_enrollment") {
      return { success: false, error: "Enrollment not found" };
    }

    if (enrollment.status !== "active" && enrollment.status !== "paused") {
      return { success: false, error: "Enrollment already exited or completed" };
    }

    const now = Date.now();
    const props = enrollment.customProperties as Record<string, unknown>;

    // Exit the enrollment
    await ctx.db.patch(args.enrollmentId, {
      status: "exited",
      customProperties: {
        ...props,
        exitedAt: now,
        exitReason: args.reason,
      },
      updatedAt: now,
    });

    // Update sequence active enrollment count
    const sequenceId = props.sequenceId as Id<"objects">;
    const sequence = await ctx.db.get(sequenceId);
    if (sequence) {
      const seqProps = sequence.customProperties as Record<string, unknown>;
      await ctx.db.patch(sequenceId, {
        customProperties: {
          ...seqProps,
          activeEnrollments: Math.max(0, ((seqProps.activeEnrollments as number) || 1) - 1),
        },
        updatedAt: now,
      });
    }

    // Cancel all pending messages for this enrollment
    const pendingMessages = await ctx.db
      .query("sequenceMessageQueue")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "scheduled"),
          q.eq(q.field("status"), "sending")
        )
      )
      .collect();

    let cancelledMessagesCount = 0;
    for (const message of pendingMessages) {
      await ctx.db.patch(message._id, {
        status: "cancelled",
        lastError: `Cancelled: ${args.reason}`,
        updatedAt: now,
      });
      cancelledMessagesCount++;
    }

    console.log(`[ExitHandler] Enrollment ${args.enrollmentId}: Exited with reason ${args.reason}, cancelled ${cancelledMessagesCount} messages`);

    return { success: true, cancelledMessagesCount };
  },
});

/**
 * Pause all enrollments for a sequence
 * Called when sequence is paused
 */
export const pauseEnrollmentsForSequence = internalMutation({
  args: {
    sequenceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence) {
      return { success: false, error: "Sequence not found" };
    }

    const now = Date.now();

    // Find all active enrollments for this sequence
    const enrollments = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", sequence.organizationId).eq("type", "sequence_enrollment")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    let pausedCount = 0;
    let cancelledMessagesCount = 0;

    for (const enrollment of enrollments) {
      const props = enrollment.customProperties as Record<string, unknown>;

      if (props.sequenceId !== args.sequenceId) continue;

      // Pause the enrollment
      await ctx.db.patch(enrollment._id, {
        status: "paused",
        customProperties: {
          ...props,
          pausedAt: now,
          pauseReason: "sequence_paused",
        },
        updatedAt: now,
      });

      // Cancel pending messages (they'll be rescheduled when resumed)
      const pendingMessages = await ctx.db
        .query("sequenceMessageQueue")
        .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
        .filter((q) => q.eq(q.field("status"), "scheduled"))
        .collect();

      for (const message of pendingMessages) {
        await ctx.db.patch(message._id, {
          status: "cancelled",
          lastError: "Sequence paused",
          updatedAt: now,
        });
        cancelledMessagesCount++;
      }

      pausedCount++;
    }

    console.log(`[ExitHandler] Sequence ${args.sequenceId}: Paused ${pausedCount} enrollments, cancelled ${cancelledMessagesCount} messages`);

    return { success: true, pausedCount, cancelledMessagesCount };
  },
});

/**
 * Exit all enrollments for a sequence
 * Called when sequence is archived
 */
export const exitEnrollmentsForSequence = internalMutation({
  args: {
    sequenceId: v.id("objects"),
    reason: v.union(
      v.literal("sequence_archived"),
      v.literal("manual_removal")
    ),
  },
  handler: async (ctx, args) => {
    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence) {
      return { success: false, error: "Sequence not found" };
    }

    const now = Date.now();

    // Find all active/paused enrollments for this sequence
    const enrollments = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", sequence.organizationId).eq("type", "sequence_enrollment")
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "paused")
        )
      )
      .collect();

    let exitedCount = 0;
    let cancelledMessagesCount = 0;

    for (const enrollment of enrollments) {
      const props = enrollment.customProperties as Record<string, unknown>;

      if (props.sequenceId !== args.sequenceId) continue;

      // Exit the enrollment
      await ctx.db.patch(enrollment._id, {
        status: "exited",
        customProperties: {
          ...props,
          exitedAt: now,
          exitReason: args.reason,
        },
        updatedAt: now,
      });

      // Cancel all pending messages
      const pendingMessages = await ctx.db
        .query("sequenceMessageQueue")
        .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "scheduled"),
            q.eq(q.field("status"), "sending")
          )
        )
        .collect();

      for (const message of pendingMessages) {
        await ctx.db.patch(message._id, {
          status: "cancelled",
          lastError: `Cancelled: ${args.reason}`,
          updatedAt: now,
        });
        cancelledMessagesCount++;
      }

      exitedCount++;
    }

    // Reset sequence active enrollment count
    const seqProps = sequence.customProperties as Record<string, unknown>;
    await ctx.db.patch(args.sequenceId, {
      customProperties: {
        ...seqProps,
        activeEnrollments: 0,
      },
      updatedAt: now,
    });

    console.log(`[ExitHandler] Sequence ${args.sequenceId}: Exited ${exitedCount} enrollments, cancelled ${cancelledMessagesCount} messages`);

    return { success: true, exitedCount, cancelledMessagesCount };
  },
});
