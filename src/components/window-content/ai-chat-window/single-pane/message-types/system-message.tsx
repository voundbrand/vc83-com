"use client"

import { ShellAboutIcon } from "@/components/icons/shell-icons"

interface SystemMessageProps {
  content: string
}

export function SystemMessage({ content }: SystemMessageProps) {
  return (
    <div className="flex justify-center">
      <div
        className="px-4 py-2 rounded border-2 max-w-[80%] text-center text-sm"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)',
          color: 'var(--win95-text)'
        }}
      >
        <div className="flex items-start gap-2">
          <span className="flex h-5 w-5 items-center justify-center">
            <ShellAboutIcon size={16} tone="active" />
          </span>
          <div className="flex-1 leading-relaxed">{content}</div>
        </div>
      </div>
    </div>
  )
}
