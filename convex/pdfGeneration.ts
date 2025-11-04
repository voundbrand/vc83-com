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

      // 4. Get seller organization info for footer
      const organizationId = session.organizationId;
      const sellerOrg = await ctx.runQuery(
        api.organizationOntology.getOrganizationProfile,
        { organizationId }
      ) as Doc<"objects"> | null;

      const sellerContact = await ctx.runQuery(
        api.organizationOntology.getOrganizationContact,
        { organizationId }
      ) as Doc<"objects"> | null;

      // 5. Extract event data - prefer from session, fallback to product
      const eventName = (session.customProperties?.eventName as string) || product.name;
      const eventSponsors = session.customProperties?.eventSponsors as Array<{ name: string; level?: string }> | undefined;
      const eventDate = (session.customProperties?.eventDate as number) ||
        (product.customProperties?.eventDate as number | undefined);
      const eventLocation = (session.customProperties?.eventLocation as string) ||
        (product.customProperties?.location as string | undefined);

      // 6. Generate QR code using external API
      const qrResult = await ctx.runAction(api.ticketGeneration.generateTicketQR, {
        ticketId: args.ticketId,
        holderEmail: ticket.customProperties?.holderEmail as string,
        holderName: ticket.customProperties?.holderName as string,
        eventName,
        eventDate,
      });

      // 7. Create PDF (A4 size)
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
      doc.text(eventName, 20, 40, { maxWidth: pageWidth - 100 });

      // Event sponsors (if available) - display all sponsors
      let currentY = 55;
      if (eventSponsors && eventSponsors.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(107, 70, 193); // Purple color for sponsors
        doc.setFont("helvetica", "normal");

        // If only one sponsor, simple format
        if (eventSponsors.length === 1) {
          doc.text(`Presented by ${eventSponsors[0].name}`, 20, currentY);
          currentY += 10;
        } else {
          // Multiple sponsors - list them all
          doc.text("Presented by:", 20, currentY);
          currentY += 7;
          doc.setFontSize(10);
          eventSponsors.forEach((sponsor) => {
            const sponsorText = sponsor.level
              ? `${sponsor.name} (${sponsor.level})`
              : sponsor.name;
            doc.text(`• ${sponsorText}`, 25, currentY);
            currentY += 5;
          });
          currentY += 3; // Extra spacing after sponsor list
        }
      }

      // Ticket type
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.text(ticket.subtype || "Standard", 20, currentY);
      currentY += 15;

      // Location
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      if (eventLocation) {
        doc.text(eventLocation, 20, currentY, { maxWidth: pageWidth - 100 });
        currentY += 10;
      }

      // Date/Time
      if (eventDate) {
        const formattedDate = new Date(eventDate).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        doc.text(formattedDate, 20, currentY);
        currentY += 10;
      }

      // QR Code (right side, large)
      const qrSize = 60;
      const qrX = pageWidth - qrSize - 20;
      const qrY = 30;
      doc.addImage(qrResult.qrCodeDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

      // Order Information section
      currentY += 10;
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Order Information", 20, currentY);

      currentY += 8;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Order #${session._id.substring(0, 12)}. Ordered by ${ticket.customProperties?.holderName} on ${new Date(session.createdAt).toLocaleDateString()}`,
        20,
        currentY,
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

      // Footer with seller organization info
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Present this ticket at the event entrance", 20, pageHeight - 30);

      // Seller info footer
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      const footerY = pageHeight - 22;

      const footerParts: string[] = [];
      if (sellerOrg?.name) footerParts.push(sellerOrg.name);
      if (sellerContact?.customProperties?.primaryEmail) footerParts.push(sellerContact.customProperties.primaryEmail as string);
      if (sellerContact?.customProperties?.primaryPhone) footerParts.push(sellerContact.customProperties.primaryPhone as string);
      if (sellerContact?.customProperties?.website) footerParts.push(sellerContact.customProperties.website as string);

      if (footerParts.length > 0) {
        doc.text(footerParts.join(" • "), 20, footerY, { maxWidth: pageWidth - 40 });
      }

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

      // 2. Get seller organization info
      const organizationId = session.organizationId;

      // Get the actual organization record (has businessName field)
      const organization = await ctx.runQuery(
        internal.checkoutSessions.getOrganizationInternal,
        { organizationId }
      );

      const sellerOrg = await ctx.runQuery(
        api.organizationOntology.getOrganizationProfile,
        { organizationId }
      ) as Doc<"objects"> | null;

      const sellerLegal = await ctx.runQuery(
        api.organizationOntology.getOrganizationLegal,
        { organizationId }
      ) as Doc<"objects"> | null;

      const sellerContact = await ctx.runQuery(
        api.organizationOntology.getOrganizationContact,
        { organizationId }
      ) as Doc<"objects"> | null;

      // Get tax settings for origin address
      const taxSettings = await ctx.runQuery(
        api.organizationTaxSettings.getPublicTaxSettings,
        { organizationId }
      );

      // 3. Get purchase items
      const purchaseItemIds = (session.customProperties?.purchasedItemIds as Id<"objects">[]) || [];
      const purchaseItems = await Promise.all(
        purchaseItemIds.map((id: Id<"objects">) =>
          ctx.runQuery(internal.purchaseOntology.getPurchaseItemInternal, {
            purchaseItemId: id,
          })
        )
      ) as (Doc<"objects"> | null)[];

      // 4. Get product details for each item
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

      // 5. Calculate totals
      const subtotal = validItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxAmount = (session.customProperties?.taxAmount as number) || 0;
      const total = (session.customProperties?.totalAmount as number) || subtotal;
      const currency = (session.customProperties?.currency as string) || "USD";

      // Extract B2B info
      const transactionType = session.customProperties?.transactionType as "B2C" | "B2B" | undefined;
      const buyerCompanyName = session.customProperties?.companyName as string | undefined;
      const buyerVatNumber = session.customProperties?.vatNumber as string | undefined;

      // Extract billing address
      const billingStreet = session.customProperties?.billingStreet as string | undefined;
      const billingCity = session.customProperties?.billingCity as string | undefined;
      const billingState = session.customProperties?.billingState as string | undefined;
      const billingPostalCode = session.customProperties?.billingPostalCode as string | undefined;
      const billingCountry = session.customProperties?.billingCountry as string | undefined;

      // 6. Create PDF
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

      // FROM (Seller Organization)
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("FROM:", 20, 45);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      let fromYPos = 52;

      // Show business name with priority: legal entity > org businessName > org name > profile
      const businessName = sellerLegal?.customProperties?.legalEntityName as string | undefined ||
                          organization?.businessName ||
                          organization?.name ||
                          sellerOrg?.name ||
                          "L4YERCAK3.com";
      doc.text(businessName, 20, fromYPos);
      fromYPos += 6;

      // Use tax origin address if available, otherwise fall back to legal address
      if (taxSettings?.originAddress) {
        const origin = taxSettings.originAddress;

        // Street address (addressLine1)
        if (origin.addressLine1) {
          doc.text(origin.addressLine1, 20, fromYPos);
          fromYPos += 6;
        }

        // Street address line 2 (optional)
        if (origin.addressLine2) {
          doc.text(origin.addressLine2, 20, fromYPos);
          fromYPos += 6;
        }

        // City, State, Postal Code
        const cityLine = [
          origin.city,
          origin.state,
          origin.postalCode
        ].filter(Boolean).join(", ");
        doc.text(cityLine, 20, fromYPos);
        fromYPos += 6;

        // Country
        doc.text(origin.country, 20, fromYPos);
        fromYPos += 6;
      } else if (sellerLegal?.customProperties?.address) {
        // Fallback to legal address
        doc.text(sellerLegal.customProperties.address as string, 20, fromYPos);
        fromYPos += 6;
      }

      if (sellerLegal?.customProperties?.taxId) {
        doc.text(`Tax ID: ${sellerLegal.customProperties.taxId}`, 20, fromYPos);
        fromYPos += 6;
      }

      if (sellerLegal?.customProperties?.vatNumber) {
        doc.text(`VAT: ${sellerLegal.customProperties.vatNumber}`, 20, fromYPos);
        fromYPos += 6;
      }

      if (sellerContact?.customProperties?.primaryEmail) {
        doc.text(sellerContact.customProperties.primaryEmail as string, 20, fromYPos);
        fromYPos += 6;
      }

      if (sellerContact?.customProperties?.primaryPhone) {
        doc.text(sellerContact.customProperties.primaryPhone as string, 20, fromYPos);
        fromYPos += 6;
      }

      // BILL TO (Buyer - B2B vs B2C)
      let billToYPos = 45;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(transactionType === "B2B" ? "BILL TO:" : "CUSTOMER:", pageWidth / 2 + 10, billToYPos);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      billToYPos += 7;

      if (transactionType === "B2B" && buyerCompanyName) {
        // B2B: Show company name prominently
        doc.setFont("helvetica", "bold");
        doc.text(buyerCompanyName, pageWidth / 2 + 10, billToYPos);
        billToYPos += 6;
        doc.setFont("helvetica", "normal");

        if (buyerVatNumber) {
          doc.text(`VAT: ${buyerVatNumber}`, pageWidth / 2 + 10, billToYPos);
          billToYPos += 6;
        }

        doc.text(`Attn: ${session.customProperties?.customerName as string}`, pageWidth / 2 + 10, billToYPos);
        billToYPos += 6;

        // Billing address
        if (billingStreet) {
          doc.text(billingStreet, pageWidth / 2 + 10, billToYPos);
          billToYPos += 6;
        }

        if (billingCity || billingState || billingPostalCode) {
          const cityLine = [
            billingCity,
            billingState,
            billingPostalCode
          ].filter(Boolean).join(", ");
          doc.text(cityLine, pageWidth / 2 + 10, billToYPos);
          billToYPos += 6;
        }

        if (billingCountry) {
          doc.text(billingCountry, pageWidth / 2 + 10, billToYPos);
          billToYPos += 6;
        }
      } else {
        // B2C: Show customer name
        doc.text(session.customProperties?.customerName as string, pageWidth / 2 + 10, billToYPos);
        billToYPos += 6;
      }

      doc.text(session.customProperties?.customerEmail as string, pageWidth / 2 + 10, billToYPos);
      billToYPos += 6;

      if (session.customProperties?.customerPhone) {
        doc.text(session.customProperties.customerPhone as string, pageWidth / 2 + 10, billToYPos);
        billToYPos += 6;
      }

      // Items table (adjusted Y position for seller/buyer info)
      let yPos = Math.max(fromYPos, billToYPos) + 15;
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
