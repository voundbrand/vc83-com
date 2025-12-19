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
    const updates: any = {};

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
