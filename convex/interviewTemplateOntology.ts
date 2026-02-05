/**
 * INTERVIEW TEMPLATE ONTOLOGY
 *
 * CRUD operations for interview templates stored in the objects table.
 * Templates define scripted conversations for client onboarding interviews.
 *
 * Object Type: "interview_template"
 * Status Workflow: draft → active → archived
 *
 * Templates are org-scoped and can be:
 * - Created from scratch or cloned from existing templates
 * - Activated to make them available for interviews
 * - Archived when no longer needed (preserves history)
 *
 * See: convex/schemas/interviewSchemas.ts for type definitions
 * See: convex/ai/interviewRunner.ts for execution logic
 */

import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";
import type { InterviewTemplate, InterviewPhase } from "./schemas/interviewSchemas";
import {
  interviewPhaseValidator,
  contentDNASchemaValidator,
  completionCriteriaValidator,
} from "./schemas/interviewSchemas";
import { SEED_TEMPLATES } from "./seeds/interviewTemplates";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * LIST TEMPLATES
 * Returns all interview templates for an organization, optionally filtered by status.
 */
export const listTemplates = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    status: v.optional(v.union(v.literal("draft"), v.literal("active"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    let templates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "interview_template")
      )
      .collect();

    if (args.status) {
      templates = templates.filter((t) => t.status === args.status);
    }

    // Sort by updatedAt descending (most recently modified first)
    templates.sort((a, b) => b.updatedAt - a.updatedAt);

    return templates.map((t) => ({
      _id: t._id,
      name: t.name,
      description: t.description,
      status: t.status,
      customProperties: t.customProperties as InterviewTemplate,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  },
});

/**
 * GET TEMPLATE
 * Get a single interview template by ID.
 */
export const getTemplate = query({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "interview_template") {
      throw new Error("Interview template not found");
    }

    return {
      _id: template._id,
      organizationId: template.organizationId,
      name: template.name,
      description: template.description,
      status: template.status,
      customProperties: template.customProperties as InterviewTemplate,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      createdBy: template.createdBy,
    };
  },
});

/**
 * INTERNAL: Get template by ID (no auth, for pipeline use)
 */
export const getTemplateInternal = internalQuery({
  args: {
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "interview_template") {
      return null;
    }
    return {
      _id: template._id,
      organizationId: template.organizationId,
      name: template.name,
      status: template.status,
      customProperties: template.customProperties as InterviewTemplate,
    };
  },
});

/**
 * GET ACTIVE TEMPLATES
 * Returns all active templates for an organization (for interview start flow).
 */
export const getActiveTemplates = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const templates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "interview_template")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return templates.map((t) => {
      const props = t.customProperties as InterviewTemplate;
      return {
        _id: t._id,
        name: t.name,
        description: t.description,
        templateName: props.templateName,
        mode: props.mode,
        estimatedMinutes: props.estimatedMinutes,
        phaseCount: props.phases?.length || 0,
      };
    });
  },
});

/**
 * GET TEMPLATE STATS
 * Returns usage statistics for a template.
 */
