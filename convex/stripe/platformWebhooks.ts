/**
 * PLATFORM SUBSCRIPTION WEBHOOK HANDLERS
 *
 * Handles Stripe webhook events for platform tier subscriptions.
 * This is separate from AI subscription webhooks (tokens) and Stripe Connect webhooks (payment processing).
 *
 * IMPORTANT: This handles platform-level tier changes:
 * - Free → Pro (€29/mo) → Agency (€299/mo) → Enterprise (custom)
 * - Updates organization.plan based on Stripe subscription metadata
 * - Legacy tiers (starter, professional, community) are mapped to current tiers
 *
 * Events handled:
 * - customer.subscription.created - New platform subscription
 * - customer.subscription.updated - Tier change (upgrade/downgrade)
 * - customer.subscription.deleted - Subscription cancellation (revert to Free)
 */

import { internalAction, internalMutation, internalQuery, ActionCtx } from "../_generated/server";
const generatedApi: any = require("../_generated/api");
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

// Stripe webhook data types
interface StripeCheckoutSession {
  metadata?: Record<string, string | undefined>;
  customer?: string;
  customer_details?: {
    email?: string;
    name?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
    tax_ids?: Array<{ type: string; value: string }>;
  };
  subscription?: string;
  payment_intent?: string;
  amount_total?: number;
  currency?: string;
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  metadata?: Record<string, string | undefined>;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end?: boolean;
  items: {
    data: Array<{
      price?: {
        id?: string;
        unit_amount?: number;
        currency?: string;
      };
    }>;
  };
}

/**
 * TIER METADATA MAPPING
 *
 * Maps Stripe product metadata.tier values to organization.plan values.
 * These must match the metadata set in Stripe Dashboard.
 *
 * @see .kiro/platform_pricing_v2/STRIPE-CONFIGURATION.md
 */
const TIER_MAP: Record<string, "free" | "pro" | "agency" | "enterprise"> = {
  free: "free",
  pro: "pro",
  // Legacy tier mappings - existing subscriptions are mapped to current tiers
  starter: "pro",
  professional: "pro",
  community: "free",
  // Current tiers
  agency: "agency",
  enterprise: "enterprise",
};

function normalizeFunnelChannel(
  channel?: string
): "webchat" | "native_guest" | "telegram" | "platform_web" | "unknown" {
  if (channel === "webchat") return "webchat";
  if (channel === "native_guest") return "native_guest";
  if (channel === "telegram") return "telegram";
  if (channel === "platform_web") return "platform_web";
  return "unknown";
}

function extractFunnelCampaign(metadata?: Record<string, string | undefined>) {
  if (!metadata) return undefined;

  const campaign = {
    source: metadata.utmSource,
    medium: metadata.utmMedium,
    campaign: metadata.utmCampaign,
    content: metadata.utmContent,
    term: metadata.utmTerm,
    referrer: metadata.funnelReferrer,
    landingPath: metadata.funnelLandingPath,
  };

  const hasSignal = Object.values(campaign).some((value) => typeof value === "string" && value.length > 0);
  return hasSignal ? campaign : undefined;
}

/**
 * PROCESS PLATFORM SUBSCRIPTION WEBHOOK
 *
 * Main webhook processor for platform subscription events.
 * Updates organization tier based on Stripe subscription metadata.
 */
export const processPlatformWebhook = internalAction({
  args: {
    eventType: v.string(),
    eventId: v.string(),
    eventData: v.string(), // JSON-stringified Stripe object
    created: v.number(),
  },
  handler: async (ctx, args) => {
    console.log(`[Platform Webhooks] Processing: ${args.eventType} (${args.eventId})`);

    const data = JSON.parse(args.eventData);

    try {
      switch (args.eventType) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(ctx, data);
          break;

        case "customer.subscription.created":
          await handleSubscriptionCreated(ctx, data);
          break;

        case "customer.subscription.updated":
          await handleSubscriptionUpdated(ctx, data);
          break;

        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(ctx, data);
          break;

        default:
          console.log(`[Platform Webhooks] Unhandled event type: ${args.eventType}`);
      }

      console.log(`[Platform Webhooks] ✓ Successfully processed: ${args.eventType}`);
    } catch (error) {
      console.error(`[Platform Webhooks] Error processing ${args.eventType}:`, error);
      throw error;
    }
  },
});

