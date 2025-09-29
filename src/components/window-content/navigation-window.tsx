"use client"

import { RetroButton } from "@/components/retro-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useWindowManager } from "@/hooks/use-window-manager"
import { AboutWindow } from "./about-window"
import { EpisodesWindow } from "./episodes-window"
import { ContactWindow } from "./contact-window"

export function NavigationWindow() {
  const { openWindow } = useWindowManager()

  const openAboutWindow = () => {
    openWindow("about", "About VC83", <AboutWindow />, { x: 150, y: 150 })
  }

  const openEpisodesWindow = () => {
    openWindow("episodes", "Episode Archive", <EpisodesWindow />, { x: 200, y: 100 })
  }

  const openContactWindow = () => {
    openWindow("contact", "Contact & Subscribe", <ContactWindow />, { x: 250, y: 200 })
  }

  return (
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
  )
}