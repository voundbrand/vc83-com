/**
 * FORMS ONTOLOGY
 *
 * Manages forms (templates) and form responses using the universal ontology system.
 *
 * KEY ARCHITECTURE DECISION:
 * Forms are templates that COLLECT data, but the data is EMBEDDED into tickets
 * for fast operational queries at events (QR scanning, reporting, check-in).
 *
 * Data Flow:
 * 1. Form (template) → User fills form → FormResponse (audit trail)
 * 2. FormResponse data → COPIED to ticket.registrationData (operational use)
 * 3. Event managers query tickets directly (no joins needed)
 *
 * Form Types (subtype):
 * - "registration" - Event registration forms (linked to tickets)
 * - "survey" - Feedback surveys (standalone or post-event)
 * - "application" - Speaker proposals, volunteer applications
 *
 * Form Status:
 * - "draft" - Being built
 * - "published" - Active and accepting submissions
 * - "archived" - No longer accepting submissions
 *
 * FormResponse Status:
 * - "partial" - Started but not completed
 * - "complete" - Successfully submitted
 * - "abandoned" - User left before completion
 */

import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, checkPermission } from "./rbacHelpers";
import { checkResourceLimit, checkFeatureAccess, getLicenseInternal } from "./licensing/helpers";
import { ConvexError } from "convex/values";

// Helper function for tier upgrade path
function getNextTier(
  currentTier: "free" | "starter" | "professional" | "agency" | "enterprise"
): string {
  const tierUpgradePath: Record<string, string> = {
    free: "Starter (€199/month)",
    starter: "Professional (€399/month)",
    professional: "Agency (€599/month)",
    agency: "Enterprise (€1,500+/month)",
    enterprise: "Enterprise (contact sales)",
  };
  return tierUpgradePath[currentTier] || "a higher tier";
}

/**
 * FIELD TYPE DEFINITIONS
 * These are the supported form field types
 */
export const FIELD_TYPES = {
  TEXT: "text",
  TEXTAREA: "textarea",
  EMAIL: "email",
  PHONE: "phone",
  NUMBER: "number",
  DATE: "date",
  TIME: "time",
  DATETIME: "datetime",
  SELECT: "select",
  RADIO: "radio",
  CHECKBOX: "checkbox",
  MULTI_SELECT: "multi_select",
  FILE: "file",
  RATING: "rating",
  SECTION_HEADER: "section_header",
} as const;

/**
 * CONDITIONAL LOGIC OPERATORS
 */
export const OPERATORS = {
  EQUALS: "equals",
  NOT_EQUALS: "notEquals",
  IN: "in",
  NOT_IN: "notIn",
  GREATER_THAN: "gt",
  LESS_THAN: "lt",
  CONTAINS: "contains",
  IS_EMPTY: "isEmpty",
  IS_NOT_EMPTY: "isNotEmpty",
} as const;

/**
 * GET FORMS
 * Returns all forms for an organization
 */
export const getForms = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()), // Filter by form type
    status: v.optional(v.string()),  // Filter by status
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const q = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "form")
      );

    let forms = await q.collect();

    // Apply filters
    if (args.subtype) {
      forms = forms.filter((f) => f.subtype === args.subtype);
    }

    if (args.status) {
      forms = forms.filter((f) => f.status === args.status);
    }

    return forms;
  },
});

/**
 * INTERNAL GET FORMS
 * Internal query for AI tools and actions that already have organizationId
 * This bypasses session authentication since the action layer is already authenticated
 */
export const internalGetForms = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()), // Filter by form type
    status: v.optional(v.string()),  // Filter by status
  },
  handler: async (ctx, args) => {
    const q = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "form")
      );

    let forms = await q.collect();

    // Apply filters
    if (args.subtype) {
      forms = forms.filter((f) => f.subtype === args.subtype);
    }

    if (args.status) {
      forms = forms.filter((f) => f.status === args.status);
    }

    return forms;
  },
});

/**
 * GET FORM
 * Get a single form by ID
 */
export const getForm = query({
  args: {
    sessionId: v.string(),
    formId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const form = await ctx.db.get(args.formId);

    if (!form || !("type" in form) || form.type !== "form") {
      throw new Error("Form not found");
    }

    return form;
  },
});

