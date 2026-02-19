import { internalMutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import {
  TRUST_EVENT_NAMESPACE,
  TRUST_EVENT_TAXONOMY_VERSION,
  validateTrustEventPayload,
  type TrustEventPayload,
} from "./trustEvents";

export const AGENT_LIFECYCLE_STATE_VALUES = [
  "draft",
  "active",
  "paused",
  "escalated",
  "takeover",
  "resolved",
] as const;
export type AgentLifecycleState = (typeof AGENT_LIFECYCLE_STATE_VALUES)[number];

export const agentLifecycleStateValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("paused"),
  v.literal("escalated"),
  v.literal("takeover"),
  v.literal("resolved"),
);

export const AGENT_LIFECYCLE_ACTOR_VALUES = [
  "agent",
  "operator",
  "system",
] as const;
export type AgentLifecycleActor = (typeof AGENT_LIFECYCLE_ACTOR_VALUES)[number];

export const agentLifecycleActorValidator = v.union(
  v.literal("agent"),
  v.literal("operator"),
  v.literal("system"),
);

export const AGENT_LIFECYCLE_CHECKPOINT_VALUES = [
  "approval_requested",
  "approval_resolved",
  "escalation_detected",
  "escalation_created",
  "escalation_taken_over",
  "escalation_dismissed",
  "escalation_resolved",
  "escalation_timed_out",
  "agent_resumed",
] as const;
export type AgentLifecycleCheckpoint =
  (typeof AGENT_LIFECYCLE_CHECKPOINT_VALUES)[number];

export const agentLifecycleCheckpointValidator = v.union(
  v.literal("approval_requested"),
  v.literal("approval_resolved"),
  v.literal("escalation_detected"),
  v.literal("escalation_created"),
  v.literal("escalation_taken_over"),
  v.literal("escalation_dismissed"),
  v.literal("escalation_resolved"),
  v.literal("escalation_timed_out"),
  v.literal("agent_resumed"),
);

export const AGENT_ESCALATION_GATE_VALUES = [
  "pre_llm",
  "post_llm",
  "tool_failure",
  "not_applicable",
] as const;
export type AgentEscalationGate = (typeof AGENT_ESCALATION_GATE_VALUES)[number];

const PRE_LLM_ESCALATION_TRIGGER_TYPES = new Set([
  "explicit_request",
  "blocked_topic",
  "negative_sentiment",
]);

const POST_LLM_ESCALATION_TRIGGER_TYPES = new Set([
  "uncertainty",
  "response_loop",
]);

const TOOL_FAILURE_ESCALATION_TRIGGER_TYPES = new Set([
  "tool_failure",
]);

interface AgentLifecycleTransitionRule {
  from: AgentLifecycleState;
  to: AgentLifecycleState;
  actor: AgentLifecycleActor;
  checkpoint: AgentLifecycleCheckpoint;
  notes: string;
}

export const AGENT_LIFECYCLE_TRANSITION_RULES: readonly AgentLifecycleTransitionRule[] = [
  {
    from: "active",
    to: "draft",
    actor: "agent",
    checkpoint: "approval_requested",
    notes: "Agent needs operator approval before executing a guarded action.",
  },
  {
    from: "draft",
    to: "active",
    actor: "operator",
    checkpoint: "approval_resolved",
    notes: "Operator approved or rejected the pending draft action.",
  },
  {
    from: "active",
    to: "paused",
    actor: "system",
    checkpoint: "escalation_detected",
    notes: "Policy checkpoint paused autonomous execution pending escalation creation.",
  },
  {
    from: "paused",
    to: "escalated",
    actor: "system",
    checkpoint: "escalation_created",
    notes: "Escalation persisted and operator notifications dispatched.",
  },
  {
    from: "escalated",
    to: "takeover",
    actor: "operator",
    checkpoint: "escalation_taken_over",
    notes: "Operator accepted ownership and session moved to handoff mode.",
  },
  {
    from: "escalated",
    to: "resolved",
    actor: "operator",
    checkpoint: "escalation_dismissed",
    notes: "Operator dismissed escalation and returned control to agent flow.",
  },
  {
    from: "escalated",
    to: "resolved",
    actor: "system",
    checkpoint: "escalation_timed_out",
    notes: "Escalation timed out and auto-resumed to avoid indefinite queue lock.",
  },
  {
    from: "takeover",
    to: "resolved",
    actor: "operator",
    checkpoint: "escalation_resolved",
    notes: "Operator finished intervention and marked takeover as resolved.",
  },
  {
    from: "resolved",
    to: "active",
    actor: "system",
    checkpoint: "agent_resumed",
    notes: "Runtime resumed autonomous handling after a resolved interruption.",
  },

  // Compatibility transition while older execution paths roll onto the paused checkpoint.
  {
    from: "active",
    to: "escalated",
    actor: "system",
    checkpoint: "escalation_created",
    notes: "Legacy escalation path without explicit paused checkpoint.",
  },
] as const;

