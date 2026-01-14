/**
 * STEP EXECUTOR
 *
 * Schedules messages for sequence enrollments.
 * Calculates delivery times based on step offsets and sending windows.
 *
 * Step Configuration:
 * - offsetType: "before" | "after" the reference point
 * - offsetValue: number of units
 * - offsetUnit: "minutes" | "hours" | "days"
 * - referencePoint: "trigger_event" | "booking_start" | "booking_end"
 *
 * Sending Window:
 * - Can restrict sending to specific hours (e.g., 9 AM - 6 PM)
 * - Can exclude weekends
 * - Respects timezone
 */

import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

// ============================================================================
// TYPES
// ============================================================================

interface SequenceStep {
  id: string;
  order: number;
  offsetType: "before" | "after";
  offsetValue: number;
  offsetUnit: "minutes" | "hours" | "days";
  referencePoint: "trigger_event" | "booking_start" | "booking_end";
  channel: "email" | "sms" | "whatsapp" | "preferred";
  templateId?: Id<"objects">;
  subject?: string;
  body?: string;
  conditions?: {
    minDaysOut?: number;
    onlyIfNotPaid?: boolean;
    customCondition?: string;
  };
  enabled: boolean;
}

interface SendingWindow {
  enabled: boolean;
  startHour: number;
  endHour: number;
  timezone: string;
  excludeWeekends: boolean;
}

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * Get enrollment with related data
 */