/**
 * INTERNAL GET FORM
 * Internal query for AI tools and actions that already have organizationId
 */
export const internalGetForm = internalQuery({
  args: {
    formId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);

    if (!form || !("type" in form) || form.type !== "form") {
      throw new Error("Form not found");
    }

    return form;
  },
});

/**
 * GET PUBLIC FORM
 * Get a single published form by ID (no authentication required)
 * Used by public checkout pages
 */
export const getPublicForm = query({
  args: {
    formId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);

    if (!form || !("type" in form) || form.type !== "form") {
      return null;
    }

    // Only return published forms to public
    if (form.status !== "published") {
      return null;
    }

    return form;
  },
});

/**
 * CREATE FORM
 * Create a new form template
 */
export const createForm = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.string(), // "registration" | "survey" | "application"
    name: v.string(),
    description: v.optional(v.string()),
    formSchema: v.any(), // Complex nested structure - validated in customProperties
    eventId: v.optional(v.id("objects")), // Optional: Link form to a specific event
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // CHECK LICENSE LIMIT: Enforce form limit for organization's tier
    // Free: 3, Starter: 20, Pro: 100, Agency: Unlimited, Enterprise: Unlimited
    await checkResourceLimit(ctx, args.organizationId, "form", "maxForms");

    // Validate event exists if provided
    if (args.eventId) {
      const event = await ctx.db.get(args.eventId);
      if (!event || event.type !== "event") {
        throw new Error("Event not found");
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
        eventId: args.eventId, // Store event link
        formSchema: args.formSchema || {
          version: "1.0",
          fields: [],
          settings: {
            allowMultipleSubmissions: false,
            showProgressBar: true,
            submitButtonText: "Submit",
            successMessage: "Thank you for your submission!",
            redirectUrl: null,
            displayMode: "all", // "all" | "single-question" | "section-by-section" | "paginated"
          },
          sections: [],
        },
        stats: {
          views: 0,
          submissions: 0,
          completionRate: 0,
        },
      },
      createdBy: userId,
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
        createdAt: now,
      });
    }

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: formId,
      actionType: "created",
      performedBy: userId,
      performedAt: Date.now(),
      actionData: {
        status: "draft",
        eventId: args.eventId,
      },
    });

    return formId;
  },
});

/**
 * UPDATE FORM
 * Update an existing form
 */
