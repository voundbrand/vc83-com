"use client";

import { Zap, ShoppingBag, ArrowUpCircle } from "lucide-react";
import { useWindowManager } from "@/hooks/use-window-manager";

interface CreditWallProps {
  /**
   * Number of queued agent tasks waiting for credits
   */
  queuedTasks?: number;
  /**
   * Current tier name
   */
  currentTier: string;
  /**
   * Credits needed for the blocked action
   */
  creditsRequired?: number;
  /**
   * Credits currently available
   */
  creditsAvailable?: number;
  /**
   * Callback when user clicks "Buy Credits"
   */
  onBuyCredits?: () => void;
  /**
   * Callback when user clicks "Upgrade Plan"
   */
  onUpgrade?: () => void;
}

/**
 * CREDIT WALL COMPONENT
 *
 * Displayed when a user runs out of credits and agent actions are paused.
 * Shows queued tasks and provides upgrade/purchase CTAs.
 *
 * This is the key conversion moment in the funnel:
 * "Your agents are paused - upgrade to keep them running"
 */
export function CreditWall({
  queuedTasks = 0,
  currentTier,
  creditsRequired,
  creditsAvailable = 0,
  onBuyCredits,
  onUpgrade,
}: CreditWallProps) {
  const { openWindow } = useWindowManager();

  const handleOpenStore = () => {
    import("@/components/window-content/store-window").then(({ StoreWindow }) => {
      openWindow(
        "store",
        "Platform Store",
        <StoreWindow />,
        { x: 100, y: 100 },
        { width: 900, height: 600 }
      );
    });
  };

  const tierUpgrade: Record<string, { name: string; credits: number; price: string }> = {
    free: { name: "Pro", credits: 200, price: "€29/mo" },
    pro: { name: "Agency", credits: 2000, price: "€299/mo" },
    agency: { name: "Enterprise", credits: -1, price: "Custom" },
  };

  const upgrade = tierUpgrade[currentTier];

  return (
    <div
      className="border-2 p-4"
      style={{
        borderColor: "var(--warning)",
        background: "linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, transparent 100%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(245, 158, 11, 0.15)" }}
        >
          <Zap size={18} style={{ color: "var(--warning)" }} />
        </div>
        <div>
          <h4 className="text-sm font-bold" style={{ color: "var(--warning)" }}>
            Credits Exhausted
          </h4>
          <p className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>
            Your agents are paused
          </p>
        </div>
      </div>

      {/* Status */}
      <div
        className="border-2 p-3 mb-3 space-y-1"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
        }}
      >
        {creditsRequired !== undefined && (
          <p className="text-xs" style={{ color: "var(--win95-text)" }}>
            Action requires <strong>{creditsRequired}</strong> credit(s), you have{" "}
            <strong>{creditsAvailable}</strong>.
          </p>
        )}
        {queuedTasks > 0 && (
          <p className="text-xs" style={{ color: "var(--warning)" }}>
            {queuedTasks} task{queuedTasks !== 1 ? "s" : ""} queued and waiting for credits.
          </p>
        )}
      </div>

      {/* CTAs */}
      <div className="flex gap-2">
        {/* Quick: Buy credit pack */}
        <button
          onClick={onBuyCredits || handleOpenStore}
          className="beveled-button flex-1 px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5"
          style={{
            background: "var(--primary)",
            color: "white",
          }}
        >
          <ShoppingBag size={14} />
          Buy Credits
        </button>

        {/* Upgrade plan */}
        {upgrade && (
          <button
            onClick={onUpgrade || handleOpenStore}
            className="beveled-button flex-1 px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5"
            style={{
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            <ArrowUpCircle size={14} />
            Upgrade to {upgrade.name} ({upgrade.price})
          </button>
        )}
      </div>

      {/* Value proposition */}
      {upgrade && (
        <p className="text-xs mt-2 text-center" style={{ color: "var(--win95-text-secondary)" }}>
          {upgrade.credits === -1
            ? "Unlimited credits with Enterprise"
            : `${upgrade.name} includes ${upgrade.credits} credits/month`}
        </p>
      )}
    </div>
  );
}