export const getEnrollmentWithContext = internalQuery({
  args: {
    enrollmentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment || enrollment.type !== "sequence_enrollment") {
      return null;
    }

    const enrollmentProps = enrollment.customProperties as Record<string, unknown>;

    // Get sequence
    const sequence = await ctx.db.get(enrollmentProps.sequenceId as Id<"objects">);
    if (!sequence) return null;

    // Get contact
    const contact = await ctx.db.get(enrollmentProps.contactId as Id<"objects">);
    if (!contact) return null;

    // Get booking if exists
    let booking = null;
    if (enrollmentProps.bookingId) {
      booking = await ctx.db.get(enrollmentProps.bookingId as Id<"objects">);
    }

    return {
      enrollment,
      enrollmentProps,
      sequence,
      sequenceProps: sequence.customProperties as Record<string, unknown>,
      contact,
      contactProps: contact.customProperties as Record<string, unknown>,
      booking,
      bookingProps: booking?.customProperties as Record<string, unknown> | null,
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * Schedule all messages for an enrollment
 * Called when enrollment is created
 */
export const scheduleEnrollmentMessages = internalMutation({
  args: {
    enrollmentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ctx as any).internal?.sequences?.stepExecutor?.getEnrollmentWithContext ??
      // Fallback for direct internal calls
      { kind: "query", name: "sequences/stepExecutor:getEnrollmentWithContext" } as any,
      { enrollmentId: args.enrollmentId }
    );

    // Get data directly since we're in same context
    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment || enrollment.type !== "sequence_enrollment") {
      console.log(`[StepExecutor] Enrollment not found: ${args.enrollmentId}`);
      return { scheduled: 0 };
    }

    const enrollmentProps = enrollment.customProperties as Record<string, unknown>;

    const sequence = await ctx.db.get(enrollmentProps.sequenceId as Id<"objects">);
    if (!sequence) {
      console.log(`[StepExecutor] Sequence not found for enrollment: ${args.enrollmentId}`);
      return { scheduled: 0 };
    }

    const contact = await ctx.db.get(enrollmentProps.contactId as Id<"objects">);
    if (!contact) {
      console.log(`[StepExecutor] Contact not found for enrollment: ${args.enrollmentId}`);
      return { scheduled: 0 };
    }

    let booking = null;
    if (enrollmentProps.bookingId) {
      booking = await ctx.db.get(enrollmentProps.bookingId as Id<"objects">);
    }

    const sequenceProps = sequence.customProperties as Record<string, unknown>;
    const contactProps = contact.customProperties as Record<string, unknown>;
    const bookingProps = booking?.customProperties as Record<string, unknown> | null;

    const steps = (sequenceProps.steps as SequenceStep[]) || [];
    const sendingWindow = sequenceProps.sendingWindow as SendingWindow | undefined;
    const referenceTimestamp = enrollmentProps.referenceTimestamp as number;

    // Get reference times
    const bookingStart = bookingProps?.startDateTime as number | undefined;
    const bookingEnd = bookingProps?.endDateTime as number | undefined;

    let scheduledCount = 0;
    const now = Date.now();

    for (const step of steps) {
      if (!step.enabled) continue;

      // Calculate scheduled time
      let scheduledFor = calculateScheduledTime(
        step,
        referenceTimestamp,
        bookingStart,
        bookingEnd
      );

      // Skip if in the past
      if (scheduledFor < now) {
        console.log(`[StepExecutor] Skipping step ${step.id} - scheduled time in past`);
        continue;
      }

      // Apply sending window if configured
      if (sendingWindow?.enabled) {
        scheduledFor = applySchedulingWindow(scheduledFor, sendingWindow);
      }

      // Check step conditions
      if (!checkStepConditions(step, bookingProps, scheduledFor)) {
        console.log(`[StepExecutor] Skipping step ${step.id} - conditions not met`);
        continue;
      }

      // Determine channel
      const channel = resolveChannel(step.channel, contactProps);

      // Get recipient info
      const recipientEmail = contactProps.email as string | undefined;
      const recipientPhone = contactProps.phone as string | undefined;

      // Skip if no delivery method for channel
      if (channel === "email" && !recipientEmail) {
        console.log(`[StepExecutor] Skipping step ${step.id} - no email for contact`);
        continue;
      }
      if ((channel === "sms" || channel === "whatsapp") && !recipientPhone) {
        console.log(`[StepExecutor] Skipping step ${step.id} - no phone for contact`);
        continue;
      }

      // Render template if using template
      let subject = step.subject;
      let body = step.body || "";
      let bodyHtml: string | undefined;

      if (step.templateId) {
        const template = await ctx.db.get(step.templateId);
        if (template) {
          const templateProps = template.customProperties as Record<string, unknown>;
          subject = templateProps.subject as string | undefined;
          body = templateProps.body as string || "";
          bodyHtml = templateProps.bodyHtml as string | undefined;

          // Render variables
          const variables = buildTemplateVariables(contactProps, bookingProps);
          body = renderTemplate(body, variables);
          if (bodyHtml) {
            bodyHtml = renderTemplate(bodyHtml, variables);
          }
          if (subject) {
            subject = renderTemplate(subject, variables);
          }
        }
      }

      // Create message queue entry
      await ctx.db.insert("sequenceMessageQueue", {
        organizationId: sequence.organizationId,
        channel,
        recipientId: contact._id,
        recipientEmail: channel === "email" ? recipientEmail : undefined,
        recipientPhone: channel !== "email" ? recipientPhone : undefined,
        templateId: step.templateId,
        subject,
        body,
        bodyHtml,
        scheduledFor,
        sequenceId: sequence._id,
        sequenceStepIndex: step.order,
        enrollmentId: args.enrollmentId,
        bookingId: enrollmentProps.bookingId as Id<"objects"> | undefined,
        status: "scheduled",
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      scheduledCount++;
      console.log(`[StepExecutor] Scheduled message for step ${step.id} at ${new Date(scheduledFor).toISOString()}`);
    }

    return { scheduled: scheduledCount };
  },
});

/**
 * Reschedule remaining messages for an enrollment
 * Called when enrollment is resumed after pause
 */
export const rescheduleEnrollmentMessages = internalMutation({
  args: {
    enrollmentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Get cancelled messages for this enrollment
    const cancelledMessages = await ctx.db
      .query("sequenceMessageQueue")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", args.enrollmentId))
      .filter((q) => q.eq(q.field("status"), "cancelled"))
      .collect();

    const now = Date.now();
    let rescheduledCount = 0;

    for (const message of cancelledMessages) {
      // Calculate new scheduled time (maintain relative offset from now)
      const originalOffset = message.scheduledFor - message.createdAt;
      const newScheduledFor = now + Math.max(originalOffset, 60000); // At least 1 minute from now

      await ctx.db.patch(message._id, {
        status: "scheduled",
        scheduledFor: newScheduledFor,
        updatedAt: now,
      });

      rescheduledCount++;
    }

    return { rescheduled: rescheduledCount };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate scheduled time based on step configuration
 */
function calculateScheduledTime(
  step: SequenceStep,
  referenceTimestamp: number,
  bookingStart?: number,
  bookingEnd?: number
): number {
  // Determine base reference point
  let baseTime: number;

  switch (step.referencePoint) {
    case "booking_start":
      baseTime = bookingStart || referenceTimestamp;
      break;
    case "booking_end":
      baseTime = bookingEnd || referenceTimestamp;
      break;
    case "trigger_event":
    default:
      baseTime = referenceTimestamp;
  }

  // Calculate offset in milliseconds
  let offsetMs: number;
  switch (step.offsetUnit) {
    case "minutes":
      offsetMs = step.offsetValue * 60 * 1000;
      break;
    case "hours":
      offsetMs = step.offsetValue * 60 * 60 * 1000;
      break;
    case "days":
      offsetMs = step.offsetValue * 24 * 60 * 60 * 1000;
      break;
    default:
      offsetMs = 0;
  }

  // Apply offset direction
  if (step.offsetType === "before") {
    return baseTime - offsetMs;
  } else {
    return baseTime + offsetMs;
  }
}

/**
 * Apply sending window constraints
 */
function applySchedulingWindow(scheduledFor: number, window: SendingWindow): number {
  const date = new Date(scheduledFor);

  // Note: This is a simplified implementation
  // Production should use proper timezone handling (e.g., luxon or date-fns-tz)

  const hour = date.getUTCHours();
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday

  // Check weekend exclusion
  if (window.excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
    // Move to Monday
    const daysToAdd = dayOfWeek === 0 ? 1 : 2;
    date.setUTCDate(date.getUTCDate() + daysToAdd);
    date.setUTCHours(window.startHour, 0, 0, 0);
    return date.getTime();
  }

  // Check hour constraints
  if (hour < window.startHour) {
    // Move to start hour same day
    date.setUTCHours(window.startHour, 0, 0, 0);
    return date.getTime();
  }

  if (hour >= window.endHour) {
    // Move to start hour next day
    date.setUTCDate(date.getUTCDate() + 1);
    date.setUTCHours(window.startHour, 0, 0, 0);

    // Check if that lands on weekend
    const newDayOfWeek = date.getUTCDay();
    if (window.excludeWeekends && (newDayOfWeek === 0 || newDayOfWeek === 6)) {
      const daysToAdd = newDayOfWeek === 0 ? 1 : 2;
      date.setUTCDate(date.getUTCDate() + daysToAdd);
    }

    return date.getTime();
  }

  return scheduledFor;
}

/**
 * Check if step conditions are met
 */
function checkStepConditions(
  step: SequenceStep,
  bookingProps: Record<string, unknown> | null,
  scheduledFor: number
): boolean {
  const conditions = step.conditions;
  if (!conditions) return true;

  // Check minDaysOut condition
  if (conditions.minDaysOut !== undefined && bookingProps) {
    const bookingStart = bookingProps.startDateTime as number | undefined;
    if (bookingStart) {
      const daysOut = Math.floor((bookingStart - scheduledFor) / (24 * 60 * 60 * 1000));
      if (daysOut < conditions.minDaysOut) {
        return false;
      }
    }
  }

  // Check payment condition
  if (conditions.onlyIfNotPaid && bookingProps) {
    const paidAmount = (bookingProps.paidAmountCents as number) || 0;
    const totalAmount = (bookingProps.totalAmountCents as number) || 0;
    if (paidAmount >= totalAmount) {
      return false; // Already paid, skip
    }
  }

  return true;
}

/**
 * Resolve channel preference
 */
function resolveChannel(
  configuredChannel: "email" | "sms" | "whatsapp" | "preferred",
  contactProps: Record<string, unknown>
): "email" | "sms" | "whatsapp" {
  if (configuredChannel !== "preferred") {
    return configuredChannel;
  }

  // Check contact's preferred channel
  const preferred = contactProps.preferredChannel as string | undefined;
  if (preferred === "sms" || preferred === "whatsapp") {
    // Verify they have a phone number
    if (contactProps.phone) {
      return preferred;
    }
  }

  // Default to email
  return "email";
}

/**
 * Build template variables from context
 */
function buildTemplateVariables(
  contactProps: Record<string, unknown>,
  bookingProps: Record<string, unknown> | null
): Record<string, string> {
  const variables: Record<string, string> = {
    // Contact variables
    firstName: (contactProps.firstName as string) || "",
    lastName: (contactProps.lastName as string) || "",
    fullName: `${contactProps.firstName || ""} ${contactProps.lastName || ""}`.trim(),
    email: (contactProps.email as string) || "",
    phone: (contactProps.phone as string) || "",
  };

  // Booking variables
  if (bookingProps) {
    const startDate = new Date(bookingProps.startDateTime as number);
    const endDate = new Date(bookingProps.endDateTime as number);

    variables.eventName = (bookingProps.name as string) || "";
    variables.eventDate = startDate.toLocaleDateString("de-DE");
    variables.eventTime = startDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    variables.eventEndDate = endDate.toLocaleDateString("de-DE");
    variables.eventEndTime = endDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    variables.locationName = (bookingProps.locationName as string) || "";
  }

  return variables;
}

/**
 * Render template with variable substitution
 */
function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] || match;
  });
}