/**
 * Handle checkout.session.completed
 *
 * Called when platform checkout is completed.
 * Extracts billing details (addresses, tax IDs) and syncs to organization.
 * This enables proper invoicing and tax compliance.
 */
async function handleCheckoutCompleted(ctx: ActionCtx, session: StripeCheckoutSession) {
  const { metadata, customer, customer_details, subscription, amount_total, currency } = session;

  const organizationId = metadata?.organizationId as Id<"organizations">;
  const tier = metadata?.tier || "free";
  const billingPeriod = metadata?.billingPeriod || "monthly";
  const isB2B = metadata?.isB2B === "true";
  const checkoutType = metadata?.type; // "platform-tier" or "credit-purchase"
  const funnelChannel = normalizeFunnelChannel(metadata?.funnelChannel);
  const funnelCampaign = extractFunnelCampaign(metadata);

  if (!organizationId) {
    console.error("[Platform Webhooks] No organizationId in checkout session metadata");
    return;
  }

  console.log(`[Platform Webhooks] Checkout completed for org ${organizationId}:`);
  console.log(`  - Type: ${checkoutType}`);
  console.log(`  - Tier: ${tier}`);
  console.log(`  - Billing Period: ${billingPeriod}`);
  console.log(`  - B2B: ${isB2B}`);

  // Extract billing information from Stripe
  const customerEmail = customer_details?.email;
  const customerName = customer_details?.name;
  const customerAddress = customer_details?.address;
  const customerTaxIds = customer_details?.tax_ids || [];

  // Log B2B tax information
  if (isB2B && customerTaxIds.length > 0) {
    console.log(`[Platform Webhooks] B2B Tax IDs:`, customerTaxIds.map((t) => ({
      type: t.type,
      value: t.value,
    })));
  }

  // Sync billing details to organization
  try {
    await (ctx as any).runMutation(generatedApi.internal.stripe.platformWebhooks.syncPlatformBillingDetails, {
      organizationId,
      isB2B,
      billingEmail: customerEmail,
      billingName: customerName,
      billingAddress: customerAddress && customerAddress.line1 && customerAddress.city && customerAddress.postal_code && customerAddress.country ? {
        line1: customerAddress.line1,
        line2: customerAddress.line2 || undefined,
        city: customerAddress.city,
        state: customerAddress.state || undefined,
        postalCode: customerAddress.postal_code,
        country: customerAddress.country,
      } : undefined,
      taxIds: customerTaxIds.map((t) => ({
        type: t.type,
        value: t.value,
      })) as any,
      stripeCustomerId: customer,
    });

    console.log(`[Platform Webhooks] ✓ Synced billing details for org ${organizationId}`);
  } catch (error) {
    console.error(`[Platform Webhooks] Failed to sync billing details:`, error);
    // Don't throw - subscription creation will still proceed via subscription.created webhook
  }

  // Send confirmation emails for platform tier purchases
  if (checkoutType === "platform-tier") {
    try {
      // Get organization details
      const org = await (ctx as any).runQuery(generatedApi.internal.stripe.platformWebhooks.getOrganizationInternal, {
        organizationId,
      });

      // Send sales team notification
      await (ctx as any).runAction(generatedApi.internal.actions.salesNotificationEmail.sendSalesNotification, {
        eventType: "platform_tier_upgrade",
        user: {
          email: customerEmail || "",
          firstName: customerName?.split(" ")[0] || "",
          lastName: customerName?.split(" ").slice(1).join(" ") || "",
        },
        organization: {
          name: org?.name || customerName || customerEmail || "Unknown",
          planTier: tier,
        },
        metadata: {
          amountTotal: amount_total || 0,
          currency: currency || "eur",
          billingPeriod,
          subscriptionId: subscription,
          isB2B: isB2B.toString(),
        },
      });

      console.log(`[Platform Webhooks] ✓ Sent sales notification for upgrade`);
    } catch (error) {
      console.error(`[Platform Webhooks] Failed to send notifications:`, error);
      // Don't throw - billing sync already succeeded
    }

    try {
      await (ctx as any).runMutation(generatedApi.internal.onboarding.funnelEvents.emitFunnelEvent, {
        eventName: "onboarding.funnel.upgrade",
        channel: funnelChannel,
        organizationId,
        eventKey: `onboarding.funnel.upgrade:stripe_checkout:${session.subscription || "none"}:${session.payment_intent || "none"}`,
        campaign: funnelCampaign,
        metadata: {
          checkoutType,
          checkoutSessionId: (session as any).id,
          subscriptionId: subscription,
          tier,
          billingPeriod,
          amountTotal: amount_total || 0,
          currency: currency || "eur",
        },
      });
    } catch (funnelError) {
      console.error("[Platform Webhooks] Failed to emit upgrade funnel event:", funnelError);
    }
  }

  // Handle credit purchases
  if (checkoutType === "credit-purchase") {
    const credits = parseInt(metadata?.credits || "0", 10);
    const amountEur = metadata?.amountEur || "0";
    const paymentIntentId = session.payment_intent || "";

    if (credits > 0) {
      try {
        await (ctx as any).runMutation(generatedApi.internal.credits.index.addPurchasedCredits, {
          organizationId,
          credits,
          packId: `credit-purchase-${amountEur}eur`,
          stripePaymentIntentId: paymentIntentId,
        });

        console.log(`[Platform Webhooks] ✓ Added ${credits} purchased credits for org ${organizationId}`);

        // Send credit purchase confirmation email to customer
        await sendSubscriptionLifecycleEmail(ctx, organizationId, "credit_purchase", {
          credits,
          amountEur: parseInt(amountEur, 10),
        });

        // Send sales team notification
        await sendSalesTeamNotification(ctx, organizationId, "credit_purchase", {
          credits,
          amountEur: parseInt(amountEur, 10),
        });
      } catch (creditError) {
        console.error(`[Platform Webhooks] Failed to add purchased credits:`, creditError);
        throw creditError; // Re-throw - credits must be added
      }

      try {
        await (ctx as any).runMutation(generatedApi.internal.onboarding.funnelEvents.emitFunnelEvent, {
          eventName: "onboarding.funnel.credit_purchase",
          channel: funnelChannel,
          organizationId,
          eventKey: `onboarding.funnel.credit_purchase:stripe_checkout:${session.payment_intent || "none"}:${credits}`,
          campaign: funnelCampaign,
          metadata: {
            checkoutType,
            checkoutSessionId: (session as any).id,
            paymentIntentId,
            credits,
            amountEur: parseInt(amountEur, 10),
            currency: currency || "eur",
          },
        });
      } catch (funnelError) {
        console.error("[Platform Webhooks] Failed to emit credit funnel event:", funnelError);
      }
    }
  }
}

