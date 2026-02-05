"use client";

import { memo, type CSSProperties } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NodeDefinition, NodeStatus, HandleDefinition } from "../../../convex/layers/types";

// ============================================================================
// SHARED NODE SHELL
// ============================================================================

interface NodeData {
  definition: NodeDefinition;
  config: Record<string, unknown>;
  status: NodeStatus;
  label: string;
}

const STATUS_INDICATOR: Record<NodeStatus, { color: string; label: string }> = {
  draft: { color: "#9CA3AF", label: "Draft" },
  configuring: { color: "#F59E0B", label: "Configuring" },
  ready: { color: "#3B82F6", label: "Ready" },
  active: { color: "#10B981", label: "Active" },
  error: { color: "#EF4444", label: "Error" },
  disabled: { color: "#6B7280", label: "Disabled" },
};

function NodeShell({
  data,
  selected,
  accentColor,
  icon,
  children,
}: {
  data: NodeData;
  selected: boolean;
  accentColor: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}) {
  const status = STATUS_INDICATOR[data.status] ?? STATUS_INDICATOR.draft;
  const isExecuting = data.status === "active";
  const borderStyle: CSSProperties = {
    borderColor: selected ? accentColor : isExecuting ? "#10B981" : undefined,
    boxShadow: selected
      ? `0 0 0 1px ${accentColor}40`
      : isExecuting
        ? "0 0 8px 2px rgba(16, 185, 129, 0.25)"
        : undefined,
  };

  return (
    <div
      className={`min-w-[180px] max-w-[220px] rounded-lg border border-zinc-700 shadow-sm transition-shadow ${
        selected ? "ring-1" : "hover:shadow-md"
      } ${isExecuting ? "animate-pulse" : ""}`}
      style={{ ...borderStyle, background: "#18181b" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 rounded-t-lg px-3 py-2"
        style={{ backgroundColor: `${accentColor}10` }}
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md text-white"
          style={{ backgroundColor: accentColor }}
        >
          {icon}
        </div>
        <div className="flex-1 truncate text-xs font-semibold">
          {data.label}
        </div>
        {/* Status dot */}
        <div
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: status.color }}
          title={status.label}
        />
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        <div className="text-[10px] text-muted-foreground">
          {data.definition.description}
        </div>
        {children}
        {/* Config summary */}
        {Object.keys(data.config).length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {Object.entries(data.config)
              .slice(0, 3)
              .map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground"
                >
                  <span className="font-medium">{key}:</span>
                  <span className="truncate">
                    {String(val).slice(0, 30)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Handles */}
      {data.definition.inputs.map((handle, i) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="target"
          position={Position.Left}
          style={{
            top: `${30 + i * 20}%`,
            background: accentColor,
            width: 8,
            height: 8,
            border: "2px solid white",
          }}
          title={handle.label}
        />
      ))}
      {data.definition.outputs.map((handle, i) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="source"
          position={Position.Right}
          style={{
            top: `${30 + i * 20}%`,
            background: accentColor,
            width: 8,
            height: 8,
            border: "2px solid white",
          }}
          title={handle.label}
        />
      ))}
    </div>
  );
}

// ============================================================================
// CATEGORY-SPECIFIC NODE COMPONENTS
// ============================================================================

/** Trigger node - green accent, bolt icon */
export const TriggerNode = memo(function TriggerNode({
  data,
  selected,
}: NodeProps) {
  const d = data as unknown as NodeData;
  return (
    <NodeShell
      data={d}
      selected={!!selected}
      accentColor={d.definition.color}
      icon={<BoltIcon />}
    />
  );
});

/** Integration node - brand color accent */
export const IntegrationNode = memo(function IntegrationNode({
  data,
  selected,
}: NodeProps) {
  const d = data as unknown as NodeData;
  return (
    <NodeShell
      data={d}
      selected={!!selected}
      accentColor={d.definition.color}
      icon={<PlugIcon />}
    >
      {d.definition.integrationStatus === "coming_soon" && (
        <div className="mt-1 rounded bg-yellow-500/10 px-1.5 py-0.5 text-center text-[9px] font-medium text-yellow-600">
          Coming Soon
        </div>
      )}
    </NodeShell>
  );
});

/** Logic node - purple accent */
export const LogicNode = memo(function LogicNode({
  data,
  selected,
}: NodeProps) {
  const d = data as unknown as NodeData;
  return (
    <NodeShell
      data={d}
      selected={!!selected}
      accentColor={d.definition.color}
      icon={<GitBranchIcon />}
    />
  );
});

/** LC Native node - amber accent, star icon */
export const LcNativeNode = memo(function LcNativeNode({
  data,
  selected,
}: NodeProps) {
  const d = data as unknown as NodeData;
  return (
    <NodeShell
      data={d}
      selected={!!selected}
      accentColor={d.definition.color}
      icon={<StarIcon />}
    />
  );
});

// ============================================================================
// NODE TYPES MAP (for React Flow)
// ============================================================================

export const nodeTypes = {
  trigger: TriggerNode,
  integration: IntegrationNode,
  logic: LogicNode,
  lc_native: LcNativeNode,
};

// ============================================================================
// TINY SVG ICONS (inline to avoid dependency)
// ============================================================================

function BoltIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" />
      <path d="M18 8v5a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6V8z" />
    </svg>
  );
}

function GitBranchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
