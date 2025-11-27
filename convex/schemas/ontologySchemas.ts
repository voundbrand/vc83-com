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
 * - type="transaction", subtype="ticket_purchase", name="Product - Customer"
 *
 * TRANSACTION OBJECT STRUCTURE:
 * Transactions (type="transaction") store purchase data in customProperties.
 *
 * NEW STRUCTURE (v2 - Multi-line Item Transactions):
 * One transaction per checkout with multiple line items:
 * {
 *   checkoutSessionId: Id<"objects">,
 *   lineItems: [
 *     {
 *       productId: Id<"objects">,
 *       productName: string,
 *       productDescription?: string,
 *       quantity: number,
 *       unitPriceInCents: number,        // Net price per unit
 *       totalPriceInCents: number,       // Net total for this line (unitPrice * quantity)
 *       taxRatePercent: number,
 *       taxAmountInCents: number,
 *       ticketId?: Id<"objects">,        // If this is a ticket product
 *       eventId?: Id<"objects">,
 *       eventName?: string,
 *     },
 *     // ... more line items
 *   ],
 *   subtotalInCents: number,             // Sum of all line item totals (net)
 *   taxAmountInCents: number,            // Sum of all line item taxes
 *   totalInCents: number,                // Grand total (subtotal + tax)
 *   currency: string,
 *   customerName: string,
 *   customerEmail: string,
 *   payerType: "individual" | "organization",
 *   paymentMethod: string,
 *   paymentStatus: string,
 *   invoicingStatus: "pending" | "on_draft_invoice" | "invoiced",
 *   // ... other customer/payer fields
 * }
 *
 * LEGACY STRUCTURE (v1 - Single Product Per Transaction):
 * DEPRECATED: Old approach created one transaction per product.
 * Kept for backward compatibility with existing data.
 * {
 *   productId: Id<"objects">,
 *   productName: string,
 *   quantity: number,
 *   amountInCents: number,               // Total for this ONE product
 *   currency: string,
 *   taxRatePercent: number,
 *   // ... single product fields
 * }
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
  // createdBy can be either platform user (staff) or frontend_user (customer)
  // - Platform user (Id<"users">): When staff creates records administratively
  // - Frontend user (Id<"objects">): When customers create records (guest registration, checkout)
  createdBy: v.optional(v.union(v.id("users"), v.id("objects"))),
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
  .index("by_org_type_locale_name", ["organizationId", "type", "locale", "name"])
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
  // createdBy can be platform user or frontend_user (same as objects table)
  createdBy: v.optional(v.union(v.id("users"), v.id("objects"))),
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
  // performedBy can be platform user or frontend_user (same as objects table)
  performedBy: v.optional(v.union(v.id("users"), v.id("objects"))),
  performedAt: v.number(),
})
  .index("by_object", ["objectId"])
  .index("by_org_action_type", ["organizationId", "actionType"])
  .index("by_performer", ["performedBy"])
  .index("by_performed_at", ["performedAt"]);
