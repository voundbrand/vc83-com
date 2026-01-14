/**
 * Internal Tool Mutations & Queries
 *
 * These are internal wrappers around ontology mutations that don't require sessionId.
 * They're called from AI tool actions which are already authenticated at the action level.
 */

import { internalMutation, internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";

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
 * Internal: Create Event (legacy - basic event creation)
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
 * Internal: Create Event With Details (enhanced - agenda, tickets, virtual support)
 *
 * Creates an event with full details including:
 * - Agenda/schedule with sessions and speakers
 * - Ticket types (stored in customProperties, can be converted to products later)
 * - Virtual event support
 * - Registration settings
 */
export const internalCreateEventWithDetails = internalMutation({
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
    agenda: v.optional(v.array(v.any())), // Array of agenda items
    ticketTypes: v.optional(v.array(v.any())), // Array of ticket type definitions
    virtualEventUrl: v.optional(v.string()),
    registrationRequired: v.optional(v.boolean()),
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

    const now = Date.now();

    // Determine if this is a virtual event
    const isVirtual = args.location?.toLowerCase().includes("virtual") ||
      args.location?.toLowerCase().includes("online") ||
      !!args.virtualEventUrl;

    // Build customProperties with all event details
    const customProperties: Record<string, unknown> = {
      slug,
      startDate: args.startDate,
      endDate: args.endDate,
      location: args.location,
      timezone: args.timezone || "America/Los_Angeles",
      maxCapacity: args.capacity || null,
      // Agenda with sessions
      agenda: args.agenda || [],
      // Ticket types (can be converted to products later)
      ticketTypes: args.ticketTypes || [],
      // Virtual event settings
      isVirtual,
      virtualEventUrl: args.virtualEventUrl || null,
      // Registration settings
      registrationRequired: args.registrationRequired !== false,
      // Stats
      stats: {
        views: 0,
        registrations: 0,
        checkins: 0,
      },
      // Metadata
      createdVia: "ai_tool",
    };

    // Create the event
    const eventId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "event",
      subtype: args.subtype,
      name: args.name,
      description: args.description || "",
      status: args.published === true ? "published" : "draft", // Default to draft
      createdAt: now,
      updatedAt: now,
      createdBy: args.userId,
      customProperties,
    });

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: eventId,
      actionType: "created",
      performedBy: args.userId,
      performedAt: now,
      actionData: {
        status: args.published === true ? "published" : "draft",
        agendaItemCount: (args.agenda || []).length,
        ticketTypeCount: (args.ticketTypes || []).length,
        isVirtual,
        createdVia: "ai_tool",
      },
    });

    return eventId;
  },
});

/**
 * Internal: Create Form (legacy - minimal fields support)
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
 * Internal: Create Form With Fields (enhanced - full FormSchema support)
 *
 * Creates a form with properly structured sections and fields.
 * Supports all 17 field types with options, validation, and help text.
 */
export const internalCreateFormWithFields = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    subtype: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    fields: v.array(v.any()), // Array of field definitions
    sectionTitle: v.optional(v.string()),
    settings: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Generate unique IDs for fields and convert options to proper format
    const processedFields = args.fields.map((field, index) => {
      const fieldId = `field_${index + 1}_${Date.now()}`;

      // Base field structure
      const processedField: Record<string, unknown> = {
        id: fieldId,
        type: field.type,
        label: field.label,
        required: field.required || false,
      };

      // Add optional properties if provided
      if (field.placeholder) {
        processedField.placeholder = field.placeholder;
      }
      if (field.helpText) {
        processedField.helpText = field.helpText;
      }
      if (field.defaultValue !== undefined) {
        processedField.defaultValue = field.defaultValue;
      }

      // Convert options array of strings to array of {value, label} objects
      if (field.options && Array.isArray(field.options)) {
        processedField.options = field.options.map((opt: string | { value: string; label: string }) => {
          if (typeof opt === "string") {
            // Convert string to proper option format
            const value = opt.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
            return { value, label: opt };
          }
          // Already in correct format
          return opt;
        });
      }

      // Add validation if provided
      if (field.validation) {
        processedField.validation = field.validation;
      }

      // For text_block/description fields, add content
      if (field.content) {
        processedField.content = field.content;
      }
      if (field.formatting) {
        processedField.formatting = field.formatting;
      }

      return processedField;
    });

    // Create the section with all fields
    const section = {
      id: `section_main_${Date.now()}`,
      title: args.sectionTitle || "Form Fields",
      description: "",
      fields: processedFields,
    };

    // Build form settings with defaults
    const formSettings = {
      allowMultipleSubmissions: args.settings?.allowMultipleSubmissions ?? false,
      showProgressBar: args.settings?.showProgressBar ?? true,
      submitButtonText: args.settings?.submitButtonText || "Submit",
      successMessage: args.settings?.successMessage || "Thank you for your submission!",
      redirectUrl: args.settings?.redirectUrl || null,
      requireAuth: args.settings?.requireAuth ?? false,
      saveProgress: args.settings?.saveProgress ?? false,
      displayMode: args.settings?.displayMode || "all",
    };

    // Create the complete FormSchema
    const formSchema = {
      version: "1.0",
      sections: [section],
      settings: formSettings,
    };

    // Insert the form
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
        formSchema,
        stats: {
          views: 0,
          submissions: 0,
          completionRate: 0,
        },
      },
    });

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: formId,
      actionType: "created",
      performedBy: args.userId,
      performedAt: now,
      actionData: {
        status: "draft",
        fieldCount: processedFields.length,
        createdVia: "ai_tool",
      },
    });

    return formId;
  },
});

/**
 * Internal: Create Product (legacy - basic product creation)
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

/**
 * Internal: Create Product With Details (enhanced - tickets, bookables, sale dates)
 *
 * Creates a product with full details including:
 * - Ticket tiers (standard, VIP, early bird)
 * - Event linking
 * - Sale date windows
 * - Bookable settings (for rooms, staff, equipment, etc.)
 * - Tax behavior
 */
export const internalCreateProductWithDetails = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    subtype: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(), // In cents
    currency: v.optional(v.string()),
    inventory: v.optional(v.number()),
    status: v.optional(v.string()),
    // Ticket options
    ticketTier: v.optional(v.string()),
    eventId: v.optional(v.string()),
    salesStart: v.optional(v.union(v.number(), v.null())),
    salesEnd: v.optional(v.union(v.number(), v.null())),
    earlyBirdEndDate: v.optional(v.union(v.number(), v.null())),
    // Bookable options
    bookingSettings: v.optional(v.any()),
    // Tax
    taxBehavior: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Determine if this is a bookable product
    const bookableTypes = ["room", "staff", "equipment", "space", "appointment", "class", "treatment"];
    const isBookable = bookableTypes.includes(args.subtype);

    // Build customProperties with all product details
    const customProperties: Record<string, unknown> = {
      price: args.price,
      currency: args.currency || "EUR",
      inventory: args.inventory ?? null,
      sold: 0,
      // Event linking (also stored here for quick access, objectLinks is source of truth)
      eventId: args.eventId || null,
      // Ticket-specific
      ticketTier: args.ticketTier || null,
      // Sale date windows
      startSaleDateTime: args.salesStart || null,
      endSaleDateTime: args.salesEnd || null,
      earlyBirdEndDate: args.earlyBirdEndDate || null,
      // Tax behavior
      taxBehavior: args.taxBehavior || null,
      // Metadata
      createdVia: "ai_tool",
    };

    // Add bookable settings if this is a bookable product
    if (isBookable && args.bookingSettings) {
      const settings = args.bookingSettings;
      customProperties.bookingMode = "calendar";
      customProperties.minDuration = settings.minDuration || 30;
      customProperties.maxDuration = settings.maxDuration || 480;
      customProperties.durationUnit = settings.durationUnit || "minutes";
      customProperties.slotIncrement = settings.slotIncrement || 30;
      customProperties.bufferBefore = settings.bufferBefore || 0;
      customProperties.bufferAfter = settings.bufferAfter || 0;
      customProperties.capacity = settings.capacity || 1;
      customProperties.confirmationRequired = settings.confirmationRequired ?? false;
      customProperties.pricePerUnit = args.price;
      customProperties.priceUnit = settings.priceUnit || "session";
    }

    // Create the product
    const productId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "product",
      subtype: args.subtype,
      name: args.name,
      description: args.description || "",
      status: args.status || "draft",
      createdAt: now,
      updatedAt: now,
      createdBy: args.userId,
      customProperties,
    });

    // Create event->product link if eventId provided (for tickets)
    if (args.eventId) {
      try {
        // Validate that it's a valid ID format before using
        await ctx.db.insert("objectLinks", {
          organizationId: args.organizationId,
          fromObjectId: args.eventId as unknown as Id<"objects">,
          toObjectId: productId,
          linkType: "offers",
          properties: {
            displayOrder: 0,
            isFeatured: false,
            ticketTier: args.ticketTier || "standard",
          },
          createdAt: now,
        });
      } catch {
        // Event link failed - product still created, just not linked
        console.warn(`Failed to link product ${productId} to event ${args.eventId}`);
      }
    }

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: productId,
      actionType: "created",
      performedBy: args.userId,
      performedAt: now,
      actionData: {
        status: args.status || "draft",
        subtype: args.subtype,
        price: args.price,
        currency: args.currency || "EUR",
        ticketTier: args.ticketTier || null,
        eventId: args.eventId || null,
        isBookable,
        createdVia: "ai_tool",
      },
    });

    return productId;
  },
});

