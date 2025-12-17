import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, getUserContext } from "./rbacHelpers";

/**
 * Seed System Apps
 *
 * Registers the built-in system apps (Payments, Web Publishing, etc.)
 * This should be run once during initial setup.
 *
 * Super admin only.
 */

/**
 * Seed all system apps at once
 *
 * Creates:
 * - Payments app
 * - Web Publishing app
 * - Media Library app
 * - Invoicing app
 * - Workflows app
 * - Products app
 * - Tickets app
 * - Events app
 * - Checkout app
 * - Forms app
 * - CRM app
 * - Certificates app
 * - Compliance app
 *
 * No authentication required - this is a one-time setup mutation.
 *
 * @returns Object with created app IDs
 */
export const seedSystemApps = mutation({
  args: {},
  handler: async (ctx) => {
    // Find or create system organization
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      systemOrg = await ctx.db.insert("organizations", {
        name: "System",
        slug: "system",
        businessName: "l4yercak3 System",
        // NOTE: Plan/tier managed in organization_license object
        isPersonalWorkspace: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }).then(id => ctx.db.get(id));

      if (!systemOrg) {
        throw new Error("Failed to create system organization");
      }
    }

    // Check if Payments app already exists
    const existingPayments = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "payments"))
      .first();

    let paymentsAppId;
    if (existingPayments) {
      paymentsAppId = existingPayments._id;
      console.log("Payments app already exists:", paymentsAppId);
    } else {
      paymentsAppId = await ctx.db.insert("apps", {
        code: "payments",
        name: "Payments",
        description: "Stripe Connect payment processing, invoicing, and checkout pages",
        icon: "💰",
        category: "finance",
        plans: ["free", "pro", "personal", "business", "enterprise"],
        creatorOrgId: systemOrg._id,
        dataScope: "installer-owned",
        status: "active",
        version: "1.0.0",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log("Created Payments app:", paymentsAppId);
    }

    // Check if Web Publishing app already exists
    const existingPublishing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "web-publishing"))
      .first();

    let publishingAppId;
    if (existingPublishing) {
      publishingAppId = existingPublishing._id;
      console.log("Web Publishing app already exists:", publishingAppId);
    } else {
      publishingAppId = await ctx.db.insert("apps", {
        code: "web-publishing",
        name: "Web Publishing",
        description: "Publish pages with templates and custom URLs. Includes template system.",
        icon: "🌐",
        category: "marketing",
        plans: ["pro", "business", "enterprise"],
        creatorOrgId: systemOrg._id,
        dataScope: "installer-owned",
        status: "active",
        version: "1.0.0",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log("Created Web Publishing app:", publishingAppId);
    }

    // Check if Media Library app already exists
    const existingMediaLibrary = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "media-library"))
      .first();

    let mediaLibraryAppId;
    if (existingMediaLibrary) {
      mediaLibraryAppId = existingMediaLibrary._id;
      console.log("Media Library app already exists:", mediaLibraryAppId);
    } else {
      mediaLibraryAppId = await ctx.db.insert("apps", {
        code: "media-library",
        name: "Media Library",
        description: "Upload, manage, and organize images and files. Used by other apps for media selection.",
        icon: "📁",
        category: "content",
        plans: ["free", "pro", "personal", "business", "enterprise"],
        creatorOrgId: systemOrg._id,
        dataScope: "installer-owned",
        status: "active",
        version: "1.0.0",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log("Created Media Library app:", mediaLibraryAppId);
    }

    // Check if Invoicing app already exists
    const existingInvoicing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "app_invoicing"))
      .first();

    let invoicingAppId;
    if (existingInvoicing) {
      invoicingAppId = existingInvoicing._id;
      console.log("Invoicing app already exists:", invoicingAppId);
    } else {
      invoicingAppId = await ctx.db.insert("apps", {
        code: "app_invoicing",
        name: "B2B/B2C Invoicing",
        description: "Comprehensive invoicing system with B2B consolidation, payment tracking, and automated billing workflows",
        icon: "🧾",
        category: "finance",
        plans: ["business", "enterprise"],
        creatorOrgId: systemOrg._id,
        dataScope: "installer-owned",
        status: "active",
        version: "1.0.0",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log("Created Invoicing app:", invoicingAppId);
    }

    // Check if Workflows app already exists
    const existingWorkflows = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "workflows"))
      .first();

    let workflowsAppId;
    if (existingWorkflows) {
      workflowsAppId = existingWorkflows._id;
      console.log("Workflows app already exists:", workflowsAppId);
    } else {
      workflowsAppId = await ctx.db.insert("apps", {
        code: "workflows",
        name: "Workflows",
        description: "Visual workflow builder for orchestrating multi-object behaviors and automation",
        icon: "⚡",
        category: "business",
        plans: ["business", "enterprise"],
        creatorOrgId: systemOrg._id,
        dataScope: "installer-owned",
        status: "active",
        version: "1.0.0",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log("Created Workflows app:", workflowsAppId);
    }

    // Check if Compliance app already exists
    const existingCompliance = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "compliance"))
      .first();

    let complianceAppId;
    if (existingCompliance) {
      complianceAppId = existingCompliance._id;
      console.log("Compliance app already exists:", complianceAppId);
    } else {
      complianceAppId = await ctx.db.insert("apps", {
        code: "compliance",
        name: "Compliance",
        description: "GDPR compliance tools: data export, account deletion, and document conversion",
        icon: "🛡️",
        category: "administration",
        // Account deletion is a GDPR right - available to ALL tiers
        // Other features (PDF conversion) may be tier-gated in the UI
        plans: ["free", "starter", "pro", "personal", "business", "enterprise"],
        creatorOrgId: systemOrg._id,
        dataScope: "installer-owned",
        status: "active",
        version: "1.0.0",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log("Created Compliance app:", complianceAppId);
    }

    // Check if AI Assistant app already exists
    const existingAIAssistant = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "ai-assistant"))
      .first();

    let aiAssistantAppId;
    if (existingAIAssistant) {
      aiAssistantAppId = existingAIAssistant._id;
      console.log("AI Assistant app already exists:", aiAssistantAppId);
    } else {
      aiAssistantAppId = await ctx.db.insert("apps", {
        code: "ai-assistant",
        name: "AI Assistant",
        description: "AI-powered assistant for emails, CRM, forms, events, and workflow automation with natural language interface",
        icon: "🤖",
        category: "business",
        plans: ["pro", "business", "enterprise"],
        creatorOrgId: systemOrg._id,
        dataScope: "installer-owned",
        status: "active",
        version: "1.0.0",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log("Created AI Assistant app:", aiAssistantAppId);
    }

    return {
      paymentsAppId,
      publishingAppId,
      mediaLibraryAppId,
      invoicingAppId,
      workflowsAppId,
      complianceAppId,
      aiAssistantAppId,
      systemOrgId: systemOrg._id,
    };
  },
});

