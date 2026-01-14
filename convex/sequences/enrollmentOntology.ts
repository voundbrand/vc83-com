/**
 * ENROLLMENT ONTOLOGY
 *
 * Manages sequence enrollments - tracking contacts through sequences.
 * Uses the universal ontology system (objects table).
 *
 * Object Type: sequence_enrollment
 *
 * Status:
 * - "active" - Currently progressing through sequence
 * - "paused" - Temporarily paused
 * - "completed" - Finished all steps successfully
 * - "exited" - Exited before completion (cancelled, unsubscribed, etc.)
 *
 * Each enrollment tracks:
 * - Which sequence the contact is enrolled in
 * - Which contact (CRM contact)
 * - Optional booking reference (for booking-triggered sequences)
 * - Progress through steps
 * - Exit conditions if applicable
 */

import { query, mutation, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";
import type { Id } from "../_generated/dataModel";

// ============================================================================
// VALIDATORS
// ============================================================================

/**
 * Enrollment status
 */
export const enrollmentStatusValidator = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("completed"),
  v.literal("exited")
);

/**
 * Exit reason
 */
export const exitReasonValidator = v.union(
  v.literal("booking_cancelled"),
  v.literal("contact_unsubscribed"),
  v.literal("manual_removal"),
  v.literal("sequence_completed"),
  v.literal("sequence_paused"),
  v.literal("sequence_archived"),
  v.literal("condition_not_met"),
  v.literal("error")
);

/**
 * Enrollment source
 */
export const enrollmentSourceValidator = v.union(
  v.literal("trigger"), // Automatic from trigger
  v.literal("manual"), // Manual enrollment by user
  v.literal("api"), // API enrollment
  v.literal("ai") // AI-initiated enrollment
);

// ============================================================================
// ENROLLMENT CRUD OPERATIONS
// ============================================================================

/**
 * LIST ENROLLMENTS
 * Get enrollments with optional filters
 */
export const listEnrollments = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    sequenceId: v.optional(v.id("objects")),
    contactId: v.optional(v.id("objects")),
    bookingId: v.optional(v.id("objects")),
    status: v.optional(enrollmentStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    let enrollments = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "sequence_enrollment")
      )
      .collect();

    // Apply filters
    if (args.sequenceId) {
      enrollments = enrollments.filter((e) => {
        const props = e.customProperties as Record<string, unknown>;
        return props.sequenceId === args.sequenceId;
      });
    }

    if (args.contactId) {
      enrollments = enrollments.filter((e) => {
        const props = e.customProperties as Record<string, unknown>;
        return props.contactId === args.contactId;
      });
    }

    if (args.bookingId) {
      enrollments = enrollments.filter((e) => {
        const props = e.customProperties as Record<string, unknown>;
        return props.bookingId === args.bookingId;
      });
    }

    if (args.status) {
      enrollments = enrollments.filter((e) => e.status === args.status);
    }

    // Sort by most recent first
    enrollments.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit
    if (args.limit) {
      enrollments = enrollments.slice(0, args.limit);
    }

    return enrollments;
  },
});

/**
 * GET ENROLLMENT
 * Get a single enrollment with full details
 */
export const getEnrollment = query({
  args: {
    sessionId: v.string(),
    enrollmentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const enrollment = await ctx.db.get(args.enrollmentId);

    if (!enrollment || enrollment.type !== "sequence_enrollment") {
      throw new Error("Enrollment not found");
    }

    return enrollment;
  },
});

/**
 * GET ENROLLMENT (INTERNAL)
 * For internal systems
 */
export const getEnrollmentInternal = internalQuery({
  args: {
    enrollmentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const enrollment = await ctx.db.get(args.enrollmentId);

    if (!enrollment || enrollment.type !== "sequence_enrollment") {
      return null;
    }

    return enrollment;
  },
});

/**
 * GET CONTACT ENROLLMENTS
 * Get all enrollments for a specific contact
 */
export const getContactEnrollments = query({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
    includeCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get contact to find organization
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.type !== "crm_contact") {
      throw new Error("Contact not found");
    }

    let enrollments = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", contact.organizationId).eq("type", "sequence_enrollment")
      )
      .filter((q) => q.eq(q.field("customProperties.contactId"), args.contactId))
      .collect();

    // Filter out completed/exited unless requested
    if (!args.includeCompleted) {
      enrollments = enrollments.filter((e) =>
        e.status === "active" || e.status === "paused"
      );
    }

    // Sort by most recent first
    enrollments.sort((a, b) => b.createdAt - a.createdAt);

    return enrollments;
  },
});

