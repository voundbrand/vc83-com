/**
 * API V1: CONVERSATIONS ENDPOINTS
 *
 * External API for accessing AI agent conversation data.
 * Wraps internal agentSession queries for the REST API.
 *
 * Endpoints:
 * - GET  /api/v1/conversations                         - List conversations
 * - GET  /api/v1/conversations/:sessionId               - Get conversation detail
 * - GET  /api/v1/conversations/:sessionId/messages      - Get message history
 * - POST /api/v1/conversations/:sessionId/messages      - Send human takeover message
 * - PATCH /api/v1/conversations/:sessionId              - Update status (close, hand off)
 *
 * Security: Triple authentication (API keys, OAuth, CLI sessions)
 * Scope: conversations:read, conversations:write
 */

import { httpAction } from "../../_generated/server";
import { authenticateRequest, requireScopes } from "../../middleware/auth";
import { validateConvexId, invalidIdResponse } from "./httpHelpers";

const generatedApi: any = require("../../_generated/api");

/**
 * LIST CONVERSATIONS
 * GET /api/v1/conversations
 *
 * Query Parameters:
 * - status: "active" | "closed" | "handed_off"
 * - channel: Filter by channel type
 * - limit: Number of results (default: 50, max: 200)
 * - offset: Pagination offset
 */
export const listConversations = httpAction(async (ctx, request) => {
  try {
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    const scopeCheck = requireScopes(authContext, ["conversations:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const channel = url.searchParams.get("channel") || undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const result = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.conversationsInternal.listConversationsInternal,
      {
        organizationId: authContext.organizationId,
        status,
        channel,
        limit,
        offset,
      }
    );

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /conversations (list) error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * GET CONVERSATION (or CONVERSATION MESSAGES)
 * Handles both routes since we use pathPrefix routing:
 * GET /api/v1/conversations/:sessionId
 * GET /api/v1/conversations/:sessionId/messages
 */
export const getConversation = httpAction(async (ctx, request) => {
  try {
    // Check if this is a request for /messages (route internally)
    const url = new URL(request.url);
    if (url.pathname.endsWith("/messages")) {
      // Delegate to getConversationMessages handler
      return getConversationMessagesInternal(ctx, request);
    }

    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    const scopeCheck = requireScopes(authContext, ["conversations:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const pathParts = url.pathname.split("/");
    const sessionIdStr = pathParts[pathParts.length - 1];
    const sessionId = validateConvexId(sessionIdStr, "agentSessions");

    if (!sessionId) {
      return invalidIdResponse("sessionId");
    }

    const conversation = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.conversationsInternal.getConversationInternal,
      {
        organizationId: authContext.organizationId,
        sessionId,
      }
    );

    if (!conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(conversation),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /conversations/:id error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * Internal handler for GET CONVERSATION MESSAGES
 * Called by getConversation when URL ends with /messages
 */
type HttpActionCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

async function getConversationMessagesInternal(ctx: HttpActionCtx, request: Request): Promise<Response> {
  try {
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    const scopeCheck = requireScopes(authContext, ["conversations:read"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // Path: /api/v1/conversations/:sessionId/messages
    const sessionIdStr = pathParts[pathParts.length - 2];
    const sessionId = validateConvexId(sessionIdStr, "agentSessions");

    if (!sessionId) {
      return invalidIdResponse("sessionId");
    }

    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const result = await (ctx as any).runQuery(
      generatedApi.internal.api.v1.conversationsInternal.getConversationMessagesInternal,
      {
        organizationId: authContext.organizationId,
        sessionId,
        limit,
        offset,
      }
    );

    if (!result) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /conversations/:id/messages error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * GET CONVERSATION MESSAGES (standalone export)
 * GET /api/v1/conversations/:sessionId/messages
 *
 * Query Parameters:
 * - limit: Number of messages (default: 100, max: 500)
 * - offset: Pagination offset
 */
export const getConversationMessages = httpAction(async (ctx, request) => {
  return getConversationMessagesInternal(ctx, request);
});

/**
 * SEND MESSAGE (Human Takeover)
 * POST /api/v1/conversations/:sessionId/messages
 *
 * Request Body:
 * { content: string }
 */
export const sendConversationMessage = httpAction(async (ctx, request) => {
  try {
    // Verify path ends with /messages (since we use pathPrefix routing)
    const url = new URL(request.url);
    if (!url.pathname.endsWith("/messages")) {
      return new Response(
        JSON.stringify({ error: "Not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    const scopeCheck = requireScopes(authContext, ["conversations:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const pathParts = url.pathname.split("/");
    // Path: /api/v1/conversations/:sessionId/messages
    const sessionIdStr = pathParts[pathParts.length - 2];
    const sessionId = validateConvexId(sessionIdStr, "agentSessions");

    if (!sessionId) {
      return invalidIdResponse("sessionId");
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required field: content" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await (ctx as any).runMutation(
      generatedApi.internal.api.v1.conversationsInternal.sendMessageInternal,
      {
        organizationId: authContext.organizationId,
        sessionId,
        content,
        performedBy: authContext.userId,
      }
    );

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /conversations/:id/messages (POST) error:", error);
    const errMsg = error instanceof Error ? error.message : "";
    if (errMsg === "Session not found") {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    if (errMsg.includes("closed session")) {
      return new Response(
        JSON.stringify({ error: "Cannot send message to a closed conversation" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * UPDATE CONVERSATION STATUS
 * PATCH /api/v1/conversations/:sessionId
 *
 * Request Body:
 * { status: "closed" | "handed_off" | "active", handOffToUserId?: string }
 */
export const updateConversation = httpAction(async (ctx, request) => {
  try {
    const authResult = await authenticateRequest(ctx, request);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const authContext = authResult.context;

    const scopeCheck = requireScopes(authContext, ["conversations:write"]);
    if (!scopeCheck.success) {
      return new Response(
        JSON.stringify({ error: scopeCheck.error }),
        { status: scopeCheck.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const sessionIdStr = pathParts[pathParts.length - 1];
    const sessionId = validateConvexId(sessionIdStr, "agentSessions");

    if (!sessionId) {
      return invalidIdResponse("sessionId");
    }

    const body = await request.json();
    const { status, handOffToUserId } = body;

    if (!status || !["closed", "handed_off", "active"].includes(status)) {
      return new Response(
        JSON.stringify({ error: "Invalid status. Must be: closed, handed_off, or active" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await (ctx as any).runMutation(
      generatedApi.internal.api.v1.conversationsInternal.updateConversationStatusInternal,
      {
        organizationId: authContext.organizationId,
        sessionId,
        status,
        handOffToUserId,
        performedBy: authContext.userId,
      }
    );

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Organization-Id": authContext.organizationId,
        },
      }
    );
  } catch (error) {
    console.error("API /conversations/:id (PATCH) error:", error);
    const errMsg = error instanceof Error ? error.message : "";
    if (errMsg === "Session not found") {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
