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
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { getUserContext, requireAuthenticatedUser } from "../rbacHelpers";
import {
  buildTrustTimelineCorrelationId,
  resolveTrustTimelineSurfaceFromWorkflow,
} from "../ai/trustEvents";
import {
  getOrgIdsForScope,
  hasSubOrganizations,
  LAYER_NAMES,
  resolveScopedOrgTarget,
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
    pipelineStage?: "ingress" | "routing" | "execution" | "delivery";
    workflowKey?: string;
    threadId?: string;
    lineageId?: string;
    correlationId?: string;
    eventOrdinal?: number;
    visibilityScope?: "org_owner" | "super_admin";
    webhookOutcome?: string;
    webhookEventName?: string;
    webhookEndpoint?: string;
    providerEventId?: string;
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

type TerminalVisibilityScope = "org_owner" | "super_admin";

function normalizeTerminalTraceString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function roleScopedTerminalMetadata(args: {
  visibilityScope: TerminalVisibilityScope;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  base: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  superAdminDebug?: Record<string, any>;
}): Record<string, unknown> {
  if (args.visibilityScope === "super_admin" && args.superAdminDebug) {
    return {
      ...args.base,
      debug: args.superAdminDebug,
    };
  }
  return args.base;
}

function resolvePipelineFromReceiptStatus(status: string): "ingress" | "routing" | "execution" | "delivery" {
  if (status === "accepted") {
    return "ingress";
  }
  if (status === "processing" || status === "duplicate") {
    return "routing";
  }
  if (status === "completed") {
    return "delivery";
  }
  return "execution";
}

function resolvePipelineFromTransition(
  transition: string
): "ingress" | "routing" | "execution" | "delivery" {
  if (transition === "inbound_received") {
    return "ingress";
  }
  if (transition === "turn_enqueued") {
    return "routing";
  }
  if (transition === "terminal_deliverable_recorded" || transition === "turn_completed") {
    return "delivery";
  }
  return "execution";
}

export const getTerminalFeed = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
    scope: v.optional(v.union(v.literal("org"), v.literal("layer"))),
    scopeOrganizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, auth.userId, args.organizationId);
    const visibilityScope: TerminalVisibilityScope =
      userContext.isGlobal && userContext.roleName === "super_admin"
        ? "super_admin"
        : "org_owner";
    const { scope, scopeOrganizationId } = resolveScopedOrgTarget({
      viewerOrganizationId: args.organizationId,
      requestedScope: args.scope,
      requestedScopeOrganizationId: args.scopeOrganizationId,
      allowCrossOrg: visibilityScope === "super_admin",
    });

    const limit = Math.min(args.limit ?? 100, 500);
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // last 24h

    // Resolve orgs for scope
    const scopedOrgs = await getOrgIdsForScope(
      ctx.db,
      scopeOrganizationId,
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
            visibilityScope,
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
                visibilityScope,
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
                visibilityScope,
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
              visibilityScope,
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
              visibilityScope,
              ...(isLayerMode && {
                orgName: scopedOrg.orgName,
                orgSlug: scopedOrg.orgSlug,
                layer: scopedOrg.layer,
              }),
            },
          });
        }
      }

      // 4. Receipt + runtime evidence (ingress/routing/execution/delivery)
      const receipts = await ctx.db
        .query("agentInboxReceipts")
        .withIndex("by_org_time", (q) => q.eq("organizationId", scopedOrg.orgId))
        .order("desc")
        .take(fetchLimit);

      for (const receipt of receipts) {
        const receiptTimestamp = receipt.updatedAt || receipt.lastSeenAt || receipt.createdAt || 0;
        if (receiptTimestamp < cutoffTime) continue;

        const queueContract = (receipt.queueContract || {}) as Record<string, unknown>;
        const idempotencyContract =
          (receipt.idempotencyContract || {}) as Record<string, unknown>;
        const workflowKey =
          normalizeTerminalTraceString(queueContract.workflowKey)?.toLowerCase()
          || normalizeTerminalTraceString(idempotencyContract.intentType)?.toLowerCase();
        const pipelineStage = resolvePipelineFromReceiptStatus(receipt.status);
        const lineageId = normalizeTerminalTraceString(queueContract.lineageId);
        const threadId =
          normalizeTerminalTraceString(queueContract.threadId)
          || String(receipt.sessionId);
        const correlationId = buildTrustTimelineCorrelationId({
          lineageId,
          threadId,
          fallbackThreadId: String(receipt.sessionId),
          surface: resolveTrustTimelineSurfaceFromWorkflow(workflowKey),
          sourceId: String(receipt._id),
        });
        const baseMetadata = roleScopedTerminalMetadata({
          visibilityScope,
          base: {
            sessionId: String(receipt.sessionId),
            channel: receipt.channel,
            pipelineStage,
            workflowKey,
            threadId,
            lineageId,
            correlationId,
            visibilityScope,
          },
          superAdminDebug: {
            receiptId: String(receipt._id),
            queueContract: receipt.queueContract,
            idempotencyContract: receipt.idempotencyContract,
            failureReason: receipt.failureReason,
            duplicateCount: receipt.duplicateCount,
          },
        });

        entries.push({
          id: `receipt-${String(receipt._id)}`,
          timestamp: receiptTimestamp,
          type: "tool_execution",
          severity:
            receipt.status === "failed"
              ? "error"
              : receipt.status === "duplicate"
                ? "warning"
                : receipt.status === "completed"
                  ? "success"
                  : "info",
          message: `[${pipelineStage.toUpperCase()}] Receipt ${receipt.status} (${receipt.channel}:${receipt.externalContactIdentifier})`,
          metadata: {
            ...baseMetadata,
            ...(isLayerMode && {
              orgName: scopedOrg.orgName,
              orgSlug: scopedOrg.orgSlug,
              layer: scopedOrg.layer,
            }),
          },
        });
      }

      const executionEdges = await ctx.db
        .query("executionEdges")
        .withIndex("by_org_time", (q) => q.eq("organizationId", scopedOrg.orgId))
        .order("desc")
        .take(fetchLimit);

      const edgeTurnIds = new Set<string>();
      for (const edge of executionEdges) {
        edgeTurnIds.add(String(edge.turnId));
      }
      const edgeTurnMap = new Map<string, Record<string, unknown>>();
      await Promise.all(
        Array.from(edgeTurnIds).map(async (turnId) => {
          const turn = await ctx.db.get(turnId as Id<"agentTurns">);
          if (turn) {
            edgeTurnMap.set(turnId, turn as unknown as Record<string, unknown>);
          }
        })
      );

      for (const edge of executionEdges) {
        if (edge.occurredAt < cutoffTime) continue;
        const transition = normalizeTerminalTraceString(edge.transition) || "unknown";
        const pipelineStage = resolvePipelineFromTransition(transition);
        const edgeMetadata = (edge.metadata || {}) as Record<string, unknown>;
        const turnRecord = edgeTurnMap.get(String(edge.turnId));
        const queueContract =
          (turnRecord?.queueContract as Record<string, unknown> | undefined)
          || (edgeMetadata.queueContract as Record<string, unknown> | undefined);
        const idempotencyContract =
          (turnRecord?.idempotencyContract as Record<string, unknown> | undefined)
          || (edgeMetadata.idempotencyContract as Record<string, unknown> | undefined);
        const workflowKey =
          normalizeTerminalTraceString(queueContract?.workflowKey)?.toLowerCase()
          || normalizeTerminalTraceString(idempotencyContract?.intentType)?.toLowerCase();
        const lineageId = normalizeTerminalTraceString(queueContract?.lineageId);
        const threadId =
          normalizeTerminalTraceString(queueContract?.threadId)
          || String(edge.sessionId);
        const correlationId = buildTrustTimelineCorrelationId({
          lineageId,
          threadId,
          fallbackThreadId: String(edge.sessionId),
          surface: resolveTrustTimelineSurfaceFromWorkflow(workflowKey),
          sourceId: `${String(edge.turnId)}:${String(edge.edgeOrdinal)}`,
        });
        const baseMetadata = roleScopedTerminalMetadata({
          visibilityScope,
          base: {
            sessionId: String(edge.sessionId),
            pipelineStage,
            workflowKey,
            threadId,
            lineageId,
            correlationId,
            eventOrdinal: edge.edgeOrdinal,
            visibilityScope,
          },
          superAdminDebug: {
            edgeId: String(edge._id),
            turnId: String(edge.turnId),
            fromState: edge.fromState,
            toState: edge.toState,
            transitionPolicyVersion: edge.transitionPolicyVersion,
            replayInvariantStatus: edge.replayInvariantStatus,
            edgeMetadata,
          },
        });

        entries.push({
          id: `edge-${String(edge._id)}`,
          timestamp: edge.occurredAt,
          type: "tool_execution",
          severity:
            transition.includes("failed")
            || transition.includes("cancelled")
            || transition.includes("error")
              ? "error"
              : pipelineStage === "delivery"
                ? "success"
                : "info",
          message: `[${pipelineStage.toUpperCase()}] ${transition.replace(/_/g, " ")} (#${edge.edgeOrdinal})`,
          metadata: {
            ...baseMetadata,
            ...(isLayerMode && {
              orgName: scopedOrg.orgName,
              orgSlug: scopedOrg.orgSlug,
              layer: scopedOrg.layer,
            }),
          },
        });
      }

      // 5. Webhook events
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

        const provider = normalizeTerminalTraceString(props?.provider) || "unknown";
        const eventStatus =
          normalizeTerminalTraceString(props?.eventStatus)?.toLowerCase() || "unknown";
        const outcome = normalizeTerminalTraceString(props?.outcome) || undefined;
        const eventName =
          normalizeTerminalTraceString(props?.eventName)
          || normalizeTerminalTraceString(webhook.name)
          || undefined;
        const endpoint = normalizeTerminalTraceString(props?.endpoint) || undefined;
        const providerEventId =
          normalizeTerminalTraceString(props?.providerEventId) || undefined;
        const outcomeLabel = outcome || eventStatus;
        const severity =
          eventStatus === "error"
            ? "error"
            : eventStatus === "warning" || eventStatus === "skipped"
              ? "warning"
              : eventStatus === "success"
                ? "success"
                : "info";

        entries.push({
          id: webhook._id,
          timestamp: processedAt,
          type: "webhook",
          severity,
          message: `[Webhook] ${provider} → ${outcomeLabel}${eventName ? ` (${eventName})` : ""}${props?.errorMessage ? `: ${props.errorMessage}` : ""}`,
          metadata: {
            sessionId: normalizeTerminalTraceString(props?.sessionId),
            channel: normalizeTerminalTraceString(props?.channel),
            errorMessage: props?.errorMessage as string | undefined,
            pipelineStage: "ingress",
            webhookOutcome: outcome,
            webhookEventName: eventName,
            webhookEndpoint: endpoint,
            providerEventId,
            visibilityScope,
            ...(isLayerMode && {
              orgName: scopedOrg.orgName,
              orgSlug: scopedOrg.orgSlug,
              layer: scopedOrg.layer,
            }),
          },
        });
      }
    }

    // Sort by timestamp ascending with deterministic tie-breakers.
    entries.sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      const aOrdinal =
        typeof a.metadata?.eventOrdinal === "number" ? a.metadata.eventOrdinal : 0;
      const bOrdinal =
        typeof b.metadata?.eventOrdinal === "number" ? b.metadata.eventOrdinal : 0;
      if (aOrdinal !== bOrdinal) {
        return aOrdinal - bOrdinal;
      }
      return a.id.localeCompare(b.id);
    });

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
    scopeOrganizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, auth.userId, args.organizationId);
    const isSuperAdmin =
      userContext.isGlobal && userContext.roleName === "super_admin";
    const { scopeOrganizationId } = resolveScopedOrgTarget({
      viewerOrganizationId: args.organizationId,
      requestedScopeOrganizationId: args.scopeOrganizationId,
      allowCrossOrg: isSuperAdmin,
    });
    const available = isSuperAdmin
      ? await hasSubOrganizations(ctx.db, scopeOrganizationId)
      : false;
    return {
      available,
      scopeOrganizationId,
      visibilityScope: isSuperAdmin ? "super_admin" : "org_owner",
    };
  },
});
