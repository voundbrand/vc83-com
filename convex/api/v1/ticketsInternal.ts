/**
 * INTERNAL TICKETS FUNCTIONS
 *
 * Internal queries, mutations, and actions used by the MCP server and API endpoints.
 * These bypass session authentication since API keys are used instead.
 *
 * Note: Core CRUD operations (create, update, get) are in ticketOntology.ts
 * This file adds list/search, validation, and PDF generation functions.
 */

import { internalAction, internalQuery, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";

const generatedApi: any = require("../../_generated/api");

/**
 * GENERATE TICKET PDF INTERNAL
 * Creates a PDF for the ticket
 */
export const generateTicketPdfInternal = internalAction({
  args: {
    ticketId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<ArrayBuffer | null> => {
    // Get ticket data
    const ticket = await (ctx as any).runQuery(generatedApi.internal.ticketOntology.getTicketInternal, {
      ticketId: args.ticketId,
    }) as { _id: string; organizationId: string; customProperties?: Record<string, unknown> } | null;

    if (!ticket || ticket.organizationId !== args.organizationId) {
      return null;
    }

    // Generate PDF using existing PDF generation system
    // For now, return a placeholder
    // In production, call your actual PDF generation service
    const customProps = ticket.customProperties as Record<string, unknown> | undefined;
    const registrationData = (customProps?.registrationData as Record<string, unknown>) || {};
    const qrCode = (customProps?.qrCode as string) || "N/A";

    const pdfContent = `
      Ticket Confirmation
      -------------------
      Ticket ID: ${ticket._id}
      Name: ${registrationData.fullName || "Guest"}
      QR Code: ${qrCode}

      Please present this ticket at the event.
    `;

    // Convert to buffer (in production, use actual PDF library)
    const encoder = new TextEncoder();
    return encoder.encode(pdfContent).buffer;
  },
});

/**
 * GET TICKET FOR PDF
 * Internal query to get ticket data for PDF generation
 */
export const getTicketForPdf = internalAction({
  args: {
    ticketId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{
    id: string;
    status: string;
    qrCode: string;
    registrationData: Record<string, unknown>;
  } | null> => {
    const ticket = await (ctx as any).runQuery(generatedApi.internal.ticketOntology.getTicketInternal, {
      ticketId: args.ticketId,
    }) as { _id: string; organizationId: string; status: string; customProperties?: Record<string, unknown> } | null;

    if (!ticket || ticket.organizationId !== args.organizationId) {
      return null;
    }

    const customProps = ticket.customProperties as Record<string, unknown> | undefined;
    return {
      id: ticket._id,
      status: ticket.status,
      qrCode: (customProps?.qrCode as string) || "",
      registrationData: (customProps?.registrationData as Record<string, unknown>) || {},
    };
  },
});

// ============================================================================
// TICKET QUERY AND MUTATION OPERATIONS (FOR MCP SERVER)
// ============================================================================

/**
 * LIST TICKETS INTERNAL
 *
 * Lists ticket instances with filtering and pagination.
 * Used by MCP server for AI-driven ticket listing.
 */
export const listTicketsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    eventId: v.optional(v.id("objects")),
    productId: v.optional(v.id("objects")),
    status: v.optional(v.string()), // "issued" | "redeemed" | "cancelled" | "transferred"
    subtype: v.optional(v.string()), // "standard" | "vip" | "early-bird" | "student"
    holderEmail: v.optional(v.string()),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Query all ticket instances for organization
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "ticket")
      );

    const allTickets = await query.collect();

    // 2. Apply filters
    let filteredTickets = allTickets;

    if (args.eventId) {
      filteredTickets = filteredTickets.filter((t) => {
        const customProps = t.customProperties as Record<string, unknown> | undefined;
        return customProps?.eventId === args.eventId;
      });
    }

    if (args.productId) {
      filteredTickets = filteredTickets.filter((t) => {
        const customProps = t.customProperties as Record<string, unknown> | undefined;
        return customProps?.productId === args.productId;
      });
    }

    if (args.status) {
      filteredTickets = filteredTickets.filter((t) => t.status === args.status);
    }

    if (args.subtype) {
      filteredTickets = filteredTickets.filter((t) => t.subtype === args.subtype);
    }

    if (args.holderEmail) {
      filteredTickets = filteredTickets.filter((t) => {
        const customProps = t.customProperties as Record<string, unknown> | undefined;
        const email = customProps?.holderEmail as string | undefined;
        return email?.toLowerCase() === args.holderEmail!.toLowerCase();
      });
    }

    // 3. Sort by creation date (newest first)
    filteredTickets.sort((a, b) => b.createdAt - a.createdAt);

    // 4. Apply pagination
    const total = filteredTickets.length;
    const paginatedTickets = filteredTickets.slice(args.offset, args.offset + args.limit);

    // 5. Format response
    const tickets = paginatedTickets.map((ticket) => {
      const customProps = ticket.customProperties as Record<string, unknown> | undefined;
      return {
        id: ticket._id,
        organizationId: ticket.organizationId,
        name: ticket.name,
        subtype: ticket.subtype,
        status: ticket.status,
        holderName: customProps?.holderName as string | undefined,
        holderEmail: customProps?.holderEmail as string | undefined,
        productId: customProps?.productId as string | undefined,
        eventId: customProps?.eventId as string | undefined,
        qrCode: customProps?.qrCode as string | undefined,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      };
    });

    return {
      tickets,
      total,
      limit: args.limit,
      offset: args.offset,
    };
  },
});

