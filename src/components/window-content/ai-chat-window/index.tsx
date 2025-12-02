"use client"

import { useAppAvailabilityGuard } from "@/hooks/use-app-availability"
import { LayoutModeProvider, useLayoutMode } from "./layout-mode-context"
import { AIChatProvider } from "@/contexts/ai-chat-context"
import { SinglePaneLayout } from "./single-pane/single-pane-layout"
import { ThreePaneLayout } from "./three-pane/three-pane-layout"

function AIChatWindowContent() {
  const { mode } = useLayoutMode()

  if (mode === "three-pane") {
    return <ThreePaneLayout />
  }

  return <SinglePaneLayout />
}

export function AIChatWindow() {
  // App availability guard - checks if user's org has access to AI Assistant
  const guard = useAppAvailabilityGuard({
    code: "ai-assistant",
    name: "AI Assistant",
    description: "AI-powered assistant for automating emails, CRM updates, form processing, event management, and workflow orchestration through natural language conversations"
  })

  if (guard) return guard

  return (
    <AIChatProvider>
      <LayoutModeProvider>
        <div className="h-full flex flex-col">
          <AIChatWindowContent />
        </div>
      </LayoutModeProvider>
    </AIChatProvider>
  )
}
