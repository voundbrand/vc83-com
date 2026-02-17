"use client"

import { useState, useRef, useEffect } from "react"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { useAIConfig } from "@/hooks/use-ai-config"
import { useNotification } from "@/hooks/use-notification"
import { StopCircle, SendHorizontal, Loader2 } from "lucide-react"

export function ChatInput() {
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const {
    chat,
    currentConversationId,
    setCurrentConversationId,
    isSending,
    setIsSending,
    abortController,
    stopCurrentRequest,
  } = useAIChatContext()
  const { isAIReady, settings } = useAIConfig()
  const notification = useNotification()

  // Auto-expand textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [message])

  // Global ESC key handler to stop AI processing
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSending) {
        e.preventDefault()
        stopCurrentRequest()
        notification.info("Request Stopped", "AI processing has been cancelled")
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isSending, stopCurrentRequest, notification])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isSending) return

    // Check if AI is enabled and ready
    if (!settings?.enabled) {
      notification.error(
        "AI Features Not Enabled",
        "Please enable AI features in Organization Settings > AI to start chatting."
      )
      return
    }

    if (!isAIReady) {
      notification.error(
        "AI Not Ready",
        "Please configure at least one AI model in Organization Settings > AI before chatting."
      )
      return
    }

    const messageToSend = message.trim()
    setMessage("")
    setIsSending(true)

    // Create new abort controller for this request
    abortController.current = new AbortController()

    try {
      const result = await chat.sendMessage(messageToSend, currentConversationId)

      // If this was a new conversation, set the conversation ID
      if (!currentConversationId && result.conversationId) {
        setCurrentConversationId(result.conversationId)
      }
    } catch (error) {
      // Check if request was aborted
      if (error instanceof Error && error.name === "AbortError") {
        console.log("[AI Chat] Request was aborted by user")
        return // Don't show error notification for user-initiated stops
      }

      console.error("Failed to send message:", error)

      // Parse error message for user-friendly feedback
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

      if (errorMessage.includes("not enabled")) {
        notification.error(
          "AI Features Not Enabled",
          "Please enable AI features in Organization Settings > AI."
        )
      } else if (
        errorMessage.includes("CREDITS_EXHAUSTED") ||
        (errorMessage.toLowerCase().includes("not enough") && errorMessage.toLowerCase().includes("credit"))
      ) {
        notification.error(
          "No Credits Available",
          "You are out of credits. Open the Store to top up credits and continue chatting."
        )
      } else if (errorMessage.includes("budget") || errorMessage.includes("limit")) {
        notification.error(
          "Usage Limit Reached",
          "You've reached a usage limit. Add credits in the Store or increase your AI monthly budget."
        )
      } else {
        notification.error(
          "Failed to Send Message",
          errorMessage.length > 100 ? "An error occurred. Please try again." : errorMessage
        )
      }

      // Restore message on error
      setMessage(messageToSend)
    } finally {
      setIsSending(false)
      abortController.current = null
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t-2 p-3"
      style={{
        borderColor: 'var(--win95-border)',
        background: 'var(--win95-bg-light)'
      }}
    >
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("ui.ai_assistant.input.placeholder")}
          disabled={isSending}
          className="desktop-interior-input flex-1 min-w-0 resize-none overflow-hidden min-h-[44px] max-h-[120px] disabled:opacity-60"
          rows={1}
        />
        {isSending ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              stopCurrentRequest()
              notification.info("Request Stopped", "AI processing has been cancelled")
            }}
            className="retro-button px-4 py-2 font-pixel text-xs whitespace-nowrap flex items-center gap-2"
            style={{
              background: 'var(--error)',
              color: 'white'
            }}
            title="Stop AI processing (or press ESC)"
          >
            <StopCircle size={14} />
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!message.trim()}
            className="retro-button px-4 py-2 font-pixel text-xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <SendHorizontal size={14} />
            {t("ui.ai_assistant.input.send_button")}
          </button>
        )}
      </div>

      <div className="mt-2 text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
        {isSending ? (
          <span className="flex items-center gap-1">
            <span className="flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              <span>Processing...</span>
            </span>
            <span className="opacity-60">• Press ESC or click Stop to cancel</span>
          </span>
        ) : (
          t("ui.ai_assistant.input.quick_commands")
        )}
      </div>
    </form>
  )
}
