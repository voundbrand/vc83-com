/**
 * API V1: PROJECTS INTERNAL HANDLERS
 *
 * Internal query/mutation handlers for Projects API endpoints.
 * These are called by the HTTP action handlers in projects.ts.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

/**
 * LIST PROJECTS (INTERNAL)
 *
 * Lists projects with filtering and pagination.
 */
export const listProjectsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Query all projects for organization
    const query = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "project")
      );

    const allProjects = await query.collect();

    // 2. Apply filters
    let filteredProjects = allProjects;

    if (args.subtype) {
      filteredProjects = filteredProjects.filter(
        (p) => p.subtype === args.subtype
      );
    }

    if (args.status) {
      filteredProjects = filteredProjects.filter(
        (p) => p.status === args.status
      );
    }

    if (args.priority) {
      filteredProjects = filteredProjects.filter((p) => {
        const props = p.customProperties || {};
        return props.priority === args.priority;
      });
    }

    // 3. Sort by creation date (newest first)
    filteredProjects.sort((a, b) => b.createdAt - a.createdAt);

    // 4. Apply pagination
    const total = filteredProjects.length;
    const paginatedProjects = filteredProjects.slice(
      args.offset,
      args.offset + args.limit
    );

    // 5. Format response
    const projects = paginatedProjects.map((project) => ({
      id: project._id,
      organizationId: project.organizationId,
      name: project.name,
      description: project.description,
      subtype: project.subtype,
      status: project.status,
      projectCode: project.customProperties?.projectCode,
      startDate: project.customProperties?.startDate,
      targetEndDate: project.customProperties?.targetEndDate,
      budget: project.customProperties?.budget,
      priority: project.customProperties?.priority,
      progress: project.customProperties?.progress,
      clientOrgId: project.customProperties?.clientOrgId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }));

    return {
      projects,
      total,
      limit: args.limit,
      offset: args.offset,
    };
  },
});

/**
 * GET PROJECT (INTERNAL)
 *
 * Gets a specific project by ID.
 */
export const getProjectInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get project
    const project = await ctx.db.get(args.projectId as Id<"objects">);

    if (!project) {
      return null;
    }

    // 2. Verify organization access
    if (project.organizationId !== args.organizationId) {
      return null;
    }

    // 3. Verify it's a project
    if (project.type !== "project") {
      return null;
    }

    // 4. Format response
    return {
      id: project._id,
      organizationId: project.organizationId,
      name: project.name,
      description: project.description,
      subtype: project.subtype,
      status: project.status,
      projectCode: project.customProperties?.projectCode,
      startDate: project.customProperties?.startDate,
      targetEndDate: project.customProperties?.targetEndDate,
      budget: project.customProperties?.budget,
      priority: project.customProperties?.priority,
      progress: project.customProperties?.progress,
      clientOrgId: project.customProperties?.clientOrgId,
      detailedDescription: project.customProperties?.detailedDescription,
      customProperties: project.customProperties,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  },
});

/**
 * CREATE PROJECT (INTERNAL)
 *
 * Creates a new project.
 */
