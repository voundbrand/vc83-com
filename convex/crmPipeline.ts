/**
 * CRM PIPELINE MANAGEMENT
 *
 * Multi-pipeline system with AI-first design:
 * - System Templates: Read-only pipeline templates (organizationId = "SYSTEM")
 * - User Pipelines: Copied from templates, fully customizable
 * - Multi-Pipeline: Contacts can be in multiple pipelines simultaneously
 * - AI Integration: Every operation designed for AI agent use
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";
import type { Id } from "./_generated/dataModel";
import { checkResourceLimit } from "./licensing/helpers";

// ============================================================================
// PIPELINE TEMPLATES (System)
// ============================================================================

/**
 * GET PIPELINE TEMPLATES
 * Returns all system pipeline templates (like template sets)
 */
export const getPipelineTemplates = query({
  args: {
    sessionId: v.string(),
    category: v.optional(v.string()), // "sales", "support", "onboarding"
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Query system templates
    const templates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "crm_pipeline")
      )
      .collect();

    // Filter to only templates
    const templatePipelines = templates.filter(
      (t) => (t.customProperties as { isTemplate?: boolean })?.isTemplate === true
    );

    // Filter by category if provided
    if (args.category) {
      return templatePipelines.filter((t) => t.subtype === args.category);
    }

    return templatePipelines;
  },
});

/**
 * GET TEMPLATE WITH STAGES
 * Returns a template with all its stages (sorted by order)
 */
export const getTemplateWithStages = query({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    const template = await ctx.db.get(args.templateId);
    if (!template || template.organizationId !== systemOrg._id) {
      throw new Error("Template not found");
    }

    // Get all stages linked to this template
    const stageLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.templateId))
      .filter((q) => q.eq(q.field("linkType"), "belongs_to_pipeline"))
      .collect();

    const stages = await Promise.all(
      stageLinks.map((link) => ctx.db.get(link.fromObjectId))
    );

    // Sort stages by order
    const sortedStages = stages
      .filter((s) => s !== null)
      .sort((a, b) => {
        const orderA = (a!.customProperties as { order?: number })?.order || 0;
        const orderB = (b!.customProperties as { order?: number })?.order || 0;
        return orderA - orderB;
      });

    return {
      template,
      stages: sortedStages,
    };
  },
});

/**
 * COPY TEMPLATE TO ORGANIZATION
 * Creates a user pipeline from a system template
 * This is how users "install" a pipeline - they copy it and then can customize
 */
export const copyTemplateToOrganization = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateId: v.id("objects"),
    customName: v.optional(v.string()), // Override template name
    setAsDefault: v.optional(v.boolean()), // Set as default pipeline
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) throw new Error("System organization not found");

    // Get template with stages
    const template = await ctx.db.get(args.templateId);
    if (!template || template.organizationId !== systemOrg._id) {
      throw new Error("Template not found");
    }

    // Get template stages
    const stageLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.templateId))
      .filter((q) => q.eq(q.field("linkType"), "belongs_to_pipeline"))
      .collect();

    const templateStages = await Promise.all(
      stageLinks.map((link) => ctx.db.get(link.fromObjectId))
    );

    // If setAsDefault, unset any existing default pipelines
    if (args.setAsDefault) {
      const existingPipelines = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "crm_pipeline")
        )
        .collect();

      for (const p of existingPipelines) {
        if ((p.customProperties as { isDefault?: boolean })?.isDefault) {
          await ctx.db.patch(p._id, {
            customProperties: {
              ...p.customProperties,
              isDefault: false,
            },
          });
        }
      }
    }

    // Create new pipeline for user's organization
    const newPipelineId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "crm_pipeline",
      subtype: template.subtype,
      name: args.customName || template.name,
      description: template.description,
      status: "active",
      customProperties: {
        ...template.customProperties,
        isTemplate: false,
        templateSource: args.templateId,
        isDefault: args.setAsDefault || false,
      },
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Copy all stages
    const stageIdMap = new Map<Id<"objects">, Id<"objects">>(); // Map template stage ID → new stage ID

    for (const templateStage of templateStages) {
      if (!templateStage) continue;

      const newStageId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "crm_pipeline_stage",
        subtype: templateStage.subtype,
        name: templateStage.name,
        description: templateStage.description,
        status: "active",
        customProperties: templateStage.customProperties,
        createdBy: session.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      stageIdMap.set(templateStage._id, newStageId);

      // Link stage to new pipeline
      const originalLink = stageLinks.find((l) => l.fromObjectId === templateStage._id);
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: newStageId,
        toObjectId: newPipelineId,
        linkType: "belongs_to_pipeline",
        properties: originalLink?.properties || { order: 1 },
        createdBy: session.userId,
        createdAt: Date.now(),
      });
    }

    // Log creation action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: newPipelineId,
      actionType: "created",
      actionData: {
        templateSource: args.templateId,
        templateName: template.name,
        stagesCreated: stageIdMap.size,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return {
      pipelineId: newPipelineId,
      stagesCreated: stageIdMap.size,
    };
  },
});