/**
 * ENROLL CONTACT MANUALLY
 * Manually enroll a contact in a sequence
 */
export const enrollContactManually = mutation({
  args: {
    sessionId: v.string(),
    sequenceId: v.id("objects"),
    contactId: v.id("objects"),
    bookingId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Get the sequence
    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence || sequence.type !== "automation_sequence") {
      throw new Error("Sequence not found");
    }

    if (sequence.status !== "active") {
      throw new Error("Sequence is not active");
    }

    // Get the contact
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.type !== "crm_contact") {
      throw new Error("Contact not found");
    }

    // Ensure same organization
    if (contact.organizationId !== sequence.organizationId) {
      throw new Error("Contact and sequence must belong to the same organization");
    }

    const seqProps = sequence.customProperties as Record<string, unknown>;

    // Check enrollment mode for duplicates
    const enrollmentMode = seqProps.enrollmentMode as string || "allow_per_booking";

    // Check for existing enrollment
    const existingEnrollment = await checkExistingEnrollment(
      ctx,
      args.sequenceId,
      args.contactId,
      args.bookingId,
      enrollmentMode
    );

    if (existingEnrollment) {
      throw new Error("Contact is already enrolled in this sequence");
    }

    // Get booking if provided
    let bookingStartTime: number | null = null;
    if (args.bookingId) {
      const booking = await ctx.db.get(args.bookingId);
      if (booking) {
        const bookingProps = booking.customProperties as Record<string, unknown>;
        bookingStartTime = bookingProps.startDateTime as number;
      }
    }

    // Create enrollment
    const now = Date.now();
    const contactProps = contact.customProperties as Record<string, unknown>;
    const contactName = `${contactProps.firstName || ""} ${contactProps.lastName || ""}`.trim();

    const enrollmentId = await ctx.db.insert("objects", {
      organizationId: sequence.organizationId,
      type: "sequence_enrollment",
      subtype: "active",
      name: `${contactName} - ${sequence.name}`,
      description: `Manual enrollment`,
      status: "active",
      customProperties: {
        sequenceId: args.sequenceId,
        contactId: args.contactId,
        bookingId: args.bookingId,
        // Reference timestamp for calculating step offsets
        referenceTimestamp: bookingStartTime || now,
        // Progress tracking
        currentStepIndex: 0,
        completedSteps: [],
        skippedSteps: [],
        // Enrollment source
        enrolledAt: now,
        enrolledBy: "manual",
        enrolledByUserId: session.userId,
      },
      createdBy: session.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Update sequence stats
    await ctx.db.patch(args.sequenceId, {
      customProperties: {
        ...seqProps,
        totalEnrollments: ((seqProps.totalEnrollments as number) || 0) + 1,
        activeEnrollments: ((seqProps.activeEnrollments as number) || 0) + 1,
      },
      updatedAt: now,
    });

    // Log enrollment
    await ctx.db.insert("objectActions", {
      organizationId: sequence.organizationId,
      objectId: enrollmentId,
      actionType: "enrolled",
      actionData: {
        sequenceId: args.sequenceId,
        sequenceName: sequence.name,
        contactId: args.contactId,
        contactName,
        bookingId: args.bookingId,
        source: "manual",
      },
      performedBy: session.userId,
      performedAt: now,
    });

    return {
      enrollmentId,
      sequenceName: sequence.name,
      contactName,
    };
  },
});

/**
 * ENROLL FROM TRIGGER (INTERNAL)
 * Called by trigger processor to create enrollment
 */
