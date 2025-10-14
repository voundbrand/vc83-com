import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, getUserContext } from "./rbacHelpers";

/**
 * App Availability Management
 *
 * Controls which apps are visible and accessible to specific organizations.
 * Super admins can manage app availability across all organizations.
 */

/**
 * Get app availability for a specific organization and app
 *
 * @param organizationId - Organization to check
 * @param appId - App to check availability for
 * @returns Availability record or null if not found
 */
export const getAppAvailability = query({
  args: {
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
  },
  handler: async (ctx, { organizationId, appId }) => {
    return await ctx.db
      .query("appAvailabilities")
      .withIndex("by_org_app", (q) =>
        q.eq("organizationId", organizationId).eq("appId", appId)
      )
      .first();
  },
});

/**
 * Get all app availabilities for an organization
 *
 * @param organizationId - Organization to get availabilities for
 * @returns Array of availability records
 */
export const getOrgAvailabilities = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("appAvailabilities")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();
  },
});

/**
 * Get all apps available to an organization
 *
 * Super admins see all active apps.
 * Regular users see only apps enabled for their organization.
 *
 * @param sessionId - User session
 * @param organizationId - Organization to check
 * @returns Array of available apps
 */
export const getAvailableApps = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { sessionId, organizationId }) => {
    const { userId } = await requireAuthenticatedUser(ctx, sessionId);
    const userContext = await getUserContext(ctx, userId, organizationId);

    // Super admins see all active apps
    if (userContext.isGlobal && userContext.roleName === "super_admin") {
      return await ctx.db
        .query("apps")
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
    }

    // Get enabled apps for this organization
    const availabilities = await ctx.db
      .query("appAvailabilities")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isAvailable"), true))
      .collect();

    const availableAppIds = availabilities.map((a) => a.appId);

    // Get the app details for available apps
    const apps = [];
    for (const appId of availableAppIds) {
      const app = await ctx.db.get(appId);
      if (app && app.status === "active") {
        apps.push(app);
      }
    }

    return apps;
  },
});

/**
 * Get all apps in the system (super admin only)
 *
 * @param sessionId - User session
 * @returns Array of all apps
 */
export const listAllApps = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireAuthenticatedUser(ctx, sessionId);
    const userContext = await getUserContext(ctx, userId);

    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Super admin access required to list all apps");
    }

    return await ctx.db.query("apps").collect();
  },
});

/**
 * Set app availability for an organization (super admin only)
 *
 * When enabling an app:
 * 1. Creates appAvailabilities record (visibility control)
 * 2. Creates appInstallations record (actual installation)
 * 3. Creates snapshot load if the app has a default snapshot
 *
 * When disabling an app:
 * 1. Updates appAvailabilities to isAvailable=false
 * 2. Updates appInstallations status to "suspended"
 *
 * @param sessionId - User session
 * @param organizationId - Organization to set availability for
 * @param appId - App to enable/disable
 * @param isAvailable - Whether the app should be available
 * @returns Object with availability ID and installation ID (if created)
 */
