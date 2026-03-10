"use client"

import { useAction, useMutation, useQuery } from "convex/react"
import { useCallback, useState, useRef, useEffect, useMemo } from "react"
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
  type VoiceRealtimeTransportRoute,
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
  resolveVoiceLiveDuplexSegmentDurationMs,
  resolveVoicePcmCaptureContract,
  resolveVoiceRealtimeSttRoutePrecedence,
  resolveVoiceRealtimeTransportRoutePrecedence,
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
  resolveConversationSessionState,
  shouldKeepConversationStageVisible as resolveConversationStageVisibility,
} from "@/lib/ai/conversation-session-contract"
import {
  buildConversationCapabilitySnapshot,
  mapConversationCapabilityReasonCode,
  type ConversationCapabilitySnapshot,
} from "@/lib/av/session/mediaSessionContract"
import {
  buildDesktopGeminiLiveMetadata,
  composeDesktopRuntimeMetadata,
  evaluateDesktopVisionDegradeGuard,
  isIntentionalDesktopVisionStopReason,
  isTransientDesktopCameraBackpressureReason,
  normalizeDesktopCameraFallbackReason,
  resolveDesktopConversationModeTransition,
  shouldResolveDuplexVoiceTurnVisionFrame,
  shouldRecoverBlankDesktopVisionPreview,
} from "@/lib/ai/desktop-conversation-runtime"
import {
  DEFAULT_REALTIME_CONVERSATION_VAD_POLICY,
  DEFAULT_REALTIME_VISION_FORWARDING_CADENCE_MS,
  DEFAULT_REALTIME_VISION_FORWARDING_MAX_FRAMES_PER_WINDOW,
  DEFAULT_REALTIME_VISION_FORWARDING_WINDOW_MS,
  computePcm16FrameRms,
  detectVadSpeechFrame,
  resolveRealtimeEchoCancellationSelection,
  shouldTriggerConversationVadEndpoint,
  shouldThrottleRealtimeVisionForwarding,
} from "@/lib/av/runtime/realtimeMediaSession"
import {
  DEFAULT_PENDING_FINAL_FRAME_TIMEOUT_MS,
  buildVoiceAudioFrameEnvelope,
  createDeterministicFrameQueue,
  resolveDuplexTransportFallbackDecision,
  resolveDuplexTransportModeFromRoute,
  resolveInitialDuplexTransportRoute,
  evaluateFinalFrameFinalizeGuard,
  evaluatePendingFinalFrameRelease,
  finalizeMergedTranscript,
  mergeTranscriptFrame,
  resolvePendingFinalFrameQueueDecision,
  queuePendingFinalFrameFinalize,
  resolveSegmentedFrameStreamingPolicy,
  type PendingFinalFrameFinalizePayload,
} from "@/lib/av/runtime/voiceSegmentedDuplex"
import { buildVoiceConversationStarterText } from "@/lib/voice/catalog-language"
import type {
  CollaborationSurfaceSelection,
  OperatorCollaborationContextPayload,
} from "./operator-collaboration-types"
import { SlickConversationStage } from "./slick-conversation-stage"
import type { Id } from "../../../../../convex/_generated/dataModel"
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

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

type VoiceSessionRuntimePath = "persistent_realtime_multimodal" | "turn_stitch"
type VoiceSessionFallbackReason =
  | "feature_flag_disabled"
  | "provider_capability_unsupported"
  | "session_handshake_failed"
  | "voice_runtime_fallback"

function resolveVoiceSessionRuntimePath(args: {
  persistentMultimodal?: {
    mode?: "persistent_realtime_multimodal" | "turn_stitch"
    enabled?: boolean
    fallbackReason?: string | null
    providerId?: string | null
    providerSessionId?: string | null
    featureFlagEnabled?: boolean
  } | null
}): {
  runtimePath: VoiceSessionRuntimePath
  turnStitchFallbackReason: VoiceSessionFallbackReason | null
  persistentProviderId?: string
  persistentProviderSessionId?: string
} {
  const snapshot = args.persistentMultimodal
  if (snapshot?.enabled === true && snapshot.mode === "persistent_realtime_multimodal") {
    return {
      runtimePath: "persistent_realtime_multimodal",
      turnStitchFallbackReason: null,
      persistentProviderId: normalizeOptionalString(snapshot.providerId) || undefined,
      persistentProviderSessionId:
        normalizeOptionalString(snapshot.providerSessionId) || undefined,
    }
  }

  const fallbackReasonRaw = normalizeOptionalString(snapshot?.fallbackReason)
  const turnStitchFallbackReason: VoiceSessionFallbackReason =
    fallbackReasonRaw === "feature_flag_disabled"
    || fallbackReasonRaw === "provider_capability_unsupported"
    || fallbackReasonRaw === "session_handshake_failed"
      ? fallbackReasonRaw
      : "voice_runtime_fallback"

  return {
    runtimePath: "turn_stitch",
    turnStitchFallbackReason,
    persistentProviderId: normalizeOptionalString(snapshot?.providerId) || undefined,
    persistentProviderSessionId:
      normalizeOptionalString(snapshot?.providerSessionId) || undefined,
  }
}

function resolveDesktopConversationStarterText(args: {
  language?: string | null
  userFirstName?: string | null
}): string {
  return buildVoiceConversationStarterText(args.language, args.userFirstName)
}

async function playAudioDataUrl(dataUrl: string): Promise<void> {
  if (typeof window === "undefined") {
    return
  }
  await new Promise<void>((resolve, reject) => {
    const audio = new Audio(dataUrl)
    let settled = false
    const cleanup = () => {
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("error", handleError)
      audio.removeEventListener("abort", handleAbort)
    }
    const finalize = (error?: Error) => {
      if (settled) {
        return
      }
      settled = true
      cleanup()
      if (error) {
        reject(error)
        return
      }
      resolve()
    }
    const handleEnded = () => finalize()
    const handleError = () => finalize(new Error("audio_playback_failed"))
    const handleAbort = () => finalize(new Error("audio_playback_aborted"))

    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("error", handleError)
    audio.addEventListener("abort", handleAbort)
    void audio.play().catch((error) => {
      const message =
        error instanceof Error ? error.message : "audio_playback_start_failed"
      finalize(new Error(message))
    })
  })
}

async function playSpeechSynthesisText(text: string): Promise<void> {
  const fallbackText = text.trim()
  if (
    !fallbackText
    || typeof window === "undefined"
    || !("speechSynthesis" in window)
  ) {
    return
  }

  await new Promise<void>((resolve) => {
    let settled = false
    const finalize = () => {
      if (settled) {
        return
      }
      settled = true
      resolve()
    }
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(fallbackText)
      utterance.onend = finalize
      utterance.onerror = finalize
      window.speechSynthesis.speak(utterance)
    } catch {
      finalize()
    }
  })
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

type VoiceCaptureMethod =
  | "pcm_audio_worklet"
  | "pcm_script_processor"
  | "media_recorder_fallback"

interface VoiceCapturePayload {
  audioBlob: Blob
  recorderMimeType?: string
  captureChunkCount: number
  captureChunkBytes: number
  captureMethod: VoiceCaptureMethod
  frameDurationMs?: number
  sampleRateHz?: number
  frameCount?: number
  frameBytes?: number
}

interface VoiceCaptureFramePayload {
  sequence: number
  sampleRateHz: number
  frameDurationMs: number
  frameBytes: number
  samples: Int16Array
}

interface SegmentedVoiceFrameInput {
  sequence: number
  sampleRateHz: number
  frameDurationMs: number
  frameBytes: number
  samples: Int16Array
  speechDetected: boolean
  endpointDetected: boolean
  frameRms: number
  isFinal: boolean
}

interface SegmentedVoiceFrameIngestResult {
  sequence: number
  relayEventCount: number
  transcriptText?: string
}

interface PendingSegmentFinalFrameState extends PendingFinalFrameFinalizePayload {
  ingestResult: SegmentedVoiceFrameIngestResult | null
}

interface VoiceCaptureController {
  method: VoiceCaptureMethod
  stop: () => void
  cancel: () => void
}

type BrowserAudioContextCtor = new (
  contextOptions?: AudioContextOptions
) => AudioContext

const REALTIME_TRANSPORT_ROUTE_PRECEDENCE = resolveVoiceRealtimeTransportRoutePrecedence()
const REALTIME_STT_ROUTE_PRECEDENCE = resolveVoiceRealtimeSttRoutePrecedence()
const INITIAL_REALTIME_TRANSPORT_ROUTE = resolveInitialDuplexTransportRoute(
  REALTIME_TRANSPORT_ROUTE_PRECEDENCE
) as VoiceRealtimeTransportRoute
const CONVERSATION_VAD_POLICY = DEFAULT_REALTIME_CONVERSATION_VAD_POLICY
const DESKTOP_VAD_MIN_ACTIVE_SPEECH_MS = 650
const VISION_FORWARDING_CADENCE_MS = DEFAULT_REALTIME_VISION_FORWARDING_CADENCE_MS
const VISION_FORWARDING_WINDOW_MS = DEFAULT_REALTIME_VISION_FORWARDING_WINDOW_MS
const VISION_FORWARDING_MAX_FRAMES_PER_WINDOW =
  DEFAULT_REALTIME_VISION_FORWARDING_MAX_FRAMES_PER_WINDOW
const VISION_FORWARDING_JPEG_QUALITY = 0.72
const VISION_FORWARDING_MAX_WIDTH_PX = 960
const ASSISTANT_PLAYBACK_QUEUE_POLICY = "interruption_safe_serial_queue"
const TTS_PRIMARY_ROUTE = "websocket_multi_context_primary"
const TTS_FALLBACK_ROUTE = "batch_synthesize_fallback"
const CONVERSATION_CAPTURE_HEARTBEAT_LOG_MS = 1500
const CONVERSATION_TURN_MAX_CAPTURE_MS = 12000
const PCM_NO_FRAME_FALLBACK_TIMEOUT_MS = 2500
const PCM_NO_FRAME_HEARTBEAT_WATCHDOG_MS = 1200
const CAMERA_PREVIEW_SIGNAL_TIMEOUT_MS = 6000
const CAMERA_PREVIEW_BLANK_RECOVERY_GRACE_MS = 6000
const CAMERA_STARTUP_DEGRADE_GRACE_MS = 4500
const CAMERA_PREVIEW_RECOVERY_RETRY_LIMIT = 3
const CONVERSATION_ORB_END_GUARD_MS = 1200

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function encodeInt16FrameToBase64(frame: Int16Array): string {
  return bytesToBase64(new Uint8Array(frame.buffer, frame.byteOffset, frame.byteLength))
}

function buildRealtimeVideoSessionId(liveSessionId: string): string {
  return `web_video:${liveSessionId}`
}

function resolveRealtimeMediaSessionAuthorityInvariant() {
  return {
    nativePolicyPrecedence: "vc83_runtime_policy" as const,
    mutatingIntentGate: "native_tool_registry" as const,
    approvalInvariant: "non_bypassable" as const,
    directDeviceMutation: "fail_closed" as const,
  }
}

function resolveJpegFrameSize(args: { width: number; height: number }): {
  width: number
  height: number
} {
  const normalizedWidth = Math.max(1, Math.floor(args.width || 1))
  const normalizedHeight = Math.max(1, Math.floor(args.height || 1))
  if (normalizedWidth <= VISION_FORWARDING_MAX_WIDTH_PX) {
    return { width: normalizedWidth, height: normalizedHeight }
  }
  const scale = VISION_FORWARDING_MAX_WIDTH_PX / normalizedWidth
  return {
    width: VISION_FORWARDING_MAX_WIDTH_PX,
    height: Math.max(1, Math.floor(normalizedHeight * scale)),
  }
}

function resolveConstrainBooleanValue(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value
  }
  if (typeof value !== "object" || value === null) {
    return undefined
  }
  const typed = value as Record<string, unknown>
  if (typeof typed.exact === "boolean") {
    return typed.exact
  }
  if (typeof typed.ideal === "boolean") {
    return typed.ideal
  }
  return undefined
}

function resolveHardwareAecSupport(): boolean {
  if (typeof window === "undefined") {
    return false
  }
  return navigator.mediaDevices?.getSupportedConstraints?.().echoCancellation === true
}

function resolveHardwareAecEnabled(audioTrack: MediaStreamTrack | null): boolean {
  if (!audioTrack) {
    return false
  }
  const settingValue = audioTrack.getSettings?.().echoCancellation
  if (typeof settingValue === "boolean") {
    return settingValue
  }
  const constraintValue = resolveConstrainBooleanValue(
    audioTrack.getConstraints?.().echoCancellation
  )
  return constraintValue === true
}

function resolveAudioContextCtor(): BrowserAudioContextCtor | null {
  if (typeof window === "undefined") {
    return null
  }
  const win = window as unknown as {
    AudioContext?: BrowserAudioContextCtor
    webkitAudioContext?: BrowserAudioContextCtor
  }
  return win.AudioContext || win.webkitAudioContext || null
}

function supportsPcmVoiceCapture(): boolean {
  return supportsAudioWorkletVoiceCapture() || supportsScriptProcessorVoiceCapture()
}

function supportsAudioWorkletVoiceCapture(): boolean {
  const audioContextCtor = resolveAudioContextCtor()
  if (!audioContextCtor || typeof AudioWorkletNode === "undefined") {
    return false
  }
  const win = window as unknown as {
    BaseAudioContext?: {
      prototype?: Record<string, unknown>
    }
  }
  if (win.BaseAudioContext?.prototype) {
    return "audioWorklet" in win.BaseAudioContext.prototype
  }
  return "audioWorklet" in audioContextCtor.prototype
}

function supportsScriptProcessorVoiceCapture(): boolean {
  const audioContextCtor = resolveAudioContextCtor()
  if (!audioContextCtor) {
    return false
  }
  return typeof audioContextCtor.prototype?.createScriptProcessor === "function"
}

function supportsMediaRecorderVoiceCapture(): boolean {
  return typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined"
}

function supportsAnyVoiceCapture(): boolean {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return false
  }
  return supportsPcmVoiceCapture() || supportsMediaRecorderVoiceCapture()
}

function encodeMonoPcm16Wav(args: {
  samples: Int16Array
  sampleRateHz: number
}): Blob {
  const sampleRateHz = Math.max(8000, Math.floor(args.sampleRateHz || 16000))
  const bytesPerSample = 2
  const blockAlign = bytesPerSample
  const byteRate = sampleRateHz * blockAlign
  const dataByteLength = args.samples.length * bytesPerSample
  const wavBuffer = new ArrayBuffer(44 + dataByteLength)
  const view = new DataView(wavBuffer)

  const writeAscii = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index))
    }
  }

  writeAscii(0, "RIFF")
  view.setUint32(4, 36 + dataByteLength, true)
  writeAscii(8, "WAVE")
  writeAscii(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRateHz, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeAscii(36, "data")
  view.setUint32(40, dataByteLength, true)

  let byteOffset = 44
  for (let index = 0; index < args.samples.length; index += 1) {
    view.setInt16(byteOffset, args.samples[index] || 0, true)
    byteOffset += bytesPerSample
  }
  return new Blob([wavBuffer], { type: "audio/wav" })
}

function convertMonoFloatToInt16(data: Float32Array): Int16Array {
  const output = new Int16Array(data.length)
  for (let index = 0; index < data.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, data[index] || 0))
    output[index] = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff)
  }
  return output
}

function buildMonoChunkFromInputBuffer(inputBuffer: AudioBuffer): Float32Array {
  const channelCount = Math.max(1, inputBuffer.numberOfChannels || 1)
  const sampleCount = inputBuffer.length
  const mono = new Float32Array(sampleCount)
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    let mixed = 0
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      mixed += inputBuffer.getChannelData(channelIndex)?.[sampleIndex] || 0
    }
    mono[sampleIndex] = mixed / channelCount
  }
  return mono
}

async function startPcmVoiceCapture(args: {
  stream: MediaStream
  requestedSampleRateHz: number
  frameDurationMs: number
  preferredCapturePath?: "auto" | "script_processor_only"
  onFrame?: (frame: VoiceCaptureFramePayload) => void | Promise<void>
  onCaptured: (payload: VoiceCapturePayload) => void
  onError: (error: unknown) => void
}): Promise<VoiceCaptureController> {
  const audioContextCtor = resolveAudioContextCtor()
  if (!audioContextCtor) {
    throw new Error("audio_context_unavailable")
  }

  let audioContext: AudioContext | null = null
  let sourceNode: MediaStreamAudioSourceNode | null = null
  let sinkGainNode: GainNode | null = null
  let scriptProcessorNode: ScriptProcessorNode | null = null
  let workletNode: AudioWorkletNode | null = null
  let workletUrl: string | null = null
  let isCompleted = false
  let pendingSamples: number[] = []
  const frameBuffers: Int16Array[] = []
  let frameSequence = 0
  const targetSampleRateHz = Math.max(
    8000,
    Math.floor(args.requestedSampleRateHz || 24000),
  )
  let captureMethod: VoiceCaptureMethod = "pcm_script_processor"
  let sourceSampleRateHz = targetSampleRateHz
  let resamplePosition = 0
  let resampleSourceSamples: number[] = []
  let hasLoggedFirstPcmChunk = false

  const frameSampleCount = Math.max(
    1,
    Math.round(targetSampleRateHz * (args.frameDurationMs / 1000)),
  )
  const frameByteLength = frameSampleCount * 2

  const cleanup = () => {
    if (sourceNode) {
      sourceNode.disconnect()
      sourceNode = null
    }
    if (workletNode) {
      workletNode.port.onmessage = null
      workletNode.disconnect()
      workletNode = null
    }
    if (scriptProcessorNode) {
      scriptProcessorNode.onaudioprocess = null
      scriptProcessorNode.disconnect()
      scriptProcessorNode = null
    }
    if (sinkGainNode) {
      sinkGainNode.disconnect()
      sinkGainNode = null
    }
    if (workletUrl) {
      URL.revokeObjectURL(workletUrl)
      workletUrl = null
    }
    if (audioContext) {
      void audioContext.close().catch(() => {})
      audioContext = null
    }
  }

  const emitFrame = (frame: Int16Array) => {
    frameBuffers.push(frame)
    if (args.onFrame) {
      const framePayload: VoiceCaptureFramePayload = {
        sequence: frameSequence,
        sampleRateHz: targetSampleRateHz,
        frameDurationMs: args.frameDurationMs,
        frameBytes: frame.byteLength,
        samples: frame,
      }
      void Promise.resolve(args.onFrame(framePayload)).catch((error) => {
        args.onError(error)
      })
    }
    frameSequence += 1
  }

  const finalizeFrames = (): VoiceCapturePayload => {
    if (pendingSamples.length > 0) {
      const padded = new Int16Array(frameSampleCount)
      for (let index = 0; index < frameSampleCount; index += 1) {
        padded[index] = pendingSamples[index] || 0
      }
      emitFrame(padded)
      pendingSamples = []
    }

    if (frameBuffers.length === 0) {
      return {
        audioBlob: new Blob([], { type: "audio/wav" }),
        recorderMimeType: "audio/wav",
        captureChunkCount: 0,
        captureChunkBytes: 0,
        captureMethod,
        frameDurationMs: args.frameDurationMs,
        sampleRateHz: targetSampleRateHz,
        frameCount: 0,
        frameBytes: frameByteLength,
      }
    }

    const totalSamples = frameBuffers.reduce(
      (total, frameBuffer) => total + frameBuffer.length,
      0,
    )
    const merged = new Int16Array(totalSamples)
    let writeOffset = 0
    for (const frameBuffer of frameBuffers) {
      merged.set(frameBuffer, writeOffset)
      writeOffset += frameBuffer.length
    }
    const frameBytes = merged.length * 2
    return {
      audioBlob: encodeMonoPcm16Wav({
        samples: merged,
        sampleRateHz: targetSampleRateHz,
      }),
      recorderMimeType: "audio/wav",
      captureChunkCount: frameBuffers.length,
      captureChunkBytes: frameBytes,
      captureMethod,
      frameDurationMs: args.frameDurationMs,
      sampleRateHz: targetSampleRateHz,
      frameCount: frameBuffers.length,
      frameBytes: frameByteLength,
    }
  }

  const completeWithCapture = () => {
    if (isCompleted) {
      return
    }
    isCompleted = true
    const payload = finalizeFrames()
    cleanup()
    args.onCaptured(payload)
  }

  try {
    audioContext = new audioContextCtor({
      latencyHint: "interactive",
    })
  } catch {
    audioContext = new audioContextCtor()
  }

  sourceSampleRateHz = Math.max(
    8000,
    Math.floor(audioContext.sampleRate || targetSampleRateHz),
  )

  const resampleChunkToTarget = (chunk: Float32Array): Float32Array => {
    if (sourceSampleRateHz === targetSampleRateHz) {
      return chunk
    }

    const step = sourceSampleRateHz / targetSampleRateHz
    if (!Number.isFinite(step) || step <= 0) {
      return chunk
    }

    for (let index = 0; index < chunk.length; index += 1) {
      resampleSourceSamples.push(chunk[index] || 0)
    }

    const output: number[] = []
    while (resamplePosition + 1 < resampleSourceSamples.length) {
      const baseIndex = Math.floor(resamplePosition)
      const nextIndex = baseIndex + 1
      const ratio = resamplePosition - baseIndex
      const baseSample = resampleSourceSamples[baseIndex] || 0
      const nextSample = resampleSourceSamples[nextIndex] || baseSample
      output.push(baseSample + (nextSample - baseSample) * ratio)
      resamplePosition += step
    }

    const consumed = Math.floor(resamplePosition)
    if (consumed > 0) {
      resampleSourceSamples = resampleSourceSamples.slice(consumed)
      resamplePosition -= consumed
    }

    return Float32Array.from(output)
  }

  const appendChunk = (chunk: Float32Array) => {
    if (isCompleted) {
      return
    }
    if (!hasLoggedFirstPcmChunk) {
      hasLoggedFirstPcmChunk = true
      console.info("[VoiceRuntime] web_audio_capture_first_pcm_chunk", {
        captureMethod,
        sourceSampleRateHz,
        targetSampleRateHz,
        sourceSampleCount: chunk.length,
      })
    }
    const normalizedChunk = resampleChunkToTarget(chunk)
    const int16Chunk = convertMonoFloatToInt16(normalizedChunk)
    for (let index = 0; index < int16Chunk.length; index += 1) {
      pendingSamples.push(int16Chunk[index] || 0)
      if (pendingSamples.length >= frameSampleCount) {
        const frame = Int16Array.from(
          pendingSamples.slice(0, frameSampleCount),
        )
        emitFrame(frame)
        pendingSamples = pendingSamples.slice(frameSampleCount)
      }
    }
  }

  try {
    sourceNode = audioContext.createMediaStreamSource(args.stream)
    sinkGainNode = audioContext.createGain()
    sinkGainNode.gain.value = 0
    const shouldForceScriptProcessor =
      args.preferredCapturePath === "script_processor_only"
    const supportsWorklet =
      !shouldForceScriptProcessor
      && typeof AudioWorkletNode !== "undefined"
      && Boolean(audioContext.audioWorklet)

    if (supportsWorklet) {
      const processorName = `vc83-pcm-capture-${Math.random().toString(36).slice(2, 10)}`
      const processorCode = `
class VC83PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]
    if (!input || input.length === 0) {
      return true
    }
    const channelCount = input.length
    const sampleCount = input[0]?.length || 0
    if (sampleCount === 0) {
      return true
    }
    const mono = new Float32Array(sampleCount)
    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      let mixed = 0
      for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
        mixed += input[channelIndex]?.[sampleIndex] || 0
      }
      mono[sampleIndex] = mixed / Math.max(1, channelCount)
    }
    this.port.postMessage(mono, [mono.buffer])
    return true
  }
}
registerProcessor("${processorName}", VC83PcmCaptureProcessor)
`
      workletUrl = URL.createObjectURL(
        new Blob([processorCode], { type: "application/javascript" }),
      )
      await audioContext.audioWorklet.addModule(workletUrl)
      workletNode = new AudioWorkletNode(audioContext, processorName)
      workletNode.port.onmessage = (event) => {
        const value = event.data
        if (value instanceof Float32Array) {
          appendChunk(value)
          return
        }
        if (value instanceof ArrayBuffer) {
          appendChunk(new Float32Array(value))
          return
        }
        if (Array.isArray(value)) {
          appendChunk(Float32Array.from(value))
        }
      }
      sourceNode.connect(workletNode)
      workletNode.connect(sinkGainNode)
      sinkGainNode.connect(audioContext.destination)
      captureMethod = "pcm_audio_worklet"
    } else if (typeof audioContext.createScriptProcessor === "function") {
      scriptProcessorNode = audioContext.createScriptProcessor(4096, 1, 1)
      scriptProcessorNode.onaudioprocess = (event) => {
        appendChunk(buildMonoChunkFromInputBuffer(event.inputBuffer))
      }
      sourceNode.connect(scriptProcessorNode)
      scriptProcessorNode.connect(sinkGainNode)
      sinkGainNode.connect(audioContext.destination)
      captureMethod = "pcm_script_processor"
    } else {
      throw new Error("pcm_capture_path_unavailable")
    }

    try {
      await audioContext.resume()
    } catch {
      // Ignore and fail below when the context remains suspended.
    }
    if (audioContext.state !== "running") {
      throw new Error(`audio_context_not_running:${audioContext.state}`)
    }
  } catch (error) {
    if (!isCompleted) {
      cleanup()
    }
    throw error
  }

  return {
    method: captureMethod,
    stop: () => completeWithCapture(),
    cancel: () => {
      if (isCompleted) {
        return
      }
      isCompleted = true
      cleanup()
    },
  }
}

