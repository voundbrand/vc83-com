"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"
import { Id } from "../../convex/_generated/dataModel"
import {
  useAIChat,
  type AIChatComposerMode,
  type AIChatReasoningEffort,
} from "@/hooks/use-ai-chat"
import { useAuth } from "@/hooks/use-auth"

const CHAT_COMPOSER_MODE_STORAGE_KEY = "ai_chat_composer_mode"
const CHAT_REASONING_EFFORT_STORAGE_KEY = "ai_chat_reasoning_effort"
const CHAT_PRIVATE_MODE_STORAGE_KEY = "ai_chat_private_mode"

function isComposerMode(value: string): value is AIChatComposerMode {
  return value === "auto" || value === "plan" || value === "plan_soft"
}

function isReasoningEffort(value: string): value is AIChatReasoningEffort {
  return value === "low" || value === "medium" || value === "high" || value === "extra_high"
}

interface AIChatContextType {
  chatMode: "authenticated"

  // Current conversation
  currentConversationId: Id<"aiConversations"> | undefined
  setCurrentConversationId: (id: Id<"aiConversations"> | undefined) => void

  // Organization ID
  organizationId: Id<"organizations"> | undefined

  // Chat hook (provides all data and actions)
  chat: ReturnType<typeof useAIChat>

  // UI State
  isSending: boolean
  setIsSending: (sending: boolean) => void

  // Model Selection
  selectedModel: string | undefined
  setSelectedModel: (model: string | undefined) => void

  // Composer Mode
  composerMode: AIChatComposerMode
  setComposerMode: (mode: AIChatComposerMode) => void

  // Composer Reasoning Effort
  reasoningEffort: AIChatReasoningEffort
  setReasoningEffort: (effort: AIChatReasoningEffort) => void

  // Human-in-the-Loop Mode
  humanInLoopEnabled: boolean
  setHumanInLoopEnabled: (enabled: boolean) => void

  // Privacy Mode
  privateModeEnabled: boolean
  setPrivateModeEnabled: (enabled: boolean) => void

  // Abort control
  abortController: React.MutableRefObject<AbortController | null>
  stopCurrentRequest: () => void
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined)

export function AIChatProvider({ children }: { children: ReactNode }) {
  const [currentConversationId, setCurrentConversationId] = useState<
    Id<"aiConversations"> | undefined
  >(undefined)
  const [isSending, setIsSending] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined)
  const [composerMode, setComposerMode] = useState<AIChatComposerMode>("auto")
  const [reasoningEffort, setReasoningEffort] = useState<AIChatReasoningEffort>("medium")
  const [humanInLoopEnabled, setHumanInLoopEnabled] = useState(false)
  const [privateModeEnabled, setPrivateModeEnabled] = useState(false)

  // Abort controller for cancelling in-flight requests
  const abortController = useRef<AbortController | null>(null)

  const chat = useAIChat(currentConversationId, selectedModel)

  // Get current user's organization ID
  const { user } = useAuth()
  const organizationId = user?.currentOrganization?.id as Id<"organizations"> | undefined

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const storedMode = window.localStorage.getItem(CHAT_COMPOSER_MODE_STORAGE_KEY)
    if (storedMode && isComposerMode(storedMode)) {
      setComposerMode(storedMode)
    }

    const storedReasoning = window.localStorage.getItem(CHAT_REASONING_EFFORT_STORAGE_KEY)
    if (storedReasoning && isReasoningEffort(storedReasoning)) {
      setReasoningEffort(storedReasoning)
    }

    const storedPrivateMode = window.localStorage.getItem(CHAT_PRIVATE_MODE_STORAGE_KEY)
    if (storedPrivateMode === "1") {
      setPrivateModeEnabled(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    window.localStorage.setItem(CHAT_COMPOSER_MODE_STORAGE_KEY, composerMode)
  }, [composerMode])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    window.localStorage.setItem(CHAT_REASONING_EFFORT_STORAGE_KEY, reasoningEffort)
  }, [reasoningEffort])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    window.localStorage.setItem(CHAT_PRIVATE_MODE_STORAGE_KEY, privateModeEnabled ? "1" : "0")
  }, [privateModeEnabled])

  const stopCurrentRequest = () => {
    if (abortController.current) {
      console.log("🛑 [AI Chat] User stopped the request")
      abortController.current.abort()
      abortController.current = null
      setIsSending(false)
    }
  }

  return (
    <AIChatContext.Provider
      value={{
        chatMode: "authenticated",
        currentConversationId,
        setCurrentConversationId,
        organizationId,
        chat,
        isSending,
        setIsSending,
        selectedModel,
        setSelectedModel,
        composerMode,
        setComposerMode,
        reasoningEffort,
        setReasoningEffort,
        humanInLoopEnabled,
        setHumanInLoopEnabled,
        privateModeEnabled,
        setPrivateModeEnabled,
        abortController,
        stopCurrentRequest,
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
