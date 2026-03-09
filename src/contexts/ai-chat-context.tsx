"use client"

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react"
import { Id } from "../../convex/_generated/dataModel"
import {
  useAIChat,
  type AIChatComposerMode,
  type AIChatReasoningEffort,
  type AIChatSuperAdminQaMode,
} from "@/hooks/use-ai-chat"
import { useAuth } from "@/hooks/use-auth"
import type { ConversationEventEnvelope } from "@/lib/ai/conversation-session-contract"

const CHAT_COMPOSER_MODE_STORAGE_KEY = "ai_chat_composer_mode"
const CHAT_REASONING_EFFORT_STORAGE_KEY = "ai_chat_reasoning_effort"
const CHAT_PRIVATE_MODE_STORAGE_KEY = "ai_chat_private_mode"
const CHAT_ACTIVE_LAYER_WORKFLOW_ID_STORAGE_KEY = "ai_chat_active_layer_workflow_id"

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
  activeLayerWorkflowId: Id<"objects"> | undefined
  setActiveLayerWorkflowId: (id: Id<"objects"> | undefined) => void

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
  latestConversationEvent: ConversationEventEnvelope | null
  isConversationLive: boolean
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined)

export function AIChatProvider({
  children,
  superAdminQaMode,
}: {
  children: ReactNode
  superAdminQaMode?: AIChatSuperAdminQaMode
}) {
  const [currentConversationId, setCurrentConversationId] = useState<
    Id<"aiConversations"> | undefined
  >(undefined)
  const [activeLayerWorkflowId, setActiveLayerWorkflowId] = useState<
    Id<"objects"> | undefined
  >(undefined)
  const [isSending, setIsSending] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined)
  const [composerMode, setComposerMode] = useState<AIChatComposerMode>("auto")
  const [reasoningEffort, setReasoningEffort] = useState<AIChatReasoningEffort>("medium")
  const [humanInLoopEnabled, setHumanInLoopEnabled] = useState(false)
  const [privateModeEnabled, setPrivateModeEnabled] = useState(false)
  const [latestConversationEvent, setLatestConversationEvent] = useState<ConversationEventEnvelope | null>(null)

  // Abort controller for cancelling in-flight requests
  const abortController = useRef<AbortController | null>(null)

  const chat = useAIChat(
    currentConversationId,
    selectedModel,
    superAdminQaMode,
    activeLayerWorkflowId
  )

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

    const storedActiveLayerWorkflowId = window.localStorage.getItem(
      CHAT_ACTIVE_LAYER_WORKFLOW_ID_STORAGE_KEY
    )
    if (storedActiveLayerWorkflowId) {
      setActiveLayerWorkflowId(storedActiveLayerWorkflowId as Id<"objects">)
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    if (!activeLayerWorkflowId) {
      window.localStorage.removeItem(CHAT_ACTIVE_LAYER_WORKFLOW_ID_STORAGE_KEY)
      return
    }
    window.localStorage.setItem(CHAT_ACTIVE_LAYER_WORKFLOW_ID_STORAGE_KEY, activeLayerWorkflowId)
  }, [activeLayerWorkflowId])

  useEffect(() => {
    const conversationLayerWorkflowId = chat.conversation?.layerWorkflowId as
      | Id<"objects">
      | undefined
    if (!conversationLayerWorkflowId) {
      return
    }
    setActiveLayerWorkflowId(conversationLayerWorkflowId)
  }, [chat.conversation?._id, chat.conversation?.layerWorkflowId])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const handleConversationEvent = (event: Event) => {
      const customEvent = event as CustomEvent<ConversationEventEnvelope>
      if (!customEvent.detail) {
        return
      }
      setLatestConversationEvent(customEvent.detail)
    }
    window.addEventListener("conversation_session_event", handleConversationEvent as EventListener)
    return () => {
      window.removeEventListener("conversation_session_event", handleConversationEvent as EventListener)
    }
  }, [])

  const stopCurrentRequest = () => {
    if (abortController.current) {
      console.log("🛑 [AI Chat] User stopped the request")
      abortController.current.abort()
      abortController.current = null
      setIsSending(false)
    }
  }

  const isConversationLive =
    latestConversationEvent?.state === "connecting"
    || latestConversationEvent?.state === "live"
    || latestConversationEvent?.state === "reconnecting"

  return (
    <AIChatContext.Provider
      value={{
        chatMode: "authenticated",
        currentConversationId,
        setCurrentConversationId,
        activeLayerWorkflowId,
        setActiveLayerWorkflowId,
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
        latestConversationEvent,
        isConversationLive,
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
