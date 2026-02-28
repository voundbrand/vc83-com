"use client"

import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { Coins, Layers, Shield } from "lucide-react"
import { useWindowManager } from "@/hooks/use-window-manager"
import { ShellBotIcon } from "@/components/icons/shell-icons"
import Link from "next/link"

export function ChatHeader() {
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const { openWindow } = useWindowManager()

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

  return (
    <div
      className="flex items-center justify-between px-4 py-2 border-b-2 transition-all duration-300"
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
