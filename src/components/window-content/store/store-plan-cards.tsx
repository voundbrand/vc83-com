"use client";

import {
  Check,
  Crown,
  Rocket,
  Users,
  Building2,
  ArrowRight,
  ArrowDown,
  Phone,
  Loader2,
  Clock,
  AlertCircle,
  X,
  RefreshCw,
  Gift,
} from "lucide-react";
import { useState } from "react";

const TIER_ORDER: Record<string, number> = {
  free: 0,
  pro: 1,
  starter: 1,
  community: 1,
  professional: 1,
  agency: 2,
  enterprise: 3,
};

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  icon: React.ReactNode;
  features: string[];
  cta: string;
  highlight?: boolean;
  badge?: string;
  trialBadge?: string;
  subtext?: string;
  isEnterprise?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Perfect for getting started",
    icon: <Gift className="w-5 h-5" />,
    features: [
      "1 user",
      "100 contacts",
      "3 projects",
      "Basic templates",
      "5 daily credits",
      "Community docs",
    ],
    cta: "Get Started",
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 2900,
    annualPrice: 29000,
    description: "Freelancers & small businesses",
    icon: <Rocket className="w-5 h-5" />,
    features: [
      "3 users",
      "2,000 contacts",
      "20 projects",
      "200 credits/month",
      "500 emails/month",
      "Email support (48h)",
    ],
    cta: "Subscribe",
    highlight: true,
    badge: "Most Popular",
  },
  {
    id: "agency",
    name: "Agency",
    monthlyPrice: 29900,
    annualPrice: 299000,
    description: "Multi-client operators",
    icon: <Users className="w-5 h-5" />,
    features: [
      "15 users",
      "10,000 contacts",
      "Sub-organizations",
      "2,000 credits/month",
      "10,000 emails/month",
      "Priority support (12h)",
    ],
    cta: "Start 14-Day Trial",
    trialBadge: "14-DAY FREE TRIAL",
    subtext: "+ \u20AC79/sub-org",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: -1,
    annualPrice: -1,
    description: "Large organizations",
    icon: <Building2 className="w-5 h-5" />,
    features: [
      "Unlimited users",
      "Unlimited contacts",
      "Unlimited API keys",
      "Custom SLA",
      "SSO/SAML",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    isEnterprise: true,
  },
];

interface SubscriptionStatus {
  hasSubscription: boolean;
  currentTier: string;
  billingPeriod?: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd: boolean;
  pendingDowngrade?: {
    newTier: string;
    effectiveDate: number;
  };
}

interface StorePlanCardsProps {
  currentPlan: string;
  hasActiveSubscription: boolean;
  onCheckout: (tier: "pro" | "agency", billingPeriod: "monthly" | "annual") => void;
  onSubscriptionChange: (tier: string, billingPeriod: "monthly" | "annual") => Promise<void>;
  onContactSales: () => void;
  isManagingSubscription: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  isLoadingStatus: boolean;
  onCancelPendingChange: () => Promise<void>;
  isCancelingPending: boolean;
}