export const updateForm = mutation({
  args: {
    sessionId: v.string(),
    formId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    subtype: v.optional(v.string()), // Allow updating form type
    formSchema: v.optional(v.any()),
    status: v.optional(v.string()),
    eventId: v.optional(v.union(v.id("objects"), v.null())), // Allow updating event link
    publicUrl: v.optional(v.union(v.string(), v.null())), // Allow updating public URL
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const form = await ctx.db.get(args.formId);
    if (!form || !("type" in form) || form.type !== "form") {
      throw new Error("Form not found");
    }

    // Validate event if provided
    if (args.eventId !== undefined && args.eventId !== null) {
      const event = await ctx.db.get(args.eventId);
      if (!event || event.type !== "event") {
        throw new Error("Event not found");
      }
    }

    const updates: Record<string, unknown> = {};
    const changes: Record<string, unknown> = {};

    if (args.name !== undefined) {
      updates.name = args.name;
      changes.name = { from: form.name, to: args.name };
    }

    if (args.description !== undefined) {
      updates.description = args.description;
      changes.description = { from: form.description, to: args.description };
    }

    if (args.subtype !== undefined) {
      updates.subtype = args.subtype;
      changes.subtype = { from: form.subtype, to: args.subtype };
    }

    if (args.status !== undefined) {
      updates.status = args.status;
      changes.status = { from: form.status, to: args.status };
    }

    if (args.formSchema !== undefined) {
      // CHECK FEATURE ACCESS: Multi-step forms, conditional logic, and file uploads require Starter tier
      const schema = args.formSchema;

      // Check multi-step forms (displayMode != "all")
      if (schema?.settings?.displayMode && schema.settings.displayMode !== "all") {
        await checkFeatureAccess(ctx, form.organizationId, "multiStepFormsEnabled");
      }

      // Check conditional logic (any field has conditions)
      if (schema?.fields && Array.isArray(schema.fields)) {
        const hasConditionalLogic = schema.fields.some((field: { conditionalLogic?: unknown }) =>
          field.conditionalLogic !== undefined && field.conditionalLogic !== null
        );
        if (hasConditionalLogic) {
          await checkFeatureAccess(ctx, form.organizationId, "conditionalLogicEnabled");
        }

        // Check file uploads (any field is type "file")
        const hasFileUploads = schema.fields.some((field: { type?: string }) =>
          field.type === "file"
        );
        if (hasFileUploads) {
          await checkFeatureAccess(ctx, form.organizationId, "fileUploadsEnabled");
        }
      }

      updates.customProperties = {
        ...form.customProperties,
        formSchema: args.formSchema,
      };
      changes.formSchema = "updated";
    }

    // Update eventId in customProperties
    if (args.eventId !== undefined) {
      updates.customProperties = {
        ...(updates.customProperties || form.customProperties),
        eventId: args.eventId,
      };
      changes.eventId = { from: form.customProperties?.eventId, to: args.eventId };
    }

    // Update publicUrl in customProperties
    if (args.publicUrl !== undefined) {
      updates.customProperties = {
        ...(updates.customProperties || form.customProperties),
        publicUrl: args.publicUrl,
      };
      changes.publicUrl = { from: form.customProperties?.publicUrl, to: args.publicUrl };
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = Date.now();
      await ctx.db.patch(args.formId, updates);
    }

    // Handle event link updates
    if (args.eventId !== undefined) {
      // Delete existing event link
      const existingLinks = await ctx.db
        .query("objectLinks")
        .filter((q) =>
          q.and(
            q.eq(q.field("fromObjectId"), args.formId),
            q.eq(q.field("linkType"), "form_for")
          )
        )
        .collect();

      for (const link of existingLinks) {
        await ctx.db.delete(link._id);
      }

      // Create new event link if eventId is provided (not null)
      if (args.eventId !== null) {
        await ctx.db.insert("objectLinks", {
          organizationId: form.organizationId,
          fromObjectId: args.formId,
          toObjectId: args.eventId,
          linkType: "form_for",
          properties: {},
          createdAt: Date.now(),
        });
      }
    }

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: form.organizationId,
      objectId: args.formId,
      actionType: "updated",
      performedBy: userId,
      performedAt: Date.now(),
      actionData: changes,
    });
  },
});

/**
 * DELETE FORM
 * Permanently delete a form
 */
export const deleteForm = mutation({
  args: {
    sessionId: v.string(),
    formId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const form = await ctx.db.get(args.formId);
    if (!form || !("type" in form) || form.type !== "form") {
      throw new Error("Form not found");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_forms",
      form.organizationId
    );

    if (!hasPermission) {
      throw new Error("You do not have permission to delete forms");
    }

    // Log the action before deleting
    await ctx.db.insert("objectActions", {
      organizationId: form.organizationId,
      objectId: args.formId,
      actionType: "deleted",
      performedBy: userId,
      performedAt: Date.now(),
      actionData: {
        formName: form.name,
        formType: form.subtype,
        previousStatus: form.status,
      },
    });

    // Hard delete the form
    await ctx.db.delete(args.formId);

    return { success: true };
  },
});

/**
 * GET FORM RESPONSES
 * Get all responses for a form
 */
export const getFormResponses = query({
  args: {
    sessionId: v.string(),
    formId: v.id("objects"),
    status: v.optional(v.string()), // Filter by completion status
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all form responses
    let responses = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "formResponse"))
      .collect();

    // Filter by formId
    responses = responses.filter(
      (r) => r.customProperties?.formId === args.formId
    );

    // Filter by status if provided
    if (args.status) {
      responses = responses.filter((r) => r.status === args.status);
    }

    return responses;
  },
});

/**
 * INTERNAL GET FORM RESPONSES
 * Internal query for AI tools and actions that already have organizationId
 */
