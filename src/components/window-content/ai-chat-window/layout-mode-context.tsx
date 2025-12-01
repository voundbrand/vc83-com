"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export type LayoutMode = "single" | "three-pane"

interface LayoutModeContextType {
  mode: LayoutMode
  setMode: (mode: LayoutMode) => void
  switchToSinglePane: () => void
  switchToThreePane: () => void
}

const LayoutModeContext = createContext<LayoutModeContextType | undefined>(undefined)

export function LayoutModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<LayoutMode>("single")

  const switchToSinglePane = () => setMode("single")
  const switchToThreePane = () => setMode("three-pane")

  return (
    <LayoutModeContext.Provider
      value={{
        mode,
        setMode,
        switchToSinglePane,
        switchToThreePane,
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
