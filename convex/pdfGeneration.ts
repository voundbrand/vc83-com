/**
 * PDF GENERATION FOR TICKETS AND INVOICES
 *
 * Generates professional PDFs for tickets and receipts using jsPDF.
 * Style inspired by Eventbrite's clean, professional design.
 *
 * TODO: CUSTOM PDF TEMPLATE SUPPORT
 * ==================================
 * Modify PDF generation to support custom organization templates.
 *
 * IMPLEMENTATION STEPS:
 *
 * 1. UPDATE generateTicketPDF function:
 *    - Add optional templateId parameter: templateId?: Id<"objects">
 *    - Load custom template if provided, otherwise use org default or built-in
 *    - Apply custom branding: logo, colors, fonts
 *    - Apply custom layout: show/hide QR code, barcode, sponsors
 *    - Merge custom fields into PDF content
 *
 * 2. UPDATE generateInvoicePDF function:
 *    - Same template loading logic as tickets
 *    - Support different templates for B2C receipts vs B2B invoices
 *    - Apply company branding (logo, letterhead)
 *    - Custom payment terms and bank details
 *
 * 3. ADD template rendering helper:
 *    function applyCustomTemplate(doc: jsPDF, data: any, template: PdfTemplate) {
 *      // Apply branding
 *      if (template.branding.logoUrl) addLogo(doc, template.branding.logoUrl);
 *      doc.setTextColor(template.branding.primaryColor);
 *
 *      // Apply layout
 *      if (template.layout.showQrCode) addQRCode(doc, data.qrCode);
 *      if (template.layout.headerText) addHeader(doc, template.layout.headerText);
 *
 *      // Add custom fields
 *      template.customFields.forEach(field => {
 *        addCustomField(doc, field.position, field.label, field.value);
 *      });
 *    }
 *
 * 4. FALLBACK LOGIC:
 *    - Always try custom template first
 *    - If template fails to load/render: fallback to built-in default
 *    - Log errors but don't break PDF generation
 *    - Ensure PDFs always generate even if customization fails
 *
 * RELATED FILES:
 * - convex/ticketGeneration.ts (comprehensive TODO documentation)
 * - convex/pdfTemplates.ts (NEW - template CRUD)
 * - src/components/window-content/settings-window/pdf-templates-tab.tsx (NEW - UI)
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
      // Fix: Events use startDate, not eventDate
      const eventDate = (session.customProperties?.eventDate as number) ||
        (session.customProperties?.startDate as number) ||
        (product.customProperties?.eventDate as number | undefined) ||
        (product.customProperties?.startDate as number | undefined);
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

      // Price Breakdown - Get pricing from the linked transaction
      const transactionId = ticket.customProperties?.transactionId as Id<"objects"> | undefined;
      const currency = (session.customProperties?.currency as string) || "EUR";

      let netPrice = 0;
      let taxAmount = 0;
      let totalPrice = 0;
      let taxRate = 0;

      if (transactionId) {
        // Fetch the transaction to get accurate pricing
        const transaction = await ctx.runQuery(internal.transactionOntology.getTransactionInternal, {
          transactionId,
        });

        console.log(`📝 [generateTicketPDF] Transaction found: ${transactionId}`);
        console.log(`   Transaction type: ${transaction?.type}`);
        console.log(`   Transaction data:`, JSON.stringify(transaction?.customProperties, null, 2));

        if (transaction && transaction.type === "transaction") {
          // Transaction has the correct pricing in cents
          const unitPriceInCents = (transaction.customProperties?.unitPriceInCents as number) || 0;
          const totalPriceInCents = (transaction.customProperties?.totalPriceInCents as number) || 0;
          const taxAmountInCents = (transaction.customProperties?.taxAmountInCents as number) || 0;

          console.log(`   unitPriceInCents: ${unitPriceInCents}`);
          console.log(`   taxAmountInCents: ${taxAmountInCents}`);
          console.log(`   totalPriceInCents: ${totalPriceInCents}`);

          // Convert from cents to currency units
          netPrice = unitPriceInCents / 100;
          totalPrice = totalPriceInCents / 100;
          taxAmount = taxAmountInCents / 100;
          taxRate = netPrice > 0 ? ((taxAmount / netPrice) * 100) : 0;

          console.log(`   Calculated netPrice: ${netPrice}`);
          console.log(`   Calculated taxAmount: ${taxAmount}`);
          console.log(`   Calculated taxRate: ${taxRate}%`);
          console.log(`   Calculated totalPrice: ${totalPrice}`);
        }
      } else {
        console.log(`⚠️  [generateTicketPDF] No transaction ID found on ticket ${args.ticketId}`);
      }

      // Fallback: use session totals if transaction not found
      if (totalPrice === 0) {
        const totalAmount = (session.customProperties?.totalAmount as number) || 0;
        const sessionTaxAmount = (session.customProperties?.taxAmount as number) || 0;
        const subtotalAmount = totalAmount - sessionTaxAmount;

        netPrice = subtotalAmount / 100;
        taxAmount = sessionTaxAmount / 100;
        totalPrice = totalAmount / 100;
        taxRate = netPrice > 0 ? ((taxAmount / netPrice) * 100) : 0;
      }

      currentY += 10;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Price Breakdown", 20, currentY);

      currentY += 7;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Subtotal:`, 20, currentY);
      doc.text(`${currency.toUpperCase()} ${netPrice.toFixed(2)}`, 80, currentY);

      console.log(`📊 [generateTicketPDF] Final display values:`);
      console.log(`   taxAmount > 0? ${taxAmount > 0} (taxAmount = ${taxAmount})`);
      console.log(`   taxRate: ${taxRate}%`);
      console.log(`   Will display tax line: ${taxAmount > 0}`);

      if (taxAmount > 0) {
        currentY += 7;
        doc.setTextColor(100, 100, 100);
        doc.text(`Tax (${taxRate.toFixed(1)}%):`, 20, currentY);
        doc.text(`${currency.toUpperCase()} ${taxAmount.toFixed(2)}`, 80, currentY);
        console.log(`✅ [generateTicketPDF] Tax line added to PDF`);
      } else {
        console.log(`❌ [generateTicketPDF] Tax line NOT added (taxAmount = ${taxAmount})`);
      }

      currentY += 7;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(`Total:`, 20, currentY);
      doc.text(
        totalPrice === 0 ? "Free" : `${currency.toUpperCase()} ${totalPrice.toFixed(2)}`,
        80,
        currentY
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
 * GENERATE RECEIPT PDF (Public - for B2C customers)
 *
 * Creates a receipt PDF for paid orders (Stripe, PayPal, etc.)
 * This is a public action that can be called from the frontend.
 */
