/**
 * MESSAGE SENDER
 *
 * Routes messages to appropriate delivery channels.
 * Currently supports:
 * - Email via Resend
 * - SMS via Infobip (placeholder)
 * - WhatsApp via Meta Cloud API (per-org OAuth)
 *
 * Future: Channel fallback logic (e.g., SMS → WhatsApp → Email)
 */

import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

// ============================================================================
// TYPES
// ============================================================================

interface SendResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

// ============================================================================
// INTERNAL MUTATION - Entry Point
// ============================================================================

/**
 * Send a message via the appropriate channel
 * This is the main entry point called by the queue processor
 */
export const sendMessage = internalMutation({
  args: {
    messageId: v.id("sequenceMessageQueue"),
  },
  handler: async (ctx, args): Promise<SendResult> => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      return { success: false, error: "Message not found" };
    }

    // Get organization to find domain config
    const org = await ctx.db.get(message.organizationId);
    if (!org) {
      return { success: false, error: "Organization not found" };
    }

    // Find domain config for email settings
    const domainConfig = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", message.organizationId).eq("type", "domain_configuration")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    // Route to appropriate channel
    switch (message.channel) {
      case "email":
        return await sendEmailMessage(ctx, message, domainConfig?._id);

      case "sms":
        return await sendSmsMessage(ctx, message);

      case "whatsapp":
        return await sendWhatsAppMessage(ctx, message);

      case "pushover":
        return await sendPushoverMessage(ctx, message);

      default:
        return { success: false, error: `Unknown channel: ${message.channel}` };
    }
  },
});

// ============================================================================
// CHANNEL SENDERS
// ============================================================================

/**
 * Send email via Resend
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendEmailMessage(
  ctx: any,
  message: {
    _id: Id<"sequenceMessageQueue">;
    recipientEmail?: string;
    subject?: string;
    body: string;
    bodyHtml?: string;
    organizationId: Id<"organizations">;
  },
  domainConfigId?: Id<"objects">
): Promise<SendResult> {
  if (!message.recipientEmail) {
    return { success: false, error: "No recipient email address" };
  }

  if (!domainConfigId) {
    return { success: false, error: "No domain configuration found for organization" };
  }

  try {
    // Use the existing email delivery service
    const result = await ctx.runAction(internal.emailDelivery.sendEmail, {
      domainConfigId,
      to: message.recipientEmail,
      subject: message.subject || "Message from your organization",
      html: message.bodyHtml || `<p>${message.body}</p>`,
      text: message.body,
    });

    if (result.success) {
      return { success: true, externalId: result.messageId };
    } else {
      return { success: false, error: result.error || "Email send failed" };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown email error";
    console.error(`[MessageSender] Email error:`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send SMS via Infobip
 * Placeholder implementation - Infobip integration not yet connected
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendSmsMessage(
  ctx: any,
  message: {
    _id: Id<"sequenceMessageQueue">;
    recipientPhone?: string;
    body: string;
    organizationId: Id<"organizations">;
  }
): Promise<SendResult> {
  if (!message.recipientPhone) {
    return { success: false, error: "No recipient phone number" };
  }

  // TODO: Implement Infobip SMS integration
  // See docs/plans/multichannel-automation/INFOBIP-INTEGRATION.md

  console.log(`[MessageSender] SMS sending not yet implemented. Would send to: ${message.recipientPhone}`);

  // For now, return an error indicating not implemented
  return {
    success: false,
    error: "SMS delivery not yet configured. Contact support to enable SMS messaging.",
  };

  /*
  // Future implementation:
  const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY;
  const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL;

  if (!INFOBIP_API_KEY || !INFOBIP_BASE_URL) {
    return { success: false, error: "Infobip not configured" };
  }

  const response = await fetch(`${INFOBIP_BASE_URL}/sms/2/text/advanced`, {
    method: "POST",
    headers: {
      "Authorization": `App ${INFOBIP_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{
        destinations: [{ to: message.recipientPhone }],
        text: message.body,
      }],
    }),
  });

  const result = await response.json();
  // Handle response...
  */
}

