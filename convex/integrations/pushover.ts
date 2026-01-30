/**
 * PUSHOVER INTEGRATION
 *
 * Provides Pushover notifications for organizations.
 * Pushover is a simple notification service that delivers real-time
 * notifications to iOS, Android, and desktop devices.
 *
 * Use cases:
 * - Admin notifications (new bookings, payments, customer messages)
 * - System alerts (payment failures, service outages)
 * - Event-driven notifications (ManyChat events, form submissions)
 *
 * Configuration:
 * - Organizations store Pushover credentials via organization settings (ontology)
 * - No OAuth required - just API token + user/group key
 *
 * Pushover API Reference: https://pushover.net/api
 */

import { action, mutation, query, internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";

// Pushover API endpoint
const PUSHOVER_API_URL = "https://api.pushover.net/1/messages.json";

// Pushover priority levels
export const PUSHOVER_PRIORITY = {
  LOWEST: -2,      // No notification/alert
  LOW: -1,         // Quiet notification
  NORMAL: 0,       // Normal priority
  HIGH: 1,         // High priority, bypass quiet hours
  EMERGENCY: 2,    // Emergency, requires acknowledgment
} as const;

// Pushover sounds
export const PUSHOVER_SOUNDS = [
  "pushover", "bike", "bugle", "cashregister", "classical",
  "cosmic", "falling", "gamelan", "incoming", "intermission",
  "magic", "mechanical", "pianobar", "siren", "spacealarm",
  "tugboat", "alien", "climb", "persistent", "echo", "updown", "vibrate", "none"
] as const;

// ============================================================================
// TYPES
// ============================================================================

interface PushoverSendResult {
  success: boolean;
  request?: string; // Pushover request ID
  receipt?: string; // Receipt for emergency priority (for acknowledgment tracking)
  error?: string;
}

interface PushoverMessageOptions {
  title?: string;
  message: string;
  url?: string;
  urlTitle?: string;
  priority?: number;
  sound?: string;
  device?: string; // Specific device name
  html?: boolean; // Enable HTML formatting
  timestamp?: number; // Unix timestamp
  retry?: number; // Emergency priority: retry every N seconds
  expire?: number; // Emergency priority: stop retrying after N seconds
}

// ============================================================================
// PUBLIC MUTATIONS - Settings Management
// ============================================================================

/**
 * Save Pushover settings for an organization
 * Creates or updates the pushover_settings object in ontology
 */
export const savePushoverSettings = mutation({
  args: {
    sessionId: v.string(),
    apiToken: v.string(),
    userKey: v.string(),
    enabled: v.boolean(),
    defaultSound: v.optional(v.string()),
    defaultPriority: v.optional(v.number()),
    notifyOn: v.optional(v.object({
      newBooking: v.boolean(),
      paymentReceived: v.boolean(),
      paymentFailed: v.boolean(),
      customerMessage: v.boolean(),
      formSubmission: v.boolean(),
      systemAlert: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    // Validate session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) {
      throw new Error("User not found or no organization");
    }

    // Verify permission
    const canManage = await ctx.runQuery(api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "settings",
      organizationId: user.defaultOrgId,
    });

    if (!canManage) {
      throw new Error("Permission denied: manage_integrations required");
    }

    // Check for existing pushover_settings object
    const existingSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", user.defaultOrgId as Id<"organizations">).eq("type", "pushover_settings")
      )
      .first();

    const settingsData = {
      apiToken: args.apiToken, // Note: Consider encrypting in production
      userKey: args.userKey,
      enabled: args.enabled,
      defaultSound: args.defaultSound || "pushover",
      defaultPriority: args.defaultPriority ?? PUSHOVER_PRIORITY.NORMAL,
      notifyOn: args.notifyOn || {
        newBooking: true,
        paymentReceived: true,
        paymentFailed: true,
        customerMessage: true,
        formSubmission: true,
        systemAlert: true,
      },
    };

    if (existingSettings) {
      // Update existing
      await ctx.db.patch(existingSettings._id, {
        customProperties: settingsData,
        updatedAt: Date.now(),
      });

      return { success: true, settingsId: existingSettings._id };
    }

    // Create new settings object
    const settingsId = await ctx.db.insert("objects", {
      type: "pushover_settings",
      name: "Pushover Settings",
      organizationId: user.defaultOrgId,
      status: "active",
      customProperties: settingsData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log audit event
    await ctx.runMutation(internal.rbac.logAudit, {
      userId: user._id,
      organizationId: user.defaultOrgId,
      action: "create",
      resource: "pushover_settings",
      success: true,
      metadata: { enabled: args.enabled },
    });

    return { success: true, settingsId };
  },
});

/**
 * Get Pushover settings for organization
 */
export const getPushoverSettings = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) {
      return null;
    }

    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", user.defaultOrgId as Id<"organizations">).eq("type", "pushover_settings")
      )
      .first();

    if (!settings) {
      return {
        configured: false,
        enabled: false,
      };
    }

    const props = settings.customProperties as Record<string, unknown>;

    return {
      configured: true,
      enabled: props.enabled as boolean,
      hasApiToken: !!(props.apiToken as string),
      hasUserKey: !!(props.userKey as string),
      defaultSound: props.defaultSound as string,
      defaultPriority: props.defaultPriority as number,
      notifyOn: props.notifyOn as Record<string, boolean>,
    };
  },
});

