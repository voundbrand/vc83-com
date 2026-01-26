/**
 * ManyChat Webhook Receiver
 *
 * Receives webhooks from ManyChat when subscribers interact.
 * Routes events to the appropriate handlers in Convex.
 *
 * Setup in ManyChat:
 * 1. Go to Settings → Integrations → API
 * 2. Add webhook URL: https://your-domain.com/api/webhooks/manychat
 * 3. Select events to receive (message, tag_added, etc.)
 *
 * Security:
 * - Webhook includes API key header for verification
 * - Organization ID extracted from custom field or mapped from page_id
 */

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// ManyChat webhook event types
interface ManyChatWebhookPayload {
  // Common fields
  subscriber_id: string;
  page_id: string;

  // Event-specific data
  event?: string;
  text?: string;
  live_chat_url?: string;

  // Custom fields (may contain org mapping)
  custom_fields?: Array<{
    id: number;
    name: string;
    value: unknown;
  }>;

  // For tag events
  tag_id?: number;
  tag_name?: string;

  // Raw data
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    // Get authorization header (ManyChat API key)
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[ManyChat Webhook] Missing or invalid authorization header");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const apiKey = authHeader.replace("Bearer ", "");

    // Parse webhook payload
    const payload: ManyChatWebhookPayload = await request.json();

    console.log("[ManyChat Webhook] Received", {
      subscriberId: payload.subscriber_id,
      pageId: payload.page_id,
      event: payload.event,
    });

    // Look up organization by API key
    // We need to find which org this ManyChat account belongs to
    const orgId = await findOrganizationByApiKey(apiKey);

    if (!orgId) {
      console.error("[ManyChat Webhook] Organization not found for API key");
      // Return 200 to prevent ManyChat from retrying
      return NextResponse.json({ status: "ok", message: "Organization not configured" });
    }

    // Determine event type
    const eventType = payload.event || "unknown";

    // Process webhook via Convex internal action
    // Note: We use fetch to call the HTTP action endpoint since internal actions
    // aren't directly callable from Next.js
    await processWebhookInConvex(orgId, eventType, payload.subscriber_id, payload);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[ManyChat Webhook] Error:", error);
    // Return 200 to prevent retries for malformed payloads
    return NextResponse.json(
      { status: "error", message: "Processing failed" },
      { status: 200 }
    );
  }
}

/**
 * Find organization by ManyChat API key
 * Searches manychat_settings objects to match the API key
 */
async function findOrganizationByApiKey(apiKey: string): Promise<Id<"organizations"> | null> {
  try {
    // Query Convex to find the organization with this API key
    // This is a simple lookup - in production you might want to hash/encrypt
    const result = await convex.query(api.integrations.manychat.findOrgByApiKey, {
      apiKeyPrefix: apiKey.substring(0, 20), // Use prefix for lookup
    });

    return result?.organizationId || null;
  } catch (error) {
    console.error("[ManyChat Webhook] Error finding organization:", error);
    return null;
  }
}

/**
 * Process webhook in Convex
 * Calls the internal action to handle the event
 */
async function processWebhookInConvex(
  organizationId: Id<"organizations">,
  event: string,
  subscriberId: string,
  data: ManyChatWebhookPayload
): Promise<void> {
  try {
    // Use the Convex HTTP client to call a mutation that schedules the internal action
    await convex.mutation(api.integrations.manychat.scheduleWebhookProcessing, {
      organizationId,
      event,
      subscriberId,
      data,
    });
  } catch (error) {
    console.error("[ManyChat Webhook] Error processing in Convex:", error);
    throw error;
  }
}

// GET handler for webhook verification (if ManyChat requires it)
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (challenge) {
    // Return challenge for webhook verification
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ status: "ManyChat webhook endpoint active" });
}
