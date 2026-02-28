/**
 * AI Chat HTTP API for Mobile Apps
 *
 * Provides REST endpoints for AI chat functionality, wrapping the existing
 * Convex queries and mutations. This enables mobile apps (iOS/Android) to
 * access the same AI chat system as the web app.
 *
 * All endpoints require session-based authentication via Bearer token.
 * The session ID is obtained from the mobile OAuth flow.
 *
 * Endpoints:
 * - POST /api/v1/ai/conversations - Create a new conversation
 * - GET /api/v1/ai/conversations - List conversations for user
 * - GET /api/v1/ai/conversations/:id - Get conversation with messages
 * - POST /api/v1/ai/chat - Send a message (triggers AI response)
 * - GET /api/v1/ai/settings - Get organization AI settings
 * - POST /api/v1/ai/tools/:id/approve - Approve tool execution
 * - POST /api/v1/ai/tools/:id/reject - Reject tool execution
 * - GET /api/v1/ai/models - Get available AI models
 */

import { httpAction } from "../../_generated/server";
import { getCorsHeaders, handleOptionsRequest } from "./corsHeaders";
import type { Id } from "../../_generated/dataModel";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../_generated/api");

const PROVIDER_ALIASES: Record<string, string> = {
  google: "gemini",
  "google-ai-studio": "gemini",
  xai: "grok",
  "openai-compatible": "openai_compatible",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate session and get user context from Bearer token
 */
async function validateSessionFromRequest(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  request: Request
): Promise<{
  success: true;
  sessionId: Id<"sessions">;
  userId: Id<"users">;
  organizationId: Id<"organizations">;
} | {
  success: false;
  error: string;
  status: number;
}> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      error: "Missing or invalid Authorization header. Use: Bearer <sessionId>",
      status: 401,
    };
  }

  const sessionId = authHeader.substring(7) as Id<"sessions">;

  try {
    // Validate session and get user info
    const session = await (ctx as any).runQuery(generatedApi.internal.api.v1.aiChatInternal.validateSession, {
      sessionId,
    });

    if (!session) {
      return {
        success: false,
        error: "Invalid or expired session",
        status: 401,
      };
    }

    return {
      success: true,
      sessionId,
      userId: session.userId,
      organizationId: session.organizationId,
    };
  } catch (error) {
    console.error("[AI Chat API] Session validation error:", error);
    return {
      success: false,
      error: "Session validation failed",
      status: 401,
    };
  }
}

/**
 * Create error response with CORS headers
 */
function errorResponse(
  error: string,
  status: number,
  origin: string | null
): Response {
  return new Response(
    JSON.stringify({ success: false, error }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(origin),
      },
    }
  );
}

/**
 * Create success response with CORS headers
 */
function successResponse(
  data: unknown,
  origin: string | null,
  status = 200
): Response {
  return new Response(
    JSON.stringify({ success: true, ...data as object }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(origin),
      },
    }
  );
}

function parseOptionalRuntimeObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function parseOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseConversationId(value: unknown): Id<"aiConversations"> | undefined {
  const parsed = parseOptionalString(value);
  return parsed as Id<"aiConversations"> | undefined;
}

function parseRequestedVoiceProviderId(
  value: unknown
): "browser" | "elevenlabs" | undefined {
  if (value !== "browser" && value !== "elevenlabs") {
    return undefined;
  }
  return value;
}

async function resolveVoiceRuntimeSessionContext(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  auth: {
    organizationId: Id<"organizations">;
    userId: Id<"users">;
  },
  conversationId?: Id<"aiConversations">
) {
  const resolved = await (ctx as any).runAction(
    generatedApi.api.ai.chat.resolveVoiceRuntimeSession,
    {
      organizationId: auth.organizationId,
      userId: auth.userId,
      conversationId,
    }
  ) as {
    conversationId: Id<"aiConversations">;
    agentSessionId: Id<"agentSessions">;
  };

  return {
    conversationId: resolved.conversationId,
    interviewSessionId: resolved.agentSessionId,
  };
}

function parseMobileAttachments(
  value: unknown
): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .filter((item) => item && typeof item === "object")
    .map((item) => item as Record<string, unknown>)
    .slice(0, 8);

  return normalized.length > 0 ? normalized : undefined;
}

function isNoActiveAgentError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.toLowerCase().includes("no active agent found for this organization");
}

