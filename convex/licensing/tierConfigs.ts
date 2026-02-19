/**
 * PLATFORM TIER CONFIGURATIONS
 *
 * Defines all limits and feature flags for each pricing tier.
 * Based on: .kiro/platform_pricing_v2/LICENSING-ENFORCEMENT-MATRIX.md
 *
 * Tiers:
 * - Free: €0 - Lead capture, template users
 * - Starter: €199/month - Solo operators, single project
 * - Professional: €399/month - Growing businesses, teams
 * - Agency: €599/month + €79/sub-org - Multi-client operators
 * - Enterprise: €1,500+/month - White-label resellers, compliance
 */

/**
 * TYPESCRIPT TYPES
 */

export interface TierLimits {
  // Core Platform
  maxUsers: number;
  maxApiKeys: number;
  maxSubOrganizations: number;
  maxCustomDomains: number;

  // System Templates (Freelancer Portal, etc.)
  maxSystemTemplates: number;

  // CRM
  maxContacts: number;
  maxOrganizations: number;
  maxPipelines: number;
  maxEmailsPerMonth: number;

  // Projects
  maxProjects: number;
  maxMilestonesPerProject: number;
  maxTasksPerProject: number;

  // Events
  maxEvents: number;
  maxAttendeesPerEvent: number;
  maxSponsorsPerEvent: number;

  // Products
  maxProducts: number;
  maxAddonsPerProduct: number;

  // Checkout
  maxCheckoutInstances: number;

  // Invoicing
  maxInvoicesPerMonth: number;

  // Forms
  maxForms: number;
  maxResponsesPerForm: number;

  // Web Publishing
  maxPages: number;

  // Builder Apps (v0-generated deployable apps)
  maxBuilderApps: number;

  // Workflows
  maxWorkflows: number;
  maxBehaviorsPerWorkflow: number;

  // Sequences (Multi-channel automation)
  maxSequences: number;
  maxStepsPerSequence: number;
  maxMessageTemplates: number;

  // Templates
  maxCustomTemplates: number;

  // Media Library
  totalStorageGB: number;
  maxFileUploadMB: number;
  perUserStorageGB: number;

  // Certificates
  maxCertificates: number;

  // API & OAuth
  maxWebsitesPerKey: number;
  maxCustomOAuthApps: number; // Custom apps (user's website, mobile app, etc.)
  maxThirdPartyIntegrations: number; // Zapier, Make.com, n8n, etc.
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  maxWebhooks: number;

  // Audit
  auditLogRetentionDays: number;

  // Benefits Platform
  maxBenefits: number;
  maxCommissions: number;
  maxBenefitClaimsPerMonth: number;
  maxCommissionPayoutsPerMonth: number;

  // Bookings
  maxLocations: number;
  maxBookableResources: number;
  maxBookingsPerMonth: number;
  maxRecurringSeriesLength: number;
  maxResourcesPerBooking: number;

  // Credits
  monthlyCredits: number;
  dailyCreditsOnLogin: number;
}

export interface TierFeatures {
  // Core
  badgeRequired: boolean;
  subOrgsEnabled: boolean;
  customDomainsEnabled: boolean;
  whiteLabelEnabled: boolean;
  whiteLabelLevel: "none" | "badge_removal" | "full" | "full_with_api_domain";

  // CRM
  crmEnabled: boolean;
  contactImportExportEnabled: boolean;
  contactSyncEnabled: boolean;
  bulkEmailEnabled: boolean;

  // Projects
  projectsEnabled: boolean;
  budgetTrackingEnabled: boolean;
  advancedReportsEnabled: boolean;

  // Events
  eventsEnabled: boolean;
  mediaGalleryEnabled: boolean;
  eventAnalyticsEnabled: boolean;

  // Products
  productsEnabled: boolean;
  inventoryTrackingEnabled: boolean;
  b2bInvoicingEnabled: boolean;
  templateSetOverridesEnabled: boolean;

  // Checkout
  checkoutEnabled: boolean;
  stripeConnectEnabled: boolean;
  invoicePaymentEnabled: boolean;
  manualPaymentEnabled: boolean;
  customBrandingEnabled: boolean;
  multiLanguageEnabled: boolean;
  stripeTaxEnabled: boolean;

  // Invoicing
  invoicingEnabled: boolean;
  consolidatedInvoicingEnabled: boolean;
  multiCurrencyEnabled: boolean;
  automatedGenerationEnabled: boolean;
  emailDeliveryEnabled: boolean;
  customTemplatesEnabled: boolean;

  // Forms
  formsEnabled: boolean;
  multiStepFormsEnabled: boolean;
  conditionalLogicEnabled: boolean;
  fileUploadsEnabled: boolean;
  formAnalyticsEnabled: boolean;

  // Web Publishing
  webPublishingEnabled: boolean;
  seoToolsEnabled: boolean;
  contentRulesEnabled: boolean;
  pageAnalyticsEnabled: boolean;
  vercelDeploymentEnabled: boolean;

  // Workflows
  workflowsEnabled: boolean;
  workflowTemplatesEnabled: boolean;
  advancedConditionsEnabled: boolean;
  testModeEnabled: boolean;

  // Templates
  templatesEnabled: boolean;
  templateSetsEnabled: boolean;
  templateVersioningEnabled: boolean;
  advancedEditorEnabled: boolean;
  templateSharingEnabled: boolean;

  // Certificates
  certificatesEnabled: boolean;

  // Media
  folderOrganizationEnabled: boolean;
  cloudIntegrationEnabled: boolean;

  // Certificates
  customCertificateTemplatesEnabled: boolean;
  automatedCertificateDeliveryEnabled: boolean;
  qrCodeEnabled: boolean;

  // Translations
  customTranslationsEnabled: boolean;
  autoTranslationEnabled: boolean;

  // Organization
  rbacEnabled: boolean;
  customRolesEnabled: boolean;
  ssoEnabled: boolean;

  // API & OAuth
  apiKeysEnabled: boolean;
  oauthEnabled: boolean;
  apiWebhooksEnabled: boolean;
  deploymentIntegrationsEnabled: boolean; // GitHub + Vercel for deployment (separate from platform integrations)

  // AI
  aiEnabled: boolean;
  aiByokEnabled: boolean;

