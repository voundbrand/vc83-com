"use client"

import { useState, useEffect } from "react"
import { ClientOnly } from "@/components/client-only"
import { DesktopIcon } from "@/components/desktop-icon"
import { SystemClock } from "@/components/system-clock"
import { useWindowManager } from "@/hooks/use-window-manager"
import { FloatingWindow } from "@/components/floating-window"
import { StartMenu } from "@/components/start-menu"
import { AboutWindow } from "@/components/window-content/about-window"
import { EpisodesWindow } from "@/components/window-content/episodes-window"
import { ContactWindow } from "@/components/window-content/contact-window"
import { SubscribeWindow } from "@/components/window-content/subscribe-window"
import { WelcomeWindow } from "@/components/window-content/welcome-window"
import { LoginWindow } from "@/components/window-content/login-window"
import { RegisterWindow } from "@/components/window-content/register-window"
import { ControlPanelWindow } from "@/components/window-content/control-panel-window"
import { useIsMobile } from "@/hooks/use-media-query"
import { OrganizationSwitcher } from "@/components/auth/organization-switcher"
import { useAuth } from "@/hooks/use-auth"

export default function HomePage() {
  const [showStartMenu, setShowStartMenu] = useState(false)
  const { windows, openWindow, restoreWindow, focusWindow } = useWindowManager()
  const isMobile = useIsMobile()
  const { isAuthenticated, isLoading } = useAuth()

  const openAboutWindow = () => {
    openWindow("about", "About L4YERCAK3", <AboutWindow />, { x: 150, y: 150 }, { width: 700, height: 500 })
  }

  const openEpisodesWindow = () => {
    openWindow("episodes", "Episode Archive", <EpisodesWindow />, { x: 200, y: 100 }, { width: 850, height: 600 })
  }

  const openContactWindow = () => {
    openWindow("contact", "Contact & Subscribe", <ContactWindow />, { x: 250, y: 200 }, { width: 600, height: 450 })
  }

  const openSubscribeWindow = () => {
    openWindow("subscribe", "Subscribe to VC83", <SubscribeWindow />, { x: 300, y: 150 }, { width: 600, height: 500 })
  }

  const openWelcomeWindow = () => {
    openWindow("welcome", "L4YERCAK3.exe", <WelcomeWindow />, { x: 100, y: 100 }, { width: 650, height: 500 })
  }

  const openLoginWindow = () => {
    openWindow("login", "Sign In", <LoginWindow />, { x: 250, y: 150 }, { width: 500, height: 550 })
  }

  const openRegisterWindow = () => {
    openWindow("register", "Create Account", <RegisterWindow />, { x: 200, y: 100 }, { width: 600, height: 650 })
  }

  const openSettingsWindow = () => {
    openWindow("settings", "Settings", <ControlPanelWindow />, { x: 200, y: 100 }, { width: 700, height: 550 })
  }

  // Open welcome window on mount (desktop only)
  useEffect(() => {
    if (!isMobile) {
      openWelcomeWindow()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile])

  const startMenuItems = isAuthenticated ? [
    { 
      label: "Programs", 
      icon: "📂",
      submenu: [
        { label: "VC83 Podcast", icon: "🎙️", onClick: openEpisodesWindow },
        { label: "Subscribe", icon: "🔊", onClick: openSubscribeWindow },
      ]
    },
    { label: "Documents", icon: "📄", onClick: () => console.log("Documents - Coming soon") },
    { label: "Settings", icon: "⚙️", onClick: openSettingsWindow },
    { label: "Help", icon: "❓", onClick: () => console.log("Help - Coming soon") },
    { label: "Run AI", icon: "🤖", onClick: () => console.log("Run AI - Coming soon") },
    { divider: true },
    { label: "Sign Out", icon: "🚪", onClick: () => console.log("Sign out") },
  ] : [
    { 
      label: "Programs", 
      icon: "📂",
      submenu: [
        { label: "VC83 Podcast", icon: "🎙️", onClick: openEpisodesWindow },
      ]
    },
    { label: "Documents", icon: "📄", onClick: () => console.log("Documents - Coming soon") },
    { label: "Settings", icon: "⚙️", onClick: openSettingsWindow },
    { label: "Help", icon: "❓", onClick: () => console.log("Help - Coming soon") },
    { label: "Run AI", icon: "🤖", onClick: () => console.log("Run AI - Coming soon") },
    { divider: true },
    { label: "Sign In", icon: "🔑", onClick: openLoginWindow },
    { label: "Create Account", icon: "👤", onClick: openRegisterWindow },
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
        {isAuthenticated ? (
          <>
            <DesktopIcon icon="💾" label="Episodes" onClick={openEpisodesWindow} />
            <DesktopIcon icon="📁" label="About" onClick={openAboutWindow} />
            <DesktopIcon icon="📧" label="Contact" onClick={openContactWindow} />
            <DesktopIcon icon="🔊" label="Subscribe" onClick={openSubscribeWindow} />
          </>
        ) : (
          <>
            <DesktopIcon icon="🔑" label="Sign In" onClick={openLoginWindow} />
            <DesktopIcon icon="👤" label="Register" onClick={openRegisterWindow} />
            <DesktopIcon icon="📁" label="About" onClick={openAboutWindow} />
          </>
        )}
      </div>

      {/* Org Switcher */}
      <div className="absolute top-4 right-4 z-10 desktop-only flex items-center gap-2">
        {isAuthenticated && !isLoading && <OrganizationSwitcher />}
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

            {/* Taskbar Buttons for Open/Minimized Windows */}
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

            {/* Clock - Far Right */}
            {!isMobile && (
              <div
                className="ml-auto border-l-2 px-3 py-1 flex items-center gap-2"
                style={{
                  borderColor: 'var(--win95-border)',
                  background: 'var(--win95-bg-light)'
                }}
              >
                <span className="text-[10px]">🕐</span>
                <SystemClock />
              </div>
            )}
          </div>
        </div>
      </footer>
      </ClientOnly>
    </div>
  )
}