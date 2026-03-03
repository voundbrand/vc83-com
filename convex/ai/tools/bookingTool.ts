/**
 * AI Booking Management Tool
 *
 * Comprehensive tool for managing bookings, locations, and availability through natural language.
 *
 * Handles:
 * - Bookings: create, list, update status, cancel, check-in, complete
 * - Locations: create, list, update, archive
 * - Availability: get available slots, manage schedules
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../_generated/api");

type VacationDecisionVerdict = "approved" | "conflict" | "denied" | "blocked";

export interface VacationDecisionAlternativeWindow {
  startDate: string;
  endDate: string;
}

export interface VacationDecisionResponseInput {
  verdict: VacationDecisionVerdict;
  requestedStartDate?: string;
  requestedEndDate?: string;
  reasonCodes: string[];
  alternatives?: VacationDecisionAlternativeWindow[];
  requireDirectColleagueDiscussion?: boolean;
  colleagueDiscussionTemplate?: string;
  calendarMutationStatus?: "succeeded" | "skipped" | "failed";
}

export interface VacationDecisionResponseContract {
  verdict: VacationDecisionVerdict;
  rationale: string;
  responseMessage: string;
  colleagueResolutionSuggested: boolean;
}

const VACATION_REASON_CODE_LABELS: Record<string, string> = {
  blocked_period: "request overlaps a blocked period",
  request_window_violation: "request is outside the allowed submission window",
  calendar_overlap: "calendar overlap exists in the requested range",
  max_concurrent_away: "maximum concurrent-away limit would be exceeded",
  min_on_duty_total_violation: "minimum on-duty total would be violated",
  min_on_duty_role_violation: "minimum on-duty role coverage would be violated",
  missing_google_calendar_connection: "Google Calendar connection is missing",
  missing_google_calendar_read_scope: "Google Calendar read scope is missing",
  missing_google_calendar_provider_connection_id:
    "policy is missing Google Calendar provider connection",
  missing_matching_vacation_policy: "no matching vacation policy is configured",
  ambiguous_matching_vacation_policy:
    "multiple vacation policies match this route",
  policy_prerequisites_unresolved:
    "policy prerequisites remain unresolved",
  missing_requested_date_range: "requested date range is missing",
  missing_vacation_request_object_id: "vacation request envelope is missing",
  vacation_request_not_found: "vacation request record was not found",
  slack_team_scope_mismatch: "Slack workspace scope does not match request scope",
  slack_channel_scope_mismatch: "Slack channel scope does not match request scope",
  missing_requester_role_tags: "requester role tags are missing",
  missing_staffing_baseline_total: "staffing baseline total is missing",
};

function normalizeVacationWindowLabel(args: {
  requestedStartDate?: string;
  requestedEndDate?: string;
}): string {
  if (args.requestedStartDate && args.requestedEndDate) {
    return `${args.requestedStartDate} to ${args.requestedEndDate}`;
  }
  return "the requested dates";
}

function normalizeVacationReasonCodes(reasonCodes: string[]): string[] {
  return Array.from(
    new Set(
      reasonCodes
        .map((code) => code.trim())
        .filter((code) => code.length > 0)
    )
  );
}

function formatVacationReasonLabel(code: string): string {
  return VACATION_REASON_CODE_LABELS[code] || code.replace(/_/g, " ");
}

export function buildVacationDecisionResponse(
  input: VacationDecisionResponseInput
): VacationDecisionResponseContract {
  const reasonCodes = normalizeVacationReasonCodes(input.reasonCodes);
  const rationale =
    reasonCodes.length > 0
      ? reasonCodes.map((code) => formatVacationReasonLabel(code)).join("; ")
      : "no policy conflicts detected";
  const windowLabel = normalizeVacationWindowLabel({
    requestedStartDate: input.requestedStartDate,
    requestedEndDate: input.requestedEndDate,
  });

  if (input.verdict === "blocked") {
    return {
      verdict: "blocked",
      rationale,
      colleagueResolutionSuggested: false,
      responseMessage: `I cannot safely finalize this vacation request for ${windowLabel} yet because ${rationale}. Please resolve the missing policy/integration prerequisites and retry.`,
    };
  }

  if (input.verdict === "denied") {
    return {
      verdict: "denied",
      rationale,
      colleagueResolutionSuggested: false,
      responseMessage: `This vacation request for ${windowLabel} is denied because ${rationale}.`,
    };
  }

  if (input.verdict === "conflict") {
    const alternatives = (input.alternatives || [])
      .map((window) => `${window.startDate} to ${window.endDate}`)
      .slice(0, 10);
    const alternativesLine =
      alternatives.length > 0
        ? `Alternative windows: ${alternatives.join(", ")}.`
        : "No approved alternative windows were found in the configured search range.";
    const colleagueSuggested = input.requireDirectColleagueDiscussion !== false;
    const colleagueLine = colleagueSuggested
      ? (input.colleagueDiscussionTemplate?.trim() ||
          "Please coordinate directly with a colleague to rebalance coverage before resubmitting.")
      : "";
    return {
      verdict: "conflict",
      rationale,
      colleagueResolutionSuggested: colleagueSuggested,
      responseMessage: [
        `This vacation request for ${windowLabel} is in conflict because ${rationale}.`,
        alternativesLine,
        colleagueLine,
      ]
        .filter((line) => line.length > 0)
        .join(" "),
    };
  }

  const mutationLine =
    input.calendarMutationStatus === "succeeded"
      ? "The calendar update was completed."
      : input.calendarMutationStatus === "failed"
        ? "Policy approved this request, but calendar mutation failed and requires manual follow-up."
        : "Policy approved this request. Calendar mutation was not attempted because write prerequisites were not met.";

  return {
    verdict: "approved",
    rationale,
    colleagueResolutionSuggested: false,
    responseMessage: `Vacation request for ${windowLabel} is approved (${rationale}). ${mutationLine}`,
  };
}

// ============================================================================
// TOOL DEFINITION
// ============================================================================

export const bookingToolDefinition = {
  type: "function" as const,
  function: {
    name: "manage_bookings",
    description: `Comprehensive booking, location, and availability management.

BOOKING TYPES:
- "appointment" - 1:1 meetings, consultations
- "reservation" - Room/space bookings, hotel stays
- "rental" - Equipment or vehicle rentals
- "class_enrollment" - Group sessions, workshops

BOOKING STATUS WORKFLOW:
- "pending_confirmation" - Awaiting admin approval
- "confirmed" - Approved and scheduled
- "checked_in" - Customer has arrived
- "completed" - Session finished
- "cancelled" - Booking cancelled
- "no_show" - Customer didn't show

LOCATION TYPES:
- "branch" - Physical office/branch location
- "venue" - Event venue or meeting space
- "virtual" - Online/virtual location

Use this tool to:
1. List, create, and manage bookings
2. Confirm, check-in, complete, or cancel bookings
3. List and manage locations
4. Check available time slots for resources
5. View booking calendar for resources`,
    parameters: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: [
            "list_bookings",
            "get_booking",
            "create_booking",
            "confirm_booking",
            "check_in_booking",
            "complete_booking",
            "cancel_booking",
            "mark_no_show",
            "list_locations",
            "get_location",
            "create_location",
            "archive_location",
            "get_available_slots",
            "get_resource_calendar",
            "execute_appointment_outreach",
            "run_meeting_concierge_demo"
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
        // Booking fields
        bookingId: {
          type: "string",
          description: "Booking ID (for get_booking, confirm, check_in, complete, cancel, mark_no_show)"
        },
        subtype: {
          type: "string",
          enum: ["appointment", "reservation", "rental", "class_enrollment"],
          description: "Booking type (for create_booking)"
        },
        resourceId: {
          type: "string",
          description: "Resource ID to book (for create_booking, get_available_slots, get_resource_calendar)"
        },
        customerName: {
          type: "string",
          description: "Customer name (for create_booking)"
        },
        customerEmail: {
          type: "string",
          description: "Customer email (for create_booking)"
        },
        customerPhone: {
          type: "string",
          description: "Customer phone (for create_booking)"
        },
        startDateTime: {
          type: "string",
          description: "Start date/time in ISO 8601 format (for create_booking, get_available_slots)"
        },
        endDateTime: {
          type: "string",
          description: "End date/time in ISO 8601 format (for create_booking, get_available_slots)"
        },
        duration: {
          type: "number",
          description: "Duration in minutes (for create_booking, default 60)"
        },
        participants: {
          type: "number",
          description: "Number of participants (for create_booking)"
        },
        notes: {
          type: "string",
          description: "Notes for the booking"
        },
        cancellationReason: {
          type: "string",
          description: "Reason for cancellation (for cancel_booking)"
        },
        confirmationRequired: {
          type: "boolean",
          description: "Whether booking requires admin confirmation (default false)"
        },
        // Location fields
        locationId: {
          type: "string",
          description: "Location ID (for get_location, archive_location, or assign to booking)"
        },
        locationName: {
          type: "string",
          description: "Location name (for create_location)"
        },
        locationType: {
          type: "string",
          enum: ["branch", "venue", "virtual"],
          description: "Location type (for create_location)"
        },
        address: {
          type: "object",
          description: "Location address (for create_location)",
          properties: {
            street: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            postalCode: { type: "string" },
            country: { type: "string" }
          }
        },
        timezone: {
          type: "string",
          description: "Timezone (e.g., 'America/Los_Angeles')"
        },
        contactEmail: {
          type: "string",
          description: "Contact email for location"
        },
        contactPhone: {
          type: "string",
          description: "Contact phone for location"
        },
        // Filters
        filterStatus: {
          type: "string",
          description: "Filter by status"
        },
        filterSubtype: {
          type: "string",
          description: "Filter by subtype"
        },
        dateFrom: {
          type: "string",
          description: "Filter bookings from this date (ISO 8601)"
        },
        dateTo: {
          type: "string",
          description: "Filter bookings until this date (ISO 8601)"
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 20)"
        },
        // Appointment outreach mission fields
        serviceType: {
          type: "string",
          description: "Service category for the outreach mission (e.g., haircut, dermatologist)"
        },
        dateWindowStart: {
          type: "string",
          description: "Preferred date window start in ISO 8601 for appointment outreach"
        },
        dateWindowEnd: {
          type: "string",
          description: "Preferred date window end in ISO 8601 for appointment outreach"
        },
        locationPreference: {
          type: "string",
          description: "Location preference for outreach mission planning"
        },
        outreachReason: {
          type: "string",
          description: "Reason/context that should be logged for this outreach mission"
        },
        outreachIdempotencyKey: {
          type: "string",
          description: "Stable idempotency key for replay-safe mission creation and delivery"
        },
        preferredOutreachChannel: {
          type: "string",
          enum: ["sms", "email", "telegram", "phone_call"],
          description: "Preferred first outreach channel"
        },
        outreachFallbackMethod: {
          type: "string",
          enum: ["none", "sms", "email", "telegram", "phone_call"],
          description: "Fallback channel used when preferred outreach fails"
        },
        outreachAllowedHoursStart: {
          type: "string",
          description: "Allowed outreach start time (HH:MM, 24-hour format)"
        },
        outreachAllowedHoursEnd: {
          type: "string",
          description: "Allowed outreach end time (HH:MM, 24-hour format)"
        },
        outreachAllowedTimezone: {
          type: "string",
          description: "Timezone for outreach allowed-hour checks"
        },
        autonomyDomainLevel: {
          type: "string",
          enum: ["sandbox", "live"],
          description: "Domain autonomy level for appointment_booking. Defaults to sandbox."
        },
        autonomyPromotionApprovalId: {
          type: "string",
          description: "Approval artifact ID required to promote appointment_booking autonomy to live"
        },
        autonomyPromotionReason: {
          type: "string",
          description: "Explicit business reason for autonomy promotion"
        },
        callFallbackApproved: {
          type: "boolean",
          description: "Whether human approval has been granted for outbound call fallback"
        },
        callConsentDisclosure: {
          type: "string",
          description: "Consent/disclosure text captured for call fallback"
        },
        maxOutreachAttempts: {
          type: "number",
          description: "Maximum number of outreach attempts (bounded by platform policy)"
        },
        runImmediately: {
          type: "boolean",
          description: "Whether to execute the first mission step immediately after creation"
        },
        appointmentBookingDomainDefault: {
          type: "string",
          enum: ["sandbox", "live"],
          description: "Runtime-provided default autonomy domain level"
        },
        // Meeting concierge demo fields
        personName: {
          type: "string",
          description: "Attendee full name captured from live conversation"
        },
        personEmail: {
          type: "string",
          description: "Attendee email (required for invite/confirmation and booking record)"
        },
        personPhone: {
          type: "string",
          description: "Attendee mobile/phone for SMS confirmation fallback"
        },
        company: {
          type: "string",
          description: "Attendee company for CRM upsert"
        },
        meetingTitle: {
          type: "string",
          description: "Meeting title shown in confirmation and calendar"
        },
        meetingDurationMinutes: {
          type: "number",
          description: "Requested meeting length in minutes (default 30)"
        },
        schedulingWindowStart: {
          type: "string",
          description: "Scheduling search window start in ISO 8601"
        },
        schedulingWindowEnd: {
          type: "string",
          description: "Scheduling search window end in ISO 8601"
        },
        attendeeCalendarConnectionId: {
          type: "string",
          description: "Optional oauthConnections ID for attendee calendar conflict checks"
        },
        operatorCalendarConnectionId: {
          type: "string",
          description: "Optional oauthConnections ID for operator calendar conflict checks"
        },
        confirmationChannel: {
          type: "string",
          enum: ["auto", "sms", "email", "none"],
          description: "Confirmation delivery channel. auto prefers sms then email."
        },
        confirmationRecipient: {
          type: "string",
          description: "Optional explicit destination override (phone/email)"
        },
        conciergeIdempotencyKey: {
          type: "string",
          description: "Optional idempotency key for replay-safe confirmation sends"
        },
        jobTitle: {
          type: "string",
          description: "Attendee title for CRM upsert"
        }
      },
      required: ["action"]
    }
  }
};

// ============================================================================
// MAIN TOOL HANDLER
// ============================================================================

export const executeManageBookings = action({
  args: {
    sessionId: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    conversationId: v.optional(v.id("aiConversations")),
    action: v.string(),
    mode: v.optional(v.string()),
    workItemId: v.optional(v.string()),
    // Booking fields
    bookingId: v.optional(v.string()),
    subtype: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    startDateTime: v.optional(v.string()),
    endDateTime: v.optional(v.string()),
    duration: v.optional(v.number()),
    participants: v.optional(v.number()),
    notes: v.optional(v.string()),
    cancellationReason: v.optional(v.string()),
    confirmationRequired: v.optional(v.boolean()),
    // Location fields
    locationId: v.optional(v.string()),
    locationName: v.optional(v.string()),
    locationType: v.optional(v.string()),
    address: v.optional(v.any()),
    timezone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    // Filters
    filterStatus: v.optional(v.string()),
    filterSubtype: v.optional(v.string()),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    limit: v.optional(v.number()),
    // Appointment outreach mission fields
    serviceType: v.optional(v.string()),
    dateWindowStart: v.optional(v.string()),
    dateWindowEnd: v.optional(v.string()),
    locationPreference: v.optional(v.string()),
    outreachReason: v.optional(v.string()),
    outreachIdempotencyKey: v.optional(v.string()),
    preferredOutreachChannel: v.optional(v.string()),
    outreachFallbackMethod: v.optional(v.string()),
    outreachAllowedHoursStart: v.optional(v.string()),
    outreachAllowedHoursEnd: v.optional(v.string()),
    outreachAllowedTimezone: v.optional(v.string()),
    autonomyDomainLevel: v.optional(v.string()),
    autonomyPromotionApprovalId: v.optional(v.string()),
    autonomyPromotionReason: v.optional(v.string()),
    callFallbackApproved: v.optional(v.boolean()),
    callConsentDisclosure: v.optional(v.string()),
    maxOutreachAttempts: v.optional(v.number()),
    runImmediately: v.optional(v.boolean()),
    appointmentBookingDomainDefault: v.optional(v.string()),
    // Meeting concierge demo fields
    personName: v.optional(v.string()),
    personEmail: v.optional(v.string()),
    personPhone: v.optional(v.string()),
    company: v.optional(v.string()),
    meetingTitle: v.optional(v.string()),
    meetingDurationMinutes: v.optional(v.number()),
    schedulingWindowStart: v.optional(v.string()),
    schedulingWindowEnd: v.optional(v.string()),
    attendeeCalendarConnectionId: v.optional(v.string()),
    operatorCalendarConnectionId: v.optional(v.string()),
    confirmationChannel: v.optional(v.string()),
    confirmationRecipient: v.optional(v.string()),
    conciergeIdempotencyKey: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    meetingConciergeExplicitConfirmDetected: v.optional(v.boolean()),
    meetingConciergePolicyRequired: v.optional(v.boolean()),
    meetingConciergeCommandPolicyAllowed: v.optional(v.boolean()),
    meetingConciergeCommandPolicyReasonCode: v.optional(v.string()),
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

    if (args.organizationId && args.userId) {
      organizationId = args.organizationId;
      userId = args.userId;
    } else if (args.sessionId) {
      const session = await (ctx as any).runQuery(generatedApi.internal.stripeConnect.validateSession, {
        sessionId: args.sessionId
      });

      if (!session || !session.organizationId || !session.userId) {
        throw new Error("Invalid session or user must belong to an organization");
      }

      organizationId = session.organizationId;
      userId = session.userId;
    } else {
      throw new Error("Either sessionId or (organizationId and userId) must be provided");
    }

    try {
      switch (args.action) {
        case "list_bookings":
          return await listBookings(ctx, organizationId, args);

        case "get_booking":
          if (!args.bookingId) {
            throw new Error("bookingId is required for get_booking");
          }
          return await getBooking(ctx, organizationId, args);

        case "create_booking":
          if (!args.resourceId || !args.customerName || !args.customerEmail || !args.startDateTime) {
            throw new Error("resourceId, customerName, customerEmail, and startDateTime are required for create_booking");
          }
          if (!userId) {
            throw new Error("userId is required for create_booking");
          }
          return await createBooking(ctx, organizationId, userId, args);

        case "confirm_booking":
          if (!args.bookingId) {
            throw new Error("bookingId is required for confirm_booking");
          }
          if (!userId) {
            throw new Error("userId is required for confirm_booking");
          }
          return await updateBookingStatus(ctx, organizationId, userId, args.bookingId, "confirmed", args);

        case "check_in_booking":
          if (!args.bookingId) {
            throw new Error("bookingId is required for check_in_booking");
          }
          if (!userId) {
            throw new Error("userId is required for check_in_booking");
          }
          return await updateBookingStatus(ctx, organizationId, userId, args.bookingId, "checked_in", args);

        case "complete_booking":
          if (!args.bookingId) {
            throw new Error("bookingId is required for complete_booking");
          }
          if (!userId) {
            throw new Error("userId is required for complete_booking");
          }
          return await updateBookingStatus(ctx, organizationId, userId, args.bookingId, "completed", args);

        case "cancel_booking":
          if (!args.bookingId) {
            throw new Error("bookingId is required for cancel_booking");
          }
          if (!userId) {
            throw new Error("userId is required for cancel_booking");
          }
          return await updateBookingStatus(ctx, organizationId, userId, args.bookingId, "cancelled", args);

        case "mark_no_show":
          if (!args.bookingId) {
            throw new Error("bookingId is required for mark_no_show");
          }
          if (!userId) {
            throw new Error("userId is required for mark_no_show");
          }
          return await updateBookingStatus(ctx, organizationId, userId, args.bookingId, "no_show", args);

        case "list_locations":
          return await listLocations(ctx, organizationId, args);

        case "get_location":
          if (!args.locationId) {
            throw new Error("locationId is required for get_location");
          }
          return await getLocation(ctx, organizationId, args);

        case "create_location":
          if (!args.locationName || !args.locationType) {
            throw new Error("locationName and locationType are required for create_location");
          }
          if (!userId) {
            throw new Error("userId is required for create_location");
          }
          return await createLocation(ctx, organizationId, userId, args);

        case "archive_location":
          if (!args.locationId) {
            throw new Error("locationId is required for archive_location");
          }
          return await archiveLocation(ctx, organizationId, args);

        case "get_available_slots":
          if (!args.resourceId || !args.startDateTime || !args.endDateTime) {
            throw new Error("resourceId, startDateTime, and endDateTime are required for get_available_slots");
          }
          return await getAvailableSlots(ctx, organizationId, args);

        case "get_resource_calendar":
          if (!args.resourceId) {
            throw new Error("resourceId is required for get_resource_calendar");
          }
          return await getResourceCalendar(ctx, organizationId, args);

        case "execute_appointment_outreach":
          if (!args.bookingId) {
            throw new Error("bookingId is required for execute_appointment_outreach");
          }
          return await executeAppointmentOutreach(ctx, organizationId, args);

        case "run_meeting_concierge_demo":
          if (!userId) {
            throw new Error("userId is required for run_meeting_concierge_demo");
          }
          if (
            args.meetingConciergePolicyRequired === true
            && args.meetingConciergeCommandPolicyAllowed !== true
          ) {
            return {
              success: false,
              action: "run_meeting_concierge_demo",
              mode: args.mode === "preview" ? "preview" : "execute",
              error: "Meeting concierge command policy blocked execution",
              message:
                `Meeting concierge command policy blocked execution (${args.meetingConciergeCommandPolicyReasonCode || "policy_blocked"}).`,
            };
          }
          if (
            args.mode !== "preview"
            && typeof args.meetingConciergeExplicitConfirmDetected === "boolean"
            && args.meetingConciergeExplicitConfirmDetected !== true
          ) {
            return {
              success: false,
              action: "run_meeting_concierge_demo",
              mode: "execute",
              error: "Explicit confirmation required",
              message:
                "Meeting concierge execute path requires explicit operator confirmation before mutation.",
            };
          }
          return await runMeetingConciergeDemo(ctx, organizationId, userId, args);

        default:
          return {
            success: false,
            action: args.action,
            error: "Invalid action",
            message: "Action must be one of: list_bookings, get_booking, create_booking, confirm_booking, check_in_booking, complete_booking, cancel_booking, mark_no_show, list_locations, get_location, create_location, archive_location, get_available_slots, get_resource_calendar, execute_appointment_outreach, run_meeting_concierge_demo"
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
// ACTION IMPLEMENTATIONS
// ============================================================================

/**
 * List bookings for the organization
 */
