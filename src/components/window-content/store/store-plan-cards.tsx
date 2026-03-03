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
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

const TIER_ORDER: Record<string, number> = {
  free: 0,
  pro: 1,
  starter: 1,
  community: 1,
  professional: 1,
  agency: 2,
  enterprise: 3,
};

const ACCENT_BACKGROUND = "var(--tone-accent)";
const ACCENT_FOREGROUND = "#0f0f0f";

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

type TranslateWithFallback = (
  key: string,
  fallback: string,
  params?: Record<string, string | number>
) => string;

const buildPlans = (tx: TranslateWithFallback, trialEligible: boolean): Plan[] => [
  {
    id: "free",
    name: tx("ui.store.plan_cards.plans.free.name", "Free"),
    monthlyPrice: 0,
    annualPrice: 0,
    description: tx("ui.store.plan_cards.plans.free.description", "Perfect for getting started"),
    icon: <Gift className="w-5 h-5" />,
    features: [
      tx("ui.store.plan_cards.plans.free.features.0", "1 user"),
      tx("ui.store.plan_cards.plans.free.features.1", "100 contacts"),
      tx("ui.store.plan_cards.plans.free.features.2", "3 projects"),
      tx("ui.store.plan_cards.plans.free.features.3", "Basic templates"),
      tx("ui.store.plan_cards.plans.free.features.4", "5 daily credits"),
      tx("ui.store.plan_cards.plans.free.features.5", "Community docs"),
    ],
    cta: tx("ui.store.plan_cards.plans.free.cta", "Get Started"),
  },
  {
    id: "pro",
    name: tx("ui.store.plan_cards.plans.pro.name", "Pro"),
    monthlyPrice: 2900,
    annualPrice: 29000,
    description: tx("ui.store.plan_cards.plans.pro.description", "Freelancers & small businesses"),
    icon: <Rocket className="w-5 h-5" />,
    features: [
      tx("ui.store.plan_cards.plans.pro.features.0", "3 users"),
      tx("ui.store.plan_cards.plans.pro.features.1", "2,000 contacts"),
      tx("ui.store.plan_cards.plans.pro.features.2", "20 projects"),
      tx("ui.store.plan_cards.plans.pro.features.3", "200 credits/month"),
      tx("ui.store.plan_cards.plans.pro.features.4", "500 emails/month"),
      tx("ui.store.plan_cards.plans.pro.features.5", "Email support (48h)"),
    ],
    cta: trialEligible
      ? tx("ui.store.plan_cards.actions.start_trial", "Start 14-Day Trial")
      : tx("ui.store.plan_cards.actions.subscribe", "Subscribe"),
    trialBadge: trialEligible
      ? tx("ui.store.plan_cards.badges.trial", "14-DAY FREE TRIAL")
      : undefined,
    highlight: true,
    badge: tx("ui.store.plan_cards.badges.most_popular", "Most Popular"),
  },
  {
    id: "agency",
    name: tx("ui.store.plan_cards.plans.agency.name", "Scale"),
    monthlyPrice: 29900,
    annualPrice: 299000,
    description: tx("ui.store.plan_cards.plans.agency.description", "Multi-client operators"),
    icon: <Users className="w-5 h-5" />,
    features: [
      tx("ui.store.plan_cards.plans.agency.features.0", "15 users"),
      tx("ui.store.plan_cards.plans.agency.features.1", "10,000 contacts"),
      tx("ui.store.plan_cards.plans.agency.features.2", "Sub-organizations"),
      tx("ui.store.plan_cards.plans.agency.features.3", "2,000 credits/month"),
      tx("ui.store.plan_cards.plans.agency.features.4", "10,000 emails/month"),
      tx("ui.store.plan_cards.plans.agency.features.5", "Priority support (12h)"),
    ],
    cta: trialEligible
      ? tx("ui.store.plan_cards.actions.start_trial", "Start 14-Day Trial")
      : tx("ui.store.plan_cards.actions.subscribe", "Subscribe"),
    trialBadge: trialEligible
      ? tx("ui.store.plan_cards.badges.trial", "14-DAY FREE TRIAL")
      : undefined,
    subtext: tx("ui.store.plan_cards.plans.agency.subtext", "+ \u20AC79/sub-org"),
  },
  {
    id: "enterprise",
    name: tx("ui.store.plan_cards.plans.enterprise.name", "Enterprise"),
    monthlyPrice: -1,
    annualPrice: -1,
    description: tx("ui.store.plan_cards.plans.enterprise.description", "Large organizations"),
    icon: <Building2 className="w-5 h-5" />,
    features: [
      tx("ui.store.plan_cards.plans.enterprise.features.0", "Unlimited users"),
      tx("ui.store.plan_cards.plans.enterprise.features.1", "Unlimited contacts"),
      tx("ui.store.plan_cards.plans.enterprise.features.2", "Unlimited API keys"),
      tx("ui.store.plan_cards.plans.enterprise.features.3", "Custom SLA"),
      tx("ui.store.plan_cards.plans.enterprise.features.4", "SSO/SAML"),
      tx("ui.store.plan_cards.plans.enterprise.features.5", "Dedicated support"),
    ],
    cta: tx("ui.store.plan_cards.actions.contact_sales", "Contact Sales"),
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
  trialEligible: boolean;
  onCheckout: (tier: "pro" | "scale", billingPeriod: "monthly" | "annual") => void;
  onSubscriptionChange: (tier: string, billingPeriod: "monthly" | "annual") => Promise<void>;
  onContactSales: () => void;
  isManagingSubscription: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  isLoadingStatus: boolean;
  onCancelPendingChange: () => Promise<void>;
  isCancelingPending: boolean;
  legacySalesMode: "hidden" | "compatibility" | "super_admin_override" | "rollback_public";
}

export function StorePlanCards({
  currentPlan,
  hasActiveSubscription,
  trialEligible,
  onCheckout,
  onSubscriptionChange,
  onContactSales,
  isManagingSubscription,
  subscriptionStatus,
  isLoadingStatus,
  onCancelPendingChange,
  isCancelingPending,
  legacySalesMode,
}: StorePlanCardsProps) {
  const { t } = useNamespaceTranslations("ui.store");
  const tx: TranslateWithFallback = (key, fallback, params) => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };
  const [isAnnual, setIsAnnual] = useState(true);
  const plans = buildPlans(tx, trialEligible);
  const showLegacySalesCards = legacySalesMode !== "hidden";

  const getDisplayPrice = (plan: Plan) => {
    if (plan.monthlyPrice <= 0) return plan.monthlyPrice;
    if (isAnnual) return Math.round(plan.annualPrice / 12);
    return plan.monthlyPrice;
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return "\u20AC0";
    if (cents === -1) return tx("ui.store.plan_cards.pricing.custom", "Custom");
    return `\u20AC${(cents / 100).toFixed(0)}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="font-pixel text-sm mb-2" style={{ color: "var(--window-document-text)" }}>
          {tx("ui.store.plan_cards.header.title_v2", "Subscription plans")}
        </h3>
        <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
          {legacySalesMode === "compatibility"
            ? tx(
              "ui.store.plan_cards.header.subtitle_v2_compatibility",
              "These plans are available because your workspace has an existing subscription."
            )
            : legacySalesMode === "super_admin_override"
              ? tx(
                "ui.store.plan_cards.header.subtitle_v2_override",
                "These plans have been made visible by an administrator."
              )
              : legacySalesMode === "rollback_public"
                ? tx(
                  "ui.store.plan_cards.header.subtitle_v2_rollback",
                  "These plans are temporarily available while we resolve a service issue."
                )
            : tx(
              "ui.store.plan_cards.header.subtitle_v2_hidden",
              "Subscription plans are available through the options above."
            )}
        </p>

        {showLegacySalesCards ? (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 text-xs font-medium transition-colors"
              style={{ color: !isAnnual ? "var(--window-document-text)" : "var(--desktop-menu-text-muted)" }}
              onClick={() => setIsAnnual(false)}
              aria-pressed={!isAnnual}
            >
              {tx("ui.store.plan_cards.billing.monthly", "Monthly")}
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-12 h-6 rounded-full transition-colors focus:outline-none"
              aria-label={tx(
                "ui.store.plan_cards.billing.switch_aria_label",
                "Switch billing cycle. Currently {cycle}.",
                {
                  cycle: isAnnual
                    ? tx("ui.store.plan_cards.billing.cycle_annual", "annual")
                    : tx("ui.store.plan_cards.billing.cycle_monthly", "monthly"),
                }
              )}
              aria-pressed={isAnnual}
              style={{
                background: isAnnual ? ACCENT_BACKGROUND : "var(--window-document-border)",
              }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full transition-[left] duration-200 ease-in-out"
                style={{
                  left: isAnnual ? "calc(100% - 1.375rem)" : "0.125rem",
                  background: "var(--window-document-bg)",
                  borderWidth: 1,
                  borderColor: "var(--window-document-border)",
                }}
              />
            </button>
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-xs font-medium transition-colors"
              style={{ color: isAnnual ? "var(--window-document-text)" : "var(--desktop-menu-text-muted)" }}
              onClick={() => setIsAnnual(true)}
              aria-pressed={isAnnual}
            >
              {tx("ui.store.plan_cards.billing.annual", "Annual")}
              <span
                className="px-1.5 py-0.5 text-xs font-bold rounded"
                style={{ background: "var(--success-bg)", color: "var(--success)" }}
              >
                {tx("ui.store.plan_cards.billing.save_badge", "Save ~17%")}
              </span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Subscription Status Banner */}
      {subscriptionStatus && (subscriptionStatus.hasSubscription || subscriptionStatus.cancelAtPeriodEnd || subscriptionStatus.pendingDowngrade) && (
        <SubscriptionStatusBanner
          subscriptionStatus={subscriptionStatus}
          isLoadingStatus={isLoadingStatus}
          onCancelPendingChange={onCancelPendingChange}
          isCancelingPending={isCancelingPending}
          tx={tx}
        />
      )}

      {showLegacySalesCards ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                currentPlan={currentPlan}
                hasActiveSubscription={hasActiveSubscription}
                isAnnual={isAnnual}
                displayPrice={formatPrice(getDisplayPrice(plan))}
                savingsText={
                  plan.monthlyPrice > 0 && isAnnual
                    ? tx("ui.store.plan_cards.pricing.save_percent_billed_yearly", "Save {percent}% • Billed {price}/yr", {
                      percent: Math.round((1 - plan.annualPrice / (plan.monthlyPrice * 12)) * 100),
                      price: formatPrice(plan.annualPrice),
                    })
                    : plan.monthlyPrice > 0
                      ? tx("ui.store.plan_cards.pricing.billed_monthly", "Billed monthly")
                      : undefined
                }
                isManagingSubscription={isManagingSubscription}
                onCheckout={() => onCheckout(plan.id === "agency" ? "scale" : "pro", isAnnual ? "annual" : "monthly")}
                onSubscriptionChange={(tier) => onSubscriptionChange(tier, isAnnual ? "annual" : "monthly")}
                onContactSales={onContactSales}
                tx={tx}
              />
            ))}
          </div>

          <p className="mt-6 text-center text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
            {tx(
              "ui.store.plan_cards.footer.vat_note",
              "Store plan pricing is VAT-inclusive in EUR estimates. Final invoice tax is calculated at checkout."
            )}
          </p>
        </>
      ) : (
        <div
          className="rounded-lg border p-3"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg)",
          }}
        >
          <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
            {tx(
              "ui.store.plan_cards.compatibility_notice.title_v2",
              "Your existing subscription is safe"
            )}
          </p>
          <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
            <li>
              {tx(
                "ui.store.plan_cards.compatibility_notice.line_1_v2",
                "New plans are available through the diagnostic, consulting, and implementation options above."
              )}
            </li>
            <li>
              {tx(
                "ui.store.plan_cards.compatibility_notice.line_2_v2",
                "If you already have a Pro or Scale plan, it continues to work as normal."
              )}
            </li>
            <li>
              {tx(
                "ui.store.plan_cards.compatibility_notice.line_3_v2",
                "Your credits, billing, and account settings are fully preserved."
              )}
            </li>
          </ul>
        </div>
      )}
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
  tx,
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
  tx: TranslateWithFallback;
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
        background: plan.highlight ? "var(--window-document-bg-elevated)" : "var(--window-document-bg)",
        border: plan.highlight ? "2px solid var(--tone-accent-strong)" : "1px solid var(--window-document-border)",
      }}
    >
      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div
          className="absolute top-0 left-0 px-2 py-1 text-[10px] font-bold text-white rounded-br"
          style={{ background: "var(--success)" }}
        >
          {tx("ui.store.plan_cards.labels.current_plan", "Current Plan")}
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
          className="absolute top-0 right-0 px-2 py-1 text-[10px] font-bold rounded-bl"
          style={{
            background: ACCENT_BACKGROUND,
            color: ACCENT_FOREGROUND,
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
              background: plan.highlight ? ACCENT_BACKGROUND : "var(--desktop-shell-accent)",
            }}
          >
            <div style={{ color: plan.highlight ? ACCENT_FOREGROUND : "var(--tone-accent-strong)" }}>
              {plan.icon}
            </div>
          </div>
          <div>
            <h4 className="font-pixel text-xs" style={{ color: "var(--window-document-text)" }}>
              {plan.name}
            </h4>
            <p className="text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              {plan.description}
            </p>
          </div>
        </div>

        {/* Price */}
        <div className="my-4">
          <div className="flex items-baseline gap-1">
            <span className="font-pixel text-2xl" style={{ color: "var(--window-document-text)" }}>
              {displayPrice}
            </span>
            {plan.monthlyPrice > 0 && (
              <span className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                {tx("ui.store.plan_cards.pricing.per_month", "/mo")}
              </span>
            )}
          </div>
          {savingsText && (
            <p
              className="text-[10px] mt-0.5"
              style={{ color: isAnnual ? "var(--success)" : "var(--desktop-menu-text-muted)" }}
            >
              {savingsText}
            </p>
          )}
          {plan.subtext && (
            <p className="text-[10px] mt-0.5" style={{ color: "var(--tone-accent-strong)" }}>
              {plan.subtext}
            </p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-2 mb-4">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[11px]" style={{ color: "var(--window-document-text)" }}>
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
          tx={tx}
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
  tx,
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
  tx: TranslateWithFallback;
}) {
  if (isCurrentPlan) {
    return (
      <button
        type="button"
        disabled
        className="w-full py-2.5 px-4 rounded text-xs font-medium flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
        style={{
          background: "var(--desktop-shell-accent)",
          color: "var(--desktop-menu-text-muted)",
          border: "1px solid var(--window-document-border)",
        }}
      >
        <Check className="w-3.5 h-3.5" />
        {tx("ui.store.plan_cards.labels.current_plan", "Current Plan")}
      </button>
    );
  }

  if (plan.isEnterprise) {
    return (
      <button
        type="button"
        onClick={onContactSales}
        className="w-full py-2.5 px-4 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors"
        style={{
          background: "var(--window-document-bg)",
          color: "var(--window-document-text)",
          border: "1px solid var(--tone-accent-strong)",
        }}
      >
        <Phone className="w-3.5 h-3.5" />
        {tx("ui.store.plan_cards.actions.contact_sales", "Contact Sales")}
      </button>
    );
  }

  // Free plan - cancel subscription
  if (plan.id === "free" && hasActiveSubscription) {
    return (
      <button
        type="button"
        onClick={() => onSubscriptionChange("free")}
        disabled={isManagingSubscription}
        className="w-full py-2.5 px-4 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors hover:opacity-80"
        style={{
          background: "var(--window-document-bg)",
          color: "var(--window-document-text)",
          border: "1px solid var(--window-document-border)",
        }}
      >
        {isManagingSubscription ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ArrowDown className="w-3.5 h-3.5" />
        )}
        {isManagingSubscription
          ? tx("ui.store.plan_cards.actions.processing", "Processing...")
          : tx("ui.store.plan_cards.actions.cancel_subscription", "Cancel Subscription")}
      </button>
    );
  }

  // Existing subscription - manage via Stripe
  if (hasActiveSubscription) {
    return (
      <button
        type="button"
        onClick={() => onSubscriptionChange(plan.id)}
        disabled={isManagingSubscription}
        className={`w-full py-2.5 px-4 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
          isManagingSubscription ? "cursor-wait opacity-80" : "hover:opacity-80"
        }`}
        style={{
          background: plan.highlight ? ACCENT_BACKGROUND : "var(--window-document-bg)",
          color: plan.highlight ? ACCENT_FOREGROUND : "var(--window-document-text)",
          border: plan.highlight ? "1px solid var(--tone-accent-strong)" : "1px solid var(--window-document-border)",
        }}
      >
        {isManagingSubscription ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isDowngrade ? (
          <ArrowDown className="w-3.5 h-3.5" />
        ) : (
          <ArrowRight className="w-3.5 h-3.5" />
        )}
        {isManagingSubscription
          ? tx("ui.store.plan_cards.actions.processing", "Processing...")
          : isUpgrade
            ? tx("ui.store.plan_cards.actions.upgrade", "Upgrade")
            : tx("ui.store.plan_cards.actions.downgrade", "Downgrade")}
      </button>
    );
  }

  // No subscription - go to checkout
  return (
    <button
      type="button"
      onClick={onCheckout}
      className={`w-full py-2.5 px-4 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
        "hover:opacity-80"
      }`}
      style={{
        background: plan.highlight ? ACCENT_BACKGROUND : "var(--window-document-bg)",
        color: plan.highlight ? ACCENT_FOREGROUND : "var(--window-document-text)",
        border: plan.highlight ? "1px solid var(--tone-accent-strong)" : "1px solid var(--window-document-border)",
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
  tx,
}: {
  subscriptionStatus: SubscriptionStatus;
  isLoadingStatus: boolean;
  onCancelPendingChange: () => Promise<void>;
  isCancelingPending: boolean;
  tx: TranslateWithFallback;
}) {
  if (isLoadingStatus) {
    return (
      <div
        className="mb-4 p-3 rounded-lg flex items-center justify-center gap-2"
        role="status"
        aria-live="polite"
        style={{ background: "var(--desktop-shell-accent)", border: "1px solid var(--window-document-border)" }}
      >
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--tone-accent-strong)" }} />
        <span className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
          {tx("ui.store.plan_cards.status.loading", "Loading subscription status...")}
        </span>
      </div>
    );
  }

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const tierLabel = (tier: string) => {
    if (tier === "agency") return tx("ui.store.plan_cards.plans.agency.name", "Scale");
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  // Pending cancellation
  if (subscriptionStatus.cancelAtPeriodEnd && subscriptionStatus.currentPeriodEnd) {
    return (
      <div className="mb-4 p-3 rounded-lg" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--error, #dc2626)" }}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--error, #dc2626)" }} />
          <div className="flex-1">
            <h4 className="font-pixel text-xs mb-1" style={{ color: "var(--error, #dc2626)" }}>
              {tx("ui.store.plan_cards.status.canceling_title", "Subscription Canceling")}
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: "var(--window-document-text)" }}>
              {tx("ui.store.plan_cards.status.canceling.prefix", "Your")}{" "}
              {tierLabel(subscriptionStatus.currentTier)}{" "}
              {tx("ui.store.plan_cards.status.canceling.suffix", "subscription will be canceled on")}{" "}
              <strong>{formatDate(subscriptionStatus.currentPeriodEnd)}</strong>.
            </p>
            <button
              type="button"
              onClick={onCancelPendingChange}
              disabled={isCancelingPending}
              className="mt-2 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors hover:opacity-80"
              style={{ background: "var(--window-document-bg)", color: "var(--window-document-text)", border: "1px solid var(--window-document-border)" }}
            >
              {isCancelingPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {isCancelingPending
                ? tx("ui.store.plan_cards.actions.processing", "Processing...")
                : tx("ui.store.plan_cards.actions.keep_subscription", "Keep My Subscription")}
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
              {tx("ui.store.plan_cards.status.plan_change_scheduled", "Plan Change Scheduled")}
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: "var(--window-document-text)" }}>
              {tx("ui.store.plan_cards.status.plan_change.from", "Changing from")}{" "}
              <strong>{tierLabel(subscriptionStatus.currentTier)}</strong>{" "}
              {tx("ui.store.plan_cards.status.plan_change.to", "to")}{" "}
              <strong>{tierLabel(subscriptionStatus.pendingDowngrade.newTier)}</strong>{" "}
              {tx("ui.store.plan_cards.status.plan_change.on", "on")}{" "}
              <strong>{formatDate(subscriptionStatus.pendingDowngrade.effectiveDate)}</strong>.
            </p>
            <button
              type="button"
              onClick={onCancelPendingChange}
              disabled={isCancelingPending}
              className="mt-2 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors hover:opacity-80"
              style={{ background: "var(--window-document-bg)", color: "var(--window-document-text)", border: "1px solid var(--window-document-border)" }}
            >
              {isCancelingPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              {isCancelingPending
                ? tx("ui.store.plan_cards.actions.processing", "Processing...")
                : tx("ui.store.plan_cards.actions.cancel_scheduled_change", "Cancel Scheduled Change")}
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
              {tx("ui.store.plan_cards.status.active_subscription", "Active Subscription")}
            </h4>
            <p className="text-xs" style={{ color: "var(--window-document-text)" }}>
              <strong>{tierLabel(subscriptionStatus.currentTier)}</strong>{" "}
              {tx("ui.store.plan_cards.status.plan", "plan")}
              {subscriptionStatus.billingPeriod && (
                <>
                  {" "}
                  {tx("ui.store.plan_cards.status.separator", "•")}{" "}
                  {tx("ui.store.plan_cards.status.billed", "Billed")}{" "}
                  {subscriptionStatus.billingPeriod === "annual"
                    ? tx("ui.store.plan_cards.status.billing_period.annually", "annually")
                    : tx("ui.store.plan_cards.status.billing_period.monthly", "monthly")}
                </>
              )}
            </p>
            <p className="text-[10px] mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
              {tx("ui.store.plan_cards.status.next_billing_date", "Next billing date: {date}", {
                date: formatDate(subscriptionStatus.currentPeriodEnd),
              })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