function normalizeModelId(modelId: string | undefined): string | null {
  if (!modelId) {
    return null;
  }

  const normalized = modelId.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeProviderId(provider: string | undefined): string {
  if (!provider) {
    return "other";
  }

  const normalized = provider.trim().toLowerCase();
  return PROVIDER_ALIASES[normalized] || normalized;
}

function inferProviderIdFromModelId(modelId: string): string {
  const [providerToken] = modelId.split("/");
  return normalizeProviderId(providerToken);
}

function formatModelDisplayName(modelId: string): string {
  const parts = modelId.split("/");
  const rawName = parts[1] || modelId;
  return rawName.replace(/[-_]/g, " ");
}

// ============================================================================
// HTTP HANDLERS
// ============================================================================

/**
 * OPTIONS handler for CORS preflight
 */
export const handleOptions = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  return handleOptionsRequest(origin);
});

/**
 * POST /api/v1/ai/conversations - Create a new conversation
 *
 * Request body:
 * {
 *   title?: string  // Optional conversation title
 * }
 *
 * Response:
 * {
 *   success: true,
 *   conversationId: string,
 *   conversation: { ... }
 * }
 */
export const createConversation = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  // Validate session
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { title } = body as { title?: string };

    // Create conversation
    const conversationId = await (ctx as any).runMutation(generatedApi.api.ai.conversations.createConversation, {
      organizationId: auth.organizationId,
      userId: auth.userId,
      title,
    });

    // Get the created conversation
    const conversation = await (ctx as any).runQuery(generatedApi.api.ai.conversations.getConversation, {
      conversationId,
    });

    return successResponse({ conversationId, conversation }, origin, 201);
  } catch (error) {
    console.error("[AI Chat API] Create conversation error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create conversation",
      500,
      origin
    );
  }
});

/**
 * GET /api/v1/ai/conversations - List conversations for user
 *
 * Query params:
 * - limit?: number (default: 50, max: 100)
 *
 * Response:
 * {
 *   success: true,
 *   conversations: [...]
 * }
 */
export const listConversations = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  // Validate session
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    // Parse query params
    const url = new URL(request.url);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50"),
      100
    );

    // Get conversations
    const conversations = await (ctx as any).runQuery(generatedApi.api.ai.conversations.listConversations, {
      organizationId: auth.organizationId,
      userId: auth.userId,
      limit,
    });

    return successResponse({ conversations }, origin);
  } catch (error) {
    console.error("[AI Chat API] List conversations error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to list conversations",
      500,
      origin
    );
  }
});

/**
 * GET /api/v1/ai/conversations/:id - Get conversation with messages
 *
 * Response:
 * {
 *   success: true,
 *   conversation: {
 *     _id: string,
 *     title?: string,
 *     status: string,
 *     messages: [...],
 *     createdAt: number,
 *     updatedAt: number
 *   }
 * }
 */
export const getConversation = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  // Validate session
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    // Extract conversation ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const conversationId = pathParts[pathParts.length - 1] as Id<"aiConversations">;

    if (!conversationId) {
      return errorResponse("Conversation ID required", 400, origin);
    }

    // Get conversation
    const conversation = await (ctx as any).runQuery(generatedApi.api.ai.conversations.getConversation, {
      conversationId,
    });

    // Verify ownership
    if (conversation.userId !== auth.userId) {
      return errorResponse("Access denied", 403, origin);
    }

    const pendingTools = await (ctx as any).runQuery(
      generatedApi.api.ai.conversations.getPendingToolExecutions,
      { conversationId }
    );

    return successResponse({ conversation, pendingTools }, origin);
  } catch (error) {
    console.error("[AI Chat API] Get conversation error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to get conversation",
      500,
      origin
    );
  }
});

/**
 * POST /api/v1/ai/chat - Send a message and get AI response
 *
 * Request body:
 * {
 *   conversationId?: string,  // Optional - creates new if not provided
 *   message: string,          // User's message
 *   selectedModel?: string    // Optional model override (e.g., "anthropic/claude-3-5-sonnet")
 * }
 *
 * Response:
 * {
 *   success: true,
 *   conversationId: string,
 *   message: string,          // AI response
 *   toolCalls: [...],         // Any tool calls made
 *   usage: { ... },           // Token usage
 *   cost: number              // Cost in USD
 * }
 */
