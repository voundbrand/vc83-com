"use client"

import { useEffect, useRef } from "react"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { SystemMessage } from "./message-types/system-message"
import { UserMessage } from "./message-types/user-message"
import { AssistantMessage } from "./message-types/assistant-message"
import { TypingIndicator } from "./message-types/typing-indicator"

export function ChatMessages() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { t, isLoading } = useNamespaceTranslations("ui.ai_assistant")
  const isTyping = false // TODO: Connect to actual typing state

  // TODO: Replace with actual conversation data from Convex
  const messages = [
    {
      id: "1",
      role: "system" as const,
      content: t("ui.ai_assistant.welcome.message")
    }
  ]

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--win95-bg)' }}>
        <div style={{ color: 'var(--neutral-gray)' }} className="text-sm">
          {t("ui.ai_assistant.loading.translations")}
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
      {messages.map((message) => {
        if (message.role === "system") {
          return <SystemMessage key={message.id} content={message.content} />
        }
        if (message.role === "user") {
          return <UserMessage key={message.id} content={message.content} />
        }
        if (message.role === "assistant") {
          return <AssistantMessage key={message.id} content={message.content} />
        }
        return null
      })}

      {isTyping && <TypingIndicator />}

      <div ref={messagesEndRef} />
    </div>
  )
}
