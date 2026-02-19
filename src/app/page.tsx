"use client"

import { type ComponentProps, useState, useEffect, useCallback, useMemo } from "react"
import { ClientOnly } from "@/components/client-only"
import { useWindowManager } from "@/hooks/use-window-manager"
import { FloatingWindow } from "@/components/floating-window"
import { WelcomeWindow } from "@/components/window-content/welcome-window"
import { ControlPanelWindow } from "@/components/window-content/control-panel-window"
import { LoginWindow } from "@/components/window-content/login-window"
import { PaymentsWindow } from "@/components/window-content/payments-window"
import { WebPublishingWindow } from "@/components/window-content/web-publishing-window"
import MediaLibraryWindow from "@/components/window-content/media-library-window"
import { ProductsWindow } from "@/components/window-content/products-window"
import { TicketsWindow } from "@/components/window-content/tickets-window"
import { CertificatesWindow } from "@/components/window-content/certificates-window"
import { EventsWindow } from "@/components/window-content/events-window"
import { CheckoutWindow } from "@/components/window-content/checkout-window"
import { PlatformCartWindow } from "@/components/window-content/platform-cart-window"
import { CheckoutSuccessWindow } from "@/components/window-content/checkout-success-window"
import { CheckoutFailedWindow } from "@/components/window-content/checkout-failed-window"
import { PurchaseResultWindow } from "@/components/window-content/purchase-result-window"
import type { PurchaseResultWindowProps } from "@/components/window-content/purchase-result-window"
import { FormsWindow } from "@/components/window-content/forms-window"
import { AllAppsWindow, ALL_APPS_SET_VIEW_EVENT, type AllAppsView } from "@/components/window-content/all-apps-window"
import { ShoppingCartButton } from "@/components/shopping-cart-button"
import { CRMWindow } from "@/components/window-content/crm-window"
import { InvoicingWindow } from "@/components/window-content/invoicing-window"
import { WorkflowsWindow } from "@/components/window-content/workflows-window"
import { TemplatesWindow } from "@/components/window-content/templates-window"
import { AIChatWindow } from "@/components/window-content/ai-chat-window"
import { BrainWindow } from "@/components/window-content/brain-window"
import {
  getVoiceAssistantWindowContract,
  type VoiceAssistantWindowId,
} from "@/components/window-content/ai-chat-window/voice-assistant-contract"
import { StoreWindow } from "@/components/window-content/store-window"
import { ProjectsWindow } from "@/components/window-content/projects-window"
import { WindowsMenu, type LauncherItem } from "@/components/windows-menu"
import { TopNavMenu, type TopNavMenuItem } from "@/components/taskbar/top-nav-menu"
import { TutorialWindow } from "@/components/window-content/tutorial-window"
import { TutorialsDocsWindow } from "@/components/window-content/tutorials-docs-window"
import { IntegrationsWindow } from "@/components/window-content/integrations-window"
import { ComplianceWindow } from "@/components/window-content/compliance-window"
import { OrganizationSwitcherWindow } from "@/components/window-content/organization-switcher-window"
import { BenefitsWindow } from "@/components/window-content/benefits-window"
import { BookingWindow } from "@/components/window-content/booking-window"
import { BuilderBrowserWindow } from "@/components/window-content/builder-browser-window"
import { AgentsWindow } from "@/components/window-content/agents-window"
import { LayersBrowserWindow } from "@/components/window-content/layers-browser-window"
import { FinderWindow } from "@/components/window-content/finder-window"
import { TerminalWindow } from "@/components/window-content/terminal-window"
import { TextEditorWindow } from "@/components/window-content/text-editor-window"
import {
  dispatchTextEditorCommand,
  TEXT_EDITOR_OPEN_REQUEST_EVENT,
  type TextEditorOpenRequestDetail,
} from "@/components/window-content/text-editor-window/bridge"
import { WaitingForApprovalScreen } from "@/components/waiting-for-approval-screen"
import { useIsDesktopShellFallback } from "@/hooks/use-media-query"
import { useAuth, useOrganizations, useCurrentOrganization, useIsSuperAdmin, useAccountDeletionStatus } from "@/hooks/use-auth"
import { useAvailableApps } from "@/hooks/use-app-availability"
import { useMultipleNamespaces } from "@/hooks/use-namespace-translations"
import { useAppearance } from "@/contexts/appearance-context"
import { getLocaleLabel, useTranslation } from "@/contexts/translation-context"
import { setNativeGuestClaimToken } from "@/hooks/use-ai-chat"
import {
  buildShellWindowProps,
  isLegacyManageOAuthCallback,
  parseShellUrlState,
  serializeShellUrlState,
  stripShellQueryParams,
} from "@/lib/shell/url-state"
import {
  getProductAppIconByCode,
  getWindowIconById,
  ShellBotIcon,
  ShellFinderIcon,
  ShellGridIcon,
  ShellLoginIcon,
  ShellLogoutIcon,
  ShellMoonIcon,
  ShellPeopleIcon,
  ShellSepiaIcon,
  ShellSettingsIcon,
  ShellShieldIcon,
  ShellStoreIcon,
  ShellTerminalIcon,
  ShellWarningIcon,
  ShellProfileIcon,
  ShellTranslationsIcon,
} from "@/components/icons/shell-icons"
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
} from "@/lib/product-os/catalog"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"

const GUEST_DEEPLINK_ALLOWED_APPS = new Set(["ai-assistant", "store", "login"])

