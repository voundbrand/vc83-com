/**
 * AVAILABILITY ONTOLOGY
 *
 * Manages availability schedules for bookable resources.
 * Uses the universal ontology system (objects table).
 *
 * Availability Types (subtype):
 * - "schedule" - Weekly recurring hours (e.g., Mon 9-5, Tue 10-6)
 * - "exception" - Single date override (e.g., closed Dec 25, open late Dec 24)
 * - "block" - Date range unavailable (e.g., maintenance Jan 1-15)
 *
 * Status Workflow:
 * - "active" - Currently in effect
 * - "inactive" - Temporarily disabled
 * - "archived" - No longer in use
 *
 * Key Features:
 * - On-demand slot calculation (no pre-computed slots)
 * - Buffer time support (configurable per resource)
 * - Timezone-aware scheduling
 * - Exception dates override weekly schedules
 * - Blocks take precedence over everything
 */

import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./rbacHelpers";

// ============================================================================
// TYPES AND VALIDATORS
// ============================================================================

interface TimeSlot {
  resourceId: Id<"objects">;
  date: string;           // "2024-01-15"
  startTime: string;      // "09:00"
  endTime: string;        // "10:00"
  startDateTime: number;  // Unix timestamp
  endDateTime: number;    // Unix timestamp
  isAvailable: boolean;
}

interface WeeklyScheduleEntry {
  dayOfWeek: number;     // 0=Sunday, 6=Saturday
  startTime: string;     // "09:00"
  endTime: string;       // "17:00"
  isAvailable: boolean;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET RESOURCE AVAILABILITY
 * Returns all availability records for a resource (schedules, exceptions, blocks)
 */
export const getResourceAvailability = query({
  args: {
    sessionId: v.string(),
    resourceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all availability records linked to this resource
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.resourceId).eq("linkType", "has_availability")
      )
      .collect();

    const availabilityIds = links.map((l) => l.toObjectId);

    // Fetch all availability objects
    const availabilityRecords = await Promise.all(
      availabilityIds.map((id) => ctx.db.get(id))
    );

    // Group by subtype
    const schedules: typeof availabilityRecords = [];
    const exceptions: typeof availabilityRecords = [];
    const blocks: typeof availabilityRecords = [];

    for (const record of availabilityRecords) {
      if (!record || record.type !== "availability") continue;

      switch (record.subtype) {
        case "schedule":
          schedules.push(record);
          break;
        case "exception":
          exceptions.push(record);
          break;
        case "block":
          blocks.push(record);
          break;
      }
    }

    return { schedules, exceptions, blocks };
  },
});

/**
 * GET AVAILABLE SLOTS
 * Calculate available time slots for a resource within a date range
 * This is the core on-demand slot calculation
 */
