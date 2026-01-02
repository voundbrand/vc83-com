/**
 * STRIPE PLATFORM TIER CHECKOUT
 *
 * Handles Stripe Checkout session creation for platform tier subscriptions.
 * (Free, Community, Starter, Professional, Agency, Enterprise)
 *
 * This is separate from AI subscription billing (aiCheckout.ts).
 * Platform tiers control feature limits, not AI token usage.
 */

import { action, internalQuery } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";

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
 * These should be configured in Stripe Dashboard with metadata:
 * - tier: "starter" | "professional" | "agency" | "enterprise"
 * - type: "platform"
 *
 * Monthly and Annual prices are stored separately
 */
const TIER_PRICE_IDS = {
  monthly: {
    free: process.env.STRIPE_FREE_MO_PRICE_ID,
    community: process.env.STRIPE_COMMUNITY_MO_PRICE_ID,
    starter: process.env.STRIPE_STARTER_MO_PRICE_ID,
    professional: process.env.STRIPE_PROFESSIONAL_MO_PRICE_ID,
    agency: process.env.STRIPE_AGENCY_MO_PRICE_ID,
    enterprise: process.env.STRIPE_ENTERPRISE_MO_PRICE_ID,
  } as Record<string, string | undefined>,
  annual: {
    community: process.env.STRIPE_COMMUNITY_YR_PRICE_ID,
    starter: process.env.STRIPE_STARTER_YR_PRICE_ID,
    professional: process.env.STRIPE_PROFESSIONAL_YR_PRICE_ID,
    agency: process.env.STRIPE_AGENCY_YR_PRICE_ID,
    enterprise: process.env.STRIPE_ENTERPRISE_YR_PRICE_ID,
  } as Record<string, string | undefined>,
};

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
      v.literal("community"),
      v.literal("starter"),
      v.literal("professional"),
      v.literal("agency"),
      v.literal("enterprise")
    ),
    billingPeriod: v.union(v.literal("monthly"), v.literal("annual")),
    successUrl: v.string(),
    cancelUrl: v.string(),
    // Optional B2B fields
    isB2B: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();

    // Get organization and existing billing details
    const org = await ctx.runQuery(api.organizations.get, { id: args.organizationId });

    // Query for stored billing details
    const billingDetails = await ctx.runQuery(internal.stripe.platformCheckout.getOrganizationBillingDetails, {
      organizationId: args.organizationId,
    });

    // Prepare customer data with stored billing address if available
    const customerData: Stripe.CustomerCreateParams = {
      name: billingDetails?.billingName || args.organizationName,
      email: billingDetails?.billingEmail || args.email,
      metadata: {
        organizationId: args.organizationId,
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
        await ctx.runMutation(internal.organizations.updateStripeCustomer, {
          organizationId: args.organizationId,
          stripeCustomerId: customer.id,
        });
      }
    } else {
      // Create new customer with billing address if available
      const customer = await stripe.customers.create(customerData);
      customerId = customer.id;
      await ctx.runMutation(internal.organizations.updateStripeCustomer, {
        organizationId: args.organizationId,
        stripeCustomerId: customer.id,
      });
    }

    // Determine price ID based on tier and billing period
    const priceId = TIER_PRICE_IDS[args.billingPeriod][args.tier];
    const billingPeriodSuffix = args.billingPeriod === "monthly" ? "MO" : "YR";

    if (!priceId) {
      throw new Error(`Price ID not configured for tier: ${args.tier} (${args.billingPeriod}). Please set STRIPE_PLATFORM_${args.tier.toUpperCase()}_${billingPeriodSuffix}_PRICE_ID environment variable.`);
    }

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
        tier: args.tier,
        billingPeriod: args.billingPeriod,
        platform: "l4yercak3",
        type: "platform-tier",
        isB2B: args.isB2B ? "true" : "false",
      },
      subscription_data: {
        metadata: {
          organizationId: args.organizationId,
          tier: args.tier,
          billingPeriod: args.billingPeriod,
          platform: "l4yercak3",
          type: "platform-tier",
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
 * Token pack price IDs from environment variables
 */
const TOKEN_PACK_PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_TOKENS_STARTER_PRICE_ID,
  standard: process.env.STRIPE_TOKENS_STANDARD_PRICE_ID,
  professional: process.env.STRIPE_TOKENS_PRO_PRICE_ID,
  enterprise: process.env.STRIPE_TOKENS_ENT_PRICE_ID,
};

/**
 * CREATE TOKEN PACK CHECKOUT SESSION
 *
 * Creates a Stripe Checkout session for purchasing a one-time token pack.
 * Uses pre-defined Stripe price IDs from environment variables.
 */
export const createTokenPackCheckoutSession = action({
  args: {
    organizationId: v.id("organizations"),
    organizationName: v.string(),
    email: v.string(),
    tier: v.union(
      v.literal("starter"),
      v.literal("standard"),
      v.literal("professional"),
      v.literal("enterprise")
    ),
    packName: v.string(),
    tokens: v.number(),
    successUrl: v.string(),
    cancelUrl: v.string(),
    isB2B: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();

    // Get price ID from environment variables
    const priceId = TOKEN_PACK_PRICE_IDS[args.tier];
    if (!priceId) {
      throw new Error(`Price ID not configured for token pack tier: ${args.tier}. Please set STRIPE_TOKENS_${args.tier.toUpperCase()}_PRICE_ID environment variable.`);
    }

    // Get organization and existing billing details
    const org = await ctx.runQuery(api.organizations.get, { id: args.organizationId });

    // Query for stored billing details
    const billingDetails = await ctx.runQuery(internal.stripe.platformCheckout.getOrganizationBillingDetails, {
      organizationId: args.organizationId,
    });

    // Prepare customer data with stored billing address if available
    const customerData: Stripe.CustomerCreateParams = {
      name: billingDetails?.billingName || args.organizationName,
      email: billingDetails?.billingEmail || args.email,
      metadata: {
        organizationId: args.organizationId,
        platform: "l4yercak3",
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
            console.log(`[Token Pack Checkout] Pre-filled billing address for customer ${customerId}`);
          }
        } else {
          throw new Error("Customer deleted");
        }
      } catch {
        const customer = await stripe.customers.create(customerData);
        customerId = customer.id;
        await ctx.runMutation(internal.organizations.updateStripeCustomer, {
          organizationId: args.organizationId,
          stripeCustomerId: customer.id,
        });
      }
    } else {
      const customer = await stripe.customers.create(customerData);
      customerId = customer.id;
      await ctx.runMutation(internal.organizations.updateStripeCustomer, {
        organizationId: args.organizationId,
        stripeCustomerId: customer.id,
      });
    }

    // Create checkout session for one-time payment using pre-defined price
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
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
        type: "token-pack",
        tier: args.tier,
        tokens: args.tokens.toString(),
        platform: "l4yercak3",
        isB2B: args.isB2B ? "true" : "false",
      },
      payment_intent_data: {
        metadata: {
          organizationId: args.organizationId,
          type: "token-pack",
          tier: args.tier,
          tokens: args.tokens.toString(),
          platform: "l4yercak3",
        },
      },
    };

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
  community: 1,
  starter: 2,
  professional: 3,
  agency: 4,
  enterprise: 5,
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
      v.literal("community"),
      v.literal("starter"),
      v.literal("professional"),
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
    const org = await ctx.runQuery(api.organizations.get, { id: args.organizationId });

    if (!org) {
      return {
        success: false,
        action: "no_subscription",
        message: "Organization not found",
      };
    }

    // Get current plan tier from license (single source of truth)
    const license = await ctx.runQuery(api.licensing.helpers.getLicense, { organizationId: args.organizationId });
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

    // UPGRADE (immediate with proration credit)
    if (newTierOrder > currentTierOrder) {
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

    const org = await ctx.runQuery(api.organizations.get, { id: args.organizationId });

    if (!org?.stripeSubscriptionId) {
      return {
        success: false,
        message: "No active subscription found",
      };
    }

    const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);

    // If subscription is set to cancel at period end, reactivate it
    if (subscription.cancel_at_period_end) {
      await stripe.subscriptions.update(org.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });
      return {
        success: true,
        message: "Your subscription has been reactivated",
      };
    }

    // If there's a schedule, release it to keep current plan
    if (subscription.schedule) {
      await stripe.subscriptionSchedules.release(subscription.schedule as string);
      return {
        success: true,
        message: "Pending plan change has been canceled",
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
    billingPeriod?: string;
    currentPeriodEnd?: number;
    cancelAtPeriodEnd: boolean;
    pendingDowngrade?: {
      newTier: string;
      effectiveDate: number;
    };
  }> => {
    const stripe = getStripe();

    const org = await ctx.runQuery(api.organizations.get, { id: args.organizationId });

    // Get current plan tier from license (single source of truth)
    const license = await ctx.runQuery(api.licensing.helpers.getLicense, { organizationId: args.organizationId });

    if (!org?.stripeSubscriptionId) {
      return {
        hasSubscription: false,
        currentTier: license?.planTier || "free",
        cancelAtPeriodEnd: false,
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

      return {
        hasSubscription: true,
        currentTier: license.planTier || "free",
        billingPeriod: subscription.items.data[0].price.recurring?.interval === "year" ? "annual" : "monthly",
        currentPeriodEnd: subscription.current_period_end * 1000,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        pendingDowngrade,
      };
    } catch (error) {
      console.error("[Platform Subscription] Error getting status:", error);
      return {
        hasSubscription: false,
        currentTier: license?.planTier || "free",
        cancelAtPeriodEnd: false,
      };
    }
  },
});
