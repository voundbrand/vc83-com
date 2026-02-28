"use client";

/**
 * Agent sessions viewer tab.
 * Split view: session list (left) + conversation messages (right).
 */

import { useEffect, useState } from "react";
import { MessageSquare, User, Bot, PhoneForwarded, Mail, PhoneCall, AlertTriangle } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { buildSessionHandoffPayload } from "./session-handoff";

const generatedApi = (
  require("../../../../convex/_generated/api")
).api;

interface AgentSessionsViewerProps {
  agentId: Id<"objects">;
  sessionId: string;
  organizationId: Id<"organizations">;
}

interface AgentSessionListItem {
  _id: Id<"agentSessions">;
  agentId: Id<"objects">;
  externalContactIdentifier: string;
  channel: string;
  messageCount: number;
  costUsd?: number;
  lastMessageAt: number;
}

interface SessionMessageItem {
  _id: string;
  role: "assistant" | "user" | "system";
  content: string;
  timestamp: number;
  agentName?: string;
}

interface OperatorTimelineCard {
  id: string;
  missionId: string;
  attemptId: string;
  bookingId?: string;
  channel: string;
  attemptIndex?: number;
  reasonCode?: string;
  status: string;
  result?: string;
  requestedAt?: number;
  completedAt?: number;
  failureReason?: string;
  telephonyOutcome?: string;
  telephonyDisposition?: string;
  voicemailDetected?: boolean;
  transcriptSnippet?: string;
  redacted: boolean;
}

interface ConversationTimelinePayload {
  timelineCards: OperatorTimelineCard[];
  total: number;
}

