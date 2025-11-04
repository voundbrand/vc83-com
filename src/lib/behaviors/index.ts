/**
 * Universal Behavior Registry
 *
 * Central registry for all behaviors that can be triggered from ANY input source:
 * - Forms, APIs, AI agents, webhooks, cron jobs, database events
 *
 * Behaviors are registered by type and can be executed with any compatible input.
 * Results include actions to be executed by the system (not executed by behaviors).
 */

import type {
  Behavior,
  BehaviorHandler,
  BehaviorContext,
  BehaviorResult,
  BehaviorAction,
  ValidationError,
} from "./types";

/**
 * Universal Behavior Registry
 *
 * Manages registration and execution of behaviors across the entire system.
 * Behaviors can be triggered from ANY source and operate on ANY data.
 */
class BehaviorRegistry {
  private handlers = new Map<string, BehaviorHandler>();

  /**
   * Register a behavior handler
   *
   * @example
   * registry.register({
   *   type: "invoice_mapping",
   *   name: "Invoice Mapping",
   *   extract: (config, inputs, context) => {...},
   *   apply: (config, extracted, context) => {...},
   *   validate: (config) => {...}
   * });
   */
  register<TConfig = unknown, TExtracted = unknown, TResult = unknown>(
    handler: BehaviorHandler<TConfig, TExtracted, TResult>
  ): void {
    if (this.handlers.has(handler.type)) {
      console.warn(
        `Behavior handler "${handler.type}" is already registered. Overwriting.`
      );
    }
    this.handlers.set(handler.type, handler as BehaviorHandler);
  }

  /**
   * Get a registered behavior handler by type
   */
  get(type: string): BehaviorHandler | undefined {
    return this.handlers.get(type);
  }

  /**
   * Get all registered behavior types
   */
  getTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get all registered handlers
   */
  getAll(): BehaviorHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Validate a behavior configuration
   *
   * Runs the behavior's validate() method to check config validity.
   *
   * @returns Array of validation errors (empty if valid)
   */
  validate(behavior: Behavior): ValidationError[] {
    const handler = this.handlers.get(behavior.type);
    if (!handler) {
      return [
        {
          field: "type",
          code: "unknown_behavior",
          message: `Unknown behavior type: ${behavior.type}`,
        },
      ];
    }

    return handler.validate(behavior.config);
  }

  /**
   * Execute a single behavior
   *
   * 1. Gets the handler for the behavior type
   * 2. Validates the behavior config
   * 3. Extracts relevant data from inputs
   * 4. Applies the behavior logic
   * 5. Returns result with actions (does NOT execute actions!)
   *
   * @param behavior - The behavior to execute
   * @param context - Execution context (inputs, available data, metadata)
   * @returns Result with success/failure, data, and actions to execute
   */
  async execute(
    behavior: Behavior,
    context: BehaviorContext
  ): Promise<BehaviorResult> {
    // 1. Get handler
    const handler = this.handlers.get(behavior.type);
    if (!handler) {
      return {
        success: false,
        errors: [`No handler registered for behavior type: ${behavior.type}`],
      };
    }

    // 2. Validate config
    const validationErrors = handler.validate(behavior.config);
    if (validationErrors.length > 0) {
      return {
        success: false,
        errors: [
          `Behavior configuration is invalid: ${validationErrors.map((e) => e.message).join(", ")}`,
        ],
      };
    }

    try {
      // 3. Extract data from inputs
      const extracted = await handler.extract(
        behavior.config,
        context.inputs || [],
        context
      );

      // If extraction returns null, skip this behavior
      if (extracted === null) {
        return {
          success: true,
          skipped: true,
          data: null,
          actions: [],
        };
      }

      // 4. Apply behavior logic
      const result = await handler.apply(behavior.config, extracted, context);

      return {
        ...result,
        success: true,
      };
    } catch (error) {
      console.error(`Error executing behavior ${behavior.type}:`, error);
      return {
        success: false,
        errors: [
          error instanceof Error ? error.message : "Unknown error occurred",
        ],
      };
    }
  }

