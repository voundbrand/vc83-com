/**
 * AI Webinar Management Tool
 *
 * Comprehensive tool for managing webinars through natural language:
 * - Create and configure webinars
 * - Manage registrations
 * - View analytics
 * - Upload videos
 * - Configure offers
 */

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../_generated/api");

// ============================================================================
// TOOL DEFINITION
// ============================================================================

export const webinarToolDefinition = {
  type: "function" as const,
  function: {
    name: "manage_webinars",
    description: `Comprehensive webinar management: create webinars, manage registrations, view analytics, configure offers, and upload videos.

WEBINAR TYPES:
- automated: Pre-recorded video that plays at scheduled times (most common)
- on_demand: Always available to watch anytime
- live: Real-time broadcast (requires streaming setup)
- series: Multiple sessions over time

IMPORTANT WORKFLOW FOR CREATING WEBINARS:
1. First gather: name, description, type, scheduled time, duration
2. Preview the webinar configuration before creating
3. After creation, video must be uploaded before publishing
4. Use "get_upload_url" action to get a Mux direct upload URL
5. After video upload completes, use "publish" action to make it live

OFFER CONFIGURATION:
Webinars can reveal an offer/CTA at a specific timestamp during playback:
- offerEnabled: true/false
- offerTimestamp: seconds into video when offer appears
- offerCtaText: Button text (e.g., "Get Started Now")
- offerCheckoutId: Link to internal checkout page
- offerExternalUrl: Link to external URL`,
    parameters: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: [
            "list_webinars",
            "get_webinar",
            "create_webinar",
            "update_webinar",
            "publish_webinar",
            "get_upload_url",
            "list_registrants",
            "get_analytics"
          ],
          description: `Action to perform:
- list_webinars: Show all webinars with status/analytics summary
- get_webinar: Get detailed info about a specific webinar
- create_webinar: Create a new webinar (use preview mode first)
- update_webinar: Modify webinar settings/offer config
- publish_webinar: Make a draft webinar live (requires video)
- get_upload_url: Get Mux direct upload URL for video
- list_registrants: View people registered for a webinar
- get_analytics: View funnel metrics and engagement stats`
        },
        mode: {
          type: "string",
          enum: ["preview", "execute"],
          description: "preview = show what will happen (default), execute = perform the operation. ALWAYS use preview first!"
        },
        workItemId: {
          type: "string",
          description: "Work item ID (for execute mode - returned from preview)"
        },
        // Webinar identification
        webinarId: {
          type: "string",
          description: "Webinar ID - required for get_webinar, update_webinar, publish_webinar, get_upload_url, list_registrants, get_analytics"
        },
        // Create/Update fields
        name: {
          type: "string",
          description: "Webinar title (for create_webinar, update_webinar)"
        },
        description: {
          type: "string",
          description: "Webinar description (for create_webinar, update_webinar)"
        },
        subtype: {
          type: "string",
          enum: ["automated", "on_demand", "live", "series"],
          description: "Webinar type (for create_webinar). Default: automated"
        },
        scheduledAt: {
          type: "string",
          description: "Scheduled start time in ISO 8601 format (e.g., '2025-02-01T14:00:00Z')"
        },
        durationMinutes: {
          type: "number",
          description: "Expected duration in minutes (default: 60)"
        },
        timezone: {
          type: "string",
          description: "Timezone for scheduling (e.g., 'America/New_York', 'Europe/Berlin'). Default: Europe/Berlin"
        },
        maxRegistrants: {
          type: "number",
          description: "Maximum registrations allowed (optional, unlimited if not set)"
        },
        // Offer configuration
        offerEnabled: {
          type: "boolean",
          description: "Enable offer/CTA reveal during webinar"
        },
        offerTimestamp: {
          type: "number",
          description: "Seconds into video when offer appears"
        },
        offerCtaText: {
          type: "string",
          description: "CTA button text (e.g., 'Get Started Now', 'Claim Your Discount')"
        },
        offerCheckoutId: {
          type: "string",
          description: "Internal checkout page ID for the offer"
        },
        offerExternalUrl: {
          type: "string",
          description: "External URL for the offer (alternative to checkoutId)"
        },
        // List filters
        status: {
          type: "string",
          enum: ["draft", "scheduled", "live", "completed", "cancelled"],
          description: "Filter by webinar status (for list_webinars)"
        },
        registrantStatus: {
          type: "string",
          enum: ["registered", "attended", "missed", "converted"],
          description: "Filter registrants by status (for list_registrants)"
        },
        limit: {
          type: "number",
          description: "Maximum results to return (default: 20)"
        }
      },
      required: ["action"]
    }
  }
};

// ============================================================================
// MAIN ACTION HANDLER
// ============================================================================

