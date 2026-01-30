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
import { api, internal } from "./_generated/api";
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
    // Note: Using type cast to avoid deep type instantiation issues with Convex's generated types
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const session = await (ctx as any).runQuery(
      (internal as any).checkoutSessionOntology.getCheckoutSessionInternal,
      { checkoutSessionId: args.checkoutSessionId }
    );

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
          return await (ctx as any).runQuery(
            (internal as any).purchaseOntology.getPurchaseItemInternal,
            { purchaseItemId: id as Id<"objects"> }
          );
        } catch (err) {
          console.error(`Failed to fetch purchase item ${id}:`, err);
          return null;
        }
      })
    );

    // Collect ALL ticket IDs from purchase items
    // (Multiple purchase items may exist per product when quantity > 1)
    const allTicketIds: Id<"objects">[] = [];
    for (const item of purchaseItems) {
      if (item && item.customProperties?.fulfillmentData) {
        const fulfillmentData = item.customProperties.fulfillmentData as { ticketId?: Id<"objects"> };
        if (fulfillmentData.ticketId) {
          allTicketIds.push(fulfillmentData.ticketId);
        }
      }
    }

    console.log(`✓ Found ${allTicketIds.length} tickets to link`);

    // 7. Create transactions using helper
    // Note: ticketId is optional per line item (used for attendee info enrichment)
    // For multiple tickets of the same product, only the first ticket is used for line item enrichment
    // All tickets will be linked to the transaction in step 8
    const purchasedItems = selectedProducts.map((product) => {
      const priceInCents = product.priceInCents || product.pricePerUnit || product.totalPrice || 0;
      // Find first ticket for this product (for line item attendee info)
      const ticketId = purchaseItems.find(
        (pi) => pi?.customProperties?.productId === product.productId &&
                pi?.customProperties?.fulfillmentData?.ticketId
      )?.customProperties?.fulfillmentData?.ticketId as Id<"objects"> | undefined;

      return {
        ticketId,
        productId: product.productId,
        quantity: product.quantity || 1,
        pricePerUnit: priceInCents,
        totalPrice: priceInCents * (product.quantity || 1),
      };
    });

    // Extract tax info from session (populated by Stripe Tax or manual calculation)
    const taxRatePercent = (session.customProperties?.taxRatePercent as number) || 19;
    const currency = (session.customProperties?.currency as string) || "EUR";

    // Fetch organization's tax settings to determine default tax behavior (inclusive vs exclusive)
    // NOTE: Product-level taxBehavior will override this in transactionHelpers.ts
    const taxSettings = await (ctx as any).runQuery(
      (api as any).organizationTaxSettings.getPublicTaxSettings,
      { organizationId: session.organizationId }
    );

    // Tax behavior: "inclusive" = prices include tax, "exclusive" = tax added on top
    // This is the organization default - individual products may override this
    // Default to "inclusive" for EU/DE where prices typically include VAT
    const defaultTaxBehavior = (taxSettings?.defaultTaxBehavior as "inclusive" | "exclusive") || "inclusive";

    console.log(`✓ Tax info: ${taxRatePercent}% in ${currency} (org default: ${defaultTaxBehavior}, products may override)`);

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
      taxInfo: {
        taxRatePercent,
        currency,
        taxBehavior: defaultTaxBehavior, // Organization default - products will override if they have their own taxBehavior
      },
    });

    console.log(`✅ [createTransactionsFromCheckout] Created ${transactionIds.length} transactions`);

    // 8. Link transactions to tickets (if applicable)
    // NOTE: createTransactionsForPurchase creates ONE transaction per checkout (not per item)
    // All tickets in this checkout should link to the same transaction
    const transactionId = transactionIds[0]; // Single transaction per checkout

    if (transactionId && allTicketIds.length > 0) {
      // Link ALL tickets to the single transaction
      const ticketLinks = allTicketIds.map((ticketId) => ({
        ticketId,
        transactionId, // All tickets link to the SAME transaction
      }));

      await linkTransactionsToTickets(ctx, ticketLinks);
      console.log(`✅ [createTransactionsFromCheckout] Linked ${ticketLinks.length} tickets to transaction ${transactionId}`);
    } else if (!transactionId) {
      console.warn("⚠️ [createTransactionsFromCheckout] No transaction created, skipping ticket linking");
    } else {
      console.log("ℹ️ [createTransactionsFromCheckout] No tickets to link");
    }

    // 9. CREATE INVOICE RECORD (NOW that transactions exist!)
    // This must happen AFTER transactions are created
    try {
      const transactionType = (session.customProperties?.transactionType as "B2C" | "B2B") || "B2C";
      const sessionCrmContactId = session.customProperties?.crmContactId as Id<"objects"> | undefined;
      const sessionCrmOrganizationId = session.customProperties?.crmOrganizationId as Id<"objects"> | undefined;
      const isEmployerBilled = !!sessionCrmOrganizationId && session.customProperties?.behaviorContext?.metadata?.isEmployerBilling === true;

      // Get all tickets for invoice linking
      const allTickets = await (ctx as any).runQuery(
        (internal as any).ticketOntology.getTicketsByCheckoutInternal,
        { checkoutSessionId: args.checkoutSessionId }
      ) as Array<{ _id: Id<"objects"> }>;
      const ticketIds = allTickets.map((ticket) => ticket._id);

      // Build customer info for invoice
      const customerInfo = {
        email: customerEmail,
        name: customerName,
        ...(transactionType === "B2B" && {
          companyName: session.customProperties?.companyName as string | undefined,
          vatNumber: session.customProperties?.vatNumber as string | undefined,
          billingAddress: session.customProperties?.billingLine1 ? {
            line1: session.customProperties.billingLine1 as string,
            line2: session.customProperties.billingLine2 as string | undefined,
            city: session.customProperties.billingCity as string,
            state: session.customProperties.billingState as string | undefined,
            postalCode: session.customProperties.billingPostalCode as string,
            country: session.customProperties.billingCountry as string,
          } : undefined,
        }),
      };

      // Calculate total from session
      const totalInCents = session.customProperties?.totalAmount as number || 0;
      const currency = session.customProperties?.currency as string || "EUR";

      // Create invoice record with CRM links
      // isPayLater = true when payment method is "invoice" (pay later via bank transfer)
      // This ensures invoice status is "sent" (awaiting payment) instead of "paid"
      const invoiceResult = await (ctx as any).runMutation(
        (internal as any).invoicingOntology.createSimpleInvoiceFromCheckout,
        {
          checkoutSessionId: args.checkoutSessionId,
          transactionIds, // NOW these exist!
          ticketIds,
          transactionType,
          customerInfo,
          totalInCents,
          currency,
          isEmployerBilled,
          isPayLater: paymentMethod === "invoice", // Invoice payment method = awaiting payment
          crmContactId: sessionCrmContactId,
          crmOrganizationId: sessionCrmOrganizationId,
        }
      ) as { invoiceId: Id<"objects">; invoiceNumber: string };

      // Store invoice ID in session for confirmation page
      await (ctx as any).runMutation(
        (internal as any).checkoutSessionOntology.patchCheckoutSessionInternal,
        {
          checkoutSessionId: args.checkoutSessionId,
          customProperties: {
            ...(session.customProperties || {}),
            invoiceId: invoiceResult.invoiceId,
            invoiceNumber: invoiceResult.invoiceNumber,
          },
        }
      );

      console.log(`✅ [createTransactionsFromCheckout] Invoice created: ${invoiceResult.invoiceNumber}`);
    } catch (invoiceError) {
      console.error("Invoice creation failed (non-critical):", invoiceError);
      // Don't fail transaction creation if invoice creation fails
    }

    return {
      success: true,
      transactionIds,
      count: transactionIds.length,
    };
  },
});
