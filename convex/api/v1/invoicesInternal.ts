/**
 * API V1: INVOICES INTERNAL HANDLERS
 *
 * Internal query/mutation handlers for Invoices API endpoints.
 * These are called by the HTTP action handlers in invoices.ts.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";
const generatedApi: any = require("../../_generated/api");

/**
 * LIST INVOICES (INTERNAL)
 *
 * Lists invoices with filtering and pagination.
 */
export const listInvoicesInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    type: v.optional(v.string()),
    isDraft: v.optional(v.boolean()),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Query all invoices for organization
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "invoice")
      );

    const allInvoices = await query.collect();

    // 2. Apply filters
    let filteredInvoices = allInvoices;

    if (args.status) {
      filteredInvoices = filteredInvoices.filter(
        (inv) => inv.customProperties?.paymentStatus === args.status
      );
    }

    if (args.type) {
      filteredInvoices = filteredInvoices.filter(
        (inv) => inv.subtype === args.type
      );
    }

    if (args.isDraft !== undefined) {
      filteredInvoices = filteredInvoices.filter(
        (inv) => inv.customProperties?.isDraft === args.isDraft
      );
    }

    // 3. Sort by invoice date descending
    filteredInvoices.sort((a, b) => {
      const aDate = a.customProperties?.invoiceDate || a.createdAt;
      const bDate = b.customProperties?.invoiceDate || b.createdAt;
      return bDate - aDate;
    });

    // 4. Apply pagination
    const total = filteredInvoices.length;
    const paginatedInvoices = filteredInvoices.slice(
      args.offset,
      args.offset + args.limit
    );

    // 5. Format response
    const invoices = paginatedInvoices.map((invoice) => ({
      id: invoice._id,
      organizationId: invoice.organizationId,
      invoiceNumber: invoice.customProperties?.invoiceNumber,
      invoiceDate: invoice.customProperties?.invoiceDate,
      dueDate: invoice.customProperties?.dueDate,
      type: invoice.subtype,
      status: invoice.customProperties?.paymentStatus,
      isDraft: invoice.customProperties?.isDraft,
      billTo: invoice.customProperties?.billTo,
      subtotalInCents: invoice.customProperties?.subtotalInCents,
      taxInCents: invoice.customProperties?.taxInCents,
      totalInCents: invoice.customProperties?.totalInCents,
      currency: invoice.customProperties?.currency,
      paidAt: invoice.customProperties?.paidAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    }));

    return {
      invoices,
      total,
      limit: args.limit,
      offset: args.offset,
    };
  },
});

/**
 * GET INVOICE (INTERNAL)
 *
 * Gets a specific invoice by ID.
 */
export const getInvoiceInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    invoiceId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get invoice
    const invoice = await ctx.db.get(args.invoiceId as Id<"objects">);

    if (!invoice) {
      return null;
    }

    // 2. Verify organization access
    if (invoice.organizationId !== args.organizationId) {
      return null;
    }

    // 3. Verify it's an invoice
    if (invoice.type !== "invoice") {
      return null;
    }

    // 4. Format response
    return {
      id: invoice._id,
      organizationId: invoice.organizationId,
      invoiceNumber: invoice.customProperties?.invoiceNumber,
      invoiceDate: invoice.customProperties?.invoiceDate,
      dueDate: invoice.customProperties?.dueDate,
      type: invoice.subtype,
      status: invoice.customProperties?.paymentStatus,
      isDraft: invoice.customProperties?.isDraft,
      billTo: invoice.customProperties?.billTo,
      lineItems: invoice.customProperties?.lineItems,
      subtotalInCents: invoice.customProperties?.subtotalInCents,
      taxInCents: invoice.customProperties?.taxInCents,
      totalInCents: invoice.customProperties?.totalInCents,
      currency: invoice.customProperties?.currency,
      paymentTerms: invoice.customProperties?.paymentTerms,
      notes: invoice.customProperties?.notes,
      pdfUrl: invoice.customProperties?.pdfUrl,
      sentAt: invoice.customProperties?.sentAt,
      sentTo: invoice.customProperties?.sentTo,
      paidAt: invoice.customProperties?.paidAt,
      paymentMethod: invoice.customProperties?.paymentMethod,
      transactionId: invoice.customProperties?.transactionId,
      customProperties: invoice.customProperties,
      createdBy: invoice.createdBy,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  },
});

/**
 * CREATE INVOICE (INTERNAL)
 *
 * Creates a new draft invoice.
 */
