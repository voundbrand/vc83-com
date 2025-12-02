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

  // Show welcome message if no messages yet
  const displayMessages = messages.length === 0
    ? [{
        _id: "welcome",
        role: "system" as const,
        content: t("ui.ai_assistant.welcome.message"),
        timestamp: Date.now(),
        conversationId: "" as any,
      }]
    : messages

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [displayMessages.length, isSending])

  if (translationsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--win95-bg)' }}>
        <div style={{ color: 'var(--neutral-gray)' }} className="text-sm">
          {t("ui.ai_assistant.loading.translations")}
        </div>
      </div>
    )
  }

  if (chat.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--win95-bg)' }}>
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
        background: 'var(--win95-bg)',
        color: 'var(--win95-text)'
      }}
    >
      {displayMessages.map((message) => {
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
