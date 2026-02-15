"use client";

/**
 * Agent analytics tab.
 * Shows usage stats, cost breakdown, and activity overview.
 */

import { BarChart3, MessageSquare, Zap, DollarSign, Activity } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { AgentCustomProps } from "./types";

interface AgentAnalyticsProps {
  agentId: Id<"objects">;
  sessionId: string;
  organizationId: Id<"organizations">;
}

export function AgentAnalytics({ agentId, sessionId, organizationId }: AgentAnalyticsProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agent = useQuery(api.agentOntology.getAgent, { sessionId, agentId }) as any | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allStats = useQuery(api.ai.agentSessions.getAgentStats, {
    sessionId, organizationId,
  }) as any[] | undefined;

  const agentStats = allStats?.find((s) => s.agentId === agentId);
  const props = (agent?.customProperties || {}) as AgentCustomProps;

  if (!agent) {
    return <div className="p-4 text-xs" style={{ color: "var(--win95-text)" }}>Loading...</div>;
  }

  const statCards = [
    {
      label: "Total Messages",
      value: agentStats?.totalMessages || props.totalMessages || 0,
      icon: <MessageSquare size={16} />,
      color: "#3b82f6",
    },
    {
      label: "Total Sessions",
      value: agentStats?.totalSessions || 0,
      icon: <Activity size={16} />,
      color: "#8b5cf6",
    },
    {
      label: "Active Sessions",
      value: agentStats?.activeSessions || 0,
      icon: <Zap size={16} />,
      color: "#22c55e",
    },
    {
      label: "Total Cost",
      value: `$${(agentStats?.totalCostUsd || props.totalCostUsd || 0).toFixed(2)}`,
      icon: <DollarSign size={16} />,
      color: "#f59e0b",
    },
    {
      label: "Tokens Used",
      value: formatNumber(agentStats?.totalTokens || 0),
      icon: <BarChart3 size={16} />,
      color: "#ef4444",
    },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="border-2 p-3 text-center"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}
          >
            <div className="flex justify-center mb-1" style={{ color: card.color }}>
              {card.icon}
            </div>
            <div className="text-lg font-bold" style={{ color: "var(--win95-text)" }}>
              {card.value}
            </div>
            <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Config summary */}
      <div>
        <h4 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>Configuration</h4>
        <div className="grid grid-cols-2 gap-2">
          <InfoRow label="Model" value={props.modelId?.split("/").pop() || "claude-sonnet-4"} />
          <InfoRow label="Autonomy" value={props.autonomyLevel || "supervised"} />
          <InfoRow label="Temperature" value={String(props.temperature ?? 0.7)} />
          <InfoRow label="Max Msgs/Day" value={String(props.maxMessagesPerDay || 100)} />
          <InfoRow label="Max Cost/Day" value={`$${props.maxCostPerDay || 5}`} />
          <InfoRow label="Language" value={props.language || "en"} />
        </div>
      </div>

      {/* Channel bindings */}
      <div>
        <h4 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>Active Channels</h4>
        <div className="flex flex-wrap gap-1.5">
          {(props.channelBindings || [])
            .filter((b) => b.enabled)
            .map((b) => (
              <span
                key={b.channel}
                className="text-[10px] px-2 py-0.5 rounded border"
                style={{ borderColor: "var(--win95-border)", background: "#dcfce7", color: "#166534" }}
              >
                {b.channel.replace(/_/g, " ")}
              </span>
            ))}
          {(props.channelBindings || []).filter((b) => b.enabled).length === 0 && (
            <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>No channels enabled</span>
          )}
        </div>
      </div>

      {/* Last activity */}
      {agentStats?.lastMessageAt && agentStats.lastMessageAt > 0 && (
        <div>
          <h4 className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>Last Activity</h4>
          <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
            {new Date(agentStats.lastMessageAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* Soul info */}
      {props.soul?.version && (
        <div>
          <h4 className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>Soul</h4>
          <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
            Version {props.soul.version} · Updated by {props.soul.lastUpdatedBy || "owner"}
            {props.soul.lastUpdatedAt && ` on ${new Date(props.soul.lastUpdatedAt).toLocaleDateString()}`}
          </p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between border px-2 py-1"
      style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}
    >
      <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>{label}</span>
      <span className="text-[11px] font-medium" style={{ color: "var(--win95-text)" }}>{value}</span>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
