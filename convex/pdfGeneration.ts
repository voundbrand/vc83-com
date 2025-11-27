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
import { formatCurrency, getCurrencySymbol } from "./lib/currencyFormatter";

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
        // Pass as numbers, not strings - Jinja2 template needs numeric types for comparisons
        net_price: netPrice,
        tax_amount: taxAmount,
        tax_rate: taxRate,
        total_price: totalPrice,
      };

      // 10. RESOLVE TEMPLATE FROM TEMPLATE SET (New unified resolver)
      // Uses Template Set system with 3-level precedence:
      // 1. Manual Send (if manualSetId provided)
      // 2. Context Override (Product > Checkout > Domain)
      // 3. Organization Default
      console.log("🎫 [Ticket Template Resolution] Starting template set resolution...");

      // Build context for template resolution
      const templateContext = {
        productId: product._id,
        checkoutInstanceId: session.customProperties?.checkoutInstanceId as Id<"objects"> | undefined,
        domainConfigId: session.customProperties?.domainConfigId as Id<"objects"> | undefined,
      };

      console.log("🎫 [Ticket Template Resolution] Context:", {
        organizationId: organizationId,
        productId: templateContext.productId,
        checkoutInstanceId: templateContext.checkoutInstanceId,
        domainConfigId: templateContext.domainConfigId,
      });

      // Resolve ticket template using new Template Set resolver
      const ticketTemplateId = await ctx.runQuery(internal.templateSetQueries.resolveIndividualTemplateInternal, {
        organizationId: organizationId,
        templateType: "ticket",
        context: templateContext,
      });

      console.log("🎫 [Ticket Template Resolution] Resolved template ID:", ticketTemplateId);

      if (!ticketTemplateId) {
        throw new Error(
          "No ticket template found in resolved template set. " +
          "Please ensure your template set includes a ticket template."
        );
      }

      // Get template details (templateCode, etc.)
      const template = await ctx.runQuery(internal.pdfTemplateQueries.resolvePdfTemplateInternal, {
        templateId: ticketTemplateId,
      });

      const templateCode = template.templateCode;
      console.log("🎫 [Ticket Template Resolution] Using template code:", templateCode, "from template:", template.name);

      // 11. Call API Template.io generator with resolved template
      const { generateTicketPdfFromTemplate } = await import("./lib/generateTicketPdf");

      const result = await generateTicketPdfFromTemplate({
        apiKey,
        templateCode,
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
    // Use whatever template is configured in the checkout session
    return await ctx.runAction(api.pdfGeneration.generateInvoicePDF, {
      checkoutSessionId: args.checkoutSessionId,
      // No templateCode - let generateInvoicePDF use the session's configured template
    });
  },
});

