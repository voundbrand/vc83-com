"use client"

import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { MessageSquare, FolderOpen, Plus, Search, Layers, ExternalLink } from "lucide-react"
import { useState, useMemo } from "react"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import Link from "next/link"
import type { Id } from "../../../../../convex/_generated/dataModel"

export function ConversationHistory() {
  const { t } = useNamespaceTranslations("ui.ai_assistant")
  const { chat, currentConversationId, setCurrentConversationId } = useAIChatContext()
  const [searchQuery, setSearchQuery] = useState("")

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    const conversations = chat.conversations || []
    if (!searchQuery) return conversations

    return conversations.filter((conv) =>
      conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [chat.conversations, searchQuery])

  // Handle new conversation creation
  const handleNewChat = async () => {
    try {
      await chat.createConversation()
      setCurrentConversationId(undefined) // Clear selection to start fresh
    } catch (error) {
      console.error("Failed to create new conversation:", error)
    }
  }

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId as Id<"aiConversations">)
  }

  return (
    <div className="flex flex-col h-full">
      {/* l4yercak3 Builder Link */}
      <Link
        href="/builder"
        className="flex items-center gap-2 p-3 border-b-2 transition-colors group"
        style={{
          borderColor: 'var(--win95-border-dark)',
          background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        }}
      >
        <Layers className="w-4 h-4 text-white" />
        <span className="text-sm font-semibold text-white flex-1">
          l4yercak3 Builder
        </span>
        <ExternalLink className="w-3 h-3 text-white/70 group-hover:text-white transition-colors" />
      </Link>

      {/* Conversations Header */}
      <div
        className="flex items-center justify-between p-3 border-b-2"
        style={{
          borderColor: 'var(--win95-border-dark)',
          background: 'var(--win95-title-bg)'
        }}
      >
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4" style={{ color: 'var(--win95-text)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
            {t("ui.ai_assistant.history.title")}
          </span>
        </div>
        <button
          onClick={handleNewChat}
          className="p-1 rounded transition-colors"
          style={{
            color: 'var(--win95-text)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--win95-hover-bg)'
            e.currentTarget.style.color = 'var(--win95-hover-text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--win95-text)'
          }}
          title={t("ui.ai_assistant.history.new_chat")}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b" style={{ borderColor: 'var(--win95-border-light)' }}>
        <div
          className="flex items-center gap-2 px-2 py-1 border rounded"
          style={{
            borderColor: 'var(--win95-border-dark)',
            background: 'var(--win95-input-bg)'
          }}
        >
          <Search className="w-3 h-3" style={{ color: 'var(--win95-text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("ui.ai_assistant.history.search_placeholder")}
            className="flex-1 text-xs bg-transparent outline-none"
            style={{ color: 'var(--win95-text)' }}
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <MessageSquare className="w-8 h-8 mb-2" style={{ color: 'var(--win95-text-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--win95-text-muted)' }}>
              {searchQuery
                ? t("ui.ai_assistant.history.no_results")
                : t("ui.ai_assistant.history.empty")}
            </p>
          </div>
        ) : (
          <div className="p-1">
            {filteredConversations.map((conv) => {
              const isActive = currentConversationId === conv._id
              // Calculate message count from messages array
              const messageCount = chat.messages?.filter(msg => msg.conversationId === conv._id).length || 0

              return (
                <button
                  key={conv._id}
                  onClick={() => handleSelectConversation(conv._id)}
                  className={`w-full text-left p-2 mb-1 rounded transition-colors ${
                    isActive ? 'border-l-2' : ''
                  }`}
                  style={isActive ? {
                    borderColor: 'var(--win95-highlight)',
                    background: 'var(--win95-bg-light)',
                    color: 'var(--win95-text)'
                  } : {
                    color: 'var(--win95-text)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--win95-hover-light)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: 'currentColor' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'currentColor' }}>
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
          borderColor: 'var(--win95-border-light)',
          color: 'var(--win95-text-muted)'
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
