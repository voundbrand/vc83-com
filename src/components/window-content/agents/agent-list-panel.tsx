"use client";

/**
 * Agent list sidebar panel for the agents dashboard.
 * Shows all agents with status dots, quick actions, and stats.
 */

import { Play, Pause, Sparkles } from "lucide-react";
import { useMutation } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import type { AgentCustomProps } from "./types";

interface AgentListPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agents: any[];
  stats: Array<{
    agentId: string;
    totalSessions: number;
    activeSessions: number;
    totalMessages: number;
    totalCostUsd: number;
  }>;
  selectedAgentId: Id<"objects"> | null;
  onSelect: (id: Id<"objects">) => void;
  onCreateNew: () => void;
  sessionId: string;
}

export function AgentListPanel({
  agents,
  stats,
  selectedAgentId,
  onSelect,
  onCreateNew,
  sessionId,
}: AgentListPanelProps) {
  const activateAgent = useMutation(api.agentOntology.activateAgent);
  const pauseAgent = useMutation(api.agentOntology.pauseAgent);

  const getStatsForAgent = (agentId: string) =>
    stats.find((s) => s.agentId === agentId);

  return (
    <div
      className="w-60 flex-shrink-0 flex flex-col border-r-2 overflow-hidden"
      style={{ borderColor: "var(--win95-border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b-2"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <span className="text-[11px] font-medium" style={{ color: "var(--neutral-gray)" }}>
          Agents
        </span>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium border hover:brightness-110 transition-all"
          style={{
            background: "var(--win95-highlight)",
            borderColor: "var(--win95-border)",
            color: "white",
          }}
        >
          <Sparkles size={10} />
          New
        </button>
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto">
        {agents.length === 0 && (
          <div className="p-4 text-center">
            <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
              No agents yet
            </p>
          </div>
        )}

        {agents.map((agent) => {
          const props = (agent.customProperties || {}) as AgentCustomProps;
          const isSelected = selectedAgentId === agent._id;
          const agentStats = getStatsForAgent(agent._id);

          return (
            <button
              key={agent._id}
              onClick={() => onSelect(agent._id)}
              className="w-full text-left px-3 py-2.5 border-b transition-colors"
              style={{
                borderColor: "var(--win95-border)",
                background: isSelected ? "var(--win95-highlight, #000080)" : "transparent",
                color: isSelected ? "#fff" : "var(--win95-text)",
              }}
            >
              <div className="flex items-center gap-2">
                {/* Status dot */}
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{
                    background:
                      agent.status === "active" ? "#22c55e" :
                      agent.status === "draft" ? "#eab308" :
                      agent.status === "paused" ? "#ef4444" : "#9ca3af",
                  }}
                />
                <span className="text-xs font-medium truncate">
                  {props.displayName || agent.name}
                </span>
              </div>

              <div
                className="flex items-center gap-2 mt-1 text-[10px]"
                style={{ color: isSelected ? "rgba(255,255,255,0.7)" : "var(--neutral-gray)" }}
              >
                <span>{agent.subtype?.replace(/_/g, " ")}</span>
                <span>·</span>
                <span>{agentStats?.totalMessages || props.totalMessages || 0} msgs</span>
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
                {agent.status === "active" ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      pauseAgent({ sessionId, agentId: agent._id });
                    }}
                    className="p-0.5 rounded hover:bg-yellow-100 hover:bg-opacity-20"
                    title="Pause"
                  >
                    <Pause size={10} style={{ color: isSelected ? "#fff" : "#eab308" }} />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      activateAgent({ sessionId, agentId: agent._id });
                    }}
                    className="p-0.5 rounded hover:bg-green-100 hover:bg-opacity-20"
                    title="Activate"
                  >
                    <Play size={10} style={{ color: isSelected ? "#fff" : "#22c55e" }} />
                  </button>
                )}
                <span
                  className="text-[9px] px-1 py-0.5 rounded"
                  style={{
                    background: isSelected ? "rgba(255,255,255,0.15)" : "var(--win95-bg-dark, #e0e0e0)",
                    color: isSelected ? "rgba(255,255,255,0.8)" : "var(--neutral-gray)",
                  }}
                >
                  {props.autonomyLevel || "supervised"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
