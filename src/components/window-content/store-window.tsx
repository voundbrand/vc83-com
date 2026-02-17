"use client";

import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useWindowManager } from "@/hooks/use-window-manager";
import { useCurrentOrganization, useAuth } from "@/hooks/use-auth";
import { useQuery, useAction } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import {
  ShoppingCart,
  ArrowLeft,
  Maximize2,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, lazy } from "react";
import { EnterpriseContactModal } from "@/components/ai-billing/enterprise-contact-modal";
import { StorePlanCards } from "./store/store-plan-cards";
import { StoreCreditSection } from "./store/store-credit-section";
import {
  InteriorHeader,
  InteriorRoot,
  InteriorSubtitle,
  InteriorTitle,
} from "@/components/window-content/shared/interior-primitives";

const PurchaseResultWindow = lazy(() =>
  import("@/components/window-content/purchase-result-window").then(m => ({ default: m.PurchaseResultWindow }))
);

/**
 * PLATFORM STORE WINDOW v3
 *
 * Simplified layout:
 * - Plan cards: Free, Pro (€29/mo), Agency (€299/mo), Enterprise (custom)
 * - Credit purchase section with tiered pricing
 * - Subscription management (upgrade/downgrade/cancel)
 *
 * All Stripe checkout logic lives in the backend.
 */

interface StoreWindowProps {
  fullScreen?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api: apiRefs } = require("../../../convex/_generated/api") as { api: any };

const getOrganizationByIdQuery = apiRefs.organizations.getById;
const getLicenseQuery = apiRefs.licensing.helpers.getLicense;
const managePlatformSubscriptionAction = apiRefs.stripe.platformCheckout.managePlatformSubscription;
const getSubscriptionStatusAction = apiRefs.stripe.platformCheckout.getSubscriptionStatus;
const cancelPendingDowngradeAction = apiRefs.stripe.platformCheckout.cancelPendingDowngrade;
const createPlatformCheckoutAction = apiRefs.stripe.platformCheckout.createPlatformCheckoutSession;
const createCreditCheckoutAction = apiRefs.stripe.creditCheckout.createCreditCheckoutSession;

