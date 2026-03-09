/**
 * LAYERED CONTEXT ACTION EXECUTION
 *
 * Executes an approved layered-context action against a validated route that
 * must be downstream of the workflow's lc_ai_chat node.
 */

import { action } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type {
  ExecutionContext,
  NodeExecutionResult,
  WorkflowEdge,
  WorkflowNode,
} from "./types";
import {
  buildDAG,
  evaluateExpression,
  executeWorkflowNode,
  resolveInputData,
  topologicalSort,
} from "./graphEngine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- avoids TS2589 deep type instantiation
const generatedApi: any = require("../_generated/api");
const internal: any = generatedApi.internal;

const LAYERED_CONTEXT_CHAT_NODE_TYPE = "lc_ai_chat";

type WorkflowGraphPayload = {
  workflowId: Id<"objects">;
  organizationId: Id<"organizations">;
  workflowName: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  aiChatNodeId?: string;
} | null;

function collectDownstreamNodeIds(edges: WorkflowEdge[], startNodeId: string): Set<string> {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    const sourceList = outgoing.get(edge.source);
    if (sourceList) {
      sourceList.push(edge.target);
    } else {
      outgoing.set(edge.source, [edge.target]);
    }
  }

  const visited = new Set<string>();
  const queue: string[] = [startNodeId];
  visited.add(startNodeId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const target of outgoing.get(current) ?? []) {
      if (visited.has(target)) {
        continue;
      }
      visited.add(target);
      queue.push(target);
    }
  }

  return visited;
}

function collectAncestorNodeIds(edges: WorkflowEdge[], targetNodeId: string): Set<string> {
  const incoming = new Map<string, string[]>();
  for (const edge of edges) {
    const targetList = incoming.get(edge.target);
    if (targetList) {
      targetList.push(edge.source);
    } else {
      incoming.set(edge.target, [edge.source]);
    }
  }

  const visited = new Set<string>();
  const queue: string[] = [targetNodeId];
  visited.add(targetNodeId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const source of incoming.get(current) ?? []) {
      if (visited.has(source)) {
        continue;
      }
      visited.add(source);
      queue.push(source);
    }
  }

  return visited;
}

function throwLayeredContextActionError(
  code:
    | "LAYERED_CONTEXT_ROUTE_INVALID"
    | "LAYERED_CONTEXT_ROUTE_MISSING_CONTEXT"
    | "LAYERED_CONTEXT_WORKFLOW_NOT_FOUND"
    | "LAYERED_CONTEXT_APPROVAL_REQUIRED"
    | "LAYERED_CONTEXT_APPROVAL_INVALID",
  details: Record<string, unknown>,
): never {
  throw new ConvexError({
    code,
    ...details,
  });
}

