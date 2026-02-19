/**
 * STRIPE PLATFORM TIER CHECKOUT
 *
 * Handles Stripe Checkout session creation for platform tier subscriptions.
 * Active runtime tiers: Free → Pro → agency → Enterprise.
 * Customer-facing name for runtime agency is Scale.
 *
 * This is separate from AI subscription billing (aiCheckout.ts).
 * Platform tiers control feature limits, not AI token usage.
 */

import { action, internalQuery, query } from "../_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";
import {
  buildByokCommercialPolicyMetadata,
  getByokCommercialPolicyRuleTable,
  resolveByokCommercialPolicyForTier,
  resolveByokCommercialPolicyFromMetadata,
} from "./byokCommercialPolicy";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

// Initialize Stripe with API key from environment
const getStripe = () => {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(apiKey, {
    apiVersion: "2025-10-29.clover",
  });
};

/**
 * Platform tier price IDs (set in environment variables)
 *
 * Active runtime tiers: Pro and agency (customer-facing: Scale)
 * Enterprise is custom pricing (contact sales)
 * Free has no Stripe price
 *
 * Monthly and Annual prices are stored separately
 */
const TIER_PRICE_IDS = {
  monthly: {
    pro: process.env.STRIPE_PRO_MO_PRICE_ID,
    agency: process.env.STRIPE_AGENCY_MO_PRICE_ID,
  } as Record<string, string | undefined>,
  annual: {
    pro: process.env.STRIPE_PRO_YR_PRICE_ID,
    agency: process.env.STRIPE_AGENCY_YR_PRICE_ID,
  } as Record<string, string | undefined>,
};

export type StorePublicCheckoutTier = "pro" | "scale";
export type PlatformRuntimeCheckoutTier = "pro" | "agency";
export type CheckoutTierInput = StorePublicCheckoutTier | PlatformRuntimeCheckoutTier;

export const STORE_PUBLIC_TO_RUNTIME_CHECKOUT_TIER: Record<
  StorePublicCheckoutTier,
  PlatformRuntimeCheckoutTier
> = {
  pro: "pro",
  scale: "agency",
};

export const STORE_RUNTIME_TO_PUBLIC_CHECKOUT_TIER: Record<
  PlatformRuntimeCheckoutTier,
  StorePublicCheckoutTier
> = {
  pro: "pro",
  agency: "scale",
};

export function mapStorePublicTierToRuntimeCheckoutTier(
  tier: StorePublicCheckoutTier
): PlatformRuntimeCheckoutTier {
  return STORE_PUBLIC_TO_RUNTIME_CHECKOUT_TIER[tier];
}

export function mapRuntimeCheckoutTierToStorePublicTier(
  tier: PlatformRuntimeCheckoutTier
): StorePublicCheckoutTier {
  return STORE_RUNTIME_TO_PUBLIC_CHECKOUT_TIER[tier];
}

export function normalizeCheckoutTierInput(
  tier: CheckoutTierInput
): PlatformRuntimeCheckoutTier {
  return tier === "scale" ? "agency" : tier;
}

const DEFAULT_PUBLIC_APP_URL = "https://app.l4yercak3.com";
const SCALE_STORE_TRIAL_DAYS = 14;

type FunnelAttribution = {
  channel?: "webchat" | "native_guest" | "telegram" | "platform_web" | "unknown";
  campaign?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
    referrer?: string;
    landingPath?: string;
  };
};

function mapRuntimeTierToPublicStoreTier(
  tier: string | undefined | null
): "free" | "pro" | "scale" | "enterprise" {
  if (tier === "agency") return "scale";
  if (tier === "pro" || tier === "starter" || tier === "professional") return "pro";
  if (tier === "enterprise") return "enterprise";
  return "free";
}