export function StoreWindow({ fullScreen = false }: StoreWindowProps = {}) {
  const { t } = useNamespaceTranslations("ui.store");
  const { openWindow } = useWindowManager();
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("Enterprise Solutions");

  // Organization context
  const { sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const organizationId = currentOrganization?.id as Id<"organizations"> | undefined;
  const organizationQueryArgs =
    organizationId && sessionId
      ? { organizationId, sessionId }
      : "skip";
  const organization = useQuery(
    getOrganizationByIdQuery,
    organizationQueryArgs
  );

  // License for plan tier
  const license = useQuery(
    getLicenseQuery,
    organizationId ? { organizationId } : "skip"
  );

  const currentPlan = license?.planTier || "free";
  const hasActiveSubscription = !!organization?.stripeSubscriptionId;

  // Subscription management actions
  const managePlatformSubscription = useAction(managePlatformSubscriptionAction);
  const getSubscriptionStatus = useAction(getSubscriptionStatusAction);
  const cancelPendingDowngrade = useAction(cancelPendingDowngradeAction);
  const createPlatformCheckout = useAction(createPlatformCheckoutAction);
  const createCreditCheckout = useAction(createCreditCheckoutAction);

  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const [isCreditProcessing, setIsCreditProcessing] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Subscription status
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    hasSubscription: boolean;
    currentTier: string;
    billingPeriod?: string;
    currentPeriodEnd?: number;
    cancelAtPeriodEnd: boolean;
    pendingDowngrade?: { newTier: string; effectiveDate: number };
  } | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isCancelingPending, setIsCancelingPending] = useState(false);

  // Fetch subscription status
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

  // Helper to open PurchaseResultWindow with props
  const openPurchaseResult = (props: Record<string, unknown>) => {
    openWindow(
      "purchase-result",
      "Purchase Result",
      <PurchaseResultWindow {...(props as unknown as import("@/components/window-content/purchase-result-window").PurchaseResultWindowProps)} />,
      { x: 300, y: 80 },
      { width: 600, height: 650 },
      undefined,
      undefined
    );
  };

  // Handle cancel pending change
  const handleCancelPendingChange = async () => {
    if (!currentOrganization?.id) return;
    setIsCancelingPending(true);
    try {
      const result = await cancelPendingDowngrade({
        organizationId: currentOrganization.id as Id<"organizations">,
      });
      if (result.success) {
        openPurchaseResult({
          status: "success",
          type: "revert",
          fromTier: currentPlan,
          message: result.message,
        });
        const status = await getSubscriptionStatus({
          organizationId: currentOrganization.id as Id<"organizations">,
        });
        setSubscriptionStatus(status);
      } else {
        openPurchaseResult({
          status: "failed",
          type: "revert",
          message: result.message,
        });
      }
    } catch {
      openPurchaseResult({
        status: "failed",
        type: "revert",
        message: "Failed to cancel pending change. Please try again.",
      });
    } finally {
      setIsCancelingPending(false);
    }
  };

  // Handle subscription change (upgrade/downgrade via Stripe API)
  const handleSubscriptionChange = async (tier: string, billingPeriod: "monthly" | "annual") => {
    if (!currentOrganization?.id) return;
    setIsManagingSubscription(true);
    setSubscriptionMessage(null);
    try {
      const result = await managePlatformSubscription({
        organizationId: currentOrganization.id as Id<"organizations">,
        newTier: tier as "free" | "pro" | "agency" | "enterprise",
        billingPeriod,
      });

      if (result.action === "no_change" || result.action === "no_subscription") {
        // Minor states — just show inline message
        setSubscriptionMessage({
          type: result.success ? "success" : "error",
          text: result.message,
        });
      } else if (result.success) {
        // Major action succeeded — open result window
        openPurchaseResult({
          status: "success",
          type: result.action, // "upgrade" | "downgrade" | "cancel"
          fromTier: currentPlan,
          toTier: tier,
          effectiveDate: result.effectiveDate,
          message: result.message,
        });
        // Refresh subscription status
        const status = await getSubscriptionStatus({
          organizationId: currentOrganization.id as Id<"organizations">,
        });
        setSubscriptionStatus(status);
      } else {
        // Major action failed — open failure result window
        openPurchaseResult({
          status: "failed",
          type: result.action,
          fromTier: currentPlan,
          toTier: tier,
          message: result.message,
        });
      }
    } catch {
      openPurchaseResult({
        status: "failed",
        type: "upgrade",
        message: "Failed to update subscription. Please try again.",
      });
    } finally {
      setIsManagingSubscription(false);
    }
  };

  // Handle new checkout (no existing subscription)
  const handleCheckout = async (tier: "pro" | "agency", billingPeriod: "monthly" | "annual") => {
    if (!currentOrganization?.id || !organization) return;
    setIsManagingSubscription(true);
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const result = await createPlatformCheckout({
        organizationId: currentOrganization.id as Id<"organizations">,
        organizationName: organization.name || "Organization",
        email: organization.email || "",
        tier,
        billingPeriod,
        successUrl: `${baseUrl}/?purchase=success&type=plan&tier=${tier}&period=${billingPeriod}`,
        cancelUrl: `${baseUrl}/?purchase=canceled`,
      });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setSubscriptionMessage({ type: "error", text: "Failed to start checkout. Please try again." });
    } finally {
      setIsManagingSubscription(false);
    }
  };

  // Handle credit purchase
  const handleCreditPurchase = async (amountEur: number, credits: number) => {
    if (!currentOrganization?.id || !organization) return;
    setIsCreditProcessing(true);
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const result = await createCreditCheckout({
        organizationId: currentOrganization.id as Id<"organizations">,
        organizationName: organization.name || "Organization",
        email: organization.email || "",
        amountEur,
        successUrl: `${baseUrl}/?purchase=success&type=credits&amount=${amountEur * 100}&credits=${credits}`,
        cancelUrl: `${baseUrl}/?purchase=canceled`,
      });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (error) {
      console.error("Credit checkout error:", error);
      setSubscriptionMessage({ type: "error", text: "Failed to start credit checkout. Please try again." });
    } finally {
      setIsCreditProcessing(false);
    }
  };

  return (
    <>
      <InteriorRoot className="h-full flex flex-col">
        {/* Header */}
        <InteriorHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {fullScreen && (
                <Link
                  href="/"
                  className="desktop-interior-button inline-flex h-9 w-9 items-center justify-center p-0"
                  title="Back to Desktop"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              )}
              <div>
                <InteriorTitle className="text-sm flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  {t("ui.store.title")}
                </InteriorTitle>
                <InteriorSubtitle className="mt-1 text-xs">{t("ui.store.subtitle")}</InteriorSubtitle>
              </div>
            </div>
            {!fullScreen && (
              <Link
                href="/store"
                className="desktop-interior-button inline-flex h-9 w-9 items-center justify-center p-0"
                title="Open Full Screen"
              >
                <Maximize2 className="w-4 h-4" />
              </Link>
            )}
          </div>
        </InteriorHeader>

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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-8" style={{ background: "var(--window-document-bg)" }}>
          {/* Plan Cards */}
          <StorePlanCards
            currentPlan={currentPlan}
            hasActiveSubscription={hasActiveSubscription}
            onCheckout={handleCheckout}
            onSubscriptionChange={handleSubscriptionChange}
            onContactSales={() => {
              setModalTitle("Enterprise Platform");
              setShowEnterpriseModal(true);
            }}
            isManagingSubscription={isManagingSubscription}
            subscriptionStatus={subscriptionStatus}
            isLoadingStatus={isLoadingStatus}
            onCancelPendingChange={handleCancelPendingChange}
            isCancelingPending={isCancelingPending}
          />

          {/* Credit Purchase Section */}
          <StoreCreditSection
            onPurchase={handleCreditPurchase}
            isProcessing={isCreditProcessing}
          />
        </div>
      </InteriorRoot>

      {/* Enterprise Contact Modal */}
      <EnterpriseContactModal
        isOpen={showEnterpriseModal}
        onClose={() => setShowEnterpriseModal(false)}
        title={modalTitle}
      />
    </>
  );
}
