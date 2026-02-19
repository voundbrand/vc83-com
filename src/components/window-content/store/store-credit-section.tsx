"use client";

import { Coins, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { calculateCreditsFromAmount, PRESET_AMOUNTS } from "@/lib/credit-pricing";

const ACCENT_BACKGROUND = "var(--tone-accent)";
const ACCENT_FOREGROUND = "#0f0f0f";

interface StoreCreditSectionProps {
  onPurchase: (amountEur: number, credits: number) => void;
  isProcessing: boolean;
}

export function StoreCreditSection({ onPurchase, isProcessing }: StoreCreditSectionProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const customAmountInputId = "store-credit-custom-amount";
  const customAmountHintId = "store-credit-custom-amount-hint";

  const activeAmount = selectedAmount ?? (customAmount ? parseInt(customAmount, 10) : 0);
  const calculation = activeAmount > 0 ? calculateCreditsFromAmount(activeAmount) : null;

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomChange = (value: string) => {
    const numValue = value.replace(/[^0-9]/g, "");
    setCustomAmount(numValue);
    setSelectedAmount(null);
  };

  const handlePurchase = () => {
    if (activeAmount > 0 && calculation) {
      onPurchase(activeAmount, calculation.credits);
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded" style={{ background: "var(--desktop-shell-accent)" }}>
          <Coins className="w-4 h-4" style={{ color: "var(--tone-accent-strong)" }} />
        </div>
        <div>
          <h3 className="font-pixel text-xs" style={{ color: "var(--window-document-text)" }}>
            Buy Credits
          </h3>
          <p className="text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            One-time purchase, never expire • VAT-inclusive display in EUR
          </p>
        </div>
      </div>

      <div
        className="rounded-lg p-4"
        style={{ background: "var(--window-document-bg)", border: "1px solid var(--window-document-border)" }}
      >
        {/* Preset Amounts */}
        <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-3 lg:grid-cols-5">
          {PRESET_AMOUNTS.map((amount) => {
            const calc = calculateCreditsFromAmount(amount);
            const isSelected = selectedAmount === amount;

            return (
              <button
                type="button"
                key={amount}
                onClick={() => handlePresetClick(amount)}
                aria-pressed={isSelected}
                aria-label={`Select preset ${amount} euros`}
                className="rounded-lg p-3 text-center transition-all hover:shadow-md"
                style={{
                  background: isSelected ? ACCENT_BACKGROUND : "var(--desktop-shell-accent)",
                  border: isSelected ? "2px solid var(--tone-accent-strong)" : "1px solid var(--window-document-border)",
                  color: isSelected ? ACCENT_FOREGROUND : "var(--window-document-text)",
                }}
              >
                <div className="font-pixel text-sm">{"\u20AC"}{amount}</div>
                <div className="text-[10px] mt-1 opacity-80">
                  {"\u2248"}{calc.credits.toLocaleString()}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Amount */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <label
              htmlFor={customAmountInputId}
              className="text-[10px] font-medium mb-1 block"
              style={{ color: "var(--desktop-menu-text-muted)" }}
            >
              Or enter custom amount
            </label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium"
                style={{ color: "var(--desktop-menu-text-muted)" }}
              >
                {"\u20AC"}
              </span>
              <input
                id={customAmountInputId}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={customAmount}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="1 - 10,000"
                aria-describedby={customAmountHintId}
                className="w-full pl-7 pr-3 py-2 rounded text-xs focus:outline-none"
                style={{
                  background: "var(--desktop-shell-accent)",
                  border: `1px solid ${customAmount ? "var(--tone-accent-strong)" : "var(--window-document-border)"}`,
                  color: "var(--window-document-text)",
                }}
              />
            </div>
            <p id={customAmountHintId} className="mt-1 text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Enter whole EUR amounts only.
            </p>
          </div>
        </div>

        {/* Credit Calculation Display */}
        {calculation && activeAmount > 0 && (
          <div
            className="rounded-lg p-3 mb-4"
            role="status"
            aria-live="polite"
            style={{
              background: ACCENT_BACKGROUND,
              border: "1px solid var(--tone-accent-strong)",
            }}
          >
            <div className="flex items-center justify-between" style={{ color: ACCENT_FOREGROUND }}>
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-pixel text-lg">
                    {calculation.credits.toLocaleString()} credits
                  </span>
                </div>
                <div className="text-[10px] mt-1 opacity-80">
                  {calculation.creditsPerEur} credits/EUR
                  {calculation.bonus > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(15, 15, 15, 0.14)" }}>
                      +{calculation.bonus.toLocaleString()} bonus
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-pixel text-lg">{"\u20AC"}{activeAmount}</div>
                <div className="text-[10px] opacity-80">one-time</div>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Button */}
        <button
          type="button"
          onClick={handlePurchase}
          disabled={!calculation || activeAmount < 1 || isProcessing}
          className="w-full py-2.5 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: calculation && activeAmount > 0 ? ACCENT_BACKGROUND : "var(--desktop-shell-accent)",
            color: calculation && activeAmount > 0 ? ACCENT_FOREGROUND : "var(--desktop-menu-text-muted)",
            border: `1px solid ${calculation && activeAmount > 0 ? "var(--tone-accent-strong)" : "var(--window-document-border)"}`,
          }}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Continue to Payment
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>

        {/* Tier table */}
        <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--window-document-border)" }}>
          <p className="text-[10px] font-medium mb-2" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Volume pricing
          </p>
          <div className="grid grid-cols-2 gap-1 text-center sm:grid-cols-3 lg:grid-cols-5">
            {[
              { range: "\u20AC1-29", rate: "10/\u20AC" },
              { range: "\u20AC30-99", rate: "11/\u20AC" },
              { range: "\u20AC100-249", rate: "11/\u20AC+100" },
              { range: "\u20AC250-499", rate: "12/\u20AC+500" },
              { range: "\u20AC500+", rate: "13/\u20AC+1.5K" },
            ].map((tier) => (
              <div
                key={tier.range}
                className="rounded p-1.5"
                style={{ background: "var(--desktop-shell-accent)" }}
              >
                <div className="text-[9px] font-bold" style={{ color: "var(--window-document-text)" }}>
                  {tier.range}
                </div>
                <div className="text-[9px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                  {tier.rate}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
