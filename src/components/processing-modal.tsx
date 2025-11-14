"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

interface ProcessingModalProps {
  isOpen: boolean;
  isInvoicePayment?: boolean;
}

interface Step {
  id: number;
  icon: string;
  message: string;
  duration: number; // milliseconds to spend on this step
}

// ✅ Move steps outside component to prevent infinite loop
// These arrays are static and never change, so they should only be created once
const INVOICE_STEPS: Step[] = [
  {
    id: 0,
    icon: "📋",
    message: "Crafting a beautiful invoice for you...",
    duration: 1500,
  },
  {
    id: 1,
    icon: "🎫",
    message: "Generating your tickets (the fun part!)...",
    duration: 1500,
  },
  {
    id: 2,
    icon: "📧",
    message: "Preparing confirmation emails...",
    duration: 1500,
  },
  {
    id: 3,
    icon: "✨",
    message: "Adding some magic sparkle...",
    duration: 1500,
  },
];

const CARD_STEPS: Step[] = [
  {
    id: 0,
    icon: "💳",
    message: "Securely processing your payment...",
    duration: 2000,
  },
  {
    id: 1,
    icon: "🎫",
    message: "Creating your awesome tickets...",
    duration: 1500,
  },
  {
    id: 2,
    icon: "📧",
    message: "Sending you a lovely confirmation email...",
    duration: 1500,
  },
  {
    id: 3,
    icon: "🎉",
    message: "Almost there! Wrapping things up...",
    duration: 1000,
  },
];

export function ProcessingModal({ isOpen, isInvoicePayment = false }: ProcessingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = isInvoicePayment ? INVOICE_STEPS : CARD_STEPS;

  // Progress through steps automatically
  useEffect(() => {
    if (!isOpen) {
      // Reset when modal closes
      setCurrentStep(0);
      setCompletedSteps([]);
      return;
    }

    if (currentStep >= steps.length) return;

    const currentStepData = steps[currentStep];
    const timer = setTimeout(() => {
      // Mark current step as completed
      setCompletedSteps((prev) => [...prev, currentStepData.id]);

      // Move to next step
      if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
      }
    }, currentStepData.duration);

    return () => clearTimeout(timer);
  }, [isOpen, currentStep, steps]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl border-4 border-purple-600 max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 size={32} className="animate-spin" />
            <h2 className="text-2xl font-bold">Working Our Magic...</h2>
          </div>
          <p className="text-purple-100 text-sm">
            {isInvoicePayment
              ? "Creating your invoice and tickets"
              : "Processing your payment and creating your tickets"}
          </p>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-4">
          {steps.map((step) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = currentStep === step.id;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all duration-300 ${
                  isCompleted
                    ? "border-green-400 bg-green-50"
                    : isCurrent
                    ? "border-purple-400 bg-purple-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                {/* Icon/Status */}
                <div className="flex-shrink-0">
                  {isCompleted ? (
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
                        isCompleted
                          ? "text-green-900"
                          : isCurrent
                          ? "text-purple-900"
                          : "text-gray-400"
                      }`}
                    >
                      {step.message}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center border-t-2 border-gray-200">
          <p className="text-sm text-gray-600">
            {completedSteps.length === steps.length ? (
              <span className="text-green-600 font-bold">All done! Redirecting you now...</span>
            ) : (
              <>Please don&apos;t close this window or refresh the page</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
