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
const generatedApi: any = require("../../_generated/api");
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
      products?: Array<{
        productId: string;
        quantity: number;
      }>;
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
      frontendUserId?: string; // From create-contact behavior
      transactionData?: {
        price?: number;
        breakdown?: {
          products?: Array<{
            productId: string;
            productName: string;
            quantity: number;
            pricePerUnit: number;
            total: number;
          }>;
        };
      };
    };

    if (!context.products || context.products.length === 0 || !context.eventId) {
      return {
        success: false,
        error: "At least one product and Event ID are required",
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

    // Build products array for ticket (from transaction breakdown if available)
    const ticketProducts = context.transactionData?.breakdown?.products || context.products.map((p) => ({
      productId: p.productId,
      quantity: p.quantity,
      pricePerUnit: 0,
      total: 0,
    }));

    // Build custom properties with ALL logistics + products
    const customProperties = {
      // Products purchased (for multi-product support)
      products: ticketProducts,
      totalPrice: context.transactionData?.price,

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

    let ticketId: Id<"objects">;

    // DRY-RUN MODE: Skip actual database write
    if (args.config?.dryRun) {
      ticketId = `dryrun_ticket_${Date.now()}` as Id<"objects">;
      console.log(`🧪 [DRY RUN] Would create ticket for: ${holderEmail}`);
    } else {
      // Create ticket using internal mutation (PRODUCTION)
      // Note: Use first non-addon product for productId field (legacy compatibility)
      const realProductId = context.products.find(p => !p.productId.startsWith("addon-"))?.productId;

      if (!realProductId) {
        return {
          success: false,
          error: "At least one non-addon product is required",
        };
      }

      ticketId = await (ctx as any).runMutation(generatedApi.internal.ticketOntology.createTicketInternal, {
        organizationId: args.organizationId,
        productId: realProductId as Id<"objects">,
        eventId: context.eventId as Id<"objects">,
        holderName,
        holderEmail,
        customProperties,
        userId: context.frontendUserId as Id<"objects"> | undefined, // Frontend user (dormant account)
      });
    }

    // Generate ticket number (readable format)
    const ticketNumber: string = `TKT-${Date.now()}-${ticketId.substring(0, 8)}`;

    console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✅'} Ticket created: ${ticketNumber}`);
    console.log(`   Products: ${ticketProducts.length}`);
    ticketProducts.forEach((p: { productName?: string; productId: string; quantity: number }) => {
      console.log(`     - ${p.productName || p.productId} × ${p.quantity}`);
    });

    return {
      success: true,
      message: `Ticket created: ${ticketNumber}${args.config?.dryRun ? ' (dry run)' : ''}`,
      data: {
        ticketId,
        ticketNumber,
        qrCode: `QR-${ticketId}`, // Simplified QR code
        holderName,
        holderEmail,
        customProperties,
      },
    };
  },
});
