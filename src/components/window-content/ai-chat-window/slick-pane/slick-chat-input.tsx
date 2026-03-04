"use client"

import { useAction, useMutation, useQuery } from "convex/react"
import { useState, useRef, useEffect, useMemo } from "react"
import { useAIChatContext } from "@/contexts/ai-chat-context"
import {
  type AIChatCameraRuntimeMetadata,
  type AIChatComposerMode,
  type AIChatMessageReference,
  type AIChatReasoningEffort,
  type AIChatSendAttachment,
  type AIChatVoiceRuntimeMetadata,
  type AIChatVoiceRuntimeSessionResolution,
} from "@/hooks/use-ai-chat"
import { useAIConfig } from "@/hooks/use-ai-config"
import { useAuth } from "@/hooks/use-auth"
import { useNotification } from "@/hooks/use-notification"
import { useAIChatVoiceInputLanguage } from "@/hooks/use-ai-chat-voice-input-language"
import {
  useVoiceRuntime,
  type VoiceRuntimeProviderId,
} from "@/hooks/use-voice-runtime"
import {
  AlertCircle,
  ArrowUp,
  Check,
  ChevronDown,
  ImagePlus,
  Lightbulb,
  Link2,
  Loader2,
  MessageSquare,
  Mic,
  Plus,
  StopCircle,
  X,
} from "lucide-react"
import {
  consumeVoiceAgentCoCreationHandoff,
  VOICE_AGENT_HANDOFF_EVENT,
} from "@/lib/voice-assistant/agent-co-creation-handoff"
import {
  resolveVoiceCaptureFallbackMimeType,
  resolveVoiceCapturePreferredMimeTypes,
} from "@/lib/voice-assistant/runtime-policy"
import { buildFrontlineFeatureIntakeKickoff } from "@/lib/ai/frontline-feature-intake"
import {
  getCreditRecoveryAction,
  openCreditRecoveryAction,
} from "@/lib/credits/credit-recovery"
import {
  CONVERSATION_CONTRACT_VERSION,
  type ConversationEventType,
  type ConversationReasonCode,
  type ConversationSessionState,
  inferConversationReasonCode,
} from "@/lib/ai/conversation-session-contract"
import {
  buildConversationCapabilitySnapshot,
  mapConversationCapabilityReasonCode,
  type ConversationCapabilitySnapshot,
} from "@/lib/av/session/mediaSessionContract"
import type {
  CollaborationSurfaceSelection,
  OperatorCollaborationContextPayload,
} from "./operator-collaboration-types"
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../../convex/_generated/api") as { api: any }

