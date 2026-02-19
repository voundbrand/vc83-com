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
  _id?: string;
  name?: string;
  status?: string;
  subtype?: string;
  customProperties?: Record<string, unknown>;
}

export interface ActiveAgentRouteSelectors {
  channel?: string;
  providerId?: string;
  account?: string;
  team?: string;
  peer?: string;
  channelRef?: string;
}

interface ActiveAgentResolutionArgs {
  channel?: string;
  subtype?: string;
  routeSelectors?: ActiveAgentRouteSelectors;
}

interface AgentRoutePolicy {
  policyId?: string;
  priority: number;
  selectors: ActiveAgentRouteSelectors;
  policyIndex: number;
}

interface AgentRouteMatch<T extends ActiveAgentCandidate> {
  agent: T;
  policy: AgentRoutePolicy;
  specificity: number;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeRouteSelectors(
  value: unknown
): ActiveAgentRouteSelectors | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const selectors: ActiveAgentRouteSelectors = {
    channel: normalizeOptionalString(record.channel),
    providerId: normalizeOptionalString(record.providerId),
    account: normalizeOptionalString(record.account),
    team: normalizeOptionalString(record.team),
    peer: normalizeOptionalString(record.peer),
    channelRef: normalizeOptionalString(record.channelRef),
  };

  return Object.values(selectors).some((entry) => Boolean(entry))
    ? selectors
    : undefined;
}

function hasRouteSelectorValue(
  selectors: ActiveAgentRouteSelectors | undefined
): selectors is ActiveAgentRouteSelectors {
  return Boolean(
    selectors &&
      Object.values(selectors).some((entry) => typeof entry === "string" && entry.length > 0)
  );
}

function extractAgentRoutePolicies(
  customProperties: Record<string, unknown> | undefined
): AgentRoutePolicy[] {
  const rawPolicies =
    customProperties?.channelRoutePolicies ??
    customProperties?.routePolicies ??
    customProperties?.dispatchRoutes;

  if (!Array.isArray(rawPolicies)) {
    return [];
  }

  const policies: AgentRoutePolicy[] = [];

  for (let index = 0; index < rawPolicies.length; index += 1) {
    const rawPolicy = rawPolicies[index];
    if (!rawPolicy || typeof rawPolicy !== "object") {
      continue;
    }

    const policyRecord = rawPolicy as Record<string, unknown>;
    if (policyRecord.enabled === false) {
      continue;
    }

    const selectors = normalizeRouteSelectors({
      channel: policyRecord.channel,
      providerId: policyRecord.providerId,
      account:
        policyRecord.account ??
        policyRecord.accountId ??
        policyRecord.providerAccountId,
      team:
        policyRecord.team ??
        policyRecord.teamId ??
        policyRecord.providerTeamId ??
        policyRecord.slackTeamId,
      peer:
        policyRecord.peer ??
        policyRecord.peerId ??
        policyRecord.externalContactIdentifier ??
        policyRecord.providerPeerId ??
        policyRecord.slackUserId,
      channelRef:
        policyRecord.channelRef ??
        policyRecord.channelId ??
        policyRecord.providerChannelId ??
        policyRecord.slackChannelId,
    });
    if (!selectors) {
      continue;
    }

    const rawPriority = policyRecord.priority;
    const priority = typeof rawPriority === "number" && Number.isFinite(rawPriority)
      ? rawPriority
      : 100;

    policies.push({
      policyId: normalizeOptionalString(policyRecord.id) || `policy_${index}`,
      priority,
      selectors,
      policyIndex: index,
    });
  }

  return policies;
}

function policyMatchesSelectors(
  policySelectors: ActiveAgentRouteSelectors,
  selectors: ActiveAgentRouteSelectors
): boolean {
  const checks: Array<[string | undefined, string | undefined]> = [
    [policySelectors.channel, selectors.channel],
    [policySelectors.providerId, selectors.providerId],
    [policySelectors.account, selectors.account],
    [policySelectors.team, selectors.team],
    [policySelectors.peer, selectors.peer],
    [policySelectors.channelRef, selectors.channelRef],
  ];

  for (const [policyValue, selectorValue] of checks) {
    if (!policyValue) {
      continue;
    }
    if (!selectorValue || selectorValue !== policyValue) {
      return false;
    }
  }

  return true;
}

function countSelectorSpecificity(selectors: ActiveAgentRouteSelectors): number {
  return Object.values(selectors).filter((value) => Boolean(value)).length;
}

