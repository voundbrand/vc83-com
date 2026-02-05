/**
 * CLIENT-FACING WORKFLOW EXECUTION
 *
 * Provides the action that the frontend Run button calls.
 * Handles auth, validates the workflow, and delegates to the
 * internal startExecution action in graphEngine.
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- avoids TS2589 deep type instantiation
const internal: any = require("../_generated/api").internal;

export const runWorkflow = action({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
    mode: v.union(v.literal("test"), v.literal("manual")),
    triggerData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Fetch workflow to get organizationId
    const workflow = await ctx.runQuery(
      internal.layers.layerWorkflowOntology.internalGetWorkflow,
      { workflowId: args.workflowId }
    );

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    // Delegate to internal execution engine
    const result = await ctx.runAction(
      internal.layers.graphEngine.startExecution,
      {
        workflowId: args.workflowId,
        organizationId: workflow.organizationId,
        sessionId: args.sessionId,
        triggerType: "manual_trigger",
        triggerData: args.triggerData ?? {},
        mode: args.mode,
        triggeredBy: undefined,
      }
    );

    return result;
  },
});
