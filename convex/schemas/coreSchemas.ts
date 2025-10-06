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
  // Basic info
  name: v.string(),
  slug: v.string(),

  // Business details
  businessName: v.string(),
  industry: v.optional(v.string()),
  foundedYear: v.optional(v.number()),
  employeeCount: v.optional(v.string()), // "1-10", "11-50", "51-200", etc.
  taxId: v.optional(v.string()),
  vatNumber: v.optional(v.string()), // EU VAT number
  companyRegistrationNumber: v.optional(v.string()),
  legalEntityType: v.optional(v.string()), // LLC, Corp, etc.

  // Legacy address fields (DEPRECATED - use organizationAddresses table instead)
  // Kept for backward compatibility during migration
  street: v.optional(v.string()),
  city: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  country: v.optional(v.string()),

  // Contact info
  contactEmail: v.optional(v.string()),
  billingEmail: v.optional(v.string()),
  supportEmail: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  faxNumber: v.optional(v.string()),
  website: v.optional(v.string()),

  // Social media
  socialMedia: v.optional(v.object({
    linkedin: v.optional(v.string()),
    twitter: v.optional(v.string()),
    facebook: v.optional(v.string()),
    instagram: v.optional(v.string()),
  })),

  // About/Bio
  bio: v.optional(v.string()),

  // Plan and features
  plan: v.union(
    v.literal("free"), // Everyone starts free!
    v.literal("pro"), // Paid plan via Stripe
    v.literal("personal"),
    v.literal("business"),
    v.literal("enterprise")
  ),
  isPersonalWorkspace: v.boolean(),

  // Settings
  settings: v.optional(v.object({
    branding: v.optional(v.object({
      primaryColor: v.optional(v.string()),
      logo: v.optional(v.string()),
    })),
    features: v.optional(v.object({
      customDomain: v.optional(v.boolean()),
      sso: v.optional(v.boolean()),
      apiAccess: v.optional(v.boolean()),
    })),
    locale: v.optional(v.object({
      language: v.optional(v.string()), // en, es, fr, etc.
      currency: v.optional(v.string()), // USD, EUR, GBP, etc.
      timezone: v.optional(v.string()), // America/New_York, etc.
    })),
    invoicing: v.optional(v.object({
      prefix: v.optional(v.string()), // INV-, etc.
      nextNumber: v.optional(v.number()),
      defaultTerms: v.optional(v.string()), // "Net 30", etc.
    })),
  })),

  // Metadata
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_slug", ["slug"])
  .searchIndex("search_by_name", {
    searchField: "name",
  });

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

// Organization Addresses - Multi-address support for organizations
export const organizationAddresses = defineTable({
  organizationId: v.id("organizations"),

  // Address Type
  type: v.union(
    v.literal("billing"),
    v.literal("shipping"),
    v.literal("mailing"),
    v.literal("physical"),
    v.literal("other")
  ),
  label: v.optional(v.string()), // Custom label: "Headquarters", "Warehouse 1", etc.

  // Address Fields
  addressLine1: v.string(),
  addressLine2: v.optional(v.string()),
  city: v.string(),
  state: v.optional(v.string()), // State/Province/Region
  postalCode: v.string(),
  country: v.string(),
  region: v.optional(v.string()), // Geographic region: EU, APAC, Americas, etc.

  // Flags
  isDefault: v.boolean(), // One default per type
  isPrimary: v.boolean(), // Overall primary address for the organization
  isActive: v.boolean(),

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_org_and_type", ["organizationId", "type"])
  .index("by_org_and_default", ["organizationId", "isDefault"])
  .index("by_org_and_primary", ["organizationId", "isPrimary"])
  .index("by_org_and_active", ["organizationId", "isActive"]);
