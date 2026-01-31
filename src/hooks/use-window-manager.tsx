"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode, Suspense } from "react"
import { getWindowFactory } from "./window-registry"

interface Window {
  id: string
  title: string // Can be either a static string or a translation key
  titleKey?: string // Optional: if provided, will be used for translation
  icon?: string // Optional: emoji/icon for the app
  component: ReactNode
  isOpen: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  isMaximized?: boolean
  isMinimized?: boolean
  savedPosition?: { x: number; y: number }
  savedSize?: { width: number; height: number }
  props?: Record<string, unknown> // Store props for restoration
}

// Serializable window state (without ReactNode component)
interface SerializableWindowState {
  id: string
  title: string
  titleKey?: string
  icon?: string
  isOpen: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  isMaximized?: boolean
  isMinimized?: boolean
  savedPosition?: { x: number; y: number }
  savedSize?: { width: number; height: number }
  props?: Record<string, unknown>
}

const WINDOW_STATE_KEY = "vc83_window_state"

interface WindowManagerContextType {
  windows: Window[]
  openWindow: (id: string, title: string, component: ReactNode, position?: { x: number; y: number }, size?: { width: number; height: number }, titleKey?: string, icon?: string, props?: Record<string, unknown>) => void
  closeWindow: (id: string) => void
  closeAllWindows: () => void
  focusWindow: (id: string) => void
  resizeWindow: (id: string, size: { width: number; height: number }) => void
  moveWindow: (id: string, position: { x: number; y: number }) => void
  maximizeWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  restoreWindow: (id: string) => void
  isWindowOpen: (id: string) => boolean
  isRestored: boolean
}

const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined)

// Maximum z-index for windows to ensure Start Menu (z-index: 50000) stays on top
const MAX_WINDOW_Z_INDEX = 10000

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<Window[]>([])
  const [nextZIndex, setNextZIndex] = useState(100)
  // Use a ref for synchronous z-index tracking to avoid stale closure issues
  // This ensures each focusWindow call gets a unique z-index even before React re-renders
  const nextZIndexRef = useRef(100)
  const [cascadeOffset, setCascadeOffset] = useState({ x: 100, y: 100 })
  const [isRestored, setIsRestored] = useState(false)

  // Restore windows from sessionStorage on mount
  useEffect(() => {
    if (typeof window === "undefined" || isRestored) return

    try {
      const savedState = sessionStorage.getItem(WINDOW_STATE_KEY)
      if (!savedState) {
        setIsRestored(true)
        return
      }

      const parsed: {
        windows: SerializableWindowState[]
        nextZIndex: number
        cascadeOffset: { x: number; y: number }
      } = JSON.parse(savedState)

      // Restore windows by recreating components from registry
      const restoredWindows: Window[] = []
      for (const savedWindow of parsed.windows) {
        const factory = getWindowFactory(savedWindow.id)
        if (factory) {
          const component = (
            <Suspense fallback={<div>Loading...</div>}>
              {factory.createComponent(savedWindow.props)}
            </Suspense>
          )
          restoredWindows.push({
            ...savedWindow,
            component
          })
        }
      }

      if (restoredWindows.length > 0) {
        // Cap nextZIndex to prevent it from exceeding Start Menu z-index (50000)
        // This can happen over many sessions as the counter accumulates
        const cappedNextZIndex = Math.min(parsed.nextZIndex, MAX_WINDOW_Z_INDEX)

        // Normalize window z-indices if they exceed the cap
        const normalizedWindows = restoredWindows.map(w => ({
          ...w,
          zIndex: Math.min(w.zIndex, MAX_WINDOW_Z_INDEX - 1)
        }))

        setWindows(normalizedWindows)
        setNextZIndex(cappedNextZIndex)
        nextZIndexRef.current = cappedNextZIndex // Sync the ref
        setCascadeOffset(parsed.cascadeOffset)
      }
    } catch (error) {
      console.error("Failed to restore window state:", error)
      // Clear invalid state
      sessionStorage.removeItem(WINDOW_STATE_KEY)
    } finally {
      setIsRestored(true)
    }
  }, [isRestored])

  // Save windows to sessionStorage whenever they change
  useEffect(() => {
    if (typeof window === "undefined" || !isRestored) return

    try {
      // Convert windows to serializable format
      // Filter out tutorial windows (they have callbacks that can't be serialized)
      const serializableWindows: SerializableWindowState[] = windows
        .filter(w => !w.id.startsWith('tutorial-')) // Tutorial windows have non-serializable callbacks
        .map(w => ({
          id: w.id,
          title: w.title,
          titleKey: w.titleKey,
          icon: w.icon,
          isOpen: w.isOpen,
          position: w.position,
          size: w.size,
          zIndex: w.zIndex,
          isMaximized: w.isMaximized,
          isMinimized: w.isMinimized,
          savedPosition: w.savedPosition,
          savedSize: w.savedSize,
          props: w.props
        }))

      const state = {
        windows: serializableWindows,
        nextZIndex,
        cascadeOffset
      }

      sessionStorage.setItem(WINDOW_STATE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error("Failed to save window state:", error)
    }
  }, [windows, nextZIndex, cascadeOffset, isRestored])

  const openWindow = (id: string, title: string, component: ReactNode, position?: { x: number; y: number }, size?: { width: number; height: number }, titleKey?: string, icon?: string, props?: Record<string, unknown>) => {
    // Get the current z-index synchronously from the ref to avoid stale closure issues
    const currentZIndex = nextZIndexRef.current
    nextZIndexRef.current = Math.min(nextZIndexRef.current + 1, MAX_WINDOW_Z_INDEX)

    setWindows((prev) => {
      const existing = prev.find((w) => w.id === id)
      if (existing) {
        // Focus existing window
        return prev.map((w) => (w.id === id ? { ...w, isOpen: true, zIndex: currentZIndex } : w))
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
          titleKey, // Store the translation key if provided
          icon, // Store the icon if provided
          component,
          isOpen: true,
          position: windowPosition,
          size: size || { width: 800, height: 500 },
          zIndex: currentZIndex,
          isMaximized: false,
          isMinimized: false,
          props, // Store props for restoration
        },
      ]
    })
    setNextZIndex(nextZIndexRef.current) // Sync state with ref
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
    // Get the current z-index synchronously from the ref to avoid stale closure issues
    const currentZIndex = nextZIndexRef.current
    nextZIndexRef.current = Math.min(nextZIndexRef.current + 1, MAX_WINDOW_Z_INDEX)

    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, zIndex: currentZIndex } : w)))
    setNextZIndex(nextZIndexRef.current) // Sync state with ref
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
    // Get the current z-index synchronously from the ref to avoid stale closure issues
    const currentZIndex = nextZIndexRef.current
    nextZIndexRef.current = Math.min(nextZIndexRef.current + 1, MAX_WINDOW_Z_INDEX)

    setWindows((prev) => prev.map((w) => {
      if (w.id === id) {
        return {
          ...w,
          isMaximized: false,
          isMinimized: false,
          position: w.savedPosition || w.position || { x: 100, y: 100 },
          size: w.savedSize || w.size || { width: 800, height: 500 },
          zIndex: currentZIndex
        }
      }
      return w
    }))
    setNextZIndex(nextZIndexRef.current) // Sync state with ref
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
        isRestored,
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