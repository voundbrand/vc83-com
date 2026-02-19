"use client";

import React from "react";
import { ArrowRight, ChevronDown, ChevronRight, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAvailableApps } from "@/hooks/use-app-availability";
import { useAuth } from "@/hooks/use-auth";
import { useWindowManager } from "@/hooks/use-window-manager";
import { useMultipleNamespaces } from "@/hooks/use-namespace-translations";
import {
  getProductAppIconByCode,
  getWindowIconById,
  ShellFinderIcon,
  ShellGridIcon,
  ShellLoginIcon,
} from "@/components/icons/shell-icons";
import {
  PRODUCT_OS_CATALOG,
  PRODUCT_OS_CATALOG_BY_CODE,
  PRODUCT_OS_CATEGORIES,
  PRODUCT_OS_CATEGORY_ICON_ID,
  PRODUCT_OS_NEW_CODES,
  PRODUCT_OS_POPULAR_CODES,
  getProductOSBadgeTranslationKey,
  getProductOSBadgeLabel,
  getProductOSCategoryTranslationKey,
  normalizeProductOSReleaseStage,
  type ProductOSCategory,
  type ProductOSReleaseStage,
} from "@/lib/product-os/catalog";
import {
  InteriorButton,
  InteriorHeader,
  InteriorHelperText,
  InteriorInput,
  InteriorRoot,
  InteriorSubtitle,
  InteriorTitle,
} from "@/components/window-content/shared/interior-primitives";
import { AIChatWindow } from "@/components/window-content/ai-chat-window";
import { BrainWindow } from "@/components/window-content/brain-window";
import { getVoiceAssistantWindowContract } from "@/components/window-content/ai-chat-window/voice-assistant-contract";
import { AgentsWindow } from "@/components/window-content/agents-window";
import { BenefitsWindow } from "@/components/window-content/benefits-window";
import { BookingWindow } from "@/components/window-content/booking-window";
import { BuilderBrowserWindow } from "@/components/window-content/builder-browser-window";
import { CertificatesWindow } from "@/components/window-content/certificates-window";
import { CheckoutWindow } from "@/components/window-content/checkout-window";
import { CRMWindow } from "@/components/window-content/crm-window";
import { EventsWindow } from "@/components/window-content/events-window";
import { FinderWindow } from "@/components/window-content/finder-window";
import { FormsWindow } from "@/components/window-content/forms-window";
import { InvoicingWindow } from "@/components/window-content/invoicing-window";
import { LayersBrowserWindow } from "@/components/window-content/layers-browser-window";
import MediaLibraryWindow from "@/components/window-content/media-library-window";
import { PaymentsWindow } from "@/components/window-content/payments-window";
import { ProductsWindow } from "@/components/window-content/products-window";
import { ProjectsWindow } from "@/components/window-content/projects-window";
import { TerminalWindow } from "@/components/window-content/terminal-window";
import { TextEditorWindow } from "@/components/window-content/text-editor-window";
import { TicketsWindow } from "@/components/window-content/tickets-window";
import { TemplatesWindow } from "@/components/window-content/templates-window";
import { WebPublishingWindow } from "@/components/window-content/web-publishing-window";
import { WorkflowsWindow } from "@/components/window-content/workflows-window";
import { IntegrationsWindow } from "@/components/window-content/integrations-window";

export type AllAppsView = "browse" | "search" | "roadmap";
export const ALL_APPS_SET_VIEW_EVENT = "shell:all-apps:set-view";

interface CatalogApp {
  sourceId: string;
  code: string;
  name: string;
  description: string;
  categoryKey: ProductOSCategory;
  iconId: string;
  releaseStage: ProductOSReleaseStage;
  translationKey?: string;
  icon?: string;
  badge: ProductOSReleaseStage | null;
  isPopular: boolean;
  isNew: boolean;
}

interface CategoryDefinition {
  key: ProductOSCategory;
  iconWindowId: string;
}

interface RoadmapItem {
  id: string;
  votes: number;
  team: string;
  title: string;
  details: string;
  linkLabel: string;
}

interface AllAppsWindowProps {
  initialView?: AllAppsView;
}

type AvailableApp = {
  _id?: string;
  code: string;
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  releaseStage?: string;
};

const CATEGORY_DEFINITIONS: CategoryDefinition[] = PRODUCT_OS_CATEGORIES.map((category) => ({
  key: category,
  iconWindowId: PRODUCT_OS_CATEGORY_ICON_ID[category],
}));

const POPULAR_PRODUCT_CODE_SET = new Set<string>(PRODUCT_OS_POPULAR_CODES);
const NEW_PRODUCT_CODE_SET = new Set<string>(PRODUCT_OS_NEW_CODES);

