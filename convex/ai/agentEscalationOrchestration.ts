import type { Id } from "../_generated/dataModel";

type EscalationUrgency = "low" | "normal" | "high";

export interface EscalationTriggerDetails {
  reason: string;
  urgency: EscalationUrgency;
  triggerType: string;
}

interface EscalationNotificationPayload {
  sessionId: Id<"agentSessions">;
  organizationId: Id<"organizations">;
  agentName: string;
  reason: string;
  urgency: EscalationUrgency;
  contactIdentifier: string;
  channel: string;
  lastMessage: string;
}

interface EscalationRetryPayload {
  sessionId: Id<"agentSessions">;
  organizationId: Id<"organizations">;
  agentName: string;
  reason: string;
  contactIdentifier: string;
  channel: string;
  lastMessage: string;
}

export function resolveEscalationAgentName(agent: {
  name?: string;
  customProperties?: unknown;
}): string {
  const displayName = (agent.customProperties as { displayName?: string } | undefined)
    ?.displayName;
  if (typeof displayName === "string" && displayName.trim().length > 0) {
    return displayName.trim();
  }
  if (typeof agent.name === "string" && agent.name.trim().length > 0) {
    return agent.name.trim();
  }
  return "Agent";
}

export async function recordEscalationCheckpoint(args: {
  turnId: Id<"agentTurns">;
  checkpoint: string;
  triggerType?: string;
  urgency?: EscalationUrgency;
  recordTurnTransition: (args: {
    turnId: Id<"agentTurns">;
    transition: "escalation_started";
    metadata: Record<string, unknown>;
  }) => Promise<void>;
  onRecordError?: (error: unknown) => void;
}): Promise<void> {
  try {
    await args.recordTurnTransition({
      turnId: args.turnId,
      transition: "escalation_started",
      metadata: {
        checkpoint: args.checkpoint,
        triggerType: args.triggerType,
        urgency: args.urgency,
      },
    });
  } catch (error) {
    args.onRecordError?.(error);
  }
}

export async function createAndDispatchEscalation(args: {
  sessionId: Id<"agentSessions">;
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
  turnId: Id<"agentTurns">;
  trigger: EscalationTriggerDetails;
  checkpoint: string;
  contactIdentifier: string;
  channel: string;
  lastMessage: string;
  agentName: string;
  createEscalation: (args: {
    sessionId: Id<"agentSessions">;
    agentId: Id<"objects">;
    organizationId: Id<"organizations">;
    reason: string;
    urgency: EscalationUrgency;
    triggerType: string;
  }) => Promise<void>;
  recordTurnTransition: (args: {
    turnId: Id<"agentTurns">;
    transition: "escalation_started";
    metadata: Record<string, unknown>;
  }) => Promise<void>;
  notifyTelegram: (args: EscalationNotificationPayload) => void;
  notifyPushover: (args: Omit<EscalationNotificationPayload, "sessionId" | "lastMessage">) => void;
  notifyEmail: (args: Omit<EscalationNotificationPayload, "sessionId">) => void;
  notifyHighUrgencyRetry: (args: EscalationRetryPayload) => void;
  onTransitionError?: (error: unknown) => void;
}): Promise<void> {
  await args.createEscalation({
    sessionId: args.sessionId,
    agentId: args.agentId,
    organizationId: args.organizationId,
    reason: args.trigger.reason,
    urgency: args.trigger.urgency,
    triggerType: args.trigger.triggerType,
  });

  await recordEscalationCheckpoint({
    turnId: args.turnId,
    checkpoint: args.checkpoint,
    triggerType: args.trigger.triggerType,
    urgency: args.trigger.urgency,
    recordTurnTransition: args.recordTurnTransition,
    onRecordError: args.onTransitionError,
  });

  args.notifyTelegram({
    sessionId: args.sessionId,
    organizationId: args.organizationId,
    agentName: args.agentName,
    reason: args.trigger.reason,
    urgency: args.trigger.urgency,
    contactIdentifier: args.contactIdentifier,
    channel: args.channel,
    lastMessage: args.lastMessage,
  });
  args.notifyPushover({
    organizationId: args.organizationId,
    agentName: args.agentName,
    reason: args.trigger.reason,
    urgency: args.trigger.urgency,
    contactIdentifier: args.contactIdentifier,
    channel: args.channel,
  });
  args.notifyEmail({
    organizationId: args.organizationId,
    agentName: args.agentName,
    reason: args.trigger.reason,
    urgency: args.trigger.urgency,
    contactIdentifier: args.contactIdentifier,
    channel: args.channel,
    lastMessage: args.lastMessage,
  });

  if (args.trigger.urgency === "high") {
    args.notifyHighUrgencyRetry({
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      agentName: args.agentName,
      reason: args.trigger.reason,
      contactIdentifier: args.contactIdentifier,
      channel: args.channel,
      lastMessage: args.lastMessage,
    });
  }
}
