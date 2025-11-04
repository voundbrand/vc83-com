/**
 * CHECKOUT-SPECIFIC BEHAVIOR INTEGRATION
 *
 * Provides React-friendly hooks and utilities for integrating
 * the behavior system into checkout components.
 */

import { useMemo } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  BehaviorContext,
  BehaviorExecutionResult,
  InputSource,
  Behavior,
} from "../types";
import {
  executeBehaviors,
  extractBehaviorsFromObjects,
  createInputSourceFromForm,
} from "../engine";

/**
 * Checkout-specific context for behavior execution
 */
export interface CheckoutBehaviorContext {
  organizationId: Id<"organizations">;
  sessionId?: string;
  selectedProducts: Array<{
    productId: Id<"objects">;
    quantity: number;
    price: number;
  }>;
  linkedProducts: Array<{
    _id: string | Id<"objects">;
    type: string;
    subtype?: string;
    name: string;
    customProperties?: unknown;
  }>;
  formResponses?: Array<{
    productId: Id<"objects">;
    ticketNumber: number;
    formId: string;
    responses: Record<string, unknown>;
    addedCosts: number;
    submittedAt: number;
  }>;
  customerInfo?: {
    email: string;
    name: string;
    phone?: string;
    transactionType?: "B2C" | "B2B";
    companyName?: string;
    vatNumber?: string;
    billingAddress?: {
      line1: string;
      line2?: string;
      city: string;
      state?: string;
      postalCode: string;
      country: string;
    };
  };
}

/**
 * Convert checkout context to universal behavior context
 */
export function toBehaviorContext(
  checkoutContext: CheckoutBehaviorContext
): BehaviorContext {
  // Create input sources from form responses
  const inputs: InputSource[] = [];
  if (checkoutContext.formResponses) {
    for (const formResponse of checkoutContext.formResponses) {
      inputs.push(
        createInputSourceFromForm(
          formResponse.formId,
          formResponse.responses,
          formResponse.productId,
          formResponse.ticketNumber
        )
      );
    }
  }

  // Build objects array
  const objects = checkoutContext.selectedProducts.map((sp) => {
    const fullProduct = checkoutContext.linkedProducts.find(
      (p) => p._id === sp.productId
    );
    return {
      objectId: sp.productId,
      objectType: fullProduct?.type || "product",
      quantity: sp.quantity,
      data: fullProduct?.customProperties as Record<string, unknown> | undefined,
    };
  });

  return {
    organizationId: checkoutContext.organizationId,
    sessionId: checkoutContext.sessionId,
    workflow: "checkout",
    objects,
    inputs,
    actor: checkoutContext.customerInfo
      ? {
          type: "user",
          email: checkoutContext.customerInfo.email,
          name: checkoutContext.customerInfo.name,
          metadata: {
            transactionType: checkoutContext.customerInfo.transactionType,
            companyName: checkoutContext.customerInfo.companyName,
            vatNumber: checkoutContext.customerInfo.vatNumber,
          },
        }
      : undefined,
    workflowData: {
      customerInfo: checkoutContext.customerInfo,
      totalPrice: checkoutContext.selectedProducts.reduce(
        (sum, sp) => sum + sp.price * sp.quantity,
        0
      ),
      formAddons: checkoutContext.formResponses?.reduce(
        (sum, fr) => sum + fr.addedCosts,
        0
      ),
    },
  };
}

/**
 * Execute all behaviors configured on checkout products
 *
 * NOTE: This function maintains backward compatibility with old product-based behaviors
 * while also supporting new standalone workflows. Prioritizes workflows over legacy behaviors.
 */
export async function executeCheckoutBehaviors(
  checkoutContext: CheckoutBehaviorContext,
  workflowBehaviors?: Behavior[] // Optional behaviors loaded from standalone workflows
): Promise<BehaviorExecutionResult> {
  let behaviors: Behavior[];

  console.log("🔍 [executeCheckoutBehaviors] workflowBehaviors:", workflowBehaviors?.length || 0);
  console.log("🔍 [executeCheckoutBehaviors] workflowBehaviors details:", workflowBehaviors?.map(b => ({ type: b.type, priority: b.priority })));

  // Use workflow behaviors if provided (new system)
  if (workflowBehaviors && workflowBehaviors.length > 0) {
    behaviors = workflowBehaviors;
    console.log("✅ [executeCheckoutBehaviors] Using workflow behaviors:", behaviors.length);
  } else {
    // Fallback to extracting behaviors from products (legacy system)
    console.log("⚠️ [executeCheckoutBehaviors] Falling back to legacy product behaviors");
    behaviors = extractBehaviorsFromObjects(
      checkoutContext.linkedProducts.map((p) => ({
        customProperties: p.customProperties as { behaviors?: Behavior[] } | undefined,
      }))
    );
  }

  // Convert to universal context
  const behaviorContext = toBehaviorContext(checkoutContext);

  // Execute behaviors
  return executeBehaviors(behaviors, behaviorContext);
}

