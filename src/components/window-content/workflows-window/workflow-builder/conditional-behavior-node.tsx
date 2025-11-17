/**
 * CONDITIONAL BEHAVIOR NODE
 *
 * Node component for conditional branching in workflows.
 * Supports multiple output handles (success, error, custom branches).
 * Inspired by n8n's IF node design.
 */

"use client";

import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { GitBranch, Settings } from "lucide-react";

interface ConditionalNodeData extends Record<string, unknown> {
  behaviorId: string;
  behaviorType: string;
  enabled: boolean;
  priority: number;
  config?: {
    conditions?: Array<{
      name: string;
      expression: string;
      color: string;
    }>;
  };
  outputs?: string[]; // ["success", "error"]
  onRemove?: () => void;
  onEdit?: () => void;
}

export function ConditionalBehaviorNode({ data }: NodeProps) {
  const nodeData = data as ConditionalNodeData;
  const conditions = nodeData.config?.conditions || [
    { name: "success", expression: "true", color: "#16a34a" },
    { name: "error", expression: "false", color: "#dc2626" },
  ];

  return (
    <div
      className="rounded-lg border-2 shadow-lg p-3 min-w-[200px] cursor-pointer hover:shadow-xl transition-shadow"
      style={{
        borderColor: "#9333ea",
        background: "#f3e8ff",
      }}
    >
      {/* Input handle (left side) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "#9333ea", width: 10, height: 10 }}
      />

      {/* Node Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="rounded p-2" style={{ background: "white", color: "#9333ea" }}>
          <GitBranch className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold" style={{ color: "#9333ea" }}>
            Conditional Branch
          </div>
          <div className="text-[10px]" style={{ color: "#9333ea", opacity: 0.7 }}>
            Priority: {nodeData.priority || 100}
          </div>
        </div>
        {nodeData.onEdit && typeof nodeData.onEdit === 'function' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const editFunc = nodeData.onEdit as () => void;
              editFunc();
            }}
            className="p-1 hover:bg-white/50 rounded"
            title="Edit conditions"
          >
            <Settings className="h-3 w-3" style={{ color: "#9333ea" }} />
          </button>
        )}
      </div>

      {/* Output Branches */}
      <div className="space-y-2">
        {conditions.map((condition: {
          name: string;
          expression: string;
          color: string;
        }, index: number) => {
          const isSuccess = condition.name.toLowerCase() === "success";
          const isError = condition.name.toLowerCase() === "error";

          // Position handles: success on right, error on bottom
          const handlePosition = isSuccess ? Position.Right : Position.Bottom;
          const handleStyle = isSuccess
            ? { top: "30%", background: condition.color, width: 10, height: 10 }
            : { left: "50%", background: condition.color, width: 10, height: 10 };

          return (
            <div key={condition.name} className="relative">
              {/* Output handle */}
              <Handle
                type="source"
                position={handlePosition}
                id={condition.name}
                style={handleStyle}
              />

              {/* Branch label */}
              <div
                className="text-[10px] px-2 py-1 rounded border flex items-center gap-1"
                style={{
                  borderColor: condition.color,
                  background: "white",
                  color: condition.color,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: condition.color }}
                />
                <span className="font-bold uppercase">{condition.name}</span>
              </div>

              {/* Condition preview */}
              {condition.expression && (
                <div
                  className="text-[9px] mt-0.5 px-2 truncate"
                  style={{ color: "#6b7280" }}
                  title={condition.expression}
                >
                  {condition.expression.length > 30
                    ? `${condition.expression.substring(0, 30)}...`
                    : condition.expression}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status and Remove */}
      <div className="mt-3 flex items-center justify-between pt-2 border-t" style={{ borderColor: "#e9d5ff" }}>
        <span
          className="text-[10px] font-bold"
          style={{ color: nodeData.enabled ? "#16a34a" : "#6b7280" }}
        >
          {nodeData.enabled ? "Enabled" : "Disabled"}
        </span>
        {nodeData.onRemove && typeof nodeData.onRemove === 'function' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const removeFunc = nodeData.onRemove as () => void;
              removeFunc();
            }}
            className="text-[10px] hover:underline"
            style={{ color: "#dc2626" }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