  // Compliance
  gdprToolsEnabled: boolean;
  cookieConsentEnabled: boolean;
  privacyPolicyGeneratorEnabled: boolean;
  termsGeneratorEnabled: boolean;
  dataExportEnabled: boolean;
  dataDeleteRequestsEnabled: boolean;

  // Audit
  detailedLogsEnabled: boolean;
  auditLogExportEnabled: boolean;

  // Benefits Platform
  benefitsEnabled: boolean;
  commissionsEnabled: boolean;
  cryptoPayoutsEnabled: boolean;
  benefitsAnalyticsEnabled: boolean;

  // Bookings
  bookingsEnabled: boolean;
  recurringBookingsEnabled: boolean;
  multiResourceBookingsEnabled: boolean;
  depositPaymentsEnabled: boolean;
  bookingRemindersEnabled: boolean;
  bufferTimeEnabled: boolean;
  multiLocationEnabled: boolean;

  // Sequences (Multi-channel automation)
  sequencesEnabled: boolean;
}

export interface TierConfig {
  name: string;
  description: string;
  priceInCents: number;
  currency: string;
  limits: TierLimits;
  features: TierFeatures;
  supportLevel: "docs" | "email_48h" | "email_24h" | "priority_12h" | "dedicated";
}

/**
 * TIER CONFIGURATIONS
 */

// -1 means unlimited
const UNLIMITED = -1;

export const FREE_TIER: TierConfig = {
  name: "Free",
  description: "€0 - Lead capture, template users",
  priceInCents: 0,
  currency: "EUR",
  supportLevel: "docs",

  limits: {
    // Core Platform
    maxUsers: 1,
    maxApiKeys: 1,
    maxSubOrganizations: 0,
    maxCustomDomains: 1, // For connecting external Freelancer Portal website

    // System Templates (Free users get 1 for Freelancer Portal)
    maxSystemTemplates: 1,

    // CRM
    maxContacts: 100,
    maxOrganizations: 10,
    maxPipelines: 1,
    maxEmailsPerMonth: 0,

    // Projects
    maxProjects: 3,
    maxMilestonesPerProject: 5,
    maxTasksPerProject: 10,

    // Events
    maxEvents: 3,
    maxAttendeesPerEvent: 25,
    maxSponsorsPerEvent: 0,

    // Products
    maxProducts: 5,
    maxAddonsPerProduct: 2,

    // Checkout
    maxCheckoutInstances: 1,

    // Invoicing
    maxInvoicesPerMonth: 10,

    // Forms
    maxForms: 3,
    maxResponsesPerForm: 50,

    // Web Publishing
    maxPages: 1,

    // Builder Apps
    maxBuilderApps: 1,

    // Workflows
    maxWorkflows: 2,
    maxBehaviorsPerWorkflow: 5,

    // Sequences
    maxSequences: 0,
    maxStepsPerSequence: 0,
    maxMessageTemplates: 0,

    // Templates
    maxCustomTemplates: 0,

    // Media Library
    totalStorageGB: 0.25,
    maxFileUploadMB: 10,
    perUserStorageGB: 0.25,

    // Certificates
    maxCertificates: 10,

    // API & OAuth
    maxWebsitesPerKey: 1,
    maxCustomOAuthApps: 0, // No custom OAuth apps on Free tier
    maxThirdPartyIntegrations: 0, // No platform integrations (Microsoft, Google, Slack, Zapier, Make)
    rateLimitPerMinute: 30,
    rateLimitPerDay: 1000,
    maxWebhooks: 0,

    // Audit
    auditLogRetentionDays: 7,

    // Benefits Platform
    maxBenefits: 0,
    maxCommissions: 0,
    maxBenefitClaimsPerMonth: 0,
    maxCommissionPayoutsPerMonth: 0,

    // Bookings
    maxLocations: 1,
    maxBookableResources: 3,
    maxBookingsPerMonth: 20,
    maxRecurringSeriesLength: 0, // No recurring on Free
    maxResourcesPerBooking: 1,

    // Credits
    monthlyCredits: 0,
    dailyCreditsOnLogin: 5,
  },

  features: {
    // Core
    badgeRequired: true,
    subOrgsEnabled: false,
    customDomainsEnabled: true, // For connecting external Freelancer Portal website
    whiteLabelEnabled: false,
    whiteLabelLevel: "none",

    // CRM
    crmEnabled: false,
    contactImportExportEnabled: false,
    contactSyncEnabled: false,
    bulkEmailEnabled: false,

    // Projects
    projectsEnabled: false,
    budgetTrackingEnabled: false,
    advancedReportsEnabled: false,

    // Events
    eventsEnabled: false,
    mediaGalleryEnabled: false,
    eventAnalyticsEnabled: false,

    // Products
    productsEnabled: false,
    inventoryTrackingEnabled: false,
    b2bInvoicingEnabled: false,
    templateSetOverridesEnabled: false,

    // Checkout
    checkoutEnabled: false,
    stripeConnectEnabled: false,
    invoicePaymentEnabled: false,
    manualPaymentEnabled: false,
    customBrandingEnabled: false,
    multiLanguageEnabled: false,
    stripeTaxEnabled: false,

    // Invoicing
    invoicingEnabled: false,
    consolidatedInvoicingEnabled: false,
    multiCurrencyEnabled: false,
    automatedGenerationEnabled: false,
    emailDeliveryEnabled: false,
    customTemplatesEnabled: false,

    // Forms
    formsEnabled: false,
    multiStepFormsEnabled: false,
    conditionalLogicEnabled: false,
    fileUploadsEnabled: false,
    formAnalyticsEnabled: false,

    // Web Publishing
    webPublishingEnabled: false,
    seoToolsEnabled: false,
    contentRulesEnabled: false,
    pageAnalyticsEnabled: false,
    vercelDeploymentEnabled: true, // Free tier can deploy to Vercel

    // Workflows
    workflowsEnabled: false,
    workflowTemplatesEnabled: false,
    advancedConditionsEnabled: false,
    testModeEnabled: false,

    // Templates (enabled for Free to allow system template access)
    templatesEnabled: false,
    templateSetsEnabled: true,
    templateVersioningEnabled: false,
    advancedEditorEnabled: false,
    templateSharingEnabled: false,

    // Certificates
    certificatesEnabled: false,

    // Media
    folderOrganizationEnabled: false,
    cloudIntegrationEnabled: false,

    // Certificates (sub-features)
    customCertificateTemplatesEnabled: false,
    automatedCertificateDeliveryEnabled: false,
    qrCodeEnabled: false,

    // Translations
    customTranslationsEnabled: false,
    autoTranslationEnabled: false,

    // Organization
    rbacEnabled: false,
    customRolesEnabled: false,
    ssoEnabled: false,

    // API & OAuth
    apiKeysEnabled: true,
    oauthEnabled: true,
    apiWebhooksEnabled: false,
    deploymentIntegrationsEnabled: true, // GitHub + Vercel for deployment (Free tier)

    // AI
    aiEnabled: false,
    aiByokEnabled: false,

    // Compliance
    gdprToolsEnabled: true,
    cookieConsentEnabled: false,
    privacyPolicyGeneratorEnabled: false,
    termsGeneratorEnabled: false,
    dataExportEnabled: false,
    dataDeleteRequestsEnabled: false,

    // Audit
    detailedLogsEnabled: false,
    auditLogExportEnabled: false,

    // Benefits Platform
    benefitsEnabled: false,
    commissionsEnabled: false,
    cryptoPayoutsEnabled: false,
    benefitsAnalyticsEnabled: false,

    // Bookings
    bookingsEnabled: true,
    recurringBookingsEnabled: false,
    multiResourceBookingsEnabled: false,
    depositPaymentsEnabled: false,
    bookingRemindersEnabled: false,
    bufferTimeEnabled: false,
    multiLocationEnabled: false,

    // Sequences
    sequencesEnabled: false,
  },
};