export const enrollFromTrigger = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    sequenceId: v.id("objects"),
    contactId: v.id("objects"),
    bookingId: v.optional(v.id("objects")),
    referenceTimestamp: v.number(),
    triggerEvent: v.string(),
  },
  handler: async (ctx, args) => {
    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence || sequence.type !== "automation_sequence") {
      console.error(`[enrollFromTrigger] Sequence not found: ${args.sequenceId}`);
      return null;
    }

    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.type !== "crm_contact") {
      console.error(`[enrollFromTrigger] Contact not found: ${args.contactId}`);
      return null;
    }

    const seqProps = sequence.customProperties as Record<string, unknown>;
    const contactProps = contact.customProperties as Record<string, unknown>;
    const contactName = `${contactProps.firstName || ""} ${contactProps.lastName || ""}`.trim();

    // Check enrollment mode
    const enrollmentMode = seqProps.enrollmentMode as string || "allow_per_booking";
    const existingEnrollment = await checkExistingEnrollment(
      ctx,
      args.sequenceId,
      args.contactId,
      args.bookingId,
      enrollmentMode
    );

    if (existingEnrollment) {
      console.log(`[enrollFromTrigger] Skipping duplicate enrollment for ${contactName}`);
      return null;
    }

    const now = Date.now();

    const enrollmentId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "sequence_enrollment",
      subtype: "active",
      name: `${contactName} - ${sequence.name}`,
      description: `Triggered by ${args.triggerEvent}`,
      status: "active",
      customProperties: {
        sequenceId: args.sequenceId,
        contactId: args.contactId,
        bookingId: args.bookingId,
        referenceTimestamp: args.referenceTimestamp,
        currentStepIndex: 0,
        completedSteps: [],
        skippedSteps: [],
        enrolledAt: now,
        enrolledBy: "trigger",
        triggerEvent: args.triggerEvent,
      },
      createdAt: now,
      updatedAt: now,
    });

    // Update sequence stats
    await ctx.db.patch(args.sequenceId, {
      customProperties: {
        ...seqProps,
        totalEnrollments: ((seqProps.totalEnrollments as number) || 0) + 1,
        activeEnrollments: ((seqProps.activeEnrollments as number) || 0) + 1,
      },
      updatedAt: now,
    });

    // Log enrollment
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: enrollmentId,
      actionType: "enrolled",
      actionData: {
        sequenceId: args.sequenceId,
        sequenceName: sequence.name,
        contactId: args.contactId,
        contactName,
        bookingId: args.bookingId,
        source: "trigger",
        triggerEvent: args.triggerEvent,
      },
      performedAt: now,
    });

    console.log(`[enrollFromTrigger] Created enrollment ${enrollmentId} for ${contactName} in ${sequence.name}`);

    return {
      enrollmentId,
      sequenceName: sequence.name,
      contactName,
    };
  },
});

/**
 * PAUSE ENROLLMENT
 * Temporarily pause an active enrollment
 */
