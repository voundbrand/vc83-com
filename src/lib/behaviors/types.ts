/**
 * UNIVERSAL BEHAVIOR SYSTEM - TYPE DEFINITIONS
 *
 * A behavior is ANY action/logic that can be triggered by ANY input:
 * - Form submissions ✅
 * - API calls ✅
 * - AI agent tools ✅
 * - Database changes ✅
 * - Time-based triggers ✅
 * - Webhooks ✅
 *
 * Think of behaviors as the "actions" or "tools" available to:
 * - AI agents (like Claude)
 * - Workflows
 * - Forms
 * - APIs
 * - Automation systems
 */

import { Id } from "../../../convex/_generated/dataModel";

// ============================================================================
// INPUT SOURCES (What triggers behaviors?)
// ============================================================================

export type InputSourceType =
  | "form" 
  | "api" 
  | "database"
  | "time" 
  | "webhook" 
  | "user_action"
  | "agent_decision" // 🤖 AI agent
  | "event"
  | "manual";

export interface InputSource {
  type: InputSourceType;
  inputId?: string;
  sourceObjectId?: Id<"objects">;
  sourceObjectType?: string;
  data: Record<string, unknown>;
  metadata?: {
    timestamp: number;
    submittedBy?: string;
    ipAddress?: string;
    userAgent?: string;
    source?: string;
  };
}

// ============================================================================
// BEHAVIOR CONFIGURATION
// ============================================================================

export interface Behavior<TConfig = Record<string, unknown>> {
  type: string;
  config: TConfig;
  priority?: number;
  enabled?: boolean;
  triggers?: {
    inputTypes?: InputSourceType[];
    objectTypes?: string[];
    workflows?: string[];
  };
}

// ============================================================================
// BEHAVIOR CONTEXT
// ============================================================================

export interface BehaviorContext {
  organizationId: Id<"organizations">;
  sessionId?: string;
  workflow: string;
  objects: Array<{
    objectId: Id<"objects">;
    objectType: string;
    quantity?: number;
    data?: Record<string, unknown>;
  }>;
  inputs?: InputSource[];
  actor?: {
    type: "user" | "agent" | "system" | "external";
    id?: Id<"users"> | string;
    email?: string;
    name?: string;
    metadata?: Record<string, unknown>;
  };
  workflowData?: Record<string, unknown>;
  behaviorData?: Record<string, unknown>;
  capabilities?: Record<string, boolean>;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// BEHAVIOR HANDLER
// ============================================================================

export interface ValidationError {
  field?: string;
  message: string;
  code?: string;
  severity?: "error" | "warning" | "info";
}

export interface BehaviorAction {
  type: string;
  payload: Record<string, unknown>;
  priority?: number;
  when?: "immediate" | "deferred" | "scheduled" | "after_customer_info" | "after_payment" | "on_confirmation";
  scheduledFor?: number;
}

export interface BehaviorResult<TData = unknown> {
  success: boolean;
  skipped?: boolean;
  data?: TData | null;
  errors?: string[];
  modifiedContext?: Partial<BehaviorContext>;
  warnings?: string[];
  actions?: BehaviorAction[];
  metadata?: Record<string, unknown>;
}

export interface BehaviorHandler<
  TConfig = unknown,
  TExtracted = unknown,
  TResult = unknown
> {
  readonly type: string;
  readonly name: string;
  readonly description: string;
  readonly category?: "data" | "action" | "validation" | "notification" | "integration" | "automation";
  readonly supportedInputTypes?: InputSourceType[];
  readonly supportedObjectTypes?: string[];
  readonly supportedWorkflows?: string[];
  readonly requiredCapabilities?: string[];

  extract: (
    config: TConfig,
    inputs: InputSource[],
    context: Readonly<BehaviorContext>
  ) => TExtracted | null;

  apply: (
    config: TConfig,
    extracted: TExtracted,
    context: Readonly<BehaviorContext>
  ) => BehaviorResult<TResult> | Promise<BehaviorResult<TResult>>;

  validate: (
    config: TConfig,
    context?: Partial<BehaviorContext>
  ) => ValidationError[];
}

// ============================================================================
// EXECUTION RESULTS
// ============================================================================

export interface BehaviorExecutionResult {
  success: boolean;
  results: Array<{ type: string; result: BehaviorResult }>;
  finalContext: BehaviorContext;
  errors: string[];
  warnings?: string[];
  actions?: BehaviorAction[];
  workflowId?: string; // Optional workflow that generated these behaviors
  behaviors?: Behavior[]; // Optional behaviors to be executed
}

// ============================================================================
// OBJECT INTEGRATION
// ============================================================================

export interface ObjectWithBehaviors {
  _id: Id<"objects">;
  type: string;
  subtype?: string;
  name: string;
  customProperties?: {
    behaviors?: Behavior[];
    [key: string]: unknown;
  };
}
