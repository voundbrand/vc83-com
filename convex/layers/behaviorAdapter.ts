/**
 * BEHAVIOR ADAPTER LAYER
 *
 * Bridges the new Layers graph execution engine to the existing behaviorExecutor.
 * LC Native nodes delegate execution through this adapter, which:
 *
 * 1. Translates LayersNodeConfig → BehaviorParams (input)
 * 2. Calls existing behaviorExecutor.executeBehavior
 * 3. Translates BehaviorResult → LayersNodeOutput (output)
 *
 * This preserves all existing behavior implementations, credit deduction,
 * and licensing logic without modification.
 *
 * Mapped behaviors:
 * - lc_crm         → create-contact, detect-employer-billing
 * - lc_email       → send-confirmation-email, send-admin-notification
 * - lc_invoicing   → generate-invoice, consolidated-invoice-generation
 * - lc_checkout    → create-transaction, calculate-pricing
 * - lc_tickets     → create-ticket
 * - lc_forms       → create-form-response, validate-registration
 * - lc_events      → check-event-capacity, update-statistics
 * - lc_activecampaign_sync → activecampaign-sync
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import type {
  WorkflowNode,
  ExecutionContext,
  NodeExecutionResult,
} from "./types";

// ============================================================================
// BEHAVIOR MAPPING
// ============================================================================

/**
 * Maps a Layers node type + action to the corresponding behavior type
 * in the existing behaviorExecutor.
 */
export function resolveBehaviorType(nodeType: string, action: string): string | null {
  const mappings: Record<string, Record<string, string>> = {
    lc_crm: {
      "create-contact": "create-contact",
      "detect-employer-billing": "detect-employer-billing",
    },
    lc_forms: {
      "create-form-response": "create-form-response",
      "validate-registration": "validate-registration",
    },
    lc_invoicing: {
      "generate-invoice": "generate-invoice",
      "consolidated-invoice-generation": "consolidated-invoice-generation",
    },
    lc_checkout: {
      "create-transaction": "create-transaction",
      "calculate-pricing": "calculate-pricing",
    },
    lc_tickets: {
      "create-ticket": "create-ticket",
    },
    lc_events: {
      "check-event-capacity": "check-event-capacity",
      "update-statistics": "update-statistics",
    },
    lc_email: {
      "send-confirmation-email": "send-confirmation-email",
      "send-admin-notification": "send-admin-notification",
    },
    lc_activecampaign_sync: {
      "activecampaign-sync": "activecampaign-sync",
    },
  };

  return mappings[nodeType]?.[action] ?? null;
}

/**
 * Translates Layers node config + input data into behavior-compatible params.
 * The existing behaviorExecutor expects:
 *   - config: behavior-specific config object
 *   - context: shared workflow context
 */
export function translateToBehaviorParams(
  node: WorkflowNode,
  inputData: Record<string, unknown>,
): { config: Record<string, unknown>; context: Record<string, unknown> } {
  // Node config contains action-specific settings from the inspector
  const config = { ...node.config };

  // Input data from upstream nodes becomes the "context" for the behavior
  // The existing behaviorExecutor uses flat context merge
  const context = { ...inputData };

  return { config, context };
}

/**
 * Translates behavior result back to Layers NodeExecutionResult format.
 */
export function translateFromBehaviorResult(
  behaviorResult: {
    success: boolean;
    error?: string;
    message?: string;
    data?: unknown;
  }
): NodeExecutionResult {
  return {
    success: behaviorResult.success,
    outputData: behaviorResult.data as Record<string, unknown> | undefined,
    error: behaviorResult.error ?? behaviorResult.message,
    retryable: false, // Existing behaviors don't have retry semantics
    activeOutputs: behaviorResult.success ? ["output"] : undefined,
  };
}

// ============================================================================
// EXECUTION ACTION
// ============================================================================

/**
 * Execute an LC Native node by delegating to the existing behaviorExecutor.
 *
 * This is called by the graph execution engine when processing LC Native nodes.
 */
export const executeLcNativeNode = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    nodeType: v.string(),
    nodeConfig: v.any(),     // WorkflowNode config
    inputData: v.any(),      // Data from upstream nodes
  },
  handler: async (ctx, args): Promise<NodeExecutionResult> => {
    const startTime = Date.now();

    // Resolve the behavior type from node config
    const action = (args.nodeConfig as Record<string, unknown>)?.action as string;
    if (!action) {
      return {
        success: false,
        error: "No action specified in node configuration",
        durationMs: Date.now() - startTime,
      };
    }

    const behaviorType = resolveBehaviorType(args.nodeType, action);
    if (!behaviorType) {
      return {
        success: false,
        error: `No behavior mapping for ${args.nodeType}.${action}`,
        durationMs: Date.now() - startTime,
      };
    }

    // Translate to behavior params
    const nodeStub: WorkflowNode = {
      id: "adapter",
      type: args.nodeType,
      position: { x: 0, y: 0 },
      config: args.nodeConfig as Record<string, unknown>,
      status: "active",
    };

    const { config, context } = translateToBehaviorParams(
      nodeStub,
      (args.inputData ?? {}) as Record<string, unknown>,
    );

    // Delegate to existing behaviorExecutor
    const behaviorResult = await ctx.runAction(
      api.workflows.behaviorExecutor.executeBehavior,
      {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
        behaviorType,
        config,
        context,
      }
    );

    // Translate result back
    const result = translateFromBehaviorResult(behaviorResult);
    result.durationMs = Date.now() - startTime;

    return result;
  },
});
