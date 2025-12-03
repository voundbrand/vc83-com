"use client"

import { useState, useRef, useEffect } from "react"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { useAIConfig } from "@/hooks/use-ai-config"
import { useNotification } from "@/hooks/use-notification"
import { ArrowUp, ChevronDown, Brain, Sparkles, Rocket, Zap } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "../../../../../convex/_generated/api"

// Provider icons
const PROVIDER_INFO: Record<string, { icon: typeof Brain; color: string }> = {
  anthropic: { icon: Brain, color: "text-purple-600" },
  openai: { icon: Sparkles, color: "text-green-600" },
  google: { icon: Rocket, color: "text-blue-600" },
  meta: { icon: Zap, color: "text-orange-600" },
  mistral: { icon: Sparkles, color: "text-red-600" },
};

export function ChatInput() {
  const [message, setMessage] = useState("")
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const { chat, currentConversationId, setCurrentConversationId, isSending, setIsSending, organizationId, selectedModel, setSelectedModel } =
    useAIChatContext()
  const { isAIReady, settings, billing } = useAIConfig()
  const notification = useNotification()

  // Get AI settings for available models
  const aiSettings = useQuery(
    api.ai.settings.getAISettings,
    organizationId ? { organizationId } : "skip"
  )

  // Auto-expand textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [message])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelSelectorOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Parse provider from model string
  const getProvider = (model: string) => {
    return model.split("/")[0]
  }

  // Get model display name
  const getModelDisplayName = (model: string) => {
    const parts = model.split("/")
    return parts[1] || model
  }

  // Current model (use from settings or selection)
  const currentModel = selectedModel || (aiSettings?.llm?.model) || "anthropic/claude-3-5-sonnet"
  const currentProvider = getProvider(currentModel)
  const currentDisplayName = getModelDisplayName(currentModel)
  const providerInfo = PROVIDER_INFO[currentProvider] || PROVIDER_INFO.anthropic
  const ProviderIcon = providerInfo.icon

  // Available models - extract model IDs from enabled models array
  const availableModels = (aiSettings?.llm?.enabledModels?.map((m) =>
    typeof m === "string" ? m : m.modelId
  )) || [
    "anthropic/claude-3-5-sonnet",
    "anthropic/claude-3-opus",
    "openai/gpt-4o",
  ]

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

  const handleModelSelect = (model: string) => {
    setSelectedModel(model)
    setIsModelSelectorOpen(false)
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
      <div className="flex gap-2 items-end">
        {/* Textarea */}
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

        {/* Model Selector (Anthropic-style) */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
            className="flex items-center gap-1.5 px-2 py-2 rounded border hover:bg-gray-50 transition-colors text-xs"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg)',
              minWidth: '120px'
            }}
          >
            <ProviderIcon className={`w-3.5 h-3.5 ${providerInfo.color}`} />
            <span className="truncate flex-1" style={{ color: 'var(--win95-text)' }}>
              {currentDisplayName}
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isModelSelectorOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--win95-text-muted)' }} />
          </button>

          {/* Dropdown */}
          {isModelSelectorOpen && (
            <div
              className="absolute bottom-full left-0 mb-1 w-64 border-2 rounded shadow-lg max-h-64 overflow-y-auto z-50"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-bg)'
              }}
            >
              {/* Auto (Default) Option */}
              <button
                type="button"
                onClick={() => handleModelSelect(aiSettings?.llm?.model || currentModel)}
                className="w-full px-2 py-2 text-left hover:bg-gray-100 border-b text-xs flex items-center gap-2"
                style={{ borderColor: 'var(--win95-border-light)' }}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <div className="flex-1">
                  <div className="font-semibold" style={{ color: 'var(--win95-text)' }}>Auto</div>
                  <div style={{ color: 'var(--win95-text-muted)' }}>
                    {getModelDisplayName(aiSettings?.llm?.model || currentModel)}
                  </div>
                </div>
              </button>

              {/* Available Models */}
              {availableModels.map((model) => {
                const provider = getProvider(model)
                const displayName = getModelDisplayName(model)
                const info = PROVIDER_INFO[provider] || PROVIDER_INFO.anthropic
                const ModelIcon = info.icon
                const isSelected = model === selectedModel

                return (
                  <button
                    key={model}
                    type="button"
                    onClick={() => handleModelSelect(model)}
                    className={`w-full px-2 py-2 text-left hover:bg-gray-100 text-xs flex items-center gap-2 ${
                      isSelected ? 'bg-purple-50' : ''
                    }`}
                  >
                    <ModelIcon className={`w-3.5 h-3.5 ${info.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate" style={{ color: 'var(--win95-text)' }}>
                        {displayName}
                      </div>
                    </div>
                    {isSelected && (
                      <span style={{ color: 'var(--win95-highlight)' }}>✓</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Send Button - Up Arrow Icon */}
        <button
          type="submit"
          disabled={!message.trim() || isSending}
          className="flex items-center justify-center p-2.5 rounded border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-50"
          style={{
            borderColor: 'var(--win95-border)',
            background: message.trim() && !isSending ? 'var(--win95-highlight)' : 'var(--win95-bg)',
            color: message.trim() && !isSending ? '#ffffff' : 'var(--win95-text-muted)'
          }}
          title="Send message (Enter)"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>

      {/* Quick commands hint */}
      <div className="mt-2 text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
        {t("ui.ai_assistant.input.quick_commands")}
      </div>
    </form>
  )
}
