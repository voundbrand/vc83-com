"use client";

import { useShoppingCart } from "@/contexts/shopping-cart-context";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useWindowManager } from "@/hooks/use-window-manager";
import { useCurrentOrganization, useAuth } from "@/hooks/use-auth";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  ShoppingCart,
  Sparkles,
  Lock,
  Server,
  Zap,
  Code,
  Check,
  Crown,
  Building2,
  Users,
  Star,
  Rocket,
  Gift,
  ArrowRight,
  ArrowDown,
  Phone,
  Loader2,
  Clock,
  AlertCircle,
  X,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { EnterpriseContactModal } from "@/components/ai-billing/enterprise-contact-modal";

// Tier hierarchy for upgrade/downgrade comparison
const TIER_ORDER: Record<string, number> = {
  free: 0,
  community: 1,
  starter: 2,
  professional: 3,
  agency: 4,
  enterprise: 5,
};

/**
 * PLATFORM STORE WINDOW v2
 *
 * Two-tab design:
 * - Tab 1: Platform Plans (Free, Starter, Professional, Agency, Enterprise)
 * - Tab 2: AI & Add-ons (AI subscriptions, Token Packs, Private LLM, Custom Frontend)
 *
 * Modern, clean styling matching the integrations window aesthetic.
 */

type TabType = "plans" | "ai";

/**
 * NOTE: Stripe Price IDs are managed on the backend via Convex environment variables.
 * The frontend only needs to pass the tier name and billing period.
 * Backend environment variables to set:
 * - Platform Plans: STRIPE_PLATFORM_{TIER}_{MO|YR}_PRICE_ID
 * - AI Subscriptions: STRIPE_AI_STANDARD_PRICE_ID, STRIPE_AI_PRIVACY_ENHANCED_PRICE_ID
 * - Token Packs: STRIPE_TOKENS_{TIER}_PRICE_ID
 */

