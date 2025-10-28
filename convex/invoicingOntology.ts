/**
 * Invoicing App - B2B/B2C Invoice Management
 *
 * This app provides comprehensive invoicing capabilities including:
 * - Consolidated B2B invoices (multiple employees → single employer invoice)
 * - Individual B2C invoices
 * - Invoice rules and automation
 * - CRM integration for billing details
 * - PDF generation and email delivery
 *
 * Licensing: This app must be registered and made available to organizations
 * through the appAvailabilities system. Only licensed organizations can access
 * invoicing features.
 */

import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser, checkPermission } from "./rbacHelpers";

// ============================================================================
// APP REGISTRATION CONSTANTS
// ============================================================================

/**
 * Invoice App Definition
 * Used to register this app in the apps table
 */
export const INVOICE_APP_DEFINITION = {
  code: "app_invoicing",
  name: "B2B/B2C Invoicing",
  description: "Comprehensive invoicing system with B2B consolidation, payment tracking, and automated billing workflows",
  category: "finance" as const,
  dataScope: "installer-owned" as const, // Each org has isolated invoice data
  status: "active" as const,
  version: "1.0.0",
  plans: ["business", "enterprise"] as ("free" | "pro" | "personal" | "business" | "enterprise")[],
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type InvoiceType = "b2b_consolidated" | "b2b_single" | "b2c_single";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled" | "awaiting_employer_payment";
export type PaymentTerms = "due_on_receipt" | "net7" | "net15" | "net30" | "net60" | "net90";
export type ConsolidationTrigger = "manual" | "automatic_on_event_end" | "fixed_date";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all invoices for an organization
 *
 * @permission view_financials - Required to view invoices
 * @roles org_owner, business_manager, super_admin
 */
export const listInvoices = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    filters: v.optional(v.object({
      status: v.optional(v.union(
        v.literal("draft"),
        v.literal("sent"),
        v.literal("paid"),
        v.literal("overdue"),
        v.literal("cancelled"),
        v.literal("awaiting_employer_payment")
      )),
      type: v.optional(v.union(
        v.literal("b2b_consolidated"),
        v.literal("b2b_single"),
        v.literal("b2c_single")
      )),
      eventId: v.optional(v.id("objects")),
    })),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission - org owners automatically have view_financials
    const hasPermission = await checkPermission(ctx, userId, "view_financials", args.organizationId);
    if (!hasPermission) {
      throw new Error("Nicht autorisiert: Keine Berechtigung zum Anzeigen von Rechnungen");
    }

    // Query invoices for this organization
    const invoiceQuery = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "invoice")
      );

    const invoices = await invoiceQuery.collect();

    // Apply filters
    let filteredInvoices = invoices;

    if (args.filters?.status) {
      filteredInvoices = filteredInvoices.filter(
        inv => inv.customProperties?.paymentStatus === args.filters?.status
      );
    }

    if (args.filters?.type) {
      filteredInvoices = filteredInvoices.filter(
        inv => inv.subtype === args.filters?.type
      );
    }

    if (args.filters?.eventId) {
      filteredInvoices = filteredInvoices.filter(
        inv => inv.customProperties?.eventId === args.filters?.eventId
      );
    }

    // Sort by date descending
    filteredInvoices.sort((a, b) =>
      (b.customProperties?.invoiceDate || b.createdAt) - (a.customProperties?.invoiceDate || a.createdAt)
    );

    return filteredInvoices;
  },
});

/**
 * Get invoice statistics for an organization
 *
 * Returns quick stats for dashboard display:
 * - Total invoice count
 * - Count by status (paid, pending, overdue)
 * - Total amount
 *
 * @permission view_financials - Required to view invoice statistics
 * @roles org_owner, business_manager, super_admin
 */
