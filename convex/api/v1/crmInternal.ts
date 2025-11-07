/**
 * API V1: CRM INTERNAL HANDLERS
 *
 * Internal query/mutation handlers for CRM API endpoints.
 * These are called by the HTTP action handlers in crm.ts.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

/**
 * CREATE CONTACT FROM EVENT (INTERNAL)
 *
 * Creates a CRM contact from an event registration.
 * If eventId is not provided, creates a new event object first.
 * Handles deduplication by email.
 */
export const createContactFromEventInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    eventId: v.optional(v.string()),
    eventName: v.string(),
    eventDate: v.optional(v.number()),
    attendeeInfo: v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      company: v.optional(v.string()),
      tags: v.optional(v.array(v.string())), // Custom tags from frontend
    }),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Get or create event
    let eventObjectId: Id<"objects">;

    if (args.eventId) {
      // Event ID provided - try to verify it exists
      try {
        const existingEvent = await ctx.db.get(args.eventId as Id<"objects">);
        if (!existingEvent || existingEvent.organizationId !== args.organizationId) {
          throw new Error("Event not found or access denied");
        }
        eventObjectId = args.eventId as Id<"objects">;
      } catch (error) {
        // Invalid ID format or event not found - create new event instead
        console.warn("Invalid eventId format or event not found, creating new event:", error);
        eventObjectId = await ctx.db.insert("objects", {
          organizationId: args.organizationId,
          type: "event",
          subtype: "external",
          name: args.eventName,
          description: "Event registration from external API",
          status: "published",
          customProperties: {
            startDate: args.eventDate || Date.now(),
            externalSource: true,
          },
          createdBy: args.performedBy,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    } else {
      // Create new event object
      eventObjectId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "event",
        subtype: "external", // External event from API
        name: args.eventName,
        description: "Event registration from external API",
        status: "published",
        customProperties: {
          startDate: args.eventDate || Date.now(),
          externalSource: true,
        },
        createdBy: args.performedBy,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // 2. Check if contact already exists by email (deduplication)
    const existingContacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    const existingContact = existingContacts.find(
      (c) => c.customProperties?.email === args.attendeeInfo.email
    );

    let contactId: Id<"objects">;
    let isNewContact = true;

    if (existingContact) {
      // Contact exists - just link to event
      contactId = existingContact._id;
      isNewContact = false;

      // Update contact's last activity
      await ctx.db.patch(existingContact._id, {
        updatedAt: Date.now(),
      });
    } else {
      // Create new contact as "lead"
      contactId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "crm_contact",
        subtype: "lead",
        name: `${args.attendeeInfo.firstName} ${args.attendeeInfo.lastName}`,
        description: "Contact from event registration (API)",
        status: "active",
        customProperties: {
          firstName: args.attendeeInfo.firstName,
          lastName: args.attendeeInfo.lastName,
          email: args.attendeeInfo.email,
          phone: args.attendeeInfo.phone,
          company: args.attendeeInfo.company,
          source: "api",
          sourceRef: eventObjectId,
          tags: args.attendeeInfo.tags || [], // Use tags from request, default to empty array
          createdFromEvent: true,
        },
        createdBy: args.performedBy,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Log contact creation
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: contactId,
        actionType: "created_from_event",
        actionData: {
          eventId: eventObjectId,
          eventName: args.eventName,
          source: "api",
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    // 3. Link contact to event (create or update link)
    const existingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) =>
        q.eq("fromObjectId", contactId)
      )
      .collect();

    const existingLink = existingLinks.find(
      (link) => link.toObjectId === eventObjectId
    );

    if (!existingLink) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: contactId,
        toObjectId: eventObjectId,
        linkType: "registered_for",
        properties: {
          registeredAt: Date.now(),
          source: "api",
        },
        createdBy: args.performedBy,
        createdAt: Date.now(),
      });

      // Log link creation
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: contactId,
        actionType: "linked_to_event",
        actionData: {
          eventId: eventObjectId,
          eventName: args.eventName,
          source: "api",
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return {
      contactId,
      eventId: eventObjectId,
      organizationId: args.organizationId,
      isNewContact,
    };
  },
});

