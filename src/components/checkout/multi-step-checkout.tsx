"use client";

/**
 * MULTI-STEP CHECKOUT COMPONENT
 *
 * Progressive checkout flow with 5 main steps:
 * 1. Product Selection - Choose products, quantity, see pricing
 * 2. Customer Information - Email, name, phone
 * 2.5. Registration Form - Conditional step if product has formId
 * 3. Payment Method Selection - Conditional if multiple providers
 * 4. Payment Form - Provider-specific payment UI
 * 5. Confirmation - Success page with receipt/ticket
 */

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CheckoutProduct } from "@/templates/checkout/types";
import { Id } from "../../../convex/_generated/dataModel";
import { ProductSelectionStep } from "./steps/product-selection-step";
import { CustomerInfoStep } from "./steps/customer-info-step";
import { RegistrationFormStep } from "./steps/registration-form-step";
import { PaymentMethodStep } from "./steps/payment-method-step";
import { PaymentFormStep } from "./steps/payment-form-step";
import { ConfirmationStep } from "./steps/confirmation-step";
import styles from "./styles/multi-step.module.css";

/**
 * Step data flow through checkout process
 */
export interface CheckoutStepData {
  // Step 1: Product Selection
  selectedProducts?: Array<{
    productId: Id<"objects">;
    quantity: number;
    price: number;
  }>;
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

  // Step 2: Customer Information
  customerInfo?: {
    email: string;
    name: string;
    phone?: string;
    notes?: string;
    // B2B fields
    transactionType?: "B2C" | "B2B";
    companyName?: string;
    vatNumber?: string;
    billingAddress?: {
      street: string;
      city: string;
      state?: string;
      postalCode: string;
      country: string;
    };
  };

  // Step 2.5: Registration Form (conditional)
  // Array structure to support multiple tickets, each with their own form data
  formResponses?: Array<{
    productId: Id<"objects">;
    ticketNumber: number; // 1-based index (Ticket 1, Ticket 2, etc.)
    formId: string;
    responses: Record<string, unknown>;
    addedCosts: number; // Additional costs from form selections
    submittedAt: number;
  }>;

  // Step 3: Payment Method Selection (conditional)
  selectedPaymentProvider?: string;

  // Step 4: Payment (handled by provider)
  paymentResult?: {
    success: boolean;
    transactionId: string;
    receiptUrl?: string;
    purchasedItemIds?: string[];
    checkoutSessionId?: string; // Add checkoutSessionId to payment result
  };
}

/**
 * Step configuration
 */
type CheckoutStep =
  | "product-selection"
  | "customer-info"
  | "registration-form"
  | "payment-method"
  | "payment-form"
  | "confirmation";

interface MultiStepCheckoutProps {
  organizationId: Id<"organizations">;
  linkedProducts: CheckoutProduct[];
  paymentProviders: string[];
  onComplete?: (result: CheckoutStepData) => void;
  initialStepData?: Partial<CheckoutStepData>; // For preview: pre-populate with selected products
}

