/**
 * STRIPE AI BILLING CHECKOUT
 *
 * Handles Stripe Checkout session creation for AI subscription billing.
 * Uses Convex actions to securely interact with Stripe API.
 */

import { action, internalAction } from "../_generated/server";
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
 * GET OR CREATE STRIPE CUSTOMER
 *
 * Finds existing Stripe customer or creates a new one for the organization.
 * Internal action called by createAICheckoutSession.
 */
const getOrCreateStripeCustomerInternal = internalAction({
  args: {
    organizationId: v.id("organizations"),
    organizationName: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();

    // Check if organization already has a Stripe customer ID
    const org = await ctx.runQuery(
      api.organizations.get,
      { id: args.organizationId }
    );

    // If customer ID exists, verify it's valid
    if (org?.stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(org.stripeCustomerId);
        if (!customer.deleted) {
          return org.stripeCustomerId;
        }
      } catch (error) {
        console.error("Invalid Stripe customer ID, creating new one:", error);
      }
    }

    // Create new customer
    const customer = await stripe.customers.create({
      name: args.organizationName,
      email: args.email,
      metadata: {
        organizationId: args.organizationId,
        platform: "L4YERCAK3",
      },
    });

    // Store customer ID in organization
    await ctx.runMutation(
      internal.organizations.updateStripeCustomer,
      {
        organizationId: args.organizationId,
        stripeCustomerId: customer.id,
      }
    );

    return customer.id;
  },
});

/**
 * CREATE CHECKOUT SESSION
 *
 * Creates a Stripe Checkout session for subscribing to an AI tier.
 */
export const createAICheckoutSession = action({
  args: {
    organizationId: v.id("organizations"),
    organizationName: v.string(),
    email: v.string(),
    tier: v.union(
      v.literal("standard"),
      v.literal("privacy-enhanced")
    ),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();

    // Get or create Stripe customer
    // Get or create Stripe customer
    const org = await ctx.runQuery(api.organizations.get, { id: args.organizationId });

    let customerId: string;
    if (org?.stripeCustomerId) {
      // Verify existing customer
      try {
        const customer = await stripe.customers.retrieve(org.stripeCustomerId);
        if (!customer.deleted) {
          customerId = org.stripeCustomerId;
        } else {
          throw new Error("Customer deleted");
        }
      } catch (error) {
        // Create new customer if verification fails
        const customer = await stripe.customers.create({
          name: args.organizationName,
          email: args.email,
          metadata: {
            organizationId: args.organizationId,
            platform: "L4YERCAK3",
          },
        });
        customerId = customer.id;
        await ctx.runMutation(internal.organizations.updateStripeCustomer, {
          organizationId: args.organizationId,
          stripeCustomerId: customer.id,
        });
      }
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        name: args.organizationName,
        email: args.email,
        metadata: {
          organizationId: args.organizationId,
          platform: "L4YERCAK3",
        },
      });
      customerId = customer.id;
      await ctx.runMutation(internal.organizations.updateStripeCustomer, {
        organizationId: args.organizationId,
        stripeCustomerId: customer.id,
      });
    }

    // Determine price ID based on tier
    const priceId = args.tier === "standard"
      ? process.env.NEXT_PUBLIC_STRIPE_AI_STANDARD_PRICE_ID
      : process.env.NEXT_PUBLIC_STRIPE_AI_PRIVACY_ENHANCED_PRICE_ID;

    if (!priceId) {
      throw new Error(`Price ID not configured for tier: ${args.tier}`);
    }

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
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
      billing_address_collection: "auto",
      automatic_tax: {
        enabled: true,
      },
      metadata: {
        organizationId: args.organizationId,
        tier: args.tier,
        platform: "L4YERCAK3",
      },
      subscription_data: {
        metadata: {
          organizationId: args.organizationId,
          tier: args.tier,
          platform: "L4YERCAK3",
        },
      },
    });

    return {
      checkoutUrl: session.url!,
      sessionId: session.id,
    };
  },
});

/**
 * CREATE CUSTOMER PORTAL SESSION
 *
 * Creates a Stripe Customer Portal session for managing subscription.
 */
export const createCustomerPortalSession = action({
  args: {
    organizationId: v.id("organizations"),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();

    // Get organization's Stripe customer ID
    const org = await ctx.runQuery(
      api.organizations.get,
      { id: args.organizationId }
    );

    if (!org?.stripeCustomerId) {
      throw new Error("No Stripe customer found for this organization");
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: args.returnUrl,
    });

    return {
      portalUrl: session.url,
    };
  },
});
