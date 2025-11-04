/**
 * BEHAVIOR EXECUTION ENGINE
 *
 * Core engine for executing behaviors with:
 * - Priority-based execution order
 * - Context mutation tracking
 * - Error handling and recovery
 * - Action aggregation
 * - Performance monitoring
 */

import {
  Behavior,
  BehaviorContext,
  BehaviorExecutionResult,
  BehaviorHandler,
  BehaviorAction,
  InputSource,
} from "./types";
import { behaviorRegistry } from "./index";

/**
 * Execute behaviors in priority order
 *
 * @param behaviors - List of behaviors to execute
 * @param initialContext - Initial execution context
 * @returns Execution results with final context
 */
export async function executeBehaviors(
  behaviors: Behavior[],
  initialContext: BehaviorContext
): Promise<BehaviorExecutionResult> {
  console.log("🚀 [Engine] Starting execution with behaviors:", behaviors.length);
  console.log("🚀 [Engine] Behavior types:", behaviors.map(b => b.type));

  // Sort behaviors by priority (higher priority first)
  const sortedBehaviors = [...behaviors]
    .filter((b) => b.enabled !== false)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  console.log("🚀 [Engine] After sorting/filtering:", sortedBehaviors.length);
  console.log("🚀 [Engine] Sorted order:", sortedBehaviors.map(b => `${b.type} (${b.priority})`));

  const results: Array<{ type: string; result: any }> = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const actions: BehaviorAction[] = [];
  let currentContext = { ...initialContext };

  // Execute each behavior in order
  for (const behavior of sortedBehaviors) {
    try {
      console.log(`🔍 [Engine] Looking up handler for: ${behavior.type}`);
      const handler = behaviorRegistry.get(behavior.type);
      console.log(`🔍 [Engine] Handler found for ${behavior.type}:`, !!handler);
      if (!handler) {
        console.log(`❌ [Engine] Handler NOT found for: ${behavior.type}`);
        console.log(`📋 [Engine] Available handlers:`, behaviorRegistry.getTypes());
        errors.push(`Behavior handler not found: ${behavior.type}`);
        continue;
      }

      // Check if behavior should execute based on triggers
      const shouldExecute = shouldExecuteBehavior(behavior, currentContext);
      console.log(`🔍 [Engine] Checking ${behavior.type}:`, {
        shouldExecute,
        triggers: behavior.triggers,
        hasInputs: !!currentContext.inputs?.length,
        inputTypes: currentContext.inputs?.map(i => i.type),
        objectTypes: currentContext.objects.map(o => o.objectType),
        workflow: currentContext.workflow,
      });

      if (!shouldExecute) {
        console.log(`⏭️ [Engine] Skipping ${behavior.type} due to trigger mismatch`);
        results.push({
          type: behavior.type,
          result: { success: true, skipped: true },
        });
        continue;
      }

      // Validate configuration
      const validationErrors = handler.validate(behavior.config, currentContext);
      if (validationErrors.length > 0) {
        const errorMessages = validationErrors.map(
          (e) => `${behavior.type}: ${e.message}`
        );
        errors.push(...errorMessages);
        results.push({
          type: behavior.type,
          result: { success: false, errors: errorMessages },
        });
        continue;
      }

      // Extract data from inputs
      const inputs = currentContext.inputs || [];
      const extracted = handler.extract(behavior.config, inputs, currentContext);

      if (!extracted) {
        results.push({
          type: behavior.type,
          result: { success: true, skipped: true },
        });
        continue;
      }

      // Apply behavior
      const result = await handler.apply(behavior.config, extracted, currentContext);
      results.push({ type: behavior.type, result });

      // Track execution status
      if (!result.success) {
        errors.push(...(result.errors || []));
      }
      if (result.warnings) {
        warnings.push(...result.warnings);
      }
      if (result.actions) {
        actions.push(...result.actions);
      }

      // Update context if behavior modified it
      if (result.modifiedContext) {
        currentContext = {
          ...currentContext,
          ...result.modifiedContext,
          behaviorData: {
            ...currentContext.behaviorData,
            ...result.modifiedContext.behaviorData,
            [behavior.type]: result.data,
          },
        };
      }
    } catch (error) {
      const errorMessage = `Error executing ${behavior.type}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      errors.push(errorMessage);
      results.push({
        type: behavior.type,
        result: { success: false, errors: [errorMessage] },
      });
    }
  }

  return {
    success: errors.length === 0,
    results,
    finalContext: currentContext,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
    actions: actions.length > 0 ? actions : undefined,
  };
}

/**
 * Check if a behavior should execute based on its triggers
 */
function shouldExecuteBehavior(
  behavior: Behavior,
  context: BehaviorContext
): boolean {
  if (!behavior.triggers) return true;

  const { inputTypes, objectTypes, workflows } = behavior.triggers;

  // Check input type triggers
  if (inputTypes && inputTypes.length > 0) {
    const hasMatchingInput = context.inputs?.some((input) =>
      inputTypes.includes(input.type)
    );
    if (!hasMatchingInput) return false;
  }

  // Check object type triggers
  if (objectTypes && objectTypes.length > 0) {
    const hasMatchingObject = context.objects.some((obj) =>
      objectTypes.includes(obj.objectType)
    );
    if (!hasMatchingObject) return false;
  }

  // Check workflow triggers
  if (workflows && workflows.length > 0) {
    if (!workflows.includes(context.workflow)) return false;
  }

  return true;
}

/**
 * Extract behaviors from objects
 *
 * @param objects - Objects to extract behaviors from
 * @returns Flat list of all behaviors
 */
export function extractBehaviorsFromObjects(
  objects: Array<{ customProperties?: { behaviors?: Behavior[] } }>
): Behavior[] {
  const behaviors: Behavior[] = [];

  for (const obj of objects) {
    const objBehaviors = obj.customProperties?.behaviors;
    if (Array.isArray(objBehaviors)) {
      behaviors.push(...objBehaviors);
    }
  }

  return behaviors;
}

/**
 * Create input source from form responses
 */
export function createInputSourceFromForm(
  formId: string,
  responses: Record<string, unknown>,
  productId: string,
  ticketNumber: number
): InputSource {
  return {
    type: "form",
    inputId: formId,
    sourceObjectId: productId as any,
    sourceObjectType: "product",
    data: {
      ...responses,
      _formId: formId,
      _ticketNumber: ticketNumber,
    },
    metadata: {
      timestamp: Date.now(),
    },
  };
}
