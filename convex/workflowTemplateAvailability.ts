/**
 * WORKFLOW TEMPLATE AVAILABILITY
 *
 * Manages which workflow templates are available to which organizations.
 * Similar to checkoutTemplateAvailability.ts and formTemplateAvailability.ts
 *
 * Types stored in objects table:
 * - workflow_template_availability (defines which orgs can use which workflow templates)
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser, checkPermission } from "./rbacHelpers";
import { checkFeatureAccess } from "./licensing/helpers";

/**
 * GET AVAILABLE WORKFLOW TEMPLATES FOR ORGANIZATION
 *
 * Returns workflow templates that are available to the specified organization.
 */
export const getAvailableWorkflowTemplates = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    category: v.optional(v.string()), // Filter by category
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

    // Get all system workflow templates (type: "template", subtype: "workflow")
    let systemTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("status"), "published"))
      .filter((q) => q.eq(q.field("subtype"), "workflow"))
      .collect();

    // Filter by category if specified (category is stored in customProperties)
    if (args.category) {
      systemTemplates = systemTemplates.filter(
        (t) => t.customProperties?.category === args.category
      );
    }

    // Get enabled availability rules for this organization (opt-in model)
    const availabilityRules = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "workflow_template_availability")
      )
      .filter((q) => q.eq(q.field("customProperties.available"), true))
      .collect();

    // Get the list of enabled template codes
    const enabledTemplateCodes = availabilityRules.map(
      (rule) => rule.customProperties?.templateCode
    ).filter(Boolean);

    // Filter to only enabled templates (opt-in: must be explicitly enabled)
    const availableTemplates = systemTemplates.filter((template) => {
      const code = template.customProperties?.code;
      if (!code) return false;

      // Template must be explicitly enabled for this organization
      return enabledTemplateCodes.includes(code);
    });

    return availableTemplates;
  },
});

/**
 * ENABLE WORKFLOW TEMPLATE FOR ORGANIZATION
 *
 * Makes a workflow template available to an organization.
 */
export const enableWorkflowTemplate = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateCode: v.string(),
    customSettings: v.optional(v.any()), // Org-specific template settings
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission (super admin only)
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_system_settings",
      args.organizationId
    );

    if (!hasPermission) {
      throw new Error(
        "Permission denied: manage_system_settings required to enable workflow templates"
      );
    }

    // Verify template exists in system org
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    const template = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("subtype"), "workflow"))
      .filter((q) => q.eq(q.field("customProperties.code"), args.templateCode))
      .first();

    if (!template) {
      throw new Error(`Workflow template not found: ${args.templateCode}`);
    }

    // Check if availability rule already exists
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "workflow_template_availability")
      )
      .filter((q) =>
        q.eq(
          q.field("customProperties.templateCode"),
          args.templateCode
        )
      )
      .first();

    let availabilityRuleId: Id<"objects">;

    if (existing) {
      // Update existing rule
      await ctx.db.patch(existing._id, {
        customProperties: {
          ...existing.customProperties,
          available: true,
          enabledBy: userId,
          enabledAt: Date.now(),
          customSettings: args.customSettings || existing.customProperties?.customSettings,
        },
        updatedAt: Date.now(),
      });
      availabilityRuleId = existing._id;
    } else {
      // Create new availability rule
      availabilityRuleId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "workflow_template_availability",
        name: `Workflow Template Availability: ${args.templateCode}`,
        status: "active",
        customProperties: {
          templateCode: args.templateCode,
          available: true,
          enabledBy: userId,
          enabledAt: Date.now(),
          customSettings: args.customSettings,
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: availabilityRuleId,
      actionType: "workflow_template_enabled",
      actionData: {
        templateCode: args.templateCode,
        customSettings: args.customSettings,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true, availabilityRuleId };
  },
});

/**
 * DISABLE WORKFLOW TEMPLATE FOR ORGANIZATION
 *
 * Removes access to a workflow template for an organization.
 */