/**
 * Register Web Publishing app only
 *
 * Simple mutation to register just the Web Publishing app in the database.
 * No authentication required - this is a one-time setup mutation.
 *
 * @returns App ID if created, or existing app ID if already registered
 */
export const registerWebPublishingApp = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if Web Publishing app already exists
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "web-publishing"))
      .first();

    if (existing) {
      console.log("Web Publishing app already registered:", existing._id);
      return {
        appId: existing._id,
        message: "Web Publishing app already registered",
        app: existing,
      };
    }

    // Find or create a system organization to own the app
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    // If no system org exists, just use the first organization
    if (!systemOrg) {
      const firstOrg = await ctx.db.query("organizations").first();
      if (!firstOrg) {
        throw new Error(
          "No organizations found. Create an organization first before registering apps."
        );
      }
      systemOrg = firstOrg;
    }

    // Create the Web Publishing app record
    const appId = await ctx.db.insert("apps", {
      code: "web-publishing",
      name: "Web Publishing",
      description: "Publish pages with templates and custom URLs. Includes template system.",
      icon: "🌐",
      category: "marketing",
      plans: ["pro", "business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned",
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);

    console.log("Web Publishing app registered successfully:", appId);

    return {
      appId,
      message: "Web Publishing app registered successfully",
      app,
    };
  },
});

