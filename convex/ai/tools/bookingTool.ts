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
import type { KanzleiBookingConciergeConfig } from "../../organizationOntology";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../_generated/api");

export const DER_TERMINMACHER_BOOKING_TOOL_MANIFEST_CONTRACT_VERSION =
  "aoh_der_terminmacher_booking_tool_manifest_v1" as const;

export const ORG_BOOKING_CONCIERGE_TOOL_ACTION =
  "run_org_booking_concierge" as const;
export const LEGACY_MEETING_CONCIERGE_TOOL_ACTION =
  "run_meeting_concierge_demo" as const;

export type BookingConciergeToolAction =
  | typeof ORG_BOOKING_CONCIERGE_TOOL_ACTION
  | typeof LEGACY_MEETING_CONCIERGE_TOOL_ACTION;

export function isBookingConciergeToolAction(
  value: unknown,
): value is BookingConciergeToolAction {
  return (
    value === ORG_BOOKING_CONCIERGE_TOOL_ACTION
    || value === LEGACY_MEETING_CONCIERGE_TOOL_ACTION
  );
}

export const DER_TERMINMACHER_BOOKING_TOOL_MANIFEST = {
  contractVersion: DER_TERMINMACHER_BOOKING_TOOL_MANIFEST_CONTRACT_VERSION,
  toolName: "manage_bookings" as const,
  requiredActions: [
    ORG_BOOKING_CONCIERGE_TOOL_ACTION,
    LEGACY_MEETING_CONCIERGE_TOOL_ACTION,
  ] as const,
  modeDefault: "preview" as const,
  previewFirst: true as const,
  executeRequiresExplicitConfirmation: true as const,
};

export const MEETING_CONCIERGE_STAGE_CONTRACT_VERSION =
  "aoh_meeting_concierge_stage_contract_v1" as const;
export const MEETING_CONCIERGE_STAGE_SEQUENCE = [
  "identify",
  "crm_lookup_create",
  "slot_parse",
  "contact_capture",
  "booking",
  "invite",
] as const;

export type MeetingConciergeStageName =
  typeof MEETING_CONCIERGE_STAGE_SEQUENCE[number];
export type MeetingConciergeStageStatus = "success" | "blocked" | "skipped";
export type MeetingConciergeFlowMode = "preview" | "execute";

export interface MeetingConciergeStageResult {
  stage: MeetingConciergeStageName;
  status: MeetingConciergeStageStatus;
  outcomeCode: string;
  failClosed: boolean;
}

export interface MeetingConciergeStageContract {
  contractVersion: typeof MEETING_CONCIERGE_STAGE_CONTRACT_VERSION;
  mode: MeetingConciergeFlowMode;
  flow: MeetingConciergeStageName[];
  terminalStage: MeetingConciergeStageName;
  terminalOutcome: "success" | "blocked";
  stages: MeetingConciergeStageResult[];
}

export const ORG_BOOKING_CONCIERGE_PHONE_SAFE_CONTRACT_VERSION =
  "org_booking_concierge_phone_safe_v1" as const;

export type OrgBookingConciergeFallbackAction =
  | "callback_capture"
  | "human_escalation";

export interface OrgBookingConciergePhoneSafeSlotOption {
  startDateTime: string;
  endDateTime: string | null;
  label: string;
}

export interface OrgBookingConciergePhoneSafeFallbackOption {
  action: OrgBookingConciergeFallbackAction;
  reason: string;
}

export interface OrgBookingConciergePhoneSafeResult {
  contractVersion: typeof ORG_BOOKING_CONCIERGE_PHONE_SAFE_CONTRACT_VERSION;
  sourceChannel: "phone_call";
  provider: "native_booking" | "calcom";
  outcome:
    | "preview_ready"
    | "booking_confirmed"
    | "blocked";
  confirmationRequired: boolean;
  recommendedSlot: OrgBookingConciergePhoneSafeSlotOption | null;
  alternateSlots: OrgBookingConciergePhoneSafeSlotOption[];
  selectedSlot: OrgBookingConciergePhoneSafeSlotOption | null;
  fallbackOptions: OrgBookingConciergePhoneSafeFallbackOption[];
  callerSafeConfirmation: {
    previewLine: string;
    confirmQuestion: string | null;
    successLine: string | null;
    failureLine: string | null;
  };
  bookingId?: string | null;
  mirrorArtifactId?: string | null;
  providerBookingUid?: string | null;
}

export type BookingConciergeLegalIntakeUrgency =
  | "low"
  | "normal"
  | "high";

type BookingConciergeIntakeCaptureMode =
  | "live_call"
  | "assistant_session";

interface BookingConciergeLegalIntakeProvenance {
  sourceChannel?: string;
  providerCallId?: string;
  providerConversationId?: string;
  captureMode?: BookingConciergeIntakeCaptureMode;
}

