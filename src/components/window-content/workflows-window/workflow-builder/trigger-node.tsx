/**
 * TRIGGER NODE
 *
 * Visual start node for workflows (like n8n's trigger nodes).
 * Shows the trigger type and provides a clear entry point for the workflow.
 */

"use client";

import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Play, Clock, Zap, MousePointer, Calendar, FileText, CreditCard } from "lucide-react";

interface TriggerNodeData {
  triggerOn: string;
  triggerLabel?: string;
}

export function TriggerNode({ data }: NodeProps) {
  const nodeData = data as unknown as TriggerNodeData;

  const getTriggerIcon = () => {
    switch (nodeData.triggerOn) {
      case "manual":
        return <MousePointer className="h-5 w-5" />;
      case "scheduled":
        return <Clock className="h-5 w-5" />;
      case "api_call":
        return <Zap className="h-5 w-5" />;
      case "form_submit":
        return <FileText className="h-5 w-5" />;
      case "checkout_start":
      case "payment_complete":
        return <CreditCard className="h-5 w-5" />;
      case "event_completion":
        return <Calendar className="h-5 w-5" />;
      default:
        return <Play className="h-5 w-5" />;
    }
  };

  const getTriggerLabel = () => {
    if (nodeData.triggerLabel) return nodeData.triggerLabel;

    switch (nodeData.triggerOn) {
      case "manual":
        return "Manual Trigger";
      case "scheduled":
        return "Scheduled";
      case "api_call":
        return "API Call";
      case "form_submit":
        return "Form Submit";
      case "checkout_start":
        return "Checkout Start";
      case "payment_complete":
        return "Payment Complete";
      case "event_completion":
        return "Event Complete";
      default:
        return "Trigger";
    }
  };

  return (
    <div
      className="rounded-lg border-2 shadow-lg p-3 min-w-[180px]"
      style={{
        borderColor: '#16a34a',
        background: '#dcfce7',
        cursor: 'default'
      }}
      title="Workflow trigger - defines when this workflow executes"
    >
      {/* Only output handle - no input */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#16a34a', width: 10, height: 10 }}
      />

      <div className="flex items-center gap-2">
        <div className="rounded p-2" style={{ background: 'white', color: '#16a34a' }}>
          {getTriggerIcon()}
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase" style={{ color: '#15803d', opacity: 0.7 }}>
            TRIGGER
          </div>
          <div className="text-xs font-bold" style={{ color: '#15803d' }}>
            {getTriggerLabel()}
          </div>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t" style={{ borderColor: '#86efac' }}>
        <div className="text-[10px]" style={{ color: '#15803d' }}>
          <strong>Starts workflow when:</strong> {getTriggerLabel()}
        </div>
      </div>
    </div>
  );
}
