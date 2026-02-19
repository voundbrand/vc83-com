/**
 * HUMAN-IN-THE-LOOP ESCALATION FRAMEWORK
 *
 * Detects when conversations should be escalated to a human, notifies the
 * right people (Telegram, Pushover, Email), and manages the takeover/resume flow.
 *
 * Escalation triggers:
 * - Pre-LLM: explicit human request patterns, blocked topic matches
 * - Post-LLM: uncertainty phrases (3+ per session), response loops
 * - Agent-initiated: agent calls escalate_to_human tool
 *
 * Lifecycle: pending → taken_over → resolved (or dismissed / timed_out)
 *
 * See: docs/platform/implementation_plans/P2_HUMAN_IN_THE_LOOP.md
 */

import { action, query, mutation, internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";
import type { Id } from "../_generated/dataModel";
import {
  interventionTemplateValidator,
  normalizeInterventionTemplateInput,
} from "./interventionTemplates";
import {
  buildHarnessContextEnvelope,
  normalizeHarnessContextEnvelope,
  type HarnessContextEnvelope,
} from "./harnessContextEnvelope";

const generatedApi: any = require("../_generated/api");

// ============================================================================
// CONSTANTS & DEFAULTS
// ============================================================================

const ESCALATION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const HIGH_URGENCY_RETRY_MS = 5 * 60 * 1000; // 5 minutes — re-notify if HIGH and no response

const DEFAULT_EXPLICIT_REQUEST_PATTERNS = [
  "talk to a human",
  "speak with someone",
  "speak to someone",
  "real person",
  "customer service",
  "connect me",
  "manager please",
  "i need help from a person",
  "let me talk to someone",
  "can i speak to a person",
  "i want a real person",
  "transfer me",
  "human agent",
  "live agent",
];

export const DEFAULT_UNCERTAINTY_PHRASES = [
  "i'm not sure",
  "i don't have that information",
  "i can't help with",
  "i don't know",
  "i'm unable to",
  "i cannot help with that",
  "i don't have access to",
  "that's outside my",
  "i'm not able to",
];

const DEFAULT_UNCERTAINTY_THRESHOLD = 3;
const DEFAULT_LOOP_SIMILARITY_THRESHOLD = 0.8;
const DEFAULT_TOOL_FAILURE_THRESHOLD = 3; // distinct tools disabled before escalation

const DEFAULT_HOLD_MESSAGE = "Let me connect you with my team. They'll be right with you.";

/** Negative-sentiment keyword groups for lightweight detection (no external API). */
const NEGATIVE_SENTIMENT_PHRASES = [
  "this is ridiculous", "terrible service", "worst experience",
  "waste of time", "absolutely useless", "so frustrated",
  "unacceptable", "i'm furious", "this is awful",
  "you're useless", "pathetic", "horrible",
  "i'm done with this", "never using again", "total disaster",
  "what a joke", "are you kidding", "this sucks",
];

const DEFAULT_SENTIMENT_WINDOW = 3; // messages
const DEFAULT_SENTIMENT_THRESHOLD = 2; // hits within window

async function buildEscalationHarnessContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    agentId: Id<"objects">;
    organizationId: Id<"organizations">;
    triggerType?: string;
    teamSession?: {
      handoffHistory?: Array<{
        fromAgentId: Id<"objects">;
        toAgentId: Id<"objects">;
        reason: string;
        summary: string;
        goal: string;
        contextSummary?: string;
        timestamp: number;
      }>;
    } | null;
    disabledTools?: string[] | null;
  },
): Promise<HarnessContextEnvelope> {
  const [organization, agent] = await Promise.all([
    ctx.db.get(args.organizationId),
    ctx.db.get(args.agentId),
  ]);

  const toolsUsed =
    args.triggerType === "tool_failure"
      ? (args.disabledTools || [])
      : [];

  return buildHarnessContextEnvelope({
    source: "escalation",
    organization: organization
      ? {
          _id: String(organization._id),
          slug: organization.slug,
          parentOrganizationId: organization.parentOrganizationId
            ? String(organization.parentOrganizationId)
            : undefined,
        }
      : null,
    agentSubtype: agent?.subtype,
    toolsUsed,
    teamSession: args.teamSession
      ? {
          handoffHistory: (args.teamSession.handoffHistory || []).map((entry) => ({
            fromAgentId: String(entry.fromAgentId),
            toAgentId: String(entry.toAgentId),
            reason: entry.reason,
            summary: entry.summary,
            goal: entry.goal,
            contextSummary: entry.contextSummary,
            timestamp: entry.timestamp,
          })),
        }
      : undefined,
  });
}

function readEscalationHarnessContext(value: unknown): HarnessContextEnvelope | undefined {
  return normalizeHarnessContextEnvelope(value) || undefined;
}

// ============================================================================
// ESCALATION POLICY — configurable per agent (stored in customProperties)
// ============================================================================

/**
 * Per-agent escalation policy. All fields optional — missing values use defaults.
 * Set on agent via agentOntology.updateAgent({ updates: { escalationPolicy: {...} } }).
 */
export interface EscalationPolicy {
  triggers?: {
    explicitRequest?: { enabled?: boolean; urgency?: "low" | "normal" | "high"; patterns?: string[] };
    negativeSentiment?: { enabled?: boolean; urgency?: "low" | "normal" | "high"; threshold?: number; windowMessages?: number };
    responseLoop?: { enabled?: boolean; urgency?: "low" | "normal" | "high"; similarityThreshold?: number };
    blockedTopic?: { enabled?: boolean; urgency?: "low" | "normal" | "high" };
    uncertainty?: { enabled?: boolean; urgency?: "low" | "normal" | "high"; phrases?: string[]; maxOccurrences?: number };
    toolFailures?: { enabled?: boolean; urgency?: "low" | "normal" | "high"; threshold?: number };
  };
  holdMessage?: string;
  resumeMessage?: string;
}

export type ToolApprovalAutonomyLevel =
  | "supervised"
  | "autonomous"
  | "draft_only";

/**
 * Shared tool-approval decision helper used by chat + agent runtimes.
 */
export function shouldRequireToolApproval(args: {
  autonomyLevel: ToolApprovalAutonomyLevel;
  toolName: string;
  requireApprovalFor?: string[];
}): boolean {
  if (args.autonomyLevel === "supervised") {
    return true;
  }

  if (args.autonomyLevel === "draft_only") {
    return false;
  }

  return args.requireApprovalFor?.includes(args.toolName) ?? false;
}