export function StoreWindow() {
  const { addItem } = useShoppingCart();
  const { t } = useNamespaceTranslations("ui.store");
  const { openWindow } = useWindowManager();
  const [activeTab, setActiveTab] = useState<TabType>("plans");
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("Enterprise Solutions");

  // Get current organization's plan
  const { sessionId, user } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const organization = useQuery(
    api.organizations.getById,
    currentOrganization?.id && sessionId
      ? { organizationId: currentOrganization.id as Id<"organizations">, sessionId }
      : "skip"
  );
  const currentPlan = organization?.plan || "free";
  const hasActiveSubscription = !!organization?.stripeSubscriptionId;

  // Subscription management actions
  const managePlatformSubscription = useAction(api.stripe.platformCheckout.managePlatformSubscription);
  const getSubscriptionStatus = useAction(api.stripe.platformCheckout.getSubscriptionStatus);
  const cancelPendingDowngrade = useAction(api.stripe.platformCheckout.cancelPendingDowngrade);

  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Subscription status for transparent user communication
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    hasSubscription: boolean;
    currentTier: string;
    billingPeriod?: string;
    currentPeriodEnd?: number;
    cancelAtPeriodEnd: boolean;
    pendingDowngrade?: {
      newTier: string;
      effectiveDate: number;
    };
  } | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isCancelingPending, setIsCancelingPending] = useState(false);

  // Fetch subscription status on mount and when organization changes
  useEffect(() => {
    const fetchStatus = async () => {
      if (!currentOrganization?.id) return;

      setIsLoadingStatus(true);
      try {
        const status = await getSubscriptionStatus({
          organizationId: currentOrganization.id as Id<"organizations">,
        });
        setSubscriptionStatus(status);
      } catch (error) {
        console.error("Failed to fetch subscription status:", error);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    fetchStatus();
  }, [currentOrganization?.id, getSubscriptionStatus]);

  // Handle canceling a pending downgrade
  const handleCancelPendingChange = async () => {
    if (!currentOrganization?.id) return;

    setIsCancelingPending(true);
    try {
      const result = await cancelPendingDowngrade({
        organizationId: currentOrganization.id as Id<"organizations">,
      });

      if (result.success) {
        setSubscriptionMessage({ type: "success", text: result.message });
        // Refresh status
        const status = await getSubscriptionStatus({
          organizationId: currentOrganization.id as Id<"organizations">,
        });
        setSubscriptionStatus(status);
      } else {
        setSubscriptionMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      console.error("Failed to cancel pending change:", error);
      setSubscriptionMessage({ type: "error", text: "Failed to cancel pending change. Please try again." });
    } finally {
      setIsCancelingPending(false);
    }
  };

  // Handle subscription change (upgrade/downgrade)
  const handleSubscriptionChange = async (tier: string, billingPeriod: "monthly" | "annual") => {
    if (!currentOrganization?.id) return;

    setIsManagingSubscription(true);
    setSubscriptionMessage(null);

    try {
      const result = await managePlatformSubscription({
        organizationId: currentOrganization.id as Id<"organizations">,
        newTier: tier as "free" | "starter" | "professional" | "agency" | "enterprise",
        billingPeriod,
      });

      if (result.success) {
        setSubscriptionMessage({ type: "success", text: result.message });
        // Refresh subscription status to show pending changes
        const status = await getSubscriptionStatus({
          organizationId: currentOrganization.id as Id<"organizations">,
        });
        setSubscriptionStatus(status);
      } else {
        setSubscriptionMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      console.error("Subscription change error:", error);
      setSubscriptionMessage({ type: "error", text: "Failed to update subscription. Please try again." });
    } finally {
      setIsManagingSubscription(false);
    }
  };

  // Handle adding product to cart and opening cart window
  const handleAddToCart = (product: {
    type: "ai-subscription" | "token-pack" | "platform-plan";
    name: string;
    description: string;
    price: number;
    tier?: string;
    priceId?: string;
    billingPeriod?: "monthly" | "annual";
  }) => {
    addItem({
      type: product.type,
      name: product.name,
      description: product.description,
      price: product.price,
      currency: "eur",
      quantity: 1,
      metadata: {
        ...(product.tier ? { tier: product.tier } : {}),
        ...(product.priceId ? { priceId: product.priceId } : {}),
        ...(product.billingPeriod ? { billingPeriod: product.billingPeriod } : {}),
      },
    });

    // Open platform cart window
    import("@/components/window-content/platform-cart-window").then(
      ({ PlatformCartWindow }) => {
        const cartX =
          typeof window !== "undefined" ? window.innerWidth - 420 : 1000;
        openWindow(
          "platform-cart",
          "Cart",
          <PlatformCartWindow />,
          { x: cartX, y: 100 },
          { width: 380, height: 500 }
        );
      }
    );
  };

  const handleEnterpriseClick = (title: string) => {
    setModalTitle(title);
    setShowEnterpriseModal(true);
  };

  return (
    <>
      <div
        className="h-full flex flex-col"
        style={{ background: "var(--win95-bg)" }}
      >
        {/* Header with gradient */}
        <div
          className="px-4 py-3 border-b"
          style={{
            background:
              "linear-gradient(90deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
            borderColor: "var(--win95-border)",
          }}
        >
          <h2 className="font-pixel text-sm text-white flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            {t("ui.store.title")}
          </h2>
          <p className="text-xs mt-1 text-white/80">{t("ui.store.subtitle")}</p>
        </div>

        {/* Tab Navigation */}
        <div
          className="flex border-b"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
          }}
        >
          <TabButton
            active={activeTab === "plans"}
            onClick={() => setActiveTab("plans")}
            icon={<Crown className="w-3.5 h-3.5" />}
            label="Platform Plans"
          />
          <TabButton
            active={activeTab === "ai"}
            onClick={() => setActiveTab("ai")}
            icon={<Sparkles className="w-3.5 h-3.5" />}
            label="AI & Add-ons"
          />
        </div>

        {/* Subscription Message */}
        {subscriptionMessage && (
          <div
            className="mx-4 mt-2 p-3 rounded text-xs"
            style={{
              background: subscriptionMessage.type === "success" ? "var(--success-bg, #d1fae5)" : "var(--error-bg, #fee2e2)",
              color: subscriptionMessage.type === "success" ? "var(--success, #059669)" : "var(--error, #dc2626)",
              border: `1px solid ${subscriptionMessage.type === "success" ? "var(--success)" : "var(--error)"}`,
            }}
          >
            {subscriptionMessage.text}
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "plans" ? (
            <PlatformPlansTab
              onSelectPlan={handleAddToCart}
              onContactSales={() =>
                handleEnterpriseClick("Enterprise Platform")
              }
              currentPlan={currentPlan}
              hasActiveSubscription={hasActiveSubscription}
              onSubscriptionChange={handleSubscriptionChange}
              isManagingSubscription={isManagingSubscription}
              subscriptionStatus={subscriptionStatus}
              isLoadingStatus={isLoadingStatus}
              onCancelPendingChange={handleCancelPendingChange}
              isCancelingPending={isCancelingPending}
              t={t}
            />
          ) : (
            <AIAddonsTab
              onAddToCart={handleAddToCart}
              onContactSales={handleEnterpriseClick}
              t={t}
            />
          )}
        </div>
      </div>

      {/* Enterprise Contact Modal */}
      <EnterpriseContactModal
        isOpen={showEnterpriseModal}
        onClose={() => setShowEnterpriseModal(false)}
        title={modalTitle}
      />
    </>
  );
}

/**
 * Tab Button Component
 */
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-2.5 text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
        active ? "border-b-2" : "opacity-70 hover:opacity-100"
      }`}
      style={{
        color: active ? "var(--win95-highlight)" : "var(--win95-text)",
        borderColor: active ? "var(--win95-highlight)" : "transparent",
        background: active ? "var(--win95-bg)" : "transparent",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * PLATFORM PLANS TAB
 * Shows Free, Starter, Professional, Agency, Enterprise tiers
 * Default to Annual billing (shown as monthly equivalent)
 */
interface PlatformPlansTabProps {
  onSelectPlan: (product: {
    type: "platform-plan";
    name: string;
    description: string;
    price: number;
    tier: string;
    billingPeriod: "monthly" | "annual";
  }) => void;
  onContactSales: () => void;
  currentPlan: string;
  hasActiveSubscription: boolean;
  onSubscriptionChange: (tier: string, billingPeriod: "monthly" | "annual") => Promise<void>;
  isManagingSubscription: boolean;
  subscriptionStatus: {
    hasSubscription: boolean;
    currentTier: string;
    billingPeriod?: string;
    currentPeriodEnd?: number;
    cancelAtPeriodEnd: boolean;
    pendingDowngrade?: {
      newTier: string;
      effectiveDate: number;
    };
  } | null;
  isLoadingStatus: boolean;
  onCancelPendingChange: () => Promise<void>;
  isCancelingPending: boolean;
  t: (key: string) => string;
}

function PlatformPlansTab({
  onSelectPlan,
  onContactSales,
  currentPlan,
  hasActiveSubscription,
  onSubscriptionChange,
  isManagingSubscription,
  subscriptionStatus,
  isLoadingStatus,
  onCancelPendingChange,
  isCancelingPending,
  t,
}: PlatformPlansTabProps) {
  // Default to annual billing (better value)
  const [isAnnual, setIsAnnual] = useState(true);

  // Plan configurations with both monthly and annual pricing
  // Note: Stripe Price IDs are managed on the backend via Convex env vars
  const plans = [
    {
      id: "free",
      name: "Free",
      monthlyPrice: 0,
      annualPrice: 0, // Free is always free
      description: "Perfect for getting started",
      icon: <Gift className="w-5 h-5" />,
      features: [
        "1 user",
        "100 contacts",
        "3 projects",
        "Basic CRM",
        "1 API key",
        "Community support",
      ],
      cta: "Get Started",
      highlight: false,
    },
    {
      id: "community",
      name: "Community",
      monthlyPrice: 900, // €9/mo
      annualPrice: 9000, // €90/yr (≈€7.50/mo - save ~17%)
      description: "Course + Templates + Calls",
      icon: <Users className="w-5 h-5" />,
      features: [
        "All Free tier features",
        "Foundations Course",
        "Templates Library",
        "Weekly Live Calls",
        "Private Skool Group",
        "Early Access Features",
      ],
      cta: "Start 14-Day Trial",
      highlight: false,
      badge: "🎓 With Community",
      trialBadge: "14-DAY FREE TRIAL",
      savingsPercent: 17,
    },
    {
      id: "starter",
      name: "Starter",
      monthlyPrice: 19900, // €199/mo
      annualPrice: 199000, // €1,990/yr (≈€166/mo - save ~17%)
      description: "For solo operators",
      icon: <Rocket className="w-5 h-5" />,
      features: [
        "3 users",
        "1,000 contacts",
        "20 projects",
        "500 emails/month",
        "Stripe Connect",
        "Email support (48h)",
      ],
      cta: "Subscribe",
      highlight: false,
      savingsPercent: 17,
    },
    {
      id: "professional",
      name: "Professional",
      monthlyPrice: 39900, // €399/mo
      annualPrice: 399000, // €3,990/yr (≈€333/mo - save ~17%)
      description: "For growing teams",
      icon: <Star className="w-5 h-5" />,
      features: [
        "10 users",
        "5,000 contacts",
        "Unlimited projects",
        "2,500 emails/month",
        "Custom domains",
        "Email support (24h)",
      ],
      cta: "Subscribe",
      highlight: true,
      badge: "Most Popular",
      savingsPercent: 17,
    },
    {
      id: "agency",
      name: "Agency",
      monthlyPrice: 59900, // €599/mo
      annualPrice: 599000, // €5,990/yr (≈€499/mo - save ~17%)
      description: "Multi-client operators",
      icon: <Users className="w-5 h-5" />,
      features: [
        "15 users",
        "10,000 contacts",
        "Sub-organizations",
        "10,000 emails/month",
        "White-label",
        "Priority support (12h)",
      ],
      cta: "Subscribe",
      highlight: false,
      subtext: "+ €79/sub-org",
      savingsPercent: 17,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      monthlyPrice: -1, // Contact sales
      annualPrice: -1, // Contact sales
      description: "Large organizations",
      icon: <Building2 className="w-5 h-5" />,
      features: [
        "Unlimited users",
        "Unlimited contacts",
        "Custom SLA",
        "SSO/SAML",
        "Dedicated support",
        "Custom integrations",
      ],
      cta: "Contact Sales",
      highlight: false,
      isEnterprise: true,
    },
  ];

  // Show monthly equivalent based on billing period
  // Annual shows the calculated monthly rate (annualPrice / 12)
  const getDisplayPrice = (plan: typeof plans[0]) => {
    if (plan.monthlyPrice <= 0) return plan.monthlyPrice; // Free/Custom plans
    if (isAnnual) {
      // Show monthly equivalent of annual price
      return Math.round(plan.annualPrice / 12);
    }
    return plan.monthlyPrice;
  };

  // Get actual total for checkout
  // Uses the actual price configured for each billing period
  const getCheckoutPrice = (plan: typeof plans[0]) => {
    if (isAnnual && plan.annualPrice > 0) {
      return plan.annualPrice;
    }
    return plan.monthlyPrice;
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return "€0";
    if (cents === -1) return "Custom";
    return `€${(cents / 100).toFixed(0)}`;
  };

  return (
    <div className="space-y-4">
      {/* Plans intro */}
      <div className="text-center mb-6">
        <h3
          className="font-pixel text-sm mb-2"
          style={{ color: "var(--win95-highlight)" }}
        >
          Choose Your Plan
        </h3>
        <p className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>
          Scale your business with the right tools
        </p>

        {/* Billing Period Toggle */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <span
            className={`text-xs font-medium cursor-pointer transition-colors ${!isAnnual ? "text-white" : ""}`}
            style={{ color: !isAnnual ? "var(--win95-highlight)" : "var(--win95-text-secondary)" }}
            onClick={() => setIsAnnual(false)}
          >
            Monthly
          </span>

          {/* Toggle Switch */}
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
              style={{
                left: isAnnual ? "calc(100% - 22px)" : "2px",
              }}
            />
          </button>

          <span
            className={`text-xs font-medium cursor-pointer transition-colors flex items-center gap-1`}
            style={{ color: isAnnual ? "var(--win95-highlight)" : "var(--win95-text-secondary)" }}
            onClick={() => setIsAnnual(true)}
          >
            Annual
            <span
              className="px-1.5 py-0.5 text-[10px] font-bold rounded flex items-center gap-1"
              style={{
                background: "var(--success)",
                color: "white",
              }}
            >
              🎁 2 months FREE
            </span>
          </span>
        </div>
      </div>

      {/* Subscription Status Banner - Shows current status and pending changes */}
      {subscriptionStatus && (subscriptionStatus.hasSubscription || subscriptionStatus.cancelAtPeriodEnd || subscriptionStatus.pendingDowngrade) && (
        <SubscriptionStatusBanner
          subscriptionStatus={subscriptionStatus}
          isLoadingStatus={isLoadingStatus}
          onCancelPendingChange={onCancelPendingChange}
          isCancelingPending={isCancelingPending}
        />
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="relative rounded-lg overflow-hidden transition-all hover:shadow-lg"
            style={{
              background: plan.highlight
                ? "var(--win95-bg-light)"
                : "var(--win95-bg)",
              border: plan.highlight
                ? "2px solid var(--win95-highlight)"
                : "1px solid var(--win95-border)",
            }}
          >
            {/* Current Plan Badge */}
            {plan.id === currentPlan && (
              <div
                className="absolute top-0 left-0 px-2 py-1 text-[10px] font-bold text-white rounded-br"
                style={{
                  background: "var(--success)",
                }}
              >
                Current Plan
              </div>
            )}

            {/* Trial Badge for Community/Paid Tiers */}
            {plan.trialBadge && plan.id !== currentPlan && (
              <div
                className="absolute top-0 left-0 px-2 py-1 text-[10px] font-bold text-white rounded-br"
                style={{
                  background: "var(--success)",
                }}
              >
                {plan.trialBadge}
              </div>
            )}

            {/* Badge */}
            {plan.badge && plan.id !== currentPlan && (
              <div
                className="absolute top-0 right-0 px-2 py-1 text-[10px] font-bold text-white rounded-bl"
                style={{
                  background:
                    "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
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
                  <h4
                    className="font-pixel text-xs"
                    style={{ color: "var(--win95-highlight)" }}
                  >
                    {plan.name}
                  </h4>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--win95-text-secondary)" }}
                  >
                    {plan.description}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="my-4">
                <div className="flex items-baseline gap-1">
                  <span
                    className="font-pixel text-2xl"
                    style={{ color: "var(--win95-text)" }}
                  >
                    {formatPrice(getDisplayPrice(plan))}
                  </span>
                  {getDisplayPrice(plan) > 0 && (
                    <span
                      className="text-xs"
                      style={{ color: "var(--win95-text-secondary)" }}
                    >
                      /mo
                    </span>
                  )}
                </div>
                {/* Show billing info based on period */}
                {plan.monthlyPrice > 0 && (
                  <p
                    className="text-[10px] mt-0.5 flex items-center gap-1"
                    style={{ color: isAnnual ? "var(--success)" : "var(--win95-text-secondary)" }}
                  >
                    {isAnnual ? (
                      <>
                        Save {Math.round((1 - plan.annualPrice / (plan.monthlyPrice * 12)) * 100)}% • Billed {formatPrice(plan.annualPrice)}/yr
                      </>
                    ) : (
                      <>Billed monthly</>
                    )}
                  </p>
                )}
                {plan.subtext && (
                  <p
                    className="text-[10px] mt-0.5"
                    style={{ color: "var(--win95-highlight)" }}
                  >
                    {plan.subtext}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-[11px]"
                    style={{ color: "var(--win95-text)" }}
                  >
                    <Check
                      className="w-3 h-3 flex-shrink-0 mt-0.5"
                      style={{ color: "var(--success)" }}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              {(() => {
                const isCurrentPlan = plan.id === currentPlan;
                const currentTierOrder = TIER_ORDER[currentPlan] ?? 0;
                const planTierOrder = TIER_ORDER[plan.id] ?? 0;
                const isUpgrade = planTierOrder > currentTierOrder;
                const isDowngrade = planTierOrder < currentTierOrder;
                const isFreePlan = plan.id === "free";

                // Determine CTA label
                let ctaLabel = plan.cta;
                if (isCurrentPlan) {
                  ctaLabel = "Current Plan";
                } else if (plan.isEnterprise) {
                  ctaLabel = "Contact Sales";
                } else if (isFreePlan) {
                  // Free plan - contact support to downgrade
                  ctaLabel = "Contact Support";
                } else if (isUpgrade) {
                  ctaLabel = "Upgrade";
                } else if (isDowngrade) {
                  ctaLabel = "Downgrade";
                }

                // Enterprise - contact sales
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
                      {ctaLabel}
                    </button>
                  );
                }

                // Free plan - use subscription management for downgrade (cancel at period end)
                if (isFreePlan && !isCurrentPlan && hasActiveSubscription) {
                  return (
                    <button
                      onClick={() => onSubscriptionChange("free", isAnnual ? "annual" : "monthly")}
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

                // Free plan without subscription - already on free
                if (isFreePlan && !isCurrentPlan) {
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
                      Free Plan
                    </button>
                  );
                }

                // For users with active subscription - use subscription management
                // This handles: upgrades (immediate with proration) and downgrades (scheduled at period end)
                if (hasActiveSubscription && !isCurrentPlan && !isFreePlan) {
                  return (
                    <button
                      onClick={() => onSubscriptionChange(plan.id, isAnnual ? "annual" : "monthly")}
                      disabled={isManagingSubscription}
                      className={`w-full py-2.5 px-4 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                        isManagingSubscription
                          ? "cursor-wait opacity-80"
                          : plan.highlight
                            ? "text-white hover:opacity-90"
                            : "hover:opacity-80"
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
                      {isManagingSubscription ? "Processing..." : ctaLabel}
                    </button>
                  );
                }

                // For users without subscription - use checkout flow
                return (
                  <button
                    onClick={() =>
                      !isCurrentPlan &&
                      !isFreePlan &&
                      onSelectPlan({
                        type: "platform-plan",
                        name: `${plan.name} Plan${isAnnual ? " (Annual)" : ""}`,
                        description: plan.description,
                        price: getCheckoutPrice(plan),
                        tier: plan.id,
                        billingPeriod: isAnnual ? "annual" : "monthly",
                      })
                    }
                    disabled={isCurrentPlan}
                    className={`w-full py-2.5 px-4 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                      isCurrentPlan
                        ? "cursor-not-allowed opacity-60"
                        : plan.highlight
                          ? "text-white hover:opacity-90"
                          : "hover:opacity-80"
                    }`}
                    style={{
                      background: isCurrentPlan
                        ? "var(--win95-bg-light)"
                        : plan.highlight
                          ? "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)"
                          : "var(--win95-bg-light)",
                      color: isCurrentPlan
                        ? "var(--neutral-gray)"
                        : plan.highlight
                          ? "white"
                          : "var(--win95-text)",
                      border: isCurrentPlan
                        ? "1px solid var(--win95-border)"
                        : plan.highlight
                          ? "none"
                          : "1px solid var(--win95-border)",
                    }}
                  >
                    {ctaLabel}
                    {!isCurrentPlan && (
                      isDowngrade ? (
                        <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5" />
                      )
                    )}
                    {isCurrentPlan && (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </button>
                );
              })()}
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p
        className="text-center text-[10px] mt-6"
        style={{ color: "var(--win95-text-secondary)" }}
      >
        All prices in EUR, including 19% VAT. Cancel anytime.
      </p>
    </div>
  );
}

