"use client"

import { useState, useEffect } from "react"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [isDark])

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="retro-button px-2 py-1 text-xs"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      <span className="font-pixel">{isDark ? "☀️" : "🌙"}</span>
    </button>
  )
}