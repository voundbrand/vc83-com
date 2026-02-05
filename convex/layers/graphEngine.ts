/**
 * GRAPH EXECUTION ENGINE
 *
 * DAG-based workflow execution for Layers.
 * Handles topological sort, parallel branch execution,
 * per-edge data mapping, and async node dispatch.
 *
 * Architecture:
 * 1. Build DAG from workflow nodes/edges
 * 2. Topological sort into execution layers (parallelizable groups)
 * 3. Execute each layer (nodes in same layer can run in parallel)
 * 4. Resolve per-edge data mappings between nodes
 * 5. Handle conditional branching (if/then, filter, split)
 * 6. Track execution state per node
 *
 * Delegates to:
 * - BehaviorAdapter for LC Native nodes
 * - NodeExecutors for integration, trigger, and logic nodes
 * - Convex scheduled functions for async/delayed execution
 */

import { action, internalAction, internalMutation } from "../_generated/server";
import { v } from "convex/values";
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- avoids TS2589 deep type instantiation
const internal: any = require("../_generated/api").internal;
import type {
  WorkflowNode,
  WorkflowEdge,
  DAGNode,
  ExecutionPlan,
  ExecutionContext,
  NodeExecutionResult,
  ResolvedDataMapping,
  LayerWorkflowData,
} from "./types";
import { Id } from "../_generated/dataModel";
import { executeLogicNode } from "./nodeExecutors";

// ============================================================================
// DAG CONSTRUCTION
// ============================================================================

/**
 * Build a DAG from workflow nodes and edges.
 * Returns a map of node IDs to DAGNode objects.
 */
export function buildDAG(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): Map<string, DAGNode> {
  const dag = new Map<string, DAGNode>();

  // Initialize all nodes
  for (const node of nodes) {
    dag.set(node.id, {
      id: node.id,
      dependencies: [],
      dependents: [],
      state: "pending",
      workflowNode: node,
    });
  }

  // Build dependency graph from edges
  for (const edge of edges) {
    const sourceNode = dag.get(edge.source);
    const targetNode = dag.get(edge.target);

    if (sourceNode && targetNode) {
      targetNode.dependencies.push(edge.source);
      sourceNode.dependents.push(edge.target);
    }
  }

  return dag;
}

/**
 * Topological sort of the DAG into execution layers.
 * Each layer contains nodes that can execute in parallel.
 * Uses Kahn's algorithm.
 */
export function topologicalSort(dag: Map<string, DAGNode>): ExecutionPlan {
  const inDegree = new Map<string, number>();
  const entryPoints: string[] = [];

  // Calculate in-degrees
  for (const [id, node] of dag) {
    inDegree.set(id, node.dependencies.length);
    if (node.dependencies.length === 0) {
      entryPoints.push(id);
    }
  }

  const layers: string[][] = [];
  let processed = 0;
  let currentLayer = [...entryPoints];

  while (currentLayer.length > 0) {
    layers.push(currentLayer);
    processed += currentLayer.length;

    const nextLayer: string[] = [];
    for (const nodeId of currentLayer) {
      const node = dag.get(nodeId)!;
      for (const dependentId of node.dependents) {
        const degree = (inDegree.get(dependentId) ?? 0) - 1;
        inDegree.set(dependentId, degree);
        if (degree === 0) {
          nextLayer.push(dependentId);
        }
      }
    }

    currentLayer = nextLayer;
  }

  const hasCycles = processed < dag.size;

  return {
    layers,
    totalNodes: dag.size,
    hasCycles,
    entryPoints,
  };
}

// ============================================================================
// DATA MAPPING
// ============================================================================

/**
 * Resolve data mappings for edges feeding into a target node.
 * Collects output data from source nodes and maps fields
 * according to edge dataMapping configuration.
 */
