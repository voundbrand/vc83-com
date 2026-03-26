"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAction, useMutation, useQuery } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../convex/_generated/api") as { api: any };
import type { Id } from "../../../convex/_generated/dataModel";
import type { NodeDefinition, LayerWorkflowData } from "../../../convex/layers/types";
import { getNodeDefinition } from "../../../convex/layers/nodeRegistry";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { nodeTypes } from "./custom-nodes";
import { edgeTypes } from "./custom-edges";
import { ToolChest } from "./tool-chest";
import { NodeInspector } from "./node-inspector";
import { useLayersStore } from "./use-layers-store";
import { WorkflowLensPanel } from "./workflow-lens-panel";
import { ExecutionTimelinePanel } from "./execution-timeline-panel";
import { AIChatWindow } from "@/components/window-content/ai-chat-window";
import {
  addAIWritebackEventListener,
  LAYERS_WORKFLOW_WRITEBACK_EVENT,
  type LayersWorkflowWritebackEventDetail,
} from "@/lib/ai/ui-writeback-bridge";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface LayersWorkflowListItem {
  _id: Id<"objects">;
  name: string;
  status: string;
  nodeCount: number;
  updatedAt?: number;
  isActive?: boolean;
}

type LayersTranslator = (
  key: string,
  fallback: string,
  params?: Record<string, string | number>,
) => string;

/**
 * LayersCanvas - Main container for the visual automation canvas.
 *
 * Phase 1 complete:
 * - TopBar with save/run actions
 * - ToolChest with drag-and-drop from 80+ node registry
 * - Custom node components per NodeCategory
 * - NodeInspector panel (right, slide-out)
 * - Save/load to Convex
 * - Undo/redo with keyboard shortcuts
 */
