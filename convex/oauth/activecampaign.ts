/**
 * ActiveCampaign Integration
 *
 * Handles connection and API operations for ActiveCampaign accounts.
 * Uses API Key + Account URL authentication (not OAuth 2.0).
 *
 * Authentication:
 * - API Key: Found in Settings > Developer in ActiveCampaign
 * - Account URL: https://[account].api-us1.com
 *
 * API Documentation: https://developers.activecampaign.com/
 */

import { action, mutation, query, internalMutation, internalQuery, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

const generatedApi: any = require("../_generated/api");

// ActiveCampaign API base path
const AC_API_VERSION = "/api/3";

// Type definitions
interface ActiveCampaignContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface ActiveCampaignList {
  id: string;
  name: string;
}

interface ActiveCampaignTag {
  id: string;
  tag: string;
}

interface ActiveCampaignWebhook {
  id: string;
  name: string;
  url: string;
  events: string[];
}

/**
 * Validate ActiveCampaign credentials by making a test API call
 */
export const validateCredentials = action({
  args: {
    apiUrl: v.string(),
    apiKey: v.string(),
  },
  handler: async (_ctx, args): Promise<{
    valid: boolean;
    accountName?: string;
    email?: string;
    error?: string;
  }> => {
    let apiUrl = args.apiUrl.trim();
    if (!apiUrl.startsWith("https://")) {
      apiUrl = `https://${apiUrl}`;
    }
    if (apiUrl.endsWith("/")) {
      apiUrl = apiUrl.slice(0, -1);
    }

    try {
      const response = await fetch(`${apiUrl}${AC_API_VERSION}/users/me`, {
        method: "GET",
        headers: {
          "Api-Token": args.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("ActiveCampaign validation failed:", errorText);

        if (response.status === 401 || response.status === 403) {
          return {
            valid: false,
            error: "Invalid API key. Please check your credentials.",
          };
        }

        return {
          valid: false,
          error: `API error: ${response.status} - ${response.statusText}`,
        };
      }

      const data = await response.json();
      const user = data.user;

      return {
        valid: true,
        accountName: user?.username || "Unknown",
        email: user?.email || "Unknown",
      };
    } catch (error) {
      console.error("ActiveCampaign validation error:", error);
      return {
        valid: false,
        error: `Connection failed. Please check the API URL: ${apiUrl}`,
      };
    }
  },
});

/**
 * Store validated ActiveCampaign connection (action to support encryption)
 */
export const storeActiveCampaignConnection = action({
  args: {
    sessionId: v.string(),
    apiUrl: v.string(),
    apiKey: v.string(),
    connectionType: v.union(v.literal("personal"), v.literal("organizational")),
    accountName: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    connectionId?: Id<"oauthConnections">;
    message: string;
  }> => {
    // Encrypt the API key before storage
    const encryptedApiKey: string = await (ctx as any).runAction(generatedApi.internal.oauth.encryption.encryptToken, {
      plaintext: args.apiKey,
    });

    // Store via internal mutation
    const result = await (ctx as any).runMutation(generatedApi.internal.oauth.activecampaign.storeConnectionInternal, {
      sessionId: args.sessionId,
      apiUrl: args.apiUrl,
      encryptedApiKey,
      connectionType: args.connectionType,
      accountName: args.accountName,
      email: args.email,
    });

    return result;
  },
});

/**
 * Internal mutation to store connection (called from action)
 */
export const storeConnectionInternal = internalMutation({
  args: {
    sessionId: v.string(),
    apiUrl: v.string(),
    encryptedApiKey: v.string(),
    connectionType: v.union(v.literal("personal"), v.literal("organizational")),
    accountName: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    connectionId?: Id<"oauthConnections">;
    message: string;
  }> => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) {
      throw new Error("User not found or no organization");
    }

    const existingConnection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", user.defaultOrgId as Id<"organizations">).eq("provider", "activecampaign")
      )
      .filter((q) => q.neq(q.field("status"), "revoked"))
      .first();

    if (existingConnection) {
      await ctx.db.patch(existingConnection._id, {
        providerAccountId: args.accountName,
        providerEmail: args.email,
        accessToken: args.encryptedApiKey,
        refreshToken: args.encryptedApiKey,
        tokenExpiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000),
        status: "active",
        lastSyncError: undefined,
        customProperties: { apiUrl: args.apiUrl },
        updatedAt: Date.now(),
      });

      await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
        userId: user._id,
        organizationId: user.defaultOrgId,
        action: "update_oauth",
        resource: "oauth_connections",
        success: true,
        metadata: {
          provider: "activecampaign",
          connectionType: args.connectionType,
          providerEmail: args.email,
        },
      });

      return {
        success: true,
        connectionId: existingConnection._id,
        message: "ActiveCampaign connection updated",
      };
    }

    const connectionId = await ctx.db.insert("oauthConnections", {
      userId: args.connectionType === "personal" ? user._id : undefined,
      organizationId: user.defaultOrgId,
      provider: "activecampaign",
      providerAccountId: args.accountName,
      providerEmail: args.email,
      connectionType: args.connectionType,
      accessToken: args.encryptedApiKey,
      refreshToken: args.encryptedApiKey,
      tokenExpiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000),
      scopes: ["contacts", "lists", "tags", "automations", "campaigns", "deals", "webhooks"],
      syncSettings: {
        email: false,
        calendar: false,
        oneDrive: false,
        sharePoint: false,
      },
      status: "active",
      customProperties: { apiUrl: args.apiUrl },
      connectedAt: Date.now(),
      updatedAt: Date.now(),
    });

    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: user._id,
      organizationId: user.defaultOrgId,
      action: "connect_oauth",
      resource: "oauth_connections",
      success: true,
      metadata: {
        provider: "activecampaign",
        connectionType: args.connectionType,
        providerEmail: args.email,
      },
    });

    return {
      success: true,
      connectionId,
      message: "ActiveCampaign connected successfully",
    };
  },
});

