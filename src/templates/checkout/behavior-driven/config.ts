/**
 * BEHAVIOR-DRIVEN CHECKOUT - CONFIGURATION
 *
 * Default configuration and step definitions for the checkout flow.
 */

import { CheckoutStep } from "./types";

/**
 * Default checkout configuration
 */
export const DEFAULT_CONFIG = {
  allowBackNavigation: true,
  showProgressBar: true,
  enableAutoSave: false,
  debugMode: false,
  executeBehaviorsOnStepChange: true,
  behaviorExecutionTiming: "eager" as const,
};

/**
 * Step progression logic
 *
 * Defines the normal flow and conditions for skipping steps
 */
export const STEP_ORDER: CheckoutStep[] = [
  "product-selection",
  "registration-form",
  "customer-info",
  "review-order",
  "payment",
  "confirmation",
];

/**
 * Get next step in checkout flow
 *
 * Can be modified by behavior results (e.g., skip payment if invoice)
 */
export function getNextStep(
  currentStep: CheckoutStep,
  behaviorResults?: {
    shouldSkipPayment?: boolean;
    customNextStep?: CheckoutStep;
  }
): CheckoutStep | null {
  // Allow behaviors to override step flow
  if (behaviorResults?.customNextStep) {
    return behaviorResults.customNextStep;
  }

  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex === STEP_ORDER.length - 1) {
    return null; // Already at last step or invalid step
  }

  let nextStep = STEP_ORDER[currentIndex + 1];

  // Skip payment step if invoice checkout
  if (nextStep === "payment" && behaviorResults?.shouldSkipPayment) {
    nextStep = "confirmation";
  }

  return nextStep;
}

/**
 * Get previous step in checkout flow
 */
export function getPreviousStep(currentStep: CheckoutStep): CheckoutStep | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  if (currentIndex <= 0) {
    return null; // Already at first step
  }

  return STEP_ORDER[currentIndex - 1];
}

/**
 * Get step title for display
 */
export function getStepTitle(step: CheckoutStep): string {
  const titles: Record<CheckoutStep, string> = {
    "product-selection": "Select Products",
    "registration-form": "Registration",
    "customer-info": "Your Information",
    "review-order": "Review Order",
    "payment": "Payment",
    "confirmation": "Confirmation",
  };

  return titles[step] || "Checkout";
}

/**
 * Get step number (for progress bar)
 */
export function getStepNumber(step: CheckoutStep): number {
  return STEP_ORDER.indexOf(step) + 1;
}

/**
 * Calculate progress percentage
 */
export function getProgressPercentage(step: CheckoutStep): number {
  const stepNumber = getStepNumber(step);
  const totalSteps = STEP_ORDER.length;
  return Math.round((stepNumber / totalSteps) * 100);
}

/**
 * Check if step is required based on product configuration
 */
export function isStepRequired(
  step: CheckoutStep,
  products: Array<{ customProperties?: { formId?: string } }>
): boolean {
  switch (step) {
    case "registration-form":
      // Required if any product has a form
      return products.some((p) => p.customProperties?.formId);

    case "payment":
      // Required unless behaviors skip it (checked at runtime)
      return true;

    default:
      return true;
  }
}
