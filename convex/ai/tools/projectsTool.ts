/**
 * AI Projects Management Tool
 *
 * Comprehensive tool for managing projects, milestones, and tasks through natural language
 */

import { action } from "../../_generated/server";
import type { ActionCtx } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

// ============================================================================
// TOOL DEFINITION
// ============================================================================

export const projectsToolDefinition = {
  type: "function" as const,
  function: {
    name: "manage_projects",
    description: `Comprehensive project management: create projects, add milestones, create/assign tasks, update status, list projects/tasks.

IMPORTANT WORKFLOW FOR CREATING CLIENT PROJECTS:
1. BEFORE creating a client project, ALWAYS use manage_crm to search for the company first
2. If company doesn't exist, ask user if they want to create it in CRM
3. If user confirms, use manage_crm to create the organization, then get its ID
4. Use the CRM organization ID as clientOrgId when creating the project
5. This ensures proper linking between projects and client companies

REQUIRED INFORMATION FOR NEW PROJECTS:
- Project name (be specific, e.g., "Website Redesign 2025" not just "Website")
- Project type (client_project, internal, campaign, product_development, other)
- For client projects: Which company/client? (search CRM first!)
- Optional but recommended: budget, priority, start/end dates

If user request is vague, ask clarifying questions to gather this information.`,
    parameters: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: [
            "create_project",
            "list_projects",
            "update_project",
            "create_milestone",
            "create_task",
            "list_tasks",
            "update_task",
            "assign_task"
          ],
          description: "Action to perform: create_project=new project, list_projects=show all projects, update_project=modify project, create_milestone=add milestone to project, create_task=add task to project/milestone, list_tasks=view tasks, update_task=change task status/details, assign_task=assign task to team member"
        },
        mode: {
          type: "string",
          enum: ["preview", "execute"],
          description: "preview = show what will be created/updated (default), execute = actually perform the operation. ALWAYS use preview first to show user what will happen!"
        },
        workItemId: {
          type: "string",
          description: "Work item ID (for execute mode - returned from preview)"
        },
        // Project fields
        projectId: {
          type: "string",
          description: "Project ID - MUST be the exact 'id' value from list_projects (e.g. 'k1234567890abcdef'). Required for update_project, create_milestone, create_task"
        },
        projectName: {
          type: "string",
          description: "Project name (for create_project, update_project)"
        },
        projectDescription: {
          type: "string",
          description: "Project description (for create_project, update_project)"
        },
        projectType: {
          type: "string",
          enum: ["client_project", "internal", "campaign", "product_development", "other"],
          description: "Type of project (for create_project)"
        },
        startDate: {
          type: "string",
          description: "Project start date in ISO 8601 format (e.g., '2024-01-15T09:00:00Z'). For create_project or update_project."
        },
        targetEndDate: {
          type: "string",
          description: "Project target end date in ISO 8601 format. For create_project or update_project."
        },
        budget: {
          type: "object",
          properties: {
            amount: { type: "number", description: "Budget amount in dollars" },
            currency: { type: "string", description: "Currency code (USD, EUR, etc.)" }
          },
          description: "Project budget (for create_project, update_project)"
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "Project priority (for create_project, update_project)"
        },
        status: {
          type: "string",
          enum: ["draft", "planning", "active", "on_hold", "completed", "cancelled"],
          description: "Project or task status (for update_project, update_task)"
        },
        clientOrgId: {
          type: "string",
          description: "CRM organization ID of client (for client projects)"
        },
        // Milestone fields
        milestoneId: {
          type: "string",
          description: "Milestone ID (for create_task, list_tasks)"
        },
        milestoneName: {
          type: "string",
          description: "Milestone name (for create_milestone)"
        },
        milestoneDescription: {
          type: "string",
          description: "Milestone description (for create_milestone)"
        },
        milestoneDueDate: {
          type: "string",
          description: "Milestone due date in ISO 8601 format (for create_milestone)"
        },
        // Task fields
        taskId: {
          type: "string",
          description: "Task ID - exact 'id' value from list_tasks (for update_task, assign_task)"
        },
        taskName: {
          type: "string",
          description: "Task name (for create_task, update_task)"
        },
        taskDescription: {
          type: "string",
          description: "Task description (for create_task, update_task)"
        },
        taskDueDate: {
          type: "string",
          description: "Task due date in ISO 8601 format (for create_task, update_task)"
        },
        taskPriority: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "Task priority (for create_task, update_task)"
        },
        assigneeId: {
          type: "string",
          description: "User ID to assign task to (for create_task, assign_task, update_task)"
        },
        assigneeEmail: {
          type: "string",
          description: "Email of user to assign task to (alternative to assigneeId)"
        },
        // Filters for list actions
        filterStatus: {
          type: "string",
          description: "Filter by status (for list_projects, list_tasks)"
        },
        filterPriority: {
          type: "string",
          description: "Filter by priority (for list_projects, list_tasks)"
        },
        limit: {
          type: "number",
          description: "Maximum number of results (for list actions, default: 20)"
        }
      },
      required: ["action"]
    }
  }
};

