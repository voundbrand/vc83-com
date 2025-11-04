/**
 * BEHAVIOR-DRIVEN CHECKOUT - TYPE DEFINITIONS
 *
 * Type-safe interfaces for the new behavior-driven checkout template.
 */

import { Id } from "../../../../convex/_generated/dataModel";
import { Theme } from "@/templates/types";
import { BehaviorExecutionResult, Behavior } from "@/lib/behaviors/types";
import type { CheckoutProduct } from "@/templates/checkout/types";

/**
 * Product with behavior configuration
 * Uses CheckoutProduct type for 100% compatibility with CheckoutTemplateProps
 */
export type BehaviorDrivenProduct = CheckoutProduct;

/**
 * Checkout step definitions
 */
export type CheckoutStep =
  | "product-selection"
  | "registration-form"
  | "customer-info"
  | "review-order"
  | "payment"
  | "confirmation";

/**
 * Checkout data accumulated across steps
 */
export interface CheckoutData {
  // Step 1: Product Selection
  selectedProducts?: Array<{
    productId: Id<"objects">;
    quantity: number;
    price: number;
  }>;

  // Step 2: Registration Form
  formResponses?: Array<{
    productId: Id<"objects">;
    ticketNumber: number;
    formId: string;
    responses: Record<string, unknown>;
    addedCosts: number;
    submittedAt: number;
  }>;

  // Step 3: Customer Info
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

  // Behavior results (from any step)
  behaviorResults?: BehaviorExecutionResult;

  // Step 5: Payment
  selectedPaymentProvider?: string;
  paymentResult?: {
    success: boolean;
    transactionId: string;
    receiptUrl?: string;
    purchasedItemIds?: string[];
    checkoutSessionId?: string;
  };

  // Calculated values
  totalPrice?: number;
  taxCalculation?: {
    subtotal: number;
    taxAmount: number;
    total: number;
    taxRate: number;
    isTaxable: boolean;
    taxBehavior: "exclusive" | "inclusive" | "automatic";
    lineItems?: Array<{
      subtotal: number;
      taxAmount: number;
      taxRate: number;
      taxable: boolean;
      taxCode?: string;
    }>;
  };
}

/**
 * Step component props
 */
export interface StepProps {
  organizationId: Id<"organizations">;
  sessionId?: string;
  checkoutData: CheckoutData;
  products: BehaviorDrivenProduct[];
  theme: Theme;
  workflowBehaviors?: Behavior[];
  onComplete: (stepData: Partial<CheckoutData>) => void | Promise<void>;
  onBack?: () => void;
}

/**
 * Template configuration
 */
export interface BehaviorDrivenCheckoutConfig {
  // Required
  organizationId: Id<"organizations">;
  products: BehaviorDrivenProduct[];
  theme: Theme;

  // Optional customization
  allowBackNavigation?: boolean;
  showProgressBar?: boolean;
  enableAutoSave?: boolean;
  debugMode?: boolean;

  // Behavior options
  executeBehaviorsOnStepChange?: boolean;
  behaviorExecutionTiming?: "eager" | "lazy"; // eager = before step, lazy = on demand

  // Callbacks
  onStepChange?: (from: CheckoutStep, to: CheckoutStep) => void;
  onBehaviorExecution?: (result: BehaviorExecutionResult) => void;
  onComplete?: (data: CheckoutData) => void;
  onError?: (error: Error) => void;
}

/**
 * Checkout context (shared across components)
 */
export interface CheckoutContext {
  // Data
  data: CheckoutData;
  products: BehaviorDrivenProduct[];

  // State
  currentStep: CheckoutStep;
  isProcessing: boolean;
  error: Error | null;

  // Behavior results
  lastBehaviorResult?: BehaviorExecutionResult;

  // Actions
  updateData: (updates: Partial<CheckoutData>) => void;
  nextStep: (stepData?: Partial<CheckoutData>) => Promise<void>;
  previousStep: () => void;
  executeBehaviors: () => Promise<BehaviorExecutionResult>;
}
