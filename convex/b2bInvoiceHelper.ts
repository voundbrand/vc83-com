/**
 * B2B INVOICE GENERATION HELPER
 *
 * Utility functions for generating invoices to CRM organizations with B2B billing information.
 * Uses the extended B2B billing fields for proper invoice generation.
 *
 * Features:
 * - Payment terms calculation (net30, net60, etc.)
 * - Tax calculations based on VAT/Tax exempt status
 * - Separate billing address handling
 * - Credit limit validation
 * - Purchase order requirements
 */

import { query, action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// ============================================================================
// TYPES
// ============================================================================

export type PaymentTerms = "due_on_receipt" | "net15" | "net30" | "net60" | "net90";

export interface B2BInvoiceData {
  // Customer (CRM Org) Information
  customerId: Id<"objects">; // CRM organization ID
  customerName: string;

  // Legal/Tax Info
  legalEntityType?: string;
  registrationNumber?: string;
  vatNumber?: string;
  taxExempt: boolean;

  // Billing Address
  billingAddress: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  // Payment Settings
  paymentTerms: PaymentTerms;
  creditLimit?: number;
  preferredPaymentMethod?: string;

  // Accounting
  accountingReference?: string;
  costCenter?: string;
  purchaseOrderRequired: boolean;
  purchaseOrderNumber?: string; // Required if purchaseOrderRequired is true

  // Billing Contact
  billingContact?: string;
  billingContactEmail?: string;
  billingContactPhone?: string;

  // Invoice Details
  invoiceDate: number;
  dueDate?: number; // Calculated from paymentTerms
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number; // in cents
    taxRate?: number; // e.g., 0.19 for 19% VAT
  }>;

  // Optional fields
  notes?: string;
  referenceNumber?: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET B2B INVOICE DATA FROM CRM ORG
 *
 * Fetches all B2B billing information from a CRM organization
 * and prepares it for invoice generation
 */
export const getB2BInvoiceData = query({
  args: {
    sessionId: v.string(),
    crmOrganizationId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<B2BInvoiceData | null> => {
    // Get CRM organization with B2B billing data
    const crmOrg = await ctx.db.get(args.crmOrganizationId);

    if (!crmOrg || crmOrg.type !== "crm_organization") {
      return null;
    }

    const props = crmOrg.customProperties || {};
    const billingAddr = props.billingAddress || props.address || {};

    // Calculate due date based on payment terms
    const invoiceDate = Date.now();
    const paymentTerms = (props.paymentTerms as PaymentTerms) || "net30";
    const dueDate = calculateDueDate(invoiceDate, paymentTerms);

    return {
      customerId: args.crmOrganizationId,
      customerName: crmOrg.name,

      // Legal/Tax Info
      legalEntityType: props.legalEntityType?.toString(),
      registrationNumber: props.registrationNumber?.toString(),
      vatNumber: props.vatNumber?.toString(),
      taxExempt: props.taxExempt === true,

      // Billing Address
      billingAddress: {
        street: billingAddr.street?.toString(),
        city: billingAddr.city?.toString(),
        state: billingAddr.state?.toString(),
        postalCode: billingAddr.postalCode?.toString(),
        country: billingAddr.country?.toString(),
      },

      // Payment Settings
      paymentTerms,
      creditLimit: typeof props.creditLimit === "number" ? props.creditLimit : undefined,
      preferredPaymentMethod: props.preferredPaymentMethod?.toString(),

      // Accounting
      accountingReference: props.accountingReference?.toString(),
      costCenter: props.costCenter?.toString(),
      purchaseOrderRequired: props.purchaseOrderRequired === true,

      // Billing Contact
      billingContact: props.billingContact?.toString(),
      billingContactEmail: props.billingContactEmail?.toString(),
      billingContactPhone: props.billingContactPhone?.toString(),

      // Invoice Details (to be filled by caller)
      invoiceDate,
      dueDate,
      items: [],
    };
  },
});

/**
 * VALIDATE CREDIT LIMIT
 *
 * Checks if an invoice amount exceeds the customer's credit limit
 */
export const validateCreditLimit = query({
  args: {
    sessionId: v.string(),
    crmOrganizationId: v.id("objects"),
    invoiceAmountCents: v.number(),
  },
  handler: async (ctx, args): Promise<{
    valid: boolean;
    creditLimit?: number;
    currentOutstanding: number;
    remainingCredit: number;
    message?: string;
  }> => {
    const crmOrg = await ctx.db.get(args.crmOrganizationId);

    if (!crmOrg || crmOrg.type !== "crm_organization") {
      return {
        valid: false,
        currentOutstanding: 0,
        remainingCredit: 0,
        message: "CRM organization not found",
      };
    }

    const props = crmOrg.customProperties || {};
    const creditLimit = typeof props.creditLimit === "number" ? props.creditLimit : undefined;

    // If no credit limit set, allow any amount
    if (!creditLimit) {
      return {
        valid: true,
        currentOutstanding: 0,
        remainingCredit: Infinity,
      };
    }

    // Calculate current outstanding invoices
    const outstandingInvoices = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", crmOrg.organizationId).eq("type", "invoice")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("customProperties.crmOrganizationId"), args.crmOrganizationId),
          q.eq(q.field("status"), "pending") // Only count unpaid invoices
        )
      )
      .collect();

    const currentOutstanding = outstandingInvoices.reduce((sum, inv) => {
      const amount = (inv.customProperties as { totalInCents?: number })?.totalInCents || 0;
      return sum + amount;
    }, 0);

    const remainingCredit = (creditLimit * 100) - currentOutstanding; // Convert to cents
    const newTotal = currentOutstanding + args.invoiceAmountCents;
    const valid = newTotal <= (creditLimit * 100);

    return {
      valid,
      creditLimit,
      currentOutstanding,
      remainingCredit,
      message: valid
        ? undefined
        : `Credit limit exceeded. Limit: $${creditLimit}, Current outstanding: $${(currentOutstanding / 100).toFixed(2)}, New invoice: $${(args.invoiceAmountCents / 100).toFixed(2)}`,
    };
  },
});

