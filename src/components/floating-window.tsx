"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useWindowManager } from "@/hooks/use-window-manager"
import { useIsMobile } from "@/hooks/use-media-query"
import { MobilePanel } from "./mobile-panel"

interface FloatingWindowProps {
  id: string
  title: string
  children: React.ReactNode
  className?: string
  initialPosition?: { x: number; y: number }
  zIndex: number
}

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
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const windowRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

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

        // Viewport constraints - prevent dragging behind taskbar
        const maxX = window.innerWidth - (windowState?.size?.width || 800)
        const maxY = window.innerHeight - taskbarHeight - (windowState?.size?.height || 500)

        moveWindow(id, {
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
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
  }, [isDragging, isResizing, dragOffset, resizeStart, id, moveWindow, resizeWindow, windowState])

  // Use MobilePanel on mobile devices
  if (isMobile) {
    return (
      <MobilePanel 
        windowType={id} 
        title={title}
        className={className}
      >
        {children}
      </MobilePanel>
    )
  }

  return (
    <div
      ref={windowRef}
      className={`fixed retro-window window-corners flex flex-col ${isDragging ? 'window-drag-shadow' : ''} ${className}`}
      style={{
        left: windowState?.position?.x || initialPosition.x,
        top: windowState?.position?.y || initialPosition.y,
        width: windowState?.isMaximized ? '100%' : (windowState?.size?.width || 800) + 'px',
        height: windowState?.isMaximized ? 'calc(100vh - var(--taskbar-height, 48px))' : (windowState?.size?.height || 500) + 'px',
        maxHeight: windowState?.isMaximized ? 'calc(100vh - var(--taskbar-height, 48px))' : 'calc(90vh - var(--taskbar-height, 48px))',
        zIndex: windowState?.zIndex || zIndex,
        cursor: isDragging ? "grabbing" : "default",
        opacity: isDragging || isResizing ? 0.95 : 1,
        transition: isDragging || isResizing ? "none" : "opacity 0.2s",
        display: windowState?.isMinimized ? 'none' : 'flex',
      }}
      onClick={() => focusWindow(id)}
    >
      {/* Title Bar - Classic Win95 Blue */}
      <div
        className={`retro-titlebar window-titlebar-corners flex items-center justify-between ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
        onMouseDown={handleMouseDown}
      >
        <span className="text-white font-semibold text-sm select-none">{title}</span>
        <div className="flex gap-[2px]">
          {/* Minimize Button */}
          <button
            className="retro-control-button"
            onClick={(e) => {
              e.stopPropagation()
              minimizeWindow(id)
            }}
            title="Minimize"
          >
            <span className="select-none">−</span>
          </button>
          {/* Maximize/Restore Button */}
          <button
            className="retro-control-button"
            onClick={(e) => {
              e.stopPropagation()
              if (windowState?.isMaximized) {
                restoreWindow(id)
              } else {
                maximizeWindow(id)
              }
            }}
            title={windowState?.isMaximized ? "Restore" : "Maximize"}
          >
            <span className="select-none">{windowState?.isMaximized ? "⧉" : "□"}</span>
          </button>
          {/* Close Button */}
          <button
            className="retro-control-button"
            onClick={(e) => {
              e.stopPropagation()
              closeWindow(id)
            }}
            title="Close"
          >
            <span className="select-none">×</span>
          </button>
        </div>
      </div>

      {/* Content - Apply global window background */}
      <div className="flex-1 overflow-hidden flex flex-col retro-scrollbar" style={{ background: 'var(--win95-bg)', color: 'var(--win95-text)' }}>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>

      {/* Resize Handle - Win95 style grip */}
      {!windowState?.isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeMouseDown}
          style={{
            background: 'repeating-linear-gradient(45deg, #808080 0px, #808080 2px, transparent 2px, transparent 4px)',
          }}
        />
      )}
    </div>
  )
}