export const executeManageWebinars = action({
  args: {
    sessionId: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    conversationId: v.optional(v.id("aiConversations")),
    action: v.string(),
    mode: v.optional(v.string()),
    workItemId: v.optional(v.string()),
    webinarId: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    subtype: v.optional(v.string()),
    scheduledAt: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    timezone: v.optional(v.string()),
    maxRegistrants: v.optional(v.number()),
    offerEnabled: v.optional(v.boolean()),
    offerTimestamp: v.optional(v.number()),
    offerCtaText: v.optional(v.string()),
    offerCheckoutId: v.optional(v.string()),
    offerExternalUrl: v.optional(v.string()),
    status: v.optional(v.string()),
    registrantStatus: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    action: string;
    mode?: string;
    workItemId?: string;
    workItemType?: string;
    data?: any;
    message?: string;
    error?: string;
  }> => {
    // 1. Get organization context
    let organizationId: Id<"organizations">;
    let userId: Id<"users"> | undefined = args.userId;

    if (args.organizationId && args.userId) {
      organizationId = args.organizationId;
    } else if (args.sessionId) {
      const session = await (ctx as any).runQuery(generatedApi.internal.stripeConnect.validateSession, {
        sessionId: args.sessionId
      });
      if (!session?.organizationId || !session?.userId) {
        throw new Error("Invalid session");
      }
      organizationId = session.organizationId;
      userId = session.userId;
    } else {
      throw new Error("Authentication context required");
    }

    // 2. Route to action handler
    try {
      switch (args.action) {
        case "list_webinars":
          return await listWebinars(ctx, organizationId, args);

        case "get_webinar":
          if (!args.webinarId) throw new Error("webinarId required");
          return await getWebinar(ctx, organizationId, args.webinarId);

        case "create_webinar":
          if (!args.name) throw new Error("name required for creating webinar");
          if (!userId) throw new Error("userId required");
          return await createWebinar(ctx, organizationId, userId, args);

        case "update_webinar":
          if (!args.webinarId) throw new Error("webinarId required");
          return await updateWebinar(ctx, organizationId, args);

        case "publish_webinar":
          if (!args.webinarId) throw new Error("webinarId required");
          if (!userId) throw new Error("userId required");
          return await publishWebinar(ctx, organizationId, userId, args);

        case "get_upload_url":
          if (!args.webinarId) throw new Error("webinarId required");
          return await getUploadUrl(ctx, organizationId, args.webinarId);

        case "list_registrants":
          if (!args.webinarId) throw new Error("webinarId required");
          return await listRegistrants(ctx, organizationId, args);

        case "get_analytics":
          if (!args.webinarId) throw new Error("webinarId required");
          return await getAnalytics(ctx, organizationId, args.webinarId);

        default:
          return {
            success: false,
            action: args.action,
            error: `Unknown action: ${args.action}`
          };
      }
    } catch (error: any) {
      console.error(`[Webinar Tool] Error in ${args.action}:`, error);
      return {
        success: false,
        action: args.action,
        error: error.message || "An unexpected error occurred"
      };
    }
  }
});

// ============================================================================
// ACTION IMPLEMENTATIONS
// ============================================================================

/**
 * List all webinars for the organization
 */
async function listWebinars(
  ctx: any,
  organizationId: Id<"organizations">,
  args: any
) {
  const result = await (ctx as any).runQuery(generatedApi.api.webinarOntology.getWebinars, {
    organizationId,
    status: args.status,
    subtype: args.subtype,
    limit: args.limit || 20,
  });

  const webinarSummaries = result.webinars.map((w: any) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    type: w.subtype,
    status: w.status,
    scheduledAt: w.scheduledAt ? new Date(w.scheduledAt).toISOString() : null,
    registrantCount: w.registrantCount,
    attendeeCount: w.attendeeCount,
    muxStatus: w.muxStatus,
  }));

  return {
    success: true,
    action: "list_webinars",
    data: {
      webinars: webinarSummaries,
      total: result.total,
    },
    message: result.total === 0
      ? "No webinars found. Would you like to create one?"
      : `Found ${result.total} webinar(s)${args.status ? ` with status "${args.status}"` : ""}`
  };
}

/**
 * Get detailed webinar information
 */
async function getWebinar(
  ctx: any,
  organizationId: Id<"organizations">,
  webinarId: string
) {
  const webinar = await (ctx as any).runQuery(generatedApi.api.webinarOntology.getWebinar, {
    webinarId: webinarId as Id<"objects">,
    organizationId,
  });

  if (!webinar) {
    return {
      success: false,
      action: "get_webinar",
      error: "Webinar not found"
    };
  }

  return {
    success: true,
    action: "get_webinar",
    data: { webinar },
    message: `Webinar: ${webinar.name} (${webinar.status})`
  };
}

/**
 * Create a new webinar (with preview/execute pattern)
 */
