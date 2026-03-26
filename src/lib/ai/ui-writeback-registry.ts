"use client"

import {
  BOOKING_SETUP_WRITEBACK_CONTRACT_VERSION,
  BOOKING_SETUP_WRITEBACK_EVENT,
  CMS_COPY_REWRITE_SUGGESTION_CONTRACT_VERSION,
  CMS_COPY_REWRITE_SUGGESTION_EVENT,
  LAYERS_WORKFLOW_WRITEBACK_CONTRACT_VERSION,
  LAYERS_WORKFLOW_WRITEBACK_EVENT,
  dispatchAIWritebackEvent,
  type BookingSetupWizardWritebackEventDetail,
  type CmsCopyRewriteSuggestionEventDetail,
  type LayersWorkflowWritebackEventDetail,
} from "@/lib/ai/ui-writeback-bridge"
import { parseLayersAIResponse } from "@/components/layers/ai-workflow-schema"

export interface AIChatWritebackMessage {
  _id?: string
  id?: string
  role?: string
  content?: string
  createdAt?: number
  timestamp?: number
}

interface AIChatWritebackRegistryContext {
  openContext?: string
  sourceSessionId?: string
  sourceOrganizationId?: string
  messages: AIChatWritebackMessage[]
  lastEmittedMessageFingerprint?: string | null
}

interface AIChatWritebackRegistryHandler {
  id: string
  panel: string
  emit: (args: AIChatWritebackRegistryContext) => string | null
}

interface CmsRewriteKickoffPayload {
  application?: {
    id?: string
    name?: string
  }
  field?: {
    page?: string
    section?: string
    key?: string
    label?: string
    locale?: string
  }
}

interface BookingSetupKickoffPayload {
  appSlug?: string
  surfaceType?: string
  surfaceKey?: string
}

interface LayersWorkflowKickoffPayload {
  workflowId?: string
}

function decodeUtf8Base64(value: string): string | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const binary = window.atob(value)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

function cleanOptionalString(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }
  return value.trim()
}

