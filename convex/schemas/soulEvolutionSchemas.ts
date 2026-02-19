/**
 * SOUL EVOLUTION SCHEMAS
 *
 * Tables for agent self-improvement and soul evolution.
 *
 * Tables:
 * - soulProposals: Agent-proposed updates to their own personality/rules
 * - agentConversationMetrics: Outcome signals from conversations
 * - soulVersionHistory: Audit trail of soul changes
 * - proposalFeedback: Tracks owner approval/rejection patterns for learning
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";
import { soulDriftScoresValidator } from "./aiSchemas";

/**
 * SOUL PROPOSALS
 *
 * Agents propose updates to their own soul. Owner approves/rejects via Telegram.
 * Proposals track what the agent wants to change, why, and the evidence.
 */
export const soulProposals = defineTable({
  organizationId: v.id("organizations"),
  agentId: v.id("objects"),
  sessionId: v.optional(v.id("agentSessions")),

  // What the agent wants to change
  proposalType: v.union(
    v.literal("add"),
    v.literal("modify"),
    v.literal("remove"),
    v.literal("add_faq"),
  ),
  targetField: v.string(),
  currentValue: v.optional(v.string()),
  proposedValue: v.string(),
  reason: v.string(),

  // Evidence
  triggerType: v.union(
    v.literal("conversation"),
    v.literal("reflection"),
    v.literal("owner_directed"),
    v.literal("alignment"),
  ),
  evidenceMessages: v.optional(v.array(v.string())),
  alignmentMode: v.optional(v.union(
    v.literal("monitor"),
    v.literal("remediate"),
  )),
  driftScores: v.optional(soulDriftScoresValidator),
  driftSummary: v.optional(v.string()),
  driftSignalSource: v.optional(v.string()),

  // Status
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("rejected"),
    v.literal("applied"),
  ),
  requiresOwnerApproval: v.optional(v.boolean()),
  approvalCheckpointId: v.optional(v.string()),
  appliedAt: v.optional(v.number()),
  appliedBy: v.optional(v.string()),
  telemetrySummary: v.optional(v.string()),

  // Metadata
  createdAt: v.number(),
  reviewedAt: v.optional(v.number()),
  reviewedBy: v.optional(v.string()),

  // Telegram notification tracking
  telegramMessageId: v.optional(v.number()),
  telegramChatId: v.optional(v.string()),
})
  .index("by_org_status", ["organizationId", "status"])
  .index("by_agent_status", ["agentId", "status"])
  .index("by_org_pending", ["organizationId", "status", "createdAt"]);

/**
 * AGENT CONVERSATION METRICS
 *
 * Outcome signals from each conversation.
 * Feeds the self-improvement reflection loop.
 */
export const agentConversationMetrics = defineTable({
  organizationId: v.id("organizations"),
  agentId: v.id("objects"),
  sessionId: v.id("agentSessions"),
  channel: v.string(),

  // Outcome signals
  messageCount: v.number(),
  toolCallCount: v.number(),
  toolFailureCount: v.number(),
  escalated: v.boolean(),
  customerSentiment: v.optional(v.union(
    v.literal("positive"),
    v.literal("neutral"),
    v.literal("negative"),
    v.literal("unknown"),
  )),
  ownerCorrected: v.boolean(),
  unansweredQuestions: v.optional(v.array(v.string())),
  mediaTypesHandled: v.optional(v.array(v.string())),

  // Timing
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
  avgResponseTimeMs: v.optional(v.number()),

  // Self-assessment
  selfScore: v.optional(v.number()),
  selfNotes: v.optional(v.string()),
})
  .index("by_agent", ["agentId", "startedAt"])
  .index("by_org", ["organizationId", "startedAt"]);

/**
 * SOUL VERSION HISTORY
 *
 * Audit trail for every soul change.
 * Enables rollback and timeline view of agent evolution.
 */
export const soulVersionHistory = defineTable({
  agentId: v.id("objects"),
  organizationId: v.id("organizations"),
  version: v.number(),
  previousSoul: v.string(),
  newSoul: v.string(),
  changeType: v.string(),
  proposalId: v.optional(v.id("soulProposals")),
  changedAt: v.number(),
  // Rollback tracking
  fromVersion: v.optional(v.number()),
  toVersion: v.optional(v.number()),
  soulSchemaVersion: v.optional(v.number()),
  soulOverlayVersion: v.optional(v.number()),
  rollbackCheckpointId: v.optional(v.string()),
  changedBy: v.optional(v.string()),
})
  .index("by_agent_version", ["agentId", "version"]);

/**
 * PROPOSAL FEEDBACK
 *
 * Tracks how the owner responded to proposals.
 * Used by the learning loop to calibrate future proposals.
 */
export const proposalFeedback = defineTable({
  organizationId: v.id("organizations"),
  agentId: v.id("objects"),
  proposalId: v.id("soulProposals"),
  outcome: v.union(v.literal("approved"), v.literal("rejected")),
  ownerFeedback: v.optional(v.string()),
  proposalSummary: v.string(),
  learnedRule: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_agent", ["agentId", "createdAt"]);
