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
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CheckoutProduct } from "@/templates/checkout/types";
import { Id } from "../../../convex/_generated/dataModel";
import { ProductSelectionStep } from "./steps/product-selection-step";
import { CustomerInfoStep } from "./steps/customer-info-step";
import { RegistrationFormStep } from "./steps/registration-form-step";
import { PaymentMethodStep } from "./steps/payment-method-step";
import { PaymentFormStep } from "./steps/payment-form-step";
import { ConfirmationStep } from "./steps/confirmation-step";
import { InvoiceEnforcementStep } from "./steps/invoice-enforcement-step";
import { evaluatePaymentRules, type PaymentRulesResult } from "../../../convex/paymentRulesEngine";
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
    // Billing address (matches BillingAddress interface)
    billingAddress?: {
      line1: string;
      line2?: string;
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
  | "invoice-enforcement"
  | "payment-method"
  | "payment-form"
  | "confirmation";

interface MultiStepCheckoutProps {
  organizationId: Id<"organizations">;
  linkedProducts: CheckoutProduct[];
  paymentProviders: string[];
  forceB2B?: boolean; // Force B2B mode (require organization info)
  onComplete?: (result: CheckoutStepData) => void;
  initialStepData?: Partial<CheckoutStepData>; // For preview: pre-populate with selected products
}

export function MultiStepCheckout({
  organizationId,
  linkedProducts,
  paymentProviders,
  forceB2B = false,
  onComplete,
  initialStepData,
}: MultiStepCheckoutProps) {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("product-selection");
  const [stepData, setStepData] = useState<CheckoutStepData>(initialStepData || {});
  const [checkoutSessionId, setCheckoutSessionId] = useState<Id<"objects"> | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<string[]>(paymentProviders);
  const [paymentRulesResult, setPaymentRulesResult] = useState<PaymentRulesResult | null>(null);

  // Query available payment providers from ontology
  const providersQuery = useQuery(
    api.paymentProviders.helpers.getAvailableProviders,
    { organizationId }
  );

  // Mutations for checkout session management
  const createPublicCheckoutSession = useMutation(api.checkoutSessionOntology.createPublicCheckoutSession);
  const updateCheckoutSession = useMutation(api.checkoutSessionOntology.updatePublicCheckoutSession);

  /**
   * Sync available providers from query
   */
  useEffect(() => {
    if (providersQuery) {
      const providerCodes = providersQuery.map((p: {
        providerCode: string;
        providerName: string;
        isDefault: boolean;
        isTestMode: boolean;
      }) => p.providerCode);
      setAvailableProviders(providerCodes);

      // Auto-select if only one provider
      if (providerCodes.length === 1) {
        setSelectedProvider(providerCodes[0]);
        console.log("🔧 [Checkout] Auto-selected single provider:", providerCodes[0]);
      } else if (providerCodes.length > 1) {
        // Auto-select default provider if available
        const defaultProvider = providersQuery.find((p: {
          providerCode: string;
          providerName: string;
          isDefault: boolean;
          isTestMode: boolean;
        }) => p.isDefault);
        if (defaultProvider) {
          setSelectedProvider(defaultProvider.providerCode);
          console.log("🔧 [Checkout] Auto-selected default provider:", defaultProvider.providerCode);
        }
      }
    }
  }, [providersQuery]);

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
   * 🚨 NEW ORDER: registration-form comes BEFORE customer-info
   *
   * NOTE: This function is called from handleStepComplete with updatedData,
   * so we need to pass the updated data as a parameter
   */
  const getNextStep = (current: CheckoutStep, data: CheckoutStepData = stepData): CheckoutStep | null => {
    switch (current) {
      case "product-selection": {
        // ✅ NEW: Check if we need registration form FIRST
        // Use the passed data parameter instead of stepData
        const needsForm = data.selectedProducts?.some((sp) => {
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
        console.log("🔍 [MultiStepCheckout] After product selection:", {
          needsForm,
          nextStep: needsForm ? "registration-form" : "customer-info",
          selectedProducts: data.selectedProducts,
        });

        // If product has form template, show it BEFORE customer-info
        // This allows us to know employer BEFORE collecting billing details
        if (needsForm) {
          return "registration-form";
        }

        // Otherwise, go to customer-info (no employer context)
        return "customer-info";
      }

      case "registration-form": {
        // ✅ NEW: After registration form, ALWAYS go to customer-info
        // Customer-info will be dynamic based on form responses (employer billing)
        return "customer-info";
      }

      case "customer-info": {
        // After customer-info, check if invoice is enforced (from payment rules)
        // Note: payment rules were evaluated after registration-form
        if (paymentRulesResult?.enforceInvoice) {
          return "invoice-enforcement";
        }

        // Otherwise, go to payment (show payment-method step if multiple providers)
        if (availableProviders.length > 1) {
          return "payment-method";
        }
        return "payment-form";
      }

      case "invoice-enforcement":
        // After invoice enforcement confirmation, go directly to payment form
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
   * ALSO: Evaluates payment rules after form submission
   */
  const handleStepComplete = async (data: Partial<CheckoutStepData>) => {
    const updatedData = { ...stepData, ...data };
    setStepData(updatedData);

    // ========================================================================
    // PAYMENT RULES EVALUATION (after form submission)
    // ========================================================================
    if (currentStep === "registration-form" && data.formResponses) {
      // Get first product (assuming single product checkout for now)
      const firstProductId = stepData.selectedProducts?.[0]?.productId;
      const product = firstProductId ? linkedProducts.find((p) => p._id === firstProductId) : null;

      if (product) {
        // Convert CheckoutProduct to format expected by evaluatePaymentRules
        const productForRules = {
          _id: product._id as Id<"objects">,
          name: product.name,
          customProperties: product.customProperties,
        };

        const rulesResult = evaluatePaymentRules(
          productForRules,
          data.formResponses,
          availableProviders
        );

        console.log("🔍 [Checkout] Payment rules evaluated:", rulesResult);
        setPaymentRulesResult(rulesResult);

        // Update available providers based on rules
        if (rulesResult.errors.length === 0) {
          setAvailableProviders(rulesResult.availableProviders);

          // Auto-select provider if only one available
          if (rulesResult.availableProviders.length === 1) {
            setSelectedProvider(rulesResult.availableProviders[0]);
            console.log("🔧 [Checkout] Auto-selected provider from rules:", rulesResult.availableProviders[0]);
          }
        }
      }
    }

    // Update checkout_session with latest data
    if (checkoutSessionId) {
      try {
        // Calculate total amount (base + form costs)
        const baseAmount = updatedData.totalPrice || 0;
        const formCosts = updatedData.formResponses?.reduce((sum, fr) => sum + (fr.addedCosts || 0), 0) || 0;
        const totalAmount = baseAmount + formCosts;

        // Extract event information from first product (if product has eventId)
        const eventInfo: {
          eventName?: string;
          eventSponsors?: Array<{ name: string; level?: string }>;
          eventDate?: number;
          eventLocation?: string
        } = {};

        if (updatedData.selectedProducts && updatedData.selectedProducts.length > 0) {
          // Get first product to check for event data (loaded by getPublicCheckoutProducts)
          const firstProduct = linkedProducts.find(p => p._id === updatedData.selectedProducts![0].productId);

          if (firstProduct) {
            // 🎯 Event data comes directly from product (loaded via objectLinks)
            eventInfo.eventName = firstProduct.eventName;
            eventInfo.eventDate = firstProduct.customProperties?.eventDate as number | undefined;
            eventInfo.eventLocation = firstProduct.customProperties?.location as string | undefined;

            // 🎯 ALL sponsors come directly from product (loaded via objectLinks)
            if (firstProduct.eventSponsors && firstProduct.eventSponsors.length > 0) {
              eventInfo.eventSponsors = firstProduct.eventSponsors;
              console.log(`📊 [Checkout] Event: ${eventInfo.eventName}, Sponsors: ${firstProduct.eventSponsors.map(s => s.name).join(', ')}`);
            }
          }
        }

        // Determine payment provider with proper fallback
        const providerToStore = selectedProvider ||
                                updatedData.selectedPaymentProvider ||
                                (availableProviders.length > 0 ? availableProviders[0] : null);

        console.log("🔧 [Checkout] Storing payment provider:", {
          selectedProvider,
          fromStepData: updatedData.selectedPaymentProvider,
          availableProviders,
          storing: providerToStore
        });

        // Build updates object, conditionally including paymentProvider only if we have a value
        const updates: Record<string, unknown> = {
          customerEmail: updatedData.customerInfo?.email,
          customerName: updatedData.customerInfo?.name,
          customerPhone: updatedData.customerInfo?.phone,
          // B2B fields
          transactionType: updatedData.customerInfo?.transactionType,
          companyName: updatedData.customerInfo?.companyName,
          vatNumber: updatedData.customerInfo?.vatNumber,
          // Billing address (using line1/line2 format)
          billingLine1: updatedData.customerInfo?.billingAddress?.line1,
          billingLine2: updatedData.customerInfo?.billingAddress?.line2,
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
          // IMPORTANT: Also store as 'items' for invoice provider compatibility
          items: updatedData.selectedProducts?.map(sp => ({
            productId: sp.productId,
            quantity: sp.quantity
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

            return Object.entries(taxByCode).map(([, data]) => ({
              jurisdiction: data.taxCode, // Use actual tax code
              taxName: "Tax",
              taxRate: data.rate,
              taxAmount: data.amount,
            }));
          })() : undefined,
          currency: linkedProducts[0]?.currency || "EUR", // Add currency
          formResponses: updatedData.formResponses,
          stepProgress: [currentStep], // Track which step was just completed
          currentStep,
          // Event information (from product->event link)
          ...eventInfo,
        };

        // Only add paymentProvider if we have a valid value
        if (providerToStore) {
          updates.paymentProvider = providerToStore;
        }

        await updateCheckoutSession({
          checkoutSessionId,
          updates: updates as Parameters<typeof updateCheckoutSession>[0]['updates'],
        });
        console.log("✅ Updated checkout_session:", checkoutSessionId, "Total:", totalAmount, "Event:", eventInfo.eventName);
      } catch (error) {
        console.error("Failed to update checkout session:", error);
      }
    }

    // Pass updatedData to getNextStep so it can check the new selectedProducts
    const nextStep = getNextStep(currentStep, updatedData);
    if (nextStep) {
      setCurrentStep(nextStep);
    } else {
      // Checkout complete
      onComplete?.(updatedData);
    }
  };

  /**
   * Handle going back to previous step
   * 🚨 NEW FLOW: product-selection -> registration-form -> customer-info -> payment
   */
  const handleBack = () => {
    // Determine previous step
    switch (currentStep) {
      case "registration-form":
        // ✅ NEW: Registration form comes AFTER product selection
        setCurrentStep("product-selection");
        break;
      case "customer-info":
        // ✅ NEW: Customer-info comes AFTER registration form (if present)
        const hasForm = stepData.formResponses;
        setCurrentStep(hasForm ? "registration-form" : "product-selection");
        break;
      case "invoice-enforcement":
        // Invoice enforcement comes after customer-info
        setCurrentStep("customer-info");
        break;
      case "payment-method":
        // Payment method comes after invoice enforcement (if present) or customer-info
        if (paymentRulesResult?.enforceInvoice) {
          setCurrentStep("invoice-enforcement");
        } else {
          setCurrentStep("customer-info");
        }
        break;
      case "payment-form":
        // Payment form comes after payment method or invoice enforcement
        if (paymentRulesResult?.enforceInvoice) {
          setCurrentStep("invoice-enforcement");
        } else if (availableProviders.length > 1) {
          setCurrentStep("payment-method");
        } else {
          setCurrentStep("customer-info");
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
            forceB2B={forceB2B}
            formResponses={stepData.formResponses} // NEW: Pass form responses for employer detection
            linkedProducts={linkedProducts} // NEW: Pass products for invoice config
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

      case "invoice-enforcement":
        if (!paymentRulesResult?.enforceInvoice) {
          // Fallback if accessed without enforcement
          return <div>Error: Invoice enforcement step accessed without valid rules</div>;
        }
        return (
          <InvoiceEnforcementStep
            rulesResult={paymentRulesResult}
            selectedProducts={stepData.selectedProducts || []}
            linkedProducts={linkedProducts}
            formResponses={stepData.formResponses || []}
            customerInfo={stepData.customerInfo!}
            taxCalculation={stepData.taxCalculation}
            onComplete={() => handleStepComplete({})}
            onBack={handleBack}
          />
        );

      case "payment-method": {
        // Get currency from first product
        const productCurrency = (() => {
          const firstProduct = linkedProducts.find((p) => p._id === stepData.selectedProducts?.[0]?.productId);
          return firstProduct?.currency || "EUR";
        })();

        // Calculate total amount (base + form costs)
        const totalWithForms =
          (stepData.totalPrice || 0) +
          (stepData.formResponses?.reduce((sum, fr) => sum + (fr.addedCosts || 0), 0) || 0);

        return (
          <PaymentMethodStep
            paymentProviders={availableProviders}
            initialSelection={selectedProvider || undefined}
            currency={productCurrency}
            totalAmount={totalWithForms}
            onComplete={(provider) => {
              setSelectedProvider(provider);
              handleStepComplete({ selectedPaymentProvider: provider });
            }}
            onBack={handleBack}
          />
        );
      }

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

        // Determine payment provider with fallback chain
        const paymentProviderCode = selectedProvider ||
                                     stepData.selectedPaymentProvider ||
                                     availableProviders[0] ||
                                     "stripe-connect"; // Default fallback

        console.log("🔧 [Checkout] Payment form provider:", {
          selectedProvider,
          fromStepData: stepData.selectedPaymentProvider,
          availableProviders,
          final: paymentProviderCode
        });

        return (
          <PaymentFormStep
            paymentProvider={paymentProviderCode}
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
            rulesResult={paymentRulesResult} // Pass payment rules result
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
        showPaymentMethodStep={availableProviders.length > 1}
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
  showPaymentMethodStep = false,
}: {
  currentStep: CheckoutStep;
  stepData: CheckoutStepData;
  onStepClick?: (step: CheckoutStep) => void;
  showPaymentMethodStep?: boolean;
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
      key: "invoice-enforcement",
      label: "Confirmation",
      visible: currentStep === "invoice-enforcement",
    },
    {
      key: "payment-method",
      label: "Payment Method",
      visible: showPaymentMethodStep || currentStep === "payment-method",
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
