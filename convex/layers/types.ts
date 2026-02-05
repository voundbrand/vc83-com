/**
 * LAYERS TYPE DEFINITIONS
 *
 * Core types for the Layers visual automation canvas.
 * Covers: node definitions, edge definitions, workflow state,
 * execution engine interfaces, and data mapping.
 */

import { Id } from "../_generated/dataModel";

// ============================================================================
// NODE TYPES
// ============================================================================

/** Top-level node category */
export type NodeCategory = "integration" | "trigger" | "logic" | "lc_native";

/** Node lifecycle status */
export type NodeStatus =
  | "draft"        // Placed, not configured
  | "configuring"  // User setting up credentials/options
  | "ready"        // Configured, waiting for activation
  | "active"       // Running in live workflow
  | "error"        // Failed, needs attention
  | "disabled";    // Manually paused

/** Integration availability status (for tool chest display) */
export type IntegrationStatus =
  | "connected"    // OAuth/API key active and verified
  | "available"    // Integration built, credentials not yet provided
  | "coming_soon"; // Integration not yet built (upvotable)

/** Edge status */
export type EdgeStatus = "draft" | "active" | "error";

/** Workflow execution mode */
export type WorkflowMode = "design" | "test" | "live";

// ============================================================================
// NODE DEFINITIONS (for the registry / tool chest)
// ============================================================================

/** Handle definition on a node (input/output port) */
export interface HandleDefinition {
  id: string;
  type: "source" | "target";
  label: string;
  dataType?: string; // "any", "contact", "email", "payment", etc.
  required?: boolean;
}

/** Schema field for node configuration UI */
export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "boolean" | "json" | "credential" | "expression";
  required?: boolean;
  defaultValue?: unknown;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  description?: string;
}

/** Static definition of a node type in the registry */
export interface NodeDefinition {
  /** Unique identifier: e.g. "activecampaign", "lc_crm", "if_then" */
  type: string;
  /** Display name */
  name: string;
  /** Short description for tool chest */
  description: string;
  /** Category for tool chest grouping */
  category: NodeCategory;
  /** Sub-category within category: e.g. "crm", "email", "payments" */
  subcategory: string;
  /** Icon identifier (icon name or URL) */
  icon: string;
  /** Brand color for node card */
  color: string;
  /** Whether this integration is built or coming soon */
  integrationStatus: IntegrationStatus;
  /** Whether credentials/OAuth are required */
  requiresAuth: boolean;
  /** OAuth provider name (matches oauthConnections.provider) if applicable */
  oauthProvider?: string;
  /** Settings type in objects table if applicable */
  settingsType?: string;
  /** Input handles */
  inputs: HandleDefinition[];
  /** Output handles */
  outputs: HandleDefinition[];
  /** Configuration fields for the node inspector */
  configFields: ConfigField[];
  /** Behavior type(s) this maps to in the existing behaviorExecutor (LC native only) */
  behaviorTypes?: string[];
  /** Credits consumed per execution (default: 1) */
  creditCost?: number;
}

// ============================================================================
// WORKFLOW NODE & EDGE INSTANCES (stored in workflow data)
// ============================================================================

/** A node instance placed on the canvas */
export interface WorkflowNode {
  id: string;
  /** References NodeDefinition.type */
  type: string;
  /** Display position on canvas */
  position: { x: number; y: number };
  /** Node-specific configuration values */
  config: Record<string, unknown>;
  /** Current status */
  status: NodeStatus;
  /** Reference to stored credentials */
  credentialsRef?: {
    type: "oauth" | "settings" | "none";
    provider?: string;
    settingsType?: string;
  };
  /** Custom label override */
  label?: string;
  /** Execution metadata (populated at runtime) */
  lastExecutedAt?: number;
  lastResult?: "success" | "error" | "skipped";
  executionCount?: number;
}

/** An edge connecting two nodes */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  /** Per-edge field mapping: { targetField: "sourceField" | expression } */
  dataMapping?: Record<string, string>;
  /** Condition expression for conditional edges (if_then branches) */
  condition?: string;
  /** Edge status */
  status: EdgeStatus;
  /** Custom label */
  label?: string;
}

// ============================================================================
// WORKFLOW DEFINITION (stored in objects.customProperties)
// ============================================================================

