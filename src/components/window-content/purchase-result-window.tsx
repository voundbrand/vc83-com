"use client";

import { useEffect, useState } from "react";
import {
  XCircle,
  Zap,
  Rocket,
  Bot,
  Package,
  Mail,
  ArrowRight,
  CreditCard,
  RefreshCw,
  ArrowLeft,
  HelpCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Ban,
  Undo2,
  Calendar,
  Shield,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useWindowManager } from "@/hooks/use-window-manager";

export interface PurchaseResultWindowProps {
  status: "success" | "canceled" | "failed";
  type: "credits" | "plan" | "ai" | "upgrade" | "downgrade" | "cancel" | "revert";
  amount?: number; // EUR cents for credits
  credits?: number; // Credit count for credit purchases
  tier?: string; // "pro" | "agency" for plan, "standard" | "privacy-enhanced" for AI
  period?: string; // "monthly" | "annual" for plan purchases
  reason?: string; // Failure reason
  fromTier?: string; // For subscription changes: current tier
  toTier?: string; // For subscription changes: target tier
  effectiveDate?: number; // For scheduled changes (downgrade/cancel): when it takes effect
  message?: string; // Backend message to display
}

// Tier display config
const TIER_DISPLAY: Record<string, { name: string; price: string; icon: string }> = {
  pro: { name: "Pro", price: "29", icon: "rocket" },
  agency: { name: "Scale", price: "299", icon: "rocket" },
  standard: { name: "AI Standard", price: "", icon: "bot" },
  "privacy-enhanced": { name: "AI Privacy Enhanced", price: "", icon: "bot" },
};