/**
 * Register Payments app only
 *
 * Simple mutation to register just the Payments app in the database.
 * No authentication required - this is a one-time setup mutation.
 *
 * @returns App ID if created, or existing app ID if already registered
 */
export const registerPaymentsApp = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if Payments app already exists
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "payments"))
      .first();

    if (existing) {
      console.log("Payments app already registered:", existing._id);
      return {
        appId: existing._id,
        message: "Payments app already registered",
        app: existing,
      };
    }

    // Find or create a system organization to own the app
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    // If no system org exists, just use the first organization
    if (!systemOrg) {
      const firstOrg = await ctx.db.query("organizations").first();
      if (!firstOrg) {
        throw new Error(
          "No organizations found. Create an organization first before registering apps."
        );
      }
      systemOrg = firstOrg;
    }

    // Create the Payments app record
    const appId = await ctx.db.insert("apps", {
      code: "payments",
      name: "Payments",
      description: "Stripe Connect payment processing, invoicing, and checkout pages",
      icon: "💰",
      category: "finance",
      plans: ["free", "pro", "personal", "business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned",
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);

    console.log("Payments app registered successfully:", appId);

    return {
      appId,
      message: "Payments app registered successfully",
      app,
    };
  },
});

/**
 * Register Media Library app only
 *
 * Simple mutation to register just the Media Library app in the database.
 * No authentication required - this is a one-time setup mutation.
 *
 * @returns App ID if created, or existing app ID if already registered
 */
export const registerMediaLibraryApp = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if Media Library app already exists
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "media-library"))
      .first();

    if (existing) {
      console.log("Media Library app already registered:", existing._id);
      return {
        appId: existing._id,
        message: "Media Library app already registered",
        app: existing,
      };
    }

    // Find or create a system organization to own the app
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    // If no system org exists, just use the first organization
    if (!systemOrg) {
      const firstOrg = await ctx.db.query("organizations").first();
      if (!firstOrg) {
        throw new Error(
          "No organizations found. Create an organization first before registering apps."
        );
      }
      systemOrg = firstOrg;
    }

    // Create the Media Library app record
    const appId = await ctx.db.insert("apps", {
      code: "media-library",
      name: "Media Library",
      description: "Upload, manage, and organize images and files. Used by other apps for media selection.",
      icon: "📁",
      category: "content",
      plans: ["free", "pro", "personal", "business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned",
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);

    console.log("Media Library app registered successfully:", appId);

    return {
      appId,
      message: "Media Library app registered successfully",
      app,
    };
  },
});

/**
 * Register Products app only
 *
 * Simple mutation to register the Products app for event management.
 * No authentication required - this is a one-time setup mutation.
 *
 * @returns App ID if created, or existing app ID if already registered
 */
export const registerProductsApp = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if Products app already exists
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "products"))
      .first();

    if (existing) {
      console.log("Products app already registered:", existing._id);
      return {
        appId: existing._id,
        message: "Products app already registered",
        app: existing,
      };
    }

    // Find or create a system organization to own the app
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    // If no system org exists, just use the first organization
    if (!systemOrg) {
      const firstOrg = await ctx.db.query("organizations").first();
      if (!firstOrg) {
        throw new Error(
          "No organizations found. Create an organization first before registering apps."
        );
      }
      systemOrg = firstOrg;
    }

    // Create the Products app record
    const appId = await ctx.db.insert("apps", {
      code: "products",
      name: "Products",
      description: "Product management for events, tickets, merchandise, and digital goods",
      icon: "🎟️",
      category: "commerce",
      plans: ["pro", "business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned",
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);

    console.log("Products app registered successfully:", appId);

    return {
      appId,
      message: "Products app registered successfully",
      app,
    };
  },
});