export const getTemplateStats = query({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "interview_template") {
      throw new Error("Interview template not found");
    }

    // Count sessions using this template
    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_template", (q) => q.eq("interviewTemplateId", args.templateId))
      .collect();

    const completedSessions = sessions.filter(
      (s) => s.interviewState?.isComplete === true
    );

    // Calculate average completion time
    let avgCompletionMinutes = 0;
    if (completedSessions.length > 0) {
      const totalMinutes = completedSessions.reduce((sum, s) => {
        const state = s.interviewState;
        if (state?.startedAt && state?.completedAt) {
          return sum + (state.completedAt - state.startedAt) / 60000;
        }
        return sum;
      }, 0);
      avgCompletionMinutes = Math.round(totalMinutes / completedSessions.length);
    }

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      inProgressSessions: sessions.filter(
        (s) => s.status === "active" && !s.interviewState?.isComplete
      ).length,
      completionRate: sessions.length > 0
        ? Math.round((completedSessions.length / sessions.length) * 100)
        : 0,
      avgCompletionMinutes,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * CREATE TEMPLATE
 * Create a new interview template in draft status.
 */
export const createTemplate = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateName: v.string(),
    description: v.string(),
    mode: v.union(v.literal("quick"), v.literal("standard"), v.literal("deep_discovery")),
    estimatedMinutes: v.optional(v.number()),
    language: v.optional(v.string()),
    interviewerPersonality: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Default estimated minutes based on mode
    const estimatedMinutes = args.estimatedMinutes || {
      quick: 15,
      standard: 25,
      deep_discovery: 45,
    }[args.mode];

    const templateProps: InterviewTemplate = {
      templateName: args.templateName,
      description: args.description,
      version: 1,
      status: "draft",
      estimatedMinutes,
      mode: args.mode,
      language: args.language || "en",
      phases: [],
      outputSchema: { fields: [] },
      completionCriteria: {
        minPhasesCompleted: 1,
        requiredPhaseIds: [],
      },
      interviewerPersonality: args.interviewerPersonality || "Warm, curious, and professional",
      followUpDepth: 2,
      silenceHandling: "If the user seems stuck, offer an example or rephrase the question.",
      usageCount: 0,
    };

    const templateId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "interview_template",
      subtype: args.mode,
      name: args.templateName,
      description: args.description,
      status: "draft",
      customProperties: templateProps,
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Audit trail
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: templateId,
      actionType: "created",
      actionData: { mode: args.mode },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return templateId;
  },
});

/**
 * UPDATE TEMPLATE
 * Update template metadata and configuration.
 */
export const updateTemplate = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    updates: v.object({
      templateName: v.optional(v.string()),
      description: v.optional(v.string()),
      estimatedMinutes: v.optional(v.number()),
      mode: v.optional(v.union(v.literal("quick"), v.literal("standard"), v.literal("deep_discovery"))),
      language: v.optional(v.string()),
      additionalLanguages: v.optional(v.array(v.string())),
      interviewerPersonality: v.optional(v.string()),
      followUpDepth: v.optional(v.union(v.literal(1), v.literal(2), v.literal(3))),
      silenceHandling: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "interview_template") {
      throw new Error("Interview template not found");
    }

    const currentProps = template.customProperties as InterviewTemplate;
    const updatedProps: InterviewTemplate = {
      ...currentProps,
      ...args.updates,
    };

    await ctx.db.patch(args.templateId, {
      name: args.updates.templateName || template.name,
      description: args.updates.description || template.description,
      subtype: args.updates.mode || template.subtype,
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "updated",
      actionData: { updatedFields: Object.keys(args.updates) },
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

/**
 * UPDATE TEMPLATE PHASES
 * Replace all phases in a template.
 */
export const updateTemplatePhases = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    phases: v.array(interviewPhaseValidator),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "interview_template") {
      throw new Error("Interview template not found");
    }

    if (template.status === "active") {
      throw new Error("Cannot modify phases of an active template. Create a new version instead.");
    }

    const currentProps = template.customProperties as InterviewTemplate;

    // Auto-generate output schema from extraction fields
    const extractionFields = new Map<string, { dataType: string; category: string }>();
    for (const phase of args.phases) {
      for (const question of phase.questions) {
        if (question.extractionField && !extractionFields.has(question.extractionField)) {
          extractionFields.set(question.extractionField, {
            dataType: question.expectedDataType === "list" ? "string[]" : "string",
            category: inferCategory(phase.phaseName),
          });
        }
      }
    }

    const outputSchema = {
      fields: Array.from(extractionFields.entries()).map(([fieldId, info]) => ({
        fieldId,
        fieldName: fieldId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        dataType: info.dataType as "string" | "string[]",
        category: info.category as "voice" | "expertise" | "audience" | "content_prefs" | "brand" | "goals",
        required: false,
      })),
    };

    // Calculate total estimated minutes
    const totalMinutes = args.phases.reduce((sum, p) => sum + p.estimatedMinutes, 0);

    const updatedProps: InterviewTemplate = {
      ...currentProps,
      phases: args.phases as InterviewPhase[],
      outputSchema,
      estimatedMinutes: totalMinutes,
      version: currentProps.version + 1,
    };

    await ctx.db.patch(args.templateId, {
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "phases_updated",
      actionData: { phaseCount: args.phases.length, version: updatedProps.version },
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

/**
 * UPDATE COMPLETION CRITERIA
 * Set which phases are required and minimum completion threshold.
 */
export const updateCompletionCriteria = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
    completionCriteria: completionCriteriaValidator,
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "interview_template") {
      throw new Error("Interview template not found");
    }

    const currentProps = template.customProperties as InterviewTemplate;

    // Validate that required phase IDs exist
    const phaseIds = new Set(currentProps.phases.map((p) => p.phaseId));
    for (const requiredId of args.completionCriteria.requiredPhaseIds) {
      if (!phaseIds.has(requiredId)) {
        throw new Error(`Required phase "${requiredId}" does not exist in template`);
      }
    }

    const updatedProps: InterviewTemplate = {
      ...currentProps,
      completionCriteria: args.completionCriteria,
    };

    await ctx.db.patch(args.templateId, {
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });
  },
});

