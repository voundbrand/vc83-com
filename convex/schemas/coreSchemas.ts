import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Core platform schemas - users, organizations, memberships
 * These are the foundation of the multi-tenant system
 */

export const users = defineTable({
  // Personal info
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  email: v.string(),

  // Organization association
  defaultOrgId: v.optional(v.id("organizations")),

  // Role-based access control
  global_role_id: v.optional(v.id("roles")), // Global super admin bypass role

  // User preferences
  preferredLanguage: v.optional(v.string()),
  timezone: v.optional(v.string()),

  // Password and invitation fields (for bcrypt implementation)
  isPasswordSet: v.optional(v.boolean()), // false for new invites
  invitedBy: v.optional(v.id("users")),
  invitedAt: v.optional(v.number()),

  // Account deletion (grace period)
  scheduledDeletionDate: v.optional(v.number()), // 2-week grace period before permanent deletion

  // Metadata
  isActive: v.optional(v.boolean()),
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
})
  .index("email", ["email"])
  .index("by_default_org", ["defaultOrgId"])
  .searchIndex("search_by_name", {
    searchField: "firstName",
  });

export const organizations = defineTable({
  // Core multi-tenancy (ONLY the essentials!)
  name: v.string(),                    // Display name
  slug: v.string(),                    // URL-friendly identifier
  businessName: v.string(),            // Legal business name

  // Plan & status
  plan: v.union(
    v.literal("free"),
    v.literal("pro"),
    v.literal("personal"),
    v.literal("business"),
    v.literal("enterprise")
  ),
  isPersonalWorkspace: v.boolean(),
  isActive: v.boolean(),

  // Stripe Customer ID (for platform billing only - NOT Connect)
  // This is for when L4YERCAK3 charges the organization for subscriptions/usage
  stripeCustomerId: v.optional(v.string()),           // Stripe customer ID (cus_...)

  // Multi-Provider Payment Integration
  paymentProviders: v.optional(v.array(v.object({
    providerCode: v.string(),           // e.g., "stripe-connect", "paypal", "square"
    accountId: v.string(),              // Provider-specific account ID
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("restricted"),
      v.literal("disabled")
    ),
    isDefault: v.boolean(),             // Is this the default provider?
    isTestMode: v.boolean(),            // Test mode (can be toggled even in production)
    connectedAt: v.number(),            // When account was connected
    lastStatusCheck: v.optional(v.number()), // Last time status was refreshed
    metadata: v.optional(v.any()),      // Provider-specific metadata (e.g., chargesEnabled, payoutsEnabled)
  }))),

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
  email: v.optional(v.string()),        // Organization contact email
})
  .index("by_slug", ["slug"])
  .searchIndex("search_by_name", {
    searchField: "name",
  });

// ❌ REMOVED (moved to ontology):
// - industry, foundedYear, employeeCount → organization_profile object
// - taxId, vatNumber, etc. → organization_legal object
// - contactEmail, billingEmail, etc. → organization_contact object
// - socialMedia, bio → organization_social object
// - settings → organization_settings objects
// - Legacy address fields → address objects

export const organizationMembers = defineTable({
  userId: v.id("users"),
  organizationId: v.id("organizations"),

  // Role-based access - FK to roles table for dynamic role assignment
  role: v.id("roles"),

  // Status
  isActive: v.boolean(),
  joinedAt: v.number(),

  // Metadata
  invitedBy: v.optional(v.id("users")),
  invitedAt: v.optional(v.number()),
  acceptedAt: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_organization", ["organizationId"])
  .index("by_user_and_org", ["userId", "organizationId"])
  .index("by_org_and_role", ["organizationId", "role"]);

// Simple auth tables for demo
export const userPasswords = defineTable({
  userId: v.id("users"),
  passwordHash: v.string(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"]);

export const sessions = defineTable({
  userId: v.id("users"),
  email: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
})
  .index("by_user", ["userId"]);

// API Keys - Enterprise API authentication
export const apiKeys = defineTable({
  // Key format: org_{organizationId}_{random32chars}
  key: v.string(),                    // Full API key
  name: v.string(),                   // Human-readable name ("Medical Network Integration")

  // Ownership
  organizationId: v.id("organizations"),
  createdBy: v.id("users"),           // User who generated the key

  // Status
  status: v.union(
    v.literal("active"),
    v.literal("revoked")
  ),

  // Usage tracking
  lastUsed: v.optional(v.number()),
  requestCount: v.optional(v.number()), // Total requests made with this key

  // Revocation
  revokedAt: v.optional(v.number()),
  revokedBy: v.optional(v.id("users")),
  revokeReason: v.optional(v.string()),

  // Metadata
  createdAt: v.number(),
})
  .index("by_key", ["key"])                    // Fast lookup for API authentication
  .index("by_organization", ["organizationId"]) // List organization's keys
  .index("by_organization_status", ["organizationId", "status"]) // Active keys only
  .index("by_status", ["status"]);             // All active keys

// Role-Based Access Control (RBAC) Tables
export const roles = defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_name", ["name"]);

export const permissions = defineTable({
  name: v.string(),
  resource: v.string(), // e.g., "users", "organizations", "system"
  action: v.string(), // e.g., "read", "write", "delete", "manage"
  description: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_name", ["name"])
  .index("by_resource", ["resource"])
  .index("by_resource_action", ["resource", "action"]);

export const rolePermissions = defineTable({
  roleId: v.id("roles"),
  permissionId: v.id("permissions"),
  createdAt: v.number(),
})
  .index("by_role", ["roleId"])
  .index("by_permission", ["permissionId"])
  .index("by_role_permission", ["roleId", "permissionId"]);

// ❌ organizationAddresses TABLE REMOVED
// Organization addresses are now stored as objects in the ontology system
// See organizationOntology.ts for address management helpers

// User Preferences - UI settings that sync across devices
export const userPreferences = defineTable({
  userId: v.id("users"),

  // UI Preferences
  themeId: v.string(), // "win95-light", "win95-dark", etc.
  windowStyle: v.string(), // "windows" or "mac"

  // Region Preferences
  language: v.optional(v.string()), // ISO 639-1 language code: "en", "de", "pl", "es", "fr", "ja"

  // Future preferences (easy to extend)
  // timezone: v.optional(v.string()),
  // dateFormat: v.optional(v.string()),
  // timeFormat: v.optional(v.string()),
  // fontSize: v.optional(v.string()),
  // notificationsEnabled: v.optional(v.boolean()),

  // Metadata
  updatedAt: v.number(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"]);

// Organization Media - File storage for images, documents, etc.
export const organizationMedia = defineTable({
  // Ownership
  organizationId: v.id("organizations"),
  uploadedBy: v.id("users"),

  // Convex Storage
  storageId: v.id("_storage"), // Convex file storage ID

  // File metadata
  filename: v.string(),
  mimeType: v.string(),
  sizeBytes: v.number(),

  // Optional: Image-specific metadata
  width: v.optional(v.number()),
  height: v.optional(v.number()),

  // Usage tracking
  usageCount: v.optional(v.number()), // How many templates use this
  lastUsedAt: v.optional(v.number()),

  // Organization & categorization
  category: v.optional(v.union(
    v.literal("template"), // Used in web templates
    v.literal("logo"),     // Organization logo
    v.literal("avatar"),   // User avatars
    v.literal("general")   // General media
  )),
  tags: v.optional(v.array(v.string())), // For searching
  description: v.optional(v.string()),

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_organization_and_category", ["organizationId", "category"])
  .index("by_storage_id", ["storageId"])
  .index("by_uploaded_by", ["uploadedBy"]);