/** Merge agent's policy with hardcoded defaults. */
function resolvePolicy(agentPolicy?: EscalationPolicy): Required<Pick<EscalationPolicy, "triggers" | "holdMessage" | "resumeMessage">> & { triggers: NonNullable<EscalationPolicy["triggers"]> } {
  const t = agentPolicy?.triggers ?? {};
  return {
    triggers: {
      explicitRequest: { enabled: true, urgency: "normal", patterns: DEFAULT_EXPLICIT_REQUEST_PATTERNS, ...t.explicitRequest },
      negativeSentiment: { enabled: true, urgency: "high", threshold: DEFAULT_SENTIMENT_THRESHOLD, windowMessages: DEFAULT_SENTIMENT_WINDOW, ...t.negativeSentiment },
      responseLoop: { enabled: true, urgency: "normal", similarityThreshold: DEFAULT_LOOP_SIMILARITY_THRESHOLD, ...t.responseLoop },
      blockedTopic: { enabled: true, urgency: "normal", ...t.blockedTopic },
      uncertainty: { enabled: true, urgency: "low", phrases: DEFAULT_UNCERTAINTY_PHRASES, maxOccurrences: DEFAULT_UNCERTAINTY_THRESHOLD, ...t.uncertainty },
      toolFailures: { enabled: true, urgency: "high", threshold: DEFAULT_TOOL_FAILURE_THRESHOLD, ...t.toolFailures },
    },
    holdMessage: agentPolicy?.holdMessage ?? DEFAULT_HOLD_MESSAGE,
    resumeMessage: agentPolicy?.resumeMessage ?? "I'm back! My team took care of that. How else can I help?",
  };
}

// Keep old export name for backward compat with agentExecution.ts
export const UNCERTAINTY_PHRASES = DEFAULT_UNCERTAINTY_PHRASES;

// ============================================================================
// PURE DETECTION FUNCTIONS (called from agentExecution.ts)
// ============================================================================

export interface EscalationTrigger {
  reason: string;
  urgency: "low" | "normal" | "high";
  triggerType: string;
}

interface AgentConfig {
  blockedTopics?: string[];
  escalationPolicy?: EscalationPolicy;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Pre-LLM escalation check — runs before the LLM call.
 * Checks: explicit human request patterns, blocked topics, negative sentiment.
 * Respects per-agent escalation policy (falls back to defaults).
 */
export function checkPreLLMEscalation(
  message: string,
  config: AgentConfig,
  recentUserMessages?: string[],
): EscalationTrigger | null {
  const policy = resolvePolicy(config.escalationPolicy);
  const msgLower = message.toLowerCase();

  // 1. Explicit human request patterns (cheapest check)
  const explicitCfg = policy.triggers.explicitRequest!;
  if (explicitCfg.enabled !== false) {
    const patterns = explicitCfg.patterns ?? DEFAULT_EXPLICIT_REQUEST_PATTERNS;
    for (const pattern of patterns) {
      if (msgLower.includes(pattern.toLowerCase())) {
        return {
          reason: "Customer requested to speak with a human",
          urgency: explicitCfg.urgency ?? "normal",
          triggerType: "explicit_request",
        };
      }
    }
  }

  // 2. Blocked topics
  const blockedCfg = policy.triggers.blockedTopic!;
  if (blockedCfg.enabled !== false && config.blockedTopics?.length) {
    for (const topic of config.blockedTopics) {
      if (msgLower.includes(topic.toLowerCase())) {
        return {
          reason: `Restricted topic detected: ${topic}`,
          urgency: blockedCfg.urgency ?? "normal",
          triggerType: "blocked_topic",
        };
      }
    }
  }

  // 3. Negative sentiment (keyword-based, sliding window)
  const sentimentCfg = policy.triggers.negativeSentiment!;
  if (sentimentCfg.enabled !== false) {
    const window = sentimentCfg.windowMessages ?? DEFAULT_SENTIMENT_WINDOW;
    const threshold = sentimentCfg.threshold ?? DEFAULT_SENTIMENT_THRESHOLD;
    const messagesToCheck = [...(recentUserMessages ?? []), message].slice(-window);

    let hits = 0;
    for (const msg of messagesToCheck) {
      const lower = msg.toLowerCase();
      if (NEGATIVE_SENTIMENT_PHRASES.some((p) => lower.includes(p))) {
        hits++;
      }
    }
    if (hits >= threshold) {
      return {
        reason: `Negative customer sentiment detected (${hits} signals in last ${messagesToCheck.length} messages)`,
        urgency: sentimentCfg.urgency ?? "high",
        triggerType: "negative_sentiment",
      };
    }
  }

  return null;
}

/**
 * Session-level counters for post-LLM escalation checks.
 * Passed in and returned so agentExecution can persist them.
 */
export interface EscalationCounters {
  uncertaintyCount: number;
  recentResponses: string[]; // last 2 assistant responses for loop detection
}

export interface PostEscalationResult {
  shouldEscalate: boolean;
  reason: string;
  urgency: "low" | "normal" | "high";
  triggerType: string;
  updatedCounters: EscalationCounters;
}

/**
 * Post-LLM escalation check — runs after the LLM generates a response.
 * Checks: uncertainty phrases, response loops.
 * Respects per-agent escalation policy.
 */
export function checkPostLLMEscalation(
  assistantContent: string,
  counters: EscalationCounters,
  agentPolicy?: EscalationPolicy,
): PostEscalationResult {
  const policy = resolvePolicy(agentPolicy);
  const contentLower = assistantContent.toLowerCase();
  const updated = { ...counters };

  // 1. Uncertainty phrases
  const uncertCfg = policy.triggers.uncertainty!;
  if (uncertCfg.enabled !== false) {
    const phrases = uncertCfg.phrases ?? DEFAULT_UNCERTAINTY_PHRASES;
    const maxOccurrences = uncertCfg.maxOccurrences ?? DEFAULT_UNCERTAINTY_THRESHOLD;

    let hasUncertainty = false;
    for (const phrase of phrases) {
      if (contentLower.includes(phrase)) {
        hasUncertainty = true;
        break;
      }
    }

    if (hasUncertainty) {
      updated.uncertaintyCount = (updated.uncertaintyCount || 0) + 1;
    }

    if (updated.uncertaintyCount >= maxOccurrences) {
      return {
        shouldEscalate: true,
        reason: `Agent expressed uncertainty ${updated.uncertaintyCount} times in this session`,
        urgency: uncertCfg.urgency ?? "low",
        triggerType: "uncertainty",
        updatedCounters: updated,
      };
    }
  }

  // 2. Response loop detection
  const loopCfg = policy.triggers.responseLoop!;
  if (loopCfg.enabled !== false) {
    updated.recentResponses = [...(counters.recentResponses || []), assistantContent].slice(-2);

    if (updated.recentResponses.length >= 2) {
      const [prev, curr] = updated.recentResponses;
      const similarity = jaccardSimilarity(prev, curr);
      const threshold = loopCfg.similarityThreshold ?? DEFAULT_LOOP_SIMILARITY_THRESHOLD;
      if (similarity >= threshold) {
        return {
          shouldEscalate: true,
          reason: "Agent appears stuck in a response loop",
          urgency: loopCfg.urgency ?? "normal",
          triggerType: "response_loop",
          updatedCounters: updated,
        };
      }
    }
  } else {
    // Still maintain the sliding window even if loop detection is off
    updated.recentResponses = [...(counters.recentResponses || []), assistantContent].slice(-2);
  }

  return {
    shouldEscalate: false,
    reason: "",
    urgency: "low",
    triggerType: "",
    updatedCounters: updated,
  };
}

/**
 * Tool failure escalation check — called from agentExecution when entering degraded mode.
 * Returns trigger if threshold met (per-agent configurable).
 */
export function checkToolFailureEscalation(
  disabledToolCount: number,
  agentPolicy?: EscalationPolicy,
): EscalationTrigger | null {
  const policy = resolvePolicy(agentPolicy);
  const tfCfg = policy.triggers.toolFailures!;
  if (tfCfg.enabled === false) return null;

  const threshold = tfCfg.threshold ?? DEFAULT_TOOL_FAILURE_THRESHOLD;
  if (disabledToolCount >= threshold) {
    return {
      reason: `${disabledToolCount} tools disabled due to repeated failures — agent capabilities severely limited`,
      urgency: tfCfg.urgency ?? "high",
      triggerType: "tool_failure",
    };
  }
  return null;
}

/**
 * Jaccard similarity on word tokens — measures overlap between two text strings.
 */
function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }
  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

