import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

/**
 * ActiveCampaign Webhook Handler
 *
 * Receives webhook events from ActiveCampaign for contact and automation updates.
 * Forwards events to internal workflows and updates CRM.
 *
 * Supported Events:
 * - Contact: subscribe, unsubscribe, contact_tag_added, contact_tag_removed, update
 * - Campaign: forward, open, share, sent, bounce, reply, click
 * - Deal: deal_add, deal_update, deal_note_add, deal_task_add, deal_task_complete
 * - List: list_add
 * - SMS: sms_reply, sms_sent, sms_unsub
 *
 * Note: ActiveCampaign guarantees at-least-once delivery.
 * Webhooks are NOT retried on failure.
 *
 * @see https://developers.activecampaign.com/reference/webhooks
 */

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    // Parse webhook payload (form-urlencoded or JSON)
    const contentType = request.headers.get("content-type") || "";
    let payload: ActiveCampaignWebhookPayload;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      payload = Object.fromEntries(formData.entries()) as unknown as ActiveCampaignWebhookPayload;
    } else {
      payload = await request.json();
    }

    console.log("[ActiveCampaign Webhook] Received event:", {
      type: payload.type,
      date_time: payload.date_time,
      contact_email: payload.contact?.email,
      account: payload.account,
    });

    // Try to identify organization from account name
    // Organizations can configure their AC account name to match their org
    const organizationId = await resolveOrganization(payload.account);

    // Forward event to internal workflow system
    if (organizationId) {
      await forwardToWorkflow(payload, organizationId);
    }

    // Handle specific event types
    switch (payload.type) {
      // Contact Events
      case "subscribe":
        await handleSubscribe(payload, organizationId);
        break;

      case "unsubscribe":
        await handleUnsubscribe(payload, organizationId);
        break;

      case "contact_tag_added":
        await handleContactTagAdded(payload, organizationId);
        break;

      case "contact_tag_removed":
        await handleContactTagRemoved(payload, organizationId);
        break;

      case "update":
        await handleContactUpdate(payload, organizationId);
        break;

      // Campaign Events
      case "open":
        await handleCampaignOpen(payload, organizationId);
        break;

      case "click":
        await handleCampaignClick(payload, organizationId);
        break;

      case "bounce":
        await handleBounce(payload, organizationId);
        break;

      case "reply":
        await handleReply(payload, organizationId);
        break;

      // Deal Events
      case "deal_add":
        await handleDealAdd(payload, organizationId);
        break;

      case "deal_update":
        await handleDealUpdate(payload, organizationId);
        break;

      default:
        console.log("[ActiveCampaign Webhook] Unhandled event type:", payload.type);
    }

    // ActiveCampaign expects a 200 response
    return NextResponse.json({
      received: true,
      type: payload.type,
      organizationId: organizationId || null,
    });
  } catch (error) {
    console.error("[ActiveCampaign Webhook] Error processing webhook:", error);
    // Return 200 anyway to prevent ActiveCampaign from thinking we failed
    // (they don't retry, so returning 500 doesn't help)
    return NextResponse.json(
      { error: "Webhook processing failed", received: true },
      { status: 200 }
    );
  }
}

/** ActiveCampaign webhook payload structure */
interface ActiveCampaignWebhookPayload {
  type: string;
  date_time?: string;
  initiated_by?: string; // "public", "admin", "api", "system"
  initiated_from?: string;

  // Contact data
  contact?: {
    id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    tags?: string;
    ip4?: string;
    customer_acct_name?: string;
  };

  // List data
  list?: {
    id?: string;
    name?: string;
  };

  // Tag data
  tag?: string;

  // Campaign data
  campaign?: {
    id?: string;
    name?: string;
  };

  // Deal data
  deal?: {
    id?: string;
    title?: string;
    value?: string;
    currency?: string;
    pipeline?: string;
    stage?: string;
    owner?: string;
  };

  // Link data (for click events)
  link?: {
    url?: string;
    name?: string;
  };

  // Account identifier (useful for multi-tenant)
  account?: string;
}

// ==================== ORGANIZATION RESOLUTION ====================

/**
 * Resolve organization from ActiveCampaign account name
 * Organizations can configure their AC connection to be identifiable
 */
async function resolveOrganization(accountName?: string): Promise<string | null> {
  if (!accountName) return null;

  try {
    // Look up organization by ActiveCampaign account name
    // This is stored in the oauthConnection's providerAccountId
    const result = await convex.query(api.oauth.activecampaignWebhook.findOrganizationByAccount, {
      accountName,
    });
    return result?.organizationId || null;
  } catch (error) {
    console.error("[ActiveCampaign Webhook] Failed to resolve organization:", error);
    return null;
  }
}

// ==================== WORKFLOW FORWARDING ====================

/**
 * Forward webhook event to internal workflow system
 * Triggers any workflows configured for "activecampaign_event" trigger
 */