export const executeLayeredContextAction = action({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
    targetNodeId: v.string(),
    approvalExecutionId: v.optional(v.id("aiToolExecutions")),
    actionInput: v.optional(v.any()),
    mode: v.optional(v.union(v.literal("manual"), v.literal("test"))),
  },
  handler: async (ctx, args) => {
    if (!args.approvalExecutionId) {
      throwLayeredContextActionError("LAYERED_CONTEXT_APPROVAL_REQUIRED", {
        message: "Layered context actions require approval via the tool execution rail.",
        workflowId: args.workflowId,
      });
    }

    const approvalExecution = await ctx.runQuery(
      generatedApi.api.ai.conversations.getToolExecution,
      { executionId: args.approvalExecutionId },
    ) as {
      organizationId?: Id<"organizations">;
      status?: string;
      toolName?: string;
    } | null;

    if (
      !approvalExecution
      || approvalExecution.toolName !== "execute_layered_context_action"
      || (
        approvalExecution.status !== "approved"
        && approvalExecution.status !== "executing"
        && approvalExecution.status !== "success"
      )
    ) {
      throwLayeredContextActionError("LAYERED_CONTEXT_APPROVAL_INVALID", {
        message: "Layered context action approval was missing or invalid.",
        workflowId: args.workflowId,
        approvalExecutionId: args.approvalExecutionId,
      });
    }

    const workflowGraph: WorkflowGraphPayload = await ctx.runQuery(
      internal.layers.layerWorkflowOntology.internalGetWorkflowGraphForLayeredContextAction,
      { workflowId: args.workflowId },
    );

    if (!workflowGraph) {
      throwLayeredContextActionError("LAYERED_CONTEXT_WORKFLOW_NOT_FOUND", {
        message: "Workflow not found.",
        workflowId: args.workflowId,
      });
    }

    const { nodes, edges, aiChatNodeId, organizationId, workflowName } = workflowGraph;

    if (approvalExecution.organizationId !== organizationId) {
      throwLayeredContextActionError("LAYERED_CONTEXT_APPROVAL_INVALID", {
        message: "Approval execution organization does not match workflow organization.",
        workflowId: args.workflowId,
        approvalExecutionId: args.approvalExecutionId,
      });
    }

    if (!aiChatNodeId) {
      throwLayeredContextActionError("LAYERED_CONTEXT_ROUTE_MISSING_CONTEXT", {
        message: "Workflow is missing required lc_ai_chat context node.",
        workflowId: args.workflowId,
        nodeType: LAYERED_CONTEXT_CHAT_NODE_TYPE,
      });
    }

    if (args.targetNodeId === aiChatNodeId) {
      throwLayeredContextActionError("LAYERED_CONTEXT_ROUTE_INVALID", {
        message: "Target node must be downstream of lc_ai_chat outputs.",
        workflowId: args.workflowId,
        aiChatNodeId,
        targetNodeId: args.targetNodeId,
      });
    }

    const nodeById = new Map<string, WorkflowNode>(nodes.map((node) => [node.id, node]));
    if (!nodeById.has(args.targetNodeId)) {
      throwLayeredContextActionError("LAYERED_CONTEXT_ROUTE_INVALID", {
        message: "Target node does not exist in workflow graph.",
        workflowId: args.workflowId,
        aiChatNodeId,
        targetNodeId: args.targetNodeId,
      });
    }

    const downstreamNodeIds = collectDownstreamNodeIds(edges, aiChatNodeId);
    if (!downstreamNodeIds.has(args.targetNodeId)) {
      throwLayeredContextActionError("LAYERED_CONTEXT_ROUTE_INVALID", {
        message: "Target node is not reachable downstream of lc_ai_chat.",
        workflowId: args.workflowId,
        aiChatNodeId,
        targetNodeId: args.targetNodeId,
      });
    }

    const ancestorNodeIds = collectAncestorNodeIds(edges, args.targetNodeId);
    const routeNodeIds = Array.from(ancestorNodeIds).filter((nodeId) => nodeId !== aiChatNodeId);
    const routeNodeIdSet = new Set(routeNodeIds);

    const outsideContextAncestors = routeNodeIds.filter((nodeId) => !downstreamNodeIds.has(nodeId));
    if (outsideContextAncestors.length > 0) {
      throwLayeredContextActionError("LAYERED_CONTEXT_ROUTE_MISSING_CONTEXT", {
        message: "Target route depends on nodes outside lc_ai_chat downstream context.",
        workflowId: args.workflowId,
        aiChatNodeId,
        targetNodeId: args.targetNodeId,
        missingContextNodeIds: outsideContextAncestors.sort(),
      });
    }

    const missingRouteDependencies: Array<{ nodeId: string; dependencyNodeId: string }> = [];
    for (const nodeId of routeNodeIds) {
      for (const edge of edges) {
        if (edge.target !== nodeId) {
          continue;
        }
        if (edge.source === aiChatNodeId) {
          continue;
        }
        if (!routeNodeIdSet.has(edge.source)) {
          missingRouteDependencies.push({ nodeId, dependencyNodeId: edge.source });
        }
      }
    }

    if (missingRouteDependencies.length > 0) {
      throwLayeredContextActionError("LAYERED_CONTEXT_ROUTE_MISSING_CONTEXT", {
        message: "Route dependencies are incomplete for layered-context action execution.",
        workflowId: args.workflowId,
        aiChatNodeId,
        targetNodeId: args.targetNodeId,
        missingRouteDependencies,
      });
    }

    const routeEdges = edges.filter(
      (edge) =>
        routeNodeIdSet.has(edge.target) &&
        (edge.source === aiChatNodeId || routeNodeIdSet.has(edge.source)),
    );

    const dag = buildDAG(nodes, edges);
    const plan = topologicalSort(dag);
    if (plan.hasCycles) {
      throwLayeredContextActionError("LAYERED_CONTEXT_ROUTE_INVALID", {
        message: "Workflow contains cycles and cannot execute layered-context actions.",
        workflowId: args.workflowId,
      });
    }

    const executionLayers = plan.layers
      .map((layer) => layer.filter((nodeId) => routeNodeIdSet.has(nodeId)))
      .filter((layer) => layer.length > 0);

    if (executionLayers.length === 0) {
      throwLayeredContextActionError("LAYERED_CONTEXT_ROUTE_INVALID", {
        message: "No executable route could be derived for target node.",
        workflowId: args.workflowId,
        aiChatNodeId,
        targetNodeId: args.targetNodeId,
      });
    }

    const mode = args.mode ?? "manual";
    const executionId: Id<"layerExecutions"> = await ctx.runMutation(
      internal.layers.executionLogger.createExecution,
      {
        organizationId,
        workflowId: args.workflowId,
        workflowName,
        mode,
        triggerType: "layered_context_action",
        triggerNodeId: aiChatNodeId,
        triggerData: {
          source: "layered_context_action",
          targetNodeId: args.targetNodeId,
          actionInput: args.actionInput ?? {},
        },
        triggeredBy: undefined,
        totalNodes: routeNodeIds.length,
      },
    );

    for (const nodeId of routeNodeIds) {
      const node = nodeById.get(nodeId)!;
      await ctx.runMutation(
        internal.layers.executionLogger.createNodeExecution,
        {
          executionId,
          organizationId,
          workflowId: args.workflowId,
          nodeId: node.id,
          nodeType: node.type,
          nodeName: node.label ?? node.type,
        },
      );
    }

    await ctx.runMutation(
      internal.layers.layerWorkflowOntology.internalUpdateRunStats,
      { workflowId: args.workflowId },
    );

    const nodeOutputs: Record<string, unknown> = {
      [aiChatNodeId]: (args.actionInput ?? {}) as Record<string, unknown>,
    };

    let nodesSucceeded = 0;
    let nodesFailed = 0;
    let nodesSkipped = 0;
    let creditsUsed = 0;
    let executionError: string | undefined;
    let errorNodeId: string | undefined;

    for (const layer of executionLayers) {
      for (const nodeId of layer) {
        const dagNode = dag.get(nodeId)!;
        const workflowNode = dagNode.workflowNode;

        const depsFailed = dagNode.dependencies.some(
          (depId) => routeNodeIdSet.has(depId) && dag.get(depId)?.state === "failed",
        );
        if (depsFailed) {
          dagNode.state = "skipped";
          nodesSkipped += 1;
          await ctx.runMutation(
            internal.layers.executionLogger.updateNodeExecution,
            {
              executionId,
              nodeId,
              status: "skipped",
            },
          );
          continue;
        }

        const inputData = resolveInputData(nodeId, routeEdges, nodeOutputs);
        const incomingEdges = routeEdges.filter((edge) => edge.target === nodeId);
        const hasConditionalInput = incomingEdges.some((edge) => edge.condition);
        if (hasConditionalInput) {
          const allConditionsFail = incomingEdges
            .filter((edge) => edge.condition)
            .every((edge) => !evaluateExpression(edge.condition!, inputData));
          if (allConditionsFail && incomingEdges.every((edge) => edge.condition)) {
            dagNode.state = "skipped";
            nodesSkipped += 1;
            await ctx.runMutation(
              internal.layers.executionLogger.updateNodeExecution,
              {
                executionId,
                nodeId,
                status: "skipped",
              },
            );
            continue;
          }
        }

        await ctx.runMutation(
          internal.layers.executionLogger.updateNodeExecution,
          {
            executionId,
            nodeId,
            status: "running",
            inputData,
          },
        );

        let result: NodeExecutionResult;
        try {
          const executionContext: ExecutionContext = {
            executionId: executionId.toString(),
            workflowId: args.workflowId,
            organizationId,
            sessionId: args.sessionId,
            nodeOutputs,
            triggerData: (args.actionInput ?? {}) as Record<string, unknown>,
            mode: mode === "test" ? "test" : "design",
            startedAt: Date.now(),
          };
          result = await executeWorkflowNode(ctx, workflowNode, inputData, executionContext);
        } catch (error) {
          result = {
            success: false,
            error: error instanceof Error ? error.message : "Unknown layered context execution error",
          };
        }

        if (result.success) {
          dagNode.state = "completed";
          nodesSucceeded += 1;
          if (result.outputData) {
            nodeOutputs[nodeId] = result.outputData;
          }
        } else {
          dagNode.state = "failed";
          nodesFailed += 1;
          if (!executionError) {
            executionError = result.error;
            errorNodeId = nodeId;
          }
        }

        creditsUsed += 1;

        await ctx.runMutation(
          internal.layers.executionLogger.updateNodeExecution,
          {
            executionId,
            nodeId,
            status: result.success ? "completed" : "failed",
            outputData: result.outputData,
            error: result.error,
            durationMs: result.durationMs,
            activeOutputs: result.activeOutputs,
            creditsUsed: 1,
          },
        );
      }
    }

    const finalStatus = nodesFailed > 0 ? "failed" : "completed";
    await ctx.runMutation(
      internal.layers.executionLogger.completeExecution,
      {
        executionId,
        status: finalStatus,
        nodesExecuted: nodesSucceeded + nodesFailed,
        nodesSucceeded,
        nodesFailed,
        nodesSkipped,
        creditsUsed,
        error: executionError,
        errorNodeId,
      },
    );

    return {
      executionId,
      workflowId: args.workflowId,
      targetNodeId: args.targetNodeId,
      status: finalStatus,
      nodesExecuted: nodesSucceeded + nodesFailed,
      nodesSucceeded,
      nodesFailed,
      nodesSkipped,
    };
  },
});
