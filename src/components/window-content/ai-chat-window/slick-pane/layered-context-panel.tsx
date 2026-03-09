"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "convex/react"
import { Layers, Search, Sparkles } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import type { Id } from "../../../../../convex/_generated/dataModel"

interface LayeredContextPanelProps {
  activeLayerWorkflowId?: Id<"objects">
  onSelectWorkflow: (workflowId: Id<"objects">) => Promise<void>
  onClose: () => void
}

interface ContextWorkflowCard {
  _id: Id<"objects">
  name: string
  status: string
  mode: string
  nodeCount: number
  edgeCount: number
  hasAiChatNode: boolean
  aiChatPromptPreview?: string
  updatedAt: number
  activeConversationCount: number
}

interface LayerWorkflowOntologyApi {
  layers: {
    layerWorkflowOntology: {
      listWorkflowsForContextSwitcher: unknown
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("../../../../../convex/_generated/api").api as LayerWorkflowOntologyApi

export function LayeredContextPanel({
  activeLayerWorkflowId,
  onSelectWorkflow,
  onClose,
}: LayeredContextPanelProps) {
  const { sessionId } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [isSwitchingWorkflowId, setIsSwitchingWorkflowId] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const useQueryUntyped = useQuery as (query: unknown, args: unknown) => unknown

  const workflows = useQueryUntyped(
    api.layers.layerWorkflowOntology.listWorkflowsForContextSwitcher,
    sessionId
      ? {
          sessionId,
          search: searchQuery || undefined,
          limit: 80,
        }
      : "skip"
  ) as ContextWorkflowCard[] | undefined

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (!panelRef.current) {
        return
      }
      if (panelRef.current.contains(event.target as Node)) {
        return
      }
      onClose()
    }
    window.addEventListener("keydown", handleEscape)
    window.addEventListener("mousedown", handlePointerDown)
    return () => {
      window.removeEventListener("keydown", handleEscape)
      window.removeEventListener("mousedown", handlePointerDown)
    }
  }, [onClose])

  const cards = useMemo(() => workflows || [], [workflows])
  const hasSearch = Boolean(searchQuery.trim())

  return (
    <div
      ref={panelRef}
      className="absolute right-4 top-[4.4rem] z-40 flex h-[min(70vh,36rem)] w-[min(92vw,26rem)] flex-col rounded-2xl border"
      style={{
        borderColor: "var(--shell-border-strong)",
        background: "var(--shell-surface)",
        boxShadow: "var(--window-shell-shadow)",
      }}
    >
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{ borderColor: "var(--shell-border-soft)", background: "var(--shell-surface-elevated)" }}
      >
        <Layers className="h-4 w-4" style={{ color: "var(--shell-text)" }} />
        <p className="flex-1 text-sm font-semibold" style={{ color: "var(--shell-text)" }}>
          Layered Context
        </p>
      </div>

      <div className="border-b p-2" style={{ borderColor: "var(--shell-border-soft)" }}>
        <div
          className="flex items-center gap-2 rounded border px-2 py-1"
          style={{
            borderColor: "var(--shell-border-strong)",
            background: "var(--shell-input-surface)",
          }}
        >
          <Search className="h-3 w-3" style={{ color: "var(--shell-text-dim)" }} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search workflows"
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: "var(--shell-text)" }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {cards.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-4 text-center">
            <Layers className="mb-2 h-8 w-8" style={{ color: "var(--shell-text-dim)" }} />
            <p className="text-xs" style={{ color: "var(--shell-text-dim)" }}>
              {hasSearch ? "No workflows match your search." : "No workflows available yet."}
            </p>
          </div>
        ) : (
          cards.map((workflow) => {
            const isActive = activeLayerWorkflowId === workflow._id
            const isSwitching = isSwitchingWorkflowId === workflow._id
            return (
              <button
                key={workflow._id}
                type="button"
                className="mb-1 w-full rounded border p-2 text-left transition-colors duration-120 disabled:cursor-not-allowed disabled:opacity-60"
                style={
                  isActive
                    ? {
                        borderColor: "var(--shell-neutral-active-border)",
                        background: "var(--shell-selection-surface)",
                        color: "var(--shell-selection-text)",
                      }
                    : {
                        borderColor: "transparent",
                        color: "var(--shell-text)",
                      }
                }
                disabled={Boolean(isSwitchingWorkflowId)}
                onClick={() => {
                  setIsSwitchingWorkflowId(workflow._id)
                  void onSelectWorkflow(workflow._id).finally(() => setIsSwitchingWorkflowId(null))
                }}
                title={workflow.name}
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "currentColor" }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold" style={{ color: "currentColor" }}>
                      {workflow.name}
                    </p>
                    <p className="mt-1 text-[11px] opacity-75" style={{ color: "currentColor" }}>
                      {workflow.nodeCount} nodes • {workflow.edgeCount} edges • {workflow.activeConversationCount} active chats
                    </p>
                    {workflow.hasAiChatNode && workflow.aiChatPromptPreview ? (
                      <p className="mt-1 line-clamp-2 text-[11px] opacity-80" style={{ color: "currentColor" }}>
                        {workflow.aiChatPromptPreview}
                      </p>
                    ) : null}
                    {isSwitching ? (
                      <p className="mt-1 text-[11px] font-medium" style={{ color: "currentColor" }}>
                        Creating scoped conversation...
                      </p>
                    ) : null}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