export const createInvoiceInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    crmOrganizationId: v.string(),
    billToName: v.string(),
    billToEmail: v.string(),
    billToVatNumber: v.optional(v.string()),
    billToAddress: v.optional(v.object({
      street: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      postalCode: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
    lineItems: v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      unitPriceInCents: v.number(),
      totalPriceInCents: v.number(),
    })),
    subtotalInCents: v.number(),
    taxInCents: v.number(),
    totalInCents: v.number(),
    currency: v.string(),
    invoiceDate: v.number(),
    dueDate: v.number(),
    paymentTerms: v.optional(v.string()),
    notes: v.optional(v.string()),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Generate draft invoice number
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const draftInvoiceNumber = `DRAFT-${year}-${timestamp}`;

    // Create billTo object
    const billTo = {
      type: "organization" as const,
      organizationId: args.crmOrganizationId,
      name: args.billToName,
      vatNumber: args.billToVatNumber || "",
      billingEmail: args.billToEmail,
      billingAddress: args.billToAddress || {},
    };

    // Create draft invoice
    const now = Date.now();
    const invoiceId = await ctx.db.insert("objects", {
      type: "invoice",
      subtype: "b2b_single",
      name: `Invoice ${draftInvoiceNumber}`,
      status: "draft",
      organizationId: args.organizationId,
      createdBy: args.performedBy,
      createdAt: now,
      updatedAt: now,
      customProperties: {
        isDraft: true,
        invoiceNumber: draftInvoiceNumber,
        invoiceDate: args.invoiceDate,
        dueDate: args.dueDate,
        paymentTerms: args.paymentTerms || "net30",

        // Bill To
        billTo,
        crmOrganizationId: args.crmOrganizationId,

        // Line Items
        lineItems: args.lineItems,

        // Totals
        subtotalInCents: args.subtotalInCents,
        taxInCents: args.taxInCents,
        totalInCents: args.totalInCents,
        currency: args.currency,

        // Notes
        notes: args.notes,

        // Metadata
        createdFromTransactions: false,
        source: "api",
        paymentStatus: "draft",
      },
    });

    // Log creation
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: invoiceId,
      actionType: "created",
      actionData: {
        source: "api",
        invoiceNumber: draftInvoiceNumber,
        totalInCents: args.totalInCents,
      },
      performedBy: args.performedBy,
      performedAt: now,
    });

    return invoiceId;
  },
});

/**
 * UPDATE INVOICE (INTERNAL)
 *
 * Updates an existing draft invoice.
 */
export const updateInvoiceInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    invoiceId: v.string(),
    lineItems: v.optional(v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      unitPriceInCents: v.number(),
      totalPriceInCents: v.number(),
    }))),
    subtotalInCents: v.optional(v.number()),
    taxInCents: v.optional(v.number()),
    totalInCents: v.optional(v.number()),
    invoiceDate: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    paymentTerms: v.optional(v.string()),
    notes: v.optional(v.string()),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId as Id<"objects">);

    if (!invoice || invoice.type !== "invoice") {
      throw new Error("Invoice not found");
    }

    // Verify organization access
    if (invoice.organizationId !== args.organizationId) {
      throw new Error("Invoice not found");
    }

    // Only allow updating draft invoices
    if (!invoice.customProperties?.isDraft) {
      throw new Error("Only draft invoices can be updated");
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    // Update customProperties
    const currentProps = invoice.customProperties || {};

    updates.customProperties = {
      ...currentProps,
      ...(args.lineItems !== undefined && { lineItems: args.lineItems }),
      ...(args.subtotalInCents !== undefined && { subtotalInCents: args.subtotalInCents }),
      ...(args.taxInCents !== undefined && { taxInCents: args.taxInCents }),
      ...(args.totalInCents !== undefined && { totalInCents: args.totalInCents }),
      ...(args.invoiceDate !== undefined && { invoiceDate: args.invoiceDate }),
      ...(args.dueDate !== undefined && { dueDate: args.dueDate }),
      ...(args.paymentTerms !== undefined && { paymentTerms: args.paymentTerms }),
      ...(args.notes !== undefined && { notes: args.notes }),
    };

    await ctx.db.patch(args.invoiceId as Id<"objects">, updates);

    // Log update
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.invoiceId as Id<"objects">,
      actionType: "updated",
      actionData: {
        source: "api",
        updatedFields: Object.keys(updates),
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return args.invoiceId;
  },
});

/**
 * DELETE INVOICE (INTERNAL)
 *
 * Permanently deletes a draft invoice.
 */
