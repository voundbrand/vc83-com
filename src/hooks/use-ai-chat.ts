"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { useMutation, useQuery, useAction } from "convex/react"
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../convex/_generated/api") as { api: any }
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

export interface ConversationMessageRecord {
  _id: string
  role: "user" | "assistant" | "system"
  content: string
  createdAt: number
}

export interface ConversationRecord {
  _id: Id<"aiConversations">
  organizationId: Id<"organizations">
  userId: Id<"users">
  title?: string
  status: "active" | "archived"
  createdAt: number
  updatedAt: number
  messages: ConversationMessageRecord[]
}

export type GuestConversionKind =
  | "create_account"
  | "resume_chat"
  | "upgrade_plan"
  | "buy_credits"
  | "open_link"

export interface GuestConversionAction {
  key: string
  kind: GuestConversionKind
  label: string
  href: string
}

export interface GuestChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: number
  actions?: GuestConversionAction[]
}

export interface NativeGuestChatConfig {
  organizationId: string
  agentId: string
  apiBaseUrl?: string
}

interface CampaignAttribution {
  source?: string
  medium?: string
  campaign?: string
  content?: string
  term?: string
  referrer?: string
  landingPath?: string
}

interface NativeGuestMessageResponse {
  sessionToken?: string
  claimToken?: string | null
  response?: string
  message?: string
  error?: string
}

const GUEST_STORAGE_PREFIX = "l4yercak3_native_guest_"
const GUEST_SESSION_TOKEN_KEY = `${GUEST_STORAGE_PREFIX}session_token`
const GUEST_CLAIM_TOKEN_KEY = `${GUEST_STORAGE_PREFIX}claim_token`
const GUEST_MESSAGES_KEY = `${GUEST_STORAGE_PREFIX}messages`
const GUEST_CLAIMED_TOKEN_KEY = `${GUEST_STORAGE_PREFIX}claimed_token`
const MAX_GUEST_MESSAGES = 80

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

function readStorageValue(key: string): string | null {
  if (!isBrowser()) return null
  return window.localStorage.getItem(key)
}

function writeStorageValue(key: string, value: string | null): void {
  if (!isBrowser()) return
  if (value === null) {
    window.localStorage.removeItem(key)
    return
  }
  window.localStorage.setItem(key, value)
}

function safeParseMessages(raw: string | null): GuestChatMessage[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as GuestChatMessage[]
  } catch {
    return []
  }
}

function storeGuestMessages(messages: GuestChatMessage[]): void {
  writeStorageValue(GUEST_MESSAGES_KEY, JSON.stringify(messages.slice(-MAX_GUEST_MESSAGES)))
}

function normalizeApiBaseUrl(apiBaseUrl?: string): string {
  const configured =
    apiBaseUrl ||
    process.env.NEXT_PUBLIC_API_ENDPOINT_URL ||
    (isBrowser() ? window.location.origin : "")
  return configured.replace(/\/+$/, "")
}

export function resolveAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || (isBrowser() ? window.location.origin : "")).replace(/\/+$/, "")
}

