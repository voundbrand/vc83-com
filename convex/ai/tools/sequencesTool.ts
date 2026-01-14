/**
 * AI Sequences Management Tool
 *
 * Comprehensive tool for managing automation sequences through natural language.
 *
 * Handles:
 * - Sequences: list, get, create, activate, pause, resume, archive
 * - Enrollments: list, enroll contact, pause, resume, cancel
 * - Templates: list (read-only for AI tool)
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

// ============================================================================
// TOOL DEFINITION
// ============================================================================

export const sequencesToolDefinition = {
  type: "function" as const,
  function: {
    name: "manage_sequences",
    description: `Comprehensive automation sequence management for multi-channel messaging.

SEQUENCE TYPES:
- "vorher" - Pre-event/booking sequences (reminders before booking)
- "waehrend" - During event/booking sequences
- "nachher" - Post-event/booking sequences (follow-ups)
- "lifecycle" - Customer lifecycle sequences
- "custom" - Custom sequences

SEQUENCE STATUS:
- "draft" - Being edited, not active
- "active" - Published and enrolling contacts
- "paused" - Temporarily stopped
- "archived" - Archived/deleted

TRIGGER EVENTS:
- "booking_confirmed" - When booking is confirmed
- "booking_checked_in" - When customer checks in
- "booking_completed" - When booking is completed
- "booking_cancelled" - When booking is cancelled
- "pipeline_stage_changed" - When CRM stage changes
- "contact_tagged" - When contact receives a tag
- "form_submitted" - When form is submitted
- "manual_enrollment" - Manual enrollment only

CHANNELS:
- "email" - Email messages via Resend
- "sms" - SMS messages (via Infobip)
- "whatsapp" - WhatsApp messages (via Infobip)
- "preferred" - Use contact's preferred channel

Use this tool to:
1. List and search sequences
2. Get sequence details and statistics
3. Create new automation sequences
4. Activate, pause, resume, or archive sequences
5. Manually enroll contacts in sequences
6. View and manage enrollments (pause, resume, cancel)
7. List message templates`,
    parameters: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: [
            "list_sequences",
            "get_sequence",
            "create_sequence",
            "activate_sequence",
            "pause_sequence",
            "resume_sequence",
            "archive_sequence",
            "list_enrollments",
            "get_enrollment",
            "enroll_contact",
            "pause_enrollment",
            "resume_enrollment",
            "cancel_enrollment",
            "list_templates",
            "get_sequence_stats"
          ],
          description: "Action to perform"
        },
        mode: {
          type: "string",
          enum: ["preview", "execute"],
          description: "preview = show what will be created/updated (default), execute = actually perform the operation"
        },
        workItemId: {
          type: "string",
          description: "Work item ID (for execute mode - returned from preview)"
        },
        // Sequence fields
        sequenceId: {
          type: "string",
          description: "Sequence ID (for get_sequence, activate, pause, resume, archive, get_sequence_stats)"
        },
        name: {
          type: "string",
          description: "Sequence name (for create_sequence)"
        },
        description: {
          type: "string",
          description: "Sequence description (for create_sequence)"
        },
        subtype: {
          type: "string",
          enum: ["vorher", "waehrend", "nachher", "lifecycle", "custom"],
          description: "Sequence type (for create_sequence)"
        },
        triggerEvent: {
          type: "string",
          enum: [
            "booking_confirmed",
            "booking_checked_in",
            "booking_completed",
            "booking_cancelled",
            "pipeline_stage_changed",
            "contact_tagged",
            "form_submitted",
            "manual_enrollment"
          ],
          description: "Trigger event (for create_sequence)"
        },
        channels: {
          type: "array",
          items: { type: "string", enum: ["email", "sms", "whatsapp", "preferred"] },
          description: "Channels to use (for create_sequence)"
        },
        // Enrollment fields
        enrollmentId: {
          type: "string",
          description: "Enrollment ID (for get_enrollment, pause_enrollment, resume_enrollment, cancel_enrollment)"
        },
        contactId: {
          type: "string",
          description: "Contact ID (for enroll_contact, list_enrollments filter)"
        },
        bookingId: {
          type: "string",
          description: "Booking ID (for enroll_contact, list_enrollments filter)"
        },
        cancelReason: {
          type: "string",
          enum: ["manual_removal", "booking_cancelled", "contact_unsubscribed"],
          description: "Reason for cancellation (for cancel_enrollment)"
        },
        // Filters
        filterStatus: {
          type: "string",
          enum: ["draft", "active", "paused", "archived", "completed", "exited"],
          description: "Filter by status"
        },
        filterTriggerEvent: {
          type: "string",
          description: "Filter sequences by trigger event"
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 20)"
        }
      },
      required: ["action"]
    }
  }
};

// ============================================================================
// MAIN TOOL HANDLER
// ============================================================================

export const executeManageSequences = action({
  args: {
    sessionId: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    conversationId: v.optional(v.id("aiConversations")),
    action: v.string(),
    mode: v.optional(v.string()),
    workItemId: v.optional(v.string()),
    // Sequence fields
    sequenceId: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    subtype: v.optional(v.string()),
    triggerEvent: v.optional(v.string()),
    channels: v.optional(v.array(v.string())),
    // Enrollment fields
    enrollmentId: v.optional(v.string()),
    contactId: v.optional(v.string()),
    bookingId: v.optional(v.string()),
    cancelReason: v.optional(v.string()),
    // Filters
    filterStatus: v.optional(v.string()),
    filterTriggerEvent: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    action: string;
    mode?: string;
    workItemId?: string;
    workItemType?: string;
    data?: unknown;
    message?: string;
    error?: string;
  }> => {
    // Get organization ID and userId
    let organizationId: Id<"organizations">;
    let userId: Id<"users"> | undefined = args.userId;
    let sessionId: string | undefined = args.sessionId;

    if (args.organizationId && args.userId) {
      organizationId = args.organizationId;
      userId = args.userId;
    } else if (args.sessionId) {
      const session = await ctx.runQuery(internal.stripeConnect.validateSession, {
        sessionId: args.sessionId
      });

      if (!session || !session.organizationId || !session.userId) {
        throw new Error("Invalid session or user must belong to an organization");
      }

      organizationId = session.organizationId;
      userId = session.userId;
      sessionId = args.sessionId;
    } else {
      throw new Error("Either sessionId or (organizationId and userId) must be provided");
    }

    try {
      switch (args.action) {
        // Sequence actions
        case "list_sequences":
          return await listSequences(ctx, organizationId, sessionId!, args);

        case "get_sequence":
          if (!args.sequenceId) {
            throw new Error("sequenceId is required for get_sequence");
          }
          return await getSequence(ctx, sessionId!, args);

        case "create_sequence":
          if (!args.name || !args.triggerEvent) {
            throw new Error("name and triggerEvent are required for create_sequence");
          }
          if (!userId) {
            throw new Error("userId is required for create_sequence");
          }
          return await createSequence(ctx, organizationId, userId, sessionId!, args);

        case "activate_sequence":
          if (!args.sequenceId) {
            throw new Error("sequenceId is required for activate_sequence");
          }
          return await updateSequenceStatus(ctx, sessionId!, args.sequenceId, "activate");

        case "pause_sequence":
          if (!args.sequenceId) {
            throw new Error("sequenceId is required for pause_sequence");
          }
          return await updateSequenceStatus(ctx, sessionId!, args.sequenceId, "pause");

        case "resume_sequence":
          if (!args.sequenceId) {
            throw new Error("sequenceId is required for resume_sequence");
          }
          return await updateSequenceStatus(ctx, sessionId!, args.sequenceId, "resume");

        case "archive_sequence":
          if (!args.sequenceId) {
            throw new Error("sequenceId is required for archive_sequence");
          }
          return await updateSequenceStatus(ctx, sessionId!, args.sequenceId, "archive");

        case "get_sequence_stats":
          if (!args.sequenceId) {
            throw new Error("sequenceId is required for get_sequence_stats");
          }
          return await getSequenceStats(ctx, sessionId!, args);

        // Enrollment actions
        case "list_enrollments":
          return await listEnrollments(ctx, organizationId, sessionId!, args);

        case "get_enrollment":
          if (!args.enrollmentId) {
            throw new Error("enrollmentId is required for get_enrollment");
          }
          return await getEnrollment(ctx, sessionId!, args);

        case "enroll_contact":
          if (!args.sequenceId || !args.contactId) {
            throw new Error("sequenceId and contactId are required for enroll_contact");
          }
          return await enrollContact(ctx, sessionId!, args);

        case "pause_enrollment":
          if (!args.enrollmentId) {
            throw new Error("enrollmentId is required for pause_enrollment");
          }
          return await updateEnrollmentStatus(ctx, sessionId!, args.enrollmentId, "pause");

        case "resume_enrollment":
          if (!args.enrollmentId) {
            throw new Error("enrollmentId is required for resume_enrollment");
          }
          return await updateEnrollmentStatus(ctx, sessionId!, args.enrollmentId, "resume");

        case "cancel_enrollment":
          if (!args.enrollmentId) {
            throw new Error("enrollmentId is required for cancel_enrollment");
          }
          return await cancelEnrollment(ctx, sessionId!, args);

        // Template actions
        case "list_templates":
          return await listTemplates(ctx, organizationId, sessionId!, args);

        default:
          return {
            success: false,
            action: args.action,
            error: "Invalid action",
            message: "Action must be one of: list_sequences, get_sequence, create_sequence, activate_sequence, pause_sequence, resume_sequence, archive_sequence, list_enrollments, get_enrollment, enroll_contact, pause_enrollment, resume_enrollment, cancel_enrollment, list_templates, get_sequence_stats"
          };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        action: args.action,
        error: errorMessage,
        message: `Failed to ${args.action}: ${errorMessage}`
      };
    }
  }
});

// ============================================================================
// SEQUENCE ACTION IMPLEMENTATIONS
// ============================================================================

/**
 * List sequences for the organization
 */