// ============================================================================
// MAIN TOOL HANDLER
// ============================================================================

export const executeManageProjects = action({
  args: {
    sessionId: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    conversationId: v.optional(v.id("aiConversations")), // For work item tracking
    action: v.string(),
    mode: v.optional(v.string()),
    workItemId: v.optional(v.string()),
    // Project fields
    projectId: v.optional(v.string()),
    projectName: v.optional(v.string()),
    projectDescription: v.optional(v.string()),
    projectType: v.optional(v.string()),
    startDate: v.optional(v.string()),
    targetEndDate: v.optional(v.string()),
    budget: v.optional(v.object({
      amount: v.number(),
      currency: v.string(),
    })),
    priority: v.optional(v.string()),
    status: v.optional(v.string()),
    clientOrgId: v.optional(v.string()),
    // Milestone fields
    milestoneId: v.optional(v.string()),
    milestoneName: v.optional(v.string()),
    milestoneDescription: v.optional(v.string()),
    milestoneDueDate: v.optional(v.string()),
    // Task fields
    taskId: v.optional(v.string()),
    taskName: v.optional(v.string()),
    taskDescription: v.optional(v.string()),
    taskDueDate: v.optional(v.string()),
    taskPriority: v.optional(v.string()),
    assigneeId: v.optional(v.string()),
    assigneeEmail: v.optional(v.string()),
    // Filters
    filterStatus: v.optional(v.string()),
    filterPriority: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    action: string;
    mode?: string;
    workItemId?: string;
    workItemType?: string;
    data?: unknown;
    message?: string;
    error?: string;
  }> => {
    // Get organization ID and userId
    let organizationId: Id<"organizations">;
    let userId: Id<"users"> | undefined = args.userId;
    let sessionId: string | undefined = args.sessionId;

    if (args.organizationId && args.userId) {
      organizationId = args.organizationId;
      userId = args.userId;
    } else if (args.sessionId) {
      const session = await ctx.runQuery(internal.stripeConnect.validateSession, {
        sessionId: args.sessionId
      });

      if (!session || !session.organizationId || !session.userId) {
        throw new Error("Invalid session or user must belong to an organization");
      }

      organizationId = session.organizationId;
      userId = session.userId;
    } else {
      throw new Error("Either sessionId or (organizationId and userId) must be provided");
    }

    if (!sessionId) {
      sessionId = "ai-internal-session";
    }

    try {
      switch (args.action) {
        case "create_project":
          if (!args.projectName || !args.projectType) {
            throw new Error("projectName and projectType are required for create_project");
          }
          if (!userId) {
            throw new Error("userId is required for create_project");
          }
          return await createProject(ctx, organizationId, userId, args);

        case "list_projects":
          return await listProjects(ctx, organizationId, args);

        case "update_project":
          if (!args.projectId) {
            throw new Error("projectId is required for update_project");
          }
          if (!userId) {
            throw new Error("userId is required for update_project");
          }
          return await updateProject(ctx, organizationId, userId, args);

        case "create_milestone":
          if (!args.projectId || !args.milestoneName) {
            throw new Error("projectId and milestoneName are required for create_milestone");
          }
          if (!userId) {
            throw new Error("userId is required for create_milestone");
          }
          return await createMilestone(ctx, organizationId, userId, args);

        case "create_task":
          if (!args.taskName) {
            throw new Error("taskName is required for create_task");
          }
          if (!args.projectId && !args.milestoneId) {
            throw new Error("Either projectId or milestoneId is required for create_task");
          }
          if (!userId) {
            throw new Error("userId is required for create_task");
          }
          return await createTask(ctx, organizationId, userId, args);

        case "list_tasks":
          if (!args.projectId && !args.milestoneId) {
            throw new Error("Either projectId or milestoneId is required for list_tasks");
          }
          return await listTasks(ctx, organizationId, args);

        case "update_task":
          if (!args.taskId) {
            throw new Error("taskId is required for update_task");
          }
          if (!userId) {
            throw new Error("userId is required for update_task");
          }
          return await updateTask(ctx, organizationId, userId, args);

        case "assign_task":
          if (!args.taskId) {
            throw new Error("taskId is required for assign_task");
          }
          if (!args.assigneeId && !args.assigneeEmail) {
            throw new Error("Either assigneeId or assigneeEmail is required for assign_task");
          }
          if (!userId) {
            throw new Error("userId is required for assign_task");
          }
          return await assignTask(ctx, organizationId, userId, args);

        default:
          return {
            success: false,
            action: args.action,
            error: "Invalid action",
            message: "Action must be one of: create_project, list_projects, update_project, create_milestone, create_task, list_tasks, update_task, assign_task"
          };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        action: args.action,
        error: errorMessage,
        message: `Failed to ${args.action}: ${errorMessage}`
      };
    }
  }
});

