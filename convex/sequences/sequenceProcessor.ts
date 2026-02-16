/**
 * SEQUENCE PROCESSOR
 *
 * Handles trigger events and creates enrollments.
 * Core engine that connects trigger sources to sequence enrollments.
 *
 * Flow:
 * 1. Trigger event fires (booking confirmed, pipeline stage change, etc.)
 * 2. Find matching sequences for the organization and trigger type
 * 3. Check enrollment mode to prevent duplicates
 * 4. Create enrollment if allowed
 * 5. Schedule initial messages via stepExecutor
 */

import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
  type TriggerContext,
  type TriggerEvent,
  matchesTriggerFilters,
  buildBookingTriggerContext,
} from "./sequenceTriggers";

const generatedApi: any = require("../_generated/api");

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * Find active sequences that match a trigger event
 */
export const findMatchingSequences = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    triggerEvent: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all active sequences for this organization
    const sequences = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "automation_sequence")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Filter by trigger event
    return sequences.filter((seq) => {
      const props = seq.customProperties as Record<string, unknown>;
      return props.triggerEvent === args.triggerEvent;
    });
  },
});

/**
 * Check if a contact is already enrolled in a sequence
 */
export const checkEnrollmentExists = internalQuery({
  args: {
    sequenceId: v.id("objects"),
    contactId: v.id("objects"),
    bookingId: v.optional(v.id("objects")),
    enrollmentMode: v.string(),
  },
  handler: async (ctx, args) => {
    // Always allow mode - no check needed
    if (args.enrollmentMode === "always_allow") {
      return false;
    }

    // Get sequence organization
    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence) return false;

    // Find existing enrollments
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

    // Check for matching enrollment
    for (const enrollment of enrollments) {
      const props = enrollment.customProperties as Record<string, unknown>;

      if (props.sequenceId !== args.sequenceId) continue;
      if (props.contactId !== args.contactId) continue;

      // Found a match for this contact + sequence
      if (args.enrollmentMode === "skip_duplicates") {
        return true; // Block enrollment
      }

      if (args.enrollmentMode === "allow_per_booking" && args.bookingId) {
        // Only block if same booking
        if (props.bookingId === args.bookingId) {
          return true;
        }
      }
    }

    return false;
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * Process a booking trigger event
 * Called when a booking status changes (confirmed, checked_in, completed, cancelled)
 */
export const processBookingTrigger = internalMutation({
  args: {
    bookingId: v.id("objects"),
    triggerEvent: v.union(
      v.literal("booking_confirmed"),
      v.literal("booking_checked_in"),
      v.literal("booking_completed"),
      v.literal("booking_cancelled")
    ),
  },
  handler: async (ctx, args) => {
    // Get the booking
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      console.log(`[SequenceProcessor] Booking not found: ${args.bookingId}`);
      return { processed: false, reason: "Booking not found" };
    }

    const bookingProps = booking.customProperties as Record<string, unknown>;
    const contactId = bookingProps.contactId as Id<"objects"> | undefined;

    // Must have a contact to enroll
    if (!contactId) {
      console.log(`[SequenceProcessor] Booking ${args.bookingId} has no contact`);
      return { processed: false, reason: "No contact on booking" };
    }

    // Build trigger context
    const triggerContext = buildBookingTriggerContext(
      {
        organizationId: booking.organizationId,
        _id: booking._id,
        subtype: booking.subtype || "appointment", // Default subtype
        customProperties: bookingProps,
      },
      args.triggerEvent
    );

    // Handle cancellation differently - exit enrollments instead of creating new ones
    if (args.triggerEvent === "booking_cancelled") {
      await (ctx as any).runMutation(generatedApi.internal.sequences.exitHandler.exitEnrollmentsForBooking, {
        bookingId: args.bookingId,
        reason: "booking_cancelled",
      });
      return { processed: true, action: "exit_enrollments" };
    }

    // Find matching sequences
    const matchingSequences = await (ctx as any).runQuery(generatedApi.internal.sequences.sequenceProcessor.findMatchingSequences, {
      organizationId: booking.organizationId,
      triggerEvent: args.triggerEvent,
    });

    if (matchingSequences.length === 0) {
      console.log(`[SequenceProcessor] No sequences match trigger ${args.triggerEvent} for org ${booking.organizationId}`);
      return { processed: true, enrollments: 0 };
    }

    // Process each matching sequence
    let enrollmentCount = 0;

    for (const sequence of matchingSequences) {
      const seqProps = sequence.customProperties as Record<string, unknown>;
      const triggerFilters = seqProps.triggerFilters as Record<string, unknown> | undefined;

      // Check if trigger context matches sequence filters
      if (!matchesTriggerFilters(triggerFilters as Parameters<typeof matchesTriggerFilters>[0], triggerContext)) {
        console.log(`[SequenceProcessor] Sequence ${sequence._id} filters don't match`);
        continue;
      }

      // Check enrollment mode
      const enrollmentMode = (seqProps.enrollmentMode as string) || "allow_per_booking";
      const alreadyEnrolled = await (ctx as any).runQuery(generatedApi.internal.sequences.sequenceProcessor.checkEnrollmentExists, {
        sequenceId: sequence._id,
        contactId,
        bookingId: args.bookingId,
        enrollmentMode,
      });

      if (alreadyEnrolled) {
        console.log(`[SequenceProcessor] Contact ${contactId} already enrolled in sequence ${sequence._id}`);
        continue;
      }

      // Create enrollment
      const enrollmentId = await createEnrollment(ctx, {
        sequenceId: sequence._id,
        contactId,
        bookingId: args.bookingId,
        organizationId: booking.organizationId,
        source: "trigger",
        referenceTimestamp: bookingProps.startDateTime as number | undefined,
      });

      // Schedule messages for this enrollment
      await (ctx as any).runMutation(generatedApi.internal.sequences.stepExecutor.scheduleEnrollmentMessages, {
        enrollmentId,
      });

      enrollmentCount++;
      console.log(`[SequenceProcessor] Created enrollment ${enrollmentId} for sequence ${sequence._id}`);
    }

    return { processed: true, enrollments: enrollmentCount };
  },
});

/**
 * Process a pipeline stage change trigger
 */
export const processPipelineTrigger = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    contactId: v.id("objects"),
    pipelineId: v.id("objects"),
    newStageId: v.id("objects"),
    previousStageId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    // Build trigger context
    const triggerContext: TriggerContext = {
      organizationId: args.organizationId,
      triggerEvent: "pipeline_stage_changed",
      contactId: args.contactId,
      pipelineId: args.pipelineId,
      stageId: args.newStageId,
      previousStageId: args.previousStageId,
      triggeredAt: Date.now(),
    };

    // Find matching sequences
    const matchingSequences = await (ctx as any).runQuery(generatedApi.internal.sequences.sequenceProcessor.findMatchingSequences, {
      organizationId: args.organizationId,
      triggerEvent: "pipeline_stage_changed",
    });

    if (matchingSequences.length === 0) {
      return { processed: true, enrollments: 0 };
    }

    let enrollmentCount = 0;

    for (const sequence of matchingSequences) {
      const seqProps = sequence.customProperties as Record<string, unknown>;
      const triggerFilters = seqProps.triggerFilters as Record<string, unknown> | undefined;

      if (!matchesTriggerFilters(triggerFilters as Parameters<typeof matchesTriggerFilters>[0], triggerContext)) {
        continue;
      }

      const enrollmentMode = (seqProps.enrollmentMode as string) || "skip_duplicates";
      const alreadyEnrolled = await (ctx as any).runQuery(generatedApi.internal.sequences.sequenceProcessor.checkEnrollmentExists, {
        sequenceId: sequence._id,
        contactId: args.contactId,
        enrollmentMode,
      });

      if (alreadyEnrolled) continue;

      const enrollmentId = await createEnrollment(ctx, {
        sequenceId: sequence._id,
        contactId: args.contactId,
        organizationId: args.organizationId,
        source: "trigger",
      });

      await (ctx as any).runMutation(generatedApi.internal.sequences.stepExecutor.scheduleEnrollmentMessages, {
        enrollmentId,
      });

      enrollmentCount++;
    }

    return { processed: true, enrollments: enrollmentCount };
  },
});

