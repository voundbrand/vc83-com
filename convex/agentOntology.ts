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
import { SUBTYPE_DEFAULT_PROFILES } from "./ai/toolScoping";
import {
  normalizeChannelBindingsContract,
  webchatChannelBindingValidator,
  type ChannelBindingContractRecord,
} from "./webchatCustomizationContract";

function resolveChannelCandidates(channel: string): string[] {
  // Native guest should reuse webchat-enabled agents until dedicated config ships.
  return channel === "native_guest" ? ["native_guest", "webchat"] : [channel];
}

function hasEnabledChannelBinding(
  customProperties: Record<string, unknown> | undefined,
  channel: string
): boolean {
  const channelCandidates = resolveChannelCandidates(channel);
  const rawBindings = customProperties?.channelBindings;

  if (Array.isArray(rawBindings)) {
    return rawBindings.some((binding) => {
      if (!binding || typeof binding !== "object") {
        return false;
      }
      const bindingRecord = binding as Record<string, unknown>;
      return (
        typeof bindingRecord.channel === "string" &&
        channelCandidates.includes(bindingRecord.channel) &&
        bindingRecord.enabled === true
      );
    });
  }

  if (rawBindings && typeof rawBindings === "object") {
    const legacyBindings = rawBindings as Record<string, unknown>;
    return channelCandidates.some((candidate) => {
      const channelConfig = legacyBindings[candidate];
      return (
        !!channelConfig &&
        typeof channelConfig === "object" &&
        (channelConfig as Record<string, unknown>).enabled === true
      );
    });
  }

  return false;
}

interface ActiveAgentCandidate {
  status?: string;
  subtype?: string;
  customProperties?: Record<string, unknown>;
}

interface ActiveAgentResolutionArgs {
  channel?: string;
  subtype?: string;
}

export function resolveActiveAgentForOrgCandidates<T extends ActiveAgentCandidate>(
  agents: T[],
  args: ActiveAgentResolutionArgs
): T | null {
  const activeAgents = agents.filter((agent) => agent.status === "active");

  let candidates = activeAgents;
  if (args.subtype) {
    candidates = activeAgents.filter((agent) => agent.subtype === args.subtype);
    if (candidates.length === 0) {
      // Do not route to a different subtype when callers explicitly request one.
      return null;
    }
  }

  if (args.channel) {
    const requestedChannel = args.channel;
    const channelAgent = candidates.find((agent) => {
      const props = agent.customProperties as Record<string, unknown> | undefined;
      return hasEnabledChannelBinding(props, requestedChannel);
    });
    if (channelAgent) {
      return channelAgent;
    }
  }

  return candidates[0] ?? null;
}

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
    subtype: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect();
    return resolveActiveAgentForOrgCandidates(agents, {
      channel: args.channel,
      subtype: args.subtype,
    });
  },
});

// ============================================================================
// PROTECTION HELPERS
// ============================================================================

/**
 * Throws if the agent is a protected system agent.
 * Protected agents (e.g. Quinn template) cannot be modified via user mutations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function enforceNotProtected(agent: { customProperties?: Record<string, any> }) {
  const props = agent.customProperties as Record<string, unknown> | undefined;
  if (props?.protected) {
    throw new Error("Cannot modify protected system agent");
  }
}

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
    toolProfile: v.optional(v.string()),
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
    channelBindings: v.optional(v.array(webchatChannelBindingValidator)),
    // Escalation Policy (per-agent HITL configuration)
    escalationPolicy: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .first();

    if (!session) throw new Error("Invalid session");
    const normalizedChannelBindings = normalizeChannelBindingsContract(
      args.channelBindings as ChannelBindingContractRecord[] | undefined
    );

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
        toolProfile: args.toolProfile || SUBTYPE_DEFAULT_PROFILES[args.subtype] || "general",
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
        channelBindings: normalizedChannelBindings,
        // Escalation policy (per-agent HITL configuration)
        ...(args.escalationPolicy ? { escalationPolicy: args.escalationPolicy } : {}),
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
      toolProfile: v.optional(v.string()),
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
      channelBindings: v.optional(v.array(webchatChannelBindingValidator)),
      // Escalation Policy (per-agent HITL configuration)
      escalationPolicy: v.optional(v.any()),
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

    enforceNotProtected(agent);
    const normalizedUpdates = {
      ...args.updates,
      ...(args.updates.channelBindings
        ? {
            channelBindings: normalizeChannelBindingsContract(
              args.updates.channelBindings as ChannelBindingContractRecord[]
            ),
          }
        : {}),
    };

    await ctx.db.patch(args.agentId, {
      name: args.updates.name || agent.name,
      subtype: args.updates.subtype || agent.subtype,
      customProperties: {
        ...agent.customProperties,
        ...normalizedUpdates,
      },
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: agent.organizationId,
      objectId: args.agentId,
      actionType: "updated",
      actionData: {
        updatedFields: Object.keys(normalizedUpdates),
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

    enforceNotProtected(agent);

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

    enforceNotProtected(agent);

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

    enforceNotProtected(agent);

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

/**
 * INTERNAL: Get all active agents for an organization (for team tool roster)
 */
export const getAllActiveAgentsForOrg = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect();

    return agents.filter((a) => a.status === "active");
  },
});

// ============================================================================
// WORKER POOL QUERIES
// ============================================================================

/**
 * INTERNAL: Get the template agent for an organization (status="template", protected=true).
 * Used by the worker pool to clone new workers.
 */
export const getTemplateAgent = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect();

    return agents.find((a) => {
      const props = a.customProperties as Record<string, unknown> | undefined;
      return props?.protected === true && a.status === "template";
    }) ?? null;
  },
});

/**
 * INTERNAL: Get all active workers for an organization (agents cloned from a template).
 */
export const getActiveWorkers = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect();

    return agents.filter((a) => {
      const props = a.customProperties as Record<string, unknown> | undefined;
      return a.status === "active" && props?.templateAgentId !== undefined;
    });
  },
});
