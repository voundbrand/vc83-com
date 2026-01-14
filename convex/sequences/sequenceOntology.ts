/**
 * SEQUENCE ONTOLOGY
 *
 * Manages automation sequences for multi-channel messaging.
 * Uses the universal ontology system (objects table).
 *
 * Object Types:
 * - automation_sequence: Sequence definitions with steps and triggers
 * - sequence_enrollment: Active enrollments tracking contact progress
 * - message_template: Email/SMS/WhatsApp message templates
 *
 * Sequence Subtypes:
 * - "vorher" - Pre-event/booking sequences
 * - "waehrend" - During event/booking sequences
 * - "nachher" - Post-event/booking sequences
 * - "lifecycle" - Customer lifecycle sequences
 * - "custom" - Custom sequences
 *
 * Status Workflow:
 * - "draft" - Being edited, not active
 * - "active" - Published and enrolling contacts
 * - "paused" - Temporarily stopped
 * - "archived" - Archived/deleted
 *
 * Trigger Events:
 * - booking_confirmed, booking_checked_in, booking_completed, booking_cancelled
 * - pipeline_stage_changed
 * - contact_tagged
 * - form_submitted
 * - manual_enrollment
 */

import { query, mutation, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";
import { checkResourceLimit } from "../licensing/helpers";
import type { Id, Doc } from "../_generated/dataModel";

// ============================================================================
// VALIDATORS
// ============================================================================

/**
 * Trigger event types
 */
export const triggerEventValidator = v.union(
  v.literal("booking_confirmed"),
  v.literal("booking_checked_in"),
  v.literal("booking_completed"),
  v.literal("booking_cancelled"),
  v.literal("pipeline_stage_changed"),
  v.literal("contact_tagged"),
  v.literal("form_submitted"),
  v.literal("manual_enrollment")
);

/**
 * Channel types
 */
export const channelValidator = v.union(
  v.literal("email"),
  v.literal("sms"),
  v.literal("whatsapp"),
  v.literal("preferred") // Use contact's preferred channel
);

/**
 * Enrollment mode
 */
export const enrollmentModeValidator = v.union(
  v.literal("skip_duplicates"), // Only one enrollment per contact per sequence
  v.literal("allow_per_booking"), // Allow if different booking
  v.literal("always_allow") // Always allow new enrollments
);

/**
 * Sequence step validator
 */
export const sequenceStepValidator = v.object({
  id: v.string(),
  order: v.number(),
  // Timing
  offsetType: v.union(v.literal("before"), v.literal("after")),
  offsetValue: v.number(),
  offsetUnit: v.union(v.literal("minutes"), v.literal("hours"), v.literal("days")),
  referencePoint: v.union(
    v.literal("trigger_event"),
    v.literal("booking_start"),
    v.literal("booking_end"),
    v.literal("previous_step")
  ),
  // Channel
  channel: channelValidator,
  // Content
  templateId: v.id("objects"),
  // Conditions
  conditions: v.optional(v.object({
    minDaysOut: v.optional(v.number()),
    onlyIfNotPaid: v.optional(v.boolean()),
    onlyIfNoReply: v.optional(v.boolean()),
    customCondition: v.optional(v.string()),
  })),
  // Status
  enabled: v.boolean(),
});

/**
 * Trigger filters validator
 */
export const triggerFiltersValidator = v.optional(v.object({
  bookingSubtypes: v.optional(v.array(v.string())),
  pipelineId: v.optional(v.id("objects")),
  pipelineStageId: v.optional(v.id("objects")),
  tagIds: v.optional(v.array(v.id("objects"))),
  formIds: v.optional(v.array(v.id("objects"))),
  productIds: v.optional(v.array(v.id("objects"))),
}));

/**
 * Sending window validator
 */
export const sendingWindowValidator = v.optional(v.object({
  enabled: v.boolean(),
  startHour: v.number(), // 0-23
  endHour: v.number(), // 0-23
  timezone: v.string(), // e.g., "Europe/Berlin"
  excludeWeekends: v.boolean(),
}));

/**
 * Exit conditions validator
 */
export const exitConditionsValidator = v.optional(v.object({
  onBookingCancelled: v.boolean(),
  onContactUnsubscribed: v.boolean(),
  onManualRemoval: v.boolean(),
}));

// ============================================================================
// SEQUENCE CRUD OPERATIONS
// ============================================================================

/**
 * LIST SEQUENCES
 * Returns all sequences for an organization
 */
export const listSequences = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    triggerEvent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    let sequences = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "automation_sequence")
      )
      .collect();

    // Apply filters
    if (args.status) {
      sequences = sequences.filter((s) => s.status === args.status);
    }

    if (args.triggerEvent) {
      sequences = sequences.filter((s) => {
        const props = s.customProperties as Record<string, unknown> | undefined;
        return props?.triggerEvent === args.triggerEvent;
      });
    }

    // Sort by name
    sequences.sort((a, b) => a.name.localeCompare(b.name));

    return sequences;
  },
});

