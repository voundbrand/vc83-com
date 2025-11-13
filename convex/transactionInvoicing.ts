/**
 * TRANSACTION INVOICING - On-Demand PDF Generation with Caching
 *
 * Generates invoice PDFs for transactions on-demand with smart caching.
 * - Check if PDF is cached (< 30 days old)
 * - If cached: return URL instantly
 * - If not: generate → store → cache → return URL
 * - Automatic cleanup of expired PDFs
 */

import { action, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./rbacHelpers";
import { generatePdfFromTemplate } from "./lib/generatePdf";
// Removed: import { getAllInvoiceTranslations } from "./lib/pdf_templates/invoice-translations";

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

    // 3. Generate PDF using API Template.io
    const apiKey = process.env.API_TEMPLATE_IO_KEY;
    if (!apiKey) {
      throw new Error("API_TEMPLATE_IO_KEY environment variable not set");
    }

    // Get PDF template code from session (set during checkout creation)
    const pdfTemplateCode = session.customProperties?.pdfTemplateCode as string | undefined;
    const transactionType = session.customProperties?.transactionType as "B2C" | "B2B" | undefined;

    // Determine template: use saved template code, or default based on transaction type
    const defaultCode = transactionType === "B2B"
      ? "invoice_b2b_single_v1"
      : "invoice_b2c_receipt_v1";
    const finalTemplateCode = pdfTemplateCode || defaultCode;

    // Get invoice language from session (respects checkout language settings)
    const invoiceLanguage = getInvoiceLanguage(session);

    // Prepare template data from session (with VAT breakdown from transactions)
    const templateData = await prepareTemplateDataFromSession(ctx, session, finalTemplateCode, invoiceLanguage);

    // Generate PDF via API Template.io
    const pdfResult = await generatePdfFromTemplate({
      apiKey,
      templateCode: finalTemplateCode,
      data: templateData,
    });

    if (!pdfResult || pdfResult.status !== "success" || !pdfResult.download_url) {
      throw new Error(
        `Failed to generate PDF via API Template.io: ${pdfResult?.error || pdfResult?.message || "Unknown error"}`
      );
    }

    // 4. Download PDF from API Template.io and store in Convex storage
    const pdfResponse = await fetch(pdfResult.download_url);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF from API Template.io: ${pdfResponse.status}`);
    }

    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    const storageId = await ctx.storage.store(
      new Blob([pdfArrayBuffer], { type: "application/pdf" })
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
 * Get invoice language from session
 *
 * Language cascade:
 * 1. Session's defaultLanguage (set from checkout configuration)
 * 2. Fallback to English
 *
 * Supported languages: en, de, pl, es, fr, ja
 */
function getInvoiceLanguage(session: Doc<"objects">): string {
  // Check session language (stored when checkout session was created)
  const sessionLanguage = session.customProperties?.defaultLanguage as string | undefined;

  // List of supported languages
  const supportedLanguages = ["en", "de", "pl", "es", "fr", "ja"];

  if (sessionLanguage && supportedLanguages.includes(sessionLanguage)) {
    return sessionLanguage;
  }

  // Default to English
  return "en";
}

/**
 * Prepare template data from checkout session for API Template.io
 *
 * Uses transaction data (not purchase items) to get accurate VAT breakdown.
 * Transactions contain:
 * - Cached product data (productName, productDescription)
 * - Complete VAT breakdown (unitPriceInCents, taxAmountInCents, totalPriceInCents, taxRatePercent)
 * - Snapshot of sale at time of purchase
 *
 * Format matches API Template.io requirements:
 * - Prices in cents (will be converted to decimal in template)
 * - Date strings in readable format
 * - Currency symbols (€, $, etc.)
 * - Proper structure matching template fields
 * - Translation strings for all text labels
 */
async function prepareTemplateDataFromSession(
  ctx: any,
  session: Doc<"objects">,
  templateCode: string,
  language: string = "en"
): Promise<Record<string, any>> {
  // Get transactions (contains complete VAT breakdown)
  const transactionIds = (session.customProperties?.transactionIds as Id<"objects">[]) || [];
  const transactions = await Promise.all(
    transactionIds.map((id: Id<"objects">) =>
      ctx.runQuery(internal.transactionOntology.getTransactionInternal, {
        transactionId: id,
      })
    )
  );

  // Get first transaction's tax rate (all should be same rate)
  const firstTx = transactions[0];
  const taxRatePercent = (firstTx?.customProperties?.taxRatePercent as number) || 0;

  // Build line items from transaction data (cached product info + VAT breakdown)
  // API Template.io expects: description, quantity, unit_price, tax_amount, total_price, tax_rate
  const items = transactions
    .map((tx: Doc<"objects"> | null) => {
      if (!tx || !tx.customProperties) return null;
      const props = tx.customProperties;

      return {
        description: props.productName as string || "Unknown Product",
        quantity: props.quantity as number || 1,
        unit_price: props.unitPriceInCents as number || 0,      // Net price per unit (in cents)
        tax_amount: props.taxAmountInCents as number || 0,      // Total VAT for line (in cents)
        total_price: props.totalPriceInCents as number || 0,    // Gross total for line (in cents)
        tax_rate: props.taxRatePercent as number || 0,          // Tax rate percentage
      };
    })
    .filter((item) => item !== null);

  // Calculate totals from transaction data (in cents)
  const subtotal = transactions.reduce((sum, tx) => {
    const unitPrice = (tx?.customProperties?.unitPriceInCents as number) || 0;
    const quantity = (tx?.customProperties?.quantity as number) || 1;
    return sum + (unitPrice * quantity);
  }, 0);

  const tax = transactions.reduce((sum, tx) =>
    sum + ((tx?.customProperties?.taxAmountInCents as number) || 0), 0
  );

  const total = transactions.reduce((sum, tx) =>
    sum + ((tx?.customProperties?.totalPriceInCents as number) || 0), 0
  );

  // Get currency and convert to symbol
  const currencyCode = (session.customProperties?.currency as string || "EUR").toUpperCase();
  const currencySymbol = currencyCode === "EUR" ? "€"
    : currencyCode === "USD" ? "$"
    : currencyCode === "GBP" ? "£"
    : currencyCode;

  // Format dates
  const invoiceDate = new Date(session.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const dueDate = new Date(session.createdAt + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Get organization details (for invoice header)
  const organization = await ctx.db.get(session.organizationId);
  const orgName = organization?.name || "Organization";
  const orgProps = (organization?.customProperties || {}) as Record<string, any>;

  // Translation strings removed - using API Template.io's built-in i18n
  // Note: If custom translations are needed, add them directly to API Template.io templates

  // Common data for all templates (API Template.io format)
  const baseData = {
    // Organization info (seller)
    organization_name: orgName,
    organization_address: orgProps.address || "Address not provided",
    organization_phone: orgProps.phone || "Phone not provided",
    organization_email: orgProps.email || "Email not provided",
    logo_url: orgProps.logoUrl as string | undefined,
    highlight_color: orgProps.brandColor || "#6B46C1",

    // Invoice details
    invoice_number: session._id.substring(0, 12).toUpperCase(),
    invoice_date: invoiceDate,
    due_date: dueDate,

    // Line items with VAT breakdown
    items,

    // Totals (in cents - template converts to decimal)
    subtotal,      // Sum of net prices (cents)
    tax_rate: taxRatePercent,  // Tax rate percentage
    tax,           // Sum of VAT (cents)
    total,         // Sum of gross prices (cents)

    // Currency
    currency: currencySymbol,

    // Payment
    payment_method: session.customProperties?.paymentMethod as string || "Card",
    payment_terms: "NET30",

    // Language
    language,
  };

  // Add B2B-specific data for business invoices
  if (templateCode.includes("b2b")) {
    const companyName = session.customProperties?.companyName as string;
    const vatNumber = session.customProperties?.vatNumber as string;
    const billingStreet = session.customProperties?.billingStreet as string;
    const billingCity = session.customProperties?.billingCity as string;
    const billingState = session.customProperties?.billingState as string;
    const billingPostalCode = session.customProperties?.billingPostalCode as string;
    const customerName = session.customProperties?.customerName as string || "Unknown";

    return {
      ...baseData,
      bill_to: {
        company_name: companyName || customerName,
        contact_name: customerName,
        address: billingStreet || "Address not provided",
        city: billingCity || "",
        state: billingState || "",
        zip_code: billingPostalCode || "",
        vat_number: vatNumber || undefined,
      },
    };
  }

  // B2C receipt data
  return {
    ...baseData,
    customer_name: session.customProperties?.customerName as string || "Unknown",
    customer_email: session.customProperties?.customerEmail as string || "",
  };
}