function buildTransitionRuleKey(args: {
  from: AgentLifecycleState;
  to: AgentLifecycleState;
  actor: AgentLifecycleActor;
  checkpoint: AgentLifecycleCheckpoint;
}): string {
  return `${args.from}:${args.to}:${args.actor}:${args.checkpoint}`;
}

const AGENT_LIFECYCLE_TRANSITION_RULE_SET = new Set(
  AGENT_LIFECYCLE_TRANSITION_RULES.map((rule) => buildTransitionRuleKey(rule)),
);

export function isAgentLifecycleState(value: string): value is AgentLifecycleState {
  return (AGENT_LIFECYCLE_STATE_VALUES as readonly string[]).includes(value);
}

function normalizeLifecycleReasonKey(reason?: string): string {
  if (typeof reason !== "string") {
    return "";
  }
  return reason.trim().toLowerCase();
}

export function resolveEscalationGateForLifecycleTransition(args: {
  checkpoint: AgentLifecycleCheckpoint;
  reason?: string;
}): AgentEscalationGate {
  if (args.checkpoint !== "escalation_detected" && args.checkpoint !== "escalation_created") {
    return "not_applicable";
  }

  const reasonKey = normalizeLifecycleReasonKey(args.reason);
  if (!reasonKey) {
    return "not_applicable";
  }

  if (
    TOOL_FAILURE_ESCALATION_TRIGGER_TYPES.has(reasonKey)
    || reasonKey.includes("tool_failure")
    || reasonKey.includes("tool failure")
  ) {
    return "tool_failure";
  }

  if (
    POST_LLM_ESCALATION_TRIGGER_TYPES.has(reasonKey)
    || reasonKey.includes("uncertainty")
    || reasonKey.includes("response_loop")
    || reasonKey.includes("response loop")
  ) {
    return "post_llm";
  }

  if (PRE_LLM_ESCALATION_TRIGGER_TYPES.has(reasonKey)) {
    return "pre_llm";
  }

  return "not_applicable";
}

export function resolveSessionLifecycleState(session: {
  lifecycleState?: string;
  status?: string;
  escalationState?: { status?: string } | null;
}): AgentLifecycleState {
  if (typeof session.lifecycleState === "string" && isAgentLifecycleState(session.lifecycleState)) {
    return session.lifecycleState;
  }

  const escalationStatus = session.escalationState?.status;
  if (escalationStatus === "taken_over" || session.status === "handed_off") {
    return "takeover";
  }
  if (escalationStatus === "pending") {
    return "escalated";
  }
  if (
    escalationStatus === "resolved"
    || escalationStatus === "dismissed"
    || escalationStatus === "timed_out"
  ) {
    return "resolved";
  }

  return "active";
}

export function isAllowedLifecycleTransition(args: {
  from: AgentLifecycleState;
  to: AgentLifecycleState;
  actor: AgentLifecycleActor;
  checkpoint: AgentLifecycleCheckpoint;
}): boolean {
  return AGENT_LIFECYCLE_TRANSITION_RULE_SET.has(buildTransitionRuleKey(args));
}

export function assertLifecycleTransition(args: {
  from: AgentLifecycleState;
  to: AgentLifecycleState;
  actor: AgentLifecycleActor;
  checkpoint: AgentLifecycleCheckpoint;
}) {
  if (!isAllowedLifecycleTransition(args)) {
    throw new Error(
      `Invalid lifecycle transition ${args.from} -> ${args.to} by ${args.actor} at ${args.checkpoint}`,
    );
  }
}