async function listBookings(
  ctx: unknown,
  organizationId: Id<"organizations">,
  args: {
    filterStatus?: string;
    filterSubtype?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }
) {
  const listBookingsFn = generatedApi.internal.bookingOntology.listBookingsInternal;
  const result = await (ctx as any).runQuery(listBookingsFn, {
      organizationId,
      status: args.filterStatus,
      subtype: args.filterSubtype,
      startDate: args.dateFrom ? new Date(args.dateFrom).getTime() : undefined,
      endDate: args.dateTo ? new Date(args.dateTo).getTime() : undefined,
      limit: args.limit || 20,
    }
  );

  const formattedBookings = result.bookings.map((b: {
    _id: string;
    subtype: string;
    status: string;
    customProperties: Record<string, unknown>;
  }) => ({
    id: b._id,
    type: b.subtype,
    status: b.status,
    customerName: b.customProperties?.customerName,
    customerEmail: b.customProperties?.customerEmail,
    startDateTime: b.customProperties?.startDateTime
      ? new Date(b.customProperties.startDateTime as number).toISOString()
      : null,
    duration: b.customProperties?.duration,
  }));

  return {
    success: true,
    action: "list_bookings",
    data: {
      items: formattedBookings,
      total: result.total,
    },
    message: `Found ${result.total} booking(s)`
  };
}

