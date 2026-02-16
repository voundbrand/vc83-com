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
const generatedApi: any = require("../../_generated/api");
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
      products?: Array<{
        productId: string;
        quantity: number;
      }>;
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
        breakdown?: {
          products?: Array<{
            productId: string;
            productName: string;
            quantity: number;
            pricePerUnit: number;
            total: number;
          }>;
          subtotal?: number;
          total?: number;
        };
      };
      billingMethod?: string;
      employerName?: string;
      crmOrganizationId?: string;
      contactId?: string;
      ticketId?: string;
    };

    // Validate required fields
    if (!context.products || context.products.length === 0 || !context.eventId) {
      return {
        success: false,
        error: "At least one product and Event ID are required",
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

    // Get event details
    const event: any = await (ctx as any).runQuery(generatedApi.internal.api.v1.eventsInternal.getEventByIdInternal, {
      eventId: context.eventId as Id<"objects">,
      organizationId: args.organizationId,
    });

    if (!event) {
      return {
        success: false,
        error: "Event not found",
      };
    }

    // Get all product details (skip addons - they're not in the database)
    const products: Array<{
      _id: Id<"objects">;
      name: string;
      description?: string;
      subtype: string;
    }> = [];

    for (const productItem of context.products) {
      // Skip addon products (they have IDs like "addon-123" instead of Convex IDs)
      if (productItem.productId.startsWith("addon-")) {
        console.log(`⚠️ Skipping addon product in transaction: ${productItem.productId}`);
        continue;
      }

      const product: any = await (ctx as any).runQuery(generatedApi.internal.api.v1.productsInternal.getProductInternal, {
        productId: productItem.productId as Id<"objects">,
        organizationId: args.organizationId,
      });

      if (!product) {
        return {
          success: false,
          error: `Product not found: ${productItem.productId}`,
        };
      }

      products.push(product);
    }

    // Ensure we have at least one real product
    if (products.length === 0) {
      return {
        success: false,
        error: "At least one non-addon product is required to create a transaction",
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

    let transactionId: Id<"objects">;

    // Build product breakdown for customProperties
    const productBreakdown = context.transactionData?.breakdown?.products || context.products.map((p, idx) => ({
      productId: p.productId,
      productName: products[idx].name,
      quantity: p.quantity,
      pricePerUnit: 0, // Will be calculated by pricing behavior
      total: 0,
    }));

    // DRY-RUN MODE: Skip actual database write
    if (args.config?.dryRun) {
      transactionId = `dryrun_transaction_${Date.now()}` as Id<"objects">;
      console.log(`🧪 [DRY RUN] Would create transaction for: ${customerEmail}`);
    } else {
      // Create transaction using internal mutation (PRODUCTION)
      // Note: Use first product for legacy fields
      transactionId = await (ctx as any).runMutation(generatedApi.internal.transactionOntology.createTransactionInternal, {
        organizationId: args.organizationId,
        subtype: "ticket_purchase",

        // Product context (first product for legacy compatibility)
        productId: context.products[0].productId as Id<"objects">,
        productName: products[0].name,
        productDescription: products[0].description,
        productSubtype: products[0].subtype,

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
        quantity: context.products.reduce((sum, p) => sum + p.quantity, 0),
        taxRatePercent: 19, // German VAT

        // Payment
        paymentMethod: billingMethod === "employer_invoice" ? "invoice" : "stripe",
        paymentStatus,
      });

      // Note: Full product breakdown is stored in context for ticket creation
      // Transaction stores first product for legacy compatibility
    }

    console.log(`${args.config?.dryRun ? '🧪 [DRY RUN]' : '✅'} Transaction created: ${transactionId}`);
    console.log(`   Customer: ${customerName} (${customerEmail})`);
    console.log(`   Payer: ${payerType} ${context.employerName || customerName}`);
    console.log(`   Products: ${context.products.length}`);
    productBreakdown.forEach((p) => {
      console.log(`     - ${p.productName} × ${p.quantity}`);
    });
    console.log(`   Amount: €${(context.transactionData.price / 100).toFixed(2)}`);
    console.log(`   Payment Status: ${paymentStatus}`);

    return {
      success: true,
      message: `Transaction created successfully${args.config?.dryRun ? ' (dry run)' : ''}`,
      data: {
        transactionId,
        customerName,
        customerEmail,
        payerType,
        employerName: context.employerName,
        amountInCents: context.transactionData.price,
        paymentStatus,
        billingMethod,
      },
    };
  },
});