export const generateReceiptPDF = action({
  args: {
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<PDFAttachment | null> => {
    // Reuse the invoice PDF generator but change the title to "RECEIPT"
    return await ctx.runAction(api.pdfGeneration.generateInvoicePDF, {
      checkoutSessionId: args.checkoutSessionId,
    });
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
    crmOrganizationId: v.optional(v.id("objects")), // Optional: B2B employer organization
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

      // 2.5. Get buyer CRM organization info (if B2B invoice with employerOrgId)
      let buyerCrmOrg: Doc<"objects"> | null = null;
      if (args.crmOrganizationId) {
        buyerCrmOrg = await ctx.runQuery(api.crmOntology.getPublicCrmOrganizationBilling, {
          crmOrganizationId: args.crmOrganizationId,
        }) as Doc<"objects"> | null;
        console.log("📄 [generateInvoicePDF] Found CRM org for BILL TO:", {
          orgId: args.crmOrganizationId,
          orgName: buyerCrmOrg?.name,
          hasBillingAddress: !!buyerCrmOrg?.customProperties?.billingAddress,
        });
      }

      // 3. Get purchase items
      const purchaseItemIds = (session.customProperties?.purchasedItemIds as Id<"objects">[]) || [];
      const purchaseItems = await Promise.all(
        purchaseItemIds.map((id: Id<"objects">) =>
          ctx.runQuery(internal.purchaseOntology.getPurchaseItemInternal, {
            purchaseItemId: id,
          })
        )
      ) as (Doc<"objects"> | null)[];

      // 4. Get product details AND transactions for each item
      const itemsWithProductsAndTransactions = await Promise.all(
        purchaseItems.map(async (item) => {
          if (!item) return null;
          const productId = item.customProperties?.productId as Id<"objects">;
          const product = await ctx.runQuery(internal.productOntology.getProductInternal, {
            productId,
          }) as Doc<"objects"> | null;

          // 🔥 CRITICAL: Get transaction to get ACCURATE tax info
          const fulfillmentData = item.customProperties?.fulfillmentData as { ticketId?: Id<"objects"> } | undefined;
          let transaction: Doc<"objects"> | null = null;

          if (fulfillmentData?.ticketId) {
            // Get ticket to find transaction
            const ticket = await ctx.runQuery(internal.ticketOntology.getTicketInternal, {
              ticketId: fulfillmentData.ticketId,
            });

            if (ticket) {
              const transactionId = ticket.customProperties?.transactionId as Id<"objects"> | undefined;
              if (transactionId) {
                transaction = await ctx.runQuery(internal.transactionOntology.getTransactionInternal, {
                  transactionId,
                });
              }
            }
          }

          return {
            productName: product?.name || "Unknown Product",
            quantity: item.customProperties?.quantity as number,
            pricePerUnit: item.customProperties?.pricePerUnit as number,
            totalPrice: item.customProperties?.totalPrice as number,
            transaction, // Include transaction for tax data
          };
        })
      );

      const validItems = itemsWithProductsAndTransactions.filter((item) => item !== null);

      // 5. Calculate totals from TRANSACTIONS (accurate tax data)
      const subtotal = validItems.reduce((sum, item) => {
        // Use transaction unitPriceInCents if available (pre-tax amount)
        if (item.transaction) {
          const unitPrice = (item.transaction.customProperties?.unitPriceInCents as number) || 0;
          return sum + unitPrice;
        }
        return sum + item.totalPrice;
      }, 0);

      const taxAmount = validItems.reduce((sum, item) => {
        // Use transaction taxAmountInCents if available
        if (item.transaction) {
          const taxAmt = (item.transaction.customProperties?.taxAmountInCents as number) || 0;
          return sum + taxAmt;
        }
        return sum;
      }, 0);

      const total = validItems.reduce((sum, item) => {
        // Use transaction totalPriceInCents if available (includes tax)
        if (item.transaction) {
          const totalPrice = (item.transaction.customProperties?.totalPriceInCents as number) || 0;
          return sum + totalPrice;
        }
        return sum + item.totalPrice;
      }, 0);

      const currency = (session.customProperties?.currency as string) || "EUR";

      // Get tax rate from first transaction (assumes all items have same rate)
      const firstTransaction = validItems.find(item => item.transaction)?.transaction;
      const taxRatePercent = (firstTransaction?.customProperties?.taxRatePercent as number) || 0;

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

      // BILL TO (Buyer - use CRM org if available, otherwise fallback to session data)
      let billToYPos = 45;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      const isCRMBilling = !!buyerCrmOrg;
      doc.text(isCRMBilling || transactionType === "B2B" ? "BILL TO:" : "CUSTOMER:", pageWidth / 2 + 10, billToYPos);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      billToYPos += 7;

      if (isCRMBilling && buyerCrmOrg) {
        // B2B with CRM Organization: Use CRM org billing info
        doc.setFont("helvetica", "bold");
        doc.text(buyerCrmOrg.name, pageWidth / 2 + 10, billToYPos);
        billToYPos += 6;
        doc.setFont("helvetica", "normal");

        // VAT number from CRM org
        const crmVatNumber = buyerCrmOrg.customProperties?.vatNumber as string | undefined;
        if (crmVatNumber) {
          doc.text(`VAT: ${crmVatNumber}`, pageWidth / 2 + 10, billToYPos);
          billToYPos += 6;
        }

        // Billing address from CRM org
        const crmBillingAddress = buyerCrmOrg.customProperties?.billingAddress as {
          line1?: string;
          line2?: string;
          city?: string;
          state?: string;
          postalCode?: string;
          country?: string;
        } | undefined;

        if (crmBillingAddress?.line1) {
          doc.text(crmBillingAddress.line1, pageWidth / 2 + 10, billToYPos);
          billToYPos += 6;
        }

        if (crmBillingAddress?.line2) {
          doc.text(crmBillingAddress.line2, pageWidth / 2 + 10, billToYPos);
          billToYPos += 6;
        }

        if (crmBillingAddress?.city || crmBillingAddress?.state || crmBillingAddress?.postalCode) {
          const cityLine = [
            crmBillingAddress.city,
            crmBillingAddress.state,
            crmBillingAddress.postalCode
          ].filter(Boolean).join(", ");
          doc.text(cityLine, pageWidth / 2 + 10, billToYPos);
          billToYPos += 6;
        }

        if (crmBillingAddress?.country) {
          doc.text(crmBillingAddress.country, pageWidth / 2 + 10, billToYPos);
          billToYPos += 6;
        }

        // Billing contact from CRM org
        const crmBillingEmail = buyerCrmOrg.customProperties?.billingEmail as string | undefined;
        const crmBillingContact = buyerCrmOrg.customProperties?.billingContact as string | undefined;

        if (crmBillingContact) {
          doc.text(`Contact: ${crmBillingContact}`, pageWidth / 2 + 10, billToYPos);
          billToYPos += 6;
        }

        if (crmBillingEmail) {
          doc.text(crmBillingEmail, pageWidth / 2 + 10, billToYPos);
          billToYPos += 6;
        }

        // Customer as "Attn:" if different from billing contact
        const customerName = session.customProperties?.customerName as string;
        if (customerName && customerName !== crmBillingContact) {
          doc.text(`Attn: ${customerName}`, pageWidth / 2 + 10, billToYPos);
          billToYPos += 6;
        }
      } else if (transactionType === "B2B" && buyerCompanyName) {
        // B2B without CRM org: Fallback to session data
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

      // Customer email (always show if not already shown in CRM billing email)
      const customerEmail = session.customProperties?.customerEmail as string;
      const crmBillingEmail = buyerCrmOrg?.customProperties?.billingEmail as string | undefined;
      if (customerEmail && customerEmail !== crmBillingEmail) {
        doc.text(customerEmail, pageWidth / 2 + 10, billToYPos);
        billToYPos += 6;
      }

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

      // Tax breakdown - USE TRANSACTION DATA (accurate tax rate)
      if (taxAmount > 0) {
        yPos += 7;
        doc.text(`Tax (${taxRatePercent.toFixed(1)}%):`, pageWidth - 80, yPos);
        doc.text(
          `${currency.toUpperCase()} ${(taxAmount / 100).toFixed(2)}`,
          pageWidth - 20,
          yPos,
          { align: "right" }
        );
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

/**
 * GENERATE EVENT ATTENDEE LIST PDF
 *
 * Creates a professional attendee list PDF for an event with all ticket holders.
 */
export const generateEventAttendeeListPDF = action({
  args: {
    eventId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<PDFAttachment | null> => {
    try {
      const { jsPDF } = await import("jspdf");

      // 1. Get event data
      const event = await ctx.runQuery(internal.eventOntology.getEventInternal, {
        eventId: args.eventId,
      }) as Doc<"objects"> | null;

      if (!event || event.type !== "event") {
        throw new Error("Event not found");
      }

      // 2. Get attendees
      const attendees = await ctx.runQuery(api.eventOntology.getEventAttendees, {
        eventId: args.eventId,
      });

      // 3. Create PDF (A4 size, landscape for table layout)
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Event Attendee List", 20, 20);

      // Event details
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");
      doc.text(event.name, 20, 30);

      const customProps = event.customProperties || {};
      let yPos = 38;

      if (customProps.startDate) {
        const formattedDate = new Date(customProps.startDate as number).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        doc.text(`Date: ${formattedDate}`, 20, yPos);
        yPos += 6;
      }

      if (customProps.location) {
        doc.text(`Location: ${customProps.location}`, 20, yPos);
        yPos += 6;
      }

      doc.text(`Total Attendees: ${attendees.length}`, 20, yPos);
      yPos += 10;

      // Table header
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "bold");

      const colX = {
        num: 20,
        name: 35,
        email: 100,
        phone: 165,
        ticket: 215,
        status: 255,
      };

      doc.text("#", colX.num, yPos);
      doc.text("Name", colX.name, yPos);
      doc.text("Email", colX.email, yPos);
      doc.text("Phone", colX.phone, yPos);
      doc.text("Ticket Type", colX.ticket, yPos);
      doc.text("Status", colX.status, yPos);

      // Draw line
      yPos += 3;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 7;

      // Table rows
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);

      attendees.forEach((attendee, index) => {
        // Check if we need a new page
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;

          // Repeat header on new page
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 100, 100);
          doc.text("#", colX.num, yPos);
          doc.text("Name", colX.name, yPos);
          doc.text("Email", colX.email, yPos);
          doc.text("Phone", colX.phone, yPos);
          doc.text("Ticket Type", colX.ticket, yPos);
          doc.text("Status", colX.status, yPos);

          yPos += 3;
          doc.setDrawColor(200, 200, 200);
          doc.line(20, yPos, pageWidth - 20, yPos);
          yPos += 7;

          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);
        }

        // Row number
        doc.text((index + 1).toString(), colX.num, yPos);

        // Name
        const name = attendee.holderName || "Unknown";
        doc.text(name, colX.name, yPos, { maxWidth: 60 });

        // Email
        doc.text(attendee.holderEmail || "N/A", colX.email, yPos, { maxWidth: 60 });

        // Phone
        doc.text(attendee.holderPhone || "N/A", colX.phone, yPos, { maxWidth: 45 });

        // Ticket type
        doc.text(attendee.ticketType || "Standard", colX.ticket, yPos, { maxWidth: 35 });

        // Status
        const statusText = attendee.status || "issued";
        doc.text(statusText, colX.status, yPos);

        yPos += 6;
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
        20,
        pageHeight - 10
      );

      // Convert to base64
      const pdfBase64 = doc.output("datauristring").split(",")[1];

      return {
        filename: `attendee-list-${event._id.substring(0, 12)}.pdf`,
        content: pdfBase64,
        contentType: "application/pdf",
      };
    } catch (error) {
      console.error("Failed to generate attendee list PDF:", error);
      return null;
    }
  },
});
