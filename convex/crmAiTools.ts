/**
 * CRM AI TOOLS
 *
 * AI-first tools for autonomous CRM operations with Cursor-style approval system.
 * Every tool is designed to be called by LLM agents with safety mechanisms.
 *
 * Approval System (Cursor-style):
 * - User can approve once: "Yes"
 * - User can approve always: "Yes, always for this type"
 * - User can reject once: "No"
 * - User can reject always: "No, never suggest this"
 *
 * Preferences stored in objects table (type="crm_ai_settings")
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Helper to get CRM AI settings
async function getCrmAiSettings(ctx: {db: any}, organizationId: Id<"organizations">) {
  const settings = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", organizationId).eq("type", "crm_ai_settings")
    )
    .first();

  return settings;
}

// ============================================================================
// AI CONTACT OPERATIONS
// ============================================================================

/**
 * AI TOOL: Move Contact to Stage
 * AI can move contacts through pipeline with approval system
 */
export const aiMoveContactToStage = mutation({
  args: {
    aiAgentId: v.string(),
    sessionId: v.string(),
    contactId: v.id("objects"),
    pipelineId: v.id("objects"),
    toStageId: v.id("objects"),
    reason: v.string(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Get contact and CRM AI settings
    const contact = await ctx.db.get(args.contactId);
    if (!contact) throw new Error("Contact not found");

    const crmAiSettings = await getCrmAiSettings(ctx, contact.organizationId);
    const approvalRules =
      (crmAiSettings?.customProperties as { approvalRules?: Record<string, string> })?.approvalRules || {};
    const moveApprovalRule = approvalRules.moveToStage || "always_ask";

    // Check approval rule
    if (moveApprovalRule === "auto_approve") {
      // Auto-approved - execute immediately
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

      await ctx.db.patch(existingLink._id, {
        toObjectId: args.toStageId,
        properties: {
          ...existingLink.properties,
          previousStageId: existingLink.toObjectId,
          movedAt: Date.now(),
        },
      });

      // Log AI action
      await ctx.db.insert("objectActions", {
        organizationId: contact.organizationId,
        objectId: args.contactId,
        actionType: "ai_moved_in_pipeline",
        actionData: {
          aiAgentId: args.aiAgentId,
          pipelineId: args.pipelineId,
          fromStageId: existingLink.toObjectId,
          toStageId: args.toStageId,
          reason: args.reason,
          confidence: args.confidence,
          autoApproved: true,
        },
        performedBy: session.userId,
        performedAt: Date.now(),
      });

      return { approved: true, autoApproved: true };
    }

    if (moveApprovalRule === "never") {
      return { approved: false, reason: "User has disabled this AI action" };
    }

    // Default: "always_ask" → Queue for approval
    const approvalId = await ctx.db.insert("objects", {
      organizationId: contact.organizationId,
      type: "ai_approval_request",
      subtype: "move_contact",
      name: `Move ${contact.name} to new stage`,
      status: "pending",
      customProperties: {
        aiAgentId: args.aiAgentId,
        sessionId: args.sessionId,
        action: "move_contact",
        actionArgs: {
          contactId: args.contactId,
          pipelineId: args.pipelineId,
          toStageId: args.toStageId,
        },
        reason: args.reason,
        confidence: args.confidence,
        requestedAt: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      approved: false,
      requiresApproval: true,
      approvalId,
      message: "Approval required from user",
    };
  },
});

/**
 * AI TOOL: Score Contact
 * AI calculates lead score based on engagement, fit, intent, timing
 */
export const aiScoreContact = mutation({
  args: {
    aiAgentId: v.string(),
    sessionId: v.string(),
    contactId: v.id("objects"),
    pipelineId: v.id("objects"),
    scoreFactors: v.object({
      engagement: v.number(), // 0-100
      fit: v.number(), // 0-100
      intent: v.number(), // 0-100
      timing: v.number(), // 0-100
    }),
    overallScore: v.number(), // 0-100
    confidence: v.number(), // 0-1
    reasoning: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Get contact's pipeline link
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.contactId))
      .filter((q) => q.eq(q.field("linkType"), "in_pipeline"))
      .collect();

    const link = links.find(
      (l) => (l.properties as { pipelineId?: Id<"objects"> })?.pipelineId === args.pipelineId
    );

    if (!link) {
      throw new Error("Contact not in this pipeline");
    }

    // Update AI score data
    await ctx.db.patch(link._id, {
      properties: {
        ...link.properties,
        aiData: {
          score: args.overallScore,
          scoreFactors: args.scoreFactors,
          confidence: args.confidence,
          reasoning: args.reasoning,
          lastAiReview: Date.now(),
        },
      },
    });

    // Log AI action
    const contact = await ctx.db.get(args.contactId);
    await ctx.db.insert("objectActions", {
      organizationId: contact!.organizationId,
      objectId: args.contactId,
      actionType: "ai_scored_contact",
      actionData: {
        aiAgentId: args.aiAgentId,
        pipelineId: args.pipelineId,
        score: args.overallScore,
        scoreFactors: args.scoreFactors,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * AI TOOL: Enrich Contact
 * AI researches and fills in missing contact data
 */
export const aiEnrichContact = mutation({
  args: {
    aiAgentId: v.string(),
    sessionId: v.string(),
    contactId: v.id("objects"),
    enrichedData: v.object({
      company: v.optional(v.string()),
      jobTitle: v.optional(v.string()),
      linkedInUrl: v.optional(v.string()),
      companySize: v.optional(v.string()),
      industry: v.optional(v.string()),
      recentNews: v.optional(v.array(v.string())),
      technologies: v.optional(v.array(v.string())),
    }),
    sources: v.array(v.string()), // Where AI found this data
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const contact = await ctx.db.get(args.contactId);
    if (!contact) throw new Error("Contact not found");

    // Get CRM-specific AI settings
    const crmAiSettings = await getCrmAiSettings(ctx, contact.organizationId);
    const enrichmentEnabled =
      (crmAiSettings?.customProperties as { enableAiEnrichment?: boolean })?.enableAiEnrichment !== false; // Default to true

    if (!enrichmentEnabled) {
      return { success: false, reason: "AI enrichment is disabled for this organization" };
    }

    // Check approval rules
    const approvalRules =
      (crmAiSettings?.customProperties as { approvalRules?: Record<string, string> })?.approvalRules || {};
    const enrichApprovalRule = approvalRules.enrichContact || "always_ask";

    if (enrichApprovalRule === "never") {
      return { approved: false, reason: "User has disabled AI enrichment" };
    }

    if (enrichApprovalRule === "auto_approve") {
      // Auto-approved - enrich immediately
      await ctx.db.patch(args.contactId, {
        customProperties: {
          ...contact.customProperties,
          ...args.enrichedData,
          aiEnriched: {
            lastEnriched: Date.now(),
            sources: args.sources,
            confidence: args.confidence,
          },
        },
        updatedAt: Date.now(),
      });

      // Log action
      await ctx.db.insert("objectActions", {
        organizationId: contact.organizationId,
        objectId: args.contactId,
        actionType: "ai_enriched_contact",
        actionData: {
          aiAgentId: args.aiAgentId,
          fieldsEnriched: Object.keys(args.enrichedData),
          sources: args.sources,
          confidence: args.confidence,
          autoApproved: true,
        },
        performedBy: session.userId,
        performedAt: Date.now(),
      });

      return { success: true, autoApproved: true };
    }

    // Queue for approval
    const approvalId = await ctx.db.insert("objects", {
      organizationId: contact.organizationId,
      type: "ai_approval_request",
      subtype: "enrich_contact",
      name: `Enrich ${contact.name} with AI data`,
      status: "pending",
      customProperties: {
        aiAgentId: args.aiAgentId,
        sessionId: args.sessionId,
        action: "enrich_contact",
        actionArgs: {
          contactId: args.contactId,
          enrichedData: args.enrichedData,
          sources: args.sources,
          confidence: args.confidence,
        },
        reason: `Found ${Object.keys(args.enrichedData).length} new fields from ${args.sources.length} sources`,
        confidence: args.confidence,
        requestedAt: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      approved: false,
      requiresApproval: true,
      approvalId,
    };
  },
});

/**
 * AI TOOL: Add Contact to Pipeline
 * AI can add contacts to pipelines with approval
 */
export const aiAddContactToPipeline = mutation({
  args: {
    aiAgentId: v.string(),
    sessionId: v.string(),
    contactId: v.id("objects"),
    pipelineId: v.id("objects"),
    stageId: v.id("objects"),
    reason: v.string(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const contact = await ctx.db.get(args.contactId);
    if (!contact) throw new Error("Contact not found");

    // Get CRM-specific AI settings
    const crmAiSettings = await getCrmAiSettings(ctx, contact.organizationId);
    const approvalRules =
      (crmAiSettings?.customProperties as { approvalRules?: Record<string, string> })?.approvalRules || {};
    const addToPipelineRule = approvalRules.addToPipeline || "always_ask";

    if (addToPipelineRule === "never") {
      return { approved: false, reason: "User has disabled this AI action" };
    }

    if (addToPipelineRule === "auto_approve" && args.confidence > 0.85) {
      // Auto-approved - add immediately
      // Check if already in pipeline
      const existing = await ctx.db
        .query("objectLinks")
        .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.contactId))
        .filter((q) => q.eq(q.field("linkType"), "in_pipeline"))
        .collect();

      const alreadyInPipeline = existing.find(
        (link) => (link.properties as { pipelineId?: Id<"objects"> })?.pipelineId === args.pipelineId
      );

      if (alreadyInPipeline) {
        return { success: false, reason: "Contact already in this pipeline" };
      }

      // Create link
      await ctx.db.insert("objectLinks", {
        organizationId: contact.organizationId,
        fromObjectId: args.contactId,
        toObjectId: args.stageId,
        linkType: "in_pipeline",
        properties: {
          pipelineId: args.pipelineId,
          movedAt: Date.now(),
          aiData: {
            score: 0,
            confidence: args.confidence,
            reasoning: [args.reason],
          },
        },
        createdBy: session.userId,
        createdAt: Date.now(),
      });

      // Log action
      await ctx.db.insert("objectActions", {
        organizationId: contact.organizationId,
        objectId: args.contactId,
        actionType: "ai_added_to_pipeline",
        actionData: {
          aiAgentId: args.aiAgentId,
          pipelineId: args.pipelineId,
          stageId: args.stageId,
          reason: args.reason,
          autoApproved: true,
        },
        performedBy: session.userId,
        performedAt: Date.now(),
      });

      return { success: true, autoApproved: true };
    }

    // Queue for approval
    const approvalId = await ctx.db.insert("objects", {
      organizationId: contact.organizationId,
      type: "ai_approval_request",
      subtype: "add_to_pipeline",
      name: `Add ${contact.name} to pipeline`,
      status: "pending",
      customProperties: {
        aiAgentId: args.aiAgentId,
        sessionId: args.sessionId,
        action: "add_to_pipeline",
        actionArgs: {
          contactId: args.contactId,
          pipelineId: args.pipelineId,
          stageId: args.stageId,
        },
        reason: args.reason,
        confidence: args.confidence,
        requestedAt: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      approved: false,
      requiresApproval: true,
      approvalId,
    };
  },
});

// ============================================================================
// APPROVAL SYSTEM (Cursor-style)
// ============================================================================

/**
 * GET PENDING APPROVALS
 * Returns all pending AI approval requests for an organization
 */
export const getPendingApprovals = query({
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

    const approvals = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "ai_approval_request")
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("desc")
      .take(20); // Limit to 20 most recent

    return approvals;
  },
});

/**
 * APPROVE AI ACTION
 * User responds to AI suggestion with Cursor-style options
 */
export const approveAiAction = mutation({
  args: {
    sessionId: v.string(),
    approvalId: v.id("objects"),
    decision: v.union(
      v.literal("approve_once"),
      v.literal("approve_always"),
      v.literal("reject_once"),
      v.literal("reject_always")
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const approval = await ctx.db.get(args.approvalId);
    if (!approval) throw new Error("Approval request not found");

    const actionType = (approval.customProperties as { action?: string })?.action;
    const actionArgs = (approval.customProperties as { actionArgs?: unknown })?.actionArgs;

    // Update approval status
    await ctx.db.patch(args.approvalId, {
      status: args.decision.startsWith("approve") ? "approved" : "rejected",
      customProperties: {
        ...approval.customProperties,
        decision: args.decision,
        decidedBy: session.userId,
        decidedAt: Date.now(),
      },
    });

    // If "always" preference, update CRM AI settings
    if (args.decision === "approve_always" || args.decision === "reject_always") {
      const newRule = args.decision === "approve_always" ? "auto_approve" : "never";

      // Get or create CRM AI settings
      let crmAiSettings = await getCrmAiSettings(ctx, approval.organizationId);

      if (!crmAiSettings) {
        // Create default settings
        await ctx.db.insert("objects", {
          organizationId: approval.organizationId,
          type: "crm_ai_settings",
          name: "CRM AI Settings",
          status: "active",
          customProperties: {
            approvalRules: {
              [actionType || "unknown"]: newRule,
            },
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        // Update existing settings
        const existingRules =
          (crmAiSettings.customProperties as { approvalRules?: Record<string, string> })?.approvalRules || {};

        await ctx.db.patch(crmAiSettings._id, {
          customProperties: {
            ...crmAiSettings.customProperties,
            approvalRules: {
              ...existingRules,
              [actionType || "unknown"]: newRule,
            },
          },
          updatedAt: Date.now(),
        });
      }
    }

    // If approved, execute the action
    if (args.decision.startsWith("approve")) {
      if (actionType === "move_contact") {
        const { contactId, pipelineId, toStageId } = actionArgs as {
          contactId: Id<"objects">;
          pipelineId: Id<"objects">;
          toStageId: Id<"objects">;
        };

        // Execute move
        const existingLinks = await ctx.db
          .query("objectLinks")
          .withIndex("by_from_object", (q) => q.eq("fromObjectId", contactId))
          .filter((q) => q.eq(q.field("linkType"), "in_pipeline"))
          .collect();

        const existingLink = existingLinks.find(
          (link) => (link.properties as { pipelineId?: Id<"objects"> })?.pipelineId === pipelineId
        );

        if (existingLink) {
          await ctx.db.patch(existingLink._id, {
            toObjectId: toStageId,
            properties: {
              ...existingLink.properties,
              previousStageId: existingLink.toObjectId,
              movedAt: Date.now(),
            },
          });

          // Log action
          const contact = await ctx.db.get(contactId);
          await ctx.db.insert("objectActions", {
            organizationId: contact!.organizationId,
            objectId: contactId,
            actionType: "moved_in_pipeline",
            actionData: {
              pipelineId,
              fromStageId: existingLink.toObjectId,
              toStageId,
              approvedBy: session.userId,
            },
            performedBy: session.userId,
            performedAt: Date.now(),
          });
        }
      } else if (actionType === "enrich_contact") {
        const { contactId, enrichedData } = actionArgs as {
          contactId: Id<"objects">;
          enrichedData: Record<string, unknown>;
        };

        const contact = await ctx.db.get(contactId);
        if (contact) {
          await ctx.db.patch(contactId, {
            customProperties: {
              ...contact.customProperties,
              ...enrichedData,
            },
            updatedAt: Date.now(),
          });

          // Log action
          await ctx.db.insert("objectActions", {
            organizationId: contact.organizationId,
            objectId: contactId,
            actionType: "enriched_contact",
            actionData: {
              fieldsEnriched: Object.keys(enrichedData),
              approvedBy: session.userId,
            },
            performedBy: session.userId,
            performedAt: Date.now(),
          });
        }
      } else if (actionType === "add_to_pipeline") {
        const { contactId, pipelineId, stageId } = actionArgs as {
          contactId: Id<"objects">;
          pipelineId: Id<"objects">;
          stageId: Id<"objects">;
        };

        const contact = await ctx.db.get(contactId);
        if (contact) {
          await ctx.db.insert("objectLinks", {
            organizationId: contact.organizationId,
            fromObjectId: contactId,
            toObjectId: stageId,
            linkType: "in_pipeline",
            properties: {
              pipelineId,
              movedAt: Date.now(),
            },
            createdBy: session.userId,
            createdAt: Date.now(),
          });

          // Log action
          await ctx.db.insert("objectActions", {
            organizationId: contact.organizationId,
            objectId: contactId,
            actionType: "added_to_pipeline",
            actionData: {
              pipelineId,
              stageId,
              approvedBy: session.userId,
            },
            performedBy: session.userId,
            performedAt: Date.now(),
          });
        }
      }
    }

    return { success: true };
  },
});

/**
 * UPDATE AI SETTINGS
 * Update organization's AI preferences for CRM
 */
export const updateAiSettings = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    settings: v.object({
      enableAiEnrichment: v.optional(v.boolean()),
      communicationStyle: v.optional(v.string()), // "professional" | "friendly" | "technical"
      approvalRules: v.optional(v.record(v.string(), v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    // Get or create CRM AI settings
    let crmAiSettings = await getCrmAiSettings(ctx, args.organizationId);

    if (!crmAiSettings) {
      // Create default settings
      const settingsId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "crm_ai_settings",
        name: "CRM AI Settings",
        status: "active",
        customProperties: args.settings,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return { success: true, settingsId };
    }

    // Update existing settings
    await ctx.db.patch(crmAiSettings._id, {
      customProperties: {
        ...crmAiSettings.customProperties,
        ...args.settings,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * GET AI SETTINGS
 * Get organization's AI preferences for CRM
 */
export const getAiSettings = query({
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

    const crmAiSettings = await getCrmAiSettings(ctx, args.organizationId);

    if (!crmAiSettings) {
      // Return defaults
      return {
        enableAiEnrichment: true,
        communicationStyle: "professional",
        approvalRules: {},
      };
    }

    const props = crmAiSettings.customProperties as {
      enableAiEnrichment?: boolean;
      communicationStyle?: string;
      approvalRules?: Record<string, string>;
    };

    return {
      enableAiEnrichment: props.enableAiEnrichment ?? true,
      communicationStyle: props.communicationStyle || "professional",
      approvalRules: props.approvalRules || {},
    };
  },
});
