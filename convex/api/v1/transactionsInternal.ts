/**
 * INTERNAL TRANSACTIONS QUERIES
 */

import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

/**
 * GET TRANSACTION INTERNAL
 * Returns transaction with linked tickets and invoices
 */
export const getTransactionInternal = internalQuery({
  args: {
    transactionId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get transaction
    const transaction = await ctx.db.get(args.transactionId);

    if (!transaction || transaction.type !== "transaction") {
      return null;
    }

    // Verify organization ownership
    if (transaction.organizationId !== args.organizationId) {
      return null;
    }

    const customProps = transaction.customProperties as Record<string, unknown> | undefined;

    // Get linked tickets
    const ticketLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.transactionId))
      .filter((q) => q.eq(q.field("linkType"), "has_ticket"))
      .collect();

    const tickets = [];
    for (const link of ticketLinks) {
      const ticket = await ctx.db.get(link.toObjectId);
      if (ticket) {
        const ticketProps = ticket.customProperties as Record<string, unknown> | undefined;
        tickets.push({
          id: ticket._id,
          status: ticket.status,
          qrCode: ticketProps?.qrCode as string | undefined,
          registrationData: ticketProps?.registrationData as Record<string, unknown> | undefined,
        });
      }
    }

    // Get linked invoices
    const invoiceLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.transactionId))
      .filter((q) => q.eq(q.field("linkType"), "has_invoice"))
      .collect();

    const invoices = [];
    for (const link of invoiceLinks) {
      const invoice = await ctx.db.get(link.toObjectId);
      if (invoice) {
        const invoiceProps = invoice.customProperties as Record<string, unknown> | undefined;
        invoices.push({
          id: invoice._id,
          status: invoice.status,
          dueDate: invoiceProps?.dueDate as number | undefined,
        });
      }
    }

    // Transform for API response
    return {
      id: transaction._id,
      status: transaction.status,
      name: transaction.name,
      description: transaction.description,
      createdAt: customProps?.createdAt as number | undefined,
      source: customProps?.source as string | undefined,
      trigger: customProps?.trigger as string | undefined,
      tickets,
      invoices,
    };
  },
});
