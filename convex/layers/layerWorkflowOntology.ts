/**
 * LAYER WORKFLOW ONTOLOGY
 *
 * CRUD operations for Layers workflows stored in the objects table.
 * Uses the universal ontology pattern: type="layer_workflow"
 *
 * Subtypes:
 * - "workflow" (default) - User-created workflows
 * - "template_clone" - Workflows created from templates
 *
 * Status Workflow:
 * - "draft" - Workflow being designed
 * - "ready" - All nodes configured, ready to activate
 * - "active" - Live, processing events
 * - "paused" - Temporarily disabled
 * - "error" - Execution failure, needs attention
 * - "archived" - Soft deleted
 *
 * Data stored in customProperties:
 * - nodes: WorkflowNode[]
 * - edges: WorkflowEdge[]
 * - metadata: { description, templateId, isActive, mode, ... }
 * - triggers: TriggerConfig[]
 * - viewport: { x, y, zoom }
 */

import { query, mutation, internalQuery, internalMutation } from "../_generated/server";
const generatedApi: any = require("../_generated/api");
import { ConvexError, v } from "convex/values";
import { requireAuthenticatedUser, checkPermission } from "../rbacHelpers";
import { checkFeatureAccess } from "../licensing/helpers";
import { Id } from "../_generated/dataModel";
import type {
  LayerWorkflowData,
  LayeredContextBundle,
  LayeredContextConnectedNodeSurface,
  LayeredContextNodeContextSnippet,
  LayeredContextRecentExecution,
  WorkflowMode,
} from "./types";

const OBJECT_TYPE = "layer_workflow";
const LAYERED_CONTEXT_CHAT_NODE_TYPE = "lc_ai_chat";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toWorkflowMode(value: unknown): WorkflowMode {
  return value === "design" || value === "test" || value === "live" ? value : "design";
}

function summarizeExecution(
  status: string,
  nodesSucceeded?: number,
  nodesFailed?: number,
  error?: string,
): string | undefined {
  if (status === "failed" || status === "timed_out") {
    return error || undefined;
  }
  if (typeof nodesSucceeded === "number" || typeof nodesFailed === "number") {
    const succeeded = typeof nodesSucceeded === "number" ? nodesSucceeded : 0;
    const failed = typeof nodesFailed === "number" ? nodesFailed : 0;
    return `${succeeded} succeeded, ${failed} failed`;
  }
  return undefined;
}

function normalizeContextValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

function truncateContextValue(value: string, maxLength = 320): { value: string; truncated: boolean } {
  if (value.length <= maxLength) {
    return { value, truncated: false };
  }
  return {
    value: `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`,
    truncated: true,
  };
}

function classifyContextSnippetSource(path: string): LayeredContextNodeContextSnippet["source"] {
  const loweredPath = path.toLowerCase();
  if (
    loweredPath.includes("transcript")
    || loweredPath.includes("caption")
    || loweredPath.includes("subtitle")
  ) {
    return "transcript";
  }
  if (
    loweredPath.includes("file")
    || loweredPath.includes("document")
    || loweredPath.includes("markdown")
    || loweredPath.includes("content")
    || loweredPath.includes("text")
    || loweredPath.includes("body")
  ) {
    return "file_excerpt";
  }
  return "execution_output";
}

function collectDeterministicContextStrings(
  value: unknown,
  path = "",
  depth = 0,
  budget: { count: number },
  maxCount = 12,
): Array<{ path: string; value: string }> {
  if (budget.count >= maxCount || depth > 3) {
    return [];
  }
  const direct = normalizeContextValue(value);
  if (direct) {
    budget.count += 1;
    return [{ path: path || "value", value: direct }];
  }
  if (Array.isArray(value)) {
    const results: Array<{ path: string; value: string }> = [];
    for (let index = 0; index < value.length; index += 1) {
      if (budget.count >= maxCount) {
        break;
      }
      results.push(
        ...collectDeterministicContextStrings(
          value[index],
          `${path}[${index}]`,
          depth + 1,
          budget,
          maxCount,
        ),
      );
    }
    return results;
  }
  if (isRecord(value)) {
    const results: Array<{ path: string; value: string }> = [];
    for (const key of Object.keys(value).sort()) {
      if (budget.count >= maxCount) {
        break;
      }
      const nextPath = path ? `${path}.${key}` : key;
      results.push(
        ...collectDeterministicContextStrings(
          value[key],
          nextPath,
          depth + 1,
          budget,
          maxCount,
        ),
      );
    }
    return results;
  }
  return [];
}