export const getAvailableSlots = query({
  args: {
    sessionId: v.string(),
    resourceId: v.id("objects"),
    startDate: v.number(),        // Unix timestamp (start of range)
    endDate: v.number(),          // Unix timestamp (end of range)
    duration: v.optional(v.number()),   // Override slot duration (minutes)
    timezone: v.optional(v.string()),   // Override timezone
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // 1. Get the resource
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.type !== "product") {
      throw new Error("Resource not found");
    }

    const resourceProps = resource.customProperties as Record<string, unknown> | undefined;

    // 2. Get resource booking configuration
    const slotDuration = args.duration || (resourceProps?.minDuration as number) || 60;
    const slotIncrement = (resourceProps?.slotIncrement as number) || slotDuration;
    const bufferBefore = (resourceProps?.bufferBefore as number) || 0;
    const bufferAfter = (resourceProps?.bufferAfter as number) || 0;
    const timezone = args.timezone || (resourceProps?.timezone as string) || "UTC";

    // 3. Get availability records
    const { schedules, exceptions, blocks } = await getAvailabilityData(
      ctx,
      args.resourceId,
      args.startDate,
      args.endDate
    );

    // 4. Get existing bookings in the date range (with buffer consideration)
    const bookings = await getBookingsInRange(
      ctx,
      args.resourceId,
      args.startDate - bufferBefore * 60000,
      args.endDate + bufferAfter * 60000
    );

    // 5. Generate slots
    const slots: TimeSlot[] = [];
    const DAY_MS = 24 * 60 * 60 * 1000;

    // Iterate through each day in the range
    for (let dayTs = startOfDay(args.startDate); dayTs <= args.endDate; dayTs += DAY_MS) {
      // Check if day is blocked
      if (isDateBlocked(dayTs, blocks)) continue;

      // Get the day of week (0=Sunday)
      const dayOfWeek = new Date(dayTs).getUTCDay();

      // Get schedule for this day (check exceptions first)
      const schedule = getScheduleForDay(dayTs, dayOfWeek, schedules, exceptions);
      if (!schedule || !schedule.isAvailable) continue;

      // Parse schedule times
      const dayStart = parseTimeToTimestamp(schedule.startTime, dayTs);
      const dayEnd = parseTimeToTimestamp(schedule.endTime, dayTs);

      // Generate slots for this day
      for (let slotStart = dayStart; slotStart + slotDuration * 60000 <= dayEnd; slotStart += slotIncrement * 60000) {
        const slotEnd = slotStart + slotDuration * 60000;

        // Check for conflicts (including buffer zones)
        const effectiveStart = slotStart - bufferBefore * 60000;
        const effectiveEnd = slotEnd + bufferAfter * 60000;

        const hasConflict = bookings.some((booking) => {
          const bookingProps = booking.customProperties as Record<string, unknown>;
          const bookingStart = bookingProps.startDateTime as number;
          const bookingEnd = bookingProps.endDateTime as number;
          const bookingStatus = booking.status;

          // Skip cancelled bookings
          if (bookingStatus === "cancelled") return false;

          // Check overlap
          return bookingStart < effectiveEnd && bookingEnd > effectiveStart;
        });

        if (!hasConflict) {
          slots.push({
            resourceId: args.resourceId,
            date: formatDate(dayTs),
            startTime: formatTime(slotStart),
            endTime: formatTime(slotEnd),
            startDateTime: slotStart,
            endDateTime: slotEnd,
            isAvailable: true,
          });
        }
      }
    }

    return slots;
  },
});

/**
 * CHECK CONFLICT
 * Check if a time slot conflicts with existing bookings
 */
export const checkConflict = internalQuery({
  args: {
    resourceId: v.id("objects"),
    startDateTime: v.number(),
    endDateTime: v.number(),
    excludeBookingId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    // Get resource for buffer times
    const resource = await ctx.db.get(args.resourceId);
    if (!resource) return false;

    const resourceProps = resource.customProperties as Record<string, unknown> | undefined;
    const bufferBefore = (resourceProps?.bufferBefore as number) || 0;
    const bufferAfter = (resourceProps?.bufferAfter as number) || 0;

    // Calculate effective time range with buffers
    const effectiveStart = args.startDateTime - bufferBefore * 60000;
    const effectiveEnd = args.endDateTime + bufferAfter * 60000;

    // Get bookings that might overlap
    const bookings = await getBookingsInRange(
      ctx,
      args.resourceId,
      effectiveStart,
      effectiveEnd
    );

    // Check for conflicts
    for (const booking of bookings) {
      // Skip the booking being updated (if provided)
      if (args.excludeBookingId && booking._id === args.excludeBookingId) continue;

      // Skip cancelled bookings
      if (booking.status === "cancelled") continue;

      const bookingProps = booking.customProperties as Record<string, unknown>;
      const bookingStart = bookingProps.startDateTime as number;
      const bookingEnd = bookingProps.endDateTime as number;

      // Check overlap
      if (bookingStart < effectiveEnd && bookingEnd > effectiveStart) {
        return true; // Conflict found
      }
    }

    return false; // No conflict
  },
});

// ============================================================================
// MUTATIONS - WEEKLY SCHEDULE
// ============================================================================

/**
 * SET WEEKLY SCHEDULE
 * Set the weekly recurring schedule for a resource
 * Replaces any existing schedule entries
 */