function resolveTrustActorType(actor: AgentLifecycleActor):
  | "agent"
  | "user"
  | "system" {
  if (actor === "agent") {
    return "agent";
  }
  if (actor === "operator") {
    return "user";
  }
  return "system";
}

function resolveLifecycleTransitionReason(reason?: string): string {
  if (typeof reason === "string" && reason.trim().length > 0) {
    return reason.trim();
  }
  return "unspecified";
}

function buildLifecycleTrustPayload(args: {
  occurredAt: number;
  organizationId: Id<"organizations">;
  sessionId: string;
  channel: string;
  actor: AgentLifecycleActor;
  actorId: string;
  fromState: AgentLifecycleState;
  toState: AgentLifecycleState;
  checkpoint: AgentLifecycleCheckpoint;
  reason?: string;
}): TrustEventPayload {
  return {
    event_id: `trust.lifecycle.transition_checkpoint.v1:${args.sessionId}:${args.occurredAt}`,
    event_version: TRUST_EVENT_TAXONOMY_VERSION,
    occurred_at: args.occurredAt,
    org_id: args.organizationId,
    mode: "lifecycle",
    channel: args.channel,
    session_id: args.sessionId,
    actor_type: resolveTrustActorType(args.actor),
    actor_id: args.actorId,
    lifecycle_state_from: args.fromState,
    lifecycle_state_to: args.toState,
    lifecycle_checkpoint: args.checkpoint,
    lifecycle_transition_actor: args.actor,
    lifecycle_transition_reason: resolveLifecycleTransitionReason(args.reason),
  };
}

export const recordLifecycleTransition = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    fromState: agentLifecycleStateValidator,
    toState: agentLifecycleStateValidator,
    actor: agentLifecycleActorValidator,
    checkpoint: agentLifecycleCheckpointValidator,
    actorId: v.optional(v.string()),
    reason: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    assertLifecycleTransition({
      from: args.fromState,
      to: args.toState,
      actor: args.actor,
      checkpoint: args.checkpoint,
    });

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { success: false, error: "session_not_found" as const };
    }

    const observedState = resolveSessionLifecycleState(session);
    if (observedState === args.toState) {
      return {
        success: true,
        noOp: true,
        fromState: observedState,
        toState: args.toState,
      };
    }

    const now = Date.now();
    await ctx.db.patch(args.sessionId, {
      lifecycleState: args.toState,
      lifecycleCheckpoint: args.checkpoint,
      lifecycleUpdatedAt: now,
      lifecycleUpdatedBy: args.actor,
    });

    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: session.agentId,
      actionType: "lifecycle_transition_recorded",
      actionData: {
        sessionId: args.sessionId,
        expectedFromState: args.fromState,
        observedFromState: observedState,
        toState: args.toState,
        actor: args.actor,
        actorId: args.actorId,
        checkpoint: args.checkpoint,
        reason: args.reason,
        metadata: args.metadata,
      },
      performedAt: now,
    });

    const payload = buildLifecycleTrustPayload({
      occurredAt: now,
      organizationId: session.organizationId,
      sessionId: args.sessionId,
      channel: session.channel || "runtime",
      actor: args.actor,
      actorId: args.actorId || args.actor,
      fromState: args.fromState,
      toState: args.toState,
      checkpoint: args.checkpoint,
      reason: args.reason,
    });

    const validation = validateTrustEventPayload(
      "trust.lifecycle.transition_checkpoint.v1",
      payload,
    );

    await ctx.db.insert("aiTrustEvents", {
      event_name: "trust.lifecycle.transition_checkpoint.v1",
      payload,
      schema_validation_status: validation.ok ? "passed" : "failed",
      schema_errors: validation.ok ? undefined : validation.errors,
      created_at: now,
    });

    return {
      success: true,
      noOp: false,
      expectedFromState: args.fromState,
      observedFromState: observedState,
      toState: args.toState,
      telemetryNamespace: `${TRUST_EVENT_NAMESPACE}.lifecycle`,
    };
  },
});
