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
  remainingCapacity: number;  // Seats still available in this slot
  totalCapacity: number;      // Total capacity for this resource
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
    const capacity = (resourceProps?.capacity as number) || 1;
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

    // 4b. Get external calendar busy times (Google/Microsoft synced events)
    const externalBusyTimes = await getExternalBusyTimes(
      ctx,
      args.resourceId,
      args.startDate,
      args.endDate
    );

    // 5. Generate slots (capacity-aware)
    const slots: TimeSlot[] = [];
    const DAY_MS = 24 * 60 * 60 * 1000;

    // Iterate through each day in the range
    for (let dayTs = startOfDay(args.startDate); dayTs <= args.endDate; dayTs += DAY_MS) {
      // Check if day is blocked
      if (isDateBlocked(dayTs, blocks)) continue;

      // Get the day of week (0=Sunday)
      const dayOfWeek = new Date(dayTs).getUTCDay();

      // Get all time ranges for this day (supports multiple ranges per day)
      const daySchedules = getSchedulesForDay(dayTs, dayOfWeek, schedules, exceptions);
      if (daySchedules.length === 0) continue;

      // Generate slots for each time range
      for (const schedule of daySchedules) {
        if (!schedule.isAvailable) continue;

        const dayStart = parseTimeToTimestamp(schedule.startTime, dayTs);
        const dayEnd = parseTimeToTimestamp(schedule.endTime, dayTs);

        for (let slotStart = dayStart; slotStart + slotDuration * 60000 <= dayEnd; slotStart += slotIncrement * 60000) {
          const slotEnd = slotStart + slotDuration * 60000;

          // Check for conflicts (including buffer zones)
          const effectiveStart = slotStart - bufferBefore * 60000;
          const effectiveEnd = slotEnd + bufferAfter * 60000;

          // Count overlapping non-cancelled bookings for capacity check
          const overlapCount = bookings.filter((booking) => {
            if (booking.status === "cancelled") return false;
            const bookingProps = booking.customProperties as Record<string, unknown>;
            const bookingStart = bookingProps.startDateTime as number;
            const bookingEnd = bookingProps.endDateTime as number;
            return bookingStart < effectiveEnd && bookingEnd > effectiveStart;
          }).length;

          // External calendar conflicts still block entirely
          const hasExternalConflict = externalBusyTimes.some((busy) =>
            busy.startDateTime < effectiveEnd && busy.endDateTime > effectiveStart
          );

          const remainingCapacity = capacity - overlapCount;

          if (remainingCapacity > 0 && !hasExternalConflict) {
            slots.push({
              resourceId: args.resourceId,
              date: formatDate(dayTs),
              startTime: formatTime(slotStart),
              endTime: formatTime(slotEnd),
              startDateTime: slotStart,
              endDateTime: slotEnd,
              isAvailable: true,
              remainingCapacity,
              totalCapacity: capacity,
            });
          }
        }
      }
    }

    return slots;
  },
});

/**
 * CHECK CONFLICT
 * Check if a time slot conflicts with existing bookings.
 * Capacity-aware: allows concurrent bookings up to the resource's capacity.
 * For capacity=1 (default), behaves identically to a binary conflict check.
 */