export const getInvoiceStats = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const hasPermission = await checkPermission(ctx, userId, "view_financials", args.organizationId);
    if (!hasPermission) {
      throw new Error("Nicht autorisiert: Keine Berechtigung zum Anzeigen von Rechnungsstatistiken");
    }

    // Get all invoices for organization
    const invoices = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "invoice")
      )
      .collect();

    // Calculate stats based on status field
    const totalCount = invoices.length;
    const paidCount = invoices.filter((inv) => inv.status === "paid").length;
    const pendingCount = invoices.filter(
      (inv) => inv.status === "sent" || inv.status === "awaiting_employer_payment"
    ).length;
    const overdueCount = invoices.filter((inv) => inv.status === "overdue").length;
    const draftCount = invoices.filter((inv) => inv.status === "draft").length;

    // Calculate total amount
    const totalAmountInCents = invoices.reduce((sum, inv) => {
      const amount = inv.customProperties?.totalInCents as number | undefined;
      return sum + (amount || 0);
    }, 0);

    const paidAmountInCents = invoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => {
        const amount = inv.customProperties?.totalInCents as number | undefined;
        return sum + (amount || 0);
      }, 0);

    return {
      totalCount,
      paidCount,
      pendingCount,
      overdueCount,
      draftCount,
      totalAmountInCents,
      paidAmountInCents,
      pendingAmountInCents: totalAmountInCents - paidAmountInCents,
    };
  },
});

/**
 * Get invoice by ID with full details
 *
 * @permission view_financials - Required to view invoice details
 * @roles org_owner, business_manager, super_admin
 */
export const getInvoiceById = query({
  args: {
    sessionId: v.string(),
    invoiceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const invoice = await ctx.db.get(args.invoiceId);

    if (!invoice || invoice.type !== "invoice") {
      throw new Error("Rechnung nicht gefunden");
    }

    // Check permission
    const hasPermission = await checkPermission(ctx, userId, "view_financials", invoice.organizationId);
    if (!hasPermission) {
      throw new Error("Nicht autorisiert: Keine Berechtigung zum Anzeigen dieser Rechnung");
    }

    // Get related tickets if consolidated
    const tickets = [];
    if (invoice.customProperties?.consolidatedTicketIds) {
      for (const ticketId of invoice.customProperties.consolidatedTicketIds) {
        const ticket = await ctx.db.get(ticketId as Id<"objects">);
        if (ticket) {
          tickets.push(ticket);
        }
      }
    }

    return {
      ...invoice,
      tickets,
    };
  },
});

/**
 * List invoice rules (consolidation rules)
 *
 * @permission manage_financials - Required to view invoice rules
 * @roles org_owner, business_manager, super_admin
 */
export const listInvoiceRules = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission
    const hasPermission = await checkPermission(ctx, userId, "manage_financials", args.organizationId);
    if (!hasPermission) {
      throw new Error("Nicht autorisiert: Keine Berechtigung zum Verwalten von Rechnungsregeln");
    }

    const rules = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "invoice_rule")
      )
      .collect();

    return rules;
  },
});

/**
 * Find tickets eligible for consolidation
 * Used to preview what will be consolidated before creating the invoice
 *
 * @permission manage_financials - Required to manage invoice consolidation
 * @roles org_owner, business_manager, super_admin
 */
export const findConsolidatableTickets = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    crmOrganizationId: v.id("objects"), // The employer organization (e.g., AMEOS)
    eventId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission
    const hasPermission = await checkPermission(ctx, userId, "manage_financials", args.organizationId);
    if (!hasPermission) {
      throw new Error("Nicht autorisiert: Keine Berechtigung zum Verwalten von Rechnungen");
    }

    // Find all tickets for this CRM organization
    const ticketQuery = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "ticket")
      );

    const allTickets = await ticketQuery.collect();

    // Filter tickets that:
    // 1. Are linked to the CRM organization
    // 2. Match the event (if specified)
    // 3. Are not already invoiced
    const eligibleTickets = allTickets.filter(ticket => {
      const props = ticket.customProperties || {};

      // Must be linked to the CRM organization
      if (props.crmOrganizationId !== args.crmOrganizationId) {
        return false;
      }

      // Must match event if specified
      if (args.eventId && props.eventId !== args.eventId) {
        return false;
      }

      // Must not already have an invoice
      if (props.invoiceId) {
        return false;
      }

      // Must be paid or awaiting employer payment
      if (props.paymentStatus !== "paid" && props.paymentStatus !== "awaiting_employer_payment") {
        return false;
      }

      return true;
    });

    return eligibleTickets;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a consolidated B2B invoice from multiple employee tickets
 * This is the core consolidation engine for the AMEOS use case
 */