/**
 * Register Tickets app only
 *
 * Simple mutation to register the Tickets app for event management.
 * No authentication required - this is a one-time setup mutation.
 *
 * @returns App ID if created, or existing app ID if already registered
 */
export const registerTicketsApp = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if Tickets app already exists
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "tickets"))
      .first();

    if (existing) {
      console.log("Tickets app already registered:", existing._id);
      return {
        appId: existing._id,
        message: "Tickets app already registered",
        app: existing,
      };
    }

    // Find or create a system organization to own the app
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    // If no system org exists, just use the first organization
    if (!systemOrg) {
      const firstOrg = await ctx.db.query("organizations").first();
      if (!firstOrg) {
        throw new Error(
          "No organizations found. Create an organization first before registering apps."
        );
      }
      systemOrg = firstOrg;
    }

    // Create the Tickets app record
    const appId = await ctx.db.insert("apps", {
      code: "tickets",
      name: "Tickets",
      description: "Ticket management for events - issue, track, and validate tickets",
      icon: "🎫",
      category: "commerce",
      plans: ["pro", "business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned",
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);

    console.log("Tickets app registered successfully:", appId);

    return {
      appId,
      message: "Tickets app registered successfully",
      app,
    };
  },
});

/**
 * Register Events app only
 *
 * Simple mutation to register the Events app for event management.
 * No authentication required - this is a one-time setup mutation.
 *
 * @returns App ID if created, or existing app ID if already registered
 */
export const registerEventsApp = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if Events app already exists
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "events"))
      .first();

    if (existing) {
      console.log("Events app already registered:", existing._id);
      return {
        appId: existing._id,
        message: "Events app already registered",
        app: existing,
      };
    }

    // Find or create a system organization to own the app
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    // If no system org exists, just use the first organization
    if (!systemOrg) {
      const firstOrg = await ctx.db.query("organizations").first();
      if (!firstOrg) {
        throw new Error(
          "No organizations found. Create an organization first before registering apps."
        );
      }
      systemOrg = firstOrg;
    }

    // Create the Events app record
    const appId = await ctx.db.insert("apps", {
      code: "events",
      name: "Events",
      description: "Event management - create, organize, and manage events, conferences, and meetups",
      icon: "📅",
      category: "commerce",
      plans: ["pro", "business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned",
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);

    console.log("Events app registered successfully:", appId);

    return {
      appId,
      message: "Events app registered successfully",
      app,
    };
  },
});

/**
 * Register Checkout app only
 *
 * Simple mutation to register the Checkout app for payment processing.
 * No authentication required - this is a one-time setup mutation.
 *
 * @returns App ID if created, or existing app ID if already registered
 */
export const registerCheckoutApp = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if Checkout app already exists
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "checkout"))
      .first();

    if (existing) {
      console.log("Checkout app already registered:", existing._id);
      return {
        appId: existing._id,
        message: "Checkout app already registered",
        app: existing,
      };
    }

    // Find or create a system organization to own the app
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    // If no system org exists, just use the first organization
    if (!systemOrg) {
      const firstOrg = await ctx.db.query("organizations").first();
      if (!firstOrg) {
        throw new Error(
          "No organizations found. Create an organization first before registering apps."
        );
      }
      systemOrg = firstOrg;
    }

    // Create the Checkout app record
    const appId = await ctx.db.insert("apps", {
      code: "checkout",
      name: "Checkout",
      description: "Create and manage checkout pages for products, tickets, and services with Stripe integration",
      icon: "🛒",
      category: "commerce",
      plans: ["pro", "business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned",
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);

    console.log("Checkout app registered successfully:", appId);

    return {
      appId,
      message: "Checkout app registered successfully",
      app,
    };
  },
});

