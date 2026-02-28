"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import { Sparkles } from "lucide-react"
import { ShellProfileIcon } from "@/components/icons/shell-icons"
import type { AIChatReasoningEffort } from "@/hooks/use-ai-chat"
import {
  compactUnifiedCorrelationId,
  compareTimelineEventsDeterministically,
  resolveUnifiedTimelineMarkerLabel,
  resolveUnifiedTimelineMarkerType,
  type UnifiedTimelineMarkerType,
} from "@/lib/operator-collaboration-timeline"
import type {
  CollaborationSurfaceSelection,
  OperatorCollaborationContextPayload,
  OperatorCollaborationTimelineEvent,
} from "./operator-collaboration-types"

type ChatMessage = {
  _id?: string
  role?: string
  content?: string
  collaboration?: {
    surface?: "group" | "dm"
    threadType?: "group_thread" | "dm_thread"
    threadId?: string
    groupThreadId?: string
    dmThreadId?: string
    lineageId?: string
    correlationId?: string
    workflowKey?: string
    authorityIntentType?: string
    visibilityScope?: "group" | "dm" | "operator_only" | "system"
    specialistAgentId?: string
    specialistLabel?: string
  }
  attachments?: Array<{
    _id?: string
    kind?: "image"
    fileName?: string
    mimeType?: string
    sizeBytes?: number
    url?: string
  }>
}

