/**
 * PDF TICKET TEMPLATE RENDERER
 *
 * Backend service that resolves and generates PDF tickets using templates.
 * Follows the template resolution chain:
 * Ticket → Product → Event → Domain → Organization → System (default)
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
const generatedApi: any = require("./_generated/api");
import { Id, Doc } from "./_generated/dataModel";

/**
 * Resolve PDF Ticket Template Code
 *
 * Walks the resolution chain to find which PDF template to use.
 * Ticket → Product → Event → Domain → Organization → System
 */
export const resolvePdfTicketTemplateCode = action({
  args: {
    sessionId: v.string(),
    ticketId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<string> => {
    // 1. Get ticket
    const ticket = await (ctx as any).runQuery(generatedApi.api.ticketOntology.getTicket, {
      sessionId: args.sessionId,
      ticketId: args.ticketId,
    });

    // Check ticket-level template (for manual testing/overrides)
    const ticketProps = ticket.customProperties as any;

    // First check if there's a direct template ID reference (database template)
    if (ticketProps?.pdfTemplateId) {
      const template = await (ctx as any).runQuery(generatedApi.api.templateOntology.getPdfTemplateById, {
        templateId: ticketProps.pdfTemplateId as Id<"objects">,
      });
      if (template?.customProperties?.code) {
        console.log(`✅ Using ticket-level PDF template (DB): ${template.customProperties.code}`);
        return template.customProperties.code;
      }
    }

    // Fallback to direct code reference (hard-coded templates)
    if (ticketProps?.pdfTemplateCode) {
      console.log(`✅ Using ticket-level PDF template (code): ${ticketProps.pdfTemplateCode}`);
      return ticketProps.pdfTemplateCode as string;
    }

    // 2. Check product-level template
    const productId = ticketProps?.productId;
    if (productId) {
      const product = await (ctx as any).runQuery(generatedApi.api.productOntology.getProduct, {
        sessionId: args.sessionId,
        productId: productId as Id<"objects">,
      });

      const productProps = product.customProperties as any;

      // First check database template reference
      if (productProps?.pdfTemplateId) {
        const template = await (ctx as any).runQuery(generatedApi.api.templateOntology.getPdfTemplateById, {
          templateId: productProps.pdfTemplateId as Id<"objects">,
        });
        if (template?.customProperties?.code) {
          console.log(`✅ Using product-level PDF template (DB): ${template.customProperties.code}`);
          return template.customProperties.code;
        }
      }

      // Fallback to direct code reference
      if (productProps?.pdfTemplateCode) {
        console.log(`✅ Using product-level PDF template (code): ${productProps.pdfTemplateCode}`);
        return productProps.pdfTemplateCode as string;
      }
    }

    // 3. Check event-level template
    const eventId = ticketProps?.eventId;
    if (eventId) {
      const event = await (ctx as any).runQuery(generatedApi.api.eventOntology.getEvent, {
        sessionId: args.sessionId,
        eventId: eventId as Id<"objects">,
      });

      const eventProps = event.customProperties as any;

      // First check database template reference
      if (eventProps?.pdfTemplateId) {
        const template = await (ctx as any).runQuery(generatedApi.api.templateOntology.getPdfTemplateById, {
          templateId: eventProps.pdfTemplateId as Id<"objects">,
        });
        if (template?.customProperties?.code) {
          console.log(`✅ Using event-level PDF template (DB): ${template.customProperties.code}`);
          return template.customProperties.code;
        }
      }

      // Fallback to direct code reference
      if (eventProps?.pdfTemplateCode) {
        console.log(`✅ Using event-level PDF template (code): ${eventProps.pdfTemplateCode}`);
        return eventProps.pdfTemplateCode as string;
      }
    }

    // 4. Check domain-level template (from domain config)
    // TODO: Add domain config PDF template resolution when domain configs support pdfTemplateId

    // 5. Check organization-level template (if any custom org templates exist)
    // This would query for org-specific templates and use the first one
    // TODO: Implement org-level default template setting

    // 6. Default fallback to hard-coded system template - Professional
    console.log(`✅ Using fallback PDF template: ticket_professional_v1`);
    return "ticket_professional_v1";
  },
});

/**
 * Get PDF Ticket Template Data
 *
 * Gathers all data needed to generate a PDF ticket using a template.
 */
export const getPdfTicketTemplateData = action({
  args: {
    ticketId: v.id("objects"),
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<{
    templateCode: string;
    ticket: {
      _id: Id<"objects">;
      name: string;
      ticketNumber?: string;
      status: string;
      subtype?: string;
      customProperties: any;
    };
    event: {
      _id: Id<"objects">;
      name: string;
      customProperties: any;
    };
    order: {
      orderId: string;
      orderDate: number;
      currency: string;
      netPrice: number;
      taxAmount: number;
      taxRate: number;
      totalPrice: number;
    };
    qrCode: {
      dataUrl: string;
    };
    branding: {
      primaryColor: string;
      secondaryColor: string;
      accentColor?: string;
      logoUrl?: string;
    };
    organization: {
      name?: string;
      email?: string;
      phone?: string;
      website?: string;
    };
  }> => {
    // 1. Load ticket
    const ticket = await (ctx as any).runQuery(generatedApi.internal.ticketOntology.getTicketInternal, {
      ticketId: args.ticketId,
    }) as Doc<"objects"> | null;

    if (!ticket || ticket.type !== "ticket") {
      throw new Error("Ticket not found");
    }

    const ticketProps = ticket.customProperties || {};

    // 2. Load product/event
    const productId = ticketProps.productId as Id<"objects"> | undefined;
    if (!productId) {
      throw new Error("Ticket has no associated product");
    }

    const product = await (ctx as any).runQuery(generatedApi.internal.productOntology.getProductInternal, {
      productId,
    }) as Doc<"objects"> | null;

    if (!product) {
      throw new Error("Product not found");
    }

    const eventId = ticketProps.eventId as Id<"objects"> | undefined;
    if (!eventId) {
      throw new Error("Ticket has no associated event");
    }

    const event = await (ctx as any).runQuery(generatedApi.internal.eventOntology.getEventInternal, {
      eventId,
    }) as Doc<"objects"> | null;

    if (!event) {
      throw new Error("Event not found");
    }

    // 3. Load checkout session for order details
    const session = await (ctx as any).runQuery(
      generatedApi.internal.checkoutSessionOntology.getCheckoutSessionInternal,
      { checkoutSessionId: args.checkoutSessionId }
    ) as Doc<"objects"> | null;

    if (!session) {
      throw new Error("Checkout session not found");
    }

    // 4. Load organization info
    const organizationId = session.organizationId;
    const sellerOrg = await (ctx as any).runQuery(
      generatedApi.api.organizationOntology.getOrganizationProfile,
      { organizationId }
    ) as Doc<"objects"> | null;

    const sellerContact = await (ctx as any).runQuery(
      generatedApi.api.organizationOntology.getOrganizationContact,
      { organizationId }
    ) as Doc<"objects"> | null;

    // 5. Get pricing data from transaction (accurate tax info)
    const transactionId = ticketProps.transactionId as Id<"objects"> | undefined;
    let netPrice = 0;
    let taxAmount = 0;
    let totalPrice = 0;
    let taxRate = 0;

    if (transactionId) {
      const transaction = await (ctx as any).runQuery(generatedApi.internal.transactionOntology.getTransactionInternal, {
        transactionId,
      });

      if (transaction && transaction.type === "transaction") {
        netPrice = (transaction.customProperties?.unitPriceInCents as number) || 0;
        totalPrice = (transaction.customProperties?.totalPriceInCents as number) || 0;
        taxAmount = (transaction.customProperties?.taxAmountInCents as number) || 0;
        taxRate = netPrice > 0 ? ((taxAmount / netPrice) * 100) : 0;
      }
    }

    // Fallback to session totals if transaction not found
    if (totalPrice === 0) {
      const totalAmount = (session.customProperties?.totalAmount as number) || 0;
      const sessionTaxAmount = (session.customProperties?.taxAmount as number) || 0;
      const subtotalAmount = totalAmount - sessionTaxAmount;

      netPrice = subtotalAmount;
      taxAmount = sessionTaxAmount;
      totalPrice = totalAmount;
      taxRate = netPrice > 0 ? ((taxAmount / netPrice) * 100) : 0;
    }

    const currency = (session.customProperties?.currency as string) || "EUR";

    // 6. Generate QR code
    const qrResult = await (ctx as any).runAction(generatedApi.api.ticketGeneration.generateTicketQR, {
      ticketId: args.ticketId,
      holderEmail: ticketProps.holderEmail as string,
      holderName: ticketProps.holderName as string,
      eventName: event.name,
      eventDate: event.customProperties?.startDate as number | undefined,
    });

    // 7. Resolve template code
    const sessionId = `pdf_render_${Date.now()}`;
    const templateCode: string = await (ctx as any).runAction(
      generatedApi.api.pdfTicketTemplateRenderer.resolvePdfTicketTemplateCode,
      {
        sessionId,
        ticketId: args.ticketId,
      }
    );

    // 8. Get branding from domain config (TODO: implement domain config resolution)
    // For now, use default branding
    const branding = {
      primaryColor: "#d4af37",
      secondaryColor: "#8b7355",
      accentColor: "#ffffff",
      logoUrl: undefined,
    };

    // Return all data
    return {
      templateCode,
      ticket: {
        _id: ticket._id,
        name: ticket.name,
        ticketNumber: ticketProps.ticketNumber as string | undefined,
        status: ticket.status,
        subtype: ticket.subtype,
        customProperties: ticketProps,
      },
      event: {
        _id: event._id,
        name: event.name,
        customProperties: event.customProperties || {},
      },
      order: {
        orderId: session._id,
        orderDate: session.createdAt,
        currency,
        netPrice,
        taxAmount,
        taxRate,
        totalPrice,
      },
      qrCode: {
        dataUrl: qrResult.qrCodeDataUrl,
      },
      branding,
      organization: {
        name: sellerOrg?.name,
        email: sellerContact?.customProperties?.primaryEmail as string | undefined,
        phone: sellerContact?.customProperties?.primaryPhone as string | undefined,
        website: sellerContact?.customProperties?.website as string | undefined,
      },
    };
  },
});

/**
 * Generate PDF Ticket using Template.io
 *
 * Combines template resolution with Template.io rendering.
 * This is the main entry point for generating ticket PDFs.
 */
export const generatePdfTicketWithTemplateIo = action({
  args: {
    ticketId: v.id("objects"),
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<{
    status: "success" | "error";
    download_url?: string;
    transaction_ref?: string;
    error?: string;
    message?: string;
  }> => {
    try {
      // 1. Get template data (includes resolution chain)
      const templateData = await (ctx as any).runAction(
        generatedApi.api.pdfTicketTemplateRenderer.getPdfTicketTemplateData,
        {
          ticketId: args.ticketId,
          checkoutSessionId: args.checkoutSessionId,
        }
      );

      // 2. Get API key from environment
      const apiKey = process.env.API_TEMPLATE_IO_KEY;
      if (!apiKey) {
        return {
          status: "error",
          error: "MISSING_API_KEY",
          message: "API_TEMPLATE_IO_KEY environment variable is not configured",
        };
      }

      // 3. Format data for Template.io
      const ticketProps = templateData.ticket.customProperties || {};
      const eventProps = templateData.event.customProperties || {};

      // Format prices for display (convert cents to currency)
      // Preserved for future ticket price display support
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const formatPrice = (cents: number) => (cents / 100).toFixed(2);

      const ticketPdfData = {
        // Ticket info
        ticket_number: templateData.ticket.ticketNumber,
        ticket_type: templateData.ticket.subtype,
        attendee_name: ticketProps.holderName || templateData.ticket.name || "Guest",
        attendee_email: ticketProps.holderEmail,
        guest_count: ticketProps.guestCount || 0,

        // Event info
        event_name: templateData.event.name,
        event_date: eventProps.startDate
          ? new Date(eventProps.startDate as number).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          : "",
        event_time: eventProps.startTime || "",
        event_location: eventProps.location || "",
        event_address: eventProps.address || "",
        event_sponsors: eventProps.eventSponsors || [],

        // QR code
        qr_code_data: templateData.qrCode.dataUrl,

        // Organization/branding
        organization_name: templateData.organization.name,
        organization_email: templateData.organization.email,
        organization_phone: templateData.organization.phone,
        organization_website: templateData.organization.website,
        logo_url: templateData.branding.logoUrl,
        highlight_color: templateData.branding.primaryColor || "#6B46C1",

        // Order info
        order_id: templateData.order.orderId.substring(0, 12),
        order_date: new Date(templateData.order.orderDate).toLocaleDateString(),
        currency: templateData.order.currency.toUpperCase(),
        // Pass as numbers (convert cents to currency) for Jinja2 template comparisons
        net_price: templateData.order.netPrice / 100,
        tax_amount: templateData.order.taxAmount / 100,
        tax_rate: templateData.order.taxRate,
        total_price: templateData.order.totalPrice / 100,
      };

      // 4. Import and call Template.io generator
      const { generateTicketPdfFromTemplate } = await import("./lib/generateTicketPdf");

      const result = await generateTicketPdfFromTemplate({
        apiKey,
        templateCode: templateData.templateCode,
        ticketData: ticketPdfData,
      });

      return result;
    } catch (error) {
      console.error("❌ Error generating PDF ticket:", error);
      return {
        status: "error",
        error: "PDF_GENERATION_FAILED",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});