/**
 * GENERATE INVOICE/RECEIPT PDF (API Template.io)
 *
 * Creates a professional receipt/invoice PDF using HTML/CSS templates via API Template.io.
 * Uses the pdfTemplateCode configured in the checkout session's customProperties.
 *
 * Template Priority:
 * 1. args.templateCode (if explicitly passed)
 * 2. session.customProperties.pdfTemplateCode (from checkout configuration)
 * 3. Fallback: invoice_b2c_receipt_v1
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

      // Get locale settings for currency formatting
      const localeSettings = await ctx.runQuery(
        internal.checkoutSessions.getOrgLocaleSettings,
        { organizationId }
      );

      const invoiceCurrency = (localeSettings?.customProperties?.currency as string) || "eur";
      const invoiceLocale = (localeSettings?.customProperties?.locale as string) || "de-DE";

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
          // 🔍 DEBUG: Show actual billing address data
          billingAddressData: buyerCrmOrg?.customProperties?.billingAddress,
          vatNumber: buyerCrmOrg?.customProperties?.vatNumber,
        });
      }

      // 3. Get purchase items and GROUP by product
      const purchaseItemIds = (session.customProperties?.purchasedItemIds as Id<"objects">[]) || [];

      if (purchaseItemIds.length === 0) {
        console.error("❌ No purchase items found in checkout session");
        return null;
      }

      const purchaseItems = await Promise.all(
        purchaseItemIds.map((id) =>
          ctx.runQuery(internal.purchaseOntology.getPurchaseItemInternal, {
            purchaseItemId: id,
          })
        )
      );

      console.log(`✓ Found ${purchaseItems.length} purchase items`);

      // 4. GROUP purchase items by productId (one line per unique product)
      const groupedByProduct = new Map<string, {
        productId: Id<"objects">;
        productName: string;
        items: typeof purchaseItems;
      }>();

      for (const item of purchaseItems) {
        if (!item) continue;

        const productId = item.customProperties?.productId as Id<"objects"> | undefined;
        const productName = item.customProperties?.productName as string || "Unknown Product";

        if (!productId) continue;

        if (!groupedByProduct.has(productId)) {
          groupedByProduct.set(productId, {
            productId,
            productName,
            items: [],
          });
        }

        groupedByProduct.get(productId)!.items.push(item);
      }

      console.log(`✓ Grouped into ${groupedByProduct.size} unique products`);

      // 5. Convert grouped items to invoice line items
      // For each product group, find its transaction by looking up tickets
      const validItems = await Promise.all(
        Array.from(groupedByProduct.values()).map(async (group) => {
          const quantity = group.items.length; // Number of items of this product

          // Find transaction ID by looking up ANY ticket in this group
          // All tickets of same product share the same transaction
          let transactionId: Id<"objects"> | undefined;
          for (const item of group.items) {
            if (!item) continue;

            const fulfillmentData = item.customProperties?.fulfillmentData as { ticketId?: Id<"objects"> } | undefined;
            if (fulfillmentData?.ticketId) {
              const ticket = await ctx.runQuery(internal.ticketOntology.getTicketInternal, {
                ticketId: fulfillmentData.ticketId,
              });

              if (ticket?.customProperties?.transactionId) {
                transactionId = ticket.customProperties.transactionId as Id<"objects">;
                break; // Found it, no need to check other items
              }
            }
          }

          // Calculate totals from the items
          const totalPriceInCents = group.items.reduce((sum: number, item: any) => {
            if (!item) return sum;
            return sum + ((item.customProperties?.totalPrice as number) || 0);
          }, 0);

          return {
            productName: group.productName,
            quantity,
            totalPrice: totalPriceInCents,
            transactionId, // Keep for tax data lookup
          };
        })
      );

      // 6. Fetch transactions for tax data (needed for accurate tax calculations)
      const transactionIds = validItems.map(item => item.transactionId).filter(Boolean) as Id<"objects">[];
      const transactions = await Promise.all(
        transactionIds.map(id =>
          ctx.runQuery(internal.transactionOntology.getTransactionInternal, { transactionId: id })
        )
      );

      // Create a map of transactionId -> transaction for quick lookup
      const transactionMap = new Map<string, typeof transactions[0]>();
      for (const txn of transactions) {
        if (txn) {
          transactionMap.set(txn._id, txn);
        }
      }

      // 7. Calculate totals using transaction data (which has accurate tax)
      const subtotal = validItems.reduce((sum, item) => {
        const txn = item.transactionId ? transactionMap.get(item.transactionId) : null;
        if (txn) {
          const unitPrice = (txn.customProperties?.unitPriceInCents as number) || 0;
          const quantity = (txn.customProperties?.quantity as number) || 1;
          return sum + (unitPrice * quantity);
        }
        return sum;
      }, 0);

      const taxAmount = validItems.reduce((sum, item) => {
        const txn = item.transactionId ? transactionMap.get(item.transactionId) : null;
        if (txn) {
          const taxAmt = (txn.customProperties?.taxAmountInCents as number) || 0;
          return sum + taxAmt;
        }
        return sum;
      }, 0);

      const total = validItems.reduce((sum, item) => {
        const txn = item.transactionId ? transactionMap.get(item.transactionId) : null;
        if (txn) {
          const totalPrice = (txn.customProperties?.totalPriceInCents as number) || 0;
          return sum + totalPrice;
        }
        return sum + item.totalPrice;
      }, 0);

      // Currency already fetched from locale settings above (invoiceCurrency)

      // Get tax rate from first transaction (assumes all items have same rate)
      const firstTransaction = transactions.find((txn: any) => txn !== null);
      const taxRatePercent = (firstTransaction?.customProperties?.taxRatePercent as number) || 0;

      // 8. Group transactions by tax rate for invoice display
      interface TaxGroup {
        rate: number;
        subtotal: number;
        taxAmount: number;
      }

      const taxGroupsMap = new Map<number, TaxGroup>();

      for (const item of validItems) {
        const txn = item.transactionId ? transactionMap.get(item.transactionId) : null;
        if (txn) {
          const rate = (txn.customProperties?.taxRatePercent as number) || 0;
          const unitPrice = (txn.customProperties?.unitPriceInCents as number) || 0;
          const quantity = (txn.customProperties?.quantity as number) || 1;
          const itemSubtotal = unitPrice * quantity;
          const itemTax = (txn.customProperties?.taxAmountInCents as number) || 0;

          const existing = taxGroupsMap.get(rate) || { rate, subtotal: 0, taxAmount: 0 };
          taxGroupsMap.set(rate, {
            rate,
            subtotal: existing.subtotal + itemSubtotal,
            taxAmount: existing.taxAmount + itemTax,
          });
        }
      }

      // Convert to array and sort by rate (0% first, then ascending)
      const taxGroups = Array.from(taxGroupsMap.values()).sort((a, b) => a.rate - b.rate);

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

        // 🔍 DEBUG: Log actual billTo object sent to PDF template
        console.log("📄 [generateInvoicePDF] billTo object (from CRM org):", JSON.stringify(billTo, null, 2));
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
        const customerEmail = session.customProperties?.customerEmail as string | undefined;
        const customerPhone = session.customProperties?.customerPhone as string | undefined;

        // For B2C, if no billing address, show email/phone as contact info
        const contactInfo = [customerEmail, customerPhone].filter(Boolean).join(" | ");

        billTo = {
          company_name: customerName,
          vat_number: undefined,
          address: billingStreet || contactInfo || undefined,
          city: billingCity,
          state: billingState,
          zip_code: billingPostalCode,
          country: billingCountry,
        };
      }

      // 9. Prepare line items for invoice with pre-formatted currency
      const currencySymbol = getCurrencySymbol(invoiceCurrency.toUpperCase());
      const items = validItems.map(item => {
        // Get transaction for this line item
        const txn = item.transactionId ? transactionMap.get(item.transactionId) : null;

        if (txn) {
          // Use transaction data for accurate tax breakdown
          const unitPriceInCents = (txn.customProperties?.unitPriceInCents as number) || 0;
          const taxAmountInCents = (txn.customProperties?.taxAmountInCents as number) || 0;
          const totalPriceInCents = (txn.customProperties?.totalPriceInCents as number) || 0;
          const itemTaxRate = (txn.customProperties?.taxRatePercent as number) || taxRatePercent;
          const txnQuantity = (txn.customProperties?.quantity as number) || 1; // Use transaction's quantity, NOT purchase item count!

          // Calculate per-unit amounts (transaction stores TOTAL amounts for all units)
          const taxPerUnitInCents = Math.round(taxAmountInCents / txnQuantity);
          const totalPerUnitInCents = Math.round(totalPriceInCents / txnQuantity);

          return {
            description: item.productName,
            quantity: txnQuantity, // Use transaction's quantity for display
            // Pre-formatted currency strings (template will display as-is)
            unit_price_formatted: formatCurrency(unitPriceInCents, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }),
            tax_amount_formatted: formatCurrency(taxPerUnitInCents, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }),
            total_price_formatted: formatCurrency(totalPerUnitInCents, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }),
            tax_rate: itemTaxRate,
          };
        }

        // Fallback if no transaction (shouldn't happen in normal flow)
        const pricePerUnit = Math.round(item.totalPrice / item.quantity);
        return {
          description: item.productName,
          quantity: item.quantity,
          unit_price_formatted: formatCurrency(pricePerUnit, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }),
          tax_amount_formatted: formatCurrency(0, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }),
          total_price_formatted: formatCurrency(item.totalPrice, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }),
          tax_rate: 0,
        };
      });

      // 9.5. Load translations for invoice PDF labels
      // Read language from checkout instance (set in checkout configuration)
      const checkoutInstanceId = session.customProperties?.checkoutInstanceId as Id<"objects"> | undefined;
      let invoiceLanguage = "en"; // Default to English

      if (checkoutInstanceId) {
        const checkoutInstance = await ctx.runQuery(api.checkoutOntology.getPublicCheckoutInstanceById, {
          instanceId: checkoutInstanceId,
        });

        if (checkoutInstance) {
          const defaultLanguage = checkoutInstance.customProperties?.defaultLanguage as string | undefined;
          if (defaultLanguage) {
            // Normalize locale (e.g., "de-DE" -> "de")
            invoiceLanguage = defaultLanguage.toLowerCase().split("-")[0];
            console.log(`📄 Using invoice language from checkout instance: ${invoiceLanguage}`);
          }
        }
      }

      // Fetch translations from database
      const { getBackendTranslations } = await import("./helpers/backendTranslationHelper");
      const translationKeys = [
        "pdf.invoice.title",
        "pdf.invoice.number",
        "pdf.invoice.date",
        "pdf.invoice.dueDate",
        "pdf.invoice.from",
        "pdf.invoice.billTo",
        "pdf.invoice.attention",
        "pdf.invoice.vat",
        "pdf.invoice.itemDescription",
        "pdf.invoice.quantity",
        "pdf.invoice.unitPrice",
        "pdf.invoice.net",
        "pdf.invoice.gross",
        "pdf.invoice.total",
        "pdf.invoice.subtotal",
        "pdf.invoice.tax",
        "pdf.invoice.paymentTerms",
        "pdf.invoice.terms",
        "pdf.invoice.method",
        "pdf.invoice.paymentDue",
        "pdf.invoice.latePayment",
        "pdf.invoice.forQuestions",
        "pdf.invoice.contactUs",
        "pdf.invoice.thankYou",
      ];

      const translations = await getBackendTranslations(ctx, invoiceLanguage, translationKeys);

      // 10. Prepare invoice template data
      const invoiceData = {
        // Organization info
        organization_name: businessName,
        organization_address: organizationAddress,
        organization_phone: (sellerContact?.customProperties?.primaryPhone as string) ||
                           "+49 (0) 123 456 789", // Fallback
        organization_email: (sellerContact?.customProperties?.primaryEmail as string) ||
                           ("info@" + (organization?.slug || "company") + ".com"), // Fallback
        logo_url: sellerOrg?.customProperties?.logoUrl as string | undefined,
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

        // Translations (from database)
        t_invoice: translations["pdf.invoice.title"],
        t_invoiceNumber: translations["pdf.invoice.number"],
        t_date: translations["pdf.invoice.date"],
        t_due: translations["pdf.invoice.dueDate"],
        t_from: translations["pdf.invoice.from"],
        t_billTo: translations["pdf.invoice.billTo"],
        t_attention: translations["pdf.invoice.attention"],
        t_vat: translations["pdf.invoice.vat"],
        t_itemDescription: translations["pdf.invoice.itemDescription"],
        t_qty: translations["pdf.invoice.quantity"],
        t_unitPrice: translations["pdf.invoice.unitPrice"],
        t_net: translations["pdf.invoice.net"],
        t_gross: translations["pdf.invoice.gross"],
        t_total: translations["pdf.invoice.total"],
        t_subtotal: translations["pdf.invoice.subtotal"],
        t_tax: translations["pdf.invoice.tax"],
        t_paymentTerms: translations["pdf.invoice.paymentTerms"],
        t_terms: translations["pdf.invoice.terms"],
        t_method: translations["pdf.invoice.method"],
        t_paymentDue: translations["pdf.invoice.paymentDue"],
        t_latePayment: translations["pdf.invoice.latePayment"],
        t_forQuestions: translations["pdf.invoice.forQuestions"],
        t_contactUs: translations["pdf.invoice.contactUs"],
        t_thankYou: translations["pdf.invoice.thankYou"],

        // Bill to
        bill_to: billTo,

        // Line items (with pre-formatted currency)
        items,

        // Totals (pre-formatted for display)
        subtotal_formatted: formatCurrency(subtotal, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }),
        tax_formatted: formatCurrency(taxAmount, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }),
        total_formatted: formatCurrency(total, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }),
        tax_rate: taxRatePercent,
        currency_symbol: currencySymbol,

        // Tax groups (for invoices with multiple tax rates)
        tax_groups: taxGroups.map(group => ({
          rate: group.rate,
          rate_formatted: group.rate.toFixed(1) + "%",
          subtotal_formatted: formatCurrency(group.subtotal, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }),
          tax_amount_formatted: formatCurrency(group.taxAmount, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }),
        })),
        has_multiple_tax_rates: taxGroups.length > 1,
      };

      // DEBUG: Log invoice data structure
      console.log("📋 Invoice Data Structure:");
      console.log("  - Items count:", items.length);
      console.log("  - Subtotal:", subtotal, "→", formatCurrency(subtotal, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }));
      console.log("  - Tax:", taxAmount, "→", formatCurrency(taxAmount, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }));
      console.log("  - Total:", total, "→", formatCurrency(total, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }));
      console.log("  - Tax Rate:", taxRatePercent + "%");
      if (items.length > 0) {
        console.log("  - First item:", JSON.stringify(items[0], null, 2));
      }

      // 11. RESOLVE TEMPLATE FROM TEMPLATE SET (New unified resolver)
      // Uses Template Set system with 3-level precedence:
      // 1. Manual Send (if manualSetId provided)
      // 2. Context Override (Product > Checkout > Domain)
      // 3. Organization Default
      console.log("📄 [Invoice Template Resolution] Starting template set resolution...");

      // Build context for template resolution
      const invoiceTemplateContext = {
        checkoutInstanceId: session.customProperties?.checkoutInstanceId as Id<"objects"> | undefined,
        domainConfigId: session.customProperties?.domainConfigId as Id<"objects"> | undefined,
      };

      console.log("📄 [Invoice Template Resolution] Context:", {
        organizationId: organizationId,
        checkoutInstanceId: invoiceTemplateContext.checkoutInstanceId,
        domainConfigId: invoiceTemplateContext.domainConfigId,
      });

      // Resolve invoice template using new Template Set resolver
      const invoiceTemplateId = await ctx.runQuery(internal.templateSetQueries.resolveIndividualTemplateInternal, {
        organizationId: organizationId,
        templateType: "invoice",
        context: invoiceTemplateContext,
      });

      console.log("📄 [Invoice Template Resolution] Resolved template ID:", invoiceTemplateId);

      if (!invoiceTemplateId) {
        throw new Error(
          "No invoice template found in resolved template set. " +
          "Please ensure your template set includes an invoice template."
        );
      }

      // Get template details (templateCode, etc.)
      const invoiceTemplate = await ctx.runQuery(internal.pdfTemplateQueries.resolvePdfTemplateInternal, {
        templateId: invoiceTemplateId,
      });

      const templateCode = invoiceTemplate.templateCode;
      console.log("📄 [Invoice Template Resolution] Using template code:", templateCode, "from template:", invoiceTemplate.name);

      // 12. Call API Template.io generator with resolved template
      const { generateInvoicePdfFromTemplate } = await import("./lib/generateInvoicePdf");

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

      attendees.forEach((attendee: any, index: number) => {
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