export function StorePlanCards({
  currentPlan,
  hasActiveSubscription,
  onCheckout,
  onSubscriptionChange,
  onContactSales,
  isManagingSubscription,
  subscriptionStatus,
  isLoadingStatus,
  onCancelPendingChange,
  isCancelingPending,
}: StorePlanCardsProps) {
  const [isAnnual, setIsAnnual] = useState(true);

  const getDisplayPrice = (plan: Plan) => {
    if (plan.monthlyPrice <= 0) return plan.monthlyPrice;
    if (isAnnual) return Math.round(plan.annualPrice / 12);
    return plan.monthlyPrice;
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return "\u20AC0";
    if (cents === -1) return "Custom";
    return `\u20AC${(cents / 100).toFixed(0)}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="font-pixel text-sm mb-2" style={{ color: "var(--win95-highlight)" }}>
          Choose Your Plan
        </h3>
        <p className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>
          Scale your business with the right tools
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <span
            className="text-xs font-medium cursor-pointer transition-colors"
            style={{ color: !isAnnual ? "var(--win95-highlight)" : "var(--win95-text-secondary)" }}
            onClick={() => setIsAnnual(false)}
          >
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative w-12 h-6 rounded-full transition-colors focus:outline-none"
            style={{
              background: isAnnual
                ? "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)"
                : "var(--win95-border)",
            }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 ease-in-out"
              style={{ left: isAnnual ? "calc(100% - 22px)" : "2px" }}
            />
          </button>
          <span
            className="text-xs font-medium cursor-pointer transition-colors flex items-center gap-1"
            style={{ color: isAnnual ? "var(--win95-highlight)" : "var(--win95-text-secondary)" }}
            onClick={() => setIsAnnual(true)}
          >
            Annual
            <span
              className="px-1.5 py-0.5 text-[10px] font-bold rounded"
              style={{ background: "var(--success)", color: "white" }}
            >
              Save ~17%
            </span>
          </span>
        </div>
      </div>

      {/* Subscription Status Banner */}
      {subscriptionStatus && (subscriptionStatus.hasSubscription || subscriptionStatus.cancelAtPeriodEnd || subscriptionStatus.pendingDowngrade) && (
        <SubscriptionStatusBanner
          subscriptionStatus={subscriptionStatus}
          isLoadingStatus={isLoadingStatus}
          onCancelPendingChange={onCancelPendingChange}
          isCancelingPending={isCancelingPending}
        />
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            currentPlan={currentPlan}
            hasActiveSubscription={hasActiveSubscription}
            isAnnual={isAnnual}
            displayPrice={formatPrice(getDisplayPrice(plan))}
            savingsText={
              plan.monthlyPrice > 0 && isAnnual
                ? `Save ${Math.round((1 - plan.annualPrice / (plan.monthlyPrice * 12)) * 100)}% \u2022 Billed ${formatPrice(plan.annualPrice)}/yr`
                : plan.monthlyPrice > 0
                  ? "Billed monthly"
                  : undefined
            }
            isManagingSubscription={isManagingSubscription}
            onCheckout={() => onCheckout(plan.id as "pro" | "agency", isAnnual ? "annual" : "monthly")}
            onSubscriptionChange={(tier) => onSubscriptionChange(tier, isAnnual ? "annual" : "monthly")}
            onContactSales={onContactSales}
          />
        ))}
      </div>

      <p className="text-center text-[10px] mt-6" style={{ color: "var(--win95-text-secondary)" }}>
        All prices in EUR excl. VAT. Cancel anytime.
      </p>
    </div>
  );
}

function PlanCard({
  plan,
  currentPlan,
  hasActiveSubscription,
  isAnnual,
  displayPrice,
  savingsText,
  isManagingSubscription,
  onCheckout,
  onSubscriptionChange,
  onContactSales,
}: {
  plan: Plan;
  currentPlan: string;
  hasActiveSubscription: boolean;
  isAnnual: boolean;
  displayPrice: string;
  savingsText?: string;
  isManagingSubscription: boolean;
  onCheckout: () => void;
  onSubscriptionChange: (tier: string) => void;
  onContactSales: () => void;
}) {
  const isCurrentPlan = plan.id === currentPlan || (
    (currentPlan === "starter" || currentPlan === "professional" || currentPlan === "community") && plan.id === "pro"
  );
  const currentTierOrder = TIER_ORDER[currentPlan] ?? 0;
  const planTierOrder = TIER_ORDER[plan.id] ?? 0;
  const isUpgrade = planTierOrder > currentTierOrder;
  const isDowngrade = planTierOrder < currentTierOrder;

  return (
    <div
      className="relative rounded-lg overflow-hidden transition-all hover:shadow-lg"
      style={{
        background: plan.highlight ? "var(--win95-bg-light)" : "var(--win95-bg)",
        border: plan.highlight ? "2px solid var(--win95-highlight)" : "1px solid var(--win95-border)",
      }}
    >
      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div
          className="absolute top-0 left-0 px-2 py-1 text-[10px] font-bold text-white rounded-br"
          style={{ background: "var(--success)" }}
        >
          Current Plan
        </div>
      )}

      {/* Trial Badge */}
      {plan.trialBadge && !isCurrentPlan && (
        <div
          className="absolute top-0 left-0 px-2 py-1 text-[10px] font-bold text-white rounded-br"
          style={{ background: "var(--success)" }}
        >
          {plan.trialBadge}
        </div>
      )}

      {/* Popular Badge */}
      {plan.badge && !isCurrentPlan && (
        <div
          className="absolute top-0 right-0 px-2 py-1 text-[10px] font-bold text-white rounded-bl"
          style={{
            background: "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
          }}
        >
          {plan.badge}
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="p-2 rounded"
            style={{
              background: plan.highlight
                ? "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)"
                : "var(--win95-bg-light)",
            }}
          >
            <div style={{ color: plan.highlight ? "white" : "var(--win95-highlight)" }}>
              {plan.icon}
            </div>
          </div>
          <div>
            <h4 className="font-pixel text-xs" style={{ color: "var(--win95-highlight)" }}>
              {plan.name}
            </h4>
            <p className="text-[10px]" style={{ color: "var(--win95-text-secondary)" }}>
              {plan.description}
            </p>
          </div>
        </div>

        {/* Price */}
        <div className="my-4">
          <div className="flex items-baseline gap-1">
            <span className="font-pixel text-2xl" style={{ color: "var(--win95-text)" }}>
              {displayPrice}
            </span>
            {displayPrice !== "\u20AC0" && displayPrice !== "Custom" && (
              <span className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>/mo</span>
            )}
          </div>
          {savingsText && (
            <p
              className="text-[10px] mt-0.5"
              style={{ color: isAnnual ? "var(--success)" : "var(--win95-text-secondary)" }}
            >
              {savingsText}
            </p>
          )}
          {plan.subtext && (
            <p className="text-[10px] mt-0.5" style={{ color: "var(--win95-highlight)" }}>
              {plan.subtext}
            </p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-2 mb-4">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[11px]" style={{ color: "var(--win95-text)" }}>
              <Check className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <PlanCTAButton
          plan={plan}
          isCurrentPlan={isCurrentPlan}
          isUpgrade={isUpgrade}
          isDowngrade={isDowngrade}
          hasActiveSubscription={hasActiveSubscription}
          isManagingSubscription={isManagingSubscription}
          onCheckout={onCheckout}
          onSubscriptionChange={onSubscriptionChange}
          onContactSales={onContactSales}
        />
      </div>
    </div>
  );
}

function PlanCTAButton({
  plan,
  isCurrentPlan,
  isUpgrade,
  isDowngrade,
  hasActiveSubscription,
  isManagingSubscription,
  onCheckout,
  onSubscriptionChange,
  onContactSales,
}: {
  plan: Plan;
  isCurrentPlan: boolean;
  isUpgrade: boolean;
  isDowngrade: boolean;
  hasActiveSubscription: boolean;
  isManagingSubscription: boolean;
  onCheckout: () => void;
  onSubscriptionChange: (tier: string) => void;
  onContactSales: () => void;
}) {
  if (isCurrentPlan) {
    return (
      <button
        disabled
        className="w-full py-2.5 px-4 rounded text-xs font-medium flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
        style={{
          background: "var(--win95-bg-light)",
          color: "var(--neutral-gray)",
          border: "1px solid var(--win95-border)",
        }}
      >
        <Check className="w-3.5 h-3.5" />
        Current Plan
      </button>
    );
  }

  if (plan.isEnterprise) {
    return (
      <button
        onClick={onContactSales}
        className="w-full py-2.5 px-4 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors"
        style={{
          background: "var(--win95-bg-light)",
          color: "var(--win95-highlight)",
          border: "1px solid var(--win95-highlight)",
        }}
      >
        <Phone className="w-3.5 h-3.5" />
        Contact Sales
      </button>
    );
  }

  // Free plan - cancel subscription
  if (plan.id === "free" && hasActiveSubscription) {
    return (
      <button
        onClick={() => onSubscriptionChange("free")}
        disabled={isManagingSubscription}
        className="w-full py-2.5 px-4 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors hover:opacity-80"
        style={{
          background: "var(--win95-bg-light)",
          color: "var(--win95-text)",
          border: "1px solid var(--win95-border)",
        }}
      >
        {isManagingSubscription ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ArrowDown className="w-3.5 h-3.5" />
        )}
        {isManagingSubscription ? "Processing..." : "Cancel Subscription"}
      </button>
    );
  }

  // Existing subscription - manage via Stripe
  if (hasActiveSubscription) {
    return (
      <button
        onClick={() => onSubscriptionChange(plan.id)}
        disabled={isManagingSubscription}
        className={`w-full py-2.5 px-4 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
          isManagingSubscription ? "cursor-wait opacity-80" : plan.highlight ? "text-white hover:opacity-90" : "hover:opacity-80"
        }`}
        style={{
          background: plan.highlight
            ? "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)"
            : "var(--win95-bg-light)",
          color: plan.highlight ? "white" : "var(--win95-text)",
          border: plan.highlight ? "none" : "1px solid var(--win95-border)",
        }}
      >
        {isManagingSubscription ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isDowngrade ? (
          <ArrowDown className="w-3.5 h-3.5" />
        ) : (
          <ArrowRight className="w-3.5 h-3.5" />
        )}
        {isManagingSubscription ? "Processing..." : isUpgrade ? "Upgrade" : "Downgrade"}
      </button>
    );
  }

  // No subscription - go to checkout
  return (
    <button
      onClick={onCheckout}
      className={`w-full py-2.5 px-4 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
        plan.highlight ? "text-white hover:opacity-90" : "hover:opacity-80"
      }`}
      style={{
        background: plan.highlight
          ? "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)"
          : "var(--win95-bg-light)",
        color: plan.highlight ? "white" : "var(--win95-text)",
        border: plan.highlight ? "none" : "1px solid var(--win95-border)",
      }}
    >
      {plan.cta}
      <ArrowRight className="w-3.5 h-3.5" />
    </button>
  );
}

function SubscriptionStatusBanner({
  subscriptionStatus,
  isLoadingStatus,
  onCancelPendingChange,
  isCancelingPending,
}: {
  subscriptionStatus: SubscriptionStatus;
  isLoadingStatus: boolean;
  onCancelPendingChange: () => Promise<void>;
  isCancelingPending: boolean;
}) {
  if (isLoadingStatus) {
    return (
      <div
        className="mb-4 p-3 rounded-lg flex items-center justify-center gap-2"
        style={{ background: "var(--win95-bg-light)", border: "1px solid var(--win95-border)" }}
      >
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--win95-highlight)" }} />
        <span className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>
          Loading subscription status...
        </span>
      </div>
    );
  }

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const tierLabel = (tier: string) => tier.charAt(0).toUpperCase() + tier.slice(1);

  // Pending cancellation
  if (subscriptionStatus.cancelAtPeriodEnd && subscriptionStatus.currentPeriodEnd) {
    return (
      <div className="mb-4 p-3 rounded-lg" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--error, #dc2626)" }}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--error, #dc2626)" }} />
          <div className="flex-1">
            <h4 className="font-pixel text-xs mb-1" style={{ color: "var(--error, #dc2626)" }}>
              Subscription Canceling
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: "var(--win95-text)" }}>
              Your {tierLabel(subscriptionStatus.currentTier)} subscription will be canceled on{" "}
              <strong>{formatDate(subscriptionStatus.currentPeriodEnd)}</strong>.
            </p>
            <button
              onClick={onCancelPendingChange}
              disabled={isCancelingPending}
              className="mt-2 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors hover:opacity-80"
              style={{ background: "var(--win95-bg)", color: "var(--win95-highlight)", border: "1px solid var(--win95-highlight)" }}
            >
              {isCancelingPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {isCancelingPending ? "Processing..." : "Keep My Subscription"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pending downgrade
  if (subscriptionStatus.pendingDowngrade) {
    return (
      <div className="mb-4 p-3 rounded-lg" style={{ background: "rgba(234, 179, 8, 0.1)", border: "1px solid var(--warning, #eab308)" }}>
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--warning, #eab308)" }} />
          <div className="flex-1">
            <h4 className="font-pixel text-xs mb-1" style={{ color: "var(--warning, #ca8a04)" }}>
              Plan Change Scheduled
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: "var(--win95-text)" }}>
              Changing from <strong>{tierLabel(subscriptionStatus.currentTier)}</strong> to{" "}
              <strong>{tierLabel(subscriptionStatus.pendingDowngrade.newTier)}</strong> on{" "}
              <strong>{formatDate(subscriptionStatus.pendingDowngrade.effectiveDate)}</strong>.
            </p>
            <button
              onClick={onCancelPendingChange}
              disabled={isCancelingPending}
              className="mt-2 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors hover:opacity-80"
              style={{ background: "var(--win95-bg)", color: "var(--win95-highlight)", border: "1px solid var(--win95-highlight)" }}
            >
              {isCancelingPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              {isCancelingPending ? "Processing..." : "Cancel Scheduled Change"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active subscription info
  if (subscriptionStatus.hasSubscription && subscriptionStatus.currentPeriodEnd) {
    return (
      <div className="mb-4 p-3 rounded-lg" style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid var(--success, #22c55e)" }}>
        <div className="flex items-start gap-3">
          <Crown className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--success, #22c55e)" }} />
          <div className="flex-1">
            <h4 className="font-pixel text-xs mb-1" style={{ color: "var(--success, #16a34a)" }}>
              Active Subscription
            </h4>
            <p className="text-xs" style={{ color: "var(--win95-text)" }}>
              <strong>{tierLabel(subscriptionStatus.currentTier)}</strong> plan
              {subscriptionStatus.billingPeriod && (
                <> &bull; Billed {subscriptionStatus.billingPeriod === "annual" ? "annually" : "monthly"}</>
              )}
            </p>
            <p className="text-[10px] mt-1" style={{ color: "var(--win95-text-secondary)" }}>
              Next billing date: {formatDate(subscriptionStatus.currentPeriodEnd)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