/**
 * GET INVOICES BY PAYMENT TERMS
 *
 * Query invoices filtered by payment terms for reporting
 */
export const getInvoicesByPaymentTerms = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    paymentTerms: v.union(
      v.literal("due_on_receipt"),
      v.literal("net15"),
      v.literal("net30"),
      v.literal("net60"),
      v.literal("net90")
    ),
  },
  handler: async (ctx, args) => {
    const invoices = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "invoice")
      )
      .filter((q) =>
        q.eq(q.field("customProperties.paymentTerms"), args.paymentTerms)
      )
      .collect();

    return invoices;
  },
});

/**
 * GET CUSTOMERS BY CREDIT LIMIT USAGE
 *
 * Report on CRM organizations sorted by credit limit utilization
 */
export const getCreditLimitReport = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    minUtilizationPercent: v.optional(v.number()), // Filter by % of credit used
  },
  handler: async (ctx, args) => {
    // Get all CRM orgs with credit limits
    const crmOrgs = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_organization")
      )
      .collect();

    const orgsWithCredit = crmOrgs.filter((org) => {
      const limit = (org.customProperties as { creditLimit?: number })?.creditLimit;
      return typeof limit === "number" && limit > 0;
    });

    // Calculate utilization for each
    const report = await Promise.all(
      orgsWithCredit.map(async (org) => {
        const props = org.customProperties as {
          creditLimit?: number;
          paymentTerms?: string;
        };
        const creditLimit = props.creditLimit || 0;

        // Get outstanding invoices
        const outstandingInvoices = await ctx.db
          .query("objects")
          .withIndex("by_org_type", (q) =>
            q.eq("organizationId", args.organizationId).eq("type", "invoice")
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("customProperties.crmOrganizationId"), org._id),
              q.eq(q.field("status"), "pending")
            )
          )
          .collect();

        const currentOutstanding = outstandingInvoices.reduce((sum, inv) => {
          const amount = (inv.customProperties as { totalInCents?: number })?.totalInCents || 0;
          return sum + amount;
        }, 0);

        const utilizationPercent = ((currentOutstanding / (creditLimit * 100)) * 100);

        // Filter by minimum utilization if provided
        if (args.minUtilizationPercent && utilizationPercent < args.minUtilizationPercent) {
          return null;
        }

        return {
          organizationId: org._id,
          organizationName: org.name,
          creditLimit,
          currentOutstanding: currentOutstanding / 100, // Convert to dollars
          remainingCredit: creditLimit - (currentOutstanding / 100),
          utilizationPercent,
          paymentTerms: props.paymentTerms,
          invoiceCount: outstandingInvoices.length,
        };
      })
    );

    // Filter nulls and sort by utilization
    return report
      .filter((r) => r !== null)
      .sort((a, b) => b!.utilizationPercent - a!.utilizationPercent);
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate due date based on payment terms
 */
