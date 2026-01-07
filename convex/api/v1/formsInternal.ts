/**
 * INTERNAL FORMS FUNCTIONS
 *
 * Internal queries and mutations used by the MCP server and API endpoints.
 * These bypass session authentication since API keys are used instead.
 *
 * Follows the same patterns as eventsInternal.ts and productsInternal.ts.
 */

import { internalQuery, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";

/**
 * GET FORM INTERNAL
 * Returns form schema without requiring session authentication
 */
export const getFormInternal = internalQuery({
  args: {
    formId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get form
    const form = await ctx.db.get(args.formId);

    if (!form || form.type !== "form") {
      return null;
    }

    // Verify organization ownership
    if (form.organizationId !== args.organizationId) {
      return null;
    }

    const customProps = form.customProperties as Record<string, unknown> | undefined;

    // Transform for API response
    return {
      id: form._id,
      organizationId: form.organizationId, // ✅ Added for frontend
      name: form.name,
      description: form.description,
      status: form.status,
      subtype: form.subtype, // ✅ Added: form type (survey, registration, etc.)
      fields: (customProps?.fields as unknown[]) || [],
      settings: (customProps?.settings as Record<string, unknown>) || {
        submitButtonText: "Submit",
        successMessage: "Form submitted successfully",
      },
      translations: (customProps?.translations as Record<string, unknown>) || {},
      customProperties: {
        formSchema: customProps?.formSchema, // ✅ Added: Full form schema for frontend
        ...customProps, // Include other custom properties
      },
    };
  },
});

/**
 * CHECK RATE LIMIT
 * Count recent form submissions from a specific IP address
 *
 * Used for rate limiting public form submissions
 * Returns the number of submissions from this IP for this form since the given timestamp
 */
export const checkRateLimit = internalQuery({
  args: {
    formId: v.id("objects"),
    ipAddress: v.string(),
    since: v.number(), // Timestamp - check submissions after this time
  },
  handler: async (ctx, args) => {
    // Get all form responses for this form
    const allResponses = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "formResponse"))
      .collect();

    // Filter by formId, IP address, and time window
    const recentSubmissions = allResponses.filter((response) => {
      const customProps = response.customProperties as Record<string, unknown> | undefined;
      const responseFormId = customProps?.formId;
      const responseIp = customProps?.ipAddress as string | undefined;
      const submittedAt = customProps?.submittedAt as number | undefined;

      return (
        responseFormId === args.formId &&
        responseIp === args.ipAddress &&
        submittedAt &&
        submittedAt >= args.since
      );
    });

    return recentSubmissions.length;
  },
});

// ============================================================================
// FORM MUTATION OPERATIONS (FOR MCP SERVER)
// ============================================================================

/**
 * CREATE FORM INTERNAL
 *
 * Creates a new form without requiring session authentication.
 * Used by MCP server for AI-driven form creation.
 */
export const createFormInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.string(), // "registration" | "survey" | "application"
    name: v.string(),
    description: v.optional(v.string()),
    formSchema: v.optional(v.any()),
    eventId: v.optional(v.id("objects")),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Validate subtype
    const validSubtypes = ["registration", "survey", "application"];
    if (!validSubtypes.includes(args.subtype)) {
      throw new Error(
        `Invalid form subtype. Must be one of: ${validSubtypes.join(", ")}`
      );
    }

    // Validate event if provided
    if (args.eventId) {
      const event = await ctx.db.get(args.eventId);
      if (!event || event.type !== "event") {
        throw new Error("Invalid event ID");
      }
    }

    // Create the form object
    const now = Date.now();
    const formId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "form",
      subtype: args.subtype,
      name: args.name,
      description: args.description || "",
      status: "draft",
      customProperties: {
        eventId: args.eventId,
        formSchema: args.formSchema || {
          version: "1.0",
          fields: [],
          settings: {
            allowMultipleSubmissions: false,
            showProgressBar: true,
            submitButtonText: "Submit",
            successMessage: "Thank you for your submission!",
            redirectUrl: null,
            displayMode: "all",
          },
          sections: [],
        },
        stats: {
          views: 0,
          submissions: 0,
          completionRate: 0,
        },
      },
      createdBy: args.performedBy,
      createdAt: now,
      updatedAt: now,
    });

    // Create objectLink: form --[form_for]--> event (if event provided)
    if (args.eventId) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: formId,
        toObjectId: args.eventId,
        linkType: "form_for",
        properties: {},
        createdBy: args.performedBy,
        createdAt: now,
      });
    }

    // Log creation action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: formId,
        actionType: "created",
        actionData: {
          source: "mcp",
          subtype: args.subtype,
          eventId: args.eventId,
        },
        performedBy: args.performedBy,
        performedAt: now,
      });
    }

    return { formId };
  },
});

