/**
 * BOOKING ONTOLOGY
 *
 * Core booking operations for the all-purpose booking system.
 * Uses the universal ontology system (objects table).
 *
 * Booking Types (subtype):
 * - "appointment" - 1:1 meetings, consultations
 * - "reservation" - Room/space bookings, hotel stays
 * - "rental" - Equipment or vehicle rentals
 * - "class_enrollment" - Group sessions, workshops
 *
 * Status Workflow:
 * - "pending_confirmation" - Awaiting admin approval
 * - "confirmed" - Booking approved and scheduled
 * - "checked_in" - Customer has arrived/started
 * - "completed" - Session finished successfully
 * - "cancelled" - Booking was cancelled
 * - "no_show" - Customer didn't show up
 *
 * Key Features:
 * - Single and recurring bookings
 * - Multi-resource booking support
 * - Deposit and full payment flows
 * - Check-in/check-out tracking
 * - Conflict detection with buffer time
 */

import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./rbacHelpers";
import { internal } from "./_generated/api";

// ============================================================================
// TYPES AND VALIDATORS
// ============================================================================

export interface BookingListItem {
  _id: Id<"objects">;
  _creationTime: number;
  status: string;
  subtype: string;

  // Time
  startDateTime: number;
  endDateTime: number;
  duration: number;
  timezone: string;

  // Customer
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  participants: number;

  // Resource
  resourceId?: Id<"objects">;
  resourceName?: string;

  // Location
  locationId?: Id<"objects">;
  locationName?: string;

  // Payment
  paymentType: string;
  totalAmountCents: number;
  paidAmountCents: number;

  // Flags
  confirmationRequired: boolean;
  isRecurring: boolean;
}

export interface BookingDetail extends BookingListItem {
  // Full guest details
  guestDetails: Array<{ name: string; email?: string }>;

  // Confirmation
  confirmedAt?: number;
  confirmedBy?: Id<"users">;

  // Payment details
  depositAmountCents: number;
  transactionId?: Id<"objects">;

  // Recurring
  recurrenceSeriesId?: Id<"objects">;
  recurrenceIndex?: number;

  // Check-in
  checkedInAt?: number;
  checkedInBy?: Id<"users">;

  // Cancellation
  cancelledAt?: number;
  cancelledBy?: Id<"users">;
  cancellationReason?: string;
  refundAmountCents: number;

  // Notes
  notes: string;
  internalNotes: string;

  // Source
  isAdminBooking: boolean;
  bookedViaEventId?: Id<"objects">;

  // Linked resources (multi-resource)
  linkedResources: Array<{
    resourceId: Id<"objects">;
    resourceName: string;
    resourceType: string;
  }>;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET ORGANIZATION BOOKINGS
 * Returns paginated list of bookings with filtering options
 */
export const getOrganizationBookings = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),

    // Filters
    status: v.optional(v.string()),
    subtype: v.optional(v.string()),
    resourceId: v.optional(v.id("objects")),
    locationId: v.optional(v.id("objects")),
    customerId: v.optional(v.id("objects")),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),

    // Pagination
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all bookings for organization
    let bookings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "booking")
      )
      .collect();

    // Apply filters
    if (args.status) {
      bookings = bookings.filter((b) => b.status === args.status);
    }
    if (args.subtype) {
      bookings = bookings.filter((b) => b.subtype === args.subtype);
    }
    if (args.dateFrom || args.dateTo) {
      bookings = bookings.filter((b) => {
        const props = b.customProperties as Record<string, unknown>;
        const startDateTime = props.startDateTime as number;
        if (args.dateFrom && startDateTime < args.dateFrom) return false;
        if (args.dateTo && startDateTime > args.dateTo) return false;
        return true;
      });
    }
    if (args.resourceId) {
      // Filter by linked resource
      const resourceLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_to_link_type", (q) =>
          q.eq("toObjectId", args.resourceId!).eq("linkType", "books_resource")
        )
        .collect();
      const bookingIdsWithResource = new Set(resourceLinks.map((l) => l.fromObjectId));
      bookings = bookings.filter((b) => bookingIdsWithResource.has(b._id));
    }
    if (args.customerId) {
      bookings = bookings.filter((b) => {
        const props = b.customProperties as Record<string, unknown>;
        return props.customerId === args.customerId;
      });
    }
    if (args.locationId) {
      bookings = bookings.filter((b) => {
        const props = b.customProperties as Record<string, unknown>;
        return props.locationId === args.locationId;
      });
    }

    // Sort by start date descending (newest first)
    bookings.sort((a, b) => {
      const aProps = a.customProperties as Record<string, unknown>;
      const bProps = b.customProperties as Record<string, unknown>;
      return (bProps.startDateTime as number) - (aProps.startDateTime as number);
    });

    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 50;
    const paginatedBookings = bookings.slice(offset, offset + limit);

    // Map to list format
    const results: BookingListItem[] = await Promise.all(
      paginatedBookings.map(async (booking) => {
        const props = booking.customProperties as Record<string, unknown>;

        // Get primary resource info
        const resourceLinks = await ctx.db
          .query("objectLinks")
          .withIndex("by_from_link_type", (q) =>
            q.eq("fromObjectId", booking._id).eq("linkType", "books_resource")
          )
          .collect();

        let resourceName: string | undefined;
        let resourceId: Id<"objects"> | undefined;
        if (resourceLinks.length > 0) {
          const resource = await ctx.db.get(resourceLinks[0].toObjectId);
          if (resource) {
            resourceName = resource.name || undefined;
            resourceId = resource._id;
          }
        }

        // Get location info
        let locationName: string | undefined;
        if (props.locationId) {
          const location = await ctx.db.get(props.locationId as Id<"objects">);
          if (location) {
            locationName = location.name || undefined;
          }
        }

        return {
          _id: booking._id,
          _creationTime: booking._creationTime,
          status: booking.status || "pending_confirmation",
          subtype: booking.subtype || "appointment",

          startDateTime: (props.startDateTime as number) || 0,
          endDateTime: (props.endDateTime as number) || 0,
          duration: (props.duration as number) || 0,
          timezone: (props.timezone as string) || "UTC",

          customerName: (props.customerName as string) || "Unknown",
          customerEmail: (props.customerEmail as string) || "",
          customerPhone: props.customerPhone as string | undefined,
          participants: (props.participants as number) || 1,

          resourceId,
          resourceName,
          locationId: props.locationId as Id<"objects"> | undefined,
          locationName,

          paymentType: (props.paymentType as string) || "none",
          totalAmountCents: (props.totalAmountCents as number) || 0,
          paidAmountCents: (props.paidAmountCents as number) || 0,

          confirmationRequired: (props.confirmationRequired as boolean) || false,
          isRecurring: (props.isRecurring as boolean) || false,
        };
      })
    );

    return {
      bookings: results,
      total: bookings.length,
      offset,
      limit,
    };
  },
});