/**
 * Internal: Activate Product
 * Changes product status from draft to active (available for sale)
 */
export const internalActivateProduct = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    productId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.type !== "product" || product.organizationId !== args.organizationId) {
      throw new Error("Product not found");
    }

    const previousStatus = product.status;

    await ctx.db.patch(args.productId, {
      status: "active",
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.productId,
      actionType: "activated",
      performedBy: args.userId,
      performedAt: Date.now(),
      actionData: {
        previousStatus,
        newStatus: "active",
        source: "ai_assistant",
      },
    });

    return { success: true, productId: args.productId, previousStatus };
  },
});

/**
 * Internal: Deactivate Product
 * Changes product status back to draft (no longer available for sale)
 */
export const internalDeactivateProduct = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    productId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.type !== "product" || product.organizationId !== args.organizationId) {
      throw new Error("Product not found");
    }

    const previousStatus = product.status;

    await ctx.db.patch(args.productId, {
      status: "draft",
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.productId,
      actionType: "deactivated",
      performedBy: args.userId,
      performedAt: Date.now(),
      actionData: {
        previousStatus,
        newStatus: "draft",
        source: "ai_assistant",
      },
    });

    return { success: true, productId: args.productId, previousStatus };
  },
});

/**
 * Internal: Publish Checkout
 * Changes checkout status to published (ready to accept orders)
 */
export const internalPublishCheckout = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    checkoutId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const checkout = await ctx.db.get(args.checkoutId);
    if (!checkout || checkout.type !== "checkout" || checkout.organizationId !== args.organizationId) {
      throw new Error("Checkout not found");
    }

    const previousStatus = checkout.status;

    // Generate public URL for checkout
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.l4yercak3.com";
    const publicUrl = `${baseUrl}/c/${args.checkoutId}`;

    await ctx.db.patch(args.checkoutId, {
      status: "published",
      customProperties: {
        ...checkout.customProperties,
        publicUrl,
        publishedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.checkoutId,
      actionType: "published",
      performedBy: args.userId,
      performedAt: Date.now(),
      actionData: {
        previousStatus,
        newStatus: "published",
        publicUrl,
        source: "ai_assistant",
      },
    });

    return { success: true, checkoutId: args.checkoutId, previousStatus, publicUrl };
  },
});

/**
 * Internal: Create Project
 */
export const internalCreateProject = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    subtype: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    targetEndDate: v.optional(v.number()),
    budget: v.optional(v.object({
      amount: v.number(),
      currency: v.string(),
    })),
    priority: v.optional(v.string()),
    clientOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate subtype
    const validSubtypes = ["client_project", "internal", "campaign", "product_development", "other"];
    if (!validSubtypes.includes(args.subtype)) {
      throw new Error(
        `Invalid project subtype. Must be one of: ${validSubtypes.join(", ")}`
      );
    }

    // Generate project code: PRJ-YYYY-###
    const year = new Date().getFullYear();
    const existingProjects = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "project")
      )
      .collect();

    const thisYearProjects = existingProjects.filter((p) => {
      const props = p.customProperties || {};
      return props.projectCode?.startsWith(`PRJ-${year}-`);
    });
    const nextNumber = (thisYearProjects.length + 1).toString().padStart(3, "0");
    const projectCode = `PRJ-${year}-${nextNumber}`;

    const customProperties = {
      projectCode,
      startDate: args.startDate || Date.now(),
      targetEndDate: args.targetEndDate,
      budget: args.budget || { amount: 0, currency: "USD" },
      priority: args.priority || "medium",
      progress: 0,
      clientOrgId: args.clientOrgId,
      detailedDescription: "",
    };

    const now = Date.now();
    const projectId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "project",
      subtype: args.subtype,
      name: args.name,
      description: args.description || "",
      status: "draft",
      createdAt: now,
      updatedAt: now,
      createdBy: args.userId,
      customProperties,
    });

    // Log creation
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: projectId,
      actionType: "created",
      actionData: {
        source: "ai_assistant",
        subtype: args.subtype,
        projectCode,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return projectId;
  },
});

/**
 * Internal: Create Milestone
 */
export const internalCreateMilestone = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    projectId: v.id("objects"),
    name: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify project exists
    const project = await ctx.db.get(args.projectId);
    if (!project || project.type !== "project" || project.organizationId !== args.organizationId) {
      throw new Error("Project not found");
    }

    // CHECK LICENSE LIMIT: Enforce milestone limit per project
    const { checkNestedResourceLimit } = await import("../../licensing/helpers");
    await checkNestedResourceLimit(
      ctx,
      args.organizationId,
      args.projectId,
      "has_milestone",
      "maxMilestonesPerProject"
    );

    const customProperties = {
      projectId: args.projectId,
      dueDate: args.dueDate,
    };

    const now = Date.now();
    const milestoneId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "milestone",
      subtype: "project_milestone",
      name: args.name,
      description: args.description || "",
      status: "not_started",
      createdAt: now,
      updatedAt: now,
      createdBy: args.userId,
      customProperties,
    });

    // Create link to project
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: args.projectId,
      toObjectId: milestoneId,
      linkType: "has_milestone",
      properties: {},
      createdAt: now,
      createdBy: args.userId,
    });

    // Log creation
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: milestoneId,
      actionType: "created",
      actionData: {
        source: "ai_assistant",
        projectId: args.projectId,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return milestoneId;
  },
});

/**
 * Internal: Create Task
 */
export const internalCreateTask = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    projectId: v.optional(v.id("objects")),
    milestoneId: v.optional(v.id("objects")),
    name: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    priority: v.optional(v.string()),
    assigneeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (!args.projectId && !args.milestoneId) {
      throw new Error("Either projectId or milestoneId must be provided");
    }

    // Determine parent (milestone takes precedence)
    const parentId = args.milestoneId || args.projectId!;

    // Verify parent exists
    const parent = await ctx.db.get(parentId);
    if (!parent || parent.organizationId !== args.organizationId) {
      throw new Error("Parent project or milestone not found");
    }

    // Determine project ID for limit checking (tasks are limited per project, not per milestone)
    const projectIdForLimit = args.projectId || (parent.customProperties as any)?.projectId;
    if (!projectIdForLimit) {
      throw new Error("Cannot determine project ID for task limit check");
    }

    // CHECK LICENSE LIMIT: Enforce task limit per project
    const { checkNestedResourceLimit } = await import("../../licensing/helpers");
    await checkNestedResourceLimit(
      ctx,
      args.organizationId,
      projectIdForLimit as Id<"objects">,
      "has_task",
      "maxTasksPerProject"
    );

    const customProperties = {
      projectId: args.projectId || (parent.customProperties as any)?.projectId,
      milestoneId: args.milestoneId,
      assigneeId: args.assigneeId,
      dueDate: args.dueDate,
      priority: args.priority || "medium",
    };

    const now = Date.now();
    const taskId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "task",
      subtype: "project_task",
      name: args.name,
      description: args.description || "",
      status: "todo",
      createdAt: now,
      updatedAt: now,
      createdBy: args.userId,
      customProperties,
    });

    // Create link to parent
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: parentId,
      toObjectId: taskId,
      linkType: "has_task",
      properties: {},
      createdAt: now,
      createdBy: args.userId,
    });

    // Log creation
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: taskId,
      actionType: "created",
      actionData: {
        source: "ai_assistant",
        projectId: customProperties.projectId,
        milestoneId: args.milestoneId,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return taskId;
  },
});

/**
 * Internal: Update Task
 */
export const internalUpdateTask = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    taskId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    assigneeId: v.optional(v.id("users")),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId as Id<"objects">);

    if (!task || task.type !== "task" || task.organizationId !== args.organizationId) {
      throw new Error("Task not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    // Update customProperties
    if (args.priority !== undefined || args.dueDate !== undefined || args.assigneeId !== undefined) {
      const currentProps = task.customProperties || {};
      updates.customProperties = {
        ...currentProps,
        ...(args.priority !== undefined && { priority: args.priority }),
        ...(args.dueDate !== undefined && { dueDate: args.dueDate }),
        ...(args.assigneeId !== undefined && { assigneeId: args.assigneeId }),
      };
    }

    await ctx.db.patch(args.taskId as Id<"objects">, updates);

    // Log update
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.taskId as Id<"objects">,
      actionType: "updated",
      actionData: {
        source: "ai_assistant",
        updatedFields: Object.keys(updates),
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return args.taskId;
  },
});

/**
 * Internal: Search CRM Organizations
 */
export const internalSearchCrmOrganizations = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    searchQuery: v.optional(v.string()),
    subtype: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_organization")
      );

    let orgs = await query.collect();

    // Filter by search query (name match)
    if (args.searchQuery) {
      const searchLower = args.searchQuery.toLowerCase();
      orgs = orgs.filter(org =>
        org.name.toLowerCase().includes(searchLower)
      );
    }

    // Filter by subtype
    if (args.subtype) {
      orgs = orgs.filter(org => org.subtype === args.subtype);
    }

    // Limit results
    const limit = args.limit || 20;
    return orgs.slice(0, limit);
  },
});