/**
 * Get a single booking by ID
 */
async function getBooking(
  ctx: unknown,
  organizationId: Id<"organizations">,
  args: { bookingId?: string }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const booking = await (ctx as any).runQuery(
    generatedApi.internal.bookingOntology.getBookingInternal,
    {
      bookingId: args.bookingId as Id<"objects">,
      organizationId,
    }
  );

  if (!booking) {
    return {
      success: false,
      action: "get_booking",
      error: "Booking not found",
      message: `No booking found with ID: ${args.bookingId}`
    };
  }

  const props = booking.customProperties as Record<string, unknown>;

  return {
    success: true,
    action: "get_booking",
    data: {
      id: booking._id,
      type: booking.subtype,
      status: booking.status,
      customerName: props.customerName,
      customerEmail: props.customerEmail,
      customerPhone: props.customerPhone,
      startDateTime: props.startDateTime ? new Date(props.startDateTime as number).toISOString() : null,
      endDateTime: props.endDateTime ? new Date(props.endDateTime as number).toISOString() : null,
      duration: props.duration,
      participants: props.participants,
      notes: props.notes,
      confirmationRequired: props.confirmationRequired,
      isRecurring: props.isRecurring,
    },
    message: `Booking for ${props.customerName}`
  };
}

/**
 * Create a new booking
 */