function humanizeToken(value?: string): string {
  if (!value) {
    return "n/a";
  }
  return value
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function formatTimelineTimestamp(card: OperatorTimelineCard): string {
  const timestamp = card.completedAt || card.requestedAt;
  if (!timestamp) {
    return "No timestamp";
  }
  return new Date(timestamp).toLocaleString();
}

export function AgentSessionsViewer({ agentId, sessionId, organizationId }: AgentSessionsViewerProps) {
  const [selectedSession, setSelectedSession] = useState<Id<"agentSessions"> | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [handOffToUserId, setHandOffToUserId] = useState<string>("");
  const [isHandingOff, setIsHandingOff] = useState(false);
  const [handOffError, setHandOffError] = useState<string | null>(null);

  const sessions = useQuery(generatedApi.ai.agentSessions.getActiveSessions, {
    sessionId, organizationId, status: statusFilter,
  }) as AgentSessionListItem[] | undefined;

  // Filter to this agent's sessions
  const agentSessions = sessions?.filter((s) => s.agentId === agentId) || [];

  const messages = useQuery(
    generatedApi.ai.agentSessions.getSessionMessagesAuth,
    selectedSession ? { sessionId, agentSessionId: selectedSession, limit: 50 } : "skip",
  ) as SessionMessageItem[] | undefined;
  const outreachTimeline = useQuery(
    generatedApi.api.v1.conversationsInternal.getConversationTimelineCardsAuth,
    selectedSession
      ? { sessionId, organizationId, agentSessionId: selectedSession, limit: 12 }
      : "skip",
  ) as ConversationTimelinePayload | undefined;

  const handoffCandidates = useQuery(generatedApi.projectOntology.getOrganizationUsers, {
    sessionId,
    organizationId,
  }) as Array<{
    _id: Id<"users">;
    email: string;
    firstName?: string;
    lastName?: string;
  }> | undefined;

  const handOffSession = useMutation(generatedApi.ai.agentSessions.handOffSession);

  useEffect(() => {
    const candidateIds = (handoffCandidates || []).map((candidate) => String(candidate._id));
    if (candidateIds.length === 0) {
      if (handOffToUserId !== "") {
        setHandOffToUserId("");
      }
      return;
    }

    if (!candidateIds.includes(handOffToUserId)) {
      setHandOffToUserId(candidateIds[0]);
    }
  }, [handoffCandidates, handOffToUserId]);

  const handleHandOff = async () => {
    const payload = buildSessionHandoffPayload({
      sessionId,
      agentSessionId: selectedSession,
      handOffToUserId,
    });

    if (!payload) {
      setHandOffError("Select a team member before handing off.");
      return;
    }

    setHandOffError(null);
    setIsHandingOff(true);
    try {
      await handOffSession(payload);
      setSelectedSession(null);
    } catch (error) {
      setHandOffError(error instanceof Error ? error.message : "Failed to hand off session.");
    } finally {
      setIsHandingOff(false);
    }
  };

  return (
    <div className="flex h-full" style={{ minHeight: 400 }}>
      {/* Session list */}
      <div
        className="w-72 flex-shrink-0 border-r-2 flex flex-col overflow-hidden"
        style={{ borderColor: "var(--win95-border)" }}
      >
        {/* Filter */}
        <div className="px-3 py-2 border-b" style={{ borderColor: "var(--win95-border)" }}>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setSelectedSession(null); }}
            className="w-full border px-2 py-1 text-[11px]"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="handed_off">Handed Off</option>
          </select>
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto">
          {agentSessions.length === 0 && (
            <div className="p-4 text-center">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                No {statusFilter} sessions
              </p>
            </div>
          )}

          {agentSessions.map((session) => (
            <button
              key={session._id}
              onClick={() => setSelectedSession(session._id)}
              className="w-full text-left px-3 py-2 border-b transition-colors"
              style={{
                borderColor: "var(--win95-border)",
                background: selectedSession === session._id ? "var(--win95-bg-light)" : "transparent",
                color: "var(--win95-text)",
                boxShadow: selectedSession === session._id ? "inset 2px 0 0 var(--win95-border-light)" : "none",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium truncate">
                  {session.externalContactIdentifier}
                </span>
              </div>
              <div
                className="flex items-center gap-2 mt-0.5 text-[10px]"
                style={{ color: selectedSession === session._id ? "var(--win95-text-secondary)" : "var(--neutral-gray)" }}
              >
                <span>{session.channel}</span>
                <span>·</span>
                <span>{session.messageCount} msgs</span>
                <span>·</span>
                <span>${session.costUsd?.toFixed(3)}</span>
              </div>
              <div
                className="text-[9px] mt-0.5"
                style={{ color: selectedSession === session._id ? "var(--win95-text-secondary)" : "var(--neutral-gray)" }}
              >
                {new Date(session.lastMessageAt).toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation viewer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedSession && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Select a session to view the conversation
            </p>
          </div>
        )}

        {selectedSession && (
          <>
            {/* Session actions bar */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b"
              style={{ borderColor: "var(--win95-border)" }}>
              <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                {messages?.length || 0} messages
              </span>
              {statusFilter === "active" && (
                <div className="flex items-center gap-2">
                  <select
                    value={handOffToUserId}
                    onChange={(event) => {
                      setHandOffToUserId(event.target.value);
                      setHandOffError(null);
                    }}
                    disabled={isHandingOff || !handoffCandidates || handoffCandidates.length === 0}
                    className="border px-1.5 py-0.5 text-[10px] max-w-[220px]"
                    style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}
                  >
                    {(handoffCandidates || []).map((candidate) => {
                      const fullName = `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim();
                      const label = fullName ? `${fullName} (${candidate.email})` : candidate.email;
                      return (
                        <option key={candidate._id} value={candidate._id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    onClick={() => {
                      void handleHandOff();
                    }}
                    disabled={isHandingOff || !handOffToUserId}
                    className="flex items-center gap-1 px-2 py-0.5 border text-[10px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-50"
                    style={{ borderColor: "var(--win95-border)" }}>
                    <PhoneForwarded size={10} />
                    {isHandingOff ? "Handing Off..." : "Hand Off"}
                  </button>
                </div>
              )}
            </div>
            {statusFilter === "active" && handOffError && (
              <div className="px-3 py-1 border-b text-[10px]" style={{ borderColor: "var(--win95-border)", color: "#b42318" }}>
                {handOffError}
              </div>
            )}

            <div className="px-3 py-2 border-b" style={{ borderColor: "var(--win95-border)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold" style={{ color: "var(--win95-text)" }}>
                  Outreach Timeline
                </span>
                <span className="text-[9px]" style={{ color: "var(--neutral-gray)" }}>
                  {outreachTimeline?.total || 0} attempts
                </span>
              </div>
              {outreachTimeline === undefined && (
                <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
                  Loading outreach timeline...
                </p>
              )}
              {outreachTimeline && outreachTimeline.timelineCards.length === 0 && (
                <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
                  No outreach/call attempts captured for this conversation.
                </p>
              )}
              {outreachTimeline && outreachTimeline.timelineCards.length > 0 && (
                <div className="mt-1.5 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {outreachTimeline.timelineCards.map((card) => {
                    const ChannelIcon =
                      card.channel === "phone_call"
                        ? PhoneCall
                        : card.channel === "email"
                          ? Mail
                          : MessageSquare;
                    const hasFailure = Boolean(card.failureReason);
                    return (
                      <div
                        key={card.id}
                        className="border px-2 py-1.5 text-[10px]"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-bg-light, #fff)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <ChannelIcon size={10} />
                            <span className="font-semibold">
                              Attempt {card.attemptIndex || "?"} · {humanizeToken(card.channel)}
                            </span>
                          </div>
                          <span style={{ color: "var(--neutral-gray)" }}>
                            {formatTimelineTimestamp(card)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2" style={{ color: "var(--neutral-gray)" }}>
                          <span>Reason: {humanizeToken(card.reasonCode)}</span>
                          <span>·</span>
                          <span>Status: {humanizeToken(card.status)}</span>
                          {card.result && (
                            <>
                              <span>·</span>
                              <span>Result: {humanizeToken(card.result)}</span>
                            </>
                          )}
                        </div>
                        {hasFailure && (
                          <div className="mt-1 flex items-start gap-1.5" style={{ color: "#b42318" }}>
                            <AlertTriangle size={10} className="mt-[1px] flex-shrink-0" />
                            <span>Failure reason: {humanizeToken(card.failureReason)}</span>
                          </div>
                        )}
                        {card.transcriptSnippet && (
                          <div
                            className="mt-1 border px-1.5 py-1 italic"
                            style={{
                              borderColor: "var(--win95-border)",
                              background: "var(--win95-bg-dark, #e0e0e0)",
                              color: "var(--win95-text-secondary)",
                            }}
                          >
                            “{card.transcriptSnippet}”
                          </div>
                        )}
                        <div className="mt-1 text-[9px]" style={{ color: "var(--neutral-gray)" }}>
                          {card.redacted ? "PII redacted by default." : "Raw transcript."}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {(!messages || messages.length === 0) && (
                <p className="text-[11px] text-center py-8" style={{ color: "var(--neutral-gray)" }}>
                  No messages yet
                </p>
              )}

              {messages?.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex gap-2 ${msg.role === "assistant" ? "justify-start" : msg.role === "user" ? "justify-end" : "justify-center"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--win95-bg-dark)" }}>
                      <Bot size={12} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded text-xs ${
                      msg.role === "system" ? "text-center italic" : ""
                    }`}
                    style={{
                      background: msg.role === "assistant" ? "var(--win95-bg-light, #fff)"
                        : msg.role === "user" ? "var(--win95-bg-dark)"
                        : "var(--win95-bg-dark, #e0e0e0)",
                      color: "var(--win95-text)",
                      border: "1px solid var(--win95-border)",
                      boxShadow: msg.role === "user" ? "inset -2px 0 0 var(--win95-border-light)" : "none",
                    }}
                  >
                    {msg.agentName && msg.role === "assistant" && (
                      <div className="text-[10px] font-medium mb-0.5" style={{ color: "var(--win95-text-secondary)" }}>
                        {msg.agentName}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    <div className="text-[9px] mt-1 opacity-60">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--neutral-gray)" }}>
                      <User size={12} className="text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