/**
 * GET BOOKING DETAIL
 * Returns full details for a single booking
 */
export const getBookingDetail = query({
  args: {
    sessionId: v.string(),
    bookingId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found");
    }

    const props = booking.customProperties as Record<string, unknown>;

    // Get all linked resources
    const resourceLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", booking._id).eq("linkType", "books_resource")
      )
      .collect();

    const linkedResources = await Promise.all(
      resourceLinks.map(async (link) => {
        const resource = await ctx.db.get(link.toObjectId);
        return {
          resourceId: link.toObjectId,
          resourceName: resource?.name || "Unknown",
          resourceType: resource?.subtype || "unknown",
        };
      })
    );

    // Get location info
    let locationName: string | undefined;
    if (props.locationId) {
      const location = await ctx.db.get(props.locationId as Id<"objects">);
      if (location) {
        locationName = location.name || undefined;
      }
    }

    // Get primary resource
    let resourceName: string | undefined;
    let resourceId: Id<"objects"> | undefined;
    if (linkedResources.length > 0) {
      resourceName = linkedResources[0].resourceName;
      resourceId = linkedResources[0].resourceId;
    }

    const detail: BookingDetail = {
      _id: booking._id,
      _creationTime: booking._creationTime,
      status: booking.status || "pending_confirmation",
      subtype: booking.subtype || "appointment",

      startDateTime: (props.startDateTime as number) || 0,
      endDateTime: (props.endDateTime as number) || 0,
      duration: (props.duration as number) || 0,
      timezone: (props.timezone as string) || "UTC",

      customerName: (props.customerName as string) || "Unknown",
      customerEmail: (props.customerEmail as string) || "",
      customerPhone: props.customerPhone as string | undefined,
      participants: (props.participants as number) || 1,

      resourceId,
      resourceName,
      locationId: props.locationId as Id<"objects"> | undefined,
      locationName,

      paymentType: (props.paymentType as string) || "none",
      totalAmountCents: (props.totalAmountCents as number) || 0,
      paidAmountCents: (props.paidAmountCents as number) || 0,

      confirmationRequired: (props.confirmationRequired as boolean) || false,
      isRecurring: (props.isRecurring as boolean) || false,

      // Extended fields
      guestDetails: (props.guestDetails as Array<{ name: string; email?: string }>) || [],
      confirmedAt: props.confirmedAt as number | undefined,
      confirmedBy: props.confirmedBy as Id<"users"> | undefined,
      depositAmountCents: (props.depositAmountCents as number) || 0,
      transactionId: props.transactionId as Id<"objects"> | undefined,
      recurrenceSeriesId: props.recurrenceSeriesId as Id<"objects"> | undefined,
      recurrenceIndex: props.recurrenceIndex as number | undefined,
      checkedInAt: props.checkedInAt as number | undefined,
      checkedInBy: props.checkedInBy as Id<"users"> | undefined,
      cancelledAt: props.cancelledAt as number | undefined,
      cancelledBy: props.cancelledBy as Id<"users"> | undefined,
      cancellationReason: props.cancellationReason as string | undefined,
      refundAmountCents: (props.refundAmountCents as number) || 0,
      notes: (props.notes as string) || "",
      internalNotes: (props.internalNotes as string) || "",
      isAdminBooking: (props.isAdminBooking as boolean) || false,
      bookedViaEventId: props.bookedViaEventId as Id<"objects"> | undefined,
      linkedResources,
    };

    return detail;
  },
});

/**
 * GET RESOURCE BOOKINGS
 * Returns bookings for a specific resource (calendar view)
 */
export const getResourceBookings = query({
  args: {
    sessionId: v.string(),
    resourceId: v.id("objects"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all booking links for this resource
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.resourceId).eq("linkType", "books_resource")
      )
      .collect();

    const bookings: BookingListItem[] = [];

    for (const link of links) {
      const booking = await ctx.db.get(link.fromObjectId);
      if (!booking || booking.type !== "booking") continue;

      const props = booking.customProperties as Record<string, unknown>;
      const startDateTime = props.startDateTime as number;
      const endDateTime = props.endDateTime as number;

      // Check if booking overlaps with date range
      if (startDateTime > args.endDate || endDateTime < args.startDate) continue;

      // Skip cancelled bookings
      if (booking.status === "cancelled") continue;

      const resource = await ctx.db.get(args.resourceId);

      bookings.push({
        _id: booking._id,
        _creationTime: booking._creationTime,
        status: booking.status || "pending_confirmation",
        subtype: booking.subtype || "appointment",

        startDateTime,
        endDateTime,
        duration: (props.duration as number) || 0,
        timezone: (props.timezone as string) || "UTC",

        customerName: (props.customerName as string) || "Unknown",
        customerEmail: (props.customerEmail as string) || "",
        customerPhone: props.customerPhone as string | undefined,
        participants: (props.participants as number) || 1,

        resourceId: args.resourceId,
        resourceName: resource?.name || undefined,
        locationId: props.locationId as Id<"objects"> | undefined,
        locationName: undefined,

        paymentType: (props.paymentType as string) || "none",
        totalAmountCents: (props.totalAmountCents as number) || 0,
        paidAmountCents: (props.paidAmountCents as number) || 0,

        confirmationRequired: (props.confirmationRequired as boolean) || false,
        isRecurring: (props.isRecurring as boolean) || false,
      });
    }

    // Sort by start date
    bookings.sort((a, b) => a.startDateTime - b.startDateTime);

    return bookings;
  },
});

// ============================================================================
// MUTATIONS - CREATE BOOKING
// ============================================================================

/**
 * CREATE BOOKING
 * Create a single booking for a resource
 */