export function resolvePublicAppUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    DEFAULT_PUBLIC_APP_URL;

  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function buildPlatformCheckoutRedirectUrls(args: {
  appBaseUrl?: string;
  tier: CheckoutTierInput;
  billingPeriod: "monthly" | "annual";
  attribution?: FunnelAttribution;
}): { successUrl: string; cancelUrl: string } {
  const baseUrl = (args.appBaseUrl || resolvePublicAppUrl()).replace(/\/+$/, "");
  const runtimeTier = normalizeCheckoutTierInput(args.tier);
  const publicTier = mapRuntimeCheckoutTierToStorePublicTier(runtimeTier);
  const params = new URLSearchParams({
    purchase: "success",
    type: "plan",
    tier: publicTier,
    period: args.billingPeriod,
  });

  const attribution = args.attribution;
  if (attribution?.channel) params.set("onboardingChannel", attribution.channel);
  if (attribution?.campaign?.source) params.set("utm_source", attribution.campaign.source);
  if (attribution?.campaign?.medium) params.set("utm_medium", attribution.campaign.medium);
  if (attribution?.campaign?.campaign) params.set("utm_campaign", attribution.campaign.campaign);
  if (attribution?.campaign?.content) params.set("utm_content", attribution.campaign.content);
  if (attribution?.campaign?.term) params.set("utm_term", attribution.campaign.term);
  if (attribution?.campaign?.referrer) params.set("referrer", attribution.campaign.referrer);
  if (attribution?.campaign?.landingPath) params.set("landingPath", attribution.campaign.landingPath);

  return {
    successUrl: `${baseUrl}/?${params.toString()}`,
    cancelUrl: `${baseUrl}/?purchase=canceled&type=plan`,
  };
}

/**
 * Public BYOK commercial policy table for Store UI and audits.
 * Migration-safe defaults are baked into policy resolution.
 */
export const getByokCommercialPolicyTable = query({
  args: {},
  handler: async () => {
    return getByokCommercialPolicyRuleTable();
  },
});

/**
 * CREATE PLATFORM CHECKOUT SESSION
 *
 * Creates a Stripe Checkout session for subscribing to a platform tier.
 * Supports B2B checkout with tax ID collection for EU reverse charge.
 */
