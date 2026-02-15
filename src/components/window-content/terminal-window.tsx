"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../convex/_generated/api") as { api: any };
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import type { Id } from "../../../convex/_generated/dataModel";

interface TerminalLogEntry {
  id: string;
  timestamp: number;
  type: string;
  severity: string;
  message: string;
  metadata?: Record<string, unknown>;
}

interface LayerBreakdown {
  layer: number;
  layerName: string;
  orgCount: number;
  eventCount: number;
}

type Scope = "org" | "layer";

const SEVERITY_COLORS: Record<string, string> = {
  info: "#3b82f6",
  success: "#22c55e",
  warning: "#eab308",
  error: "#ef4444",
};

const TYPE_PREFIXES: Record<string, string> = {
  user_message: ">>",
  agent_response: "<<",
  tool_execution: "~~",
  webhook: "::",
  session_start: "++",
  error: "!!",
};

const LAYER_COLORS: Record<number, string> = {
  1: "#a855f7", // purple
  2: "#3b82f6", // blue
  3: "#22c55e", // green
  4: "#f59e0b", // amber
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false });
}

function LayerBadge({ layer, slug }: { layer: number; slug: string }) {
  const color = LAYER_COLORS[layer] || "#6b7280";
  return (
    <span
      className="flex-shrink-0 text-[10px] px-1 rounded font-bold mr-1"
      style={{ color, borderColor: color, border: "1px solid" }}
    >
      L{layer}:{slug}
    </span>
  );
}

function LogLine({ entry, showLayer }: { entry: TerminalLogEntry; showLayer: boolean }) {
  const color = SEVERITY_COLORS[entry.severity] || "#6b7280";
  const prefix = TYPE_PREFIXES[entry.type] || "--";
  const meta = entry.metadata;

  return (
    <div className="flex gap-2 py-px leading-5 hover:bg-white/5">
      <span className="flex-shrink-0 text-neutral-600 select-none">
        {formatTime(entry.timestamp)}
      </span>
      {showLayer && meta?.layer != null && !!meta?.orgSlug && (
        <LayerBadge layer={meta.layer as number} slug={meta.orgSlug as string} />
      )}
      <span className="flex-shrink-0 select-none" style={{ color }}>
        {prefix}
      </span>
      <span style={{ color }} className="break-all">
        {entry.message}
      </span>
      {meta?.costUsd != null && (
        <span className="flex-shrink-0 text-neutral-600 ml-auto">
          ${(meta.costUsd as number).toFixed(4)}
        </span>
      )}
    </div>
  );
}

export function TerminalWindow() {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const [autoScroll, setAutoScroll] = useState(true);
  const [scope, setScope] = useState<Scope>("org");
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Check if layer scope is available (org has sub-orgs)
  const layerCheck = useQuery(
    api.terminal.terminalFeed.checkLayerScopeAvailable,
    currentOrg?.id && sessionId
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  ) as { available: boolean } | undefined;

  const hasSubOrgs = layerCheck?.available ?? false;

  const feedResult = useQuery(
    api.terminal.terminalFeed.getTerminalFeed,
    currentOrg?.id && sessionId
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
          limit: 200,
          scope,
        }
      : "skip"
  ) as {
    entries: TerminalLogEntry[];
    stats: {
      totalEvents: number;
      activeSessions: number;
      errorCount: number;
      layerBreakdown?: LayerBreakdown[];
    };
  } | undefined;

  const entries = feedResult?.entries ?? [];
  const stats = feedResult?.stats;

  // Auto-scroll when new entries arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current && entries.length !== prevCountRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevCountRef.current = entries.length;
  }, [entries.length, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 40;
    if (!atBottom && autoScroll) setAutoScroll(false);
    if (atBottom && !autoScroll) setAutoScroll(true);
  }, [autoScroll]);

  if (!currentOrg || !sessionId) {
    return (
      <div className="h-full flex items-center justify-center bg-black font-mono text-sm text-neutral-500">
        Select an organization to view terminal logs
      </div>
    );
  }

  const isLayerMode = scope === "layer" && hasSubOrgs;

  return (
    <div className="flex flex-col h-full bg-black text-xs font-mono select-text">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900 border-b border-neutral-800 text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="text-green-500">$</span>
          <span>terminal — {currentOrg.name || "org"}</span>
          {/* Scope toggle — only visible when sub-orgs exist */}
          {hasSubOrgs && (
            <div className="flex items-center gap-0.5 ml-2">
              <button
                onClick={() => setScope("org")}
                className={`px-1.5 py-0.5 text-[10px] uppercase tracking-wider rounded-l cursor-pointer ${
                  scope === "org"
                    ? "bg-neutral-700 text-neutral-200"
                    : "bg-neutral-800 text-neutral-500 hover:text-neutral-300"
                }`}
              >
                org
              </button>
              <button
                onClick={() => setScope("layer")}
                className={`px-1.5 py-0.5 text-[10px] uppercase tracking-wider rounded-r cursor-pointer ${
                  scope === "layer"
                    ? "bg-neutral-700 text-neutral-200"
                    : "bg-neutral-800 text-neutral-500 hover:text-neutral-300"
                }`}
              >
                layer
              </button>
            </div>
          )}
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer text-[10px] uppercase tracking-wider">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={() => setAutoScroll(!autoScroll)}
            className="w-3 h-3 accent-green-500"
          />
          auto-scroll
        </label>
      </div>

      {/* Banner */}
      <div className="px-3 py-2 text-cyan-600 border-b border-neutral-900">
        <pre className="leading-4">{`╔═══════════════════════════════════════╗
║  l4yercak3 — Activity Terminal        ║
╚═══════════════════════════════════════╝`}</pre>
      </div>

      {/* Log area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-1"
        style={{ backgroundColor: "#0a0a0a" }}
      >
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral-700">
            Waiting for activity...
          </div>
        ) : (
          entries.map((entry: TerminalLogEntry) => (
            <LogLine key={entry.id} entry={entry} showLayer={isLayerMode} />
          ))
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-6 px-3 py-1.5 bg-neutral-900 border-t border-neutral-800 text-[10px] text-neutral-500 uppercase tracking-wider">
        <span>
          events: <span className="text-neutral-300">{stats?.totalEvents ?? 0}</span>
        </span>
        <span>
          sessions: <span className="text-neutral-300">{stats?.activeSessions ?? 0}</span>
        </span>
        <span>
          errors:{" "}
          <span className={stats?.errorCount ? "text-red-400" : "text-neutral-300"}>
            {stats?.errorCount ?? 0}
          </span>
        </span>
        {/* Layer breakdown in layer mode */}
        {isLayerMode && stats?.layerBreakdown?.map((lb) => (
          <span key={lb.layer} style={{ color: LAYER_COLORS[lb.layer] || "#6b7280" }}>
            L{lb.layer}: {lb.eventCount}
          </span>
        ))}
        {!autoScroll && (
          <button
            onClick={() => {
              setAutoScroll(true);
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }}
            className="ml-auto text-cyan-500 hover:text-cyan-300 cursor-pointer"
          >
            ↓ jump to bottom
          </button>
        )}
      </div>
    </div>
  );
}
