import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentContext } from "./helpers";

export const installApp = mutation({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, { appId }) => {
    const { user, organization } = await getCurrentContext(ctx);

    const app = await ctx.db.get(appId);
    if (!app) {
      throw new Error("App not found");
    }

    const existing = await ctx.db
      .query("appInstallations")
      .withIndex("by_org_and_app", (q) =>
        q.eq("organizationId", organization._id).eq("appId", appId)
      )
      .first();

    if (existing) {
      if (existing.status === "active") {
        throw new Error("App already installed");
      }
      await ctx.db.patch(existing._id, {
        status: "active",
        isVisible: true,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    if (!app.plans.includes(organization.plan)) {
      throw new Error(
        `This app requires ${app.plans.join(" or ")} plan. Current plan: ${organization.plan}`
      );
    }

    const installationId = await ctx.db.insert("appInstallations", {
      organizationId: organization._id,
      appId,
      status: "active",
      permissions: { read: true, write: false },
      isVisible: true,
      usageCount: 0,
      installedAt: Date.now(),
      installedBy: user._id,
      updatedAt: Date.now(),
    });

    return installationId;
  },
});

export const uninstallApp = mutation({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, { appId }) => {
    const { organization } = await getCurrentContext(ctx);

    const installation = await ctx.db
      .query("appInstallations")
      .withIndex("by_org_and_app", (q) =>
        q.eq("organizationId", organization._id).eq("appId", appId)
      )
      .first();

    if (!installation) {
      throw new Error("App not installed");
    }

    await ctx.db.patch(installation._id, {
      status: "uninstalled",
      isVisible: false,
      updatedAt: Date.now(),
    });
  },
});

export const toggleAppVisibility = mutation({
  args: {
    appId: v.id("apps"),
    isVisible: v.boolean(),
  },
  handler: async (ctx, { appId, isVisible }) => {
    const { organization } = await getCurrentContext(ctx);

    const installation = await ctx.db
      .query("appInstallations")
      .withIndex("by_org_and_app", (q) =>
        q.eq("organizationId", organization._id).eq("appId", appId)
      )
      .first();

    if (!installation) {
      throw new Error("App not installed");
    }

    await ctx.db.patch(installation._id, {
      isVisible,
      updatedAt: Date.now(),
    });
  },
});

export const getInstalledApps = query({
  handler: async (ctx) => {
    const { organization } = await getCurrentContext(ctx);

    const installations = await ctx.db
      .query("appInstallations")
      .withIndex("by_organization", (q) => q.eq("organizationId", organization._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const appsWithDetails = await Promise.all(
      installations.map(async (installation) => {
        const app = await ctx.db.get(installation.appId);
        return {
          ...app,
          installation,
        };
      })
    );

    return appsWithDetails.filter((item) => item && item._id && item.status === "active");
  },
});

export const getVisibleApps = query({
  handler: async (ctx) => {
    const { organization } = await getCurrentContext(ctx);

    const installations = await ctx.db
      .query("appInstallations")
      .withIndex("by_org_visible", (q) =>
        q.eq("organizationId", organization._id).eq("isVisible", true)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const appsWithDetails = await Promise.all(
      installations.map(async (installation) => {
        const app = await ctx.db.get(installation.appId);
        return {
          ...app,
          installation,
        };
      })
    );

    return appsWithDetails.filter((item) => item.status === "active");
  },
});

export const getAvailableApps = query({
  handler: async (ctx) => {
    const { organization } = await getCurrentContext(ctx);

    const allApps = await ctx.db
      .query("apps")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const installations = await ctx.db
      .query("appInstallations")
      .withIndex("by_organization", (q) => q.eq("organizationId", organization._id))
      .collect();

    const installedAppIds = new Set(installations.map((i) => i.appId));

    return allApps.filter(
      (app) =>
        !installedAppIds.has(app._id) && app.plans.includes(organization.plan)
    );
  },
});

export const hasAppAccess = query({
  args: { appId: v.id("apps") },
  handler: async (ctx, { appId }) => {
    const { organization } = await getCurrentContext(ctx);

    const installation = await ctx.db
      .query("appInstallations")
      .withIndex("by_org_and_app", (q) =>
        q.eq("organizationId", organization._id).eq("appId", appId)
      )
      .first();

    return installation?.status === "active";
  },
});

export const incrementAppUsage = mutation({
  args: { appId: v.id("apps") },
  handler: async (ctx, { appId }) => {
    const { organization } = await getCurrentContext(ctx);

    const installation = await ctx.db
      .query("appInstallations")
      .withIndex("by_org_and_app", (q) =>
        q.eq("organizationId", organization._id).eq("appId", appId)
      )
      .first();

    if (installation) {
      await ctx.db.patch(installation._id, {
        usageCount: installation.usageCount + 1,
        lastUsedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});