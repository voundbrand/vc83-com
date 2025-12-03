"use client"

import { useEffect, useRef } from "react"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { SystemMessage } from "../single-pane/message-types/system-message"
import { Sparkles } from "lucide-react"

// User Message Component - LEFT SIDE (flipped from original)
function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-start">
      <div
        className="px-4 py-2 rounded border-2 max-w-[75%] text-sm"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-bg-light)',
          color: 'var(--win95-text)',
          borderStyle: 'inset'
        }}
      >
        <div className="flex items-start gap-2">
          <span className="text-base">👤</span>
          <div className="flex-1 leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </div>
        </div>
      </div>
    </div>
  )
}

// Assistant Message Component - RIGHT SIDE (flipped from original)
function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div
        className="px-4 py-2 rounded border-2 max-w-[75%] text-sm"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-selected-bg)',
          color: 'var(--win95-selected-text)',
          borderStyle: 'outset'
        }}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </div>
          <span className="text-base">🤖</span>
        </div>
      </div>
    </div>
  )
}

// Thinking Indicator - shows while AI is responding
function ThinkingIndicator() {
  return (
    <div className="flex justify-end">
      <div
        className="px-4 py-2 rounded border-2 text-sm flex items-center gap-2"
        style={{
          borderColor: 'var(--win95-border)',
          background: 'var(--win95-selected-bg)',
          color: 'var(--win95-selected-text)',
          borderStyle: 'outset'
        }}
      >
        <Sparkles className="w-4 h-4 animate-pulse" />
        <span className="text-xs italic">Thinking...</span>
        <span className="text-base">🤖</span>
      </div>
    </div>
  )
}

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

  // Loading translations - show minimal loading state
  if (translationsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--win95-bg)' }}>
        <div style={{ color: 'var(--neutral-gray)' }} className="text-sm">
          {t("ui.ai_assistant.loading.translations")}
        </div>
      </div>
    )
  }

  // NO MORE LOADING SCREEN FOR CONVERSATION - optimistic UI!
  // Messages are displayed immediately, even while loading

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

      {/* Show thinking indicator while AI is responding */}
      {isSending && <ThinkingIndicator />}

      <div ref={messagesEndRef} />
    </div>
  )
}
