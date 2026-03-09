"use client";

/**
 * Agent detail panel with tabbed interface.
 * Renders agent header + tab bar + active sub-component.
 */

import React, { useState } from "react";
import {
  Activity,
  Sparkles,
  Crown,
  Play, Pause, Settings, Trash2, CheckCircle, XCircle,
  Brain, Wrench, MessageSquare, Shield, BarChart3, AlertTriangle, Bug,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  type AgentTab,
  type AgentCustomProps,
  resolveTemplateLineage,
} from "./types";
import { AgentSoulEditor } from "./agent-soul-editor";
import { AgentToolsConfig } from "./agent-tools-config";
import { AgentSessionsViewer } from "./agent-sessions-viewer";
import { AgentApprovalQueue } from "./agent-approval-queue";
import { AgentEscalationQueue } from "./agent-escalation-queue";
import { AgentAnalytics } from "./agent-analytics";
import { AgentDebugEvents } from "./agent-debug-events";
import { AgentTrustCockpit } from "./agent-trust-cockpit";
import {
  canMakePrimaryInUi,
  canPauseAgentInUi,
  countActiveAgents,
  isPrimaryAgentRecord,
} from "./primary-agent-ui";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../../convex/_generated/api") as { api: any };

interface AgentDetailPanelProps {
  agentId: Id<"objects">;
  sessionId: string;
  organizationId: Id<"organizations">;
  activeTab: AgentTab;
  onTabChange: (tab: AgentTab) => void;
  onEdit: () => void;
  onOpenAgentOps?: () => void;
  onOpenAgentCatalog?: () => void;
}

const TABS: Array<{ id: AgentTab; label: string; icon: React.ReactNode }> = [
  { id: "trust", label: "Trust", icon: <Shield size={12} /> },
  { id: "soul", label: "Soul", icon: <Brain size={12} /> },
  { id: "tools", label: "Tools", icon: <Wrench size={12} /> },
  { id: "sessions", label: "Sessions", icon: <MessageSquare size={12} /> },
  { id: "approvals", label: "Approvals", icon: <Shield size={12} /> },
  { id: "escalations", label: "Escalations", icon: <AlertTriangle size={12} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 size={12} /> },
  { id: "debug", label: "Debug", icon: <Bug size={12} /> },
];

