"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface Window {
  id: string
  title: string
  component: ReactNode
  isOpen: boolean
  position: { x: number; y: number }
  zIndex: number
}

interface WindowManagerContextType {
  windows: Window[]
  openWindow: (id: string, title: string, component: ReactNode, position?: { x: number; y: number }) => void
  closeWindow: (id: string) => void
  focusWindow: (id: string) => void
  isWindowOpen: (id: string) => boolean
}

const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined)

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<Window[]>([])
  const [nextZIndex, setNextZIndex] = useState(100)

  const openWindow = (id: string, title: string, component: ReactNode, position = { x: 100, y: 100 }) => {
    setWindows((prev) => {
      const existing = prev.find((w) => w.id === id)
      if (existing) {
        // Focus existing window
        return prev.map((w) => (w.id === id ? { ...w, isOpen: true, zIndex: nextZIndex } : w))
      }
      // Create new window
      return [
        ...prev,
        {
          id,
          title,
          component,
          isOpen: true,
          position,
          zIndex: nextZIndex,
        },
      ]
    })
    setNextZIndex((prev) => prev + 1)
  }

  const closeWindow = (id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isOpen: false } : w)))
  }

  const focusWindow = (id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, zIndex: nextZIndex } : w)))
    setNextZIndex((prev) => prev + 1)
  }

  const isWindowOpen = (id: string) => {
    return windows.find((w) => w.id === id)?.isOpen || false
  }

  return (
    <WindowManagerContext.Provider
      value={{
        windows,
        openWindow,
        closeWindow,
        focusWindow,
        isWindowOpen,
      }}
    >
      {children}
    </WindowManagerContext.Provider>
  )
}

export function useWindowManager() {
  const context = useContext(WindowManagerContext)
  if (!context) {
    throw new Error("useWindowManager must be used within WindowManagerProvider")
  }
  return context
}