/**
 * Internal: Create CRM Organization
 */
export const internalCreateCrmOrganization = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    subtype: v.string(),
    name: v.string(),
    website: v.optional(v.string()),
    industry: v.optional(v.string()),
    size: v.optional(v.string()),
    address: v.optional(v.object({
      street: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      postalCode: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
    taxId: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const crmOrgId = await ctx.db.insert("objects", {
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
        notes: args.notes,
        tags: args.tags || [],
      },
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Log creation
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: crmOrgId,
      actionType: "created",
      actionData: {
        source: "ai_assistant",
        subtype: args.subtype,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return crmOrgId;
  },
});

/**
 * Internal: Search Contacts
 */
export const internalSearchContacts = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    searchQuery: v.optional(v.string()),
    subtype: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      );

    let contacts = await query.collect();

    console.log(`[Search Contacts] Found ${contacts.length} CRM contacts in objects table for org ${args.organizationId}`);
    if (contacts.length > 0) {
      console.log(`[Search Contacts] Sample contact IDs:`, contacts.slice(0, 3).map(c => ({ id: c._id, name: c.name })));
    }

    // Filter by search query (name or email match)
    if (args.searchQuery) {
      const searchLower = args.searchQuery.toLowerCase();
      contacts = contacts.filter(contact => {
        const email = (contact.customProperties as any)?.email?.toLowerCase() || "";
        const name = contact.name.toLowerCase();
        return name.includes(searchLower) || email.includes(searchLower);
      });
      console.log(`[Search Contacts] After search filter: ${contacts.length} contacts match "${args.searchQuery}"`);
    }

    // Filter by subtype
    if (args.subtype) {
      contacts = contacts.filter(contact => contact.subtype === args.subtype);
    }

    // Limit results
    const limit = args.limit || 20;
    const results = contacts.slice(0, limit);

    if (results.length > 0) {
      console.log(`[Search Contacts] Returning ${results.length} contacts:`, results.map(c => ({ id: c._id, name: c.name })));
    } else {
      console.log(`[Search Contacts] No contacts found matching search criteria`);
    }

    return results;
  },
});

/**
 * Internal: Link Contact to Organization
 */
export const internalLinkContactToOrg = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    contactId: v.id("objects"),
    crmOrganizationId: v.id("objects"),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify contact and org exist
    const contact = await ctx.db.get(args.contactId);
    const crmOrg = await ctx.db.get(args.crmOrganizationId);

    if (!contact || contact.type !== "crm_contact") {
      throw new Error("Contact not found");
    }

    if (!crmOrg || crmOrg.type !== "crm_organization") {
      throw new Error("CRM organization not found");
    }

    // Check if link already exists
    const existingLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.contactId).eq("linkType", "works_at")
      )
      .filter((q) => q.eq(q.field("toObjectId"), args.crmOrganizationId))
      .first();

    if (existingLink) {
      return existingLink._id; // Already linked
    }

    const now = Date.now();
    const linkId = await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: args.contactId,
      toObjectId: args.crmOrganizationId,
      linkType: "works_at",
      properties: {
        role: args.role,
        linkedAt: now,
      },
      createdAt: now,
      createdBy: args.userId,
    });

    // Update contact's company field
    await ctx.db.patch(args.contactId, {
      customProperties: {
        ...(contact.customProperties as any),
        company: crmOrg.name,
      },
      updatedAt: now,
    });

    return linkId;
  },
});

/**
 * Internal: Get Organization Contacts
 */
export const internalGetOrganizationContacts = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    crmOrganizationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Get all "works_at" links pointing to this organization
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.crmOrganizationId).eq("linkType", "works_at")
      )
      .collect();

    // Get all contact objects
    const contacts = await Promise.all(
      links.map(async (link) => {
        const contact = await ctx.db.get(link.fromObjectId);
        if (!contact || contact.type !== "crm_contact") {
          return null;
        }
        return contact;
      })
    );

    return contacts.filter(c => c !== null);
  },
});

/**
 * Internal: Create Work Item
 * Creates a tracking record for AI operations
 */
export const internalCreateWorkItem = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    conversationId: v.id("aiConversations"),
    type: v.string(),
    name: v.string(),
    status: v.string(),
    previewData: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const workItemId = await ctx.db.insert("aiWorkItems", {
      organizationId: args.organizationId,
      userId: args.userId,
      conversationId: args.conversationId,
      type: args.type,
      name: args.name,
      status: args.status as any,
      previewData: args.previewData,
      createdAt: now,
    });

    return workItemId;
  },
});

/**
 * Internal: Update Work Item
 */
export const internalUpdateWorkItem = internalMutation({
  args: {
    workItemId: v.id("aiWorkItems"),
    status: v.optional(v.string()),
    results: v.optional(v.any()),
    progress: v.optional(v.object({
      total: v.number(),
      completed: v.number(),
      failed: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {};

    if (args.status) updates.status = args.status;
    if (args.results) updates.results = args.results;
    if (args.progress) updates.progress = args.progress;

    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.workItemId, updates);

    return args.workItemId;
  },
});

/**
 * Helper: Get PLATFORM USER by email within organization
 *
 * ⚠️ CRITICAL: This searches the USERS table (platform team members who log in).
 * This is NOT for CRM contacts! Use internalSearchContacts for external contacts.
 *
 * Use this for:
 * - Assigning tasks to your team members
 * - Finding platform users who can log in
 *
 * DO NOT use this for:
 * - CRM contacts (clients, prospects, partners)
 * - External people who don't have platform access
 */
export const getUserByEmail = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Query all PLATFORM users (NOT CRM contacts!)
    const allUsers = await ctx.db.query("users").collect();

    // Find user with matching email
    const user = allUsers.find(u => u.email.toLowerCase() === args.email.toLowerCase());

    if (!user) {
      return null;
    }

    // Verify user belongs to organization by checking organizationMembers
    const orgMember = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", user._id).eq("organizationId", args.organizationId)
      )
      .first();

    if (!orgMember || !orgMember.isActive) {
      return null;
    }

    return user;
  },
});

// ============================================================================
// EVENTS TOOLS - Internal wrappers for MCP internal functions
// ============================================================================

/**
 * Internal: List Events
 */
export const internalListEvents = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    subtype: v.optional(v.string()),
    upcoming: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let events = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "event")
      )
      .collect();

    // Filter by status
    if (args.status) {
      events = events.filter((e) => e.status === args.status);
    }

    // Filter by subtype
    if (args.subtype) {
      events = events.filter((e) => e.subtype === args.subtype);
    }

    // Filter by upcoming (future events only)
    if (args.upcoming) {
      const now = Date.now();
      events = events.filter((e) => {
        const startDate = (e.customProperties as { startDate?: number })?.startDate;
        return startDate && startDate > now;
      });
    }

    // Sort by start date
    events.sort((a, b) => {
      const aStart = (a.customProperties as { startDate?: number })?.startDate || 0;
      const bStart = (b.customProperties as { startDate?: number })?.startDate || 0;
      return aStart - bStart;
    });

    // Apply limit
    const limit = args.limit || 20;
    return events.slice(0, limit).map((e) => ({
      _id: e._id,
      name: e.name,
      description: e.description,
      subtype: e.subtype,
      status: e.status,
      startDate: (e.customProperties as { startDate?: number })?.startDate,
      endDate: (e.customProperties as { endDate?: number })?.endDate,
      location: (e.customProperties as { location?: string })?.location,
      capacity: (e.customProperties as { maxCapacity?: number })?.maxCapacity,
      timezone: (e.customProperties as { timezone?: string })?.timezone,
      createdAt: e.createdAt,
    }));
  },
});

/**
 * Internal: Update Event
 */
export const internalUpdateEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    eventId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    location: v.optional(v.string()),
    capacity: v.optional(v.number()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.type !== "event" || event.organizationId !== args.organizationId) {
      throw new Error("Event not found");
    }

    const existingProps = event.customProperties as Record<string, unknown>;
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    // Update custom properties
    const propsUpdates: Record<string, unknown> = {};
    if (args.startDate !== undefined) propsUpdates.startDate = args.startDate;
    if (args.endDate !== undefined) propsUpdates.endDate = args.endDate;
    if (args.location !== undefined) propsUpdates.location = args.location;
    if (args.capacity !== undefined) propsUpdates.maxCapacity = args.capacity;
    if (args.timezone !== undefined) propsUpdates.timezone = args.timezone;

    if (Object.keys(propsUpdates).length > 0) {
      updates.customProperties = { ...existingProps, ...propsUpdates };
    }

    await ctx.db.patch(args.eventId, updates);

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.eventId,
      actionType: "updated",
      actionData: {
        source: "ai_assistant",
        updatedFields: Object.keys(args).filter((k) => k !== "organizationId" && k !== "userId" && k !== "eventId"),
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return args.eventId;
  },
});

/**
 * Internal: Register Attendee for Event
 */