export function AgentDetailPanel({
  agentId,
  sessionId,
  organizationId,
  activeTab,
  onTabChange,
  onEdit,
  onOpenAgentOps,
  onOpenAgentCatalog,
}: AgentDetailPanelProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agent = useQuery(apiAny.agentOntology.getAgent, { sessionId, agentId }) as any | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allAgents = useQuery(apiAny.agentOntology.getAgents, { sessionId, organizationId }) as any[] | undefined;
  const activateAgent = useMutation(apiAny.agentOntology.activateAgent);
  const pauseAgent = useMutation(apiAny.agentOntology.pauseAgent);
  const setPrimaryAgent = useMutation(apiAny.agentOntology.setPrimaryAgent);
  const deleteAgent = useMutation(apiAny.agentOntology.deleteAgent);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!agent) {
    return (
      <div className="p-4 text-xs" style={{ color: "var(--window-document-text)" }}>
        Loading agent...
      </div>
    );
  }

  const props = (agent.customProperties || {}) as AgentCustomProps;
  const templateLineage = resolveTemplateLineage(props);
  const isPrimary = isPrimaryAgentRecord(agent);
  const activeAgentCount = countActiveAgents(allAgents || [agent]);
  const canPause = canPauseAgentInUi(agent, activeAgentCount);
  const canMakePrimary = canMakePrimaryInUi(agent);

  return (
    <div className="flex flex-col h-full">
      {/* Agent header */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        {/* Row 1: Name + actions */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                background:
                  agent.status === "active" ? "#22c55e" :
                  agent.status === "draft" ? "#eab308" :
                  agent.status === "paused" ? "#ef4444" : "#9ca3af",
              }}
            />
            <h2 className="text-sm font-bold leading-tight" style={{ color: "var(--window-document-text)" }}>
              {props.displayName || agent.name}
            </h2>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {onOpenAgentOps && (
              <button
                onClick={onOpenAgentOps}
                className="flex items-center gap-1 px-2 py-1 border text-[10px] transition-colors rounded-sm"
                style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
                title="Open Agent Ops"
              >
                <Activity size={10} /> Ops
              </button>
            )}
            {onOpenAgentCatalog && (
              <button
                onClick={onOpenAgentCatalog}
                className="flex items-center gap-1 px-2 py-1 border text-[10px] transition-colors rounded-sm"
                style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
                title="Open Agent Catalog"
              >
                <Sparkles size={10} /> Catalog
              </button>
            )}
            <div
              className="w-px h-4 mx-0.5"
              style={{ background: "var(--window-document-border)" }}
            />
            {agent.status === "active" ? (
              <button
                onClick={() => {
                  if (!canPause) return;
                  void pauseAgent({ sessionId, agentId });
                }}
                disabled={!canPause}
                className="flex items-center gap-1 px-2 py-1 border text-[10px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed rounded-sm"
                style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
                title={canPause ? "Pause agent" : "Primary agent cannot be paused while it is the only active agent"}
              >
                <Pause size={10} /> Pause
              </button>
            ) : (
              <button
                onClick={() => void activateAgent({ sessionId, agentId })}
                className="flex items-center gap-1 px-2 py-1 border text-[10px] transition-colors rounded-sm"
                style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
              >
                <Play size={10} /> Activate
              </button>
            )}
            {canMakePrimary && (
              <button
                onClick={() => void setPrimaryAgent({ sessionId, agentId, reason: "agents_window_detail_make_primary" })}
                className="flex items-center gap-1 px-2 py-1 border text-[10px] transition-colors rounded-sm"
                style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
                title="Make Primary"
              >
                <Crown size={10} /> Primary
              </button>
            )}
            <button
              onClick={onEdit}
              className="flex items-center gap-1 px-2 py-1 border text-[10px] transition-colors rounded-sm"
              style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
            >
              <Settings size={10} /> Edit
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => { deleteAgent({ sessionId, agentId }); setConfirmDelete(false); }}
                  className="p-1 border bg-red-100 hover:bg-red-200 text-red-600 rounded-sm"
                  style={{ borderColor: "var(--window-document-border)" }}
                >
                  <CheckCircle size={10} />
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="p-1 border transition-opacity hover:opacity-80 rounded-sm"
                  style={{ borderColor: "var(--window-document-border)" }}
                >
                  <XCircle size={10} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1 border text-[10px] hover:bg-red-50 rounded-sm"
                style={{ borderColor: "var(--window-document-border)" }}
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Metadata chips */}
        <div className="flex items-center gap-1.5 ml-5 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
          <span>{agent.subtype?.replace(/_/g, " ")}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{agent.status}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{props.modelId?.split("/").pop() || "claude-sonnet-4"}</span>
          {isPrimary && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span
                className="px-1 py-px rounded"
                style={{ background: "var(--warning)", color: "#111827" }}
              >
                primary
              </span>
            </>
          )}
          {templateLineage.isTemplateLinked && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span
                className="px-1 py-px rounded border"
                style={{ borderColor: "var(--window-document-border)" }}
                title={`Source: ${templateLineage.sourceTemplateId || "unknown"}\nVersion: ${templateLineage.sourceTemplateVersion || "unknown"}`}
              >
                template linked
              </span>
              {templateLineage.cloneLifecycleState && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>{templateLineage.cloneLifecycleState.replace(/_/g, " ")}</span>
                </>
              )}
              {templateLineage.overridePolicyMode && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span
                    className="px-1 py-px rounded border"
                    style={{
                      borderColor:
                        templateLineage.overridePolicyMode === "locked" ? "#dc2626"
                        : templateLineage.overridePolicyMode === "warn" ? "#f59e0b"
                        : "#22c55e",
                      color:
                        templateLineage.overridePolicyMode === "locked" ? "#dc2626"
                        : templateLineage.overridePolicyMode === "warn" ? "#f59e0b"
                        : "#22c55e",
                    }}
                  >
                    override: {templateLineage.overridePolicyMode}
                  </span>
                </>
              )}
            </>
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
        {activeTab === "trust" && (
          <AgentTrustCockpit agentId={agentId} sessionId={sessionId} organizationId={organizationId} />
        )}
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
        {activeTab === "debug" && (
          <AgentDebugEvents agentId={agentId} sessionId={sessionId} organizationId={organizationId} />
        )}
      </div>
    </div>
  );
}
