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
    // Tax information from checkout session (from Stripe Tax or manual calculation)
    taxInfo?: {
      taxRatePercent: number;
      currency: string;
      // Tax behavior: "inclusive" means prices already include tax, "exclusive" means tax is added on top
      taxBehavior?: "inclusive" | "exclusive";
    };
  }
): Promise<Id<"objects">[]> {
  console.log(`📝 [createTransactionsForPurchase] Creating transaction for checkout with ${params.purchasedItems.length} items`);
  console.log(`   Payment Method: ${params.paymentInfo.method}`);
  console.log(`   Payment Status: ${params.paymentInfo.status}`);
  console.log(`   Customer: ${params.customerInfo.name} (${params.customerInfo.email})`);

  // NEW APPROACH: Build lineItems array for ALL products
  const lineItems = await Promise.all(
    params.purchasedItems.map(async (item) => {
      // 1. Fetch product details
      const product = await ctx.runQuery(internal.productOntology.getProductInternal, {
        productId: item.productId,
      });

      if (!product) {
        console.error(`❌ [createTransactionsForPurchase] Product ${item.productId} not found, skipping`);
        return null;
      }

      console.log(`   Product: ${product.name} (${product.subtype}) - Qty: ${item.quantity}`);

      // 2. Fetch event details if product is a ticket
      let eventId: Id<"objects"> | undefined;
      let eventName: string | undefined;
      let eventLocation: string | undefined;
      let eventStartDate: number | undefined;
      let eventEndDate: number | undefined;

      if (product.subtype === "ticket" && product.customProperties?.eventId) {
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
        }
      }

      // 3. Calculate tax for this line item
      // Priority: product taxBehavior > organization defaultTaxBehavior
      const taxRatePercent = params.taxInfo?.taxRatePercent || 19;
      
      // Check product's taxBehavior first, then fall back to organization default
      // Priority: product taxBehavior > organization defaultTaxBehavior
      const productTaxBehavior = product.customProperties?.taxBehavior as "inclusive" | "exclusive" | "automatic" | undefined;
      const orgTaxBehavior = params.taxInfo?.taxBehavior || "inclusive"; // Organization default (fallback)
      // Use product taxBehavior if set, otherwise use organization default
      // Note: "automatic" will be treated as "exclusive" in the calculation below
      const taxBehavior = productTaxBehavior || orgTaxBehavior;

      console.log(`   Tax behavior: Product=${productTaxBehavior || "none"}, Org=${orgTaxBehavior}, Using=${taxBehavior}`);

      let unitPriceInCents: number;
      let totalPriceInCents: number;
      let taxAmountInCents: number;

      if (taxBehavior === "inclusive") {
        // Prices ALREADY include tax - extract tax from price
        // Formula: tax = gross * rate / (100 + rate)
        totalPriceInCents = item.totalPrice; // This IS the gross (tax-included) price
        taxAmountInCents = Math.round((item.totalPrice * taxRatePercent) / (100 + taxRatePercent));
        unitPriceInCents = Math.round((item.pricePerUnit * 100) / (100 + taxRatePercent)); // Net price per unit

        console.log(`   Tax behavior: INCLUSIVE - Price €${(item.totalPrice / 100).toFixed(2)} includes €${(taxAmountInCents / 100).toFixed(2)} tax`);
      } else {
        // Prices are NET (excluding tax) - add tax on top
        // This handles both "exclusive" and "automatic" (automatic treated as exclusive)
        // Formula: tax = net * rate / 100
        taxAmountInCents = Math.round((item.totalPrice * taxRatePercent) / 100);
        totalPriceInCents = item.totalPrice + taxAmountInCents; // Add tax to get gross
        unitPriceInCents = item.pricePerUnit; // Already net

        const behaviorLabel = taxBehavior === "automatic" ? "AUTOMATIC (treated as exclusive)" : "EXCLUSIVE";
        console.log(`   Tax behavior: ${behaviorLabel} - Price €${(item.totalPrice / 100).toFixed(2)} + €${(taxAmountInCents / 100).toFixed(2)} tax`);
      }

      // 4. Build line item
      return {
        productId: product._id,
        productName: product.name,
        productDescription: product.description,
        productSubtype: product.subtype,
        quantity: item.quantity,
        unitPriceInCents, // Net price per unit (excluding tax)
        totalPriceInCents, // Gross total (including tax)
        taxRatePercent,
        taxAmountInCents,
        taxBehavior, // Store for reference
        ticketId: item.ticketId,
        eventId,
        eventName,
        eventLocation,
        eventStartDate,
        eventEndDate,
      };
    })
  );

  // Filter out any null items (products not found)
  const validLineItems = lineItems.filter((item): item is NonNullable<typeof item> => item !== null);

  if (validLineItems.length === 0) {
    console.error(`❌ [createTransactionsForPurchase] No valid products found, cannot create transaction`);
    return [];
  }

  // 5. Calculate aggregate totals
  const subtotalInCents = validLineItems.reduce((sum, item) => sum + (item.unitPriceInCents * item.quantity), 0); // Net subtotal (before tax)
  const taxAmountInCents = validLineItems.reduce((sum, item) => sum + item.taxAmountInCents, 0);
  const totalInCents = subtotalInCents + taxAmountInCents; // Gross total (net + tax)

  console.log(`💰 Transaction Totals:`);
  console.log(`   Subtotal: €${(subtotalInCents / 100).toFixed(2)}`);
  console.log(`   Tax (${params.taxInfo?.taxRatePercent || 19}%): €${(taxAmountInCents / 100).toFixed(2)}`);
  console.log(`   Total: €${(totalInCents / 100).toFixed(2)}`);

  // 6. Determine transaction subtype based on primary product
  const primaryProduct = validLineItems[0];
  let subtype: "ticket_purchase" | "product_purchase" | "service_purchase" = "product_purchase";
  if (primaryProduct.productSubtype === "ticket") {
    subtype = "ticket_purchase";
  } else if (primaryProduct.productSubtype === "service") {
    subtype = "service_purchase";
  }

  // 7. Determine payer info
  const payerType = params.billingInfo?.crmOrganizationId ? "organization" : "individual";
  const payerId = params.billingInfo?.crmOrganizationId;

  if (payerType === "organization") {
    console.log(`   Payer: ${params.billingInfo?.employerName} (B2B)`);
  } else {
    console.log(`   Payer: ${params.customerInfo.name} (B2C)`);
  }

  // 8. Create SINGLE transaction with ALL line items
  const transactionId = await ctx.runMutation(
    internal.transactionOntology.createTransactionInternal,
    {
      organizationId: params.organizationId,
      subtype,

      // NEW: Line items array
      lineItems: validLineItems,

      // NEW: Aggregate totals
      subtotalInCents,
      taxAmountInCents,
      totalInCents,

      // Links
      checkoutSessionId: params.checkoutSessionId,

      // Customer info
      customerName: params.customerInfo.name,
      customerEmail: params.customerInfo.email,
      customerPhone: params.customerInfo.phone,

      // Payer info (B2B vs B2C)
      payerType,
      payerId,
      crmOrganizationId: params.billingInfo?.crmOrganizationId,
      employerId: params.billingInfo?.employerId,
      employerName: params.billingInfo?.employerName,

      // Currency and payment
      currency: params.taxInfo?.currency || "EUR",
      paymentMethod: params.paymentInfo.method,
      paymentStatus: params.paymentInfo.status,
      paymentIntentId: params.paymentInfo.intentId,
    }
  );

  console.log(`✅ [createTransactionsForPurchase] Created single transaction ${transactionId} with ${validLineItems.length} line items`);

  // Return single transaction ID in array for backward compatibility
  return [transactionId];
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
