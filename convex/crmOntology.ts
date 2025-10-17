/**
 * CRM ONTOLOGY
 *
 * Manages CRM contacts and organizations for customer relationship management.
 * Uses the universal ontology system (objects table).
 *
 * Object Types:
 * - crm_contact: Individual contacts (customers, leads, prospects)
 * - crm_organization: Companies/organizations (customer companies)
 *
 * Contact Types (subtype):
 * - "customer" - Paying customers
 * - "lead" - Potential customers
 * - "prospect" - Qualified leads
 *
 * Organization Types (subtype):
 * - "customer" - Customer companies
 * - "prospect" - Potential customer companies
 * - "partner" - Partner organizations
 *
 * Status Workflow:
 * - "active" - Active contact/org
 * - "inactive" - Temporarily inactive
 * - "unsubscribed" - Opted out (contacts only)
 * - "archived" - Archived/deleted
 *
 * GRAVEL ROAD APPROACH:
 * - Start simple: name, email, phone, basic info
 * - Add fields via customProperties as needed
 * - Use objectLinks for relationships (contact → organization)
 * - Use objectActions for audit trail
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

// ============================================================================
// CRM CONTACT OPERATIONS
// ============================================================================

/**
 * GET CONTACTS
 * Returns all contacts for an organization
 */
export const getContacts = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()), // Filter by contact type
    status: v.optional(v.string()),  // Filter by status
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const q = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      );

    let contacts = await q.collect();

    // Apply filters
    if (args.subtype) {
      contacts = contacts.filter((c) => c.subtype === args.subtype);
    }

    if (args.status) {
      contacts = contacts.filter((c) => c.status === args.status);
    }

    return contacts;
  },
});

/**
 * GET CONTACT
 * Get a single contact by ID
 */
export const getContact = query({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const contact = await ctx.db.get(args.contactId);

    if (!contact || contact.type !== "crm_contact") {
      throw new Error("Contact not found");
    }

    return contact;
  },
});

/**
 * CREATE CONTACT
 * Create a new CRM contact
 */