export const PRO_TIER: TierConfig = {
  name: "Pro",
  description: "€29/month - Freelancers and small businesses",
  priceInCents: 2900,
  currency: "EUR",
  supportLevel: "email_48h",

  limits: {
    // Core Platform
    maxUsers: 3,
    maxApiKeys: 1,
    maxSubOrganizations: 0,
    maxCustomDomains: 0,

    // System Templates (unlimited for paid tiers)
    maxSystemTemplates: -1,

    // CRM
    maxContacts: 2000,
    maxOrganizations: 50,
    maxPipelines: 3,
    maxEmailsPerMonth: 500,

    // Projects
    maxProjects: 20,
    maxMilestonesPerProject: 20,
    maxTasksPerProject: 50,

    // Events
    maxEvents: 20,
    maxAttendeesPerEvent: 100,
    maxSponsorsPerEvent: 5,

    // Products
    maxProducts: 50,
    maxAddonsPerProduct: 5,

    // Checkout
    maxCheckoutInstances: 5,

    // Invoicing
    maxInvoicesPerMonth: 100,

    // Forms
    maxForms: 20,
    maxResponsesPerForm: 500,

    // Web Publishing
    maxPages: 5,

    // Builder Apps
    maxBuilderApps: 5,

    // Workflows
    maxWorkflows: 10,
    maxBehaviorsPerWorkflow: 20,

    // Sequences
    maxSequences: 10,
    maxStepsPerSequence: 10,
    maxMessageTemplates: 20,

    // Templates
    maxCustomTemplates: 10,

    // Media Library
    totalStorageGB: 5,
    maxFileUploadMB: 50,
    perUserStorageGB: 1,

    // Certificates
    maxCertificates: 200,

    // API & OAuth
    maxWebsitesPerKey: 1,
    maxCustomOAuthApps: 2,
    maxThirdPartyIntegrations: 5,
    rateLimitPerMinute: 60,
    rateLimitPerDay: 5000,
    maxWebhooks: 5,

    // Audit
    auditLogRetentionDays: 30,

    // Benefits Platform
    maxBenefits: 10,
    maxCommissions: 5,
    maxBenefitClaimsPerMonth: 50,
    maxCommissionPayoutsPerMonth: 10,

    // Bookings
    maxLocations: 3,
    maxBookableResources: 20,
    maxBookingsPerMonth: 200,
    maxRecurringSeriesLength: 12, // 12 weeks
    maxResourcesPerBooking: 3,

    // Credits
    monthlyCredits: 200,
    dailyCreditsOnLogin: 5,
  },

  features: {
    // Core
    badgeRequired: false,
    subOrgsEnabled: false,
    customDomainsEnabled: false,
    whiteLabelEnabled: false,
    whiteLabelLevel: "none",

    // CRM
    crmEnabled: true,
    contactImportExportEnabled: true,
    contactSyncEnabled: false,
    bulkEmailEnabled: true,

    // Projects
    projectsEnabled: true,
    budgetTrackingEnabled: true,
    advancedReportsEnabled: false,

    // Events
    eventsEnabled: true,
    mediaGalleryEnabled: true,
    eventAnalyticsEnabled: false,

    // Products
    productsEnabled: true,
    inventoryTrackingEnabled: true,
    b2bInvoicingEnabled: true,
    templateSetOverridesEnabled: false,

    // Checkout
    checkoutEnabled: true,
    stripeConnectEnabled: true,
    invoicePaymentEnabled: true,
    manualPaymentEnabled: true,
    customBrandingEnabled: false,
    multiLanguageEnabled: true,
    stripeTaxEnabled: true,

    // Invoicing
    invoicingEnabled: true,
    consolidatedInvoicingEnabled: true,
    multiCurrencyEnabled: true,
    automatedGenerationEnabled: true,
    emailDeliveryEnabled: true,
    customTemplatesEnabled: false,

    // Forms
    formsEnabled: true,
    multiStepFormsEnabled: true,
    conditionalLogicEnabled: true,
    fileUploadsEnabled: true,
    formAnalyticsEnabled: false,

    // Web Publishing
    webPublishingEnabled: true,
    seoToolsEnabled: false,
    contentRulesEnabled: false,
    pageAnalyticsEnabled: false,
    vercelDeploymentEnabled: true,

    // Workflows
    workflowsEnabled: true,
    workflowTemplatesEnabled: true,
    advancedConditionsEnabled: true,
    testModeEnabled: true,

    // Templates
    templatesEnabled: true,
    templateSetsEnabled: true,
    templateVersioningEnabled: false,
    advancedEditorEnabled: true,
    templateSharingEnabled: false,

    // Certificates
    certificatesEnabled: true,

    // Media
    folderOrganizationEnabled: true,
    cloudIntegrationEnabled: false,

    // Certificates (sub-features)
    customCertificateTemplatesEnabled: true,
    automatedCertificateDeliveryEnabled: true,
    qrCodeEnabled: true,

    // Translations
    customTranslationsEnabled: true,
    autoTranslationEnabled: false,

    // Organization
    rbacEnabled: true,
    customRolesEnabled: false,
    ssoEnabled: false,

    // API & OAuth
    apiKeysEnabled: true,
    oauthEnabled: true,
    apiWebhooksEnabled: true,
    deploymentIntegrationsEnabled: true,

    // AI
    aiEnabled: true,
    aiByokEnabled: true,

    // Compliance
    gdprToolsEnabled: true,
    cookieConsentEnabled: true,
    privacyPolicyGeneratorEnabled: true,
    termsGeneratorEnabled: true,
    dataExportEnabled: true,
    dataDeleteRequestsEnabled: true,

    // Audit
    detailedLogsEnabled: true,
    auditLogExportEnabled: false,

    // Benefits Platform
    benefitsEnabled: true,
    commissionsEnabled: true,
    cryptoPayoutsEnabled: false,
    benefitsAnalyticsEnabled: false,

    // Bookings
    bookingsEnabled: true,
    recurringBookingsEnabled: true,
    multiResourceBookingsEnabled: true,
    depositPaymentsEnabled: true,
    bookingRemindersEnabled: true,
    bufferTimeEnabled: true,
    multiLocationEnabled: false,

    // Sequences
    sequencesEnabled: true,
  },
};