function parseCmsRewriteKickoffPayload(openContext?: string): CmsRewriteKickoffPayload | null {
  if (!openContext || !openContext.startsWith("cms_rewrite:")) {
    return null
  }

  const encodedPayload = openContext.slice("cms_rewrite:".length).trim()
  if (!encodedPayload) {
    return null
  }

  const decoded = decodeUtf8Base64(encodedPayload)
  if (!decoded) {
    return null
  }

  try {
    const parsed = JSON.parse(decoded) as CmsRewriteKickoffPayload
    if (!parsed || typeof parsed !== "object") {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function parseBookingSetupKickoffPayload(
  openContext?: string
): BookingSetupKickoffPayload | null {
  if (!openContext || !openContext.startsWith("booking_setup:")) {
    return null
  }

  const encodedPayload = openContext.slice("booking_setup:".length).trim()
  if (!encodedPayload) {
    return null
  }

  const decoded = decodeUtf8Base64(encodedPayload)
  if (!decoded) {
    return null
  }

  try {
    const parsed = JSON.parse(decoded) as BookingSetupKickoffPayload
    if (!parsed || typeof parsed !== "object") {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function parseLayersWorkflowKickoffPayload(
  openContext?: string
): LayersWorkflowKickoffPayload | null {
  if (!openContext || !openContext.startsWith("layers_workflow:")) {
    return null
  }

  const encodedPayload = openContext.slice("layers_workflow:".length).trim()
  if (!encodedPayload) {
    return null
  }

  const decoded = decodeUtf8Base64(encodedPayload)
  if (!decoded) {
    return null
  }

  try {
    const parsed = JSON.parse(decoded) as LayersWorkflowKickoffPayload
    if (!parsed || typeof parsed !== "object") {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function stripOuterCodeFence(value: string): string {
  const trimmed = value.trim()
  const fenceMatch = trimmed.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```$/)
  if (!fenceMatch) {
    return trimmed
  }
  return fenceMatch[1]?.trim() || ""
}

function resolveCmsRewriteAssistantSuggestion(content: string): string {
  const normalized = stripOuterCodeFence(content)
  if (!normalized) {
    return ""
  }

  const optionRegex =
    /(?:^|\n)\s*([1-3])(?:[)\].:-]|\s+-)\s+([\s\S]*?)(?=(?:\n\s*[1-3](?:[)\].:-]|\s+-)\s+)|(?:\n\s*(?:recommended|empfohlen|rationale|begruendung|why)\b)|$)/gi
  const optionByIndex = new Map<number, string>()
  let optionMatch: RegExpExecArray | null = optionRegex.exec(normalized)
  while (optionMatch) {
    const optionIndex = Number(optionMatch[1])
    const optionText = stripOuterCodeFence(optionMatch[2] || "")
    if (optionIndex >= 1 && optionIndex <= 3 && optionText) {
      optionByIndex.set(optionIndex, optionText)
    }
    optionMatch = optionRegex.exec(normalized)
  }

  const recommendedOptionMatch = normalized.match(
    /(?:recommended(?:\s+option)?|empfohlene?\s+option|best option)\s*[:\-]?\s*(?:option\s*)?([1-3])\b/i
  )
  if (recommendedOptionMatch) {
    const recommendedIndex = Number(recommendedOptionMatch[1])
    const recommendedOption = optionByIndex.get(recommendedIndex)
    if (recommendedOption) {
      return recommendedOption
    }
  }

  const recommendedBlockMatch = normalized.match(
    /(?:^|\n)(?:recommended(?:\s+option)?|empfohlene?\s+option|best option)\s*[:\-]?\s*([\s\S]+?)(?=(?:\n\s*(?:rationale|begruendung|why)\b)|$)/i
  )
  if (recommendedBlockMatch?.[1]) {
    const suggested = stripOuterCodeFence(recommendedBlockMatch[1])
    if (suggested) {
      return suggested
    }
  }

  if (optionByIndex.size > 0) {
    const firstOption = optionByIndex.get(1) || optionByIndex.get(2) || optionByIndex.get(3)
    if (firstOption) {
      return firstOption
    }
  }

  return normalized
}

function parseBookingSetupWriteback(
  content: string
): BookingSetupWizardWritebackEventDetail | null {
  const normalized = stripOuterCodeFence(content)
  if (!normalized) {
    return null
  }

  const parseRecord = (
    candidate: string
  ): BookingSetupWizardWritebackEventDetail | null => {
    const trimmed = candidate.trim()
    if (!trimmed) {
      return null
    }
    try {
      const parsed = JSON.parse(trimmed) as BookingSetupWizardWritebackEventDetail
      if (!parsed || typeof parsed !== "object") {
        return null
      }
      if (parsed.contractVersion !== BOOKING_SETUP_WRITEBACK_CONTRACT_VERSION) {
        return null
      }
      return parsed
    } catch {
      return null
    }
  }

  const fencedWritebackRegex = /```booking_writeback_v1\s*([\s\S]*?)```/gi
  let fencedMatch: RegExpExecArray | null = fencedWritebackRegex.exec(normalized)
  while (fencedMatch) {
    const parsed = parseRecord(fencedMatch[1] || "")
    if (parsed) {
      return parsed
    }
    fencedMatch = fencedWritebackRegex.exec(normalized)
  }

  const genericJsonRegex = /```json\s*([\s\S]*?)```/gi
  let genericMatch: RegExpExecArray | null = genericJsonRegex.exec(normalized)
  while (genericMatch) {
    const parsed = parseRecord(genericMatch[1] || "")
    if (parsed) {
      return parsed
    }
    genericMatch = genericJsonRegex.exec(normalized)
  }

  return parseRecord(normalized)
}

function parseLayersWorkflowWriteback(
  content: string
): LayersWorkflowWritebackEventDetail | null {
  const normalized = stripOuterCodeFence(content)
  if (!normalized) {
    return null
  }

  const parseRecord = (
    candidate: string
  ): LayersWorkflowWritebackEventDetail | null => {
    const trimmed = candidate.trim()
    if (!trimmed) {
      return null
    }

    try {
      const parsed = JSON.parse(trimmed) as {
        contractVersion?: string
        workflowId?: string
        description?: string
        warnings?: string[]
        nodes?: unknown
        edges?: unknown
      }
      if (!parsed || typeof parsed !== "object") {
        return null
      }
      if (parsed.contractVersion !== LAYERS_WORKFLOW_WRITEBACK_CONTRACT_VERSION) {
        return null
      }

      const workflowParse = parseLayersAIResponse(
        JSON.stringify({
          nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
          edges: Array.isArray(parsed.edges) ? parsed.edges : [],
          description: cleanOptionalString(parsed.description) || undefined,
        })
      )
      if (!workflowParse.data) {
        return null
      }

      const allWarnings = [
        ...(Array.isArray(parsed.warnings)
          ? parsed.warnings.filter((warning): warning is string => typeof warning === "string")
          : []),
        ...(workflowParse.warnings || []),
      ]

      return {
        contractVersion: LAYERS_WORKFLOW_WRITEBACK_CONTRACT_VERSION,
        workflowId: cleanOptionalString(parsed.workflowId) || undefined,
        description: workflowParse.data.description,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
        nodes: workflowParse.data.nodes,
        edges: workflowParse.data.edges,
      }
    } catch {
      return null
    }
  }

  const fencedWritebackRegex = /```layers_workflow_writeback_v1\s*([\s\S]*?)```/gi
  let fencedMatch: RegExpExecArray | null = fencedWritebackRegex.exec(normalized)
  while (fencedMatch) {
    const parsed = parseRecord(fencedMatch[1] || "")
    if (parsed) {
      return parsed
    }
    fencedMatch = fencedWritebackRegex.exec(normalized)
  }

  const genericJsonRegex = /```json\s*([\s\S]*?)```/gi
  let genericMatch: RegExpExecArray | null = genericJsonRegex.exec(normalized)
  while (genericMatch) {
    const parsed = parseRecord(genericMatch[1] || "")
    if (parsed) {
      return parsed
    }
    genericMatch = genericJsonRegex.exec(normalized)
  }

  const fallback = parseLayersAIResponse(content)
  if (!fallback.data) {
    return null
  }

  return {
    contractVersion: LAYERS_WORKFLOW_WRITEBACK_CONTRACT_VERSION,
    description: fallback.data.description,
    warnings: fallback.warnings,
    nodes: fallback.data.nodes,
    edges: fallback.data.edges,
  }
}

function resolveMessageFingerprint(message: AIChatWritebackMessage): string {
  const messageId = cleanOptionalString(message._id || message.id)
  const messageCreatedAt =
    typeof message.createdAt === "number"
      ? message.createdAt
      : typeof message.timestamp === "number"
        ? message.timestamp
        : 0
  const contentLength = typeof message.content === "string" ? message.content.length : 0
  return `${messageId || "none"}:${messageCreatedAt}:${contentLength}`
}

const cmsRewriteRegistryHandler: AIChatWritebackRegistryHandler = {
  id: "cms_copy_rewrite_suggestion",
  panel: "cms-rewrite",
  emit: (args) => {
    const kickoffPayload = parseCmsRewriteKickoffPayload(args.openContext)
    const applicationId = cleanOptionalString(kickoffPayload?.application?.id)
    const applicationName =
      cleanOptionalString(kickoffPayload?.application?.name) || "Unknown app"
    const page = cleanOptionalString(kickoffPayload?.field?.page)
    const section = cleanOptionalString(kickoffPayload?.field?.section)
    const key = cleanOptionalString(kickoffPayload?.field?.key)
    const label = cleanOptionalString(kickoffPayload?.field?.label) || key
    const locale = cleanOptionalString(kickoffPayload?.field?.locale)

    if (!applicationId || !page || !section || !key) {
      return null
    }

    for (let index = args.messages.length - 1; index >= 0; index -= 1) {
      const message = args.messages[index]
      if (message?.role !== "assistant" || typeof message.content !== "string") {
        continue
      }

      const messageFingerprint = resolveMessageFingerprint(message)
      if (messageFingerprint === args.lastEmittedMessageFingerprint) {
        return null
      }

      const suggestion = resolveCmsRewriteAssistantSuggestion(message.content)
      if (!suggestion) {
        return null
      }

      const detail: CmsCopyRewriteSuggestionEventDetail = {
        contractVersion: CMS_COPY_REWRITE_SUGGESTION_CONTRACT_VERSION,
        applicationId,
        applicationName,
        page,
        section,
        key,
        label,
        locale,
        suggestion,
        assistantMessageId: cleanOptionalString(message._id || message.id) || messageFingerprint,
        emittedAt: Date.now(),
      }
      dispatchAIWritebackEvent(CMS_COPY_REWRITE_SUGGESTION_EVENT, detail)
      return messageFingerprint
    }

    return null
  },
}

const bookingSetupRegistryHandler: AIChatWritebackRegistryHandler = {
  id: "booking_setup_wizard_writeback",
  panel: "booking-setup",
  emit: (args) => {
    const kickoffPayload = parseBookingSetupKickoffPayload(args.openContext)

    for (let index = args.messages.length - 1; index >= 0; index -= 1) {
      const message = args.messages[index]
      if (message?.role !== "assistant" || typeof message.content !== "string") {
        continue
      }

      const messageFingerprint = resolveMessageFingerprint(message)
      if (messageFingerprint === args.lastEmittedMessageFingerprint) {
        return null
      }

      const parsedWriteback = parseBookingSetupWriteback(message.content)
      if (!parsedWriteback) {
        continue
      }

      const detail: BookingSetupWizardWritebackEventDetail = {
        ...parsedWriteback,
        contractVersion: BOOKING_SETUP_WRITEBACK_CONTRACT_VERSION,
        appSlug:
          cleanOptionalString(parsedWriteback.appSlug)
          || cleanOptionalString(kickoffPayload?.appSlug)
          || undefined,
        surfaceType:
          cleanOptionalString(parsedWriteback.surfaceType)
          || cleanOptionalString(kickoffPayload?.surfaceType)
          || undefined,
        surfaceKey:
          cleanOptionalString(parsedWriteback.surfaceKey)
          || cleanOptionalString(kickoffPayload?.surfaceKey)
          || undefined,
        sourceSessionId:
          cleanOptionalString(args.sourceSessionId)
          || cleanOptionalString(parsedWriteback.sourceSessionId)
          || undefined,
        sourceOrganizationId:
          cleanOptionalString(args.sourceOrganizationId)
          || cleanOptionalString(parsedWriteback.sourceOrganizationId)
          || undefined,
        assistantMessageId:
          cleanOptionalString(message._id || message.id) || messageFingerprint,
        emittedAt: Date.now(),
      }

      dispatchAIWritebackEvent(BOOKING_SETUP_WRITEBACK_EVENT, detail)
      return messageFingerprint
    }

    return null
  },
}

const layersWorkflowRegistryHandler: AIChatWritebackRegistryHandler = {
  id: "layers_workflow_writeback",
  panel: "layers-workflow",
  emit: (args) => {
    const kickoffPayload = parseLayersWorkflowKickoffPayload(args.openContext)

    for (let index = args.messages.length - 1; index >= 0; index -= 1) {
      const message = args.messages[index]
      if (message?.role !== "assistant" || typeof message.content !== "string") {
        continue
      }

      const messageFingerprint = resolveMessageFingerprint(message)
      if (messageFingerprint === args.lastEmittedMessageFingerprint) {
        return null
      }

      const parsedWriteback = parseLayersWorkflowWriteback(message.content)
      if (!parsedWriteback) {
        continue
      }

      const detail: LayersWorkflowWritebackEventDetail = {
        ...parsedWriteback,
        contractVersion: LAYERS_WORKFLOW_WRITEBACK_CONTRACT_VERSION,
        workflowId:
          cleanOptionalString(parsedWriteback.workflowId)
          || cleanOptionalString(kickoffPayload?.workflowId)
          || undefined,
        sourceSessionId: cleanOptionalString(args.sourceSessionId) || undefined,
        sourceOrganizationId:
          cleanOptionalString(args.sourceOrganizationId) || undefined,
        assistantMessageId:
          cleanOptionalString(message._id || message.id) || messageFingerprint,
        emittedAt: Date.now(),
      }

      dispatchAIWritebackEvent(LAYERS_WORKFLOW_WRITEBACK_EVENT, detail)
      return messageFingerprint
    }

    return null
  },
}

export const AI_CHAT_UI_WRITEBACK_REGISTRY: readonly AIChatWritebackRegistryHandler[] = [
  cmsRewriteRegistryHandler,
  bookingSetupRegistryHandler,
  layersWorkflowRegistryHandler,
]

export function runAIChatUIWritebackRegistry(args: {
  initialPanel?: string
  openContext?: string
  sourceSessionId?: string
  sourceOrganizationId?: string
  messages: AIChatWritebackMessage[]
  lastEmittedMessageFingerprint?: string | null
}): string | null {
  const normalizedPanel = cleanOptionalString(args.initialPanel).toLowerCase()
  if (!normalizedPanel) {
    return null
  }

  const handlers = AI_CHAT_UI_WRITEBACK_REGISTRY.filter(
    (entry) => entry.panel === normalizedPanel
  )
  if (handlers.length === 0) {
    return null
  }

  for (const handler of handlers) {
    const emittedFingerprint = handler.emit({
      openContext: args.openContext,
      sourceSessionId: args.sourceSessionId,
      sourceOrganizationId: args.sourceOrganizationId,
      messages: args.messages,
      lastEmittedMessageFingerprint: args.lastEmittedMessageFingerprint,
    })
    if (emittedFingerprint) {
      return emittedFingerprint
    }
  }

  return null
}
