"use client"

import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { useAIConfig } from "@/hooks/use-ai-config"
import { useMemo } from "react"
import { MessageSquareText, Coins } from "lucide-react"

export function ChatFooter() {
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const { chat } = useAIChatContext()
  const { isAIReady, settings, credits } = useAIConfig()

  // Calculate total tokens and cost from conversation messages
  const { totalTokens, estimatedCost } = useMemo(() => {
    const messages = chat.messages || []

    // Sum up all tokens from messages
    let inputTokens = 0
    let outputTokens = 0

    messages.forEach((message: any) => {
      // Estimate tokens: ~4 characters per token
      const messageTokens = Math.ceil(message.content.length / 4)
      if (message.role === "user") {
        inputTokens += messageTokens
      } else if (message.role === "assistant") {
        outputTokens += messageTokens
      }
    })

    const total = inputTokens + outputTokens

    // Calculate cost using Claude Sonnet 4 pricing (approximate)
    // Input: $0.003 per 1K tokens, Output: $0.015 per 1K tokens
    const cost = (inputTokens * 0.000003) + (outputTokens * 0.000015)

    return {
      totalTokens: total,
      estimatedCost: cost.toFixed(4)
    }
  }, [chat.messages])

  // Determine AI status based on chat state and configuration
  const getAIStatus = () => {
    // Check chat state first
    if (chat.isLoading) {
      return { isOnline: false, text: t("ui.ai_assistant.footer.loading") }
    }
    if (chat.error) {
      return { isOnline: false, text: t("ui.ai_assistant.footer.error") }
    }

    // Check AI configuration
    if (!settings?.enabled) {
      return { isOnline: false, text: t("ui.ai_assistant.footer.ai_disabled") }
    }
    if (!isAIReady) {
      return { isOnline: false, text: t("ui.ai_assistant.footer.no_models") }
    }
    if (!credits) {
      return { isOnline: false, text: t("ui.ai_assistant.footer.loading") }
    }
    if (credits.monthlyCreditsTotal !== -1 && credits.totalCredits <= 0) {
      return { isOnline: false, text: "Out of credits" }
    }

    // All good!
    return { isOnline: true, text: t("ui.ai_assistant.footer.ready") }
  }

  const { isOnline: isAIOnline, text: statusText } = getAIStatus()

  return (
    <div
      className="px-4 py-1 border-t text-[10px] flex items-center justify-between"
      style={{
        borderColor: 'var(--win95-border)',
        background: 'var(--win95-bg-light)',
        color: 'var(--win95-text)'
      }}
    >
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1" title={t("ui.ai_assistant.footer.tokens_tooltip")}>
          <MessageSquareText className="w-3 h-3" />
          {totalTokens.toLocaleString()} {t("ui.ai_assistant.footer.tokens")}
        </span>
        <span className="flex items-center gap-1" title={t("ui.ai_assistant.footer.cost_tooltip")}>
          <Coins className="w-3 h-3" />
          €{estimatedCost}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: isAIOnline ? 'var(--success)' : 'var(--error)'
          }}
          title={isAIOnline ? t("ui.ai_assistant.footer.ai_online") : t("ui.ai_assistant.footer.ai_offline")}
        />
        <span>{statusText}</span>
      </div>
    </div>
  )
}
