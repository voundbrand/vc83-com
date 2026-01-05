/**
 * SMART INVOICE DATA RESOLVER
 *
 * Intelligently resolves invoice data with proper fallbacks:
 * 1. Fetch transaction (if checkoutSessionId exists)
 * 2. Get organization settings (currency, locale, formatting)
 * 3. Get product settings (optional overrides)
 * 4. Get domain config (optional overrides)
 * 5. Format ALL currency values with proper locale
 * 6. Return fully resolved, formatted, translated data
 *
 * This makes templates truly generic and reusable.
 */

import { ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";
import { Id, Doc } from "./_generated/dataModel";
import type { EmailLanguage } from "../src/templates/emails/types";
import { formatAddressLine, formatAddressBlock } from "./lib/addressFormatter";

/**
 * Fully Resolved Invoice Data
 * All currency values are formatted, all settings are resolved
 */
export interface ResolvedInvoiceData {
  // Invoice identification
  invoiceId: Id<"objects">;
  invoiceNumber: string;
  invoiceDate: number;
  dueDate: number;
  status: string;
  invoiceType: string;
  isDraft: boolean;

  // Recipient information
  recipient: {
    name: string;
    email: string;
    companyName?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      postalCode?: string;
      state?: string;
      country?: string;
    };
    // Formatted address fields (country-aware)
    formattedAddress?: {
      cityPostalLine?: string; // e.g., "12345 Berlin" (DE) or "New York, NY 10001" (US)
      fullAddressLines?: string[]; // Array of formatted address lines
    };
    taxId?: string;
  };

  // Sender information (from organization/domain config)
  sender: {
    name: string;
    companyName: string;
    email: string;
    phone?: string;
    website?: string;
    taxId?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      postalCode?: string;
      state?: string;
      country?: string;
    };
  };

  // Line items with formatted values
  lineItems: Array<{
    description: string;
    productName?: string;
    eventName?: string;
    quantity: number;
    unitPriceInCents: number;
    totalPriceInCents: number;
    taxRatePercent: number;
    taxAmountInCents: number;
    // Formatted strings
    formattedUnitPrice: string;
    formattedTotal: string;
    formattedTax: string;
  }>;

  // Raw totals (in cents)
  subtotalInCents: number;
  taxAmountInCents: number;
  totalInCents: number;

  // Formatted totals (locale-aware)
  formattedSubtotal: string;
  formattedTax: string;
  formattedTotal: string;

  // Currency and locale settings
  currency: string;
  locale: string;
  currencySymbol: string;

  // Payment information
  paymentTerms: string;
  notes?: string;

  // Branding
  branding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string;
  };

  // Language and testing
  language: EmailLanguage;
  isTest: boolean;

  // Optional URLs
  viewInvoiceUrl?: string;
  payNowUrl?: string;
  downloadPdfUrl?: string;

  // Transaction reference (if available)
  transactionId?: Id<"objects">;
  checkoutSessionId?: string;
}

/**
 * Currency Formatter Helper
 * Creates locale-aware currency formatters
 */
function createCurrencyFormatter(locale: string, currency: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  });
}

/**
 * Get Currency Symbol
 * Extracts just the currency symbol (€, $, £, etc.)
 */
function getCurrencySymbol(locale: string, currency: string): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  });

  // Format zero and extract the symbol
  const parts = formatter.formatToParts(0);
  const symbolPart = parts.find(part => part.type === 'currency');
  return symbolPart?.value || currency;
}

/**
 * Resolve Invoice Email Data
 *
 * Main resolver function that fetches and formats all invoice data.
 *
 * @param ctx - Action context
 * @param invoice - Invoice object from database
 * @param language - Email language (de, en, es, fr)
 * @param options - Optional overrides (domainConfigId, etc.)
 * @returns Fully resolved and formatted invoice data
 */
// Type for customProperties access
type InvoiceCustomProps = Record<string, unknown>;
type OrganizationRecord = Record<string, unknown>;