export const createBooking = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),

    // Booking type
    subtype: v.union(
      v.literal("appointment"),
      v.literal("reservation"),
      v.literal("rental"),
      v.literal("class_enrollment")
    ),

    // Time
    startDateTime: v.number(),
    endDateTime: v.number(),
    timezone: v.optional(v.string()),

    // Resource(s)
    resourceIds: v.array(v.id("objects")),

    // Customer
    customerId: v.optional(v.id("objects")),
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.optional(v.string()),
    participants: v.optional(v.number()),
    guestDetails: v.optional(v.array(v.object({
      name: v.string(),
      email: v.optional(v.string()),
    }))),

    // Location
    locationId: v.optional(v.id("objects")),

    // Payment
    paymentType: v.optional(v.union(
      v.literal("none"),
      v.literal("deposit"),
      v.literal("full")
    )),
    totalAmountCents: v.optional(v.number()),
    depositAmountCents: v.optional(v.number()),

    // Options
    confirmationRequired: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    internalNotes: v.optional(v.string()),

    // Admin booking
    isAdminBooking: v.optional(v.boolean()),
    bookedViaEventId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Validate resources exist and belong to org
    for (const resourceId of args.resourceIds) {
      const resource = await ctx.db.get(resourceId);
      if (!resource || resource.organizationId !== args.organizationId) {
        throw new Error(`Resource ${resourceId} not found`);
      }
      if (resource.type !== "product") {
        throw new Error(`Resource ${resourceId} is not a bookable product`);
      }
    }

    // Check for conflicts on all resources
    for (const resourceId of args.resourceIds) {
      const hasConflict = await ctx.runQuery(internal.availabilityOntology.checkConflict, {
        resourceId,
        startDateTime: args.startDateTime,
        endDateTime: args.endDateTime,
      });
      if (hasConflict) {
        const resource = await ctx.db.get(resourceId);
        throw new Error(`Conflict detected for resource: ${resource?.name || resourceId}`);
      }
    }

    // Determine initial status
    const confirmationRequired = args.confirmationRequired ?? false;
    const initialStatus = confirmationRequired ? "pending_confirmation" : "confirmed";

    // Calculate duration
    const duration = Math.round((args.endDateTime - args.startDateTime) / 60000);

    // Create the booking
    const bookingId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "booking",
      subtype: args.subtype,
      name: `${args.subtype} - ${args.customerName}`,
      status: initialStatus,
      customProperties: {
        // Time
        startDateTime: args.startDateTime,
        endDateTime: args.endDateTime,
        duration,
        timezone: args.timezone || "UTC",

        // Customer
        customerId: args.customerId || null,
        customerName: args.customerName,
        customerEmail: args.customerEmail,
        customerPhone: args.customerPhone || null,
        participants: args.participants || 1,
        guestDetails: args.guestDetails || [],

        // Location
        locationId: args.locationId || null,

        // Confirmation
        confirmationRequired,
        confirmedAt: confirmationRequired ? null : Date.now(),
        confirmedBy: confirmationRequired ? null : userId,

        // Payment
        paymentType: args.paymentType || "none",
        totalAmountCents: args.totalAmountCents || 0,
        depositAmountCents: args.depositAmountCents || 0,
        paidAmountCents: 0,
        transactionId: null,

        // Recurring
        isRecurring: false,
        recurrenceSeriesId: null,
        recurrenceIndex: null,

        // Check-in
        checkedInAt: null,
        checkedInBy: null,

        // Cancellation
        cancelledAt: null,
        cancelledBy: null,
        cancellationReason: null,
        refundAmountCents: 0,

        // Notes
        notes: args.notes || "",
        internalNotes: args.internalNotes || "",

        // Source
        isAdminBooking: args.isAdminBooking || false,
        bookedViaEventId: args.bookedViaEventId || null,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link to resources
    for (const resourceId of args.resourceIds) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: bookingId,
        toObjectId: resourceId,
        linkType: "books_resource",
        createdBy: userId,
        createdAt: Date.now(),
      });
    }

    // Link to customer if provided
    if (args.customerId) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: bookingId,
        toObjectId: args.customerId,
        linkType: "booked_by",
        createdBy: userId,
        createdAt: Date.now(),
      });
    }

    return { bookingId, status: initialStatus };
  },
});

/**
 * CREATE RECURRING BOOKING
 * Create a series of recurring bookings
 */
