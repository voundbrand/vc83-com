"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="btn-secondary h-8 px-3 gap-2"
      >
        <Sun className="h-4 w-4" />
        <span className="text-xs font-medium">Theme</span>
      </Button>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="btn-secondary h-8 px-3 gap-2"
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4" />
          <span className="text-xs font-medium">Daylight</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          <span className="text-xs font-medium">Midnight</span>
        </>
      )}
    </Button>
  )
}