function buildNodeContextSnippets(args: {
  node: Record<string, unknown>;
  latestNodeExecution?: Record<string, unknown>;
}): LayeredContextNodeContextSnippet[] {
  const configSnippets: LayeredContextNodeContextSnippet[] = [];
  const pushSnippet = (
    source: LayeredContextNodeContextSnippet["source"],
    label: string,
    rawValue: unknown,
  ) => {
    const normalized = normalizeContextValue(rawValue);
    if (!normalized) {
      return;
    }
    const truncated = truncateContextValue(normalized);
    configSnippets.push({
      source,
      label,
      value: truncated.value,
      truncated: truncated.truncated || undefined,
    });
  };

  const nodeConfig = isRecord(args.node.config) ? args.node.config : null;
  if (nodeConfig) {
    for (const key of ["videoUrl", "url", "source", "language", "action", "description"]) {
      if (configSnippets.length >= 2) {
        break;
      }
      pushSnippet("node_config", `config.${key}`, nodeConfig[key]);
    }
  }

  const latestExecution = args.latestNodeExecution;
  const executionCandidates: LayeredContextNodeContextSnippet[] = [];
  if (latestExecution) {
    const inputCandidates = collectDeterministicContextStrings(
      latestExecution.inputData,
      "inputData",
      0,
      { count: 0 },
      8,
    );
    for (const candidate of inputCandidates) {
      const truncated = truncateContextValue(candidate.value);
      executionCandidates.push({
        source: "execution_input",
        label: candidate.path,
        value: truncated.value,
        truncated: truncated.truncated || undefined,
      });
    }
    const outputCandidates = collectDeterministicContextStrings(
      latestExecution.outputData,
      "outputData",
      0,
      { count: 0 },
      10,
    );
    for (const candidate of outputCandidates) {
      const truncated = truncateContextValue(candidate.value);
      executionCandidates.push({
        source: classifyContextSnippetSource(candidate.path),
        label: candidate.path,
        value: truncated.value,
        truncated: truncated.truncated || undefined,
      });
    }
  }

  const seenValues = new Set<string>();
  const snippets: LayeredContextNodeContextSnippet[] = [];
  for (const snippet of [...configSnippets, ...executionCandidates]) {
    const dedupeKey = `${snippet.source}:${snippet.value}`;
    if (seenValues.has(dedupeKey)) {
      continue;
    }
    seenValues.add(dedupeKey);
    snippets.push(snippet);
    if (snippets.length >= 4) {
      break;
    }
  }

  if (snippets.length === 0) {
    return [
      {
        source: "unavailable",
        label: "context",
        value: "No deterministic context available for this node.",
      },
    ];
  }
  return snippets;
}

