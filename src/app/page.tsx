"use client"

import { useState, useEffect } from "react"
import { ClientOnly } from "@/components/client-only"
import { SystemClock } from "@/components/system-clock"
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
import { AllAppsWindow } from "@/components/window-content/all-apps-window"
import { ShoppingCartButton } from "@/components/shopping-cart-button"
import { CRMWindow } from "@/components/window-content/crm-window"
import { InvoicingWindow } from "@/components/window-content/invoicing-window"
import { WorkflowsWindow } from "@/components/window-content/workflows-window"
import { TemplatesWindow } from "@/components/window-content/templates-window"
import { AIChatWindow } from "@/components/window-content/ai-chat-window"
import { StoreWindow } from "@/components/window-content/store-window"
import { ProjectsWindow } from "@/components/window-content/projects-window"
import { WindowsMenu } from "@/components/windows-menu"
import { TopNavMenu, type TopNavMenuItem } from "@/components/taskbar/top-nav-menu"
import { TutorialWindow } from "@/components/window-content/tutorial-window"
import { TutorialsDocsWindow } from "@/components/window-content/tutorials-docs-window"
import { IntegrationsWindow } from "@/components/window-content/integrations-window"
import { ComplianceWindow } from "@/components/window-content/compliance-window"
import { OrganizationSwitcherWindow } from "@/components/window-content/organization-switcher-window"
import { BenefitsWindow } from "@/components/window-content/benefits-window"
import { BookingWindow } from "@/components/window-content/booking-window"
import { BrainWindow } from "@/components/window-content/brain-window"
import { BuilderBrowserWindow } from "@/components/window-content/builder-browser-window"
import { AgentsWindow } from "@/components/window-content/agents-window"
import { LayersBrowserWindow } from "@/components/window-content/layers-browser-window"
import { FinderWindow } from "@/components/window-content/finder-window"
import { TerminalWindow } from "@/components/window-content/terminal-window"
import { WaitingForApprovalScreen } from "@/components/waiting-for-approval-screen"
import { useIsMobile } from "@/hooks/use-media-query"
import { useAuth, useOrganizations, useCurrentOrganization, useIsSuperAdmin, useAccountDeletionStatus } from "@/hooks/use-auth"
import { useAvailableApps } from "@/hooks/use-app-availability"
import { useMultipleNamespaces } from "@/hooks/use-namespace-translations"
import { useAppearance } from "@/contexts/appearance-context"
import {
  getWindowIconById,
  ShellBotIcon,
  ShellBriefcaseIcon,
  ShellClockIcon,
  ShellFinderIcon,
  ShellGridIcon,
  ShellBuilderIcon,
  ShellLoginIcon,
  ShellLogoutIcon,
  ShellMoonIcon,
  ShellPaymentsIcon,
  ShellPeopleIcon,
  ShellSepiaIcon,
  ShellSettingsIcon,
  ShellShieldIcon,
  ShellStoreIcon,
  ShellTerminalIcon,
  ShellWarningIcon,
  ShellWorkflowIcon,
} from "@/components/icons/shell-icons"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"

