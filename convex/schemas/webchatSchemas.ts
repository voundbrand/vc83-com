/**
 * WEBCHAT SCHEMAS
 *
 * Tables for the webchat widget public API.
 *
 * Tables:
 * - webchatSessions: Anonymous visitor sessions (24h expiry)
 * - webchatRateLimits: IP-based rate limiting for public endpoints
 *
 * Integration with Comms Platform:
 * - Webchat operates at Layer 4 (End User ↔ AI Agent)
 * - Sessions link to agentSessions once a conversation starts
 * - Future: notification events for conversation.started, message.received
 *
 * See: convex/api/v1/webchatApi.ts for queries/mutations/actions
 * See: docs/bring_it_all_together/05-WEBCHAT-WIDGET.md for architecture
 * See: docs/bring_it_all_together/12-COMMS-PLATFORM-SPEC.md for comms platform
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * WEBCHAT SESSIONS
 *
 * Anonymous visitor sessions for webchat widget.
 * Session token is used to identify returning visitors (stored in localStorage).
 * Sessions expire after 24 hours of inactivity.
 *
 * Flow:
 * 1. First message: no sessionToken → create new session → return token
 * 2. Subsequent messages: include sessionToken → resume session
 * 3. When visitor provides contact info → update visitorInfo
 * 4. When agent responds → link to agentSessionId
 */
export const webchatSessions = defineTable({
  // Secure session token (stored in visitor's localStorage)
  sessionToken: v.string(),

  // Which org/agent this session is for
  organizationId: v.id("organizations"),
  agentId: v.id("objects"),

  // Link to the agent conversation session (created on first message to agent)
  agentSessionId: v.optional(v.id("agentSessions")),

  // Visitor info (collected during conversation)
  visitorInfo: v.optional(
    v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
    })
  ),

  // Timing
  createdAt: v.number(),
  lastActivityAt: v.number(),
})
  .index("by_session_token", ["sessionToken"])
  .index("by_org_agent", ["organizationId", "agentId"])
  .index("by_agent_session", ["agentSessionId"]);

/**
 * WEBCHAT RATE LIMITS
 *
 * IP-based rate limiting for public webchat endpoints.
 * Tracks request timestamps per IP address.
 *
 * Rate limits:
 * - Free tier: 30 requests/minute
 * - Pro tier: 60 requests/minute
 *
 * Old entries are cleaned up on write (entries older than 2 minutes).
 */
export const webchatRateLimits = defineTable({
  ipAddress: v.string(),
  organizationId: v.id("organizations"),
  timestamp: v.number(),
})
  .index("by_ip_and_time", ["ipAddress", "timestamp"])
  .index("by_org", ["organizationId"]);
