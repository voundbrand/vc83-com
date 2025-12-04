/**
 * API V1: PROJECTS ENDPOINTS
 *
 * External API for creating and managing projects.
 * Used by external systems to manage project lifecycle.
 *
 * Endpoints:
 * - POST /api/v1/projects - Create project
 * - GET /api/v1/projects - List projects
 * - GET /api/v1/projects/:projectId - Get project details
 * - PATCH /api/v1/projects/:projectId - Update project
 * - DELETE /api/v1/projects/:projectId - Delete project (draft only)
 * - GET /api/v1/projects/:projectId/milestones - List milestones
 * - GET /api/v1/projects/:projectId/tasks - List tasks
 * - GET /api/v1/projects/:projectId/team - List team members
 * - GET /api/v1/projects/:projectId/comments - List comments
 * - GET /api/v1/projects/:projectId/activity - Get activity log
 *
 * Security: API key required in Authorization header
 * Scope: Returns only projects for the authenticated organization
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";

/**
 * CREATE PROJECT
 * Creates a new project
 *
 * POST /api/v1/projects
 *
 * Request Body:
 * {
 *   subtype: "client_project" | "internal" | "campaign" | "product_development" | "other",
 *   name: string,
 *   description?: string,
 *   startDate?: number,           // Unix timestamp
 *   targetEndDate?: number,        // Unix timestamp
 *   budget?: {
 *     amount: number,
 *     currency: string
 *   },
 *   priority?: "low" | "medium" | "high" | "critical",
 *   clientOrgId?: string,          // CRM organization ID
 *   customProperties?: object
 * }
 *
 * Response:
 * {
 *   success: true,
 *   projectId: string,
 *   message: string
 * }
 */
