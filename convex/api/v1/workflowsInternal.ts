/**
 * INTERNAL WORKFLOW EXECUTION
 *
 * Executes workflows triggered via API.
 * This orchestrates the entire registration flow including:
 * - Executing behaviors via behavior executor
 * - Creating transactions
 * - Generating tickets
 * - Sending emails
 * - Creating invoices (if employer billing)
 *
 * REFACTORED: Now uses internalAction instead of internalMutation
 * so it can call the behavior executor actions properly.
 */

import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

/**
 * EXECUTE WORKFLOW INTERNAL
 * Core workflow execution logic (ACTION - can call other actions)
 */
export const executeWorkflowInternal = internalAction({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"), // User who owns the API key
    trigger: v.string(),
    inputData: v.any(),
    webhookUrl: v.optional(v.string()),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      console.log(`🔥 Executing workflow for trigger: ${args.trigger}`);

      // Find matching workflow
      const workflows = (await ctx.runQuery(api.ontologyHelpers.getObjects, {
        organizationId: args.organizationId,
        type: "workflow",
      })) as Array<{
        _id: Id<"objects">;
        name: string;
        type: string;
        status?: string;
        customProperties?: {
          execution?: { triggerOn?: string; errorHandling?: "rollback" | "continue" | "notify" };
          behaviors?: Array<{
            type: string;
            config: Record<string, unknown>;
            priority: number;
            enabled: boolean;
          }>;
        };
      }>;

      const matchingWorkflow = workflows.find((w) => {
        const customProps = w.customProperties;
        const execution = customProps?.execution;
        return (
          execution?.triggerOn === args.trigger &&
          w.status === "active"
        );
      });

      if (!matchingWorkflow) {
        console.error(`❌ No active workflow found for trigger: ${args.trigger}`);
        return {
          success: false,
          error: `No active workflow found for trigger: ${args.trigger}`,
        };
      }

      console.log(`✅ Found workflow: ${matchingWorkflow.name}`);

      // Build execution context for behaviors
      // IMPORTANT: Spread all inputData so behaviors can access any field they need
      // (products, formId, metadata, etc.)
      const customProps = matchingWorkflow.customProperties as {
        behaviors: Array<{
          type: string;
          config: Record<string, unknown>;
          priority: number;
          enabled: boolean;
        }>;
        execution: {
          triggerOn: string;
          errorHandling: "rollback" | "continue" | "notify";
        };
      };

      const sessionId = `api_${Date.now()}`;

      const behaviorContext = {
        // Organization and session context
        organizationId: args.organizationId,
        sessionId,
        workflow: args.trigger.replace("_start", "").replace("_complete", ""),

        // Spread ALL input data from frontend
        // This allows behaviors to access: products[], formId, metadata, etc.
        ...args.inputData,

        // API-specific metadata
        webhookUrl: args.webhookUrl,
        apiTrigger: true,
        triggeredAt: Date.now(),
        triggeredBy: args.userId,
        performedBy: args.userId, // For behaviors that need a user context (guest registrations)
      };

      // Execute behaviors using the behavior executor
      console.log(`🔧 Executing ${customProps.behaviors.length} behaviors...`);

      const result = (await ctx.runAction(api.workflows.behaviorExecutor.executeBehaviors, {
        sessionId,
        organizationId: args.organizationId,
        behaviors: customProps.behaviors
          .filter(b => b.enabled)
          .map((b) => ({
            type: b.type,
            config: b.config,
            priority: b.priority,
          })),
        context: behaviorContext,
        continueOnError: customProps.execution.errorHandling !== "rollback",
        workflowId: matchingWorkflow._id as Id<"objects">,
        workflowName: matchingWorkflow.name,
      })) as {
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
        executionId?: unknown;
      };

      if (!result.success) {
        console.error(`❌ Workflow execution failed:`, result);
        return {
          success: false,
          error: "Workflow execution failed",
          behaviors: result.results,
          executedCount: result.executedCount,
          totalCount: result.totalCount,
          executionId: result.executionId,
        };
      }

      console.log(`✅ Workflow executed successfully`);

      // Extract results from behaviors
      // Behaviors should return their created IDs in the data field
      let transactionId = null;
      let ticketId = null;
      let invoiceId = null;

      for (const behaviorResult of result.results) {
        if (behaviorResult.data) {
          const data = behaviorResult.data as Record<string, unknown>;
          if (data.transactionId) transactionId = data.transactionId;
          if (data.ticketId) ticketId = data.ticketId;
          if (data.invoiceId) invoiceId = data.invoiceId;
        }
      }

      // Return success with IDs
      return {
        success: true,
        transactionId,
        ticketId,
        invoiceId,
        message: "Workflow executed successfully",
        behaviors: result.results,
        executedCount: result.executedCount,
        totalCount: result.totalCount,
        executionId: result.executionId,
      };
    } catch (error) {
      console.error("❌ Workflow execution error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
