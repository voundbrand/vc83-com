"use client";

/**
 * AGENTS WINDOW — Unified agent management dashboard
 *
 * Master-detail layout: agent list sidebar (left) + tabbed detail panel (right).
 * Accessible as a window in the desktop manager and as a full-screen page at /agents.
 */

import { useState } from "react";
import { Bot, Sparkles, Maximize2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { CreditWall } from "@/components/credit-wall";
import { CreditBalance } from "@/components/credit-balance";
import type { Id } from "../../../convex/_generated/dataModel";
import type { AgentTab } from "./agents/types";
import { AgentListPanel } from "./agents/agent-list-panel";
import { AgentDetailPanel } from "./agents/agent-detail-panel";
import { AgentCreateForm } from "./agents/agent-create-form";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const apiAny: any = require("../../../convex/_generated/api").api;

interface AgentsWindowProps {
  fullScreen?: boolean;
}

export function AgentsWindow({ fullScreen }: AgentsWindowProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const [selectedAgentId, setSelectedAgentId] = useState<Id<"objects"> | null>(null);
  const [activeTab, setActiveTab] = useState<AgentTab>("trust");
  const [showCreate, setShowCreate] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<Id<"objects"> | null>(null);
  const unsafeUseQuery = useQuery as unknown as (
    queryRef: unknown,
    args: unknown
  ) => unknown;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const creditBalance = unsafeUseQuery(
    apiAny.credits.index.getCreditBalance,
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
  const agents = unsafeUseQuery(
    apiAny.agentOntology.getAgents,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  ) as any[] | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = unsafeUseQuery(
    apiAny.ai.agentSessions.getAgentStats,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  ) as any[] | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlCenterThreads = unsafeUseQuery(
    apiAny.ai.agentSessions.getControlCenterThreadRows,
    sessionId && currentOrg?.id
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
          limit: 120,
        }
      : "skip"
  ) as Array<{ waitingOnHuman: boolean }> | undefined;
  const waitingOnHumanCount = controlCenterThreads?.filter((thread) => thread.waitingOnHuman).length || 0;

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
          {fullScreen && (
            <Link
              href="/"
              className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors mr-1"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
              title="Back to Desktop"
            >
              <ArrowLeft size={14} />
            </Link>
          )}
          <Bot size={16} />
          <span className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            AI Agents
          </span>
          {agents && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--win95-bg-dark)", color: "var(--neutral-gray)" }}>
              {agents.length} agent{agents.length !== 1 ? "s" : ""}
            </span>
          )}
          {controlCenterThreads && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: waitingOnHumanCount > 0 ? "#fee2e2" : "var(--win95-bg-dark)",
                color: waitingOnHumanCount > 0 ? "#991b1b" : "var(--neutral-gray)",
              }}
            >
              {waitingOnHumanCount} waiting on human
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
          {!fullScreen && (
            <Link
              href="/agents"
              className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
              title="Open Full Screen"
            >
              <Maximize2 size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* Credit wall */}
      {hasZeroCredits && (
        <CreditWall
          currentTier={creditBalance?.planTier || "free"}
          creditsAvailable={0}
          variant="notification"
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
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium border-2 transition-colors"
                style={{
                  background: "var(--win95-bg-light)",
                  borderColor: "var(--win95-border-light)",
                  color: "var(--win95-text)",
                }}
              >
                <Sparkles size={14} style={{ color: "var(--warning)" }} />
                Create Agent
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