export const internalRegisterAttendee = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    eventId: v.id("objects"),
    attendeeName: v.string(),
    attendeeEmail: v.string(),
    ticketType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.type !== "event" || event.organizationId !== args.organizationId) {
      throw new Error("Event not found");
    }

    // Check capacity
    const props = event.customProperties as { maxCapacity?: number };
    if (props.maxCapacity) {
      const existingRegistrations = await ctx.db
        .query("objectLinks")
        .withIndex("by_to_link_type", (q) =>
          q.eq("toObjectId", args.eventId).eq("linkType", "registered_for")
        )
        .collect();

      if (existingRegistrations.length >= props.maxCapacity) {
        throw new Error("Event is at capacity");
      }
    }

    // Check if already registered (by email)
    const existingContacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    let contact = existingContacts.find(
      (c) => (c.customProperties as { email?: string })?.email?.toLowerCase() === args.attendeeEmail.toLowerCase()
    );

    // Create contact if doesn't exist
    if (!contact) {
      const nameParts = args.attendeeName.split(" ");
      const firstName = nameParts[0] || args.attendeeName;
      const lastName = nameParts.slice(1).join(" ") || "";

      const contactId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "crm_contact",
        subtype: "attendee",
        name: args.attendeeName,
        description: "Event attendee",
        status: "active",
        customProperties: {
          firstName,
          lastName,
          email: args.attendeeEmail,
          tags: ["event-attendee"],
        },
        createdBy: args.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      contact = (await ctx.db.get(contactId)) ?? undefined;
    }

    if (!contact) {
      throw new Error("Failed to create or find contact");
    }

    // Check if already registered for this event
    const existingLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", contact._id).eq("linkType", "registered_for")
      )
      .filter((q) => q.eq(q.field("toObjectId"), args.eventId))
      .first();

    if (existingLink) {
      return {
        success: true,
        message: "Already registered",
        contactId: contact._id,
        linkId: existingLink._id,
      };
    }

    // Create registration link
    const linkId = await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: contact._id,
      toObjectId: args.eventId,
      linkType: "registered_for",
      properties: {
        registeredAt: Date.now(),
        ticketType: args.ticketType || "general",
        status: "confirmed",
      },
      createdAt: Date.now(),
      createdBy: args.userId,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.eventId,
      actionType: "attendee_registered",
      actionData: {
        source: "ai_assistant",
        contactId: contact._id,
        attendeeName: args.attendeeName,
        attendeeEmail: args.attendeeEmail,
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return {
      success: true,
      message: "Registration successful",
      contactId: contact._id,
      linkId,
    };
  },
});

// ============================================================================
// CRM TOOLS - Internal wrappers for contact management
// ============================================================================

/**
 * Internal: Update Contact
 */
export const internalUpdateContact = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    contactId: v.id("objects"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.type !== "crm_contact" || contact.organizationId !== args.organizationId) {
      throw new Error("Contact not found");
    }

    const existingProps = contact.customProperties as Record<string, unknown>;
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    // Update name if first/last name changed
    if (args.firstName !== undefined || args.lastName !== undefined) {
      const firstName = args.firstName ?? existingProps.firstName;
      const lastName = args.lastName ?? existingProps.lastName;
      updates.name = `${firstName} ${lastName}`.trim();
    }

    // Update custom properties
    const propsUpdates: Record<string, unknown> = {};
    if (args.firstName !== undefined) propsUpdates.firstName = args.firstName;
    if (args.lastName !== undefined) propsUpdates.lastName = args.lastName;
    if (args.email !== undefined) propsUpdates.email = args.email;
    if (args.phone !== undefined) propsUpdates.phone = args.phone;
    if (args.jobTitle !== undefined) propsUpdates.jobTitle = args.jobTitle;
    if (args.company !== undefined) propsUpdates.company = args.company;
    if (args.notes !== undefined) propsUpdates.notes = args.notes;
    if (args.tags !== undefined) propsUpdates.tags = args.tags;

    if (Object.keys(propsUpdates).length > 0) {
      updates.customProperties = { ...existingProps, ...propsUpdates };
    }

    await ctx.db.patch(args.contactId, updates);

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.contactId,
      actionType: "updated",
      actionData: {
        source: "ai_assistant",
        updatedFields: Object.keys(propsUpdates),
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return args.contactId;
  },
});

/**
 * Internal: Tag Contacts (bulk add tags)
 */
export const internalTagContacts = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    contactIds: v.array(v.id("objects")),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const results: Array<{ contactId: Id<"objects">; success: boolean; error?: string }> = [];

    for (const contactId of args.contactIds) {
      try {
        const contact = await ctx.db.get(contactId);
        if (!contact || contact.type !== "crm_contact" || contact.organizationId !== args.organizationId) {
          results.push({ contactId, success: false, error: "Contact not found" });
          continue;
        }

        const existingProps = contact.customProperties as { tags?: string[] };
        const existingTags = existingProps.tags || [];
        const newTags = [...new Set([...existingTags, ...args.tags])];

        await ctx.db.patch(contactId, {
          customProperties: {
            ...existingProps,
            tags: newTags,
          },
          updatedAt: Date.now(),
        });

        results.push({ contactId, success: true });
      } catch (error) {
        results.push({
          contactId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.contactIds[0], // Log to first contact
      actionType: "bulk_tagged",
      actionData: {
        source: "ai_assistant",
        contactCount: args.contactIds.length,
        tags: args.tags,
        successCount: results.filter((r) => r.success).length,
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return {
      total: args.contactIds.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  },
});

// ============================================================================
// FORMS TOOLS - Internal wrappers for form management
// ============================================================================

/**
 * Internal: List Forms
 */
export const internalListForms = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    subtype: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let forms = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "form")
      )
      .collect();

    if (args.status && args.status !== "all") {
      forms = forms.filter((f) => f.status === args.status);
    }

    if (args.subtype) {
      forms = forms.filter((f) => f.subtype === args.subtype);
    }

    // Sort by update time descending
    forms.sort((a, b) => b.updatedAt - a.updatedAt);

    const limit = args.limit || 20;
    return forms.slice(0, limit).map((f) => ({
      _id: f._id,
      name: f.name,
      description: f.description,
      subtype: f.subtype,
      status: f.status,
      stats: (f.customProperties as { stats?: { views: number; submissions: number } })?.stats,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));
  },
});

/**
 * Internal: Publish Form
 */
export const internalPublishForm = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    formId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form || form.type !== "form" || form.organizationId !== args.organizationId) {
      throw new Error("Form not found");
    }

    // Use "published" status to be consistent with UI publishForm mutation
    // (not "active" which was previously causing forms to disappear from UI)
    await ctx.db.patch(args.formId, {
      status: "published",
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.formId,
      actionType: "published",
      actionData: {
        source: "ai_assistant",
        previousStatus: form.status,
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true, formId: args.formId };
  },
});

/**
 * Internal: Get Form Responses
 */
export const internalGetFormResponses = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    formId: v.id("objects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form || form.type !== "form" || form.organizationId !== args.organizationId) {
      throw new Error("Form not found");
    }

    // Get form responses (linked via objectLinks)
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.formId).eq("linkType", "response_to")
      )
      .collect();

    const responses = await Promise.all(
      links.map(async (link) => {
        const response = await ctx.db.get(link.fromObjectId);
        return response;
      })
    );

    const validResponses = responses
      .filter((r) => r !== null && r.type === "form_response")
      .sort((a, b) => b!.createdAt - a!.createdAt);

    const limit = args.limit || 50;
    return {
      formId: args.formId,
      formName: form.name,
      total: validResponses.length,
      responses: validResponses.slice(0, limit).map((r) => ({
        _id: r!._id,
        data: r!.customProperties,
        submittedAt: r!.createdAt,
      })),
    };
  },
});

// ============================================================================
// PRODUCTS TOOLS - Internal wrappers for product management
// ============================================================================

/**
 * Internal: List Products
 */
export const internalListProducts = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    subtype: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let products = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "product")
      )
      .collect();

    if (args.status && args.status !== "all") {
      products = products.filter((p) => p.status === args.status);
    }

    if (args.subtype) {
      products = products.filter((p) => p.subtype === args.subtype);
    }

    // Sort by update time descending
    products.sort((a, b) => b.updatedAt - a.updatedAt);

    const limit = args.limit || 20;
    return products.slice(0, limit).map((p) => {
      const props = p.customProperties as {
        price?: number;
        currency?: string;
        inventory?: number;
        sold?: number;
      };
      return {
        _id: p._id,
        name: p.name,
        description: p.description,
        subtype: p.subtype,
        status: p.status,
        priceInCents: props.price,
        priceDollars: props.price ? props.price / 100 : null,
        currency: props.currency || "USD",
        inventory: props.inventory,
        sold: props.sold || 0,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });
  },
});

/**
 * Internal: Set Product Price
 */
