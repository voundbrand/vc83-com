"use client";

import { useCallback, useRef, useState } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type Viewport,
  useReactFlow,
} from "@xyflow/react";
import type { NodeDefinition } from "../../../convex/layers/types";

// ============================================================================
// UNDO / REDO
// ============================================================================

interface HistoryEntry {
  nodes: Node[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

// ============================================================================
// STORE
// ============================================================================

export function useLayersStore() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // History stacks
  const past = useRef<HistoryEntry[]>([]);
  const future = useRef<HistoryEntry[]>([]);
  const skipHistory = useRef(false);

  const reactFlowInstance = useReactFlow();

  const hasNodeType = useCallback(
    (candidateNodes: Node[], nodeType: string) =>
      candidateNodes.some((node) => (node.data.definition as NodeDefinition).type === nodeType),
    [],
  );

  // --- snapshot helper ---
  const pushSnapshot = useCallback(() => {
    if (skipHistory.current) return;
    past.current = [
      ...past.current.slice(-(MAX_HISTORY - 1)),
      { nodes: structuredClone(nodes), edges: structuredClone(edges) },
    ];
    future.current = [];
  }, [nodes, edges]);

  // --- undo ---
  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) });
    skipHistory.current = true;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    skipHistory.current = false;
  }, [nodes, edges, setNodes, setEdges]);

  // --- redo ---
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) });
    skipHistory.current = true;
    setNodes(next.nodes);
    setEdges(next.edges);
    skipHistory.current = false;
  }, [nodes, edges, setNodes, setEdges]);

  // --- connect ---
  const onConnect = useCallback(
    (connection: Connection) => {
      pushSnapshot();
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "workflow",
            animated: false,
            data: { status: "draft", dataMapping: {} },
          },
          eds,
        ),
      );
      setIsDirty(true);
    },
    [setEdges, pushSnapshot],
  );

  // --- drop node from palette ---
  const addNode = useCallback(
    (definition: NodeDefinition, position: { x: number; y: number }) => {
      if (definition.singleton && hasNodeType(nodes, definition.type)) {
        return;
      }
      pushSnapshot();
      const id = `${definition.type}_${Date.now()}`;
      const newNode: Node = {
        id,
        type: definition.category, // maps to custom node component key
        position,
        data: {
          definition,
          config: {},
          status: "draft" as const,
          label: definition.name,
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(id);
      setIsDirty(true);
    },
    [setNodes, pushSnapshot, hasNodeType, nodes],
  );

  // --- batch add nodes and edges (for AI-generated workflows) ---
  const addNodesAndEdges = useCallback(
    (
      newNodeDefs: Array<{
        definition: NodeDefinition;
        position: { x: number; y: number };
        id: string;
        config?: Record<string, unknown>;
        label?: string;
      }>,
      newEdgeDefs: Array<{
        source: string;
        target: string;
        sourceHandle?: string;
        targetHandle?: string;
      }>,
    ) => {
      const existingNodeIds = new Set(nodes.map((n) => n.id));
      const singletonNodeTypes = new Set(
        nodes
          .map((n) => n.data.definition as NodeDefinition)
          .filter((definition) => definition.singleton)
          .map((definition) => definition.type),
      );

      const nodesToAdd: Node[] = [];
      for (const candidate of newNodeDefs) {
        if (candidate.definition.singleton && singletonNodeTypes.has(candidate.definition.type)) {
          continue;
        }

        nodesToAdd.push({
          id: candidate.id,
          type: candidate.definition.category,
          position: candidate.position,
          data: {
            definition: candidate.definition,
            config: candidate.config ?? {},
            status: "draft" as const,
            label: candidate.label ?? candidate.definition.name,
          },
        });

        if (candidate.definition.singleton) {
          singletonNodeTypes.add(candidate.definition.type);
        }
      }

      const addedNodeIds = new Set(nodesToAdd.map((n) => n.id));
      const edgesToAdd: Edge[] = newEdgeDefs
        .filter((e) => {
          const sourceExists = existingNodeIds.has(e.source) || addedNodeIds.has(e.source);
          const targetExists = existingNodeIds.has(e.target) || addedNodeIds.has(e.target);
          return sourceExists && targetExists;
        })
        .map((e, i) => ({
          id: `ai_edge_${Date.now()}_${i}`,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? "output",
          targetHandle: e.targetHandle ?? "input",
          type: "workflow",
          animated: false,
          data: { status: "draft", dataMapping: {} },
        }));

      if (nodesToAdd.length === 0 && edgesToAdd.length === 0) {
        return;
      }

      pushSnapshot();
      setNodes((nds) => [...nds, ...nodesToAdd]);
      setEdges((eds) => [...eds, ...edgesToAdd]);
      setIsDirty(true);
    },
    [setNodes, setEdges, pushSnapshot, nodes],
  );

  // --- delete selected ---
  const deleteSelected = useCallback(() => {
    pushSnapshot();
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => {
      const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
      return eds.filter(
        (e) => !e.selected && !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target),
      );
    });
    setSelectedNodeId(null);
    setIsDirty(true);
  }, [setNodes, setEdges, nodes, pushSnapshot]);

  // --- delete specific node ---
  const deleteNode = useCallback(
    (nodeId: string) => {
      pushSnapshot();
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNodeId((current) => (current === nodeId ? null : current));
      setIsDirty(true);
    },
    [setNodes, setEdges, pushSnapshot],
  );

  // --- update node config ---
  const updateNodeConfig = useCallback(
    (nodeId: string, configKey: string, value: unknown) => {
      pushSnapshot();
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config: { ...(n.data.config as Record<string, unknown>), [configKey]: value } } }
            : n,
        ),
      );
      setIsDirty(true);
    },
    [setNodes, pushSnapshot],
  );

  // --- duplicate selected nodes ---
  const duplicateSelected = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (selected.length === 0) return;
    const duplicableNodes = selected.filter((node) => {
      const definition = node.data.definition as NodeDefinition;
      return !definition.singleton;
    });
    if (duplicableNodes.length === 0) return;

    pushSnapshot();
    const newNodes: Node[] = duplicableNodes.map((n) => ({
      ...structuredClone(n),
      id: `${(n.data.definition as NodeDefinition).type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      position: { x: n.position.x + 40, y: n.position.y + 40 },
      selected: false,
    }));
    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      ...newNodes,
    ]);
    if (newNodes.length === 1) {
      setSelectedNodeId(newNodes[0].id);
    }
    setIsDirty(true);
  }, [nodes, setNodes, pushSnapshot]);

  // --- toggle node disabled ---
  const toggleNodeDisabled = useCallback(
    (nodeId: string) => {
      pushSnapshot();
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  status: n.data.status === "disabled" ? "draft" : "disabled",
                },
              }
            : n,
        ),
      );
      setIsDirty(true);
    },
    [setNodes, pushSnapshot],
  );

  // --- update node status ---
  const updateNodeStatus = useCallback(
    (nodeId: string, status: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, status } }
            : n,
        ),
      );
      setIsDirty(true);
    },
    [setNodes],
  );

  // --- update node label ---
  const updateNodeLabel = useCallback(
    (nodeId: string, label: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, label } } : n,
        ),
      );
      setIsDirty(true);
    },
    [setNodes],
  );

  // --- serialize for save ---
  const serialize = useCallback(() => {
    const viewport = reactFlowInstance.getViewport();
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: (n.data.definition as NodeDefinition).type,
        position: n.position,
        config: n.data.config as Record<string, unknown>,
        status: (n.data.status as string) ?? "draft",
        label: n.data.label as string | undefined,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? "output",
        targetHandle: e.targetHandle ?? "input",
        dataMapping: (e.data?.dataMapping as Record<string, string>) ?? {},
        status: (e.data?.status as string) ?? "draft",
        label: e.label as string | undefined,
      })),
      viewport,
    };
  }, [nodes, edges, reactFlowInstance]);

  // --- load from saved data ---
  const loadWorkflow = useCallback(
    (
      savedNodes: Array<{
        id: string;
        type: string;
        position: { x: number; y: number };
        config: Record<string, unknown>;
        status: string;
        label?: string;
      }>,
      savedEdges: Array<{
        id: string;
        source: string;
        target: string;
        sourceHandle: string;
        targetHandle: string;
        dataMapping?: Record<string, string>;
        status: string;
        label?: string;
      }>,
      viewport?: Viewport,
      getDefinition?: (type: string) => NodeDefinition | null,
    ) => {
      const hydratedNodes: Node[] = savedNodes
        .map((sn) => {
          const definition = getDefinition?.(sn.type);
          if (!definition) return null;
          return {
            id: sn.id,
            type: definition.category,
            position: sn.position,
            data: {
              definition,
              config: sn.config,
              status: sn.status,
              label: sn.label ?? definition.name,
            },
          } as Node;
        })
        .filter(Boolean) as Node[];

      const hydratedEdges: Edge[] = savedEdges.map((se) => ({
        id: se.id,
        source: se.source,
        target: se.target,
        sourceHandle: se.sourceHandle,
        targetHandle: se.targetHandle,
        type: "workflow",
        animated: false,
        data: { status: se.status, dataMapping: se.dataMapping ?? {} },
        label: se.label,
      }));

      skipHistory.current = true;
      setNodes(hydratedNodes);
      setEdges(hydratedEdges);
      skipHistory.current = false;

      if (viewport) {
        reactFlowInstance.setViewport(viewport);
      }

      past.current = [];
      future.current = [];
      setIsDirty(false);
    },
    [setNodes, setEdges, reactFlowInstance],
  );

  return {
    // state
    nodes,
    edges,
    selectedNodeId,
    isDirty,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    // node/edge change handlers
    onNodesChange: useCallback(
      (...args: Parameters<typeof onNodesChange>) => {
        onNodesChange(...args);
        setIsDirty(true);
      },
      [onNodesChange],
    ),
    onEdgesChange: useCallback(
      (...args: Parameters<typeof onEdgesChange>) => {
        onEdgesChange(...args);
        setIsDirty(true);
      },
      [onEdgesChange],
    ),
    onConnect,
    // actions
    addNode,
    addNodesAndEdges,
    deleteSelected,
    deleteNode,
    duplicateSelected,
    toggleNodeDisabled,
    updateNodeStatus,
    setSelectedNodeId,
    updateNodeConfig,
    updateNodeLabel,
    undo,
    redo,
    // persistence
    serialize,
    loadWorkflow,
    setIsDirty,
  };
}