function resolveRoutePolicyMatch<T extends ActiveAgentCandidate>(
  candidates: T[],
  selectors: ActiveAgentRouteSelectors
): AgentRouteMatch<T> | null {
  const matches: Array<AgentRouteMatch<T>> = [];

  for (const candidate of candidates) {
    const policies = extractAgentRoutePolicies(candidate.customProperties);
    if (policies.length === 0) {
      continue;
    }

    const matchedPolicies = policies
      .filter((policy) => policyMatchesSelectors(policy.selectors, selectors))
      .sort((a, b) => {
        const specificityDelta =
          countSelectorSpecificity(b.selectors) - countSelectorSpecificity(a.selectors);
        if (specificityDelta !== 0) {
          return specificityDelta;
        }
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.policyIndex - b.policyIndex;
      });
    const bestPolicy = matchedPolicies[0];
    if (!bestPolicy) {
      continue;
    }

    matches.push({
      agent: candidate,
      policy: bestPolicy,
      specificity: countSelectorSpecificity(bestPolicy.selectors),
    });
  }

  if (matches.length === 0) {
    return null;
  }

  matches.sort((a, b) => {
    if (a.specificity !== b.specificity) {
      return b.specificity - a.specificity;
    }
    if (a.policy.priority !== b.policy.priority) {
      return a.policy.priority - b.policy.priority;
    }
    if (a.policy.policyIndex !== b.policy.policyIndex) {
      return a.policy.policyIndex - b.policy.policyIndex;
    }
    return String(a.agent._id || "").localeCompare(String(b.agent._id || ""));
  });

  return matches[0];
}

export function resolveActiveAgentForOrgCandidates<T extends ActiveAgentCandidate>(
  agents: T[],
  args: ActiveAgentResolutionArgs
): T | null {
  const activeAgents = agents
    .filter((agent) => agent.status === "active")
    .sort((a, b) => String(a._id || "").localeCompare(String(b._id || "")));

  let candidates = activeAgents;
  if (args.subtype) {
    candidates = activeAgents.filter((agent) => agent.subtype === args.subtype);
    if (candidates.length === 0) {
      // Do not route to a different subtype when callers explicitly request one.
      return null;
    }
  }

  const normalizedRouteSelectors = normalizeRouteSelectors(args.routeSelectors);
  if (hasRouteSelectorValue(normalizedRouteSelectors)) {
    const routeMatch = resolveRoutePolicyMatch(candidates, normalizedRouteSelectors);
    if (routeMatch) {
      return routeMatch.agent;
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

function readTemplateRole(
  customProperties: Record<string, unknown> | undefined
): string | null {
  const role = customProperties?.templateRole;
  if (typeof role !== "string") {
    return null;
  }
  const normalized = role.trim();
  return normalized.length > 0 ? normalized : null;
}

function isProtectedTemplateRecord(candidate: ActiveAgentCandidate): boolean {
  const props = candidate.customProperties as Record<string, unknown> | undefined;
  return candidate.status === "template" && props?.protected === true;
}

export function selectOnboardingTemplateAgent<T extends ActiveAgentCandidate>(
  agents: T[]
): T | null {
  const templates = agents
    .filter((candidate) => isProtectedTemplateRecord(candidate))
    .sort((a, b) => String(a._id || "").localeCompare(String(b._id || "")));

  const explicitOnboardingTemplate = templates.find((template) => {
    const props = template.customProperties as Record<string, unknown> | undefined;
    return readTemplateRole(props) === "platform_system_bot_template";
  });
  if (explicitOnboardingTemplate) {
    return explicitOnboardingTemplate;
  }

  const legacyQuinnTemplate = templates.find((template) =>
    typeof template.name === "string" && template.name.trim().toLowerCase() === "quinn"
  );
  if (legacyQuinnTemplate) {
    return legacyQuinnTemplate;
  }

  return templates[0] ?? null;
}

function filterProtectedTemplateAgents<T extends ActiveAgentCandidate>(
  agents: T[],
  args?: {
    templateLayer?: string;
    templatePlaybook?: string;
  }
): T[] {
  const layerFilter = typeof args?.templateLayer === "string"
    ? args.templateLayer.trim().toLowerCase()
    : "";
  const playbookFilter = typeof args?.templatePlaybook === "string"
    ? args.templatePlaybook.trim().toLowerCase()
    : "";

  return agents
    .filter((candidate) => isProtectedTemplateRecord(candidate))
    .filter((candidate) => {
      const props = candidate.customProperties as Record<string, unknown> | undefined;
      const templateLayer = typeof props?.templateLayer === "string"
        ? props.templateLayer.trim().toLowerCase()
        : "";
      const templatePlaybook = typeof props?.templatePlaybook === "string"
        ? props.templatePlaybook.trim().toLowerCase()
        : "";
      if (layerFilter && templateLayer !== layerFilter) {
        return false;
      }
      if (playbookFilter && templatePlaybook !== playbookFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
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
    routeSelectors: v.optional(v.object({
      channel: v.optional(v.string()),
      providerId: v.optional(v.string()),
      account: v.optional(v.string()),
      team: v.optional(v.string()),
      peer: v.optional(v.string()),
      channelRef: v.optional(v.string()),
    })),
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
      routeSelectors: args.routeSelectors,
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

    return selectOnboardingTemplateAgent(agents);
  },
});

/**
 * INTERNAL: List protected template agents for an organization, optionally
 * filtered by template layer/playbook tags.
 */
export const getProtectedTemplateAgents = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    templateLayer: v.optional(v.string()),
    templatePlaybook: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .collect();

    return filterProtectedTemplateAgents(agents, {
      templateLayer: args.templateLayer,
      templatePlaybook: args.templatePlaybook,
    });
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