/**
 * Register Forms app only
 *
 * Simple mutation to register the Forms app for creating registration forms, surveys, and applications.
 * No authentication required - this is a one-time setup mutation.
 *
 * @returns App ID if created, or existing app ID if already registered
 */
export const registerFormsApp = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if Forms app already exists
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "forms"))
      .first();

    if (existing) {
      console.log("Forms app already registered:", existing._id);
      return {
        appId: existing._id,
        message: "Forms app already registered",
        app: existing,
      };
    }

    // Find or create a system organization to own the app
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    // If no system org exists, just use the first organization
    if (!systemOrg) {
      const firstOrg = await ctx.db.query("organizations").first();
      if (!firstOrg) {
        throw new Error(
          "No organizations found. Create an organization first before registering apps."
        );
      }
      systemOrg = firstOrg;
    }

    // Create the Forms app record
    const appId = await ctx.db.insert("apps", {
      code: "forms",
      name: "Forms",
      description: "Create dynamic forms for event registrations, surveys, and applications with conditional logic and pricing",
      icon: "📋",
      category: "commerce",
      plans: ["pro", "business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned",
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);

    console.log("Forms app registered successfully:", appId);

    return {
      appId,
      message: "Forms app registered successfully",
      app,
    };
  },
});

/**
 * Register CRM app only
 *
 * Simple mutation to register the CRM app for customer relationship management.
 * No authentication required - this is a one-time setup mutation.
 *
 * @returns App ID if created, or existing app ID if already registered
 */
export const registerCRMApp = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if CRM app already exists
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "crm"))
      .first();

    if (existing) {
      console.log("CRM app already registered:", existing._id);
      return {
        appId: existing._id,
        message: "CRM app already registered",
        app: existing,
      };
    }

    // Find or create a system organization to own the app
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    // If no system org exists, just use the first organization
    if (!systemOrg) {
      const firstOrg = await ctx.db.query("organizations").first();
      if (!firstOrg) {
        throw new Error(
          "No organizations found. Create an organization first before registering apps."
        );
      }
      systemOrg = firstOrg;
    }

    // Create the CRM app record
    const appId = await ctx.db.insert("apps", {
      code: "crm",
      name: "CRM",
      description: "Customer relationship management - manage contacts, organizations, and B2B/B2C relationships",
      icon: "👥",
      category: "business",
      plans: ["pro", "business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned",
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);

    console.log("CRM app registered successfully:", appId);

    return {
      appId,
      message: "CRM app registered successfully",
      app,
    };
  },
});

/**
 * Register Invoicing app only
 *
 * Simple mutation to register the Invoicing app for B2B/B2C invoice management.
 * No authentication required - this is a one-time setup mutation.
 *
 * @returns App ID if created, or existing app ID if already registered
 */
export const registerInvoicingApp = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if Invoicing app already exists
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "app_invoicing"))
      .first();

    if (existing) {
      console.log("Invoicing app already registered:", existing._id);
      return {
        appId: existing._id,
        message: "Invoicing app already registered",
        app: existing,
      };
    }

    // Find or create a system organization to own the app
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    // If no system org exists, just use the first organization
    if (!systemOrg) {
      const firstOrg = await ctx.db.query("organizations").first();
      if (!firstOrg) {
        throw new Error(
          "No organizations found. Create an organization first before registering apps."
        );
      }
      systemOrg = firstOrg;
    }

    // Create the Invoicing app record
    const appId = await ctx.db.insert("apps", {
      code: "app_invoicing",
      name: "B2B/B2C Invoicing",
      description: "Comprehensive invoicing system with B2B consolidation, payment tracking, and automated billing workflows",
      icon: "🧾",
      category: "finance",
      plans: ["business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned",
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);

    console.log("Invoicing app registered successfully:", appId);

    return {
      appId,
      message: "Invoicing app registered successfully",
      app,
    };
  },
});

