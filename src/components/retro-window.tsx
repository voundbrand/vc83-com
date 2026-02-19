"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { ShellPackageIcon } from "@/components/icons/shell-icons"

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
      className={cn("desktop-shell-window window-corners", draggable && "cursor-move", className)}
    >
      {/* Window Title Bar */}
      <div
        className="desktop-shell-titlebar window-titlebar-corners px-2 py-1 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 border flex items-center justify-center text-xs rounded"
            style={{
              background: 'var(--shell-window-icon-bg)',
              borderColor: 'var(--shell-window-icon-border)'
            }}
          >
            <ShellPackageIcon size={12} tone="active" />
          </div>
          <span className="font-pixel" style={{ color: 'var(--shell-titlebar-text)' }}>{title}</span>
        </div>
        <div className="flex gap-[2px]">
          <button className="desktop-shell-control-button" title="Minimize">
            <span className="select-none">−</span>
          </button>
          <button className="desktop-shell-control-button" title="Maximize">
            <span className="select-none">□</span>
          </button>
          {closable && (
            <button
              onClick={onClose}
              className="desktop-shell-control-button"
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
