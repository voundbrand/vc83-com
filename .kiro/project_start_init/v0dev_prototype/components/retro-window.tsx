"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface RetroWindowProps {
  title: string
  children: ReactNode
  className?: string
  draggable?: boolean
  closable?: boolean
  onClose?: () => void
}

export function RetroWindow({
  title,
  children,
  className,
  draggable = false,
  closable = false,
  onClose,
}: RetroWindowProps) {
  return (
    <div className={cn("retro-window dark:retro-window-dark rounded-none", draggable && "cursor-move", className)}>
      {/* Window Title Bar */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-2 py-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 border border-gray-400 flex items-center justify-center text-xs">📁</div>
          <span className="font-pixel text-xs">{title}</span>
        </div>
        <div className="flex gap-1">
          <button className="w-4 h-4 bg-gray-300 border border-gray-400 text-xs text-gray-800 hover:bg-gray-200">
            _
          </button>
          <button className="w-4 h-4 bg-gray-300 border border-gray-400 text-xs text-gray-800 hover:bg-gray-200">
            □
          </button>
          {closable && (
            <button
              onClick={onClose}
              className="w-4 h-4 bg-gray-300 border border-gray-400 text-xs text-gray-800 hover:bg-red-200"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Window Content */}
      <div className="p-4 text-gray-800 dark:text-gray-200">{children}</div>
    </div>
  )
}