export const internalSetProductPrice = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    productId: v.id("objects"),
    priceInCents: v.number(),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.type !== "product" || product.organizationId !== args.organizationId) {
      throw new Error("Product not found");
    }

    const existingProps = product.customProperties as Record<string, unknown>;
    const oldPrice = existingProps.price;

    await ctx.db.patch(args.productId, {
      customProperties: {
        ...existingProps,
        price: args.priceInCents,
        ...(args.currency && { currency: args.currency }),
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.productId,
      actionType: "price_updated",
      actionData: {
        source: "ai_assistant",
        oldPrice,
        newPrice: args.priceInCents,
        currency: args.currency || existingProps.currency,
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return {
      success: true,
      productId: args.productId,
      oldPrice,
      newPrice: args.priceInCents,
    };
  },
});

// ============================================================================
// TICKETS TOOLS - Internal wrappers for support ticket management
// ============================================================================

/**
 * Internal: List Tickets
 */
export const internalListTickets = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let tickets = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "ticket")
      )
      .collect();

    if (args.status && args.status !== "all") {
      tickets = tickets.filter((t) => t.status === args.status);
    }

    // Sort by creation time descending (newest first)
    tickets.sort((a, b) => b.createdAt - a.createdAt);

    const limit = args.limit || 20;
    return tickets.slice(0, limit).map((t) => {
      const props = t.customProperties as {
        priority?: string;
        assignee?: string;
        ticketNumber?: string;
      };
      return {
        _id: t._id,
        name: t.name,
        description: t.description,
        status: t.status,
        priority: props.priority || "medium",
        assignee: props.assignee,
        ticketNumber: props.ticketNumber,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    });
  },
});

/**
 * Internal: Create Ticket
 */
export const internalCreateTicket = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    subject: v.string(),
    description: v.string(),
    priority: v.optional(v.string()),
    assigneeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Generate ticket number
    const existingTickets = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "ticket")
      )
      .collect();

    const ticketNumber = `TKT-${String(existingTickets.length + 1).padStart(5, "0")}`;

    const now = Date.now();
    const ticketId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "ticket",
      subtype: "support",
      name: args.subject,
      description: args.description,
      status: "open",
      customProperties: {
        ticketNumber,
        priority: args.priority || "medium",
        assigneeId: args.assigneeId,
      },
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: ticketId,
      actionType: "created",
      actionData: {
        source: "ai_assistant",
        ticketNumber,
        priority: args.priority || "medium",
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return { ticketId, ticketNumber };
  },
});

/**
 * Internal: Update Ticket Status
 */
export const internalUpdateTicketStatus = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    ticketId: v.id("objects"),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket || ticket.type !== "ticket" || ticket.organizationId !== args.organizationId) {
      throw new Error("Ticket not found");
    }

    const oldStatus = ticket.status;

    await ctx.db.patch(args.ticketId, {
      status: args.newStatus,
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.ticketId,
      actionType: "status_changed",
      actionData: {
        source: "ai_assistant",
        oldStatus,
        newStatus: args.newStatus,
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true, oldStatus, newStatus: args.newStatus };
  },
});

// ============================================================================
// WORKFLOWS TOOLS - Internal wrappers for workflow management
// ============================================================================

/**
 * Internal: List Workflows
 */
export const internalListWorkflows = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let workflows = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "workflow")
      )
      .collect();

    if (args.status) {
      workflows = workflows.filter((w) => w.status === args.status);
    }

    // Sort by update time descending
    workflows.sort((a, b) => b.updatedAt - a.updatedAt);

    const limit = args.limit || 20;
    return workflows.slice(0, limit).map((w) => {
      const props = w.customProperties as {
        execution?: { triggerOn?: string };
        behaviors?: unknown[];
      };
      return {
        _id: w._id,
        name: w.name,
        description: w.description,
        subtype: w.subtype,
        status: w.status,
        triggerOn: props.execution?.triggerOn,
        behaviorCount: props.behaviors?.length || 0,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      };
    });
  },
});

/**
 * Internal: Create Workflow
 */
export const internalCreateWorkflow = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    name: v.string(),
    trigger: v.string(),
    actions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const workflowId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "workflow",
      subtype: "automation",
      name: args.name,
      description: `Triggered by: ${args.trigger}`,
      status: "draft",
      customProperties: {
        objects: [],
        behaviors: args.actions?.map((action, idx) => ({
          id: `bhv_${now}_${idx}`,
          type: action,
          enabled: true,
          priority: idx,
          config: {},
          metadata: {
            createdAt: now,
            createdBy: args.userId,
          },
        })) || [],
        execution: {
          triggerOn: args.trigger,
          errorHandling: "continue",
        },
      },
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: workflowId,
      actionType: "created",
      actionData: {
        source: "ai_assistant",
        trigger: args.trigger,
        actionCount: args.actions?.length || 0,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return workflowId;
  },
});

/**
 * Internal: Enable/Disable Workflow
 */
export const internalSetWorkflowStatus = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    workflowId: v.id("objects"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== "workflow" || workflow.organizationId !== args.organizationId) {
      throw new Error("Workflow not found");
    }

    const oldStatus = workflow.status;
    const newStatus = args.enabled ? "active" : "draft";

    await ctx.db.patch(args.workflowId, {
      status: newStatus,
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.workflowId,
      actionType: args.enabled ? "workflow_activated" : "workflow_deactivated",
      actionData: {
        source: "ai_assistant",
        oldStatus,
        newStatus,
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true, oldStatus, newStatus };
  },
});

// ============================================================================
// TEMPLATES TOOLS - Internal wrappers for template management
// ============================================================================

/**
 * Internal: List Templates
 */
export const internalListTemplates = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let templates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template")
      )
      .collect();

    // Filter out page templates (handled separately)
    templates = templates.filter((t) => t.subtype !== "page");

    if (args.subtype) {
      templates = templates.filter((t) => t.subtype === args.subtype);
    }

    // Sort by update time descending
    templates.sort((a, b) => b.updatedAt - a.updatedAt);

    const limit = args.limit || 20;
    return templates.slice(0, limit).map((t) => {
      const props = t.customProperties as {
        code?: string;
        category?: string;
        subject?: string;
      };
      return {
        _id: t._id,
        name: t.name,
        description: t.description,
        subtype: t.subtype,
        status: t.status,
        code: props.code,
        category: props.category,
        subject: props.subject,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    });
  },
});

/**
 * Internal: Create Email Template
 */
export const internalCreateEmailTemplate = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    name: v.string(),
    subject: v.string(),
    body: v.string(),
    variables: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const code = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    const now = Date.now();
    const templateId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "template",
      subtype: "email",
      name: args.name,
      description: `Email template: ${args.subject}`,
      status: "draft",
      customProperties: {
        code: `email_${code}_${now}`,
        category: "custom",
        subject: args.subject,
        htmlContent: args.body,
        textContent: args.body.replace(/<[^>]*>/g, ""), // Strip HTML
        variables: args.variables || [],
        isDefault: false,
        author: "AI Assistant",
        version: "1.0.0",
      },
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: templateId,
      actionType: "created",
      actionData: {
        source: "ai_assistant",
        templateType: "email",
        subject: args.subject,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return templateId;
  },
});

// ============================================================================
// CHECKOUT TOOLS - Internal wrappers for checkout management
// ============================================================================

/**
 * Internal: List Checkout Instances
 */
export const internalListCheckouts = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let checkouts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "checkout_instance")
      )
      .collect();

    if (args.status) {
      checkouts = checkouts.filter((c) => c.status === args.status);
    } else {
      // Exclude deleted by default
      checkouts = checkouts.filter((c) => c.status !== "deleted");
    }

    // Sort by update time descending
    checkouts.sort((a, b) => b.updatedAt - a.updatedAt);

    const limit = args.limit || 20;
    return checkouts.slice(0, limit).map((c) => {
      const props = c.customProperties as {
        publicSlug?: string;
        linkedProducts?: string[];
      };
      return {
        _id: c._id,
        name: c.name,
        description: c.description,
        status: c.status,
        publicSlug: props.publicSlug,
        productCount: props.linkedProducts?.length || 0,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });
  },
});

/**
 * Internal: Create Checkout Page
 */
export const internalCreateCheckoutPage = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    name: v.string(),
    productIds: v.array(v.id("objects")),
    paymentMethods: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Verify products exist
    for (const productId of args.productIds) {
      const product = await ctx.db.get(productId);
      if (!product || product.type !== "product" || product.organizationId !== args.organizationId) {
        throw new Error(`Product ${productId} not found`);
      }
    }

    // Generate slug
    const slug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
      "-" +
      Math.random().toString(36).substring(2, 8);

    const now = Date.now();
    const checkoutId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "checkout_instance",
      subtype: "checkout",
      name: args.name,
      description: `Checkout for ${args.productIds.length} product(s)`,
      status: "draft",
      customProperties: {
        publicSlug: slug,
        linkedProducts: args.productIds,
        paymentProviders: args.paymentMethods || ["stripe-connect"],
        settings: {
          maxQuantityPerOrder: 10,
          requiresAccount: false,
        },
      },
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: checkoutId,
      actionType: "created",
      actionData: {
        source: "ai_assistant",
        publicSlug: slug,
        productCount: args.productIds.length,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return { checkoutId, publicSlug: slug };
  },
});

/**
 * Internal: Create Checkout Page with Full Details (Behavior-Driven)
 *
 * Enhanced checkout creation using the behavior-driven template.
 * Ties together products, forms, events, and payment providers into a complete checkout experience.
 */
