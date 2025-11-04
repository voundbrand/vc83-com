/**
 * TICKET GENERATION
 *
 * Generates QR codes, PDFs, and handles email delivery for tickets.
 * Modern, production-ready ticket system with downloads and email.
 *
 * TODO: PDF TEMPLATE CUSTOMIZATION FEATURE
 * ========================================
 * Allow organizations to customize ticket and invoice PDF templates.
 *
 * IMPLEMENTATION PLAN:
 *
 * 1. BACKEND (convex/pdfTemplates.ts - NEW FILE):
 *    - Create pdf_template object type in schema
 *    - Fields: organizationId, templateType ("ticket" | "invoice"),
 *      templateCode, customHtml, customCss, defaultFields, customFields
 *    - CRUD mutations: createPdfTemplate, updatePdfTemplate, deletePdfTemplate
 *    - Query: getPdfTemplatesByOrg, getActivePdfTemplate
 *    - Template gallery with 3-5 pre-built designs per type
 *
 * 2. PDF GENERATION UPDATES (this file + pdfGeneration.ts):
 *    - Add templateId parameter to generateTicketPDF and generateInvoicePDF
 *    - If templateId provided: load custom template from database
 *    - If no templateId: use default built-in template (current behavior)
 *    - Merge custom fields with default data
 *    - Apply custom CSS/HTML to PDF generation
 *
 * 3. ORGANIZATION SETTINGS UI (src/components/window-content/settings-window/):
 *    - New tab: "PDF Templates"
 *    - Template Gallery: Show preview cards for ticket/invoice templates
 *    - Template Editor: Visual editor with live preview
 *      - Upload logo
 *      - Customize colors (brand colors)
 *      - Edit header/footer text
 *      - Add custom fields (e.g., "Special Instructions")
 *      - Toggle elements (show/hide QR code, barcode, sponsors)
 *    - Set default template per organization
 *
 * 4. TEMPLATE DATA MODEL:
 *    interface PdfTemplate {
 *      _id: Id<"objects">;
 *      type: "pdf_template";
 *      organizationId: Id<"organizations">;
 *      templateType: "ticket" | "invoice";
 *      name: string; // "Modern Blue Ticket", "Classic Invoice"
 *      templateCode: string; // "modern-blue", "classic-invoice"
 *      isDefault: boolean; // One default per type per org
 *
 *      // Visual customization
 *      branding: {
 *        logoUrl?: string;
 *        primaryColor: string; // "#6B46C1"
 *        secondaryColor: string;
 *        fontFamily: string; // "Inter", "Roboto"
 *      };
 *
 *      // Layout options
 *      layout: {
 *        showQrCode: boolean;
 *        showBarcode: boolean;
 *        showSponsors: boolean;
 *        headerText?: string;
 *        footerText?: string;
 *      };
 *
 *      // Custom fields (e.g., "Dress Code", "Parking Info")
 *      customFields: Array<{
 *        key: string;
 *        label: string;
 *        value: string;
 *        position: "header" | "body" | "footer";
 *      }>;
 *
 *      // Advanced: Full HTML/CSS override
 *      customHtml?: string;
 *      customCss?: string;
 *    }
 *
 * 5. USAGE FLOW:
 *    - Organization admin goes to Settings → PDF Templates
 *    - Selects template from gallery OR creates custom template
 *    - Customizes branding (logo, colors, text)
 *    - Clicks "Set as Default" → saves as org's default template
 *    - Future ticket/invoice PDFs automatically use this template
 *
 * 6. FALLBACK BEHAVIOR:
 *    - If no custom template: use built-in default (current behavior)
 *    - If custom template fails to render: fallback to default + log error
 *    - Always ensure PDFs generate even if customization breaks
 *
 * RELATED FILES TO UPDATE:
 * - convex/pdfGeneration.ts (add template loading logic)
 * - convex/pdfTemplates.ts (NEW - CRUD for templates)
 * - convex/schema.ts (add pdf_template object type)
 * - src/components/window-content/settings-window/pdf-templates-tab.tsx (NEW - UI)
 * - src/lib/pdf-template-editor.tsx (NEW - visual editor component)
 */

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";

