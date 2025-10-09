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

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
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