export const internalGetFormResponses = internalQuery({
  args: {
    formId: v.id("objects"),
    status: v.optional(v.string()), // Filter by completion status
  },
  handler: async (ctx, args) => {
    // Get all form responses
    let responses = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "formResponse"))
      .collect();

    // Filter by formId
    responses = responses.filter(
      (r) => r.customProperties?.formId === args.formId
    );

    // Filter by status if provided
    if (args.status) {
      responses = responses.filter((r) => r.status === args.status);
    }

    return responses;
  },
});

/**
 * CREATE FORM RESPONSE
 * Submit a form response (during checkout or standalone)
 */
export const createFormResponse = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    formId: v.id("objects"),
    responses: v.any(), // The actual form data (key-value pairs)
    calculatedPricing: v.optional(v.any()), // Pricing data if applicable
    metadata: v.optional(v.any()), // IP, userAgent, duration, etc.
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get the form to verify it exists
    const form = await ctx.db.get(args.formId);
    if (!form || !("type" in form) || form.type !== "form") {
      throw new Error("Form not found");
    }

    // CHECK LICENSE LIMIT: Enforce form response limit per form
    const existingResponses = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "formResponse")
      )
      .filter((q) => {
        const customProps = q.field("customProperties") as { formId?: string } | undefined;
        return customProps?.formId === args.formId;
      })
      .collect();

    const responsesCount = existingResponses.length;
    const license = await getLicenseInternal(ctx, args.organizationId);
    const limit = license.limits.maxResponsesPerForm;

    if (limit !== -1 && responsesCount >= limit) {
      throw new ConvexError({
        code: "LIMIT_EXCEEDED",
        message: `You've reached your maxResponsesPerForm limit (${limit}). ` +
          `Upgrade to ${getNextTier(license.planTier)} for more capacity.`,
        limitKey: "maxResponsesPerForm",
        currentCount: responsesCount,
        limit,
        planTier: license.planTier,
        nextTier: getNextTier(license.planTier),
        isNested: true,
        parentId: args.formId,
      });
    }

    // Generate a name from responses (first + last name if available)
    const firstName = args.responses.first_name || args.responses.firstName || "";
    const lastName = args.responses.last_name || args.responses.lastName || "";
    const responseName = firstName && lastName
      ? `Response from ${firstName} ${lastName}`
      : `Response ${new Date().toLocaleDateString()}`;

    // Create the form response
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
        calculatedPricing: args.calculatedPricing,
        submittedAt: now,
        ...(args.metadata || {}),
      },
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Update form stats
    const currentStats = form.customProperties?.stats || {
      views: 0,
      submissions: 0,
      completionRate: 0,
    };

    // ⚡ PROFESSIONAL TIER: Form Analytics
    // Professional+ can track detailed form analytics (views, submissions, completion rates)
    const hasFormAnalytics = form.customProperties?.enableAnalytics === true;
    if (hasFormAnalytics) {
      // Check if they have access to analytics
      try {
        await checkFeatureAccess(ctx, args.organizationId, "formAnalyticsEnabled");
      } catch {
        // If they don't have access, analytics won't be detailed
        // Basic submission counting still works for all tiers
      }
    }

    await ctx.db.patch(args.formId, {
      customProperties: {
        ...form.customProperties,
        stats: {
          ...currentStats,
          submissions: currentStats.submissions + 1,
          lastSubmittedAt: now,
        },
      },
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: responseId,
      actionType: "created",
      performedBy: userId,
      performedAt: now,
      actionData: {
        status: "complete",
      },
    });

    return responseId;
  },
});

/**
 * CREATE PUBLIC FORM RESPONSE (Internal)
 * Submit a form response without authentication
 * Used by public submission API endpoint
 */
