/**
 * AI SUBSCRIPTION WEBHOOK HANDLERS
 *
 * Handles Stripe webhook events for AI subscription billing.
 * Separate from Stripe Connect webhooks (used for payment processing).
 *
 * Events handled:
 * - customer.subscription.created - New AI subscription
 * - customer.subscription.updated - Subscription changes (upgrade/downgrade)
 * - customer.subscription.deleted - Subscription cancellation
 * - invoice.payment_succeeded - Successful payment (reset monthly tokens)
 * - invoice.payment_failed - Failed payment (suspend access)
 */

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * TOKEN LIMITS BY TIER
 *
 * Maps subscription tier to monthly token allowance.
 * Update these values if pricing changes.
 */
const TOKEN_LIMITS: Record<string, number> = {
  "standard": 500_000,           // 500K tokens/month
  "privacy-enhanced": 500_000,   // 500K tokens/month
  "private-llm-starter": 5_000_000,      // 5M tokens/month
  "private-llm-professional": 10_000_000, // 10M tokens/month
  "private-llm-enterprise": 999_999_999,  // Unlimited (very high limit)
};

/**
 * Get token limit for a tier
 */
function getTokenLimitForTier(tier: string, privateLLMTier?: string): number {
  if (tier === "private-llm" && privateLLMTier) {
    return TOKEN_LIMITS[`private-llm-${privateLLMTier}`] || 500_000;
  }
  return TOKEN_LIMITS[tier] || 500_000; // Default to 500K if unknown tier
}

/**
 * PROCESS AI SUBSCRIPTION WEBHOOK
 *
 * Main webhook processor for AI subscription events.
 */
export const processAIWebhook = internalAction({
  args: {
    eventType: v.string(),
    eventId: v.string(),
    eventData: v.string(), // JSON-stringified Stripe object
    created: v.number(),
  },
  handler: async (ctx, args) => {
    console.log(`[AI Webhooks] Processing: ${args.eventType} (${args.eventId})`);

    const data = JSON.parse(args.eventData);

    try {
      switch (args.eventType) {
        case "checkout.session.completed":
          // Route based on checkout type in metadata
          const checkoutType = data.metadata?.type;
          if (checkoutType === "platform-tier" || checkoutType === "token-pack") {
            // Route to platform webhook handler for platform checkouts
            console.log(`[AI Webhooks] Routing ${checkoutType} checkout to platform handler`);
            await ctx.runAction(internal.stripe.platformWebhooks.processPlatformWebhook, {
              eventType: args.eventType,
              eventId: args.eventId,
              eventData: args.eventData,
              created: args.created,
            });
          } else {
            // AI subscription checkout
            await handleCheckoutCompleted(ctx, data);
          }
          break;

        case "customer.subscription.created":
          // Route based on subscription type in metadata
          if (data.metadata?.type === "platform-tier" || data.metadata?.type === "token-pack") {
            console.log(`[AI Webhooks] Routing ${data.metadata.type} subscription.created to platform handler`);
            await ctx.runAction(internal.stripe.platformWebhooks.processPlatformWebhook, {
              eventType: args.eventType,
              eventId: args.eventId,
              eventData: args.eventData,
              created: args.created,
            });
          } else {
            await handleSubscriptionCreated(ctx, data);
          }
          break;

        case "customer.subscription.updated":
          // Route based on subscription type in metadata
          if (data.metadata?.type === "platform-tier" || data.metadata?.type === "token-pack") {
            console.log(`[AI Webhooks] Routing ${data.metadata.type} subscription.updated to platform handler`);
            await ctx.runAction(internal.stripe.platformWebhooks.processPlatformWebhook, {
              eventType: args.eventType,
              eventId: args.eventId,
              eventData: args.eventData,
              created: args.created,
            });
          } else {
            await handleSubscriptionUpdated(ctx, data);
          }
          break;

        case "customer.subscription.deleted":
          // Route based on subscription type in metadata
          if (data.metadata?.type === "platform-tier" || data.metadata?.type === "token-pack") {
            console.log(`[AI Webhooks] Routing ${data.metadata.type} subscription.deleted to platform handler`);
            await ctx.runAction(internal.stripe.platformWebhooks.processPlatformWebhook, {
              eventType: args.eventType,
              eventId: args.eventId,
              eventData: args.eventData,
              created: args.created,
            });
          } else {
            await handleSubscriptionDeleted(ctx, data);
          }
          break;

        case "invoice.payment_succeeded":
          await handlePaymentSucceeded(ctx, data);
          break;

        case "invoice.payment_failed":
          await handlePaymentFailed(ctx, data);
          break;

        default:
          console.log(`[AI Webhooks] Unhandled event type: ${args.eventType}`);
      }

      console.log(`[AI Webhooks] ✓ Successfully processed: ${args.eventType}`);
    } catch (error) {
      console.error(`[AI Webhooks] Error processing ${args.eventType}:`, error);
      throw error;
    }
  },
});

