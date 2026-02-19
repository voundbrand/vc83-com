import type { Id } from "../../../../convex/_generated/dataModel";

export type SessionHandoffPayload = {
  sessionId: string;
  agentSessionId: Id<"agentSessions">;
  handOffToUserId: Id<"users">;
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
