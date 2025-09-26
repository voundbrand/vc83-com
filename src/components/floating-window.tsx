"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useWindowManager } from "@/hooks/use-window-manager"

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setIsDragging(true)
      focusWindow(id)
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
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

  return (
    <div
      ref={windowRef}
      className={`fixed bg-gray-200 dark:bg-gray-800 border-2 border-gray-400 shadow-lg ${className}`}
      style={{
        left: position.x,
        top: position.y,
        zIndex: zIndex,
        cursor: isDragging ? "grabbing" : "default",
      }}
      onClick={() => focusWindow(id)}
    >
      {/* Title Bar */}
      <div
        className="bg-gradient-to-r from-purple-600 to-purple-700 px-2 py-1 flex items-center justify-between cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <span className="font-pixel text-xs text-white select-none">{title}</span>
        <div className="flex gap-1">
          <button className="w-4 h-4 bg-gray-300 border border-gray-500 flex items-center justify-center text-gray-800 text-xs hover:bg-gray-400">
            _
          </button>
          <button className="w-4 h-4 bg-gray-300 border border-gray-500 flex items-center justify-center text-gray-800 text-xs hover:bg-gray-400">
            □
          </button>
          <button
            className="w-4 h-4 bg-gray-300 border border-gray-500 flex items-center justify-center text-gray-800 text-xs hover:bg-red-400"
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
      <div className="p-4 text-gray-800 dark:text-gray-200">{children}</div>
    </div>
  )
}