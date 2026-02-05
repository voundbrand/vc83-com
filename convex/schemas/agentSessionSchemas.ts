/**
 * AGENT SESSION SCHEMAS
 *
 * Tables for managing conversations between org agents and external contacts.
 *
 * Tables:
 * - agentSessions: One record per conversation (org + channel + contact)
 * - agentSessionMessages: Individual messages within a session
 *
 * Session Modes:
 * - "freeform": Standard agent conversation (default)
 * - "guided": Scripted interview following a template
 *
 * See: convex/ai/agentSessions.ts for queries/mutations
 * See: convex/ai/interviewRunner.ts for guided session logic
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * AGENT SESSIONS
 *
 * Tracks conversations between an org's AI agent and an external contact.
 * Keyed by org + channel + external contact identifier.
 *
 * Guided Mode (Interviews):
 * When sessionMode="guided", the session follows an interview template.
 * The interviewState tracks progress through phases and questions.
 * Extracted data is stored incrementally and saved as Content DNA on completion.
 */
export const agentSessions = defineTable({
  agentId: v.id("objects"),
  organizationId: v.id("organizations"),
  channel: v.string(),
  externalContactIdentifier: v.string(),

  status: v.union(
    v.literal("active"),
    v.literal("closed"),
    v.literal("handed_off")
  ),

  crmContactId: v.optional(v.id("objects")),
  handedOffTo: v.optional(v.id("users")),

  // ========== GUIDED SESSION FIELDS (Interviews) ==========

  // Session mode: "freeform" (default) or "guided" (interview)
  sessionMode: v.optional(v.union(v.literal("freeform"), v.literal("guided"))),

  // Reference to interview template (type="interview_template" in objects)
  interviewTemplateId: v.optional(v.id("objects")),

  // Interview progress state (only populated when sessionMode="guided")
  interviewState: v.optional(v.object({
    // Progress tracking
    currentPhaseIndex: v.number(),
    currentQuestionIndex: v.number(),
    completedPhases: v.array(v.string()),
    skippedPhases: v.array(v.string()),

    // Extracted data (partial Content DNA)
    extractedData: v.record(v.string(), v.any()),

    // Follow-up tracking
    currentFollowUpCount: v.number(),
    pendingFollowUp: v.boolean(),

    // Timing
    startedAt: v.number(),
    lastActivityAt: v.number(),
    phaseStartTimes: v.record(v.string(), v.number()),

    // Completion
    isComplete: v.boolean(),
    completedAt: v.optional(v.number()),
    contentDNAId: v.optional(v.string()),
  })),

  // ========== END GUIDED SESSION FIELDS ==========

  // Stats
  messageCount: v.number(),
  tokensUsed: v.number(),
  costUsd: v.number(),

  // Timing
  startedAt: v.number(),
  lastMessageAt: v.number(),
})
  .index("by_org_channel_contact", [
    "organizationId",
    "channel",
    "externalContactIdentifier",
  ])
  .index("by_agent", ["agentId"])
  .index("by_org_status", ["organizationId", "status"])
  .index("by_template", ["interviewTemplateId"])
  .index("by_org_session_mode", ["organizationId", "sessionMode"]);

/**
 * AGENT SESSION MESSAGES
 *
 * Individual messages within an agent session.
 * Stores the full conversation history for context window management.
 */
export const agentSessionMessages = defineTable({
  sessionId: v.id("agentSessions"),
  role: v.union(
    v.literal("user"),
    v.literal("assistant"),
    v.literal("system")
  ),
  content: v.string(),
  toolCalls: v.optional(v.any()),
  timestamp: v.number(),
})
  .index("by_session", ["sessionId"]);