async function nextTurnEdgeOrdinal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  turnId: Id<"agentTurns">
): Promise<number> {
  const latest = await ctx.db
    .query("executionEdges")
    .withIndex("by_turn_ordinal", (q: any) => q.eq("turnId", turnId))
    .order("desc")
    .first();
  return ((latest?.edgeOrdinal as number | undefined) ?? 0) + 1;
}

async function findLatestTurnForSessionAgent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  sessionId: Id<"agentSessions">,
  agentId: Id<"objects">
): Promise<{ _id: Id<"agentTurns">; state: string; organizationId: Id<"organizations"> } | null> {
  const runningTurns = await ctx.db
    .query("agentTurns")
    .withIndex("by_session_agent_state", (q: any) =>
      q
        .eq("sessionId", sessionId)
        .eq("agentId", agentId)
        .eq("state", "running")
    )
    .collect();

  if (runningTurns.length > 0) {
    const latestRunning = runningTurns.sort((a: any, b: any) => b.createdAt - a.createdAt)[0];
    return latestRunning ?? null;
  }

  const sessionTurns = await ctx.db
    .query("agentTurns")
    .withIndex("by_session_created", (q: any) => q.eq("sessionId", sessionId))
    .collect();
  const latestForAgent = sessionTurns
    .filter((turn: any) => turn.agentId === agentId)
    .sort((a: any, b: any) => b.createdAt - a.createdAt)[0];
  return latestForAgent ?? null;
}

async function appendEscalationTurnEdge(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    sessionId: Id<"agentSessions">;
    agentId: Id<"objects">;
    transition: "escalation_started" | "escalation_resolved";
    metadata?: unknown;
  }
): Promise<void> {
  const turn = await findLatestTurnForSessionAgent(ctx, args.sessionId, args.agentId);
  if (!turn) {
    return;
  }

  const now = Date.now();
  const edgeOrdinal = await nextTurnEdgeOrdinal(ctx, turn._id);
  await ctx.db.insert("executionEdges", {
    organizationId: turn.organizationId,
    sessionId: args.sessionId,
    agentId: args.agentId,
    turnId: turn._id,
    transition: args.transition,
    fromState: turn.state,
    toState: turn.state,
    edgeOrdinal,
    metadata: args.metadata,
    occurredAt: now,
    createdAt: now,
  });
}

// ============================================================================
// CONVEX MUTATIONS — CRUD
// ============================================================================

/**
 * Create an escalation on a session.
 */
export const createEscalation = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
    reason: v.string(),
    urgency: v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
    triggerType: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const session = await ctx.db.get(args.sessionId);
    const harnessContext = await buildEscalationHarnessContext(ctx, {
      agentId: args.agentId,
      organizationId: args.organizationId,
      triggerType: args.triggerType,
      teamSession: session?.teamSession,
      disabledTools: session?.errorState?.disabledTools,
    });

    // Patch session with escalation state
    await ctx.db.patch(args.sessionId, {
      escalationState: {
        status: "pending" as const,
        reason: args.reason,
        urgency: args.urgency,
        triggerType: args.triggerType,
        escalatedAt: now,
      },
    });

    await (ctx as any).runMutation(
      generatedApi.internal.ai.agentLifecycle.recordLifecycleTransition,
      {
        sessionId: args.sessionId,
        fromState: "paused",
        toState: "escalated",
        actor: "system",
        actorId: "escalation_framework",
        checkpoint: "escalation_created",
        reason: args.triggerType,
        metadata: {
          urgency: args.urgency,
          triggerType: args.triggerType,
          reason: args.reason,
          harnessContext,
        },
      },
    );

    try {
      await appendEscalationTurnEdge(ctx, {
        sessionId: args.sessionId,
        agentId: args.agentId,
        transition: "escalation_started",
        metadata: {
          reason: args.reason,
          urgency: args.urgency,
          triggerType: args.triggerType,
          harnessContext,
        },
      });
    } catch (error) {
      console.warn("[Escalation] Failed to append escalation_started turn edge", error);
    }

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.agentId,
      actionType: "escalation_created",
      actionData: {
        sessionId: args.sessionId,
        reason: args.reason,
        urgency: args.urgency,
        triggerType: args.triggerType,
        harnessContext,
      },
      performedAt: now,
    });
  },
});

/**
 * Update escalation with Telegram notification details.
 */
export const updateEscalationTelegram = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    telegramMessageId: v.number(),
    telegramChatId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session?.escalationState) return;

    await ctx.db.patch(args.sessionId, {
      escalationState: {
        ...session.escalationState,
        telegramMessageId: args.telegramMessageId,
        telegramChatId: args.telegramChatId,
      },
    });
  },
});

/**
 * Take over a session (UI-triggered, requires auth).
 */