/**
 * UPDATE FORM INTERNAL
 *
 * Updates an existing form without requiring session authentication.
 * Used by MCP server for AI-driven form updates.
 */
export const updateFormInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    formId: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      subtype: v.optional(v.string()),
      status: v.optional(v.string()), // "draft" | "published" | "archived"
      formSchema: v.optional(v.any()),
      eventId: v.optional(v.union(v.id("objects"), v.null())),
    }),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Get form
    const form = await ctx.db.get(args.formId as Id<"objects">);

    if (!form) {
      throw new Error("Form not found");
    }

    // 2. Verify organization access
    if (form.organizationId !== args.organizationId) {
      throw new Error("Form not found");
    }

    // 3. Verify it's a form
    if (form.type !== "form") {
      throw new Error("Form not found");
    }

    // 4. Validate subtype if provided
    if (args.updates.subtype !== undefined) {
      const validSubtypes = ["registration", "survey", "application"];
      if (!validSubtypes.includes(args.updates.subtype)) {
        throw new Error(
          `Invalid form subtype. Must be one of: ${validSubtypes.join(", ")}`
        );
      }
    }

    // 5. Validate status if provided
    if (args.updates.status !== undefined) {
      const validStatuses = ["draft", "published", "archived"];
      if (!validStatuses.includes(args.updates.status)) {
        throw new Error(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }
    }

    // 6. Validate event if provided
    if (args.updates.eventId !== undefined && args.updates.eventId !== null) {
      const event = await ctx.db.get(args.updates.eventId);
      if (!event || event.type !== "event") {
        throw new Error("Invalid event ID");
      }
    }

    // 7. Build update object
    const dbUpdates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.updates.name !== undefined) dbUpdates.name = args.updates.name;
    if (args.updates.description !== undefined) dbUpdates.description = args.updates.description;
    if (args.updates.subtype !== undefined) dbUpdates.subtype = args.updates.subtype;
    if (args.updates.status !== undefined) dbUpdates.status = args.updates.status;

    // 8. Update customProperties
    if (args.updates.formSchema !== undefined || args.updates.eventId !== undefined) {
      const currentProps = (form.customProperties || {}) as Record<string, unknown>;
      const updatedProps: Record<string, unknown> = { ...currentProps };

      if (args.updates.formSchema !== undefined) {
        updatedProps.formSchema = args.updates.formSchema;
      }
      if (args.updates.eventId !== undefined) {
        updatedProps.eventId = args.updates.eventId;
      }

      dbUpdates.customProperties = updatedProps;
    }

    // 9. Apply updates
    await ctx.db.patch(form._id, dbUpdates);

    // 10. Handle event link updates
    if (args.updates.eventId !== undefined) {
      // Delete existing event link
      const existingLinks = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_object", (q) => q.eq("fromObjectId", form._id))
        .collect();

      for (const link of existingLinks) {
        if (link.linkType === "form_for") {
          await ctx.db.delete(link._id);
        }
      }

      // Create new event link if eventId is provided (not null)
      if (args.updates.eventId !== null) {
        await ctx.db.insert("objectLinks", {
          organizationId: args.organizationId,
          fromObjectId: form._id,
          toObjectId: args.updates.eventId,
          linkType: "form_for",
          properties: {},
          createdBy: args.performedBy,
          createdAt: Date.now(),
        });
      }
    }

    // 11. Log update action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: form._id,
        actionType: "updated_via_mcp",
        actionData: {
          source: "mcp",
          fieldsUpdated: Object.keys(args.updates).filter(
            (k) => args.updates[k as keyof typeof args.updates] !== undefined
          ),
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return { success: true, formId: form._id };
  },
});

