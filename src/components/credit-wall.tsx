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
  /**
   * Display style.
   * - full: legacy conversion panel
   * - notification: compact inline alert for dense views
   */
  variant?: "full" | "notification";
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
  variant = "full",
}: CreditWallProps) {
  const { openWindow } = useWindowManager();

  const handleOpenStore = (initialSection: "plans" | "credits") => {
    import("@/components/window-content/store-window").then(({ StoreWindow }) => {
      openWindow(
        "store",
        "Platform Store",
        <StoreWindow initialSection={initialSection} />,
        { x: 100, y: 100 },
        { width: 900, height: 600 }
      );
    });
  };

  const tierUpgrade: Record<string, { name: string; credits: number; price: string }> = {
    free: { name: "Pro", credits: 200, price: "€29/mo" },
    pro: { name: "Scale", credits: 2000, price: "€299/mo" },
    agency: { name: "Enterprise", credits: -1, price: "Custom" },
  };

  const upgrade = tierUpgrade[currentTier];
  const statusDetails: string[] = [];

  if (creditsRequired !== undefined) {
    statusDetails.push(`${creditsRequired} needed, ${creditsAvailable} available`);
  }
  if (queuedTasks > 0) {
    statusDetails.push(`${queuedTasks} queued task${queuedTasks !== 1 ? "s" : ""}`);
  }

  if (variant === "notification") {
    return (
      <div
        className="px-4 py-2 border-b-2 flex flex-wrap items-center gap-3"
        style={{
          borderColor: "var(--shell-border)",
          background: "var(--shell-surface-elevated)",
          boxShadow: "inset 3px 0 0 var(--warning)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--warning-bg)" }}
          >
            <Zap size={14} style={{ color: "var(--warning)" }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight" style={{ color: "var(--shell-text)" }}>
              Credits exhausted
            </p>
            <p className="text-[11px] leading-tight truncate" style={{ color: "var(--shell-text-muted)" }}>
              Your agents are paused
              {statusDetails.length > 0 ? ` • ${statusDetails.join(" • ")}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={onBuyCredits || (() => handleOpenStore("credits"))}
            className="retro-button px-2.5 py-1 text-[11px] font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
            style={{
              borderColor: "var(--shell-border-soft)",
              background: "var(--tone-surface-elevated)",
              color: "var(--shell-text)",
            }}
          >
            <ShoppingBag size={12} style={{ color: "var(--warning)" }} />
            Buy Credits
          </button>

          {upgrade && (
            <button
              onClick={onUpgrade || (() => handleOpenStore("plans"))}
              className="retro-button px-2.5 py-1 text-[11px] font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
              style={{
                borderColor: "var(--shell-border-soft)",
                background: "var(--tone-surface-elevated)",
                color: "var(--shell-text)",
              }}
            >
              <ArrowUpCircle size={12} style={{ color: "var(--shell-text-muted)" }} />
              Upgrade
            </button>
          )}
        </div>
      </div>
    );
  }

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
          <p className="text-xs" style={{ color: "var(--shell-text-muted)" }}>
            Your agents are paused
          </p>
        </div>
      </div>

      {/* Status */}
      <div
        className="border-2 p-3 mb-3 space-y-1"
        style={{
          borderColor: "var(--shell-border)",
          background: "var(--shell-surface-elevated)",
        }}
      >
        {creditsRequired !== undefined && (
          <p className="text-xs" style={{ color: "var(--shell-text)" }}>
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
          onClick={onBuyCredits || (() => handleOpenStore("credits"))}
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
            onClick={onUpgrade || (() => handleOpenStore("plans"))}
            className="beveled-button flex-1 px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5"
            style={{
              background: "var(--shell-button-surface)",
              color: "var(--shell-text)",
            }}
          >
            <ArrowUpCircle size={14} />
            Upgrade to {upgrade.name} ({upgrade.price})
          </button>
        )}
      </div>

      {/* Value proposition */}
      {upgrade && (
        <p className="text-xs mt-2 text-center" style={{ color: "var(--shell-text-muted)" }}>
          {upgrade.credits === -1
            ? "Unlimited credits with Enterprise"
            : `${upgrade.name} includes ${upgrade.credits} credits/month`}
        </p>
      )}
    </div>
  );
}