async function forwardToWorkflow(payload: ActiveCampaignWebhookPayload, organizationId: string | null) {
  if (!organizationId) return;

  try {
    await convex.action(api.oauth.activecampaignWebhook.processWebhookEvent, {
      organizationId: organizationId as any, // Type assertion for Convex ID
      eventType: payload.type,
      eventData: {
        contact: payload.contact,
        list: payload.list,
        tag: payload.tag,
        campaign: payload.campaign,
        deal: payload.deal,
        link: payload.link,
        initiatedBy: payload.initiated_by,
        dateTime: payload.date_time,
      },
    });
  } catch (error) {
    console.error("[ActiveCampaign Webhook] Failed to forward to workflow:", error);
  }
}

// ==================== EVENT HANDLERS ====================

async function handleSubscribe(payload: ActiveCampaignWebhookPayload, organizationId: string | null) {
  console.log("[ActiveCampaign Webhook] Contact subscribed:", {
    email: payload.contact?.email,
    list: payload.list?.name,
    initiatedBy: payload.initiated_by,
    organizationId,
  });

  if (organizationId && payload.contact?.email) {
    try {
      await convex.action(api.oauth.activecampaignWebhook.syncContactToPlatform, {
        organizationId: organizationId as any,
        email: payload.contact.email,
        firstName: payload.contact.first_name,
        lastName: payload.contact.last_name,
        phone: payload.contact.phone,
        source: "activecampaign_subscribe",
        listName: payload.list?.name,
      });
    } catch (error) {
      console.error("[ActiveCampaign Webhook] Failed to sync subscribed contact:", error);
    }
  }
}

async function handleUnsubscribe(payload: ActiveCampaignWebhookPayload, organizationId: string | null) {
  console.log("[ActiveCampaign Webhook] Contact unsubscribed:", {
    email: payload.contact?.email,
    list: payload.list?.name,
    organizationId,
  });

  // Could mark contact as unsubscribed in CRM
}

async function handleContactTagAdded(payload: ActiveCampaignWebhookPayload, organizationId: string | null) {
  console.log("[ActiveCampaign Webhook] Tag added to contact:", {
    email: payload.contact?.email,
    tag: payload.tag,
    organizationId,
  });

  // Could sync tag to platform CRM contact
}

async function handleContactTagRemoved(payload: ActiveCampaignWebhookPayload, organizationId: string | null) {
  console.log("[ActiveCampaign Webhook] Tag removed from contact:", {
    email: payload.contact?.email,
    tag: payload.tag,
    organizationId,
  });

  // Could remove tag from platform CRM contact
}

async function handleContactUpdate(payload: ActiveCampaignWebhookPayload, organizationId: string | null) {
  console.log("[ActiveCampaign Webhook] Contact updated:", {
    email: payload.contact?.email,
    firstName: payload.contact?.first_name,
    lastName: payload.contact?.last_name,
    organizationId,
  });

  if (organizationId && payload.contact?.email) {
    try {
      await convex.action(api.oauth.activecampaignWebhook.syncContactToPlatform, {
        organizationId: organizationId as any,
        email: payload.contact.email,
        firstName: payload.contact.first_name,
        lastName: payload.contact.last_name,
        phone: payload.contact.phone,
        source: "activecampaign_update",
      });
    } catch (error) {
      console.error("[ActiveCampaign Webhook] Failed to sync updated contact:", error);
    }
  }
}

async function handleCampaignOpen(payload: ActiveCampaignWebhookPayload, organizationId: string | null) {
  console.log("[ActiveCampaign Webhook] Campaign opened:", {
    email: payload.contact?.email,
    campaign: payload.campaign?.name,
    organizationId,
  });

  // Track campaign engagement in analytics
}

async function handleCampaignClick(payload: ActiveCampaignWebhookPayload, organizationId: string | null) {
  console.log("[ActiveCampaign Webhook] Link clicked:", {
    email: payload.contact?.email,
    campaign: payload.campaign?.name,
    link: payload.link?.url,
    organizationId,
  });

  // Track link click in analytics
}

async function handleBounce(payload: ActiveCampaignWebhookPayload, organizationId: string | null) {
  console.log("[ActiveCampaign Webhook] Email bounced:", {
    email: payload.contact?.email,
    campaign: payload.campaign?.name,
    organizationId,
  });

  // Mark contact email as bounced in platform CRM
}

async function handleReply(payload: ActiveCampaignWebhookPayload, organizationId: string | null) {
  console.log("[ActiveCampaign Webhook] Email reply received:", {
    email: payload.contact?.email,
    campaign: payload.campaign?.name,
    organizationId,
  });

  // Create conversation thread or notification
}

async function handleDealAdd(payload: ActiveCampaignWebhookPayload, organizationId: string | null) {
  console.log("[ActiveCampaign Webhook] Deal created:", {
    title: payload.deal?.title,
    value: payload.deal?.value,
    pipeline: payload.deal?.pipeline,
    stage: payload.deal?.stage,
    organizationId,
  });

  // Sync deal to platform CRM pipeline
}

async function handleDealUpdate(payload: ActiveCampaignWebhookPayload, organizationId: string | null) {
  console.log("[ActiveCampaign Webhook] Deal updated:", {
    id: payload.deal?.id,
    title: payload.deal?.title,
    stage: payload.deal?.stage,
    organizationId,
  });

  // Update deal in platform CRM pipeline
}

// GET handler for webhook verification (some integrations require this)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "ok",
    message: "ActiveCampaign webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