/**
 * AI & ADD-ONS TAB
 * Shows AI subscriptions, Token Packs, Private LLM, Custom Frontend
 */
interface AIAddonsTabProps {
  onAddToCart: (product: {
    type: "ai-subscription" | "token-pack";
    name: string;
    description: string;
    price: number;
    tier?: string;
    priceId?: string;
  }) => void;
  onContactSales: (title: string) => void;
  t: (key: string) => string;
}

function AIAddonsTab({ onAddToCart, onContactSales, t }: AIAddonsTabProps) {
  return (
    <div className="space-y-6">
      {/* AI Subscriptions Section */}
      <section>
        <SectionHeader
          icon={<Sparkles className="w-4 h-4" />}
          title="AI Agents"
          subtitle="Power your workflows with AI"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Standard Tier */}
          <AIProductCard
            icon={<Sparkles className="w-5 h-5" />}
            name="AI Standard"
            description="Cloud AI for general business use"
            price={4900}
            period="/month"
            features={[
              "500K tokens included",
              "All major AI models",
              "Best performance routing",
              "General business use",
            ]}
            onSelect={() =>
              onAddToCart({
                type: "ai-subscription",
                name: "AI Standard",
                description: "Cloud AI subscription with 500K tokens",
                price: 4900,
                tier: "standard",
              })
            }
          />

          {/* Privacy-Enhanced Tier */}
          <AIProductCard
            icon={<Lock className="w-5 h-5" />}
            name="AI Privacy-Enhanced"
            description="Zero data retention, EU-prioritized"
            price={4900}
            period="/month"
            features={[
              "500K tokens included",
              "Zero data retention (ZDR)",
              "No model training on data",
              "GDPR compliance ready",
              "EU providers prioritized",
            ]}
            popular
            onSelect={() =>
              onAddToCart({
                type: "ai-subscription",
                name: "AI Privacy-Enhanced",
                description: "Privacy-first AI with ZDR",
                price: 4900,
                tier: "privacy-enhanced",
              })
            }
          />
        </div>
      </section>

      {/* Token Packs Section */}
      <section>
        <SectionHeader
          icon={<Zap className="w-4 h-4" />}
          title="Token Packs"
          subtitle="One-time purchases, never expire"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <TokenPackCard
            name="Starter"
            tokens="1M"
            price={2900}
            perMillion="€29.00"
            onSelect={() =>
              onAddToCart({
                type: "token-pack",
                name: "Token Pack - Starter",
                description: "1,000,000 AI tokens",
                price: 2900,
                tier: "starter",
              })
            }
          />
          <TokenPackCard
            name="Standard"
            tokens="5M"
            price={13900}
            perMillion="€27.80"
            discount="4%"
            onSelect={() =>
              onAddToCart({
                type: "token-pack",
                name: "Token Pack - Standard",
                description: "5,000,000 AI tokens",
                price: 13900,
                tier: "standard",
              })
            }
          />
          <TokenPackCard
            name="Professional"
            tokens="10M"
            price={24900}
            perMillion="€24.90"
            discount="14%"
            popular
            onSelect={() =>
              onAddToCart({
                type: "token-pack",
                name: "Token Pack - Professional",
                description: "10,000,000 AI tokens",
                price: 24900,
                tier: "professional",
              })
            }
          />
          <TokenPackCard
            name="Enterprise"
            tokens="50M"
            price={114900}
            perMillion="€22.98"
            discount="21%"
            onSelect={() =>
              onAddToCart({
                type: "token-pack",
                name: "Token Pack - Enterprise",
                description: "50,000,000 AI tokens",
                price: 114900,
                tier: "enterprise",
              })
            }
          />
        </div>
      </section>

      {/* Private LLM Section */}
      <section>
        <SectionHeader
          icon={<Server className="w-4 h-4" />}
          title="Private LLM"
          subtitle="Dedicated AI infrastructure"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PrivateLLMCard
            name="Starter"
            price={250000}
            features={[
              "Scale-to-zero compute",
              "~50K requests/month",
              "8h setup included",
              "99% SLA",
            ]}
            onContactSales={() => onContactSales("Private LLM - Starter")}
          />
          <PrivateLLMCard
            name="Professional"
            price={600000}
            features={[
              "Dedicated A10G GPU",
              "~200K requests/month",
              "16h setup included",
              "99.5% SLA",
            ]}
            popular
            onContactSales={() => onContactSales("Private LLM - Professional")}
          />
          <PrivateLLMCard
            name="Enterprise"
            price={-1}
            features={[
              "Multi-GPU / A100",
              "Unlimited requests",
              "Dedicated engineer",
              "99.9% SLA",
            ]}
            isEnterprise
            onContactSales={() => onContactSales("Private LLM - Enterprise")}
          />
        </div>
      </section>

      {/* Custom Frontend Section */}
      <section>
        <SectionHeader
          icon={<Code className="w-4 h-4" />}
          title="Custom Development"
          subtitle="Bespoke solutions for your business"
        />
        <CustomFrontendCard
          onContactSales={() => onContactSales("Custom Frontend Development")}
        />
      </section>
    </div>
  );
}