/**
 * ACTIVATE TEMPLATE
 * Set template status to "active", making it available for interviews.
 */
export const activateTemplate = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "interview_template") {
      throw new Error("Interview template not found");
    }

    const props = template.customProperties as InterviewTemplate;

    // Validation: must have at least one phase with at least one question
    if (!props.phases || props.phases.length === 0) {
      throw new Error("Template must have at least one phase before activation");
    }

    const hasQuestions = props.phases.some((p) => p.questions && p.questions.length > 0);
    if (!hasQuestions) {
      throw new Error("Template must have at least one question before activation");
    }

    const updatedProps: InterviewTemplate = {
      ...props,
      status: "active",
    };

    await ctx.db.patch(args.templateId, {
      status: "active",
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "activated",
      actionData: { phaseCount: props.phases.length },
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

/**
 * ARCHIVE TEMPLATE
 * Set template status to "archived". Preserves history but hides from active list.
 */
export const archiveTemplate = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "interview_template") {
      throw new Error("Interview template not found");
    }

    const props = template.customProperties as InterviewTemplate;
    const updatedProps: InterviewTemplate = {
      ...props,
      status: "archived",
    };

    await ctx.db.patch(args.templateId, {
      status: "archived",
      customProperties: updatedProps,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "archived",
      actionData: {},
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

/**
 * CLONE TEMPLATE
 * Create a copy of an existing template for customization.
 */
export const cloneTemplate = mutation({
  args: {
    sessionId: v.string(),
    sourceTemplateId: v.id("objects"),
    newName: v.string(),
    targetOrganizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const source = await ctx.db.get(args.sourceTemplateId);
    if (!source || source.type !== "interview_template") {
      throw new Error("Source template not found");
    }

    const sourceProps = source.customProperties as InterviewTemplate;
    const targetOrgId = args.targetOrganizationId || source.organizationId;

    const clonedProps: InterviewTemplate = {
      ...sourceProps,
      templateName: args.newName,
      description: `Cloned from "${sourceProps.templateName}"`,
      status: "draft",
      version: 1,
      createdFromTemplateId: args.sourceTemplateId,
      usageCount: 0,
    };

    const clonedId = await ctx.db.insert("objects", {
      organizationId: targetOrgId,
      type: "interview_template",
      subtype: source.subtype,
      name: args.newName,
      description: clonedProps.description,
      status: "draft",
      customProperties: clonedProps,
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: targetOrgId,
      objectId: clonedId,
      actionType: "cloned",
      actionData: { sourceTemplateId: args.sourceTemplateId },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return clonedId;
  },
});

/**
 * DELETE TEMPLATE
 * Permanently delete a template. Only allowed for draft templates with no usage.
 */
export const deleteTemplate = mutation({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "interview_template") {
      throw new Error("Interview template not found");
    }

    // Check for existing sessions using this template
    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_template", (q) => q.eq("interviewTemplateId", args.templateId))
      .first();

    if (sessions) {
      throw new Error("Cannot delete template with existing interview sessions. Archive it instead.");
    }

    // Log deletion before deleting
    await ctx.db.insert("objectActions", {
      organizationId: template.organizationId,
      objectId: args.templateId,
      actionType: "deleted",
      actionData: { templateName: template.name },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    await ctx.db.delete(args.templateId);
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * INTERNAL: Increment usage count when an interview starts
 */
export const incrementUsageCount = internalMutation({
  args: {
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "interview_template") {
      return;
    }

    const props = template.customProperties as InterviewTemplate;
    const updatedProps: InterviewTemplate = {
      ...props,
      usageCount: (props.usageCount || 0) + 1,
    };

    await ctx.db.patch(args.templateId, {
      customProperties: updatedProps,
    });
  },
});

// ============================================================================
// SEEDING
// ============================================================================

/**
 * SEED DEFAULT TEMPLATES
 * Insert the three default interview templates for an organization.
 * Called when org first accesses interview features.
 */
export const seedDefaultTemplates = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Check if org already has templates
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "interview_template")
      )
      .first();

    if (existing) {
      return { seeded: false, reason: "Templates already exist" };
    }

    const templateIds: string[] = [];

    for (const template of SEED_TEMPLATES) {
      const templateId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "interview_template",
        subtype: template.mode,
        name: template.templateName,
        description: template.description,
        status: "active",
        customProperties: template,
        createdBy: args.createdBy,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      templateIds.push(templateId);

      // Audit trail
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: templateId,
        actionType: "seeded",
        actionData: { templateName: template.templateName, mode: template.mode },
        performedBy: args.createdBy,
        performedAt: Date.now(),
      });
    }

    return {
      seeded: true,
      templateCount: templateIds.length,
      templateIds,
    };
  },
});