export const takeOverEscalation = mutation({
  args: {
    sessionId: v.string(),
    agentSessionId: v.id("agentSessions"),
    interventionTemplate: v.optional(interventionTemplateValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx, args.sessionId);

    const session = await ctx.db.get(args.agentSessionId);
    if (!session?.escalationState) throw new Error("No active escalation on this session");
    const interventionTemplate = normalizeInterventionTemplateInput(
      args.interventionTemplate
    );
    const harnessContext = await buildEscalationHarnessContext(ctx, {
      agentId: session.agentId,
      organizationId: session.organizationId,
      triggerType: session.escalationState.triggerType,
      teamSession: session.teamSession,
      disabledTools: session.errorState?.disabledTools,
    });
    const transitionReason =
      interventionTemplate?.note
      || interventionTemplate?.templateId
      || "operator_takeover";

    const now = Date.now();

    await ctx.db.patch(args.agentSessionId, {
      status: "handed_off",
      handedOffTo: user.userId,
      escalationState: {
        ...session.escalationState,
        status: "taken_over" as const,
        respondedAt: now,
        respondedBy: user.userId,
      },
    });

    await (ctx as any).runMutation(
      generatedApi.internal.ai.agentLifecycle.recordLifecycleTransition,
      {
        sessionId: args.agentSessionId,
        fromState: "escalated",
        toState: "takeover",
        actor: "operator",
        actorId: String(user.userId),
        checkpoint: "escalation_taken_over",
        reason: transitionReason,
      },
    );

    try {
      await appendEscalationTurnEdge(ctx, {
        sessionId: args.agentSessionId,
        agentId: session.agentId,
        transition: "escalation_started",
        metadata: {
          event: "taken_over",
          takenOverBy: user.userId,
        },
      });
    } catch (error) {
      console.warn("[Escalation] Failed to append taken_over turn edge", error);
    }

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: session.agentId,
      actionType: "escalation_taken_over",
      actionData: {
        sessionId: args.agentSessionId,
        takenOverBy: user.userId,
        reason: transitionReason,
        resumeCheckpoint: "escalation_taken_over",
        interventionTemplateId: interventionTemplate?.templateId,
        harnessContext,
        ...(interventionTemplate ? { interventionTemplate } : {}),
      },
      performedAt: now,
    });
  },
});

/**
 * Dismiss an escalation (false positive, agent continues).
 */
export const dismissEscalation = mutation({
  args: {
    sessionId: v.string(),
    agentSessionId: v.id("agentSessions"),
    interventionTemplate: v.optional(interventionTemplateValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx, args.sessionId);

    const session = await ctx.db.get(args.agentSessionId);
    if (!session?.escalationState) throw new Error("No active escalation on this session");
    const interventionTemplate = normalizeInterventionTemplateInput(
      args.interventionTemplate
    );
    const harnessContext = await buildEscalationHarnessContext(ctx, {
      agentId: session.agentId,
      organizationId: session.organizationId,
      triggerType: session.escalationState.triggerType,
      teamSession: session.teamSession,
      disabledTools: session.errorState?.disabledTools,
    });
    const transitionReason =
      interventionTemplate?.note
      || interventionTemplate?.templateId
      || "operator_dismissed";

    const now = Date.now();

    await ctx.db.patch(args.agentSessionId, {
      escalationState: {
        ...session.escalationState,
        status: "dismissed" as const,
        respondedAt: now,
        respondedBy: user.userId,
      },
    });

    await (ctx as any).runMutation(
      generatedApi.internal.ai.agentLifecycle.recordLifecycleTransition,
      {
        sessionId: args.agentSessionId,
        fromState: "escalated",
        toState: "resolved",
        actor: "operator",
        actorId: String(user.userId),
        checkpoint: "escalation_dismissed",
        reason: transitionReason,
      },
    );
    await (ctx as any).runMutation(
      generatedApi.internal.ai.agentLifecycle.recordLifecycleTransition,
      {
        sessionId: args.agentSessionId,
        fromState: "resolved",
        toState: "active",
        actor: "system",
        actorId: "escalation_framework",
        checkpoint: "agent_resumed",
        reason: "agent_resumed_after_dismissal",
      },
    );

    try {
      await appendEscalationTurnEdge(ctx, {
        sessionId: args.agentSessionId,
        agentId: session.agentId,
        transition: "escalation_resolved",
        metadata: {
          event: "dismissed",
          dismissedBy: user.userId,
        },
      });
    } catch (error) {
      console.warn("[Escalation] Failed to append dismissed turn edge", error);
    }

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: session.agentId,
      actionType: "escalation_dismissed",
      actionData: {
        sessionId: args.agentSessionId,
        dismissedBy: user.userId,
        reason: transitionReason,
        resumeCheckpoint: "agent_resumed",
        interventionTemplateId: interventionTemplate?.templateId,
        harnessContext,
        ...(interventionTemplate ? { interventionTemplate } : {}),
      },
      performedAt: now,
    });
  },
});

/**
 * Resolve an escalation — human is done, agent can resume.
 */
export const resolveEscalation = mutation({
  args: {
    sessionId: v.string(),
    agentSessionId: v.id("agentSessions"),
    resolutionSummary: v.optional(v.string()),
    interventionTemplate: v.optional(interventionTemplateValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx, args.sessionId);

    const session = await ctx.db.get(args.agentSessionId);
    if (!session?.escalationState) throw new Error("No active escalation on this session");
    const interventionTemplate = normalizeInterventionTemplateInput(
      args.interventionTemplate
    );
    const harnessContext = await buildEscalationHarnessContext(ctx, {
      agentId: session.agentId,
      organizationId: session.organizationId,
      triggerType: session.escalationState.triggerType,
      teamSession: session.teamSession,
      disabledTools: session.errorState?.disabledTools,
    });
    const transitionReason =
      interventionTemplate?.note
      || args.resolutionSummary
      || interventionTemplate?.templateId
      || "operator_resolved";

    const now = Date.now();

    await ctx.db.patch(args.agentSessionId, {
      status: "active",
      handedOffTo: undefined,
      escalationState: {
        ...session.escalationState,
        status: "resolved" as const,
        respondedAt: now,
        respondedBy: user.userId,
        resolutionSummary: args.resolutionSummary,
      },
    });

    await (ctx as any).runMutation(
      generatedApi.internal.ai.agentLifecycle.recordLifecycleTransition,
      {
        sessionId: args.agentSessionId,
        fromState: "takeover",
        toState: "resolved",
        actor: "operator",
        actorId: String(user.userId),
        checkpoint: "escalation_resolved",
        reason: transitionReason,
      },
    );
    await (ctx as any).runMutation(
      generatedApi.internal.ai.agentLifecycle.recordLifecycleTransition,
      {
        sessionId: args.agentSessionId,
        fromState: "resolved",
        toState: "active",
        actor: "system",
        actorId: "escalation_framework",
        checkpoint: "agent_resumed",
        reason: "agent_resumed_after_resolution",
      },
    );

    try {
      await appendEscalationTurnEdge(ctx, {
        sessionId: args.agentSessionId,
        agentId: session.agentId,
        transition: "escalation_resolved",
        metadata: {
          event: "resolved",
          resolvedBy: user.userId,
          resolutionSummary: args.resolutionSummary,
        },
      });
    } catch (error) {
      console.warn("[Escalation] Failed to append resolved turn edge", error);
    }

    // Audit log
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: session.agentId,
      actionType: "escalation_resolved",
      actionData: {
        sessionId: args.agentSessionId,
        resolvedBy: user.userId,
        resolutionSummary: args.resolutionSummary,
        reason: transitionReason,
        resumeCheckpoint: "agent_resumed",
        interventionTemplateId: interventionTemplate?.templateId,
        harnessContext,
        ...(interventionTemplate ? { interventionTemplate } : {}),
      },
      performedAt: now,
    });
  },
});

