import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const DEFAULT_APPS = [
  {
    code: "app_podcasting",
    name: "Podcasting",
    description: "Manage your own podcast episodes, guests, and releases",
    icon: "📻",
    category: "content",
    plans: ["personal", "business", "enterprise"],
    creatorOrgId: "PLACEHOLDER_VC83_ORG_ID" as unknown as Id<"organizations">, // Will be replaced by seedApps
    dataScope: "installer-owned", // Full CRUD for org-owned workflows
    status: "active" as const,
    price: undefined, // Free app
    priceCurrency: undefined,
    billingType: undefined,
    stripeProductId: undefined,
    stripePriceId: undefined,
    version: "1.0.0",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    code: "about",
    name: "About",
    description: "Information about your organization",
    icon: "ℹ️",
    category: "content",
    plans: ["personal", "business", "enterprise"],
    creatorOrgId: "PLACEHOLDER_VC83_ORG_ID" as unknown as Id<"organizations">,
    dataScope: "none", // Client-side only, no persistent data
    status: "active" as const,
    price: undefined, // Free app
    priceCurrency: undefined,
    billingType: undefined,
    stripeProductId: undefined,
    stripePriceId: undefined,
    version: "1.0.0",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    code: "contact",
    name: "Contact",
    description: "Contact form and organization information",
    icon: "📧",
    category: "content",
    plans: ["personal", "business", "enterprise"],
    creatorOrgId: "PLACEHOLDER_VC83_ORG_ID" as unknown as Id<"organizations">,
    dataScope: "none", // Client-side only, no persistent data
    status: "active" as const,
    price: undefined, // Free app
    priceCurrency: undefined,
    billingType: undefined,
    stripeProductId: undefined,
    stripePriceId: undefined,
    version: "1.0.0",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    code: "app_invoice",
    name: "Invoicing",
    description: "Create and manage invoices for your clients",
    icon: "💰",
    category: "finance",
    plans: ["personal", "business", "enterprise"],
    creatorOrgId: "PLACEHOLDER_VC83_ORG_ID" as unknown as Id<"organizations">,
    dataScope: "installer-owned", // Org-owned invoicing workflows
    status: "active" as const,
    price: undefined, // Free app for MVP
    priceCurrency: undefined,
    billingType: undefined,
    stripeProductId: undefined,
    stripePriceId: undefined,
    version: "1.0.0",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    code: "analytics",
    name: "Analytics",
    description: "Track performance metrics and insights",
    icon: "📊",
    category: "analytics",
    plans: ["business", "enterprise"],
    creatorOrgId: "PLACEHOLDER_VC83_ORG_ID" as unknown as Id<"organizations">,
    dataScope: "installer-owned",
    status: "active" as const,
    price: 999, // $9.99/month
    priceCurrency: "usd",
    billingType: "subscription",
    stripeProductId: undefined, // To be set when Stripe is configured
    stripePriceId: undefined,
    version: "1.0.0",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    code: "subscribers",
    name: "Subscribers",
    description: "Manage email list and subscribers",
    icon: "👥",
    category: "marketing",
    plans: ["business", "enterprise"],
    creatorOrgId: "PLACEHOLDER_VC83_ORG_ID" as unknown as Id<"organizations">,
    dataScope: "installer-owned",
    status: "active" as const,
    price: 1499, // $14.99/month
    priceCurrency: "usd",
    billingType: "subscription",
    stripeProductId: undefined,
    stripePriceId: undefined,
    version: "1.0.0",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    code: "scheduling",
    name: "Scheduling",
    description: "Plan and schedule releases and tasks",
    icon: "📅",
    category: "collaboration",
    plans: ["business", "enterprise"],
    creatorOrgId: "PLACEHOLDER_VC83_ORG_ID" as unknown as Id<"organizations">,
    dataScope: "installer-owned",
    status: "active" as const,
    price: 499, // $4.99/month
    priceCurrency: "usd",
    billingType: "subscription",
    stripeProductId: undefined,
    stripePriceId: undefined,
    version: "1.0.0",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
] as const;

export const seedApps = internalMutation({
  handler: async (ctx) => {
    const existingApps = await ctx.db.query("apps").collect();

    if (existingApps.length === 0) {
      // First, find or create the VC83 system organization
      let vc83Org = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", "vc83-system"))
        .first();

      if (!vc83Org) {
        // Create the VC83 system organization
        const vc83OrgId = await ctx.db.insert("organizations", {
          name: "VC83 System",
          slug: "vc83-system",
          businessName: "Layer Cake Platform",
          plan: "enterprise",
          isPersonalWorkspace: false,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        console.log("Created VC83 system organization:", vc83OrgId);
        vc83Org = await ctx.db.get(vc83OrgId);
      }

      // Now seed apps with the correct creator org ID
      if (vc83Org) {
        for (const app of DEFAULT_APPS) {
          await ctx.db.insert("apps", {
            ...app,
            plans: [...app.plans],
            creatorOrgId: vc83Org._id, // Replace placeholder with actual ID
          });
        }
        console.log(`Seeded ${DEFAULT_APPS.length} apps with VC83 org ID`);
      } else {
        throw new Error("Failed to create or find VC83 system organization");
      }
    } else {
      console.log(`Apps already seeded (${existingApps.length} apps found)`);
    }
  },
});

export const listApps = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("apps")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

export const getAppByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    return await ctx.db
      .query("apps")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
  },
});

export const getAppsByCategory = query({
  args: { 
    category: v.union(
      v.literal("content"),
      v.literal("analytics"),
      v.literal("marketing"),
      v.literal("collaboration"),
      v.literal("finance"),
      v.literal("administration")
    )
  },
  handler: async (ctx, { category }) => {
    return await ctx.db
      .query("apps")
      .withIndex("by_category", (q) => q.eq("category", category))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

export const updateAppCode = internalMutation({
  args: {
    appId: v.id("apps"),
    newCode: v.string(),
  },
  handler: async (ctx, { appId, newCode }) => {
    await ctx.db.patch(appId, { code: newCode, updatedAt: Date.now() });
    return { success: true };
  },
});
