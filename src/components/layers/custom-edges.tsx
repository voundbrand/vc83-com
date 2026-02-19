"use client";

import { memo, type FC } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

// Inject keyframe animation for active edge flow
if (typeof document !== "undefined" && !document.getElementById("edge-dash-flow-style")) {
  const style = document.createElement("style");
  style.id = "edge-dash-flow-style";
  style.textContent = `@keyframes edgeDashFlow { to { stroke-dashoffset: -12; } }`;
  document.head.appendChild(style);
}

// ============================================================================
// EDGE STATUS COLORS
// ============================================================================

type EdgeStatus = "draft" | "active" | "error" | "configured";

const EDGE_COLORS: Record<EdgeStatus, string> = {
  draft: "#6B7280",       // gray
  configured: "#EAB308",  // yellow
  active: "#22C55E",      // green
  error: "#EF4444",       // red
};

// ============================================================================
// WORKFLOW EDGE
// ============================================================================

export const WorkflowEdge: FC<EdgeProps> = memo(function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}) {
  const status = ((data?.status as string) ?? "draft") as EdgeStatus;
  const color = EDGE_COLORS[status] ?? EDGE_COLORS.draft;
  const hasMapping = data?.dataMapping && Object.keys(data.dataMapping as Record<string, string>).length > 0;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      {/* Wider invisible path for easier click target */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        className="react-flow__edge-interaction"
      />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "#3B82F6" : color,
          strokeWidth: selected ? 2.5 : status === "active" ? 2 : 1.5,
          opacity: status === "draft" ? 0.6 : 1,
          strokeDasharray: status === "active" ? "8 4" : status === "draft" ? "6 3" : undefined,
          strokeDashoffset: status === "active" ? 0 : undefined,
          animation: status === "active" ? "edgeDashFlow 0.6s linear infinite" : undefined,
          transition: "stroke 150ms, stroke-width 150ms",
        }}
      />
      {/* Edge label - mapping indicator / config stub */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          <button
            className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] transition-colors ${
              selected
                ? "border-blue-500 bg-blue-500/20 text-blue-300"
                : hasMapping
                  ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-400"
                  : "border-slate-600 bg-slate-800 text-slate-400 opacity-0 hover:opacity-100"
            }`}
            title={hasMapping ? "Data mapping configured" : "Configure data mapping (Phase 3)"}
            onClick={(e) => {
              e.stopPropagation();
              // Stub: will open data mapping editor in Phase 3
            }}
          >
            {hasMapping ? (
              <MapIcon />
            ) : (
              <PlusIcon />
            )}
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

// ============================================================================
// EDGE TYPES MAP (for React Flow)
// ============================================================================

export const edgeTypes = {
  workflow: WorkflowEdge,
};

// ============================================================================
// TINY SVG ICONS
// ============================================================================

function MapIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
