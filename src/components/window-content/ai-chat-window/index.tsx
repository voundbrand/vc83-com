"use client"

import { useAppAvailabilityGuard } from "@/hooks/use-app-availability"
import { LayoutModeProvider, useLayoutMode } from "./layout-mode-context"
import { SinglePaneLayout } from "./single-pane/single-pane-layout"
// import { ThreePaneLayout } from "./three-pane/three-pane-layout" // TODO: Phase 2

function AIChatWindowContent() {
  const { mode } = useLayoutMode()

  if (mode === "three-pane") {
    // TODO: Phase 2 - Three-pane layout
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div>
          <div className="text-4xl mb-4">🚧</div>
          <div className="font-pixel text-sm mb-2">Three-Pane Mode</div>
          <div className="text-xs text-gray-600">Coming in Phase 2...</div>
        </div>
      </div>
    )
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
    <LayoutModeProvider>
      <div className="h-full flex flex-col">
        <AIChatWindowContent />
      </div>
    </LayoutModeProvider>
  )
}
