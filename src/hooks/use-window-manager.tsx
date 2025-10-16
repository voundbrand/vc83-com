"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface Window {
  id: string
  title: string
  component: ReactNode
  isOpen: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  isMaximized?: boolean
  isMinimized?: boolean
  savedPosition?: { x: number; y: number }
  savedSize?: { width: number; height: number }
}

interface WindowManagerContextType {
  windows: Window[]
  openWindow: (id: string, title: string, component: ReactNode, position?: { x: number; y: number }, size?: { width: number; height: number }) => void
  closeWindow: (id: string) => void
  closeAllWindows: () => void
  focusWindow: (id: string) => void
  resizeWindow: (id: string, size: { width: number; height: number }) => void
  moveWindow: (id: string, position: { x: number; y: number }) => void
  maximizeWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  restoreWindow: (id: string) => void
  isWindowOpen: (id: string) => boolean
}

const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined)

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<Window[]>([])
  const [nextZIndex, setNextZIndex] = useState(100)
  const [cascadeOffset, setCascadeOffset] = useState({ x: 100, y: 100 })

  const openWindow = (id: string, title: string, component: ReactNode, position?: { x: number; y: number }, size?: { width: number; height: number }) => {
    setWindows((prev) => {
      const existing = prev.find((w) => w.id === id)
      if (existing) {
        // Focus existing window
        return prev.map((w) => (w.id === id ? { ...w, isOpen: true, zIndex: nextZIndex } : w))
      }
      
      // Calculate position with cascade effect
      let windowPosition = position || { ...cascadeOffset }
      
      // Viewport constraints
      const maxX = window.innerWidth - 400 // Approximate window width
      const maxY = window.innerHeight - 300 // Approximate window height
      
      // Reset cascade if it goes too far
      if (windowPosition.x > maxX || windowPosition.y > maxY) {
        windowPosition = { x: 100, y: 100 }
        setCascadeOffset({ x: 100, y: 100 })
      } else if (!position) {
        // Update cascade offset for next window
        setCascadeOffset({
          x: cascadeOffset.x + 30,
          y: cascadeOffset.y + 30
        })
      }
      
      // Create new window
      return [
        ...prev,
        {
          id,
          title,
          component,
          isOpen: true,
          position: windowPosition,
          size: size || { width: 800, height: 500 },
          zIndex: nextZIndex,
          isMaximized: false,
          isMinimized: false,
        },
      ]
    })
    setNextZIndex((prev) => prev + 1)
  }

  const closeWindow = (id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isOpen: false } : w)))
  }

  const closeAllWindows = () => {
    setWindows((prev) => prev.map((w) => ({ ...w, isOpen: false })))
    // Reset cascade offset when all windows are closed
    setCascadeOffset({ x: 100, y: 100 })
  }

  const focusWindow = (id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, zIndex: nextZIndex } : w)))
    setNextZIndex((prev) => prev + 1)
  }

  const isWindowOpen = (id: string) => {
    return windows.find((w) => w.id === id)?.isOpen || false
  }

  const resizeWindow = (id: string, size: { width: number; height: number }) => {
    setWindows((prev) => prev.map((w) => {
      if (w.id === id) {
        // Apply min/max constraints
        const constrainedSize = {
          width: Math.min(Math.max(size.width, 400), window.innerWidth - 50),
          height: Math.min(Math.max(size.height, 300), window.innerHeight - 50)
        }
        return { ...w, size: constrainedSize }
      }
      return w
    }))
  }

  const moveWindow = (id: string, position: { x: number; y: number }) => {
    setWindows((prev) => prev.map((w) => {
      if (w.id === id) {
        return { ...w, position }
      }
      return w
    }))
  }

  const maximizeWindow = (id: string) => {
    setWindows((prev) => prev.map((w) => {
      if (w.id === id) {
        return {
          ...w,
          isMaximized: true,
          position: { x: 0, y: 0 },
          size: { width: window.innerWidth, height: window.innerHeight - 40 } // Leave space for taskbar
        }
      }
      return w
    }))
  }

  const minimizeWindow = (id: string) => {
    setWindows((prev) => prev.map((w) => {
      if (w.id === id) {
        return { 
          ...w, 
          isMinimized: true,
          savedPosition: w.position,
          savedSize: w.size
        }
      }
      return w
    }))
  }

  const restoreWindow = (id: string) => {
    setWindows((prev) => prev.map((w) => {
      if (w.id === id) {
        return {
          ...w,
          isMaximized: false,
          isMinimized: false,
          position: w.savedPosition || w.position || { x: 100, y: 100 },
          size: w.savedSize || w.size || { width: 800, height: 500 },
          zIndex: nextZIndex
        }
      }
      return w
    }))
    setNextZIndex((prev) => prev + 1)
  }

  return (
    <WindowManagerContext.Provider
      value={{
        windows,
        openWindow,
        closeWindow,
        closeAllWindows,
        focusWindow,
        resizeWindow,
        moveWindow,
        maximizeWindow,
        minimizeWindow,
        restoreWindow,
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