export const createRecurringBooking = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),

    // Booking type
    subtype: v.union(
      v.literal("appointment"),
      v.literal("reservation"),
      v.literal("rental"),
      v.literal("class_enrollment")
    ),

    // Time (for first occurrence)
    startDateTime: v.number(),
    endDateTime: v.number(),
    timezone: v.optional(v.string()),

    // Recurrence
    frequency: v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("monthly")),
    count: v.number(), // Number of occurrences

    // Resource(s)
    resourceIds: v.array(v.id("objects")),

    // Customer
    customerId: v.optional(v.id("objects")),
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.optional(v.string()),
    participants: v.optional(v.number()),

    // Location
    locationId: v.optional(v.id("objects")),

    // Payment (per occurrence)
    paymentType: v.optional(v.union(
      v.literal("none"),
      v.literal("deposit"),
      v.literal("full")
    )),
    totalAmountCents: v.optional(v.number()),

    // Options
    confirmationRequired: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Generate all occurrence dates
    const occurrences = generateOccurrences(
      args.startDateTime,
      args.endDateTime,
      args.frequency,
      args.count
    );

    // Check ALL dates for conflicts (block entire series if any conflict)
    for (const occ of occurrences) {
      for (const resourceId of args.resourceIds) {
        const hasConflict = await ctx.runQuery(internal.availabilityOntology.checkConflict, {
          resourceId,
          startDateTime: occ.start,
          endDateTime: occ.end,
        });
        if (hasConflict) {
          const resource = await ctx.db.get(resourceId);
          throw new Error(
            `Cannot create series: conflict on ${formatDate(occ.start)} for resource ${resource?.name || resourceId}`
          );
        }
      }
    }

    // Create series master
    const seriesId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "booking",
      subtype: args.subtype,
      name: `Recurring ${args.subtype} - ${args.customerName}`,
      status: "recurring_series",
      customProperties: {
        isRecurringSeries: true,
        frequency: args.frequency,
        count: args.count,
        customerName: args.customerName,
        customerEmail: args.customerEmail,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create individual bookings
    const bookingIds: Id<"objects">[] = [];
    const confirmationRequired = args.confirmationRequired ?? false;
    const initialStatus = confirmationRequired ? "pending_confirmation" : "confirmed";
    const duration = Math.round((args.endDateTime - args.startDateTime) / 60000);

    for (let i = 0; i < occurrences.length; i++) {
      const occ = occurrences[i];

      const bookingId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "booking",
        subtype: args.subtype,
        name: `${args.subtype} - ${args.customerName} (${i + 1}/${args.count})`,
        status: initialStatus,
        customProperties: {
          startDateTime: occ.start,
          endDateTime: occ.end,
          duration,
          timezone: args.timezone || "UTC",

          customerId: args.customerId || null,
          customerName: args.customerName,
          customerEmail: args.customerEmail,
          customerPhone: args.customerPhone || null,
          participants: args.participants || 1,
          guestDetails: [],

          locationId: args.locationId || null,

          confirmationRequired,
          confirmedAt: confirmationRequired ? null : Date.now(),
          confirmedBy: confirmationRequired ? null : userId,

          paymentType: args.paymentType || "none",
          totalAmountCents: args.totalAmountCents || 0,
          depositAmountCents: 0,
          paidAmountCents: 0,
          transactionId: null,

          isRecurring: true,
          recurrenceSeriesId: seriesId,
          recurrenceIndex: i + 1,

          checkedInAt: null,
          checkedInBy: null,
          cancelledAt: null,
          cancelledBy: null,
          cancellationReason: null,
          refundAmountCents: 0,

          notes: args.notes || "",
          internalNotes: "",
          isAdminBooking: false,
          bookedViaEventId: null,
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Link to resources
      for (const resourceId of args.resourceIds) {
        await ctx.db.insert("objectLinks", {
          organizationId: args.organizationId,
          fromObjectId: bookingId,
          toObjectId: resourceId,
          linkType: "books_resource",
          createdBy: userId,
          createdAt: Date.now(),
        });
      }

      // Link to series
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: bookingId,
        toObjectId: seriesId,
        linkType: "recurring_instance_of",
        createdBy: userId,
        createdAt: Date.now(),
      });

      // Link to customer if provided
      if (args.customerId) {
        await ctx.db.insert("objectLinks", {
          organizationId: args.organizationId,
          fromObjectId: bookingId,
          toObjectId: args.customerId,
          linkType: "booked_by",
          createdBy: userId,
          createdAt: Date.now(),
        });
      }

      bookingIds.push(bookingId);
    }

    return { seriesId, bookingIds };
  },
});

// ============================================================================
// MUTATIONS - UPDATE BOOKING
// ============================================================================

/**
 * UPDATE BOOKING
 * Update booking details (reschedule, change customer info, etc.)
 */
export const updateBooking = mutation({
  args: {
    sessionId: v.string(),
    bookingId: v.id("objects"),

    // Time (optional - for rescheduling)
    startDateTime: v.optional(v.number()),
    endDateTime: v.optional(v.number()),
    timezone: v.optional(v.string()),

    // Customer
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    participants: v.optional(v.number()),
    guestDetails: v.optional(v.array(v.object({
      name: v.string(),
      email: v.optional(v.string()),
    }))),

    // Notes
    notes: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found");
    }

    const currentProps = booking.customProperties as Record<string, unknown>;
    const updatedProps: Record<string, unknown> = { ...currentProps };

    // Check for reschedule conflicts
    if (args.startDateTime !== undefined || args.endDateTime !== undefined) {
      const newStart = args.startDateTime ?? (currentProps.startDateTime as number);
      const newEnd = args.endDateTime ?? (currentProps.endDateTime as number);

      // Get linked resources
      const resourceLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_link_type", (q) =>
          q.eq("fromObjectId", args.bookingId).eq("linkType", "books_resource")
        )
        .collect();

      for (const link of resourceLinks) {
        const hasConflict = await ctx.runQuery(internal.availabilityOntology.checkConflict, {
          resourceId: link.toObjectId,
          startDateTime: newStart,
          endDateTime: newEnd,
          excludeBookingId: args.bookingId,
        });
        if (hasConflict) {
          const resource = await ctx.db.get(link.toObjectId);
          throw new Error(`Conflict detected for resource: ${resource?.name || link.toObjectId}`);
        }
      }

      updatedProps.startDateTime = newStart;
      updatedProps.endDateTime = newEnd;
      updatedProps.duration = Math.round((newEnd - newStart) / 60000);
    }

    // Update other fields
    if (args.timezone !== undefined) updatedProps.timezone = args.timezone;
    if (args.customerName !== undefined) updatedProps.customerName = args.customerName;
    if (args.customerEmail !== undefined) updatedProps.customerEmail = args.customerEmail;
    if (args.customerPhone !== undefined) updatedProps.customerPhone = args.customerPhone;
    if (args.participants !== undefined) updatedProps.participants = args.participants;
    if (args.guestDetails !== undefined) updatedProps.guestDetails = args.guestDetails;
    if (args.notes !== undefined) updatedProps.notes = args.notes;
    if (args.internalNotes !== undefined) updatedProps.internalNotes = args.internalNotes;

    await ctx.db.patch(args.bookingId, {
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });

    return { bookingId: args.bookingId };
  },
});

/**
 * CONFIRM BOOKING
 * Admin confirms a pending booking
 */
export const confirmBooking = mutation({
  args: {
    sessionId: v.string(),
    bookingId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found");
    }

    if (booking.status !== "pending_confirmation") {
      throw new Error("Booking is not pending confirmation");
    }

    const currentProps = booking.customProperties as Record<string, unknown>;

    await ctx.db.patch(args.bookingId, {
      status: "confirmed",
      customProperties: {
        ...currentProps,
        confirmedAt: Date.now(),
        confirmedBy: userId,
      },
      updatedAt: Date.now(),
    });

    // Trigger sequence enrollment for booking_confirmed
    await ctx.runMutation(internal.sequences.sequenceProcessor.processBookingTrigger, {
      bookingId: args.bookingId,
      triggerEvent: "booking_confirmed",
    });

    // Push confirmed booking to linked external calendars
    await ctx.scheduler.runAfter(0, internal.calendarSyncOntology.pushBookingToCalendar, {
      bookingId: args.bookingId,
      organizationId: booking.organizationId,
    });

    return { bookingId: args.bookingId, status: "confirmed" };
  },
});