export const internalCreateCheckoutPageWithDetails = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    productIds: v.array(v.id("objects")),
    formId: v.optional(v.id("objects")),
    eventId: v.optional(v.id("objects")),
    paymentMode: v.optional(v.string()), // "b2c", "b2b", "hybrid"
    paymentProviders: v.optional(v.array(v.string())),
    behaviors: v.optional(v.array(v.object({
      type: v.string(),
      config: v.optional(v.any()),
      priority: v.optional(v.number()),
    }))),
    settings: v.optional(v.object({
      language: v.optional(v.string()),
      maxQuantityPerOrder: v.optional(v.number()),
      requiresAccount: v.optional(v.boolean()),
      showProgressBar: v.optional(v.boolean()),
      allowBackNavigation: v.optional(v.boolean()),
      debugMode: v.optional(v.boolean()),
      currency: v.optional(v.string()),
      successRedirectUrl: v.optional(v.string()),
      cancelRedirectUrl: v.optional(v.string()),
    })),
    branding: v.optional(v.object({
      headerText: v.optional(v.string()),
      footerText: v.optional(v.string()),
      primaryColor: v.optional(v.string()),
      logoUrl: v.optional(v.string()),
      theme: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // Verify products exist and belong to org
    const products: Array<{ _id: string; name?: string; customProperties?: Record<string, unknown> }> = [];
    for (const productId of args.productIds) {
      const product = await ctx.db.get(productId);
      if (!product || product.type !== "product" || product.organizationId !== args.organizationId) {
        throw new Error(`Product ${productId} not found or not accessible`);
      }
      products.push(product as { _id: string; name?: string; customProperties?: Record<string, unknown> });
    }

    // Verify form exists if provided
    if (args.formId) {
      const form = await ctx.db.get(args.formId);
      if (!form || form.type !== "form" || form.organizationId !== args.organizationId) {
        throw new Error(`Form ${args.formId} not found or not accessible`);
      }
    }

    // Verify event exists if provided
    if (args.eventId) {
      const event = await ctx.db.get(args.eventId);
      if (!event || event.type !== "event" || event.organizationId !== args.organizationId) {
        throw new Error(`Event ${args.eventId} not found or not accessible`);
      }
    }

    // Generate unique slug
    const slug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
      "-" +
      Math.random().toString(36).substring(2, 8);

    // Determine payment providers based on mode
    let paymentProviders = args.paymentProviders;
    if (!paymentProviders) {
      switch (args.paymentMode) {
        case "b2b":
          paymentProviders = ["invoice"];
          break;
        case "hybrid":
          paymentProviders = ["stripe-connect", "invoice"];
          break;
        default: // b2c or undefined
          paymentProviders = ["stripe-connect"];
      }
    }

    // Build behaviors array with defaults
    const behaviors = args.behaviors || [];

    // Auto-add form_linking behavior if form is linked
    if (args.formId && !behaviors.some(b => b.type === "form_linking" || b.type === "form-collection")) {
      behaviors.push({
        type: "form_linking",
        config: {
          formId: args.formId,
          timing: "duringCheckout", // Show form during checkout flow
        },
        priority: 100,
      });
    }

    // Auto-add employer-detection for B2B/hybrid modes
    if ((args.paymentMode === "b2b" || args.paymentMode === "hybrid") &&
        !behaviors.some(b => b.type === "employer-detection")) {
      behaviors.push({
        type: "employer-detection",
        config: {},
        priority: 90,
      });
    }

    // Auto-add invoice-mapping for B2B/hybrid modes
    if ((args.paymentMode === "b2b" || args.paymentMode === "hybrid") &&
        !behaviors.some(b => b.type === "invoice-mapping")) {
      behaviors.push({
        type: "invoice-mapping",
        config: {},
        priority: 80,
      });
    }

    const now = Date.now();

    // Create the checkout instance
    const checkoutId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "checkout_instance",
      subtype: "behavior-driven",
      name: args.name,
      description: args.description || `Checkout for ${args.productIds.length} product(s)`,
      status: "draft",
      customProperties: {
        // Template reference
        templateCode: "behavior-driven-checkout",

        // Public access
        publicSlug: slug,

        // Linked entities
        linkedProducts: args.productIds,
        linkedFormId: args.formId,
        linkedEventId: args.eventId,

        // Payment configuration
        paymentMode: args.paymentMode || "b2c",
        paymentProviders,

        // Behaviors for dynamic checkout logic
        behaviors,

        // Default language (stored at top level for UI consistency)
        // UI stores this at customProperties.defaultLanguage
        defaultLanguage: args.settings?.language || "en",

        // Settings with defaults
        settings: {
          language: args.settings?.language || "en", // Also kept here for backwards compatibility
          maxQuantityPerOrder: args.settings?.maxQuantityPerOrder || 10,
          requiresAccount: args.settings?.requiresAccount || false,
          showProgressBar: args.settings?.showProgressBar !== false,
          allowBackNavigation: args.settings?.allowBackNavigation !== false,
          debugMode: args.settings?.debugMode || false,
          currency: args.settings?.currency,
          successRedirectUrl: args.settings?.successRedirectUrl,
          cancelRedirectUrl: args.settings?.cancelRedirectUrl,
        },

        // Branding
        branding: args.branding || {},

        // Checkout flow configuration (behavior-driven 6-step flow)
        checkoutFlow: {
          steps: [
            { id: "product", name: "Select Products", enabled: true },
            { id: "form", name: "Registration", enabled: !!args.formId },
            { id: "customer", name: "Customer Info", enabled: true },
            { id: "review", name: "Review Order", enabled: true },
            { id: "payment", name: "Payment", enabled: args.paymentMode !== "b2b" }, // Skip for pure B2B
            { id: "confirmation", name: "Confirmation", enabled: true },
          ],
        },

        // Metadata
        createdVia: "ai_tool",
        version: "1.0.0",
      },
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Create object links for relationships
    const linkPromises = [];

    // Link to products
    for (const productId of args.productIds) {
      linkPromises.push(ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: checkoutId,
        toObjectId: productId,
        linkType: "checkout_product",
        createdAt: now,
      }));
    }

    // Link to form if provided
    if (args.formId) {
      linkPromises.push(ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: checkoutId,
        toObjectId: args.formId,
        linkType: "checkout_form",
        createdAt: now,
      }));
    }

    // Link to event if provided
    if (args.eventId) {
      linkPromises.push(ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: checkoutId,
        toObjectId: args.eventId,
        linkType: "checkout_event",
        createdAt: now,
      }));
    }

    await Promise.all(linkPromises);

    // Log action with full context
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: checkoutId,
      actionType: "created",
      actionData: {
        source: "ai_assistant",
        createdVia: "ai_tool",
        template: "behavior-driven-checkout",
        publicSlug: slug,
        productCount: args.productIds.length,
        hasForm: !!args.formId,
        hasEvent: !!args.eventId,
        paymentMode: args.paymentMode || "b2c",
        paymentProviders,
        behaviorCount: behaviors.length,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return { checkoutId, publicSlug: slug };
  },
});

// ============================================================================
// CERTIFICATES TOOLS - Internal wrappers for certificate management
// ============================================================================

/**
 * Internal: Generate Certificate
 */
export const internalGenerateCertificate = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    recipientName: v.string(),
    recipientEmail: v.optional(v.string()),
    certificateType: v.string(),
    eventName: v.optional(v.string()),
    issueDate: v.optional(v.number()),
    pointsAwarded: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const certificateNumber = `${args.certificateType.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const now = Date.now();
    const certificateId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "certificate",
      subtype: args.certificateType,
      name: `${args.certificateType} Certificate - ${args.recipientName}`,
      description: args.eventName ? `For: ${args.eventName}` : "Certificate of completion",
      status: "issued",
      customProperties: {
        certificateNumber,
        recipientName: args.recipientName,
        recipientEmail: args.recipientEmail,
        eventName: args.eventName,
        issueDate: args.issueDate || now,
        pointsAwarded: args.pointsAwarded || 1,
        pointCategory: "completion",
        pointUnit: "credit",
        qrCodeUrl: `https://l4yercak3.com/verify/${certificateNumber}`,
      },
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: certificateId,
      actionType: "certificate_issued",
      actionData: {
        source: "ai_assistant",
        certificateNumber,
        recipientName: args.recipientName,
        certificateType: args.certificateType,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return { certificateId, certificateNumber };
  },
});

/**
 * Internal: Send Email From Template
 */
export const internalSendEmailFromTemplate = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    templateId: v.id("objects"),
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
    variables: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Get the template
    const template = await ctx.db.get(args.templateId);
    if (!template || template.organizationId !== args.organizationId || template.type !== "template") {
      throw new Error("Template not found");
    }

    const customProps = template.customProperties || {};
    let subject = customProps.subject as string || "No subject";
    let body = customProps.body as string || "";

    // Replace variables in subject and body
    if (args.variables && typeof args.variables === "object") {
      const vars = args.variables as Record<string, string>;
      for (const [key, value] of Object.entries(vars)) {
        const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
        subject = subject.replace(placeholder, value);
        body = body.replace(placeholder, value);
      }
    }

    const now = Date.now();

    // Create an email log entry
    const emailLogId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "email_log",
      subtype: "template_email",
      name: `Email to ${args.recipientEmail}`,
      description: subject,
      status: "pending",
      customProperties: {
        templateId: args.templateId,
        templateName: template.name,
        recipientEmail: args.recipientEmail,
        recipientName: args.recipientName,
        subject,
        variables: args.variables,
        sentAt: now,
      },
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: emailLogId,
      actionType: "email_queued",
      actionData: {
        source: "ai_assistant",
        templateId: args.templateId,
        recipientEmail: args.recipientEmail,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return {
      success: true,
      emailLogId,
      templateName: template.name,
      recipientEmail: args.recipientEmail,
      subject,
    };
  },
});

