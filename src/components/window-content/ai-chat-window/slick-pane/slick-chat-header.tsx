"use client"

import { useWindowManager } from "@/hooks/use-window-manager"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import {
  Ghost,
  Menu,
  Shield,
} from "lucide-react"
import type {
  CollaborationSurfaceSelection,
  OperatorCollaborationContextPayload,
} from "./operator-collaboration-types"

interface SlickChatHeaderProps {
  isLeftDrawerOpen: boolean
  isRightDrawerOpen: boolean
  onToggleLeftDrawer: () => void
  onToggleRightDrawer: () => void
  collaborationContext: OperatorCollaborationContextPayload | null
  selectedSurface: CollaborationSurfaceSelection
  onSelectSurface: (selection: CollaborationSurfaceSelection) => void
}

export function SlickChatHeader({
  isLeftDrawerOpen,
  isRightDrawerOpen,
  onToggleLeftDrawer,
  onToggleRightDrawer,
}: SlickChatHeaderProps) {
  const { openWindow } = useWindowManager()
  const { privateModeEnabled, setPrivateModeEnabled } = useAIChatContext()

  const getDrawerButtonStyle = (isActive: boolean) => ({
    background: isActive
      ? "var(--shell-accent-soft)"
      : "var(--shell-surface-elevated)",
    borderColor: isActive
      ? "var(--shell-active-border)"
      : "var(--shell-border-soft)",
    color: "var(--shell-text)",
  })
  const circularButtonStyle = {
    borderRadius: "9999px",
    padding: 0,
    minHeight: 44,
    width: 44,
    height: 44,
  } as const

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
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-4">
      <div className="pointer-events-auto flex items-start gap-3">
        <button
          className="desktop-shell-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ ...getDrawerButtonStyle(isLeftDrawerOpen), ...circularButtonStyle }}
          onClick={onToggleLeftDrawer}
          title={isLeftDrawerOpen ? "Close conversation history drawer" : "Open conversation history drawer"}
        >
          <Menu size={18} />
        </button>

        <div className="flex flex-col items-center gap-1">
          <button
            className="desktop-shell-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{
              ...circularButtonStyle,
              background: privateModeEnabled
                ? "var(--shell-accent-soft)"
                : "var(--shell-surface-elevated)",
              borderColor: privateModeEnabled
                ? "var(--shell-active-border)"
                : "var(--shell-border-soft)",
              color: "var(--shell-text)",
            }}
            onClick={() => setPrivateModeEnabled(!privateModeEnabled)}
            title={privateModeEnabled ? "Disable private mode" : "Enable private mode"}
          >
            <Ghost size={18} />
          </button>
          {privateModeEnabled ? (
            <span className="text-[10px] font-semibold lowercase leading-none" style={{ color: "var(--shell-text-dim)" }}>
              private
            </span>
          ) : null}
        </div>

        <button
          className="desktop-shell-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{
            ...circularButtonStyle,
            background: "var(--shell-surface-elevated)",
            color: "var(--shell-text)",
          }}
          onClick={handleOpenAgentCoverage}
          title="Open agent coverage and recommendations"
        >
          <Shield size={19} />
        </button>

        <div className="flex min-h-11 min-w-0 flex-1 items-center" />

        <button
          className="desktop-shell-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ ...getDrawerButtonStyle(isRightDrawerOpen), ...circularButtonStyle }}
          onClick={onToggleRightDrawer}
          title={isRightDrawerOpen ? "Close workflow drawer" : "Open workflow drawer"}
        >
          <Menu size={18} />
        </button>
      </div>
    </div>
  )
}