export const sendMessage = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  // Validate session
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    // Parse request body
    const body = await request.json();
    const {
      conversationId,
      message,
      selectedModel,
      privacyMode,
      liveSessionId,
      cameraRuntime,
      voiceRuntime,
      commandPolicy,
      transportRuntime,
      avObservability,
      geminiLive,
      attachments,
    } = body as {
      conversationId?: string;
      message: string;
      selectedModel?: string;
      privacyMode?: boolean;
      liveSessionId?: string;
      cameraRuntime?: Record<string, unknown>;
      voiceRuntime?: Record<string, unknown>;
      commandPolicy?: Record<string, unknown>;
      transportRuntime?: Record<string, unknown>;
      avObservability?: Record<string, unknown>;
      geminiLive?: Record<string, unknown>;
      attachments?: Array<Record<string, unknown>>;
    };

    if (!message || typeof message !== "string" || message.trim() === "") {
      return errorResponse("Message is required", 400, origin);
    }

    await (ctx as any).runMutation(
      generatedApi.internal.ai.settings.ensureOrganizationModelDefaultsInternal,
      {
        organizationId: auth.organizationId,
      }
    );
    await (ctx as any).runMutation(
      generatedApi.internal.agentOntology.ensureActiveAgentForOrgInternal,
      {
        organizationId: auth.organizationId,
        channel: "desktop",
      }
    );

    const inboundConversationId = conversationId as Id<"aiConversations"> | undefined;
    const normalizedMessage = message.trim();
    const parsedLiveSessionId = parseOptionalString(liveSessionId);
    const parsedCameraRuntime = parseOptionalRuntimeObject(cameraRuntime);
    const parsedVoiceRuntime = parseOptionalRuntimeObject(voiceRuntime);
    const parsedCommandPolicy = parseOptionalRuntimeObject(commandPolicy);
    const parsedTransportRuntime = parseOptionalRuntimeObject(transportRuntime);
    const parsedAvObservability = parseOptionalRuntimeObject(avObservability);
    const parsedGeminiLive = parseOptionalRuntimeObject(geminiLive);
    const parsedAttachments = parseMobileAttachments(attachments);

    const runChatSend = async () =>
      await (ctx as any).runAction(generatedApi.api.ai.chat.sendMessage, {
        conversationId: inboundConversationId,
        message: normalizedMessage,
        organizationId: auth.organizationId,
        userId: auth.userId,
        selectedModel,
        privacyMode: privacyMode === true,
        liveSessionId: parsedLiveSessionId,
        cameraRuntime: parsedCameraRuntime,
        voiceRuntime: parsedVoiceRuntime,
        commandPolicy: parsedCommandPolicy,
        transportRuntime: parsedTransportRuntime,
        avObservability: parsedAvObservability,
        geminiLive: parsedGeminiLive,
        attachments: parsedAttachments,
      });

    let result;
    try {
      result = await runChatSend();
    } catch (error) {
      if (!isNoActiveAgentError(error)) {
        throw error;
      }

      const routeSelectors = inboundConversationId
        ? {
            channel: "desktop",
            peer: `desktop:${auth.userId}:${inboundConversationId}`,
            channelRef: String(inboundConversationId),
          }
        : {
            channel: "desktop",
          };
      await (ctx as any).runMutation(
        generatedApi.internal.agentOntology.ensureActiveAgentForOrgInternal,
        {
          organizationId: auth.organizationId,
          channel: "desktop",
          routeSelectors,
        }
      );
      result = await runChatSend();
    }

    return successResponse({
      conversationId: result.conversationId,
      message: result.message,
      toolCalls: result.toolCalls,
      usage: result.usage,
      cost: result.cost,
    }, origin);
  } catch (error) {
    console.error("[AI Chat API] Send message error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to send message",
      500,
      origin
    );
  }
});

/**
 * GET /api/v1/ai/settings - Get organization AI settings
 *
 * Response:
 * {
 *   success: true,
 *   settings: {
 *     enabled: boolean,
 *     billingMode: "platform" | "byok",
 *     tier?: string,
 *     llm: { ... },
 *     monthlyBudgetUsd?: number,
 *     currentMonthSpend: number
 *   }
 * }
 */
export const getSettings = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  // Validate session
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    await (ctx as any).runMutation(
      generatedApi.internal.ai.settings.ensureOrganizationModelDefaultsInternal,
      {
        organizationId: auth.organizationId,
      }
    );

    // Get AI settings
    const settings = await (ctx as any).runQuery(generatedApi.api.ai.settings.getAISettings, {
      organizationId: auth.organizationId,
    });

    if (!settings) {
      return errorResponse("AI settings not configured for this organization", 404, origin);
    }

    // Remove sensitive data (API keys) from response
    const safeSettings = {
      enabled: true,
      billingMode: settings.billingMode,
      tier: settings.tier,
      llm: {
        enabledModels: settings.llm.enabledModels,
        defaultModelId: settings.llm.defaultModelId,
        model: settings.llm.model,
        temperature: settings.llm.temperature,
        maxTokens: settings.llm.maxTokens,
        // Indicate if BYOK key is configured without exposing it
        hasApiKey: !!settings.llm.openrouterApiKey,
      },
      monthlyBudgetUsd: settings.monthlyBudgetUsd,
      currentMonthSpend: settings.currentMonthSpend,
    };

    return successResponse({ settings: safeSettings }, origin);
  } catch (error) {
    console.error("[AI Chat API] Get settings error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to get settings",
      500,
      origin
    );
  }
});

