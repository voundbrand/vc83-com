/**
 * PDF TICKET TEMPLATE RENDERER
 *
 * Compatibility wrapper over canonical ticket PDF resolution.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
const generatedApi: any = require("./_generated/api");
import { Id, Doc } from "./_generated/dataModel";

type TicketTemplateSetContext = {
  productId?: Id<"objects">;
  checkoutInstanceId?: Id<"objects">;
  domainConfigId?: Id<"objects">;
};

type ResolvedTicketPdfTemplate = {
  templateId?: Id<"objects">;
  templateCode: string;
  templateName: string;
  resolverSource: "template_set" | "fallback";
};

async function buildTemplateSetContextFromTicket(
  ctx: any,
  ticketProps: Record<string, unknown>
): Promise<TicketTemplateSetContext> {
  const context: TicketTemplateSetContext = {
    productId: ticketProps.productId as Id<"objects"> | undefined,
  };

  const checkoutSessionId = ticketProps.checkoutSessionId as Id<"objects"> | undefined;
  if (!checkoutSessionId) {
    return context;
  }

  const checkoutSession = await (ctx as any).runQuery(
    generatedApi.internal.checkoutSessionOntology.getCheckoutSessionInternal,
    { checkoutSessionId }
  );

  const checkoutProps = checkoutSession?.customProperties || {};
  const checkoutInstanceId = checkoutProps.checkoutInstanceId as Id<"objects"> | undefined;
  if (checkoutInstanceId) {
    context.checkoutInstanceId = checkoutInstanceId;
  }

  const domainConfigId = checkoutProps.domainConfigId as Id<"objects"> | undefined;
  if (domainConfigId) {
    context.domainConfigId = domainConfigId;
  }

  if (!context.productId) {
    const selectedProducts = checkoutProps.selectedProducts as Array<{ productId: string }> | undefined;
    if (selectedProducts?.length) {
      context.productId = selectedProducts[0].productId as Id<"objects">;
    }
  }

  return context;
}

async function resolveTicketPdfTemplate(
  ctx: any,
  params: {
    organizationId: Id<"organizations">;
    ticketProps: Record<string, unknown>;
    context?: TicketTemplateSetContext;
  }
): Promise<ResolvedTicketPdfTemplate> {
  const context = params.context || (await buildTemplateSetContextFromTicket(ctx, params.ticketProps));

  let canonicalTemplate: ResolvedTicketPdfTemplate | null = null;
  try {
    const templateId = await (ctx as any).runQuery(
      generatedApi.internal.templateSetQueries.resolveIndividualTemplateInternal,
      {
        organizationId: params.organizationId,
        templateCapability: "document_ticket",
        context,
      }
    );

    if (templateId) {
      const resolved = await (ctx as any).runQuery(
        generatedApi.internal.pdfTemplateQueries.resolvePdfTemplateInternal,
        { templateId }
      );
      canonicalTemplate = {
        templateId,
        templateCode: resolved.templateCode,
        templateName: resolved.name,
        resolverSource: "template_set",
      };
    }
  } catch (error) {
    console.error(
      `🎫 Canonical ticket template resolution failed for organization ${params.organizationId}:`,
      error
    );
  }

  if (canonicalTemplate) {
    return canonicalTemplate;
  }

  console.warn(`⚠️ [Template Resolver] Falling back to system ticket template.`);
  return {
    templateCode: "ticket_professional_v1",
    templateName: "System default ticket template",
    resolverSource: "fallback",
  };
}

/**
 * Resolve PDF Ticket Template Code
 */