/**
 * CHECK IN BOOKING
 * Mark customer as arrived/started
 */
export const checkInBooking = mutation({
  args: {
    sessionId: v.string(),
    bookingId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found");
    }

    if (booking.status !== "confirmed") {
      throw new Error("Booking must be confirmed before check-in");
    }

    const currentProps = booking.customProperties as Record<string, unknown>;

    await ctx.db.patch(args.bookingId, {
      status: "checked_in",
      customProperties: {
        ...currentProps,
        checkedInAt: Date.now(),
        checkedInBy: userId,
      },
      updatedAt: Date.now(),
    });

    // Trigger sequence enrollment for booking_checked_in
    await ctx.runMutation(internal.sequences.sequenceProcessor.processBookingTrigger, {
      bookingId: args.bookingId,
      triggerEvent: "booking_checked_in",
    });

    return { bookingId: args.bookingId, status: "checked_in" };
  },
});

/**
 * COMPLETE BOOKING
 * Mark booking as finished
 */
export const completeBooking = mutation({
  args: {
    sessionId: v.string(),
    bookingId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found");
    }

    if (booking.status !== "checked_in" && booking.status !== "confirmed") {
      throw new Error("Booking must be checked in or confirmed to complete");
    }

    await ctx.db.patch(args.bookingId, {
      status: "completed",
      updatedAt: Date.now(),
    });

    // Trigger sequence enrollment for booking_completed
    await ctx.runMutation(internal.sequences.sequenceProcessor.processBookingTrigger, {
      bookingId: args.bookingId,
      triggerEvent: "booking_completed",
    });

    return { bookingId: args.bookingId, status: "completed" };
  },
});

/**
 * CANCEL BOOKING
 * Cancel a booking with optional refund
 */
export const cancelBooking = mutation({
  args: {
    sessionId: v.string(),
    bookingId: v.id("objects"),
    reason: v.optional(v.string()),
    refundAmountCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found");
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      throw new Error("Cannot cancel a booking that is already cancelled or completed");
    }

    const currentProps = booking.customProperties as Record<string, unknown>;

    await ctx.db.patch(args.bookingId, {
      status: "cancelled",
      customProperties: {
        ...currentProps,
        cancelledAt: Date.now(),
        cancelledBy: userId,
        cancellationReason: args.reason || null,
        refundAmountCents: args.refundAmountCents || 0,
      },
      updatedAt: Date.now(),
    });

    // Handle booking cancellation - exit enrollments and cancel pending messages
    await ctx.runMutation(internal.sequences.sequenceProcessor.processBookingTrigger, {
      bookingId: args.bookingId,
      triggerEvent: "booking_cancelled",
    });

    // Delete cancelled booking from linked external calendars
    await ctx.scheduler.runAfter(0, internal.calendarSyncOntology.deleteBookingFromCalendar, {
      bookingId: args.bookingId,
      organizationId: booking.organizationId,
    });

    return { bookingId: args.bookingId, status: "cancelled" };
  },
});

/**
 * MARK NO SHOW
 * Mark booking as no-show
 */
export const markNoShow = mutation({
  args: {
    sessionId: v.string(),
    bookingId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found");
    }

    if (booking.status !== "confirmed") {
      throw new Error("Only confirmed bookings can be marked as no-show");
    }

    await ctx.db.patch(args.bookingId, {
      status: "no_show",
      updatedAt: Date.now(),
    });

    return { bookingId: args.bookingId, status: "no_show" };
  },
});

// ============================================================================
// INTERNAL QUERIES/MUTATIONS (for API endpoints)
// ============================================================================

/**
 * CREATE BOOKING INTERNAL
 * Internal mutation for API endpoint
 */
export const createBookingInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    subtype: v.string(),
    startDateTime: v.number(),
    endDateTime: v.number(),
    timezone: v.optional(v.string()),
    resourceIds: v.array(v.id("objects")),
    customerId: v.optional(v.id("objects")),
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.optional(v.string()),
    participants: v.optional(v.number()),
    guestDetails: v.optional(v.any()),
    locationId: v.optional(v.id("objects")),
    paymentType: v.optional(v.string()),
    totalAmountCents: v.optional(v.number()),
    depositAmountCents: v.optional(v.number()),
    confirmationRequired: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
    isAdminBooking: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Validate resources
    for (const resourceId of args.resourceIds) {
      const resource = await ctx.db.get(resourceId);
      if (!resource || resource.organizationId !== args.organizationId) {
        throw new Error(`Resource ${resourceId} not found`);
      }
    }

    // Check conflicts
    for (const resourceId of args.resourceIds) {
      const hasConflict = await ctx.runQuery(internal.availabilityOntology.checkConflict, {
        resourceId,
        startDateTime: args.startDateTime,
        endDateTime: args.endDateTime,
      });
      if (hasConflict) {
        throw new Error(`Conflict detected for resource ${resourceId}`);
      }
    }

    const confirmationRequired = args.confirmationRequired ?? false;
    const initialStatus = confirmationRequired ? "pending_confirmation" : "confirmed";
    const duration = Math.round((args.endDateTime - args.startDateTime) / 60000);

    const bookingId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "booking",
      subtype: args.subtype,
      name: `${args.subtype} - ${args.customerName}`,
      status: initialStatus,
      customProperties: {
        startDateTime: args.startDateTime,
        endDateTime: args.endDateTime,
        duration,
        timezone: args.timezone || "UTC",
        customerId: args.customerId || null,
        customerName: args.customerName,
        customerEmail: args.customerEmail,
        customerPhone: args.customerPhone || null,
        participants: args.participants || 1,
        guestDetails: args.guestDetails || [],
        locationId: args.locationId || null,
        confirmationRequired,
        confirmedAt: confirmationRequired ? null : Date.now(),
        confirmedBy: confirmationRequired ? null : args.userId,
        paymentType: args.paymentType || "none",
        totalAmountCents: args.totalAmountCents || 0,
        depositAmountCents: args.depositAmountCents || 0,
        paidAmountCents: 0,
        transactionId: null,
        isRecurring: false,
        recurrenceSeriesId: null,
        recurrenceIndex: null,
        checkedInAt: null,
        checkedInBy: null,
        cancelledAt: null,
        cancelledBy: null,
        cancellationReason: null,
        refundAmountCents: 0,
        notes: args.notes || "",
        internalNotes: args.internalNotes || "",
        isAdminBooking: args.isAdminBooking || false,
        bookedViaEventId: null,
      },
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link to resources
    for (const resourceId of args.resourceIds) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: bookingId,
        toObjectId: resourceId,
        linkType: "books_resource",
        createdBy: args.userId,
        createdAt: Date.now(),
      });
    }

    // Link to customer
    if (args.customerId) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: bookingId,
        toObjectId: args.customerId,
        linkType: "booked_by",
        createdBy: args.userId,
        createdAt: Date.now(),
      });
    }

    return { bookingId, status: initialStatus };
  },
});