// Legacy tier - kept for backward compatibility with existing subscriptions
// New subscriptions should use PRO_TIER instead
export const STARTER_TIER: TierConfig = {
  name: "Starter",
  description: "€199/month - Solo operators, single project (Legacy)",
  priceInCents: 19900,
  currency: "EUR",
  supportLevel: "email_48h",

  limits: {
    // Core Platform
    maxUsers: 3,
    maxApiKeys: 1,
    maxSubOrganizations: 0,
    maxCustomDomains: 0,

    // System Templates (unlimited for paid tiers)
    maxSystemTemplates: -1,

    // CRM
    maxContacts: 1000,
    maxOrganizations: 50,
    maxPipelines: 3,
    maxEmailsPerMonth: 500,

    // Projects
    maxProjects: 20,
    maxMilestonesPerProject: 20,
    maxTasksPerProject: 50,

    // Events
    maxEvents: 20,
    maxAttendeesPerEvent: 100,
    maxSponsorsPerEvent: 5,

    // Products
    maxProducts: 50,
    maxAddonsPerProduct: 5,

    // Checkout
    maxCheckoutInstances: 5,

    // Invoicing
    maxInvoicesPerMonth: 100,

    // Forms
    maxForms: 20,
    maxResponsesPerForm: 500,

    // Web Publishing
    maxPages: 5,

    // Builder Apps
    maxBuilderApps: 5,

    // Workflows
    maxWorkflows: 10,
    maxBehaviorsPerWorkflow: 20,

    // Sequences
    maxSequences: 10,
    maxStepsPerSequence: 10,
    maxMessageTemplates: 20,

    // Templates
    maxCustomTemplates: 10,

    // Media Library
    totalStorageGB: 5,
    maxFileUploadMB: 50,
    perUserStorageGB: 1,

    // Certificates
    maxCertificates: 200,

    // API & OAuth
    maxWebsitesPerKey: 1,
    maxCustomOAuthApps: 2,
    maxThirdPartyIntegrations: 5,
    rateLimitPerMinute: 60,
    rateLimitPerDay: 5000,
    maxWebhooks: 5,

    // Audit
    auditLogRetentionDays: 30,

    // Benefits Platform
    maxBenefits: 10,
    maxCommissions: 5,
    maxBenefitClaimsPerMonth: 50,
    maxCommissionPayoutsPerMonth: 10,

    // Bookings
    maxLocations: 3,
    maxBookableResources: 20,
    maxBookingsPerMonth: 200,
    maxRecurringSeriesLength: 12, // 12 weeks
    maxResourcesPerBooking: 3,

    // Credits
    monthlyCredits: 100,
    dailyCreditsOnLogin: 5,
  },

  features: {
    // Core
    badgeRequired: false,
    subOrgsEnabled: false,
    customDomainsEnabled: false,
    whiteLabelEnabled: false,
    whiteLabelLevel: "none",

    // CRM
    crmEnabled: true,
    contactImportExportEnabled: true,
    contactSyncEnabled: false,
    bulkEmailEnabled: true,

    // Projects
    projectsEnabled: true,
    budgetTrackingEnabled: true,
    advancedReportsEnabled: false,

    // Events
    eventsEnabled: true,
    mediaGalleryEnabled: true,
    eventAnalyticsEnabled: false,

    // Products
    productsEnabled: true,
    inventoryTrackingEnabled: true,
    b2bInvoicingEnabled: true,
    templateSetOverridesEnabled: false,

    // Checkout
    checkoutEnabled: true,
    stripeConnectEnabled: true,
    invoicePaymentEnabled: true,
    manualPaymentEnabled: true,
    customBrandingEnabled: false,
    multiLanguageEnabled: true,
    stripeTaxEnabled: true,

    // Invoicing
    invoicingEnabled: true,
    consolidatedInvoicingEnabled: true,
    multiCurrencyEnabled: true,
    automatedGenerationEnabled: true,
    emailDeliveryEnabled: true,
    customTemplatesEnabled: false,

    // Forms
    formsEnabled: true,
    multiStepFormsEnabled: true,
    conditionalLogicEnabled: true,
    fileUploadsEnabled: true,
    formAnalyticsEnabled: false,

    // Web Publishing
    webPublishingEnabled: true,
    seoToolsEnabled: false,
    contentRulesEnabled: false,
    pageAnalyticsEnabled: false,
    vercelDeploymentEnabled: true,

    // Workflows
    workflowsEnabled: true,
    workflowTemplatesEnabled: true,
    advancedConditionsEnabled: true,
    testModeEnabled: true,

    // Templates
    templatesEnabled: true,
    templateSetsEnabled: true,
    templateVersioningEnabled: false,
    advancedEditorEnabled: true,
    templateSharingEnabled: false,

    // Certificates
    certificatesEnabled: true,

    // Media
    folderOrganizationEnabled: true,
    cloudIntegrationEnabled: false,

    // Certificates (sub-features)
    customCertificateTemplatesEnabled: true,
    automatedCertificateDeliveryEnabled: true,
    qrCodeEnabled: true,

    // Translations
    customTranslationsEnabled: true,
    autoTranslationEnabled: false,

    // Organization
    rbacEnabled: true,
    customRolesEnabled: false,
    ssoEnabled: false,

    // API & OAuth
    apiKeysEnabled: true,
    oauthEnabled: true,
    apiWebhooksEnabled: true,
    deploymentIntegrationsEnabled: true, // GitHub + Vercel for deployment

    // AI
    aiEnabled: true,
    aiByokEnabled: true,

    // Compliance
    gdprToolsEnabled: true,
    cookieConsentEnabled: true,
    privacyPolicyGeneratorEnabled: true,
    termsGeneratorEnabled: true,
    dataExportEnabled: true,
    dataDeleteRequestsEnabled: true,

    // Audit
    detailedLogsEnabled: true,
    auditLogExportEnabled: false,

    // Benefits Platform
    benefitsEnabled: true,
    commissionsEnabled: true,
    cryptoPayoutsEnabled: false,
    benefitsAnalyticsEnabled: false,

    // Bookings
    bookingsEnabled: true,
    recurringBookingsEnabled: true,
    multiResourceBookingsEnabled: true,
    depositPaymentsEnabled: true,
    bookingRemindersEnabled: true,
    bufferTimeEnabled: true,
    multiLocationEnabled: false,

    // Sequences
    sequencesEnabled: true,
  },
};