/**
 * GET /api/v1/ai/models - Get available AI models
 *
 * Response:
 * {
 *   success: true,
 *   models: [
 *     {
 *       modelId: string,
 *       name: string,
 *       provider: string,
 *       isDefault: boolean,
 *       customLabel?: string
 *     }
 *   ]
 * }
 */
export const getModels = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  // Validate session
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    await (ctx as any).runMutation(
      generatedApi.internal.ai.settings.ensureOrganizationModelDefaultsInternal,
      {
        organizationId: auth.organizationId,
      }
    );

    type ConfiguredModelRow = {
      modelId: string;
      customLabel?: string;
    };

    type OfferedChatModel = {
      id: string;
      name: string;
      providerId: string;
      customLabel?: string;
    };

    const settings = await (ctx as any).runQuery(
      generatedApi.api.ai.settings.getAISettings,
      {
        organizationId: auth.organizationId,
      }
    ) as {
      llm?: {
        enabledModels?: Array<{
          modelId?: string;
          isDefault?: boolean;
          customLabel?: string;
        }>;
        defaultModelId?: string;
      };
    } | null;

    const platformModelsByProvider = await (ctx as any).runQuery(
      generatedApi.api.ai.platformModels.getEnabledModelsByProvider,
      {}
    ) as Record<string, Array<{
      modelId?: string;
      name?: string;
      provider?: string;
    }>> | null;

    const connectionCatalog = await (ctx as any).runQuery(
      generatedApi.api.integrations.aiConnections.getAIConnectionCatalog,
      {
        sessionId: auth.sessionId,
        organizationId: auth.organizationId,
      }
    ) as {
      byokEnabled?: boolean;
      providers?: Array<{
        providerId?: string;
        isConnected?: boolean;
        enabled?: boolean;
      }>;
    } | null;

    const configuredModelRows: ConfiguredModelRow[] = [];
    const seenConfiguredModelIds = new Set<string>();
    let firstConfiguredDefaultModelId: string | undefined;
    const enabledModels = Array.isArray(settings?.llm?.enabledModels)
      ? settings.llm.enabledModels
      : [];
    for (const configuredModel of enabledModels) {
      const normalizedModelId = normalizeModelId(configuredModel.modelId);
      if (!normalizedModelId || seenConfiguredModelIds.has(normalizedModelId)) {
        continue;
      }
      seenConfiguredModelIds.add(normalizedModelId);
      if (!firstConfiguredDefaultModelId && configuredModel.isDefault === true) {
        firstConfiguredDefaultModelId = normalizedModelId;
      }
      configuredModelRows.push({
        modelId: normalizedModelId,
        customLabel:
          typeof configuredModel.customLabel === "string"
            ? configuredModel.customLabel
            : undefined,
      });
    }

    const canUseByok = connectionCatalog?.byokEnabled === true;
    const connectedProviderIds = new Set<string>();
    for (const provider of connectionCatalog?.providers || []) {
      if (provider.isConnected === true && provider.enabled === true) {
        connectedProviderIds.add(normalizeProviderId(provider.providerId));
      }
    }

    const platformModelIndex = new Map<string, { id: string; name: string; providerId: string }>();
    for (const [providerKey, providerModels] of Object.entries(platformModelsByProvider || {})) {
      const normalizedProviderId = normalizeProviderId(providerKey);
      for (const platformModel of providerModels || []) {
        const normalizedModelId = normalizeModelId(platformModel.modelId);
        if (!normalizedModelId || platformModelIndex.has(normalizedModelId)) {
          continue;
        }

        platformModelIndex.set(normalizedModelId, {
          id: normalizedModelId,
          name:
            typeof platformModel.name === "string" && platformModel.name.trim().length > 0
              ? platformModel.name.trim()
              : formatModelDisplayName(normalizedModelId),
          providerId: normalizeProviderId(platformModel.provider || normalizedProviderId),
        });
      }
    }

    const offerings = new Map<string, OfferedChatModel>();
    const addModel = (model: OfferedChatModel) => {
      if (offerings.has(model.id)) {
        return;
      }
      offerings.set(model.id, model);
    };

    if (configuredModelRows.length > 0) {
      for (const configuredModel of configuredModelRows) {
        const platformMatch = platformModelIndex.get(configuredModel.modelId);
        if (platformMatch) {
          addModel({
            ...platformMatch,
            name: configuredModel.customLabel || platformMatch.name,
            customLabel: configuredModel.customLabel,
          });
          continue;
        }

        const inferredProviderId = inferProviderIdFromModelId(configuredModel.modelId);
        const isByokEligible = canUseByok && connectedProviderIds.has(inferredProviderId);
        if (!isByokEligible) {
          continue;
        }

        addModel({
          id: configuredModel.modelId,
          name: configuredModel.customLabel || formatModelDisplayName(configuredModel.modelId),
          providerId: inferredProviderId,
          customLabel: configuredModel.customLabel,
        });
      }
    } else {
      for (const platformModel of platformModelIndex.values()) {
        addModel(platformModel);
      }
    }

    const offeredModels = Array.from(offerings.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    );
    const offeredModelIds = new Set(offeredModels.map((model) => model.id));
    const configuredDefaultModelId =
      normalizeModelId(
        (typeof settings?.llm?.defaultModelId === "string"
          ? settings.llm.defaultModelId
          : undefined) ||
          firstConfiguredDefaultModelId ||
          configuredModelRows[0]?.modelId
      ) || undefined;
    const defaultModelId =
      configuredDefaultModelId && offeredModelIds.has(configuredDefaultModelId)
        ? configuredDefaultModelId
        : offeredModels[0]?.id;

    const models = offeredModels.map((model) => ({
      modelId: model.id,
      name: model.name,
      provider: model.providerId,
      isDefault: model.id === defaultModelId,
      customLabel: model.customLabel,
    }));

    return successResponse({ models }, origin);
  } catch (error) {
    console.error("[AI Chat API] Get models error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to get models",
      500,
      origin
    );
  }
});