/**
 * GET BOOKING INTERNAL
 * Internal query for API endpoint
 */
export const getBookingInternal = internalQuery({
  args: {
    bookingId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      return null;
    }
    if (booking.organizationId !== args.organizationId) {
      return null;
    }
    return booking;
  },
});

/**
 * LIST BOOKINGS INTERNAL
 * Internal query for API endpoint
 */
export const listBookingsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    subtype: v.optional(v.string()),
    resourceId: v.optional(v.id("objects")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let bookings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "booking")
      )
      .collect();

    // Apply filters
    if (args.status) {
      bookings = bookings.filter((b) => b.status === args.status);
    }
    if (args.subtype) {
      bookings = bookings.filter((b) => b.subtype === args.subtype);
    }
    if (args.startDate || args.endDate) {
      bookings = bookings.filter((b) => {
        const props = b.customProperties as Record<string, unknown>;
        const startDateTime = props.startDateTime as number;
        if (args.startDate && startDateTime < args.startDate) return false;
        if (args.endDate && startDateTime > args.endDate) return false;
        return true;
      });
    }

    // Sort by start date
    bookings.sort((a, b) => {
      const aProps = a.customProperties as Record<string, unknown>;
      const bProps = b.customProperties as Record<string, unknown>;
      return (bProps.startDateTime as number) - (aProps.startDateTime as number);
    });

    // Paginate
    const offset = args.offset || 0;
    const limit = args.limit || 50;

    return {
      bookings: bookings.slice(offset, offset + limit),
      total: bookings.length,
    };
  },
});

/**
 * UPDATE BOOKING STATUS INTERNAL
 * Internal mutation for API endpoint
 */
