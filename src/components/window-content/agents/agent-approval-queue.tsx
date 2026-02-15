"use client";

/**
 * Agent approval queue tab.
 * Shows pending + recent resolved approval requests for supervised agents.
 */

import { Clock, CheckCircle, XCircle, Shield } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface AgentApprovalQueueProps {
  agentId: Id<"objects">;
  sessionId: string;
  organizationId: Id<"organizations">;
}

export function AgentApprovalQueue({ agentId, sessionId, organizationId }: AgentApprovalQueueProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const approvals = useQuery(api.ai.agentApprovals.getPendingApprovals, {
    sessionId, organizationId,
  }) as any[] | undefined;

  const approveAction = useMutation(api.ai.agentApprovals.approveAction);
  const rejectAction = useMutation(api.ai.agentApprovals.rejectAction);

  // Filter to this agent's approvals
  const agentApprovals = approvals?.filter(
    (a) => (a.customProperties as Record<string, unknown>)?.agentId === agentId
  ) || [];

  if (!approvals) {
    return <div className="p-4 text-xs" style={{ color: "var(--win95-text)" }}>Loading...</div>;
  }

  if (agentApprovals.length === 0) {
    return (
      <div className="p-8 text-center">
        <Shield size={48} className="mx-auto mb-4 opacity-20" />
        <p className="text-sm font-medium mb-2" style={{ color: "var(--win95-text)" }}>
          No pending approvals
        </p>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          When this agent wants to take actions in supervised mode, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <div className="text-[11px] font-medium mb-2" style={{ color: "var(--neutral-gray)" }}>
        {agentApprovals.length} pending approval{agentApprovals.length !== 1 ? "s" : ""}
      </div>

      {agentApprovals.map((approval) => {
        const props = (approval.customProperties || {}) as Record<string, unknown>;
        return (
          <div
            key={approval._id}
            className="border-2 p-3"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-yellow-600" />
                <span className="text-xs font-medium" style={{ color: "var(--win95-text)" }}>
                  {String(props.actionType || "Unknown action")}
                </span>
              </div>
              <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                {new Date(approval.createdAt).toLocaleString()}
              </span>
            </div>

            {/* Payload preview */}
            {!!props.actionPayload && (
              <pre
                className="text-[10px] p-2 mb-2 overflow-x-auto border"
                style={{
                  background: "var(--win95-bg)",
                  borderColor: "var(--win95-border)",
                  color: "var(--win95-text)",
                  maxHeight: "100px",
                }}
              >
                {JSON.stringify(props.actionPayload, null, 2)}
              </pre>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => approveAction({ sessionId, approvalId: approval._id })}
                className="flex items-center gap-1 px-3 py-1 border-2 text-xs bg-green-50 hover:bg-green-100"
                style={{ borderColor: "var(--win95-border)" }}
              >
                <CheckCircle size={12} className="text-green-600" />
                Approve
              </button>
              <button
                onClick={() => rejectAction({ sessionId, approvalId: approval._id })}
                className="flex items-center gap-1 px-3 py-1 border-2 text-xs bg-red-50 hover:bg-red-100"
                style={{ borderColor: "var(--win95-border)" }}
              >
                <XCircle size={12} className="text-red-600" />
                Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