export const checkConflict = internalQuery({
  args: {
    resourceId: v.id("objects"),
    startDateTime: v.number(),
    endDateTime: v.number(),
    excludeBookingId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    // Get resource for buffer times and capacity
    const resource = await ctx.db.get(args.resourceId);
    if (!resource) return false;

    const resourceProps = resource.customProperties as Record<string, unknown> | undefined;
    const bufferBefore = (resourceProps?.bufferBefore as number) || 0;
    const bufferAfter = (resourceProps?.bufferAfter as number) || 0;
    const capacity = (resourceProps?.capacity as number) || 1;

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

    // Count overlapping non-cancelled bookings
    let overlapCount = 0;
    for (const booking of bookings) {
      if (args.excludeBookingId && booking._id === args.excludeBookingId) continue;
      if (booking.status === "cancelled") continue;

      const bookingProps = booking.customProperties as Record<string, unknown>;
      const bookingStart = bookingProps.startDateTime as number;
      const bookingEnd = bookingProps.endDateTime as number;

      if (bookingStart < effectiveEnd && bookingEnd > effectiveStart) {
        overlapCount++;
      }
    }

    // Conflict only when at or over capacity
    return overlapCount >= capacity;
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
// NAMED AVAILABILITY SCHEDULES
// ============================================================================

/**
 * CREATE AVAILABILITY SCHEDULE
 * Create a named, reusable availability schedule template with 7 day entries.
 */
export const createAvailabilitySchedule = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    timezone: v.string(),
    isDefault: v.optional(v.boolean()),
    days: v.array(
      v.object({
        dayOfWeek: v.number(),
        timeRanges: v.array(
          v.object({
            startTime: v.string(),
            endTime: v.string(),
          })
        ),
        isAvailable: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Validate days
    for (const day of args.days) {
      if (day.dayOfWeek < 0 || day.dayOfWeek > 6) {
        throw new Error("Invalid day of week. Must be 0-6 (Sunday-Saturday)");
      }
      for (const range of day.timeRanges) {
        if (!isValidTime(range.startTime) || !isValidTime(range.endTime)) {
          throw new Error("Invalid time format. Use HH:MM (24-hour format)");
        }
        if (range.startTime >= range.endTime) {
          throw new Error("Start time must be before end time");
        }
      }
      // Validate no overlapping time ranges within a day
      const sorted = [...day.timeRanges].sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].startTime < sorted[i - 1].endTime) {
          throw new Error(`Overlapping time ranges on ${getDayName(day.dayOfWeek)}`);
        }
      }
    }

    // If setting as default, unset all existing defaults for this org
    if (args.isDefault) {
      const existingTemplates = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q: any) =>
          q.eq("organizationId", args.organizationId).eq("type", "availability")
        )
        .collect();

      for (const tmpl of existingTemplates) {
        if (tmpl.subtype === "schedule_template") {
          const props = tmpl.customProperties as Record<string, unknown>;
          if (props?.isDefault) {
            await ctx.db.patch(tmpl._id, {
              customProperties: { ...props, isDefault: false },
              updatedAt: Date.now(),
            });
          }
        }
      }
    }

    // Create the schedule_template object
    const templateId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "availability",
      subtype: "schedule_template",
      name: args.name,
      status: "active",
      customProperties: {
        timezone: args.timezone,
        isDefault: args.isDefault || false,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create schedule_entry objects for each day
    for (const day of args.days) {
      const entryId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "availability",
        subtype: "schedule_entry",
        name: `${getDayName(day.dayOfWeek)} Entry`,
        status: "active",
        customProperties: {
          scheduleTemplateId: templateId,
          dayOfWeek: day.dayOfWeek,
          timeRanges: day.timeRanges,
          isAvailable: day.isAvailable,
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Link template to entry
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: templateId,
        toObjectId: entryId,
        linkType: "has_schedule_entry",
        createdBy: userId,
        createdAt: Date.now(),
      });
    }

    return { scheduleId: templateId };
  },
});

/**
 * GET AVAILABILITY SCHEDULES
 * List all named availability schedule templates for an organization.
 */
export const getAvailabilitySchedules = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all schedule_template objects for this org
    const allAvailability = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("type", "availability")
      )
      .collect();

    const templates = allAvailability.filter(
      (obj) => obj.subtype === "schedule_template" && obj.status === "active"
    );

    const results = [];

    for (const template of templates) {
      const props = template.customProperties as Record<string, unknown>;

      // Get entries via has_schedule_entry links
      const entryLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_link_type", (q: any) =>
          q.eq("fromObjectId", template._id).eq("linkType", "has_schedule_entry")
        )
        .collect();

      const entries = [];
      for (const link of entryLinks) {
        const entry = await ctx.db.get(link.toObjectId);
        if (entry && entry.subtype === "schedule_entry" && entry.status === "active") {
          entries.push(entry);
        }
      }

      // Build summary from entries
      const dayEntries = entries.map((e) => {
        const ep = e.customProperties as Record<string, unknown>;
        return {
          dayOfWeek: ep.dayOfWeek as number,
          timeRanges: ep.timeRanges as Array<{ startTime: string; endTime: string }>,
          isAvailable: ep.isAvailable as boolean,
        };
      });
      dayEntries.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

      const summary = generateScheduleSummary(dayEntries);

      results.push({
        _id: template._id,
        name: template.name,
        timezone: props.timezone as string,
        isDefault: (props.isDefault as boolean) || false,
        summary,
        entryCount: entries.length,
      });
    }

    return results;
  },
});

/**
 * GET SCHEDULE DETAIL
 * Get full detail (template + all day entries) for a named schedule.
 */
