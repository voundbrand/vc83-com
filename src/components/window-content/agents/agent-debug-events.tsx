"use client";

/**
 * Agent debug events tab.
 * Shows recent per-agent runtime events with expandable JSON payloads.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Bug, RefreshCw, Copy, Check, AlertCircle } from "lucide-react";
import { useQuery } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

interface AgentDebugEventsProps {
  agentId: Id<"objects">;
  sessionId: string;
  organizationId: Id<"organizations">;
}

type DebugEvent = {
  actionId: string;
  performedAt: number;
  actionType: string;
  sessionId?: string;
  turnId?: string;
  summary?: {
    toolsUsed?: string[];
    reasonCode?: string;
    outcome?: string;
    preflightReasonCode?: string;
    dispatchDecision?: string;
    dispatchInvocationStatus?: string;
  };
  payload: Record<string, unknown>;
};

type DebugEventsResponse = {
  windowHours: number;
  since: number;
  totalEvents: number;
  events: DebugEvent[];
};

function shortId(value?: string): string {
  if (!value) {
    return "n/a";
  }
  if (value.length <= 16) {
    return value;
  }
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export function AgentDebugEvents({ agentId, sessionId, organizationId }: AgentDebugEventsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [hours, setHours] = useState(24);
  const [limit, setLimit] = useState(60);
  const [copyState, setCopyState] = useState<Record<string, "idle" | "copied" | "error">>({});
  const copyTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const response = useQuery(api.ai.agentSessions.getAgentDebugEvents, {
    sessionId,
    organizationId,
    agentId,
    hours,
    limit,
  }) as DebugEventsResponse | undefined;

  const events = response?.events || [];
  const sinceLabel = useMemo(() => {
    if (!response?.since) {
      return "n/a";
    }
    return new Date(response.since).toLocaleString();
  }, [response?.since]);

  useEffect(() => {
    return () => {
      for (const timer of Object.values(copyTimersRef.current)) {
        clearTimeout(timer);
      }
    };
  }, []);

  const handleCopyPayload = async (event: DebugEvent) => {
    const setTransientCopyState = (state: "copied" | "error") => {
      setCopyState((previous) => ({ ...previous, [event.actionId]: state }));
      if (copyTimersRef.current[event.actionId]) {
        clearTimeout(copyTimersRef.current[event.actionId]);
      }
      copyTimersRef.current[event.actionId] = setTimeout(() => {
        setCopyState((previous) => ({ ...previous, [event.actionId]: "idle" }));
      }, 2000);
    };

    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("clipboard_unavailable");
      }
      await navigator.clipboard.writeText(JSON.stringify(event.payload, null, 2));
      setTransientCopyState("copied");
    } catch {
      setTransientCopyState("error");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div
        className="border-2 p-3 flex items-center justify-between gap-3"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}
      >
        <div className="flex items-center gap-2">
          <Bug size={14} style={{ color: "var(--win95-text)" }} />
          <div>
            <div className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
              Debug Events
            </div>
            <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
              {response ? `${response.totalEvents} events since ${sinceLabel}` : "Loading debug events..."}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <label className="flex items-center gap-1">
            <span style={{ color: "var(--neutral-gray)" }}>Hours</span>
            <input
              type="number"
              min={1}
              max={720}
              value={hours}
              onChange={(event) => setHours(Math.min(720, Math.max(1, Number(event.target.value) || 24)))}
              className="w-16 border px-1 py-0.5"
              style={{ borderColor: "var(--win95-border)", color: "var(--win95-text)", background: "white" }}
            />
          </label>
          <label className="flex items-center gap-1">
            <span style={{ color: "var(--neutral-gray)" }}>Limit</span>
            <input
              type="number"
              min={1}
              max={300}
              value={limit}
              onChange={(event) => setLimit(Math.min(300, Math.max(1, Number(event.target.value) || 60)))}
              className="w-16 border px-1 py-0.5"
              style={{ borderColor: "var(--win95-border)", color: "var(--win95-text)", background: "white" }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setExpanded({});
            }}
            className="px-2 py-1 border text-[10px] flex items-center gap-1"
            style={{ borderColor: "var(--win95-border)", color: "var(--win95-text)" }}
            title="Collapse all expanded events"
          >
            <RefreshCw size={10} />
            Collapse all
          </button>
        </div>
      </div>

      {!response && (
        <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Loading...
        </div>
      )}

      {response && events.length === 0 && (
        <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          No debug events in the selected time window.
        </div>
      )}

      <div className="space-y-2">
        {events.map((event) => {
          const isOpen = expanded[event.actionId] === true;
          const dispatchDecision = event.summary?.dispatchDecision || "n/a";
          const blockedReason =
            event.summary?.preflightReasonCode
            || (dispatchDecision === "blocked"
              ? event.summary?.reasonCode || "blocked_without_reason_code"
              : undefined);
          const retrySafeLabel =
            dispatchDecision === "blocked"
              ? "no"
              : dispatchDecision === "allowed" || dispatchDecision === "safe_retry"
                ? "yes"
                : "unknown";
          return (
            <div
              key={event.actionId}
              className="border"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light, #fff)" }}
            >
              <button
                type="button"
                onClick={() =>
                  setExpanded((previous) => ({
                    ...previous,
                    [event.actionId]: !previous[event.actionId],
                  }))
                }
                className="w-full px-3 py-2 text-left flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2">
                  <span style={{ color: "var(--neutral-gray)", marginTop: 1 }}>
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                      {event.actionType}
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                      {new Date(event.performedAt).toLocaleString()} · actionId={shortId(event.actionId)} · session={shortId(event.sessionId)} · turn={shortId(event.turnId)}
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                      reason={event.summary?.reasonCode || "n/a"} · dispatch={dispatchDecision} · invocation={event.summary?.dispatchInvocationStatus || "n/a"} · outcome={event.summary?.outcome || "n/a"} · retry_safe={retrySafeLabel}
                    </div>
                    {blockedReason && (
                      <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        blocked_reason={blockedReason}
                      </div>
                    )}
                    {Array.isArray(event.summary?.toolsUsed) && event.summary?.toolsUsed.length > 0 && (
                      <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        tools={event.summary?.toolsUsed.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                  {isOpen ? "Hide JSON" : "Show JSON"}
                </span>
              </button>
              {isOpen && (
                <div
                  className="border-t px-3 py-2"
                  style={{ borderColor: "var(--win95-border)", background: "#0f172a", color: "#e2e8f0" }}
                >
                  <div className="mb-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => void handleCopyPayload(event)}
                      className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px]"
                      style={{ borderColor: "#334155", color: "#e2e8f0", background: "#111827" }}
                      title="Copy JSON payload"
                    >
                      {copyState[event.actionId] === "copied" ? <Check size={10} /> : copyState[event.actionId] === "error" ? <AlertCircle size={10} /> : <Copy size={10} />}
                      {copyState[event.actionId] === "copied" ? "Copied" : copyState[event.actionId] === "error" ? "Copy failed" : "Copy JSON"}
                    </button>
                  </div>
                  <pre className="text-[10px] leading-5 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
