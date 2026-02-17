"use client";

/**
 * Agent sessions viewer tab.
 * Split view: session list (left) + conversation messages (right).
 */

import { useState } from "react";
import { MessageSquare, User, Bot, PhoneForwarded } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface AgentSessionsViewerProps {
  agentId: Id<"objects">;
  sessionId: string;
  organizationId: Id<"organizations">;
}

export function AgentSessionsViewer({ agentId, sessionId, organizationId }: AgentSessionsViewerProps) {
  const [selectedSession, setSelectedSession] = useState<Id<"agentSessions"> | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("active");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions = useQuery(api.ai.agentSessions.getActiveSessions, {
    sessionId, organizationId, status: statusFilter,
  }) as any[] | undefined;

  // Filter to this agent's sessions
  const agentSessions = sessions?.filter((s) => s.agentId === agentId) || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = useQuery(
    selectedSession ? api.ai.agentSessions.getSessionMessagesAuth : ("skip" as any),
    selectedSession ? { sessionId, agentSessionId: selectedSession, limit: 50 } : undefined,
  ) as any[] | undefined;

  const handOffSession = useMutation(api.ai.agentSessions.handOffSession);

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
                <button
                  onClick={() => handOffSession({ sessionId, agentSessionId: selectedSession, handOffToUserId: "" as Id<"users"> })}
                  className="flex items-center gap-1 px-2 py-0.5 border text-[10px] hover:bg-yellow-50"
                  style={{ borderColor: "var(--win95-border)" }}>
                  <PhoneForwarded size={10} /> Hand Off
                </button>
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
