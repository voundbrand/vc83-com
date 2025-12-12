"use client";

import { X, Check, Lock, AlertTriangle, Loader2, Building2, User } from "lucide-react";
import { useState } from "react";
import { EnterpriseContactModal } from "./enterprise-contact-modal";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: "standard" | "privacy-enhanced" | "private-llm" | null;
  onSelectTier: (tier: "standard" | "privacy-enhanced", b2bData?: {
    isB2B: boolean;
  }) => void;
}

export function SubscriptionModal({
  isOpen,
  onClose,
  currentTier,
  onSelectTier,
}: SubscriptionModalProps) {
  const [selectedTier, setSelectedTier] = useState<"standard" | "privacy-enhanced" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [enterpriseTier, setEnterpriseTier] = useState<"starter" | "professional" | "enterprise">("starter");

  // B2B checkout state - Stripe handles VAT collection
  const [isB2B, setIsB2B] = useState(false);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    if (!selectedTier) return;

    setIsProcessing(true);

    try {
      // Just pass isB2B flag - Stripe checkout handles VAT/tax ID collection
      const b2bData = { isB2B };

      await onSelectTier(selectedTier, b2bData);
      // Modal will be closed by parent component after successful subscription
    } catch (error) {
      console.error("Subscription failed:", error);
      setIsProcessing(false);
    }
  };

  const handleEnterpriseClick = (tier: "starter" | "professional" | "enterprise") => {
    setEnterpriseTier(tier);
    setShowEnterpriseModal(true);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
      >
        <div
          className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto border-4"
          style={{
            backgroundColor: "var(--win95-bg)",
            borderColor: "var(--win95-border)",
          }}
        >
          {/* Window Title Bar */}
          <div
            className="flex items-center justify-between px-3 py-2 border-b-2"
            style={{
              backgroundColor: "var(--primary)",
              borderColor: "var(--win95-border)",
            }}
          >
            <span className="text-sm font-bold" style={{ color: "white" }}>
              Subscribe to AI Features
            </span>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="beveled-button w-6 h-6 flex items-center justify-center"
              style={{
                backgroundColor: "var(--win95-button-face)",
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                Choose Your AI Plan
              </h2>
              <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
                {isB2B ? "Business checkout • VAT handled via reverse charge" : "All prices include 19% German VAT"} • 500,000 tokens included monthly
              </p>
            </div>

            {/* B2B Toggle */}
            <div className="mb-6 flex justify-center">
              <div className="inline-flex border-2" style={{ borderColor: "var(--win95-border)" }}>
                <button
                  onClick={() => setIsB2B(false)}
                  className="px-4 py-2 text-sm font-bold flex items-center gap-2"
                  style={{
                    backgroundColor: !isB2B ? "var(--primary)" : "var(--win95-button-face)",
                    color: !isB2B ? "white" : "var(--win95-text)",
                    borderRight: "2px solid",
                    borderRightColor: "var(--win95-border)",
                  }}
                >
                  <User size={14} />
                  Personal/Consumer
                </button>
                <button
                  onClick={() => setIsB2B(true)}
                  className="px-4 py-2 text-sm font-bold flex items-center gap-2"
                  style={{
                    backgroundColor: isB2B ? "var(--primary)" : "var(--win95-button-face)",
                    color: isB2B ? "white" : "var(--win95-text)",
                  }}
                >
                  <Building2 size={14} />
                  Business (B2B)
                </button>
              </div>
            </div>

            {/* Tier Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {/* Standard Tier */}
              <div
                className="p-4 border-4 cursor-pointer transition-all"
                style={{
                  borderColor: selectedTier === "standard" ? "var(--primary)" : "var(--win95-border)",
                  backgroundColor: selectedTier === "standard" ? "var(--info)" : "var(--win95-bg-light)",
                }}
                onClick={() => setSelectedTier("standard")}
              >
                <div className="text-center mb-4">
                  <h3 className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                    Standard
                  </h3>
                  <p className="text-2xl font-bold mb-2" style={{ color: "var(--primary)" }}>
                    €49
                  </p>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    per month
                  </p>
                </div>

                <ul className="text-xs space-y-2 mb-4" style={{ color: "var(--win95-text)" }}>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>All 16 AI models</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>500K tokens/month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>Global routing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>Best performance</span>
                  </li>
                </ul>

                {selectedTier === "standard" && (
                  <div
                    className="text-xs font-bold text-center py-2"
                    style={{
                      backgroundColor: "var(--primary)",
                      color: "white",
                    }}
                  >
                    SELECTED
                  </div>
                )}
              </div>

              {/* Privacy-Enhanced Tier */}
              <div
                className="p-4 border-4 cursor-pointer transition-all relative"
                style={{
                  borderColor: selectedTier === "privacy-enhanced" ? "var(--primary)" : "var(--win95-border)",
                  backgroundColor: selectedTier === "privacy-enhanced" ? "var(--info)" : "var(--win95-bg-light)",
                }}
                onClick={() => setSelectedTier("privacy-enhanced")}
              >
                <div
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-2 py-0.5 text-xs font-bold"
                  style={{
                    backgroundColor: "var(--success)",
                    color: "white",
                  }}
                >
                  RECOMMENDED
                </div>

                <div className="text-center mb-4 mt-2">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Lock size={14} style={{ color: "var(--primary)" }} />
                    <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                      Privacy-Enhanced
                    </h3>
                  </div>
                  <p className="text-2xl font-bold mb-2" style={{ color: "var(--primary)" }}>
                    €49
                  </p>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    per month
                  </p>
                </div>

                <ul className="text-xs space-y-2 mb-4" style={{ color: "var(--win95-text)" }}>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>6 GDPR-compliant models</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>500K tokens/month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>🇪🇺 EU providers prioritized</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>🛡️ Zero Data Retention</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>🚫 No training on data</span>
                  </li>
                </ul>

                {selectedTier === "privacy-enhanced" && (
                  <div
                    className="text-xs font-bold text-center py-2"
                    style={{
                      backgroundColor: "var(--primary)",
                      color: "white",
                    }}
                  >
                    SELECTED
                  </div>
                )}
              </div>

              {/* Private LLM - Starter */}
              <div
                className="p-4 border-4 opacity-90"
                style={{
                  borderColor: "var(--win95-border)",
                  backgroundColor: "var(--win95-bg-light)",
                }}
              >
                <div className="text-center mb-4">
                  <h3 className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                    Private LLM
                  </h3>
                  <p className="text-xs font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                    Starter
                  </p>
                  <p className="text-2xl font-bold mb-2" style={{ color: "var(--primary)" }}>
                    €2,999
                  </p>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    per month
                  </p>
                </div>

                <ul className="text-xs space-y-2 mb-4" style={{ color: "var(--win95-text)" }}>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>Self-hosted AI</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>~50K requests/month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>Scale-to-zero compute</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>Full data sovereignty</span>
                  </li>
                </ul>

                <button
                  onClick={() => handleEnterpriseClick("starter")}
                  className="beveled-button w-full px-3 py-2 text-xs font-bold"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "white",
                  }}
                >
                  Contact Sales
                </button>
              </div>

              {/* Private LLM - Professional */}
              <div
                className="p-4 border-4 opacity-90"
                style={{
                  borderColor: "var(--win95-border)",
                  backgroundColor: "var(--win95-bg-light)",
                }}
              >
                <div className="text-center mb-4">
                  <h3 className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                    Private LLM
                  </h3>
                  <p className="text-xs font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                    Professional
                  </p>
                  <p className="text-2xl font-bold mb-2" style={{ color: "var(--primary)" }}>
                    €7,199
                  </p>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    per month
                  </p>
                </div>

                <ul className="text-xs space-y-2 mb-4" style={{ color: "var(--win95-text)" }}>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>Dedicated GPU infrastructure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>~200K requests/month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>99.5% SLA</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>Priority support</span>
                  </li>
                </ul>

                <button
                  onClick={() => handleEnterpriseClick("professional")}
                  className="beveled-button w-full px-3 py-2 text-xs font-bold"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "white",
                  }}
                >
                  Contact Sales
                </button>
              </div>

              {/* Private LLM - Enterprise */}
              <div
                className="p-4 border-4 opacity-90"
                style={{
                  borderColor: "var(--win95-border)",
                  backgroundColor: "var(--win95-bg-light)",
                }}
              >
                <div className="text-center mb-4">
                  <h3 className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                    Private LLM
                  </h3>
                  <p className="text-xs font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                    Enterprise
                  </p>
                  <p className="text-2xl font-bold mb-2" style={{ color: "var(--primary)" }}>
                    €14,999
                  </p>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    per month
                  </p>
                </div>

                <ul className="text-xs space-y-2 mb-4" style={{ color: "var(--win95-text)" }}>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>Custom infrastructure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>Unlimited requests</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>Dedicated support team</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                    <span>Custom SLA</span>
                  </li>
                </ul>

                <button
                  onClick={() => handleEnterpriseClick("enterprise")}
                  className="beveled-button w-full px-3 py-2 text-xs font-bold"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "white",
                  }}
                >
                  Contact Sales
                </button>
              </div>
            </div>

            {/* B2B Info Note */}
            {isB2B && selectedTier && (
              <div className="mb-6 p-4 border-2" style={{ borderColor: "var(--win95-border)", backgroundColor: "var(--info)" }}>
                <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  🏢 Business Checkout Selected
                </p>
                <p className="text-xs" style={{ color: "var(--win95-text)" }}>
                  You'll be able to enter your VAT/Tax ID on the next page. If you provide a valid EU VAT number, the reverse charge mechanism applies and you'll pay €0 VAT.
                </p>
              </div>
            )}

            {/* Warning about tier change */}
            {currentTier && (
              <div
                className="p-3 mb-4 border-2 flex items-start gap-2"
                style={{
                  backgroundColor: "var(--warning)",
                  borderColor: "var(--win95-border)",
                }}
              >
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <div className="text-xs" style={{ color: "var(--win95-text)" }}>
                  <p className="font-bold mb-1">Plan Change</p>
                  <p>
                    You currently have the <strong>{currentTier}</strong> plan.
                    Changing plans will take effect immediately and you'll be charged a prorated amount.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="beveled-button px-4 py-2 text-sm font-bold"
                style={{
                  backgroundColor: "var(--win95-button-face)",
                  color: "var(--win95-text)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubscribe}
                disabled={!selectedTier || isProcessing}
                className="beveled-button px-4 py-2 text-sm font-bold flex items-center gap-2"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "white",
                  opacity: !selectedTier || isProcessing ? 0.5 : 1,
                  cursor: !selectedTier || isProcessing ? "not-allowed" : "pointer",
                }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Continue to Payment</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Contact Modal */}
      <EnterpriseContactModal
        isOpen={showEnterpriseModal}
        onClose={() => setShowEnterpriseModal(false)}
        title="Private LLM Hosting"
      />
    </>
  );
}
