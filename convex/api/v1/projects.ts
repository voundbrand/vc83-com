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
 * Security: Dual authentication support
 * - API keys (full access, backward compatible)
 * - OAuth tokens (scope-based access control)
 * Scope: Returns only projects for the authenticated organization
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { authenticateRequest, requireScopes, getEffectiveOrganizationId } from "../../middleware/auth";

/**
 * CREATE PROJECT
 * Creates a new project
 *
 * POST /api/v1/projects
 * Required Scope: projects:write
 */
export const createProject = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require projects:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["projects:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);
    const userId = authContext.userId;

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: projects:read
 */
export const listProjects = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require projects:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["projects:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: projects:read
 */
export const getProject = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require projects:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["projects:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: projects:write
 */
export const updateProject = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require projects:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["projects:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);
    const userId = authContext.userId;

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: projects:write
 */
export const deleteProject = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require projects:write scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["projects:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);
    const userId = authContext.userId;

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: projects:read
 */
export const listMilestones = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require projects:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["projects:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: projects:read
 */
export const listTasks = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require projects:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["projects:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: projects:read
 */
export const listTeamMembers = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require projects:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["projects:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: projects:read
 */
export const listComments = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require projects:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["projects:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

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
          "X-Auth-Type": authContext.authMethod,
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
 * Required Scope: projects:read
 */
export const getActivityLog = httpAction(async (ctx, request) => {
  try {
    // 1. Universal authentication (API key or OAuth)
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    // 2. Require projects:read scope for OAuth tokens
    const scopeCheck = requireScopes(authContext, ["projects:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const organizationId = getEffectiveOrganizationId(authContext);

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
          "X-Auth-Type": authContext.authMethod,
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
