/**
 * TRANSACTION INVOICING - On-Demand PDF Generation with Caching
 *
 * Generates invoice PDFs for transactions on-demand with smart caching.
 * - Check if PDF is cached (< 30 days old)
 * - If cached: return URL instantly
 * - If not: generate → store → cache → return URL
 * - Automatic cleanup of expired PDFs
 */

import { action, mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./rbacHelpers";

// Cache expiry: 30 days in milliseconds
const CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET TRANSACTION INVOICE URL (with caching)
 *
 * Returns invoice PDF URL for a transaction.
 * Checks cache first, generates on-demand if needed.
 */
export const getTransactionInvoiceUrl = query({
  args: {
    sessionId: v.string(),
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const session = await ctx.db.get(args.checkoutSessionId);
    if (!session || session.type !== "checkout_session") {
      return null;
    }

    // Check if PDF is cached and not expired
    const cachedPdfId = session.customProperties?.cachedInvoicePdfId as Id<"_storage"> | undefined;
    const cachedExpiry = session.customProperties?.cachedInvoicePdfExpiry as number | undefined;

    if (cachedPdfId && cachedExpiry) {
      const now = Date.now();
      if (now < cachedExpiry) {
        // Cache is still valid - return URL
        const url = await ctx.storage.getUrl(cachedPdfId);
        return {
          invoiceUrl: url,
          cached: true,
          expiresAt: cachedExpiry,
        };
      }
    }

    // No cache or expired - need to generate
    return {
      invoiceUrl: null,
      cached: false,
      needsGeneration: true,
    };
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * GENERATE OR RETRIEVE TRANSACTION INVOICE
 *
 * Main entry point for getting transaction invoices.
 * 1. Check cache
 * 2. If cached and valid → return URL
 * 3. If not cached → generate → store → cache → return URL
 */
export const generateTransactionInvoice = action({
  args: {
    sessionId: v.string(),
    checkoutSessionId: v.id("objects"),
    forceRegenerate: v.optional(v.boolean()), // Force regeneration even if cached
  },
  handler: async (ctx, args) => {
    // 1. Get checkout session
    const session = await ctx.runQuery(
      internal.checkoutSessionOntology.getCheckoutSessionInternal,
      { checkoutSessionId: args.checkoutSessionId }
    ) as Doc<"objects"> | null;

    if (!session || session.type !== "checkout_session") {
      throw new Error("Checkout session not found");
    }

    // 2. Check cache (unless force regenerate)
    if (!args.forceRegenerate) {
      const cachedPdfId = session.customProperties?.cachedInvoicePdfId as Id<"_storage"> | undefined;
      const cachedExpiry = session.customProperties?.cachedInvoicePdfExpiry as number | undefined;

      if (cachedPdfId && cachedExpiry) {
        const now = Date.now();
        if (now < cachedExpiry) {
          // Return cached version
          const url = await ctx.storage.getUrl(cachedPdfId);
          return {
            invoiceUrl: url,
            cached: true,
            expiresAt: cachedExpiry,
          };
        }
      }
    }

    // 3. Generate PDF using template system
    const transactionType = session.customProperties?.transactionType as "B2C" | "B2B" | undefined;

    // Determine template based on transaction type
    const templateId = transactionType === "B2B" ? "b2b_single" : "b2c_receipt";

    // Prepare template data from session
    const templateData = await prepareTemplateDataFromSession(ctx, session, templateId);

    // Generate PDF
    const pdfResult = await ctx.runAction(api.pdfGenerationTemplated.generatePdfFromTemplate, {
      templateId: templateId as any,
      data: templateData,
      organizationId: session.organizationId,
    });

    if (!pdfResult) {
      throw new Error("Failed to generate PDF");
    }

    // 4. Store PDF in Convex storage
    const pdfBlob = Buffer.from(pdfResult.content, "base64");
    const storageId = await ctx.storage.store(
      new Blob([pdfBlob], { type: "application/pdf" })
    );

    // 5. Cache reference in transaction
    const expiryDate = Date.now() + CACHE_EXPIRY_MS;
    await ctx.runMutation(internal.transactionInvoicing.cacheInvoicePdf, {
      checkoutSessionId: args.checkoutSessionId,
      pdfStorageId: storageId as string,
      expiryDate,
    });

    // 6. Return URL
    const url = await ctx.storage.getUrl(storageId);
    return {
      invoiceUrl: url,
      cached: false,
      expiresAt: expiryDate,
      generated: true,
    };
  },
});

// ============================================================================
// MUTATIONS (Internal)
// ============================================================================

/**
 * CACHE INVOICE PDF REFERENCE
 *
 * Stores PDF storage ID and expiry in transaction custom properties.
 * Internal mutation - called by generateTransactionInvoice action.
 */
export const cacheInvoicePdf = internalMutation({
  args: {
    checkoutSessionId: v.id("objects"),
    pdfStorageId: v.string(), // Storage ID (not Id<"_storage"> due to Convex limitations)
    expiryDate: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.checkoutSessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Update custom properties with cache info
    await ctx.db.patch(args.checkoutSessionId, {
      customProperties: {
        ...(session.customProperties || {}),
        cachedInvoicePdfId: args.pdfStorageId,
        cachedInvoicePdfExpiry: args.expiryDate,
        invoicePdfCachedAt: Date.now(),
      },
    });

    return { success: true };
  },
});

/**
 * CLEANUP EXPIRED PDF CACHE
 *
 * Removes expired PDF files from storage and cache references.
 * Called by scheduled cron job (daily).
 */
export const cleanupExpiredPdfCache = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Find all checkout sessions with expired PDF cache
    const sessions = await ctx.db
      .query("objects")
      .filter((q) => q.eq(q.field("type"), "checkout_session"))
      .collect();

    let cleanedCount = 0;

    for (const session of sessions) {
      const cachedExpiry = session.customProperties?.cachedInvoicePdfExpiry as number | undefined;
      const cachedPdfId = session.customProperties?.cachedInvoicePdfId as Id<"_storage"> | undefined;

      if (cachedExpiry && cachedPdfId && now > cachedExpiry) {
        try {
          // Delete PDF from storage
          await ctx.storage.delete(cachedPdfId);

          // Remove cache reference from session
          const updatedProps = { ...(session.customProperties || {}) };
          delete updatedProps.cachedInvoicePdfId;
          delete updatedProps.cachedInvoicePdfExpiry;
          delete updatedProps.invoicePdfCachedAt;

          await ctx.db.patch(session._id, {
            customProperties: updatedProps,
          });

          cleanedCount++;
        } catch (error) {
          console.error(`Failed to cleanup PDF for session ${session._id}:`, error);
          // Continue with other sessions even if one fails
        }
      }
    }

    console.log(`Cleaned up ${cleanedCount} expired PDF cache entries`);

    return {
      cleanedCount,
      timestamp: now,
    };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Prepare template data from checkout session
 */
async function prepareTemplateDataFromSession(
  ctx: any,
  session: Doc<"objects">,
  templateId: string
): Promise<Record<string, any>> {
  // Get purchase items
  const purchaseItemIds = (session.customProperties?.purchasedItemIds as Id<"objects">[]) || [];
  const purchaseItems = await Promise.all(
    purchaseItemIds.map((id: Id<"objects">) =>
      ctx.runQuery(internal.purchaseOntology.getPurchaseItemInternal, {
        purchaseItemId: id,
      })
    )
  );

  // Get product details
  const lineItems = await Promise.all(
    purchaseItems.map(async (item: Doc<"objects"> | null) => {
      if (!item) return null;
      const productId = item.customProperties?.productId as Id<"objects">;
      const product = await ctx.runQuery(internal.productOntology.getProductInternal, {
        productId,
      });
      return {
        description: product?.name || "Unknown Product",
        quantity: item.customProperties?.quantity as number,
        unitPrice: item.customProperties?.pricePerUnit as number,
        totalPrice: item.customProperties?.totalPrice as number,
      };
    })
  );

  const validLineItems = lineItems.filter((item) => item !== null);

  // Common data for all templates
  const baseData = {
    customerName: session.customProperties?.customerName as string || "Unknown",
    customerEmail: session.customProperties?.customerEmail as string || "",
    orderNumber: session._id.substring(0, 12),
    orderDate: session.createdAt,
    lineItems: validLineItems,
    subtotal: session.customProperties?.subtotal as number || 0,
    taxAmount: session.customProperties?.taxAmount as number || 0,
    total: session.customProperties?.totalAmount as number || 0,
    currency: session.customProperties?.currency as string || "EUR",
    paymentMethod: session.customProperties?.paymentMethod as string || "Card",
  };

  // Add B2B-specific data if needed
  if (templateId === "b2b_single") {
    return {
      ...baseData,
      invoiceNumber: session._id.substring(0, 12),
      invoiceDate: session.createdAt,
      dueDate: session.createdAt + 30 * 24 * 60 * 60 * 1000, // +30 days
      billTo: {
        name: session.customProperties?.companyName as string || baseData.customerName,
        vatNumber: session.customProperties?.vatNumber as string | undefined,
        billingAddress: {
          line1: session.customProperties?.billingStreet as string | undefined,
          city: session.customProperties?.billingCity as string | undefined,
          postalCode: session.customProperties?.billingPostalCode as string | undefined,
          country: session.customProperties?.billingCountry as string | undefined,
        },
        billingEmail: baseData.customerEmail,
        billingContact: baseData.customerName,
      },
      paymentTerms: "NET30",
    };
  }

  return baseData;
}