/** Full workflow definition stored in the objects table */
export interface LayerWorkflowData {
  /** Canvas nodes */
  nodes: WorkflowNode[];
  /** Canvas edges */
  edges: WorkflowEdge[];
  /** Workflow metadata */
  metadata: {
    description?: string;
    templateId?: string;
    isActive: boolean;
    mode: WorkflowMode;
    lastRunAt?: number;
    runCount: number;
    version: number;
  };
  /** Trigger configuration (which triggers activate this workflow) */
  triggers: TriggerConfig[];
  /** Canvas viewport state for restore */
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  /** Optional project association for file system capture */
  projectId?: string;
}

/** Trigger configuration */
export interface TriggerConfig {
  /** Which trigger node this config belongs to */
  nodeId: string;
  /** Trigger type */
  triggerType: TriggerType;
  /** Trigger-specific settings */
  settings: Record<string, unknown>;
  /** Whether this trigger is enabled */
  enabled: boolean;
}

export type TriggerType =
  | "form_submitted"
  | "payment_received"
  | "booking_created"
  | "contact_created"
  | "contact_updated"
  | "webhook_received"
  | "schedule_cron"
  | "manual_trigger"
  | "email_received"
  | "chat_message_received";

// ============================================================================
// EXECUTION ENGINE TYPES
// ============================================================================

/** Execution context passed between nodes during graph traversal */
export interface ExecutionContext {
  /** Unique execution run ID */
  executionId: string;
  /** The workflow being executed */
  workflowId: Id<"objects">;
  /** Organization running the workflow */
  organizationId: Id<"organizations">;
  /** Session ID for auth context */
  sessionId: string;
  /** Data accumulated during execution (per-node outputs keyed by nodeId) */
  nodeOutputs: Record<string, unknown>;
  /** The trigger event data that started this execution */
  triggerData: Record<string, unknown>;
  /** Current execution mode */
  mode: WorkflowMode;
  /** Timestamp when execution started */
  startedAt: number;
}

/** Result of executing a single node */
export interface NodeExecutionResult {
  success: boolean;
  /** Output data from this node (passed to downstream nodes via edge mapping) */
  outputData?: Record<string, unknown>;
  /** Error details if failed */
  error?: string;
  /** Whether to retry this node */
  retryable?: boolean;
  /** Which output handle(s) to follow (for conditional branching) */
  activeOutputs?: string[];
  /** Execution duration in ms */
  durationMs?: number;
}

/** Interface that all node executors must implement */
export interface NodeExecutor {
  /** The node type this executor handles */
  nodeType: string;
  /** Execute the node with the given context */
  execute(
    node: WorkflowNode,
    inputData: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<NodeExecutionResult>;
  /** Validate node configuration before execution */
  validate?(node: WorkflowNode): { valid: boolean; errors?: string[] };
  /** Test the node in isolation */
  test?(
    node: WorkflowNode,
    sampleData: Record<string, unknown>
  ): Promise<NodeExecutionResult>;
}

// ============================================================================
// GRAPH ENGINE TYPES
// ============================================================================

/** Node in the execution DAG (internal engine representation) */
export interface DAGNode {
  id: string;
  /** Resolved dependencies (nodes that must complete before this one) */
  dependencies: string[];
  /** Downstream nodes */
  dependents: string[];
  /** Current execution state */
  state: "pending" | "running" | "completed" | "failed" | "skipped";
  /** The workflow node definition */
  workflowNode: WorkflowNode;
}

/** Execution plan produced by topological sort */
export interface ExecutionPlan {
  /** Ordered layers of nodes that can execute in parallel within each layer */
  layers: string[][];
  /** Total node count */
  totalNodes: number;
  /** Whether the graph has cycles (invalid) */
  hasCycles: boolean;
  /** Entry points (trigger nodes) */
  entryPoints: string[];
}

/** Per-edge data mapping resolution */
export interface ResolvedDataMapping {
  /** Source node ID */
  sourceNodeId: string;
  /** Target node ID */
  targetNodeId: string;
  /** Resolved field mappings: { targetField: resolvedValue } */
  resolvedFields: Record<string, unknown>;
}

// ============================================================================
// UPVOTE TYPES
// ============================================================================

/** Integration upvote stored in objects table */
export interface IntegrationUpvoteData {
  /** The integration type that was upvoted */
  integrationType: string;
  /** The node definition type */
  nodeType: string;
}