export const getScheduleDetail = query({
  args: {
    sessionId: v.string(),
    scheduleId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const template = await ctx.db.get(args.scheduleId);
    if (!template || template.type !== "availability" || template.subtype !== "schedule_template") {
      throw new Error("Schedule template not found");
    }

    const props = template.customProperties as Record<string, unknown>;

    // Get entries via has_schedule_entry links
    const entryLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q: any) =>
        q.eq("fromObjectId", args.scheduleId).eq("linkType", "has_schedule_entry")
      )
      .collect();

    const days = [];
    for (const link of entryLinks) {
      const entry = await ctx.db.get(link.toObjectId);
      if (entry && entry.subtype === "schedule_entry" && entry.status === "active") {
        const ep = entry.customProperties as Record<string, unknown>;
        days.push({
          _id: entry._id,
          dayOfWeek: ep.dayOfWeek as number,
          timeRanges: ep.timeRanges as Array<{ startTime: string; endTime: string }>,
          isAvailable: ep.isAvailable as boolean,
        });
      }
    }

    days.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

    return {
      template: {
        _id: template._id,
        name: template.name,
        timezone: props.timezone as string,
        isDefault: (props.isDefault as boolean) || false,
        status: template.status,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
      days,
    };
  },
});

/**
 * UPDATE AVAILABILITY SCHEDULE
 * Update metadata (name, timezone, isDefault) of a named schedule template.
 */