/**
 * React hook for executing behaviors when checkout context changes
 */
export function useCheckoutBehaviors(
  checkoutContext: CheckoutBehaviorContext | null,
  enabled = true
) {
  return useMemo(() => {
    if (!checkoutContext || !enabled) {
      return {
        behaviors: [],
        context: null,
        execute: async () => ({
          success: true,
          results: [],
          finalContext: {} as BehaviorContext,
          errors: [],
        }),
      };
    }

    // Extract behaviors for inspection
    const behaviors = extractBehaviorsFromObjects(
      checkoutContext.linkedProducts.map((p) => ({
        customProperties: p.customProperties as { behaviors?: Behavior[] } | undefined,
      }))
    );

    // Create behavior context
    const context = toBehaviorContext(checkoutContext);

    // Return execution function
    return {
      behaviors,
      context,
      execute: () => executeCheckoutBehaviors(checkoutContext),
    };
  }, [checkoutContext, enabled]);
}

/**
 * Helper: Get employer billing info from behavior results
 */
export function getEmployerBillingFromResults(
  result: BehaviorExecutionResult
): Id<"objects"> | null {
  const employerResult = result.results.find((r) => r.type === "employer-detection");
  if (!employerResult?.result?.success) return null;

  const data = employerResult.result.data as { crmOrganizationId?: string } | undefined;
  return data?.crmOrganizationId as Id<"objects"> | null;
}

/**
 * Helper: Get invoice mapping from behavior results
 */
export function getInvoiceMappingFromResults(result: BehaviorExecutionResult): {
  shouldInvoice: boolean;
  employerOrgId: Id<"objects"> | null;
  paymentTerms?: "net30" | "net60" | "net90";
} {
  const mappingResult = result.results.find((r) => r.type === "invoice-mapping");
  if (!mappingResult?.result?.success) {
    return { shouldInvoice: false, employerOrgId: null };
  }

  const data = mappingResult.result.data as {
    crmOrganizationId?: string;
    paymentTerms?: "net30" | "net60" | "net90";
  } | undefined;

  return {
    shouldInvoice: true,
    employerOrgId: data?.crmOrganizationId as Id<"objects"> | null,
    paymentTerms: data?.paymentTerms,
  };
}

/**
 * Helper: Check if any behavior says to skip payment step
 *
 * Checks for:
 * 1. skip_payment_step action (new employer-detection behavior)
 * 2. skipPaymentStep data field (old invoice-payment behavior)
 */
export function shouldSkipPaymentStep(result: BehaviorExecutionResult): boolean {
  // Check all behavior results for skip_payment_step action
  for (const behaviorResult of result.results) {
    if (behaviorResult.result.actions) {
      const skipAction = behaviorResult.result.actions.find(
        (action) => action.type === "skip_payment_step"
      );
      if (skipAction) {
        console.log("✅ [shouldSkipPaymentStep] Found skip_payment_step action from", behaviorResult.type);
        return true;
      }
    }
  }

  // Fallback: Check old invoice-payment behavior data field
  const paymentResult = result.results.find((r) => r.type === "invoice-payment");
  if (paymentResult?.result?.success) {
    const data = paymentResult.result.data as {
      skipPaymentStep?: boolean;
    } | undefined;

    if (data?.skipPaymentStep === true) {
      console.log("✅ [shouldSkipPaymentStep] Found skipPaymentStep=true in invoice-payment data");
      return true;
    }
  }

  return false;
}

/**
 * Helper: Get add-on line items from behavior results
 */
export function getAddonsFromResults(result: BehaviorExecutionResult): {
  lineItems: Array<{
    id: string;
    name: string;
    description?: string;
    icon?: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
    currency: string;
    taxable: boolean;
    taxCode?: string;
  }>;
  totalAddonCost: number;
  currency: string;
} | null {
  const addonResult = result.results.find((r) => r.type === "addon-calculation" || r.type === "addon_calculation");
  if (!addonResult?.result?.success || addonResult.result.skipped) {
    return null;
  }

  const data = addonResult.result.data as {
    lineItems?: Array<{
      id: string;
      name: string;
      description?: string;
      icon?: string;
      quantity: number;
      pricePerUnit: number;
      totalPrice: number;
      currency: string;
      taxable: boolean;
      taxCode?: string;
    }>;
    totalAddonCost?: number;
    currency?: string;
  } | undefined;

  if (!data?.lineItems || data.lineItems.length === 0) {
    return null;
  }

  return {
    lineItems: data.lineItems,
    totalAddonCost: data.totalAddonCost || 0,
    currency: data.currency || "USD",
  };
}
