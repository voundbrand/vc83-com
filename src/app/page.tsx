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
import { LayerDocsWindow } from "@/components/window-content/layer-docs/layer-docs-window"
import { PaymentsWindow } from "@/components/window-content/payments-window"
import { WebPublishingWindow } from "@/components/window-content/web-publishing-window"
import MediaLibraryWindow from "@/components/window-content/media-library-window"
import { ProductsWindow } from "@/components/window-content/products-window"
import { TicketsWindow } from "@/components/window-content/tickets-window"
import { EventsWindow } from "@/components/window-content/events-window"
import { AllAppsWindow } from "@/components/window-content/all-apps-window"
import { WindowsMenu } from "@/components/windows-menu"
import { useIsMobile } from "@/hooks/use-media-query"
import { useAuth, useOrganizations, useCurrentOrganization, useIsSuperAdmin, useAccountDeletionStatus } from "@/hooks/use-auth"
import { useAvailableApps } from "@/hooks/use-app-availability"

export default function HomePage() {
  const [showStartMenu, setShowStartMenu] = useState(false)
  const { windows, openWindow, restoreWindow, focusWindow } = useWindowManager()
  const isMobile = useIsMobile()
  const { isSignedIn, signOut, switchOrganization } = useAuth()
  const organizations = useOrganizations()
  const currentOrg = useCurrentOrganization()
  const isSuperAdmin = useIsSuperAdmin()
  const deletionStatus = useAccountDeletionStatus()

  // Use the new hook for app availability
  const { isAppAvailable } = useAvailableApps()

  const openWelcomeWindow = () => {
    openWindow("welcome", "L4YERCAK3.exe", <WelcomeWindow />, { x: 100, y: 100 }, { width: 650, height: 500 })
  }

  const openSettingsWindow = () => {
    openWindow("settings", "Settings", <ControlPanelWindow />, { x: 200, y: 100 }, { width: 700, height: 550 })
  }

  const openLoginWindow = () => {
    openWindow("login", "User Account", <LoginWindow />, { x: 250, y: 100 }, { width: 450, height: 620 })
  }

  // const openLayerDocsWindow = () => {
  //   openWindow("layer-docs", "L4YER.docs", <LayerDocsWindow />, { x: 150, y: 80 }, { width: 1000, height: 650 })
  // }

  const openPaymentsWindow = () => {
    openWindow("payments", "Payment Management", <PaymentsWindow />, { x: 200, y: 120 }, { width: 900, height: 600 })
  }

  const openWebPublishingWindow = () => {
    openWindow("web-publishing", "Web Publishing", <WebPublishingWindow />, { x: 220, y: 140 }, { width: 900, height: 600 })
  }

  const openMediaLibraryWindow = () => {
    openWindow("media-library", "Media Library", <MediaLibraryWindow />, { x: 240, y: 160 }, { width: 1000, height: 700 })
  }

  const openProductsWindow = () => {
    openWindow("products", "Products", <ProductsWindow />, { x: 260, y: 180 }, { width: 950, height: 650 })
  }

  const openTicketsWindow = () => {
    openWindow("tickets", "Tickets", <TicketsWindow />, { x: 280, y: 200 }, { width: 950, height: 650 })
  }

  const openEventsWindow = () => {
    openWindow("events", "Events", <EventsWindow />, { x: 300, y: 220 }, { width: 950, height: 650 })
  }

  const openAllAppsWindow = () => {
    openWindow("all-apps", "All Applications", <AllAppsWindow />, { x: 150, y: 100 }, { width: 800, height: 600 })
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
      'web-publishing': isAppAvailable("web-publishing"),
    }
  });

  // Build Programs submenu dynamically based on app availability
  const programsSubmenu = [
    // All Apps - always show for authenticated users
    { label: "All Applications", icon: "📱", onClick: requireAuth(openAllAppsWindow) },
    { divider: true }, // Visual separator
    // { label: "L4YER.docs", icon: "📝", onClick: requireAuth(openLayerDocsWindow) }, // Hidden for now
    ...(isAppAvailable("media-library") ? [
      { label: "Media Library", icon: "📁", onClick: requireAuth(openMediaLibraryWindow) }
    ] : []),
    ...(isAppAvailable("payments") ? [
      { label: "Payments", icon: "💳", onClick: requireAuth(openPaymentsWindow) }
    ] : []),
    ...(isAppAvailable("products") ? [
      { label: "Products", icon: "📦", onClick: requireAuth(openProductsWindow) }
    ] : []),
    ...(isAppAvailable("tickets") ? [
      { label: "Tickets", icon: "🎟️", onClick: requireAuth(openTicketsWindow) }
    ] : []),
    ...(isAppAvailable("events") ? [
      { label: "Events", icon: "📅", onClick: requireAuth(openEventsWindow) }
    ] : []),
    // Web Publishing app - enabled via app availability
    ...(isAppAvailable("web-publishing") ? [
      { label: "Web Publishing", icon: "🌐", onClick: requireAuth(openWebPublishingWindow) }
    ] : []),
    //{ label: "L4YERCAK3 Podcast", icon: "🎙️", onClick: requireAuth(openEpisodesWindow) },
    //{ label: "Subscribe", icon: "🔊", onClick: requireAuth(openSubscribeWindow) },
  ]

  const startMenuItems = [
    {
      label: "Programs",
      icon: "📂",
      submenu: programsSubmenu
    },
    //{ label: "Documents", icon: "📄", onClick: requireAuth(() => console.log("Documents - Coming soon")) },

    // Organizations menu BEFORE Settings - only show if user has active organizations
    ...(isSignedIn && activeOrganizations.length > 0 ? [{
      label: "Organizations",
      icon: "🏢",
      submenu: orgMenuItems
    }] : []),

    { label: "Settings", icon: "⚙️", onClick: requireAuth(openSettingsWindow) },

    {
      label: isSignedIn ? "Log Out" : "Log In",
      icon: isSignedIn ? "🔒" : "🔓",
      onClick: isSignedIn ? handleLogout : openLoginWindow
    },
  ]

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--background)' }}>
      {/* Desktop Background Pattern - Win95 style */}
      <div className="absolute inset-0 opacity-10" style={{ zIndex: 0 }}>
        <div className="grid grid-cols-20 grid-rows-20 h-full w-full">
          {Array.from({ length: 400 }).map((_, i) => (
            <div key={i} className="border" style={{ borderColor: 'var(--desktop-grid-overlay)' }}></div>
          ))}
        </div>
      </div>

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
                {windows.filter(w => w.isOpen).map((window) => (
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
                    title={window.title}
                  >
                    📄 {window.title}
                  </button>
                ))}
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

            {/* Desktop: Clock, Deletion Warning, and Super Admin Badge */}
            {!isMobile && (
              <>
                {/* Account Deletion Warning - Show if scheduled for deletion */}
                {isSignedIn && deletionStatus.isScheduledForDeletion && (
                  <div
                    className={`${!isSuperAdmin ? 'ml-auto' : ''} border-l-2 px-3 py-1 flex items-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors`}
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
                    className={`${!isSignedIn || !deletionStatus.isScheduledForDeletion ? 'ml-auto' : ''} border-l-2 px-3 py-1 flex items-center gap-2`}
                    style={{
                      borderColor: 'var(--win95-border)',
                      background: 'var(--win95-bg-light)'
                    }}
                  >
                    <span className="text-sm" title="Super Admin">🔐</span>
                    <span className="text-[10px] font-pixel">ADMIN</span>
                  </div>
                )}

                {/* Clock */}
                <div
                  className={`${(!isSuperAdmin && (!isSignedIn || !deletionStatus.isScheduledForDeletion)) ? 'ml-auto' : ''} border-l-2 px-3 py-1 flex items-center gap-2`}
                  style={{
                    borderColor: 'var(--win95-border)',
                    background: 'var(--win95-bg-light)'
                  }}
                >
                  <span className="text-[10px]">🕐</span>
                  <SystemClock />
                </div>
              </>
            )}

            {/* Mobile: Super Admin Badge (no clock) */}
            {isMobile && isSuperAdmin && (
              <div
                className="ml-auto border-l-2 px-3 py-1 flex items-center gap-2"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)'
                }}
              >
                <span className="text-sm" title="Super Admin">🔐</span>
              </div>
            )}
          </div>
        </div>
      </footer>
      </ClientOnly>
    </div>
  )
}