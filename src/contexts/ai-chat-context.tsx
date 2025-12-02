"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { Id } from "../../convex/_generated/dataModel"
import { useAIChat } from "@/hooks/use-ai-chat"

interface AIChatContextType {
  // Current conversation
  currentConversationId: Id<"aiConversations"> | undefined
  setCurrentConversationId: (id: Id<"aiConversations"> | undefined) => void

  // Chat hook (provides all data and actions)
  chat: ReturnType<typeof useAIChat>

  // UI State
  isSending: boolean
  setIsSending: (sending: boolean) => void
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined)

export function AIChatProvider({ children }: { children: ReactNode }) {
  const [currentConversationId, setCurrentConversationId] = useState<
    Id<"aiConversations"> | undefined
  >(undefined)
  const [isSending, setIsSending] = useState(false)

  const chat = useAIChat(currentConversationId)

  return (
    <AIChatContext.Provider
      value={{
        currentConversationId,
        setCurrentConversationId,
        chat,
        isSending,
        setIsSending,
      }}
    >
      {children}
    </AIChatContext.Provider>
  )
}

export function useAIChatContext() {
  const context = useContext(AIChatContext)
  if (!context) {
    throw new Error("useAIChatContext must be used within AIChatProvider")
  }
  return context
}
