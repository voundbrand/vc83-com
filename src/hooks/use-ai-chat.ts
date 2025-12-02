"use client"

import { useState, useCallback } from "react"
import { useMutation, useQuery, useAction } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { useAuth } from "@/hooks/use-auth"

export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: number
  toolCalls?: ToolCall[]
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: unknown
}

export interface Conversation {
  _id: Id<"aiConversations">
  organizationId: Id<"organizations">
  userId: Id<"users">
  title?: string
  status: "active" | "archived"
  createdAt: number
  updatedAt: number
  messages: Message[]
}

export function useAIChat(conversationId?: Id<"aiConversations">) {
  const { user } = useAuth()
  const organization = user?.currentOrganization
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Queries
  const conversation = useQuery(
    api.ai.conversations.getConversation,
    conversationId ? { conversationId } : "skip"
  )

  const conversations = useQuery(
    api.ai.conversations.listConversations,
    user && organization
      ? { organizationId: organization.id as Id<"organizations">, userId: user.id as Id<"users"> }
      : "skip"
  )

  // Mutations & Actions
  const sendMessageAction = useAction(api.ai.chat.sendMessage)
  const createConversationMutation = useMutation(api.ai.conversations.createConversation)
  const updateConversationMutation = useMutation(api.ai.conversations.updateConversation)
  const archiveConversationMutation = useMutation(api.ai.conversations.archiveConversation)

  /**
   * Send a message to the AI
   */
  const sendMessage = useCallback(
    async (message: string, currentConversationId?: Id<"aiConversations">) => {
      if (!user || !organization) {
        throw new Error("User not authenticated")
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await sendMessageAction({
          conversationId: currentConversationId,
          message,
          organizationId: organization.id as Id<"organizations">,
          userId: user.id as Id<"users">,
        })

        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to send message"
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [user, organization, sendMessageAction]
  )

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(
    async (title?: string) => {
      if (!user || !organization) {
        throw new Error("User not authenticated")
      }

      try {
        const conversationId = await createConversationMutation({
          organizationId: organization.id as Id<"organizations">,
          userId: user.id as Id<"users">,
          title,
        })

        return conversationId
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create conversation"
        setError(errorMessage)
        throw err
      }
    },
    [user, organization, createConversationMutation]
  )

  /**
   * Update conversation title
   */
  const updateConversation = useCallback(
    async (conversationId: Id<"aiConversations">, updates: { title?: string }) => {
      try {
        await updateConversationMutation({
          conversationId,
          ...updates,
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update conversation"
        setError(errorMessage)
        throw err
      }
    },
    [updateConversationMutation]
  )

  /**
   * Archive a conversation
   */
  const archiveConversation = useCallback(
    async (conversationId: Id<"aiConversations">) => {
      try {
        await archiveConversationMutation({ conversationId })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to archive conversation"
        setError(errorMessage)
        throw err
      }
    },
    [archiveConversationMutation]
  )

  return {
    // Data
    conversation,
    conversations,
    messages: conversation?.messages || [],

    // Actions
    sendMessage,
    createConversation,
    updateConversation,
    archiveConversation,

    // State
    isLoading,
    error,
    clearError: () => setError(null),
  }
}