// ============================================================================
// USER PIPELINES
// ============================================================================

/**
 * GET ORGANIZATION PIPELINES
 * Returns all pipelines for an organization (not templates)
 */
export const getOrganizationPipelines = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const pipelines = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_pipeline")
      )
      .collect();

    // Filter out templates and archived (unless requested)
    const userPipelines = pipelines.filter((p) => {
      const props = p.customProperties as { isTemplate?: boolean };
      const isTemplate = props?.isTemplate === true;
      const isArchived = p.status === "archived";

      if (isTemplate) return false;
      if (isArchived && !args.includeArchived) return false;

      return true;
    });

    // Sort by: default first, then by creation date
    userPipelines.sort((a, b) => {
      const aIsDefault = (a.customProperties as { isDefault?: boolean })?.isDefault || false;
      const bIsDefault = (b.customProperties as { isDefault?: boolean })?.isDefault || false;

      if (aIsDefault && !bIsDefault) return -1;
      if (!aIsDefault && bIsDefault) return 1;

      return b.createdAt - a.createdAt;
    });

    return userPipelines;
  },
});

/**
 * GET PIPELINE WITH STAGES
 * Returns a user pipeline with all its stages (sorted by order)
 */
export const getPipelineWithStages = query({
  args: {
    sessionId: v.string(),
    pipelineId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const pipeline = await ctx.db.get(args.pipelineId);
    if (!pipeline || pipeline.type !== "crm_pipeline") {
      throw new Error("Pipeline not found");
    }

    // Get all stages
    const stageLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.pipelineId))
      .filter((q) => q.eq(q.field("linkType"), "belongs_to_pipeline"))
      .collect();

    const stages = await Promise.all(stageLinks.map((link) => ctx.db.get(link.fromObjectId)));

    // Sort by order
    const sortedStages = stages
      .filter((s) => s !== null)
      .sort((a, b) => {
        const orderA = (a!.customProperties as { order?: number })?.order || 0;
        const orderB = (b!.customProperties as { order?: number })?.order || 0;
        return orderA - orderB;
      });

    return {
      pipeline,
      stages: sortedStages,
    };
  },
});

/**
 * GET PIPELINE WITH STAGES AND CONTACTS
 * Returns a pipeline with all its stages and contacts grouped by stage
 * Used for the Active Pipelines Kanban view
 */
export const getPipelineWithStagesAndContacts = query({
  args: {
    sessionId: v.string(),
    pipelineId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const pipeline = await ctx.db.get(args.pipelineId);
    if (!pipeline || pipeline.type !== "crm_pipeline") {
      throw new Error("Pipeline not found");
    }

    // Get all stages
    const stageLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.pipelineId))
      .filter((q) => q.eq(q.field("linkType"), "belongs_to_pipeline"))
      .collect();

    const stages = await Promise.all(stageLinks.map((link) => ctx.db.get(link.fromObjectId)));

    // Sort by order
    const sortedStages = stages
      .filter((s) => s !== null)
      .sort((a, b) => {
        const orderA = (a!.customProperties as { order?: number })?.order || 0;
        const orderB = (b!.customProperties as { order?: number })?.order || 0;
        return orderA - orderB;
      });

    // Get contacts for each stage - using Record<string, unknown> for dynamic contact data
    const contactsByStage: Record<string, Record<string, unknown>[]> = {};

    for (const stage of sortedStages) {
      if (!stage) continue;

      // Get all links to this stage
      const links = await ctx.db
        .query("objectLinks")
        .withIndex("by_to_object", (q) => q.eq("toObjectId", stage._id))
        .filter((q) => q.eq(q.field("linkType"), "in_pipeline"))
        .collect();

      // Get contact objects
      const contacts = await Promise.all(
        links.map(async (link) => {
          const contact = await ctx.db.get(link.fromObjectId);
          return contact
            ? {
                ...contact,
                pipelineData: link.properties,
              }
            : null;
        })
      );

      contactsByStage[stage._id] = contacts.filter((c) => c !== null);
    }

    return {
      pipeline,
      stages: sortedStages,
      contactsByStage,
    };
  },
});

