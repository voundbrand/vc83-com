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
  ChevronDown,
  List,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, lazy, useCallback, useRef, useMemo } from "react";
import { EnterpriseContactModal } from "@/components/ai-billing/enterprise-contact-modal";
import { StorePlanCards } from "./store/store-plan-cards";
import { StoreCreditSection } from "./store/store-credit-section";
import { StorePricingCalculator } from "./store/store-pricing-calculator";
import {
  StoreAddOnsList,
  StoreBillingSemanticsList,
  StoreFaqList,
  StoreLimitsMatrix,
  StoreSourceAttribution,
  StoreTrialPolicyCard,
} from "./store/store-pricing-reference";
import { useIsDesktopShellFallback } from "@/hooks/use-media-query";
import { buildStoreAuthReturnPath, getStoreSectionFromQueryParams } from "@/lib/shell/url-state";
import {
  normalizeStorePricingContract,
  type StorePricingContractSnapshot,
} from "@/lib/store-pricing-contract";
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
 * - Plan cards: Free, Pro (€29/mo), Scale (€299/mo), Enterprise (custom)
 * - Credit purchase section with tiered pricing
 * - Subscription management (upgrade/downgrade/cancel)
 *
 * All Stripe checkout logic lives in the backend.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- avoids TS2589 in this module from deep Convex generated API types.
const generatedApi: any = require("../../../convex/_generated/api");
const apiRefs = generatedApi.api;

const getOrganizationByIdQuery = apiRefs.organizations.getById;
const getLicenseQuery = apiRefs.licensing.helpers.getLicense;
const getStorePricingContractQuery = apiRefs.licensing.helpers.getStorePricingContract;
const managePlatformSubscriptionAction = apiRefs.stripe.platformCheckout.managePlatformSubscription;
const getSubscriptionStatusAction = apiRefs.stripe.platformCheckout.getSubscriptionStatus;
const cancelPendingDowngradeAction = apiRefs.stripe.platformCheckout.cancelPendingDowngrade;
const createPlatformCheckoutAction = apiRefs.stripe.platformCheckout.createPlatformCheckoutSession;
const createCreditCheckoutAction = apiRefs.stripe.creditCheckout.createCreditCheckoutSession;
const getByokCommercialPolicyTableQuery = apiRefs.stripe.platformCheckout.getByokCommercialPolicyTable;

type CheckoutTier = "pro" | "scale";
type BillingPeriod = "monthly" | "annual";
type StoreSection =
  | "plans"
  | "limits"
  | "addons"
  | "billing"
  | "trial"
  | "credits"
  | "calculator"
  | "faq";

type ByokCommercialPolicyTableRow = {
  tier: "free" | "pro" | "agency" | "enterprise";
  displayTier: string;
  mode: "flat_platform_fee" | "optional_surcharge" | "tier_bundled";
  byokEligible: boolean;
  flatPlatformFeeCents: number;
  optionalSurchargeBps: number;
  bundledInTier: boolean;
  migrationDefault: boolean;
  summary: string;
};

const STORE_SECTIONS: Array<{
  id: StoreSection;
  label: string;
  description: string;
}> = [
  {
    id: "plans",
    label: "Plans",
    description: "Subscriptions, limits, and billing cadence.",
  },
  {
    id: "limits",
    label: "Limits",
    description: "Plan matrix for users, contacts, projects, and credits.",
  },
  {
    id: "addons",
    label: "Add-ons",
    description: "Scale sub-org and credit top-up pricing.",
  },
  {
    id: "billing",
    label: "Billing",
    description: "Monthly/annual semantics, proration, and VAT display rules.",
  },
  {
    id: "trial",
    label: "Trial",
    description: "Scale trial policy and runtime mapping.",
  },
  {
    id: "credits",
    label: "Credits",
    description: "One-time packs and volume pricing tiers.",
  },
  {
    id: "calculator",
    label: "Calculator",
    description: "Plan + add-on + credits estimate with tax mode input.",
  },
  {
    id: "faq",
    label: "FAQ",
    description: "Pricing policy answers with source attribution.",
  },
];

interface StoreWindowProps {
  fullScreen?: boolean;
  initialSection?: StoreSection;
}

const isCheckoutTier = (value: string | null): value is CheckoutTier =>
  value === "pro" || value === "scale";

const isBillingPeriod = (value: string | null): value is BillingPeriod =>
  value === "monthly" || value === "annual";

