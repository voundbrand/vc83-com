/**
 * BEHAVIOR: CREATE TRANSACTION (Behavior 7 - CRITICAL!)
 *
 * Creates the audit trail transaction that links customer → payer → ticket.
 * This is THE CRITICAL behavior that enables B2B invoicing.
 *
 * Priority: 48
 *
 * Creates transaction with:
 * - Customer info (ticket holder)
 * - Payer info (may differ in B2B)
 * - Event context
 * - Product context
 * - Payment status based on billingMethod
 *
 * Returns:
 * - transactionId: ID of created transaction
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export const executeCreateTransaction = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    config: v.any(),
    context: v.any(),
  },
  handler: async (ctx, args) => {
    console.log("✓ [Behavior 7/12] Create Transaction (CRITICAL - Audit Trail)");

    const context = args.context as {
      productId?: string;
      eventId?: string;
      customerData?: {
        email?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
      };
      transactionData?: {
        price?: number;
        currency?: string;
        quantity?: number;
      };
      billingMethod?: string;
      employerName?: string;
      crmOrganizationId?: string;
      contactId?: string;
      ticketId?: string;
    };

    // Validate required fields
    if (!context.productId || !context.eventId) {
      return {
        success: false,
        error: "Product ID and Event ID are required",
      };
    }

    if (!context.customerData?.email || !context.customerData?.firstName || !context.customerData?.lastName) {
      return {
        success: false,
        error: "Customer data is required",
      };
    }

    if (!context.transactionData?.price) {
      return {
        success: false,
        error: "Transaction price is required",
      };
    }

    // Get product and event details
    const product: any = await ctx.runQuery(internal.api.v1.productsInternal.getProductInternal, {
      productId: context.productId as Id<"objects">,
      organizationId: args.organizationId,
    });

    const event: any = await ctx.runQuery(internal.api.v1.eventsInternal.getEventByIdInternal, {
      eventId: context.eventId as Id<"objects">,
      organizationId: args.organizationId,
    });

    if (!product || !event) {
      return {
        success: false,
        error: "Product or Event not found",
      };
    }

    // Build customer info
    const customerName = `${context.customerData.firstName} ${context.customerData.lastName}`;
    const customerEmail = context.customerData.email;

    // Determine payer based on billing method
    const billingMethod = context.billingMethod || "customer_payment";
    const payerType: "individual" | "organization" = billingMethod === "employer_invoice" ? "organization" : "individual";

    // Determine payment status based on billing method
    let paymentStatus: string;
    if (billingMethod === "free") {
      paymentStatus = "completed";
    } else if (billingMethod === "employer_invoice") {
      paymentStatus = "awaiting_employer_payment";
    } else {
      paymentStatus = "paid"; // Customer payment (already paid or invoiced)
    }

    console.log(`Creating transaction with payer type: ${payerType}, status: ${paymentStatus}`);

    // Create transaction using internal mutation
    const transactionId: Id<"objects"> = await ctx.runMutation(internal.transactionOntology.createTransactionInternal, {
      organizationId: args.organizationId,
      subtype: "ticket_purchase",

      // Product context
      productId: context.productId as Id<"objects">,
      productName: product.name,
      productDescription: product.description,
      productSubtype: product.subtype,

      // Event context
      eventId: context.eventId as Id<"objects">,
      eventName: event.name,
      eventLocation: event.customProperties?.location,
      eventStartDate: event.customProperties?.startDate,
      eventEndDate: event.customProperties?.endDate,

      // Links
      ticketId: context.ticketId as Id<"objects"> | undefined,

      // Customer (who receives)
      customerName,
      customerEmail,
      customerPhone: context.customerData.phone,
      customerId: context.contactId as Id<"objects"> | undefined,

      // Payer (who pays - may differ in B2B)
      payerType,
      payerId: context.crmOrganizationId as Id<"objects"> | undefined,
      crmOrganizationId: context.crmOrganizationId as Id<"objects"> | undefined,
      employerName: context.employerName,

      // Financial
      amountInCents: context.transactionData.price,
      currency: context.transactionData.currency || "EUR",
      quantity: context.transactionData.quantity || 1,
      taxRatePercent: 19, // German VAT

      // Payment
      paymentMethod: billingMethod === "employer_invoice" ? "invoice" : "stripe",
      paymentStatus,
    });

    console.log(`✅ Transaction created: ${transactionId}`);
    console.log(`   Customer: ${customerName} (${customerEmail})`);
    console.log(`   Payer: ${payerType} ${context.employerName || customerName}`);
    console.log(`   Amount: €${(context.transactionData.price / 100).toFixed(2)}`);
    console.log(`   Payment Status: ${paymentStatus}`);

    return {
      success: true,
      message: `Transaction created successfully`,
      data: {
        transactionId,
        customerName,
        customerEmail,
        payerType,
        employerName: context.employerName,
        amountInCents: context.transactionData.price,
        paymentStatus,
      },
    };
  },
});