export const updateAvailabilitySchedule = mutation({
  args: {
    sessionId: v.string(),
    scheduleId: v.id("objects"),
    name: v.optional(v.string()),
    timezone: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const template = await ctx.db.get(args.scheduleId);
    if (!template || template.type !== "availability" || template.subtype !== "schedule_template") {
      throw new Error("Schedule template not found");
    }

    const props = template.customProperties as Record<string, unknown>;

    // If setting as default, unset all existing defaults for this org
    if (args.isDefault === true) {
      const allAvailability = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q: any) =>
          q.eq("organizationId", template.organizationId).eq("type", "availability")
        )
        .collect();

      for (const tmpl of allAvailability) {
        if (
          tmpl.subtype === "schedule_template" &&
          tmpl._id !== args.scheduleId
        ) {
          const tmplProps = tmpl.customProperties as Record<string, unknown>;
          if (tmplProps?.isDefault) {
            await ctx.db.patch(tmpl._id, {
              customProperties: { ...tmplProps, isDefault: false },
              updatedAt: Date.now(),
            });
          }
        }
      }
    }

    // Build updated fields
    const updatedProps = {
      ...props,
      ...(args.timezone !== undefined ? { timezone: args.timezone } : {}),
      ...(args.isDefault !== undefined ? { isDefault: args.isDefault } : {}),
    };

    await ctx.db.patch(args.scheduleId, {
      ...(args.name !== undefined ? { name: args.name } : {}),
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * UPDATE SCHEDULE DAY
 * Update a single day entry's time ranges and availability flag.
 */
export const updateScheduleDay = mutation({
  args: {
    sessionId: v.string(),
    scheduleEntryId: v.id("objects"),
    timeRanges: v.array(
      v.object({
        startTime: v.string(),
        endTime: v.string(),
      })
    ),
    isAvailable: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const entry = await ctx.db.get(args.scheduleEntryId);
    if (!entry || entry.type !== "availability" || entry.subtype !== "schedule_entry") {
      throw new Error("Schedule entry not found");
    }

    // Validate time ranges
    for (const range of args.timeRanges) {
      if (!isValidTime(range.startTime) || !isValidTime(range.endTime)) {
        throw new Error("Invalid time format. Use HH:MM (24-hour format)");
      }
      if (range.startTime >= range.endTime) {
        throw new Error("Start time must be before end time");
      }
    }

    // Validate no overlapping ranges
    const sorted = [...args.timeRanges].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startTime < sorted[i - 1].endTime) {
        throw new Error("Time ranges must not overlap");
      }
    }

    const props = entry.customProperties as Record<string, unknown>;

    await ctx.db.patch(args.scheduleEntryId, {
      customProperties: {
        ...props,
        timeRanges: args.timeRanges,
        isAvailable: args.isAvailable,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DELETE AVAILABILITY SCHEDULE
 * Delete a named schedule template and all its day entries.
 * Fails if any resource is currently using this schedule.
 */
export const deleteAvailabilitySchedule = mutation({
  args: {
    sessionId: v.string(),
    scheduleId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const template = await ctx.db.get(args.scheduleId);
    if (!template || template.type !== "availability" || template.subtype !== "schedule_template") {
      throw new Error("Schedule template not found");
    }

    // Check if any resources use this schedule
    const usageLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q: any) =>
        q.eq("toObjectId", args.scheduleId).eq("linkType", "uses_schedule")
      )
      .collect();

    if (usageLinks.length > 0) {
      throw new Error(
        `Cannot delete schedule: it is currently used by ${usageLinks.length} resource(s). Remove the schedule from those resources first.`
      );
    }

    // Get all entry links
    const entryLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q: any) =>
        q.eq("fromObjectId", args.scheduleId).eq("linkType", "has_schedule_entry")
      )
      .collect();

    // Delete entry objects and their links
    for (const link of entryLinks) {
      await ctx.db.delete(link.toObjectId);
      await ctx.db.delete(link._id);
    }

    // Delete any inbound links to the template
    const inboundLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q: any) =>
        q.eq("toObjectId", args.scheduleId).eq("linkType", "has_schedule_entry")
      )
      .collect();

    for (const link of inboundLinks) {
      await ctx.db.delete(link._id);
    }

    // Delete the template itself
    await ctx.db.delete(args.scheduleId);

    return { success: true };
  },
});

/**
 * SET DEFAULT SCHEDULE
 * Mark a named schedule as the organization default, unsetting any previous default.
 */
export const setDefaultSchedule = mutation({
  args: {
    sessionId: v.string(),
    scheduleId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const template = await ctx.db.get(args.scheduleId);
    if (!template || template.type !== "availability" || template.subtype !== "schedule_template") {
      throw new Error("Schedule template not found");
    }

    // Get all schedule_templates for this org and unset their defaults
    const allAvailability = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q: any) =>
        q.eq("organizationId", template.organizationId).eq("type", "availability")
      )
      .collect();

    for (const tmpl of allAvailability) {
      if (tmpl.subtype === "schedule_template") {
        const tmplProps = tmpl.customProperties as Record<string, unknown>;
        if (tmplProps?.isDefault) {
          await ctx.db.patch(tmpl._id, {
            customProperties: { ...tmplProps, isDefault: false },
            updatedAt: Date.now(),
          });
        }
      }
    }

    // Set this one as default
    const props = template.customProperties as Record<string, unknown>;
    await ctx.db.patch(args.scheduleId, {
      customProperties: { ...props, isDefault: true },
      updatedAt: Date.now(),
    });

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
  // Get old-style availability links (has_availability)
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

  // If no old-style schedules found, check for new named schedule system (uses_schedule)
  if (schedules.length === 0) {
    const scheduleLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q: any) =>
        q.eq("fromObjectId", resourceId).eq("linkType", "uses_schedule")
      )
      .collect();

    for (const scheduleLink of scheduleLinks) {
      const template = await ctx.db.get(scheduleLink.toObjectId);
      if (!template || template.type !== "availability" || template.subtype !== "schedule_template") continue;
      if (template.status !== "active") continue;

      // Fetch schedule_entry children via has_schedule_entry links
      const entryLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_link_type", (q: any) =>
          q.eq("fromObjectId", template._id).eq("linkType", "has_schedule_entry")
        )
        .collect();

      for (const entryLink of entryLinks) {
        const entry = await ctx.db.get(entryLink.toObjectId);
        if (!entry || entry.type !== "availability" || entry.subtype !== "schedule_entry") continue;

        const entryProps = entry.customProperties as Record<string, unknown>;
        const isAvailable = entryProps.isAvailable as boolean;
        const dayOfWeek = entryProps.dayOfWeek as number;
        const timeRanges = (entryProps.timeRanges as Array<{ startTime: string; endTime: string }>) || [];

        if (!isAvailable || timeRanges.length === 0) {
          // Push an unavailable marker so getScheduleForDay knows this day exists but is off
          schedules.push({
            customProperties: { dayOfWeek, startTime: "00:00", endTime: "00:00", isAvailable: false },
            status: "active",
          });
          continue;
        }

        // Convert each time range into a synthetic old-style schedule object
        for (const range of timeRanges) {
          schedules.push({
            customProperties: {
              dayOfWeek,
              startTime: range.startTime,
              endTime: range.endTime,
              isAvailable: true,
            },
            status: "active",
          });
        }
      }
      // Only use the first linked schedule template
      break;
    }
  }

  return { schedules, exceptions, blocks };
}

