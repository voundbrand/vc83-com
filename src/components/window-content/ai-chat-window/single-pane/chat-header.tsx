"use client"

import { useMemo } from "react"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { Coins, Layers, Shield, X } from "lucide-react"
import { useWindowManager } from "@/hooks/use-window-manager"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { ShellBotIcon } from "@/components/icons/shell-icons"
import Link from "next/link"

const MAX_CONTEXT_PILL_NAME_LENGTH = 20

function truncateContextName(name: string): string {
  if (name.length <= MAX_CONTEXT_PILL_NAME_LENGTH) {
    return name
  }
  return `${name.slice(0, MAX_CONTEXT_PILL_NAME_LENGTH).trimEnd()}...`
}

export function ChatHeader() {
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const { openWindow } = useWindowManager()
  const { chat, activeLayerWorkflowId, setActiveLayerWorkflowId, setCurrentConversationId } = useAIChatContext()
  const activeLayerWorkflowTitle = useMemo(() => {
    if (!activeLayerWorkflowId) {
      return undefined
    }

    const normalizedCurrentTitle = (
      chat.conversation?.layerWorkflowId === activeLayerWorkflowId
        ? chat.conversation.layerWorkflowTitle
        : undefined
    )?.trim()
    if (normalizedCurrentTitle) {
      return normalizedCurrentTitle
    }

    const matchingConversation = (chat.conversations || []).find((conversation) => (
      conversation.layerWorkflowId === activeLayerWorkflowId
      && typeof conversation.layerWorkflowTitle === "string"
      && conversation.layerWorkflowTitle.trim().length > 0
    ))
    return matchingConversation?.layerWorkflowTitle?.trim()
  }, [
    activeLayerWorkflowId,
    chat.conversation?.layerWorkflowId,
    chat.conversation?.layerWorkflowTitle,
    chat.conversations,
  ])
  const activeLayerWorkflowLabel = useMemo(() => {
    if (!activeLayerWorkflowId) {
      return undefined
    }
    if (!activeLayerWorkflowTitle) {
      return "Layered Context"
    }
    return truncateContextName(activeLayerWorkflowTitle)
  }, [activeLayerWorkflowId, activeLayerWorkflowTitle])
  const contextPillLabel = activeLayerWorkflowLabel || "No Layered Context"
  const contextPillActive = Boolean(activeLayerWorkflowLabel)
  const contextPillTitle = activeLayerWorkflowTitle
    || (contextPillActive ? "Layered context active" : "No layered context selected")

  const handleOpenStore = () => {
    import("@/components/window-content/store-window").then(({ StoreWindow }) => {
      const storeX = typeof window !== "undefined" ? Math.max(120, window.innerWidth - 760) : 320
      openWindow(
        "store",
        "Store",
        <StoreWindow />,
        { x: storeX, y: 80 },
        { width: 720, height: 640 }
      )
    })
  }

  const handleOpenAgentCoverage = () => {
    import("@/components/window-content/agents-window").then(({ AgentsWindow }) => {
      const agentsX = typeof window !== "undefined" ? Math.max(120, window.innerWidth - 980) : 220
      openWindow(
        "agents-browser",
        "AI Agents",
        <AgentsWindow />,
        { x: agentsX, y: 70 },
        { width: 980, height: 700 }
      )
    })
  }

  const handleClearLayeredContext = () => {
    setActiveLayerWorkflowId(undefined)
    setCurrentConversationId(undefined)
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 border-b-2 transition-all duration-300"
      style={{
        borderColor: 'var(--shell-border)',
        background: 'var(--shell-surface-elevated)'
      }}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center">
          <ShellBotIcon size={16} tone="active" />
        </span>
        <span className="font-pixel text-xs" style={{ color: 'var(--shell-text)' }}>
          {t("ui.ai_assistant.header.title")}
        </span>
        <span
          className="ml-2 w-2 h-2 rounded-full animate-pulse"
          style={{ background: 'var(--success)' }}
          title={t("ui.ai_assistant.header.online")}
        />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center px-2">
        <div
          className="max-w-full rounded-full border px-3 py-1 text-[11px] font-medium"
          style={contextPillActive
            ? {
                borderColor: "var(--shell-neutral-active-border)",
                background: "var(--shell-neutral-hover-surface)",
                color: "var(--shell-text)",
              }
            : {
                borderColor: "var(--shell-border-soft)",
                background: "var(--shell-surface-elevated)",
                color: "var(--shell-text-dim)",
              }}
          title={contextPillTitle}
        >
          <div className="flex items-center gap-1.5">
            <span className="block max-w-[18rem] truncate">{contextPillLabel}</span>
            {contextPillActive ? (
              <button
                type="button"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full transition-colors"
                style={{ color: "currentColor", background: "transparent" }}
                title="Clear layered context"
                onClick={handleClearLayeredContext}
              >
                <X size={11} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* SevenLayers Builder Link */}
        <Link
          href="/builder"
          className="px-2 py-0.5 text-xs font-pixel flex items-center gap-1 hover:scale-105 transition-transform rounded"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            color: 'white',
          }}
          title="Open SevenLayers Builder"
        >
          <Layers className="w-3 h-3" />
          Builder
        </Link>

        <button
          className="desktop-shell-button px-2 py-0.5 text-xs font-pixel flex items-center gap-1 hover:scale-105 transition-transform"
          onClick={handleOpenAgentCoverage}
          title="Open agent coverage and recommendations"
        >
          <Shield className="w-3 h-3" />
          Coverage
        </button>

        {/* Credits / Store Button */}
        <button
          className="desktop-shell-button-primary px-2 py-0.5 text-xs font-pixel flex items-center gap-1 hover:scale-105 transition-transform"
          onClick={handleOpenStore}
          title="Open Store to top up credits"
        >
          <Coins className="w-3 h-3" />
          Credits
        </button>

      </div>
    </div>
  )
}
