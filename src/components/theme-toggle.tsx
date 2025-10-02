"use client"

import { useState, useEffect, useRef } from "react"
import { useTheme, themes } from "@/contexts/theme-context"
import { Check } from "lucide-react"

export function ThemeToggle() {
  const { currentTheme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  if (!mounted) {
    return (
      <button className="retro-button px-2 py-1 text-xs" disabled>
        <span className="font-pixel">🎨</span>
      </button>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="retro-button px-2 py-1 text-xs"
        title="Change Theme"
      >
        <span className="font-pixel">🎨</span>
      </button>
      
      {isOpen && (
        <div 
          className="absolute top-full right-0 mt-1 retro-window dark:retro-window-dark min-w-[180px] z-50"
          style={{ background: 'var(--win95-bg)' }}
        >
          <div className="flex flex-col">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  setTheme(theme.id)
                  setIsOpen(false)
                }}
                className="flex items-center gap-2 px-3 py-2 text-xs transition-colors hover-menu-item"
                style={{ color: 'var(--win95-text)' }}
              >
                <span
                  className="w-4 h-4 border"
                  style={{
                    background: theme.colors.background,
                    borderColor: 'var(--win95-border)'
                  }}
                />
                <span className="flex-1 text-left font-pixel">{theme.name}</span>
                {currentTheme.id === theme.id && (
                  <Check size={12} style={{ color: 'var(--win95-highlight)' }} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}