export const setAppAvailability = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    isAvailable: v.boolean(),
  },
  handler: async (ctx, { sessionId, organizationId, appId, isAvailable }) => {
    const { userId } = await requireAuthenticatedUser(ctx, sessionId);
    const userContext = await getUserContext(ctx, userId);

    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Super admin access required to manage app availability");
    }

    // Get the app details
    const app = await ctx.db.get(appId);
    if (!app) {
      throw new Error("App not found");
    }

    // Check if availability record exists
    const existingAvailability = await ctx.db
      .query("appAvailabilities")
      .withIndex("by_org_app", (q) =>
        q.eq("organizationId", organizationId).eq("appId", appId)
      )
      .first();

    let availabilityId;
    if (existingAvailability) {
      // Update existing record
      await ctx.db.patch(existingAvailability._id, {
        isAvailable,
        approvedBy: userId,
        approvedAt: Date.now(),
      });
      availabilityId = existingAvailability._id;
    } else {
      // Create new record
      availabilityId = await ctx.db.insert("appAvailabilities", {
        appId,
        organizationId,
        isAvailable,
        approvedBy: userId,
        approvedAt: Date.now(),
      });
    }

    // Handle appInstallations
    const existingInstallation = await ctx.db
      .query("appInstallations")
      .withIndex("by_org_and_app", (q) =>
        q.eq("organizationId", organizationId).eq("appId", appId)
      )
      .first();

    let installationId;
    if (isAvailable) {
      // ENABLING THE APP
      if (existingInstallation) {
        // Reactivate existing installation
        await ctx.db.patch(existingInstallation._id, {
          status: "active",
          isVisible: true,
          updatedAt: Date.now(),
        });
        installationId = existingInstallation._id;
      } else {
        // Create new installation
        installationId = await ctx.db.insert("appInstallations", {
          organizationId,
          appId,
          status: "active",
          permissions: {
            read: true,
            write: true,
            admin: false,
          },
          isVisible: true,
          usageCount: 0,
          installedAt: Date.now(),
          installedBy: userId,
          updatedAt: Date.now(),
        });

        // Create snapshot load if app has default snapshot
        // (This is for future when we have snapshot templates)
        // For now, we just create the installation
      }
    } else {
      // DISABLING THE APP
      if (existingInstallation) {
        // Suspend the installation (don't delete - preserve data)
        await ctx.db.patch(existingInstallation._id, {
          status: "suspended",
          isVisible: false,
          updatedAt: Date.now(),
        });
        installationId = existingInstallation._id;
      }
    }

    return {
      availabilityId,
      installationId,
      action: isAvailable ? "enabled" : "disabled",
      appName: app.name,
    };
  },
});

/**
 * Bulk set app availability for an organization (super admin only)
 *
 * @param sessionId - User session
 * @param organizationId - Organization to set availability for
 * @param appIds - Array of app IDs to enable/disable
 * @param isAvailable - Whether the apps should be available
 * @returns Array of created/updated availability record IDs
 */
export const bulkSetAppAvailability = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    appIds: v.array(v.id("apps")),
    isAvailable: v.boolean(),
  },
  handler: async (ctx, { sessionId, organizationId, appIds, isAvailable }) => {
    const { userId } = await requireAuthenticatedUser(ctx, sessionId);
    const userContext = await getUserContext(ctx, userId);

    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Super admin access required to manage app availability");
    }

    const results = [];

    for (const appId of appIds) {
      const existing = await ctx.db
        .query("appAvailabilities")
        .withIndex("by_org_app", (q) =>
          q.eq("organizationId", organizationId).eq("appId", appId)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          isAvailable,
          approvedBy: userId,
          approvedAt: Date.now(),
        });
        results.push(existing._id);
      } else {
        const id = await ctx.db.insert("appAvailabilities", {
          appId,
          organizationId,
          isAvailable,
          approvedBy: userId,
          approvedAt: Date.now(),
        });
        results.push(id);
      }
    }

    return results;
  },
});

/**
 * Get availability matrix for all organizations and apps (super admin only)
 *
 * Returns a comprehensive view of which apps are enabled for which organizations.
 * Used by the admin UI to display the availability matrix.
 *
 * @param sessionId - User session
 * @returns Object with organizations, apps, and availability mappings
 */
export const getAvailabilityMatrix = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    try {
      const { userId } = await requireAuthenticatedUser(ctx, sessionId);
      const userContext = await getUserContext(ctx, userId);

      if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
        // Return null instead of throwing - UI will handle gracefully
        return null;
      }

      const organizations = await ctx.db.query("organizations").collect();
      const apps = await ctx.db.query("apps").collect();
      const availabilities = await ctx.db.query("appAvailabilities").collect();

      return {
        organizations,
        apps,
        availabilities,
      };
    } catch (error) {
      // Catch any permission errors (like user switching) and return null
      // This prevents crashes and allows UI to show friendly message
      console.error("Access error in getAvailabilityMatrix:", error);
      return null;
    }
  },
});
