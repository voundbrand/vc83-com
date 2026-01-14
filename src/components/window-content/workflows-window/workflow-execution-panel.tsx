/**
 * WORKFLOW EXECUTION PANEL (N8N-Style Debug Panel)
 *
 * Real-time execution monitoring with:
 * - Behavior status indicators
 * - Execution timeline
 * - Context data inspector
 * - Error details viewer
 */

"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info,
  Play,
  SkipForward,
} from "lucide-react";

interface ExecutionPanelProps {
  executionId: Id<"workflowExecutionLogs"> | null;
  onClose: () => void;
}

interface BehaviorStatus {
  behaviorType: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  message?: string;
  error?: string;
  data?: unknown;
  timestamp?: number;
}

export function WorkflowExecutionPanel({ executionId, onClose }: ExecutionPanelProps) {
  const [expandedBehaviors, setExpandedBehaviors] = useState<Set<string>>(new Set());
  const [selectedBehavior, setSelectedBehavior] = useState<string | null>(null);

  // Real-time execution logs
  const executionLogs = useQuery(
    api.workflowExecutionLogs.getExecutionLogs,
    executionId ? { executionId } : "skip"
  );

  // Parse behavior statuses from logs
  const behaviorStatuses = React.useMemo(() => {
    if (!executionLogs) return [];

    const behaviorMap = new Map<string, BehaviorStatus>();

    // Parse logs to extract behavior statuses
    executionLogs.logs.forEach((log) => {
      const message = log.message;

      // Detect behavior start: "▶️ Executing behavior: behavior-type"
      const startMatch = message.match(/▶️ Executing behavior: (.+)/);
      if (startMatch) {
        const behaviorType = startMatch[1];
        behaviorMap.set(behaviorType, {
          behaviorType,
          status: "running",
          timestamp: log.timestamp,
        });
      }

      // Detect behavior completion: "✅ Behavior behavior-type completed successfully"
      const successMatch = message.match(/✅ Behavior (.+) completed successfully/);
      if (successMatch) {
        const behaviorType = successMatch[1];
        const existing = behaviorMap.get(behaviorType) || {
          behaviorType,
          status: "completed",
        };
        behaviorMap.set(behaviorType, {
          ...existing,
          status: "completed",
          message: log.message,
          timestamp: log.timestamp,
        });
      }

      // Detect behavior failure: "❌ Behavior behavior-type failed"
      const failMatch = message.match(/❌ Behavior (.+) failed/);
      if (failMatch) {
        const behaviorType = failMatch[1];
        const existing = behaviorMap.get(behaviorType) || {
          behaviorType,
          status: "failed",
        };
        behaviorMap.set(behaviorType, {
          ...existing,
          status: "failed",
          error: log.message,
          timestamp: log.timestamp,
        });
      }

      // Detect skipped: "⏭️ Skipping behavior"
      const skipMatch = message.match(/⏭️ Skipping behavior (.+)/);
      if (skipMatch) {
        const behaviorType = skipMatch[1];
        behaviorMap.set(behaviorType, {
          behaviorType,
          status: "skipped",
          message: log.message,
          timestamp: log.timestamp,
        });
      }
    });

    // Convert to array
    return Array.from(behaviorMap.values());
  }, [executionLogs]);

  const toggleBehaviorExpand = (behaviorType: string) => {
    const newExpanded = new Set(expandedBehaviors);
    if (newExpanded.has(behaviorType)) {
      newExpanded.delete(behaviorType);
    } else {
      newExpanded.add(behaviorType);
    }
    setExpandedBehaviors(newExpanded);
  };

  const getStatusIcon = (status: BehaviorStatus["status"]) => {
    switch (status) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--info)" }} />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4" style={{ color: "var(--success)" }} />;
      case "failed":
        return <XCircle className="h-4 w-4" style={{ color: "var(--error)" }} />;
      case "skipped":
        return <SkipForward className="h-4 w-4" style={{ color: "var(--warning)" }} />;
      default:
        return <Clock className="h-4 w-4" style={{ color: "var(--neutral-gray)" }} />;
    }
  };

  const getStatusColor = (status: BehaviorStatus["status"]) => {
    switch (status) {
      case "running":
        return "var(--info)";
      case "completed":
        return "var(--success)";
      case "failed":
        return "var(--error)";
      case "skipped":
        return "var(--warning)";
      default:
        return "var(--neutral-gray)";
    }
  };

  if (!executionId) {
    return (
      <div
        className="h-full w-96 border-l-4 flex flex-col"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
        }}
      >
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div>
            <Play className="h-12 w-12 mx-auto mb-4" style={{ color: "var(--neutral-gray)" }} />
            <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
              Run a workflow to see execution details
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full w-96 border-l-4 flex flex-col"
      style={{
        borderColor: "var(--win95-border)",
        background: "var(--win95-bg-light)",
      }}
    >
      {/* Header */}
      <div
        className="border-b-4 px-4 py-3 flex items-center justify-between"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-highlight)",
        }}
      >
        <h3 className="text-sm font-bold text-white">Execution Monitor</h3>
        <button
          onClick={onClose}
          className="border-2 px-2 py-0.5 text-xs font-bold text-white hover:bg-white hover:text-black transition-colors"
          style={{ borderColor: "white" }}
        >
          ✕
        </button>
      </div>

      {/* Status Summary */}
      {executionLogs && (
        <div className="border-b-2 p-4" style={{ borderColor: "var(--win95-border)" }}>
          <div className="flex items-center gap-2 mb-2">
            {executionLogs.status === "running" && (
              <>
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--info)" }} />
                <span className="font-bold text-sm" style={{ color: "var(--info)" }}>
                  Executing...
                </span>
              </>
            )}
            {executionLogs.status === "success" && (
              <>
                <CheckCircle2 className="h-5 w-5" style={{ color: "var(--success)" }} />
                <span className="font-bold text-sm" style={{ color: "var(--success)" }}>
                  Completed Successfully
                </span>
              </>
            )}
            {executionLogs.status === "failed" && (
              <>
                <XCircle className="h-5 w-5" style={{ color: "var(--error)" }} />
                <span className="font-bold text-sm" style={{ color: "var(--error)" }}>
                  Execution Failed
                </span>
              </>
            )}
          </div>

          {/* Execution time */}
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Started: {new Date(executionLogs.startedAt).toLocaleTimeString()}
            {executionLogs.completedAt && (
              <>
                <br />
                Completed: {new Date(executionLogs.completedAt).toLocaleTimeString()}
                <br />
                Duration:{" "}
                {((executionLogs.completedAt - executionLogs.startedAt) / 1000).toFixed(2)}s
              </>
            )}
          </div>
        </div>
      )}

      {/* Behavior Status List */}
      <div className="flex-1 overflow-y-auto">
        {behaviorStatuses.length === 0 ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: "var(--neutral-gray)" }} />
            <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
              Waiting for execution to start...
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {behaviorStatuses.map((behavior, index) => (
              <div
                key={behavior.behaviorType}
                className="border-2"
                style={{
                  borderColor: getStatusColor(behavior.status),
                  background: selectedBehavior === behavior.behaviorType
                    ? "var(--win95-bg)"
                    : "var(--win95-bg-light)",
                }}
              >
                {/* Behavior Header */}
                <button
                  onClick={() => {
                    toggleBehaviorExpand(behavior.behaviorType);
                    setSelectedBehavior(behavior.behaviorType);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-opacity-80 transition-colors"
                >
                  {/* Expand Icon */}
                  {expandedBehaviors.has(behavior.behaviorType) ? (
                    <ChevronDown className="h-4 w-4" style={{ color: "var(--neutral-gray)" }} />
                  ) : (
                    <ChevronRight className="h-4 w-4" style={{ color: "var(--neutral-gray)" }} />
                  )}

                  {/* Status Icon */}
                  {getStatusIcon(behavior.status)}

                  {/* Behavior Name */}
                  <div className="flex-1">
                    <div className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                      {index + 1}. {behavior.behaviorType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </div>
                    {behavior.timestamp && (
                      <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        {new Date(behavior.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div
                    className="px-2 py-0.5 text-[10px] font-bold border"
                    style={{
                      borderColor: getStatusColor(behavior.status),
                      color: getStatusColor(behavior.status),
                    }}
                  >
                    {behavior.status.toUpperCase()}
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedBehaviors.has(behavior.behaviorType) && (
                  <div
                    className="border-t-2 p-3"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-bg)",
                    }}
                  >
                    {behavior.message && (
                      <div className="mb-2">
                        <div className="flex items-center gap-1 mb-1">
                          <Info className="h-3 w-3" style={{ color: "var(--info)" }} />
                          <span className="text-[10px] font-bold" style={{ color: "var(--win95-text)" }}>
                            MESSAGE
                          </span>
                        </div>
                        <div
                          className="text-xs p-2 border"
                          style={{
                            borderColor: "var(--win95-border)",
                            background: "var(--win95-bg-light)",
                            color: "var(--win95-text)",
                          }}
                        >
                          {behavior.message}
                        </div>
                      </div>
                    )}

                    {behavior.error && (
                      <div className="mb-2">
                        <div className="flex items-center gap-1 mb-1">
                          <AlertTriangle className="h-3 w-3" style={{ color: "var(--error)" }} />
                          <span className="text-[10px] font-bold" style={{ color: "var(--error)" }}>
                            ERROR
                          </span>
                        </div>
                        <div
                          className="text-xs p-2 border-2"
                          style={{
                            borderColor: "var(--error)",
                            background: "var(--error-light)",
                            color: "var(--error)",
                          }}
                        >
                          {behavior.error}
                        </div>
                      </div>
                    )}

                    {behavior.data ? (
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Info className="h-3 w-3" style={{ color: "var(--info)" }} />
                          <span className="text-[10px] font-bold" style={{ color: "var(--win95-text)" }}>
                            DATA
                          </span>
                        </div>
                        <pre
                          className="text-[10px] p-2 border overflow-x-auto"
                          style={{
                            borderColor: "var(--win95-border)",
                            background: "var(--win95-bg-light)",
                            color: "var(--win95-text)",
                            fontFamily: "monospace",
                          }}
                        >
                          {JSON.stringify(behavior.data, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Log View */}
      {executionLogs && executionLogs.logs.length > 0 && (
        <div
          className="border-t-4 p-3 max-h-48 overflow-y-auto"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg)",
          }}
        >
          <div className="text-[10px] font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            FULL EXECUTION LOG
          </div>
          <div className="space-y-1">
            {executionLogs.logs.map((log, index) => (
              <div
                key={index}
                className="text-[10px] px-2 py-1 border"
                style={{
                  borderColor: "var(--win95-border)",
                  background:
                    log.level === "error"
                      ? "var(--error-light)"
                      : log.level === "success"
                      ? "var(--success-light)"
                      : "var(--win95-bg-light)",
                  color:
                    log.level === "error"
                      ? "var(--error)"
                      : log.level === "success"
                      ? "var(--success)"
                      : "var(--win95-text)",
                }}
              >
                <span style={{ color: "var(--neutral-gray)" }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                {" - "}
                {log.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