/**
 * POST /api/v1/ai/voice/session/resolve
 */
export const resolveVoiceSession = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsedBody = body as {
      conversationId?: unknown;
      voiceSessionId?: unknown;
    };
    const conversationId = parseConversationId(parsedBody.conversationId);
    const voiceSessionId = parseOptionalString(parsedBody.voiceSessionId);
    const resolved = await resolveVoiceRuntimeSessionContext(ctx, auth, conversationId);
    const state = await (ctx as any).runAction(
      generatedApi.api.ai.voiceRuntime.resolveVoiceSessionState,
      {
        sessionId: auth.sessionId,
        interviewSessionId: resolved.interviewSessionId,
        voiceSessionId,
      }
    );
    return successResponse(
      {
        ...resolved,
        voiceSession: state.voiceSession ?? null,
      },
      origin
    );
  } catch (error) {
    console.error("[AI Chat API] Resolve voice session error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to resolve voice session",
      500,
      origin
    );
  }
});

/**
 * POST /api/v1/ai/voice/session/open
 */
export const openVoiceSession = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsedBody = body as {
      conversationId?: unknown;
      interviewSessionId?: Id<"agentSessions">;
      requestedProviderId?: unknown;
      requestedVoiceId?: unknown;
      voiceSessionId?: unknown;
    };
    const conversationId = parseConversationId(parsedBody.conversationId);
    const resolved =
      parsedBody.interviewSessionId
        ? {
            conversationId: conversationId,
            interviewSessionId: parsedBody.interviewSessionId,
          }
        : await resolveVoiceRuntimeSessionContext(ctx, auth, conversationId);

    const result = await (ctx as any).runAction(
      generatedApi.api.ai.voiceRuntime.openVoiceSession,
      {
        sessionId: auth.sessionId,
        interviewSessionId: resolved.interviewSessionId,
        requestedProviderId: parseRequestedVoiceProviderId(parsedBody.requestedProviderId),
        requestedVoiceId: parseOptionalString(parsedBody.requestedVoiceId),
        voiceSessionId: parseOptionalString(parsedBody.voiceSessionId),
      }
    );

    return successResponse(
      {
        ...result,
        interviewSessionId: resolved.interviewSessionId,
        conversationId: resolved.conversationId,
      },
      origin
    );
  } catch (error) {
    console.error("[AI Chat API] Open voice session error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to open voice session",
      500,
      origin
    );
  }
});

/**
 * POST /api/v1/ai/voice/session/close
 */
export const closeVoiceSession = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsedBody = body as {
      conversationId?: unknown;
      interviewSessionId?: Id<"agentSessions">;
      voiceSessionId?: unknown;
      activeProviderId?: unknown;
      reason?: unknown;
    };
    const voiceSessionId = parseOptionalString(parsedBody.voiceSessionId);
    if (!voiceSessionId) {
      return errorResponse("voiceSessionId is required", 400, origin);
    }

    const conversationId = parseConversationId(parsedBody.conversationId);
    const resolved =
      parsedBody.interviewSessionId
        ? {
            conversationId: conversationId,
            interviewSessionId: parsedBody.interviewSessionId,
          }
        : await resolveVoiceRuntimeSessionContext(ctx, auth, conversationId);

    const result = await (ctx as any).runAction(
      generatedApi.api.ai.voiceRuntime.closeVoiceSession,
      {
        sessionId: auth.sessionId,
        interviewSessionId: resolved.interviewSessionId,
        voiceSessionId,
        activeProviderId: parseRequestedVoiceProviderId(parsedBody.activeProviderId),
        reason: parseOptionalString(parsedBody.reason),
      }
    );

    return successResponse(
      {
        ...result,
        interviewSessionId: resolved.interviewSessionId,
        conversationId: resolved.conversationId,
      },
      origin
    );
  } catch (error) {
    console.error("[AI Chat API] Close voice session error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to close voice session",
      500,
      origin
    );
  }
});

