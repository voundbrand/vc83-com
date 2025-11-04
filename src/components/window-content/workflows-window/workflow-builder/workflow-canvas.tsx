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
import { Package, Zap, FileText, CreditCard, Building2, User } from "lucide-react";
import { ObjectContextPanel } from "./object-context-panel";

interface WorkflowObject {
  objectId: string;
  objectType: string;
  role?: string;
}

interface WorkflowBehavior {
  id: string;
  type: string;
  enabled: boolean;
  priority: number;
  config?: Record<string, unknown>;
}

interface WorkflowCanvasProps {
  objects: WorkflowObject[];
  behaviors: WorkflowBehavior[];
  onRemoveObject: (objectId: string) => void;
  onRemoveBehavior: (behaviorId: string) => void;
}

export function WorkflowCanvas({
  objects,
  behaviors,
  onRemoveObject,
  onRemoveBehavior,
}: WorkflowCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Build smart connections between objects and behaviors
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Find object types
    const formObjects = objects.filter((o) => o.objectType === "form");
    const productObjects = objects.filter((o) => o.objectType === "product");
    const checkoutObjects = objects.filter((o) => o.objectType === "checkout" || o.objectType === "checkout_instance");
    const crmOrgObjects = objects.filter((o) => o.objectType === "crm_organization");
    const crmContactObjects = objects.filter((o) => o.objectType === "crm_contact");

    // Layout: Forms on left, Products in middle-left, CRM in middle-right, Checkout/Behaviors on right
    let formY = 100;
    let productY = 100;
    let crmY = 100;
    let checkoutY = 100;
    let behaviorY = 100;

    // Add form nodes (left column)
    formObjects.forEach((obj) => {
      nodes.push({
        id: `object-${obj.objectId}`,
        type: "objectNode",
        position: { x: 50, y: formY },
        data: {
          label: obj.objectType,
          objectId: obj.objectId,
          objectType: obj.objectType,
          role: obj.role,
          onRemove: () => onRemoveObject(obj.objectId),
          onSelect: () => {}, // Will be set by node click
        },
      });
      formY += 180;
    });

    // Add product nodes (middle column)
    productObjects.forEach((obj) => {
      nodes.push({
        id: `object-${obj.objectId}`,
        type: "objectNode",
        position: { x: 350, y: productY },
        data: {
          label: obj.objectType,
          objectId: obj.objectId,
          objectType: obj.objectType,
          role: obj.role,
          onRemove: () => onRemoveObject(obj.objectId),
        },
      });
      productY += 180;
    });

    // Add CRM organization nodes (middle-right column)
    crmOrgObjects.forEach((obj) => {
      nodes.push({
        id: `object-${obj.objectId}`,
        type: "objectNode",
        position: { x: 500, y: crmY },
        data: {
          label: obj.objectType,
          objectId: obj.objectId,
          objectType: obj.objectType,
          role: obj.role,
          onRemove: () => onRemoveObject(obj.objectId),
        },
      });
      crmY += 180;
    });

    // Add CRM contact nodes (same column, below orgs)
    crmContactObjects.forEach((obj) => {
      nodes.push({
        id: `object-${obj.objectId}`,
        type: "objectNode",
        position: { x: 500, y: crmY },
        data: {
          label: obj.objectType,
          objectId: obj.objectId,
          objectType: obj.objectType,
          role: obj.role,
          onRemove: () => onRemoveObject(obj.objectId),
        },
      });
      crmY += 180;
    });

    // Add checkout nodes (right column, top)
    checkoutObjects.forEach((obj) => {
      nodes.push({
        id: `object-${obj.objectId}`,
        type: "objectNode",
        position: { x: 750, y: checkoutY },
        data: {
          label: obj.objectType,
          objectId: obj.objectId,
          objectType: obj.objectType,
          role: obj.role,
          onRemove: () => onRemoveObject(obj.objectId),
        },
      });
      checkoutY += 180;
    });

    // Add behavior nodes (right column, below checkout)
    behaviors.forEach((behavior) => {
      nodes.push({
        id: `behavior-${behavior.id}`,
        type: "behaviorNode",
        position: { x: 750, y: Math.max(checkoutY, 300) + behaviorY },
        data: {
          label: behavior.type,
          behaviorId: behavior.id,
          behaviorType: behavior.type,
          enabled: behavior.enabled,
          priority: behavior.priority,
          config: behavior.config,
          onRemove: () => onRemoveBehavior(behavior.id),
        },
      });
      behaviorY += 180;
    });

    // SMART EDGE GENERATION: Connect objects and behaviors based on their relationships

    // 1. Form → Product connections
    formObjects.forEach((form) => {
      productObjects.forEach((product) => {
        edges.push({
          id: `edge-form-${form.objectId}-product-${product.objectId}`,
          source: `object-${form.objectId}`,
          target: `object-${product.objectId}`,
          label: "📝 Collects data for",
          type: "smoothstep",
          animated: false,
          style: { stroke: "#9333ea", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#9333ea" },
          labelStyle: { fill: "#9333ea", fontSize: 10, fontWeight: 600 },
          labelBgStyle: { fill: "#f3e8ff", fillOpacity: 0.9 },
        });
      });
    });

    // 2. Product → Checkout connections
    productObjects.forEach((product) => {
      checkoutObjects.forEach((checkout) => {
        edges.push({
          id: `edge-product-${product.objectId}-checkout-${checkout.objectId}`,
          source: `object-${product.objectId}`,
          target: `object-${checkout.objectId}`,
          label: "🛒 Sold through",
          type: "smoothstep",
          animated: false,
          style: { stroke: "#2563eb", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#2563eb" },
          labelStyle: { fill: "#2563eb", fontSize: 10, fontWeight: 600 },
          labelBgStyle: { fill: "#dbeafe", fillOpacity: 0.9 },
        });
      });
    });

    // 3. Form → Checkout connections (if no product)
    if (productObjects.length === 0) {
      formObjects.forEach((form) => {
        checkoutObjects.forEach((checkout) => {
          edges.push({
            id: `edge-form-${form.objectId}-checkout-${checkout.objectId}`,
            source: `object-${form.objectId}`,
            target: `object-${checkout.objectId}`,
            label: "📝 Collected in",
            type: "smoothstep",
            animated: false,
            style: { stroke: "#9333ea", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#9333ea" },
            labelStyle: { fill: "#9333ea", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "#f3e8ff", fillOpacity: 0.9 },
          });
        });
      });
    }

    // 4. Behavior → Object connections (based on behavior type)
    behaviors.forEach((behavior) => {
      const behaviorId = `behavior-${behavior.id}`;

      // FORM-LINKING: connects to forms and checkout
      if (behavior.type === "form-linking" || behavior.type === "form_linking") {
        const formId = behavior.config?.formId;
        if (formId) {
          // Form → Behavior
          edges.push({
            id: `edge-form-${formId}-behavior-${behavior.id}`,
            source: `object-${formId}`,
            target: behaviorId,
            label: "🔗 Links to workflow",
            type: "smoothstep",
            animated: true,
            style: { stroke: "#059669", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#059669" },
            labelStyle: { fill: "#059669", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "#d1fae5", fillOpacity: 0.9 },
          });
        }

        // Behavior → Checkout (shows where form appears)
        checkoutObjects.forEach((checkout) => {
          edges.push({
            id: `edge-behavior-${behavior.id}-checkout-${checkout.objectId}`,
            source: behaviorId,
            target: `object-${checkout.objectId}`,
            label: `⏰ ${behavior.config?.timing || "during checkout"}`,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#059669", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#059669" },
            labelStyle: { fill: "#059669", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "#d1fae5", fillOpacity: 0.9 },
          });
        });
      }

      // ADDON-CALCULATION: connects to forms (reads responses) and products (adds items)
      if (behavior.type === "addon-calculation" || behavior.type === "addon_calculation") {
        // Forms → Behavior (reads form responses)
        formObjects.forEach((form) => {
          edges.push({
            id: `edge-form-${form.objectId}-behavior-${behavior.id}`,
            source: `object-${form.objectId}`,
            target: behaviorId,
            label: "📊 Reads responses from",
            type: "smoothstep",
            animated: true,
            style: { stroke: "#dc2626", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#dc2626" },
            labelStyle: { fill: "#dc2626", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "#fee2e2", fillOpacity: 0.9 },
          });
        });

        // Behavior → Products (adds add-ons to cart)
        productObjects.forEach((product) => {
          edges.push({
            id: `edge-behavior-${behavior.id}-product-${product.objectId}`,
            source: behaviorId,
            target: `object-${product.objectId}`,
            label: `➕ Adds ${Array.isArray((behavior.config as Record<string, unknown>)?.addons) ? ((behavior.config as Record<string, unknown>).addons as unknown[]).length : 0} add-ons`,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#dc2626", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#dc2626" },
            labelStyle: { fill: "#dc2626", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "#fee2e2", fillOpacity: 0.9 },
          });
        });
      }

      // EMPLOYER-DETECTION: connects to forms (reads employer) and checkout (billing)
      if (behavior.type === "employer-detection" || behavior.type === "employer_detection") {
        formObjects.forEach((form) => {
          edges.push({
            id: `edge-form-${form.objectId}-behavior-${behavior.id}`,
            source: `object-${form.objectId}`,
            target: behaviorId,
            label: "🏢 Detects employer from",
            type: "smoothstep",
            animated: true,
            style: { stroke: "#f59e0b", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
            labelStyle: { fill: "#f59e0b", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "#fef3c7", fillOpacity: 0.9 },
          });
        });

        checkoutObjects.forEach((checkout) => {
          edges.push({
            id: `edge-behavior-${behavior.id}-checkout-${checkout.objectId}`,
            source: behaviorId,
            target: `object-${checkout.objectId}`,
            label: "💳 Auto-fills billing",
            type: "smoothstep",
            animated: true,
            style: { stroke: "#f59e0b", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
            labelStyle: { fill: "#f59e0b", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "#fef3c7", fillOpacity: 0.9 },
          });
        });
      }

      // INVOICE-MAPPING: connects to forms (reads org) and checkout (payment)
      if (behavior.type === "invoice-mapping" || behavior.type === "invoice_mapping") {
        formObjects.forEach((form) => {
          edges.push({
            id: `edge-form-${form.objectId}-behavior-${behavior.id}`,
            source: `object-${form.objectId}`,
            target: behaviorId,
            label: "🏢 Maps organization from",
            type: "smoothstep",
            animated: true,
            style: { stroke: "#8b5cf6", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
            labelStyle: { fill: "#8b5cf6", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "#ede9fe", fillOpacity: 0.9 },
          });
        });

        checkoutObjects.forEach((checkout) => {
          edges.push({
            id: `edge-behavior-${behavior.id}-checkout-${checkout.objectId}`,
            source: behaviorId,
            target: `object-${checkout.objectId}`,
            label: "📄 Creates invoice for",
            type: "smoothstep",
            animated: true,
            style: { stroke: "#8b5cf6", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
            labelStyle: { fill: "#8b5cf6", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "#ede9fe", fillOpacity: 0.9 },
          });
        });
      }

      // STRIPE-PAYMENT: connects to checkout (processes payment)
      if (behavior.type === "stripe-payment") {
        checkoutObjects.forEach((checkout) => {
          edges.push({
            id: `edge-behavior-${behavior.id}-checkout-${checkout.objectId}`,
            source: behaviorId,
            target: `object-${checkout.objectId}`,
            label: "💳 Processes payment",
            type: "smoothstep",
            animated: true,
            style: { stroke: "#6366f1", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
            labelStyle: { fill: "#6366f1", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "#e0e7ff", fillOpacity: 0.9 },
          });
        });
      }

      // INVOICE-PAYMENT: connects to checkout (creates B2B invoice)
      if (behavior.type === "invoice-payment") {
        checkoutObjects.forEach((checkout) => {
          edges.push({
            id: `edge-behavior-${behavior.id}-checkout-${checkout.objectId}`,
            source: behaviorId,
            target: `object-${checkout.objectId}`,
            label: "📄 Generates invoice",
            type: "smoothstep",
            animated: true,
            style: { stroke: "#ec4899", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#ec4899" },
            labelStyle: { fill: "#ec4899", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "#fce7f3", fillOpacity: 0.9 },
          });
        });
      }

      // TAX-CALCULATION: connects to checkout (calculates taxes)
      if (behavior.type === "tax-calculation") {
        checkoutObjects.forEach((checkout) => {
          edges.push({
            id: `edge-behavior-${behavior.id}-checkout-${checkout.objectId}`,
            source: behaviorId,
            target: `object-${checkout.objectId}`,
            label: "🧮 Calculates tax",
            type: "smoothstep",
            animated: true,
            style: { stroke: "#10b981", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
            labelStyle: { fill: "#10b981", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "#d1fae5", fillOpacity: 0.9 },
          });
        });
      }

      // PAYMENT-PROVIDER-SELECTION: connects to checkout (controls payment options)
      if (behavior.type === "payment-provider-selection") {
        checkoutObjects.forEach((checkout) => {
          edges.push({
            id: `edge-behavior-${behavior.id}-checkout-${checkout.objectId}`,
            source: behaviorId,
            target: `object-${checkout.objectId}`,
            label: "⚙️ Configures payment",
            type: "smoothstep",
            animated: true,
            style: { stroke: "#f59e0b", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
            labelStyle: { fill: "#f59e0b", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "#fef3c7", fillOpacity: 0.9 },
          });
        });
      }
    });

    return { nodes, edges };
  }, [objects, behaviors, onRemoveObject, onRemoveBehavior]);

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

  // Custom node types
  const nodeTypes = useMemo(
    () => ({
      objectNode: ObjectNode,
      behaviorNode: BehaviorNode,
    }),
    []
  );

  if (objects.length === 0 && behaviors.length === 0) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: 'var(--win95-bg)' }}>
        <div className="max-w-md text-center">
          <Package className="mx-auto h-16 w-16" style={{ color: 'var(--neutral-gray)', opacity: 0.3 }} />
          <h3 className="mt-4 text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
            Empty Workflow
          </h3>
          <p className="mt-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
            Add objects from the left panel and behaviors from the right panel
            to build your workflow.
          </p>
          <div className="mt-4 rounded border-2 p-3 text-left" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>💡 Quick Start:</p>
            <ol className="text-[10px] space-y-1" style={{ color: 'var(--neutral-gray)' }}>
              <li>1. Select a <strong>Product</strong> or <strong>Form</strong> from the left</li>
              <li>2. Add a <strong>Checkout</strong> to process payments</li>
              <li>3. Add <strong>Behaviors</strong> from the right to customize the flow</li>
              <li>4. Watch the arrows connect everything automatically! ✨</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full" style={{ position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
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

      {/* Context Panel for selected node */}
      <ObjectContextPanel
        selectedNode={selectedNode}
        objects={objects}
        behaviors={behaviors}
        onClose={() => setSelectedNode(null)}
      />

      {/* Legend - bottom right to not block zoom controls */}
      <div className="absolute bottom-4 right-4 rounded border-2 p-2 shadow-lg" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <div className="text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>Legend</div>
        <div className="space-y-1 text-[10px]">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4" style={{ background: '#2563eb' }} />
            <span style={{ color: 'var(--neutral-gray)' }}>Object Flow</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: '#059669' }} />
            <span style={{ color: 'var(--neutral-gray)' }}>Behavior Action</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom Object Node Component
function ObjectNode({ data }: NodeProps) {
  const nodeData = data as Record<string, unknown>;
  const getIcon = () => {
    const type = String(nodeData.objectType || '');
    switch (type) {
      case "product":
        return <Package className="h-5 w-5" />;
      case "form":
        return <FileText className="h-5 w-5" />;
      case "checkout":
      case "checkout_instance":
        return <CreditCard className="h-5 w-5" />;
      case "crm_organization":
        return <Building2 className="h-5 w-5" />;
      case "crm_contact":
        return <User className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const getColor = () => {
    const type = String(nodeData.objectType || '');
    switch (type) {
      case "product":
        return { bg: "#dbeafe", border: "#2563eb", text: "#2563eb" };
      case "form":
        return { bg: "#f3e8ff", border: "#9333ea", text: "#9333ea" };
      case "checkout":
      case "checkout_instance":
        return { bg: "#dcfce7", border: "#16a34a", text: "#16a34a" };
      case "crm_organization":
        return { bg: "#fef3c7", border: "#f59e0b", text: "#f59e0b" };
      case "crm_contact":
        return { bg: "#fee2e2", border: "#dc2626", text: "#dc2626" };
      default:
        return { bg: "#f3f4f6", border: "#6b7280", text: "#6b7280" };
    }
  };

  const colors = getColor();

  return (
    <div
      className="rounded-lg border-2 shadow-lg p-3 min-w-[180px] cursor-pointer hover:shadow-xl transition-shadow"
      style={{ borderColor: colors.border, background: colors.bg }}
      title="Click to view details"
    >
      {/* Connection handles - required for React Flow edges */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: colors.border, width: 10, height: 10 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: colors.border, width: 10, height: 10 }}
      />

      <div className="flex items-center gap-2">
        <div className="rounded p-2" style={{ background: 'white', color: colors.text }}>
          {getIcon()}
        </div>
        <div>
          <div className="text-xs font-bold uppercase" style={{ color: colors.text }}>
            {String(nodeData.objectType || '')}
          </div>
          {nodeData.role ? (
            <div className="text-[10px]" style={{ color: colors.text, opacity: 0.7 }}>
              {String(nodeData.role)}
            </div>
          ) : null}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (typeof nodeData.onRemove === 'function') {
            nodeData.onRemove();
          }
        }}
        className="mt-2 w-full text-[10px] hover:underline"
        style={{ color: '#dc2626' }}
      >
        Remove
      </button>
    </div>
  );
}

// Custom Behavior Node Component
function BehaviorNode({ data }: NodeProps) {
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
            Priority: {String(nodeData.priority || 100)}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span
          className="text-[10px] font-bold"
          style={{ color: nodeData.enabled ? '#16a34a' : '#6b7280' }}
        >
          {nodeData.enabled ? "✓ Enabled" : "○ Disabled"}
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
          Remove
        </button>
      </div>
    </div>
  );
}