export const deleteInvoiceInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    invoiceId: v.string(),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId as Id<"objects">);

    if (!invoice || invoice.type !== "invoice") {
      throw new Error("Invoice not found");
    }

    // Verify organization access
    if (invoice.organizationId !== args.organizationId) {
      throw new Error("Invoice not found");
    }

    // Only allow deleting draft invoices
    if (!invoice.customProperties?.isDraft) {
      throw new Error("Only draft invoices can be permanently deleted");
    }

    // Delete the invoice permanently
    await ctx.db.delete(args.invoiceId as Id<"objects">);

    // Log deletion
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.invoiceId as Id<"objects">,
      actionType: "deleted",
      actionData: {
        source: "api",
        invoiceNumber: invoice.customProperties?.invoiceNumber,
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * SEAL INVOICE (INTERNAL)
 *
 * Converts draft invoice to final sealed invoice.
 */
export const sealInvoiceInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    invoiceId: v.string(),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    invoiceId: string;
    invoiceNumber: string;
  }> => {
    const invoice = await ctx.db.get(args.invoiceId as Id<"objects">);

    if (!invoice || invoice.type !== "invoice") {
      throw new Error("Invoice not found");
    }

    // Verify organization access
    if (invoice.organizationId !== args.organizationId) {
      throw new Error("Invoice not found");
    }

    // Check if already sealed
    if (!invoice.customProperties?.isDraft) {
      throw new Error("Invoice is already sealed");
    }

    // Generate final invoice number (ATOMIC - prevents duplicates)
    // Use atomic increment instead of counting invoices to prevent race conditions
    // Note: internalMutation can call other internalMutations directly via ctx.runMutation
    const invoiceNumberData: { invoiceNumber: string } = await (ctx as any).runMutation(generatedApi.internal.organizationOntology.getAndIncrementInvoiceNumber, {
      organizationId: invoice.organizationId,
    });
    const finalInvoiceNumber = invoiceNumberData.invoiceNumber;

    // Update invoice to sealed status
    await ctx.db.patch(args.invoiceId as Id<"objects">, {
      name: `Invoice ${finalInvoiceNumber}`,
      updatedAt: Date.now(),
      customProperties: {
        ...invoice.customProperties,
        isDraft: false,
        invoiceNumber: finalInvoiceNumber,
        sealedAt: Date.now(),
        sealedBy: args.performedBy,
        paymentStatus: "sent", // Ready to be sent to customer
      },
    });

    // Log seal action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.invoiceId as Id<"objects">,
      actionType: "sealed",
      actionData: {
        source: "api",
        finalInvoiceNumber,
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return {
      success: true,
      invoiceId: args.invoiceId,
      invoiceNumber: finalInvoiceNumber,
    };
  },
});

/**
 * SEND INVOICE (INTERNAL)
 *
 * Marks invoice as sent and records recipients.
 */
export const sendInvoiceInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    invoiceId: v.string(),
    sentTo: v.array(v.string()),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId as Id<"objects">);

    if (!invoice || invoice.type !== "invoice") {
      throw new Error("Invoice not found");
    }

    // Verify organization access
    if (invoice.organizationId !== args.organizationId) {
      throw new Error("Invoice not found");
    }

    // Can't send draft invoices
    if (invoice.customProperties?.isDraft) {
      throw new Error("Cannot send draft invoice. Please seal it first.");
    }

    const now = Date.now();

    // Update invoice
    await ctx.db.patch(args.invoiceId as Id<"objects">, {
      updatedAt: now,
      customProperties: {
        ...invoice.customProperties,
        sentAt: now,
        sentTo: args.sentTo,
        paymentStatus: "sent",
      },
    });

    // Log send action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.invoiceId as Id<"objects">,
      actionType: "sent",
      actionData: {
        source: "api",
        sentTo: args.sentTo,
      },
      performedBy: args.performedBy,
      performedAt: now,
    });

    return { success: true };
  },
});

/**
 * GET INVOICE PDF (INTERNAL)
 *
 * Returns the PDF URL for an invoice.
 */
export const getInvoicePdfInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    invoiceId: v.string(),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId as Id<"objects">);

    if (!invoice || invoice.type !== "invoice") {
      return null;
    }

    // Verify organization access
    if (invoice.organizationId !== args.organizationId) {
      return null;
    }

    // Return PDF URL if available
    const pdfUrl = invoice.customProperties?.pdfUrl;
    if (!pdfUrl || typeof pdfUrl !== "string") {
      return null;
    }

    return {
      pdfUrl,
      invoiceNumber: invoice.customProperties?.invoiceNumber,
    };
  },
});

/**
 * GET INVOICES FOR CLIENT (INTERNAL)
 *
 * Get all invoices for a specific CRM organization (client).
 * Used by freelancer portals to show billing section to clients.
 */
