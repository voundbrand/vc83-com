"use client"

import { useState } from "react"
import { RetroWindow } from "@/components/retro-window"
import { DesktopIcon } from "@/components/desktop-icon"
import { RetroButton } from "@/components/retro-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { SystemClock } from "@/components/system-clock"
import { useWindowManager } from "@/hooks/use-window-manager"
import { FloatingWindow } from "@/components/floating-window"
import { AboutWindow } from "@/components/window-content/about-window"
import { EpisodesWindow } from "@/components/window-content/episodes-window"
import { ContactWindow } from "@/components/window-content/contact-window"
import { SubscribeWindow } from "@/components/window-content/subscribe-window"

export default function HomePage() {
  const [showHero, setShowHero] = useState(true)
  const { windows, openWindow } = useWindowManager()

  const openAboutWindow = () => {
    openWindow("about", "About VC83", <AboutWindow />, { x: 150, y: 150 })
  }

  const openEpisodesWindow = () => {
    openWindow("episodes", "Episode Archive", <EpisodesWindow />, { x: 200, y: 100 })
  }

  const openContactWindow = () => {
    openWindow("contact", "Contact & Subscribe", <ContactWindow />, { x: 250, y: 200 })
  }

  const openSubscribeWindow = () => {
    openWindow("subscribe", "Subscribe to VC83", <SubscribeWindow />, { x: 300, y: 150 })
  }

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

      {/* Desktop Icons */}
      <div className="absolute top-4 left-4 space-y-4 z-10">
        <DesktopIcon icon="💾" label="Episodes" onClick={openEpisodesWindow} />
        <DesktopIcon icon="📁" label="About" onClick={openAboutWindow} />
        <DesktopIcon icon="📧" label="Contact" onClick={openContactWindow} />
        <DesktopIcon icon="🔊" label="Subscribe" onClick={openSubscribeWindow} />
      </div>

      {/* System Clock */}
      <div className="absolute top-4 right-4 z-10">
        <SystemClock />
      </div>

      {/* Header/Navigation Window */}
      <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-20">
        <RetroWindow title="VC83 Navigation" className="min-w-[600px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="font-pixel text-lg text-purple-600">
                VC<span className="text-purple-400 text-sm align-super">83</span>
              </h1>
            </div>
            <nav className="flex items-center gap-4">
              <RetroButton size="sm">HOME</RetroButton>
              <RetroButton size="sm" variant="secondary" onClick={openEpisodesWindow}>
                EPISODES
              </RetroButton>
              <RetroButton size="sm" variant="secondary" onClick={openAboutWindow}>
                ABOUT
              </RetroButton>
              <RetroButton size="sm" variant="secondary" onClick={openContactWindow}>
                CONTACT
              </RetroButton>
              <ThemeToggle />
            </nav>
          </div>
        </RetroWindow>
      </div>

      {/* Main Content - Hero Section Only */}
      <div className="pt-32 px-4">
        {/* Hero Section */}
        {showHero && (
          <section className="flex justify-center">
            <RetroWindow title="VC83 - Welcome" className="max-w-4xl" closable onClose={() => setShowHero(false)}>
              <div className="text-center space-y-6">
                <div className="bg-gradient-to-b from-purple-600 to-black p-8 rounded-none">
                  <h1 className="font-pixel text-xl text-white mb-4 leading-relaxed">
                    VC83: Born in &apos;83, Betting Big on Mecklenburg-Vorpommern&apos;s Startup Gems
                  </h1>
                  <p className="text-white text-base leading-relaxed max-w-2xl mx-auto">
                    Raw VC truths from zero to fund one—interviews and underdog plays for Eastern Germany&apos;s rising
                    scene.
                  </p>
                </div>

                <div className="flex justify-center gap-4 flex-wrap">
                  <RetroButton size="lg">🎧 LISTEN TO EP. 1</RetroButton>
                  <RetroButton size="lg" variant="outline">
                    📻 SUBSCRIBE ON SPOTIFY
                  </RetroButton>
                </div>

                <div className="flex items-center justify-center gap-6 pt-4">
                  <div className="w-24 h-24 bg-gray-300 border-4 border-gray-500 flex items-center justify-center">
                    <span className="font-pixel text-xs">HOST</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-pixel text-sm text-purple-600 mb-1">[Your Name]</h3>
                    <p className="text-purple-400 text-sm">Rostock Hustler Decoding VC</p>
                  </div>
                </div>
              </div>
            </RetroWindow>
          </section>
        )}
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
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 border-t-2 border-gray-500 px-4 py-2 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="retro-button px-2 py-1">
              <span className="font-pixel text-xs text-gray-800 dark:text-gray-200">START</span>
            </div>
            <div className="flex gap-2">
              <a href="#" className="text-purple-600 hover:text-purple-400 text-sm">
                @vc83pod
              </a>
              <a href="#" className="text-purple-600 hover:text-purple-400 text-sm">
                LinkedIn
              </a>
              <a href="#" className="text-purple-600 hover:text-purple-400 text-sm">
                Spotify
              </a>
            </div>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">© 2025 VC83 | Built in Rostock</div>
        </div>
      </footer>
    </div>
  )
}