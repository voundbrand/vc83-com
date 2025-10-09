/**
 * ONTOLOGY SCHEMAS
 *
 * Universal object storage system for ALL data types.
 * This replaces separate tables with a unified object model.
 *
 * Core Concepts:
 * - objects: Universal storage for any entity (translations, events, contacts, etc.)
 * - objectLinks: Relationships between objects (like graph edges)
 * - objectActions: Audit trail of actions performed on objects
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * OBJECTS TABLE
 * Universal storage for all entity types
 *
 * Examples:
 * - type="translation", subtype="system", name="desktop.welcome"
 * - type="event", subtype="podcast", name="Episode 42"
 * - type="invoice", subtype="client", name="INV-2024-001"
 * - type="contact", subtype="customer", name="John Doe"
 */
export const objects = defineTable({
  // Multi-tenancy
  organizationId: v.id("organizations"),

  // Object Identity
  type: v.string(),              // "translation", "event", "invoice", "contact", etc.
  subtype: v.optional(v.string()), // "system", "app", "content", etc.

  // Universal Properties (ALL objects have these)
  name: v.string(),              // Human-readable identifier
  description: v.optional(v.string()),
  status: v.string(),            // Object-specific statuses

  // Translation-Specific Fields (only used when type="translation")
  locale: v.optional(v.string()),     // "en", "de", "pl"
  value: v.optional(v.string()),      // Translation text

  // Gravel Road - Per-Org/Per-Type Customizations
  // This allows each organization to add their own fields without schema changes
  customProperties: v.optional(v.record(v.string(), v.any())),

  // Metadata
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  // Core indexes for fast queries
  .index("by_org", ["organizationId"])
  .index("by_org_type", ["organizationId", "type"])
  .index("by_org_type_subtype", ["organizationId", "type", "subtype"])
  .index("by_type", ["type"])
  .index("by_type_subtype", ["type", "subtype"])
  .index("by_status", ["status"])

  // Translation-specific indexes
  .index("by_org_type_locale", ["organizationId", "type", "locale"])
  .index("by_type_locale", ["type", "locale"])

  // Search indexes
  .searchIndex("search_by_name", { searchField: "name" })
  .searchIndex("search_by_value", { searchField: "value" });

/**
 * OBJECT LINKS TABLE
 * Relationships between objects (graph edges)
 *
 * Examples:
 * - fromObjectId=translation1, toObjectId=event1, linkType="translates"
 * - fromObjectId=user1, toObjectId=org1, linkType="member_of"
 * - fromObjectId=org1, toObjectId=address1, linkType="has_address"
 * - fromObjectId=contact1, toObjectId=event1, linkType="registers_for"
 */
export const objectLinks = defineTable({
  organizationId: v.id("organizations"),

  // Link Endpoints
  fromObjectId: v.id("objects"),
  toObjectId: v.id("objects"),

  // Link Type (the "verb" in the relationship)
  linkType: v.string(), // "translates", "member_of", "has_address", "registers_for", etc.

  // Link-Specific Data
  // Store additional metadata about the relationship
  properties: v.optional(v.record(v.string(), v.any())),

  // Metadata
  createdBy: v.optional(v.id("users")),
  createdAt: v.number(),
})
  .index("by_from_object", ["fromObjectId"])
  .index("by_to_object", ["toObjectId"])
  .index("by_org_link_type", ["organizationId", "linkType"])
  .index("by_from_link_type", ["fromObjectId", "linkType"])
  .index("by_to_link_type", ["toObjectId", "linkType"]);

/**
 * OBJECT ACTIONS TABLE
 * Audit trail of actions performed on objects
 *
 * Examples:
 * - objectId=translation1, actionType="approve", performedBy=user1
 * - objectId=event1, actionType="publish", performedBy=user2
 * - objectId=invoice1, actionType="send", performedBy=user3
 */
export const objectActions = defineTable({
  organizationId: v.id("organizations"),
  objectId: v.id("objects"),

  // Action Identity
  actionType: v.string(), // "approve", "translate", "publish", "view", "edit", etc.

  // Action Data
  // Store details about what changed
  actionData: v.optional(v.record(v.string(), v.any())),

  // Who & When
  performedBy: v.id("users"),
  performedAt: v.number(),
})
  .index("by_object", ["objectId"])
  .index("by_org_action_type", ["organizationId", "actionType"])
  .index("by_performer", ["performedBy"])
  .index("by_performed_at", ["performedAt"]);
