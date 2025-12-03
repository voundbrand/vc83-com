"use client"

import { useState, useEffect } from "react"
import { ClientOnly } from "@/components/client-only"
import { SystemClock } from "@/components/system-clock"
import { useWindowManager } from "@/hooks/use-window-manager"
import { FloatingWindow } from "@/components/floating-window"
import { StartMenu } from "@/components/start-menu"
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
import { FormsWindow } from "@/components/window-content/forms-window"
import { AllAppsWindow } from "@/components/window-content/all-apps-window"
import { ShoppingCartButton } from "@/components/shopping-cart-button"
import { CRMWindow } from "@/components/window-content/crm-window"
import { InvoicingWindow } from "@/components/window-content/invoicing-window"
import { WorkflowsWindow } from "@/components/window-content/workflows-window"
import { TemplatesWindow } from "@/components/window-content/templates-window"
import { AIChatWindow } from "@/components/window-content/ai-chat-window"
import { StoreWindow } from "@/components/window-content/store-window"
import { WindowsMenu } from "@/components/windows-menu"
import { useIsMobile } from "@/hooks/use-media-query"
import { useAuth, useOrganizations, useCurrentOrganization, useIsSuperAdmin, useAccountDeletionStatus } from "@/hooks/use-auth"
import { useAvailableApps } from "@/hooks/use-app-availability"
import { useMultipleNamespaces } from "@/hooks/use-namespace-translations"
import { useTheme } from "@/contexts/theme-context"
import { getThemeFamily, isLightTheme, getOppositeTheme } from "@/contexts/theme-context"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"

