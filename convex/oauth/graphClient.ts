/**
 * Microsoft Graph API Client
 *
 * Provides helper functions for interacting with Microsoft Graph API
 * Used for syncing emails, calendar, OneDrive, SharePoint, etc.
 */

import { action, internalAction, ActionCtx } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

const generatedApi: any = require("../_generated/api");

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

// Type for OAuth connection
interface OAuthConnection {
  _id: Id<"oauthConnections">;
  status: string;
  tokenExpiresAt: number;
  accessToken: string;
  organizationId: Id<"organizations">;
}

// Type for Graph API response (generic JSON object)
type GraphApiResponse = Record<string, unknown> | null;

// Type for request body
type GraphApiRequestBody = Record<string, unknown>;

/**
 * Make an authenticated request to Microsoft Graph API
 * Automatically handles token refresh if expired
 */
export const graphRequest = internalAction({
  args: {
    connectionId: v.id("oauthConnections"),
    endpoint: v.string(),
    method: v.optional(v.string()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<GraphApiResponse> => {
    // Get connection
    const connection = await (ctx as any).runQuery(generatedApi.internal.oauth.microsoft.getConnection, {
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
      const freshCheck = await (ctx as any).runQuery(generatedApi.internal.oauth.microsoft.getConnection, {
        connectionId: args.connectionId,
      }) as OAuthConnection | null;

      if (freshCheck && freshCheck.tokenExpiresAt < Date.now() + 60000) {
        // Token is still expired, refresh it
        await (ctx as any).runAction(generatedApi.internal.oauth.microsoft.refreshMicrosoftToken, {
          connectionId: args.connectionId,
        });

        // Re-fetch connection with fresh token
        const refreshedConnection = await (ctx as any).runQuery(generatedApi.internal.oauth.microsoft.getConnection, {
          connectionId: args.connectionId,
        }) as OAuthConnection | null;

        if (!refreshedConnection) {
          throw new Error("Failed to refresh connection");
        }

        return await makeRequest(ctx, refreshedConnection, args.endpoint, args.method, args.body as GraphApiRequestBody | undefined);
      }

      // Token was already refreshed by another action
      if (freshCheck) {
        return await makeRequest(ctx, freshCheck, args.endpoint, args.method, args.body as GraphApiRequestBody | undefined);
      }

      throw new Error("Connection lost during refresh");
    }

    return await makeRequest(ctx, connection as OAuthConnection, args.endpoint, args.method, args.body as GraphApiRequestBody | undefined);
  },
});

/**
 * Helper function to make the actual Graph API request
 */
async function makeRequest(
  ctx: ActionCtx,
  connection: OAuthConnection,
  endpoint: string,
  method: string = "GET",
  body?: GraphApiRequestBody
): Promise<GraphApiResponse> {
  // Decrypt access token
  const accessToken = await (ctx as any).runAction(generatedApi.internal.oauth.encryption.decryptToken, {
    encrypted: connection.accessToken,
  });

  // Make request to Graph API
  const url = endpoint.startsWith("http") ? endpoint : `${GRAPH_API_BASE}${endpoint}`;

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

    // Handle 403 Access Denied - likely revoked consent or expired refresh token
    if (response.status === 403) {
      // Mark connection as requiring re-authorization
      await (ctx as any).runMutation(generatedApi.internal.oauth.microsoft.updateConnectionStatus, {
        connectionId: connection._id,
        status: "error",
        error: "Access denied. Please reconnect your Microsoft account to restore access.",
      });

      throw new Error(
        "Microsoft access denied. Your account permissions may have been revoked or expired. " +
        "Please disconnect and reconnect your Microsoft account in Settings > Integrations."
      );
    }

    // Handle 401 Unauthorized - token issue
    if (response.status === 401) {
      await (ctx as any).runMutation(generatedApi.internal.oauth.microsoft.updateConnectionStatus, {
        connectionId: connection._id,
        status: "expired",
        error: "Authentication expired. Please reconnect your account.",
      });

      throw new Error(
        "Microsoft authentication expired. Please reconnect your Microsoft account in Settings > Integrations."
      );
    }

    throw new Error(`Graph API request failed: ${response.status} ${errorText}`);
  }

  // Handle empty responses (like 204 No Content)
  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

/**
 * Get user profile from Microsoft Graph
 */
export const getUserProfile = action({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args): Promise<GraphApiResponse> => {

    return await (ctx as any).runAction(generatedApi.internal.oauth.graphClient.graphRequest, {
      connectionId: args.connectionId,
      endpoint: "/me",
    }) as GraphApiResponse;
  },
});

/**
 * Get user's emails (Phase 3 - future implementation)
 */
export const getEmails = action({
  args: {
    connectionId: v.id("oauthConnections"),
    top: v.optional(v.number()), // Number of emails to fetch
  },
  handler: async (ctx, args): Promise<GraphApiResponse> => {
    const endpoint = args.top
      ? `/me/messages?$top=${args.top}&$orderby=receivedDateTime desc`
      : `/me/messages?$orderby=receivedDateTime desc`;

    return await (ctx as any).runAction(generatedApi.internal.oauth.graphClient.graphRequest, {
      connectionId: args.connectionId,
      endpoint,
    }) as GraphApiResponse;
  },
});

/**
 * Get user's calendar events
 * Uses /me/calendarView for expanded recurring events within a date range
 */
export const getCalendarEvents = action({
  args: {
    connectionId: v.id("oauthConnections"),
    startDateTime: v.optional(v.string()),
    endDateTime: v.optional(v.string()),
    top: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<GraphApiResponse> => {
    let endpoint = "/me/calendarView";

    const params: string[] = [];
    if (args.startDateTime && args.endDateTime) {
      params.push(`startDateTime=${args.startDateTime}`);
      params.push(`endDateTime=${args.endDateTime}`);
    }
    if (args.top) {
      params.push(`$top=${args.top}`);
    }
    params.push("$orderby=start/dateTime");

    if (params.length > 0) {
      endpoint += `?${params.join("&")}`;
    }

    return await (ctx as any).runAction(generatedApi.internal.oauth.graphClient.graphRequest, {
      connectionId: args.connectionId,
      endpoint,
    }) as GraphApiResponse;
  },
});

/**
 * Create a calendar event in user's calendar
 */
export const createCalendarEvent = action({
  args: {
    connectionId: v.id("oauthConnections"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventData: v.any(),
  },
  handler: async (ctx, args): Promise<GraphApiResponse> => {

    return await (ctx as any).runAction(generatedApi.internal.oauth.graphClient.graphRequest, {
      connectionId: args.connectionId,
      endpoint: "/me/events",
      method: "POST",
      body: args.eventData,
    }) as GraphApiResponse;
  },
});

/**
 * Update an existing calendar event
 */
export const updateCalendarEvent = action({
  args: {
    connectionId: v.id("oauthConnections"),
    eventId: v.string(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventData: v.any(),
  },
  handler: async (ctx, args): Promise<GraphApiResponse> => {

    return await (ctx as any).runAction(generatedApi.internal.oauth.graphClient.graphRequest, {
      connectionId: args.connectionId,
      endpoint: `/me/events/${args.eventId}`,
      method: "PATCH",
      body: args.eventData,
    }) as GraphApiResponse;
  },
});

/**
 * Delete a calendar event
 */
export const deleteCalendarEvent = action({
  args: {
    connectionId: v.id("oauthConnections"),
    eventId: v.string(),
  },
  handler: async (ctx, args): Promise<GraphApiResponse> => {

    return await (ctx as any).runAction(generatedApi.internal.oauth.graphClient.graphRequest, {
      connectionId: args.connectionId,
      endpoint: `/me/events/${args.eventId}`,
      method: "DELETE",
    }) as GraphApiResponse;
  },
});

/**
 * Get list of user's calendars
 */
export const getCalendarList = action({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args): Promise<GraphApiResponse> => {

    return await (ctx as any).runAction(generatedApi.internal.oauth.graphClient.graphRequest, {
      connectionId: args.connectionId,
      endpoint: "/me/calendars",
    }) as GraphApiResponse;
  },
});

/**
 * Get OneDrive files (Phase 3 - future implementation)
 */
export const getOneDriveFiles = action({
  args: {
    connectionId: v.id("oauthConnections"),
    folderId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<GraphApiResponse> => {
    const endpoint = args.folderId
      ? `/me/drive/items/${args.folderId}/children`
      : "/me/drive/root/children";

    return await (ctx as any).runAction(generatedApi.internal.oauth.graphClient.graphRequest, {
      connectionId: args.connectionId,
      endpoint,
    }) as GraphApiResponse;
  },
});

/**
 * Get SharePoint sites (Phase 3 - future implementation)
 */
export const getSharePointSites = action({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args): Promise<GraphApiResponse> => {

    return await (ctx as any).runAction(generatedApi.internal.oauth.graphClient.graphRequest, {
      connectionId: args.connectionId,
      endpoint: "/sites?search=*",
    }) as GraphApiResponse;
  },
});

/**
 * Test Graph API connection
 * Useful for debugging and verifying permissions
 */
export const testConnection = action({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message: string;
    user?: {
      id: string;
      displayName: string;
      email: string;
    };
  }> => {
    try {
      const profile = await (ctx as any).runAction(generatedApi.api.oauth.graphClient.getUserProfile, {
        connectionId: args.connectionId,
      }) as Record<string, unknown> | null;

      if (!profile) {
        return {
          success: false,
          message: "Failed to retrieve profile",
        };
      }

      return {
        success: true,
        message: "Connection successful",
        user: {
          id: profile.id as string,
          displayName: profile.displayName as string,
          email: (profile.userPrincipalName || profile.mail) as string,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