/**
 * Handle customer.subscription.created
 *
 * Called when a new platform subscription is created.
 * This happens when:
 * 1. Free user upgrades to paid tier
 * 2. New organization subscribes during signup
 */
async function handleSubscriptionCreated(ctx: ActionCtx, subscription: StripeSubscription) {
  const { metadata, customer, id, status, current_period_start, current_period_end, items } = subscription;

  // Extract organization ID from metadata
  const organizationId = metadata?.organizationId as Id<"organizations">;
  const tier = metadata?.tier || "free";

  if (!organizationId) {
    console.error("[Platform Webhooks] No organizationId in subscription metadata");
    // Try to find organization by Stripe customer ID
    const org = await (ctx as any).runQuery(generatedApi.internal.stripe.platformWebhooks.findOrgByStripeCustomer, {
      stripeCustomerId: customer,
    });

    if (!org) {
      console.error("[Platform Webhooks] Could not find organization for customer:", customer);
      return;
    }

    // Update using found organization
    await updateOrganizationTier(ctx, org._id, tier, {
      stripeSubscriptionId: id,
      stripeCustomerId: customer,
      status,
      currentPeriodStart: current_period_start * 1000,
      currentPeriodEnd: current_period_end * 1000,
      priceId: items.data[0]?.price?.id,
      amount: items.data[0]?.price?.unit_amount || 0,
      currency: items.data[0]?.price?.currency || "eur",
    });
    return;
  }

  console.log(`[Platform Webhooks] Creating subscription for org ${organizationId}: ${tier} tier`);

  const normalizedTier = TIER_MAP[tier.toLowerCase()] || "free";

  await updateOrganizationTier(ctx, organizationId, tier, {
    stripeSubscriptionId: id,
    stripeCustomerId: customer,
    status,
    currentPeriodStart: current_period_start * 1000,
    currentPeriodEnd: current_period_end * 1000,
    priceId: items.data[0]?.price?.id,
    amount: items.data[0]?.price?.unit_amount || 0,
    currency: items.data[0]?.price?.currency || "eur",
  });

  // Send upgrade email for new paid subscriptions
  if (normalizedTier !== "free") {
    await sendSubscriptionLifecycleEmail(ctx, organizationId, "plan_upgrade", {
      tier: normalizedTier,
    });
  }
}