/**
 * DELETE FORM INTERNAL
 *
 * Permanently deletes a form.
 * Used by MCP server for AI-driven form deletion.
 */
export const deleteFormInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    formId: v.string(),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Get form
    const form = await ctx.db.get(args.formId as Id<"objects">);

    if (!form) {
      throw new Error("Form not found");
    }

    // 2. Verify organization access
    if (form.organizationId !== args.organizationId) {
      throw new Error("Form not found");
    }

    // 3. Verify it's a form
    if (form.type !== "form") {
      throw new Error("Form not found");
    }

    // 4. Log deletion action BEFORE deleting
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: form._id,
        actionType: "deleted_via_mcp",
        actionData: {
          formName: form.name,
          formType: form.subtype,
          source: "mcp",
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    // 5. Delete all links involving this form
    const linksFrom = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", form._id))
      .collect();

    const linksTo = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", form._id))
      .collect();

    for (const link of [...linksFrom, ...linksTo]) {
      await ctx.db.delete(link._id);
    }

    // 6. Permanently delete the form
    await ctx.db.delete(form._id);

    return { success: true };
  },
});

/**
 * PUBLISH FORM INTERNAL
 *
 * Sets form status to "published".
 * Used by MCP server for AI-driven form publishing.
 */
export const publishFormInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    formId: v.string(),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Get form
    const form = await ctx.db.get(args.formId as Id<"objects">);

    if (!form) {
      throw new Error("Form not found");
    }

    // 2. Verify organization access
    if (form.organizationId !== args.organizationId) {
      throw new Error("Form not found");
    }

    // 3. Verify it's a form
    if (form.type !== "form") {
      throw new Error("Form not found");
    }

    // 4. Update status to published
    await ctx.db.patch(form._id, {
      status: "published",
      updatedAt: Date.now(),
    });

    // 5. Log publish action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: form._id,
        actionType: "published_via_mcp",
        actionData: {
          formName: form.name,
          source: "mcp",
        },
        performedBy: args.performedBy,
        performedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * LIST FORMS INTERNAL
 *
 * Lists forms with filtering and pagination.
 * Used by MCP server for AI-driven form listing.
 */
export const listFormsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
    eventId: v.optional(v.id("objects")),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Query all forms for organization
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "form")
      );

    const allForms = await query.collect();

    // 2. Apply filters
    let filteredForms = allForms;

    if (args.subtype) {
      filteredForms = filteredForms.filter((f) => f.subtype === args.subtype);
    }

    if (args.status) {
      filteredForms = filteredForms.filter((f) => f.status === args.status);
    }

    if (args.eventId) {
      filteredForms = filteredForms.filter((f) => {
        const customProps = f.customProperties as Record<string, unknown> | undefined;
        return customProps?.eventId === args.eventId;
      });
    }

    // 3. Sort by creation date (newest first)
    filteredForms.sort((a, b) => b.createdAt - a.createdAt);

    // 4. Apply pagination
    const total = filteredForms.length;
    const paginatedForms = filteredForms.slice(args.offset, args.offset + args.limit);

    // 5. Format response
    const forms = paginatedForms.map((form) => {
      const customProps = form.customProperties as Record<string, unknown> | undefined;
      return {
        id: form._id,
        organizationId: form.organizationId,
        name: form.name,
        description: form.description,
        subtype: form.subtype,
        status: form.status,
        eventId: customProps?.eventId as string | undefined,
        stats: customProps?.stats as { views: number; submissions: number; completionRate: number } | undefined,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
      };
    });

    return {
      forms,
      total,
      limit: args.limit,
      offset: args.offset,
    };
  },
});

/**
 * GET FORM RESPONSES INTERNAL
 *
 * Gets all responses for a form with pagination.
 * Used by MCP server for AI-driven form response retrieval.
 */