// ============================================================================
// CONVEX ACTIONS — NOTIFICATIONS
// ============================================================================

/**
 * Send escalation notification via Telegram with inline buttons.
 * Looks up org's Telegram mapping to find owner's chat ID.
 */
export const notifyEscalationTelegram = internalAction({
  args: {
    sessionId: v.id("agentSessions"),
    organizationId: v.id("organizations"),
    agentName: v.string(),
    reason: v.string(),
    urgency: v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
    contactIdentifier: v.string(),
    channel: v.string(),
    lastMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return { error: "No Telegram bot token configured" };

    // Look up org's Telegram mapping
    const mapping = await (ctx as any).runQuery(
      generatedApi.internal.ai.escalation.getOrgTelegramMapping,
      { organizationId: args.organizationId }
    );

    if (!mapping?.telegramChatId) return { error: "No Telegram mapping for org" };

    // Format urgency badge
    const urgencyBadge = args.urgency === "high" ? "🔴 HIGH" : args.urgency === "normal" ? "🟡" : "🔵 LOW";
    const truncatedMessage = args.lastMessage.length > 100
      ? args.lastMessage.slice(0, 100) + "..."
      : args.lastMessage;

    const text = [
      `🆘 ${urgencyBadge} Escalation — *${args.agentName}*`,
      ``,
      `*Customer:* ${args.contactIdentifier} (${args.channel})`,
      `*Reason:* ${args.reason}`,
      `*Last message:* "${truncatedMessage}"`,
    ].join("\n");

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: mapping.telegramChatId,
        text,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Take Over", callback_data: `esc_takeover:${args.sessionId}` },
              { text: "Resume Agent", callback_data: `esc_resume:${args.sessionId}` },
            ],
          ],
        },
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await response.json() as any;

    // Store Telegram message ID for later button updates
    if (data.ok && data.result?.message_id) {
      await (ctx as any).runMutation(generatedApi.internal.ai.escalation.updateEscalationTelegram, {
        sessionId: args.sessionId,
        telegramMessageId: data.result.message_id,
        telegramChatId: mapping.telegramChatId,
      });
    }

    // Also notify team group if configured (info-only, no inline buttons)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappingAny = mapping as any;
    if (mappingAny.teamGroupEnabled && mappingAny.teamGroupChatId) {
      const teamText = [
        `🆘 ${urgencyBadge} Escalation — *${args.agentName}*`,
        ``,
        `*Customer:* ${args.contactIdentifier} (${args.channel})`,
        `*Reason:* ${args.reason}`,
        `*Last message:* "${truncatedMessage}"`,
        ``,
        `_A team member needs to take over this conversation._`,
      ].join("\n");

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: mappingAny.teamGroupChatId,
          text: teamText,
          parse_mode: "Markdown",
        }),
      });
    }

    return { success: true };
  },
});

/**
 * Send escalation notification via Pushover (fallback for orgs without Telegram).
 */
export const notifyEscalationPushover = internalAction({
  args: {
    organizationId: v.id("organizations"),
    agentName: v.string(),
    reason: v.string(),
    urgency: v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
    contactIdentifier: v.string(),
    channel: v.string(),
  },
  handler: async (ctx, args) => {
    const settings = await (ctx as any).runQuery(
      generatedApi.internal.integrations.pushover.getOrgPushoverSettings,
      { organizationId: args.organizationId }
    );

    if (!settings?.enabled) return { skipped: "Pushover not configured" };

    // Map urgency to Pushover priority
    const priorityMap: Record<string, number> = { low: 0, normal: 1, high: 2 };
    const priority = priorityMap[args.urgency] ?? 0;

    await (ctx as any).runAction(generatedApi.internal.integrations.pushover.sendPushoverNotification, {
      organizationId: args.organizationId,
      title: `🆘 Escalation — ${args.agentName}`,
      message: `${args.reason}\nCustomer: ${args.contactIdentifier} (${args.channel})`,
      priority,
      ...(priority === 2 ? { retry: 60, expire: 300 } : {}),
    });

    return { success: true };
  },
});

/**
 * Send escalation notification via email.
 */
export const notifyEscalationEmail = internalAction({
  args: {
    organizationId: v.id("organizations"),
    agentName: v.string(),
    reason: v.string(),
    urgency: v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
    contactIdentifier: v.string(),
    channel: v.string(),
    lastMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // Look up org owner's email
    const ownerEmail = await (ctx as any).runQuery(
      generatedApi.internal.ai.escalation.getOrgOwnerEmail,
      { organizationId: args.organizationId }
    );

    if (!ownerEmail) return { error: "No owner email found" };

    await (ctx as any).runAction(generatedApi.internal.emailService.sendEscalationEmail, {
      to: ownerEmail,
      agentName: args.agentName,
      reason: args.reason,
      urgency: args.urgency,
      contactIdentifier: args.contactIdentifier,
      channel: args.channel,
      lastMessage: args.lastMessage,
    });

    return { success: true };
  },
});

// ============================================================================
// TELEGRAM CALLBACK HANDLER
// ============================================================================

/**
 * Handle Telegram inline button taps for escalation
 * (esc_takeover / esc_resume / esc_dismiss).
 * Called from the Telegram webhook in http.ts.
 */

const providerQuickActionValidator = v.union(
  v.literal("takeover"),
  v.literal("resume"),
);

const providerQuickActionSourceValidator = v.union(
  v.literal("telegram"),
  v.literal("slack"),
  v.literal("webchat"),
);

type ProviderQuickAction = "takeover" | "resume";
type ProviderQuickActionSource = "telegram" | "slack" | "webchat";

function resolveProviderQuickActionActor(args: {
  source: ProviderQuickActionSource;
  actorExternalId?: string;
}): string {
  const actorExternalId =
    typeof args.actorExternalId === "string"
      ? args.actorExternalId.trim()
      : "";
  if (actorExternalId.length > 0) {
    return actorExternalId;
  }
  return `${args.source}_quick_action`;
}