/**
 * GET SEQUENCE
 * Get a single sequence with full details
 */
export const getSequence = query({
  args: {
    sessionId: v.string(),
    sequenceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const sequence = await ctx.db.get(args.sequenceId);

    if (!sequence || sequence.type !== "automation_sequence") {
      throw new Error("Sequence not found");
    }

    return sequence;
  },
});

/**
 * GET SEQUENCE (INTERNAL)
 * For internal systems
 */
export const getSequenceInternal = internalQuery({
  args: {
    sequenceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const sequence = await ctx.db.get(args.sequenceId);

    if (!sequence || sequence.type !== "automation_sequence") {
      return null;
    }

    return sequence;
  },
});

/**
 * CREATE SEQUENCE
 * Create a new automation sequence
 */
export const createSequence = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    subtype: v.optional(v.string()), // vorher, waehrend, nachher, lifecycle, custom
    triggerEvent: triggerEventValidator,
    triggerFilters: triggerFiltersValidator,
    steps: v.optional(v.array(sequenceStepValidator)),
    exitConditions: exitConditionsValidator,
    sendingWindow: sendingWindowValidator,
    enrollmentMode: v.optional(enrollmentModeValidator),
    channels: v.optional(v.array(channelValidator)),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Check resource limit
    await checkResourceLimit(ctx, args.organizationId, "automation_sequence", "maxSequences");

    const sequenceId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "automation_sequence",
      subtype: args.subtype || "custom",
      name: args.name,
      description: args.description || "",
      status: "draft", // Always start as draft
      customProperties: {
        triggerEvent: args.triggerEvent,
        triggerFilters: args.triggerFilters || {},
        steps: args.steps || [],
        exitConditions: args.exitConditions || {
          onBookingCancelled: true,
          onContactUnsubscribed: true,
          onManualRemoval: true,
        },
        sendingWindow: args.sendingWindow || {
          enabled: false,
          startHour: 9,
          endHour: 18,
          timezone: "Europe/Berlin",
          excludeWeekends: false,
        },
        enrollmentMode: args.enrollmentMode || "allow_per_booking",
        channels: args.channels || ["email"],
        // Stats
        totalEnrollments: 0,
        activeEnrollments: 0,
        completedEnrollments: 0,
        exitedEnrollments: 0,
        messagesSent: 0,
        // Version tracking
        version: 1,
        lastPublishedAt: null,
      },
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log creation
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: sequenceId,
      actionType: "created",
      actionData: {
        triggerEvent: args.triggerEvent,
        subtype: args.subtype || "custom",
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return sequenceId;
  },
});

/**
 * UPDATE SEQUENCE
 * Update an existing sequence
 */
