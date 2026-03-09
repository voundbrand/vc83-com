import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const LAYERED_CONTEXT_ACTIONS_PATH = resolve(
  process.cwd(),
  "convex/layers/layeredContextActions.ts",
);
const GRAPH_ENGINE_PATH = resolve(process.cwd(), "convex/layers/graphEngine.ts");
const WORKFLOW_ONTOLOGY_PATH = resolve(
  process.cwd(),
  "convex/layers/layerWorkflowOntology.ts",
);

describe("layered context action execution contracts", () => {
  it("adds executeLayeredContextAction with strict route validation errors", () => {
    const source = readFileSync(LAYERED_CONTEXT_ACTIONS_PATH, "utf8");

    expect(source).toContain("export const executeLayeredContextAction = action({");
    expect(source).toContain("collectDownstreamNodeIds");
    expect(source).toContain("collectAncestorNodeIds");
    expect(source).toContain("LAYERED_CONTEXT_ROUTE_INVALID");
    expect(source).toContain("LAYERED_CONTEXT_ROUTE_MISSING_CONTEXT");
    expect(source).toContain("LAYERED_CONTEXT_APPROVAL_REQUIRED");
    expect(source).toContain("LAYERED_CONTEXT_APPROVAL_INVALID");
    expect(source).toContain("approvalExecutionId");
    expect(source).toContain("execute_layered_context_action");
    expect(source).toContain("targetNodeId");
    expect(source).toContain("lc_ai_chat");
  });

  it("routes execution through existing graph runtime semantics", () => {
    const source = readFileSync(LAYERED_CONTEXT_ACTIONS_PATH, "utf8");
    const graphEngineSource = readFileSync(GRAPH_ENGINE_PATH, "utf8");

    expect(source).toContain("buildDAG(");
    expect(source).toContain("topologicalSort(");
    expect(source).toContain("resolveInputData(");
    expect(source).toContain("evaluateExpression(");
    expect(source).toContain("executeWorkflowNode(");
    expect(graphEngineSource).toContain("export async function executeWorkflowNode(");
  });

  it("captures execution and node logs through executionLogger mutations", () => {
    const source = readFileSync(LAYERED_CONTEXT_ACTIONS_PATH, "utf8");

    expect(source).toContain("internal.layers.executionLogger.createExecution");
    expect(source).toContain("internal.layers.executionLogger.createNodeExecution");
    expect(source).toContain("internal.layers.executionLogger.updateNodeExecution");
    expect(source).toContain("internal.layers.executionLogger.completeExecution");
  });

  it("adds internal workflow graph helper used by layered context execution", () => {
    const source = readFileSync(WORKFLOW_ONTOLOGY_PATH, "utf8");

    expect(source).toContain(
      "export const internalGetWorkflowGraphForLayeredContextAction = internalQuery({",
    );
    expect(source).toContain("aiChatNodeId");
  });
});
