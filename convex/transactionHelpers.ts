/**
 * TRANSACTION CREATION HELPERS
 *
 * Shared utilities for creating transactions across all payment providers.
 * ALWAYS call these after creating tickets/items to ensure transactions are recorded.
 *
 * Key Features:
 * - Universal transaction creation for ANY payment method
 * - Fetches COMPLETE context: product, event, seller, branding, buyer
 * - Transaction is SINGLE SOURCE OF TRUTH for invoices, tickets, emails
 * - Handles B2B (organization payer) and B2C (individual payer)
 * - Links transactions to tickets for easy reference
 *
 * Usage Pattern:
 * 1. Payment provider processes payment and creates tickets
 * 2. Payment provider calls createTransactionsForPurchase()
 * 3. Transactions are created with COMPLETE context (event, seller, branding, etc.)
 * 4. Transactions are linked to tickets
 * 5. PDF/email generation reads from transaction ONLY (no link chasing)
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("./_generated/api");
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { proxyMapUrl, proxyStorageUrl } from "./lib/emailUrlHelpers";
import type {
  CheckoutSessionObject,
  CrmOrganizationObject,
  DomainConfigObject,
  EventObject,
  OrganizationSettingsObject,
  ProductObject,
  TicketObject,
} from "./types/ontology";

/**
 * CREATE TRANSACTIONS FOR PURCHASE
 *
 * Universal transaction creator for any payment method.
 * Call this after creating tickets/items in ANY payment provider.
 *
 * This function:
 * - Fetches product details for each item
 * - Fetches event details if product is a ticket
 * - Determines transaction subtype (ticket/product/service)
 * - Creates transaction with complete context
 * - Handles both B2B and B2C transactions
 *
 * @param ctx - Action context
 * @param params - Purchase details
 * @returns Array of created transaction IDs
 *
 * @example
 * ```typescript
 * // After creating tickets in Stripe provider:
 * const transactionIds = await createTransactionsForPurchase(ctx, {
 *   organizationId: args.organizationId,
 *   checkoutSessionId: args.checkoutSessionId,
 *   purchasedItems: ticketIds.map((ticketId, i) => ({
 *     ticketId,
 *     productId: selectedProducts[i].productId,
 *     quantity: 1,
 *     pricePerUnit: selectedProducts[i].priceInCents,
 *     totalPrice: selectedProducts[i].priceInCents,
 *   })),
 *   customerInfo: {
 *     name: customerName,
 *     email: customerEmail,
 *     phone: customerPhone,
 *   },
 *   paymentInfo: {
 *     method: "stripe",
 *     status: "paid",
 *     intentId: paymentIntent.id,
 *   },
 * });
 * ```
 */