export function resolveInputData(
  targetNodeId: string,
  edges: WorkflowEdge[],
  nodeOutputs: Record<string, unknown>,
): Record<string, unknown> {
  const inputData: Record<string, unknown> = {};

  // Find all edges pointing to this node
  const incomingEdges = edges.filter((e) => e.target === targetNodeId);

  for (const edge of incomingEdges) {
    const sourceOutput = nodeOutputs[edge.source] as Record<string, unknown> | undefined;
    if (!sourceOutput) continue;

    if (edge.dataMapping && Object.keys(edge.dataMapping).length > 0) {
      // Apply explicit field mapping
      for (const [targetField, sourceExpression] of Object.entries(edge.dataMapping)) {
        inputData[targetField] = resolveExpression(sourceExpression, sourceOutput);
      }
    } else {
      // Default: merge all source output data
      Object.assign(inputData, sourceOutput);
    }
  }

  return inputData;
}

/**
 * Resolve a simple expression against source data.
 * Supports dot-notation paths like "contact.email".
 */
function resolveExpression(expression: string, data: Record<string, unknown>): unknown {
  // Simple dot-notation path resolution
  const parts = expression.split(".");
  let current: unknown = data;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

// ============================================================================
// EXPRESSION EVALUATION (for conditions)
// ============================================================================

/**
 * Evaluate a condition expression against data.
 * Supports:
 * - field === 'value'
 * - field !== 'value'
 * - field > number
 * - field < number
 * - field >= number
 * - field <= number
 * - field (truthy check)
 * - !field (falsy check)
 * - expr AND expr
 * - expr OR expr
 */
export function evaluateExpression(expression: string, data: Record<string, unknown>): boolean {
  // Handle AND/OR
  if (expression.includes(" AND ")) {
    return expression.split(" AND ").every((part) => evaluateExpression(part.trim(), data));
  }
  if (expression.includes(" OR ")) {
    return expression.split(" OR ").some((part) => evaluateExpression(part.trim(), data));
  }

  // Handle negation
  if (expression.startsWith("!")) {
    return !evaluateExpression(expression.slice(1).trim(), data);
  }

  // String equality: field === 'value'
  const eqMatch = expression.match(/^([\w.]+)\s*===\s*'([^']*)'$/);
  if (eqMatch) {
    return resolveExpression(eqMatch[1], data) === eqMatch[2];
  }

  // String inequality: field !== 'value'
  const neqMatch = expression.match(/^([\w.]+)\s*!==\s*'([^']*)'$/);
  if (neqMatch) {
    return resolveExpression(neqMatch[1], data) !== neqMatch[2];
  }

  // Numeric comparisons
  const numMatch = expression.match(/^([\w.]+)\s*(>=|<=|>|<|===|!==)\s*(\d+(?:\.\d+)?)$/);
  if (numMatch) {
    const value = Number(resolveExpression(numMatch[1], data));
    const num = Number(numMatch[3]);
    switch (numMatch[2]) {
      case ">": return value > num;
      case "<": return value < num;
      case ">=": return value >= num;
      case "<=": return value <= num;
      case "===": return value === num;
      case "!==": return value !== num;
    }
  }

  // Simple truthy check: field
  if (expression.match(/^[\w.]+$/)) {
    return !!resolveExpression(expression, data);
  }

  console.warn(`[GraphEngine] Unknown expression format: ${expression}`);
  return false;
}

// ============================================================================
// EXECUTION ORCHESTRATOR
// ============================================================================

/**
 * Start a workflow execution.
 * Creates execution records and dispatches the first layer of nodes.
 */