async function createBooking(
  ctx: unknown,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  args: {
    mode?: string;
    workItemId?: string;
    conversationId?: Id<"aiConversations">;
    subtype?: string;
    resourceId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    startDateTime?: string;
    endDateTime?: string;
    duration?: number;
    participants?: number;
    locationId?: string;
    notes?: string;
    confirmationRequired?: boolean;
  }
) {
  const mode = args.mode || "preview";
  const durationMinutes = args.duration || 60;
  const startTs = new Date(args.startDateTime!).getTime();
  const endTs = args.endDateTime
    ? new Date(args.endDateTime).getTime()
    : startTs + durationMinutes * 60 * 1000;

  // PREVIEW MODE
  if (mode === "preview") {
    const previewData = {
      id: "temp-" + Date.now(),
      type: "booking",
      name: `${args.subtype || "appointment"} - ${args.customerName}`,
      status: "preview",
      details: {
        subtype: args.subtype || "appointment",
        customerName: args.customerName,
        customerEmail: args.customerEmail,
        customerPhone: args.customerPhone,
        startDateTime: args.startDateTime,
        duration: durationMinutes,
        resourceId: args.resourceId,
        locationId: args.locationId,
        participants: args.participants || 1,
        notes: args.notes,
        confirmationRequired: args.confirmationRequired ?? false,
      },
      preview: {
        action: "create" as const,
        confidence: "high" as const,
        reason: "New booking will be created",
        changes: {
          customer: { old: null, new: args.customerName },
          dateTime: { old: null, new: args.startDateTime },
          status: { old: null, new: args.confirmationRequired ? "pending_confirmation" : "confirmed" },
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workItemId = await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalCreateWorkItem,
      {
        organizationId,
        userId,
        conversationId: args.conversationId!,
        type: "booking_create",
        name: `Create Booking - ${args.customerName}`,
        status: "preview",
        previewData: [previewData],
      }
    );

    return {
      success: true,
      action: "create_booking",
      mode: "preview",
      workItemId,
      workItemType: "booking_create",
      data: {
        items: [previewData],
        summary: { total: 1, toCreate: 1, toUpdate: 0, toSkip: 0 }
      },
      message: `📋 Ready to create booking for "${args.customerName}" on ${args.startDateTime}. Review and approve to proceed.`
    };
  }

  // EXECUTE MODE
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (ctx as any).runMutation(
    generatedApi.internal.bookingOntology.createBookingInternal,
    {
      organizationId,
      userId,
      subtype: args.subtype || "appointment",
      startDateTime: startTs,
      endDateTime: endTs,
      resourceIds: [args.resourceId as Id<"objects">],
      customerName: args.customerName!,
      customerEmail: args.customerEmail!,
      customerPhone: args.customerPhone,
      participants: args.participants || 1,
      locationId: args.locationId ? args.locationId as Id<"objects"> : undefined,
      notes: args.notes,
      confirmationRequired: args.confirmationRequired ?? false,
      isAdminBooking: true,
    }
  );

  // Update work item
  if (args.workItemId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
      {
        workItemId: args.workItemId as Id<"aiWorkItems">,
        status: "completed",
        results: { bookingId: result.bookingId },
      }
    );
  }

  return {
    success: true,
    action: "create_booking",
    mode: "execute",
    workItemId: args.workItemId,
    data: {
      items: [{
        id: result.bookingId,
        type: "booking",
        name: `${args.subtype || "appointment"} - ${args.customerName}`,
        status: result.status,
      }],
      summary: { total: 1, created: 1 }
    },
    message: `✅ Created booking for ${args.customerName} (${result.status})`
  };
}

/**
 * Update booking status
 */
async function updateBookingStatus(
  ctx: unknown,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  bookingId: string,
  newStatus: string,
  args: { cancellationReason?: string; mode?: string; workItemId?: string }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (ctx as any).runMutation(
    generatedApi.internal.bookingOntology.updateBookingStatusInternal,
    {
      bookingId: bookingId as Id<"objects">,
      organizationId,
      userId,
      status: newStatus,
      reason: args.cancellationReason,
    }
  );

  const actionMap: Record<string, string> = {
    confirmed: "confirm_booking",
    checked_in: "check_in_booking",
    completed: "complete_booking",
    cancelled: "cancel_booking",
    no_show: "mark_no_show",
  };

  const messageMap: Record<string, string> = {
    confirmed: "✅ Booking confirmed",
    checked_in: "✅ Customer checked in",
    completed: "✅ Booking completed",
    cancelled: "❌ Booking cancelled",
    no_show: "⚠️ Marked as no-show",
  };

  return {
    success: true,
    action: actionMap[newStatus] || "update_booking",
    data: {
      bookingId,
      newStatus,
    },
    message: messageMap[newStatus] || `Booking status updated to ${newStatus}`
  };
}

/**
 * List locations for the organization
 */
async function listLocations(
  ctx: unknown,
  organizationId: Id<"organizations">,
  args: { filterStatus?: string; filterSubtype?: string; limit?: number }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (ctx as any).runQuery(
    generatedApi.internal.locationOntology.listLocationsInternal,
    {
      organizationId,
      status: args.filterStatus,
      subtype: args.filterSubtype,
      limit: args.limit || 20,
      offset: 0,
    }
  );

  const formattedLocations = result.locations.map((l: {
    _id: string;
    name: string;
    subtype: string;
    status: string;
    customProperties: Record<string, unknown>;
  }) => ({
    id: l._id,
    name: l.name,
    type: l.subtype,
    status: l.status,
    timezone: l.customProperties?.timezone,
    city: (l.customProperties?.address as Record<string, unknown>)?.city,
  }));

  return {
    success: true,
    action: "list_locations",
    data: {
      items: formattedLocations,
      total: result.total,
    },
    message: `Found ${result.total} location(s)`
  };
}

/**
 * Get a single location by ID
 */
async function getLocation(
  ctx: unknown,
  organizationId: Id<"organizations">,
  args: { locationId?: string }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const location = await (ctx as any).runQuery(
    generatedApi.internal.locationOntology.getLocationInternal,
    {
      locationId: args.locationId as Id<"objects">,
      organizationId,
    }
  );

  if (!location) {
    return {
      success: false,
      action: "get_location",
      error: "Location not found",
      message: `No location found with ID: ${args.locationId}`
    };
  }

  const props = location.customProperties as Record<string, unknown>;

  return {
    success: true,
    action: "get_location",
    data: {
      id: location._id,
      name: location.name,
      type: location.subtype,
      status: location.status,
      address: props.address,
      timezone: props.timezone,
      contactEmail: props.contactEmail,
      contactPhone: props.contactPhone,
      operatingHours: props.defaultOperatingHours,
    },
    message: `Location: ${location.name}`
  };
}

/**
 * Create a new location
 */
async function createLocation(
  ctx: unknown,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  args: {
    mode?: string;
    workItemId?: string;
    conversationId?: Id<"aiConversations">;
    locationName?: string;
    locationType?: string;
    address?: { street?: string; city?: string; state?: string; postalCode?: string; country?: string };
    timezone?: string;
    contactEmail?: string;
    contactPhone?: string;
  }
) {
  const mode = args.mode || "preview";

  // PREVIEW MODE
  if (mode === "preview") {
    const previewData = {
      id: "temp-" + Date.now(),
      type: "location",
      name: args.locationName,
      status: "preview",
      details: {
        locationType: args.locationType,
        address: args.address,
        timezone: args.timezone,
        contactEmail: args.contactEmail,
        contactPhone: args.contactPhone,
      },
      preview: {
        action: "create" as const,
        confidence: "high" as const,
        reason: "New location will be created",
        changes: {
          name: { old: null, new: args.locationName },
          type: { old: null, new: args.locationType },
          status: { old: null, new: "active" },
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workItemId = await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalCreateWorkItem,
      {
        organizationId,
        userId,
        conversationId: args.conversationId!,
        type: "location_create",
        name: `Create Location - ${args.locationName}`,
        status: "preview",
        previewData: [previewData],
      }
    );

    return {
      success: true,
      action: "create_location",
      mode: "preview",
      workItemId,
      workItemType: "location_create",
      data: {
        items: [previewData],
        summary: { total: 1, toCreate: 1 }
      },
      message: `📋 Ready to create location "${args.locationName}". Review and approve to proceed.`
    };
  }

  // EXECUTE MODE
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (ctx as any).runMutation(
    generatedApi.internal.locationOntology.createLocationInternal,
    {
      organizationId,
      userId,
      name: args.locationName!,
      subtype: args.locationType as "branch" | "venue" | "virtual",
      address: args.address,
      timezone: args.timezone,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
    }
  );

  if (args.workItemId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
      {
        workItemId: args.workItemId as Id<"aiWorkItems">,
        status: "completed",
        results: { locationId: result.locationId },
      }
    );
  }

  return {
    success: true,
    action: "create_location",
    mode: "execute",
    workItemId: args.workItemId,
    data: {
      items: [{
        id: result.locationId,
        type: "location",
        name: args.locationName,
        status: "active",
      }],
      summary: { total: 1, created: 1 }
    },
    message: `✅ Created location: ${args.locationName}`
  };
}

/**
 * Archive a location
 */
async function archiveLocation(
  ctx: unknown,
  organizationId: Id<"organizations">,
  args: { locationId?: string }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (ctx as any).runMutation(
    generatedApi.internal.locationOntology.archiveLocationInternal,
    {
      locationId: args.locationId as Id<"objects">,
      organizationId,
    }
  );

  return {
    success: true,
    action: "archive_location",
    data: {
      locationId: args.locationId,
      archived: true,
    },
    message: "✅ Location archived"
  };
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toTimestamp(value: unknown): number | undefined {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return undefined;
  }
  const parsed = new Date(normalized).getTime();
  return Number.isFinite(parsed) ? parsed : undefined;
}

function resolveAppointmentDomainPolicy(args: {
  runtimeDefault?: string;
  requested?: string;
  callFallbackApproved?: boolean;
  callConsentDisclosure?: string;
  promotionApprovalId?: string;
  promotionReason?: string;
}): {
  requested: "sandbox" | "live";
  effective: "sandbox" | "live";
  promotionCriteriaMet: boolean;
} {
  const runtimeDefault =
    args.runtimeDefault === "live" ? "live" : "sandbox";
  const requested =
    args.requested === "live" ? "live" : runtimeDefault;
  const promotionCriteriaMet =
    requested === "live" &&
    args.callFallbackApproved === true &&
    Boolean(normalizeOptionalString(args.callConsentDisclosure)) &&
    Boolean(normalizeOptionalString(args.promotionApprovalId)) &&
    Boolean(normalizeOptionalString(args.promotionReason));
  return {
    requested,
    effective: promotionCriteriaMet ? "live" : "sandbox",
    promotionCriteriaMet,
  };
}

interface ConciergeSlot {
  startDateTime: number;
  endDateTime: number;
}

interface ConciergeBusyWindow {
  eventId: string;
  startDateTime: number;
  endDateTime: number;
  provider: "google" | "microsoft";
  sourceCalendarId?: string;
}

interface ConciergeConnectionSnapshot {
  source: "operator" | "attendee";
  connectionId: string;
  status: "resolved" | "blocked";
  blockedReasons: string[];
  busyCount: number;
}

function splitPersonName(fullName: string | undefined): {
  firstName: string;
  lastName: string;
} {
  const normalized = normalizeOptionalString(fullName) || "";
  if (!normalized) {
    return { firstName: "", lastName: "" };
  }
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return { firstName: tokens[0], lastName: "" };
  }
  return {
    firstName: tokens[0],
    lastName: tokens.slice(1).join(" "),
  };
}

function normalizeContactFromRecord(contact: {
  _id: Id<"objects">;
  name?: string;
  customProperties?: unknown;
}): {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
} {
  const props = (contact.customProperties || {}) as Record<string, unknown>;
  const firstName = normalizeOptionalString(props.firstName);
  const lastName = normalizeOptionalString(props.lastName);
  const name =
    normalizeOptionalString(contact.name) ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    "Unknown Contact";
  return {
    id: String(contact._id),
    name,
    firstName,
    lastName,
    email: normalizeOptionalString(props.email),
    phone: normalizeOptionalString(props.phone),
    company: normalizeOptionalString(props.company),
    jobTitle: normalizeOptionalString(props.jobTitle),
  };
}

function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && endA > startB;
}