export const createPublicFormResponse = internalMutation({
  args: {
    formId: v.id("objects"),
    responses: v.any(), // The actual form data (key-value pairs)
    metadata: v.optional(v.any()), // IP, userAgent, submittedAt, etc.
  },
  handler: async (ctx, args) => {
    // Get the form to verify it exists and is published
    const form = await ctx.db.get(args.formId);
    if (!form || !("type" in form) || form.type !== "form") {
      throw new Error("Form not found");
    }

    // Only allow submissions to published forms
    if (form.status !== "published") {
      throw new Error("Form is not published");
    }

    // CHECK LICENSE LIMIT: Enforce form response limit per form
    const existingResponses = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", form.organizationId).eq("type", "formResponse")
      )
      .filter((q) => {
        const customProps = q.field("customProperties") as { formId?: string } | undefined;
        return customProps?.formId === args.formId;
      })
      .collect();

    const responsesCount = existingResponses.length;
    const license = await getLicenseInternal(ctx, form.organizationId);
    const limit = license.limits.maxResponsesPerForm;

    if (limit !== -1 && responsesCount >= limit) {
      throw new ConvexError({
        code: "LIMIT_EXCEEDED",
        message: `You've reached your maxResponsesPerForm limit (${limit}). ` +
          `Upgrade to ${getNextTier(license.planTier)} for more capacity.`,
        limitKey: "maxResponsesPerForm",
        currentCount: responsesCount,
        limit,
        planTier: license.planTier,
        nextTier: getNextTier(license.planTier),
        isNested: true,
        parentId: args.formId,
      });
    }

    // Generate a name from responses (first + last name if available)
    const firstName = args.responses.first_name || args.responses.firstName || args.responses.contact_name || "";
    const lastName = args.responses.last_name || args.responses.lastName || "";
    const responseName = firstName && lastName
      ? `Response from ${firstName} ${lastName}`
      : firstName
      ? `Response from ${firstName}`
      : `Response ${new Date().toLocaleDateString()}`;

    // Create the form response
    const now = Date.now();
    const responseId = await ctx.db.insert("objects", {
      organizationId: form.organizationId,
      type: "formResponse",
      subtype: form.subtype || "registration",
      name: responseName,
      description: `Public form submission for ${form.name}`,
      status: "complete",
      customProperties: {
        formId: args.formId,
        responses: args.responses,
        submittedAt: args.metadata?.submittedAt || now,
        userAgent: args.metadata?.userAgent,
        ipAddress: args.metadata?.ipAddress,
        isPublicSubmission: true,
      },
      createdBy: undefined, // No user ID for public submissions
      createdAt: now,
      updatedAt: now,
    });

    // Update form stats
    const currentStats = form.customProperties?.stats || {
      views: 0,
      submissions: 0,
      completionRate: 0,
    };

    await ctx.db.patch(args.formId, {
      customProperties: {
        ...form.customProperties,
        stats: {
          ...currentStats,
          submissions: currentStats.submissions + 1,
        },
      },
      updatedAt: Date.now(),
    });

    // Log the action (no user, public submission)
    await ctx.db.insert("objectActions", {
      organizationId: form.organizationId,
      objectId: responseId,
      actionType: "created",
      performedBy: undefined, // No user ID for public submissions
      performedAt: now,
      actionData: {
        status: "complete",
        isPublicSubmission: true,
      },
    });

    return responseId;
  },
});

/**
 * GET FORM RESPONSE
 * Get a single form response
 */
export const getFormResponse = query({
  args: {
    sessionId: v.string(),
    responseId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const response = await ctx.db.get(args.responseId);

    if (!response || !("type" in response) || response.type !== "formResponse") {
      throw new Error("Form response not found");
    }

    return response;
  },
});

/**
 * LINK FORM TO TICKET
 * Create an objectLink between a ticket/product and a form
 */
export const linkFormToTicket = mutation({
  args: {
    sessionId: v.string(),
    ticketId: v.id("objects"),
    formId: v.id("objects"),
    timing: v.string(), // "duringCheckout" | "afterPurchase" | "standalone"
    required: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Verify both objects exist
    const ticket = await ctx.db.get(args.ticketId);
    const form = await ctx.db.get(args.formId);

    if (!ticket || !("type" in ticket) || ticket.type !== "product") {
      throw new Error("Ticket not found");
    }

    if (!form || !("type" in form) || form.type !== "form") {
      throw new Error("Form not found");
    }

    // Create the link
    const linkId = await ctx.db.insert("objectLinks", {
      organizationId: ticket.organizationId,
      fromObjectId: args.ticketId,
      toObjectId: args.formId,
      linkType: "requiresForm",
      properties: {
        timing: args.timing,
        required: args.required,
      },
      createdBy: userId,
      createdAt: Date.now(),
    });

    return linkId;
  },
});

