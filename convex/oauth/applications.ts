/**
 * OAuth Applications CRUD Operations
 *
 * Manage OAuth 2.0 applications (clients) that can integrate with VC83.
 * Each application has credentials (client_id, client_secret) and permissions (scopes).
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { ConvexError } from "convex/values";
import {
  generateClientId,
  generateClientSecret,
  hashClientSecret,
  validateRedirectUri,
  validateScopes,
} from "./helpers";
import { OAUTH_SCOPES } from "./scopes";
import { detectOAuthAppType, identifyIntegrationFromUri } from "./verifiedIntegrations";
import { getLicenseInternal } from "../licensing/helpers";

/**
 * Create a new OAuth application
 *
 * This registers a third-party integration (like Zapier, Make, or custom apps)
 * that can access VC83 APIs on behalf of users.
 *
 * @param name - Human-readable application name (e.g., "Zapier Integration")
 * @param description - Optional detailed description
 * @param redirectUris - Array of valid redirect URIs (must be HTTPS)
 * @param scopes - Space-separated list of requested scopes
 * @param type - "confidential" (server-side) or "public" (mobile/SPA)
 * @param organizationId - Organization that owns this application
 *
 * @returns Client credentials (client_id, client_secret) - SAVE THE SECRET!
 */
export const createOAuthApplication = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    redirectUris: v.array(v.string()),
    scopes: v.string(),
    type: v.union(v.literal("confidential"), v.literal("public")),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Authentication: Must be authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Must be authenticated to create OAuth applications",
      });
    }

    // Authorization: Must be member of the organization
    // TODO Phase 3: Add admin-only check using RBAC system
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", identity.subject as any).eq("organizationId", args.organizationId)
      )
      .first();

    if (!membership) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Must be an organization member to create OAuth applications",
      });
    }

    // Validate inputs
    if (!args.name || args.name.trim().length === 0) {
      throw new ConvexError({
        code: "INVALID_INPUT",
        message: "Application name is required",
      });
    }

    if (args.redirectUris.length === 0) {
      throw new ConvexError({
        code: "INVALID_INPUT",
        message: "At least one redirect URI is required",
      });
    }

    // Validate all redirect URIs
    for (const uri of args.redirectUris) {
      validateRedirectUri(uri);
    }

    // Validate and check scopes
    validateScopes(args.scopes);

    const requestedScopes = args.scopes.split(" ");
    const validScopes = Object.keys(OAUTH_SCOPES);

    for (const scope of requestedScopes) {
      if (!validScopes.includes(scope)) {
        throw new ConvexError({
          code: "INVALID_SCOPES",
          message: `Invalid scope: ${scope}. Must be one of: ${validScopes.join(", ")}`,
        });
      }
    }

    // Detect application type (custom vs third_party)
    const appType = detectOAuthAppType(args.redirectUris);
    const integration = appType === "third_party"
      ? identifyIntegrationFromUri(args.redirectUris[0])
      : null;

    // Get organization license (single source of truth for plan/limits)
    const license = await getLicenseInternal(ctx, args.organizationId);

    // Get OAuth-specific limits from license
    const planLimits = {
      maxCustomOAuthApps: license.limits.maxCustomOAuthApps || 1,
      maxThirdPartyIntegrations: license.limits.maxThirdPartyIntegrations || 0,
    };

    // Count existing applications by type
    const existingApps = await ctx.db
      .query("oauthApplications")
      .withIndex("by_org_and_app_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("appType", appType)
      )
      .collect();

    // Enforce quotas based on license limits
    if (appType === "custom") {
      if (existingApps.length >= planLimits.maxCustomOAuthApps) {
        throw new ConvexError({
          code: "LIMIT_REACHED",
          message: `You've reached the limit of ${planLimits.maxCustomOAuthApps} custom OAuth applications for the ${license.planTier} plan. Upgrade to add more custom integrations.`,
        });
      }
    } else {
      if (existingApps.length >= planLimits.maxThirdPartyIntegrations) {
        const upgradeMsg = license.planTier === "professional" ? "unlimited" : "more";
        throw new ConvexError({
          code: "LIMIT_REACHED",
          message: `You've reached the limit of ${planLimits.maxThirdPartyIntegrations} third-party integrations for the ${license.planTier} plan. Upgrade for ${upgradeMsg} integrations.`,
        });
      }
    }

    // Generate credentials
    const clientId = generateClientId();
    const clientSecret = generateClientSecret();
    const clientSecretHash = await hashClientSecret(clientSecret);

    // Create application
    const applicationId = await ctx.db.insert("oauthApplications", {
      organizationId: args.organizationId,
      name: args.name,
      description: args.description,
      clientId,
      clientSecretHash,
      redirectUris: args.redirectUris,
      scopes: args.scopes,
      type: args.type,
      appType,
      verifiedIntegrationId: integration?.id,
      createdBy: identity.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true,
    });

    // Return credentials (client_secret is only shown once!)
    return {
      applicationId,
      clientId,
      clientSecret, // ⚠️ IMPORTANT: Save this! Won't be shown again!
      name: args.name,
      scopes: args.scopes,
      type: args.type,
      appType,
      verifiedIntegrationId: integration?.id,
      integrationName: integration?.name,
      redirectUris: args.redirectUris,
    };
  },
});

