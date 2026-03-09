import type {
  LayeredContextBundle,
  LayeredContextConnectedNodeSurface,
  LayeredContextRecentExecution,
} from "../../layers/types";

function formatConnectedNodeSurface(node: LayeredContextConnectedNodeSurface): string {
  const label = node.nodeLabel ? ` (${node.nodeLabel})` : "";
  const description = node.description ? ` - ${node.description}` : "";
  const executionStatus = node.lastExecutionStatus
    ? `; lastExecutionStatus=${node.lastExecutionStatus}`
    : "";
  const executionAt = node.lastExecutionAt
    ? `; lastExecutionAt=${node.lastExecutionAt}`
    : "";
  const snippets = node.contextSnippets?.length
    ? `\n${node.contextSnippets
      .map((snippet) =>
        `  - [${snippet.source}] ${snippet.label}: ${snippet.value}${snippet.truncated ? " (truncated)" : ""}`
      )
      .join("\n")}`
    : "\n  - [unavailable] context: no deterministic node context available";
  return `- ${node.nodeId}: ${node.nodeType}${label}${description}${executionStatus}${executionAt}${snippets}`;
}

function formatRecentExecution(execution: LayeredContextRecentExecution): string {
  const summary = execution.summary ? `; summary=${execution.summary}` : "";
  const trigger = execution.triggerNodeId ? `; triggerNodeId=${execution.triggerNodeId}` : "";
  const completedAt = execution.completedAt ? `; completedAt=${execution.completedAt}` : "";
  return `- executionId=${execution.executionId}; status=${execution.status}; startedAt=${execution.startedAt}${completedAt}${trigger}${summary}`;
}

/**
 * Builds a deterministic layered-context system instruction string from Tier 1/Tier 2 data.
 * This output is intended for system-message injection inside runtime agent execution.
 */
export function buildLayeredContextSystemPrompt(bundle: LayeredContextBundle): string {
  const tier1 = bundle.tier1;
  const tier2 = bundle.tier2;

  const recentExecutions = tier1.recentExecutions.length
    ? tier1.recentExecutions.map(formatRecentExecution).join("\n")
    : "- none";

  const tier2Section = tier2
    ? [
        "## TIER 2 (AI Chat Node Enrichment)",
        `- aiChatNodeId: ${tier2.aiChatNodeId}`,
        `- aiChatModel: ${tier2.aiChatModel ?? "not set"}`,
        `- aiChatPrompt: ${tier2.aiChatPrompt ?? "not set"}`,
        "- connectedInputs:",
        tier2.connectedInputs.length
          ? tier2.connectedInputs.map(formatConnectedNodeSurface).join("\n")
          : "- none",
        "- connectedOutputs:",
        tier2.connectedOutputs.length
          ? tier2.connectedOutputs.map(formatConnectedNodeSurface).join("\n")
          : "- none",
      ].join("\n")
    : [
        "## TIER 2 (AI Chat Node Enrichment)",
        "- not available (workflow has no lc_ai_chat node)",
      ].join("\n");

  return [
    "[LAYERED_CONTEXT_SYSTEM_V1]",
    "You are operating with Layered Context from a selected workflow.",
    "Treat this context as advisory state for analysis and planning.",
    "Never claim execution has happened unless confirmed by runtime tool results.",
    "",
    "## TIER 1 (Workflow Summary)",
    `- workflowId: ${tier1.workflow.workflowId}`,
    `- workflowName: ${tier1.workflow.workflowName}`,
    `- workflowStatus: ${tier1.workflow.workflowStatus}`,
    `- workflowUpdatedAt: ${tier1.workflow.workflowUpdatedAt}`,
    `- workflowMode: ${tier1.workflow.workflowMode ?? "design"}`,
    `- graph: nodes=${tier1.workflow.nodeCount}, edges=${tier1.workflow.edgeCount}`,
    "- recentExecutions:",
    recentExecutions,
    "",
    tier2Section,
    "",
    "## ACTION PROPOSAL CONTRACT",
    "When proposing a workflow action, output a strict JSON block with this shape:",
    "```json",
    '{"kind":"layered_context_action_proposal","workflowId":"<workflow_id>","targetNodeId":"<node_id>","action":"<action_name>","args":{},"rationale":"<why this action is appropriate>"}',
    "```",
    "Only propose actions for nodes that are reachable downstream from lc_ai_chat outputs.",
    "If reachability is unknown, ask a clarifying question instead of proposing execution.",
    "",
    "## APPROVAL REQUIREMENTS",
    "All layered context actions require explicit human approval before execution.",
    "Do not present actions as already executed or approved.",
    "After an approval result returns, summarize outcome using tool evidence only.",
  ].join("\n");
}