/**
 * VALIDATE TICKET INTERNAL
 *
 * Validates a ticket by QR code or ticket ID.
 * Used for check-in at events.
 */
export const validateTicketInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    ticketId: v.optional(v.string()),
    qrCode: v.optional(v.string()),
    eventId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    if (!args.ticketId && !args.qrCode) {
      return { valid: false, reason: "Either ticketId or qrCode is required" };
    }

    let ticket = null;

    // Find by ticketId
    if (args.ticketId) {
      ticket = await ctx.db.get(args.ticketId as Id<"objects">);
    }

    // Find by QR code
    if (!ticket && args.qrCode) {
      const allTickets = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "ticket")
        )
        .collect();

      ticket = allTickets.find((t) => {
        const customProps = t.customProperties as Record<string, unknown> | undefined;
        return customProps?.qrCode === args.qrCode;
      }) || null;
    }

    if (!ticket) {
      return { valid: false, reason: "Ticket not found" };
    }

    if (ticket.type !== "ticket") {
      return { valid: false, reason: "Invalid ticket" };
    }

    if (ticket.organizationId !== args.organizationId) {
      return { valid: false, reason: "Ticket not found" };
    }

    // Check event match if specified
    if (args.eventId) {
      const customProps = ticket.customProperties as Record<string, unknown> | undefined;
      if (customProps?.eventId !== args.eventId) {
        return { valid: false, reason: "Ticket is not for this event" };
      }
    }

    // Check ticket status
    if (ticket.status === "cancelled") {
      return { valid: false, reason: "Ticket has been cancelled" };
    }

    if (ticket.status === "redeemed") {
      return { valid: false, reason: "Ticket has already been used" };
    }

    const customProps = ticket.customProperties as Record<string, unknown> | undefined;
    return {
      valid: true,
      ticket: {
        id: ticket._id,
        status: ticket.status,
        subtype: ticket.subtype,
        holderName: customProps?.holderName as string | undefined,
        holderEmail: customProps?.holderEmail as string | undefined,
        eventId: customProps?.eventId as string | undefined,
        productId: customProps?.productId as string | undefined,
      },
    };
  },
});

/**
 * REDEEM TICKET INTERNAL
 *
 * Marks a ticket as redeemed (checked in).
 * Used by MCP server for AI-driven check-in.
 */
export const redeemTicketInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    ticketId: v.string(),
    performedBy: v.optional(v.id("users")),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    // 1. Get ticket
    const ticket = await ctx.db.get(args.ticketId as Id<"objects">);

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    if (ticket.type !== "ticket") {
      throw new Error("Ticket not found");
    }

    if (ticket.organizationId !== args.organizationId) {
      throw new Error("Ticket not found");
    }

    // 2. Check current status
    if (ticket.status === "cancelled") {
      throw new Error("Ticket has been cancelled");
    }

    if (ticket.status === "redeemed") {
      throw new Error("Ticket has already been redeemed");
    }

    // 3. Update to redeemed status
    const currentProps = (ticket.customProperties || {}) as Record<string, unknown>;
    await ctx.db.patch(ticket._id, {
      status: "redeemed",
      customProperties: {
        ...currentProps,
        redeemedAt: Date.now(),
        redeemedBy: args.performedBy,
        ...(args.metadata || {}),
      },
      updatedAt: Date.now(),
    });

    // 4. Log action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: ticket._id,
        actionType: "ticket_redeemed_via_mcp",
        actionData: {
          source: "mcp",
          metadata: args.metadata,
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * VOID TICKET INTERNAL
 *
 * Cancels a ticket (soft delete).
 * Used by MCP server for AI-driven ticket cancellation.
 */
export const voidTicketInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    ticketId: v.string(),
    reason: v.optional(v.string()),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Get ticket
    const ticket = await ctx.db.get(args.ticketId as Id<"objects">);

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    if (ticket.type !== "ticket") {
      throw new Error("Ticket not found");
    }

    if (ticket.organizationId !== args.organizationId) {
      throw new Error("Ticket not found");
    }

    // 2. Check current status
    if (ticket.status === "cancelled") {
      throw new Error("Ticket is already cancelled");
    }

    // 3. Update to cancelled status
    const currentProps = (ticket.customProperties || {}) as Record<string, unknown>;
    await ctx.db.patch(ticket._id, {
      status: "cancelled",
      customProperties: {
        ...currentProps,
        cancelledAt: Date.now(),
        cancelledBy: args.performedBy,
        cancellationReason: args.reason,
      },
      updatedAt: Date.now(),
    });

    // 4. Log action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: ticket._id,
        actionType: "ticket_voided_via_mcp",
        actionData: {
          source: "mcp",
          reason: args.reason,
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return { success: true };
  },
});