export const createPlatformCheckoutSession = action({
  args: {
    organizationId: v.id("organizations"),
    organizationName: v.string(),
    email: v.string(),
    tier: v.union(
      v.literal("pro"),
      v.literal("scale"),
      v.literal("agency"),
    ),
    billingPeriod: v.union(v.literal("monthly"), v.literal("annual")),
    successUrl: v.string(),
    cancelUrl: v.string(),
    // Optional B2B fields
    isB2B: v.optional(v.boolean()),
    funnelChannel: v.optional(
      v.union(
        v.literal("webchat"),
        v.literal("native_guest"),
        v.literal("telegram"),
        v.literal("platform_web"),
        v.literal("unknown")
      )
    ),
    funnelCampaign: v.optional(
      v.object({
        source: v.optional(v.string()),
        medium: v.optional(v.string()),
        campaign: v.optional(v.string()),
        content: v.optional(v.string()),
        term: v.optional(v.string()),
        referrer: v.optional(v.string()),
        landingPath: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();
    const runtimeTier = normalizeCheckoutTierInput(args.tier);
    const publicTier = mapRuntimeCheckoutTierToStorePublicTier(runtimeTier);

    // Get organization and existing billing details
    const org = await (ctx as any).runQuery(generatedApi.api.organizations.get, { id: args.organizationId });

    // Query for stored billing details
    const billingDetails = await (ctx as any).runQuery(generatedApi.internal.stripe.platformCheckout.getOrganizationBillingDetails, {
      organizationId: args.organizationId,
    });

    const license = await (ctx as any).runQuery(
      generatedApi.api.licensing.helpers.getLicense,
      { organizationId: args.organizationId }
    );
    const hadPreviousScaleTrial =
      runtimeTier === "agency"
        ? await (ctx as any).runQuery(
            generatedApi.internal.stripe.trialHelpers.checkPreviousTrial,
            { organizationId: args.organizationId }
          )
        : false;
    const isScaleTrialEligible =
      runtimeTier === "agency" &&
      (license?.planTier || "free") === "free" &&
      !hadPreviousScaleTrial;
    const checkoutType = isScaleTrialEligible ? "platform-trial" : "platform-tier";
    const trialStartedAt = Date.now().toString();

    // Prepare customer data with stored billing address if available
    const customerData: Stripe.CustomerCreateParams = {
      name: billingDetails?.billingName || args.organizationName,
      email: billingDetails?.billingEmail || args.email,
      metadata: {
        organizationId: args.organizationId,
        userEmail: args.email,
        platform: "l4yercak3",
        isB2B: args.isB2B ? "true" : "false",
      },
      // Pre-fill billing address if we have it stored
      ...(billingDetails?.billingAddress && {
        address: {
          line1: billingDetails.billingAddress.line1,
          line2: billingDetails.billingAddress.line2 || undefined,
          city: billingDetails.billingAddress.city,
          state: billingDetails.billingAddress.state || undefined,
          postal_code: billingDetails.billingAddress.postalCode,
          country: billingDetails.billingAddress.country,
        },
      }),
    };

    let customerId: string;
    if (org?.stripeCustomerId) {
      // Verify existing customer
      try {
        const customer = await stripe.customers.retrieve(org.stripeCustomerId);
        if (!customer.deleted) {
          customerId = org.stripeCustomerId;

          // Update customer with stored billing address if available
          if (billingDetails?.billingAddress) {
            await stripe.customers.update(customerId, {
              name: billingDetails.billingName || args.organizationName,
              email: billingDetails.billingEmail || args.email,
              address: {
                line1: billingDetails.billingAddress.line1,
                line2: billingDetails.billingAddress.line2 || undefined,
                city: billingDetails.billingAddress.city,
                state: billingDetails.billingAddress.state || undefined,
                postal_code: billingDetails.billingAddress.postalCode,
                country: billingDetails.billingAddress.country,
              },
            });
            console.log(`[Platform Checkout] Pre-filled billing address for customer ${customerId}`);
          }
        } else {
          throw new Error("Customer deleted");
        }
      } catch {
        // Create new customer if verification fails
        const customer = await stripe.customers.create(customerData);
        customerId = customer.id;
        await (ctx as any).runMutation(generatedApi.internal.organizations.updateStripeCustomer, {
          organizationId: args.organizationId,
          stripeCustomerId: customer.id,
        });
      }
    } else {
      // Create new customer with billing address if available
      const customer = await stripe.customers.create(customerData);
      customerId = customer.id;
      await (ctx as any).runMutation(generatedApi.internal.organizations.updateStripeCustomer, {
        organizationId: args.organizationId,
        stripeCustomerId: customer.id,
      });
    }

    // Determine price ID based on tier and billing period
    const priceId = TIER_PRICE_IDS[args.billingPeriod][runtimeTier];
    const billingPeriodSuffix = args.billingPeriod === "monthly" ? "MO" : "YR";

    if (!priceId) {
      throw new Error(`Price ID not configured for tier: ${runtimeTier} (${args.billingPeriod}). Please set STRIPE_PLATFORM_${runtimeTier.toUpperCase()}_${billingPeriodSuffix}_PRICE_ID environment variable.`);
    }
    const byokCommercialPolicy = resolveByokCommercialPolicyForTier(runtimeTier);
    const byokCommercialMetadata = buildByokCommercialPolicyMetadata(
      byokCommercialPolicy
    );

    // Prepare checkout session parameters
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      // Save billing address to customer for automatic tax calculation
      customer_update: {
        address: "auto",
        name: "auto",
      },
      // Allow customers to reuse existing payment methods
      payment_method_collection: "if_required",
      automatic_tax: {
        enabled: true,
      },
      tax_id_collection: {
        enabled: true,
      },
      metadata: {
        organizationId: args.organizationId,
        tier: runtimeTier,
        publicTier,
        billingPeriod: args.billingPeriod,
        platform: "l4yercak3",
        type: checkoutType,
        isB2B: args.isB2B ? "true" : "false",
        ...(isScaleTrialEligible ? { trialStartedAt } : {}),
        ...byokCommercialMetadata,
        ...(args.funnelChannel ? { funnelChannel: args.funnelChannel } : {}),
        ...(args.funnelCampaign?.source ? { utmSource: args.funnelCampaign.source } : {}),
        ...(args.funnelCampaign?.medium ? { utmMedium: args.funnelCampaign.medium } : {}),
        ...(args.funnelCampaign?.campaign ? { utmCampaign: args.funnelCampaign.campaign } : {}),
        ...(args.funnelCampaign?.content ? { utmContent: args.funnelCampaign.content } : {}),
        ...(args.funnelCampaign?.term ? { utmTerm: args.funnelCampaign.term } : {}),
        ...(args.funnelCampaign?.referrer ? { funnelReferrer: args.funnelCampaign.referrer } : {}),
        ...(args.funnelCampaign?.landingPath ? { funnelLandingPath: args.funnelCampaign.landingPath } : {}),
      },
      subscription_data: {
        ...(isScaleTrialEligible ? { trial_period_days: SCALE_STORE_TRIAL_DAYS } : {}),
        metadata: {
          organizationId: args.organizationId,
          tier: runtimeTier,
          publicTier,
          billingPeriod: args.billingPeriod,
          platform: "l4yercak3",
          type: checkoutType,
          ...(isScaleTrialEligible ? { trialStartedAt } : {}),
          ...byokCommercialMetadata,
          ...(args.funnelChannel ? { funnelChannel: args.funnelChannel } : {}),
          ...(args.funnelCampaign?.source ? { utmSource: args.funnelCampaign.source } : {}),
          ...(args.funnelCampaign?.medium ? { utmMedium: args.funnelCampaign.medium } : {}),
          ...(args.funnelCampaign?.campaign ? { utmCampaign: args.funnelCampaign.campaign } : {}),
          ...(args.funnelCampaign?.content ? { utmContent: args.funnelCampaign.content } : {}),
          ...(args.funnelCampaign?.term ? { utmTerm: args.funnelCampaign.term } : {}),
          ...(args.funnelCampaign?.referrer ? { funnelReferrer: args.funnelCampaign.referrer } : {}),
          ...(args.funnelCampaign?.landingPath ? { funnelLandingPath: args.funnelCampaign.landingPath } : {}),
        },
      },
    };

    // Create Checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      checkoutUrl: session.url!,
      sessionId: session.id,
    };
  },
});

/**
 * INTERNAL QUERY: Get organization billing details
 *
 * Retrieves stored billing address and tax information from organization_billing object.
 * Used to pre-fill Stripe Checkout with existing billing data.
 */
export const getOrganizationBillingDetails = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{
    isB2B: boolean;
    billingEmail?: string;
    billingName?: string;
    billingAddress?: {
      line1: string;
      line2?: string;
      city: string;
      state?: string;
      postalCode: string;
      country: string;
    };
    taxIds?: Array<{ type: string; value: string }>;
  } | null> => {
    // Query the organization_billing object
    const billingObject = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "organization_billing")
      )
      .first();

    if (!billingObject || !billingObject.customProperties) {
      return null;
    }

    const props = billingObject.customProperties as Record<string, any>;

    return {
      isB2B: props.isB2B || false,
      billingEmail: props.billingEmail,
      billingName: props.billingName,
      billingAddress: props.billingAddress,
      taxIds: props.taxIds,
    };
  },
});

