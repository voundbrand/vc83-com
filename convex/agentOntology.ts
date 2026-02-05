/**
 * AGENT ONTOLOGY
 *
 * Manages AI agents assigned to organizations.
 * Uses the universal ontology system (objects table) with type="org_agent".
 *
 * Agent Subtypes:
 * - "customer_support" - Handles customer inquiries
 * - "sales_assistant" - Qualifies leads and assists sales
 * - "booking_agent" - Manages appointments and reservations
 * - "general" - General purpose agent
 *
 * Status Workflow:
 * - "draft" - Being configured, not active
 * - "active" - Running and processing messages
 * - "paused" - Temporarily disabled
 * - "archived" - Deactivated
 *
 * Autonomy Levels:
 * - "supervised" - All actions require approval
 * - "autonomous" - Acts freely within guardrails
 * - "draft_only" - Generates responses but never sends them
 */

import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./rbacHelpers";

// ============================================================================
// AGENT QUERIES
// ============================================================================

/**
 * GET AGENTS
 * Returns all agents for an organization
 */
export const getAgents = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    let agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect();

    if (args.subtype) {
      agents = agents.filter((a) => a.subtype === args.subtype);
    }
    if (args.status) {
      agents = agents.filter((a) => a.status === args.status);
    }

    return agents;
  },
});

/**
 * GET AGENT
 * Get a single agent by ID
 */
export const getAgent = query({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      throw new Error("Agent not found");
    }

    return agent;
  },
});

/**
 * INTERNAL: Get agent by ID (no auth, for pipeline use)
 */
export const getAgentInternal = internalQuery({
  args: {
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      return null;
    }
    return agent;
  },
});

/**
 * INTERNAL: Get active agent for an organization
 * Used by the execution pipeline to find which agent handles inbound messages
 */
export const getActiveAgentForOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    channel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect();

    const activeAgents = agents.filter((a) => a.status === "active");

    if (args.channel) {
      // Find agent with this channel binding enabled
      const channelAgent = activeAgents.find((a) => {
        const props = a.customProperties as Record<string, unknown> | undefined;
        const bindings = props?.channelBindings as Array<{ channel: string; enabled: boolean }> | undefined;
        return bindings?.some((b) => b.channel === args.channel && b.enabled);
      });
      if (channelAgent) return channelAgent;
    }

    // Return first active agent as fallback
    return activeAgents[0] ?? null;
  },
});

// ============================================================================
// AGENT MUTATIONS
// ============================================================================

/**
 * CREATE AGENT
 * Create a new AI agent for an organization
 */
export const createAgent = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.string(),
    name: v.string(),
    displayName: v.optional(v.string()),
    // Identity & Personality
    personality: v.optional(v.string()),
    language: v.optional(v.string()),
    additionalLanguages: v.optional(v.array(v.string())),
    brandVoiceInstructions: v.optional(v.string()),
    // Knowledge
    systemPrompt: v.optional(v.string()),
    faqEntries: v.optional(v.array(v.object({
      q: v.string(),
      a: v.string(),
    }))),
    knowledgeBaseTags: v.optional(v.array(v.string())),
    // Tool Access
    enabledTools: v.optional(v.array(v.string())),
    disabledTools: v.optional(v.array(v.string())),
    // Autonomy & Guardrails
    autonomyLevel: v.union(
      v.literal("supervised"),
      v.literal("autonomous"),
      v.literal("draft_only")
    ),
    maxMessagesPerDay: v.optional(v.number()),
    maxCostPerDay: v.optional(v.number()),
    requireApprovalFor: v.optional(v.array(v.string())),
    blockedTopics: v.optional(v.array(v.string())),
    // Model Config
    modelProvider: v.optional(v.string()),
    modelId: v.optional(v.string()),
    temperature: v.optional(v.number()),
    maxTokens: v.optional(v.number()),
    // Channel Bindings
    channelBindings: v.optional(v.array(v.object({
      channel: v.string(),
      enabled: v.boolean(),
    }))),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const agentId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "org_agent",
      subtype: args.subtype,
      name: args.name,
      description: args.displayName || `${args.subtype} agent`,
      status: "draft",
      customProperties: {
        displayName: args.displayName || args.name,
        personality: args.personality,
        language: args.language || "en",
        additionalLanguages: args.additionalLanguages || [],
        brandVoiceInstructions: args.brandVoiceInstructions,
        systemPrompt: args.systemPrompt,
        faqEntries: args.faqEntries || [],
        knowledgeBaseTags: args.knowledgeBaseTags || [],
        enabledTools: args.enabledTools || [],
        disabledTools: args.disabledTools || [],
        autonomyLevel: args.autonomyLevel,
        maxMessagesPerDay: args.maxMessagesPerDay || 100,
        maxCostPerDay: args.maxCostPerDay || 5.0,
        requireApprovalFor: args.requireApprovalFor || [],
        blockedTopics: args.blockedTopics || [],
        modelProvider: args.modelProvider || "openrouter",
        modelId: args.modelId || "anthropic/claude-sonnet-4-20250514",
        temperature: args.temperature ?? 0.7,
        maxTokens: args.maxTokens || 4096,
        channelBindings: args.channelBindings || [],
        // Stats (populated at runtime)
        totalMessages: 0,
        totalCostUsd: 0,
      },
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Audit trail
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: agentId,
      actionType: "created",
      actionData: {
        subtype: args.subtype,
        autonomyLevel: args.autonomyLevel,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    return agentId;
  },
});