/**
 * Disconnect ActiveCampaign connection
 */
export const disconnectActiveCampaign = mutation({
  args: {
    sessionId: v.string(),
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error("Connection not found");
    }

    if (connection.provider !== "activecampaign") {
      throw new Error("Not an ActiveCampaign connection");
    }

    if (connection.connectionType === "personal") {
      if (connection.userId !== user._id) {
        throw new Error("Permission denied: not your connection");
      }
    } else {
      const canManage = await (ctx as any).runQuery(generatedApi.api.auth.canUserPerform, {
        sessionId: args.sessionId,
        permission: "manage_integrations",
        resource: "oauth",
        organizationId: connection.organizationId,
      });

      if (!canManage) {
        throw new Error("Permission denied: manage_integrations required");
      }
    }

    await ctx.db.patch(args.connectionId, {
      status: "revoked",
      updatedAt: Date.now(),
    });

    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: user._id,
      organizationId: connection.organizationId,
      action: "disconnect_oauth",
      resource: "oauth_connections",
      success: true,
      metadata: {
        provider: "activecampaign",
        connectionType: connection.connectionType,
      },
    });

    return {
      success: true,
      message: "ActiveCampaign disconnected",
    };
  },
});

/**
 * Get ActiveCampaign connection status for current user/org
 */
export const getActiveCampaignConnection = query({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.sessionId) {
      return null;
    }

    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) {
      return null;
    }

    const connection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", user.defaultOrgId as Id<"organizations">).eq("provider", "activecampaign")
      )
      .filter((q) => q.neq(q.field("status"), "revoked"))
      .first();

    if (!connection) {
      return null;
    }

    return {
      id: connection._id,
      provider: connection.provider,
      providerEmail: connection.providerEmail,
      providerAccountId: connection.providerAccountId,
      connectionType: connection.connectionType,
      status: connection.status,
      scopes: connection.scopes,
      apiUrl: (connection.customProperties as { apiUrl?: string })?.apiUrl || "",
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
      lastSyncError: connection.lastSyncError,
    };
  },
});