/**
 * Internal: Create Invoice
 */
export const internalCreateInvoice = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    customerId: v.optional(v.id("objects")),
    customerEmail: v.optional(v.string()),
    customerName: v.optional(v.string()),
    items: v.array(
      v.object({
        description: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
      })
    ),
    dueDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Calculate totals
    const subtotal = args.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const total = subtotal; // Could add tax calculation here

    const invoiceId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "invoice",
      subtype: "standard",
      name: `Invoice ${invoiceNumber}`,
      description: args.customerName ? `Invoice for ${args.customerName}` : "Invoice",
      status: "draft",
      customProperties: {
        invoiceNumber,
        customerId: args.customerId,
        customerEmail: args.customerEmail,
        customerName: args.customerName,
        items: args.items,
        subtotal,
        total,
        currency: args.currency || "USD",
        dueDate: args.dueDate,
        notes: args.notes,
        issueDate: now,
      },
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: invoiceId,
      actionType: "invoice_created",
      actionData: {
        source: "ai_assistant",
        invoiceNumber,
        total,
        currency: args.currency || "USD",
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return {
      invoiceId,
      invoiceNumber,
      total,
      currency: args.currency || "USD",
      status: "draft",
    };
  },
});

/**
 * Internal: Send Invoice
 */
export const internalSendInvoice = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    invoiceId: v.id("objects"),
    emailMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.organizationId !== args.organizationId || invoice.type !== "invoice") {
      throw new Error("Invoice not found");
    }

    const customProps = invoice.customProperties || {};
    const now = Date.now();

    // Update invoice status to sent
    await ctx.db.patch(args.invoiceId, {
      status: "sent",
      customProperties: {
        ...customProps,
        sentAt: now,
        emailMessage: args.emailMessage,
      },
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.invoiceId,
      actionType: "invoice_sent",
      actionData: {
        source: "ai_assistant",
        invoiceNumber: customProps.invoiceNumber,
        customerEmail: customProps.customerEmail,
        sentAt: now,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return {
      success: true,
      invoiceId: args.invoiceId,
      invoiceNumber: customProps.invoiceNumber as string,
      customerEmail: customProps.customerEmail as string,
      previousStatus: invoice.status,
      newStatus: "sent",
    };
  },
});

/**
 * Internal: Process Payment (mark as paid)
 */
export const internalProcessPayment = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    invoiceId: v.optional(v.id("objects")),
    customerId: v.optional(v.id("objects")),
    amount: v.number(),
    paymentMethod: v.optional(v.string()),
    description: v.optional(v.string()),
    transactionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // If invoice provided, update it
    if (args.invoiceId) {
      const invoice = await ctx.db.get(args.invoiceId);
      if (invoice && invoice.organizationId === args.organizationId) {
        const customProps = invoice.customProperties || {};
        await ctx.db.patch(args.invoiceId, {
          status: "paid",
          customProperties: {
            ...customProps,
            paidAt: now,
            paidAmount: args.amount,
            paymentMethod: args.paymentMethod,
            transactionId: args.transactionId,
          },
          updatedAt: now,
        });
      }
    }

    // Create payment record
    const paymentId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "payment",
      subtype: args.paymentMethod || "manual",
      name: `Payment - $${(args.amount / 100).toFixed(2)}`,
      description: args.description || "Payment received",
      status: "completed",
      customProperties: {
        amount: args.amount,
        currency: "USD",
        invoiceId: args.invoiceId,
        customerId: args.customerId,
        paymentMethod: args.paymentMethod || "manual",
        transactionId: args.transactionId || `TXN-${Date.now()}`,
        processedAt: now,
      },
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: paymentId,
      actionType: "payment_processed",
      actionData: {
        source: "ai_assistant",
        amount: args.amount,
        invoiceId: args.invoiceId,
        paymentMethod: args.paymentMethod,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return {
      success: true,
      paymentId,
      amount: args.amount,
      invoiceId: args.invoiceId,
      transactionId: args.transactionId || `TXN-${Date.now()}`,
    };
  },
});

/**
 * Internal: Search Media
 */
export const internalSearchMedia = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    query: v.string(),
    fileType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const queryLower = args.query.toLowerCase();

    const mediaQuery = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "media")
      );

    const allMedia = await mediaQuery.collect();

    // Filter by search query and file type
    const filtered = allMedia.filter((m) => {
      const matchesQuery =
        m.name?.toLowerCase().includes(queryLower) ||
        m.description?.toLowerCase().includes(queryLower) ||
        (m.customProperties?.fileName as string)?.toLowerCase().includes(queryLower) ||
        (m.customProperties?.tags as string[])?.some((t: string) => t.toLowerCase().includes(queryLower));

      if (!matchesQuery) return false;

      if (args.fileType && args.fileType !== "all") {
        const mimeType = (m.customProperties?.mimeType as string) || "";
        if (args.fileType === "images" && !mimeType.startsWith("image/")) return false;
        if (args.fileType === "videos" && !mimeType.startsWith("video/")) return false;
        if (args.fileType === "documents" && !mimeType.startsWith("application/")) return false;
      }

      return true;
    });

    const limited = filtered.slice(0, args.limit || 20);

    return limited.map((m) => ({
      _id: m._id,
      name: m.name,
      description: m.description,
      fileName: m.customProperties?.fileName as string,
      fileType: m.subtype,
      mimeType: m.customProperties?.mimeType as string,
      size: m.customProperties?.size as number,
      url: m.customProperties?.url as string,
      storageId: m.customProperties?.storageId as string,
      createdAt: m.createdAt,
    }));
  },
});

/**
 * Internal: Create Media Entry (for upload tracking)
 */
export const internalCreateMediaEntry = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    fileName: v.string(),
    fileType: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    size: v.optional(v.number()),
    folder: v.optional(v.string()),
    storageId: v.optional(v.string()),
    url: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const mediaId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "media",
      subtype: args.fileType || "file",
      name: args.fileName,
      description: args.description || "",
      status: args.storageId ? "uploaded" : "pending",
      customProperties: {
        fileName: args.fileName,
        mimeType: args.mimeType,
        size: args.size,
        folder: args.folder,
        storageId: args.storageId,
        url: args.url,
        tags: args.tags || [],
      },
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: mediaId,
      actionType: "media_uploaded",
      actionData: {
        source: "ai_assistant",
        fileName: args.fileName,
        fileType: args.fileType,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return { mediaId, fileName: args.fileName };
  },
});

/**
 * Internal: Create Page
 */
export const internalCreatePage = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    title: v.string(),
    slug: v.string(),
    template: v.optional(v.string()),
    content: v.optional(v.any()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if slug already exists
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "page")
      )
      .filter((q) => q.eq(q.field("customProperties.slug"), args.slug))
      .first();

    if (existing) {
      throw new Error(`A page with slug "${args.slug}" already exists`);
    }

    const pageId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "page",
      subtype: args.template || "custom",
      name: args.title,
      description: args.metaDescription || "",
      status: "draft",
      customProperties: {
        title: args.title,
        slug: args.slug,
        template: args.template,
        content: args.content || { blocks: [] },
        metaTitle: args.metaTitle || args.title,
        metaDescription: args.metaDescription,
        publishedAt: null,
      },
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: pageId,
      actionType: "page_created",
      actionData: {
        source: "ai_assistant",
        title: args.title,
        slug: args.slug,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return { pageId, slug: args.slug };
  },
});

/**
 * Internal: Publish Page
 */
export const internalPublishPage = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    pageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page || page.organizationId !== args.organizationId || page.type !== "page") {
      throw new Error("Page not found");
    }

    const now = Date.now();
    const oldStatus = page.status;
    const customProps = page.customProperties || {};

    await ctx.db.patch(args.pageId, {
      status: "published",
      customProperties: {
        ...customProps,
        publishedAt: now,
      },
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.pageId,
      actionType: "page_published",
      actionData: {
        source: "ai_assistant",
        title: page.name,
        slug: customProps.slug,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return {
      success: true,
      pageId: args.pageId,
      title: page.name,
      slug: customProps.slug as string,
      oldStatus,
      newStatus: "published",
    };
  },
});

/**
 * LINK FORM TO CHECKOUT
 *
 * Links a form to a checkout page, adding the form_linking behavior
 * so the checkout will include a form step during checkout flow.
 */
