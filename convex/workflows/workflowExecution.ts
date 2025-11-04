/**
 * WORKFLOW EXECUTION
 *
 * Executes standalone workflows by loading behaviors and calling the behavior engine.
 * Workflows are loaded from the objects table and their behaviors are executed
 * in priority order with proper context management.
 */

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";
import { WorkflowCustomProperties, BehaviorDefinition } from "./workflowOntology";
import { Behavior, BehaviorContext, BehaviorExecutionResult, InputSourceType } from "../../src/lib/behaviors/types";

/**
 * Load workflow from objects table
 */
export async function loadWorkflow(
  ctx: QueryCtx | MutationCtx,
  workflowId: Id<"objects">
) {
  const workflow = await ctx.db.get(workflowId);
  if (!workflow || workflow.type !== "workflow") {
    throw new Error("Workflow not found");
  }

  if (workflow.status !== "active") {
    throw new Error(`Workflow is not active: ${workflow.status}`);
  }

  return workflow;
}

/**
 * Convert workflow behaviors to universal behavior format
 */
export function convertWorkflowBehaviors(
  behaviorDefinitions: BehaviorDefinition[]
): Behavior[] {
  return behaviorDefinitions.map((bd) => ({
    type: bd.type,
    config: bd.config,
    priority: bd.priority,
    enabled: bd.enabled,
    triggers: bd.triggers
      ? {
          inputTypes: bd.triggers.inputTypes as InputSourceType[],
          objectTypes: bd.triggers.objectTypes,
          workflows: bd.triggers.workflows,
        }
      : undefined,
  }));
}

/**
 * Validate workflow context has required inputs
 */
export function validateWorkflowContext(
  workflow: Doc<"objects">,
  context: BehaviorContext
): { valid: boolean; errors: string[] } {
  const customProps = workflow.customProperties as WorkflowCustomProperties;
  const errors: string[] = [];

  // Check required inputs
  if (customProps.execution.requiredInputs) {
    for (const requiredInput of customProps.execution.requiredInputs) {
      if (requiredInput === "form_responses" && (!context.inputs || context.inputs.length === 0)) {
        errors.push("Required input missing: form_responses");
      }
      if (requiredInput === "product_selection" && (!context.objects || context.objects.length === 0)) {
        errors.push("Required input missing: product_selection");
      }
    }
  }

  // Validate context workflow matches
  if (context.workflow !== customProps.execution.triggerOn.replace("_start", "")) {
    errors.push(
      `Context workflow mismatch: expected ${customProps.execution.triggerOn}, got ${context.workflow}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Execute a standalone workflow
 *
 * @param ctx - Database context
 * @param workflowId - ID of workflow to execute
 * @param context - Execution context
 * @returns Execution results
 */
export async function executeWorkflow(
  ctx: QueryCtx | MutationCtx,
  workflowId: Id<"objects">,
  context: BehaviorContext
): Promise<BehaviorExecutionResult> {
  // Load workflow
  const workflow = await loadWorkflow(ctx, workflowId);

  // Validate context
  const validation = validateWorkflowContext(workflow, context);
  if (!validation.valid) {
    return {
      success: false,
      results: [],
      finalContext: context,
      errors: validation.errors,
    };
  }

  // Extract and convert behaviors
  const customProps = workflow.customProperties as WorkflowCustomProperties;
  const behaviors = convertWorkflowBehaviors(customProps.behaviors);

  // Dynamic import to avoid circular dependencies
  // Note: In Convex, we need to handle this differently
  // For now, we'll pass behaviors to the engine directly
  return {
    success: true,
    results: [],
    finalContext: context,
    errors: [],
    workflowId: workflow._id,
    behaviors, // Return behaviors so they can be executed by the engine
  };
}

/**
 * Load workflows by trigger
 */
export async function loadWorkflowsByTrigger(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
  triggerOn: string
): Promise<Array<{ workflow: Doc<"objects">; behaviors: Behavior[] }>> {
  // Query active workflows
  const workflows = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", organizationId).eq("type", "workflow")
    )
    .collect();

  // Filter by trigger and active status
  const matchingWorkflows = workflows.filter((w) => {
    if (w.status !== "active") return false;
    const customProps = w.customProperties as WorkflowCustomProperties | undefined;
    return customProps?.execution?.triggerOn === triggerOn;
  });

  // Convert to executable format
  return matchingWorkflows.map((workflow) => {
    const customProps = workflow.customProperties as WorkflowCustomProperties;
    return {
      workflow,
      behaviors: convertWorkflowBehaviors(customProps.behaviors),
    };
  });
}

/**
 * Extract all behaviors from multiple workflows
 */
export function extractBehaviorsFromWorkflows(
  workflows: Array<{ workflow: Doc<"objects">; behaviors: Behavior[] }>
): Behavior[] {
  const allBehaviors: Behavior[] = [];

  for (const { behaviors } of workflows) {
    allBehaviors.push(...behaviors);
  }

  return allBehaviors;
}