export const createConsolidatedInvoice = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    crmOrganizationId: v.id("objects"), // The employer organization
    ticketIds: v.array(v.id("objects")),
    invoiceNumber: v.optional(v.string()), // Auto-generated if not provided
    paymentTerms: v.optional(v.union(
      v.literal("due_on_receipt"),
      v.literal("net7"),
      v.literal("net15"),
      v.literal("net30"),
      v.literal("net60"),
      v.literal("net90")
    )),
    dueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // NO AUTHENTICATION REQUIRED - Public checkout flow
    // Get system user for tracking (used for createdBy fields)
    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found - run seed script first");
    }

    const userId = systemUser._id;

    // Get CRM organization for billing details
    const crmOrg = await ctx.db.get(args.crmOrganizationId);
    if (!crmOrg || crmOrg.type !== "crm_organization") {
      throw new Error("CRM-Organisation nicht gefunden");
    }

    // Get all tickets and validate
    const tickets = [];
    let totalInCents = 0;
    const lineItems = [];

    for (const ticketId of args.ticketIds) {
      const ticket = await ctx.db.get(ticketId);

      if (!ticket || ticket.type !== "ticket") {
        throw new Error(`Ticket ${ticketId} nicht gefunden`);
      }

      if (ticket.organizationId !== args.organizationId) {
        throw new Error(`Ticket ${ticketId} gehört zu einer anderen Organisation`);
      }

      if (ticket.customProperties?.invoiceId) {
        throw new Error(`Ticket ${ticketId} wurde bereits fakturiert`);
      }

      tickets.push(ticket);

      // Build line item
      const props = ticket.customProperties || {};
      const itemTotal = (props.totalPriceInCents as number) || 0;
      totalInCents += itemTotal;

      // Get contact name
      let contactName = "Unbekannter Kontakt";
      if (props.contactId) {
        const contact = await ctx.db.get(props.contactId as Id<"objects">);
        if (contact && contact.type === "crm_contact") {
          contactName = contact.name || `${contact.customProperties?.firstName || ""} ${contact.customProperties?.lastName || ""}`.trim();
        }
      }

      // Get event name
      let eventName = "Event";
      if (props.eventId) {
        const event = await ctx.db.get(props.eventId as Id<"objects">);
        if (event) {
          eventName = event.name || "Event";
        }
      }

      lineItems.push({
        id: `line_${lineItems.length + 1}`,
        description: `${eventName} - ${contactName}`,
        ticketId: ticket._id,
        contactId: props.contactId,
        contactName,
        unitPriceInCents: itemTotal,
        totalPriceInCents: itemTotal,
        subItems: props.lineItems || [],
      });
    }

    // Generate invoice number if not provided
    const invoiceNumber = args.invoiceNumber || await generateInvoiceNumber(ctx, args.organizationId, "INV");

    // Calculate due date
    const invoiceDate = Date.now();
    let dueDate = args.dueDate;
    if (!dueDate && args.paymentTerms) {
      dueDate = calculateDueDate(invoiceDate, args.paymentTerms);
    }

    // Extract billing info from CRM organization
    const billTo = {
      type: "organization" as const,
      organizationId: crmOrg._id,
      name: crmOrg.name || "",
      billingAddress: crmOrg.customProperties?.billingAddress || {},
      billingEmail: (crmOrg.customProperties?.billingEmail || crmOrg.customProperties?.primaryEmail || "") as string,
      billingContact: (crmOrg.customProperties?.billingContact || "") as string,
      vatNumber: (crmOrg.customProperties?.vatNumber || "") as string,
    };

    // Create the consolidated invoice
    const now = Date.now();
    const invoiceId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "invoice",
      subtype: "b2b_consolidated",
      name: `Invoice #${invoiceNumber}`,
      status: "draft",
      customProperties: {
        invoiceNumber,
        invoiceDate,
        dueDate,
        billTo,
        lineItems,
        subtotalInCents: totalInCents,
        taxInCents: 0,
        totalInCents: totalInCents,
        currency: "EUR",
        paymentStatus: "awaiting_employer_payment",
        paymentTerms: args.paymentTerms || "net30",
        isEmployerInvoiced: true,
        isConsolidated: true,
        consolidatedTicketIds: args.ticketIds,
        notes: args.notes,
      },
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Link invoice to tickets
    for (const ticket of tickets) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: invoiceId,
        toObjectId: ticket._id,
        linkType: "includes_ticket",
        createdBy: userId,
        createdAt: now,
      });

      // Update ticket with invoice reference
      if (ticket.type === "ticket") {
        await ctx.db.patch(ticket._id, {
          customProperties: {
            ...ticket.customProperties,
            invoiceId,
            paymentStatus: "awaiting_employer_payment",
          },
          updatedAt: now,
        });
      }
    }

    return {
      success: true,
      invoiceId,
      invoiceNumber,
      totalInCents,
      ticketCount: tickets.length,
    };
  },
});