/**
 * UPDATE AGENT
 * Update an existing agent's configuration
 */
export const updateAgent = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
    updates: v.object({
      name: v.optional(v.string()),
      displayName: v.optional(v.string()),
      subtype: v.optional(v.string()),
      personality: v.optional(v.string()),
      language: v.optional(v.string()),
      additionalLanguages: v.optional(v.array(v.string())),
      brandVoiceInstructions: v.optional(v.string()),
      systemPrompt: v.optional(v.string()),
      faqEntries: v.optional(v.array(v.object({
        q: v.string(),
        a: v.string(),
      }))),
      knowledgeBaseTags: v.optional(v.array(v.string())),
      enabledTools: v.optional(v.array(v.string())),
      disabledTools: v.optional(v.array(v.string())),
      autonomyLevel: v.optional(v.union(
        v.literal("supervised"),
        v.literal("autonomous"),
        v.literal("draft_only")
      )),
      maxMessagesPerDay: v.optional(v.number()),
      maxCostPerDay: v.optional(v.number()),
      requireApprovalFor: v.optional(v.array(v.string())),
      blockedTopics: v.optional(v.array(v.string())),
      modelProvider: v.optional(v.string()),
      modelId: v.optional(v.string()),
      temperature: v.optional(v.number()),
      maxTokens: v.optional(v.number()),
      channelBindings: v.optional(v.array(v.object({
        channel: v.string(),
        enabled: v.boolean(),
      }))),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      throw new Error("Agent not found");
    }

    await ctx.db.patch(args.agentId, {
      name: args.updates.name || agent.name,
      subtype: args.updates.subtype || agent.subtype,
      customProperties: {
        ...agent.customProperties,
        ...args.updates,
      },
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: agent.organizationId,
      objectId: args.agentId,
      actionType: "updated",
      actionData: {
        updatedFields: Object.keys(args.updates),
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

/**
 * ACTIVATE AGENT
 * Set agent status to "active"
 */
export const activateAgent = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      throw new Error("Agent not found");
    }

    await ctx.db.patch(args.agentId, {
      status: "active",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: agent.organizationId,
      objectId: args.agentId,
      actionType: "activated",
      actionData: {},
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

/**
 * PAUSE AGENT
 * Set agent status to "paused"
 */
export const pauseAgent = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      throw new Error("Agent not found");
    }

    await ctx.db.patch(args.agentId, {
      status: "paused",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: agent.organizationId,
      objectId: args.agentId,
      actionType: "paused",
      actionData: {},
      performedBy: session.userId,
      performedAt: Date.now(),
    });
  },
});

/**
 * DELETE AGENT
 * Permanently delete an agent and associated links
 */
export const deleteAgent = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");

    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      throw new Error("Agent not found");
    }

    // Log deletion before deleting
    await ctx.db.insert("objectActions", {
      organizationId: agent.organizationId,
      objectId: args.agentId,
      actionType: "deleted",
      actionData: {
        agentName: agent.name,
        deletedBy: session.userId,
      },
      performedBy: session.userId,
      performedAt: Date.now(),
    });

    // Delete associated links
    const linksFrom = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.agentId))
      .collect();

    const linksTo = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.agentId))
      .collect();

    for (const link of [...linksFrom, ...linksTo]) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.agentId);
  },
});
