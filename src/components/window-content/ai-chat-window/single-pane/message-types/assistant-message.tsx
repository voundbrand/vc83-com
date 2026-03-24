"use client"

import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { ShellBotIcon } from "@/components/icons/shell-icons"
import { ChatMarkdownMessage } from "../../chat-markdown-message"

interface AssistantMessageProps {
  content: string
  toolExecution?: {
    status: "running" | "success" | "error"
    message: string
  }
  quickActions?: Array<{
    label: string
    onClick: () => void
  }>
}

export function AssistantMessage({ content, toolExecution, quickActions }: AssistantMessageProps) {
  return (
    <div className="flex min-w-0 justify-start">
      <div
        className="max-w-[75%] min-w-0 rounded border-2 px-4 py-2 text-sm"
        style={{
          borderColor: 'var(--shell-border)',
          background: 'var(--shell-surface-elevated)',
          color: 'var(--shell-text)',
          borderStyle: 'inset'
        }}
      >
        <div className="flex min-w-0 items-start gap-2">
          <span className="flex h-5 w-5 items-center justify-center">
            <ShellBotIcon size={16} tone="active" />
          </span>
          <div className="flex-1 min-w-0 space-y-2">
            <ChatMarkdownMessage content={content} />

            {/* Tool execution status */}
            {toolExecution && (
              <div
                className="px-3 py-2 rounded border text-xs flex items-center gap-2"
                style={{
                  borderColor: 'var(--shell-border)',
                  background: toolExecution.status === "running" ? 'var(--shell-surface)' :
                             toolExecution.status === "success" ? 'var(--success)' :
                             'var(--error)',
                  color: toolExecution.status === "running" ? 'var(--shell-text)' : '#ffffff'
                }}
              >
                {toolExecution.status === "running" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {toolExecution.status === "success" && <CheckCircle2 className="w-3.5 h-3.5" />}
                {toolExecution.status === "error" && <XCircle className="w-3.5 h-3.5" />}
                <span>{toolExecution.message}</span>
              </div>
            )}

            {/* Quick actions */}
            {quickActions && quickActions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={action.onClick}
                    className="desktop-shell-button px-3 py-1 text-xs"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