export const disableWorkflowTemplate = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateCode: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission (super admin only)
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_system_settings",
      args.organizationId
    );

    if (!hasPermission) {
      throw new Error(
        "Permission denied: manage_system_settings required to disable workflow templates"
      );
    }

    // Find availability rule
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "workflow_template_availability")
      )
      .filter((q) =>
        q.eq(
          q.field("customProperties.templateCode"),
          args.templateCode
        )
      )
      .first();

    let availabilityRuleId: Id<"objects">;

    if (existing) {
      // Update to disabled
      await ctx.db.patch(existing._id, {
        customProperties: {
          ...existing.customProperties,
          available: false,
          disabledBy: userId,
          disabledAt: Date.now(),
        },
        updatedAt: Date.now(),
      });
      availabilityRuleId = existing._id;
    } else {
      // Create disabled rule
      availabilityRuleId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "workflow_template_availability",
        name: `Workflow Template Availability: ${args.templateCode}`,
        status: "active",
        customProperties: {
          templateCode: args.templateCode,
          available: false,
          disabledBy: userId,
          disabledAt: Date.now(),
        },
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: availabilityRuleId,
      actionType: "workflow_template_disabled",
      actionData: {
        templateCode: args.templateCode,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true, availabilityRuleId };
  },
});

/**
 * GET ALL SYSTEM WORKFLOW TEMPLATES
 *
 * Returns all workflow templates from the system organization.
 * Used in super admin UI to see which workflow templates can be enabled.
 */
export const getAllSystemWorkflowTemplates = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Only super admins can view all workflow templates
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    let isSuperAdmin = false;
    if (user.global_role_id) {
      const globalRole = await ctx.db.get(user.global_role_id);
      if (globalRole && globalRole.name === "super_admin") {
        isSuperAdmin = true;
      }
    }

    if (!isSuperAdmin) {
      throw new Error("Permission denied: Only super admins can view all workflow templates");
    }

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // Get all workflow templates from system org (type: "template", subtype: "workflow")
    const workflowTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "template")
      )
      .filter((q) => q.eq(q.field("status"), "published"))
      .filter((q) => q.eq(q.field("subtype"), "workflow"))
      .collect();

    return workflowTemplates;
  },
});

/**
 * GET ALL WORKFLOW TEMPLATE AVAILABILITIES
 *
 * Returns all workflow template availability records for all organizations.
 * Used in super admin UI.
 */
export const getAllWorkflowTemplateAvailabilities = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")), // Filter by org
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Only super admins can view all availabilities
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    let isSuperAdmin = false;
    if (user.global_role_id) {
      const globalRole = await ctx.db.get(user.global_role_id);
      if (globalRole && globalRole.name === "super_admin") {
        isSuperAdmin = true;
      }
    }

    if (!isSuperAdmin) {
      throw new Error("Permission denied: Only super admins can view all workflow template availabilities");
    }

    // Get availabilities
    const queryBuilder = ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "workflow_template_availability"));

    // Optionally filter by organization
    let availabilities;
    if (args.organizationId) {
      availabilities = await queryBuilder
        .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
        .collect();
    } else {
      availabilities = await queryBuilder.collect();
    }

    return availabilities;
  },
});

/**
 * UPDATE WORKFLOW TEMPLATE SETTINGS
 *
 * Updates custom settings for a workflow template availability.
 * Allows org-specific configuration of template behavior.
 */