function toConnectedNodeSurface(
  node: Record<string, unknown> | undefined,
  latestNodeExecutionByNodeId: Map<string, Record<string, unknown>>,
): LayeredContextConnectedNodeSurface | null {
  if (!node) {
    return null;
  }
  const nodeId = typeof node.id === "string" ? node.id : undefined;
  const nodeType = typeof node.type === "string" ? node.type : undefined;
  if (!nodeId || !nodeType) {
    return null;
  }
  const nodeConfig = isRecord(node.config) ? node.config : undefined;
  const labelFromConfig =
    typeof nodeConfig?.label === "string"
      ? nodeConfig.label
      : typeof nodeConfig?.name === "string"
        ? nodeConfig.name
        : undefined;
  const descriptionFromConfig =
    typeof nodeConfig?.description === "string" ? nodeConfig.description : undefined;
  const latestNodeExecution = latestNodeExecutionByNodeId.get(nodeId);
  return {
    nodeId,
    nodeType,
    nodeLabel: typeof node.label === "string" ? node.label : labelFromConfig,
    description: descriptionFromConfig,
    lastExecutionStatus:
      typeof latestNodeExecution?.status === "string"
        ? latestNodeExecution.status
        : undefined,
    lastExecutionAt:
      typeof latestNodeExecution?.completedAt === "number"
        ? latestNodeExecution.completedAt
        : typeof latestNodeExecution?.startedAt === "number"
          ? latestNodeExecution.startedAt
          : undefined,
    contextSnippets: buildNodeContextSnippets({ node, latestNodeExecution }),
  };
}

type LayerWorkflowRecord = {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  name: string;
  status: string;
  updatedAt: number;
  customProperties?: unknown;
};

