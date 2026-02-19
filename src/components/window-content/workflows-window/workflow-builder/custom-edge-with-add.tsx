/**
 * CUSTOM EDGE WITH ADD BUTTON
 *
 * n8n-style edge with a "+" button in the middle to insert behaviors.
 * Allows users to add behaviors between existing nodes visually.
 */

"use client";

import React from "react";
import { BaseEdge, EdgeProps, getSmoothStepPath } from "@xyflow/react";
import { Plus } from "lucide-react";

interface CustomEdgeWithAddProps extends EdgeProps {
  data?: {
    onAddBehavior?: (sourceId: string, targetId: string) => void;
  };
}

export function CustomEdgeWithAdd({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: CustomEdgeWithAddProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data?.onAddBehavior) {
      // Extract source and target behavior IDs from edge ID
      // Edge ID format: "edge-bhv_123-to-bhv_456"
      const parts = id.split("-to-");
      if (parts.length === 2) {
        const sourceId = parts[0].replace("edge-", "");
        const targetId = parts[1];
        data.onAddBehavior(sourceId, targetId);
      }
    }
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />

      {/* Add button in the middle of the edge */}
      <foreignObject
        width={24}
        height={24}
        x={labelX - 12}
        y={labelY - 12}
        className="overflow-visible"
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div className="flex items-center justify-center">
          <button
            onClick={handleAddClick}
            className="desktop-interior-button p-1 shadow-lg hover:scale-110 transition-transform"
            style={{
              background: 'var(--window-document-bg-elevated)',
              border: '2px solid var(--window-document-border)',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Insert behavior here"
          >
            <Plus className="h-3 w-3" style={{ color: 'var(--tone-accent)' }} />
          </button>
        </div>
      </foreignObject>
    </>
  );
}
