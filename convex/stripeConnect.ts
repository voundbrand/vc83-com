/**
 * STRIPE CONNECT INTEGRATION (REFACTORED)
 *
 * This is the refactored version using the payment provider abstraction.
 * Once tested, this will replace stripeConnect.ts
 *
 * Key Changes:
 * - Uses StripeConnectProvider instead of direct Stripe API calls
 * - Cleaner separation of concerns
 * - Easier to test and maintain
 */

import {
  query,
  mutation,
  action,
  internalAction,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";
import {
  getProviderByCode,
  updateOrgProviderConfig,
  getOrgProviderConfig,
} from "./paymentProviders";

// =========================================
// QUERIES
// =========================================

/**
 * GET STRIPE CONNECT STATUS
 * Check if organization has Stripe Connect configured
 */
export const getStripeConnectStatus = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { sessionId, organizationId }) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const org = await ctx.db.get(organizationId);
    if (!org) throw new Error("Organization not found");

    // Get provider config
    const config = getOrgProviderConfig(org, "stripe-connect");

    return {
      isConnected: !!config,
      accountId: config?.accountId,
      status: config?.status ?? "not_connected",
      onboardingCompleted: config?.status === "active",
      chargesEnabled: config?.status === "active",
      payoutsEnabled: config?.status === "active",
    };
  },
});

/**
 * FIND ORGANIZATION BY STRIPE ACCOUNT ID
 * Used by webhooks to locate organization from Stripe account ID
 */
export const findOrgByStripeAccount = internalQuery({
  args: {
    stripeAccountId: v.string(),
  },
  handler: async (ctx, { stripeAccountId }) => {
    // Search for organization by Stripe account ID in paymentProviders array
    const orgs = await ctx.db.query("organizations").collect();
    for (const org of orgs) {
      const config = getOrgProviderConfig(org, "stripe-connect");
      if (config?.accountId === stripeAccountId) {
        return org;
      }
    }

    return null;
  },
});

/**
 * GET SESSION (helper for actions) - INTERNAL
 */
export const getSessionInternal = internalQuery({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), sessionId))
      .first();
  },
});

/**
 * GET ORGANIZATION (helper for actions) - INTERNAL
 */
export const getOrganizationInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db.get(organizationId);
  },
});

// =========================================
// MUTATIONS
// =========================================

/**
 * START STRIPE CONNECT ONBOARDING
 * Initiates the connection process and schedules the account creation
 */
export const startOnboarding = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    returnUrl: v.string(),
    refreshUrl: v.string(),
    isTestMode: v.optional(v.boolean()), // Organization's choice for test/live mode
  },
  handler: async (ctx, { sessionId, organizationId, returnUrl, refreshUrl, isTestMode = false }) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const org = await ctx.db.get(organizationId);
    if (!org) throw new Error("Organization not found");

    // Check if already connected
    const existingConfig = getOrgProviderConfig(org, "stripe-connect");
    if (existingConfig && existingConfig.status === "active") {
      throw new Error("Organization already has Stripe Connect configured");
    }

    // Schedule action to create account and get onboarding URL
    await ctx.scheduler.runAfter(
      0,
      internal.stripeConnect.createStripeAccountLink,
      {
        organizationId,
        returnUrl,
        refreshUrl,
        isTestMode,
      }
    );

    return { success: true };
  },
});

/**
 * UPDATE STRIPE CONNECT ACCOUNT
 * Called after Stripe webhook confirms account status
 */
export const updateStripeConnectAccount = mutation({
  args: {
    organizationId: v.id("organizations"),
    stripeAccountId: v.string(),
    accountStatus: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("restricted"),
      v.literal("disabled")
    ),
    chargesEnabled: v.boolean(),
    payoutsEnabled: v.boolean(),
    onboardingCompleted: v.boolean(),
    isTestMode: v.boolean(), // Organization's choice for test/live mode
  },
  handler: async (ctx, args) => {
    await updateOrgProviderConfig(ctx, args.organizationId, {
      providerCode: "stripe-connect",
      accountId: args.stripeAccountId,
      status: args.accountStatus,
      isDefault: true, // Stripe is default if it's the only one
      isTestMode: args.isTestMode, // Use organization's preference
      connectedAt: Date.now(),
      lastStatusCheck: Date.now(),
      metadata: {
        chargesEnabled: args.chargesEnabled,
        payoutsEnabled: args.payoutsEnabled,
        onboardingCompleted: args.onboardingCompleted,
      },
    });

    return { success: true };
  },
});