export async function createTransactionsForPurchase(
  ctx: ActionCtx,
  params: {
    organizationId: Id<"organizations">;
    checkoutSessionId: Id<"objects">;
    purchasedItems: Array<{
      ticketId?: Id<"objects">;
      productId: Id<"objects">;
      quantity: number;
      pricePerUnit: number;
      totalPrice: number;
    }>;
    customerInfo: {
      name: string;
      email: string;
      phone?: string;
    };
    paymentInfo: {
      method: "stripe" | "invoice" | "paypal" | "free";
      status: "paid" | "pending" | "awaiting_employer_payment";
      intentId?: string; // Stripe payment intent or "invoice"
    };
    billingInfo?: {
      crmOrganizationId?: Id<"objects">;
      employerId?: string;
      employerName?: string;
    };
    // Tax information from checkout session (from Stripe Tax or manual calculation)
    taxInfo?: {
      taxRatePercent: number;
      currency: string;
      // Tax behavior: "inclusive" means prices already include tax, "exclusive" means tax is added on top
      taxBehavior?: "inclusive" | "exclusive";
    };
  }
): Promise<Id<"objects">[]> {
  console.log(`📝 [createTransactionsForPurchase] Creating transaction for checkout with ${params.purchasedItems.length} items`);
  console.log(`   Payment Method: ${params.paymentInfo.method}`);
  console.log(`   Payment Status: ${params.paymentInfo.status}`);
  console.log(`   Customer: ${params.customerInfo.name} (${params.customerInfo.email})`);

  // ========================================================================
  // 1. LOAD CHECKOUT SESSION for additional context
  // ========================================================================
  const session = await (ctx as any).runQuery(
    generatedApi.internal.checkoutSessionOntology.getCheckoutSessionInternal,
    { checkoutSessionId: params.checkoutSessionId }
  ) as unknown as CheckoutSessionObject | null;

  const sessionProps = session?.customProperties || {};
  const language = (sessionProps.defaultLanguage as string) || "en";
  const domainConfigId = sessionProps.domainConfigId as Id<"objects"> | undefined;
  const checkoutInstanceId = sessionProps.checkoutInstanceId as Id<"objects"> | undefined;

  console.log(`   Language: ${language}, DomainConfig: ${domainConfigId || "none"}`);

  // ========================================================================
  // 2. LOAD SELLER ORGANIZATION INFO (for invoices/receipts)
  // ========================================================================
  const organization = await (ctx as any).runQuery(
    generatedApi.internal.checkoutSessions.getOrganizationInternal,
    { organizationId: params.organizationId }
  ) as { name?: string; businessName?: string } | null;

  // Load organization contact settings (using internal query to avoid deep type instantiation)
  const contactSettings = await (ctx as any).runQuery(
    generatedApi.internal.organizationOntology.getOrganizationSettingsInternal,
    { organizationId: params.organizationId, subtype: "contact" }
  ) as unknown as OrganizationSettingsObject | null;
  const contactProps = contactSettings?.customProperties || {};

  // Load organization invoicing settings (for VAT number)
  const invoicingSettings = await (ctx as any).runQuery(
    generatedApi.internal.organizationOntology.getOrganizationSettingsInternal,
    { organizationId: params.organizationId, subtype: "invoicing" }
  ) as unknown as OrganizationSettingsObject | null;
  const invoicingProps = invoicingSettings?.customProperties || {};

  // Load primary address
  const primaryAddress = await (ctx as any).runQuery(
    generatedApi.internal.organizationOntology.getPrimaryAddressInternal,
    { organizationId: params.organizationId }
  ) as unknown as OrganizationSettingsObject | null;
  const addressProps = primaryAddress?.customProperties || {};

  const seller = {
    organizationId: params.organizationId,
    name: organization?.name || organization?.businessName || "Unknown Organization",
    address: addressProps.line1 as string | undefined,
    city: addressProps.city as string | undefined,
    state: addressProps.state as string | undefined,
    postalCode: addressProps.postalCode as string | undefined,
    country: addressProps.country as string | undefined,
    phone: contactProps.phone as string | undefined,
    email: contactProps.email as string | undefined,
    website: contactProps.website as string | undefined,
    vatNumber: invoicingProps.vatNumber as string | undefined,
    taxId: invoicingProps.taxId as string | undefined,
  };

  console.log(`   Seller: ${seller.name} (VAT: ${seller.vatNumber || "none"})`);

  // ========================================================================
  // 3. LOAD BRANDING (domain -> organization -> default)
  // ========================================================================
  const branding = {
    logoUrl: undefined as string | undefined,
    primaryColor: "#6B46C1" as string,
    secondaryColor: undefined as string | undefined,
  };
  // Site URL for proxying images/links in emails (improves deliverability)
  let siteUrl: string | undefined;

  // Try domain branding first
  if (domainConfigId) {
    try {
      const domainConfig = await (ctx as any).runQuery(generatedApi.internal.domainConfigOntology.getDomainConfigInternal, {
        configId: domainConfigId,
      }) as unknown as DomainConfigObject | null;
      if (domainConfig?.customProperties?.branding) {
        const domainBranding = domainConfig.customProperties.branding as Record<string, unknown>;
        branding.logoUrl = domainBranding.logoUrl as string | undefined;
        branding.primaryColor = (domainBranding.primaryColor as string) || branding.primaryColor;
        branding.secondaryColor = domainBranding.secondaryColor as string | undefined;
        console.log(`   Branding: from domain config`);
      }
      // Get siteUrl for proxying images/links
      if (domainConfig?.customProperties?.webPublishing) {
        const webPub = domainConfig.customProperties.webPublishing as Record<string, unknown>;
        siteUrl = webPub.siteUrl as string | undefined;
      }
    } catch {
      console.warn(`   Could not load domain config branding`);
    }
  }

  // Fall back to organization branding
  if (!branding.logoUrl) {
    const brandingSettings = await (ctx as any).runQuery(generatedApi.internal.organizationOntology.getOrganizationSettingsInternal, {
      organizationId: params.organizationId,
      subtype: "branding",
    }) as unknown as OrganizationSettingsObject | null;
    const brandingProps = brandingSettings?.customProperties || {};

    branding.logoUrl = (brandingProps.logo as string) || (brandingProps.logoUrl as string) || undefined;
    branding.primaryColor = (brandingProps.primaryColor as string) || branding.primaryColor;
    branding.secondaryColor = (brandingProps.secondaryColor as string) || branding.secondaryColor;
    console.log(`   Branding: from organization settings (logo: ${branding.logoUrl ? "yes" : "no"})`);
  }

  // Fall back to system domain config for siteUrl if not set
  // This ensures proxied URLs are generated even when checkout doesn't have a domainConfigId
  if (!siteUrl) {
    try {
      const systemDomainConfigs = await (ctx as any).runQuery(generatedApi.internal.domainConfigOntology.listDomainConfigsForOrg, {
        organizationId: params.organizationId,
      }) as unknown as DomainConfigObject[] | null;
      const activeDomainConfig = systemDomainConfigs?.find((c) => c.status === "active") || null;
      if (activeDomainConfig?.customProperties?.webPublishing) {
        const webPub = activeDomainConfig.customProperties.webPublishing as Record<string, unknown>;
        siteUrl = webPub.siteUrl as string | undefined;
        console.log(`   SiteUrl: from organization domain config (${siteUrl})`);
      }
    } catch {
      // Ignore - will use default
    }
  }

  // Final fallback to hardcoded system URL
  if (!siteUrl) {
    siteUrl = "https://app.l4yercak3.com";
    console.log(`   SiteUrl: using system default (${siteUrl})`);
  }

  // Proxy logo URL through sending domain for better email deliverability
  // (Image URLs matching the sending domain have lower spam scores)
  if (branding.logoUrl && siteUrl) {
    branding.logoUrl = proxyStorageUrl(branding.logoUrl, siteUrl) || branding.logoUrl;
  }

  // ========================================================================
  // 4. LOAD BUYER INFO (for B2B invoices)
  // ========================================================================
  let buyer: {
    companyName?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    vatNumber?: string;
    contactName?: string;
    contactEmail?: string;
  } | undefined;

  if (params.billingInfo?.crmOrganizationId) {
    // Load CRM organization for B2B billing
    const crmOrg = await (ctx as any).runQuery(generatedApi.internal.crmOntology.getCrmOrganizationInternal, {
      organizationId: params.billingInfo.crmOrganizationId,
    }) as unknown as CrmOrganizationObject | null;

    if (crmOrg) {
      const crmProps = crmOrg.customProperties || {};
      buyer = {
        companyName: crmOrg.name || params.billingInfo.employerName,
        address: (crmProps.billingAddress as { line1?: string })?.line1 || sessionProps.billingLine1 as string,
        city: (crmProps.billingAddress as { city?: string })?.city || sessionProps.billingCity as string,
        state: (crmProps.billingAddress as { state?: string })?.state || sessionProps.billingState as string,
        postalCode: (crmProps.billingAddress as { postalCode?: string })?.postalCode || sessionProps.billingPostalCode as string,
        country: (crmProps.billingAddress as { country?: string })?.country || sessionProps.billingCountry as string,
        vatNumber: crmProps.vatNumber as string | undefined,
        contactName: crmProps.billingContact as string | undefined,
        contactEmail: crmProps.billingEmail as string | undefined,
      };
      console.log(`   Buyer (B2B): ${buyer.companyName}`);
    }
  } else if (sessionProps.companyName) {
    // B2B from session (no CRM org yet)
    buyer = {
      companyName: sessionProps.companyName as string,
      address: sessionProps.billingLine1 as string,
      city: sessionProps.billingCity as string,
      state: sessionProps.billingState as string,
      postalCode: sessionProps.billingPostalCode as string,
      country: sessionProps.billingCountry as string,
      vatNumber: sessionProps.vatNumber as string | undefined,
      contactName: sessionProps.customerName as string | undefined,
      contactEmail: sessionProps.customerEmail as string | undefined,
    };
    console.log(`   Buyer (B2B from session): ${buyer.companyName}`);
  }

  // ========================================================================
  // 5. BUILD LINE ITEMS with full event data
  // ========================================================================
  // Track event data at top level (for single-event checkouts)
  let topLevelEvent: {
    eventId?: Id<"objects">;
    eventName?: string;
    eventLocation?: string;
    eventFormattedAddress?: string;
    eventGoogleMapsUrl?: string;
    eventAppleMapsUrl?: string;
    eventStartDate?: number;
    eventEndDate?: number;
    eventTimezone?: string;
    eventSponsors?: Array<{ name: string; level?: string; logoUrl?: string }>;
  } = {};

  const lineItems = await Promise.all(
    params.purchasedItems.map(async (item) => {
      // 5.1. Fetch product details
      const product = await (ctx as any).runQuery(generatedApi.internal.productOntology.getProductInternal, {
        productId: item.productId,
      }) as unknown as ProductObject | null;

      if (!product) {
        console.error(`❌ [createTransactionsForPurchase] Product ${item.productId} not found, skipping`);
        return null;
      }

      console.log(`   Product: ${product.name} (${product.subtype}) - Qty: ${item.quantity}`);
      const productName = product.name || "Unknown Product";

      // 5.2. Fetch FULL event details if product is a ticket
      let eventId: Id<"objects"> | undefined;
      let eventName: string | undefined;
      let eventLocation: string | undefined;
      let eventFormattedAddress: string | undefined;
      let eventGoogleMapsUrl: string | undefined;
      let eventAppleMapsUrl: string | undefined;
      let eventStartDate: number | undefined;
      let eventEndDate: number | undefined;
      let eventTimezone: string | undefined;
      let eventSponsors: Array<{ name: string; level?: string; logoUrl?: string }> | undefined;

      if (product.subtype === "ticket" && product.customProperties?.eventId) {
        const eventIdFromProduct = product.customProperties.eventId as Id<"objects">;
        const event = await (ctx as any).runQuery(generatedApi.internal.eventOntology.getEventInternal, {
          eventId: eventIdFromProduct,
        }) as unknown as EventObject | null;

        if (event && event.type === "event") {
          const eventProps = event.customProperties || {};
          eventId = event._id;
          eventName = event.name;
          eventLocation = eventProps.location as string | undefined;
          eventFormattedAddress = eventProps.formattedAddress as string | undefined;
          // Generate map URLs - use proxied URLs if siteUrl is available (better email deliverability)
          const latitude = eventProps.latitude as number | undefined;
          const longitude = eventProps.longitude as number | undefined;
          if (latitude && longitude && siteUrl) {
            // Proxied URLs match sending domain, reducing spam score
            eventGoogleMapsUrl = proxyMapUrl("google", latitude, longitude, siteUrl);
            eventAppleMapsUrl = proxyMapUrl("apple", latitude, longitude, siteUrl);
          } else if (latitude && longitude) {
            // Fallback to direct URLs if no siteUrl
            eventGoogleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
            eventAppleMapsUrl = `https://maps.apple.com/?daddr=${latitude},${longitude}`;
          } else {
            // Use stored URL from event if available
            eventGoogleMapsUrl = eventProps.googleMapsUrl as string | undefined;
          }
          eventStartDate = eventProps.startDate as number | undefined;
          eventEndDate = eventProps.endDate as number | undefined;
          eventTimezone = eventProps.timezone as string | undefined;

          console.log(`   Event: ${eventName} at ${eventFormattedAddress || eventLocation}`);

          // 5.3. Fetch event sponsors
          const sponsorLinks = await (ctx as any).runQuery(generatedApi.internal.objectLinksInternal.getLinksFromObject, {
            fromObjectId: event._id,
            linkType: "sponsored_by",
          });

      if (sponsorLinks && sponsorLinks.length > 0) {
        const sponsors = await Promise.all(
          sponsorLinks.map(async (link: { toObjectId: Id<"objects">; properties?: Record<string, unknown> }) => {
            const sponsor = await (ctx as any).runQuery(generatedApi.internal.crmOntology.getCrmOrganizationInternal, {
              organizationId: link.toObjectId,
            }) as unknown as CrmOrganizationObject | null;
            if (sponsor && sponsor.type === "crm_organization") {
              return {
                name: sponsor.name || "Unnamed Sponsor",
                level: link.properties?.sponsorLevel as string | undefined,
                logoUrl: sponsor.customProperties?.logoUrl as string | undefined,
              };
            }
            return null;
          })
        );
        eventSponsors = sponsors.filter((s) => s && s.name) as Array<{ name: string; level?: string; logoUrl?: string }>;
        console.log(`   Sponsors: ${eventSponsors!.length} found`);
      }

          // Store for top-level (first event wins)
          if (!topLevelEvent.eventId) {
            topLevelEvent = {
              eventId,
              eventName,
              eventLocation,
              eventFormattedAddress,
              eventGoogleMapsUrl,
              eventAppleMapsUrl,
              eventStartDate,
              eventEndDate,
              eventTimezone,
              eventSponsors,
            };
          }
        }
      }

      // 5.4. Get ticket/attendee data if ticket exists
      let attendeeName: string | undefined;
      let attendeeEmail: string | undefined;
      let ticketNumber: string | undefined;

      if (item.ticketId) {
        const ticket = await (ctx as any).runQuery(generatedApi.internal.ticketOntology.getTicketInternal, {
          ticketId: item.ticketId,
        }) as unknown as TicketObject | null;
        if (ticket) {
          const ticketProps = ticket.customProperties || {};
          attendeeName = ticketProps.attendeeName as string | undefined;
          attendeeEmail = ticketProps.attendeeEmail as string | undefined;
          ticketNumber = ticketProps.ticketHash as string | undefined;
        }
      }

      // 5.5. Calculate tax for this line item
      const taxRatePercent = params.taxInfo?.taxRatePercent || 19;
      const productTaxBehavior = product.customProperties?.taxBehavior as "inclusive" | "exclusive" | "automatic" | undefined;
      const orgTaxBehavior = params.taxInfo?.taxBehavior || "inclusive";
      const taxBehavior = productTaxBehavior || orgTaxBehavior;

      let unitPriceInCents: number;
      let totalPriceInCents: number;
      let taxAmountInCents: number;

      if (taxBehavior === "inclusive") {
        totalPriceInCents = item.totalPrice;
        taxAmountInCents = Math.round((item.totalPrice * taxRatePercent) / (100 + taxRatePercent));
        unitPriceInCents = Math.round((item.pricePerUnit * 100) / (100 + taxRatePercent));
      } else {
        taxAmountInCents = Math.round((item.totalPrice * taxRatePercent) / 100);
        totalPriceInCents = item.totalPrice + taxAmountInCents;
        unitPriceInCents = item.pricePerUnit;
      }

      // 5.6. Build complete line item
      return {
        // Product
        productId: product._id,
        productName,
        productDescription: product.description,
        productSubtype: product.subtype,
        quantity: item.quantity,
        // Pricing
        unitPriceInCents,
        totalPriceInCents,
        taxRatePercent,
        taxAmountInCents,
        taxBehavior,
        // Ticket
        ticketId: item.ticketId,
        attendeeName,
        attendeeEmail,
        ticketNumber,
        // Event (full data)
        eventId,
        eventName,
        eventLocation,
        eventFormattedAddress,
        eventGoogleMapsUrl,
        eventAppleMapsUrl,
        eventStartDate,
        eventEndDate,
        eventTimezone,
      };
    })
  );

  // Filter out any null items
  const validLineItems = lineItems.filter((item): item is NonNullable<typeof item> => item !== null);

  if (validLineItems.length === 0) {
    console.error(`❌ [createTransactionsForPurchase] No valid products found, cannot create transaction`);
    return [];
  }

  // ========================================================================
  // 6. CALCULATE AGGREGATE TOTALS
  // ========================================================================
  const subtotalInCents = validLineItems.reduce((sum, item) => sum + (item.unitPriceInCents * item.quantity), 0);
  const taxAmountInCents = validLineItems.reduce((sum, item) => sum + item.taxAmountInCents, 0);
  const totalInCents = subtotalInCents + taxAmountInCents;

  console.log(`💰 Transaction Totals:`);
  console.log(`   Subtotal: €${(subtotalInCents / 100).toFixed(2)}`);
  console.log(`   Tax (${params.taxInfo?.taxRatePercent || 19}%): €${(taxAmountInCents / 100).toFixed(2)}`);
  console.log(`   Total: €${(totalInCents / 100).toFixed(2)}`);

  // ========================================================================
  // 7. DETERMINE TRANSACTION SUBTYPE
  // ========================================================================
  const primaryProduct = validLineItems[0];
  let subtype: "ticket_purchase" | "product_purchase" | "service_purchase" = "product_purchase";
  if (primaryProduct.productSubtype === "ticket") {
    subtype = "ticket_purchase";
  } else if (primaryProduct.productSubtype === "service") {
    subtype = "service_purchase";
  }

  // ========================================================================
  // 8. EXTRACT FORM RESPONSES (if any)
  // ========================================================================
  const formResponses = sessionProps.formResponses as Array<{
    productId: Id<"objects">;
    ticketNumber: number;
    formId?: string;
    responses: Record<string, unknown>;
    addedCosts: number;
  }> | undefined;

  // ========================================================================
  // 9. DETERMINE PAYER INFO
  // ========================================================================
  const payerType = params.billingInfo?.crmOrganizationId ? "organization" : "individual";
  const payerId = params.billingInfo?.crmOrganizationId;

  if (payerType === "organization") {
    console.log(`   Payer: ${params.billingInfo?.employerName} (B2B)`);
  } else {
    console.log(`   Payer: ${params.customerInfo.name} (B2C)`);
  }

  // ========================================================================
  // 10. CREATE TRANSACTION WITH COMPLETE SNAPSHOT
  // ========================================================================
  const transactionId = await (ctx as any).runMutation(
    generatedApi.internal.transactionOntology.createTransactionInternal,
    {
      organizationId: params.organizationId,
      subtype,

      // Line items (with full event data per item)
      lineItems: validLineItems,

      // Aggregate totals
      subtotalInCents,
      taxAmountInCents,
      totalInCents,

      // Top-level event data (for single-event checkouts)
      eventId: topLevelEvent.eventId,
      eventName: topLevelEvent.eventName,
      eventLocation: topLevelEvent.eventLocation,
      eventStartDate: topLevelEvent.eventStartDate,
      eventEndDate: topLevelEvent.eventEndDate,
      eventSponsors: topLevelEvent.eventSponsors,

      // Links
      checkoutSessionId: params.checkoutSessionId,

      // Customer info
      customerName: params.customerInfo.name,
      customerEmail: params.customerInfo.email,
      customerPhone: params.customerInfo.phone,

      // Payer info (B2B vs B2C)
      payerType,
      payerId,
      crmOrganizationId: params.billingInfo?.crmOrganizationId,
      employerId: params.billingInfo?.employerId,
      employerName: params.billingInfo?.employerName,

      // Currency and payment
      currency: params.taxInfo?.currency || "EUR",
      paymentMethod: params.paymentInfo.method,
      paymentStatus: params.paymentInfo.status,
      paymentIntentId: params.paymentInfo.intentId,
    }
  );

  // Double-write to strict transaction table (Phase 3 decoupling)
  const strictTransactionId = await (ctx as any).runMutation(
    generatedApi.internal.transactionOntologyStrict.createTransactionStrict,
    {
      organizationId: params.organizationId,
      legacyTransactionId: transactionId,
      legacySubtype: subtype,
      checkoutSessionId: params.checkoutSessionId,
      lineItems: validLineItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPriceInCents: item.unitPriceInCents,
        totalPriceInCents: item.totalPriceInCents,
        taxAmountInCents: item.taxAmountInCents,
        taxRatePercent: item.taxRatePercent,
        ticketId: item.ticketId,
        eventId: item.eventId,
        eventName: item.eventName,
      })),
      subtotalInCents,
      taxAmountInCents,
      totalInCents,
      currency: params.taxInfo?.currency || "EUR",
      paymentMethod: params.paymentInfo.method,
      paymentStatus: params.paymentInfo.status,
      payerType,
      payerId,
      customerName: params.customerInfo.name,
      customerEmail: params.customerInfo.email,
      customerPhone: params.customerInfo.phone,
      language,
      domainConfigId,
    }
  );

  // ========================================================================
  // 11. UPDATE TRANSACTION WITH ADDITIONAL CONTEXT (via customProperties)
  // ========================================================================
  // The createTransactionInternal has a fixed schema, so we add extra data via patch
  await (ctx as any).runMutation(generatedApi.internal.transactionOntology.updateTransactionCustomProperties, {
    transactionId,
    customProperties: {
      // Seller (complete snapshot)
      seller,

      // Branding (snapshot at time of purchase)
      branding,

      // Buyer (for B2B)
      buyer,

      // Extended event data
      eventFormattedAddress: topLevelEvent.eventFormattedAddress,
      eventGoogleMapsUrl: topLevelEvent.eventGoogleMapsUrl,
      eventAppleMapsUrl: topLevelEvent.eventAppleMapsUrl,
      eventTimezone: topLevelEvent.eventTimezone,
      eventSponsors: topLevelEvent.eventSponsors,
      eventStartDate: topLevelEvent.eventStartDate,
      eventEndDate: topLevelEvent.eventEndDate,

      // Metadata
      language,
      domainConfigId,
      checkoutInstanceId,

      // Form responses
      formResponses,
    },
  });

  // Double-write ticket links into strict table (Phase 3)
  await Promise.all(
    validLineItems
      .filter((item) => item.ticketId)
      .map((item) =>
        (ctx as any).runMutation(generatedApi.internal.transactionOntologyStrict.createTicketStrict, {
          organizationId: params.organizationId,
          legacyTicketId: item.ticketId as Id<"objects">,
          transactionId,
          strictTransactionId,
          productId: item.productId,
          attendeeName: item.attendeeName,
          attendeeEmail: item.attendeeEmail,
          ticketNumber: item.ticketNumber,
          eventId: item.eventId,
          eventName: item.eventName,
        })
      )
  );

  console.log(`✅ [createTransactionsForPurchase] Created transaction ${transactionId} with complete snapshot`);
  console.log(`   - Seller: ${seller.name}`);
  console.log(`   - Branding: logo=${branding.logoUrl ? "yes" : "no"}, color=${branding.primaryColor}`);
  console.log(`   - Buyer: ${buyer?.companyName || "individual"}`);
  console.log(`   - Event: ${topLevelEvent.eventName || "none"}`);
  console.log(`   - Language: ${language}`);

  return [transactionId];
}

