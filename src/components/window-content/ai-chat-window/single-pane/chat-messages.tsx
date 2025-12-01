"use client"

import { useEffect, useRef } from "react"
import { SystemMessage } from "./message-types/system-message"
import { UserMessage } from "./message-types/user-message"
import { AssistantMessage } from "./message-types/assistant-message"
import { TypingIndicator } from "./message-types/typing-indicator"

// TODO: Replace with actual conversation data from Convex
const MOCK_MESSAGES = [
  {
    id: "1",
    role: "system" as const,
    content: "Welcome! I'm your AI assistant. I can help with emails, CRM, forms, events, and more. What would you like to do today?"
  }
]

export function ChatMessages() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messages = MOCK_MESSAGES
  const isTyping = false // TODO: Connect to actual typing state

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

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