// ============================================================================
// ACTION IMPLEMENTATIONS
// ============================================================================

/**
 * Create a new project
 */
async function createProject(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
) {
  const mode = args.mode || "preview";

  // EXECUTE MODE with workItemId: Retrieve original parameters from workItem
  if (mode === "execute" && args.workItemId) {
    const workItem = await ctx.db.get(args.workItemId as Id<"aiWorkItems">);

    if (!workItem || !workItem.previewData || workItem.previewData.length === 0) {
      return {
        success: false,
        action: args.action || "unknown",
        error: "Work item not found or has no preview data",
        message: "Cannot execute: work item preview data is missing"
      };
    }

    // Extract parameters from the preview data
    const preview = workItem.previewData[0];
    args.projectName = preview.name;
    args.projectType = preview.details?.type;
    args.projectDescription = preview.details?.description;
    args.startDate = preview.details?.startDate;
    args.targetEndDate = preview.details?.targetEndDate;
    args.budget = preview.details?.budget;
    args.priority = preview.details?.priority;
    args.clientOrgId = preview.details?.clientOrgId;
  }

  // Convert ISO dates to timestamps
  const startTimestamp = args.startDate ? new Date(args.startDate).getTime() : Date.now();
  const endTimestamp = args.targetEndDate ? new Date(args.targetEndDate).getTime() : undefined;

  // PREVIEW MODE: Show what will be created
  if (mode === "preview") {
    const previewData = {
      id: "temp-" + Date.now(),
      type: "project",
      name: args.projectName,
      status: "preview",
      details: {
        type: args.projectType,
        description: args.projectDescription,
        startDate: args.startDate || new Date().toISOString(),
        targetEndDate: args.targetEndDate,
        budget: args.budget,
        priority: args.priority || "medium",
        clientOrgId: args.clientOrgId,
      },
      preview: {
        action: "create" as const,
        confidence: "high" as const,
        reason: "New project will be created",
        changes: {
          name: { old: null, new: args.projectName },
          type: { old: null, new: args.projectType },
          priority: { old: null, new: args.priority || "medium" },
          status: { old: null, new: "draft" },
          budget: { old: null, new: args.budget ? `${args.budget.amount} ${args.budget.currency}` : "Not specified" },
          startDate: { old: null, new: args.startDate || "Today" },
          targetEndDate: { old: null, new: args.targetEndDate || "Not set" },
        }
      }
    };

    // Create work item for tracking
    const workItemId = await ctx.runMutation(
      internal.ai.tools.internalToolMutations.internalCreateWorkItem,
      {
        organizationId,
        userId,
        conversationId: args.conversationId!, // Should always be provided from chat context
        type: "project_create",
        name: `Create Project - ${args.projectName}`,
        status: "preview",
        previewData: [previewData],
      }
    );

    return {
      success: true,
      action: "create_project",
      mode: "preview",
      workItemId,
      workItemType: "project_create",
      data: {
        items: [previewData],
        summary: { total: 1, toCreate: 1, toUpdate: 0, toSkip: 0 }
      },
      message: `📋 Ready to create project "${args.projectName}". Review the details and approve to proceed.`
    };
  }

  // EXECUTE MODE: Actually create the project
  const projectId = await ctx.runMutation(
    internal.ai.tools.internalToolMutations.internalCreateProject,
    {
      organizationId,
      userId,
      subtype: args.projectType,
      name: args.projectName,
      description: args.projectDescription,
      startDate: startTimestamp,
      targetEndDate: endTimestamp,
      budget: args.budget,
      priority: args.priority || "medium",
      clientOrgId: args.clientOrgId,
    }
  );

  // Update work item to completed
  if (args.workItemId) {
    await ctx.runMutation(
      internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
      {
        workItemId: args.workItemId as Id<"aiWorkItems">,
        status: "completed",
        results: { projectId },
      }
    );
  }

  return {
    success: true,
    action: "create_project",
    mode: "execute",
    workItemId: args.workItemId,
    data: {
      items: [{
        id: projectId,
        type: "project",
        name: args.projectName,
        status: "completed",
        details: {
          type: args.projectType,
          priority: args.priority || "medium",
        }
      }],
      summary: { total: 1, created: 1 }
    },
    message: `✅ Created project: ${args.projectName}`
  };
}