/**
 * Handle customer.subscription.updated
 *
 * Called when subscription changes:
 * - Upgrade (Free → Starter → Pro → Agency → Enterprise)
 * - Downgrade
 * - Renewal
 * - Status changes (active, past_due, canceled)
 */
async function handleSubscriptionUpdated(ctx: ActionCtx, subscription: StripeSubscription) {
  const { metadata, customer, id, status, current_period_start, current_period_end, items, cancel_at_period_end } =
    subscription;

  const organizationId = metadata?.organizationId as Id<"organizations">;
  const tier = metadata?.tier || "free";

  if (!organizationId) {
    console.error("[Platform Webhooks] No organizationId in subscription metadata for update");
    // Try to find organization by Stripe customer ID
    const org = await (ctx as any).runQuery(generatedApi.internal.stripe.platformWebhooks.findOrgByStripeCustomer, {
      stripeCustomerId: customer,
    });

    if (!org) {
      console.error("[Platform Webhooks] Could not find organization for customer:", customer);
      return;
    }

    await updateOrganizationTier(ctx, org._id, tier, {
      stripeSubscriptionId: id,
      stripeCustomerId: customer,
      status,
      currentPeriodStart: current_period_start * 1000,
      currentPeriodEnd: current_period_end * 1000,
      cancelAtPeriodEnd: cancel_at_period_end || false,
      priceId: items.data[0]?.price?.id,
      amount: items.data[0]?.price?.unit_amount || 0,
      currency: items.data[0]?.price?.currency || "eur",
    });
    return;
  }

  console.log(`[Platform Webhooks] Updating subscription for org ${organizationId}: ${tier} tier, status: ${status}`);

  // Get current plan before updating to detect upgrade/downgrade
  const currentOrg = await (ctx as any).runQuery(generatedApi.internal.stripe.platformWebhooks.getOrganizationInternal, { organizationId });
  const previousTier = currentOrg?.plan || "free";
  const normalizedTier = TIER_MAP[tier.toLowerCase()] || "free";

  await updateOrganizationTier(ctx, organizationId, tier, {
    stripeSubscriptionId: id,
    stripeCustomerId: customer,
    status,
    currentPeriodStart: current_period_start * 1000,
    currentPeriodEnd: current_period_end * 1000,
    cancelAtPeriodEnd: cancel_at_period_end || false,
    priceId: items.data[0]?.price?.id,
    amount: items.data[0]?.price?.unit_amount || 0,
    currency: items.data[0]?.price?.currency || "eur",
  });

  // Send lifecycle emails based on what changed
  const TIER_ORDER: Record<string, number> = { free: 0, pro: 1, agency: 2, enterprise: 3 };
  const prevOrder = TIER_ORDER[previousTier] ?? 0;
  const newOrder = TIER_ORDER[normalizedTier] ?? 0;

  if (cancel_at_period_end) {
    // Subscription scheduled for cancellation
    await sendSubscriptionLifecycleEmail(ctx, organizationId, "subscription_canceled", {
      tier: normalizedTier,
      effectiveDate: current_period_end * 1000,
    });
    await sendSalesTeamNotification(ctx, organizationId, "subscription_canceled", {
      tier: normalizedTier,
      effectiveDate: current_period_end * 1000,
    });
  } else if (newOrder > prevOrder) {
    // Upgrade
    await sendSubscriptionLifecycleEmail(ctx, organizationId, "plan_upgrade", {
      tier: normalizedTier,
    });
  } else if (newOrder < prevOrder && normalizedTier !== "free") {
    // Downgrade (but not to free - that's handled by subscription.deleted)
    await sendSubscriptionLifecycleEmail(ctx, organizationId, "plan_downgrade", {
      fromTier: previousTier,
      toTier: normalizedTier,
      effectiveDate: current_period_end * 1000,
    });
    await sendSalesTeamNotification(ctx, organizationId, "platform_tier_downgrade", {
      fromTier: previousTier,
      toTier: normalizedTier,
      effectiveDate: current_period_end * 1000,
    });
  }
}