export function PurchaseResultWindow({
  status,
  type,
  amount,
  credits,
  tier,
  period,
  reason,
  fromTier,
  toTier,
  effectiveDate,
  message,
}: PurchaseResultWindowProps) {
  const { closeWindow, openWindow } = useWindowManager();
  const [showAnimation, setShowAnimation] = useState(true);

  // Confetti for success, shake for failed/canceled
  useEffect(() => {
    if (status === "success") {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          setShowAnimation(false);
          return clearInterval(interval);
        }
        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      return () => clearInterval(interval);
    } else {
      // Shake animation for canceled/failed
      const timer = setTimeout(() => setShowAnimation(false), 500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Dynamic content based on purchase type + status
  const getSuccessContent = () => {
    const tierInfo = tier ? TIER_DISPLAY[tier] : undefined;

    switch (type) {
      case "credits": {
        const euroAmount = amount ? (amount / 100).toFixed(0) : "?";
        const creditCount = credits ? credits.toLocaleString() : "?";
        return {
          icon: <Zap size={64} style={{ color: "white" }} />,
          iconBg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          title: "Credits Added!",
          subtitle: `${creditCount} credits have been added to your account`,
          detail: `You purchased ${creditCount} credits for EUR ${euroAmount}.00`,
          cards: [
            {
              icon: <Zap size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />,
              title: "Credits Available Now",
              message: "Your credits are available immediately. Use them for AI agents, automations, and more.",
            },
            {
              icon: <Mail size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />,
              title: "Receipt Sent",
              message: "A receipt has been sent to your email. You'll also receive an invoice from Stripe.",
            },
            {
              icon: <ArrowRight size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />,
              title: "Start Using Credits",
              message: "Head to the AI Assistant or set up agent automations to put your credits to work.",
            },
          ],
        };
      }

      case "plan": {
        const tierName = tierInfo?.name || (tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : "Plan");
        const periodLabel = period === "annual" ? "/year" : "/month";
        const priceDisplay = tierInfo?.price ? `EUR ${tierInfo.price}${periodLabel}` : "";
        return {
          icon: <Rocket size={64} style={{ color: "white" }} />,
          iconBg: "linear-gradient(135deg, #6B46C1 0%, #9333ea 100%)",
          title: `Welcome to ${tierName}!`,
          subtitle: priceDisplay ? `${tierName} Plan — ${priceDisplay}` : `${tierName} Plan activated`,
          detail: "Your plan upgrade is now active.",
          cards: [
            {
              icon: <Package size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />,
              title: "Plan Activated",
              message: `Your ${tierName} plan is now active. All features have been unlocked for your organization.`,
            },
            {
              icon: <Mail size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />,
              title: "Confirmation Email",
              message: "A confirmation email with your subscription details has been sent to your registered email.",
            },
            {
              icon: <ArrowRight size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />,
              title: "What's Next",
              message: "Explore your new features — more credits, more agents, more power. Check the Control Panel for details.",
            },
          ],
        };
      }

      case "ai": {
        const tierName = tierInfo?.name || "AI Subscription";
        return {
          icon: <Bot size={64} style={{ color: "white" }} />,
          iconBg: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
          title: "AI Subscription Active!",
          subtitle: `${tierName} is now active for your organization`,
          detail: "Your AI capabilities have been upgraded.",
          cards: [
            {
              icon: <Bot size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />,
              title: "Subscription Active",
              message: `Your ${tierName} subscription is live. Enhanced AI capabilities are now available.`,
            },
            {
              icon: <Mail size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />,
              title: "Confirmation Sent",
              message: "A confirmation email with your subscription details and invoice has been sent.",
            },
            {
              icon: <ArrowRight size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />,
              title: "Get Started",
              message: "Open the AI Assistant to experience your upgraded capabilities. Your agents are ready.",
            },
          ],
        };
      }

      case "upgrade": {
        const toName = tierLabel(toTier || tier || "");
        const fromName = tierLabel(fromTier || "");
        return {
          icon: <ArrowUpCircle size={64} style={{ color: "white" }} />,
          iconBg: "linear-gradient(135deg, #6B46C1 0%, #9333ea 100%)",
          title: `Upgraded to ${toName}!`,
          subtitle: fromName ? `${fromName} → ${toName}` : `You're now on the ${toName} plan`,
          detail: message || "Your plan upgrade is active immediately.",
          cards: [
            {
              icon: <ArrowUpCircle size={24} style={{ color: "var(--success)", flexShrink: 0 }} />,
              title: "Upgrade Active Now",
              message: `Your ${toName} plan features are available immediately. Any price difference has been prorated.`,
            },
            {
              icon: <Shield size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />,
              title: "New Limits Unlocked",
              message: `You now have access to all ${toName} features — more credits, more users, more power.`,
            },
            {
              icon: <ArrowRight size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />,
              title: "What's Next",
              message: "Check the Control Panel to see your updated limits and explore your new capabilities.",
            },
          ],
        };
      }

      case "downgrade": {
        const toName = tierLabel(toTier || tier || "");
        const fromName = tierLabel(fromTier || "");
        const dateStr = effectiveDate ? formatDateLong(effectiveDate) : "your next billing date";
        return {
          icon: <ArrowDownCircle size={64} style={{ color: "white" }} />,
          iconBg: "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
          title: "Downgrade Scheduled",
          subtitle: fromName ? `${fromName} → ${toName}` : `Switching to ${toName}`,
          detail: message || `Your plan will change to ${toName} on ${dateStr}.`,
          cards: [
            {
              icon: <Calendar size={24} style={{ color: "var(--warning, #eab308)", flexShrink: 0 }} />,
              title: "Scheduled Change",
              message: `Your downgrade to ${toName} takes effect on ${dateStr}. You keep all current features until then.`,
            },
            {
              icon: <Shield size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />,
              title: "No Interruption",
              message: "Your current plan features remain fully active until the change date. Nothing changes today.",
            },
            {
              icon: <Undo2 size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />,
              title: "Changed Your Mind?",
              message: "You can cancel this scheduled change anytime from the Store before it takes effect.",
            },
          ],
        };
      }

      case "cancel": {
        const fromName = tierLabel(fromTier || tier || "");
        const dateStr = effectiveDate ? formatDateLong(effectiveDate) : "your next billing date";
        return {
          icon: <Ban size={64} style={{ color: "white" }} />,
          iconBg: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
          title: "Cancellation Scheduled",
          subtitle: `${fromName} plan ending`,
          detail: message || `Your subscription will end on ${dateStr}.`,
          cards: [
            {
              icon: <Calendar size={24} style={{ color: "var(--error)", flexShrink: 0 }} />,
              title: "Active Until",
              message: `Your ${fromName} plan remains fully active until ${dateStr}. After that, you'll move to the Free plan.`,
            },
            {
              icon: <Shield size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />,
              title: "Your Data is Safe",
              message: "Your data, contacts, and projects will be preserved. Some features may become limited on the Free plan.",
            },
            {
              icon: <Undo2 size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />,
              title: "Changed Your Mind?",
              message: "You can reactivate your subscription anytime from the Store before the cancellation date.",
            },
          ],
        };
      }

      case "revert": {
        const planName = tierLabel(fromTier || tier || "");
        return {
          icon: <Undo2 size={64} style={{ color: "white" }} />,
          iconBg: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
          title: "Change Reverted!",
          subtitle: `Staying on ${planName}`,
          detail: message || `Your pending change has been cancelled. You'll stay on the ${planName} plan.`,
          cards: [
            {
              icon: <RefreshCw size={24} style={{ color: "var(--success)", flexShrink: 0 }} />,
              title: "Back to Normal",
              message: `Your ${planName} plan continues as before. The scheduled change has been removed.`,
            },
            {
              icon: <Shield size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />,
              title: "No Changes",
              message: "Your billing, features, and limits remain exactly the same. Nothing has changed.",
            },
            {
              icon: <ArrowRight size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />,
              title: "Carry On",
              message: "Everything is set. Close this window and continue using your platform as usual.",
            },
          ],
        };
      }
    }
  };

  const tierLabel = (t: string) => {
    if (t === "agency") return "Scale";
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
  };
  const formatDateLong = (ts: number) => new Date(ts).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const getCanceledContent = () => {
    const typeLabels: Record<string, string> = {
      credits: "Credit Purchase",
      plan: "Plan Upgrade",
      ai: "AI Subscription",
      upgrade: "Plan Upgrade",
      downgrade: "Plan Downgrade",
      cancel: "Subscription Cancellation",
      revert: "Revert Change",
    };
    const label = typeLabels[type] || "Action";

    const reasonDetails: Record<string, { title: string; message: string; icon: React.ReactNode }> = {
      cancel: {
        title: `${label} Cancelled`,
        message: "You cancelled the checkout process. No payment was taken.",
        icon: <ArrowLeft size={24} style={{ color: "var(--win95-highlight)" }} />,
      },
      canceled: {
        title: `${label} Cancelled`,
        message: "You cancelled the checkout process. No payment was taken.",
        icon: <ArrowLeft size={24} style={{ color: "var(--win95-highlight)" }} />,
      },
      payment_failed: {
        title: "Payment Declined",
        message: "Your payment could not be processed. Please check your card details or try a different payment method.",
        icon: <CreditCard size={24} style={{ color: "var(--error)" }} />,
      },
      expired: {
        title: "Session Expired",
        message: "Your checkout session has expired. Please start again from the store.",
        icon: <RefreshCw size={24} style={{ color: "var(--warning)" }} />,
      },
    };

    const details = reasonDetails[reason || "cancel"] || {
      title: "Something Went Wrong",
      message: "An unexpected error occurred during checkout. Please try again or contact support.",
      icon: <HelpCircle size={24} style={{ color: "var(--error)" }} />,
    };

    return {
      ...details,
      typeLabel: label,
    };
  };

  // ---- SUCCESS VIEW ----
  if (status === "success") {
    const content = getSuccessContent()!;

    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-8">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div
              style={{
                animation: showAnimation ? "bounce 1s ease-in-out" : "none",
              }}
            >
              <div
                className="rounded-full p-6 inline-block"
                style={{
                  background: content.iconBg,
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                }}
              >
                {content.icon}
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1
              className="text-3xl font-bold mb-3"
              style={{ color: "var(--success)" }}
            >
              {content.title}
            </h1>
            <p className="text-lg mb-2" style={{ color: "var(--win95-text)" }}>
              {content.subtitle}
            </p>
            <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
              {content.detail}
            </p>
          </div>

          {/* Info Cards */}
          <div className="space-y-4 max-w-md mx-auto">
            {content.cards.map((card, i) => (
              <div
                key={i}
                className="p-4 border-2 flex items-start gap-3"
                style={{
                  backgroundColor: "var(--win95-bg-light)",
                  borderColor: "var(--win95-border)",
                }}
              >
                {card.icon}
                <div className="flex-1">
                  <h3
                    className="font-bold text-sm mb-1"
                    style={{ color: "var(--win95-text)" }}
                  >
                    {card.title}
                  </h3>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--neutral-gray)" }}
                  >
                    {card.message}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              Thank you for your purchase!
            </p>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Need help? Contact us at service@l4yercak3.com
            </p>
          </div>
        </div>

        <style jsx>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
        `}</style>
      </div>
    );
  }

  // ---- CANCELED / FAILED VIEW ----
  const cancelContent = getCanceledContent();

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-8">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div
            style={{
              animation: showAnimation ? "shake 0.5s ease-in-out" : "none",
            }}
          >
            <div
              className="rounded-full p-6 inline-block"
              style={{
                backgroundColor: "var(--error)",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <XCircle size={64} style={{ color: "white" }} />
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold mb-3"
            style={{ color: "var(--error)" }}
          >
            {cancelContent.title}
          </h1>
          <p className="text-lg mb-2" style={{ color: "var(--win95-text)" }}>
            {cancelContent.typeLabel}
          </p>
          <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
            {cancelContent.message}
          </p>
        </div>

        {/* Info Cards */}
        <div className="space-y-4 max-w-md mx-auto">
          {/* What Happened */}
          <div
            className="p-4 border-2 flex items-start gap-3"
            style={{
              backgroundColor: "var(--win95-bg-light)",
              borderColor: "var(--win95-border)",
            }}
          >
            {cancelContent.icon}
            <div className="flex-1">
              <h3 className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>
                What Happened?
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--neutral-gray)" }}>
                {cancelContent.message}
              </p>
            </div>
          </div>

          {/* No Charge */}
          <div
            className="p-4 border-2 flex items-start gap-3"
            style={{
              backgroundColor: "var(--success-bg, #f0fdf4)",
              borderColor: "var(--success)",
            }}
          >
            <CreditCard size={24} style={{ color: "var(--success)", flexShrink: 0 }} />
            <div className="flex-1">
              <h3 className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>
                No Payment Taken
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--neutral-gray)" }}>
                {"Don't worry — your card has not been charged. You can safely try again when you're ready."}
              </p>
            </div>
          </div>

          {/* Try Again */}
          <div
            className="p-4 border-2 flex items-start gap-3"
            style={{
              backgroundColor: "var(--win95-bg-light)",
              borderColor: "var(--win95-border)",
            }}
          >
            <RefreshCw size={24} style={{ color: "var(--win95-highlight)", flexShrink: 0 }} />
            <div className="flex-1">
              <h3 className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>
                What Can I Do?
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "var(--neutral-gray)" }}>
                Close this window and visit the Store to try again. If you continue to have issues, please contact support.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => closeWindow("purchase-result")}
            className="px-6 py-2.5 rounded text-sm font-medium transition-colors"
            style={{
              backgroundColor: "var(--win95-bg-light)",
              border: "2px solid var(--win95-border)",
              color: "var(--win95-text)",
            }}
          >
            Close
          </button>
          <button
            onClick={() => {
              closeWindow("purchase-result");
              // Dynamically import to avoid circular deps
              import("@/components/window-content/store-window").then(({ StoreWindow }) => {
                openWindow(
                  "store",
                  "l4yercak3 Store",
                  <StoreWindow />,
                  { x: 150, y: 80 },
                  { width: 900, height: 650 },
                  "ui.start_menu.store",
                  undefined
                );
              });
            }}
            className="px-6 py-2.5 rounded text-sm font-medium transition-colors"
            style={{
              background: "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
              color: "var(--win95-on-highlight)",
              border: "none",
            }}
          >
            Open Store
          </button>
        </div>

        {/* Support */}
        <div className="text-center mt-8">
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Need help? Contact us at service@l4yercak3.com
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