async function listSequences(
  ctx: unknown,
  organizationId: Id<"organizations">,
  sessionId: string,
  args: {
    filterStatus?: string;
    filterTriggerEvent?: string;
    limit?: number;
  }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sequences = await (ctx as any).runQuery(
    api.sequences.sequenceOntology.listSequences,
    {
      sessionId,
      organizationId,
      status: args.filterStatus,
      triggerEvent: args.filterTriggerEvent,
    }
  );

  const limit = args.limit || 20;
  const limitedSequences = sequences.slice(0, limit);

  const formattedSequences = limitedSequences.map((s: {
    _id: string;
    name: string;
    subtype: string;
    status: string;
    customProperties: Record<string, unknown>;
  }) => {
    const props = s.customProperties;
    const steps = (props.steps as unknown[]) || [];
    return {
      id: s._id,
      name: s.name,
      type: s.subtype,
      status: s.status,
      triggerEvent: props.triggerEvent,
      channels: props.channels || ["email"],
      stepsCount: steps.length,
      stats: {
        totalEnrollments: props.totalEnrollments || 0,
        activeEnrollments: props.activeEnrollments || 0,
        completedEnrollments: props.completedEnrollments || 0,
      },
    };
  });

  return {
    success: true,
    action: "list_sequences",
    data: {
      items: formattedSequences,
      total: sequences.length,
      showing: limitedSequences.length,
    },
    message: `Found ${sequences.length} sequence(s)`
  };
}

