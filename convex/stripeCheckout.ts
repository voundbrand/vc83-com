/**
 * STRIPE CHECKOUT ACTIONS
 *
 * Convex actions for creating Stripe checkout sessions with tax support.
 * Integrates with organizationTaxSettings to apply automatic tax calculation.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";

const generatedApi: any = require("./_generated/api");

/**
 * CREATE STRIPE CHECKOUT SESSION WITH TAX
 *
 * Creates a Stripe Checkout Session with automatic tax calculation
 * based on organization tax settings.
 */
export const createStripeCheckoutSession = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    items: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        price: v.number(), // in cents
        currency: v.string(),
        quantity: v.number(),
        taxCode: v.optional(v.string()),
        taxBehavior: v.optional(
          v.union(v.literal("inclusive"), v.literal("exclusive"), v.literal("automatic"))
        ),
        taxable: v.optional(v.boolean()),
      })
    ),
    customerEmail: v.string(),
    customerAddress: v.optional(
      v.object({
        addressLine1: v.string(),
        addressLine2: v.optional(v.string()),
        city: v.string(),
        state: v.optional(v.string()),
        postalCode: v.string(),
        country: v.string(),
      })
    ),
    // B2B transaction support
    isB2B: v.optional(v.boolean()),
    taxId: v.optional(v.string()), // VAT/Tax ID for B2B customers
    taxIdType: v.optional(v.string()), // Type of tax ID (e.g., "eu_vat", "gb_vat", "us_ein")
    successUrl: v.string(),
    cancelUrl: v.string(),
    metadata: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    // Initialize Stripe
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-10-29.clover",
    });

    // Load organization tax settings
    const taxSettings = await (ctx as any).runQuery(generatedApi.api.organizationTaxSettings.getTaxSettings, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
    });

    // Prepare line items with tax configuration
    const lineItems = args.items.map((item) => {
      const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
        price_data: {
          currency: item.currency.toLowerCase(),
          product_data: {
            name: item.name,
          },
          unit_amount: item.price,
        },
        quantity: item.quantity,
      };

      // Apply tax configuration if enabled
      if (taxSettings?.customProperties?.taxEnabled) {
        // Set tax code (from item, product, or default)
        const taxCode =
          item.taxCode ||
          taxSettings.customProperties?.defaultTaxCode ||
          "txcd_10000000"; // General tangible goods

        lineItem.price_data!.tax_behavior =
          item.taxBehavior ||
          taxSettings.customProperties?.defaultTaxBehavior ||
          "exclusive";

        // Add tax code to product data
        if (lineItem.price_data && lineItem.price_data.product_data) {
          lineItem.price_data.product_data.tax_code = taxCode;
        }
      }

      return lineItem;
    });

    // Build session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: lineItems,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      customer_email: args.customerEmail,
      metadata: {
        organizationId: args.organizationId,
        ...args.metadata,
      },
    };

    // Enable automatic tax if configured
    if (taxSettings?.customProperties?.taxEnabled) {
      sessionParams.automatic_tax = {
        enabled: taxSettings.customProperties?.stripeSettings?.taxCalculationEnabled ?? true,
      };

      // Add billing address collection for tax calculation
      if (args.customerAddress) {
        sessionParams.billing_address_collection = "required";
        // Note: Stripe Checkout collects address, we can't pre-fill it via API
        // Customer will enter their address during checkout for tax calculation
      } else {
        sessionParams.billing_address_collection = "auto";
      }

      // B2B Tax ID Support
      // Stripe Tax will automatically apply reverse charge for EU B2B with valid VAT
      if (args.isB2B && args.taxId && args.taxIdType) {
        // Pass tax ID data to Stripe for validation and reverse charge
        sessionParams.tax_id_collection = {
          enabled: true, // Enable tax ID collection in checkout
        };

        // Store the tax ID in metadata so we can validate it after checkout
        sessionParams.metadata = {
          ...sessionParams.metadata,
          isB2B: "true",
          customerTaxId: args.taxId,
          customerTaxIdType: args.taxIdType,
        };
      }
    }

    // Create Stripe Checkout Session
    try {
      const session = await stripe.checkout.sessions.create(sessionParams);

      return {
        sessionId: session.id,
        url: session.url,
        status: session.status,
        totalAmount: session.amount_total,
        subtotal: session.amount_subtotal,
        taxAmount: session.total_details?.amount_tax || 0,
      };
    } catch (error) {
      console.error("Failed to create Stripe Checkout Session:", error);
      throw new Error(
        `Stripe checkout session creation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

/**
 * VALIDATE STRIPE CHECKOUT SESSION
 *
 * Retrieves a Stripe Checkout Session to verify payment status.
 */
export const validateStripeCheckoutSession = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Initialize Stripe
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-10-29.clover",
    });

    try {
      const session = await stripe.checkout.sessions.retrieve(args.sessionId, {
        expand: ["payment_intent", "line_items", "total_details"],
      });

      return {
        valid: true,
        session: {
          id: session.id,
          status: session.status,
          paymentStatus: session.payment_status,
          customerEmail: session.customer_email,
          totalAmount: session.amount_total,
          subtotal: session.amount_subtotal,
          taxAmount: session.total_details?.amount_tax || 0,
          currency: session.currency,
          metadata: session.metadata,
          paymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id,
        },
      };
    } catch (error) {
      console.error("Failed to validate Stripe Checkout Session:", error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * CANCEL STRIPE CHECKOUT SESSION
 *
 * Expires a Stripe Checkout Session (if not yet completed).
 */
export const cancelStripeCheckoutSession = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Initialize Stripe
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-10-29.clover",
    });

    try {
      const session = await stripe.checkout.sessions.expire(args.sessionId);

      return {
        success: true,
        status: session.status,
      };
    } catch (error) {
      console.error("Failed to cancel Stripe Checkout Session:", error);
      throw new Error(
        `Stripe checkout session cancellation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});
