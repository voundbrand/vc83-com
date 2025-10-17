/**
 * PDF GENERATION FOR TICKETS AND INVOICES
 *
 * Generates professional PDFs for tickets and receipts using jsPDF.
 * Style inspired by Eventbrite's clean, professional design.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";

type PDFAttachment = {
  filename: string;
  content: string; // base64
  contentType: string;
};

/**
 * GENERATE TICKET PDF
 *
 * Creates a professional ticket PDF with QR code, event details, and order info.
 * Based on Eventbrite's ticket design.
 */
export const generateTicketPDF = action({
  args: {
    ticketId: v.id("objects"),
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<PDFAttachment | null> => {
    try {
      const { jsPDF } = await import("jspdf");

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

      // 3. Get checkout session for order details
      const session = await ctx.runQuery(
        internal.checkoutSessionOntology.getCheckoutSessionInternal,
        {
          checkoutSessionId: args.checkoutSessionId,
        }
      ) as Doc<"objects"> | null;

      if (!session) {
        throw new Error("Checkout session not found");
      }

      // 4. Generate QR code using external API
      const qrResult = await ctx.runAction(api.ticketGeneration.generateTicketQR, {
        ticketId: args.ticketId,
        holderEmail: ticket.customProperties?.holderEmail as string,
        holderName: ticket.customProperties?.holderName as string,
        eventName: product.name,
        eventDate: product.customProperties?.eventDate as number | undefined,
      });

      // 5. Create PDF (A4 size)
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // 6. Add content in Eventbrite style
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header with order number
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Order #${session._id.substring(0, 12)}`, pageWidth - 15, 15, { align: "right" });

      // Event name (large, bold)
      doc.setFontSize(24);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(product.name, 20, 40, { maxWidth: pageWidth - 100 });

      // Ticket type
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.text(ticket.subtype || "Standard", 20, 55);

      // Location
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      const location = product.customProperties?.location as string | undefined;
      if (location) {
        doc.text(location, 20, 70, { maxWidth: pageWidth - 100 });
      }

      // Date/Time
      const eventDate = product.customProperties?.eventDate as number | undefined;
      if (eventDate) {
        const formattedDate = new Date(eventDate).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        doc.text(formattedDate, 20, location ? 80 : 70);
      }

      // QR Code (right side, large)
      const qrSize = 60;
      const qrX = pageWidth - qrSize - 20;
      const qrY = 30;
      doc.addImage(qrResult.qrCodeDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

      // Order Information section
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Order Information", 20, 110);

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Order #${session._id.substring(0, 12)}. Ordered by ${ticket.customProperties?.holderName} on ${new Date(session.createdAt).toLocaleDateString()}`,
        20,
        118,
        { maxWidth: pageWidth - 40 }
      );

      // Price
      const price = ((ticket.customProperties?.pricePaid as number) || 0) / 100;
      const currency = session.customProperties?.currency as string || "USD";
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(
        price === 0 ? "Free Order" : `${currency.toUpperCase()} ${price.toFixed(2)}`,
        20,
        130
      );

      // Barcode number below QR
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(session._id, qrX, qrY + qrSize + 5, { align: "center", maxWidth: qrSize });

      // Footer
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Present this ticket at the event entrance", 20, pageHeight - 20);

      // Convert to base64
      const pdfBase64 = doc.output("datauristring").split(",")[1];

      return {
        filename: `ticket-${ticket._id.substring(0, 12)}.pdf`,
        content: pdfBase64,
        contentType: "application/pdf",
      };
    } catch (error) {
      console.error("Failed to generate ticket PDF:", error);
      return null;
    }
  },
});

/**
 * GENERATE INVOICE/RECEIPT PDF
 *
 * Creates a professional receipt/invoice PDF with order summary and payment details.
 */
export const generateInvoicePDF = action({
  args: {
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<PDFAttachment | null> => {
    try {
      const { jsPDF } = await import("jspdf");

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

      const validItems = itemsWithProducts.filter((item) => item !== null);

      // 4. Calculate totals
      const subtotal = validItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxAmount = (session.customProperties?.taxAmount as number) || 0;
      const total = (session.customProperties?.totalAmount as number) || subtotal;
      const currency = (session.customProperties?.currency as string) || "USD";

      // 5. Create PDF
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE", 20, 25);

      // Invoice number and date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(`Invoice #${session._id.substring(0, 12)}`, pageWidth - 15, 25, { align: "right" });
      doc.text(
        `Date: ${new Date(session.createdAt).toLocaleDateString()}`,
        pageWidth - 15,
        32,
        { align: "right" }
      );

      // Bill To
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Bill To:", 20, 45);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(session.customProperties?.customerName as string, 20, 52);
      doc.text(session.customProperties?.customerEmail as string, 20, 59);

      // Items table
      let yPos = 80;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Item", 20, yPos);
      doc.text("Qty", pageWidth - 90, yPos);
      doc.text("Price", pageWidth - 60, yPos);
      doc.text("Total", pageWidth - 30, yPos, { align: "right" });

      // Draw line
      yPos += 3;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPos, pageWidth - 20, yPos);

      // Items
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      validItems.forEach((item) => {
        doc.text(item.productName, 20, yPos, { maxWidth: pageWidth - 120 });
        doc.text(item.quantity.toString(), pageWidth - 90, yPos);
        doc.text(`${(item.pricePerUnit / 100).toFixed(2)}`, pageWidth - 60, yPos);
        doc.text(
          `${(item.totalPrice / 100).toFixed(2)}`,
          pageWidth - 20,
          yPos,
          { align: "right" }
        );
        yPos += 10;
      });

      // Totals
      yPos += 5;
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 10;

      doc.setTextColor(100, 100, 100);
      doc.text("Subtotal:", pageWidth - 80, yPos);
      doc.text(
        `${currency.toUpperCase()} ${(subtotal / 100).toFixed(2)}`,
        pageWidth - 20,
        yPos,
        { align: "right" }
      );

      // Tax breakdown (detailed if available, simple if not)
      const taxDetails = session.customProperties?.taxDetails as Array<{
        jurisdiction: string;
        taxName: string;
        taxRate: number;
        taxAmount: number;
      }> | undefined;

      if (taxAmount > 0) {
        if (taxDetails && taxDetails.length > 0) {
          // Group tax amounts by rate (combine same rates)
          const taxByRate = taxDetails.reduce((acc, tax) => {
            // If taxRate > 1, it's already a percentage (e.g., 7.0), don't multiply by 100
            // If taxRate < 1, it's a decimal (e.g., 0.07), multiply by 100
            const ratePercent = tax.taxRate > 1 ? tax.taxRate : tax.taxRate * 100;
            const rateKey = ratePercent.toFixed(1);
            acc[rateKey] = (acc[rateKey] || 0) + tax.taxAmount;
            return acc;
          }, {} as Record<string, number>);

          // Show one line per unique tax rate
          Object.entries(taxByRate).forEach(([rate, amount]) => {
            yPos += 7;
            doc.text(`Tax (${rate}%):`, pageWidth - 80, yPos);
            doc.text(
              `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}`,
              pageWidth - 20,
              yPos,
              { align: "right" }
            );
          });
        } else {
          // Fallback if no detailed breakdown
          yPos += 7;
          doc.text("Tax:", pageWidth - 80, yPos);
          doc.text(
            `${currency.toUpperCase()} ${(taxAmount / 100).toFixed(2)}`,
            pageWidth - 20,
            yPos,
            { align: "right" }
          );
        }
      }

      yPos += 10;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Total:", pageWidth - 80, yPos);
      doc.text(
        `${currency.toUpperCase()} ${(total / 100).toFixed(2)}`,
        pageWidth - 20,
        yPos,
        { align: "right" }
      );

      // Payment method
      yPos += 15;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text("Payment Method: Card", 20, yPos);

      // Convert to base64
      const pdfBase64 = doc.output("datauristring").split(",")[1];

      return {
        filename: `invoice-${session._id.substring(0, 12)}.pdf`,
        content: pdfBase64,
        contentType: "application/pdf",
      };
    } catch (error) {
      console.error("Failed to generate invoice PDF:", error);
      return null;
    }
  },
});

/**
 * GET TICKET IDS FROM CHECKOUT SESSION
 *
 * Fetches all ticket IDs associated with a checkout session.
 * Used by the confirmation page to enable ticket downloads.
 */
export const getTicketIdsFromCheckout = action({
  args: {
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<Id<"objects">[]> => {
    try {
      // 1. Get checkout session
      const session = await ctx.runQuery(internal.checkoutSessionOntology.getCheckoutSessionInternal, {
        checkoutSessionId: args.checkoutSessionId,
      }) as Doc<"objects"> | null;

      if (!session) {
        console.error("Checkout session not found");
        return [];
      }

      // 2. Get purchase item IDs from session
      const purchaseItemIds = (session.customProperties?.purchasedItemIds as Id<"objects">[]) || [];

      if (purchaseItemIds.length === 0) {
        return [];
      }

      // 3. Fetch each purchase item and extract ticket IDs
      const ticketIds: Id<"objects">[] = [];

      for (const purchaseItemId of purchaseItemIds) {
        const purchaseItem = await ctx.runQuery(internal.purchaseOntology.getPurchaseItemInternal, {
          purchaseItemId,
        }) as Doc<"objects"> | null;

        if (purchaseItem && purchaseItem.customProperties?.fulfillmentData) {
          const fulfillmentData = purchaseItem.customProperties.fulfillmentData as Record<string, unknown>;
          const ticketId = fulfillmentData.ticketId as Id<"objects"> | undefined;

          if (ticketId) {
            ticketIds.push(ticketId);
          }
        }
      }

      return ticketIds;
    } catch (error) {
      console.error("Failed to get ticket IDs from checkout:", error);
      return [];
    }
  },
});