export function LayersCanvas() {
  const { tWithFallback } = useNamespaceTranslations("ui.app.layers");
  const { sessionId, user, signOut, isSignedIn } = useAuth();
  const currentOrg = useCurrentOrganization();
  const sourceOrganizationId = currentOrg?.id ? String(currentOrg.id) : undefined;
  const searchParams = useSearchParams();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Workflow selection
  const [workflowId, setWorkflowId] = useState<Id<"objects"> | null>(null);
  const [workflowName, setWorkflowName] = useState(() =>
    tWithFallback("ui.app.layers.top_bar.untitled_workflow", "Untitled Workflow"),
  );
  const [showOverlay, setShowOverlay] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [showAIOverlay, setShowAIOverlay] = useState(false);
  const [showSystemLens, setShowSystemLens] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showWorkflowMenu, setShowWorkflowMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autosave UX: silent success, loud failure
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [manualSaveFlash, setManualSaveFlash] = useState(false);
  const autoSaveFailCount = useRef(0);
  const manualSaveFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Session keep-alive (throttled to once per 5 min)
  const lastTouchRef = useRef(0);
  const useMutationUntyped = useMutation as (mutation: unknown) => any;
  const touchSessionMutation = useMutationUntyped((api as any).auth.touchSession) as (args: {
    sessionId: string;
  }) => Promise<unknown>;
  const keepAlive = useCallback(() => {
    if (!sessionId) return;
    const now = Date.now();
    if (now - lastTouchRef.current < 5 * 60 * 1000) return;
    lastTouchRef.current = now;
    touchSessionMutation({ sessionId }).catch(() => {});
  }, [sessionId, touchSessionMutation]);

  // Project association
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"objects"> | null>(null);

  // Execution state
  const [executionId, setExecutionId] = useState<Id<"layerExecutions"> | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Track mount for hydration-safe disabled attributes
  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect mobile viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Store
  const store = useLayersStore();
  const {
    nodes,
    edges,
    selectedNodeId,
    isDirty,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
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
    serialize,
    loadWorkflow,
    setIsDirty,
  } = store;

  const placedNodeTypes = useMemo(
    () =>
      new Set(
        nodes
          .map((node) => node.type)
          .filter((nodeType): nodeType is string => typeof nodeType === "string"),
      ),
    [nodes],
  );

  // Convex mutations
  const createWorkflow = useMutation(api.layers.layerWorkflowOntology.createWorkflow);
  const saveWorkflow = useMutation(api.layers.layerWorkflowOntology.saveWorkflow);
  const setWorkflowProjectMutation = useMutation(api.layers.layerWorkflowOntology.setWorkflowProject);

  // Load projects for project picker
  const projects = useQuery(
    api.projectOntology.getProjects,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip",
  );

  // Load workflow list
  const workflows = useQuery(
    api.layers.layerWorkflowOntology.listWorkflows,
    sessionId ? { sessionId } : "skip",
  );
  const workflowList = (workflows ?? []) as LayersWorkflowListItem[];

  // Load selected workflow
  const workflowData = useQuery(
    api.layers.layerWorkflowOntology.getWorkflow,
    sessionId && workflowId ? { sessionId, workflowId } : "skip",
  );

  // Load workflow from URL param if provided (e.g. ?workflowId=X from Finder)
  const urlWorkflowIdHandled = useRef(false);
  useEffect(() => {
    const urlWfId = searchParams.get("workflowId");
    if (urlWfId && !urlWorkflowIdHandled.current) {
      urlWorkflowIdHandled.current = true;
      setWorkflowId(urlWfId as Id<"objects">);
    }
  }, [searchParams]);

  // Hydrate canvas when workflow data loads
  const lastLoadedVersion = useRef<number | null>(null);
  useEffect(() => {
    if (!workflowData) return;
    const data = workflowData.customProperties as unknown as LayerWorkflowData;
    if (!data?.nodes) return;
    const version = data.metadata?.version ?? 0;
    if (lastLoadedVersion.current === version) return;
    lastLoadedVersion.current = version;
    loadWorkflow(data.nodes, data.edges, data.viewport ?? undefined, getNodeDefinition);

    // Hydrate project association
    if (data.projectId) {
      setSelectedProjectId(data.projectId as Id<"objects">);
    } else {
      setSelectedProjectId(null);
    }
  }, [workflowData, loadWorkflow]);

  // --- drag-and-drop from tool chest ---
  const dragDefinitionRef = useRef<NodeDefinition | null>(null);

  const onNodeDragStart = useCallback(
    (event: DragEvent, definition: NodeDefinition) => {
      dragDefinitionRef.current = definition;
      event.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const definition = dragDefinitionRef.current;
      if (!definition) return;
      dragDefinitionRef.current = null;

      const wrapper = reactFlowWrapper.current;
      if (!wrapper) return;

      const bounds = wrapper.getBoundingClientRect();
      // We need to use the React Flow instance to convert screen to flow coords
      // but useReactFlow is already inside the store, so we calculate manually
      const position = {
        x: event.clientX - bounds.left - 90,
        y: event.clientY - bounds.top - 20,
      };

      addNode(definition, position);
      setShowOverlay(false);
    },
    [addNode],
  );

  // --- connection validation (prevent cycles + duplicate edges) ---
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      const { source, target, sourceHandle, targetHandle } = connection;
      if (!source || !target) return false;
      // No self-loops
      if (source === target) return false;
      // No duplicate edges between same handles
      const duplicate = edges.some(
        (e) =>
          e.source === source &&
          e.target === target &&
          e.sourceHandle === (sourceHandle ?? "output") &&
          e.targetHandle === (targetHandle ?? "input"),
      );
      if (duplicate) return false;
      // Cycle detection: DFS from target through existing edges to see if we reach source
      const visited = new Set<string>();
      const stack = [target];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === source) return false; // would create a cycle
        if (visited.has(current)) continue;
        visited.add(current);
        for (const edge of edges) {
          if (edge.source === current && !visited.has(edge.target)) {
            stack.push(edge.target);
          }
        }
      }
      return true;
    },
    [edges],
  );

  // --- node click ---
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  // --- selected node for inspector ---
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  // --- save handler (silent success, loud failure) ---
  const handleSave = useCallback(async (opts?: { manual?: boolean }) => {
    if (!sessionId) return;
    const isManual = opts?.manual ?? false;
    setSaveError(null);

    try {
      const data = serialize();
      if (workflowId) {
        await saveWorkflow({
          sessionId,
          workflowId,
          name: workflowName,
          nodes: data.nodes,
          edges: data.edges,
          viewport: data.viewport,
        });
      } else {
        const newId = await createWorkflow({
          sessionId,
          name: workflowName,
          projectId: selectedProjectId ?? undefined,
        });
        setWorkflowId(newId);
        await saveWorkflow({
          sessionId,
          workflowId: newId,
          name: workflowName,
          nodes: data.nodes,
          edges: data.edges,
          viewport: data.viewport,
        });
      }
      setIsDirty(false);
      setLastSavedAt(Date.now());
      autoSaveFailCount.current = 0;

      if (isManual) {
        setManualSaveFlash(true);
        if (manualSaveFlashTimer.current) clearTimeout(manualSaveFlashTimer.current);
        manualSaveFlashTimer.current = setTimeout(() => setManualSaveFlash(false), 1500);
      }
    } catch (err) {
      console.error("Failed to save workflow:", err);
      const msg = err instanceof Error
        ? err.message
        : tWithFallback("ui.app.layers.autosave.error.save_failed", "Save failed");
      if (msg.includes("Sitzung abgelaufen") || msg.includes("Sitzung nicht gefunden")) {
        setSaveError(
          tWithFallback(
            "ui.app.layers.autosave.error.session_expired",
            "Session expired, please sign in again",
          ),
        );
        return;
      }
      setSaveError(msg);
      autoSaveFailCount.current += 1;
    }
  }, [sessionId, workflowId, workflowName, selectedProjectId, serialize, saveWorkflow, createWorkflow, setIsDirty, tWithFallback]);

  // --- auto-save (debounced 2s after changes, with backoff on repeated failures) ---
  useEffect(() => {
    if (!isDirty || !sessionId || !workflowId) return;
    if (autoSaveFailCount.current >= 3) return; // stop retrying after 3 consecutive failures
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSave(); // silent — no { manual: true }
    }, 2000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [isDirty, sessionId, workflowId, handleSave]);

  // --- Execution ---
  const runWorkflowAction = useAction(api.layers.runWorkflow.runWorkflow);

  const executionDetails = useQuery(
    api.layers.executionLogger.getExecutionDetails,
    sessionId && executionId ? { sessionId, executionId } : "skip",
  );

  const handleRun = useCallback(async (mode: "test" | "manual") => {
    if (!workflowId || !sessionId || isRunning) return;
    if (isDirty) await handleSave({ manual: true });
    setIsRunning(true);
    try {
      const result = await runWorkflowAction({
        sessionId,
        workflowId,
        mode,
        triggerData: {},
      });
      if (result?.executionId) {
        setExecutionId(result.executionId);
        setShowTimeline(true);
      }
    } catch (err) {
      console.error("[Layers] Run failed:", err);
    } finally {
      setIsRunning(false);
    }
  }, [workflowId, sessionId, isRunning, isDirty, handleSave, runWorkflowAction]);

  // Sync execution node statuses to canvas
  useEffect(() => {
    if (!executionDetails?.nodeExecutions) return;
    const statusMap: Record<string, string> = {
      running: "active",
      completed: "ready",
      failed: "error",
      skipped: "disabled",
      pending: "draft",
      retrying: "configuring",
    };
    for (const nodeExec of executionDetails.nodeExecutions) {
      const visualStatus = statusMap[nodeExec.status] ?? "draft";
      updateNodeStatus(nodeExec.nodeId, visualStatus);
    }
  }, [executionDetails, updateNodeStatus]);

  // --- AI workflow apply handler ---
  const handleAIApply = useCallback(
    (
      aiNodes: Array<{
        id: string;
        type: string;
        position: { x: number; y: number };
        label?: string;
        config?: Record<string, unknown>;
      }>,
      aiEdges: Array<{
        source: string;
        target: string;
        sourceHandle?: string;
        targetHandle?: string;
      }>,
    ) => {
      const nodeDefs = aiNodes
        .map((n) => {
          const def = getNodeDefinition(n.type);
          if (!def) return null;
          return {
            definition: def,
            position: n.position,
            id: n.id,
            config: (n.config ?? {}) as Record<string, unknown>,
            label: n.label,
          };
        })
        .filter((n): n is NonNullable<typeof n> => n !== null);

      if (nodeDefs.length === 0) return;
      store.addNodesAndEdges(nodeDefs, aiEdges);
      setShowOverlay(false);
    },
    [store],
  );

  // --- workflow summary for AI context ---
  const getWorkflowSummary = useCallback(() => {
    if (nodes.length === 0) return "Empty canvas - no nodes or edges.";
    return JSON.stringify({
      nodes: nodes.map((n) => ({
        id: n.id,
        type: (n.data.definition as NodeDefinition).type,
        label: n.data.label,
      })),
      edges: edges.map((e) => ({
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
    });
  }, [nodes, edges]);

  const layersKickoffScopeLabel = workflowId
    ? "scope:organization_workflow"
    : "scope:organization_canvas";
  const layersKickoffAuthorityLabel = "authority:workflow_editor";
  const layersKickoffCitationQualityLabel =
    nodes.length > 0
      ? "citation:advisory_snapshot"
      : "citation:no_graph_evidence";

  const layersWorkflowOpenContext = useMemo(() => {
    const payload = {
      contractVersion: "layers_workflow_context_v1",
      workflowId: workflowId ?? undefined,
      workflowName,
      workflowSummary: getWorkflowSummary(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      scopeLabel: layersKickoffScopeLabel,
      authorityLabel: layersKickoffAuthorityLabel,
      citationQualityLabel: layersKickoffCitationQualityLabel,
      requestedAt: Date.now(),
    };
    const encoded = encodeUtf8Base64(JSON.stringify(payload));
    return encoded ? `layers_workflow:${encoded}` : "layers_workflow";
  }, [
    workflowId,
    workflowName,
    getWorkflowSummary,
    nodes.length,
    edges.length,
    layersKickoffScopeLabel,
    layersKickoffAuthorityLabel,
    layersKickoffCitationQualityLabel,
  ]);

  useEffect(() => {
    return addAIWritebackEventListener<LayersWorkflowWritebackEventDetail>(
      LAYERS_WORKFLOW_WRITEBACK_EVENT,
      (detail) => {
        const normalizedNodes: Array<{
          id: string;
          type: string;
          position: { x: number; y: number };
          label?: string;
          config?: Record<string, unknown>;
        }> = [];
        for (const node of detail.nodes ?? []) {
          const nodeId = typeof node.id === "string" ? node.id.trim() : "";
          const nodeType = typeof node.type === "string" ? node.type.trim() : "";
          const x = node.position?.x;
          const y = node.position?.y;
          if (!nodeId || !nodeType || typeof x !== "number" || typeof y !== "number") {
            continue;
          }
          normalizedNodes.push({
            id: nodeId,
            type: nodeType,
            label: typeof node.label === "string" ? node.label : undefined,
            position: { x, y },
            config:
              node.config && typeof node.config === "object"
                ? (node.config as Record<string, unknown>)
                : undefined,
          });
        }

        if (normalizedNodes.length === 0) {
          return;
        }

        const normalizedEdges: Array<{
          source: string;
          target: string;
          sourceHandle?: string;
          targetHandle?: string;
        }> = [];
        for (const edge of detail.edges ?? []) {
          const source = typeof edge.source === "string" ? edge.source.trim() : "";
          const target = typeof edge.target === "string" ? edge.target.trim() : "";
          if (!source || !target) {
            continue;
          }
          normalizedEdges.push({
            source,
            target,
            sourceHandle: typeof edge.sourceHandle === "string" ? edge.sourceHandle : undefined,
            targetHandle: typeof edge.targetHandle === "string" ? edge.targetHandle : undefined,
          });
        }

        handleAIApply(normalizedNodes, normalizedEdges);
      },
    );
  }, [handleAIApply]);

  // --- keyboard shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (mod && e.key === "s") {
        e.preventDefault();
        handleSave({ manual: true });
      } else if (mod && e.key === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        // Only delete if not focused on an input
        const active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT")) return;
        deleteSelected();
      } else if (mod && e.key === "k") {
        e.preventDefault();
        setShowAIOverlay((prev) => !prev);
      } else if (mod && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setShowSystemLens((prev) => !prev);
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setShowTimeline((prev) => !prev);
      } else if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        const active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT")) return;
        e.preventDefault();
        setShowHelp((prev) => !prev);
      } else if (e.key === "Escape" && showHelp) {
        setShowHelp(false);
      } else if (e.key === "Escape" && showAIOverlay) {
        setShowAIOverlay(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, handleSave, deleteSelected, duplicateSelected, showHelp, showAIOverlay]);

  // Mobile gate
  if (isMobile) {
    return <MobileGate tWithFallback={tWithFallback} />;
  }

  return (
    <div className="flex h-full w-full flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Top Bar */}
      <header className="flex h-12 items-center justify-between border-b border-[var(--color-border)] bg-[var(--titlebar-bg)] px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center rounded-md p-1 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            title={tWithFallback("ui.app.layers.top_bar.back_home", "Back to home")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="text-sm font-semibold tracking-wide">
            LAYERS
          </span>
          <span className="text-[var(--color-text-secondary)]">/</span>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => {
              setWorkflowName(e.target.value);
              setIsDirty(true);
            }}
            className="w-48 bg-transparent text-xs font-medium text-[var(--color-text)] focus:outline-none focus:underline"
            placeholder={tWithFallback("ui.app.layers.top_bar.untitled_workflow", "Untitled Workflow")}
          />
          {/* Save status indicator */}
          <AutoSaveIndicator
            lastSavedAt={lastSavedAt}
            saveError={saveError}
            manualSaveFlash={manualSaveFlash}
            isDirty={isDirty}
            onRetry={() => handleSave({ manual: true })}
            tWithFallback={tWithFallback}
          />
        </div>
        <div className="flex items-center gap-2">
          {/* New Workflow */}
          <button
            onClick={() => {
              setWorkflowId(null);
              setWorkflowName(tWithFallback("ui.app.layers.top_bar.untitled_workflow", "Untitled Workflow"));
              setSelectedProjectId(null);
              setLastSavedAt(null);
              setSaveError(null);
              loadWorkflow([], []);
              setIsDirty(false);
            }}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            title={tWithFallback("ui.app.layers.top_bar.new_workflow_title", "Create new workflow")}
          >
            {tWithFallback("ui.app.layers.top_bar.new_workflow", "+ New")}
          </button>
          {/* Open Workflow */}
          <div className="relative">
            <button
              onClick={() => setShowWorkflowMenu((prev) => !prev)}
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
              title={tWithFallback("ui.app.layers.top_bar.open_workflow_title", "Open existing workflow")}
            >
              {tWithFallback("ui.app.layers.top_bar.open_workflow", "Open")} ▾
            </button>
            {showWorkflowMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowWorkflowMenu(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 max-h-80 w-72 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--menu-bg)]">
                  {workflowList.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-[var(--color-text-secondary)]">
                      {tWithFallback("ui.app.layers.top_bar.no_workflows", "No workflows yet")}
                    </div>
                  ) : (
                    workflowList.filter((w) => w.status !== "archived").map((w) => (
                      <button
                        key={w._id}
                        onClick={() => {
                          setWorkflowId(w._id as Id<"objects">);
                          lastLoadedVersion.current = null;
                          setShowWorkflowMenu(false);
                        }}
                        className={`flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--menu-hover)] ${workflowId === w._id ? "bg-[var(--menu-hover)]" : ""}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-[var(--color-text)]">{w.name}</div>
                          <div className="mt-0.5 text-[var(--color-text-secondary)]">
                            {tWithFallback(
                              "ui.app.layers.top_bar.node_count",
                              "{count} node{suffix}",
                              {
                                count: w.nodeCount,
                                suffix: w.nodeCount !== 1 ? "s" : "",
                              },
                            )}
                            {w.updatedAt ? ` · ${formatTimeAgo(w.updatedAt, tWithFallback)}` : ""}
                          </div>
                        </div>
                        {w.isActive && (
                          <span className="mt-0.5 rounded border border-[var(--color-success)] bg-[var(--color-success-subtle)] px-2 py-0.5 text-xs text-[var(--color-success)]">
                            {tWithFallback("ui.app.layers.top_bar.active", "Active")}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}</div>
          {/* Project picker */}
          {workflowId && projects && projects.length > 0 && (
            <select
              value={selectedProjectId ?? ""}
              onChange={async (e) => {
                const newProjectId = e.target.value || null;
                setSelectedProjectId(newProjectId as Id<"objects"> | null);
                if (workflowId && sessionId) {
                  await setWorkflowProjectMutation({
                    sessionId,
                    workflowId,
                    projectId: newProjectId ? (newProjectId as Id<"objects">) : undefined,
                  });
                }
              }}
              className="rounded-md border border-[var(--color-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--color-text)]"
              title={tWithFallback("ui.app.layers.top_bar.link_project_title", "Link to project")}
            >
              <option value="">{tWithFallback("ui.app.layers.top_bar.no_project", "No project")}</option>
              {projects.map((p: { _id: string; name: string }) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowSystemLens((prev) => !prev)}
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              showSystemLens
                ? "border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-text)]"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            }`}
            title={tWithFallback("ui.app.layers.top_bar.toggle_system_lens_title", "Toggle system lens (Cmd+L)")}
          >
            {tWithFallback("ui.app.layers.top_bar.system_lens", "System Lens")}
          </button>
          <button
            onClick={() => setShowTimeline((prev) => !prev)}
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              showTimeline
                ? "border-[var(--color-info)] bg-[var(--color-info-subtle)] text-[var(--color-text)]"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            }`}
            title={tWithFallback("ui.app.layers.top_bar.toggle_timeline_title", "Toggle execution timeline (Cmd+Shift+E)")}
          >
            {tWithFallback("ui.app.layers.top_bar.timeline", "Timeline")}
          </button>
          {/* Operator Chat */}
          <button
            onClick={() => setShowAIOverlay((prev) => !prev)}
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              showAIOverlay
                ? "border-[var(--color-info)] bg-[var(--color-info-subtle)] text-[var(--color-text)]"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            }`}
            title={tWithFallback("ui.app.layers.top_bar.chat_title", "Operator chat (Cmd+K)")}
          >
            {tWithFallback("ui.app.layers.top_bar.chat", "Chat")}
          </button>
          <Link
            href="/builder/new?launch=event&source=layers"
            className="rounded-md border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-3 py-1.5 text-xs text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
            title={tWithFallback("ui.app.layers.top_bar.launch_flow_title", "Open Builder launch flow")}
          >
            {tWithFallback("ui.app.layers.top_bar.launch_flow", "Launch Flow")}
          </Link>
          {/* Save */}
          <button
            onClick={() => handleSave({ manual: true })}
            disabled={!mounted || !sessionId}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-50"
          >
            {tWithFallback("ui.app.layers.top_bar.save", "Save")}
          </button>
          {/* Help */}
          <button
            onClick={() => setShowHelp((prev) => !prev)}
            className={`rounded-md border px-2 py-1.5 text-xs ${
              showHelp
                ? "border-[var(--color-info)] bg-[var(--color-info-subtle)] text-[var(--color-text)]"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            }`}
            title={tWithFallback("ui.app.layers.top_bar.keyboard_shortcuts_title", "Keyboard shortcuts (?)")}
          >
            <HelpIcon />
          </button>
          {/* Settings stub */}
          <button
            className="rounded-md border border-[var(--color-border)] px-2 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40"
            disabled
            title={tWithFallback("ui.app.layers.top_bar.workflow_settings_soon", "Workflow settings (coming soon)")}
          >
            <SettingsIcon />
          </button>
          {/* Share stub */}
          <button
            className="rounded-md border border-[var(--color-border)] px-2 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40"
            disabled
            title={tWithFallback("ui.app.layers.top_bar.share_workflow_soon", "Share workflow (coming soon)")}
          >
            <ShareIcon />
          </button>
          {/* Run */}
          <button
            className="rounded-md border border-[var(--color-success)] bg-[var(--color-success-subtle)] px-3 py-1.5 text-xs text-[var(--color-success)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
            disabled={!workflowId || !mounted || !sessionId || isRunning}
            onClick={() => handleRun("manual")}
            title={isRunning
              ? tWithFallback("ui.app.layers.top_bar.running", "Running...")
              : tWithFallback("ui.app.layers.top_bar.run_workflow_title", "Run workflow")}
          >
            {isRunning
              ? tWithFallback("ui.app.layers.top_bar.running", "Running...")
              : tWithFallback("ui.app.layers.top_bar.run", "Run")}
          </button>
          <button
            className="rounded-md border border-[var(--color-border)] px-2 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-50"
            disabled={!workflowId || !mounted || !sessionId || isRunning}
            onClick={() => handleRun("test")}
            title={tWithFallback("ui.app.layers.top_bar.test_run_title", "Test run (mocks LC native and integration nodes)")}
          >
            {tWithFallback("ui.app.layers.top_bar.test", "Test")}
          </button>
          {/* Divider */}
          <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />
          {/* User menu */}
          {isSignedIn && user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((prev) => !prev)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-xs font-bold text-[var(--color-text)]"
                title={user.email || tWithFallback("ui.app.layers.top_bar.account", "Account")}
              >
                {(user.firstName?.[0] || user.email?.[0] || tWithFallback("ui.app.layers.top_bar.user_initial_fallback", "U")).toUpperCase()}
              </button>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-[var(--color-border)] bg-[var(--menu-bg)]">
                    <div className="border-b border-[var(--color-border)] px-3 py-2">
                      <div className="truncate text-xs font-medium text-[var(--color-text)]">
                        {user.firstName || tWithFallback("ui.app.layers.top_bar.user", "User")}
                      </div>
                      <div className="truncate text-xs text-[var(--color-text-secondary)]">{user.email}</div>
                    </div>
                    <div className="p-1">
                      <Link
                        href="/"
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--menu-hover)] hover:text-[var(--color-text)]"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        {tWithFallback("ui.app.layers.top_bar.home", "Home")}
                      </Link>
                      <button
                        onClick={async () => {
                          setShowUserMenu(false);
                          await signOut();
                        }}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-[var(--color-error)] hover:bg-[var(--menu-hover)]"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        {tWithFallback("ui.app.layers.top_bar.sign_out", "Sign Out")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/?openLogin=layers"
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            >
              {tWithFallback("ui.app.layers.top_bar.sign_in", "Sign In")}
            </Link>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Tool Chest */}
        <ToolChest
          onNodeDragStart={onNodeDragStart}
          sessionId={sessionId}
          placedNodeTypes={placedNodeTypes}
        />

        {/* Canvas */}
        <div className="relative flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={(changes) => { keepAlive(); onNodesChange(changes); }}
            onEdgesChange={(changes) => { keepAlive(); onEdgesChange(changes); }}
            onConnect={(connection) => { keepAlive(); onConnect(connection); }}
            isValidConnection={isValidConnection}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{ type: "workflow", animated: false }}
            deleteKeyCode={null} // we handle delete ourselves
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls
              position="bottom-left"
              className="!border-[var(--color-border)] !bg-[var(--menu-bg)] [&>button]:!border-[var(--color-border)] [&>button]:!bg-[var(--color-surface-raised)] [&>button]:!fill-[var(--color-text-secondary)] [&>button:hover]:!bg-[var(--color-surface-hover)] [&>button:hover]:!fill-[var(--color-text)]"
            />
            <MiniMap
              position="bottom-right"
              zoomable
              pannable
              className="!border-[var(--color-border)] !bg-[var(--menu-bg)]"
              nodeColor={(n) => {
                const def = n.data?.definition as NodeDefinition | undefined;
                return def?.color ?? "var(--color-text-secondary)";
              }}
            />
          </ReactFlow>

          {/* Empty state overlay */}
          {nodes.length === 0 && showOverlay && (
            <EmptyCanvasOverlay
              onClose={() => setShowOverlay(false)}
              onOpenAI={() => {
                setShowAIOverlay(true);
                setShowOverlay(false);
              }}
              tWithFallback={tWithFallback}
            />
          )}

          {/* Operator Chat Panel */}
          {showAIOverlay && (
            <div className="pointer-events-none absolute inset-y-4 right-4 z-50 w-[min(520px,calc(100%-2rem))]">
              <div className="pointer-events-auto flex h-full max-h-[calc(100vh-6.5rem)] flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--menu-bg)] shadow-2xl">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold tracking-wide text-[var(--color-text)]">
                      {tWithFallback("ui.app.layers.operator_chat.title", "Operator Chat")}
                    </span>
                    <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-secondary)]">
                      Cmd+K
                    </kbd>
                  </div>
                  <button
                    onClick={() => setShowAIOverlay(false)}
                    className="rounded p-1 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                    title={tWithFallback("ui.app.layers.operator_chat.close", "Close chat")}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1 border-b border-[var(--color-border)] px-3 py-1.5">
                  <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                    {layersKickoffScopeLabel}
                  </span>
                  <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                    {layersKickoffAuthorityLabel}
                  </span>
                  <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                    {layersKickoffCitationQualityLabel}
                  </span>
                </div>
                <div className="min-h-0 flex-1">
                  <AIChatWindow
                    initialLayoutMode="slick"
                    initialPanel="layers-workflow"
                    openContext={layersWorkflowOpenContext}
                    sourceSessionId={sessionId ?? undefined}
                    sourceOrganizationId={sourceOrganizationId}
                    initialLayerWorkflowId={workflowId}
                    forcePrimaryAgent
                  />
                </div>
              </div>
            </div>
          )}

          {/* Help overlay */}
          {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} tWithFallback={tWithFallback} />}

          <ExecutionTimelinePanel
            open={showTimeline}
            onToggle={() => setShowTimeline((prev) => !prev)}
            executionId={executionId}
            executionDetails={executionDetails ?? undefined}
            isRunning={isRunning}
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        </div>

        {showSystemLens && (
          <WorkflowLensPanel
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        )}

        {/* Node Inspector */}
          <NodeInspector
            node={selectedNode}
            onUpdateConfig={updateNodeConfig}
            onUpdateLabel={updateNodeLabel}
            onDuplicate={duplicateSelected}
            onDelete={deleteNode}
            onToggleDisabled={toggleNodeDisabled}
            onUpdateStatus={updateNodeStatus}
            onClose={() => setSelectedNodeId(null)}
          executionDetails={executionDetails ?? undefined}
        />
      </div>

    </div>
  );
}

