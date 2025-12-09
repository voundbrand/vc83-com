import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Id, Doc } from "../_generated/dataModel";
import { formatCurrency, getCurrencySymbol } from "../lib/currencyFormatter";

export type PDFAttachment = {
    filename: string;
    content: string; // base64
    contentType: string;
    downloadUrl?: string; // Permanent URL from API Template.io (optional)
};

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
        return await ctx.runAction(api.pdf.invoicePdf.generateInvoicePDF, {
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
        crmContactId: v.optional(v.id("objects")), // Optional: B2C customer contact
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

            // 2.4. Get organization branding settings from organization_settings table
            const brandingSettingsResult = await ctx.runQuery(
                api.organizationOntology.getOrganizationSettings,
                { organizationId, subtype: "branding" }
            );

            // Extract single object (query returns single object when subtype is provided)
            const brandingSettings = Array.isArray(brandingSettingsResult) ? undefined : brandingSettingsResult;

            // Set initial branding from organization settings or defaults
            let brandPrimaryColor = brandingSettings?.customProperties?.primaryColor as string || "#6B46C1"; // Default purple
            let brandSecondaryColor = brandingSettings?.customProperties?.secondaryColor as string || "#9F7AEA"; // Default light purple
            let brandLogoUrl = brandingSettings?.customProperties?.logo as string || sellerOrg?.customProperties?.logoUrl as string | undefined;

            console.log("🎨 [Invoice Branding] Loaded organization settings:", {
                primaryColor: brandPrimaryColor,
                secondaryColor: brandSecondaryColor,
                hasLogo: !!brandLogoUrl,
                logoUrl: brandLogoUrl
            });

            // Debug: Log contact information
            console.log("📞 [Invoice Contact] Organization contact data:", {
                contactPhone: sellerContact?.customProperties?.contactPhone,
                contactEmail: sellerContact?.customProperties?.contactEmail,
                billingEmail: sellerContact?.customProperties?.billingEmail,
                supportEmail: sellerContact?.customProperties?.supportEmail,
                website: sellerContact?.customProperties?.website,
                faxNumber: sellerContact?.customProperties?.faxNumber,
            });

            // Try domain config first (if available) - can override organization settings
            const domainConfigId = session.customProperties?.domainConfigId as Id<"objects"> | undefined;
            if (domainConfigId) {
                try {
                    const domainConfig = await ctx.runQuery(api.domainConfigOntology.getDomainConfig, {
                        configId: domainConfigId,
                    });

                    if (domainConfig?.customProperties?.branding) {
                        const domainBranding = domainConfig.customProperties.branding as any;
                        brandPrimaryColor = domainBranding.primaryColor || brandPrimaryColor;
                        brandSecondaryColor = domainBranding.secondaryColor || brandSecondaryColor;
                        brandLogoUrl = domainBranding.logoUrl || brandLogoUrl;
                        console.log("🎨 [Invoice Branding] Using domain branding:", {
                            primaryColor: brandPrimaryColor,
                            secondaryColor: brandSecondaryColor,
                            hasLogo: !!brandLogoUrl
                        });
                    }
                } catch (error) {
                    console.warn("⚠️ Could not fetch domain config branding, falling back to organization");
                }
            }

            // Note: Organization branding is now loaded above from organization_settings table
            // Domain config can override if present. No additional fallback needed.

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

            // 2.6. Get buyer CRM contact info (if B2C invoice with customer contact)
            let buyerCrmContact: Doc<"objects"> | null = null;
            if (args.crmContactId) {
                buyerCrmContact = await ctx.runQuery(internal.crmOntology.getContactInternal, {
                    contactId: args.crmContactId,
                }) as Doc<"objects"> | null;
                console.log("📄 [generateInvoicePDF] Found CRM contact for BILL TO:", {
                    contactId: args.crmContactId,
                    contactName: buyerCrmContact?.name,
                    email: buyerCrmContact?.customProperties?.email,
                    phone: buyerCrmContact?.customProperties?.phone,
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
                        productId: group.productId, // Add productId for matching with transaction line items
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
            // NEW: Multi-line transaction structure - read from lineItems[] array
            const subtotal = validItems.reduce((sum, item) => {
                const txn = item.transactionId ? transactionMap.get(item.transactionId) : null;
                if (txn) {
                    const lineItems = txn.customProperties?.lineItems as Array<{
                        productId: string;
                        quantity: number;
                        unitPriceInCents: number;
                    }> | undefined;

                    const lineItem = lineItems?.find(li => li.productId === item.productId);
                    if (lineItem) {
                        return sum + (lineItem.unitPriceInCents * lineItem.quantity);
                    }

                    // LEGACY: Single-line transaction - data directly in customProperties
                    const txnUnitPrice = txn.customProperties?.unitPriceInCents as number | undefined;
                    if (txnUnitPrice !== undefined) {
                        return sum + (txnUnitPrice * item.quantity);
                    }
                }
                return sum;
            }, 0);

            const taxAmount = validItems.reduce((sum, item) => {
                const txn = item.transactionId ? transactionMap.get(item.transactionId) : null;
                if (txn) {
                    const lineItems = txn.customProperties?.lineItems as Array<{
                        productId: string;
                        taxAmountInCents: number;
                    }> | undefined;

                    const lineItem = lineItems?.find(li => li.productId === item.productId);
                    if (lineItem) {
                        return sum + lineItem.taxAmountInCents;
                    }

                    // LEGACY: Single-line transaction
                    const txnTaxAmount = txn.customProperties?.taxAmountInCents as number | undefined;
                    if (txnTaxAmount !== undefined) {
                        return sum + txnTaxAmount;
                    }
                }
                return sum;
            }, 0);

            const total = validItems.reduce((sum, item) => {
                const txn = item.transactionId ? transactionMap.get(item.transactionId) : null;
                if (txn) {
                    const lineItems = txn.customProperties?.lineItems as Array<{
                        productId: string;
                        totalPriceInCents: number;
                    }> | undefined;

                    const lineItem = lineItems?.find(li => li.productId === item.productId);
                    if (lineItem) {
                        return sum + lineItem.totalPriceInCents;
                    }

                    // LEGACY: Single-line transaction
                    const txnTotalPrice = txn.customProperties?.totalPriceInCents as number | undefined;
                    if (txnTotalPrice !== undefined) {
                        return sum + txnTotalPrice;
                    }
                }
                return sum + item.totalPrice;
            }, 0);

            // Currency already fetched from locale settings above (invoiceCurrency)

            // Get tax rate from first transaction's first line item (assumes all items have same rate)
            const firstTransaction = transactions.find((txn: any) => txn !== null);
            const firstLineItems = firstTransaction?.customProperties?.lineItems as Array<{
                taxRatePercent: number;
            }> | undefined;
            let taxRatePercent = firstLineItems?.[0]?.taxRatePercent || 0;

            // Fallback: Calculate tax rate from totals if not found in line items
            if (taxRatePercent === 0 && subtotal > 0 && taxAmount > 0) {
                taxRatePercent = Math.round((taxAmount / subtotal) * 100 * 10) / 10; // Round to 1 decimal
                console.log(`⚠️ [PDF Generation] Tax rate not found in line items, calculated from totals: ${taxRatePercent}%`);
            }

            console.log("📋 [PDF Generation] Calculated Totals:");
            console.log(`  - Subtotal: ${subtotal} cents → ${formatCurrency(subtotal, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() })}`);
            console.log(`  - Tax: ${taxAmount} cents → ${formatCurrency(taxAmount, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() })}`);
            console.log(`  - Total: ${total} cents → ${formatCurrency(total, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() })}`);
            console.log(`  - Tax Rate: ${taxRatePercent}%`);

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
                    // NEW: Multi-line transaction structure - read from lineItems[] array
                    const lineItems = txn.customProperties?.lineItems as Array<{
                        productId: string;
                        quantity: number;
                        unitPriceInCents: number;
                        totalPriceInCents: number;
                        taxAmountInCents: number;
                        taxRatePercent: number;
                    }> | undefined;

                    // Find the line item matching this purchase item
                    const lineItem = lineItems?.find(li => li.productId === item.productId);

                    if (lineItem) {
                        const rate = lineItem.taxRatePercent;
                        const itemSubtotal = lineItem.unitPriceInCents * lineItem.quantity;
                        const itemTax = lineItem.taxAmountInCents;

                        const existing = taxGroupsMap.get(rate) || { rate, subtotal: 0, taxAmount: 0 };
                        taxGroupsMap.set(rate, {
                            rate,
                            subtotal: existing.subtotal + itemSubtotal,
                            taxAmount: existing.taxAmount + itemTax,
                        });
                    }
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
                "l4yercak3.com";

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
                // NEW: Try to get billing address from addresses array first
                let crmBillingAddress: {
                    line1?: string;
                    line2?: string;
                    street?: string;
                    street2?: string;
                    city?: string;
                    state?: string;
                    postalCode?: string;
                    country?: string;
                } | undefined;

                // Check for new addresses array format with type="billing"
                const addresses = buyerCrmOrg.customProperties?.addresses as Array<{
                    type: string;
                    isPrimary: boolean;
                    street?: string;
                    street2?: string;
                    city?: string;
                    state?: string;
                    postalCode?: string;
                    country?: string;
                }> | undefined;

                if (addresses && addresses.length > 0) {
                    // Find primary billing address
                    const billingAddr = addresses.find(addr => addr.type === "billing" && addr.isPrimary)
                        || addresses.find(addr => addr.type === "billing"); // Fallback to any billing address

                    if (billingAddr) {
                        crmBillingAddress = {
                            street: billingAddr.street,
                            street2: billingAddr.street2,
                            city: billingAddr.city,
                            state: billingAddr.state,
                            postalCode: billingAddr.postalCode,
                            country: billingAddr.country,
                        };
                        console.log("📄 [generateInvoicePDF] Using NEW addresses array format (billing address)");
                    } else {
                        // No billing address, try primary mailing address as fallback
                        const mailingAddr = addresses.find(addr => addr.type === "mailing" && addr.isPrimary)
                            || addresses[0]; // Ultimate fallback: first address

                        if (mailingAddr) {
                            crmBillingAddress = {
                                street: mailingAddr.street,
                                street2: mailingAddr.street2,
                                city: mailingAddr.city,
                                state: mailingAddr.state,
                                postalCode: mailingAddr.postalCode,
                                country: mailingAddr.country,
                            };
                            console.log("📄 [generateInvoicePDF] No billing address found, using mailing/primary address as fallback");
                        }
                    }
                } else {
                    // Fallback to old billingAddress format (backward compatibility)
                    crmBillingAddress = buyerCrmOrg.customProperties?.billingAddress as {
                        line1?: string;
                        line2?: string;
                        city?: string;
                        state?: string;
                        postalCode?: string;
                        country?: string;
                    } | undefined;
                    console.log("📄 [generateInvoicePDF] Using OLD billingAddress format (backward compatibility)");
                }

                billTo = {
                    company_name: buyerCrmOrg.name,
                    vat_number: buyerCrmOrg.customProperties?.vatNumber as string | undefined,
                    address: [
                        crmBillingAddress?.line1 || crmBillingAddress?.street,
                        crmBillingAddress?.line2 || crmBillingAddress?.street2
                    ].filter(Boolean).join(", "),
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
                // B2C customer - prefer fresh CRM contact data if available
                let customerName: string;
                let customerEmail: string | undefined;
                let customerPhone: string | undefined;

                if (buyerCrmContact) {
                    // Use fresh CRM contact data
                    customerName = buyerCrmContact.name || "Customer";
                    customerEmail = buyerCrmContact.customProperties?.email as string | undefined;
                    customerPhone = buyerCrmContact.customProperties?.phone as string | undefined;
                    console.log("📄 [generateInvoicePDF] Using fresh CRM contact data for B2C");
                } else {
                    // Fall back to session data (stale)
                    customerName = session.customProperties?.customerName as string | undefined || "Customer";
                    customerEmail = session.customProperties?.customerEmail as string | undefined;
                    customerPhone = session.customProperties?.customerPhone as string | undefined;
                    console.log("📄 [generateInvoicePDF] Using session data for B2C (no CRM contact)");
                }

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
                    // NEW: Multi-line transaction structure - transaction has lineItems[] array
                    const lineItems = txn.customProperties?.lineItems as Array<{
                        productId: string;
                        productName: string;
                        quantity: number;
                        unitPriceInCents: number;
                        totalPriceInCents: number;
                        taxAmountInCents: number;
                        taxRatePercent: number;
                    }> | undefined;

                    // Find the line item matching this purchase item by productId
                    const lineItem = lineItems?.find(li => li.productId === item.productId);

                    if (lineItem) {
                        // Use line item data for accurate amounts (multi-line transactions)
                        return {
                            description: lineItem.productName,
                            quantity: lineItem.quantity,
                            // Pre-formatted currency strings (template will display as-is)
                            unit_price_formatted: formatCurrency(lineItem.unitPriceInCents, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }),
                            tax_amount_formatted: formatCurrency(lineItem.taxAmountInCents, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }),
                            total_price_formatted: formatCurrency(lineItem.totalPriceInCents, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }),
                            tax_rate: lineItem.taxRatePercent,
                        };
                    }

                    // LEGACY: Single-line transaction - data directly in customProperties
                    const txnUnitPrice = txn.customProperties?.unitPriceInCents as number | undefined;
                    const txnTaxAmount = txn.customProperties?.taxAmountInCents as number | undefined;
                    const txnTotalPrice = txn.customProperties?.totalPriceInCents as number | undefined;
                    const txnTaxRate = txn.customProperties?.taxRatePercent as number | undefined;

                    if (txnUnitPrice !== undefined && txnTotalPrice !== undefined) {
                        // Use transaction data for accurate amounts (single-line transactions)
                        console.log(`📄 [generateInvoicePDF] Using legacy transaction format for ${item.productName}`);
                        return {
                            description: item.productName,
                            quantity: item.quantity,
                            // Pre-formatted currency strings (NET price, not GROSS!)
                            unit_price_formatted: formatCurrency(txnUnitPrice, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }),
                            tax_amount_formatted: formatCurrency(txnTaxAmount || 0, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }),
                            total_price_formatted: formatCurrency(txnTotalPrice, { locale: invoiceLocale, currency: invoiceCurrency.toUpperCase() }),
                            tax_rate: txnTaxRate || 0,
                        };
                    }
                }

                // Fallback if no transaction data (shouldn't happen in normal flow)
                const pricePerUnit = Math.round(item.totalPrice / item.quantity);
                console.warn("⚠️ [generateInvoicePDF] No transaction data found for", item.productName, "- using fallback calculation");
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
            // Priority: Organization locale settings → Checkout instance → Default
            let invoiceLanguage = "en"; // Default to English

            // 1. Try organization locale settings first (highest priority)
            if (localeSettings?.customProperties?.language) {
                const orgLanguage = localeSettings.customProperties.language as string;
                invoiceLanguage = orgLanguage.toLowerCase().split("-")[0]; // Normalize "de-DE" → "de"
                console.log(`📄 Using invoice language from organization settings: ${invoiceLanguage}`);
            } else {
                // 2. Fall back to checkout instance
                const checkoutInstanceId = session.customProperties?.checkoutInstanceId as Id<"objects"> | undefined;
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
            }

            // Fetch translations from database
            const { getBackendTranslations } = await import("../helpers/backendTranslationHelper");
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

            // 10. Generate invoice number using organization's prefix (used for both data and filename)
            // Access customProperties for invoice prefix (organization is typed as any for flexibility)
            const orgData = organization as any;
            const invoicePrefix = (orgData?.customProperties?.invoicePrefix as string) || "INV";
            const invoiceNumber = `${invoicePrefix}-${session._id.substring(0, 12)}`;

            // 11. Prepare invoice template data
            const invoiceData = {
                // Organization info (with cascading fallback: organization → contact → default)
                organization_name: businessName,
                organization_address: organizationAddress,
                organization_phone: ((sellerOrg as any)?.customProperties?.phone as string) ||
                    (sellerContact?.customProperties?.contactPhone as string) ||
                    "+49 (0) 123 456 789", // Fallback
                organization_email: ((sellerOrg as any)?.customProperties?.email as string) ||
                    (sellerContact?.customProperties?.contactEmail as string) ||
                    ("info@" + (organization?.slug || "company") + ".com"), // Fallback
                organization_website: (sellerContact?.customProperties?.website as string) || undefined,
                logo_url: brandLogoUrl,
                tax_id: sellerLegal?.customProperties?.taxId as string | undefined,
                vat_number: sellerLegal?.customProperties?.vatNumber as string | undefined,

                // Branding colors (cascading: domain → organization → default)
                brand_primary_color: brandPrimaryColor,
                brand_secondary_color: brandSecondaryColor,
                highlight_color: brandPrimaryColor, // Template uses this variable name

                // Invoice details
                invoice_number: invoiceNumber,
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
            const { generateInvoicePdfFromTemplate } = await import("../lib/generateInvoicePdf");

            const result = await generateInvoicePdfFromTemplate({
                apiKey,
                templateCode,
                filename: invoiceNumber, // Use invoice number as PDF filename
                invoiceData,
            });

            if (result.status === "error") {
                console.error("❌ API Template.io error:", result.error, result.message);
                return null;
            }

            // 13. Download PDF from API Template.io and convert to base64
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
                filename: `${invoiceNumber}.pdf`, // Use clean invoice number as filename
                content: pdfBase64,
                contentType: "application/pdf",
                downloadUrl: result.download_url || undefined, // Include the permanent URL from API Template.io
            };

        } catch (error) {
            console.error("Failed to generate invoice PDF:", error);
            return null;
        }
    },
});
