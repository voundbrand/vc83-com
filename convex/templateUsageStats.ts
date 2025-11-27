import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, getUserContext, checkPermission } from "./rbacHelpers";

/**
 * TEMPLATE USAGE STATISTICS
 *
 * Queries for tracking template usage across template sets,
 * email sends, PDF generations, and other template-related actions.
 */

/**
 * Get Template Usage Statistics
 *
 * Returns comprehensive usage data for a specific template:
 * - Template set membership count
 * - Recent usage actions (renders, email sends, PDF generations)
 * - Last used timestamp
 * - Total render count
 */
export const getTemplateUsageStats = query({
  args: {
    sessionId: v.string(),
    templateId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get template to verify access
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_templates",
      template.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: view_templates required");
    }

    // Get template sets containing this template
    // Using "includes_template" linkType where template is the target (toObjectId)
    const setLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_link_type", (q) =>
        q.eq("toObjectId", args.templateId).eq("linkType", "includes_template")
      )
      .collect();

    // Get recent usage from objectActions
    // Track various template-related actions
    const allActions = await ctx.db
      .query("objectActions")
      .withIndex("by_object", (q) => q.eq("objectId", args.templateId))
      .order("desc")
      .take(100);

    // Filter for usage-related actions
    const usageActions = allActions.filter((action) => {
      const actionType = action.actionType;
      return (
        actionType === "template_applied" ||
        actionType === "template_rendered" ||
        actionType === "email_sent" ||
        actionType === "pdf_generated" ||
        actionType === "template_used"
      );
    });

    const lastUsed = usageActions[0]?.performedAt || null;
    const totalRenders = usageActions.length;

    // Count by action type
    const actionCounts = usageActions.reduce((acc, action) => {
      const type = action.actionType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      inSetCount: setLinks.length,
      setIds: setLinks.map((l) => l.fromObjectId),
      lastUsed,
      totalRenders,
      actionCounts,
      recentUsage: usageActions.slice(0, 10),
    };
  },
});

/**
 * Get Templates With Usage Stats
 *
 * Returns all templates for an organization enhanced with usage statistics.
 * Useful for displaying template lists with usage data.
 */
export const getTemplatesWithUsage = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()), // Filter by template subtype (e.g., "email", "pdf_ticket")
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    await getUserContext(ctx, userId, args.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_templates",
      args.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: view_templates required");
    }

    // Get all templates for org
    const templatesQuery = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template")
      );

    const allTemplates = await templatesQuery.collect();

    // Filter by subtype if specified
    const templates = args.subtype
      ? allTemplates.filter((t) => t.subtype === args.subtype)
      : allTemplates;

    // Enhance with usage stats
    const templatesWithUsage = await Promise.all(
      templates.map(async (template) => {
        // Get template sets containing this template
        const setLinks = await ctx.db
          .query("objectLinks")
          .withIndex("by_to_link_type", (q) =>
            q.eq("toObjectId", template._id).eq("linkType", "includes_template")
          )
          .collect();

        // Get recent usage actions
        const allActions = await ctx.db
          .query("objectActions")
          .withIndex("by_object", (q) => q.eq("objectId", template._id))
          .order("desc")
          .take(20); // Limit for performance

        // Filter for usage-related actions
        const usageActions = allActions.filter((action) => {
          const actionType = action.actionType;
          return (
            actionType === "template_applied" ||
            actionType === "template_rendered" ||
            actionType === "email_sent" ||
            actionType === "pdf_generated" ||
            actionType === "template_used"
          );
        });

        const lastUsed = usageActions[0]?.performedAt || null;
        const totalRenders = usageActions.length;

        return {
          ...template,
          usage: {
            inSetCount: setLinks.length,
            lastUsed,
            totalRenders,
          },
        };
      })
    );

    return templatesWithUsage;
  },
});

/**
 * Get Template Set Usage Statistics
 *
 * Returns usage statistics for all templates in a template set.
 */
export const getTemplateSetUsageStats = query({
  args: {
    sessionId: v.string(),
    setId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get template set
    const templateSet = await ctx.db.get(args.setId);
    if (!templateSet) {
      throw new Error("Template set not found");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_templates",
      templateSet.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: view_templates required");
    }

    // Get all templates in this set
    const templateLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.setId))
      .filter((q) => q.eq(q.field("linkType"), "includes_template"))
      .collect();

    // Get usage stats for each template
    const templateUsageStats = await Promise.all(
      templateLinks.map(async (link) => {
        const template = await ctx.db.get(link.toObjectId);
        if (!template) return null;

        // Get usage actions for this template
        const allActions = await ctx.db
          .query("objectActions")
          .withIndex("by_object", (q) => q.eq("objectId", template._id))
          .order("desc")
          .take(20);

        const usageActions = allActions.filter((action) => {
          const actionType = action.actionType;
          return (
            actionType === "template_applied" ||
            actionType === "template_rendered" ||
            actionType === "email_sent" ||
            actionType === "pdf_generated" ||
            actionType === "template_used"
          );
        });

        return {
          templateId: template._id,
          templateName: template.name,
          templateType: link.properties?.templateType,
          lastUsed: usageActions[0]?.performedAt || null,
          totalRenders: usageActions.length,
        };
      })
    );

    // Filter out null entries
    const validStats = templateUsageStats.filter((stat) => stat !== null);

    // Calculate aggregate stats
    const totalTemplates = validStats.length;
    const totalRenders = validStats.reduce((sum, stat) => sum + (stat?.totalRenders || 0), 0);
    const lastUsed = validStats
      .map((stat) => stat?.lastUsed)
      .filter((date): date is number => date !== null)
      .sort((a, b) => b - a)[0] || null;

    return {
      setId: args.setId,
      setName: templateSet.name,
      totalTemplates,
      totalRenders,
      lastUsed,
      templates: validStats,
    };
  },
});

/**
 * Get Most Used Templates
 *
 * Returns the most frequently used templates across an organization.
 */
export const getMostUsedTemplates = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()), // Default: 10
    subtype: v.optional(v.string()), // Filter by template subtype
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    await getUserContext(ctx, userId, args.organizationId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_templates",
      args.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied: view_templates required");
    }

    const limit = args.limit || 10;

    // Get all templates for org
    const templatesQuery = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "template")
      );

    const allTemplates = await templatesQuery.collect();

    // Filter by subtype if specified
    const templates = args.subtype
      ? allTemplates.filter((t) => t.subtype === args.subtype)
      : allTemplates;

    // Get usage stats for each template
    const templatesWithUsage = await Promise.all(
      templates.map(async (template) => {
        const allActions = await ctx.db
          .query("objectActions")
          .withIndex("by_object", (q) => q.eq("objectId", template._id))
          .order("desc")
          .take(100);

        const usageActions = allActions.filter((action) => {
          const actionType = action.actionType;
          return (
            actionType === "template_applied" ||
            actionType === "template_rendered" ||
            actionType === "email_sent" ||
            actionType === "pdf_generated" ||
            actionType === "template_used"
          );
        });

        return {
          template,
          usageCount: usageActions.length,
          lastUsed: usageActions[0]?.performedAt || null,
        };
      })
    );

    // Sort by usage count and limit
    const sortedTemplates = templatesWithUsage
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);

    return sortedTemplates.map((item) => ({
      ...item.template,
      usageCount: item.usageCount,
      lastUsed: item.lastUsed,
    }));
  },
});