export const startExecution = internalAction({
  args: {
    workflowId: v.id("objects"),
    organizationId: v.id("organizations"),
    sessionId: v.string(),
    triggerType: v.string(),
    triggerNodeId: v.optional(v.string()),
    triggerData: v.optional(v.any()),
    mode: v.union(v.literal("live"), v.literal("test"), v.literal("manual")),
    triggeredBy: v.optional(v.union(v.id("users"), v.id("objects"))),
  },
  handler: async (ctx, args): Promise<{
    executionId: Id<"layerExecutions">;
    status: "completed" | "failed";
    nodesExecuted: number;
    nodesSucceeded: number;
    nodesFailed: number;
    nodesSkipped: number;
  }> => {
    // Get workflow data
    const workflow = await ctx.runQuery(
      internal.layers.layerWorkflowOntology.internalGetWorkflow,
      { workflowId: args.workflowId }
    );

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const data = workflow.customProperties as unknown as LayerWorkflowData;
    if (!data?.nodes || !data?.edges) {
      throw new Error("Workflow has no nodes or edges");
    }

    // Build DAG and execution plan
    const dag = buildDAG(data.nodes, data.edges);
    const plan = topologicalSort(dag);

    if (plan.hasCycles) {
      throw new Error("Workflow contains cycles and cannot be executed");
    }

    if (plan.entryPoints.length === 0) {
      throw new Error("Workflow has no entry points (trigger nodes)");
    }

    // Create execution record
    const executionId: Id<"layerExecutions"> = await ctx.runMutation(
      internal.layers.executionLogger.createExecution,
      {
        organizationId: args.organizationId,
        workflowId: args.workflowId,
        workflowName: workflow.name,
        mode: args.mode,
        triggerType: args.triggerType,
        triggerNodeId: args.triggerNodeId,
        triggerData: args.triggerData,
        triggeredBy: args.triggeredBy,
        totalNodes: plan.totalNodes,
      }
    );

    // Create node execution records for all nodes
    for (const node of data.nodes) {
      await ctx.runMutation(
        internal.layers.executionLogger.createNodeExecution,
        {
          executionId,
          organizationId: args.organizationId,
          workflowId: args.workflowId,
          nodeId: node.id,
          nodeType: node.type,
          nodeName: node.label ?? node.type,
        }
      );
    }

    // Update workflow run stats
    await ctx.runMutation(
      internal.layers.layerWorkflowOntology.internalUpdateRunStats,
      { workflowId: args.workflowId }
    );

    // Execute layers sequentially, nodes within each layer in parallel
    const nodeOutputs: Record<string, unknown> = {};

    // Set trigger data as output of entry points
    for (const entryId of plan.entryPoints) {
      nodeOutputs[entryId] = args.triggerData ?? {};
    }

    let nodesSucceeded = 0;
    let nodesFailed = 0;
    let nodesSkipped = 0;
    let creditsUsed = 0;
    let executionError: string | undefined;
    let errorNodeId: string | undefined;

    for (const layer of plan.layers) {
      // Execute all nodes in this layer
      // In production, these would run as parallel Convex scheduled functions
      // For now, we execute sequentially within each layer
      for (const nodeId of layer) {
        const dagNode = dag.get(nodeId)!;
        const workflowNode = dagNode.workflowNode;

        // Check if dependencies all completed
        const depsFailed = dagNode.dependencies.some(
          (depId) => dag.get(depId)?.state === "failed"
        );

        if (depsFailed) {
          dagNode.state = "skipped";
          nodesSkipped++;
          await ctx.runMutation(
            internal.layers.executionLogger.updateNodeExecution,
            {
              executionId,
              nodeId,
              status: "skipped",
            }
          );
          continue;
        }

        // Resolve input data from upstream edges
        const inputData = resolveInputData(nodeId, data.edges, nodeOutputs);

        // Check conditional edges (for if/then branches)
        const incomingEdges = data.edges.filter((e) => e.target === nodeId);
        const hasConditionalInput = incomingEdges.some((e) => e.condition);
        if (hasConditionalInput) {
          const allConditionsFail = incomingEdges
            .filter((e) => e.condition)
            .every((e) => !evaluateExpression(e.condition!, inputData));
          if (allConditionsFail && incomingEdges.every((e) => e.condition)) {
            dagNode.state = "skipped";
            nodesSkipped++;
            await ctx.runMutation(
              internal.layers.executionLogger.updateNodeExecution,
              {
                executionId,
                nodeId,
                status: "skipped",
              }
            );
            continue;
          }
        }

        // Mark node as running
        await ctx.runMutation(
          internal.layers.executionLogger.updateNodeExecution,
          {
            executionId,
            nodeId,
            status: "running",
            inputData,
          }
        );

        // Execute the node
        let result: NodeExecutionResult;
        try {
          result = await executeNode(ctx, workflowNode, inputData, {
            executionId: executionId.toString(),
            workflowId: args.workflowId,
            organizationId: args.organizationId,
            sessionId: args.sessionId,
            nodeOutputs,
            triggerData: (args.triggerData ?? {}) as Record<string, unknown>,
            mode: args.mode === "test" ? "test" : args.mode === "manual" ? "design" : "live",
            startedAt: Date.now(),
          });
        } catch (err) {
          result = {
            success: false,
            error: err instanceof Error ? err.message : "Unknown execution error",
          };
        }

        // Update node state
        if (result.success) {
          dagNode.state = "completed";
          nodesSucceeded++;
          if (result.outputData) {
            nodeOutputs[nodeId] = result.outputData;
          }
        } else {
          dagNode.state = "failed";
          nodesFailed++;
          if (!executionError) {
            executionError = result.error;
            errorNodeId = nodeId;
          }
        }

        creditsUsed += 1; // Each node costs 1 credit (managed by behaviorExecutor for LC native)

        // Log node completion
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
          }
        );
      }
    }

    // Complete execution
    const finalStatus = nodesFailed > 0 ? "failed" as const : "completed" as const;
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
      }
    );

    return {
      executionId,
      status: finalStatus,
      nodesExecuted: nodesSucceeded + nodesFailed,
      nodesSucceeded,
      nodesFailed,
      nodesSkipped,
    };
  },
});