/**
 * Register Workflows app only
 *
 * Simple mutation to register the Workflows app for multi-object behavior orchestration.
 * No authentication required - this is a one-time setup mutation.
 *
 * @returns App ID if created, or existing app ID if already registered
 */
export const registerWorkflowsApp = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if Workflows app already exists
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "workflows"))
      .first();

    if (existing) {
      console.log("Workflows app already registered:", existing._id);
      return {
        appId: existing._id,
        message: "Workflows app already registered",
        app: existing,
      };
    }

    // Find or create a system organization to own the app
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    // If no system org exists, just use the first organization
    if (!systemOrg) {
      const firstOrg = await ctx.db.query("organizations").first();
      if (!firstOrg) {
        throw new Error(
          "No organizations found. Create an organization first before registering apps."
        );
      }
      systemOrg = firstOrg;
    }

    // Create the Workflows app record
    const appId = await ctx.db.insert("apps", {
      code: "workflows",
      name: "Workflows",
      description: "Visual workflow builder for orchestrating multi-object behaviors and automation",
      icon: "⚡",
      category: "business",
      plans: ["business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned",
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);

    console.log("Workflows app registered successfully:", appId);

    return {
      appId,
      message: "Workflows app registered successfully",
      app,
    };
  },
});

/**
 * Register Certificates app only
 *
 * Simple mutation to register the Certificates app for professional credentials and CME tracking.
 * No authentication required - this is a one-time setup mutation.
 *
 * @returns App ID if created, or existing app ID if already registered
 */
export const registerCertificatesApp = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if Certificates app already exists
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "certificates"))
      .first();

    if (existing) {
      console.log("Certificates app already registered:", existing._id);
      return {
        appId: existing._id,
        message: "Certificates app already registered",
        app: existing,
      };
    }

    // Find or create a system organization to own the app
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    // If no system org exists, just use the first organization
    if (!systemOrg) {
      const firstOrg = await ctx.db.query("organizations").first();
      if (!firstOrg) {
        throw new Error(
          "No organizations found. Create an organization first before registering apps."
        );
      }
      systemOrg = firstOrg;
    }

    // Create the Certificates app record
    const appId = await ctx.db.insert("apps", {
      code: "certificates",
      name: "Certificates",
      description: "Issue and manage professional certificates for CME, CLE, CPE, and other continuing education credits",
      icon: "📜",
      category: "business",
      plans: ["pro", "business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned",
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);

    console.log("Certificates app registered successfully:", appId);

    return {
      appId,
      message: "Certificates app registered successfully",
      app,
    };
  },
});

/**
 * Register Compliance app only
 *
 * Simple mutation to register the Compliance app for converting legal markdown documents to PDFs.
 * No authentication required - this is a one-time setup mutation.
 *
 * @returns App ID if created, or existing app ID if already registered
 */
export const registerComplianceApp = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if Compliance app already exists
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "compliance"))
      .first();

    if (existing) {
      console.log("Compliance app already registered:", existing._id);
      return {
        appId: existing._id,
        message: "Compliance app already registered",
        app: existing,
      };
    }

    // Find or create a system organization to own the app
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    // If no system org exists, just use the first organization
    if (!systemOrg) {
      const firstOrg = await ctx.db.query("organizations").first();
      if (!firstOrg) {
        throw new Error(
          "No organizations found. Create an organization first before registering apps."
        );
      }
      systemOrg = firstOrg;
    }

    // Create the Compliance app record
    const appId = await ctx.db.insert("apps", {
      code: "compliance",
      name: "Compliance",
      description: "GDPR compliance tools: data export, account deletion, and document conversion",
      icon: "🛡️",
      category: "administration",
      // Account deletion is a GDPR right - available to ALL tiers
      // Other features (PDF conversion) may be tier-gated in the UI
      plans: ["free", "starter", "pro", "personal", "business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned",
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);

    console.log("Compliance app registered successfully:", appId);

    return {
      appId,
      message: "Compliance app registered successfully",
      app,
    };
  },
});

