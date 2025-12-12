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
 *
 * ADDRESS SUPPORT:
 * - Support multiple addresses per contact/organization
 * - Address types: billing, shipping, mailing, physical, warehouse, other
 * - One primary address per type
 * - Backward compatible with single address field
 */

import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";
import { checkResourceLimit } from "./licensing/helpers";
import { internal } from "./_generated/api";

// ============================================================================
// ADDRESS VALIDATORS
// ============================================================================

/**
 * Address type enum
 */
export const addressTypes = ["billing", "shipping", "mailing", "physical", "warehouse", "other"] as const;

/**
 * Single address validator
 */
export const addressValidator = v.object({
  type: v.union(
    v.literal("billing"),
    v.literal("shipping"),
    v.literal("mailing"),
    v.literal("physical"),
    v.literal("warehouse"),
    v.literal("other")
  ),
  isPrimary: v.boolean(),
  label: v.optional(v.string()), // e.g., "Corporate HQ", "Warehouse 1"
  street: v.optional(v.string()),
  street2: v.optional(v.string()), // Additional address line
  city: v.optional(v.string()),
  state: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  country: v.optional(v.string()),
});

/**
 * Addresses array validator
 */
export const addressesValidator = v.array(addressValidator);

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
 * INTERNAL: Get CRM Contact by ID
 * Used by internal systems (e.g., PDF generation) to fetch contact data
 */
export const getContactInternal = internalQuery({
  args: {
    contactId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);

    if (!contact || contact.type !== "crm_contact") {
      return null;
    }

    return contact;
  },
});

/**
 * CREATE CONTACT
 * Create a new CRM contact
 *
 * NOTE: When implementing bulk contact import/export features, add:
 * - checkFeatureAccess(ctx, organizationId, "contactImportExportEnabled")
 * This requires Starter+ tier.
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
    // BACKWARD COMPATIBLE: Support old single address field
    address: v.optional(v.object({
      street: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      postalCode: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
    // NEW: Support multiple addresses
    addresses: v.optional(addressesValidator),
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

    // CHECK LICENSE LIMIT: Enforce contact limit for organization's tier
    // Free: 100, Starter: 1,000, Pro: 5,000, Agency: 10,000, Enterprise: Unlimited
    await checkResourceLimit(ctx, args.organizationId, "crm_contact", "maxContacts");

    // Handle addresses: convert old address format to new format if needed
    let addresses = args.addresses;
    if (!addresses && args.address) {
      // Backward compatibility: convert single address to addresses array
      addresses = [{
        type: "mailing" as const,
        isPrimary: true,
        label: "Primary Address",
        ...args.address,
      }];
    }

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
        // Keep old address for backward compatibility
        address: args.address,
        // Add new addresses array
        addresses: addresses,
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
      // BACKWARD COMPATIBLE: Support old single address field
      address: v.optional(v.any()),
      // NEW: Support multiple addresses
      addresses: v.optional(addressesValidator),
      status: v.optional(v.string()),
      subtype: v.optional(v.string()), // Lifecycle stage: "lead" | "prospect" | "customer" | "partner"
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
      subtype: args.updates.subtype || contact.subtype, // Update lifecycle stage
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
 * Permanently delete a contact and all associated links
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

    // Log deletion action BEFORE deleting (so we have the data)
    await ctx.db.insert("objectActions", {
      organizationId: contact.organizationId,
      objectId: args.contactId,
      actionType: "deleted",
      actionData: {
        contactName: contact.name,
        email: contact.customProperties?.email,
        deletedBy: session.userId,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    // Delete all links involving this contact
    const linksFrom = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.contactId))
      .collect();

    const linksTo = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.contactId))
      .collect();

    // Delete all links
    for (const link of [...linksFrom, ...linksTo]) {
      await ctx.db.delete(link._id);
    }

    // Permanently delete the contact
    await ctx.db.delete(args.contactId);
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
 * GET PUBLIC CRM ORGANIZATION BILLING INFO
 * Public query for checkout - returns limited billing information only
 * Used during checkout to pre-fill employer billing addresses
 */
