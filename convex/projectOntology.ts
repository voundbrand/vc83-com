/**
 * PROJECT ONTOLOGY
 *
 * Manages projects as containers for tracking client work, internal initiatives, and campaigns.
 * Uses the universal ontology system (objects table).
 *
 * Project Types (subtype):
 * - "client_project" - Client-facing projects
 * - "internal" - Internal company projects
 * - "campaign" - Marketing campaigns
 * - "product_development" - Product development initiatives
 * - "other" - Other project types
 *
 * Status Workflow:
 * - "draft" - Initial planning
 * - "planning" - Active planning phase
 * - "active" - Project is actively being worked on
 * - "on_hold" - Temporarily paused
 * - "completed" - Successfully completed
 * - "cancelled" - Project was cancelled
 *
 * Project Features (Phase 3 - Complete):
 * - ✅ Project code generation (PRJ-YYYY-###)
 * - ✅ Budget tracking (amount + currency)
 * - ✅ Priority levels (low, medium, high, critical)
 * - ✅ Progress tracking (0-100%)
 * - ✅ CRM integration (link to client organization)
 * - ✅ Rich text descriptions
 * - ✅ Milestones tracking
 * - ✅ Task management with assignees
 * - ✅ Team member assignments
 * - ✅ Document attachments
 * - ✅ Threaded comments
 * - ✅ Activity log (via objectActions)
 * - ✅ Full-text search
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./rbacHelpers";
import { checkResourceLimit, checkFeatureAccess } from "./licensing/helpers";

/**
 * GET PROJECTS
 * Returns all projects for an organization
 */
export const getProjects = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()), // Filter by project type
    status: v.optional(v.string()),  // Filter by status
    priority: v.optional(v.string()), // Filter by priority
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const q = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "project")
      );

    let projects = await q.collect();

    // Apply filters
    if (args.subtype) {
      projects = projects.filter((p) => p.subtype === args.subtype);
    }

    if (args.status) {
      projects = projects.filter((p) => p.status === args.status);
    }

    if (args.priority) {
      projects = projects.filter((p) => {
        const props = p.customProperties || {};
        return props.priority === args.priority;
      });
    }

    return projects;
  },
});

/**
 * GET PROJECT
 * Get a single project by ID
 */
export const getProject = query({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const project = await ctx.db.get(args.projectId);

    if (!project || !("type" in project) || project.type !== "project") {
      throw new Error("Project not found");
    }

    return project;
  },
});

/**
 * CREATE PROJECT
 * Create a new project
 */
export const createProject = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.string(), // "client_project" | "internal" | "campaign" | "product_development" | "other"
    name: v.string(),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()), // Unix timestamp
    targetEndDate: v.optional(v.number()), // Unix timestamp
    budget: v.optional(v.object({
      amount: v.number(),
      currency: v.string(),
    })),
    priority: v.optional(v.string()), // "low" | "medium" | "high" | "critical"
    clientOrgId: v.optional(v.id("objects")), // CRM organization ID
    customProperties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // CHECK LICENSE LIMIT: Enforce project limit for organization's tier
    // Free: 3, Starter: 20, Pro: Unlimited, Agency: Unlimited, Enterprise: Unlimited
    await checkResourceLimit(ctx, args.organizationId, "project", "maxProjects");

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
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return projectId;
  },
});

/**
 * UPDATE PROJECT
 * Update an existing project
 */
export const updateProject = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    subtype: v.optional(v.string()), // Allow updating project type
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    targetEndDate: v.optional(v.number()),
    budget: v.optional(v.object({
      amount: v.number(),
      currency: v.string(),
    })),
    priority: v.optional(v.string()),
    progress: v.optional(v.number()), // 0-100
    status: v.optional(v.string()), // "draft" | "planning" | "active" | "on_hold" | "completed" | "cancelled"
    clientOrgId: v.optional(v.id("objects")),
    customProperties: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const project = await ctx.db.get(args.projectId);

    if (!project || !("type" in project) || project.type !== "project") {
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

      // CHECK FEATURE ACCESS: Budget tracking requires Starter tier or higher
      if (args.budget !== undefined) {
        await checkFeatureAccess(ctx, project.organizationId, "budgetTrackingEnabled");
      }

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

    await ctx.db.patch(args.projectId, updates);

    return args.projectId;
  },
});

/**
 * ARCHIVE PROJECT
 * Soft delete a project (set status to cancelled)
 */