/**
 * Handle customer.subscription.created
 *
 * Called when a new AI subscription is created via Stripe Checkout.
 */
async function handleSubscriptionCreated(ctx: any, subscription: any) {
  const { metadata, customer, id, status, current_period_start, current_period_end, items } = subscription;

  const organizationId = metadata.organizationId as Id<"organizations">;
  const tier = metadata.tier || "standard";
  const privateLLMTier = metadata.privateLLMTier;

  if (!organizationId) {
    console.error("[AI Webhooks] No organizationId in subscription metadata");
    return;
  }

  // Get price from line items
  const priceId = items.data[0]?.price?.id;
  const amount = items.data[0]?.price?.unit_amount || 0;
  const currency = items.data[0]?.price?.currency || "eur";

  // Calculate token limit based on tier
  const includedTokensTotal = getTokenLimitForTier(tier, privateLLMTier);

  console.log(`[AI Webhooks] Creating subscription for org ${organizationId}: ${tier} tier, ${includedTokensTotal} tokens`);

  // Create subscription record in database
  await ctx.runMutation(internal.ai.billing.upsertSubscriptionFromStripeInternal, {
    organizationId: organizationId,
    stripeSubscriptionId: id,
    stripeCustomerId: customer,
    stripePriceId: priceId,
    status: status,
    tier: tier,
    privateLLMTier: privateLLMTier,
    currentPeriodStart: current_period_start * 1000, // Convert to milliseconds
    currentPeriodEnd: current_period_end * 1000,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    canceledAt: subscription.canceled_at ? subscription.canceled_at * 1000 : undefined,
    priceInCents: amount,
    currency: currency,
    includedTokensTotal: includedTokensTotal,
  });
}

/**
 * Handle customer.subscription.updated
 *
 * Called when subscription is changed (upgrade, downgrade, or renewal).
 */
async function handleSubscriptionUpdated(ctx: any, subscription: any) {
  const { metadata, customer, id, status, current_period_start, current_period_end, items } = subscription;

  const organizationId = metadata.organizationId as Id<"organizations">;
  const tier = metadata.tier || "standard";
  const privateLLMTier = metadata.privateLLMTier;

  if (!organizationId) {
    console.error("[AI Webhooks] No organizationId in subscription metadata");
    return;
  }

  const priceId = items.data[0]?.price?.id;
  const amount = items.data[0]?.price?.unit_amount || 0;
  const currency = items.data[0]?.price?.currency || "eur";

  // Calculate token limit (may have changed if tier upgraded/downgraded)
  const includedTokensTotal = getTokenLimitForTier(tier, privateLLMTier);

  console.log(`[AI Webhooks] Updating subscription for org ${organizationId}: ${tier} tier, ${includedTokensTotal} tokens`);

  // Update subscription record
  await ctx.runMutation(internal.ai.billing.upsertSubscriptionFromStripeInternal, {
    organizationId: organizationId,
    stripeSubscriptionId: id,
    stripeCustomerId: customer,
    stripePriceId: priceId,
    status: status,
    tier: tier,
    privateLLMTier: privateLLMTier,
    currentPeriodStart: current_period_start * 1000,
    currentPeriodEnd: current_period_end * 1000,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    canceledAt: subscription.canceled_at ? subscription.canceled_at * 1000 : undefined,
    priceInCents: amount,
    currency: currency,
    includedTokensTotal: includedTokensTotal,
  });
}

/**
 * Handle customer.subscription.deleted
 *
 * Called when subscription is cancelled and period has ended.
 */
async function handleSubscriptionDeleted(ctx: any, subscription: any) {
  const { metadata } = subscription;
  const organizationId = metadata.organizationId as Id<"organizations">;

  if (!organizationId) {
    console.error("[AI Webhooks] No organizationId in subscription metadata");
    return;
  }

  console.log(`[AI Webhooks] Subscription deleted for org ${organizationId}`);

  // Mark subscription as canceled
  await ctx.runMutation(internal.ai.billing.updateSubscriptionStatusInternal, {
    organizationId: organizationId,
    status: "canceled" as const,
  });
}

/**
 * Handle invoice.payment_succeeded
 *
 * Called when monthly payment succeeds. Reset monthly token usage.
 */