/**
 * UPDATE STRIPE CONNECT ACCOUNT - INTERNAL
 * Internal version for use by actions
 */
export const updateStripeConnectAccountInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    stripeAccountId: v.string(),
    accountStatus: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("restricted"),
      v.literal("disabled")
    ),
    chargesEnabled: v.boolean(),
    payoutsEnabled: v.boolean(),
    onboardingCompleted: v.boolean(),
    isTestMode: v.boolean(), // Organization's choice for test/live mode
  },
  handler: async (ctx, args) => {
    await updateOrgProviderConfig(ctx, args.organizationId, {
      providerCode: "stripe-connect",
      accountId: args.stripeAccountId,
      status: args.accountStatus,
      isDefault: true,
      isTestMode: args.isTestMode, // Use organization's preference
      connectedAt: Date.now(),
      lastStatusCheck: Date.now(),
      metadata: {
        chargesEnabled: args.chargesEnabled,
        payoutsEnabled: args.payoutsEnabled,
        onboardingCompleted: args.onboardingCompleted,
      },
    });

    return { success: true };
  },
});

/**
 * REFRESH ACCOUNT STATUS
 * Refresh Stripe Connect account status from Stripe
 * NOTE: This now returns immediately with basic info.
 * The actual refresh happens asynchronously via scheduler.
 * For synchronous refresh with full tax info, see refreshAccountStatusSync below.
 */
export const refreshAccountStatus = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { sessionId, organizationId }) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const org = await ctx.db.get(organizationId);
    if (!org) throw new Error("Organization not found");

    const config = getOrgProviderConfig(org, "stripe-connect");
    if (!config) {
      throw new Error("No Stripe account connected");
    }

    // Call action to refresh from Stripe
    await ctx.scheduler.runAfter(
      0,
      internal.stripeConnect.refreshAccountStatusFromStripe,
      {
        organizationId,
        accountId: config.accountId,
      }
    );

    return { success: true };
  },
});

/**
 * REFRESH ACCOUNT STATUS (SYNCHRONOUS)
 * Synchronously refresh Stripe Connect account status and tax settings
 * Returns full status including tax configuration
 */
export const refreshAccountStatusSync = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { sessionId, organizationId }): Promise<{
    success: boolean;
    accountStatus: string;
    taxStatus: string;
    taxSyncResult?: {
      success: boolean;
      taxEnabled: boolean;
      settingsFound: boolean;
    };
    invoiceSettingsResult?: {
      success: boolean;
      settingsFound: boolean;
      invoicingEnabled: boolean;
    };
  }> => {
    // Verify session
    const session = await ctx.runQuery(internal.stripeConnect.getSessionInternal, { sessionId });
    if (!session) throw new Error("Invalid session");

    // Get organization
    const org = await ctx.runQuery(internal.stripeConnect.getOrganizationInternal, { organizationId });
    if (!org) throw new Error("Organization not found");

    const config = getOrgProviderConfig(org, "stripe-connect");
    if (!config) {
      throw new Error("No Stripe account connected");
    }

    // Call refresh action directly and return results
    const result = await ctx.runAction(
      internal.stripeConnect.refreshAccountStatusFromStripe,
      {
        organizationId,
        accountId: config.accountId,
      }
    );

    return result;
  },
});

/**
 * DISCONNECT STRIPE CONNECT
 * Remove Stripe Connect integration
 */
