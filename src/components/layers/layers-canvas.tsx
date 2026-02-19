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
import { api } from "../../../convex/_generated/api";
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
import { AIPromptOverlay } from "./ai-prompt-overlay";
import type { AIWorkflowResponse } from "./ai-workflow-schema";

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
  const { sessionId, user, signOut, isSignedIn } = useAuth();
  const currentOrg = useCurrentOrganization();
  const searchParams = useSearchParams();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Workflow selection
  const [workflowId, setWorkflowId] = useState<Id<"objects"> | null>(null);
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [showOverlay, setShowOverlay] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [showAIOverlay, setShowAIOverlay] = useState(false);
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
  const touchSessionMutation = useMutation(api.auth.touchSession);
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
      const msg = err instanceof Error ? err.message : "Save failed";
      if (msg.includes("Sitzung abgelaufen") || msg.includes("Sitzung nicht gefunden")) {
        setSaveError("Session expired — please sign in again");
        return;
      }
      setSaveError(msg);
      autoSaveFailCount.current += 1;
    }
  }, [sessionId, workflowId, workflowName, selectedProjectId, serialize, saveWorkflow, createWorkflow, setIsDirty]);

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
      aiNodes: AIWorkflowResponse["nodes"],
      aiEdges: AIWorkflowResponse["edges"],
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
    return <MobileGate />;
  }

  return (
    <div className="flex h-full w-full flex-col text-slate-100" style={{ background: "#09090b", color: "#fafafa" }}>
      {/* Top Bar */}
      <header className="flex h-12 items-center justify-between border-b border-slate-800 px-4" style={{ background: "#0a0a0b" }}>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            title="Back to home"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="text-sm font-semibold tracking-wide">
            LAYERS
          </span>
          <span className="text-slate-500">/</span>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => {
              setWorkflowName(e.target.value);
              setIsDirty(true);
            }}
            className="max-w-[200px] bg-transparent text-xs font-medium focus:outline-none focus:underline"
            placeholder="Untitled Workflow"
          />
          {/* Save status indicator */}
          <AutoSaveIndicator
            lastSavedAt={lastSavedAt}
            saveError={saveError}
            manualSaveFlash={manualSaveFlash}
            isDirty={isDirty}
            onRetry={() => handleSave({ manual: true })}
          />
        </div>
        <div className="flex items-center gap-2">
          {/* New Workflow */}
          <button
            onClick={() => {
              setWorkflowId(null);
              setWorkflowName("Untitled Workflow");
              setSelectedProjectId(null);
              setLastSavedAt(null);
              setSaveError(null);
              loadWorkflow([], []);
              setIsDirty(false);
            }}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs hover:bg-slate-800"
            title="Create new workflow"
          >
            + New
          </button>
          {/* Open Workflow */}
          <div className="relative">
            <button
              onClick={() => setShowWorkflowMenu((prev) => !prev)}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs hover:bg-slate-800"
              title="Open existing workflow"
            >
              Open ▾
            </button>
            {showWorkflowMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowWorkflowMenu(false)} />
                <div className="absolute top-full right-0 mt-1 w-72 rounded-md border border-slate-700 bg-slate-900 shadow-xl z-50 max-h-80 overflow-y-auto">
                  {(!workflows || workflows.length === 0) ? (
                    <div className="px-3 py-4 text-center text-xs text-slate-500">No workflows yet</div>
                  ) : (
                    workflows.filter((w) => w.status !== "archived").map((w) => (
                      <button
                        key={w._id}
                        onClick={() => {
                          setWorkflowId(w._id as Id<"objects">);
                          lastLoadedVersion.current = null;
                          setShowWorkflowMenu(false);
                        }}
                        className={`flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-slate-800 transition-colors ${workflowId === w._id ? "bg-slate-800" : ""}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-slate-100">{w.name}</div>
                          <div className="mt-0.5 text-slate-500">
                            {w.nodeCount} node{w.nodeCount !== 1 ? "s" : ""}
                            {w.updatedAt ? ` · ${formatTimeAgo(w.updatedAt)}` : ""}
                          </div>
                        </div>
                        {w.isActive && (
                          <span className="mt-0.5 rounded bg-green-900/40 px-1.5 py-0.5 text-[10px] text-green-400">Active</span>
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
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
              title="Link to project"
            >
              <option value="">No project</option>
              {projects.map((p: { _id: string; name: string }) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          {/* AI */}
          <button
            onClick={() => setShowAIOverlay((prev) => !prev)}
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${showAIOverlay ? "border-blue-500 bg-blue-600/20 text-blue-300" : "border-blue-500/50 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20"}`}
            title="AI Workflow Builder (Cmd+K)"
          >
            AI
          </button>
          {/* Save */}
          <button
            onClick={() => handleSave({ manual: true })}
            disabled={!mounted || !sessionId}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs hover:bg-slate-800 disabled:opacity-50"
          >
            Save
          </button>
          {/* Help */}
          <button
            onClick={() => setShowHelp((prev) => !prev)}
            className={`rounded-md border px-2 py-1.5 text-xs hover:bg-slate-800 ${showHelp ? "border-blue-500 text-blue-400" : "border-slate-700 text-slate-400"}`}
            title="Keyboard shortcuts (?)"
          >
            <HelpIcon />
          </button>
          {/* Settings stub */}
          <button
            className="rounded-md border border-slate-700 px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-800 disabled:opacity-40"
            disabled
            title="Workflow settings (coming soon)"
          >
            <SettingsIcon />
          </button>
          {/* Share stub */}
          <button
            className="rounded-md border border-slate-700 px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-800 disabled:opacity-40"
            disabled
            title="Share workflow (coming soon)"
          >
            <ShareIcon />
          </button>
          {/* Run */}
          <button
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-500 disabled:opacity-50"
            disabled={!workflowId || !mounted || !sessionId || isRunning}
            onClick={() => handleRun("manual")}
            title={isRunning ? "Running..." : "Run workflow"}
          >
            {isRunning ? "Running..." : "Run"}
          </button>
          <button
            className="rounded-md border border-slate-700 px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-800 disabled:opacity-50"
            disabled={!workflowId || !mounted || !sessionId || isRunning}
            onClick={() => handleRun("test")}
            title="Test run (mocks LC native and integration nodes)"
          >
            Test
          </button>
          {/* Divider */}
          <div className="mx-1 h-5 w-px bg-slate-700" />
          {/* User menu */}
          {isSignedIn && user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((prev) => !prev)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: "linear-gradient(135deg, #f97316, #eab308, #22c55e)" }}
                title={user.email || "Account"}
              >
                {(user.firstName?.[0] || user.email?.[0] || "U").toUpperCase()}
              </button>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute top-full right-0 mt-1 w-56 rounded-md border border-slate-700 bg-slate-900 shadow-xl z-50">
                    <div className="border-b border-slate-700 px-3 py-2">
                      <div className="truncate text-xs font-medium text-slate-100">{user.firstName || "User"}</div>
                      <div className="truncate text-[10px] text-slate-500">{user.email}</div>
                    </div>
                    <div className="p-1">
                      <Link
                        href="/"
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        Home
                      </Link>
                      <button
                        onClick={async () => {
                          setShowUserMenu(false);
                          await signOut();
                        }}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-red-400 hover:bg-slate-800"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/?openLogin=layers"
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs hover:bg-slate-800"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Tool Chest */}
        <ToolChest onNodeDragStart={onNodeDragStart} sessionId={sessionId} />

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
              className="!bg-slate-900 !border-slate-700 !shadow-lg [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!fill-slate-300 [&>button:hover]:!bg-slate-700 [&>button:hover]:!fill-slate-100"
            />
            <MiniMap
              position="bottom-right"
              zoomable
              pannable
              className="!bg-slate-900/80"
              nodeColor={(n) => {
                const def = n.data?.definition as NodeDefinition | undefined;
                return def?.color ?? "#9CA3AF";
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
            />
          )}

          {/* AI Prompt Overlay */}
          <AIPromptOverlay
            open={showAIOverlay}
            onClose={() => setShowAIOverlay(false)}
            onApplyWorkflow={handleAIApply}
            currentWorkflowSummary={getWorkflowSummary()}
          />

          {/* Help overlay */}
          {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
        </div>

        {/* Node Inspector */}
        <NodeInspector
          node={selectedNode}
          onUpdateConfig={updateNodeConfig}
          onUpdateLabel={updateNodeLabel}
          onDuplicate={duplicateSelected}
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

function MobileGate() {
  return (
    <div
      className="flex h-screen w-full flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ background: "#09090b", color: "#fafafa" }}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </div>
      <div>
        <h1 className="mb-2 text-lg font-semibold">Layers works best on desktop</h1>
        <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
          The visual workflow canvas needs a larger screen for drag-and-drop, node connections, and canvas navigation.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
      >
        Back to dashboard
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
}: {
  onClose: () => void;
  onOpenAI: () => void;
}) {
  const tips = [
    { icon: "drag", label: "Drag nodes from the Tool Chest on the left" },
    { icon: "connect", label: "Connect nodes by dragging between handles" },
    { icon: "save", label: "Cmd+S to save, Cmd+Z to undo" },
    { icon: "help", label: "Press ? for all keyboard shortcuts" },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div
        className="pointer-events-auto relative w-[540px] rounded-xl border border-slate-700 p-8 shadow-2xl backdrop-blur-sm"
        style={{ background: "rgba(9, 9, 11, 0.97)" }}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-slate-500 hover:text-slate-200 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="mb-5 text-center">
          <h2 className="text-base font-semibold">Welcome to Layers</h2>
          <p className="mt-1 text-xs text-slate-400">
            Build workflows visually, or let AI generate one from a description.
          </p>
        </div>

        {/* Describe with AI */}
        <button
          onClick={onOpenAI}
          className="mb-5 w-full rounded-lg border border-blue-500/30 bg-blue-600/10 px-4 py-3 text-left hover:bg-blue-600/20 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600/20 text-blue-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-medium text-blue-300 group-hover:text-blue-200">Describe with AI</p>
              <p className="text-xs text-slate-500">Tell AI what to build and it generates the workflow</p>
            </div>
            <kbd className="ml-auto rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              Cmd+K
            </kbd>
          </div>
        </button>

        {/* Quick tips */}
        <div className="mb-5 space-y-2">
          {tips.map((tip) => (
            <div key={tip.icon} className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-800/60 text-slate-500">
                {tip.icon === "drag" && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                )}
                {tip.icon === "connect" && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                )}
                {tip.icon === "save" && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
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
            className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Start from scratch
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELP OVERLAY (keyboard shortcuts)
// ============================================================================

function HelpOverlay({ onClose }: { onClose: () => void }) {
  const shortcuts: { key: string; label: string }[] = [
    { key: "Cmd+S", label: "Save workflow" },
    { key: "Cmd+Z", label: "Undo" },
    { key: "Cmd+Shift+Z", label: "Redo" },
    { key: "Cmd+D", label: "Duplicate selected" },
    { key: "Delete / Backspace", label: "Delete selected" },
    { key: "Cmd+K", label: "AI Workflow Builder" },
    { key: "?", label: "Toggle this help panel" },
    { key: "Scroll", label: "Zoom in/out" },
    { key: "Click + drag", label: "Pan canvas" },
    { key: "Escape", label: "Close panels" },
  ];

  return (
    <div className="absolute right-4 top-4 z-50 w-[280px] rounded-xl border border-slate-700 p-5 shadow-2xl backdrop-blur-sm" style={{ background: "rgba(9, 9, 11, 0.97)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Keyboard Shortcuts</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="space-y-2">
        {shortcuts.map((s) => (
          <div key={s.key} className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{s.label}</span>
            <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
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

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function AutoSaveIndicator({
  lastSavedAt,
  saveError,
  manualSaveFlash,
  isDirty,
  onRetry,
}: {
  lastSavedAt: number | null;
  saveError: string | null;
  manualSaveFlash: boolean;
  isDirty: boolean;
  onRetry: () => void;
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
      <span className="flex items-center gap-1.5 text-[10px] text-red-400">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Save failed
        <button
          onClick={onRetry}
          className="ml-0.5 underline hover:text-red-300"
        >
          Retry
        </button>
      </span>
    );
  }

  // Manual save flash (brief confirmation)
  if (manualSaveFlash) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-green-400">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Saved!
      </span>
    );
  }

  // No save has happened yet
  if (!lastSavedAt) {
    if (isDirty) {
      return <span className="text-[10px] text-slate-500">Unsaved changes</span>;
    }
    return null;
  }

  // Default quiet state — static indicator with passive timestamp
  const agoText = formatTimeAgo(lastSavedAt);
  return (
    <span className="flex items-center gap-1 text-[10px] text-slate-500">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Auto-saved {agoText}
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