/**
 * SUBSCRIPTION STATUS BANNER
 *
 * Displays transparent information about the user's subscription status,
 * including:
 * - Current billing period and renewal date
 * - Pending cancellation notice
 * - Pending downgrade notice with effective date
 * - Option to cancel pending changes
 */
function SubscriptionStatusBanner({
  subscriptionStatus,
  isLoadingStatus,
  onCancelPendingChange,
  isCancelingPending,
}: {
  subscriptionStatus: {
    hasSubscription: boolean;
    currentTier: string;
    billingPeriod?: string;
    currentPeriodEnd?: number;
    cancelAtPeriodEnd: boolean;
    pendingDowngrade?: {
      newTier: string;
      effectiveDate: number;
    };
  };
  isLoadingStatus: boolean;
  onCancelPendingChange: () => Promise<void>;
  isCancelingPending: boolean;
}) {
  if (isLoadingStatus) {
    return (
      <div
        className="mb-4 p-3 rounded-lg flex items-center justify-center gap-2"
        style={{
          background: "var(--win95-bg-light)",
          border: "1px solid var(--win95-border)",
        }}
      >
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--win95-highlight)" }} />
        <span className="text-xs" style={{ color: "var(--win95-text-secondary)" }}>
          Loading subscription status...
        </span>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const tierLabel = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  // Determine what kind of banner to show
  const hasPendingCancellation = subscriptionStatus.cancelAtPeriodEnd;
  const hasPendingDowngrade = !!subscriptionStatus.pendingDowngrade;
  const hasActiveSubscription = subscriptionStatus.hasSubscription && !hasPendingCancellation && !hasPendingDowngrade;

  // Banner for pending cancellation (moving to Free)
  if (hasPendingCancellation && subscriptionStatus.currentPeriodEnd) {
    return (
      <div
        className="mb-4 p-3 rounded-lg"
        style={{
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid var(--error, #dc2626)",
        }}
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--error, #dc2626)" }} />
          <div className="flex-1">
            <h4 className="font-pixel text-xs mb-1" style={{ color: "var(--error, #dc2626)" }}>
              Subscription Canceling
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: "var(--win95-text)" }}>
              Your {tierLabel(subscriptionStatus.currentTier)} subscription will be canceled on{" "}
              <strong>{formatDate(subscriptionStatus.currentPeriodEnd)}</strong>.
              You&apos;ll move to the Free plan after this date.
            </p>
            <p className="text-[10px] mt-1" style={{ color: "var(--win95-text-secondary)" }}>
              You&apos;ll keep all your current features until then.
            </p>
            <button
              onClick={onCancelPendingChange}
              disabled={isCancelingPending}
              className="mt-2 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors hover:opacity-80"
              style={{
                background: "var(--win95-bg)",
                color: "var(--win95-highlight)",
                border: "1px solid var(--win95-highlight)",
              }}
            >
              {isCancelingPending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  Keep My Subscription
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Banner for pending downgrade
  if (hasPendingDowngrade && subscriptionStatus.pendingDowngrade) {
    return (
      <div
        className="mb-4 p-3 rounded-lg"
        style={{
          background: "rgba(234, 179, 8, 0.1)",
          border: "1px solid var(--warning, #eab308)",
        }}
      >
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--warning, #eab308)" }} />
          <div className="flex-1">
            <h4 className="font-pixel text-xs mb-1" style={{ color: "var(--warning, #ca8a04)" }}>
              Plan Change Scheduled
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: "var(--win95-text)" }}>
              Your plan will change from <strong>{tierLabel(subscriptionStatus.currentTier)}</strong> to{" "}
              <strong>{tierLabel(subscriptionStatus.pendingDowngrade.newTier)}</strong> on{" "}
              <strong>{formatDate(subscriptionStatus.pendingDowngrade.effectiveDate)}</strong>.
            </p>
            <p className="text-[10px] mt-1" style={{ color: "var(--win95-text-secondary)" }}>
              You&apos;ll keep all your current features until the change takes effect.
            </p>
            <button
              onClick={onCancelPendingChange}
              disabled={isCancelingPending}
              className="mt-2 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors hover:opacity-80"
              style={{
                background: "var(--win95-bg)",
                color: "var(--win95-highlight)",
                border: "1px solid var(--win95-highlight)",
              }}
            >
              {isCancelingPending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <X className="w-3 h-3" />
                  Cancel Scheduled Change
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Banner for active subscription (info only)
  if (hasActiveSubscription && subscriptionStatus.currentPeriodEnd) {
    return (
      <div
        className="mb-4 p-3 rounded-lg"
        style={{
          background: "rgba(34, 197, 94, 0.1)",
          border: "1px solid var(--success, #22c55e)",
        }}
      >
        <div className="flex items-start gap-3">
          <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--success, #22c55e)" }} />
          <div className="flex-1">
            <h4 className="font-pixel text-xs mb-1" style={{ color: "var(--success, #16a34a)" }}>
              Active Subscription
            </h4>
            <p className="text-xs" style={{ color: "var(--win95-text)" }}>
              <strong>{tierLabel(subscriptionStatus.currentTier)}</strong> plan
              {subscriptionStatus.billingPeriod && (
                <> • Billed {subscriptionStatus.billingPeriod === "annual" ? "annually" : "monthly"}</>
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

/**
 * Section Header Component
 */
function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div
        className="p-1.5 rounded"
        style={{ background: "var(--win95-bg-light)" }}
      >
        <div style={{ color: "var(--win95-highlight)" }}>{icon}</div>
      </div>
      <div>
        <h3
          className="font-pixel text-xs"
          style={{ color: "var(--win95-highlight)" }}
        >
          {title}
        </h3>
        <p
          className="text-[10px]"
          style={{ color: "var(--win95-text-secondary)" }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}

/**
 * AI Product Card Component
 */
function AIProductCard({
  icon,
  name,
  description,
  price,
  period,
  features,
  popular,
  onSelect,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  price: number;
  period: string;
  features: string[];
  popular?: boolean;
  onSelect: () => void;
}) {
  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(0)}`;

  return (
    <div
      className="relative rounded-lg overflow-hidden transition-all hover:shadow-md"
      style={{
        background: popular ? "var(--win95-bg-light)" : "var(--win95-bg)",
        border: popular
          ? "2px solid var(--win95-highlight)"
          : "1px solid var(--win95-border)",
      }}
    >
      {popular && (
        <div
          className="absolute top-0 right-0 px-2 py-1 text-[10px] font-bold text-white rounded-bl"
          style={{
            background:
              "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
          }}
        >
          Recommended
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div style={{ color: "var(--win95-highlight)" }}>{icon}</div>
          <div>
            <h4
              className="font-pixel text-xs"
              style={{ color: "var(--win95-highlight)" }}
            >
              {name}
            </h4>
            <p
              className="text-[10px]"
              style={{ color: "var(--win95-text-secondary)" }}
            >
              {description}
            </p>
          </div>
        </div>

        <div className="my-3">
          <span
            className="font-pixel text-xl"
            style={{ color: "var(--win95-text)" }}
          >
            {formatPrice(price)}
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--win95-text-secondary)" }}
          >
            {period}
          </span>
        </div>

        <ul className="space-y-1.5 mb-4">
          {features.map((feature, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-[11px]"
              style={{ color: "var(--win95-text)" }}
            >
              <Check
                className="w-3 h-3 flex-shrink-0 mt-0.5"
                style={{ color: "var(--success)" }}
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={onSelect}
          className="w-full py-2 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors hover:opacity-90"
          style={{
            background: popular
              ? "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)"
              : "var(--win95-bg-light)",
            color: popular ? "white" : "var(--win95-text)",
            border: popular ? "none" : "1px solid var(--win95-border)",
          }}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Add to Cart
        </button>
      </div>
    </div>
  );
}

/**
 * Token Pack Card Component
 */
function TokenPackCard({
  name,
  tokens,
  price,
  perMillion,
  discount,
  popular,
  onSelect,
}: {
  name: string;
  tokens: string;
  price: number;
  perMillion: string;
  discount?: string;
  popular?: boolean;
  onSelect: () => void;
}) {
  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(0)}`;

  return (
    <div
      className="relative rounded-lg overflow-hidden transition-all hover:shadow-md cursor-pointer"
      onClick={onSelect}
      style={{
        background: popular ? "var(--win95-bg-light)" : "var(--win95-bg)",
        border: popular
          ? "2px solid var(--win95-highlight)"
          : "1px solid var(--win95-border)",
      }}
    >
      {discount && (
        <div
          className="absolute top-0 right-0 px-1.5 py-0.5 text-[9px] font-bold text-white rounded-bl"
          style={{
            background: "var(--success)",
          }}
        >
          -{discount}
        </div>
      )}

      <div className="p-3">
        <div className="mb-2">
          <Zap
            className="w-4 h-4"
            style={{ color: "var(--win95-highlight)" }}
          />
        </div>

        <h4
          className="font-pixel text-xs mb-0.5"
          style={{ color: "var(--win95-highlight)" }}
        >
          {name}
        </h4>
        <p
          className="text-[10px] font-bold mb-2"
          style={{ color: "var(--win95-text)" }}
        >
          {tokens} tokens
        </p>

        <div className="mb-2">
          <span
            className="font-pixel text-base"
            style={{ color: "var(--win95-text)" }}
          >
            {formatPrice(price)}
          </span>
        </div>
        <p
          className="text-[9px]"
          style={{ color: "var(--win95-text-secondary)" }}
        >
          {perMillion}/1M
        </p>
      </div>
    </div>
  );
}

/**
 * Private LLM Card Component
 */
function PrivateLLMCard({
  name,
  price,
  features,
  popular,
  isEnterprise,
  onContactSales,
}: {
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
  isEnterprise?: boolean;
  onContactSales: () => void;
}) {
  const formatPrice = (cents: number) => {
    if (cents === -1) return "Custom";
    return `€${(cents / 100).toLocaleString("de-DE")}`;
  };

  return (
    <div
      className="relative rounded-lg overflow-hidden transition-all hover:shadow-md"
      style={{
        background: popular ? "var(--win95-bg-light)" : "var(--win95-bg)",
        border: popular
          ? "2px solid var(--win95-highlight)"
          : "1px solid var(--win95-border)",
      }}
    >
      {popular && (
        <div
          className="absolute top-0 right-0 px-2 py-1 text-[10px] font-bold text-white rounded-bl"
          style={{
            background:
              "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
          }}
        >
          Popular
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Server
            className="w-5 h-5"
            style={{ color: "var(--win95-highlight)" }}
          />
          <h4
            className="font-pixel text-xs"
            style={{ color: "var(--win95-highlight)" }}
          >
            {name}
          </h4>
        </div>

        <div className="my-3">
          <span
            className="font-pixel text-lg"
            style={{ color: "var(--win95-text)" }}
          >
            {formatPrice(price)}
          </span>
          {!isEnterprise && (
            <span
              className="text-xs"
              style={{ color: "var(--win95-text-secondary)" }}
            >
              /month
            </span>
          )}
        </div>

        <ul className="space-y-1.5 mb-4">
          {features.map((feature, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-[11px]"
              style={{ color: "var(--win95-text)" }}
            >
              <Check
                className="w-3 h-3 flex-shrink-0 mt-0.5"
                style={{ color: "var(--success)" }}
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={onContactSales}
          className="w-full py-2 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors hover:opacity-90"
          style={{
            background: "var(--win95-bg-light)",
            color: "var(--win95-highlight)",
            border: "1px solid var(--win95-highlight)",
          }}
        >
          <Phone className="w-3.5 h-3.5" />
          Contact Sales
        </button>
      </div>
    </div>
  );
}

/**
 * Custom Frontend Card Component
 */
function CustomFrontendCard({
  onContactSales,
}: {
  onContactSales: () => void;
}) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: "1px solid var(--win95-border)",
        background: "var(--win95-bg)",
      }}
    >
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Description */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Code
              className="w-5 h-5"
              style={{ color: "var(--win95-highlight)" }}
            />
            <h4
              className="font-pixel text-sm"
              style={{ color: "var(--win95-highlight)" }}
            >
              Custom Frontend
            </h4>
          </div>

          <p
            className="text-sm mb-4 leading-relaxed"
            style={{ color: "var(--win95-text)" }}
          >
            Get a professionally built, custom frontend that integrates
            seamlessly with the l4yercak3 platform.
          </p>

          <ul className="space-y-2 mb-4">
            {[
              { title: "Custom Design", desc: "Tailored to your brand" },
              { title: "Full Integration", desc: "Connected to your data" },
              { title: "Responsive", desc: "Works on all devices" },
              { title: "Ongoing Support", desc: "Maintenance included" },
            ].map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Check
                  className="w-4 h-4 flex-shrink-0 mt-0.5"
                  style={{ color: "var(--success)" }}
                />
                <div>
                  <p
                    className="text-xs font-bold"
                    style={{ color: "var(--win95-text)" }}
                  >
                    {item.title}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--win95-text-secondary)" }}
                  >
                    {item.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Preview & CTA */}
        <div className="flex flex-col justify-center items-center">
          <div className="mb-4 w-full">
            <div
              className="rounded overflow-hidden"
              style={{
                border: "1px solid var(--win95-border)",
                background: "var(--win95-bg-light)",
              }}
            >
              <div className="w-full h-40 overflow-hidden">
                <iframe
                  src="https://v0-co-working-space-detail-page.vercel.app/"
                  className="border-0"
                  style={{
                    width: "200%",
                    height: "320px",
                    transform: "scale(0.5)",
                    transformOrigin: "top left",
                  }}
                  title="Example Custom Web Project"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
            <p
              className="text-[9px] text-center mt-1"
              style={{ color: "var(--win95-text-secondary)" }}
            >
              Example project preview
            </p>
          </div>

          <button
            onClick={onContactSales}
            className="w-full py-2.5 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors hover:opacity-90"
            style={{
              background:
                "linear-gradient(135deg, var(--win95-highlight) 0%, var(--win95-gradient-end) 100%)",
              color: "white",
            }}
          >
            <Phone className="w-3.5 h-3.5" />
            Contact Sales
          </button>

          <p
            className="text-xs font-pixel mt-3"
            style={{ color: "var(--win95-highlight)" }}
          >
            Starting from €2,500
          </p>
        </div>
      </div>
    </div>
  );
}