function getNativeGuestDeviceFingerprint(): string | undefined {
  if (!isBrowser()) return undefined
  const key = `${GUEST_STORAGE_PREFIX}device_fingerprint`
  const existing = window.localStorage.getItem(key)
  if (existing && existing.length > 0) {
    return existing
  }

  const created = `ngf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
  window.localStorage.setItem(key, created)
  return created
}

function getCampaignAttribution(): CampaignAttribution | undefined {
  if (!isBrowser()) return undefined
  const url = new URL(window.location.href)
  const attribution: CampaignAttribution = {
    source: url.searchParams.get("utm_source") || url.searchParams.get("utmSource") || undefined,
    medium: url.searchParams.get("utm_medium") || url.searchParams.get("utmMedium") || undefined,
    campaign: url.searchParams.get("utm_campaign") || url.searchParams.get("utmCampaign") || undefined,
    content: url.searchParams.get("utm_content") || url.searchParams.get("utmContent") || undefined,
    term: url.searchParams.get("utm_term") || url.searchParams.get("utmTerm") || undefined,
    referrer: document.referrer || undefined,
    landingPath: `${url.pathname}${url.search}`,
  }

  const hasSignal = Object.values(attribution).some((value) => typeof value === "string" && value.length > 0)
  return hasSignal ? attribution : undefined
}

function withOnboardingAttribution(
  url: string,
  channel: "webchat" | "native_guest",
  attribution?: CampaignAttribution
): string {
  try {
    const parsed = new URL(url, resolveAppBaseUrl())
    parsed.searchParams.set("onboardingChannel", channel)

    if (attribution?.source) parsed.searchParams.set("utm_source", attribution.source)
    if (attribution?.medium) parsed.searchParams.set("utm_medium", attribution.medium)
    if (attribution?.campaign) parsed.searchParams.set("utm_campaign", attribution.campaign)
    if (attribution?.content) parsed.searchParams.set("utm_content", attribution.content)
    if (attribution?.term) parsed.searchParams.set("utm_term", attribution.term)
    if (attribution?.referrer) parsed.searchParams.set("referrer", attribution.referrer)
    if (attribution?.landingPath) parsed.searchParams.set("landingPath", attribution.landingPath)

    return parsed.toString()
  } catch {
    return url
  }
}

export function getNativeGuestClaimToken(): string | null {
  return readStorageValue(GUEST_CLAIM_TOKEN_KEY)
}

export function setNativeGuestClaimToken(token?: string | null): void {
  const normalized = token && token.length > 0 ? token : null
  writeStorageValue(GUEST_CLAIM_TOKEN_KEY, normalized)
  const claimedToken = readStorageValue(GUEST_CLAIMED_TOKEN_KEY)
  if (!normalized || (claimedToken && claimedToken !== normalized)) {
    writeStorageValue(GUEST_CLAIMED_TOKEN_KEY, null)
  }
}

function setNativeGuestSessionToken(token?: string | null): void {
  writeStorageValue(GUEST_SESSION_TOKEN_KEY, token && token.length > 0 ? token : null)
}

function getNativeGuestSessionToken(): string | null {
  return readStorageValue(GUEST_SESSION_TOKEN_KEY)
}

export function clearNativeGuestChatState(): void {
  writeStorageValue(GUEST_SESSION_TOKEN_KEY, null)
  writeStorageValue(GUEST_CLAIM_TOKEN_KEY, null)
  writeStorageValue(GUEST_MESSAGES_KEY, null)
  writeStorageValue(GUEST_CLAIMED_TOKEN_KEY, null)
}

export function buildAccountSignupUrl(args?: {
  provider?: "google" | "microsoft" | "github"
  claimToken?: string | null
  appBaseUrl?: string
  onboardingChannel?: "webchat" | "native_guest"
  attribution?: CampaignAttribution
}): string {
  const provider = args?.provider || "google"
  const appBaseUrl = (args?.appBaseUrl || resolveAppBaseUrl()).replace(/\/+$/, "")
  const params = new URLSearchParams({
    provider,
    sessionType: "platform",
    onboardingChannel: args?.onboardingChannel || "native_guest",
  })

  if (args?.claimToken) {
    params.set("identityClaimToken", args.claimToken)
  }

  if (args?.attribution?.source) params.set("utm_source", args.attribution.source)
  if (args?.attribution?.medium) params.set("utm_medium", args.attribution.medium)
  if (args?.attribution?.campaign) params.set("utm_campaign", args.attribution.campaign)
  if (args?.attribution?.content) params.set("utm_content", args.attribution.content)
  if (args?.attribution?.term) params.set("utm_term", args.attribution.term)
  if (args?.attribution?.referrer) params.set("referrer", args.attribution.referrer)
  if (args?.attribution?.landingPath) params.set("landingPath", args.attribution.landingPath)

  return `${appBaseUrl}/api/auth/oauth-signup?${params.toString()}`
}

function normalizeActionUrl(candidate: string): string | null {
  const raw = candidate.trim()
  if (!raw) return null

  try {
    const url = new URL(raw, resolveAppBaseUrl())
    return url.toString()
  } catch {
    return null
  }
}

function classifyAction(url: URL): GuestConversionKind {
  if (url.pathname === "/api/auth/oauth-signup") return "create_account"

  if (url.pathname === "/chat" || url.searchParams.get("conversation")) {
    return "resume_chat"
  }

  if (url.searchParams.get("openWindow") === "store") {
    const panel = (url.searchParams.get("panel") || "").toLowerCase()
    if (panel.includes("credit")) return "buy_credits"
    return "upgrade_plan"
  }

  if (url.searchParams.get("purchase") === "success" && url.searchParams.get("type") === "credits") {
    return "buy_credits"
  }

  return "open_link"
}

function actionLabel(kind: GuestConversionKind): string {
  switch (kind) {
    case "create_account":
      return "Create account"
    case "resume_chat":
      return "Resume chat"
    case "upgrade_plan":
      return "Upgrade"
    case "buy_credits":
      return "Buy credits"
    default:
      return "Open link"
  }
}

function extractActionsFromText(content: string): GuestConversionAction[] {
  const urlRegex = /https?:\/\/[^\s<>"'`]+/g
  const matches = content.match(urlRegex) || []
  const dedupe = new Set<string>()
  const actions: GuestConversionAction[] = []

  for (const rawMatch of matches) {
    const normalized = normalizeActionUrl(rawMatch)
    if (!normalized || dedupe.has(normalized)) continue
    dedupe.add(normalized)
    const parsed = new URL(normalized)
    const kind = classifyAction(parsed)
    actions.push({
      key: `${kind}:${normalized}`,
      kind,
      label: actionLabel(kind),
      href: normalized,
    })
  }

  return actions
}