function startMediaRecorderVoiceCapture(args: {
  stream: MediaStream
  preferredMimeTypes: readonly string[]
  fallbackMimeType: string
  onCaptured: (payload: VoiceCapturePayload) => void
  onError: (error: unknown) => void
}): VoiceCaptureController {
  const canConstructWithMimeType = typeof window.MediaRecorder?.isTypeSupported === "function"
  const mimeType = canConstructWithMimeType
    ? args.preferredMimeTypes.find((value) => window.MediaRecorder.isTypeSupported(value))
    : undefined
  const recorder = mimeType
    ? new window.MediaRecorder(args.stream, { mimeType })
    : new window.MediaRecorder(args.stream)
  const chunks: Blob[] = []
  let isCompleted = false

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data)
    }
  }

  recorder.onerror = (event) => {
    if (isCompleted) {
      return
    }
    isCompleted = true
    args.onError((event as Event & { error?: Error }).error || new Error("voice_capture_recorder_error"))
  }

  recorder.onstop = () => {
    if (isCompleted) {
      return
    }
    isCompleted = true
    const recorderMimeType =
      typeof recorder.mimeType === "string" && recorder.mimeType.trim().length > 0
        ? recorder.mimeType
        : ""
    const audioType =
      recorderMimeType
      || chunks[0]?.type
      || args.fallbackMimeType
    const captureChunkBytes = chunks.reduce(
      (total, chunk) => total + chunk.size,
      0,
    )
    args.onCaptured({
      audioBlob: new Blob(chunks, { type: audioType }),
      recorderMimeType: recorderMimeType || undefined,
      captureChunkCount: chunks.length,
      captureChunkBytes,
      captureMethod: "media_recorder_fallback",
    })
  }

  recorder.start()
  return {
    method: "media_recorder_fallback",
    stop: () => {
      if (recorder.state !== "inactive") {
        recorder.stop()
      }
    },
    cancel: () => {
      if (isCompleted) {
        return
      }
      isCompleted = true
      recorder.onstop = null
      recorder.ondataavailable = null
      recorder.onerror = null
      if (recorder.state !== "inactive") {
        recorder.stop()
      }
    },
  }
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

type VoiceTurnVisionFrameResolution =
  | {
      status: "attached"
      maxFrameAgeMs: number
      frame: {
        storageUrl: string
        mimeType: string
        sizeBytes: number
        capturedAt?: number
        retentionId?: string
      }
    }
  | {
      status: "degraded"
      maxFrameAgeMs: number
      reason: "vision_frame_missing" | "vision_frame_stale" | "vision_policy_blocked"
      freshestCandidateCapturedAt?: number
      freshestCandidateAgeMs?: number
    }

