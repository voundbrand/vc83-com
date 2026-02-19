/**
 * WORKFLOW CANVAS
 *
 * Visual canvas for displaying workflow objects and behaviors as nodes.
 * Uses React Flow for drag-and-drop and connections with smart arrows.
 */

"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  MarkerType,
  Handle,
  Position,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Zap } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { TriggerNode } from "./trigger-node";
import { CustomEdgeWithAdd } from "./custom-edge-with-add";
import { InsertBehaviorModal } from "./insert-behavior-modal";
import { ConditionalBehaviorNode } from "./conditional-behavior-node";
import { ConditionEditor } from "./condition-editor";

interface WorkflowBehavior {
  id: string;
  type: string;
  enabled: boolean;
  priority: number;
  config?: Record<string, unknown>;
  outputs?: string[]; // For conditional nodes: ["success", "error"]
  branches?: {
    [outputName: string]: {
      condition: string;
      nextBehaviorId?: string;
    };
  };
}

interface WorkflowCanvasProps {
  behaviors: WorkflowBehavior[];
  triggerOn: string;
  onRemoveBehavior: (behaviorId: string) => void;
  onAddBehavior: (behavior: WorkflowBehavior) => void;
  onUpdateBehavior: (behaviorId: string, updates: Partial<WorkflowBehavior>) => void;
}