/**
 * TIER HIERARCHY FOR UPGRADE/DOWNGRADE DETECTION
 */
const TIER_ORDER: Record<string, number> = {
  free: 0,
  pro: 1,
  starter: 1,        // Legacy - same level as pro
  community: 1,      // Legacy - same level as pro
  professional: 1,   // Legacy - same level as pro
  agency: 2,
  enterprise: 3,
};

/**
 * MANAGE PLATFORM SUBSCRIPTION
 *
 * Handles subscription changes for organizations with existing subscriptions:
 * - Upgrades: Immediate change with proration (credit for unused time)
 * - Downgrades: Scheduled at period end (keeps current tier until period ends)
 * - Cancel to Free: Sets cancel_at_period_end: true
 *
 * Returns appropriate action based on the change type.
 */
export const managePlatformSubscription = action({
  args: {
    organizationId: v.id("organizations"),
    newTier: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("agency"),
      v.literal("enterprise")
    ),
    billingPeriod: v.union(v.literal("monthly"), v.literal("annual")),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    action: "upgrade" | "downgrade" | "cancel" | "no_change" | "no_subscription";
    message: string;
    effectiveDate?: number;
    checkoutUrl?: string;
  }> => {
    const stripe = getStripe();

    // Get organization with subscription info
    const org = await (ctx as any).runQuery(generatedApi.api.organizations.get, { id: args.organizationId });

    if (!org) {
      return {
        success: false,
        action: "no_subscription",
        message: "Organization not found",
      };
    }

    // Get current plan tier from license (single source of truth)
    const license = await (ctx as any).runQuery(generatedApi.api.licensing.helpers.getLicense, { organizationId: args.organizationId });
    const currentTier = license.planTier || "free";
    const currentTierOrder = TIER_ORDER[currentTier] ?? 0;
    const newTierOrder = TIER_ORDER[args.newTier] ?? 0;

    // No change needed
    if (currentTier === args.newTier) {
      return {
        success: true,
        action: "no_change",
        message: "You are already on this plan",
      };
    }

    // Check if org has a Stripe subscription
    if (!org.stripeSubscriptionId) {
      // No existing subscription - need to go through checkout
      if (args.newTier === "free") {
        return {
          success: true,
          action: "no_change",
          message: "You are already on the Free plan",
        };
      }

      return {
        success: false,
        action: "no_subscription",
        message: "No active subscription. Please use checkout to subscribe.",
      };
    }

    // Get subscription from Stripe
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let subscription: any;
    try {
      subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
    } catch (error) {
      console.error("[Platform Subscription] Failed to retrieve subscription:", error);
      return {
        success: false,
        action: "no_subscription",
        message: "Could not retrieve subscription. Please contact support.",
      };
    }

    // CANCEL TO FREE
    if (args.newTier === "free") {
      // If subscription has a schedule, release it first before canceling
      if (subscription.schedule) {
        try {
          await stripe.subscriptionSchedules.release(subscription.schedule as string);
        } catch (releaseError) {
          console.warn("[Platform Subscription] Failed to release schedule before cancel:", releaseError);
        }
      }

      // Set subscription to cancel at period end
      await stripe.subscriptions.update(org.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      const periodEnd = subscription.current_period_end * 1000;

      return {
        success: true,
        action: "cancel",
        message: `Your subscription will be canceled and you will move to the Free plan on ${new Date(periodEnd).toLocaleDateString()}`,
        effectiveDate: periodEnd,
      };
    }

    // Get the price ID for the new tier
    const priceId = TIER_PRICE_IDS[args.billingPeriod][args.newTier];
    if (!priceId) {
      return {
        success: false,
        action: "no_subscription",
        message: `Price not configured for ${args.newTier} (${args.billingPeriod})`,
      };
    }
    const byokCommercialPolicy = resolveByokCommercialPolicyForTier(args.newTier);
    const byokCommercialMetadata = buildByokCommercialPolicyMetadata(
      byokCommercialPolicy
    );

    // UPGRADE (immediate with proration credit)
    if (newTierOrder > currentTierOrder) {
      // If subscription has a schedule (e.g. pending downgrade), release it first
      if (subscription.schedule) {
        try {
          await stripe.subscriptionSchedules.release(subscription.schedule as string);
        } catch (releaseError) {
          console.warn("[Platform Subscription] Failed to release schedule before upgrade:", releaseError);
        }
      }

      await stripe.subscriptions.update(org.stripeSubscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: priceId,
          },
        ],
        proration_behavior: "create_prorations",
        metadata: {
          ...subscription.metadata,
          tier: args.newTier,
          billingPeriod: args.billingPeriod,
          ...byokCommercialMetadata,
        },
      });

      return {
        success: true,
        action: "upgrade",
        message: `Upgraded to ${args.newTier.charAt(0).toUpperCase() + args.newTier.slice(1)} plan! Your account has been updated.`,
        effectiveDate: Date.now(),
      };
    }

    // DOWNGRADE (scheduled at period end)
    if (newTierOrder < currentTierOrder) {
      // Use Stripe's subscription schedule to change at period end
      // Create a schedule from the existing subscription

      try {
        // Create a schedule if one doesn't exist
        if (!subscription.schedule) {
          const schedule = await stripe.subscriptionSchedules.create({
            from_subscription: org.stripeSubscriptionId,
          });

          // Update the schedule to change the plan at renewal
          // IMPORTANT: When updating a schedule, we must include start_date on the first phase
          // to anchor all dates. The start_date is the current period start.
          await stripe.subscriptionSchedules.update(schedule.id, {
            end_behavior: "release",
            phases: [
              {
                // Current phase - keep existing plan until period end
                start_date: subscription.current_period_start, // Anchor date required
                items: [
                  {
                    price: subscription.items.data[0].price.id,
                    quantity: 1,
                  },
                ],
                end_date: subscription.current_period_end,
              },
              {
                // Next phase - switch to new plan (start_date inherited from previous end_date)
                items: [
                  {
                    price: priceId,
                    quantity: 1,
                  },
                ],
                metadata: {
                  organizationId: args.organizationId,
                  tier: args.newTier,
                  billingPeriod: args.billingPeriod,
                  platform: "l4yercak3",
                  type: "platform-tier",
                  ...byokCommercialMetadata,
                },
                // Last phase with end_behavior: release doesn't need end_date
              },
            ],
          });
        } else {
          // Update existing schedule
          const existingSchedule = await stripe.subscriptionSchedules.retrieve(
            subscription.schedule as string
          );

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const currentPhase = existingSchedule.phases[0] as any;
          await stripe.subscriptionSchedules.update(existingSchedule.id, {
            end_behavior: "release",
            phases: [
              {
                start_date: currentPhase.start_date, // Anchor date required
                items: currentPhase.items.map((item: { price: string | { id: string }; quantity?: number }) => ({
                  price: typeof item.price === "string" ? item.price : item.price.id,
                  quantity: item.quantity || 1,
                })),
                end_date: currentPhase.end_date,
              },
              {
                // Next phase - start_date inherited from previous end_date
                items: [
                  {
                    price: priceId,
                    quantity: 1,
                  },
                ],
                metadata: {
                  organizationId: args.organizationId,
                  tier: args.newTier,
                  billingPeriod: args.billingPeriod,
                  platform: "l4yercak3",
                  type: "platform-tier",
                  ...byokCommercialMetadata,
                },
              },
            ],
          });
        }

        const periodEnd = subscription.current_period_end * 1000;

        return {
          success: true,
          action: "downgrade",
          message: `Your plan will change to ${args.newTier.charAt(0).toUpperCase() + args.newTier.slice(1)} on ${new Date(periodEnd).toLocaleDateString()}. You'll keep your current features until then.`,
          effectiveDate: periodEnd,
        };
      } catch (scheduleError) {
        console.error("[Platform Subscription] Schedule error:", scheduleError);

        // Fallback: Use simpler approach - just update metadata to track pending downgrade
        // and let webhook handle it at renewal
        return {
          success: false,
          action: "downgrade",
          message: "Could not schedule downgrade automatically. Please contact support to schedule your plan change.",
        };
      }
    }

    return {
      success: false,
      action: "no_change",
      message: "Unexpected error",
    };
  },
});

