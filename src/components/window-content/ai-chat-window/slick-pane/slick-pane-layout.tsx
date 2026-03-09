"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "convex/react"
import { useLayoutMode } from "../layout-mode-context"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { useAuth } from "@/hooks/use-auth"
import { SlickChatHeader } from "./slick-chat-header"
import { SlickChatMessages } from "./slick-chat-messages"
import { SlickChatInput } from "./slick-chat-input"
import { ConversationHistory } from "../three-pane/conversation-history"
import { ToolExecutionPanel } from "../three-pane/tool-execution-panel"
import type {
  CollaborationSurfaceSelection,
  OperatorCollaborationContextPayload,
  OperatorCollaborationThreadDrillDown,
} from "./operator-collaboration-types"

interface CollaborationApi {
  ai: {
    agentSessions: {
      getOperatorCollaborationContext: unknown
      getControlCenterThreadDrillDown: unknown
    }
  }
}

const apiAny = require("../../../../../convex/_generated/api").api as CollaborationApi

export function SlickPaneLayout() {
  const { mode } = useLayoutMode()
  const { sessionId } = useAuth()
  const { currentConversationId, organizationId } = useAIChatContext()
  const unsafeUseQuery = useQuery as unknown as (
    queryRef: unknown,
    args: unknown
  ) => unknown
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false)
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false)
  const [isConversationStageVisible, setIsConversationStageVisible] = useState(false)
  const [selectedSurface, setSelectedSurface] = useState<CollaborationSurfaceSelection>({
    kind: "group",
  })

  const visualMode = useMemo(() => (mode === "single" ? "single" : "slick"), [mode])
  const collaborationContext = unsafeUseQuery(
    apiAny.ai.agentSessions.getOperatorCollaborationContext,
    sessionId && organizationId && currentConversationId
      ? {
          sessionId,
          organizationId,
          conversationId: currentConversationId,
        }
      : "skip"
  ) as OperatorCollaborationContextPayload | null | undefined
  const collaborationThreadDrillDown = unsafeUseQuery(
    apiAny.ai.agentSessions.getControlCenterThreadDrillDown,
    sessionId && organizationId && collaborationContext?.threadId
      ? {
          sessionId,
          organizationId,
          threadId: collaborationContext.threadId,
          limit: 80,
        }
      : "skip"
  ) as OperatorCollaborationThreadDrillDown | null | undefined
  const collaborationTimelineEvents = useMemo(
    () => collaborationThreadDrillDown?.timelineEvents || [],
    [collaborationThreadDrillDown]
  )

  useEffect(() => {
    setSelectedSurface({ kind: "group" })
  }, [currentConversationId])

  useEffect(() => {
    if (!collaborationContext || selectedSurface.kind !== "dm") {
      return
    }
    const dmStillExists = collaborationContext.specialists.some(
      (specialist) =>
        specialist.dmThreadId === selectedSurface.dmThreadId
        && specialist.agentId === selectedSurface.specialistAgentId
    )
    if (!dmStillExists) {
      setSelectedSurface({ kind: "group" })
    }
  }, [collaborationContext, selectedSurface])

  useEffect(() => {
    if (!isConversationStageVisible) {
      return
    }
    setLeftDrawerOpen(false)
    setRightDrawerOpen(false)
  }, [isConversationStageVisible])

  const toggleLeftDrawer = () => {
    setLeftDrawerOpen((current) => !current)
  }

  const toggleRightDrawer = () => {
    setRightDrawerOpen((current) => !current)
  }

  return (
    <div
      className="relative flex h-full min-h-0 overflow-hidden"
      style={{ background: "var(--shell-surface)" }}
    >
      <div className="relative z-10 flex h-full min-h-0 w-full flex-col">
        <SlickChatHeader
          isLeftDrawerOpen={leftDrawerOpen}
          isRightDrawerOpen={rightDrawerOpen}
          onToggleLeftDrawer={toggleLeftDrawer}
          onToggleRightDrawer={toggleRightDrawer}
          conversationStageVisible={isConversationStageVisible}
          collaborationContext={collaborationContext || null}
          selectedSurface={selectedSurface}
          onSelectSurface={setSelectedSurface}
        />

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="relative z-0 flex h-full min-h-0 flex-col overflow-hidden">
            <SlickChatMessages
              visualMode={visualMode}
              collaborationContext={collaborationContext || null}
              selectedSurface={selectedSurface}
              timelineEvents={collaborationTimelineEvents}
            />
            <SlickChatInput
              visualMode={visualMode}
              collaborationContext={collaborationContext || null}
              selectedSurface={selectedSurface}
              onConversationStageVisibilityChange={setIsConversationStageVisible}
            />
          </div>

          {leftDrawerOpen || rightDrawerOpen ? (
            <button
              type="button"
              className="absolute inset-0 z-20 opacity-25"
              onClick={() => {
                setLeftDrawerOpen(false)
                setRightDrawerOpen(false)
              }}
              aria-label="Close open drawers"
              style={{ background: "var(--modal-overlay-bg)" }}
            />
          ) : null}

          <aside
            className={`absolute inset-y-0 left-0 z-30 w-[88%] max-w-[22rem] border-r transition-transform transition-opacity duration-200 ease-out ${
              leftDrawerOpen
                ? "translate-x-0 opacity-100 pointer-events-auto"
                : "-translate-x-[calc(100%+1rem)] opacity-0 pointer-events-none"
            }`}
            aria-hidden={!leftDrawerOpen}
            style={{
              borderColor: "var(--shell-border-strong)",
              background: "var(--shell-surface)",
              boxShadow: "var(--window-shell-shadow)",
            }}
          >
            <ConversationHistory onClose={() => setLeftDrawerOpen(false)} />
          </aside>

          <aside
            className={`absolute inset-y-0 right-0 z-30 w-[78%] max-w-[24rem] border-l transition-transform transition-opacity duration-200 ease-out ${
              rightDrawerOpen
                ? "translate-x-0 opacity-100 pointer-events-auto"
                : "translate-x-[calc(100%+1rem)] opacity-0 pointer-events-none"
            }`}
            aria-hidden={!rightDrawerOpen}
            style={{
              borderColor: "var(--shell-border-strong)",
              background: "var(--shell-surface)",
              boxShadow: "var(--window-shell-shadow)",
            }}
          >
            <ToolExecutionPanel onClose={() => setRightDrawerOpen(false)} />
          </aside>
        </div>
      </div>
    </div>
  )
}