export const PROFESSIONAL_TIER: TierConfig = {
  name: "Professional",
  description: "€399/month - Growing businesses, teams",
  priceInCents: 39900,
  currency: "EUR",
  supportLevel: "email_24h",

  limits: {
    // Core Platform
    maxUsers: 10,
    maxApiKeys: 3,
    maxSubOrganizations: 0,
    maxCustomDomains: 1,

    // System Templates (unlimited for paid tiers)
    maxSystemTemplates: -1,

    // CRM
    maxContacts: 5000,
    maxOrganizations: 200,
    maxPipelines: 10,
    maxEmailsPerMonth: 2500,

    // Projects
    maxProjects: UNLIMITED,
    maxMilestonesPerProject: 50,
    maxTasksPerProject: 200,

    // Events
    maxEvents: 100,
    maxAttendeesPerEvent: 500,
    maxSponsorsPerEvent: 20,

    // Products
    maxProducts: 200,
    maxAddonsPerProduct: 20,

    // Checkout
    maxCheckoutInstances: 20,

    // Invoicing
    maxInvoicesPerMonth: 500,

    // Forms
    maxForms: 100,
    maxResponsesPerForm: 5000,

    // Web Publishing
    maxPages: 25,

    // Builder Apps
    maxBuilderApps: 25,

    // Workflows
    maxWorkflows: 50,
    maxBehaviorsPerWorkflow: 50,

    // Sequences
    maxSequences: 50,
    maxStepsPerSequence: 20,
    maxMessageTemplates: 100,

    // Templates
    maxCustomTemplates: 50,

    // Media Library
    totalStorageGB: 25,
    maxFileUploadMB: 100,
    perUserStorageGB: 2.5,

    // Certificates
    maxCertificates: 2000,

    // API & OAuth
    maxWebsitesPerKey: 3,
    maxCustomOAuthApps: 3,
    maxThirdPartyIntegrations: UNLIMITED,
    rateLimitPerMinute: 120,
    rateLimitPerDay: 25000,
    maxWebhooks: 20,

    // Audit
    auditLogRetentionDays: 90,

    // Benefits Platform
    maxBenefits: 50,
    maxCommissions: 25,
    maxBenefitClaimsPerMonth: 250,
    maxCommissionPayoutsPerMonth: 50,

    // Bookings
    maxLocations: 10,
    maxBookableResources: 100,
    maxBookingsPerMonth: 1000,
    maxRecurringSeriesLength: 52, // 52 weeks (1 year)
    maxResourcesPerBooking: 10,

    // Credits
    monthlyCredits: 500,
    dailyCreditsOnLogin: 5,
  },

  features: {
    // Core
    badgeRequired: false,
    subOrgsEnabled: false,
    customDomainsEnabled: true,
    whiteLabelEnabled: true,
    whiteLabelLevel: "badge_removal",

    // CRM
    crmEnabled: true,
    contactImportExportEnabled: true,
    contactSyncEnabled: true,
    bulkEmailEnabled: true,

    // Projects
    projectsEnabled: true,
    budgetTrackingEnabled: true,
    advancedReportsEnabled: true,

    // Events
    eventsEnabled: true,
    mediaGalleryEnabled: true,
    eventAnalyticsEnabled: true,

    // Products
    productsEnabled: true,
    inventoryTrackingEnabled: true,
    b2bInvoicingEnabled: true,
    templateSetOverridesEnabled: true,

    // Checkout
    checkoutEnabled: true,
    stripeConnectEnabled: true,
    invoicePaymentEnabled: true,
    manualPaymentEnabled: true,
    customBrandingEnabled: true,
    multiLanguageEnabled: true,
    stripeTaxEnabled: true,

    // Invoicing
    invoicingEnabled: true,
    consolidatedInvoicingEnabled: true,
    multiCurrencyEnabled: true,
    automatedGenerationEnabled: true,
    emailDeliveryEnabled: true,
    customTemplatesEnabled: false,

    // Forms
    formsEnabled: true,
    multiStepFormsEnabled: true,
    conditionalLogicEnabled: true,
    fileUploadsEnabled: true,
    formAnalyticsEnabled: true,

    // Web Publishing
    webPublishingEnabled: true,
    seoToolsEnabled: true,
    contentRulesEnabled: true,
    pageAnalyticsEnabled: true,
    vercelDeploymentEnabled: true,

    // Workflows
    workflowsEnabled: true,
    workflowTemplatesEnabled: true,
    advancedConditionsEnabled: true,
    testModeEnabled: true,

    // Templates
    templatesEnabled: true,
    templateSetsEnabled: true,
    templateVersioningEnabled: true,
    advancedEditorEnabled: true,
    templateSharingEnabled: false,

    // Certificates
    certificatesEnabled: true,

    // Media
    folderOrganizationEnabled: true,
    cloudIntegrationEnabled: true,

    // Certificates (sub-features)
    customCertificateTemplatesEnabled: true,
    automatedCertificateDeliveryEnabled: true,
    qrCodeEnabled: true,

    // Translations
    customTranslationsEnabled: true,
    autoTranslationEnabled: true,

    // Organization
    rbacEnabled: true,
    customRolesEnabled: true,
    ssoEnabled: false,

    // API & OAuth
    apiKeysEnabled: true,
    oauthEnabled: true,
    apiWebhooksEnabled: true,
    deploymentIntegrationsEnabled: true, // GitHub + Vercel for deployment

    // AI
    aiEnabled: true,
    aiByokEnabled: true,

    // Compliance
    gdprToolsEnabled: true,
    cookieConsentEnabled: true,
    privacyPolicyGeneratorEnabled: true,
    termsGeneratorEnabled: true,
    dataExportEnabled: true,
    dataDeleteRequestsEnabled: true,

    // Audit
    detailedLogsEnabled: true,
    auditLogExportEnabled: true,

    // Benefits Platform
    benefitsEnabled: true,
    commissionsEnabled: true,
    cryptoPayoutsEnabled: true,
    benefitsAnalyticsEnabled: true,

    // Bookings
    bookingsEnabled: true,
    recurringBookingsEnabled: true,
    multiResourceBookingsEnabled: true,
    depositPaymentsEnabled: true,
    bookingRemindersEnabled: true,
    bufferTimeEnabled: true,
    multiLocationEnabled: true,

    // Sequences
    sequencesEnabled: true,
  },
};

