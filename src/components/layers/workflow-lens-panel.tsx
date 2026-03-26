"use client";

import { useMemo } from "react";
import type { Edge, Node } from "@xyflow/react";
import type { NodeCategory, NodeDefinition } from "../../../convex/layers/types";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface WorkflowLensPanelProps {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

interface WorkflowLensAnalysis {
  categoryBuckets: Record<NodeCategory, string[]>;
  entryNodeIds: string[];
  terminalNodeIds: string[];
  disconnectedNodeIds: string[];
  branchNodeIds: string[];
  mergeNodeIds: string[];
  isolatedNodeIds: string[];
  readinessPercent: number;
  agenticScore: number;
  longestPath: number;
  recommendations: string[];
  labelsById: Record<string, string>;
}

const PHASES: Array<{
  key: "input" | "decision" | "action";
  titleKey: string;
  titleFallback: string;
  subtitleKey: string;
  subtitleFallback: string;
  toneClass: string;
}> = [
  {
    key: "input",
    titleKey: "ui.app.layers.workflow_lens.phase.input.title",
    titleFallback: "Input",
    subtitleKey: "ui.app.layers.workflow_lens.phase.input.subtitle",
    subtitleFallback: "Triggers that start execution",
    toneClass: "border-[var(--color-info)] bg-[var(--color-info-subtle)] text-[var(--color-info)]",
  },
  {
    key: "decision",
    titleKey: "ui.app.layers.workflow_lens.phase.decision.title",
    titleFallback: "Decision",
    subtitleKey: "ui.app.layers.workflow_lens.phase.decision.subtitle",
    subtitleFallback: "Logic that branches and filters",
    toneClass: "border-[var(--color-warn)] bg-[var(--color-warn-subtle)] text-[var(--color-warn)]",
  },
  {
    key: "action",
    titleKey: "ui.app.layers.workflow_lens.phase.action.title",
    titleFallback: "Action",
    subtitleKey: "ui.app.layers.workflow_lens.phase.action.subtitle",
    subtitleFallback: "Integrations and Layer Cake tools",
    toneClass: "border-[var(--color-success)] bg-[var(--color-success-subtle)] text-[var(--color-success)]",
  },
];

type LayersTranslator = (
  key: string,
  fallback: string,
  params?: Record<string, string | number>,
) => string;

export function WorkflowLensPanel({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
}: WorkflowLensPanelProps) {
  const { tWithFallback } = useNamespaceTranslations("ui.app.layers");
  const analysis = useMemo(() => analyzeWorkflow(nodes, edges, tWithFallback), [nodes, edges, tWithFallback]);

  const phaseNodeIds = {
    input: analysis.categoryBuckets.trigger,
    decision: analysis.categoryBuckets.logic,
    action: [...analysis.categoryBuckets.integration, ...analysis.categoryBuckets.lc_native],
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          {tWithFallback("ui.app.layers.workflow_lens.title", "System Lens")}
        </p>
        <h2 className="mt-1 text-sm font-semibold text-[var(--color-text)]">
          {tWithFallback("ui.app.layers.workflow_lens.subtitle_title", "Agentic Workflow Map")}
        </h2>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          {tWithFallback(
            "ui.app.layers.workflow_lens.subtitle_body",
            "Use this view to reason about structure, branching, and operational readiness.",
          )}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <section className="grid grid-cols-2 gap-2">
          <StatTile label={tWithFallback("ui.app.layers.workflow_lens.stat.nodes", "Nodes")} value={String(nodes.length)} />
          <StatTile label={tWithFallback("ui.app.layers.workflow_lens.stat.edges", "Edges")} value={String(edges.length)} />
          <StatTile label={tWithFallback("ui.app.layers.workflow_lens.stat.longest_path", "Longest path")} value={String(analysis.longestPath)} />
          <StatTile label={tWithFallback("ui.app.layers.workflow_lens.stat.readiness", "Readiness")} value={`${analysis.readinessPercent}%`} />
        </section>

        <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[var(--color-text)]">
              {tWithFallback("ui.app.layers.workflow_lens.agentic_score.title", "Agentic score")}
            </h3>
            <span className="rounded-md border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-2 py-1 text-xs font-semibold text-[var(--color-accent)]">
              {analysis.agenticScore}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {tWithFallback(
              "ui.app.layers.workflow_lens.agentic_score.description",
              "Heuristic score from trigger coverage, graph composition, branching, and config readiness.",
            )}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-[var(--color-text)]">
            {tWithFallback("ui.app.layers.workflow_lens.workflow_phases.title", "Workflow phases")}
          </h3>
          {PHASES.map((phase) => (
            <div
              key={phase.key}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-text)]">
                    {tWithFallback(phase.titleKey, phase.titleFallback)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {tWithFallback(phase.subtitleKey, phase.subtitleFallback)}
                  </p>
                </div>
                <span className={`rounded-md border px-2 py-1 text-xs font-medium ${phase.toneClass}`}>
                  {phaseNodeIds[phase.key].length}
                </span>
              </div>

              {phaseNodeIds[phase.key].length > 0 ? (
                <NodeChipRow
                  nodeIds={phaseNodeIds[phase.key]}
                  labelsById={analysis.labelsById}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={onSelectNode}
                  tWithFallback={tWithFallback}
                />
              ) : (
                <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                  {tWithFallback("ui.app.layers.workflow_lens.phase.empty", "No nodes in this phase yet.")}
                </p>
              )}
            </div>
          ))}
        </section>

        <section className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
          <h3 className="text-xs font-semibold text-[var(--color-text)]">
            {tWithFallback("ui.app.layers.workflow_lens.graph_health.title", "Graph health")}
          </h3>
          <HealthRow label={tWithFallback("ui.app.layers.workflow_lens.graph_health.entry_nodes", "Entry nodes")} value={analysis.entryNodeIds.length} />
          <HealthRow label={tWithFallback("ui.app.layers.workflow_lens.graph_health.terminal_nodes", "Terminal nodes")} value={analysis.terminalNodeIds.length} />
          <HealthRow label={tWithFallback("ui.app.layers.workflow_lens.graph_health.branch_points", "Branch points")} value={analysis.branchNodeIds.length} />
          <HealthRow label={tWithFallback("ui.app.layers.workflow_lens.graph_health.merge_points", "Merge points")} value={analysis.mergeNodeIds.length} />
          <HealthRow label={tWithFallback("ui.app.layers.workflow_lens.graph_health.isolated_nodes", "Isolated nodes")} value={analysis.isolatedNodeIds.length} />
          <HealthRow
            label={tWithFallback("ui.app.layers.workflow_lens.graph_health.disconnected", "Disconnected from trigger")}
            value={analysis.disconnectedNodeIds.length}
            tone={analysis.disconnectedNodeIds.length > 0 ? "error" : "success"}
          />
        </section>

        <section className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
          <h3 className="text-xs font-semibold text-[var(--color-text)]">
            {tWithFallback("ui.app.layers.workflow_lens.recommendations.title", "Recommendations")}
          </h3>
          <ul className="space-y-2">
            {analysis.recommendations.map((recommendation) => (
              <li key={recommendation} className="text-xs text-[var(--color-text-secondary)]">
                {recommendation}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}

function analyzeWorkflow(nodes: Node[], edges: Edge[], tWithFallback: LayersTranslator): WorkflowLensAnalysis {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  const labelsById: Record<string, string> = {};
  const categoryBuckets: Record<NodeCategory, string[]> = {
    trigger: [],
    integration: [],
    logic: [],
    lc_native: [],
  };

  for (const node of nodes) {
    incoming.set(node.id, 0);
    outgoing.set(node.id, 0);
    labelsById[node.id] = getNodeLabel(node);
    const definition = getNodeDefinition(node);
    if (definition) {
      categoryBuckets[definition.category].push(node.id);
    }
  }

  for (const edge of edges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.set(edge.source, (outgoing.get(edge.source) ?? 0) + 1);
  }

  const entryNodeIds = nodes
    .filter((node) => (incoming.get(node.id) ?? 0) === 0)
    .map((node) => node.id);

  const terminalNodeIds = nodes
    .filter((node) => (outgoing.get(node.id) ?? 0) === 0)
    .map((node) => node.id);

  const isolatedNodeIds = nodes
    .filter((node) => (incoming.get(node.id) ?? 0) === 0 && (outgoing.get(node.id) ?? 0) === 0)
    .map((node) => node.id);

  const branchNodeIds = nodes
    .filter((node) => (outgoing.get(node.id) ?? 0) > 1)
    .map((node) => node.id);

  const mergeNodeIds = nodes
    .filter((node) => (incoming.get(node.id) ?? 0) > 1)
    .map((node) => node.id);

  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    const targets = adjacency.get(edge.source);
    if (targets) {
      targets.push(edge.target);
    }
  }

  const triggerNodeIds = categoryBuckets.trigger;
  const reachableFromTrigger = new Set<string>();
  if (triggerNodeIds.length > 0) {
    const stack = [...triggerNodeIds];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || reachableFromTrigger.has(current)) continue;
      reachableFromTrigger.add(current);
      for (const next of adjacency.get(current) ?? []) {
        if (!reachableFromTrigger.has(next)) {
          stack.push(next);
        }
      }
    }
  }

  const disconnectedNodeIds =
    triggerNodeIds.length === 0
      ? []
      : nodes
          .filter((node) => !reachableFromTrigger.has(node.id))
          .map((node) => node.id);

  const readyNodeCount = nodes.filter((node) => {
    const status = (node.data as { status?: unknown }).status;
    return status === "ready" || status === "active";
  }).length;

  const readinessPercent = nodes.length === 0 ? 0 : Math.round((readyNodeCount / nodes.length) * 100);

  const memoDepth = new Map<string, number>();
  const visiting = new Set<string>();

  const computeDepth = (nodeId: string): number => {
    const cached = memoDepth.get(nodeId);
    if (cached !== undefined) return cached;
    if (visiting.has(nodeId)) return 1;
    visiting.add(nodeId);
    let best = 1;
    for (const next of adjacency.get(nodeId) ?? []) {
      best = Math.max(best, 1 + computeDepth(next));
    }
    visiting.delete(nodeId);
    memoDepth.set(nodeId, best);
    return best;
  };

  const depthSeeds =
    triggerNodeIds.length > 0 ? triggerNodeIds : entryNodeIds.length > 0 ? entryNodeIds : nodes.map((node) => node.id);
  const longestPath = depthSeeds.reduce((best, nodeId) => Math.max(best, computeDepth(nodeId)), 0);

  let agenticScore = 0;
  if (nodes.length > 0) agenticScore += 20;
  if (triggerNodeIds.length > 0) agenticScore += 20;
  agenticScore += Math.min(20, branchNodeIds.length * 6);
  agenticScore += Math.min(20, mergeNodeIds.length * 6);
  agenticScore += Math.round((readinessPercent / 100) * 20);
  if (disconnectedNodeIds.length > 0) {
    agenticScore -= Math.min(20, disconnectedNodeIds.length * 5);
  }
  agenticScore = Math.max(0, Math.min(100, agenticScore));

  const recommendations: string[] = [];
  if (nodes.length === 0) {
    recommendations.push(tWithFallback(
      "ui.app.layers.workflow_lens.recommendations.empty",
      "Start with one trigger, then add logic and action nodes in sequence.",
    ));
  } else {
    if (triggerNodeIds.length === 0) {
      recommendations.push(tWithFallback(
        "ui.app.layers.workflow_lens.recommendations.add_trigger",
        "Add a trigger so the workflow has a clear entry event.",
      ));
    }
    if (terminalNodeIds.length === 0) {
      recommendations.push(tWithFallback(
        "ui.app.layers.workflow_lens.recommendations.add_terminal",
        "Add at least one terminal action node to close the workflow path.",
      ));
    }
    if (disconnectedNodeIds.length > 0) {
      recommendations.push(tWithFallback(
        "ui.app.layers.workflow_lens.recommendations.connect_disconnected",
        "Connect disconnected nodes to a trigger path so they can execute.",
      ));
    }
    if (readinessPercent < 60) {
      recommendations.push(tWithFallback(
        "ui.app.layers.workflow_lens.recommendations.configure_credentials",
        "Configure credentials and required fields to improve execution readiness.",
      ));
    }
    if (branchNodeIds.length === 0 && nodes.length >= 5) {
      recommendations.push(tWithFallback(
        "ui.app.layers.workflow_lens.recommendations.add_branch",
        "Introduce a logic branch to model alternate outcomes and retries.",
      ));
    }
  }

  if (recommendations.length === 0) {
    recommendations.push(tWithFallback(
      "ui.app.layers.workflow_lens.recommendations.healthy",
      "Structure looks healthy. Run a test execution to validate payload mappings.",
    ));
  }

  return {
    categoryBuckets,
    entryNodeIds,
    terminalNodeIds,
    disconnectedNodeIds,
    branchNodeIds,
    mergeNodeIds,
    isolatedNodeIds,
    readinessPercent,
    agenticScore,
    longestPath,
    recommendations,
    labelsById,
  };
}

function getNodeDefinition(node: Node): NodeDefinition | null {
  const candidate = (node.data as { definition?: NodeDefinition }).definition;
  return candidate ?? null;
}

function getNodeLabel(node: Node): string {
  const data = node.data as { label?: unknown; definition?: NodeDefinition };
  if (typeof data.label === "string" && data.label.trim().length > 0) {
    return data.label.trim();
  }
  return data.definition?.name ?? node.id;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2">
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{value}</p>
    </div>
  );
}

function HealthRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "error";
}) {
  const toneClass =
    tone === "success"
      ? "text-[var(--color-success)]"
      : tone === "error"
        ? "text-[var(--color-error)]"
        : "text-[var(--color-text)]";
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[var(--color-text-secondary)]">{label}</span>
      <span className={`font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}

function NodeChipRow({
  nodeIds,
  labelsById,
  selectedNodeId,
  onSelectNode,
  tWithFallback,
}: {
  nodeIds: string[];
  labelsById: Record<string, string>;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  tWithFallback: LayersTranslator;
}) {
  const visibleNodeIds = nodeIds.slice(0, 4);
  const remainingCount = Math.max(0, nodeIds.length - visibleNodeIds.length);

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {visibleNodeIds.map((nodeId) => {
        const active = selectedNodeId === nodeId;
        return (
          <button
            key={nodeId}
            type="button"
            onClick={() => onSelectNode(nodeId)}
            className={`rounded-md border px-2 py-1 text-xs transition-colors ${
              active
                ? "border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-text)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)]"
            }`}
            title={labelsById[nodeId] ?? nodeId}
          >
            {labelsById[nodeId] ?? nodeId}
          </button>
        );
      })}
      {remainingCount > 0 && (
        <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
          {tWithFallback("ui.app.layers.workflow_lens.more_nodes", "+{count} more", { count: remainingCount })}
        </span>
      )}
    </div>
  );
}