function normalizeVoiceTurnVisionFrameResolution(
  value: unknown
): VoiceTurnVisionFrameResolution | undefined {
  if (!value || typeof value !== "object") {
    return undefined
  }
  const record = value as Record<string, unknown>
  const status = normalizeOptionalString(record.status)
  const maxFrameAgeMs =
    typeof record.maxFrameAgeMs === "number" && Number.isFinite(record.maxFrameAgeMs)
      ? Math.max(0, Math.round(record.maxFrameAgeMs))
      : 12_000

  if (status === "attached") {
    const frameRecord =
      record.frame && typeof record.frame === "object"
        ? (record.frame as Record<string, unknown>)
        : null
    const storageUrl = normalizeOptionalString(frameRecord?.storageUrl)
    const mimeType = normalizeOptionalString(frameRecord?.mimeType)?.toLowerCase()
    const sizeBytesRaw = frameRecord?.sizeBytes
    const sizeBytes =
      typeof sizeBytesRaw === "number" && Number.isFinite(sizeBytesRaw)
        ? Math.max(0, Math.round(sizeBytesRaw))
        : 0
    if (!storageUrl || !mimeType || !mimeType.startsWith("image/") || sizeBytes <= 0) {
      return undefined
    }
    const capturedAt =
      typeof frameRecord?.capturedAt === "number" && Number.isFinite(frameRecord.capturedAt)
        ? Math.floor(frameRecord.capturedAt)
        : undefined
    const retentionId = normalizeOptionalString(frameRecord?.retentionId)
    return {
      status: "attached",
      maxFrameAgeMs,
      frame: {
        storageUrl,
        mimeType,
        sizeBytes,
        capturedAt,
        retentionId: retentionId || undefined,
      },
    }
  }

  if (status === "degraded") {
    const reason = normalizeOptionalString(record.reason)
    if (
      reason !== "vision_frame_missing"
      && reason !== "vision_frame_stale"
      && reason !== "vision_policy_blocked"
    ) {
      return undefined
    }
    const freshestCandidateCapturedAt =
      typeof record.freshestCandidateCapturedAt === "number"
      && Number.isFinite(record.freshestCandidateCapturedAt)
        ? Math.floor(record.freshestCandidateCapturedAt)
        : undefined
    const freshestCandidateAgeMs =
      typeof record.freshestCandidateAgeMs === "number"
      && Number.isFinite(record.freshestCandidateAgeMs)
        ? Math.max(0, Math.round(record.freshestCandidateAgeMs))
        : undefined
    return {
      status: "degraded",
      maxFrameAgeMs,
      reason,
      freshestCandidateCapturedAt,
      freshestCandidateAgeMs,
    }
  }

  return undefined
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

function formatCameraDiagnosticReason(reason: string | null | undefined): string | null {
  const normalizedReason = normalizeDesktopCameraFallbackReason(reason)
  if (!normalizedReason) {
    return null
  }
  const normalized = normalizedReason
  if (normalized.includes("NotAllowedError") || normalized.includes("permission")) {
    return "Camera permission denied"
  }
  if (normalized.includes("camera_preview_timeout")) {
    return "Preview did not become ready in time"
  }
  if (normalized.includes("camera_getusermedia_unavailable")) {
    return "Camera APIs are unavailable on this device"
  }
  if (normalized.includes("device_unavailable")) {
    return "Camera device is unavailable"
  }
  return normalized
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
  onConversationStageVisibilityChange?: (visible: boolean) => void
}

export function SlickChatInput({
  visualMode,
  collaborationContext,
  selectedSurface,
  onConversationStageVisibilityChange,
}: SlickChatInputProps) {
  const [message, setMessage] = useState("")
  const [voiceCaptureState, setVoiceCaptureState] = useState<VoiceCaptureState>("idle")
  const [voiceCaptureError, setVoiceCaptureError] = useState<string | null>(null)
  const [voiceCaptureSupported, setVoiceCaptureSupported] = useState(false)
  const [isConversationStageOpen, setIsConversationStageOpen] = useState(false)
  const [conversationModeSelection, setConversationModeSelection] =
    useState<ConversationModeSelection>("voice")
  const [conversationEyesSourceSelection, setConversationEyesSourceSelection] =
    useState<ConversationEyesSourceSelection>("webcam")
  const [isStartingConversation, setIsStartingConversation] = useState(false)
  const [isConversationEnding, setIsConversationEnding] = useState(false)
  const [isConversationSessionActive, setIsConversationSessionActive] = useState(false)
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
  const [hasCameraPreviewSignal, setHasCameraPreviewSignal] = useState(false)
  const [liveUserTranscriptDraft, setLiveUserTranscriptDraft] = useState("")
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
  const voiceCaptureControllerRef = useRef<VoiceCaptureController | null>(null)
  const voiceCaptureStateRef = useRef<VoiceCaptureState>("idle")
  const voiceStreamRef = useRef<MediaStream | null>(null)
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const lastConversationEventRef = useRef<string>("")
  const activeConversationEyesSourceRef = useRef<ConversationEyesSourceSelection | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const cameraPreviewSignalObservedAtRef = useRef<number | null>(null)
  const cameraPreviewRecoveryInFlightRef = useRef(false)
  const cameraPreviewRecoveryAttemptsRef = useRef(0)
  const conversationSessionActiveRef = useRef(false)
  const conversationStartingRef = useRef(false)
  const conversationMicMutedRef = useRef(false)
  const conversationEndingRef = useRef(false)
  const conversationStartedAtRef = useRef<number>(0)
  const conversationEndInFlightRef = useRef(false)
  const isSendingRef = useRef(false)
  const activeRealtimeTransportRouteRef =
    useRef<VoiceRealtimeTransportRoute>(INITIAL_REALTIME_TRANSPORT_ROUTE)
  const activeRealtimeLiveSessionIdRef = useRef<string | null>(null)
  const activeRealtimeVoiceSessionIdRef = useRef<string | null>(null)
  const activeRealtimeInterviewSessionIdRef = useRef<string | null>(null)
  const realtimeVisionPacketSequenceRef = useRef(0)
  const lastRealtimeVisionForwardAtMsRef = useRef<number | undefined>(undefined)
  const realtimeVisionForwardInFlightRef = useRef(false)
  const conversationInterruptCountRef = useRef(0)
  const activeVoiceSessionIdRef = useRef<string | null>(null)
  const resolvedVoiceRuntimeSessionRef =
    useRef<AIChatVoiceRuntimeSessionResolution | null>(null)
  const currentConversationIdRef = useRef<Id<"aiConversations"> | undefined>(undefined)
  const lastSpokenAssistantMessageRef = useRef<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const voiceRuntimeRef = useRef<ReturnType<typeof useVoiceRuntime> | null>(null)
  const setVoiceCaptureStateSafe = useCallback((nextState: VoiceCaptureState) => {
    voiceCaptureStateRef.current = nextState
    setVoiceCaptureState(nextState)
  }, [])
  const useQueryUntyped = useQuery as (query: unknown, args?: unknown) => unknown
  const useActionUntyped = useAction as (action: unknown) => unknown
  const useMutationUntyped = useMutation as (mutation: unknown) => unknown
  const platformModelsByProvider = useQueryUntyped(
    api.ai.platformModels.getEnabledModelsByProvider
  ) as Record<string, PlatformModelRecord[]> | undefined
  const fetchUrlContent = useActionUntyped(api.ai.webReader.fetchUrlContent) as (args: {
    url: string
  }) => Promise<UrlFetchResult>
  const ingestVideoFrameEnvelopeAction = useActionUntyped(
    api.ai.voiceRuntime.ingestVideoFrameEnvelope
  ) as (args: {
    sessionId: string
    interviewSessionId: Id<"agentSessions">
    envelope: Record<string, unknown>
    maxFramesPerWindow?: number
    windowMs?: number
  }) => Promise<{
    ordering?: {
      decision?: "accepted" | "duplicate_replay" | "gap_detected" | "rate_limited"
    }
    rateControl?: {
      retryAfterMs?: number
    }
  }>
  const resolveFreshestVisionFrameForVoiceTurnAction = useActionUntyped(
    api.ai.voiceRuntime.resolveFreshestVisionFrameForVoiceTurn
  ) as (args: {
    sessionId: string
    interviewSessionId: Id<"agentSessions">
    conversationId: Id<"aiConversations">
    liveSessionId?: string
  }) => Promise<VoiceTurnVisionFrameResolution | Record<string, unknown>>
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
    activeLayerWorkflowId,
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
  const userVoicePreferences = useQuery(
    api.userPreferences.get,
    sessionId ? { sessionId } : "skip"
  ) as
    | {
        voiceRuntimeVoiceId?: unknown
      }
    | null
    | undefined
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
  const preferredRequestedVoiceId = useMemo(
    () => normalizeOptionalString(userVoicePreferences?.voiceRuntimeVoiceId) ?? undefined,
    [userVoicePreferences?.voiceRuntimeVoiceId]
  )
  const preferredRequestedVoiceSource = useMemo<
    "user_preference" | "preferences_loading" | "backend_resolution"
  >(() => {
    if (preferredRequestedVoiceId) {
      return "user_preference"
    }
    if (userVoicePreferences === undefined) {
      return "preferences_loading"
    }
    return "backend_resolution"
  }, [preferredRequestedVoiceId, userVoicePreferences])
  const conversationAgentName = useMemo(
    () => normalizeOptionalString(resolvedVoiceRuntimeSession?.agentDisplayName) || "Operator",
    [resolvedVoiceRuntimeSession?.agentDisplayName]
  )

  useEffect(() => {
    activeVoiceSessionIdRef.current = activeVoiceSessionId
  }, [activeVoiceSessionId])

  useEffect(() => {
    currentConversationIdRef.current = currentConversationId
  }, [currentConversationId])

  useEffect(() => {
    resolvedVoiceRuntimeSessionRef.current = resolvedVoiceRuntimeSession
  }, [resolvedVoiceRuntimeSession])

  useEffect(() => {
    sessionIdRef.current = sessionId ?? null
  }, [sessionId])

  useEffect(() => {
    voiceRuntimeRef.current = voiceRuntime
  }, [voiceRuntime])

  useEffect(() => {
    isSendingRef.current = isSending
  }, [isSending])

  useEffect(() => {
    voiceCaptureStateRef.current = voiceCaptureState
  }, [voiceCaptureState])

  useEffect(() => {
    conversationSessionActiveRef.current = isConversationSessionActive
  }, [isConversationSessionActive])

  useEffect(() => {
    conversationStartingRef.current = isStartingConversation
  }, [isStartingConversation])

  useEffect(() => {
    conversationMicMutedRef.current = isConversationMicMuted
  }, [isConversationMicMuted])

  useEffect(() => {
    conversationEndingRef.current = isConversationEnding
  }, [isConversationEnding])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [message])

  useEffect(() => {
    setVoiceCaptureSupported(supportsAnyVoiceCapture())
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
    return () => {
      const activeVoiceSessionId = activeVoiceSessionIdRef.current
      const resolvedVoiceRuntimeSession = resolvedVoiceRuntimeSessionRef.current
      const sessionId = sessionIdRef.current
      if (activeVoiceSessionId && resolvedVoiceRuntimeSession && sessionId) {
        void voiceRuntimeRef.current?.closeSession({
          voiceSessionId: activeVoiceSessionId,
          reason: "chat_unmount_cleanup",
          runtimeContext: {
            authSessionId: sessionId,
            interviewSessionId: resolvedVoiceRuntimeSession.agentSessionId,
          },
        }).catch(() => {})
      }
      voiceCaptureControllerRef.current?.cancel()
      voiceCaptureControllerRef.current = null
      voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
      voiceStreamRef.current = null
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
      activeRealtimeLiveSessionIdRef.current = null
      activeRealtimeVoiceSessionIdRef.current = null
      activeRealtimeInterviewSessionIdRef.current = null
      realtimeVisionPacketSequenceRef.current = 0
      lastRealtimeVisionForwardAtMsRef.current = undefined
      conversationInterruptCountRef.current = 0
    }
  }, [])

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
    lastSpokenAssistantMessageRef.current = null
  }, [currentConversationId])

  useEffect(() => {
    const shouldPreserveConversationUi =
      conversationStartingRef.current
      || conversationSessionActiveRef.current
      || conversationEndingRef.current
      || isConversationStageOpen
      || Boolean(voiceCaptureControllerRef.current)
    if (shouldPreserveConversationUi) {
      return
    }
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
    voiceCaptureControllerRef.current?.cancel()
    voiceCaptureControllerRef.current = null
    releaseVoiceMediaStream()
    releaseCameraStream()
    setVoiceCaptureStateSafe("idle")
    setVoiceCaptureError(null)
    setPendingVoiceRuntime(null)
    setResolvedVoiceRuntimeSession(null)
    setActiveVoiceSessionId(null)
    setIsConversationStageOpen(false)
    setIsConversationSessionActive(false)
    setCameraLiveSession(null)
    setCameraVisionError(null)
    setIsConversationMicMuted(false)
    setIsConversationEnding(false)
    setLiveUserTranscriptDraft("")
    setConversationState("idle")
    setConversationReasonCode(undefined)
    activeRealtimeLiveSessionIdRef.current = null
    activeRealtimeVoiceSessionIdRef.current = null
    activeRealtimeInterviewSessionIdRef.current = null
    activeRealtimeTransportRouteRef.current = INITIAL_REALTIME_TRANSPORT_ROUTE
    realtimeVisionPacketSequenceRef.current = 0
    lastRealtimeVisionForwardAtMsRef.current = undefined
    conversationInterruptCountRef.current = 0
    conversationStartedAtRef.current = 0
    conversationEndInFlightRef.current = false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationId])

  useEffect(() => {
    if (selectedSurface.kind !== "dm") {
      setDmSyncSummaryDraft("")
    }
  }, [selectedSurface.kind])

  const releaseVoiceMediaStream = () => {
    voiceCaptureControllerRef.current?.cancel()
    voiceCaptureControllerRef.current = null
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
    voiceStreamRef.current = null
    activeRealtimeLiveSessionIdRef.current = null
    activeRealtimeVoiceSessionIdRef.current = null
    activeRealtimeInterviewSessionIdRef.current = null
    activeRealtimeTransportRouteRef.current = INITIAL_REALTIME_TRANSPORT_ROUTE
  }

  const setCameraPreviewSignal = (nextSignal: boolean) => {
    if (nextSignal) {
      cameraPreviewSignalObservedAtRef.current = Date.now()
    }
    setHasCameraPreviewSignal(nextSignal)
  }

  const waitForCameraPreviewSignal = async (
    video: HTMLVideoElement,
    timeoutMs: number
  ): Promise<boolean> => {
    if (
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      && video.videoWidth > 0
      && video.videoHeight > 0
    ) {
      setCameraPreviewSignal(true)
      return true
    }

    return await new Promise<boolean>((resolve) => {
      let settled = false
      let readinessPollId: number | undefined
      const finish = (ready: boolean) => {
        if (settled) {
          return
        }
        settled = true
        window.clearTimeout(timeoutId)
        if (typeof readinessPollId === "number") {
          window.clearInterval(readinessPollId)
        }
        video.removeEventListener("loadeddata", handleReady)
        video.removeEventListener("loadedmetadata", handleReady)
        video.removeEventListener("canplay", handleReady)
        video.removeEventListener("playing", handleReady)
        video.removeEventListener("resize", handleReady)
        resolve(ready)
      }
      const handleReady = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setCameraPreviewSignal(true)
          finish(true)
        }
      }
      const timeoutId = window.setTimeout(() => finish(false), Math.max(400, timeoutMs))
      readinessPollId = window.setInterval(() => {
        if (video.videoWidth > 0 && video.videoHeight > 0 && !video.paused) {
          setCameraPreviewSignal(true)
          finish(true)
        }
      }, 120)
      video.addEventListener("loadeddata", handleReady)
      video.addEventListener("loadedmetadata", handleReady)
      video.addEventListener("canplay", handleReady)
      video.addEventListener("playing", handleReady)
      video.addEventListener("resize", handleReady)
    })
  }

  const waitForCameraPreviewElement = async (
    timeoutMs: number
  ): Promise<HTMLVideoElement | null> => {
    const immediate = cameraVideoRef.current
    if (immediate) {
      return immediate
    }
    return await new Promise<HTMLVideoElement | null>((resolve) => {
      let settled = false
      const finish = (video: HTMLVideoElement | null) => {
        if (settled) {
          return
        }
        settled = true
        window.clearTimeout(timeoutId)
        window.clearInterval(pollId)
        resolve(video)
      }
      const timeoutId = window.setTimeout(
        () => finish(null),
        Math.max(300, timeoutMs)
      )
      const pollId = window.setInterval(() => {
        if (cameraVideoRef.current) {
          finish(cameraVideoRef.current)
        }
      }, 80)
    })
  }

  const hasHealthyLiveVideoTrack = (stream: MediaStream): boolean =>
    stream.getVideoTracks().some((track) => track.readyState === "live")

  const attachVisionStreamToPreview = async (
    stream: MediaStream,
    timeoutMs: number
  ): Promise<boolean> => {
    const video = await waitForCameraPreviewElement(Math.min(timeoutMs, 2200))
    if (!video) {
      return false
    }

    setCameraPreviewSignal(false)
    if (video.srcObject !== stream) {
      video.srcObject = stream
    }
    await video.play().catch(() => {})
    return await waitForCameraPreviewSignal(video, timeoutMs)
  }

  const resolveVisionStreamConstraintCandidates = (): Array<MediaStreamConstraints["video"]> => ([
    {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    {
      facingMode: { ideal: "user" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    {
      width: { ideal: 960 },
      height: { ideal: 540 },
    },
    true,
  ])

  const releaseCameraStream = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
    setCameraPreviewSignal(false)
    cameraPreviewSignalObservedAtRef.current = null
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null
    }
  }

  const stopVisionStream = (reason: string = "operator_stop") => {
    releaseCameraStream()
    cameraPreviewRecoveryAttemptsRef.current = 0
    cameraPreviewRecoveryInFlightRef.current = false
    if (isIntentionalDesktopVisionStopReason(reason)) {
      setCameraVisionError(null)
    }
    if (reason !== "capture_backpressure") {
      lastRealtimeVisionForwardAtMsRef.current = undefined
    }
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
    if (conversationModeSelection === "voice") {
      return
    }
    const reasonCode = mapConversationCapabilityReasonCode(reason)
    stopVisionStream("conversation_source_drop")
    const transition = resolveDesktopConversationModeTransition({
      currentMode: conversationModeSelection,
      nextMode: "voice",
      currentEyesSource: conversationEyesSourceSelection,
    })
    setConversationModeSelection(transition.mode)
    setConversationEyesSourceSelection(transition.eyesSource)
    setConversationReasonCode(reasonCode)
    setCameraVisionError(reason)
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
    const liveSessionId =
      activeRealtimeLiveSessionIdRef.current
      || pendingVoiceRuntime?.liveSessionId
      || cameraLiveSession?.liveSessionId
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
    const eventKey = `${envelope.eventType}:${envelope.state}:${envelope.reasonCode || "none"}:${envelope.liveSessionId || "none"}`
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
      const recoveredPreview = await attachVisionStreamToPreview(
        cameraStreamRef.current,
        CAMERA_PREVIEW_SIGNAL_TIMEOUT_MS
      )
      if (recoveredPreview) {
        setCameraVisionError(null)
        setCameraLiveSession((current) =>
          current
            ? {
                ...current,
                sessionState: "capturing",
                stoppedAt: undefined,
                stopReason: undefined,
                fallbackReason: undefined,
              }
            : current
        )
        return true
      }
      if (hasHealthyLiveVideoTrack(cameraStreamRef.current)) {
        setCameraVisionError(null)
        setCameraLiveSession((current) =>
          current
            ? {
                ...current,
                sessionState: "capturing",
                stoppedAt: undefined,
                stopReason: undefined,
                fallbackReason: "camera_preview_timeout",
              }
            : current
        )
        void recoverCameraPreview()
        return true
      }
      releaseCameraStream()
    }
    setCameraPreviewSignal(false)

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

    let lastFailureReason = "camera_permission_denied"
    const streamCandidates = resolveVisionStreamConstraintCandidates()
    for (const candidate of streamCandidates) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: candidate })
        stream.getVideoTracks().forEach((track) => {
          track.addEventListener("ended", () => {
            releaseCameraStream()
            setCameraVisionError((current) => current || "device_unavailable")
            setCameraLiveSession((current) =>
              current
                ? {
                    ...current,
                    sessionState: "stopped",
                    stoppedAt: Date.now(),
                    stopReason: "device_unavailable",
                    fallbackReason: "device_unavailable",
                  }
                : current
            )
          }, { once: true })
        })

        cameraStreamRef.current = stream
        const previewReady = await attachVisionStreamToPreview(
          stream,
          CAMERA_PREVIEW_SIGNAL_TIMEOUT_MS
        )
        if (!previewReady) {
          if (hasHealthyLiveVideoTrack(stream)) {
            setCameraVisionError(null)
            cameraPreviewRecoveryAttemptsRef.current = 0
            setCameraLiveSession((current) => ({
              liveSessionId: current?.liveSessionId || buildRuntimeSessionId("camera"),
              provider: "browser_getusermedia",
              startedAt: current?.startedAt || Date.now(),
              frameCaptureCount: current?.frameCaptureCount || 0,
              sessionState: "capturing",
              stoppedAt: undefined,
              stopReason: undefined,
              fallbackReason: "camera_preview_timeout",
              frameCadenceMs: current?.frameCadenceMs,
              frameCadenceFps: current?.frameCadenceFps,
              lastFrameCapturedAt: current?.lastFrameCapturedAt,
            }))
            window.setTimeout(() => {
              if (cameraStreamRef.current === stream) {
                void recoverCameraPreview()
              }
            }, 0)
            return true
          }
          lastFailureReason = "camera_preview_timeout"
          stream.getTracks().forEach((track) => track.stop())
          if (cameraStreamRef.current === stream) {
            cameraStreamRef.current = null
          }
          continue
        }

        setCameraVisionError(null)
        cameraPreviewRecoveryAttemptsRef.current = 0
        setCameraLiveSession((current) => ({
          liveSessionId: current?.liveSessionId || buildRuntimeSessionId("camera"),
          provider: "browser_getusermedia",
          startedAt: current?.startedAt || Date.now(),
          frameCaptureCount: current?.frameCaptureCount || 0,
          sessionState: "capturing",
          stoppedAt: undefined,
          stopReason: undefined,
          fallbackReason: undefined,
          frameCadenceMs: current?.frameCadenceMs,
          frameCadenceFps: current?.frameCadenceFps,
          lastFrameCapturedAt: current?.lastFrameCapturedAt,
        }))
        return true
      } catch (error) {
        lastFailureReason =
          error instanceof Error && error.message.trim().length > 0
            ? error.message.trim()
            : "camera_permission_denied"
      }
    }

    setCameraVisionError(lastFailureReason)
    setCameraLiveSession((current) => ({
      liveSessionId: current?.liveSessionId || buildRuntimeSessionId("camera"),
      provider: current?.provider || "browser_getusermedia",
      startedAt: current?.startedAt || Date.now(),
      stoppedAt: Date.now(),
      stopReason: "camera_start_failed",
      frameCaptureCount: current?.frameCaptureCount || 0,
      sessionState: "error",
      fallbackReason: lastFailureReason,
      frameCadenceMs: current?.frameCadenceMs,
      frameCadenceFps: current?.frameCadenceFps,
      lastFrameCapturedAt: current?.lastFrameCapturedAt,
    }))
    notification.error(
      "Vision Stream Failed",
      "Unable to start a reliable camera preview. Check camera permissions and retry."
    )
    return false
  }

  const recoverCameraPreview = async (): Promise<boolean> => {
    if (!cameraStreamRef.current) {
      return false
    }

    const recoveredByReplay = await attachVisionStreamToPreview(
      cameraStreamRef.current,
      1400
    )
    if (recoveredByReplay) {
      setCameraVisionError(null)
      setCameraLiveSession((current) =>
        current
          ? {
              ...current,
              sessionState: "capturing",
              fallbackReason: undefined,
            }
          : current
      )
      return true
    }

    if (cameraPreviewRecoveryAttemptsRef.current >= CAMERA_PREVIEW_RECOVERY_RETRY_LIMIT) {
      setCameraVisionError((current) => current || "camera_preview_timeout")
      return false
    }

    cameraPreviewRecoveryAttemptsRef.current += 1
    releaseCameraStream()
    return await startVisionStream()
  }

  const captureJpegFrameForRealtimeTransport = async (): Promise<{
    frameBlob: Blob
    width: number
    height: number
  } | null> => {
    const video = cameraVideoRef.current
    if (!video || !cameraStreamRef.current) {
      return null
    }
    const sourceWidth = Math.max(1, video.videoWidth || 1280)
    const sourceHeight = Math.max(1, video.videoHeight || 720)
    const { width, height } = resolveJpegFrameSize({
      width: sourceWidth,
      height: sourceHeight,
    })
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) {
      return null
    }
    context.drawImage(video, 0, 0, width, height)
    const frameBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", VISION_FORWARDING_JPEG_QUALITY)
    })
    if (!frameBlob) {
      return null
    }
    return {
      frameBlob,
      width,
      height,
    }
  }

  const forwardVisionFrameToRealtimeTransport = async (args?: {
    force?: boolean
    source?: "interval" | "manual_capture"
  }) => {
    if (
      !sessionId
      || !resolvedVoiceRuntimeSession
      || !activeVoiceSessionId
      || !cameraStreamRef.current
    ) {
      return
    }
    const liveSessionId =
      activeRealtimeLiveSessionIdRef.current
      || cameraLiveSession?.liveSessionId
      || pendingVoiceRuntime?.liveSessionId
    if (!liveSessionId) {
      return
    }

    const forwardSource = args?.source || "interval"
    const nowMs = Date.now()
    const throttle = shouldThrottleRealtimeVisionForwarding({
      nowMs,
      lastForwardAtMs: lastRealtimeVisionForwardAtMsRef.current,
      cadenceMs: VISION_FORWARDING_CADENCE_MS,
    })
    if (throttle.throttled && !args?.force && forwardSource !== "manual_capture") {
      setCameraLiveSession((current) =>
        current
          ? {
              ...current,
              sessionState: "capturing",
              fallbackReason:
                normalizeDesktopCameraFallbackReason(current.fallbackReason) ?? undefined,
              frameCadenceMs: throttle.cadenceMs,
            }
          : current
      )
      return
    }

    const captureResult = await captureJpegFrameForRealtimeTransport()
    if (!captureResult) {
      return
    }

    const framePayloadBase64 = bytesToBase64(
      new Uint8Array(await captureResult.frameBlob.arrayBuffer())
    )
    const packetSequence = realtimeVisionPacketSequenceRef.current
    realtimeVisionPacketSequenceRef.current += 1

    const activeRoute = activeRealtimeTransportRouteRef.current
    const transportMode = resolveDuplexTransportModeFromRoute(activeRoute)
    const frameRate = Number((1000 / throttle.cadenceMs).toFixed(2))
    const fallbackReason =
      activeRoute === "webrtc_fallback" ? "network_degraded" : "none"
    const videoSessionId = buildRealtimeVideoSessionId(liveSessionId)

    const envelope = {
      contractVersion: "avr_media_session_ingress_v1",
      liveSessionId,
      ingressTimestampMs: nowMs,
      cameraRuntime: {
        provider: "browser_getusermedia",
        sourceClass: "webcam",
        sourceId: conversationEyesSourceSelection,
        frameTimestampMs: nowMs,
        sequence: packetSequence,
        transport: transportMode,
        frameRate,
        resolution: {
          width: captureResult.width,
          height: captureResult.height,
        },
      },
      voiceRuntime: {
        voiceSessionId: activeVoiceSessionId,
        requestedProviderId: "elevenlabs",
        providerId: "elevenlabs",
        mimeType: "audio/L16;rate=24000;channels=1",
        language: voiceInputLanguage,
        sampleRateHz: 24_000,
        packetSequence,
        packetTimestampMs: nowMs,
      },
      videoRuntime: {
        videoSessionId,
        requestedProviderId: "browser_getusermedia",
        providerId: "browser_getusermedia",
        mimeType: "image/jpeg",
        codec: "jpeg",
        frameRate,
        width: captureResult.width,
        height: captureResult.height,
        packetSequence,
        packetTimestampMs: nowMs,
        framePayloadBase64,
      },
      captureRuntime: {
        sourceClass: "webcam",
        sourceId: conversationEyesSourceSelection,
        captureMode: "stream",
        captureTimestampMs: nowMs,
        frameTimestampMs: nowMs,
        sequence: packetSequence,
        frameRate,
        resolution: {
          width: captureResult.width,
          height: captureResult.height,
        },
        diagnostics: {
          captureToIngressLatencyMs: 0,
        },
      },
      transportRuntime: {
        mode: "realtime",
        fallbackReason,
        ingressTimestampMs: nowMs,
        transportId: activeVoiceSessionId,
        protocol: transportMode,
        diagnostics: {
          reconnectCount: activeRoute === "webrtc_fallback" ? 1 : 0,
          fallbackTransitionCount: activeRoute === "webrtc_fallback" ? 1 : 0,
        },
      },
      authority: resolveRealtimeMediaSessionAuthorityInvariant(),
    }

    try {
      const ingestResult = await ingestVideoFrameEnvelopeAction({
        sessionId,
        interviewSessionId: resolvedVoiceRuntimeSession.agentSessionId,
        envelope,
        maxFramesPerWindow: VISION_FORWARDING_MAX_FRAMES_PER_WINDOW,
        windowMs: VISION_FORWARDING_WINDOW_MS,
      })
      const decision = ingestResult.ordering?.decision
      if (
        decision === "accepted"
        || decision === "duplicate_replay"
        || typeof decision === "undefined"
      ) {
        lastRealtimeVisionForwardAtMsRef.current = nowMs
      }
      setCameraLiveSession((current) => {
        if (!current) {
          return current
        }
        const frameCaptureCount =
          current.frameCaptureCount
          + (decision === "gap_detected" || decision === "rate_limited" ? 0 : 1)
        const frameCadenceMs = current.lastFrameCapturedAt
          ? Math.max(1, nowMs - current.lastFrameCapturedAt)
          : throttle.cadenceMs
        return {
          ...current,
          sessionState: "capturing",
          frameCaptureCount,
          lastFrameCapturedAt: nowMs,
          frameCadenceMs,
          frameCadenceFps:
            typeof frameCadenceMs === "number"
              ? Number((1000 / frameCadenceMs).toFixed(2))
              : current.frameCadenceFps,
          fallbackReason:
            decision === "rate_limited"
              ? "capture_backpressure"
              : fallbackReason === "none"
                ? undefined
                : fallbackReason,
        }
      })
      if (decision !== "rate_limited") {
        setCameraVisionError(null)
      }
    } catch (error) {
      const transportError =
        error instanceof Error
          ? error.message
          : "vision_frame_transport_failed"
      if (isTransientDesktopCameraBackpressureReason(transportError)) {
        setCameraLiveSession((current) =>
          current
            ? {
                ...current,
                sessionState: "capturing",
                fallbackReason: "capture_backpressure",
              }
            : current
        )
        setCameraVisionError(null)
        return
      }
      setCameraLiveSession((current) =>
        current
          ? {
              ...current,
              sessionState: "error",
              fallbackReason: transportError,
            }
          : current
      )
      setCameraVisionError(transportError)
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
    void forwardVisionFrameToRealtimeTransport({
      force: true,
      source: "manual_capture",
    })
  }

  const resolveVoiceRuntimeSessionContext = async (): Promise<AIChatVoiceRuntimeSessionResolution> => {
    if (!user?.id || !organizationId) {
      throw new Error("Sign in and select an organization before using voice capture.")
    }

    const runtimeConversationId = currentConversationIdRef.current
    const runtimeSession = await chat.resolveVoiceRuntimeSession(runtimeConversationId)
    setResolvedVoiceRuntimeSession(runtimeSession)
    if (
      !runtimeConversationId
      || String(runtimeConversationId) !== String(runtimeSession.conversationId)
    ) {
      setCurrentConversationId(runtimeSession.conversationId)
    }
    return runtimeSession
  }

  const closeVoiceRuntimeSession = (args: {
    voiceSessionId: string
    providerId?: VoiceRuntimeProviderId
    persistentProviderSessionId?: string
    persistentRequestedProviderId?: "gemini_live" | "gemini"
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
      persistentRequestedProviderId: args.persistentRequestedProviderId,
      persistentProviderSessionId: args.persistentProviderSessionId,
      runtimeContext: {
        authSessionId: sessionId,
        interviewSessionId: args.runtimeSession.agentSessionId,
      },
    }).catch(() => {})
    setActiveVoiceSessionId((current) => (current === args.voiceSessionId ? null : current))
  }

  const stopVoiceCapture = () => {
    const controller = voiceCaptureControllerRef.current
    if (!controller) {
      releaseVoiceMediaStream()
      if (voiceCaptureStateRef.current !== "transcribing") {
        setVoiceCaptureStateSafe("idle")
      }
      return
    }

    controller.stop()
  }

  const startVoiceCapture = async (options?: {
    starterGreetingText?: string
    includeStarterGreeting?: boolean
  }) => {
    if (
      voiceCaptureStateRef.current === "listening"
      || voiceCaptureStateRef.current === "transcribing"
      || voiceCaptureControllerRef.current
    ) {
      return
    }
    if (!sessionId) {
      notification.error("Voice Capture Unavailable", "Authentication session missing. Reload and try again.")
      return
    }
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      notification.error(
        "Voice Capture Unavailable",
        "Voice capture requires getUserMedia support on this device."
      )
      return
    }
    if (!supportsAnyVoiceCapture()) {
      notification.error(
        "Voice Capture Unavailable",
        "This browser does not support PCM capture and has no MediaRecorder fallback."
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
          persistentMultimodal?: {
            contractVersion?: string
            mode?: "persistent_realtime_multimodal" | "turn_stitch"
            enabled?: boolean
            featureFlagEnabled?: boolean
            providerId?: string | null
            providerSessionId?: string | null
            fallbackReason?: string | null
          }
        }
      | null = null
    let clearCaptureTimers = () => {}

    try {
      console.info("[VoiceRuntime] web_open_session_outbound_request", {
        requestedProviderId: "elevenlabs",
        requestedVoiceId: preferredRequestedVoiceId ?? null,
        requestedVoiceSource: preferredRequestedVoiceSource,
      })
      openedSession = await voiceRuntime.openSession({
        requestedProviderId: "elevenlabs",
        requestedVoiceId: preferredRequestedVoiceId,
        voiceSessionId: buildRuntimeSessionId("voice"),
        conversationId: runtimeSession.conversationId,
        persistentRequestedProviderId: "gemini_live",
        runtimeContext: {
          authSessionId: sessionId,
          interviewSessionId: runtimeSession.agentSessionId,
        },
      })
      if (!openedSession) {
        throw new Error("voice_runtime_open_session_failed")
      }
      const openedVoiceSession = openedSession
      const sessionRuntimePath = resolveVoiceSessionRuntimePath({
        persistentMultimodal: openedVoiceSession.persistentMultimodal ?? null,
      })
      const liveSessionId = cameraLiveSession?.liveSessionId || buildRuntimeSessionId("voice")
      const baseMessageBeforeVoiceCapture = message.trim()
      const pcmContract = resolveVoicePcmCaptureContract("elevenlabs")
      const liveDuplexSegmentDurationMs = resolveVoiceLiveDuplexSegmentDurationMs("elevenlabs")
      const liveDuplexSegmentSampleCount = Math.max(
        pcmContract.samplesPerFrame,
        Math.round((pcmContract.sampleRateHz * liveDuplexSegmentDurationMs) / 1000)
      )
      const primarySttRoute =
        REALTIME_STT_ROUTE_PRECEDENCE[0] || "scribe_v2_realtime_primary"
      const fallbackSttRoute =
        REALTIME_STT_ROUTE_PRECEDENCE[1] || "gemini_native_audio_failover"
      let realtimeTransportRoute = INITIAL_REALTIME_TRANSPORT_ROUTE
      let realtimeTransportFallbackApplied = false
      let realtimeIngestFailedReason: string | null = null
      let latestRealtimeTranscript: string | null = null
      let finalSegmentHttpTranscribeAttempted = false
      let finalSegmentHttpTranscribeNoSpeech = false
      let queuedFrameCount = 0
      let queuedFrameBytes = 0
      let realtimeFrameQueue: Promise<void> = Promise.resolve()
      let realtimeEnvelopeSequence = 0
      let segmentSequence = 0
      let segmentPendingSamples: number[] = []
      let lastIngestedSegmentResult: SegmentedVoiceFrameIngestResult | null = null
      const transcriptFramesBySequence = new Map<number, string>()
      let transcriptIngestSequence = 0
      let finalFrameFinalizeMutex = false
      let lastFinalizedSegmentSequence: number | null = null
      let pendingFinalFrameState: PendingSegmentFinalFrameState | null = null
      let pendingFinalFrameTimeoutId: number | undefined
      let pendingFinalFramePollId: number | undefined
      let consecutiveSpeechFrames = 0
      let consecutiveSilentFrames = 0
      let captureFrameCounter = 0
      let captureSpeechFrameCounter = 0
      let captureMaxFrameRms = 0
      let captureLastSpeechDetectedAtMs: number | null = null
      let captureControllerStartedAtMs = Date.now()
      let hasDetectedSpeechSinceCaptureStart = false
      let firstSpeechDetectedAtMs: number | null = null
      let captureStopQueuedFromEndpoint = false
      let captureHeartbeatTimerId: number | undefined
      let captureForcedStopTimerId: number | undefined
      let pcmNoFrameFallbackTimerId: number | undefined
      let interruptionIssuedWhileSending = false
      let bargeInCount = 0
      let assistantPlaybackQueueInterruptCount = 0
      let assistantPlaybackQueueInterrupted = false
      let assistantPlaybackQueueLastInterruptAtMs: number | undefined
      let noFrameFallbackInFlight = false
      let echoCancellationSelection = resolveRealtimeEchoCancellationSelection({
        hardwareAecSupported: resolveHardwareAecSupport(),
        hardwareAecEnabled: false,
        forceMuteDuringTts: isConversationMicMuted,
      })

      activeRealtimeLiveSessionIdRef.current = liveSessionId
      activeRealtimeVoiceSessionIdRef.current = openedVoiceSession.voiceSessionId
      activeRealtimeInterviewSessionIdRef.current = String(runtimeSession.agentSessionId)
      activeRealtimeTransportRouteRef.current = realtimeTransportRoute
      realtimeVisionPacketSequenceRef.current = 0
      lastRealtimeVisionForwardAtMsRef.current = undefined
      conversationInterruptCountRef.current = 0

      clearCaptureTimers = () => {
        if (typeof captureHeartbeatTimerId === "number") {
          window.clearInterval(captureHeartbeatTimerId)
          captureHeartbeatTimerId = undefined
        }
        if (typeof captureForcedStopTimerId === "number") {
          window.clearTimeout(captureForcedStopTimerId)
          captureForcedStopTimerId = undefined
        }
        if (typeof pcmNoFrameFallbackTimerId === "number") {
          window.clearTimeout(pcmNoFrameFallbackTimerId)
          pcmNoFrameFallbackTimerId = undefined
        }
        if (typeof pendingFinalFrameTimeoutId === "number") {
          window.clearTimeout(pendingFinalFrameTimeoutId)
          pendingFinalFrameTimeoutId = undefined
        }
        if (typeof pendingFinalFramePollId === "number") {
          window.clearInterval(pendingFinalFramePollId)
          pendingFinalFramePollId = undefined
        }
      }

      const scheduleCaptureTimers = (
        activeControllerRef: () => VoiceCaptureController | null
      ) => {
        clearCaptureTimers()
        captureHeartbeatTimerId = window.setInterval(() => {
          const isActiveCaptureSession =
            activeRealtimeLiveSessionIdRef.current === liveSessionId
            && activeRealtimeVoiceSessionIdRef.current === openedVoiceSession.voiceSessionId
          if (!isActiveCaptureSession) {
            clearCaptureTimers()
            return
          }
          console.info("[VoiceRuntime] web_audio_capture_heartbeat", {
            liveSessionId,
            voiceSessionId: openedVoiceSession.voiceSessionId,
            frameCount: captureFrameCounter,
            speechFrameCount: captureSpeechFrameCounter,
            hasDetectedSpeechSinceCaptureStart,
            maxFrameRms: Number(captureMaxFrameRms.toFixed(5)),
            lastSpeechDetectedAtMs: captureLastSpeechDetectedAtMs,
            endpointQueued: captureStopQueuedFromEndpoint,
          })
          const activeController = activeControllerRef()
          const shouldWatchdogNoFrameFallback =
            activeController?.method !== "media_recorder_fallback"
            && captureFrameCounter === 0
            && Date.now() - captureControllerStartedAtMs
              >= PCM_NO_FRAME_HEARTBEAT_WATCHDOG_MS
          if (
            shouldWatchdogNoFrameFallback
            && !noFrameFallbackInFlight
          ) {
            noFrameFallbackInFlight = true
            void (async () => {
              try {
                if (activeController) {
                  const fallbackController = await attemptNoFrameFallback(
                    activeController,
                    "heartbeat_watchdog"
                  )
                  if (fallbackController) {
                    captureControllerStartedAtMs = Date.now()
                  }
                }
              } catch (fallbackError) {
                handleCaptureError(fallbackError)
              } finally {
                noFrameFallbackInFlight = false
              }
            })()
          }
        }, CONVERSATION_CAPTURE_HEARTBEAT_LOG_MS)
        if (conversationSessionActiveRef.current && !isSendingRef.current) {
          captureForcedStopTimerId = window.setTimeout(() => {
            if (captureStopQueuedFromEndpoint) {
              return
            }
            if (!activeControllerRef()) {
              return
            }
            if (!hasDetectedSpeechSinceCaptureStart) {
              return
            }
            captureStopQueuedFromEndpoint = true
            console.info("[VoiceRuntime] web_audio_capture_forced_turn_stop", {
              liveSessionId,
              voiceSessionId: openedVoiceSession.voiceSessionId,
              maxCaptureMs: CONVERSATION_TURN_MAX_CAPTURE_MS,
              frameCount: captureFrameCounter,
              speechFrameCount: captureSpeechFrameCounter,
              hasDetectedSpeechSinceCaptureStart,
              maxFrameRms: Number(captureMaxFrameRms.toFixed(5)),
            })
            try {
              activeControllerRef()?.stop()
            } catch {
              // Forced stop is best-effort.
            }
          }, CONVERSATION_TURN_MAX_CAPTURE_MS)
        }
      }

      const nextRealtimeEnvelopeSequence = () => {
        const sequence = realtimeEnvelopeSequence
        realtimeEnvelopeSequence += 1
        return sequence
      }

      const applyTranscriptToComposer = (transcript: string) => {
        const normalizedTranscript = transcript.trim()
        if (!normalizedTranscript) {
          return
        }
        setLiveUserTranscriptDraft(normalizedTranscript)
        setMessage(
          baseMessageBeforeVoiceCapture.length > 0
            ? `${baseMessageBeforeVoiceCapture} ${normalizedTranscript}`
            : normalizedTranscript,
        )
      }

      const buildAssistantPlaybackQueueSnapshot = () => ({
        queuePolicy: ASSISTANT_PLAYBACK_QUEUE_POLICY,
        queueDepth: isSendingRef.current ? 1 : 0,
        interrupted: assistantPlaybackQueueInterrupted,
        interruptCount: assistantPlaybackQueueInterruptCount,
        interruptSource: assistantPlaybackQueueInterrupted
          ? "client_vad_barge_in"
          : undefined,
        lastInterruptAtMs: assistantPlaybackQueueLastInterruptAtMs,
      })

      const buildEchoCancellationTelemetry = () => ({
        echoCancellationStrategy: echoCancellationSelection.strategy,
        echoCancellationReason: echoCancellationSelection.reason,
        echoCancellationHardwareAecSupported:
          echoCancellationSelection.hardwareAecSupported,
        echoCancellationHardwareAecEnabled:
          echoCancellationSelection.hardwareAecEnabled,
        ttsPrimaryRoute: TTS_PRIMARY_ROUTE,
        ttsFallbackRoute: TTS_FALLBACK_ROUTE,
      })

      const buildRealtimeTransportRuntime = (): Record<string, unknown> => {
        const playbackQueueSnapshot = buildAssistantPlaybackQueueSnapshot()
        const echoTelemetry = buildEchoCancellationTelemetry()
        return {
          ...echoTelemetry,
          assistantPlaybackQueuePolicy: playbackQueueSnapshot.queuePolicy,
          assistantPlaybackQueueDepth: playbackQueueSnapshot.queueDepth,
          assistantPlaybackQueueInterrupted: playbackQueueSnapshot.interrupted,
          assistantPlaybackQueueInterruptCount: playbackQueueSnapshot.interruptCount,
          assistantPlaybackQueueInterruptSource: playbackQueueSnapshot.interruptSource,
          assistantPlaybackQueueLastInterruptAtMs: playbackQueueSnapshot.lastInterruptAtMs,
          requestedTransport: "websocket",
          transport: resolveDuplexTransportModeFromRoute(realtimeTransportRoute),
          mode: resolveDuplexTransportModeFromRoute(realtimeTransportRoute),
          fallbackReason: realtimeTransportFallbackApplied
            ? "websocket_primary_failed"
            : "none",
          transportFallbackReason: realtimeTransportFallbackApplied
            ? "websocket_primary_failed"
            : "none",
          realtimeConnected:
            !realtimeTransportFallbackApplied
            && realtimeTransportRoute === "websocket_primary",
          realtimeTransportRoute,
          realtimeTransportRoutePrecedence: REALTIME_TRANSPORT_ROUTE_PRECEDENCE,
          realtimeSttRoutePrecedence: REALTIME_STT_ROUTE_PRECEDENCE,
          realtimeSttPrimaryRoute: primarySttRoute,
          realtimeSttFallbackRoute: fallbackSttRoute,
          duplexPolicy: "persistent_streaming_primary",
          duplexPolicyParity: "segmented_live_duplex",
          segmentedDuplexEnabled: true,
          segmentDurationMs: liveDuplexSegmentDurationMs,
          frameQueuePolicy: "deterministic_serial",
          finalFramePolicy: "pending_guarded_finalize",
          interruptDetectionPolicy: "client_vad_barge_in",
          vadMode: CONVERSATION_VAD_POLICY.mode,
          vadEnergyThresholdRms: CONVERSATION_VAD_POLICY.energyThresholdRms,
          vadMinSpeechFrames: CONVERSATION_VAD_POLICY.minSpeechFrames,
          vadEndpointSilenceMs: CONVERSATION_VAD_POLICY.endpointSilenceMs,
        }
      }

      const mergeRealtimeTranscript = (sequence: number, transcriptText: string) => {
        const merged = mergeTranscriptFrame(transcriptFramesBySequence, sequence, transcriptText)
        if (!merged) {
          return
        }
        latestRealtimeTranscript = merged
        applyTranscriptToComposer(merged)
      }

      const clearTranscriptState = (reason: string) => {
        transcriptFramesBySequence.clear()
        transcriptIngestSequence = 0
        latestRealtimeTranscript = null
        console.info("[VoiceRuntime] segmented_transcript_state_cleared", {
          reason,
          liveSessionId,
          voiceSessionId: openedVoiceSession.voiceSessionId,
        })
      }

      const sendBargeIn = async (route: VoiceRealtimeTransportRoute) => {
        const playbackQueueSnapshot = buildAssistantPlaybackQueueSnapshot()
        const echoTelemetry = buildEchoCancellationTelemetry()
        await voiceRuntime.ingestRealtimeEnvelope({
          voiceSessionId: openedVoiceSession.voiceSessionId,
          conversationId: runtimeSession.conversationId,
          liveSessionId,
          sequence: nextRealtimeEnvelopeSequence(),
          transportRoute: route,
          sttRoute: primarySttRoute,
          requestedProviderId: "elevenlabs",
          eventType: "barge_in",
          voiceRuntime: {
            liveSessionId,
            captureMethod: "pcm_segmented_duplex_streaming",
            segmentDurationMs: liveDuplexSegmentDurationMs,
            frameQueuePolicy: "deterministic_serial",
            finalFramePolicy: "pending_guarded_finalize",
            sttPrimaryRoute: primarySttRoute,
            sttFallbackRoute: fallbackSttRoute,
            assistantPlaybackQueuePolicy: playbackQueueSnapshot.queuePolicy,
            assistantPlaybackQueueDepth: playbackQueueSnapshot.queueDepth,
            assistantPlaybackQueueInterrupted:
              playbackQueueSnapshot.interrupted,
            assistantPlaybackQueueInterruptCount:
              playbackQueueSnapshot.interruptCount,
            interruptDetectionPolicy: "client_vad_barge_in",
            vadMode: CONVERSATION_VAD_POLICY.mode,
            vadEnergyThresholdRms: CONVERSATION_VAD_POLICY.energyThresholdRms,
            vadMinSpeechFrames: CONVERSATION_VAD_POLICY.minSpeechFrames,
            vadEndpointSilenceMs: CONVERSATION_VAD_POLICY.endpointSilenceMs,
            ...echoTelemetry,
          },
          transportRuntime: {
            ...buildRealtimeTransportRuntime(),
            interruptDetected: true,
            bargeInCount,
          },
          avObservability: {
            liveSessionId,
            voiceSessionId: openedVoiceSession.voiceSessionId,
            interviewSessionId: String(runtimeSession.agentSessionId),
            bargeInCount,
            assistantPlaybackQueuePolicy: playbackQueueSnapshot.queuePolicy,
            assistantPlaybackQueueDepth: playbackQueueSnapshot.queueDepth,
            assistantPlaybackQueueInterrupted:
              playbackQueueSnapshot.interrupted,
            assistantPlaybackQueueInterruptCount:
              playbackQueueSnapshot.interruptCount,
            ...echoTelemetry,
          },
          runtimeContext: {
            authSessionId: sessionId,
            interviewSessionId: runtimeSession.agentSessionId,
          },
        })
      }

      const finalizeLiveSegmentFrame = async (args: {
        frameSequence: number
        ingestResult: SegmentedVoiceFrameIngestResult | null
        source: string
        bypassAssistantSpeakingGuard?: boolean
      }): Promise<string | null> => {
        const finalizeGuard = evaluateFinalFrameFinalizeGuard({
          isFinalFrame: true,
          frameSequence: args.frameSequence,
          isAssistantSpeaking:
            args.bypassAssistantSpeakingGuard
              ? false
              : isSendingRef.current,
          finalizeInFlight: finalFrameFinalizeMutex,
          lastFinalizedSequence: lastFinalizedSegmentSequence,
        })
        if (!finalizeGuard.allowFinalize) {
          return null
        }
        finalFrameFinalizeMutex = true
        lastFinalizedSegmentSequence = args.frameSequence
        try {
          const finalizedTranscript = finalizeMergedTranscript({
            transcriptFramesBySequence,
            sequence: args.frameSequence,
            fallbackText: args.ingestResult?.transcriptText || latestRealtimeTranscript,
          })
          clearTranscriptState(`finalize:${args.source}`)
          if (!finalizedTranscript) {
            return null
          }
          latestRealtimeTranscript = finalizedTranscript
          applyTranscriptToComposer(finalizedTranscript)
          console.info("[VoiceRuntime] segmented_final_frame_finalized", {
            source: args.source,
            sequence: args.frameSequence,
            transcriptLength: finalizedTranscript.length,
          })
          return finalizedTranscript
        } finally {
          finalFrameFinalizeMutex = false
        }
      }

      const flushPendingFinalFrame = async (
        trigger: "assistant_cleared" | "timeout",
        expectedSequence?: number
      ): Promise<string | null> => {
        if (
          Number.isFinite(expectedSequence)
          && pendingFinalFrameState
          && pendingFinalFrameState.sequence !== Number(expectedSequence)
        ) {
          return null
        }
        const release = evaluatePendingFinalFrameRelease({
          pendingFinalFrame: pendingFinalFrameState,
          nowMs: Date.now(),
          isAssistantSpeaking: isSendingRef.current,
          turnState: isSendingRef.current ? "agent_speaking" : "idle",
        })
        if (!release.allowFinalize) {
          return null
        }
        if (trigger === "assistant_cleared" && release.reason !== "assistant_cleared") {
          return null
        }
        if (trigger === "timeout" && release.reason !== "timeout") {
          return null
        }
        const pending = pendingFinalFrameState
        pendingFinalFrameState = null
        if (typeof pendingFinalFrameTimeoutId === "number") {
          window.clearTimeout(pendingFinalFrameTimeoutId)
          pendingFinalFrameTimeoutId = undefined
        }
        if (typeof pendingFinalFramePollId === "number") {
          window.clearInterval(pendingFinalFramePollId)
          pendingFinalFramePollId = undefined
        }
        if (!pending) {
          return null
        }
        return await finalizeLiveSegmentFrame({
          frameSequence: pending.sequence,
          ingestResult: pending.ingestResult,
          source: `pending_${release.reason}`,
          bypassAssistantSpeakingGuard: release.reason === "timeout",
        })
      }

      const queuePendingSegmentFinalization = async (args: {
        sequence: number
        ingestResult: SegmentedVoiceFrameIngestResult | null
      }) => {
        const pendingQueueDecision = resolvePendingFinalFrameQueueDecision({
          pendingFinalFrame: pendingFinalFrameState,
          incomingSequence: args.sequence,
        })
        if (!pendingQueueDecision.shouldQueue) {
          console.info("[VoiceRuntime] segmented_pending_final_frame_ignored", {
            sequence: args.sequence,
            pendingSequence: pendingQueueDecision.existingSequence,
            reason: pendingQueueDecision.reason,
          })
          return
        }
        if (pendingQueueDecision.shouldReplacePending) {
          console.info("[VoiceRuntime] segmented_pending_final_frame_replaced", {
            sequence: args.sequence,
            previousSequence: pendingQueueDecision.existingSequence,
          })
        }
        const queuedPending = queuePendingFinalFrameFinalize({
          sequence: args.sequence,
          nowMs: Date.now(),
          timeoutMs: DEFAULT_PENDING_FINAL_FRAME_TIMEOUT_MS,
        })
        pendingFinalFrameState = {
          ...queuedPending,
          ingestResult: args.ingestResult,
        }
        if (typeof pendingFinalFrameTimeoutId === "number") {
          window.clearTimeout(pendingFinalFrameTimeoutId)
        }
        if (typeof pendingFinalFramePollId === "number") {
          window.clearInterval(pendingFinalFramePollId)
        }
        pendingFinalFrameTimeoutId = window.setTimeout(() => {
          void flushPendingFinalFrame("timeout", queuedPending.sequence)
        }, Math.max(0, queuedPending.timeoutAtMs - Date.now()))
        pendingFinalFramePollId = window.setInterval(() => {
          void flushPendingFinalFrame("assistant_cleared", queuedPending.sequence)
        }, 60)
        bargeInCount += 1
        assistantPlaybackQueueInterruptCount += 1
        assistantPlaybackQueueInterrupted = true
        assistantPlaybackQueueLastInterruptAtMs = Date.now()
        conversationInterruptCountRef.current = bargeInCount
        stopCurrentRequest()
        try {
          await sendBargeIn(realtimeTransportRoute)
        } catch {
          // Local cancel remains authoritative even when relay barge-in fails.
        }
      }

      const processSegmentFrame = async (
        segment: SegmentedVoiceFrameInput
      ): Promise<SegmentedVoiceFrameIngestResult> => {
        if (segment.sequence === 0) {
          clearTranscriptState("utterance_started")
        }

        const playbackQueueSnapshot = buildAssistantPlaybackQueueSnapshot()
        const echoTelemetry = buildEchoCancellationTelemetry()
        let relayEventCount = 0
        const applyRelayEvents = (
          relayEvents: Array<{ eventType?: string; sequence?: number; transcriptText?: string }> | undefined
        ) => {
          for (const relayEvent of relayEvents || []) {
            const eventType = typeof relayEvent.eventType === "string"
              ? relayEvent.eventType
              : ""
            if (
              (eventType === "partial_transcript" || eventType === "final_transcript")
              && typeof relayEvent.transcriptText === "string"
            ) {
              mergeRealtimeTranscript(segment.sequence, relayEvent.transcriptText)
            }
          }
        }

        const ingestRealtimeAudioChunk = async (route: VoiceRealtimeTransportRoute) => {
          const envelope = buildVoiceAudioFrameEnvelope({
            liveSessionId,
            voiceSessionId: openedVoiceSession.voiceSessionId,
            interviewSessionId: String(runtimeSession.agentSessionId),
            sequence: nextRealtimeEnvelopeSequence(),
            audioChunkBase64: encodeInt16FrameToBase64(segment.samples),
            frameDurationMs: segment.frameDurationMs,
            sampleRateHz: segment.sampleRateHz,
            transcriptionMimeType: "audio/L16;rate=24000;channels=1",
            transportMode: route === "webrtc_fallback" ? "webrtc" : "websocket",
          })
          const transportRuntimeForAudioChunk = buildRealtimeTransportRuntime()
          const {
            realtimeTransportRoute: _realtimeTransportRoute,
            realtimeTransportMode: _realtimeTransportMode,
            ...transportRuntimeWithoutStrictRoute
          } = transportRuntimeForAudioChunk as Record<string, unknown>
          return await voiceRuntime.ingestRealtimeEnvelope({
            voiceSessionId: openedVoiceSession.voiceSessionId,
            conversationId: runtimeSession.conversationId,
            liveSessionId,
            sequence: envelope.sequence,
            transportRoute: route,
            attachRealtimeTransportRoute: false,
            sttRoute: primarySttRoute,
            requestedProviderId: "elevenlabs",
            eventType: "audio_chunk",
            audioChunkBase64: envelope.audioChunkBase64,
            transcriptionMimeType: envelope.transcriptionMimeType,
            pcm: {
              encoding: "pcm_s16le",
              sampleRateHz: envelope.pcm.sampleRateHz,
              channels: 1,
              frameDurationMs: envelope.pcm.frameDurationMs,
            },
            voiceRuntime: {
              liveSessionId,
              captureMethod: "pcm_segmented_duplex_streaming",
              segmentDurationMs: liveDuplexSegmentDurationMs,
              segmentSequence: segment.sequence,
              frameQueuePolicy: "deterministic_serial",
              finalFramePolicy: "pending_guarded_finalize",
              sttPrimaryRoute: primarySttRoute,
              sttFallbackRoute: fallbackSttRoute,
              assistantPlaybackQueuePolicy: playbackQueueSnapshot.queuePolicy,
              assistantPlaybackQueueDepth: playbackQueueSnapshot.queueDepth,
              assistantPlaybackQueueInterrupted:
                playbackQueueSnapshot.interrupted,
              assistantPlaybackQueueInterruptCount:
                playbackQueueSnapshot.interruptCount,
              vadMode: CONVERSATION_VAD_POLICY.mode,
              vadEnergyThresholdRms: CONVERSATION_VAD_POLICY.energyThresholdRms,
              vadMinSpeechFrames: CONVERSATION_VAD_POLICY.minSpeechFrames,
              vadEndpointSilenceMs: CONVERSATION_VAD_POLICY.endpointSilenceMs,
              vadSpeechFrameDetected: segment.speechDetected,
              vadFrameRms: Number(segment.frameRms.toFixed(5)),
              ...echoTelemetry,
            },
            transportRuntime: {
              ...transportRuntimeWithoutStrictRoute,
              transportRouteHint: route,
              transportModeHint: resolveDuplexTransportModeFromRoute(route),
              frameBytes: segment.frameBytes,
              frameSequence: segment.sequence,
              frameRms: Number(segment.frameRms.toFixed(5)),
              speechDetected: segment.speechDetected,
              endpointDetected: segment.endpointDetected,
              bargeInCount,
              segmentedDuplexEnabled: true,
              segmentDurationMs: liveDuplexSegmentDurationMs,
              segmentSequence: segment.sequence,
              isFinalSegment: segment.isFinal,
            },
            avObservability: {
              liveSessionId,
              voiceSessionId: openedVoiceSession.voiceSessionId,
              interviewSessionId: String(runtimeSession.agentSessionId),
              frameSequence: segment.sequence,
              frameBytes: segment.frameBytes,
              sttRoute: primarySttRoute,
              frameRms: Number(segment.frameRms.toFixed(5)),
              speechDetected: segment.speechDetected,
              assistantPlaybackQueuePolicy: playbackQueueSnapshot.queuePolicy,
              assistantPlaybackQueueDepth: playbackQueueSnapshot.queueDepth,
              segmentedDuplexEnabled: true,
              segmentDurationMs: liveDuplexSegmentDurationMs,
              segmentSequence: segment.sequence,
              isFinalSegment: segment.isFinal,
              ...echoTelemetry,
            },
            runtimeContext: {
              authSessionId: sessionId,
              interviewSessionId: runtimeSession.agentSessionId,
            },
          })
        }

        const attemptRealtimeAudioIngest = async (): Promise<void> => {
          const policy = resolveSegmentedFrameStreamingPolicy({
            transportMode: resolveDuplexTransportModeFromRoute(realtimeTransportRoute),
            isRealtimeConnected: realtimeTransportRoute === "websocket_primary",
            isFinalFrame: segment.isFinal,
          })
          if (!policy.shouldSendRealtimeEnvelope) {
            return
          }
          try {
            const frameResult = await ingestRealtimeAudioChunk(realtimeTransportRoute)
            const relayEvents = Array.isArray(frameResult.relayEvents)
              ? frameResult.relayEvents
              : []
            relayEventCount += relayEvents.length
            applyRelayEvents(relayEvents)
            return
          } catch (error) {
            const fallbackDecision = resolveDuplexTransportFallbackDecision({
              routePrecedence: REALTIME_TRANSPORT_ROUTE_PRECEDENCE,
              currentRoute: realtimeTransportRoute,
              fallbackApplied: realtimeTransportFallbackApplied,
            })
            if (fallbackDecision.changedRoute) {
              realtimeTransportRoute = fallbackDecision.nextRoute
              activeRealtimeTransportRouteRef.current = realtimeTransportRoute
              realtimeTransportFallbackApplied = fallbackDecision.fallbackApplied
              realtimeIngestFailedReason = fallbackDecision.fallbackReason
              return
            }
            realtimeIngestFailedReason =
              error instanceof Error
                ? error.message
                : "voice_realtime_ingest_failed"
          }
        }

        await attemptRealtimeAudioIngest()

        const postRealtimePolicy = resolveSegmentedFrameStreamingPolicy({
          transportMode: resolveDuplexTransportModeFromRoute(realtimeTransportRoute),
          isRealtimeConnected: realtimeTransportRoute === "websocket_primary",
          isFinalFrame: segment.isFinal,
        })

        if (postRealtimePolicy.shouldUseHttpTranscription) {
          if (segment.isFinal) {
            finalSegmentHttpTranscribeAttempted = true
          }
          const activeCaptureMethod = voiceCaptureControllerRef.current?.method
          const segmentCaptureMethod =
            activeCaptureMethod === "pcm_script_processor"
              ? "pcm_script_processor"
              : "pcm_audio_worklet"
          const segmentBlob = encodeMonoPcm16Wav({
            samples: segment.samples,
            sampleRateHz: segment.sampleRateHz,
          })
          const transcribeResult = await voiceRuntime.transcribeAudioBlob({
            voiceSessionId: openedVoiceSession.voiceSessionId,
            blob: segmentBlob,
            requestedProviderId: "elevenlabs",
            requestedVoiceId: preferredRequestedVoiceId,
            language: voiceInputLanguage,
            telemetry: {
              captureMethod: segmentCaptureMethod,
              frameDurationMs: segment.frameDurationMs,
              sampleRateHz: segment.sampleRateHz,
              frameCount: 1,
              frameBytes: segment.frameBytes,
              realtimeTransportRoute,
              realtimeTransportRoutePrecedence: REALTIME_TRANSPORT_ROUTE_PRECEDENCE,
              realtimeSttRoutePrecedence: REALTIME_STT_ROUTE_PRECEDENCE,
              realtimeFallbackReason: realtimeIngestFailedReason || undefined,
              interruptCount: bargeInCount,
              vadMode: CONVERSATION_VAD_POLICY.mode,
              vadEnergyThresholdRms: CONVERSATION_VAD_POLICY.energyThresholdRms,
              vadMinSpeechFrames: CONVERSATION_VAD_POLICY.minSpeechFrames,
              vadEndpointSilenceMs: CONVERSATION_VAD_POLICY.endpointSilenceMs,
              echoCancellationStrategy: echoCancellationSelection.strategy,
              echoCancellationReason: echoCancellationSelection.reason,
              echoCancellationHardwareAecSupported:
                echoCancellationSelection.hardwareAecSupported,
              echoCancellationHardwareAecEnabled:
                echoCancellationSelection.hardwareAecEnabled,
              assistantPlaybackQueuePolicy: playbackQueueSnapshot.queuePolicy,
              assistantPlaybackQueueDepth: playbackQueueSnapshot.queueDepth,
              assistantPlaybackQueueInterruptCount: playbackQueueSnapshot.interruptCount,
              assistantPlaybackQueueInterrupted: playbackQueueSnapshot.interrupted,
            },
            runtimeContext: {
              authSessionId: sessionId,
              interviewSessionId: runtimeSession.agentSessionId,
            },
          })
          if (transcribeResult.success && transcribeResult.text?.trim()) {
            if (segment.isFinal) {
              finalSegmentHttpTranscribeNoSpeech = false
            }
            const normalizedTranscript = transcribeResult.text.trim()
            mergeRealtimeTranscript(segment.sequence, normalizedTranscript)

            if (!postRealtimePolicy.shouldSendRealtimeEnvelope) {
              const transcriptText = segment.isFinal
                ? (latestRealtimeTranscript || normalizedTranscript).trim()
                : normalizedTranscript
              if (transcriptText) {
                const transcriptIngest = await voiceRuntime.ingestRealtimeEnvelope({
                  voiceSessionId: openedVoiceSession.voiceSessionId,
                  conversationId: runtimeSession.conversationId,
                  liveSessionId,
                  sequence: transcriptIngestSequence,
                  transportRoute: realtimeTransportRoute,
                  sttRoute: primarySttRoute,
                  requestedProviderId: "elevenlabs",
                  eventType: segment.isFinal ? "final_transcript" : "partial_transcript",
                  transcriptText,
                  voiceRuntime: {
                    liveSessionId,
                    captureMethod: "pcm_segmented_duplex_streaming",
                    segmentDurationMs: liveDuplexSegmentDurationMs,
                    segmentSequence: segment.sequence,
                    transcriptSequence: transcriptIngestSequence,
                    sttPrimaryRoute: primarySttRoute,
                    sttFallbackRoute: fallbackSttRoute,
                  },
                  transportRuntime: {
                    ...buildRealtimeTransportRuntime(),
                    segmentedDuplexEnabled: true,
                    segmentDurationMs: liveDuplexSegmentDurationMs,
                    segmentSequence: segment.sequence,
                    transcriptSequence: transcriptIngestSequence,
                  },
                  avObservability: {
                    liveSessionId,
                    voiceSessionId: openedVoiceSession.voiceSessionId,
                    interviewSessionId: String(runtimeSession.agentSessionId),
                    segmentedDuplexEnabled: true,
                    segmentDurationMs: liveDuplexSegmentDurationMs,
                    segmentSequence: segment.sequence,
                    transcriptSequence: transcriptIngestSequence,
                  },
                  runtimeContext: {
                    authSessionId: sessionId,
                    interviewSessionId: runtimeSession.agentSessionId,
                  },
                })
                transcriptIngestSequence += 1
                const relayEvents = Array.isArray(transcriptIngest.relayEvents)
                  ? transcriptIngest.relayEvents
                  : []
                relayEventCount += relayEvents.length
                applyRelayEvents(relayEvents)
              }
            }
          } else if (
            segment.isFinal
            && transcribeResult.success
            && !transcribeResult.text?.trim()
            && transcribeResult.noSpeechDetected
          ) {
            finalSegmentHttpTranscribeNoSpeech = true
          } else if (!transcribeResult.success) {
            realtimeIngestFailedReason =
              transcribeResult.error || "voice_segment_transcription_failed"
          }
        }

        const ingestResult: SegmentedVoiceFrameIngestResult = {
          sequence: segment.sequence,
          relayEventCount,
          transcriptText: latestRealtimeTranscript || undefined,
        }

        if (segment.isFinal) {
          const assistantSpeakingForFinalize = isSendingRef.current
          const shouldQueueAssistantBargeIn =
            assistantSpeakingForFinalize
            && (
              segment.speechDetected
              || Boolean(ingestResult.transcriptText?.trim())
            )
          if (shouldQueueAssistantBargeIn) {
            await queuePendingSegmentFinalization({
              sequence: segment.sequence,
              ingestResult,
            })
          } else {
            await finalizeLiveSegmentFrame({
              frameSequence: segment.sequence,
              ingestResult,
              source: "segment_final",
            })
          }
        }

        return ingestResult
      }

      const enqueueDeterministicSegmentIngest = createDeterministicFrameQueue<
        SegmentedVoiceFrameInput,
        SegmentedVoiceFrameIngestResult
      >(processSegmentFrame)

      const queueRealtimeSegmentIngest = (segment: SegmentedVoiceFrameInput) => {
        queuedFrameCount += 1
        queuedFrameBytes += segment.frameBytes
        realtimeFrameQueue = enqueueDeterministicSegmentIngest(segment)
          .then((result) => {
            lastIngestedSegmentResult = result
          })
          .catch((error) => {
            realtimeIngestFailedReason =
              error instanceof Error
                ? error.message
                : "voice_realtime_ingest_queue_failed"
          })
      }

      const queueRealtimePcmFrameIngest = (frame: VoiceCaptureFramePayload) => {
        const frameRms = computePcm16FrameRms(frame.samples)
        const speechDetected = detectVadSpeechFrame({
          samples: frame.samples,
          vadPolicy: CONVERSATION_VAD_POLICY,
        })
        captureFrameCounter += 1
        if (captureFrameCounter === 1) {
          console.info("[VoiceRuntime] web_audio_capture_first_pcm_frame", {
            liveSessionId,
            voiceSessionId: openedVoiceSession.voiceSessionId,
            frameDurationMs: frame.frameDurationMs,
            frameBytes: frame.frameBytes,
            sampleRateHz: frame.sampleRateHz,
          })
        }
        captureMaxFrameRms = Math.max(captureMaxFrameRms, frameRms)
        if (speechDetected) {
          consecutiveSpeechFrames += 1
          consecutiveSilentFrames = 0
          captureSpeechFrameCounter += 1
          captureLastSpeechDetectedAtMs = Date.now()
          if (
            !hasDetectedSpeechSinceCaptureStart
            && consecutiveSpeechFrames >= CONVERSATION_VAD_POLICY.minSpeechFrames
          ) {
            hasDetectedSpeechSinceCaptureStart = true
            firstSpeechDetectedAtMs = Date.now()
          }
        } else {
          consecutiveSpeechFrames = 0
          consecutiveSilentFrames += 1
        }

        const endpointBySilence = shouldTriggerConversationVadEndpoint({
          hasDetectedSpeechSinceCaptureStart,
          consecutiveSilentFrames,
          frameDurationMs: frame.frameDurationMs,
          vadPolicy: CONVERSATION_VAD_POLICY,
        })
        const endpointDetected = endpointBySilence
          && typeof firstSpeechDetectedAtMs === "number"
          && Date.now() - firstSpeechDetectedAtMs >= DESKTOP_VAD_MIN_ACTIVE_SPEECH_MS

        if (
          endpointDetected
          && conversationSessionActiveRef.current
          && !captureStopQueuedFromEndpoint
        ) {
          captureStopQueuedFromEndpoint = true
          console.info("[VoiceRuntime] web_audio_capture_endpoint_stop_queued", {
            liveSessionId,
            voiceSessionId: openedVoiceSession.voiceSessionId,
            hasDetectedSpeechSinceCaptureStart,
            firstSpeechDetectedAtMs,
            consecutiveSilentFrames,
            frameDurationMs: frame.frameDurationMs,
            endpointSilenceMs: CONVERSATION_VAD_POLICY.endpointSilenceMs,
            minActiveSpeechMs: DESKTOP_VAD_MIN_ACTIVE_SPEECH_MS,
          })
          window.setTimeout(() => {
            try {
              voiceCaptureControllerRef.current?.stop()
            } catch {
              // Endpoint-triggered stop is best-effort.
            }
          }, 0)
        }

        if (!isSendingRef.current) {
          interruptionIssuedWhileSending = false
          if (pendingFinalFrameState) {
            void flushPendingFinalFrame("assistant_cleared")
          }
        }

        const bargeInSpeechQualified =
          hasDetectedSpeechSinceCaptureStart
          && typeof firstSpeechDetectedAtMs === "number"
          && Date.now() - firstSpeechDetectedAtMs >= DESKTOP_VAD_MIN_ACTIVE_SPEECH_MS

        if (
          speechDetected
          && consecutiveSpeechFrames >= CONVERSATION_VAD_POLICY.minSpeechFrames
          && isSendingRef.current
          && !interruptionIssuedWhileSending
          && bargeInSpeechQualified
        ) {
          interruptionIssuedWhileSending = true
          bargeInCount += 1
          assistantPlaybackQueueInterruptCount += 1
          assistantPlaybackQueueInterrupted = true
          assistantPlaybackQueueLastInterruptAtMs = Date.now()
          conversationInterruptCountRef.current = bargeInCount
          stopCurrentRequest()
          void sendBargeIn(realtimeTransportRoute).catch(() => {})
        }

        for (let index = 0; index < frame.samples.length; index += 1) {
          segmentPendingSamples.push(frame.samples[index] || 0)
        }

        while (segmentPendingSamples.length >= liveDuplexSegmentSampleCount) {
          const segmentSamples = Int16Array.from(
            segmentPendingSamples.slice(0, liveDuplexSegmentSampleCount)
          )
          segmentPendingSamples = segmentPendingSamples.slice(liveDuplexSegmentSampleCount)
          const segmentFrameDurationMs = Math.max(
            pcmContract.frameDurationMs,
            Math.round((segmentSamples.length / pcmContract.sampleRateHz) * 1000)
          )
          queueRealtimeSegmentIngest({
            sequence: segmentSequence,
            sampleRateHz: pcmContract.sampleRateHz,
            frameDurationMs: segmentFrameDurationMs,
            frameBytes: segmentSamples.byteLength,
            samples: segmentSamples,
            speechDetected,
            endpointDetected,
            frameRms: computePcm16FrameRms(segmentSamples),
            isFinal: false,
          })
          segmentSequence += 1
        }
      }

      setActiveVoiceSessionId(openedVoiceSession.voiceSessionId)

      if (openedVoiceSession.fallbackProviderId) {
        notification.info(
          "Voice Runtime Fallback",
          `${openedVoiceSession.requestedProviderId} fell back to ${openedVoiceSession.providerId}.`
        )
      }

      const starterGreetingText =
        normalizeOptionalString(options?.starterGreetingText)
        || (
          options?.includeStarterGreeting
            ? resolveDesktopConversationStarterText({
              language: runtimeSession.agentVoiceLanguage || voiceInputLanguage,
              userFirstName: user?.firstName,
            })
            : null
        )
      if (starterGreetingText) {
        try {
          const starterGreetingSynthesis = await voiceRuntime.synthesizePreview({
            voiceSessionId: openedVoiceSession.voiceSessionId,
            text: starterGreetingText,
            requestedProviderId: "elevenlabs",
            requestedVoiceId: preferredRequestedVoiceId,
            speakBrowserFallback: false,
            runtimeContext: {
              authSessionId: sessionId,
              interviewSessionId: runtimeSession.agentSessionId,
            },
          })
          if (starterGreetingSynthesis.success && starterGreetingSynthesis.playbackDataUrl) {
            await playAudioDataUrl(starterGreetingSynthesis.playbackDataUrl)
          } else {
            const fallbackText = starterGreetingSynthesis.fallbackText ?? undefined
            if (
              starterGreetingSynthesis.success
              && fallbackText
            && typeof window !== "undefined"
            && "speechSynthesis" in window
            ) {
              await new Promise<void>((resolve) => {
                let settled = false
                const finalize = () => {
                  if (settled) {
                    return
                  }
                  settled = true
                  resolve()
                }
                try {
                  window.speechSynthesis.cancel()
                  const utterance = new SpeechSynthesisUtterance(fallbackText)
                  utterance.onend = finalize
                  utterance.onerror = finalize
                  window.speechSynthesis.speak(utterance)
                } catch {
                  finalize()
                }
              })
            }
          }
        } catch (error) {
          console.warn("[VoiceRuntime] starter_greeting_playback_failed", {
            error: error instanceof Error ? error.message : "unknown_error",
          })
        }
      }

      console.info("[VoiceRuntime] web_audio_capture_stream_request", {
        liveSessionId,
        voiceSessionId: openedVoiceSession.voiceSessionId,
      })
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { ideal: 1 },
          sampleRate: { ideal: pcmContract.sampleRateHz },
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
        },
      })
      voiceStreamRef.current = stream
      const primaryAudioTrack = stream.getAudioTracks()[0] || null
      console.info("[VoiceRuntime] web_audio_capture_stream_ready", {
        liveSessionId,
        voiceSessionId: openedVoiceSession.voiceSessionId,
        trackCount: stream.getAudioTracks().length,
        trackReadyState: primaryAudioTrack?.readyState ?? null,
        trackEnabled: primaryAudioTrack?.enabled ?? null,
        trackMuted: primaryAudioTrack?.muted ?? null,
      })
      const audioTrack = primaryAudioTrack
      echoCancellationSelection = resolveRealtimeEchoCancellationSelection({
        hardwareAecSupported: resolveHardwareAecSupport(),
        hardwareAecEnabled: resolveHardwareAecEnabled(audioTrack),
        forceMuteDuringTts: isConversationMicMuted,
      })

      const handleCapturedAudio = (payload: VoiceCapturePayload) => {
        clearCaptureTimers()
        releaseVoiceMediaStream()
        voiceCaptureControllerRef.current = null
        console.info("[VoiceRuntime] web_audio_capture_payload_ready", {
          liveSessionId,
          voiceSessionId: openedVoiceSession.voiceSessionId,
          captureMethod: payload.captureMethod,
          audioBytes: payload.audioBlob.size,
          frameCount: payload.frameCount,
          realtimeFrameCount: queuedFrameCount,
        })
        if (!payload.audioBlob.size) {
          setVoiceCaptureStateSafe("idle")
          closeVoiceRuntimeSession({
            voiceSessionId: openedVoiceSession.voiceSessionId,
            providerId: openedVoiceSession.providerId,
            persistentRequestedProviderId: "gemini_live",
            persistentProviderSessionId:
              sessionRuntimePath.persistentProviderSessionId,
            runtimeSession,
            reason: "chat_voice_capture_empty_audio",
          })
          return
        }

        void (async () => {
          setVoiceCaptureStateSafe("transcribing")
          let shouldResumeCaptureAfterTurn = false
          try {
            let queuedTailFinalSegment = false
            if (segmentPendingSamples.length > 0) {
              const finalSegmentSamples = Int16Array.from(segmentPendingSamples)
              segmentPendingSamples = []
              queueRealtimeSegmentIngest({
                sequence: segmentSequence,
                sampleRateHz: pcmContract.sampleRateHz,
                frameDurationMs: Math.max(
                  pcmContract.frameDurationMs,
                  Math.round((finalSegmentSamples.length / pcmContract.sampleRateHz) * 1000)
                ),
                frameBytes: finalSegmentSamples.byteLength,
                samples: finalSegmentSamples,
                speechDetected: hasDetectedSpeechSinceCaptureStart,
                endpointDetected: captureStopQueuedFromEndpoint,
                frameRms: computePcm16FrameRms(finalSegmentSamples),
                isFinal: true,
              })
              segmentSequence += 1
              queuedTailFinalSegment = true
            }

            await realtimeFrameQueue
            if (
              !queuedTailFinalSegment
              && lastIngestedSegmentResult
              && !pendingFinalFrameState
            ) {
              const finalizedNoTailSegment = await finalizeLiveSegmentFrame({
                frameSequence: lastIngestedSegmentResult.sequence,
                ingestResult: lastIngestedSegmentResult,
                source: "capture_stop_no_tail_segment",
              })
              const shouldQueueNoTailBargeIn =
                !finalizedNoTailSegment
                && isSendingRef.current
                && (
                  hasDetectedSpeechSinceCaptureStart
                  || Boolean(lastIngestedSegmentResult.transcriptText?.trim())
                )
              if (shouldQueueNoTailBargeIn) {
                await queuePendingSegmentFinalization({
                  sequence: lastIngestedSegmentResult.sequence,
                  ingestResult: lastIngestedSegmentResult,
                })
              }
            }
            if (pendingFinalFrameState) {
              const maxWaitMs = Math.max(
                DEFAULT_PENDING_FINAL_FRAME_TIMEOUT_MS + 120,
                pendingFinalFrameState.timeoutAtMs - Date.now() + 120
              )
              const waitStartedAtMs = Date.now()
              while (pendingFinalFrameState && Date.now() - waitStartedAtMs < maxWaitMs) {
                await new Promise<void>((resolve) => {
                  window.setTimeout(resolve, 40)
                })
              }
              if (pendingFinalFrameState) {
                await flushPendingFinalFrame("timeout", pendingFinalFrameState.sequence)
              }
            }

            const realtimeTranscript = latestRealtimeTranscript?.trim() || null
            const shouldUseSegmentTranscriptAsAuthoritative =
              Boolean(realtimeTranscript)
              && (
                !realtimeIngestFailedReason
                || (
                  queuedFrameCount <= 1
                  && finalSegmentHttpTranscribeAttempted
                )
              )
            if (realtimeTranscript && shouldUseSegmentTranscriptAsAuthoritative) {
              const playbackQueueSnapshot = buildAssistantPlaybackQueueSnapshot()
              const echoTelemetry = buildEchoCancellationTelemetry()
              const realtimeRuntimeMetadata: AIChatVoiceRuntimeMetadata = {
                voiceSessionId: openedVoiceSession.voiceSessionId,
                requestedProviderId: openedVoiceSession.requestedProviderId,
                providerId: openedVoiceSession.providerId,
                fallbackProviderId: openedVoiceSession.fallbackProviderId ?? null,
                language: voiceInputLanguage,
                transcribeStatus: "success",
                fallbackReason: realtimeTransportFallbackApplied
                  ? "websocket_primary_failed"
                  : null,
                liveSessionId,
                sessionState: "transcribed",
                sessionTransportPath: sessionRuntimePath.runtimePath,
                turnStitchFallbackReason:
                  sessionRuntimePath.turnStitchFallbackReason,
                persistentProviderId: sessionRuntimePath.persistentProviderId,
                persistentProviderSessionId:
                  sessionRuntimePath.persistentProviderSessionId,
                persistentFeatureFlagEnabled:
                  openedVoiceSession.persistentMultimodal?.featureFlagEnabled === true,
                persistentContractVersion:
                  openedVoiceSession.persistentMultimodal?.contractVersion,
                runtimeAuthorityPrecedence: "vc83_runtime_policy",
                routeTarget: "vc83_voice_runtime",
                bridgeSource: "useVoiceRuntime",
                captureMethod: payload.captureMethod,
                frameDurationMs: payload.frameDurationMs,
                sampleRateHz: payload.sampleRateHz,
                frameCount: payload.frameCount,
                frameBytes: payload.frameBytes,
                realtimeFrameCount: queuedFrameCount,
                realtimeFrameBytes: queuedFrameBytes,
                realtimeTransportRoute,
                requestedTransport: "websocket",
                transport: resolveDuplexTransportModeFromRoute(realtimeTransportRoute),
                mode: resolveDuplexTransportModeFromRoute(realtimeTransportRoute),
                transportFallbackReason: realtimeTransportFallbackApplied
                  ? "websocket_primary_failed"
                  : "none",
                realtimeConnected:
                  !realtimeTransportFallbackApplied
                  && realtimeTransportRoute === "websocket_primary",
                realtimeTransportRoutePrecedence: REALTIME_TRANSPORT_ROUTE_PRECEDENCE,
                realtimeSttRoutePrecedence: REALTIME_STT_ROUTE_PRECEDENCE,
                realtimeSttRoute: primarySttRoute,
                duplexPolicy: "persistent_streaming_primary",
                duplexPolicyParity: "segmented_live_duplex",
                segmentedDuplexEnabled: true,
                segmentDurationMs: liveDuplexSegmentDurationMs,
                frameQueuePolicy: "deterministic_serial",
                finalFramePolicy: "pending_guarded_finalize",
                interruptDetectionPolicy: "client_vad_barge_in",
                interruptCount: bargeInCount,
                assistantPlaybackQueuePolicy: playbackQueueSnapshot.queuePolicy,
                assistantPlaybackQueueDepth: playbackQueueSnapshot.queueDepth,
                assistantPlaybackQueueInterrupted:
                  playbackQueueSnapshot.interrupted,
                assistantPlaybackQueueInterruptCount:
                  playbackQueueSnapshot.interruptCount,
                echoCancellation: {
                  strategy: echoCancellationSelection.strategy,
                  reason: echoCancellationSelection.reason,
                  hardwareAecSupported:
                    echoCancellationSelection.hardwareAecSupported,
                  hardwareAecEnabled:
                    echoCancellationSelection.hardwareAecEnabled,
                },
                ...echoTelemetry,
                vadPolicy: {
                  mode: CONVERSATION_VAD_POLICY.mode,
                  frameDurationMs: CONVERSATION_VAD_POLICY.frameDurationMs,
                  energyThresholdRms: CONVERSATION_VAD_POLICY.energyThresholdRms,
                  minSpeechFrames: CONVERSATION_VAD_POLICY.minSpeechFrames,
                  endpointSilenceMs: CONVERSATION_VAD_POLICY.endpointSilenceMs,
                },
              }
              setPendingVoiceRuntime(realtimeRuntimeMetadata)
              applyTranscriptToComposer(realtimeTranscript)
              setVoiceCaptureError(null)
              if (conversationSessionActiveRef.current) {
                const committed = await sendConversationTranscriptTurn(
                  realtimeTranscript,
                  realtimeRuntimeMetadata,
                  runtimeSession.conversationId
                )
                if (committed) {
                  setMessage("")
                  setPendingVoiceRuntime(null)
                  shouldResumeCaptureAfterTurn = true
                }
              }
              return
            }

            const skipFallbackTranscriptionForAmbientSingleSegment =
              queuedFrameCount <= 1
              && finalSegmentHttpTranscribeAttempted
              && finalSegmentHttpTranscribeNoSpeech
              && realtimeIngestFailedReason === "voice_non_speech_transcript_filtered"
            if (skipFallbackTranscriptionForAmbientSingleSegment) {
              console.info("[VoiceRuntime] skipping_redundant_blob_transcription_after_ambient_filter", {
                liveSessionId,
                voiceSessionId: openedVoiceSession.voiceSessionId,
                queuedFrameCount,
                realtimeIngestFailedReason,
              })
              setVoiceCaptureError(null)
              setPendingVoiceRuntime(null)
              if (conversationSessionActiveRef.current) {
                shouldResumeCaptureAfterTurn = true
              }
              return
            }

            const transcribeResult = await voiceRuntime.transcribeAudioBlob({
              voiceSessionId: openedVoiceSession.voiceSessionId,
              blob: payload.audioBlob,
              requestedProviderId: "elevenlabs",
              requestedVoiceId: preferredRequestedVoiceId,
              language: voiceInputLanguage,
              telemetry: {
                assistantPlaybackQueuePolicy:
                  buildAssistantPlaybackQueueSnapshot().queuePolicy,
                assistantPlaybackQueueDepth:
                  buildAssistantPlaybackQueueSnapshot().queueDepth,
                assistantPlaybackQueueInterruptCount:
                  buildAssistantPlaybackQueueSnapshot().interruptCount,
                assistantPlaybackQueueInterrupted:
                  buildAssistantPlaybackQueueSnapshot().interrupted,
                recorderMimeType: payload.recorderMimeType,
                captureChunkCount: payload.captureChunkCount,
                captureChunkBytes: payload.captureChunkBytes,
                captureMethod: payload.captureMethod,
                frameDurationMs: payload.frameDurationMs,
                sampleRateHz: payload.sampleRateHz,
                frameCount: payload.frameCount,
                frameBytes: payload.frameBytes,
                realtimeFrameCount: queuedFrameCount,
                realtimeFrameBytes: queuedFrameBytes,
                realtimeTransportRoute,
                realtimeTransportRoutePrecedence: REALTIME_TRANSPORT_ROUTE_PRECEDENCE,
                realtimeSttRoutePrecedence: REALTIME_STT_ROUTE_PRECEDENCE,
                realtimeFallbackReason:
                  realtimeIngestFailedReason || "realtime_transcript_unavailable",
                interruptCount: bargeInCount,
                vadMode: CONVERSATION_VAD_POLICY.mode,
                vadEnergyThresholdRms: CONVERSATION_VAD_POLICY.energyThresholdRms,
                vadMinSpeechFrames: CONVERSATION_VAD_POLICY.minSpeechFrames,
                vadEndpointSilenceMs: CONVERSATION_VAD_POLICY.endpointSilenceMs,
                echoCancellationStrategy: echoCancellationSelection.strategy,
                echoCancellationReason: echoCancellationSelection.reason,
                echoCancellationHardwareAecSupported:
                  echoCancellationSelection.hardwareAecSupported,
                echoCancellationHardwareAecEnabled:
                  echoCancellationSelection.hardwareAecEnabled,
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
              sessionTransportPath: sessionRuntimePath.runtimePath,
              turnStitchFallbackReason:
                sessionRuntimePath.turnStitchFallbackReason,
              persistentProviderId: sessionRuntimePath.persistentProviderId,
              persistentProviderSessionId:
                sessionRuntimePath.persistentProviderSessionId,
              persistentFeatureFlagEnabled:
                openedVoiceSession.persistentMultimodal?.featureFlagEnabled === true,
              persistentContractVersion:
                openedVoiceSession.persistentMultimodal?.contractVersion,
              runtimeAuthorityPrecedence: "vc83_runtime_policy",
              routeTarget: "vc83_voice_runtime",
              bridgeSource: "useVoiceRuntime",
              realtimeTransportRoute,
              requestedTransport: "websocket",
              transport: resolveDuplexTransportModeFromRoute(realtimeTransportRoute),
              mode: resolveDuplexTransportModeFromRoute(realtimeTransportRoute),
              transportFallbackReason: realtimeTransportFallbackApplied
                ? "websocket_primary_failed"
                : "none",
              realtimeConnected:
                !realtimeTransportFallbackApplied
                && realtimeTransportRoute === "websocket_primary",
              realtimeTransportRoutePrecedence: REALTIME_TRANSPORT_ROUTE_PRECEDENCE,
              realtimeSttRoutePrecedence: REALTIME_STT_ROUTE_PRECEDENCE,
              realtimeSttRoute: primarySttRoute,
              realtimeFallbackReason:
                realtimeIngestFailedReason || "realtime_transcript_unavailable",
              duplexPolicy: "persistent_streaming_primary",
              duplexPolicyParity: "segmented_live_duplex",
              segmentedDuplexEnabled: true,
              segmentDurationMs: liveDuplexSegmentDurationMs,
              frameQueuePolicy: "deterministic_serial",
              finalFramePolicy: "pending_guarded_finalize",
              interruptDetectionPolicy: "client_vad_barge_in",
              interruptCount: bargeInCount,
              assistantPlaybackQueuePolicy:
                buildAssistantPlaybackQueueSnapshot().queuePolicy,
              assistantPlaybackQueueDepth:
                buildAssistantPlaybackQueueSnapshot().queueDepth,
              assistantPlaybackQueueInterrupted:
                buildAssistantPlaybackQueueSnapshot().interrupted,
              assistantPlaybackQueueInterruptCount:
                buildAssistantPlaybackQueueSnapshot().interruptCount,
              echoCancellation: {
                strategy: echoCancellationSelection.strategy,
                reason: echoCancellationSelection.reason,
                hardwareAecSupported:
                  echoCancellationSelection.hardwareAecSupported,
                hardwareAecEnabled:
                  echoCancellationSelection.hardwareAecEnabled,
              },
              ...buildEchoCancellationTelemetry(),
              vadPolicy: {
                mode: CONVERSATION_VAD_POLICY.mode,
                frameDurationMs: CONVERSATION_VAD_POLICY.frameDurationMs,
                energyThresholdRms: CONVERSATION_VAD_POLICY.energyThresholdRms,
                minSpeechFrames: CONVERSATION_VAD_POLICY.minSpeechFrames,
                endpointSilenceMs: CONVERSATION_VAD_POLICY.endpointSilenceMs,
              },
            }
            setPendingVoiceRuntime(runtimeMetadata)

            if (
              transcribeResult.success
              && !transcribeResult.text?.trim()
              && transcribeResult.noSpeechDetected
            ) {
              console.info("[VoiceRuntime] no_speech_detected_after_blob_transcription", {
                liveSessionId,
                voiceSessionId: openedVoiceSession.voiceSessionId,
                realtimeFallbackReason:
                  realtimeIngestFailedReason || "realtime_transcript_unavailable",
              })
              setVoiceCaptureError(null)
              setPendingVoiceRuntime(null)
              if (conversationSessionActiveRef.current) {
                shouldResumeCaptureAfterTurn = true
              }
              return
            }

            if (!transcribeResult.success || !transcribeResult.text?.trim()) {
              const errorMessage = fallbackReason || "Voice transcription returned no text."
              setVoiceCaptureError(errorMessage)
              notification.error("Voice Capture Failed", errorMessage)
              return
            }

            const transcript = transcribeResult.text.trim()
            applyTranscriptToComposer(transcript)
            setVoiceCaptureError(null)
            if (conversationSessionActiveRef.current) {
              const committed = await sendConversationTranscriptTurn(
                transcript,
                runtimeMetadata,
                runtimeSession.conversationId
              )
              if (committed) {
                setMessage("")
                setPendingVoiceRuntime(null)
                shouldResumeCaptureAfterTurn = true
              }
            }
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
              sessionTransportPath: sessionRuntimePath.runtimePath,
              turnStitchFallbackReason:
                sessionRuntimePath.turnStitchFallbackReason,
              persistentProviderId: sessionRuntimePath.persistentProviderId,
              persistentProviderSessionId:
                sessionRuntimePath.persistentProviderSessionId,
              persistentFeatureFlagEnabled:
                openedVoiceSession.persistentMultimodal?.featureFlagEnabled === true,
              persistentContractVersion:
                openedVoiceSession.persistentMultimodal?.contractVersion,
              runtimeAuthorityPrecedence: "vc83_runtime_policy",
              routeTarget: "vc83_voice_runtime",
              bridgeSource: "useVoiceRuntime",
              realtimeTransportRoute,
              requestedTransport: "websocket",
              transport: resolveDuplexTransportModeFromRoute(realtimeTransportRoute),
              mode: resolveDuplexTransportModeFromRoute(realtimeTransportRoute),
              transportFallbackReason: realtimeTransportFallbackApplied
                ? "websocket_primary_failed"
                : "none",
              realtimeConnected:
                !realtimeTransportFallbackApplied
                && realtimeTransportRoute === "websocket_primary",
              duplexPolicy: "persistent_streaming_primary",
              duplexPolicyParity: "segmented_live_duplex",
              segmentedDuplexEnabled: true,
              segmentDurationMs: liveDuplexSegmentDurationMs,
              frameQueuePolicy: "deterministic_serial",
              finalFramePolicy: "pending_guarded_finalize",
              interruptDetectionPolicy: "client_vad_barge_in",
              interruptCount: bargeInCount,
              assistantPlaybackQueuePolicy:
                buildAssistantPlaybackQueueSnapshot().queuePolicy,
              assistantPlaybackQueueDepth:
                buildAssistantPlaybackQueueSnapshot().queueDepth,
              assistantPlaybackQueueInterrupted:
                buildAssistantPlaybackQueueSnapshot().interrupted,
              assistantPlaybackQueueInterruptCount:
                buildAssistantPlaybackQueueSnapshot().interruptCount,
              echoCancellation: {
                strategy: echoCancellationSelection.strategy,
                reason: echoCancellationSelection.reason,
                hardwareAecSupported:
                  echoCancellationSelection.hardwareAecSupported,
                hardwareAecEnabled:
                  echoCancellationSelection.hardwareAecEnabled,
              },
              ...buildEchoCancellationTelemetry(),
              vadPolicy: {
                mode: CONVERSATION_VAD_POLICY.mode,
                frameDurationMs: CONVERSATION_VAD_POLICY.frameDurationMs,
                energyThresholdRms: CONVERSATION_VAD_POLICY.energyThresholdRms,
                minSpeechFrames: CONVERSATION_VAD_POLICY.minSpeechFrames,
                endpointSilenceMs: CONVERSATION_VAD_POLICY.endpointSilenceMs,
              },
            })
            notification.error("Voice Capture Failed", errorMessage)
          } finally {
            clearCaptureTimers()
            setVoiceCaptureStateSafe("idle")
            activeRealtimeLiveSessionIdRef.current = null
            activeRealtimeVoiceSessionIdRef.current = null
            activeRealtimeInterviewSessionIdRef.current = null
            activeRealtimeTransportRouteRef.current = INITIAL_REALTIME_TRANSPORT_ROUTE
            closeVoiceRuntimeSession({
              voiceSessionId: openedVoiceSession.voiceSessionId,
              providerId: openedVoiceSession.providerId,
              persistentRequestedProviderId: "gemini_live",
              persistentProviderSessionId:
                sessionRuntimePath.persistentProviderSessionId,
              runtimeSession,
              reason: "chat_voice_capture_complete",
            })
            if (
              shouldResumeCaptureAfterTurn
              && conversationSessionActiveRef.current
              && !conversationEndingRef.current
              && !conversationMicMutedRef.current
            ) {
              let resumeAttempts = 0
              const resumeCaptureWhenAssistantReady = () => {
                if (
                  !conversationSessionActiveRef.current
                  || conversationEndingRef.current
                  || conversationMicMutedRef.current
                ) {
                  return
                }
                if (
                  voiceCaptureStateRef.current !== "idle"
                  || Boolean(voiceCaptureControllerRef.current)
                ) {
                  return
                }
                // Keep capture available during assistant playback for duplex/barge-in.
                if (isSendingRef.current && resumeAttempts < 10) {
                  resumeAttempts += 1
                }
                void startVoiceCapture()
              }
              window.setTimeout(resumeCaptureWhenAssistantReady, 120)
            }
          }
        })()
      }

      const handleCaptureError = (error: unknown) => {
        clearCaptureTimers()
        releaseVoiceMediaStream()
        voiceCaptureControllerRef.current = null
        const errorMessage =
          error instanceof Error ? error.message : "voice_capture_runtime_error"
        console.error("[VoiceRuntime] web_audio_capture_error", {
          liveSessionId,
          voiceSessionId: openedVoiceSession.voiceSessionId,
          errorMessage,
        })
        setVoiceCaptureStateSafe("idle")
        setVoiceCaptureError(errorMessage)
        activeRealtimeLiveSessionIdRef.current = null
        activeRealtimeVoiceSessionIdRef.current = null
        activeRealtimeInterviewSessionIdRef.current = null
        activeRealtimeTransportRouteRef.current = INITIAL_REALTIME_TRANSPORT_ROUTE
        notification.error("Voice Capture Failed", errorMessage)
        closeVoiceRuntimeSession({
          voiceSessionId: openedVoiceSession.voiceSessionId,
          providerId: openedVoiceSession.providerId,
          persistentRequestedProviderId: "gemini_live",
          persistentProviderSessionId:
            sessionRuntimePath.persistentProviderSessionId,
          runtimeSession,
          reason: "chat_voice_capture_failed_to_start",
        })
      }

      const startSegmentedPcmCapture = async (options?: {
        preferredCapturePath?: "auto" | "script_processor_only"
      }): Promise<VoiceCaptureController | null> => {
        if (!supportsPcmVoiceCapture()) {
          return null
        }
        try {
          return await startPcmVoiceCapture({
            stream,
            requestedSampleRateHz: pcmContract.sampleRateHz,
            frameDurationMs: pcmContract.frameDurationMs,
            preferredCapturePath: options?.preferredCapturePath,
            onFrame: (framePayload) => {
              if (
                framePayload.sampleRateHz !== pcmContract.sampleRateHz
                || framePayload.frameDurationMs !== pcmContract.frameDurationMs
                || framePayload.frameBytes !== pcmContract.frameBytes
              ) {
                realtimeIngestFailedReason = "voice_pcm_contract_mismatch"
                return
              }
              queueRealtimePcmFrameIngest(framePayload)
            },
            onCaptured: handleCapturedAudio,
            onError: handleCaptureError,
          })
        } catch {
          return null
        }
      }

      const startMediaRecorderFallbackCapture = () => startMediaRecorderVoiceCapture({
        stream,
        preferredMimeTypes: resolveVoiceCapturePreferredMimeTypes("elevenlabs"),
        fallbackMimeType: resolveVoiceCaptureFallbackMimeType("elevenlabs"),
        onCaptured: handleCapturedAudio,
        onError: handleCaptureError,
      })
      const scriptProcessorSupported = supportsScriptProcessorVoiceCapture()
      const workletSupported = supportsAudioWorkletVoiceCapture()
      const mediaRecorderSupported = supportsMediaRecorderVoiceCapture()
      const noFrameFallbackAttemptedMethods = new Set<VoiceCaptureMethod>()

      const rememberCaptureMethodAttempt = (method: VoiceCaptureMethod) => {
        noFrameFallbackAttemptedMethods.add(method)
      }

      const hasAttemptedCaptureMethod = (method: VoiceCaptureMethod) =>
        noFrameFallbackAttemptedMethods.has(method)

      const startScriptProcessorCapture = async (): Promise<VoiceCaptureController | null> => {
        if (!scriptProcessorSupported) {
          return null
        }
        const controller = await startSegmentedPcmCapture({
          preferredCapturePath: "script_processor_only",
        })
        if (controller?.method === "pcm_script_processor") {
          return controller
        }
        controller?.cancel()
        return null
      }

      const startWorkletCapture = async (): Promise<VoiceCaptureController | null> => {
        if (!workletSupported) {
          return null
        }
        const controller = await startSegmentedPcmCapture()
        if (controller?.method === "pcm_audio_worklet") {
          return controller
        }
        controller?.cancel()
        return null
      }

      const attemptNoFrameFallback = async (
        activeController: VoiceCaptureController,
        trigger: "timer" | "heartbeat_watchdog"
      ): Promise<VoiceCaptureController | null> => {
        if (captureFrameCounter > 0) {
          return null
        }
        if (voiceCaptureControllerRef.current !== activeController) {
          return null
        }
        const isActiveCaptureSession =
          activeRealtimeLiveSessionIdRef.current === liveSessionId
          && activeRealtimeVoiceSessionIdRef.current === openedVoiceSession.voiceSessionId
        if (!isActiveCaptureSession) {
          return null
        }

        activeController.cancel()

        if (
          activeController.method === "pcm_audio_worklet"
          && scriptProcessorSupported
          && !hasAttemptedCaptureMethod("pcm_script_processor")
        ) {
          console.warn("[VoiceRuntime] web_audio_capture_pcm_no_frames_script_retry", {
            liveSessionId,
            voiceSessionId: openedVoiceSession.voiceSessionId,
            captureMethod: activeController.method,
            timeoutMs: PCM_NO_FRAME_FALLBACK_TIMEOUT_MS,
            trigger,
          })
          const scriptProcessorController = await startScriptProcessorCapture()
          if (scriptProcessorController) {
            rememberCaptureMethodAttempt(scriptProcessorController.method)
            voiceCaptureControllerRef.current = scriptProcessorController
            realtimeIngestFailedReason =
              realtimeIngestFailedReason
              || "pcm_audio_worklet_no_frames_script_processor_retry"
            scheduleCaptureTimers(() => voiceCaptureControllerRef.current)
            armPcmNoFrameFallbackTimer(scriptProcessorController)
            console.info("[VoiceRuntime] web_audio_capture_listening", {
              liveSessionId,
              voiceSessionId: openedVoiceSession.voiceSessionId,
              captureMethod: scriptProcessorController.method,
              fallbackReason: "pcm_audio_worklet_no_frames",
              trigger,
            })
            return scriptProcessorController
          }
        }

        if (
          activeController.method === "pcm_script_processor"
          && workletSupported
          && !hasAttemptedCaptureMethod("pcm_audio_worklet")
        ) {
          console.warn("[VoiceRuntime] web_audio_capture_pcm_no_frames_worklet_retry", {
            liveSessionId,
            voiceSessionId: openedVoiceSession.voiceSessionId,
            captureMethod: activeController.method,
            timeoutMs: PCM_NO_FRAME_FALLBACK_TIMEOUT_MS,
            trigger,
          })
          const workletController = await startWorkletCapture()
          if (workletController) {
            rememberCaptureMethodAttempt(workletController.method)
            voiceCaptureControllerRef.current = workletController
            realtimeIngestFailedReason =
              realtimeIngestFailedReason
              || "pcm_script_processor_no_frames_audio_worklet_retry"
            scheduleCaptureTimers(() => voiceCaptureControllerRef.current)
            armPcmNoFrameFallbackTimer(workletController)
            console.info("[VoiceRuntime] web_audio_capture_listening", {
              liveSessionId,
              voiceSessionId: openedVoiceSession.voiceSessionId,
              captureMethod: workletController.method,
              fallbackReason: "pcm_script_processor_no_frames",
              trigger,
            })
            return workletController
          }
        }

        if (!mediaRecorderSupported || hasAttemptedCaptureMethod("media_recorder_fallback")) {
          throw new Error("pcm_capture_no_frames_timeout")
        }
        console.warn("[VoiceRuntime] web_audio_capture_pcm_no_frames_fallback", {
          liveSessionId,
          voiceSessionId: openedVoiceSession.voiceSessionId,
          captureMethod: activeController.method,
          timeoutMs: PCM_NO_FRAME_FALLBACK_TIMEOUT_MS,
          trigger,
        })
        const fallbackController = startMediaRecorderFallbackCapture()
        rememberCaptureMethodAttempt(fallbackController.method)
        voiceCaptureControllerRef.current = fallbackController
        realtimeIngestFailedReason =
          realtimeIngestFailedReason || "pcm_capture_no_frames_media_recorder_fallback"
        notification.info(
          "Voice Capture Fallback",
          "PCM capture produced no frames; switched to recorder fallback."
        )
        scheduleCaptureTimers(() => voiceCaptureControllerRef.current)
        console.info("[VoiceRuntime] web_audio_capture_listening", {
          liveSessionId,
          voiceSessionId: openedVoiceSession.voiceSessionId,
          captureMethod: fallbackController.method,
          fallbackReason: "pcm_capture_no_frames",
          trigger,
        })
        return fallbackController
      }

      let controller: VoiceCaptureController | null = null
      controller = await startWorkletCapture()
      if (controller?.method === "pcm_audio_worklet") {
        rememberCaptureMethodAttempt(controller.method)
      }
      if (!controller && scriptProcessorSupported) {
        if (workletSupported) {
          console.warn("[VoiceRuntime] web_audio_capture_worklet_primary_start_failed_script_retry", {
            liveSessionId,
            voiceSessionId: openedVoiceSession.voiceSessionId,
          })
        }
        controller = await startScriptProcessorCapture()
        if (controller?.method === "pcm_script_processor") {
          rememberCaptureMethodAttempt(controller.method)
          realtimeIngestFailedReason =
            realtimeIngestFailedReason
            || "pcm_audio_worklet_start_failed_script_processor_retry"
        }
      }
      if (!controller) {
        if (!mediaRecorderSupported) {
          throw new Error("voice_pcm_capture_unavailable_no_fallback")
        }
        controller = startMediaRecorderFallbackCapture()
        rememberCaptureMethodAttempt(controller.method)
        notification.info(
          "Voice Capture Fallback",
          "PCM capture unsupported; using container fallback for this browser."
        )
        realtimeIngestFailedReason = "pcm_capture_unavailable_media_recorder_fallback"
      }

      const armPcmNoFrameFallbackTimer = (activeController: VoiceCaptureController) => {
        if (activeController.method === "media_recorder_fallback") {
          return
        }
        pcmNoFrameFallbackTimerId = window.setTimeout(() => {
          if (captureFrameCounter > 0) {
            return
          }
          if (voiceCaptureControllerRef.current !== activeController) {
            return
          }
          void (async () => {
            try {
              const fallbackController = await attemptNoFrameFallback(activeController, "timer")
              if (fallbackController) {
                captureControllerStartedAtMs = Date.now()
              }
            } catch (fallbackError) {
              handleCaptureError(fallbackError)
            }
          })()
        }, PCM_NO_FRAME_FALLBACK_TIMEOUT_MS)
      }

      voiceCaptureControllerRef.current = controller
      captureControllerStartedAtMs = Date.now()
      setVoiceCaptureStateSafe("listening")
      scheduleCaptureTimers(() => voiceCaptureControllerRef.current)
      armPcmNoFrameFallbackTimer(controller)
      console.info("[VoiceRuntime] web_audio_capture_listening", {
        liveSessionId,
        voiceSessionId: openedVoiceSession.voiceSessionId,
        captureMethod: controller.method,
      })
    } catch (error) {
      clearCaptureTimers()
      releaseVoiceMediaStream()
      setVoiceCaptureStateSafe("idle")
      activeRealtimeLiveSessionIdRef.current = null
      activeRealtimeVoiceSessionIdRef.current = null
      activeRealtimeInterviewSessionIdRef.current = null
      activeRealtimeTransportRouteRef.current = INITIAL_REALTIME_TRANSPORT_ROUTE
      const errorMessage =
        error instanceof Error ? error.message : "Unable to start runtime voice capture."
      console.error("[VoiceRuntime] web_audio_capture_start_failed", {
        errorMessage,
      })
      setVoiceCaptureError(errorMessage)
      notification.error("Voice Capture Failed", errorMessage)
      if (openedSession) {
        closeVoiceRuntimeSession({
          voiceSessionId: openedSession.voiceSessionId,
          providerId: openedSession.providerId,
          persistentRequestedProviderId: "gemini_live",
          persistentProviderSessionId:
            normalizeOptionalString(
              openedSession.persistentMultimodal?.providerSessionId
            ) || undefined,
          runtimeSession,
          reason: "chat_voice_capture_failed_to_start",
        })
      }
    }
  }

  const startConversationCapture = async () => {
    if (
      isStartingConversation
      || voiceCaptureState === "transcribing"
      || voiceCaptureControllerRef.current
    ) {
      setIsConversationSessionActive(Boolean(voiceCaptureControllerRef.current))
      return
    }

    setIsConversationSessionActive(false)
    conversationStartingRef.current = true
    setIsStartingConversation(true)
    setLiveUserTranscriptDraft("")
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

      if (voiceCaptureState !== "listening") {
        await startVoiceCapture({
          includeStarterGreeting: true,
        })
      }
      const sessionActive = Boolean(voiceCaptureControllerRef.current)
      setIsConversationSessionActive(sessionActive)
      if (sessionActive) {
        conversationStartedAtRef.current = Date.now()
      }
    } finally {
      conversationStartingRef.current = false
      setIsStartingConversation(false)
    }
  }

  const endConversationSession = (reason: string = "operator_end_control") => {
    if (conversationEndInFlightRef.current || isConversationEnding) {
      return
    }
    conversationEndInFlightRef.current = true
    conversationEndingRef.current = true
    console.info("[conversation_event] end_requested", {
      reason,
      voiceCaptureState,
      cameraSessionState: cameraLiveSession?.sessionState ?? null,
    })
    setIsConversationSessionActive(false)
    setIsConversationEnding(true)
    if (voiceCaptureState === "listening") {
      stopVoiceCapture()
    }
    if (cameraLiveSession?.sessionState === "capturing") {
      stopVisionStream("conversation_end_control")
    }
    activeConversationEyesSourceRef.current = null
    setPendingVoiceRuntime(null)
    setLiveUserTranscriptDraft("")
    setCameraVisionError(null)
    setConversationState("ended")
    setConversationReasonCode(undefined)
    setTimeout(() => {
      conversationEndingRef.current = false
      setIsConversationEnding(false)
      setConversationState("idle")
      conversationEndInFlightRef.current = false
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

  const handleConversationModeChange = (nextMode: ConversationModeSelection) => {
    const transition = resolveDesktopConversationModeTransition({
      currentMode: conversationModeSelection,
      nextMode,
      currentEyesSource: conversationEyesSourceSelection,
    })
    setConversationModeSelection(transition.mode)
    setConversationEyesSourceSelection(transition.eyesSource)
  }

  const handleConversationEyesToggle = () => {
    if (cameraLiveSession?.sessionState === "capturing") {
      stopVisionStream("conversation_eyes_toggle_off")
      setConversationModeSelection("voice")
      setConversationReasonCode(undefined)
      activeConversationEyesSourceRef.current = null
      emitConversationEvent("conversation_eyes_source_changed", {
        eyesSource: "none",
        mode: "voice",
      })
      return
    }

    if (conversationModeSelection === "voice_with_eyes") {
      stopVisionStream("conversation_eyes_toggle_off")
      setConversationModeSelection("voice")
      setConversationReasonCode(undefined)
      activeConversationEyesSourceRef.current = null
      emitConversationEvent("conversation_eyes_source_changed", {
        eyesSource: "none",
        mode: "voice",
      })
      return
    }

    void (async () => {
      const started = await startVisionStream()
      if (started) {
        setConversationModeSelection("voice_with_eyes")
        setConversationReasonCode(undefined)
        activeConversationEyesSourceRef.current = conversationEyesSourceSelection
        emitConversationEvent("conversation_eyes_source_changed", {
          eyesSource: conversationEyesSourceSelection,
          mode: "voice_with_eyes",
        })
      }
    })()
  }

  const handleConversationOrbPress = () => {
    if (isConversationEnding || isStartingConversation) {
      return
    }

    if (isConversationActive || conversationState === "ending") {
      const startedAt = conversationStartedAtRef.current
      if (
        startedAt > 0
        && Date.now() - startedAt < CONVERSATION_ORB_END_GUARD_MS
      ) {
        return
      }
      endConversationSession("orb_press")
      return
    }

    console.info("[conversation_event] start_requested_from_orb")
    void startConversationCapture()
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

  const resolveCollaborationOption = () =>
    collaborationContext
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

  const buildConversationRuntimeMetadataEnvelope = (
    voiceRuntimeOverride?: AIChatVoiceRuntimeMetadata
  ) => {
    const voiceRuntimeBase = voiceRuntimeOverride || pendingVoiceRuntime || undefined
    const normalizedLiveSessionId =
      voiceRuntimeBase?.liveSessionId
      || cameraLiveSession?.liveSessionId
    const cameraRuntimeFallbackReason =
      normalizeDesktopCameraFallbackReason(
        cameraVisionError ?? cameraLiveSession?.fallbackReason
      ) ?? null
    const cameraRuntime: AIChatCameraRuntimeMetadata | undefined =
      normalizedLiveSessionId
      || cameraLiveSession
      || cameraVisionError
      || conversationModeSelection === "voice_with_eyes"
        ? {
            provider: cameraLiveSession?.provider ?? "browser_getusermedia",
            liveSessionId: normalizedLiveSessionId,
            sessionState: cameraLiveSession?.sessionState ?? "idle",
            sourceMode:
              conversationModeSelection === "voice_with_eyes"
                ? conversationEyesSourceSelection
                : "voice",
            sourceClass:
              conversationModeSelection === "voice_with_eyes"
                ? conversationEyesSourceSelection
                : undefined,
            sourceId:
              conversationModeSelection === "voice_with_eyes"
                ? conversationEyesSourceSelection
                : undefined,
            startedAt: cameraLiveSession?.startedAt,
            stoppedAt: cameraLiveSession?.stoppedAt,
            stopReason: cameraLiveSession?.stopReason,
            frameCaptureCount: cameraLiveSession?.frameCaptureCount || 0,
            frameCadenceMs: cameraLiveSession?.frameCadenceMs,
            frameCadenceFps: cameraLiveSession?.frameCadenceFps,
            fallbackReason: cameraRuntimeFallbackReason,
            captureSource: "live_stream_capture",
            sourceHealth: {
              status: cameraRuntimeFallbackReason ? "degraded" : "healthy",
              previewSignal: hasCameraPreviewSignal,
            },
            previewSignalObservedAtMs: cameraPreviewSignalObservedAtRef.current,
            previewRecoveryAttempts: cameraPreviewRecoveryAttemptsRef.current,
            runtimeAuthorityPrecedence: "vc83_runtime_policy",
            routeTarget: "vc83_tool_registry",
          }
        : undefined

    const voiceRuntime = voiceRuntimeBase
      ? {
          ...voiceRuntimeBase,
          liveSessionId: voiceRuntimeBase.liveSessionId || normalizedLiveSessionId,
          sourceMode:
            conversationModeSelection === "voice_with_eyes"
              ? conversationEyesSourceSelection
              : "voice",
        }
      : undefined
    const runtimePath =
      normalizeOptionalString(voiceRuntimeBase?.sessionTransportPath)
        === "persistent_realtime_multimodal"
        ? "persistent_realtime_multimodal"
        : "turn_stitch"

    const geminiLive = buildDesktopGeminiLiveMetadata({
      conversationModeSelection,
      eyesSourceSelection: conversationEyesSourceSelection,
      cameraLiveSession,
    })

    const conversationEchoSelection = resolveRealtimeEchoCancellationSelection({
      hardwareAecSupported:
        voiceRuntimeBase?.echoCancellationHardwareAecSupported === true,
      hardwareAecEnabled:
        voiceRuntimeBase?.echoCancellationHardwareAecEnabled === true,
      forceMuteDuringTts: isConversationMicMuted,
    })
    const conversationPlaybackQueuePolicy =
      (typeof voiceRuntimeBase?.assistantPlaybackQueuePolicy === "string"
        ? voiceRuntimeBase.assistantPlaybackQueuePolicy
        : ASSISTANT_PLAYBACK_QUEUE_POLICY)
    const conversationPlaybackQueueDepth = Math.max(
      0,
      Number(voiceRuntimeBase?.assistantPlaybackQueueDepth || 0)
    )
    const conversationPlaybackQueueInterruptCount = Math.max(
      0,
      Number(voiceRuntimeBase?.assistantPlaybackQueueInterruptCount || 0)
    )

    const conversationRuntime = {
      contractVersion: CONVERSATION_CONTRACT_VERSION,
      state: conversationState,
      reasonCode: conversationReasonCode,
      duplexPolicy: {
        mode:
          runtimePath === "persistent_realtime_multimodal"
            ? ("persistent_streaming_primary" as const)
            : ("batch_fallback_only" as const),
        interruptDetection: "client_vad_barge_in" as const,
        interruptStopAssistantOnSpeech: true,
      },
      vadPolicy: {
        mode: CONVERSATION_VAD_POLICY.mode,
        frameDurationMs: CONVERSATION_VAD_POLICY.frameDurationMs,
        energyThresholdRms: CONVERSATION_VAD_POLICY.energyThresholdRms,
        minSpeechFrames: CONVERSATION_VAD_POLICY.minSpeechFrames,
        endpointSilenceMs: CONVERSATION_VAD_POLICY.endpointSilenceMs,
      },
      videoForwardingPolicy: {
        mode:
          runtimePath === "persistent_realtime_multimodal"
            ? ("persistent_transport_jpeg_throttled" as const)
            : ("manual_capture_only" as const),
        frameMimeType: "image/jpeg" as const,
        cadenceMs: VISION_FORWARDING_CADENCE_MS,
        maxFramesPerWindow: VISION_FORWARDING_MAX_FRAMES_PER_WINDOW,
        windowMs: VISION_FORWARDING_WINDOW_MS,
      },
      ttsPolicy: {
        primaryRoute: TTS_PRIMARY_ROUTE,
        fallbackRoute: TTS_FALLBACK_ROUTE,
        queuePolicy: conversationPlaybackQueuePolicy,
        interruptPolicy: "barge_in_flush_active_and_pending",
      },
      echoCancellationPolicy: {
        strategy: voiceRuntimeBase?.echoCancellationStrategy
          || conversationEchoSelection.strategy,
        reason: voiceRuntimeBase?.echoCancellationReason
          || conversationEchoSelection.reason,
        hardwareAecSupported: conversationEchoSelection.hardwareAecSupported,
        hardwareAecEnabled: conversationEchoSelection.hardwareAecEnabled,
      },
      assistantPlaybackQueue: {
        policy: conversationPlaybackQueuePolicy,
        queueDepth: conversationPlaybackQueueDepth,
        interrupted:
          voiceRuntimeBase?.assistantPlaybackQueueInterrupted === true,
        interruptCount: conversationPlaybackQueueInterruptCount,
      },
      interruptCount: conversationInterruptCountRef.current,
      mode: conversationModeSelection,
      languageLock: voiceInputLanguage,
      language: voiceInputLanguage,
      requestedEyesSource:
        conversationModeSelection === "voice_with_eyes"
          ? conversationEyesSourceSelection
          : "none",
      sourceMode:
        conversationModeSelection === "voice_with_eyes"
          ? conversationEyesSourceSelection
          : "voice",
      runtimePath,
      turnStitchFallbackReason:
        runtimePath === "turn_stitch"
          ? normalizeOptionalString(voiceRuntimeBase?.turnStitchFallbackReason)
          : undefined,
      capabilitySnapshot: conversationCapabilitySnapshot,
    }

    return composeDesktopRuntimeMetadata({
      liveSessionId: normalizedLiveSessionId,
      cameraRuntime,
      voiceRuntime,
      conversationRuntime,
      geminiLive,
    })
  }

  const sendConversationTranscriptTurn = async (
    transcript: string,
    voiceRuntimeMetadata: AIChatVoiceRuntimeMetadata,
    conversationIdOverride?: Id<"aiConversations">
  ): Promise<boolean> => {
    const messageToSend = transcript.trim()
    if (!messageToSend) {
      return false
    }
    if (isSendingRef.current) {
      stopCurrentRequest()
      const waitStartedAtMs = Date.now()
      while (isSendingRef.current && Date.now() - waitStartedAtMs < 800) {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 40)
        })
      }
    }
    if (!isAIReady) {
      notification.error(
        "AI Not Ready",
        "Please configure at least one AI model in Organization Settings > AI before chatting."
      )
      return false
    }

    isSendingRef.current = true
    setIsSending(true)
    abortController.current = new AbortController()
    try {
      const currentConversationIdSnapshot = currentConversationIdRef.current
      const targetConversationId = conversationIdOverride ?? currentConversationIdSnapshot
      if (
        targetConversationId
        && String(targetConversationId) !== String(currentConversationIdSnapshot || "")
      ) {
        setCurrentConversationId(targetConversationId)
        currentConversationIdRef.current = targetConversationId
      }
      const outboundMessage = buildDeterministicOutboundMessage({
        message: messageToSend,
        mode: composerMode,
        reasoningEffort,
        references: [],
        imageAttachments: [],
      })
      const authSessionId = sessionIdRef.current
      const runtimeSession = resolvedVoiceRuntimeSessionRef.current
      const liveSessionId = normalizeOptionalString(voiceRuntimeMetadata.liveSessionId)
      const sessionTransportPath: "persistent_realtime_multimodal" | "turn_stitch" =
        normalizeOptionalString(voiceRuntimeMetadata.sessionTransportPath)
          === "persistent_realtime_multimodal"
          ? "persistent_realtime_multimodal"
          : "turn_stitch"
      const shouldResolveVisionFrame =
        shouldResolveDuplexVoiceTurnVisionFrame({
          conversationModeSelection,
          cameraSessionState: cameraLiveSession?.sessionState,
          cameraVisionError,
          sessionTransportPath,
        })
      let visionFrameResolution: VoiceTurnVisionFrameResolution | undefined
      if (
        shouldResolveVisionFrame
        && authSessionId
        && runtimeSession
        && targetConversationId
      ) {
        try {
          const rawVisionResolution =
            await resolveFreshestVisionFrameForVoiceTurnAction({
              sessionId: authSessionId,
              interviewSessionId: runtimeSession.agentSessionId,
              conversationId: targetConversationId,
              liveSessionId: liveSessionId || undefined,
            })
          visionFrameResolution = normalizeVoiceTurnVisionFrameResolution(
            rawVisionResolution
          )
        } catch (error) {
          console.warn("[VoiceRuntime] voice_turn_vision_frame_resolution_failed", {
            error: error instanceof Error ? error.message : "unknown_error",
            conversationId: String(targetConversationId),
            interviewSessionId: String(runtimeSession.agentSessionId),
          })
        }
      }
      const runtimeMetadata = buildConversationRuntimeMetadataEnvelope({
        ...voiceRuntimeMetadata,
        visionFrameResolution,
      })
      const result = await chat.sendMessage(outboundMessage, targetConversationId, {
        layerWorkflowId: activeLayerWorkflowId,
        mode: composerMode,
        reasoningEffort,
        privacyMode: privateModeEnabled,
        collaboration: resolveCollaborationOption(),
        ...runtimeMetadata,
      })
      if (!currentConversationId && result.conversationId) {
        setCurrentConversationId(result.conversationId)
      }
      return true
    } catch (error) {
      notification.error(
        "Voice Turn Send Failed",
        error instanceof Error ? error.message : "Unable to send transcript turn."
      )
      return false
    } finally {
      isSendingRef.current = false
      setIsSending(false)
      abortController.current = null
    }
  }

  const speakAssistantResponse = useCallback(async (assistantText: string) => {
    const normalizedText = assistantText.trim()
    if (!normalizedText) {
      return
    }
    const runtime = voiceRuntimeRef.current
    const authSessionId = sessionIdRef.current
    const runtimeSession = resolvedVoiceRuntimeSessionRef.current

    if (!runtime || !authSessionId || !runtimeSession) {
      await playSpeechSynthesisText(normalizedText)
      return
    }

    let synthesisVoiceSessionId = activeVoiceSessionIdRef.current
    let synthesisProviderId: VoiceRuntimeProviderId | undefined
    let shouldCloseSynthesisSession = false

    try {
      if (!synthesisVoiceSessionId) {
        const opened = await runtime.openSession({
          requestedProviderId: "elevenlabs",
          requestedVoiceId: preferredRequestedVoiceId,
          voiceSessionId: buildRuntimeSessionId("voice"),
          runtimeContext: {
            authSessionId,
            interviewSessionId: runtimeSession.agentSessionId,
          },
        })
        synthesisVoiceSessionId = opened.voiceSessionId
        synthesisProviderId = opened.providerId
        shouldCloseSynthesisSession = true
      }

      if (!synthesisVoiceSessionId) {
        await playSpeechSynthesisText(normalizedText)
        return
      }

      const synthesis = await runtime.synthesizePreview({
        voiceSessionId: synthesisVoiceSessionId,
        text: normalizedText,
        requestedProviderId: "elevenlabs",
        requestedVoiceId: preferredRequestedVoiceId,
        speakBrowserFallback: false,
        runtimeContext: {
          authSessionId,
          interviewSessionId: runtimeSession.agentSessionId,
        },
      })

      if (synthesis.success && synthesis.playbackDataUrl) {
        await playAudioDataUrl(synthesis.playbackDataUrl)
        return
      }
      if (synthesis.success && synthesis.fallbackText) {
        await playSpeechSynthesisText(synthesis.fallbackText)
        return
      }
      await playSpeechSynthesisText(normalizedText)
    } catch (error) {
      console.warn("[VoiceRuntime] assistant_reply_playback_failed", {
        error: error instanceof Error ? error.message : "unknown_error",
      })
      await playSpeechSynthesisText(normalizedText)
    } finally {
      if (
        shouldCloseSynthesisSession
        && synthesisVoiceSessionId
        && runtime
        && authSessionId
        && runtimeSession
      ) {
        void runtime.closeSession({
          voiceSessionId: synthesisVoiceSessionId,
          activeProviderId: synthesisProviderId,
          reason: "chat_assistant_reply_playback_complete",
          runtimeContext: {
            authSessionId,
            interviewSessionId: runtimeSession.agentSessionId,
          },
        }).catch(() => {})
      }
    }
  }, [preferredRequestedVoiceId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (voiceCaptureState === "listening" || voiceCaptureState === "transcribing") {
      notification.info(
        "Voice Capture In Progress",
        "Stop the active microphone capture before sending."
      )
      return
    }
    if (
      (!message.trim() && imageAttachments.length === 0)
      || isSending
      || isSendingRef.current
      || isFetchingReferences
    ) return

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

    isSendingRef.current = true
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
      const cameraRuntimeFallbackReason =
        normalizeDesktopCameraFallbackReason(
          cameraVisionError ?? cameraLiveSession?.fallbackReason
        ) ?? null
      const cameraRuntime: AIChatCameraRuntimeMetadata | undefined =
        normalizedLiveSessionId
        || cameraLiveSession
        || cameraVisionError
        || conversationModeSelection === "voice_with_eyes"
          ? {
              provider: cameraLiveSession?.provider ?? "browser_getusermedia",
              liveSessionId: normalizedLiveSessionId,
              sessionState:
                cameraLiveSession?.sessionState
                ?? (liveVisionAttachments.length > 0 ? "stopped" : "idle"),
              sourceMode:
                conversationModeSelection === "voice_with_eyes"
                  ? conversationEyesSourceSelection
                  : "voice",
              sourceClass:
                conversationModeSelection === "voice_with_eyes"
                  ? conversationEyesSourceSelection
                  : undefined,
              sourceId:
                conversationModeSelection === "voice_with_eyes"
                  ? conversationEyesSourceSelection
                  : undefined,
              startedAt: cameraLiveSession?.startedAt,
              stoppedAt: cameraLiveSession?.stoppedAt,
              stopReason: cameraLiveSession?.stopReason,
              frameCaptureCount: Math.max(
                cameraLiveSession?.frameCaptureCount ?? 0,
                liveVisionAttachments.length
              ),
              frameCadenceMs: cameraLiveSession?.frameCadenceMs,
              frameCadenceFps: cameraLiveSession?.frameCadenceFps,
              fallbackReason: cameraRuntimeFallbackReason,
              captureSource:
                liveVisionAttachments.length > 0 ? "live_stream_capture" : "upload_only",
              sourceHealth: {
                status: cameraRuntimeFallbackReason ? "degraded" : "healthy",
                previewSignal: hasCameraPreviewSignal,
              },
              previewSignalObservedAtMs: cameraPreviewSignalObservedAtRef.current,
              previewRecoveryAttempts: cameraPreviewRecoveryAttemptsRef.current,
              runtimeAuthorityPrecedence: "vc83_runtime_policy",
              routeTarget: "vc83_tool_registry",
            }
          : undefined
      const voiceRuntime = pendingVoiceRuntime
        ? {
            ...pendingVoiceRuntime,
            liveSessionId: pendingVoiceRuntime.liveSessionId || normalizedLiveSessionId,
            sourceMode:
              conversationModeSelection === "voice_with_eyes"
                ? conversationEyesSourceSelection
              : "voice",
          }
        : undefined
      const runtimePath =
        normalizeOptionalString(pendingVoiceRuntime?.sessionTransportPath)
          === "persistent_realtime_multimodal"
          ? "persistent_realtime_multimodal"
          : "turn_stitch"
      const geminiLive = buildDesktopGeminiLiveMetadata({
        conversationModeSelection,
        eyesSourceSelection: conversationEyesSourceSelection,
        cameraLiveSession,
      })

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
      const conversationEchoSelection = resolveRealtimeEchoCancellationSelection({
        hardwareAecSupported:
          pendingVoiceRuntime?.echoCancellationHardwareAecSupported === true,
        hardwareAecEnabled:
          pendingVoiceRuntime?.echoCancellationHardwareAecEnabled === true,
        forceMuteDuringTts: isConversationMicMuted,
      })
      const conversationPlaybackQueuePolicy =
        (typeof pendingVoiceRuntime?.assistantPlaybackQueuePolicy === "string"
          ? pendingVoiceRuntime.assistantPlaybackQueuePolicy
          : ASSISTANT_PLAYBACK_QUEUE_POLICY)
      const conversationPlaybackQueueDepth = Math.max(
        0,
        Number(pendingVoiceRuntime?.assistantPlaybackQueueDepth || 0)
      )
      const conversationPlaybackQueueInterruptCount = Math.max(
        0,
        Number(pendingVoiceRuntime?.assistantPlaybackQueueInterruptCount || 0)
      )
      const conversationRuntime = {
        contractVersion: CONVERSATION_CONTRACT_VERSION,
        state: conversationState,
        reasonCode: conversationReasonCode,
        duplexPolicy: {
          mode:
            runtimePath === "persistent_realtime_multimodal"
              ? ("persistent_streaming_primary" as const)
              : ("batch_fallback_only" as const),
          interruptDetection: "client_vad_barge_in" as const,
          interruptStopAssistantOnSpeech: true,
        },
        vadPolicy: {
          mode: CONVERSATION_VAD_POLICY.mode,
          frameDurationMs: CONVERSATION_VAD_POLICY.frameDurationMs,
          energyThresholdRms: CONVERSATION_VAD_POLICY.energyThresholdRms,
          minSpeechFrames: CONVERSATION_VAD_POLICY.minSpeechFrames,
          endpointSilenceMs: CONVERSATION_VAD_POLICY.endpointSilenceMs,
        },
        videoForwardingPolicy: {
          mode:
            runtimePath === "persistent_realtime_multimodal"
              ? ("persistent_transport_jpeg_throttled" as const)
              : ("manual_capture_only" as const),
          frameMimeType: "image/jpeg" as const,
          cadenceMs: VISION_FORWARDING_CADENCE_MS,
          maxFramesPerWindow: VISION_FORWARDING_MAX_FRAMES_PER_WINDOW,
          windowMs: VISION_FORWARDING_WINDOW_MS,
        },
        ttsPolicy: {
          primaryRoute: TTS_PRIMARY_ROUTE,
          fallbackRoute: TTS_FALLBACK_ROUTE,
          queuePolicy: conversationPlaybackQueuePolicy,
          interruptPolicy: "barge_in_flush_active_and_pending",
        },
        echoCancellationPolicy: {
          strategy: pendingVoiceRuntime?.echoCancellationStrategy
            || conversationEchoSelection.strategy,
          reason: pendingVoiceRuntime?.echoCancellationReason
            || conversationEchoSelection.reason,
          hardwareAecSupported: conversationEchoSelection.hardwareAecSupported,
          hardwareAecEnabled: conversationEchoSelection.hardwareAecEnabled,
        },
        assistantPlaybackQueue: {
          policy: conversationPlaybackQueuePolicy,
          queueDepth: conversationPlaybackQueueDepth,
          interrupted:
            pendingVoiceRuntime?.assistantPlaybackQueueInterrupted === true,
          interruptCount: conversationPlaybackQueueInterruptCount,
        },
        interruptCount: conversationInterruptCountRef.current,
        mode: conversationModeSelection,
        languageLock: voiceInputLanguage,
        language: voiceInputLanguage,
        requestedEyesSource:
          conversationModeSelection === "voice_with_eyes"
            ? conversationEyesSourceSelection
            : "none",
        sourceMode:
          conversationModeSelection === "voice_with_eyes"
            ? conversationEyesSourceSelection
            : "voice",
        runtimePath,
        turnStitchFallbackReason:
          runtimePath === "turn_stitch"
            ? normalizeOptionalString(
                pendingVoiceRuntime?.turnStitchFallbackReason
              )
            : undefined,
        capabilitySnapshot: conversationCapabilitySnapshot,
      }
      const runtimeMetadata = composeDesktopRuntimeMetadata({
        liveSessionId: normalizedLiveSessionId,
        cameraRuntime,
        voiceRuntime,
        conversationRuntime,
        geminiLive,
      })

      const result = await chat.sendMessage(outboundMessage, currentConversationId, {
        layerWorkflowId: activeLayerWorkflowId,
        mode: composerMode,
        reasoningEffort,
        privacyMode: privateModeEnabled,
        references: referencesToSend,
        attachments: structuredAttachments,
        collaboration: collaborationOption,
        ...runtimeMetadata,
      })

      if (!currentConversationId && result.conversationId) {
        setCurrentConversationId(result.conversationId)
      }

      const keepVisionStreamForLiveConversation =
        conversationModeSelection === "voice_with_eyes"
        && (
          conversationState === "connecting"
          || conversationState === "live"
          || conversationState === "reconnecting"
        )
      if (cameraLiveSession?.sessionState === "capturing" && !keepVisionStreamForLiveConversation) {
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
      isSendingRef.current = false
      setIsSending(false)
      abortController.current = null
    }
  }

  const startFrontlineIntake = async () => {
    if (isSending || isSendingRef.current || isFetchingReferences) {
      return
    }

    const lastUserMessage = message.trim().length > 0 ? message.trim() : undefined
    const kickoff = buildFrontlineFeatureIntakeKickoff({
      trigger: "manual_feedback",
      lastUserMessage,
    })

    isSendingRef.current = true
    setIsSending(true)
    abortController.current = new AbortController()
    try {
      setMessage("")
      const result = await chat.sendMessage(kickoff, currentConversationId, {
        layerWorkflowId: activeLayerWorkflowId,
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
      isSendingRef.current = false
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
  const isConversationActive =
    conversationState === "connecting"
    || conversationState === "live"
    || conversationState === "reconnecting"
    || isVoiceListening
    || Boolean(voiceCaptureControllerRef.current)
  const shouldKeepConversationStageVisible =
    resolveConversationStageVisibility({
      isConversationStageOpen,
      isConversationActive,
      isConversationSessionActive,
      conversationState,
      isStartingConversation,
      isConversationEnding,
    })

  useEffect(() => {
    onConversationStageVisibilityChange?.(shouldKeepConversationStageVisible)
  }, [onConversationStageVisibilityChange, shouldKeepConversationStageVisible])

  useEffect(() => {
    return () => {
      onConversationStageVisibilityChange?.(false)
    }
  }, [onConversationStageVisibilityChange])

  const controlDisabled = isSending || isFetchingReferences
  const conversationTurnHudLabel =
    (isVoiceTranscribing || isSending)
      ? "THINKING"
      : isVoiceListening
        ? "LISTENING"
        : "IDLE"
  const conversationStateLabel =
    conversationState === "connecting"
      ? "Connecting"
      : conversationState === "live"
        ? "Live"
        : conversationState === "reconnecting"
          ? "Reconnecting"
          : conversationState === "ending"
            ? "Ending"
            : conversationState === "ended"
              ? "Ended"
              : conversationState === "error"
                ? "Error"
                : "Idle"
  const cameraDiagnosticLabel = formatCameraDiagnosticReason(
    cameraVisionError || cameraLiveSession?.fallbackReason
  )
  const latestConversationUserMessage = useMemo(() => {
    for (let index = chat.messages.length - 1; index >= 0; index -= 1) {
      const nextMessage = chat.messages[index]
      if (nextMessage?.role === "user" && typeof nextMessage.content === "string") {
        const normalizedContent = nextMessage.content.trim()
        if (normalizedContent.length > 0) {
          return normalizedContent
        }
      }
    }
    return ""
  }, [chat.messages])
  const latestConversationAssistantTurn = useMemo(() => {
    for (let index = chat.messages.length - 1; index >= 0; index -= 1) {
      const nextMessage = chat.messages[index]
      if (nextMessage?.role === "assistant" && typeof nextMessage.content === "string") {
        const normalizedContent = nextMessage.content.trim()
        if (normalizedContent.length > 0) {
          return {
            messageId:
              typeof nextMessage._id === "string"
                ? nextMessage._id
                : undefined,
            content: normalizedContent,
          }
        }
      }
    }
    return null
  }, [chat.messages])
  const latestConversationAssistantMessage = latestConversationAssistantTurn?.content || ""
  const liveInterruptionMarker =
    (isVoiceTranscribing || isSending)
      ? "thinking"
      : isVoiceListening
        ? "barge_in_armed"
        : "idle"
  const conversationLiveUserText = liveUserTranscriptDraft || latestConversationUserMessage
  const conversationLiveAssistantText = latestConversationAssistantMessage

  useEffect(() => {
    const assistantText = latestConversationAssistantTurn?.content || ""
    if (!assistantText) {
      return
    }
    if (
      !conversationSessionActiveRef.current
      || conversationEndingRef.current
      || isConversationMicMuted
    ) {
      return
    }
    const messageSignature = latestConversationAssistantTurn?.messageId || assistantText
    if (lastSpokenAssistantMessageRef.current === messageSignature) {
      return
    }
    lastSpokenAssistantMessageRef.current = messageSignature
    void speakAssistantResponse(assistantText)
  }, [
    isConversationMicMuted,
    latestConversationAssistantTurn,
    speakAssistantResponse,
  ])
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
    if (isConversationSessionActive || isConversationActive) {
      return
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
    const blockingVisionError =
      conversationModeSelection === "voice_with_eyes"
        ? cameraVisionError
        : null
    const nextState: ConversationSessionState = resolveConversationSessionState({
      currentState: conversationState,
      isConversationEnding,
      isStartingConversation,
      isVoiceListening,
      isVoiceTranscribing,
      hasPendingVoiceRuntime: Boolean(pendingVoiceRuntime),
      hasConversationSessionActive: isConversationSessionActive,
      isSendingAssistantTurn: isSending,
      blockingVisionError,
      voiceCaptureError,
    })

    const nextReason =
      nextState === "error"
        ? inferConversationReasonCode(blockingVisionError || voiceCaptureError)
        : nextState === "reconnecting"
          ? "transport_failed"
          : undefined

    setConversationState((current) => (current === nextState ? current : nextState))
    setConversationReasonCode((current) => (current === nextReason ? current : nextReason))
  }, [
    conversationModeSelection,
    cameraVisionError,
    conversationState,
    isConversationEnding,
    isStartingConversation,
    isVoiceListening,
    isVoiceTranscribing,
    isConversationSessionActive,
    isSending,
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
    if (cameraLiveSession?.sessionState !== "capturing") {
      return
    }
    if (hasCameraPreviewSignal || !cameraStreamRef.current) {
      return
    }
    let cancelled = false
    void (async () => {
      const activeStream = cameraStreamRef.current
      if (!activeStream) {
        return
      }
      const attached = await attachVisionStreamToPreview(activeStream, 1800)
      if (cancelled || !attached) {
        return
      }
      setCameraVisionError(null)
      setCameraLiveSession((current) =>
        current
          ? {
              ...current,
              sessionState: "capturing",
              fallbackReason: undefined,
            }
          : current
      )
    })()
    return () => {
      cancelled = true
    }
  }, [
    cameraLiveSession?.liveSessionId,
    cameraLiveSession?.sessionState,
    hasCameraPreviewSignal,
    isConversationStageOpen,
  ])

  useEffect(() => {
    if (cameraLiveSession?.sessionState !== "capturing") {
      return
    }
    if (hasCameraPreviewSignal) {
      return
    }
    const triggerRecovery = () => {
      if (cameraPreviewRecoveryInFlightRef.current) {
        return
      }
      cameraPreviewRecoveryInFlightRef.current = true
      void recoverCameraPreview().finally(() => {
        cameraPreviewRecoveryInFlightRef.current = false
      })
    }
    if (
      shouldRecoverBlankDesktopVisionPreview({
        sessionState: cameraLiveSession.sessionState,
        hasPreviewSignal: hasCameraPreviewSignal,
        startedAt: cameraLiveSession.startedAt,
        previewSignalObservedAtMs: cameraPreviewSignalObservedAtRef.current,
        blankPreviewGraceMs: CAMERA_PREVIEW_BLANK_RECOVERY_GRACE_MS,
      })
    ) {
      triggerRecovery()
      return
    }
    const baselineMs =
      cameraPreviewSignalObservedAtRef.current
      || cameraLiveSession.startedAt
      || Date.now()
    const elapsedMs = Date.now() - baselineMs
    const waitMs = Math.max(120, CAMERA_PREVIEW_BLANK_RECOVERY_GRACE_MS - elapsedMs)
    const timerId = window.setTimeout(() => {
      triggerRecovery()
    }, waitMs)
    return () => {
      window.clearTimeout(timerId)
    }
  }, [cameraLiveSession, hasCameraPreviewSignal])

  useEffect(() => {
    const decision = evaluateDesktopVisionDegradeGuard({
      conversationModeSelection,
      conversationState,
      activeEyesSource: activeConversationEyesSourceRef.current,
      cameraLiveSession,
      cameraVisionError,
      hasCameraPreviewSignal,
      previewSignalObservedAtMs: cameraPreviewSignalObservedAtRef.current,
      startupGraceMs: CAMERA_STARTUP_DEGRADE_GRACE_MS,
      blankPreviewGraceMs: CAMERA_PREVIEW_BLANK_RECOVERY_GRACE_MS,
    })
    if (!decision.shouldDegrade || !decision.source) {
      return
    }
    degradeConversationToVoice(decision.reason || "device_unavailable", decision.source)
  }, [
    cameraLiveSession,
    cameraVisionError,
    conversationModeSelection,
    conversationState,
    hasCameraPreviewSignal,
  ])

  useEffect(() => {
    if (conversationModeSelection !== "voice_with_eyes") {
      return
    }
    if (conversationState !== "live" && conversationState !== "reconnecting") {
      return
    }
    if (voiceCaptureState !== "listening" || isConversationMicMuted) {
      return
    }
    if (cameraLiveSession?.sessionState !== "capturing") {
      return
    }
    if (!sessionId || !resolvedVoiceRuntimeSession || !activeVoiceSessionId) {
      return
    }

    let cancelled = false
    const runForwardingTick = () => {
      if (cancelled || realtimeVisionForwardInFlightRef.current) {
        return
      }
      realtimeVisionForwardInFlightRef.current = true
      void forwardVisionFrameToRealtimeTransport({
        source: "interval",
      }).finally(() => {
        realtimeVisionForwardInFlightRef.current = false
      })
    }

    runForwardingTick()
    const intervalId = window.setInterval(runForwardingTick, VISION_FORWARDING_CADENCE_MS)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeVoiceSessionId,
    cameraLiveSession?.sessionState,
    conversationModeSelection,
    conversationState,
    isConversationMicMuted,
    resolvedVoiceRuntimeSession,
    sessionId,
    voiceCaptureState,
  ])

  return (
    <form
      onSubmit={handleSubmit}
      className={
        shouldKeepConversationStageVisible
          ? "absolute inset-0 h-full px-4 pb-4 pt-2"
          : "relative px-4 pb-4 pt-2"
      }
      style={{
        zIndex: shouldKeepConversationStageVisible ? 60 : 10,
        background: shouldKeepConversationStageVisible
          ? "var(--shell-background)"
          : "linear-gradient(180deg, transparent 0%, var(--shell-surface) 40%, var(--shell-surface) 100%)",
      }}
    >
      <div
        className={
          shouldKeepConversationStageVisible
            ? "hidden"
            : "mx-auto w-full max-w-4xl"
        }
      >
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

          {cameraLiveSession
          && !shouldKeepConversationStageVisible
          && (conversationModeSelection === "voice_with_eyes" || showChatDebugMetadata) ? (
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
              <div
                className="relative h-44 w-full overflow-hidden rounded-xl"
                style={{ background: "var(--shell-surface-elevated)" }}
              >
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedData={() => setCameraPreviewSignal(true)}
                  onPlaying={() => setCameraPreviewSignal(true)}
                  onEmptied={() => setCameraPreviewSignal(false)}
                  onEnded={() => setCameraPreviewSignal(false)}
                  onError={() => setCameraPreviewSignal(false)}
                  className="h-full w-full object-cover"
                />
                {!hasCameraPreviewSignal ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs"
                    style={{ color: "var(--shell-text-dim)" }}
                  >
                    {cameraLiveSession.sessionState === "capturing"
                      ? "Waiting for camera preview signal..."
                      : "Vision stream is stopped. Use Eyes mode controls to restart or exit."}
                  </div>
                ) : null}
              </div>
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
                {cameraDiagnosticLabel ? (
                  <span className="text-xs" style={{ color: "var(--error)" }}>
                    camera: {cameraDiagnosticLabel}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {showChatDebugMetadata || voiceCaptureError ? (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {showChatDebugMetadata && isVoiceListening && activeVoiceSessionId ? (
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
              {showChatDebugMetadata && pendingVoiceRuntime ? (
                <span
                  className="rounded-full border px-2.5 py-1 text-xs"
                  style={{
                    borderColor: "var(--shell-border-soft)",
                    background: "var(--shell-surface)",
                    color: "var(--shell-text-dim)",
                  }}
                >
                  Voice runtime {pendingVoiceRuntime.providerId || "unknown"} •
                  {pendingVoiceRuntime.transcribeStatus || "unknown"} •
                  {normalizeOptionalString(pendingVoiceRuntime.sessionTransportPath)
                    || "turn_stitch"}
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

            <div className="relative flex shrink-0 items-center gap-2">
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
                    aria-expanded={shouldKeepConversationStageVisible}
                    onClick={() => setIsConversationStageOpen(true)}
                    disabled={controlDisabled || isVoiceTranscribing}
                    aria-label="Open conversation settings"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      borderColor: isConversationStageOpen
                        ? "var(--shell-neutral-active-border)"
                        : "var(--shell-border-soft)",
                      background: isConversationStageOpen
                        ? "var(--shell-neutral-hover-surface)"
                        : "var(--shell-surface)",
                      color: "var(--shell-text)",
                    }}
                    title="Choose conversation mode"
                  >
                    <MessageSquare size={14} />
                  </button>
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

      {shouldKeepConversationStageVisible ? (
        <div
          className="absolute inset-0 z-[70] flex justify-center px-4 pb-4 pt-2"
          style={{ background: "var(--shell-background)" }}
        >
          <div className="w-full max-w-4xl">
            <SlickConversationStage
              open={shouldKeepConversationStageVisible}
              agentName={conversationAgentName}
              conversationMode={conversationModeSelection}
              eyesSource={conversationEyesSourceSelection}
              conversationState={conversationState}
              conversationReasonCode={conversationReasonCode}
              conversationStateLabel={conversationStateLabel}
              conversationTurnLabel={conversationTurnHudLabel}
              liveTranscriptUserText={conversationLiveUserText}
              liveTranscriptAssistantText={conversationLiveAssistantText}
              liveInterruptionMarker={liveInterruptionMarker}
              cameraSession={cameraLiveSession}
              hasCameraPreviewSignal={hasCameraPreviewSignal}
              cameraDiagnosticLabel={cameraDiagnosticLabel}
              isConversationEnding={isConversationEnding}
              isConversationMicMuted={isConversationMicMuted}
              isStartingConversation={isStartingConversation}
              controlDisabled={controlDisabled || isVoiceTranscribing}
              eyesWebcamAvailable={conversationCapabilitySnapshot.capabilities.webcam.available}
              metaGlassesAvailable={conversationCapabilitySnapshot.capabilities.metaGlasses.available}
              metaGlassesReasonCode={conversationCapabilitySnapshot.capabilities.metaGlasses.reasonCode}
              cameraVideoRef={cameraVideoRef}
              onClose={() => setIsConversationStageOpen(false)}
              onConversationModeChange={handleConversationModeChange}
              onEyesSourceChange={(source) => setConversationEyesSourceSelection(source)}
              onOrbPress={handleConversationOrbPress}
              onToggleMute={() => {
                void toggleConversationMute()
              }}
              onToggleEyes={handleConversationEyesToggle}
              onCameraPreviewSignalChange={setCameraPreviewSignal}
            />
          </div>
        </div>
      ) : null}
    </form>
  )
}