export const setWeeklySchedule = mutation({
  args: {
    sessionId: v.string(),
    resourceId: v.id("objects"),
    schedules: v.array(
      v.object({
        dayOfWeek: v.number(),     // 0=Sunday, 6=Saturday
        startTime: v.string(),     // "09:00"
        endTime: v.string(),       // "17:00"
        isAvailable: v.boolean(),
      })
    ),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Validate resource exists
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.type !== "product") {
      throw new Error("Resource not found");
    }

    // Validate day of week values
    for (const schedule of args.schedules) {
      if (schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
        throw new Error("Invalid day of week. Must be 0-6 (Sunday-Saturday)");
      }
      if (!isValidTime(schedule.startTime) || !isValidTime(schedule.endTime)) {
        throw new Error("Invalid time format. Use HH:MM (24-hour format)");
      }
    }

    // Delete existing schedule entries
    const existingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.resourceId).eq("linkType", "has_availability")
      )
      .collect();

    for (const link of existingLinks) {
      const availability = await ctx.db.get(link.toObjectId);
      if (availability && availability.subtype === "schedule") {
        await ctx.db.delete(link._id);
        await ctx.db.delete(link.toObjectId);
      }
    }

    // Create new schedule entries
    const createdIds: Id<"objects">[] = [];

    for (const schedule of args.schedules) {
      const availabilityId = await ctx.db.insert("objects", {
        organizationId: resource.organizationId,
        type: "availability",
        subtype: "schedule",
        name: `${getDayName(schedule.dayOfWeek)} Schedule`,
        status: "active",
        customProperties: {
          resourceId: args.resourceId,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isAvailable: schedule.isAvailable,
          timezone: args.timezone,
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Link to resource
      await ctx.db.insert("objectLinks", {
        organizationId: resource.organizationId,
        fromObjectId: args.resourceId,
        toObjectId: availabilityId,
        linkType: "has_availability",
        createdBy: userId,
        createdAt: Date.now(),
      });

      createdIds.push(availabilityId);
    }

    return { scheduleIds: createdIds };
  },
});

// ============================================================================
// MUTATIONS - EXCEPTIONS
// ============================================================================

/**
 * CREATE EXCEPTION
 * Create a single-date exception to the weekly schedule
 */
