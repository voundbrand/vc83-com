"use client";

import { Coins, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { calculateCreditsFromAmount, PRESET_AMOUNTS } from "@/lib/credit-pricing";

interface StoreCreditSectionProps {
  onPurchase: (amountEur: number, credits: number) => void;
  isProcessing: boolean;
}

export function StoreCreditSection({ onPurchase, isProcessing }: StoreCreditSectionProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");

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
        <div className="p-1.5 rounded" style={{ background: "var(--win95-bg-light)" }}>
          <Coins className="w-4 h-4" style={{ color: "var(--win95-highlight)" }} />
        </div>
        <div>
          <h3 className="font-pixel text-xs" style={{ color: "var(--win95-highlight)" }}>
            Buy Credits
          </h3>
          <p className="text-[10px]" style={{ color: "var(--win95-text-secondary)" }}>
            One-time purchase, never expire
          </p>
        </div>
      </div>

      <div
        className="rounded-lg p-4"
        style={{ background: "var(--win95-bg)", border: "1px solid var(--win95-border)" }}
      >
        {/* Preset Amounts */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {PRESET_AMOUNTS.map((amount) => {
            const calc = calculateCreditsFromAmount(amount);
            const isSelected = selectedAmount === amount;

            return (
              <button
                key={amount}
                onClick={() => handlePresetClick(amount)}
                className="rounded-lg p-3 text-center transition-all hover:shadow-md"
                style={{
                  background: isSelected
                    ? "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)"
                    : "var(--win95-bg-light)",
                  border: isSelected ? "2px solid var(--win95-highlight)" : "1px solid var(--win95-border)",
                  color: isSelected ? "white" : "var(--win95-text)",
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
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--win95-text-secondary)" }}>
              Or enter custom amount
            </label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium"
                style={{ color: "var(--win95-text-secondary)" }}
              >
                {"\u20AC"}
              </span>
              <input
                type="text"
                value={customAmount}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="1 - 10,000"
                className="w-full pl-7 pr-3 py-2 rounded text-xs focus:outline-none"
                style={{
                  background: "var(--win95-bg-light)",
                  border: `1px solid ${customAmount ? "var(--win95-highlight)" : "var(--win95-border)"}`,
                  color: "var(--win95-text)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Credit Calculation Display */}
        {calculation && activeAmount > 0 && (
          <div
            className="rounded-lg p-3 mb-4"
            style={{
              background: "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
            }}
          >
            <div className="flex items-center justify-between text-white">
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
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-white/20 font-bold">
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
          onClick={handlePurchase}
          disabled={!calculation || activeAmount < 1 || isProcessing}
          className="w-full py-2.5 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: calculation && activeAmount > 0
              ? "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)"
              : "var(--win95-bg-light)",
            color: calculation && activeAmount > 0 ? "white" : "var(--win95-text-secondary)",
            border: calculation && activeAmount > 0 ? "none" : "1px solid var(--win95-border)",
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
        <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--win95-border)" }}>
          <p className="text-[10px] font-medium mb-2" style={{ color: "var(--win95-text-secondary)" }}>
            Volume pricing
          </p>
          <div className="grid grid-cols-5 gap-1 text-center">
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
                style={{ background: "var(--win95-bg-light)" }}
              >
                <div className="text-[9px] font-bold" style={{ color: "var(--win95-highlight)" }}>
                  {tier.range}
                </div>
                <div className="text-[9px]" style={{ color: "var(--win95-text-secondary)" }}>
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
