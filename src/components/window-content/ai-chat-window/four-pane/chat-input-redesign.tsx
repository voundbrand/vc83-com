"use client"

import { useState, useRef, useEffect } from "react"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { useAIConfig } from "@/hooks/use-ai-config"
import { useNotification } from "@/hooks/use-notification"
import { ArrowUp, ChevronDown, Brain, Sparkles, Rocket, Zap, UserCheck, Lightbulb, StopCircle } from "lucide-react"
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
  const {
    chat,
    currentConversationId,
    setCurrentConversationId,
    isSending,
    setIsSending,
    organizationId,
    selectedModel,
    setSelectedModel,
    humanInLoopEnabled,
    setHumanInLoopEnabled,
    abortController,
    stopCurrentRequest,
  } = useAIChatContext()
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

  // Initialize selectedModel to default when aiSettings loads (if not already set)
  useEffect(() => {
    if (!selectedModel && aiSettings?.llm?.defaultModelId) {
      console.log('[AI Chat] Initializing selectedModel to:', aiSettings.llm.defaultModelId);
      setSelectedModel(aiSettings.llm.defaultModelId);
    }
  }, [aiSettings, selectedModel, setSelectedModel])

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
  // Use org's default model, or first enabled model, or null if no models enabled
  const defaultModelId = aiSettings?.llm?.defaultModelId || aiSettings?.llm?.enabledModels?.[0]?.modelId;
  const currentModel = selectedModel || defaultModelId || "";
  const currentProvider = currentModel ? getProvider(currentModel) : "anthropic";
  const currentDisplayName = currentModel ? getModelDisplayName(currentModel) : "No model";
  const providerInfo = PROVIDER_INFO[currentProvider] || PROVIDER_INFO.anthropic;
  const ProviderIcon = providerInfo.icon;

  // Available models - extract model IDs from enabled models array
  // Only use organization's enabled models, never hardcoded fallbacks
  const availableModels = (aiSettings?.llm?.enabledModels?.map((m) =>
    typeof m === "string" ? m : m.modelId
  )) || []

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
        console.log("🛑 [AI Chat] Request was aborted by user")
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
      <div className="space-y-2">
        {/* Textarea - Full Width */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("ui.ai_assistant.input.placeholder")}
          disabled={isSending}
          className="w-full px-3 py-2 border-2 resize-none overflow-hidden min-h-[40px] max-h-[120px] disabled:opacity-60"
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

        {/* Model Selector + HITL Toggle + Feedback + Send Button Row */}
        <div className="flex gap-2 items-center">
          {/* Human-in-the-Loop Toggle */}
          <button
            type="button"
            onClick={() => setHumanInLoopEnabled(!humanInLoopEnabled)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = humanInLoopEnabled
                ? 'var(--success-bg)'
                : 'var(--win95-hover-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = humanInLoopEnabled
                ? 'var(--success-bg)'
                : 'var(--win95-bg)';
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded border transition-all flex-shrink-0"
            style={{
              borderColor: humanInLoopEnabled ? 'var(--success)' : 'var(--win95-border)',
              background: humanInLoopEnabled ? 'var(--success-bg)' : 'var(--win95-bg)',
              color: humanInLoopEnabled ? 'var(--success)' : 'var(--win95-text-muted)'
            }}
            title={humanInLoopEnabled ? "Human-in-the-Loop: Enabled (AI will create drafts for review)" : "Human-in-the-Loop: Disabled (AI will execute immediately)"}
          >
            <UserCheck className={`w-4 h-4 transition-transform ${humanInLoopEnabled ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium hidden sm:inline">
              {humanInLoopEnabled ? "Review" : "Auto"}
            </span>
          </button>

          {/* Feedback Button */}
          <button
            type="button"
            onClick={() => {
              // Send a message to AI to start feature request flow
              const featureRequestMessage = "I'd like to request a new feature";
              setMessage(featureRequestMessage);
              notification.info(
                "Feedback",
                "Type your feature idea and send it. The AI will help you submit it to the dev team!"
              );
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--win95-hover-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--win95-bg)';
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded border transition-all flex-shrink-0"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg)',
              color: 'var(--win95-text-muted)'
            }}
            title="Send feedback or request a new feature"
          >
            <Lightbulb className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">
              Feedback
            </span>
          </button>

          {/* Model Selector (Anthropic-style) */}
          <div className="relative flex-1" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--win95-hover-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--win95-bg)';
            }}
            className="w-full flex items-center gap-1.5 px-3 py-2 rounded border transition-colors text-xs"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg)'
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--win95-hover-bg)';
                  e.currentTarget.style.color = 'var(--win95-hover-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--win95-text)';
                }}
                className="w-full px-2 py-2 text-left border-b text-xs flex items-center gap-2"
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
                    className="w-full px-2 py-2 text-left text-xs flex items-center gap-2 hover-menu-item"
                    style={{
                      backgroundColor: isSelected ? 'var(--win95-hover-bg)' : 'transparent',
                      color: isSelected ? 'var(--win95-hover-text)' : 'var(--win95-text)'
                    }}
                  >
                    <ModelIcon className={`w-3.5 h-3.5 ${info.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate" style={{ color: 'inherit' }}>
                        {displayName}
                      </div>
                    </div>
                    {isSelected && (
                      <span style={{ color: 'inherit' }}>✓</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
          </div>

          {/* Send/Stop Button */}
          {isSending ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                stopCurrentRequest()
                notification.info("Request Stopped", "AI processing has been cancelled")
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--error-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--error)';
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded border transition-all flex-shrink-0"
              style={{
                borderColor: 'var(--error)',
                background: 'var(--error)',
                color: 'white'
              }}
              title="Stop AI processing (or press ESC)"
            >
              <StopCircle className="w-4 h-4" />
              <span className="text-xs font-medium hidden sm:inline">
                Stop
              </span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!message.trim()}
              onMouseEnter={(e) => {
                if (message.trim()) {
                  e.currentTarget.style.backgroundColor = 'var(--win95-hover-light)';
                }
              }}
              onMouseLeave={(e) => {
                if (message.trim()) {
                  e.currentTarget.style.backgroundColor = 'var(--win95-bg)';
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded border transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-bg)',
                color: 'var(--win95-text-muted)'
              }}
              title="Send message (Enter)"
            >
              <ArrowUp className="w-4 h-4" />
              <span className="text-xs font-medium hidden sm:inline">
                Send
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Quick commands hint / Processing status */}
      <div className="mt-2 text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
        {isSending ? (
          <span className="flex items-center gap-1">
            <span className="animate-pulse">⏳ Processing...</span>
            <span className="opacity-60">• Press ESC or click Stop to cancel</span>
          </span>
        ) : (
          t("ui.ai_assistant.input.quick_commands")
        )}
      </div>
    </form>
  )
}
