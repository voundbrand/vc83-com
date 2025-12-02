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
        platform: "l4yercak3",
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
 * Supports B2B checkout with tax ID collection for EU reverse charge.
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
    // Optional B2B fields
    isB2B: v.optional(v.boolean()),
    taxId: v.optional(v.string()),
    taxIdType: v.optional(v.string()), // e.g., "eu_vat", "gb_vat", "us_ein"
    companyName: v.optional(v.string()), // Business name for invoice
    billingAddress: v.optional(v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.optional(v.string()),
      postalCode: v.string(),
      country: v.string(), // ISO 2-letter code
    })),
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();

    // Get or create Stripe customer
    // Get or create Stripe customer
    const org = await ctx.runQuery(api.organizations.get, { id: args.organizationId });

    // Prepare customer data with B2B support
    const customerData: Stripe.CustomerCreateParams = {
      name: args.companyName || args.organizationName,
      email: args.email,
      metadata: {
        organizationId: args.organizationId,
        platform: "l4yercak3",
        isB2B: args.isB2B ? "true" : "false",
      },
      // Add billing address if provided
      ...(args.billingAddress && {
        address: {
          line1: args.billingAddress.line1,
          line2: args.billingAddress.line2,
          city: args.billingAddress.city,
          state: args.billingAddress.state,
          postal_code: args.billingAddress.postalCode,
          country: args.billingAddress.country,
        },
      }),
      // Add tax ID if provided (for B2B)
      ...(args.isB2B && args.taxId && args.taxIdType && {
        tax_id_data: [{
          type: args.taxIdType as Stripe.CustomerCreateParams.TaxIdDatum.Type,
          value: args.taxId,
        }],
      }),
    };

    let customerId: string;
    if (org?.stripeCustomerId) {
      // Verify existing customer
      try {
        const customer = await stripe.customers.retrieve(org.stripeCustomerId);
        if (!customer.deleted) {
          customerId = org.stripeCustomerId;
          // Update customer with new B2B information if provided
          if (args.isB2B || args.billingAddress) {
            await stripe.customers.update(customerId, {
              ...(args.companyName && { name: args.companyName }),
              ...(args.billingAddress && {
                address: {
                  line1: args.billingAddress.line1,
                  line2: args.billingAddress.line2,
                  city: args.billingAddress.city,
                  state: args.billingAddress.state,
                  postal_code: args.billingAddress.postalCode,
                  country: args.billingAddress.country,
                },
              }),
              metadata: {
                ...customer.metadata,
                isB2B: args.isB2B ? "true" : "false",
              },
            });
          }
        } else {
          throw new Error("Customer deleted");
        }
      } catch (error) {
        // Create new customer if verification fails
        const customer = await stripe.customers.create(customerData);
        customerId = customer.id;
        await ctx.runMutation(internal.organizations.updateStripeCustomer, {
          organizationId: args.organizationId,
          stripeCustomerId: customer.id,
        });
      }
    } else {
      // Create new customer
      const customer = await stripe.customers.create(customerData);
      customerId = customer.id;
      await ctx.runMutation(internal.organizations.updateStripeCustomer, {
        organizationId: args.organizationId,
        stripeCustomerId: customer.id,
      });
    }

    // Determine price ID based on tier
    const priceId = args.tier === "standard"
      ? process.env.STRIPE_AI_STANDARD_PRICE_ID
      : process.env.STRIPE_AI_PRIVACY_ENHANCED_PRICE_ID;

    if (!priceId) {
      throw new Error(`Price ID not configured for tier: ${args.tier}`);
    }

    // Prepare checkout session parameters
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer_email: args.email, // Use email instead of customer ID to allow fresh checkout
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
      billing_address_collection: "required", // Required for tax calculation
      automatic_tax: {
        enabled: true,
      },
      // Note: Invoices are automatically created for subscriptions by Stripe
      // Configure auto-email in Stripe Dashboard → Settings → Billing → Automatic emails
      metadata: {
        organizationId: args.organizationId,
        tier: args.tier,
        platform: "l4yercak3",
        isB2B: args.isB2B ? "true" : "false",
        ...(args.taxId && { customerTaxId: args.taxId }),
        ...(args.taxIdType && { customerTaxIdType: args.taxIdType }),
      },
      subscription_data: {
        metadata: {
          organizationId: args.organizationId,
          tier: args.tier,
          platform: "l4yercak3",
          isB2B: args.isB2B ? "true" : "false",
        },
      },
    };

    // Always enable tax ID collection for business checkout
    // Stripe will show a toggle for personal/business and automatically apply EU reverse charge for valid VAT numbers
    sessionParams.tax_id_collection = {
      enabled: true, // Allow customer to enter tax ID during checkout
    };

    // If tax ID is pre-filled, add it to customer's tax IDs
    if (args.taxId && args.taxIdType) {
      sessionParams.metadata!.preFilledTaxId = "true";
    }

    // Create Checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);

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