/**
 * GET LINKED FORM FOR TICKET
 * Get the form associated with a ticket/product
 */
export const getLinkedForm = query({
  args: {
    sessionId: v.string(),
    ticketId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Find the link
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.ticketId))
      .collect();

    const formLink = links.find((link) => link.linkType === "requiresForm");

    if (!formLink) {
      return null;
    }

    // Get the form
    const form = await ctx.db.get(formLink.toObjectId);

    if (!form || !("type" in form) || form.type !== "form") {
      return null;
    }

    return {
      form,
      linkProperties: formLink.properties,
    };
  },
});

/**
 * PUBLISH FORM
 * Changes form status from draft to published
 */
export const publishForm = mutation({
  args: {
    sessionId: v.string(),
    formId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const form = await ctx.db.get(args.formId);
    if (!form || !("type" in form) || form.type !== "form") {
      throw new Error("Form not found");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_forms",
      form.organizationId
    );

    if (!hasPermission) {
      throw new Error("Permission denied: manage_forms required to publish forms");
    }

    // Update status to published
    await ctx.db.patch(args.formId, {
      status: "published",
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: form.organizationId,
      objectId: args.formId,
      actionType: "form_published",
      actionData: {},
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * UNPUBLISH FORM
 * Changes form status from published back to draft
 */
export const unpublishForm = mutation({
  args: {
    sessionId: v.string(),
    formId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const form = await ctx.db.get(args.formId);
    if (!form || !("type" in form) || form.type !== "form") {
      throw new Error("Form not found");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_forms",
      form.organizationId
    );

    if (!hasPermission) {
      throw new Error("Permission denied: manage_forms required to unpublish forms");
    }

    // Update status to draft
    await ctx.db.patch(args.formId, {
      status: "draft",
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: form.organizationId,
      objectId: args.formId,
      actionType: "form_unpublished",
      actionData: {},
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DUPLICATE FORM
 * Create a copy of an existing form with "Copy of [name]"
 */
export const duplicateForm = mutation({
  args: {
    sessionId: v.string(),
    formId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const form = await ctx.db.get(args.formId);
    if (!form || !("type" in form) || form.type !== "form") {
      throw new Error("Form not found");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_forms",
      form.organizationId
    );

    if (!hasPermission) {
      throw new Error("Permission denied: manage_forms required to duplicate forms");
    }

    // Create the duplicated form
    const now = Date.now();
    const newFormId = await ctx.db.insert("objects", {
      organizationId: form.organizationId,
      type: "form",
      subtype: form.subtype,
      name: `Copy of ${form.name}`,
      description: form.description || "",
      status: "draft", // Always start as draft
      customProperties: {
        ...form.customProperties,
        // Reset stats for the new form
        stats: {
          views: 0,
          submissions: 0,
          completionRate: 0,
        },
      },
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // If the original form has an event link, copy it
    const eventId = form.customProperties?.eventId;
    if (eventId) {
      await ctx.db.insert("objectLinks", {
        organizationId: form.organizationId,
        fromObjectId: newFormId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toObjectId: eventId as any,
        linkType: "form_for",
        properties: {},
        createdAt: now,
      });
    }

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: form.organizationId,
      objectId: newFormId,
      actionType: "created",
      performedBy: userId,
      performedAt: now,
      actionData: {
        status: "draft",
        duplicatedFrom: args.formId,
      },
    });

    return newFormId;
  },
});

/**
 * INTERNAL DUPLICATE FORM
 * Internal mutation for AI tools that already have userId and organizationId
 */
export const internalDuplicateForm = internalMutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    formId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form || !("type" in form) || form.type !== "form") {
      throw new Error("Form not found");
    }

    // Verify form belongs to the organization
    if (form.organizationId !== args.organizationId) {
      throw new Error("Form does not belong to this organization");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      args.userId,
      "manage_forms",
      form.organizationId
    );

    if (!hasPermission) {
      throw new Error("Permission denied: manage_forms required to duplicate forms");
    }

    // Create the duplicated form
    const now = Date.now();
    const newFormId = await ctx.db.insert("objects", {
      organizationId: form.organizationId,
      type: "form",
      subtype: form.subtype,
      name: `Copy of ${form.name}`,
      description: form.description || "",
      status: "draft", // Always start as draft
      customProperties: {
        ...form.customProperties,
        // Reset stats for the new form
        stats: {
          views: 0,
          submissions: 0,
          completionRate: 0,
        },
      },
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    // If the original form has an event link, copy it
    const eventId = form.customProperties?.eventId;
    if (eventId) {
      await ctx.db.insert("objectLinks", {
        organizationId: form.organizationId,
        fromObjectId: newFormId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toObjectId: eventId as any,
        linkType: "form_for",
        properties: {},
        createdAt: now,
      });
    }

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: form.organizationId,
      objectId: newFormId,
      actionType: "created",
      performedBy: args.userId,
      performedAt: now,
      actionData: {
        status: "draft",
        duplicatedFrom: args.formId,
      },
    });

    return newFormId;
  },
});

/**
 * INTERNAL UPDATE FORM
 * Internal mutation for AI tools to update form properties
 */
export const internalUpdateForm = internalMutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    formId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form || !("type" in form) || form.type !== "form") {
      throw new Error("Form not found");
    }

    // Verify form belongs to the organization
    if (form.organizationId !== args.organizationId) {
      throw new Error("Form does not belong to this organization");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      args.userId,
      "manage_forms",
      form.organizationId
    );

    if (!hasPermission) {
      throw new Error("Permission denied: manage_forms required to update forms");
    }

    // Build update object
    const updates: {
      updatedAt: number;
      name?: string;
      description?: string;
      status?: string;
    } = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    if (args.status !== undefined) {
      updates.status = args.status;
    }

    // Update the form
    await ctx.db.patch(args.formId, updates);

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: form.organizationId,
      objectId: args.formId,
      actionType: "updated",
      performedBy: args.userId,
      performedAt: Date.now(),
      actionData: {
        updates: {
          name: args.name,
          description: args.description,
          status: args.status,
        },
      },
    });

    return { success: true };
  },
});

