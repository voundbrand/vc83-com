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
      // Check behavior condition before execution (CONDITIONAL EXECUTION SUPPORT)
      if (args.config?.condition) {
        const conditionMet = evaluateCondition(args.config.condition, args.context);
        if (!conditionMet) {
          console.log(`⏭️ Skipping behavior ${args.behaviorType} - condition not met: ${args.config.condition}`);
          return {
            success: true,
            message: `Skipped - condition not met: ${args.config.condition}`,
            data: { skipped: true, reason: args.config.condition },
          };
        }
      }

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

        // Event Registration Behaviors (NEW!)
        case "validate-registration":
          return await ctx.runAction(
            api.workflows.behaviors.validateRegistration.executeValidateRegistration,
            {
              sessionId: args.sessionId,
              organizationId: args.organizationId,
              config: args.config,
              context: args.context,
            }
          );

        case "detect-employer-billing":
          return await ctx.runAction(
            api.workflows.behaviors.detectEmployerBilling.executeDetectEmployerBilling,
            {
              sessionId: args.sessionId,
              organizationId: args.organizationId,
              config: args.config,
              context: args.context,
            }
          );

        case "create-contact":
          return await ctx.runAction(
            api.workflows.behaviors.createContact.executeCreateContact,
            {
              sessionId: args.sessionId,
              organizationId: args.organizationId,
              config: args.config,
              context: args.context,
            }
          );

        case "create-ticket":
          return await ctx.runAction(
            api.workflows.behaviors.createTicket.executeCreateTicket,
            {
              sessionId: args.sessionId,
              organizationId: args.organizationId,
              config: args.config,
              context: args.context,
            }
          );

        case "create-transaction":
          return await ctx.runAction(
            api.workflows.behaviors.createTransaction.executeCreateTransaction,
            {
              sessionId: args.sessionId,
              organizationId: args.organizationId,
              config: args.config,
              context: args.context,
            }
          );

        case "generate-invoice":
          return await ctx.runAction(
            api.workflows.behaviors.generateInvoice.executeGenerateInvoice,
            {
              sessionId: args.sessionId,
              organizationId: args.organizationId,
              config: args.config,
              context: args.context,
            }
          );

        case "send-confirmation-email":
          return await ctx.runAction(
            api.workflows.behaviors.sendConfirmationEmail.executeSendConfirmationEmail,
            {
              sessionId: args.sessionId,
              organizationId: args.organizationId,
              config: args.config,
              context: args.context,
            }
          );

        case "check-event-capacity":
          return await ctx.runAction(
            api.workflows.behaviors.checkEventCapacity.executeCheckEventCapacity,
            {
              sessionId: args.sessionId,
              organizationId: args.organizationId,
              config: args.config,
              context: args.context,
            }
          );

        case "calculate-pricing":
          return await ctx.runAction(
            api.workflows.behaviors.calculatePricing.executeCalculatePricing,
            {
              sessionId: args.sessionId,
              organizationId: args.organizationId,
              config: args.config,
              context: args.context,
            }
          );

        case "create-form-response":
          return await ctx.runAction(
            api.workflows.behaviors.createFormResponse.executeCreateFormResponse,
            {
              sessionId: args.sessionId,
              organizationId: args.organizationId,
              config: args.config,
              context: args.context,
            }
          );

        case "update-statistics":
          return await ctx.runAction(
            api.workflows.behaviors.updateStatistics.executeUpdateStatistics,
            {
              sessionId: args.sessionId,
              organizationId: args.organizationId,
              config: args.config,
              context: args.context,
            }
          );

        case "send-admin-notification":
          return await ctx.runAction(
            api.workflows.behaviors.sendAdminNotification.executeSendAdminNotification,
            {
              sessionId: args.sessionId,
              organizationId: args.organizationId,
              config: args.config,
              context: args.context,
            }
          );

        // Checkout behaviors (client-side)
        case "employer-detection":
        case "invoice-mapping":
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
 * HELPER: Evaluate conditional expression
 * Supports simple conditions like "billingMethod === 'employer_invoice'"
 */
function evaluateCondition(condition: string, context: unknown): boolean {
  // Simple condition parser
  // Format: "field === 'value'" or "field !== 'value'"

  const contextObj = context as Record<string, unknown>;

  // Match patterns like: billingMethod === 'employer_invoice'
  const equalsMatch = condition.match(/^(\w+)\s*===\s*'([^']+)'$/);
  if (equalsMatch) {
    const [, field, value] = equalsMatch;
    return contextObj[field] === value;
  }

  // Match patterns like: billingMethod !== 'free'
  const notEqualsMatch = condition.match(/^(\w+)\s*!==\s*'([^']+)'$/);
  if (notEqualsMatch) {
    const [, field, value] = notEqualsMatch;
    return contextObj[field] !== value;
  }

  // Match boolean fields: isEmployerBilling
  if (condition.match(/^\w+$/)) {
    return !!contextObj[condition];
  }

  console.warn(`⚠️ Unknown condition format: ${condition}`);
  return false;
}

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

    // CRITICAL: Maintain a shared context that accumulates data from each behavior
    let sharedContext = args.context || {};

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
        context: sharedContext, // Use accumulated context
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

        // CRITICAL FIX: Merge behavior result data into shared context for next behavior
        // This ensures data flows between behaviors (e.g., transactionData from calculate-pricing
        // becomes available to create-transaction)
        if (result.data !== undefined) {
          sharedContext = {
            ...sharedContext,
            ...result.data as Record<string, unknown>,
          };
          console.log(`✓ Context updated with data from ${behavior.type}`);
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