/**
 * List all projects
 */
async function listProjects(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: Id<"organizations">,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
) {
  const result = await ctx.runQuery(
    internal.api.v1.projectsInternal.listProjectsInternal,
    {
      organizationId,
      subtype: args.projectType,
      status: args.filterStatus,
      priority: args.filterPriority,
      limit: args.limit || 20,
      offset: 0,
    }
  );

  const summary = result.projects.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(project: any) => ({
    id: project.id,
    name: project.name,
    type: project.subtype,
    status: project.status,
    priority: project.priority || "medium",
    progress: project.progress || 0,
    startDate: project.startDate ? new Date(project.startDate).toLocaleDateString() : "Not set",
    targetEndDate: project.targetEndDate ? new Date(project.targetEndDate).toLocaleDateString() : "Not set",
    budget: project.budget ? `${project.budget.amount} ${project.budget.currency}` : "Not set",
  }));

  return {
    success: true,
    action: "list_projects",
    data: {
      projects: summary,
      total: result.total,
    },
    message: `Found ${result.total} projects. IMPORTANT: Each project has an 'id' field - use this exact 'id' value when performing actions on a specific project.`
  };
}

/**
 * Update an existing project
 */
async function updateProject(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const updates: any = {
    organizationId,
    projectId: args.projectId,
    performedBy: userId,
  };

  if (args.projectName) updates.name = args.projectName;
  if (args.projectDescription) updates.description = args.projectDescription;
  if (args.projectType) updates.subtype = args.projectType;
  if (args.status) updates.status = args.status;
  if (args.priority) updates.priority = args.priority;
  if (args.budget) updates.budget = args.budget;
  if (args.clientOrgId) updates.clientOrgId = args.clientOrgId;

  if (args.startDate) {
    updates.startDate = new Date(args.startDate).getTime();
  }
  if (args.targetEndDate) {
    updates.targetEndDate = new Date(args.targetEndDate).getTime();
  }

  await ctx.runMutation(
    internal.api.v1.projectsInternal.updateProjectInternal,
    updates
  );

  const updatedFields = [];
  if (args.projectName) updatedFields.push("name");
  if (args.status) updatedFields.push("status");
  if (args.priority) updatedFields.push("priority");

  return {
    success: true,
    action: "update_project",
    data: { projectId: args.projectId, updatedFields },
    message: `✅ Updated project: ${updatedFields.join(", ")}`
  };
}