export const pauseEnrollment = mutation({
  args: {
    sessionId: v.string(),
    enrollmentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment || enrollment.type !== "sequence_enrollment") {
      throw new Error("Enrollment not found");
    }

    if (enrollment.status !== "active") {
      throw new Error("Only active enrollments can be paused");
    }

    const props = enrollment.customProperties as Record<string, unknown>;

    await ctx.db.patch(args.enrollmentId, {
      status: "paused",
      customProperties: {
        ...props,
        pausedAt: Date.now(),
        pausedBy: session.userId,
      },
      updatedAt: Date.now(),
    });

    // Update sequence stats
    const sequence = await ctx.db.get(props.sequenceId as Id<"objects">);
    if (sequence) {
      const seqProps = sequence.customProperties as Record<string, unknown>;
      await ctx.db.patch(props.sequenceId as Id<"objects">, {
        customProperties: {
          ...seqProps,
          activeEnrollments: Math.max(0, ((seqProps.activeEnrollments as number) || 1) - 1),
        },
        updatedAt: Date.now(),
      });
    }

    // Log pause
    await ctx.db.insert("objectActions", {
      organizationId: enrollment.organizationId,
      objectId: args.enrollmentId,
      actionType: "paused",
      actionData: {},
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return args.enrollmentId;
  },
});

/**
 * RESUME ENROLLMENT
 * Resume a paused enrollment
 */
export const resumeEnrollment = mutation({
  args: {
    sessionId: v.string(),
    enrollmentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment || enrollment.type !== "sequence_enrollment") {
      throw new Error("Enrollment not found");
    }

    if (enrollment.status !== "paused") {
      throw new Error("Only paused enrollments can be resumed");
    }

    const props = enrollment.customProperties as Record<string, unknown>;

    await ctx.db.patch(args.enrollmentId, {
      status: "active",
      customProperties: {
        ...props,
        resumedAt: Date.now(),
        resumedBy: session.userId,
      },
      updatedAt: Date.now(),
    });

    // Update sequence stats
    const sequence = await ctx.db.get(props.sequenceId as Id<"objects">);
    if (sequence) {
      const seqProps = sequence.customProperties as Record<string, unknown>;
      await ctx.db.patch(props.sequenceId as Id<"objects">, {
        customProperties: {
          ...seqProps,
          activeEnrollments: ((seqProps.activeEnrollments as number) || 0) + 1,
        },
        updatedAt: Date.now(),
      });
    }

    // Log resume
    await ctx.db.insert("objectActions", {
      organizationId: enrollment.organizationId,
      objectId: args.enrollmentId,
      actionType: "resumed",
      actionData: {},
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return args.enrollmentId;
  },
});

/**
 * CANCEL ENROLLMENT
 * Exit an enrollment with a reason
 */
export const cancelEnrollment = mutation({
  args: {
    sessionId: v.string(),
    enrollmentId: v.id("objects"),
    reason: exitReasonValidator,
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment || enrollment.type !== "sequence_enrollment") {
      throw new Error("Enrollment not found");
    }

    if (enrollment.status === "completed" || enrollment.status === "exited") {
      throw new Error("Enrollment has already ended");
    }

    const props = enrollment.customProperties as Record<string, unknown>;
    const now = Date.now();

    await ctx.db.patch(args.enrollmentId, {
      status: "exited",
      customProperties: {
        ...props,
        exitedAt: now,
        exitReason: args.reason,
        exitedBy: session.userId,
      },
      updatedAt: now,
    });

    // Cancel pending messages
    const pendingMessages = await ctx.db
      .query("sequenceMessageQueue")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();

    for (const msg of pendingMessages) {
      await ctx.db.patch(msg._id, {
        status: "cancelled",
        lastError: `Enrollment cancelled: ${args.reason}`,
        updatedAt: now,
      });
    }

    // Update sequence stats
    const sequence = await ctx.db.get(props.sequenceId as Id<"objects">);
    if (sequence) {
      const seqProps = sequence.customProperties as Record<string, unknown>;
      const wasActive = enrollment.status === "active";
      await ctx.db.patch(props.sequenceId as Id<"objects">, {
        customProperties: {
          ...seqProps,
          activeEnrollments: wasActive
            ? Math.max(0, ((seqProps.activeEnrollments as number) || 1) - 1)
            : seqProps.activeEnrollments,
          exitedEnrollments: ((seqProps.exitedEnrollments as number) || 0) + 1,
        },
        updatedAt: now,
      });
    }

    // Log cancellation
    await ctx.db.insert("objectActions", {
      organizationId: enrollment.organizationId,
      objectId: args.enrollmentId,
      actionType: "exited",
      actionData: {
        reason: args.reason,
        cancelledMessages: pendingMessages.length,
      },
      performedBy: session.userId,
      performedAt: now,
    });

    return {
      enrollmentId: args.enrollmentId,
      cancelledMessages: pendingMessages.length,
    };
  },
});

/**
 * EXIT ENROLLMENT (INTERNAL)
 * Called by system to exit enrollments (e.g., booking cancelled)
 */
export const exitEnrollmentInternal = internalMutation({
  args: {
    enrollmentId: v.id("objects"),
    reason: exitReasonValidator,
  },
  handler: async (ctx, args) => {
    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment || enrollment.type !== "sequence_enrollment") {
      return null;
    }

    if (enrollment.status === "completed" || enrollment.status === "exited") {
      return null; // Already ended
    }

    const props = enrollment.customProperties as Record<string, unknown>;
    const now = Date.now();

    await ctx.db.patch(args.enrollmentId, {
      status: "exited",
      customProperties: {
        ...props,
        exitedAt: now,
        exitReason: args.reason,
      },
      updatedAt: now,
    });

    // Cancel pending messages
    const pendingMessages = await ctx.db
      .query("sequenceMessageQueue")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();

    for (const msg of pendingMessages) {
      await ctx.db.patch(msg._id, {
        status: "cancelled",
        lastError: `Enrollment exited: ${args.reason}`,
        updatedAt: now,
      });
    }

    // Update sequence stats
    const sequence = await ctx.db.get(props.sequenceId as Id<"objects">);
    if (sequence) {
      const seqProps = sequence.customProperties as Record<string, unknown>;
      const wasActive = enrollment.status === "active";
      await ctx.db.patch(props.sequenceId as Id<"objects">, {
        customProperties: {
          ...seqProps,
          activeEnrollments: wasActive
            ? Math.max(0, ((seqProps.activeEnrollments as number) || 1) - 1)
            : seqProps.activeEnrollments,
          exitedEnrollments: ((seqProps.exitedEnrollments as number) || 0) + 1,
        },
        updatedAt: now,
      });
    }

    // Log exit
    await ctx.db.insert("objectActions", {
      organizationId: enrollment.organizationId,
      objectId: args.enrollmentId,
      actionType: "exited",
      actionData: {
        reason: args.reason,
        cancelledMessages: pendingMessages.length,
        source: "system",
      },
      performedAt: now,
    });

    console.log(`[exitEnrollmentInternal] Exited enrollment ${args.enrollmentId}: ${args.reason}`);

    return {
      enrollmentId: args.enrollmentId,
      cancelledMessages: pendingMessages.length,
    };
  },
});