export async function claimPendingNativeGuestIdentity(args: {
  sessionId?: string | null
  apiBaseUrl?: string
}): Promise<{ attempted: boolean; success: boolean; alreadyClaimed?: boolean; errorCode?: string }> {
  const claimToken = getNativeGuestClaimToken()
  if (!args.sessionId || !claimToken) {
    return { attempted: false, success: false }
  }

  const previouslyClaimed = readStorageValue(GUEST_CLAIMED_TOKEN_KEY)
  if (previouslyClaimed && previouslyClaimed === claimToken) {
    return { attempted: false, success: true, alreadyClaimed: true }
  }

  const apiBaseUrl = normalizeApiBaseUrl(args.apiBaseUrl)
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/link-account/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: args.sessionId,
      identityClaimToken: claimToken,
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean
    claim?: { alreadyClaimed?: boolean; errorCode?: string }
    errorCode?: string
  }

  if (!response.ok || !payload.success) {
    return {
      attempted: true,
      success: false,
      errorCode: payload.claim?.errorCode || payload.errorCode || "claim_failed",
    }
  }

  writeStorageValue(GUEST_CLAIMED_TOKEN_KEY, claimToken)
  setNativeGuestClaimToken(null)
  return { attempted: true, success: true, alreadyClaimed: payload.claim?.alreadyClaimed }
}

export function useNativeGuestChat(config: NativeGuestChatConfig | null) {
  const [messages, setMessages] = useState<GuestChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [claimToken, setClaimToken] = useState<string | null>(null)
  const attribution = useMemo(() => getCampaignAttribution(), [])

  useEffect(() => {
    setMessages(safeParseMessages(readStorageValue(GUEST_MESSAGES_KEY)))
    setSessionToken(getNativeGuestSessionToken())
    setClaimToken(getNativeGuestClaimToken())
  }, [])

  useEffect(() => {
    storeGuestMessages(messages)
  }, [messages])

  const appendMessage = useCallback((message: GuestChatMessage) => {
    setMessages((previous) => [...previous, message].slice(-MAX_GUEST_MESSAGES))
  }, [])

  const sendMessage = useCallback(
    async (input: string) => {
      const trimmed = input.trim()
      if (!trimmed || isSending) return
      if (!config?.organizationId || !config?.agentId) {
        throw new Error("Native guest chat is not configured")
      }

      setIsSending(true)
      setError(null)

      const userMessage: GuestChatMessage = {
        id: `guest_user_${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      }
      appendMessage(userMessage)

      try {
        const apiBaseUrl = normalizeApiBaseUrl(config.apiBaseUrl)
        const deviceFingerprint = getNativeGuestDeviceFingerprint()
        const response = await fetch(`${apiBaseUrl}/api/v1/native-guest/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: config.organizationId,
            agentId: config.agentId,
            sessionToken,
            message: trimmed,
            deviceFingerprint,
            attribution,
          }),
        })

        const payload = (await response.json().catch(() => ({}))) as NativeGuestMessageResponse
        if (!response.ok) {
          throw new Error(payload.error || "Failed to send guest message")
        }

        const nextSessionToken = payload.sessionToken || null
        if (nextSessionToken) {
          setSessionToken(nextSessionToken)
          setNativeGuestSessionToken(nextSessionToken)
        }

        const nextClaimToken = payload.claimToken || claimToken || null
        if (nextClaimToken) {
          setClaimToken(nextClaimToken)
          setNativeGuestClaimToken(nextClaimToken)
        }

        const assistantContent =
          (typeof payload.response === "string" && payload.response.length > 0
            ? payload.response
            : undefined) ||
          (typeof payload.message === "string" && payload.message.length > 0
            ? payload.message
            : undefined) ||
          "I can help you get started. Tell me what you want to automate."

        appendMessage({
          id: `guest_assistant_${Date.now()}`,
          role: "assistant",
          content: assistantContent,
          timestamp: Date.now(),
          actions: extractActionsFromText(assistantContent),
        })
      } catch (sendError) {
        const message = sendError instanceof Error ? sendError.message : "Failed to send message"
        setError(message)
      } finally {
        setIsSending(false)
      }
    },
    [appendMessage, attribution, claimToken, config, isSending, sessionToken]
  )

  const reset = useCallback(() => {
    clearNativeGuestChatState()
    setMessages([])
    setSessionToken(null)
    setClaimToken(null)
    setError(null)
  }, [])

  const conversionActions = useMemo<GuestConversionAction[]>(() => {
    const appBaseUrl = resolveAppBaseUrl()
    return [
      {
        key: "create-account",
        kind: "create_account",
        label: "Create account",
        href: buildAccountSignupUrl({
          provider: "google",
          claimToken,
          appBaseUrl,
          onboardingChannel: "native_guest",
          attribution,
        }),
      },
      {
        key: "resume-chat",
        kind: "resume_chat",
        label: "Resume chat",
        href: withOnboardingAttribution(`${appBaseUrl}/chat`, "native_guest", attribution),
      },
      {
        key: "upgrade-plan",
        kind: "upgrade_plan",
        label: "Upgrade",
        href: withOnboardingAttribution(`${appBaseUrl}/?openWindow=store&panel=plans`, "native_guest", attribution),
      },
      {
        key: "buy-credits",
        kind: "buy_credits",
        label: "Buy credits",
        href: withOnboardingAttribution(`${appBaseUrl}/?openWindow=store&panel=credits`, "native_guest", attribution),
      },
    ]
  }, [attribution, claimToken])

  return {
    messages,
    isSending,
    error,
    sendMessage,
    reset,
    sessionToken,
    claimToken,
    conversionActions,
    isConfigured: Boolean(config?.organizationId && config?.agentId),
  }
}

