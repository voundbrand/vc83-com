/**
 * Internal Tool Mutations & Queries
 *
 * These are internal wrappers around ontology mutations that don't require sessionId.
 * They're called from AI tool actions which are already authenticated at the action level.
 */

import { internalMutation, internalQuery } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Get user by ID (for email sending and other operations)
 */
export const getUserById = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Get organization by ID
 */
export const getOrganizationById = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.organizationId);
  },
});

/**
 * Internal: Create Contact
 * Bypasses session auth since we're in an authenticated action context
 */
export const internalCreateContact = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    subtype: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Direct creation without session check (already authenticated in action)
    const now = Date.now();
    const contactId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "crm_contact",
      subtype: args.subtype,
      name: `${args.firstName} ${args.lastName}`,
      description: args.jobTitle || "Contact",
      status: "active",
      createdAt: now,
      updatedAt: now,
      createdBy: args.userId,
      customProperties: {
        firstName: args.firstName,
        lastName: args.lastName,
        email: args.email,
        phone: args.phone,
        jobTitle: args.jobTitle,
        company: args.company,
        tags: args.tags || [],
        notes: "",
        customFields: {},
      },
    });

    return contactId;
  },
});

/**
 * Internal: Create Event
 */
export const internalCreateEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    subtype: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    location: v.string(),
    capacity: v.optional(v.number()),
    timezone: v.optional(v.string()),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Validate dates
    if (args.endDate < args.startDate) {
      throw new Error("End date must be after start date");
    }

    // Validate minimum duration (15 minutes)
    const durationMs = args.endDate - args.startDate;
    if (durationMs < 15 * 60 * 1000) {
      throw new Error("Event must be at least 15 minutes long");
    }

    // Generate slug
    const slug = args.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const customProperties = {
      slug,
      startDate: args.startDate,
      endDate: args.endDate,
      location: args.location,
      timezone: args.timezone || "America/Los_Angeles",
      agenda: [],
      maxCapacity: args.capacity || null,
    };

    const now = Date.now();
    const eventId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "event",
      subtype: args.subtype,
      name: args.name,
      description: args.description || "",
      status: args.published === false ? "draft" : "active", // Default to active (published)
      createdAt: now,
      updatedAt: now,
      createdBy: args.userId,
      customProperties,
    });

    return eventId;
  },
});

/**
 * Internal: Create Form
 */
export const internalCreateForm = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    subtype: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    fields: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const formId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "form",
      subtype: args.subtype,
      name: args.name,
      description: args.description || "",
      status: "draft",
      createdAt: now,
      updatedAt: now,
      createdBy: args.userId,
      customProperties: {
        formSchema: {
          version: "1.0",
          fields: args.fields || [],
          settings: {
            allowMultipleSubmissions: false,
            showProgressBar: true,
            submitButtonText: "Submit",
            successMessage: "Thank you for your submission!",
          },
          sections: [],
        },
        stats: {
          views: 0,
          submissions: 0,
          completionRate: 0,
        },
      },
    });

    return formId;
  },
});

/**
 * Internal: Create Product
 */
export const internalCreateProduct = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    subtype: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    currency: v.optional(v.string()),
    inventory: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const customProperties = {
      price: args.price,
      currency: args.currency || "USD",
      inventory: args.inventory ?? null,
      sold: 0,
    };

    const now = Date.now();
    const productId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "product",
      subtype: args.subtype,
      name: args.name,
      description: args.description || "",
      status: "draft",
      createdAt: now,
      updatedAt: now,
      createdBy: args.userId,
      customProperties,
    });

    return productId;
  },
});
