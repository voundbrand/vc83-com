"use client"

import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"

export function ChatFooter() {
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  // TODO: Connect to actual token counter from Convex
  const tokens = 150
  const estimatedCost = (tokens * 0.000015).toFixed(4) // ~$0.015 per 1K tokens for Claude

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
        <span title={t("ui.ai_assistant.footer.tokens_tooltip")}>
          💬 {tokens.toLocaleString()} {t("ui.ai_assistant.footer.tokens")}
        </span>
        <span title={t("ui.ai_assistant.footer.cost_tooltip")}>
          💰 €{estimatedCost}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} title={t("ui.ai_assistant.footer.ai_online")} />
        <span>{t("ui.ai_assistant.footer.ready")}</span>
      </div>
    </div>
  )
}