/**
 * List all OAuth applications for an organization
 *
 * Returns basic info (no secrets) for all registered OAuth apps.
 * Useful for management dashboards showing "Connected Apps".
 *
 * Note: Returns empty array for unauthenticated users (graceful degradation)
 * to allow preview of integrations window without errors.
 */
export const listOAuthApplications = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Authentication: Return empty array for unauthenticated users (graceful degradation)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Authorization: Return empty array if not a member (graceful degradation)
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", identity.subject as any).eq("organizationId", args.organizationId)
      )
      .first();

    if (!membership) {
      return [];
    }

    // Fetch all applications for this organization
    const applications = await ctx.db
      .query("oauthApplications")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Return safe data (no secrets!)
    return applications.map((app) => ({
      id: app._id,
      name: app.name,
      description: app.description,
      clientId: app.clientId,
      redirectUris: app.redirectUris,
      scopes: app.scopes,
      type: app.type,
      appType: app.appType,
      verifiedIntegrationId: app.verifiedIntegrationId,
      isActive: app.isActive,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    }));
  },
});

/**
 * Get a single OAuth application by ID
 *
 * Returns detailed information about one OAuth app.
 * Does NOT return the client secret (it's hashed).
 */
export const getOAuthApplication = query({
  args: {
    applicationId: v.id("oauthApplications"),
  },
  handler: async (ctx, args) => {
    // Authentication: Must be authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Must be authenticated to view OAuth application",
      });
    }

    // Fetch application
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "OAuth application not found",
      });
    }

    // Authorization: Must be member of the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", identity.subject as any).eq("organizationId", application.organizationId)
      )
      .first();

    if (!membership) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Must be an organization member to view this application",
      });
    }

    // Return safe data (no secret!)
    return {
      id: application._id,
      name: application.name,
      description: application.description,
      clientId: application.clientId,
      redirectUris: application.redirectUris,
      scopes: application.scopes,
      type: application.type,
      appType: application.appType,
      verifiedIntegrationId: application.verifiedIntegrationId,
      isActive: application.isActive,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      createdBy: application.createdBy,
    };
  },
});

/**
 * Update an OAuth application
 *
 * Allows modifying name, redirect URIs, and scopes.
 * Cannot change client credentials (must create new app for that).
 * TODO Phase 3: Restrict to admins only
 */