export const getInvoicesForClientInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    crmOrganizationId: v.id("objects"),
    status: v.optional(v.string()),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Query all invoices for organization
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "invoice")
      );

    const allInvoices = await query.collect();

    // 2. Filter by CRM organization (client)
    let filteredInvoices = allInvoices.filter(
      (inv) => inv.customProperties?.crmOrganizationId === args.crmOrganizationId
    );

    // 3. Apply status filter if provided
    if (args.status) {
      filteredInvoices = filteredInvoices.filter(
        (inv) => inv.customProperties?.paymentStatus === args.status
      );
    }

    // 4. Sort by invoice date descending (newest first)
    filteredInvoices.sort((a, b) => {
      const aDate = a.customProperties?.invoiceDate || a.createdAt;
      const bDate = b.customProperties?.invoiceDate || b.createdAt;
      return bDate - aDate;
    });

    // 5. Apply pagination
    const total = filteredInvoices.length;
    const paginatedInvoices = filteredInvoices.slice(
      args.offset,
      args.offset + args.limit
    );

    // 6. Format response - include Stripe URLs if available
    const invoices = paginatedInvoices.map((invoice) => ({
      id: invoice._id,
      invoiceNumber: invoice.customProperties?.invoiceNumber,
      invoiceDate: invoice.customProperties?.invoiceDate,
      dueDate: invoice.customProperties?.dueDate,
      status: invoice.customProperties?.paymentStatus,
      totalInCents: invoice.customProperties?.totalInCents,
      currency: invoice.customProperties?.currency || "usd",
      // PDF URLs (your system or Stripe)
      pdfUrl: invoice.customProperties?.pdfUrl,
      stripeHostedUrl: invoice.customProperties?.stripeHostedUrl,
      stripePdfUrl: invoice.customProperties?.stripePdfUrl,
      // Stripe sync status (for debugging)
      useStripeInvoices: invoice.customProperties?.useStripeInvoices || false,
      stripeSyncStatus: invoice.customProperties?.stripeSyncStatus,
    }));

    return {
      invoices,
      total,
      limit: args.limit,
      offset: args.offset,
    };
  },
});

/**
 * FIND INVOICE BY STRIPE ID (INTERNAL)
 *
 * Find an invoice by its Stripe invoice ID.
 * Used by webhooks to locate the correct invoice.
 */
export const findInvoiceByStripeId = internalQuery({
  args: {
    stripeInvoiceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Search for invoice with matching Stripe ID
    const invoices = await ctx.db
      .query("objects")
      .filter((q) => q.eq(q.field("type"), "invoice"))
      .collect();

    const matchingInvoice = invoices.find(
      (inv) => inv.customProperties?.stripeInvoiceId === args.stripeInvoiceId
    );

    return matchingInvoice || null;
  },
});

/**
 * UPDATE INVOICE STRIPE STATUS (INTERNAL)
 *
 * Update invoice with Stripe-related status changes.
 * Called by webhook handlers.
 */
export const updateInvoiceStripeStatus = internalMutation({
  args: {
    invoiceId: v.id("objects"),
    status: v.optional(v.string()),
    stripeStatus: v.optional(v.string()),
    stripeHostedUrl: v.optional(v.string()),
    stripePdfUrl: v.optional(v.string()),
    stripeInvoiceId: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    amountPaidInCents: v.optional(v.number()),
    paymentFailureReason: v.optional(v.string()),
    actionRequired: v.optional(v.boolean()),
    voidedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);

    if (!invoice || invoice.type !== "invoice") {
      throw new Error("Invoice not found");
    }

    // Build update object
    const updates: Record<string, unknown> = {
      ...invoice.customProperties,
      updatedAt: Date.now(),
    };

    // Update status fields
    if (args.status !== undefined) {
      updates.paymentStatus = args.status;
    }
    if (args.stripeStatus !== undefined) {
      updates.stripeStatus = args.stripeStatus;
    }
    if (args.stripeHostedUrl !== undefined) {
      updates.stripeHostedUrl = args.stripeHostedUrl;
    }
    if (args.stripePdfUrl !== undefined) {
      updates.stripePdfUrl = args.stripePdfUrl;
    }
    if (args.stripeInvoiceId !== undefined) {
      updates.stripeInvoiceId = args.stripeInvoiceId;
    }
    if (args.paidAt !== undefined) {
      updates.paidAt = args.paidAt;
    }
    if (args.amountPaidInCents !== undefined) {
      updates.amountPaidInCents = args.amountPaidInCents;
    }
    if (args.paymentFailureReason !== undefined) {
      updates.paymentFailureReason = args.paymentFailureReason;
    }
    if (args.actionRequired !== undefined) {
      updates.actionRequired = args.actionRequired;
    }
    if (args.voidedAt !== undefined) {
      updates.voidedAt = args.voidedAt;
    }

    // Apply updates
    await ctx.db.patch(args.invoiceId, {
      customProperties: updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