interface NormalizedBookingConciergeLegalIntake {
  practiceArea?: string;
  urgency?: BookingConciergeLegalIntakeUrgency;
  caseSummary?: string;
  intakeProvenance?: BookingConciergeLegalIntakeProvenance;
}

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
  missing_relative_timezone:
    "relative vacation requests must include an explicit timezone (for example: timezone:UTC)",
  missing_relative_anchor_time:
    "relative vacation requests are missing a deterministic anchor timestamp",
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
5. View booking calendar for resources
6. Run an org-scoped booking concierge flow with preview-first and explicit-confirm execution`,
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
            ORG_BOOKING_CONCIERGE_TOOL_ACTION,
            LEGACY_MEETING_CONCIERGE_TOOL_ACTION,
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
        practiceArea: {
          type: "string",
          description:
            "Optional structured legal intake practice area for the first Kanzlei wedge"
        },
        urgency: {
          type: "string",
          enum: ["low", "normal", "high"],
          description:
            "Optional structured legal intake urgency. Prefer stable values low, normal, or high."
        },
        caseSummary: {
          type: "string",
          description:
            "Optional structured legal intake summary captured from the caller conversation"
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
          enum: ["auto", "sms", "email", "phone_call", "none"],
          description:
            "Confirmation delivery channel. auto prefers sms then email; phone_call means the caller-safe confirmation is spoken on the live call."
        },
        confirmationRecipient: {
          type: "string",
          description: "Optional explicit destination override (phone/email)"
        },
        selectedSlotStart: {
          type: "string",
          description:
            "Preview-selected slot start in ISO 8601. Required for phone-safe execute mode so the confirmed slot is explicit."
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
    agentSessionId: v.optional(v.id("agentSessions")),
    agentId: v.optional(v.id("objects")),
    channel: v.optional(v.string()),
    externalContactIdentifier: v.optional(v.string()),
    providerMessageId: v.optional(v.string()),
    providerConversationId: v.optional(v.string()),
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
    practiceArea: v.optional(v.string()),
    urgency: v.optional(v.string()),
    caseSummary: v.optional(v.string()),
    meetingTitle: v.optional(v.string()),
    meetingDurationMinutes: v.optional(v.number()),
    schedulingWindowStart: v.optional(v.string()),
    schedulingWindowEnd: v.optional(v.string()),
    attendeeCalendarConnectionId: v.optional(v.string()),
    operatorCalendarConnectionId: v.optional(v.string()),
    confirmationChannel: v.optional(v.string()),
    confirmationRecipient: v.optional(v.string()),
    selectedSlotStart: v.optional(v.string()),
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

        case ORG_BOOKING_CONCIERGE_TOOL_ACTION:
        case LEGACY_MEETING_CONCIERGE_TOOL_ACTION:
          if (!userId) {
            throw new Error("userId is required for org booking concierge execution");
          }
          if (
            args.meetingConciergePolicyRequired === true
            && args.meetingConciergeCommandPolicyAllowed !== true
          ) {
            return {
              success: false,
              action:
                isBookingConciergeToolAction(args.action)
                  ? args.action
                  : ORG_BOOKING_CONCIERGE_TOOL_ACTION,
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
              action:
                isBookingConciergeToolAction(args.action)
                  ? args.action
                  : ORG_BOOKING_CONCIERGE_TOOL_ACTION,
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
            message: `Action must be one of: list_bookings, get_booking, create_booking, confirm_booking, check_in_booking, complete_booking, cancel_booking, mark_no_show, list_locations, get_location, create_location, archive_location, get_available_slots, get_resource_calendar, execute_appointment_outreach, ${ORG_BOOKING_CONCIERGE_TOOL_ACTION}, ${LEGACY_MEETING_CONCIERGE_TOOL_ACTION}`
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

  let calendarPush: { success?: boolean; error?: string; pushCount?: number } | null =
    null;
  if (result.status === "confirmed") {
    calendarPush = await (ctx as any).runAction(
      generatedApi.internal.calendarSyncOntology.pushBookingToCalendar,
      {
        bookingId: result.bookingId,
        organizationId,
      }
    ) as { success?: boolean; error?: string; pushCount?: number };
  }

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
      summary: { total: 1, created: 1 },
      calendarPush,
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

function normalizeBookingConciergeLegalIntakeUrgency(
  value: unknown,
): BookingConciergeLegalIntakeUrgency | undefined {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === "low") {
    return "low";
  }
  if (
    normalized === "normal"
    || normalized === "medium"
    || normalized === "med"
    || normalized === "standard"
  ) {
    return "normal";
  }
  if (
    normalized === "high"
    || normalized === "urgent"
    || normalized === "immediate"
    || normalized === "critical"
    || normalized === "asap"
  ) {
    return "high";
  }
  return undefined;
}

function resolveBookingConciergeIntakeCaptureMode(
  channel: unknown,
): BookingConciergeIntakeCaptureMode | undefined {
  const normalizedChannel = normalizeOptionalString(channel);
  if (!normalizedChannel) {
    return undefined;
  }
  return normalizedChannel === "phone_call"
    ? "live_call"
    : "assistant_session";
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
  personPhone?: string;
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

  const targetPhone = normalizeOptionalString(args.personPhone);
  if (targetPhone) {
    const exactPhoneMatch = args.contacts.find((contact) => {
      const props = (contact.customProperties || {}) as Record<string, unknown>;
      const phone = normalizeOptionalString(props.phone);
      return phone === targetPhone;
    });
    if (exactPhoneMatch) {
      return exactPhoneMatch;
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

async function getKanzleiBookingConciergeConfig(args: {
  ctx: unknown;
  organizationId: Id<"organizations">;
}): Promise<KanzleiBookingConciergeConfig | null> {
  return await (args.ctx as any).runQuery(
    generatedApi.internal.organizationOntology
      .getKanzleiBookingConciergeConfigInternal,
    {
      organizationId: args.organizationId,
    },
  );
}

type ConciergeResourceSource = "explicit" | "org_config" | "auto";

interface ResolvedConciergeResource {
  id: Id<"objects">;
  name?: string;
  source: ConciergeResourceSource;
}

interface ConciergeResourceResolution {
  resource: ResolvedConciergeResource | null;
  errorCode?:
    | "explicit_resource_unavailable"
    | "configured_resource_unavailable"
    | "no_resource_available";
  message?: string;
  requestedResourceId?: string | null;
  configuredResourceId?: string | null;
}

async function resolveConciergeResource(args: {
  ctx: unknown;
  organizationId: Id<"organizations">;
  resourceId?: string;
  orgBookingConfig?: KanzleiBookingConciergeConfig | null;
}): Promise<ConciergeResourceResolution> {
  const requestedResourceId = normalizeOptionalString(args.resourceId);
  if (requestedResourceId) {
    const resource = await (args.ctx as any).runQuery(
      generatedApi.internal.productOntology.getProductInternal,
      {
        productId: requestedResourceId as Id<"objects">,
      }
    ) as { _id: Id<"objects">; name?: string; organizationId: Id<"organizations"> } | null;

    if (!resource || resource.organizationId !== args.organizationId) {
      return {
        resource: null,
        errorCode: "explicit_resource_unavailable",
        message: `Resource ${requestedResourceId} is unavailable or inaccessible.`,
        requestedResourceId,
      };
    }
    return {
      resource: {
        id: resource._id,
        name: normalizeOptionalString(resource.name),
        source: "explicit",
      },
    };
  }

  const configuredResourceId = normalizeOptionalString(
    args.orgBookingConfig?.primaryResourceId,
  );
  if (configuredResourceId) {
    const resource = await (args.ctx as any).runQuery(
      generatedApi.internal.productOntology.getProductInternal,
      {
        productId: configuredResourceId as Id<"objects">,
      },
    ) as {
      _id: Id<"objects">;
      name?: string;
      organizationId: Id<"organizations">;
    } | null;

    if (resource && resource.organizationId === args.organizationId) {
      return {
        resource: {
          id: resource._id,
          name: normalizeOptionalString(resource.name),
          source: "org_config",
        },
        configuredResourceId,
      };
    }

    if (args.orgBookingConfig?.requireConfiguredResource !== false) {
      return {
        resource: null,
        errorCode: "configured_resource_unavailable",
        message:
          `Configured Kanzlei booking resource ${configuredResourceId} is unavailable or inaccessible.`,
        configuredResourceId,
      };
    }
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
    return {
      resource: null,
      errorCode: "no_resource_available",
      message:
        "No active bookable product found. Provide resourceId, or configure a Kanzlei booking resource.",
      configuredResourceId,
    };
  }

  return {
    resource: {
      id: selected.id as Id<"objects">,
      name: normalizeOptionalString(selected.name),
      source: "auto",
    },
    configuredResourceId,
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

type KanzleiFirmNotificationOutcome =
  | "booking_confirmed"
  | "callback_ready";

type KanzleiFirmNotificationIntakeSource =
  | "booking"
  | "artifact"
  | "missing";

interface KanzleiFirmNotificationResult {
  attempted: boolean;
  success: boolean;
  outcome: KanzleiFirmNotificationOutcome;
  recipients: string[];
  sentCount: number;
  skippedReason?: "no_recipients";
  errors?: string[];
  intakeResolution: {
    practiceAreaSource: KanzleiFirmNotificationIntakeSource;
    urgencySource: KanzleiFirmNotificationIntakeSource;
    caseSummarySource: KanzleiFirmNotificationIntakeSource;
  };
}

function normalizeEmailRecipients(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeEmailRecipients(entry));
  }

  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/[,\n;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry.includes("@"));
}

function dedupeCaseInsensitiveStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(value);
  }
  return deduped;
}

function resolveFirmNotificationStringField(args: {
  bookingProps: Record<string, unknown>;
  artifactProps: Record<string, unknown>;
  key: string;
}): {
  value: string | null;
  source: KanzleiFirmNotificationIntakeSource;
} {
  const bookingValue = normalizeOptionalString(args.bookingProps[args.key]);
  if (bookingValue) {
    return {
      value: bookingValue,
      source: "booking",
    };
  }

  const artifactValue = normalizeOptionalString(args.artifactProps[args.key]);
  if (artifactValue) {
    return {
      value: artifactValue,
      source: "artifact",
    };
  }

  return {
    value: null,
    source: "missing",
  };
}

function resolveFirmNotificationUrgencyField(args: {
  bookingProps: Record<string, unknown>;
  artifactProps: Record<string, unknown>;
}): {
  value: BookingConciergeLegalIntakeUrgency | null;
  source: KanzleiFirmNotificationIntakeSource;
} {
  const bookingValue = normalizeBookingConciergeLegalIntakeUrgency(
    args.bookingProps.urgency,
  );
  if (bookingValue) {
    return {
      value: bookingValue,
      source: "booking",
    };
  }

  const artifactValue = normalizeBookingConciergeLegalIntakeUrgency(
    args.artifactProps.urgency,
  );
  if (artifactValue) {
    return {
      value: artifactValue,
      source: "artifact",
    };
  }

  return {
    value: null,
    source: "missing",
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatFirmNotificationValue(value: string | null): string {
  return value || "Not captured";
}

function formatFirmNotificationUrgency(
  value: BookingConciergeLegalIntakeUrgency | null,
): string {
  if (!value) {
    return "Not captured";
  }
  if (value === "high") {
    return "High";
  }
  if (value === "normal") {
    return "Normal";
  }
  return "Low";
}

function buildKanzleiFirmNotificationEmail(args: {
  outcome: KanzleiFirmNotificationOutcome;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  company: string | null;
  meetingTitle: string | null;
  resourceName: string | null;
  bookingWindow: string | null;
  bookingId: string | null;
  artifactId: string | null;
  practiceArea: string | null;
  urgency: BookingConciergeLegalIntakeUrgency | null;
  caseSummary: string | null;
  intakeResolution: KanzleiFirmNotificationResult["intakeResolution"];
}): {
  subject: string;
  text: string;
  html: string;
} {
  const contactLabel = args.contactName || "Unknown caller";
  const subjectPrefix =
    args.outcome === "callback_ready"
      ? "Callback needed"
      : "New intake booked";
  const subject = `${subjectPrefix}: ${contactLabel}`;

  const rows = [
    ["Outcome", args.outcome === "callback_ready" ? "Callback needed" : "Booked consultation"],
    ["Caller name", formatFirmNotificationValue(args.contactName)],
    ["Caller phone", formatFirmNotificationValue(args.contactPhone)],
    ["Caller email", formatFirmNotificationValue(args.contactEmail)],
    ["Company", formatFirmNotificationValue(args.company)],
    ["Meeting title", formatFirmNotificationValue(args.meetingTitle)],
    ["Resource", formatFirmNotificationValue(args.resourceName)],
    ["When", formatFirmNotificationValue(args.bookingWindow)],
    ["Practice area", formatFirmNotificationValue(args.practiceArea)],
    ["Urgency", formatFirmNotificationUrgency(args.urgency)],
    ["Case summary", formatFirmNotificationValue(args.caseSummary)],
    ["Booking ID", formatFirmNotificationValue(args.bookingId)],
    ["Phone artifact ID", formatFirmNotificationValue(args.artifactId)],
  ] as const;

  const text = [
    "Firm intake summary",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `Intake sources: practiceArea=${args.intakeResolution.practiceAreaSource}, urgency=${args.intakeResolution.urgencySource}, caseSummary=${args.intakeResolution.caseSummarySource}`,
  ].join("\n");

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;font-weight:600;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 10px;border-bottom:1px solid #E5E7EB;white-space:pre-wrap;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  const html = [
    "<div style=\"font-family:Arial,sans-serif;color:#111827;line-height:1.5;\">",
    `<h2 style="margin:0 0 16px;">${escapeHtml(subject)}</h2>`,
    "<table style=\"border-collapse:collapse;width:100%;max-width:720px;\">",
    htmlRows,
    "</table>",
    `<p style="margin:16px 0 0;color:#6B7280;font-size:13px;">Intake sources: practiceArea=${escapeHtml(args.intakeResolution.practiceAreaSource)}, urgency=${escapeHtml(args.intakeResolution.urgencySource)}, caseSummary=${escapeHtml(args.intakeResolution.caseSummarySource)}</p>`,
    "</div>",
  ].join("");

  return {
    subject,
    text,
    html,
  };
}

async function resolveKanzleiFirmNotificationRecipients(args: {
  ctx: unknown;
  organizationId: Id<"organizations">;
}): Promise<string[]> {
  const recipients: string[] = [];

  try {
    const contacts = await (args.ctx as any).runQuery(
      generatedApi.api.ontologyHelpers.getObjects,
      {
        organizationId: args.organizationId,
        type: "organization_contact",
      },
    ) as Array<{ customProperties?: unknown }>;

    for (const contact of contacts || []) {
      const props = (contact.customProperties || {}) as Record<string, unknown>;
      recipients.push(
        ...normalizeEmailRecipients(props.supportEmail),
        ...normalizeEmailRecipients(props.contactEmail),
        ...normalizeEmailRecipients(props.notificationEmails),
        ...normalizeEmailRecipients(props.adminEmail),
        ...normalizeEmailRecipients(props.billingEmail),
      );
    }
  } catch {
    // Non-critical: missing contact settings should not block the booking path.
  }

  if (recipients.length === 0) {
    try {
      const ownerEmail = await (args.ctx as any).runQuery(
        generatedApi.internal.ai.escalation.getOrgOwnerEmail,
        {
          organizationId: args.organizationId,
        },
      ) as string | null;
      recipients.push(...normalizeEmailRecipients(ownerEmail));
    } catch {
      // Non-critical fallback lookup.
    }
  }

  return dedupeCaseInsensitiveStrings(recipients);
}

async function sendKanzleiFirmNotificationEmail(args: {
  ctx: unknown;
  organizationId: Id<"organizations">;
  outcome: KanzleiFirmNotificationOutcome;
  bookingId?: Id<"objects"> | null;
  artifactId?: string | null;
  meetingTitle?: string;
  resourceName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  company?: string;
  timezone?: string;
}): Promise<KanzleiFirmNotificationResult> {
  const recipients = await resolveKanzleiFirmNotificationRecipients({
    ctx: args.ctx,
    organizationId: args.organizationId,
  });

  const emptyResolution = {
    practiceAreaSource: "missing" as const,
    urgencySource: "missing" as const,
    caseSummarySource: "missing" as const,
  };

  if (recipients.length === 0) {
    return {
      attempted: false,
      success: false,
      outcome: args.outcome,
      recipients: [],
      sentCount: 0,
      skippedReason: "no_recipients",
      intakeResolution: emptyResolution,
    };
  }

  try {
    const booking = args.bookingId
      ? await (args.ctx as any).runQuery(
          generatedApi.internal.bookingOntology.getBookingInternal,
          {
            bookingId: args.bookingId,
            organizationId: args.organizationId,
          },
        ) as {
          _id: Id<"objects">;
          name?: string;
          customProperties?: Record<string, unknown>;
        } | null
      : null;
    const bookingProps = (booking?.customProperties || {}) as Record<
      string,
      unknown
    >;

    const resolvedArtifactId =
      normalizeOptionalString(args.artifactId) ||
      normalizeOptionalString(bookingProps.phoneCallArtifactId) ||
      null;
    const artifact = resolvedArtifactId
      ? await (args.ctx as any).runQuery(
          generatedApi.internal.objectsInternal.getObjectInternal,
          {
            objectId: resolvedArtifactId as Id<"objects">,
          },
        ) as {
          _id: Id<"objects">;
          type?: string;
          organizationId?: Id<"organizations">;
          customProperties?: Record<string, unknown>;
        } | null
      : null;
    const artifactProps =
      artifact &&
      artifact.type === "booking_phone_call_artifact" &&
      artifact.organizationId === args.organizationId
        ? (artifact.customProperties || {}) as Record<string, unknown>
        : {};

    const practiceArea = resolveFirmNotificationStringField({
      bookingProps,
      artifactProps,
      key: "practiceArea",
    });
    const urgency = resolveFirmNotificationUrgencyField({
      bookingProps,
      artifactProps,
    });
    const caseSummary = resolveFirmNotificationStringField({
      bookingProps,
      artifactProps,
      key: "caseSummary",
    });

    const bookingStart =
      typeof bookingProps.startDateTime === "number"
        ? bookingProps.startDateTime
        : toTimestamp(artifactProps.selectedSlotStart);
    const bookingEnd =
      typeof bookingProps.endDateTime === "number"
        ? bookingProps.endDateTime
        : toTimestamp(artifactProps.selectedSlotEnd);
    const bookingTimezone =
      normalizeOptionalString(bookingProps.timezone) ||
      normalizeOptionalString(artifactProps.timezone) ||
      normalizeOptionalString(args.timezone);
    const bookingWindow =
      bookingStart && bookingEnd
        ? formatMeetingWindowForMessage({
            startDateTime: bookingStart,
            endDateTime: bookingEnd,
            timezone: bookingTimezone,
          })
        : null;

    const emailPayload = buildKanzleiFirmNotificationEmail({
      outcome: args.outcome,
      contactName:
        normalizeOptionalString(bookingProps.customerName) ||
        normalizeOptionalString(artifactProps.personName) ||
        normalizeOptionalString(args.contactName) ||
        null,
      contactEmail:
        normalizeOptionalString(bookingProps.customerEmail) ||
        normalizeOptionalString(artifactProps.personEmail) ||
        normalizeOptionalString(args.contactEmail) ||
        null,
      contactPhone:
        normalizeOptionalString(bookingProps.customerPhone) ||
        normalizeOptionalString(artifactProps.personPhone) ||
        normalizeOptionalString(args.contactPhone) ||
        null,
      company: normalizeOptionalString(args.company) || null,
      meetingTitle:
        normalizeOptionalString(args.meetingTitle) ||
        normalizeOptionalString(booking?.name) ||
        null,
      resourceName: normalizeOptionalString(args.resourceName) || null,
      bookingWindow,
      bookingId: booking ? String(booking._id) : null,
      artifactId: resolvedArtifactId,
      practiceArea: practiceArea.value,
      urgency: urgency.value,
      caseSummary: caseSummary.value,
      intakeResolution: {
        practiceAreaSource: practiceArea.source,
        urgencySource: urgency.source,
        caseSummarySource: caseSummary.source,
      },
    });

    const results = await Promise.all(
      recipients.map(async (recipient) => {
        const sendResult = await (args.ctx as any).runAction(
          generatedApi.internal.channels.router.sendMessage,
          {
            organizationId: args.organizationId,
            channel: "email",
            recipientIdentifier: recipient,
            content: emailPayload.text,
            contentHtml: emailPayload.html,
            subject: emailPayload.subject,
            idempotencyKey: [
              "kanzlei_firm_notification",
              args.outcome,
              args.bookingId ? String(args.bookingId) : "no_booking",
              resolvedArtifactId || "no_artifact",
              recipient.toLowerCase(),
            ].join(":"),
          },
        ) as { success?: boolean; error?: string };

        return {
          recipient,
          success: sendResult.success === true,
          error: normalizeOptionalString(sendResult.error),
        };
      }),
    );

    const sentCount = results.filter((result) => result.success).length;
    return {
      attempted: true,
      success: sentCount > 0,
      outcome: args.outcome,
      recipients,
      sentCount,
      errors: results
        .filter((result) => !result.success && result.error)
        .map((result) => `${result.recipient}: ${result.error}`),
      intakeResolution: {
        practiceAreaSource: practiceArea.source,
        urgencySource: urgency.source,
        caseSummarySource: caseSummary.source,
      },
    };
  } catch (error) {
    return {
      attempted: false,
      success: false,
      outcome: args.outcome,
      recipients,
      sentCount: 0,
      errors: [error instanceof Error ? error.message : String(error)],
      intakeResolution: emptyResolution,
    };
  }
}

type MeetingConciergeStageState = Record<
  MeetingConciergeStageName,
  MeetingConciergeStageResult
>;

function createMeetingConciergeStageState(
  mode: MeetingConciergeFlowMode
): MeetingConciergeStageState {
  const state = {} as MeetingConciergeStageState;
  for (const stage of MEETING_CONCIERGE_STAGE_SEQUENCE) {
    const previewDeferred =
      mode === "preview" && (stage === "booking" || stage === "invite");
    state[stage] = {
      stage,
      status: "skipped",
      outcomeCode: previewDeferred ? "preview_mode_deferred" : "not_started",
      failClosed: false,
    };
  }
  return state;
}

function setMeetingConciergeStageResult(args: {
  stageState: MeetingConciergeStageState;
  stage: MeetingConciergeStageName;
  status: MeetingConciergeStageStatus;
  outcomeCode: string;
  failClosed?: boolean;
}) {
  args.stageState[args.stage] = {
    stage: args.stage,
    status: args.status,
    outcomeCode: args.outcomeCode,
    failClosed: args.failClosed === true,
  };
}

function buildMeetingConciergeStageContract(args: {
  mode: MeetingConciergeFlowMode;
  stageState: MeetingConciergeStageState;
  terminalStage: MeetingConciergeStageName;
  terminalOutcome: "success" | "blocked";
}): MeetingConciergeStageContract {
  const terminalIndex = MEETING_CONCIERGE_STAGE_SEQUENCE.indexOf(args.terminalStage);
  const stages = MEETING_CONCIERGE_STAGE_SEQUENCE.map((stage, index) => {
    const current = args.stageState[stage];
    if (
      args.terminalOutcome === "blocked"
      && index > terminalIndex
      && current.status === "skipped"
      && current.outcomeCode === "not_started"
    ) {
      return {
        ...current,
        outcomeCode: `blocked_upstream_${args.terminalStage}`,
        failClosed: true,
      };
    }
    return { ...current };
  });
  return {
    contractVersion: MEETING_CONCIERGE_STAGE_CONTRACT_VERSION,
    mode: args.mode,
    flow: [...MEETING_CONCIERGE_STAGE_SEQUENCE],
    terminalStage: args.terminalStage,
    terminalOutcome: args.terminalOutcome,
    stages,
  };
}

function buildMeetingConciergeDemoResponse(args: {
  action?: BookingConciergeToolAction;
  success: boolean;
  mode: MeetingConciergeFlowMode;
  stageState: MeetingConciergeStageState;
  terminalStage: MeetingConciergeStageName;
  terminalOutcome: "success" | "blocked";
  data?: Record<string, unknown>;
  error?: string;
  message?: string;
}) {
  const stageContract = buildMeetingConciergeStageContract({
    mode: args.mode,
    stageState: args.stageState,
    terminalStage: args.terminalStage,
    terminalOutcome: args.terminalOutcome,
  });
  return {
    success: args.success,
    action: args.action ?? ORG_BOOKING_CONCIERGE_TOOL_ACTION,
    mode: args.mode,
    data: {
      ...(args.data || {}),
      stageContract,
    },
    ...(typeof args.error === "string" && args.error.length > 0
      ? { error: args.error }
      : {}),
    ...(typeof args.message === "string" && args.message.length > 0
      ? { message: args.message }
      : {}),
  };
}

interface MeetingConciergeSourceContext {
  channel?: string;
  agentSessionId?: Id<"agentSessions">;
  agentId?: Id<"objects">;
  externalContactIdentifier?: string;
  providerMessageId?: string;
  providerConversationId?: string;
}

function buildBookingConciergeLegalIntakeProvenance(args: {
  sourceContext?: MeetingConciergeSourceContext;
}): BookingConciergeLegalIntakeProvenance | undefined {
  const sourceChannel = normalizeOptionalString(args.sourceContext?.channel);
  const providerCallId = normalizeOptionalString(
    args.sourceContext?.providerMessageId,
  );
  const providerConversationId = normalizeOptionalString(
    args.sourceContext?.providerConversationId,
  );
  const captureMode = resolveBookingConciergeIntakeCaptureMode(
    args.sourceContext?.channel,
  );

  if (
    !sourceChannel
    && !providerCallId
    && !providerConversationId
    && !captureMode
  ) {
    return undefined;
  }

  return {
    sourceChannel,
    providerCallId,
    providerConversationId,
    captureMode,
  };
}

function normalizeBookingConciergeLegalIntake(args: {
  practiceArea?: unknown;
  urgency?: unknown;
  caseSummary?: unknown;
  sourceContext?: MeetingConciergeSourceContext;
}): NormalizedBookingConciergeLegalIntake | null {
  const practiceArea = normalizeOptionalString(args.practiceArea);
  const urgency = normalizeBookingConciergeLegalIntakeUrgency(args.urgency);
  const caseSummary = normalizeOptionalString(args.caseSummary);
  const intakeProvenance = buildBookingConciergeLegalIntakeProvenance({
    sourceContext: args.sourceContext,
  });

  if (!practiceArea && !urgency && !caseSummary && !intakeProvenance) {
    return null;
  }

  return {
    ...(practiceArea ? { practiceArea } : {}),
    ...(urgency ? { urgency } : {}),
    ...(caseSummary ? { caseSummary } : {}),
    ...(intakeProvenance ? { intakeProvenance } : {}),
  };
}

function buildBookingConciergeMetadataPatch(args: {
  organizationId: Id<"organizations">;
  bookingId: Id<"objects">;
  conciergeIdempotencyKey?: string;
  sourceContext?: MeetingConciergeSourceContext;
  legalIntake?: NormalizedBookingConciergeLegalIntake | null;
}): Record<string, unknown> | null {
  const payload: Record<string, unknown> = {
    organizationId: args.organizationId,
    bookingId: args.bookingId,
  };
  let hasPatchField = false;

  const conciergeIdempotencyKey = normalizeOptionalString(
    args.conciergeIdempotencyKey,
  );
  if (conciergeIdempotencyKey) {
    payload.conciergeIdempotencyKey = conciergeIdempotencyKey;
    hasPatchField = true;
  }

  const sourceChannel = normalizeOptionalString(args.sourceContext?.channel);
  if (sourceChannel) {
    payload.sourceChannel = sourceChannel;
    hasPatchField = true;
  }

  if (args.sourceContext?.externalContactIdentifier !== undefined) {
    payload.sourceExternalContactIdentifier =
      normalizeOptionalString(args.sourceContext.externalContactIdentifier);
    hasPatchField = true;
  }
  if (args.sourceContext?.agentSessionId !== undefined) {
    payload.sourceAgentSessionId = args.sourceContext.agentSessionId;
    hasPatchField = true;
  }
  if (args.sourceContext?.agentId !== undefined) {
    payload.sourceAgentId = args.sourceContext.agentId;
    hasPatchField = true;
  }
  if (args.sourceContext?.providerMessageId !== undefined) {
    payload.sourceProviderCallId =
      normalizeOptionalString(args.sourceContext.providerMessageId);
    hasPatchField = true;
  }
  if (args.sourceContext?.providerConversationId !== undefined) {
    payload.sourceProviderConversationId =
      normalizeOptionalString(args.sourceContext.providerConversationId);
    hasPatchField = true;
  }

  if (args.legalIntake?.practiceArea) {
    payload.practiceArea = args.legalIntake.practiceArea;
    hasPatchField = true;
  }
  if (args.legalIntake?.urgency) {
    payload.urgency = args.legalIntake.urgency;
    hasPatchField = true;
  }
  if (args.legalIntake?.caseSummary) {
    payload.caseSummary = args.legalIntake.caseSummary;
    hasPatchField = true;
  }
  if (args.legalIntake?.intakeProvenance?.captureMode) {
    payload.intakeCaptureMode = args.legalIntake.intakeProvenance.captureMode;
    hasPatchField = true;
  }

  return hasPatchField ? payload : null;
}

function buildPhoneSafeFallbackOptions(
  reason: string,
): OrgBookingConciergePhoneSafeFallbackOption[] {
  return [
    {
      action: "callback_capture",
      reason,
    },
    {
      action: "human_escalation",
      reason,
    },
  ];
}

function toPhoneSafeSlotOption(args: {
  slot: ConciergeSlot;
  timezone?: string;
}): OrgBookingConciergePhoneSafeSlotOption {
  return {
    startDateTime: new Date(args.slot.startDateTime).toISOString(),
    endDateTime: new Date(args.slot.endDateTime).toISOString(),
    label: formatMeetingWindowForMessage({
      startDateTime: args.slot.startDateTime,
      endDateTime: args.slot.endDateTime,
      timezone: args.timezone,
    }),
  };
}

export function buildOrgBookingConciergePhoneSafeResult(args: {
  outcome: OrgBookingConciergePhoneSafeResult["outcome"];
  recommendedSlot: ConciergeSlot | null;
  alternateSlots?: ConciergeSlot[];
  selectedSlot?: ConciergeSlot | null;
  timezone?: string;
  bookingId?: string | null;
  mirrorArtifactId?: string | null;
  providerBookingUid?: string | null;
  failureReason?: string | null;
}): OrgBookingConciergePhoneSafeResult {
  const recommendedSlot = args.recommendedSlot
    ? toPhoneSafeSlotOption({
        slot: args.recommendedSlot,
        timezone: args.timezone,
      })
    : null;
  const alternateSlots = (args.alternateSlots || []).map((slot) =>
    toPhoneSafeSlotOption({
      slot,
      timezone: args.timezone,
    }),
  );
  const selectedSlot = args.selectedSlot
    ? toPhoneSafeSlotOption({
        slot: args.selectedSlot,
        timezone: args.timezone,
      })
    : null;
  const previewLine = recommendedSlot
    ? `The recommended slot is ${recommendedSlot.label}.`
    : "I do not have a bookable live slot yet.";
  const confirmQuestion = recommendedSlot
    ? `Would you like me to book ${recommendedSlot.label}?`
    : null;
  const failureLine = normalizeOptionalString(args.failureReason)
    ? `I could not complete the booking safely: ${normalizeOptionalString(args.failureReason)}.`
    : "I could not complete the booking safely on this call.";

  return {
    contractVersion: ORG_BOOKING_CONCIERGE_PHONE_SAFE_CONTRACT_VERSION,
    sourceChannel: "phone_call",
    provider: "native_booking",
    outcome: args.outcome,
    confirmationRequired: true,
    recommendedSlot,
    alternateSlots,
    selectedSlot,
    fallbackOptions: buildPhoneSafeFallbackOptions(
      normalizeOptionalString(args.failureReason) ||
        "booking could not be completed during the live phone call",
    ),
    callerSafeConfirmation: {
      previewLine,
      confirmQuestion,
      successLine:
        args.outcome === "booking_confirmed" && selectedSlot
          ? `Your booking is confirmed for ${selectedSlot.label}.`
          : null,
      failureLine: args.outcome === "blocked" ? failureLine : null,
    },
    bookingId: args.bookingId ?? null,
    mirrorArtifactId: args.mirrorArtifactId ?? null,
    providerBookingUid: args.providerBookingUid ?? null,
  };
}

async function runPhoneCallNativeBookingConcierge(args: {
  ctx: unknown;
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  actionName: BookingConciergeToolAction;
  mode: MeetingConciergeFlowMode;
  stageState: MeetingConciergeStageState;
  sourceContext: MeetingConciergeSourceContext;
  resolvedName: string;
  resolvedEmail?: string;
  resolvedPhone?: string;
  resolvedCompany?: string;
  matchedContact?: {
    _id: Id<"objects">;
    name?: string;
    customProperties?: unknown;
  } | null;
  matchedNormalizedContactId?: string | null;
  updatedFields: string[];
  resolvedFirstName: string;
  resolvedLastName: string;
  resolvedJobTitle?: string;
  resourceId?: string;
  meetingTitle: string;
  meetingNotes?: string;
  legalIntake?: NormalizedBookingConciergeLegalIntake | null;
  meetingDurationMinutes: number;
  schedulingWindowStart: string;
  schedulingWindowEnd: string;
  attendeeCalendarConnectionId?: string;
  operatorCalendarConnectionId?: string;
  timezone?: string;
  selectedSlotStart?: string;
  confirmationChannel?: string;
  confirmationRecipient?: string;
  conciergeIdempotencyKey?: string;
  orgBookingConfig?: KanzleiBookingConciergeConfig | null;
}) {
  const timezone =
    normalizeOptionalString(args.timezone) ||
    normalizeOptionalString(args.orgBookingConfig?.timezone) ||
    "Europe/Berlin";
  const windowStartTs = Date.parse(args.schedulingWindowStart);
  const windowEndTs = Date.parse(args.schedulingWindowEnd);
  const resourceResolution = await resolveConciergeResource({
    ctx: args.ctx,
    organizationId: args.organizationId,
    resourceId: args.resourceId,
    orgBookingConfig: args.orgBookingConfig,
  });
  if (!resourceResolution.resource) {
    setMeetingConciergeStageResult({
      stageState: args.stageState,
      stage: "slot_parse",
      status: "blocked",
      outcomeCode: "slot_resource_unavailable",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      action: args.actionName,
      success: false,
      mode: args.mode,
      stageState: args.stageState,
      terminalStage: "slot_parse",
      terminalOutcome: "blocked",
      error: "No bookable resource available",
      message:
        resourceResolution.message ||
        "No active bookable product found. Provide resourceId or configure a Kanzlei booking resource.",
      data: {
        requestedResourceId: resourceResolution.requestedResourceId || null,
        configuredResourceId: resourceResolution.configuredResourceId || null,
        phoneSafe: buildOrgBookingConciergePhoneSafeResult({
          outcome: "blocked",
          recommendedSlot: null,
          alternateSlots: [],
          timezone,
          failureReason:
            "no native booking resource is available for a safe phone booking preview",
        }),
      },
    });
  }
  const resource = resourceResolution.resource;

  let allSlots: Array<{ startDateTime?: number; endDateTime?: number }> = [];
  try {
    allSlots = await (args.ctx as any).runQuery(
      generatedApi.internal.availabilityOntology.getAvailableSlotsInternal,
      {
        organizationId: args.organizationId,
        resourceId: resource.id,
        startDate: windowStartTs,
        endDate: windowEndTs,
        duration: args.meetingDurationMinutes,
        timezone,
      }
    ) as Array<{ startDateTime?: number; endDateTime?: number }>;
  } catch (error) {
    setMeetingConciergeStageResult({
      stageState: args.stageState,
      stage: "slot_parse",
      status: "blocked",
      outcomeCode: "slot_lookup_failed",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      action: args.actionName,
      success: false,
      mode: args.mode,
      stageState: args.stageState,
      terminalStage: "slot_parse",
      terminalOutcome: "blocked",
      error: "Slot lookup failed",
      message:
        error instanceof Error
          ? error.message
          : "Native availability lookup failed before a safe phone booking preview could be returned.",
      data: {
        resource: {
          id: resource.id,
          name: resource.name,
          source: resource.source,
        },
        phoneSafe: buildOrgBookingConciergePhoneSafeResult({
          outcome: "blocked",
          recommendedSlot: null,
          alternateSlots: [],
          timezone,
          failureReason:
            "native availability could not be resolved",
        }),
      },
    });
  }

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
    .sort((left, right) => left.startDateTime - right.startDateTime);

  const connectionSnapshots: ConciergeConnectionSnapshot[] = [];
  let filteredSlots = normalizedSlots;

  const operatorConnectionId =
    normalizeOptionalString(args.operatorCalendarConnectionId) ||
    normalizeOptionalString(args.orgBookingConfig?.operatorCalendarConnectionId);
  if (operatorConnectionId) {
    const { snapshot, busyWindows } = await getConnectionBusyWindows({
      ctx: args.ctx,
      organizationId: args.organizationId,
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
            busy.endDateTime,
          ),
        ),
      );
    }
  }

  const attendeeConnectionId = normalizeOptionalString(
    args.attendeeCalendarConnectionId,
  );
  if (attendeeConnectionId) {
    const { snapshot, busyWindows } = await getConnectionBusyWindows({
      ctx: args.ctx,
      organizationId: args.organizationId,
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
            busy.endDateTime,
          ),
        ),
      );
    }
  }

  const liveSlots = filteredSlots;
  const recommendedSlot = liveSlots[0] || null;
  const alternateSlots = liveSlots.slice(1, 3);
  if (!recommendedSlot) {
    setMeetingConciergeStageResult({
      stageState: args.stageState,
      stage: "slot_parse",
      status: "blocked",
      outcomeCode: "slot_not_available",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      action: args.actionName,
      success: false,
      mode: args.mode,
      stageState: args.stageState,
      terminalStage: "slot_parse",
      terminalOutcome: "blocked",
      error: "No shared slot found",
      message:
        "No native booking slot is currently available in the requested window. Offer callback capture or human escalation instead of promising a booking.",
      data: {
        resource: {
          id: resource.id,
          name: resource.name,
          source: resource.source,
        },
        totalSlotsBeforeConnectionFilters: normalizedSlots.length,
        totalSlotsAfterConnectionFilters: filteredSlots.length,
        connectionSnapshots,
        phoneSafe: buildOrgBookingConciergePhoneSafeResult({
          outcome: "blocked",
          recommendedSlot: null,
          alternateSlots: [],
          timezone,
          failureReason:
            "no native booking slot is available in the requested window",
        }),
      },
    });
  }

  setMeetingConciergeStageResult({
    stageState: args.stageState,
    stage: "slot_parse",
    status: "success",
    outcomeCode: "slot_selected_native_booking",
  });

  let contactId: Id<"objects"> | undefined = args.matchedContact?._id;
  if (args.mode === "execute") {
    if (args.matchedContact && args.updatedFields.length > 0) {
      try {
        await (args.ctx as any).runMutation(
          generatedApi.internal.ai.tools.internalToolMutations.internalUpdateContact,
          {
            organizationId: args.organizationId,
            userId: args.userId,
            contactId: args.matchedContact._id,
            email: args.resolvedEmail,
            phone: args.resolvedPhone,
            company: args.resolvedCompany,
            jobTitle: args.resolvedJobTitle,
          },
        );
      } catch (error) {
        setMeetingConciergeStageResult({
          stageState: args.stageState,
          stage: "contact_capture",
          status: "blocked",
          outcomeCode: "contact_capture_update_failed",
          failClosed: true,
        });
        return buildMeetingConciergeDemoResponse({
          action: args.actionName,
          success: false,
          mode: args.mode,
          stageState: args.stageState,
          terminalStage: "contact_capture",
          terminalOutcome: "blocked",
          error: "Contact capture update failed",
          message:
            error instanceof Error
              ? error.message
              : "Contact capture update failed before native booking execution.",
          data: {
            phoneSafe: buildOrgBookingConciergePhoneSafeResult({
              outcome: "blocked",
              recommendedSlot,
              alternateSlots,
              timezone,
              failureReason:
                "the caller details could not be updated before booking",
            }),
          },
        });
      }
    }

    if (!args.matchedContact) {
      try {
        contactId = await (args.ctx as any).runMutation(
          generatedApi.internal.ai.tools.internalToolMutations.internalCreateContact,
          {
            organizationId: args.organizationId,
            userId: args.userId,
            subtype: "customer",
            firstName: args.resolvedFirstName,
            lastName: args.resolvedLastName,
            email: args.resolvedEmail,
            phone: args.resolvedPhone,
            company: args.resolvedCompany,
            jobTitle: args.resolvedJobTitle,
          },
        ) as Id<"objects">;
      } catch (error) {
        setMeetingConciergeStageResult({
          stageState: args.stageState,
          stage: "contact_capture",
          status: "blocked",
          outcomeCode: "contact_capture_create_failed",
          failClosed: true,
        });
        return buildMeetingConciergeDemoResponse({
          action: args.actionName,
          success: false,
          mode: args.mode,
          stageState: args.stageState,
          terminalStage: "contact_capture",
          terminalOutcome: "blocked",
          error: "Contact capture create failed",
          message:
            error instanceof Error
              ? error.message
              : "Contact capture creation failed before native booking execution.",
          data: {
            phoneSafe: buildOrgBookingConciergePhoneSafeResult({
              outcome: "blocked",
              recommendedSlot,
              alternateSlots,
              timezone,
              failureReason:
                "the caller details could not be saved before booking",
            }),
          },
        });
      }
    }

    if (!contactId) {
      setMeetingConciergeStageResult({
        stageState: args.stageState,
        stage: "contact_capture",
        status: "blocked",
        outcomeCode: "contact_capture_missing_contact_id",
        failClosed: true,
      });
      return buildMeetingConciergeDemoResponse({
        action: args.actionName,
        success: false,
        mode: args.mode,
        stageState: args.stageState,
          terminalStage: "contact_capture",
          terminalOutcome: "blocked",
          error: "Contact capture missing contact id",
          message:
          "Contact capture did not produce a contact identifier required for native booking execution.",
        data: {
          phoneSafe: buildOrgBookingConciergePhoneSafeResult({
            outcome: "blocked",
            recommendedSlot,
            alternateSlots,
            timezone,
            failureReason:
              "the caller details are incomplete for a safe booking write",
          }),
        },
      });
    }
  }

  setMeetingConciergeStageResult({
    stageState: args.stageState,
    stage: "contact_capture",
    status: "success",
    outcomeCode:
      args.mode === "preview"
        ? args.matchedContact
          ? args.updatedFields.length > 0
            ? "contact_capture_preview_update_required"
            : "contact_capture_preview_reuse"
          : "contact_capture_preview_create_required"
        : args.matchedContact
          ? args.updatedFields.length > 0
            ? "contact_capture_updated"
            : "contact_capture_reused"
          : "contact_capture_created",
  });

  if (args.mode === "preview") {
    return buildMeetingConciergeDemoResponse({
      action: args.actionName,
      success: true,
      mode: "preview",
      stageState: args.stageState,
      terminalStage: "contact_capture",
      terminalOutcome: "success",
      data: {
        resource: resource
          ? {
              id: resource.id,
              name: resource.name,
              source: resource.source,
            }
          : null,
        contact: {
          id:
            contactId
              ? String(contactId)
              : args.matchedNormalizedContactId ?? null,
          name: args.resolvedName,
          email: args.resolvedEmail,
          phone: args.resolvedPhone,
          company: args.resolvedCompany,
        },
        recommendedSlot: toPhoneSafeSlotOption({
          slot: recommendedSlot,
          timezone,
        }),
        alternateSlots: alternateSlots.map((slot) =>
          toPhoneSafeSlotOption({
            slot,
            timezone,
          }),
        ),
        phoneSafe: buildOrgBookingConciergePhoneSafeResult({
          outcome: "preview_ready",
          recommendedSlot,
          alternateSlots,
          timezone,
        }),
        connectionSnapshots,
        totalSlotsBeforeConnectionFilters: normalizedSlots.length,
        totalSlotsAfterConnectionFilters: filteredSlots.length,
      },
      message:
        `Phone-safe preview ready. Recommended slot is ${formatMeetingWindowForMessage({
          startDateTime: recommendedSlot.startDateTime,
          endDateTime: recommendedSlot.endDateTime,
          timezone,
        })}.`,
    });
  }

  const selectedSlotStart = normalizeOptionalString(args.selectedSlotStart);
  if (!selectedSlotStart) {
    setMeetingConciergeStageResult({
      stageState: args.stageState,
      stage: "booking",
      status: "blocked",
      outcomeCode: "booking_selected_slot_required",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      action: args.actionName,
      success: false,
      mode: "execute",
      stageState: args.stageState,
      terminalStage: "booking",
      terminalOutcome: "blocked",
      error: "Selected slot required",
      message:
        "Phone-safe booking execute mode requires the confirmed native slot start time from the preview step before a real booking write can occur.",
      data: {
        resource: {
          id: resource.id,
          name: resource.name,
          source: resource.source,
        },
        recommendedSlot: toPhoneSafeSlotOption({
          slot: recommendedSlot,
          timezone,
        }),
        alternateSlots: alternateSlots.map((slot) =>
          toPhoneSafeSlotOption({
            slot,
            timezone,
          }),
        ),
        phoneSafe: buildOrgBookingConciergePhoneSafeResult({
          outcome: "blocked",
          recommendedSlot,
          alternateSlots,
          timezone,
          failureReason:
            "the caller has not explicitly confirmed which live slot should be booked",
        }),
      },
    });
  }

  const selectedSlot = liveSlots.find(
    (slot) => new Date(slot.startDateTime).toISOString() === selectedSlotStart,
  );
  if (!selectedSlot) {
    setMeetingConciergeStageResult({
      stageState: args.stageState,
      stage: "booking",
      status: "blocked",
      outcomeCode: "booking_selected_slot_unavailable",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      action: args.actionName,
      success: false,
      mode: "execute",
      stageState: args.stageState,
      terminalStage: "booking",
      terminalOutcome: "blocked",
      error: "Selected slot is no longer available",
      message:
        "The confirmed slot is no longer in native availability. Offer the new recommended slot or fall back to callback capture or human escalation.",
      data: {
        resource: {
          id: resource.id,
          name: resource.name,
          source: resource.source,
        },
        recommendedSlot: toPhoneSafeSlotOption({
          slot: recommendedSlot,
          timezone,
        }),
        alternateSlots: alternateSlots.map((slot) =>
          toPhoneSafeSlotOption({
            slot,
            timezone,
          }),
        ),
        phoneSafe: buildOrgBookingConciergePhoneSafeResult({
          outcome: "blocked",
          recommendedSlot,
          alternateSlots,
          timezone,
          failureReason:
            "the confirmed slot is no longer available live",
        }),
      },
    });
  }

  let replayed = false;
  let bookingId: Id<"objects"> | null = null;
  let mirrorArtifactId: string | null = null;
  const idempotencyKey = normalizeOptionalString(args.conciergeIdempotencyKey);

  if (idempotencyKey) {
    const existing = await (args.ctx as any).runQuery(
      generatedApi.internal.bookingOntology.listBookingsInternal,
      {
        organizationId: args.organizationId,
        subtype: "appointment",
        startDate: selectedSlot.startDateTime - 24 * 60 * 60 * 1000,
        endDate: selectedSlot.endDateTime + 24 * 60 * 60 * 1000,
        limit: 200,
      },
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
      const priorProps = (prior.customProperties || {}) as Record<string, unknown>;
      mirrorArtifactId =
        normalizeOptionalString(priorProps.phoneCallArtifactId) || null;
    }
  }

  if (!bookingId) {
    try {
      const createBookingResult = await (args.ctx as any).runMutation(
        generatedApi.internal.bookingOntology.createBookingInternal,
        {
          organizationId: args.organizationId,
          userId: args.userId,
          subtype: "appointment",
          startDateTime: selectedSlot.startDateTime,
          endDateTime: selectedSlot.endDateTime,
          timezone,
          resourceIds: [resource.id],
          customerId: contactId,
          customerName: args.resolvedName,
          customerEmail: args.resolvedEmail,
          customerPhone: args.resolvedPhone,
          participants: 2,
          notes: [
            args.meetingNotes,
            `meetingTitle:${args.meetingTitle}`,
            idempotencyKey ? `conciergeIdempotencyKey:${idempotencyKey}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          confirmationRequired: false,
          isAdminBooking: true,
        },
      ) as { bookingId: Id<"objects"> };
      bookingId = createBookingResult.bookingId;
    } catch (error) {
      setMeetingConciergeStageResult({
        stageState: args.stageState,
        stage: "booking",
        status: "blocked",
        outcomeCode: "booking_create_failed",
        failClosed: true,
      });
      return buildMeetingConciergeDemoResponse({
        action: args.actionName,
        success: false,
        mode: "execute",
        stageState: args.stageState,
        terminalStage: "booking",
        terminalOutcome: "blocked",
        error: "Native booking create failed",
        message:
          error instanceof Error
            ? error.message
            : "Native booking write failed. Offer callback capture or human escalation instead of claiming success.",
        data: {
          resource: {
            id: resource.id,
            name: resource.name,
            source: resource.source,
          },
          selectedSlot: toPhoneSafeSlotOption({
            slot: selectedSlot,
            timezone,
          }),
          phoneSafe: buildOrgBookingConciergePhoneSafeResult({
            outcome: "blocked",
            recommendedSlot,
            alternateSlots,
            selectedSlot,
            timezone,
            failureReason:
              error instanceof Error
                ? error.message
                : "the native booking write failed during the live phone call",
          }),
        },
      });
    }

  }

  const bookingMetadataPatch = buildBookingConciergeMetadataPatch({
    organizationId: args.organizationId,
    bookingId: bookingId as Id<"objects">,
    conciergeIdempotencyKey: idempotencyKey,
    sourceContext: args.sourceContext,
    legalIntake: args.legalIntake,
  });
  if (bookingMetadataPatch) {
    try {
      await (args.ctx as any).runMutation(
        generatedApi.internal.bookingOntology.setBookingConciergeMetadataInternal,
        bookingMetadataPatch,
      );
    } catch (error) {
      setMeetingConciergeStageResult({
        stageState: args.stageState,
        stage: "booking",
        status: "blocked",
        outcomeCode: "booking_metadata_patch_failed",
        failClosed: true,
      });
      return buildMeetingConciergeDemoResponse({
        action: args.actionName,
        success: false,
        mode: "execute",
        stageState: args.stageState,
        terminalStage: "booking",
        terminalOutcome: "blocked",
        error: "Booking metadata patch failed",
        message:
          error instanceof Error
            ? error.message
            : "Native booking was created, but booking metadata patch failed.",
        data: {
          resource: {
            id: resource.id,
            name: resource.name,
            source: resource.source,
          },
          selectedSlot: toPhoneSafeSlotOption({
            slot: selectedSlot,
            timezone,
          }),
          phoneSafe: buildOrgBookingConciergePhoneSafeResult({
            outcome: "blocked",
            recommendedSlot,
            alternateSlots,
            selectedSlot,
            timezone,
            failureReason:
              "the booking was created, but the platform could not persist booking metadata",
          }),
        },
      });
    }
  }

  let calendarPushResult: { success?: boolean; error?: string; pushCount?: number };
  try {
    calendarPushResult = await (args.ctx as any).runAction(
      generatedApi.internal.calendarSyncOntology.pushBookingToCalendar,
      {
        bookingId,
        organizationId: args.organizationId,
      }
    ) as { success?: boolean; error?: string; pushCount?: number };
  } catch (error) {
    setMeetingConciergeStageResult({
      stageState: args.stageState,
      stage: "invite",
      status: "blocked",
      outcomeCode: "invite_calendar_push_failed",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      action: args.actionName,
      success: false,
      mode: "execute",
      stageState: args.stageState,
      terminalStage: "invite",
      terminalOutcome: "blocked",
      error: "Calendar push failed",
      message:
        error instanceof Error
          ? error.message
          : "Booking created but calendar push failed.",
      data: {
        replayed,
        bookingId: bookingId ? String(bookingId) : null,
        resource: {
          id: resource.id,
          name: resource.name,
          source: resource.source,
        },
        selectedSlot: toPhoneSafeSlotOption({
          slot: selectedSlot,
          timezone,
        }),
        connectionSnapshots,
        phoneSafe: buildOrgBookingConciergePhoneSafeResult({
          outcome: "blocked",
          recommendedSlot,
          alternateSlots,
          selectedSlot,
          timezone,
          bookingId: bookingId ? String(bookingId) : null,
          failureReason:
            "calendar reconciliation failed after the native booking write",
        }),
      },
    });
  }
  if (calendarPushResult?.success !== true) {
    setMeetingConciergeStageResult({
      stageState: args.stageState,
      stage: "invite",
      status: "blocked",
      outcomeCode: "invite_calendar_push_failed",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      action: args.actionName,
      success: false,
      mode: "execute",
      stageState: args.stageState,
      terminalStage: "invite",
      terminalOutcome: "blocked",
      error: "Calendar push failed",
      message:
        calendarPushResult?.error ||
        "Booking created but calendar push did not report success.",
      data: {
        replayed,
        bookingId: bookingId ? String(bookingId) : null,
        resource: {
          id: resource.id,
          name: resource.name,
          source: resource.source,
        },
        selectedSlot: toPhoneSafeSlotOption({
          slot: selectedSlot,
          timezone,
        }),
        connectionSnapshots,
        calendarPush: {
          success: false,
          pushCount: calendarPushResult?.pushCount || 0,
          error: calendarPushResult?.error,
        },
        phoneSafe: buildOrgBookingConciergePhoneSafeResult({
          outcome: "blocked",
          recommendedSlot,
          alternateSlots,
          selectedSlot,
          timezone,
          bookingId: bookingId ? String(bookingId) : null,
          failureReason:
            calendarPushResult?.error ||
            "calendar reconciliation failed after the native booking write",
        }),
      },
    });
  }

  if (!mirrorArtifactId) {
    try {
      const mirrorResult = await (args.ctx as any).runMutation(
        generatedApi.internal.bookingOntology.recordPhoneCallBookingMirrorInternal,
        {
          organizationId: args.organizationId,
          bookingId,
          providerId: "native_booking",
          providerSource: "native_booking_engine",
          sourceChannel: "phone_call",
          externalContactIdentifier: args.sourceContext.externalContactIdentifier,
          agentSessionId: args.sourceContext.agentSessionId,
          agentId: args.sourceContext.agentId,
          providerCallId: args.sourceContext.providerMessageId,
          providerConversationId: args.sourceContext.providerConversationId,
          personName: args.resolvedName,
          personEmail: args.resolvedEmail,
          personPhone: args.resolvedPhone,
          timezone,
          selectedSlotStart: new Date(selectedSlot.startDateTime).toISOString(),
          selectedSlotEnd: new Date(selectedSlot.endDateTime).toISOString(),
          confirmationChannel:
            normalizeOptionalString(args.confirmationChannel) || "phone_call",
          confirmationRecipient:
            normalizeOptionalString(args.confirmationRecipient) ||
            normalizeOptionalString(args.sourceContext.externalContactIdentifier) ||
            args.resolvedPhone,
          conciergeIdempotencyKey: idempotencyKey,
          practiceArea: args.legalIntake?.practiceArea,
          urgency: args.legalIntake?.urgency,
          caseSummary: args.legalIntake?.caseSummary,
          intakeCaptureMode: args.legalIntake?.intakeProvenance?.captureMode,
        },
      ) as { artifactId?: string | null };
      mirrorArtifactId =
        normalizeOptionalString(mirrorResult.artifactId) || null;
    } catch (error) {
      setMeetingConciergeStageResult({
        stageState: args.stageState,
        stage: "invite",
        status: "blocked",
        outcomeCode: "invite_phone_call_artifact_mirror_failed",
        failClosed: true,
      });
      return buildMeetingConciergeDemoResponse({
        action: args.actionName,
        success: false,
        mode: "execute",
        stageState: args.stageState,
        terminalStage: "invite",
        terminalOutcome: "blocked",
        error: "Phone-call artifact mirror failed",
        message:
          error instanceof Error
            ? error.message
            : "Native booking succeeded, but the phone-call booking artifact could not be persisted.",
        data: {
          booking: {
            id: bookingId ? String(bookingId) : null,
            title: args.meetingTitle,
          },
          selectedSlot: toPhoneSafeSlotOption({
            slot: selectedSlot,
            timezone,
          }),
          calendarPush: {
            success: true,
            pushCount: calendarPushResult?.pushCount || 0,
            error: calendarPushResult?.error,
          },
          phoneSafe: buildOrgBookingConciergePhoneSafeResult({
            outcome: "blocked",
            recommendedSlot,
            alternateSlots,
            selectedSlot,
            timezone,
            bookingId: bookingId ? String(bookingId) : null,
            failureReason:
              "the platform could not persist the phone-call booking artifact",
          }),
        },
      });
    }
  }

  const firmNotification = await sendKanzleiFirmNotificationEmail({
    ctx: args.ctx,
    organizationId: args.organizationId,
    outcome: "booking_confirmed",
    bookingId,
    artifactId: mirrorArtifactId,
    meetingTitle: args.meetingTitle,
    resourceName: resource.name,
    contactName: args.resolvedName,
    contactEmail: args.resolvedEmail,
    contactPhone: args.resolvedPhone,
    company: args.resolvedCompany,
    timezone,
  });

  setMeetingConciergeStageResult({
    stageState: args.stageState,
    stage: "booking",
    status: "success",
    outcomeCode: replayed ? "booking_replayed" : "booking_created",
  });
  setMeetingConciergeStageResult({
    stageState: args.stageState,
    stage: "invite",
    status: "success",
    outcomeCode:
      replayed
        ? "invite_phone_call_confirmation_replayed"
        : "invite_phone_call_confirmation_ready",
  });

  return buildMeetingConciergeDemoResponse({
    action: args.actionName,
    success: true,
    mode: "execute",
    stageState: args.stageState,
    terminalStage: "invite",
    terminalOutcome: "success",
    data: {
      replayed,
      bookingEngine: {
        kind: "native_booking",
      },
      resource: resource
        ? {
            id: resource.id,
            name: resource.name,
            source: resource.source,
          }
        : null,
      contact: {
        id:
          contactId
            ? String(contactId)
            : args.matchedNormalizedContactId ?? null,
        name: args.resolvedName,
        email: args.resolvedEmail,
        phone: args.resolvedPhone,
        company: args.resolvedCompany,
      },
      booking: {
        id: bookingId ? String(bookingId) : null,
        title: args.meetingTitle,
        startDateTime: new Date(selectedSlot.startDateTime).toISOString(),
        endDateTime: new Date(selectedSlot.endDateTime).toISOString(),
      },
      calendarPush: {
        success: calendarPushResult?.success === true,
        pushCount: calendarPushResult?.pushCount || 0,
        error: calendarPushResult?.error,
      },
      bookingArtifact: mirrorArtifactId
        ? {
            id: mirrorArtifactId,
            type: "booking_phone_call_artifact",
          }
        : null,
      firmNotification,
      selectedSlot: toPhoneSafeSlotOption({
        slot: selectedSlot,
        timezone,
      }),
      connectionSnapshots,
      phoneSafe: buildOrgBookingConciergePhoneSafeResult({
        outcome: "booking_confirmed",
        recommendedSlot,
        alternateSlots,
        selectedSlot,
        timezone,
        bookingId: bookingId ? String(bookingId) : null,
        mirrorArtifactId,
      }),
    },
    message:
      `Booking confirmed for ${formatMeetingWindowForMessage({
        startDateTime: selectedSlot.startDateTime,
        endDateTime: selectedSlot.endDateTime,
        timezone,
      })}.`,
  });
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
    action?: string;
    mode?: string;
    personName?: string;
    personEmail?: string;
    personPhone?: string;
    company?: string;
    practiceArea?: string;
    urgency?: string;
    caseSummary?: string;
    meetingTitle?: string;
    meetingDurationMinutes?: number;
    schedulingWindowStart?: string;
    schedulingWindowEnd?: string;
    attendeeCalendarConnectionId?: string;
    operatorCalendarConnectionId?: string;
    confirmationChannel?: string;
    confirmationRecipient?: string;
    selectedSlotStart?: string;
    conciergeIdempotencyKey?: string;
    resourceId?: string;
    timezone?: string;
    notes?: string;
    jobTitle?: string;
    channel?: string;
    agentSessionId?: Id<"agentSessions">;
    agentId?: Id<"objects">;
    externalContactIdentifier?: string;
    providerMessageId?: string;
    providerConversationId?: string;
  }
) {
  const actionName = isBookingConciergeToolAction(args.action)
    ? args.action
    : ORG_BOOKING_CONCIERGE_TOOL_ACTION;
  const mode: MeetingConciergeFlowMode =
    args.mode === "preview" ? "preview" : "execute";
  const stageState = createMeetingConciergeStageState(mode);
  const windowStartTs = toTimestamp(args.schedulingWindowStart);
  const windowEndTs = toTimestamp(args.schedulingWindowEnd);
  if (!windowStartTs || !windowEndTs || windowEndTs <= windowStartTs) {
    setMeetingConciergeStageResult({
      stageState,
      stage: "identify",
      status: "blocked",
      outcomeCode: "identify_invalid_scheduling_window",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      action: actionName,
      success: false,
      mode,
      stageState,
      terminalStage: "identify",
      terminalOutcome: "blocked",
      error: "Invalid scheduling window",
      message:
        "schedulingWindowStart and schedulingWindowEnd are required in ISO format and end must be after start.",
      data: {
        schedulingWindowStart: args.schedulingWindowStart || null,
        schedulingWindowEnd: args.schedulingWindowEnd || null,
      },
    });
  }
  setMeetingConciergeStageResult({
    stageState,
    stage: "identify",
    status: "success",
    outcomeCode: "identify_payload_ready",
  });

  const durationMinutes =
    typeof args.meetingDurationMinutes === "number" &&
    Number.isFinite(args.meetingDurationMinutes)
      ? Math.max(15, Math.min(180, Math.round(args.meetingDurationMinutes)))
      : 30;

  const phoneCallIdentity =
    normalizeOptionalString(args.channel) === "phone_call"
      ? normalizeOptionalString(args.externalContactIdentifier)
      : undefined;
  const inputPhoneCandidate =
    normalizeOptionalString(args.personPhone) || phoneCallIdentity;
  const lookupQuery =
    normalizeOptionalString(args.personEmail) ||
    inputPhoneCandidate ||
    normalizeOptionalString(args.personName);

  let candidateContacts: Array<{
    _id: Id<"objects">;
    name?: string;
    customProperties?: unknown;
  }> = [];
  try {
    candidateContacts = await (ctx as any).runQuery(
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
  } catch (error) {
    setMeetingConciergeStageResult({
      stageState,
      stage: "crm_lookup_create",
      status: "blocked",
      outcomeCode: "crm_lookup_failed",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      success: false,
      mode,
      stageState,
      terminalStage: "crm_lookup_create",
      terminalOutcome: "blocked",
      error: "CRM lookup failed",
      message:
        error instanceof Error
          ? error.message
          : "Contact lookup failed before CRM stage completion.",
      data: {
        lookupQuery: lookupQuery || null,
      },
    });
  }

  const matchedContact = selectBestContactMatch({
    contacts: candidateContacts || [],
    personName: args.personName,
    personEmail: args.personEmail,
    personPhone: inputPhoneCandidate,
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
  const resolvedPhone =
    inputPhoneCandidate || normalizeOptionalString(matchedNormalized?.phone);
  const resolvedEmail =
    normalizeOptionalString(args.personEmail) ||
    normalizeOptionalString(matchedNormalized?.email);
  const isPhoneCallChannel = normalizeOptionalString(args.channel) === "phone_call";
  if (!resolvedEmail && !isPhoneCallChannel) {
    setMeetingConciergeStageResult({
      stageState,
      stage: "crm_lookup_create",
      status: "blocked",
      outcomeCode: "crm_missing_attendee_email",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      success: false,
      mode,
      stageState,
      terminalStage: "crm_lookup_create",
      terminalOutcome: "blocked",
      error: "Missing attendee email",
      message:
        "Attendee email is required for CRM + booking flow. Provide personEmail or match an existing CRM contact with email.",
      data: {
        contactLookupMatched: Boolean(matchedContact),
        personName: resolvedName,
      },
    });
  }

  if (!resolvedEmail && !resolvedPhone) {
    setMeetingConciergeStageResult({
      stageState,
      stage: "crm_lookup_create",
      status: "blocked",
      outcomeCode: "crm_missing_phone_safe_identity",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      success: false,
      mode,
      stageState,
      terminalStage: "crm_lookup_create",
      terminalOutcome: "blocked",
      error: "Missing caller contact identity",
      message:
        "Phone-call booking flow requires either attendee email or a caller phone number before CRM + booking flow can continue.",
      data: {
        contactLookupMatched: Boolean(matchedContact),
        personName: resolvedName,
      },
    });
  }

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

  setMeetingConciergeStageResult({
    stageState,
    stage: "crm_lookup_create",
    status: "success",
    outcomeCode:
      matchedContact
        ? updatedFields.length > 0
          ? "crm_contact_reuse_update_required"
          : "crm_contact_reuse"
        : "crm_contact_create_required",
  });

  const orgBookingConfig = await getKanzleiBookingConciergeConfig({
    ctx,
    organizationId,
  });
  const resolvedTimezone =
    normalizeOptionalString(args.timezone) ||
    normalizeOptionalString(orgBookingConfig?.timezone) ||
    undefined;
  const meetingTitle =
    normalizeOptionalString(args.meetingTitle) ||
    normalizeOptionalString(orgBookingConfig?.defaultMeetingTitle) ||
    (orgBookingConfig
      ? `${
          normalizeOptionalString(orgBookingConfig.intakeLabel) ||
          "Erstberatung"
        } - ${resolvedName}`
      : `Meeting with ${resolvedName}`);
  const meetingNotes = normalizeOptionalString(args.notes);
  const sourceContext: MeetingConciergeSourceContext = {
    channel: normalizeOptionalString(args.channel),
    agentSessionId: args.agentSessionId,
    agentId: args.agentId,
    externalContactIdentifier: normalizeOptionalString(
      args.externalContactIdentifier,
    ),
    providerMessageId: normalizeOptionalString(args.providerMessageId),
    providerConversationId: normalizeOptionalString(
      args.providerConversationId,
    ),
  };
  const legalIntake = normalizeBookingConciergeLegalIntake({
    practiceArea: args.practiceArea,
    urgency: args.urgency,
    caseSummary: args.caseSummary,
    sourceContext,
  });
  if (sourceContext.channel === "phone_call") {
    return await runPhoneCallNativeBookingConcierge({
      ctx,
      organizationId,
      userId,
      actionName,
      mode,
      stageState,
      sourceContext,
      resolvedName,
      resolvedEmail,
      resolvedPhone,
      resolvedCompany,
      matchedContact,
      matchedNormalizedContactId: matchedNormalized?.id || null,
      updatedFields,
      resolvedFirstName,
      resolvedLastName,
      resolvedJobTitle,
      resourceId: args.resourceId,
      meetingTitle,
      meetingNotes,
      legalIntake,
      meetingDurationMinutes: durationMinutes,
      schedulingWindowStart: args.schedulingWindowStart!,
      schedulingWindowEnd: args.schedulingWindowEnd!,
      attendeeCalendarConnectionId: args.attendeeCalendarConnectionId,
      operatorCalendarConnectionId: args.operatorCalendarConnectionId,
      timezone: resolvedTimezone,
      selectedSlotStart: args.selectedSlotStart,
      confirmationChannel: args.confirmationChannel,
      confirmationRecipient: args.confirmationRecipient,
      conciergeIdempotencyKey: args.conciergeIdempotencyKey,
      orgBookingConfig,
    });
  }

  const resourceResolution = await resolveConciergeResource({
    ctx,
    organizationId,
    resourceId: args.resourceId,
    orgBookingConfig,
  });
  if (!resourceResolution.resource) {
    setMeetingConciergeStageResult({
      stageState,
      stage: "slot_parse",
      status: "blocked",
      outcomeCode: "slot_resource_unavailable",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      success: false,
      mode,
      stageState,
      terminalStage: "slot_parse",
      terminalOutcome: "blocked",
      error: "No bookable resource available",
      message:
        resourceResolution.message ||
        "No active bookable product found. Provide resourceId or configure a Kanzlei booking resource.",
      data: {
        requestedResourceId: resourceResolution.requestedResourceId || null,
        configuredResourceId: resourceResolution.configuredResourceId || null,
      },
    });
  }
  const resource = resourceResolution.resource;

  let allSlots: Array<{ startDateTime?: number; endDateTime?: number }> = [];
  try {
    allSlots = await (ctx as any).runQuery(
      generatedApi.internal.availabilityOntology.getAvailableSlotsInternal,
      {
        organizationId,
        resourceId: resource.id,
        startDate: windowStartTs,
        endDate: windowEndTs,
        duration: durationMinutes,
        timezone: resolvedTimezone,
      }
    ) as Array<{ startDateTime?: number; endDateTime?: number }>;
  } catch (error) {
    setMeetingConciergeStageResult({
      stageState,
      stage: "slot_parse",
      status: "blocked",
      outcomeCode: "slot_lookup_failed",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      success: false,
      mode,
      stageState,
      terminalStage: "slot_parse",
      terminalOutcome: "blocked",
      error: "Slot lookup failed",
      message:
        error instanceof Error
          ? error.message
          : "Slot parsing failed before a shared meeting window could be selected.",
      data: {
        resource: {
          id: resource.id,
          name: resource.name,
          source: resource.source,
        },
      },
    });
  }

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

  const operatorConnectionId =
    normalizeOptionalString(args.operatorCalendarConnectionId) ||
    normalizeOptionalString(orgBookingConfig?.operatorCalendarConnectionId);
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
    setMeetingConciergeStageResult({
      stageState,
      stage: "slot_parse",
      status: "blocked",
      outcomeCode: "slot_not_available",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      success: false,
      mode,
      stageState,
      terminalStage: "slot_parse",
      terminalOutcome: "blocked",
      error: "No shared slot found",
      message:
        "No mutually available slot found in the requested window. Expand schedulingWindowStart/schedulingWindowEnd or reduce duration.",
      data: {
        resourceId: resource.id,
        connectionSnapshots,
        totalSlotsBeforeConnectionFilters: normalizedSlots.length,
        totalSlotsAfterConnectionFilters: filteredSlots.length,
      },
    });
  }
  setMeetingConciergeStageResult({
    stageState,
    stage: "slot_parse",
    status: "success",
    outcomeCode: "slot_selected",
  });

  const slotLabel = formatMeetingWindowForMessage({
    startDateTime: selectedSlot.startDateTime,
    endDateTime: selectedSlot.endDateTime,
    timezone: resolvedTimezone,
  });

  let contactId: Id<"objects"> | undefined = matchedContact?._id;
  if (mode === "execute") {
    if (matchedContact && updatedFields.length > 0) {
      try {
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
      } catch (error) {
        setMeetingConciergeStageResult({
          stageState,
          stage: "contact_capture",
          status: "blocked",
          outcomeCode: "contact_capture_update_failed",
          failClosed: true,
        });
        return buildMeetingConciergeDemoResponse({
          success: false,
          mode,
          stageState,
          terminalStage: "contact_capture",
          terminalOutcome: "blocked",
          error: "Contact capture update failed",
          message:
            error instanceof Error
              ? error.message
              : "Contact capture update failed before booking mutation.",
          data: {
            contactId: String(matchedContact._id),
            updatedFields,
          },
        });
      }
    }

    if (!matchedContact) {
      try {
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
      } catch (error) {
        setMeetingConciergeStageResult({
          stageState,
          stage: "contact_capture",
          status: "blocked",
          outcomeCode: "contact_capture_create_failed",
          failClosed: true,
        });
        return buildMeetingConciergeDemoResponse({
          success: false,
          mode,
          stageState,
          terminalStage: "contact_capture",
          terminalOutcome: "blocked",
          error: "Contact capture create failed",
          message:
            error instanceof Error
              ? error.message
              : "Contact capture creation failed before booking mutation.",
          data: {
            personName: resolvedName,
            personEmail: resolvedEmail,
          },
        });
      }
    }

    if (!contactId) {
      setMeetingConciergeStageResult({
        stageState,
        stage: "contact_capture",
        status: "blocked",
        outcomeCode: "contact_capture_missing_contact_id",
        failClosed: true,
      });
      return buildMeetingConciergeDemoResponse({
        success: false,
        mode,
        stageState,
        terminalStage: "contact_capture",
        terminalOutcome: "blocked",
        error: "Contact capture missing contact id",
        message:
          "Contact capture did not produce a contact identifier required for booking mutation.",
      });
    }
  }
  setMeetingConciergeStageResult({
    stageState,
    stage: "contact_capture",
    status: "success",
    outcomeCode:
      mode === "preview"
        ? matchedContact
          ? updatedFields.length > 0
            ? "contact_capture_preview_update_required"
            : "contact_capture_preview_reuse"
          : "contact_capture_preview_create_required"
        : matchedContact
          ? updatedFields.length > 0
            ? "contact_capture_updated"
            : "contact_capture_reused"
          : "contact_capture_created",
  });

  if (mode === "preview") {
    return buildMeetingConciergeDemoResponse({
      success: true,
      mode: "preview",
      stageState,
      terminalStage: "contact_capture",
      terminalOutcome: "success",
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
    });
  }

  let replayed = false;
  let bookingId: Id<"objects"> | null = null;
  const idempotencyKey = normalizeOptionalString(args.conciergeIdempotencyKey);

  if (idempotencyKey) {
    let existing: {
      bookings: Array<{
        _id: Id<"objects">;
        customProperties?: Record<string, unknown>;
      }>;
    };
    try {
      existing = await (ctx as any).runQuery(
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
    } catch (error) {
      setMeetingConciergeStageResult({
        stageState,
        stage: "booking",
        status: "blocked",
        outcomeCode: "booking_idempotency_lookup_failed",
        failClosed: true,
      });
      return buildMeetingConciergeDemoResponse({
        success: false,
        mode: "execute",
        stageState,
        terminalStage: "booking",
        terminalOutcome: "blocked",
        error: "Booking idempotency lookup failed",
        message:
          error instanceof Error
            ? error.message
            : "Idempotency lookup failed before booking mutation.",
        data: {
          conciergeIdempotencyKey: idempotencyKey,
        },
      });
    }
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
    try {
      const createResult = await (ctx as any).runMutation(
        generatedApi.internal.bookingOntology.createBookingInternal,
        {
          organizationId,
          userId,
          subtype: "appointment",
          startDateTime: selectedSlot.startDateTime,
          endDateTime: selectedSlot.endDateTime,
          timezone: resolvedTimezone,
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
    } catch (error) {
      setMeetingConciergeStageResult({
        stageState,
        stage: "booking",
        status: "blocked",
        outcomeCode: "booking_create_failed",
        failClosed: true,
      });
      return buildMeetingConciergeDemoResponse({
        success: false,
        mode: "execute",
        stageState,
        terminalStage: "booking",
        terminalOutcome: "blocked",
        error: "Booking create failed",
        message:
          error instanceof Error
            ? error.message
            : "Booking mutation failed before completion.",
        data: {
          contactId: contactId ? String(contactId) : null,
          selectedSlot: {
            startDateTime: new Date(selectedSlot.startDateTime).toISOString(),
            endDateTime: new Date(selectedSlot.endDateTime).toISOString(),
          },
        },
      });
    }

  }

  const bookingMetadataPatch = buildBookingConciergeMetadataPatch({
    organizationId,
    bookingId: bookingId as Id<"objects">,
    conciergeIdempotencyKey: idempotencyKey,
    sourceContext,
    legalIntake,
  });
  if (bookingMetadataPatch) {
    try {
      await (ctx as any).runMutation(
        generatedApi.internal.bookingOntology.setBookingConciergeMetadataInternal,
        bookingMetadataPatch,
      );
    } catch (error) {
      setMeetingConciergeStageResult({
        stageState,
        stage: "booking",
        status: "blocked",
        outcomeCode: "booking_metadata_patch_failed",
        failClosed: true,
      });
      return buildMeetingConciergeDemoResponse({
        success: false,
        mode: "execute",
        stageState,
        terminalStage: "booking",
        terminalOutcome: "blocked",
        error: "Booking metadata patch failed",
        message:
          error instanceof Error
            ? error.message
            : "Booking created but metadata patch failed.",
        data: {
          bookingId: bookingId ? String(bookingId) : null,
          conciergeIdempotencyKey: idempotencyKey,
        }
      });
    }
  }
  setMeetingConciergeStageResult({
    stageState,
    stage: "booking",
    status: "success",
    outcomeCode: replayed ? "booking_replayed" : "booking_created",
  });

  let calendarPushResult: { success?: boolean; error?: string; pushCount?: number };
  try {
    calendarPushResult = await (ctx as any).runAction(
      generatedApi.internal.calendarSyncOntology.pushBookingToCalendar,
      {
        bookingId,
        organizationId,
      }
    ) as { success?: boolean; error?: string; pushCount?: number };
  } catch (error) {
    setMeetingConciergeStageResult({
      stageState,
      stage: "invite",
      status: "blocked",
      outcomeCode: "invite_calendar_push_failed",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      success: false,
      mode: "execute",
      stageState,
      terminalStage: "invite",
      terminalOutcome: "blocked",
      error: "Calendar push failed",
      message:
        error instanceof Error
          ? error.message
          : "Booking created but calendar push failed.",
      data: {
        replayed,
        bookingId: bookingId ? String(bookingId) : null,
        slotLabel,
      },
    });
  }
  if (calendarPushResult?.success !== true) {
    setMeetingConciergeStageResult({
      stageState,
      stage: "invite",
      status: "blocked",
      outcomeCode: "invite_calendar_push_failed",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      success: false,
      mode: "execute",
      stageState,
      terminalStage: "invite",
      terminalOutcome: "blocked",
      error: "Calendar push failed",
      message:
        calendarPushResult?.error ||
        "Booking created but calendar push did not report success.",
      data: {
        replayed,
        bookingId: bookingId ? String(bookingId) : null,
        slotLabel,
        calendarPush: {
          success: false,
          pushCount: calendarPushResult?.pushCount || 0,
          error: calendarPushResult?.error,
        },
      },
    });
  }

  const confirmationRoute = resolveConfirmationRouting({
    preferred: args.confirmationChannel,
    explicitRecipient: args.confirmationRecipient,
    personEmail: resolvedEmail,
    personPhone: resolvedPhone,
  });
  if (!confirmationRoute.channel || !confirmationRoute.recipient) {
    setMeetingConciergeStageResult({
      stageState,
      stage: "invite",
      status: "blocked",
      outcomeCode: "invite_recipient_unavailable",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      success: false,
      mode: "execute",
      stageState,
      terminalStage: "invite",
      terminalOutcome: "blocked",
      error: "Confirmation recipient unavailable",
      message:
        "Booking and calendar push succeeded, but no confirmation channel/recipient was available.",
      data: {
        replayed,
        bookingId: bookingId ? String(bookingId) : null,
        slotLabel,
        calendarPush: {
          success: true,
          pushCount: calendarPushResult?.pushCount || 0,
        },
      },
    });
  }

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

  const confirmationText = [
    `Confirmed: ${meetingTitle}`,
    `When: ${slotLabel}`,
    resource.name ? `Where: ${resource.name}` : null,
    "Reply here if you need to reschedule.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
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
  } catch (error) {
    setMeetingConciergeStageResult({
      stageState,
      stage: "invite",
      status: "blocked",
      outcomeCode: "invite_delivery_failed",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      success: false,
      mode: "execute",
      stageState,
      terminalStage: "invite",
      terminalOutcome: "blocked",
      error: "Confirmation delivery failed",
      message:
        error instanceof Error
          ? error.message
          : "Booking and calendar push succeeded, but confirmation delivery threw.",
      data: {
        replayed,
        bookingId: bookingId ? String(bookingId) : null,
        slotLabel,
      },
    });
  }
  if (!confirmationResult.success) {
    setMeetingConciergeStageResult({
      stageState,
      stage: "invite",
      status: "blocked",
      outcomeCode: "invite_delivery_failed",
      failClosed: true,
    });
    return buildMeetingConciergeDemoResponse({
      success: false,
      mode: "execute",
      stageState,
      terminalStage: "invite",
      terminalOutcome: "blocked",
      error: "Confirmation delivery failed",
      message:
        confirmationResult.error ||
        "Booking and calendar push succeeded, but confirmation delivery failed.",
      data: {
        replayed,
        bookingId: bookingId ? String(bookingId) : null,
        slotLabel,
        confirmation: confirmationResult,
      },
    });
  }
  setMeetingConciergeStageResult({
    stageState,
    stage: "invite",
    status: "success",
    outcomeCode: "invite_sent",
  });

  return buildMeetingConciergeDemoResponse({
    success: true,
    mode: "execute",
    stageState,
    terminalStage: "invite",
    terminalOutcome: "success",
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
    message: `Meeting booked and confirmation sent (${slotLabel}).`,
  });
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