async function buildLayeredContextBundleForWorkflow(args: {
  ctx: { db: any };
  workflow: LayerWorkflowRecord;
  organizationId: Id<"organizations">;
  recentExecutionLimit?: number;
}): Promise<LayeredContextBundle> {
  const { ctx, workflow, organizationId } = args;
  const rawWorkflowData = isRecord(workflow.customProperties) ? workflow.customProperties : {};
  const rawNodes = Array.isArray(rawWorkflowData.nodes) ? rawWorkflowData.nodes : [];
  const rawEdges = Array.isArray(rawWorkflowData.edges) ? rawWorkflowData.edges : [];
  const rawMetadata = isRecord(rawWorkflowData.metadata) ? rawWorkflowData.metadata : {};

  const nodes = rawNodes.filter(isRecord);
  const edges = rawEdges.filter(isRecord);

  const aiChatNode = nodes.find((node) => node.type === LAYERED_CONTEXT_CHAT_NODE_TYPE);
  const aiChatNodeId = typeof aiChatNode?.id === "string" ? aiChatNode.id : undefined;
  const aiChatConfig = isRecord(aiChatNode?.config) ? aiChatNode.config : undefined;

  const recentExecutionLimit = Math.max(1, Math.min(args.recentExecutionLimit ?? 8, 25));
  const recentExecutionRows = await ctx.db
    .query("layerExecutions")
    .withIndex("by_workflow", (q: any) => q.eq("workflowId", workflow._id))
    .order("desc")
    .take(recentExecutionLimit * 3);

  const recentExecutions: LayeredContextRecentExecution[] = recentExecutionRows
    .filter((execution: any) => execution.organizationId === organizationId)
    .slice(0, recentExecutionLimit)
    .map((execution: any) => {
      const status: LayeredContextRecentExecution["status"] =
        execution.status === "completed"
          ? "completed"
          : execution.status === "failed" || execution.status === "timed_out"
            ? "failed"
            : execution.status === "cancelled"
              ? "cancelled"
              : "running";
      return {
        executionId: execution._id,
        status,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        triggerNodeId: execution.triggerNodeId,
        summary: summarizeExecution(
          execution.status,
          execution.nodesSucceeded,
          execution.nodesFailed,
          execution.error,
        ),
      };
    });

  const tier1 = {
    workflow: {
      workflowId: workflow._id,
      workflowName: workflow.name,
      workflowStatus: workflow.status,
      workflowUpdatedAt: workflow.updatedAt,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      workflowMode: toWorkflowMode(rawMetadata.mode),
    },
    recentExecutions,
  };

  if (!aiChatNodeId) {
    return {
      contractVersion: "layered_context_bundle_v1",
      tier1,
    };
  }

  const incomingNodeIds = new Set<string>();
  const outgoingNodeIds = new Set<string>();
  for (const edge of edges) {
    const source = typeof edge.source === "string" ? edge.source : undefined;
    const target = typeof edge.target === "string" ? edge.target : undefined;
    if (!source || !target) {
      continue;
    }
    if (target === aiChatNodeId && source !== aiChatNodeId) {
      incomingNodeIds.add(source);
    }
    if (source === aiChatNodeId && target !== aiChatNodeId) {
      outgoingNodeIds.add(target);
    }
  }

  const nodeById = new Map<string, Record<string, unknown>>();
  for (const node of nodes) {
    const nodeId = typeof node.id === "string" ? node.id : undefined;
    if (nodeId) {
      nodeById.set(nodeId, node);
    }
  }

  const connectedNodeIds = new Set<string>([
    ...Array.from(incomingNodeIds),
    ...Array.from(outgoingNodeIds),
  ]);
  const latestNodeExecutionByNodeId = new Map<string, Record<string, unknown>>();
  for (const execution of recentExecutionRows) {
    if (execution.organizationId !== organizationId) {
      continue;
    }
    const nodeExecutions = await ctx.db
      .query("layerNodeExecutions")
      .withIndex("by_execution", (q: any) => q.eq("executionId", execution._id))
      .collect();
    for (const nodeExecution of nodeExecutions) {
      if (!connectedNodeIds.has(nodeExecution.nodeId)) {
        continue;
      }
      const candidateTimestamp =
        (typeof nodeExecution.completedAt === "number" ? nodeExecution.completedAt : 0)
        || (typeof nodeExecution.startedAt === "number" ? nodeExecution.startedAt : 0)
        || 0;
      const current = latestNodeExecutionByNodeId.get(nodeExecution.nodeId);
      const currentTimestamp = current
        ? (
            (typeof current.completedAt === "number" ? current.completedAt : 0)
            || (typeof current.startedAt === "number" ? current.startedAt : 0)
            || 0
          )
        : -1;
      if (candidateTimestamp > currentTimestamp) {
        latestNodeExecutionByNodeId.set(
          nodeExecution.nodeId,
          nodeExecution as unknown as Record<string, unknown>,
        );
      }
    }
  }

  const connectedInputs = Array.from(incomingNodeIds)
    .map((nodeId) => toConnectedNodeSurface(nodeById.get(nodeId), latestNodeExecutionByNodeId))
    .filter((surface): surface is LayeredContextConnectedNodeSurface => Boolean(surface));
  const connectedOutputs = Array.from(outgoingNodeIds)
    .map((nodeId) => toConnectedNodeSurface(nodeById.get(nodeId), latestNodeExecutionByNodeId))
    .filter((surface): surface is LayeredContextConnectedNodeSurface => Boolean(surface));

  const tier2 = {
    aiChatNodeId,
    aiChatPrompt:
      typeof aiChatConfig?.systemPrompt === "string"
        ? aiChatConfig.systemPrompt
        : typeof aiChatConfig?.prompt === "string"
          ? aiChatConfig.prompt
          : undefined,
    aiChatModel:
      typeof aiChatConfig?.model === "string"
        ? aiChatConfig.model
        : typeof aiChatConfig?.modelId === "string"
          ? aiChatConfig.modelId
          : undefined,
    connectedInputs,
    connectedOutputs,
  };

  return {
    contractVersion: "layered_context_bundle_v1",
    tier1,
    tier2,
  };
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all workflows for the current organization
 */
export const listWorkflows = query({
  args: {
    sessionId: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflows = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", OBJECT_TYPE)
      )
      .collect();

    // Filter by status if provided
    const filtered = args.status
      ? workflows.filter((w) => w.status === args.status)
      : workflows.filter((w) => w.status !== "archived");

    return filtered.map((w) => ({
      _id: w._id,
      name: w.name,
      description: w.description,
      status: w.status,
      subtype: w.subtype,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      nodeCount: ((w.customProperties as LayerWorkflowData)?.nodes ?? []).length,
      edgeCount: ((w.customProperties as LayerWorkflowData)?.edges ?? []).length,
      isActive: (w.customProperties as LayerWorkflowData)?.metadata?.isActive ?? false,
      runCount: (w.customProperties as LayerWorkflowData)?.metadata?.runCount ?? 0,
      lastRunAt: (w.customProperties as LayerWorkflowData)?.metadata?.lastRunAt,
      templateId: (w.customProperties as LayerWorkflowData)?.metadata?.templateId,
    }));
  },
});

