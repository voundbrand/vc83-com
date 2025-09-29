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
import { useIsMobile } from "@/hooks/use-media-query"
import { ThemeToggle } from "@/components/theme-toggle"

export default function HomePage() {
  const [showStartMenu, setShowStartMenu] = useState(false)
  const { windows, openWindow } = useWindowManager()
  const isMobile = useIsMobile()

  const openAboutWindow = () => {
    openWindow("about", "About VC83", <AboutWindow />, { x: 150, y: 150 }, { width: 700, height: 500 })
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
    openWindow("welcome", "VC83 - Welcome", <WelcomeWindow />, { x: 100, y: 100 }, { width: 650, height: 450 })
  }

  // Open welcome window on mount (desktop only)
  useEffect(() => {
    if (!isMobile) {
      openWelcomeWindow()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile])

  const startMenuItems = [
    { label: "Welcome", icon: "🚀", onClick: openWelcomeWindow },
    { divider: true },
    { label: "Episodes", icon: "💾", onClick: openEpisodesWindow },
    { label: "About", icon: "📁", onClick: openAboutWindow },
    { label: "Contact", icon: "📧", onClick: openContactWindow },
    { label: "Subscribe", icon: "🔊", onClick: openSubscribeWindow }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black crt-scanlines relative overflow-hidden">
      {/* Desktop Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="grid grid-cols-20 grid-rows-20 h-full w-full">
          {Array.from({ length: 400 }).map((_, i) => (
            <div key={i} className="border border-purple-500/20"></div>
          ))}
        </div>
      </div>

      <ClientOnly>

      {/* Desktop Icons */}
      <div className={isMobile ? "desktop-grid-mobile" : "absolute top-4 left-4 space-y-4 z-10 desktop-only"}>
        <DesktopIcon icon="💾" label="Episodes" onClick={openEpisodesWindow} />
        <DesktopIcon icon="📁" label="About" onClick={openAboutWindow} />
        <DesktopIcon icon="📧" label="Contact" onClick={openContactWindow} />
        <DesktopIcon icon="🔊" label="Subscribe" onClick={openSubscribeWindow} />
      </div>

      {/* System Clock and Theme Toggle */}
      <div className="absolute top-4 right-4 z-10 desktop-only flex items-center gap-2">
        <ThemeToggle />
        <div className="retro-button px-2 py-1 text-xs">
          <SystemClock />
        </div>
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
      <footer className={`fixed bottom-0 left-0 right-0 retro-window dark:retro-window-dark border-t border-gray-400 z-10 ${isMobile ? 'px-4 py-2' : 'px-1 py-0.5'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                className={`retro-button ${isMobile ? 'px-4 py-2 text-sm' : 'px-2 py-0.5 text-xs'}`}
                onClick={() => setShowStartMenu(!showStartMenu)}
                data-start-button
              >
                <span className="font-pixel text-gray-800">START</span>
              </button>
              <StartMenu 
                items={startMenuItems}
                isOpen={showStartMenu}
                onClose={() => setShowStartMenu(false)}
              />
            </div>
            {!isMobile && (
              <div className="flex gap-2">
                <a href="#" className="text-purple-600 hover:text-purple-400 text-xs">
                  @vc83pod
                </a>
                <a href="#" className="text-purple-600 hover:text-purple-400 text-xs">
                  LinkedIn
                </a>
                <a href="#" className="text-purple-600 hover:text-purple-400 text-xs">
                  Spotify
                </a>
              </div>
            )}
          </div>
          {!isMobile && (
            <div className="text-[10px] text-gray-600 dark:text-gray-400">© 2025 VC83 | Built in Rostock</div>
          )}
        </div>
      </footer>
      </ClientOnly>
    </div>
  )
}