export const getPublicCrmOrganizationBilling = query({
  args: {
    crmOrganizationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.crmOrganizationId);

    if (!org || org.type !== "crm_organization") {
      return null;
    }

    // Return only public billing information (no sensitive data)
    return {
      _id: org._id,
      name: org.name,
      customProperties: {
        address: (org.customProperties as { address?: unknown })?.address,
        taxId: (org.customProperties as { taxId?: unknown })?.taxId,
        vatNumber: (org.customProperties as { vatNumber?: unknown })?.vatNumber,
        billingEmail: (org.customProperties as { billingEmail?: unknown })?.billingEmail,
        billingContact: (org.customProperties as { billingContact?: unknown })?.billingContact,
        billingAddress: (org.customProperties as { billingAddress?: unknown })?.billingAddress,
        phone: (org.customProperties as { phone?: unknown })?.phone,
        website: (org.customProperties as { website?: unknown })?.website,
      },
    };
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
    subtype: v.string(), // "customer" | "prospect" | "partner" | "sponsor"
    name: v.string(),
    website: v.optional(v.string()),
    industry: v.optional(v.string()),
    size: v.optional(v.string()), // "1-10" | "11-50" | "51-200" | "201-500" | "501+"
    // BACKWARD COMPATIBLE: Support old single address field
    address: v.optional(v.object({
      street: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      postalCode: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
    // NEW: Support multiple addresses
    addresses: v.optional(addressesValidator),
    // Basic contact info
    taxId: v.optional(v.string()),
    billingEmail: v.optional(v.string()),
    phone: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    // B2B Billing fields (DEPRECATED - use addresses array with type="billing")
    billingAddress: v.optional(v.object({
      street: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      postalCode: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
    legalEntityType: v.optional(v.string()), // "corporation", "llc", "partnership", "sole_proprietorship", "nonprofit"
    registrationNumber: v.optional(v.string()), // Company registration number
    vatNumber: v.optional(v.string()), // VAT/GST number
    taxExempt: v.optional(v.boolean()),
    paymentTerms: v.optional(v.string()), // "due_on_receipt", "net15", "net30", "net60", "net90"
    creditLimit: v.optional(v.number()),
    preferredPaymentMethod: v.optional(v.string()), // "invoice", "bank_transfer", "credit_card", "check"
    accountingReference: v.optional(v.string()), // External accounting system reference
    costCenter: v.optional(v.string()),
    purchaseOrderRequired: v.optional(v.boolean()),
    billingContact: v.optional(v.string()), // Name of billing contact
    billingContactEmail: v.optional(v.string()),
    billingContactPhone: v.optional(v.string()),
    customFields: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // CHECK LICENSE LIMIT: Enforce CRM organization limit for organization's tier
    // Free: 10, Starter: 50, Pro: 200, Agency: 500, Enterprise: Unlimited
    await checkResourceLimit(ctx, args.organizationId, "crm_organization", "maxOrganizations");

    // Handle addresses: convert old address/billingAddress format to new format if needed
    let addresses = args.addresses;
    if (!addresses) {
      addresses = [];
      // Convert old address field to mailing address
      if (args.address) {
        addresses.push({
          type: "mailing" as const,
          isPrimary: true,
          label: "Primary Address",
          ...args.address,
        });
      }
      // Convert old billingAddress field to billing address
      if (args.billingAddress) {
        addresses.push({
          type: "billing" as const,
          isPrimary: true,
          label: "Billing Address",
          ...args.billingAddress,
        });
      }
    }

    const orgId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "crm_organization",
      subtype: args.subtype,
      name: args.name,
      description: `${args.industry || "Company"} organization`,
      status: "active",
      customProperties: {
        // Basic info
        website: args.website,
        industry: args.industry,
        size: args.size,
        // Keep old fields for backward compatibility
        address: args.address,
        billingAddress: args.billingAddress,
        // Add new addresses array
        addresses: addresses,
        phone: args.phone,
        tags: args.tags || [],
        notes: args.notes,
        // Basic billing
        taxId: args.taxId,
        billingEmail: args.billingEmail,
        // B2B Billing
        legalEntityType: args.legalEntityType,
        registrationNumber: args.registrationNumber,
        vatNumber: args.vatNumber,
        taxExempt: args.taxExempt || false,
        paymentTerms: args.paymentTerms || "net30",
        creditLimit: args.creditLimit,
        preferredPaymentMethod: args.preferredPaymentMethod,
        accountingReference: args.accountingReference,
        costCenter: args.costCenter,
        purchaseOrderRequired: args.purchaseOrderRequired || false,
        billingContact: args.billingContact,
        billingContactEmail: args.billingContactEmail,
        billingContactPhone: args.billingContactPhone,
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
 * Update an existing CRM organization (including subtype/org type)
 */
export const updateCrmOrganization = mutation({
  args: {
    sessionId: v.string(),
    crmOrganizationId: v.id("objects"),
    updates: v.object({
      name: v.optional(v.string()),
      subtype: v.optional(v.string()), // "customer" | "prospect" | "partner" | "sponsor"
      website: v.optional(v.string()),
      industry: v.optional(v.string()),
      size: v.optional(v.string()),
      // BACKWARD COMPATIBLE: Support old single address field
      address: v.optional(v.any()),
      // NEW: Support multiple addresses
      addresses: v.optional(addressesValidator),
      phone: v.optional(v.string()),
      status: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      notes: v.optional(v.string()),
      // Basic billing
      taxId: v.optional(v.string()),
      billingEmail: v.optional(v.string()),
      // B2B Billing fields (DEPRECATED - use addresses array)
      billingAddress: v.optional(v.any()),
      legalEntityType: v.optional(v.string()),
      registrationNumber: v.optional(v.string()),
      vatNumber: v.optional(v.string()),
      taxExempt: v.optional(v.boolean()),
      paymentTerms: v.optional(v.string()),
      creditLimit: v.optional(v.number()),
      preferredPaymentMethod: v.optional(v.string()),
      accountingReference: v.optional(v.string()),
      costCenter: v.optional(v.string()),
      purchaseOrderRequired: v.optional(v.boolean()),
      billingContact: v.optional(v.string()),
      billingContactEmail: v.optional(v.string()),
      billingContactPhone: v.optional(v.string()),
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
      subtype: args.updates.subtype || org.subtype,
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

/**
 * DELETE CRM ORGANIZATION
 * Permanently delete a CRM organization and all associated links
 */
export const deleteCrmOrganization = mutation({
  args: {
    sessionId: v.string(),
    crmOrganizationId: v.id("objects"),
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

    // Log deletion action BEFORE deleting (so we have the data)
    await ctx.db.insert("objectActions", {
      organizationId: org.organizationId,
      objectId: args.crmOrganizationId,
      actionType: "deleted",
      actionData: {
        organizationName: org.name,
        deletedBy: session.userId,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    // Delete all links involving this organization
    const linksFrom = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.crmOrganizationId))
      .collect();

    const linksTo = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.crmOrganizationId))
      .collect();

    // Delete all links
    for (const link of [...linksFrom, ...linksTo]) {
      await ctx.db.delete(link._id);
    }

    // Permanently delete the organization
    await ctx.db.delete(args.crmOrganizationId);
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

// ============================================================================
// PORTAL INVITATION CONVENIENCE METHODS
// ============================================================================

/**
 * INVITE CONTACT TO PORTAL
 *
 * Convenience method to invite a CRM contact to an external portal.
 * Wrapper around portalInvitations.createPortalInvitation.
 *
 * Example:
 * - Invite freelancer to project portal
 * - Invite client to dashboard
 * - Invite vendor to supplier portal
 */
export const inviteContactToPortal = mutation({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
    portalType: v.union(
      v.literal("freelancer_portal"),
      v.literal("client_portal"),
      v.literal("vendor_portal"),
      v.literal("custom_portal")
    ),
    portalUrl: v.string(),
    authMethod: v.optional(v.union(
      v.literal("oauth"),
      v.literal("magic_link"),
      v.literal("both")
    )),
    expiresInDays: v.optional(v.number()),
    customMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Get contact to verify it exists and get organizationId
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.type !== "crm_contact") {
      throw new Error("Contact not found");
    }

    // Generate unique invitation token
    const invitationToken = crypto.randomUUID();

    // Calculate expiration
    const expiresInMs = (args.expiresInDays || 7) * 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + expiresInMs;

    const contactEmail = contact.customProperties?.email as string;
    if (!contactEmail) {
      throw new Error("Contact must have an email address");
    }

    // Create portal_invitation object
    const invitationId = await ctx.db.insert("objects", {
      organizationId: contact.organizationId,
      type: "portal_invitation",
      subtype: args.portalType,
      name: `Portal Invitation - ${contact.name}`,
      description: `Invitation to ${args.portalType} for ${contact.name}`,
      status: "pending",
      customProperties: {
        contactId: args.contactId,
        contactEmail: contactEmail,
        portalType: args.portalType,
        portalUrl: args.portalUrl,
        authMethod: args.authMethod || "both",
        invitationToken: invitationToken,
        expiresAt: expiresAt,
        customMessage: args.customMessage,
        permissions: [],
        sentAt: Date.now(),
        acceptedAt: null,
        lastAccessedAt: null,
        accessCount: 0,
      },
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link invitation to contact
    await ctx.db.insert("objectLinks", {
      organizationId: contact.organizationId,
      fromObjectId: invitationId,
      toObjectId: args.contactId,
      linkType: "invites",
      properties: {
        portalType: args.portalType,
        invitedAt: Date.now(),
      },
      createdBy: session.userId,
      createdAt: Date.now(),
    });

    // Schedule invitation email
    await ctx.scheduler.runAfter(0, internal.portalInvitations.sendInvitationEmail, {
      invitationId,
      contactEmail,
      portalUrl: args.portalUrl,
      authMethod: args.authMethod || "both",
      invitationToken,
      customMessage: args.customMessage,
      organizationId: contact.organizationId,
    });

    return {
      invitationId,
      invitationToken,
      expiresAt,
    };
  },
});

/**
 * GET CONTACT PORTAL ACCESS
 *
 * Returns all portal invitations for a contact (active, pending, expired).
 */
export const getContactPortalAccess = query({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all portal invitations linked to this contact
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.contactId))
      .filter((q) => q.eq(q.field("linkType"), "invites"))
      .collect();

    // Fetch invitation objects
    const invitations = await Promise.all(
      links.map(async (link) => {
        const invitation = await ctx.db.get(link.fromObjectId);
        if (invitation && invitation.type === "portal_invitation") {
          return {
            ...invitation,
            linkId: link._id,
          };
        }
        return null;
      })
    );

    return invitations.filter((inv) => inv !== null);
  },
});