/**
 * CANCEL SUBSCRIPTION DOWNGRADE
 *
 * Cancels a pending downgrade and keeps the current plan.
 */
export const cancelPendingDowngrade = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    const stripe = getStripe();

    const org = await (ctx as any).runQuery(generatedApi.api.organizations.get, { id: args.organizationId });

    if (!org?.stripeSubscriptionId) {
      return {
        success: false,
        message: "No active subscription found",
      };
    }

    const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);

    // If there's a schedule, release it first (this also clears cancel_at_period_end
    // if it was set through the schedule)
    if (subscription.schedule) {
      await stripe.subscriptionSchedules.release(subscription.schedule as string);

      // Re-fetch subscription after releasing schedule to check cancel state
      const refreshed = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
      if (refreshed.cancel_at_period_end) {
        await stripe.subscriptions.update(org.stripeSubscriptionId, {
          cancel_at_period_end: false,
        });
      }

      // Send sales team notification (non-blocking)
      try {
        const license = await (ctx as any).runQuery(generatedApi.api.licensing.helpers.getLicense, { organizationId: args.organizationId });
        await (ctx as any).runAction(generatedApi.internal.actions.salesNotificationEmail.sendSalesNotification, {
          eventType: "pending_change_reverted" as const,
          user: { email: org.email || "", firstName: org.name || "", lastName: "" },
          organization: { name: org.name || "Unknown", planTier: license?.planTier || "pro" },
          metadata: { tier: license?.planTier || "pro" },
        });
      } catch (e) {
        console.warn("[Platform Checkout] Failed to send revert notification:", e);
      }

      return {
        success: true,
        message: "Pending plan change has been canceled",
      };
    }

    // If subscription is set to cancel at period end (no schedule), reactivate it
    if (subscription.cancel_at_period_end) {
      await stripe.subscriptions.update(org.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      // Send sales team notification (non-blocking)
      try {
        const license = await (ctx as any).runQuery(generatedApi.api.licensing.helpers.getLicense, { organizationId: args.organizationId });
        await (ctx as any).runAction(generatedApi.internal.actions.salesNotificationEmail.sendSalesNotification, {
          eventType: "pending_change_reverted" as const,
          user: { email: org.email || "", firstName: org.name || "", lastName: "" },
          organization: { name: org.name || "Unknown", planTier: license?.planTier || "pro" },
          metadata: { tier: license?.planTier || "pro" },
        });
      } catch (e) {
        console.warn("[Platform Checkout] Failed to send revert notification:", e);
      }

      return {
        success: true,
        message: "Your subscription has been reactivated",
      };
    }

    return {
      success: true,
      message: "No pending changes to cancel",
    };
  },
});

