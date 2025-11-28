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
  const invoiceProps = invoice.customProperties as any;

  console.log(`🔍 [RESOLVER] Starting smart data resolution for invoice ${invoice._id}`);

  // ==========================================================================
  // STEP 1: FETCH TRANSACTION (from invoice's lineItems)
  // ==========================================================================
  let transaction: any = null;

  // NEW: Extract transaction ID from invoice line items
  // Each invoice now references a SINGLE transaction
  const invoiceLineItems = invoiceProps.lineItems as any[] | undefined;
  const transactionId = invoiceLineItems && invoiceLineItems.length > 0 ? invoiceLineItems[0].transactionId : undefined;

  if (transactionId) {
    console.log(`🔍 [RESOLVER] Fetching transaction: ${transactionId}`);
    try {
      transaction = await ctx.runQuery(internal.transactionOntology.getTransactionInternal, {
        transactionId: transactionId as Id<"objects">,
      });

      if (transaction) {
        const txProps = transaction.customProperties as any;
        console.log(`✅ [RESOLVER] Found transaction with currency: ${txProps.currency}`);
        console.log(`   Transaction has lineItems: ${!!txProps.lineItems}`);
        console.log(`   Transaction totals: €${((txProps.totalInCents || 0) / 100).toFixed(2)}`);
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
  const orgSettings = {
    defaultCurrency: organizationCurrency,
    locale: organizationLocale,
    companyName: (organization as any).legalName || organization.name,
    taxId: (organization as any).taxId,
    address: (organization as any).address,
    phone: (organization as any).phone,
    website: (organization as any).website,
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
  let domainProps: any = null;
  let emailSettings: any = null;

  if (options?.domainConfigId) {
    console.log(`🔍 [RESOLVER] Loading domain config: ${options.domainConfigId}`);
    const domainConfig = await ctx.runQuery(api.domainConfigOntology.getDomainConfig, {
      configId: options.domainConfigId,
    });
    domainProps = domainConfig.customProperties as any;
    emailSettings = domainProps.email;
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
  const currency = transaction?.currency || invoiceProps.currency || orgSettings.defaultCurrency;
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
  const lineItems = (invoiceProps.lineItems || []).map((item: any) => ({
    description: item.description,
    productName: item.productName,
    eventName: item.eventName,
    quantity: item.quantity,
    unitPriceInCents: item.unitPriceInCents,
    totalPriceInCents: item.totalPriceInCents,
    taxRatePercent: item.taxRatePercent,
    taxAmountInCents: item.taxAmountInCents,
    // Formatted values
    formattedUnitPrice: formatter.format(item.unitPriceInCents / 100),
    formattedTotal: formatter.format(item.totalPriceInCents / 100),
    formattedTax: formatter.format(item.taxAmountInCents / 100),
  }));

  // ==========================================================================
  // STEP 7: FORMAT TOTALS
  // ==========================================================================
  const subtotalInCents = invoiceProps.subtotalInCents || 0;
  // Support both taxInCents and taxAmountInCents field names for compatibility
  const taxAmountInCents = invoiceProps.taxInCents || invoiceProps.taxAmountInCents || 0;
  const totalInCents = invoiceProps.totalInCents || 0;

  const formattedSubtotal = formatter.format(subtotalInCents / 100);
  const formattedTax = formatter.format(taxAmountInCents / 100);
  const formattedTotal = formatter.format(totalInCents / 100);

  console.log(`✅ [RESOLVER] Formatted totals: ${formattedTotal} (${totalInCents} cents)`);

  // ==========================================================================
  // STEP 8: EXTRACT RECIPIENT INFO (using SAME logic as PDF generation)
  // Match pdfGeneration.ts lines 1213-1279 exactly
  // ==========================================================================
  const billingAddress = invoiceProps.billingAddress || {};
  let recipientName: string;
  let recipientEmail: string;
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
  if (crmOrganizationId && options?.sessionId) {
    // B2B Invoice - load fresh CRM organization
    console.log(`🔍 [RESOLVER] Loading B2B CRM organization: ${crmOrganizationId}`);
    try {
      const buyerCrmOrg = await ctx.runQuery(api.crmOntology.getPublicCrmOrganizationBilling, {
        crmOrganizationId: crmOrganizationId,
      });

      if (buyerCrmOrg) {
        recipientName = buyerCrmOrg.name;
        recipientCompanyName = buyerCrmOrg.name;
        const orgProps = buyerCrmOrg.customProperties as any;
        recipientEmail = orgProps?.billingEmail || orgProps?.primaryEmail || invoiceProps.recipientEmail || "";
        console.log(`✅ [RESOLVER] Using fresh B2B CRM org: ${recipientName}`);
      } else {
        throw new Error("CRM organization not found");
      }
    } catch (error) {
      console.error(`❌ [RESOLVER] Error loading CRM organization, using stale billing address:`, error);
      recipientName = billingAddress.companyName || billingAddress.name || "Company";
      recipientCompanyName = billingAddress.companyName;
      recipientEmail = billingAddress.email || invoiceProps.recipientEmail || "";
    }
  } else if (contactId && options?.sessionId) {
    // B2C Invoice - load fresh CRM contact
    console.log(`🔍 [RESOLVER] Loading B2C CRM contact: ${contactId}`);
    try {
      const buyerCrmContact = await ctx.runQuery(api.crmOntology.getContact, {
        sessionId: options.sessionId,
        contactId: contactId,
      });

      if (buyerCrmContact && buyerCrmContact.type === "crm_contact") {
        const contactProps = buyerCrmContact.customProperties as any;
        const firstName = contactProps?.firstName || "";
        const lastName = contactProps?.lastName || "";

        // Use firstName + lastName if available (preferred), otherwise use contact.name
        recipientName = (firstName || lastName)
          ? `${firstName} ${lastName}`.trim()
          : (buyerCrmContact.name || "Customer");

        recipientEmail = contactProps?.email || billingAddress.email || invoiceProps.recipientEmail || "";
        console.log(`✅ [RESOLVER] Using fresh B2C CRM contact: ${recipientName}`);
      } else {
        throw new Error("CRM contact not found or wrong type");
      }
    } catch (error) {
      console.error(`❌ [RESOLVER] Error loading CRM contact, using stale billing address:`, error);
      recipientName = billingAddress.name ||
                     (billingAddress.firstName && billingAddress.lastName
                       ? `${billingAddress.firstName} ${billingAddress.lastName}`.trim()
                       : billingAddress.firstName || billingAddress.lastName || "Customer");
      recipientEmail = billingAddress.email || invoiceProps.recipientEmail || "";
    }
  } else {
    // No CRM IDs - use stale billing address (this should rarely happen)
    console.log(`⚠️ [RESOLVER] No CRM IDs available, using stale billing address`);
    recipientName = billingAddress.companyName || billingAddress.name ||
                   (billingAddress.firstName && billingAddress.lastName
                     ? `${billingAddress.firstName} ${billingAddress.lastName}`.trim()
                     : billingAddress.firstName || billingAddress.lastName || "Customer");
    recipientCompanyName = billingAddress.companyName;
    recipientEmail = billingAddress.email || invoiceProps.recipientEmail || "";
  }

  // ==========================================================================
  // STEP 9: BUILD SENDER INFO (from org + domain)
  // ==========================================================================
  const sender = {
    name: domainProps.displayName || orgSettings.companyName,
    companyName: orgSettings.companyName,
    email: emailSettings.senderEmail,
    phone: orgSettings.phone,
    website: domainProps.webPublishing?.siteUrl || orgSettings.website,
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
    invoiceNumber: invoiceProps.invoiceNumber || "DRAFT",
    invoiceDate: invoiceProps.invoiceDate || Date.now(),
    dueDate: invoiceProps.dueDate || Date.now() + 30 * 24 * 60 * 60 * 1000,
    status: invoiceProps.status || "draft",
    invoiceType: invoiceProps.invoiceType || "b2b_single",
    isDraft: invoiceProps.isDraft || false,

    // Recipient
    recipient: {
      name: recipientName,
      email: recipientEmail,
      companyName: billingAddress.companyName,
      address: {
        line1: billingAddress.line1,
        line2: billingAddress.line2,
        city: billingAddress.city,
        postalCode: billingAddress.postalCode,
        state: billingAddress.state,
        country: billingAddress.country,
      },
      taxId: billingAddress.taxId,
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
    paymentTerms: invoiceProps.paymentTerms || "net30",
    notes: invoiceProps.notes,

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
