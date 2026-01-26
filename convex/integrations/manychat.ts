/**
 * MANYCHAT INTEGRATION
 *
 * Provides ManyChat marketing automation integration for organizations.
 * ManyChat handles multi-channel customer communications:
 * - Facebook Messenger
 * - Instagram Direct
 * - WhatsApp (via ManyChat)
 * - SMS
 * - Telegram
 *
 * Key capabilities:
 * - Subscriber management (find, create, update contacts)
 * - Flow triggering (send subscribers into automation flows)
 * - Tag management (add/remove tags for segmentation)
 * - Custom field updates (store order info, preferences, etc.)
 *
 * Note: ManyChat flows cannot be created/edited via API.
 * Flows must be built in ManyChat UI and triggered via API.
 *
 * ManyChat API Reference: https://api.manychat.com/swagger
 */

import { action, mutation, query, internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";

// ManyChat API endpoints
const MANYCHAT_API_BASE = "https://api.manychat.com/fb";

// ============================================================================
// TYPES
// ============================================================================

interface ManyChatResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface ManyChatSubscriber {
  id: string;
  key: string;
  page_id: string;
  status: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  gender?: string;
  profile_pic?: string;
  locale?: string;
  language?: string;
  timezone?: string;
  live_chat_url?: string;
  last_input_text?: string;
  optin_phone?: boolean;
  phone?: string;
  optin_email?: boolean;
  email?: string;
  subscribed?: string;
  last_interaction?: string;
  last_seen?: string;
  custom_fields?: Array<{
    id: number;
    name: string;
    type: string;
    value: unknown;
  }>;
  tags?: Array<{
    id: number;
    name: string;
  }>;
}

interface ManyChatFlow {
  ns: string;
  name: string;
}

interface ManyChatTag {
  id: number;
  name: string;
}

// ============================================================================
// PUBLIC MUTATIONS - Settings Management
// ============================================================================

/**
 * Save ManyChat settings for an organization
 * ManyChat uses API key authentication (not OAuth)
 */
export const saveManyChatSettings = mutation({
  args: {
    sessionId: v.string(),
    apiKey: v.string(),
    enabled: v.boolean(),
    syncContacts: v.optional(v.boolean()),
    defaultFlows: v.optional(v.object({
      orderConfirmation: v.optional(v.string()),
      eventReminder: v.optional(v.string()),
      welcomeSequence: v.optional(v.string()),
      abandonedCart: v.optional(v.string()),
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

    // Check for existing manychat_settings object
    const existingSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", user.defaultOrgId as Id<"organizations">).eq("type", "manychat_settings")
      )
      .first();

    const settingsData = {
      apiKey: args.apiKey, // Consider encrypting in production
      enabled: args.enabled,
      syncContacts: args.syncContacts ?? true,
      defaultFlows: args.defaultFlows || {},
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
      type: "manychat_settings",
      name: "ManyChat Settings",
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
      resource: "manychat_settings",
      success: true,
      metadata: { enabled: args.enabled },
    });

    return { success: true, settingsId };
  },
});

/**
 * Get ManyChat settings for organization
 */
export const getManyChatSettings = query({
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
        q.eq("organizationId", user.defaultOrgId as Id<"organizations">).eq("type", "manychat_settings")
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
      hasApiKey: !!(props.apiKey as string),
      syncContacts: props.syncContacts as boolean,
      defaultFlows: props.defaultFlows as Record<string, string>,
    };
  },
});

/**
 * Test ManyChat connection by fetching page info
 */
export const testManyChatConnection = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args): Promise<ManyChatResult> => {
    const settings = await ctx.runQuery(internal.integrations.manychat.getSettingsInternal, {
      sessionId: args.sessionId,
    });

    if (!settings) {
      return { success: false, error: "ManyChat not configured" };
    }

    // Test by fetching page info
    return await ctx.runAction(internal.integrations.manychat.getPageInfo, {
      organizationId: settings.organizationId,
    });
  },
});

// ============================================================================
// INTERNAL ACTIONS - API Calls
// ============================================================================

/**
 * Make authenticated request to ManyChat API
 */