/**
 * Test Pushover connection by sending a test notification
 */
export const testPushoverConnection = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args): Promise<PushoverSendResult> => {
    // Get settings
    const settings = await ctx.runQuery(internal.integrations.pushover.getSettingsInternal, {
      sessionId: args.sessionId,
    });

    if (!settings) {
      return { success: false, error: "Pushover not configured" };
    }

    // Send test message
    return await ctx.runAction(internal.integrations.pushover.sendPushoverNotification, {
      organizationId: settings.organizationId,
      title: "VC83 Connection Test",
      message: "Your Pushover integration is working correctly!",
      sound: "magic",
    });
  },
});

// ============================================================================
// INTERNAL ACTIONS - Message Sending
// ============================================================================

/**
 * Send a Pushover notification (internal)
 * This is the main entry point for sending notifications
 */
export const sendPushoverNotification = internalAction({
  args: {
    organizationId: v.id("organizations"),
    title: v.optional(v.string()),
    message: v.string(),
    url: v.optional(v.string()),
    urlTitle: v.optional(v.string()),
    priority: v.optional(v.number()),
    sound: v.optional(v.string()),
    device: v.optional(v.string()),
    html: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<PushoverSendResult> => {
    // Get organization's Pushover settings
    const settings = await ctx.runQuery(internal.integrations.pushover.getOrgPushoverSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) {
      return { success: false, error: "Pushover not enabled for this organization" };
    }

    const apiToken = settings.apiToken;
    const userKey = settings.userKey;

    if (!apiToken || !userKey) {
      return { success: false, error: "Pushover credentials not configured" };
    }

    // Build request body
    const body: Record<string, string | number> = {
      token: apiToken,
      user: userKey,
      message: args.message,
    };

    if (args.title) body.title = args.title;
    if (args.url) body.url = args.url;
    if (args.urlTitle) body.url_title = args.urlTitle;
    if (args.priority !== undefined) body.priority = args.priority;
    if (args.sound) body.sound = args.sound;
    if (args.device) body.device = args.device;
    if (args.html) body.html = 1;

    // Emergency priority requires retry and expire
    if (args.priority === PUSHOVER_PRIORITY.EMERGENCY) {
      body.retry = 60; // Retry every 60 seconds
      body.expire = 3600; // Stop after 1 hour
    }

    try {
      const response = await fetch(PUSHOVER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(body as Record<string, string>).toString(),
      });

      const result = await response.json();

      if (result.status === 1) {
        console.log("[Pushover] Notification sent successfully", {
          organizationId: args.organizationId,
          request: result.request,
        });

        return {
          success: true,
          request: result.request,
          receipt: result.receipt, // Only for emergency priority
        };
      } else {
        console.error("[Pushover] Send failed:", result);
        return {
          success: false,
          error: result.errors?.join(", ") || "Unknown error",
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Network error";
      console.error("[Pushover] Error:", error);
      return { success: false, error: errorMessage };
    }
  },
});

/**
 * Send event-triggered Pushover notification
 * Routes events to Pushover based on organization settings
 */
export const sendEventNotification = internalAction({
  args: {
    organizationId: v.id("organizations"),
    eventType: v.union(
      v.literal("new_booking"),
      v.literal("payment_received"),
      v.literal("payment_failed"),
      v.literal("customer_message"),
      v.literal("form_submission"),
      v.literal("system_alert")
    ),
    title: v.string(),
    message: v.string(),
    url: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<PushoverSendResult> => {
    // Get settings to check if this event type is enabled
    const settings = await ctx.runQuery(internal.integrations.pushover.getOrgPushoverSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) {
      return { success: false, error: "Pushover not enabled" };
    }

    // Map event type to notifyOn key
    const eventKeyMap: Record<string, string> = {
      new_booking: "newBooking",
      payment_received: "paymentReceived",
      payment_failed: "paymentFailed",
      customer_message: "customerMessage",
      form_submission: "formSubmission",
      system_alert: "systemAlert",
    };

    const notifyKey = eventKeyMap[args.eventType];
    const notifyOn = settings.notifyOn as Record<string, boolean>;

    if (notifyOn && !notifyOn[notifyKey]) {
      // This event type is disabled
      return { success: false, error: `Notifications disabled for ${args.eventType}` };
    }

    // Determine priority based on event type
    let priority = settings.defaultPriority || PUSHOVER_PRIORITY.NORMAL;
    if (args.eventType === "payment_failed" || args.eventType === "system_alert") {
      priority = PUSHOVER_PRIORITY.HIGH;
    }

    // Send notification
    return await ctx.runAction(internal.integrations.pushover.sendPushoverNotification, {
      organizationId: args.organizationId,
      title: args.title,
      message: args.message,
      url: args.url,
      priority,
      sound: settings.defaultSound || "pushover",
    });
  },
});

// ============================================================================
// INTERNAL QUERIES - Settings Retrieval
// ============================================================================

/**
 * Get Pushover settings for organization (internal)
 */
export const getOrgPushoverSettings = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "pushover_settings")
      )
      .first();

    if (!settings) {
      return null;
    }

    const props = settings.customProperties as Record<string, unknown>;

    return {
      enabled: props.enabled as boolean,
      apiToken: props.apiToken as string,
      userKey: props.userKey as string,
      defaultSound: props.defaultSound as string,
      defaultPriority: props.defaultPriority as number,
      notifyOn: props.notifyOn as Record<string, boolean>,
    };
  },
});

/**
 * Get settings with session validation (internal)
 */
export const getSettingsInternal = internalQuery({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) {
      return null;
    }

    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", user.defaultOrgId as Id<"organizations">).eq("type", "pushover_settings")
      )
      .first();

    if (!settings) {
      return null;
    }

    const props = settings.customProperties as Record<string, unknown>;

    return {
      organizationId: user.defaultOrgId,
      enabled: props.enabled as boolean,
      apiToken: props.apiToken as string,
      userKey: props.userKey as string,
    };
  },
});

// ============================================================================
// MESSAGE QUEUE INTEGRATION
// ============================================================================

/**
 * Send Pushover message from message queue
 * Called by messageSender when channel is "pushover"
 */
export const sendQueuedPushoverMessage = internalAction({
  args: {
    organizationId: v.id("organizations"),
    title: v.optional(v.string()),
    body: v.string(),
    url: v.optional(v.string()),
    priority: v.optional(v.number()),
    sound: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PushoverSendResult> => {
    return await ctx.runAction(internal.integrations.pushover.sendPushoverNotification, {
      organizationId: args.organizationId,
      title: args.title,
      message: args.body,
      url: args.url,
      priority: args.priority,
      sound: args.sound,
    });
  },
});