export const disconnectStripeConnect = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { sessionId, organizationId }) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const org = await ctx.db.get(organizationId);
    if (!org) throw new Error("Organization not found");

    // Remove Stripe Connect provider from array
    const updatedProviders = (org.paymentProviders || []).filter(
      (p) => p.providerCode !== "stripe-connect"
    );

    await ctx.db.patch(organizationId, {
      paymentProviders: updatedProviders,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * CLEAR STRIPE CONNECTION (Internal)
 * Called when user deauthorizes their Stripe account
 */
export const clearStripeConnection = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const org = await ctx.db.get(organizationId);
    if (!org) throw new Error("Organization not found");

    // Remove Stripe Connect provider from array
    const updatedProviders = (org.paymentProviders || []).filter(
      (p) => p.providerCode !== "stripe-connect"
    );

    await ctx.db.patch(organizationId, {
      paymentProviders: updatedProviders,
      updatedAt: Date.now(),
    });

    console.log(`Cleared Stripe connection for organization: ${organizationId}`);

    return { success: true };
  },
});

// =========================================
// ACTIONS (Using Provider)
// =========================================

/**
 * GET STRIPE ONBOARDING URL
 * Public action that generates a Stripe Connect onboarding link
 */
export const getStripeOnboardingUrl = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    returnUrl: v.string(),
    refreshUrl: v.string(),
    isTestMode: v.optional(v.boolean()), // Organization's choice for test/live mode
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    // Validate session
    const session = await ctx.runQuery(
      internal.stripeConnect.validateSession,
      {
        sessionId: args.sessionId,
      }
    );

    if (!session) throw new Error("Invalid session");

    // Get or create the Stripe account link
    const result: { url: string } = await ctx.runAction(
      internal.stripeConnect.createStripeAccountLink,
      {
        organizationId: args.organizationId,
        returnUrl: args.returnUrl,
        refreshUrl: args.refreshUrl,
        isTestMode: args.isTestMode ?? false, // Default to live mode (false)
      }
    );

    return { url: result.url };
  },
});

/**
 * VALIDATE SESSION (internal helper)
 */
export const validateSession = internalQuery({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), sessionId))
      .first();
  },
});

/**
 * HANDLE OAUTH CALLBACK
 * Completes the OAuth flow by exchanging authorization code for account ID
 */
export const handleOAuthCallback = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    code: v.string(), // Authorization code from Stripe OAuth
    state: v.string(), // State parameter for CSRF protection
    isTestMode: v.boolean(),
  },
  handler: async (ctx, { sessionId, organizationId, code, state, isTestMode }) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Verify state matches organizationId for CSRF protection
    if (state !== organizationId) {
      throw new Error("Invalid state parameter - possible CSRF attack");
    }

    // Schedule action to complete OAuth and get account ID
    await ctx.scheduler.runAfter(
      0,
      internal.stripeConnect.completeOAuthConnection,
      {
        organizationId,
        code,
        isTestMode,
      }
    );

    return { success: true };
  },
});

/**
 * COMPLETE OAUTH CONNECTION (Internal Action)
 * Exchanges OAuth code for account ID and stores in database
 */
export const completeOAuthConnection = internalAction({
  args: {
    organizationId: v.id("organizations"),
    code: v.string(),
    isTestMode: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Get Stripe provider
    const provider = getProviderByCode("stripe-connect");

    // Check if provider supports OAuth
    if (!provider.completeOAuthConnection) {
      throw new Error("Provider does not support OAuth connection");
    }

    // Exchange authorization code for account ID
    const result = await provider.completeOAuthConnection(args.code);

    // Get account status
    const accountStatus = await provider.getAccountStatus(result.accountId);

    // Save to database
    await ctx.runMutation(
      internal.stripeConnect.updateStripeConnectAccountInternal,
      {
        organizationId: args.organizationId,
        stripeAccountId: result.accountId,
        accountStatus: accountStatus.status,
        chargesEnabled: accountStatus.chargesEnabled,
        payoutsEnabled: accountStatus.payoutsEnabled,
        onboardingCompleted: accountStatus.onboardingCompleted,
        isTestMode: args.isTestMode,
      }
    );

    console.log(
      `Completed OAuth connection for org ${args.organizationId}: ${result.accountId}`
    );

    return { success: true, accountId: result.accountId };
  },
});

