/**
 * TRANSACTION CREATION HELPERS
 *
 * Shared utilities for creating transactions across all payment providers.
 * ALWAYS call these after creating tickets/items to ensure transactions are recorded.
 *
 * Key Features:
 * - Universal transaction creation for ANY payment method
 * - Fetches complete product/event context automatically
 * - Handles B2B (organization payer) and B2C (individual payer)
 * - Links transactions to tickets for easy reference
 *
 * Usage Pattern:
 * 1. Payment provider processes payment and creates tickets
 * 2. Payment provider calls createTransactionsForPurchase()
 * 3. Transactions are created with complete context
 * 4. Transactions are linked to tickets
 */

import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * CREATE TRANSACTIONS FOR PURCHASE
 *
 * Universal transaction creator for any payment method.
 * Call this after creating tickets/items in ANY payment provider.
 *
 * This function:
 * - Fetches product details for each item
 * - Fetches event details if product is a ticket
 * - Determines transaction subtype (ticket/product/service)
 * - Creates transaction with complete context
 * - Handles both B2B and B2C transactions
 *
 * @param ctx - Action context
 * @param params - Purchase details
 * @returns Array of created transaction IDs
 *
 * @example
 * ```typescript
 * // After creating tickets in Stripe provider:
 * const transactionIds = await createTransactionsForPurchase(ctx, {
 *   organizationId: args.organizationId,
 *   checkoutSessionId: args.checkoutSessionId,
 *   purchasedItems: ticketIds.map((ticketId, i) => ({
 *     ticketId,
 *     productId: selectedProducts[i].productId,
 *     quantity: 1,
 *     pricePerUnit: selectedProducts[i].priceInCents,
 *     totalPrice: selectedProducts[i].priceInCents,
 *   })),
 *   customerInfo: {
 *     name: customerName,
 *     email: customerEmail,
 *     phone: customerPhone,
 *   },
 *   paymentInfo: {
 *     method: "stripe",
 *     status: "paid",
 *     intentId: paymentIntent.id,
 *   },
 * });
 * ```
 */
