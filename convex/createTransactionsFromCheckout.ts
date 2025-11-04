/**
 * UNIVERSAL TRANSACTION CREATOR FROM CHECKOUT
 *
 * This action is called after ANY checkout session completes (any payment provider).
 * It creates transaction records for invoicing, regardless of:
 * - Payment method (Stripe, Invoice, PayPal, etc.)
 * - Product type (tickets, merchandise, services, subscriptions)
 * - Transaction type (B2B, B2C)
 *
 * WHEN TO CALL:
 * - After completeCheckoutSessionInternal() succeeds
 * - After payment is verified and items are created (tickets, purchases, etc.)
 *
 * WHAT IT DOES:
 * - Fetches complete context from checkout session
 * - Creates one transaction per purchased product
 * - Links transactions to tickets (if applicable)
 * - Handles both B2B and B2C scenarios
 *
 * @module createTransactionsFromCheckout
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { createTransactionsForPurchase, linkTransactionsToTickets } from "./transactionHelpers";

/**
 * CREATE TRANSACTIONS FROM COMPLETED CHECKOUT
 *
 * Universal transaction creator for ANY payment provider and product type.
 * Call this action after checkout session is completed and items are created.
 *
 * @param checkoutSessionId - The completed checkout session
 * @returns Array of created transaction IDs
 *
 * @example
 * ```typescript
 * // In payment provider action after completing checkout:
 * await ctx.runAction(internal.createTransactionsFromCheckout.createTransactionsFromCheckout, {
 *   checkoutSessionId: args.checkoutSessionId
 * });
 * ```
 */
export const createTransactionsFromCheckout = internalAction({
  args: {
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    transactionIds: Id<"objects">[];
    count: number;
  }> => {
    console.log(`📝 [createTransactionsFromCheckout] Starting transaction creation for checkout ${args.checkoutSessionId}`);

    // 1. Fetch the completed checkout session
    const session = await ctx.runQuery(internal.checkoutSessionOntology.getCheckoutSessionInternal, {
      checkoutSessionId: args.checkoutSessionId,
    });

    if (!session || session.type !== "checkout_session") {
      throw new Error("Checkout session not found");
    }

    if (session.status !== "completed") {
      console.warn(`⚠️  [createTransactionsFromCheckout] Checkout session is not completed (status: ${session.status})`);
      return { success: false, transactionIds: [], count: 0 };
    }

    console.log(`✓ Checkout session status: ${session.status}`);
    console.log(`✓ Payment method: ${session.customProperties?.paymentMethod || "unknown"}`);

    // 2. Extract purchased items from session
    const selectedProducts = (session.customProperties?.selectedProducts as Array<{
      productId: Id<"objects">;
      quantity: number;
      pricePerUnit?: number;
      priceInCents?: number;
      totalPrice?: number;
    }>) || [];

    if (selectedProducts.length === 0) {
      console.log(`ℹ️  [createTransactionsFromCheckout] No products in session, skipping transaction creation`);
      return { success: true, transactionIds: [], count: 0 };
    }

    console.log(`✓ Found ${selectedProducts.length} products to create transactions for`);

    // 3. Extract customer info
    const customerName = (session.customProperties?.customerName as string) || "Unknown Customer";
    const customerEmail = (session.customProperties?.customerEmail as string) || "";
    const customerPhone = (session.customProperties?.customerPhone as string) || undefined;

    console.log(`✓ Customer: ${customerName} (${customerEmail})`);

    // 4. Determine payment info
    const paymentMethod = (session.customProperties?.paymentMethod as "stripe" | "invoice" | "paypal" | "free") || "stripe";
    const paymentIntentId = (session.customProperties?.paymentIntentId as string) || undefined;

    // Determine payment status based on payment method
    let paymentStatus: "paid" | "pending" | "awaiting_employer_payment" = "paid";
    if (paymentMethod === "invoice") {
      paymentStatus = "awaiting_employer_payment";
    } else if (session.customProperties?.paymentStatus === "pending") {
      paymentStatus = "pending";
    }

    console.log(`✓ Payment: ${paymentMethod} (${paymentStatus})`);

    // 5. Extract billing info (B2B vs B2C)
    const crmOrganizationId = session.customProperties?.crmOrganizationId as Id<"objects"> | undefined;
    const employerName = session.customProperties?.companyName as string | undefined;
    const employerId = session.customProperties?.employerId as string | undefined;

    const billingInfo = crmOrganizationId ? {
      crmOrganizationId,
      employerId: employerId || crmOrganizationId,
      employerName: employerName || "Unknown Organization",
    } : undefined;

    if (billingInfo) {
      console.log(`✓ B2B Transaction: ${billingInfo.employerName}`);
    } else {
      console.log(`✓ B2C Transaction`);
    }

    // 6. Fetch purchase items to get ticket IDs (if applicable)
    const purchasedItemIds = (session.customProperties?.purchasedItemIds as string[]) || [];
    console.log(`✓ Found ${purchasedItemIds.length} purchase items`);

    // Fetch purchase items to map products to tickets
    const purchaseItems = await Promise.all(
      purchasedItemIds.map(async (id) => {
        try {
          return await ctx.runQuery(internal.purchaseOntology.getPurchaseItemInternal, {
            purchaseItemId: id as Id<"objects">,
          });
        } catch (err) {
          console.error(`Failed to fetch purchase item ${id}:`, err);
          return null;
        }
      })
    );

    // Map products to their ticket IDs (if they have tickets)
    const productToTicketMap = new Map<string, Id<"objects">>();
    for (const item of purchaseItems) {
      if (item && item.customProperties?.fulfillmentData) {
        const fulfillmentData = item.customProperties.fulfillmentData as { ticketId?: Id<"objects"> };
        if (fulfillmentData.ticketId) {
          const productId = item.customProperties.productId as Id<"objects">;
          productToTicketMap.set(productId, fulfillmentData.ticketId);
        }
      }
    }

    console.log(`✓ Mapped ${productToTicketMap.size} products to tickets`);

    // 7. Create transactions using helper
    const purchasedItems = selectedProducts.map((product) => {
      const priceInCents = product.priceInCents || product.pricePerUnit || product.totalPrice || 0;
      const ticketId = productToTicketMap.get(product.productId);

      return {
        ticketId,
        productId: product.productId,
        quantity: product.quantity || 1,
        pricePerUnit: priceInCents,
        totalPrice: priceInCents * (product.quantity || 1),
      };
    });

    const transactionIds = await createTransactionsForPurchase(ctx, {
      organizationId: session.organizationId,
      checkoutSessionId: args.checkoutSessionId,
      purchasedItems,
      customerInfo: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      paymentInfo: {
        method: paymentMethod,
        status: paymentStatus,
        intentId: paymentIntentId,
      },
      billingInfo,
    });

    console.log(`✅ [createTransactionsFromCheckout] Created ${transactionIds.length} transactions`);

    // 8. Link transactions to tickets (if applicable)
    const ticketLinks = purchasedItems
      .filter(item => item.ticketId !== undefined)
      .map((item, index) => ({
        ticketId: item.ticketId!,
        transactionId: transactionIds[index],
      }));

    if (ticketLinks.length > 0) {
      await linkTransactionsToTickets(ctx, ticketLinks);
      console.log(`✅ [createTransactionsFromCheckout] Linked ${ticketLinks.length} transactions to tickets`);
    }

    return {
      success: true,
      transactionIds,
      count: transactionIds.length,
    };
  },
});