/**
 * GET SUBSCRIPTION STATUS
 *
 * Returns current subscription details including pending changes.
 */
export const getSubscriptionStatus = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{
    hasSubscription: boolean;
    currentTier: string;
    currentPublicTier: "free" | "pro" | "scale" | "enterprise";
    scaleTrialEligible: boolean;
    billingPeriod?: string;
    currentPeriodEnd?: number;
    cancelAtPeriodEnd: boolean;
    pendingDowngrade?: {
      newTier: string;
      effectiveDate: number;
    };
    byokCommercialPolicy?: {
      mode: string;
      byokEligible: boolean;
      flatPlatformFeeCents: number;
      optionalSurchargeBps: number;
      bundledInTier: boolean;
      migrationDefault: boolean;
    };
  }> => {
    const stripe = getStripe();

    const org = await (ctx as any).runQuery(generatedApi.api.organizations.get, { id: args.organizationId });

    // Get current plan tier from license (single source of truth)
    const license = await (ctx as any).runQuery(generatedApi.api.licensing.helpers.getLicense, { organizationId: args.organizationId });
    const hadPreviousScaleTrial: boolean = await (ctx as any).runQuery(
      generatedApi.internal.stripe.trialHelpers.checkPreviousTrial,
      { organizationId: args.organizationId }
    );
    const scaleTrialEligible = (license?.planTier || "free") === "free" && !hadPreviousScaleTrial;

    if (!org?.stripeSubscriptionId) {
      const fallbackByokPolicy = resolveByokCommercialPolicyForTier(
        license?.planTier
      );
      return {
        hasSubscription: false,
        currentTier: license?.planTier || "free",
        currentPublicTier: mapRuntimeTierToPublicStoreTier(license?.planTier),
        scaleTrialEligible,
        cancelAtPeriodEnd: false,
        byokCommercialPolicy: {
          mode: fallbackByokPolicy.mode,
          byokEligible: fallbackByokPolicy.byokEligible,
          flatPlatformFeeCents: fallbackByokPolicy.flatPlatformFeeCents,
          optionalSurchargeBps: fallbackByokPolicy.optionalSurchargeBps,
          bundledInTier: fallbackByokPolicy.bundledInTier,
          migrationDefault: fallbackByokPolicy.migrationDefault,
        },
      };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subscription: any = await stripe.subscriptions.retrieve(org.stripeSubscriptionId, {
        expand: ["schedule"],
      });

      let pendingDowngrade: { newTier: string; effectiveDate: number } | undefined;

      // Check for pending schedule changes
      if (subscription.schedule) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const schedule = subscription.schedule as any;
        if (schedule.phases && schedule.phases.length > 1) {
          const nextPhase = schedule.phases[1];
          const nextPriceId = (nextPhase.items[0].price as string) || "";

          // Find the tier for this price
          let pendingTier: string | undefined;
          for (const period of ["monthly", "annual"] as const) {
            for (const [tier, priceId] of Object.entries(TIER_PRICE_IDS[period])) {
              if (priceId === nextPriceId) {
                pendingTier = tier;
                break;
              }
            }
            if (pendingTier) break;
          }

          if (pendingTier && pendingTier !== license.planTier) {
            pendingDowngrade = {
              newTier: pendingTier,
              effectiveDate: nextPhase.start_date * 1000,
            };
          }
        }
      }

      const byokPolicy = resolveByokCommercialPolicyFromMetadata({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (subscription.metadata ?? {}) as Record<string, string | undefined>,
        fallbackTier: license?.planTier,
      });

      return {
        hasSubscription: true,
        currentTier: license.planTier || "free",
        currentPublicTier: mapRuntimeTierToPublicStoreTier(license.planTier),
        scaleTrialEligible: false,
        billingPeriod: subscription.items.data[0].price.recurring?.interval === "year" ? "annual" : "monthly",
        currentPeriodEnd: subscription.current_period_end * 1000,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        pendingDowngrade,
        byokCommercialPolicy: {
          mode: byokPolicy.mode,
          byokEligible: byokPolicy.byokEligible,
          flatPlatformFeeCents: byokPolicy.flatPlatformFeeCents,
          optionalSurchargeBps: byokPolicy.optionalSurchargeBps,
          bundledInTier: byokPolicy.bundledInTier,
          migrationDefault: byokPolicy.migrationDefault,
        },
      };
    } catch (error) {
      console.error("[Platform Subscription] Error getting status:", error);
      const fallbackByokPolicy = resolveByokCommercialPolicyForTier(
        license?.planTier
      );
      return {
        hasSubscription: false,
        currentTier: license?.planTier || "free",
        currentPublicTier: mapRuntimeTierToPublicStoreTier(license?.planTier),
        scaleTrialEligible,
        cancelAtPeriodEnd: false,
        byokCommercialPolicy: {
          mode: fallbackByokPolicy.mode,
          byokEligible: fallbackByokPolicy.byokEligible,
          flatPlatformFeeCents: fallbackByokPolicy.flatPlatformFeeCents,
          optionalSurchargeBps: fallbackByokPolicy.optionalSurchargeBps,
          bundledInTier: fallbackByokPolicy.bundledInTier,
          migrationDefault: fallbackByokPolicy.migrationDefault,
        },
      };
    }
  },
});
