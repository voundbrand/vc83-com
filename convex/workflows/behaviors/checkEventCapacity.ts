/**
 * BEHAVIOR: CHECK EVENT CAPACITY (Behavior 2)
 *
 * Validates that the event still has available capacity before allowing registration.
 * Priority: 95 (runs early, right after validation)
 *
 * Checks:
 * - Event capacity limit (if set)
 * - Current registration count
 * - Returns available slots
 *
 * Returns:
 * - capacityAvailable: boolean
 * - currentRegistrations: number
 * - maxCapacity: number | undefined
 * - availableSlots: number | undefined
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
const generatedApi: any = require("../../_generated/api");
import type { Id } from "../../_generated/dataModel";

export const executeCheckEventCapacity = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    config: v.any(),
    context: v.any(),
  },
  handler: async (ctx, args) => {
    console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✓'} [Behavior 2/12] Check Event Capacity`);

    const context = args.context as {
      eventId?: string;
    };

    if (!context.eventId) {
      return {
        success: false,
        error: "Event ID is required",
      };
    }

    // Get event details
    const event = await (ctx as any).runQuery(generatedApi.api.ontologyHelpers.getObject, {
      objectId: context.eventId as Id<"objects">,
    });

    if (!event) {
      return {
        success: false,
        error: "Event not found",
      };
    }

    const customProps = event.customProperties as {
      capacity?: number;
      registrationStats?: {
        totalRegistrations?: number;
        confirmedRegistrations?: number;
      };
    };

    const maxCapacity = customProps.capacity;
    const currentRegistrations = customProps.registrationStats?.confirmedRegistrations || 0;

    // If no capacity limit is set, always allow registration
    if (!maxCapacity) {
      console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✅'} No capacity limit - registration allowed`);
      return {
        success: true,
        message: `No capacity limit set for event${args.config?.dryRun ? ' (dry run)' : ''}`,
        data: {
          capacityAvailable: true,
          currentRegistrations,
          maxCapacity: undefined,
          availableSlots: undefined,
          unlimited: true,
        },
      };
    }

    // Check if capacity is available
    const availableSlots = maxCapacity - currentRegistrations;
    const capacityAvailable = availableSlots > 0;

    if (!capacityAvailable) {
      console.error("❌ Event is at full capacity");
      return {
        success: false,
        error: "Event is at full capacity",
        message: `Event has reached maximum capacity of ${maxCapacity} registrations`,
        data: {
          capacityAvailable: false,
          currentRegistrations,
          maxCapacity,
          availableSlots: 0,
        },
      };
    }

    console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✅'} Capacity available: ${availableSlots} of ${maxCapacity} slots remaining`);
    return {
      success: true,
      message: `Capacity available: ${availableSlots} slots remaining${args.config?.dryRun ? ' (dry run)' : ''}`,
      data: {
        capacityAvailable: true,
        currentRegistrations,
        maxCapacity,
        availableSlots,
      },
    };
  },
});