/**
 * Get external calendar events that block a resource in a date range
 * These come from synced Google/Microsoft calendars via calendarSyncOntology
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getExternalBusyTimes(
  ctx: any,
  resourceId: Id<"objects">,
  startDate: number,
  endDate: number
): Promise<Array<{ startDateTime: number; endDateTime: number }>> {
  // Find all calendar_event objects linked to this resource via blocks_resource
  const links = await ctx.db
    .query("objectLinks")
    .withIndex("by_to_link_type", (q: any) =>
      q.eq("toObjectId", resourceId).eq("linkType", "blocks_resource")
    )
    .collect();

  const busyTimes: Array<{ startDateTime: number; endDateTime: number }> = [];

  for (const link of links) {
    const event = await ctx.db.get(link.fromObjectId);
    if (!event || event.type !== "calendar_event") continue;
    if (event.status !== "active") continue;

    const props = event.customProperties as Record<string, unknown>;
    const eventStart = props.startDateTime as number;
    const eventEnd = props.endDateTime as number;

    // Check if event overlaps with date range
    if (eventStart < endDate && eventEnd > startDate) {
      busyTimes.push({ startDateTime: eventStart, endDateTime: eventEnd });
    }
  }

  return busyTimes;
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
 * Get schedule for a specific day, checking exceptions first.
 * Returns the first matching time range (legacy single-range behavior).
 */
function getScheduleForDay(
  dateTs: number,
  dayOfWeek: number,
  schedules: Array<{ customProperties?: unknown }>,
  exceptions: Array<{ customProperties?: unknown }>
): { startTime: string; endTime: string; isAvailable: boolean } | null {
  const ranges = getSchedulesForDay(dateTs, dayOfWeek, schedules, exceptions);
  return ranges.length > 0 ? ranges[0] : null;
}

/**
 * Get ALL schedule time ranges for a specific day, checking exceptions first.
 * Supports multiple time ranges per day (e.g., 9:00-12:00 and 14:00-17:00).
 */
function getSchedulesForDay(
  dateTs: number,
  dayOfWeek: number,
  schedules: Array<{ customProperties?: unknown }>,
  exceptions: Array<{ customProperties?: unknown }>
): Array<{ startTime: string; endTime: string; isAvailable: boolean }> {
  // Check for exception first
  for (const exception of exceptions) {
    const props = exception.customProperties as Record<string, unknown>;
    const exceptionDate = props.date as number;

    // Check if same day (compare dates without time)
    if (isSameDay(dateTs, exceptionDate)) {
      if (!props.isAvailable) {
        return []; // Day is unavailable
      }
      if (props.customHours) {
        const hours = props.customHours as { startTime: string; endTime: string };
        return [{
          startTime: hours.startTime,
          endTime: hours.endTime,
          isAvailable: true,
        }];
      }
    }
  }

  // Fall back to weekly schedule - collect ALL matching ranges for this day
  const dayRanges: Array<{ startTime: string; endTime: string; isAvailable: boolean }> = [];
  for (const schedule of schedules) {
    const props = schedule.customProperties as Record<string, unknown>;
    if (props.dayOfWeek === dayOfWeek) {
      if (!(props.isAvailable as boolean)) {
        return []; // Day is explicitly unavailable
      }
      dayRanges.push({
        startTime: props.startTime as string,
        endTime: props.endTime as string,
        isAvailable: true,
      });
    }
  }

  return dayRanges;
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

/**
 * Get short day name from day of week number
 */
function getDayNameShort(dayOfWeek: number): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[dayOfWeek] || "???";
}

/**
 * Format a 24-hour time string ("09:00") to 12-hour format ("9:00 AM")
 */
function formatTime12h(time: string): string {
  const [hoursStr, minutesStr] = time.split(":");
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr;
  const period = hours >= 12 ? "PM" : "AM";
  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours -= 12;
  }
  return `${hours}:${minutes} ${period}`;
}

/**
 * Generate a human-readable summary from schedule day entries.
 * Groups consecutive days that share the same time ranges.
 * E.g. "Mon - Fri, 9:00 AM - 5:00 PM"
 */
