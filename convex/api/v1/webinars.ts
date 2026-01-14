/**
 * API V1: WEBINAR ENDPOINTS
 *
 * REST API for webinar management.
 * The API is the product - all consumption layers use these endpoints.
 *
 * PUBLIC Endpoints (No Auth):
 * - GET  /api/v1/webinars/{id}/public - Get webinar info for registration page
 * - POST /api/v1/webinars/{id}/register - Register for webinar
 * - GET  /api/v1/webinars/{id}/playback - Get playback info (requires code)
 * - GET  /api/v1/webinars/{id}/calendar.ics - Download calendar invite
 * - POST /api/v1/webinars/{id}/track/* - Tracking events
 *
 * AUTHENTICATED Endpoints:
 * - GET    /api/v1/webinars - List webinars
 * - POST   /api/v1/webinars - Create webinar
 * - GET    /api/v1/webinars/{id} - Get webinar details
 * - PATCH  /api/v1/webinars/{id} - Update webinar
 * - DELETE /api/v1/webinars/{id} - Delete webinar
 * - POST   /api/v1/webinars/{id}/publish - Publish webinar
 * - GET    /api/v1/webinars/{id}/registrants - List registrants
 * - GET    /api/v1/webinars/{id}/analytics - Get analytics
 * - POST   /api/v1/webinars/upload/direct-url - Get Mux upload URL
 */

import { httpAction } from "../../_generated/server";
import { internal, api } from "../../_generated/api";
import { authenticateRequest, requireScopes, getEffectiveOrganizationId } from "../../middleware/auth";
import { getCorsHeaders, handleOptionsRequest } from "./corsHeaders";

// ============================================================================
// PUBLIC ENDPOINTS (No Auth Required)
// ============================================================================

/**
 * GET WEBINAR PUBLIC INFO
 *
 * Returns limited webinar info for registration pages.
 * No authentication required.
 */
