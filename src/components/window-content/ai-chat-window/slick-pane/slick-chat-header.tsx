"use client"

import { useState } from "react"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import type { Id } from "../../../../../convex/_generated/dataModel"
import {
  Ghost,
  Layers,
  Menu,
  Plus,
} from "lucide-react"
import { LayeredContextPanel } from "./layered-context-panel"
import type {
  CollaborationSurfaceSelection,
  OperatorCollaborationContextPayload,
} from "./operator-collaboration-types"

interface SlickChatHeaderProps {
  isLeftDrawerOpen: boolean
  isRightDrawerOpen: boolean
  onToggleLeftDrawer: () => void
  onToggleRightDrawer: () => void
  conversationStageVisible?: boolean
  collaborationContext: OperatorCollaborationContextPayload | null
  selectedSurface: CollaborationSurfaceSelection
  onSelectSurface: (selection: CollaborationSurfaceSelection) => void
}

export function SlickChatHeader({
  isLeftDrawerOpen,
  isRightDrawerOpen,
  onToggleLeftDrawer,
  onToggleRightDrawer,
  conversationStageVisible,
}: SlickChatHeaderProps) {
  const {
    chat,
    setCurrentConversationId,
    activeLayerWorkflowId,
    setActiveLayerWorkflowId,
    privateModeEnabled,
    setPrivateModeEnabled,
  } = useAIChatContext()
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false)

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

  const handleNewChat = async () => {
    if (isCreatingConversation) {
      return
    }
    setIsCreatingConversation(true)
    try {
      await chat.createConversation()
      setCurrentConversationId(undefined)
    } finally {
      setIsCreatingConversation(false)
    }
  }

  const handleSelectLayeredContext = async (workflowId: Id<"objects">) => {
    if (isCreatingConversation) {
      return
    }
    setIsCreatingConversation(true)
    try {
      const conversationId = await chat.createLayerWorkflowConversation(workflowId)
      setActiveLayerWorkflowId(workflowId)
      setCurrentConversationId(conversationId)
      setIsContextPanelOpen(false)
    } finally {
      setIsCreatingConversation(false)
    }
  }

  if (conversationStageVisible) {
    return null
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

        <button
          className="desktop-shell-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{
            ...circularButtonStyle,
            background: privateModeEnabled ? "var(--shell-accent-soft)" : "var(--shell-surface-elevated)",
            borderColor: privateModeEnabled ? "var(--shell-active-border)" : "var(--shell-border-soft)",
            color: "var(--shell-text)",
          }}
          onClick={() => setPrivateModeEnabled(!privateModeEnabled)}
          title={privateModeEnabled ? "Disable private mode" : "Enable private mode"}
        >
          <Ghost size={17} />
        </button>

        <div className="flex min-h-11 min-w-0 flex-1" aria-hidden="true" />

        <button
          className="desktop-shell-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{
            ...circularButtonStyle,
            ...getDrawerButtonStyle(isContextPanelOpen),
          }}
          onClick={() => setIsContextPanelOpen((current) => !current)}
          title="Open layered context browser"
        >
          <Layers size={17} />
        </button>

        <button
          className="desktop-shell-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{
            ...getDrawerButtonStyle(isRightDrawerOpen),
            ...circularButtonStyle,
            color: "var(--shell-text)",
          }}
          onClick={(event) => {
            if (event.altKey) {
              onToggleRightDrawer()
              return
            }
            void handleNewChat()
          }}
          onContextMenu={(event) => {
            event.preventDefault()
            onToggleRightDrawer()
          }}
          title="Start new chat (Alt+click or right-click to open workflow drawer)"
          disabled={isCreatingConversation}
        >
          <Plus size={18} />
        </button>
      </div>

      {isContextPanelOpen ? (
        <LayeredContextPanel
          activeLayerWorkflowId={activeLayerWorkflowId}
          onSelectWorkflow={handleSelectLayeredContext}
          onClose={() => setIsContextPanelOpen(false)}
        />
      ) : null}
    </div>
  )
}