/**
 * SAVE FORM AS TEMPLATE
 * Save a form's schema as a reusable template in the system organization
 */
export const saveFormAsTemplate = mutation({
  args: {
    sessionId: v.string(),
    formId: v.id("objects"),
    templateName: v.string(),
    templateDescription: v.optional(v.string()),
    templateCode: v.string(), // Unique code for the template
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const form = await ctx.db.get(args.formId);
    if (!form || !("type" in form) || form.type !== "form") {
      throw new Error("Form not found");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_forms",
      form.organizationId
    );

    if (!hasPermission) {
      throw new Error("Permission denied: manage_forms required to save templates");
    }

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Check if template code already exists
    const existingTemplate = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "form"))
      .filter((q) => q.eq(q.field("customProperties.code"), args.templateCode))
      .first();

    if (existingTemplate) {
      throw new Error(`Template with code "${args.templateCode}" already exists`);
    }

    // Extract the form schema
    const formSchema = form.customProperties?.formSchema;
    if (!formSchema) {
      throw new Error("Form does not have a schema to save as template");
    }

    // Create the template in the system organization
    const now = Date.now();
    const templateId = await ctx.db.insert("objects", {
      organizationId: systemOrg._id,
      type: "template",
      subtype: "form",
      name: args.templateName,
      description: args.templateDescription || "",
      status: "published",
      customProperties: {
        code: args.templateCode,
        description: args.templateDescription || "",
        category: form.subtype || "registration",
        formSchema: formSchema,
        createdFromForm: args.formId,
        originalOrganizationId: form.organizationId,
      },
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Auto-enable this template for the current organization
    await ctx.db.insert("objects", {
      organizationId: form.organizationId,
      type: "form_template_availability",
      name: `Form Template Availability: ${args.templateCode}`,
      status: "active",
      customProperties: {
        templateCode: args.templateCode,
        available: true,
        enabledBy: userId,
        enabledAt: now,
      },
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: form.organizationId,
      objectId: templateId,
      actionType: "template_created",
      performedBy: userId,
      performedAt: now,
      actionData: {
        templateCode: args.templateCode,
        sourceFormId: args.formId,
      },
    });

    return templateId;
  },
});