/**
 * Process a contact tag trigger
 */
export const processTagTrigger = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    contactId: v.id("objects"),
    tagId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const triggerContext: TriggerContext = {
      organizationId: args.organizationId,
      triggerEvent: "contact_tagged",
      contactId: args.contactId,
      tagId: args.tagId,
      triggeredAt: Date.now(),
    };

    const matchingSequences = await (ctx as any).runQuery(generatedApi.internal.sequences.sequenceProcessor.findMatchingSequences, {
      organizationId: args.organizationId,
      triggerEvent: "contact_tagged",
    });

    if (matchingSequences.length === 0) {
      return { processed: true, enrollments: 0 };
    }

    let enrollmentCount = 0;

    for (const sequence of matchingSequences) {
      const seqProps = sequence.customProperties as Record<string, unknown>;
      const triggerFilters = seqProps.triggerFilters as Record<string, unknown> | undefined;

      if (!matchesTriggerFilters(triggerFilters as Parameters<typeof matchesTriggerFilters>[0], triggerContext)) {
        continue;
      }

      const enrollmentMode = (seqProps.enrollmentMode as string) || "skip_duplicates";
      const alreadyEnrolled = await (ctx as any).runQuery(generatedApi.internal.sequences.sequenceProcessor.checkEnrollmentExists, {
        sequenceId: sequence._id,
        contactId: args.contactId,
        enrollmentMode,
      });

      if (alreadyEnrolled) continue;

      const enrollmentId = await createEnrollment(ctx, {
        sequenceId: sequence._id,
        contactId: args.contactId,
        organizationId: args.organizationId,
        source: "trigger",
      });

      await (ctx as any).runMutation(generatedApi.internal.sequences.stepExecutor.scheduleEnrollmentMessages, {
        enrollmentId,
      });

      enrollmentCount++;
    }

    return { processed: true, enrollments: enrollmentCount };
  },
});

