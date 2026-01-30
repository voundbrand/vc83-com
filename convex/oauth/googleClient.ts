/**
 * Google Calendar API Client
 *
 * Provides helper functions for interacting with Google Calendar API
 * Used for syncing calendar events, managing schedules, etc.
 */

import { action, internalAction, ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

// Type for OAuth connection
interface OAuthConnection {
  _id: Id<"oauthConnections">;
  status: string;
  tokenExpiresAt: number;
  accessToken: string;
  organizationId: Id<"organizations">;
}

// Type for Google API response (generic JSON object)
type GoogleApiResponse = Record<string, unknown> | null;

// Type for request body
type GoogleApiRequestBody = Record<string, unknown>;

/**
 * Make an authenticated request to Google Calendar API
 * Automatically handles token refresh if expired
 */
export const googleRequest = internalAction({
  args: {
    connectionId: v.id("oauthConnections"),
    endpoint: v.string(),
    method: v.optional(v.string()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<GoogleApiResponse> => {
    // Get connection
    const connection = await ctx.runQuery(internal.oauth.google.getConnection, {
      connectionId: args.connectionId,
    });

    if (!connection) {
      throw new Error("OAuth connection not found");
    }

    if (connection.status === "revoked") {
      throw new Error("OAuth connection has been revoked");
    }

    // Check if token is expired (with 60s buffer to avoid edge cases)
    if (connection.tokenExpiresAt < Date.now() + 60000) {
      // Re-fetch to check if another action already refreshed the token
      const freshCheck = await ctx.runQuery(internal.oauth.google.getConnection, {
        connectionId: args.connectionId,
      }) as OAuthConnection | null;

      if (freshCheck && freshCheck.tokenExpiresAt < Date.now() + 60000) {
        // Token is still expired, refresh it
        await ctx.runAction(internal.oauth.google.refreshGoogleToken, {
          connectionId: args.connectionId,
        });

        // Re-fetch connection with fresh token
        const refreshedConnection = await ctx.runQuery(internal.oauth.google.getConnection, {
          connectionId: args.connectionId,
        }) as OAuthConnection | null;

        if (!refreshedConnection) {
          throw new Error("Failed to refresh connection");
        }

        return await makeRequest(ctx, refreshedConnection, args.endpoint, args.method, args.body as GoogleApiRequestBody | undefined);
      }

      // Token was already refreshed by another action
      if (freshCheck) {
        return await makeRequest(ctx, freshCheck, args.endpoint, args.method, args.body as GoogleApiRequestBody | undefined);
      }

      throw new Error("Connection lost during refresh");
    }

    return await makeRequest(ctx, connection as OAuthConnection, args.endpoint, args.method, args.body as GoogleApiRequestBody | undefined);
  },
});

/**
 * Helper function to make the actual Google API request
 */
async function makeRequest(
  ctx: ActionCtx,
  connection: OAuthConnection,
  endpoint: string,
  method: string = "GET",
  body?: GoogleApiRequestBody
): Promise<GoogleApiResponse> {
  // Decrypt access token
  const accessToken = await ctx.runAction(internal.oauth.encryption.decryptToken, {
    encrypted: connection.accessToken,
  });

  // Make request to Google Calendar API
  const url = endpoint.startsWith("http") ? endpoint : `${GOOGLE_CALENDAR_API_BASE}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };

  if (body && (method === "POST" || method === "PATCH" || method === "PUT")) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();

    // Handle 403 Access Denied - likely revoked consent or insufficient permissions
    if (response.status === 403) {
      await ctx.runMutation(internal.oauth.google.updateConnectionStatus, {
        connectionId: connection._id,
        status: "error",
        error: "Access denied. Please reconnect your Google account to restore access.",
      });

      throw new Error(
        "Google access denied. Your account permissions may have been revoked or expired. " +
        "Please disconnect and reconnect your Google account in Settings > Integrations."
      );
    }

    // Handle 401 Unauthorized - token issue
    if (response.status === 401) {
      await ctx.runMutation(internal.oauth.google.updateConnectionStatus, {
        connectionId: connection._id,
        status: "expired",
        error: "Authentication expired. Please reconnect your account.",
      });

      throw new Error(
        "Google authentication expired. Please reconnect your Google account in Settings > Integrations."
      );
    }

    throw new Error(`Google API request failed: ${response.status} ${errorText}`);
  }

  // Handle empty responses (like 204 No Content)
  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

/**
 * Get list of user's calendars
 */
export const getCalendarList = action({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args): Promise<GoogleApiResponse> => {
    return await ctx.runAction(internal.oauth.googleClient.googleRequest, {
      connectionId: args.connectionId,
      endpoint: "/users/me/calendarList",
    }) as GoogleApiResponse;
  },
});

/**
 * Get calendar events
 */
export const getCalendarEvents = action({
  args: {
    connectionId: v.id("oauthConnections"),
    calendarId: v.optional(v.string()),
    timeMin: v.optional(v.string()),
    timeMax: v.optional(v.string()),
    maxResults: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<GoogleApiResponse> => {
    const calendarId = encodeURIComponent(args.calendarId || "primary");
    const params = new URLSearchParams();

    if (args.timeMin) params.set("timeMin", args.timeMin);
    if (args.timeMax) params.set("timeMax", args.timeMax);
    if (args.maxResults) params.set("maxResults", String(args.maxResults));
    params.set("singleEvents", "true");
    params.set("orderBy", "startTime");

    const queryString = params.toString();
    const endpoint = `/calendars/${calendarId}/events${queryString ? `?${queryString}` : ""}`;

    return await ctx.runAction(internal.oauth.googleClient.googleRequest, {
      connectionId: args.connectionId,
      endpoint,
    }) as GoogleApiResponse;
  },
});

/**
 * Create a calendar event
 */
export const createCalendarEvent = action({
  args: {
    connectionId: v.id("oauthConnections"),
    calendarId: v.optional(v.string()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventData: v.any(),
  },
  handler: async (ctx, args): Promise<GoogleApiResponse> => {
    const calendarId = encodeURIComponent(args.calendarId || "primary");

    return await ctx.runAction(internal.oauth.googleClient.googleRequest, {
      connectionId: args.connectionId,
      endpoint: `/calendars/${calendarId}/events`,
      method: "POST",
      body: args.eventData,
    }) as GoogleApiResponse;
  },
});

/**
 * Update a calendar event
 */
export const updateCalendarEvent = action({
  args: {
    connectionId: v.id("oauthConnections"),
    calendarId: v.optional(v.string()),
    eventId: v.string(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventData: v.any(),
  },
  handler: async (ctx, args): Promise<GoogleApiResponse> => {
    const calendarId = encodeURIComponent(args.calendarId || "primary");

    return await ctx.runAction(internal.oauth.googleClient.googleRequest, {
      connectionId: args.connectionId,
      endpoint: `/calendars/${calendarId}/events/${args.eventId}`,
      method: "PUT",
      body: args.eventData,
    }) as GoogleApiResponse;
  },
});

/**
 * Delete a calendar event
 */
export const deleteCalendarEvent = action({
  args: {
    connectionId: v.id("oauthConnections"),
    eventId: v.string(),
    calendarId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<GoogleApiResponse> => {
    const calendarId = encodeURIComponent(args.calendarId || "primary");

    return await ctx.runAction(internal.oauth.googleClient.googleRequest, {
      connectionId: args.connectionId,
      endpoint: `/calendars/${calendarId}/events/${args.eventId}`,
      method: "DELETE",
    }) as GoogleApiResponse;
  },
});

/**
 * Test Google Calendar API connection
 * Useful for debugging and verifying permissions
 */
export const testGoogleConnection = action({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message: string;
    calendars?: unknown[];
  }> => {
    try {
      const result = await ctx.runAction(internal.oauth.googleClient.googleRequest, {
        connectionId: args.connectionId,
        endpoint: "/users/me/calendarList",
      }) as Record<string, unknown> | null;

      if (!result) {
        return {
          success: false,
          message: "Failed to retrieve calendar list",
        };
      }

      const items = (result.items || []) as unknown[];

      return {
        success: true,
        message: `Connection successful. Found ${items.length} calendar(s).`,
        calendars: items,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
