"use client";

import { Zap } from "lucide-react";

interface CreditBalanceProps {
  dailyCredits: number;
  monthlyCredits: number;
  monthlyCreditsTotal: number;
  purchasedCredits: number;
  totalCredits: number;
  isUnlimited?: boolean;
  /**
   * Compact mode shows just the total in a pill.
   * Full mode shows the breakdown bar.
   */
  variant?: "compact" | "full";
}

/**
 * CREDIT BALANCE COMPONENT
 *
 * Displays the user's credit balance with a visual breakdown.
 * Used in the store window, agent UI, and navigation bar.
 */
export function CreditBalance({
  dailyCredits,
  monthlyCredits,
  monthlyCreditsTotal,
  purchasedCredits,
  totalCredits,
  isUnlimited = false,
  variant = "full",
}: CreditBalanceProps) {
  if (isUnlimited) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "var(--success)" }}>
        <Zap size={14} />
        <span>Unlimited Credits</span>
      </div>
    );
  }

  if (variant === "compact") {
    const isLow = totalCredits <= 5;
    return (
      <div
        className="flex items-center gap-1.5 px-2 py-1 border-2 text-xs font-bold"
        style={{
          borderColor: isLow ? "var(--warning)" : "var(--shell-border)",
          background: isLow ? "var(--warning-bg)" : "var(--shell-surface-elevated)",
          color: isLow ? "var(--warning)" : "var(--shell-text)",
        }}
      >
        <Zap size={12} />
        <span>{totalCredits}</span>
      </div>
    );
  }

  // Full variant with breakdown bar
  const maxCredits = monthlyCreditsTotal + 5 + purchasedCredits || 1; // avoid div by 0
  const dailyPct = (dailyCredits / maxCredits) * 100;
  const monthlyPct = (monthlyCredits / maxCredits) * 100;
  const purchasedPct = (purchasedCredits / maxCredits) * 100;
  const usedPct = 100 - dailyPct - monthlyPct - purchasedPct;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "var(--shell-text)" }}>
          <Zap size={14} style={{ color: "var(--primary)" }} />
          <span>Credits: {totalCredits}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-3 border-2 flex overflow-hidden"
        style={{ borderColor: "var(--shell-border)", background: "var(--shell-surface-elevated)" }}
      >
        {dailyPct > 0 && (
          <div
            className="h-full"
            style={{ width: `${dailyPct}%`, background: "var(--info)" }}
            title={`Daily: ${dailyCredits}`}
          />
        )}
        {monthlyPct > 0 && (
          <div
            className="h-full"
            style={{ width: `${monthlyPct}%`, background: "var(--primary)" }}
            title={`Monthly: ${monthlyCredits}`}
          />
        )}
        {purchasedPct > 0 && (
          <div
            className="h-full"
            style={{ width: `${purchasedPct}%`, background: "var(--success)" }}
            title={`Purchased: ${purchasedCredits}`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-xs" style={{ color: "var(--shell-text-muted)" }}>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2" style={{ background: "var(--info)" }} />
          Daily: {dailyCredits}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2" style={{ background: "var(--primary)" }} />
          Monthly: {monthlyCredits}
        </span>
        {purchasedCredits > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2" style={{ background: "var(--success)" }} />
            Purchased: {purchasedCredits}
          </span>
        )}
      </div>
    </div>
  );
}
