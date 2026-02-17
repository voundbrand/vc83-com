"use client"

import { useEffect, useState } from "react"
import { useAppearance } from "@/contexts/appearance-context"
import { ShellMoonIcon, ShellSepiaIcon } from "@/components/icons/shell-icons"

export function ThemeToggle() {
  const { mode, toggleMode } = useAppearance()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="retro-button px-2 py-1 text-xs" disabled>
        <ShellMoonIcon size={14} tone="active" />
      </button>
    )
  }

  const isDarkAppearance = mode === "dark"
  const nextModeLabel = isDarkAppearance ? "Sepia" : "Dark"

  return (
    <button
      type="button"
      onClick={toggleMode}
      className="retro-button px-2 py-1 text-xs"
      title={`Switch to ${nextModeLabel} Mode`}
      aria-label={`Switch to ${nextModeLabel} Mode`}
    >
      {isDarkAppearance ? (
        <ShellMoonIcon size={14} tone="active" />
      ) : (
        <ShellSepiaIcon size={14} tone="active" />
      )}
    </button>
  )
}
