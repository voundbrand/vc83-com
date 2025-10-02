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
    <div
      className={cn("retro-window window-corners dark:retro-window-dark", draggable && "cursor-move", className)}
    >
      {/* Window Title Bar */}
      <div
        className="retro-titlebar window-titlebar-corners px-2 py-1 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 border flex items-center justify-center text-xs rounded"
            style={{
              background: 'var(--win95-window-icon-bg)',
              borderColor: 'var(--win95-window-icon-border)'
            }}
          >📁</div>
          <span className="font-pixel" style={{ color: 'var(--win95-titlebar-text)' }}>{title}</span>
        </div>
        <div className="flex gap-[2px]">
          <button className="retro-control-button" title="Minimize">
            <span className="select-none">−</span>
          </button>
          <button className="retro-control-button" title="Maximize">
            <span className="select-none">□</span>
          </button>
          {closable && (
            <button
              onClick={onClose}
              className="retro-control-button"
              title="Close"
            >
              <span className="select-none">×</span>
            </button>
          )}
        </div>
      </div>

      {/* Window Content */}
      <div className="p-4">{children}</div>
    </div>
  )
}