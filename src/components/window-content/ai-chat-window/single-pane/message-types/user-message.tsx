"use client"

import { ShellProfileIcon } from "@/components/icons/shell-icons"
import {
  CHAT_MESSAGE_TEXT_LEADING_CLASS,
  CHAT_MESSAGE_X_SCROLL_FALLBACK_CLASS,
} from "../../message-content-styles"

interface UserMessageProps {
  content: string
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex min-w-0 justify-end">
      <div
        className="max-w-[75%] min-w-0 rounded border-2 px-4 py-2 text-sm"
        style={{
          borderColor: 'var(--shell-border)',
          background: 'var(--shell-selection-bg)',
          color: 'var(--shell-selection-text)',
          borderStyle: 'outset'
        }}
      >
        <div className="flex min-w-0 items-start gap-2">
          <div className={`flex-1 ${CHAT_MESSAGE_X_SCROLL_FALLBACK_CLASS}`}>
            <div className={CHAT_MESSAGE_TEXT_LEADING_CLASS}>{content}</div>
          </div>
          <span className="flex h-5 w-5 items-center justify-center">
            <ShellProfileIcon size={16} tone="active" />
          </span>
        </div>
      </div>
    </div>
  )
}
