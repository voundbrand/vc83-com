"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useWindowManager } from "@/hooks/use-window-manager"
import { useIsDesktopShellFallback, useIsMobile } from "@/hooks/use-media-query"
import { useMultipleNamespaces } from "@/hooks/use-namespace-translations"
import {
  ShellCloseIcon,
  ShellMaximizeIcon,
  ShellMinimizeIcon,
  ShellRestoreIcon,
} from "@/components/icons/shell-icons"
import {
  SHELL_MOTION,
  buildShellTransition,
  useReducedMotionPreference,
} from "@/lib/motion"
import { MobilePanel } from "./mobile-panel"

interface FloatingWindowProps {
  id: string
  title: string
  children: React.ReactNode
  className?: string
  initialPosition?: { x: number; y: number }
  zIndex: number
}

const MIN_VISIBLE_CONTENT_PX = 120

export function FloatingWindow({
  id,
  title,
  children,
  className = "",
  initialPosition = { x: 100, y: 100 },
  zIndex,
}: FloatingWindowProps) {
  const { windows, closeWindow, focusWindow, resizeWindow, moveWindow, maximizeWindow, minimizeWindow, restoreWindow } = useWindowManager()
  const windowState = windows.find(w => w.id === id)
  const { t } = useMultipleNamespaces(["ui.start_menu", "ui.app", "ui.windows"])
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const windowRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const isCompactViewport = useIsDesktopShellFallback()
  const prefersReducedMotion = useReducedMotionPreference()
  const [hasEntered, setHasEntered] = useState(prefersReducedMotion)

  // Get the translated title if a titleKey is provided in windowState
  const displayTitle = windowState?.titleKey ? t(windowState.titleKey) : title
  const isClosing = Boolean(windowState?.isClosing)

  useEffect(() => {
    if (prefersReducedMotion) {
      setHasEntered(true)
      return
    }

    setHasEntered(false)
    const rafId = window.requestAnimationFrame(() => {
      setHasEntered(true)
    })

    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [id, prefersReducedMotion])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (windowState?.isMaximized) return
    e.preventDefault()
    setIsDragging(true)
    const pos = windowState?.position || initialPosition
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    })
    focusWindow(id)
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (windowState?.isMaximized) return
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    const size = windowState?.size || { width: 800, height: 500 }
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    })
    focusWindow(id)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x
        const newY = e.clientY - dragOffset.y

        // Get taskbar height from CSS variable or default to 48px
        const taskbarHeight = parseInt(
          getComputedStyle(document.documentElement)
            .getPropertyValue('--taskbar-height')
            .replace('px', '')
        ) || 48

        // Get actual rendered window dimensions (accounting for max-size constraints)
        const actualWidth = windowRef.current?.offsetWidth || windowState?.size?.width || 800
        const actualHeight = windowRef.current?.offsetHeight || windowState?.size?.height || 500
        const titleBarHeight =
          windowRef.current?.querySelector<HTMLElement>(".desktop-window-titlebar")?.offsetHeight || 34

        const minY = isMobile ? 0 : taskbarHeight
        const bottomReserved = isMobile ? taskbarHeight : 0

        // Keep the title bar and a small content strip visible when dragging near the bottom edge.
        const minVisibleWindowHeight = Math.min(actualHeight, titleBarHeight + MIN_VISIBLE_CONTENT_PX)

        // Viewport constraints - allow large windows to move lower while keeping recovery affordance visible.
        const maxX = Math.max(0, window.innerWidth - actualWidth)
        const maxY = Math.max(minY, window.innerHeight - bottomReserved - minVisibleWindowHeight)

        moveWindow(id, {
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(minY, Math.min(newY, maxY)),
        })
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x
        const deltaY = e.clientY - resizeStart.y

        resizeWindow(id, {
          width: resizeStart.width + deltaX,
          height: resizeStart.height + deltaY,
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, isResizing, dragOffset, resizeStart, id, isMobile, moveWindow, resizeWindow, windowState])

  // Use MobilePanel on mobile devices
  if (isCompactViewport) {
    return (
      <MobilePanel
        windowId={id}
        title={displayTitle}
        zIndex={windowState?.zIndex || zIndex}
        className={className}
      >
        {children}
      </MobilePanel>
    )
  }

  const enableShellMotion = !prefersReducedMotion && !isDragging && !isResizing
  const shellOpacity = isDragging || isResizing
    ? 0.95
    : enableShellMotion
      ? isClosing
        ? 0
        : hasEntered
          ? 1
          : 0
      : 1
  const shellTransform = enableShellMotion
    ? isClosing
      ? "translate3d(0, 8px, 0) scale(0.97)"
      : hasEntered
        ? "translate3d(0, 0, 0) scale(1)"
        : "translate3d(0, 12px, 0) scale(0.96)"
    : "translate3d(0, 0, 0) scale(1)"
  const shellTransition = isDragging || isResizing
    ? "none"
    : [
      buildShellTransition("opacity", SHELL_MOTION.durationMs.base, prefersReducedMotion),
      buildShellTransition("transform", SHELL_MOTION.durationMs.base, prefersReducedMotion, SHELL_MOTION.easing.emphasized),
      buildShellTransition("box-shadow", SHELL_MOTION.durationMs.fast, prefersReducedMotion),
    ].join(", ")

  return (
    <div
      ref={windowRef}
      className={`fixed desktop-shell-window desktop-window-shell window-corners flex flex-col ${isDragging ? 'window-drag-shadow' : ''} ${className}`}
      style={{
        left: windowState?.position?.x || initialPosition.x,
        top: windowState?.isMaximized
          ? (isMobile ? "0px" : "var(--taskbar-height, 48px)")
          : `${Math.max(
            windowState?.position?.y || initialPosition.y,
            isMobile ? 0 : 48,
          )}px`,
        width: windowState?.isMaximized ? '100%' : (windowState?.size?.width || 800) + 'px',
        height: windowState?.isMaximized ? 'calc(100vh - var(--taskbar-height, 48px))' : (windowState?.size?.height || 500) + 'px',
        maxHeight: windowState?.isMaximized ? 'calc(100vh - var(--taskbar-height, 48px))' : 'calc(90vh - var(--taskbar-height, 48px))',
        zIndex: windowState?.zIndex || zIndex,
        cursor: isDragging ? "grabbing" : "default",
        opacity: shellOpacity,
        transform: shellTransform,
        transformOrigin: "50% 50%",
        transition: shellTransition,
        willChange: isDragging
          ? "left, top, opacity"
          : isResizing
            ? "width, height, opacity"
            : "opacity, transform",
        display: windowState?.isMinimized ? 'none' : 'flex',
        pointerEvents: isClosing ? "none" : "auto",
      }}
      onMouseDownCapture={() => focusWindow(id)}
    >
      {/* Title Bar */}
      <div
        className={`desktop-shell-titlebar desktop-window-titlebar window-titlebar-corners flex items-center justify-between ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
        onMouseDown={handleMouseDown}
      >
        <span className="font-semibold text-sm select-none truncate pr-2" style={{ color: 'var(--shell-titlebar-text)' }}>
          {displayTitle}
        </span>
        <div className="flex gap-1">
          {/* Minimize Button */}
          <button
            className="desktop-shell-control-button desktop-window-control desktop-window-minimize-btn"
            onClick={(e) => {
              e.stopPropagation()
              minimizeWindow(id)
            }}
            title="Minimize"
            aria-label="Minimize window"
          >
            <ShellMinimizeIcon size={14} tone="active" />
          </button>
          {/* Maximize/Restore Button */}
          <button
            className="desktop-shell-control-button desktop-window-control desktop-window-maximize-btn"
            onClick={(e) => {
              e.stopPropagation()
              if (windowState?.isMaximized) {
                restoreWindow(id)
              } else {
                maximizeWindow(id)
              }
            }}
            title={windowState?.isMaximized ? "Restore" : "Maximize"}
            aria-label={windowState?.isMaximized ? "Restore window" : "Maximize window"}
          >
            {windowState?.isMaximized
              ? <ShellRestoreIcon size={13} tone="active" />
              : <ShellMaximizeIcon size={13} tone="active" />}
          </button>
          {/* Close Button */}
          <button
            className="desktop-shell-control-button desktop-window-control desktop-window-control-close desktop-window-close-btn"
            onClick={(e) => {
              e.stopPropagation()
              closeWindow(id)
            }}
            title="Close"
            aria-label="Close window"
          >
            <ShellCloseIcon size={14} tone="active" />
          </button>
        </div>
      </div>

      {/* Content - Use a consistent light document surface across desktop modes */}
      <div className="flex-1 overflow-hidden flex flex-col retro-scrollbar desktop-document-surface">
        <div className="flex-1 overflow-auto">{children}</div>
      </div>

      {/* Resize Handle - Win95 style grip */}
      {!windowState?.isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeMouseDown}
          style={{
            background: 'var(--window-resize-grip, repeating-linear-gradient(45deg, #808080 0px, #808080 2px, transparent 2px, transparent 4px))',
          }}
        />
      )}
    </div>
  )
}