/**
 * UPDATE PIPELINE
 * Update pipeline properties (name, description, AI settings)
 */
export const updatePipeline = mutation({
  args: {
    sessionId: v.string(),
    pipelineId: v.id("objects"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      status: v.optional(v.string()),
      aiSettings: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const pipeline = await ctx.db.get(args.pipelineId);
    if (!pipeline || pipeline.type !== "crm_pipeline") {
      throw new Error("Pipeline not found");
    }

    // Don't allow updating system templates
    if (pipeline.organizationId === ("SYSTEM" as Id<"organizations">)) {
      throw new Error("Cannot update system templates");
    }

    const existingAiSettings = (pipeline.customProperties as { aiSettings?: Record<string, unknown> })?.aiSettings || {};

    await ctx.db.patch(args.pipelineId, {
      name: args.updates.name || pipeline.name,
      description: args.updates.description || pipeline.description,
      status: args.updates.status || pipeline.status,
      customProperties: {
        ...pipeline.customProperties,
        aiSettings: {
          ...existingAiSettings,
          ...args.updates.aiSettings,
        },
      },
      updatedAt: Date.now(),
    });

    // Log update
    await ctx.db.insert("objectActions", {
      organizationId: pipeline.organizationId,
      objectId: args.pipelineId,
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
 * SET DEFAULT PIPELINE
 * Mark a pipeline as the organization's default
 */
export const setDefaultPipeline = mutation({
  args: {
    sessionId: v.string(),
    pipelineId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const pipeline = await ctx.db.get(args.pipelineId);
    if (!pipeline) throw new Error("Pipeline not found");

    // Unset any existing default pipelines
    const existingPipelines = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", pipeline.organizationId).eq("type", "crm_pipeline")
      )
      .collect();

    for (const p of existingPipelines) {
      if ((p.customProperties as { isDefault?: boolean })?.isDefault) {
        await ctx.db.patch(p._id, {
          customProperties: {
            ...p.customProperties,
            isDefault: false,
          },
        });
      }
    }

    // Set new default
    await ctx.db.patch(args.pipelineId, {
      customProperties: {
        ...pipeline.customProperties,
        isDefault: true,
      },
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: pipeline.organizationId,
      objectId: args.pipelineId,
      actionType: "set_as_default",
      actionData: {},
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

/**
 * DELETE PIPELINE
 * Archive a pipeline (soft delete - can be restored)
 */
export const deletePipeline = mutation({
  args: {
    sessionId: v.string(),
    pipelineId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const pipeline = await ctx.db.get(args.pipelineId);
    if (!pipeline) throw new Error("Pipeline not found");

    // Don't allow deleting system templates
    if (pipeline.organizationId === ("SYSTEM" as Id<"organizations">)) {
      throw new Error("Cannot delete system templates");
    }

    // Soft delete - mark as archived
    await ctx.db.patch(args.pipelineId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    // Log deletion
    await ctx.db.insert("objectActions", {
      organizationId: pipeline.organizationId,
      objectId: args.pipelineId,
      actionType: "archived",
      actionData: {
        pipelineName: pipeline.name,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

/**
 * CREATE PIPELINE
 * Create a new blank pipeline with default stages
 */
export const createPipeline = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    subtype: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // CHECK LICENSE LIMIT: Enforce pipeline limit
    await checkResourceLimit(ctx, args.organizationId, "crm_pipeline", "maxPipelines");

    // Create new pipeline
    const newPipelineId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "crm_pipeline",
      subtype: args.subtype || "sales",
      name: args.name,
      description: args.description || "",
      status: "active",
      customProperties: {
        isTemplate: false,
        isDefault: false,
      },
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create default stages
    const defaultStages = [
      { name: "Lead", order: 1, color: "#FCD34D" },
      { name: "Prospect", order: 2, color: "#93C5FD" },
      { name: "Customer", order: 3, color: "#86EFAC" },
    ];

    for (const stage of defaultStages) {
      const newStageId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "crm_pipeline_stage",
        subtype: stage.name.toLowerCase(),
        name: stage.name,
        description: "",
        status: "active",
        customProperties: {
          color: stage.color,
          order: stage.order,
        },
        createdBy: session.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Link stage to pipeline
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: newStageId,
        toObjectId: newPipelineId,
        linkType: "belongs_to_pipeline",
        properties: { order: stage.order },
        createdBy: session.userId,
        createdAt: Date.now(),
      });
    }

    // Log creation
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: newPipelineId,
      actionType: "created",
      actionData: {
        pipelineName: args.name,
        stagesCreated: defaultStages.length,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return { pipelineId: newPipelineId };
  },
});

// ============================================================================
// PIPELINE STAGES
// ============================================================================

/**
 * CREATE STAGE
 * Add a new stage to a pipeline
 */
export const createStage = mutation({
  args: {
    sessionId: v.string(),
    pipelineId: v.id("objects"),
    name: v.string(),
    description: v.optional(v.string()),
    order: v.number(),
    color: v.optional(v.string()),
    probability: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const pipeline = await ctx.db.get(args.pipelineId);
    if (!pipeline || pipeline.type !== "crm_pipeline") {
      throw new Error("Pipeline not found");
    }

    // Don't allow modifying system templates
    if (pipeline.organizationId === ("SYSTEM" as Id<"organizations">)) {
      throw new Error("Cannot modify system templates");
    }

    // Create stage
    const stageId = await ctx.db.insert("objects", {
      organizationId: pipeline.organizationId,
      type: "crm_pipeline_stage",
      subtype: "active",
      name: args.name,
      description: args.description,
      status: "active",
      customProperties: {
        order: args.order,
        color: args.color || "#6B46C1",
        probability: args.probability || 50,
      },
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link to pipeline
    await ctx.db.insert("objectLinks", {
      organizationId: pipeline.organizationId,
      fromObjectId: stageId,
      toObjectId: args.pipelineId,
      linkType: "belongs_to_pipeline",
      properties: {
        order: args.order,
      },
      createdBy: session.userId,
      createdAt: Date.now(),
    });

    return stageId;
  },
});

/**
 * UPDATE STAGE
 * Update stage properties
 */
export const updateStage = mutation({
  args: {
    sessionId: v.string(),
    stageId: v.id("objects"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      color: v.optional(v.string()),
      probability: v.optional(v.number()),
      order: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const stage = await ctx.db.get(args.stageId);
    if (!stage || stage.type !== "crm_pipeline_stage") {
      throw new Error("Stage not found");
    }

    // Don't allow modifying system templates
    if (stage.organizationId === ("SYSTEM" as Id<"organizations">)) {
      throw new Error("Cannot modify system templates");
    }

    await ctx.db.patch(args.stageId, {
      name: args.updates.name || stage.name,
      description: args.updates.description || stage.description,
      customProperties: {
        ...stage.customProperties,
        color: args.updates.color || (stage.customProperties as { color?: string })?.color,
        probability:
          args.updates.probability !== undefined
            ? args.updates.probability
            : (stage.customProperties as { probability?: number })?.probability,
        order:
          args.updates.order !== undefined
            ? args.updates.order
            : (stage.customProperties as { order?: number })?.order,
      },
      updatedAt: Date.now(),
    });
  },
});

/**
 * DELETE STAGE
 * Remove a stage from a pipeline
 * NOTE: This will fail if there are contacts in this stage
 */
export const deleteStage = mutation({
  args: {
    sessionId: v.string(),
    stageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const stage = await ctx.db.get(args.stageId);
    if (!stage) throw new Error("Stage not found");

    // Don't allow modifying system templates
    if (stage.organizationId === ("SYSTEM" as Id<"organizations">)) {
      throw new Error("Cannot modify system templates");
    }

    // Check if any contacts are in this stage
    const contactsInStage = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.stageId))
      .filter((q) => q.eq(q.field("linkType"), "in_pipeline"))
      .first();

    if (contactsInStage) {
      throw new Error("Cannot delete stage with contacts. Move contacts first.");
    }

    // Delete pipeline link
    const pipelineLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.stageId))
      .filter((q) => q.eq(q.field("linkType"), "belongs_to_pipeline"))
      .first();

    if (pipelineLink) {
      await ctx.db.delete(pipelineLink._id);
    }

    // Delete stage
    await ctx.db.delete(args.stageId);
  },
});

// ============================================================================
// CONTACT-PIPELINE OPERATIONS
// ============================================================================

/**
 * ADD CONTACT TO PIPELINE
 * Places a contact in a specific stage of a pipeline
 */
export const addContactToPipeline = mutation({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
    pipelineId: v.id("objects"),
    stageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Verify stage belongs to pipeline
    const stageLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.stageId))
      .filter((q) =>
        q.and(
          q.eq(q.field("toObjectId"), args.pipelineId),
          q.eq(q.field("linkType"), "belongs_to_pipeline")
        )
      )
      .first();

    if (!stageLink) {
      throw new Error("Stage does not belong to this pipeline");
    }

    // Check if contact already in this pipeline
    const existing = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.contactId))
      .filter((q) => q.eq(q.field("linkType"), "in_pipeline"))
      .collect();

    const alreadyInPipeline = existing.find(
      (link) => (link.properties as { pipelineId?: Id<"objects"> })?.pipelineId === args.pipelineId
    );

    if (alreadyInPipeline) {
      throw new Error("Contact already in this pipeline");
    }

    // Create link
    const contact = await ctx.db.get(args.contactId);
    await ctx.db.insert("objectLinks", {
      organizationId: contact!.organizationId,
      fromObjectId: args.contactId,
      toObjectId: args.stageId,
      linkType: "in_pipeline",
      properties: {
        pipelineId: args.pipelineId,
        movedAt: Date.now(),
        aiData: {
          score: 0,
          confidence: 0,
          reasoning: [],
        },
      },
      createdBy: session.userId,
      createdAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: contact!.organizationId,
      objectId: args.contactId,
      actionType: "added_to_pipeline",
      actionData: {
        pipelineId: args.pipelineId,
        stageId: args.stageId,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

/**
 * MOVE CONTACT TO STAGE
 * Moves a contact to a different stage in the same pipeline
 */
export const moveContactToStage = mutation({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
    pipelineId: v.id("objects"),
    toStageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Find existing link for this pipeline
    const existingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.contactId))
      .filter((q) => q.eq(q.field("linkType"), "in_pipeline"))
      .collect();

    const existingLink = existingLinks.find(
      (link) => (link.properties as { pipelineId?: Id<"objects"> })?.pipelineId === args.pipelineId
    );

    if (!existingLink) {
      throw new Error("Contact not in this pipeline");
    }

    // Update link
    await ctx.db.patch(existingLink._id, {
      toObjectId: args.toStageId,
      properties: {
        ...existingLink.properties,
        previousStageId: existingLink.toObjectId,
        movedAt: Date.now(),
      },
    });

    // Log action
    const contact = await ctx.db.get(args.contactId);
    await ctx.db.insert("objectActions", {
      organizationId: contact!.organizationId,
      objectId: args.contactId,
      actionType: "moved_in_pipeline",
      actionData: {
        pipelineId: args.pipelineId,
        fromStageId: existingLink.toObjectId,
        toStageId: args.toStageId,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

/**
 * REMOVE CONTACT FROM PIPELINE
 * Removes a contact from a pipeline entirely
 */
export const removeContactFromPipeline = mutation({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
    pipelineId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Find link for this pipeline
    const existingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.contactId))
      .filter((q) => q.eq(q.field("linkType"), "in_pipeline"))
      .collect();

    const link = existingLinks.find(
      (l) => (l.properties as { pipelineId?: Id<"objects"> })?.pipelineId === args.pipelineId
    );

    if (!link) {
      throw new Error("Contact not in this pipeline");
    }

    // Delete link
    await ctx.db.delete(link._id);

    // Log action
    const contact = await ctx.db.get(args.contactId);
    await ctx.db.insert("objectActions", {
      organizationId: contact!.organizationId,
      objectId: args.contactId,
      actionType: "removed_from_pipeline",
      actionData: {
        pipelineId: args.pipelineId,
        stageId: link.toObjectId,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

/**
 * GET CONTACTS IN STAGE
 * Returns all contacts in a specific pipeline stage
 */
export const getContactsInStage = query({
  args: {
    sessionId: v.string(),
    stageId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all links to this stage
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.stageId))
      .filter((q) => q.eq(q.field("linkType"), "in_pipeline"))
      .collect();

    // Get contact objects
    const contacts = await Promise.all(
      links.map(async (link) => {
        const contact = await ctx.db.get(link.fromObjectId);
        return {
          ...contact,
          pipelineData: link.properties,
        };
      })
    );

    return contacts.filter((c) => c !== null);
  },
});

/**
 * GET CONTACT PIPELINES
 * Returns all pipelines a contact is in
 */
export const getContactPipelines = query({
  args: {
    sessionId: v.string(),
    contactId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all pipeline links for this contact
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.contactId))
      .filter((q) => q.eq(q.field("linkType"), "in_pipeline"))
      .collect();

    // Get pipeline and stage info for each
    const pipelinePositions = await Promise.all(
      links.map(async (link) => {
        const pipelineId = (link.properties as { pipelineId?: Id<"objects"> })?.pipelineId;
        const stageId = link.toObjectId;

        const [pipeline, stage] = await Promise.all([
          pipelineId ? ctx.db.get(pipelineId) : null,
          ctx.db.get(stageId),
        ]);

        return {
          pipeline,
          stage,
          properties: link.properties,
          linkId: link._id,
        };
      })
    );

    return pipelinePositions.filter((p) => p.pipeline !== null && p.stage !== null);
  },
});