export const getFormResponsesInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    formId: v.string(),
    status: v.optional(v.string()),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Verify form exists and belongs to organization
    const form = await ctx.db.get(args.formId as Id<"objects">);
    if (!form || form.type !== "form") {
      return { responses: [], total: 0 };
    }

    if (form.organizationId !== args.organizationId) {
      return { responses: [], total: 0 };
    }

    // 2. Get all form responses
    const allResponses = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "formResponse"))
      .collect();

    // 3. Filter by formId
    let filteredResponses = allResponses.filter((r) => {
      const customProps = r.customProperties as Record<string, unknown> | undefined;
      return customProps?.formId === args.formId;
    });

    // 4. Filter by status if provided
    if (args.status) {
      filteredResponses = filteredResponses.filter((r) => r.status === args.status);
    }

    // 5. Sort by submission time (newest first)
    filteredResponses.sort((a, b) => {
      const aProps = a.customProperties as Record<string, unknown> | undefined;
      const bProps = b.customProperties as Record<string, unknown> | undefined;
      const aTime = (aProps?.submittedAt as number) || a.createdAt;
      const bTime = (bProps?.submittedAt as number) || b.createdAt;
      return bTime - aTime;
    });

    // 6. Apply pagination
    const total = filteredResponses.length;
    const paginatedResponses = filteredResponses.slice(args.offset, args.offset + args.limit);

    // 7. Format response
    const responses = paginatedResponses.map((response) => {
      const customProps = response.customProperties as Record<string, unknown> | undefined;
      return {
        id: response._id,
        name: response.name,
        status: response.status,
        responses: customProps?.responses as Record<string, unknown> | undefined,
        submittedAt: customProps?.submittedAt as number | undefined,
        ipAddress: customProps?.ipAddress as string | undefined,
        isPublicSubmission: customProps?.isPublicSubmission as boolean | undefined,
        createdAt: response.createdAt,
      };
    });

    return {
      responses,
      total,
      limit: args.limit,
      offset: args.offset,
    };
  },
});

/**
 * CREATE FORM RESPONSE INTERNAL
 *
 * Creates a form response without session authentication.
 * Used by MCP server for AI-driven form submission.
 */
export const createFormResponseInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    formId: v.string(),
    responses: v.any(),
    metadata: v.optional(v.record(v.string(), v.any())),
    performedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 1. Verify form exists
    const form = await ctx.db.get(args.formId as Id<"objects">);
    if (!form || form.type !== "form") {
      throw new Error("Form not found");
    }

    // 2. Verify organization access
    if (form.organizationId !== args.organizationId) {
      throw new Error("Form not found");
    }

    // 3. Generate response name
    const firstName = args.responses?.first_name || args.responses?.firstName || "";
    const lastName = args.responses?.last_name || args.responses?.lastName || "";
    const responseName = firstName && lastName
      ? `Response from ${firstName} ${lastName}`
      : `Response ${new Date().toLocaleDateString()}`;

    // 4. Create the form response
    const now = Date.now();
    const responseId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "formResponse",
      subtype: form.subtype || "registration",
      name: responseName,
      description: `Form submission for ${form.name}`,
      status: "complete",
      customProperties: {
        formId: args.formId,
        responses: args.responses,
        submittedAt: now,
        source: "mcp",
        ...(args.metadata || {}),
      },
      createdBy: args.performedBy,
      createdAt: now,
      updatedAt: now,
    });

    // 5. Update form stats
    const currentStats = (form.customProperties as Record<string, unknown>)?.stats || {
      views: 0,
      submissions: 0,
      completionRate: 0,
    };

    await ctx.db.patch(form._id, {
      customProperties: {
        ...form.customProperties,
        stats: {
          ...(currentStats as Record<string, unknown>),
          submissions: ((currentStats as Record<string, number>).submissions || 0) + 1,
          lastSubmittedAt: now,
        },
      },
      updatedAt: now,
    });

    // 6. Log action
    if (args.performedBy) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: responseId,
        actionType: "created_via_mcp",
        actionData: {
          formId: args.formId,
          source: "mcp",
        },
        performedBy: args.performedBy,
        performedAt: now,
      });
    }

    return { responseId };
  },
});