const LEGACY_CATEGORY_TO_PRODUCT_OS: Partial<Record<string, ProductOSCategory>> = {
  content: "Content & Publishing",
  analytics: "AI & Intelligence",
  marketing: "Revenue & Growth",
  collaboration: "Customer Management",
  finance: "Commerce & Payments",
  administration: "Utilities & Tools",
  commerce: "Commerce & Payments",
  business: "Automation & Workflows",
};

const ROADMAP_ITEMS: RoadmapItem[] = [
  {
    id: "RM-201",
    votes: 184,
    team: "Platform",
    title: "Unified app permissions model",
    details: "Centralize app-level access, org policies, and team roles for safer launches.",
    linkLabel: "Open proposal",
  },
  {
    id: "RM-202",
    votes: 133,
    team: "Product OS",
    title: "Cross-app command palette",
    details: "Jump to any app surface, action, or record from one keyboard-first interface.",
    linkLabel: "View concept",
  },
  {
    id: "RM-203",
    votes: 96,
    team: "Automation",
    title: "Template-driven onboarding journeys",
    details: "Generate best-practice setup flows for CRM, workflows, and deployment apps.",
    linkLabel: "See draft",
  },
  {
    id: "RM-204",
    votes: 74,
    team: "Data",
    title: "Live category health metrics",
    details: "Track install velocity, adoption, and retention by app category in real time.",
    linkLabel: "Explore metrics",
  },
];

const CORE_FILE_TOOL_CODES = [
  "finder",
  "text-editor",
] as const;

