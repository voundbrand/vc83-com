"use client"

import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { MessageSquare, FolderOpen, Plus, Search, PanelLeftClose } from "lucide-react"
import { useState, useMemo } from "react"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import type { Id } from "../../../../../convex/_generated/dataModel"

interface ConversationHistoryProps {
  onClose?: () => void
}

export function ConversationHistory({ onClose }: ConversationHistoryProps) {
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const { chat, currentConversationId, setCurrentConversationId } = useAIChatContext()
  const [searchQuery, setSearchQuery] = useState("")
  const [hoveredConversationId, setHoveredConversationId] = useState<string | null>(null)

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    const conversations = chat.conversations || []
    if (!searchQuery) return conversations

    return conversations.filter((conv: any) =>
      conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [chat.conversations, searchQuery])

  // Handle new conversation creation
  const handleNewChat = async () => {
    try {
      await chat.createConversation()
      setCurrentConversationId(undefined) // Clear selection to start fresh
      onClose?.()
    } catch (error) {
      console.error("Failed to create new conversation:", error)
    }
  }

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId as Id<"aiConversations">)
    onClose?.()
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-4 pb-3 pt-4 border-b"
        style={{
          borderColor: "var(--shell-border-strong)",
          background: "var(--shell-surface)",
        }}
      >
        <p
          className="text-[28px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--shell-text)" }}
        >
          SevenLayers
        </p>
      </div>

      {/* Conversations Header */}
      <div
        className="flex items-center justify-between p-3 border-b"
        style={{
          borderColor: "var(--shell-border-strong)",
          background: "var(--shell-surface-elevated)",
        }}
      >
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4" style={{ color: "var(--shell-text)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--shell-text)" }}>
            {t("ui.ai_assistant.history.title")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewChat}
            className="desktop-shell-button p-1 transition-colors"
            style={{ color: "var(--shell-text)" }}
            title={t("ui.ai_assistant.history.new_chat")}
          >
            <Plus className="w-4 h-4" />
          </button>
          {onClose ? (
            <button
              onClick={onClose}
              className="desktop-shell-button p-1 transition-colors"
              style={{ color: "var(--shell-text)" }}
              title="Close conversation history drawer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b" style={{ borderColor: "var(--shell-border-soft)" }}>
        <div
          className="flex items-center gap-2 px-2 py-1 border rounded"
          style={{
            borderColor: "var(--shell-border-strong)",
            background: "var(--shell-input-surface)",
          }}
        >
          <Search className="w-3 h-3" style={{ color: "var(--shell-text-dim)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("ui.ai_assistant.history.search_placeholder")}
            className="flex-1 text-xs bg-transparent outline-none"
            style={{ color: "var(--shell-text)" }}
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <MessageSquare className="w-8 h-8 mb-2" style={{ color: 'var(--shell-text-dim)' }} />
            <p className="text-xs" style={{ color: 'var(--shell-text-dim)' }}>
              {searchQuery
                ? t("ui.ai_assistant.history.no_results")
                : t("ui.ai_assistant.history.empty")}
            </p>
          </div>
        ) : (
          <div className="p-1">
            {filteredConversations.map((conv: any) => {
              const isActive = currentConversationId === conv._id
              const isHovered = hoveredConversationId === conv._id
              // Calculate message count from messages array
              const messageCount = chat.messages?.filter((msg: any) => msg.conversationId === conv._id).length || 0

              return (
                <button
                  key={conv._id}
                  onClick={() => handleSelectConversation(conv._id)}
                  onMouseEnter={() => setHoveredConversationId(conv._id)}
                  onMouseLeave={() => setHoveredConversationId((current) => (current === conv._id ? null : current))}
                  className="w-full text-left p-2 mb-1 rounded border transition-colors duration-120"
                  style={isActive ? {
                    borderColor: "var(--shell-neutral-active-border)",
                    background: "var(--shell-selection-surface)",
                    color: "var(--shell-selection-text)",
                  } : isHovered ? {
                    borderColor: "transparent",
                    background: "var(--shell-neutral-hover-surface)",
                    color: "var(--shell-input-text)",
                  } : {
                    borderColor: "transparent",
                    color: "var(--shell-text)",
                  }}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "currentColor" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "currentColor" }}>
                        {conv.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs opacity-70">
                        <span>{messageCount} {t("ui.ai_assistant.history.messages")}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(new Date(conv.createdAt))}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div
        className="p-2 border-t text-xs"
        style={{
          borderColor: "var(--shell-border-soft)",
          color: "var(--shell-text-dim)",
        }}
      >
        {filteredConversations.length} {t("ui.ai_assistant.history.conversations")}
      </div>
    </div>
  )
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