export const createProject = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId, userId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Parse request body
    const body = await request.json();
    const {
      subtype,
      name,
      description,
      startDate,
      targetEndDate,
      budget,
      priority,
      clientOrgId,
      customProperties,
    } = body;

    // Validate required fields
    if (!subtype || !name) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: subtype, name"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Create project
    const projectId = await ctx.runMutation(
      internal.api.v1.projectsInternal.createProjectInternal,
      {
        organizationId,
        subtype,
        name,
        description,
        startDate,
        targetEndDate,
        budget,
        priority,
        clientOrgId,
        customProperties,
        performedBy: userId,
      }
    );

    // 5. Return success
    return new Response(
      JSON.stringify({
        success: true,
        projectId,
        message: "Project created successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /projects (create) error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * LIST PROJECTS
 * Lists projects for an organization
 *
 * GET /api/v1/projects
 *
 * Query Parameters:
 * - subtype: Filter by project type (client_project, internal, campaign, etc.)
 * - status: Filter by status (draft, planning, active, on_hold, completed, cancelled)
 * - priority: Filter by priority (low, medium, high, critical)
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Pagination offset (default: 0)
 *
 * Response:
 * {
 *   projects: Array<{
 *     id: string,
 *     name: string,
 *     description: string,
 *     subtype: string,
 *     status: string,
 *     projectCode: string,
 *     startDate: number,
 *     targetEndDate: number,
 *     budget: { amount: number, currency: string },
 *     priority: string,
 *     progress: number,
 *     clientOrgId: string,
 *     createdAt: number,
 *     updatedAt: number
 *   }>,
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */
export const listProjects = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Parse query parameters
    const url = new URL(request.url);
    const subtype = url.searchParams.get("subtype") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const priority = url.searchParams.get("priority") || undefined;
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50"),
      200
    );
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 4. Query projects
    const result = await ctx.runQuery(
      internal.api.v1.projectsInternal.listProjectsInternal,
      {
        organizationId,
        subtype,
        status,
        priority,
        limit,
        offset,
      }
    );

    // 5. Return response
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /projects (list) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET PROJECT
 * Gets a specific project by ID
 *
 * GET /api/v1/projects/:projectId
 *
 * Response:
 * {
 *   id: string,
 *   organizationId: string,
 *   name: string,
 *   description: string,
 *   subtype: string,
 *   status: string,
 *   projectCode: string,
 *   startDate: number,
 *   targetEndDate: number,
 *   budget: { amount: number, currency: string },
 *   priority: string,
 *   progress: number,
 *   clientOrgId: string,
 *   detailedDescription: string,
 *   customProperties: object,
 *   createdBy: string,
 *   createdAt: number,
 *   updatedAt: number
 * }
 */
export const getProject = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Extract project ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const projectId = pathParts[pathParts.length - 1];

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Query project
    const project = await ctx.runQuery(
      internal.api.v1.projectsInternal.getProjectInternal,
      {
        organizationId,
        projectId,
      }
    );

    if (!project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Return response
    return new Response(
      JSON.stringify(project),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /projects/:id error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * UPDATE PROJECT
 * Updates an existing project
 *
 * PATCH /api/v1/projects/:projectId
 *
 * Request Body: (all fields optional)
 * {
 *   subtype?: string,
 *   name?: string,
 *   description?: string,
 *   startDate?: number,
 *   targetEndDate?: number,
 *   budget?: { amount: number, currency: string },
 *   priority?: string,
 *   progress?: number,
 *   status?: string,
 *   clientOrgId?: string,
 *   customProperties?: object
 * }
 *
 * Response:
 * {
 *   success: true,
 *   projectId: string,
 *   message: string
 * }
 */
export const updateProject = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId, userId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Extract project ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const projectId = pathParts[pathParts.length - 1];

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const {
      subtype,
      name,
      description,
      startDate,
      targetEndDate,
      budget,
      priority,
      progress,
      status,
      clientOrgId,
      customProperties,
    } = body;

    // 5. Update project
    await ctx.runMutation(
      internal.api.v1.projectsInternal.updateProjectInternal,
      {
        organizationId,
        projectId,
        subtype,
        name,
        description,
        startDate,
        targetEndDate,
        budget,
        priority,
        progress,
        status,
        clientOrgId,
        customProperties,
        performedBy: userId,
      }
    );

    // 6. Return success
    return new Response(
      JSON.stringify({
        success: true,
        projectId,
        message: "Project updated successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /projects/:id (update) error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * DELETE PROJECT
 * Permanently deletes a draft project
 *
 * DELETE /api/v1/projects/:projectId
 *
 * Response:
 * {
 *   success: true,
 *   message: string
 * }
 */
export const deleteProject = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId, userId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Extract project ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const projectId = pathParts[pathParts.length - 1];

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Delete project
    await ctx.runMutation(
      internal.api.v1.projectsInternal.deleteProjectInternal,
      {
        organizationId,
        projectId,
        performedBy: userId,
      }
    );

    // 5. Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Project deleted successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /projects/:id (delete) error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * LIST MILESTONES
 * Gets all milestones for a project
 *
 * GET /api/v1/projects/:projectId/milestones
 *
 * Response:
 * {
 *   milestones: Array<{
 *     id: string,
 *     name: string,
 *     description: string,
 *     status: string,
 *     dueDate: number,
 *     projectId: string,
 *     createdAt: number,
 *     updatedAt: number
 *   }>,
 *   total: number
 * }
 */
export const listMilestones = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Extract project ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const projectId = pathParts[pathParts.length - 2]; // /projects/:projectId/milestones

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Query milestones
    const milestones = await ctx.runQuery(
      internal.api.v1.projectsInternal.listMilestonesInternal,
      {
        organizationId,
        projectId,
      }
    );

    // 5. Return response
    return new Response(
      JSON.stringify({
        milestones,
        total: milestones.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /projects/:id/milestones error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * LIST TASKS
 * Gets all tasks for a project or milestone
 *
 * GET /api/v1/projects/:projectId/tasks
 *
 * Query Parameters:
 * - milestoneId: Optional milestone ID to filter tasks
 *
 * Response:
 * {
 *   tasks: Array<{
 *     id: string,
 *     name: string,
 *     description: string,
 *     status: string,
 *     projectId: string,
 *     milestoneId: string,
 *     assigneeId: string,
 *     dueDate: number,
 *     priority: string,
 *     createdAt: number,
 *     updatedAt: number
 *   }>,
 *   total: number
 * }
 */
export const listTasks = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Extract project ID from URL and milestone ID from query
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const projectId = pathParts[pathParts.length - 2]; // /projects/:projectId/tasks
    const milestoneId = url.searchParams.get("milestoneId") || undefined;

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Query tasks
    const tasks = await ctx.runQuery(
      internal.api.v1.projectsInternal.listTasksInternal,
      {
        organizationId,
        projectId,
        milestoneId,
      }
    );

    // 5. Return response
    return new Response(
      JSON.stringify({
        tasks,
        total: tasks.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /projects/:id/tasks error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * LIST TEAM MEMBERS
 * Gets all team members for a project
 *
 * GET /api/v1/projects/:projectId/team
 *
 * Response:
 * {
 *   teamMembers: Array<{
 *     userId: string,
 *     name: string,
 *     email: string,
 *     role: string,
 *     addedAt: number
 *   }>,
 *   total: number
 * }
 */
export const listTeamMembers = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Extract project ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const projectId = pathParts[pathParts.length - 2]; // /projects/:projectId/team

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Query team members
    const teamMembers = await ctx.runQuery(
      internal.api.v1.projectsInternal.listTeamMembersInternal,
      {
        organizationId,
        projectId,
      }
    );

    // 5. Return response
    return new Response(
      JSON.stringify({
        teamMembers,
        total: teamMembers.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /projects/:id/team error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * LIST COMMENTS
 * Gets all comments for a project
 *
 * GET /api/v1/projects/:projectId/comments
 *
 * Response:
 * {
 *   comments: Array<{
 *     id: string,
 *     content: string,
 *     authorName: string,
 *     authorId: string,
 *     parentCommentId: string,
 *     replies: Array<{
 *       id: string,
 *       content: string,
 *       authorName: string,
 *       authorId: string,
 *       createdAt: number
 *     }>,
 *     createdAt: number,
 *     updatedAt: number
 *   }>,
 *   total: number
 * }
 */
export const listComments = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Extract project ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const projectId = pathParts[pathParts.length - 2]; // /projects/:projectId/comments

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Query comments
    const comments = await ctx.runQuery(
      internal.api.v1.projectsInternal.listCommentsInternal,
      {
        organizationId,
        projectId,
      }
    );

    // 5. Return response
    return new Response(
      JSON.stringify({
        comments,
        total: comments.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /projects/:id/comments error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET ACTIVITY LOG
 * Gets activity log for a project
 *
 * GET /api/v1/projects/:projectId/activity
 *
 * Query Parameters:
 * - limit: Number of activities to return (default: 100)
 *
 * Response:
 * {
 *   activities: Array<{
 *     id: string,
 *     actionType: string,
 *     actionData: object,
 *     performerName: string,
 *     performedBy: string,
 *     performedAt: number
 *   }>,
 *   total: number
 * }
 */
export const getActivityLog = httpAction(async (ctx, request) => {
  try {
    // 1. Verify API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = authHeader.substring(7);
    const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
      apiKey,
    });

    if (!authContext) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { organizationId } = authContext;

    // 2. Update API key usage tracking
    await ctx.runMutation(internal.api.auth.updateApiKeyUsage, { apiKey });

    // 3. Extract project ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const projectId = pathParts[pathParts.length - 2]; // /projects/:projectId/activity
    const limit = parseInt(url.searchParams.get("limit") || "100");

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Query activity log
    const activities = await ctx.runQuery(
      internal.api.v1.projectsInternal.getActivityLogInternal,
      {
        organizationId,
        projectId,
        limit,
      }
    );

    // 5. Return response
    return new Response(
      JSON.stringify({
        activities,
        total: activities.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /projects/:id/activity error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