/**
 * CREATE CONTACT (INTERNAL)
 *
 * Creates a generic CRM contact.
 * Handles deduplication by email.
 */
export const createContactInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    source: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    customFields: v.optional(v.any()),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Check if contact already exists by email (deduplication)
    const existingContacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    const existingContact = existingContacts.find(
      (c) => c.customProperties?.email === args.email
    );

    if (existingContact) {
      throw new Error("Contact with this email already exists");
    }

    // 2. Create new contact
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
        company: args.company,
        jobTitle: args.jobTitle,
        source: args.source || "api",
        sourceRef: args.sourceRef,
        tags: args.tags || ["api-created"],
        notes: args.notes,
        ...args.customFields,
      },
      createdBy: args.performedBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 3. Log creation action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: contactId,
      actionType: "created",
      actionData: {
        source: args.source || "api",
        subtype: args.subtype,
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return contactId;
  },
});

/**
 * LIST CONTACTS (INTERNAL)
 *
 * Lists CRM contacts with filtering and pagination.
 */
export const listContactsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
    source: v.optional(v.string()),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Query all contacts for organization
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      );

    const allContacts = await query.collect();

    // 2. Apply filters
    let filteredContacts = allContacts;

    if (args.subtype) {
      filteredContacts = filteredContacts.filter(
        (c) => c.subtype === args.subtype
      );
    }

    if (args.status) {
      filteredContacts = filteredContacts.filter(
        (c) => c.status === args.status
      );
    }

    if (args.source) {
      filteredContacts = filteredContacts.filter(
        (c) => c.customProperties?.source === args.source
      );
    }

    // 3. Sort by creation date (newest first)
    filteredContacts.sort((a, b) => b.createdAt - a.createdAt);

    // 4. Apply pagination
    const total = filteredContacts.length;
    const paginatedContacts = filteredContacts.slice(
      args.offset,
      args.offset + args.limit
    );

    // 5. Format response
    const contacts = paginatedContacts.map((contact) => ({
      id: contact._id,
      organizationId: contact.organizationId,
      name: contact.name,
      firstName: contact.customProperties?.firstName,
      lastName: contact.customProperties?.lastName,
      email: contact.customProperties?.email,
      phone: contact.customProperties?.phone,
      company: contact.customProperties?.company,
      jobTitle: contact.customProperties?.jobTitle,
      subtype: contact.subtype,
      status: contact.status,
      source: contact.customProperties?.source,
      tags: contact.customProperties?.tags || [],
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    }));

    return {
      contacts,
      total,
      limit: args.limit,
      offset: args.offset,
    };
  },
});

/**
 * GET CONTACT (INTERNAL)
 *
 * Gets a specific CRM contact by ID.
 */
export const getContactInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    contactId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get contact
    const contact = await ctx.db.get(args.contactId as Id<"objects">);

    if (!contact) {
      return null;
    }

    // 2. Verify organization access
    if (contact.organizationId !== args.organizationId) {
      return null;
    }

    // 3. Verify it's a CRM contact
    if (contact.type !== "crm_contact") {
      return null;
    }

    // 4. Format response
    return {
      id: contact._id,
      organizationId: contact.organizationId,
      name: contact.name,
      firstName: contact.customProperties?.firstName,
      lastName: contact.customProperties?.lastName,
      email: contact.customProperties?.email,
      phone: contact.customProperties?.phone,
      company: contact.customProperties?.company,
      jobTitle: contact.customProperties?.jobTitle,
      subtype: contact.subtype,
      status: contact.status,
      source: contact.customProperties?.source,
      sourceRef: contact.customProperties?.sourceRef,
      tags: contact.customProperties?.tags || [],
      notes: contact.customProperties?.notes,
      customFields: contact.customProperties,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  },
});
