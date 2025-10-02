import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Core platform schemas - users, organizations, memberships
 * These are the foundation of the multi-tenant system
 */

export const users = defineTable({
  // Personal info
  firstName: v.string(),
  lastName: v.optional(v.string()),
  email: v.string(),
  
  // Organization association
  defaultOrgId: v.id("organizations"),
  
  // Verification status
  emailVerified: v.optional(v.boolean()),
  emailVerifiedAt: v.optional(v.number()),
  
  // User preferences
  preferredLanguage: v.optional(v.string()),
  timezone: v.optional(v.string()),
  
  // Metadata
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_email", ["email"])
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
  taxId: v.optional(v.string()),
  street: v.optional(v.string()),
  city: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  country: v.optional(v.string()),
  
  // Contact info
  contactEmail: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  website: v.optional(v.string()),
  
  // About/Bio
  bio: v.optional(v.string()),
  
  // Plan and features
  plan: v.union(
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
  
  // Role-based access
  role: v.union(
    v.literal("owner"),
    v.literal("admin"),
    v.literal("member"),
    v.literal("viewer")
  ),
  
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