// ==================== API OPERATIONS ====================

/**
 * Get decrypted API credentials for making API calls (internal only)
 */
export const getDecryptedCredentials = internalAction({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args): Promise<{
    apiUrl: string;
    apiKey: string;
  }> => {
    const connection = await (ctx as any).runQuery(generatedApi.internal.oauth.activecampaign.getConnectionInternal, {
      connectionId: args.connectionId,
    });

    if (!connection) {
      throw new Error("Connection not found");
    }

    const apiKey: string = await (ctx as any).runAction(generatedApi.internal.oauth.encryption.decryptToken, {
      encrypted: connection.accessToken,
    });

    const apiUrl = (connection.customProperties as { apiUrl?: string })?.apiUrl || "";

    return { apiUrl, apiKey };
  },
});

/**
 * Get connection by ID (internal query)
 */
export const getConnectionInternal = internalQuery({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.connectionId);
  },
});

/**
 * Get ActiveCampaign connection by organization (internal query)
 */
export const getConnectionByOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", args.organizationId).eq("provider", "activecampaign")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    return connection;
  },
});

/**
 * Fetch contacts from ActiveCampaign
 */
export const fetchContacts = internalAction({
  args: {
    connectionId: v.id("oauthConnections"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ActiveCampaignContact[]> => {
    const { apiUrl, apiKey } = await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.getDecryptedCredentials, {
      connectionId: args.connectionId,
    });

    const params = new URLSearchParams();
    if (args.limit) params.append("limit", args.limit.toString());
    if (args.offset) params.append("offset", args.offset.toString());

    const response = await fetch(`${apiUrl}${AC_API_VERSION}/contacts?${params.toString()}`, {
      headers: {
        "Api-Token": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch contacts: ${response.statusText}`);
    }

    const data = await response.json();
    return data.contacts || [];
  },
});

/**
 * Fetch lists from ActiveCampaign
 */
export const fetchLists = internalAction({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args): Promise<ActiveCampaignList[]> => {
    const { apiUrl, apiKey } = await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.getDecryptedCredentials, {
      connectionId: args.connectionId,
    });

    const response = await fetch(`${apiUrl}${AC_API_VERSION}/lists`, {
      headers: {
        "Api-Token": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch lists: ${response.statusText}`);
    }

    const data = await response.json();
    return data.lists || [];
  },
});

/**
 * Fetch tags from ActiveCampaign
 */
export const fetchTags = internalAction({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args): Promise<ActiveCampaignTag[]> => {
    const { apiUrl, apiKey } = await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.getDecryptedCredentials, {
      connectionId: args.connectionId,
    });

    const response = await fetch(`${apiUrl}${AC_API_VERSION}/tags`, {
      headers: {
        "Api-Token": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tags: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tags || [];
  },
});

/**
 * Create or update a contact in ActiveCampaign
 */
export const upsertContact = internalAction({
  args: {
    connectionId: v.id("oauthConnections"),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    fieldValues: v.optional(v.array(v.object({
      field: v.string(),
      value: v.string(),
    }))),
  },
  handler: async (ctx, args): Promise<ActiveCampaignContact> => {
    const { apiUrl, apiKey } = await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.getDecryptedCredentials, {
      connectionId: args.connectionId,
    });

    const contactData: Record<string, unknown> = {
      email: args.email,
    };

    if (args.firstName) contactData.firstName = args.firstName;
    if (args.lastName) contactData.lastName = args.lastName;
    if (args.phone) contactData.phone = args.phone;
    if (args.fieldValues) contactData.fieldValues = args.fieldValues;

    const response = await fetch(`${apiUrl}${AC_API_VERSION}/contact/sync`, {
      method: "POST",
      headers: {
        "Api-Token": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contact: contactData }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upsert contact: ${errorText}`);
    }

    const data = await response.json();
    return data.contact;
  },
});

/**
 * Add a tag to a contact
 */
export const addTagToContact = internalAction({
  args: {
    connectionId: v.id("oauthConnections"),
    contactId: v.string(),
    tagId: v.string(),
  },
  handler: async (ctx, args): Promise<{ contact: string; tag: string }> => {
    const { apiUrl, apiKey } = await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.getDecryptedCredentials, {
      connectionId: args.connectionId,
    });

    const response = await fetch(`${apiUrl}${AC_API_VERSION}/contactTags`, {
      method: "POST",
      headers: {
        "Api-Token": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contactTag: {
          contact: args.contactId,
          tag: args.tagId,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to add tag to contact: ${errorText}`);
    }

    const data = await response.json();
    return data.contactTag;
  },
});

/**
 * Subscribe a contact to a list
 */
export const subscribeToList = internalAction({
  args: {
    connectionId: v.id("oauthConnections"),
    contactId: v.string(),
    listId: v.string(),
    status: v.optional(v.union(v.literal(1), v.literal(2))),
  },
  handler: async (ctx, args): Promise<{ list: string; contact: string; status: number }> => {
    const { apiUrl, apiKey } = await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.getDecryptedCredentials, {
      connectionId: args.connectionId,
    });

    const response = await fetch(`${apiUrl}${AC_API_VERSION}/contactLists`, {
      method: "POST",
      headers: {
        "Api-Token": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contactList: {
          list: args.listId,
          contact: args.contactId,
          status: args.status || 1,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to subscribe to list: ${errorText}`);
    }

    const data = await response.json();
    return data.contactList;
  },
});

/**
 * Create a webhook subscription in ActiveCampaign
 */
export const createWebhook = internalAction({
  args: {
    connectionId: v.id("oauthConnections"),
    name: v.string(),
    url: v.string(),
    events: v.array(v.string()),
    sources: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<ActiveCampaignWebhook> => {
    const { apiUrl, apiKey } = await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.getDecryptedCredentials, {
      connectionId: args.connectionId,
    });

    const response = await fetch(`${apiUrl}${AC_API_VERSION}/webhooks`, {
      method: "POST",
      headers: {
        "Api-Token": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        webhook: {
          name: args.name,
          url: args.url,
          events: args.events,
          sources: args.sources || ["public", "admin", "api", "system"],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create webhook: ${errorText}`);
    }

    const data = await response.json();
    return data.webhook;
  },
});

/**
 * List webhooks in ActiveCampaign
 */
export const listWebhooks = internalAction({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args): Promise<ActiveCampaignWebhook[]> => {
    const { apiUrl, apiKey } = await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.getDecryptedCredentials, {
      connectionId: args.connectionId,
    });

    const response = await fetch(`${apiUrl}${AC_API_VERSION}/webhooks`, {
      headers: {
        "Api-Token": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list webhooks: ${response.statusText}`);
    }

    const data = await response.json();
    return data.webhooks || [];
  },
});

/**
 * Delete a webhook
 */
export const deleteWebhook = internalAction({
  args: {
    connectionId: v.id("oauthConnections"),
    webhookId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const { apiUrl, apiKey } = await (ctx as any).runAction(generatedApi.internal.oauth.activecampaign.getDecryptedCredentials, {
      connectionId: args.connectionId,
    });

    const response = await fetch(`${apiUrl}${AC_API_VERSION}/webhooks/${args.webhookId}`, {
      method: "DELETE",
      headers: {
        "Api-Token": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete webhook: ${response.statusText}`);
    }

    return { success: true };
  },
});

// ==================== SYNC OPERATIONS ====================

/**
 * Update connection sync status
 */
export const updateSyncStatus = internalMutation({
  args: {
    connectionId: v.id("oauthConnections"),
    lastSyncAt: v.optional(v.number()),
    lastSyncError: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("error"))),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.lastSyncAt !== undefined) updates.lastSyncAt = args.lastSyncAt;
    if (args.lastSyncError !== undefined) updates.lastSyncError = args.lastSyncError;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.connectionId, updates);
  },
});