export async function resolveInvoiceEmailData(
  ctx: ActionCtx,
  invoice: Doc<"objects">,
  language: EmailLanguage,
  options?: {
    sessionId?: string;
    domainConfigId?: Id<"objects">;
    isTest?: boolean;
  }
): Promise<ResolvedInvoiceData> {
  const invoiceProps = invoice.customProperties as InvoiceCustomProps;

  console.log(`🔍 [RESOLVER] Starting smart data resolution for invoice ${invoice._id}`);

  // ==========================================================================
  // STEP 1: FETCH TRANSACTION (from invoice's lineItems)
  // ==========================================================================
  let transaction: Doc<"objects"> | null = null;

  // NEW: Extract transaction ID from invoice line items
  // Each invoice now references a SINGLE transaction
  const invoiceLineItems = invoiceProps.lineItems as Array<{ transactionId?: string }> | undefined;
  const transactionId = invoiceLineItems && invoiceLineItems.length > 0 ? invoiceLineItems[0].transactionId : undefined;

  if (transactionId) {
    console.log(`🔍 [RESOLVER] Fetching transaction: ${transactionId}`);
    try {
      transaction = await ctx.runQuery(internal.transactionOntology.getTransactionInternal, {
        transactionId: transactionId as Id<"objects">,
      });

      if (transaction) {
        const txProps = transaction.customProperties as InvoiceCustomProps;
        console.log(`✅ [RESOLVER] Found transaction with currency: ${txProps.currency}`);
        console.log(`   Transaction has lineItems: ${!!txProps.lineItems}`);
        console.log(`   Transaction totals: €${((Number(txProps.totalInCents) || 0) / 100).toFixed(2)}`);
      } else {
        console.log(`⚠️ [RESOLVER] Transaction ${transactionId} not found in database`);
      }
    } catch (error) {
      console.error(`❌ [RESOLVER] Error fetching transaction:`, error);
    }
  } else {
    console.log(`⚠️ [RESOLVER] No transaction ID found in invoice lineItems`);
  }

  // ==========================================================================
  // STEP 2: GET ORGANIZATION SETTINGS
  // ==========================================================================
  console.log(`🔍 [RESOLVER] Loading organization settings for org ${invoice.organizationId}`);

  const organization = await ctx.runQuery(api.organizations.get, {
    id: invoice.organizationId,
  });

  if (!organization) {
    throw new Error(`Organization ${invoice.organizationId} not found`);
  }

  // Fetch organization_settings with subtype "locale" for currency/locale info
  const localeSettingsResult = await ctx.runQuery(api.organizationOntology.getOrganizationSettings, {
    organizationId: invoice.organizationId,
    subtype: "locale",
  });

  // The query returns a single object when subtype is provided
  const localeSettings = Array.isArray(localeSettingsResult) ? localeSettingsResult[0] : localeSettingsResult;

  const organizationCurrency = (localeSettings?.customProperties?.currency as string) || "EUR";
  const organizationLocale = (localeSettings?.customProperties?.locale as string) || (language === "de" ? "de-DE" : language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-US");

  // Extract organization settings with smart defaults
  const orgRecord = organization as OrganizationRecord;
  const orgSettings = {
    defaultCurrency: organizationCurrency,
    locale: organizationLocale,
    companyName: (orgRecord.legalName as string | undefined) || organization.name,
    taxId: orgRecord.taxId as string | undefined,
    address: orgRecord.address as Record<string, unknown> | undefined,
    phone: orgRecord.phone as string | undefined,
    website: orgRecord.website as string | undefined,
  };

  console.log(`✅ [RESOLVER] Organization settings loaded: currency=${orgSettings.defaultCurrency}, locale=${orgSettings.locale}`);

  // ==========================================================================
  // STEP 2.5: GET ORGANIZATION BRANDING SETTINGS
  // ==========================================================================
  console.log(`🔍 [RESOLVER] Loading organization branding settings...`);

  const brandingSettingsResult = await ctx.runQuery(api.organizationOntology.getOrganizationSettings, {
    organizationId: invoice.organizationId,
    subtype: "branding",
  });

  const brandingSettings = Array.isArray(brandingSettingsResult) ? brandingSettingsResult[0] : brandingSettingsResult;

  const organizationBranding = {
    primaryColor: brandingSettings?.customProperties?.primaryColor as string | undefined,
    secondaryColor: brandingSettings?.customProperties?.secondaryColor as string | undefined,
    logoUrl: brandingSettings?.customProperties?.logo as string | undefined,
  };

  console.log(`✅ [RESOLVER] Organization branding loaded:`, {
    primaryColor: organizationBranding.primaryColor || "not set",
    secondaryColor: organizationBranding.secondaryColor || "not set",
    logoUrl: organizationBranding.logoUrl ? "set" : "not set",
  });

  // ==========================================================================
  // STEP 3: GET DOMAIN CONFIG (optional overrides)
  // ==========================================================================
  interface DomainPropsType {
    displayName?: string;
    branding?: {
      logoUrl?: string;
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
    };
    webPublishing?: {
      siteUrl?: string;
    };
    email?: {
      senderEmail?: string;
      replyToEmail?: string;
    };
  }

  let domainProps: DomainPropsType | null = null;
  let emailSettings: { senderEmail?: string; replyToEmail?: string } | null = null;

  if (options?.domainConfigId) {
    console.log(`🔍 [RESOLVER] Loading domain config: ${options.domainConfigId}`);
    const domainConfig = await ctx.runQuery(api.domainConfigOntology.getDomainConfig, {
      configId: options.domainConfigId,
    });
    domainProps = domainConfig.customProperties as DomainPropsType;
    emailSettings = domainProps.email ?? null;
  } else {
    // No domain config - use empty structure to allow cascading to organization settings
    console.log(`🔍 [RESOLVER] No domain config provided, will cascade to organization settings`);
    domainProps = {
      branding: {
        // Leave undefined to cascade to organization → neutral defaults
        logoUrl: undefined,
        primaryColor: undefined,
        secondaryColor: undefined,
        accentColor: undefined,
      },
      webPublishing: {
        siteUrl: "https://l4yercak3.com", // Basic fallback for URLs
      },
    };
    emailSettings = {
      senderEmail: "invoices@mail.l4yercak3.com",
      replyToEmail: "billing@l4yercak3.com",
    };
  }

  // ==========================================================================
  // STEP 4: DETERMINE FINAL CURRENCY (priority: transaction > invoice > org)
  // ==========================================================================
  const transactionProps = transaction?.customProperties as InvoiceCustomProps | undefined;
  const currency = (transactionProps?.currency as string) || (invoiceProps.currency as string) || orgSettings.defaultCurrency;
  const locale = orgSettings.locale;

  console.log(`✅ [RESOLVER] Final currency: ${currency}, locale: ${locale}`);

  // ==========================================================================
  // STEP 5: CREATE CURRENCY FORMATTER
  // ==========================================================================
  const formatter = createCurrencyFormatter(locale, currency);
  const currencySymbol = getCurrencySymbol(locale, currency);

  console.log(`✅ [RESOLVER] Currency formatter created: ${currencySymbol}`);

  // ==========================================================================
  // STEP 6: EXTRACT AND FORMAT LINE ITEMS
  // ==========================================================================
  interface LineItemInput {
    description?: string;
    productName?: string;
    eventName?: string;
    quantity?: number;
    unitPriceInCents?: number;
    totalPriceInCents?: number;
    taxRatePercent?: number;
    taxAmountInCents?: number;
  }

  const rawLineItems = (invoiceProps.lineItems || []) as LineItemInput[];
  const lineItems = rawLineItems.map((item) => ({
    description: item.description || "",
    productName: item.productName,
    eventName: item.eventName,
    quantity: item.quantity || 1,
    unitPriceInCents: item.unitPriceInCents || 0,
    totalPriceInCents: item.totalPriceInCents || 0,
    taxRatePercent: item.taxRatePercent || 0,
    taxAmountInCents: item.taxAmountInCents || 0,
    // Formatted values
    formattedUnitPrice: formatter.format((item.unitPriceInCents || 0) / 100),
    formattedTotal: formatter.format((item.totalPriceInCents || 0) / 100),
    formattedTax: formatter.format((item.taxAmountInCents || 0) / 100),
  }));

  // ==========================================================================
  // STEP 7: FORMAT TOTALS
  // ==========================================================================
  const subtotalInCents = Number(invoiceProps.subtotalInCents) || 0;
  // Support both taxInCents and taxAmountInCents field names for compatibility
  const taxAmountInCents = Number(invoiceProps.taxInCents) || Number(invoiceProps.taxAmountInCents) || 0;
  const totalInCents = Number(invoiceProps.totalInCents) || 0;

  const formattedSubtotal = formatter.format(subtotalInCents / 100);
  const formattedTax = formatter.format(taxAmountInCents / 100);
  const formattedTotal = formatter.format(totalInCents / 100);

  console.log(`✅ [RESOLVER] Formatted totals: ${formattedTotal} (${totalInCents} cents)`);

  // ==========================================================================
  // STEP 8: EXTRACT RECIPIENT INFO (using SAME logic as PDF generation)
  // Match pdfGeneration.ts lines 1213-1279 exactly
  // ==========================================================================
  interface BillingAddressType {
    line1?: string;
    line2?: string;
    city?: string;
    postalCode?: string;
    state?: string;
    country?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    companyName?: string;
    taxId?: string;
  }

  const billingAddress = (invoiceProps.billingAddress || {}) as BillingAddressType;
  let recipientName: string = "";
  let recipientEmail: string = "";
  let recipientCompanyName: string | undefined;

  // Get CRM IDs from invoice
  const crmOrganizationId = invoiceProps.crmOrganizationId as Id<"objects"> | undefined;
  const contactId = invoiceProps.crmContactId as Id<"objects"> | undefined; // NOTE: Field is called crmContactId, not contactId!

  console.log(`🔍 [RESOLVER] CRM IDs check:`, {
    hasCrmOrganizationId: !!crmOrganizationId,
    hasCrmContactId: !!contactId,
    crmOrganizationId: crmOrganizationId || 'none',
    crmContactId: contactId || 'none',
    hasSessionId: !!options?.sessionId,
  });

  // ALWAYS try to load fresh CRM data first (like PDF does), fall back to stale billing address only on error
  // Strategy: Load organization for billing, contact for greeting
  let loadedFromCRM = false;
  let crmBillingAddress: BillingAddressType = {};
  let recipientVatNumber: string | undefined;

  // STEP 1: If B2B invoice (has organization), load organization for billing details
  if (crmOrganizationId && options?.sessionId) {
    console.log(`🔍 [RESOLVER] Loading B2B CRM organization: ${crmOrganizationId}`);
    try {
      const buyerCrmOrg = await ctx.runQuery(api.crmOntology.getPublicCrmOrganizationBilling, {
        crmOrganizationId: crmOrganizationId,
      });

      if (buyerCrmOrg) {
        recipientCompanyName = buyerCrmOrg.name; // Company name for billing section
        const orgProps = buyerCrmOrg.customProperties as Record<string, unknown>;
        recipientEmail = (orgProps?.billingEmail as string) || (orgProps?.primaryEmail as string) || (invoiceProps.recipientEmail as string) || "";
        recipientName = buyerCrmOrg.name; // Temporary fallback, will try to get contact person next
        recipientVatNumber = orgProps?.vatNumber as string | undefined;

        // Extract billing address from CRM organization
        // Priority: billingAddress (explicit) > address (general) > empty
        const orgBillingAddr = (orgProps?.billingAddress || orgProps?.address || {}) as Record<string, unknown>;
        if (orgBillingAddr && (orgBillingAddr.street || orgBillingAddr.city)) {
          crmBillingAddress = {
            line1: orgBillingAddr.street as string | undefined,
            line2: orgBillingAddr.street2 as string | undefined,
            city: orgBillingAddr.city as string | undefined,
            state: orgBillingAddr.state as string | undefined,
            postalCode: orgBillingAddr.postalCode as string | undefined,
            country: orgBillingAddr.country as string | undefined,
            companyName: buyerCrmOrg.name,
            taxId: (orgProps?.vatNumber || orgProps?.taxId) as string | undefined,
          };
          console.log(`✅ [RESOLVER] Extracted billing address from CRM org:`, crmBillingAddress);
        }

        loadedFromCRM = true;
        console.log(`✅ [RESOLVER] Loaded B2B CRM org for billing: ${recipientCompanyName}`);
      }
    } catch (error) {
      console.error(`❌ [RESOLVER] Error loading CRM organization:`, error);
    }
  }

  // STEP 2: Load contact for greeting (works for both B2B and B2C)
  if (contactId && options?.sessionId) {
    console.log(`🔍 [RESOLVER] Loading CRM contact for greeting: ${contactId}`);
    try {
      const buyerCrmContact = await ctx.runQuery(api.crmOntology.getContact, {
        sessionId: options.sessionId,
        contactId: contactId,
      });

      if (buyerCrmContact && buyerCrmContact.type === "crm_contact") {
        const contactProps = buyerCrmContact.customProperties as Record<string, unknown>;
        const firstName = (contactProps?.firstName as string) || "";
        const lastName = (contactProps?.lastName as string) || "";

        // Use firstName + lastName if available (preferred), otherwise use contact.name
        recipientName = (firstName || lastName)
          ? `${firstName} ${lastName}`.trim()
          : (buyerCrmContact.name || recipientName); // Fall back to org name if contact name empty

        // Only override email if we didn't get one from org
        if (!recipientEmail) {
          recipientEmail = (contactProps?.email as string) || billingAddress.email || (invoiceProps.recipientEmail as string) || "";
        }

        // For B2C invoices (no crmOrganizationId), try to get address from contact
        if (!crmOrganizationId && !crmBillingAddress.line1) {
          const contactAddr = (contactProps?.address || contactProps?.billingAddress || {}) as Record<string, unknown>;
          if (contactAddr && (contactAddr.street || contactAddr.city || contactAddr.line1)) {
            crmBillingAddress = {
              line1: (contactAddr.line1 as string) || (contactAddr.street as string),
              line2: (contactAddr.line2 as string) || (contactAddr.street2 as string),
              city: contactAddr.city as string | undefined,
              state: contactAddr.state as string | undefined,
              postalCode: contactAddr.postalCode as string | undefined,
              country: contactAddr.country as string | undefined,
            };
            console.log(`✅ [RESOLVER] Extracted billing address from CRM contact:`, crmBillingAddress);
          }
        }

        loadedFromCRM = true;
        console.log(`✅ [RESOLVER] Using CRM contact for greeting: ${recipientName}`);
      }
    } catch (error) {
      console.error(`❌ [RESOLVER] Error loading CRM contact:`, error);
    }
  }

  // STEP 3: Fallback to stale billing address if CRM loading failed
  if (!loadedFromCRM) {
    console.log(`⚠️ [RESOLVER] No CRM data loaded, using stale billing address`);
    recipientName = billingAddress.companyName || billingAddress.name ||
                   (billingAddress.firstName && billingAddress.lastName
                     ? `${billingAddress.firstName} ${billingAddress.lastName}`.trim()
                     : billingAddress.firstName || billingAddress.lastName || "Customer");
    recipientCompanyName = billingAddress.companyName;
    recipientEmail = billingAddress.email || (invoiceProps.recipientEmail as string) || "";
  }

  // Use CRM address if available, otherwise fall back to stale billing address
  const finalBillingAddress = crmBillingAddress.line1 || crmBillingAddress.city
    ? crmBillingAddress
    : billingAddress;

  // Format address according to country conventions
  // Use recipient's country (billing address country) to determine format
  // German/EU format: postal code BEFORE city (e.g., "12345 Berlin")
  // US/UK format: city BEFORE postal code (e.g., "New York, NY 10001")
  const formattedCityPostal = formatAddressLine(finalBillingAddress);
  const formattedAddressLines = formatAddressBlock(finalBillingAddress, {
    includeCountry: false, // Country shown separately
  });

  // ==========================================================================
  // STEP 9: BUILD SENDER INFO (from org + domain)
  // ==========================================================================
  const sender = {
    name: domainProps?.displayName || orgSettings.companyName,
    companyName: orgSettings.companyName,
    email: emailSettings?.senderEmail || "invoices@mail.l4yercak3.com",
    phone: orgSettings.phone,
    website: domainProps?.webPublishing?.siteUrl || orgSettings.website,
    taxId: orgSettings.taxId,
    address: orgSettings.address,
  };

  // ==========================================================================
  // STEP 10: RETURN FULLY RESOLVED DATA
  // ==========================================================================
  console.log(`✅ [RESOLVER] Invoice data fully resolved and formatted`);

  // Extract checkout session ID from invoice props
  const checkoutSessionId = invoiceProps.checkoutSessionId as string | undefined;

  return {
    // Invoice identification
    invoiceId: invoice._id,
    invoiceNumber: (invoiceProps.invoiceNumber as string) || "DRAFT",
    invoiceDate: (invoiceProps.invoiceDate as number) || Date.now(),
    dueDate: (invoiceProps.dueDate as number) || Date.now() + 30 * 24 * 60 * 60 * 1000,
    status: (invoiceProps.status as string) || "draft",
    invoiceType: (invoiceProps.invoiceType as string) || "b2b_single",
    isDraft: (invoiceProps.isDraft as boolean) || false,

    // Recipient (uses CRM address if available, falls back to stale billing address)
    recipient: {
      name: recipientName,
      email: recipientEmail,
      companyName: recipientCompanyName || finalBillingAddress.companyName,
      address: {
        line1: finalBillingAddress.line1,
        line2: finalBillingAddress.line2,
        city: finalBillingAddress.city,
        postalCode: finalBillingAddress.postalCode,
        state: finalBillingAddress.state,
        country: finalBillingAddress.country,
      },
      // Formatted address (country-aware: postal code before city for DE/EU)
      formattedAddress: {
        cityPostalLine: formattedCityPostal,
        fullAddressLines: formattedAddressLines,
      },
      taxId: recipientVatNumber || finalBillingAddress.taxId,
    },

    // Sender
    sender,

    // Line items (formatted)
    lineItems,

    // Raw totals
    subtotalInCents,
    taxAmountInCents,
    totalInCents,

    // Formatted totals
    formattedSubtotal,
    formattedTax,
    formattedTotal,

    // Currency and locale
    currency,
    locale,
    currencySymbol,

    // Payment
    paymentTerms: (invoiceProps.paymentTerms as string) || "net30",
    notes: invoiceProps.notes as string | undefined,

    // Branding (cascade: domain → organization → neutral defaults)
    // Using neutral colors (white/gray) as final fallbacks instead of brand-specific gold
    branding: {
      primaryColor: domainProps.branding?.primaryColor || organizationBranding.primaryColor || "#ffffff",
      secondaryColor: domainProps.branding?.secondaryColor || organizationBranding.secondaryColor || "#1f2937",
      accentColor: domainProps.branding?.accentColor || "#f3f4f6",
      logoUrl: domainProps.branding?.logoUrl || organizationBranding.logoUrl || undefined,
    },

    // Language and testing
    language,
    isTest: options?.isTest || false,

    // Transaction reference
    transactionId: transaction?._id,
    checkoutSessionId,
  };
}