export const archiveProject = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const project = await ctx.db.get(args.projectId);

    if (!project || !("type" in project) || project.type !== "project") {
      throw new Error("Project not found");
    }

    await ctx.db.patch(args.projectId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DELETE PROJECT
 * Permanently delete a project (hard delete)
 * Only allowed for draft projects
 */
export const deleteProject = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const project = await ctx.db.get(args.projectId);

    if (!project || !("type" in project) || project.type !== "project") {
      throw new Error("Project not found");
    }

    // Only allow deleting draft projects
    if (project.status !== "draft") {
      throw new Error("Only draft projects can be permanently deleted. Use archiveProject for other statuses.");
    }

    // Delete the project permanently
    await ctx.db.delete(args.projectId);

    return { success: true };
  },
});

/**
 * UPDATE PROJECT DETAILED DESCRIPTION
 * Update the project's rich HTML description
 */
export const updateProjectDetailedDescription = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    detailedDescription: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const project = await ctx.db.get(args.projectId);

    if (!project || !("type" in project) || project.type !== "project") {
      throw new Error("Project not found");
    }

    const currentProps = project.customProperties || {};

    await ctx.db.patch(args.projectId, {
      customProperties: {
        ...currentProps,
        detailedDescription: args.detailedDescription,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * ========================================
 * PHASE 3: MILESTONES
 * ========================================
 */

/**
 * CREATE MILESTONE
 * Create a milestone for a project
 */
export const createMilestone = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    name: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    status: v.optional(v.string()), // "pending" | "in_progress" | "completed" | "cancelled"
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Verify project exists
    const project = await ctx.db.get(args.projectId);
    if (!project || !("type" in project) || project.type !== "project") {
      throw new Error("Project not found");
    }

    // Create milestone
    const milestoneId = await ctx.db.insert("objects", {
      organizationId: project.organizationId,
      type: "milestone",
      subtype: "project_milestone",
      name: args.name,
      description: args.description,
      status: args.status || "pending",
      customProperties: {
        dueDate: args.dueDate,
        projectId: args.projectId,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link milestone to project
    await ctx.db.insert("objectLinks", {
      organizationId: project.organizationId,
      fromObjectId: args.projectId,
      toObjectId: milestoneId,
      linkType: "has_milestone",
      createdBy: userId,
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("objectActions", {
      organizationId: project.organizationId,
      objectId: args.projectId,
      actionType: "milestone_created",
      actionData: { milestoneId, milestoneName: args.name },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return milestoneId;
  },
});

/**
 * GET MILESTONES
 * Get all milestones for a project
 */
export const getMilestones = query({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all milestone links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId).eq("linkType", "has_milestone")
      )
      .collect();

    // Get milestone objects
    const milestones = await Promise.all(
      links.map(async (link) => {
        const milestone = await ctx.db.get(link.toObjectId);
        return milestone;
      })
    );

    return milestones.filter((m) => m !== null);
  },
});

/**
 * UPDATE MILESTONE
 * Update milestone details
 */
export const updateMilestone = mutation({
  args: {
    sessionId: v.string(),
    milestoneId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone || !("type" in milestone) || milestone.type !== "milestone") {
      throw new Error("Milestone not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    if (args.dueDate !== undefined) {
      const currentProps = milestone.customProperties || {};
      updates.customProperties = { ...currentProps, dueDate: args.dueDate };
    }

    await ctx.db.patch(args.milestoneId, updates);

    // Log activity
    const customProps = milestone.customProperties as { projectId?: unknown } | undefined;
    const projectId = customProps?.projectId;
    if (projectId && typeof projectId === "string") {
      await ctx.db.insert("objectActions", {
        organizationId: milestone.organizationId,
        objectId: projectId as Id<"objects">,
        actionType: "milestone_updated",
        actionData: { milestoneId: args.milestoneId, milestoneName: milestone.name },
        performedBy: userId,
        performedAt: Date.now(),
      });
    }

    return args.milestoneId;
  },
});

/**
 * DELETE MILESTONE
 * Delete a milestone
 */
export const deleteMilestone = mutation({
  args: {
    sessionId: v.string(),
    milestoneId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone || !("type" in milestone) || milestone.type !== "milestone") {
      throw new Error("Milestone not found");
    }

    const customProps = milestone.customProperties as { projectId?: unknown } | undefined;
    const projectId = customProps?.projectId;

    // Delete all links to this milestone
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.milestoneId))
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    // Delete milestone
    await ctx.db.delete(args.milestoneId);

    // Log activity
    if (projectId && typeof projectId === "string") {
      await ctx.db.insert("objectActions", {
        organizationId: milestone.organizationId,
        objectId: projectId as Id<"objects">,
        actionType: "milestone_deleted",
        actionData: { milestoneName: milestone.name },
        performedBy: userId,
        performedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * ========================================
 * PHASE 3: TASKS
 * ========================================
 */

/**
 * CREATE TASK
 * Create a task for a project or milestone
 */
export const createTask = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    milestoneId: v.optional(v.id("objects")),
    name: v.string(),
    description: v.optional(v.string()),
    assigneeId: v.optional(v.id("users")),
    dueDate: v.optional(v.number()),
    priority: v.optional(v.string()), // "low" | "medium" | "high" | "critical"
    status: v.optional(v.string()), // "todo" | "in_progress" | "completed" | "cancelled"
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Verify project exists
    const project = await ctx.db.get(args.projectId);
    if (!project || !("type" in project) || project.type !== "project") {
      throw new Error("Project not found");
    }

    // Create task
    const taskId = await ctx.db.insert("objects", {
      organizationId: project.organizationId,
      type: "task",
      subtype: "project_task",
      name: args.name,
      description: args.description,
      status: args.status || "todo",
      customProperties: {
        projectId: args.projectId,
        milestoneId: args.milestoneId,
        assigneeId: args.assigneeId,
        dueDate: args.dueDate,
        priority: args.priority || "medium",
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link task to project
    await ctx.db.insert("objectLinks", {
      organizationId: project.organizationId,
      fromObjectId: args.projectId,
      toObjectId: taskId,
      linkType: "has_task",
      createdBy: userId,
      createdAt: Date.now(),
    });

    // Link task to milestone if provided
    if (args.milestoneId) {
      await ctx.db.insert("objectLinks", {
        organizationId: project.organizationId,
        fromObjectId: args.milestoneId,
        toObjectId: taskId,
        linkType: "has_task",
        createdBy: userId,
        createdAt: Date.now(),
      });
    }

    // Log activity
    await ctx.db.insert("objectActions", {
      organizationId: project.organizationId,
      objectId: args.projectId,
      actionType: "task_created",
      actionData: { taskId, taskName: args.name },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return taskId;
  },
});

/**
 * GET TASKS
 * Get all tasks for a project or milestone
 */
export const getTasks = query({
  args: {
    sessionId: v.string(),
    projectId: v.optional(v.id("objects")),
    milestoneId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    if (!args.projectId && !args.milestoneId) {
      throw new Error("Either projectId or milestoneId must be provided");
    }

    const parentId = args.milestoneId || args.projectId!;

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
        return task;
      })
    );

    return tasks.filter((t) => t !== null);
  },
});

/**
 * UPDATE TASK
 * Update task details
 */
export const updateTask = mutation({
  args: {
    sessionId: v.string(),
    taskId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    assigneeId: v.optional(v.id("users")),
    dueDate: v.optional(v.number()),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const task = await ctx.db.get(args.taskId);
    if (!task || !("type" in task) || task.type !== "task") {
      throw new Error("Task not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    const currentProps = task.customProperties || {};
    const newProps = { ...currentProps };

    if (args.assigneeId !== undefined) newProps.assigneeId = args.assigneeId;
    if (args.dueDate !== undefined) newProps.dueDate = args.dueDate;
    if (args.priority !== undefined) newProps.priority = args.priority;

    updates.customProperties = newProps;

    await ctx.db.patch(args.taskId, updates);

    // Log activity
    const customProps = task.customProperties as { projectId?: unknown } | undefined;
    const projectId = customProps?.projectId;
    if (projectId && typeof projectId === "string") {
      await ctx.db.insert("objectActions", {
        organizationId: task.organizationId,
        objectId: projectId as Id<"objects">,
        actionType: "task_updated",
        actionData: { taskId: args.taskId, taskName: task.name },
        performedBy: userId,
        performedAt: Date.now(),
      });
    }

    return args.taskId;
  },
});

/**
 * DELETE TASK
 * Delete a task
 */
export const deleteTask = mutation({
  args: {
    sessionId: v.string(),
    taskId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const task = await ctx.db.get(args.taskId);
    if (!task || !("type" in task) || task.type !== "task") {
      throw new Error("Task not found");
    }

    const customProps = task.customProperties as { projectId?: unknown } | undefined;
    const projectId = customProps?.projectId;

    // Delete all links to this task
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.taskId))
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    // Delete task
    await ctx.db.delete(args.taskId);

    // Log activity
    if (projectId && typeof projectId === "string") {
      await ctx.db.insert("objectActions", {
        organizationId: task.organizationId,
        objectId: projectId as Id<"objects">,
        actionType: "task_deleted",
        actionData: { taskName: task.name },
        performedBy: userId,
        performedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * ========================================
 * PHASE 3: TEAM MEMBERS
 * ========================================
 */

/**
 * ADD INTERNAL TEAM MEMBER
 * Assign a platform organization user to the project (freelancer's team)
 */
export const addInternalTeamMember = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    userId: v.id("users"),
    role: v.optional(v.string()), // "lead" | "member" | "contributor"
  },
  handler: async (ctx, args) => {
    const { userId: currentUserId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Verify project exists
    const project = await ctx.db.get(args.projectId);
    if (!project || !("type" in project) || project.type !== "project") {
      throw new Error("Project not found");
    }

    // Verify user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if already a team member
    const existingLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId).eq("linkType", "internal_team_member")
      )
      .filter((q) => q.eq(q.field("properties.userId"), args.userId))
      .first();

    if (existingLink) {
      throw new Error("User is already an internal team member");
    }

    // Create internal team member link
    await ctx.db.insert("objectLinks", {
      organizationId: project.organizationId,
      fromObjectId: args.projectId,
      toObjectId: args.projectId, // Self-link, user ID in properties
      linkType: "internal_team_member",
      properties: {
        userId: args.userId,
        role: args.role || "member",
      },
      createdBy: currentUserId,
      createdAt: Date.now(),
    });

    // Log activity
    const userName = ((user.firstName || "") + " " + (user.lastName || "")).trim() || user.email;
    await ctx.db.insert("objectActions", {
      organizationId: project.organizationId,
      objectId: args.projectId,
      actionType: "internal_team_member_added",
      actionData: { userId: args.userId, userName, role: args.role },
      performedBy: currentUserId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * ADD CLIENT TEAM MEMBER
 * Assign a CRM contact (customer) to the project (client's team)
 */
export const addClientTeamMember = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    contactId: v.id("objects"), // CRM contact ID
    role: v.optional(v.string()), // "lead" | "member" | "stakeholder"
  },
  handler: async (ctx, args) => {
    const { userId: currentUserId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Verify project exists
    const project = await ctx.db.get(args.projectId);
    if (!project || !("type" in project) || project.type !== "project") {
      throw new Error("Project not found");
    }

    // Verify contact exists
    const contact = await ctx.db.get(args.contactId);
    if (!contact || !("type" in contact) || contact.type !== "crm_contact") {
      throw new Error("CRM contact not found");
    }

    // Check if already a team member
    const existingLink = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId).eq("linkType", "client_team_member")
      )
      .filter((q) => q.eq(q.field("toObjectId"), args.contactId))
      .first();

    if (existingLink) {
      throw new Error("Contact is already a client team member");
    }

    // Create client team member link (project -> contact)
    await ctx.db.insert("objectLinks", {
      organizationId: project.organizationId,
      fromObjectId: args.projectId,
      toObjectId: args.contactId, // Link to CRM contact
      linkType: "client_team_member",
      properties: {
        role: args.role || "member",
      },
      createdBy: currentUserId,
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("objectActions", {
      organizationId: project.organizationId,
      objectId: args.projectId,
      actionType: "client_team_member_added",
      actionData: { contactId: args.contactId, contactName: contact.name, role: args.role },
      performedBy: currentUserId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * GET TEAM MEMBERS
 * Get all team members for a project (both internal and client)
 */
export const getTeamMembers = query({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get internal team member links
    const internalLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId).eq("linkType", "internal_team_member")
      )
      .collect();

    // Get client team member links
    const clientLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId).eq("linkType", "client_team_member")
      )
      .collect();

    // Process internal team members
    const internalMembers = await Promise.all(
      internalLinks.map(async (link) => {
        const props = link.properties as { userId?: unknown; role?: string } | undefined;
        const userId = props?.userId;
        if (!userId || typeof userId !== "string") return null;

        const user = await ctx.db.get(userId as Id<"users">);
        if (!user) return null;

        return {
          id: user._id,
          type: "internal" as const,
          name: ((user.firstName || "") + " " + (user.lastName || "")).trim() || user.email,
          email: user.email,
          role: props?.role || "member",
          addedAt: link.createdAt,
        };
      })
    );

    // Process client team members
    const clientMembers = await Promise.all(
      clientLinks.map(async (link) => {
        const contact = await ctx.db.get(link.toObjectId);
        if (!contact || !("type" in contact) || contact.type !== "crm_contact") return null;

        const props = link.properties as { role?: string } | undefined;
        const contactProps = contact.customProperties as {
          email?: string;
        } | undefined;

        return {
          id: contact._id,
          type: "client" as const,
          name: contact.name,
          email: contactProps?.email || "",
          role: props?.role || "member",
          addedAt: link.createdAt,
        };
      })
    );

    const allMembers = [
      ...internalMembers.filter((m) => m !== null),
      ...clientMembers.filter((m) => m !== null),
    ];

    return allMembers;
  },
});

/**
 * REMOVE INTERNAL TEAM MEMBER
 * Remove a platform user from project team
 */
export const removeInternalTeamMember = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId: currentUserId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Verify project exists
    const project = await ctx.db.get(args.projectId);
    if (!project || !("type" in project) || project.type !== "project") {
      throw new Error("Project not found");
    }

    // Find team member link
    const link = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId).eq("linkType", "internal_team_member")
      )
      .filter((q) => q.eq(q.field("properties.userId"), args.userId))
      .first();

    if (!link) {
      throw new Error("Internal team member not found");
    }

    // Get user name for logging
    const user = await ctx.db.get(args.userId);
    const userName = user ? (((user.firstName || "") + " " + (user.lastName || "")).trim() || user.email) : "Unknown";

    // Delete link
    await ctx.db.delete(link._id);

    // Log activity
    await ctx.db.insert("objectActions", {
      organizationId: project.organizationId,
      objectId: args.projectId,
      actionType: "internal_team_member_removed",
      actionData: { userId: args.userId, userName },
      performedBy: currentUserId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * REMOVE CLIENT TEAM MEMBER
 * Remove a CRM contact from project team
 */
export const removeClientTeamMember = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    contactId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId: currentUserId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Verify project exists
    const project = await ctx.db.get(args.projectId);
    if (!project || !("type" in project) || project.type !== "project") {
      throw new Error("Project not found");
    }

    // Find team member link
    const link = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId).eq("linkType", "client_team_member")
      )
      .filter((q) => q.eq(q.field("toObjectId"), args.contactId))
      .first();

    if (!link) {
      throw new Error("Client team member not found");
    }

    // Get contact name for logging
    const contact = await ctx.db.get(args.contactId);
    const contactName = contact?.name || "Unknown";

    // Delete link
    await ctx.db.delete(link._id);

    // Log activity
    await ctx.db.insert("objectActions", {
      organizationId: project.organizationId,
      objectId: args.projectId,
      actionType: "client_team_member_removed",
      actionData: { contactId: args.contactId, contactName },
      performedBy: currentUserId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * GET ORGANIZATION USERS
 * Get all platform users in an organization for internal team member assignment
 */
export const getOrganizationUsers = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all organization members
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Get user details
    const users = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        if (!user) return null;

        return {
          _id: user._id,
          email: user.email,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
        };
      })
    );

    return users.filter((u) => u !== null);
  },
});

/**
 * GET ORGANIZATION CONTACTS
 * Get all CRM contacts in an organization for client team member assignment
 */
export const getOrganizationContacts = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all CRM contacts
    const contacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    return contacts.map((contact) => {
      const props = contact.customProperties as {
        email?: string;
        firstName?: string;
        lastName?: string;
      } | undefined;

      return {
        _id: contact._id,
        name: contact.name,
        email: props?.email || "",
        firstName: props?.firstName || "",
        lastName: props?.lastName || "",
      };
    });
  },
});

/**
 * ========================================
 * PHASE 3: COMMENTS
 * ========================================
 */

/**
 * CREATE COMMENT
 * Add a comment to a project (supports threading)
 */
export const createComment = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    content: v.string(),
    parentCommentId: v.optional(v.id("objects")), // For threaded replies
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Verify project exists
    const project = await ctx.db.get(args.projectId);
    if (!project || !("type" in project) || project.type !== "project") {
      throw new Error("Project not found");
    }

    // Create comment
    const commentId = await ctx.db.insert("objects", {
      organizationId: project.organizationId,
      type: "comment",
      subtype: "project_comment",
      name: `Comment by ${userId}`,
      description: args.content,
      status: "active",
      customProperties: {
        projectId: args.projectId,
        parentCommentId: args.parentCommentId,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link comment to project
    await ctx.db.insert("objectLinks", {
      organizationId: project.organizationId,
      fromObjectId: args.projectId,
      toObjectId: commentId,
      linkType: "has_comment",
      createdBy: userId,
      createdAt: Date.now(),
    });

    // Link to parent comment if it's a reply
    if (args.parentCommentId) {
      await ctx.db.insert("objectLinks", {
        organizationId: project.organizationId,
        fromObjectId: args.parentCommentId,
        toObjectId: commentId,
        linkType: "has_reply",
        createdBy: userId,
        createdAt: Date.now(),
      });
    }

    // Log activity
    await ctx.db.insert("objectActions", {
      organizationId: project.organizationId,
      objectId: args.projectId,
      actionType: "comment_created",
      actionData: { commentId },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return commentId;
  },
});

/**
 * GET COMMENTS
 * Get all comments for a project (with replies)
 */
export const getComments = query({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all comment links
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId).eq("linkType", "has_comment")
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
            // Author not found or wrong table, keep as Unknown
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
                // Author not found or wrong table, keep as Unknown
              }
            }

            return {
              ...reply,
              authorName: replyAuthorName,
            };
          })
        );

        return {
          ...comment,
          authorName,
          replies: replies.filter((r) => r !== null),
        };
      })
    );

    return comments.filter((c) => c !== null);
  },
});

