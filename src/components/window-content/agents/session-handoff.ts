import type { Id } from "../../../../convex/_generated/dataModel";

export type SessionHandoffPayload = {
  sessionId: string;
  agentSessionId: Id<"agentSessions">;
  handOffToUserId: Id<"users">;
};

export type ActionItemTakeoverContext = {
  takeoverRequired: boolean;
  takeoverReason: string | null;
  escalatedAt: number | null;
  sessionId: string | null;
};

export function buildSessionHandoffPayload(args: {
  sessionId: string;
  agentSessionId: Id<"agentSessions"> | null;
  handOffToUserId: string;
}): SessionHandoffPayload | null {
  const normalizedSessionId = args.sessionId.trim();
  const normalizedUserId = args.handOffToUserId.trim();

  if (!normalizedSessionId || !args.agentSessionId || !normalizedUserId) {
    return null;
  }

  return {
    sessionId: normalizedSessionId,
    agentSessionId: args.agentSessionId,
    handOffToUserId: normalizedUserId as Id<"users">,
  };
}

export function resolveActionItemTakeoverContext(args: {
  takeoverRequired?: boolean | null;
  takeoverReason?: string | null;
  escalatedAt?: number | null;
  sourceSessionId?: string | null;
}): ActionItemTakeoverContext {
  return {
    takeoverRequired: args.takeoverRequired === true,
    takeoverReason:
      typeof args.takeoverReason === "string" && args.takeoverReason.trim().length > 0
        ? args.takeoverReason.trim()
        : null,
    escalatedAt:
      typeof args.escalatedAt === "number" && Number.isFinite(args.escalatedAt)
        ? args.escalatedAt
        : null,
    sessionId:
      typeof args.sourceSessionId === "string" && args.sourceSessionId.trim().length > 0
        ? args.sourceSessionId.trim()
        : null,
  };
}
