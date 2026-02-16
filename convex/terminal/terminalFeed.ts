/**
 * TERMINAL FEED — Real-Time Activity Log Query
 *
 * Aggregates agent sessions, messages, object actions, and webhook events
 * into a unified terminal log feed. Uses Convex reactive queries so the
 * frontend auto-updates as new events arrive.
 *
 * Layer-aware: supports "org" (single org) and "layer" (org + children) scopes.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";
import {
  getOrgIdsForScope,
  hasSubOrganizations,
  LAYER_NAMES,
  type Scope,
  type ScopedOrg,
} from "../lib/layerScope";

export interface TerminalLogEntry {
  id: string;
  timestamp: number;
  type:
    | "user_message"
    | "agent_response"
    | "tool_execution"
    | "webhook"
    | "session_start"
    | "error";
  severity: "info" | "success" | "warning" | "error";
  message: string;
  metadata?: {
    sessionId?: string;
    agentName?: string;
    channel?: string;
    toolName?: string;
    toolsUsed?: string[];
    costUsd?: number;
    tokensUsed?: number;
    errorMessage?: string;
    // Layer scope metadata
    orgName?: string;
    orgSlug?: string;
    layer?: number;
  };
}

interface LayerBreakdown {
  layer: number;
  layerName: string;
  orgCount: number;
  eventCount: number;
}

export const getTerminalFeed = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
    scope: v.optional(v.union(v.literal("org"), v.literal("layer"))),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const limit = Math.min(args.limit ?? 100, 500);
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // last 24h
    const scope: Scope = args.scope ?? "org";

    // Resolve orgs for scope
    const scopedOrgs = await getOrgIdsForScope(
      ctx.db,
      args.organizationId,
      scope
    );

    if (scopedOrgs.length === 0) return { entries: [], stats: { totalEvents: 0, activeSessions: 0, errorCount: 0 } };

    const entries: TerminalLogEntry[] = [];
    const layerEventCounts = new Map<number, number>();
    const isLayerMode = scope === "layer" && scopedOrgs.length > 1;

    // Use a generous per-source fetch limit per org, then trim globally at the end.
    // This prevents active orgs from being starved by even distribution.
    const fetchLimit = Math.min(50, limit);
    // Cap how many sessions we fetch messages for to avoid N+1 blowup
    const maxSessionsForMessages = Math.min(20, Math.ceil(limit / scopedOrgs.length));

    for (const scopedOrg of scopedOrgs) {
      // 1. Agent sessions → session_start events
      const sessions = await ctx.db
        .query("agentSessions")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", scopedOrg.orgId)
        )
        .order("desc")
        .take(fetchLimit);

      const recentSessions = sessions.filter((s) => s.startedAt >= cutoffTime);

      for (const session of recentSessions) {
        const entry: TerminalLogEntry = {
          id: `session-${session._id}`,
          timestamp: session.startedAt,
          type: "session_start",
          severity: "info",
          message: `[Session] ${session.channel} — ${session.externalContactIdentifier} (${session.status})`,
          metadata: {
            sessionId: session._id,
            channel: session.channel,
            ...(isLayerMode && {
              orgName: scopedOrg.orgName,
              orgSlug: scopedOrg.orgSlug,
              layer: scopedOrg.layer,
            }),
          },
        };
        entries.push(entry);
      }

      // 2. Messages — only for the N most recent sessions to cap query count
      const sessionsForMessages = recentSessions.slice(0, maxSessionsForMessages);
      for (const session of sessionsForMessages) {
        const messages = await ctx.db
          .query("agentSessionMessages")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .order("desc")
          .take(20);

        for (const msg of messages) {
          if (msg.timestamp < cutoffTime) continue;

          if (msg.role === "user") {
            entries.push({
              id: msg._id,
              timestamp: msg.timestamp,
              type: "user_message",
              severity: "info",
              message: `[${session.channel}] User: ${msg.content}`,
              metadata: {
                sessionId: session._id,
                channel: session.channel,
                ...(isLayerMode && {
                  orgName: scopedOrg.orgName,
                  orgSlug: scopedOrg.orgSlug,
                  layer: scopedOrg.layer,
                }),
              },
            });
          } else if (msg.role === "assistant") {
            entries.push({
              id: msg._id,
              timestamp: msg.timestamp,
              type: "agent_response",
              severity: "success",
              message: `[${msg.agentName || "Agent"}]: ${msg.content}`,
              metadata: {
                sessionId: session._id,
                agentName: msg.agentName || undefined,
                channel: session.channel,
                ...(isLayerMode && {
                  orgName: scopedOrg.orgName,
                  orgSlug: scopedOrg.orgSlug,
                  layer: scopedOrg.layer,
                }),
              },
            });
          }
        }
      }

      // 3. Object actions (tool executions, message_processed)
      const actions = await ctx.db
        .query("objectActions")
        .withIndex("by_org_action_type", (q) =>
          q.eq("organizationId", scopedOrg.orgId)
        )
        .order("desc")
        .take(fetchLimit);

      for (const action of actions) {
        if (action.performedAt < cutoffTime) continue;

        const data = action.actionData as Record<string, unknown> | undefined;

        if (action.actionType === "message_processed") {
          entries.push({
            id: action._id,
            timestamp: action.performedAt,
            type: "tool_execution",
            severity: "success",
            message: `[Pipeline] Message processed${data?.toolsUsed ? ` — tools: ${(data.toolsUsed as string[]).join(", ")}` : ""}`,
            metadata: {
              sessionId: data?.sessionId as string | undefined,
              toolsUsed: data?.toolsUsed as string[] | undefined,
              tokensUsed: data?.tokensUsed as number | undefined,
              costUsd: data?.costUsd as number | undefined,
              ...(isLayerMode && {
                orgName: scopedOrg.orgName,
                orgSlug: scopedOrg.orgSlug,
                layer: scopedOrg.layer,
              }),
            },
          });
        } else if (action.actionType === "specialist_response") {
          entries.push({
            id: action._id,
            timestamp: action.performedAt,
            type: "tool_execution",
            severity: "info",
            message: `[Specialist] Response for context: ${data?.context || "unknown"}`,
            metadata: {
              sessionId: data?.sessionId as string | undefined,
              tokensUsed: data?.tokensUsed as number | undefined,
              costUsd: data?.costUsd as number | undefined,
              ...(isLayerMode && {
                orgName: scopedOrg.orgName,
                orgSlug: scopedOrg.orgSlug,
                layer: scopedOrg.layer,
              }),
            },
          });
        }
      }

      // 4. Webhook events
      const webhooks = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q
            .eq("organizationId", scopedOrg.orgId)
            .eq("type", "webhook_event")
        )
        .order("desc")
        .take(fetchLimit);

      for (const webhook of webhooks) {
        const props = webhook.customProperties as Record<string, unknown> | undefined;
        // Use processedAt if set, then createdAt field, then Convex _creationTime as reliable fallback
        const processedAt = (props?.processedAt as number) || webhook.createdAt || webhook._creationTime || 0;
        if (processedAt < cutoffTime) continue;

        const whStatus = (props?.eventStatus as string) || "unknown";
        entries.push({
          id: webhook._id,
          timestamp: processedAt,
          type: "webhook",
          severity: whStatus === "error" ? "error" : whStatus === "skipped" ? "warning" : "info",
          message: `[Webhook] ${props?.provider || "unknown"} → ${whStatus}${props?.errorMessage ? `: ${props.errorMessage}` : ""}`,
          metadata: {
            errorMessage: props?.errorMessage as string | undefined,
            ...(isLayerMode && {
              orgName: scopedOrg.orgName,
              orgSlug: scopedOrg.orgSlug,
              layer: scopedOrg.layer,
            }),
          },
        });
      }
    }

    // Sort by timestamp ascending (oldest first → newest at bottom)
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Trim to limit
    const trimmed = entries.slice(-limit);

    // Count stats
    const activeSessions = trimmed.filter(
      (e) => e.type === "session_start" && e.message.includes("(active)")
    ).length;
    const errorCount = trimmed.filter((e) => e.severity === "error").length;

    // Build layer breakdown for layer scope
    let layerBreakdown: LayerBreakdown[] | undefined;
    if (scope === "layer" && scopedOrgs.length > 1) {
      // Count events per layer
      for (const entry of trimmed) {
        const layer = entry.metadata?.layer;
        if (layer != null) {
          layerEventCounts.set(layer, (layerEventCounts.get(layer) || 0) + 1);
        }
      }

      // Build breakdown grouped by layer
      const layerOrgCounts = new Map<number, number>();
      for (const org of scopedOrgs) {
        layerOrgCounts.set(org.layer, (layerOrgCounts.get(org.layer) || 0) + 1);
      }

      layerBreakdown = Array.from(layerOrgCounts.entries()).map(([layer, orgCount]) => ({
        layer,
        layerName: LAYER_NAMES[layer] || `L${layer}`,
        orgCount,
        eventCount: layerEventCounts.get(layer) || 0,
      }));
    }

    return {
      entries: trimmed,
      stats: {
        totalEvents: trimmed.length,
        activeSessions,
        errorCount,
        ...(layerBreakdown && { layerBreakdown }),
      },
    };
  },
});

/**
 * Check if layer scope is available for the current org.
 * Returns true if the org has sub-organizations.
 */
export const checkLayerScopeAvailable = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);
    const available = await hasSubOrganizations(ctx.db, args.organizationId);
    return { available };
  },
});
