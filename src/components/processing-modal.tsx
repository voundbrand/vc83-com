"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface ProcessingModalProps {
  isOpen: boolean;
  isInvoicePayment?: boolean;
  checkoutSessionId: Id<"objects">;
  onComplete?: () => void;
}

interface Step {
  id: number;
  icon: string;
  messageKey: string;
}

// Steps for real progress tracking (maps to fulfillmentStep values 0-5)
const PROGRESS_STEPS: Step[] = [
  { id: 0, icon: "💳", messageKey: "ui.processing_modal.steps.real.0" },
  { id: 1, icon: "👤", messageKey: "ui.processing_modal.steps.real.1" },
  { id: 2, icon: "🎫", messageKey: "ui.processing_modal.steps.real.2" },
  { id: 3, icon: "📊", messageKey: "ui.processing_modal.steps.real.3" },
  { id: 4, icon: "📧", messageKey: "ui.processing_modal.steps.real.4" },
  { id: 5, icon: "🎉", messageKey: "ui.processing_modal.steps.real.5" },
];

export function ProcessingModal({
  isOpen,
  isInvoicePayment = false,
  checkoutSessionId,
  onComplete,
}: ProcessingModalProps) {
  const { t } = useNamespaceTranslations("ui.processing_modal");
  const [hasCalledComplete, setHasCalledComplete] = useState(false);

  // Query real progress from backend
  const progress = useQuery(
    api.checkoutSessionOntology.getCheckoutProgress,
    isOpen && checkoutSessionId ? { checkoutSessionId } : "skip"
  );

  const currentStep = progress?.fulfillmentStep ?? 0;
  const status = progress?.status;
  const fulfillmentStatus = progress?.fulfillmentStatus;

  // Build completed steps array
  const completedSteps: number[] = [];
  for (let i = 0; i < currentStep; i++) {
    completedSteps.push(i);
  }

  // Check states
  const hasError = fulfillmentStatus === "failed";
  const errorMessage = progress?.errorMessage;
  const isComplete = fulfillmentStatus === "completed" || status === "completed";

  // Handle completion
  useEffect(() => {
    if (isComplete && !hasCalledComplete) {
      setHasCalledComplete(true);
      // Small delay to show final state
      setTimeout(() => {
        onComplete?.();
      }, 1000);
    }
  }, [isComplete, hasCalledComplete, onComplete]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasCalledComplete(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl border-4 border-purple-600 max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div
          className={`p-6 text-white ${
            hasError
              ? "bg-gradient-to-r from-red-600 to-red-700"
              : "bg-gradient-to-r from-purple-600 to-purple-700"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            {hasError ? (
              <AlertCircle size={32} />
            ) : (
              <Loader2 size={32} className="animate-spin" />
            )}
            <h2 className="text-2xl font-bold">
              {hasError
                ? t("ui.processing_modal.header.title_error")
                : t("ui.processing_modal.header.title")}
            </h2>
          </div>
          <p className={hasError ? "text-red-100 text-sm" : "text-purple-100 text-sm"}>
            {hasError
              ? t("ui.processing_modal.header.subtitle_error")
              : isInvoicePayment
              ? t("ui.processing_modal.header.subtitle_invoice")
              : t("ui.processing_modal.header.subtitle_card")}
          </p>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-4">
          {hasError ? (
            <div className="p-4 rounded-lg border-2 border-red-400 bg-red-50">
              <p className="text-red-900 font-medium">
                {errorMessage || t("ui.processing_modal.footer.error_default")}
              </p>
            </div>
          ) : (
            PROGRESS_STEPS.map((step) => {
              const isStepCompleted = completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id && !isComplete;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all duration-300 ${
                    isStepCompleted
                      ? "border-green-400 bg-green-50"
                      : isCurrent
                      ? "border-purple-400 bg-purple-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  {/* Icon/Status */}
                  <div className="flex-shrink-0">
                    {isStepCompleted ? (
                      <CheckCircle2 size={24} className="text-green-600" />
                    ) : isCurrent ? (
                      <Loader2 size={24} className="text-purple-600 animate-spin" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-white" />
                    )}
                  </div>

                  {/* Message */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{step.icon}</span>
                      <p
                        className={`font-medium ${
                          isStepCompleted
                            ? "text-green-900"
                            : isCurrent
                            ? "text-purple-900"
                            : "text-gray-400"
                        }`}
                      >
                        {t(step.messageKey)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center border-t-2 border-gray-200">
          <p className="text-sm text-gray-600">
            {hasError ? (
              <span className="text-red-600 font-bold">
                {t("ui.processing_modal.footer.error")}
              </span>
            ) : isComplete ? (
              <span className="text-green-600 font-bold">
                {t("ui.processing_modal.footer.complete")}
              </span>
            ) : (
              <>{t("ui.processing_modal.footer.please_wait")}</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
