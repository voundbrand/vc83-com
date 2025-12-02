"use client"

import { useState, useRef, useEffect } from "react"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { useAIConfig } from "@/hooks/use-ai-config"
import { useNotification } from "@/hooks/use-notification"

export function ChatInput() {
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const { chat, currentConversationId, setCurrentConversationId, isSending, setIsSending } =
    useAIChatContext()
  const { isAIReady, settings, billing } = useAIConfig()
  const notification = useNotification()

  // Auto-expand textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [message])

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

    if (!billing?.hasSubscription) {
      notification.error(
        "No AI Subscription",
        "Please subscribe to an AI plan in Organization Settings > AI to use the AI assistant."
      )
      return
    }

    if (billing.status !== "active" && billing.status !== "trialing") {
      notification.error(
        "Subscription Inactive",
        "Your AI subscription is not active. Please check your billing settings."
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

    try {
      const result = await chat.sendMessage(messageToSend, currentConversationId)

      // If this was a new conversation, set the conversation ID
      if (!currentConversationId && result.conversationId) {
        setCurrentConversationId(result.conversationId)
      }
    } catch (error) {
      console.error("Failed to send message:", error)

      // Parse error message for user-friendly feedback
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

      if (errorMessage.includes("not enabled")) {
        notification.error(
          "AI Features Not Enabled",
          "Please enable AI features in Organization Settings > AI."
        )
      } else if (errorMessage.includes("subscription")) {
        notification.error(
          "Subscription Required",
          "Please subscribe to an AI plan to use the assistant."
        )
      } else if (errorMessage.includes("budget") || errorMessage.includes("limit")) {
        notification.error(
          "Usage Limit Reached",
          "You've reached your token limit. Please upgrade your plan or wait for the next billing cycle."
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
          className="flex-1 px-3 py-2 border-2 resize-none overflow-hidden min-h-[40px] max-h-[120px]"
          style={{
            borderColor: 'var(--win95-input-border-dark)',
            background: 'var(--win95-input-bg)',
            color: 'var(--win95-input-text)',
            borderStyle: 'inset',
            fontSize: '13px',
            fontFamily: 'system-ui, sans-serif'
          }}
          rows={1}
        />
        <button
          type="submit"
          disabled={!message.trim() || isSending}
          className="retro-button px-4 py-2 font-pixel text-xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? "⏳" : "📤"} {t("ui.ai_assistant.input.send_button")}
        </button>
      </div>

      <div className="mt-2 text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
        {t("ui.ai_assistant.input.quick_commands")}
      </div>
    </form>
  )
}