export function useAIChat(conversationId?: Id<"aiConversations">, selectedModel?: string) {
  const { user, sessionId } = useAuth()
  const organization = user?.currentOrganization
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const claimAttemptedForSession = useRef<string | null>(null)

  useEffect(() => {
    if (!sessionId || !user || !organization) return
    if (claimAttemptedForSession.current === sessionId) return
    claimAttemptedForSession.current = sessionId

    void claimPendingNativeGuestIdentity({ sessionId }).catch((claimError) => {
      console.warn("[AI Chat] Guest claim handoff failed:", claimError)
    })
  }, [organization, sessionId, user])

  // Queries
  const useQueryUntyped = useQuery as (query: unknown, args: unknown) => any
  const useActionUntyped = useAction as (action: unknown) => any
  const useMutationUntyped = useMutation as (mutation: unknown) => any
  const apiUntyped = api as any

  const conversation = useQueryUntyped(
    apiUntyped.ai.conversations.getConversation,
    conversationId ? { conversationId } : "skip"
  )

  const conversations = useQueryUntyped(
    apiUntyped.ai.conversations.listConversations,
    user && organization
      ? { organizationId: organization.id as Id<"organizations">, userId: user.id as Id<"users"> }
      : "skip"
  )

  // Mutations & Actions
  const sendMessageAction = useActionUntyped(apiUntyped.ai.chat.sendMessage) as (args: {
    conversationId?: Id<"aiConversations">
    message: string
    organizationId: Id<"organizations">
    userId: Id<"users">
    selectedModel?: string
  }) => Promise<{ conversationId?: Id<"aiConversations"> } & Record<string, unknown>>

  const createConversationMutation = useMutationUntyped(apiUntyped.ai.conversations.createConversation) as (args: {
    organizationId: Id<"organizations">
    userId: Id<"users">
    title?: string
  }) => Promise<Id<"aiConversations">>

  const updateConversationMutation = useMutationUntyped(apiUntyped.ai.conversations.updateConversation) as (args: {
    conversationId: Id<"aiConversations">
    title?: string
  }) => Promise<void>

  const archiveConversationMutation = useMutationUntyped(apiUntyped.ai.conversations.archiveConversation) as (args: {
    conversationId: Id<"aiConversations">
  }) => Promise<void>

  const clearMessagesMutation = useMutationUntyped(apiUntyped.ai.conversations.clearConversationMessages) as (args: {
    conversationId: Id<"aiConversations">
  }) => Promise<void>

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
          selectedModel,
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
    [user, organization, sendMessageAction, selectedModel]
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

  /**
   * Clear all messages from a conversation (for debugging/recovery)
   */
  const clearMessages = useCallback(
    async (conversationId: Id<"aiConversations">) => {
      try {
        await clearMessagesMutation({ conversationId })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to clear messages"
        setError(errorMessage)
        throw err
      }
    },
    [clearMessagesMutation]
  )

  const conversationRecord = (conversation || undefined) as ConversationRecord | undefined
  const conversationList = (conversations || []) as ConversationRecord[]

  return {
    // Data
    conversation: conversationRecord,
    conversations: conversationList,
    messages: conversationRecord?.messages || [],

    // Actions
    sendMessage,
    createConversation,
    updateConversation,
    archiveConversation,
    clearMessages,

    // State
    isLoading,
    error,
    clearError: () => setError(null),
  }
}