function resolveProviderQuickActionReason(args: {
  action: ProviderQuickAction;
  source: ProviderQuickActionSource;
  escalationStatus: "pending" | "taken_over" | "resolved" | "dismissed" | "timed_out";
  reason?: string;
}): string {
  if (typeof args.reason === "string" && args.reason.trim().length > 0) {
    return args.reason.trim();
  }

  if (args.action === "takeover") {
    return `${args.source}_takeover`;
  }

  if (args.escalationStatus === "pending") {
    return `${args.source}_dismissed`;
  }

  return `${args.source}_resumed`;
}

function resolveProviderResumeReason(args: {
  source: ProviderQuickActionSource;
  escalationStatus: "pending" | "taken_over" | "resolved" | "dismissed" | "timed_out";
}): string {
  if (args.escalationStatus === "pending") {
    return `agent_resumed_after_${args.source}_dismissal`;
  }
  return `agent_resumed_after_${args.source}_resolution`;
}

async function applyProviderQuickAction(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  sessionId: Id<"agentSessions">;
  action: ProviderQuickAction;
  source: ProviderQuickActionSource;
  actorExternalId?: string;
  actorLabel?: string;
  reason?: string;
  note?: string;
}) {
  const session = await args.ctx.db.get(args.sessionId);
  if (!session?.escalationState) {
    return { success: false, status: "noop_no_escalation" as const };
  }

  const escalationStatus = session.escalationState.status;
  const actorId = resolveProviderQuickActionActor({
    source: args.source,
    actorExternalId: args.actorExternalId,
  });
  const transitionReason = resolveProviderQuickActionReason({
    action: args.action,
    source: args.source,
    escalationStatus,
    reason: args.reason,
  });

  const now = Date.now();
  const harnessContext = await buildEscalationHarnessContext(args.ctx, {
    agentId: session.agentId,
    organizationId: session.organizationId,
    triggerType: session.escalationState.triggerType,
    teamSession: session.teamSession,
    disabledTools: session.errorState?.disabledTools,
  });

  if (args.action === "takeover") {
    if (escalationStatus === "taken_over" || session.status === "handed_off") {
      return { success: true, status: "noop_already_taken_over" as const };
    }

    if (escalationStatus !== "pending") {
      return { success: false, status: "invalid_takeover_state" as const };
    }

    await args.ctx.db.patch(args.sessionId, {
      status: "handed_off",
      escalationState: {
        ...session.escalationState,
        status: "taken_over" as const,
        respondedAt: now,
      },
    });

    await (args.ctx as any).runMutation(
      generatedApi.internal.ai.agentLifecycle.recordLifecycleTransition,
      {
        sessionId: args.sessionId,
        fromState: "escalated",
        toState: "takeover",
        actor: "operator",
        actorId,
        checkpoint: "escalation_taken_over",
        reason: transitionReason,
      },
    );

    await args.ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: session.agentId,
      actionType: "escalation_taken_over",
      actionData: {
        sessionId: args.sessionId,
        source: args.source,
        reason: transitionReason,
        actorExternalId: actorId,
        actorLabel: args.actorLabel,
        note: args.note,
        resumeCheckpoint: "escalation_taken_over",
        harnessContext,
      },
      performedAt: now,
    });

    return { success: true, status: "taken_over" as const };
  }

  if (escalationStatus === "pending") {
    await args.ctx.db.patch(args.sessionId, {
      escalationState: {
        ...session.escalationState,
        status: "dismissed" as const,
        respondedAt: now,
      },
    });

    await (args.ctx as any).runMutation(
      generatedApi.internal.ai.agentLifecycle.recordLifecycleTransition,
      {
        sessionId: args.sessionId,
        fromState: "escalated",
        toState: "resolved",
        actor: "operator",
        actorId,
        checkpoint: "escalation_dismissed",
        reason: transitionReason,
      },
    );
    await (args.ctx as any).runMutation(
      generatedApi.internal.ai.agentLifecycle.recordLifecycleTransition,
      {
        sessionId: args.sessionId,
        fromState: "resolved",
        toState: "active",
        actor: "system",
        actorId: `${args.source}_quick_action`,
        checkpoint: "agent_resumed",
        reason: resolveProviderResumeReason({
          source: args.source,
          escalationStatus,
        }),
      },
    );

    await args.ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: session.agentId,
      actionType: "escalation_dismissed",
      actionData: {
        sessionId: args.sessionId,
        source: args.source,
        reason: transitionReason,
        actorExternalId: actorId,
        actorLabel: args.actorLabel,
        note: args.note,
        resumeCheckpoint: "agent_resumed",
        harnessContext,
      },
      performedAt: now,
    });

    return { success: true, status: "resumed_after_dismissal" as const };
  }

  if (escalationStatus === "taken_over" || session.status === "handed_off") {
    await args.ctx.db.patch(args.sessionId, {
      status: "active",
      handedOffTo: undefined,
      escalationState: {
        ...session.escalationState,
        status: "resolved" as const,
        respondedAt: now,
        resolutionSummary: args.note,
      },
    });

    await (args.ctx as any).runMutation(
      generatedApi.internal.ai.agentLifecycle.recordLifecycleTransition,
      {
        sessionId: args.sessionId,
        fromState: "takeover",
        toState: "resolved",
        actor: "operator",
        actorId,
        checkpoint: "escalation_resolved",
        reason: transitionReason,
      },
    );
    await (args.ctx as any).runMutation(
      generatedApi.internal.ai.agentLifecycle.recordLifecycleTransition,
      {
        sessionId: args.sessionId,
        fromState: "resolved",
        toState: "active",
        actor: "system",
        actorId: `${args.source}_quick_action`,
        checkpoint: "agent_resumed",
        reason: resolveProviderResumeReason({
          source: args.source,
          escalationStatus,
        }),
      },
    );

    await args.ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: session.agentId,
      actionType: "escalation_resolved",
      actionData: {
        sessionId: args.sessionId,
        source: args.source,
        reason: transitionReason,
        actorExternalId: actorId,
        actorLabel: args.actorLabel,
        note: args.note,
        resolutionSummary: args.note,
        resumeCheckpoint: "agent_resumed",
        harnessContext,
      },
      performedAt: now,
    });

    return { success: true, status: "resumed_after_resolution" as const };
  }

  if (
    escalationStatus === "resolved" ||
    escalationStatus === "dismissed" ||
    escalationStatus === "timed_out"
  ) {
    return { success: true, status: "noop_already_resumed" as const };
  }

  return { success: false, status: "invalid_resume_state" as const };
}