export const createProjectInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
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
    customProperties: v.optional(v.any()),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Validate subtype
    const validSubtypes = ["client_project", "internal", "campaign", "product_development", "other"];
    if (!validSubtypes.includes(args.subtype)) {
      throw new Error(
        `Invalid project subtype. Must be one of: ${validSubtypes.join(", ")}`
      );
    }

    // Validate priority
    const validPriorities = ["low", "medium", "high", "critical"];
    if (args.priority && !validPriorities.includes(args.priority)) {
      throw new Error(
        `Invalid priority. Must be one of: ${validPriorities.join(", ")}`
      );
    }

    // Validate dates
    if (args.startDate && args.targetEndDate && args.targetEndDate < args.startDate) {
      throw new Error("Target end date must be after start date");
    }

    // Generate project code: PRJ-YYYY-###
    const year = new Date().getFullYear();
    const existingProjects = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "project")
      )
      .collect();

    // Count projects for this year to get next number
    const thisYearProjects = existingProjects.filter((p) => {
      const props = p.customProperties || {};
      return props.projectCode?.startsWith(`PRJ-${year}-`);
    });
    const nextNumber = (thisYearProjects.length + 1).toString().padStart(3, "0");
    const projectCode = `PRJ-${year}-${nextNumber}`;

    // Build customProperties with project data
    const customProperties = {
      projectCode,
      startDate: args.startDate || Date.now(),
      targetEndDate: args.targetEndDate,
      budget: args.budget || { amount: 0, currency: "USD" },
      priority: args.priority || "medium",
      progress: 0, // Initial progress is 0%
      clientOrgId: args.clientOrgId,
      detailedDescription: "", // Rich HTML (empty initially)
      ...(args.customProperties || {}),
    };

    // Create project object
    const projectId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "project",
      subtype: args.subtype,
      name: args.name,
      description: args.description,
      status: "draft", // Start as draft
      customProperties,
      createdBy: args.performedBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log creation
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: projectId,
      actionType: "created",
      actionData: {
        source: "api",
        subtype: args.subtype,
        projectCode,
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return projectId;
  },
});

/**
 * UPDATE PROJECT (INTERNAL)
 *
 * Updates an existing project.
 */
export const updateProjectInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.string(),
    subtype: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    targetEndDate: v.optional(v.number()),
    budget: v.optional(v.object({
      amount: v.number(),
      currency: v.string(),
    })),
    priority: v.optional(v.string()),
    progress: v.optional(v.number()),
    status: v.optional(v.string()),
    clientOrgId: v.optional(v.string()),
    customProperties: v.optional(v.any()),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId as Id<"objects">);

    if (!project || project.type !== "project") {
      throw new Error("Project not found");
    }

    // Verify organization access
    if (project.organizationId !== args.organizationId) {
      throw new Error("Project not found");
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;

    if (args.subtype !== undefined) {
      const validSubtypes = ["client_project", "internal", "campaign", "product_development", "other"];
      if (!validSubtypes.includes(args.subtype)) {
        throw new Error(
          `Invalid project subtype. Must be one of: ${validSubtypes.join(", ")}`
        );
      }
      updates.subtype = args.subtype;
    }

    if (args.status !== undefined) {
      const validStatuses = ["draft", "planning", "active", "on_hold", "completed", "cancelled"];
      if (!validStatuses.includes(args.status)) {
        throw new Error(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }
      updates.status = args.status;
    }

    // Update customProperties
    if (
      args.startDate !== undefined ||
      args.targetEndDate !== undefined ||
      args.budget !== undefined ||
      args.priority !== undefined ||
      args.progress !== undefined ||
      args.clientOrgId !== undefined ||
      args.customProperties
    ) {
      const currentProps = project.customProperties || {};

      // Validate dates if both are provided
      const newStartDate = args.startDate ?? currentProps.startDate;
      const newEndDate = args.targetEndDate ?? currentProps.targetEndDate;
      if (newEndDate && newStartDate && newEndDate < newStartDate) {
        throw new Error("Target end date must be after start date");
      }

      // Validate priority
      if (args.priority) {
        const validPriorities = ["low", "medium", "high", "critical"];
        if (!validPriorities.includes(args.priority)) {
          throw new Error(
            `Invalid priority. Must be one of: ${validPriorities.join(", ")}`
          );
        }
      }

      // Validate progress
      if (args.progress !== undefined && (args.progress < 0 || args.progress > 100)) {
        throw new Error("Progress must be between 0 and 100");
      }

      updates.customProperties = {
        ...currentProps,
        ...(args.startDate !== undefined && { startDate: args.startDate }),
        ...(args.targetEndDate !== undefined && { targetEndDate: args.targetEndDate }),
        ...(args.budget !== undefined && { budget: args.budget }),
        ...(args.priority !== undefined && { priority: args.priority }),
        ...(args.progress !== undefined && { progress: args.progress }),
        ...(args.clientOrgId !== undefined && { clientOrgId: args.clientOrgId }),
        ...(args.customProperties || {}),
      };
    }

    await ctx.db.patch(args.projectId as Id<"objects">, updates);

    // Log update
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.projectId as Id<"objects">,
      actionType: "updated",
      actionData: {
        source: "api",
        updatedFields: Object.keys(updates),
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return args.projectId;
  },
});