/**
 * Register Templates app only
 *
 * Simple mutation to register the Templates app for managing email and PDF templates.
 * No authentication required - this is a one-time setup mutation.
 *
 * @returns App ID if created, or existing app ID if already registered
 */
export const registerTemplatesApp = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if Templates app already exists
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "templates"))
      .first();

    if (existing) {
      console.log("Templates app already registered:", existing._id);
      return {
        appId: existing._id,
        message: "Templates app already registered",
        app: existing,
      };
    }

    // Find or create a system organization to own the app
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    // If no system org exists, just use the first organization
    if (!systemOrg) {
      const firstOrg = await ctx.db.query("organizations").first();
      if (!firstOrg) {
        throw new Error(
          "No organizations found. Create an organization first before registering apps."
        );
      }
      systemOrg = firstOrg;
    }

    // Create the Templates app record
    const appId = await ctx.db.insert("apps", {
      code: "templates",
      name: "Templates",
      description: "Manage email and PDF templates for events, tickets, invoices, and marketing",
      icon: "📄",
      category: "content",
      plans: ["pro", "business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned",
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);

    console.log("Templates app registered successfully:", appId);

    return {
      appId,
      message: "Templates app registered successfully",
      app,
    };
  },
});

/**
 * Register Projects app only
 *
 * Simple mutation to register the Projects app for project management.
 * No authentication required - this is a one-time setup mutation.
 *
 * @returns App ID if created, or existing app ID if already registered
 */
export const registerProjectsApp = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if Projects app already exists
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "projects"))
      .first();

    if (existing) {
      console.log("Projects app already registered:", existing._id);
      return {
        appId: existing._id,
        message: "Projects app already registered",
        app: existing,
      };
    }

    // Find or create a system organization to own the app
    let systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    // If no system org exists, just use the first organization
    if (!systemOrg) {
      const firstOrg = await ctx.db.query("organizations").first();
      if (!firstOrg) {
        throw new Error(
          "No organizations found. Create an organization first before registering apps."
        );
      }
      systemOrg = firstOrg;
    }

    // Create the Projects app record
    const appId = await ctx.db.insert("apps", {
      code: "projects",
      name: "Projects",
      description: "Project management - track client projects, internal initiatives, campaigns, and tasks",
      icon: "💼",
      category: "business",
      plans: ["pro", "business", "enterprise"],
      creatorOrgId: systemOrg._id,
      dataScope: "installer-owned",
      status: "active",
      version: "1.0.0",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const app = await ctx.db.get(appId);

    console.log("Projects app registered successfully:", appId);

    return {
      appId,
      message: "Projects app registered successfully",
      app,
    };
  },
});

/**
 * Enable all system apps for an organization
 *
 * Convenience function to enable Payments and Web Publishing for a specific org.
 *
 * @param sessionId - Super admin session
 * @param organizationId - Organization to enable apps for
 * @returns Array of created availability record IDs
 */