async function manyChatRequest(
  apiKey: string,
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>
): Promise<ManyChatResult> {
  try {
    const response = await fetch(`${MANYCHAT_API_BASE}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (data.status === "success") {
      return { success: true, data: data.data };
    } else {
      return {
        success: false,
        error: data.message || `ManyChat API error: ${response.status}`,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Network error";
    console.error("[ManyChat] API error:", error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get page info (for connection testing)
 */
export const getPageInfo = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<ManyChatResult> => {
    const settings = await ctx.runQuery(internal.integrations.manychat.getOrgManyChatSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) {
      return { success: false, error: "ManyChat not enabled" };
    }

    return await manyChatRequest(settings.apiKey, "/page/getInfo");
  },
});

/**
 * Get all flows for the connected page
 */
export const getFlows = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<ManyChatResult & { flows?: ManyChatFlow[] }> => {
    const settings = await ctx.runQuery(internal.integrations.manychat.getOrgManyChatSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) {
      return { success: false, error: "ManyChat not enabled" };
    }

    const result = await manyChatRequest(settings.apiKey, "/page/getFlows");

    if (result.success && result.data) {
      return { success: true, flows: result.data as ManyChatFlow[] };
    }

    return result;
  },
});

/**
 * Get all tags for the connected page
 */
export const getTags = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<ManyChatResult & { tags?: ManyChatTag[] }> => {
    const settings = await ctx.runQuery(internal.integrations.manychat.getOrgManyChatSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) {
      return { success: false, error: "ManyChat not enabled" };
    }

    const result = await manyChatRequest(settings.apiKey, "/page/getTags");

    if (result.success && result.data) {
      return { success: true, tags: result.data as ManyChatTag[] };
    }

    return result;
  },
});

// ============================================================================
// SUBSCRIBER MANAGEMENT
// ============================================================================

/**
 * Find ManyChat subscriber by email
 */
export const findSubscriberByEmail = internalAction({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
  },
  handler: async (ctx, args): Promise<ManyChatResult & { subscriber?: ManyChatSubscriber }> => {
    const settings = await ctx.runQuery(internal.integrations.manychat.getOrgManyChatSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) {
      return { success: false, error: "ManyChat not enabled" };
    }

    const result = await manyChatRequest(
      settings.apiKey,
      "/subscriber/findBySystemField",
      "POST",
      {
        field_name: "email",
        field_value: args.email,
      }
    );

    if (result.success && result.data) {
      return { success: true, subscriber: result.data as ManyChatSubscriber };
    }

    return result;
  },
});

/**
 * Find ManyChat subscriber by phone
 */
export const findSubscriberByPhone = internalAction({
  args: {
    organizationId: v.id("organizations"),
    phone: v.string(),
  },
  handler: async (ctx, args): Promise<ManyChatResult & { subscriber?: ManyChatSubscriber }> => {
    const settings = await ctx.runQuery(internal.integrations.manychat.getOrgManyChatSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) {
      return { success: false, error: "ManyChat not enabled" };
    }

    const result = await manyChatRequest(
      settings.apiKey,
      "/subscriber/findBySystemField",
      "POST",
      {
        field_name: "phone",
        field_value: args.phone,
      }
    );

    if (result.success && result.data) {
      return { success: true, subscriber: result.data as ManyChatSubscriber };
    }

    return result;
  },
});

/**
 * Get subscriber info by ID
 */
export const getSubscriberInfo = internalAction({
  args: {
    organizationId: v.id("organizations"),
    subscriberId: v.string(),
  },
  handler: async (ctx, args): Promise<ManyChatResult & { subscriber?: ManyChatSubscriber }> => {
    const settings = await ctx.runQuery(internal.integrations.manychat.getOrgManyChatSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) {
      return { success: false, error: "ManyChat not enabled" };
    }

    const result = await manyChatRequest(
      settings.apiKey,
      "/subscriber/getInfo",
      "POST",
      { subscriber_id: args.subscriberId }
    );

    if (result.success && result.data) {
      return { success: true, subscriber: result.data as ManyChatSubscriber };
    }

    return result;
  },
});

/**
 * Set custom field value for subscriber
 */
export const setSubscriberCustomField = internalAction({
  args: {
    organizationId: v.id("organizations"),
    subscriberId: v.string(),
    fieldId: v.number(),
    fieldValue: v.string(),
  },
  handler: async (ctx, args): Promise<ManyChatResult> => {
    const settings = await ctx.runQuery(internal.integrations.manychat.getOrgManyChatSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) {
      return { success: false, error: "ManyChat not enabled" };
    }

    return await manyChatRequest(
      settings.apiKey,
      "/subscriber/setCustomField",
      "POST",
      {
        subscriber_id: args.subscriberId,
        field_id: args.fieldId,
        field_value: args.fieldValue,
      }
    );
  },
});

/**
 * Add tag to subscriber
 */
export const addTagToSubscriber = internalAction({
  args: {
    organizationId: v.id("organizations"),
    subscriberId: v.string(),
    tagId: v.number(),
  },
  handler: async (ctx, args): Promise<ManyChatResult> => {
    const settings = await ctx.runQuery(internal.integrations.manychat.getOrgManyChatSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) {
      return { success: false, error: "ManyChat not enabled" };
    }

    return await manyChatRequest(
      settings.apiKey,
      "/subscriber/addTag",
      "POST",
      {
        subscriber_id: args.subscriberId,
        tag_id: args.tagId,
      }
    );
  },
});

/**
 * Remove tag from subscriber
 */
export const removeTagFromSubscriber = internalAction({
  args: {
    organizationId: v.id("organizations"),
    subscriberId: v.string(),
    tagId: v.number(),
  },
  handler: async (ctx, args): Promise<ManyChatResult> => {
    const settings = await ctx.runQuery(internal.integrations.manychat.getOrgManyChatSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) {
      return { success: false, error: "ManyChat not enabled" };
    }

    return await manyChatRequest(
      settings.apiKey,
      "/subscriber/removeTag",
      "POST",
      {
        subscriber_id: args.subscriberId,
        tag_id: args.tagId,
      }
    );
  },
});

// ============================================================================
// FLOW TRIGGERING
// ============================================================================

/**
 * Send subscriber into a ManyChat flow
 * This is the primary way to trigger automated messages
 */
export const sendFlow = internalAction({
  args: {
    organizationId: v.id("organizations"),
    subscriberId: v.string(),
    flowNs: v.string(), // Flow namespace (from getFlows)
  },
  handler: async (ctx, args): Promise<ManyChatResult> => {
    const settings = await ctx.runQuery(internal.integrations.manychat.getOrgManyChatSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) {
      return { success: false, error: "ManyChat not enabled" };
    }

    const result = await manyChatRequest(
      settings.apiKey,
      "/subscriber/sendFlow",
      "POST",
      {
        subscriber_id: args.subscriberId,
        flow_ns: args.flowNs,
      }
    );

    if (result.success) {
      console.log("[ManyChat] Flow sent successfully", {
        organizationId: args.organizationId,
        subscriberId: args.subscriberId,
        flowNs: args.flowNs,
      });
    }

    return result;
  },
});

/**
 * Send dynamic message to subscriber
 * For simple one-off messages (subscriber must have interacted within 24h)
 */
export const sendMessage = internalAction({
  args: {
    organizationId: v.id("organizations"),
    subscriberId: v.string(),
    messageText: v.string(),
    messageTag: v.optional(v.string()), // For messages outside 24h window
  },
  handler: async (ctx, args): Promise<ManyChatResult> => {
    const settings = await ctx.runQuery(internal.integrations.manychat.getOrgManyChatSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) {
      return { success: false, error: "ManyChat not enabled" };
    }

    const payload: Record<string, unknown> = {
      subscriber_id: args.subscriberId,
      data: {
        version: "v2",
        content: {
          messages: [
            {
              type: "text",
              text: args.messageText,
            },
          ],
        },
      },
    };

    if (args.messageTag) {
      payload.message_tag = args.messageTag;
    }

    return await manyChatRequest(
      settings.apiKey,
      "/sending/sendContent",
      "POST",
      payload
    );
  },
});

// ============================================================================
// CONTACT SYNC (VC83 → ManyChat)
// ============================================================================

/**
 * Sync a CRM contact to ManyChat
 * Finds existing subscriber or creates new one, then updates fields
 */
export const syncContact = internalAction({
  args: {
    organizationId: v.id("organizations"),
    contactId: v.id("objects"),
    triggerFlow: v.optional(v.string()), // Optional flow to trigger after sync
  },
  handler: async (ctx, args): Promise<ManyChatResult & { subscriberId?: string }> => {
    // Get contact details
    const contact = await ctx.runQuery(internal.integrations.manychat.getContact, {
      contactId: args.contactId,
    });

    if (!contact) {
      return { success: false, error: "Contact not found" };
    }

    const settings = await ctx.runQuery(internal.integrations.manychat.getOrgManyChatSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled || !settings.syncContacts) {
      return { success: false, error: "ManyChat sync not enabled" };
    }

    // Try to find existing subscriber by email or phone
    let subscriber: ManyChatSubscriber | undefined;

    if (contact.email) {
      const emailResult = await ctx.runAction(internal.integrations.manychat.findSubscriberByEmail, {
        organizationId: args.organizationId,
        email: contact.email,
      });
      if (emailResult.success && emailResult.subscriber) {
        subscriber = emailResult.subscriber;
      }
    }

    if (!subscriber && contact.phone) {
      const phoneResult = await ctx.runAction(internal.integrations.manychat.findSubscriberByPhone, {
        organizationId: args.organizationId,
        phone: contact.phone,
      });
      if (phoneResult.success && phoneResult.subscriber) {
        subscriber = phoneResult.subscriber;
      }
    }

    if (!subscriber) {
      // Subscriber not found - they need to opt-in via ManyChat first
      // (ManyChat doesn't allow creating subscribers via API)
      return {
        success: false,
        error: "Subscriber not found in ManyChat. Customer must opt-in via ManyChat first.",
      };
    }

    // Optionally trigger a flow
    if (args.triggerFlow) {
      await ctx.runAction(internal.integrations.manychat.sendFlow, {
        organizationId: args.organizationId,
        subscriberId: subscriber.id,
        flowNs: args.triggerFlow,
      });
    }

    // Store ManyChat subscriber ID on contact
    await ctx.runMutation(internal.integrations.manychat.updateContactManyChatId, {
      contactId: args.contactId,
      manychatSubscriberId: subscriber.id,
    });

    console.log("[ManyChat] Contact synced", {
      contactId: args.contactId,
      subscriberId: subscriber.id,
    });

    return { success: true, subscriberId: subscriber.id };
  },
});

// ============================================================================
// EVENT HANDLERS - Trigger ManyChat flows from VC83 events
// ============================================================================

/**
 * Handle booking created event
 * Finds/syncs contact and triggers order confirmation flow
 */
export const onBookingCreated = internalAction({
  args: {
    organizationId: v.id("organizations"),
    bookingId: v.id("objects"),
    contactId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<ManyChatResult> => {
    const settings = await ctx.runQuery(internal.integrations.manychat.getOrgManyChatSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) {
      return { success: false, error: "ManyChat not enabled" };
    }

    const defaultFlows = settings.defaultFlows as Record<string, string>;
    const orderConfirmationFlow = defaultFlows?.orderConfirmation;

    if (!orderConfirmationFlow) {
      return { success: false, error: "No order confirmation flow configured" };
    }

    // Sync contact and trigger flow
    return await ctx.runAction(internal.integrations.manychat.syncContact, {
      organizationId: args.organizationId,
      contactId: args.contactId,
      triggerFlow: orderConfirmationFlow,
    });
  },
});

/**
 * Handle event reminder (X hours before event)
 */
export const onEventReminder = internalAction({
  args: {
    organizationId: v.id("organizations"),
    bookingId: v.id("objects"),
    contactId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<ManyChatResult> => {
    const settings = await ctx.runQuery(internal.integrations.manychat.getOrgManyChatSettings, {
      organizationId: args.organizationId,
    });

    if (!settings || !settings.enabled) {
      return { success: false, error: "ManyChat not enabled" };
    }

    const defaultFlows = settings.defaultFlows as Record<string, string>;
    const eventReminderFlow = defaultFlows?.eventReminder;

    if (!eventReminderFlow) {
      return { success: false, error: "No event reminder flow configured" };
    }

    return await ctx.runAction(internal.integrations.manychat.syncContact, {
      organizationId: args.organizationId,
      contactId: args.contactId,
      triggerFlow: eventReminderFlow,
    });
  },
});

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * Get ManyChat settings for organization (internal)
 */
export const getOrgManyChatSettings = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "manychat_settings")
      )
      .first();

    if (!settings) {
      return null;
    }

    const props = settings.customProperties as Record<string, unknown>;

    return {
      enabled: props.enabled as boolean,
      apiKey: props.apiKey as string,
      syncContacts: props.syncContacts as boolean,
      defaultFlows: props.defaultFlows as Record<string, string>,
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
        q.eq("organizationId", user.defaultOrgId as Id<"organizations">).eq("type", "manychat_settings")
      )
      .first();

    if (!settings) {
      return null;
    }

    const props = settings.customProperties as Record<string, unknown>;

    return {
      organizationId: user.defaultOrgId,
      enabled: props.enabled as boolean,
      apiKey: props.apiKey as string,
    };
  },
});

/**
 * Get contact details (internal)
 */
export const getContact = internalQuery({
  args: {
    contactId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.type !== "crm_contact") {
      return null;
    }

    const props = contact.customProperties as Record<string, unknown>;

    return {
      id: contact._id,
      email: props.email as string | undefined,
      phone: props.phone as string | undefined,
      firstName: props.firstName as string | undefined,
      lastName: props.lastName as string | undefined,
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * Update contact with ManyChat subscriber ID
 */
export const updateContactManyChatId = internalMutation({
  args: {
    contactId: v.id("objects"),
    manychatSubscriberId: v.string(),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact) return;

    const existingProps = (contact.customProperties || {}) as Record<string, unknown>;

    await ctx.db.patch(args.contactId, {
      customProperties: {
        ...existingProps,
        manychatSubscriberId: args.manychatSubscriberId,
      },
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// WEBHOOK RECEIVER (for ManyChat → VC83 events)
// ============================================================================

/**
 * Process incoming ManyChat webhook
 * ManyChat can send webhooks when subscribers interact
 */
export const processWebhook = internalAction({
  args: {
    organizationId: v.id("organizations"),
    event: v.string(),
    subscriberId: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args): Promise<ManyChatResult> => {
    console.log("[ManyChat Webhook] Received", {
      organizationId: args.organizationId,
      event: args.event,
      subscriberId: args.subscriberId,
    });

    // Send Pushover notification for customer messages
    if (args.event === "message_received" || args.event === "subscriber_reply") {
      await ctx.runAction(internal.integrations.pushover.sendEventNotification, {
        organizationId: args.organizationId,
        eventType: "customer_message",
        title: "New Customer Message",
        message: `ManyChat: ${(args.data as Record<string, unknown>)?.text || "New interaction"}`,
        url: (args.data as Record<string, unknown>)?.live_chat_url as string | undefined,
      });
    }

    // Log the webhook for debugging/analytics
    await ctx.runMutation(internal.integrations.manychat.logWebhook, {
      organizationId: args.organizationId,
      event: args.event,
      subscriberId: args.subscriberId,
      data: args.data,
    });

    return { success: true };
  },
});

/**
 * Find organization by API key prefix (for webhook routing)
 */
export const findOrgByApiKey = query({
  args: {
    apiKeyPrefix: v.string(),
  },
  handler: async (ctx, args) => {
    // Find manychat_settings with matching API key prefix
    const allSettings = await ctx.db
      .query("objects")
      .filter((q) => q.eq(q.field("type"), "manychat_settings"))
      .collect();

    for (const setting of allSettings) {
      const props = setting.customProperties as Record<string, unknown>;
      const apiKey = props.apiKey as string;

      if (apiKey && apiKey.startsWith(args.apiKeyPrefix)) {
        return { organizationId: setting.organizationId };
      }
    }

    return null;
  },
});

/**
 * Schedule webhook processing (called from API route)
 */
export const scheduleWebhookProcessing = mutation({
  args: {
    organizationId: v.id("organizations"),
    event: v.string(),
    subscriberId: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    // Schedule the internal action to process the webhook
    await ctx.scheduler.runAfter(0, internal.integrations.manychat.processWebhook, {
      organizationId: args.organizationId,
      event: args.event,
      subscriberId: args.subscriberId,
      data: args.data,
    });

    return { scheduled: true };
  },
});

/**
 * Log webhook for analytics (internal)
 */
export const logWebhook = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    event: v.string(),
    subscriberId: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    // Store webhook log in objects table for analytics
    await ctx.db.insert("objects", {
      type: "manychat_webhook_log",
      name: `ManyChat Webhook: ${args.event}`,
      organizationId: args.organizationId,
      status: "active",
      customProperties: {
        event: args.event,
        subscriberId: args.subscriberId,
        data: args.data,
        receivedAt: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