async function handlePaymentSucceeded(ctx: any, invoice: any) {
  // Check if this is a subscription renewal (not just a one-time payment)
  if (!invoice.subscription) {
    return;
  }

  const { customer, subscription_details } = invoice;

  // Get organization ID from subscription metadata
  const subscriptionId = invoice.subscription;

  // Note: We'd need to fetch the full subscription to get metadata
  // For now, we can't easily get organizationId from invoice alone
  // This should be handled by subscription.updated webhook instead

  console.log(`[AI Webhooks] Payment succeeded for subscription ${subscriptionId}`);

  // TODO: Reset monthly tokens if this is a new billing cycle
  // This is complex because we need to map subscription ID -> organization ID
  // For now, the subscription.updated webhook handles period changes
}

/**
 * Handle invoice.payment_failed
 *
 * Called when monthly payment fails. Suspend AI access.
 */
async function handlePaymentFailed(ctx: any, invoice: any) {
  if (!invoice.subscription) {
    return;
  }

  const subscriptionId = invoice.subscription;

  console.log(`[AI Webhooks] Payment failed for subscription ${subscriptionId}`);

  // TODO: Mark subscription as past_due
  // This requires mapping subscription ID -> organization ID
  // The subscription.updated webhook will also handle this
}

/**
 * Handle checkout.session.completed
 *
 * Called when AI subscription checkout is completed.
 * Extracts billing details (tax IDs, addresses) and syncs to organization.
 * Sends confirmation emails to customer and sales team.
 */
async function handleCheckoutCompleted(ctx: any, session: any) {
  const { metadata, customer, customer_details, subscription, amount_total, currency } = session;

  const organizationId = metadata?.organizationId as Id<"organizations">;
  const tier = metadata?.tier || "standard";
  const isB2B = metadata?.isB2B === "true";

  if (!organizationId) {
    console.error("[AI Webhooks] No organizationId in checkout session metadata");
    return;
  }

  console.log(`[AI Webhooks] Checkout completed for org ${organizationId}, B2B: ${isB2B}`);

  // Extract billing information
  const customerEmail = customer_details?.email;
  const customerName = customer_details?.name;
  const customerAddress = customer_details?.address;
  const customerTaxIds = customer_details?.tax_ids || [];

  // Log B2B tax information
  if (isB2B && customerTaxIds.length > 0) {
    console.log(`[AI Webhooks] B2B Tax IDs:`, customerTaxIds.map((t: any) => ({
      type: t.type,
      value: t.value,
    })));
  }

  // Sync billing details to organization_legal object
  try {
    await ctx.runMutation(internal.ai.billing.syncBillingDetailsInternal, {
      organizationId,
      isB2B,
      billingEmail: customerEmail,
      billingName: customerName,
      billingAddress: customerAddress ? {
        line1: customerAddress.line1,
        line2: customerAddress.line2 || undefined,
        city: customerAddress.city,
        state: customerAddress.state || undefined,
        postalCode: customerAddress.postal_code,
        country: customerAddress.country,
      } : undefined,
      taxIds: customerTaxIds.map((t: any) => ({
        type: t.type,
        value: t.value,
      })),
    });

    console.log(`[AI Webhooks] ✓ Synced billing details for org ${organizationId}`);
  } catch (error) {
    console.error(`[AI Webhooks] Failed to sync billing details:`, error);
    // Don't throw - subscription creation will still succeed
  }

  // Send confirmation emails
  try {
    // Get organization details for user language preference
    const org = await ctx.runQuery(internal.ai.billing.getOrganizationInternal as any, {
      organizationId,
    });

    // Send customer confirmation email (in their language)
    await ctx.runAction(internal.emailService.sendAISubscriptionConfirmation, {
      to: customerEmail,
      organizationName: org?.name || customerName || customerEmail,
      tier,
      amountTotal: amount_total || 0,
      currency: currency || "eur",
      subscriptionId: subscription,
      isB2B,
      taxIds: customerTaxIds,
      language: org?.language || "en", // Use org language preference
    });

    // Send sales team notification
    await ctx.runAction(internal.emailService.sendSalesNotification, {
      customerEmail,
      customerName: customerName || customerEmail,
      organizationName: org?.name || customerName || customerEmail,
      tier,
      amountTotal: amount_total || 0,
      currency: currency || "eur",
      isB2B,
      taxIds: customerTaxIds,
      subscriptionId: subscription,
    });

    console.log(`[AI Webhooks] ✓ Sent confirmation emails`);
  } catch (error) {
    console.error(`[AI Webhooks] Failed to send confirmation emails:`, error);
    // Don't throw - subscription is already created
  }
}