function humanizeCode(code: string): string {
  return code
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveProductOSCategory(sourceCategory?: string): ProductOSCategory {
  if (sourceCategory && LEGACY_CATEGORY_TO_PRODUCT_OS[sourceCategory]) {
    return LEGACY_CATEGORY_TO_PRODUCT_OS[sourceCategory] as ProductOSCategory;
  }

  return "Utilities & Tools";
}

function badgeStyles(stage: ProductOSReleaseStage): { background: string; color: string } {
  if (stage === "beta") {
    return { background: "var(--info-bg)", color: "var(--info)" };
  }

  if (stage === "wip") {
    return { background: "var(--warning-bg)", color: "var(--warning)" };
  }

  return { background: "var(--success-bg)", color: "var(--success)" };
}

function renderCatalogIcon(appCode: string, legacyIcon?: string) {
  return getProductAppIconByCode(appCode, legacyIcon, 18);
}

/**
 * Product OS / All Apps window.
 *
 * Redesigned as a three-column browser with category accordions, live search,
 * and a hover/click preview rail inspired by Product OS patterns.
 */
export function AllAppsWindow({ initialView = "browse" }: AllAppsWindowProps = {}) {
  const { isSignedIn } = useAuth();
  const { availableApps, isLoading, organizationName } = useAvailableApps();
  const { openWindow } = useWindowManager();
  const { t } = useMultipleNamespaces(["ui.start_menu", "ui.app", "ui.windows", "ui.product_os"]);
  const tx = React.useCallback(
    (key: string, fallback: string, params?: Record<string, string | number>) => {
      const translated = t(key, params);
      return translated === key ? fallback : translated;
    },
    [t],
  );

  const [activeView, setActiveView] = React.useState<AllAppsView>(initialView);
  const [selectedCategory, setSelectedCategory] = React.useState<ProductOSCategory | "all">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [previewCode, setPreviewCode] = React.useState<string | null>(null);
  const [popularExpanded, setPopularExpanded] = React.useState(true);
  const [newExpanded, setNewExpanded] = React.useState(true);
  const [expandedCategories, setExpandedCategories] = React.useState<Record<ProductOSCategory, boolean>>({
    "Content & Publishing": true,
    "Customer Management": true,
    "Commerce & Payments": true,
    "Events & Ticketing": true,
    "Automation & Workflows": true,
    "Media & Files": true,
    "Revenue & Growth": true,
    "AI & Intelligence": true,
    "Utilities & Tools": true,
  });

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const getCategoryLabel = React.useCallback(
    (category: ProductOSCategory) => tx(getProductOSCategoryTranslationKey(category), category),
    [tx],
  );

  const getLocalizedBadge = React.useCallback(
    (stage: ProductOSReleaseStage) => {
      const fallback = getProductOSBadgeLabel(stage);
      const translationKey = getProductOSBadgeTranslationKey(stage);
      if (!fallback || !translationKey) {
        return null;
      }
      return tx(translationKey, fallback);
    },
    [tx],
  );

  const getRoadmapText = React.useCallback(
    (item: RoadmapItem, field: "team" | "title" | "details" | "linkLabel") => {
      const itemKey = item.id.toLowerCase().replace(/-/g, "_");
      const translationSuffix = field === "linkLabel" ? "link" : field;
      const fallback = item[field];
      return tx(`ui.product_os.roadmap.items.${itemKey}.${translationSuffix}`, fallback);
    },
    [tx],
  );

  React.useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  React.useEffect(() => {
    if (activeView === "search") {
      searchInputRef.current?.focus();
    }
  }, [activeView]);

  React.useEffect(() => {
    const handleSetView = (event: Event) => {
      const detail = (event as CustomEvent<{ view?: AllAppsView }>).detail;
      const nextView = detail?.view;
      if (!nextView) {
        return;
      }

      setActiveView(nextView);

      if (nextView === "browse") {
        setSelectedCategory("all");
      }

      if (nextView === "search") {
        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        });
      }
    };

    window.addEventListener(ALL_APPS_SET_VIEW_EVENT, handleSetView as EventListener);
    return () => {
      window.removeEventListener(ALL_APPS_SET_VIEW_EVENT, handleSetView as EventListener);
    };
  }, []);

  const getTranslatedAppName = React.useCallback(
    (appCode: string, fallbackName?: string) => {
      const catalogEntry = PRODUCT_OS_CATALOG_BY_CODE.get(appCode);
      if (catalogEntry?.translationKey) {
        return tx(catalogEntry.translationKey, catalogEntry.displayName ?? fallbackName ?? humanizeCode(appCode));
      }

      return catalogEntry?.displayName ?? fallbackName ?? humanizeCode(appCode);
    },
    [tx],
  );

  const catalogApps = React.useMemo(() => {
    const typedAvailableApps = availableApps as AvailableApp[];
    const availableByCode = new Map<string, AvailableApp>();

    typedAvailableApps.forEach((app) => {
      if (app?.code) {
        availableByCode.set(app.code, app);
      }
    });

    const discoverableCodes = new Set<string>(PRODUCT_OS_CATALOG.map((entry) => entry.code));
    typedAvailableApps.forEach((app) => {
      if (app?.code) {
        discoverableCodes.add(app.code);
      }
    });

    return Array.from(discoverableCodes)
      .map((code) => {
        const availableApp = availableByCode.get(code);
        const catalogEntry = PRODUCT_OS_CATALOG_BY_CODE.get(code);
        const name = getTranslatedAppName(code, availableApp?.name ?? catalogEntry?.displayName);
        const releaseStage = normalizeProductOSReleaseStage(
          availableApp?.releaseStage ?? catalogEntry?.releaseStage ?? "none",
        );

        return {
          sourceId: availableApp?._id ?? code,
          code,
          name,
          description:
            catalogEntry?.description ??
            availableApp?.description ??
            tx("ui.product_os.default_description", "Open {appName}.", { appName: name }),
          categoryKey: catalogEntry?.category ?? resolveProductOSCategory(availableApp?.category),
          iconId: catalogEntry?.iconId ?? code,
          releaseStage,
          translationKey: catalogEntry?.translationKey,
          icon: availableApp?.icon,
          badge: releaseStage === "none" ? null : releaseStage,
          isPopular: POPULAR_PRODUCT_CODE_SET.has(code),
          isNew: NEW_PRODUCT_CODE_SET.has(code),
        } satisfies CatalogApp;
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [availableApps, getTranslatedAppName, tx]);

  const catalogByCode = React.useMemo(
    () => new Map(catalogApps.map((app) => [app.code, app])),
    [catalogApps],
  );

  React.useEffect(() => {
    if (previewCode && catalogByCode.has(previewCode)) {
      return;
    }

    const fallbackCode =
      CORE_FILE_TOOL_CODES.find((code) => catalogByCode.has(code)) ??
      catalogApps[0]?.code ??
      null;
    setPreviewCode(fallbackCode);
  }, [catalogApps, catalogByCode, previewCode]);

  const popularApps = React.useMemo(
    () => PRODUCT_OS_POPULAR_CODES.map((code) => catalogByCode.get(code)).filter(Boolean) as CatalogApp[],
    [catalogByCode],
  );

  const newApps = React.useMemo(
    () => PRODUCT_OS_NEW_CODES.map((code) => catalogByCode.get(code)).filter(Boolean) as CatalogApp[],
    [catalogByCode],
  );

  const categorySections = React.useMemo(
    () =>
      CATEGORY_DEFINITIONS.map((category) => ({
        ...category,
        apps: catalogApps.filter((app) => app.categoryKey === category.key),
      })).filter((category) => category.apps.length > 0),
    [catalogApps],
  );

  const visibleBrowseSections = React.useMemo(() => {
    if (selectedCategory === "all") {
      return categorySections;
    }

    return categorySections.filter((section) => section.key === selectedCategory);
  }, [categorySections, selectedCategory]);

  const searchResults = React.useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return catalogApps;
    }

    return catalogApps.filter((app) => {
      return (
        app.name.toLowerCase().includes(normalized) ||
        app.description.toLowerCase().includes(normalized) ||
        app.code.toLowerCase().includes(normalized)
      );
    });
  }, [catalogApps, searchQuery]);

  const previewApp = previewCode ? catalogByCode.get(previewCode) ?? null : null;

  const handleAppClick = React.useCallback(
    (appCode: string) => {
      const aiAssistantWindowContract = getVoiceAssistantWindowContract("ai-assistant");
      const brainVoiceWindowContract = getVoiceAssistantWindowContract("brain-voice");
      const appWindowMap: Record<
        string,
        {
          id?: string;
          component: React.ReactNode;
          width: number;
          height: number;
          title?: string;
          titleKey?: string;
          iconId?: string;
        }
      > = {
        "ai-assistant": {
          id: aiAssistantWindowContract.windowId,
          component: <AIChatWindow />,
          width: aiAssistantWindowContract.size.width,
          height: aiAssistantWindowContract.size.height,
          title: aiAssistantWindowContract.title,
          titleKey: aiAssistantWindowContract.titleKey,
          iconId: aiAssistantWindowContract.iconId,
        },
        "brain-voice": {
          id: brainVoiceWindowContract.windowId,
          component: <BrainWindow initialMode="learn" />,
          width: brainVoiceWindowContract.size.width,
          height: brainVoiceWindowContract.size.height,
          title: brainVoiceWindowContract.title,
          titleKey: brainVoiceWindowContract.titleKey,
          iconId: brainVoiceWindowContract.iconId,
        },
        payments: {
          component: <PaymentsWindow />,
          width: 900,
          height: 650,
        },
        "web-publishing": {
          component: <WebPublishingWindow />,
          width: 1000,
          height: 700,
        },
        "webchat-deployment": {
          component: <WebPublishingWindow initialTab="webchat-deployment" />,
          width: 1000,
          height: 680,
        },
        "media-library": {
          component: <MediaLibraryWindow />,
          width: 900,
          height: 650,
        },
        products: {
          component: <ProductsWindow />,
          width: 950,
          height: 650,
        },
        tickets: {
          component: <TicketsWindow />,
          width: 950,
          height: 650,
        },
        certificates: {
          component: <CertificatesWindow />,
          width: 1100,
          height: 700,
        },
        events: {
          component: <EventsWindow />,
          width: 950,
          height: 650,
        },
        checkout: {
          component: <CheckoutWindow />,
          width: 950,
          height: 650,
        },
        forms: {
          component: <FormsWindow />,
          width: 950,
          height: 650,
        },
        crm: {
          component: <CRMWindow />,
          width: 1100,
          height: 700,
        },
        app_invoicing: {
          id: "invoicing",
          component: <InvoicingWindow />,
          width: 950,
          height: 650,
        },
        workflows: {
          component: <WorkflowsWindow />,
          width: 1200,
          height: 750,
        },
        projects: {
          component: <ProjectsWindow />,
          width: 1000,
          height: 700,
        },
        benefits: {
          component: <BenefitsWindow />,
          width: 1100,
          height: 700,
        },
        booking: {
          component: <BookingWindow />,
          width: 1100,
          height: 700,
        },
        builder: {
          component: <BuilderBrowserWindow />,
          width: 1100,
          height: 750,
        },
        layers: {
          component: <LayersBrowserWindow />,
          width: 1100,
          height: 750,
        },
        "agents-browser": {
          component: <AgentsWindow />,
          width: 1100,
          height: 750,
        },
        finder: {
          component: <FinderWindow />,
          width: 1200,
          height: 800,
        },
        terminal: {
          component: <TerminalWindow />,
          width: 900,
          height: 550,
        },
        "text-editor": {
          component: <TextEditorWindow />,
          width: 1100,
          height: 740,
        },
        templates: {
          component: <TemplatesWindow />,
          width: 1100,
          height: 700,
        },
        integrations: {
          component: <IntegrationsWindow />,
          width: 900,
          height: 650,
        },
      };

      const appWindow = appWindowMap[appCode];
      const appName = catalogByCode.get(appCode)?.name ?? getTranslatedAppName(appCode);
      const titleKey = catalogByCode.get(appCode)?.translationKey;
      const iconId = catalogByCode.get(appCode)?.iconId ?? appCode;
      const legacyIcon = catalogByCode.get(appCode)?.icon;

      if (appWindow) {
        openWindow(
          appWindow.id ?? appCode,
          appWindow.title ?? appName,
          appWindow.component,
          undefined,
          { width: appWindow.width, height: appWindow.height },
          appWindow.titleKey ?? titleKey,
          appWindow.iconId ?? iconId,
        );
        return;
      }

      openWindow(
        `app-${appCode}`,
        appName,
        <InteriorRoot className="flex h-full items-center justify-center">
          <div className="space-y-3 text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border"
              style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
            >
              {renderCatalogIcon(appCode, catalogByCode.get(appCode)?.icon)}
            </div>
            <h3 className="text-base font-semibold" style={{ color: "var(--window-document-text)" }}>
              {appName}
            </h3>
            <InteriorHelperText>{t("ui.start_menu.app_coming_soon")}</InteriorHelperText>
          </div>
        </InteriorRoot>,
        undefined,
        { width: 600, height: 400 },
        titleKey,
        legacyIcon ?? iconId,
      );
    },
    [catalogByCode, getTranslatedAppName, openWindow, t],
  );

  const handlePreviewOnly = React.useCallback((appCode: string) => {
    setPreviewCode(appCode);
  }, []);

  const handleSidebarCategoryToggle = React.useCallback((categoryKey: ProductOSCategory) => {
    setExpandedCategories((previous) => ({
      ...previous,
      [categoryKey]: !previous[categoryKey],
    }));
    setActiveView("browse");
    setSelectedCategory(categoryKey);
  }, []);

  const openPricingPage = React.useCallback(() => {
    window.location.assign("/pricing");
  }, []);

  if (!isSignedIn) {
    return (
      <InteriorRoot className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div
          className="mb-3 flex h-14 w-14 items-center justify-center rounded-md border"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <ShellLoginIcon size={20} />
        </div>
        <h3 className="text-lg font-semibold" style={{ color: "var(--window-document-text)" }}>
          {t("ui.start_menu.sign_in_required")}
        </h3>
        <InteriorHelperText className="mt-2">{t("ui.start_menu.sign_in_to_view_apps")}</InteriorHelperText>
      </InteriorRoot>
    );
  }

  if (isLoading) {
    return (
      <InteriorRoot className="flex h-full items-center justify-center" data-testid="all-apps-window">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={30} className="animate-spin" style={{ color: "var(--tone-accent-strong)" }} />
          <InteriorHelperText>{t("ui.start_menu.loading_applications")}</InteriorHelperText>
        </div>
      </InteriorRoot>
    );
  }

  return (
    <InteriorRoot className="flex h-full flex-col overflow-hidden" data-testid="all-apps-window">
      <InteriorHeader className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <InteriorTitle className="text-lg">{tx("ui.product_os.title", "Product OS")}</InteriorTitle>
            <InteriorSubtitle className="mt-1">
              {t("ui.start_menu.apps_installed_for", {
                count: catalogApps.length,
                orgName: organizationName,
              })}
            </InteriorSubtitle>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <InteriorButton
              size="sm"
              variant={activeView === "browse" ? "primary" : "subtle"}
              onClick={() => {
                setActiveView("browse");
                setSelectedCategory("all");
              }}
            >
              {tx("ui.product_os.view.browse", "Browse")}
            </InteriorButton>
            <InteriorButton
              size="sm"
              variant={activeView === "search" ? "primary" : "subtle"}
              onClick={() => setActiveView("search")}
            >
              {tx("ui.product_os.view.search", "Search")}
            </InteriorButton>
            <InteriorButton
              size="sm"
              variant={activeView === "roadmap" ? "primary" : "subtle"}
              onClick={() => setActiveView("roadmap")}
            >
              {tx("ui.product_os.view.roadmap", "Roadmap")}
            </InteriorButton>
          </div>
        </div>
      </InteriorHeader>

      <div className="flex min-h-0 flex-1 min-w-0 flex-col md:flex-row">
        <aside
          className="w-full shrink-0 border-b md:w-[300px] md:border-r md:border-b-0"
          style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
        >
          <div className="flex h-full flex-col overflow-y-auto">
            <div className="space-y-2 p-3">
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs font-semibold transition",
                  activeView === "browse" && selectedCategory === "all" ? "border-transparent" : "",
                )}
                style={{
                  borderColor:
                    activeView === "browse" && selectedCategory === "all"
                      ? "var(--tone-accent-strong)"
                      : "var(--window-document-border)",
                  background:
                    activeView === "browse" && selectedCategory === "all"
                      ? "var(--window-document-bg)"
                      : "var(--desktop-shell-accent)",
                  color: "var(--window-document-text)",
                }}
                onClick={() => {
                  setActiveView("browse");
                  setSelectedCategory("all");
                }}
              >
                <span className="flex items-center gap-2">
                  <ShellGridIcon size={15} tone="active" />
                  <span>
                    {tx("ui.product_os.menu.browse_all_apps", "Browse all apps ({count})", {
                      count: catalogApps.length,
                    })}
                  </span>
                </span>
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs font-semibold transition"
                style={{
                  borderColor: activeView === "search" ? "var(--tone-accent-strong)" : "var(--window-document-border)",
                  background: activeView === "search" ? "var(--window-document-bg)" : "var(--desktop-shell-accent)",
                  color: "var(--window-document-text)",
                }}
                onClick={() => setActiveView("search")}
              >
                <span className="flex items-center gap-2">
                  <ShellFinderIcon size={15} tone="active" />
                  <span>{tx("ui.product_os.menu.search_apps", "Search apps")}</span>
                </span>
                <Search size={14} />
              </button>

              <div
                className="rounded-md border"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold"
                  style={{ color: "var(--window-document-text)" }}
                  onClick={() => setPopularExpanded((previous) => !previous)}
                >
                  <span className="flex items-center gap-2">
                    {getWindowIconById("ai-assistant", undefined, 16)}
                    <span>
                      {tx("ui.product_os.menu.popular_products", "Popular products ({count})", {
                        count: popularApps.length,
                      })}
                    </span>
                  </span>
                  {popularExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300",
                    popularExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-1 px-2 pb-2">
                      {popularApps.map((app) => (
                        <button
                          key={app.code}
                          type="button"
                          className="flex w-full items-center justify-between rounded-sm px-2 py-1 text-xs transition"
                          style={{ color: "var(--desktop-menu-text-muted)" }}
                          onMouseEnter={() => handlePreviewOnly(app.code)}
                          onClick={() => {
                            setPreviewCode(app.code);
                            handleAppClick(app.code);
                          }}
                        >
                          <span className="truncate">{app.name}</span>
                          <ChevronRight size={12} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="rounded-md border"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold"
                  style={{ color: "var(--window-document-text)" }}
                  onClick={() => setNewExpanded((previous) => !previous)}
                >
                  <span className="flex items-center gap-2">
                    {getWindowIconById("benefits", undefined, 16)}
                    <span>
                      {tx("ui.product_os.menu.new_products", "New products ({count})", {
                        count: newApps.length,
                      })}
                    </span>
                  </span>
                  {newExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300",
                    newExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-1 px-2 pb-2">
                      {newApps.map((app) => (
                        <button
                          key={app.code}
                          type="button"
                          className="flex w-full items-center justify-between rounded-sm px-2 py-1 text-xs transition"
                          style={{ color: "var(--desktop-menu-text-muted)" }}
                          onMouseEnter={() => handlePreviewOnly(app.code)}
                          onClick={() => {
                            setPreviewCode(app.code);
                            handleAppClick(app.code);
                          }}
                        >
                          <span className="truncate">{app.name}</span>
                          <ChevronRight size={12} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-y px-3 py-3" style={{ borderColor: "var(--window-document-border)" }}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                {tx("ui.product_os.categories", "Categories")}
              </p>

              <div className="space-y-2">
                {categorySections.map((category) => {
                  const isExpanded = expandedCategories[category.key];
                  const isSelected = selectedCategory === category.key;

                  return (
                    <div
                      key={category.key}
                      className="rounded-md border"
                      style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-2.5 py-2 text-left text-xs font-semibold"
                        style={{
                          color: "var(--window-document-text)",
                          background: isSelected ? "var(--desktop-shell-accent)" : "transparent",
                        }}
                        onClick={() => handleSidebarCategoryToggle(category.key)}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="flex h-4 w-4 items-center justify-center">
                            {getWindowIconById(category.iconWindowId, undefined, 16)}
                          </span>
                          <span className="truncate">{getCategoryLabel(category.key)}</span>
                          <span className="text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                            ({category.apps.length})
                          </span>
                        </span>
                        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>

                      <div
                        className={cn(
                          "grid transition-[grid-template-rows,opacity] duration-300",
                          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="space-y-1 px-2 pb-2">
                            {category.apps.slice(0, 5).map((app) => (
                              <button
                                key={`category-${category.key}-${app.code}`}
                                type="button"
                                className="w-full truncate rounded-sm px-2 py-1 text-left text-xs"
                                style={{ color: "var(--desktop-menu-text-muted)" }}
                                onMouseEnter={() => handlePreviewOnly(app.code)}
                                onClick={() => {
                                  setPreviewCode(app.code);
                                  handleAppClick(app.code);
                                }}
                              >
                                {app.name}
                              </button>
                            ))}

                            {category.apps.length > 5 ? (
                              <p className="px-2 py-1 text-[10px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                                {tx("ui.product_os.more_count", "+{count} more", {
                                  count: category.apps.length - 5,
                                })}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto space-y-3 p-3">
              <div
                className="rounded-md border p-3"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
              >
                <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                  {tx("ui.product_os.about.title", "About Product OS")}
                </p>
                <p className="mt-2 text-xs leading-5" style={{ color: "var(--desktop-menu-text-muted)" }}>
                  {tx(
                    "ui.product_os.about.body",
                    "Product OS bundles our full application suite into one discoverable workspace. Teams can launch, connect, and operate products without hopping between tools. Shared navigation keeps capabilities easy to find as your stack grows. The structure is designed for faster onboarding and clearer ownership.",
                  )}
                </p>
              </div>

              <div
                className="rounded-md border p-3"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
              >
                <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                  {tx("ui.product_os.pricing.title", "How pricing works")}
                </p>
                <p className="mt-2 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                  {tx(
                    "ui.product_os.pricing.body",
                    "Plans unlock app bundles, usage limits, and advanced automation capabilities.",
                  )}
                </p>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold"
                  style={{ color: "var(--tone-accent-strong)" }}
                  onClick={openPricingPage}
                >
                  {tx("ui.product_os.pricing.explore", "Explore pricing")}
                  <ArrowRight size={12} />
                </button>
              </div>

              <div
                className="rounded-md border p-3"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
              >
                <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                  {tx("ui.product_os.menu.roadmap", "Roadmap")}
                </p>
                <p className="mt-2 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                  {tx(
                    "ui.product_os.roadmap.sidebar.body",
                    "Preview feature bets and delivery ownership. Interactive voting lands in a future release.",
                  )}
                </p>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold"
                  style={{ color: "var(--tone-accent-strong)" }}
                  onClick={() => setActiveView("roadmap")}
                >
                  {tx("ui.product_os.roadmap.open", "Open roadmap")}
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row">
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
            {activeView === "search" && (
              <div className="space-y-4">
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--desktop-menu-text-muted)" }}
                  />
                  <InteriorInput
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="h-11 text-sm"
                    style={{ paddingLeft: "2.8rem" }}
                    placeholder={tx("ui.product_os.search.placeholder", "Search apps")}
                  />
                </div>

                <div
                  className="overflow-hidden rounded-xl border"
                  style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
                >
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                        {tx("ui.product_os.search.empty.title", "No apps found")}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        {tx("ui.product_os.search.empty.body", "Try a different keyword or browse all categories.")}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: "var(--window-document-border)" }}>
                      {searchResults.map((app) => (
                        <button
                          key={`search-${app.sourceId}`}
                          type="button"
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition"
                          style={{ color: "var(--window-document-text)" }}
                          onMouseEnter={() => setPreviewCode(app.code)}
                          onClick={() => {
                            setPreviewCode(app.code);
                            handleAppClick(app.code);
                          }}
                        >
                          <span
                            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
                            style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
                          >
                            {renderCatalogIcon(app.code, app.icon)}
                          </span>

                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="text-sm font-semibold">{app.name}</span>
                            <span className="text-xs leading-5" style={{ color: "var(--desktop-menu-text-muted)" }}>
                              {app.description}
                            </span>
                          </span>

                          <ChevronRight size={15} className="mt-1 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === "roadmap" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold" style={{ color: "var(--window-document-text)" }}>
                    {tx("ui.product_os.roadmap.title", "Product roadmap (mock)")}
                  </h3>
                  <p className="mt-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    {tx(
                      "ui.product_os.roadmap.subtitle",
                      "Static preview of the upcoming roadmap surface. Vote interactions and filtering are planned.",
                    )}
                  </p>
                </div>

                <div
                  className="rounded-xl border"
                  style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
                >
                  <table className="w-full table-fixed text-left text-xs">
                    <thead style={{ background: "var(--desktop-shell-accent)" }}>
                      <tr>
                        <th className="w-[10%] px-3 py-2 font-semibold">
                          {tx("ui.product_os.roadmap.table.votes", "Votes")}
                        </th>
                        <th className="w-[16%] px-3 py-2 font-semibold">
                          {tx("ui.product_os.roadmap.table.team", "Team")}
                        </th>
                        <th className="w-[24%] px-3 py-2 font-semibold">
                          {tx("ui.product_os.roadmap.table.feature", "Feature idea")}
                        </th>
                        <th className="w-[38%] px-3 py-2 font-semibold">
                          {tx("ui.product_os.roadmap.table.details", "Details")}
                        </th>
                        <th className="w-[12%] px-3 py-2 font-semibold">
                          {tx("ui.product_os.roadmap.table.more_info", "More info")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ROADMAP_ITEMS.map((item) => (
                        <tr key={item.id} className="border-t" style={{ borderColor: "var(--window-document-border)" }}>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="inline-flex h-7 items-center rounded-md border px-2"
                              style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
                              onClick={() => {
                                // Reserved for future interactive roadmap voting.
                              }}
                            >
                              {item.votes}
                            </button>
                          </td>
                          <td className="break-words px-3 py-2" style={{ color: "var(--desktop-menu-text-muted)" }}>
                            {getRoadmapText(item, "team")}
                          </td>
                          <td className="break-words px-3 py-2 font-semibold">{getRoadmapText(item, "title")}</td>
                          <td className="break-words px-3 py-2" style={{ color: "var(--desktop-menu-text-muted)" }}>
                            {getRoadmapText(item, "details")}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 break-words text-left font-semibold"
                              style={{ color: "var(--tone-accent-strong)" }}
                              onClick={() => {
                                // Reserved for future dedicated roadmap items.
                              }}
                            >
                              {getRoadmapText(item, "linkLabel")}
                              <ArrowRight size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeView === "browse" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold" style={{ color: "var(--window-document-text)" }}>
                    {selectedCategory === "all"
                      ? tx("ui.product_os.browse.library", "Browse app library")
                      : getCategoryLabel(selectedCategory)}
                  </h3>
                  <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    {tx("ui.product_os.apps_count", "{count} apps", {
                      count: visibleBrowseSections.reduce((total, section) => total + section.apps.length, 0),
                    })}
                  </p>
                </div>

                {visibleBrowseSections.map((category) => {
                  const isExpanded = expandedCategories[category.key];

                  return (
                    <section
                      key={`browse-${category.key}`}
                      className="rounded-xl border"
                      style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                        onClick={() => {
                          setExpandedCategories((previous) => ({
                            ...previous,
                            [category.key]: !previous[category.key],
                          }));
                          setSelectedCategory(category.key);
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center">
                            {getWindowIconById(category.iconWindowId, undefined, 16)}
                          </span>
                          <span className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                            {getCategoryLabel(category.key)}
                          </span>
                          <span className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                            ({category.apps.length})
                          </span>
                        </span>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      <div
                        className={cn(
                          "grid transition-[grid-template-rows,opacity] duration-300",
                          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="grid content-start items-start grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3 px-4 pb-4">
                            {category.apps.map((app) => (
                              <button
                                key={`card-${category.key}-${app.sourceId}`}
                                type="button"
                                className="group self-start rounded-lg border p-3 text-left transition"
                                style={{
                                  borderColor: "var(--window-document-border)",
                                  background: "var(--desktop-shell-accent)",
                                  color: "var(--window-document-text)",
                                }}
                                onMouseEnter={() => setPreviewCode(app.code)}
                                onClick={() => {
                                  setPreviewCode(app.code);
                                  handleAppClick(app.code);
                                }}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <span
                                    className="flex h-9 w-9 items-center justify-center rounded-md border"
                                    style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
                                  >
                                    {renderCatalogIcon(app.code, app.icon)}
                                  </span>

                                  <span className="flex flex-col items-end gap-1">
                                    {app.badge ? (
                                      <span
                                        key={`${app.code}-${app.badge}`}
                                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                                        style={badgeStyles(app.badge)}
                                      >
                                        {getLocalizedBadge(app.badge)}
                                      </span>
                                    ) : null}
                                  </span>
                                </div>

                                <p className="mt-2 text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
                                  {app.name}
                                </p>
                                <p className="mt-1 line-clamp-2 text-[11px] leading-4" style={{ color: "var(--desktop-menu-text-muted)" }}>
                                  {app.description}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </main>

          <aside
            className="w-full min-w-0 shrink-0 border-t p-4 xl:w-[360px] xl:border-l xl:border-t-0"
            style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
          >
            <div
              className="flex h-full min-h-[260px] flex-col rounded-xl border p-4"
              style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
            >
              {previewApp ? (
                <>
                  <div
                    className="rounded-xl border p-4"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background:
                        "linear-gradient(145deg, var(--desktop-shell-accent) 0%, var(--window-document-bg-elevated) 100%)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-lg border"
                        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
                      >
                        {renderCatalogIcon(previewApp.code, previewApp.icon)}
                      </span>

                      <span className="flex flex-wrap justify-end gap-1">
                        {previewApp.badge ? (
                          <span
                            key={`preview-${previewApp.code}-${previewApp.badge}`}
                            className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                            style={badgeStyles(previewApp.badge)}
                          >
                            {getLocalizedBadge(previewApp.badge)}
                          </span>
                        ) : null}
                      </span>
                    </div>

                    <div className="mt-8">
                      <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                        {previewApp.name}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        {tx("ui.product_os.preview.live_panel", "Live preview panel")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                      {previewApp.name}
                    </h3>
                    <p className="mt-2 text-xs leading-5" style={{ color: "var(--desktop-menu-text-muted)" }}>
                      {previewApp.description}
                    </p>
                  </div>

                  <div className="mt-auto pt-4">
                    <InteriorButton
                      variant="primary"
                      className="w-full justify-between"
                      onClick={() => handleAppClick(previewApp.code)}
                    >
                      <span>{tx("ui.product_os.preview.open_app", "Open {appName}", { appName: previewApp.name })}</span>
                      <ArrowRight size={14} />
                    </InteriorButton>
                  </div>
                </>
              ) : (
                <div className="my-auto text-center">
                  <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                    {tx("ui.product_os.preview.select_title", "Select an app to preview")}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    {tx(
                      "ui.product_os.preview.select_body",
                      "Hover or choose an app card to load details and launch actions.",
                    )}
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </InteriorRoot>
  );
}
