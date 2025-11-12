/**
 * PDF GENERATION FOR TICKETS AND INVOICES
 *
 * ✅ MIGRATED TO API TEMPLATE.IO (January 2025)
 * ===========================================
 * Replaced jsPDF with API Template.io HTML/CSS templates for professional PDFs.
 *
 * Benefits:
 * - Professional HTML/CSS templates instead of programmatic positioning
 * - Easy customization through HTML/CSS editing
 * - Consistent branding across all PDFs
 * - API-based rendering offloads processing
 *
 * Templates:
 * - Tickets: elegant-gold, modern-ticket, vip-premium
 * - Invoices: b2b-professional, detailed-breakdown, b2c-receipt
 *
 * Related Files:
 * - convex/lib/generateTicketPdf.ts - API Template.io ticket generator
 * - convex/lib/generateInvoicePdf.ts - API Template.io invoice generator
 * - convex/lib/pdf_templates/ - HTML/CSS template files
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
 * GENERATE TICKET PDF (API Template.io)
 *
 * Creates a professional ticket PDF using HTML/CSS templates via API Template.io.
 * Supports multiple template styles: elegant-gold, modern-ticket, vip-premium.
 *
 * Migration Note: Replaced ~300 lines of jsPDF positioning code with clean HTML/CSS templates.
 */
