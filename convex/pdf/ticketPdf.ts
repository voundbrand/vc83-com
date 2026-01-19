import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Id, Doc } from "../_generated/dataModel";

export type PDFAttachment = {
    filename: string;
    content: string; // base64
    contentType: string;
    downloadUrl?: string; // Permanent URL from API Template.io (optional)
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

            // 4.5. Load domain branding (if domainConfigId exists)
            let domainBranding: { primaryColor?: string; secondaryColor?: string; logoUrl?: string } = {};
            const domainConfigId = session.customProperties?.domainConfigId as Id<"objects"> | undefined;

            if (domainConfigId) {
                const domainConfig = await ctx.runQuery(api.domainConfigOntology.getDomainConfig, {
                    configId: domainConfigId,
                });

                if (domainConfig?.customProperties?.branding) {
                    const branding = domainConfig.customProperties.branding as Record<string, unknown>;
                    domainBranding = {
                        primaryColor: branding.primaryColor as string | undefined,
                        secondaryColor: branding.secondaryColor as string | undefined,
                        logoUrl: branding.logoUrl as string | undefined,
                    };
                    console.log("🌐 [generateTicketPDF] Domain branding loaded:", domainBranding);
                }
            }

            // 4.6. Load organization branding settings
            const brandingSettings = await ctx.runQuery(api.organizationOntology.getOrganizationSettings, {
                organizationId,
                subtype: "branding",
            });

            const brandingSettingsObj = Array.isArray(brandingSettings) ? brandingSettings[0] : brandingSettings;
            const organizationBranding = {
                primaryColor: brandingSettingsObj?.customProperties?.primaryColor as string | undefined,
                secondaryColor: brandingSettingsObj?.customProperties?.secondaryColor as string | undefined,
                logoUrl: brandingSettingsObj?.customProperties?.logoUrl as string | undefined,
            };

            console.log("🎨 [generateTicketPDF] Organization branding loaded:", organizationBranding);

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
                // Branding cascade: domain → organization → default
                logo_url: domainBranding.logoUrl || organizationBranding.logoUrl,
                highlight_color: domainBranding.primaryColor || organizationBranding.primaryColor || "#6B46C1",

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

            // 12. Call API Template.io generator with resolved template
            const { generateTicketPdfFromTemplate } = await import("../lib/generateTicketPdf");

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
 * GENERATE TICKET PDF FROM TICKET (NO CHECKOUT REQUIRED)
 *
 * Generates a ticket PDF using only ticket data - works for both manual and checkout tickets.
 * This is the version that stores the PDF URL on the ticket object.
 */
export const generateTicketPDFFromTicket = action({
    args: {
        ticketId: v.id("objects"),
        templateCode: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<string | null> => {
        try {
            const apiKey = process.env.API_TEMPLATE_IO_KEY;
            if (!apiKey) {
                console.error("❌ API_TEMPLATE_IO_KEY not configured");
                return null;
            }

            // 1. Get ticket data
            const ticket = await ctx.runQuery(internal.ticketOntology.getTicketInternal, {
                ticketId: args.ticketId,
            }) as Doc<"objects"> | null;

            if (!ticket || ticket.type !== "ticket") {
                throw new Error("Ticket not found");
            }

            const ticketProps = ticket.customProperties || {};
            const organizationId = ticket.organizationId;

            // 2. Get product data
            const productId = ticketProps.productId as Id<"objects"> | undefined;
            if (!productId) {
                throw new Error("Ticket has no associated product");
            }

            const product = await ctx.runQuery(internal.productOntology.getProductInternal, {
                productId,
            }) as Doc<"objects"> | null;

            if (!product) {
                throw new Error("Product not found");
            }

            // 2.5. Load domain config if available (for domain-specific branding)
            const domainConfigId = product.customProperties?.domainConfigId as Id<"objects"> | undefined;
            let domainBranding = {
                primaryColor: undefined as string | undefined,
                secondaryColor: undefined as string | undefined,
                logoUrl: undefined as string | undefined,
            };

            if (domainConfigId) {
                const domainConfig = await ctx.runQuery(internal.domainConfigOntology.getDomainConfigInternal, {
                    configId: domainConfigId,
                });

                if (domainConfig?.customProperties?.branding) {
                    const branding = domainConfig.customProperties.branding as Record<string, unknown>;
                    domainBranding = {
                        primaryColor: branding.primaryColor as string | undefined,
                        secondaryColor: branding.secondaryColor as string | undefined,
                        logoUrl: branding.logoUrl as string | undefined,
                    };
                    console.log("🌐 Domain branding loaded:", domainBranding);
                }
            }

            // 3. Get organization info for branding
            const sellerOrg = await ctx.runQuery(
                api.organizationOntology.getOrganizationProfile,
                { organizationId }
            ) as Doc<"objects"> | null;

            const sellerContact = await ctx.runQuery(
                api.organizationOntology.getOrganizationContact,
                { organizationId }
            ) as Doc<"objects"> | null;

            // 3.5. Load organization locale settings for language/currency
            const localeSettings = await ctx.runQuery(api.organizationOntology.getOrganizationSettings, {
                organizationId,
                subtype: "locale",
            });

            const localeSettingsObj = Array.isArray(localeSettings) ? localeSettings[0] : localeSettings;

            // Get language from organization settings with fallback to English
            let ticketLanguage = "en";
            if (localeSettingsObj?.customProperties?.language) {
                const orgLanguage = localeSettingsObj.customProperties.language as string;
                ticketLanguage = orgLanguage.toLowerCase().split("-")[0]; // Normalize "de-DE" → "de"
                console.log(`🎫 Using ticket language from organization settings: ${ticketLanguage}`);
            }

            // 3.6. Load organization branding settings
            const brandingSettings = await ctx.runQuery(api.organizationOntology.getOrganizationSettings, {
                organizationId,
                subtype: "branding",
            });

            const brandingSettingsObj = Array.isArray(brandingSettings) ? brandingSettings[0] : brandingSettings;
            const organizationBranding = {
                primaryColor: brandingSettingsObj?.customProperties?.primaryColor as string | undefined,
                secondaryColor: brandingSettingsObj?.customProperties?.secondaryColor as string | undefined,
                logoUrl: brandingSettingsObj?.customProperties?.logoUrl as string | undefined,
            };

            console.log("🎨 Organization branding loaded:", organizationBranding);

            // 4. Extract event data from ticket or product
            const eventName = (ticketProps.eventName as string) || product.name;
            const eventDate = (ticketProps.eventDate as number) ||
                (ticketProps.startDate as number) ||
                (product.customProperties?.eventDate as number | undefined) ||
                (product.customProperties?.startDate as number | undefined);
            const eventLocation = (ticketProps.eventLocation as string) ||
                (product.customProperties?.location as string | undefined);
            const eventAddress = (ticketProps.eventAddress as string) || "";
            const eventSponsors = ticketProps.eventSponsors as Array<{ name: string; level?: string }> | undefined;

            // 5. Get pricing from transaction or fallback to ticket data
            const transactionId = ticketProps.transactionId as Id<"objects"> | undefined;
            const currency = (ticketProps.currency as string) || "EUR";

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
            } else {
                // Fallback to ticket or product pricing
                const priceInCents = (ticketProps.priceInCents as number) || (product.customProperties?.priceInCents as number) || 0;
                netPrice = priceInCents / 100;
                totalPrice = netPrice; // Assume no tax for manual tickets
            }

            // 6. Format dates using organization language
            const languageLocaleMap: Record<string, string> = {
                de: "de-DE",
                en: "en-US",
                es: "es-ES",
                fr: "fr-FR",
            };
            const locale = languageLocaleMap[ticketLanguage] || "en-US";

            const formatDate = (timestamp: number) => {
                return new Date(timestamp).toLocaleDateString(locale, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                });
            };

            const formatDateTime = (timestamp: number) => {
                return new Date(timestamp).toLocaleDateString(locale, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                });
            };

            // 7. Load ticket translations from database
            const { getBackendTranslations } = await import("../helpers/backendTranslationHelper");
            const ticketTranslationKeys = [
                // Field labels
                "pdf.ticket.attendee",
                "pdf.ticket.ticketHolder",
                "pdf.ticket.date",
                "pdf.ticket.dateTime",
                "pdf.ticket.time",
                "pdf.ticket.location",
                "pdf.ticket.venue",
                "pdf.ticket.event",
                "pdf.ticket.guests",
                "pdf.ticket.guest",
                "pdf.ticket.ticketNumber",
                "pdf.ticket.ticketId",
                "pdf.ticket.ticketInfo",
                "pdf.ticket.ticketType",
                "pdf.ticket.ticketHash",
                // Order summary
                "pdf.ticket.orderSummary",
                "pdf.ticket.orderNumber",
                "pdf.ticket.purchased",
                "pdf.ticket.subtotal",
                "pdf.ticket.tax",
                "pdf.ticket.total",
                // QR and verification
                "pdf.ticket.scanToVerify",
                "pdf.ticket.scanAtEntrance",
                "pdf.ticket.presentTicket",
                "pdf.ticket.presentAtDoor",
                // Sections
                "pdf.ticket.eventPolicies",
                "pdf.ticket.contactInfo",
                "pdf.ticket.reservedFor",
                "pdf.ticket.presentedBy",
                // Policy items
                "pdf.ticket.arrival",
                "pdf.ticket.arrivalPolicy",
                "pdf.ticket.identification",
                "pdf.ticket.identificationPolicy",
                "pdf.ticket.transfers",
                "pdf.ticket.transfersPolicy",
                "pdf.ticket.refunds",
                "pdf.ticket.refundsPolicy",
                "pdf.ticket.accessibility",
                "pdf.ticket.accessibilityPolicy",
                "pdf.ticket.photography",
                "pdf.ticket.photographyPolicy",
                // Footer and closing
                "pdf.ticket.forQuestions",
                "pdf.ticket.lookForward",
                "pdf.ticket.privateEvent",
                "pdf.ticket.curatedEvent",
            ];

            const ticketTranslations = await getBackendTranslations(ctx, ticketLanguage, ticketTranslationKeys);
            console.log(`🎫 Loaded ${Object.keys(ticketTranslations).length} ticket translations for language: ${ticketLanguage}`);
            console.log(`🎫 Sample translations:`, {
                attendee: ticketTranslations["pdf.ticket.attendee"],
                dateTime: ticketTranslations["pdf.ticket.dateTime"],
                eventPolicies: ticketTranslations["pdf.ticket.eventPolicies"],
            });

            // 8. Prepare ticket data for API Template.io
            const ticketData = {
                ticket_number: ticket._id,
                ticket_type: ticket.subtype || "Standard",
                attendee_name: ticketProps.holderName as string || "Guest",
                attendee_email: ticketProps.holderEmail as string || "",
                guest_count: 1,

                event_name: eventName,
                event_date: eventDate ? formatDate(eventDate) : "TBD",
                event_time: eventDate ? formatDateTime(eventDate) : "TBD",
                event_location: eventLocation || "Location TBD",
                event_address: eventAddress,
                event_sponsors: eventSponsors,

                qr_code_data: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL || "https://app.yourcompany.com"}/verify-ticket/${args.ticketId}`)}`,

                organization_name: sellerOrg?.name || "Event Organizer",
                organization_email: (sellerContact?.customProperties?.primaryEmail as string) || "support@yourcompany.com",
                organization_phone: (sellerContact?.customProperties?.primaryPhone as string) || "",
                organization_website: (sellerContact?.customProperties?.website as string) || "",
                // Branding cascade: domain → organization → default
                logo_url: domainBranding.logoUrl || organizationBranding.logoUrl,
                highlight_color: domainBranding.primaryColor || organizationBranding.primaryColor || "#6B46C1",

                order_id: ticketProps.orderId as string | undefined || ticket._id.substring(0, 12),
                order_date: formatDate(ticket.createdAt),
                currency: currency.toUpperCase(),
                net_price: netPrice,
                tax_amount: taxAmount,
                tax_rate: taxRate,
                total_price: totalPrice,

                // Language for template translations
                language: ticketLanguage,

                // Translations (from database) - Field labels
                t_attendee: ticketTranslations["pdf.ticket.attendee"],
                t_ticketHolder: ticketTranslations["pdf.ticket.ticketHolder"],
                t_date: ticketTranslations["pdf.ticket.date"],
                t_dateTime: ticketTranslations["pdf.ticket.dateTime"],
                t_time: ticketTranslations["pdf.ticket.time"],
                t_location: ticketTranslations["pdf.ticket.location"],
                t_venue: ticketTranslations["pdf.ticket.venue"],
                t_event: ticketTranslations["pdf.ticket.event"],
                t_guests: ticketTranslations["pdf.ticket.guests"],
                t_guest: ticketTranslations["pdf.ticket.guest"],
                t_ticketNumber: ticketTranslations["pdf.ticket.ticketNumber"],
                t_ticketId: ticketTranslations["pdf.ticket.ticketId"],
                t_ticketInfo: ticketTranslations["pdf.ticket.ticketInfo"],
                t_ticketType: ticketTranslations["pdf.ticket.ticketType"],
                t_ticketHash: ticketTranslations["pdf.ticket.ticketHash"],
                // Translations - Order summary
                t_orderSummary: ticketTranslations["pdf.ticket.orderSummary"],
                t_orderNumber: ticketTranslations["pdf.ticket.orderNumber"],
                t_purchased: ticketTranslations["pdf.ticket.purchased"],
                t_subtotal: ticketTranslations["pdf.ticket.subtotal"],
                t_tax: ticketTranslations["pdf.ticket.tax"],
                t_total: ticketTranslations["pdf.ticket.total"],
                // Translations - QR and verification
                t_scanToVerify: ticketTranslations["pdf.ticket.scanToVerify"],
                t_scanAtEntrance: ticketTranslations["pdf.ticket.scanAtEntrance"],
                t_presentTicket: ticketTranslations["pdf.ticket.presentTicket"],
                t_presentAtDoor: ticketTranslations["pdf.ticket.presentAtDoor"],
                // Translations - Sections
                t_eventPolicies: ticketTranslations["pdf.ticket.eventPolicies"],
                t_contactInfo: ticketTranslations["pdf.ticket.contactInfo"],
                t_reservedFor: ticketTranslations["pdf.ticket.reservedFor"],
                t_presentedBy: ticketTranslations["pdf.ticket.presentedBy"],
                // Translations - Policy items
                t_arrival: ticketTranslations["pdf.ticket.arrival"],
                t_arrivalPolicy: ticketTranslations["pdf.ticket.arrivalPolicy"],
                t_identification: ticketTranslations["pdf.ticket.identification"],
                t_identificationPolicy: ticketTranslations["pdf.ticket.identificationPolicy"],
                t_transfers: ticketTranslations["pdf.ticket.transfers"],
                t_transfersPolicy: ticketTranslations["pdf.ticket.transfersPolicy"],
                t_refunds: ticketTranslations["pdf.ticket.refunds"],
                t_refundsPolicy: ticketTranslations["pdf.ticket.refundsPolicy"],
                t_accessibility: ticketTranslations["pdf.ticket.accessibility"],
                t_accessibilityPolicy: ticketTranslations["pdf.ticket.accessibilityPolicy"],
                t_photography: ticketTranslations["pdf.ticket.photography"],
                t_photographyPolicy: ticketTranslations["pdf.ticket.photographyPolicy"],
                // Translations - Footer and closing
                t_forQuestions: ticketTranslations["pdf.ticket.forQuestions"],
                t_lookForward: ticketTranslations["pdf.ticket.lookForward"],
                t_privateEvent: ticketTranslations["pdf.ticket.privateEvent"],
                t_curatedEvent: ticketTranslations["pdf.ticket.curatedEvent"],
            };

            // 9. Resolve template with smart fallback chain:
            // 1. Explicit templateCode argument (user selection)
            // 2. Previously used template (from ticket.customProperties)
            // 3. Organization default template
            // 4. System default
            let templateCode = args.templateCode;

            if (!templateCode) {
                // Try previously used template
                const previousTemplate = ticketProps.pdfTemplateCode as string | undefined;
                if (previousTemplate) {
                    console.log("🎫 [Template] Using previously used template:", previousTemplate);
                    templateCode = previousTemplate;
                }
            }

            if (!templateCode) {
                // Try organization default template
                const templateSettings = await ctx.runQuery(api.organizationOntology.getOrganizationSettings, {
                    organizationId,
                    subtype: "templates",
                });
                const templateSettingsObj = Array.isArray(templateSettings) ? templateSettings[0] : templateSettings;
                const orgDefaultTemplate = templateSettingsObj?.customProperties?.defaultTicketTemplate as string | undefined;

                if (orgDefaultTemplate) {
                    console.log("🎫 [Template] Using organization default template:", orgDefaultTemplate);
                    templateCode = orgDefaultTemplate;
                }
            }

            if (!templateCode) {
                // Final fallback to system default - Professional template
                templateCode = "ticket_professional_v1";
                console.log("🎫 [Template] Using system default template:", templateCode);
            }

            console.log("🎫 [generateTicketPDFFromTicket] Final template:", templateCode);

            // 9. Generate PDF
            const { generateTicketPdfFromTemplate } = await import("../lib/generateTicketPdf");

            const result = await generateTicketPdfFromTemplate({
                apiKey,
                templateCode,
                ticketData,
            });

            if (result.status === "error") {
                console.error("❌ API Template.io error:", result.error, result.message);
                return null;
            }

            // 10. Store PDF URL and template code on ticket
            const pdfUrl = result.download_url!;
            await ctx.runMutation(internal.ticketOntology.updateTicketPDF, {
                ticketId: args.ticketId,
                pdfUrl,
                templateCode, // Store which template was used
            });

            console.log("✅ Ticket PDF generated and stored:", pdfUrl, "using template:", templateCode);
            return pdfUrl;

        } catch (error) {
            console.error("Failed to generate ticket PDF from ticket:", error);
            return null;
        }
    },
});