function calculateDueDate(invoiceDate: number, paymentTerms: PaymentTerms): number {
  const date = new Date(invoiceDate);

  switch (paymentTerms) {
    case "due_on_receipt":
      return invoiceDate; // Due immediately
    case "net15":
      date.setDate(date.getDate() + 15);
      break;
    case "net30":
      date.setDate(date.getDate() + 30);
      break;
    case "net60":
      date.setDate(date.getDate() + 60);
      break;
    case "net90":
      date.setDate(date.getDate() + 90);
      break;
  }

  return date.getTime();
}

/**
 * Calculate tax amount based on tax rate and tax-exempt status
 */
export function calculateTax(
  amountCents: number,
  taxRate: number,
  taxExempt: boolean
): number {
  if (taxExempt) {
    return 0;
  }
  return Math.round(amountCents * taxRate);
}

/**
 * Calculate invoice total with tax
 */
export function calculateInvoiceTotal(
  items: Array<{ quantity: number; unitPrice: number; taxRate?: number }>,
  taxExempt: boolean
): { subtotalCents: number; taxCents: number; totalCents: number } {
  let subtotalCents = 0;
  let taxCents = 0;

  for (const item of items) {
    const lineTotal = item.quantity * item.unitPrice;
    subtotalCents += lineTotal;

    if (!taxExempt && item.taxRate) {
      taxCents += calculateTax(lineTotal, item.taxRate, false);
    }
  }

  return {
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}

// ============================================================================
// PDF GENERATION USING API TEMPLATE.IO
// ============================================================================

/**
 * GENERATE B2B INVOICE PDF (API Template.io)
 *
 * Generates a professional B2B invoice PDF using API Template.io's
 * /v2/create-pdf-from-html endpoint with HTML/CSS templates.
 *
 * This replaces jsPDF - all PDF generation now uses API Template.io.
 */
export const generateB2BInvoicePdf = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    crmOrganizationId: v.id("objects"),
    items: v.array(
      v.object({
        description: v.string(),
        quantity: v.number(),
        unitPriceCents: v.number(),
        taxRate: v.optional(v.number()),
      })
    ),
    invoiceNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    templateCode: v.optional(v.string()), // "b2b-professional", "detailed-breakdown"
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    pdfUrl?: string;
    storageId?: string;
    transactionRef?: string;
    error?: string;
  }> => {
    try {
      // 1. Check for API key
      const apiKey = process.env.API_TEMPLATE_IO_KEY;
      if (!apiKey) {
        return {
          success: false,
          error: "API_TEMPLATE_IO_KEY not configured in environment",
        };
      }

      // 2. Get B2B billing data
      const b2bData = await ctx.runQuery(api.b2bInvoiceHelper.getB2BInvoiceData, {
        sessionId: args.sessionId,
        crmOrganizationId: args.crmOrganizationId,
      });

      if (!b2bData) {
        return {
          success: false,
          error: "CRM organization not found or missing B2B billing data",
        };
      }

      // 3. Get CRM org for organization name
      const crmOrg = await ctx.runQuery(api.crmOntology.getCrmOrganization, {
        sessionId: args.sessionId,
        crmOrganizationId: args.crmOrganizationId,
      });

      if (!crmOrg) {
        return {
          success: false,
          error: "CRM organization not found",
        };
      }

      // 4. Get seller organization info
      const organization = await ctx.runQuery(
        internal.checkoutSessions.getOrganizationInternal,
        { organizationId: args.organizationId }
      );

      // 5. Calculate totals
      const totals = calculateInvoiceTotal(
        args.items.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPriceCents,
          taxRate: item.taxRate,
        })),
        b2bData.taxExempt
      );

      // 6. Format dates
      const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      };

      // 7. Prepare invoice data for API Template.io
      const invoiceData = {
        // Seller organization
        organization_name: organization?.businessName || organization?.name || "Your Company",
        organization_address: "Your Business Address", // TODO: Get from org settings
        organization_phone: "Your Phone", // TODO: Get from org settings
        organization_email: "billing@yourcompany.com", // TODO: Get from org settings
        logo_url: undefined, // TODO: Get from org settings
        highlight_color: "#6B46C1", // TODO: Make configurable

        // Invoice metadata
        invoice_number: args.invoiceNumber || `INV-${Date.now()}`,
        invoice_date: formatDate(b2bData.invoiceDate),
        due_date: formatDate(b2bData.dueDate || b2bData.invoiceDate),

        // Bill to (customer)
        bill_to: {
          company_name: b2bData.customerName,
          contact_name: b2bData.billingContact,
          address: b2bData.billingAddress.street,
          city: b2bData.billingAddress.city,
          state: b2bData.billingAddress.state,
          zip_code: b2bData.billingAddress.postalCode,
          country: b2bData.billingAddress.country,
          tax_id: crmOrg.customProperties?.taxId?.toString(),
          vat_number: b2bData.vatNumber,
        },

        // Line items (keep in cents for template compatibility)
        items: args.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPriceCents, // Keep in cents, template divides by 100
          tax_amount: (item.quantity * item.unitPriceCents * (item.taxRate || 0)), // Calculate tax amount
          total_price: (item.quantity * item.unitPriceCents * (1 + (item.taxRate || 0))), // Include tax in total
          tax_rate: (item.taxRate || 0) * 100, // Convert decimal to percentage (0.19 → 19)
        })),

        // Totals (convert to dollars)
        subtotal: totals.subtotalCents / 100,
        tax_rate: args.items[0]?.taxRate ? args.items[0].taxRate * 100 : 0,
        tax: totals.taxCents / 100,
        total: totals.totalCents / 100,

        // Payment terms
        payment_terms: getPaymentTermsText(b2bData.paymentTerms),
        payment_method: b2bData.preferredPaymentMethod,
        notes: args.notes,
      };

      // 8. Import and call API Template.io generator
      const { generateInvoicePdfFromTemplate } = await import("./lib/generateInvoicePdf");

      const result = await generateInvoicePdfFromTemplate({
        apiKey,
        templateCode: args.templateCode || "b2b-professional",
        invoiceData,
      });

      if (result.status === "error") {
        return {
          success: false,
          error: result.error,
        };
      }

      // 9. Download PDF from API Template.io URL and store in Convex
      const pdfResponse = await fetch(result.download_url!);
      if (!pdfResponse.ok) {
        return {
          success: false,
          error: "Failed to download PDF from API Template.io",
        };
      }

      const pdfBlob = await pdfResponse.blob();
      const storageId = await ctx.storage.store(pdfBlob);
      const pdfUrl = await ctx.storage.getUrl(storageId);

      return {
        success: true,
        pdfUrl: pdfUrl || undefined,
        storageId,
        transactionRef: result.transaction_ref,
      };
    } catch (error) {
      console.error("Failed to generate B2B invoice PDF:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Helper: Convert payment terms enum to readable text
 */
function getPaymentTermsText(paymentTerms: PaymentTerms): string {
  const termsMap = {
    due_on_receipt: "Payment due upon receipt",
    net15: "Net 15 - Payment due within 15 days",
    net30: "Net 30 - Payment due within 30 days",
    net60: "Net 60 - Payment due within 60 days",
    net90: "Net 90 - Payment due within 90 days",
  };
  return termsMap[paymentTerms] || "Payment due within 30 days";
}
