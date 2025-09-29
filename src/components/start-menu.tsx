"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-media-query"

interface StartMenuItem {
  label?: string
  icon?: string
  onClick?: () => void
  divider?: boolean
}

interface StartMenuProps {
  items: StartMenuItem[]
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function StartMenu({ items, isOpen, onClose, className }: StartMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Don't close if clicking the START button itself
        const startButton = document.querySelector('[data-start-button]')
        if (startButton && startButton.contains(event.target as Node)) {
          return
        }
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className={cn(
        "absolute bottom-full left-0 mb-1 retro-window dark:retro-window-dark shadow-lg z-50",
        isMobile ? "w-full rounded-none start-menu-mobile" : "min-w-[200px]",
        className
      )}
    >
      <div className="py-1">
        {items.map((item, index) => (
          <div key={index}>
            {item.divider ? (
              <div className="h-[2px] mx-1 my-1 bg-gray-400 dark:bg-gray-600 border-t border-gray-600 dark:border-gray-700 border-b border-white dark:border-gray-500" />
            ) : (
              <button
                onClick={() => {
                  item.onClick?.()
                  onClose()
                }}
                className="w-full px-3 py-1 text-left hover:bg-purple-600 hover:text-white flex items-center gap-2 transition-colors font-pixel"
              >
                {item.icon && <span className="text-base">{item.icon}</span>}
                <span>{item.label || ''}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}