/**
 * Lightweight workflow cards for chat layered-context switcher.
 * Includes context metadata + active conversation counts grouped by workflow.
 */
export const listWorkflowsForContextSwitcher = query({
  args: {
    sessionId: v.string(),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflows = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", OBJECT_TYPE),
      )
      .collect();

    const normalizedSearch = args.search?.trim().toLowerCase();
    const filtered = workflows
      .filter((workflow) => workflow.status !== "archived")
      .filter((workflow) => {
        if (!normalizedSearch) {
          return true;
        }
        const haystack = `${workflow.name} ${workflow.description ?? ""}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, Math.max(1, Math.min(args.limit ?? 50, 200)));

    const workflowIds = filtered.map((workflow) => workflow._id as Id<"objects">);
    const conversationCounts = await (ctx as any).runQuery(
      generatedApi.internal.ai.conversations.listActiveConversationCountsByWorkflow,
      {
        organizationId,
        workflowIds,
      },
    );
    const activeConversationCountByWorkflowId = new Map<string, number>(
      (conversationCounts as Array<{ layerWorkflowId: Id<"objects">; activeConversationCount: number }>).map(
        (entry) => [entry.layerWorkflowId, entry.activeConversationCount],
      ),
    );

    return filtered.map((workflow) => {
      const workflowData = (workflow.customProperties as LayerWorkflowData | undefined) ?? {
        nodes: [],
        edges: [],
        metadata: {
          isActive: false,
          mode: "design",
          runCount: 0,
          version: 1,
        },
        triggers: [],
      };
      const aiChatNode = workflowData.nodes.find((node) => node.type === LAYERED_CONTEXT_CHAT_NODE_TYPE);
      const aiChatPromptRaw = aiChatNode
        ? (((aiChatNode.config?.systemPrompt ?? aiChatNode.config?.prompt) as string | undefined) ?? "")
        : "";
      const aiChatPromptPreview =
        aiChatPromptRaw.length > 180
          ? `${aiChatPromptRaw.slice(0, 177)}...`
          : aiChatPromptRaw || undefined;

      return {
        _id: workflow._id,
        name: workflow.name,
        status: workflow.status,
        mode: workflowData.metadata?.mode ?? "design",
        nodeCount: workflowData.nodes.length,
        edgeCount: workflowData.edges.length,
        hasAiChatNode: Boolean(aiChatNode),
        aiChatPromptPreview,
        updatedAt: workflow.updatedAt,
        activeConversationCount:
          activeConversationCountByWorkflowId.get(workflow._id) ?? 0,
      };
    });
  },
});

/**
 * Full layered context bundle for runtime chat injection.
 * Tier 1: workflow summary + recent executions.
 * Tier 2: AI chat node config + connected input/output node surfaces.
 */
export const getLayeredContextBundle = query({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
    recentExecutionLimit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<LayeredContextBundle> => {
    const { organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== OBJECT_TYPE || workflow.organizationId !== organizationId) {
      throw new Error("Workflow not found");
    }
    return await buildLayeredContextBundleForWorkflow({
      ctx,
      workflow,
      organizationId,
      recentExecutionLimit: args.recentExecutionLimit,
    });
  },
});

export const internalGetLayeredContextBundle = internalQuery({
  args: {
    workflowId: v.id("objects"),
    organizationId: v.id("organizations"),
    recentExecutionLimit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<LayeredContextBundle | null> => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== OBJECT_TYPE || workflow.organizationId !== args.organizationId) {
      return null;
    }

    return await buildLayeredContextBundleForWorkflow({
      ctx,
      workflow,
      organizationId: args.organizationId,
      recentExecutionLimit: args.recentExecutionLimit,
    });
  },
});

/**
 * Get a single workflow with full data
 */
export const getWorkflow = query({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== OBJECT_TYPE) {
      throw new Error("Workflow not found");
    }
    if (workflow.organizationId !== organizationId) {
      throw new Error("Access denied");
    }

    return workflow;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new workflow
 */
export const createWorkflow = mutation({
  args: {
    sessionId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    templateId: v.optional(v.string()),
    projectId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const initialData: LayerWorkflowData = {
      nodes: [],
      edges: [],
      metadata: {
        description: args.description,
        templateId: args.templateId,
        isActive: false,
        mode: "design",
        runCount: 0,
        version: 1,
      },
      triggers: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      projectId: args.projectId,
    };

    const now = Date.now();
    const workflowId = await ctx.db.insert("objects", {
      organizationId,
      type: OBJECT_TYPE,
      subtype: args.templateId ? "template_clone" : "workflow",
      name: args.name,
      description: args.description,
      status: "draft",
      customProperties: initialData as unknown as Record<string, unknown>,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Audit action
    await ctx.db.insert("objectActions", {
      organizationId,
      objectId: workflowId,
      actionType: "create",
      actionData: { source: "layers", templateId: args.templateId },
      performedBy: userId,
      performedAt: now,
    });

    // Auto-capture into project file system if projectId is set
    if (args.projectId) {
      await (ctx as any).runMutation(generatedApi.internal.projectFileSystemInternal.captureLayerWorkflow, {
        projectId: args.projectId,
        layerWorkflowId: workflowId,
      });
    }

    return workflowId;
  },
});

/**
 * Save workflow canvas state (nodes, edges, viewport)
 */
export const saveWorkflow = mutation({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    nodes: v.any(),    // WorkflowNode[] - flexible for canvas data
    edges: v.any(),    // WorkflowEdge[] - flexible for canvas data
    triggers: v.optional(v.any()), // TriggerConfig[]
    viewport: v.optional(v.object({
      x: v.number(),
      y: v.number(),
      zoom: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== OBJECT_TYPE) {
      throw new Error("Workflow not found");
    }
    if (workflow.organizationId !== organizationId) {
      throw new Error("Access denied");
    }

    const existingData = (workflow.customProperties ?? {}) as unknown as LayerWorkflowData;
    const now = Date.now();

    const incomingNodes = Array.isArray(args.nodes) ? args.nodes : [];
    const lcAiChatNodeIds = incomingNodes
      .filter(
        (node) =>
          typeof node === "object" &&
          node !== null &&
          (node as { type?: unknown }).type === LAYERED_CONTEXT_CHAT_NODE_TYPE,
      )
      .map((node) => {
        const nodeId = (node as { id?: unknown }).id;
        return typeof nodeId === "string" ? nodeId : "unknown";
      });

    if (lcAiChatNodeIds.length > 1) {
      throw new ConvexError({
        code: "LAYER_SINGLETON_VIOLATION",
        message: "Only one lc_ai_chat node is allowed per workflow.",
        nodeType: LAYERED_CONTEXT_CHAT_NODE_TYPE,
        maxAllowed: 1,
        found: lcAiChatNodeIds.length,
        nodeIds: lcAiChatNodeIds,
        workflowId: args.workflowId,
      });
    }

    const updatedData: LayerWorkflowData = {
      ...existingData,
      nodes: args.nodes,
      edges: args.edges,
      triggers: args.triggers ?? existingData.triggers,
      viewport: args.viewport ?? existingData.viewport,
      metadata: {
        ...existingData.metadata,
        description: args.description ?? existingData.metadata?.description,
        version: (existingData.metadata?.version ?? 0) + 1,
      },
    };

    await ctx.db.patch(args.workflowId, {
      ...(args.name ? { name: args.name } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      customProperties: updatedData as unknown as Record<string, unknown>,
      updatedAt: now,
    });

    // Auto-capture into project file system if projectId is set
    const projectId = existingData.projectId;
    if (projectId) {
      await (ctx as any).runMutation(generatedApi.internal.projectFileSystemInternal.captureLayerWorkflow, {
        projectId: projectId as Id<"objects">,
        layerWorkflowId: args.workflowId,
      });
    }

    return { success: true, version: updatedData.metadata.version };
  },
});

/**
 * Assign or change the project associated with a workflow.
 * Updates customProperties.projectId and triggers file system capture.
 */
export const setWorkflowProject = mutation({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
    projectId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== OBJECT_TYPE) {
      throw new Error("Workflow not found");
    }
    if (workflow.organizationId !== organizationId) {
      throw new Error("Access denied");
    }

    const existingData = (workflow.customProperties ?? {}) as unknown as LayerWorkflowData;
    const oldProjectId = existingData.projectId;
    const now = Date.now();

    const updatedData: LayerWorkflowData = {
      ...existingData,
      projectId: args.projectId ?? undefined,
    };

    await ctx.db.patch(args.workflowId, {
      customProperties: updatedData as unknown as Record<string, unknown>,
      updatedAt: now,
    });

    // Remove capture from old project if changing
    if (oldProjectId && oldProjectId !== args.projectId) {
      await (ctx as any).runMutation(generatedApi.internal.projectFileSystemInternal.removeLayerCapture, {
        projectId: oldProjectId as Id<"objects">,
        layerWorkflowId: args.workflowId,
      });
    }

    // Capture into new project
    if (args.projectId) {
      await (ctx as any).runMutation(generatedApi.internal.projectFileSystemInternal.captureLayerWorkflow, {
        projectId: args.projectId,
        layerWorkflowId: args.workflowId,
      });
    }

    return { success: true };
  },
});

/**
 * Update workflow status (activate, pause, archive)
 */
export const updateWorkflowStatus = mutation({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
    status: v.union(
      v.literal("draft"),
      v.literal("ready"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("error"),
      v.literal("archived"),
    ),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== OBJECT_TYPE) {
      throw new Error("Workflow not found");
    }
    if (workflow.organizationId !== organizationId) {
      throw new Error("Access denied");
    }

    const existingData = (workflow.customProperties ?? {}) as unknown as LayerWorkflowData;
    const now = Date.now();

    const isActive = args.status === "active";

    await ctx.db.patch(args.workflowId, {
      status: args.status,
      customProperties: {
        ...existingData,
        metadata: {
          ...existingData.metadata,
          isActive,
          mode: isActive ? "live" : "design",
        },
      } as unknown as Record<string, unknown>,
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId,
      objectId: args.workflowId,
      actionType: `workflow_${args.status}`,
      actionData: { previousStatus: workflow.status },
      performedBy: userId,
      performedAt: now,
    });

    return { success: true };
  },
});

/**
 * Delete a workflow (soft delete via archive)
 */
export const deleteWorkflow = mutation({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== OBJECT_TYPE) {
      throw new Error("Workflow not found");
    }
    if (workflow.organizationId !== organizationId) {
      throw new Error("Access denied");
    }

    const now = Date.now();
    await ctx.db.patch(args.workflowId, {
      status: "archived",
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId,
      objectId: args.workflowId,
      actionType: "workflow_archived",
      performedBy: userId,
      performedAt: now,
    });

    return { success: true };
  },
});

/**
 * Clone a workflow (for template application or duplication)
 */
export const cloneWorkflow = mutation({
  args: {
    sessionId: v.string(),
    sourceWorkflowId: v.id("objects"),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const source = await ctx.db.get(args.sourceWorkflowId);
    if (!source || source.type !== OBJECT_TYPE) {
      throw new Error("Source workflow not found");
    }

    const sourceData = (source.customProperties ?? {}) as unknown as LayerWorkflowData;
    const now = Date.now();

    const cloneData: LayerWorkflowData = {
      ...sourceData,
      metadata: {
        ...sourceData.metadata,
        isActive: false,
        mode: "design",
        runCount: 0,
        lastRunAt: undefined,
        version: 1,
        templateId: source._id.toString(),
      },
    };

    const cloneId = await ctx.db.insert("objects", {
      organizationId,
      type: OBJECT_TYPE,
      subtype: "template_clone",
      name: args.newName,
      description: source.description,
      status: "draft",
      customProperties: cloneData as unknown as Record<string, unknown>,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Link clone to source
    await ctx.db.insert("objectLinks", {
      organizationId,
      fromObjectId: cloneId,
      toObjectId: args.sourceWorkflowId,
      linkType: "cloned_from",
      createdBy: userId,
      createdAt: now,
    });

    return cloneId;
  },
});

// ============================================================================
// INTERNAL QUERIES (for execution engine)
// ============================================================================

/**
 * Internal: get workflow for execution (no auth check)
 */
export const internalGetWorkflow = internalQuery({
  args: { workflowId: v.id("objects") },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== OBJECT_TYPE) {
      return null;
    }
    return workflow;
  },
});

/**
 * Internal: get normalized workflow graph for layered-context action execution.
 * Returns null if workflow is missing or not a layer workflow.
 */
export const internalGetWorkflowGraphForLayeredContextAction = internalQuery({
  args: { workflowId: v.id("objects") },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== OBJECT_TYPE) {
      return null;
    }

    const workflowData = (workflow.customProperties ?? {}) as unknown as LayerWorkflowData;
    const nodes = Array.isArray(workflowData.nodes) ? workflowData.nodes : [];
    const edges = Array.isArray(workflowData.edges) ? workflowData.edges : [];
    const aiChatNode = nodes.find((node) => node.type === LAYERED_CONTEXT_CHAT_NODE_TYPE);

    return {
      workflowId: workflow._id,
      organizationId: workflow.organizationId,
      workflowName: workflow.name,
      nodes,
      edges,
      aiChatNodeId: aiChatNode?.id,
    };
  },
});

/**
 * Internal: update run count after execution
 */
export const internalUpdateRunStats = internalMutation({
  args: {
    workflowId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== OBJECT_TYPE) return;

    const data = (workflow.customProperties ?? {}) as unknown as LayerWorkflowData;
    const now = Date.now();

    await ctx.db.patch(args.workflowId, {
      customProperties: {
        ...data,
        metadata: {
          ...data.metadata,
          runCount: (data.metadata?.runCount ?? 0) + 1,
          lastRunAt: now,
        },
      } as unknown as Record<string, unknown>,
      updatedAt: now,
    });
  },
});

// ============================================================================
// UPVOTES
// ============================================================================

/**
 * Upvote an unbuilt integration
 */
export const upvoteIntegration = mutation({
  args: {
    sessionId: v.string(),
    integrationType: v.string(),
    nodeType: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check if already upvoted
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "layer_integration_upvote")
      )
      .collect();

    const alreadyVoted = existing.find((e) => {
      const data = e.customProperties as Record<string, unknown>;
      return data?.nodeType === args.nodeType && e.createdBy === userId;
    });

    if (alreadyVoted) {
      return { success: true, alreadyVoted: true };
    }

    const now = Date.now();
    await ctx.db.insert("objects", {
      organizationId,
      type: "layer_integration_upvote",
      name: `Upvote: ${args.integrationType}`,
      status: "active",
      customProperties: {
        integrationType: args.integrationType,
        nodeType: args.nodeType,
      },
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, alreadyVoted: false };
  },
});

/**
 * Get upvote counts for integrations (for prioritization)
 */
export const getUpvoteCounts = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const upvotes = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "layer_integration_upvote"))
      .collect();

    // Aggregate by nodeType
    const counts: Record<string, { nodeType: string; integrationType: string; count: number }> = {};
    for (const upvote of upvotes) {
      const data = upvote.customProperties as Record<string, unknown>;
      const nodeType = data?.nodeType as string;
      if (!nodeType) continue;

      if (!counts[nodeType]) {
        counts[nodeType] = {
          nodeType,
          integrationType: (data?.integrationType as string) ?? nodeType,
          count: 0,
        };
      }
      counts[nodeType].count++;
    }

    return Object.values(counts).sort((a, b) => b.count - a.count);
  },
});