export const updateBookingStatusInternal = internalMutation({
  args: {
    bookingId: v.id("objects"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    status: v.string(),
    reason: v.optional(v.string()),
    refundAmountCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found");
    }
    if (booking.organizationId !== args.organizationId) {
      throw new Error("Booking not found");
    }

    const currentProps = booking.customProperties as Record<string, unknown>;
    const updatedProps: Record<string, unknown> = { ...currentProps };

    // Handle status-specific updates
    switch (args.status) {
      case "confirmed":
        updatedProps.confirmedAt = Date.now();
        updatedProps.confirmedBy = args.userId;
        break;
      case "checked_in":
        updatedProps.checkedInAt = Date.now();
        updatedProps.checkedInBy = args.userId;
        break;
      case "cancelled":
        updatedProps.cancelledAt = Date.now();
        updatedProps.cancelledBy = args.userId;
        updatedProps.cancellationReason = args.reason || null;
        updatedProps.refundAmountCents = args.refundAmountCents || 0;
        break;
    }

    await ctx.db.patch(args.bookingId, {
      status: args.status,
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });

    return { bookingId: args.bookingId, status: args.status };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate occurrence dates for recurring bookings
 */
function generateOccurrences(
  startDateTime: number,
  endDateTime: number,
  frequency: "weekly" | "biweekly" | "monthly",
  count: number
): Array<{ start: number; end: number }> {
  const occurrences: Array<{ start: number; end: number }> = [];
  const duration = endDateTime - startDateTime;

  for (let i = 0; i < count; i++) {
    let offsetMs: number;

    switch (frequency) {
      case "weekly":
        offsetMs = i * 7 * 24 * 60 * 60 * 1000;
        break;
      case "biweekly":
        offsetMs = i * 14 * 24 * 60 * 60 * 1000;
        break;
      case "monthly":
        // For monthly, we add months to the date
        const startDate = new Date(startDateTime);
        startDate.setUTCMonth(startDate.getUTCMonth() + i);
        offsetMs = startDate.getTime() - startDateTime;
        break;
      default:
        offsetMs = i * 7 * 24 * 60 * 60 * 1000;
    }

    occurrences.push({
      start: startDateTime + offsetMs,
      end: startDateTime + offsetMs + duration,
    });
  }

  return occurrences;
}

/**
 * Format timestamp to date string
 */
function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toISOString().split("T")[0];
}

// ============================================================================
// PHASE 4: PAYMENT INTEGRATION
// ============================================================================
// Added: 2026-01
// Purpose: Integrate booking payments with transaction system

/**
 * Helper type for payment result
 */
interface BookingPaymentResult {
  transactionId: Id<"objects">;
  bookingId: Id<"objects">;
  paidAmountCents: number;
  remainingBalanceCents: number;
  isFullyPaid: boolean;
}

/**
 * PROCESS BOOKING PAYMENT (INTERNAL)
 *
 * Creates a transaction for a booking payment (deposit, full, or balance).
 * Updates the booking's paidAmountCents.
 *
 * Payment Flow:
 * 1. Validate booking and payment type
 * 2. Determine transaction subtype (deposit, full, balance)
 * 3. Create transaction record
 * 4. Update booking payment status
 * 5. Return transaction ID
 */
export const processBookingPaymentInternal = internalMutation({
  args: {
    bookingId: v.id("objects"),
    organizationId: v.id("organizations"),

    // Payment details
    paymentType: v.union(
      v.literal("deposit"),
      v.literal("full"),
      v.literal("balance")
    ),
    amountInCents: v.number(),
    currency: v.optional(v.string()),

    // Payment method info
    paymentMethod: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),

    // Tax
    taxRatePercent: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<BookingPaymentResult> => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found");
    }
    if (booking.organizationId !== args.organizationId) {
      throw new Error("Booking not found");
    }

    const props = booking.customProperties as Record<string, unknown>;
    const totalAmountCents = (props.totalAmountCents as number) || 0;
    const depositAmountCents = (props.depositAmountCents as number) || 0;
    const currentPaidCents = (props.paidAmountCents as number) || 0;

    // Validate payment amount
    if (args.paymentType === "deposit" && args.amountInCents !== depositAmountCents) {
      console.warn(`Deposit amount mismatch: expected ${depositAmountCents}, got ${args.amountInCents}`);
    }
    if (args.paymentType === "full" && args.amountInCents !== totalAmountCents) {
      console.warn(`Full payment amount mismatch: expected ${totalAmountCents}, got ${args.amountInCents}`);
    }
    if (args.paymentType === "balance") {
      const expectedBalance = totalAmountCents - currentPaidCents;
      if (args.amountInCents !== expectedBalance) {
        console.warn(`Balance amount mismatch: expected ${expectedBalance}, got ${args.amountInCents}`);
      }
    }

    // Get resource info
    const resourceLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.bookingId).eq("linkType", "books_resource")
      )
      .first();

    let resourceName = "Resource";
    let resourceId: Id<"objects"> | undefined;
    let resourceSubtype: string | undefined;

    if (resourceLinks) {
      const resource = await ctx.db.get(resourceLinks.toObjectId);
      if (resource) {
        resourceName = resource.name || "Resource";
        resourceId = resource._id;
        resourceSubtype = resource.subtype || undefined;
      }
    }

    if (!resourceId) {
      throw new Error("Booking has no linked resource");
    }

    // Get location info
    let locationName: string | undefined;
    if (props.locationId) {
      const location = await ctx.db.get(props.locationId as Id<"objects">);
      if (location) {
        locationName = location.name || undefined;
      }
    }

    // Determine transaction subtype
    const transactionSubtype = args.paymentType === "deposit"
      ? "booking_deposit"
      : args.paymentType === "balance"
        ? "booking_balance"
        : "resource_booking";

    // Create the transaction
    const transactionId: Id<"objects"> = await ctx.runMutation(
      internal.transactionOntology.createBookingTransactionInternal,
      {
        organizationId: args.organizationId,
        bookingId: args.bookingId,
        subtype: transactionSubtype as "resource_booking" | "booking_deposit" | "booking_balance" | "booking_refund",
        resourceId,
        resourceName,
        resourceSubtype,
        bookingSubtype: booking.subtype || "appointment",
        startDateTime: props.startDateTime as number,
        endDateTime: props.endDateTime as number,
        duration: props.duration as number,
        locationId: props.locationId as Id<"objects"> | undefined,
        locationName,
        customerName: props.customerName as string,
        customerEmail: props.customerEmail as string,
        customerPhone: props.customerPhone as string | undefined,
        customerId: props.customerId as Id<"objects"> | undefined,
        amountInCents: args.amountInCents,
        currency: args.currency || "EUR",
        taxRatePercent: args.taxRatePercent,
        paymentMethod: args.paymentMethod,
        paymentStatus: "paid",
        paymentIntentId: args.paymentIntentId,
      }
    );

    // Update booking's paid amount
    const newPaidCents = currentPaidCents + args.amountInCents;
    await ctx.db.patch(args.bookingId, {
      customProperties: {
        ...props,
        paidAmountCents: newPaidCents,
        transactionId, // Latest transaction ID
      },
      updatedAt: Date.now(),
    });

    console.log(`💳 [processBookingPaymentInternal] Processed ${args.paymentType} payment of €${(args.amountInCents / 100).toFixed(2)} for booking ${args.bookingId}`);

    return {
      transactionId,
      bookingId: args.bookingId,
      paidAmountCents: newPaidCents,
      remainingBalanceCents: Math.max(0, totalAmountCents - newPaidCents),
      isFullyPaid: newPaidCents >= totalAmountCents,
    };
  },
});

/**
 * RECORD BOOKING PAYMENT
 *
 * Public mutation for recording a payment on a booking.
 * Used by admin UI to manually record payments.
 */
export const recordBookingPayment = mutation({
  args: {
    sessionId: v.string(),
    bookingId: v.id("objects"),

    // Payment details
    paymentType: v.union(
      v.literal("deposit"),
      v.literal("full"),
      v.literal("balance"),
      v.literal("partial")
    ),
    amountInCents: v.number(),

    // Payment method
    paymentMethod: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),

    // Notes
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<BookingPaymentResult> => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found");
    }

    const props = booking.customProperties as Record<string, unknown>;

    // Handle partial payments differently - they don't map to a specific transaction type
    const paymentType = args.paymentType === "partial" ? "balance" : args.paymentType;

    const result: BookingPaymentResult = await ctx.runMutation(internal.bookingOntology.processBookingPaymentInternal, {
      bookingId: args.bookingId,
      organizationId: booking.organizationId,
      paymentType: paymentType as "deposit" | "full" | "balance",
      amountInCents: args.amountInCents,
      paymentMethod: args.paymentMethod || "manual",
      paymentIntentId: args.paymentIntentId,
    });

    // Add notes if provided
    if (args.notes) {
      const currentNotes = (props.internalNotes as string) || "";
      const paymentNote = `[${new Date().toISOString()}] Payment recorded: €${(args.amountInCents / 100).toFixed(2)} (${args.paymentType})${args.notes ? ` - ${args.notes}` : ""}`;
      await ctx.db.patch(args.bookingId, {
        customProperties: {
          ...props,
          paidAmountCents: result.paidAmountCents,
          transactionId: result.transactionId,
          internalNotes: currentNotes ? `${currentNotes}\n${paymentNote}` : paymentNote,
        },
        updatedAt: Date.now(),
      });
    }

    return result;
  },
});

/**
 * Helper type for cancellation result
 */
interface BookingCancellationResult {
  bookingId: Id<"objects">;
  status: "cancelled";
  refundAmountCents: number;
  refundTransactionId: Id<"objects"> | undefined;
}

/**
 * PROCESS BOOKING CANCELLATION WITH REFUND
 *
 * Internal mutation that handles cancellation with optional refund.
 * Called by cancelBooking when refund is requested.
 */
