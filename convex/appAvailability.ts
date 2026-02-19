import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, getUserContext } from "./rbacHelpers";
import { getLicenseInternal } from "./licensing/helpers";
import { isAppEnabledByTier } from "./licensing/appFeatureMapping";
import type { Id } from "./_generated/dataModel";

const releaseStageValidator = v.union(
  v.literal("none"),
  v.literal("new"),
  v.literal("beta"),
  v.literal("wip"),
);

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
 * Access is determined by:
 * 1. App is in appAvailabilities (seeded for all orgs) AND
 * 2. Organization's license tier has the corresponding feature enabled
 *
 * Super admins see all active apps (bypass licensing).
 * Regular users see only apps enabled for their tier.
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

    // Super admins see all active and approved apps (bypass licensing)
    if (userContext.isGlobal && userContext.roleName === "super_admin") {
      return await ctx.db
        .query("apps")
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "active"),
            q.eq(q.field("status"), "approved")
          )
        )
        .collect();
    }

    // Get organization's license to check tier-based access
    const license = await getLicenseInternal(ctx, organizationId);

    // Get enabled apps for this organization from appAvailabilities
    const availabilities = await ctx.db
      .query("appAvailabilities")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isAvailable"), true))
      .collect();

    const availableAppIds = availabilities.map((a) => a.appId);

    // Get the app details and filter by tier-based access
    const apps = [];
    for (const appId of availableAppIds) {
      const app = await ctx.db.get(appId);
      // Include both active and approved apps
      if (app && (app.status === "active" || app.status === "approved")) {
        // Check if the app is enabled by the organization's tier
        if (isAppEnabledByTier(app.code, license.features)) {
          apps.push(app);
        }
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
  args: {
    sessionId: v.string(),
    cursor: v.optional(v.string()),
    pageSize: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, cursor, pageSize, search }) => {
    try {
      const { userId } = await requireAuthenticatedUser(ctx, sessionId);
      const userContext = await getUserContext(ctx, userId);

      if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
        // Return null instead of throwing - UI will handle gracefully
        return null;
      }

      const normalizedSearch = search?.trim().slice(0, 120);
      const pageLimit = Math.max(10, Math.min(pageSize ?? 25, 100));

      const organizationsPage = normalizedSearch
        ? await ctx.db
            .query("organizations")
            .withSearchIndex("search_by_name", (q) => q.search("name", normalizedSearch))
            .paginate({ cursor: cursor ?? null, numItems: pageLimit })
        : await ctx.db
            .query("organizations")
            .order("desc")
            .paginate({ cursor: cursor ?? null, numItems: pageLimit });

      // Only show active and approved apps in the matrix (exclude pending/rejected)
      const apps = await ctx.db
        .query("apps")
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "active"),
            q.eq(q.field("status"), "approved")
          )
        )
        .collect();

      const availabilities: {
        organizationId: Id<"organizations">;
        appId: Id<"apps">;
        isAvailable: boolean;
      }[] = [];

      const apiSettings: {
        organizationId: Id<"organizations">;
        apiKeysEnabled: boolean;
      }[] = [];

      for (const org of organizationsPage.page) {
        const orgAvailabilities = await ctx.db
          .query("appAvailabilities")
          .withIndex("by_org", (q) => q.eq("organizationId", org._id))
          .collect();

        for (const row of orgAvailabilities) {
          availabilities.push({
            organizationId: row.organizationId,
            appId: row.appId,
            isAvailable: row.isAvailable,
          });
        }

        const orgApiSettings = await ctx.db
          .query("objects")
          .withIndex("by_org_type", (q) =>
            q.eq("organizationId", org._id).eq("type", "organization_settings")
          )
          .filter((q) => q.eq(q.field("subtype"), "api"))
          .first();

        const customProperties = orgApiSettings?.customProperties as
          | { apiKeysEnabled?: boolean }
          | undefined;

        apiSettings.push({
          organizationId: org._id,
          apiKeysEnabled: customProperties?.apiKeysEnabled ?? false,
        });
      }

      return {
        organizations: organizationsPage.page.map((org) => ({
          _id: org._id,
          name: org.name,
          slug: org.slug,
          isActive: org.isActive,
        })),
        apps,
        availabilities,
        apiSettings,
        pageInfo: {
          continueCursor: organizationsPage.continueCursor,
          isDone: organizationsPage.isDone,
        },
      };
    } catch (error) {
      // Catch any permission errors (like user switching) and return null
      // This prevents crashes and allows UI to show friendly message
      console.error("Access error in getAvailabilityMatrix:", error);
      return null;
    }
  },
});

/**
 * List app rollout metadata (super admin only).
 * Used by system-admin manage surfaces to edit Product OS release badges.
 */
export const listAppReleaseStages = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const { userId } = await requireAuthenticatedUser(ctx, sessionId);
    const userContext = await getUserContext(ctx, userId);

    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Super admin access required to view app release stages");
    }

    const apps = await ctx.db
      .query("apps")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "approved"),
        ),
      )
      .collect();

    return apps
      .map((app) => ({
        _id: app._id,
        code: app.code,
        name: app.name,
        category: app.category,
        status: app.status,
        releaseStage: app.releaseStage ?? "none",
        updatedAt: app.updatedAt,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  },
});

/**
 * Update app rollout badge stage (super admin only).
 */
export const setAppReleaseStage = mutation({
  args: {
    sessionId: v.string(),
    appId: v.id("apps"),
    releaseStage: releaseStageValidator,
  },
  handler: async (ctx, { sessionId, appId, releaseStage }) => {
    const { userId } = await requireAuthenticatedUser(ctx, sessionId);
    const userContext = await getUserContext(ctx, userId);

    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Super admin access required to update app release stages");
    }

    const app = await ctx.db.get(appId);
    if (!app) {
      throw new Error("App not found");
    }

    await ctx.db.patch(appId, {
      releaseStage,
      updatedAt: Date.now(),
    });

    return {
      appId,
      code: app.code,
      releaseStage,
    };
  },
});
