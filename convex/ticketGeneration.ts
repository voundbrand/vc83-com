/**
 * TICKET GENERATION
 *
 * Generates QR codes, PDFs, and handles email delivery for tickets.
 * Modern, production-ready ticket system with downloads and email.
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
    eventDate?: number;
    eventLocation?: string;
    ticketType: string;
    purchaseDate: number;
    qrCodeDataUrl: string;
    organizationName: string;
    pricePerUnit: number;
    currency: string;
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

    // 4. Generate QR code
    const qrResult = await ctx.runAction(api.ticketGeneration.generateTicketQR, {
      ticketId: args.ticketId,
      holderEmail: ticket.customProperties?.holderEmail as string,
      holderName: ticket.customProperties?.holderName as string,
      eventName: product.name,
      eventDate: product.customProperties?.eventDate as number | undefined,
    });
    const qrCodeDataUrl = qrResult.qrCodeDataUrl;

    // 5. Return structured ticket data for PDF generation
    return {
      ticketNumber: ticket.customProperties?.ticketNumber || ticket._id.substring(0, 12),
      holderName: ticket.customProperties?.holderName as string,
      holderEmail: ticket.customProperties?.holderEmail as string,
      eventName: product.name,
      eventDescription: product.description,
      eventDate: product.customProperties?.eventDate as number | undefined,
      eventLocation: product.customProperties?.location as string | undefined,
      ticketType: ticket.subtype || "standard",
      purchaseDate: ticket.createdAt,
      qrCodeDataUrl,
      organizationName:
        (session.customProperties?.organizationName as string) || "L4YERCAK3",
      pricePerUnit: ticket.customProperties?.pricePerUnit as number,
      currency: (session.customProperties?.currency as string) || "USD",
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
      currency: (session.customProperties?.currency as string) || "USD",
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

      // 3. Generate invoice PDF
      const invoicePDF = await ctx.runAction(api.pdfGeneration.generateInvoicePDF, {
        checkoutSessionId: args.checkoutSessionId,
      });

      // 4. Combine all attachments
      const attachments = [...ticketPDFs];
      if (invoicePDF) {
        attachments.push(invoicePDF);
      }

      // 5. Create Eventbrite-style email HTML
      const eventName = firstProduct?.name || "Event";
      const eventDate = firstProduct?.customProperties?.eventDate as number | undefined;
      const eventLocation = firstProduct?.customProperties?.location as string | undefined;
      const orderNumber = session._id.substring(0, 12);
      const totalAmount = (session.customProperties?.totalAmount as number) || 0;
      const subtotalAmount = (session.customProperties?.subtotal as number) || totalAmount;
      const taxAmount = (session.customProperties?.taxAmount as number) || 0;
      const currency = (session.customProperties?.currency as string) || "USD";
      const ticketCount = allTickets.length;

      // Get tax breakdown by jurisdiction
      const taxDetails = session.customProperties?.taxDetails as Array<{
        jurisdiction: string;
        taxName: string;
        taxRate: number;
        taxAmount: number;
      }> | undefined;

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
        <p><strong>${ticketCount} x Ticket</strong></p>
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
        ${taxAmount > 0 ? (() => {
          // Group tax amounts by rate (combine same rates)
          if (taxDetails && taxDetails.length > 0) {
            const taxByRate = taxDetails.reduce((acc, tax) => {
              // If taxRate > 1, it's already a percentage (e.g., 7.0), don't multiply by 100
              // If taxRate < 1, it's a decimal (e.g., 0.07), multiply by 100
              const ratePercent = tax.taxRate > 1 ? tax.taxRate : tax.taxRate * 100;
              const rateKey = ratePercent.toFixed(1);
              acc[rateKey] = (acc[rateKey] || 0) + tax.taxAmount;
              return acc;
            }, {} as Record<string, number>);

            return Object.entries(taxByRate).map(([rate, amount]) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px; color: #666;">Tax (${rate}%)</td>
          <td style="padding: 8px; text-align: right; color: #666;">${currency.toUpperCase()} ${(amount / 100).toFixed(2)}</td>
        </tr>`).join("");
          }
          // Fallback if no detailed breakdown
          return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px; color: #666;">Tax</td>
          <td style="padding: 8px; text-align: right; color: #666;">${currency.toUpperCase()} ${(taxAmount / 100).toFixed(2)}</td>
        </tr>`;
        })() : ""}
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