export const AGENCY_TIER: TierConfig = {
  name: "Agency",
  description: "€299/month + €79/sub-org - Multi-client operators",
  priceInCents: 29900,
  currency: "EUR",
  supportLevel: "priority_12h",

  limits: {
    // Core Platform
    maxUsers: 15,
    maxApiKeys: 5, // + 1 per sub-org
    maxSubOrganizations: 2, // included, +€79/each additional, max 20
    maxCustomDomains: 5,

    // System Templates (unlimited for paid tiers)
    maxSystemTemplates: -1,

    // CRM
    maxContacts: 10000, // + 2000 per sub-org
    maxOrganizations: 500,
    maxPipelines: UNLIMITED,
    maxEmailsPerMonth: 10000,

    // Projects
    maxProjects: UNLIMITED,
    maxMilestonesPerProject: UNLIMITED,
    maxTasksPerProject: UNLIMITED,

    // Events
    maxEvents: UNLIMITED,
    maxAttendeesPerEvent: 2000,
    maxSponsorsPerEvent: UNLIMITED,

    // Products
    maxProducts: UNLIMITED,
    maxAddonsPerProduct: UNLIMITED,

    // Checkout
    maxCheckoutInstances: 100,

    // Invoicing
    maxInvoicesPerMonth: 2000,

    // Forms
    maxForms: UNLIMITED,
    maxResponsesPerForm: 25000,

    // Web Publishing
    maxPages: 100,

    // Builder Apps
    maxBuilderApps: 100,

    // Workflows
    maxWorkflows: UNLIMITED,
    maxBehaviorsPerWorkflow: UNLIMITED,

    // Sequences
    maxSequences: UNLIMITED,
    maxStepsPerSequence: UNLIMITED,
    maxMessageTemplates: UNLIMITED,

    // Templates
    maxCustomTemplates: UNLIMITED,

    // Media Library
    totalStorageGB: 50, // + 5GB per sub-org
    maxFileUploadMB: 250,
    perUserStorageGB: 5,

    // Certificates
    maxCertificates: 10000,

    // API & OAuth
    maxWebsitesPerKey: 5,
    maxCustomOAuthApps: 5, // + 1 per sub-org
    maxThirdPartyIntegrations: UNLIMITED,
    rateLimitPerMinute: 300,
    rateLimitPerDay: 100000,
    maxWebhooks: 50,

    // Audit
    auditLogRetentionDays: 180,

    // Benefits Platform
    maxBenefits: 200,
    maxCommissions: 100,
    maxBenefitClaimsPerMonth: 1000,
    maxCommissionPayoutsPerMonth: 200,

    // Bookings
    maxLocations: UNLIMITED,
    maxBookableResources: UNLIMITED,
    maxBookingsPerMonth: UNLIMITED,
    maxRecurringSeriesLength: UNLIMITED,
    maxResourcesPerBooking: UNLIMITED,

    // Credits
    monthlyCredits: 2000,
    dailyCreditsOnLogin: 5,
  },

  features: {
    // Core
    badgeRequired: false,
    subOrgsEnabled: true,
    customDomainsEnabled: true,
    whiteLabelEnabled: true,
    whiteLabelLevel: "full",

    // CRM
    crmEnabled: true,
    contactImportExportEnabled: true,
    contactSyncEnabled: true,
    bulkEmailEnabled: true,

    // Projects
    projectsEnabled: true,
    budgetTrackingEnabled: true,
    advancedReportsEnabled: true,

    // Events
    eventsEnabled: true,
    mediaGalleryEnabled: true,
    eventAnalyticsEnabled: true,

    // Products
    productsEnabled: true,
    inventoryTrackingEnabled: true,
    b2bInvoicingEnabled: true,
    templateSetOverridesEnabled: true,

    // Checkout
    checkoutEnabled: true,
    stripeConnectEnabled: true,
    invoicePaymentEnabled: true,
    manualPaymentEnabled: true,
    customBrandingEnabled: true,
    multiLanguageEnabled: true,
    stripeTaxEnabled: true,

    // Invoicing
    invoicingEnabled: true,
    consolidatedInvoicingEnabled: true,
    multiCurrencyEnabled: true,
    automatedGenerationEnabled: true,
    emailDeliveryEnabled: true,
    customTemplatesEnabled: true,

    // Forms
    formsEnabled: true,
    multiStepFormsEnabled: true,
    conditionalLogicEnabled: true,
    fileUploadsEnabled: true,
    formAnalyticsEnabled: true,

    // Web Publishing
    webPublishingEnabled: true,
    seoToolsEnabled: true,
    contentRulesEnabled: true,
    pageAnalyticsEnabled: true,
    vercelDeploymentEnabled: true,

    // Workflows
    workflowsEnabled: true,
    workflowTemplatesEnabled: true,
    advancedConditionsEnabled: true,
    testModeEnabled: true,

    // Templates
    templatesEnabled: true,
    templateSetsEnabled: true,
    templateVersioningEnabled: true,
    advancedEditorEnabled: true,
    templateSharingEnabled: true,

    // Certificates
    certificatesEnabled: true,

    // Media
    folderOrganizationEnabled: true,
    cloudIntegrationEnabled: true,

    // Certificates (sub-features)
    customCertificateTemplatesEnabled: true,
    automatedCertificateDeliveryEnabled: true,
    qrCodeEnabled: true,

    // Translations
    customTranslationsEnabled: true,
    autoTranslationEnabled: true,

    // Organization
    rbacEnabled: true,
    customRolesEnabled: true,
    ssoEnabled: false,

    // API & OAuth
    apiKeysEnabled: true,
    oauthEnabled: true,
    apiWebhooksEnabled: true,
    deploymentIntegrationsEnabled: true, // GitHub + Vercel for deployment

    // AI
    aiEnabled: true,
    aiByokEnabled: true,

    // Compliance
    gdprToolsEnabled: true,
    cookieConsentEnabled: true,
    privacyPolicyGeneratorEnabled: true,
    termsGeneratorEnabled: true,
    dataExportEnabled: true,
    dataDeleteRequestsEnabled: true,

    // Audit
    detailedLogsEnabled: true,
    auditLogExportEnabled: true,

    // Benefits Platform
    benefitsEnabled: true,
    commissionsEnabled: true,
    cryptoPayoutsEnabled: true,
    benefitsAnalyticsEnabled: true,

    // Bookings
    bookingsEnabled: true,
    recurringBookingsEnabled: true,
    multiResourceBookingsEnabled: true,
    depositPaymentsEnabled: true,
    bookingRemindersEnabled: true,
    bufferTimeEnabled: true,
    multiLocationEnabled: true,

    // Sequences
    sequencesEnabled: true,
  },
};