/**
 * Get a single sequence by ID
 */
async function getSequence(
  ctx: unknown,
  sessionId: string,
  args: { sequenceId?: string }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sequence = await (ctx as any).runQuery(
    api.sequences.sequenceOntology.getSequence,
    {
      sessionId,
      sequenceId: args.sequenceId as Id<"objects">,
    }
  );

  if (!sequence) {
    return {
      success: false,
      action: "get_sequence",
      error: "Sequence not found",
      message: `No sequence found with ID: ${args.sequenceId}`
    };
  }

  const props = sequence.customProperties as Record<string, unknown>;
  const steps = (props.steps as Array<Record<string, unknown>>) || [];

  return {
    success: true,
    action: "get_sequence",
    data: {
      id: sequence._id,
      name: sequence.name,
      description: sequence.description,
      type: sequence.subtype,
      status: sequence.status,
      triggerEvent: props.triggerEvent,
      triggerFilters: props.triggerFilters,
      channels: props.channels || ["email"],
      enrollmentMode: props.enrollmentMode,
      steps: steps.map((step) => ({
        id: step.id,
        order: step.order,
        channel: step.channel,
        offsetType: step.offsetType,
        offsetValue: step.offsetValue,
        offsetUnit: step.offsetUnit,
        referencePoint: step.referencePoint,
        templateId: step.templateId,
        enabled: step.enabled,
      })),
      stats: {
        totalEnrollments: props.totalEnrollments || 0,
        activeEnrollments: props.activeEnrollments || 0,
        completedEnrollments: props.completedEnrollments || 0,
        exitedEnrollments: props.exitedEnrollments || 0,
        messagesSent: props.messagesSent || 0,
      },
      sendingWindow: props.sendingWindow,
      exitConditions: props.exitConditions,
      version: props.version,
      lastPublishedAt: props.lastPublishedAt,
    },
    message: `Sequence: ${sequence.name}`
  };
}