/**
 * Create a milestone for a project
 */
async function createMilestone(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
) {
  const mode = args.mode || "preview";

  // EXECUTE MODE with workItemId: Retrieve original parameters from workItem
  if (mode === "execute" && args.workItemId) {
    const workItem = await ctx.db.get(args.workItemId as Id<"aiWorkItems">);

    if (!workItem || !workItem.previewData || workItem.previewData.length === 0) {
      return {
        success: false,
        action: args.action || "unknown",
        error: "Work item not found or has no preview data",
        message: "Cannot execute: work item preview data is missing"
      };
    }

    // Extract parameters from the preview data
    const preview = workItem.previewData[0];
    args.projectId = preview.details?.projectId;
    args.milestoneName = preview.name;
    args.milestoneDescription = preview.details?.description;
    args.milestoneDueDate = preview.details?.dueDate;
  }

  const dueTimestamp = args.milestoneDueDate ? new Date(args.milestoneDueDate).getTime() : undefined;

  // PREVIEW MODE: Show what will be created
  if (mode === "preview") {
    const previewData = {
      id: "temp-" + Date.now(),
      type: "milestone",
      name: args.milestoneName,
      status: "preview",
      details: {
        projectId: args.projectId,
        description: args.milestoneDescription,
        dueDate: args.milestoneDueDate,
      },
      preview: {
        action: "create" as const,
        confidence: "high" as const,
        reason: "New milestone will be created",
        changes: {
          name: { old: null, new: args.milestoneName },
          projectId: { old: null, new: args.projectId },
          dueDate: { old: null, new: args.milestoneDueDate || "Not set" },
          status: { old: null, new: "pending" },
        }
      }
    };

    // Create work item for tracking
    const workItemId = await ctx.runMutation(
      internal.ai.tools.internalToolMutations.internalCreateWorkItem,
      {
        organizationId,
        userId,
        conversationId: args.conversationId!, // Should always be provided from chat context
        type: "milestone_create",
        name: `Create Milestone - ${args.milestoneName}`,
        status: "preview",
        previewData: [previewData],
      }
    );

    return {
      success: true,
      action: "create_milestone",
      mode: "preview",
      workItemId,
      workItemType: "milestone_create",
      data: {
        items: [previewData],
        summary: { total: 1, toCreate: 1, toUpdate: 0, toSkip: 0 }
      },
      message: `📋 Ready to create milestone "${args.milestoneName}". Review the details and approve to proceed.`
    };
  }

  // EXECUTE MODE: Actually create the milestone
  const milestoneId = await ctx.runMutation(
    internal.ai.tools.internalToolMutations.internalCreateMilestone,
    {
      organizationId,
      userId,
      projectId: args.projectId as Id<"objects">,
      name: args.milestoneName,
      description: args.milestoneDescription,
      dueDate: dueTimestamp,
    }
  );

  // Update work item to completed
  if (args.workItemId) {
    await ctx.runMutation(
      internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
      {
        workItemId: args.workItemId as Id<"aiWorkItems">,
        status: "completed",
        results: { milestoneId },
      }
    );
  }

  return {
    success: true,
    action: "create_milestone",
    mode: "execute",
    workItemId: args.workItemId,
    data: {
      items: [{
        id: milestoneId,
        type: "milestone",
        name: args.milestoneName,
        status: "completed",
        details: {
          projectId: args.projectId,
        }
      }],
      summary: { total: 1, created: 1 }
    },
    message: `✅ Created milestone: ${args.milestoneName}`
  };
}

/**
 * Create a task
 */
