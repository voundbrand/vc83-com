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
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

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
  const { t } = useNamespaceTranslations("ui.workflows");
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
          label: t("ui.workflows.canvas.edges.collectsDataFor"),
          type: "smoothstep",
          animated: false,
          style: { stroke: "var(--win95-highlight)", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--win95-highlight)" },
          labelStyle: { fill: "var(--win95-highlight)", fontSize: 10, fontWeight: 600 },
          labelBgStyle: { fill: "var(--win95-bg-light)", fillOpacity: 0.9 },
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
          label: t("ui.workflows.canvas.edges.soldThrough"),
          type: "smoothstep",
          animated: false,
          style: { stroke: "var(--win95-highlight)", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--win95-highlight)" },
          labelStyle: { fill: "var(--win95-highlight)", fontSize: 10, fontWeight: 600 },
          labelBgStyle: { fill: "var(--win95-bg-light)", fillOpacity: 0.9 },
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
            label: t("ui.workflows.canvas.edges.collectedIn"),
            type: "smoothstep",
            animated: false,
            style: { stroke: "var(--win95-highlight)", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--win95-highlight)" },
            labelStyle: { fill: "var(--win95-highlight)", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "var(--win95-bg-light)", fillOpacity: 0.9 },
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
            label: t("ui.workflows.canvas.edges.linksToWorkflow"),
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--win95-highlight)", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--win95-highlight)" },
            labelStyle: { fill: "var(--win95-highlight)", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "var(--win95-bg-light)", fillOpacity: 0.9 },
          });
        }

        // Behavior → Checkout (shows where form appears)
        checkoutObjects.forEach((checkout) => {
          edges.push({
            id: `edge-behavior-${behavior.id}-checkout-${checkout.objectId}`,
            source: behaviorId,
            target: `object-${checkout.objectId}`,
            label: `${behavior.config?.timing || t("ui.workflows.canvas.edges.duringCheckout")}`,
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--win95-highlight)", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--win95-highlight)" },
            labelStyle: { fill: "var(--win95-highlight)", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "var(--win95-bg-light)", fillOpacity: 0.9 },
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
            label: t("ui.workflows.canvas.edges.readsResponsesFrom"),
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--win95-highlight)", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--win95-highlight)" },
            labelStyle: { fill: "var(--win95-highlight)", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "var(--win95-bg-light)", fillOpacity: 0.9 },
          });
        });

        // Behavior → Products (adds add-ons to cart)
        productObjects.forEach((product) => {
          edges.push({
            id: `edge-behavior-${behavior.id}-product-${product.objectId}`,
            source: behaviorId,
            target: `object-${product.objectId}`,
            label: t("ui.workflows.canvas.edges.addsAddons", { count: Array.isArray((behavior.config as Record<string, unknown>)?.addons) ? ((behavior.config as Record<string, unknown>).addons as unknown[]).length : 0 }),
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--win95-highlight)", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--win95-highlight)" },
            labelStyle: { fill: "var(--win95-highlight)", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "var(--win95-bg-light)", fillOpacity: 0.9 },
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
            label: t("ui.workflows.canvas.edges.detectsEmployerFrom"),
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--win95-highlight)", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--win95-highlight)" },
            labelStyle: { fill: "var(--win95-highlight)", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "var(--win95-bg-light)", fillOpacity: 0.9 },
          });
        });

        checkoutObjects.forEach((checkout) => {
          edges.push({
            id: `edge-behavior-${behavior.id}-checkout-${checkout.objectId}`,
            source: behaviorId,
            target: `object-${checkout.objectId}`,
            label: t("ui.workflows.canvas.edges.autoFillsBilling"),
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--win95-highlight)", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--win95-highlight)" },
            labelStyle: { fill: "var(--win95-highlight)", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "var(--win95-bg-light)", fillOpacity: 0.9 },
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
            label: t("ui.workflows.canvas.edges.mapsOrganizationFrom"),
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--win95-highlight)", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--win95-highlight)" },
            labelStyle: { fill: "var(--win95-highlight)", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "var(--win95-bg-light)", fillOpacity: 0.9 },
          });
        });

        checkoutObjects.forEach((checkout) => {
          edges.push({
            id: `edge-behavior-${behavior.id}-checkout-${checkout.objectId}`,
            source: behaviorId,
            target: `object-${checkout.objectId}`,
            label: t("ui.workflows.canvas.edges.createsInvoiceFor"),
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--win95-highlight)", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--win95-highlight)" },
            labelStyle: { fill: "var(--win95-highlight)", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "var(--win95-bg-light)", fillOpacity: 0.9 },
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
            label: t("ui.workflows.canvas.edges.processesPayment"),
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--win95-highlight)", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--win95-highlight)" },
            labelStyle: { fill: "var(--win95-highlight)", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "var(--win95-bg-light)", fillOpacity: 0.9 },
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
            label: t("ui.workflows.canvas.edges.generatesInvoice"),
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--win95-highlight)", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--win95-highlight)" },
            labelStyle: { fill: "var(--win95-highlight)", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "var(--win95-bg-light)", fillOpacity: 0.9 },
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
            label: t("ui.workflows.canvas.edges.calculatesTax"),
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--win95-highlight)", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--win95-highlight)" },
            labelStyle: { fill: "var(--win95-highlight)", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "var(--win95-bg-light)", fillOpacity: 0.9 },
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
            label: t("ui.workflows.canvas.edges.configuresPayment"),
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--win95-highlight)", strokeWidth: 2, strokeDasharray: "5,5" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--win95-highlight)" },
            labelStyle: { fill: "var(--win95-highlight)", fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: "var(--win95-bg-light)", fillOpacity: 0.9 },
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

  // Custom node types with translation context
  const nodeTypes = useMemo(
    () => ({
      objectNode: (props: NodeProps) => <ObjectNode {...props} t={t} />,
      behaviorNode: (props: NodeProps) => <BehaviorNode {...props} t={t} />,
    }),
    [t]
  );

  if (objects.length === 0 && behaviors.length === 0) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: 'var(--win95-bg)' }}>
        <div className="max-w-md text-center">
          <Package className="mx-auto h-16 w-16" style={{ color: 'var(--neutral-gray)', opacity: 0.3 }} />
          <h3 className="mt-4 text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
            {t("ui.workflows.canvas.empty.title")}
          </h3>
          <p className="mt-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
            {t("ui.workflows.canvas.empty.description")}
          </p>
          <div className="mt-4 rounded border-2 p-3 text-left" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>{t("ui.workflows.canvas.empty.quickStart.title")}</p>
            <ol className="text-[10px] space-y-1" style={{ color: 'var(--neutral-gray)' }}>
              <li>{t("ui.workflows.canvas.empty.quickStart.step1")}</li>
              <li>{t("ui.workflows.canvas.empty.quickStart.step2")}</li>
              <li>{t("ui.workflows.canvas.empty.quickStart.step3")}</li>
              <li>{t("ui.workflows.canvas.empty.quickStart.step4")}</li>
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
        <div className="text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>{t("ui.workflows.canvas.legend.title")}</div>
        <div className="space-y-1 text-[10px]">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4" style={{ background: 'var(--win95-highlight)' }} />
            <span style={{ color: 'var(--neutral-gray)' }}>{t("ui.workflows.canvas.legend.objectFlow")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: 'var(--win95-highlight)' }} />
            <span style={{ color: 'var(--neutral-gray)' }}>{t("ui.workflows.canvas.legend.behaviorAction")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom Object Node Component
function ObjectNode({ data, t }: NodeProps & { t: (key: string) => string }) {
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
        {t("ui.workflows.canvas.nodes.remove")}
      </button>
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
