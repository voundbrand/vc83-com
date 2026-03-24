"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { Id } from "../../convex/_generated/dataModel";
import {
  RefreshCw,
  CreditCard,
  AlertTriangle,
  Check,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  calculateCreditsFromAmount,
  PRESET_AMOUNTS,
} from "@/lib/credit-pricing";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = (require("../../convex/_generated/api") as { api: any }).api;

interface AutoReplenishSettingsProps {
  organizationId: Id<"organizations">;
}

type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

export function AutoReplenishSettings({
  organizationId,
}: AutoReplenishSettingsProps) {
  const status = useQuery(api.credits.autoReplenish.getAutoReplenishStatus, {
    organizationId,
  });

  const enableAutoReplenish = useMutation(
    api.credits.autoReplenish.enableAutoReplenish
  );
  const disableAutoReplenish = useMutation(
    api.credits.autoReplenish.disableAutoReplenish
  );
  const updateAutoReplenish = useMutation(
    api.credits.autoReplenish.updateAutoReplenish
  );
  const listPaymentMethodsAction = useAction(
    api.credits.autoReplenish.listPaymentMethods
  );

  const [threshold, setThreshold] = useState(50);
  const [amountEur, setAmountEur] = useState<number>(60);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync form state with server status
  useEffect(() => {
    if (status?.configured) {
      setThreshold(status.thresholdCredits);
      setAmountEur(status.amountEur);
    }
  }, [status]);

  // Load payment methods
  useEffect(() => {
    let cancelled = false;
    setIsLoadingMethods(true);
    listPaymentMethodsAction({ organizationId })
      .then((result) => {
        if (!cancelled) {
          setPaymentMethods(result.methods);
          if (result.methods.length > 0 && !selectedMethodId) {
            setSelectedMethodId(result.methods[0].id);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load payment methods:", err);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMethods(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, listPaymentMethodsAction]);

  const creditPreview = calculateCreditsFromAmount(amountEur);

  const handleEnable = async () => {
    if (!selectedMethodId) {
      setError("Please select a payment method.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await enableAutoReplenish({
        organizationId,
        thresholdCredits: threshold,
        amountEur,
        stripePaymentMethodId: selectedMethodId,
      });
      setSuccessMessage("Auto-replenish enabled.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "Failed to enable auto-replenish.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisable = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await disableAutoReplenish({ organizationId });
      setSuccessMessage("Auto-replenish disabled.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "Failed to disable auto-replenish.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await updateAutoReplenish({
        organizationId,
        thresholdCredits: threshold,
        amountEur,
        ...(selectedMethodId && { stripePaymentMethodId: selectedMethodId }),
      });
      setSuccessMessage("Settings updated.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "Failed to update settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!status) {
    return (
      <div className="flex items-center gap-2 py-4 justify-center">
        <Loader2
          size={16}
          className="animate-spin"
          style={{ color: "var(--neutral-gray)" }}
        />
        <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Loading auto-replenish settings...
        </span>
      </div>
    );
  }

  const isEnabled = status.configured && status.enabled;
  const isCircuitBroken = status.configured && status.isCircuitBroken;
  const hasPaymentMethods = paymentMethods.length > 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw size={14} style={{ color: isEnabled ? "var(--success)" : "var(--neutral-gray)" }} />
          <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
            Auto-Replenish
          </span>
          {isEnabled && (
            <span
              className="px-1.5 py-0.5 text-[10px] font-bold rounded"
              style={{ background: "var(--success)", color: "white" }}
            >
              Active
            </span>
          )}
          {isCircuitBroken && (
            <span
              className="px-1.5 py-0.5 text-[10px] font-bold rounded"
              style={{ background: "var(--error)", color: "white" }}
            >
              Paused
            </span>
          )}
        </div>
      </div>

      {/* Circuit breaker warning */}
      {isCircuitBroken && (
        <div
          className="flex items-start gap-2 p-2 border-2 text-xs"
          style={{
            borderColor: "var(--error)",
            background: "rgba(239, 68, 68, 0.08)",
            color: "var(--error)",
          }}
        >
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold">Auto-replenish paused</span> after{" "}
            {status.configured ? status.consecutiveFailures : 0} consecutive payment failures.
            {status.configured && status.lastFailureReason && (
              <span className="block mt-1 opacity-80">
                Last error: {status.lastFailureReason}
              </span>
            )}
            <span className="block mt-1">
              Update your payment method and re-enable to resume.
            </span>
          </div>
        </div>
      )}

      {/* Configuration form */}
      <div className="space-y-2">
        {/* Threshold */}
        <div>
          <label className="text-[10px] font-bold block mb-1" style={{ color: "var(--neutral-gray)" }}>
            Trigger when balance drops below
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={10000}
              value={threshold}
              onChange={(e) => setThreshold(Math.max(1, parseInt(e.target.value) || 1))}
              className="desktop-interior-input w-20 text-xs py-1 px-2"
              style={{
                background: "var(--window-document-bg)",
                border: "1px solid var(--window-document-border)",
                color: "var(--window-document-text)",
              }}
            />
            <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              credits
            </span>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-[10px] font-bold block mb-1" style={{ color: "var(--neutral-gray)" }}>
            Auto-purchase amount
          </label>
          <div className="relative">
            <select
              value={amountEur}
              onChange={(e) => setAmountEur(Number(e.target.value))}
              className="desktop-interior-input w-full text-xs py-1 px-2 pr-6 appearance-none"
              style={{
                background: "var(--window-document-bg)",
                border: "1px solid var(--window-document-border)",
                color: "var(--window-document-text)",
              }}
            >
              {PRESET_AMOUNTS.map((amt) => {
                const preview = calculateCreditsFromAmount(amt);
                return (
                  <option key={amt} value={amt}>
                    EUR {amt} = {preview.credits.toLocaleString()} credits
                    {preview.bonus > 0 ? ` (+${preview.bonus} bonus)` : ""}
                  </option>
                );
              })}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--neutral-gray)" }}
            />
          </div>
        </div>

        {/* Payment method */}
        <div>
          <label className="text-[10px] font-bold block mb-1" style={{ color: "var(--neutral-gray)" }}>
            Payment method
          </label>
          {isLoadingMethods ? (
            <div className="flex items-center gap-1 py-1">
              <Loader2 size={12} className="animate-spin" style={{ color: "var(--neutral-gray)" }} />
              <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                Loading cards...
              </span>
            </div>
          ) : hasPaymentMethods ? (
            <div className="relative">
              <select
                value={selectedMethodId}
                onChange={(e) => setSelectedMethodId(e.target.value)}
                className="desktop-interior-input w-full text-xs py-1 px-2 pr-6 appearance-none"
                style={{
                  background: "var(--window-document-bg)",
                  border: "1px solid var(--window-document-border)",
                  color: "var(--window-document-text)",
                }}
              >
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.brand.charAt(0).toUpperCase() + m.brand.slice(1)} ****{m.last4} (
                    {String(m.expMonth).padStart(2, "0")}/{m.expYear})
                  </option>
                ))}
              </select>
              <CreditCard
                size={12}
                className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--neutral-gray)" }}
              />
            </div>
          ) : (
            <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
              No saved payment methods. Complete a manual credit purchase first to save a card.
            </p>
          )}
        </div>
      </div>

      {/* Error / Success messages */}
      {error && (
        <div
          className="text-[10px] p-1.5 border"
          style={{ borderColor: "var(--error)", color: "var(--error)", background: "rgba(239, 68, 68, 0.08)" }}
        >
          {error}
        </div>
      )}
      {successMessage && (
        <div
          className="text-[10px] p-1.5 border flex items-center gap-1"
          style={{ borderColor: "var(--success)", color: "var(--success)", background: "rgba(34, 197, 94, 0.08)" }}
        >
          <Check size={10} />
          {successMessage}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {isEnabled ? (
          <>
            <button
              onClick={handleUpdate}
              disabled={isSaving || !hasPaymentMethods}
              className="desktop-interior-button desktop-interior-button-primary flex-1 py-1.5 text-xs font-bold flex items-center justify-center gap-1"
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : null}
              Save Changes
            </button>
            <button
              onClick={handleDisable}
              disabled={isSaving}
              className="desktop-interior-button py-1.5 px-3 text-xs font-bold"
            >
              Disable
            </button>
          </>
        ) : (
          <button
            onClick={handleEnable}
            disabled={isSaving || !hasPaymentMethods}
            className="desktop-interior-button desktop-interior-button-primary w-full py-1.5 text-xs font-bold flex items-center justify-center gap-1"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Enable Auto-Replenish
          </button>
        )}
      </div>

      {/* Last triggered info */}
      {status.configured && status.lastTriggeredAt && (
        <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
          Last triggered:{" "}
          {new Date(status.lastTriggeredAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}
    </div>
  );
}