/**
 * Send Pushover notification to organization admins
 * Uses organization's Pushover credentials
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendPushoverMessage(
  ctx: any,
  message: {
    _id: Id<"sequenceMessageQueue">;
    body: string;
    organizationId: Id<"organizations">;
    pushoverTitle?: string;
    pushoverPriority?: number;
    pushoverSound?: string;
    pushoverUrl?: string;
  }
): Promise<SendResult> {
  try {
    const result = await ctx.runAction(internal.integrations.pushover.sendQueuedPushoverMessage, {
      organizationId: message.organizationId,
      title: message.pushoverTitle,
      body: message.body,
      url: message.pushoverUrl,
      priority: message.pushoverPriority,
      sound: message.pushoverSound,
    });

    if (result.success) {
      return { success: true, externalId: result.request };
    } else {
      return { success: false, error: result.error || "Pushover send failed" };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Pushover error";
    console.error(`[MessageSender] Pushover error:`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send WhatsApp message via organization's connected WhatsApp Business Account
 * Uses Meta's WhatsApp Cloud API with per-org OAuth credentials
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendWhatsAppMessage(
  ctx: any,
  message: {
    _id: Id<"sequenceMessageQueue">;
    recipientPhone?: string;
    body: string;
    organizationId: Id<"organizations">;
    templateName?: string;
    templateLanguage?: string;
    templateParameters?: string[];
  }
): Promise<SendResult> {
  if (!message.recipientPhone) {
    return { success: false, error: "No recipient phone number" };
  }

  // Format phone number to E.164
  const formattedPhone = toE164(message.recipientPhone);

  try {
    // Use the org's WhatsApp connection to send
    const result = await ctx.runAction(internal.oauth.whatsapp.sendWhatsAppMessage, {
      organizationId: message.organizationId,
      to: formattedPhone,
      // For sequences, we typically use templates (required for business-initiated messages)
      templateName: message.templateName || "booking_reminder",
      templateLanguage: message.templateLanguage || "de",
      templateParameters: message.templateParameters || [message.body],
      // Text messages only work within 24h conversation window
      textMessage: undefined,
    });

    if (result.success) {
      return { success: true, externalId: result.messageId };
    } else {
      return { success: false, error: result.error || "WhatsApp send failed" };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown WhatsApp error";
    console.error(`[MessageSender] WhatsApp error:`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Convert phone number to E.164 format
 * @param phone - Phone number in various formats
 * @param defaultCountry - Default country code (without +)
 */
function toE164(phone: string, defaultCountry = "49"): string {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // Handle different formats
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  if (cleaned.startsWith("00")) {
    return "+" + cleaned.slice(2);
  }
  if (cleaned.startsWith("0")) {
    return "+" + defaultCountry + cleaned.slice(1);
  }

  return "+" + defaultCountry + cleaned;
}

// ============================================================================
// FALLBACK LOGIC (Future)
// ============================================================================

/**
 * Send with channel fallback
 * Tries primary channel, then falls back to alternatives
 */
export const sendWithFallback = internalMutation({
  args: {
    messageId: v.id("sequenceMessageQueue"),
    fallbackOrder: v.array(v.union(
      v.literal("email"),
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("pushover")
    )),
  },
  handler: async (ctx, args): Promise<SendResult> => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      return { success: false, error: "Message not found" };
    }

    // Try each channel in order
    for (const channel of args.fallbackOrder) {
      // Update message channel for this attempt
      await ctx.db.patch(args.messageId, {
        channel,
        updatedAt: Date.now(),
      });

      const result = await ctx.runMutation(internal.sequences.messageSender.sendMessage, {
        messageId: args.messageId,
      });

      if (result.success) {
        return result;
      }

      console.log(`[MessageSender] Channel ${channel} failed, trying next...`);
    }

    return {
      success: false,
      error: `All channels failed: ${args.fallbackOrder.join(", ")}`,
    };
  },
});

// ============================================================================
// TEST/DEBUG HELPERS
// ============================================================================

/**
 * Preview message content (for UI preview)
 */
export const previewMessage = internalMutation({
  args: {
    messageId: v.id("sequenceMessageQueue"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      return null;
    }

    return {
      channel: message.channel,
      recipientEmail: message.recipientEmail,
      recipientPhone: message.recipientPhone,
      subject: message.subject,
      body: message.body,
      bodyHtml: message.bodyHtml,
      scheduledFor: message.scheduledFor,
      status: message.status,
    };
  },
});
