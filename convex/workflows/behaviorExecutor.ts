/**
 * BEHAVIOR EXECUTOR
 *
 * Central dispatcher for executing workflow behaviors.
 * Routes behavior execution to the appropriate backend action based on behavior type.
 *
 * This solves the dynamic import problem by using static dispatch.
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * Execute a single behavior action
 *
 * This is the main entry point for executing behaviors from workflows.
 * It routes to the appropriate backend action based on behavior type.
 */
export const executeBehavior = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    behaviorType: v.string(),
    config: v.any(), // Behavior-specific config - intentionally flexible for different behavior types
    context: v.optional(v.any()), // Workflow context - intentionally flexible for different workflows
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    message?: string;
    data?: unknown;
    actions?: Array<{ type: string; payload: unknown; priority?: number; when?: string }>;
  }> => {
    console.log(`🔧 Executing behavior: ${args.behaviorType}`);

    try {
      // Route to appropriate action based on behavior type
      switch (args.behaviorType) {
        case "consolidated-invoice-generation":
          return await ctx.runAction(
            api.workflows.behaviors.consolidatedInvoiceGeneration.executeConsolidatedInvoiceGeneration,
            {
              sessionId: args.sessionId,
              organizationId: args.organizationId,
              config: args.config,
            }
          );

        // Add more behavior types here as they're implemented
        case "employer-detection":
          // TODO: Implement employer detection action
          return {
            success: false,
            error: "Employer detection backend action not yet implemented",
            message: "This behavior runs client-side during checkout",
          };

        case "invoice-mapping":
          // TODO: Implement invoice mapping action
          return {
            success: false,
            error: "Invoice mapping backend action not yet implemented",
            message: "This behavior runs client-side during checkout",
          };

        case "form-linking":
        case "addon-calculation":
        case "payment-provider-selection":
        case "stripe-payment":
        case "invoice-payment":
        case "tax-calculation":
          // These behaviors run client-side during checkout flow
          return {
            success: false,
            error: `${args.behaviorType} is a client-side behavior`,
            message: "This behavior runs automatically during the checkout/form flow and cannot be manually triggered",
          };

        default:
          console.warn(`⚠️ Unknown behavior type: ${args.behaviorType}`);
          return {
            success: false,
            error: `Unknown behavior type: ${args.behaviorType}`,
            message: "Behavior type not recognized or not implemented as a backend action",
          };
      }
    } catch (error) {
      console.error(`❌ Behavior execution failed for ${args.behaviorType}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: `Failed to execute ${args.behaviorType}`,
      };
    }
  },
});

/**
 * Execute multiple behaviors in sequence
 *
 * Executes an array of behaviors in priority order.
 * Stops on first failure unless continueOnError is true.
 *
 * Now includes real-time execution logging to database.
 */
export const executeBehaviors = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    behaviors: v.array(
      v.object({
        type: v.string(),
        config: v.any(), // Behavior-specific config - intentionally flexible
        priority: v.optional(v.number()),
      })
    ),
    context: v.optional(v.any()), // Workflow context - intentionally flexible
    continueOnError: v.optional(v.boolean()),
    workflowId: v.optional(v.id("objects")),
    workflowName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    results: Array<{
      behaviorType: string;
      success: boolean;
      error?: string;
      message?: string;
      data?: unknown;
    }>;
    executedCount: number;
    totalCount: number;
    executionId?: Id<"workflowExecutionLogs">;
  }> => {
    console.log(`🔧 Executing ${args.behaviors.length} behaviors`);

    // Create execution log entry
    let executionId: Id<"workflowExecutionLogs"> | undefined;
    if (args.workflowId && args.workflowName) {
      try {
        executionId = await ctx.runMutation(internal.workflowExecutionLogs.createExecutionLog, {
          sessionId: args.sessionId,
          workflowId: args.workflowId,
          workflowName: args.workflowName,
        });

        await ctx.runMutation(internal.workflowExecutionLogs.addLogEntry, {
          executionId,
          level: "info",
          message: `🚀 Starting execution of ${args.behaviors.length} behaviors...`,
        });
      } catch (logError) {
        console.error("Failed to create execution log:", logError);
        // Continue even if logging fails
      }
    }

    // Sort by priority (highest first)
    const sortedBehaviors = [...args.behaviors].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const results: Array<{
      behaviorType: string;
      success: boolean;
      error?: string;
      message?: string;
      data?: unknown;
    }> = [];
    let allSuccess = true;

    for (const behavior of sortedBehaviors) {
      if (executionId) {
        await ctx.runMutation(internal.workflowExecutionLogs.addLogEntry, {
          executionId,
          level: "info",
          message: `▶️ Executing behavior: ${behavior.type}`,
        });
      }

      const result = await ctx.runAction(api.workflows.behaviorExecutor.executeBehavior, {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
        behaviorType: behavior.type,
        config: behavior.config,
        context: args.context,
      });

      results.push({
        behaviorType: behavior.type,
        ...result,
      });

      if (!result.success) {
        allSuccess = false;

        if (executionId) {
          await ctx.runMutation(internal.workflowExecutionLogs.addLogEntry, {
            executionId,
            level: "error",
            message: `❌ Behavior ${behavior.type} failed: ${result.error || 'Unknown error'}`,
          });
        }

        if (!args.continueOnError) {
          console.log(`⚠️ Stopping execution due to failure in ${behavior.type}`);
          break;
        }
      } else {
        if (executionId) {
          await ctx.runMutation(internal.workflowExecutionLogs.addLogEntry, {
            executionId,
            level: "success",
            message: `✅ Behavior ${behavior.type} completed successfully`,
          });
        }
      }
    }

    // Mark execution as complete
    if (executionId) {
      await ctx.runMutation(internal.workflowExecutionLogs.completeExecution, {
        executionId,
        status: allSuccess ? "success" : "failed",
        result: {
          success: allSuccess,
          executedCount: results.length,
          totalCount: args.behaviors.length,
          results,
        },
      });
    }

    return {
      success: allSuccess,
      results,
      executedCount: results.length,
      totalCount: args.behaviors.length,
      executionId,
    };
  },
});