export const resolvePdfTicketTemplateCode = action({
  args: {
    sessionId: v.string(),
    ticketId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<string> => {
    const ticket = await (ctx as any).runQuery(generatedApi.api.ticketOntology.getTicket, {
      sessionId: args.sessionId,
      ticketId: args.ticketId,
    });

    const ticketProps = (ticket?.customProperties || {}) as Record<string, unknown>;
    const resolved = await resolveTicketPdfTemplate(ctx, {
      organizationId: ticket.organizationId,
      ticketProps,
    });

    console.log(`✅ [Template Resolver] Resolved ticket PDF template: ${resolved.templateName} (${resolved.templateCode})`);
    return resolved.templateCode;
  },
});

/**
 * Get PDF Ticket Template Data
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
    const ticket = (await (ctx as any).runQuery(generatedApi.internal.ticketOntology.getTicketInternal, {
      ticketId: args.ticketId,
    })) as Doc<"objects"> | null;

    if (!ticket || ticket.type !== "ticket") {
      throw new Error("Ticket not found");
    }

    const ticketProps = ticket.customProperties || {};

    const productId = ticketProps.productId as Id<"objects"> | undefined;
    if (!productId) {
      throw new Error("Ticket has no associated product");
    }

    const product = (await (ctx as any).runQuery(generatedApi.internal.productOntology.getProductInternal, {
      productId,
    })) as Doc<"objects"> | null;

    if (!product) {
      throw new Error("Product not found");
    }

    const eventId = ticketProps.eventId as Id<"objects"> | undefined;
    if (!eventId) {
      throw new Error("Ticket has no associated event");
    }

    const event = (await (ctx as any).runQuery(generatedApi.internal.eventOntology.getEventInternal, {
      eventId,
    })) as Doc<"objects"> | null;

    if (!event) {
      throw new Error("Event not found");
    }

    const session = (await (ctx as any).runQuery(
      generatedApi.internal.checkoutSessionOntology.getCheckoutSessionInternal,
      { checkoutSessionId: args.checkoutSessionId }
    )) as Doc<"objects"> | null;

    if (!session) {
      throw new Error("Checkout session not found");
    }

    const organizationId = session.organizationId;
    const sellerOrg = (await (ctx as any).runQuery(
      generatedApi.api.organizationOntology.getOrganizationProfile,
      { organizationId }
    )) as Doc<"objects"> | null;

    const sellerContact = (await (ctx as any).runQuery(
      generatedApi.api.organizationOntology.getOrganizationContact,
      { organizationId }
    )) as Doc<"objects"> | null;

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
        taxRate = netPrice > 0 ? (taxAmount / netPrice) * 100 : 0;
      }
    }

    if (totalPrice === 0) {
      const totalAmount = (session.customProperties?.totalAmount as number) || 0;
      const sessionTaxAmount = (session.customProperties?.taxAmount as number) || 0;
      const subtotalAmount = totalAmount - sessionTaxAmount;

      netPrice = subtotalAmount;
      taxAmount = sessionTaxAmount;
      totalPrice = totalAmount;
      taxRate = netPrice > 0 ? (taxAmount / netPrice) * 100 : 0;
    }

    const currency = (session.customProperties?.currency as string) || "EUR";

    const qrResult = await (ctx as any).runAction(generatedApi.api.ticketGeneration.generateTicketQR, {
      ticketId: args.ticketId,
      holderEmail: ticketProps.holderEmail as string,
      holderName: ticketProps.holderName as string,
      eventName: event.name,
      eventDate: event.customProperties?.startDate as number | undefined,
    });

    const templateResolution = await resolveTicketPdfTemplate(ctx, {
      organizationId,
      ticketProps,
      context: {
        productId,
        checkoutInstanceId: session.customProperties?.checkoutInstanceId as Id<"objects"> | undefined,
        domainConfigId: session.customProperties?.domainConfigId as Id<"objects"> | undefined,
      },
    });

    const branding = {
      primaryColor: "#d4af37",
      secondaryColor: "#8b7355",
      accentColor: "#ffffff",
      logoUrl: undefined,
    };

    return {
      templateCode: templateResolution.templateCode,
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
 * Compatibility wrapper that routes generation to the canonical
 * `pdf/ticketPdf.generateTicketPDFFromTicket` runtime.
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
      const ticket = (await (ctx as any).runQuery(generatedApi.internal.ticketOntology.getTicketInternal, {
        ticketId: args.ticketId,
      })) as Doc<"objects"> | null;

      if (!ticket || ticket.type !== "ticket") {
        throw new Error("Ticket not found");
      }

      const templateResolution = await resolveTicketPdfTemplate(ctx, {
        organizationId: ticket.organizationId,
        ticketProps: (ticket.customProperties || {}) as Record<string, unknown>,
      });

      const downloadUrl = await (ctx as any).runAction(
        generatedApi.api.pdf.ticketPdf.generateTicketPDFFromTicket,
        {
          ticketId: args.ticketId,
          templateCode: templateResolution.templateCode,
        }
      );

      if (!downloadUrl) {
        return {
          status: "error",
          error: "PDF_GENERATION_FAILED",
          message: "Canonical ticket PDF generation returned no URL.",
        };
      }

      return {
        status: "success",
        download_url: downloadUrl,
        message: `Generated with template ${templateResolution.templateCode}`,
      };
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
