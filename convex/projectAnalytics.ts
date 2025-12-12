/**
 * PROJECT ANALYTICS
 *
 * Professional+ tier feature for viewing advanced project reports and analytics.
 * Implements checkFeatureAccess for advancedReportsEnabled.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";
import { checkFeatureAccess } from "./licensing/helpers";

/**
 * GET PROJECT ANALYTICS
 *
 * Returns detailed analytics for a project.
 * ⚡ PROFESSIONAL TIER: Only Professional+ can view advanced project analytics.
 */
export const getProjectAnalytics = query({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get project
    const project = await ctx.db.get(args.projectId);
    if (!project || project.type !== "project") {
      throw new Error("Project not found");
    }

    // ⚡ PROFESSIONAL TIER: Advanced Reports
    // Professional+ can view detailed project analytics
    await checkFeatureAccess(ctx, project.organizationId, "advancedReportsEnabled");

    // Calculate project analytics
    const props = project.customProperties || {};
    const startDate = props.startDate || project.createdAt;
    const targetEndDate = props.targetEndDate;
    const budget = props.budget;

    // Get project tasks/milestones (if they exist)
    const tasks = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", project.organizationId).eq("type", "task")
      )
      .filter((q) => q.eq(q.field("customProperties.projectId"), args.projectId))
      .collect();

    // Calculate task statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate time analytics
    const now = Date.now();
    const daysElapsed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    const daysRemaining = targetEndDate
      ? Math.floor((targetEndDate - now) / (1000 * 60 * 60 * 24))
      : null;
    const isOverdue = targetEndDate && now > targetEndDate;

    // Calculate budget analytics
    const budgetSpent = props.budgetSpent || 0;
    const budgetRemaining = budget ? budget.amount - budgetSpent : null;
    const budgetUtilization = budget ? (budgetSpent / budget.amount) * 100 : 0;

    return {
      projectId: args.projectId,
      projectName: project.name,
      status: project.status,
      subtype: project.subtype,

      // Time analytics
      timeAnalytics: {
        startDate,
        targetEndDate,
        daysElapsed,
        daysRemaining,
        isOverdue,
        progress: props.progress || 0,
      },

      // Task analytics
      taskAnalytics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks: totalTasks - completedTasks - inProgressTasks,
        completionRate: Math.round(completionRate),
      },

      // Budget analytics
      budgetAnalytics: budget ? {
        currency: budget.currency,
        totalBudget: budget.amount,
        spent: budgetSpent,
        remaining: budgetRemaining,
        utilization: Math.round(budgetUtilization),
      } : null,

      // Health indicators
      health: {
        onTrack: !isOverdue && completionRate >= props.progress,
        timeHealthy: !isOverdue,
        budgetHealthy: budgetUtilization <= 100,
        overallHealth: !isOverdue && budgetUtilization <= 100 ? "good" :
                        isOverdue || budgetUtilization > 120 ? "poor" : "fair",
      },
    };
  },
});

/**
 * GET ORGANIZATION PROJECT REPORTS
 *
 * Returns aggregated analytics for all projects in an organization.
 * ⚡ PROFESSIONAL TIER: Only Professional+ can view organization-wide reports.
 */
export const getOrganizationProjectReports = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    startDate: v.optional(v.number()), // Filter by project start date
    endDate: v.optional(v.number()),
    status: v.optional(v.string()), // Filter by status
  },
  handler: async (ctx, args) => {
    // Authenticate user
    await requireAuthenticatedUser(ctx, args.sessionId);

    // ⚡ PROFESSIONAL TIER: Advanced Reports
    // Professional+ can view organization-wide project reports
    await checkFeatureAccess(ctx, args.organizationId, "advancedReportsEnabled");

    // Get all projects for organization
    let projects = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "project")
      )
      .collect();

    // Apply filters
    if (args.startDate) {
      projects = projects.filter((p) => {
        const startDate = p.customProperties?.startDate || p.createdAt;
        return startDate >= args.startDate!;
      });
    }

    if (args.endDate) {
      projects = projects.filter((p) => {
        const startDate = p.customProperties?.startDate || p.createdAt;
        return startDate <= args.endDate!;
      });
    }

    if (args.status) {
      projects = projects.filter((p) => p.status === args.status);
    }

    // Calculate aggregate statistics
    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === "active").length;
    const completedProjects = projects.filter((p) => p.status === "completed").length;
    const onHoldProjects = projects.filter((p) => p.status === "on_hold").length;

    // Calculate budget totals
    let totalBudget = 0;
    let totalSpent = 0;
    const projectsWithBudget = projects.filter((p) => p.customProperties?.budget);

    for (const project of projectsWithBudget) {
      const budget = project.customProperties?.budget;
      if (budget) {
        totalBudget += budget.amount;
        totalSpent += project.customProperties?.budgetSpent || 0;
      }
    }

    // Calculate progress average
    const avgProgress = projects.length > 0
      ? projects.reduce((sum, p) => sum + (p.customProperties?.progress || 0), 0) / projects.length
      : 0;

    return {
      summary: {
        totalProjects,
        activeProjects,
        completedProjects,
        onHoldProjects,
        draftProjects: projects.filter((p) => p.status === "draft").length,
        cancelledProjects: projects.filter((p) => p.status === "cancelled").length,
      },

      budget: {
        totalBudget,
        totalSpent,
        remaining: totalBudget - totalSpent,
        utilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
        projectsWithBudget: projectsWithBudget.length,
      },

      progress: {
        averageProgress: Math.round(avgProgress),
        onTrack: projects.filter((p) => {
          const progress = p.customProperties?.progress || 0;
          const targetEnd = p.customProperties?.targetEndDate;
          return !targetEnd || Date.now() <= targetEnd;
        }).length,
        overdue: projects.filter((p) => {
          const targetEnd = p.customProperties?.targetEndDate;
          return targetEnd && Date.now() > targetEnd;
        }).length,
      },

      bySubtype: projects.reduce((acc, p) => {
        const subtype = p.subtype || "other";
        acc[subtype] = (acc[subtype] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),

      byPriority: projects.reduce((acc, p) => {
        const priority = p.customProperties?.priority || "medium";
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  },
});

/**
 * GET PROJECT TIMELINE
 *
 * Returns timeline data for project visualization.
 * ⚡ PROFESSIONAL TIER: Only Professional+ can view project timelines.
 */
export const getProjectTimeline = query({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get project
    const project = await ctx.db.get(args.projectId);
    if (!project || project.type !== "project") {
      throw new Error("Project not found");
    }

    // ⚡ PROFESSIONAL TIER: Advanced Reports
    await checkFeatureAccess(ctx, project.organizationId, "advancedReportsEnabled");

    // Get all actions for this project
    const actions = await ctx.db
      .query("objectActions")
      .withIndex("by_object", (q) => q.eq("objectId", args.projectId))
      .order("desc")
      .take(100);

    // Format timeline events
    const timeline = actions.map((action) => ({
      timestamp: action.performedAt,
      action: action.actionType,
      performedBy: action.performedBy,
      data: action.actionData,
    }));

    return {
      projectId: args.projectId,
      timeline,
      totalEvents: timeline.length,
    };
  },
});