/**
 * ENSURE TEMPLATES EXIST
 * Public mutation that seeds templates if needed, then returns available templates.
 */
export const ensureDefaultTemplates = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Check if org has templates
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "interview_template")
      )
      .collect();

    if (existing.length > 0) {
      return {
        seeded: false,
        templates: existing.map((t) => ({
          _id: t._id,
          name: t.name,
          status: t.status,
        })),
      };
    }

    const templates: Array<{ _id: string; name: string; status: string }> = [];

    for (const template of SEED_TEMPLATES) {
      const templateId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "interview_template",
        subtype: template.mode,
        name: template.templateName,
        description: template.description,
        status: "active",
        customProperties: template,
        createdBy: session.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      templates.push({
        _id: templateId,
        name: template.templateName,
        status: "active",
      });

      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: templateId,
        actionType: "seeded",
        actionData: { templateName: template.templateName },
        performedBy: session.userId,
        performedAt: Date.now(),
      });
    }

    return { seeded: true, templates };
  },
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Infer Content DNA category from phase name
 */
function inferCategory(phaseName: string): string {
  const lower = phaseName.toLowerCase();
  if (lower.includes("voice") || lower.includes("tone") || lower.includes("style")) {
    return "voice";
  }
  if (lower.includes("expert") || lower.includes("topic") || lower.includes("knowledge")) {
    return "expertise";
  }
  if (lower.includes("audience") || lower.includes("customer") || lower.includes("icp")) {
    return "audience";
  }
  if (lower.includes("content") || lower.includes("format") || lower.includes("platform")) {
    return "content_prefs";
  }
  if (lower.includes("brand") || lower.includes("identity") || lower.includes("visual")) {
    return "brand";
  }
  if (lower.includes("goal") || lower.includes("objective") || lower.includes("kpi")) {
    return "goals";
  }
  return "voice"; // Default
}
