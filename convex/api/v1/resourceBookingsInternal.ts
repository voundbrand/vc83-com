/**
 * RESOURCE BOOKINGS INTERNAL
 *
 * Internal mutations for customer-facing resource booking checkout.
 * Orchestrates: booking creation, CRM contact, availability check.
 *
 * Separate from bookingsInternal.ts which handles event-based bookings
 * with tickets and purchase items.
 */

import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";

// Lazy-load internal to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_internalCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _internalCache = require("../../_generated/api").internal;
  }
  return _internalCache;
}

/**
 * CUSTOMER CHECKOUT INTERNAL
 *
 * Creates a resource booking from a customer checkout flow:
 * 1. Validates resource exists and is bookable
 * 2. Checks availability / conflict detection
 * 3. Creates or finds CRM contact
 * 4. Creates the booking record
 * 5. Returns booking details with remaining capacity
 */
export const customerCheckoutInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    resourceId: v.id("objects"),
    startDateTime: v.number(),
    endDateTime: v.number(),
    timezone: v.optional(v.string()),
    customer: v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
    }),
    participants: v.optional(v.number()),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    bookingId: Id<"objects">;
    status: string;
    contactId: Id<"objects"> | null;
    remainingCapacity: number;
    totalAmountCents: number;
  }> => {
    // 1. Load and validate resource
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.type !== "product") {
      throw new Error("Resource not found");
    }
    if (resource.organizationId !== args.organizationId) {
      throw new Error("Resource not found");
    }

    const resourceProps = resource.customProperties as Record<string, unknown> | undefined;
    const bookableConfig = resourceProps?.bookableConfig as Record<string, unknown> | undefined;
    if (!bookableConfig) {
      throw new Error("Resource is not bookable");
    }

    const availabilityModel = (resourceProps?.availabilityModel as string) || "time_slot";
    const capacity = (resourceProps?.capacity as number) || (bookableConfig?.capacity as number) || 1;
    const participants = args.participants || 1;

    // 2. Check availability / conflicts
    const conflictResult = await ctx.runQuery(getInternal().availabilityOntology.checkConflictByModel, {
      resourceId: args.resourceId,
      organizationId: args.organizationId,
      startDateTime: args.startDateTime,
      endDateTime: args.endDateTime,
      seatCount: participants,
    });

    if (conflictResult.hasConflict) {
      throw new Error(conflictResult.reason || "No availability for the selected time slot");
    }

    // 3. Calculate pricing
    const pricePerUnit = (resourceProps?.pricePerUnit as number) ||
      (bookableConfig?.pricePerUnit as number) || 0;
    const priceUnit = (resourceProps?.priceUnit as string) ||
      (bookableConfig?.priceUnit as string) || "session";

    let totalAmountCents = 0;
    if (priceUnit === "per_person" || priceUnit === "seat") {
      totalAmountCents = pricePerUnit * participants;
    } else if (priceUnit === "hour") {
      const hours = (args.endDateTime - args.startDateTime) / 3600000;
      totalAmountCents = Math.round(pricePerUnit * hours);
    } else {
      // "session", "flat", etc.
      totalAmountCents = pricePerUnit;
    }

    // 4. Find or create CRM contact
    let contactId: Id<"objects"> | null = null;
    try {
      // Look for existing contact by email
      const existingContacts = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "contact")
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      const existingContact = existingContacts.find((c) => {
        const cp = c.customProperties as Record<string, unknown> | undefined;
        return cp?.email === args.customer.email;
      });

      if (existingContact) {
        contactId = existingContact._id;
      } else {
        // Get system user for record creation
        const systemUser = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
          .first();

        if (systemUser) {
          contactId = await ctx.db.insert("objects", {
            organizationId: args.organizationId,
            type: "contact",
            subtype: "customer",
            name: `${args.customer.firstName} ${args.customer.lastName}`,
            status: "active",
            customProperties: {
              firstName: args.customer.firstName,
              lastName: args.customer.lastName,
              email: args.customer.email,
              phone: args.customer.phone || "",
              source: args.source || "web",
              tags: ["booking-customer"],
            },
            createdBy: systemUser._id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
    } catch (error) {
      // Don't fail the booking if CRM contact creation fails
      console.error("Failed to create/find CRM contact:", error);
    }

    // 5. Determine booking subtype from resource subtype
    const subtypeMap: Record<string, string> = {
      room: "reservation",
      staff: "appointment",
      equipment: "rental",
      space: "reservation",
      appointment: "appointment",
      class: "class_enrollment",
      treatment: "appointment",
    };
    const bookingSubtype = subtypeMap[resource.subtype || ""] || "appointment";

    // 6. Get system user for booking creation
    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();
    if (!systemUser) {
      throw new Error("System user not found");
    }

    // 7. Determine if confirmation is required
    const confirmationRequired = (bookableConfig?.confirmationRequired as boolean) ?? false;

    // 8. Create booking via internal mutation
    const result = await ctx.runMutation(getInternal().bookingOntology.createBookingInternal, {
      organizationId: args.organizationId,
      userId: systemUser._id,
      subtype: bookingSubtype,
      startDateTime: args.startDateTime,
      endDateTime: args.endDateTime,
      timezone: args.timezone,
      resourceIds: [args.resourceId],
      customerId: contactId || undefined,
      customerName: `${args.customer.firstName} ${args.customer.lastName}`,
      customerEmail: args.customer.email,
      customerPhone: args.customer.phone,
      participants,
      paymentType: totalAmountCents > 0 ? "full" : "none",
      totalAmountCents,
      confirmationRequired,
      notes: args.notes,
      isAdminBooking: false,
    });

    // 9. Calculate remaining capacity after this booking
    const postConflict = await ctx.runQuery(getInternal().availabilityOntology.checkConflictByModel, {
      resourceId: args.resourceId,
      organizationId: args.organizationId,
      startDateTime: args.startDateTime,
      endDateTime: args.endDateTime,
      seatCount: 1,
    });
    // If hasConflict is true after booking 1 more, remaining = 0
    // Otherwise we need to estimate from capacity minus current bookings
    const remainingCapacity = postConflict.hasConflict ? 0 : Math.max(0, capacity - participants);

    return {
      success: true,
      bookingId: result.bookingId,
      status: result.status,
      contactId,
      remainingCapacity,
      totalAmountCents,
    };
  },
});
