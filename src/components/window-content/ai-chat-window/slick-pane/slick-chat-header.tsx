"use client"

import { useMemo, useState } from "react"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { useNotification } from "@/hooks/use-notification"
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

const MAX_CONTEXT_PILL_NAME_LENGTH = 20

function truncateContextName(name: string): string {
  if (name.length <= MAX_CONTEXT_PILL_NAME_LENGTH) {
    return name
  }
  return `${name.slice(0, MAX_CONTEXT_PILL_NAME_LENGTH).trimEnd()}...`
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
  const notification = useNotification()
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false)
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
      notification.info(
        "Context Switch In Progress",
        "Please wait for the current chat action to finish before switching layered context."
      )
      return
    }
    setIsCreatingConversation(true)
    const previousLayerWorkflowId = activeLayerWorkflowId
    setActiveLayerWorkflowId(workflowId)
    try {
      const conversationId = await chat.createLayerWorkflowConversation(workflowId)
      setCurrentConversationId(conversationId)
      setIsContextPanelOpen(false)
    } catch (error) {
      setActiveLayerWorkflowId(previousLayerWorkflowId)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred while switching context."
      notification.error(
        "Unable to Switch Layered Context",
        errorMessage.length > 140 ? "Please retry in a moment." : errorMessage
      )
      return
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

        <div className="flex min-h-11 min-w-0 flex-1 items-center justify-center px-2">
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
            <span className="block max-w-[18rem] truncate">{contextPillLabel}</span>
          </div>
        </div>

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