export const updateOAuthApplication = mutation({
  args: {
    applicationId: v.id("oauthApplications"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    redirectUris: v.optional(v.array(v.string())),
    scopes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Authentication: Must be authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Must be authenticated to update OAuth application",
      });
    }

    // Fetch application
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "OAuth application not found",
      });
    }

    // Authorization: Must be member of the organization
    // TODO Phase 3: Add admin-only check using RBAC system
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", identity.subject as any).eq("organizationId", application.organizationId)
      )
      .first();

    if (!membership) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Must be an organization member to update OAuth applications",
      });
    }

    // Validate inputs if provided
    if (args.name !== undefined && args.name.trim().length === 0) {
      throw new ConvexError({
        code: "INVALID_INPUT",
        message: "Application name cannot be empty",
      });
    }

    if (args.redirectUris !== undefined) {
      if (args.redirectUris.length === 0) {
        throw new ConvexError({
          code: "INVALID_INPUT",
          message: "At least one redirect URI is required",
        });
      }

      for (const uri of args.redirectUris) {
        validateRedirectUri(uri);
      }
    }

    if (args.scopes !== undefined) {
      validateScopes(args.scopes);

      const requestedScopes = args.scopes.split(" ");
      const validScopes = Object.keys(OAUTH_SCOPES);

      for (const scope of requestedScopes) {
        if (!validScopes.includes(scope)) {
          throw new ConvexError({
            code: "INVALID_SCOPES",
            message: `Invalid scope: ${scope}. Must be one of: ${validScopes.join(", ")}`,
          });
        }
      }
    }

    // Update application
    await ctx.db.patch(args.applicationId, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.redirectUris !== undefined && { redirectUris: args.redirectUris }),
      ...(args.scopes !== undefined && { scopes: args.scopes }),
      ...(args.isActive !== undefined && { isActive: args.isActive }),
      updatedAt: Date.now(),
    });

    // Return updated application
    const updatedApp = await ctx.db.get(args.applicationId);
    return {
      id: updatedApp!._id,
      name: updatedApp!.name,
      description: updatedApp!.description,
      clientId: updatedApp!.clientId,
      redirectUris: updatedApp!.redirectUris,
      scopes: updatedApp!.scopes,
      type: updatedApp!.type,
      isActive: updatedApp!.isActive,
      updatedAt: updatedApp!.updatedAt,
    };
  },
});

/**
 * Delete an OAuth application
 *
 * Permanently deletes the application and revokes all associated tokens.
 * This will break any active integrations using this app!
 * TODO Phase 3: Restrict to admins only
 */
export const deleteOAuthApplication = mutation({
  args: {
    applicationId: v.id("oauthApplications"),
  },
  handler: async (ctx, args) => {
    // Authentication: Must be authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Must be authenticated to delete OAuth application",
      });
    }

    // Fetch application
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "OAuth application not found",
      });
    }

    // Authorization: Must be member of the organization
    // TODO Phase 3: Add admin-only check using RBAC system
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", identity.subject as any).eq("organizationId", application.organizationId)
      )
      .first();

    if (!membership) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Must be an organization member to delete OAuth applications",
      });
    }

    // Revoke all authorization codes for this application
    const authCodes = await ctx.db
      .query("oauthAuthorizationCodes")
      .withIndex("by_client", (q) => q.eq("clientId", application.clientId))
      .collect();

    for (const code of authCodes) {
      await ctx.db.delete(code._id);
    }

    // Revoke all refresh tokens for this application
    const refreshTokens = await ctx.db
      .query("oauthRefreshTokens")
      .withIndex("by_client", (q) => q.eq("clientId", application.clientId))
      .collect();

    for (const token of refreshTokens) {
      await ctx.db.delete(token._id);
    }

    // Delete the application
    await ctx.db.delete(args.applicationId);

    return {
      success: true,
      message: `Application "${application.name}" and ${authCodes.length + refreshTokens.length} associated tokens deleted`,
    };
  },
});

/**
 * Regenerate client secret for an OAuth application
 *
 * Creates a new client secret and invalidates the old one.
 * All existing tokens remain valid, but new authorizations will require the new secret.
 * TODO Phase 3: Restrict to admins only
 */
export const regenerateClientSecret = mutation({
  args: {
    applicationId: v.id("oauthApplications"),
  },
  handler: async (ctx, args) => {
    // Authentication: Must be authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Must be authenticated to regenerate client secret",
      });
    }

    // Fetch application
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "OAuth application not found",
      });
    }

    // Authorization: Must be member of the organization
    // TODO Phase 3: Add admin-only check using RBAC system
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", identity.subject as any).eq("organizationId", application.organizationId)
      )
      .first();

    if (!membership) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Must be an organization member to regenerate client secret",
      });
    }

    // Generate new secret
    const newClientSecret = generateClientSecret();
    const newClientSecretHash = await hashClientSecret(newClientSecret);

    // Update application
    await ctx.db.patch(args.applicationId, {
      clientSecretHash: newClientSecretHash,
      updatedAt: Date.now(),
    });

    // Return new secret (only shown once!)
    return {
      clientId: application.clientId,
      clientSecret: newClientSecret, // ⚠️ IMPORTANT: Save this! Won't be shown again!
      message: "Client secret regenerated successfully. Update your application configuration.",
    };
  },
});