/**
 * Handle customer.subscription.deleted
 *
 * Called when subscription is canceled and period has ended.
 * Reverts organization to Free tier.
 */
async function handleSubscriptionDeleted(ctx: ActionCtx, subscription: StripeSubscription) {
  const { metadata, customer } = subscription;
  const organizationId = metadata?.organizationId as Id<"organizations">;

  if (!organizationId) {
    // Try to find organization by Stripe customer ID
    const org = await (ctx as any).runQuery(generatedApi.internal.stripe.platformWebhooks.findOrgByStripeCustomer, {
      stripeCustomerId: customer,
    });

    if (!org) {
      console.error("[Platform Webhooks] Could not find organization for deleted subscription");
      return;
    }

    console.log(`[Platform Webhooks] Subscription deleted for org ${org._id}, reverting to Free tier`);

    await updateOrganizationTier(ctx, org._id, "free", {
      stripeSubscriptionId: null,
      status: "canceled",
    });
    return;
  }

  console.log(`[Platform Webhooks] Subscription deleted for org ${organizationId}, reverting to Free tier`);

  // Get current tier before reverting for the email
  const currentOrg = await (ctx as any).runQuery(generatedApi.internal.stripe.platformWebhooks.getOrganizationInternal, { organizationId });
  const previousTier = currentOrg?.plan || "pro";

  await updateOrganizationTier(ctx, organizationId, "free", {
    stripeSubscriptionId: null,
    status: "canceled",
  });

  // Send cancellation emails
  await sendSubscriptionLifecycleEmail(ctx, organizationId, "subscription_canceled", {
    tier: previousTier,
  });
  await sendSalesTeamNotification(ctx, organizationId, "subscription_canceled", {
    tier: previousTier,
  });
}

/**
 * Helper: Send subscription lifecycle email to org owner
 *
 * Looks up the org name and primary member email, then fires
 * the subscription email action. Failures are logged but never re-thrown
 * so they don't block the main webhook flow.
 */
async function sendSubscriptionLifecycleEmail(
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  event: "plan_upgrade" | "plan_downgrade" | "credit_purchase" | "subscription_canceled" | "trial_started",
  extra: {
    tier?: string;
    fromTier?: string;
    toTier?: string;
    credits?: number;
    amountEur?: number;
    billingPeriod?: string;
    effectiveDate?: number;
    trialEndsAt?: number;
  } = {}
) {
  try {
    const org = await (ctx as any).runQuery(generatedApi.internal.stripe.platformWebhooks.getOrganizationInternal, { organizationId });
    const members = await (ctx as any).runQuery(generatedApi.internal.stripe.platformWebhooks.getOrganizationMembers, { organizationId });

    const primaryMember = members.find((m: { isActive: boolean }) => m.isActive);
    const email = primaryMember?.user?.email;
    if (!email) {
      console.log(`[Platform Webhooks] No active member email found for org ${organizationId}, skipping ${event} email`);
      return;
    }

    await (ctx as any).runAction(generatedApi.internal.actions.subscriptionEmails.sendSubscriptionEmail, {
      to: email,
      event,
      organizationName: org?.name || "Your Organization",
      ...extra,
    });

    console.log(`[Platform Webhooks] ✓ Sent ${event} email to ${email}`);
  } catch (error) {
    console.error(`[Platform Webhooks] Failed to send ${event} email:`, error);
    // Don't re-throw - email failures should never block webhook processing
  }
}

/**
 * Helper: Send sales team notification email
 *
 * Looks up org + members, calls salesNotificationEmail.sendSalesNotification.
 * Failures are logged but never re-thrown so they don't block webhook flow.
 */
