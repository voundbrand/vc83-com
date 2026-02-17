"use client"

import { ShellBotIcon } from "@/components/icons/shell-icons"

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="px-4 py-3 rounded border-2"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)',
          borderStyle: 'inset'
        }}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center">
            <ShellBotIcon size={16} tone="active" />
          </span>
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--neutral-gray)', animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--neutral-gray)', animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--neutral-gray)', animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