function generateScheduleSummary(
  dayEntries: Array<{
    dayOfWeek: number;
    timeRanges: Array<{ startTime: string; endTime: string }>;
    isAvailable: boolean;
  }>
): string {
  if (dayEntries.length === 0) return "No days configured";

  // Only include available days
  const availableDays = dayEntries.filter((d) => d.isAvailable);
  if (availableDays.length === 0) return "No available days";

  // Build a fingerprint for each day's time ranges
  const fingerprinted = availableDays.map((d) => ({
    dayOfWeek: d.dayOfWeek,
    key: d.timeRanges
      .map((r) => `${r.startTime}-${r.endTime}`)
      .sort()
      .join("|"),
    timeRanges: d.timeRanges,
  }));

  // Sort by dayOfWeek
  fingerprinted.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  // Group consecutive days with the same time range fingerprint
  const groups: Array<{
    startDay: number;
    endDay: number;
    timeRanges: Array<{ startTime: string; endTime: string }>;
  }> = [];

  for (const entry of fingerprinted) {
    const last = groups[groups.length - 1];
    if (last && last.endDay === entry.dayOfWeek - 1 && last.timeRanges.map((r) => `${r.startTime}-${r.endTime}`).sort().join("|") === entry.key) {
      last.endDay = entry.dayOfWeek;
    } else {
      groups.push({
        startDay: entry.dayOfWeek,
        endDay: entry.dayOfWeek,
        timeRanges: entry.timeRanges,
      });
    }
  }

  // Format each group
  const parts = groups.map((group) => {
    const dayRange =
      group.startDay === group.endDay
        ? getDayNameShort(group.startDay)
        : `${getDayNameShort(group.startDay)} - ${getDayNameShort(group.endDay)}`;

    const timeStr = group.timeRanges
      .map((r) => `${formatTime12h(r.startTime)} - ${formatTime12h(r.endTime)}`)
      .join(", ");

    return `${dayRange}, ${timeStr}`;
  });

  return parts.join(" | ");
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
    const capacity = (resourceProps?.capacity as number) || 1;

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

    // Get external calendar busy times
    const externalBusyTimes = await getExternalBusyTimes(
      ctx,
      args.resourceId,
      args.startDate,
      args.endDate
    );

    // Generate slots (capacity-aware)
    const slots: TimeSlot[] = [];
    const DAY_MS = 24 * 60 * 60 * 1000;

    for (let dayTs = startOfDay(args.startDate); dayTs <= args.endDate; dayTs += DAY_MS) {
      if (isDateBlocked(dayTs, blocks)) continue;

      const dayOfWeek = new Date(dayTs).getUTCDay();
      const daySchedules = getSchedulesForDay(dayTs, dayOfWeek, schedules, exceptions);
      if (daySchedules.length === 0) continue;

      for (const schedule of daySchedules) {
        if (!schedule.isAvailable) continue;

        const dayStart = parseTimeToTimestamp(schedule.startTime, dayTs);
        const dayEnd = parseTimeToTimestamp(schedule.endTime, dayTs);

        for (let slotStart = dayStart; slotStart + slotDuration * 60000 <= dayEnd; slotStart += slotIncrement * 60000) {
          const slotEnd = slotStart + slotDuration * 60000;
          const effectiveStart = slotStart - bufferBefore * 60000;
          const effectiveEnd = slotEnd + bufferAfter * 60000;

          // Count overlapping non-cancelled bookings for capacity check
          const overlapCount = bookings.filter((booking) => {
            if (booking.status === "cancelled") return false;
            const bookingProps = booking.customProperties as Record<string, unknown>;
            const bookingStart = bookingProps.startDateTime as number;
            const bookingEnd = bookingProps.endDateTime as number;
            return bookingStart < effectiveEnd && bookingEnd > effectiveStart;
          }).length;

          // External calendar conflicts still block entirely
          const hasExternalConflict = externalBusyTimes.some((busy) =>
            busy.startDateTime < effectiveEnd && busy.endDateTime > effectiveStart
          );

          const remainingCapacity = capacity - overlapCount;

          if (remainingCapacity > 0 && !hasExternalConflict) {
            slots.push({
              resourceId: args.resourceId,
              date: formatDate(dayTs),
              startTime: formatTime(slotStart),
              endTime: formatTime(slotEnd),
              startDateTime: slotStart,
              endDateTime: slotEnd,
              isAvailable: true,
              remainingCapacity,
              totalCapacity: capacity,
            });
          }
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