/**
 * CREATE STRIPE ACCOUNT LINK (Using Provider)
 * Uses the StripeConnectProvider OAuth flow
 */
export const createStripeAccountLink = internalAction({
  args: {
    organizationId: v.id("organizations"),
    returnUrl: v.string(),
    refreshUrl: v.string(),
    isTestMode: v.boolean(), // Organization's choice for test/live mode
  },
  handler: async (ctx, args) => {
    // Get organization
    const org = await ctx.runQuery(
      internal.stripeConnect.getOrganizationInternal,
      {
        organizationId: args.organizationId,
      }
    );

    if (!org) {
      throw new Error("Organization not found");
    }

    // Get Stripe provider
    const provider = getProviderByCode("stripe-connect");

    // Check if account already exists
    const existingConfig = getOrgProviderConfig(org, "stripe-connect");

    if (existingConfig?.accountId) {
      // Just create new account link for existing account
      // (Provider will handle this internally)
    }

    // Start OAuth flow using provider
    const result = await provider.startAccountConnection({
      organizationId: args.organizationId,
      organizationName: org.name,
      organizationEmail: org.email || "",
      returnUrl: args.returnUrl,
      refreshUrl: args.refreshUrl,
    });

    // Note: Account ID will be saved after OAuth callback completes
    // For now, just return the OAuth URL

    console.log(
      `Started OAuth connection for org ${args.organizationId}`
    );

    return { url: result.onboardingUrl || "" };
  },
});

/**
 * REFRESH ACCOUNT STATUS FROM STRIPE (Using Provider)
 * Uses the provider to fetch latest status
 */