export const createContact = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.string(), // "customer" | "lead" | "prospect"
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    address: v.optional(v.object({
      street: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      postalCode: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
    source: v.optional(v.string()), // "manual" | "checkout" | "event" | "import"
    sourceRef: v.optional(v.string()), // Reference to source (checkout ID, event ID, etc.)
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    customFields: v.optional(v.any()), // Additional custom fields
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const contactId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "crm_contact",
      subtype: args.subtype,
      name: `${args.firstName} ${args.lastName}`,
      description: args.jobTitle || "Contact",
      status: "active",
      customProperties: {
        firstName: args.firstName,
        lastName: args.lastName,
        email: args.email,
        phone: args.phone,
        jobTitle: args.jobTitle,
        company: args.company,
        address: args.address,
        source: args.source || "manual",
        sourceRef: args.sourceRef,
        tags: args.tags || [],
        notes: args.notes,
        ...args.customFields,
      },
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log creation action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: contactId,
      actionType: "created",
      actionData: {
        source: args.source || "manual",
        subtype: args.subtype,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return contactId;
  },
});

/**
 * UPDATE CONTACT
 * Update an existing contact
 */
export const updateContact = mutation({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
    updates: v.object({
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      jobTitle: v.optional(v.string()),
      company: v.optional(v.string()),
      address: v.optional(v.any()),
      status: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      notes: v.optional(v.string()),
      customFields: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.type !== "crm_contact") {
      throw new Error("Contact not found");
    }

    // Update name if first/last name changed
    let newName = contact.name;
    if (args.updates.firstName || args.updates.lastName) {
      const firstName = args.updates.firstName || contact.customProperties?.firstName;
      const lastName = args.updates.lastName || contact.customProperties?.lastName;
      newName = `${firstName} ${lastName}`;
    }

    await ctx.db.patch(args.contactId, {
      name: newName,
      status: args.updates.status || contact.status,
      customProperties: {
        ...contact.customProperties,
        ...args.updates,
        ...args.updates.customFields,
      },
      updatedAt: Date.now(),
    });

    // Log update action
    await ctx.db.insert("objectActions", {
      organizationId: contact.organizationId,
      objectId: args.contactId,
      actionType: "updated",
      actionData: {
        updatedFields: Object.keys(args.updates),
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

/**
 * DELETE CONTACT
 * Delete a contact (soft delete - sets status to archived)
 */
export const deleteContact = mutation({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.type !== "crm_contact") {
      throw new Error("Contact not found");
    }

    // Soft delete - set status to archived
    await ctx.db.patch(args.contactId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    // Log deletion action
    await ctx.db.insert("objectActions", {
      organizationId: contact.organizationId,
      objectId: args.contactId,
      actionType: "deleted",
      actionData: {},
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

// ============================================================================
// CRM ORGANIZATION OPERATIONS
// ============================================================================

/**
 * GET CRM ORGANIZATIONS
 * Returns all CRM organizations for an organization
 */
export const getCrmOrganizations = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()), // Filter by org type
    status: v.optional(v.string()),  // Filter by status
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const q = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_organization")
      );

    let orgs = await q.collect();

    // Apply filters
    if (args.subtype) {
      orgs = orgs.filter((o) => o.subtype === args.subtype);
    }

    if (args.status) {
      orgs = orgs.filter((o) => o.status === args.status);
    }

    return orgs;
  },
});

/**
 * GET CRM ORGANIZATION
 * Get a single CRM organization by ID
 */
export const getCrmOrganization = query({
  args: {
    sessionId: v.string(),
    crmOrganizationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const org = await ctx.db.get(args.crmOrganizationId);

    if (!org || org.type !== "crm_organization") {
      throw new Error("CRM organization not found");
    }

    return org;
  },
});

/**
 * CREATE CRM ORGANIZATION
 * Create a new CRM organization
 */
export const createCrmOrganization = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.string(), // "customer" | "prospect" | "partner"
    name: v.string(),
    website: v.optional(v.string()),
    industry: v.optional(v.string()),
    size: v.optional(v.string()), // "1-10" | "11-50" | "51-200" | "201-500" | "501+"
    address: v.optional(v.object({
      street: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      postalCode: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
    taxId: v.optional(v.string()),
    billingEmail: v.optional(v.string()),
    phone: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    customFields: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const orgId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "crm_organization",
      subtype: args.subtype,
      name: args.name,
      description: `${args.industry || "Company"} organization`,
      status: "active",
      customProperties: {
        website: args.website,
        industry: args.industry,
        size: args.size,
        address: args.address,
        taxId: args.taxId,
        billingEmail: args.billingEmail,
        phone: args.phone,
        tags: args.tags || [],
        notes: args.notes,
        ...args.customFields,
      },
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log creation action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: orgId,
      actionType: "created",
      actionData: {
        subtype: args.subtype,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return orgId;
  },
});

/**
 * UPDATE CRM ORGANIZATION
 * Update an existing CRM organization
 */
export const updateCrmOrganization = mutation({
  args: {
    sessionId: v.string(),
    crmOrganizationId: v.id("objects"),
    updates: v.object({
      name: v.optional(v.string()),
      website: v.optional(v.string()),
      industry: v.optional(v.string()),
      size: v.optional(v.string()),
      address: v.optional(v.any()),
      taxId: v.optional(v.string()),
      billingEmail: v.optional(v.string()),
      phone: v.optional(v.string()),
      status: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      notes: v.optional(v.string()),
      customFields: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const org = await ctx.db.get(args.crmOrganizationId);
    if (!org || org.type !== "crm_organization") {
      throw new Error("CRM organization not found");
    }

    await ctx.db.patch(args.crmOrganizationId, {
      name: args.updates.name || org.name,
      status: args.updates.status || org.status,
      customProperties: {
        ...org.customProperties,
        ...args.updates,
        ...args.updates.customFields,
      },
      updatedAt: Date.now(),
    });

    // Log update action
    await ctx.db.insert("objectActions", {
      organizationId: org.organizationId,
      objectId: args.crmOrganizationId,
      actionType: "updated",
      actionData: {
        updatedFields: Object.keys(args.updates),
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

// ============================================================================
// RELATIONSHIP OPERATIONS
// ============================================================================

/**
 * LINK CONTACT TO ORGANIZATION
 * Create a relationship between a contact and a CRM organization
 */
export const linkContactToOrganization = mutation({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
    crmOrganizationId: v.id("objects"),
    jobTitle: v.optional(v.string()),
    isPrimaryContact: v.optional(v.boolean()),
    department: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Validate objects exist
    const contact = await ctx.db.get(args.contactId);
    const org = await ctx.db.get(args.crmOrganizationId);

    if (!contact || contact.type !== "crm_contact") {
      throw new Error("Invalid contact");
    }

    if (!org || org.type !== "crm_organization") {
      throw new Error("Invalid CRM organization");
    }

    // Create link
    const linkId = await ctx.db.insert("objectLinks", {
      organizationId: contact.organizationId,
      fromObjectId: args.contactId,
      toObjectId: args.crmOrganizationId,
      linkType: "works_at",
      properties: {
        jobTitle: args.jobTitle,
        isPrimaryContact: args.isPrimaryContact ?? false,
        department: args.department,
      },
      createdBy: session.userId,
      createdAt: Date.now(),
    });

    return linkId;
  },
});

/**
 * GET ORGANIZATION CONTACTS
 * Get all contacts for a CRM organization
 */
export const getOrganizationContacts = query({
  args: {
    sessionId: v.string(),
    crmOrganizationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all links where toObjectId = organization
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.crmOrganizationId))
      .collect();

    const worksAtLinks = links.filter((l) => l.linkType === "works_at");

    // Get contact objects
    const contacts = await Promise.all(
      worksAtLinks.map(async (link) => {
        const contact = await ctx.db.get(link.fromObjectId);
        return {
          ...contact,
          relationship: link.properties,
          linkId: link._id,
        };
      })
    );

    return contacts;
  },
});

/**
 * GET CONTACT ORGANIZATIONS
 * Get all organizations for a contact
 */
export const getContactOrganizations = query({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all links where fromObjectId = contact
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.contactId))
      .collect();

    const worksAtLinks = links.filter((l) => l.linkType === "works_at");

    // Get organization objects
    const organizations = await Promise.all(
      worksAtLinks.map(async (link) => {
        const org = await ctx.db.get(link.toObjectId);
        return {
          ...org,
          relationship: link.properties,
          linkId: link._id,
        };
      })
    );

    return organizations;
  },
});