function formatAttachmentSize(sizeBytes: number | undefined): string {
  if (!sizeBytes || sizeBytes <= 0) {
    return ""
  }
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

interface SlickChatMessagesProps {
  visualMode: "slick" | "single"
  collaborationContext: OperatorCollaborationContextPayload | null
  selectedSurface: CollaborationSurfaceSelection
  timelineEvents: OperatorCollaborationTimelineEvent[]
}

function resolveReasoningLabel(reasoningEffort: AIChatReasoningEffort): string {
  switch (reasoningEffort) {
    case "low":
      return "Low"
    case "high":
      return "High"
    case "extra_high":
      return "Extra High"
    default:
      return "Medium"
  }
}

function ThinkingProgress({
  isSending,
  composerMode,
  reasoningEffort,
}: {
  isSending: boolean
  composerMode: "auto" | "plan" | "plan_soft"
  reasoningEffort: AIChatReasoningEffort
}) {
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    if (!isSending) {
      setElapsedMs(0)
      return
    }

    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt)
    }, 200)

    return () => window.clearInterval(timer)
  }, [isSending])

  const phaseLabel = useMemo(() => {
    if (elapsedMs < 1800) {
      return "Reading recent context"
    }
    if (elapsedMs < 4200) {
      if (composerMode === "plan") {
        return "Drafting a step-by-step plan"
      }
      if (composerMode === "plan_soft") {
        return "Drafting a plan with feasibility hints"
      }
      return "Planning response structure"
    }
    if (elapsedMs < 7800) {
      return "Composing final response"
    }
    return "Final quality pass"
  }, [composerMode, elapsedMs])

  const progressPercent = Math.min(92, Math.round((elapsedMs / 10000) * 100) + 8)
  const reasoningLabel = resolveReasoningLabel(reasoningEffort)

  return (
    <div className="flex justify-start">
      <div
        className="w-full max-w-[42rem] rounded-2xl border px-4 py-3"
        style={{
          borderColor: "var(--shell-border-soft)",
          background: "var(--shell-surface-elevated)",
        }}
      >
        <div className="flex items-center gap-2">
          <Sparkles
            size={15}
            className="animate-pulse"
            style={{ color: "var(--shell-accent)" }}
          />
          <span
            className="text-sm font-semibold"
            style={{
              color: "transparent",
              backgroundImage:
                "linear-gradient(90deg, var(--shell-text-dim) 0%, var(--shell-text) 45%, var(--shell-text-dim) 100%)",
              backgroundSize: "200% 100%",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              animation: "pulse 1.8s ease-in-out infinite",
            }}
          >
            Thinking
          </span>
        </div>

        <div className="mt-1 text-xs" style={{ color: "var(--shell-text-dim)" }}>
          {phaseLabel}
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--shell-border-soft)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPercent}%`,
              background: "var(--shell-button-primary-gradient)",
            }}
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: "var(--shell-text-dim)" }}>
          <span>
            Mode: {
              composerMode === "plan"
                ? "Plan"
                : composerMode === "plan_soft"
                  ? "Plan + Hints"
                  : "Auto"
            }
          </span>
          <span>•</span>
          <span>Reasoning: {reasoningLabel}</span>
        </div>
      </div>
    </div>
  )
}

function resolveThreadBadge(message: ChatMessage): string | null {
  if (message.collaboration?.threadType === "dm_thread") {
    const specialist = message.collaboration.specialistLabel?.trim()
    return specialist && specialist.length > 0
      ? `DM • ${specialist}`
      : "DM • Specialist"
  }
  if (message.collaboration?.threadType === "group_thread") {
    return "Group • Orchestrator"
  }
  return null
}

function resolveIntentBadge(message: ChatMessage): string | null {
  const intent = message.collaboration?.authorityIntentType
  if (intent === "proposal") {
    return "Proposal path"
  }
  if (intent === "commit") {
    return "Commit path"
  }
  if (intent === "read_only") {
    return "Read only"
  }
  return null
}

function resolveTimelineMarkerTone(markerType: UnifiedTimelineMarkerType): {
  borderColor: string
  background: string
  color: string
} {
  if (markerType === "handoff") {
    return {
      borderColor: "#f59e0b",
      background: "rgba(245, 158, 11, 0.12)",
      color: "#92400e",
    }
  }
  if (markerType === "proposal") {
    return {
      borderColor: "#2563eb",
      background: "rgba(37, 99, 235, 0.12)",
      color: "#1e3a8a",
    }
  }
  if (markerType === "commit") {
    return {
      borderColor: "#16a34a",
      background: "rgba(22, 163, 74, 0.12)",
      color: "#166534",
    }
  }
  if (markerType === "dm") {
    return {
      borderColor: "var(--shell-accent-border)",
      background: "var(--shell-accent-soft)",
      color: "var(--shell-text)",
    }
  }
  return {
    borderColor: "var(--shell-border-soft)",
    background: "var(--shell-surface)",
    color: "var(--shell-text)",
  }
}

function resolveCorrelationBadge(message: ChatMessage): string | null {
  const correlationId = message.collaboration?.correlationId
  if (!correlationId) {
    return null
  }
  return `Corr ${compactUnifiedCorrelationId(correlationId)}`
}

export function SlickChatMessages({
  visualMode,
  collaborationContext,
  selectedSurface,
  timelineEvents,
}: SlickChatMessagesProps) {
  const showChatDebugMetadata = process.env.NEXT_PUBLIC_CHAT_DEBUG_METADATA === "1"
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.ai_assistant")
  const { chat, isSending, composerMode, reasoningEffort } = useAIChatContext()

  const messages = useMemo(() => {
    const sourceMessages = (chat.messages || []) as ChatMessage[]
    if (selectedSurface.kind === "group") {
      return sourceMessages.filter((message) => message.collaboration?.threadType !== "dm_thread")
    }

    return sourceMessages.filter((message) => {
      if (message.collaboration?.threadType !== "dm_thread") {
        return false
      }

      const dmThreadId = message.collaboration.dmThreadId || message.collaboration.threadId
      if (dmThreadId !== selectedSurface.dmThreadId) {
        return false
      }

      if (!message.collaboration.specialistAgentId) {
        return true
      }

      return message.collaboration.specialistAgentId === selectedSurface.specialistAgentId
    })
  }, [chat.messages, selectedSurface])
  const timelineMarkers = useMemo(() => {
    return timelineEvents
      .filter((event) => {
        const dmThreadId = event.dmThreadId?.trim()
        if (selectedSurface.kind === "group") {
          if (event.threadType === "dm_thread") {
            return false
          }
          if (dmThreadId) {
            return false
          }
          return true
        }
        return Boolean(dmThreadId && dmThreadId === selectedSurface.dmThreadId)
      })
      .map((event) => {
        const markerType = resolveUnifiedTimelineMarkerType(event)
        if (!markerType) {
          return null
        }
        return {
          markerType,
          eventId: event.eventId,
          eventOrdinal: event.eventOrdinal,
          correlationId: event.correlationId,
          occurredAt: event.occurredAt,
          title: event.title,
        }
      })
      .filter((marker): marker is {
        markerType: UnifiedTimelineMarkerType
        eventId: string
        eventOrdinal: number
        correlationId: string
        occurredAt: number
        title: string
      } => marker !== null)
      .sort(compareTimelineEventsDeterministically)
      .slice(0, 12)
  }, [timelineEvents, selectedSurface])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, isSending, selectedSurface, timelineMarkers.length])

  if (translationsLoading) {
    return (
      <div className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="text-sm" style={{ color: "var(--shell-text-dim)" }}>
          {t("ui.ai_assistant.loading.translations")}
        </div>
      </div>
    )
  }

  if (chat.isLoading && messages.length === 0) {
    return (
      <div className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="text-sm" style={{ color: "var(--shell-text-dim)" }}>
          Loading conversation...
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    const specialistLabel = selectedSurface.kind === "dm" ? selectedSurface.specialistLabel : null
    return (
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 pb-24">
        <div className="text-center max-w-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/splash-icon.png"
            alt="SevenLayers"
            className="mx-auto mb-4 h-10 w-10"
          />
          <h2 className="text-2xl sm:text-3xl font-semibold leading-tight" style={{ color: "var(--shell-text)" }}>
            {selectedSurface.kind === "dm"
              ? `Start a direct thread with ${specialistLabel || "the specialist"}`
              : visualMode === "single"
                ? "How can I help you today?"
                : "How can I help you this evening?"}
          </h2>
          <p className="mt-4 text-sm" style={{ color: "var(--shell-text-dim)" }}>
            {selectedSurface.kind === "dm"
              ? "DM actions are proposal-scoped and visible only to operator, orchestrator, and the addressed specialist."
              : "Voice-first chat is ready."}
          </p>
          {showChatDebugMetadata && collaborationContext?.lineageId ? (
            <p className="mt-2 text-[11px]" style={{ color: "var(--shell-text-dim)" }}>
              Lineage {collaborationContext.lineageId}
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 pt-20 pb-40">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        {showChatDebugMetadata && timelineMarkers.length > 0 ? (
          <div
            className="rounded-2xl border px-3 py-2"
            style={{
              borderColor: "var(--shell-border-soft)",
              background: "var(--shell-surface-elevated)",
            }}
          >
            <p className="text-[11px] font-semibold" style={{ color: "var(--shell-text-dim)" }}>
              Timeline markers · deterministic order
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {timelineMarkers.map((marker) => {
                const tone = resolveTimelineMarkerTone(marker.markerType)
                return (
                  <span
                    key={marker.eventId}
                    className="rounded-full border px-2 py-0.5 text-[10px]"
                    style={tone}
                    title={marker.title}
                  >
                    {resolveUnifiedTimelineMarkerLabel(marker.markerType)} · #{marker.eventOrdinal} · {compactUnifiedCorrelationId(marker.correlationId)}
                  </span>
                )
              })}
            </div>
          </div>
        ) : null}

        {messages.map((message, idx) => {
          const key = message._id || `${message.role || "message"}-${idx}`
          const content = message.content || ""
          const threadBadge = resolveThreadBadge(message)
          const intentBadge = resolveIntentBadge(message)
          const correlationBadge = resolveCorrelationBadge(message)

          if (message.role === "system") {
            return (
              <div key={key} className="flex justify-center">
                <div
                  className="rounded-full border px-3 py-1 text-xs"
                  style={{
                    borderColor: "var(--shell-border-soft)",
                    color: "var(--shell-text-dim)",
                    background: "var(--shell-surface-elevated)",
                  }}
                >
                  {content}
                </div>
              </div>
            )
          }

          if (message.role === "user") {
            const imageAttachments = (message.attachments || []).filter(
              (attachment) => attachment.kind === "image"
            )
            return (
              <div key={key} className="flex justify-end">
                <div
                  className="max-w-[82%] rounded-3xl border px-4 py-3 text-sm leading-relaxed"
                  style={{
                    borderColor: "var(--shell-border-soft)",
                    background: "var(--shell-surface-elevated)",
                    color: "var(--shell-text)",
                  }}
                >
                  {imageAttachments.length > 0 ? (
                    <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {imageAttachments.map((attachment, attachmentIndex) => {
                        const attachmentKey = attachment._id || `${key}-attachment-${attachmentIndex}`
                        const sizeLabel = formatAttachmentSize(attachment.sizeBytes)
                        return (
                          <div
                            key={attachmentKey}
                            className="overflow-hidden rounded-2xl border"
                            style={{
                              borderColor: "var(--shell-border-soft)",
                              background: "var(--shell-surface)",
                            }}
                          >
                            {attachment.url ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={attachment.url}
                                  alt={attachment.fileName || "Image attachment"}
                                  className="h-40 w-full object-cover"
                                  loading="lazy"
                                />
                              </>
                            ) : (
                              <div
                                className="flex h-28 items-center justify-center text-xs"
                                style={{ color: "var(--shell-text-dim)" }}
                              >
                                Preview unavailable
                              </div>
                            )}
                            <div className="px-2 py-1.5 text-[11px]" style={{ color: "var(--shell-text-dim)" }}>
                              <span className="truncate">{attachment.fileName || "Image"}</span>
                              {sizeLabel ? <span>{` • ${sizeLabel}`}</span> : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}

                  {showChatDebugMetadata && (threadBadge || intentBadge || correlationBadge) ? (
                    <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {threadBadge ? (
                        <span
                          className="rounded-full border px-2 py-0.5"
                          style={{
                            borderColor: "var(--shell-border-soft)",
                            color: "var(--shell-text-dim)",
                          }}
                        >
                          {threadBadge}
                        </span>
                      ) : null}
                      {intentBadge ? (
                        <span
                          className="rounded-full border px-2 py-0.5"
                          style={{
                            borderColor: "var(--shell-border-soft)",
                            color: "var(--shell-text-dim)",
                          }}
                        >
                          {intentBadge}
                        </span>
                      ) : null}
                      {correlationBadge ? (
                        <span
                          className="rounded-full border px-2 py-0.5"
                          style={{
                            borderColor: "var(--shell-border-soft)",
                            color: "var(--shell-text-dim)",
                          }}
                        >
                          {correlationBadge}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex items-start gap-2">
                    <div className="flex-1 whitespace-pre-wrap break-words">{content}</div>
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center">
                      <ShellProfileIcon size={16} tone="active" />
                    </span>
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div key={key} className="flex justify-start">
              <div className="max-w-[88%] px-1 py-1 text-[15px] leading-7" style={{ color: "var(--shell-text)" }}>
                <div className="mb-1 flex items-center gap-2 text-[11px]" style={{ color: "var(--shell-text-dim)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/splash-icon.png" alt="" className="h-3.5 w-3.5 rounded-full" />
                  <span>SevenLayers</span>
                </div>
                {showChatDebugMetadata && (threadBadge || intentBadge || correlationBadge) ? (
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    {threadBadge ? (
                      <span
                        className="rounded-full border px-2 py-0.5"
                        style={{
                          borderColor: "var(--shell-border-soft)",
                          color: "var(--shell-text-dim)",
                        }}
                      >
                        {threadBadge}
                      </span>
                    ) : null}
                    {intentBadge ? (
                      <span
                        className="rounded-full border px-2 py-0.5"
                        style={{
                          borderColor: "var(--shell-border-soft)",
                          color: "var(--shell-text-dim)",
                        }}
                      >
                        {intentBadge}
                      </span>
                    ) : null}
                    {correlationBadge ? (
                      <span
                        className="rounded-full border px-2 py-0.5"
                        style={{
                          borderColor: "var(--shell-border-soft)",
                          color: "var(--shell-text-dim)",
                        }}
                      >
                        {correlationBadge}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div className="whitespace-pre-wrap break-words">{content}</div>
              </div>
            </div>
          )
        })}

        {isSending ? (
          <ThinkingProgress
            isSending={isSending}
            composerMode={composerMode}
            reasoningEffort={reasoningEffort}
          />
        ) : null}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