export const refreshAccountStatusFromStripe = internalAction({
  args: {
    organizationId: v.id("organizations"),
    accountId: v.string(),
  },
  handler: async (ctx, { organizationId, accountId }): Promise<{
    success: boolean;
    accountStatus: string;
    taxStatus: string;
    taxSyncResult?: {
      success: boolean;
      taxEnabled: boolean;
      settingsFound: boolean;
    };
    invoiceSettingsResult?: {
      success: boolean;
      settingsFound: boolean;
      invoicingEnabled: boolean;
    };
  }> => {
    // Get organization to preserve isTestMode
    const org = await ctx.runQuery(
      internal.stripeConnect.getOrganizationInternal,
      { organizationId }
    );

    if (!org) {
      throw new Error("Organization not found");
    }

    // Get existing config to preserve isTestMode setting
    const existingProvider = org.paymentProviders?.find((p: { providerCode: string }) => p.providerCode === "stripe-connect");
    const isTestMode = existingProvider?.isTestMode ?? false;

    // Get Stripe provider
    const provider = getProviderByCode("stripe-connect");

    // Get fresh status from Stripe
    const status = await provider.getAccountStatus(accountId);

    // Update database
    await ctx.runMutation(
      internal.stripeConnect.updateStripeConnectAccountInternal,
      {
        organizationId,
        stripeAccountId: status.accountId,
        accountStatus: status.status,
        chargesEnabled: status.chargesEnabled,
        payoutsEnabled: status.payoutsEnabled,
        onboardingCompleted: status.onboardingCompleted,
        isTestMode, // Preserve organization's mode preference
      }
    );

    console.log(
      `Refreshed account status for ${accountId}: ${status.status}`
    );

    // ALSO check if Stripe Tax is configured in the Stripe Dashboard
    // This allows users who already set up tax in Stripe to sync it
    let stripeTaxStatus: { status: string; defaultsStatus?: string } = { status: 'inactive' };
    let taxSyncResult;
    try {
      // Initialize Stripe with our platform credentials
      // We'll use stripeAccount parameter to access the connected account
      const Stripe = (await import("stripe")).default;
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        throw new Error("STRIPE_SECRET_KEY not configured");
      }
      const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-09-30.clover" });

      // Retrieve tax settings from the connected account
      // stripeAccount parameter routes this to their account
      const taxSettings = await stripe.tax.settings.retrieve({
        stripeAccount: accountId, // Their connected Stripe account
      });

      stripeTaxStatus = {
        status: taxSettings.status,
        defaultsStatus: taxSettings.defaults?.tax_behavior ?? undefined,
      };

      console.log("Stripe Tax status:", stripeTaxStatus);

      // If Stripe Tax is active, update our tax settings to reflect that
      if (taxSettings.status === "active") {
        taxSyncResult = await ctx.runMutation(
          internal.organizationTaxSettings.syncFromStripeInternal,
          {
            organizationId,
            stripeTaxActive: true,
          }
        );
        console.log("✅ Synced tax settings from Stripe:", taxSyncResult);
      }
    } catch (error) {
      // Tax settings might not be available or accessible
      // This is non-critical, so just log and continue
      console.log("Could not check Stripe Tax settings:", error);
    }

    // Check if Stripe Invoicing capability is configured
    let invoiceSettingsResult: { success: boolean; settingsFound: boolean; invoicingEnabled: boolean } | undefined;
    try {
      console.log("🔍 Checking Stripe Invoicing capability...");

      // Initialize Stripe (reuse from tax check or create if not exists)
      const Stripe = (await import("stripe")).default;
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        throw new Error("STRIPE_SECRET_KEY not configured");
      }
      const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-09-30.clover" });

      // Retrieve account with capabilities expanded to check invoicing capability
      const accountWithCapabilities = await stripe.accounts.retrieve(
        accountId,
        { expand: ["capabilities"] }
      );

      console.log("📋 Account capabilities:", JSON.stringify(accountWithCapabilities.capabilities, null, 2));

      // Check if invoicing capability is active
      // Note: TypeScript doesn't know about the 'invoicing' capability by default
      const capabilities = accountWithCapabilities.capabilities as Record<string, string | undefined>;
      const hasInvoicingCapability = capabilities?.invoicing === "active";

      console.log(`💳 Invoicing capability status: ${capabilities?.invoicing || "not found"}`);
      console.log(`💳 Has invoicing capability: ${hasInvoicingCapability}`);

      // Check for proper business profile setup (required for invoicing)
      const hasBusinessProfile = !!(
        accountWithCapabilities.business_profile?.name ||
        accountWithCapabilities.company?.name
      );

      console.log(`🏢 Business profile name: ${accountWithCapabilities.business_profile?.name || "not set"}`);
      console.log(`🏢 Company name: ${accountWithCapabilities.company?.name || "not set"}`);
      console.log(`🏢 Has business profile: ${hasBusinessProfile}`);

      // Optional: Check if any invoices have been created
      let hasCreatedInvoices = false;
      try {
        const invoices = await stripe.invoices.list(
          { limit: 1 },
          { stripeAccount: accountId }
        );
        hasCreatedInvoices = invoices.data.length > 0;
        console.log(`📄 Has created invoices: ${hasCreatedInvoices}`);
      } catch (invoiceError) {
        console.log("📄 Could not check for existing invoices:", invoiceError);
      }

      // Overall invoicing readiness
      const isInvoicingEnabled = hasInvoicingCapability && hasBusinessProfile;
      console.log(`🎯 Overall invoicing enabled: ${isInvoicingEnabled}`);

      if (!isInvoicingEnabled) {
        const missing = [];
        if (!hasInvoicingCapability) missing.push("invoicing capability not active");
        if (!hasBusinessProfile) missing.push("business profile incomplete");
        console.log(`❗ Missing requirements for invoicing: ${missing.join(", ")}`);
      }

      // Sync invoice settings if invoicing is enabled
      if (isInvoicingEnabled) {
        const syncResult = await ctx.runMutation(
          internal.organizationInvoiceSettings.syncInvoiceSettingsFromStripe,
          {
            organizationId,
            stripeInvoiceSettings: {
              defaultCollectionMethod: "send_invoice",
              defaultPaymentTerms: "net_30",
              defaultAutoAdvance: true,
              defaultDaysUntilDue: 30,
            },
          }
        );
        invoiceSettingsResult = syncResult as { success: boolean; settingsFound: boolean; invoicingEnabled: boolean };
        console.log("✅ Synced invoice settings from Stripe:", invoiceSettingsResult);
      } else {
        invoiceSettingsResult = {
          success: true,
          settingsFound: false,
          invoicingEnabled: false,
        };
        console.log("ℹ️ Invoicing not enabled - requirements not met");
      }
    } catch (error) {
      // Invoice settings check is non-critical
      console.log("Could not check Stripe Invoicing capability:", error);
      invoiceSettingsResult = {
        success: false,
        settingsFound: false,
        invoicingEnabled: false,
      };
    }

    return {
      success: true,
      accountStatus: status.status,
      taxStatus: stripeTaxStatus.status,
      taxSyncResult,
      invoiceSettingsResult,
    };
  },
});

