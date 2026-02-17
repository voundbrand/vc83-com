"use client";

/**
 * Agent detail panel with tabbed interface.
 * Renders agent header + tab bar + active sub-component.
 */

import { useState } from "react";
import {
  Play, Pause, Settings, Trash2, CheckCircle, XCircle,
  Brain, Wrench, MessageSquare, Shield, BarChart3, AlertTriangle,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { AgentTab, AgentCustomProps } from "./types";
import { AgentSoulEditor } from "./agent-soul-editor";
import { AgentToolsConfig } from "./agent-tools-config";
import { AgentSessionsViewer } from "./agent-sessions-viewer";
import { AgentApprovalQueue } from "./agent-approval-queue";
import { AgentEscalationQueue } from "./agent-escalation-queue";
import { AgentAnalytics } from "./agent-analytics";

interface AgentDetailPanelProps {
  agentId: Id<"objects">;
  sessionId: string;
  organizationId: Id<"organizations">;
  activeTab: AgentTab;
  onTabChange: (tab: AgentTab) => void;
  onEdit: () => void;
}

const TABS: Array<{ id: AgentTab; label: string; icon: React.ReactNode }> = [
  { id: "soul", label: "Soul", icon: <Brain size={12} /> },
  { id: "tools", label: "Tools", icon: <Wrench size={12} /> },
  { id: "sessions", label: "Sessions", icon: <MessageSquare size={12} /> },
  { id: "approvals", label: "Approvals", icon: <Shield size={12} /> },
  { id: "escalations", label: "Escalations", icon: <AlertTriangle size={12} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 size={12} /> },
];

export function AgentDetailPanel({
  agentId,
  sessionId,
  organizationId,
  activeTab,
  onTabChange,
  onEdit,
}: AgentDetailPanelProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agent = useQuery(api.agentOntology.getAgent, { sessionId, agentId }) as any | undefined;
  const activateAgent = useMutation(api.agentOntology.activateAgent);
  const pauseAgent = useMutation(api.agentOntology.pauseAgent);
  const deleteAgent = useMutation(api.agentOntology.deleteAgent);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!agent) {
    return (
      <div className="p-4 text-xs" style={{ color: "var(--window-document-text)" }}>
        Loading agent...
      </div>
    );
  }

  const props = (agent.customProperties || {}) as AgentCustomProps;

  return (
    <div className="flex flex-col h-full">
      {/* Agent header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{
              background:
                agent.status === "active" ? "#22c55e" :
                agent.status === "draft" ? "#eab308" :
                agent.status === "paused" ? "#ef4444" : "#9ca3af",
            }}
          />
          <div>
            <h2 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
              {props.displayName || agent.name}
            </h2>
            <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
              <span>{agent.subtype?.replace(/_/g, " ")}</span>
              <span>·</span>
              <span>{agent.status}</span>
              <span>·</span>
              <span>{props.modelId?.split("/").pop() || "claude-sonnet-4"}</span>
            </div>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1.5">
          {agent.status === "active" ? (
            <button
              onClick={() => pauseAgent({ sessionId, agentId })}
              className="flex items-center gap-1 px-2 py-1 border text-[10px] transition-colors"
              style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
            >
              <Pause size={10} /> Pause
            </button>
          ) : (
            <button
              onClick={() => activateAgent({ sessionId, agentId })}
              className="flex items-center gap-1 px-2 py-1 border text-[10px] transition-colors"
              style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
            >
              <Play size={10} /> Activate
            </button>
          )}
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-2 py-1 border text-[10px] transition-colors"
            style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
          >
            <Settings size={10} /> Edit
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  deleteAgent({ sessionId, agentId });
                  setConfirmDelete(false);
                }}
                className="p-1 border bg-red-100 hover:bg-red-200 text-red-600"
                style={{ borderColor: "var(--window-document-border)" }}
              >
                <CheckCircle size={10} />
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="p-1 border hover:bg-gray-50"
                style={{ borderColor: "var(--window-document-border)" }}
              >
                <XCircle size={10} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1 border text-[10px] hover:bg-red-50"
              style={{ borderColor: "var(--window-document-border)" }}
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="flex border-b"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border-r transition-colors"
            style={{
              borderColor: "var(--window-document-border)",
              background: activeTab === tab.id ? "var(--desktop-shell-accent)" : "var(--desktop-shell-accent)",
              color: "var(--window-document-text)",
              borderBottom: activeTab === tab.id ? "1px solid var(--desktop-shell-accent)" : "none",
              marginBottom: activeTab === tab.id ? "-1px" : "0",
              boxShadow: activeTab === tab.id ? "inset 0 1px 0 var(--window-document-border)" : "none",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "soul" && (
          <AgentSoulEditor agentId={agentId} sessionId={sessionId} organizationId={organizationId} />
        )}
        {activeTab === "tools" && (
          <AgentToolsConfig agentId={agentId} sessionId={sessionId} organizationId={organizationId} />
        )}
        {activeTab === "sessions" && (
          <AgentSessionsViewer agentId={agentId} sessionId={sessionId} organizationId={organizationId} />
        )}
        {activeTab === "approvals" && (
          <AgentApprovalQueue agentId={agentId} sessionId={sessionId} organizationId={organizationId} />
        )}
        {activeTab === "escalations" && (
          <AgentEscalationQueue sessionId={sessionId} organizationId={organizationId} />
        )}
        {activeTab === "analytics" && (
          <AgentAnalytics agentId={agentId} sessionId={sessionId} organizationId={organizationId} />
        )}
      </div>
    </div>
  );
}
