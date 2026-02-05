"use client"

import { useAppAvailabilityGuard } from "@/hooks/use-app-availability"
import { LayoutModeProvider, useLayoutMode } from "./layout-mode-context"
import { AIChatProvider } from "@/contexts/ai-chat-context"
import { SinglePaneLayout } from "./single-pane/single-pane-layout"
import { ThreePaneLayout } from "./three-pane/three-pane-layout"
import { FourPaneLayout } from "./four-pane/four-pane-layout"
import { ArrowLeft, Maximize2 } from "lucide-react"
import Link from "next/link"

interface AIChatWindowProps {
  /** When true, shows back-to-desktop navigation (for /chat route) */
  fullScreen?: boolean;
}

function AIChatWindowContent({ fullScreen = false }: { fullScreen?: boolean }) {
  const { mode } = useLayoutMode()

  if (mode === "four-pane") {
    return <FourPaneLayout />
  }

  if (mode === "three-pane") {
    return <ThreePaneLayout />
  }

  return (
    <>
      {/* Navigation header for fullScreen mode */}
      {fullScreen && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-700 bg-zinc-800/50">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-lg transition-colors"
            title="Back to Desktop"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm font-medium text-zinc-100">AI Assistant</span>
          <div className="flex-1" />
        </div>
      )}
      <SinglePaneLayout />
      {/* Open full screen link (window mode only) */}
      {!fullScreen && (
        <div className="absolute top-2 right-2 z-10">
          <Link
            href="/chat"
            className="flex items-center gap-1.5 px-2 py-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-lg transition-colors"
            title="Open Full Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </Link>
        </div>
      )}
    </>
  )
}

export function AIChatWindow({ fullScreen = false }: AIChatWindowProps = {}) {
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
        <div className="h-full flex flex-col relative">
          <AIChatWindowContent fullScreen={fullScreen} />
        </div>
      </LayoutModeProvider>
    </AIChatProvider>
  )
}
