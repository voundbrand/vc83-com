/**
 * WORKFLOW TEST EXECUTION
 *
 * Backend action for testing workflows with sample data.
 * Executes behaviors in sequence using REAL behavior implementations in DRY-RUN mode.
 * This ensures tests show exactly what would happen in production without persisting data.
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { api } from "../_generated/api";

interface BehaviorConfig {
  type: string;
  enabled: boolean;
  priority: number;
  config?: Record<string, unknown>;
  outputs?: string[];
}

interface ExecutionResult {
  behaviorId: string;
  behaviorType: string;
  status: "success" | "error" | "running";
  duration: number;
  input?: unknown;
  output?: unknown;
  error?: string;
  branch?: string; // Which branch was taken (for conditionals)
}

/**
 * TEST WORKFLOW
 *
 * Execute a workflow with test data and capture detailed results.
 * Does NOT persist results - purely for testing/debugging.
 */
export const testWorkflow = action({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
    testData: v.any(), // Input data for testing
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message?: string;
    results: ExecutionResult[];
    finalOutput?: unknown;
  }> => {
    console.log("🧪 [Test Mode] Starting workflow test execution:", {
      workflowId: args.workflowId,
      testDataKeys: Object.keys(args.testData as object || {}),
    });

    try {
      // Get workflow
      const workflow = await ctx.runQuery(api.workflows.workflowOntology.getWorkflow, {
        workflowId: args.workflowId,
        sessionId: args.sessionId,
      });
      if (!workflow) {
        throw new Error("Workflow not found");
      }

      // CHECK FEATURE ACCESS: Test mode requires Starter+
      const { internal } = await import("../_generated/api");
      await ctx.runQuery(internal.licensing.helpers.checkFeatureAccessInternal, {
        organizationId: workflow.organizationId,
        featureFlag: "testModeEnabled",
      });

      const customProps = workflow.customProperties as {
        behaviors?: Array<BehaviorConfig & { id: string }>;
        execution?: { triggerOn: string };
      };

      const behaviors = customProps?.behaviors || [];
      console.log(`🧪 [Test Mode] Found ${behaviors.length} behaviors to execute`);

      // Sort behaviors by priority (highest first)
      const sortedBehaviors = [...behaviors]
        .filter((b) => b.enabled)
        .sort((a, b) => b.priority - a.priority);

      console.log(`🧪 [Test Mode] Executing ${sortedBehaviors.length} enabled behaviors`);

      // Execute behaviors in sequence
      const results: ExecutionResult[] = [];
      let currentData = args.testData;

      for (const behavior of sortedBehaviors) {
        const startTime = Date.now();
        console.log(`🧪 [Test Mode] Executing: ${behavior.type} (priority: ${behavior.priority})`);

        try {
          // Execute behavior using REAL implementation in DRY-RUN mode
          const result = await ctx.runAction(api.workflows.behaviorExecutor.executeBehavior, {
            sessionId: args.sessionId,
            organizationId: workflow.organizationId,
            behaviorType: behavior.type,
            config: {
              ...behavior.config,
              dryRun: true, // CRITICAL: Tells behavior to simulate without persisting
            },
            context: {
              ...currentData,
              testMode: true, // Flag for logging/debugging
              workflowId: args.workflowId,
            },
          });

          const duration = Date.now() - startTime;

          results.push({
            behaviorId: behavior.id,
            behaviorType: behavior.type,
            status: result.success ? "success" : "error",
            duration,
            input: currentData,
            output: result.data, // Real behaviors return data in .data field
            error: result.error,
          });

          console.log(`🧪 [Test Mode] ✓ ${behavior.type} completed in ${duration}ms`, {
            success: result.success,
            message: result.message,
          });

          // Update current data for next step using real behavior output
          if (result.success && result.data !== undefined) {
            currentData = {
              ...currentData,
              ...result.data, // Merge behavior output into context
            };
          }

        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";

          console.error(`🧪 [Test Mode] ✗ ${behavior.type} failed:`, errorMessage);

          results.push({
            behaviorId: behavior.id,
            behaviorType: behavior.type,
            status: "error",
            duration,
            input: currentData,
            error: errorMessage,
          });

          // Continue or stop based on error handling
          // For test mode, we continue to show all errors
        }
      }

      const allSuccessful = results.every((r) => r.status === "success");

      console.log(`🧪 [Test Mode] Test execution complete:`, {
        total: results.length,
        successful: results.filter((r) => r.status === "success").length,
        failed: results.filter((r) => r.status === "error").length,
      });

      return {
        success: allSuccessful,
        message: allSuccessful
          ? `All ${results.length} behaviors executed successfully`
          : `${results.filter((r) => r.status === "error").length} of ${results.length} behaviors failed`,
        results,
        finalOutput: currentData,
      };
    } catch (error) {
      console.error("🧪 [Test Mode] Test execution failed:", error);

      return {
        success: false,
        message: error instanceof Error ? error.message : "Test execution failed",
        results: [],
      };
    }
  },
});

/**
 * NOTE: This file now uses REAL behavior implementations via behaviorExecutor.
 * The behaviors run in DRY-RUN mode (config.dryRun = true) which means:
 * - Real business logic executes
 * - No data is persisted to the database
 * - No external calls (emails, payments, etc.) are made
 * - Results show exactly what WOULD happen in production
 *
 * This eliminates the need for mock implementations and ensures tests reflect reality.
 */