/**
 * POST /api/v1/ai/voice/transcribe
 */
export const transcribeVoice = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsedBody = body as {
      conversationId?: unknown;
      interviewSessionId?: Id<"agentSessions">;
      voiceSessionId?: unknown;
      audioBase64?: unknown;
      mimeType?: unknown;
      requestedProviderId?: unknown;
      requestedVoiceId?: unknown;
      language?: unknown;
    };
    const voiceSessionId = parseOptionalString(parsedBody.voiceSessionId);
    const audioBase64 = parseOptionalString(parsedBody.audioBase64);
    if (!voiceSessionId || !audioBase64) {
      return errorResponse("voiceSessionId and audioBase64 are required", 400, origin);
    }

    const conversationId = parseConversationId(parsedBody.conversationId);
    const resolved =
      parsedBody.interviewSessionId
        ? {
            conversationId: conversationId,
            interviewSessionId: parsedBody.interviewSessionId,
          }
        : await resolveVoiceRuntimeSessionContext(ctx, auth, conversationId);

    const result = await (ctx as any).runAction(
      generatedApi.api.ai.voiceRuntime.transcribeVoiceAudio,
      {
        sessionId: auth.sessionId,
        interviewSessionId: resolved.interviewSessionId,
        voiceSessionId,
        audioBase64,
        mimeType: parseOptionalString(parsedBody.mimeType),
        requestedProviderId: parseRequestedVoiceProviderId(parsedBody.requestedProviderId),
        requestedVoiceId: parseOptionalString(parsedBody.requestedVoiceId),
        language: parseOptionalString(parsedBody.language),
      }
    );

    return successResponse(
      {
        ...result,
        interviewSessionId: resolved.interviewSessionId,
        conversationId: resolved.conversationId,
      },
      origin
    );
  } catch (error) {
    console.error("[AI Chat API] Transcribe voice error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to transcribe voice audio",
      500,
      origin
    );
  }
});

/**
 * POST /api/v1/ai/voice/synthesize
 */
export const synthesizeVoice = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsedBody = body as {
      conversationId?: unknown;
      interviewSessionId?: Id<"agentSessions">;
      voiceSessionId?: unknown;
      text?: unknown;
      requestedProviderId?: unknown;
      requestedVoiceId?: unknown;
    };
    const voiceSessionId = parseOptionalString(parsedBody.voiceSessionId);
    const text = parseOptionalString(parsedBody.text);
    if (!voiceSessionId || !text) {
      return errorResponse("voiceSessionId and text are required", 400, origin);
    }

    const conversationId = parseConversationId(parsedBody.conversationId);
    const resolved =
      parsedBody.interviewSessionId
        ? {
            conversationId: conversationId,
            interviewSessionId: parsedBody.interviewSessionId,
          }
        : await resolveVoiceRuntimeSessionContext(ctx, auth, conversationId);

    const result = await (ctx as any).runAction(
      generatedApi.api.ai.voiceRuntime.synthesizeVoicePreview,
      {
        sessionId: auth.sessionId,
        interviewSessionId: resolved.interviewSessionId,
        voiceSessionId,
        text,
        requestedProviderId: parseRequestedVoiceProviderId(parsedBody.requestedProviderId),
        requestedVoiceId: parseOptionalString(parsedBody.requestedVoiceId),
      }
    );

    return successResponse(
      {
        ...result,
        interviewSessionId: resolved.interviewSessionId,
        conversationId: resolved.conversationId,
      },
      origin
    );
  } catch (error) {
    console.error("[AI Chat API] Synthesize voice error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to synthesize voice preview",
      500,
      origin
    );
  }
});

/**
 * POST /api/v1/ai/tools/:id/approve - Approve a pending tool execution
 *
 * Request body:
 * {
 *   dontAskAgain?: boolean  // Optional - skip approval for this tool type in future
 * }
 *
 * Response:
 * {
 *   success: true
 * }
 */