export const handleProviderQuickActionInternal = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    action: providerQuickActionValidator,
    source: providerQuickActionSourceValidator,
    actorExternalId: v.optional(v.string()),
    actorLabel: v.optional(v.string()),
    reason: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return applyProviderQuickAction({
      ctx,
      sessionId: args.sessionId,
      action: args.action,
      source: args.source,
      actorExternalId: args.actorExternalId,
      actorLabel: args.actorLabel,
      reason: args.reason,
      note: args.note,
    });
  },
});

export const handleEscalationCallback = action({
  args: {
    callbackData: v.string(),
    telegramChatId: v.string(),
    callbackQueryId: v.string(),
    actorExternalId: v.optional(v.string()),
    actorLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const [actionType, rawSessionId] = args.callbackData.split(":");
    if (!rawSessionId) return { error: "Invalid callback data" };

    const sessionId = rawSessionId as Id<"agentSessions">;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (actionType === "esc_takeover") {
      await (ctx as any).runMutation(
        generatedApi.internal.ai.escalation.handleProviderQuickActionInternal,
        {
          sessionId,
          action: "takeover",
          source: "telegram",
          actorExternalId: args.actorExternalId,
          actorLabel: args.actorLabel,
          reason: "telegram_takeover",
        },
      );

      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: args.callbackQueryId,
            text: "You've taken over this conversation.",
          }),
        });
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: args.telegramChatId,
            text: "You've taken over the conversation. The customer's messages will now be routed to you.",
          }),
        });
      }
    } else if (actionType === "esc_resume" || actionType === "esc_dismiss") {
      const result = await (ctx as any).runMutation(
        generatedApi.internal.ai.escalation.handleProviderQuickActionInternal,
        {
          sessionId,
          action: "resume",
          source: "telegram",
          actorExternalId: args.actorExternalId,
          actorLabel: args.actorLabel,
          reason:
            actionType === "esc_dismiss"
              ? "telegram_dismissed"
              : "telegram_resumed",
        },
      ) as {
        success?: boolean;
        status?: string;
      };

      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: args.callbackQueryId,
            text:
              result?.status === "resumed_after_resolution"
                ? "Conversation resolved. Agent resumed."
                : "Escalation dismissed. Agent resumed.",
          }),
        });
      }
    }

    return { success: true };
  },
});

// ============================================================================
// INTERNAL MUTATIONS FOR CALLBACK HANDLER (no auth — Telegram callback)
// ============================================================================

export const handleTakeoverInternal = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    actorExternalId: v.optional(v.string()),
    actorLabel: v.optional(v.string()),
    reason: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return applyProviderQuickAction({
      ctx,
      sessionId: args.sessionId,
      action: "takeover",
      source: "telegram",
      actorExternalId: args.actorExternalId,
      actorLabel: args.actorLabel,
      reason: args.reason ?? "telegram_takeover",
      note: args.note,
    });
  },
});

export const handleDismissInternal = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    actorExternalId: v.optional(v.string()),
    actorLabel: v.optional(v.string()),
    reason: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return applyProviderQuickAction({
      ctx,
      sessionId: args.sessionId,
      action: "resume",
      source: "telegram",
      actorExternalId: args.actorExternalId,
      actorLabel: args.actorLabel,
      reason: args.reason ?? "telegram_dismissed",
      note: args.note,
    });
  },
});

// ============================================================================
// AUTO-RESUME CRON
// ============================================================================

/**
 * Auto-resume timed-out escalations.
 * Called by cron every 5 minutes. Finds pending escalations older than 30 min.
 */
export const autoResumeTimedOutEscalations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - ESCALATION_TIMEOUT_MS;

    // Find active sessions (escalation state is on the session doc)
    // We check by org_status index for active sessions, then filter by escalation
    const activeSessions = await ctx.db
      .query("agentSessions")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    let resumed = 0;
    for (const session of activeSessions) {
      if (
        session.escalationState?.status === "pending" &&
        session.escalationState.escalatedAt < cutoff
      ) {
        const respondedAt = Date.now();
        await ctx.db.patch(session._id, {
          escalationState: {
            ...session.escalationState,
            status: "timed_out" as const,
            respondedAt,
          },
        });

        await (ctx as any).runMutation(
          generatedApi.internal.ai.agentLifecycle.recordLifecycleTransition,
          {
            sessionId: session._id,
            fromState: "escalated",
            toState: "resolved",
            actor: "system",
            actorId: "escalation_timeout_worker",
            checkpoint: "escalation_timed_out",
            reason: `timeout_ms:${ESCALATION_TIMEOUT_MS}`,
          },
        );
        await (ctx as any).runMutation(
          generatedApi.internal.ai.agentLifecycle.recordLifecycleTransition,
          {
            sessionId: session._id,
            fromState: "resolved",
            toState: "active",
            actor: "system",
            actorId: "escalation_timeout_worker",
            checkpoint: "agent_resumed",
            reason: "agent_resumed_after_timeout",
          },
        );
        resumed++;
      }
    }

    if (resumed > 0) {
      console.log(`[Escalation] Auto-resumed ${resumed} timed-out escalation(s)`);
    }
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get escalation queue for an org (authenticated).
 */
export const getEscalationQueue = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);
    const organization = await ctx.db.get(args.organizationId);

    // Get sessions with active escalations for this org
    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const escalated = sessions.filter(
      (s) => s.escalationState &&
        (s.escalationState.status === "pending" || s.escalationState.status === "taken_over")
    );

    // Enrich with agent names
    const enriched = await Promise.all(
      escalated.map(async (session) => {
        const agent = await ctx.db.get(session.agentId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const agentName = (agent?.customProperties as any)?.displayName
          || agent?.name
          || "Unknown Agent";
        const harnessContext = buildHarnessContextEnvelope({
          source: "escalation",
          organization: organization
            ? {
                _id: String(organization._id),
                slug: organization.slug,
                parentOrganizationId: organization.parentOrganizationId
                  ? String(organization.parentOrganizationId)
                  : undefined,
              }
            : null,
          agentSubtype: agent?.subtype,
          toolsUsed:
            session.escalationState?.triggerType === "tool_failure"
              ? (session.errorState?.disabledTools || [])
              : [],
          teamSession: session.teamSession
            ? {
                handoffHistory: session.teamSession.handoffHistory.map((entry) => ({
                  fromAgentId: String(entry.fromAgentId),
                  toAgentId: String(entry.toAgentId),
                  reason: entry.reason,
                  summary: entry.summary,
                  goal: entry.goal,
                  contextSummary: entry.contextSummary,
                  timestamp: entry.timestamp,
                })),
              }
            : undefined,
        });

        return {
          _id: session._id,
          agentId: session.agentId,
          agentName,
          channel: session.channel,
          contactIdentifier: session.externalContactIdentifier,
          escalationState: session.escalationState,
          messageCount: session.messageCount,
          lastMessageAt: session.lastMessageAt,
          harnessContext,
        };
      })
    );

    // Sort by urgency (high first) then by escalatedAt (oldest first)
    const urgencyOrder: Record<string, number> = { high: 0, normal: 1, low: 2 };
    enriched.sort((a, b) => {
      const urgA = urgencyOrder[a.escalationState?.urgency || "low"] ?? 2;
      const urgB = urgencyOrder[b.escalationState?.urgency || "low"] ?? 2;
      if (urgA !== urgB) return urgA - urgB;
      return (a.escalationState?.escalatedAt || 0) - (b.escalationState?.escalatedAt || 0);
    });

    return enriched.map((entry) => ({
      ...entry,
      harnessContext: readEscalationHarnessContext(entry.harnessContext),
    }));
  },
});