function selectBestContactMatch(args: {
  contacts: Array<{
    _id: Id<"objects">;
    name?: string;
    customProperties?: unknown;
  }>;
  personName?: string;
  personEmail?: string;
}): {
  _id: Id<"objects">;
  name?: string;
  customProperties?: unknown;
} | null {
  if (args.contacts.length === 0) {
    return null;
  }
  const targetEmail = normalizeOptionalString(args.personEmail)?.toLowerCase();
  if (targetEmail) {
    const exactEmailMatch = args.contacts.find((contact) => {
      const props = (contact.customProperties || {}) as Record<string, unknown>;
      const email = normalizeOptionalString(props.email)?.toLowerCase();
      return email === targetEmail;
    });
    if (exactEmailMatch) {
      return exactEmailMatch;
    }
  }

  const targetName = normalizeOptionalString(args.personName)?.toLowerCase();
  if (targetName) {
    const nameMatch = args.contacts.find((contact) =>
      (normalizeOptionalString(contact.name) || "").toLowerCase() === targetName
    );
    if (nameMatch) {
      return nameMatch;
    }
  }

  return args.contacts[0];
}

async function resolveConciergeResource(args: {
  ctx: unknown;
  organizationId: Id<"organizations">;
  resourceId?: string;
}): Promise<{ id: Id<"objects">; name?: string; source: "explicit" | "auto" } | null> {
  const requestedResourceId = normalizeOptionalString(args.resourceId);
  if (requestedResourceId) {
    const resource = await (args.ctx as any).runQuery(
      generatedApi.internal.productOntology.getProductInternal,
      {
        productId: requestedResourceId as Id<"objects">,
      }
    ) as { _id: Id<"objects">; name?: string; organizationId: Id<"organizations"> } | null;

    if (!resource || resource.organizationId !== args.organizationId) {
      return null;
    }
    return {
      id: resource._id,
      name: normalizeOptionalString(resource.name),
      source: "explicit",
    };
  }

  const productsResult = await (args.ctx as any).runQuery(
    generatedApi.internal.api.v1.productsInternal.listProductsInternal,
    {
      organizationId: args.organizationId,
      status: "active",
      limit: 100,
      offset: 0,
    }
  ) as { products?: Array<{ id: string; name?: string; subtype?: string }> } | null;

  const products = productsResult?.products || [];
  const bookableSubtypes = new Set([
    "appointment",
    "staff",
    "room",
    "space",
    "class",
    "treatment",
    "equipment",
  ]);
  const selected = products.find((product) =>
    bookableSubtypes.has(String(product.subtype || ""))
  );
  if (!selected) {
    return null;
  }

  return {
    id: selected.id as Id<"objects">,
    name: normalizeOptionalString(selected.name),
    source: "auto",
  };
}

async function getConnectionBusyWindows(args: {
  ctx: unknown;
  organizationId: Id<"organizations">;
  connectionId: string;
  startDateTime: number;
  endDateTime: number;
  source: "operator" | "attendee";
}): Promise<{
  snapshot: ConciergeConnectionSnapshot;
  busyWindows: ConciergeBusyWindow[];
}> {
  const result = await (args.ctx as any).runQuery(
    generatedApi.internal.calendarSyncOntology.getConnectionBusyWindowsInternal,
    {
      organizationId: args.organizationId,
      connectionId: args.connectionId as Id<"oauthConnections">,
      startDateTime: args.startDateTime,
      endDateTime: args.endDateTime,
    }
  ) as {
    status: "resolved" | "blocked";
    blockedReasons: string[];
    busyWindows: ConciergeBusyWindow[];
  };

  return {
    snapshot: {
      source: args.source,
      connectionId: args.connectionId,
      status: result.status,
      blockedReasons: result.blockedReasons || [],
      busyCount: Array.isArray(result.busyWindows) ? result.busyWindows.length : 0,
    },
    busyWindows: Array.isArray(result.busyWindows) ? result.busyWindows : [],
  };
}

function resolveConfirmationRouting(args: {
  preferred?: string;
  explicitRecipient?: string;
  personEmail?: string;
  personPhone?: string;
}): { channel: "sms" | "email" | null; recipient: string | null } {
  const preferred = normalizeOptionalString(args.preferred) || "auto";
  const explicitRecipient = normalizeOptionalString(args.explicitRecipient);
  const email = normalizeOptionalString(args.personEmail);
  const phone = normalizeOptionalString(args.personPhone);

  if (preferred === "none") {
    return { channel: null, recipient: null };
  }
  if (preferred === "sms") {
    return { channel: "sms", recipient: explicitRecipient || phone || null };
  }
  if (preferred === "email") {
    return { channel: "email", recipient: explicitRecipient || email || null };
  }
  if (explicitRecipient) {
    const explicitLooksLikeEmail = explicitRecipient.includes("@");
    return {
      channel: explicitLooksLikeEmail ? "email" : "sms",
      recipient: explicitRecipient,
    };
  }
  if (phone) {
    return { channel: "sms", recipient: phone };
  }
  if (email) {
    return { channel: "email", recipient: email };
  }
  return { channel: null, recipient: null };
}

