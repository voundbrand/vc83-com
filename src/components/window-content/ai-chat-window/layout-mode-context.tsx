"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type LayoutMode = "slick" | "single" | "three-pane" | "four-pane"

interface LayoutModeContextType {
  mode: LayoutMode
  setMode: (mode: LayoutMode) => void
  switchToSlick: () => void
  switchToSinglePane: () => void
  switchToThreePane: () => void
  switchToFourPane: () => void
}

const LayoutModeContext = createContext<LayoutModeContextType | undefined>(undefined)

const isLayoutMode = (value: unknown): value is LayoutMode =>
  value === "slick" || value === "single" || value === "three-pane" || value === "four-pane"

const normalizeLayoutMode = (mode: LayoutMode | undefined): LayoutMode => {
  if (!mode) {
    return "slick"
  }
  return isLayoutMode(mode) ? mode : "slick"
}

export function LayoutModeProvider({
  children,
  initialMode,
}: {
  children: ReactNode
  initialMode?: LayoutMode
}) {
  const [mode, setMode] = useState<LayoutMode>(() => normalizeLayoutMode(initialMode))

  useEffect(() => {
    setMode(normalizeLayoutMode(initialMode))
  }, [initialMode])

  const switchToSlick = () => setMode("slick")
  const switchToSinglePane = () => setMode("single")
  const switchToThreePane = () => setMode("three-pane")
  const switchToFourPane = () => setMode("four-pane")

  return (
    <LayoutModeContext.Provider
      value={{
        mode,
        setMode,
        switchToSlick,
        switchToSinglePane,
        switchToThreePane,
        switchToFourPane,
      }}
    >
      {children}
    </LayoutModeContext.Provider>
  )
}

export function useLayoutMode() {
  const context = useContext(LayoutModeContext)
  if (!context) {
    throw new Error("useLayoutMode must be used within LayoutModeProvider")
  }
  return context
}