async function createWebinar(
  ctx: any,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  args: any
) {
  const mode = args.mode || "preview";

  // Parse scheduled time if provided
  const scheduledAt = args.scheduledAt
    ? new Date(args.scheduledAt).getTime()
    : undefined;

  const webinarConfig = {
    name: args.name,
    description: args.description || "",
    subtype: args.subtype || "automated",
    scheduledAt,
    durationMinutes: args.durationMinutes || 60,
    timezone: args.timezone || "Europe/Berlin",
    maxRegistrants: args.maxRegistrants,
    offerEnabled: args.offerEnabled,
    offerTimestamp: args.offerTimestamp,
    offerCheckoutId: args.offerCheckoutId,
    offerCtaText: args.offerCtaText,
  };

  // PREVIEW MODE: Show what will be created
  if (mode === "preview") {
    const previewData = {
      id: "preview-" + Date.now(),
      type: "webinar",
      ...webinarConfig,
      status: "draft",
      preview: {
        action: "create" as const,
        confidence: "high" as const,
        reason: "New webinar will be created",
        nextSteps: [
          "After creation, upload a video using get_upload_url",
          "Configure offer settings if needed",
          "Publish when ready to accept registrations"
        ]
      }
    };

    // Create work item for tracking
    const workItemId = await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalCreateWorkItem,
      {
        organizationId,
        userId,
        conversationId: args.conversationId,
        type: "webinar_create",
        name: `Create Webinar - ${args.name}`,
        status: "preview",
        previewData: [previewData],
      }
    );

    return {
      success: true,
      action: "create_webinar",
      mode: "preview",
      workItemId,
      workItemType: "webinar_create",
      data: {
        webinar: previewData,
        summary: {
          name: args.name,
          type: webinarConfig.subtype,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : "Not scheduled",
          duration: `${webinarConfig.durationMinutes} minutes`,
        }
      },
      message: `Ready to create webinar "${args.name}". Please confirm to proceed.`
    };
  }

  // EXECUTE MODE: Actually create the webinar
  const result = await (ctx as any).runMutation(generatedApi.api.webinarOntology.createWebinar, {
    organizationId,
    name: args.name,
    description: args.description,
    subtype: webinarConfig.subtype as any,
    scheduledAt,
    durationMinutes: webinarConfig.durationMinutes,
    timezone: webinarConfig.timezone,
    maxRegistrants: webinarConfig.maxRegistrants,
    offerEnabled: webinarConfig.offerEnabled,
    offerTimestamp: webinarConfig.offerTimestamp,
    offerCheckoutId: webinarConfig.offerCheckoutId,
    offerCtaText: webinarConfig.offerCtaText,
    performedBy: userId,
  });

  // Update work item if provided
  if (args.workItemId) {
    await (ctx as any).runMutation(
      generatedApi.internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
      {
        workItemId: args.workItemId,
        status: "completed",
        results: { webinarId: result.webinarId, slug: result.slug }
      }
    );
  }

  return {
    success: true,
    action: "create_webinar",
    mode: "execute",
    data: {
      webinarId: result.webinarId,
      slug: result.slug,
      status: "draft",
      nextSteps: [
        `Upload video: Use get_upload_url action with webinarId="${result.webinarId}"`,
        "Configure offer if needed",
        "Publish to go live"
      ]
    },
    message: `Created webinar "${args.name}" (ID: ${result.webinarId}). Next step: Upload a video.`
  };
}

/**
 * Update webinar settings
 */
async function updateWebinar(
  ctx: any,
  organizationId: Id<"organizations">,
  args: any
) {
  const scheduledAt = args.scheduledAt
    ? new Date(args.scheduledAt).getTime()
    : undefined;

  await (ctx as any).runMutation(generatedApi.api.webinarOntology.updateWebinar, {
    webinarId: args.webinarId as Id<"objects">,
    organizationId,
    name: args.name,
    description: args.description,
    scheduledAt,
    durationMinutes: args.durationMinutes,
    timezone: args.timezone,
    maxRegistrants: args.maxRegistrants,
    offerEnabled: args.offerEnabled,
    offerTimestamp: args.offerTimestamp,
    offerCheckoutId: args.offerCheckoutId,
    offerCtaText: args.offerCtaText,
    offerExternalUrl: args.offerExternalUrl,
  });

  return {
    success: true,
    action: "update_webinar",
    data: { webinarId: args.webinarId },
    message: "Webinar updated successfully"
  };
}

/**
 * Publish a draft webinar
 */
