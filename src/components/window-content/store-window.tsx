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
  Gift,
  History,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, lazy, useCallback, useRef, useMemo } from "react";
import { EnterpriseContactModal } from "@/components/ai-billing/enterprise-contact-modal";
import { StorePlanCards } from "./store/store-plan-cards";
import { StoreCreditSection } from "./store/store-credit-section";
import { BenefitsWindow } from "./benefits-window";
import {
  StoreAddOnsList,
  StoreBillingSemanticsList,
  StoreFaqList,
  StoreLimitsMatrix,
  StorePricingTransparencyTable,
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
const getCreditsHistoryEnvelopeQuery = apiRefs.credits.index.getCreditsHistoryEnvelope;
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
  | "credits"
  | "limits"
  | "addons"
  | "billing"
  | "trial"
  | "transparency"
  | "faq";
type StoreSectionAlias = StoreSection | "calculator";

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

type StoreCreditsHistoryEntry = {
  id: string;
  createdAt: number;
  type: string;
  source: string;
  sourceLabel: string;
  reason: string | null;
  reasonLabel: string;
  amount: number;
  bucketsAfter: {
    gifted: number;
    monthly: number;
    purchased: number;
    total: number;
  };
};

type StoreCreditsHistoryEnvelope = {
  entries: StoreCreditsHistoryEntry[];
};

interface StoreWindowProps {
  fullScreen?: boolean;
  initialSection?: StoreSectionAlias;
}

const isCheckoutTier = (value: string | null): value is CheckoutTier =>
  value === "pro" || value === "scale";

const isBillingPeriod = (value: string | null): value is BillingPeriod =>
  value === "monthly" || value === "annual";

const isStoreSection = (value: string | null): value is StoreSection =>
  value === "plans" ||
  value === "credits" ||
  value === "limits" ||
  value === "addons" ||
  value === "billing" ||
  value === "trial" ||
  value === "transparency" ||
  value === "faq";

const normalizeStoreSectionAlias = (value: StoreSectionAlias | null): StoreSection | null => {
  if (value === "calculator") {
    return "credits";
  }
  return isStoreSection(value) ? value : null;
};

export function StoreWindow({ fullScreen = false, initialSection = "plans" }: StoreWindowProps = {}) {
  const { t } = useNamespaceTranslations("ui.store");
  const tx = useCallback((key: string, fallback: string, params?: Record<string, string | number>): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  }, [t]);
  const { openWindow } = useWindowManager();
  const normalizedInitialSection = normalizeStoreSectionAlias(initialSection) ?? "plans";
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("Enterprise Solutions");

  // Organization context
  const { sessionId, isSignedIn, user, isSuperAdmin } = useAuth();
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
  const creditsHistoryEnvelope = useQuery(
    getCreditsHistoryEnvelopeQuery,
    organizationId ? { organizationId, limit: 10 } : "skip"
  ) as StoreCreditsHistoryEnvelope | undefined;
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
    trialEligible: boolean;
    scaleTrialEligible: boolean;
    billingPeriod?: string;
    currentPeriodEnd?: number;
    cancelAtPeriodEnd: boolean;
    pendingDowngrade?: { newTier: string; effectiveDate: number };
  } | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isCancelingPending, setIsCancelingPending] = useState(false);
  const [activeSection, setActiveSection] = useState<StoreSection>(normalizedInitialSection);
  const [activeSectionParam, setActiveSectionParam] = useState<StoreSectionAlias>(initialSection);
  const [isRailExpanded, setIsRailExpanded] = useState(true);
  const [isJumpSheetOpen, setIsJumpSheetOpen] = useState(false);
  const hasAutoStartedCheckoutRef = useRef(false);
  const pendingDeepLinkSectionRef = useRef<StoreSection | null>(null);
  const pendingDeepLinkSectionParamRef = useRef<StoreSectionAlias | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<StoreSection, HTMLElement | null>>({
    plans: null,
    credits: null,
    limits: null,
    addons: null,
    billing: null,
    trial: null,
    transparency: null,
    faq: null,
  });
  const hasActiveSubscription = subscriptionStatus?.hasSubscription || !!organization?.stripeSubscriptionId;
  const isCompactViewport = useIsDesktopShellFallback();
  const storeSections = useMemo<Array<{ id: StoreSection; label: string; description: string }>>(() => ([
    {
      id: "plans",
      label: tx("ui.store.sections.plans.label", "Plans"),
      description: tx("ui.store.sections.plans.description", "Monthly and annual subscriptions for each plan."),
    },
    {
      id: "credits",
      label: tx("ui.store.sections.credits.label", "Credit system"),
      description: tx("ui.store.sections.credits.description", "One-time credit packs and usage top-ups."),
    },
    {
      id: "limits",
      label: tx("ui.store.sections.limits.label", "Limits"),
      description: tx("ui.store.sections.limits.description", "Compare limits across Free, Pro, Scale, and Enterprise."),
    },
    {
      id: "addons",
      label: tx("ui.store.sections.addons.label", "Add-ons"),
      description: tx("ui.store.sections.addons.description", "Optional extras for scaling your workspace."),
    },
    {
      id: "billing",
      label: tx("ui.store.sections.billing.label", "Billing semantics"),
      description: tx("ui.store.sections.billing.description", "How annual billing, proration, and VAT-inclusive pricing work."),
    },
    {
      id: "trial",
      label: tx("ui.store.sections.trial.label", "Trial policy"),
      description: tx("ui.store.sections.trial.description", "Free trial availability and what happens next."),
    },
    {
      id: "transparency",
      label: tx("ui.store.sections.transparency.label", "Pricing transparency"),
      description: tx("ui.store.sections.transparency.description", "Full feature-by-feature comparison across all plans."),
    },
    {
      id: "faq",
      label: tx("ui.store.sections.faq.label", "FAQ"),
      description: tx("ui.store.sections.faq.description", "Quick answers to common pricing questions."),
    },
  ]), [tx]);
  const activeSectionMetadata =
    storeSections.find((section) => section.id === activeSection) ?? storeSections[0];
  const isCreditsHistoryLoading = Boolean(organizationId) && creditsHistoryEnvelope === undefined;
  const creditsHistoryEntries = creditsHistoryEnvelope?.entries ?? [];
  const setSectionRef = useCallback(
    (section: StoreSection) => (element: HTMLElement | null) => {
      sectionRefs.current[section] = element;
    },
    []
  );

  const getSectionElement = useCallback((section: StoreSection): HTMLElement | null => {
    return sectionRefs.current[section];
  }, []);

  const scrollToSection = useCallback((section: StoreSectionAlias, behavior: ScrollBehavior = "smooth") => {
    const normalizedSection = normalizeStoreSectionAlias(section);
    if (!normalizedSection) {
      return;
    }
    if (behavior !== "auto") {
      pendingDeepLinkSectionRef.current = null;
      pendingDeepLinkSectionParamRef.current = null;
    }
    setActiveSection(normalizedSection);
    setActiveSectionParam(section === "calculator" ? "calculator" : normalizedSection);
    const sectionElement = getSectionElement(normalizedSection);
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
      const normalizedSection = normalizeStoreSectionAlias(sectionFromQuery ?? null);
      if (normalizedSection) {
        return;
      }
    }
    scrollToSection(initialSection, "auto");
  }, [fullScreen, initialSection, scrollToSection]);

  useEffect(() => {
    if (!fullScreen || typeof window === "undefined") return;
    const sectionFromQuery = getStoreSectionFromQueryParams(new URLSearchParams(window.location.search));
    const normalizedSection = normalizeStoreSectionAlias(sectionFromQuery ?? null);
    if (!sectionFromQuery || !normalizedSection) {
      return;
    }

    pendingDeepLinkSectionRef.current = normalizedSection;
    pendingDeepLinkSectionParamRef.current = sectionFromQuery;
    const frameId = window.requestAnimationFrame(() => {
      scrollToSection(sectionFromQuery, "auto");
    });
    const releaseLockTimeout = window.setTimeout(() => {
      if (pendingDeepLinkSectionRef.current === normalizedSection) {
        pendingDeepLinkSectionRef.current = null;
        pendingDeepLinkSectionParamRef.current = null;
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
    const targetSectionParamCandidate =
      pendingDeepLinkSectionParamRef.current ?? activeSectionParam;
    const targetSectionParam =
      targetSectionParamCandidate === "calculator" && targetSection === "credits"
        ? "calculator"
        : targetSection;
    let shouldReplaceUrl = false;

    if (params.get("panel") !== targetSectionParam) {
      params.set("panel", targetSectionParam);
      shouldReplaceUrl = true;
    }
    if (params.get("section") !== targetSectionParam) {
      params.set("section", targetSectionParam);
      shouldReplaceUrl = true;
    }

    if (shouldReplaceUrl) {
      const nextQuery = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`);
    }
  }, [activeSection, activeSectionParam, fullScreen]);

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
    const sections = storeSections.map((section) => ({
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
          const pendingSectionParam = pendingDeepLinkSectionParamRef.current;
          if (pendingSection) {
            if (section !== pendingSection) {
              return;
            }
            pendingDeepLinkSectionRef.current = null;
            pendingDeepLinkSectionParamRef.current = null;
          }
          setActiveSection((currentSection) => (currentSection === section ? currentSection : section));
          setActiveSectionParam((currentSectionParam) => {
            if (
              section === "credits" &&
              (pendingSectionParam === "calculator" || currentSectionParam === "calculator")
            ) {
              return "calculator";
            }
            return currentSectionParam === section ? currentSectionParam : section;
          });
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
  }, [storeSections]);

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

  const openReferralProgram = () => {
    const deepLinkNonce = `benefits-${Date.now()}`;
    openWindow(
      "benefits",
      "Benefits",
      <BenefitsWindow key={`benefits-${deepLinkNonce}`} initialView="referrals" />,
      { x: 150, y: 100 },
      { width: 1100, height: 700 },
      "ui.app.benefits",
      undefined,
      {
        initialView: "referrals",
        deepLinkNonce,
      }
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

  const formatHistoryTimestamp = (value: number) =>
    new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatHistoryAmount = (value: number) =>
    `${value > 0 ? "+" : ""}${value.toLocaleString()}`;

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
                  title={tx("ui.store.actions.back_to_desktop", "Back to Desktop")}
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
                title={tx("ui.store.actions.open_full_screen", "Open Full Screen")}
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
              background: subscriptionMessage.type === "success" ? "var(--success-bg)" : "var(--error-bg)",
              color: subscriptionMessage.type === "success" ? "var(--success)" : "var(--error)",
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
          <div className="mx-auto flex w-full max-w-7xl gap-4 p-4 md:gap-6">
            <div className="min-w-0 flex-1 space-y-6">
              {isCompactViewport && (
                <div className="sticky top-2 z-20">
                  <button
                    type="button"
                    onClick={() => setIsJumpSheetOpen(true)}
                    aria-expanded={isJumpSheetOpen}
                    aria-controls="store-jump-sheet"
                    aria-label={tx(
                      "ui.store.navigation.jump_to_section_with_current",
                      "Jump to section. Current section: {section}.",
                      { section: activeSectionMetadata.label }
                    )}
                    className="desktop-interior-button flex h-10 w-full items-center justify-between px-3 text-xs font-semibold"
                  >
                    <span className="inline-flex items-center gap-2">
                      <List className="h-3.5 w-3.5" />
                      {tx("ui.store.navigation.jump_to", "Jump to")}
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
                    {tx("ui.store.plans.title", "Plans")}
                  </h2>
                  <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                    {tx(
                      "ui.store.plans.description",
                      "Compare active subscriptions and manage billing with VAT-inclusive price display."
                    )}
                  </p>
                </div>
                <StorePlanCards
                  currentPlan={currentPlan}
                  hasActiveSubscription={hasActiveSubscription}
                  trialEligible={subscriptionStatus?.trialEligible ?? subscriptionStatus?.scaleTrialEligible ?? false}
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

              <div
                className="rounded-xl border p-4 sm:p-5"
                style={{
                  background: "var(--window-document-bg-elevated)",
                  borderColor: "var(--tone-accent-strong)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: "var(--tone-accent)",
                      color: "var(--shell-on-accent)",
                    }}
                    aria-hidden="true"
                  >
                    <Gift className="h-4 w-4" />
                  </div>
                  <div>
                    <span
                      className="inline-flex rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide"
                      style={{
                        background: "var(--tone-accent)",
                        color: "var(--shell-on-accent)",
                      }}
                    >
                      {t("ui.store.daily_credits.badge")}
                    </span>
                    <h2 className="mt-2 font-pixel text-sm" style={{ color: "var(--window-document-text)" }}>
                      {t("ui.store.daily_credits.title")}
                    </h2>
                    <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                      {t("ui.store.daily_credits.description")}
                    </p>
                    <p className="mt-1 text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
                      {t("ui.store.daily_credits.reset_note")}
                    </p>
                  </div>
                </div>
              </div>

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
                    {tx("ui.store.credits.title", "Credit system")}
                  </h2>
                  <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                    {tx(
                      "ui.store.credits.description",
                      "Buy usage credits when you need extra capacity, with clear volume pricing."
                    )}
                  </p>
                </div>
                <StoreCreditSection
                  onPurchase={handleCreditPurchase}
                  isProcessing={isCreditProcessing}
                />

                <div
                  className="mt-4 rounded-lg border p-3"
                  style={{
                    background: "var(--window-document-bg)",
                    borderColor: "var(--window-document-border)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <div
                        className="mt-0.5 flex h-7 w-7 items-center justify-center rounded"
                        style={{
                          background: "var(--tone-accent)",
                          color: "var(--shell-on-accent)",
                        }}
                      >
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                          {tx("ui.store.referral.title", "Referral rewards")}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                          {tx("ui.store.referral.description_prefix", "Share your personal")}{" "}
                          <code>{tx("ui.store.referral.link_pattern", "/ref/<code>")}</code>{" "}
                          {tx("ui.store.referral.description_suffix", "link and track signup/subscription rewards.")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                    onClick={openReferralProgram}
                    className="retro-button px-2 py-1 text-xs shrink-0"
                  >
                      {tx("ui.store.actions.open", "Open")}
                    </button>
                  </div>
                </div>

                <div
                  className="mt-4 rounded-lg border"
                  style={{
                    background: "var(--window-document-bg)",
                    borderColor: "var(--window-document-border)",
                  }}
                >
                  <div
                    className="px-3 py-2 border-b flex items-center justify-between gap-2"
                    style={{ borderColor: "var(--window-document-border)" }}
                  >
                    <p className="text-xs font-semibold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
                      <History className="h-3.5 w-3.5" />
                      {tx("ui.store.credits_activity.title", "Credits activity")}
                    </p>
                    <p className="text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                      {tx("ui.store.credits_activity.recent_entries", "{count} recent entries", {
                        count: creditsHistoryEntries.length,
                      })}
                    </p>
                  </div>

                  {isCreditsHistoryLoading ? (
                    <div className="px-3 py-4 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                      {tx("ui.store.credits_activity.loading", "Loading credit activity...")}
                    </div>
                  ) : creditsHistoryEntries.length === 0 ? (
                    <div className="px-3 py-4 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                      {tx(
                        "ui.store.credits_activity.empty",
                        "No credit activity yet. Purchases, redemptions, and usage will appear here."
                      )}
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: "var(--window-document-border)" }}>
                      {creditsHistoryEntries.slice(0, 8).map((entry) => (
                        <div key={entry.id} className="px-3 py-2.5 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: "var(--window-document-text)" }}>
                              {entry.reasonLabel}
                            </p>
                            <p className="mt-0.5 text-xs truncate" style={{ color: "var(--window-document-text-muted)" }}>
                              {entry.sourceLabel}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p
                              className="text-xs font-semibold"
                              style={{ color: entry.amount >= 0 ? "var(--success)" : "var(--error)" }}
                            >
                              {formatHistoryAmount(entry.amount)}
                            </p>
                            <p className="mt-0.5 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                              {formatHistoryTimestamp(entry.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                    {tx("ui.store.limits.title", "Limits matrix")}
                  </h2>
                  <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                    {tx(
                      "ui.store.limits.description",
                      "See exactly what each plan includes across seats, projects, credits, and storage."
                    )}
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
                    {tx("ui.store.addons.title", "Add-ons")}
                  </h2>
                  <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                    {tx("ui.store.addons.description", "Expand your plan with optional extras when your team grows.")}
                  </p>
                </div>
                <StoreAddOnsList contract={pricingContract} showInternalDetails={isSuperAdmin} />
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
                    {tx("ui.store.billing.title", "Billing semantics")}
                  </h2>
                  <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                    {tx(
                      "ui.store.billing.description",
                      "Understand monthly vs annual billing, proration, and VAT-inclusive pricing."
                    )}
                  </p>
                </div>
                <StoreBillingSemanticsList contract={pricingContract} showInternalDetails={isSuperAdmin} />
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
                    {tx("ui.store.trial.title", "Trial policy")}
                  </h2>
                  <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                    {tx(
                      "ui.store.trial.description",
                      "Trial options for Pro and Scale, plus what to expect when a trial ends."
                    )}
                  </p>
                </div>
                <StoreTrialPolicyCard contract={pricingContract} showInternalDetails={isSuperAdmin} />
              </section>

              <section
                id="store-section-transparency"
                ref={setSectionRef("transparency")}
                data-store-section="transparency"
                className="scroll-mt-24 rounded-xl border p-4 sm:p-5"
                style={{
                  background: "var(--window-document-bg-elevated)",
                  borderColor: "var(--window-document-border)",
                }}
              >
                <div className="mb-4">
                  <h2 className="font-pixel text-sm" style={{ color: "var(--window-document-text)" }}>
                    {tx("ui.store.transparency.title", "Pricing transparency")}
                  </h2>
                  <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                    {tx(
                      "ui.store.transparency.description",
                      "Full plan-by-plan breakdown of pricing, features, trials, and availability."
                    )}
                  </p>
                </div>
                <StorePricingTransparencyTable
                  contract={pricingContract}
                  byokCommercialPolicyTable={byokCommercialPolicyTable}
                />
                {isSuperAdmin && (
                  <div className="mt-4">
                    <StoreSourceAttribution contract={pricingContract} showInternalDetails />
                  </div>
                )}
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
                    {tx("ui.store.faq.title", "FAQ")}
                  </h2>
                  <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                    {tx(
                      "ui.store.faq.description",
                      "Quick answers to common purchase, billing, and trial questions."
                    )}
                  </p>
                </div>
                <StoreFaqList contract={pricingContract} showInternalDetails={isSuperAdmin} />
              </section>
            </div>

            <aside
              className={`hidden shrink-0 transition-[width] duration-200 lg:block ${
                isRailExpanded ? "w-[272px]" : "w-14"
              }`}
              aria-label={tx("ui.store.navigation.section_rail", "Store section rail")}
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
                  title={isRailExpanded
                    ? tx("ui.store.navigation.collapse_section_rail", "Collapse section rail")
                    : tx("ui.store.navigation.expand_section_rail", "Expand section rail")}
                >
                  {isRailExpanded ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
                  {isRailExpanded && <span>{tx("ui.store.navigation.jump_to", "Jump to")}</span>}
                </button>

                {isRailExpanded ? (
                  <nav id="store-right-rail-nav" className="mt-2 space-y-1.5">
                    {storeSections.map((section) => {
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
                          <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                            {section.description}
                          </p>
                        </button>
                      );
                    })}
                  </nav>
                ) : (
                  <nav
                    className="mt-2 flex flex-col gap-1.5"
                    aria-label={tx("ui.store.navigation.collapsed_section_rail", "Collapsed section rail")}
                  >
                    {storeSections.map((section) => {
                      const isActive = activeSection === section.id;
                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => scrollToSection(section.id)}
                          className="desktop-interior-button h-9 w-full p-0 text-xs font-semibold"
                          aria-label={tx("ui.store.navigation.jump_to_section", "Jump to {section}", {
                            section: section.label,
                          })}
                          title={tx("ui.store.navigation.jump_to_section", "Jump to {section}", {
                            section: section.label,
                          })}
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
            aria-label={tx("ui.store.navigation.sheet_label", "Store section navigation")}
            className="mx-auto w-full max-w-md rounded-xl border p-4"
            style={{
              background: "var(--window-document-bg-elevated)",
              borderColor: "var(--window-document-border)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-pixel text-xs" style={{ color: "var(--window-document-text)" }}>
                {tx("ui.store.navigation.jump_to", "Jump to")}
              </p>
              <button
                type="button"
                onClick={() => setIsJumpSheetOpen(false)}
                className="desktop-interior-button h-8 w-8 p-0"
                aria-label={tx("ui.store.navigation.close_section_menu", "Close section menu")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {storeSections.map((section) => {
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
                    <p className="mt-1 text-xs" style={{ color: "var(--window-document-text-muted)" }}>
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