export const updateWorkflowTemplateSettings = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateCode: v.string(),
    customSettings: v.any(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission (super admin only)
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_system_settings",
      args.organizationId
    );

    if (!hasPermission) {
      throw new Error(
        "Permission denied: manage_system_settings required to update workflow template settings"
      );
    }

    // Find availability rule
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "workflow_template_availability")
      )
      .filter((q) =>
        q.eq(
          q.field("customProperties.templateCode"),
          args.templateCode
        )
      )
      .first();

    if (!existing) {
      throw new Error(`Workflow template availability not found for: ${args.templateCode}`);
    }

    // Update settings
    await ctx.db.patch(existing._id, {
      customProperties: {
        ...existing.customProperties,
        customSettings: args.customSettings,
      },
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: existing._id,
      actionType: "workflow_template_settings_updated",
      actionData: {
        templateCode: args.templateCode,
        customSettings: args.customSettings,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * CREATE WORKFLOW FROM TEMPLATE
 *
 * Creates a new workflow in the organization based on a workflow template.
 * Clones the template's configuration and behaviors.
 */
export const createWorkflowFromTemplate = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    templateId: v.id("objects"),
    workflowName: v.optional(v.string()),
    objectMappings: v.optional(v.record(v.string(), v.id("objects"))), // Map object types to actual object IDs
  },
  handler: async (ctx, args) => {
    console.log("🔵 [Backend] createWorkflowFromTemplate called", {
      templateId: args.templateId,
      organizationId: args.organizationId,
    });

    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    console.log("🔵 [Backend] User authenticated:", { userId });

    // Check permission to create workflows
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "manage_workflows",
      args.organizationId
    );

    if (!hasPermission) {
      console.error("❌ [Backend] Permission denied for user:", userId);
      throw new Error(
        "Permission denied: manage_workflows required to create workflows from templates"
      );
    }

    console.log("✅ [Backend] Permission check passed");

    // CHECK FEATURE ACCESS: Workflow templates require Starter tier or higher
    await checkFeatureAccess(ctx, args.organizationId, "workflowTemplatesEnabled");

    // Get the template
    const template = await ctx.db.get(args.templateId);
    console.log("🔵 [Backend] Template retrieved:", {
      templateId: args.templateId,
      found: !!template,
      type: template?.type,
      subtype: template?.subtype,
      name: template?.name,
    });

    if (!template) {
      console.error("❌ [Backend] Template not found:", args.templateId);
      throw new Error("Template not found");
    }

    // Verify this is a workflow template
    if (template.type !== "template" || template.subtype !== "workflow") {
      console.error("❌ [Backend] Invalid template type:", {
        type: template.type,
        subtype: template.subtype,
      });
      throw new Error("Invalid template: must be a workflow template");
    }

    // Verify template is available to this organization
    const templateCode = template.customProperties?.code;
    console.log("🔵 [Backend] Template code:", templateCode);

    if (!templateCode) {
      console.error("❌ [Backend] Template code not found in customProperties");
      throw new Error("Template code not found");
    }

    const availability = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "workflow_template_availability")
      )
      .filter((q) =>
        q.eq(q.field("customProperties.templateCode"), templateCode)
      )
      .filter((q) => q.eq(q.field("customProperties.available"), true))
      .first();

    console.log("🔵 [Backend] Availability check:", {
      templateCode,
      availabilityFound: !!availability,
      available: availability?.customProperties?.available,
    });

    if (!availability) {
      console.error("❌ [Backend] Template not available to organization:", {
        templateCode,
        organizationId: args.organizationId,
      });
      throw new Error("Template not available to this organization");
    }

    // Clone template configuration (behaviors/objects/execution are directly in customProperties, not nested in workflowConfig)
    const templateConfig = template.customProperties || {};
    const workflowName = args.workflowName || `${template.name} (Copy)`;

    console.log("🔵 [Backend] Template config:", {
      subtype: templateConfig.subtype,
      objectsCount: templateConfig.objects?.length || 0,
      behaviorsCount: templateConfig.behaviors?.length || 0,
      hasExecution: !!templateConfig.execution,
      hasVisualData: !!templateConfig.visualData,
    });

    console.log("🔵 [Backend] Full template customProperties:",
      JSON.stringify(template.customProperties, null, 2)
    );

    // Create workflow from template
    const workflowId = await ctx.db.insert("objects", {
      type: "workflow",
      subtype: templateConfig.subtype || "general",
      organizationId: args.organizationId,
      name: workflowName,
      description: template.description,
      status: "draft", // Start as draft
      customProperties: {
        behaviors: (templateConfig.behaviors || []).map((b: any) => ({
          ...b,
          id: `bhv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          metadata: {
            createdAt: Date.now(),
            createdBy: userId,
          },
        })),
        execution: templateConfig.execution || {
          triggerOn: "manual",
          errorHandling: "notify",
        },
        visualData: templateConfig.visualData,
        templateId: args.templateId, // Track which template this came from
        templateCode: templateCode,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("✅ [Backend] Workflow created:", {
      workflowId,
      name: workflowName,
      behaviorsCount: (templateConfig.behaviors || []).length,
    });

    // Log the action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: workflowId,
      actionType: "workflow_created_from_template",
      actionData: {
        templateId: args.templateId,
        templateCode: templateCode,
        workflowName: workflowName,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    console.log("✅ [Backend] Action logged, returning result");
    return { workflowId, success: true };
  },
});