export default function HomePage() {
  // Load translations for start menu and app names
  const { t } = useMultipleNamespaces(["ui.start_menu", "ui.app", "ui.windows"])
  // Note: locale management is now handled via TranslationContext if needed
  const { windows, openWindow, restoreWindow, focusWindow, isRestored } = useWindowManager()
  const isMobile = useIsMobile()
  const { isSignedIn, signOut, sessionId, user } = useAuth()
  const organizations = useOrganizations()
  const currentOrg = useCurrentOrganization()
  const isSuperAdmin = useIsSuperAdmin()
  const deletionStatus = useAccountDeletionStatus()
  const { mode, toggleMode } = useAppearance()

  const isDarkAppearance = mode === "dark"

  // Toggle top-level appearance between dark and sepia
  const handleAppearanceToggle = () => {
    toggleMode()
  }

  // Use the new hook for app availability
  const { isAppAvailable } = useAvailableApps()

  // Query branding settings for desktop background
  const brandingSettings = useQuery(
    api.organizationOntology.getOrganizationSettings,
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

  const openAllAppsWindow = () => {
    openWindow("all-apps", "All Applications", <AllAppsWindow />, { x: 150, y: 100 }, { width: 870, height: 600 }, 'ui.app.all_applications')
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

  const openAIAssistantWindow = () => {
    openWindow("ai-assistant", "AI Assistant", <AIChatWindow />, { x: 230, y: 70 }, { width: 1400, height: 1200 }, 'ui.app.ai_assistant')
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

  const openBrainWindow = () => {
    openWindow("brain", "Brain", <BrainWindow />, { x: 120, y: 80 }, { width: 1000, height: 700 }, 'ui.windows.brain.title')
  }

  const openFinderWindow = () => {
    openWindow("finder", "Finder", <FinderWindow />, { x: 100, y: 60 }, { width: 1200, height: 800 }, 'ui.windows.finder.title')
  }

  const openTerminalWindow = () => {
    openWindow("terminal", "Terminal", <TerminalWindow />, { x: 120, y: 80 }, { width: 900, height: 550 })
  }

  const openBuilderBrowserWindow = () => {
    openWindow("builder-browser", "AI Builder", <BuilderBrowserWindow />, { x: 80, y: 40 }, { width: 1100, height: 750 })
  }

  const openAgentsBrowserWindow = () => {
    openWindow("agents-browser", "AI Agents", <AgentsWindow />, { x: 100, y: 50 }, { width: 1100, height: 750 })
  }

  const openLayersBrowserWindow = () => {
    openWindow("layers-browser", "Layers", <LayersBrowserWindow />, { x: 120, y: 60 }, { width: 1100, height: 750 })
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

  // Open welcome/login window or tutorial on mount based on auth status
  useEffect(() => {
    // Wait for window manager to finish restoring from sessionStorage
    if (!isRestored) {
      return;
    }

    // Only run once
    if (hasOpenedInitialWindow || isMobile) {
      return;
    }

    // Not signed in: Show login window
    if (!isSignedIn) {
      const params = new URLSearchParams(window.location.search);
      const openLogin = params.get('openLogin');

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
  }, [isMobile, isSignedIn, currentOrg, tutorialProgress, hasOpenedInitialWindow, isRestored])

  // Handle return from OAuth callbacks (Microsoft, etc.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const windowParam = params.get('window');
    const tabParam = params.get('tab');

    // Handle manage window with specific tab (e.g., from OAuth callback)
    if (windowParam === 'manage' && tabParam === 'integrations' && isSignedIn) {
      // Import ManageWindow component dynamically
      import('@/components/window-content/org-owner-manage-window').then((module) => {
        const ManageWindow = module.ManageWindow;
        openWindow(
          "manage",
          "Manage",
          <ManageWindow initialTab="integrations" />,
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
  // Supports: ?openWindow=<window-id>&panel=<panel-id>
  // This enables deep linking to any registered window from CLI or external links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openWindowParam = params.get('openWindow');
    const panelParam = params.get('panel');
    const upgradeReason = params.get('upgradeReason');
    const upgradeResource = params.get('upgradeResource');

    // Skip if no openWindow param or user not signed in
    if (!openWindowParam || !isSignedIn) return;

    // Import window registry to check if window exists
    import('@/hooks/window-registry').then(({ WINDOW_REGISTRY }) => {
      const windowConfig = WINDOW_REGISTRY[openWindowParam];

      if (windowConfig) {
        // Build props object if panel parameter is provided
        const props: Record<string, unknown> = {};
        if (panelParam) {
          // Map panel param to the appropriate prop name based on window type
          // Most windows use 'initialPanel', some use 'initialTab'
          props.initialPanel = panelParam;
          props.initialTab = panelParam; // Some windows may use this
        }

        // Log for debugging
        console.log('[HomePage] Opening window via URL param:', {
          windowId: openWindowParam,
          panel: panelParam,
          props
        });

        // Get default config from registry
        const { defaultConfig } = windowConfig;

        // Create the component with props
        const component = windowConfig.createComponent(Object.keys(props).length > 0 ? props : undefined);

        // Open the window
        openWindow(
          openWindowParam,
          defaultConfig.title,
          component,
          defaultConfig.position,
          defaultConfig.size,
          defaultConfig.titleKey,
          defaultConfig.icon,
          Object.keys(props).length > 0 ? props : undefined
        );

        // Prevent initial window effect from opening another window
        setHasOpenedInitialWindow(true);

        // Log upgrade context for analytics (if present)
        if (upgradeReason || upgradeResource) {
          console.log('[HomePage] CLI upgrade redirect:', { upgradeReason, upgradeResource });
        }

        // Clean up the URL (remove query params)
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        console.warn('[HomePage] Unknown window ID in URL param:', openWindowParam);
        // Still clean up URL for unknown windows
        window.history.replaceState({}, '', window.location.pathname);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn])

  // Handle OAuth callback and checkout success/failure redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionToken = params.get('session');
    const isNewUser = params.get('isNewUser');
    const checkoutParam = params.get('checkout');
    const reasonParam = params.get('reason');
    const oauthProvider = params.get('oauthProvider');

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
    } else if (oauthProvider) {
      // Clean up OAuth provider from URL after storing
      const newParams = new URLSearchParams(params);
      newParams.delete('oauthProvider');
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

  // DEBUG: Log app availability data
  console.log('[DEBUG] App availability:', {
    isSignedIn,
    currentOrg,
    availableApps: {
      'media-library': isAppAvailable("media-library"),
      'payments': isAppAvailable("payments"),
      'products': isAppAvailable("products"),
      'tickets': isAppAvailable("tickets"),
      'events': isAppAvailable("events"),
      'checkout': isAppAvailable("checkout"),
      'forms': isAppAvailable("forms"),
      'web-publishing': isAppAvailable("web-publishing"),
      'crm': isAppAvailable("crm"),
      'app_invoicing': isAppAvailable("app_invoicing"),
      'workflows': isAppAvailable("workflows"),
      'projects': isAppAvailable("projects"),
    }
  });

  const productMenuItems: TopNavMenuItem[] = [
    { id: "browse-all-apps", label: t("ui.app.all_applications"), onSelect: requireAuth(openAllAppsWindow), icon: <ShellGridIcon size={16} tone="muted" /> },
    { id: "divider-main", divider: true },
    { id: "app-ai-assistant", label: t("ui.app.ai_assistant"), onSelect: requireAuth(openAIAssistantWindow), icon: <ShellBotIcon size={16} tone="muted" /> },
    { id: "app-ai-agents", label: "AI Agents", onSelect: requireAuth(openAgentsBrowserWindow), icon: <ShellPeopleIcon size={16} tone="muted" /> },
    { id: "app-ai-builder", label: "AI Builder", onSelect: requireAuth(openBuilderBrowserWindow), icon: <ShellBuilderIcon size={16} tone="muted" /> },
    { id: "app-crm", label: t("ui.app.crm"), onSelect: requireAuth(openCRMWindow), icon: <ShellPeopleIcon size={16} tone="muted" /> },
    { id: "app-projects", label: t("ui.app.projects"), onSelect: requireAuth(openProjectsWindow), icon: <ShellBriefcaseIcon size={16} tone="muted" /> },
    { id: "app-payments", label: t("ui.app.payments"), onSelect: requireAuth(openPaymentsWindow), icon: <ShellPaymentsIcon size={16} tone="muted" /> },
    { id: "app-workflows", label: t("ui.app.workflows"), onSelect: requireAuth(openWorkflowsWindow), icon: <ShellWorkflowIcon size={16} tone="muted" /> },
    { id: "app-finder", label: t("ui.windows.finder.title"), onSelect: requireAuth(openFinderWindow), icon: <ShellFinderIcon size={16} tone="muted" /> },
    { id: "app-terminal", label: "Terminal", onSelect: requireAuth(openTerminalWindow), icon: <ShellTerminalIcon size={16} tone="muted" /> },
  ];

  const moreMenuItems: TopNavMenuItem[] = [
    ...(isSignedIn && activeOrganizations.length > 0 ? [{
      id: "menu-org",
      label: currentOrg ? truncateOrgName(currentOrg.name, 18) : t("ui.start_menu.organizations"),
      onSelect: openOrganizationSwitcherWindow,
      icon: <ShellPeopleIcon size={16} tone="muted" />,
    }] : []),
    { id: "menu-store", label: t("ui.start_menu.store"), onSelect: openStoreWindow, icon: <ShellStoreIcon size={16} tone="muted" /> },
    { id: "menu-settings", label: t("ui.start_menu.settings"), onSelect: requireAuth(openSettingsWindow), icon: <ShellSettingsIcon size={16} tone="muted" /> },
    { id: "menu-terminal", label: "Terminal", onSelect: requireAuth(openTerminalWindow), icon: <ShellTerminalIcon size={16} tone="muted" /> },
    { id: "menu-divider-auth", divider: true },
    {
      id: "menu-auth",
      label: isSignedIn ? t("ui.start_menu.log_out") : t("ui.start_menu.log_in"),
      onSelect: isSignedIn ? handleLogout : openLoginWindow,
      icon: isSignedIn ? <ShellLogoutIcon size={16} tone="muted" /> : <ShellLoginIcon size={16} tone="muted" />,
    },
  ];

  // Check if user needs beta access approval (block entire app if pending/rejected/none)
  // Super admins bypass this check
  const shouldShowBetaBlock = isSignedIn && betaStatus && !betaStatus.hasAccess && !isSuperAdmin;

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
      <div className={isMobile ? "desktop-grid-mobile" : "absolute left-4 top-[calc(var(--taskbar-height,48px)+12px)] space-y-4 z-10 desktop-only"}>
        {/* <DesktopIcon icon="episodes" label="Episodes" onClick={openEpisodesWindow} /> */}
        {/* <DesktopIcon icon="about" label="About" onClick={openAboutWindow} /> */}
      </div>


      {windows.map((window) =>
        window.isOpen ? (
          <FloatingWindow
            key={window.id}
            id={window.id}
            title={window.title}
            initialPosition={window.position}
            zIndex={window.zIndex}
          >
            {window.component}
          </FloatingWindow>
        ) : null,
      )}

      {!isMobile ? (
        <header
          className="fixed top-0 left-0 right-0 retro-window desktop-taskbar px-2 py-1"
          style={{ zIndex: 9999, borderTopLeftRadius: 0, borderTopRightRadius: 0, overflow: "visible" }}
        >
          <div className="flex min-w-0 items-center">
            <div className="flex items-center gap-1 pr-2">
              <TopNavMenu label="Product" items={productMenuItems} />
              <button className="desktop-topbar-link px-2 py-1 text-xs font-semibold" onClick={openStoreWindow}>
                Pricing
              </button>
              <button className="desktop-topbar-link px-2 py-1 text-xs font-semibold" onClick={() => openTutorialsDocsWindow()}>
                Docs
              </button>
              <button className="desktop-topbar-link px-2 py-1 text-xs font-semibold" onClick={requireAuth(openBenefitsWindow)}>
                Community
              </button>
              <button className="desktop-topbar-link px-2 py-1 text-xs font-semibold" onClick={openWelcomeWindow}>
                Company
              </button>
              <TopNavMenu label="More" items={moreMenuItems} />
            </div>

            <div className="mx-2 flex min-w-0 flex-1 gap-1 overflow-x-auto">
              {windows.filter(w => w.isOpen).map((window) => {
                const displayTitle = window.titleKey ? t(window.titleKey) : window.title;
                return (
                  <button
                    key={window.id}
                    className={`desktop-window-tab px-3 py-1 text-xs font-medium truncate max-w-[220px] transition-all ${
                      !window.isMinimized ? 'desktop-window-tab-active' : ''
                    }`}
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
                <div className={`${!isSignedIn ? 'ml-auto' : ''} retro-button-small px-3 py-1 flex items-center gap-2`}>
                  <ShellShieldIcon size={16} tone="active" />
                  <span className="text-[10px] font-pixel">ADMIN</span>
                </div>
              )}

              <button
                className="desktop-taskbar-action border-l-2 px-3 py-1 flex items-center gap-2 transition-colors"
                onClick={handleAppearanceToggle}
                title={isDarkAppearance ? "Switch to Sepia Mode" : "Switch to Dark Mode"}
              >
                {isDarkAppearance ? <ShellMoonIcon size={16} tone="active" /> : <ShellSepiaIcon size={16} tone="active" />}
              </button>

              <div className="retro-button-small px-3 py-1 flex items-center gap-2">
                <ShellClockIcon size={14} tone="active" />
                <SystemClock />
              </div>
            </div>
          </div>
        </header>
      ) : (
        <footer
          className="fixed bottom-0 left-0 right-0 retro-window desktop-taskbar px-4 py-2"
          style={{ zIndex: 9999, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, overflow: 'visible' }}
        >
          <div className="flex items-center gap-2">
            {windows.filter(w => w.isOpen).length > 0 && (
              <WindowsMenu
                windows={windows.filter(w => w.isOpen)}
                onWindowClick={(id) => {
                  const window = windows.find(w => w.id === id)
                  if (window?.isMinimized) {
                    restoreWindow(id)
                  } else {
                    focusWindow(id)
                  }
                }}
              />
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