/**
 * Create a new sequence
 */
async function createSequence(
  ctx: unknown,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  sessionId: string,
  args: {
    mode?: string;
    workItemId?: string;
    conversationId?: Id<"aiConversations">;
    name?: string;
    description?: string;
    subtype?: string;
    triggerEvent?: string;
    channels?: string[];
  }
) {
  const mode = args.mode || "preview";

  // PREVIEW MODE
  if (mode === "preview") {
    const previewData = {
      id: "temp-" + Date.now(),
      type: "sequence",
      name: args.name,
      status: "preview",
      details: {
        subtype: args.subtype || "custom",
        triggerEvent: args.triggerEvent,
        channels: args.channels || ["email"],
        description: args.description,
      },
      preview: {
        action: "create" as const,
        confidence: "high" as const,
        reason: "New automation sequence will be created",
        changes: {
          name: { old: null, new: args.name },
          trigger: { old: null, new: args.triggerEvent },
          status: { old: null, new: "draft" },
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workItemId = await (ctx as any).runMutation(
      internal.ai.tools.internalToolMutations.internalCreateWorkItem,
      {
        organizationId,
        userId,
        conversationId: args.conversationId!,
        type: "sequence_create",
        name: `Create Sequence - ${args.name}`,
        status: "preview",
        previewData: [previewData],
      }
    );

    return {
      success: true,
      action: "create_sequence",
      mode: "preview",
      workItemId,
      workItemType: "sequence_create",
      data: {
        items: [previewData],
        summary: { total: 1, toCreate: 1 }
      },
      message: `📋 Ready to create sequence "${args.name}" triggered by ${args.triggerEvent}. Review and approve to proceed.`
    };
  }

  // EXECUTE MODE
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sequenceId = await (ctx as any).runMutation(
    api.sequences.sequenceOntology.createSequence,
    {
      sessionId,
      organizationId,
      name: args.name!,
      description: args.description,
      subtype: args.subtype || "custom",
      triggerEvent: args.triggerEvent!,
      channels: args.channels as Array<"email" | "sms" | "whatsapp" | "preferred">,
    }
  );

  // Update work item
  if (args.workItemId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ctx as any).runMutation(
      internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
      {
        workItemId: args.workItemId as Id<"aiWorkItems">,
        status: "completed",
        results: { sequenceId },
      }
    );
  }

  return {
    success: true,
    action: "create_sequence",
    mode: "execute",
    workItemId: args.workItemId,
    data: {
      items: [{
        id: sequenceId,
        type: "sequence",
        name: args.name,
        status: "draft",
        triggerEvent: args.triggerEvent,
      }],
      summary: { total: 1, created: 1 }
    },
    message: `✅ Created sequence "${args.name}" (draft). Add steps and activate to start enrolling contacts.`
  };
}

/**
 * Update sequence status (activate, pause, resume, archive)
 */
async function updateSequenceStatus(
  ctx: unknown,
  sessionId: string,
  sequenceId: string,
  operation: "activate" | "pause" | "resume" | "archive"
) {
  const mutationMap = {
    activate: api.sequences.sequenceOntology.activateSequence,
    pause: api.sequences.sequenceOntology.pauseSequence,
    resume: api.sequences.sequenceOntology.resumeSequence,
    archive: api.sequences.sequenceOntology.archiveSequence,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (ctx as any).runMutation(mutationMap[operation], {
    sessionId,
    sequenceId: sequenceId as Id<"objects">,
  });

  const messageMap = {
    activate: "✅ Sequence activated and now enrolling contacts",
    pause: "⏸️ Sequence paused - new enrollments stopped",
    resume: "▶️ Sequence resumed and now enrolling contacts",
    archive: "🗄️ Sequence archived",
  };

  const actionMap = {
    activate: "activate_sequence",
    pause: "pause_sequence",
    resume: "resume_sequence",
    archive: "archive_sequence",
  };

  const newStatusMap = {
    activate: "active",
    pause: "paused",
    resume: "active",
    archive: "archived",
  };

  return {
    success: true,
    action: actionMap[operation],
    data: {
      sequenceId,
      newStatus: newStatusMap[operation],
    },
    message: messageMap[operation]
  };
}

/**
 * Get sequence statistics
 */
async function getSequenceStats(
  ctx: unknown,
  sessionId: string,
  args: { sequenceId?: string }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = await (ctx as any).runQuery(
    api.sequences.sequenceOntology.getSequenceStats,
    {
      sessionId,
      sequenceId: args.sequenceId as Id<"objects">,
    }
  );

  return {
    success: true,
    action: "get_sequence_stats",
    data: stats,
    message: `Sequence has ${stats.totalEnrollments} total enrollments (${stats.activeEnrollments} active, ${stats.completedEnrollments} completed)`
  };
}

// ============================================================================
// ENROLLMENT ACTION IMPLEMENTATIONS
// ============================================================================

/**
 * List enrollments for the organization
 */
async function listEnrollments(
  ctx: unknown,
  organizationId: Id<"organizations">,
  sessionId: string,
  args: {
    sequenceId?: string;
    contactId?: string;
    bookingId?: string;
    filterStatus?: string;
    limit?: number;
  }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrollments = await (ctx as any).runQuery(
    api.sequences.enrollmentOntology.listEnrollments,
    {
      sessionId,
      organizationId,
      sequenceId: args.sequenceId ? args.sequenceId as Id<"objects"> : undefined,
      contactId: args.contactId ? args.contactId as Id<"objects"> : undefined,
      bookingId: args.bookingId ? args.bookingId as Id<"objects"> : undefined,
      status: args.filterStatus as "active" | "paused" | "completed" | "exited" | undefined,
      limit: args.limit || 20,
    }
  );

  const formattedEnrollments = enrollments.map((e: {
    _id: string;
    name: string;
    status: string;
    customProperties: Record<string, unknown>;
    createdAt: number;
  }) => {
    const props = e.customProperties;
    return {
      id: e._id,
      name: e.name,
      status: e.status,
      sequenceId: props.sequenceId,
      contactId: props.contactId,
      bookingId: props.bookingId,
      currentStepIndex: props.currentStepIndex,
      completedSteps: (props.completedSteps as unknown[])?.length || 0,
      enrolledAt: props.enrolledAt ? new Date(props.enrolledAt as number).toISOString() : null,
      enrolledBy: props.enrolledBy,
      exitReason: props.exitReason,
      exitedAt: props.exitedAt ? new Date(props.exitedAt as number).toISOString() : null,
    };
  });

  return {
    success: true,
    action: "list_enrollments",
    data: {
      items: formattedEnrollments,
      total: enrollments.length,
    },
    message: `Found ${enrollments.length} enrollment(s)`
  };
}

/**
 * Get a single enrollment by ID
 */
async function getEnrollment(
  ctx: unknown,
  sessionId: string,
  args: { enrollmentId?: string }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrollment = await (ctx as any).runQuery(
    api.sequences.enrollmentOntology.getEnrollment,
    {
      sessionId,
      enrollmentId: args.enrollmentId as Id<"objects">,
    }
  );

  if (!enrollment) {
    return {
      success: false,
      action: "get_enrollment",
      error: "Enrollment not found",
      message: `No enrollment found with ID: ${args.enrollmentId}`
    };
  }

  const props = enrollment.customProperties as Record<string, unknown>;

  // Get scheduled messages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = await (ctx as any).runQuery(
    api.sequences.enrollmentOntology.getEnrollmentMessages,
    {
      sessionId,
      enrollmentId: args.enrollmentId as Id<"objects">,
    }
  );

  return {
    success: true,
    action: "get_enrollment",
    data: {
      id: enrollment._id,
      name: enrollment.name,
      status: enrollment.status,
      sequenceId: props.sequenceId,
      contactId: props.contactId,
      bookingId: props.bookingId,
      currentStepIndex: props.currentStepIndex,
      completedSteps: props.completedSteps,
      skippedSteps: props.skippedSteps,
      enrolledAt: props.enrolledAt ? new Date(props.enrolledAt as number).toISOString() : null,
      enrolledBy: props.enrolledBy,
      triggerEvent: props.triggerEvent,
      exitReason: props.exitReason,
      exitedAt: props.exitedAt ? new Date(props.exitedAt as number).toISOString() : null,
      completedAt: props.completedAt ? new Date(props.completedAt as number).toISOString() : null,
      messages: messages.map((m: {
        _id: string;
        stepId: string;
        channel: string;
        status: string;
        scheduledFor: number;
        sentAt?: number;
      }) => ({
        id: m._id,
        stepId: m.stepId,
        channel: m.channel,
        status: m.status,
        scheduledFor: new Date(m.scheduledFor).toISOString(),
        sentAt: m.sentAt ? new Date(m.sentAt).toISOString() : null,
      })),
    },
    message: `Enrollment: ${enrollment.name}`
  };
}

/**
 * Manually enroll a contact in a sequence
 */
async function enrollContact(
  ctx: unknown,
  sessionId: string,
  args: {
    sequenceId?: string;
    contactId?: string;
    bookingId?: string;
  }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (ctx as any).runMutation(
    api.sequences.enrollmentOntology.enrollContactManually,
    {
      sessionId,
      sequenceId: args.sequenceId as Id<"objects">,
      contactId: args.contactId as Id<"objects">,
      bookingId: args.bookingId ? args.bookingId as Id<"objects"> : undefined,
    }
  );

  return {
    success: true,
    action: "enroll_contact",
    data: {
      enrollmentId: result.enrollmentId,
      sequenceName: result.sequenceName,
      contactName: result.contactName,
    },
    message: `✅ Enrolled "${result.contactName}" in sequence "${result.sequenceName}"`
  };
}

/**
 * Update enrollment status (pause, resume)
 */
async function updateEnrollmentStatus(
  ctx: unknown,
  sessionId: string,
  enrollmentId: string,
  operation: "pause" | "resume"
) {
  const mutationMap = {
    pause: api.sequences.enrollmentOntology.pauseEnrollment,
    resume: api.sequences.enrollmentOntology.resumeEnrollment,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (ctx as any).runMutation(mutationMap[operation], {
    sessionId,
    enrollmentId: enrollmentId as Id<"objects">,
  });

  const messageMap = {
    pause: "⏸️ Enrollment paused - messages will not be sent until resumed",
    resume: "▶️ Enrollment resumed - message scheduling will continue",
  };

  const actionMap = {
    pause: "pause_enrollment",
    resume: "resume_enrollment",
  };

  const newStatusMap = {
    pause: "paused",
    resume: "active",
  };

  return {
    success: true,
    action: actionMap[operation],
    data: {
      enrollmentId,
      newStatus: newStatusMap[operation],
    },
    message: messageMap[operation]
  };
}

/**
 * Cancel an enrollment
 */
async function cancelEnrollment(
  ctx: unknown,
  sessionId: string,
  args: {
    enrollmentId?: string;
    cancelReason?: string;
  }
) {
  const reason = args.cancelReason || "manual_removal";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (ctx as any).runMutation(
    api.sequences.enrollmentOntology.cancelEnrollment,
    {
      sessionId,
      enrollmentId: args.enrollmentId as Id<"objects">,
      reason: reason as "manual_removal" | "booking_cancelled" | "contact_unsubscribed" | "sequence_completed" | "sequence_paused" | "sequence_archived" | "condition_not_met" | "error",
    }
  );

  return {
    success: true,
    action: "cancel_enrollment",
    data: {
      enrollmentId: result.enrollmentId,
      cancelledMessages: result.cancelledMessages,
    },
    message: `❌ Enrollment cancelled (${result.cancelledMessages} pending messages cancelled)`
  };
}

// ============================================================================
// TEMPLATE ACTION IMPLEMENTATIONS
// ============================================================================

/**
 * List message templates for the organization
 */
async function listTemplates(
  ctx: unknown,
  organizationId: Id<"organizations">,
  sessionId: string,
  args: {
    limit?: number;
  }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const templates = await (ctx as any).runQuery(
    api.sequences.templateOntology.listTemplates,
    {
      sessionId,
      organizationId,
    }
  );

  const limit = args.limit || 20;
  const limitedTemplates = templates.slice(0, limit);

  const formattedTemplates = limitedTemplates.map((t: {
    _id: string;
    name: string;
    subtype: string;
    status: string;
    customProperties: Record<string, unknown>;
  }) => {
    const props = t.customProperties;
    return {
      id: t._id,
      name: t.name,
      channel: t.subtype,
      status: t.status,
      subject: props.subject,
      hasVariables: ((props.variables as unknown[]) || []).length > 0,
      variableCount: ((props.variables as unknown[]) || []).length,
    };
  });

  return {
    success: true,
    action: "list_templates",
    data: {
      items: formattedTemplates,
      total: templates.length,
      showing: limitedTemplates.length,
    },
    message: `Found ${templates.length} template(s)`
  };
}