export const enableAllAppsForOrg = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { sessionId, organizationId }) => {
    const { userId } = await requireAuthenticatedUser(ctx, sessionId);
    const userContext = await getUserContext(ctx, userId);

    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Super admin access required");
    }

    // Get all active apps
    const apps = await ctx.db
      .query("apps")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const results = [];

    for (const app of apps) {
      // Check if availability already exists
      const existing = await ctx.db
        .query("appAvailabilities")
        .withIndex("by_org_app", (q) =>
          q.eq("organizationId", organizationId).eq("appId", app._id)
        )
        .first();

      if (existing) {
        // Update to available if not already
        if (!existing.isAvailable) {
          await ctx.db.patch(existing._id, {
            isAvailable: true,
            approvedBy: userId,
            approvedAt: Date.now(),
          });
        }
        results.push(existing._id);
      } else {
        // Create new availability record
        const id = await ctx.db.insert("appAvailabilities", {
          appId: app._id,
          organizationId,
          isAvailable: true,
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
 * Backfill missing app availabilities for an organization
 *
 * This function ensures an organization has appAvailabilities for ALL active apps.
 * Useful for:
 * - Organizations created before new apps were added
 * - After account restoration
 * - Fixing missing app visibility issues
 *
 * @param sessionId - User session (org owner or super admin)
 * @param organizationId - Organization to backfill
 * @returns Object with added count and existing count
 */
export const backfillAppAvailabilities = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { sessionId, organizationId }) => {
    const { userId } = await requireAuthenticatedUser(ctx, sessionId);
    const userContext = await getUserContext(ctx, userId, organizationId);

    // Allow super admins or org owners
    if (!userContext.isGlobal && userContext.roleName !== "org_owner" && userContext.roleName !== "super_admin") {
      throw new Error("Permission denied: requires org owner or super admin access");
    }

    // Get all active and approved apps
    const activeApps = await ctx.db
      .query("apps")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "approved")
        )
      )
      .collect();

    let addedCount = 0;
    let existingCount = 0;

    for (const app of activeApps) {
      // Check if availability already exists
      const existingAvailability = await ctx.db
        .query("appAvailabilities")
        .withIndex("by_org_app", (q) =>
          q.eq("organizationId", organizationId).eq("appId", app._id)
        )
        .first();

      if (existingAvailability) {
        existingCount++;
        // Ensure it's enabled if it exists but was disabled
        if (!existingAvailability.isAvailable) {
          await ctx.db.patch(existingAvailability._id, {
            isAvailable: true,
            approvedBy: userId,
            approvedAt: Date.now(),
          });
          console.log(`[Backfill] Re-enabled app ${app.code} for org ${organizationId}`);
        }
      } else {
        // Create new appAvailability
        await ctx.db.insert("appAvailabilities", {
          appId: app._id,
          organizationId,
          isAvailable: true,
          approvedBy: userId,
          approvedAt: Date.now(),
        });
        addedCount++;
        console.log(`[Backfill] Added app ${app.code} for org ${organizationId}`);
      }

      // Also ensure appInstallation exists
      const existingInstallation = await ctx.db
        .query("appInstallations")
        .withIndex("by_org_and_app", (q) =>
          q.eq("organizationId", organizationId).eq("appId", app._id)
        )
        .first();

      if (!existingInstallation) {
        await ctx.db.insert("appInstallations", {
          organizationId,
          appId: app._id,
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
        console.log(`[Backfill] Created installation for app ${app.code}`);
      } else if (existingInstallation.status !== "active") {
        // Reactivate if suspended
        await ctx.db.patch(existingInstallation._id, {
          status: "active",
          isVisible: true,
          updatedAt: Date.now(),
        });
        console.log(`[Backfill] Reactivated installation for app ${app.code}`);
      }
    }

    console.log(`[Backfill] Complete for org ${organizationId}: ${addedCount} added, ${existingCount} existing`);

    return {
      success: true,
      addedCount,
      existingCount,
      totalApps: activeApps.length,
    };
  },
});

/**
 * Update existing Compliance app to include all tiers
 *
 * Migration function to update the Compliance app's plans field
 * to include all tiers (GDPR requirement - account deletion must be accessible to all).
 */
export const updateComplianceAppPlans = mutation({
  args: {},
  handler: async (ctx) => {
    const complianceApp = await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", "compliance"))
      .first();

    if (!complianceApp) {
      console.log("[Migration] Compliance app not found - will be created with correct plans on next seed");
      return { success: false, message: "Compliance app not found" };
    }

    // Update to include all tiers
    await ctx.db.patch(complianceApp._id, {
      plans: ["free", "starter", "pro", "personal", "business", "enterprise"],
      description: "GDPR compliance tools: data export, account deletion, and document conversion",
      icon: "🛡️",
      updatedAt: Date.now(),
    });

    console.log("[Migration] Updated Compliance app to include all tiers");
    return { success: true, message: "Compliance app updated to include all tiers" };
  },
});