const isStoreSection = (value: string | null): value is StoreSection =>
  value === "plans" ||
  value === "limits" ||
  value === "addons" ||
  value === "billing" ||
  value === "trial" ||
  value === "credits" ||
  value === "calculator" ||
  value === "faq";

export function StoreWindow({ fullScreen = false, initialSection = "plans" }: StoreWindowProps = {}) {
  const { t } = useNamespaceTranslations("ui.store");
  const { openWindow } = useWindowManager();
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("Enterprise Solutions");

  // Organization context
  const { sessionId, isSignedIn, user } = useAuth();
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
  const pricingContractQuery = useQuery(
    getStorePricingContractQuery,
    {}
  ) as StorePricingContractSnapshot | undefined;
  const byokCommercialPolicyTable = useQuery(
    getByokCommercialPolicyTableQuery,
    {}
  ) as ByokCommercialPolicyTableRow[] | undefined;
  const pricingContract = useMemo(
    () => normalizeStorePricingContract(pricingContractQuery),
    [pricingContractQuery]
  );

  const currentPlan = license?.planTier || "free";

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
    scaleTrialEligible: boolean;
    billingPeriod?: string;
    currentPeriodEnd?: number;
    cancelAtPeriodEnd: boolean;
    pendingDowngrade?: { newTier: string; effectiveDate: number };
  } | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isCancelingPending, setIsCancelingPending] = useState(false);
  const [activeSection, setActiveSection] = useState<StoreSection>(initialSection);
  const [isRailExpanded, setIsRailExpanded] = useState(true);
  const [isJumpSheetOpen, setIsJumpSheetOpen] = useState(false);
  const hasAutoStartedCheckoutRef = useRef(false);
  const pendingDeepLinkSectionRef = useRef<StoreSection | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<StoreSection, HTMLElement | null>>({
    plans: null,
    limits: null,
    addons: null,
    billing: null,
    trial: null,
    credits: null,
    calculator: null,
    faq: null,
  });
  const hasActiveSubscription = subscriptionStatus?.hasSubscription || !!organization?.stripeSubscriptionId;
  const isCompactViewport = useIsDesktopShellFallback();
  const activeSectionMetadata =
    STORE_SECTIONS.find((section) => section.id === activeSection) ?? STORE_SECTIONS[0];
  const setSectionRef = useCallback(
    (section: StoreSection) => (element: HTMLElement | null) => {
      sectionRefs.current[section] = element;
    },
    []
  );
  const formatByokMode = (mode: ByokCommercialPolicyTableRow["mode"]) => {
    switch (mode) {
      case "flat_platform_fee":
        return "Flat platform fee";
      case "optional_surcharge":
        return "Optional surcharge";
      case "tier_bundled":
        return "Tier bundled";
      default:
        return mode;
    }
  };
  const formatCents = (value: number) => {
    if (value <= 0) {
      return "\u20ac0";
    }
    return `\u20ac${(value / 100).toFixed(2)}`;
  };
  const formatSurcharge = (value: number) => {
    if (value <= 0) {
      return "0%";
    }
    return `${(value / 100).toFixed(2)}%`;
  };

  const getSectionElement = useCallback((section: StoreSection): HTMLElement | null => {
    return sectionRefs.current[section];
  }, []);

  const scrollToSection = useCallback((section: StoreSection, behavior: ScrollBehavior = "smooth") => {
    if (behavior !== "auto") {
      pendingDeepLinkSectionRef.current = null;
    }
    setActiveSection(section);
    const sectionElement = getSectionElement(section);
    if (!sectionElement) {
      return;
    }
    sectionElement.scrollIntoView({ behavior, block: "start" });
  }, [getSectionElement]);

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

  useEffect(() => {
    if (fullScreen && typeof window !== "undefined") {
      const sectionFromQuery = getStoreSectionFromQueryParams(new URLSearchParams(window.location.search));
      if (sectionFromQuery) {
        return;
      }
    }
    scrollToSection(initialSection, "auto");
  }, [fullScreen, initialSection, scrollToSection]);

  useEffect(() => {
    if (!fullScreen || typeof window === "undefined") return;
    const sectionFromQuery = getStoreSectionFromQueryParams(new URLSearchParams(window.location.search));
    if (!sectionFromQuery) {
      return;
    }

    pendingDeepLinkSectionRef.current = sectionFromQuery;
    const frameId = window.requestAnimationFrame(() => {
      scrollToSection(sectionFromQuery, "auto");
    });
    const releaseLockTimeout = window.setTimeout(() => {
      if (pendingDeepLinkSectionRef.current === sectionFromQuery) {
        pendingDeepLinkSectionRef.current = null;
      }
    }, 1_500);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(releaseLockTimeout);
    };
  }, [fullScreen, scrollToSection]);

  useEffect(() => {
    if (!fullScreen || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const targetSection = pendingDeepLinkSectionRef.current ?? activeSection;
    let shouldReplaceUrl = false;

    if (params.get("panel") !== targetSection) {
      params.set("panel", targetSection);
      shouldReplaceUrl = true;
    }
    if (params.get("section") !== targetSection) {
      params.set("section", targetSection);
      shouldReplaceUrl = true;
    }

    if (shouldReplaceUrl) {
      const nextQuery = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`);
    }
  }, [activeSection, fullScreen]);

  useEffect(() => {
    if (!isJumpSheetOpen || typeof window === "undefined") {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsJumpSheetOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isJumpSheetOpen]);

  useEffect(() => {
    const root = contentScrollRef.current;
    const sections = STORE_SECTIONS.map((section) => ({
      id: section.id,
      element: sectionRefs.current[section.id],
    })).filter((entry): entry is { id: StoreSection; element: HTMLElement } => Boolean(entry.element));

    if (!root || sections.length === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        const section = visibleEntry?.target.getAttribute("data-store-section");
        if (isStoreSection(section)) {
          const pendingSection = pendingDeepLinkSectionRef.current;
          if (pendingSection) {
            if (section !== pendingSection) {
              return;
            }
            pendingDeepLinkSectionRef.current = null;
          }
          setActiveSection((currentSection) => (currentSection === section ? currentSection : section));
        }
      },
      {
        root,
        threshold: [0.2, 0.45, 0.7],
        rootMargin: "-20% 0px -55% 0px",
      }
    );

    sections.forEach((section) => observer.observe(section.element));

    return () => {
      observer.disconnect();
    };
  }, []);

  const redirectToLoginForStore = useCallback(
    (section: StoreSection, checkoutIntent?: { tier: CheckoutTier; billingPeriod: BillingPeriod }) => {
      if (typeof window === "undefined") return;
      const returnPath = buildStoreAuthReturnPath({ fullScreen, section, checkoutIntent });
      sessionStorage.setItem("auth_return_url", returnPath);
      window.location.href = "/?openLogin=store";
    },
    [fullScreen]
  );

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
  const handleCheckout = useCallback(async (tier: CheckoutTier, billingPeriod: BillingPeriod) => {
    if (!isSignedIn) {
      redirectToLoginForStore("plans", { tier, billingPeriod });
      return;
    }

    if (!currentOrganization?.id) {
      setSubscriptionMessage({ type: "error", text: "We are still loading your workspace. Please try again in a moment." });
      return;
    }

    setIsManagingSubscription(true);
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const result = await createPlatformCheckout({
        organizationId: currentOrganization.id as Id<"organizations">,
        organizationName: organization?.name || currentOrganization.name || "Organization",
        email: organization?.email || user?.email || "",
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
  }, [
    isSignedIn,
    currentOrganization?.id,
    currentOrganization?.name,
    organization?.name,
    organization?.email,
    user?.email,
    createPlatformCheckout,
    redirectToLoginForStore,
  ]);

  // Resume checkout intent after auth redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasAutoStartedCheckoutRef.current) return;
    if (!isSignedIn || !currentOrganization?.id) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("autostartCheckout") !== "1") return;

    const tierParam = params.get("tier");
    const periodParam = params.get("period");
    if (!isCheckoutTier(tierParam) || !isBillingPeriod(periodParam)) return;

    hasAutoStartedCheckoutRef.current = true;
    params.delete("autostartCheckout");
    params.delete("tier");
    params.delete("period");
    const nextQuery = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`);
    void handleCheckout(tierParam, periodParam);
  }, [isSignedIn, currentOrganization?.id, handleCheckout]);

  // Handle credit purchase
  const handleCreditPurchase = async (amountEur: number, credits: number) => {
    if (!isSignedIn) {
      redirectToLoginForStore("credits");
      return;
    }

    if (!currentOrganization?.id) {
      setSubscriptionMessage({ type: "error", text: "We are still loading your workspace. Please try again in a moment." });
      return;
    }

    setIsCreditProcessing(true);
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const result = await createCreditCheckout({
        organizationId: currentOrganization.id as Id<"organizations">,
        organizationName: organization?.name || currentOrganization.name || "Organization",
        email: organization?.email || user?.email || "",
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
            role="status"
            aria-live="polite"
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
        <div
          ref={contentScrollRef}
          className="store-pricing-scroll flex-1 overflow-y-auto"
          style={{ background: "var(--window-document-bg)" }}
        >
          <div className="mx-auto flex w-full max-w-[1280px] gap-4 p-4 md:gap-6">
            <div className="min-w-0 flex-1 space-y-6">
              <section
                className="rounded-xl border p-4 sm:p-5"
                style={{
                  background: "var(--window-document-bg-elevated)",
                  borderColor: "var(--window-document-border)",
                }}
              >
                <h2 className="font-pixel text-sm" style={{ color: "var(--window-document-text)" }}>
                  Pricing transparency
                </h2>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--window-document-text-muted)" }}>
                  Browse plans and one-time credits in one place, with jump navigation that works in desktop window,
                  full-screen, and mobile layouts.
                </p>
                <p className="mt-2 text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                  Active tiers: {pricingContract.activePublicTiers.join(", ")}. Store outputs are VAT-inclusive.
                </p>

                {Array.isArray(byokCommercialPolicyTable) && byokCommercialPolicyTable.length > 0 && (
                  <div className="mt-4 overflow-x-auto rounded-lg border" style={{ borderColor: "var(--window-document-border)" }}>
                    <table className="w-full min-w-[640px] text-left text-[11px]">
                      <thead style={{ background: "var(--desktop-shell-accent)" }}>
                        <tr>
                          <th className="px-3 py-2 font-semibold">Tier</th>
                          <th className="px-3 py-2 font-semibold">BYOK model</th>
                          <th className="px-3 py-2 font-semibold">Flat fee</th>
                          <th className="px-3 py-2 font-semibold">Surcharge</th>
                          <th className="px-3 py-2 font-semibold">Eligible</th>
                          <th className="px-3 py-2 font-semibold">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byokCommercialPolicyTable.map((row) => (
                          <tr
                            key={row.tier}
                            className="border-t"
                            style={{ borderColor: "var(--window-document-border)" }}
                          >
                            <td className="px-3 py-2 font-semibold" style={{ color: "var(--window-document-text)" }}>
                              {row.displayTier}
                            </td>
                            <td className="px-3 py-2" style={{ color: "var(--window-document-text)" }}>
                              {formatByokMode(row.mode)}
                            </td>
                            <td className="px-3 py-2" style={{ color: "var(--window-document-text)" }}>
                              {formatCents(row.flatPlatformFeeCents)}
                            </td>
                            <td className="px-3 py-2" style={{ color: "var(--window-document-text)" }}>
                              {formatSurcharge(row.optionalSurchargeBps)}
                            </td>
                            <td className="px-3 py-2" style={{ color: "var(--window-document-text)" }}>
                              {row.byokEligible ? "Yes" : "No"}
                            </td>
                            <td className="px-3 py-2" style={{ color: "var(--window-document-text-muted)" }}>
                              {row.summary}
                              {row.migrationDefault ? " (migration-safe default)" : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4">
                  <StoreSourceAttribution contract={pricingContract} />
                </div>
              </section>

              {isCompactViewport && (
                <div className="sticky top-2 z-20">
                  <button
                    type="button"
                    onClick={() => setIsJumpSheetOpen(true)}
                    aria-expanded={isJumpSheetOpen}
                    aria-controls="store-jump-sheet"
                    aria-label={`Jump to section. Current section: ${activeSectionMetadata.label}.`}
                    className="desktop-interior-button flex h-10 w-full items-center justify-between px-3 text-xs font-semibold"
                  >
                    <span className="inline-flex items-center gap-2">
                      <List className="h-3.5 w-3.5" />
                      Jump to
                    </span>
                    <span className="inline-flex items-center gap-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
                      {activeSectionMetadata.label}
                      <ChevronDown className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </div>
              )}

              <section
                id="store-section-plans"
                ref={setSectionRef("plans")}
                data-store-section="plans"
                className="scroll-mt-24 rounded-xl border p-4 sm:p-5"
                style={{
                  background: "var(--window-document-bg-elevated)",
                  borderColor: "var(--window-document-border)",
                }}
              >
                <div className="mb-4">
                  <h2 className="font-pixel text-sm" style={{ color: "var(--window-document-text)" }}>
                    Plans
                  </h2>
                  <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                    Compare active subscriptions and manage billing with VAT-inclusive price display.
                  </p>
                </div>
                <StorePlanCards
                  currentPlan={currentPlan}
                  hasActiveSubscription={hasActiveSubscription}
                  scaleTrialEligible={subscriptionStatus?.scaleTrialEligible ?? false}
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
              </section>

              <section
                id="store-section-limits"
                ref={setSectionRef("limits")}
                data-store-section="limits"
                className="scroll-mt-24 rounded-xl border p-4 sm:p-5"
                style={{
                  background: "var(--window-document-bg-elevated)",
                  borderColor: "var(--window-document-border)",
                }}
              >
                <div className="mb-4">
                  <h2 className="font-pixel text-sm" style={{ color: "var(--window-document-text)" }}>
                    Limits matrix
                  </h2>
                  <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                    Deterministic limits for active tiers only (Free, Pro, Scale, Enterprise).
                  </p>
                </div>
                <StoreLimitsMatrix contract={pricingContract} />
              </section>

              <section
                id="store-section-addons"
                ref={setSectionRef("addons")}
                data-store-section="addons"
                className="scroll-mt-24 rounded-xl border p-4 sm:p-5"
                style={{
                  background: "var(--window-document-bg-elevated)",
                  borderColor: "var(--window-document-border)",
                }}
              >
                <div className="mb-4">
                  <h2 className="font-pixel text-sm" style={{ color: "var(--window-document-text)" }}>
                    Add-ons
                  </h2>
                  <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                    Scale sub-org and credit top-up economics, with source attribution.
                  </p>
                </div>
                <StoreAddOnsList contract={pricingContract} />
              </section>

              <section
                id="store-section-billing"
                ref={setSectionRef("billing")}
                data-store-section="billing"
                className="scroll-mt-24 rounded-xl border p-4 sm:p-5"
                style={{
                  background: "var(--window-document-bg-elevated)",
                  borderColor: "var(--window-document-border)",
                }}
              >
                <div className="mb-4">
                  <h2 className="font-pixel text-sm" style={{ color: "var(--window-document-text)" }}>
                    Billing semantics
                  </h2>
                  <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                    Monthly and annual behavior, proration handling, and VAT-inclusive display rules.
                  </p>
                </div>
                <StoreBillingSemanticsList contract={pricingContract} />
              </section>

              <section
                id="store-section-trial"
                ref={setSectionRef("trial")}
                data-store-section="trial"
                className="scroll-mt-24 rounded-xl border p-4 sm:p-5"
                style={{
                  background: "var(--window-document-bg-elevated)",
                  borderColor: "var(--window-document-border)",
                }}
              >
                <div className="mb-4">
                  <h2 className="font-pixel text-sm" style={{ color: "var(--window-document-text)" }}>
                    Trial policy
                  </h2>
                  <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                    Scale trial details from the checkout contract.
                  </p>
                </div>
                <StoreTrialPolicyCard contract={pricingContract} />
              </section>

              <section
                id="store-section-credits"
                ref={setSectionRef("credits")}
                data-store-section="credits"
                className="scroll-mt-24 rounded-xl border p-4 sm:p-5"
                style={{
                  background: "var(--window-document-bg-elevated)",
                  borderColor: "var(--window-document-border)",
                }}
              >
                <div className="mb-4">
                  <h2 className="font-pixel text-sm" style={{ color: "var(--window-document-text)" }}>
                    Credits
                  </h2>
                  <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                    Buy usage credits as needed with transparent volume-rate tiers and VAT-inclusive totals.
                  </p>
                </div>
                <StoreCreditSection
                  onPurchase={handleCreditPurchase}
                  isProcessing={isCreditProcessing}
                />
              </section>

              <section
                id="store-section-calculator"
                ref={setSectionRef("calculator")}
                data-store-section="calculator"
                className="scroll-mt-24 rounded-xl border p-4 sm:p-5"
                style={{
                  background: "var(--window-document-bg-elevated)",
                  borderColor: "var(--window-document-border)",
                }}
              >
                <StorePricingCalculator contract={pricingContract} />
              </section>

              <section
                id="store-section-faq"
                ref={setSectionRef("faq")}
                data-store-section="faq"
                className="scroll-mt-24 rounded-xl border p-4 sm:p-5"
                style={{
                  background: "var(--window-document-bg-elevated)",
                  borderColor: "var(--window-document-border)",
                }}
              >
                <div className="mb-4">
                  <h2 className="font-pixel text-sm" style={{ color: "var(--window-document-text)" }}>
                    FAQ
                  </h2>
                  <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                    Common pricing questions, mapped to explicit source files.
                  </p>
                </div>
                <StoreFaqList contract={pricingContract} />
              </section>
            </div>

            <aside
              className={`hidden shrink-0 transition-all duration-200 lg:block ${
                isRailExpanded ? "w-[272px]" : "w-14"
              }`}
              aria-label="Store section rail"
            >
              <div
                className="sticky top-4 rounded-xl border p-2"
                style={{
                  background: "var(--window-document-bg-elevated)",
                  borderColor: "var(--window-document-border)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsRailExpanded((isExpanded) => !isExpanded)}
                  className="desktop-interior-button flex h-9 w-full items-center justify-center gap-2 px-2 text-xs"
                  aria-expanded={isRailExpanded}
                  aria-controls="store-right-rail-nav"
                  title={isRailExpanded ? "Collapse section rail" : "Expand section rail"}
                >
                  {isRailExpanded ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
                  {isRailExpanded && <span>Jump to</span>}
                </button>

                {isRailExpanded ? (
                  <nav id="store-right-rail-nav" className="mt-2 space-y-1.5">
                    {STORE_SECTIONS.map((section) => {
                      const isActive = activeSection === section.id;
                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => scrollToSection(section.id)}
                          className="w-full rounded-lg border px-3 py-2 text-left transition-colors"
                          style={{
                            background: isActive ? "var(--desktop-menu-hover)" : "var(--window-document-bg)",
                            borderColor: isActive ? "var(--tone-accent-strong)" : "var(--window-document-border)",
                            color: "var(--window-document-text)",
                          }}
                          aria-current={isActive ? "location" : undefined}
                        >
                          <p className="text-xs font-semibold">{section.label}</p>
                          <p className="mt-1 text-[11px]" style={{ color: "var(--window-document-text-muted)" }}>
                            {section.description}
                          </p>
                        </button>
                      );
                    })}
                  </nav>
                ) : (
                  <nav className="mt-2 flex flex-col gap-1.5" aria-label="Collapsed section rail">
                    {STORE_SECTIONS.map((section) => {
                      const isActive = activeSection === section.id;
                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => scrollToSection(section.id)}
                          className="desktop-interior-button h-9 w-full p-0 text-xs font-semibold"
                          aria-label={`Jump to ${section.label}`}
                          title={`Jump to ${section.label}`}
                          style={{
                            borderColor: isActive ? "var(--tone-accent-strong)" : undefined,
                          }}
                        >
                          {section.label.charAt(0)}
                        </button>
                      );
                    })}
                  </nav>
                )}
              </div>
            </aside>
          </div>
        </div>
      </InteriorRoot>

      {/* Mobile Jump Sheet */}
      {isCompactViewport && isJumpSheetOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-end bg-black/60 p-3 pb-[calc(var(--taskbar-height,48px)+env(safe-area-inset-bottom,0px)+12px)]"
          role="presentation"
          onClick={() => setIsJumpSheetOpen(false)}
        >
          <div
            id="store-jump-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Store section navigation"
            className="mx-auto w-full max-w-md rounded-xl border p-4"
            style={{
              background: "var(--window-document-bg-elevated)",
              borderColor: "var(--window-document-border)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-pixel text-xs" style={{ color: "var(--window-document-text)" }}>
                Jump to
              </p>
              <button
                type="button"
                onClick={() => setIsJumpSheetOpen(false)}
                className="desktop-interior-button h-8 w-8 p-0"
                aria-label="Close section menu"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {STORE_SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => {
                      scrollToSection(section.id);
                      setIsJumpSheetOpen(false);
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-left transition-colors"
                    style={{
                      background: isActive ? "var(--desktop-menu-hover)" : "var(--window-document-bg)",
                      borderColor: isActive ? "var(--tone-accent-strong)" : "var(--window-document-border)",
                      color: "var(--window-document-text)",
                    }}
                    aria-current={isActive ? "location" : undefined}
                  >
                    <p className="text-xs font-semibold">{section.label}</p>
                    <p className="mt-1 text-[11px]" style={{ color: "var(--window-document-text-muted)" }}>
                      {section.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Contact Modal */}
      <EnterpriseContactModal
        isOpen={showEnterpriseModal}
        onClose={() => setShowEnterpriseModal(false)}
        title={modalTitle}
      />
    </>
  );
}