/**
 * DELETE PROJECT (INTERNAL)
 *
 * Permanently deletes a draft project.
 */
export const deleteProjectInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.string(),
    performedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId as Id<"objects">);

    if (!project || project.type !== "project") {
      throw new Error("Project not found");
    }

    // Verify organization access
    if (project.organizationId !== args.organizationId) {
      throw new Error("Project not found");
    }

    // Only allow deleting draft projects
    if (project.status !== "draft") {
      throw new Error("Only draft projects can be permanently deleted");
    }

    // Delete the project permanently
    await ctx.db.delete(args.projectId as Id<"objects">);

    // Log deletion
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.projectId as Id<"objects">,
      actionType: "deleted",
      actionData: {
        source: "api",
        projectName: project.name,
      },
      performedBy: args.performedBy,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * LIST MILESTONES (INTERNAL)
 *
 * Gets all milestones for a project.
 */
export const listMilestonesInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify project exists and belongs to organization
    const project = await ctx.db.get(args.projectId as Id<"objects">);
    if (!project || project.organizationId !== args.organizationId || project.type !== "project") {
      return [];
    }

    // Get all milestone links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId as Id<"objects">).eq("linkType", "has_milestone")
      )
      .collect();

    // Get milestone objects
    const milestones = await Promise.all(
      links.map(async (link) => {
        const milestone = await ctx.db.get(link.toObjectId);
        if (!milestone) return null;

        return {
          id: milestone._id,
          name: milestone.name,
          description: milestone.description,
          status: milestone.status,
          dueDate: milestone.customProperties?.dueDate,
          projectId: milestone.customProperties?.projectId,
          createdAt: milestone.createdAt,
          updatedAt: milestone.updatedAt,
        };
      })
    );

    return milestones.filter((m) => m !== null);
  },
});

/**
 * LIST TASKS (INTERNAL)
 *
 * Gets all tasks for a project or milestone.
 */
export const listTasksInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.optional(v.string()),
    milestoneId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.projectId && !args.milestoneId) {
      throw new Error("Either projectId or milestoneId must be provided");
    }

    const parentId = (args.milestoneId || args.projectId!) as Id<"objects">;

    // Verify parent exists and belongs to organization
    const parent = await ctx.db.get(parentId);
    if (!parent || parent.organizationId !== args.organizationId) {
      return [];
    }

    // Get all task links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", parentId).eq("linkType", "has_task")
      )
      .collect();

    // Get task objects
    const tasks = await Promise.all(
      links.map(async (link) => {
        const task = await ctx.db.get(link.toObjectId);
        if (!task) return null;

        return {
          id: task._id,
          name: task.name,
          description: task.description,
          status: task.status,
          projectId: task.customProperties?.projectId,
          milestoneId: task.customProperties?.milestoneId,
          assigneeId: task.customProperties?.assigneeId,
          dueDate: task.customProperties?.dueDate,
          priority: task.customProperties?.priority,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        };
      })
    );

    return tasks.filter((t) => t !== null);
  },
});

/**
 * LIST TEAM MEMBERS (INTERNAL)
 *
 * Gets all team members for a project.
 */
export const listTeamMembersInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify project exists and belongs to organization
    const project = await ctx.db.get(args.projectId as Id<"objects">);
    if (!project || project.organizationId !== args.organizationId || project.type !== "project") {
      return [];
    }

    // Get all team member links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId as Id<"objects">).eq("linkType", "team_member")
      )
      .collect();

    // Get user details
    const teamMembers = await Promise.all(
      links.map(async (link) => {
        const props = link.properties as { userId?: unknown; role?: string } | undefined;
        const userId = props?.userId;
        if (!userId || typeof userId !== "string") return null;

        const user = await ctx.db.get(userId as Id<"users">);
        if (!user) return null;

        return {
          userId: user._id,
          name: ((user.firstName || "") + " " + (user.lastName || "")).trim() || user.email,
          email: user.email,
          role: props?.role || "member",
          addedAt: link.createdAt,
        };
      })
    );

    return teamMembers.filter((m) => m !== null);
  },
});