async function sendSalesTeamNotification(
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  eventType: "credit_purchase" | "platform_tier_downgrade" | "subscription_canceled" | "pending_change_reverted",
  metadata: Record<string, unknown> = {}
) {
  try {
    const org = await (ctx as any).runQuery(generatedApi.internal.stripe.platformWebhooks.getOrganizationInternal, { organizationId });
    const members = await (ctx as any).runQuery(generatedApi.internal.stripe.platformWebhooks.getOrganizationMembers, { organizationId });

    const primaryMember = members.find((m: { isActive: boolean }) => m.isActive);
    const userEmail = primaryMember?.user?.email || "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = primaryMember?.user as any;
    const firstName = user?.firstName || user?.name?.split(" ")[0] || "";
    const lastName = user?.lastName || user?.name?.split(" ").slice(1).join(" ") || "";

    await (ctx as any).runAction(generatedApi.internal.actions.salesNotificationEmail.sendSalesNotification, {
      eventType,
      user: { email: userEmail, firstName, lastName },
      organization: {
        name: org?.name || "Unknown Organization",
        planTier: org?.plan || "free",
      },
      metadata,
    });

    console.log(`[Platform Webhooks] ✓ Sent sales notification: ${eventType}`);
  } catch (error) {
    console.error(`[Platform Webhooks] Failed to send sales notification ${eventType}:`, error);
    // Never re-throw
  }
}

/**
 * Helper: Update organization tier
 *
 * Updates organization.plan and creates/updates organization_license object.
 */
async function updateOrganizationTier(
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  tier: string,
  subscriptionInfo: {
    stripeSubscriptionId?: string | null;
    stripeCustomerId?: string;
    status?: string;
    currentPeriodStart?: number;
    currentPeriodEnd?: number;
    cancelAtPeriodEnd?: boolean;
    priceId?: string;
    amount?: number;
    currency?: string;
  }
) {
  // Validate tier
  const normalizedTier = TIER_MAP[tier.toLowerCase()] || "free";

  // Update organization.plan field
  await (ctx as any).runMutation(generatedApi.internal.stripe.platformWebhooks.updateOrganizationPlan, {
    organizationId,
    plan: normalizedTier,
    stripeSubscriptionId: subscriptionInfo.stripeSubscriptionId,
    stripeCustomerId: subscriptionInfo.stripeCustomerId,
  });

  // Upsert organization_license object
  await (ctx as any).runMutation(generatedApi.internal.stripe.platformWebhooks.upsertOrganizationLicense, {
    organizationId,
    planTier: normalizedTier,
    status: subscriptionInfo.status === "active" ? "active" : "suspended",
    currentPeriodStart: subscriptionInfo.currentPeriodStart,
    currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
    cancelAtPeriodEnd: subscriptionInfo.cancelAtPeriodEnd || false,
    priceInCents: subscriptionInfo.amount || 0,
    currency: subscriptionInfo.currency || "eur",
    stripeSubscriptionId: subscriptionInfo.stripeSubscriptionId || undefined,
    stripePriceId: subscriptionInfo.priceId,
  });

  console.log(`[Platform Webhooks] ✓ Updated org ${organizationId} to ${normalizedTier} tier`);
}

/**
 * INTERNAL MUTATION: Update organization plan field
 */
export const updateOrganizationPlan = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    plan: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("agency"),
      v.literal("enterprise")
    ),
    stripeSubscriptionId: v.optional(v.union(v.string(), v.null())),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updateData: {
      plan: "free" | "pro" | "agency" | "enterprise";
      updatedAt: number;
      stripeSubscriptionId?: string;
      stripeCustomerId?: string;
    } = {
      plan: args.plan,
      updatedAt: Date.now(),
    };

    if (args.stripeSubscriptionId !== undefined) {
      updateData.stripeSubscriptionId = args.stripeSubscriptionId ?? undefined;
    }

    if (args.stripeCustomerId) {
      updateData.stripeCustomerId = args.stripeCustomerId;
    }

    await ctx.db.patch(args.organizationId, updateData);

    // Log audit event (system webhook context - no user)
    await ctx.db.insert("auditLogs", {
      // userId is undefined for system/webhook contexts
      organizationId: args.organizationId,
      action: "organization.plan_changed",
      resource: "organizations",
      resourceId: args.organizationId as unknown as string,
      metadata: {
        newPlan: args.plan,
        stripeSubscriptionId: args.stripeSubscriptionId,
      },
      success: true,
      createdAt: Date.now(),
    });
  },
});

/**
 * INTERNAL MUTATION: Upsert organization license object
 */
