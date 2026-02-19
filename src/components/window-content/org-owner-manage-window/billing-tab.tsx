"use client";

import { useState, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { Id } from "../../../../convex/_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const api = (require("../../../../convex/_generated/api") as { api: any }).api;
import { CreditBalance } from "@/components/credit-balance";
import {
  Loader2,
  ExternalLink,
  Crown,
  Zap,
  Calendar,
  AlertTriangle,
  ArrowUpCircle,
} from "lucide-react";
import { useWindowManager } from "@/hooks/use-window-manager";

const TIER_DISPLAY: Record<string, { label: string; color: string; price: string }> = {
  free: { label: "Free", color: "var(--neutral-gray)", price: "€0" },
  pro: { label: "Pro", color: "var(--primary)", price: "€29/mo" },
  agency: { label: "Scale", color: "var(--tone-accent)", price: "€299/mo" },
  enterprise: { label: "Enterprise", color: "var(--success)", price: "Custom" },
};

interface BillingTabProps {
  organizationId: Id<"organizations">;
  stripeCustomerId?: string;
}

export function BillingTab({ organizationId, stripeCustomerId }: BillingTabProps) {
  const { openWindow } = useWindowManager();
  const getSubscriptionStatus = useAction(api.stripe.platformCheckout.getSubscriptionStatus);
  const createPortalSession = useAction(api.stripe.aiCheckout.createCustomerPortalSession);

  const creditBalance = useQuery(api.credits.getCreditBalance, { organizationId }) as {
    exists: boolean;
    dailyCredits: number;
    monthlyCredits: number;
    monthlyCreditsTotal: number;
    purchasedCredits: number;
    totalCredits: number;
  } | undefined;

  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    hasSubscription: boolean;
    currentTier: string;
    billingPeriod?: string;
    currentPeriodEnd?: number;
    cancelAtPeriodEnd: boolean;
    pendingDowngrade?: { newTier: string; effectiveDate: number };
  } | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  // Fetch subscription status on mount
  useEffect(() => {
    let cancelled = false;
    setIsLoadingStatus(true);
    getSubscriptionStatus({ organizationId })
      .then((status) => {
        if (!cancelled) setSubscriptionStatus(status);
      })
      .catch((err) => {
        console.error("Failed to fetch subscription status:", err);
        if (!cancelled) setSubscriptionStatus(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStatus(false);
      });
    return () => { cancelled = true; };
  }, [organizationId, getSubscriptionStatus]);

  const handleOpenPortal = async () => {
    setIsOpeningPortal(true);
    try {
      const result = await createPortalSession({
        organizationId,
        returnUrl: window.location.href,
      });
      window.location.href = result.portalUrl;
    } catch (error) {
      console.error("Failed to open billing portal:", error);
      setIsOpeningPortal(false);
    }
  };

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

  const tier = subscriptionStatus?.currentTier || "free";
  const tierInfo = TIER_DISPLAY[tier] || TIER_DISPLAY.free;

  return (
    <div className="space-y-4">
      {/* Current Plan */}
      <div
        className="border-2 p-4"
        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Crown size={16} style={{ color: tierInfo.color }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
            Current Plan
          </h3>
        </div>

        {isLoadingStatus ? (
          <div className="flex items-center gap-2 py-4 justify-center">
            <Loader2 size={16} className="animate-spin" style={{ color: "var(--neutral-gray)" }} />
            <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>Loading subscription details...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Tier badge + billing period */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 text-xs font-bold rounded"
                  style={{ background: tierInfo.color, color: "white" }}
                >
                  {tierInfo.label}
                </span>
                {subscriptionStatus?.billingPeriod && (
                  <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {subscriptionStatus.billingPeriod === "annual" ? "Annual billing" : "Monthly billing"}
                  </span>
                )}
              </div>
              <span className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
                {tierInfo.price}
              </span>
            </div>

            {/* Renewal date */}
            {subscriptionStatus?.currentPeriodEnd && (
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--window-document-text)" }}>
                <Calendar size={12} />
                <span>
                  {subscriptionStatus.cancelAtPeriodEnd ? "Expires" : "Renews"}{" "}
                  {new Date(subscriptionStatus.currentPeriodEnd * 1000).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}

            {/* Pending downgrade notice */}
            {subscriptionStatus?.pendingDowngrade && (
              <div
                className="flex items-start gap-2 p-2 border-2 text-xs"
                style={{
                  borderColor: "var(--warning)",
                  background: "rgba(245, 158, 11, 0.08)",
                  color: "var(--warning)",
                }}
              >
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  Scheduled change to{" "}
                  <strong>{TIER_DISPLAY[subscriptionStatus.pendingDowngrade.newTier]?.label || subscriptionStatus.pendingDowngrade.newTier}</strong>{" "}
                  on{" "}
                  {new Date(subscriptionStatus.pendingDowngrade.effectiveDate * 1000).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}

            {/* Cancellation notice */}
            {subscriptionStatus?.cancelAtPeriodEnd && !subscriptionStatus.pendingDowngrade && (
              <div
                className="flex items-start gap-2 p-2 border-2 text-xs"
                style={{
                  borderColor: "var(--error)",
                  background: "rgba(239, 68, 68, 0.08)",
                  color: "var(--error)",
                }}
              >
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span>Your subscription will cancel at the end of the current period.</span>
              </div>
            )}

            {/* Upgrade CTA for free users */}
            {tier === "free" && (
              <button
                onClick={handleOpenStore}
                className="desktop-interior-button desktop-interior-button-primary w-full py-2 text-xs font-bold flex items-center justify-center gap-2"
              >
                <ArrowUpCircle size={14} />
                Upgrade Plan
              </button>
            )}
          </div>
        )}
      </div>

      {/* Credit Balance */}
      <div
        className="border-2 p-4"
        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} style={{ color: "var(--primary)" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
            Credit Balance
          </h3>
        </div>

        {creditBalance && creditBalance.exists ? (
          <CreditBalance
            variant="full"
            dailyCredits={creditBalance.dailyCredits}
            monthlyCredits={creditBalance.monthlyCredits}
            monthlyCreditsTotal={creditBalance.monthlyCreditsTotal}
            purchasedCredits={creditBalance.purchasedCredits}
            totalCredits={creditBalance.totalCredits}
            isUnlimited={creditBalance.monthlyCreditsTotal === -1}
          />
        ) : (
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            No credit balance yet. Credits are granted on login and with paid plans.
          </p>
        )}
      </div>

      {/* Manage Billing - Stripe Portal */}
      <div
        className="border-2 p-4"
        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <ExternalLink size={16} style={{ color: "var(--window-document-text)" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
            Billing & Invoices
          </h3>
        </div>

        {stripeCustomerId ? (
          <div className="space-y-2">
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              View invoices, update payment methods, and manage your billing details in the Stripe Customer Portal.
            </p>
            <button
              onClick={handleOpenPortal}
              disabled={isOpeningPortal}
              className="desktop-interior-button w-full py-2 text-xs font-bold flex items-center justify-center gap-2"
            >
              {isOpeningPortal ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Opening portal...
                </>
              ) : (
                <>
                  <ExternalLink size={14} />
                  Manage Billing & Invoices
                </>
              )}
            </button>
          </div>
        ) : (
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Billing management is available after subscribing to a paid plan. Upgrade to Pro or Scale to access invoices and payment settings.
          </p>
        )}
      </div>
    </div>
  );
}
