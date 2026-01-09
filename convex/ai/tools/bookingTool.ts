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
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

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
            "get_resource_calendar"
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
      const session = await ctx.runQuery(internal.stripeConnect.validateSession, {
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

        default:
          return {
            success: false,
            action: args.action,
            error: "Invalid action",
            message: "Action must be one of: list_bookings, get_booking, create_booking, confirm_booking, check_in_booking, complete_booking, cancel_booking, mark_no_show, list_locations, get_location, create_location, archive_location, get_available_slots, get_resource_calendar"
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (ctx as any).runQuery(
    internal.bookingOntology.listBookingsInternal,
    {
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
    internal.bookingOntology.getBookingInternal,
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
      internal.ai.tools.internalToolMutations.internalCreateWorkItem,
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
    internal.bookingOntology.createBookingInternal,
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
      internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
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
    internal.bookingOntology.updateBookingStatusInternal,
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
    internal.locationOntology.listLocationsInternal,
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
    internal.locationOntology.getLocationInternal,
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
      internal.ai.tools.internalToolMutations.internalCreateWorkItem,
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
    internal.locationOntology.createLocationInternal,
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
      internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
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
    internal.locationOntology.archiveLocationInternal,
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
    internal.availabilityOntology.getAvailableSlotsInternal,
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
    internal.bookingOntology.listBookingsInternal,
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