export default function HomePage() {
  // Load translations for start menu and app names
  const { t } = useMultipleNamespaces(["ui.start_menu", "ui.app", "ui.windows", "ui.product_os"])
  const tx = useCallback(
    (key: string, fallback: string, params?: Record<string, string | number>) => {
      const translated = t(key, params)
      return translated === key ? fallback : translated
    },
    [t],
  )
  // Note: locale management is now handled via TranslationContext if needed
  const { windows, openWindow, closeWindow, restoreWindow, focusWindow, isRestored } = useWindowManager()
  const isMobileShellFallback = useIsDesktopShellFallback()
  const { isSignedIn, isLoading: authLoading, signOut, sessionId, user, switchOrganization } = useAuth()
  const organizations = useOrganizations()
  const currentOrg = useCurrentOrganization()
  const isSuperAdmin = useIsSuperAdmin()
  const deletionStatus = useAccountDeletionStatus()
  const { mode, toggleMode } = useAppearance()
  const { locale, availableLocales, setLocale } = useTranslation()

  const isDarkAppearance = mode === "dark"

  // Toggle top-level appearance between dark and sepia
  const handleAppearanceToggle = () => {
    toggleMode()
  }

  // Use the new hook for app availability
  const { isAppAvailable, availableApps } = useAvailableApps()

  // @ts-ignore TS2589: Convex generated query type can exceed instantiation depth in this component.
  const getOrganizationSettingsQuery = (api as any).organizationOntology.getOrganizationSettings

  // Query branding settings for desktop background
  const brandingSettings = (useQuery as any)(
    getOrganizationSettingsQuery,
    currentOrg?.id ? {
      organizationId: currentOrg.id as Id<"organizations">,
      subtype: "branding"
    } : "skip"
  )

  // Extract desktop background URL
  const orgDesktopBackground = brandingSettings && !Array.isArray(brandingSettings)
    ? (brandingSettings.customProperties as { desktopBackground?: string })?.desktopBackground
    : undefined

  // Resolve default desktop background from env var storage ID
  const defaultBgStorageId = process.env.NEXT_PUBLIC_DESKTOP_BG_STORAGE_ID;
  const defaultBgUrl = useQuery(
    api.files.getFileUrl,
    defaultBgStorageId ? { storageId: defaultBgStorageId as Id<"_storage"> } : "skip"
  );
  const desktopBackground = orgDesktopBackground || defaultBgUrl || undefined;

  // Check if user has seen the welcome tutorial
  // IMPORTANT: Only query if BOTH isSignedIn AND currentOrg are ready
  const tutorialProgress = useQuery(
    api.tutorialOntology.getTutorialProgress,
    isSignedIn && currentOrg && sessionId ? { tutorialId: "welcome", sessionId } : "skip"
  )

  // Check beta access status (always check, even for non-logged-in users)
  const betaStatus = useQuery(
    api.betaAccess.checkBetaAccessStatus,
    { sessionId: sessionId || undefined }
  )

  const openWelcomeWindow = () => {
    openWindow("welcome", "l4yercak3.exe", <WelcomeWindow />, { x: 100, y: 100 }, { width: 650, height: 500 }, 'ui.app.l4yercak3_exe')
  }

  const openSettingsWindow = () => {
    openWindow("control-panel", "Settings", <ControlPanelWindow />, { x: 200, y: 100 }, { width: 700, height: 550 }, 'ui.start_menu.settings')
  }

  const openLoginWindow = () => {
    openWindow("login", "User Account", <LoginWindow />, { x: 250, y: 60 }, { width: 450, height: 720 }, 'ui.app.user_account')
  }


  // const openLayerDocsWindow = () => {
  //   openWindow("layer-docs", "L4YER.docs", <LayerDocsWindow />, { x: 150, y: 80 }, { width: 1000, height: 650 })
  // }

  const openPaymentsWindow = () => {
    openWindow("payments", "Payment Management", <PaymentsWindow />, { x: 100, y: 50 }, { width: 900, height: 600 }, 'ui.app.payment_management')
  }

  const openWebPublishingWindow = () => {
    openWindow("web-publishing", "Web Publishing", <WebPublishingWindow />, { x: 110, y: 55 }, { width: 900, height: 600 }, 'ui.windows.web_publishing.title')
  }

  const openWebchatDeploymentWindow = () => {
    openWindow(
      "webchat-deployment",
      "Webchat Deployment",
      <WebPublishingWindow initialTab="webchat-deployment" />,
      { x: 125, y: 65 },
      { width: 1000, height: 680 },
      undefined,
      "webchat-deployment",
      { initialTab: "webchat-deployment", initialPanel: "webchat-deployment" }
    )
  }

  const openMediaLibraryWindow = () => {
    openWindow("media-library", "Media Library", <MediaLibraryWindow />, { x: 120, y: 60 }, { width: 1000, height: 700 }, 'ui.app.media_library')
  }

  const openProductsWindow = () => {
    openWindow("products", "Products", <ProductsWindow />, { x: 130, y: 50 }, { width: 950, height: 650 }, 'ui.app.products')
  }

  const openTicketsWindow = () => {
    openWindow("tickets", "Tickets", <TicketsWindow />, { x: 140, y: 55 }, { width: 950, height: 650 }, 'ui.app.tickets')
  }

  const openCertificatesWindow = () => {
    openWindow("certificates", "Certificates", <CertificatesWindow />, { x: 150, y: 60 }, { width: 1100, height: 700 }, 'ui.app.certificates')
  }

  const openEventsWindow = () => {
    openWindow("events", "Events", <EventsWindow />, { x: 160, y: 50 }, { width: 950, height: 650 }, 'ui.app.events')
  }

  // Open Checkout App - for managing checkout pages (from Programs menu)
  const openCheckoutAppWindow = () => {
    const centerX = typeof window !== 'undefined' ? (window.innerWidth - 900) / 2 : 200;
    openWindow("checkout-app", "Checkout Manager", <CheckoutWindow />, { x: centerX, y: 50 }, { width: 900, height: 650 }, 'ui.app.checkout')
  }

  // Open Platform Cart - for buying platform services (from cart button)
  const openPlatformCartWindow = () => {
    const cartX = typeof window !== 'undefined' ? window.innerWidth - 420 : 1000;
    openWindow("platform-cart", "Cart", <PlatformCartWindow />, { x: cartX, y: 100 }, { width: 380, height: 500 })
  }

  const openCheckoutSuccessWindow = () => {
    // Center the success window on screen
    const centerX = typeof window !== 'undefined' ? (window.innerWidth - 600) / 2 : 400;
    const centerY = typeof window !== 'undefined' ? (window.innerHeight - 650) / 2 : 100;
    openWindow("checkout-success", "Order Complete", <CheckoutSuccessWindow />, { x: centerX, y: centerY }, { width: 600, height: 650 }, 'ui.app.checkout')
  }

  const openCheckoutFailedWindow = (reason?: string) => {
    // Center the failed window on screen
    const centerX = typeof window !== 'undefined' ? (window.innerWidth - 600) / 2 : 400;
    const centerY = typeof window !== 'undefined' ? (window.innerHeight - 600) / 2 : 100;
    openWindow("checkout-failed", "Checkout Failed", <CheckoutFailedWindow reason={reason} />, { x: centerX, y: centerY }, { width: 600, height: 600 })
  }

  const openPurchaseResultWindow = (props: PurchaseResultWindowProps) => {
    const centerX = typeof window !== 'undefined' ? (window.innerWidth - 600) / 2 : 400;
    const centerY = typeof window !== 'undefined' ? (window.innerHeight - 650) / 2 : 100;
    const title = props.status === "success" ? "Purchase Complete" : props.status === "canceled" ? "Purchase Canceled" : "Purchase Failed";
    openWindow("purchase-result", title, <PurchaseResultWindow {...props} />, { x: centerX, y: centerY }, { width: 600, height: 650 })
  }

  const openFormsWindow = () => {
    openWindow("forms", "Forms", <FormsWindow />, { x: 180, y: 60 }, { width: 950, height: 650 }, 'ui.app.forms')
  }

  const openAllAppsWindow = (initialView: AllAppsView = "browse") => {
    const allAppsWindow = windows.find((entry) => entry.id === "all-apps" && entry.isOpen)
    if (allAppsWindow) {
      window.dispatchEvent(
        new CustomEvent<{ view: AllAppsView }>(ALL_APPS_SET_VIEW_EVENT, {
          detail: { view: initialView },
        }),
      )

      if (allAppsWindow.isMinimized) {
        restoreWindow("all-apps")
      } else {
        focusWindow("all-apps")
      }

      return
    }

    openWindow(
      "all-apps",
      "All Applications",
      <AllAppsWindow initialView={initialView} />,
      { x: 90, y: 50 },
      { width: 1320, height: 780 },
      'ui.app.all_applications'
    )
  }

  const openCRMWindow = () => {
    openWindow("crm", "CRM", <CRMWindow />, { x: 190, y: 50 }, { width: 1100, height: 700 }, 'ui.app.crm')
  }

  const openInvoicingWindow = () => {
    openWindow("invoicing", "Invoicing", <InvoicingWindow />, { x: 200, y: 55 }, { width: 950, height: 650 }, 'ui.app.invoicing')
  }

  const openWorkflowsWindow = () => {
    openWindow("workflows", "Workflows", <WorkflowsWindow />, { x: 210, y: 60 }, { width: 1200, height: 750 }, 'ui.app.workflows')
  }

  const openTemplatesWindow = () => {
    openWindow("templates", "Templates", <TemplatesWindow />, { x: 220, y: 65 }, { width: 1100, height: 700 }, 'ui.app.templates')
  }

  const openVoiceAssistantWindow = (windowId: VoiceAssistantWindowId) => {
    const windowContract = getVoiceAssistantWindowContract(windowId)
    const component = windowId === "brain-voice" ? <BrainWindow initialMode="learn" /> : <AIChatWindow />

    openWindow(
      windowContract.windowId,
      windowContract.title,
      component,
      windowContract.position,
      windowContract.size,
      windowContract.titleKey,
      windowContract.iconId,
    )
  }

  const openAIAssistantWindow = () => {
    openVoiceAssistantWindow("ai-assistant")
  }

  const openBrainVoiceWindow = () => {
    openVoiceAssistantWindow("brain-voice")
  }

  const openStoreWindow = () => {
    openWindow("store", "l4yercak3 Store", <StoreWindow />, { x: 150, y: 80 }, { width: 900, height: 650 }, 'ui.start_menu.store')
  }

  const openProjectsWindow = () => {
    openWindow("projects", "Projects", <ProjectsWindow />, { x: 240, y: 75 }, { width: 1000, height: 700 }, 'ui.app.projects')
  }

  const openComplianceWindow = () => {
    openWindow("compliance", "Compliance", <ComplianceWindow />, { x: 150, y: 100 }, { width: 900, height: 600 }, 'ui.app.compliance')
  }

  const openBenefitsWindow = () => {
    openWindow("benefits", "Benefits", <BenefitsWindow />, { x: 150, y: 100 }, { width: 1100, height: 700 }, 'ui.app.benefits')
  }

  const openBookingWindow = () => {
    openWindow("booking", "Booking", <BookingWindow />, { x: 150, y: 100 }, { width: 1100, height: 700 }, 'ui.app.booking')
  }

  const openFinderWindow = () => {
    openWindow("finder", "Finder", <FinderWindow />, { x: 100, y: 60 }, { width: 1200, height: 800 }, 'ui.windows.finder.title')
  }

  const openTextEditorWindow = useCallback((request?: TextEditorOpenRequestDetail) => {
    openWindow("text-editor", "Text Editor", <TextEditorWindow />, { x: 130, y: 70 }, { width: 1100, height: 740 }, undefined, "text-editor")
    const file = request?.file
    if (file) {
      window.setTimeout(() => {
        dispatchTextEditorCommand({
          type: "open-file",
          file,
        })
      }, 0)
    }
  }, [openWindow])

  const openTerminalWindow = () => {
    openWindow("terminal", "Terminal", <TerminalWindow />, { x: 120, y: 80 }, { width: 900, height: 550 })
  }

  const openBuilderBrowserWindow = () => {
    openWindow("builder", "Builder", <BuilderBrowserWindow />, { x: 80, y: 40 }, { width: 1100, height: 750 })
  }

  const openAgentsBrowserWindow = () => {
    openWindow("agents-browser", "AI Agents", <AgentsWindow />, { x: 100, y: 50 }, { width: 1100, height: 750 })
  }

  const openLayersBrowserWindow = () => {
    openWindow("layers", "Layers", <LayersBrowserWindow />, { x: 120, y: 60 }, { width: 1100, height: 750 })
  }

  const openOrganizationSwitcherWindow = () => {
    const centerX = typeof window !== 'undefined' ? (window.innerWidth - 400) / 2 : 300;
    const centerY = typeof window !== 'undefined' ? (window.innerHeight - 400) / 2 : 150;
    openWindow("organization-switcher", "Switch Organization", <OrganizationSwitcherWindow />, { x: centerX, y: centerY }, { width: 400, height: 400 }, 'ui.start_menu.organizations')
  }

  const openIntegrationsWindow = (initialPanel?: "api-keys" | "microsoft") => {
    console.log('[HomePage] Opening Integrations window with panel:', initialPanel);
    openWindow(
      "integrations",
      "Integrations & API",
      <IntegrationsWindow initialPanel={initialPanel} />,
      { x: 150, y: 100 },
      { width: 900, height: 650 },
      'ui.windows.integrations.title',
      "integrations"
    );
  };

  // Preserved for future tutorial access from desktop icons
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openTutorialWindow = (tutorialId: string) => {
    // Define action handler
    const handleTutorialAction = (action: string) => {
      console.log('[HomePage] Tutorial action received:', action);
      if (action === "view_api_keys") {
        console.log('[HomePage] Handling view_api_keys action');
        openIntegrationsWindow("api-keys");
        // Bring the integrations window to front
        setTimeout(() => focusWindow("integrations"), 50);
      } else if (action === "view_templates") {
        openTemplatesWindow();
        setTimeout(() => focusWindow("templates"), 50);
      } else if (action === "open_crm") {
        openCRMWindow();
        setTimeout(() => focusWindow("crm"), 50);
      } else if (action === "open_projects") {
        openProjectsWindow();
        setTimeout(() => focusWindow("projects"), 50);
      } else if (action === "open_invoicing") {
        openInvoicingWindow();
        setTimeout(() => focusWindow("invoicing"), 50);
      }
    };

    // Pass component via registry, callbacks via props (won't persist but will work in current session)
    openWindow(
      `tutorial-${tutorialId}`,
      "Tutorial",
      <TutorialWindow
        tutorialId={tutorialId}
        onClose={() => {}}
        onAction={handleTutorialAction}
      />,
      { x: 250, y: 80 },
      { width: 800, height: 650 },
      undefined,
      "tutorial-welcome",
      {
        tutorialId,
        onAction: handleTutorialAction,
        onClose: () => {}
      }
    );
  };

  // Preserved for desktop docs navigation entry point
  const openTutorialsDocsWindow = (initialItem?: string) => {
    openWindow(
      "tutorials-docs",
      "Tutorials & Docs",
      <TutorialsDocsWindow initialSection="tutorials" initialItem={initialItem} />,
      { x: 100, y: 60 },
      { width: 1000, height: 700 },
      'ui.windows.tutorials_docs.title',
      "tutorials-docs"
    );
  };

  const handleLogout = () => {
    signOut()
  }

  // Track if we've already opened a window on mount
  const [hasOpenedInitialWindow, setHasOpenedInitialWindow] = useState(false);

  const replaceUrlWithParams = (params: URLSearchParams) => {
    const url = window.location.pathname + (params.toString() ? `?${params.toString()}` : "")
    window.history.replaceState({}, "", url)
  }

  const removeShellStateFromCurrentUrl = (includeUpgradeKeys: boolean = true) => {
    const nextParams = stripShellQueryParams(new URLSearchParams(window.location.search), { includeUpgradeKeys })
    replaceUrlWithParams(nextParams)
  }

  useEffect(() => {
    if (!isMobileShellFallback) {
      return
    }

    const openMobileWindows = windows.filter((window) => window.isOpen && !window.isClosing)
    if (openMobileWindows.length <= 1) {
      return
    }

    const activeWindow = openMobileWindows.reduce((current, candidate) => {
      if (!current || candidate.zIndex > current.zIndex) {
        return candidate
      }
      return current
    }, undefined as (typeof openMobileWindows)[number] | undefined)

    openMobileWindows.forEach((window) => {
      if (window.id !== activeWindow?.id) {
        closeWindow(window.id)
      }
    })
  }, [closeWindow, isMobileShellFallback, windows])

  // Open welcome/login window or tutorial on mount based on auth status
  useEffect(() => {
    // Wait for window manager to finish restoring from sessionStorage
    if (!isRestored) {
      return;
    }

    // Only run once
    if (hasOpenedInitialWindow || isMobileShellFallback) {
      return;
    }

    // Not signed in: Show login window
    if (!isSignedIn) {
      const params = new URLSearchParams(window.location.search);
      const openLogin = params.get('openLogin');
      const shellDeepLink = parseShellUrlState(params);

      if (shellDeepLink.app === "ai-assistant") {
        openAIAssistantWindow();
        setHasOpenedInitialWindow(true);
        replaceUrlWithParams(stripShellQueryParams(params));
        return;
      }

      if (openLogin === 'builder') {
        // Clean up the URL
        window.history.replaceState({}, '', window.location.pathname);
      }

      openLoginWindow();
      setHasOpenedInitialWindow(true);
      return;
    }

    // Signed in but no organization yet: Wait for org to load
    if (!currentOrg) {
      return;
    }

    // Signed in with org: Wait for tutorial progress query to complete
    // tutorialProgress will be undefined while loading
    if (tutorialProgress === undefined) {
      return; // Still loading, wait
    }

    // Now we know: isSignedIn=true, currentOrg exists, tutorialProgress loaded
    // Show welcome window for all signed-in users
    openWelcomeWindow();
    setHasOpenedInitialWindow(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileShellFallback, isSignedIn, currentOrg, tutorialProgress, hasOpenedInitialWindow, isRestored])

  // Handle return from OAuth callbacks (Microsoft, etc.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shellDeepLink = parseShellUrlState(params);
    const isLegacyManageCallback = isLegacyManageOAuthCallback(params)

    // Handle manage window with specific tab (e.g., from OAuth callback)
    if (isLegacyManageCallback && shellDeepLink.app === "manage" && shellDeepLink.panel === "integrations" && isSignedIn) {
      // Import ManageWindow component dynamically
      import('@/components/window-content/org-owner-manage-window').then((module) => {
        const ManageWindow = module.ManageWindow;
        const integrationsTab: ComponentProps<typeof ManageWindow>["initialTab"] = "integrations";
        openWindow(
          "manage",
          "Manage",
          <ManageWindow initialTab={integrationsTab} />,
          { x: 200, y: 50 },
          { width: 1200, height: 700 }
        );
      });

      // Don't clean up URL yet - IntegrationsTab needs the success/error params
      // It will clean them up after showing the notification
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Handle generic window opening via URL parameters
  // Canonical: ?app=<window-id>&panel=<panel-id>&entity=<id>&context=<source>
  // Legacy aliases remain supported: ?openWindow=... and ?window=...&tab=...
  // This enables deep linking to any registered window from CLI or external links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shellDeepLink = parseShellUrlState(params);
    const openWindowParam = shellDeepLink.app;
    const upgradeReason = params.get('upgradeReason');
    const upgradeResource = params.get('upgradeResource');

    // Preserve legacy OAuth callback flow so integrations tab can handle success/error params.
    if (isLegacyManageOAuthCallback(params)) {
      return;
    }

    // Skip if no app param. Keep a small guest-allowed deep-link set for mobile fallback and onboarding.
    if (!openWindowParam) return;
    const guestAllowed = GUEST_DEEPLINK_ALLOWED_APPS.has(openWindowParam);

    // Avoid dropping auth-required deep links while auth session hydration is still in flight.
    if (!guestAllowed && authLoading) {
      // Unknown window ids should still be cleaned promptly, even while auth hydration is pending.
      import('@/hooks/window-registry')
        .then(({ WINDOW_REGISTRY }) => {
          if (!WINDOW_REGISTRY[openWindowParam]) {
            console.warn('[HomePage] Unknown window ID in URL param during auth loading:', openWindowParam);
            removeShellStateFromCurrentUrl();
          }
        })
        .catch(() => {
          removeShellStateFromCurrentUrl();
        });
      return;
    }

    if (!isSignedIn && !guestAllowed) {
      removeShellStateFromCurrentUrl();
      return;
    }

    const resolvedDeepLink = shellDeepLink;
    const resolvedWindowId = openWindowParam;
    const resolvedUpgradeReason = upgradeReason;
    const resolvedUpgradeResource = upgradeResource;

    // Clear shell params immediately to avoid stale deep-link state during lazy imports.
    removeShellStateFromCurrentUrl();

    // Import window registry to check if window exists.
    import('@/hooks/window-registry').then(({ WINDOW_REGISTRY }) => {
      const windowConfig = WINDOW_REGISTRY[resolvedWindowId];

      if (windowConfig) {
        const shellProps = buildShellWindowProps(resolvedDeepLink);
        const props = shellProps
          ? {
              ...shellProps,
              // Force remount for repeated deep-link opens against an already-open window.
              deepLinkNonce: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            }
          : undefined;
        const panelParam = resolvedDeepLink.panel;

        // Log for debugging
        console.log('[HomePage] Opening window via URL param:', {
          windowId: resolvedWindowId,
          panel: panelParam,
          entity: resolvedDeepLink.entity,
          context: resolvedDeepLink.context,
          props
        });

        // Get default config from registry
        const { defaultConfig } = windowConfig;

        // Create the component with props
        const component = windowConfig.createComponent(props);

        // Open the window
        openWindow(
          resolvedWindowId,
          defaultConfig.title,
          component,
          defaultConfig.position,
          defaultConfig.size,
          defaultConfig.titleKey,
          defaultConfig.icon,
          props
        );

        // Prevent initial window effect from opening another window
        setHasOpenedInitialWindow(true);

        // Log upgrade context for analytics (if present)
        if (resolvedUpgradeReason || resolvedUpgradeResource) {
          console.log('[HomePage] CLI upgrade redirect:', { upgradeReason: resolvedUpgradeReason, upgradeResource: resolvedUpgradeResource });
        }
      } else {
        console.warn('[HomePage] Unknown window ID in URL param:', resolvedWindowId);
      }
    }).catch((error) => {
      console.error('[HomePage] Failed to resolve window registry for URL deep-link:', error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, authLoading])

  // Handle OAuth callback and checkout success/failure redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionToken = params.get('session');
    const isNewUser = params.get('isNewUser');
    const checkoutParam = params.get('checkout');
    const reasonParam = params.get('reason');
    const oauthProvider = params.get('oauthProvider');
    const identityClaimToken = params.get("identityClaimToken");
    const onboardingChannel = params.get("onboardingChannel");
    const onboardingCampaign = {
      source: params.get("utm_source") || params.get("utmSource") || undefined,
      medium: params.get("utm_medium") || params.get("utmMedium") || undefined,
      campaign: params.get("utm_campaign") || params.get("utmCampaign") || undefined,
      content: params.get("utm_content") || params.get("utmContent") || undefined,
      term: params.get("utm_term") || params.get("utmTerm") || undefined,
      referrer: params.get("referrer") || undefined,
      landingPath: params.get("landingPath") || undefined,
    };
    const hasOnboardingCampaign = Object.values(onboardingCampaign).some(
      (value) => typeof value === "string" && value.length > 0
    );

    if (onboardingChannel || hasOnboardingCampaign) {
      localStorage.setItem(
        "l4yercak3_onboarding_attribution",
        JSON.stringify({
          channel: onboardingChannel || "platform_web",
          campaign: hasOnboardingCampaign ? onboardingCampaign : undefined,
          capturedAt: Date.now(),
        })
      );
    }

    if (identityClaimToken) {
      setNativeGuestClaimToken(identityClaimToken);
    }

    // Handle OAuth callback - store session and provider
    if (sessionToken) {
      localStorage.setItem("convex_session_id", sessionToken);
      if (isNewUser === "true") {
        localStorage.setItem("show_onboarding_tutorial", "true");
      }
      if (oauthProvider && ["microsoft", "google", "github"].includes(oauthProvider)) {
        localStorage.setItem("l4yercak3_last_oauth_provider", oauthProvider);
      }
      // Clean up the URL (remove query params)
      window.history.replaceState({}, '', window.location.pathname);
      // Reload to ensure auth context picks up the new session
      window.location.reload();
      return; // Exit early to prevent other handlers from running
    }

    // Store OAuth provider for "last used" tracking (if not from session callback)
    if (oauthProvider && ["microsoft", "google", "github"].includes(oauthProvider)) {
      localStorage.setItem("l4yercak3_last_oauth_provider", oauthProvider);
    }

    // New purchase result URL scheme: ?purchase=success&type=plan&tier=pro&period=monthly
    // or ?purchase=success&type=credits&amount=10000&credits=1100
    const purchaseParam = params.get('purchase');
    const purchaseType = params.get('type');

    if (purchaseParam === 'success' && purchaseType) {
      const props: PurchaseResultWindowProps = {
        status: "success",
        type: purchaseType as PurchaseResultWindowProps["type"],
        tier: params.get('tier') || undefined,
        period: params.get('period') || undefined,
        amount: params.get('amount') ? parseInt(params.get('amount')!, 10) : undefined,
        credits: params.get('credits') ? parseInt(params.get('credits')!, 10) : undefined,
      };
      openPurchaseResultWindow(props);
      setHasOpenedInitialWindow(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (purchaseParam === 'canceled') {
      openPurchaseResultWindow({
        status: "canceled",
        type: (purchaseType as PurchaseResultWindowProps["type"]) || "plan",
      });
      setHasOpenedInitialWindow(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (checkoutParam === 'success') {
      // Legacy: backward compatibility for old ?checkout= params
      openCheckoutSuccessWindow();
      setHasOpenedInitialWindow(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (checkoutParam === 'cancel' || checkoutParam === 'failed') {
      // Legacy: backward compatibility for old ?checkout= params
      openCheckoutFailedWindow(reasonParam || checkoutParam);
      setHasOpenedInitialWindow(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (oauthProvider || identityClaimToken) {
      // Clean up OAuth provider from URL after storing
      const newParams = new URLSearchParams(params);
      newParams.delete('oauthProvider');
      newParams.delete("identityClaimToken");
      newParams.delete("onboardingChannel");
      newParams.delete("utm_source");
      newParams.delete("utmSource");
      newParams.delete("utm_medium");
      newParams.delete("utmMedium");
      newParams.delete("utm_campaign");
      newParams.delete("utmCampaign");
      newParams.delete("utm_content");
      newParams.delete("utmContent");
      newParams.delete("utm_term");
      newParams.delete("utmTerm");
      newParams.delete("referrer");
      newParams.delete("landingPath");
      const newUrl = window.location.pathname + (newParams.toString() ? `?${newParams.toString()}` : '');
      window.history.replaceState({}, '', newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle post-auth redirect (e.g., return to /builder after login)
  useEffect(() => {
    if (!isSignedIn) return;
    const returnUrl = sessionStorage.getItem("auth_return_url");
    if (returnUrl) {
      sessionStorage.removeItem("auth_return_url");
      window.location.href = returnUrl;
    }
  }, [isSignedIn]);

  useEffect(() => {
    const handleTextEditorRequest = (event: Event) => {
      const detail = (event as CustomEvent<TextEditorOpenRequestDetail>).detail;
      openTextEditorWindow(detail)
    }

    window.addEventListener(TEXT_EDITOR_OPEN_REQUEST_EVENT, handleTextEditorRequest as EventListener)
    return () => {
      window.removeEventListener(TEXT_EDITOR_OPEN_REQUEST_EVENT, handleTextEditorRequest as EventListener)
    }
  }, [openTextEditorWindow])

  // Handle onboarding after signup - clear the flag (no longer used)
  useEffect(() => {
    // Check for onboarding flag from signup and clear it
    const showOnboarding = localStorage.getItem("show_onboarding_tutorial");
    if (showOnboarding === "true") {
      localStorage.removeItem("show_onboarding_tutorial");
    }
  }, [])

  // Build organization submenu items dynamically with truncation
  const truncateOrgName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength) + '...';
  };

  // Filter to only show active organizations in navigation menus
  const activeOrganizations = organizations.filter(org => org.isActive);

  // Helper to require authentication for actions
  const requireAuth = (action: () => void) => {
    return () => {
      if (!isSignedIn) {
        openLoginWindow()
      } else {
        action()
      }
    }
  }

  const routeToShellState = (state: {
    app: string
    panel?: string
    entity?: string
    context?: string
  }) => {
    const nextUrl = serializeShellUrlState(state, window.location.pathname)
    window.location.assign(nextUrl)
  }

  type ProductAppMetadata = {
    code?: string;
    name?: string;
    icon?: string;
    releaseStage?: string;
  };

  const availableAppMetadataByCode = useMemo(() => {
    const byCode = new Map<string, ProductAppMetadata>();
    (availableApps as ProductAppMetadata[]).forEach((app) => {
      if (app?.code) {
        byCode.set(app.code, app);
      }
    });
    return byCode;
  }, [availableApps]);

  const resolveProductLabel = (code: string, fallbackName?: string) => {
    const catalogEntry = PRODUCT_OS_CATALOG_BY_CODE.get(code);
    if (catalogEntry?.translationKey) {
      return tx(catalogEntry.translationKey, catalogEntry.displayName ?? fallbackName ?? code);
    }
    return catalogEntry?.displayName ?? fallbackName ?? code;
  };

  const productAppActions: Record<string, () => void> = {
    "ai-assistant": openAIAssistantWindow,
    "brain-voice": requireAuth(openBrainVoiceWindow),
    "agents-browser": requireAuth(openAgentsBrowserWindow),
    "webchat-deployment": requireAuth(openWebchatDeploymentWindow),
    builder: requireAuth(openBuilderBrowserWindow),
    layers: requireAuth(openLayersBrowserWindow),
    finder: requireAuth(openFinderWindow),
    "text-editor": requireAuth(() => openTextEditorWindow()),
    terminal: requireAuth(openTerminalWindow),
    crm: requireAuth(openCRMWindow),
    projects: requireAuth(openProjectsWindow),
    events: requireAuth(openEventsWindow),
    payments: requireAuth(openPaymentsWindow),
    benefits: requireAuth(openBenefitsWindow),
    products: requireAuth(openProductsWindow),
    app_invoicing: requireAuth(openInvoicingWindow),
    checkout: requireAuth(openCheckoutAppWindow),
    tickets: requireAuth(openTicketsWindow),
    certificates: requireAuth(openCertificatesWindow),
    booking: requireAuth(openBookingWindow),
    workflows: requireAuth(openWorkflowsWindow),
    "web-publishing": requireAuth(openWebPublishingWindow),
    forms: requireAuth(openFormsWindow),
    templates: requireAuth(openTemplatesWindow),
    "media-library": requireAuth(openMediaLibraryWindow),
    integrations: requireAuth(() => openIntegrationsWindow()),
  };

  const PRODUCT_MENU_ITEM_ID_OVERRIDES: Record<string, string> = {
    "popular:text-editor": "popular-text-editor",
    "category-utilities-tools:text-editor": "utilities-text-editor",
  };

  const buildProductMenuItem = (code: string, prefix: string): TopNavMenuItem | null => {
    const onSelect = productAppActions[code];
    if (!onSelect) {
      return null;
    }

    const metadata = availableAppMetadataByCode.get(code);
    const catalogEntry = PRODUCT_OS_CATALOG_BY_CODE.get(code);
    const releaseStage = normalizeProductOSReleaseStage(
      metadata?.releaseStage ?? catalogEntry?.releaseStage ?? "none",
    );
    const badgeLabel = getProductOSBadgeLabel(releaseStage);
    const badgeTranslationKey = getProductOSBadgeTranslationKey(releaseStage);
    const localizedBadge = badgeTranslationKey && badgeLabel
      ? tx(badgeTranslationKey, badgeLabel)
      : undefined;
    const menuItemId = PRODUCT_MENU_ITEM_ID_OVERRIDES[`${prefix}:${code}`] ?? `${prefix}-${code}`;

    return {
      id: menuItemId,
      label: resolveProductLabel(code, metadata?.name),
      onSelect,
      icon: getProductAppIconByCode(code, metadata?.icon, 16),
      shortcut: localizedBadge,
    };
  };

  const discoverableCodes = PRODUCT_OS_CATALOG
    .map((entry) => entry.code)
    .filter((code) => Boolean(productAppActions[code]));

  const popularChildren = PRODUCT_OS_POPULAR_CODES
    .map((code) => buildProductMenuItem(code, "popular"))
    .filter((item) => item !== null) as TopNavMenuItem[];

  const newChildren = PRODUCT_OS_NEW_CODES
    .map((code) => buildProductMenuItem(code, "new"))
    .filter((item) => item !== null) as TopNavMenuItem[];

  const categoryMenuSections = PRODUCT_OS_CATEGORIES
    .map((category) => {
      const categoryPrefix = `category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const categoryCodes = PRODUCT_OS_CATALOG
        .filter((entry) => entry.category === category)
        .map((entry) => entry.code)
        .filter((code) => Boolean(productAppActions[code]));

      if (categoryCodes.length === 0) {
        return null;
      }

      const children = categoryCodes
        .map((code) => buildProductMenuItem(code, categoryPrefix))
        .filter((item) => item !== null) as TopNavMenuItem[];
      const categoryLabel = tx(getProductOSCategoryTranslationKey(category), category);

      return {
        id: categoryPrefix,
        label: tx("ui.product_os.menu.category_count", "{category} ({count})", {
          category: categoryLabel,
          count: children.length,
        }),
        icon: getWindowIconById(PRODUCT_OS_CATEGORY_ICON_ID[category], undefined, 16),
        submenu: true,
        children,
      } satisfies TopNavMenuItem;
    })
    .filter((item) => item !== null) as TopNavMenuItem[];

  const productMenuItems: TopNavMenuItem[] = [
    {
      id: "browse-all-apps",
      label: tx("ui.product_os.menu.browse_all_apps", "Browse all apps ({count})", {
        count: discoverableCodes.length,
      }),
      onSelect: requireAuth(() => openAllAppsWindow("browse")),
      icon: <ShellGridIcon size={16} tone="muted" />,
    },
    {
      id: "search-apps",
      label: tx("ui.product_os.menu.search_apps", "Search apps"),
      onSelect: requireAuth(() => openAllAppsWindow("search")),
      icon: <ShellFinderIcon size={16} tone="muted" />,
    },
    { id: "divider-main", divider: true },
    {
      id: "popular-products",
      label: tx("ui.product_os.menu.popular_products", "Popular products ({count})", {
        count: popularChildren.length,
      }),
      icon: getWindowIconById("ai-assistant", undefined, 16),
      submenu: true,
      children: popularChildren,
    },
    {
      id: "new-products",
      label: tx("ui.product_os.menu.new_products", "New products ({count})", {
        count: newChildren.length,
      }),
      icon: getWindowIconById("benefits", undefined, 16),
      submenu: true,
      children: newChildren,
    },
    { id: "divider-categories", divider: true },
    ...categoryMenuSections,
    { id: "divider-roadmap", divider: true },
    {
      id: "product-roadmap",
      label: tx("ui.product_os.menu.roadmap", "Roadmap"),
      onSelect: requireAuth(() => openAllAppsWindow("roadmap")),
      icon: getWindowIconById("web-publishing", undefined, 16),
    },
  ];

  type MobileLauncherActionItem = Exclude<LauncherItem, { divider: true }>;
  const wrapMobileLauncherAction = (action: () => void) => {
    return () => {
      removeShellStateFromCurrentUrl();
      action();
    };
  };

  const mobileProductLauncherItems: MobileLauncherActionItem[] = discoverableCodes
    .map((code): MobileLauncherActionItem | null => {
      const onSelect = productAppActions[code];
      if (!onSelect) {
        return null;
      }

      const metadata = availableAppMetadataByCode.get(code);
      return {
        id: `mobile-app-${code}`,
        label: resolveProductLabel(code, metadata?.name),
        onSelect: wrapMobileLauncherAction(onSelect),
        icon: getProductAppIconByCode(code, metadata?.icon, 16),
      };
    })
    .filter((item): item is MobileLauncherActionItem => item !== null);

  const mobileLauncherItems: LauncherItem[] = [
    {
      id: "mobile-browse-apps",
      label: tx("ui.product_os.menu.browse_all_apps", "Browse all apps"),
      onSelect: wrapMobileLauncherAction(requireAuth(() => openAllAppsWindow("browse"))),
      icon: <ShellGridIcon size={16} tone="muted" />,
    },
    {
      id: "mobile-search-apps",
      label: tx("ui.product_os.menu.search_apps", "Search apps"),
      onSelect: wrapMobileLauncherAction(requireAuth(() => openAllAppsWindow("search"))),
      icon: <ShellFinderIcon size={16} tone="muted" />,
    },
    {
      id: "mobile-store",
      label: t("ui.start_menu.store"),
      onSelect: wrapMobileLauncherAction(openStoreWindow),
      icon: <ShellStoreIcon size={16} tone="muted" />,
    },
    {
      id: "mobile-auth",
      label: isSignedIn ? t("ui.start_menu.log_out") : t("ui.start_menu.log_in"),
      onSelect: wrapMobileLauncherAction(isSignedIn ? handleLogout : openLoginWindow),
      icon: isSignedIn
        ? <ShellLogoutIcon size={16} tone="muted" />
        : <ShellLoginIcon size={16} tone="muted" />,
    },
    {
      id: "mobile-settings",
      label: t("ui.start_menu.settings"),
      onSelect: wrapMobileLauncherAction(requireAuth(openSettingsWindow)),
      icon: <ShellSettingsIcon size={16} tone="muted" />,
    },
    ...(mobileProductLauncherItems.length > 0
      ? [{ id: "mobile-divider-apps", divider: true } as const]
      : []),
    ...mobileProductLauncherItems,
  ];

  const avatarInitialSource = (user?.email || currentOrg?.name || "U").trim()
  const avatarInitial = avatarInitialSource.length > 0 ? avatarInitialSource.charAt(0).toUpperCase() : "U"
  const userAvatarUrl = typeof user?.avatarUrl === "string" && user.avatarUrl.length > 0 ? user.avatarUrl : null
  const openCurrentUserProfile = () =>
    routeToShellState({
      app: "manage",
      panel: "users",
      entity: user?.id ? String(user.id) : "self",
      context: "current-user",
    })
  const organizationSubmenuItems: TopNavMenuItem[] = isSignedIn
    ? [
        ...activeOrganizations.map((org) => ({
          id: `avatar-org-${org.id}`,
          label: truncateOrgName(org.name, 22),
          onSelect: () => {
            if (org.id !== currentOrg?.id) {
              void switchOrganization(org.id)
            }
          },
          icon: <ShellPeopleIcon size={16} tone="muted" />,
          shortcut: currentOrg?.id === org.id ? "Current" : undefined,
        })),
        { id: "avatar-org-divider", divider: true },
        {
          id: "avatar-org-manage",
          label: t("ui.start_menu.organizations"),
          onSelect: openOrganizationSwitcherWindow,
          icon: <ShellSettingsIcon size={16} tone="muted" />,
        },
      ]
    : []

  const languageSubmenuItems: TopNavMenuItem[] = availableLocales.map((localeCode) => ({
    id: `avatar-language-${localeCode}`,
    label: getLocaleLabel(localeCode),
    onSelect: () => setLocale(localeCode),
    icon: <ShellTranslationsIcon size={16} tone="muted" />,
    shortcut: locale === localeCode ? "Current" : undefined,
  }))

  const avatarMenuItems: TopNavMenuItem[] = [
    ...(isSignedIn && activeOrganizations.length > 0 ? [{
      id: "avatar-org",
      label: currentOrg ? truncateOrgName(currentOrg.name, 18) : t("ui.start_menu.organizations"),
      icon: <ShellPeopleIcon size={16} tone="muted" />,
      submenu: true,
      children: organizationSubmenuItems,
    }] : []),
    {
      id: "avatar-language",
      label: "Language",
      icon: <ShellTranslationsIcon size={16} tone="muted" />,
      submenu: true,
      children: languageSubmenuItems,
    },
    { id: "avatar-store", label: t("ui.start_menu.store"), onSelect: openStoreWindow, icon: <ShellStoreIcon size={16} tone="muted" /> },
    { id: "avatar-settings", label: t("ui.start_menu.settings"), onSelect: requireAuth(openSettingsWindow), icon: <ShellSettingsIcon size={16} tone="muted" /> },
    {
      id: "avatar-user-profile",
      label: "User Profile",
      onSelect: requireAuth(openCurrentUserProfile),
      icon: <ShellProfileIcon size={16} tone="muted" />,
    },
    { id: "avatar-terminal", label: "Terminal", onSelect: requireAuth(openTerminalWindow), icon: <ShellTerminalIcon size={16} tone="muted" /> },
    { id: "avatar-divider-auth", divider: true },
    {
      id: "avatar-auth",
      label: isSignedIn ? t("ui.start_menu.log_out") : t("ui.start_menu.log_in"),
      onSelect: isSignedIn ? handleLogout : openLoginWindow,
      icon: isSignedIn ? <ShellLogoutIcon size={16} tone="muted" /> : <ShellLoginIcon size={16} tone="muted" />,
    },
  ];

  // Check if user needs beta access approval (block entire app if pending/rejected/none)
  // Super admins bypass this check
  const shouldShowBetaBlock = isSignedIn && betaStatus && !betaStatus.hasAccess && !isSuperAdmin;
  const openDesktopWindows = windows.filter((window) => window.isOpen)
  const visibleWindows = useMemo(() => {
    if (!isMobileShellFallback) {
      return openDesktopWindows
    }

    const activeWindow = openDesktopWindows
      .filter((window) => !window.isClosing)
      .reduce((current, candidate) => {
        if (!current || candidate.zIndex > current.zIndex) {
          return candidate
        }
        return current
      }, undefined as (typeof openDesktopWindows)[number] | undefined)

    return activeWindow ? [activeWindow] : []
  }, [isMobileShellFallback, openDesktopWindows])

  // If user needs beta approval, show the waiting screen instead of the normal UI
  if (shouldShowBetaBlock) {
    return (
      <WaitingForApprovalScreen
        status={betaStatus.status as "pending" | "rejected" | "none"}
        requestedAt={betaStatus.requestedAt}
        rejectionReason={betaStatus.rejectionReason}
        userEmail={user?.email || ""}
      />
    );
  }

  return (
    <div className="min-h-screen relative" style={{
      background: desktopBackground
        ? `url(${desktopBackground}) center/cover no-repeat`
        : 'var(--background)'
    }}>
      {/* Desktop Background Pattern - Win95 style (only show if no custom background) */}
      {!desktopBackground && (
        <div className="absolute inset-0 opacity-10" style={{ zIndex: 0 }}>
          <div className="grid grid-cols-20 grid-rows-20 h-full w-full">
            {Array.from({ length: 400 }).map((_, i) => (
              <div key={i} className="border" style={{ borderColor: 'var(--desktop-grid-overlay)' }}></div>
            ))}
          </div>
        </div>
      )}

      <ClientOnly>

      {/* Desktop Icons */}
      <div className={isMobileShellFallback ? "desktop-grid-mobile" : "absolute left-4 top-[calc(var(--taskbar-height,48px)+12px)] space-y-4 z-10 desktop-only"}>
        {/* <DesktopIcon icon="episodes" label="Episodes" onClick={openEpisodesWindow} /> */}
        {/* <DesktopIcon icon="about" label="About" onClick={openAboutWindow} /> */}
      </div>


      {visibleWindows.map((window) => (
        <FloatingWindow
          key={window.id}
          id={window.id}
          title={window.title}
          initialPosition={window.position}
          zIndex={window.zIndex}
        >
          {window.component}
        </FloatingWindow>
      ))}

      {!isMobileShellFallback ? (
        <header
          className="fixed top-0 left-0 right-0 desktop-shell-window desktop-taskbar px-2 py-1"
          style={{ zIndex: 9999, borderTopLeftRadius: 0, borderTopRightRadius: 0, overflow: "visible" }}
        >
          <div className="flex min-w-0 items-center">
            <div className="flex items-center gap-1 pr-2">
              <TopNavMenu label={tx("ui.product_os.title", "Product OS")} items={productMenuItems} />
            </div>

	            <div className="mx-2 flex min-w-0 flex-1 gap-1 overflow-x-auto">
	              {openDesktopWindows.map((window) => {
                const displayTitle = window.titleKey ? t(window.titleKey) : window.title;
                return (
                  <button
                    key={window.id}
                    className={`desktop-window-tab px-3 py-1 text-xs font-medium truncate max-w-[220px] transition-all ${
                      !window.isMinimized ? 'desktop-window-tab-active' : ''
                    }`}
                    data-testid={`desktop-window-tab-${window.id}`}
                    onClick={() => {
                      if (window.isMinimized) {
                        restoreWindow(window.id)
                      } else {
                        focusWindow(window.id)
                      }
                    }}
                    title={displayTitle}
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex h-4 w-4 items-center justify-center">
                        {getWindowIconById(window.id, window.icon, 16)}
                      </span>
                      <span className="truncate">{displayTitle}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 pl-2">
              {isSignedIn && (
                <ShoppingCartButton onOpenCart={openPlatformCartWindow} />
              )}

              {isSignedIn && isAppAvailable("ai-assistant") && (
                <button
                  className="desktop-taskbar-action border-l-2 px-3 py-1 flex items-center gap-2 transition-colors"
                  onClick={openAIAssistantWindow}
                  title="Open AI Assistant"
                >
                  <ShellBotIcon size={18} tone="active" />
                </button>
              )}

              {isSignedIn && deletionStatus.isScheduledForDeletion && (
                <div
                  className="desktop-taskbar-warning border-l-2 px-3 py-1 flex items-center gap-2 cursor-pointer transition-colors"
                  onClick={openSettingsWindow}
                  title={`Account scheduled for deletion on ${deletionStatus.deletionDate?.toLocaleDateString()}. Click to restore.`}
                >
                  <ShellWarningIcon size={18} tone="danger" className="animate-pulse" />
                  <span className="text-[10px] font-pixel" style={{ color: 'var(--error-red)' }}>
                    {deletionStatus.daysRemaining === 1
                      ? '1 DAY'
                      : `${deletionStatus.daysRemaining} DAYS`}
                  </span>
                </div>
              )}

              {isSuperAdmin && (
                <div className={`${!isSignedIn ? 'ml-auto ' : ''}desktop-taskbar-action border-l-2 px-3 py-1 flex items-center gap-2`}>
                  <ShellShieldIcon size={16} tone="active" />
                  <span className="text-xs font-medium tracking-[0.04em]">ADMIN</span>
                </div>
              )}

              <button
                className="desktop-taskbar-action border-l-2 px-3 py-1 flex items-center gap-2 transition-colors"
                onClick={handleAppearanceToggle}
                title={isDarkAppearance ? "Switch to Sepia Mode" : "Switch to Dark Mode"}
              >
                {isDarkAppearance ? <ShellMoonIcon size={16} tone="active" /> : <ShellSepiaIcon size={16} tone="active" />}
              </button>

              <TopNavMenu
                label={(
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    {userAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={userAvatarUrl}
                        alt="User avatar"
                        className="h-5 w-5 rounded-full border border-[var(--window-shell-border)] object-cover"
                      />
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--window-shell-border)] bg-[var(--window-document-bg-elevated)] text-[10px] font-semibold leading-none">
                        {avatarInitial}
                      </span>
                    )}
                    <span className="flex h-4 w-4 items-center justify-center">
                      <ShellProfileIcon size={14} tone="active" />
                    </span>
                  </span>
                )}
                items={avatarMenuItems}
                align="right"
                submenuDirection="left"
                menuLabel="Avatar"
                triggerAriaLabel="Open avatar menu"
                className="shrink-0"
                buttonClassName="desktop-taskbar-action border-l-2 px-3 py-1 shrink-0 relative z-10"
              />
            </div>
          </div>
        </header>
      ) : (
        <footer
          className="fixed bottom-0 left-0 right-0 desktop-shell-window desktop-taskbar px-4 py-2"
          style={{
            zIndex: 65000,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            overflow: "visible",
            paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))",
          }}
	        >
	          <div className="flex items-center gap-2">
	            <WindowsMenu
	              windows={openDesktopWindows}
	              launcherItems={mobileLauncherItems}
	              buttonLabel="Apps"
	              onWindowClick={(id) => {
	                const window = windows.find((entry) => entry.id === id)
	                if (window?.isMinimized) {
	                  restoreWindow(id)
	                } else {
	                  focusWindow(id)
	                }
	              }}
	            />

            {isSignedIn && isAppAvailable("ai-assistant") && (
              <button
                className="desktop-taskbar-action border-l-2 px-3 py-1 flex items-center gap-2 transition-colors"
                onClick={openAIAssistantWindow}
                title="Open AI Assistant"
              >
                <ShellBotIcon size={18} tone="active" />
              </button>
            )}

            <button
              className={`${!isSuperAdmin ? 'ml-auto' : ''} desktop-taskbar-action border-l-2 px-3 py-1 flex items-center gap-2 transition-colors`}
              onClick={handleAppearanceToggle}
              title={isDarkAppearance ? "Switch to Sepia Mode" : "Switch to Dark Mode"}
            >
              {isDarkAppearance ? <ShellMoonIcon size={16} tone="active" /> : <ShellSepiaIcon size={16} tone="active" />}
            </button>

            {isSuperAdmin && (
              <div className="desktop-taskbar-action border-l-2 px-3 py-1 flex items-center gap-2">
                <ShellShieldIcon size={16} tone="active" />
              </div>
            )}
          </div>
        </footer>
      )}
      </ClientOnly>
    </div>
  )
}