function formatMeetingWindowForMessage(args: {
  startDateTime: number;
  endDateTime: number;
  timezone?: string;
}): string {
  const timezone = normalizeOptionalString(args.timezone) || "UTC";
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    });
    const startLabel = formatter.format(new Date(args.startDateTime));
    const endLabel = formatter.format(new Date(args.endDateTime));
    return `${startLabel} - ${endLabel} (${timezone})`;
  } catch {
    return `${new Date(args.startDateTime).toISOString()} - ${new Date(args.endDateTime).toISOString()} (${timezone})`;
  }
}

/**
 * Fast-path concierge flow for live glasses demo:
 * 1) CRM lookup/create/update, 2) overlap-aware slot pick, 3) booking create,
 * 4) external calendar push, 5) confirmation send.
 */
async function runMeetingConciergeDemo(
  ctx: unknown,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  args: {
    mode?: string;
    personName?: string;
    personEmail?: string;
    personPhone?: string;
    company?: string;
    meetingTitle?: string;
    meetingDurationMinutes?: number;
    schedulingWindowStart?: string;
    schedulingWindowEnd?: string;
    attendeeCalendarConnectionId?: string;
    operatorCalendarConnectionId?: string;
    confirmationChannel?: string;
    confirmationRecipient?: string;
    conciergeIdempotencyKey?: string;
    resourceId?: string;
    timezone?: string;
    notes?: string;
    jobTitle?: string;
  }
) {
  const mode = args.mode === "preview" ? "preview" : "execute";
  const windowStartTs = toTimestamp(args.schedulingWindowStart);
  const windowEndTs = toTimestamp(args.schedulingWindowEnd);
  if (!windowStartTs || !windowEndTs || windowEndTs <= windowStartTs) {
    return {
      success: false,
      action: "run_meeting_concierge_demo",
      mode,
      error: "Invalid scheduling window",
      message:
        "schedulingWindowStart and schedulingWindowEnd are required in ISO format and end must be after start.",
    };
  }

  const durationMinutes =
    typeof args.meetingDurationMinutes === "number" &&
    Number.isFinite(args.meetingDurationMinutes)
      ? Math.max(15, Math.min(180, Math.round(args.meetingDurationMinutes)))
      : 30;

  const resource = await resolveConciergeResource({
    ctx,
    organizationId,
    resourceId: args.resourceId,
  });
  if (!resource) {
    return {
      success: false,
      action: "run_meeting_concierge_demo",
      mode,
      error: "No bookable resource available",
      message:
        args.resourceId
          ? `Resource ${args.resourceId} is unavailable or inaccessible.`
          : "No active bookable product found. Provide resourceId or activate a bookable product.",
    };
  }

  const lookupQuery =
    normalizeOptionalString(args.personEmail) ||
    normalizeOptionalString(args.personName);

  const candidateContacts = await (ctx as any).runQuery(
    generatedApi.internal.ai.tools.internalToolMutations.internalSearchContacts,
    {
      organizationId,
      searchQuery: lookupQuery,
      limit: 25,
    }
  ) as Array<{
    _id: Id<"objects">;
    name?: string;
    customProperties?: unknown;
  }>;

  const matchedContact = selectBestContactMatch({
    contacts: candidateContacts || [],
    personName: args.personName,
    personEmail: args.personEmail,
  });
  const matchedNormalized = matchedContact
    ? normalizeContactFromRecord(matchedContact)
    : null;

  const splitFromInput = splitPersonName(args.personName);
  const resolvedFirstName =
    normalizeOptionalString(splitFromInput.firstName) ||
    normalizeOptionalString(matchedNormalized?.firstName) ||
    "Unknown";
  const resolvedLastName =
    normalizeOptionalString(splitFromInput.lastName) ||
    normalizeOptionalString(matchedNormalized?.lastName) ||
    "Contact";
  const resolvedName =
    normalizeOptionalString(args.personName) ||
    normalizeOptionalString(matchedNormalized?.name) ||
    `${resolvedFirstName} ${resolvedLastName}`.trim();
  const resolvedEmail =
    normalizeOptionalString(args.personEmail) ||
    normalizeOptionalString(matchedNormalized?.email);
  if (!resolvedEmail) {
    return {
      success: false,
      action: "run_meeting_concierge_demo",
      mode,
      error: "Missing attendee email",
      message:
        "Attendee email is required for CRM + booking flow. Provide personEmail or match an existing CRM contact with email.",
    };
  }

  const resolvedPhone =
    normalizeOptionalString(args.personPhone) ||
    normalizeOptionalString(matchedNormalized?.phone);
  const resolvedCompany =
    normalizeOptionalString(args.company) ||
    normalizeOptionalString(matchedNormalized?.company);
  const resolvedJobTitle =
    normalizeOptionalString(args.jobTitle) ||
    normalizeOptionalString(matchedNormalized?.jobTitle);

  const updatedFields: string[] = [];
  if (
    matchedNormalized &&
    normalizeOptionalString(args.personPhone) &&
    normalizeOptionalString(args.personPhone) !== matchedNormalized.phone
  ) {
    updatedFields.push("phone");
  }
  if (
    matchedNormalized &&
    normalizeOptionalString(args.company) &&
    normalizeOptionalString(args.company) !== matchedNormalized.company
  ) {
    updatedFields.push("company");
  }
  if (
    matchedNormalized &&
    normalizeOptionalString(args.jobTitle) &&
    normalizeOptionalString(args.jobTitle) !== matchedNormalized.jobTitle
  ) {
    updatedFields.push("jobTitle");
  }
  if (
    matchedNormalized &&
    normalizeOptionalString(args.personEmail) &&
    normalizeOptionalString(args.personEmail) !== matchedNormalized.email
  ) {
    updatedFields.push("email");
  }

  let contactId: Id<"objects"> | undefined = matchedContact?._id;
  if (mode === "execute") {
    if (matchedContact && updatedFields.length > 0) {
      await (ctx as any).runMutation(
        generatedApi.internal.ai.tools.internalToolMutations.internalUpdateContact,
        {
          organizationId,
          userId,
          contactId: matchedContact._id,
          email: resolvedEmail,
          phone: resolvedPhone,
          company: resolvedCompany,
          jobTitle: resolvedJobTitle,
        }
      );
    }

    if (!matchedContact) {
      const createdContactId = await (ctx as any).runMutation(
        generatedApi.internal.ai.tools.internalToolMutations.internalCreateContact,
        {
          organizationId,
          userId,
          subtype: "customer",
          firstName: resolvedFirstName,
          lastName: resolvedLastName,
          email: resolvedEmail,
          phone: resolvedPhone,
          company: resolvedCompany,
          jobTitle: resolvedJobTitle,
        }
      ) as Id<"objects">;
      contactId = createdContactId;
    }
  }

  const allSlots = await (ctx as any).runQuery(
    generatedApi.internal.availabilityOntology.getAvailableSlotsInternal,
    {
      organizationId,
      resourceId: resource.id,
      startDate: windowStartTs,
      endDate: windowEndTs,
      duration: durationMinutes,
      timezone: normalizeOptionalString(args.timezone),
    }
  ) as Array<{ startDateTime?: number; endDateTime?: number }>;

  const normalizedSlots: ConciergeSlot[] = (allSlots || [])
    .filter(
      (slot): slot is { startDateTime: number; endDateTime: number } =>
        typeof slot.startDateTime === "number" &&
        typeof slot.endDateTime === "number"
    )
    .map((slot) => ({
      startDateTime: slot.startDateTime,
      endDateTime: slot.endDateTime,
    }))
    .sort((a, b) => a.startDateTime - b.startDateTime);

  const connectionSnapshots: ConciergeConnectionSnapshot[] = [];
  let filteredSlots = normalizedSlots;

  const operatorConnectionId = normalizeOptionalString(args.operatorCalendarConnectionId);
  if (operatorConnectionId) {
    const { snapshot, busyWindows } = await getConnectionBusyWindows({
      ctx,
      organizationId,
      connectionId: operatorConnectionId,
      startDateTime: windowStartTs,
      endDateTime: windowEndTs,
      source: "operator",
    });
    connectionSnapshots.push(snapshot);
    if (snapshot.status === "resolved" && busyWindows.length > 0) {
      filteredSlots = filteredSlots.filter((slot) =>
        !busyWindows.some((busy) =>
          rangesOverlap(
            slot.startDateTime,
            slot.endDateTime,
            busy.startDateTime,
            busy.endDateTime
          )
        )
      );
    }
  }

  const attendeeConnectionId = normalizeOptionalString(args.attendeeCalendarConnectionId);
  if (attendeeConnectionId) {
    const { snapshot, busyWindows } = await getConnectionBusyWindows({
      ctx,
      organizationId,
      connectionId: attendeeConnectionId,
      startDateTime: windowStartTs,
      endDateTime: windowEndTs,
      source: "attendee",
    });
    connectionSnapshots.push(snapshot);
    if (snapshot.status === "resolved" && busyWindows.length > 0) {
      filteredSlots = filteredSlots.filter((slot) =>
        !busyWindows.some((busy) =>
          rangesOverlap(
            slot.startDateTime,
            slot.endDateTime,
            busy.startDateTime,
            busy.endDateTime
          )
        )
      );
    }
  }

  const selectedSlot = filteredSlots[0];
  if (!selectedSlot) {
    return {
      success: false,
      action: "run_meeting_concierge_demo",
      mode,
      data: {
        resourceId: resource.id,
        connectionSnapshots,
        totalSlotsBeforeConnectionFilters: normalizedSlots.length,
      },
      error: "No shared slot found",
      message:
        "No mutually available slot found in the requested window. Expand schedulingWindowStart/schedulingWindowEnd or reduce duration.",
    };
  }

  const meetingTitle =
    normalizeOptionalString(args.meetingTitle) ||
    `Meeting with ${resolvedName}`;
  const meetingNotes = normalizeOptionalString(args.notes);
  const slotLabel = formatMeetingWindowForMessage({
    startDateTime: selectedSlot.startDateTime,
    endDateTime: selectedSlot.endDateTime,
    timezone: args.timezone,
  });

  if (mode === "preview") {
    return {
      success: true,
      action: "run_meeting_concierge_demo",
      mode: "preview",
      data: {
        contact: {
          operation: matchedContact ? (updatedFields.length > 0 ? "update" : "reuse") : "create",
          contactId: matchedNormalized?.id || null,
          name: resolvedName,
          email: resolvedEmail,
          phone: resolvedPhone,
          company: resolvedCompany,
          updatedFields,
        },
        resource: {
          id: resource.id,
          name: resource.name,
          source: resource.source,
        },
        selectedSlot: {
          startDateTime: new Date(selectedSlot.startDateTime).toISOString(),
          endDateTime: new Date(selectedSlot.endDateTime).toISOString(),
          label: slotLabel,
        },
        totalSlotsBeforeConnectionFilters: normalizedSlots.length,
        totalSlotsAfterConnectionFilters: filteredSlots.length,
        connectionSnapshots,
      },
      message: `Preview ready. Earliest shared slot is ${slotLabel}.`,
    };
  }

  let replayed = false;
  let bookingId: Id<"objects"> | null = null;
  const idempotencyKey = normalizeOptionalString(args.conciergeIdempotencyKey);

  if (idempotencyKey) {
    const existing = await (ctx as any).runQuery(
      generatedApi.internal.bookingOntology.listBookingsInternal,
      {
        organizationId,
        subtype: "appointment",
        startDate: windowStartTs,
        endDate: windowEndTs,
        limit: 200,
      }
    ) as {
      bookings: Array<{
        _id: Id<"objects">;
        customProperties?: Record<string, unknown>;
      }>;
    };
    const prior = (existing.bookings || []).find((booking) => {
      const props = (booking.customProperties || {}) as Record<string, unknown>;
      return normalizeOptionalString(props.conciergeIdempotencyKey) === idempotencyKey;
    });
    if (prior) {
      bookingId = prior._id;
      replayed = true;
    }
  }

  if (!bookingId) {
    const createResult = await (ctx as any).runMutation(
      generatedApi.internal.bookingOntology.createBookingInternal,
      {
        organizationId,
        userId,
        subtype: "appointment",
        startDateTime: selectedSlot.startDateTime,
        endDateTime: selectedSlot.endDateTime,
        resourceIds: [resource.id],
        customerId: contactId,
        customerName: resolvedName,
        customerEmail: resolvedEmail,
        customerPhone: resolvedPhone,
        participants: 2,
        notes: [
          meetingNotes,
          idempotencyKey ? `conciergeIdempotencyKey:${idempotencyKey}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        confirmationRequired: false,
        isAdminBooking: true,
      }
    ) as { bookingId: Id<"objects"> };
    bookingId = createResult.bookingId;

    if (idempotencyKey) {
      const booking = await (ctx as any).runQuery(
        generatedApi.internal.bookingOntology.getBookingInternal,
        {
          bookingId,
          organizationId,
        }
      ) as { customProperties?: Record<string, unknown> } | null;
      if (booking) {
        await (ctx as any).runMutation(
          generatedApi.internal.channels.router.patchObjectInternal,
          {
            objectId: bookingId,
            customProperties: {
              ...(booking.customProperties || {}),
              conciergeIdempotencyKey: idempotencyKey,
            },
            updatedAt: Date.now(),
          }
        );
      }
    }
  }

  const calendarPushResult = await (ctx as any).runAction(
    generatedApi.internal.calendarSyncOntology.pushBookingToCalendar,
    {
      bookingId,
      organizationId,
    }
  ) as { success?: boolean; error?: string; pushCount?: number };

  const confirmationRoute = resolveConfirmationRouting({
    preferred: args.confirmationChannel,
    explicitRecipient: args.confirmationRecipient,
    personEmail: resolvedEmail,
    personPhone: resolvedPhone,
  });

  let confirmationResult: {
    attempted: boolean;
    channel: "sms" | "email" | null;
    recipient: string | null;
    success: boolean;
    providerMessageId?: string;
    error?: string;
  } = {
    attempted: false,
    channel: confirmationRoute.channel,
    recipient: confirmationRoute.recipient,
    success: false,
  };

  if (confirmationRoute.channel && confirmationRoute.recipient) {
    const confirmationText = [
      `Confirmed: ${meetingTitle}`,
      `When: ${slotLabel}`,
      resource.name ? `Where: ${resource.name}` : null,
      "Reply here if you need to reschedule.",
    ]
      .filter(Boolean)
      .join("\n");

    const sendResult = await (ctx as any).runAction(
      generatedApi.internal.channels.router.sendMessage,
      {
        organizationId,
        channel: confirmationRoute.channel,
        recipientIdentifier: confirmationRoute.recipient,
        content: confirmationText,
        subject:
          confirmationRoute.channel === "email"
            ? `Meeting confirmed: ${meetingTitle}`
            : undefined,
        idempotencyKey:
          idempotencyKey
            ? `meeting_concierge_confirmation:${idempotencyKey}`
            : `meeting_concierge_confirmation:${String(bookingId)}`,
        bookingId: String(bookingId),
      }
    ) as { success: boolean; providerMessageId?: string; error?: string };

    confirmationResult = {
      attempted: true,
      channel: confirmationRoute.channel,
      recipient: confirmationRoute.recipient,
      success: sendResult.success === true,
      providerMessageId: sendResult.providerMessageId,
      error: sendResult.success ? undefined : sendResult.error,
    };
  }

  return {
    success: true,
    action: "run_meeting_concierge_demo",
    mode: "execute",
    data: {
      replayed,
      resource: {
        id: resource.id,
        name: resource.name,
        source: resource.source,
      },
      contact: {
        id: contactId ? String(contactId) : matchedNormalized?.id || null,
        name: resolvedName,
        email: resolvedEmail,
        phone: resolvedPhone,
        company: resolvedCompany,
      },
      booking: {
        id: bookingId,
        title: meetingTitle,
        startDateTime: new Date(selectedSlot.startDateTime).toISOString(),
        endDateTime: new Date(selectedSlot.endDateTime).toISOString(),
      },
      slotLabel,
      connectionSnapshots,
      calendarPush: {
        success: calendarPushResult?.success === true,
        pushCount: calendarPushResult?.pushCount || 0,
        error: calendarPushResult?.error,
      },
      confirmation: confirmationResult,
    },
    message:
      confirmationResult.success
        ? `Meeting booked and confirmation sent (${slotLabel}).`
        : `Meeting booked (${slotLabel}). Confirmation delivery unavailable or failed.`,
  };
}

/**
 * Execute deterministic appointment outreach mission.
 * Keeps default domain autonomy at sandbox until explicit promotion criteria are met.
 */
async function executeAppointmentOutreach(
  ctx: unknown,
  organizationId: Id<"organizations">,
  args: {
    mode?: string;
    bookingId?: string;
    serviceType?: string;
    dateWindowStart?: string;
    dateWindowEnd?: string;
    locationPreference?: string;
    outreachReason?: string;
    outreachIdempotencyKey?: string;
    preferredOutreachChannel?: string;
    outreachFallbackMethod?: string;
    outreachAllowedHoursStart?: string;
    outreachAllowedHoursEnd?: string;
    outreachAllowedTimezone?: string;
    autonomyDomainLevel?: string;
    autonomyPromotionApprovalId?: string;
    autonomyPromotionReason?: string;
    callFallbackApproved?: boolean;
    callConsentDisclosure?: string;
    maxOutreachAttempts?: number;
    runImmediately?: boolean;
    appointmentBookingDomainDefault?: string;
  }
) {
  const booking = await (ctx as any).runQuery(
    generatedApi.internal.bookingOntology.getBookingInternal,
    {
      bookingId: args.bookingId as Id<"objects">,
      organizationId,
    }
  ) as {
    _id: string;
    name?: string;
    subtype?: string;
    customProperties?: Record<string, unknown>;
  } | null;

  if (!booking) {
    return {
      success: false,
      action: "execute_appointment_outreach",
      error: "Booking not found",
      message: `No booking found with ID: ${args.bookingId}`,
    };
  }

  const mode = args.mode || "preview";
  const props = (booking.customProperties || {}) as Record<string, unknown>;
  const domainPolicy = resolveAppointmentDomainPolicy({
    runtimeDefault: args.appointmentBookingDomainDefault,
    requested: args.autonomyDomainLevel,
    callFallbackApproved: args.callFallbackApproved,
    callConsentDisclosure: args.callConsentDisclosure,
    promotionApprovalId: args.autonomyPromotionApprovalId,
    promotionReason: args.autonomyPromotionReason,
  });

  const previewPayload = {
    bookingId: booking._id,
    bookingName: booking.name,
    serviceType: normalizeOptionalString(args.serviceType) || booking.subtype || "appointment",
    missionWindow: {
      start: args.dateWindowStart || null,
      end: args.dateWindowEnd || null,
      retryDeadlineHours: 48,
      maxAttempts: Math.min(4, Math.max(1, args.maxOutreachAttempts || 4)),
    },
    contact: {
      name: normalizeOptionalString(props.customerName),
      email: normalizeOptionalString(props.customerEmail),
      phone: normalizeOptionalString(props.customerPhone),
    },
    autonomy: {
      domain: "appointment_booking",
      requested: domainPolicy.requested,
      effective: domainPolicy.effective,
      promotionCriteriaMet: domainPolicy.promotionCriteriaMet,
      callFallbackApproved: args.callFallbackApproved === true,
    },
    outreachPreferences: {
      preferredChannel: normalizeOptionalString(args.preferredOutreachChannel),
      fallbackMethod: normalizeOptionalString(args.outreachFallbackMethod),
      allowedHours: {
        start: normalizeOptionalString(args.outreachAllowedHoursStart),
        end: normalizeOptionalString(args.outreachAllowedHoursEnd),
        timezone: normalizeOptionalString(args.outreachAllowedTimezone),
      },
    },
    notes: {
      locationPreference: normalizeOptionalString(args.locationPreference),
      outreachReason: normalizeOptionalString(args.outreachReason),
      idempotencyKey: normalizeOptionalString(args.outreachIdempotencyKey),
    },
  };

  if (mode === "preview") {
    return {
      success: true,
      action: "execute_appointment_outreach",
      mode: "preview",
      data: previewPayload,
      message:
        domainPolicy.effective === "sandbox"
          ? "Preview ready. Mission will run in sandbox autonomy unless explicit promotion criteria are satisfied."
          : "Preview ready. Mission is eligible for live call fallback based on supplied promotion criteria.",
    };
  }

  const missionResult = await (ctx as any).runAction(
    generatedApi.internal.channels.router.initializeAppointmentOutreachMission,
    {
      organizationId,
      bookingId: args.bookingId as Id<"objects">,
      serviceType: normalizeOptionalString(args.serviceType),
      dateWindowStart: toTimestamp(args.dateWindowStart),
      dateWindowEnd: toTimestamp(args.dateWindowEnd),
      locationPreference: normalizeOptionalString(args.locationPreference),
      outreachReason: normalizeOptionalString(args.outreachReason),
      idempotencyKey: normalizeOptionalString(args.outreachIdempotencyKey),
      preferredChannel: normalizeOptionalString(args.preferredOutreachChannel),
      fallbackMethod: normalizeOptionalString(args.outreachFallbackMethod),
      allowedHoursStart: normalizeOptionalString(args.outreachAllowedHoursStart),
      allowedHoursEnd: normalizeOptionalString(args.outreachAllowedHoursEnd),
      allowedHoursTimezone: normalizeOptionalString(args.outreachAllowedTimezone),
      callFallbackApproved: args.callFallbackApproved === true,
      callConsentDisclosure: normalizeOptionalString(args.callConsentDisclosure),
      domainAutonomyLevel: domainPolicy.effective,
      autonomyPromotionApprovalId: normalizeOptionalString(
        args.autonomyPromotionApprovalId
      ),
      autonomyPromotionReason: normalizeOptionalString(args.autonomyPromotionReason),
      maxAttempts: args.maxOutreachAttempts,
      runImmediately: args.runImmediately !== false,
    }
  ) as {
    success: boolean;
    missionId?: string;
    replayed?: boolean;
    attemptLadder?: unknown;
    firstAttempt?: unknown;
    message?: string;
    error?: string;
  };

  return {
    success: missionResult.success,
    action: "execute_appointment_outreach",
    mode: "execute",
    data: {
      missionId: missionResult.missionId,
      replayed: missionResult.replayed === true,
      autonomy: {
        requested: domainPolicy.requested,
        effective: domainPolicy.effective,
        promotionCriteriaMet: domainPolicy.promotionCriteriaMet,
      },
      attemptLadder: missionResult.attemptLadder,
      firstAttempt: missionResult.firstAttempt,
      preview: previewPayload,
    },
    message:
      missionResult.message ||
      (missionResult.success
        ? "Appointment outreach mission started."
        : missionResult.error || "Failed to start appointment outreach mission."),
    error: missionResult.success ? undefined : missionResult.error,
  };
}

/**
 * Get available time slots for a resource
 */
async function getAvailableSlots(
  ctx: unknown,
  organizationId: Id<"organizations">,
  args: { resourceId?: string; startDateTime?: string; endDateTime?: string; duration?: number }
) {
  const startTs = new Date(args.startDateTime!).getTime();
  const endTs = new Date(args.endDateTime!).getTime();
  const durationMinutes = args.duration || 60;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slots = await (ctx as any).runQuery(
    generatedApi.internal.availabilityOntology.getAvailableSlotsInternal,
    {
      resourceId: args.resourceId as Id<"objects">,
      startDate: startTs,
      endDate: endTs,
      durationMinutes,
    }
  );

  const formattedSlots = slots.map((slot: { start: number; end: number }) => ({
    start: new Date(slot.start).toISOString(),
    end: new Date(slot.end).toISOString(),
  }));

  return {
    success: true,
    action: "get_available_slots",
    data: {
      resourceId: args.resourceId,
      slots: formattedSlots,
      total: formattedSlots.length,
    },
    message: `Found ${formattedSlots.length} available slot(s)`
  };
}

/**
 * Get resource calendar (existing bookings)
 */
async function getResourceCalendar(
  ctx: unknown,
  organizationId: Id<"organizations">,
  args: { resourceId?: string; dateFrom?: string; dateTo?: string }
) {
  // Default to next 7 days if not specified
  const now = Date.now();
  const startTs = args.dateFrom ? new Date(args.dateFrom).getTime() : now;
  const endTs = args.dateTo ? new Date(args.dateTo).getTime() : now + 7 * 24 * 60 * 60 * 1000;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookings = await (ctx as any).runQuery(
    generatedApi.internal.bookingOntology.listBookingsInternal,
    {
      organizationId,
      resourceId: args.resourceId as Id<"objects">,
      startDate: startTs,
      endDate: endTs,
      limit: 100,
    }
  );

  const calendar = bookings.bookings.map((b: {
    _id: string;
    status: string;
    customProperties: Record<string, unknown>;
  }) => ({
    id: b._id,
    status: b.status,
    customerName: b.customProperties?.customerName,
    start: b.customProperties?.startDateTime
      ? new Date(b.customProperties.startDateTime as number).toISOString()
      : null,
    end: b.customProperties?.endDateTime
      ? new Date(b.customProperties.endDateTime as number).toISOString()
      : null,
  }));

  return {
    success: true,
    action: "get_resource_calendar",
    data: {
      resourceId: args.resourceId,
      bookings: calendar,
      total: calendar.length,
    },
    message: `Found ${calendar.length} booking(s) in the calendar`
  };
}