export const upsertOrganizationLicense = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    planTier: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("agency"),
      v.literal("enterprise")
    ),
    status: v.union(v.literal("active"), v.literal("trial"), v.literal("expired"), v.literal("suspended")),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    priceInCents: v.optional(v.number()),
    currency: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if license object already exists
    const existingLicense = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "organization_license")
      )
      .first();

    const now = Date.now();

    const customProperties = {
      planTier: args.planTier,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd || false,
      priceInCents: args.priceInCents || 0,
      currency: args.currency || "eur",
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripePriceId: args.stripePriceId,
    };

    if (existingLicense) {
      // Update existing license
      await ctx.db.patch(existingLicense._id, {
        status: args.status,
        customProperties: {
          ...existingLicense.customProperties,
          ...customProperties,
        },
        updatedAt: now,
      });
    } else {
      // Create new license object
      await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "organization_license",
        subtype: "platform",
        name: `${args.planTier.charAt(0).toUpperCase() + args.planTier.slice(1)} License`,
        status: args.status,
        customProperties,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * INTERNAL QUERY: Find organization by Stripe customer ID
 */
export const findOrgByStripeCustomer = internalQuery({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    // Query organizations with this Stripe customer ID
    const organizations = await ctx.db.query("organizations").collect();

    const org = organizations.find(
      (o) => o.stripeCustomerId === args.stripeCustomerId
    );

    return org || null;
  },
});

/**
 * INTERNAL QUERY: Get organization details
 */
export const getOrganizationInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.organizationId);
  },
});

/**
 * INTERNAL MUTATION: Sync platform billing details to organization
 *
 * Updates organization and creates/updates organization_billing object
 * with billing address and tax information from Stripe checkout.
 */
export const syncPlatformBillingDetails = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    isB2B: v.boolean(),
    billingEmail: v.optional(v.string()),
    billingName: v.optional(v.string()),
    billingAddress: v.optional(v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.optional(v.string()),
      postalCode: v.string(),
      country: v.string(),
    })),
    taxIds: v.optional(v.array(v.object({
      type: v.string(),
      value: v.string(),
    }))),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Update organization with Stripe customer ID (billingEmail goes to organization_billing object)
    const orgUpdate: Record<string, unknown> = {
      updatedAt: now,
    };

    if (args.stripeCustomerId) {
      orgUpdate.stripeCustomerId = args.stripeCustomerId;
    }

    await ctx.db.patch(args.organizationId, orgUpdate);

    // 2. Find or create organization_billing object for detailed billing info
    const existingBilling = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "organization_billing")
      )
      .first();

    const billingData = {
      isB2B: args.isB2B,
      billingEmail: args.billingEmail,
      billingName: args.billingName,
      billingAddress: args.billingAddress,
      taxIds: args.taxIds || [],
      lastSyncedFromStripe: now,
    };

    if (existingBilling) {
      // Update existing billing object
      await ctx.db.patch(existingBilling._id, {
        customProperties: {
          ...existingBilling.customProperties,
          ...billingData,
        },
        updatedAt: now,
      });

      console.log(`[Platform Webhooks] Updated organization_billing for ${args.organizationId}`);
    } else {
      // Create new billing object
      await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "organization_billing",
        subtype: "platform",
        name: "Billing Information",
        status: "active",
        customProperties: billingData,
        createdAt: now,
        updatedAt: now,
      });

      console.log(`[Platform Webhooks] Created organization_billing for ${args.organizationId}`);
    }

    // 3. Log audit event (system webhook context - no user)
    await ctx.db.insert("auditLogs", {
      // userId is undefined for system/webhook contexts
      organizationId: args.organizationId,
      action: "organization.billing_updated",
      resource: "organizations",
      resourceId: args.organizationId as unknown as string,
      metadata: {
        isB2B: args.isB2B,
        hasBillingAddress: !!args.billingAddress,
        hasTaxIds: (args.taxIds?.length || 0) > 0,
      },
      success: true,
      createdAt: now,
    });
  },
});

/**
 * INTERNAL QUERY: Get organization members with user details
 *
 * Used by Zapier integration to get user details for webhook payloads
 */
export const getOrganizationMembers = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Fetch user details for each member
    const membersWithUsers = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return {
          ...member,
          user,
        };
      })
    );

    return membersWithUsers;
  },
});