/**
 * REGENERATE TICKET PDF (Public - for UI button)
 *
 * Regenerates a ticket PDF with latest branding/settings.
 * This is the public version that can be called from the UI.
 */
export const regenerateTicketPDF = action({
    args: {
        sessionId: v.string(),
        ticketId: v.id("objects"),
        templateCode: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<PDFAttachment | null> => {
        // Use the internal generateTicketPDFFromTicket to generate fresh PDF
        // Note: We need to call the action from this file, but we can't call exported actions directly in the same file easily via `api`.
        // However, since we are in the same file, we can just call the handler if we extract it, or use `ctx.runAction` with `api.pdf.ticketPdf.generateTicketPDFFromTicket`
        // But `api` structure depends on file structure. `convex/pdf/ticketPdf.ts` -> `api.pdf.ticketPdf`

        const pdfUrl = await ctx.runAction(api.pdf.ticketPdf.generateTicketPDFFromTicket, {
            ticketId: args.ticketId,
            templateCode: args.templateCode,
        });

        if (!pdfUrl) {
            return null;
        }

        // Fetch the PDF and return as attachment
        const response = await fetch(pdfUrl);
        if (!response.ok) {
            throw new Error("Failed to fetch regenerated PDF");
        }

        const pdfBlob = await response.blob();
        const pdfBuffer = await pdfBlob.arrayBuffer();
        const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

        return {
            filename: `ticket-${args.ticketId.substring(0, 12)}.pdf`,
            content: pdfBase64,
            contentType: "application/pdf",
            downloadUrl: pdfUrl,
        };
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

/**
 * GENERATE EVENT ATTENDEE LIST CSV
 * Creates a CSV file with all attendees for an event
 */
export const generateEventAttendeeListCSV = action({
    args: {
        eventId: v.id("objects"),
    },
    handler: async (ctx, args): Promise<PDFAttachment | null> => {
        try {
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

            // 3. Helper function to escape CSV values
            const escapeCSV = (value: string | number | null | undefined): string => {
                if (value === null || value === undefined) return "";
                const str = String(value);
                // Escape quotes by doubling them and wrap in quotes if contains comma, quote, or newline
                if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            // 4. Build CSV content
            const headers = ["#", "Name", "Email", "Phone", "Ticket Number", "Ticket Type", "Status", "Purchase Date", "Price Paid"];
            const rows: string[] = [headers.join(",")];

            attendees.forEach((attendee: {
                holderName: string;
                holderEmail: string;
                holderPhone: string;
                ticketNumber: string;
                ticketType: string;
                status: string;
                purchaseDate: number;
                pricePaid: number;
            }, index: number) => {
                const row = [
                    (index + 1).toString(),
                    escapeCSV(attendee.holderName || "Unknown"),
                    escapeCSV(attendee.holderEmail || ""),
                    escapeCSV(attendee.holderPhone || ""),
                    escapeCSV(attendee.ticketNumber || ""),
                    escapeCSV(attendee.ticketType || "Standard"),
                    escapeCSV(attendee.status || "issued"),
                    attendee.purchaseDate ? new Date(attendee.purchaseDate).toISOString().split("T")[0] : "",
                    attendee.pricePaid ? (attendee.pricePaid / 100).toFixed(2) : "0.00",
                ];
                rows.push(row.join(","));
            });

            const csvContent = rows.join("\n");

            // 5. Convert to base64 (browser-compatible, no Node.js Buffer)
            // Use TextEncoder to convert string to bytes, then btoa for base64
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(csvContent);
            const csvBase64 = btoa(String.fromCharCode(...uint8Array));

            return {
                filename: `attendee-list-${event._id.substring(0, 12)}.csv`,
                content: csvBase64,
                contentType: "text/csv",
            };
        } catch (error) {
            console.error("Failed to generate attendee list CSV:", error);
            return null;
        }
    },
});