export const approveTool = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  // Validate session
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    // Extract execution ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // URL: /api/v1/ai/tools/:id/approve
    const executionId = pathParts[pathParts.length - 2] as Id<"aiToolExecutions">;

    if (!executionId) {
      return errorResponse("Tool execution ID required", 400, origin);
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { dontAskAgain } = body as { dontAskAgain?: boolean };

    // Approve the tool execution
    await (ctx as any).runMutation(generatedApi.api.ai.conversations.approveToolExecution, {
      executionId,
      dontAskAgain,
    });

    return successResponse({}, origin);
  } catch (error) {
    console.error("[AI Chat API] Approve tool error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to approve tool",
      500,
      origin
    );
  }
});

/**
 * POST /api/v1/ai/tools/:id/reject - Reject a pending tool execution
 *
 * Response:
 * {
 *   success: true
 * }
 */
export const rejectTool = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  // Validate session
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    // Extract execution ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    // URL: /api/v1/ai/tools/:id/reject
    const executionId = pathParts[pathParts.length - 2] as Id<"aiToolExecutions">;

    if (!executionId) {
      return errorResponse("Tool execution ID required", 400, origin);
    }

    // Reject the tool execution
    await (ctx as any).runMutation(generatedApi.api.ai.conversations.rejectToolExecution, {
      executionId,
    });

    return successResponse({}, origin);
  } catch (error) {
    console.error("[AI Chat API] Reject tool error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to reject tool",
      500,
      origin
    );
  }
});

/**
 * POST /api/v1/ai/tools/:id/approve or /reject - Combined handler for tool actions
 *
 * Routes to approve or reject based on URL suffix
 */
export const handleToolAction = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const action = pathParts[pathParts.length - 1]; // 'approve' or 'reject'

  // Validate session
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  // Extract execution ID from URL
  // URL: /api/v1/ai/tools/:id/approve or /api/v1/ai/tools/:id/reject
  const executionId = pathParts[pathParts.length - 2] as Id<"aiToolExecutions">;

  if (!executionId) {
    return errorResponse("Tool execution ID required", 400, origin);
  }

  try {
    if (action === "approve") {
      // Parse request body for optional dontAskAgain flag
      const body = await request.json().catch(() => ({}));
      const { dontAskAgain } = body as { dontAskAgain?: boolean };

      await (ctx as any).runMutation(generatedApi.api.ai.conversations.approveToolExecution, {
        executionId,
        dontAskAgain,
      });
      return successResponse({}, origin);
    } else if (action === "reject") {
      await (ctx as any).runMutation(generatedApi.api.ai.conversations.rejectToolExecution, {
        executionId,
      });
      return successResponse({}, origin);
    }

    return errorResponse("Invalid action. Use /approve or /reject", 400, origin);
  } catch (error) {
    console.error(`[AI Chat API] Tool ${action} error:`, error);
    return errorResponse(
      error instanceof Error ? error.message : `Failed to ${action} tool`,
      500,
      origin
    );
  }
});

/**
 * GET /api/v1/ai/conversations/:id/tools - Get pending tool executions for conversation
 *
 * Response:
 * {
 *   success: true,
 *   pendingTools: [...]
 * }
 */
export const getPendingTools = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  // Validate session
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    // Extract conversation ID from URL
    // URL: /api/v1/ai/conversations/:id/tools
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const conversationId = pathParts[pathParts.length - 2] as Id<"aiConversations">;

    if (!conversationId) {
      return errorResponse("Conversation ID required", 400, origin);
    }

    // Get pending tool executions
    const pendingTools = await (ctx as any).runQuery(generatedApi.api.ai.conversations.getPendingToolExecutions, {
      conversationId,
    });

    return successResponse({ pendingTools }, origin);
  } catch (error) {
    console.error("[AI Chat API] Get pending tools error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to get pending tools",
      500,
      origin
    );
  }
});

/**
 * PATCH /api/v1/ai/conversations/:id - Update conversation (e.g., rename)
 *
 * Request body:
 * {
 *   title?: string
 * }
 *
 * Response:
 * {
 *   success: true
 * }
 */
export const updateConversation = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  // Validate session
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    // Extract conversation ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const conversationId = pathParts[pathParts.length - 1] as Id<"aiConversations">;

    if (!conversationId) {
      return errorResponse("Conversation ID required", 400, origin);
    }

    // Parse request body
    const body = await request.json();
    const { title } = body as { title?: string };

    // Verify ownership first
    const conversation = await (ctx as any).runQuery(generatedApi.api.ai.conversations.getConversation, {
      conversationId,
    });

    if (conversation.userId !== auth.userId) {
      return errorResponse("Access denied", 403, origin);
    }

    // Update conversation
    await (ctx as any).runMutation(generatedApi.api.ai.conversations.updateConversation, {
      conversationId,
      title,
    });

    return successResponse({}, origin);
  } catch (error) {
    console.error("[AI Chat API] Update conversation error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update conversation",
      500,
      origin
    );
  }
});