// ============================================================================
// NODE EXECUTION DISPATCH
// ============================================================================

/**
 * Execute a single node by dispatching to the appropriate executor.
 * Routes to:
 * - BehaviorAdapter for LC Native nodes
 * - Built-in handlers for logic nodes
 * - Integration executors for third-party nodes
 */
const LOGIC_NODE_TYPES = new Set([
  "if_then", "wait_delay", "split_ab", "merge",
  "loop_iterator", "filter", "transform_data",
  "http_request", "code_block",
]);

async function executeNode(
  ctx: { runAction: Function },
  node: WorkflowNode,
  inputData: Record<string, unknown>,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const startTime = Date.now();

  // Trigger nodes pass data through
  if (node.type.startsWith("trigger_")) {
    return {
      success: true,
      outputData: inputData,
      activeOutputs: ["trigger_out"],
      durationMs: Date.now() - startTime,
    };
  }

  // Logic nodes: dispatch to nodeExecutors
  if (LOGIC_NODE_TYPES.has(node.type)) {
    return executeLogicNode(node, inputData, context);
  }

  // Test mode: mock LC Native and integration nodes
  if (context.mode === "test") {
    if (node.type.startsWith("lc_") || !LOGIC_NODE_TYPES.has(node.type)) {
      return {
        success: true,
        outputData: { _testMode: true, _mockedFor: node.type, ...inputData },
        activeOutputs: ["output"],
        durationMs: Date.now() - startTime,
      };
    }
  }

  // LC Native nodes: delegate to behavior adapter
  if (node.type.startsWith("lc_")) {
    const result = await ctx.runAction(
      "layers/behaviorAdapter:executeLcNativeNode" as any,
      {
        sessionId: context.sessionId,
        organizationId: context.organizationId,
        nodeType: node.type,
        nodeConfig: node.config,
        inputData,
      }
    );
    return result as NodeExecutionResult;
  }

  // Integration nodes: placeholder for Phase 4
  return {
    success: false,
    error: `Executor not yet implemented for node type: ${node.type}`,
    durationMs: Date.now() - startTime,
  };
}
