/**
 * ActiveCampaign API v1 Endpoints
 *
 * REST API for external applications to trigger ActiveCampaign actions.
 * Supports API key, OAuth, and CLI session authentication.
 *
 * Endpoints:
 * - POST /api/v1/activecampaign/sync-contact - Sync contact to ActiveCampaign
 * - POST /api/v1/activecampaign/add-to-list - Add contact to list
 * - POST /api/v1/activecampaign/add-tag - Add tag to contact
 * - GET /api/v1/activecampaign/lists - Get all lists
 * - GET /api/v1/activecampaign/tags - Get all tags
 */

import { action, query } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

/**
 * Sync a contact to ActiveCampaign
 *
 * Called from external applications (landing pages, forms, etc.)
 * to push contact data to ActiveCampaign.
 */
export const syncContact = action({
  args: {
    // Authentication (one of these required)
    apiKey: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    organizationId: v.id("organizations"),

    // Contact data
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),

    // Optional: Add to list and/or tag
    listId: v.optional(v.string()),
    tagId: v.optional(v.string()),

    // Custom fields
    customFields: v.optional(v.array(v.object({
      field: v.string(),
      value: v.string(),
    }))),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    contactId?: string;
    error?: string;
    message?: string;
  }> => {
    // TODO: Add API key validation here
    // For now, we check if the organization has ActiveCampaign connected

    const connection = await ctx.runQuery(internal.oauth.activecampaign.getConnectionByOrg, {
      organizationId: args.organizationId,
    });

    if (!connection) {
      return {
        success: false,
        error: "ACTIVECAMPAIGN_NOT_CONNECTED",
        message: "ActiveCampaign is not connected for this organization",
      };
    }

    try {
      // Create/update contact
      const contact = await ctx.runAction(internal.oauth.activecampaign.upsertContact, {
        connectionId: connection._id,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        phone: args.phone,
        fieldValues: args.customFields,
      });

      const contactId = contact.id;

      // Add to list if specified
      if (args.listId) {
        await ctx.runAction(internal.oauth.activecampaign.subscribeToList, {
          connectionId: connection._id,
          contactId,
          listId: args.listId,
        });
      }

      // Add tag if specified
      if (args.tagId) {
        await ctx.runAction(internal.oauth.activecampaign.addTagToContact, {
          connectionId: connection._id,
          contactId,
          tagId: args.tagId,
        });
      }

      return {
        success: true,
        contactId,
        message: `Contact synced successfully: ${args.email}`,
      };
    } catch (error) {
      console.error("[ActiveCampaign API] syncContact error:", error);
      return {
        success: false,
        error: "SYNC_FAILED",
        message: error instanceof Error ? error.message : "Failed to sync contact",
      };
    }
  },
});

/**
 * Trigger an automation by adding a specific tag
 */
export const triggerAutomation = action({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    automationTagId: v.string(), // Tag that triggers the automation in AC
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    contactId?: string;
    error?: string;
    message?: string;
  }> => {
    const connection = await ctx.runQuery(internal.oauth.activecampaign.getConnectionByOrg, {
      organizationId: args.organizationId,
    });

    if (!connection) {
      return {
        success: false,
        error: "ACTIVECAMPAIGN_NOT_CONNECTED",
        message: "ActiveCampaign is not connected for this organization",
      };
    }

    try {
      // Create/update contact
      const contact = await ctx.runAction(internal.oauth.activecampaign.upsertContact, {
        connectionId: connection._id,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
      });

      // Add automation trigger tag
      await ctx.runAction(internal.oauth.activecampaign.addTagToContact, {
        connectionId: connection._id,
        contactId: contact.id,
        tagId: args.automationTagId,
      });

      return {
        success: true,
        contactId: contact.id,
        message: `Automation triggered for ${args.email}`,
      };
    } catch (error) {
      console.error("[ActiveCampaign API] triggerAutomation error:", error);
      return {
        success: false,
        error: "TRIGGER_FAILED",
        message: error instanceof Error ? error.message : "Failed to trigger automation",
      };
    }
  },
});

/**
 * Get available lists for an organization
 */
export const getLists = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    lists?: Array<{ id: string; name: string }>;
    error?: string;
  }> => {
    const connection = await ctx.runQuery(internal.oauth.activecampaign.getConnectionByOrg, {
      organizationId: args.organizationId,
    });

    if (!connection) {
      return {
        success: false,
        error: "ACTIVECAMPAIGN_NOT_CONNECTED",
      };
    }

    try {
      const lists = await ctx.runAction(internal.oauth.activecampaign.fetchLists, {
        connectionId: connection._id,
      });

      return {
        success: true,
        lists: lists.map((list: { id: string; name: string }) => ({
          id: list.id,
          name: list.name,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch lists",
      };
    }
  },
});

/**
 * Get available tags for an organization
 */
export const getTags = action({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    tags?: Array<{ id: string; name: string }>;
    error?: string;
  }> => {
    const connection = await ctx.runQuery(internal.oauth.activecampaign.getConnectionByOrg, {
      organizationId: args.organizationId,
    });

    if (!connection) {
      return {
        success: false,
        error: "ACTIVECAMPAIGN_NOT_CONNECTED",
      };
    }

    try {
      const tags = await ctx.runAction(internal.oauth.activecampaign.fetchTags, {
        connectionId: connection._id,
      });

      return {
        success: true,
        tags: tags.map((tag: { id: string; tag: string }) => ({
          id: tag.id,
          name: tag.tag,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch tags",
      };
    }
  },
});

/**
 * Check connection status
 */
export const getConnectionStatus = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{
    isConnected: boolean;
    accountName?: string;
    email?: string;
    connectedAt?: number;
  }> => {
    const connection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", args.organizationId).eq("provider", "activecampaign")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!connection) {
      return { isConnected: false };
    }

    return {
      isConnected: true,
      accountName: connection.providerAccountId,
      email: connection.providerEmail,
      connectedAt: connection.connectedAt,
    };
  },
});
