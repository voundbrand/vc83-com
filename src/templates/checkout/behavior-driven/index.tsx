"use client";

/**
 * BEHAVIOR-DRIVEN CHECKOUT - MAIN COMPONENT
 *
 * Clean, behavior-powered checkout that delegates business logic
 * to the behavior system instead of hardcoding rules.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { BehaviorDrivenCheckoutConfig, CheckoutData, CheckoutStep } from "./types";
import { DEFAULT_CONFIG, getNextStep, getPreviousStep, getStepNumber, getProgressPercentage } from "./config";
import { executeCheckoutBehaviors, shouldSkipPaymentStep } from "@/lib/behaviors/adapters/checkout-integration";
import { Behavior } from "@/lib/behaviors/types";
import { Id } from "../../../../convex/_generated/dataModel";

// Step components
import { ProductSelectionStep } from "./steps/product-selection";
import { RegistrationFormStep } from "./steps/registration-form";
import { CustomerInfoStep } from "./steps/customer-info";
import { ReviewOrderStep } from "./steps/review-order";
import { PaymentStep } from "./steps/payment";
import { ConfirmationStep } from "./steps/confirmation";

export function BehaviorDrivenCheckout(props: BehaviorDrivenCheckoutConfig) {
  const config = { ...DEFAULT_CONFIG, ...props };

  // State
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("product-selection");
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sessionId] = useState(() => `checkout-${Date.now()}`);
  const [checkoutSessionId, setCheckoutSessionId] = useState<Id<"objects"> | null>(null);

  // Mutations and Actions
  const createCheckoutSession = useMutation(api.checkoutSessionOntology.createPublicCheckoutSession);
  const updateCheckoutSession = useMutation(api.checkoutSessionOntology.updatePublicCheckoutSession);
  const initiateInvoice = useAction(api.paymentProviders.invoice.initiateInvoicePayment);

  // Load active workflows for this checkout (public query - no auth required)
  const workflows = useQuery(
    api.workflows.workflowOntology.getWorkflowsByTriggerPublic,
    {
      organizationId: config.organizationId,
      triggerOn: "checkout_start",
    }
  );

  // Debug: Log workflow loading
  useEffect(() => {
    console.log("🔍 [Workflow Query] organizationId:", config.organizationId);
    console.log("🔍 [Workflow Query] workflows result:", workflows);
    console.log("🔍 [Workflow Query] workflows is array?", Array.isArray(workflows));
    console.log("🔍 [Workflow Query] workflows length:", workflows?.length);
    if (workflows && workflows.length > 0) {
      console.log("🔍 [Workflow Query] First workflow:", workflows[0]);
      console.log("🔍 [Workflow Query] customProperties:", workflows[0].customProperties);
    }
  }, [workflows, config.organizationId]);

  // Extract behaviors from active workflows
  const workflowBehaviors = useMemo(() => {
    console.log("🧠 [Behavior Extraction] Starting extraction...");
    console.log("🧠 [Behavior Extraction] workflows:", workflows);

    if (!workflows || workflows.length === 0) {
      console.log("❌ [Behavior Extraction] No workflows found!");
      return undefined;
    }

    const behaviors: Behavior[] = [];
    for (const workflow of workflows) {
      console.log("🔍 [Behavior Extraction] Processing workflow:", workflow.name);
      const customProps = workflow.customProperties as Record<string, unknown> | undefined;
      console.log("🔍 [Behavior Extraction] customProperties:", customProps);
      console.log("🔍 [Behavior Extraction] behaviors array:", (customProps as { behaviors?: unknown[] })?.behaviors);

      if (customProps && 'behaviors' in customProps && Array.isArray(customProps.behaviors)) {
        // Convert workflow behaviors to execution engine format
        for (const behaviorDef of customProps.behaviors) {
          const behavior = behaviorDef as { type: string; enabled: boolean; priority?: number; config?: Record<string, unknown>; triggers?: Record<string, unknown> };
          console.log("🔍 [Behavior Extraction] Found behavior:", behavior.type, "enabled:", behavior.enabled);
          if (behavior.enabled) {
            behaviors.push({
              type: behavior.type,
              priority: behavior.priority || 0,
              config: behavior.config || {},
              triggers: behavior.triggers || {},
            });
          }
        }
      }
    }

    console.log("✅ [Behavior Extraction] Extracted behaviors:", behaviors.length);
    behaviors.forEach(b => console.log("  -", b.type, "(priority:", b.priority + ")"));

    // Sort by priority (highest first)
    behaviors.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return behaviors.length > 0 ? behaviors : undefined;
  }, [workflows]);

  /**
   * Create checkout session on mount
   * This tracks the customer's journey from start to finish
   */
  useEffect(() => {
    const initializeSession = async () => {
      if (checkoutSessionId) return; // Already created

      try {
        console.log("🛒 [BehaviorCheckout] Creating checkout session...");
        const result = await createCheckoutSession({
          organizationId: config.organizationId,
        });

        setCheckoutSessionId(result.checkoutSessionId);

        // Store in checkoutData for easy access throughout flow
        setCheckoutData(prev => ({
          ...prev,
          paymentResult: prev.paymentResult ? {
            ...prev.paymentResult,
            checkoutSessionId: result.checkoutSessionId as string,
          } : undefined,
        }));

        console.log("✅ [BehaviorCheckout] Session created:", result.checkoutSessionId);
      } catch (err) {
        console.error("❌ [BehaviorCheckout] Failed to create session:", err);
        setError(err as Error);
      }
    };

    initializeSession();
  }, [checkoutSessionId, createCheckoutSession, config.organizationId]);

  // Debug logging
  useEffect(() => {
    if (config.debugMode) {
      console.log("🛒 [BehaviorCheckout] Step:", currentStep);
      console.log("🛒 [BehaviorCheckout] Data:", checkoutData);
      console.log("🛒 [BehaviorCheckout] Session ID:", checkoutSessionId);
      console.log("⚡ [Workflows] Loaded workflows:", workflows?.length || 0);
      console.log("🧠 [Workflows] Extracted behaviors:", workflowBehaviors?.length || 0);
    }
  }, [currentStep, checkoutData, checkoutSessionId, workflows, workflowBehaviors, config.debugMode]);

  /**
   * Execute behaviors based on current checkout state
   * Now supports both workflow behaviors (new) and product behaviors (legacy)
   *
   * @param dataOverride - Optional checkout data to use instead of current state (for immediate execution after state updates)
   */
  const executeBehaviors = useCallback(async (dataOverride?: Partial<CheckoutData>) => {
    const data = { ...checkoutData, ...dataOverride };

    if (!data.selectedProducts || data.selectedProducts.length === 0) {
      return {
        success: true,
        results: [],
        finalContext: {
          organizationId: config.organizationId,
          sessionId,
          workflow: "checkout",
          objects: [],
          userContext: {},
          inputSource: {
            type: "form" as const,
            data: {},
          },
          executionStack: [],
        },
        errors: []
      };
    }

    console.log("🔍 [executeBehaviors] Using data:", {
      hasFormResponses: !!data.formResponses,
      formResponseCount: data.formResponses?.length || 0,
      hasCustomerInfo: !!data.customerInfo,
    });

    const result = await executeCheckoutBehaviors(
      {
        organizationId: config.organizationId,
        sessionId,
        selectedProducts: data.selectedProducts,
        linkedProducts: config.products.map(p => ({
          _id: p._id,
          type: "product",  // CheckoutProduct doesn't have type, default to "product"
          subtype: p.subtype,
          name: p.name,
          customProperties: p.customProperties,
        })),
        formResponses: data.formResponses,
        customerInfo: data.customerInfo,
      },
      workflowBehaviors // Pass workflow behaviors (will use these over product behaviors if available)
    );

    // Store behavior results
    setCheckoutData((prev) => ({ ...prev, behaviorResults: result }));

    // Notify callback
    config.onBehaviorExecution?.(result);

    if (config.debugMode) {
      console.log("🧠 [Behaviors] Execution result:", result);
      if (workflowBehaviors) {
        console.log("⚡ [Workflows] Used workflow behaviors:", workflowBehaviors.length);
      } else {
        console.log("📦 [Legacy] Used product behaviors (no workflows found)");
      }
    }

    return result;
  }, [checkoutData, config, sessionId, workflowBehaviors]);

  /**
   * Handle step completion
   */
  const handleStepComplete = useCallback(
    async (stepData: Partial<CheckoutData>) => {
      setIsProcessing(true);
      setError(null);

      try {
        // Update checkout data
        const updatedData = { ...checkoutData, ...stepData };
        setCheckoutData(updatedData);

        // Update checkout session in backend
        if (checkoutSessionId) {
          try {
            // Helper: Convert Date objects to timestamps recursively
            const convertDatesToTimestamps = (obj: any): any => {
              if (obj === null || obj === undefined) return obj;
              if (obj instanceof Date) return obj.getTime();
              if (Array.isArray(obj)) return obj.map(convertDatesToTimestamps);
              if (typeof obj === 'object') {
                const converted: any = {};
                for (const [key, value] of Object.entries(obj)) {
                  converted[key] = convertDatesToTimestamps(value);
                }
                return converted;
              }
              return obj;
            };

            // Extract behavior results for backend persistence
            const behaviorContext = updatedData.behaviorResults ? {
              // Extract invoice mapping if available
              invoiceMapping: updatedData.behaviorResults.results
                .find(r => r.type === "invoice_mapping")?.result.data,
              // Extract employer detection if available
              employerDetection: updatedData.behaviorResults.results
                .find(r => r.type === "employer_detection")?.result.data,
              // Extract tax calculation if available
              taxCalculation: updatedData.taxCalculation,
              // Store all behavior results for debugging (convert Dates to timestamps)
              allResults: updatedData.behaviorResults.results.map(r => ({
                type: r.type,
                success: r.result.success,
                data: convertDatesToTimestamps(r.result.data),
              })),
            } : undefined;

            console.log("📝 [BehaviorCheckout] Updating session with data:", {
              step: currentStep,
              selectedProducts: updatedData.selectedProducts?.length || 0,
              formResponses: updatedData.formResponses?.length || 0,
              customerEmail: updatedData.customerInfo?.email,
              hasBehaviorContext: !!behaviorContext,
              behaviorTypes: behaviorContext?.allResults?.map(r => r.type),
            });

            await updateCheckoutSession({
              checkoutSessionId,
              updates: {
                customerEmail: updatedData.customerInfo?.email,
                customerName: updatedData.customerInfo?.name,
                customerPhone: updatedData.customerInfo?.phone,
                // 🔥 CRITICAL: Store B2B transaction info for CRM organization creation
                transactionType: updatedData.customerInfo?.transactionType,
                companyName: updatedData.customerInfo?.companyName,
                vatNumber: updatedData.customerInfo?.vatNumber,
                // 🔥 CRITICAL: Store billing address fields for CRM organization
                billingLine1: updatedData.customerInfo?.billingAddress?.line1,
                billingLine2: updatedData.customerInfo?.billingAddress?.line2,
                billingCity: updatedData.customerInfo?.billingAddress?.city,
                billingState: updatedData.customerInfo?.billingAddress?.state,
                billingPostalCode: updatedData.customerInfo?.billingAddress?.postalCode,
                billingCountry: updatedData.customerInfo?.billingAddress?.country,
                selectedProducts: updatedData.selectedProducts?.map(sp => ({
                  productId: sp.productId as Id<"objects">,
                  quantity: sp.quantity,
                  pricePerUnit: sp.price,
                  totalPrice: sp.price * sp.quantity,
                })),
                formResponses: updatedData.formResponses?.map(fr => ({
                  productId: fr.productId,
                  ticketNumber: fr.ticketNumber,
                  formId: fr.formId,
                  responses: fr.responses,
                  addedCosts: fr.addedCosts,
                  submittedAt: fr.submittedAt,
                })),
                totalAmount: updatedData.totalPrice || 0,
                stepProgress: [currentStep],
                // ✅ CRITICAL: Store behavior results so backend can access them!
                behaviorContext: behaviorContext,
              },
            });
            console.log("✅ [BehaviorCheckout] Session updated successfully after", currentStep);
          } catch (sessionErr) {
            console.error("❌ [BehaviorCheckout] Failed to update session:", sessionErr);
            console.error("❌ [BehaviorCheckout] Error details:", {
              message: sessionErr instanceof Error ? sessionErr.message : String(sessionErr),
              stack: sessionErr instanceof Error ? sessionErr.stack : undefined,
              step: currentStep,
              checkoutSessionId,
            });
            // Don't fail the whole checkout if session update fails
            // But this means data might not be persisted!
          }
        }

        // Execute behaviors if configured
        let behaviorResult;
        if (config.executeBehaviorsOnStepChange && config.behaviorExecutionTiming === "eager") {
          console.log("🧠 [BehaviorCheckout] Executing behaviors with context:", {
            step: currentStep,
            hasFormResponses: !!updatedData.formResponses,
            formResponseCount: updatedData.formResponses?.length || 0,
            hasCustomerInfo: !!updatedData.customerInfo,
            selectedProducts: updatedData.selectedProducts?.length || 0,
          });
          // CRITICAL: Pass updatedData to executeBehaviors so it uses the LATEST data,
          // not the stale checkoutData from before the state update!
          behaviorResult = await executeBehaviors(updatedData);
          console.log("🧠 [BehaviorCheckout] Behavior execution result:", {
            success: behaviorResult.success,
            resultCount: behaviorResult.results.length,
            results: behaviorResult.results.map(r => ({
              type: r.type,
              success: r.result.success,
              skipped: r.result.skipped,
              hasData: !!r.result.data,
              errors: r.result.errors,
            })),
          });
        }

        // Determine next step
        const shouldSkipPayment = behaviorResult ? shouldSkipPaymentStep(behaviorResult) : false;

        const nextStep = getNextStep(currentStep, { shouldSkipPayment });

        if (nextStep) {
          // ✅ Execute behavior actions if any were returned
          if (behaviorResult?.results && behaviorResult.results.length > 0) {
            console.log("🎬 [BehaviorCheckout] Checking for behavior actions...");

            for (const result of behaviorResult.results) {
              if (result.result.actions && result.result.actions.length > 0) {
                console.log(`🎬 [BehaviorCheckout] Executing ${result.result.actions.length} actions from ${result.type}`);

                for (const action of result.result.actions) {
                  try {
                    // Handle different action types
                    if (action.type === "create_invoice" && action.when === "immediate") {
                      console.log("📄 [BehaviorCheckout] Executing create_invoice action...");

                      const result = await initiateInvoice({
                        sessionId,
                        checkoutSessionId: checkoutSessionId as Id<"objects">,
                        organizationId: config.organizationId,
                      });

                      if (!result.success) {
                        throw new Error(result.error || "Failed to create invoice");
                      }

                      console.log("✅ [BehaviorCheckout] Invoice and tickets created:", result);

                      // Update checkout data with payment result
                      setCheckoutData((prev) => ({
                        ...prev,
                        selectedPaymentProvider: "invoice",
                        paymentResult: {
                          success: true,
                          transactionId: result.invoiceId || "invoice_pending",
                          receiptUrl: result.pdfUrl || undefined,
                          purchasedItemIds: updatedData.selectedProducts?.map((sp) => sp.productId as string) || [],
                          checkoutSessionId: checkoutSessionId as string,
                        },
                      }));
                    } else if (action.type === "create_tickets" && action.when === "after_customer_info" && currentStep === "customer-info") {
                      console.log("🎫 [BehaviorCheckout] Executing create_tickets action...");

                      // The employer-detection behavior wants to create tickets immediately
                      // This bypasses the payment step entirely for employer billing
                      const result = await initiateInvoice({
                        sessionId,
                        checkoutSessionId: checkoutSessionId as Id<"objects">,
                        organizationId: config.organizationId,
                      });

                      if (!result.success) {
                        throw new Error(result.error || "Failed to create tickets");
                      }

                      console.log("✅ [BehaviorCheckout] Tickets created for employer billing:", result);

                      // Update checkout data with payment result
                      setCheckoutData((prev) => ({
                        ...prev,
                        selectedPaymentProvider: "invoice",
                        paymentResult: {
                          success: true,
                          transactionId: result.invoiceId || "employer_billing_pending",
                          receiptUrl: result.pdfUrl || undefined,
                          purchasedItemIds: updatedData.selectedProducts?.map((sp) => sp.productId as string) || [],
                          checkoutSessionId: checkoutSessionId as string,
                        },
                      }));

                      // Skip directly to confirmation
                      console.log("⏭️ [BehaviorCheckout] Skipping to confirmation (employer billing)");
                      config.onStepChange?.(currentStep, "confirmation");
                      setCurrentStep("confirmation");
                      setIsProcessing(false);
                      return; // Don't continue with normal flow
                    }
                    // Add more action types as needed
                  } catch (actionErr) {
                    console.error(`❌ [BehaviorCheckout] Failed to execute action ${action.type}:`, actionErr);
                    setError(actionErr instanceof Error ? actionErr : new Error(`Failed to execute ${action.type}`));
                    setIsProcessing(false);
                    return;
                  }
                }
              }
            }
          }

          // Notify step change
          config.onStepChange?.(currentStep, nextStep);

          // Move to next step
          setCurrentStep(nextStep);

          // If invoice checkout, set payment provider
          if (shouldSkipPayment) {
            setCheckoutData((prev) => ({
              ...prev,
              selectedPaymentProvider: "invoice",
            }));
          }
        } else {
          // Checkout complete
          config.onComplete?.(updatedData);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        config.onError?.(error);
      } finally {
        setIsProcessing(false);
      }
    },
    [checkoutData, currentStep, config, executeBehaviors, checkoutSessionId, updateCheckoutSession, initiateInvoice, sessionId]
  );

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    if (!config.allowBackNavigation) return;

    const previousStep = getPreviousStep(currentStep);
    if (previousStep) {
      config.onStepChange?.(currentStep, previousStep);
      setCurrentStep(previousStep);
    }
  }, [currentStep, config]);

  /**
   * Render current step
   */
  const renderStep = () => {
    const stepProps = {
      organizationId: config.organizationId,
      sessionId,
      checkoutData,
      products: config.products,
      theme: config.theme,
      workflowBehaviors,
      checkoutSessionId, // Pass checkoutSessionId for payment step
      onComplete: handleStepComplete,
      onBack: currentStep !== "product-selection" && config.allowBackNavigation ? handleBack : undefined,
    };

    switch (currentStep) {
      case "product-selection":
        return <ProductSelectionStep {...stepProps} />;

      case "registration-form":
        return <RegistrationFormStep {...stepProps} />;

      case "customer-info":
        return <CustomerInfoStep {...stepProps} />;

      case "review-order":
        return <ReviewOrderStep {...stepProps} />;

      case "payment":
        return <PaymentStep {...stepProps} />;

      case "confirmation":
        return <ConfirmationStep {...stepProps} />;

      default:
        return <div>Unknown step: {currentStep}</div>;
    }
  };

  return (
    <div className="behavior-driven-checkout">
      {/* Progress Bar */}
      {config.showProgressBar && currentStep !== "confirmation" && (
        <div className="checkout-progress mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {getStepNumber(currentStep)} of 6
            </span>
            <span className="text-sm text-gray-500">{getProgressPercentage(currentStep)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage(currentStep)}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-bold text-red-900 mb-2">Error</h3>
          <p className="text-red-800">{error.message}</p>
          <button
            onClick={() => setError(null)}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4" />
            <p className="text-lg font-medium">Processing...</p>
          </div>
        </div>
      )}

      {/* Current Step */}
      <div className="checkout-step">{renderStep()}</div>

      {/* Debug Panel */}
      {config.debugMode && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg max-w-md max-h-96 overflow-auto text-xs">
          <h4 className="font-bold mb-2">🐛 Debug Panel</h4>
          <div className="space-y-2">
            <div>
              <strong>Step:</strong> {currentStep}
            </div>
            <div>
              <strong>Products:</strong> {checkoutData.selectedProducts?.length || 0}
            </div>
            <div>
              <strong>Forms:</strong> {checkoutData.formResponses?.length || 0}
            </div>
            <div>
              <strong>Customer:</strong> {checkoutData.customerInfo?.email || "None"}
            </div>
            <div>
              <strong>Workflows:</strong> {workflows?.length || 0} active
            </div>
            <div>
              <strong>Workflow Behaviors:</strong> {workflowBehaviors?.length || 0}
            </div>
            <div>
              <strong>Behaviors Executed:</strong> {checkoutData.behaviorResults?.results.length || 0}
            </div>
            {workflowBehaviors && (
              <details>
                <summary className="cursor-pointer">Workflow Behaviors</summary>
                <pre className="mt-2 p-2 bg-gray-800 rounded overflow-auto">
                  {JSON.stringify(workflowBehaviors, null, 2)}
                </pre>
              </details>
            )}
            {checkoutData.behaviorResults && (
              <details>
                <summary className="cursor-pointer">Execution Results</summary>
                <pre className="mt-2 p-2 bg-gray-800 rounded overflow-auto">
                  {JSON.stringify(checkoutData.behaviorResults, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BehaviorDrivenCheckout;