export function WorkflowCanvas({
  behaviors,
  triggerOn,
  onRemoveBehavior,
  onAddBehavior,
  onUpdateBehavior,
}: WorkflowCanvasProps) {
  const { t } = useNamespaceTranslations("ui.workflows");
  const [, setSelectedNode] = useState<Node | null>(null);
  const [insertModal, setInsertModal] = useState<{
    afterBehaviorId: string;
    beforeBehaviorId: string;
  } | null>(null);
  const [editingConditions, setEditingConditions] = useState<{
    behaviorId: string;
    conditions: Array<{ name: string; expression: string; color: string }>;
  } | null>(null);

  // Handle adding behavior from edge "+" button - MUST be defined before useMemo!
  const handleEdgeAddBehavior = useCallback((sourceId: string, targetId: string) => {
    setInsertModal({ afterBehaviorId: sourceId, beforeBehaviorId: targetId });
  }, []);

  // Build horizontal behavior pipeline with trigger node (sorted by priority)
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Add trigger node at the start (non-deletable)
    nodes.push({
      id: "trigger-node",
      type: "triggerNode",
      position: { x: 50, y: 200 },
      data: {
        triggerOn: triggerOn,
      },
      draggable: false, // Trigger node is fixed
    });

    // Sort behaviors by priority (highest first = leftmost)
    const sortedBehaviors = [...behaviors].sort((a, b) => b.priority - a.priority);

    // Position behaviors horizontally (starting after trigger)
    sortedBehaviors.forEach((behavior, index) => {
      // Determine node type based on behavior type
      const isConditional = behavior.type === "conditional" || behavior.outputs;
      const nodeType = isConditional ? "conditionalNode" : "behaviorNode";

      nodes.push({
        id: `behavior-${behavior.id}`,
        type: nodeType,
        position: { x: 350 + (index * 280), y: 200 }, // Start after trigger
        data: {
          label: behavior.type,
          behaviorId: behavior.id,
          behaviorType: behavior.type,
          enabled: behavior.enabled,
          priority: behavior.priority,
          config: behavior.config,
          outputs: behavior.outputs,
          onRemove: () => onRemoveBehavior(behavior.id),
          onEdit: isConditional
            ? () => {
                const conditions = behavior.config?.conditions as Array<{
                  name: string;
                  expression: string;
                  color: string;
                }> || [
                  { name: "success", expression: "input.valid === true", color: "#16a34a" },
                  { name: "error", expression: "input.valid !== true", color: "#dc2626" },
                ];
                setEditingConditions({ behaviorId: behavior.id, conditions });
              }
            : undefined,
        },
      });
    });

    // Connect trigger to first behavior (if any)
    if (sortedBehaviors.length > 0) {
      edges.push({
        id: `edge-trigger-to-${sortedBehaviors[0].id}`,
        source: "trigger-node",
        target: `behavior-${sortedBehaviors[0].id}`,
        type: "customEdgeWithAdd",
        animated: true,
        style: { stroke: "var(--tone-accent)", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "var(--tone-accent)" },
        data: {
          onAddBehavior: handleEdgeAddBehavior,
        },
      });
    }

    // Connect behaviors sequentially (left to right) with custom edges
    sortedBehaviors.forEach((behavior, index) => {
      if (index < sortedBehaviors.length - 1) {
        edges.push({
          id: `edge-${behavior.id}-to-${sortedBehaviors[index + 1].id}`,
          source: `behavior-${behavior.id}`,
          target: `behavior-${sortedBehaviors[index + 1].id}`,
          type: "customEdgeWithAdd",
          animated: true,
          style: { stroke: "var(--tone-accent)", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--tone-accent)" },
          data: {
            onAddBehavior: handleEdgeAddBehavior,
          },
        });
      }
    });

    return { nodes, edges };
  }, [behaviors, triggerOn, onRemoveBehavior, handleEdgeAddBehavior]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when props change
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    []
  );

  // Handle inserting a behavior between two existing behaviors
  const handleInsertBehavior = useCallback((newBehavior: WorkflowBehavior) => {
    if (!insertModal) return;

    // Find the behaviors before and after
    const afterBehavior = behaviors.find((b) => `behavior-${b.id}` === insertModal.afterBehaviorId || insertModal.afterBehaviorId === "trigger-node");
    const beforeBehavior = behaviors.find((b) => `behavior-${b.id}` === insertModal.beforeBehaviorId);

    // Calculate priority as average of before and after
    let newPriority = 50;
    if (afterBehavior && beforeBehavior) {
      newPriority = (afterBehavior.priority + beforeBehavior.priority) / 2;
    } else if (afterBehavior) {
      newPriority = afterBehavior.priority - 10;
    } else if (beforeBehavior) {
      newPriority = beforeBehavior.priority + 10;
    }

    const behaviorWithPriority = {
      ...newBehavior,
      priority: newPriority,
    };

    onAddBehavior(behaviorWithPriority);
    setInsertModal(null);
  }, [insertModal, behaviors, onAddBehavior]);

  // Handle node drag end - recalculate priorities based on X position
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.id === "trigger-node") return; // Can't move trigger

      // Get all behavior nodes sorted by X position
      const behaviorNodes = nodes
        .filter((n) => n.type === "behaviorNode")
        .sort((a, b) => a.position.x - b.position.x);

      // Recalculate priorities (leftmost = highest priority)
      behaviorNodes.forEach((n, index) => {
        const behaviorId = (n.data as { behaviorId: string }).behaviorId;
        const newPriority = 100 - (index * 10);

        // Update the behavior's priority
        onUpdateBehavior(behaviorId, { priority: newPriority });
      });
    },
    [nodes, onUpdateBehavior]
  );

  // Custom node types with translation context
  const nodeTypes = useMemo(
    () => ({
      triggerNode: TriggerNode,
      behaviorNode: (props: NodeProps) => <BehaviorNode {...props} t={t} />,
      conditionalNode: ConditionalBehaviorNode,
    }),
    [t]
  );

  // Handle saving condition edits
  const handleSaveConditions = useCallback(
    (conditions: Array<{ name: string; expression: string; color: string }>) => {
      if (!editingConditions) return;

      onUpdateBehavior(editingConditions.behaviorId, {
        config: {
          conditions,
        },
        outputs: conditions.map((c) => c.name),
      });

      setEditingConditions(null);
    },
    [editingConditions, onUpdateBehavior]
  );

  // Custom edge types
  const edgeTypes = useMemo(
    () => ({
      customEdgeWithAdd: CustomEdgeWithAdd,
    }),
    []
  );

  // Note: We always show the canvas now (with trigger node), even if no behaviors

  return (
    <div className="h-full w-full" style={{ position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, includeHiddenNodes: false, maxZoom: 0.7 }}
        minZoom={0.05}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
          style: { strokeWidth: 2 },
        }}
        snapToGrid
        snapGrid={[15, 15]}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Controls />
      </ReactFlow>

      {/* Legend - bottom right to not block zoom controls */}
      <div className="absolute bottom-4 right-4 rounded border-2 p-2 shadow-lg" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}>
        <div className="text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>Behavior Pipeline</div>
        <div className="space-y-1 text-[10px]">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4" style={{ background: 'var(--tone-accent)' }} />
            <span style={{ color: 'var(--neutral-gray)' }}>Execution flow (by priority)</span>
          </div>
          <div className="text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
             Drag nodes to reorder • Click + on arrows to insert
          </div>
        </div>
      </div>

      {/* Empty state overlay (only show if no behaviors) */}
      {behaviors.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="max-w-md text-center pointer-events-auto">
            <Zap className="mx-auto h-16 w-16" style={{ color: 'var(--neutral-gray)', opacity: 0.3 }} />
            <h3 className="mt-4 text-sm font-bold" style={{ color: 'var(--window-document-text)' }}>
              Add Your First Behavior
            </h3>
            <p className="mt-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
              Click the + button on the arrow or add behaviors from the right panel.
            </p>
          </div>
        </div>
      )}

      {/* Insert Behavior Modal */}
      {insertModal && (
        <InsertBehaviorModal
          afterBehaviorId={insertModal.afterBehaviorId}
          beforeBehaviorId={insertModal.beforeBehaviorId}
          onInsert={handleInsertBehavior}
          onCancel={() => setInsertModal(null)}
        />
      )}

      {/* Condition Editor Modal */}
      {editingConditions && (
        <ConditionEditor
          conditions={editingConditions.conditions}
          onSave={handleSaveConditions}
          onCancel={() => setEditingConditions(null)}
        />
      )}
    </div>
  );
}