/**
 * Enroll from workflow behavior
 * Called by behaviorExecutor when enroll_in_sequence behavior runs
 */
export const enrollFromWorkflow = internalMutation({
  args: {
    sequenceId: v.id("objects"),
    contactId: v.id("objects"),
    bookingId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence || sequence.type !== "automation_sequence") {
      throw new Error("Sequence not found");
    }

    if (sequence.status !== "active") {
      throw new Error("Sequence is not active");
    }

    const seqProps = sequence.customProperties as Record<string, unknown>;
    const enrollmentMode = (seqProps.enrollmentMode as string) || "allow_per_booking";

    const alreadyEnrolled = await (ctx as any).runQuery(generatedApi.internal.sequences.sequenceProcessor.checkEnrollmentExists, {
      sequenceId: args.sequenceId,
      contactId: args.contactId,
      bookingId: args.bookingId,
      enrollmentMode,
    });

    if (alreadyEnrolled) {
      return { enrolled: false, reason: "Already enrolled" };
    }

    // Get reference timestamp from booking if provided
    let referenceTimestamp: number | undefined;
    if (args.bookingId) {
      const booking = await ctx.db.get(args.bookingId);
      if (booking) {
        const bookingProps = booking.customProperties as Record<string, unknown>;
        referenceTimestamp = bookingProps.startDateTime as number | undefined;
      }
    }

    const enrollmentId = await createEnrollment(ctx, {
      sequenceId: args.sequenceId,
      contactId: args.contactId,
      bookingId: args.bookingId,
      organizationId: sequence.organizationId,
      source: "trigger", // Workflow trigger
      referenceTimestamp,
    });

    await (ctx as any).runMutation(generatedApi.internal.sequences.stepExecutor.scheduleEnrollmentMessages, {
      enrollmentId,
    });

    return { enrolled: true, enrollmentId };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an enrollment object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createEnrollment(
  ctx: any,
  params: {
    sequenceId: Id<"objects">;
    contactId: Id<"objects">;
    bookingId?: Id<"objects">;
    organizationId: Id<"organizations">;
    source: "trigger" | "manual" | "api" | "ai";
    referenceTimestamp?: number;
  }
): Promise<Id<"objects">> {
  // Get contact name for enrollment name
  const contact = await ctx.db.get(params.contactId);
  const contactProps = contact?.customProperties as Record<string, unknown>;
  const contactName = `${contactProps?.firstName || ""} ${contactProps?.lastName || ""}`.trim() || "Unknown";

  // Get sequence name
  const sequence = await ctx.db.get(params.sequenceId);
  const sequenceName = sequence?.name || "Unknown Sequence";

  const now = Date.now();

  const enrollmentId = await ctx.db.insert("objects", {
    organizationId: params.organizationId,
    type: "sequence_enrollment",
    subtype: "active",
    name: `${contactName} - ${sequenceName}`,
    description: `Enrollment from ${params.source}`,
    status: "active",
    customProperties: {
      sequenceId: params.sequenceId,
      contactId: params.contactId,
      bookingId: params.bookingId || null,
      referenceTimestamp: params.referenceTimestamp || now,
      currentStepIndex: 0,
      completedSteps: [],
      skippedSteps: [],
      enrolledAt: now,
      enrolledBy: params.source,
    },
    createdAt: now,
    updatedAt: now,
  });

  // Update sequence enrollment count
  const seqProps = sequence?.customProperties as Record<string, unknown>;
  await ctx.db.patch(params.sequenceId, {
    customProperties: {
      ...seqProps,
      totalEnrollments: ((seqProps?.totalEnrollments as number) || 0) + 1,
      activeEnrollments: ((seqProps?.activeEnrollments as number) || 0) + 1,
    },
    updatedAt: now,
  });

  return enrollmentId;
}