async function createTask(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
) {
  const mode = args.mode || "preview";

  // EXECUTE MODE with workItemId: Retrieve original parameters from workItem
  if (mode === "execute" && args.workItemId) {
    const workItem = await ctx.db.get(args.workItemId as Id<"aiWorkItems">);

    if (!workItem || !workItem.previewData || workItem.previewData.length === 0) {
      return {
        success: false,
        action: args.action || "unknown",
        error: "Work item not found or has no preview data",
        message: "Cannot execute: work item preview data is missing"
      };
    }

    // Extract parameters from the preview data
    const preview = workItem.previewData[0];
    args.projectId = preview.details?.projectId;
    args.milestoneId = preview.details?.milestoneId;
    args.taskName = preview.name;
    args.taskDescription = preview.details?.description;
    args.taskDueDate = preview.details?.dueDate;
    args.taskPriority = preview.details?.priority;
    // Note: assignee is stored as string in preview, would need separate handling
  }

  const dueTimestamp = args.taskDueDate ? new Date(args.taskDueDate).getTime() : undefined;

  // Resolve assignee if email provided
  let assigneeId = args.assigneeId as Id<"users"> | undefined;
  if (!assigneeId && args.assigneeEmail) {
    assigneeId = await resolveUserByEmail(ctx, organizationId, args.assigneeEmail);
  }

  // PREVIEW MODE: Show what will be created
  if (mode === "preview") {
    const previewData = {
      id: "temp-" + Date.now(),
      type: "task",
      name: args.taskName,
      status: "preview",
      details: {
        projectId: args.projectId,
        milestoneId: args.milestoneId,
        description: args.taskDescription,
        dueDate: args.taskDueDate,
        priority: args.taskPriority || "medium",
        assignee: assigneeId ? "Assigned" : "Unassigned",
      },
      preview: {
        action: "create" as const,
        confidence: "high" as const,
        reason: "New task will be created",
        changes: {
          name: { old: null, new: args.taskName },
          projectId: { old: null, new: args.projectId || "N/A" },
          milestoneId: { old: null, new: args.milestoneId || "N/A" },
          priority: { old: null, new: args.taskPriority || "medium" },
          status: { old: null, new: "todo" },
          dueDate: { old: null, new: args.taskDueDate || "Not set" },
          assignee: { old: null, new: assigneeId ? "Assigned" : "Unassigned" },
        }
      }
    };

    // Create work item for tracking
    const workItemId = await ctx.runMutation(
      internal.ai.tools.internalToolMutations.internalCreateWorkItem,
      {
        organizationId,
        userId,
        conversationId: args.conversationId!, // Should always be provided from chat context
        type: "task_create",
        name: `Create Task - ${args.taskName}`,
        status: "preview",
        previewData: [previewData],
      }
    );

    return {
      success: true,
      action: "create_task",
      mode: "preview",
      workItemId,
      workItemType: "task_create",
      data: {
        items: [previewData],
        summary: { total: 1, toCreate: 1, toUpdate: 0, toSkip: 0 }
      },
      message: `📋 Ready to create task "${args.taskName}". Review the details and approve to proceed.`
    };
  }

  // EXECUTE MODE: Actually create the task
  const taskId = await ctx.runMutation(
    internal.ai.tools.internalToolMutations.internalCreateTask,
    {
      organizationId,
      userId,
      projectId: args.projectId ? (args.projectId as Id<"objects">) : undefined,
      milestoneId: args.milestoneId ? (args.milestoneId as Id<"objects">) : undefined,
      name: args.taskName,
      description: args.taskDescription,
      dueDate: dueTimestamp,
      priority: args.taskPriority || "medium",
      assigneeId,
    }
  );

  // Update work item to completed
  if (args.workItemId) {
    await ctx.runMutation(
      internal.ai.tools.internalToolMutations.internalUpdateWorkItem,
      {
        workItemId: args.workItemId as Id<"aiWorkItems">,
        status: "completed",
        results: { taskId },
      }
    );
  }

  return {
    success: true,
    action: "create_task",
    mode: "execute",
    workItemId: args.workItemId,
    data: {
      items: [{
        id: taskId,
        type: "task",
        name: args.taskName,
        status: "completed",
        details: {
          projectId: args.projectId,
          milestoneId: args.milestoneId,
          priority: args.taskPriority || "medium",
          assignee: assigneeId ? "Assigned" : "Unassigned",
        }
      }],
      summary: { total: 1, created: 1 }
    },
    message: `✅ Created task: ${args.taskName}${assigneeId ? " (assigned)" : ""}`
  };
}