// Custom Behavior Node Component
function BehaviorNode({ data, t }: NodeProps & { t: (key: string) => string }) {
  const nodeData = data as Record<string, unknown>;
  const getBehaviorLabel = () => {
    const behaviorType = String(nodeData.behaviorType || '');
    switch (behaviorType) {
      case "form-linking":
      case "form_linking":
        return "Form Linking";
      case "addon-calculation":
      case "addon_calculation":
        return "Add-on Calculation";
      case "employer-detection":
      case "employer_detection":
        return "Employer Detection";
      case "invoice-mapping":
      case "invoice_mapping":
        return "Invoice Mapping";
      default:
        return behaviorType.replace(/-/g, " ") || "Behavior";
    }
  };

  return (
    <div
      className="rounded-lg border-2 shadow-lg p-3 min-w-[180px] cursor-pointer hover:shadow-xl transition-shadow"
      style={{ borderColor: '#7c3aed', background: '#f5f3ff' }}
      title="Click to view details"
    >
      {/* Connection handles - required for React Flow edges */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#7c3aed', width: 10, height: 10 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#7c3aed', width: 10, height: 10 }}
      />

      <div className="flex items-center gap-2">
        <div className="rounded p-2" style={{ background: 'white', color: '#7c3aed' }}>
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-bold" style={{ color: '#7c3aed' }}>
            {getBehaviorLabel()}
          </div>
          <div className="text-[10px]" style={{ color: '#7c3aed', opacity: 0.7 }}>
            {t("ui.workflows.canvas.nodes.priority")}: {String(nodeData.priority || 100)}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span
          className="text-[10px] font-bold"
          style={{ color: nodeData.enabled ? '#16a34a' : '#6b7280' }}
        >
          {nodeData.enabled ? t("ui.workflows.canvas.nodes.enabled") : t("ui.workflows.canvas.nodes.disabled")}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (typeof nodeData.onRemove === 'function') {
              nodeData.onRemove();
            }
          }}
          className="text-[10px] hover:underline"
          style={{ color: '#dc2626' }}
        >
          {t("ui.workflows.canvas.nodes.remove")}
        </button>
      </div>
    </div>
  );
}
