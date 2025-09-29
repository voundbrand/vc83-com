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
  const { closeWindow, focusWindow } = useWindowManager()
  const [position, setPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const windowRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
    focusWindow(id)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x
        const newY = e.clientY - dragOffset.y
        
        // Viewport constraints
        const maxX = window.innerWidth - (windowRef.current?.offsetWidth || 400)
        const maxY = window.innerHeight - (windowRef.current?.offsetHeight || 300)
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, dragOffset])

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
      className={`fixed retro-window dark:retro-window-dark rounded-none ${isDragging ? 'window-drag-shadow' : ''} ${className}`}
      style={{
        left: position.x,
        top: position.y,
        zIndex: zIndex,
        cursor: isDragging ? "grabbing" : "default",
        opacity: isDragging ? 0.95 : 1,
        transition: isDragging ? "none" : "opacity 0.2s",
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
          <button className="w-3 h-3 bg-gray-300 border border-gray-500 text-[10px] leading-none text-gray-800 hover:bg-gray-200 flex items-center justify-center font-bold">
            _
          </button>
          <button className="w-3 h-3 bg-gray-300 border border-gray-500 text-[10px] leading-none text-gray-800 hover:bg-gray-200 flex items-center justify-center font-bold">
            □
          </button>
          <button
            className="w-3 h-3 bg-gray-300 border border-gray-500 text-[10px] leading-none text-gray-800 hover:bg-red-200 flex items-center justify-center font-bold"
            onClick={(e) => {
              e.stopPropagation()
              closeWindow(id)
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">{children}</div>
    </div>
  )
}