export const ENTERPRISE_TIER: TierConfig = {
  name: "Enterprise",
  description: "€1,500+/month - White-label resellers, compliance",
  priceInCents: 150000,
  currency: "EUR",
  supportLevel: "dedicated",

  limits: {
    // Core Platform
    maxUsers: UNLIMITED,
    maxApiKeys: UNLIMITED,
    maxSubOrganizations: UNLIMITED,
    maxCustomDomains: UNLIMITED,

    // System Templates (unlimited for Enterprise)
    maxSystemTemplates: UNLIMITED,

    // CRM
    maxContacts: UNLIMITED,
    maxOrganizations: UNLIMITED,
    maxPipelines: UNLIMITED,
    maxEmailsPerMonth: UNLIMITED,

    // Projects
    maxProjects: UNLIMITED,
    maxMilestonesPerProject: UNLIMITED,
    maxTasksPerProject: UNLIMITED,

    // Events
    maxEvents: UNLIMITED,
    maxAttendeesPerEvent: UNLIMITED,
    maxSponsorsPerEvent: UNLIMITED,

    // Products
    maxProducts: UNLIMITED,
    maxAddonsPerProduct: UNLIMITED,

    // Checkout
    maxCheckoutInstances: UNLIMITED,

    // Invoicing
    maxInvoicesPerMonth: UNLIMITED,

    // Forms
    maxForms: UNLIMITED,
    maxResponsesPerForm: UNLIMITED,

    // Web Publishing
    maxPages: UNLIMITED,

    // Builder Apps
    maxBuilderApps: UNLIMITED,

    // Workflows
    maxWorkflows: UNLIMITED,
    maxBehaviorsPerWorkflow: UNLIMITED,

    // Sequences
    maxSequences: UNLIMITED,
    maxStepsPerSequence: UNLIMITED,
    maxMessageTemplates: UNLIMITED,

    // Templates
    maxCustomTemplates: UNLIMITED,

    // Media Library
    totalStorageGB: UNLIMITED,
    maxFileUploadMB: 500,
    perUserStorageGB: UNLIMITED,

    // Certificates
    maxCertificates: UNLIMITED,

    // API & OAuth
    maxWebsitesPerKey: UNLIMITED,
    maxCustomOAuthApps: UNLIMITED,
    maxThirdPartyIntegrations: UNLIMITED,
    rateLimitPerMinute: UNLIMITED,
    rateLimitPerDay: UNLIMITED,
    maxWebhooks: UNLIMITED,

    // Audit
    auditLogRetentionDays: 365,

    // Benefits Platform
    maxBenefits: UNLIMITED,
    maxCommissions: UNLIMITED,
    maxBenefitClaimsPerMonth: UNLIMITED,
    maxCommissionPayoutsPerMonth: UNLIMITED,

    // Bookings
    maxLocations: UNLIMITED,
    maxBookableResources: UNLIMITED,
    maxBookingsPerMonth: UNLIMITED,
    maxRecurringSeriesLength: UNLIMITED,
    maxResourcesPerBooking: UNLIMITED,

    // Credits
    monthlyCredits: UNLIMITED,
    dailyCreditsOnLogin: UNLIMITED,
  },

  features: {
    // Core
    badgeRequired: false,
    subOrgsEnabled: true,
    customDomainsEnabled: true,
    whiteLabelEnabled: true,
    whiteLabelLevel: "full_with_api_domain",

    // CRM
    crmEnabled: true,
    contactImportExportEnabled: true,
    contactSyncEnabled: true,
    bulkEmailEnabled: true,

    // Projects
    projectsEnabled: true,
    budgetTrackingEnabled: true,
    advancedReportsEnabled: true,

    // Events
    eventsEnabled: true,
    mediaGalleryEnabled: true,
    eventAnalyticsEnabled: true,

    // Products
    productsEnabled: true,
    inventoryTrackingEnabled: true,
    b2bInvoicingEnabled: true,
    templateSetOverridesEnabled: true,

    // Checkout
    checkoutEnabled: true,
    stripeConnectEnabled: true,
    invoicePaymentEnabled: true,
    manualPaymentEnabled: true,
    customBrandingEnabled: true,
    multiLanguageEnabled: true,
    stripeTaxEnabled: true,

    // Invoicing
    invoicingEnabled: true,
    consolidatedInvoicingEnabled: true,
    multiCurrencyEnabled: true,
    automatedGenerationEnabled: true,
    emailDeliveryEnabled: true,
    customTemplatesEnabled: true,

    // Forms
    formsEnabled: true,
    multiStepFormsEnabled: true,
    conditionalLogicEnabled: true,
    fileUploadsEnabled: true,
    formAnalyticsEnabled: true,

    // Web Publishing
    webPublishingEnabled: true,
    seoToolsEnabled: true,
    contentRulesEnabled: true,
    pageAnalyticsEnabled: true,
    vercelDeploymentEnabled: true,

    // Workflows
    workflowsEnabled: true,
    workflowTemplatesEnabled: true,
    advancedConditionsEnabled: true,
    testModeEnabled: true,

    // Templates
    templatesEnabled: true,
    templateSetsEnabled: true,
    templateVersioningEnabled: true,
    advancedEditorEnabled: true,
    templateSharingEnabled: true,

    // Certificates
    certificatesEnabled: true,

    // Media
    folderOrganizationEnabled: true,
    cloudIntegrationEnabled: true,

    // Certificates (sub-features)
    customCertificateTemplatesEnabled: true,
    automatedCertificateDeliveryEnabled: true,
    qrCodeEnabled: true,

    // Translations
    customTranslationsEnabled: true,
    autoTranslationEnabled: true,

    // Organization
    rbacEnabled: true,
    customRolesEnabled: true,
    ssoEnabled: true,

    // API & OAuth
    apiKeysEnabled: true,
    oauthEnabled: true,
    apiWebhooksEnabled: true,
    deploymentIntegrationsEnabled: true, // GitHub + Vercel for deployment

    // AI
    aiEnabled: true,
    aiByokEnabled: true,

    // Compliance
    gdprToolsEnabled: true,
    cookieConsentEnabled: true,
    privacyPolicyGeneratorEnabled: true,
    termsGeneratorEnabled: true,
    dataExportEnabled: true,
    dataDeleteRequestsEnabled: true,

    // Audit
    detailedLogsEnabled: true,
    auditLogExportEnabled: true,

    // Benefits Platform
    benefitsEnabled: true,
    commissionsEnabled: true,
    cryptoPayoutsEnabled: true,
    benefitsAnalyticsEnabled: true,

    // Bookings
    bookingsEnabled: true,
    recurringBookingsEnabled: true,
    multiResourceBookingsEnabled: true,
    depositPaymentsEnabled: true,
    bookingRemindersEnabled: true,
    bufferTimeEnabled: true,
    multiLocationEnabled: true,

    // Sequences
    sequencesEnabled: true,
  },
};

