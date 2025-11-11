/**
 * BOOKINGS INTERNAL
 *
 * Internal mutations for creating complete bookings.
 * Orchestrates Transaction, Ticket, Purchase Item, and CRM Contact creation.
 */

import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

/**
 * CREATE COMPLETE BOOKING (INTERNAL)
 *
 * Creates all necessary records for a booking:
 * 1. Transaction (for event management)
 * 2. Tickets (one per attendee)
 * 3. Purchase Items (links tickets to transaction)
 * 4. CRM Contacts (for marketing/communication)
 */
export const createCompleteBookingInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),

    // Backend references (you created these!)
    eventId: v.id("objects"),
    productId: v.id("objects"),

    // Attendees (become CRM contacts)
    primaryAttendee: v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      phone: v.string(),
    }),
    guests: v.optional(v.array(v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.optional(v.string()),
      phone: v.string(),
    }))),

    // Tracking
    source: v.string(),
    frontendRsvpId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    bookingId: Id<"objects">;
    transactionId: Id<"objects">;
    tickets: Array<{
      ticketId: Id<"objects">;
      attendeeName: string;
      attendeeEmail?: string;
      attendeePhone: string;
      isPrimary: boolean;
      qrCode: string;
    }>;
    purchaseItemIds: Id<"objects">[];
    crmContacts: Array<{
      contactId: Id<"objects">;
      email: string;
      isPrimary: boolean;
    }>;
    totalAttendees: number;
    createdAt: number;
  }> => {
    // 1. Load event from backend (all details are here!)
    const event = await ctx.db.get(args.eventId);
    if (!event || event.type !== "event") {
      throw new Error("Event not found");
    }
    if (event.status !== "published") {
      throw new Error("Event is not available for booking");
    }

    // Extract event details from backend
    const eventName = event.name;
    const eventDate = event.customProperties?.startDate as number;
    const eventVenue = event.customProperties?.location as string;
    const eventDescription = event.description;

    // 2. Load product from backend (pricing, name, etc.)
    const product = await ctx.db.get(args.productId);
    if (!product || product.type !== "product") {
      throw new Error("Product not found");
    }
    const productName = product.name;
    const priceInCents = (product.customProperties?.price as number) || 0;
    const currency = (product.customProperties?.currency as string) || "eur";

    // 3. Build attendee list with normalized emails
    type Attendee = {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      isPrimary: boolean;
    };

    const allAttendees: Attendee[] = [
      { ...args.primaryAttendee, isPrimary: true }
    ];

    if (args.guests && args.guests.length > 0) {
      allAttendees.push(...args.guests.map(g => ({
        firstName: g.firstName,
        lastName: g.lastName,
        email: g.email || `${g.firstName.toLowerCase()}.${g.lastName.toLowerCase()}@temp.gg`,
        phone: g.phone,
        isPrimary: false
      })));
    }

    // 4. Get system user for record creation
    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();
    if (!systemUser) {
      throw new Error("System user not found - please ensure system@l4yercak3.com user exists");
    }

    // 5. Create Transaction record
    const transactionId = await ctx.runMutation(
      internal.transactionOntology.createTransactionInternal,
      {
        organizationId: args.organizationId,
        subtype: "event_booking",

        // Product context
        productId: args.productId,
        productName: productName,
        productDescription: eventDescription,
        productSubtype: "ticket",

        // Event context (from backend event object)
        eventId: args.eventId,
        eventName: eventName,
        eventLocation: eventVenue,
        eventStartDate: eventDate,
        eventEndDate: eventDate,

        // Customer (primary attendee)
        customerName: `${args.primaryAttendee.firstName} ${args.primaryAttendee.lastName}`,
        customerEmail: args.primaryAttendee.email,
        customerPhone: args.primaryAttendee.phone,

        // Payer (same as customer for individual bookings)
        payerType: "individual" as const,

        // Financial (from backend product object)
        amountInCents: priceInCents * allAttendees.length,
        currency: currency,
        quantity: allAttendees.length,

        // Payment (free events auto-paid)
        paymentMethod: priceInCents === 0 ? "free" : "pending",
        paymentStatus: priceInCents === 0 ? "paid" : "pending",
      }
    );

    console.log(`✅ Created transaction ${transactionId} for ${allAttendees.length} attendees`);

    // 6. Create Tickets (one per attendee)
    const tickets: Array<{
      ticketId: Id<"objects">;
      attendeeName: string;
      attendeeEmail?: string;
      attendeePhone: string;
      isPrimary: boolean;
      qrCode: string;
    }> = [];

    for (const attendee of allAttendees) {
      const ticketId = await ctx.runMutation(
        internal.ticketOntology.createTicketInternal,
        {
          organizationId: args.organizationId,
          productId: args.productId,
          eventId: args.eventId,
          holderName: `${attendee.firstName} ${attendee.lastName}`,
          holderEmail: attendee.email || `${attendee.firstName.toLowerCase()}.${attendee.lastName.toLowerCase()}@temp.gg`,
          customProperties: {
            holderPhone: attendee.phone,
            bookingSource: args.source,
            frontendRsvpId: args.frontendRsvpId,
            transactionId: transactionId,
          },
          userId: systemUser._id,
        }
      );

      tickets.push({
        ticketId,
        attendeeName: `${attendee.firstName} ${attendee.lastName}`,
        attendeeEmail: attendee.email,
        attendeePhone: attendee.phone,
        isPrimary: attendee.isPrimary,
        qrCode: ticketId, // Use ticket ID as QR code data
      });

      console.log(`✅ Created ticket ${ticketId} for ${attendee.firstName} ${attendee.lastName}`);
    }

    // 7. Create Purchase Items (one per ticket)
    const purchaseItemIds: Id<"objects">[] = [];
    const totalAmount = priceInCents * allAttendees.length;

    for (let i = 0; i < tickets.length; i++) {
      const attendee = allAttendees[i];
      const ticket = tickets[i];

      const { purchaseItemIds: itemIds } = await ctx.runMutation(
        internal.purchaseOntology.createPurchaseItemInternal,
        {
          organizationId: args.organizationId,
          checkoutSessionId: transactionId, // Link to transaction
          productId: args.productId,
          quantity: 1,
          pricePerUnit: totalAmount / allAttendees.length,
          totalPrice: totalAmount / allAttendees.length,
          buyerEmail: attendee.email || `${attendee.firstName.toLowerCase()}@temp.gg`,
          buyerName: `${attendee.firstName} ${attendee.lastName}`,
          buyerPhone: attendee.phone,
          fulfillmentType: "ticket",
          registrationData: {
            eventId: args.eventId,
            eventName: eventName,
            eventDate: eventDate,
            source: args.source,
          },
          userId: systemUser._id,
        }
      );

      purchaseItemIds.push(...itemIds);

      // Link purchase item to ticket
      await ctx.runMutation(
        internal.purchaseOntology.updatePurchaseItemFulfillmentInternal,
        {
          purchaseItemId: itemIds[0],
          fulfillmentData: {
            ticketId: ticket.ticketId,
            ticketCode: ticket.qrCode,
            eventId: args.eventId,
            eventDate: eventDate,
          },
        }
      );

      console.log(`✅ Created purchase item ${itemIds[0]} linked to ticket ${ticket.ticketId}`);
    }

    // 8. Create CRM Contacts (for all attendees)
    const crmContacts: Array<{
      contactId: Id<"objects">;
      email: string;
      isPrimary: boolean;
    }> = [];

    for (const attendee of allAttendees) {
      // Build tags
      const tags = ["GG"]; // Base tag for Geschlossene Gesellschaft
      if (!attendee.isPrimary) {
        tags.push("guest");
      }

      try {
        // Create CRM contact via API (uses existing CRM integration)
        const contactResult = await ctx.runMutation(
          internal.api.v1.crmInternal.createContactFromEventInternal,
          {
            organizationId: args.organizationId,
            eventId: args.eventId,
            eventName: eventName,
            eventDate: eventDate,
            attendeeInfo: {
              firstName: attendee.firstName,
              lastName: attendee.lastName,
              email: attendee.email || `${attendee.firstName.toLowerCase()}.${attendee.lastName.toLowerCase()}@temp.gg`,
              phone: attendee.phone,
              tags: tags,
            },
            performedBy: systemUser._id,
          }
        );

        if (contactResult.contactId) {
          crmContacts.push({
            contactId: contactResult.contactId as Id<"objects">,
            email: attendee.email || "",
            isPrimary: attendee.isPrimary,
          });
          console.log(`✅ Created CRM contact ${contactResult.contactId}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create CRM contact for ${attendee.firstName}:`, error);
        // Don't fail the entire booking if CRM fails
      }
    }

    // 9. Return complete booking data
    return {
      success: true,
      bookingId: transactionId,
      transactionId: transactionId,
      tickets: tickets,
      purchaseItemIds: purchaseItemIds,
      crmContacts: crmContacts,
      totalAttendees: allAttendees.length,
      createdAt: Date.now(),
    };
  },
});
