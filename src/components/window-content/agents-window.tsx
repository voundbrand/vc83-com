"use client";

/**
 * AGENTS WINDOW — Unified agent management dashboard
 *
 * Master-detail layout: agent list sidebar (left) + tabbed detail panel (right).
 * Accessible as a window in the desktop manager and as a full-screen page at /agents.
 */

import { useState } from "react";
import { Bot, Plus, Sparkles } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { CreditWall } from "@/components/credit-wall";
import { CreditBalance } from "@/components/credit-balance";
import type { Id } from "../../../convex/_generated/dataModel";
import type { AgentTab } from "./agents/types";
import { AgentListPanel } from "./agents/agent-list-panel";
import { AgentDetailPanel } from "./agents/agent-detail-panel";
import { AgentCreateForm } from "./agents/agent-create-form";

interface AgentsWindowProps {
  fullScreen?: boolean;
}

export function AgentsWindow({ fullScreen }: AgentsWindowProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const [selectedAgentId, setSelectedAgentId] = useState<Id<"objects"> | null>(null);
  const [activeTab, setActiveTab] = useState<AgentTab>("soul");
  const [showCreate, setShowCreate] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<Id<"objects"> | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const creditBalance = useQuery(
    (api as any).credits.index.getCreditBalance,
    currentOrg?.id
      ? { organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  ) as {
    totalCredits: number;
    dailyCredits: number;
    monthlyCredits: number;
    monthlyCreditsTotal: number;
    purchasedCredits: number;
    planTier?: string;
  } | null | undefined;

  const hasZeroCredits = creditBalance !== undefined && creditBalance !== null && creditBalance.totalCredits <= 0;
  const isUnlimited = creditBalance?.monthlyCreditsTotal === -1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agents = useQuery(
    api.agentOntology.getAgents,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  ) as any[] | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = useQuery(
    api.ai.agentSessions.getAgentStats,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  ) as any[] | undefined;

  if (!currentOrg || !sessionId) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: "var(--win95-bg)" }}>
        <p className="text-sm" style={{ color: "var(--win95-text)" }}>
          Sign in and select an organization to manage agents.
        </p>
      </div>
    );
  }

  const organizationId = currentOrg.id as Id<"organizations">;

  return (
    <div
      className={`flex flex-col ${fullScreen ? "min-h-screen" : "h-full"}`}
      style={{ background: "var(--win95-bg)" }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b-2"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <div className="flex items-center gap-2">
          <Bot size={16} />
          <span className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            AI Agents
          </span>
          {agents && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--win95-bg-dark, #c0c0c0)", color: "var(--neutral-gray)" }}>
              {agents.length} agent{agents.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {creditBalance && !hasZeroCredits && (
            <CreditBalance
              dailyCredits={creditBalance.dailyCredits}
              monthlyCredits={creditBalance.monthlyCredits}
              monthlyCreditsTotal={creditBalance.monthlyCreditsTotal}
              purchasedCredits={creditBalance.purchasedCredits}
              totalCredits={creditBalance.totalCredits}
              isUnlimited={isUnlimited}
              variant="compact"
            />
          )}
        </div>
      </div>

      {/* Credit wall */}
      {hasZeroCredits && (
        <CreditWall
          currentTier={creditBalance?.planTier || "free"}
          creditsAvailable={0}
        />
      )}

      {/* Main content: master-detail */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Agent list */}
        <AgentListPanel
          agents={agents || []}
          stats={stats || []}
          selectedAgentId={selectedAgentId}
          onSelect={(id) => {
            setSelectedAgentId(id);
            setShowCreate(false);
            setEditingAgentId(null);
          }}
          onCreateNew={() => {
            setShowCreate(true);
            setSelectedAgentId(null);
            setEditingAgentId(null);
          }}
          sessionId={sessionId}
        />

        {/* Right: Detail or Create */}
        <div className="flex-1 overflow-y-auto">
          {showCreate && (
            <AgentCreateForm
              sessionId={sessionId}
              organizationId={organizationId}
              editingAgentId={editingAgentId}
              onSaved={(agentId) => {
                setShowCreate(false);
                if (agentId) setSelectedAgentId(agentId);
              }}
              onCancel={() => {
                setShowCreate(false);
                if (selectedAgentId) setShowCreate(false);
              }}
            />
          )}
          {!showCreate && selectedAgentId && (
            <AgentDetailPanel
              agentId={selectedAgentId}
              sessionId={sessionId}
              organizationId={organizationId}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onEdit={() => {
                setEditingAgentId(selectedAgentId);
                setShowCreate(true);
              }}
            />
          )}
          {!showCreate && !selectedAgentId && (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Bot size={64} className="opacity-20" />
              <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
                Select an agent or create a new one
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium border-2 hover:brightness-110 transition-all"
                style={{
                  background: "var(--win95-highlight)",
                  borderColor: "var(--win95-border)",
                  color: "white",
                }}
              >
                <Sparkles size={14} />
                Create Agent
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