/**
 * Mark invoice as sent (updates status and records send date)
 *
 * @permission manage_financials - Required to manage invoice status
 * @roles org_owner, business_manager, super_admin
 */
export const markInvoiceAsSent = mutation({
  args: {
    sessionId: v.string(),
    invoiceId: v.id("objects"),
    sentTo: v.array(v.string()), // Email addresses
    pdfUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const invoice = await ctx.db.get(args.invoiceId);

    if (!invoice || invoice.type !== "invoice") {
      throw new Error("Rechnung nicht gefunden");
    }

    // Check permission
    const hasPermission = await checkPermission(ctx, userId, "manage_financials", invoice.organizationId);
    if (!hasPermission) {
      throw new Error("Nicht autorisiert: Keine Berechtigung zum Senden von Rechnungen");
    }

    const now = Date.now();

    await ctx.db.patch(args.invoiceId, {
      status: "sent" as const,
      customProperties: {
        ...invoice.customProperties,
        paymentStatus: invoice.customProperties?.isEmployerInvoiced ? "awaiting_employer_payment" : "sent",
        sentAt: now,
        sentTo: args.sentTo,
        pdfUrl: args.pdfUrl,
      },
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Mark invoice as paid (updates status and records payment date)
 *
 * @permission manage_financials - Required to manage invoice payment status
 * @roles org_owner, business_manager, super_admin
 */
export const markInvoiceAsPaid = mutation({
  args: {
    sessionId: v.string(),
    invoiceId: v.id("objects"),
    paymentDate: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    transactionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const invoice = await ctx.db.get(args.invoiceId);

    if (!invoice || invoice.type !== "invoice") {
      throw new Error("Rechnung nicht gefunden");
    }

    // Check permission
    const hasPermission = await checkPermission(ctx, userId, "manage_financials", invoice.organizationId);
    if (!hasPermission) {
      throw new Error("Nicht autorisiert: Keine Berechtigung zum Aktualisieren von Rechnungen");
    }

    const now = Date.now();
    const paymentDate = args.paymentDate || now;

    // Update invoice
    await ctx.db.patch(args.invoiceId, {
      status: "paid" as const,
      customProperties: {
        ...invoice.customProperties,
        paymentStatus: "paid",
        paidAt: paymentDate,
        paymentMethod: args.paymentMethod,
        transactionId: args.transactionId,
      },
      updatedAt: now,
    });

    // Update all linked tickets to paid status
    if (invoice.customProperties?.consolidatedTicketIds) {
      for (const ticketId of invoice.customProperties.consolidatedTicketIds) {
        const ticket = await ctx.db.get(ticketId as Id<"objects">);
        if (ticket && ticket.type === "ticket") {
          await ctx.db.patch(ticketId as Id<"objects">, {
            customProperties: {
              ...ticket.customProperties,
              paymentStatus: "paid_via_employer",
              paidAt: paymentDate,
            },
            updatedAt: now,
          });
        }
      }
    }

    return { success: true };
  },
});

/**
 * Create an invoice rule (consolidation automation)
 *
 * @permission manage_financials - Required to create invoice rules
 * @roles org_owner, business_manager, super_admin
 */
export const createInvoiceRule = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    ruleName: v.string(),
    crmOrganizationId: v.id("objects"), // The employer organization
    eventId: v.optional(v.id("objects")), // null = all events
    triggerType: v.union(
      v.literal("manual"),
      v.literal("automatic_on_event_end"),
      v.literal("fixed_date")
    ),
    daysAfterEvent: v.optional(v.number()),
    invoicePrefix: v.optional(v.string()),
    paymentTerms: v.union(
      v.literal("due_on_receipt"),
      v.literal("net7"),
      v.literal("net15"),
      v.literal("net30"),
      v.literal("net60"),
      v.literal("net90")
    ),
    billingEmail: v.string(),
    billingContact: v.optional(v.string()),
    autoGeneratePDF: v.optional(v.boolean()),
    autoSendInvoice: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission
    const hasPermission = await checkPermission(ctx, userId, "manage_financials", args.organizationId);
    if (!hasPermission) {
      throw new Error("Nicht autorisiert: Keine Berechtigung zum Erstellen von Rechnungsregeln");
    }

    const now = Date.now();

    const ruleId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "invoice_rule",
      subtype: "employer_consolidated",
      name: args.ruleName,
      status: "active",
      customProperties: {
        crmOrganizationId: args.crmOrganizationId,
        eventId: args.eventId,
        triggerType: args.triggerType,
        daysAfterEvent: args.daysAfterEvent,
        invoicePrefix: args.invoicePrefix || "INV",
        paymentTerms: args.paymentTerms,
        billingEmail: args.billingEmail,
        billingContact: args.billingContact,
        autoGeneratePDF: args.autoGeneratePDF ?? true,
        autoSendInvoice: args.autoSendInvoice ?? false,
      },
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, ruleId };
  },
});

/**
 * Execute an invoice rule (trigger consolidation)
 *
 * @permission manage_financials - Required to execute invoice rules
 * @roles org_owner, business_manager, super_admin
 */
export const executeInvoiceRule = mutation({
  args: {
    sessionId: v.string(),
    ruleId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const rule = await ctx.db.get(args.ruleId);

    if (!rule || rule.type !== "invoice_rule") {
      throw new Error("Rechnungsregel nicht gefunden");
    }

    // Check permission
    const hasPermission = await checkPermission(ctx, userId, "manage_financials", rule.organizationId);
    if (!hasPermission) {
      throw new Error("Nicht autorisiert: Keine Berechtigung zum Ausführen von Rechnungsregeln");
    }

    const props = rule.customProperties || {};

    // Find eligible tickets
    const ticketQuery = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", rule.organizationId).eq("type", "ticket")
      );

    const allTickets = await ticketQuery.collect();

    const eligibleTickets = allTickets.filter(ticket => {
      const ticketProps = ticket.customProperties || {};

      // Must be linked to the CRM organization
      if (ticketProps.crmOrganizationId !== props.crmOrganizationId) {
        return false;
      }

      // Must match event if specified
      if (props.eventId && ticketProps.eventId !== props.eventId) {
        return false;
      }

      // Must not already have an invoice
      if (ticketProps.invoiceId) {
        return false;
      }

      // Must be paid or awaiting employer payment
      if (ticketProps.paymentStatus !== "paid" && ticketProps.paymentStatus !== "awaiting_employer_payment") {
        return false;
      }

      return true;
    });

    if (eligibleTickets.length === 0) {
      throw new Error("Keine geeigneten Tickets für die Konsolidierung gefunden");
    }

    // Return information about tickets that would be consolidated
    // The actual consolidation should be triggered via a separate call to createConsolidatedInvoice
    return {
      success: true,
      message: `Found ${eligibleTickets.length} tickets ready for consolidation`,
      eligibleTicketCount: eligibleTickets.length,
      eligibleTicketIds: eligibleTickets.map(t => t._id),
      crmOrganizationId: props.crmOrganizationId as Id<"objects">,
      paymentTerms: props.paymentTerms as PaymentTerms,
      invoicePrefix: (props.invoicePrefix as string) || "INV",
    };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique invoice number
 */
async function generateInvoiceNumber(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: Id<"organizations">,
  prefix: string
): Promise<string> {
  // Get the latest invoice for this org
  const latestInvoice = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q: { eq: (field: string, value: Id<"organizations"> | string) => { eq: (field: string, value: string) => unknown } }) =>
      q.eq("organizationId", organizationId).eq("type", "invoice")
    )
    .order("desc")
    .first();

  let sequence = 1;
  if (latestInvoice?.customProperties?.invoiceNumber) {
    const match = (latestInvoice.customProperties.invoiceNumber as string).match(/(\d+)$/);
    if (match) {
      sequence = parseInt(match[1], 10) + 1;
    }
  }

  const year = new Date().getFullYear();
  return `${prefix}-${year}-${sequence.toString().padStart(4, "0")}`;
}

/**
 * Calculate due date based on payment terms
 */
function calculateDueDate(invoiceDate: number, terms: PaymentTerms): number {
  const date = new Date(invoiceDate);

  switch (terms) {
    case "due_on_receipt":
      return invoiceDate;
    case "net7":
      date.setDate(date.getDate() + 7);
      break;
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

// ============================================================================
// INTERNAL QUERIES AND MUTATIONS
// ============================================================================

/**
 * Get invoice by ID (internal)
 */
export const getInvoiceByIdInternal = internalQuery({
  args: {
    invoiceId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);

    if (!invoice || invoice.type !== "invoice") {
      throw new Error("Invoice not found");
    }

    return invoice;
  },
});

/**
 * Update invoice PDF URL (internal)
 */
export const updateInvoicePdfUrl = internalMutation({
  args: {
    invoiceId: v.id("objects"),
    pdfUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    await ctx.db.patch(args.invoiceId, {
      customProperties: {
        ...invoice.customProperties,
        pdfUrl: args.pdfUrl,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// INTERNAL MUTATIONS FOR APP REGISTRATION
// ============================================================================

/**
 * Register the invoicing app in the apps table
 * Should be called during system initialization
 */
export const registerInvoicingApp = internalMutation({
  args: {
    creatorOrgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Check if app already exists
    const existingApp = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", INVOICE_APP_DEFINITION.code))
      .first();

    if (existingApp) {
      console.log("Invoicing app already registered");
      return { appId: existingApp._id, alreadyExists: true };
    }

    const now = Date.now();

    const appId = await ctx.db.insert("apps", {
      code: INVOICE_APP_DEFINITION.code,
      name: INVOICE_APP_DEFINITION.name,
      description: INVOICE_APP_DEFINITION.description,
      category: INVOICE_APP_DEFINITION.category,
      dataScope: INVOICE_APP_DEFINITION.dataScope,
      status: INVOICE_APP_DEFINITION.status,
      version: INVOICE_APP_DEFINITION.version,
      plans: INVOICE_APP_DEFINITION.plans,
      creatorOrgId: args.creatorOrgId,
      createdAt: now,
      updatedAt: now,
    });

    console.log("Invoicing app registered successfully", { appId });
    return { appId, alreadyExists: false };
  },
});

/**
 * Enable invoicing app for an organization
 * Super admin action to license the app to a specific organization
 */
export const enableInvoicingForOrg = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    approvedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Find invoicing app
    const app = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", INVOICE_APP_DEFINITION.code))
      .first();

    if (!app) {
      throw new Error("Invoicing app not found. Please register it first.");
    }

    // Check if already enabled
    const existing = await ctx.db
      .query("appAvailabilities")
      .withIndex("by_org_app", (q) =>
        q.eq("organizationId", args.organizationId).eq("appId", app._id)
      )
      .first();

    if (existing) {
      if (existing.isAvailable) {
        return { success: true, message: "App already enabled", availabilityId: existing._id };
      }

      // Update to enable
      await ctx.db.patch(existing._id, {
        isAvailable: true,
        approvedBy: args.approvedBy,
        approvedAt: Date.now(),
      });

      return { success: true, message: "App re-enabled", availabilityId: existing._id };
    }

    // Create new availability
    const availabilityId = await ctx.db.insert("appAvailabilities", {
      appId: app._id,
      organizationId: args.organizationId,
      isAvailable: true,
      approvedBy: args.approvedBy,
      approvedAt: Date.now(),
    });

    return { success: true, message: "App enabled", availabilityId };
  },
});