/**
 * GENERATE TICKET QR CODE
 *
 * Generates a QR code data URL for a ticket.
 * QR code contains: ticketId, holderEmail, eventName, date
 */
export const generateTicketQR = action({
  args: {
    ticketId: v.id("objects"),
    holderEmail: v.string(),
    holderName: v.string(),
    eventName: v.string(),
    eventDate: v.optional(v.number()),
  },
  handler: async (_ctx, args): Promise<{ qrCodeDataUrl: string }> => {
    // Create verification URL for the ticket
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-ticket/${args.ticketId}`;

    // Use external QR code API (works reliably in Convex backend)
    // This is the proven solution from eventrrr reference project
    const encodedUrl = encodeURIComponent(verificationUrl);
    const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodedUrl}&color=6B46C1&bgcolor=FFFFFF`;

    // Fetch the QR code image
    const response = await fetch(qrCodeApiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch QR code: ${response.status} ${response.statusText}`);
    }

    // Convert to base64 data URL
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
    const qrCodeDataUrl = `data:image/png;base64,${base64}`;

    return { qrCodeDataUrl };
  },
});

/**
 * GENERATE TICKET PDF DATA (PUBLIC - Called from frontend)
 *
 * Generates structured ticket data for PDF generation.
 * This returns data that the frontend can use to render a PDF.
 */
export const generateTicketPDFData = action({
  args: {
    ticketId: v.id("objects"),
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<{
    ticketNumber: string;
    holderName: string;
    holderEmail: string;
    eventName: string;
    eventDescription?: string;
    eventLocation?: string;
    eventStartDate?: number;
    eventEndDate?: number;
    eventAgenda?: Array<{ time: string; title: string; description?: string }>;
    eventSponsors?: Array<{ name: string; level?: string }>;
    ticketType: string;
    purchaseDate: number;
    qrCodeDataUrl: string;
    organizationName: string;
    pricePerUnit: number;
    currency: string;
    // Legacy field for backwards compatibility
    eventDate?: number;
  }> => {
    // 1. Get ticket data
    const ticket = await ctx.runQuery(internal.ticketOntology.getTicketInternal, {
      ticketId: args.ticketId,
    }) as Doc<"objects"> | null;

    if (!ticket || ticket.type !== "ticket") {
      throw new Error("Ticket not found");
    }

    // 2. Get product/event data
    const productId = ticket.customProperties?.productId as Id<"objects">;
    const product = await ctx.runQuery(internal.productOntology.getProductInternal, {
      productId,
    }) as Doc<"objects"> | null;

    if (!product) {
      throw new Error("Product not found");
    }

    // 3. Get checkout session for purchase details
    const session = await ctx.runQuery(
      internal.checkoutSessionOntology.getCheckoutSessionInternal,
      {
        checkoutSessionId: args.checkoutSessionId,
      }
    ) as Doc<"objects"> | null;

    if (!session) {
      throw new Error("Checkout session not found");
    }

    // 4. Extract event info - prefer from checkout session, fallback to product
    console.log("🎫 [generateTicketPDFData] Session custom properties:", {
      hasEventName: !!session.customProperties?.eventName,
      eventName: session.customProperties?.eventName,
      hasEventSponsors: !!session.customProperties?.eventSponsors,
      eventSponsors: session.customProperties?.eventSponsors,
      allSessionKeys: Object.keys(session.customProperties || {})
    });

    const eventName = (session.customProperties?.eventName as string) || product.name;
    const eventDescription = (session.customProperties?.eventDescription as string) || product.description || "";
    const eventLocation = (session.customProperties?.eventLocation as string) ||
      (product.customProperties?.location as string | undefined);
    // Fix: Events use startDate, check multiple field names
    const eventStartDate = (session.customProperties?.eventStartDate as number) ||
      (session.customProperties?.startDate as number) ||
      (session.customProperties?.eventDate as number) ||
      (product.customProperties?.startDate as number | undefined) ||
      (product.customProperties?.eventDate as number | undefined);
    const eventEndDate = (session.customProperties?.eventEndDate as number) || undefined;
    const eventAgenda = session.customProperties?.eventAgenda as Array<{ time: string; title: string; description?: string }> | undefined;
    const eventSponsors = session.customProperties?.eventSponsors as Array<{ name: string; level?: string }> | undefined;

    console.log("✅ [generateTicketPDFData] Extracted event data:", {
      eventName,
      eventDescription,
      eventLocation,
      eventStartDate,
      eventEndDate,
      hasAgenda: !!eventAgenda,
      agendaItemCount: eventAgenda?.length || 0,
      hasSponsors: !!eventSponsors,
      sponsorCount: eventSponsors?.length || 0,
      sponsors: eventSponsors
    });

    // 5. Generate QR code
    const qrResult = await ctx.runAction(api.ticketGeneration.generateTicketQR, {
      ticketId: args.ticketId,
      holderEmail: ticket.customProperties?.holderEmail as string,
      holderName: ticket.customProperties?.holderName as string,
      eventName,
      eventDate: eventStartDate, // Use eventStartDate for QR code
    });
    const qrCodeDataUrl = qrResult.qrCodeDataUrl;

    // 6. Return structured ticket data for PDF generation
    return {
      ticketNumber: ticket.customProperties?.ticketNumber || ticket._id.substring(0, 12),
      holderName: ticket.customProperties?.holderName as string,
      holderEmail: ticket.customProperties?.holderEmail as string,
      eventName,
      eventDescription,
      eventLocation,
      eventStartDate,
      eventEndDate,
      eventAgenda,
      eventSponsors,
      ticketType: ticket.subtype || "standard",
      purchaseDate: ticket.createdAt,
      qrCodeDataUrl,
      organizationName:
        (session.customProperties?.organizationName as string) || "L4YERCAK3",
      pricePerUnit: ticket.customProperties?.pricePerUnit as number,
      // Legacy field for backwards compatibility
      eventDate: eventStartDate,
      currency: (session.customProperties?.currency as string) || "EUR",
    };
  },
});

/**
 * GENERATE RECEIPT PDF DATA (PUBLIC - Called from frontend)
 *
 * Generates structured receipt data for PDF generation.
 */
export const generateReceiptPDFData = action({
  args: {
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<{
    receiptNumber: string;
    purchaseDate: number;
    customerName: string;
    customerEmail: string;
    items: Array<{
      productName: string;
      quantity: number;
      pricePerUnit: number;
      totalPrice: number;
    }>;
    subtotal: number;
    taxAmount: number;
    total: number;
    currency: string;
    paymentMethod: string;
    organizationName: string;
    organizationAddress: string;
    paymentIntentId: string;
  }> => {
    // 1. Get checkout session
    const session = await ctx.runQuery(
      internal.checkoutSessionOntology.getCheckoutSessionInternal,
      {
        checkoutSessionId: args.checkoutSessionId,
      }
    ) as Doc<"objects"> | null;

    if (!session || session.type !== "checkout_session") {
      throw new Error("Checkout session not found");
    }

    // 2. Get purchase items
    const purchaseItemIds = (session.customProperties?.purchasedItemIds as Id<"objects">[]) || [];
    const purchaseItems = await Promise.all(
      purchaseItemIds.map((id: Id<"objects">) =>
        ctx.runQuery(internal.purchaseOntology.getPurchaseItemInternal, {
          purchaseItemId: id,
        })
      )
    ) as (Doc<"objects"> | null)[];

    // 3. Get product details for each item
    type ProductItem = {
      productName: string;
      quantity: number;
      pricePerUnit: number;
      totalPrice: number;
    };

    const itemsWithProducts = await Promise.all(
      purchaseItems.map(async (item) => {
        if (!item) return null;
        const productId = item.customProperties?.productId as Id<"objects">;
        const product = await ctx.runQuery(internal.productOntology.getProductInternal, {
          productId,
        }) as Doc<"objects"> | null;
        return {
          productName: product?.name || "Unknown Product",
          quantity: item.customProperties?.quantity as number,
          pricePerUnit: item.customProperties?.pricePerUnit as number,
          totalPrice: item.customProperties?.totalPrice as number,
        };
      })
    );

    const validItems = itemsWithProducts.filter((item): item is ProductItem => item !== null);

    // 4. Calculate totals
    const subtotal = validItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = (session.customProperties?.taxAmount as number) || 0;
    const total = (session.customProperties?.totalAmount as number) || subtotal;

    // 5. Return structured receipt data
    return {
      receiptNumber: session._id.substring(0, 12),
      purchaseDate: session.createdAt,
      customerName: session.customProperties?.customerName as string,
      customerEmail: session.customProperties?.customerEmail as string,
      items: validItems,
      subtotal,
      taxAmount,
      total,
      currency: (session.customProperties?.currency as string) || "EUR",
      paymentMethod: "Card", // From Stripe
      organizationName:
        (session.customProperties?.organizationName as string) || "L4YERCAK3",
      organizationAddress: "VC83 Digital Platform",
      paymentIntentId: session.customProperties?.paymentIntentId as string,
    };
  },
});

/**
 * SEND ORDER CONFIRMATION EMAIL (Eventbrite Style)
 *
 * Sends ONE email with all tickets and invoice attached as PDFs.
 * Uses Resend for email delivery.
 */
export const sendOrderConfirmationEmail = internalAction({
  args: {
    checkoutSessionId: v.id("objects"),
    recipientEmail: v.string(),
    recipientName: v.string(),
    includeInvoicePDF: v.optional(v.boolean()), // Optional: skip invoice for B2B (employer pays)
  },
  handler: async (ctx, args) => {
    try {
      // 1. Get checkout session and all tickets
      const session = await ctx.runQuery(
        internal.checkoutSessionOntology.getCheckoutSessionInternal,
        {
          checkoutSessionId: args.checkoutSessionId,
        }
      ) as Doc<"objects"> | null;

      if (!session) {
        throw new Error("Checkout session not found");
      }

      const allTickets = await ctx.runQuery(internal.ticketOntology.getTicketsByCheckoutInternal, {
        checkoutSessionId: args.checkoutSessionId,
      }) as Doc<"objects">[];

      // 2. Generate PDFs for all tickets
      const ticketPDFs: Array<{ filename: string; content: string; contentType: string }> = [];
      let firstProduct: Doc<"objects"> | null = null;

      for (const ticket of allTickets) {
        const pdf = await ctx.runAction(api.pdfGeneration.generateTicketPDF, {
          ticketId: ticket._id,
          checkoutSessionId: args.checkoutSessionId,
        });

        if (pdf) {
          ticketPDFs.push(pdf);

          // Get first product for email details
          if (!firstProduct) {
            const productId = ticket.customProperties?.productId as Id<"objects">;
            firstProduct = await ctx.runQuery(internal.productOntology.getProductInternal, {
              productId,
            }) as Doc<"objects"> | null;
          }
        }
      }

      // 3. Generate invoice PDF (optional - skip for B2B when employer pays)
      const attachments = [...ticketPDFs];

      if (args.includeInvoicePDF !== false) {
        // Default: include invoice PDF (B2C, direct payment)
        // For B2B: Get crmOrganizationId from first ticket (all tickets should have same employer)
        const crmOrganizationId = allTickets.length > 0
          ? allTickets[0].customProperties?.crmOrganizationId as Id<"objects"> | undefined
          : undefined;

        const invoicePDF = await ctx.runAction(api.pdfGeneration.generateInvoicePDF, {
          checkoutSessionId: args.checkoutSessionId,
          crmOrganizationId, // Pass CRM org ID for B2B invoices
        });

        if (invoicePDF) {
          attachments.push(invoicePDF);
        }
      }

      // 5. Create Eventbrite-style email HTML
      // Prefer event data from checkout session (which we now store), fallback to product
      console.log("📧 [sendOrderConfirmationEmail] Session custom properties:", {
        hasEventName: !!session.customProperties?.eventName,
        eventName: session.customProperties?.eventName,
        hasEventSponsors: !!session.customProperties?.eventSponsors,
        eventSponsors: session.customProperties?.eventSponsors,
        allSessionKeys: Object.keys(session.customProperties || {})
      });

      const eventName = (session.customProperties?.eventName as string) || firstProduct?.name || "Event";
      const eventSponsors = session.customProperties?.eventSponsors as Array<{ name: string; level?: string }> | undefined;

      // Fix: Events use startDate, not eventDate
      const eventDate = (session.customProperties?.eventDate as number) ||
        (session.customProperties?.startDate as number) ||
        (firstProduct?.customProperties?.eventDate as number | undefined) ||
        (firstProduct?.customProperties?.startDate as number | undefined);

      const eventLocation = (session.customProperties?.eventLocation as string) ||
        (session.customProperties?.location as string) ||
        (firstProduct?.customProperties?.location as string | undefined);

      console.log("✅ [sendOrderConfirmationEmail] Extracted event data for email:", {
        eventName,
        hasSponsors: !!eventSponsors,
        sponsorCount: eventSponsors?.length || 0,
        sponsors: eventSponsors
      });
      const orderNumber = session._id.substring(0, 12);
      const currency = (session.customProperties?.currency as string) || "EUR";
      const ticketCount = allTickets.length;

      // 🔥 CRITICAL: Get totals from TRANSACTIONS (accurate pricing with tax)
      let subtotalAmount = 0;
      let taxAmount = 0;
      let totalAmount = 0;
      let taxRatePercent = 0;

      // Get transactions from all tickets
      console.log(`📝 [sendOrderConfirmationEmail] Fetching transactions from ${allTickets.length} tickets`);

      for (const ticket of allTickets) {
        const transactionId = ticket.customProperties?.transactionId as Id<"objects"> | undefined;
        console.log(`   Ticket ${ticket._id} has transactionId: ${transactionId || 'NONE'}`);

        if (transactionId) {
          const transaction = await ctx.runQuery(internal.transactionOntology.getTransactionInternal, {
            transactionId,
          });

          console.log(`   Transaction ${transactionId} fetched:`, JSON.stringify({
            type: transaction?.type,
            unitPriceInCents: transaction?.customProperties?.unitPriceInCents,
            taxAmountInCents: transaction?.customProperties?.taxAmountInCents,
            totalPriceInCents: transaction?.customProperties?.totalPriceInCents,
            taxRatePercent: transaction?.customProperties?.taxRatePercent,
          }, null, 2));

          if (transaction && transaction.type === "transaction") {
            const unitPriceInCents = (transaction.customProperties?.unitPriceInCents as number) || 0;
            const taxAmountInCents = (transaction.customProperties?.taxAmountInCents as number) || 0;
            const totalPriceInCents = (transaction.customProperties?.totalPriceInCents as number) || 0;
            const txRate = (transaction.customProperties?.taxRatePercent as number) || 0;

            console.log(`   Adding to totals: unit=${unitPriceInCents}, tax=${taxAmountInCents}, total=${totalPriceInCents}`);

            subtotalAmount += unitPriceInCents;
            taxAmount += taxAmountInCents;
            totalAmount += totalPriceInCents;

            // Use tax rate from first transaction (assumes all tickets have same rate)
            if (taxRatePercent === 0 && txRate > 0) {
              taxRatePercent = txRate;
            }
          }
        }
      }

      console.log(`📊 [sendOrderConfirmationEmail] Total calculations:`);
      console.log(`   subtotalAmount: ${subtotalAmount} cents`);
      console.log(`   taxAmount: ${taxAmount} cents`);
      console.log(`   totalAmount: ${totalAmount} cents`);
      console.log(`   taxRatePercent: ${taxRatePercent}%`);

      // Fallback to session data if no transactions found
      if (totalAmount === 0) {
        totalAmount = (session.customProperties?.totalAmount as number) || 0;
        taxAmount = (session.customProperties?.taxAmount as number) || 0;
        subtotalAmount = totalAmount - taxAmount;
        taxRatePercent = subtotalAmount > 0 ? ((taxAmount / subtotalAmount) * 100) : 0;
      }

      const formattedDate = eventDate
        ? new Date(eventDate).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : "Date TBA";

      const formattedTotal =
        totalAmount === 0
          ? "Free"
          : `${currency.toUpperCase()} ${(totalAmount / 100).toFixed(2)}`;

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #6B46C1; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .event-box { background: #f9fafb; border-left: 4px solid #6B46C1; padding: 20px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Your Tickets for ${eventName}</h1>
    </div>
    <div class="content">
      <p>${args.recipientName}, you've got tickets!</p>
      <div class="event-box">
        <h2 style="margin-top: 0;">${eventName}</h2>
        ${eventSponsors && eventSponsors.length > 0 ? (() => {
          if (eventSponsors.length === 1) {
            return `<p style="color: #6B46C1; font-weight: 600;">Presented by ${eventSponsors[0].name}</p>`;
          }
          return `<p style="color: #6B46C1; font-weight: 600;">Presented by:</p><ul style="color: #6B46C1; margin: 5px 0 15px 20px; padding: 0;">${eventSponsors.map(s => `<li>${s.name}${s.level ? ` (${s.level})` : ''}</li>`).join('')}</ul>`;
        })() : ""}
        <p><strong>${ticketCount} x Ticket${ticketCount > 1 ? 's' : ''}</strong></p>
        <p><strong>${formattedDate}</strong></p>
        ${eventLocation ? `<p>${eventLocation}</p>` : ""}
      </div>
      <h3>Order Summary</h3>
      <p>Order #${orderNumber} - ${new Date(session.createdAt).toLocaleDateString()}</p>
      <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px;">Subtotal</td>
          <td style="padding: 8px; text-align: right;">${currency.toUpperCase()} ${(subtotalAmount / 100).toFixed(2)}</td>
        </tr>
        ${(() => {
          console.log(`📊 [sendOrderConfirmationEmail] Email template tax check:`);
          console.log(`   taxAmount > 0? ${taxAmount > 0} (taxAmount = ${taxAmount})`);
          console.log(`   Will include tax line in email: ${taxAmount > 0}`);

          if (taxAmount > 0) {
            console.log(`✅ [sendOrderConfirmationEmail] Including tax line in email HTML`);
            return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px; color: #666;">Tax (${taxRatePercent.toFixed(1)}%)</td>
          <td style="padding: 8px; text-align: right; color: #666;">${currency.toUpperCase()} ${(taxAmount / 100).toFixed(2)}</td>
        </tr>`;
          } else {
            console.log(`❌ [sendOrderConfirmationEmail] NOT including tax line (taxAmount = ${taxAmount})`);
            return '';
          }
        })()}
        <tr style="font-weight: bold; font-size: 18px;">
          <td style="padding: 12px 8px;">Total</td>
          <td style="padding: 12px 8px; text-align: right;">${formattedTotal}</td>
        </tr>
      </table>
      <p><strong>Your tickets and invoice are attached as PDFs.</strong></p>
      <p style="color: #666;">Present your ticket PDF at the event entrance.</p>
    </div>
    <div class="footer">
      <p>Need help? Contact support@l4yercak3.com</p>
      <p>&copy; ${new Date().getFullYear()} L4YERCAK3. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `;

      // 6. Send email using Resend with ALL PDFs attached
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      const result = await resend.emails.send({
        from: "L4YERCAK3 <tickets@mail.l4yercak3.com>",
        to: args.recipientEmail,
        subject: `Your Tickets for ${eventName}`,
        html: emailHtml,
        attachments,
      });

      console.log("✓ Order confirmation email sent:", result);
      return { success: true, emailId: result.data?.id || "unknown" };
    } catch (error) {
      console.error("Failed to send order confirmation email:", error);
      throw new Error("Failed to send order confirmation email");
    }
  },
});

/**
 * SEND RECEIPT EMAIL
 *
 * Sends a receipt email after purchase.
 */
export const sendReceiptEmail = internalAction({
  args: {
    checkoutSessionId: v.id("objects"),
    recipientEmail: v.string(),
    recipientName: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Generate receipt data
    const receiptData = await ctx.runAction(api.ticketGeneration.generateReceiptPDFData, {
      checkoutSessionId: args.checkoutSessionId,
    });

    // 2. Create email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #2A2A2A;
      background: #f3f4f6;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    .header {
      background: #6B46C1;
      color: white;
      padding: 30px;
      text-align: center;
    }
    .content {
      padding: 40px 30px;
    }
    .receipt-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .receipt-table th {
      background: #f9fafb;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #6B46C1;
      border-bottom: 2px solid #e5e7eb;
    }
    .receipt-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .total-row {
      background: #f5f3ff;
      font-weight: 700;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Receipt #${receiptData.receiptNumber}</h1>
      <p>${new Date(receiptData.purchaseDate).toLocaleDateString()}</p>
    </div>
    <div class="content">
      <p>Dear ${args.recipientName},</p>
      <p>Thank you for your purchase! Here's your receipt:</p>

      <table class="receipt-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${receiptData.items
            .map(
              (item: { productName: string; quantity: number; pricePerUnit: number; totalPrice: number }) => `
            <tr>
              <td>${item.productName}</td>
              <td>${item.quantity}</td>
              <td>${(item.pricePerUnit / 100).toFixed(2)} ${receiptData.currency}</td>
              <td>${(item.totalPrice / 100).toFixed(2)} ${receiptData.currency}</td>
            </tr>
          `
            )
            .join("")}
          <tr>
            <td colspan="3" style="text-align: right;"><strong>Subtotal:</strong></td>
            <td>${(receiptData.subtotal / 100).toFixed(2)} ${receiptData.currency}</td>
          </tr>
          ${
            receiptData.taxAmount > 0
              ? `
          <tr>
            <td colspan="3" style="text-align: right;"><strong>Tax:</strong></td>
            <td>${(receiptData.taxAmount / 100).toFixed(2)} ${receiptData.currency}</td>
          </tr>
          `
              : ""
          }
          <tr class="total-row">
            <td colspan="3" style="text-align: right;">TOTAL:</td>
            <td>${(receiptData.total / 100).toFixed(2)} ${receiptData.currency}</td>
          </tr>
        </tbody>
      </table>

      <p style="color: #6b7280; font-size: 14px;">
        Payment ID: ${receiptData.paymentIntentId}
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // 3. Send email
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
      const result = await resend.emails.send({
        from: "L4YERCAK3 <receipts@mail.l4yercak3.com>",
        to: args.recipientEmail,
        subject: `Receipt for your purchase - #${receiptData.receiptNumber}`,
        html: emailHtml,
      });

      console.log("✓ Receipt email sent:", result);
      return { success: true, emailId: result.data?.id || "unknown" };
    } catch (error) {
      console.error("Failed to send receipt email:", error);
      throw new Error("Failed to send receipt email");
    }
  },
});
