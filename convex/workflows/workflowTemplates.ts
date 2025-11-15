/**
 * WORKFLOW TEMPLATES
 *
 * Pre-built workflow templates that users can instantiate and customize.
 * Templates provide starting points for common workflow patterns.
 *
 * MIGRATED TO DATABASE: Templates are now stored in the objects table.
 * Use workflowTemplateAvailability.ts to manage which orgs can access which templates.
 */

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";
import { api } from "../_generated/api";

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: "checkout" | "registration" | "invoicing" | "automation";
  subtype: string;
  objects: Array<{
    objectType: string;
    role: string;
    description: string;
    required: boolean;
  }>;
  behaviors: Array<{
    type: string;
    enabled: boolean;
    priority: number;
    description: string;
    config: Record<string, unknown>;
  }>;
  execution: {
    triggerOn: string;
    requiredInputs?: string[];
    outputActions?: string[];
    errorHandling: "rollback" | "continue" | "notify";
  };
}

/**
 * DEPRECATED: Hardcoded templates moved to database
 * Run: npx convex run seedWorkflowTemplates:seedWorkflowTemplates
 * Use: getAvailableWorkflowTemplates from workflowTemplateAvailability.ts
 *
 * This array has been removed. Templates are now stored in the database.
 */

// ============================================================================
// QUERY OPERATIONS
// ============================================================================

/**
 * GET TEMPLATES
 * Returns available workflow templates for the organization
 * NOW USES DATABASE: Queries from objects table based on availability rules
 */
export const getTemplates = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<WorkflowTemplate[]> => {
    // Delegate to availability-filtered query
    const dbTemplates: any = await ctx.runQuery(
      api.workflowTemplateAvailability.getAvailableWorkflowTemplates,
      {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
        category: args.category,
      }
    );

    // Convert database objects to WorkflowTemplate format
    return dbTemplates.map((template: any): WorkflowTemplate => ({
      id: template.customProperties?.code || template._id,
      name: template.name,
      description: template.description || "",
      category: template.customProperties?.category || "automation",
      subtype: template.customProperties?.subtype || template.subtype || "",
      objects: template.customProperties?.objects || [],
      behaviors: template.customProperties?.behaviors || [],
      execution: template.customProperties?.execution || {
        triggerOn: "manual",
        errorHandling: "continue" as const,
      },
    }));
  },
});

/**
 * GET TEMPLATE
 * Returns a specific template by code
 * NOW USES DATABASE: Queries from objects table
 */
export const getTemplate = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateId: v.string(), // This is actually the template code
  },
  handler: async (ctx, args): Promise<WorkflowTemplate> => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all available templates for this org
    const dbTemplates: any = await ctx.runQuery(
      api.workflowTemplateAvailability.getAvailableWorkflowTemplates,
      {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
      }
    );

    // Find the specific template by code
    const dbTemplate: any = dbTemplates.find(
      (t: any) => t.customProperties?.code === args.templateId
    );

    if (!dbTemplate) {
      throw new Error(`Template not found: ${args.templateId}`);
    }

    // Convert to WorkflowTemplate format
    const result: WorkflowTemplate = {
      id: dbTemplate.customProperties?.code || dbTemplate._id,
      name: dbTemplate.name,
      description: dbTemplate.description || "",
      category: dbTemplate.customProperties?.category || "automation",
      subtype: dbTemplate.customProperties?.subtype || dbTemplate.subtype || "",
      objects: dbTemplate.customProperties?.objects || [],
      behaviors: dbTemplate.customProperties?.behaviors || [],
      execution: dbTemplate.customProperties?.execution || {
        triggerOn: "manual",
        errorHandling: "continue" as const,
      },
    };

    return result;
  },
});

// ============================================================================
// MUTATION OPERATIONS
// ============================================================================

/**
 * CREATE FROM TEMPLATE
 * Creates a new workflow based on a template
 */
export const createFromTemplate = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateId: v.string(),
    customization: v.object({
      name: v.string(),
      description: v.optional(v.string()),
      objects: v.array(
        v.object({
          objectId: v.id("objects"),
          objectType: v.string(),
          role: v.string(),
        })
      ),
      behaviorConfig: v.optional(v.any()), // Overrides for behavior configs
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get template from database
    const dbTemplates: any = await ctx.runQuery(
      api.workflowTemplateAvailability.getAvailableWorkflowTemplates,
      {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
      }
    );

    const dbTemplate: any = dbTemplates.find(
      (t: any) => t.customProperties?.code === args.templateId
    );

    if (!dbTemplate) {
      throw new Error(`Template not found: ${args.templateId}`);
    }

    // Convert to WorkflowTemplate format for processing
    const template: WorkflowTemplate = {
      id: dbTemplate.customProperties?.code || dbTemplate._id,
      name: dbTemplate.name,
      description: dbTemplate.description || "",
      category: dbTemplate.customProperties?.category || "automation",
      subtype: dbTemplate.customProperties?.subtype || dbTemplate.subtype || "",
      objects: dbTemplate.customProperties?.objects || [],
      behaviors: dbTemplate.customProperties?.behaviors || [],
      execution: dbTemplate.customProperties?.execution || {
        triggerOn: "manual",
        errorHandling: "continue" as const,
      },
    };

    // Validate that all required object types are provided
    const requiredObjectTypes = template.objects
      .filter((o) => o.required)
      .map((o) => o.objectType);

    for (const requiredType of requiredObjectTypes) {
      const hasType = args.customization.objects.some(
        (o) => o.objectType === requiredType
      );
      if (!hasType) {
        throw new Error(`Required object type missing: ${requiredType}`);
      }
    }

    // Build behaviors with custom config if provided
    const behaviors = template.behaviors.map((b: any, index: number) => {
      const customConfig =
        args.customization.behaviorConfig &&
        args.customization.behaviorConfig[index]
          ? args.customization.behaviorConfig[index]
          : b.config;

      return {
        id: `bhv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        type: b.type,
        enabled: b.enabled,
        priority: b.priority,
        config: customConfig,
        metadata: {
          createdAt: Date.now(),
          createdBy: userId,
        },
      };
    });

    // Create workflow object
    const workflowId = await ctx.db.insert("objects", {
      type: "workflow",
      subtype: template.subtype,
      organizationId: args.organizationId,
      name: args.customization.name,
      description:
        args.customization.description || template.description,
      status: "draft", // Always create as draft
      customProperties: {
        objects: args.customization.objects,
        behaviors,
        execution: template.execution,
        templateId: template.id,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: workflowId,
      actionType: "workflow_created_from_template",
      actionData: {
        templateId: template.id,
        templateName: template.name,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return workflowId;
  },
});
