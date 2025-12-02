"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Loader2, Gift, AlertCircle, CheckCircle, Info, ArrowRight } from "lucide-react";

interface ManualSubscriptionGrantProps {
  organizationId: Id<"organizations">;
  sessionId: string;
}

export function ManualSubscriptionGrant({
  organizationId,
  sessionId,
}: ManualSubscriptionGrantProps) {
  const [tier, setTier] = useState<string>("none");
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [isGranting, setIsGranting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch current subscription status
  const currentSubscription = useQuery(
    api.ai.billing.getSubscriptionStatus,
    { organizationId }
  );

  const grantSubscription = useMutation(api.ai.manualGrants.grantManualSubscription);

  // Initialize form from database when subscription loads
  useEffect(() => {
    if (currentSubscription) {
      if (currentSubscription.hasSubscription && currentSubscription.tier) {
        // Has subscription - set to current tier
        const currentTier = currentSubscription.tier === "private-llm"
          ? `private-llm-${currentSubscription.privateLLMTier || "starter"}`
          : currentSubscription.tier;
        setTier(currentTier);
        setCustomPrice((currentSubscription.priceInCents || 0) / 100);
      } else {
        // No subscription - set to none
        setTier("none");
        setCustomPrice(0);
      }
    }
  }, [currentSubscription]);

  const handleGrant = async () => {
    if (!notes.trim()) {
      setStatusMessage({ type: "error", text: "Please add internal notes explaining this grant" });
      return;
    }

    if (tier === "none") {
      setStatusMessage({
        type: "error",
        text: "Removing subscriptions not yet implemented. For now, let the subscription expire naturally or contact support."
      });
      return;
    }

    setIsGranting(true);
    setStatusMessage(null);

    try {
      await grantSubscription({
        sessionId,
        organizationId,
        tier: tier as any,
        priceInCents: customPrice * 100,
        startDate: Date.now(),
        endDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        internalNotes: notes,
      });

      setStatusMessage({ type: "success", text: "Subscription granted successfully!" });
      setNotes("");
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error) {
      setStatusMessage({ type: "error", text: (error as Error).message });
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <div
      className="border-2 p-4"
      style={{
        borderColor: "var(--win95-border)",
        background: "var(--win95-bg-light)",
      }}
    >
      <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
        <Gift size={14} />
        Grant AI Subscription Manually
      </h4>

      {/* Current Subscription Status */}
      {currentSubscription ? (
        <div
          className="mb-4 p-3 border-2"
          style={{
            borderColor: currentSubscription.hasSubscription ? "var(--success)" : "var(--warning)",
            background: currentSubscription.hasSubscription ? "rgba(34, 197, 94, 0.1)" : "rgba(251, 191, 36, 0.1)",
          }}
        >
          <div className="flex items-start gap-2 mb-2">
            <Info size={14} style={{ color: "var(--win95-text)", marginTop: "2px" }} />
            <div className="flex-1">
              <div className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                Current Status:
              </div>
              {currentSubscription.hasSubscription && currentSubscription.tier ? (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span style={{ color: "var(--neutral-gray)" }}>Tier:</span>
                    <span className="font-bold" style={{ color: "var(--win95-text)" }}>
                      {currentSubscription.tier === "standard" && "Standard"}
                      {currentSubscription.tier === "privacy-enhanced" && "Privacy-Enhanced"}
                      {currentSubscription.tier === "private-llm" &&
                        `Private LLM ${currentSubscription.privateLLMTier ? `(${currentSubscription.privateLLMTier})` : ""}`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--neutral-gray)" }}>Status:</span>
                    <span
                      className="font-bold px-1.5 py-0.5"
                      style={{
                        background: currentSubscription.status === "active" ? "var(--success)" : "var(--error)",
                        color: "white",
                      }}
                    >
                      {currentSubscription.status?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--neutral-gray)" }}>Price:</span>
                    <span className="font-mono" style={{ color: "var(--win95-text)" }}>
                      €{((currentSubscription.priceInCents || 0) / 100).toFixed(2)}/month
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--neutral-gray)" }}>Period End:</span>
                    <span style={{ color: "var(--win95-text)" }}>
                      {currentSubscription.currentPeriodEnd
                        ? new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()
                        : "N/A"
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t" style={{ borderColor: "var(--win95-border)" }}>
                    <AlertCircle size={12} style={{ color: "var(--warning)" }} />
                    <span style={{ color: "var(--warning)", fontSize: "11px" }}>
                      Granting will <strong>override</strong> this subscription
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  No active subscription. Organization is using BYOK mode.
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t" style={{ borderColor: "var(--win95-border)" }}>
                    <CheckCircle size={12} style={{ color: "var(--success)" }} />
                    <span style={{ color: "var(--success)", fontSize: "11px" }}>
                      Granting will <strong>create</strong> a new subscription
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="mb-4 p-3 border-2 flex items-center justify-center gap-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg)",
          }}
        >
          <Loader2 size={14} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
          <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Loading current subscription...
          </span>
        </div>
      )}

      {statusMessage && (
        <div
          className="mb-4 p-3 text-xs flex items-center gap-2"
          style={{
            background: statusMessage.type === "success" ? "var(--success)" : "var(--error)",
            color: "white",
          }}
        >
          {statusMessage.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {statusMessage.text}
        </div>
      )}

      <div className="space-y-4">
        {/* Tier Selection */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Subscription Tier
          </label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="w-full px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
          >
            <option value="none">None - Remove/Cancel Subscription (BYOK mode)</option>
            <option value="standard">Standard (€49/month - 500K tokens)</option>
            <option value="privacy-enhanced">Privacy-Enhanced (€49/month - 500K tokens)</option>
            <option value="private-llm-starter">Private LLM Starter (€2,500/month - 5M tokens)</option>
            <option value="private-llm-professional">Private LLM Pro (€6,000/month - 10M tokens)</option>
            <option value="private-llm-enterprise">Private LLM Enterprise (€12,000/month - Unlimited)</option>
          </select>
          {tier === "none" && (
            <p className="text-xs mt-2 p-2 border" style={{
              color: "var(--warning)",
              borderColor: "var(--warning)",
              background: "rgba(251, 191, 36, 0.1)"
            }}>
              <strong>Warning:</strong> This will cancel the subscription and switch to BYOK mode.
              Organization will need to provide their own API keys.
            </p>
          )}
        </div>

        {/* Custom Price */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Custom Price (€) - Set to 0 for free
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={customPrice}
            onChange={(e) => setCustomPrice(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
            placeholder="0"
          />
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Retail value will be tracked automatically. Set custom price for special deals or 0 for free.
          </p>
        </div>

        {/* Internal Notes */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            Internal Notes (Required)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm border-2 h-24 resize-none"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
            placeholder="Why are we granting this? (e.g., Beta tester, enterprise deal, customer service)"
          />
        </div>

        {/* Grant Button */}
        <button
          onClick={handleGrant}
          disabled={isGranting || !notes.trim()}
          className="w-full px-4 py-2.5 text-sm font-bold border-2 flex items-center justify-center gap-2"
          style={{
            background: isGranting || !notes.trim() ? "var(--win95-bg-light)" : tier === "none" ? "var(--error)" : "var(--success)",
            color: isGranting || !notes.trim() ? "var(--neutral-gray)" : "white",
            borderTopColor: "var(--win95-button-light)",
            borderLeftColor: "var(--win95-button-light)",
            borderBottomColor: "var(--win95-button-dark)",
            borderRightColor: "var(--win95-button-dark)",
            cursor: isGranting || !notes.trim() ? "not-allowed" : "pointer",
          }}
        >
          {isGranting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {tier === "none" ? "Removing Subscription..." : "Granting Subscription..."}
            </>
          ) : (
            <>
              <Gift size={14} />
              {tier === "none" ? "Remove Subscription" : "Grant Subscription"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
