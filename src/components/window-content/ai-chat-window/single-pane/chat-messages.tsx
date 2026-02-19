"use client"

import { useEffect, useRef } from "react"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { SystemMessage } from "./message-types/system-message"
import { UserMessage } from "./message-types/user-message"
import { AssistantMessage } from "./message-types/assistant-message"
import { TypingIndicator } from "./message-types/typing-indicator"

export function ChatMessages() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.ai_assistant")
  const { chat, isSending } = useAIChatContext()

  // Get messages from the current conversation
  const messages = chat.messages || []
  const displayMessages = messages

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [displayMessages.length, isSending])

  if (translationsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--shell-surface)' }}>
        <div style={{ color: 'var(--neutral-gray)' }} className="text-sm">
          {t("ui.ai_assistant.loading.translations")}
        </div>
      </div>
    )
  }

  if (chat.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--shell-surface)' }}>
        <div style={{ color: 'var(--neutral-gray)' }} className="text-sm">
          Loading conversation...
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex-1 overflow-y-auto p-4 space-y-4"
      style={{
        background: 'var(--shell-surface)',
        color: 'var(--shell-text)'
      }}
    >
      {displayMessages.length === 0 && (
        <div
          className="text-xs px-3 py-2 border rounded"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-surface-elevated)",
            color: "var(--neutral-gray)"
          }}
        >
          Start a chat to run the platform agent runtime. Daily free credits apply automatically.
        </div>
      )}

      {displayMessages.map((message: any) => {
        if (message.role === "system") {
          return <SystemMessage key={message._id} content={message.content} />
        }
        if (message.role === "user") {
          return <UserMessage key={message._id} content={message.content} />
        }
        if (message.role === "assistant") {
          return <AssistantMessage key={message._id} content={message.content} />
        }
        return null
      })}

      {isSending && <TypingIndicator />}

      <div ref={messagesEndRef} />
    </div>
  )
}