export async function createTransactionsForPurchase(
  ctx: ActionCtx,
  params: {
    organizationId: Id<"organizations">;
    checkoutSessionId: Id<"objects">;
    purchasedItems: Array<{
      ticketId?: Id<"objects">;
      productId: Id<"objects">;
      quantity: number;
      pricePerUnit: number;
      totalPrice: number;
    }>;
    customerInfo: {
      name: string;
      email: string;
      phone?: string;
    };
    paymentInfo: {
      method: "stripe" | "invoice" | "paypal" | "free";
      status: "paid" | "pending" | "awaiting_employer_payment";
      intentId?: string; // Stripe payment intent or "invoice"
    };
    billingInfo?: {
      crmOrganizationId?: Id<"objects">;
      employerId?: string;
      employerName?: string;
    };
  }
): Promise<Id<"objects">[]> {
  const transactionIds: Id<"objects">[] = [];

  console.log(`📝 [createTransactionsForPurchase] Creating ${params.purchasedItems.length} transactions`);
  console.log(`   Payment Method: ${params.paymentInfo.method}`);
  console.log(`   Payment Status: ${params.paymentInfo.status}`);
  console.log(`   Customer: ${params.customerInfo.name} (${params.customerInfo.email})`);

  for (const item of params.purchasedItems) {
    // 1. Fetch product details
    const product = await ctx.runQuery(internal.productOntology.getProductInternal, {
      productId: item.productId,
    });

    if (!product) {
      console.error(`❌ [createTransactionsForPurchase] Product ${item.productId} not found, skipping transaction`);
      continue;
    }

    console.log(`   Product: ${product.name} (${product.subtype})`);

    // 2. Determine transaction subtype based on product
    let subtype: "ticket_purchase" | "product_purchase" | "service_purchase" = "product_purchase";
    if (product.subtype === "ticket") {
      subtype = "ticket_purchase";
    } else if (product.subtype === "service") {
      subtype = "service_purchase";
    }

    // 3. Fetch event details if product is a ticket
    let eventId: Id<"objects"> | undefined;
    let eventName: string | undefined;
    let eventLocation: string | undefined;
    let eventStartDate: number | undefined;
    let eventEndDate: number | undefined;
    let eventSponsors: Array<{ name: string; level?: string; logoUrl?: string }> | undefined;

    if (product.subtype === "ticket" && product.customProperties?.eventId) {
      // Get event from product's eventId
      const eventIdFromProduct = product.customProperties.eventId as Id<"objects">;
      const event = await ctx.runQuery(internal.eventOntology.getEventInternal, {
        eventId: eventIdFromProduct,
      });

      if (event && event.type === "event") {
        eventId = event._id;
        eventName = event.name;
        eventLocation = event.customProperties?.location as string;
        eventStartDate = event.customProperties?.startDate as number;
        eventEndDate = event.customProperties?.endDate as number;

        console.log(`   Event: ${eventName} at ${eventLocation}`);

        // Fetch event sponsors if applicable
        // Note: We need to query objectLinks to get sponsors
        // For now, we'll skip this to avoid creating a new internal query
        // This can be added later if needed
        eventSponsors = undefined; // TODO: Add getEventSponsorsInternal if needed
      }
    }

    // 4. Determine payer info
    const payerType = params.billingInfo?.crmOrganizationId ? "organization" : "individual";
    const payerId = params.billingInfo?.crmOrganizationId;

    if (payerType === "organization") {
      console.log(`   Payer: ${params.billingInfo?.employerName} (B2B)`);
    } else {
      console.log(`   Payer: ${params.customerInfo.name} (B2C)`);
    }

    // 5. Create transaction
    const transactionId = await ctx.runMutation(
      internal.transactionOntology.createTransactionInternal,
      {
        organizationId: params.organizationId,
        subtype,

        // Product info
        productId: product._id,
        productName: product.name,
        productDescription: product.description,
        productSubtype: product.subtype,

        // Event info (if applicable)
        eventId,
        eventName,
        eventLocation,
        eventStartDate,
        eventEndDate,
        eventSponsors,

        // Links
        ticketId: item.ticketId,
        checkoutSessionId: params.checkoutSessionId,

        // Customer
        customerName: params.customerInfo.name,
        customerEmail: params.customerInfo.email,
        customerPhone: params.customerInfo.phone,

        // Payer (B2B vs B2C)
        payerType,
        payerId,
        crmOrganizationId: params.billingInfo?.crmOrganizationId,
        employerId: params.billingInfo?.employerId,
        employerName: params.billingInfo?.employerName,

        // Financial
        amountInCents: item.totalPrice,
        currency: "EUR",
        quantity: item.quantity,
        taxRatePercent: 19, // German VAT

        // Payment status
        paymentMethod: params.paymentInfo.method,
        paymentStatus: params.paymentInfo.status,
        paymentIntentId: params.paymentInfo.intentId,
      }
    );

    transactionIds.push(transactionId);

    console.log(`✅ [createTransactionsForPurchase] Created transaction ${transactionId} for product ${product.name}`);
  }

  console.log(`🎉 [createTransactionsForPurchase] Created ${transactionIds.length} transactions total`);

  return transactionIds;
}

/**
 * LINK TRANSACTIONS TO TICKETS
 *
 * Update tickets with their transaction IDs for easy reference.
 * Creates bidirectional link between tickets and transactions.
 *
 * This allows:
 * - Finding transaction from ticket (ticket.customProperties.transactionId)
 * - Finding ticket from transaction (transaction.ticketId)
 *
 * @param ctx - Action context
 * @param links - Array of ticket-transaction pairs
 *
 * @example
 * ```typescript
 * await linkTransactionsToTickets(ctx,
 *   ticketIds.map((ticketId, i) => ({
 *     ticketId,
 *     transactionId: transactionIds[i],
 *   }))
 * );
 * ```
 */
export async function linkTransactionsToTickets(
  ctx: ActionCtx,
  links: Array<{
    ticketId: Id<"objects">;
    transactionId: Id<"objects">;
  }>
): Promise<void> {
  console.log(`🔗 [linkTransactionsToTickets] Linking ${links.length} transactions to tickets`);

  for (const link of links) {
    // Get the ticket to update its customProperties
    const ticket = await ctx.runQuery(internal.ticketOntology.getTicketInternal, {
      ticketId: link.ticketId,
    });

    if (!ticket) {
      console.error(`❌ [linkTransactionsToTickets] Ticket ${link.ticketId} not found, skipping link`);
      continue;
    }

    // Update ticket with transaction ID
    await ctx.runMutation(internal.ticketOntology.updateTicketInternal, {
      ticketId: link.ticketId,
      customProperties: {
        ...ticket.customProperties,
        transactionId: link.transactionId,
      },
    });

    console.log(`   ✓ Linked transaction ${link.transactionId} to ticket ${link.ticketId}`);
  }

  console.log(`✅ [linkTransactionsToTickets] Successfully linked all transactions to tickets`);
}