// ============================================================================
// MOBILE GATE
// ============================================================================

function MobileGate({ tWithFallback }: { tWithFallback: LayersTranslator }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-[var(--color-bg)] px-6 text-center text-[var(--color-text)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-info)]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </div>
      <div>
        <h1 className="mb-2 text-lg font-semibold">
          {tWithFallback("ui.app.layers.mobile_gate.title", "Layers works best on desktop")}
        </h1>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-[var(--color-text-secondary)]">
          {tWithFallback(
            "ui.app.layers.mobile_gate.description",
            "The visual workflow canvas needs a larger screen for drag-and-drop, node connections, and canvas navigation.",
          )}
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
      >
        {tWithFallback("ui.app.layers.mobile_gate.back_to_dashboard", "Back to dashboard")}
      </Link>
    </div>
  );
}

// ============================================================================
// EMPTY CANVAS OVERLAY
// ============================================================================

function EmptyCanvasOverlay({
  onClose,
  onOpenAI,
  tWithFallback,
}: {
  onClose: () => void;
  onOpenAI: () => void;
  tWithFallback: LayersTranslator;
}) {
  const tips = [
    {
      icon: "drag",
      label: tWithFallback(
        "ui.app.layers.empty_overlay.tip.drag_nodes",
        "Drag nodes from the Tool Chest on the left",
      ),
    },
    {
      icon: "connect",
      label: tWithFallback(
        "ui.app.layers.empty_overlay.tip.connect_nodes",
        "Connect nodes by dragging between handles",
      ),
    },
    {
      icon: "save",
      label: tWithFallback("ui.app.layers.empty_overlay.tip.save_undo", "Cmd+S to save, Cmd+Z to undo"),
    },
    {
      icon: "map",
      label: tWithFallback(
        "ui.app.layers.empty_overlay.tip.system_lens",
        "Use System Lens to inspect branches and disconnected paths",
      ),
    },
    {
      icon: "help",
      label: tWithFallback(
        "ui.app.layers.empty_overlay.tip.keyboard_help",
        "Press ? for all keyboard shortcuts",
      ),
    },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="pointer-events-auto relative w-full max-w-2xl rounded-xl border border-[var(--color-border)] bg-[var(--menu-bg)] p-8">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
          title={tWithFallback("ui.app.layers.empty_overlay.close", "Close")}
          aria-label={tWithFallback("ui.app.layers.empty_overlay.close", "Close")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="mb-5 text-center">
          <h2 className="text-base font-semibold">
            {tWithFallback("ui.app.layers.empty_overlay.title", "Welcome to Layers")}
          </h2>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {tWithFallback(
              "ui.app.layers.empty_overlay.subtitle",
              "Build workflows visually, or use operator chat to draft a workflow.",
            )}
          </p>
        </div>

        {/* Open Operator Chat */}
        <button
          onClick={onOpenAI}
          className="group mb-5 w-full rounded-lg border border-[var(--color-info)] bg-[var(--color-info-subtle)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-info-subtle)] text-[var(--color-info)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">
                {tWithFallback("ui.app.layers.empty_overlay.chat_cta.title", "Open Operator Chat")}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {tWithFallback(
                  "ui.app.layers.empty_overlay.chat_cta.subtitle",
                  "Use your main organization agent to design workflow steps",
                )}
              </p>
            </div>
            <kbd className="ml-auto rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-text-secondary)]">
              Cmd+K
            </kbd>
          </div>
        </button>

        {/* Quick tips */}
        <div className="mb-5 space-y-2">
          {tips.map((tip) => (
            <div key={tip.icon} className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]">
                {tip.icon === "drag" && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                )}
                {tip.icon === "connect" && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                )}
                {tip.icon === "save" && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
                )}
                {tip.icon === "map" && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="8" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="16" cy="18" r="2"/><path d="M8 8h8M16.4 8l-0.8 8M7.4 9.4l7.2 7.2"/></svg>
                )}
                {tip.icon === "help" && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                )}
              </span>
              {tip.label}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
          >
            {tWithFallback("ui.app.layers.empty_overlay.start_from_scratch", "Start from scratch")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELP OVERLAY (keyboard shortcuts)
// ============================================================================

function HelpOverlay({
  onClose,
  tWithFallback,
}: {
  onClose: () => void;
  tWithFallback: LayersTranslator;
}) {
  const shortcuts: { key: string; label: string }[] = [
    { key: "Cmd+S", label: tWithFallback("ui.app.layers.help_overlay.shortcut.save", "Save workflow") },
    { key: "Cmd+Z", label: tWithFallback("ui.app.layers.help_overlay.shortcut.undo", "Undo") },
    { key: "Cmd+Shift+Z", label: tWithFallback("ui.app.layers.help_overlay.shortcut.redo", "Redo") },
    { key: "Cmd+D", label: tWithFallback("ui.app.layers.help_overlay.shortcut.duplicate", "Duplicate selected") },
    {
      key: "Delete / Backspace",
      label: tWithFallback("ui.app.layers.help_overlay.shortcut.delete", "Delete selected"),
    },
    {
      key: "Cmd+K",
      label: tWithFallback("ui.app.layers.help_overlay.shortcut.chat", "Toggle operator chat panel"),
    },
    { key: "Cmd+L", label: tWithFallback("ui.app.layers.help_overlay.shortcut.system_lens", "Toggle System Lens") },
    {
      key: "Cmd+Shift+E",
      label: tWithFallback("ui.app.layers.help_overlay.shortcut.timeline", "Toggle execution timeline"),
    },
    { key: "?", label: tWithFallback("ui.app.layers.help_overlay.shortcut.help", "Toggle this help panel") },
    { key: "Scroll", label: tWithFallback("ui.app.layers.help_overlay.shortcut.zoom", "Zoom in/out") },
    { key: "Click + drag", label: tWithFallback("ui.app.layers.help_overlay.shortcut.pan", "Pan canvas") },
    { key: "Escape", label: tWithFallback("ui.app.layers.help_overlay.shortcut.close", "Close panels") },
  ];

  return (
    <div className="absolute right-4 top-4 z-50 w-80 rounded-xl border border-[var(--color-border)] bg-[var(--menu-bg)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]">
          {tWithFallback("ui.app.layers.help_overlay.title", "Keyboard Shortcuts")}
        </h3>
        <button
          onClick={onClose}
          className="text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)]"
          title={tWithFallback("ui.app.layers.help_overlay.close", "Close help")}
          aria-label={tWithFallback("ui.app.layers.help_overlay.close", "Close help")}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="space-y-2">
        {shortcuts.map((s) => (
          <div key={s.key} className="flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-secondary)]">{s.label}</span>
            <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-text)]">
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// AUTO-SAVE INDICATOR (silent success, loud failure)
// ============================================================================

function encodeUtf8Base64(value: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return window.btoa(binary);
}

function formatTimeAgo(timestamp: number, tWithFallback: LayersTranslator): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) {
    return tWithFallback("ui.app.layers.autosave.time.just_now", "just now");
  }
  if (seconds < 60) {
    return tWithFallback("ui.app.layers.autosave.time.seconds_ago", "{count}s ago", { count: seconds });
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return tWithFallback("ui.app.layers.autosave.time.minutes_ago", "{count}m ago", { count: minutes });
  }
  return tWithFallback("ui.app.layers.autosave.time.hours_ago", "{count}h ago", {
    count: Math.floor(minutes / 60),
  });
}

function AutoSaveIndicator({
  lastSavedAt,
  saveError,
  manualSaveFlash,
  isDirty,
  onRetry,
  tWithFallback,
}: {
  lastSavedAt: number | null;
  saveError: string | null;
  manualSaveFlash: boolean;
  isDirty: boolean;
  onRetry: () => void;
  tWithFallback: LayersTranslator;
}) {
  // Tick every 30s to update "X ago" text
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastSavedAt) return;
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  // Error state (persistent, prominent)
  if (saveError) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-[var(--color-error)]">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {tWithFallback("ui.app.layers.autosave.error.save_failed", "Save failed")}
        <button
          onClick={onRetry}
          className="ml-0.5 underline"
        >
          {tWithFallback("ui.app.layers.autosave.error.retry", "Retry")}
        </button>
      </span>
    );
  }

  // Manual save flash (brief confirmation)
  if (manualSaveFlash) {
    return (
      <span className="flex items-center gap-1 text-xs text-[var(--color-success)]">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {tWithFallback("ui.app.layers.autosave.saved", "Saved!")}
      </span>
    );
  }

  // No save has happened yet
  if (!lastSavedAt) {
    if (isDirty) {
      return (
        <span className="text-xs text-[var(--color-text-secondary)]">
          {tWithFallback("ui.app.layers.autosave.unsaved_changes", "Unsaved changes")}
        </span>
      );
    }
    return null;
  }

  // Default quiet state — static indicator with passive timestamp
  const agoText = formatTimeAgo(lastSavedAt, tWithFallback);
  return (
    <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {tWithFallback("ui.app.layers.autosave.auto_saved", "Auto-saved {time}", { time: agoText })}
    </span>
  );
}

// ============================================================================
// TINY SVG ICONS FOR TOP BAR
// ============================================================================

function HelpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
