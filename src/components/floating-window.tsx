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
        
        // Viewport constraints
        const maxX = window.innerWidth - (windowState?.size?.width || 800)
        const maxY = window.innerHeight - (windowState?.size?.height || 500)
        
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
      className={`fixed retro-window dark:retro-window-dark rounded-none flex flex-col ${isDragging ? 'window-drag-shadow' : ''} ${className}`}
      style={{
        left: windowState?.position?.x || initialPosition.x,
        top: windowState?.position?.y || initialPosition.y,
        width: windowState?.isMaximized ? '100%' : (windowState?.size?.width || 800) + 'px',
        height: windowState?.isMaximized ? 'calc(100vh - 40px)' : (windowState?.size?.height || 500) + 'px',
        maxHeight: windowState?.isMaximized ? 'calc(100vh - 40px)' : '90vh',
        zIndex: windowState?.zIndex || zIndex,
        cursor: isDragging ? "grabbing" : "default",
        opacity: isDragging || isResizing ? 0.95 : 1,
        transition: isDragging || isResizing ? "none" : "opacity 0.2s",
        display: windowState?.isMinimized ? 'none' : 'flex',
      }}
      onClick={() => focusWindow(id)}
    >
      {/* Title Bar */}
      <div
        className={`bg-gradient-to-r from-purple-600 to-purple-700 text-white px-2 py-1 flex items-center justify-between ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
        onMouseDown={handleMouseDown}
      >
        <span className="font-pixel text-white select-none">{title}</span>
        <div className="flex gap-1">
          <button 
            className="w-3 h-3 bg-gray-300 border border-gray-500 text-[10px] leading-none text-gray-800 hover:bg-gray-200 flex items-center justify-center font-bold"
            onClick={(e) => {
              e.stopPropagation()
              minimizeWindow(id)
            }}
            title="Minimize"
          >
            _
          </button>
          <button 
            className="w-3 h-3 bg-gray-300 border border-gray-500 text-[10px] leading-none text-gray-800 hover:bg-gray-200 flex items-center justify-center font-bold"
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
            □
          </button>
          <button
            className="w-3 h-3 bg-gray-300 border border-gray-500 text-[10px] leading-none text-gray-800 hover:bg-red-200 flex items-center justify-center font-bold"
            onClick={(e) => {
              e.stopPropagation()
              closeWindow(id)
            }}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 p-4 overflow-auto">{children}</div>
      </div>

      {/* Resize Handle */}
      {!windowState?.isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeMouseDown}
          style={{
            background: 'linear-gradient(135deg, transparent 50%, #666 50%)',
          }}
        />
      )}
    </div>
  )
}