async function publishWebinar(
  ctx: any,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  args: any
) {
  const mode = args.mode || "preview";

  // Get current webinar status
  const webinar = await (ctx as any).runQuery(generatedApi.api.webinarOntology.getWebinar, {
    webinarId: args.webinarId as Id<"objects">,
    organizationId,
  });

  if (!webinar) {
    return {
      success: false,
      action: "publish_webinar",
      error: "Webinar not found"
    };
  }

  if (webinar.status !== "draft") {
    return {
      success: false,
      action: "publish_webinar",
      error: `Cannot publish: webinar is already "${webinar.status}"`
    };
  }

  // Check if video is ready
  if (!webinar.muxPlaybackId && webinar.subtype !== "live") {
    return {
      success: false,
      action: "publish_webinar",
      error: "Cannot publish: no video uploaded. Use get_upload_url to upload a video first."
    };
  }

  if (mode === "preview") {
    return {
      success: true,
      action: "publish_webinar",
      mode: "preview",
      data: {
        webinar: {
          id: webinar.id,
          name: webinar.name,
          currentStatus: webinar.status,
          newStatus: "scheduled",
        }
      },
      message: `Ready to publish "${webinar.name}". This will make it available for registrations. Confirm to proceed.`
    };
  }

  await (ctx as any).runMutation(generatedApi.api.webinarOntology.publishWebinar, {
    webinarId: args.webinarId as Id<"objects">,
    organizationId,
    performedBy: userId,
  });

  return {
    success: true,
    action: "publish_webinar",
    mode: "execute",
    data: { webinarId: args.webinarId, status: "scheduled" },
    message: `Webinar "${webinar.name}" is now published and accepting registrations!`
  };
}

/**
 * Get Mux direct upload URL
 */
async function getUploadUrl(
  ctx: any,
  organizationId: Id<"organizations">,
  webinarId: string
) {
  // Verify webinar exists
  const webinar = await (ctx as any).runQuery(generatedApi.api.webinarOntology.getWebinar, {
    webinarId: webinarId as Id<"objects">,
    organizationId,
  });

  if (!webinar) {
    return {
      success: false,
      action: "get_upload_url",
      error: "Webinar not found"
    };
  }

  const result = await (ctx as any).runAction(generatedApi.api.actions.mux.getDirectUploadUrl, {
    webinarId: webinarId as Id<"objects">,
  });

  return {
    success: true,
    action: "get_upload_url",
    data: {
      uploadUrl: result.uploadUrl,
      uploadId: result.uploadId,
      expiresAt: new Date(result.expiresAt).toISOString(),
      instructions: [
        "Use PUT request to upload video to the uploadUrl",
        "Video will be automatically processed by Mux",
        "Webinar will be updated with playback info when ready",
        "Check webinar status for muxStatus updates"
      ]
    },
    message: `Upload URL generated for "${webinar.name}". URL expires in 1 hour.`
  };
}

/**
 * List webinar registrants
 */
async function listRegistrants(
  ctx: any,
  organizationId: Id<"organizations">,
  args: any
) {
  const result = await (ctx as any).runQuery(generatedApi.api.webinarRegistrants.getRegistrants, {
    webinarId: args.webinarId as Id<"objects">,
    organizationId,
    status: args.registrantStatus,
    limit: args.limit || 50,
    offset: 0,
  });

  const registrantSummaries = result.registrants.map((r: any) => ({
    id: r.id,
    name: `${r.firstName} ${r.lastName || ""}`.trim(),
    email: r.email,
    status: r.subtype,
    attended: r.attended,
    watchTimeMinutes: r.watchTimeSeconds ? Math.round(r.watchTimeSeconds / 60) : 0,
    sawOffer: r.sawOffer,
    clickedOffer: r.clickedOffer,
    converted: r.converted,
    registeredAt: r.registeredAt ? new Date(r.registeredAt).toISOString() : null,
  }));

  return {
    success: true,
    action: "list_registrants",
    data: {
      registrants: registrantSummaries,
      total: result.total,
      summary: {
        total: result.total,
        attended: registrantSummaries.filter((r: any) => r.attended).length,
        converted: registrantSummaries.filter((r: any) => r.converted).length,
      }
    },
    message: `Found ${result.total} registrant(s)${args.registrantStatus ? ` with status "${args.registrantStatus}"` : ""}`
  };
}

/**
 * Get webinar analytics
 */
async function getAnalytics(
  ctx: any,
  organizationId: Id<"organizations">,
  webinarId: string
) {
  const analytics = await (ctx as any).runQuery(
    generatedApi.internal.api.v1.webinarsInternal.getWebinarAnalytics,
    {
      webinarId: webinarId as Id<"objects">,
      organizationId,
    }
  );

  if (!analytics) {
    return {
      success: false,
      action: "get_analytics",
      error: "Webinar not found or no analytics available"
    };
  }

  return {
    success: true,
    action: "get_analytics",
    data: {
      funnel: analytics.funnel,
      engagement: analytics.engagement,
      sources: analytics.sources,
    },
    message: `Analytics: ${analytics.funnel.registrations} registrations, ${analytics.funnel.showRate}% show rate, ${analytics.funnel.conversionRate}% conversion rate`
  };
}