export const createException = mutation({
  args: {
    sessionId: v.string(),
    resourceId: v.id("objects"),
    date: v.number(),             // Unix timestamp (day)
    isAvailable: v.boolean(),
    customHours: v.optional(
      v.object({
        startTime: v.string(),
        endTime: v.string(),
      })
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Validate resource exists
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.type !== "product") {
      throw new Error("Resource not found");
    }

    // Validate custom hours if provided
    if (args.customHours) {
      if (!isValidTime(args.customHours.startTime) || !isValidTime(args.customHours.endTime)) {
        throw new Error("Invalid time format. Use HH:MM (24-hour format)");
      }
    }

    // Check for existing exception on this date
    const existingExceptions = await findExceptionsForDate(ctx, args.resourceId, args.date);
    for (const existing of existingExceptions) {
      // Delete existing exception for same date
      const links = await ctx.db
        .query("objectLinks")
        .withIndex("by_to_link_type", (q) =>
          q.eq("toObjectId", existing._id).eq("linkType", "has_availability")
        )
        .collect();

      for (const link of links) {
        await ctx.db.delete(link._id);
      }
      await ctx.db.delete(existing._id);
    }

    // Create exception
    const exceptionId = await ctx.db.insert("objects", {
      organizationId: resource.organizationId,
      type: "availability",
      subtype: "exception",
      name: `Exception: ${formatDate(args.date)}`,
      status: "active",
      customProperties: {
        resourceId: args.resourceId,
        date: args.date,
        isAvailable: args.isAvailable,
        customHours: args.customHours || null,
        reason: args.reason || null,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link to resource
    await ctx.db.insert("objectLinks", {
      organizationId: resource.organizationId,
      fromObjectId: args.resourceId,
      toObjectId: exceptionId,
      linkType: "has_availability",
      createdBy: userId,
      createdAt: Date.now(),
    });

    return { exceptionId };
  },
});

/**
 * DELETE EXCEPTION
 * Remove an exception date
 */
export const deleteException = mutation({
  args: {
    sessionId: v.string(),
    exceptionId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const exception = await ctx.db.get(args.exceptionId);
    if (!exception || exception.type !== "availability" || exception.subtype !== "exception") {
      throw new Error("Exception not found");
    }

    // Delete links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.exceptionId).eq("linkType", "has_availability")
      )
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.exceptionId);

    return { success: true };
  },
});

// ============================================================================
// MUTATIONS - BLOCKS
// ============================================================================

/**
 * CREATE BLOCK
 * Create a date range block (unavailable period)
 */
export const createBlock = mutation({
  args: {
    sessionId: v.string(),
    resourceId: v.id("objects"),
    startDate: v.number(),        // Unix timestamp (start)
    endDate: v.number(),          // Unix timestamp (end)
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Validate resource exists
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.type !== "product") {
      throw new Error("Resource not found");
    }

    // Validate dates
    if (args.endDate <= args.startDate) {
      throw new Error("End date must be after start date");
    }

    // Create block
    const blockId = await ctx.db.insert("objects", {
      organizationId: resource.organizationId,
      type: "availability",
      subtype: "block",
      name: `Block: ${args.reason}`,
      status: "active",
      customProperties: {
        resourceId: args.resourceId,
        startDate: args.startDate,
        endDate: args.endDate,
        reason: args.reason,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link to resource
    await ctx.db.insert("objectLinks", {
      organizationId: resource.organizationId,
      fromObjectId: args.resourceId,
      toObjectId: blockId,
      linkType: "has_availability",
      createdBy: userId,
      createdAt: Date.now(),
    });

    return { blockId };
  },
});

/**
 * UPDATE BLOCK
 * Update a date range block
 */
export const updateBlock = mutation({
  args: {
    sessionId: v.string(),
    blockId: v.id("objects"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const block = await ctx.db.get(args.blockId);
    if (!block || block.type !== "availability" || block.subtype !== "block") {
      throw new Error("Block not found");
    }

    const currentProps = block.customProperties as Record<string, unknown>;
    const updatedProps: Record<string, unknown> = { ...currentProps };

    if (args.startDate !== undefined) updatedProps.startDate = args.startDate;
    if (args.endDate !== undefined) updatedProps.endDate = args.endDate;
    if (args.reason !== undefined) updatedProps.reason = args.reason;

    // Validate dates
    const startDate = (updatedProps.startDate as number) || 0;
    const endDate = (updatedProps.endDate as number) || 0;
    if (endDate <= startDate) {
      throw new Error("End date must be after start date");
    }

    await ctx.db.patch(args.blockId, {
      name: `Block: ${updatedProps.reason}`,
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });

    return { blockId: args.blockId };
  },
});

/**
 * DELETE BLOCK
 * Remove a date range block
 */
export const deleteBlock = mutation({
  args: {
    sessionId: v.string(),
    blockId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const block = await ctx.db.get(args.blockId);
    if (!block || block.type !== "availability" || block.subtype !== "block") {
      throw new Error("Block not found");
    }

    // Delete links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.blockId).eq("linkType", "has_availability")
      )
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.blockId);

    return { success: true };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get availability data for a resource
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAvailabilityData(
  ctx: any,
  resourceId: Id<"objects">,
  startDate: number,
  endDate: number
) {
  // Get all availability links
  const links = await ctx.db
    .query("objectLinks")
    .withIndex("by_from_link_type", (q: any) =>
      q.eq("fromObjectId", resourceId).eq("linkType", "has_availability")
    )
    .collect();

  const schedules: Array<{ customProperties: unknown; status?: string }> = [];
  const exceptions: Array<{ customProperties: unknown; status?: string }> = [];
  const blocks: Array<{ customProperties: unknown; status?: string }> = [];

  for (const link of links) {
    const availability = await ctx.db.get(link.toObjectId);
    if (!availability || availability.type !== "availability") continue;
    if (availability.status !== "active") continue;

    const props = availability.customProperties as Record<string, unknown>;

    switch (availability.subtype) {
      case "schedule":
        schedules.push(availability);
        break;
      case "exception": {
        const exceptionDate = props.date as number;
        if (exceptionDate >= startDate && exceptionDate <= endDate) {
          exceptions.push(availability);
        }
        break;
      }
      case "block": {
        const blockStart = props.startDate as number;
        const blockEnd = props.endDate as number;
        // Check if block overlaps with date range
        if (blockStart <= endDate && blockEnd >= startDate) {
          blocks.push(availability);
        }
        break;
      }
    }
  }

  return { schedules, exceptions, blocks };
}

/**
 * Get bookings for a resource in a date range
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getBookingsInRange(
  ctx: any,
  resourceId: Id<"objects">,
  startDate: number,
  endDate: number
) {
  // Find all bookings linked to this resource
  const links = await ctx.db
    .query("objectLinks")
    .withIndex("by_to_link_type", (q: any) =>
      q.eq("toObjectId", resourceId).eq("linkType", "books_resource")
    )
    .collect();

  const bookings: Array<{ _id: Id<"objects">; status?: string; customProperties?: unknown }> = [];

  for (const link of links) {
    const booking = await ctx.db.get(link.toObjectId);
    if (!booking || booking.type !== "booking") continue;

    const bookingProps = booking.customProperties as Record<string, unknown>;
    const bookingStart = bookingProps.startDateTime as number;
    const bookingEnd = bookingProps.endDateTime as number;

    // Check if booking overlaps with date range
    if (bookingStart < endDate && bookingEnd > startDate) {
      bookings.push(booking);
    }
  }

  return bookings;
}

/**
 * Check if a date is blocked
 */
function isDateBlocked(
  dateTs: number,
  blocks: Array<{ customProperties?: unknown }>
): boolean {
  for (const block of blocks) {
    const props = block.customProperties as Record<string, unknown>;
    const blockStart = props.startDate as number;
    const blockEnd = props.endDate as number;

    if (dateTs >= blockStart && dateTs <= blockEnd) {
      return true;
    }
  }
  return false;
}

/**
 * Get schedule for a specific day, checking exceptions first
 */
function getScheduleForDay(
  dateTs: number,
  dayOfWeek: number,
  schedules: Array<{ customProperties?: unknown }>,
  exceptions: Array<{ customProperties?: unknown }>
): { startTime: string; endTime: string; isAvailable: boolean } | null {
  // Check for exception first
  for (const exception of exceptions) {
    const props = exception.customProperties as Record<string, unknown>;
    const exceptionDate = props.date as number;

    // Check if same day (compare dates without time)
    if (isSameDay(dateTs, exceptionDate)) {
      if (!props.isAvailable) {
        return null; // Day is unavailable
      }
      if (props.customHours) {
        const hours = props.customHours as { startTime: string; endTime: string };
        return {
          startTime: hours.startTime,
          endTime: hours.endTime,
          isAvailable: true,
        };
      }
    }
  }

  // Fall back to weekly schedule
  for (const schedule of schedules) {
    const props = schedule.customProperties as Record<string, unknown>;
    if (props.dayOfWeek === dayOfWeek) {
      return {
        startTime: props.startTime as string,
        endTime: props.endTime as string,
        isAvailable: props.isAvailable as boolean,
      };
    }
  }

  return null; // No schedule for this day
}

/**
 * Find exceptions for a specific date
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findExceptionsForDate(
  ctx: any,
  resourceId: Id<"objects">,
  date: number
) {
  const links = await ctx.db
    .query("objectLinks")
    .withIndex("by_from_link_type", (q: any) =>
      q.eq("fromObjectId", resourceId).eq("linkType", "has_availability")
    )
    .collect();

  const exceptions: Array<{ _id: Id<"objects"> }> = [];

  for (const link of links) {
    const availability = await ctx.db.get(link.toObjectId);
    if (!availability || availability.type !== "availability" || availability.subtype !== "exception") {
      continue;
    }

    const props = availability.customProperties as Record<string, unknown>;
    if (isSameDay(date, props.date as number)) {
      exceptions.push(availability);
    }
  }

  return exceptions;
}

/**
 * Check if two timestamps are on the same day
 */
function isSameDay(ts1: number, ts2: number): boolean {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

/**
 * Get start of day timestamp
 */
function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Parse time string to timestamp for a given day
 */
function parseTimeToTimestamp(time: string, dayTs: number): number {
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date(dayTs);
  d.setUTCHours(hours, minutes, 0, 0);
  return d.getTime();
}

/**
 * Format timestamp to date string
 */
function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toISOString().split("T")[0];
}

/**
 * Format timestamp to time string
 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const hours = d.getUTCHours().toString().padStart(2, "0");
  const minutes = d.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Validate time format (HH:MM)
 */
function isValidTime(time: string): boolean {
  const regex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return regex.test(time);
}

/**
 * Get day name from day of week number
 */
function getDayName(dayOfWeek: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dayOfWeek] || "Unknown";
}

// ============================================================================
// INTERNAL QUERIES/MUTATIONS (for API endpoints)
// ============================================================================

/**
 * GET AVAILABLE SLOTS INTERNAL
 * Internal query for getting slots without session auth
 */
export const getAvailableSlotsInternal = internalQuery({
  args: {
    resourceId: v.id("objects"),
    organizationId: v.id("organizations"),
    startDate: v.number(),
    endDate: v.number(),
    duration: v.optional(v.number()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify resource belongs to organization
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.organizationId !== args.organizationId) {
      throw new Error("Resource not found");
    }

    const resourceProps = resource.customProperties as Record<string, unknown> | undefined;

    const slotDuration = args.duration || (resourceProps?.minDuration as number) || 60;
    const slotIncrement = (resourceProps?.slotIncrement as number) || slotDuration;
    const bufferBefore = (resourceProps?.bufferBefore as number) || 0;
    const bufferAfter = (resourceProps?.bufferAfter as number) || 0;

    // Get availability data
    const { schedules, exceptions, blocks } = await getAvailabilityData(
      ctx,
      args.resourceId,
      args.startDate,
      args.endDate
    );

    // Get existing bookings
    const bookings = await getBookingsInRange(
      ctx,
      args.resourceId,
      args.startDate - bufferBefore * 60000,
      args.endDate + bufferAfter * 60000
    );

    // Generate slots
    const slots: TimeSlot[] = [];
    const DAY_MS = 24 * 60 * 60 * 1000;

    for (let dayTs = startOfDay(args.startDate); dayTs <= args.endDate; dayTs += DAY_MS) {
      if (isDateBlocked(dayTs, blocks)) continue;

      const dayOfWeek = new Date(dayTs).getUTCDay();
      const schedule = getScheduleForDay(dayTs, dayOfWeek, schedules, exceptions);
      if (!schedule || !schedule.isAvailable) continue;

      const dayStart = parseTimeToTimestamp(schedule.startTime, dayTs);
      const dayEnd = parseTimeToTimestamp(schedule.endTime, dayTs);

      for (let slotStart = dayStart; slotStart + slotDuration * 60000 <= dayEnd; slotStart += slotIncrement * 60000) {
        const slotEnd = slotStart + slotDuration * 60000;
        const effectiveStart = slotStart - bufferBefore * 60000;
        const effectiveEnd = slotEnd + bufferAfter * 60000;

        const hasConflict = bookings.some((booking) => {
          const bookingProps = booking.customProperties as Record<string, unknown>;
          const bookingStart = bookingProps.startDateTime as number;
          const bookingEnd = bookingProps.endDateTime as number;
          if (booking.status === "cancelled") return false;
          return bookingStart < effectiveEnd && bookingEnd > effectiveStart;
        });

        if (!hasConflict) {
          slots.push({
            resourceId: args.resourceId,
            date: formatDate(dayTs),
            startTime: formatTime(slotStart),
            endTime: formatTime(slotEnd),
            startDateTime: slotStart,
            endDateTime: slotEnd,
            isAvailable: true,
          });
        }
      }
    }

    return slots;
  },
});

// ============================================================================
// ADDITIONAL INTERNAL QUERIES/MUTATIONS (for API endpoints)
// ============================================================================

/**
 * GET RESOURCE AVAILABILITY INTERNAL
 * Internal query for API endpoint
 */
export const getResourceAvailabilityInternal = internalQuery({
  args: {
    resourceId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Verify resource belongs to org
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.organizationId !== args.organizationId) {
      throw new Error("Resource not found");
    }

    // Get availability data
    const { schedules, exceptions, blocks } = await getAvailabilityData(
      ctx,
      args.resourceId,
      0,
      Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year ahead
    );

    // Transform for API response
    const transformedSchedules = schedules.map((s) => {
      const props = s.customProperties as Record<string, unknown>;
      return {
        dayOfWeek: props.dayOfWeek,
        startTime: props.startTime,
        endTime: props.endTime,
        isAvailable: props.isAvailable,
        timezone: props.timezone,
      };
    });

    const transformedExceptions = exceptions.map((e) => {
      const props = e.customProperties as Record<string, unknown>;
      return {
        date: props.date,
        isAvailable: props.isAvailable,
        customHours: props.customHours,
        reason: props.reason,
      };
    });

    const transformedBlocks = blocks.map((b) => {
      const props = b.customProperties as Record<string, unknown>;
      return {
        startDate: props.startDate,
        endDate: props.endDate,
        reason: props.reason,
      };
    });

    return {
      schedules: transformedSchedules,
      exceptions: transformedExceptions,
      blocks: transformedBlocks,
    };
  },
});

/**
 * SET WEEKLY SCHEDULE INTERNAL
 * Internal mutation for API endpoint
 */
export const setWeeklyScheduleInternal = internalMutation({
  args: {
    resourceId: v.id("objects"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    schedules: v.array(
      v.object({
        dayOfWeek: v.number(),
        startTime: v.string(),
        endTime: v.string(),
        isAvailable: v.boolean(),
      })
    ),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify resource belongs to org
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.organizationId !== args.organizationId) {
      throw new Error("Resource not found");
    }

    // Delete existing schedule entries
    const existingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.resourceId).eq("linkType", "has_availability")
      )
      .collect();

    for (const link of existingLinks) {
      const availability = await ctx.db.get(link.toObjectId);
      if (availability && availability.subtype === "schedule") {
        await ctx.db.delete(link._id);
        await ctx.db.delete(link.toObjectId);
      }
    }

    // Create new schedule entries
    const scheduleIds: Id<"objects">[] = [];

    for (const schedule of args.schedules) {
      const availabilityId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "availability",
        subtype: "schedule",
        name: `${getDayName(schedule.dayOfWeek)} Schedule`,
        status: "active",
        customProperties: {
          resourceId: args.resourceId,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isAvailable: schedule.isAvailable,
          timezone: args.timezone,
        },
        createdBy: args.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: args.resourceId,
        toObjectId: availabilityId,
        linkType: "has_availability",
        createdBy: args.userId,
        createdAt: Date.now(),
      });

      scheduleIds.push(availabilityId);
    }

    return { scheduleIds };
  },
});

