/**
 * ZAPIER WEBHOOK SUBSCRIPTIONS
 *
 * Manages REST hook subscriptions for Zapier integrations.
 * When Zapier users turn on Zaps with l4yercak3 triggers, they register webhooks here.
 * When events occur, we send HTTP POST to registered URLs.
 */

import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "../_generated/server";
import { ConvexError } from "convex/values";
import { checkResourceLimit } from "../licensing/helpers";

/**
 * SUBSCRIBE TO WEBHOOK
 *
 * Called by Zapier when user turns on a Zap with REST hook trigger.
 * Requires OAuth access token.
 *
 * Example: User creates Zap "New Community Subscription → Skool Add Member"
 */
export const subscribeWebhook = mutation({
  args: {
    event: v.string(), // "community_subscription_created", "new_contact", etc.
    target_url: v.string(), // Zapier's webhook URL
  },
  handler: async (ctx, args) => {
    // Verify OAuth token (from Authorization header)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Missing or invalid access token",
      });
    }

    // Extract organization ID from OAuth token
    // Note: identity.subject should be userId from OAuth token
    const userId = identity.subject;

    // Get user's default organization
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), userId as any))
      .first();

    if (!user || !user.defaultOrgId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "User has no organization",
      });
    }

    const organizationId = user.defaultOrgId;

    // Validate event type
    const validEvents = [
      "community_subscription_created",
      "new_contact",
      "new_invoice",
      "invoice_paid",
      "new_project",
    ];

    if (!validEvents.includes(args.event)) {
      throw new ConvexError({
        code: "INVALID_EVENT",
        message: `Invalid event type. Valid events: ${validEvents.join(", ")}`,
      });
    }

    // Validate target URL
    if (!args.target_url.startsWith("https://")) {
      throw new ConvexError({
        code: "INVALID_URL",
        message: "Webhook URL must use HTTPS",
      });
    }

    // Check if subscription already exists
    const existing = await ctx.db
      .query("webhookSubscriptions")
      .withIndex("by_organization_event", (q) =>
        q.eq("organizationId", organizationId).eq("event", args.event)
      )
      .filter((q) => q.eq(q.field("targetUrl"), args.target_url))
      .first();

    if (existing) {
      // Reactivate if it was disabled
      if (!existing.isActive) {
        await ctx.db.patch(existing._id, {
          isActive: true,
          updatedAt: Date.now(),
        });
      }
      return {
        id: existing._id,
        event: existing.event,
        target_url: existing.targetUrl,
      };
    }

    // CHECK LICENSE LIMIT: Enforce webhook limit
    await checkResourceLimit(ctx, organizationId, "webhook", "maxWebhooks");

    // Create new webhook subscription
    const subscriptionId = await ctx.db.insert("webhookSubscriptions", {
      organizationId,
      event: args.event,
      targetUrl: args.target_url,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deliveryCount: 0,
      failureCount: 0,
    });

    console.log(`[Zapier Webhooks] Subscription created: ${subscriptionId} (event: ${args.event})`);

    return {
      id: subscriptionId,
      event: args.event,
      target_url: args.target_url,
    };
  },
});

/**
 * UNSUBSCRIBE FROM WEBHOOK
 *
 * Called by Zapier when user turns off a Zap.
 */
export const unsubscribeWebhook = mutation({
  args: {
    subscriptionId: v.id("webhookSubscriptions"),
  },
  handler: async (ctx, args) => {
    // Verify OAuth token
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Missing or invalid access token",
      });
    }

    // Get subscription
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Webhook subscription not found",
      });
    }

    // Verify ownership
    const userId = identity.subject;
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), userId as any))
      .first();

    if (!user || user.defaultOrgId !== subscription.organizationId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You do not own this webhook subscription",
      });
    }

    // Delete subscription
    await ctx.db.delete(args.subscriptionId);

    console.log(`[Zapier Webhooks] Subscription deleted: ${args.subscriptionId}`);

    return { success: true };
  },
});

/**
 * LIST ACTIVE WEBHOOKS
 *
 * For debugging and admin purposes.
 */
export const listWebhooks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Missing or invalid access token",
      });
    }

    const userId = identity.subject;
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), userId as any))
      .first();

    if (!user || !user.defaultOrgId) {
      return [];
    }

    const subscriptions = await ctx.db
      .query("webhookSubscriptions")
      .withIndex("by_organization", (q) => q.eq("organizationId", user.defaultOrgId!))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return subscriptions;
  },
});

/**
 * GET SUBSCRIPTIONS FOR EVENT (Internal)
 *
 * Called when an event occurs to find all webhooks to notify.
 */
export const getSubscriptionsForEvent = internalQuery({
  args: {
    event: v.string(),
    organizationId: v.optional(v.id("organizations")), // Optional: filter by org
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("webhookSubscriptions")
      .withIndex("by_event", (q) => q.eq("event", args.event).eq("isActive", true));

    const subscriptions = await query.collect();

    // Filter by organization if specified
    if (args.organizationId) {
      return subscriptions.filter((s) => s.organizationId === args.organizationId);
    }

    return subscriptions;
  },
});

/**
 * RECORD WEBHOOK DELIVERY (Internal)
 *
 * Update delivery stats after sending webhook.
 */
export const recordDelivery = internalMutation({
  args: {
    subscriptionId: v.id("webhookSubscriptions"),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      return;
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.success) {
      updates.deliveryCount = (subscription.deliveryCount || 0) + 1;
      updates.lastDeliveredAt = Date.now();
    } else {
      updates.failureCount = (subscription.failureCount || 0) + 1;

      // Disable webhook after 10 consecutive failures
      if ((subscription.failureCount || 0) >= 9) {
        updates.isActive = false;
        console.warn(`[Zapier Webhooks] Disabled subscription ${args.subscriptionId} after 10 failures`);
      }
    }

    await ctx.db.patch(args.subscriptionId, updates);
  },
});
