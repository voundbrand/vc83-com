/**
 * SEED CHECKOUT APP
 *
 * Registers the app_checkout app in the apps registry.
 * This should be run once during initial setup.
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const seedCheckoutApp = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding app_checkout...");

    // Get or create system organization
    let systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      console.log("Creating system organization...");
      const systemOrgId = await ctx.db.insert("organizations", {
        name: "System",
        slug: "system",
        businessName: "System Organization",
        plan: "enterprise",
        isPersonalWorkspace: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      systemOrg = await ctx.db.get(systemOrgId);
    }

    if (!systemOrg) {
      throw new Error("System organization could not be created");
    }

    // Check if app_checkout already exists
    const existingApp = await ctx.db
      .query("apps")
      .withIndex("by_code", q => q.eq("code", "app_checkout"))
      .first();

    if (existingApp) {
      console.log("✅ app_checkout already registered");
      return { appId: existingApp._id, status: "already_exists" };
    }

    // Register app_checkout
    const appId = await ctx.db.insert("apps", {
      code: "app_checkout",
      name: "Checkout & Payments",
      description: "Stripe Connect integration for accepting payments. Enables ticket sales, invoice payments, and digital product purchases.",
      icon: "💳",
      category: "finance",
      plans: ["free", "pro", "personal", "business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned", // Each org has their own payment data
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log(`✅ Registered app_checkout (ID: ${appId})`);

    return { appId, status: "created" };
  },
});

/**
 * INSTALL CHECKOUT APP FOR ORGANIZATION
 *
 * Installs the checkout app for a specific organization.
 * This gives them access to payment features.
 */
export const installCheckoutAppForOrg = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    console.log(`🔧 Installing app_checkout for org ${args.organizationId}...`);

    // Get the app
    const app = await ctx.db
      .query("apps")
      .withIndex("by_code", q => q.eq("code", "app_checkout"))
      .first();

    if (!app) {
      throw new Error("app_checkout not found. Run seedCheckoutApp first.");
    }

    // Check if already installed
    const existingInstall = await ctx.db
      .query("appInstallations")
      .withIndex("by_org_and_app", q =>
        q.eq("organizationId", args.organizationId)
         .eq("appId", app._id)
      )
      .first();

    if (existingInstall) {
      console.log("✅ app_checkout already installed for this org");
      return { installationId: existingInstall._id, status: "already_installed" };
    }

    // Install the app
    const installationId = await ctx.db.insert("appInstallations", {
      organizationId: args.organizationId,
      appId: app._id,
      status: "active",
      permissions: {
        read: true,
        write: true,
        admin: true,
      },
      isVisible: true,
      usageCount: 0,
      installedAt: Date.now(),
      installedBy: args.userId,
      updatedAt: Date.now(),
    });

    console.log(`✅ Installed app_checkout for org (Installation ID: ${installationId})`);

    return { installationId, status: "installed" };
  },
});
