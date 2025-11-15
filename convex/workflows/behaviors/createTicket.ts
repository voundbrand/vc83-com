/**
 * BEHAVIOR: CREATE TICKET (Behavior 6)
 *
 * Creates an event ticket with ALL logistics in customProperties.
 * Uses createTicketInternal mutation.
 *
 * Priority: 50
 *
 * Stores in customProperties:
 * - arrivalTime, activityDay2, bbqAttendance
 * - accommodationNeeds, dietaryRequirements, specialRequests
 * - ucraParticipants, billingMethod, billingAddress
 *
 * Returns:
 * - ticketId: ID of created ticket
 * - ticketNumber: Human-readable ticket number
 * - qrCode: QR code for check-in
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export const executeCreateTicket = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    config: v.any(),
    context: v.any(),
  },
  handler: async (ctx, args) => {
    console.log("✓ [Behavior 6/12] Create Ticket");

    const context = args.context as {
      productId?: string;
      eventId?: string;
      customerData?: {
        email?: string;
        firstName?: string;
        lastName?: string;
      };
      formResponses?: Record<string, unknown>;
      billingMethod?: string;
      billingAddress?: string;
      contactId?: string;
    };

    if (!context.productId || !context.eventId) {
      return {
        success: false,
        error: "Product ID and Event ID are required",
      };
    }

    if (!context.customerData?.email || !context.customerData?.firstName || !context.customerData?.lastName) {
      return {
        success: false,
        error: "Customer data is required (email, firstName, lastName)",
      };
    }

    const holderName = `${context.customerData.firstName} ${context.customerData.lastName}`;
    const holderEmail = context.customerData.email;

    // Build custom properties with ALL logistics
    const customProperties = {
      // Logistics from form
      arrivalTime: context.formResponses?.arrival_time,
      activityDay2: context.formResponses?.activity_day2,
      bbqAttendance: context.formResponses?.bbq_attendance,
      accommodationNeeds: context.formResponses?.accommodation_needs,
      dietaryRequirements: context.formResponses?.dietary_requirements,
      specialRequests: context.formResponses?.special_requests,
      ucraParticipants: context.formResponses?.ucra_participants,

      // Billing info
      billingMethod: context.billingMethod,
      billingAddress: context.billingAddress,

      // Attendee category
      attendeeCategory: context.formResponses?.attendee_category,

      // Link to contact
      contactId: context.contactId,

      // Additional metadata
      registrationSource: "api_workflow",
      registeredAt: Date.now(),
    };

    // Use a fixed system user ID
    const systemUserId: Id<"users"> = "k1system000000000000000000" as Id<"users">;

    // Create ticket using internal mutation
    const ticketId: Id<"objects"> = await ctx.runMutation(internal.ticketOntology.createTicketInternal, {
      organizationId: args.organizationId,
      productId: context.productId as Id<"objects">,
      eventId: context.eventId as Id<"objects">,
      holderName,
      holderEmail,
      customProperties,
      userId: systemUserId,
    });

    // Generate ticket number (readable format)
    const ticketNumber: string = `TKT-${Date.now()}-${ticketId.substring(0, 8)}`;

    console.log(`✅ Ticket created: ${ticketNumber}`);

    return {
      success: true,
      message: `Ticket created: ${ticketNumber}`,
      data: {
        ticketId,
        ticketNumber,
        qrCode: `QR-${ticketId}`, // Simplified QR code
        holderName,
        holderEmail,
      },
    };
  },
});