export function MultiStepCheckout({
  organizationId,
  linkedProducts,
  paymentProviders,
  onComplete,
  initialStepData,
}: MultiStepCheckoutProps) {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("product-selection");
  const [stepData, setStepData] = useState<CheckoutStepData>(initialStepData || {});
  const [checkoutSessionId, setCheckoutSessionId] = useState<Id<"objects"> | null>(null);

  // Mutations for checkout session management
  const createPublicCheckoutSession = useMutation(api.checkoutSessionOntology.createPublicCheckoutSession);
  const updateCheckoutSession = useMutation(api.checkoutSessionOntology.updatePublicCheckoutSession);

  /**
   * Create checkout session when component mounts
   * This is the shopping cart that will track everything
   */
  useEffect(() => {
    const initCheckoutSession = async () => {
      try {
        const result = await createPublicCheckoutSession({
          organizationId,
          // checkoutInstanceId will be added when we implement checkout instances
        });
        setCheckoutSessionId(result.checkoutSessionId);
        console.log("✅ Created public checkout_session:", result.checkoutSessionId);
      } catch (error) {
        console.error("Failed to create checkout session:", error);
      }
    };

    if (!checkoutSessionId) {
      initCheckoutSession();
    }
  }, [organizationId, createPublicCheckoutSession, checkoutSessionId]);

  /**
   * Determine next step based on current state
   */
  const getNextStep = (current: CheckoutStep): CheckoutStep | null => {
    switch (current) {
      case "product-selection": {
        // Check if any selected product needs registration form
        const needsForm = stepData.selectedProducts?.some((sp) => {
          const product = linkedProducts.find((p) => p._id === sp.productId);

          // DEBUG: Log each product check
          console.log("🔍 [MultiStepCheckout] Checking product for form:", {
            productId: sp.productId,
            productName: product?.name,
            hasFormId: !!product?.customProperties?.formId,
            formId: product?.customProperties?.formId,
            formTiming: product?.customProperties?.formTiming,
            needsForm: !!(product?.customProperties?.formId && product?.customProperties?.formTiming === "duringCheckout"),
          });

          return (
            product?.customProperties?.formId &&
            product?.customProperties?.formTiming === "duringCheckout"
          );
        });

        // DEBUG: Log decision
        console.log("🔍 [MultiStepCheckout] Form decision:", {
          needsForm,
          nextStep: needsForm ? "registration-form" : "customer-info",
        });

        // If product has form, skip customer-info and go straight to registration-form
        // The registration form will collect email, name, and other info
        if (needsForm) {
          return "registration-form";
        }

        // Otherwise, go to customer-info for simple products without forms
        return "customer-info";
      }

      case "customer-info":
        // After customer info (for products WITHOUT forms), go to payment
        if (paymentProviders.length > 1) {
          return "payment-method";
        }
        return "payment-form";

      case "registration-form":
        // After form, check payment method
        if (paymentProviders.length > 1) {
          return "payment-method";
        }
        return "payment-form";

      case "payment-method":
        return "payment-form";

      case "payment-form":
        return "confirmation";

      case "confirmation":
        return null; // End of flow

      default:
        return null;
    }
  };

  /**
   * Handle step completion and advance to next step
   * NOW: Also updates the checkout_session in database
   */
  const handleStepComplete = async (data: Partial<CheckoutStepData>) => {
    const updatedData = { ...stepData, ...data };
    setStepData(updatedData);

    // Update checkout_session with latest data
    if (checkoutSessionId) {
      try {
        // Calculate total amount (base + form costs)
        const baseAmount = updatedData.totalPrice || 0;
        const formCosts = updatedData.formResponses?.reduce((sum, fr) => sum + (fr.addedCosts || 0), 0) || 0;
        const totalAmount = baseAmount + formCosts;

        await updateCheckoutSession({
          checkoutSessionId,
          updates: {
            customerEmail: updatedData.customerInfo?.email,
            customerName: updatedData.customerInfo?.name,
            customerPhone: updatedData.customerInfo?.phone,
            // B2B fields
            transactionType: updatedData.customerInfo?.transactionType,
            companyName: updatedData.customerInfo?.companyName,
            vatNumber: updatedData.customerInfo?.vatNumber,
            // Billing address
            billingStreet: updatedData.customerInfo?.billingAddress?.street,
            billingCity: updatedData.customerInfo?.billingAddress?.city,
            billingState: updatedData.customerInfo?.billingAddress?.state,
            billingPostalCode: updatedData.customerInfo?.billingAddress?.postalCode,
            billingCountry: updatedData.customerInfo?.billingAddress?.country,
            selectedProducts: updatedData.selectedProducts?.map(sp => ({
              productId: sp.productId,
              quantity: sp.quantity,
              pricePerUnit: sp.price, // Map price to pricePerUnit
              totalPrice: sp.price * sp.quantity // Calculate totalPrice per product
            })),
            totalAmount, // ADD TOTAL AMOUNT (includes tax and form costs)
            subtotal: updatedData.taxCalculation?.subtotal, // ADD SUBTOTAL
            taxAmount: updatedData.taxCalculation?.taxAmount, // ADD TAX AMOUNT
            taxDetails: updatedData.taxCalculation?.lineItems ? (() => {
              // Group line items by tax CODE (not rate) - only combine same tax codes
              const taxByCode = updatedData.taxCalculation.lineItems.reduce((acc, item) => {
                if (!item.taxable || item.taxAmount === 0) return acc;

                // Use tax code as key, or "default" if no code
                const codeKey = item.taxCode || "default";

                if (!acc[codeKey]) {
                  acc[codeKey] = {
                    taxCode: item.taxCode || "Tax",
                    rate: item.taxRate,
                    amount: 0
                  };
                }
                acc[codeKey].amount += item.taxAmount;
                return acc;
              }, {} as Record<string, { taxCode: string; rate: number; amount: number }>);

              return Object.entries(taxByCode).map(([_, data]) => ({
                jurisdiction: data.taxCode, // Use actual tax code
                taxName: "Tax",
                taxRate: data.rate,
                taxAmount: data.amount,
              }));
            })() : undefined,
            currency: linkedProducts[0]?.currency || "USD", // Add currency
            formResponses: updatedData.formResponses,
            stepProgress: [currentStep], // Track which step was just completed
            currentStep,
          },
        });
        console.log("✅ Updated checkout_session:", checkoutSessionId, "Total:", totalAmount);
      } catch (error) {
        console.error("Failed to update checkout session:", error);
      }
    }

    const nextStep = getNextStep(currentStep);
    if (nextStep) {
      setCurrentStep(nextStep);
    } else {
      // Checkout complete
      onComplete?.(updatedData);
    }
  };

  /**
   * Handle going back to previous step
   */
  const handleBack = () => {
    // Determine previous step
    switch (currentStep) {
      case "customer-info":
        setCurrentStep("product-selection");
        break;
      case "registration-form":
        // Registration form comes right after product selection
        setCurrentStep("product-selection");
        break;
      case "payment-method":
        // Check if we came from form or customer info
        const hasForm = stepData.formResponses;
        setCurrentStep(hasForm ? "registration-form" : "customer-info");
        break;
      case "payment-form":
        // Check if we selected payment method
        if (paymentProviders.length > 1) {
          setCurrentStep("payment-method");
        } else {
          // Go back to form or customer info
          const hasForm = stepData.formResponses;
          setCurrentStep(hasForm ? "registration-form" : "customer-info");
        }
        break;
      default:
        break;
    }
  };

  /**
   * Render current step component
   */
  const renderStep = () => {
    switch (currentStep) {
      case "product-selection":
        return (
          <ProductSelectionStep
            organizationId={organizationId}
            linkedProducts={linkedProducts}
            onComplete={(data) => handleStepComplete(data)}
          />
        );

      case "customer-info":
        return (
          <CustomerInfoStep
            initialData={stepData.customerInfo}
            onComplete={(data) => handleStepComplete({ customerInfo: data })}
            onBack={handleBack}
          />
        );

      case "registration-form":
        return (
          <RegistrationFormStep
            selectedProducts={stepData.selectedProducts || []}
            linkedProducts={linkedProducts}
            initialData={stepData.formResponses}
            onComplete={(data) => handleStepComplete({ formResponses: data })}
            onBack={handleBack}
          />
        );

      case "payment-method":
        return (
          <PaymentMethodStep
            paymentProviders={paymentProviders}
            initialSelection={stepData.selectedPaymentProvider}
            onComplete={(provider) =>
              handleStepComplete({ selectedPaymentProvider: provider })
            }
            onBack={handleBack}
          />
        );

      case "payment-form": {
        // Extract customer info from either customerInfo step OR first form response
        const customerInfo = stepData.customerInfo ||
          (stepData.formResponses && stepData.formResponses.length > 0
            ? {
                email: (stepData.formResponses[0].responses.email as string) || "",
                name: (stepData.formResponses[0].responses.name as string) ||
                      (stepData.formResponses[0].responses.fullName as string) || "",
                phone: (stepData.formResponses[0].responses.phone as string) || undefined,
              }
            : { email: "", name: "" });

        return (
          <PaymentFormStep
            paymentProvider={
              stepData.selectedPaymentProvider || paymentProviders[0]
            }
            totalAmount={
              (stepData.totalPrice || 0) +
              (stepData.formResponses?.reduce((sum, fr) => sum + (fr.addedCosts || 0), 0) || 0)
            }
            organizationId={organizationId}
            sessionId="public" // TODO: Get actual session if user is logged in
            checkoutSessionId={checkoutSessionId || undefined} // PASS REAL CHECKOUT SESSION ID!
            linkedProducts={linkedProducts} // Pass full product data for tax settings
            customerInfo={customerInfo}
            selectedProducts={stepData.selectedProducts || []}
            formResponses={stepData.formResponses}
            onComplete={(result) => handleStepComplete({ paymentResult: result })}
            onBack={handleBack}
          />
        );
      }

      case "confirmation":
        return (
          <ConfirmationStep
            checkoutData={stepData}
            linkedProducts={linkedProducts}
            checkoutSessionId={checkoutSessionId || undefined}
          />
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  /**
   * Handle clicking on a completed step to go back
   */
  const handleStepClick = (targetStep: CheckoutStep) => {
    setCurrentStep(targetStep);
  };

  return (
    <div className={styles.checkoutContainer}>
      {/* Progress Indicator */}
      <CheckoutProgressBar
        currentStep={currentStep}
        stepData={stepData}
        onStepClick={handleStepClick}
      />

      {/* Current Step Content */}
      <div className={styles.stepContent}>{renderStep()}</div>
    </div>
  );
}

/**
 * Progress bar showing current step - with clickable navigation
 */
function CheckoutProgressBar({
  currentStep,
  stepData,
  onStepClick,
}: {
  currentStep: CheckoutStep;
  stepData: CheckoutStepData;
  onStepClick?: (step: CheckoutStep) => void;
}) {
  const steps: Array<{ key: CheckoutStep; label: string; visible: boolean }> = [
    { key: "product-selection", label: "Products", visible: true },
    { key: "customer-info", label: "Information", visible: true },
    {
      key: "registration-form",
      label: "Registration",
      visible: (stepData.formResponses && stepData.formResponses.length > 0) || currentStep === "registration-form",
    },
    {
      key: "payment-method",
      label: "Payment Method",
      visible: false, // Only show if multiple providers
    },
    { key: "payment-form", label: "Payment", visible: true },
    { key: "confirmation", label: "Confirmation", visible: true },
  ];

  const visibleSteps = steps.filter((s) => s.visible);
  const currentIndex = visibleSteps.findIndex((s) => s.key === currentStep);

  return (
    <div className={styles.progressBar}>
      <div className={styles.progressSteps}>
        {visibleSteps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;

          return (
            <div key={step.key} className={styles.progressStepWrapper}>
              {/* Step Circle */}
              <div className={styles.progressStep}>
                <button
                  type="button"
                  className={`${styles.stepCircle} ${
                    isCompleted
                      ? styles.stepCompleted
                      : isActive
                        ? styles.stepActive
                        : styles.stepUpcoming
                  }`}
                  onClick={() => isCompleted && onStepClick?.(step.key)}
                  disabled={!isCompleted}
                  title={isCompleted ? `Go back to ${step.label}` : step.label}
                >
                  {isCompleted ? "✓" : index + 1}
                </button>

                {/* Step Label */}
                <span
                  className={`${styles.stepLabel} ${
                    isActive
                      ? styles.stepLabelActive
                      : isCompleted
                        ? styles.stepLabelCompleted
                        : styles.stepLabelUpcoming
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < visibleSteps.length - 1 && (
                <div
                  className={`${styles.stepConnector} ${
                    isCompleted ? styles.stepConnectorCompleted : ""
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