/**
 * CREATE EXCEPTION INTERNAL
 * Internal mutation for API endpoint
 */
export const createExceptionInternal = internalMutation({
  args: {
    resourceId: v.id("objects"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    date: v.number(),
    isAvailable: v.boolean(),
    customHours: v.optional(
      v.object({
        startTime: v.string(),
        endTime: v.string(),
      })
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify resource belongs to org
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.organizationId !== args.organizationId) {
      throw new Error("Resource not found");
    }

    // Check for existing exception on this date and delete
    const existingExceptions = await findExceptionsForDate(ctx, args.resourceId, args.date);
    for (const existing of existingExceptions) {
      const links = await ctx.db
        .query("objectLinks")
        .withIndex("by_to_link_type", (q) =>
          q.eq("toObjectId", existing._id).eq("linkType", "has_availability")
        )
        .collect();

      for (const link of links) {
        await ctx.db.delete(link._id);
      }
      await ctx.db.delete(existing._id);
    }

    // Create exception
    const exceptionId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "availability",
      subtype: "exception",
      name: `Exception: ${formatDate(args.date)}`,
      status: "active",
      customProperties: {
        resourceId: args.resourceId,
        date: args.date,
        isAvailable: args.isAvailable,
        customHours: args.customHours || null,
        reason: args.reason || null,
      },
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link to resource
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: args.resourceId,
      toObjectId: exceptionId,
      linkType: "has_availability",
      createdBy: args.userId,
      createdAt: Date.now(),
    });

    return { exceptionId };
  },
});

