/**
 * API V1: OAUTH CONNECTIONS INTERNAL HANDLERS
 *
 * Internal queries and mutations for OAuth connections management.
 * Used by CLI apps and external integrations to manage OAuth connections.
 *
 * NOTE: These endpoints allow READ operations on OAuth connections.
 * Token values are NEVER exposed - only connection metadata.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

// ============================================================================
// OAUTH CONNECTION QUERIES
// ============================================================================

/**
 * LIST OAUTH CONNECTIONS (Internal Query)
 *
 * Lists OAuth connections for an organization with optional filters.
 * Does NOT expose token values for security.
 */
export const listOAuthConnectionsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    provider: v.optional(v.string()),
    status: v.optional(v.string()),
    connectionType: v.optional(v.string()),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    // Query all OAuth connections for organization
    const query = ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      );

    const allConnections = await query.collect();

    // Apply filters
    let filteredConnections = allConnections;

    if (args.provider) {
      filteredConnections = filteredConnections.filter(
        (c) => c.provider === args.provider
      );
    }

    if (args.status) {
      filteredConnections = filteredConnections.filter(
        (c) => c.status === args.status
      );
    }

    if (args.connectionType) {
      filteredConnections = filteredConnections.filter(
        (c) => c.connectionType === args.connectionType
      );
    }

    // Sort by connection date (newest first)
    filteredConnections.sort((a, b) => b.connectedAt - a.connectedAt);

    // Apply pagination
    const total = filteredConnections.length;
    const paginatedConnections = filteredConnections.slice(
      args.offset,
      args.offset + args.limit
    );

    // Format response (NEVER expose tokens)
    const connections = paginatedConnections.map((conn) => ({
      id: conn._id,
      provider: conn.provider,
      providerAccountId: conn.providerAccountId,
      providerEmail: conn.providerEmail,
      connectionType: conn.connectionType,
      scopes: conn.scopes,
      syncSettings: conn.syncSettings,
      status: conn.status,
      lastSyncAt: conn.lastSyncAt,
      lastSyncError: conn.lastSyncError,
      connectedAt: conn.connectedAt,
      updatedAt: conn.updatedAt,
      userId: conn.userId, // Which user owns this connection (if personal)
    }));

    return {
      connections,
      total,
      limit: args.limit,
      offset: args.offset,
    };
  },
});

/**
 * GET OAUTH CONNECTION (Internal Query)
 *
 * Gets a specific OAuth connection by ID.
 * Does NOT expose token values for security.
 */
export const getOAuthConnectionInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);

    if (!connection) {
      return null;
    }

    // Verify organization ownership
    if (connection.organizationId !== args.organizationId) {
      return null;
    }

    // Return connection without tokens
    return {
      id: connection._id,
      provider: connection.provider,
      providerAccountId: connection.providerAccountId,
      providerEmail: connection.providerEmail,
      connectionType: connection.connectionType,
      scopes: connection.scopes,
      syncSettings: connection.syncSettings,
      status: connection.status,
      lastSyncAt: connection.lastSyncAt,
      lastSyncError: connection.lastSyncError,
      connectedAt: connection.connectedAt,
      updatedAt: connection.updatedAt,
      userId: connection.userId,
      tokenExpiresAt: connection.tokenExpiresAt, // Expose expiry for status checks
      customProperties: connection.customProperties,
    };
  },
});

/**
 * GET OAUTH CONNECTIONS BY PROVIDER (Internal Query)
 *
 * Gets all connections for a specific provider.
 */
export const getOAuthConnectionsByProviderInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", args.organizationId).eq("provider", args.provider as "microsoft" | "google" | "slack" | "salesforce" | "dropbox" | "github" | "vercel" | "okta")
      )
      .collect();

    // Return connections without tokens
    return connections.map((conn) => ({
      id: conn._id,
      provider: conn.provider,
      providerAccountId: conn.providerAccountId,
      providerEmail: conn.providerEmail,
      connectionType: conn.connectionType,
      scopes: conn.scopes,
      syncSettings: conn.syncSettings,
      status: conn.status,
      lastSyncAt: conn.lastSyncAt,
      lastSyncError: conn.lastSyncError,
      connectedAt: conn.connectedAt,
      updatedAt: conn.updatedAt,
      userId: conn.userId,
    }));
  },
});

// ============================================================================
// OAUTH CONNECTION MUTATIONS
// ============================================================================

/**
 * UPDATE OAUTH CONNECTION SYNC SETTINGS (Internal Mutation)
 *
 * Updates sync settings for an OAuth connection.
 */
export const updateOAuthConnectionSyncSettingsInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    connectionId: v.id("oauthConnections"),
    syncSettings: v.object({
      email: v.boolean(),
      calendar: v.boolean(),
      oneDrive: v.boolean(),
      sharePoint: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);

    if (!connection) {
      throw new Error("OAuth connection not found");
    }

    // Verify organization ownership
    if (connection.organizationId !== args.organizationId) {
      throw new Error("OAuth connection not found");
    }

    // Update sync settings
    await ctx.db.patch(args.connectionId, {
      syncSettings: args.syncSettings,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DISCONNECT OAUTH CONNECTION (Internal Mutation)
 *
 * Revokes/disconnects an OAuth connection (soft delete).
 */
export const disconnectOAuthConnectionInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);

    if (!connection) {
      throw new Error("OAuth connection not found");
    }

    // Verify organization ownership
    if (connection.organizationId !== args.organizationId) {
      throw new Error("OAuth connection not found");
    }

    // Soft delete - set status to revoked and clear tokens
    await ctx.db.patch(args.connectionId, {
      status: "revoked",
      accessToken: "",
      refreshToken: "",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DELETE OAUTH CONNECTION (Internal Mutation)
 *
 * Permanently deletes an OAuth connection.
 */
export const deleteOAuthConnectionInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);

    if (!connection) {
      throw new Error("OAuth connection not found");
    }

    // Verify organization ownership
    if (connection.organizationId !== args.organizationId) {
      throw new Error("OAuth connection not found");
    }

    // Permanently delete
    await ctx.db.delete(args.connectionId);

    return { success: true };
  },
});