export const getWebinarPublic = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const webinarId = pathParts[pathParts.length - 2]; // /webinars/{id}/public

    if (!webinarId) {
      return new Response(
        JSON.stringify({ error: "Webinar ID required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const webinar = await ctx.runQuery(api.webinarOntology.getWebinarPublic, {
      webinarId: webinarId as any,
    });

    if (!webinar) {
      return new Response(
        JSON.stringify({ error: "Webinar not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, webinar }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("API /webinars/public error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * REGISTER FOR WEBINAR
 *
 * Creates a registration for a webinar.
 * No authentication required - public endpoint.
 */
export const registerForWebinar = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const webinarId = pathParts[pathParts.length - 2]; // /webinars/{id}/register

    if (!webinarId) {
      return new Response(
        JSON.stringify({ error: "Webinar ID required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      jobTitle,
      selectedSession,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      customFields,
    } = body;

    // Validate required fields
    if (!firstName || !email) {
      return new Response(
        JSON.stringify({ error: "firstName and email are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Register
    const result = await ctx.runMutation(api.webinarRegistrants.registerForWebinar, {
      webinarId: webinarId as any,
      firstName,
      lastName,
      email,
      phone,
      company,
      jobTitle,
      selectedSession,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      referrer: request.headers.get("referer") || undefined,
      customFields,
    });

    // Get webinar details for response
    const webinar = await ctx.runQuery(api.webinarOntology.getWebinarPublic, {
      webinarId: webinarId as any,
    });

    // Build watch URL
    // Note: In production, this would use the organization's domain
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://l4yercak3.com";
    const watchUrl = `${baseUrl}/webinar/${webinar?.slug}/watch?code=${result.registrationCode}`;

    return new Response(
      JSON.stringify({
        success: true,
        registrantId: result.registrantId,
        registrationCode: result.registrationCode,
        contactId: result.contactId,
        isNewContact: result.isNewRegistration,
        webinar: webinar ? {
          name: webinar.name,
          scheduledAt: webinar.scheduling.nextSession,
          timezone: webinar.scheduling.timezone,
        } : null,
        watchUrl,
        calendarLinks: {
          ics: `${baseUrl}/api/v1/webinars/${webinarId}/calendar.ics?code=${result.registrationCode}`,
        },
      }),
      { status: result.isNewRegistration ? 201 : 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("API /webinars/register error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage === "Webinar not found") {
      return new Response(
        JSON.stringify({ error: "Webinar not found", code: "WEBINAR_NOT_FOUND" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (errorMessage === "Registration is closed") {
      return new Response(
        JSON.stringify({ error: "Registration is closed", code: "REGISTRATION_CLOSED" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (errorMessage === "Webinar is full") {
      return new Response(
        JSON.stringify({ error: "Webinar is full", code: "WEBINAR_FULL" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * GET PLAYBACK INFO
 *
 * Returns playback information for watching a webinar.
 * Requires valid registration code.
 */
export const getPlaybackInfo = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const webinarId = pathParts[pathParts.length - 2]; // /webinars/{id}/playback

    const code = url.searchParams.get("code");

    if (!webinarId || !code) {
      return new Response(
        JSON.stringify({ error: "Webinar ID and registration code required", code: "INVALID_REGISTRATION_CODE" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify registration
    const registrant = await ctx.runQuery(api.webinarRegistrants.getRegistrantByCode, {
      registrationCode: code,
      webinarId: webinarId as any,
    });

    if (!registrant) {
      return new Response(
        JSON.stringify({ error: "Invalid registration code", code: "INVALID_REGISTRATION_CODE" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get webinar
    const webinar = await ctx.runQuery(api.webinarOntology.getWebinarPublic, {
      webinarId: webinarId as any,
    });

    if (!webinar) {
      return new Response(
        JSON.stringify({ error: "Webinar not found", code: "WEBINAR_NOT_FOUND" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get full webinar details for playback
    const fullWebinar = await ctx.runQuery(internal.api.v1.webinarsInternal.getWebinarForPlayback, {
      webinarId: webinarId as any,
    });

    if (!fullWebinar) {
      return new Response(
        JSON.stringify({ error: "Webinar not found", code: "WEBINAR_NOT_FOUND" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Determine status
    let status: "waiting" | "countdown" | "live" | "ready" | "ended" = "waiting";
    let waitingMessage: string | null = null;
    let secondsRemaining: number | null = null;

    const now = Date.now();
    const scheduledAt = webinar.scheduling.nextSession;

    if (fullWebinar.status === "live") {
      status = "live";
    } else if (fullWebinar.status === "completed" && fullWebinar.muxPlaybackId) {
      status = "ready";
    } else if (fullWebinar.status === "scheduled") {
      if (scheduledAt) {
        const timeUntilStart = scheduledAt - now;
        if (timeUntilStart > 0) {
          status = "countdown";
          secondsRemaining = Math.floor(timeUntilStart / 1000);
        } else if (fullWebinar.muxPlaybackId) {
          status = "ready";
        } else {
          status = "waiting";
          waitingMessage = "Waiting for host to start...";
        }
      }
    } else if (fullWebinar.status === "cancelled") {
      status = "ended";
      waitingMessage = "This webinar has been cancelled";
    }

    // Build playback URLs
    let playback = null;
    if (fullWebinar.muxPlaybackId && (status === "ready" || status === "live")) {
      playback = {
        playbackId: fullWebinar.muxPlaybackId,
        streamUrl: `https://stream.mux.com/${fullWebinar.muxPlaybackId}.m3u8`,
        posterUrl: `https://image.mux.com/${fullWebinar.muxPlaybackId}/thumbnail.png`,
        duration: fullWebinar.videoDuration,
      };
    }

    // Build offer info
    let offer = null;
    if (fullWebinar.offerEnabled) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://l4yercak3.com";
      offer = {
        enabled: true,
        revealAtSeconds: fullWebinar.offerTimestamp,
        ctaText: fullWebinar.offerCtaText || "Get Started Now",
        ctaUrl: fullWebinar.offerCheckoutId
          ? `${baseUrl}/checkout/${fullWebinar.offerCheckoutId}?ref=webinar&code=${code}`
          : fullWebinar.offerExternalUrl,
        deadline: fullWebinar.offerDeadline,
        countdownEnabled: fullWebinar.offerCountdownEnabled,
      };
    }

    return new Response(
      JSON.stringify({
        status,
        waitingMessage,
        countdown: scheduledAt ? {
          startsAt: new Date(scheduledAt).toISOString(),
          secondsRemaining,
        } : null,
        playback,
        registrant: {
          id: registrant.id,
          firstName: registrant.firstName,
          joinedBefore: registrant.attended,
          watchTimeSeconds: registrant.watchTimeSeconds,
        },
        offer,
        muxDataEnvKey: process.env.NEXT_PUBLIC_MUX_DATA_ENV_KEY,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("API /webinars/playback error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * TRACK JOIN
 */
export const trackJoin = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await request.json();
    const { registrationCode, timestamp } = body;

    if (!registrationCode) {
      return new Response(
        JSON.stringify({ error: "Registration code required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get registrant by code
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const webinarId = pathParts[pathParts.length - 3]; // /webinars/{id}/track/join

    const registrant = await ctx.runQuery(api.webinarRegistrants.getRegistrantByCode, {
      registrationCode,
      webinarId: webinarId as any,
    });

    if (!registrant) {
      return new Response(
        JSON.stringify({ error: "Invalid registration code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    await ctx.runMutation(api.webinarRegistrants.trackJoin, {
      registrantId: registrant.id,
      timestamp: timestamp || Date.now(),
    });

    return new Response(
      JSON.stringify({ success: true, registrantId: registrant.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("API /webinars/track/join error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * TRACK PROGRESS
 */
export const trackProgress = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await request.json();
    const { registrationCode, currentTimeSeconds, totalWatchTimeSeconds } = body;

    if (!registrationCode) {
      return new Response(
        JSON.stringify({ error: "Registration code required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const webinarId = pathParts[pathParts.length - 3];

    const registrant = await ctx.runQuery(api.webinarRegistrants.getRegistrantByCode, {
      registrationCode,
      webinarId: webinarId as any,
    });

    if (!registrant) {
      return new Response(
        JSON.stringify({ error: "Invalid registration code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    await ctx.runMutation(api.webinarRegistrants.trackProgress, {
      registrantId: registrant.id,
      currentTimeSeconds: currentTimeSeconds || 0,
      totalWatchTimeSeconds: totalWatchTimeSeconds || 0,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("API /webinars/track/progress error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * TRACK LEAVE
 */
export const trackLeave = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await request.json();
    const { registrationCode, totalWatchTimeSeconds, maxPositionSeconds, timestamp } = body;

    if (!registrationCode) {
      return new Response(
        JSON.stringify({ error: "Registration code required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const webinarId = pathParts[pathParts.length - 3];

    const registrant = await ctx.runQuery(api.webinarRegistrants.getRegistrantByCode, {
      registrationCode,
      webinarId: webinarId as any,
    });

    if (!registrant) {
      return new Response(
        JSON.stringify({ error: "Invalid registration code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    await ctx.runMutation(api.webinarRegistrants.trackLeave, {
      registrantId: registrant.id,
      totalWatchTimeSeconds: totalWatchTimeSeconds || 0,
      maxPositionSeconds: maxPositionSeconds || 0,
      timestamp: timestamp || Date.now(),
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("API /webinars/track/leave error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * TRACK OFFER VIEWED
 */
export const trackOfferViewed = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await request.json();
    const { registrationCode, viewedAtSeconds, timestamp } = body;

    if (!registrationCode) {
      return new Response(
        JSON.stringify({ error: "Registration code required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const webinarId = pathParts[pathParts.length - 3];

    const registrant = await ctx.runQuery(api.webinarRegistrants.getRegistrantByCode, {
      registrationCode,
      webinarId: webinarId as any,
    });

    if (!registrant) {
      return new Response(
        JSON.stringify({ error: "Invalid registration code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    await ctx.runMutation(api.webinarRegistrants.trackOfferViewed, {
      registrantId: registrant.id,
      viewedAtSeconds: viewedAtSeconds || 0,
      timestamp: timestamp || Date.now(),
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("API /webinars/track/offer-viewed error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * TRACK OFFER CLICKED
 */
export const trackOfferClicked = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await request.json();
    const { registrationCode, clickedAtSeconds, timestamp } = body;

    if (!registrationCode) {
      return new Response(
        JSON.stringify({ error: "Registration code required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const webinarId = pathParts[pathParts.length - 3];

    const registrant = await ctx.runQuery(api.webinarRegistrants.getRegistrantByCode, {
      registrationCode,
      webinarId: webinarId as any,
    });

    if (!registrant) {
      return new Response(
        JSON.stringify({ error: "Invalid registration code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    await ctx.runMutation(api.webinarRegistrants.trackOfferClicked, {
      registrantId: registrant.id,
      clickedAtSeconds: clickedAtSeconds || 0,
      timestamp: timestamp || Date.now(),
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("API /webinars/track/offer-clicked error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ============================================================================
// AUTHENTICATED ENDPOINTS
// ============================================================================

/**
 * LIST WEBINARS
 *
 * Lists webinars for the authenticated organization.
 */
export const listWebinars = httpAction(async (ctx, request) => {
  try {
    // Authenticate
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const scopeCheck = requireScopes(authResult.context, ["webinars:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authResult.context);

    // Parse query params
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const subtype = url.searchParams.get("subtype") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const result = await ctx.runQuery(api.webinarOntology.getWebinars, {
      organizationId: organizationId as any,
      status,
      subtype,
      limit,
    });

    return new Response(
      JSON.stringify({ success: true, ...result }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /webinars (list) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * CREATE WEBINAR
 *
 * Creates a new webinar.
 */
export const createWebinar = httpAction(async (ctx, request) => {
  try {
    // Authenticate
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const scopeCheck = requireScopes(authResult.context, ["webinars:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authResult.context);

    // Parse body
    const body = await request.json();
    const {
      name,
      description,
      subtype = "automated",
      scheduledAt,
      durationMinutes = 60,
      timezone = "Europe/Berlin",
      maxRegistrants,
      evergreenEnabled,
      evergreenSchedule,
      offerEnabled,
      offerTimestamp,
      offerCheckoutId,
      offerCtaText,
    } = body;

    if (!name) {
      return new Response(
        JSON.stringify({ error: "name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await ctx.runMutation(api.webinarOntology.createWebinar, {
      organizationId: organizationId as any,
      name,
      description,
      subtype,
      scheduledAt,
      durationMinutes,
      timezone,
      maxRegistrants,
      evergreenEnabled,
      evergreenSchedule,
      offerEnabled,
      offerTimestamp,
      offerCheckoutId,
      offerCtaText,
      performedBy: authResult.context.userId as any,
    });

    return new Response(
      JSON.stringify({
        success: true,
        id: result.webinarId,
        slug: result.slug,
        status: "draft",
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /webinars (create) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET WEBINAR
 *
 * Gets full webinar details.
 */
export const getWebinar = httpAction(async (ctx, request) => {
  try {
    // Authenticate
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const scopeCheck = requireScopes(authResult.context, ["webinars:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authResult.context);

    // Extract webinar ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const webinarId = pathParts[pathParts.length - 1];

    const webinar = await ctx.runQuery(api.webinarOntology.getWebinar, {
      webinarId: webinarId as any,
      organizationId: organizationId as any,
    });

    if (!webinar) {
      return new Response(
        JSON.stringify({ error: "Webinar not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, webinar }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /webinars/:id error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * UPDATE WEBINAR
 *
 * Updates webinar fields.
 */
export const updateWebinar = httpAction(async (ctx, request) => {
  try {
    // Authenticate
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const scopeCheck = requireScopes(authResult.context, ["webinars:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authResult.context);

    // Extract webinar ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const webinarId = pathParts[pathParts.length - 1];

    const body = await request.json();

    await ctx.runMutation(api.webinarOntology.updateWebinar, {
      webinarId: webinarId as any,
      organizationId: organizationId as any,
      ...body,
      performedBy: authResult.context.userId as any,
    });

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error: unknown) {
    console.error("API /webinars/:id (update) error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage === "Webinar not found" || errorMessage === "Access denied") {
      return new Response(
        JSON.stringify({ error: "Webinar not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * DELETE WEBINAR
 */
export const deleteWebinar = httpAction(async (ctx, request) => {
  try {
    // Authenticate
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const scopeCheck = requireScopes(authResult.context, ["webinars:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authResult.context);

    // Extract webinar ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const webinarId = pathParts[pathParts.length - 1];

    await ctx.runMutation(api.webinarOntology.deleteWebinar, {
      webinarId: webinarId as any,
      organizationId: organizationId as any,
      performedBy: authResult.context.userId as any,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("API /webinars/:id (delete) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * PUBLISH WEBINAR
 */
export const publishWebinar = httpAction(async (ctx, request) => {
  try {
    // Authenticate
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const scopeCheck = requireScopes(authResult.context, ["webinars:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authResult.context);

    // Extract webinar ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const webinarId = pathParts[pathParts.length - 2]; // /webinars/{id}/publish

    await ctx.runMutation(api.webinarOntology.publishWebinar, {
      webinarId: webinarId as any,
      organizationId: organizationId as any,
      performedBy: authResult.context.userId as any,
    });

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error: unknown) {
    console.error("API /webinars/:id/publish error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage === "Only draft webinars can be published") {
      return new Response(
        JSON.stringify({ error: "Only draft webinars can be published" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * LIST REGISTRANTS
 */
export const listRegistrants = httpAction(async (ctx, request) => {
  try {
    // Authenticate
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const scopeCheck = requireScopes(authResult.context, ["webinars:registrants"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authResult.context);

    // Extract webinar ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const webinarId = pathParts[pathParts.length - 2]; // /webinars/{id}/registrants

    const status = url.searchParams.get("status") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const result = await ctx.runQuery(api.webinarRegistrants.getRegistrants, {
      webinarId: webinarId as any,
      organizationId: organizationId as any,
      status,
      limit,
      offset,
    });

    return new Response(
      JSON.stringify({ success: true, ...result }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /webinars/:id/registrants error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET DIRECT UPLOAD URL
 *
 * Gets a direct upload URL from Mux for video upload.
 */
export const getDirectUploadUrl = httpAction(async (ctx, request) => {
  try {
    // Authenticate
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const scopeCheck = requireScopes(authResult.context, ["webinars:upload"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authResult.context);

    const body = await request.json();
    const { webinarId, corsOrigin } = body;

    if (!webinarId) {
      return new Response(
        JSON.stringify({ error: "webinarId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify webinar belongs to organization
    const webinar = await ctx.runQuery(api.webinarOntology.getWebinar, {
      webinarId: webinarId as any,
      organizationId: organizationId as any,
    });

    if (!webinar) {
      return new Response(
        JSON.stringify({ error: "Webinar not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get upload URL from Mux
    const result = await ctx.runAction(api.actions.mux.getDirectUploadUrl, {
      webinarId: webinarId as any,
      corsOrigin,
    });

    return new Response(
      JSON.stringify({
        success: true,
        uploadUrl: result.uploadUrl,
        uploadId: result.uploadId,
        expiresAt: new Date(result.expiresAt).toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /webinars/upload/direct-url error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// MASTER ROUTERS
// These combine multiple handlers into single route handlers for http.ts
// ============================================================================

/**
 * MASTER GET ROUTER
 *
 * Routes all GET requests to the appropriate handler based on URL path.
 */
export const webinarGetRouter = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Route: /api/v1/webinars/{id}/public
    if (pathname.endsWith("/public")) {
      const pathParts = pathname.split("/");
      const webinarId = pathParts[pathParts.length - 2];

      const webinar = await ctx.runQuery(api.webinarOntology.getWebinarPublic, {
        webinarId: webinarId as any,
      });

      if (!webinar) {
        return new Response(
          JSON.stringify({ error: "Webinar not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, webinar }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Route: /api/v1/webinars/{id}/playback
    if (pathname.endsWith("/playback")) {
      const pathParts = pathname.split("/");
      const webinarId = pathParts[pathParts.length - 2];
      const code = url.searchParams.get("code");

      if (!code) {
        return new Response(
          JSON.stringify({ error: "Registration code required", code: "INVALID_REGISTRATION_CODE" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const registrant = await ctx.runQuery(api.webinarRegistrants.getRegistrantByCode, {
        registrationCode: code,
        webinarId: webinarId as any,
      });

      if (!registrant) {
        return new Response(
          JSON.stringify({ error: "Invalid registration code", code: "INVALID_REGISTRATION_CODE" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const webinar = await ctx.runQuery(api.webinarOntology.getWebinarPublic, {
        webinarId: webinarId as any,
      });

      if (!webinar) {
        return new Response(
          JSON.stringify({ error: "Webinar not found", code: "WEBINAR_NOT_FOUND" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const fullWebinar = await ctx.runQuery(internal.api.v1.webinarsInternal.getWebinarForPlayback, {
        webinarId: webinarId as any,
      });

      if (!fullWebinar) {
        return new Response(
          JSON.stringify({ error: "Webinar not found", code: "WEBINAR_NOT_FOUND" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Determine status
      let status: "waiting" | "countdown" | "live" | "ready" | "ended" = "waiting";
      let waitingMessage: string | null = null;
      let secondsRemaining: number | null = null;

      const now = Date.now();
      const scheduledAt = webinar.scheduling.nextSession;

      if (fullWebinar.status === "live") {
        status = "live";
      } else if (fullWebinar.status === "completed" && fullWebinar.muxPlaybackId) {
        status = "ready";
      } else if (fullWebinar.status === "scheduled") {
        if (scheduledAt) {
          const timeUntilStart = scheduledAt - now;
          if (timeUntilStart > 0) {
            status = "countdown";
            secondsRemaining = Math.floor(timeUntilStart / 1000);
          } else if (fullWebinar.muxPlaybackId) {
            status = "ready";
          } else {
            status = "waiting";
            waitingMessage = "Waiting for host to start...";
          }
        }
      } else if (fullWebinar.status === "cancelled") {
        status = "ended";
        waitingMessage = "This webinar has been cancelled";
      }

      // Build playback URLs
      let playback = null;
      if (fullWebinar.muxPlaybackId && (status === "ready" || status === "live")) {
        playback = {
          playbackId: fullWebinar.muxPlaybackId,
          streamUrl: `https://stream.mux.com/${fullWebinar.muxPlaybackId}.m3u8`,
          posterUrl: `https://image.mux.com/${fullWebinar.muxPlaybackId}/thumbnail.png`,
          duration: fullWebinar.videoDuration,
        };
      }

      // Build offer info
      let offer = null;
      if (fullWebinar.offerEnabled) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://l4yercak3.com";
        offer = {
          enabled: true,
          revealAtSeconds: fullWebinar.offerTimestamp,
          ctaText: fullWebinar.offerCtaText || "Get Started Now",
          ctaUrl: fullWebinar.offerCheckoutId
            ? `${baseUrl}/checkout/${fullWebinar.offerCheckoutId}?ref=webinar&code=${code}`
            : fullWebinar.offerExternalUrl,
          deadline: fullWebinar.offerDeadline,
          countdownEnabled: fullWebinar.offerCountdownEnabled,
        };
      }

      return new Response(
        JSON.stringify({
          status,
          waitingMessage,
          countdown: scheduledAt ? {
            startsAt: new Date(scheduledAt).toISOString(),
            secondsRemaining,
          } : null,
          playback,
          registrant: {
            id: registrant.id,
            firstName: registrant.firstName,
            joinedBefore: registrant.attended,
            watchTimeSeconds: registrant.watchTimeSeconds,
          },
          offer,
          muxDataEnvKey: process.env.NEXT_PUBLIC_MUX_DATA_ENV_KEY,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Route: /api/v1/webinars/{id}/registrants (authenticated)
    if (pathname.endsWith("/registrants")) {
      const authResult = await authenticateRequest(ctx, request);
      if (!authResult.success) {
        return new Response(
          JSON.stringify({ error: authResult.error }),
          { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const scopeCheck = requireScopes(authResult.context, ["webinars:registrants"]);
      if (!scopeCheck.success) {
        return new Response(
          JSON.stringify({ error: scopeCheck.error }),
          { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const organizationId = getEffectiveOrganizationId(authResult.context);
      const pathParts = pathname.split("/");
      const webinarId = pathParts[pathParts.length - 2];
      const status = url.searchParams.get("status") || undefined;
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");

      const result = await ctx.runQuery(api.webinarRegistrants.getRegistrants, {
        webinarId: webinarId as any,
        organizationId: organizationId as any,
        status,
        limit,
        offset,
      });

      return new Response(
        JSON.stringify({ success: true, ...result }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId, ...corsHeaders },
        }
      );
    }

    // Route: /api/v1/webinars (list - authenticated)
    if (pathname === "/api/v1/webinars" || pathname === "/api/v1/webinars/") {
      const authResult = await authenticateRequest(ctx, request);
      if (!authResult.success) {
        return new Response(
          JSON.stringify({ error: authResult.error }),
          { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const scopeCheck = requireScopes(authResult.context, ["webinars:read"]);
      if (!scopeCheck.success) {
        return new Response(
          JSON.stringify({ error: scopeCheck.error }),
          { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const organizationId = getEffectiveOrganizationId(authResult.context);
      const status = url.searchParams.get("status") || undefined;
      const subtype = url.searchParams.get("subtype") || undefined;
      const limit = parseInt(url.searchParams.get("limit") || "50");

      const result = await ctx.runQuery(api.webinarOntology.getWebinars, {
        organizationId: organizationId as any,
        status,
        subtype,
        limit,
      });

      return new Response(
        JSON.stringify({ success: true, ...result }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId, ...corsHeaders },
        }
      );
    }

    // Route: /api/v1/webinars/{id} (get single - authenticated)
    const pathParts = pathname.split("/").filter(p => p);
    if (pathParts.length === 4 && pathParts[0] === "api" && pathParts[1] === "v1" && pathParts[2] === "webinars") {
      const authResult = await authenticateRequest(ctx, request);
      if (!authResult.success) {
        return new Response(
          JSON.stringify({ error: authResult.error }),
          { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const scopeCheck = requireScopes(authResult.context, ["webinars:read"]);
      if (!scopeCheck.success) {
        return new Response(
          JSON.stringify({ error: scopeCheck.error }),
          { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const organizationId = getEffectiveOrganizationId(authResult.context);
      const webinarId = pathParts[3];

      const webinar = await ctx.runQuery(api.webinarOntology.getWebinar, {
        webinarId: webinarId as any,
        organizationId: organizationId as any,
      });

      if (!webinar) {
        return new Response(
          JSON.stringify({ error: "Webinar not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, webinar }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId, ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("API /webinars GET error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * MASTER POST ROUTER
 *
 * Routes all POST requests to the appropriate handler based on URL path.
 */
export const webinarPostRouter = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Route: /api/v1/webinars/{id}/register (public)
    if (pathname.endsWith("/register")) {
      const pathParts = pathname.split("/");
      const webinarId = pathParts[pathParts.length - 2];

      const body = await request.json();
      const { firstName, lastName, email, phone, company, jobTitle, selectedSession, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, customFields } = body;

      if (!firstName || !email) {
        return new Response(
          JSON.stringify({ error: "firstName and email are required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const result = await ctx.runMutation(api.webinarRegistrants.registerForWebinar, {
        webinarId: webinarId as any,
        firstName,
        lastName,
        email,
        phone,
        company,
        jobTitle,
        selectedSession,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        referrer: request.headers.get("referer") || undefined,
        customFields,
      });

      const webinar = await ctx.runQuery(api.webinarOntology.getWebinarPublic, {
        webinarId: webinarId as any,
      });

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://l4yercak3.com";
      const watchUrl = `${baseUrl}/webinar/${webinar?.slug}/watch?code=${result.registrationCode}`;

      return new Response(
        JSON.stringify({
          success: true,
          registrantId: result.registrantId,
          registrationCode: result.registrationCode,
          contactId: result.contactId,
          isNewContact: result.isNewRegistration,
          webinar: webinar ? {
            name: webinar.name,
            scheduledAt: webinar.scheduling.nextSession,
            timezone: webinar.scheduling.timezone,
          } : null,
          watchUrl,
          calendarLinks: {
            ics: `${baseUrl}/api/v1/webinars/${webinarId}/calendar.ics?code=${result.registrationCode}`,
          },
        }),
        { status: result.isNewRegistration ? 201 : 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Route: /api/v1/webinars/{id}/track/join
    if (pathname.endsWith("/track/join")) {
      const body = await request.json();
      const { registrationCode, timestamp } = body;

      if (!registrationCode) {
        return new Response(
          JSON.stringify({ error: "Registration code required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const pathParts = pathname.split("/");
      const webinarId = pathParts[pathParts.length - 3];

      const registrant = await ctx.runQuery(api.webinarRegistrants.getRegistrantByCode, {
        registrationCode,
        webinarId: webinarId as any,
      });

      if (!registrant) {
        return new Response(
          JSON.stringify({ error: "Invalid registration code" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      await ctx.runMutation(api.webinarRegistrants.trackJoin, {
        registrantId: registrant.id,
        timestamp: timestamp || Date.now(),
      });

      return new Response(
        JSON.stringify({ success: true, registrantId: registrant.id }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Route: /api/v1/webinars/{id}/track/progress
    if (pathname.endsWith("/track/progress")) {
      const body = await request.json();
      const { registrationCode, currentTimeSeconds, totalWatchTimeSeconds } = body;

      if (!registrationCode) {
        return new Response(
          JSON.stringify({ error: "Registration code required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const pathParts = pathname.split("/");
      const webinarId = pathParts[pathParts.length - 3];

      const registrant = await ctx.runQuery(api.webinarRegistrants.getRegistrantByCode, {
        registrationCode,
        webinarId: webinarId as any,
      });

      if (!registrant) {
        return new Response(
          JSON.stringify({ error: "Invalid registration code" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      await ctx.runMutation(api.webinarRegistrants.trackProgress, {
        registrantId: registrant.id,
        currentTimeSeconds: currentTimeSeconds || 0,
        totalWatchTimeSeconds: totalWatchTimeSeconds || 0,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Route: /api/v1/webinars/{id}/track/leave
    if (pathname.endsWith("/track/leave")) {
      const body = await request.json();
      const { registrationCode, totalWatchTimeSeconds, maxPositionSeconds, timestamp } = body;

      if (!registrationCode) {
        return new Response(
          JSON.stringify({ error: "Registration code required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const pathParts = pathname.split("/");
      const webinarId = pathParts[pathParts.length - 3];

      const registrant = await ctx.runQuery(api.webinarRegistrants.getRegistrantByCode, {
        registrationCode,
        webinarId: webinarId as any,
      });

      if (!registrant) {
        return new Response(
          JSON.stringify({ error: "Invalid registration code" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      await ctx.runMutation(api.webinarRegistrants.trackLeave, {
        registrantId: registrant.id,
        totalWatchTimeSeconds: totalWatchTimeSeconds || 0,
        maxPositionSeconds: maxPositionSeconds || 0,
        timestamp: timestamp || Date.now(),
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Route: /api/v1/webinars/{id}/track/offer-viewed
    if (pathname.endsWith("/track/offer-viewed")) {
      const body = await request.json();
      const { registrationCode, viewedAtSeconds, timestamp } = body;

      if (!registrationCode) {
        return new Response(
          JSON.stringify({ error: "Registration code required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const pathParts = pathname.split("/");
      const webinarId = pathParts[pathParts.length - 3];

      const registrant = await ctx.runQuery(api.webinarRegistrants.getRegistrantByCode, {
        registrationCode,
        webinarId: webinarId as any,
      });

      if (!registrant) {
        return new Response(
          JSON.stringify({ error: "Invalid registration code" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      await ctx.runMutation(api.webinarRegistrants.trackOfferViewed, {
        registrantId: registrant.id,
        viewedAtSeconds: viewedAtSeconds || 0,
        timestamp: timestamp || Date.now(),
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Route: /api/v1/webinars/{id}/track/offer-clicked
    if (pathname.endsWith("/track/offer-clicked")) {
      const body = await request.json();
      const { registrationCode, clickedAtSeconds, timestamp } = body;

      if (!registrationCode) {
        return new Response(
          JSON.stringify({ error: "Registration code required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const pathParts = pathname.split("/");
      const webinarId = pathParts[pathParts.length - 3];

      const registrant = await ctx.runQuery(api.webinarRegistrants.getRegistrantByCode, {
        registrationCode,
        webinarId: webinarId as any,
      });

      if (!registrant) {
        return new Response(
          JSON.stringify({ error: "Invalid registration code" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      await ctx.runMutation(api.webinarRegistrants.trackOfferClicked, {
        registrantId: registrant.id,
        clickedAtSeconds: clickedAtSeconds || 0,
        timestamp: timestamp || Date.now(),
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Route: /api/v1/webinars/{id}/publish (authenticated)
    if (pathname.endsWith("/publish")) {
      const authResult = await authenticateRequest(ctx, request);
      if (!authResult.success) {
        return new Response(
          JSON.stringify({ error: authResult.error }),
          { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const scopeCheck = requireScopes(authResult.context, ["webinars:write"]);
      if (!scopeCheck.success) {
        return new Response(
          JSON.stringify({ error: scopeCheck.error }),
          { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const organizationId = getEffectiveOrganizationId(authResult.context);
      const pathParts = pathname.split("/");
      const webinarId = pathParts[pathParts.length - 2];

      await ctx.runMutation(api.webinarOntology.publishWebinar, {
        webinarId: webinarId as any,
        organizationId: organizationId as any,
        performedBy: authResult.context.userId as any,
      });

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId, ...corsHeaders },
        }
      );
    }

    // Route: /api/v1/webinars/upload/direct-url (authenticated)
    if (pathname.endsWith("/upload/direct-url")) {
      const authResult = await authenticateRequest(ctx, request);
      if (!authResult.success) {
        return new Response(
          JSON.stringify({ error: authResult.error }),
          { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const scopeCheck = requireScopes(authResult.context, ["webinars:upload"]);
      if (!scopeCheck.success) {
        return new Response(
          JSON.stringify({ error: scopeCheck.error }),
          { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const organizationId = getEffectiveOrganizationId(authResult.context);
      const body = await request.json();
      const { webinarId, corsOrigin } = body;

      if (!webinarId) {
        return new Response(
          JSON.stringify({ error: "webinarId is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const webinar = await ctx.runQuery(api.webinarOntology.getWebinar, {
        webinarId: webinarId as any,
        organizationId: organizationId as any,
      });

      if (!webinar) {
        return new Response(
          JSON.stringify({ error: "Webinar not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const result = await ctx.runAction(api.actions.mux.getDirectUploadUrl, {
        webinarId: webinarId as any,
        corsOrigin,
      });

      return new Response(
        JSON.stringify({
          success: true,
          uploadUrl: result.uploadUrl,
          uploadId: result.uploadId,
          expiresAt: new Date(result.expiresAt).toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId, ...corsHeaders },
        }
      );
    }

    // Route: /api/v1/webinars (create - authenticated)
    if (pathname === "/api/v1/webinars" || pathname === "/api/v1/webinars/") {
      const authResult = await authenticateRequest(ctx, request);
      if (!authResult.success) {
        return new Response(
          JSON.stringify({ error: authResult.error }),
          { status: authResult.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const scopeCheck = requireScopes(authResult.context, ["webinars:write"]);
      if (!scopeCheck.success) {
        return new Response(
          JSON.stringify({ error: scopeCheck.error }),
          { status: scopeCheck.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const organizationId = getEffectiveOrganizationId(authResult.context);
      const body = await request.json();
      const {
        name,
        description,
        subtype = "automated",
        scheduledAt,
        durationMinutes = 60,
        timezone = "Europe/Berlin",
        maxRegistrants,
        evergreenEnabled,
        evergreenSchedule,
        offerEnabled,
        offerTimestamp,
        offerCheckoutId,
        offerCtaText,
      } = body;

      if (!name) {
        return new Response(
          JSON.stringify({ error: "name is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const result = await ctx.runMutation(api.webinarOntology.createWebinar, {
        organizationId: organizationId as any,
        name,
        description,
        subtype,
        scheduledAt,
        durationMinutes,
        timezone,
        maxRegistrants,
        evergreenEnabled,
        evergreenSchedule,
        offerEnabled,
        offerTimestamp,
        offerCheckoutId,
        offerCtaText,
        performedBy: authResult.context.userId as any,
      });

      return new Response(
        JSON.stringify({
          success: true,
          id: result.webinarId,
          slug: result.slug,
          status: "draft",
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json", "X-Organization-Id": organizationId, ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("API /webinars POST error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage === "Webinar not found") {
      return new Response(
        JSON.stringify({ error: "Webinar not found", code: "WEBINAR_NOT_FOUND" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (errorMessage === "Registration is closed") {
      return new Response(
        JSON.stringify({ error: "Registration is closed", code: "REGISTRATION_CLOSED" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (errorMessage === "Webinar is full") {
      return new Response(
        JSON.stringify({ error: "Webinar is full", code: "WEBINAR_FULL" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (errorMessage === "Only draft webinars can be published") {
      return new Response(
        JSON.stringify({ error: "Only draft webinars can be published" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