/**
 * Request Stripe Invoicing capability for connected account
 */
export const requestInvoicingCapability = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    status: string;
    isActive: boolean;
    isPending: boolean;
    requirementsNeeded: string[];
  }> => {
    // Get organization and its Stripe account
    const org = await ctx.runQuery(
      internal.organizations.getOrganization,
      {
        organizationId: args.organizationId,
      }
    );

    if (!org) {
      throw new Error("Organization not found");
    }

    const stripeProvider = org.paymentProviders?.find(
      (p) => p.providerCode === "stripe-connect"
    );

    if (!stripeProvider?.accountId) {
      throw new Error("Stripe account not connected");
    }

    // Initialize Stripe client with platform credentials
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-09-30.clover",
    });

    try {
      console.log("🔧 Enabling invoicing for account:", stripeProvider.accountId);

      // Stripe Invoicing is automatically available for all accounts
      // The "enable" action is really just setting it up in our system
      // and ensuring the account has the required business profile

      const account = await stripe.accounts.retrieve(stripeProvider.accountId);

      const hasBusinessProfile = !!(
        account.business_profile?.name || account.company?.name
      );

      if (!hasBusinessProfile) {
        throw new Error(
          "Business profile is required for invoicing. Please complete your business profile in the Stripe Dashboard."
        );
      }

      // Check if any invoices have been created (indicates invoicing is "active")
      const invoices = await stripe.invoices.list(
        { limit: 1 },
        { stripeAccount: stripeProvider.accountId }
      );

      const hasCreatedInvoices = invoices.data.length > 0;

      console.log("✅ Invoicing is available for this account");
      console.log("📋 Business profile:", hasBusinessProfile ? "Set" : "Not set");
      console.log("📄 Has created invoices:", hasCreatedInvoices);

      // Sync invoice settings to our database
      await ctx.runMutation(
        internal.organizationInvoiceSettings.syncInvoiceSettingsFromStripe,
        {
          organizationId: args.organizationId,
          stripeInvoiceSettings: {
            defaultCollectionMethod: "send_invoice",
            defaultPaymentTerms: "net_30",
            defaultAutoAdvance: true,
            defaultDaysUntilDue: 30,
          },
        }
      );

      return {
        success: true,
        status: "active", // Invoicing is always available if business profile is set
        isActive: true,
        isPending: false,
        requirementsNeeded: [],
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Failed to enable invoicing:", error);
      throw new Error(`Failed to enable invoicing: ${errorMessage}`);
    }
  },
});

/**
 * Mutation to trigger invoicing capability request (exposed to frontend)
 */
export const triggerInvoicingCapabilityRequest = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    // Validate session
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) {
      throw new Error("Invalid session");
    }

    // Trigger the action
    await ctx.scheduler.runAfter(
      0,
      internal.stripeConnect.requestInvoicingCapability,
      {
        organizationId: args.organizationId,
      }
    );

    return { success: true };
  },
});