function buildRuntimeSessionId(prefix: "voice" | "camera"): string {
  return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`
}

function formatModelDisplayName(modelId: string | undefined): string {
  if (!modelId) {
    return "Current model"
  }

  const parts = modelId.split("/")
  const rawName = parts[1] || modelId
  return rawName.replace(/[-_]/g, " ")
}

function normalizeModelId(modelId: string | undefined): string | null {
  if (!modelId) {
    return null
  }

  const normalized = modelId.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeProviderId(provider: string | undefined): string {
  if (!provider) {
    return "other"
  }

  const normalized = provider.trim().toLowerCase()
  return PROVIDER_ALIASES[normalized] || normalized
}

function inferProviderIdFromModelId(modelId: string): string {
  const [providerToken] = modelId.split("/")
  return normalizeProviderId(providerToken)
}

function estimateAgentMessageCredits(modelId: string): number {
  if (COMPLEX_MESSAGE_COST_MODEL_MARKERS.some((marker) => modelId.includes(marker))) {
    return 3
  }

  if (SIMPLE_MESSAGE_COST_MODEL_MARKERS.some((marker) => modelId.includes(marker))) {
    return 1
  }

  return 2
}

interface UrlFetchResult {
  success: boolean
  error?: string | null
  content?: string | null
}

interface PlatformModelRecord {
  modelId?: string
  name?: string
  provider?: string
}

interface OfferedChatModel {
  id: string
  name: string
  providerId: string
  estimatedCredits: number
}

interface ComposerSelectOption {
  value: string
  label: string
  description: string
}

interface DropUpSelectOption {
  value: string
  label: string
  description?: string
}

const MODE_OPTIONS: ComposerSelectOption[] = [
  {
    value: "auto",
    label: "Auto",
    description: "Standard execution behavior",
  },
  {
    value: "plan",
    label: "Plan",
    description: "Plan-first responses before execution",
  },
  {
    value: "plan_soft",
    label: "Plan + Hints",
    description: "Plan-first with tool feasibility guidance",
  },
]

const REASONING_OPTIONS: ComposerSelectOption[] = [
  { value: "low", label: "Low", description: "Fastest reasoning depth" },
  { value: "medium", label: "Medium", description: "Balanced reasoning depth" },
  { value: "high", label: "High", description: "Deeper reasoning depth" },
  { value: "extra_high", label: "Extra High", description: "Maximum reasoning depth" },
]

const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi
const MAX_REFERENCE_CONTENT_CHARS = 6000
const MAX_IMAGE_ATTACHMENT_BYTES = 20 * 1024 * 1024
const MAX_IMAGE_ATTACHMENTS = 8
const MODEL_AUTO_VALUE = "__auto_model__"
const COMPLEX_MESSAGE_COST_MODEL_MARKERS = [
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-3-5-sonnet",
  "openai/gpt-4o",
  "google/gemini-pro-1.5",
]
const SIMPLE_MESSAGE_COST_MODEL_MARKERS = [
  "openai/gpt-4o-mini",
  "meta-llama/llama-3.1-70b-instruct",
  "mistralai/mistral-large-latest",
]
const PROVIDER_ALIASES: Record<string, string> = {
  google: "gemini",
  "google-ai-studio": "gemini",
  xai: "grok",
  "openai-compatible": "openai_compatible",
}

interface ComposerImageAttachment {
  clientId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  previewUrl: string
  captureSource?: "upload" | "vision_live"
  liveSessionId?: string
  capturedAt?: number
  file?: File
  attachmentId?: string
  storageId?: string
  width?: number
  height?: number
}

type VoiceCaptureState = "idle" | "listening" | "transcribing"
type ConversationModeSelection = "voice" | "voice_with_eyes"
type ConversationEyesSourceSelection = "webcam" | "meta_glasses"

interface CameraLiveSessionState {
  liveSessionId: string
  provider: string
  startedAt: number
  stoppedAt?: number
  stopReason?: string
  frameCaptureCount: number
  lastFrameCapturedAt?: number
  frameCadenceMs?: number
  frameCadenceFps?: number
  sessionState: "capturing" | "stopped" | "error"
  fallbackReason?: string
}

interface DmSummarySyncResult {
  status: string
  message: string
  sessionId?: string
  turnId?: string
  syncAttemptId?: string
  tokenSource?: "request" | "session_checkpoint" | "missing"
}

interface DmSummarySyncAuditEntry extends DmSummarySyncResult {
  createdAt: number
  dmThreadId: string
  specialistLabel: string
}

function buildDeterministicDmSyncAttemptId(args: {
  threadId: string
  dmThreadId: string
  syncCheckpointToken: string
  summary: string
}): string {
  const normalizedSummary = args.summary.replace(/\s+/g, " ").trim().toLowerCase()
  let hash = 0
  for (let index = 0; index < normalizedSummary.length; index += 1) {
    hash = (hash * 33 + normalizedSummary.charCodeAt(index)) >>> 0
  }
  const hashSegment = hash.toString(36).padStart(6, "0")
  const tokenSegment = args.syncCheckpointToken.trim().slice(0, 24) || "missing_token"
  return `dm_sync:${args.threadId}:${args.dmThreadId}:${tokenSegment}:${hashSegment}`
}

function formatSyncTimestamp(timestamp: number): string {
  if (!Number.isFinite(timestamp)) {
    return "now"
  }
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

interface DropUpSelectProps {
  value: string
  buttonLabel: string
  ariaLabel: string
  options: DropUpSelectOption[]
  disabled?: boolean
  onChange: (value: string) => void
  align?: "left" | "right"
}

function DropUpSelect({
  value,
  buttonLabel,
  ariaLabel,
  options,
  disabled,
  onChange,
  align = "left",
}: DropUpSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isButtonHovered, setIsButtonHovered] = useState(false)
  const [hoveredOptionValue, setHoveredOptionValue] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedOption = options.find((option) => option.value === value) || options[0]

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => {
          if (!disabled) {
            setIsOpen((current) => !current)
          }
        }}
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)}
        disabled={disabled}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          borderColor: isOpen || isButtonHovered
            ? "var(--shell-neutral-active-border)"
            : "var(--shell-border-soft)",
          background: isOpen || isButtonHovered
            ? "var(--shell-neutral-hover-surface)"
            : "var(--shell-surface)",
          color: "var(--shell-text)",
        }}
      >
        <span className="truncate max-w-[9rem]">{buttonLabel || selectedOption?.label || "Select"}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          style={{ color: "var(--shell-text-dim)" }}
        />
      </button>

      {isOpen ? (
        <div
          className={`absolute ${align === "right" ? "right-0" : "left-0"} bottom-full z-50 mb-2 min-w-48 overflow-hidden rounded-2xl border`}
          style={{
            borderColor: "var(--shell-input-border-strong)",
            background: "var(--shell-input-surface)",
          }}
        >
          <div
            className="max-h-[22rem] overflow-y-auto overscroll-contain py-1"
            style={{ maxHeight: "min(22rem, calc(100vh - 8rem))" }}
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs" style={{ color: "var(--shell-input-text)" }}>
                No options available
              </div>
            ) : options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  onMouseEnter={() => setHoveredOptionValue(option.value)}
                  onMouseLeave={() => setHoveredOptionValue(null)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors duration-120"
                  style={{
                    background: isSelected
                      ? "var(--shell-selection-surface)"
                      : hoveredOptionValue === option.value
                        ? "var(--shell-neutral-hover-surface)"
                        : "transparent",
                    color: isSelected
                      ? "var(--shell-selection-text)"
                      : "var(--shell-input-text)",
                  }}
                >
                  <div className="min-w-0">
                    <div
                      className="truncate text-xs font-semibold"
                      style={isSelected ? { color: "var(--shell-selection-text)" } : undefined}
                    >
                      {option.label}
                    </div>
                    {option.description ? (
                      <div
                        className="truncate text-xs"
                        style={{
                          color: isSelected
                            ? "var(--shell-selection-text)"
                            : "var(--shell-text-dim)",
                        }}
                      >
                        {option.description}
                      </div>
                    ) : null}
                  </div>
                  {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

interface ComposerActionMenuProps {
  disabled?: boolean
  referenceCount: number
  onAddLink: () => void
  onAttachImage: () => void
  onFrontlineIntake: () => void
  modeLabel: string
  reasoningLabel: string
  voiceLanguageLabel?: string
  canAdjustVoiceLanguage?: boolean
  onCycleMode: () => void
  onCycleReasoning: () => void
  onCycleVoiceLanguage?: () => void
}

function ComposerActionMenu({
  disabled,
  referenceCount,
  onAddLink,
  onAttachImage,
  onFrontlineIntake,
  modeLabel,
  reasoningLabel,
  voiceLanguageLabel,
  canAdjustVoiceLanguage,
  onCycleMode,
  onCycleReasoning,
  onCycleVoiceLanguage,
}: ComposerActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isButtonHovered, setIsButtonHovered] = useState(false)
  const [hoveredAction, setHoveredAction] = useState<
    "attach" | "link" | "frontline" | "mode" | "reasoning" | "language" | null
  >(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        disabled={disabled}
        aria-label="Composer actions"
        onClick={() => {
          if (!disabled) {
            setIsOpen((current) => !current)
          }
        }}
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          borderColor: isOpen || isButtonHovered
            ? "var(--shell-neutral-active-border)"
            : "var(--shell-border-soft)",
          background: isOpen || isButtonHovered
            ? "var(--shell-neutral-hover-surface)"
            : "var(--shell-surface)",
          color: "var(--shell-text-dim)",
        }}
      >
        <Plus size={18} />
        {referenceCount > 0 ? (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xs font-semibold"
            style={{
              background: "var(--shell-button-primary-gradient)",
              color: "var(--shell-on-accent)",
            }}
          >
            {referenceCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className="absolute bottom-full left-0 z-50 mb-2 min-w-64 overflow-hidden rounded-2xl border"
          style={{
            borderColor: "var(--shell-input-border-strong)",
            background: "var(--shell-input-surface)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              onAttachImage()
              setIsOpen(false)
            }}
            onMouseEnter={() => setHoveredAction("attach")}
            onMouseLeave={() => setHoveredAction(null)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors duration-120"
            style={{
              color: "var(--shell-input-text)",
              background: hoveredAction === "attach" ? "var(--shell-neutral-hover-surface)" : "transparent",
            }}
          >
            <ImagePlus size={14} />
            Attach Image
          </button>
          <button
            type="button"
            onClick={() => {
              onAddLink()
              setIsOpen(false)
            }}
            onMouseEnter={() => setHoveredAction("link")}
            onMouseLeave={() => setHoveredAction(null)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors duration-120"
            style={{
              color: "var(--shell-input-text)",
              background: hoveredAction === "link" ? "var(--shell-neutral-hover-surface)" : "transparent",
            }}
          >
            <Link2 size={14} />
            Add Link
          </button>
          <div className="mx-2 my-1 h-px" style={{ background: "var(--shell-border-soft)" }} />
          <button
            type="button"
            onClick={() => {
              onFrontlineIntake()
              setIsOpen(false)
            }}
            onMouseEnter={() => setHoveredAction("frontline")}
            onMouseLeave={() => setHoveredAction(null)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors duration-120"
            style={{
              color: "var(--shell-input-text)",
              background: hoveredAction === "frontline" ? "var(--shell-neutral-hover-surface)" : "transparent",
            }}
          >
            <Lightbulb size={14} />
            Frontline Intake
          </button>
          <div className="mx-2 my-1 h-px" style={{ background: "var(--shell-border-soft)" }} />
          <button
            type="button"
            onClick={onCycleMode}
            onMouseEnter={() => setHoveredAction("mode")}
            onMouseLeave={() => setHoveredAction(null)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium transition-colors duration-120"
            style={{
              color: "var(--shell-input-text)",
              background: hoveredAction === "mode" ? "var(--shell-neutral-hover-surface)" : "transparent",
            }}
          >
            <span>Mode</span>
            <span style={{ color: "var(--shell-text-dim)" }}>{modeLabel}</span>
          </button>
          <button
            type="button"
            onClick={onCycleReasoning}
            onMouseEnter={() => setHoveredAction("reasoning")}
            onMouseLeave={() => setHoveredAction(null)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium transition-colors duration-120"
            style={{
              color: "var(--shell-input-text)",
              background: hoveredAction === "reasoning" ? "var(--shell-neutral-hover-surface)" : "transparent",
            }}
          >
            <span>Reasoning</span>
            <span style={{ color: "var(--shell-text-dim)" }}>{reasoningLabel}</span>
          </button>
          {canAdjustVoiceLanguage ? (
            <button
              type="button"
              onClick={onCycleVoiceLanguage}
              onMouseEnter={() => setHoveredAction("language")}
              onMouseLeave={() => setHoveredAction(null)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium transition-colors duration-120"
              style={{
                color: "var(--shell-input-text)",
                background: hoveredAction === "language" ? "var(--shell-neutral-hover-surface)" : "transparent",
              }}
            >
              <span>Voice Language</span>
              <span style={{ color: "var(--shell-text-dim)" }}>{voiceLanguageLabel || "EN"}</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function getLanguageAbbreviation(localeValue: string | undefined): string {
  if (!localeValue) {
    return "EN"
  }

  const normalized = localeValue.trim()
  if (!normalized) {
    return "EN"
  }

  return (normalized.split(/[-_]/)[0] || "en").slice(0, 2).toUpperCase()
}

function normalizeUrlCandidate(candidate: string): string | null {
  const trimmed = candidate.trim().replace(/[),.;!?]+$/g, "")
  if (!trimmed) {
    return null
  }

  try {
    return new URL(trimmed).toString()
  } catch {
    return null
  }
}

function formatReferenceContent(content: string): string {
  if (content.length <= MAX_REFERENCE_CONTENT_CHARS) {
    return content
  }
  return `${content.slice(0, MAX_REFERENCE_CONTENT_CHARS)}\n\n[Reference content truncated in composer.]`
}

function formatAttachmentSize(sizeBytes: number): string {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

function buildAttachmentClientId(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function revokeAttachmentPreview(previewUrl: string): void {
  if (previewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl)
  }
}

function buildDeterministicOutboundMessage(args: {
  message: string
  mode: AIChatComposerMode
  reasoningEffort: AIChatReasoningEffort
  references: AIChatMessageReference[]
  imageAttachments: string[]
}): string {
  const controlLines: string[] = []
  if (args.mode === "plan") {
    controlLines.push("chat_mode=plan")
    controlLines.push("plan_contract=respond_with_a_step_by_step_plan_before_execution")
    controlLines.push("execution_gate=wait_for_explicit_user_approval_before_irreversible_actions")
  } else if (args.mode === "plan_soft") {
    controlLines.push("chat_mode=plan_soft")
    controlLines.push("plan_contract=respond_with_a_step_by_step_plan_with_tool_feasibility_hints")
    controlLines.push("execution_gate=do_not_execute_tools_or_irreversible_actions_until_user_approval")
  }
  if (args.reasoningEffort !== "medium") {
    controlLines.push(`reasoning_effort=${args.reasoningEffort}`)
  }

  const sections: string[] = []
  if (controlLines.length > 0) {
    sections.push(`[COMPOSER CONTROLS]\n${controlLines.join("\n")}\n[/COMPOSER CONTROLS]`)
  }

  if (args.references.length > 0) {
    const referencesBlock = args.references
      .map((reference, index) => {
        const lines = [
          `[${index + 1}] URL: ${reference.url}`,
          `STATUS: ${reference.status}`,
        ]

        if (reference.error) {
          lines.push(`ERROR: ${reference.error}`)
        }

        if (reference.content && reference.content.trim().length > 0) {
          lines.push("CONTENT:")
          lines.push(formatReferenceContent(reference.content))
        }

        return lines.join("\n")
      })
      .join("\n\n")

    sections.push(`--- URL REFERENCES ---\n${referencesBlock}\n--- END URL REFERENCES ---`)
  }

  if (args.imageAttachments.length > 0) {
    const imagesBlock = args.imageAttachments
      .map((fileName, index) => `[${index + 1}] ${fileName}`)
      .join("\n")
    sections.push(`--- IMAGE ATTACHMENTS ---\n${imagesBlock}\n--- END IMAGE ATTACHMENTS ---`)
  }

  if (sections.length === 0) {
    return args.message
  }

  sections.push(`USER MESSAGE:\n${args.message}`)
  return sections.join("\n\n")
}

interface SlickChatInputProps {
  visualMode: "slick" | "single"
  collaborationContext: OperatorCollaborationContextPayload | null
  selectedSurface: CollaborationSurfaceSelection
}

export function SlickChatInput({
  visualMode,
  collaborationContext,
  selectedSurface,
}: SlickChatInputProps) {
  const [message, setMessage] = useState("")
  const [voiceCaptureState, setVoiceCaptureState] = useState<VoiceCaptureState>("idle")
  const [voiceCaptureError, setVoiceCaptureError] = useState<string | null>(null)
  const [voiceCaptureSupported, setVoiceCaptureSupported] = useState(false)
  const [isConversationPickerOpen, setIsConversationPickerOpen] = useState(false)
  const [conversationModeSelection, setConversationModeSelection] =
    useState<ConversationModeSelection>("voice")
  const [conversationEyesSourceSelection, setConversationEyesSourceSelection] =
    useState<ConversationEyesSourceSelection>("webcam")
  const [isStartingConversation, setIsStartingConversation] = useState(false)
  const [isConversationEnding, setIsConversationEnding] = useState(false)
  const [isConversationMicMuted, setIsConversationMicMuted] = useState(false)
  const [conversationState, setConversationState] = useState<ConversationSessionState>("idle")
  const [conversationReasonCode, setConversationReasonCode] = useState<ConversationReasonCode | undefined>(undefined)
  const [conversationCapabilitySnapshot, setConversationCapabilitySnapshot] =
    useState<ConversationCapabilitySnapshot>(() =>
      buildConversationCapabilitySnapshot({
        sessionIntent: "voice",
        requestedEyesSource: "none",
        micAvailable: false,
        webcamAvailable: false,
        webcamReasonCode: "device_unavailable",
        metaGlassesAvailable: false,
        metaGlassesReasonCode: "dat_sdk_unavailable",
      })
    )
  const [pendingVoiceRuntime, setPendingVoiceRuntime] = useState<AIChatVoiceRuntimeMetadata | null>(null)
  const [resolvedVoiceRuntimeSession, setResolvedVoiceRuntimeSession] =
    useState<AIChatVoiceRuntimeSessionResolution | null>(null)
  const [activeVoiceSessionId, setActiveVoiceSessionId] = useState<string | null>(null)
  const [cameraLiveSession, setCameraLiveSession] = useState<CameraLiveSessionState | null>(null)
  const [cameraVisionError, setCameraVisionError] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [referenceUrls, setReferenceUrls] = useState<string[]>([])
  const [imageAttachments, setImageAttachments] = useState<ComposerImageAttachment[]>([])
  const [urlContents, setUrlContents] = useState<Record<string, string>>({})
  const [urlStatuses, setUrlStatuses] = useState<Record<string, AIChatMessageReference["status"]>>({})
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({})
  const [dmSyncSummaryDraft, setDmSyncSummaryDraft] = useState("")
  const [isSyncingDmSummary, setIsSyncingDmSummary] = useState(false)
  const [dmSyncAuditTrail, setDmSyncAuditTrail] = useState<DmSummarySyncAuditEntry[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const imageAttachmentsRef = useRef<ComposerImageAttachment[]>([])
  const voiceRecorderRef = useRef<MediaRecorder | null>(null)
  const voiceStreamRef = useRef<MediaStream | null>(null)
  const voiceCaptureChunksRef = useRef<Blob[]>([])
  const conversationPickerRef = useRef<HTMLDivElement | null>(null)
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const lastConversationEventRef = useRef<string>("")
  const activeConversationEyesSourceRef = useRef<ConversationEyesSourceSelection | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const useQueryUntyped = useQuery as (query: unknown, args?: unknown) => unknown
  const useActionUntyped = useAction as (action: unknown) => unknown
  const useMutationUntyped = useMutation as (mutation: unknown) => unknown
  const platformModelsByProvider = useQueryUntyped(
    api.ai.platformModels.getEnabledModelsByProvider
  ) as Record<string, PlatformModelRecord[]> | undefined
  const fetchUrlContent = useActionUntyped(api.ai.webReader.fetchUrlContent) as (args: {
    url: string
  }) => Promise<UrlFetchResult>
  const generateAttachmentUploadUrl = useMutationUntyped(
    api.ai.chatAttachments.generateUploadUrl
  ) as (args: {
    organizationId: string
    userId: string
    fileName: string
    mimeType: string
    sizeBytes: number
  }) => Promise<string>
  const saveUploadedAttachment = useMutationUntyped(
    api.ai.chatAttachments.saveUploadedAttachment
  ) as (args: {
    organizationId: string
    userId: string
    storageId: string
    fileName: string
    mimeType: string
    sizeBytes: number
    width?: number
    height?: number
    conversationId?: string
  }) => Promise<{
    attachmentId: string
    storageId: string
    fileName: string
    mimeType: string
    sizeBytes: number
    width?: number
    height?: number
    url?: string
  }>
  const syncOperatorDmSummaryToGroup = useActionUntyped(
    api.ai.agentSessions.syncOperatorDmSummaryToGroup
  ) as (args: {
    sessionId: string
    organizationId: string
    threadId: string
    dmThreadId: string
    summary: string
    syncCheckpointToken?: string
    syncAttemptId?: string
  }) => Promise<DmSummarySyncResult>

  const {
    chat,
    currentConversationId,
    setCurrentConversationId,
    organizationId,
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
    abortController,
    stopCurrentRequest,
  } = useAIChatContext()
  const { isAIReady, settings, connectionCatalog, canUseByok } = useAIConfig()
  const { user, sessionId } = useAuth()
  const notification = useNotification()
  const {
    voiceInputLanguage,
    selectedLanguageValue,
    languageOptions,
    setSelectedLanguageValue,
    isUsingAppLanguage,
  } = useAIChatVoiceInputLanguage()
  const voiceRuntime = useVoiceRuntime({
    authSessionId: sessionId ?? undefined,
    interviewSessionId: resolvedVoiceRuntimeSession?.agentSessionId,
  })

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [message])

  useEffect(() => {
    setVoiceCaptureSupported(
      typeof window !== "undefined"
      && typeof window.MediaRecorder !== "undefined"
      && Boolean(navigator.mediaDevices?.getUserMedia)
    )
  }, [])

  useEffect(() => {
    const webcamAvailable =
      typeof window !== "undefined"
      && Boolean(navigator.mediaDevices?.getUserMedia)
    setConversationCapabilitySnapshot(
      buildConversationCapabilitySnapshot({
        sessionIntent: conversationModeSelection,
        requestedEyesSource:
          conversationModeSelection === "voice_with_eyes"
            ? conversationEyesSourceSelection
            : "none",
        micAvailable: voiceCaptureSupported,
        webcamAvailable,
        webcamReasonCode: webcamAvailable ? null : "device_unavailable",
        metaGlassesAvailable: false,
        metaGlassesReasonCode: "dat_sdk_unavailable",
      })
    )
  }, [conversationEyesSourceSelection, conversationModeSelection, voiceCaptureSupported])

  useEffect(() => {
    if (!isConversationPickerOpen) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        conversationPickerRef.current
        && !conversationPickerRef.current.contains(event.target as Node)
      ) {
        setIsConversationPickerOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isConversationPickerOpen])

  useEffect(() => {
    return () => {
      if (activeVoiceSessionId && resolvedVoiceRuntimeSession && sessionId) {
        void voiceRuntime.closeSession({
          voiceSessionId: activeVoiceSessionId,
          reason: "chat_unmount_cleanup",
          runtimeContext: {
            authSessionId: sessionId,
            interviewSessionId: resolvedVoiceRuntimeSession.agentSessionId,
          },
        }).catch(() => {})
      }
      if (voiceRecorderRef.current && voiceRecorderRef.current.state !== "inactive") {
        voiceRecorderRef.current.stop()
      }
      voiceRecorderRef.current = null
      voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
      voiceStreamRef.current = null
      voiceCaptureChunksRef.current = []
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }
  }, [activeVoiceSessionId, resolvedVoiceRuntimeSession, sessionId, voiceRuntime])

  useEffect(() => {
    imageAttachmentsRef.current = imageAttachments
  }, [imageAttachments])

  useEffect(() => {
    return () => {
      imageAttachmentsRef.current.forEach((attachment) => {
        revokeAttachmentPreview(attachment.previewUrl)
      })
    }
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSending) {
        e.preventDefault()
        stopCurrentRequest()
        notification.info("Request Stopped", "AI processing has been cancelled")
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isSending, notification, stopCurrentRequest])

  useEffect(() => {
    const applyHandoffDraft = () => {
      const staged = consumeVoiceAgentCoCreationHandoff()
      if (!staged) {
        return
      }

      setMessage((current) => {
        if (!current.trim()) {
          return staged.draftMessage
        }
        return `${current.trim()}\n\n---\n${staged.draftMessage}`
      })

      if (!humanInLoopEnabled) {
        setHumanInLoopEnabled(true)
      }

      notification.info(
        "Agent Handoff Draft Ready",
        "Review and edit the staged handoff before sending it to the assistant runtime."
      )
    }

    applyHandoffDraft()
    window.addEventListener(VOICE_AGENT_HANDOFF_EVENT, applyHandoffDraft)
    return () => window.removeEventListener(VOICE_AGENT_HANDOFF_EVENT, applyHandoffDraft)
  }, [humanInLoopEnabled, notification, setHumanInLoopEnabled])

  useEffect(() => {
    setDmSyncSummaryDraft("")
    setDmSyncAuditTrail([])
  }, [currentConversationId])

  useEffect(() => {
    if (activeVoiceSessionId && resolvedVoiceRuntimeSession && sessionId) {
      void voiceRuntime.closeSession({
        voiceSessionId: activeVoiceSessionId,
        reason: "chat_conversation_reset",
        runtimeContext: {
          authSessionId: sessionId,
          interviewSessionId: resolvedVoiceRuntimeSession.agentSessionId,
        },
      }).catch(() => {})
    }
    if (voiceRecorderRef.current && voiceRecorderRef.current.state !== "inactive") {
      voiceRecorderRef.current.stop()
    }
    voiceRecorderRef.current = null
    releaseVoiceMediaStream()
    releaseCameraStream()
    setVoiceCaptureState("idle")
    setVoiceCaptureError(null)
    setPendingVoiceRuntime(null)
    setResolvedVoiceRuntimeSession(null)
    setActiveVoiceSessionId(null)
    setIsConversationPickerOpen(false)
    setCameraLiveSession(null)
    setCameraVisionError(null)
    setIsConversationMicMuted(false)
    setIsConversationEnding(false)
    setConversationState("idle")
    setConversationReasonCode(undefined)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationId])

  useEffect(() => {
    if (selectedSurface.kind !== "dm") {
      setDmSyncSummaryDraft("")
    }
  }, [selectedSurface.kind])

  const releaseVoiceMediaStream = () => {
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
    voiceStreamRef.current = null
  }

  const releaseCameraStream = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null
    }
  }

  const stopVisionStream = (reason: string = "operator_stop") => {
    releaseCameraStream()
    setCameraLiveSession((current) => {
      if (!current) {
        return current
      }
      return {
        ...current,
        sessionState: "stopped",
        stoppedAt: Date.now(),
        stopReason: reason,
      }
    })
  }

  const degradeConversationToVoice = (
    reason: string,
    source: ConversationEyesSourceSelection
  ) => {
    const reasonCode = mapConversationCapabilityReasonCode(reason)
    stopVisionStream("conversation_source_drop")
    setConversationModeSelection("voice")
    setConversationReasonCode(reasonCode)
    activeConversationEyesSourceRef.current = null
    emitConversationEvent("conversation_degraded_to_voice", {
      reasonCode,
      source,
    })
    notification.info(
      "Eyes feed unavailable",
      "Continuing with voice only."
    )
  }

  const emitConversationEvent = (eventType: ConversationEventType, payload?: Record<string, unknown>) => {
    const liveSessionId = pendingVoiceRuntime?.liveSessionId || cameraLiveSession?.liveSessionId
    const envelope = {
      contractVersion: CONVERSATION_CONTRACT_VERSION,
      eventType,
      timestampMs: Date.now(),
      liveSessionId,
      conversationId: currentConversationId ? String(currentConversationId) : undefined,
      state: conversationState,
      reasonCode: conversationReasonCode,
      payload,
    }
    const eventKey = `${envelope.eventType}:${envelope.state}:${envelope.reasonCode || "none"}`
    if (eventKey === lastConversationEventRef.current) {
      return
    }
    lastConversationEventRef.current = eventKey
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("conversation_session_event", { detail: envelope }))
    }
    console.info("[conversation_event]", envelope)
  }

  const startVisionStream = async (): Promise<boolean> => {
    if (cameraStreamRef.current) {
      stopVisionStream("operator_toggle_off")
      return false
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      const fallbackReason = "camera_getusermedia_unavailable"
      setCameraVisionError(fallbackReason)
      setCameraLiveSession((current) =>
        current
          ? {
              ...current,
              sessionState: "error",
              fallbackReason,
            }
          : null
      )
      notification.error(
        "Vision Unavailable",
        "Live camera capture requires getUserMedia support on this device."
      )
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          if (
            activeConversationEyesSourceRef.current === "webcam"
            && conversationModeSelection === "voice_with_eyes"
          ) {
            degradeConversationToVoice("device_unavailable", "webcam")
          }
        }, { once: true })
      })
      cameraStreamRef.current = stream
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream
        await cameraVideoRef.current.play().catch(() => {})
      }

      setCameraVisionError(null)
      setCameraLiveSession({
        liveSessionId: buildRuntimeSessionId("camera"),
        provider: "browser_getusermedia",
        startedAt: Date.now(),
        frameCaptureCount: 0,
        sessionState: "capturing",
      })
      return true
    } catch (error) {
      const fallbackReason =
        error instanceof Error && error.message.trim().length > 0
          ? error.message.trim()
          : "camera_permission_denied"
      setCameraVisionError(fallbackReason)
      setCameraLiveSession((current) =>
        current
          ? {
              ...current,
              sessionState: "error",
              fallbackReason,
            }
          : null
      )
      notification.error(
        "Vision Stream Failed",
        "Camera permission is required for live vision capture."
      )
      return false
    }
  }

  const captureVisionFrame = async () => {
    const video = cameraVideoRef.current
    if (!video || !cameraStreamRef.current || !cameraLiveSession) {
      notification.error("Vision Capture Unavailable", "Start a Vision stream before capturing.")
      return
    }

    const width = Math.max(1, video.videoWidth || 1280)
    const height = Math.max(1, video.videoHeight || 720)
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) {
      notification.error("Vision Capture Failed", "Unable to access camera frame buffer.")
      return
    }

    context.drawImage(video, 0, 0, width, height)
    const frameBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    })
    if (!frameBlob) {
      notification.error("Vision Capture Failed", "Unable to capture a frame from the live stream.")
      return
    }

    const capturedAt = Date.now()
    const fileName = `vision-capture-${capturedAt}.jpg`
    const frameFile = new File([frameBlob], fileName, { type: frameBlob.type || "image/jpeg" })
    const previewUrl = URL.createObjectURL(frameFile)
    if (imageAttachmentsRef.current.length >= MAX_IMAGE_ATTACHMENTS) {
      revokeAttachmentPreview(previewUrl)
      notification.error(
        "Attachment Limit Reached",
        `You can send up to ${MAX_IMAGE_ATTACHMENTS} images per message.`
      )
      return
    }
    const liveAttachment: ComposerImageAttachment = {
      clientId: buildAttachmentClientId(frameFile),
      fileName,
      mimeType: frameFile.type,
      sizeBytes: frameFile.size,
      previewUrl,
      captureSource: "vision_live",
      liveSessionId: cameraLiveSession.liveSessionId,
      capturedAt,
      width,
      height,
      file: frameFile,
    }
    setImageAttachments((current) => [...current, liveAttachment].slice(0, MAX_IMAGE_ATTACHMENTS))

    setCameraLiveSession((current) => {
      if (!current) {
        return current
      }
      const frameCaptureCount = current.frameCaptureCount + 1
      const frameCadenceMs = current.lastFrameCapturedAt
        ? Math.max(1, capturedAt - current.lastFrameCapturedAt)
        : current.frameCadenceMs
      return {
        ...current,
        frameCaptureCount,
        lastFrameCapturedAt: capturedAt,
        frameCadenceMs,
        frameCadenceFps:
          typeof frameCadenceMs === "number" ? Number((1000 / frameCadenceMs).toFixed(2)) : current.frameCadenceFps,
      }
    })
    setCameraVisionError(null)
  }

  const resolveVoiceRuntimeSessionContext = async (): Promise<AIChatVoiceRuntimeSessionResolution> => {
    if (!user?.id || !organizationId) {
      throw new Error("Sign in and select an organization before using voice capture.")
    }

    const runtimeSession = await chat.resolveVoiceRuntimeSession(currentConversationId)
    setResolvedVoiceRuntimeSession(runtimeSession)
    if (
      !currentConversationId
      || String(currentConversationId) !== String(runtimeSession.conversationId)
    ) {
      setCurrentConversationId(runtimeSession.conversationId)
    }
    return runtimeSession
  }

  const closeVoiceRuntimeSession = (args: {
    voiceSessionId: string
    providerId?: VoiceRuntimeProviderId
    runtimeSession: AIChatVoiceRuntimeSessionResolution
    reason: string
  }) => {
    if (!sessionId) {
      setActiveVoiceSessionId((current) => (current === args.voiceSessionId ? null : current))
      return
    }
    void voiceRuntime.closeSession({
      voiceSessionId: args.voiceSessionId,
      activeProviderId: args.providerId,
      reason: args.reason,
      runtimeContext: {
        authSessionId: sessionId,
        interviewSessionId: args.runtimeSession.agentSessionId,
      },
    }).catch(() => {})
    setActiveVoiceSessionId((current) => (current === args.voiceSessionId ? null : current))
  }

  const stopVoiceCapture = () => {
    const recorder = voiceRecorderRef.current
    if (!recorder) {
      releaseVoiceMediaStream()
      if (voiceCaptureState !== "transcribing") {
        setVoiceCaptureState("idle")
      }
      return
    }

    if (recorder.state !== "inactive") {
      recorder.stop()
    }
  }

  const startVoiceCapture = async () => {
    if (voiceCaptureState === "listening" || voiceCaptureState === "transcribing") {
      return
    }
    if (!sessionId) {
      notification.error("Voice Capture Unavailable", "Authentication session missing. Reload and try again.")
      return
    }
    if (
      typeof window === "undefined"
      || typeof window.MediaRecorder === "undefined"
      || !navigator.mediaDevices?.getUserMedia
    ) {
      notification.error(
        "Voice Capture Unavailable",
        "MediaRecorder is required for runtime voice capture on this device."
      )
      return
    }

    setVoiceCaptureError(null)

    let runtimeSession: AIChatVoiceRuntimeSessionResolution
    try {
      runtimeSession = await resolveVoiceRuntimeSessionContext()
    } catch (error) {
      notification.error(
        "Voice Runtime Session Failed",
        error instanceof Error ? error.message : "Unable to resolve chat voice runtime session."
      )
      return
    }

    let openedSession:
      | {
          voiceSessionId: string
          providerId: VoiceRuntimeProviderId
          requestedProviderId: VoiceRuntimeProviderId
          fallbackProviderId: VoiceRuntimeProviderId | null
        }
      | null = null

    try {
      openedSession = await voiceRuntime.openSession({
        requestedProviderId: "elevenlabs",
        voiceSessionId: buildRuntimeSessionId("voice"),
        runtimeContext: {
          authSessionId: sessionId,
          interviewSessionId: runtimeSession.agentSessionId,
        },
      })
      if (!openedSession) {
        throw new Error("voice_runtime_open_session_failed")
      }
      const openedVoiceSession = openedSession
      const liveSessionId = cameraLiveSession?.liveSessionId || buildRuntimeSessionId("voice")
      setActiveVoiceSessionId(openedVoiceSession.voiceSessionId)

      if (openedVoiceSession.fallbackProviderId) {
        notification.info(
          "Voice Runtime Fallback",
          `${openedVoiceSession.requestedProviderId} fell back to ${openedVoiceSession.providerId}.`
        )
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      voiceStreamRef.current = stream
      voiceCaptureChunksRef.current = []

      const preferredMimeTypes = resolveVoiceCapturePreferredMimeTypes("elevenlabs")
      const mimeType = preferredMimeTypes.find((value) => window.MediaRecorder.isTypeSupported(value))
      const recorder = mimeType
        ? new window.MediaRecorder(stream, { mimeType })
        : new window.MediaRecorder(stream)
      voiceRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          voiceCaptureChunksRef.current.push(event.data)
        }
      }
      recorder.onerror = () => {
        setVoiceCaptureError("voice_capture_recorder_error")
        setVoiceCaptureState("idle")
      }
      recorder.onstop = () => {
        releaseVoiceMediaStream()
        voiceRecorderRef.current = null

        const recorderMimeType =
          typeof recorder.mimeType === "string" && recorder.mimeType.trim().length > 0
            ? recorder.mimeType
            : ""
        const audioType =
          recorderMimeType
          || voiceCaptureChunksRef.current[0]?.type
          || resolveVoiceCaptureFallbackMimeType("elevenlabs")
        const captureChunkCount = voiceCaptureChunksRef.current.length
        const captureChunkBytes = voiceCaptureChunksRef.current.reduce(
          (total, chunk) => total + chunk.size,
          0,
        )
        const audioBlob = new Blob(voiceCaptureChunksRef.current, { type: audioType })
        voiceCaptureChunksRef.current = []
        if (!audioBlob.size) {
          setVoiceCaptureState("idle")
          closeVoiceRuntimeSession({
            voiceSessionId: openedVoiceSession.voiceSessionId,
            providerId: openedVoiceSession.providerId,
            runtimeSession,
            reason: "chat_voice_capture_empty_audio",
          })
          return
        }

        void (async () => {
          setVoiceCaptureState("transcribing")
          try {
            const transcribeResult = await voiceRuntime.transcribeAudioBlob({
              voiceSessionId: openedVoiceSession.voiceSessionId,
              blob: audioBlob,
              requestedProviderId: "elevenlabs",
              language: voiceInputLanguage,
              telemetry: {
                recorderMimeType: recorderMimeType || undefined,
                captureChunkCount,
                captureChunkBytes,
              },
              runtimeContext: {
                authSessionId: sessionId,
                interviewSessionId: runtimeSession.agentSessionId,
              },
            })
            const fallbackReason = transcribeResult.success
              ? null
              : transcribeResult.error || "voice_runtime_transcription_failed"
            const runtimeMetadata: AIChatVoiceRuntimeMetadata = {
              voiceSessionId: openedVoiceSession.voiceSessionId,
              requestedProviderId: transcribeResult.requestedProviderId,
              providerId: transcribeResult.providerId,
              fallbackProviderId: transcribeResult.fallbackProviderId ?? null,
              language: voiceInputLanguage,
              transcribeStatus: transcribeResult.success ? "success" : "failed",
              fallbackReason,
              liveSessionId,
              sessionState: transcribeResult.success ? "transcribed" : "fallback",
              runtimeAuthorityPrecedence: "vc83_runtime_policy",
              routeTarget: "vc83_voice_runtime",
              bridgeSource: "useVoiceRuntime",
            }
            setPendingVoiceRuntime(runtimeMetadata)

            if (!transcribeResult.success || !transcribeResult.text?.trim()) {
              const errorMessage = fallbackReason || "Voice transcription returned no text."
              setVoiceCaptureError(errorMessage)
              notification.error("Voice Capture Failed", errorMessage)
              return
            }

            const transcript = transcribeResult.text.trim()
            setMessage((current) =>
              current.trim().length > 0 ? `${current.trim()} ${transcript}` : transcript
            )
            setVoiceCaptureError(null)
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "voice_runtime_transcription_failed"
            setVoiceCaptureError(errorMessage)
            setPendingVoiceRuntime({
              voiceSessionId: openedVoiceSession.voiceSessionId,
              requestedProviderId: "elevenlabs",
              providerId: openedVoiceSession.providerId,
              fallbackProviderId: openedVoiceSession.fallbackProviderId ?? null,
              language: voiceInputLanguage,
              transcribeStatus: "failed",
              fallbackReason: errorMessage,
              liveSessionId,
              sessionState: "fallback",
              runtimeAuthorityPrecedence: "vc83_runtime_policy",
              routeTarget: "vc83_voice_runtime",
              bridgeSource: "useVoiceRuntime",
            })
            notification.error("Voice Capture Failed", errorMessage)
          } finally {
            setVoiceCaptureState("idle")
            closeVoiceRuntimeSession({
              voiceSessionId: openedVoiceSession.voiceSessionId,
              providerId: openedVoiceSession.providerId,
              runtimeSession,
              reason: "chat_voice_capture_complete",
            })
          }
        })()
      }

      recorder.start()
      setVoiceCaptureState("listening")
    } catch (error) {
      releaseVoiceMediaStream()
      setVoiceCaptureState("idle")
      const errorMessage =
        error instanceof Error ? error.message : "Unable to start runtime voice capture."
      setVoiceCaptureError(errorMessage)
      notification.error("Voice Capture Failed", errorMessage)
      if (openedSession) {
        closeVoiceRuntimeSession({
          voiceSessionId: openedSession.voiceSessionId,
          providerId: openedSession.providerId,
          runtimeSession,
          reason: "chat_voice_capture_failed_to_start",
        })
      }
    }
  }

  const startConversationCapture = async () => {
    if (isStartingConversation || voiceCaptureState === "transcribing") {
      return
    }

    setIsStartingConversation(true)
    try {
      emitConversationEvent("conversation_start_requested")
      if (conversationModeSelection === "voice_with_eyes") {
        const sourceCapability =
          conversationEyesSourceSelection === "webcam"
            ? conversationCapabilitySnapshot.capabilities.webcam
            : conversationCapabilitySnapshot.capabilities.metaGlasses
        if (!sourceCapability.available) {
          const reasonCode =
            sourceCapability.reasonCode
            || mapConversationCapabilityReasonCode("device_unavailable")
          setConversationState("error")
          setConversationReasonCode(reasonCode)
          notification.error(
            "Eyes Source Unavailable",
            `Selected eyes source is unavailable (\`${reasonCode}\`).`
          )
          emitConversationEvent("conversation_error", {
            source: conversationEyesSourceSelection,
            reasonCode,
            capabilitySnapshot: conversationCapabilitySnapshot,
          })
          return
        }
        activeConversationEyesSourceRef.current = conversationEyesSourceSelection
        const startedVision = await startVisionStream()
        if (!startedVision) {
          const reasonCode = mapConversationCapabilityReasonCode(cameraVisionError || "device_unavailable")
          setConversationState("error")
          setConversationReasonCode(reasonCode)
          emitConversationEvent("conversation_error", {
            source: conversationEyesSourceSelection,
            reasonCode,
          })
          return
        }
      } else if (cameraLiveSession?.sessionState === "capturing") {
        stopVisionStream("conversation_voice_only_selected")
        activeConversationEyesSourceRef.current = null
      }

      setIsConversationPickerOpen(false)
      if (voiceCaptureState !== "listening") {
        await startVoiceCapture()
      }
    } finally {
      setIsStartingConversation(false)
    }
  }

  const endConversationSession = () => {
    setIsConversationEnding(true)
    if (voiceCaptureState === "listening") {
      stopVoiceCapture()
    }
    if (cameraLiveSession?.sessionState === "capturing") {
      stopVisionStream("conversation_end_control")
    }
    activeConversationEyesSourceRef.current = null
    setPendingVoiceRuntime(null)
    setConversationState("ended")
    setConversationReasonCode(undefined)
    emitConversationEvent("conversation_ended")
    setTimeout(() => {
      setIsConversationEnding(false)
      setConversationState("idle")
    }, 0)
  }

  const toggleConversationMute = async () => {
    if (isConversationMicMuted) {
      setIsConversationMicMuted(false)
      if (voiceCaptureState === "idle") {
        await startVoiceCapture()
      }
      return
    }
    setIsConversationMicMuted(true)
    if (voiceCaptureState === "listening") {
      stopVoiceCapture()
    }
  }

  const isFetchingReferences = useMemo(
    () => referenceUrls.some((url) => urlStatuses[url] === "loading"),
    [referenceUrls, urlStatuses]
  )

  const clearReferences = () => {
    setReferenceUrls([])
    setImageAttachments([])
    setUrlContents({})
    setUrlStatuses({})
    setUrlErrors({})
    setShowUrlInput(false)
    setUrlInput("")
  }

  const removeReference = (url: string) => {
    setReferenceUrls((current) => current.filter((currentUrl) => currentUrl !== url))
    setUrlContents((current) => {
      const next = { ...current }
      delete next[url]
      return next
    })
    setUrlStatuses((current) => {
      const next = { ...current }
      delete next[url]
      return next
    })
    setUrlErrors((current) => {
      const next = { ...current }
      delete next[url]
      return next
    })
  }

  const removeAttachedImage = (attachmentClientId: string) => {
    setImageAttachments((current) => {
      const attachment = current.find((item) => item.clientId === attachmentClientId)
      if (attachment) {
        revokeAttachmentPreview(attachment.previewUrl)
      }
      return current.filter((item) => item.clientId !== attachmentClientId)
    })
  }

  const addUrlToReferences = async (urlCandidate: string) => {
    const normalizedUrl = normalizeUrlCandidate(urlCandidate)
    if (!normalizedUrl) {
      notification.error("Invalid URL", "Please provide a valid URL (for example: https://example.com).")
      return
    }

    let didInsert = false
    setReferenceUrls((current) => {
      if (current.includes(normalizedUrl)) {
        return current
      }
      didInsert = true
      return [...current, normalizedUrl]
    })

    if (!didInsert) {
      return
    }

    setUrlStatuses((current) => ({ ...current, [normalizedUrl]: "loading" }))
    setUrlErrors((current) => {
      const next = { ...current }
      delete next[normalizedUrl]
      return next
    })

    try {
      const result = await fetchUrlContent({ url: normalizedUrl })
      if (result.success && result.content) {
        setUrlContents((current) => ({ ...current, [normalizedUrl]: result.content || "" }))
        setUrlStatuses((current) => ({ ...current, [normalizedUrl]: "ready" }))
        return
      }

      const errorMessage = result.error || "Failed to fetch URL content."
      setUrlStatuses((current) => ({ ...current, [normalizedUrl]: "error" }))
      setUrlErrors((current) => ({ ...current, [normalizedUrl]: errorMessage }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch URL content."
      setUrlStatuses((current) => ({ ...current, [normalizedUrl]: "error" }))
      setUrlErrors((current) => ({ ...current, [normalizedUrl]: errorMessage }))
    }
  }

  const addUrlReferenceFromInput = async () => {
    const candidate = urlInput.trim()
    if (!candidate) {
      return
    }
    await addUrlToReferences(candidate)
    setUrlInput("")
    setShowUrlInput(false)
  }

  const handleAttachImageClick = () => {
    imageInputRef.current?.click()
  }

  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) {
      return
    }

    const existingAttachmentCount = imageAttachments.length
    const availableSlots = Math.max(0, MAX_IMAGE_ATTACHMENTS - existingAttachmentCount)
    const pendingAttachments: ComposerImageAttachment[] = []
    let skippedInvalidType = 0
    let skippedTooLarge = 0

    for (const file of files.slice(0, availableSlots)) {
      if (!file.type.startsWith("image/")) {
        skippedInvalidType += 1
        continue
      }
      if (file.size <= 0 || file.size > MAX_IMAGE_ATTACHMENT_BYTES) {
        skippedTooLarge += 1
        continue
      }

      const clientId = buildAttachmentClientId(file)
      const previewUrl = URL.createObjectURL(file)
      pendingAttachments.push({
        clientId,
        fileName: file.name.trim() || "image",
        mimeType: file.type,
        sizeBytes: file.size,
        previewUrl,
        captureSource: "upload",
        file,
      })
    }

    if (pendingAttachments.length > 0) {
      setImageAttachments((current) => {
        const seen = new Set(current.map((attachment) => attachment.clientId))
        const next = [...current]
        for (const attachment of pendingAttachments) {
          if (seen.has(attachment.clientId)) {
            revokeAttachmentPreview(attachment.previewUrl)
            continue
          }
          next.push(attachment)
          seen.add(attachment.clientId)
        }
        return next.slice(0, MAX_IMAGE_ATTACHMENTS)
      })
      notification.info(
        "Images Attached",
        `${pendingAttachments.length} image${pendingAttachments.length > 1 ? "s" : ""} ready to send.`
      )
    }

    if (files.length > availableSlots) {
      notification.error(
        "Attachment Limit Reached",
        `You can send up to ${MAX_IMAGE_ATTACHMENTS} images per message.`
      )
    }

    if (skippedInvalidType > 0 || skippedTooLarge > 0) {
      const problems: string[] = []
      if (skippedInvalidType > 0) {
        problems.push(`${skippedInvalidType} non-image file${skippedInvalidType > 1 ? "s were" : " was"} skipped`)
      }
      if (skippedTooLarge > 0) {
        problems.push(`${skippedTooLarge} image${skippedTooLarge > 1 ? "s exceed" : " exceeds"} 20MB`)
      }
      notification.error("Some Files Were Skipped", problems.join(". "))
    }

    event.target.value = ""
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text")
    const trimmed = pastedText.trim()
    if (!trimmed) {
      return
    }

    const foundUrls = trimmed.match(URL_PATTERN) || []
    const normalizedUrls = Array.from(
      new Set(
        foundUrls
          .map((url) => normalizeUrlCandidate(url))
          .filter((url): url is string => Boolean(url))
      )
    )

    for (const url of normalizedUrls) {
      void addUrlToReferences(url)
    }

    if (normalizedUrls.length > 0) {
      const nonUrlContent = trimmed.replace(URL_PATTERN, "").replace(/\s+/g, "")
      if (nonUrlContent.length === 0) {
        e.preventDefault()
      }
    }
  }

  const uploadAttachmentIfNeeded = async (
    attachment: ComposerImageAttachment
  ): Promise<ComposerImageAttachment> => {
    if (attachment.attachmentId) {
      return attachment
    }
    if (!attachment.file) {
      throw new Error(`Attachment "${attachment.fileName}" is missing file data.`)
    }
    if (!user?.id || !user.currentOrganization?.id) {
      throw new Error("You must be signed in to upload attachments.")
    }

    const uploadUrl = await generateAttachmentUploadUrl({
      organizationId: user.currentOrganization.id,
      userId: user.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    })

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
      },
      body: attachment.file,
    })

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed for "${attachment.fileName}".`)
    }

    const uploadPayload = (await uploadResponse.json()) as { storageId?: string }
    if (!uploadPayload.storageId) {
      throw new Error(`Upload storage ID missing for "${attachment.fileName}".`)
    }

    const persisted = await saveUploadedAttachment({
      organizationId: user.currentOrganization.id,
      userId: user.id,
      storageId: uploadPayload.storageId,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      width: attachment.width,
      height: attachment.height,
      conversationId: currentConversationId,
    })

    return {
      ...attachment,
      attachmentId: persisted.attachmentId,
      storageId: persisted.storageId,
      width: persisted.width ?? attachment.width,
      height: persisted.height ?? attachment.height,
      previewUrl: attachment.previewUrl,
      file: undefined,
    }
  }

  const ensureImageAttachmentsReady = async (
    pendingAttachments: ComposerImageAttachment[]
  ): Promise<ComposerImageAttachment[]> => {
    const preparedAttachments: ComposerImageAttachment[] = []
    for (const attachment of pendingAttachments) {
      preparedAttachments.push(await uploadAttachmentIfNeeded(attachment))
    }
    return preparedAttachments
  }

  const handleSyncDmSummaryToGroup = async () => {
    if (!collaborationContext || selectedSurface.kind !== "dm") {
      return
    }
    if (!sessionId || !organizationId) {
      notification.error(
        "Sync Unavailable",
        "Sign in and select an organization before syncing a DM summary."
      )
      return
    }

    const summary = dmSyncSummaryDraft.replace(/\s+/g, " ").trim()
    if (!summary) {
      notification.error(
        "Summary Required",
        "Add a concise DM summary before syncing to the group thread."
      )
      return
    }

    const selectedSyncCheckpoint =
      collaborationContext.syncCheckpoint?.dmThreadId === selectedSurface.dmThreadId
        ? collaborationContext.syncCheckpoint
        : undefined
    const syncCheckpointToken = selectedSyncCheckpoint?.token || ""
    const syncAttemptId = buildDeterministicDmSyncAttemptId({
      threadId: collaborationContext.threadId,
      dmThreadId: selectedSurface.dmThreadId,
      syncCheckpointToken,
      summary,
    })

    setIsSyncingDmSummary(true)
    try {
      const syncResult = await syncOperatorDmSummaryToGroup({
        sessionId,
        organizationId,
        threadId: collaborationContext.threadId,
        dmThreadId: selectedSurface.dmThreadId,
        summary,
        syncCheckpointToken: syncCheckpointToken || undefined,
        syncAttemptId,
      })

      const normalizedResult: DmSummarySyncAuditEntry = {
        status: syncResult.status || "error",
        message:
          syncResult.message
          || "DM summary sync did not return an explicit message.",
        sessionId: syncResult.sessionId,
        turnId: syncResult.turnId,
        syncAttemptId: syncResult.syncAttemptId || syncAttemptId,
        tokenSource: syncResult.tokenSource,
        createdAt: Date.now(),
        dmThreadId: selectedSurface.dmThreadId,
        specialistLabel: selectedSurface.specialistLabel,
      }
      setDmSyncAuditTrail((current) =>
        [
          normalizedResult,
          ...current.filter((entry) => entry.syncAttemptId !== normalizedResult.syncAttemptId),
        ].slice(0, 6)
      )

      if (normalizedResult.status === "blocked_sync_checkpoint") {
        notification.info(
          "Sync Blocked by Checkpoint",
          normalizedResult.message
        )
        return
      }

      if (
        normalizedResult.status === "error"
        || normalizedResult.status === "rate_limited"
        || normalizedResult.status === "credits_exhausted"
      ) {
        notification.error(
          "DM Summary Sync Failed",
          normalizedResult.message
        )
        return
      }

      notification.success(
        "DM Summary Synced",
        normalizedResult.message
      )
      setDmSyncSummaryDraft("")
    } catch (error) {
      notification.error(
        "DM Summary Sync Failed",
        error instanceof Error ? error.message : "Unknown sync error."
      )
    } finally {
      setIsSyncingDmSummary(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (voiceCaptureState === "listening" || voiceCaptureState === "transcribing") {
      notification.info(
        "Voice Capture In Progress",
        "Stop the active microphone capture before sending."
      )
      return
    }
    if ((!message.trim() && imageAttachments.length === 0) || isSending || isFetchingReferences) return

    if (!isAIReady) {
      notification.error(
        "AI Not Ready",
        "Please configure at least one AI model in Organization Settings > AI before chatting."
      )
      return
    }

    const messageToSend = message.trim()
    const referencesToSend: AIChatMessageReference[] = referenceUrls.map((url) => ({
      url,
      content: urlContents[url],
      status: urlStatuses[url] || (urlContents[url] ? "ready" : "loading"),
      error: urlErrors[url],
    }))
    const previousReferences: {
      urls: string[]
      imageAttachments: ComposerImageAttachment[]
      contents: Record<string, string>
      statuses: Record<string, AIChatMessageReference["status"]>
      errors: Record<string, string>
      pendingVoiceRuntime: AIChatVoiceRuntimeMetadata | null
      cameraLiveSession: CameraLiveSessionState | null
      cameraVisionError: string | null
    } = {
      urls: [...referenceUrls],
      imageAttachments: imageAttachments.map((attachment) => ({ ...attachment })),
      contents: { ...urlContents },
      statuses: { ...urlStatuses },
      errors: { ...urlErrors },
      pendingVoiceRuntime: pendingVoiceRuntime ? { ...pendingVoiceRuntime } : null,
      cameraLiveSession: cameraLiveSession ? { ...cameraLiveSession } : null,
      cameraVisionError,
    }

    setIsSending(true)
    abortController.current = new AbortController()

    try {
      let preparedImageAttachments = previousReferences.imageAttachments
      if (preparedImageAttachments.length > 0) {
        preparedImageAttachments = await ensureImageAttachmentsReady(preparedImageAttachments)
        previousReferences.imageAttachments = preparedImageAttachments
        setImageAttachments(preparedImageAttachments)
      }

      const outboundMessage = buildDeterministicOutboundMessage({
        message: messageToSend,
        mode: composerMode,
        reasoningEffort,
        references: referencesToSend,
        imageAttachments: preparedImageAttachments.map((attachment) => attachment.fileName),
      })
      const structuredAttachments: AIChatSendAttachment[] = preparedImageAttachments
        .filter((attachment) => Boolean(attachment.attachmentId))
        .map((attachment) => ({
          attachmentId: attachment.attachmentId as string,
        }))
      const liveVisionAttachments = preparedImageAttachments.filter(
        (attachment) => attachment.captureSource === "vision_live"
      )
      const latestVisionAttachment = liveVisionAttachments[liveVisionAttachments.length - 1]
      const normalizedLiveSessionId =
        pendingVoiceRuntime?.liveSessionId
        || latestVisionAttachment?.liveSessionId
        || cameraLiveSession?.liveSessionId
      const cameraRuntime: AIChatCameraRuntimeMetadata | undefined =
        normalizedLiveSessionId || cameraLiveSession || cameraVisionError
          ? {
              provider: cameraLiveSession?.provider ?? "browser_getusermedia",
              liveSessionId: normalizedLiveSessionId,
              sessionState:
                cameraLiveSession?.sessionState
                ?? (liveVisionAttachments.length > 0 ? "stopped" : "idle"),
              startedAt: cameraLiveSession?.startedAt,
              stoppedAt: cameraLiveSession?.stoppedAt,
              stopReason: cameraLiveSession?.stopReason,
              frameCaptureCount: Math.max(
                cameraLiveSession?.frameCaptureCount ?? 0,
                liveVisionAttachments.length
              ),
              frameCadenceMs: cameraLiveSession?.frameCadenceMs,
              frameCadenceFps: cameraLiveSession?.frameCadenceFps,
              fallbackReason: cameraVisionError ?? cameraLiveSession?.fallbackReason ?? null,
              captureSource:
                liveVisionAttachments.length > 0 ? "live_stream_capture" : "upload_only",
              runtimeAuthorityPrecedence: "vc83_runtime_policy",
              routeTarget: "vc83_tool_registry",
            }
          : undefined
      const voiceRuntime = pendingVoiceRuntime
        ? {
            ...pendingVoiceRuntime,
            liveSessionId: pendingVoiceRuntime.liveSessionId || normalizedLiveSessionId,
          }
        : undefined

      setMessage("")
      clearReferences()
      setPendingVoiceRuntime(null)
      setVoiceCaptureError(null)

      const collaborationOption = collaborationContext
        ? selectedSurface.kind === "dm"
          ? {
              surface: "dm" as const,
              dmThreadId: selectedSurface.dmThreadId,
              specialistAgentId: selectedSurface.specialistAgentId,
              specialistLabel: selectedSurface.specialistLabel,
            }
          : {
              surface: "group" as const,
            }
        : undefined

      const result = await chat.sendMessage(outboundMessage, currentConversationId, {
        mode: composerMode,
        reasoningEffort,
        privacyMode: privateModeEnabled,
        references: referencesToSend,
        attachments: structuredAttachments,
        collaboration: collaborationOption,
        liveSessionId: normalizedLiveSessionId,
        cameraRuntime,
        voiceRuntime,
        conversationRuntime: {
          contractVersion: CONVERSATION_CONTRACT_VERSION,
          state: conversationState,
          reasonCode: conversationReasonCode,
          mode: conversationModeSelection,
          requestedEyesSource:
            conversationModeSelection === "voice_with_eyes"
              ? conversationEyesSourceSelection
              : "none",
          sourceMode:
            conversationModeSelection === "voice_with_eyes"
              ? conversationEyesSourceSelection
              : "voice",
          capabilitySnapshot: conversationCapabilitySnapshot,
        },
      })

      if (!currentConversationId && result.conversationId) {
        setCurrentConversationId(result.conversationId)
      }

      if (cameraLiveSession?.sessionState === "capturing") {
        stopVisionStream("message_sent")
      }

      for (const attachment of previousReferences.imageAttachments) {
        revokeAttachmentPreview(attachment.previewUrl)
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      const creditRecovery = getCreditRecoveryAction(error)
      if (creditRecovery) {
        notification.error(
          "No Credits Available",
          "You are out of credits. Re-up now to keep the conversation going.",
          {
            action: {
              label: creditRecovery.actionLabel,
              onClick: () => openCreditRecoveryAction(creditRecovery.actionUrl),
            },
          }
        )
      } else {
        notification.error(
          "Failed to Send Message",
          errorMessage.length > 120 ? "An error occurred. Please try again." : errorMessage
        )
      }
      setMessage(messageToSend)
      setReferenceUrls(previousReferences.urls)
      setImageAttachments(previousReferences.imageAttachments)
      setUrlContents(previousReferences.contents)
      setUrlStatuses(previousReferences.statuses)
      setUrlErrors(previousReferences.errors)
      setPendingVoiceRuntime(previousReferences.pendingVoiceRuntime)
      setCameraLiveSession(previousReferences.cameraLiveSession)
      setCameraVisionError(previousReferences.cameraVisionError)
    } finally {
      setIsSending(false)
      abortController.current = null
    }
  }

  const startFrontlineIntake = async () => {
    if (isSending || isFetchingReferences) {
      return
    }

    const lastUserMessage = message.trim().length > 0 ? message.trim() : undefined
    const kickoff = buildFrontlineFeatureIntakeKickoff({
      trigger: "manual_feedback",
      lastUserMessage,
    })

    setIsSending(true)
    abortController.current = new AbortController()
    try {
      setMessage("")
      const result = await chat.sendMessage(kickoff, currentConversationId, {
        mode: composerMode,
        reasoningEffort,
        privacyMode: privateModeEnabled,
      })

      if (!currentConversationId && result.conversationId) {
        setCurrentConversationId(result.conversationId)
      }

      notification.info(
        "Let's Capture What's Missing",
        "I asked the assistant to ask what's missing and what you need, then draft the feature request."
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      const creditRecovery = getCreditRecoveryAction(error)
      if (creditRecovery) {
        notification.error(
          "No Credits Available",
          "You are out of credits. Re-up now to keep the conversation going.",
          {
            action: {
              label: creditRecovery.actionLabel,
              onClick: () => openCreditRecoveryAction(creditRecovery.actionUrl),
            },
          }
        )
      } else {
        notification.error(
          "Unable to Start Intake",
          errorMessage.length > 120 ? "Please retry in a moment." : errorMessage
        )
      }
    } finally {
      setIsSending(false)
      abortController.current = null
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const triggerSubmit = () => {
    void handleSubmit({ preventDefault: () => {} } as React.FormEvent)
  }

  const isVoiceListening = voiceCaptureState === "listening"
  const isVoiceTranscribing = voiceCaptureState === "transcribing"
  const hasLiveVisionStream = Boolean(cameraStreamRef.current && cameraLiveSession?.sessionState === "capturing")
  const isConversationActive = conversationState === "connecting" || conversationState === "live" || conversationState === "reconnecting"
  const controlDisabled = isSending || isFetchingReferences
  const configuredModelRows = useMemo(() => {
    const rows: Array<{ modelId: string; customLabel?: string }> = []
    const seen = new Set<string>()
    for (const configuredModel of settings?.llm.enabledModels || []) {
      const normalizedModelId = normalizeModelId(configuredModel.modelId)
      if (!normalizedModelId || seen.has(normalizedModelId)) {
        continue
      }
      seen.add(normalizedModelId)
      rows.push({
        modelId: normalizedModelId,
        customLabel: configuredModel.customLabel,
      })
    }
    return rows
  }, [settings?.llm.enabledModels])

  const connectedProviderIds = useMemo(() => {
    const connected = new Set<string>()
    for (const provider of connectionCatalog?.providers || []) {
      if (provider.isConnected && provider.enabled) {
        connected.add(normalizeProviderId(provider.providerId))
      }
    }
    return connected
  }, [connectionCatalog?.providers])

  const platformModelIndex = useMemo(() => {
    const index = new Map<string, { id: string; name: string; providerId: string }>()
    if (!platformModelsByProvider) {
      return index
    }

    for (const [providerKey, providerModels] of Object.entries(platformModelsByProvider)) {
      const normalizedProviderId = normalizeProviderId(providerKey)
      for (const platformModel of providerModels || []) {
        const normalizedModelId = normalizeModelId(platformModel.modelId)
        if (!normalizedModelId || index.has(normalizedModelId)) {
          continue
        }

        index.set(normalizedModelId, {
          id: normalizedModelId,
          name: platformModel.name?.trim() || formatModelDisplayName(normalizedModelId),
          providerId: normalizeProviderId(platformModel.provider || normalizedProviderId),
        })
      }
    }

    return index
  }, [platformModelsByProvider])

  const offeredModels = useMemo<OfferedChatModel[]>(() => {
    const offerings = new Map<string, OfferedChatModel>()

    const addModel = (model: { id: string; name: string; providerId: string }) => {
      if (offerings.has(model.id)) {
        return
      }
      offerings.set(model.id, {
        id: model.id,
        name: model.name,
        providerId: model.providerId,
        estimatedCredits: estimateAgentMessageCredits(model.id),
      })
    }

    // If org model policy exists, respect it strictly.
    if (configuredModelRows.length > 0) {
      for (const configuredModel of configuredModelRows) {
        const platformMatch = platformModelIndex.get(configuredModel.modelId)
        if (platformMatch) {
          addModel({
            ...platformMatch,
            name: configuredModel.customLabel || platformMatch.name,
          })
          continue
        }

        const inferredProviderId = inferProviderIdFromModelId(configuredModel.modelId)
        const isByokEligible = canUseByok && connectedProviderIds.has(inferredProviderId)
        if (!isByokEligible) {
          continue
        }

        addModel({
          id: configuredModel.modelId,
          name: configuredModel.customLabel || formatModelDisplayName(configuredModel.modelId),
          providerId: inferredProviderId,
        })
      }
    } else {
      // If org model policy is not configured yet, expose all platform-enabled models.
      for (const platformModel of platformModelIndex.values()) {
        addModel(platformModel)
      }
    }

    return Array.from(offerings.values()).sort((left, right) => left.name.localeCompare(right.name))
  }, [canUseByok, configuredModelRows, connectedProviderIds, platformModelIndex])

  const offeredModelIds = useMemo(() => new Set(offeredModels.map((model) => model.id)), [offeredModels])
  const configuredDefaultModelId =
    normalizeModelId(
      settings?.llm.defaultModelId ||
      settings?.llm.enabledModels?.find((model) => model.isDefault)?.modelId ||
      settings?.llm.enabledModels?.[0]?.modelId
    ) || undefined
  const defaultModelId = configuredDefaultModelId && offeredModelIds.has(configuredDefaultModelId)
    ? configuredDefaultModelId
    : offeredModels[0]?.id
  const activeModelId = selectedModel && offeredModelIds.has(selectedModel) ? selectedModel : defaultModelId
  const activeModelLabel =
    offeredModels.find((model) => model.id === activeModelId)?.name ||
    formatModelDisplayName(activeModelId)
  const isPlatformModelsLoading = platformModelsByProvider === undefined

  useEffect(() => {
    if (isPlatformModelsLoading) {
      return
    }
    if (selectedModel && !offeredModelIds.has(selectedModel)) {
      setSelectedModel(undefined)
    }
  }, [isPlatformModelsLoading, offeredModelIds, selectedModel, setSelectedModel])

  const modelOptions = useMemo<DropUpSelectOption[]>(() => {
    const options: DropUpSelectOption[] = []
    options.push({
      value: MODEL_AUTO_VALUE,
      label: "Auto",
      description: defaultModelId
        ? `Default: ${activeModelLabel}`
        : isPlatformModelsLoading
          ? "Loading available models..."
          : "No eligible models available",
    })

    for (const model of offeredModels) {
      options.push({
        value: model.id,
        label: model.name,
        description: `${model.id} • ~${model.estimatedCredits} credits/msg`,
      })
    }

    return options
  }, [activeModelLabel, defaultModelId, isPlatformModelsLoading, offeredModels])

  const modelControlValue = selectedModel && offeredModelIds.has(selectedModel)
    ? selectedModel
    : MODEL_AUTO_VALUE
  const selectedModelOption = modelOptions.find((option) => option.value === modelControlValue)
  const modelControlLabel =
    selectedModelOption?.value === MODEL_AUTO_VALUE
      ? activeModelId
        ? activeModelLabel
        : "Model"
      : selectedModelOption?.label || activeModelLabel || "Model"

  const modeLabel = MODE_OPTIONS.find((option) => option.value === composerMode)?.label || "Auto"
  const reasoningLabel =
    REASONING_OPTIONS.find((option) => option.value === reasoningEffort)?.label || "Medium"
  const selectedLanguageCode = getLanguageAbbreviation(
    isUsingAppLanguage ? voiceInputLanguage : selectedLanguageValue
  )
  const cycleComposerMode = () => {
    const currentIndex = MODE_OPTIONS.findIndex((option) => option.value === composerMode)
    const nextMode = MODE_OPTIONS[(currentIndex + 1 + MODE_OPTIONS.length) % MODE_OPTIONS.length]
    setComposerMode(nextMode.value as AIChatComposerMode)
  }
  const cycleReasoningEffort = () => {
    const currentIndex = REASONING_OPTIONS.findIndex((option) => option.value === reasoningEffort)
    const nextEffort = REASONING_OPTIONS[(currentIndex + 1 + REASONING_OPTIONS.length) % REASONING_OPTIONS.length]
    setReasoningEffort(nextEffort.value as AIChatReasoningEffort)
  }
  const cycleVoiceLanguage = () => {
    if (languageOptions.length <= 1) {
      return
    }
    if (voiceCaptureState === "listening") {
      stopVoiceCapture()
    }
    const currentIndex = languageOptions.findIndex((option) => option.value === selectedLanguageValue)
    const fallbackIndex = currentIndex >= 0 ? currentIndex : 0
    const nextOption = languageOptions[(fallbackIndex + 1) % languageOptions.length]
    setSelectedLanguageValue(nextOption.value)
  }
  const composerPlaceholder = visualMode === "single" ? "Message SevenLayers" : "Chat with SevenLayers"
  const showChatDebugMetadata = process.env.NEXT_PUBLIC_CHAT_DEBUG_METADATA === "1"
  const collaborationSurfaceLabel = collaborationContext
    ? selectedSurface.kind === "dm"
      ? `DM • ${selectedSurface.specialistLabel}`
      : `Group • ${collaborationContext.orchestratorLabel}`
    : null
  const collaborationPolicyLabel = collaborationContext
    ? selectedSurface.kind === "dm"
      ? "Proposal-only path. Visibility: operator, orchestrator, and addressed specialist."
      : "Group thread is orchestrator-scoped for shared outcomes."
    : null
  const selectedDmSyncCheckpoint =
    collaborationContext
    && selectedSurface.kind === "dm"
    && collaborationContext.syncCheckpoint?.dmThreadId === selectedSurface.dmThreadId
      ? collaborationContext.syncCheckpoint
      : undefined
  const dmSyncStatusLabel = selectedDmSyncCheckpoint
    ? `Checkpoint ${selectedDmSyncCheckpoint.status} · expires ${formatSyncTimestamp(selectedDmSyncCheckpoint.expiresAt)}`
    : "No checkpoint for this DM thread"
  const dmSyncAuditRows =
    selectedSurface.kind === "dm"
      ? dmSyncAuditTrail.filter((entry) => entry.dmThreadId === selectedSurface.dmThreadId)
      : []
  const dmSyncActionDisabled =
    isSyncingDmSummary
    || selectedSurface.kind !== "dm"
    || !sessionId
    || !organizationId
    || dmSyncSummaryDraft.trim().length === 0

  useEffect(() => {
    const hasConversationIntent = isStartingConversation || isVoiceListening || isVoiceTranscribing || Boolean(pendingVoiceRuntime)
    const nextState: ConversationSessionState =
      isConversationEnding
        ? "ending"
        : conversationState === "ended"
          ? "ended"
          : cameraVisionError || voiceCaptureError
            ? "error"
            : !hasConversationIntent
              ? "idle"
              : isStartingConversation || isVoiceTranscribing
                ? "connecting"
                : isVoiceListening
                  ? "live"
                  : "reconnecting"

    const nextReason =
      nextState === "error"
        ? inferConversationReasonCode(cameraVisionError || voiceCaptureError)
        : nextState === "reconnecting"
          ? "transport_failed"
          : undefined

    setConversationState((current) => (current === nextState ? current : nextState))
    setConversationReasonCode((current) => (current === nextReason ? current : nextReason))
  }, [
    cameraVisionError,
    conversationState,
    isConversationEnding,
    isStartingConversation,
    isVoiceListening,
    isVoiceTranscribing,
    pendingVoiceRuntime,
    voiceCaptureError,
  ])

  useEffect(() => {
    if (conversationState === "idle") {
      return
    }
    if (conversationState === "connecting") {
      emitConversationEvent("conversation_connecting")
      return
    }
    if (conversationState === "live") {
      emitConversationEvent("conversation_live")
      return
    }
    if (conversationState === "reconnecting") {
      emitConversationEvent("conversation_reconnecting")
      return
    }
    if (conversationState === "ending") {
      emitConversationEvent("conversation_ending")
      return
    }
    if (conversationState === "ended") {
      emitConversationEvent("conversation_ended")
      return
    }
    emitConversationEvent("conversation_error")
    if (conversationReasonCode === "permission_denied_mic" || conversationReasonCode === "permission_denied_camera") {
      emitConversationEvent("conversation_permission_denied")
    }
  }, [conversationReasonCode, conversationState])

  useEffect(() => {
    if (conversationModeSelection !== "voice_with_eyes") {
      return
    }
    if (conversationState !== "live" && conversationState !== "reconnecting") {
      return
    }
    if (!activeConversationEyesSourceRef.current) {
      return
    }
    if (cameraLiveSession?.sessionState === "capturing") {
      return
    }
    if (
      cameraLiveSession?.stopReason === "conversation_eyes_toggle_off"
      || cameraLiveSession?.stopReason === "conversation_end_control"
      || cameraLiveSession?.stopReason === "conversation_voice_only_selected"
      || cameraLiveSession?.stopReason === "operator_toggle_off"
      || cameraLiveSession?.stopReason === "operator_stop"
    ) {
      return
    }
    degradeConversationToVoice(
      cameraVisionError || cameraLiveSession?.fallbackReason || "device_unavailable",
      activeConversationEyesSourceRef.current
    )
  }, [cameraLiveSession, cameraVisionError, conversationModeSelection, conversationState])

  return (
    <form
      onSubmit={handleSubmit}
      className="relative z-10 px-4 pb-4 pt-2"
      style={{
        background:
          "linear-gradient(180deg, transparent 0%, var(--shell-surface) 40%, var(--shell-surface) 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-4xl">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelection}
          className="hidden"
        />

        <div
          className="rounded-3xl border px-4 pb-3 pt-3"
          style={{
            borderColor: "var(--shell-border)",
            background:
              "linear-gradient(180deg, var(--shell-surface-elevated) 0%, var(--shell-surface) 100%)",
          }}
        >
          {showUrlInput ? (
            <div className="mb-3 flex items-center gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(event) => setUrlInput(event.target.value)}
                placeholder="https://example.com"
                className="h-9 w-full rounded-xl border px-3 text-sm focus:outline-none"
                style={{
                  borderColor: "var(--shell-border-soft)",
                  background: "var(--shell-surface)",
                  color: "var(--shell-text)",
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void addUrlReferenceFromInput()
                  }
                  if (event.key === "Escape") {
                    setShowUrlInput(false)
                    setUrlInput("")
                  }
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  void addUrlReferenceFromInput()
                }}
                disabled={controlDisabled}
                className="h-9 rounded-xl border px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  borderColor: "var(--shell-border-soft)",
                  background: "var(--shell-surface)",
                  color: "var(--shell-text)",
                }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUrlInput(false)
                  setUrlInput("")
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border"
                style={{
                  borderColor: "var(--shell-border-soft)",
                  background: "var(--shell-surface)",
                  color: "var(--shell-text-dim)",
                }}
                title="Close link input"
              >
                <X size={14} />
              </button>
            </div>
          ) : null}

          {(isConversationActive || conversationState === "ending" || conversationState === "error") ? (
            <div
              className="mb-3 rounded-2xl border p-2"
              style={{
                borderColor:
                  conversationState === "error"
                    ? "var(--error)"
                    : conversationState === "reconnecting"
                      ? "var(--shell-input-border-strong)"
                      : "var(--success)",
                background: "var(--shell-surface)",
              }}
            >
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold" style={{ color: "var(--shell-text)" }}>
                  Conversation • {conversationModeSelection === "voice_with_eyes" ? "Voice + Eyes" : "Voice only"}
                </div>
                <div className="text-xs" style={{ color: "var(--shell-text-dim)" }}>
                  {conversationState}
                  {conversationReasonCode ? ` • ${conversationReasonCode}` : ""}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void toggleConversationMute()
                  }}
                  disabled={isVoiceTranscribing}
                  className="rounded-full border px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    borderColor: "var(--shell-border-soft)",
                    background: isConversationMicMuted ? "var(--error-bg)" : "var(--shell-surface)",
                    color: isConversationMicMuted ? "var(--error)" : "var(--shell-text)",
                  }}
                >
                  {isConversationMicMuted ? "Unmute mic" : "Mute mic"}
                </button>
                {conversationModeSelection === "voice_with_eyes" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (cameraLiveSession?.sessionState === "capturing") {
                          degradeConversationToVoice("device_unavailable", conversationEyesSourceSelection)
                          return
                        }
                        void (async () => {
                          const started = await startVisionStream()
                          if (started) {
                            activeConversationEyesSourceRef.current = conversationEyesSourceSelection
                            emitConversationEvent("conversation_eyes_source_changed", {
                              eyesSource: conversationEyesSourceSelection,
                            })
                          }
                        })()
                      }}
                      className="rounded-full border px-3 py-1 text-xs font-semibold"
                      style={{
                        borderColor: "var(--shell-border-soft)",
                        background: "var(--shell-surface)",
                        color: "var(--shell-text)",
                      }}
                    >
                      {cameraLiveSession?.sessionState === "capturing" ? "Eyes off" : "Eyes on"}
                    </button>
                    <span className="text-xs" style={{ color: "var(--shell-text-dim)" }}>
                      source: {conversationEyesSourceSelection}
                    </span>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={endConversationSession}
                  className="rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{
                    borderColor: "var(--error)",
                    background: "var(--error-bg)",
                    color: "var(--error)",
                  }}
                >
                  End conversation
                </button>
              </div>
            </div>
          ) : null}

          {cameraLiveSession ? (
            <div
              className="mb-3 rounded-2xl border p-2"
              style={{
                borderColor:
                  cameraLiveSession.sessionState === "capturing"
                    ? "var(--success)"
                    : "var(--shell-border-soft)",
                background: "var(--shell-surface)",
              }}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold" style={{ color: "var(--shell-text)" }}>
                  Vision • {cameraLiveSession.liveSessionId}
                </div>
                <div className="text-xs" style={{ color: "var(--shell-text-dim)" }}>
                  Frames {cameraLiveSession.frameCaptureCount}
                  {cameraLiveSession.frameCadenceFps
                    ? ` • ${cameraLiveSession.frameCadenceFps} fps`
                    : ""}
                </div>
              </div>
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                className="h-44 w-full rounded-xl object-cover"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void captureVisionFrame()
                  }}
                  disabled={controlDisabled || !hasLiveVisionStream}
                  className="rounded-full border px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    borderColor: "var(--shell-border-soft)",
                    background: "var(--shell-accent-soft)",
                    color: "var(--shell-text)",
                  }}
                >
                  Capture Frame
                </button>
                <button
                  type="button"
                  onClick={() => stopVisionStream("operator_stop")}
                  className="rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{
                    borderColor: "var(--shell-border-soft)",
                    background: "var(--shell-surface)",
                    color: "var(--shell-text-dim)",
                  }}
                >
                  Stop Vision
                </button>
                {cameraVisionError ? (
                  <span className="text-xs" style={{ color: "var(--error)" }}>
                    fallback: {cameraVisionError}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {pendingVoiceRuntime || voiceCaptureError ? (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {isVoiceListening && activeVoiceSessionId ? (
                <span
                  className="rounded-full border px-2.5 py-1 text-xs"
                  style={{
                    borderColor: "var(--shell-border-soft)",
                    background: "var(--shell-surface)",
                    color: "var(--shell-text-dim)",
                  }}
                >
                  Voice session {activeVoiceSessionId}
                </span>
              ) : null}
              {pendingVoiceRuntime ? (
                <span
                  className="rounded-full border px-2.5 py-1 text-xs"
                  style={{
                    borderColor: "var(--shell-border-soft)",
                    background: "var(--shell-surface)",
                    color: "var(--shell-text-dim)",
                  }}
                >
                  Voice runtime {pendingVoiceRuntime.providerId || "unknown"} •
                  {pendingVoiceRuntime.transcribeStatus || "unknown"}
                </span>
              ) : null}
              {voiceCaptureError ? (
                <span
                  className="rounded-full border px-2.5 py-1 text-xs"
                  style={{
                    borderColor: "var(--error)",
                    background: "var(--error-bg)",
                    color: "var(--error)",
                  }}
                >
                  Voice fallback: {voiceCaptureError}
                </span>
              ) : null}
            </div>
          ) : null}

          {referenceUrls.length > 0 || imageAttachments.length > 0 ? (
            <div className="mb-2 space-y-2">
              <div className="flex flex-wrap gap-2">
              {referenceUrls.map((url) => {
                const status = urlStatuses[url] || "loading"
                const hostname = (() => {
                  try {
                    return new URL(url).hostname
                  } catch {
                    return url
                  }
                })()

                return (
                  <div
                    key={url}
                    className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                    style={{
                      borderColor:
                        status === "ready"
                          ? "var(--success)"
                          : status === "error"
                            ? "var(--error)"
                            : "var(--shell-input-border-strong)",
                      background: "var(--shell-surface)",
                      color:
                        status === "ready"
                          ? "var(--success)"
                          : status === "error"
                            ? "var(--error)"
                            : "var(--shell-text-dim)",
                    }}
                  >
                    {status === "ready" ? (
                      <Check size={11} />
                    ) : status === "error" ? (
                      <AlertCircle size={11} />
                    ) : (
                      <Loader2 size={11} className="animate-spin" />
                    )}
                    <span className="max-w-40 truncate">{hostname}</span>
                    <button
                      type="button"
                      onClick={() => removeReference(url)}
                      className="rounded p-0.5"
                      style={{ color: "inherit" }}
                      title="Remove URL reference"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )
              })}
              </div>

              {imageAttachments.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {imageAttachments.map((attachment) => (
                    <div
                      key={attachment.clientId}
                      className="flex items-center gap-2 rounded-2xl border p-2"
                      style={{
                        borderColor: "var(--shell-input-border-strong)",
                        background: "var(--shell-surface)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attachment.previewUrl}
                        alt={attachment.fileName}
                        className="h-16 w-16 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold" style={{ color: "var(--shell-text)" }}>
                          {attachment.fileName}
                        </div>
                        <div className="truncate text-xs" style={{ color: "var(--shell-text-dim)" }}>
                          {attachment.mimeType} • {formatAttachmentSize(attachment.sizeBytes)}
                          {attachment.captureSource === "vision_live"
                            ? ` • Vision ${attachment.liveSessionId || ""}`
                            : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachedImage(attachment.clientId)}
                        className="rounded p-1"
                        style={{ color: "var(--shell-text-dim)" }}
                        title="Remove image attachment"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {showChatDebugMetadata && collaborationSurfaceLabel && collaborationPolicyLabel ? (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                style={{
                  borderColor: "var(--shell-border-soft)",
                  background: "var(--shell-surface)",
                  color: "var(--shell-text)",
                }}
              >
                {collaborationSurfaceLabel}
              </span>
              <span className="text-xs" style={{ color: "var(--shell-text-dim)" }}>
                {collaborationPolicyLabel}
              </span>
            </div>
          ) : null}

          {showChatDebugMetadata && collaborationContext && selectedSurface.kind === "dm" ? (
            <div
              className="mb-3 rounded-2xl border px-3 py-2"
              style={{
                borderColor: "var(--shell-border-soft)",
                background: "var(--shell-surface)",
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold" style={{ color: "var(--shell-text)" }}>
                  Sync DM summary to group
                </p>
                <span className="text-xs" style={{ color: "var(--shell-text-dim)" }}>
                  {dmSyncStatusLabel}
                </span>
              </div>
              <p className="mt-1 text-xs" style={{ color: "var(--shell-text-dim)" }}>
                Explicit operator action with deterministic replay-safe `syncAttemptId`.
              </p>
              <textarea
                value={dmSyncSummaryDraft}
                onChange={(event) => setDmSyncSummaryDraft(event.target.value)}
                placeholder={`Summary for ${selectedSurface.specialistLabel}`}
                disabled={isSyncingDmSummary}
                className="mt-2 w-full min-h-16 resize-y rounded-xl border px-2 py-1.5 text-xs leading-5 disabled:opacity-70"
                style={{
                  borderColor: "var(--shell-border-soft)",
                  background: "var(--shell-surface-elevated)",
                  color: "var(--shell-text)",
                }}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleSyncDmSummaryToGroup()
                  }}
                  disabled={dmSyncActionDisabled}
                  className="rounded-full border px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    borderColor: "var(--shell-border-soft)",
                    background: "var(--shell-accent-soft)",
                    color: "var(--shell-text)",
                  }}
                >
                  {isSyncingDmSummary ? "Syncing..." : "Sync to Group"}
                </button>
                {selectedDmSyncCheckpoint ? (
                  <span className="text-xs" style={{ color: "var(--shell-text-dim)" }}>
                    Token {selectedDmSyncCheckpoint.tokenId.slice(0, 18)}
                  </span>
                ) : null}
              </div>
              {dmSyncAuditRows.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {dmSyncAuditRows.slice(0, 3).map((entry) => (
                    <div
                      key={`${entry.syncAttemptId || "sync"}:${entry.createdAt}`}
                      className="rounded-xl border px-2 py-1.5 text-xs"
                      style={{
                        borderColor: "var(--shell-border-soft)",
                        background: "var(--shell-surface-elevated)",
                        color: "var(--shell-text-dim)",
                      }}
                    >
                      <div className="font-semibold" style={{ color: "var(--shell-text)" }}>
                        {entry.status} · {formatSyncTimestamp(entry.createdAt)}
                      </div>
                      <div className="truncate">{entry.message}</div>
                      {entry.syncAttemptId ? (
                        <div className="truncate">Attempt {entry.syncAttemptId}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={composerPlaceholder}
            disabled={controlDisabled}
            className="w-full min-h-14 max-h-40 resize-none overflow-y-auto border-0 bg-transparent px-1 py-1 text-sm leading-7 disabled:opacity-70"
            style={{ color: "var(--shell-text)" }}
            rows={1}
          />

          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 pb-1">
              <ComposerActionMenu
                disabled={controlDisabled}
                referenceCount={referenceUrls.length + imageAttachments.length}
                onAddLink={() => setShowUrlInput(true)}
                onAttachImage={handleAttachImageClick}
                onFrontlineIntake={() => {
                  void startFrontlineIntake()
                }}
                modeLabel={modeLabel}
                reasoningLabel={reasoningLabel}
                voiceLanguageLabel={selectedLanguageCode}
                canAdjustVoiceLanguage={voiceCaptureSupported}
                onCycleMode={cycleComposerMode}
                onCycleReasoning={cycleReasoningEffort}
                onCycleVoiceLanguage={cycleVoiceLanguage}
              />

              <div
                className="h-5 w-px shrink-0"
                style={{ background: "var(--shell-border-soft)" }}
              />

              <DropUpSelect
                ariaLabel="Model selection"
                value={modelControlValue}
                buttonLabel={modelControlLabel}
                options={modelOptions}
                disabled={controlDisabled}
                onChange={(nextValue) => {
                  if (nextValue === MODEL_AUTO_VALUE) {
                    setSelectedModel(undefined)
                    return
                  }

                  if (offeredModelIds.has(nextValue)) {
                    setSelectedModel(nextValue)
                  }
                }}
              />
            </div>

            <div className="relative flex shrink-0 items-center gap-2" ref={conversationPickerRef}>
              {isSending ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault()
                    stopCurrentRequest()
                    notification.info("Request Stopped", "AI processing has been cancelled")
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border"
                  style={{
                    borderColor: "var(--error)",
                    background: "var(--error-bg)",
                    color: "var(--error)",
                  }}
                  title="Stop processing"
                >
                  <StopCircle size={16} />
                </button>
              ) : (message.trim().length === 0 && imageAttachments.length === 0 && voiceCaptureSupported) ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (isVoiceListening) {
                        stopVoiceCapture()
                        return
                      }
                      if (isVoiceTranscribing) {
                        return
                      }
                      void startVoiceCapture()
                    }}
                    disabled={controlDisabled || isVoiceTranscribing}
                    aria-label={
                      isVoiceTranscribing
                        ? "Transcribing voice capture"
                        : isVoiceListening
                          ? "Stop voice capture"
                          : "Start voice capture"
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      borderColor: "var(--shell-border-soft)",
                      background: "var(--shell-surface)",
                      color: isVoiceListening ? "var(--error)" : "var(--shell-text-dim)",
                    }}
                    title={
                      isVoiceTranscribing
                        ? "Transcribing voice capture"
                        : isVoiceListening
                          ? "Stop voice capture"
                          : "Start voice capture"
                    }
                  >
                    {isVoiceTranscribing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Mic size={14} />
                    )}
                  </button>

                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={isConversationPickerOpen}
                    onClick={() => setIsConversationPickerOpen((current) => !current)}
                    disabled={controlDisabled || isVoiceTranscribing}
                    aria-label="Open conversation settings"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      borderColor: isConversationPickerOpen
                        ? "var(--shell-neutral-active-border)"
                        : "var(--shell-border-soft)",
                      background: isConversationPickerOpen
                        ? "var(--shell-neutral-hover-surface)"
                        : "var(--shell-surface)",
                      color: "var(--shell-text)",
                    }}
                    title="Choose conversation mode"
                  >
                    <MessageSquare size={14} />
                  </button>

                  {isConversationPickerOpen ? (
                    <div
                      role="dialog"
                      aria-label="Conversation mode picker"
                      className="absolute bottom-full right-0 z-50 mb-2 w-72 rounded-2xl border p-3"
                      style={{
                        borderColor: "var(--shell-input-border-strong)",
                        background: "var(--shell-input-surface)",
                      }}
                    >
                      <p className="text-xs font-semibold" style={{ color: "var(--shell-text)" }}>
                        Mode
                      </p>
                      <p className="mt-1 text-xs" style={{ color: "var(--shell-text-dim)" }}>
                        Choose voice behavior before starting.
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setConversationModeSelection("voice")}
                          className="relative flex min-h-16 items-end rounded-xl border px-2.5 py-2 text-left text-xs"
                          style={{
                            borderColor:
                              conversationModeSelection === "voice"
                                ? "var(--shell-neutral-active-border)"
                                : "var(--shell-border-soft)",
                            background:
                              conversationModeSelection === "voice"
                                ? "var(--shell-neutral-hover-surface)"
                                : "var(--shell-surface)",
                            color: "var(--shell-text)",
                          }}
                        >
                          <span className="font-semibold">Voice only</span>
                          {conversationModeSelection === "voice" ? (
                            <span className="absolute right-2 top-2">
                              <Check size={14} />
                            </span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConversationModeSelection("voice_with_eyes")}
                          className="relative flex min-h-16 items-end rounded-xl border px-2.5 py-2 text-left text-xs"
                          style={{
                            borderColor:
                              conversationModeSelection === "voice_with_eyes"
                                ? "var(--shell-neutral-active-border)"
                                : "var(--shell-border-soft)",
                            background:
                              conversationModeSelection === "voice_with_eyes"
                                ? "var(--shell-neutral-hover-surface)"
                                : "var(--shell-surface)",
                            color: "var(--shell-text)",
                          }}
                        >
                          <span className="font-semibold">Voice + Eyes</span>
                          {conversationModeSelection === "voice_with_eyes" ? (
                            <span className="absolute right-2 top-2">
                              <Check size={14} />
                            </span>
                          ) : null}
                        </button>
                      </div>

                      {conversationModeSelection === "voice_with_eyes" ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-semibold" style={{ color: "var(--shell-text-dim)" }}>
                            Eyes source
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setConversationEyesSourceSelection("webcam")}
                              className="relative flex min-h-[58px] items-end rounded-xl border px-2.5 py-2 text-left text-xs disabled:cursor-not-allowed disabled:opacity-60"
                              style={{
                                borderColor:
                                  conversationEyesSourceSelection === "webcam"
                                    ? "var(--shell-neutral-active-border)"
                                    : "var(--shell-border-soft)",
                                background:
                                  conversationEyesSourceSelection === "webcam"
                                    ? "var(--shell-neutral-hover-surface)"
                                    : "var(--shell-surface)",
                                color: "var(--shell-text)",
                              }}
                              disabled={!conversationCapabilitySnapshot.capabilities.webcam.available}
                            >
                              <span className="font-semibold">Webcam</span>
                              {conversationEyesSourceSelection === "webcam" ? (
                                <span className="absolute right-2 top-2">
                                  <Check size={14} />
                                </span>
                              ) : null}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConversationEyesSourceSelection("meta_glasses")}
                              className="relative flex min-h-[58px] items-end rounded-xl border px-2.5 py-2 text-left text-xs disabled:cursor-not-allowed disabled:opacity-60"
                              style={{
                                borderColor:
                                  conversationEyesSourceSelection === "meta_glasses"
                                    ? "var(--shell-neutral-active-border)"
                                    : "var(--shell-border-soft)",
                                background:
                                  conversationEyesSourceSelection === "meta_glasses"
                                    ? "var(--shell-neutral-hover-surface)"
                                    : "var(--shell-surface)",
                                color: "var(--shell-text)",
                              }}
                              disabled={!conversationCapabilitySnapshot.capabilities.metaGlasses.available}
                              title={conversationCapabilitySnapshot.capabilities.metaGlasses.reasonCode || undefined}
                            >
                              <span className="font-semibold">Meta Glasses</span>
                              {conversationEyesSourceSelection === "meta_glasses" ? (
                                <span className="absolute right-2 top-2">
                                  <Check size={14} />
                                </span>
                              ) : null}
                            </button>
                          </div>
                          {!conversationCapabilitySnapshot.capabilities.metaGlasses.available ? (
                            <p className="text-[11px]" style={{ color: "var(--shell-text-dim)" }}>
                              {conversationCapabilitySnapshot.capabilities.metaGlasses.reasonCode
                                || "Meta glasses unavailable on this build."}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsConversationPickerOpen(false)}
                          className="rounded-full border px-3 py-1 text-xs font-semibold"
                          style={{
                            borderColor: "var(--shell-border-soft)",
                            background: "var(--shell-surface)",
                            color: "var(--shell-text-dim)",
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void startConversationCapture()
                          }}
                          disabled={isStartingConversation || isVoiceTranscribing || controlDisabled}
                          className="rounded-full border px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                          style={{
                            borderColor: "var(--shell-border-soft)",
                            background: "var(--shell-button-primary-gradient)",
                            color: "var(--shell-on-accent)",
                          }}
                        >
                          {isStartingConversation ? "Starting..." : "Start"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
              {!isSending && !(message.trim().length === 0 && imageAttachments.length === 0 && voiceCaptureSupported) ? (
                <button
                  type="button"
                  onClick={triggerSubmit}
                  disabled={controlDisabled || (message.trim().length === 0 && imageAttachments.length === 0)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: "var(--shell-border-soft)",
                    background: "var(--shell-button-primary-gradient)",
                    color: "var(--shell-on-accent)",
                  }}
                  title="Send message"
                >
                  <ArrowUp size={16} />
                </button>
              ) : null}
            </div>
          </div>
        </div>

      </div>
    </form>
  )
}