/**
 * COMPLETE ENROLLMENT (INTERNAL)
 * Called when all steps have been executed
 */
export const completeEnrollmentInternal = internalMutation({
  args: {
    enrollmentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment || enrollment.type !== "sequence_enrollment") {
      return null;
    }

    if (enrollment.status !== "active") {
      return null;
    }

    const props = enrollment.customProperties as Record<string, unknown>;
    const now = Date.now();

    await ctx.db.patch(args.enrollmentId, {
      status: "completed",
      customProperties: {
        ...props,
        completedAt: now,
      },
      updatedAt: now,
    });

    // Update sequence stats
    const sequence = await ctx.db.get(props.sequenceId as Id<"objects">);
    if (sequence) {
      const seqProps = sequence.customProperties as Record<string, unknown>;
      await ctx.db.patch(props.sequenceId as Id<"objects">, {
        customProperties: {
          ...seqProps,
          activeEnrollments: Math.max(0, ((seqProps.activeEnrollments as number) || 1) - 1),
          completedEnrollments: ((seqProps.completedEnrollments as number) || 0) + 1,
        },
        updatedAt: now,
      });
    }

    // Log completion
    await ctx.db.insert("objectActions", {
      organizationId: enrollment.organizationId,
      objectId: args.enrollmentId,
      actionType: "completed",
      actionData: {
        completedSteps: props.completedSteps,
        skippedSteps: props.skippedSteps,
      },
      performedAt: now,
    });

    console.log(`[completeEnrollmentInternal] Completed enrollment ${args.enrollmentId}`);

    return { enrollmentId: args.enrollmentId };
  },
});

/**
 * GET ENROLLMENT MESSAGES
 * Get all messages (scheduled, sent, etc.) for an enrollment
 */
export const getEnrollmentMessages = query({
  args: {
    sessionId: v.string(),
    enrollmentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const messages = await ctx.db
      .query("sequenceMessageQueue")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .collect();

    // Sort by scheduled time
    messages.sort((a, b) => a.scheduledFor - b.scheduledFor);

    return messages;
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check for existing enrollment based on enrollment mode
 * Uses 'any' type for ctx to avoid complex Convex type issues in helper functions
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkExistingEnrollment(
  ctx: any,
  sequenceId: Id<"objects">,
  contactId: Id<"objects">,
  bookingId: Id<"objects"> | undefined,
  enrollmentMode: string
): Promise<boolean> {
  if (enrollmentMode === "always_allow") {
    return false; // Always allow new enrollments
  }

  // Get the sequence to find the organization
  const sequence = await ctx.db.get(sequenceId);
  if (!sequence) {
    return false;
  }

  // Find any existing active/paused enrollments using index
  const enrollments = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q: { eq: (field: string, value: unknown) => { eq: (field: string, value: unknown) => unknown } }) =>
      q.eq("organizationId", sequence.organizationId).eq("type", "sequence_enrollment")
    )
    .filter((q: { eq: (field: unknown, value: unknown) => unknown; or: (...args: unknown[]) => unknown; field: (name: string) => unknown }) =>
      q.or(
        q.eq(q.field("status"), "active"),
        q.eq(q.field("status"), "paused")
      )
    )
    .collect();

  // Filter to find matching enrollment
  const existing = enrollments.find((e: { customProperties?: Record<string, unknown> }) => {
    const props = e.customProperties;
    return props?.sequenceId === sequenceId && props?.contactId === contactId;
  });

  if (!existing) {
    return false; // No existing enrollment
  }

  if (enrollmentMode === "skip_duplicates") {
    return true; // Skip any duplicate
  }

  if (enrollmentMode === "allow_per_booking" && bookingId) {
    // Allow if different booking
    const existingProps = existing.customProperties;
    return existingProps?.bookingId === bookingId;
  }

  return true; // Default to skip
}
