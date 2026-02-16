"use client";

/**
 * Agent escalation queue tab.
 * Shows active escalations (pending + taken_over) for the org's agents.
 * Mirrors the approval queue pattern from agent-approval-queue.tsx.
 */

import { AlertTriangle, UserCheck, XCircle, Shield, Clock, BarChart3 } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface AgentEscalationQueueProps {
  sessionId: string;
  organizationId: Id<"organizations">;
}

const URGENCY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-red-100", text: "text-red-700", label: "HIGH" },
  normal: { bg: "bg-yellow-100", text: "text-yellow-700", label: "NORMAL" },
  low: { bg: "bg-blue-100", text: "text-blue-700", label: "LOW" },
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function AgentEscalationQueue({ sessionId, organizationId }: AgentEscalationQueueProps) {
  const [showMetrics, setShowMetrics] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const escalations = useQuery(api.ai.escalation.getEscalationQueue, {
    sessionId,
    organizationId,
  }) as any[] | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metrics = useQuery(api.ai.escalation.getEscalationMetrics, {
    sessionId,
    organizationId,
    sinceDaysAgo: 30,
  }) as any | undefined;

  const takeOver = useMutation(api.ai.escalation.takeOverEscalation);
  const dismiss = useMutation(api.ai.escalation.dismissEscalation);
  const resolve = useMutation(api.ai.escalation.resolveEscalation);

  if (!escalations) {
    return <div className="p-4 text-xs" style={{ color: "var(--win95-text)" }}>Loading...</div>;
  }

  if (escalations.length === 0 && !showMetrics) {
    return (
      <div className="p-8 text-center">
        <Shield size={48} className="mx-auto mb-4 opacity-20" />
        <p className="text-sm font-medium mb-2" style={{ color: "var(--win95-text)" }}>
          No active escalations
        </p>
        <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
          When an agent needs human help, escalations will appear here.
        </p>
        {metrics && metrics.totalEscalations > 0 && (
          <button
            onClick={() => setShowMetrics(true)}
            className="flex items-center gap-1 mx-auto px-3 py-1 border-2 text-xs hover:bg-gray-50"
            style={{ borderColor: "var(--win95-border)" }}
          >
            <BarChart3 size={12} />
            View metrics ({metrics.totalEscalations} in last {metrics.periodDays}d)
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-medium" style={{ color: "var(--neutral-gray)" }}>
          {escalations.length} active escalation{escalations.length !== 1 ? "s" : ""}
        </div>
        <button
          onClick={() => setShowMetrics(!showMetrics)}
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] border hover:bg-gray-50"
          style={{ borderColor: "var(--win95-border)" }}
        >
          <BarChart3 size={10} />
          {showMetrics ? "Hide" : "Metrics"}
        </button>
      </div>

      {/* Metrics Summary Panel */}
      {showMetrics && metrics && (
        <div
          className="border-2 p-3 mb-2"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #f0f0f0)" }}
        >
          <div className="text-[11px] font-medium mb-2" style={{ color: "var(--win95-text)" }}>
            Escalation Metrics (last {metrics.periodDays} days)
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
            <div style={{ color: "var(--neutral-gray)" }}>Total escalations</div>
            <div style={{ color: "var(--win95-text)" }}>{metrics.totalEscalations}</div>

            <div style={{ color: "var(--neutral-gray)" }}>Avg response time</div>
            <div style={{ color: "var(--win95-text)" }}>{metrics.avgResponseTimeFormatted}</div>

            <div style={{ color: "var(--neutral-gray)" }}>Resolution rate</div>
            <div style={{ color: "var(--win95-text)" }}>{metrics.resolutionRate}%</div>

            <div style={{ color: "var(--neutral-gray)" }}>False positive rate</div>
            <div style={{ color: "var(--win95-text)" }}>{metrics.falsePositiveRate}%</div>

            <div style={{ color: "var(--neutral-gray)" }}>Auto-resume (timeout)</div>
            <div style={{ color: "var(--win95-text)" }}>{metrics.autoResumeRate}%</div>

            <div style={{ color: "var(--neutral-gray)" }}>Takeover rate</div>
            <div style={{ color: "var(--win95-text)" }}>{metrics.takeoverRate}%</div>
          </div>

          {/* Trigger breakdown */}
          {metrics.countByReason && Object.keys(metrics.countByReason).length > 0 && (
            <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--win95-border)" }}>
              <div className="text-[10px] font-medium mb-1" style={{ color: "var(--neutral-gray)" }}>
                By trigger type
              </div>
              {Object.entries(metrics.countByReason as Record<string, number>)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([trigger, count]) => (
                  <div key={trigger} className="flex justify-between text-[10px]">
                    <span style={{ color: "var(--win95-text)" }}>{trigger.replace(/_/g, " ")}</span>
                    <span style={{ color: "var(--neutral-gray)" }}>{count as number}</span>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}

      {escalations.map((item) => {
        const esc = item.escalationState;
        if (!esc) return null;

        const urgency = URGENCY_STYLES[esc.urgency] || URGENCY_STYLES.low;
        const isPending = esc.status === "pending";
        const isTakenOver = esc.status === "taken_over";

        return (
          <div
            key={item._id}
            className="border-2 p-3"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}
          >
            {/* Header: urgency + agent + time */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className={isPending ? "text-yellow-600" : "text-blue-600"} />
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${urgency.bg} ${urgency.text}`}
                >
                  {urgency.label}
                </span>
                <span className="text-xs font-medium" style={{ color: "var(--win95-text)" }}>
                  {item.agentName}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={10} style={{ color: "var(--neutral-gray)" }} />
                <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                  {timeAgo(esc.escalatedAt)}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="text-[11px] mb-2 space-y-1" style={{ color: "var(--win95-text)" }}>
              <div>
                <span style={{ color: "var(--neutral-gray)" }}>Customer: </span>
                {item.contactIdentifier} ({item.channel})
              </div>
              <div>
                <span style={{ color: "var(--neutral-gray)" }}>Reason: </span>
                {esc.reason}
              </div>
              <div>
                <span style={{ color: "var(--neutral-gray)" }}>Status: </span>
                {isPending ? "Waiting for response" : "Human has taken over"}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {isPending && (
                <>
                  <button
                    onClick={() => takeOver({ sessionId, agentSessionId: item._id })}
                    className="flex items-center gap-1 px-3 py-1 border-2 text-xs bg-green-50 hover:bg-green-100"
                    style={{ borderColor: "var(--win95-border)" }}
                  >
                    <UserCheck size={12} className="text-green-600" />
                    Take Over
                  </button>
                  <button
                    onClick={() => dismiss({ sessionId, agentSessionId: item._id })}
                    className="flex items-center gap-1 px-3 py-1 border-2 text-xs bg-red-50 hover:bg-red-100"
                    style={{ borderColor: "var(--win95-border)" }}
                  >
                    <XCircle size={12} className="text-red-600" />
                    Dismiss
                  </button>
                </>
              )}
              {isTakenOver && (
                <button
                  onClick={() => resolve({ sessionId, agentSessionId: item._id })}
                  className="flex items-center gap-1 px-3 py-1 border-2 text-xs bg-blue-50 hover:bg-blue-100"
                  style={{ borderColor: "var(--win95-border)" }}
                >
                  <UserCheck size={12} className="text-blue-600" />
                  Resolve & Resume Agent
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
