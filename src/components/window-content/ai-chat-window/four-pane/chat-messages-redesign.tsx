"use client"

import { useEffect, useRef } from "react"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { SystemMessage } from "../single-pane/message-types/system-message"
import { Sparkles, Wrench, CheckCircle2, XCircle } from "lucide-react"

// User Message Component - LEFT SIDE (flipped from original)
function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-start">
      <div
        className="px-2 py-2 max-w-[85%] text-sm"
        style={{
          color: 'var(--win95-text)',
        }}
      >
        <div className="leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </div>
      </div>
    </div>
  )
}

// Assistant Message Component - RIGHT SIDE (flipped from original)
function AssistantMessage({ content }: { content: string }) {
  // Check if this is a tool result message (special formatting)
  const isToolResult = content.startsWith("[Tool Result]")

  if (isToolResult) {
    // Parse tool result for special display
    const isError = content.includes("failed") || content.includes("Error:")
    const isSuccess = content.includes("successfully")

    return (
      <div className="flex justify-center my-2">
        <div
          className="px-3 py-2 max-w-[90%] text-xs rounded border"
          style={{
            borderColor: isError ? 'var(--error)' : isSuccess ? 'var(--success)' : 'var(--info)',
            background: isError ? 'var(--error-bg)' : isSuccess ? 'var(--success-bg)' : 'var(--info-bg)',
            color: 'var(--win95-text)',
          }}
        >
          <div className="flex items-start gap-2">
            {isError ? (
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
            ) : isSuccess ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
            ) : (
              <Wrench className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--info)' }} />
            )}
            <div className="leading-relaxed whitespace-pre-wrap break-words flex-1">
              {content.replace("[Tool Result] ", "")}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Regular assistant message
  return (
    <div className="flex justify-end">
      <div
        className="px-2 py-2 max-w-[85%] text-sm"
        style={{
          color: 'var(--win95-text)',
        }}
      >
        <div className="leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </div>
      </div>
    </div>
  )
}

// Tool Message Component - Shows tool execution results in chat
function ToolMessage({ content }: { content: string }) {
  // Parse if this is an error or success
  const isError = content.includes("failed") || content.includes("Error:")
  const isSuccess = content.includes("successfully")

  return (
    <div className="flex justify-center my-2">
      <div
        className="px-3 py-2 max-w-[90%] text-xs rounded border"
        style={{
          borderColor: isError ? 'var(--error)' : isSuccess ? 'var(--success)' : 'var(--info)',
          background: isError ? 'var(--error-bg)' : isSuccess ? 'var(--success-bg)' : 'var(--info-bg)',
          color: 'var(--win95-text)',
        }}
      >
        <div className="flex items-start gap-2">
          {isError ? (
            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
          ) : isSuccess ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
          ) : (
            <Wrench className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--info)' }} />
          )}
          <div className="leading-relaxed whitespace-pre-wrap break-words flex-1">
            {content}
          </div>
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
        className="px-2 py-2 text-sm flex items-center gap-2"
        style={{
          color: 'var(--win95-text)',
        }}
      >
        <Sparkles className="w-4 h-4 animate-pulse" style={{ color: 'var(--win95-highlight)' }} />
        <span className="text-xs italic">Thinking...</span>
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
  const displayMessages = messages

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
      {displayMessages.length === 0 && (
        <div
          className="text-xs px-3 py-2 border rounded"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
            color: "var(--neutral-gray)"
          }}
        >
          Start a chat to run the platform agent runtime. Daily free credits apply automatically.
        </div>
      )}

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
        if (message.role === "tool") {
          return <ToolMessage key={message._id} content={message.content} />
        }
        return null
      })}

      {/* Show thinking indicator while AI is responding */}
      {isSending && <ThinkingIndicator />}

      <div ref={messagesEndRef} />
    </div>
  )
}