  /**
   * Execute multiple behaviors in sequence
   *
   * Behaviors are executed in order. Each behavior can modify the context
   * for subsequent behaviors. All actions are collected and returned together.
   *
   * @param behaviors - Array of behaviors to execute
   * @param initialContext - Starting context
   * @returns Combined result with all actions
   */
  async executeMany(
    behaviors: Behavior[],
    initialContext: BehaviorContext
  ): Promise<BehaviorResult> {
    const allActions: BehaviorAction[] = [];
    let currentContext = { ...initialContext };
    const results: Array<{ type: string; data: unknown }> = [];

    for (const behavior of behaviors) {
      const result = await this.execute(behavior, currentContext);

      // Stop on first failure
      if (!result.success) {
        return {
          success: false,
          errors: result.errors,
          actions: allActions, // Return actions collected so far
        };
      }

      // Skip if behavior was skipped
      if (result.skipped) {
        continue;
      }

      // Collect actions
      if (result.actions) {
        allActions.push(...result.actions);
      }

      // Update context for next behavior
      if (result.modifiedContext) {
        currentContext = {
          ...currentContext,
          ...result.modifiedContext,
        };
      }

      // Store result data
      results.push({
        type: behavior.type,
        data: result.data,
      });
    }

    return {
      success: true,
      data: results,
      actions: allActions,
      modifiedContext: currentContext,
    };
  }

  /**
   * Execute behaviors with action batching
   *
   * Groups actions by type and execution timing:
   * - immediate: execute right away
   * - deferred: execute after all behaviors complete
   * - scheduled: execute at specified time
   *
   * This is useful for optimizing performance (batch DB operations)
   * and ensuring correct execution order.
   */
  async executeManyWithBatching(
    behaviors: Behavior[],
    initialContext: BehaviorContext
  ): Promise<{
    result: BehaviorResult;
    batches: {
      immediate: BehaviorAction[];
      deferred: BehaviorAction[];
      scheduled: BehaviorAction[];
    };
  }> {
    const result = await this.executeMany(behaviors, initialContext);

    // Group actions by timing - only return the three main categories
    const batches: {
      immediate: BehaviorAction[];
      deferred: BehaviorAction[];
      scheduled: BehaviorAction[];
    } = {
      immediate: [],
      deferred: [],
      scheduled: [],
    };

    if (result.actions) {
      for (const action of result.actions) {
        const when = action.when || "immediate";
        // Map all timing types to one of the three main categories
        if (when === "deferred") {
          batches.deferred.push(action);
        } else if (when === "scheduled") {
          batches.scheduled.push(action);
        } else {
          // Default all other types (immediate, after_customer_info, after_payment, on_confirmation) to immediate
          batches.immediate.push(action);
        }
      }
    }

    return { result, batches };
  }

  /**
   * Clear all registered handlers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
  }
}

// Global registry instance
export const behaviorRegistry = new BehaviorRegistry();

// Export for creating additional registries (e.g., for testing)
export { BehaviorRegistry };

// ============================================================================
// AUTO-REGISTER CORE BEHAVIORS
// ============================================================================

import { invoiceMappingHandler } from "./handlers/invoice-mapping";
import { employerDetectionHandler } from "./handlers/employer-detection";
import { formLinkingHandler } from "./handlers/form-linking";
import { addonCalculationHandler } from "./handlers/addon-calculation";
import { paymentProviderSelectionHandler } from "./handlers/payment-provider-selection";
import { stripePaymentHandler } from "./handlers/stripe-payment";
import { invoicePaymentHandler } from "./handlers/invoice-payment";
import { taxCalculationHandler } from "./handlers/tax-calculation";
import { consolidatedInvoiceGenerationHandler } from "./handlers/consolidated-invoice-generation";

// Register core behaviors on module load
behaviorRegistry.register(invoiceMappingHandler);
behaviorRegistry.register(employerDetectionHandler);
behaviorRegistry.register(formLinkingHandler);
behaviorRegistry.register(addonCalculationHandler);
behaviorRegistry.register(paymentProviderSelectionHandler);
behaviorRegistry.register(stripePaymentHandler);
behaviorRegistry.register(invoicePaymentHandler);
behaviorRegistry.register(taxCalculationHandler);
behaviorRegistry.register(consolidatedInvoiceGenerationHandler);

/**
 * Helper: Register multiple handlers at once
 *
 * @example
 * registerBehaviors([
 *   invoiceMappingHandler,
 *   dataEnrichmentHandler,
 *   notificationHandler,
 * ]);
 */
export function registerBehaviors(handlers: BehaviorHandler[]): void {
  for (const handler of handlers) {
    behaviorRegistry.register(handler);
  }
}

/**
 * Helper: Execute behaviors from an object's customProperties
 *
 * Many objects in the ontology can have behaviors attached via customProperties.
 * This helper extracts and executes those behaviors.
 *
 * @example
 * const product = await ctx.db.get(productId);
 * const result = await executeBehaviorsFromObject(product, context);
 */
export async function executeBehaviorsFromObject(
  object: { customProperties?: Record<string, unknown> },
  context: BehaviorContext
): Promise<BehaviorResult> {
  const behaviors = (object.customProperties?.behaviors || []) as Behavior[];

  if (behaviors.length === 0) {
    return {
      success: true,
      data: null,
      actions: [],
    };
  }

  return behaviorRegistry.executeMany(behaviors, context);
}