export const updateSequence = mutation({
  args: {
    sessionId: v.string(),
    sequenceId: v.id("objects"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      subtype: v.optional(v.string()),
      triggerEvent: v.optional(triggerEventValidator),
      triggerFilters: v.optional(triggerFiltersValidator),
      steps: v.optional(v.array(sequenceStepValidator)),
      exitConditions: v.optional(exitConditionsValidator),
      sendingWindow: v.optional(sendingWindowValidator),
      enrollmentMode: v.optional(enrollmentModeValidator),
      channels: v.optional(v.array(channelValidator)),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence || sequence.type !== "automation_sequence") {
      throw new Error("Sequence not found");
    }

    const currentProps = sequence.customProperties as Record<string, unknown>;

    // Build updated properties
    const updatedProps: Record<string, unknown> = { ...currentProps };

    if (args.updates.triggerEvent !== undefined) {
      updatedProps.triggerEvent = args.updates.triggerEvent;
    }
    if (args.updates.triggerFilters !== undefined) {
      updatedProps.triggerFilters = args.updates.triggerFilters;
    }
    if (args.updates.steps !== undefined) {
      updatedProps.steps = args.updates.steps;
    }
    if (args.updates.exitConditions !== undefined) {
      updatedProps.exitConditions = args.updates.exitConditions;
    }
    if (args.updates.sendingWindow !== undefined) {
      updatedProps.sendingWindow = args.updates.sendingWindow;
    }
    if (args.updates.enrollmentMode !== undefined) {
      updatedProps.enrollmentMode = args.updates.enrollmentMode;
    }
    if (args.updates.channels !== undefined) {
      updatedProps.channels = args.updates.channels;
    }

    // Increment version
    updatedProps.version = ((currentProps.version as number) || 0) + 1;

    await ctx.db.patch(args.sequenceId, {
      name: args.updates.name || sequence.name,
      description: args.updates.description ?? sequence.description,
      subtype: args.updates.subtype || sequence.subtype,
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });

    // Log update
    await ctx.db.insert("objectActions", {
      organizationId: sequence.organizationId,
      objectId: args.sequenceId,
      actionType: "updated",
      actionData: {
        updatedFields: Object.keys(args.updates),
        newVersion: updatedProps.version,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return args.sequenceId;
  },
});

/**
 * ACTIVATE SEQUENCE
 * Publish a draft sequence to make it active
 */
export const activateSequence = mutation({
  args: {
    sessionId: v.string(),
    sequenceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence || sequence.type !== "automation_sequence") {
      throw new Error("Sequence not found");
    }

    const currentProps = sequence.customProperties as Record<string, unknown>;
    const steps = (currentProps.steps as unknown[]) || [];

    // Validate sequence has at least one step
    if (steps.length === 0) {
      throw new Error("Sequence must have at least one step to activate");
    }

    await ctx.db.patch(args.sequenceId, {
      status: "active",
      customProperties: {
        ...currentProps,
        lastPublishedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    // Log activation
    await ctx.db.insert("objectActions", {
      organizationId: sequence.organizationId,
      objectId: args.sequenceId,
      actionType: "activated",
      actionData: {
        previousStatus: sequence.status,
        stepsCount: steps.length,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return args.sequenceId;
  },
});

/**
 * PAUSE SEQUENCE
 * Temporarily pause an active sequence
 */
export const pauseSequence = mutation({
  args: {
    sessionId: v.string(),
    sequenceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence || sequence.type !== "automation_sequence") {
      throw new Error("Sequence not found");
    }

    if (sequence.status !== "active") {
      throw new Error("Only active sequences can be paused");
    }

    await ctx.db.patch(args.sequenceId, {
      status: "paused",
      updatedAt: Date.now(),
    });

    // Log pause
    await ctx.db.insert("objectActions", {
      organizationId: sequence.organizationId,
      objectId: args.sequenceId,
      actionType: "paused",
      actionData: {},
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return args.sequenceId;
  },
});

/**
 * RESUME SEQUENCE
 * Resume a paused sequence
 */
export const resumeSequence = mutation({
  args: {
    sessionId: v.string(),
    sequenceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence || sequence.type !== "automation_sequence") {
      throw new Error("Sequence not found");
    }

    if (sequence.status !== "paused") {
      throw new Error("Only paused sequences can be resumed");
    }

    await ctx.db.patch(args.sequenceId, {
      status: "active",
      updatedAt: Date.now(),
    });

    // Log resume
    await ctx.db.insert("objectActions", {
      organizationId: sequence.organizationId,
      objectId: args.sequenceId,
      actionType: "resumed",
      actionData: {},
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return args.sequenceId;
  },
});

/**
 * ARCHIVE SEQUENCE
 * Soft delete a sequence
 */
export const archiveSequence = mutation({
  args: {
    sessionId: v.string(),
    sequenceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence || sequence.type !== "automation_sequence") {
      throw new Error("Sequence not found");
    }

    await ctx.db.patch(args.sequenceId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    // Log archive
    await ctx.db.insert("objectActions", {
      organizationId: sequence.organizationId,
      objectId: args.sequenceId,
      actionType: "archived",
      actionData: {
        previousStatus: sequence.status,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return args.sequenceId;
  },
});

/**
 * DELETE SEQUENCE
 * Permanently delete a sequence (use archiveSequence instead for soft delete)
 */
export const deleteSequence = mutation({
  args: {
    sessionId: v.string(),
    sequenceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence || sequence.type !== "automation_sequence") {
      throw new Error("Sequence not found");
    }

    // Check for active enrollments
    const activeEnrollments = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", sequence.organizationId).eq("type", "sequence_enrollment")
      )
      .filter((q) => {
        return q.and(
          q.eq(q.field("customProperties.sequenceId"), args.sequenceId),
          q.eq(q.field("status"), "active")
        );
      })
      .take(1);

    if (activeEnrollments.length > 0) {
      throw new Error("Cannot delete sequence with active enrollments. Archive or exit enrollments first.");
    }

    // Delete the sequence
    await ctx.db.delete(args.sequenceId);

    // Log deletion
    await ctx.db.insert("objectActions", {
      organizationId: sequence.organizationId,
      objectId: args.sequenceId,
      actionType: "deleted",
      actionData: {
        sequenceName: sequence.name,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return args.sequenceId;
  },
});

// ============================================================================
// SEQUENCE STEP OPERATIONS
// ============================================================================

/**
 * ADD STEP TO SEQUENCE
 * Add a new step to a sequence
 */
export const addStep = mutation({
  args: {
    sessionId: v.string(),
    sequenceId: v.id("objects"),
    step: sequenceStepValidator,
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence || sequence.type !== "automation_sequence") {
      throw new Error("Sequence not found");
    }

    const currentProps = sequence.customProperties as Record<string, unknown>;
    const steps = [...((currentProps.steps as unknown[]) || []), args.step];

    await ctx.db.patch(args.sequenceId, {
      customProperties: {
        ...currentProps,
        steps,
        version: ((currentProps.version as number) || 0) + 1,
      },
      updatedAt: Date.now(),
    });

    // Log step addition
    await ctx.db.insert("objectActions", {
      organizationId: sequence.organizationId,
      objectId: args.sequenceId,
      actionType: "step_added",
      actionData: {
        stepId: args.step.id,
        stepOrder: args.step.order,
        channel: args.step.channel,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return args.sequenceId;
  },
});

/**
 * UPDATE STEP
 * Update an existing step in a sequence
 */
export const updateStep = mutation({
  args: {
    sessionId: v.string(),
    sequenceId: v.id("objects"),
    stepId: v.string(),
    updates: v.object({
      order: v.optional(v.number()),
      offsetType: v.optional(v.union(v.literal("before"), v.literal("after"))),
      offsetValue: v.optional(v.number()),
      offsetUnit: v.optional(v.union(v.literal("minutes"), v.literal("hours"), v.literal("days"))),
      referencePoint: v.optional(v.union(
        v.literal("trigger_event"),
        v.literal("booking_start"),
        v.literal("booking_end"),
        v.literal("previous_step")
      )),
      channel: v.optional(channelValidator),
      templateId: v.optional(v.id("objects")),
      conditions: v.optional(v.object({
        minDaysOut: v.optional(v.number()),
        onlyIfNotPaid: v.optional(v.boolean()),
        onlyIfNoReply: v.optional(v.boolean()),
        customCondition: v.optional(v.string()),
      })),
      enabled: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence || sequence.type !== "automation_sequence") {
      throw new Error("Sequence not found");
    }

    const currentProps = sequence.customProperties as Record<string, unknown>;
    const steps = (currentProps.steps as Array<Record<string, unknown>>) || [];

    const stepIndex = steps.findIndex((s) => s.id === args.stepId);
    if (stepIndex === -1) {
      throw new Error("Step not found");
    }

    // Update the step
    steps[stepIndex] = { ...steps[stepIndex], ...args.updates };

    await ctx.db.patch(args.sequenceId, {
      customProperties: {
        ...currentProps,
        steps,
        version: ((currentProps.version as number) || 0) + 1,
      },
      updatedAt: Date.now(),
    });

    // Log step update
    await ctx.db.insert("objectActions", {
      organizationId: sequence.organizationId,
      objectId: args.sequenceId,
      actionType: "step_updated",
      actionData: {
        stepId: args.stepId,
        updatedFields: Object.keys(args.updates),
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return args.sequenceId;
  },
});

/**
 * REMOVE STEP
 * Remove a step from a sequence
 */
export const removeStep = mutation({
  args: {
    sessionId: v.string(),
    sequenceId: v.id("objects"),
    stepId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence || sequence.type !== "automation_sequence") {
      throw new Error("Sequence not found");
    }

    const currentProps = sequence.customProperties as Record<string, unknown>;
    const steps = (currentProps.steps as Array<Record<string, unknown>>) || [];

    const filteredSteps = steps.filter((s) => s.id !== args.stepId);

    if (filteredSteps.length === steps.length) {
      throw new Error("Step not found");
    }

    // Re-order remaining steps
    filteredSteps.forEach((step, index) => {
      step.order = index;
    });

    await ctx.db.patch(args.sequenceId, {
      customProperties: {
        ...currentProps,
        steps: filteredSteps,
        version: ((currentProps.version as number) || 0) + 1,
      },
      updatedAt: Date.now(),
    });

    // Log step removal
    await ctx.db.insert("objectActions", {
      organizationId: sequence.organizationId,
      objectId: args.sequenceId,
      actionType: "step_removed",
      actionData: {
        stepId: args.stepId,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return args.sequenceId;
  },
});

/**
 * REORDER STEPS
 * Reorder steps in a sequence
 */
export const reorderSteps = mutation({
  args: {
    sessionId: v.string(),
    sequenceId: v.id("objects"),
    stepIds: v.array(v.string()), // Array of step IDs in new order
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence || sequence.type !== "automation_sequence") {
      throw new Error("Sequence not found");
    }

    const currentProps = sequence.customProperties as Record<string, unknown>;
    const steps = (currentProps.steps as Array<Record<string, unknown>>) || [];

    // Create a map for quick lookup
    const stepMap = new Map(steps.map((s) => [s.id, s]));

    // Reorder based on provided IDs
    const reorderedSteps = args.stepIds
      .map((id, index) => {
        const step = stepMap.get(id);
        if (step) {
          return { ...step, order: index };
        }
        return null;
      })
      .filter(Boolean);

    await ctx.db.patch(args.sequenceId, {
      customProperties: {
        ...currentProps,
        steps: reorderedSteps,
        version: ((currentProps.version as number) || 0) + 1,
      },
      updatedAt: Date.now(),
    });

    // Log reorder
    await ctx.db.insert("objectActions", {
      organizationId: sequence.organizationId,
      objectId: args.sequenceId,
      actionType: "steps_reordered",
      actionData: {
        newOrder: args.stepIds,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return args.sequenceId;
  },
});

// ============================================================================
// SEQUENCE QUERIES
// ============================================================================

/**
 * GET SEQUENCES BY TRIGGER
 * Find active sequences that match a trigger event
 */
export const getSequencesByTrigger = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    triggerEvent: v.string(),
    bookingSubtype: v.optional(v.string()),
    pipelineId: v.optional(v.id("objects")),
    pipelineStageId: v.optional(v.id("objects")),
    tagId: v.optional(v.id("objects")),
    formId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    // Get all active sequences for the organization
    const sequences = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "automation_sequence")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Filter by trigger event and conditions
    return sequences.filter((seq) => {
      const props = seq.customProperties as Record<string, unknown>;

      // Check trigger event matches
      if (props.triggerEvent !== args.triggerEvent) {
        return false;
      }

      // Check trigger filters
      const filters = props.triggerFilters as Record<string, unknown> | undefined;
      if (!filters) return true;

      // Booking subtype filter
      const bookingSubtypes = filters.bookingSubtypes as string[] | undefined;
      if (bookingSubtypes?.length && args.bookingSubtype) {
        if (!bookingSubtypes.includes(args.bookingSubtype)) {
          return false;
        }
      }

      // Pipeline filter
      if (filters.pipelineId && args.pipelineId) {
        if (filters.pipelineId !== args.pipelineId) {
          return false;
        }
      }

      // Stage filter
      if (filters.pipelineStageId && args.pipelineStageId) {
        if (filters.pipelineStageId !== args.pipelineStageId) {
          return false;
        }
      }

      // Tag filter
      const tagIds = filters.tagIds as string[] | undefined;
      if (tagIds?.length && args.tagId) {
        if (!tagIds.includes(args.tagId)) {
          return false;
        }
      }

      // Form filter
      const formIds = filters.formIds as string[] | undefined;
      if (formIds?.length && args.formId) {
        if (!formIds.includes(args.formId)) {
          return false;
        }
      }

      return true;
    });
  },
});

/**
 * GET SEQUENCE STATS
 * Get enrollment and message statistics for a sequence
 */
export const getSequenceStats = query({
  args: {
    sessionId: v.string(),
    sequenceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const sequence = await ctx.db.get(args.sequenceId);
    if (!sequence || sequence.type !== "automation_sequence") {
      throw new Error("Sequence not found");
    }

    // Get enrollment counts
    const enrollments = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", sequence.organizationId).eq("type", "sequence_enrollment")
      )
      .filter((q) => q.eq(q.field("customProperties.sequenceId"), args.sequenceId))
      .collect();

    const stats = {
      totalEnrollments: enrollments.length,
      activeEnrollments: enrollments.filter((e) => e.status === "active").length,
      completedEnrollments: enrollments.filter((e) => e.status === "completed").length,
      exitedEnrollments: enrollments.filter((e) => e.status === "exited").length,
      pausedEnrollments: enrollments.filter((e) => e.status === "paused").length,
    };

    // Get message counts from queue
    const messages = await ctx.db
      .query("sequenceMessageQueue")
      .withIndex("by_sequence", (q) => q.eq("sequenceId", args.sequenceId))
      .collect();

    const messageStats = {
      totalMessages: messages.length,
      scheduledMessages: messages.filter((m) => m.status === "scheduled").length,
      sentMessages: messages.filter((m) => m.status === "sent").length,
      failedMessages: messages.filter((m) => m.status === "failed").length,
      cancelledMessages: messages.filter((m) => m.status === "cancelled").length,
    };

    return { ...stats, ...messageStats };
  },
});