/**
 * LIST COMMENTS (INTERNAL)
 *
 * Gets all comments for a project.
 */
export const listCommentsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify project exists and belongs to organization
    const project = await ctx.db.get(args.projectId as Id<"objects">);
    if (!project || project.organizationId !== args.organizationId || project.type !== "project") {
      return [];
    }

    // Get all comment links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId as Id<"objects">).eq("linkType", "has_comment")
      )
      .collect();

    // Get comment objects with author info
    const comments = await Promise.all(
      links.map(async (link) => {
        const comment = await ctx.db.get(link.toObjectId);
        if (!comment) return null;

        // Get author info
        let authorName = "Unknown";
        if (comment.createdBy && typeof comment.createdBy === "string") {
          try {
            const author = await ctx.db.get(comment.createdBy as Id<"users">);
            if (author && "firstName" in author) {
              authorName = ((author.firstName as string || "") + " " + (author.lastName as string || "")).trim() || "Unknown";
            }
          } catch {
            // Author not found
          }
        }

        // Get replies
        const replyLinks = await ctx.db
          .query("objectLinks")
          .withIndex("by_from_link_type", (q) =>
            q.eq("fromObjectId", link.toObjectId).eq("linkType", "has_reply")
          )
          .collect();

        const replies = await Promise.all(
          replyLinks.map(async (replyLink) => {
            const reply = await ctx.db.get(replyLink.toObjectId);
            if (!reply) return null;

            let replyAuthorName = "Unknown";
            if (reply.createdBy && typeof reply.createdBy === "string") {
              try {
                const replyAuthor = await ctx.db.get(reply.createdBy as Id<"users">);
                if (replyAuthor && "firstName" in replyAuthor) {
                  replyAuthorName = ((replyAuthor.firstName as string || "") + " " + (replyAuthor.lastName as string || "")).trim() || "Unknown";
                }
              } catch {
                // Author not found
              }
            }

            return {
              id: reply._id,
              content: reply.description,
              authorName: replyAuthorName,
              authorId: reply.createdBy,
              createdAt: reply.createdAt,
            };
          })
        );

        return {
          id: comment._id,
          content: comment.description,
          authorName,
          authorId: comment.createdBy,
          parentCommentId: comment.customProperties?.parentCommentId,
          replies: replies.filter((r) => r !== null),
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        };
      })
    );

    return comments.filter((c) => c !== null);
  },
});

/**
 * GET ACTIVITY LOG (INTERNAL)
 *
 * Gets all activity for a project.
 */
export const getActivityLogInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify project exists and belongs to organization
    const project = await ctx.db.get(args.projectId as Id<"objects">);
    if (!project || project.organizationId !== args.organizationId || project.type !== "project") {
      return [];
    }

    const actions = await ctx.db
      .query("objectActions")
      .withIndex("by_object", (q) => q.eq("objectId", args.projectId as Id<"objects">))
      .order("desc")
      .take(args.limit || 100);

    // Enrich with user info
    const enrichedActions = await Promise.all(
      actions.map(async (action) => {
        let performerName = "System";
        if (action.performedBy && typeof action.performedBy === "string") {
          try {
            const performer = await ctx.db.get(action.performedBy as Id<"users">);
            if (performer && "firstName" in performer) {
              performerName = ((performer.firstName as string || "") + " " + (performer.lastName as string || "")).trim() || "Unknown";
            }
          } catch {
            // Performer not found
          }
        }

        return {
          id: action._id,
          actionType: action.actionType,
          actionData: action.actionData,
          performerName,
          performedBy: action.performedBy,
          performedAt: action.performedAt,
        };
      })
    );

    return enrichedActions;
  },
});