/**
 * LINK TRANSACTIONS TO TICKETS
 *
 * Update tickets with their transaction IDs for easy reference.
 * Creates bidirectional link between tickets and transactions.
 *
 * This allows:
 * - Finding transaction from ticket (ticket.customProperties.transactionId)
 * - Finding ticket from transaction (transaction.ticketId)
 *
 * @param ctx - Action context
 * @param links - Array of ticket-transaction pairs
 *
 * @example
 * ```typescript
 * await linkTransactionsToTickets(ctx,
 *   ticketIds.map((ticketId, i) => ({
 *     ticketId,
 *     transactionId: transactionIds[i],
 *   }))
 * );
 * ```
 */
export async function linkTransactionsToTickets(
  ctx: ActionCtx,
  links: Array<{
    ticketId: Id<"objects">;
    transactionId: Id<"objects">;
  }>
): Promise<void> {
  console.log(`🔗 [linkTransactionsToTickets] Linking ${links.length} transactions to tickets`);

  for (const link of links) {
    // Get the ticket to update its customProperties
    const ticket = await (ctx as any).runQuery(generatedApi.internal.ticketOntology.getTicketInternal, {
      ticketId: link.ticketId,
    }) as unknown as TicketObject | null;

    if (!ticket) {
      console.error(`❌ [linkTransactionsToTickets] Ticket ${link.ticketId} not found, skipping link`);
      continue;
    }

    // Update ticket with transaction ID
    await (ctx as any).runMutation(generatedApi.internal.ticketOntology.updateTicketInternal, {
      ticketId: link.ticketId,
      customProperties: {
        ...ticket.customProperties,
        transactionId: link.transactionId,
      },
    });

    console.log(`   ✓ Linked transaction ${link.transactionId} to ticket ${link.ticketId}`);
  }

  console.log(`✅ [linkTransactionsToTickets] Successfully linked all transactions to tickets`);
}