export default function HomePage() {
  // Load translations for start menu and app names
  const { t } = useMultipleNamespaces(["ui.start_menu", "ui.app"])
  // Note: locale management is now handled via TranslationContext if needed
  const [showStartMenu, setShowStartMenu] = useState(false)
  const { windows, openWindow, restoreWindow, focusWindow } = useWindowManager()
  const isMobile = useIsMobile()
  const { isSignedIn, signOut, switchOrganization } = useAuth()
  const organizations = useOrganizations()
  const currentOrg = useCurrentOrganization()
  const isSuperAdmin = useIsSuperAdmin()
  const deletionStatus = useAccountDeletionStatus()
  const { currentTheme, setTheme } = useTheme()

  // Check if current theme has a light/dark pair (is part of a theme family)
  const hasThemeToggle = getThemeFamily(currentTheme.id) !== null
  const isCurrentThemeLight = isLightTheme(currentTheme.id)

  // Toggle between light and dark variant within the same theme family
  const handleThemeToggle = () => {
    const oppositeTheme = getOppositeTheme(currentTheme.id)
    if (oppositeTheme) {
      setTheme(oppositeTheme)
    }
  }

  // Use the new hook for app availability
  const { isAppAvailable } = useAvailableApps()

  // Query branding settings for desktop background
  const brandingSettings = useQuery(
    api.organizationOntology.getOrganizationSettings,
    currentOrg?.id ? {
      organizationId: currentOrg.id as any,
      subtype: "branding"
    } : "skip"
  )

  // Extract desktop background URL
  const desktopBackground = brandingSettings && !Array.isArray(brandingSettings)
    ? (brandingSettings.customProperties as { desktopBackground?: string })?.desktopBackground
    : undefined

  const openWelcomeWindow = () => {
    openWindow("welcome", "l4yercak3.exe", <WelcomeWindow />, { x: 100, y: 100 }, { width: 650, height: 500 }, 'ui.app.l4yercak3_exe', '🎂')
  }

  const openSettingsWindow = () => {
    openWindow("settings", "Settings", <ControlPanelWindow />, { x: 200, y: 100 }, { width: 700, height: 550 }, 'ui.start_menu.settings', '⚙️')
  }

  const openLoginWindow = () => {
    openWindow("login", "User Account", <LoginWindow />, { x: 250, y: 100 }, { width: 450, height: 620 }, 'ui.app.user_account', '👤')
  }

  // const openLayerDocsWindow = () => {
  //   openWindow("layer-docs", "L4YER.docs", <LayerDocsWindow />, { x: 150, y: 80 }, { width: 1000, height: 650 })
  // }

  const openPaymentsWindow = () => {
    openWindow("payments", "Payment Management", <PaymentsWindow />, { x: 100, y: 50 }, { width: 900, height: 600 }, 'ui.app.payment_management')
  }

  const openWebPublishingWindow = () => {
    openWindow("web-publishing", "Web Publishing", <WebPublishingWindow />, { x: 110, y: 55 }, { width: 900, height: 600 }, 'ui.app.web_publishing')
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
    openWindow("ai-assistant", "AI Assistant", <AIChatWindow />, { x: 230, y: 70 }, { width: 700, height: 600 }, 'ui.app.ai_assistant')
  }

  const openStoreWindow = () => {
    openWindow("store", "l4yercak3 Store", <StoreWindow />, { x: 150, y: 80 }, { width: 900, height: 650 }, 'ui.start_menu.store', '🏪')
  }

  const handleLogout = () => {
    signOut()
  }

  // Open welcome/login window on mount based on auth status
  useEffect(() => {
    if (!isMobile) {
      if (isSignedIn) {
        // Authenticated: Show welcome window
        openWelcomeWindow()
      } else {
        // Not authenticated: Show login window immediately
        openLoginWindow()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, isSignedIn])

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

  // Handle return from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openWindowParam = params.get('openWindow');

    if (openWindowParam === 'payments' && isSignedIn) {
      // Open the Payments window
      openPaymentsWindow();

      // Clean up the URL (remove query params)
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn])

  // Handle checkout success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutParam = params.get('checkout');

    if (checkoutParam === 'success') {
      // Open the checkout success window with confetti
      openCheckoutSuccessWindow();

      // Clean up the URL (remove query params)
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Build organization submenu items dynamically with truncation
  const truncateOrgName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength) + '...';
  };

  // Filter to only show active organizations in the start menu
  const activeOrganizations = organizations.filter(org => org.isActive);

  const orgMenuItems = activeOrganizations.map(org => ({
    label: truncateOrgName(org.name), // Truncate long names
    fullLabel: org.name, // Keep full name for title attribute
    icon: currentOrg?.id === org.id ? "✓" : "🏢",
    onClick: () => switchOrganization(org.id)
  }))

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
    }
  });

  // Build Programs submenu dynamically based on app availability
  const programsSubmenu = [
    // All Apps - always show for authenticated users
    { label: t('ui.app.all_applications'), icon: "📱", onClick: requireAuth(openAllAppsWindow) },
    // AI Assistant - check availability via app availability system
    ...(isAppAvailable("ai-assistant") ? [
      { label: t('ui.app.ai_assistant'), icon: "🤖", onClick: requireAuth(openAIAssistantWindow) }
    ] : []),
    // { label: "L4YER.docs", icon: "📝", onClick: requireAuth(openLayerDocsWindow) }, // Hidden for now
    ...(isAppAvailable("media-library") ? [
      { label: t('ui.app.media_library'), icon: "📁", onClick: requireAuth(openMediaLibraryWindow) }
    ] : []),
    ...(isAppAvailable("payments") ? [
      { label: t('ui.app.payments'), icon: "💰", onClick: requireAuth(openPaymentsWindow) }
    ] : []),
    ...(isAppAvailable("products") ? [
      { label: t('ui.app.products'), icon: "🎟️", onClick: requireAuth(openProductsWindow) }
    ] : []),
    ...(isAppAvailable("tickets") ? [
      { label: t('ui.app.tickets'), icon: "🎫", onClick: requireAuth(openTicketsWindow) }
    ] : []),
    ...(isAppAvailable("certificates") ? [
      { label: t('ui.app.certificates'), icon: "📜", onClick: requireAuth(openCertificatesWindow) }
    ] : []),
    ...(isAppAvailable("events") ? [
      { label: t('ui.app.events'), icon: "📅", onClick: requireAuth(openEventsWindow) }
    ] : []),
    // Checkout app - Manage checkout pages for products and events
    ...(isAppAvailable("checkout") ? [
      { label: t('ui.app.checkout'), icon: "🛒", onClick: requireAuth(openCheckoutAppWindow) }
    ] : []),
    ...(isAppAvailable("forms") ? [
      { label: t('ui.app.forms'), icon: "📋", onClick: requireAuth(openFormsWindow) }
    ] : []),
    // Web Publishing app - enabled via app availability
    ...(isAppAvailable("web-publishing") ? [
      { label: t('ui.app.web_publishing'), icon: "🌐", onClick: requireAuth(openWebPublishingWindow) }
    ] : []),
    // CRM app - customer relationship management
    ...(isAppAvailable("crm") ? [
      { label: t('ui.app.crm'), icon: "👥", onClick: requireAuth(openCRMWindow) }
    ] : []),
    // Invoicing app - B2B/B2C invoice management
    ...(isAppAvailable("app_invoicing") ? [
      { label: t('ui.app.invoicing'), icon: "🧾", onClick: requireAuth(openInvoicingWindow) }
    ] : []),
    // Workflows app - Multi-object behavior orchestration
    ...(isAppAvailable("workflows") ? [
      { label: t('ui.app.workflows'), icon: "⚡", onClick: requireAuth(openWorkflowsWindow) }
    ] : []),
    // Compliance app - Always show, but grayed out if not available
    {
      label: t('ui.app.compliance') || "Compliance",
      icon: "⚖️",
      disabled: !isAppAvailable("compliance"),
      onClick: isAppAvailable("compliance") ? requireAuth(() => console.log("Compliance - Coming soon")) : undefined
    },
    // Templates app - Browse and preview all templates
    { label: t('ui.app.templates'), icon: "📄", onClick: requireAuth(openTemplatesWindow) },
    //{ label: "l4yercak3 Podcast", icon: "🎙️", onClick: requireAuth(openEpisodesWindow) },
    //{ label: "Subscribe", icon: "🔊", onClick: requireAuth(openSubscribeWindow) },
  ]

  const startMenuItems = [
    {
      label: t('ui.start_menu.programs'),
      icon: "📂",
      submenu: programsSubmenu
    },
    //{ label: "Documents", icon: "📄", onClick: requireAuth(() => console.log("Documents - Coming soon")) },

    // Organizations menu BEFORE Settings - only show if user has active organizations
    ...(isSignedIn && activeOrganizations.length > 0 ? [{
      label: t('ui.start_menu.organizations'),
      icon: "🏢",
      submenu: orgMenuItems
    }] : []),

    // Store menu item - platform services and subscriptions
    { label: t('ui.start_menu.store'), icon: "🏪", onClick: requireAuth(openStoreWindow) },

    { label: t('ui.start_menu.settings'), icon: "⚙️", onClick: requireAuth(openSettingsWindow) },

    {
      label: isSignedIn ? t('ui.start_menu.log_out') : t('ui.start_menu.log_in'),
      icon: isSignedIn ? "🔒" : "🔓",
      onClick: isSignedIn ? handleLogout : openLoginWindow
    },
  ]

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
      <div className={isMobile ? "desktop-grid-mobile" : "absolute top-4 left-4 space-y-4 z-10 desktop-only"}>
        {/* <DesktopIcon icon="💾" label="Episodes" onClick={openEpisodesWindow} /> */}
        {/* <DesktopIcon icon="📁" label="About" onClick={openAboutWindow} /> */}
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

      {/* Footer Taskbar */}
      <footer className={`fixed bottom-0 left-0 right-0 retro-window dark:retro-window-dark border-t border-gray-400 ${isMobile ? 'px-4 py-2' : 'px-1 py-0.5'}`} style={{ zIndex: 9999, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, overflow: 'visible' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative">
              <button
                className={`retro-button ${isMobile ? 'px-4 py-2 text-sm' : 'px-2 py-0.5 text-xs'}`}
                onClick={() => setShowStartMenu(!showStartMenu)}
                data-start-button
              >
                <span className="font-pixel" style={{ color: 'var(--win95-text)' }}>🍰 START</span>
              </button>
              <StartMenu 
                items={startMenuItems}
                isOpen={showStartMenu}
                onClose={() => setShowStartMenu(false)}
              />
            </div>

            {/* Desktop: Taskbar Buttons for Open/Minimized Windows */}
            {!isMobile && (
              <div className="flex gap-1 flex-1 overflow-x-auto">
                {windows.filter(w => w.isOpen).map((window) => {
                  const displayTitle = window.titleKey ? t(window.titleKey) : window.title;
                  return (
                    <button
                      key={window.id}
                      className={`retro-button px-3 py-0.5 text-xs font-pixel truncate max-w-[150px] transition-all ${
                        !window.isMinimized ? 'shadow-inner' : ''
                      }`}
                      style={{
                        backgroundColor: !window.isMinimized ? 'var(--win95-bg-light)' : 'var(--win95-bg)',
                        color: 'var(--win95-text)'
                      }}
                      onClick={() => {
                        if (window.isMinimized) {
                          restoreWindow(window.id)
                        } else {
                          focusWindow(window.id)
                        }
                      }}
                      title={displayTitle}
                    >
                      {window.icon || '📄'} {displayTitle}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Mobile: Compact Windows Menu */}
            {isMobile && windows.filter(w => w.isOpen).length > 0 && (
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

            {/* Desktop: Shopping Cart, Clock, Deletion Warning, and Super Admin Badge */}
            {!isMobile && (
              <>
                {/* Shopping Cart Button - Platform services (AI subscriptions, etc.) */}
                {isSignedIn && (
                  <ShoppingCartButton onOpenCart={openPlatformCartWindow} />
                )}

                {/* Theme Toggle - Shows for any theme with a light/dark pair */}
                {hasThemeToggle && (
                  <button
                    className="border-l-2 px-3 py-1 flex items-center gap-2 hover:bg-opacity-80 transition-colors"
                    style={{
                      borderColor: 'var(--win95-border)',
                      background: 'var(--win95-bg-light)'
                    }}
                    onClick={handleThemeToggle}
                    title={isCurrentThemeLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
                  >
                    <span className="text-sm">
                      {isCurrentThemeLight ? '☀️' : '🌙'}
                    </span>
                  </button>
                )}

                {/* Account Deletion Warning - Show if scheduled for deletion */}
                {isSignedIn && deletionStatus.isScheduledForDeletion && (
                  <div
                    className={`${!isSuperAdmin && !hasThemeToggle ? 'ml-auto' : ''} border-l-2 px-3 py-1 flex items-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors`}
                    style={{
                      borderColor: 'var(--win95-border)',
                      background: '#ffcccc' // Light red warning background
                    }}
                    onClick={openSettingsWindow}
                    title={`Account scheduled for deletion on ${deletionStatus.deletionDate?.toLocaleDateString()}. Click to restore.`}
                  >
                    <span className="text-sm animate-pulse">⚠️</span>
                    <span className="text-[10px] font-pixel text-red-600">
                      {deletionStatus.daysRemaining === 1
                        ? '1 DAY'
                        : `${deletionStatus.daysRemaining} DAYS`}
                    </span>
                  </div>
                )}

                {/* Super Admin Badge - Only if super admin */}
                {isSuperAdmin && (
                  <div
                    className={`${!isSignedIn || (!deletionStatus.isScheduledForDeletion && !hasThemeToggle) ? 'ml-auto' : ''} retro-button-small px-3 py-1 flex items-center gap-2`}
                  >
                    <span className="text-sm" title="Super Admin">🔐</span>
                    <span className="text-[10px] font-pixel">ADMIN</span>
                  </div>
                )}

                {/* Clock */}
                <div
                  className={`${(!isSuperAdmin && (!isSignedIn || !deletionStatus.isScheduledForDeletion) && !hasThemeToggle) ? 'ml-auto' : ''} retro-button-small px-3 py-1 flex items-center gap-2`}
                >
                  <span className="text-[10px]">🕐</span>
                  <SystemClock />
                </div>
              </>
            )}

            {/* Mobile: Theme Toggle and Super Admin Badge */}
            {isMobile && (
              <>
                {/* Theme Toggle - Shows for any theme with a light/dark pair */}
                {hasThemeToggle && (
                  <button
                    className={`${!isSuperAdmin ? 'ml-auto' : ''} border-l-2 px-3 py-1 flex items-center gap-2 hover:bg-opacity-80 transition-colors`}
                    style={{
                      borderColor: 'var(--win95-border)',
                      background: 'var(--win95-bg-light)'
                    }}
                    onClick={handleThemeToggle}
                    title={isCurrentThemeLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
                  >
                    <span className="text-sm">
                      {isCurrentThemeLight ? '☀️' : '🌙'}
                    </span>
                  </button>
                )}

                {/* Super Admin Badge */}
                {isSuperAdmin && (
                  <div
                    className={`${!hasThemeToggle ? 'ml-auto' : ''} border-l-2 px-3 py-1 flex items-center gap-2`}
                    style={{
                      borderColor: 'var(--win95-border)',
                      background: 'var(--win95-bg-light)'
                    }}
                  >
                    <span className="text-sm" title="Super Admin">🔐</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </footer>
      </ClientOnly>
    </div>
  )
}