export const internalLinkFormToCheckout = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    checkoutId: v.id("objects"),
    formId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Verify checkout exists and belongs to org
    const checkout = await ctx.db.get(args.checkoutId);
    if (!checkout || checkout.type !== "checkout_instance" || checkout.organizationId !== args.organizationId) {
      throw new Error("Checkout not found or not accessible");
    }

    // Verify form exists and belongs to org
    const form = await ctx.db.get(args.formId);
    if (!form || form.type !== "form" || form.organizationId !== args.organizationId) {
      throw new Error("Form not found or not accessible");
    }

    const customProps = (checkout.customProperties || {}) as Record<string, unknown>;
    const existingBehaviors = (customProps.behaviors || []) as Array<{ type: string; config?: Record<string, unknown>; priority?: number }>;

    // Remove any existing form_linking or legacy form-collection behavior
    const filteredBehaviors = existingBehaviors.filter(b => b.type !== "form_linking" && b.type !== "form-collection");

    // Add new form_linking behavior with timing: "duringCheckout"
    // This is required for the frontend registration-form.tsx to detect and render the form
    filteredBehaviors.push({
      type: "form_linking",
      config: {
        formId: args.formId,
        timing: "duringCheckout", // Show form during checkout flow
      },
      priority: 100,
    });

    const now = Date.now();

    // Update checkout with new form link and behavior
    await ctx.db.patch(args.checkoutId, {
      customProperties: {
        ...customProps,
        linkedFormId: args.formId,
        behaviors: filteredBehaviors,
      },
      updatedAt: now,
    });

    // Check if link already exists
    const existingLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", q => q.eq("fromObjectId", args.checkoutId).eq("linkType", "checkout_form"))
      .first();

    // Remove old link if exists
    if (existingLink) {
      await ctx.db.delete(existingLink._id);
    }

    // Create new object link
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: args.checkoutId,
      toObjectId: args.formId,
      linkType: "checkout_form",
      createdAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.checkoutId,
      actionType: "checkout_form_linked",
      actionData: {
        source: "ai_assistant",
        formId: args.formId,
        formName: form.name,
        checkoutName: checkout.name,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return {
      success: true,
      checkoutId: args.checkoutId,
      checkoutName: checkout.name,
      formId: args.formId,
      formName: form.name,
    };
  },
});

/**
 * UNLINK FORM FROM CHECKOUT
 *
 * Removes a form from a checkout page, removing the form_linking behavior.
 */
export const internalUnlinkFormFromCheckout = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    checkoutId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Verify checkout exists and belongs to org
    const checkout = await ctx.db.get(args.checkoutId);
    if (!checkout || checkout.type !== "checkout_instance" || checkout.organizationId !== args.organizationId) {
      throw new Error("Checkout not found or not accessible");
    }

    const customProps = (checkout.customProperties || {}) as Record<string, unknown>;
    const existingBehaviors = (customProps.behaviors || []) as Array<{ type: string; config?: Record<string, unknown>; priority?: number }>;
    const previousFormId = customProps.linkedFormId;

    // Remove form_linking and legacy form-collection behaviors
    const filteredBehaviors = existingBehaviors.filter(b => b.type !== "form_linking" && b.type !== "form-collection");

    const now = Date.now();

    // Update checkout to remove form link
    await ctx.db.patch(args.checkoutId, {
      customProperties: {
        ...customProps,
        linkedFormId: undefined,
        behaviors: filteredBehaviors,
      },
      updatedAt: now,
    });

    // Remove object link
    const existingLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", q => q.eq("fromObjectId", args.checkoutId).eq("linkType", "checkout_form"))
      .first();

    if (existingLink) {
      await ctx.db.delete(existingLink._id);
    }

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.checkoutId,
      actionType: "checkout_form_unlinked",
      actionData: {
        source: "ai_assistant",
        previousFormId,
        checkoutName: checkout.name,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return {
      success: true,
      checkoutId: args.checkoutId,
      checkoutName: checkout.name,
      previousFormId,
    };
  },
});

/**
 * ADD FORM TO CHECKOUT WORKFLOW
 *
 * Creates or updates a checkout workflow to include a form_linking behavior.
 * This is the proper way to add forms to checkouts - via workflows, not direct checkout modification.
 *
 * The workflow approach allows:
 * - External applications to trigger the same checkout flow
 * - Reusable checkout configurations
 * - Multiple behaviors in a single workflow
 */
export const internalAddFormToCheckoutWorkflow = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    formId: v.id("objects"),
    workflowName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify form exists and belongs to org
    const form = await ctx.db.get(args.formId);
    if (!form || form.type !== "form" || form.organizationId !== args.organizationId) {
      throw new Error("Form not found or not accessible");
    }

    const now = Date.now();

    // Find existing checkout_start workflow
    const allWorkflows = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q => q.eq("organizationId", args.organizationId).eq("type", "workflow"))
      .filter(q => {
        // Filter out archived/deleted workflows
        return q.and(
          q.neq(q.field("status"), "archived"),
          q.neq(q.field("status"), "deleted")
        );
      })
      .collect();

    // Find the one with checkout_start trigger
    let workflow = allWorkflows.find(w => {
      const customProps = w.customProperties as Record<string, unknown> | undefined;
      const execution = customProps?.execution as { triggerOn?: string } | undefined;
      return execution?.triggerOn === "checkout_start";
    }) || null;

    if (!workflow) {
      // Create new checkout workflow
      const workflowId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "workflow",
        subtype: "checkout_behavior",
        name: args.workflowName || "Checkout Form Collection",
        description: `Automatically collects form "${form.name}" during checkout`,
        status: "active", // Auto-enable so it works immediately
        createdBy: args.userId,
        createdAt: now,
        updatedAt: now,
        customProperties: {
          objects: [],
          behaviors: [{
            id: `bhv_form_${now}`,
            type: "form_linking",
            enabled: true,
            priority: 100,
            config: {
              formId: args.formId,
              timing: "duringCheckout",
            },
            metadata: {
              createdAt: now,
              createdBy: args.userId,
              formName: form.name,
            },
          }],
          execution: {
            triggerOn: "checkout_start",
            errorHandling: "continue",
          },
        },
      });

      // Log action
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: workflowId,
        actionType: "workflow_created_with_form",
        actionData: {
          source: "ai_assistant",
          formId: args.formId,
          formName: form.name,
        },
        performedBy: args.userId,
        performedAt: now,
      });

      return {
        success: true,
        action: "created",
        workflowId,
        workflowName: args.workflowName || "Checkout Form Collection",
        formId: args.formId,
        formName: form.name,
      };
    }

    // Update existing workflow - add or replace form_linking behavior
    const customProps = (workflow.customProperties || {}) as Record<string, unknown>;
    const existingBehaviors = (customProps.behaviors || []) as Array<{
      id: string;
      type: string;
      enabled: boolean;
      priority?: number;
      config?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }>;

    // Remove any existing form_linking behaviors
    const filteredBehaviors = existingBehaviors.filter(b => b.type !== "form_linking");

    // Add new form_linking behavior
    filteredBehaviors.push({
      id: `bhv_form_${now}`,
      type: "form_linking",
      enabled: true,
      priority: 100,
      config: {
        formId: args.formId,
        timing: "duringCheckout",
      },
      metadata: {
        createdAt: now,
        createdBy: args.userId,
        formName: form.name,
      },
    });

    // Update workflow
    await ctx.db.patch(workflow._id, {
      customProperties: {
        ...customProps,
        behaviors: filteredBehaviors,
      },
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: workflow._id,
      actionType: "workflow_form_updated",
      actionData: {
        source: "ai_assistant",
        formId: args.formId,
        formName: form.name,
        previousBehaviorCount: existingBehaviors.length,
        newBehaviorCount: filteredBehaviors.length,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return {
      success: true,
      action: "updated",
      workflowId: workflow._id,
      workflowName: workflow.name,
      formId: args.formId,
      formName: form.name,
    };
  },
});

/**
 * REMOVE FORM FROM CHECKOUT WORKFLOW
 *
 * Removes form_linking behavior from checkout workflow.
 */
export const internalRemoveFormFromCheckoutWorkflow = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find checkout_start workflow
    const workflows = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q => q.eq("organizationId", args.organizationId).eq("type", "workflow"))
      .filter(q => q.neq(q.field("status"), "archived"))
      .collect();

    // Find the one with checkout_start trigger
    const workflow = workflows.find(w => {
      const customProps = w.customProperties as Record<string, unknown> | undefined;
      const execution = customProps?.execution as { triggerOn?: string } | undefined;
      return execution?.triggerOn === "checkout_start";
    });

    if (!workflow) {
      return {
        success: false,
        error: "No checkout workflow found",
      };
    }

    const customProps = (workflow.customProperties || {}) as Record<string, unknown>;
    const existingBehaviors = (customProps.behaviors || []) as Array<{
      id: string;
      type: string;
      config?: Record<string, unknown>;
    }>;

    // Find the form_linking behavior to get form info before removing
    const formBehavior = existingBehaviors.find(b => b.type === "form_linking");
    const previousFormId = formBehavior?.config?.formId;

    // Remove form_linking behaviors
    const filteredBehaviors = existingBehaviors.filter(b => b.type !== "form_linking");

    // Update workflow
    await ctx.db.patch(workflow._id, {
      customProperties: {
        ...customProps,
        behaviors: filteredBehaviors,
      },
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: workflow._id,
      actionType: "workflow_form_removed",
      actionData: {
        source: "ai_assistant",
        previousFormId,
      },
      performedBy: args.userId,
      performedAt: now,
    });

    return {
      success: true,
      workflowId: workflow._id,
      workflowName: workflow.name,
      previousFormId,
    };
  },
});