/**
 * TIER CONFIGS EXPORT
 *
 * Main export for accessing tier configurations by name.
 */
export const TIER_CONFIGS: Record<
  "free" | "pro" | "starter" | "professional" | "agency" | "enterprise",
  TierConfig
> = {
  free: FREE_TIER,
  pro: PRO_TIER,
  starter: STARTER_TIER,           // Legacy - maps to Pro for new subscriptions
  professional: PROFESSIONAL_TIER, // Legacy - maps to Pro for new subscriptions
  agency: AGENCY_TIER,
  enterprise: ENTERPRISE_TIER,
};

/**
 * HELPER: Get tier config by name
 */
export function getTierConfig(
  tierName: "free" | "pro" | "starter" | "professional" | "agency" | "enterprise"
): TierConfig {
  return TIER_CONFIGS[tierName];
}

/**
 * HELPER: Check if a limit is unlimited
 */
export function isUnlimited(limit: number): boolean {
  return limit === UNLIMITED;
}

/**
 * HELPER: Format limit for display
 */
export function formatLimit(limit: number): string {
  if (isUnlimited(limit)) {
    return "Unlimited";
  }
  return limit.toLocaleString();
}

/**
 * Tier name type alias
 */
export type TierName = "free" | "pro" | "starter" | "professional" | "agency" | "enterprise";

export type StoreRuntimeTierName = "free" | "pro" | "agency" | "enterprise";
export type StorePublicTierName = "free" | "pro" | "scale" | "enterprise";

export const STORE_ACTIVE_RUNTIME_TIERS: readonly StoreRuntimeTierName[] = [
  "free",
  "pro",
  "agency",
  "enterprise",
];

export const STORE_PUBLIC_TO_RUNTIME_TIER_NAME: Record<StorePublicTierName, StoreRuntimeTierName> = {
  free: "free",
  pro: "pro",
  scale: "agency",
  enterprise: "enterprise",
};

export const STORE_RUNTIME_TO_PUBLIC_TIER_NAME: Record<StoreRuntimeTierName, StorePublicTierName> = {
  free: "free",
  pro: "pro",
  agency: "scale",
  enterprise: "enterprise",
};

export const STORE_RUNTIME_TIER_DISPLAY_NAMES: Record<
  StoreRuntimeTierName,
  "Free" | "Pro" | "Scale" | "Enterprise"
> = {
  free: "Free",
  pro: "Pro",
  agency: "Scale",
  enterprise: "Enterprise",
};

export function mapStorePublicTierToRuntime(tier: StorePublicTierName): StoreRuntimeTierName {
  return STORE_PUBLIC_TO_RUNTIME_TIER_NAME[tier];
}

export function mapStoreRuntimeTierToPublic(tier: StoreRuntimeTierName): StorePublicTierName {
  return STORE_RUNTIME_TO_PUBLIC_TIER_NAME[tier];
}

export function getStoreRuntimeTierDisplayName(
  tier: StoreRuntimeTierName
): "Free" | "Pro" | "Scale" | "Enterprise" {
  return STORE_RUNTIME_TIER_DISPLAY_NAMES[tier];
}

/**
 * HELPER: Get the next tier name for upgrade prompts
 *
 * Current active tiers: Free → Pro → Scale (runtime: agency) → Enterprise
 * Legacy tiers (starter, professional) are kept for backward compatibility
 */
const ACTIVE_TIER_ORDER: StoreRuntimeTierName[] = ["free", "pro", "agency", "enterprise"];

const LEGACY_TIER_TO_ACTIVE_TIER: Record<TierName, StoreRuntimeTierName> = {
  free: "free",
  pro: "pro",
  starter: "pro",
  professional: "pro",
  agency: "agency",
  enterprise: "enterprise",
};

export function getNextTierName(currentTier: TierName): TierName | null {
  const normalizedTier = LEGACY_TIER_TO_ACTIVE_TIER[currentTier] || "free";
  const idx = ACTIVE_TIER_ORDER.indexOf(normalizedTier);
  if (idx === -1 || idx >= ACTIVE_TIER_ORDER.length - 1) return null;
  return ACTIVE_TIER_ORDER[idx + 1];
}