/**
 * UPDATE COMMENT
 * Edit a comment
 */
export const updateComment = mutation({
  args: {
    sessionId: v.string(),
    commentId: v.id("objects"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const comment = await ctx.db.get(args.commentId);
    if (!comment || !("type" in comment) || comment.type !== "comment") {
      throw new Error("Comment not found");
    }

    // Only author can edit
    if (comment.createdBy !== userId) {
      throw new Error("Only the comment author can edit it");
    }

    await ctx.db.patch(args.commentId, {
      description: args.content,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DELETE COMMENT
 * Delete a comment
 */
export const deleteComment = mutation({
  args: {
    sessionId: v.string(),
    commentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const comment = await ctx.db.get(args.commentId);
    if (!comment || !("type" in comment) || comment.type !== "comment") {
      throw new Error("Comment not found");
    }

    // Only author can delete
    if (comment.createdBy !== userId) {
      throw new Error("Only the comment author can delete it");
    }

    const customProps = comment.customProperties as { projectId?: unknown } | undefined;
    const projectId = customProps?.projectId;

    // Delete all links to this comment
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.commentId))
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    // Delete all replies
    const replyLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.commentId).eq("linkType", "has_reply")
      )
      .collect();

    for (const replyLink of replyLinks) {
      await ctx.db.delete(replyLink.toObjectId);
      await ctx.db.delete(replyLink._id);
    }

    // Delete comment
    await ctx.db.delete(args.commentId);

    // Log activity
    if (projectId && typeof projectId === "string") {
      await ctx.db.insert("objectActions", {
        organizationId: comment.organizationId,
        objectId: projectId as Id<"objects">,
        actionType: "comment_deleted",
        actionData: {},
        performedBy: userId,
        performedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * ========================================
 * PHASE 3: ACTIVITY LOG
 * ========================================
 */

/**
 * GET ACTIVITY LOG
 * Get all activity for a project
 */
export const getActivityLog = query({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const actions = await ctx.db
      .query("objectActions")
      .withIndex("by_object", (q) => q.eq("objectId", args.projectId))
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
            // Performer not found or wrong table, keep as System
          }
        }

        return {
          ...action,
          performerName,
        };
      })
    );

    return enrichedActions;
  },
});

/**
 * ========================================
 * PHASE 3: SEARCH
 * ========================================
 */

/**
 * SEARCH PROJECTS
 * Full-text search across project names and descriptions
 */
export const searchProjects = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    searchQuery: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    if (!args.searchQuery || args.searchQuery.trim().length === 0) {
      return [];
    }

    // Search by name
    const results = await ctx.db
      .query("objects")
      .withSearchIndex("search_by_name", (q) => q.search("name", args.searchQuery))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("type"), "project")
        )
      )
      .take(50);

    return results;
  },
});
