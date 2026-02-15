/**
 * AGENCY TRIAL CHECKOUT
 *
 * Creates a Stripe Checkout Session with a 14-day free trial.
 * Collects payment method upfront but doesn't charge until trial ends.
 *
 * Note: Query/mutation helpers (checkPreviousTrial, recordTrialStart, etc.)
 * are in trialHelpers.ts because Convex Node.js files can only export actions.
 */

"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";
import { internal } from "../_generated/api";

/**
 * Create a checkout session for the 14-day Agency trial.
 */
export const createAgencyTrialCheckout = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ checkoutUrl: string | null; sessionId: string }> => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    // 1. Check current license — don't allow trial if already on paid tier
    const license = await ctx.runQuery(
      internal.licensing.helpers.getLicenseInternalQuery,
      { organizationId: args.organizationId }
    );

    if (license.exists && license.planTier !== "free") {
      throw new Error(
        `Organization is already on ${license.planTier} tier. Trials are only for free-tier organizations.`
      );
    }

    // 2. Check if org already had a trial (prevent trial abuse)
    const hadTrial: boolean = await ctx.runQuery(
      internal.stripe.trialHelpers.checkPreviousTrial,
      { organizationId: args.organizationId }
    );

    if (hadTrial) {
      throw new Error(
        "This organization has already used a free trial. Please subscribe directly."
      );
    }

    // 3. Get org details for Stripe
    const org = await ctx.runQuery(
      internal.stripe.platformWebhooks.getOrganizationInternal,
      { organizationId: args.organizationId }
    );

    if (!org) {
      throw new Error("Organization not found");
    }

    // 4. Get or create Stripe customer
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-10-29.clover" as Stripe.LatestApiVersion,
    });

    let stripeCustomerId = (org as unknown as Record<string, unknown>).stripeCustomerId as string | undefined;

    if (!stripeCustomerId) {
      // Get primary user email for Stripe customer
      const members: Array<{ isActive: boolean; user?: { email?: string } | null }> = await ctx.runQuery(
        internal.stripe.platformWebhooks.getOrganizationMembers,
        { organizationId: args.organizationId }
      );

      const primaryMember = members.find((m) => m.isActive);
      const email: string | undefined = primaryMember?.user?.email;

      const customer: Stripe.Customer = await stripe.customers.create({
        email: email || undefined,
        name: org.name,
        metadata: {
          organizationId: args.organizationId,
          platform: "l4yercak3",
        },
      });

      stripeCustomerId = customer.id;

      // Save Stripe customer ID to org
      await ctx.runMutation(
        internal.stripe.platformWebhooks.updateOrganizationPlan,
        {
          organizationId: args.organizationId,
          plan: "free",
          stripeCustomerId: stripeCustomerId,
        }
      );
    }

    // 5. Get the Agency price ID from env (configured in Stripe Dashboard)
    const agencyPriceId = process.env.STRIPE_AGENCY_PRICE_ID;
    if (!agencyPriceId) {
      throw new Error("STRIPE_AGENCY_PRICE_ID not configured");
    }

    // 6. Create checkout session with trial
    const session: Stripe.Checkout.Session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_collection: "always",
      line_items: [
        {
          price: agencyPriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          organizationId: args.organizationId,
          tier: "agency",
          type: "platform-trial",
          trialStartedAt: Date.now().toString(),
        },
      },
      metadata: {
        organizationId: args.organizationId,
        tier: "agency",
        type: "platform-trial",
      },
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      allow_promotion_codes: true,
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  },
});
