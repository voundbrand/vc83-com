/**
 * Microsoft Graph API Client
 *
 * Provides helper functions for interacting with Microsoft Graph API
 * Used for syncing emails, calendar, OneDrive, SharePoint, etc.
 */

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

/**
 * Make an authenticated request to Microsoft Graph API
 * Automatically handles token refresh if expired
 */
export const graphRequest = internalAction({
  args: {
    connectionId: v.id("oauthConnections"),
    endpoint: v.string(),
    method: v.optional(v.string()),
    body: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<any> => {
    // Get connection
    const connection = await ctx.runQuery(internal.oauth.microsoft.getConnection, {
      connectionId: args.connectionId,
    });

    if (!connection) {
      throw new Error("OAuth connection not found");
    }

    if (connection.status === "revoked") {
      throw new Error("OAuth connection has been revoked");
    }

    // Check if token is expired
    if (connection.tokenExpiresAt < Date.now()) {
      // Refresh token
      await ctx.runAction(internal.oauth.microsoft.refreshMicrosoftToken, {
        connectionId: args.connectionId,
      });

      // Re-fetch connection with fresh token
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const refreshedConnection: any = await ctx.runQuery(internal.oauth.microsoft.getConnection, {
        connectionId: args.connectionId,
      });

      if (!refreshedConnection) {
        throw new Error("Failed to refresh connection");
      }

      return await makeRequest(ctx, refreshedConnection, args.endpoint, args.method, args.body);
    }

    return await makeRequest(ctx, connection, args.endpoint, args.method, args.body);
  },
});

/**
 * Helper function to make the actual Graph API request
 */
async function makeRequest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connection: any,
  endpoint: string,
  method: string = "GET",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any
): Promise<any> {
  // Decrypt access token
  const accessToken = await ctx.runAction(internal.oauth.encryption.decryptToken, {
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
      await ctx.runMutation(internal.oauth.microsoft.updateConnectionStatus, {
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
      await ctx.runMutation(internal.oauth.microsoft.updateConnectionStatus, {
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
  handler: async (ctx, args): Promise<any> => {
    const { internal } = await import("../_generated/api");
     
    return await ctx.runAction(internal.oauth.graphClient.graphRequest, {
      connectionId: args.connectionId,
      endpoint: "/me",
    }) as any;
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
  handler: async (ctx, args): Promise<any> => {
    const { internal } = await import("../_generated/api");
    const endpoint = args.top
      ? `/me/messages?$top=${args.top}&$orderby=receivedDateTime desc`
      : `/me/messages?$orderby=receivedDateTime desc`;

     
    return await ctx.runAction(internal.oauth.graphClient.graphRequest, {
      connectionId: args.connectionId,
      endpoint,
    }) as any;
  },
});

/**
 * Get user's calendar events (Phase 3 - future implementation)
 */
export const getCalendarEvents = action({
  args: {
    connectionId: v.id("oauthConnections"),
    startDateTime: v.optional(v.string()),
    endDateTime: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const { internal } = await import("../_generated/api");
    let endpoint = "/me/calendarView";

    if (args.startDateTime && args.endDateTime) {
      endpoint += `?startDateTime=${args.startDateTime}&endDateTime=${args.endDateTime}`;
    }

     
    return await ctx.runAction(internal.oauth.graphClient.graphRequest, {
      connectionId: args.connectionId,
      endpoint,
    }) as any;
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
  handler: async (ctx, args): Promise<any> => {
    const { internal } = await import("../_generated/api");
    const endpoint = args.folderId
      ? `/me/drive/items/${args.folderId}/children`
      : "/me/drive/root/children";

     
    return await ctx.runAction(internal.oauth.graphClient.graphRequest, {
      connectionId: args.connectionId,
      endpoint,
    }) as any;
  },
});

/**
 * Get SharePoint sites (Phase 3 - future implementation)
 */
export const getSharePointSites = action({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args): Promise<any> => {
    const { internal } = await import("../_generated/api");
     
    return await ctx.runAction(internal.oauth.graphClient.graphRequest, {
      connectionId: args.connectionId,
      endpoint: "/sites?search=*",
    }) as any;
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
      const { api } = await import("../_generated/api");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile: any = await ctx.runAction(api.oauth.graphClient.getUserProfile, {
        connectionId: args.connectionId,
      });

      return {
        success: true,
        message: "Connection successful",
        user: {
          id: profile.id,
          displayName: profile.displayName,
          email: profile.userPrincipalName || profile.mail,
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
