import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * App Store schemas - registry, installations, snapshots, purchases, and availability
 * Powers the multi-tenant app marketplace functionality
 */

/**
 * Apps Registry
 * Central catalog of all available apps
 */
export const apps = defineTable({
  // Basic info
  code: v.string(), // Unique identifier (e.g., "app_podcast")
  name: v.string(),
  description: v.string(),
  icon: v.optional(v.string()),
  
  // Categorization
  category: v.union(
    v.literal("content"),
    v.literal("analytics"),
    v.literal("marketing"),
    v.literal("collaboration"),
    v.literal("finance"),
    v.literal("administration"),
    v.literal("commerce"),
    v.literal("business")
  ),
  
  // Availability
  plans: v.array(v.union(
    v.literal("free"),
    v.literal("starter"),
    v.literal("pro"),
    v.literal("professional"),
    v.literal("personal"),
    v.literal("business"),
    v.literal("agency"),
    v.literal("enterprise")
  )),
  
  // Creator/Owner organization
  creatorOrgId: v.id("organizations"),
  
  // Data scope hint (helps determine install behavior)
  dataScope: v.union(
    v.literal("org-owned"),      // Creator org owns all data (podcast episodes)
    v.literal("installer-owned"), // Each installing org has isolated data (analytics, CRM)
    v.literal("none")            // No persistent data (client-side only)
  ),
  
  // Approval status (for marketplace apps)
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("rejected"),
    v.literal("active")  // For system/built-in apps
  ),
  
  // Pricing
  price: v.optional(v.number()),
  priceCurrency: v.optional(v.string()),
  billingType: v.optional(v.union(
    v.literal("one-time"),
    v.literal("subscription")
  )),
  stripeProductId: v.optional(v.string()),
  stripePriceId: v.optional(v.string()),
  
  // Metadata
  version: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_code", ["code"])
  .index("by_category", ["category"])
  .index("by_creator", ["creatorOrgId"])
  .index("by_status", ["status"])
  .index("by_dataScope", ["dataScope"]);

/**
 * App Installations
 * Lightweight join table: which orgs installed which apps
 */
export const appInstallations = defineTable({
  organizationId: v.id("organizations"),
  appId: v.id("apps"),
  
  // Status
  status: v.union(
    v.literal("active"),
    v.literal("suspended"),
    v.literal("uninstalled")
  ),
  
  // Permissions (what the installing org can do)
  permissions: v.object({
    read: v.boolean(),
    write: v.boolean(),
    admin: v.optional(v.boolean()),
  }),
  
  // Light config (for simple customization without full instances)
  config: v.optional(v.object({
    apiKey: v.optional(v.string()),
    theme: v.optional(v.string()),
    // Add more as needed per app
  })),
  
  // Visibility
  isVisible: v.boolean(),
  
  // Usage tracking
  lastUsedAt: v.optional(v.number()),
  usageCount: v.number(),
  
  // Metadata
  installedAt: v.number(),
  installedBy: v.id("users"),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_app", ["appId"])
  .index("by_org_and_app", ["organizationId", "appId"])
  .index("by_org_and_status", ["organizationId", "status"])
  .index("by_org_visible", ["organizationId", "isVisible"]);

/**
 * Snapshot Templates
 * Reusable templates for apps (config + optional seed data)
 */
export const snapshots = defineTable({
  appId: v.id("apps"),
  creatorOrgId: v.id("organizations"),
  
  // Template name and description
  name: v.string(),
  description: v.optional(v.string()),
  
  // Configuration JSON (app-specific settings)
  config: v.any(), // Flexible object for app-specific config
  
  // Optional seed data (sample records for first-time users)
  seedData: v.optional(v.array(v.object({
    table: v.string(), // e.g., "clients", "invoices"
    data: v.any(),     // Sample row data
  }))),
  
  // Declares which tables this snapshot uses
  declaredTables: v.array(v.string()), // e.g., ["episodes", "guests", "comments"]
  
  // Version control
  version: v.string(),
  isActive: v.boolean(),
  
  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
  createdBy: v.id("users"),
})
  .index("by_app", ["appId"])
  .index("by_creator", ["creatorOrgId"])
  .index("by_version", ["appId", "version"]);

/**
 * Snapshot Loads
 * Per-org instances of snapshot templates
 * Created when an org installs an app that uses snapshots
 */
export const snapshotLoads = defineTable({
  // Links
  installationId: v.id("appInstallations"),
  snapshotTemplateId: v.id("snapshots"),
  organizationId: v.id("organizations"),
  
  // Forked configuration (copy of template config + org overrides)
  loadedConfig: v.any(),
  
  // Org-specific overrides (merged with loadedConfig)
  customOverrides: v.optional(v.any()),
  
  // Status
  isActive: v.boolean(),
  
  // Metadata
  loadedAt: v.number(),
  loadedBy: v.id("users"),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_installation", ["installationId"])
  .index("by_template", ["snapshotTemplateId"])
  .index("by_org_and_template", ["organizationId", "snapshotTemplateId"]);

/**
 * Purchases
 * Payment records for paid apps
 */
export const purchases = defineTable({
  userId: v.id("users"),
  organizationId: v.id("organizations"),
  appId: v.id("apps"),

  // Payment details
  stripePaymentIntentId: v.string(),
  stripeCustomerId: v.optional(v.string()),
  stripeSubscriptionId: v.optional(v.string()),

  // Amount
  amount: v.number(),
  currency: v.string(),

  // Status
  status: v.union(
    v.literal("pending"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("refunded")
  ),

  // Subscription details
  billingPeriodStart: v.optional(v.number()),
  billingPeriodEnd: v.optional(v.number()),

  // Metadata
  purchasedAt: v.number(),
  confirmedAt: v.optional(v.number()),
  refundedAt: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_organization", ["organizationId"])
  .index("by_app", ["appId"])
  .index("by_stripe_payment", ["stripePaymentIntentId"])
  .index("by_stripe_subscription", ["stripeSubscriptionId"])
  .index("by_status", ["status"]);

/**
 * App Availabilities
 * Controls which apps are visible/accessible to specific organizations
 * Super admin managed - enables/disables apps per org
 */
export const appAvailabilities = defineTable({
  appId: v.id("apps"),
  organizationId: v.id("organizations"),

  // Availability toggle
  isAvailable: v.boolean(),

  // Audit trail
  approvedBy: v.id("users"),
  approvedAt: v.number(),
})
  .index("by_org", ["organizationId"])
  .index("by_app", ["appId"])
  .index("by_org_app", ["organizationId", "appId"]);