/**
 * DELETE /api/v1/ai/conversations/:id - Archive conversation
 *
 * Response:
 * {
 *   success: true
 * }
 */
export const archiveConversation = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  // Validate session
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    // Extract conversation ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const conversationId = pathParts[pathParts.length - 1] as Id<"aiConversations">;

    if (!conversationId) {
      return errorResponse("Conversation ID required", 400, origin);
    }

    // Verify ownership first
    const conversation = await (ctx as any).runQuery(generatedApi.api.ai.conversations.getConversation, {
      conversationId,
    });

    if (conversation.userId !== auth.userId) {
      return errorResponse("Access denied", 403, origin);
    }

    // Archive conversation
    await (ctx as any).runMutation(generatedApi.api.ai.conversations.archiveConversation, {
      conversationId,
    });

    return successResponse({}, origin);
  } catch (error) {
    console.error("[AI Chat API] Archive conversation error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to archive conversation",
      500,
      origin
    );
  }
});

// ============================================================================
// ORGANIZATION MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/auth/organizations - List user's organizations
 *
 * Returns all organizations the authenticated user has access to,
 * including their role in each organization.
 *
 * Response:
 * {
 *   success: true,
 *   organizations: [
 *     {
 *       id: string,
 *       name: string,
 *       slug: string,
 *       role: string,
 *       isCurrent: boolean
 *     }
 *   ],
 *   currentOrganizationId: string
 * }
 */
export const listOrganizations = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  // Validate session
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    // Get user's organizations using existing query
    // Returns array of { organization: {...}, role: string, joinedAt: number }
    const result = await (ctx as any).runQuery(generatedApi.api.organizations.getUserOrganizations, {
      sessionId: auth.sessionId,
    });

    if (!result) {
      return errorResponse("Failed to load organizations", 500, origin);
    }

    // Format response for mobile
    // result is an array of { organization: {...}, role: string, joinedAt: number }
    const organizations = result
      .filter((item: { organization: unknown }) => item.organization !== null)
      .map((item: {
        organization: {
          _id: Id<"organizations">;
          name: string;
          slug: string;
        } | null;
        role: string;
      }) => ({
        id: item.organization!._id,
        name: item.organization!.name,
        slug: item.organization!.slug,
        role: item.role,
        isCurrent: item.organization!._id === auth.organizationId,
      }));

    return successResponse({
      organizations,
      currentOrganizationId: auth.organizationId,
    }, origin);
  } catch (error) {
    console.error("[AI Chat API] List organizations error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to list organizations",
      500,
      origin
    );
  }
});

/**
 * POST /api/v1/auth/switch-organization - Switch active organization
 *
 * Changes the user's current organization context. This affects:
 * - Which data they see in AI responses
 * - Which organization's AI settings are used
 * - Which tools and data are accessible
 *
 * Request body:
 * {
 *   organizationId: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   organization: {
 *     id: string,
 *     name: string,
 *     slug: string
 *   }
 * }
 */
export const switchOrganization = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  // Validate session
  const auth = await validateSessionFromRequest(ctx, request);
  if (!auth.success) {
    return errorResponse(auth.error, auth.status, origin);
  }

  try {
    // Parse request body
    const body = await request.json();
    const { organizationId } = body as { organizationId: string };

    if (!organizationId) {
      return errorResponse("organizationId is required", 400, origin);
    }

    // Switch organization using existing mutation
    await (ctx as any).runMutation(generatedApi.api.auth.switchOrganization, {
      sessionId: auth.sessionId,
      organizationId: organizationId as Id<"organizations">,
    });

    await (ctx as any).runMutation(
      generatedApi.internal.ai.settings.ensureOrganizationModelDefaultsInternal,
      {
        organizationId: organizationId as Id<"organizations">,
      }
    );
    await (ctx as any).runMutation(
      generatedApi.internal.agentOntology.ensureActiveAgentForOrgInternal,
      {
        organizationId: organizationId as Id<"organizations">,
        channel: "desktop",
      }
    );

    // Get the organization details to return
    const org = await (ctx as any).runQuery(generatedApi.internal.api.v1.aiChatInternal.getOrganization, {
      organizationId: organizationId as Id<"organizations">,
    });

    if (!org) {
      return errorResponse("Organization not found", 404, origin);
    }

    return successResponse({
      organization: {
        id: org._id,
        name: org.name,
        slug: org.slug,
      },
    }, origin);
  } catch (error) {
    console.error("[AI Chat API] Switch organization error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to switch organization",
      500,
      origin
    );
  }
});
