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
  handler: async (ctx, { organizationId, accountId }) => {
    // Get organization to preserve isTestMode
    const org = await ctx.runQuery(
      internal.stripeConnect.getOrganizationInternal,
      { organizationId }
    );

    if (!org) {
      throw new Error("Organization not found");
    }

    // Get existing config to preserve isTestMode setting
    const existingProvider = org.paymentProviders?.find(p => p.providerCode === "stripe-connect");
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

    return { success: true };
  },
});