export const processBookingCancellationWithRefund = internalMutation({
  args: {
    bookingId: v.id("objects"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    reason: v.optional(v.string()),
    refundAmountCents: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<BookingCancellationResult> => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found");
    }

    const props = booking.customProperties as Record<string, unknown>;
    const paidAmountCents = (props.paidAmountCents as number) || 0;
    const refundAmountCents = args.refundAmountCents || 0;

    // Validate refund amount
    if (refundAmountCents > paidAmountCents) {
      throw new Error(`Cannot refund €${(refundAmountCents / 100).toFixed(2)} - only €${(paidAmountCents / 100).toFixed(2)} has been paid`);
    }

    // Create refund transaction if amount > 0
    let refundTransactionId: Id<"objects"> | undefined;
    if (refundAmountCents > 0) {
      refundTransactionId = await ctx.runMutation(
        internal.transactionOntology.processBookingRefundInternal,
        {
          organizationId: args.organizationId,
          bookingId: args.bookingId,
          refundAmountCents,
          reason: args.reason,
        }
      );
    }

    // Update booking status to cancelled
    await ctx.db.patch(args.bookingId, {
      status: "cancelled",
      customProperties: {
        ...props,
        cancelledAt: Date.now(),
        cancelledBy: args.userId,
        cancellationReason: args.reason || null,
        refundAmountCents,
        refundTransactionId,
      },
      updatedAt: Date.now(),
    });

    console.log(`❌ [processBookingCancellationWithRefund] Cancelled booking ${args.bookingId} with refund of €${(refundAmountCents / 100).toFixed(2)}`);

    return {
      bookingId: args.bookingId,
      status: "cancelled",
      refundAmountCents,
      refundTransactionId,
    };
  },
});

/**
 * Helper type for balance collection result
 */
interface BalanceCollectionResult {
  bookingId: Id<"objects">;
  balanceCollected: boolean;
  remainingBalanceCents?: number;
  balanceAmountCents?: number;
  transactionId?: Id<"objects">;
  isFullyPaid?: boolean;
}

/**
 * PROCESS BALANCE PAYMENT ON CHECK-IN
 *
 * Internal mutation that collects remaining balance when customer checks in.
 * Used when paymentType is "deposit" and balance is due on arrival.
 */
export const processBalanceOnCheckIn = internalMutation({
  args: {
    bookingId: v.id("objects"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    paymentMethod: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<BalanceCollectionResult> => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found");
    }

    const props = booking.customProperties as Record<string, unknown>;
    const totalAmountCents = (props.totalAmountCents as number) || 0;
    const paidAmountCents = (props.paidAmountCents as number) || 0;
    const remainingBalanceCents = totalAmountCents - paidAmountCents;

    if (remainingBalanceCents <= 0) {
      // Already fully paid - just proceed with check-in
      return {
        bookingId: args.bookingId,
        balanceCollected: false,
        remainingBalanceCents: 0,
      };
    }

    // Process the balance payment
    const result: BookingPaymentResult = await ctx.runMutation(internal.bookingOntology.processBookingPaymentInternal, {
      bookingId: args.bookingId,
      organizationId: args.organizationId,
      paymentType: "balance",
      amountInCents: remainingBalanceCents,
      paymentMethod: args.paymentMethod || "on_arrival",
      paymentIntentId: args.paymentIntentId,
    });

    console.log(`💳 [processBalanceOnCheckIn] Collected balance of €${(remainingBalanceCents / 100).toFixed(2)} for booking ${args.bookingId}`);

    return {
      bookingId: args.bookingId,
      balanceCollected: true,
      balanceAmountCents: remainingBalanceCents,
      transactionId: result.transactionId,
      isFullyPaid: result.isFullyPaid,
    };
  },
});

/**
 * Helper type for check-in result
 */
interface CheckInResult {
  bookingId: Id<"objects">;
  status: "checked_in";
  balanceCollected: boolean;
  balanceAmountCents: number;
}

/**
 * CHECK IN WITH PAYMENT
 *
 * Enhanced check-in mutation that optionally collects balance payment.
 */
export const checkInWithPayment = mutation({
  args: {
    sessionId: v.string(),
    bookingId: v.id("objects"),

    // Payment options
    collectBalance: v.optional(v.boolean()),
    paymentMethod: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CheckInResult> => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found");
    }

    if (booking.status !== "confirmed") {
      throw new Error("Booking must be confirmed before check-in");
    }

    const props = booking.customProperties as Record<string, unknown>;
    let balanceResult = null;

    // Collect balance if requested
    if (args.collectBalance) {
      balanceResult = await ctx.runMutation(internal.bookingOntology.processBalanceOnCheckIn, {
        bookingId: args.bookingId,
        organizationId: booking.organizationId,
        userId,
        paymentMethod: args.paymentMethod,
        paymentIntentId: args.paymentIntentId,
      });
    }

    // Update booking status to checked_in
    await ctx.db.patch(args.bookingId, {
      status: "checked_in",
      customProperties: {
        ...props,
        checkedInAt: Date.now(),
        checkedInBy: userId,
        ...(balanceResult?.transactionId && { transactionId: balanceResult.transactionId }),
        ...(balanceResult?.balanceAmountCents && {
          paidAmountCents: (props.paidAmountCents as number || 0) + balanceResult.balanceAmountCents,
        }),
      },
      updatedAt: Date.now(),
    });

    return {
      bookingId: args.bookingId,
      status: "checked_in",
      balanceCollected: balanceResult?.balanceCollected || false,
      balanceAmountCents: balanceResult?.balanceAmountCents || 0,
    };
  },
});

/**
 * CANCEL WITH REFUND
 *
 * Enhanced cancellation mutation with refund support.
 */
export const cancelWithRefund = mutation({
  args: {
    sessionId: v.string(),
    bookingId: v.id("objects"),
    reason: v.optional(v.string()),
    refundAmountCents: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<BookingCancellationResult> => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.type !== "booking") {
      throw new Error("Booking not found");
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      throw new Error("Cannot cancel a booking that is already cancelled or completed");
    }

    const result: BookingCancellationResult = await ctx.runMutation(internal.bookingOntology.processBookingCancellationWithRefund, {
      bookingId: args.bookingId,
      organizationId: booking.organizationId,
      userId,
      reason: args.reason,
      refundAmountCents: args.refundAmountCents,
    });

    return result;
  },
});
