/**
 * WEBCHAT API
 *
 * Public API endpoints for the webchat widget.
 * Enables visitors to chat with AI agents embedded on any website.
 *
 * Endpoints:
 *   POST /api/v1/webchat/message - Send a message from a webchat visitor
 *   GET /api/v1/webchat/config/:agentId - Get widget configuration for an agent
 *
 * Integration with Comms Platform:
 *   - Webchat operates at Layer 4 (End User ↔ AI Agent)
 *   - Messages flow through the existing agent execution pipeline
 *   - Sessions are anonymous until visitor provides contact info
 *   - Future: notification events for conversation.started, message.received
 */

import { v } from "convex/values";
import { internalAction, internalQuery, internalMutation } from "../../_generated/server";
import { api, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

// ============================================================================
// TYPES
// ============================================================================

export interface WebchatSession {
  sessionToken: string;
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
  agentSessionId?: Id<"agentSessions">;
  visitorInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  createdAt: number;
  lastActivityAt: number;
}

export interface WebchatConfig {
  agentId: string;
  agentName: string;
  welcomeMessage: string;
  brandColor: string;
  position: "bottom-right" | "bottom-left";
  collectContactInfo: boolean;
  bubbleText: string;
  offlineMessage: string;
  avatar?: string;
  language: string;
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Create a new webchat session token
 */
export const createWebchatSession = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    visitorInfo: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args): Promise<{ sessionToken: string }> => {
    // Generate a secure session token
    const sessionToken = `wc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Store session in database
    await ctx.db.insert("webchatSessions", {
      sessionToken,
      organizationId: args.organizationId,
      agentId: args.agentId,
      visitorInfo: args.visitorInfo,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    });

    return { sessionToken };
  },
});

/**
 * Get an existing webchat session by token
 */
export const getWebchatSession = internalQuery({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("webchatSessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) return null;

    // Check if session expired (24 hours of inactivity)
    const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;
    if (Date.now() - session.lastActivityAt > SESSION_EXPIRY_MS) {
      return null;
    }

    return session;
  },
});

/**
 * Update session activity timestamp
 */
export const updateSessionActivity = internalMutation({
  args: {
    sessionToken: v.string(),
    agentSessionId: v.optional(v.id("agentSessions")),
    visitorInfo: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("webchatSessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) return;

    const updates: Partial<typeof session> = {
      lastActivityAt: Date.now(),
    };

    if (args.agentSessionId) {
      updates.agentSessionId = args.agentSessionId;
    }

    if (args.visitorInfo) {
      updates.visitorInfo = {
        ...session.visitorInfo,
        ...args.visitorInfo,
      };
    }

    await ctx.db.patch(session._id, updates);
  },
});

// ============================================================================
// AGENT CONFIG
// ============================================================================

/**
 * Get webchat configuration for an agent
 */
export const getWebchatConfig = internalQuery({
  args: {
    agentId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<WebchatConfig | null> => {
    // Get the agent object
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "agent") {
      return null;
    }

    // Check for soft delete (field may not exist on type)
    const agentRecord = agent as typeof agent & { deletedAt?: number };
    if (agentRecord.deletedAt) {
      return null;
    }

    // Check if webchat channel is enabled
    const config = agent.customProperties as Record<string, unknown> | undefined;
    const channels = config?.channelBindings as Record<string, unknown> | undefined;
    const webchatConfig = channels?.webchat as Record<string, unknown> | undefined;

    if (!webchatConfig?.enabled) {
      return null;
    }

    // Get organization for branding defaults
    const org = await ctx.db.get(agent.organizationId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orgBranding = (org as any)?.customProperties as Record<string, unknown> | undefined;

    return {
      agentId: args.agentId,
      agentName: (config?.name as string) || agent.name || "AI Assistant",
      welcomeMessage:
        (webchatConfig.welcomeMessage as string) ||
        "Hallo! Wie können wir Ihnen helfen?",
      brandColor:
        (webchatConfig.brandColor as string) ||
        (orgBranding?.primaryColor as string) ||
        "#7c3aed",
      position: (webchatConfig.position as "bottom-right" | "bottom-left") || "bottom-right",
      collectContactInfo: (webchatConfig.collectContactInfo as boolean) ?? true,
      bubbleText: (webchatConfig.bubbleText as string) || "Chat",
      offlineMessage:
        (webchatConfig.offlineMessage as string) ||
        "Wir sind gerade nicht erreichbar. Bitte versuchen Sie es später erneut.",
      avatar: (config?.avatar as string) || undefined,
      language: (webchatConfig.language as string) || "de",
    };
  },
});

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Handle an incoming webchat message
 *
 * This is the main entry point for webchat messages.
 * It creates/resumes a session, routes through the agent pipeline,
 * and returns the AI response.
 */
export const handleWebchatMessage = internalAction({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    sessionToken: v.optional(v.string()),
    message: v.string(),
    visitorInfo: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
      })
    ),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    sessionToken: string;
    response?: string;
    agentName?: string;
    error?: string;
  }> => {
    try {
      let sessionToken = args.sessionToken;
      let existingSession = null;

      // Try to get existing session
      if (sessionToken) {
        existingSession = await ctx.runQuery(internal.api.v1.webchatApi.getWebchatSession, {
          sessionToken,
        });
      }

      // Create new session if needed
      if (!existingSession) {
        const result = await ctx.runMutation(internal.api.v1.webchatApi.createWebchatSession, {
          organizationId: args.organizationId,
          agentId: args.agentId,
          visitorInfo: args.visitorInfo,
        });
        sessionToken = result.sessionToken;
      } else {
        // Update existing session activity
        await ctx.runMutation(internal.api.v1.webchatApi.updateSessionActivity, {
          sessionToken: sessionToken!,
          visitorInfo: args.visitorInfo,
        });
      }

      // Get agent config for response
      const agentConfig = await ctx.runQuery(internal.api.v1.webchatApi.getWebchatConfig, {
        agentId: args.agentId,
      });

      if (!agentConfig) {
        return {
          success: false,
          sessionToken: sessionToken!,
          error: "Agent not found or webchat not enabled",
        };
      }

      // Route message through the agent execution pipeline
      // The sessionToken becomes the externalContactIdentifier for webchat channel
      const result = await ctx.runAction(api.ai.agentExecution.processInboundMessage, {
        organizationId: args.organizationId,
        channel: "webchat",
        externalContactIdentifier: sessionToken!,
        message: args.message,
        metadata: {
          agentId: args.agentId,
          visitorInfo: args.visitorInfo,
        },
      });

      // Update session with agent session ID if created
      if (result.sessionId) {
        await ctx.runMutation(internal.api.v1.webchatApi.updateSessionActivity, {
          sessionToken: sessionToken!,
          agentSessionId: result.sessionId as Id<"agentSessions">,
        });
      }

      return {
        success: result.status === "success",
        sessionToken: sessionToken!,
        response: result.message,
        agentName: agentConfig.agentName,
        error: result.status !== "success" ? result.message : undefined,
      };
    } catch (error) {
      console.error("[Webchat] Error handling message:", error);
      return {
        success: false,
        sessionToken: args.sessionToken || "",
        error: error instanceof Error ? error.message : "An error occurred",
      };
    }
  },
});

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Check rate limit for a webchat request
 * Returns true if request is allowed, false if rate limited
 */
export const checkRateLimit = internalQuery({
  args: {
    ipAddress: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<{ allowed: boolean; retryAfterMs?: number }> => {
    // Get organization tier for rate limit
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return { allowed: false };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tier = ((org as any).customProperties as Record<string, unknown>)?.tier as string || org.plan || "free";
    const rateLimit = tier === "free" ? 30 : 60; // requests per minute
    const windowMs = 60 * 1000;

    // Count recent requests from this IP
    const cutoff = Date.now() - windowMs;
    const recentRequests = await ctx.db
      .query("webchatRateLimits")
      .withIndex("by_ip_and_time", (q) =>
        q.eq("ipAddress", args.ipAddress).gt("timestamp", cutoff)
      )
      .collect();

    if (recentRequests.length >= rateLimit) {
      // Find the oldest request to calculate retry time
      const oldestRequest = recentRequests.reduce((min, r) =>
        r.timestamp < min.timestamp ? r : min
      );
      const retryAfterMs = oldestRequest.timestamp + windowMs - Date.now();
      return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    return { allowed: true };
  },
});

/**
 * Record a rate limit entry for an IP address
 */
export const recordRateLimitEntry = internalMutation({
  args: {
    ipAddress: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("webchatRateLimits", {
      ipAddress: args.ipAddress,
      organizationId: args.organizationId,
      timestamp: Date.now(),
    });

    // Cleanup old entries (older than 2 minutes)
    const cutoff = Date.now() - 2 * 60 * 1000;
    const oldEntries = await ctx.db
      .query("webchatRateLimits")
      .withIndex("by_ip_and_time", (q) =>
        q.eq("ipAddress", args.ipAddress).lt("timestamp", cutoff)
      )
      .collect();

    for (const entry of oldEntries) {
      await ctx.db.delete(entry._id);
    }
  },
});
