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
import { WindowsMenu } from "@/components/windows-menu"
import { useIsMobile } from "@/hooks/use-media-query"
import { useAuth, useOrganizations, useCurrentOrganization, useIsSuperAdmin } from "@/hooks/use-auth"

export default function HomePage() {
  const [showStartMenu, setShowStartMenu] = useState(false)
  const { windows, openWindow, restoreWindow, focusWindow } = useWindowManager()
  const isMobile = useIsMobile()
  const { isSignedIn, signOut, switchOrganization } = useAuth()
  const organizations = useOrganizations()
  const currentOrg = useCurrentOrganization()
  const isSuperAdmin = useIsSuperAdmin()

  const openWelcomeWindow = () => {
    openWindow("welcome", "L4YERCAK3.exe", <WelcomeWindow />, { x: 100, y: 100 }, { width: 650, height: 500 })
  }

  const openSettingsWindow = () => {
    openWindow("settings", "Settings", <ControlPanelWindow />, { x: 200, y: 100 }, { width: 700, height: 550 })
  }

  const openLoginWindow = () => {
    openWindow("login", "User Account", <LoginWindow />, { x: 250, y: 100 }, { width: 450, height: 620 })
  }

  const openLayerDocsWindow = () => {
    openWindow("layer-docs", "L4YER.docs", <LayerDocsWindow />, { x: 150, y: 80 }, { width: 1000, height: 650 })
  }

  const handleLogout = () => {
    signOut()
  }

  // Open welcome window on mount (desktop only)
  useEffect(() => {
    if (!isMobile) {
      openWelcomeWindow()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile])

  // Build organization submenu items dynamically (NO role names)
  const orgMenuItems = organizations.map(org => ({
    label: org.name, // Just the organization name
    icon: currentOrg?.id === org.id ? "✓" : "🏢",
    onClick: () => switchOrganization(org.id)
  }))

  const startMenuItems = [
    {
      label: "Programs",
      icon: "📂",
      submenu: [
        { label: "L4YER.docs", icon: "📝", onClick: openLayerDocsWindow },
        //{ label: "L4YERCAK3 Podcast", icon: "🎙️", onClick: openEpisodesWindow },
        //{ label: "Subscribe", icon: "🔊", onClick: openSubscribeWindow },
      ]
    },
    //{ label: "Documents", icon: "📄", onClick: () => console.log("Documents - Coming soon") },
    { label: "Settings", icon: "⚙️", onClick: openSettingsWindow },

    // Add Organizations menu item (conditional)
    ...(isSignedIn && organizations.length > 0 ? [{
      label: "Organizations",
      icon: "🏢",
      submenu: orgMenuItems
    }] : []),

    {
      label: isSignedIn ? "Log Out" : "Log In",
      icon: isSignedIn ? "🔒" : "🔓",
      onClick: isSignedIn ? handleLogout : openLoginWindow
    },
  ]

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Desktop Background Pattern - Win95 style */}
      <div className="absolute inset-0 opacity-10">
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
      <footer className={`fixed bottom-0 left-0 right-0 retro-window dark:retro-window-dark border-t border-gray-400 ${isMobile ? 'px-4 py-2' : 'px-1 py-0.5'}`} style={{ zIndex: 9999, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
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

            {/* Desktop: Clock and Super Admin Badge */}
            {!isMobile && (
              <>
                {/* Super Admin Badge - Only if super admin */}
                {isSuperAdmin && (
                  <div
                    className="ml-auto border-l-2 px-3 py-1 flex items-center gap-2"
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
                  className={`${isSuperAdmin ? '' : 'ml-auto'} border-l-2 px-3 py-1 flex items-center gap-2`}
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