/**
 * List tasks
 */
async function listTasks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: Id<"organizations">,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
) {
  const tasks = await ctx.runQuery(
    internal.api.v1.projectsInternal.listTasksInternal,
    {
      organizationId,
      projectId: args.projectId,
      milestoneId: args.milestoneId,
    }
  );

  // Apply filters
  let filteredTasks = tasks;
  if (args.filterStatus) {
    filteredTasks = filteredTasks.filter(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(t: any) => t.status === args.filterStatus);
  }
  if (args.filterPriority) {
    filteredTasks = filteredTasks.filter(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(t: any) => t.priority === args.filterPriority);
  }

  // Limit results
  const limit = args.limit || 20;
  const limitedTasks = filteredTasks.slice(0, limit);

  const summary = limitedTasks.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
(task: any) => ({
    id: task.id,
    name: task.name,
    status: task.status,
    priority: task.priority || "medium",
    assignee: task.assigneeId || "Unassigned",
    dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date",
  }));

  return {
    success: true,
    action: "list_tasks",
    data: {
      tasks: summary,
      total: filteredTasks.length,
    },
    message: `Found ${filteredTasks.length} tasks. Use the exact 'id' value to perform actions on tasks.`
  };
}

/**
 * Update a task
 */
async function updateTask(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const updates: any = {
    organizationId,
    taskId: args.taskId,
    performedBy: userId,
  };

  if (args.taskName) updates.name = args.taskName;
  if (args.taskDescription) updates.description = args.taskDescription;
  if (args.status) updates.status = args.status;
  if (args.taskPriority) updates.priority = args.taskPriority;

  if (args.taskDueDate) {
    updates.dueDate = new Date(args.taskDueDate).getTime();
  }

  // Resolve assignee if email provided
  if (args.assigneeId) {
    updates.assigneeId = args.assigneeId as Id<"users">;
  } else if (args.assigneeEmail) {
    updates.assigneeId = await resolveUserByEmail(ctx, organizationId, args.assigneeEmail);
  }

  await ctx.runMutation(
    internal.ai.tools.internalToolMutations.internalUpdateTask,
    updates
  );

  const updatedFields = [];
  if (args.taskName) updatedFields.push("name");
  if (args.status) updatedFields.push("status");
  if (args.taskPriority) updatedFields.push("priority");
  if (args.assigneeId || args.assigneeEmail) updatedFields.push("assignee");

  return {
    success: true,
    action: "update_task",
    data: { taskId: args.taskId, updatedFields },
    message: `✅ Updated task: ${updatedFields.join(", ")}`
  };
}

/**
 * Assign a task to a user
 */
async function assignTask(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
) {
  // Resolve assignee
  let assigneeId: Id<"users">;
  if (args.assigneeId) {
    assigneeId = args.assigneeId as Id<"users">;
  } else {
    assigneeId = await resolveUserByEmail(ctx, organizationId, args.assigneeEmail);
  }

  await ctx.runMutation(
    internal.ai.tools.internalToolMutations.internalUpdateTask,
    {
      organizationId,
      taskId: args.taskId,
      assigneeId,
      performedBy: userId,
    }
  );

  return {
    success: true,
    action: "assign_task",
    data: {
      taskId: args.taskId,
      assigneeId,
    },
    message: `✅ Assigned task to user`
  };
}

/**
 * Helper: Resolve user by email
 */
async function resolveUserByEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: Id<"organizations">,
  email: string
): Promise<Id<"users">> {
  const user = await ctx.runQuery(internal.ai.tools.internalToolMutations.getUserByEmail, {
    organizationId,
    email,
  });

  if (!user) {
    throw new Error(`User with email ${email} not found in organization`);
  }

  return user._id;
}