/**
 * CREATE BLOCK INTERNAL
 * Internal mutation for API endpoint
 */
export const createBlockInternal = internalMutation({
  args: {
    resourceId: v.id("objects"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    startDate: v.number(),
    endDate: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify resource belongs to org
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.organizationId !== args.organizationId) {
      throw new Error("Resource not found");
    }

    // Create block
    const blockId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "availability",
      subtype: "block",
      name: `Block: ${args.reason}`,
      status: "active",
      customProperties: {
        resourceId: args.resourceId,
        startDate: args.startDate,
        endDate: args.endDate,
        reason: args.reason,
      },
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link to resource
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: args.resourceId,
      toObjectId: blockId,
      linkType: "has_availability",
      createdBy: args.userId,
      createdAt: Date.now(),
    });

    return { blockId };
  },
});

/**
 * DELETE AVAILABILITY INTERNAL
 * Internal mutation for API endpoint
 */
export const deleteAvailabilityInternal = internalMutation({
  args: {
    availabilityId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const availability = await ctx.db.get(args.availabilityId);

    if (!availability || availability.type !== "availability") {
      throw new Error("Availability item not found");
    }

    if (availability.organizationId !== args.organizationId) {
      throw new Error("Availability item not found");
    }

    // Delete links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.availabilityId).eq("linkType", "has_availability")
      )
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.availabilityId);

    return { success: true };
  },
});