export const generateTicketPDF = action({
  args: {
    ticketId: v.id("objects"),
    checkoutSessionId: v.id("objects"),
    templateCode: v.optional(v.string()), // "elegant-gold", "modern-ticket", "vip-premium"
  },
  handler: async (ctx, args): Promise<PDFAttachment | null> => {
    try {
      // 1. Check for API key
      const apiKey = process.env.API_TEMPLATE_IO_KEY;
      if (!apiKey) {
        console.error("❌ API_TEMPLATE_IO_KEY not configured - falling back to error");
        return null;
      }

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

      // 6. Get pricing from transaction
      const transactionId = ticket.customProperties?.transactionId as Id<"objects"> | undefined;
      const currency = (session.customProperties?.currency as string) || "EUR";

      let netPrice = 0;
      let taxAmount = 0;
      let totalPrice = 0;
      let taxRate = 0;

      if (transactionId) {
        const transaction = await ctx.runQuery(internal.transactionOntology.getTransactionInternal, {
          transactionId,
        });

        if (transaction && transaction.type === "transaction") {
          const unitPriceInCents = (transaction.customProperties?.unitPriceInCents as number) || 0;
          const totalPriceInCents = (transaction.customProperties?.totalPriceInCents as number) || 0;
          const taxAmountInCents = (transaction.customProperties?.taxAmountInCents as number) || 0;

          netPrice = unitPriceInCents / 100;
          totalPrice = totalPriceInCents / 100;
          taxAmount = taxAmountInCents / 100;
          taxRate = netPrice > 0 ? ((taxAmount / netPrice) * 100) : 0;
        }
      }

      // Fallback to session totals
      if (totalPrice === 0) {
        const totalAmount = (session.customProperties?.totalAmount as number) || 0;
        const sessionTaxAmount = (session.customProperties?.taxAmount as number) || 0;
        const subtotalAmount = totalAmount - sessionTaxAmount;

        netPrice = subtotalAmount / 100;
        taxAmount = sessionTaxAmount / 100;
        totalPrice = totalAmount / 100;
        taxRate = netPrice > 0 ? ((taxAmount / netPrice) * 100) : 0;
      }

      // 7. Format dates for template
      const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      };

      const formatDateTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      };

      // 8. Get additional event details
      const eventAddress = (session.customProperties?.eventAddress as string) || "";

      // 9. Prepare ticket data for API Template.io
      const ticketData = {
        // Ticket info
        ticket_number: ticket._id,
        ticket_type: ticket.subtype || "Standard",
        attendee_name: ticket.customProperties?.holderName as string,
        attendee_email: ticket.customProperties?.holderEmail as string,
        guest_count: 1,

        // Event info
        event_name: eventName,
        event_date: eventDate ? formatDate(eventDate) : "TBD",
        event_time: eventDate ? formatDateTime(eventDate) : "TBD",
        event_location: eventLocation || "Location TBD",
        event_address: eventAddress,
        event_sponsors: eventSponsors,

        // QR code URL (API Template.io will fetch it)
        qr_code_data: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL || "https://app.yourcompany.com"}/verify-ticket/${args.ticketId}`)}`,

        // Organization/branding
        organization_name: sellerOrg?.name || "Event Organizer",
        organization_email: (sellerContact?.customProperties?.primaryEmail as string) || "support@yourcompany.com",
        organization_phone: (sellerContact?.customProperties?.primaryPhone as string) || "",
        organization_website: (sellerContact?.customProperties?.website as string) || "",
        logo_url: undefined, // TODO: Add organization logo support
        highlight_color: "#6B46C1", // Brand purple

        // Order info
        order_id: session._id.substring(0, 12),
        order_date: formatDate(session.createdAt),
        currency: currency.toUpperCase(),
        net_price: netPrice.toFixed(2),
        tax_amount: taxAmount.toFixed(2),
        tax_rate: taxRate.toFixed(1),
        total_price: totalPrice.toFixed(2),
      };

      // 10. Call API Template.io generator
      const { generateTicketPdfFromTemplate } = await import("./lib/generateTicketPdf");

      const result = await generateTicketPdfFromTemplate({
        apiKey,
        templateCode: args.templateCode || "modern-ticket",
        ticketData,
      });

      if (result.status === "error") {
        console.error("❌ API Template.io error:", result.error, result.message);
        return null;
      }

      // 11. Download PDF from API Template.io and convert to base64
      const pdfResponse = await fetch(result.download_url!);
      if (!pdfResponse.ok) {
        throw new Error("Failed to download PDF from API Template.io");
      }

      const pdfBlob = await pdfResponse.blob();
      const pdfBuffer = await pdfBlob.arrayBuffer();
      const pdfBase64 = btoa(
        String.fromCharCode(...new Uint8Array(pdfBuffer))
      );

      console.log("✅ Ticket PDF generated via API Template.io:", result.transaction_ref);

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
 * Creates a receipt PDF for paid orders (Stripe, PayPal, etc.) using the B2C-friendly template.
 * This is a public action that can be called from the frontend.
 */
export const generateReceiptPDF = action({
  args: {
    checkoutSessionId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<PDFAttachment | null> => {
    // Use the B2C receipt template for customer-friendly formatting
    return await ctx.runAction(api.pdfGeneration.generateInvoicePDF, {
      checkoutSessionId: args.checkoutSessionId,
      templateCode: "b2c-receipt", // B2C-friendly receipt template
    });
  },
});

/**
 * GENERATE INVOICE/RECEIPT PDF (API Template.io)
 *
 * Creates a professional receipt/invoice PDF using HTML/CSS templates via API Template.io.
 * Supports both B2B (with company billing) and B2C (individual customer) invoices.
 * Template options: b2b-professional, detailed-breakdown, b2c-receipt
 */
export const generateInvoicePDF = action({
  args: {
    checkoutSessionId: v.id("objects"),
    crmOrganizationId: v.optional(v.id("objects")), // Optional: B2B employer organization
    templateCode: v.optional(v.string()), // "b2b-professional", "detailed-breakdown", "b2c-receipt"
  },
  handler: async (ctx, args): Promise<PDFAttachment | null> => {
    try {
      // 1. Check for API key
      const apiKey = process.env.API_TEMPLATE_IO_KEY;
      if (!apiKey) {
        console.error("❌ API_TEMPLATE_IO_KEY not configured - falling back to error");
        return null;
      }

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

      // Extract billing address from session
      const billingStreet = session.customProperties?.billingStreet as string | undefined;
      const billingCity = session.customProperties?.billingCity as string | undefined;
      const billingState = session.customProperties?.billingState as string | undefined;
      const billingPostalCode = session.customProperties?.billingPostalCode as string | undefined;
      const billingCountry = session.customProperties?.billingCountry as string | undefined;

      // 6. Prepare invoice data for API Template.io
      const businessName = sellerLegal?.customProperties?.legalEntityName as string | undefined ||
                          organization?.businessName ||
                          organization?.name ||
                          sellerOrg?.name ||
                          "L4YERCAK3.com";

      // 7. Build organization address from tax settings or legal info
      let organizationAddress = "";
      if (taxSettings?.originAddress) {
        const origin = taxSettings.originAddress;
        const addressParts = [
          origin.addressLine1,
          origin.addressLine2,
          [origin.city, origin.state, origin.postalCode].filter(Boolean).join(", "),
          origin.country
        ].filter(Boolean);
        organizationAddress = addressParts.join("\n");
      } else if (sellerLegal?.customProperties?.address) {
        organizationAddress = sellerLegal.customProperties.address as string;
      }

      // 8. Build bill_to information
      const isCRMBilling = !!buyerCrmOrg;
      let billTo: {
        company_name: string;
        vat_number?: string;
        address?: string;
        city?: string;
        state?: string;
        zip_code?: string;
        country?: string;
      };

      if (isCRMBilling && buyerCrmOrg) {
        // Use CRM organization billing data
        const crmBillingAddress = buyerCrmOrg.customProperties?.billingAddress as {
          line1?: string;
          line2?: string;
          city?: string;
          state?: string;
          postalCode?: string;
          country?: string;
        } | undefined;

        billTo = {
          company_name: buyerCrmOrg.name,
          vat_number: buyerCrmOrg.customProperties?.vatNumber as string | undefined,
          address: [crmBillingAddress?.line1, crmBillingAddress?.line2].filter(Boolean).join(", "),
          city: crmBillingAddress?.city,
          state: crmBillingAddress?.state,
          zip_code: crmBillingAddress?.postalCode,
          country: crmBillingAddress?.country,
        };
      } else if (transactionType === "B2B" && buyerCompanyName) {
        // B2B from session data
        billTo = {
          company_name: buyerCompanyName,
          vat_number: buyerVatNumber,
          address: billingStreet,
          city: billingCity,
          state: billingState,
          zip_code: billingPostalCode,
          country: billingCountry,
        };
      } else {
        // B2C customer
        const customerName = session.customProperties?.customerName as string | undefined || "Customer";

        billTo = {
          company_name: customerName,
          vat_number: undefined,
          address: billingStreet,
          city: billingCity,
          state: billingState,
          zip_code: billingPostalCode,
          country: billingCountry,
        };
      }

      // 9. Prepare line items for invoice
      const items = validItems.map(item => ({
        description: item.productName,
        quantity: item.quantity,
        rate: item.pricePerUnit / 100,
        amount: item.totalPrice / 100,
      }));

      // 10. Prepare invoice template data
      const invoiceData = {
        // Organization info
        organization_name: businessName,
        organization_address: organizationAddress,
        organization_phone: sellerContact?.customProperties?.primaryPhone as string | undefined,
        organization_email: sellerContact?.customProperties?.primaryEmail as string | undefined,
        tax_id: sellerLegal?.customProperties?.taxId as string | undefined,
        vat_number: sellerLegal?.customProperties?.vatNumber as string | undefined,

        // Invoice details
        invoice_number: `INV-${session._id.substring(0, 12)}`,
        invoice_date: new Date(session.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        due_date: new Date(session.createdAt + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),

        // Bill to
        bill_to: billTo,

        // Line items
        items,

        // Totals
        subtotal: subtotal / 100,
        tax_rate: taxRatePercent,
        tax: taxAmount / 100,
        total: total / 100,
        currency: currency.toUpperCase(),

        // Additional info
        payment_terms: "Payment due within 30 days",
        notes: transactionType === "B2B" ? "Thank you for your business!" : "Thank you for your purchase!",
        highlight_color: "#6B46C1",
      };

      // 11. Call API Template.io generator
      const { generateInvoicePdfFromTemplate } = await import("./lib/generateInvoicePdf");

      // Choose template based on transaction type
      let templateCode = args.templateCode;
      if (!templateCode) {
        templateCode = transactionType === "B2B" ? "b2b-professional" : "b2c-receipt";
      }

      const result = await generateInvoicePdfFromTemplate({
        apiKey,
        templateCode,
        invoiceData,
      });

      if (result.status === "error") {
        console.error("❌ API Template.io error:", result.error, result.message);
        return null;
      }

      // 12. Download PDF from API Template.io and convert to base64
      const pdfResponse = await fetch(result.download_url!);
      if (!pdfResponse.ok) {
        throw new Error("Failed to download PDF from API Template.io");
      }

      const pdfBlob = await pdfResponse.blob();
      const pdfBuffer = await pdfBlob.arrayBuffer();
      const pdfBase64 = btoa(
        String.fromCharCode(...new Uint8Array(pdfBuffer))
      );

      console.log("✅ Invoice PDF generated via API Template.io:", result.transaction_ref);

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
