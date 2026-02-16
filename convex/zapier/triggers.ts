/**
 * ZAPIER WEBHOOK TRIGGERS
 *
 * Send webhook notifications to Zapier when events occur.
 * These are called by platform actions (e.g., after creating Community subscription).
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
const generatedApi: any = require("../_generated/api");

/**
 * TRIGGER: COMMUNITY SUBSCRIPTION CREATED
 *
 * Sends webhook to ALL subscribed URLs for "community_subscription_created" event.
 * This is called automatically when a new Community subscription is created.
 *
 * Use Case: Auto-create Skool member when user subscribes to Community tier.
 */
export const triggerCommunitySubscriptionCreated = internalAction({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("[Zapier Trigger] Community subscription created:", args.email);

    // Get all active webhook subscriptions for this event
    const subscriptions = await (ctx as any).runQuery(
      generatedApi.internal.zapier.webhooks.getSubscriptionsForEvent,
      {
        event: "community_subscription_created",
        // Don't filter by org - this is a platform-level event
      }
    );

    if (subscriptions.length === 0) {
      console.log("[Zapier] No webhook subscriptions for this event");
      return { success: true, delivered: 0 };
    }

    console.log(`[Zapier] Found ${subscriptions.length} webhook subscription(s)`);

    // Prepare webhook payload
    const payload = {
      trigger: "community_subscription_created",
      organizationId: args.organizationId,
      userId: args.userId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      stripeSubscriptionId: args.stripeSubscriptionId,
      customCourseAccess: ["foundations"], // Skool course access
      timestamp: Date.now(),
    };

    // Send webhook to all subscribed URLs
    let successCount = 0;
    let failureCount = 0;

    for (const subscription of subscriptions) {
      try {
        console.log(`[Zapier] Sending webhook to: ${subscription.targetUrl}`);

        const response = await fetch(subscription.targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "l4yercak3-Webhooks/1.0",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          successCount++;
          console.log(`[Zapier] Webhook delivered successfully (${response.status})`);

          // Update delivery stats
          await (ctx as any).runMutation(generatedApi.internal.zapier.webhooks.recordDelivery, {
            subscriptionId: subscription._id,
            success: true,
          });
        } else {
          failureCount++;
          const errorText = await response.text();
          console.error(`[Zapier] Webhook failed (${response.status}): ${errorText}`);

          await (ctx as any).runMutation(generatedApi.internal.zapier.webhooks.recordDelivery, {
            subscriptionId: subscription._id,
            success: false,
          });
        }
      } catch (error) {
        failureCount++;
        console.error(`[Zapier] Webhook error:`, error);

        await (ctx as any).runMutation(generatedApi.internal.zapier.webhooks.recordDelivery, {
          subscriptionId: subscription._id,
          success: false,
        });
      }
    }

    return {
      success: true,
      delivered: successCount,
      failed: failureCount,
    };
  },
});

/**
 * TRIGGER: NEW CONTACT CREATED
 *
 * Sends webhook when a new CRM contact is created.
 * This is called automatically after creating a contact.
 *
 * Use Case: Sync l4yercak3 contacts to HubSpot, Salesforce, etc.
 */
export const triggerNewContact = internalAction({
  args: {
    organizationId: v.id("organizations"),
    contactId: v.id("objects"), // CRM contact object ID
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("[Zapier Trigger] New contact created:", args.email);

    // Get subscriptions for this organization
    const subscriptions = await (ctx as any).runQuery(
      generatedApi.internal.zapier.webhooks.getSubscriptionsForEvent,
      {
        event: "new_contact",
        organizationId: args.organizationId,
      }
    );

    if (subscriptions.length === 0) {
      return { success: true, delivered: 0 };
    }

    // Prepare webhook payload
    const payload = {
      trigger: "new_contact",
      contactId: args.contactId,
      email: args.email,
      firstName: args.firstName || "",
      lastName: args.lastName || "",
      phone: args.phone || "",
      company: args.company || "",
      timestamp: Date.now(),
    };

    // Send webhook to all subscribed URLs
    let successCount = 0;
    let failureCount = 0;

    for (const subscription of subscriptions) {
      try {
        const response = await fetch(subscription.targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "l4yercak3-Webhooks/1.0",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          successCount++;
          await (ctx as any).runMutation(generatedApi.internal.zapier.webhooks.recordDelivery, {
            subscriptionId: subscription._id,
            success: true,
          });
        } else {
          failureCount++;
          await (ctx as any).runMutation(generatedApi.internal.zapier.webhooks.recordDelivery, {
            subscriptionId: subscription._id,
            success: false,
          });
        }
      } catch {
        failureCount++;
        await (ctx as any).runMutation(generatedApi.internal.zapier.webhooks.recordDelivery, {
          subscriptionId: subscription._id,
          success: false,
        });
      }
    }

    return {
      success: true,
      delivered: successCount,
      failed: failureCount,
    };
  },
});