/**
 * Get pending escalation count for badge display.
 */
export const getPendingEscalationCount = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    return sessions.filter(
      (s) => s.escalationState?.status === "pending"
    ).length;
  },
});

// ============================================================================
// INTERNAL QUERIES — HELPERS
// ============================================================================

/**
 * Get Telegram mapping for an org (to find owner's chat ID).
 */
export const getOrgTelegramMapping = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("telegramMappings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();
  },
});

/**
 * Get org owner's email address.
 */
export const getOrgOwnerEmail = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org?.createdBy) return null;

    const owner = await ctx.db.get(org.createdBy);
    return owner?.email || null;
  },
});

/**
 * Get session with escalation state (for pipeline checks).
 */
export const getSessionEscalationState = internalQuery({
  args: { sessionId: v.id("agentSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    return session?.escalationState || null;
  },
});

// ============================================================================
// HIGH URGENCY EMAIL RETRY
// ============================================================================

/**
 * Scheduled 5 min after a HIGH urgency escalation. If still pending, re-sends email.
 */
export const retryHighUrgencyEmail = internalAction({
  args: {
    sessionId: v.id("agentSessions"),
    organizationId: v.id("organizations"),
    agentName: v.string(),
    reason: v.string(),
    contactIdentifier: v.string(),
    channel: v.string(),
    lastMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if escalation is still pending
    const escState = await (ctx as any).runQuery(
      generatedApi.internal.ai.escalation.getSessionEscalationState,
      { sessionId: args.sessionId }
    );

    if (escState?.status !== "pending") return { skipped: "Escalation no longer pending" };

    // Re-send email with urgency reminder
    const ownerEmail = await (ctx as any).runQuery(
      generatedApi.internal.ai.escalation.getOrgOwnerEmail,
      { organizationId: args.organizationId }
    );

    if (!ownerEmail) return { error: "No owner email found" };

    await (ctx as any).runAction(generatedApi.internal.emailService.sendEscalationEmail, {
      to: ownerEmail,
      agentName: args.agentName,
      reason: `REMINDER: ${args.reason}`,
      urgency: "high" as const,
      contactIdentifier: args.contactIdentifier,
      channel: args.channel,
      lastMessage: args.lastMessage,
    });

    return { success: true, retried: true };
  },
});

// ============================================================================
// ESCALATION METRICS
// ============================================================================

/**
 * Get escalation metrics for an org over a time range.
 * Computes: count_by_reason, response_time, resolution_rate, auto_resume_rate, false_positive_rate.
 */
export const getEscalationMetrics = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    sinceDaysAgo: v.optional(v.number()), // default 30
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const daysAgo = args.sinceDaysAgo ?? 30;
    const since = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

    // Fetch all escalation-related audit logs for this org
    const actions = await ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const escalationActions = actions.filter(
      (a) =>
        a.performedAt >= since &&
        [
          "escalation_created",
          "escalation_taken_over",
          "escalation_dismissed",
          "escalation_resolved",
        ].includes(a.actionType)
    );

    // Group by session to compute per-escalation metrics
    const created = escalationActions.filter((a) => a.actionType === "escalation_created");
    const takenOver = escalationActions.filter((a) => a.actionType === "escalation_taken_over");
    const dismissed = escalationActions.filter((a) => a.actionType === "escalation_dismissed");
    const resolved = escalationActions.filter((a) => a.actionType === "escalation_resolved");

    // Count by trigger type (reason)
    const countByReason: Record<string, number> = {};
    for (const a of created) {
      const triggerType = (a.actionData as Record<string, unknown>)?.triggerType as string || "unknown";
      countByReason[triggerType] = (countByReason[triggerType] || 0) + 1;
    }

    // Response times (from created → first response action)
    const createdBySession = new Map<string, number>();
    for (const a of created) {
      const sid = (a.actionData as Record<string, unknown>)?.sessionId as string;
      if (sid) createdBySession.set(sid, a.performedAt);
    }

    const responseTimes: number[] = [];
    for (const a of [...takenOver, ...dismissed, ...resolved]) {
      const sid = (a.actionData as Record<string, unknown>)?.sessionId as string;
      const createdAt = sid ? createdBySession.get(sid) : undefined;
      if (createdAt) {
        responseTimes.push(a.performedAt - createdAt);
        createdBySession.delete(sid); // Only count first response
      }
    }

    const avgResponseTimeMs = responseTimes.length > 0
      ? responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length
      : null;

    // Also check timed_out sessions for auto_resume_rate
    const timedOutSessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const timedOutCount = timedOutSessions.filter(
      (s) => s.escalationState?.status === "timed_out" && s.escalationState.escalatedAt >= since
    ).length;

    const totalEscalations = created.length;

    return {
      totalEscalations,
      countByReason,
      avgResponseTimeMs,
      avgResponseTimeFormatted: avgResponseTimeMs
        ? formatDuration(avgResponseTimeMs)
        : "N/A",
      resolutionRate: totalEscalations > 0
        ? Math.round((resolved.length / totalEscalations) * 100)
        : 0,
      falsePositiveRate: totalEscalations > 0
        ? Math.round((dismissed.length / totalEscalations) * 100)
        : 0,
      autoResumeRate: totalEscalations > 0
        ? Math.round((timedOutCount / totalEscalations) * 100)
        : 0,
      takeoverRate: totalEscalations > 0
        ? Math.round((takenOver.length / totalEscalations) * 100)
        : 0,
      // Raw counts for UI display
      counts: {
        created: totalEscalations,
        resolved: resolved.length,
        dismissed: dismissed.length,
        timedOut: timedOutCount,
        takenOver: takenOver.length,
      },
      periodDays: daysAgo,
    };
  },
});

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

// ============================================================================
// EXPORTS FOR agentExecution.ts
// ============================================================================

export { DEFAULT_HOLD_MESSAGE, resolvePolicy };
